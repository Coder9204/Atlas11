'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ============================================================================
// LC RESONANCE TUNING GAME
// Core Concept: LC circuits resonate at specific frequencies, selecting signals
// Real-World Application: How radios tune to specific stations
// ============================================================================

interface GameEvent {
  eventType: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface LCResonanceRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound effects
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number }> = {
      click: { freq: 600, duration: 0.1 },
      success: { freq: 800, duration: 0.2 },
      failure: { freq: 300, duration: 0.3 },
      transition: { freq: 500, duration: 0.15 },
      complete: { freq: 900, duration: 0.4 }
    };
    const sound = sounds[type];
    oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// ============================================================================
// REAL-WORLD APPLICATIONS
// ============================================================================
const realWorldApps = [
  {
    icon: '📻',
    title: 'Radio Tuning Circuits',
    short: 'Selecting your favorite station',
    tagline: 'The original wireless technology',
    description: 'Every AM/FM radio uses an LC resonant circuit to select one station from the electromagnetic spectrum. By adjusting capacitance, the resonant frequency changes, allowing only the desired station\'s frequency to pass while rejecting all others.',
    connection: 'The resonant frequency f = 1/(2pi*sqrt(LC)) determines which station you hear. Changing capacitance with the tuning dial shifts this frequency, exactly as we explored in the simulation.',
    howItWorks: 'A variable capacitor connected to a fixed inductor forms the tuning circuit. At resonance, the LC circuit has maximum impedance for parallel configurations or minimum for series. Only signals at the resonant frequency develop significant voltage.',
    stats: [
      { value: '88-108MHz', label: 'FM band', icon: '📻' },
      { value: '1700MHz max', label: 'AM band upper', icon: '📡' },
      { value: '10 billion', label: 'Radios worldwide', icon: '🌍' }
    ],
    examples: ['Car AM/FM receivers', 'Portable shortwave radios', 'Crystal radio sets', 'Software-defined radios'],
    companies: ['Sony', 'Bose', 'Sangean', 'Tecsun'],
    futureImpact: 'Digital radio and streaming dominate, but LC resonance principles remain fundamental in RF front-ends of all wireless devices including smartphones.',
    color: '#3B82F6'
  },
  {
    icon: '📡',
    title: 'Antenna Matching Networks',
    short: 'Maximizing power transfer',
    tagline: 'Every watt counts in wireless',
    description: 'Antennas must be matched to transmitters for efficient power transfer. LC networks transform antenna impedance to match the source, maximizing radiated power. Poor matching wastes energy as heat and reduces range.',
    connection: 'At resonance, an LC circuit can transform impedance levels. Matching networks use this principle to make antennas "look like" the optimal load impedance to the transmitter.',
    howItWorks: 'L-networks, pi-networks, and T-networks use combinations of inductors and capacitors to transform impedance. The component values are chosen so the network resonates at the operating frequency while providing the needed impedance transformation.',
    stats: [
      { value: '>90%', label: 'Match efficiency', icon: '⚡' },
      { value: '50 ohms', label: 'Standard impedance', icon: '🔌' },
      { value: '$12B', label: 'RF market', icon: '💰' }
    ],
    examples: ['Cell tower transmitters', 'WiFi access points', 'Ham radio tuners', 'Satellite uplinks'],
    companies: ['Qualcomm', 'Skyworks', 'Qorvo', 'Murata'],
    futureImpact: 'Active tunable matching networks using varactors and MEMS will enable antennas that automatically optimize for any frequency and loading condition.',
    color: '#8B5CF6'
  },
  {
    icon: '🔊',
    title: 'Audio Crossover Networks',
    short: 'Sending frequencies to the right speaker',
    tagline: 'Physics behind high-fidelity sound',
    description: 'Speaker systems use LC filters to divide audio frequencies between drivers. Tweeters receive high frequencies, woofers receive low frequencies, and midranges handle the middle. LC resonance determines the crossover points.',
    connection: 'LC filters use resonance to pass or block frequency ranges. Below resonance, an LC low-pass filter passes signals; above resonance, a high-pass filter passes signals. This frequency-selective behavior separates audio into bands.',
    howItWorks: 'Second-order crossovers use one inductor and one capacitor per filter section. The crossover frequency is set by f = 1/(2pi*sqrt(LC)). Higher-order designs use multiple LC sections for steeper rolloff between frequency bands.',
    stats: [
      { value: '80Hz-5kHz', label: 'Crossover range', icon: '🎵' },
      { value: '12dB/oct', label: 'Typical slope', icon: '📉' },
      { value: '$8.5B', label: 'Speaker market', icon: '💰' }
    ],
    examples: ['Home theater systems', 'PA speaker cabinets', 'Studio monitors', 'Car audio systems'],
    companies: ['JBL', 'Bowers & Wilkins', 'KEF', 'Focal'],
    futureImpact: 'Digital signal processing increasingly replaces passive crossovers, but understanding LC resonance remains essential for speaker design and audio engineering.',
    color: '#10B981'
  },
  {
    icon: '⚡',
    title: 'Wireless Power Transfer',
    short: 'Charging without cables',
    tagline: 'Resonance enables the cordless future',
    description: 'Wireless chargers use resonant LC coils to transfer power across air gaps. When transmitter and receiver coils resonate at the same frequency, energy transfer is maximized. This resonant coupling enables efficient charging of phones and electric vehicles.',
    connection: 'Resonant wireless power transfer relies on coupled LC circuits oscillating at the same frequency. At resonance, magnetic coupling between coils is enhanced, allowing efficient energy transfer even with imperfect alignment.',
    howItWorks: 'The transmitter coil and capacitor form an LC circuit driven at resonance. The receiver coil and capacitor are tuned to the same frequency. At resonance, current flows efficiently between coils through their shared magnetic field.',
    stats: [
      { value: '85-95%', label: 'Efficiency', icon: '⚡' },
      { value: '15W-11kW', label: 'Power range', icon: '🔋' },
      { value: '$15B', label: 'WPT market', icon: '💰' }
    ],
    examples: ['Qi phone chargers', 'Electric vehicle charging', 'Medical implant power', 'Industrial robot charging'],
    companies: ['WiTricity', 'Energous', 'Powermat', 'Qualcomm Halo'],
    futureImpact: 'Room-scale wireless power using resonant magnetic fields will eliminate charging pads, powering devices automatically as they move through spaces.',
    color: '#F59E0B'
  }
];

