'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// -----------------------------------------------------------------------------
// ELON GAME #22: OPTICAL LINK - Complete 10-Phase Game
// Fiber optic link budget — light attenuation through fiber, connectors,
// splices determines max reach and data rate
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

interface ELON_OpticalLinkRendererProps {
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
    scenario: "A network engineer is designing a 40km single-mode fiber link between two data centers. The fiber has a rated attenuation of 0.2 dB/km at 1550nm, with 4 connectors (0.5 dB each) and 2 fusion splices (0.1 dB each).",
    question: "What is the total optical loss budget for this link?",
    options: [
      { id: 'a', label: "8.0 dB — fiber loss only (40km x 0.2 dB/km)" },
      { id: 'b', label: "10.2 dB — fiber (8.0) + connectors (2.0) + splices (0.2)", correct: true },
      { id: 'c', label: "12.0 dB — using 0.3 dB/km for safety margin" },
      { id: 'd', label: "6.0 dB — attenuation decreases over distance" }
    ],
    explanation: "Total loss = fiber attenuation (40km x 0.2 dB/km = 8.0 dB) + connector losses (4 x 0.5 dB = 2.0 dB) + splice losses (2 x 0.1 dB = 0.2 dB) = 10.2 dB. Every component in the optical path adds loss that must be accounted for in the link budget."
  },
  {
    scenario: "A subsea cable operator is deploying EDFA (Erbium-Doped Fiber Amplifier) repeaters every 80km along a 6,400km transatlantic route. Each EDFA provides 20 dB of gain.",
    question: "Why can't the operator simply use fewer, more powerful amplifiers spaced further apart?",
    options: [
      { id: 'a', label: "Each EDFA adds ASE noise, but spacing them too far apart means the signal drops below the noise floor before amplification, destroying OSNR", correct: true },
      { id: 'b', label: "EDFAs can only amplify signals up to 20 dB regardless of design" },
      { id: 'c', label: "Fiber cannot carry signals beyond 80km under any circumstances" },
      { id: 'd', label: "More amplifiers are cheaper than fewer powerful ones" }
    ],
    explanation: "EDFAs amplify both signal and noise (ASE — Amplified Spontaneous Emission). If the signal attenuates too much before reaching an amplifier, the signal-to-noise ratio (OSNR) degrades irreversibly. Optimal spacing balances cost against OSNR preservation — the Shannon limit sets the fundamental capacity boundary."
  },
  {
    scenario: "A DWDM system is operating with 96 channels at 50GHz spacing in the C-band (1530-1565nm). The operator wants to double capacity to 192 channels.",
    question: "What is the primary challenge of doubling the DWDM channel count?",
    options: [
      { id: 'a', label: "Narrower channel spacing increases inter-channel crosstalk and nonlinear effects like four-wave mixing", correct: true },
      { id: 'b', label: "The C-band physically cannot support more than 96 wavelengths" },
      { id: 'c', label: "Each additional channel requires its own separate fiber" },
      { id: 'd', label: "Doubling channels halves the total bandwidth available" }
    ],
    explanation: "Reducing channel spacing from 50GHz to 25GHz increases susceptibility to inter-channel interference, four-wave mixing (FWM), cross-phase modulation (XPM), and other fiber nonlinearities. These effects become the dominant impairment in dense WDM systems, requiring advanced modulation formats like coherent detection with digital signal processing."
  },
  {
    scenario: "A fiber engineer measures an OTDR trace and finds a sharp spike at 2.3km followed by a gradual slope. The spike shows a 0.8 dB loss event.",
    question: "What does this OTDR trace most likely indicate?",
    options: [
      { id: 'a', label: "A mechanical splice or connector at 2.3km with higher-than-expected loss", correct: true },
      { id: 'b', label: "The fiber has been cut at 2.3km" },
      { id: 'c', label: "Normal fiber attenuation at that distance" },
      { id: 'd', label: "An EDFA amplifier location" }
    ],
    explanation: "OTDR (Optical Time Domain Reflectometer) traces show discrete loss events as spikes — connectors typically show 0.3-0.5 dB loss, mechanical splices 0.5-1.0 dB, and fusion splices 0.05-0.1 dB. A 0.8 dB spike suggests a mechanical splice or poorly mated connector. The gradual slope is normal fiber attenuation."
  },
  {
    scenario: "Starlink is deploying laser inter-satellite links (ISLs) between LEO satellites. These links operate in vacuum with no fiber, using free-space optical communication at 1550nm.",
    question: "Why do Starlink's laser ISLs have lower latency than terrestrial fiber for long distances?",
    options: [
      { id: 'a', label: "Light travels at c in vacuum but only 0.67c in fiber due to the refractive index of glass (n=1.47)", correct: true },
      { id: 'b', label: "Satellites are closer together than terrestrial fiber routes" },
      { id: 'c', label: "Laser light is inherently faster than LED-coupled fiber light" },
      { id: 'd', label: "Vacuum eliminates all forms of signal attenuation" }
    ],
    explanation: "Light in fiber travels at c/n where n~1.47 for silica glass, giving ~204,000 km/s vs 300,000 km/s in vacuum. For a London-Tokyo path, fiber follows land/undersea routes (~26,000km at 0.67c = 127ms) while satellites can route more directly through space (~9,000km at c = 30ms one-way). The 33% speed advantage plus shorter paths dramatically reduce latency."
  },
  {
    scenario: "A coherent optical transceiver is using DP-16QAM modulation on a 400G ZR+ pluggable module for a 120km metro link. The receiver sensitivity is -22 dBm.",
    question: "What does coherent detection provide that traditional direct detection (on-off keying) cannot?",
    options: [
      { id: 'a', label: "Coherent detection recovers amplitude, phase, and polarization information, enabling higher spectral efficiency and digital impairment compensation", correct: true },
      { id: 'b', label: "Coherent detection only works with single-mode fiber" },
      { id: 'c', label: "Coherent detection eliminates the need for amplifiers entirely" },
      { id: 'd', label: "Coherent detection uses less power than direct detection" }
    ],
    explanation: "Coherent detection uses a local oscillator laser to recover the full electric field (amplitude + phase) in both polarizations. This enables: higher-order modulation (16QAM, 64QAM), digital compensation of chromatic dispersion and PMD, higher receiver sensitivity, and spectral efficiency approaching the Shannon limit — enabling 400G-800G per wavelength."
  },
  {
    scenario: "A data center operator is choosing between single-mode and multimode fiber for a new 100m rack-to-rack connection carrying 400GbE.",
    question: "Why might the operator choose single-mode fiber despite the shorter distance?",
    options: [
      { id: 'a', label: "Single-mode supports higher bandwidth-distance products and future upgrade paths to 800G/1.6T without recabling", correct: true },
      { id: 'b', label: "Single-mode fiber is always cheaper than multimode" },
      { id: 'c', label: "Multimode fiber cannot carry 400GbE at any distance" },
      { id: 'd', label: "Single-mode has lower bend radius requirements" }
    ],
    explanation: "While multimode (OM4/OM5) can support 400GbE at 100m using parallel optics (SR8/SR4.2), single-mode offers effectively unlimited bandwidth over short distances, supports coherent optics for future 800G/1.6T upgrades, and the cost premium of single-mode transceivers has narrowed significantly. Many hyperscalers now deploy single-mode even inside data centers."
  },
  {
    scenario: "An OSNR measurement on a long-haul DWDM link shows 18 dB after 12 amplifier spans. The system requires minimum 15 dB OSNR for BER < 10^-15 with soft-decision FEC.",
    question: "What happens to OSNR as the number of amplifier spans increases?",
    options: [
      { id: 'a', label: "OSNR degrades by approximately 3 dB each time the number of spans doubles, because ASE noise accumulates linearly", correct: true },
      { id: 'b', label: "OSNR stays constant because each EDFA restores the signal" },
      { id: 'c', label: "OSNR improves with more amplifiers since each one boosts the signal" },
      { id: 'd', label: "OSNR only depends on the transmitter power, not the number of spans" }
    ],
    explanation: "Each EDFA adds ASE (Amplified Spontaneous Emission) noise. With N spans, total ASE noise is N times single-span noise: OSNR_total = OSNR_single_span - 10*log10(N). Doubling spans from 12 to 24 reduces OSNR by 10*log10(2) = 3 dB. This fundamental relationship limits reach and is why Raman amplification and optimized span design matter."
  },
  {
    scenario: "A fiber installer is preparing a connector endface and measures the return loss at -35 dB using an APC (Angled Physical Contact) connector versus -14 dB for a flat-polished connector.",
    question: "Why is high return loss (low back-reflection) important in optical systems?",
    options: [
      { id: 'a', label: "Back-reflections destabilize laser sources, cause multi-path interference, and degrade transmitter performance, especially for analog and coherent systems", correct: true },
      { id: 'b', label: "Back-reflections only matter for multimode fiber systems" },
      { id: 'c', label: "Return loss has no effect on system performance" },
      { id: 'd', label: "High return loss increases the power available at the receiver" }
    ],
    explanation: "Back-reflections (low return loss) feed light back into the laser cavity, causing intensity noise (RIN), wavelength instability, and mode hopping. APC connectors angle the endface 8 degrees so reflections exit the fiber core. This is critical for coherent systems, CATV analog links, and any application sensitive to multi-path interference. Target: >45 dB return loss for modern systems."
  },
  {
    scenario: "PAM4 (4-level Pulse Amplitude Modulation) is used in 400GBASE-DR4 transceivers, transmitting 2 bits per symbol instead of NRZ's 1 bit per symbol at the same baud rate.",
    question: "What is the primary trade-off of using PAM4 instead of NRZ (on-off keying)?",
    options: [
      { id: 'a', label: "PAM4 doubles spectral efficiency but requires ~5 dB better SNR because the eye diagram has three smaller eyes instead of one large one", correct: true },
      { id: 'b', label: "PAM4 requires twice the bandwidth of NRZ" },
      { id: 'c', label: "PAM4 can only work over multimode fiber" },
      { id: 'd', label: "PAM4 halves the data rate compared to NRZ" }
    ],
    explanation: "PAM4 encodes 2 bits per symbol using 4 amplitude levels, doubling bit rate at the same baud rate. However, the 3 eye openings are each 1/3 the height of NRZ's single eye, requiring approximately 10*log10(3^2/1) ≈ 9.5 dB better SNR ideally, though practical implementations need ~5 dB more. This limits PAM4 reach compared to NRZ at the same bit rate, making FEC essential."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u{1F30A}',
    title: 'Google Grace Hopper Subsea Cable',
    short: 'Connecting the US and UK via 6,000km of undersea fiber',
    tagline: 'Content delivery at the speed of light — under the Atlantic',
    description: 'Google\'s Grace Hopper submarine cable spans 6,250km from New York to Bude, England and Bilbao, Spain. It uses 16 fiber pairs with wavelength-selective switching, enabling dynamic capacity allocation between landing points. Each fiber pair carries up to 350 Tbps using coherent DWDM technology with 20+ Tbps per fiber pair, representing a generational leap in subsea cable design.',
    connection: 'The link budget for a 6,250km subsea cable is extraordinary: fiber attenuation alone is ~1,250 dB (0.2 dB/km), requiring approximately 78 EDFA repeaters spaced every 80km. Each repeater must precisely compensate span loss while minimizing accumulated ASE noise to maintain OSNR above the Shannon limit threshold.',
    howItWorks: 'Grace Hopper uses novel fiber-switching architecture at branching units, allowing Google to dynamically route wavelengths between the UK and Spain landings based on demand. Coherent 400G transponders with soft-decision FEC operate near the Shannon limit at ~5 bits/s/Hz spectral efficiency.',
    stats: [
      { value: '6,250km', label: 'Cable Length', icon: '\u{1F30D}' },
      { value: '350 Tbps', label: 'Total Capacity', icon: '\u26A1' },
      { value: '78', label: 'EDFA Repeaters', icon: '\u{1F504}' }
    ],
    examples: ['Coherent DWDM at 400G per wavelength', 'Wavelength-selective branching units', 'EDFA chains maintaining OSNR over 6,000km', 'Soft-decision FEC near Shannon limit'],
    companies: ['Google', 'SubCom', 'TE SubCom', 'Alcatel Submarine Networks'],
    futureImpact: 'Next-generation subsea cables will use space-division multiplexing (SDM) with multi-core fibers to break the capacity ceiling, potentially reaching petabit-scale throughput per cable.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F6F0}\uFE0F',
    title: 'Starlink Laser Inter-Satellite Links',
    short: 'Free-space optical communication between LEO satellites',
    tagline: 'Light-speed networking in the vacuum of space',
    description: 'SpaceX\'s Starlink constellation uses laser inter-satellite links (ISLs) to create a mesh network in orbit. Each satellite connects to 4 neighbors using 1550nm lasers through free-space optical terminals. Unlike terrestrial fiber, these links operate in vacuum where light travels at c (not 0.67c as in glass), offering lower latency than any undersea cable for intercontinental routes.',
    connection: 'Starlink ISLs face a unique link budget: no fiber attenuation, but enormous free-space path loss due to beam divergence over 2,000+ km distances. Pointing accuracy of microradians is required — a 1 microradian error at 2,000km means missing the target by 2 meters. The power budget is dominated by geometric spreading loss rather than material absorption.',
    howItWorks: 'Each ISL terminal uses a fine-pointing mirror system with sub-microradian accuracy, acquisition/tracking cameras, and a high-power 1550nm laser. Data rates exceed 100 Gbps per link. The mesh topology allows traffic to hop across multiple satellites, routing around Earth\'s curvature faster than terrestrial fiber paths.',
    stats: [
      { value: '100+ Gbps', label: 'Per-Link Capacity', icon: '\u{1F4E1}' },
      { value: '4 links', label: 'Per Satellite', icon: '\u{1F517}' },
      { value: '<1 \u00B5rad', label: 'Pointing Accuracy', icon: '\u{1F3AF}' }
    ],
    examples: ['Free-space optical terminals', 'Sub-microradian beam steering', 'Vacuum propagation at speed of light', 'Mesh topology across orbital shell'],
    companies: ['SpaceX', 'Mynaric', 'CACI (SA Photonics)', 'Tesat-Spacecom'],
    futureImpact: 'Optical ISLs will enable a space-based internet backbone that offers lower latency than terrestrial networks for long-haul routes, transforming high-frequency trading, gaming, and real-time global communication.',
    color: '#8B5CF6'
  },
  {
    icon: '\u{1F310}',
    title: 'Meta Transatlantic Cable',
    short: 'Meta\'s investment in private subsea fiber infrastructure',
    tagline: 'Social networking at submarine scale',
    description: 'Meta (formerly Facebook) has invested billions in subsea cable infrastructure, including the 2Africa cable — the longest subsea cable ever at 45,000km, circling the entire African continent with branches to Europe and the Middle East. Using open cable designs with 16 fiber pairs and spatial-division multiplexing ready architecture, 2Africa can deliver up to 180 Tbps of capacity.',
    connection: 'The 2Africa cable demonstrates the optical link budget at extreme scale: with up to 45,000km of fiber and hundreds of EDFA repeaters, managing accumulated noise and nonlinear impairments requires cutting-edge fiber types (large effective area), optimized amplifier gain profiles, and advanced DSP algorithms at coherent receivers.',
    howItWorks: 'Meta uses open submarine cable architecture where the wet plant (cable + repeaters) is decoupled from terminal equipment, allowing technology upgrades without replacing the cable. SDM-ready fiber pairs support future capacity expansion through higher-order modulation as transponder technology improves.',
    stats: [
      { value: '45,000km', label: 'Total Length', icon: '\u{1F30D}' },
      { value: '180 Tbps', label: 'Design Capacity', icon: '\u{1F680}' },
      { value: '46', label: 'Landing Points', icon: '\u{1F4CD}' }
    ],
    examples: ['Open cable architecture', 'Large effective area fiber', 'Branching units for regional access', 'SDM-ready design for future upgrades'],
    companies: ['Meta', 'Alcatel Submarine Networks', 'Nokia', 'Infinera'],
    futureImpact: 'Open cable designs democratize subsea capacity, enabling content providers to upgrade terminal equipment independently and pushing coherent technology to its theoretical limits across the longest optical paths.',
    color: '#10B981'
  },
  {
    icon: '\u{1F3E2}',
    title: 'Equinix CrossConnect Short-Reach',
    short: 'Ultra-short fiber links inside carrier-neutral data centers',
    tagline: 'Where microseconds and microwatts matter',
    description: 'Inside Equinix\'s carrier-neutral data centers, CrossConnect services link customers through fiber patch panels spanning meters to hundreds of meters. These ultra-short links carry terabits of traffic between cloud providers, content delivery networks, financial exchanges, and enterprise networks. At these distances, the link budget is dominated by connector losses rather than fiber attenuation — a 10m fiber adds only 0.002 dB of loss, but two connectors add 0.6 dB.',
    connection: 'Short-reach optical links flip the link budget equation: fiber attenuation is negligible, but connector quality, transceiver specifications, and modal bandwidth (for multimode) become the limiting factors. With 800GbE and 1.6TbE transceivers, even short-reach links push the boundaries of PAM4 and coherent-lite modulation.',
    howItWorks: 'CrossConnects use pre-terminated fiber patch cables with ultra-low-loss connectors (UPC or APC polish). Single-mode fibers support any speed, while OM4/OM5 multimode supports up to 400GbE with parallel optics (SR8). The business model charges per cross-connect, making fiber the physical handshake of the internet.',
    stats: [
      { value: '440K+', label: 'CrossConnects', icon: '\u{1F517}' },
      { value: '<0.01dB', label: 'Fiber Loss (10m)', icon: '\u{1F4C9}' },
      { value: '800G', label: 'Max Per Port', icon: '\u26A1' }
    ],
    examples: ['Ultra-low-loss LC connectors', 'Parallel optics (PSM4, SR8)', 'MPO/MTP ribbon fiber assemblies', 'Automated fiber management systems'],
    companies: ['Equinix', 'Digital Realty', 'CoreSite', 'QTS Realty'],
    futureImpact: 'Co-packaged optics and silicon photonics will embed optical transceivers directly into switch ASICs, eliminating pluggable modules and enabling 51.2 Tbps switches with integrated photonic I/O.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_OpticalLinkRenderer: React.FC<ELON_OpticalLinkRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [fiberLengthKm, setFiberLengthKm] = useState(500);
  const [animFrame, setAnimFrame] = useState(0);

  // Twist phase - DWDM channels
  const [dwdmChannels, setDwdmChannels] = useState(1);

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
// Animation loop for photon pulse
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimFrame(f => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Optical link simulation calculations
  const fiberAttenuationDbPerKm = 0.2;
  const connectorLossDb = 0.5;
  const numConnectors = 4;
  const spliceLossDb = 0.1;
  const numSplicesPerKm = 0.05; // 1 splice per 20km
  const txPowerDbm = 6; // Laser transmitter power
  const rxSensitivityDbm = -28; // Receiver sensitivity
  const edfaGainDb = 25;
  const edfaNoiseDb = 5.5;
  const edfaSpacing = 80; // km

  const calculateLinkBudget = (lengthKm: number) => {
    const fiberLoss = lengthKm * fiberAttenuationDbPerKm;
    const connLoss = numConnectors * connectorLossDb;
    const numSplices = Math.max(1, Math.floor(lengthKm * numSplicesPerKm));
    const spliceLoss = numSplices * spliceLossDb;
    const totalLoss = fiberLoss + connLoss + spliceLoss;
    const numEdfas = Math.max(0, Math.floor(lengthKm / edfaSpacing) - 1);
    const edfaTotalGain = numEdfas * edfaGainDb;
    const edfaTotalNoise = numEdfas * edfaNoiseDb;
    const rxPower = txPowerDbm - totalLoss + edfaTotalGain;
    const margin = rxPower - rxSensitivityDbm;
    const osnrDb = Math.max(0, txPowerDbm - edfaTotalNoise + 58 - 10 * Math.log10(Math.max(1, numEdfas)));
    const shannonCapacityGbps = Math.max(0, 50 * Math.log2(1 + Math.pow(10, osnrDb / 10)));
    return { fiberLoss, connLoss, spliceLoss, totalLoss, numEdfas, edfaTotalGain, edfaTotalNoise, rxPower, margin, osnrDb, shannonCapacityGbps, numSplices };
  };

  const calculateDwdmCapacity = (lengthKm: number, channels: number) => {
    const base = calculateLinkBudget(lengthKm);
    const nonlinearPenaltyDb = channels > 16 ? 0.5 * Math.log2(channels / 16) : 0;
    const fwmPenalty = channels > 32 ? 1.5 * Math.log2(channels / 32) : 0;
    const effectiveOsnr = Math.max(0, base.osnrDb - nonlinearPenaltyDb - fwmPenalty);
    const perChannelGbps = Math.max(0, 50 * Math.log2(1 + Math.pow(10, effectiveOsnr / 10)));
    const totalCapacityTbps = (perChannelGbps * channels) / 1000;
    return { ...base, channels, nonlinearPenaltyDb, fwmPenalty, effectiveOsnr, perChannelGbps, totalCapacityTbps };
  };

  const linkBudget = calculateLinkBudget(fiberLengthKm);
  const dwdmBudget = calculateDwdmCapacity(fiberLengthKm, dwdmChannels);

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
    laser: '#EF4444',
    fiber: '#3B82F6',
    signal: '#10B981',
    amplifier: '#8B5CF6',
    noise: '#F59E0B',
    connector: '#06B6D4',
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
        gameType: 'optical-link',
        gameTitle: 'Optical Link',
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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.error})`,
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
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.error})`,
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

  // Optical Link SVG Visualization — fiber path with loss points
  const OpticalLinkVisualization = ({ showDwdm }: { showDwdm?: boolean }) => {
    const width = isMobile ? 340 : 520;
    const height = 380;
    const pathY = 120;
    const powerChartTop = 200;
    const powerChartBot = 350;
    const chartLeft = 45;
    const chartRight = width - 20;
    const chartW = chartRight - chartLeft;

    const powerPoints: string[] = [];
    const noisePoints: string[] = [];
    const steps = 100;
    const effectiveChannels = showDwdm ? dwdmChannels : 1;

    for (let i = 0; i <= steps; i++) {
      const dist = (i / steps) * fiberLengthKm;
      const x = chartLeft + (i / steps) * chartW;
      const fLoss = dist * fiberAttenuationDbPerKm;
      const cLoss = numConnectors * connectorLossDb * (i / steps);
      const sLoss = Math.floor(dist * numSplicesPerKm) * spliceLossDb;
      const numAmps = Math.max(0, Math.floor(dist / edfaSpacing));
      const ampGain = numAmps * edfaGainDb;
      const ampNoise = numAmps * edfaNoiseDb;
      const nlPenalty = effectiveChannels > 16 ? 0.5 * Math.log2(effectiveChannels / 16) * (dist / fiberLengthKm) : 0;

      let power = txPowerDbm - fLoss - cLoss - sLoss + ampGain - nlPenalty;
      power = Math.max(-20, Math.min(10, power));

      const noiseLevel = numAmps > 0 ? -58 + ampNoise + 10 * Math.log10(Math.max(1, numAmps)) : -58;
      const clampedNoise = Math.max(-20, Math.min(10, noiseLevel));

      const powerY = powerChartBot - (((power + 20) / 30) * (powerChartBot - powerChartTop));
      const noiseY = powerChartBot - (((clampedNoise + 20) / 30) * (powerChartBot - powerChartTop));
      powerPoints.push(`${x} ${Math.max(powerChartTop, Math.min(powerChartBot, powerY))}`);
      noisePoints.push(`${x} ${Math.max(powerChartTop, Math.min(powerChartBot, noiseY))}`);
    }

    const photonPos = (animFrame % 120) / 120;
    const photonX = chartLeft + photonPos * chartW;

    const laserX = chartLeft + 5;
    const spoolX = chartLeft + chartW * 0.15;
    const splice1X = chartLeft + chartW * 0.30;
    const connectorX = chartLeft + chartW * 0.45;
    const wdmX = chartLeft + chartW * 0.58;
    const edfaX = chartLeft + chartW * 0.73;
    const splice2X = chartLeft + chartW * 0.85;
    const receiverX = chartRight - 10;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: width }}
       role="img" aria-label="E L O N_ Optical Link visualization">
        <defs>
          <linearGradient id="fiberGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.laser} />
            <stop offset="50%" stopColor={colors.fiber} />
            <stop offset="100%" stopColor={colors.signal} />
          </linearGradient>
          <linearGradient id="powerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.signal} />
            <stop offset="100%" stopColor={colors.error} />
          </linearGradient>
          <linearGradient id="noiseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.noise} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.noise} stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="amplifierGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.amplifier} stopOpacity="0.5" />
            <stop offset="100%" stopColor={colors.amplifier} stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="laserGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.laser} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.laser} stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="osnrFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.signal} stopOpacity="0.15" />
            <stop offset="100%" stopColor={colors.signal} stopOpacity="0.02" />
          </linearGradient>
          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="laserBeam" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width / 2} y={20} fill={colors.textPrimary} fontSize="13" fontWeight="700" textAnchor="middle">
          Optical Link Budget — {fiberLengthKm >= 1000 ? `${(fiberLengthKm / 1000).toFixed(1)}k` : fiberLengthKm}km Fiber
          {showDwdm && dwdmChannels > 1 ? ` | ${dwdmChannels}ch DWDM` : ''}
        </text>

        {/* Fiber path background */}
        <path
          d={`M ${laserX} ${pathY} L ${receiverX} ${pathY}`}
          stroke={colors.fiber}
          strokeWidth="4"
          strokeOpacity="0.15"
          fill="none"
        />

        {/* Active fiber path with signal */}
        <path
          d={`M ${laserX} ${pathY} L ${receiverX} ${pathY}`}
          stroke="url(#fiberGrad)"
          strokeWidth="3"
          fill="none"
          strokeDasharray="8,4"
        />

        {/* Laser Transmitter */}
        <rect x={laserX - 12} y={pathY - 20} width="24" height="40" rx="4" fill={colors.laser} opacity="0.25" stroke={colors.laser} strokeWidth="1.5" />
        <circle cx={laserX} cy={pathY} r="6" fill={colors.laser} />
        <text x={laserX} y={pathY - 26} fill={colors.laser} fontSize="11" fontWeight="600" textAnchor="middle">TX</text>
        <text x={laserX} y={pathY + 38} fill={colors.textMuted} fontSize="11" textAnchor="middle">Laser</text>
        <text x={laserX} y={pathY + 52} fill={colors.textMuted} fontSize="11" textAnchor="middle">{txPowerDbm}dBm</text>

        {/* Fiber Spool */}
        <ellipse cx={spoolX} cy={pathY} rx="14" ry="18" fill="none" stroke={colors.fiber} strokeWidth="1.5" opacity="0.5" />
        <ellipse cx={spoolX} cy={pathY} rx="8" ry="12" fill="none" stroke={colors.fiber} strokeWidth="1" opacity="0.3" />
        <circle cx={spoolX} cy={pathY} r="6" fill={colors.fiber} />
        <text x={spoolX} y={pathY - 26} fill={colors.fiber} fontSize="11" fontWeight="600" textAnchor="middle">Fiber</text>
        <text x={spoolX} y={pathY + 38} fill={colors.textMuted} fontSize="11" textAnchor="middle">0.2dB/km</text>

        {/* Splice Point 1 */}
        <line x1={splice1X - 6} y1={pathY - 8} x2={splice1X + 6} y2={pathY + 8} stroke={colors.connector} strokeWidth="2" />
        <line x1={splice1X + 6} y1={pathY - 8} x2={splice1X - 6} y2={pathY + 8} stroke={colors.connector} strokeWidth="2" />
        <circle cx={splice1X} cy={pathY} r="7" fill={colors.connector} opacity="0.8" />
        <text x={splice1X} y={pathY - 18} fill={colors.connector} fontSize="11" fontWeight="600" textAnchor="middle">Splice</text>
        <text x={splice1X} y={pathY + 38} fill={colors.textMuted} fontSize="11" textAnchor="middle">0.1dB</text>

        {/* Connector */}
        <rect x={connectorX - 8} y={pathY - 14} width="16" height="28" rx="3" fill={colors.connector} opacity="0.2" stroke={colors.connector} strokeWidth="1.5" />
        <circle cx={connectorX} cy={pathY} r="6" fill={colors.connector} />
        <text x={connectorX} y={pathY - 20} fill={colors.connector} fontSize="11" fontWeight="600" textAnchor="middle">Conn</text>
        <text x={connectorX} y={pathY + 38} fill={colors.textMuted} fontSize="11" textAnchor="middle">0.5dB</text>

        {/* WDM Mux */}
        <rect x={wdmX - 14} y={pathY - 22} width="28" height="44" rx="5" fill={colors.warning} opacity="0.15" stroke={colors.warning} strokeWidth="1.5" />
        {showDwdm && dwdmChannels > 1 ? (
          <>
            {[0, 1, 2].map(i => (
              <line key={`wdm-${i}`} x1={wdmX - 10} y1={pathY - 12 + i * 12} x2={wdmX + 10} y2={pathY - 12 + i * 12} stroke={colors.warning} strokeWidth="1" opacity="0.5" />
            ))}
          </>
        ) : null}
        <circle cx={wdmX} cy={pathY} r="7" fill={colors.warning} />
        <text x={wdmX} y={pathY - 28} fill={colors.warning} fontSize="11" fontWeight="600" textAnchor="middle">WDM</text>
        <text x={wdmX} y={pathY + 38} fill={colors.textMuted} fontSize="11" textAnchor="middle">{showDwdm ? `${dwdmChannels}ch` : 'Mux'}</text>

        {/* EDFA Amplifier */}
        <polygon
          points={`${edfaX-16},${pathY+16} ${edfaX},${pathY-18} ${edfaX+16},${pathY+16}`}
          fill={colors.amplifier}
          opacity="0.2"
          stroke={colors.amplifier}
          strokeWidth="1.5"
        />
        <circle cx={edfaX} cy={pathY} r="8" fill={colors.amplifier} />
        <text x={edfaX} y={pathY + 3} fill="white" fontSize="11" fontWeight="700" textAnchor="middle">A</text>
        <text x={edfaX} y={pathY - 24} fill={colors.amplifier} fontSize="11" fontWeight="600" textAnchor="middle">EDFA</text>
        <text x={edfaX} y={pathY + 38} fill={colors.textMuted} fontSize="11" textAnchor="middle">+{edfaGainDb}dB</text>

        {/* Splice Point 2 */}
        <line x1={splice2X - 5} y1={pathY - 7} x2={splice2X + 5} y2={pathY + 7} stroke={colors.connector} strokeWidth="2" />
        <line x1={splice2X + 5} y1={pathY - 7} x2={splice2X - 5} y2={pathY + 7} stroke={colors.connector} strokeWidth="2" />
        <circle cx={splice2X} cy={pathY} r="6" fill={colors.connector} opacity="0.8" />
        <text x={splice2X} y={pathY - 18} fill={colors.connector} fontSize="11" fontWeight="600" textAnchor="middle">Splice</text>

        {/* Receiver */}
        <rect x={receiverX - 12} y={pathY - 20} width="24" height="40" rx="4" fill={colors.signal} opacity="0.25" stroke={colors.signal} strokeWidth="1.5" />
        <circle cx={receiverX} cy={pathY} r="7" fill={colors.signal} />
        <text x={receiverX} y={pathY - 26} fill={colors.signal} fontSize="11" fontWeight="600" textAnchor="middle">RX</text>
        <text x={receiverX} y={pathY + 38} fill={colors.textMuted} fontSize="11" textAnchor="middle">Receiver</text>
        <text x={receiverX} y={pathY + 52} fill={colors.textMuted} fontSize="11" textAnchor="middle">{rxSensitivityDbm}dBm</text>

        {/* Animated photon pulse */}
        <circle
          cx={photonX}
          cy={pathY}
          r="4"
          fill={colors.laser}
          opacity={0.6 + 0.4 * Math.sin(animFrame * 0.2)}
          filter="url(#laserBeam)"
        />
        <circle
          cx={photonX - 15}
          cy={pathY}
          r="3"
          fill={colors.laser}
          opacity={0.3 + 0.2 * Math.sin(animFrame * 0.2 + 1)}
          filter="url(#softGlow)"
        />

        {/* Loss arrows */}
        {[splice1X, connectorX, splice2X].map((x, i) => (
          <g key={`loss-${i}`}>
            <line x1={x} y1={pathY + 20} x2={x} y2={pathY + 30} stroke={colors.error} strokeWidth="1.5" opacity="0.6" />
            <line x1={x} y1={pathY + 30} x2={x - 3} y2={pathY + 26} stroke={colors.error} strokeWidth="1.5" opacity="0.6" />
            <line x1={x} y1={pathY + 30} x2={x + 3} y2={pathY + 26} stroke={colors.error} strokeWidth="1.5" opacity="0.6" />
          </g>
        ))}

        {/* Section divider */}
        <line x1={chartLeft} y1={powerChartTop - 15} x2={chartRight} y2={powerChartTop - 15} stroke={colors.border} strokeWidth="1" />
        <text x={width / 2} y={powerChartTop - 3} fill={colors.textPrimary} fontSize="11" fontWeight="600" textAnchor="middle">Power Level Along Fiber (dBm)</text>

        {/* Power chart grid lines */}
        {[-20, -15, -10, -5, 0, 5, 10].map(dbm => {
          const y = powerChartBot - (((dbm + 20) / 30) * (powerChartBot - powerChartTop));
          return (
            <g key={`pgrid-${dbm}`}>
              <line x1={chartLeft} y1={y} x2={chartRight} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
              <text x={chartLeft - 5} y={y + 3} fill={colors.textMuted} fontSize="11" textAnchor="end">{dbm}</text>
            </g>
          );
        })}

        {/* Receiver sensitivity line */}
        {(() => {
          const rxY = powerChartBot - (((rxSensitivityDbm + 20) / 30) * (powerChartBot - powerChartTop));
          return (
            <>
              <line x1={chartLeft} y1={rxY} x2={chartRight} y2={rxY} stroke={colors.error} strokeWidth="1" strokeDasharray="6,3" opacity="0.5" />
              <text x={chartRight + 2} y={rxY + 3} fill={colors.error} fontSize="11" opacity="0.7">RX min</text>
            </>
          );
        })()}

        {/* OSNR fill between power and noise */}
        <polygon
          points={`${powerPoints.join(' ')} ${[...noisePoints].reverse().join(' ')}`}
          fill="url(#osnrFill)"
          stroke="none"
        />

        {/* Signal power line */}
        <path
          d={"M " + powerPoints.join(" L ")}
          stroke="url(#powerGrad)"
          fill="none"
          strokeWidth="2.5"
        />

        {/* Noise floor line */}
        <polyline
          points={noisePoints.join(" ")}
          stroke="url(#noiseGrad)"
          fill="none"
          strokeWidth="1.5"
          strokeDasharray="4,3"
        />

        {/* Power level indicator at end */}
        <circle
          cx={chartRight}
          cy={Math.max(powerChartTop, Math.min(powerChartBot, powerChartBot - (((Math.max(-20, Math.min(10, linkBudget.osnrDb - 30)) + 20) / 30) * (powerChartBot - powerChartTop))))}
          r="6"
          fill={linkBudget.margin > 0 ? colors.signal : colors.error}
          stroke="white"
          strokeWidth="2"
          filter="url(#glowFilter)"
        />

        {/* Legend */}
        <g>
          <rect x={chartLeft} y={height - 25} width="10" height="10" rx="2" fill={colors.signal} />
          <text x={chartLeft + 14} y={height - 16} fill={colors.textMuted} fontSize="11">Signal</text>
          <rect x={chartLeft + 55} y={height - 25} width="10" height="10" rx="2" fill={colors.noise} opacity="0.5" />
          <text x={chartLeft + 69} y={height - 16} fill={colors.textMuted} fontSize="11">Noise</text>
          <circle cx={chartLeft + 120} cy={height - 20} r="4" fill={colors.error} />
          <text x={chartLeft + 128} y={height - 16} fill={colors.textMuted} fontSize="11">RX Min</text>
          <circle cx={chartLeft + 178} cy={height - 20} r="4" fill={colors.amplifier} />
          <text x={chartLeft + 186} y={height - 16} fill={colors.textMuted} fontSize="11">EDFA</text>
        </g>
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
            marginBottom: '20px',
            animation: 'pulse 2s infinite',
          }}>
            {'\uD83D\uDD26\uD83C\uDF10'}
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Optical Link
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            {"Every YouTube video, every financial trade, every cloud backup travels as "}
            <span style={{ color: colors.accent }}>photons through glass fibers</span>
            {" thinner than a human hair. But light fades with distance — connectors, splices, and the fiber itself steal precious photons. The link budget determines whether your signal arrives or vanishes into noise."}
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
              "The optical fiber is the closest thing we have to a perfect waveguide. At 0.2 dB/km loss in the 1550nm window, a photon can travel 100km and still have 1% of its original power. Nothing else in engineering comes close to this efficiency of information transport."
            </p>
            <p style={{ ...typo.small, color: 'rgba(148, 163, 184, 0.7)', marginTop: '8px' }}>
              - Optical Communications Engineering
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
      { id: 'a', text: 'Signal strength stays constant — fiber is lossless' },
      { id: 'b', text: 'Signal drops linearly at 0.2 dB/km, requiring amplifiers for long links' },
      { id: 'c', text: 'Signal gets stronger over distance due to stimulated emission' },
      { id: 'd', text: 'Signal only degrades at connector and splice points, not in the fiber itself' },
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

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              A laser launches +6 dBm of optical power into a 200km single-mode fiber. What happens to the signal along the way?
            </h2>

            {/* Static SVG showing fiber concept */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="predictFiberGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.laser} />
                    <stop offset="100%" stopColor={colors.signal} />
                  </linearGradient>
                  <linearGradient id="predictPowerGrad" x1="0%" y1="100%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={colors.signal} />
                    <stop offset="100%" stopColor={colors.error} />
                  </linearGradient>
                  <filter id="predictGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">200km Fiber Link</text>
                <rect x="30" y="45" width="40" height="30" rx="4" fill={colors.laser} opacity="0.3" stroke={colors.laser} strokeWidth="1" />
                <circle cx="50" cy="60" r="8" fill={colors.laser} filter="url(#predictGlow)" />
                <text x="50" y="90" textAnchor="middle" fill={colors.laser} fontSize="11" fontWeight="600">+6 dBm</text>
                <path d="M 70 60 L 330 60" stroke="url(#predictFiberGrad)" strokeWidth="3" fill="none" strokeDasharray="6,3" />
                <text x="200" y="50" textAnchor="middle" fill={colors.fiber} fontSize="11">200 km single-mode fiber</text>
                <rect x="330" y="45" width="40" height="30" rx="4" fill={colors.signal} opacity="0.3" stroke={colors.signal} strokeWidth="1" />
                <text x="350" y="66" textAnchor="middle" fill={colors.accent} fontSize="16" fontWeight="700">???</text>
                <text x="350" y="90" textAnchor="middle" fill={colors.textMuted} fontSize="11">? dBm</text>
                <text x="200" y="120" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="600">Fiber attenuation: 0.2 dB/km at 1550nm</text>
                <text x="200" y="145" textAnchor="middle" fill={colors.accent} fontSize="14" fontWeight="700">What happens to the optical signal?</text>
                <text x="200" y="170" textAnchor="middle" fill={colors.textMuted} fontSize="11">Total fiber loss = 200km x 0.2 dB/km = ???</text>
                <text x="200" y="190" textAnchor="middle" fill={colors.textMuted} fontSize="11">Connectors, splices, and amplifiers also affect the budget</text>
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

  // PLAY PHASE - Optical Link Budget Simulator
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
              Optical Link Budget Simulator
            </h2>

            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.success }}>Why This Matters:</strong> Every optical link must be carefully budgeted. The transmitter launches a fixed power, and every kilometer of fiber, every connector, and every splice steals photons. If the received power drops below the receiver sensitivity, the link fails. EDFA amplifiers can boost the signal but also add noise.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.textPrimary }}>Fiber Attenuation (0.2 dB/km)</strong> is the rate at which optical power decreases in standard single-mode fiber at 1550nm wavelength.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                <strong style={{ color: colors.accent }}>EDFA (Erbium-Doped Fiber Amplifier)</strong> boosts optical signals by +25 dB but adds ASE noise that limits total reach.
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.error }}>Link Budget</strong> is defined as the accounting of all gains and losses: P = P_tx - total_loss, calculated to determine if received power exceeds minimum sensitivity.
              </p>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              Adjust the fiber length slider to see how loss accumulates over distance. Watch the power level decrease at each loss point — fiber attenuation, connector losses, and splice losses all contribute. Notice when EDFAs become necessary and how the noise floor rises with each amplifier. When you increase the fiber length, total loss increases because each additional kilometer causes 0.2 dB of attenuation, which leads to lower received power.
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
                    <OpticalLinkVisualization />
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Fiber Distance</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {fiberLengthKm >= 1000 ? `${(fiberLengthKm / 1000).toFixed(1)}k km` : `${fiberLengthKm} km`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10000"
                      value={fiberLengthKm}
                      onChange={(e) => setFiberLengthKm(parseInt(e.target.value))}
                      onInput={(e) => setFiberLengthKm(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Fiber Length in Kilometers"
                      style={sliderStyle(colors.accent, fiberLengthKm, 1, 10000)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>100m (Data Center)</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>500km</span>
                      <span style={{ ...typo.small, color: colors.accent }}>10,000km (Subsea)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Power stats grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
              }}>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: colors.error }}>{linkBudget.totalLoss.toFixed(1)} dB</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Total Loss</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: linkBudget.margin > 0 ? colors.signal : colors.error }}>
                    {linkBudget.rxPower.toFixed(1)} dBm
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>RX Power</div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.h3, color: linkBudget.margin > 3 ? colors.signal : linkBudget.margin > 0 ? colors.warning : colors.error }}>
                    {linkBudget.margin.toFixed(1)} dB
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Margin</div>
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
              The Physics of Optical Loss
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              {prediction === 'b'
                ? 'Correct! Your prediction was right — optical power decreases at 0.2 dB/km in standard single-mode fiber, requiring amplifiers for distances beyond about 100km. This attenuation is caused by Rayleigh scattering and material absorption in the silica glass.'
                : 'As you observed in the simulator, the optical signal loses power continuously along the fiber at 0.2 dB/km. Over 200km, that is 40 dB of loss — the signal becomes 10,000 times weaker. Without amplifiers, the signal would be completely undetectable.'}
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>P_received = P_transmitted - L_fiber - L_connectors - L_splices + G_amplifiers</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  The <span style={{ color: colors.accent }}>link budget equation</span> accounts for every source of loss and gain. Fiber attenuation at <span style={{ color: colors.fiber }}>1550nm</span> is minimized to 0.2 dB/km — this wavelength sits at the <span style={{ color: colors.signal }}>minimum absorption window</span> of silica glass, where both Rayleigh scattering (which decreases with wavelength) and infrared absorption (which increases) are at their combined minimum.
                </p>
                <p style={{ fontFamily: 'monospace', color: colors.accent }}>
                  {'OSNR = P_tx - L_span - NF_EDFA - 10*log10(N_spans) - 10*log10(h*v*B_ref)'}
                </p>
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                  Where NF is the EDFA noise figure, N is span count, h is Planck's constant, v is optical frequency, and B_ref is the reference bandwidth.
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
                Wavelength Windows
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Fiber optics uses specific wavelength windows: the O-band (1310nm) for short-reach with zero dispersion, and the C-band (1530-1565nm) for long-haul with minimum attenuation. The L-band (1565-1625nm) extends capacity. These windows exist because silica glass has absorption peaks from water ions (OH-) between them, creating transmission valleys that define modern telecom wavelengths.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Loss Budget Components
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { name: 'Fiber', value: '0.2 dB/km', desc: 'Rayleigh scatter' },
                  { name: 'Connector', value: '0.3-0.5 dB', desc: 'Per mating' },
                  { name: 'Fusion Splice', value: '0.05-0.1 dB', desc: 'Per joint' },
                  { name: 'EDFA Gain', value: '+20-30 dB', desc: 'Per amplifier' },
                  { name: 'EDFA NF', value: '4-6 dB', desc: 'Noise penalty' },
                  { name: 'Margin', value: '3-6 dB', desc: 'Safety buffer' },
                ].map(item => (
                  <div key={item.name} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>{item.name}</div>
                    <div style={{ ...typo.h3, color: colors.accent }}>{item.value}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{item.desc}</div>
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
      { id: 'a', text: 'Capacity scales linearly — 96 channels gives 96x the throughput with no penalty' },
      { id: 'b', text: 'Capacity increases but nonlinear effects like four-wave mixing emerge, limiting gains' },
      { id: 'c', text: 'Adding channels reduces total capacity because they interfere destructively' },
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
                New Variable: DWDM Channel Count
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              Increasing from 1 to 96 DWDM wavelength channels on the same fiber — what happens to total capacity?
            </h2>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: 400 }}>
                <defs>
                  <linearGradient id="twistDwdmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.laser} />
                    <stop offset="25%" stopColor={colors.warning} />
                    <stop offset="50%" stopColor={colors.signal} />
                    <stop offset="75%" stopColor={colors.fiber} />
                    <stop offset="100%" stopColor={colors.amplifier} />
                  </linearGradient>
                  <filter id="twistGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {[colors.laser, colors.warning, colors.signal, colors.fiber, colors.amplifier].map((c, i) => (
                  <line key={`wl-${i}`} x1="70" y1={25 + i * 8} x2="330" y2={25 + i * 8} stroke={c} strokeWidth="2" opacity="0.5" />
                ))}
                <text x="200" y="18" textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="700">DWDM: Many Wavelengths, One Fiber</text>
                <rect x="60" y="70" width="280" height="12" rx="6" fill="url(#twistDwdmGrad)" opacity="0.3" stroke={colors.fiber} strokeWidth="1" />
                <text x="200" y="79" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Single Fiber Strand</text>
                <text x="200" y="105" textAnchor="middle" fill={colors.accent} fontSize="13" fontWeight="700">1 channel = 100 Gbps... 96 channels = ???</text>
                <text x="200" y="125" textAnchor="middle" fill={colors.textMuted} fontSize="11">Do nonlinear effects limit the scaling?</text>
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
                See DWDM Effect
              </button>
            )}
          </div>
          {renderNavDots()}
        </NavigationBar>
      </div>
    );
  }

  // TWIST PLAY PHASE - DWDM Channel Simulator
  if (phase === 'twist_play') {
    const singleChBudget = calculateDwdmCapacity(fiberLengthKm, 1);
    const multiChBudget = calculateDwdmCapacity(fiberLengthKm, dwdmChannels);

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
              DWDM Channel Scaling
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Add DWDM channels to multiply capacity — but watch for nonlinear effects at high channel counts.
            </p>

            <div style={{ background: `${colors.accent}11`, border: `1px solid ${colors.accent}33`, borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <p style={{ ...typo.body, color: colors.textSecondary, lineHeight: '1.6' }}><strong style={{ color: colors.accent }}>What you're seeing:</strong> The visualization shows how adding more DWDM wavelength channels increases total fiber capacity, while the power chart reveals growing nonlinear penalties at higher channel counts.</p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginTop: '12px', lineHeight: '1.6' }}><strong style={{ color: colors.success }}>Cause and Effect:</strong> When you increase the DWDM channel count, total throughput rises but four-wave mixing and cross-phase modulation degrade per-channel OSNR, creating a diminishing-returns curve that limits practical capacity.</p>
            </div>

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
                    <OpticalLinkVisualization showDwdm={true} />
                  </div>
                </div>

                {/* Right: Controls panel */}
                <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>DWDM Channels</span>
                      <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{dwdmChannels} channels</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="96"
                      value={dwdmChannels}
                      onChange={(e) => setDwdmChannels(parseInt(e.target.value))}
                      onInput={(e) => setDwdmChannels(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="DWDM Channel Count"
                      style={sliderStyle(colors.warning, dwdmChannels, 1, 96)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>1 (Single)</span>
                      <span style={{ ...typo.small, color: colors.warning }}>48</span>
                      <span style={{ ...typo.small, color: colors.warning }}>96 (Dense)</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Fiber Length</span>
                      <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                        {fiberLengthKm >= 1000 ? `${(fiberLengthKm / 1000).toFixed(1)}k km` : `${fiberLengthKm} km`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10000"
                      value={fiberLengthKm}
                      onChange={(e) => setFiberLengthKm(parseInt(e.target.value))}
                      onInput={(e) => setFiberLengthKm(parseInt((e.target as HTMLInputElement).value))}
                      aria-label="Fiber Length in Kilometers"
                      style={sliderStyle(colors.accent, fiberLengthKm, 1, 10000)}
                    />
                  </div>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginBottom: '20px',
              }}>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Single Channel</div>
                  <div style={{ ...typo.h3, color: colors.signal }}>
                    {singleChBudget.perChannelGbps.toFixed(0)} Gbps
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>
                    OSNR: {singleChBudget.effectiveOsnr.toFixed(1)} dB
                  </div>
                </div>
                <div style={{ background: colors.bgSecondary, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>{dwdmChannels}ch DWDM</div>
                  <div style={{ ...typo.h3, color: colors.warning }}>
                    {multiChBudget.totalCapacityTbps.toFixed(1)} Tbps
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>
                    OSNR: {multiChBudget.effectiveOsnr.toFixed(1)} dB
                  </div>
                </div>
              </div>

              {dwdmChannels > 16 && (
                <div style={{
                  background: `${colors.warning}22`,
                  border: `1px solid ${colors.warning}`,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <p style={{ ...typo.body, color: colors.warning, fontWeight: 700, margin: 0 }}>
                    Nonlinear Penalty: {multiChBudget.nonlinearPenaltyDb.toFixed(1)} dB | FWM Penalty: {multiChBudget.fwmPenalty.toFixed(1)} dB
                  </p>
                  <p style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>
                    Four-wave mixing and cross-phase modulation increase with channel count, reducing per-channel OSNR and limiting total throughput
                  </p>
                </div>
              )}
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
              Understand DWDM Impact
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
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px', textAlign: 'center' }}>
              DWDM: Capacity Meets Nonlinearity
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>How DWDM Multiplies Capacity</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Dense Wavelength Division Multiplexing (DWDM) sends multiple wavelengths of light simultaneously through a single fiber — each wavelength carries an independent data stream. The C-band (1530-1565nm) supports up to 96 channels at 50GHz spacing or 48 channels at 100GHz spacing. Each channel can carry 100G-800G depending on the modulation format, giving a single fiber pair throughput exceeding 50 Tbps.
                </p>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Nonlinear Barrier</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Silica fiber has a tiny but significant nonlinear refractive index (n2). When many high-power channels propagate together, they interact through: Four-Wave Mixing (FWM) — channels mix to generate spurious frequencies that interfere with neighbors, Cross-Phase Modulation (XPM) — one channel's intensity modulates the phase of others, and Self-Phase Modulation (SPM) — a channel distorts its own phase. These effects worsen with more channels and higher per-channel power, creating a fundamental trade-off between capacity and reach.
                </p>
              </div>
              <div style={{ background: `${colors.success}11`, borderRadius: '12px', padding: '20px', border: `1px solid ${colors.success}33` }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Shannon Limit</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Claude Shannon's channel capacity theorem sets the ultimate limit: C = B * log2(1 + SNR). For optical fiber, this means there is a maximum number of bits per second per Hertz (spectral efficiency) determined by the signal-to-noise ratio. Modern coherent systems with DP-16QAM and soft-decision FEC achieve ~5-6 bits/s/Hz, approaching the practical Shannon limit for long-haul fiber. Beyond this, only more fiber pairs, new wavelength bands (L-band, S-band), or multi-core/multi-mode fibers can increase total capacity.
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
        conceptName="E L O N_ Optical Link"
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
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '20px', fontWeight: 600 }}>
              Application {completedApps.filter(c => c).length + 1} of {realWorldApps.length}
            </p>

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
                      setSelectedApp(idx);
                      // Auto-advance to next uncompleted app or to test phase
                      const nextUncompleted = newCompleted.findIndex((c, i) => !c && i !== idx);
                      if (nextUncompleted === -1) {
                        // All apps completed, auto-advance to test
                        setTimeout(() => goToPhase('test'), 400);
                      } else {
                        setSelectedApp(nextUncompleted);
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
            paddingTop: '60px',
            paddingBottom: '16px',
            paddingLeft: '24px',
            paddingRight: '24px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '20px' }}>
                {passed ? '\uD83C\uDFC6' : '\uD83D\uDCDA'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
                {passed ? 'You understand optical link budgets, fiber attenuation, DWDM capacity, and the Shannon limit!' : 'Review the concepts and try again.'}
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
              Knowledge Test: Optical Link
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '20px' }}>
              Apply your understanding of optical loss budgets, fiber attenuation, EDFA amplification, OSNR, coherent detection, DWDM, and the Shannon limit to real-world optical networking scenarios. Consider how each component contributes to overall system performance.
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
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

            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
              {question.question}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
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
          <div style={{ fontSize: '100px', marginBottom: '20px', animation: 'bounce 1s infinite' }}>
            {'\uD83C\uDFC6'}
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Optical Link Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand how light travels through fiber, why link budgets determine reach, how EDFA amplifiers extend distance at the cost of noise, and how DWDM multiplies capacity while battling nonlinear effects.
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
                'Fiber attenuation: 0.2 dB/km at 1550nm wavelength',
                'Link budget: TX power - losses + gains >= RX sensitivity',
                'EDFAs amplify signal but add cumulative ASE noise',
                'DWDM multiplies capacity with nonlinear trade-offs',
                'Shannon limit bounds spectral efficiency at any OSNR',
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

export default ELON_OpticalLinkRenderer;
