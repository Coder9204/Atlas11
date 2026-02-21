'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// -----------------------------------------------------------------------------
// Clock Recovery (CDR) - Complete 10-Phase Game (#259)
// Extracting clock from serial data: transitions, eye diagrams, and encoding
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

interface ClockRecoveryRendererProps {
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
    scenario: "A USB 3.0 link transmits data at 5 Gbps over a single differential pair. There is no separate clock wire connecting the transmitter and receiver.",
    question: "How does the receiver know when to sample each incoming bit?",
    options: [
      { id: 'a', label: "It uses an internal crystal oscillator running at exactly 5 GHz" },
      { id: 'b', label: "Clock and data recovery (CDR) extracts timing from transitions in the data stream", correct: true },
      { id: 'c', label: "The receiver samples continuously and uses software to find bit boundaries" },
      { id: 'd', label: "A separate low-frequency clock wire provides timing reference" }
    ],
    explanation: "CDR circuits use a phase-locked loop that locks onto transitions (edges) in the incoming data to reconstruct the transmitter's clock. This recovered clock then drives the sampling flip-flop at the optimal point in each bit period."
  },
  {
    scenario: "An engineer sends a long run of 20 consecutive '1' bits using NRZ encoding. The received data at the far end shows bit errors near the end of the run.",
    question: "What causes errors during long runs of identical bits in NRZ encoding?",
    options: [
      { id: 'a', label: "The wire cannot carry a DC voltage for that duration" },
      { id: 'b', label: "Without transitions, the CDR loses lock and the sampling clock drifts", correct: true },
      { id: 'c', label: "The transmitter runs out of power during long runs" },
      { id: 'd', label: "NRZ encoding cannot represent consecutive identical bits" }
    ],
    explanation: "CDR relies on data transitions to correct its clock phase. During long runs of identical bits (no transitions), the recovered clock free-runs and drifts, causing the sampling point to shift away from the eye center, increasing bit error rate."
  },
  {
    scenario: "A PCIe 4.0 link uses 128b/130b encoding. An engineer notices this adds only 1.6% overhead compared to 8b/10b's 25% overhead.",
    question: "Why does PCIe 4.0 still guarantee sufficient transitions for CDR with such low encoding overhead?",
    options: [
      { id: 'a', label: "PCIe 4.0 uses a separate clock lane instead of CDR" },
      { id: 'b', label: "The scrambler randomizes data, statistically ensuring enough transitions", correct: true },
      { id: 'c', label: "The physical medium automatically creates transitions" },
      { id: 'd', label: "128b/130b forces a transition every 4 bits" }
    ],
    explanation: "128b/130b uses a scrambler (LFSR-based) that XORs data with a pseudo-random sequence, statistically guaranteeing transition density without the overhead of 8b/10b. The 2-bit sync header provides a known transition pattern for block alignment."
  },
  {
    scenario: "An eye diagram of a 10 Gbps serial link shows the horizontal eye opening is only 60% of the unit interval, and the vertical opening is 70% of the full swing.",
    question: "What does the reduced horizontal eye opening primarily indicate?",
    options: [
      { id: 'a', label: "The signal amplitude is too low" },
      { id: 'b', label: "Excessive timing jitter is consuming the sampling window", correct: true },
      { id: 'c', label: "The data rate is too slow for the channel" },
      { id: 'd', label: "The termination resistors are the wrong value" }
    ],
    explanation: "Horizontal eye closure is caused by timing jitter - both random jitter (from thermal noise) and deterministic jitter (from ISI, crosstalk, duty-cycle distortion). The CDR must place its sampling point within this reduced opening to avoid errors."
  },
  {
    scenario: "A CDR circuit has a loop bandwidth of 4 MHz tracking a 10 Gbps data stream. The incoming data has both low-frequency wander (100 kHz) and high-frequency jitter (50 MHz).",
    question: "Which jitter component will the CDR track, and which will it filter?",
    options: [
      { id: 'a', label: "It tracks both - CDR bandwidth doesn't affect jitter tracking" },
      { id: 'b', label: "It tracks the low-frequency wander and filters the high-frequency jitter", correct: true },
      { id: 'c', label: "It filters everything and uses a fixed sampling point" },
      { id: 'd', label: "It tracks high-frequency jitter and ignores wander" }
    ],
    explanation: "The CDR loop bandwidth acts as a low-pass filter for jitter tracking. Jitter below the bandwidth (100 kHz wander) is tracked - the sampling point moves to follow it. Jitter above the bandwidth (50 MHz) is filtered - the sampling point stays centered, effectively rejecting it."
  },
  {
    scenario: "Manchester encoding represents each bit with a transition in the middle of the bit period: low-to-high for '1', high-to-low for '0'.",
    question: "What is the primary advantage of Manchester encoding for clock recovery?",
    options: [
      { id: 'a', label: "It doubles the data rate compared to NRZ" },
      { id: 'b', label: "Every bit period contains a guaranteed transition for the CDR to lock onto", correct: true },
      { id: 'c', label: "It eliminates all jitter from the signal" },
      { id: 'd', label: "It uses less bandwidth than NRZ encoding" }
    ],
    explanation: "Manchester encoding guarantees at least one transition per bit period, making CDR trivial - the clock can always be extracted. The trade-off is doubled bandwidth requirement (the mid-bit transition doubles the signal frequency), which is why high-speed links prefer NRZ with scrambling or 8b/10b."
  },
  {
    scenario: "8b/10b encoding maps each 8-bit byte to a 10-bit symbol. The encoding ensures that no symbol has more than 5 consecutive identical bits, and running disparity is tracked.",
    question: "Why is the running disparity constraint important for clock recovery?",
    options: [
      { id: 'a', label: "It reduces power consumption in the transmitter" },
      { id: 'b', label: "It maintains DC balance so AC-coupled links don't shift the signal baseline", correct: true },
      { id: 'c', label: "It provides error detection capability" },
      { id: 'd', label: "It makes the encoding reversible" }
    ],
    explanation: "Running disparity ensures roughly equal numbers of 1s and 0s over time (DC balance). Without DC balance, AC-coupled channels (using capacitors) would see baseline wander - the signal's midpoint shifts, distorting the eye diagram and confusing the CDR's phase detector."
  },
  {
    scenario: "A signal traveling through a 30cm PCB trace at 25 Gbps shows that the rising edge of bit N overlaps with the falling edge of bit N+2, smearing the transitions.",
    question: "What is this phenomenon called, and how does it affect CDR performance?",
    options: [
      { id: 'a', label: "Crosstalk - it couples noise from adjacent lanes" },
      { id: 'b', label: "Intersymbol interference (ISI) - it creates deterministic jitter that closes the eye", correct: true },
      { id: 'c', label: "Electromagnetic radiation - it causes signal loss" },
      { id: 'd', label: "Ground bounce - it shifts the reference voltage" }
    ],
    explanation: "ISI occurs when the channel bandwidth is insufficient for the data rate, causing energy from one bit to spread into adjacent bit periods. This creates data-dependent (deterministic) jitter that closes the eye diagram. Equalization (CTLE, DFE) at the receiver compensates for ISI."
  },
  {
    scenario: "A CDR designer is choosing between a bang-bang (Alexander) phase detector and a linear phase detector for a 56 Gbps PAM4 receiver.",
    question: "What is the key difference between these phase detector types?",
    options: [
      { id: 'a', label: "Bang-bang works at higher frequencies while linear works at lower frequencies" },
      { id: 'b', label: "Bang-bang outputs only early/late decisions while linear outputs proportional phase error", correct: true },
      { id: 'c', label: "Linear phase detectors require an external reference clock" },
      { id: 'd', label: "Bang-bang is analog while linear is digital" }
    ],
    explanation: "Bang-bang (binary) phase detectors make early/late decisions by comparing samples, outputting +1 or -1. Linear phase detectors output an error proportional to the phase offset. Bang-bang is simpler but creates limit-cycle jitter; linear gives smoother tracking but requires more analog precision."
  },
  {
    scenario: "An HDMI 2.1 transmitter sends video at 48 Gbps using four lanes. Each lane's CDR must achieve a BER of 10^-12 or better for error-free video.",
    question: "If the eye diagram shows 30% horizontal opening and 40% vertical opening, what is the most effective way to improve BER?",
    options: [
      { id: 'a', label: "Increase the cable length to filter noise" },
      { id: 'b', label: "Use equalization to open the eye and reduce ISI-induced jitter", correct: true },
      { id: 'c', label: "Decrease the CDR bandwidth to zero" },
      { id: 'd', label: "Remove the encoding overhead to increase data throughput" }
    ],
    explanation: "Equalization (CTLE at the receiver, FFE at the transmitter, DFE for post-cursor ISI) compensates for channel loss and ISI, reopening the eye. This gives the CDR a larger timing window and reduces BER. Modern SerDes combine multiple equalization stages with CDR for robust operation."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🔌',
    title: 'USB 3.x / USB4 Interfaces',
    short: 'Universal serial connectivity',
    tagline: 'Recovering clocks at 5-40 Gbps from a single cable',
    description: 'USB evolved from a clocked parallel interface to high-speed serial links using embedded clocking. USB 3.0 at 5 Gbps, USB 3.2 at 20 Gbps, and USB4 at 40 Gbps all rely on CDR to extract timing from the data stream without a separate clock wire.',
    connection: 'The CDR in a USB receiver must lock onto the incoming data within microseconds and track frequency offsets of up to 300 ppm between transmitter and receiver reference clocks. 8b/10b encoding (USB 3.0) or 128b/132b (USB4) ensures sufficient transitions.',
    howItWorks: 'A phase interpolator adjusts the sampling clock phase based on early/late decisions from a bang-bang phase detector. A frequency tracking loop handles the ppm offset between TX and RX crystals. The entire CDR runs in a few square millimeters of silicon.',
    stats: [
      { value: '40 Gbps', label: 'USB4 max speed', icon: '🚀' },
      { value: '300 ppm', label: 'Frequency tolerance', icon: '🎯' },
      { value: '<1 us', label: 'CDR lock time', icon: '⚡' }
    ],
    examples: ['Laptops and smartphones', 'External SSDs and docks', 'DisplayPort Alt Mode', 'Thunderbolt tunneling'],
    companies: ['Intel', 'AMD', 'Realtek', 'VIA Labs'],
    futureImpact: 'USB4 v2.0 pushes to 80 Gbps per lane using PAM3 signaling, requiring even more sophisticated CDR with multi-level eye tracking.',
    color: '#10B981'
  },
  {
    icon: '🖥️',
    title: 'PCIe 5.0 / 6.0 Interconnects',
    short: 'Processor-to-device links',
    tagline: 'The backbone of modern computing at 32-64 GT/s',
    description: 'PCIe connects CPUs to GPUs, SSDs, and network cards. PCIe 5.0 runs at 32 GT/s using NRZ, while PCIe 6.0 doubles to 64 GT/s using PAM4 signaling - both requiring precise CDR at the receiver.',
    connection: 'At PCIe 6.0 speeds, the unit interval is just 15.6 ps. The CDR must achieve sub-picosecond phase resolution to center the sampling point in the eye. Forward Error Correction (FEC) relaxes BER requirements from 10^-12 to 10^-6, but CDR precision remains critical.',
    howItWorks: 'PCIe receivers use CTLE + DFE equalization to open the eye, then a CDR with phase interpolator places the sampling clock. PCIe 6.0 adds FEC (CRC + FLIT-based retransmission) as an additional safety net for the reduced PAM4 eye margins.',
    stats: [
      { value: '64 GT/s', label: 'PCIe 6.0 per lane', icon: '📊' },
      { value: '15.6 ps', label: 'Unit interval', icon: '⏱️' },
      { value: '128 GB/s', label: 'x16 bandwidth', icon: '💾' }
    ],
    examples: ['GPU computing (AI/ML)', 'NVMe SSDs', 'Network adapters', 'FPGA accelerators'],
    companies: ['Intel', 'AMD', 'NVIDIA', 'Broadcom'],
    futureImpact: 'PCIe 7.0 targets 128 GT/s using PAM4, pushing CDR design to the limits of silicon process technology.',
    color: '#3B82F6'
  },
  {
    icon: '📺',
    title: 'HDMI 2.1 / DisplayPort 2.1',
    short: 'High-bandwidth video links',
    tagline: 'Delivering 8K video at 48 Gbps',
    description: 'Modern display interfaces transmit uncompressed 8K video at 48 Gbps (HDMI 2.1) or 80 Gbps (DP 2.1) using multiple serial lanes with embedded clocking. Each lane runs a CDR independently.',
    connection: 'Display links face unique CDR challenges: cable lengths up to 3m for HDMI cause significant ISI, and consumer cables vary wildly in quality. The CDR and equalizer must adapt to each cable automatically during link training.',
    howItWorks: 'During link training, the transmitter sends known patterns. The receiver sweeps its equalizer settings and CDR parameters to find the optimal configuration. Adaptive equalization continuously adjusts during operation to track temperature and aging effects.',
    stats: [
      { value: '48 Gbps', label: 'HDMI 2.1 bandwidth', icon: '📺' },
      { value: '4 lanes', label: 'Parallel CDR circuits', icon: '🔗' },
      { value: '8K@60', label: 'Max resolution', icon: '🎮' }
    ],
    examples: ['8K televisions', 'Gaming monitors', 'VR headsets', 'Professional displays'],
    companies: ['HDMI Forum', 'VESA', 'Parade Technologies', 'Synaptics'],
    futureImpact: 'DisplayPort 2.1 UHBR modes reach 80 Gbps total, and future standards will push beyond 100 Gbps for immersive AR/VR displays.',
    color: '#8B5CF6'
  },
  {
    icon: '🌐',
    title: '400G/800G Ethernet',
    short: 'Data center networking',
    tagline: 'Connecting the cloud at hundreds of gigabits',
    description: '400G Ethernet uses 8 lanes of 53 Gbps PAM4, and 800G doubles to 8x106 Gbps. Each lane requires its own CDR circuit that must handle long-reach optical and copper channels with different impairment profiles.',
    connection: 'Ethernet CDR must handle both electrical (DAC copper cables, 1-3m) and optical channels (single-mode fiber, 10+ km). Each has different jitter profiles: copper has ISI-dominated jitter while optical has random jitter from the laser and photo-detector.',
    howItWorks: 'Ethernet SerDes use a reference clock architecture where TX and RX share a common frequency reference. The CDR only needs to track phase, not frequency. This simplifies the loop and allows tighter jitter tolerance.',
    stats: [
      { value: '800 Gbps', label: 'Total throughput', icon: '🌐' },
      { value: '106 Gbps', label: 'Per-lane speed', icon: '⚡' },
      { value: '10^-13', label: 'Target BER', icon: '🎯' }
    ],
    examples: ['Hyperscale data centers', 'AI training clusters', 'Cloud infrastructure', '5G backhaul'],
    companies: ['Broadcom', 'Marvell', 'Cisco', 'NVIDIA (Mellanox)'],
    futureImpact: '1.6T Ethernet is in development using 200G per lane, requiring CDR circuits that operate with sub-picosecond precision at over 100 GBaud.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ClockRecoveryRenderer: React.FC<ClockRecoveryRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [dataRate, setDataRate] = useState(5); // Gbps
  const [jitterAmount, setJitterAmount] = useState(30); // picoseconds RMS
  const [isiLevel, setIsiLevel] = useState(20); // percentage
  const [cdrBandwidth, setCdrBandwidth] = useState(4); // MHz
  const [encoding, setEncoding] = useState<'NRZ' | '8b10b' | 'Manchester'>('NRZ');
  const [samplingPhase, setSamplingPhase] = useState(50); // percentage across UI
  const [animationFrame, setAnimationFrame] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Predict phase step tracking
  const [predictStep, setPredictStep] = useState(0);
  const [twistPredictStep, setTwistPredictStep] = useState(0);

  // Navigation ref
  const isNavigating = useRef(false);

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
    accent: '#06B6D4',
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#9CA3AF',
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
    twist_play: 'Twist Explore',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const emitEvent = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      eventType,
      gameType: 'clock_recovery',
      gameTitle: 'Clock Recovery',
      details,
      timestamp: Date.now()
    });
  }, [onGameEvent]);

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    emitEvent('phase_changed', { phase: p });
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [emitEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Seeded random for consistent visualization
  const seededRandom = useCallback((seed: number) => {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }, []);

  const getJitter = useCallback((seed: number) => {
    const x = Math.sin(seed * 12.9898 + animationFrame * 0.08) * 43758.5453;
    return ((x - Math.floor(x)) - 0.5) * 2 * (jitterAmount / 100);
  }, [jitterAmount, animationFrame]);

  // Calculate CDR metrics
  const calculateMetrics = useCallback(() => {
    const unitIntervalPs = 1000 / dataRate; // ps per bit
    const jitterRatio = (jitterAmount * 3) / unitIntervalPs * 100; // 3-sigma as % of UI
    const isiContribution = isiLevel * 0.5; // ps of deterministic jitter from ISI
    const totalJitterPs = Math.sqrt(Math.pow(jitterAmount * 3, 2) + Math.pow(isiContribution, 2));
    const eyeOpeningH = Math.max(0, 100 - jitterRatio - isiLevel * 0.8);
    const eyeOpeningV = Math.max(0, 100 - isiLevel * 1.2 - jitterAmount * 0.1);

    // BER estimate (simplified erfc approximation)
    const q = (eyeOpeningH / 100) * (eyeOpeningV / 100) * 8;
    const berExponent = Math.min(-1, -q * q / 2);
    const berLog = Math.max(-15, berExponent / Math.log(10));

    // Transition density depends on encoding
    let transitionDensity = 0;
    if (encoding === 'Manchester') transitionDensity = 100;
    else if (encoding === '8b10b') transitionDensity = Math.max(40, 60 + seededRandom(animationFrame) * 10);
    else transitionDensity = Math.max(10, 50 - isiLevel * 0.3 + seededRandom(animationFrame) * 15);

    return {
      unitIntervalPs,
      jitterRatio,
      totalJitterPs,
      eyeOpeningH,
      eyeOpeningV,
      berLog,
      transitionDensity,
    };
  }, [dataRate, jitterAmount, isiLevel, encoding, animationFrame, seededRandom]);

  const metrics = calculateMetrics();

  // Generate data pattern based on encoding
  const generateDataBits = useCallback((count: number, seed: number): number[] => {
    const bits: number[] = [];
    for (let i = 0; i < count; i++) {
      if (encoding === 'Manchester') {
        // Manchester: mid-bit transition guaranteed
        bits.push(seededRandom(seed + i * 3) > 0.5 ? 1 : 0);
      } else if (encoding === '8b10b') {
        // 8b10b: max run length of 5
        if (i >= 5 && bits.slice(i - 5).every(b => b === bits[i - 1])) {
          bits.push(bits[i - 1] === 1 ? 0 : 1);
        } else {
          bits.push(seededRandom(seed + i * 7) > 0.45 ? 1 : 0);
        }
      } else {
        // NRZ: can have long runs
        bits.push(seededRandom(seed + i * 5) > 0.5 ? 1 : 0);
      }
    }
    return bits;
  }, [encoding, seededRandom]);

  // ─────────────────────────────────────────────────────────────
  // SVG: Eye Diagram Visualization
  // ─────────────────────────────────────────────────────────────
  const renderEyeDiagram = (interactive: boolean) => {
    const width = isMobile ? 320 : 460;
    const height = isMobile ? 220 : 280;
    const pad = { top: 30, right: 20, bottom: 40, left: 45 };
    const pw = width - pad.left - pad.right;
    const ph = height - pad.top - pad.bottom;

    const numTraces = 50;
    const traces: string[] = [];
    const bitPatterns = [[0,1,0],[1,0,1],[0,0,1],[1,1,0],[0,1,1],[1,0,0],[1,1,1],[0,0,0]];

    for (let t = 0; t < numTraces; t++) {
      const jOff = getJitter(t * 7) * pw * 0.2;
      const nOff = getJitter(t * 13 + 500) * (isiLevel * 0.15);
      const isiSpread = getJitter(t * 19 + 900) * (isiLevel * 0.25);
      const bits = bitPatterns[t % bitPatterns.length];

      const yH = pad.top + 15 + nOff;
      const yL = pad.top + ph - 15 + nOff;
      const segW = pw / 2;

      let path = '';
      for (let i = 0; i < 2; i++) {
        const sx = pad.left + i * segW + jOff;
        const ex = sx + segW;
        const sy = bits[i] ? yH : yL;
        const ey = bits[i + 1] ? yH : yL;

        if (i === 0) path = `M ${sx} ${sy}`;

        const tw = segW * (0.12 + isiLevel * 0.003) + isiSpread;
        path += ` L ${ex - tw} ${sy}`;
        path += ` L ${ex + tw} ${ey}`;
      }
      path += ` L ${pad.left + pw + jOff} ${bits[2] ? yH : yL}`;
      traces.push(path);
    }

    const eyeH = Math.max(0, pw * 0.4 * (metrics.eyeOpeningH / 100));
    const eyeV = Math.max(0, ph * 0.35 * (metrics.eyeOpeningV / 100));

    // Sampling point position
    const sampleX = pad.left + pw * (samplingPhase / 100);
    const sampleY = pad.top + ph / 2;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}
        preserveAspectRatio="xMidYMid meet"
        role="img" aria-label="Eye diagram visualization">
        <defs>
          <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.8" />
            <stop offset="50%" stopColor="#0891B2" stopOpacity="0.9" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="0.8" />
          </linearGradient>
          <filter id="eyeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width={width} height={height} fill={colors.bgSecondary} rx="12" />

        <text x={width / 2} y={16} fill={colors.textSecondary} fontSize="12" textAnchor="middle" fontWeight="600">
          Eye Diagram - {encoding} @ {dataRate} Gbps
        </text>

        {/* Plot area */}
        <rect x={pad.left} y={pad.top} width={pw} height={ph} fill={colors.bgPrimary} stroke={colors.border} />

        {/* Grid */}
        <line x1={pad.left + pw / 2} y1={pad.top} x2={pad.left + pw / 2} y2={pad.top + ph} stroke={colors.border} strokeDasharray="4,4" />
        <line x1={pad.left} y1={pad.top + ph / 2} x2={pad.left + pw} y2={pad.top + ph / 2} stroke={colors.border} strokeDasharray="4,4" />

        {/* Eye traces */}
        {traces.map((p, i) => (
          <path key={i} d={p} fill="none" stroke="url(#eyeGrad)" strokeWidth="1" opacity={0.18} />
        ))}

        {/* Eye opening ellipse */}
        <ellipse cx={pad.left + pw / 2} cy={pad.top + ph / 2}
          rx={eyeH / 2} ry={eyeV / 2}
          fill="none"
          stroke={metrics.eyeOpeningH > 40 ? colors.success : metrics.eyeOpeningH > 20 ? colors.warning : colors.error}
          strokeWidth="1.5" strokeDasharray="4,4" opacity="0.7"
        />

        {/* Eye measurements */}
        {/* Horizontal eye width */}
        <line x1={pad.left + pw / 2 - eyeH / 2} y1={pad.top + ph / 2} x2={pad.left + pw / 2 + eyeH / 2} y2={pad.top + ph / 2}
          stroke={colors.warning} strokeWidth="1" opacity="0.6" />
        <text x={pad.left + pw / 2} y={pad.top + ph / 2 + 14}
          fill={colors.warning} fontSize="9" textAnchor="middle" fontWeight="600">
          W:{metrics.eyeOpeningH.toFixed(0)}%
        </text>

        {/* Vertical eye height */}
        <line x1={pad.left + pw / 2} y1={pad.top + ph / 2 - eyeV / 2} x2={pad.left + pw / 2} y2={pad.top + ph / 2 + eyeV / 2}
          stroke={colors.success} strokeWidth="1" opacity="0.6" />
        <text x={pad.left + pw / 2 + 18} y={pad.top + ph / 2 + 4}
          fill={colors.success} fontSize="9" textAnchor="start" fontWeight="600">
          H:{metrics.eyeOpeningV.toFixed(0)}%
        </text>

        {/* Sampling point */}
        {interactive && (
          <g filter="url(#eyeGlow)">
            <line x1={sampleX} y1={pad.top + 5} x2={sampleX} y2={pad.top + ph - 5}
              stroke={colors.error} strokeWidth="2" opacity="0.8" />
            <circle cx={sampleX} cy={sampleY} r={5}
              fill={colors.error} stroke="white" strokeWidth="1.5" />
            <text x={sampleX} y={pad.top + ph + 14}
              fill={colors.error} fontSize="9" textAnchor="middle" fontWeight="600">
              Sample
            </text>
          </g>
        )}

        {/* Quality label */}
        <text x={pad.left + pw / 2} y={pad.top + ph / 2 - (eyeV / 2 + 8)}
          fill={metrics.eyeOpeningH > 40 ? colors.success : metrics.eyeOpeningH > 20 ? colors.warning : colors.error}
          fontSize="11" textAnchor="middle" fontWeight="700">
          {metrics.eyeOpeningH > 40 ? 'OPEN' : metrics.eyeOpeningH > 20 ? 'MARGINAL' : 'CLOSED'}
        </text>

        {/* BER */}
        <text x={pad.left + pw - 5} y={pad.top + 14}
          fill={metrics.berLog < -10 ? colors.success : metrics.berLog < -6 ? colors.warning : colors.error}
          fontSize="10" textAnchor="end" fontWeight="600">
          BER: 10^{metrics.berLog.toFixed(1)}
        </text>

        {/* Axis labels */}
        <text x={pad.left + pw / 2} y={height - 6} fill={colors.textMuted} fontSize="10" textAnchor="middle">
          1 UI = {metrics.unitIntervalPs.toFixed(0)} ps
        </text>
        <text x={8} y={pad.top + 12} fill={colors.textMuted} fontSize="9">HIGH</text>
        <text x={8} y={pad.top + ph - 4} fill={colors.textMuted} fontSize="9">LOW</text>
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // SVG: Data Waveform + Recovered Clock
  // ─────────────────────────────────────────────────────────────
  const renderDataAndClock = (isStatic: boolean = false) => {
    const width = isMobile ? 320 : 460;
    const height = isMobile ? 240 : 300;
    const pad = { top: 20, right: 15, bottom: 25, left: 45 };
    const pw = width - pad.left - pad.right;
    const totalH = height - pad.top - pad.bottom;
    const dataH = totalH * 0.45;
    const clockH = totalH * 0.35;
    const gap = totalH * 0.2;

    const dataTop = pad.top;
    const clockTop = pad.top + dataH + gap;

    const numBits = 16;
    const bits = generateDataBits(numBits, 42 + (isStatic ? 0 : Math.floor(animationFrame / 20)));
    const bitW = pw / numBits;

    // Build NRZ data waveform with jitter
    let dataPath = '';
    for (let i = 0; i < numBits; i++) {
      const jOff = isStatic ? 0 : getJitter(i * 11) * bitW * 0.25;
      const isiSmear = isStatic ? 0 : (isiLevel / 100) * bitW * 0.15;

      const x = pad.left + i * bitW + jOff;
      const y = bits[i] ? dataTop + 8 : dataTop + dataH - 8;

      if (i === 0) {
        dataPath = `M ${x} ${y}`;
      } else {
        const prevY = bits[i - 1] ? dataTop + 8 : dataTop + dataH - 8;
        if (bits[i] !== bits[i - 1]) {
          // Transition with slew rate affected by ISI
          const transW = bitW * 0.08 + isiSmear;
          dataPath += ` L ${x - transW} ${prevY} L ${x + transW} ${y}`;
        } else {
          dataPath += ` L ${x} ${y}`;
        }
      }
    }
    dataPath += ` L ${pad.left + pw} ${bits[numBits - 1] ? dataTop + 8 : dataTop + dataH - 8}`;

    // Build recovered clock waveform
    let clockPath = '';
    const clockH2 = clockH - 16;
    for (let i = 0; i < numBits; i++) {
      const cdrPhaseOff = isStatic ? 0 : getJitter(i * 3 + 200) * bitW * 0.08 * (1 - cdrBandwidth / 10);
      const x = pad.left + i * bitW + cdrPhaseOff;
      const halfBit = bitW / 2;

      const yH = clockTop + 8;
      const yL = clockTop + clockH2;

      if (i === 0) {
        clockPath = `M ${x} ${yL}`;
      }
      clockPath += ` L ${x} ${yH} L ${x + halfBit} ${yH} L ${x + halfBit} ${yL} L ${x + bitW} ${yL}`;
    }

    // Sampling points (where recovered clock samples data)
    const samplePoints: { x: number; y: number; correct: boolean }[] = [];
    if (!isStatic) {
      for (let i = 0; i < numBits; i++) {
        const cdrOff = getJitter(i * 3 + 200) * bitW * 0.08 * (1 - cdrBandwidth / 10);
        const sx = pad.left + i * bitW + bitW * (samplingPhase / 100) + cdrOff;
        const dataVal = bits[i];
        const sy = dataVal ? dataTop + 8 : dataTop + dataH - 8;
        // Check if sampling near a transition (could be error)
        const nearTransition = i > 0 && bits[i] !== bits[i - 1] && samplingPhase < 20;
        samplePoints.push({ x: sx, y: sy, correct: !nearTransition });
      }
    }

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}
        preserveAspectRatio="xMidYMid meet"
        role="img" aria-label="Data stream and recovered clock">
        <defs>
          <linearGradient id="dataGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06B6D4" /><stop offset="100%" stopColor="#0891B2" />
          </linearGradient>
          <linearGradient id="clkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" /><stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width={width} height={height} fill={colors.bgSecondary} rx="12" />

        {/* Section labels */}
        <text x={12} y={dataTop + dataH / 2 + 4} fill={colors.accent} fontSize="10" fontWeight="600">DATA</text>
        <text x={12} y={clockTop + clockH / 2 + 4} fill="#8B5CF6" fontSize="10" fontWeight="600">CLK</text>

        {/* Data area background */}
        <rect x={pad.left} y={dataTop} width={pw} height={dataH}
          fill={colors.bgPrimary} stroke={colors.border} rx="2" />

        {/* Bit boundaries */}
        {Array.from({ length: numBits + 1 }).map((_, i) => (
          <line key={`vg-${i}`} x1={pad.left + i * bitW} y1={dataTop}
            x2={pad.left + i * bitW} y2={dataTop + dataH}
            stroke={colors.border} strokeDasharray="2,4" opacity="0.4" />
        ))}

        {/* Bit labels */}
        {bits.map((b, i) => (
          <text key={`bl-${i}`} x={pad.left + i * bitW + bitW / 2} y={dataTop + dataH + 12}
            fill={colors.textMuted} fontSize="8" textAnchor="middle">{b}</text>
        ))}

        {/* Data waveform */}
        <path d={dataPath} fill="none" stroke="url(#dataGrad)" strokeWidth="2.5" />

        {/* Clock area background */}
        <rect x={pad.left} y={clockTop} width={pw} height={clockH - 12}
          fill={colors.bgPrimary} stroke={colors.border} rx="2" />

        {/* Recovered clock waveform */}
        <path d={clockPath} fill="none" stroke="url(#clkGrad)" strokeWidth="2" />

        {/* Sampling points */}
        {samplePoints.map((sp, i) => (
          <g key={`sp-${i}`}>
            <line x1={sp.x} y1={dataTop} x2={sp.x} y2={dataTop + dataH}
              stroke={sp.correct ? colors.success : colors.error}
              strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
            <circle cx={sp.x} cy={sp.y} r={3}
              fill={sp.correct ? colors.success : colors.error} />
          </g>
        ))}

        {/* Legend */}
        <line x1={pad.left + 5} y1={height - 8} x2={pad.left + 20} y2={height - 8}
          stroke="url(#dataGrad)" strokeWidth="2" />
        <text x={pad.left + 24} y={height - 4} fill={colors.textMuted} fontSize="9">Data</text>
        <line x1={pad.left + 60} y1={height - 8} x2={pad.left + 75} y2={height - 8}
          stroke="url(#clkGrad)" strokeWidth="2" />
        <text x={pad.left + 79} y={height - 4} fill={colors.textMuted} fontSize="9">Recovered Clock</text>
        {!isStatic && (
          <>
            <circle cx={pad.left + 160} cy={height - 8} r={3} fill={colors.success} />
            <text x={pad.left + 166} y={height - 4} fill={colors.textMuted} fontSize="9">Sample OK</text>
            <circle cx={pad.left + 220} cy={height - 8} r={3} fill={colors.error} />
            <text x={pad.left + 226} y={height - 4} fill={colors.textMuted} fontSize="9">Error Risk</text>
          </>
        )}
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // UI Components
  // ─────────────────────────────────────────────────────────────
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: '60px',
      background: colors.bgSecondary, borderBottom: `1px solid ${colors.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', zIndex: 1000,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>📡</span>
        <span style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>Clock Recovery</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ ...typo.small, color: colors.textSecondary }}>{phaseLabels[phase]}</span>
        <span style={{ ...typo.small, color: colors.textMuted }}>
          ({phaseOrder.indexOf(phase) + 1}/{phaseOrder.length})
        </span>
      </div>
    </nav>
  );

  const renderProgressBar = () => (
    <div style={{ position: 'fixed', top: '60px', left: 0, right: 0, height: '4px', background: colors.bgSecondary, zIndex: 999 }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    const canGoForward = currentIndex < phaseOrder.length - 1;
    return (
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px', borderTop: `1px solid ${colors.border}`, background: colors.bgSecondary,
      }}>
        <button onClick={() => canGoBack && prevPhase()} disabled={!canGoBack}
          style={{ ...secondaryButtonStyle, opacity: canGoBack ? 1 : 0.5, cursor: canGoBack ? 'pointer' : 'not-allowed' }}>
          Back
        </button>
        <div style={{ display: 'flex', gap: '4px' }}>
          {phaseOrder.map((p, i) => (
            <button key={p} onClick={() => goToPhase(p)}
              aria-label={phaseLabels[p]} title={phaseLabels[p]}
              style={{ width: '8px', height: '8px', borderRadius: '50%',
                background: i <= currentIndex ? colors.accent : colors.border,
                cursor: 'pointer', border: 'none', padding: 0 }} />
          ))}
        </div>
        <button onClick={() => canGoForward && nextPhase()} disabled={!canGoForward}
          style={{ ...primaryButtonStyle, opacity: canGoForward ? 1 : 0.5, cursor: canGoForward ? 'pointer' : 'not-allowed' }}>
          Next
        </button>
      </div>
    );
  };

  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
    color: 'white', border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px', fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700, cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease', minHeight: '44px',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    padding: '14px 28px', borderRadius: '10px',
    border: `1px solid ${colors.border}`,
    background: 'transparent', color: colors.textSecondary,
    cursor: 'pointer', minHeight: '44px',
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%', height: '20px', touchAction: 'pan-y',
    WebkitAppearance: 'none' as const, accentColor: '#3b82f6', cursor: 'pointer',
  };

  // ─────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', paddingTop: '84px', textAlign: 'center', overflowY: 'auto' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px', animation: 'pulse 2s infinite' }}>📡🔄</div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Clock Recovery
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '600px', marginBottom: '32px' }}>
            "USB, HDMI, PCIe, and Ethernet all send data at billions of bits per second — with <span style={{ color: colors.accent }}>no clock wire</span>. How does the receiver know exactly when to sample each bit?"
          </p>

          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '32px', maxWidth: '500px', border: `1px solid ${colors.border}`, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.6)' }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              "In modern serial links, the clock is hidden inside the data. The receiver must find it, lock onto it, and track it — all in nanoseconds. This is clock and data recovery."
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
              — High-Speed SerDes Design Principle
            </p>
          </div>

          <button onClick={() => { playSound('click'); emitEvent('game_started'); nextPhase(); }} style={primaryButtonStyle}>
            Discover Clock Recovery →
          </button>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Nothing happens - the receiver has its own perfect clock that always works' },
      { id: 'b', text: 'The CDR loses track of timing because there are no transitions to lock onto' },
      { id: 'c', text: 'The data rate automatically slows down to compensate' },
    ];

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '84px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>Step {predictStep + 1} of 2</span>
            </div>

            <div style={{ background: `${colors.accent}22`, borderRadius: '12px', padding: '16px', marginBottom: '24px', border: `1px solid ${colors.accent}44` }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>Make Your Prediction</p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              A serial link sends NRZ data. What happens when the transmitter sends a long run of 20 consecutive '1' bits (no transitions)?
            </h2>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
              {renderDataAndClock(true)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button key={opt.id}
                  onClick={() => { playSound('click'); setPrediction(opt.id); setPredictStep(1); emitEvent('prediction_made', { prediction: opt.id }); }}
                  style={{
                    background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '12px', padding: '16px 20px', textAlign: 'left',
                    cursor: 'pointer', transition: 'all 0.2s', minHeight: '44px',
                  }}>
                  <span style={{ display: 'inline-block', width: '28px', height: '28px', borderRadius: '50%',
                    background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                    color: prediction === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center', lineHeight: '28px', marginRight: '12px', fontWeight: 700 }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.body }}>{opt.text}</span>
                </button>
              ))}
            </div>

            {prediction && (
              <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
                See What Happens →
              </button>
            )}
          </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // PLAY PHASE - Interactive CDR Exploration
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '84px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Explore Clock Recovery
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Adjust jitter and ISI to see how the eye diagram responds
            </p>

            <div style={{ background: `${colors.accent}15`, border: `1px solid ${colors.accent}40`, borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.accent }}>Observe:</strong> Watch how increasing jitter closes the eye horizontally, while ISI closes it vertically. Move the sampling point to see where errors occur.
              </p>
            </div>

            {/* Side-by-side layout */}
            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '24px', width: '100%', alignItems: isMobile ? 'center' : 'flex-start' }}>

                {/* Left: Visualizations */}
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    {renderEyeDiagram(true)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {renderDataAndClock(false)}
                  </div>
                </div>

                {/* Right: Controls */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>

                  {/* Jitter slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Jitter (RMS)</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{jitterAmount} ps</span>
                    </div>
                    <input type="range" min="0" max="150" step="5" value={jitterAmount}
                      onChange={(e) => setJitterAmount(parseInt(e.target.value))}
                      onInput={(e) => setJitterAmount(parseInt((e.target as HTMLInputElement).value))}
                      style={sliderStyle} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>0 (Ideal)</span>
                      <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>150 ps</span>
                    </div>
                  </div>

                  {/* ISI slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>ISI Level</span>
                      <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{isiLevel}%</span>
                    </div>
                    <input type="range" min="0" max="80" step="5" value={isiLevel}
                      onChange={(e) => setIsiLevel(parseInt(e.target.value))}
                      onInput={(e) => setIsiLevel(parseInt((e.target as HTMLInputElement).value))}
                      style={sliderStyle} />
                  </div>

                  {/* Data rate slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Data Rate</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{dataRate} Gbps</span>
                    </div>
                    <input type="range" min="1" max="25" step="1" value={dataRate}
                      onChange={(e) => setDataRate(parseInt(e.target.value))}
                      onInput={(e) => setDataRate(parseInt((e.target as HTMLInputElement).value))}
                      style={sliderStyle} />
                  </div>

                  {/* Sampling phase slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Sampling Phase</span>
                      <span style={{ ...typo.small, color: colors.error, fontWeight: 600 }}>{samplingPhase}% UI</span>
                    </div>
                    <input type="range" min="5" max="95" step="5" value={samplingPhase}
                      onChange={(e) => setSamplingPhase(parseInt(e.target.value))}
                      onInput={(e) => setSamplingPhase(parseInt((e.target as HTMLInputElement).value))}
                      style={sliderStyle} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>Edge</span>
                      <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>Center</span>
                      <span style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>Edge</span>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: metrics.eyeOpeningH > 40 ? colors.success : metrics.eyeOpeningH > 20 ? colors.warning : colors.error, fontSize: '18px' }}>
                        {metrics.eyeOpeningH.toFixed(0)}%
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>Eye Width</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: metrics.eyeOpeningV > 40 ? colors.success : metrics.eyeOpeningV > 20 ? colors.warning : colors.error, fontSize: '18px' }}>
                        {metrics.eyeOpeningV.toFixed(0)}%
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>Eye Height</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: metrics.berLog < -10 ? colors.success : metrics.berLog < -6 ? colors.warning : colors.error, fontSize: '18px' }}>
                        10^{metrics.berLog.toFixed(0)}
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>BER</div>
                    </div>
                    <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ ...typo.h3, color: colors.accent, fontSize: '18px' }}>
                        {metrics.unitIntervalPs.toFixed(0)} ps
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted, fontSize: '10px' }}>Unit Interval</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Discovery prompts */}
            {jitterAmount > 80 && (
              <div style={{ background: `${colors.warning}22`, border: `1px solid ${colors.warning}`, borderRadius: '12px', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
                <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                  The eye is closing! The CDR has less margin to place its sampling point.
                </p>
              </div>
            )}
            {isiLevel > 50 && (
              <div style={{ background: `${colors.error}22`, border: `1px solid ${colors.error}`, borderRadius: '12px', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
                <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
                  ISI is smearing transitions - previous bits are interfering with current ones, creating deterministic jitter.
                </p>
              </div>
            )}

            {/* Key terms */}
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '24px', border: `1px solid ${colors.border}` }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '12px', fontWeight: 600 }}>Key Terms:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  <strong style={{ color: colors.textPrimary }}>CDR:</strong> Clock and Data Recovery - extracting a sampling clock from the data stream transitions.
                </p>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  <strong style={{ color: colors.textPrimary }}>Eye Diagram:</strong> Overlay of many bit periods showing the available sampling window.
                </p>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  <strong style={{ color: colors.textPrimary }}>ISI:</strong> Intersymbol Interference - energy from one bit smearing into adjacent bits.
                </p>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  <strong style={{ color: colors.textPrimary }}>BER:</strong> Bit Error Rate - probability of incorrectly sampling a bit.
                </p>
              </div>
            </div>

            <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
              Understand CDR Principles →
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
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '84px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              How Clock Recovery Works
            </h2>

            <div style={{ background: `${colors.accent}22`, borderRadius: '12px', padding: '16px', marginBottom: '24px', border: `1px solid ${colors.accent}44` }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                {prediction === 'b'
                  ? "You correctly predicted that without transitions, the CDR loses lock. Let's explore the full CDR loop and why transition density is critical."
                  : "As you observed, the CDR needs data transitions to maintain timing. Here's how the recovery loop works."}
              </p>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>The CDR Feedback Loop</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  A CDR is a phase-locked loop (PLL) that locks onto data transitions instead of a reference clock. It has three key components:
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ ...typo.h3, color: '#8B5CF6', marginBottom: '8px' }}>1. Phase Detector</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Compares the incoming data edges against the recovered clock to determine if sampling is early or late. Common types: Alexander (bang-bang) and Mueller-Muller (linear).
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '8px' }}>2. Loop Filter</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Smooths the phase error signal. The loop bandwidth determines how fast the CDR tracks jitter vs. how much high-frequency jitter it filters out.
                </p>
              </div>

              <div>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '8px' }}>3. Phase Interpolator / VCO</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Adjusts the sampling clock phase based on the filtered error. Phase interpolators are more common in modern designs as they offer fine phase resolution and digital control.
                </p>
              </div>
            </div>

            {/* Formula */}
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px', border: `1px solid ${colors.border}` }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Transition Density Requirement
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                The CDR can only correct its phase when it sees a data transition. The maximum time between transitions determines the minimum CDR bandwidth:
              </p>
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '16px', textAlign: 'center', fontFamily: 'monospace' }}>
                <span style={{ ...typo.h3, color: colors.textPrimary }}>
                  f_CDR_min = 1 / (N_max_run * T_bit)
                </span>
              </div>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '12px', margin: 0 }}>
                Where N_max_run is the maximum consecutive identical bits and T_bit is the bit period. Longer runs need lower CDR bandwidth, but that means slower tracking.
              </p>
            </div>

            <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>Key Insight</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                CDR is a <strong style={{ color: colors.textPrimary }}>trade-off between tracking ability and jitter filtering</strong>. Wide bandwidth tracks fast frequency changes but passes through jitter. Narrow bandwidth filters jitter but cannot follow fast wander. The encoding scheme determines how many transitions the CDR gets to work with.
              </p>
            </div>

            <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
              Explore Line Encoding →
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
      { id: 'a', text: '8b/10b doubles the data rate since it adds extra bits' },
      { id: 'b', text: '8b/10b guarantees transitions by limiting run length, making CDR lock reliable' },
      { id: 'c', text: '8b/10b eliminates jitter entirely through error correction' },
    ];

    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '84px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>Step {twistPredictStep + 1} of 2</span>
            </div>

            <div style={{ background: `${colors.warning}22`, borderRadius: '12px', padding: '16px', marginBottom: '24px', border: `1px solid ${colors.warning}44` }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>New Variable: Line Encoding</p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              NRZ data can have long runs of identical bits, starving the CDR of transitions. What does 8b/10b encoding do for clock recovery?
            </h2>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>📊</span>
                  <div>
                    <p style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600, margin: 0 }}>NRZ (No Return to Zero)</p>
                    <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>Raw bits - can have unlimited run length</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🔗</span>
                  <div>
                    <p style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600, margin: 0 }}>8b/10b</p>
                    <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>Maps 8 data bits to 10 coded bits (max run: 5)</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>⚡</span>
                  <div>
                    <p style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600, margin: 0 }}>Manchester</p>
                    <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>Transition every bit - guaranteed clock</p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button key={opt.id}
                  onClick={() => { playSound('click'); setTwistPrediction(opt.id); setTwistPredictStep(1); emitEvent('prediction_made', { twistPrediction: opt.id }); }}
                  style={{
                    background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                    border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                    borderRadius: '12px', padding: '16px 20px', textAlign: 'left',
                    cursor: 'pointer', transition: 'all 0.2s', minHeight: '44px',
                  }}>
                  <span style={{ display: 'inline-block', width: '28px', height: '28px', borderRadius: '50%',
                    background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                    color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center', lineHeight: '28px', marginRight: '12px', fontWeight: 700 }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.body }}>{opt.text}</span>
                </button>
              ))}
            </div>

            {twistPrediction && (
              <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
                Compare Encoding Schemes →
              </button>
            )}
          </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PLAY PHASE - Compare NRZ vs 8b10b vs Manchester
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '84px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              NRZ vs 8b/10b vs Manchester
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Switch encoding to see how each affects the eye diagram and transition density
            </p>

            {/* Encoding selector */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
              {(['NRZ', '8b10b', 'Manchester'] as const).map(enc => (
                <button key={enc}
                  onClick={() => { playSound('click'); setEncoding(enc); emitEvent('selection_made', { encoding: enc }); }}
                  style={{
                    padding: '12px 24px', borderRadius: '10px',
                    background: encoding === enc ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${encoding === enc ? colors.accent : colors.border}`,
                    color: encoding === enc ? colors.accent : colors.textSecondary,
                    cursor: 'pointer', fontWeight: 600, minHeight: '44px', fontSize: '15px',
                  }}>
                  {enc}
                </button>
              ))}
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '24px', alignItems: isMobile ? 'center' : 'flex-start' }}>
                {/* Visualization */}
                <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    {renderEyeDiagram(true)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {renderDataAndClock(false)}
                  </div>
                </div>

                {/* Controls */}
                <div style={{ width: isMobile ? '100%' : '260px', flexShrink: 0 }}>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Jitter (RMS)</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{jitterAmount} ps</span>
                    </div>
                    <input type="range" min="0" max="150" step="5" value={jitterAmount}
                      onChange={(e) => setJitterAmount(parseInt(e.target.value))}
                      onInput={(e) => setJitterAmount(parseInt((e.target as HTMLInputElement).value))}
                      style={sliderStyle} />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>CDR Bandwidth</span>
                      <span style={{ ...typo.small, color: '#8B5CF6', fontWeight: 600 }}>{cdrBandwidth} MHz</span>
                    </div>
                    <input type="range" min="1" max="10" step="1" value={cdrBandwidth}
                      onChange={(e) => setCdrBandwidth(parseInt(e.target.value))}
                      onInput={(e) => setCdrBandwidth(parseInt((e.target as HTMLInputElement).value))}
                      style={sliderStyle} />
                  </div>

                  {/* Encoding comparison */}
                  <div style={{ background: colors.bgSecondary, borderRadius: '10px', padding: '16px' }}>
                    <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '12px', fontWeight: 600 }}>
                      {encoding} Properties:
                    </h4>
                    {encoding === 'NRZ' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>Overhead: <strong style={{ color: colors.success }}>0%</strong></p>
                        <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>Max run: <strong style={{ color: colors.error }}>Unlimited</strong></p>
                        <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>DC balance: <strong style={{ color: colors.error }}>No</strong></p>
                        <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>Transition density: <strong style={{ color: colors.warning }}>Data-dependent</strong></p>
                      </div>
                    )}
                    {encoding === '8b10b' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>Overhead: <strong style={{ color: colors.warning }}>25%</strong></p>
                        <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>Max run: <strong style={{ color: colors.success }}>5 bits</strong></p>
                        <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>DC balance: <strong style={{ color: colors.success }}>Yes</strong></p>
                        <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>Transition density: <strong style={{ color: colors.success }}>Guaranteed high</strong></p>
                      </div>
                    )}
                    {encoding === 'Manchester' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>Overhead: <strong style={{ color: colors.error }}>100% (2x BW)</strong></p>
                        <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>Max run: <strong style={{ color: colors.success }}>1 bit</strong></p>
                        <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>DC balance: <strong style={{ color: colors.success }}>Yes</strong></p>
                        <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>Transition density: <strong style={{ color: colors.success }}>100%</strong></p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
              Understand Line Coding →
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
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '84px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Line Coding and DC Balance
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🔗</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>8b/10b: The Gold Standard</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Maps every 8-bit byte to a 10-bit symbol chosen to limit run length to 5 and maintain <span style={{ color: colors.accent }}>running disparity</span> (DC balance). Used in USB 3.0, SATA, Fibre Channel, and PCIe 1.0-2.0. The 25% overhead is the price for guaranteed CDR-friendly data.
                </p>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🔀</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>128b/130b + Scrambling</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  PCIe 3.0+ and USB 3.1+ switched to 128b/130b with a <span style={{ color: colors.warning }}>scrambler</span> that XORs data with a pseudo-random sequence. Only 1.5% overhead while statistically providing excellent transition density. The 2-bit sync header enables block alignment.
                </p>
              </div>

              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>⚖️</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Why DC Balance Matters</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Serial links use <span style={{ color: colors.success }}>AC coupling</span> (capacitors) to block DC and allow different supply voltages between TX and RX. Without DC balance, the signal baseline shifts through the coupling caps, closing the eye vertically and confusing the CDR threshold.
                </p>
              </div>

              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🎯</span>
                  <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>The Encoding Trade-off</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  More overhead = better CDR behavior (Manchester: 100% overhead, perfect CDR). Less overhead = higher efficiency but CDR must tolerate longer runs (128b/130b: 1.5% overhead, relies on scrambler). The choice depends on the data rate and channel characteristics.
                </p>
              </div>
            </div>

            <button onClick={() => { playSound('success'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
              See Real-World Applications →
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
        conceptName="Clock Recovery"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
          {renderNavBar()}
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '84px' }}>
            <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '24px' }}>{passed ? '🏆' : '📚'}</div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? "You've mastered Clock Recovery concepts!" : 'Review the concepts and try again.'}
              </p>

              {/* Rich Answer Key */}
              <div style={{ textAlign: 'left', marginBottom: '32px' }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>Answer Key:</h3>
                {testQuestions.map((q, idx) => {
                  const userAnswer = testAnswers[idx];
                  const correctOption = q.options.find(o => o.correct);
                  const correctAnswer = correctOption?.id;
                  const userOption = q.options.find(o => o.id === userAnswer);
                  const isCorrect = userAnswer === correctAnswer;
                  return (
                    <div key={idx} style={{
                      background: colors.bgCard, margin: '12px 0', padding: '16px', borderRadius: '10px',
                      borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ color: isCorrect ? colors.success : colors.error, fontSize: '18px', flexShrink: 0 }}>
                          {isCorrect ? '\u2713' : '\u2717'}
                        </span>
                        <span style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 600 }}>
                          Q{idx + 1}. {q.question}
                        </span>
                      </div>
                      {!isCorrect && (
                        <div style={{ marginLeft: '26px', marginBottom: '6px' }}>
                          <span style={{ color: colors.error, fontSize: '13px' }}>Your answer: </span>
                          <span style={{ color: colors.textMuted, fontSize: '13px' }}>{userOption?.label || 'No answer'}</span>
                        </div>
                      )}
                      <div style={{ marginLeft: '26px', marginBottom: '8px' }}>
                        <span style={{ color: colors.success, fontSize: '13px' }}>Correct: </span>
                        <span style={{ color: colors.textSecondary, fontSize: '13px' }}>{correctOption?.label}</span>
                      </div>
                      <div style={{ marginLeft: '26px', background: `${colors.warning}15`, padding: '8px 12px', borderRadius: '8px' }}>
                        <span style={{ color: colors.warning, fontSize: '12px', fontWeight: 600 }}>Why? </span>
                        <span style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.5' }}>{q.explanation}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {passed ? (
                <button onClick={() => { playSound('complete'); nextPhase(); }} style={{ ...primaryButtonStyle, width: '100%' }}>
                  Complete Lesson →
                </button>
              ) : (
                <button onClick={() => {
                  setTestSubmitted(false); setTestAnswers(Array(10).fill(null));
                  setCurrentQuestion(0); setTestScore(0); goToPhase('hook');
                }} style={{ ...primaryButtonStyle, width: '100%' }}>
                  Review & Try Again
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
      <div style={{ minHeight: '100dvh', background: colors.bgPrimary, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', paddingTop: '84px' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{ ...typo.body, color: colors.textSecondary, fontWeight: 600 }}>
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

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px', borderLeft: `3px solid ${colors.accent}` }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{question.scenario}</p>
            </div>

            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
              {question.question}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {question.options.map(opt => (
                <button key={opt.id}
                  onClick={() => { playSound('click'); const na = [...testAnswers]; na[currentQuestion] = opt.id; setTestAnswers(na); }}
                  style={{
                    background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '10px', padding: '14px 16px', textAlign: 'left',
                    cursor: 'pointer', minHeight: '44px',
                  }}>
                  <span style={{ display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%',
                    background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                    color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center', lineHeight: '24px', marginRight: '10px', fontSize: '12px', fontWeight: 700 }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.label}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              {currentQuestion > 0 && (
                <button onClick={() => setCurrentQuestion(currentQuestion - 1)} style={{ ...secondaryButtonStyle, flex: 1 }}>
                  Previous
                </button>
              )}
              {currentQuestion < 9 ? (
                <button
                  onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                  disabled={!testAnswers[currentQuestion]}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                    background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                    color: 'white', cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                    fontWeight: 600, minHeight: '44px',
                  }}>
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
                    emitEvent('game_completed', { score, total: 10 });
                    playSound(score >= 7 ? 'complete' : 'failure');
                  }}
                  disabled={testAnswers.some(a => a === null)}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '10px', border: 'none',
                    background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                    color: 'white', cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                    fontWeight: 600, minHeight: '44px',
                  }}>
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
      <div style={{ minHeight: '100dvh', background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`, display: 'flex', flexDirection: 'column' }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', paddingTop: '84px', textAlign: 'center' }}>
          <div style={{ fontSize: '100px', marginBottom: '24px', animation: 'bounce 1s infinite' }}>🏆</div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Clock Recovery Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '16px' }}>
            You now understand how receivers extract timing from serial data streams and why encoding schemes are critical for reliable communication.
          </p>

          <p style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Score: {testScore} / 10
          </p>

          <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '32px', maxWidth: '450px', width: '100%' }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>You Learned:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'CDR extracts clock from data transitions using a PLL',
                'Long runs of identical bits starve the CDR of transitions',
                'Eye diagrams visualize timing margin and signal quality',
                '8b/10b ensures transition density at 25% overhead cost',
                'Scrambling (128b/130b) provides statistical transitions at 1.5% overhead',
                'ISI creates deterministic jitter that closes the eye',
                'CDR bandwidth trades tracking speed vs jitter filtering',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>✓</span>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => goToPhase('hook')} style={secondaryButtonStyle}>
              Play Again
            </button>
            <button
              onClick={() => {
                playSound('complete');
                emitEvent('game_completed', { score: testScore, total: 10, mastery: true });
                onGameEvent?.({
                  eventType: 'achievement_unlocked',
                  gameType: 'clock_recovery',
                  gameTitle: 'Clock Recovery',
                  details: { type: 'mastery_achieved', score: testScore, total: 10 },
                  timestamp: Date.now()
                });
                window.location.href = '/games';
              }}
              style={{
                ...primaryButtonStyle,
                background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
              }}>
              Complete Game
            </button>
          </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  return null;
};

export default ClockRecoveryRenderer;