// ============================================================================
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ============================================================================
const testQuestions = [
  {
    scenario: "You're building a simple AM radio receiver and need to understand what makes it tune to specific stations instead of picking up all broadcasts at once.",
    question: "What is LC resonance and why is it essential for radio tuning?",
    options: [
      { id: 'a', label: "A phenomenon where inductors and capacitors amplify all frequencies equally" },
      { id: 'b', label: "A condition where an LC circuit responds maximally to one specific frequency determined by L and C values", correct: true },
      { id: 'c', label: "A type of interference that occurs when multiple radio stations broadcast simultaneously" },
      { id: 'd', label: "The resistance that develops in a circuit at high frequencies" }
    ],
    explanation: "LC resonance occurs when the inductive reactance equals the capacitive reactance at a specific frequency (f = 1/2pi*sqrt(LC)). At this resonant frequency, energy oscillates efficiently between the inductor's magnetic field and the capacitor's electric field, causing the circuit to respond strongly to that frequency while attenuating others."
  },
  {
    scenario: "An old car radio has a manual tuning dial that you rotate to find stations. Inside, this dial is connected to a variable capacitor that changes its capacitance as you turn it.",
    question: "When you turn the dial to tune from a lower frequency station (600 kHz) to a higher frequency station (1400 kHz), what happens to the variable capacitor?",
    options: [
      { id: 'a', label: "The capacitance increases, raising the resonant frequency" },
      { id: 'b', label: "The capacitance decreases, raising the resonant frequency", correct: true },
      { id: 'c', label: "The capacitance stays the same while the inductance changes" },
      { id: 'd', label: "The capacitor disconnects and a different circuit takes over" }
    ],
    explanation: "Since resonant frequency f = 1/(2pi*sqrt(LC)), decreasing capacitance (C) will increase the resonant frequency. In variable capacitors, rotating the dial moves the overlapping plate area, reducing capacitance. This is why turning the dial clockwise typically tunes to higher frequency stations."
  },
  {
    scenario: "An engineer needs to design an LC circuit that resonates at exactly 1 MHz. She has a 100 microhenry inductor available.",
    question: "Using the resonance formula f = 1/(2pi*sqrt(LC)), what capacitance value does she need?",
    options: [
      { id: 'a', label: "About 253 picofarads (pF)", correct: true },
      { id: 'b', label: "About 1 microfarad (uF)" },
      { id: 'c', label: "About 100 nanofarads (nF)" },
      { id: 'd', label: "About 1 picofarad (pF)" }
    ],
    explanation: "Rearranging f = 1/(2pi*sqrt(LC)) gives C = 1/(4pi^2 * f^2 * L). Plugging in f = 1 MHz and L = 100 uH: C = 1/(4 * 9.87 * 10^12 * 10^-4) = 253 pF. This calculation is fundamental for designing tuned circuits."
  },
  {
    scenario: "A radio receiver designer is comparing two LC circuits: one with Q factor of 20 and another with Q factor of 200. Both are tuned to the same frequency.",
    question: "How does the higher Q factor circuit differ in its ability to select radio stations?",
    options: [
      { id: 'a', label: "It has a wider bandwidth, allowing multiple stations to be heard simultaneously" },
      { id: 'b', label: "It has a narrower bandwidth, providing sharper selectivity to reject adjacent stations", correct: true },
      { id: 'c', label: "It produces louder audio output from the selected station" },
      { id: 'd', label: "It consumes less power but has identical selectivity" }
    ],
    explanation: "Q factor (Quality factor) determines the sharpness of the resonance peak. Bandwidth = f0/Q, so a higher Q means narrower bandwidth. The Q=200 circuit has a bandwidth 10 times narrower than the Q=20 circuit, making it better at rejecting adjacent channel stations."
  },
  {
    scenario: "You're observing an LC tank circuit with an oscilloscope. The circuit was given an initial charge and is now oscillating freely with no external power source.",
    question: "What is happening to the energy in this tank circuit during each oscillation cycle?",
    options: [
      { id: 'a', label: "Energy is being created and destroyed as current flows" },
      { id: 'b', label: "Energy alternates between electric field energy in the capacitor and magnetic field energy in the inductor", correct: true },
      { id: 'c', label: "Energy remains constant in the capacitor while the inductor provides amplification" },
      { id: 'd', label: "Energy is continuously absorbed by the inductor's core material" }
    ],
    explanation: "In an ideal LC tank circuit, total energy is conserved but constantly transforms between two forms: when the capacitor is fully charged, all energy is stored in its electric field (E = 1/2 CV^2). As it discharges through the inductor, energy transfers to the magnetic field (E = 1/2 LI^2)."
  },
  {
    scenario: "A digital watch keeps time using a tiny quartz crystal oscillator. The crystal is connected to a small integrated circuit that maintains oscillation at exactly 32.768 kHz.",
    question: "Why do precision timekeeping devices use quartz crystals instead of simple LC circuits?",
    options: [
      { id: 'a', label: "Crystals are cheaper to manufacture than inductors and capacitors" },
      { id: 'b', label: "Quartz crystals have extremely high Q factors (10,000-100,000+), providing exceptional frequency stability", correct: true },
      { id: 'c', label: "Crystals can generate their own power through piezoelectric effects" },
      { id: 'd', label: "LC circuits cannot oscillate at frequencies as low as 32.768 kHz" }
    ],
    explanation: "Quartz crystals act as electromechanical resonators with Q factors of 10,000 to over 100,000 - far exceeding typical LC circuits (Q ~ 50-500). This ultra-high Q means the crystal's resonant frequency is extremely stable and precise."
  },
  {
    scenario: "Engineers are designing a wireless charging pad for smartphones. The charging coil in the pad must transfer power efficiently to the receiving coil inside the phone.",
    question: "Why is resonant coupling used instead of simple transformer-style inductive coupling for wireless power transfer?",
    options: [
      { id: 'a', label: "Resonant coupling looks more impressive to consumers" },
      { id: 'b', label: "At resonance, energy transfer efficiency is dramatically improved, especially over larger air gaps", correct: true },
      { id: 'c', label: "Simple inductive coupling would damage the phone's battery" },
      { id: 'd', label: "Resonant coupling eliminates the need for any coils in the system" }
    ],
    explanation: "Resonant wireless power transfer uses matched LC circuits in both transmitter and receiver tuned to the same frequency. At resonance, magnetic coupling is dramatically enhanced, allowing efficient power transfer even with significant air gaps and misalignment."
  },
  {
    scenario: "A telecommunications engineer is designing a bandpass filter for a radio receiver's intermediate frequency (IF) stage. The filter must pass signals at 10.7 MHz while rejecting signals at 10.5 MHz and 10.9 MHz.",
    question: "What filter topology would best achieve this narrow bandpass characteristic using LC resonance?",
    options: [
      { id: 'a', label: "A single parallel LC circuit with moderate Q factor" },
      { id: 'b', label: "Multiple cascaded LC resonators with coupled resonances for steep rolloff", correct: true },
      { id: 'c', label: "A series combination of capacitors only" },
      { id: 'd', label: "A single high-value inductor with no capacitors" }
    ],
    explanation: "Professional IF filters use multiple coupled LC resonators (often ceramic or crystal filters with 2-8 poles) to achieve steep rolloff. A single LC circuit cannot provide the sharp response needed to reject adjacent channels just 200 kHz away."
  },
  {
    scenario: "A power electronics engineer notices that a DC-DC converter is producing unexpected high-frequency noise. Investigation reveals oscillations occurring at 50 MHz, far above the 100 kHz switching frequency.",
    question: "What is the most likely cause of this parasitic resonance problem?",
    options: [
      { id: 'a', label: "The switching frequency is set incorrectly" },
      { id: 'b', label: "Unintended LC circuits formed by PCB trace inductance and component parasitic capacitances", correct: true },
      { id: 'c', label: "The output capacitors are too large" },
      { id: 'd', label: "The input voltage is fluctuating" }
    ],
    explanation: "Parasitic resonance is common in power electronics. Every PCB trace has inductance (~1 nH/mm) and every component has parasitic capacitance. These unintended L and C elements form resonant circuits. At 50 MHz, even small parasitic values create resonance."
  },
  {
    scenario: "A ham radio operator is setting up a new antenna for the 20-meter band (14.0-14.35 MHz). The antenna feedpoint shows an impedance of 35 + j25 ohms, but the transmitter expects 50 ohms purely resistive.",
    question: "How can LC resonance principles be applied to match this antenna to the transmitter?",
    options: [
      { id: 'a', label: "Use a longer coaxial cable to absorb the mismatch" },
      { id: 'b', label: "Use an LC matching network (antenna tuner) to transform impedance and cancel the reactive component", correct: true },
      { id: 'c', label: "Increase transmitter power to overcome the mismatch" },
      { id: 'd', label: "The mismatch is acceptable and requires no correction" }
    ],
    explanation: "An LC matching network (antenna tuner) uses the resonance principle to transform impedances. The +j25 ohms indicates inductive reactance, which can be cancelled by adding appropriate capacitive reactance. The network resonates to cancel reactive components while transforming resistance."
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const LCResonanceRenderer: React.FC<LCResonanceRendererProps> = ({ onGameEvent, gamePhase }) => {
  // Phase management
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [isMobile, setIsMobile] = useState(false);

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [capacitance, setCapacitance] = useState(100); // pF (10-500)
  const [inductance, setInductance] = useState(250); // uH (50-500)
  const [showEnergyFlow, setShowEnergyFlow] = useState(true);

  // Radio stations (simulated AM band)
  const radioStations = useMemo(() => [
    { freq: 540, name: 'WXYZ News', genre: '📰' },
    { freq: 700, name: 'KABC Talk', genre: '🎙️' },
    { freq: 880, name: 'WCBS Sports', genre: '⚽' },
    { freq: 1010, name: 'WINS Music', genre: '🎵' },
    { freq: 1200, name: 'WOAI Country', genre: '🤠' },
    { freq: 1400, name: 'KFBK Classic', genre: '🎻' },
    { freq: 1600, name: 'KGBS Rock', genre: '🎸' },
  ], []);

  // Transfer state
  const [completedApps, setCompletedApps] = useState([false, false, false, false]);
  const [selectedApp, setSelectedApp] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testScore, setTestScore] = useState(0);
  const [testSubmitted, setTestSubmitted] = useState(false);

  const isNavigating = useRef(false);

  // Responsive check
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Responsive typography
  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px',
  };

  // Calculate resonant frequency: f = 1 / (2pi * sqrt(LC))
  const resonantFrequency = useMemo(() => {
    const L = inductance * 1e-6; // Convert uH to H
    const C = capacitance * 1e-12; // Convert pF to F
    const f = 1 / (2 * Math.PI * Math.sqrt(L * C));
    return Math.round(f / 1000); // Return in kHz
  }, [inductance, capacitance]);

  // Calculate Q factor (quality factor) - assumed moderate Q for demonstration
  const qFactor = 50;

  // Response at current input frequency (resonance curve)
  const responseAtFrequency = useMemo(() => {
    const inputFrequency = resonantFrequency;
    const f0 = resonantFrequency;
    const bandwidth = f0 / qFactor;
    const response = 1 / (1 + Math.pow((inputFrequency - f0) / (bandwidth / 2), 2));
    return Math.max(0, Math.min(100, response * 100));
  }, [resonantFrequency, qFactor]);

  // Find closest station to current tuning
  const closestStation = useMemo(() => {
    let closest = radioStations[0];
    let minDiff = Math.abs(resonantFrequency - radioStations[0].freq);

    radioStations.forEach(station => {
      const diff = Math.abs(resonantFrequency - station.freq);
      if (diff < minDiff) {
        minDiff = diff;
        closest = station;
      }
    });

    // Only return if we're close enough (within ~30 kHz)
    return minDiff < 30 ? closest : null;
  }, [resonantFrequency, radioStations]);

  // Signal quality based on tuning accuracy
  const signalQuality = useMemo(() => {
    if (!closestStation) return 0;
    const diff = Math.abs(resonantFrequency - closestStation.freq);
    return Math.max(0, 100 - diff * 3);
  }, [resonantFrequency, closestStation]);

  // Colors
  const colors = {
    bgDeep: '#030712',
    bgSurface: '#0f172a',
    bgElevated: '#1e293b',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#64748b',
    primary: '#06b6d4',
    primaryDark: '#0891b2',
    accent: '#f59e0b',
    warning: '#f59e0b',
    success: '#22c55e',
    error: '#ef4444',
    capacitor: '#3b82f6',
    inductor: '#f97316',
    resonance: '#22c55e',
    energy: '#a855f7',
  };

  // Emit game events
  const emitGameEvent = useCallback((eventType: string, details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      eventType,
      gameType: 'lc_resonance',
      gameTitle: 'LC Resonance Tuning',
      details: { phase, capacitance, inductance, resonantFrequency, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase, capacitance, inductance, resonantFrequency]);

  // Navigation
  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    emitGameEvent('phase_changed', { newPhase: p });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [emitGameEvent]);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) goToPhase(phaseOrder[idx + 1]);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) goToPhase(phaseOrder[idx - 1]);
  }, [phase, goToPhase]);

  // Phase labels for navigation
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Experiment',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  // ============================================================================
  // REUSABLE COMPONENTS
  // ============================================================================

  const Button: React.FC<{
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
    disabled?: boolean;
    children: React.ReactNode;
    style?: React.CSSProperties;
  }> = ({ onClick, variant = 'primary', disabled, children, style }) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
          playSound('click');
          onClick();
        }
      }}
      disabled={disabled}
      style={{
        padding: isMobile ? '14px 20px' : '16px 28px',
        minHeight: '44px',
        minWidth: '44px',
        background: variant === 'primary'
          ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`
          : variant === 'secondary' ? colors.bgElevated : 'transparent',
        color: '#e2e8f0',
        border: variant === 'ghost' ? `1px solid ${colors.bgElevated}` : 'none',
        borderRadius: '12px',
        fontSize: isMobile ? '14px' : '16px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s',
        touchAction: 'manipulation',
        ...style
      }}
    >
      {children}
    </button>
  );

  const renderSliderControl = (
    label: string,
    value: number,
    min: number,
    max: number,
    unit: string,
    hint: string,
    onChange: (v: number) => void,
    color: string = colors.primary
  ) => {
    const sliderId = `slider-${label.replace(/\s+/g, '-').toLowerCase()}`;
    // Color-coded feedback: blue=low, green=mid, orange=high
    const pct = (value - min) / (max - min);
    const displayColor = pct < 0.33 ? '#3b82f6' : pct < 0.66 ? '#22c55e' : '#f97316';

    return (
      <div style={{
        padding: isMobile ? '14px' : '18px',
        backgroundColor: colors.bgSurface,
        borderRadius: '12px',
        border: `1px solid ${displayColor}`,
        transition: 'border-color 0.2s'
      }}>
        <label
          htmlFor={sliderId}
          style={{
            display: 'block',
            fontSize: isMobile ? '12px' : '14px',
            fontWeight: 600,
            color: '#e2e8f0',
            marginBottom: '8px',
            textTransform: 'uppercase'
          }}
        >
          {label}
        </label>

        <div
          data-testid={`${sliderId}-value`}
          aria-live="polite"
          style={{
            fontSize: isMobile ? '28px' : '36px',
            fontWeight: 700,
            color: displayColor,
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'baseline',
            gap: '4px'
          }}
        >
          <span>{label}: {value}</span>
          <span style={{ fontSize: isMobile ? '16px' : '20px', color: '#e2e8f0', fontWeight: 400 }}>{unit}</span>
        </div>

        <div style={{ height: '20px', display: 'flex', alignItems: 'center' }}>
          <input
            id={sliderId}
            type="range"
            min={min}
            max={max}
            step={1}
            value={value}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-label={`${label}: ${value}${unit}`}
            onChange={(e) => onChange(parseInt(e.target.value))}
            style={{
              width: '100%',
              height: '20px',
              cursor: 'pointer',
              accentColor: '#3b82f6',
              touchAction: 'pan-y',
              WebkitAppearance: 'none' as const,
            }}
          />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#94a3b8',
          marginTop: '6px',
          fontWeight: 400
        }}>
          <span>{min}{unit}</span>
          <span style={{ fontWeight: 600, color: displayColor }}>{value}{unit}</span>
          <span>{max}{unit}</span>
        </div>

        <div style={{
          fontSize: isMobile ? '12px' : '13px',
          color: '#e2e8f0',
          marginTop: '10px',
          padding: '10px 12px',
          backgroundColor: `${displayColor}15`,
          borderRadius: '8px',
          borderLeft: `3px solid ${displayColor}`,
          fontWeight: 400
        }}>
          {hint}
        </div>
      </div>
    );
  };

  const ExplanationBox: React.FC<{
    whatHappens: string;
    whyItHappens: string;
    realWorldExample: string;
  }> = ({ whatHappens, whyItHappens, realWorldExample }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '14px' }}>
      <div style={{
        padding: '14px 16px',
        backgroundColor: `${colors.primary}15`,
        borderLeft: `4px solid ${colors.primary}`,
        borderRadius: '0 8px 8px 0'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: colors.primary, textTransform: 'uppercase', marginBottom: '6px' }}>
          What Happens
        </div>
        <div style={{ fontSize: isMobile ? '13px' : '14px', color: colors.textPrimary, lineHeight: 1.5 }}>
          {whatHappens}
        </div>
      </div>
      <div style={{
        padding: '14px 16px',
        backgroundColor: `${colors.energy}15`,
        borderLeft: `4px solid ${colors.energy}`,
        borderRadius: '0 8px 8px 0'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: colors.energy, textTransform: 'uppercase', marginBottom: '6px' }}>
          Why It Happens (Energy Oscillation)
        </div>
        <div style={{ fontSize: isMobile ? '13px' : '14px', color: colors.textPrimary, lineHeight: 1.5 }}>
          {whyItHappens}
        </div>
      </div>
      <div style={{
        padding: '14px 16px',
        backgroundColor: `${colors.success}15`,
        borderLeft: `4px solid ${colors.success}`,
        borderRadius: '0 8px 8px 0'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: colors.success, textTransform: 'uppercase', marginBottom: '6px' }}>
          Real-World Example
        </div>
        <div style={{ fontSize: isMobile ? '13px' : '14px', color: colors.textPrimary, lineHeight: 1.5 }}>
          {realWorldExample}
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // LC CIRCUIT VISUALIZATION
  // ============================================================================

  const LCVisualization: React.FC<{
    showLabels?: boolean;
    showResonanceCurve?: boolean;
    showEnergyAnimation?: boolean;
  }> = ({ showLabels = true, showResonanceCurve = true, showEnergyAnimation = true }) => {
    const svgWidth = isMobile ? 340 : 500;
    const svgHeight = isMobile ? 380 : 450;
    const centerX = svgWidth / 2;

    // Animation state
    const [animPhase, setAnimPhase] = useState(0);
    useEffect(() => {
      const interval = setInterval(() => {
        setAnimPhase(prev => (prev + 0.1) % (Math.PI * 2));
      }, 30);
      return () => clearInterval(interval);
    }, []);

    // Energy distribution (oscillates between C and L at resonance)
    const capacitorEnergy = Math.cos(animPhase * (resonantFrequency / 500)) ** 2;
    const inductorEnergy = Math.sin(animPhase * (resonantFrequency / 500)) ** 2;

    // Resonance curve points (absolute coordinates, no group transform)
    const resonanceCurvePoints = useMemo(() => {
      const points: string[] = [];
      const curveWidth = 200;
      const curveHeight = 70;
      const startX = centerX - curveWidth / 2;
      const baseY = 390; // absolute Y for X axis

      for (let i = 0; i <= 100; i++) {
        const freq = 500 + (i / 100) * 1200; // 500-1700 kHz
        const f0 = resonantFrequency;
        const bandwidth = f0 / qFactor;
        const response = 1 / (1 + Math.pow((freq - f0) / (bandwidth / 2), 2));
        const x = startX + (i / 100) * curveWidth;
        const y = baseY - response * curveHeight;
        points.push(`${x},${y}`);
      }
      return points.join(' ');
    }, [resonantFrequency, centerX]);

    return (
      <div style={{ position: 'relative', width: '100%', maxWidth: svgWidth, margin: '0 auto' }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ display: 'block' }}
        >
          {/* Definitions */}
          <defs>
            <linearGradient id="lcrCapacitorPlate" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            <linearGradient id="lcrInductorCoil" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            <linearGradient id="lcrWire" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>

            <linearGradient id="lcrBackground" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            <filter id="lcrGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <pattern id="lcrGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>

          {/* Background */}
          <rect width={svgWidth} height={svgHeight} fill="url(#lcrBackground)" rx="12" />
          <rect width={svgWidth} height={svgHeight} fill="url(#lcrGrid)" rx="12" />

          {/* LC Circuit Schematic */}
          <g transform="translate(0, 20)">
            {/* Circuit outline */}
            <rect
              x={centerX - 120}
              y={60}
              width={240}
              height={180}
              rx="8"
              fill="none"
              stroke="url(#lcrWire)"
              strokeWidth="4"
            />

            {/* Capacitor (C) */}
            <g>
              {/* Top plate */}
              <rect x={centerX - 100} y={88} width={60} height={12} rx="2" fill="url(#lcrCapacitorPlate)" />
              {/* Bottom plate */}
              <rect x={centerX - 100} y={113} width={60} height={12} rx="2" fill="url(#lcrCapacitorPlate)" />

              {/* Electric field when charged */}
              {showEnergyAnimation && capacitorEnergy > 0.1 && (
                <g opacity={capacitorEnergy} filter="url(#lcrGlow)">
                  {[0, 1, 2, 3, 4].map(i => (
                    <line
                      key={i}
                      x1={centerX - 92 + i * 12}
                      y1={101}
                      x2={centerX - 92 + i * 12}
                      y2={112}
                      stroke="#60a5fa"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  ))}
                </g>
              )}
            </g>

            {/* Inductor (L) - Copper Coil */}
            <g>
              {[0, 1, 2, 3].map(i => (
                <ellipse
                  key={i}
                  cx={centerX + 48 + i * 18}
                  cy={106}
                  rx={9}
                  ry={18}
                  fill="none"
                  stroke="url(#lcrInductorCoil)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              ))}

              {/* Magnetic field when current flows */}
              {showEnergyAnimation && inductorEnergy > 0.1 && (
                <g opacity={inductorEnergy} filter="url(#lcrGlow)">
                  {[0, 1, 2].map(i => (
                    <ellipse
                      key={i}
                      cx={centerX + 75}
                      cy={106}
                      rx={30 + i * 12}
                      ry={35 + i * 10}
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="2"
                      opacity={0.7 - i * 0.2}
                    />
                  ))}
                </g>
              )}
            </g>

            {/* Connecting wires */}
            <g stroke="url(#lcrWire)" strokeWidth="4" fill="none" strokeLinecap="round">
              <path d={`M ${centerX - 120} 60 L ${centerX - 120} 94 L ${centerX - 100} 94`} />
              <path d={`M ${centerX - 40} 94 L ${centerX + 38} 94`} />
              <path d={`M ${centerX + 112} 94 L ${centerX + 120} 94 L ${centerX + 120} 60`} />
              <path d={`M ${centerX - 120} 240 L ${centerX - 120} 119 L ${centerX - 100} 119`} />
              <path d={`M ${centerX - 40} 119 L ${centerX + 38} 119`} />
              <path d={`M ${centerX + 112} 119 L ${centerX + 120} 119 L ${centerX + 120} 240`} />
            </g>

            {/* Energy indicators - using absolute coordinates to avoid overlap */}
            {showEnergyAnimation && (
              <>
                {/* Capacitor energy bar - absolute positions */}
                <rect x={centerX - 135} y={175} width={70} height={58} rx="8" fill="rgba(15,23,42,0.95)" stroke="#3b82f6" strokeWidth="1" />
                <text x={centerX - 100} y={193} textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="600">E (electric)</text>
                <rect x={centerX - 125} y={203} width={50} height={10} rx="3" fill="#1e293b" />
                <rect x={centerX - 125} y={203} width={50 * capacitorEnergy} height={10} rx="3" fill="#3b82f6" />
                <text x={centerX - 100} y={228} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="400">Cap: {Math.round(capacitorEnergy * 100)}%</text>

                {/* Inductor energy bar - absolute positions, different y to avoid overlap */}
                <rect x={centerX + 65} y={175} width={70} height={58} rx="8" fill="rgba(15,23,42,0.95)" stroke="#f97316" strokeWidth="1" />
                <text x={centerX + 100} y={193} textAnchor="middle" fill="#f97316" fontSize="11" fontWeight="600">E (magnetic)</text>
                <rect x={centerX + 75} y={203} width={50} height={10} rx="3" fill="#1e293b" />
                <rect x={centerX + 75} y={203} width={50 * inductorEnergy} height={10} rx="3" fill="#f97316" />
                <text x={centerX + 100} y={228} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="400">Ind: {Math.round(inductorEnergy * 100)}%</text>
              </>
            )}
          </g>

          {/* Resonance Curve */}
          {showResonanceCurve && (
            <>
              {/* Resonance curve section - absolute positions (no group transform) */}
              <rect x={centerX - 115} y={295} width={230} height={130} rx="10" fill="rgba(15,23,42,0.97)" stroke="#334155" strokeWidth="1" />
              <text x={centerX} y={313} textAnchor="middle" fill="#cbd5e1" fontSize="11" fontWeight="600">RESONANCE CURVE</text>
              {/* Y axis label - rotated */}
              <text x={centerX - 105} y={360} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="500" transform={`rotate(-90, ${centerX - 105}, 360)`}>Response</text>
              {/* X axis line */}
              <line x1={centerX - 100} y1={395} x2={centerX + 100} y2={395} stroke="#475569" strokeWidth="1" />
              {/* Y axis line */}
              <line x1={centerX - 100} y1={320} x2={centerX - 100} y2={395} stroke="#475569" strokeWidth="1" />
              <polyline points={resonanceCurvePoints} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" filter="url(#lcrGlow)" />
              <circle cx={centerX - 100 + ((resonantFrequency - 500) / 1200) * 200} cy={320} r="6" fill="#22c55e" filter="url(#lcrGlow)" />
              {/* X axis tick labels */}
              <text x={centerX - 95} y={410} fill="#94a3b8" fontSize="11">500</text>
              <text x={centerX + 20} y={410} textAnchor="middle" fill="#94a3b8" fontSize="11">1100</text>
              <text x={centerX + 88} y={410} textAnchor="end" fill="#94a3b8" fontSize="11">1700</text>
              {/* X axis label */}
              <text x={centerX} y={425} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="500">Frequency (kHz)</text>
            </>
          )}

          {/* Labels - all using absolute coordinates */}
          {showLabels && (
            <>
              {/* Resonance frequency box */}
              <rect x={10} y={10} width={110} height={72} rx="8" fill="rgba(15,23,42,0.97)" stroke="#22c55e" strokeWidth="1.5" />
              <text x={65} y={28} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">RESONANCE</text>
              <text x={65} y={54} textAnchor="middle" fill="#22c55e" fontSize="22" fontWeight="700">{resonantFrequency}</text>
              <text x={65} y={72} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="400">kHz</text>

              {/* Q Factor box */}
              <rect x={svgWidth - 85} y={10} width={75} height={72} rx="8" fill="rgba(15,23,42,0.97)" stroke="#a855f7" strokeWidth="1" />
              <text x={svgWidth - 47} y={28} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">Q FACTOR</text>
              <text x={svgWidth - 47} y={54} textAnchor="middle" fill="#a855f7" fontSize="20" fontWeight="700">{qFactor}</text>
              <text x={svgWidth - 47} y={72} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="400">selectivity</text>

              {/* Component label C */}
              <text x={centerX - 70} y={255} textAnchor="middle" fill="#3b82f6" fontSize="14" fontWeight="700">C={capacitance}pF</text>
              {/* Component label L */}
              <text x={centerX + 75} y={255} textAnchor="middle" fill="#f97316" fontSize="14" fontWeight="700">L={inductance}uH</text>

              {/* Station tuned */}
              {closestStation && signalQuality > 30 && (
                <>
                  <rect x={centerX - 80} y={svgHeight - 100} width={160} height={42} rx="8" fill="rgba(34,197,94,0.2)" stroke="#22c55e" strokeWidth="1.5" />
                  <text x={centerX} y={svgHeight - 82} textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="700">Tuned: {closestStation.name}</text>
                  <text x={centerX} y={svgHeight - 66} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="400">Signal strength: {Math.round(signalQuality)}%</text>
                </>
              )}

              {/* Formula */}
              <rect x={10} y={svgHeight - 48} width={120} height={38} rx="8" fill="rgba(168,85,247,0.2)" stroke="#a855f7" strokeWidth="1" />
              <text x={70} y={svgHeight - 24} textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="600">f = 1/(2pi*sqrt(LC))</text>
            </>
          )}
        </svg>
      </div>
    );
  };

  // ============================================================================
  // PROGRESS BAR AND NAV DOTS
  // ============================================================================

  const renderProgressBar = () => (
    <div style={{
      height: '4px',
      backgroundColor: colors.bgElevated,
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        backgroundColor: colors.resonance,
        transition: 'width 0.3s ease'
      }} />
    </div>
  );

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
            background: phaseOrder.indexOf(phase) >= i ? colors.resonance : colors.bgElevated,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  const renderHook = () => (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isMobile ? '20px' : '40px',
      textAlign: 'center'
    }}>
      <div style={{
        padding: '8px 20px',
        background: `${colors.resonance}20`,
        border: `1px solid ${colors.resonance}40`,
        borderRadius: '100px',
        marginBottom: '24px'
      }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: colors.resonance, textTransform: 'uppercase' }}>
          Frequency Selection
        </span>
      </div>

      <h1 style={{
        fontSize: isMobile ? '28px' : '40px',
        fontWeight: 700,
        color: colors.textPrimary,
        marginBottom: '20px',
        lineHeight: 1.2
      }}>
        Can a Circuit "Prefer"<br />One Frequency?
      </h1>

      <p style={{
        fontSize: isMobile ? '16px' : '18px',
        fontWeight: 400,
        color: colors.textSecondary,
        maxWidth: '500px',
        marginBottom: '24px',
        lineHeight: 1.6
      }}>
        Radio waves from hundreds of stations fill the air right now. Your radio
        <strong style={{ color: colors.resonance, fontWeight: 700 }}> picks out just one</strong>.
        How does a simple circuit choose a single frequency like a musical note?
      </p>

      <div style={{
        width: '100%',
        maxWidth: '400px',
        height: isMobile ? '260px' : '320px',
        marginBottom: '32px',
        backgroundColor: colors.bgSurface,
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        <LCVisualization showLabels={false} showResonanceCurve={false} />
      </div>

      <Button onClick={goNext}>
        Start Exploring
      </Button>

      {renderNavDots()}
    </div>
  );

  const renderPredict = () => (
    <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Progress indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px'
        }}>
          <span style={{ fontSize: '11px', color: colors.primary, fontWeight: 600, textTransform: 'uppercase' }}>
            Step 2 of 10 - Make a Prediction
          </span>
          <span style={{ fontSize: '11px', color: '#e2e8f0' }}>
            (Prediction 1 of 1)
          </span>
        </div>

        <h2 style={{
          fontSize: isMobile ? '22px' : '28px',
          color: '#e2e8f0',
          margin: '12px 0 20px'
        }}>
          A coil and capacitor are connected together. What happens when we send different frequency signals through them?
        </h2>

        {/* Static LC Circuit SVG Preview */}
        <div style={{
          backgroundColor: colors.bgSurface,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <svg
            width="100%"
            height="150"
            viewBox="0 0 400 150"
            style={{ display: 'block' }}
          >
            <defs>
              <linearGradient id="predictCapGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="predictCoilGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
            <rect width="400" height="150" fill="#0f172a" rx="8" />
            {/* Circuit frame */}
            <rect x="80" y="30" width="240" height="90" rx="4" fill="none" stroke="#64748b" strokeWidth="3" />
            {/* Capacitor */}
            <rect x="110" y="50" width="40" height="8" rx="2" fill="url(#predictCapGrad)" />
            <rect x="110" y="67" width="40" height="8" rx="2" fill="url(#predictCapGrad)" />
            <text x="130" y="95" textAnchor="middle" fill="#3b82f6" fontSize="12" fontWeight="600">C</text>
            {/* Inductor coils */}
            {[0, 1, 2, 3].map(i => (
              <ellipse key={i} cx={230 + i * 15} cy="62" rx="7" ry="14" fill="none" stroke="url(#predictCoilGrad)" strokeWidth="4" />
            ))}
            <text x="260" y="95" textAnchor="middle" fill="#f97316" fontSize="12" fontWeight="600">L</text>
            {/* Label */}
            <text x="200" y="135" textAnchor="middle" fill="#e2e8f0" fontSize="11">LC Circuit (Static Preview)</text>
          </svg>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: colors.bgSurface,
          borderRadius: '12px',
          marginBottom: '24px'
        }}>
          <p style={{ color: '#e2e8f0', margin: 0, lineHeight: 1.6 }}>
            An inductor (coil) and capacitor are connected in parallel. We sweep through different signal frequencies and measure the circuit's response.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {[
            { id: 'all_same', icon: '➡️', label: 'All frequencies pass equally', desc: 'The circuit treats all signals the same' },
            { id: 'one_peak', icon: '📊', label: 'One frequency gets a PEAK response', desc: 'The circuit "prefers" a specific frequency' },
            { id: 'blocks_all', icon: '🚫', label: 'It blocks all frequencies', desc: 'Coils and capacitors oppose current' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => { setPrediction(opt.id); playSound('click'); }}
              style={{
                padding: '16px',
                minHeight: '44px',
                background: prediction === opt.id ? `${colors.primary}20` : colors.bgSurface,
                border: prediction === opt.id ? `2px solid ${colors.primary}` : `1px solid ${colors.bgElevated}`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '28px' }}>{opt.icon}</span>
              <div>
                <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{opt.label}</div>
                <div style={{ color: '#e2e8f0', fontSize: '13px' }}>{opt.desc}</div>
              </div>
              {prediction === opt.id && (
                <span style={{ marginLeft: 'auto', color: colors.primary }}>✓</span>
              )}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
          <Button variant="ghost" onClick={goBack}>Back</Button>
          <Button onClick={goNext} disabled={!prediction}>Test It</Button>
        </div>

        {renderNavDots()}
      </div>
    </div>
  );

  const renderPlay = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: isMobile ? '12px 16px' : '16px 24px',
        borderBottom: `1px solid ${colors.bgElevated}`,
        background: colors.bgSurface
      }}>
        <span style={{ fontSize: '11px', color: colors.primary, fontWeight: 600 }}>
          Step 3 of 10 - Interactive Experiment
        </span>
        <h2 style={{ fontSize: isMobile ? '18px' : '22px', color: '#e2e8f0', margin: '4px 0' }}>
          LC RESONANCE TUNER
        </h2>
        <p style={{ fontSize: '13px', color: '#e2e8f0', margin: 0 }}>
          Adjust L and C to tune to different radio stations
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px' : '20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Observation guidance with cause-effect */}
          <div style={{
            padding: '12px 16px',
            backgroundColor: `${colors.primary}15`,
            borderRadius: '10px',
            marginBottom: '16px',
            border: `1px solid ${colors.primary}40`
          }}>
            <p style={{ fontSize: '14px', color: '#e2e8f0', margin: 0, fontWeight: 600 }}>
              Cause &amp; Effect: When you increase capacitance C, the resonant frequency decreases (f = 1/2pi*sqrt(LC)). When you decrease C, frequency increases. The same applies to inductance L.
            </p>
          </div>

          {/* Real-world relevance */}
          <div style={{
            padding: '10px 14px',
            backgroundColor: `${colors.success}12`,
            borderRadius: '8px',
            marginBottom: '16px',
            border: `1px solid ${colors.success}30`
          }}>
            <p style={{ fontSize: '13px', color: '#e2e8f0', margin: 0 }}>
              <strong style={{ color: colors.success, fontWeight: 700 }}>Why this matters:</strong>{' '}
              Every AM/FM radio, cell phone, WiFi router, and wireless charger relies on LC resonance to select specific frequencies. This is the fundamental principle behind all wireless communication technology, enabling billions of devices to share the electromagnetic spectrum without interfering with each other.
            </p>
          </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {/* Visualization */}
              <div style={{
                backgroundColor: colors.bgSurface,
                borderRadius: '12px',
                padding: '8px',
                marginBottom: '16px'
              }}>
                <LCVisualization />
              </div>

              {/* Radio stations display */}
              <div style={{
                padding: '12px',
                backgroundColor: colors.bgSurface,
                borderRadius: '12px',
              }}>
                <div style={{ fontSize: '11px', color: '#e2e8f0', marginBottom: '8px', fontWeight: 600 }}>
                  AM RADIO BAND - Tune to a station:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {radioStations.map(station => {
                    const isNear = Math.abs(resonantFrequency - station.freq) < 40;
                    const isTuned = Math.abs(resonantFrequency - station.freq) < 15;
                    return (
                      <div
                        key={station.freq}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: isTuned ? `${colors.success}20` : isNear ? `${colors.warning}15` : colors.bgElevated,
                          borderRadius: '8px',
                          border: `1px solid ${isTuned ? colors.success : isNear ? colors.warning : 'transparent'}`,
                          textAlign: 'center',
                          minWidth: '80px'
                        }}
                      >
                        <div style={{ fontSize: '16px' }}>{station.genre}</div>
                        <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 600 }}>{station.freq}</div>
                        <div style={{ fontSize: '9px', color: '#e2e8f0' }}>{station.name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Controls */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {renderSliderControl("Capacitance (C)", capacitance, 10, 500, "pF", "Larger C = lower freq", setCapacitance, colors.capacitor)}
                {renderSliderControl("Inductance (L)", inductance, 50, 500, "uH", "Larger L = lower freq", setInductance, colors.inductor)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid ${colors.bgElevated}`,
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <Button variant="ghost" onClick={goBack}>Back</Button>
        <Button onClick={goNext}>See Why</Button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <span style={{ fontSize: '11px', color: colors.primary, fontWeight: 600 }}>
          Step 4 of 10 - Understanding
        </span>
        <h2 style={{
          fontSize: isMobile ? '22px' : '28px',
          color: colors.textPrimary,
          margin: '12px 0 24px'
        }}>
          Resonance: Energy Sloshing Back and Forth
        </h2>

        <ExplanationBox
          whatHappens="At one specific frequency, the circuit gives a peak response. This resonant frequency depends on the values of L and C: f0 = 1/(2pi*sqrt(LC)). At resonance, the circuit amplifies that frequency while rejecting others."
          whyItHappens="Energy oscillates between two forms: electric field energy stored in the capacitor, and magnetic field energy stored in the inductor. Like a swing at its natural frequency, the energy transfer is most efficient at resonance. At other frequencies, the timing is wrong and energy cancels out."
          realWorldExample="Every AM/FM radio uses an LC circuit to tune stations. The old-style tuning dial physically adjusts a variable capacitor, changing the resonant frequency. Digital radios use electronic varactors (voltage-controlled capacitors) to tune instantly."
        />

        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: `${colors.warning}15`,
          borderRadius: '12px',
          border: `1px solid ${colors.warning}40`
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: colors.warning, marginBottom: '8px' }}>
            Safety Note
          </div>
          <div style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.5 }}>
            Keep voltages tiny when experimenting with LC circuits. At resonance, voltages can be amplified by the Q factor! Never connect to mains power.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '24px' }}>
          <Button variant="ghost" onClick={goBack}>Back</Button>
          <Button onClick={goNext}>Try the Twist</Button>
        </div>

        {renderNavDots()}
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <span style={{ fontSize: '11px', color: colors.accent, fontWeight: 600, textTransform: 'uppercase' }}>
          Step 5 of 10 - Twist Prediction
        </span>

        <h2 style={{
          fontSize: isMobile ? '22px' : '28px',
          color: colors.textPrimary,
          margin: '12px 0 20px'
        }}>
          What happens if we DOUBLE the capacitance?
        </h2>

        <p style={{ color: colors.textSecondary, marginBottom: '16px', lineHeight: 1.6 }}>
          Currently tuned to {resonantFrequency} kHz. If we replace the capacitor with one twice as large, what happens to the resonant frequency?
        </p>

        {/* Static SVG diagram showing capacitor doubling concept */}
        <div style={{ backgroundColor: colors.bgSurface, borderRadius: '12px', padding: '12px', marginBottom: '20px' }}>
          <svg width="100%" height="130" viewBox="0 0 400 130" style={{ display: 'block' }}>
            <rect width="400" height="130" fill="#0f172a" rx="8" />
            {/* Original C */}
            <g>
              <rect x="40" y="30" width="30" height="8" rx="2" fill="#3b82f6" />
              <rect x="40" y="45" width="30" height="8" rx="2" fill="#3b82f6" />
              <text x="55" y="72" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="700">C</text>
              <text x="55" y="88" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="400">Original</text>
              <text x="55" y="102" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="400">{capacitance} pF</text>
            </g>
            {/* Arrow */}
            <text x="130" y="55" textAnchor="middle" fill="#f59e0b" fontSize="18" fontWeight="700">→</text>
            <text x="130" y="72" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="600">×2</text>
            {/* Doubled C */}
            <g>
              <rect x="178" y="25" width="30" height="8" rx="2" fill="#60a5fa" />
              <rect x="178" y="37" width="30" height="8" rx="2" fill="#60a5fa" />
              <rect x="178" y="49" width="30" height="8" rx="2" fill="#3b82f6" />
              <rect x="178" y="61" width="30" height="8" rx="2" fill="#3b82f6" />
              <text x="193" y="82" textAnchor="middle" fill="#60a5fa" fontSize="11" fontWeight="700">2C</text>
              <text x="193" y="98" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="400">Doubled</text>
              <text x="193" y="112" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="400">{capacitance * 2} pF</text>
            </g>
            {/* Frequency question */}
            <text x="300" y="45" textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="700">f = ?</text>
            <text x="300" y="62" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="400">Does f double?</text>
            <text x="300" y="78" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="400">Halve? Other?</text>
            <text x="300" y="100" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="600">f = 1/(2pi*sqrt(LC))</text>
          </svg>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {[
            { id: 'double', icon: '📈', label: 'Frequency DOUBLES', desc: 'More capacitance = faster oscillation' },
            { id: 'half', icon: '📉', label: 'Frequency drops to about 70%', desc: 'Larger C means lower frequency' },
            { id: 'same', icon: '➡️', label: 'Frequency stays the same', desc: 'Only L affects frequency' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => { setTwistPrediction(opt.id); playSound('click'); }}
              style={{
                padding: '16px',
                background: twistPrediction === opt.id ? `${colors.accent}20` : colors.bgSurface,
                border: twistPrediction === opt.id ? `2px solid ${colors.accent}` : `1px solid ${colors.bgElevated}`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '28px' }}>{opt.icon}</span>
              <div>
                <div style={{ color: colors.textPrimary, fontWeight: 600 }}>{opt.label}</div>
                <div style={{ color: colors.textMuted, fontSize: '13px' }}>{opt.desc}</div>
              </div>
              {twistPrediction === opt.id && (
                <span style={{ marginLeft: 'auto', color: colors.accent }}>✓</span>
              )}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
          <Button variant="ghost" onClick={goBack}>Back</Button>
          <Button onClick={goNext} disabled={!twistPrediction}>Test It</Button>
        </div>

        {renderNavDots()}
      </div>
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: isMobile ? '12px 16px' : '16px 24px',
        borderBottom: `1px solid ${colors.bgElevated}`,
        background: `linear-gradient(135deg, ${colors.accent}20 0%, ${colors.bgSurface} 100%)`
      }}>
        <span style={{ fontSize: '11px', color: colors.accent, fontWeight: 600 }}>
          Step 6 of 10 - Twist Experiment
        </span>
        <h2 style={{ fontSize: isMobile ? '18px' : '22px', color: '#e2e8f0', margin: '4px 0' }}>
          FREQUENCY vs L and C
        </h2>
        <p style={{ fontSize: '13px', color: '#e2e8f0', margin: 0 }}>
          Watch how changing L or C shifts the resonant frequency
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px' : '20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Observation guidance */}
          <div style={{
            padding: '12px 16px',
            backgroundColor: `${colors.accent}15`,
            borderRadius: '10px',
            marginBottom: '16px',
            border: `1px solid ${colors.accent}40`
          }}>
            <p style={{ fontSize: '14px', color: '#e2e8f0', margin: 0, fontWeight: 500 }}>
              Observe: Try doubling the capacitance - does the frequency halve? Notice the square root relationship: frequency changes by sqrt(2) when you double C or L.
            </p>
          </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                backgroundColor: colors.bgSurface,
                borderRadius: '12px',
                padding: '8px',
                marginBottom: '16px'
              }}>
                <LCVisualization />
              </div>

              {/* Big frequency display */}
              <div style={{
                padding: '20px',
                backgroundColor: colors.bgSurface,
                borderRadius: '12px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '12px', color: '#e2e8f0', marginBottom: '8px' }}>
                  RESONANT FREQUENCY
                </div>
                <div style={{ fontSize: '48px', fontWeight: 700, color: colors.resonance }}>
                  {resonantFrequency} kHz
                </div>
                <div style={{ fontSize: '14px', color: '#e2e8f0', marginTop: '8px' }}>
                  f0 = 1 / (2pi x sqrt({inductance}uH x {capacitance}pF))
                </div>
              </div>
            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {renderSliderControl("Capacitance (C)", capacitance, 10, 500, "pF", "Try doubling it!", setCapacitance, colors.capacitor)}
                {renderSliderControl("Inductance (L)", inductance, 50, 500, "uH", "Larger L lowers freq.", setInductance, colors.inductor)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid ${colors.bgElevated}`,
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <Button variant="ghost" onClick={goBack}>Back</Button>
        <Button onClick={goNext}>Continue</Button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <span style={{ fontSize: '11px', color: colors.accent, fontWeight: 600 }}>
          Step 7 of 10 - Twist Understanding
        </span>

        <h2 style={{
          fontSize: isMobile ? '22px' : '28px',
          color: colors.textPrimary,
          margin: '12px 0 24px'
        }}>
          The Square Root Relationship
        </h2>

        <ExplanationBox
          whatHappens="Doubling C doesn't halve the frequency - it only reduces it to about 71% (1/sqrt(2)). The formula f = 1/(2pi*sqrt(LC)) shows that frequency depends on the SQUARE ROOT of L x C."
          whyItHappens="Think of it like a spring and mass: adding mass doesn't double the oscillation period. The relationship is non-linear because energy storage grows with the square of voltage (capacitor) and current (inductor)."
          realWorldExample="Radio engineers use this relationship to design tuning ranges. A 10:1 variable capacitor only gives a sqrt(10) = 3.2:1 frequency range. To cover the full AM band (530-1700 kHz), you need both variable C and switchable L values."
        />

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '24px' }}>
          <Button variant="ghost" onClick={goBack}>Back</Button>
          <Button onClick={goNext}>Real World</Button>
        </div>

        {renderNavDots()}
      </div>
    </div>
  );

  const renderTransfer = () => {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);
    const completedCount = completedApps.filter(c => c).length;

    return (
      <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Progress indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px'
          }}>
            <span style={{ fontSize: '11px', color: colors.success, fontWeight: 600 }}>
              Step 8 of 10 - Real-World Applications
            </span>
            <span style={{ fontSize: '11px', color: '#e2e8f0' }}>
              (Application {selectedApp + 1} of {realWorldApps.length})
            </span>
          </div>

          <h2 style={{ fontSize: isMobile ? '22px' : '28px', color: '#e2e8f0', margin: '12px 0 24px' }}>
            LC Resonance is Everywhere
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
                  background: selectedApp === i ? `${a.color}22` : colors.bgSurface,
                  border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.bgElevated}`,
                  borderRadius: '12px',
                  padding: '16px 8px',
                  minHeight: '44px',
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
                <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 500 }}>
                  {a.title.split(' ').slice(0, 2).join(' ')}
                </div>
              </button>
            ))}
          </div>

          {/* Selected app details */}
          <div style={{
            background: colors.bgSurface,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            borderLeft: `4px solid ${app.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '48px' }}>{app.icon}</span>
              <div>
                <h3 style={{ fontSize: isMobile ? '18px' : '22px', color: '#e2e8f0', margin: 0 }}>{app.title}</h3>
                <p style={{ fontSize: '13px', color: app.color, margin: 0 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ fontSize: '15px', color: '#e2e8f0', marginBottom: '16px', lineHeight: 1.6 }}>
              {app.description}
            </p>

            <div style={{
              background: colors.bgElevated,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ fontSize: '12px', color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                How LC Resonance Connects:
              </h4>
              <p style={{ fontSize: '13px', color: '#e2e8f0', margin: 0, fontWeight: 400 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              background: colors.bgElevated,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ fontSize: '12px', color: colors.success, marginBottom: '8px', fontWeight: 600 }}>
                How It Works:
              </h4>
              <p style={{ fontSize: '13px', color: '#e2e8f0', margin: 0, fontWeight: 400 }}>
                {app.howItWorks}
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
                  background: colors.bgElevated,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: app.color }}>{stat.value}</div>
                  <div style={{ fontSize: '11px', color: '#e2e8f0' }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Got It button for current app */}
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                // Move to next uncompleted app if available
                const nextUncompleted = completedApps.findIndex((c, i) => !c && i !== selectedApp);
                if (nextUncompleted !== -1) {
                  setSelectedApp(nextUncompleted);
                }
              }}
              style={{
                width: '100%',
                padding: '14px',
                minHeight: '44px',
                borderRadius: '10px',
                border: 'none',
                background: completedApps[selectedApp] ? colors.success : app.color,
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {completedApps[selectedApp] ? '✓ Got It!' : 'Got It - Continue'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
            <Button variant="ghost" onClick={goBack}>Back</Button>
            <Button onClick={goNext} disabled={!allAppsCompleted}>
              {allAppsCompleted ? 'Take the Test' : `Explore ${4 - completedCount} more`}
            </Button>
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  };

  const renderTest = () => {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>
            {passed ? '🏆' : '📚'}
          </div>
          <h2 style={{ fontSize: isMobile ? '28px' : '36px', color: passed ? colors.success : colors.warning, marginBottom: '16px' }}>
            {passed ? 'Excellent!' : 'Keep Learning!'}
          </h2>
          <p style={{ fontSize: '48px', fontWeight: 700, color: colors.textPrimary, margin: '16px 0' }}>
            {testScore} / 10
          </p>
          <p style={{ fontSize: '16px', color: colors.textSecondary, marginBottom: '32px', maxWidth: '400px' }}>
            {passed
              ? 'You understand LC resonance and frequency selection!'
              : 'Review the concepts and try again.'}
          </p>

          {passed ? (
            <Button onClick={() => { playSound('complete'); goNext(); }}>
              Complete Lesson
            </Button>
          ) : (
            <Button onClick={() => {
              setTestSubmitted(false);
              setTestAnswers(Array(10).fill(null));
              setCurrentQuestion(0);
              setTestScore(0);
              goToPhase('hook');
            }}>
              Review and Try Again
            </Button>
          )}

          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '14px',
                fontWeight: 700,
                color: colors.accent,
                backgroundColor: `${colors.accent}20`,
                padding: '4px 10px',
                borderRadius: '6px',
              }}>
                Q{currentQuestion + 1}
              </span>
              <span style={{ fontSize: '12px', color: '#e2e8f0' }}>
                Question {currentQuestion + 1} of 10
              </span>
            </div>
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
                      : colors.bgElevated,
                }} />
              ))}
            </div>
          </div>

          {/* Scenario */}
          <div style={{
            background: colors.bgSurface,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ fontSize: '13px', color: '#e2e8f0', margin: 0, lineHeight: 1.6 }}>
              {question.scenario}
            </p>
          </div>

          {/* Question */}
          <h3 style={{ fontSize: isMobile ? '18px' : '22px', color: '#e2e8f0', marginBottom: '20px', lineHeight: 1.4 }}>
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
                  background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgSurface,
                  border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgElevated}`,
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
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgElevated,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '24px',
                  marginRight: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, fontSize: '14px' }}>
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
                  border: `1px solid ${colors.bgElevated}`,
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
                  background: testAnswers[currentQuestion] ? colors.accent : colors.bgElevated,
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
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.bgElevated,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Submit Test
              </button>
            )}
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isMobile ? '20px' : '40px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '100px', marginBottom: '24px' }}>
        🏆📻
      </div>

      <h1 style={{
        fontSize: isMobile ? '28px' : '36px',
        fontWeight: 700,
        color: colors.success,
        marginBottom: '16px'
      }}>
        LC Resonance Master!
      </h1>

      <p style={{
        fontSize: isMobile ? '16px' : '18px',
        color: colors.textSecondary,
        maxWidth: '500px',
        marginBottom: '24px',
        lineHeight: 1.6
      }}>
        You now understand how LC circuits select specific frequencies through resonance. This elegant principle enables radio communication, wireless charging, and countless other technologies!
      </p>

      <div style={{
        background: colors.bgSurface,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px',
        maxWidth: '400px',
      }}>
        <h3 style={{ fontSize: '18px', color: colors.textPrimary, marginBottom: '16px' }}>
          You Learned:
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
          {[
            'LC circuits resonate at f = 1/(2pi*sqrt(LC))',
            'Energy oscillates between electric and magnetic fields',
            'Doubling C reduces frequency by sqrt(2), not half',
            'Q factor determines selectivity sharpness',
            'Resonance enables radio tuning and wireless power',
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: colors.success }}>✓</span>
              <span style={{ fontSize: '13px', color: colors.textSecondary }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        padding: '20px',
        backgroundColor: colors.bgSurface,
        borderRadius: '12px',
        marginBottom: '24px'
      }}>
        <div style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '8px' }}>Test Score</div>
        <div style={{ color: colors.success, fontSize: '36px', fontWeight: 700 }}>{testScore}/10</div>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <button
          onClick={() => goToPhase('hook')}
          style={{
            padding: '14px 28px',
            borderRadius: '10px',
            border: `1px solid ${colors.bgElevated}`,
            background: 'transparent',
            color: colors.textSecondary,
            cursor: 'pointer',
          }}
        >
          Play Again
        </button>
        <Button onClick={() => window.location.href = '/'}>
          Return to Dashboard
        </Button>
      </div>

      {renderNavDots()}
    </div>
  );

  // Phase renderer mapping
  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      if (phase === 'transfer') {
        return (
          <TransferPhaseView
            conceptName="L C Resonance"
            applications={realWorldApps}
            onComplete={() => goToPhase('test')}
            isMobile={isMobile}
            colors={colors}
            typo={typo}
            playSound={playSound}
          />
        );
      }

      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  // Navigation bar component
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      backgroundColor: colors.bgSurface,
      borderBottom: `1px solid ${colors.bgElevated}`,
      padding: '12px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '20px' }}>📻</span>
        <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '14px' }}>
          LC Resonance Tuning
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: '#e2e8f0' }}>
          {phaseLabels[phase]}
        </span>
        <span style={{ fontSize: '12px', color: '#e2e8f0' }}>
          ({phaseOrder.indexOf(phase) + 1}/{phaseOrder.length})
        </span>
      </div>
    </nav>
  );

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: colors.bgDeep,
      color: colors.textPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Fixed navigation bar */}
      {renderNavBar()}

      {/* Spacer for fixed nav - removed, using paddingTop on scroll container instead */}

      {/* Progress bar */}
      {renderProgressBar()}

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: '48px' }}>
        {renderPhase()}
      </div>
    </div>
  );
};

export default LCResonanceRenderer;
