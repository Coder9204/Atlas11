'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// -----------------------------------------------------------------------------
// ELON SPACE COMMS - Game #23 of 36 ELON Games
// Space communication link budget — why deep space data rates are so low.
// Antenna size, power, distance affect throughput.
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

interface Props {
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
    setTimeout(() => audioContext.close(), 1000);
  } catch { /* Audio not available */ }
};

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// about free-space path loss, antenna gain, noise temperature, Eb/N0, coding
// gain, DSN, Ka/X/S band
// -----------------------------------------------------------------------------
const testQuestions: {
  scenario: string;
  question: string;
  options: { id: string; label: string; correct?: boolean }[];
  explanation: string;
}[] = [
  {
    scenario: 'A spacecraft transmitter at Mars (225 million km average distance) sends data at X-band (8.4 GHz). The free-space path loss increases with the square of both distance and frequency.',
    question: 'If you double the distance from Earth, what happens to the received signal power?',
    options: [
      { id: 'a', label: 'It drops by half (2x weaker)' },
      { id: 'b', label: 'It drops by a factor of 4 (inverse-square law)', correct: true },
      { id: 'c', label: 'It drops by a factor of 8' },
      { id: 'd', label: 'It stays the same if the antenna is big enough' }
    ],
    explanation: 'Free-space path loss follows the inverse-square law: power drops as 1/d². Doubling the distance means the signal spreads over 4x the area, so received power is 1/4 as strong. This is why deep space communication is so challenging.'
  },
  {
    scenario: 'NASA\'s Deep Space Network uses 70-meter dish antennas. Antenna gain is proportional to the square of the dish diameter divided by the wavelength: G = (pi*D/lambda)².',
    question: 'If you double the diameter of a DSN antenna from 34m to 70m (roughly 2x), how much does the gain increase?',
    options: [
      { id: 'a', label: 'About 2x (linear with diameter)' },
      { id: 'b', label: 'About 4x (6 dB improvement)', correct: true },
      { id: 'c', label: 'About 8x (cubic relationship)' },
      { id: 'd', label: 'No change - gain depends only on frequency' }
    ],
    explanation: 'Antenna gain scales as D². Doubling the diameter gives 4x the gain (about +6 dB). This is why NASA invested in 70m dishes — the extra diameter provides crucial extra gain for deep space missions.'
  },
  {
    scenario: 'The system noise temperature of a deep space receiver includes contributions from the antenna, low-noise amplifier (LNA), atmosphere, and cosmic microwave background.',
    question: 'Why do DSN receivers cool their LNAs to cryogenic temperatures (~15 K)?',
    options: [
      { id: 'a', label: 'To prevent thermal expansion of the electronics' },
      { id: 'b', label: 'To reduce thermal noise, which directly limits the minimum detectable signal', correct: true },
      { id: 'c', label: 'To increase the operating frequency' },
      { id: 'd', label: 'To prevent condensation on the antenna dish' }
    ],
    explanation: 'Thermal noise power is proportional to temperature (N = kTB). By cooling the LNA to ~15 K, the system noise temperature drops dramatically, allowing detection of incredibly weak signals. At Voyager distances, every kelvin matters.'
  },
  {
    scenario: 'A link budget calculation shows Eb/N0 (energy per bit over noise spectral density) of 3 dB at the receiver. The required Eb/N0 for a BER of 10⁻⁵ with BPSK is about 9.6 dB.',
    question: 'What does this negative link margin mean for the communication link?',
    options: [
      { id: 'a', label: 'The link works fine with margin to spare' },
      { id: 'b', label: 'The bit error rate will be unacceptably high; the link needs more power, gain, or lower data rate', correct: true },
      { id: 'c', label: 'The signal is too strong and will saturate the receiver' },
      { id: 'd', label: 'The frequency is wrong and needs to be changed' }
    ],
    explanation: 'Eb/N0 of 3 dB is 6.6 dB below the required 9.6 dB. This means the link cannot sustain the planned data rate at acceptable error rates. Solutions include: lowering data rate (fewer bits = more energy per bit), increasing transmit power, or using a larger antenna.'
  },
  {
    scenario: 'Voyager 1 uses a turbo-code-like concatenated coding scheme. Without coding, it would need Eb/N0 ≈ 10 dB. With coding, it needs only about 2-3 dB.',
    question: 'What is the "coding gain" in this system?',
    options: [
      { id: 'a', label: 'About 2-3 dB' },
      { id: 'b', label: 'About 7-8 dB — coding lets weak signals be decoded correctly', correct: true },
      { id: 'c', label: 'About 20 dB — coding always provides massive gains' },
      { id: 'd', label: 'Coding gain is zero; it only helps with interference' }
    ],
    explanation: 'Coding gain = required Eb/N0 without coding minus required Eb/N0 with coding ≈ 10 - 2.5 = 7.5 dB. This ~7 dB gain is like multiplying transmit power by 5x, all achieved through clever mathematics. Modern LDPC and turbo codes approach the Shannon limit.'
  },
  {
    scenario: 'The DSN has three ground station complexes: Goldstone (California), Madrid (Spain), and Canberra (Australia), each separated by roughly 120 degrees of longitude.',
    question: 'Why are the stations placed at these specific locations around the globe?',
    options: [
      { id: 'a', label: 'To ensure continuous 24-hour coverage as Earth rotates — a spacecraft is always visible from at least one site', correct: true },
      { id: 'b', label: 'To triangulate spacecraft positions using signal timing' },
      { id: 'c', label: 'Because those locations have the lowest atmospheric interference' },
      { id: 'd', label: 'For political reasons — one per allied country' }
    ],
    explanation: 'As Earth rotates, a spacecraft rises and sets at each DSN complex. With 120-degree separation, a handoff occurs seamlessly so at least one station always has line-of-sight. This ensures uninterrupted communication with missions throughout the solar system.'
  },
  {
    scenario: 'Deep space missions use different frequency bands: S-band (~2.3 GHz), X-band (~8.4 GHz), and Ka-band (~32 GHz). Higher frequencies allow more bandwidth but have higher atmospheric losses.',
    question: 'Why are newer missions shifting from X-band to Ka-band despite atmospheric challenges?',
    options: [
      { id: 'a', label: 'Ka-band is cheaper to produce' },
      { id: 'b', label: 'Ka-band allows higher data rates because bandwidth is proportional to frequency, and antenna gain increases with frequency', correct: true },
      { id: 'c', label: 'Ka-band penetrates atmospheres of other planets better' },
      { id: 'd', label: 'X-band is being phased out internationally' }
    ],
    explanation: 'At Ka-band (32 GHz), the same antenna produces 4x the gain of X-band (8.4 GHz) since gain scales as f². More available bandwidth also enables higher data rates. The trade-off is greater sensitivity to rain and atmospheric water vapor, requiring weather-diverse ground networks.'
  },
  {
    scenario: 'Mars Reconnaissance Orbiter transmits at 6 Mbps from Mars using a 3-meter high-gain antenna and 100W transmitter at X-band. You want to achieve the same data rate from Saturn (10x farther).',
    question: 'What change would be needed to maintain 6 Mbps from Saturn\'s distance?',
    options: [
      { id: 'a', label: 'Increase transmit power by 10x to 1000W' },
      { id: 'b', label: 'Increase transmit power by 100x or equivalently increase antenna area by 100x (due to inverse-square law)', correct: true },
      { id: 'c', label: 'Just use a slightly larger antenna (4m instead of 3m)' },
      { id: 'd', label: 'Switch to S-band for better penetration' }
    ],
    explanation: 'At 10x the distance, the path loss increases by 10² = 100x (20 dB). To compensate, you need 100x more EIRP — either 100x the power (10,000W, impractical for spacecraft) or 10x the antenna diameter (30m dish), or some combination. This is why outer planet data rates are so low.'
  },
  {
    scenario: 'The Shannon-Hartley theorem states that channel capacity C = B × log2(1 + S/N), where B is bandwidth and S/N is signal-to-noise ratio.',
    question: 'A deep space link has S/N = 0.01 (very weak signal, typical of deep space). What does the theorem predict?',
    options: [
      { id: 'a', label: 'Communication is impossible below S/N = 1' },
      { id: 'b', label: 'You can still communicate at a very low data rate — Shannon says you can trade bandwidth for rate when S/N is low', correct: true },
      { id: 'c', label: 'Only analog signals can be sent below S/N = 1' },
      { id: 'd', label: 'The channel capacity is exactly zero' }
    ],
    explanation: 'Shannon proved that reliable communication is possible even when S/N < 1 (the signal is below the noise floor!). The capacity C ≈ B × S/N × 1.44 bits/s when S/N is small. Deep space links exploit this by spreading energy across a wide bandwidth and using powerful error-correcting codes.'
  },
  {
    scenario: 'NASA\'s DSOC (Deep Space Optical Communications) experiment on the Psyche spacecraft demonstrated laser communication from 31 million km, achieving 267 Mbps — about 10-100x better than RF at the same distance.',
    question: 'What is the primary engineering challenge of optical (laser) deep space communication?',
    options: [
      { id: 'a', label: 'Lasers cannot work in vacuum' },
      { id: 'b', label: 'Pointing accuracy of micro-arc-seconds is required, and clouds/atmosphere can block the beam', correct: true },
      { id: 'c', label: 'Optical frequencies are too high to carry data' },
      { id: 'd', label: 'Optical links use more power than RF' }
    ],
    explanation: 'Laser beams are far narrower than RF beams — giving enormous gain but requiring micro-arc-second pointing accuracy (like hitting a dime from 30 km). Additionally, clouds scatter/absorb the beam, requiring multiple ground stations with weather diversity. Despite these challenges, optical offers 10-100x data rate improvements.'
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps: {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  howItWorks: string;
  stats: { value: string; label: string; icon: string }[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}[] = [
  {
    icon: '🔭',
    title: 'NASA DSOC',
    short: 'DSOC Laser Demo',
    tagline: 'First deep space laser communication — 10-100x faster than radio',
    description: 'NASA\'s Deep Space Optical Communications (DSOC) experiment on the Psyche spacecraft demonstrated laser communication from 31 million km, achieving 267 Mbps. This technology will revolutionize deep space data return, enabling high-definition video from Mars and beyond.',
    connection: 'DSOC proves that by switching from RF to optical wavelengths, the same-size aperture produces millions of times more gain. The link budget fundamentally changes when wavelength shrinks from centimeters to micrometers.',
    howItWorks: 'A 22-cm space telescope transmits a 1550nm laser beam to a 5.1m ground telescope at Palomar Observatory. Superconducting nanowire detectors count individual photons. Adaptive optics correct for atmospheric turbulence.',
    stats: [
      { value: '267Mbps', label: 'from 31M km', icon: '🚀' },
      { value: 'Psyche', label: 'mission', icon: '☄️' },
      { value: 'laser', label: 'demo technology', icon: '🔭' }
    ],
    examples: ['Psyche mission (asteroid belt)', 'Artemis Moon relay', 'Mars orbital relay network', 'Europa Clipper data return'],
    companies: ['NASA JPL', 'MIT Lincoln Lab', 'CNES', 'ESA'],
    futureImpact: 'Laser communication will enable streaming HD video from Mars, high-resolution mapping of outer planet moons, and eventually support human mission communication needs.',
    color: '#8B5CF6'
  },
  {
    icon: '🔴',
    title: 'Mars Reconnaissance Orbiter',
    short: 'MRO Mars Link',
    tagline: 'The workhorse relay delivering Mars surface data to Earth',
    description: 'Mars Reconnaissance Orbiter has returned more data than all other Mars missions combined. Using a 3-meter high-gain antenna and 100W X-band transmitter, it achieves up to 6 Mbps from Mars — the fastest RF link from another planet. It serves as a relay satellite for surface rovers.',
    connection: 'MRO\'s link budget is a textbook example: 100W transmitter + 3m dish + 70m DSN receiver + turbo coding squeeze every possible bit through the inverse-square law barrier at Mars distance.',
    howItWorks: 'MRO\'s 3m HGA (high-gain antenna) provides ~46 dBi gain at X-band. Combined with 100W transmit power, the 70m DSN dishes receive the signal after ~225 million km of free-space loss (~275 dB). Turbo coding provides ~7 dB coding gain.',
    stats: [
      { value: '6Mbps', label: 'from Mars', icon: '📡' },
      { value: '3m', label: 'dish diameter', icon: '📏' },
      { value: 'X-band', label: '8.4 GHz', icon: '📻' }
    ],
    examples: ['HiRISE camera data relay', 'Curiosity rover uplink', 'Perseverance relay', 'Mars weather monitoring'],
    companies: ['NASA JPL', 'Lockheed Martin', 'Ball Aerospace', 'Raytheon'],
    futureImpact: 'Next-generation Mars orbiters will use Ka-band and optical links to support human exploration communication needs, achieving 100+ Mbps from Mars orbit.',
    color: '#EF4444'
  },
  {
    icon: '🛸',
    title: 'Voyager 1',
    short: 'Voyager Deep Space',
    tagline: 'Humanity\'s farthest communicator — 24 billion km and still talking',
    description: 'Voyager 1, launched in 1977, transmits at just 160 bits per second from 24 billion km away using a 23-watt transmitter and 3.7m dish. Its signal arrives at Earth 20 billion times weaker than a watch battery. The 70m DSN antennas can still detect this whisper across interstellar space.',
    connection: 'Voyager\'s link budget is the ultimate demonstration of the inverse-square law. At 24 billion km, the free-space path loss exceeds 310 dB. Only the combination of DSN\'s 70m dishes, cryogenic receivers, and advanced coding makes communication possible at all.',
    howItWorks: 'Voyager\'s 23W X-band signal travels 22+ hours to reach Earth. The 70m DSN dishes collect the energy spread over a sphere of 24 billion km radius. Signal integration, coding, and noise cancellation extract 160 bps from a signal power of ~10⁻²⁰ watts.',
    stats: [
      { value: '160bps', label: 'data rate', icon: '📊' },
      { value: '24B km', label: 'distance', icon: '🌌' },
      { value: '70m', label: 'DSN antenna', icon: '📡' }
    ],
    examples: ['Interstellar plasma measurements', 'Heliosphere boundary data', 'Cosmic ray counts', 'Magnetic field readings'],
    companies: ['NASA JPL', 'Caltech', 'Applied Physics Lab', 'NRAO'],
    futureImpact: 'Voyager will lose the ability to power any instrument by ~2025-2030. Future interstellar probes (Breakthrough Starshot) will use laser propulsion and optical communication from light-year distances.',
    color: '#3B82F6'
  },
  {
    icon: '🛰️',
    title: 'Starlink LEO Advantage',
    short: 'Starlink LEO Comms',
    tagline: 'Thousands of satellites at 550km — the inverse-square law works in your favor',
    description: 'SpaceX\'s Starlink constellation operates at ~550 km altitude, about 1000x closer than geostationary satellites (36,000 km). By the inverse-square law, a LEO satellite delivers 1,000,000x (60 dB) more signal power than a GEO satellite with the same transmitter, enabling low-latency broadband.',
    connection: 'The link budget advantage of LEO vs GEO is dramatic: (36000/550)² ≈ 4,300x more received power. This allows smaller antennas, lower power, and lower latency (20ms vs 600ms round trip), making consumer-grade ground terminals practical.',
    howItWorks: 'Starlink satellites use phased array antennas and Ku/Ka-band to create steerable beams. Each satellite serves a moving spot on Earth\'s surface. Inter-satellite laser links relay data between satellites, reducing the need for ground stations.',
    stats: [
      { value: '20ms', label: 'latency', icon: '⚡' },
      { value: 'LEO', label: '550km orbit', icon: '🌍' },
      { value: 'vs 600ms', label: 'GEO latency', icon: '🕐' }
    ],
    examples: ['Rural broadband delivery', 'Maritime connectivity', 'Aviation in-flight WiFi', 'Military tactical comms'],
    companies: ['SpaceX', 'Amazon Kuiper', 'OneWeb', 'Telesat'],
    futureImpact: 'LEO mega-constellations will provide ubiquitous global connectivity. Direct-to-cell satellite links (Starlink V2) will eliminate dead zones entirely, connecting every phone on Earth.',
    color: '#10B981'
  }
];

// -----------------------------------------------------------------------------
// Phase type and labels
// -----------------------------------------------------------------------------
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

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

// -----------------------------------------------------------------------------
// Distance presets for the link budget simulator (log scale)
// -----------------------------------------------------------------------------
interface DistancePreset {
  name: string;
  distanceKm: number;
  typicalRate: string;
  description: string;
}

const distancePresets: DistancePreset[] = [
  { name: 'LEO (ISS)', distanceKm: 400, typicalRate: '300 Mbps', description: 'Low Earth Orbit' },
  { name: 'GEO', distanceKm: 36000, typicalRate: '100 Mbps', description: 'Geostationary' },
  { name: 'Moon', distanceKm: 384400, typicalRate: '20 Mbps', description: 'Lunar distance' },
  { name: 'Mars (close)', distanceKm: 55000000, typicalRate: '6 Mbps', description: 'Mars opposition' },
  { name: 'Mars (avg)', distanceKm: 225000000, typicalRate: '2 Mbps', description: 'Mars average' },
  { name: 'Jupiter', distanceKm: 600000000, typicalRate: '25 kbps', description: 'Jupiter distance' },
  { name: 'Saturn', distanceKm: 1400000000, typicalRate: '5 kbps', description: 'Saturn distance' },
  { name: 'Pluto', distanceKm: 5900000000, typicalRate: '1 kbps', description: 'Pluto at closest' },
  { name: 'Voyager 1', distanceKm: 24000000000, typicalRate: '160 bps', description: 'Interstellar space' },
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ELON_SpaceCommsRenderer: React.FC<Props> = ({ onGameEvent, gamePhase }) => {
  // State
  const validPhases: Phase[] = ['hook','predict','play','review','twist_predict','twist_play','twist_review','transfer','test','mastery'];
  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  };
  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state - distance in km on log scale
  const [distanceLog, setDistanceLog] = useState(5.6); // log10(km), 5.6 ~ 400,000 km ≈ Moon
  const [antennaDiameter, setAntennaDiameter] = useState(65); // meters (DSN)
  const [transmitPower, setTransmitPower] = useState(23); // watts

  // Twist state - optical vs RF
  const [useOptical, setUseOptical] = useState(false);
  const [twistDistance, setTwistDistance] = useState(7.5); // log10(km), ~31M km

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState<number | null>(0);
  const [completedApps, setCompletedApps] = useState([false, false, false, false]);

  const isNavigating = useRef(false);
  const distSliderRef = useRef(null);

  // Colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#3B82F6',
    accentGlow: 'rgba(59, 130, 246, 0.5)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#a8b8c8',
    border: '#2a2a3a',
    signal: '#7DE8F2',
    space: '#1E1B4B',
    laser: '#8B5CF6',
  };

  // Typography
  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Sync external gamePhase
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Fire game_started on mount
  useEffect(() => {
    onGameEvent?.({
      eventType: 'game_started',
      gameType: 'elon_space_comms',
      gameTitle: 'Space Comms',
      details: {},
      timestamp: Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Emit event helper
  const emitEvent = useCallback(
    (eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
      onGameEvent?.({
        eventType,
        gameType: 'elon_space_comms',
        gameTitle: 'Space Comms',
        details,
        timestamp: Date.now(),
      });
    },
    [onGameEvent]
  );

  // Navigation
  const goToPhase = useCallback(
    (newPhase: Phase) => {
      if (isNavigating.current) return;
      isNavigating.current = true;
      playSound('transition');
      emitEvent('phase_changed', { from: phase, to: newPhase });
      setPhase(newPhase);
      setTimeout(() => { isNavigating.current = false; }, 300);
    },
    [phase, emitEvent]
  );

  const nextPhase = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase]);

  // --------------------------------------------------------------------------
  // Link budget calculations
  // --------------------------------------------------------------------------
  const c = 3e8; // speed of light m/s
  const freq = 8.4e9; // X-band Hz
  const wavelength = c / freq;
  const laserWavelength = 1.55e-6; // 1550nm

  // Free-space path loss in dB: FSPL = 20*log10(4*pi*d/lambda)
  const calcFSPL = (distKm: number, wl: number): number => {
    const distM = distKm * 1000;
    return 20 * Math.log10((4 * Math.PI * distM) / wl);
  };

  // Antenna gain in dBi: G = 10*log10( (pi*D/lambda)^2 * eta )
  const calcAntennaGain = (diameterM: number, wl: number, efficiency: number = 0.55): number => {
    const gain = efficiency * Math.pow((Math.PI * diameterM) / wl, 2);
    return 10 * Math.log10(gain);
  };

  // Data rate estimation (simplified link budget)
  const calcDataRate = (distKm: number, antDiam: number, txPowerW: number, optical: boolean = false): number => {
    const wl = optical ? laserWavelength : wavelength;
    const fspl = calcFSPL(distKm, wl);
    const txGain = calcAntennaGain(optical ? 0.22 : 3.7, wl); // spacecraft antenna
    const rxGain = calcAntennaGain(antDiam, wl);
    const txPowerdBW = 10 * Math.log10(txPowerW);
    const systemNoise = optical ? 10 : 20; // dB noise figure estimate
    const codingGain = 7.5; // dB
    const requiredEbN0 = 2.5; // dB with turbo/LDPC coding
    const boltzmann = -228.6; // dBW/K/Hz

    // received power = tx power + tx gain + rx gain - fspl
    const rxPower = txPowerdBW + txGain + rxGain - fspl;
    // C/N0 = rxPower - noise
    const cn0 = rxPower - boltzmann - 10 * Math.log10(optical ? 50 : 25) + codingGain;
    // data rate = C/N0 - required Eb/N0
    const rateDBAbs = cn0 - requiredEbN0 - systemNoise;
    const rateBps = Math.pow(10, rateDBAbs / 10);

    // Clamp to reasonable range
    return Math.max(1, Math.min(1e9, rateBps));
  };

  // Format data rate for display
  const formatDataRate = (bps: number): string => {
    if (bps >= 1e9) return `${(bps / 1e9).toFixed(1)} Gbps`;
    if (bps >= 1e6) return `${(bps / 1e6).toFixed(1)} Mbps`;
    if (bps >= 1e3) return `${(bps / 1e3).toFixed(1)} kbps`;
    return `${Math.round(bps)} bps`;
  };

  // Format distance for display
  const formatDistance = (km: number): string => {
    if (km >= 1e9) return `${(km / 1e9).toFixed(1)}B km`;
    if (km >= 1e6) return `${(km / 1e6).toFixed(0)}M km`;
    if (km >= 1e3) return `${(km / 1e3).toFixed(0)}K km`;
    return `${Math.round(km)} km`;
  };

  // Current computed values
  const distanceKm = Math.pow(10, distanceLog);
  
  const currentFSPL = calcFSPL(distanceKm, wavelength);
  const currentDataRate = calcDataRate(distanceKm, antennaDiameter, transmitPower);
  const lightDelaySeconds = (distanceKm * 1000) / c;

  // Twist computed values
  const twistDistKm = Math.pow(10, twistDistance);
  const rfRate = calcDataRate(twistDistKm, 70, 23, false);
  const opticalRate = calcDataRate(twistDistKm, 5.1, 4, true);

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.signal})`,
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

  // Slider style
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

  // Progress bar
  const renderProgressBar = () => {
    const idx = phaseOrder.indexOf(phase);
    const pct = ((idx + 1) / phaseOrder.length) * 100;
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '4px',
        background: colors.bgSecondary, zIndex: 1100,
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: `linear-gradient(90deg, ${colors.accent}, ${colors.signal})`,
          transition: 'width 0.5s ease',
        }} />
      </div>
    );
  };

  // Nav dots
  const renderNavDots = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
      {phaseOrder.map((p) => (
        <button
          key={p}
          data-navigation-dot="true"
          aria-label={phaseLabels[p]}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            aspectRatio: "auto", boxSizing: "border-box", paddingTop: "4px", paddingBottom: "4px",
            borderRadius: '4px',
            background: phase === p ? colors.accent : colors.border,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            padding: 0,
          }}
        />
      ))}
    </div>
  );

  // Navigation bar
  const NavigationBar = ({
    onBack,
    onNext,
    backDisabled,
    nextDisabled,
    nextLabel,
  }: {
    onBack?: () => void;
    onNext?: () => void;
    backDisabled?: boolean;
    nextDisabled?: boolean;
    nextLabel?: string;
  }) => (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
      background: colors.bgSecondary,
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 24px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <button
        onClick={onBack}
        disabled={backDisabled}
        style={{
          padding: '10px 20px',
          minHeight: '44px',
          background: backDisabled ? colors.border : colors.bgCard,
          color: backDisabled ? colors.textMuted : colors.textPrimary,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          cursor: backDisabled ? 'not-allowed' : 'pointer',
          fontWeight: 600, fontSize: '15px',
          opacity: backDisabled ? 0.5 : 1,
        }}
      >
        Back
      </button>
      {renderNavDots()}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        style={{
          padding: '10px 20px',
          minHeight: '44px',
          background: nextDisabled ? colors.border : 'linear-gradient(135deg, ' + colors.accent + ', ' + colors.signal + ')',
          color: nextDisabled ? colors.textMuted : '#FFFFFF',
          border: 'none', borderRadius: '8px',
          cursor: nextDisabled ? 'not-allowed' : 'pointer',
          fontWeight: 600, fontSize: '15px',
          opacity: nextDisabled ? 0.5 : 1,
          boxShadow: nextDisabled ? 'none' : `0 0 20px ${colors.accentGlow}`,
        }}
      >
        {nextLabel || 'Next'}
      </button>
    </div>
  );

  // Phase wrapper — stabilised via useMemo so the component identity stays the
  // same across re-renders within the same phase. Without this, React would
  // unmount/remount the entire subtree on every state change (slider, etc.),
  // replacing DOM elements and breaking test references.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const PhaseWrapper = useMemo(() =>
    ({ children, nav }: { children: React.ReactNode; nav: React.ReactNode }) => (
      <div style={{
        minHeight: '100vh', background: colors.bgPrimary,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{
          flex: '1 1 0%', overflowY: 'auto',
          paddingTop: '48px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px',
        }}>
          {children}
        </div>
        {nav}
      </div>
    )
  , [phase]);

  // --------------------------------------------------------------------------
  // SVG: Space Scene - Link Budget Visualization (complexity >= 15)
  // --------------------------------------------------------------------------
  const renderSpaceSVG = (dist: number, dataRate: number, fspl: number, antDiam: number, optical: boolean = false) => {
    const width = isMobile ? 360 : 600;
    const height = 400;
    const distNorm = Math.min(1, Math.max(0, (Math.log10(dist) - 2.6) / (10.4 - 2.6))); // normalize log distance
    const signalStrength = Math.max(0, Math.min(1, 1 - distNorm * 0.95));
    const coneSpread = 20 + distNorm * 80;
    const scX = (distKm: number) => 80 + (Math.log10(distKm) - 2.6) / (10.4 - 2.6) * (width - 160);

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', maxWidth: `${width}px`, height: 'auto' }}
      >
        <defs>
          {/* Space background gradient */}
          <linearGradient id="spaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0B0D1A" />
            <stop offset="40%" stopColor="#0E1225" />
            <stop offset="100%" stopColor="#1A0F2E" />
          </linearGradient>
          {/* Earth gradient */}
          <radialGradient id="earthGrad" cx="40%" cy="40%">
            <stop offset="0%" stopColor="#4FC3F7" />
            <stop offset="40%" stopColor="#2196F3" />
            <stop offset="70%" stopColor="#1565C0" />
            <stop offset="100%" stopColor="#0D47A1" />
          </radialGradient>
          {/* Dish gradient */}
          <linearGradient id="dishGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B0BEC5" />
            <stop offset="50%" stopColor="#78909C" />
            <stop offset="100%" stopColor="#546E7A" />
          </linearGradient>
          {/* Signal cone gradient */}
          <linearGradient id="signalConeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={optical ? '#8B5CF6' : '#22D3EE'} stopOpacity={0.6} />
            <stop offset="50%" stopColor={optical ? '#8B5CF6' : '#22D3EE'} stopOpacity={0.2} />
            <stop offset="100%" stopColor={optical ? '#8B5CF6' : '#22D3EE'} stopOpacity={0.02} />
          </linearGradient>
          {/* Spacecraft metallic */}
          <linearGradient id="craftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#CFD8DC" />
            <stop offset="50%" stopColor="#90A4AE" />
            <stop offset="100%" stopColor="#607D8B" />
          </linearGradient>
          {/* Signal strength meter gradient */}
          <linearGradient id="meterGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="30%" stopColor="#F59E0B" />
            <stop offset="60%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          {/* Solar panel gradient */}
          <linearGradient id="solarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E3A5F" />
            <stop offset="50%" stopColor="#2E5090" />
            <stop offset="100%" stopColor="#1E3A5F" />
          </linearGradient>
          {/* Star glow */}
          <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Signal pulse glow */}
          <filter id="signalGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Dish shadow */}
          <filter id="dishShadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
          </filter>
          {/* Spacecraft glow */}
          <filter id="craftGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="glow3" />
            <feMerge>
              <feMergeNode in="glow3" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Laser beam filter */}
          <filter id="laserGlow" x="-10%" y="-50%" width="120%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="laserBlur" />
            <feMerge>
              <feMergeNode in="laserBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Data rate badge glow */}
          <filter id="badgeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="bg" />
            <feMerge>
              <feMergeNode in="bg" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Earth atmosphere */}
          <radialGradient id="atmosphereGrad" cx="50%" cy="50%">
            <stop offset="80%" stopColor="#2196F3" stopOpacity="0" />
            <stop offset="95%" stopColor="#4FC3F7" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#81D4FA" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Space background */}
        <rect width={width} height={height} fill="url(#spaceGrad)" rx="12" />

        {/* Stars */}
        {Array.from({ length: 40 }, (_, i) => {
          const sx = (i * 73 + 17) % width;
          const sy = (i * 47 + 31) % height;
          const sr = (i % 3 === 0) ? 1.5 : 0.8;
          const so = 0.3 + (i % 5) * 0.15;
          return <circle key={`star-${i}`} cx={sx} cy={sy} r={sr} fill="#fff" opacity={so} />;
        })}
        {/* Bright stars */}
        {[
          { x: width * 0.15, y: 30 }, { x: width * 0.7, y: 60 }, { x: width * 0.9, y: 140 },
          { x: width * 0.4, y: 20 }, { x: width * 0.55, y: 370 },
        ].map((s, i) => (
          <circle key={`bstar-${i}`} cx={s.x} cy={s.y} r={2} fill="#fff" opacity={0.8} filter="url(#starGlow)" />
        ))}

        {/* Earth (left side) */}
        <circle cx={55} cy={200} r={35} fill="url(#earthGrad)" />
        <circle cx={55} cy={200} r={38} fill="url(#atmosphereGrad)" />
        {/* Continents hint */}
        <polygon points="42,190 50,185 58,188 62,192 55,196" fill="#4CAF50" opacity={0.5} />
        <polygon points="60,200 68,195 72,202 70,208 62,206" fill="#4CAF50" opacity={0.4} />

        {/* DSN Ground station dish */}
        <g transform={`translate(55, 158)`} filter="url(#dishShadow)">
          {/* Support tower */}
          <rect x={-3} y={0} width={6} height={20} fill="#546E7A" rx={1} />
          {/* Dish */}
          <polyline
            points={`${-antDiam / 6},-2 0,${-12 - antDiam / 8} ${antDiam / 6},-2`}
            fill="url(#dishGrad)"
            stroke="#B0BEC5"
            strokeWidth={1.5}
          />
          {/* Feed horn */}
          <line x1={0} y1={-2} x2={0} y2={-10 - antDiam / 10} stroke="#90A4AE" strokeWidth={1.5} />
          <circle cx={0} cy={-12 - antDiam / 10} r={2} fill="#FFAB40" />
        </g>
        <text x={55} y={244} textAnchor="middle" fill={colors.textMuted} fontSize="11" fontWeight="600">
          DSN {antDiam}m
        </text>

        {/* Signal cone (spreading with distance) */}
        <polygon
          points={`90,195 ${90 + (width - 200) * 0.8},${200 - coneSpread / 2} ${90 + (width - 200) * 0.8},${200 + coneSpread / 2}`}
          fill="url(#signalConeGrad)"
          opacity={0.4}
        />
        {/* Signal wavefronts */}
        {[0.15, 0.35, 0.55, 0.75, 0.9].map((frac, i) => {
          const x = 90 + (width - 200) * 0.8 * frac;
          const spread = 3 + coneSpread * frac * 0.5;
          return (
            <line
              key={`wave-${i}`}
              x1={x} y1={200 - spread}
              x2={x} y2={200 + spread}
              stroke={optical ? colors.laser : colors.signal}
              strokeWidth={1}
              opacity={0.3 - frac * 0.2}
              strokeDasharray="3,3"
            />
          );
        })}

        {/* Spacecraft (right side, position based on distance) */}
        {(() => {
          const craftX = Math.min(width - 60, scX(dist));
          return (
            <g transform={`translate(${craftX}, 200)`} filter="url(#craftGlow)">
              {/* Solar panels */}
              <rect x={-22} y={-5} width={14} height={10} fill="url(#solarGrad)" stroke="#37474F" strokeWidth={0.5} rx={1} />
              <rect x={8} y={-5} width={14} height={10} fill="url(#solarGrad)" stroke="#37474F" strokeWidth={0.5} rx={1} />
              {/* Body */}
              <rect x={-6} y={-8} width={12} height={16} fill="url(#craftGrad)" stroke="#78909C" strokeWidth={0.8} rx={2} />
              {/* HGA dish */}
              <path d={`M -4 -8 Q 0 -16 4 -8`} fill="#B0BEC5" stroke="#78909C" strokeWidth={0.6} />
              {/* Antenna feed */}
              <line x1={0} y1={-8} x2={0} y2={-14} stroke="#90A4AE" strokeWidth={0.8} />
              <circle cx={0} cy={-15} r={1.2} fill="#FFAB40" />
              {/* Label */}
              <text x={0} y={26} textAnchor="middle" fill={colors.textMuted} fontSize="11" fontWeight="600">
                {formatDistance(dist)}
              </text>
            </g>
          );
        })()}

        {/* Signal strength meter (right side) */}
        <g transform={`translate(${width - 35}, 100)`}>
          <rect x={-10} y={0} width={20} height={120} rx={4} fill={colors.bgCard} stroke={colors.border} strokeWidth={1} />
          <rect
            x={-7}
            y={3 + (1 - signalStrength) * 114}
            width={14}
            height={signalStrength * 114}
            rx={2}
            fill="url(#meterGrad)"
            opacity={0.9}
          />
          
          
        </g>

        <text x={width - 35} y={92} textAnchor="middle" fill={colors.textMuted} fontSize="11" fontWeight="600">Signal</text>
        <text x={width - 35} y={238} textAnchor="middle" fill={signalStrength > 0.5 ? colors.success : signalStrength > 0.2 ? colors.warning : colors.error} fontSize="11" fontWeight="700">
          {(signalStrength * 100).toFixed(0)}%
        </text>

        {/* Data rate badge */}
        <g transform={`translate(${width / 2}, ${height - 55})`}>
          <rect x={-85} y={-16} width={170} height={32} rx={8}
            fill={colors.bgCard} stroke={optical ? colors.laser : colors.signal}
            strokeWidth={1.5} opacity={0.95}
            filter="url(#badgeGlow)"
          />
          
        </g>

        <text x={width / 2} y={height - 50} textAnchor="middle" fill={optical ? colors.laser : colors.signal} fontSize="14" fontWeight="800">
          {formatDataRate(dataRate)}
        </text>

        {/* Free-space path loss label */}
        <text x={width / 2} y={height - 22} textAnchor="middle" fill={colors.textMuted} fontSize="11">
          FSPL: {fspl.toFixed(0)} dB | Light delay: {lightDelaySeconds < 1 ? `${(lightDelaySeconds * 1000).toFixed(1)}ms` : lightDelaySeconds < 60 ? `${lightDelaySeconds.toFixed(1)}s` : lightDelaySeconds < 3600 ? `${(lightDelaySeconds / 60).toFixed(1)}min` : `${(lightDelaySeconds / 3600).toFixed(1)}hr`}
        </text>

        {/* Axis labels */}
        <text x={width / 2} y={height - 6} textAnchor="middle" fill={colors.textSecondary} fontSize="11" fontWeight="600">Distance (log scale)</text>
        <text x={12} y={200} textAnchor="start" fill={colors.textSecondary} fontSize="11" fontWeight="600">Power</text>

        {/* Title */}
        <text x={width / 2} y={22} textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">
          Space Communication Link Budget
        </text>

        {/* Inverse-square formula */}
        <rect x={width / 2 - 90} y={30} width={180} height={20} rx={4}
          fill="rgba(59,130,246,0.1)" stroke="rgba(59,130,246,0.3)" />
        <text x={width / 2} y={44} textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="600">
          FSPL = (4πd/λ)²
        </text>
      </svg>
    );
  };

  // --------------------------------------------------------------------------
  // PHASE: HOOK
  // --------------------------------------------------------------------------
  const renderHook = () => (
    <PhaseWrapper
      nav={
        <NavigationBar
          backDisabled
          onNext={() => goToPhase('predict')}
          nextLabel="Start Exploring"
        />
      }
    >
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{ fontSize: isMobile ? '56px' : '72px' }}>📡🚀</span>
        </div>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, textAlign: 'center', marginBottom: '16px' }}>
          Space Comms
        </h1>

        <p style={{
          ...typo.body, color: colors.textSecondary, textAlign: 'center',
          marginBottom: '32px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto',
        }}>
          Voyager 1&apos;s signal arrives at Earth <span style={{ color: colors.signal }}>20 billion times weaker
          than a watch battery</span>. Yet we can still decode its message from 24 billion km away.
          How is deep space communication even possible?
        </p>

        <div style={{
          background: colors.bgCard, borderRadius: '16px',
          padding: isMobile ? '20px' : '32px', border: `1px solid ${colors.border}`, marginBottom: '24px',
        }}>
          <h2 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
            The Deep Space Challenge
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
            When a spacecraft ventures into deep space, every kilometer multiplies the challenge.
            Radio signals spread out as an ever-expanding sphere — by the time they reach Earth,
            the energy is diluted across an unimaginably vast area.
          </p>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
            The <strong style={{ color: colors.warning }}>inverse-square law</strong> governs
            everything: double the distance, and signal strength drops to one-quarter. At Mars
            distance, data rates are measured in megabits. At Voyager&apos;s distance, just
            <strong style={{ color: colors.signal }}> 160 bits per second</strong> — slower than a
            1970s dial-up modem.
          </p>
          <p style={{ ...typo.body, color: colors.textSecondary }}>
            In this game, you will explore the link budget — the accounting system that determines
            whether a signal can cross the solar system and still be understood.
          </p>
        </div>

        <div style={{
          background: `linear-gradient(135deg, ${colors.bgCard}, rgba(59,130,246,0.1))`,
          borderRadius: '12px', padding: '20px', border: `1px solid ${colors.accent}33`, textAlign: 'center',
        }}>
          <p style={{ ...typo.small, color: colors.textMuted, fontStyle: 'italic', marginBottom: '8px' }}>
            &ldquo;The most remarkable thing about Voyager is not how far it has traveled, but that we
            can still hear its whisper across 24 billion kilometers of empty space.&rdquo;
          </p>
          <p style={{ ...typo.small, color: colors.textMuted }}>
            ELON Game 23 of 36 — Space Communication Link Budgets
          </p>
        </div>
      </div>
    </PhaseWrapper>
  );

  // --------------------------------------------------------------------------
  // PHASE: PREDICT
  // --------------------------------------------------------------------------
  const predictOptions = [
    { id: 'a', label: '1 Gbps — modern fiber-optic speeds' },
    { id: 'b', label: '1 Mbps — like early broadband' },
    { id: 'c', label: '160 bits per second — slower than a 1970s modem', correct: true },
    { id: 'd', label: 'It can\'t communicate anymore — too far away' },
  ];

  const renderPredict = () => (
    <PhaseWrapper
      nav={
        <NavigationBar
          onBack={() => goToPhase('hook')}
          onNext={() => { emitEvent('prediction_made', { prediction }); goToPhase('play'); }}
          nextDisabled={prediction === null}
          nextLabel="Test Your Prediction"
        />
      }
    >
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
          Make Your Prediction
        </h2>
        <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px' }}>
          Phase 2 of 10 — Predict
        </p>

        <div style={{
          background: colors.bgCard, borderRadius: '16px',
          padding: isMobile ? '20px' : '32px', border: `1px solid ${colors.border}`, marginBottom: '24px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
            The Scenario
          </h3>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
            Voyager 1, at <strong style={{ color: colors.warning }}>24 billion km</strong> from Earth,
            transmits data using a <strong style={{ color: colors.warning }}>23-watt</strong> transmitter
            (less than a refrigerator light bulb) and a 3.7-meter dish antenna. NASA receives it
            with a massive 70-meter DSN dish. At what rate does Voyager transmit data?
          </p>

          {/* Static SVG showing the scenario */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
            {renderSpaceSVG(24000000000, 160, calcFSPL(24000000000, wavelength), 70)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {predictOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setPrediction(opt.id); emitEvent('selection_made', { option: opt.id }); }}
                style={{
                  padding: '16px 20px',
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgSecondary,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '12px', color: colors.textPrimary, textAlign: 'left',
                  cursor: 'pointer', fontSize: typo.body.fontSize,
                  fontWeight: prediction === opt.id ? 600 : 400, transition: 'all 0.2s ease',
                }}
              >
                <span style={{ color: colors.accent, fontWeight: 700, marginRight: '12px' }}>
                  {opt.id.toUpperCase()}.
                </span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </PhaseWrapper>
  );

  // --------------------------------------------------------------------------
  // PHASE: PLAY — Link Budget Calculator
  // --------------------------------------------------------------------------
  const renderPlay = () => (
    <PhaseWrapper
      nav={
        <NavigationBar
          onBack={() => goToPhase('predict')}
          onNext={() => goToPhase('review')}
          nextLabel="Understand the Physics"
        />
      }
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
          Link Budget Simulator
        </h2>

        <div style={{
          background: `${colors.success}11`, border: `1px solid ${colors.success}33`,
          borderRadius: '12px', padding: '16px', marginBottom: '16px',
        }}>
          <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
            <strong style={{ color: colors.success }}>Why This Matters:</strong> Every deep space
            mission depends on the link budget — the balance between transmitted power, antenna gain,
            free-space path loss, and noise. Move the sliders to see how distance dominates everything. The visualization below illustrates how signal strength decreases as distance increases. When you increase the distance slider, the data rate drops dramatically — higher distance causes weaker signals. Compare the current values against the reference baseline to understand the factor of change.
          </p>
        </div>

        {/* Key terms */}
        <div style={{
          background: colors.bgCard, borderRadius: '12px', padding: '16px',
          marginBottom: '24px', border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
            <strong style={{ color: colors.textPrimary }}>Free-Space Path Loss (FSPL)</strong> is
            the signal power reduction as it spreads over distance: FSPL = (4πd/λ)².
          </p>
          <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
            <strong style={{ color: colors.accent }}>Antenna Gain</strong> focuses signal energy
            into a narrow beam. Gain scales as D²/λ² — bigger dish, higher frequency, more gain.
          </p>
          <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
            <strong style={{ color: colors.signal }}>Data Rate</strong> is what the link budget
            determines — how many bits per second can be reliably decoded.
          </p>
        </div>

        {/* Visualization */}
        <div style={{
          background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px',
        }} data-distance={distanceLog.toFixed(2)} data-antenna={antennaDiameter} data-power={transmitPower}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            {renderSpaceSVG(distanceKm, currentDataRate, currentFSPL, antennaDiameter)}
          </div>

          {/* Distance slider (log scale) */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>Distance (log scale)</span>
              <span style={{ ...typo.small, color: colors.signal, fontWeight: 600 }}>
                {formatDistance(distanceKm)}
              </span>
            </div>
            <input
              ref={distSliderRef}
              type="range"
              min="2.6"
              max="10.4"
              step="0.01"
              value={distanceLog}
              onInput={(e) => { setDistanceLog(parseFloat((e.target as HTMLInputElement).value)); }}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setDistanceLog(v);
                emitEvent('slider_changed', { distance: Math.pow(10, v) });
              }}
              style={sliderStyle(colors.signal, distanceLog, 2.6, 10.4)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ ...typo.small, color: colors.textMuted }}>LEO (400km)</span>
              <span style={{ ...typo.small, color: colors.textMuted }}>Voyager (24B km)</span>
            </div>
            {/* Preset buttons */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
              {distancePresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => { playSound('click'); setDistanceLog(Math.log10(preset.distanceKm)); }}
                  style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                    background: Math.abs(distanceLog - Math.log10(preset.distanceKm)) < 0.1 ? `${colors.accent}33` : colors.bgSecondary,
                    color: Math.abs(distanceLog - Math.log10(preset.distanceKm)) < 0.1 ? colors.accent : colors.textMuted,
                    border: `1px solid ${colors.border}`, cursor: 'pointer',
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Antenna diameter slider */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>Ground Antenna Diameter</span>
              <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                {antennaDiameter}m ({calcAntennaGain(antennaDiameter, wavelength).toFixed(1)} dBi)
              </span>
            </div>
            <input
              type="range"
              min="3"
              max="100"
              step="1"
              value={antennaDiameter}
              onInput={(e) => {
                setAntennaDiameter(parseInt((e.target as HTMLInputElement).value));
                emitEvent("slider_changed", { antennaDiameter: parseInt((e.target as HTMLInputElement).value) });
              }}
              onChange={(e) => {
                setAntennaDiameter(parseInt(e.target.value));
                emitEvent('slider_changed', { antennaDiameter: parseInt(e.target.value) });
              }}
              style={sliderStyle(colors.accent, antennaDiameter, 3, 100)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ ...typo.small, color: colors.textMuted }}>3m (small)</span>
              <span style={{ ...typo.small, color: colors.textMuted }}>100m (Arecibo-class)</span>
            </div>
          </div>

          {/* Transmit power slider */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>Transmit Power</span>
              <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>
                {transmitPower}W ({(10 * Math.log10(transmitPower)).toFixed(1)} dBW)
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="400"
              step="1"
              value={transmitPower}
              onInput={(e) => {
                setTransmitPower(parseInt((e.target as HTMLInputElement).value));
                emitEvent("slider_changed", { transmitPower: parseInt((e.target as HTMLInputElement).value) });
              }}
              onChange={(e) => {
                setTransmitPower(parseInt(e.target.value));
                emitEvent('slider_changed', { transmitPower: parseInt(e.target.value) });
              }}
              style={sliderStyle(colors.warning, transmitPower, 1, 400)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ ...typo.small, color: colors.textMuted }}>1W (CubeSat)</span>
              <span style={{ ...typo.small, color: colors.textMuted }}>400W (high power)</span>
            </div>
          </div>

          {/* Link budget breakdown */}
          <div style={{
            background: colors.bgSecondary, borderRadius: '12px', padding: '16px',
            border: `1px solid ${colors.border}`,
          }}>
            <h4 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px', fontSize: '16px' }}>
              Link Budget Breakdown
            </h4>
            {[
              { label: 'Transmit Power', value: `${(10 * Math.log10(transmitPower)).toFixed(1)} dBW`, color: colors.warning },
              { label: 'Spacecraft Antenna Gain', value: `${calcAntennaGain(3.7, wavelength).toFixed(1)} dBi`, color: colors.accent },
              { label: 'Free-Space Path Loss', value: `-${currentFSPL.toFixed(1)} dB`, color: colors.error },
              { label: 'Ground Antenna Gain', value: `+${calcAntennaGain(antennaDiameter, wavelength).toFixed(1)} dBi`, color: colors.success },
              { label: 'Coding Gain', value: '+7.5 dB', color: colors.signal },
              { label: 'Achievable Data Rate', value: formatDataRate(currentDataRate), color: colors.textPrimary },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: i < 5 ? `1px solid ${colors.border}` : 'none',
              }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item.label}</span>
                <span style={{ ...typo.small, color: item.color, fontWeight: 700, fontFamily: 'monospace' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PhaseWrapper>
  );

  // --------------------------------------------------------------------------
  // PHASE: REVIEW
  // --------------------------------------------------------------------------
  const renderReview = () => (
    <PhaseWrapper
      nav={
        <NavigationBar
          onBack={() => goToPhase('play')}
          onNext={() => goToPhase('twist_predict')}
          nextLabel="Discover the Twist"
        />
      }
    >
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
          Understanding the Link Budget
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          <div style={{
            background: colors.bgCard, borderRadius: '12px', padding: '20px',
            border: `1px solid ${colors.border}`,
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Inverse-Square Law</h3>
            <p style={{ ...typo.body, color: colors.accent, fontFamily: 'monospace', marginBottom: '12px' }}>
              P_received ∝ 1/d²
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Signal energy spreads over the surface of an expanding sphere. At distance d, the sphere
              has area 4πd². Double the distance means 4x the area and 1/4 the signal density. This is
              the fundamental reason why deep space data rates are so low — and why antenna size matters so much.
            </p>
          </div>

          <div style={{
            background: colors.bgCard, borderRadius: '12px', padding: '20px',
            border: `1px solid ${colors.border}`,
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Antenna Gain Compensates</h3>
            <p style={{ ...typo.body, color: colors.accent, fontFamily: 'monospace', marginBottom: '12px' }}>
              G = η × (πD/λ)²
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              A larger antenna collects more of the spreading signal. The 70m DSN dish has ~73 dBi
              gain at X-band — collecting signal from 3,800 square meters of wavefront. This is why NASA built
              the largest steerable antennas on Earth specifically for deep space communication.
            </p>
          </div>

          <div style={{
            background: colors.bgCard, borderRadius: '12px', padding: '20px',
            border: `1px solid ${colors.border}`,
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Shannon&apos;s Insight</h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Claude Shannon proved that reliable communication is possible even when the signal
              is <em>below the noise floor</em>. The trick is trading data rate for reliability — use
              powerful error-correcting codes and accept lower speeds. Voyager&apos;s turbo codes provide
              ~7.5 dB of coding gain, equivalent to quintupling the transmitter power through mathematics alone.
            </p>
          </div>

          <div style={{
            background: `${colors.success}11`, borderRadius: '12px', padding: '20px',
            border: `1px solid ${colors.success}33`,
          }}>
            <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>The Big Picture</h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              The link budget is a balance sheet: transmit power and antenna gains on the credit side,
              path loss and noise on the debit side. The remaining margin determines your data rate.
              Every dB matters — a 3 dB improvement doubles your data rate.
            </p>
          </div>
        </div>
      </div>
    </PhaseWrapper>
  );

  // --------------------------------------------------------------------------
  // PHASE: TWIST PREDICT — RF vs Optical
  // --------------------------------------------------------------------------
  const twistPredictOptions = [
    { id: 'a', label: 'Same data rate — photons are photons regardless of frequency' },
    { id: 'b', label: '10-100x higher data rate but requires arc-second pointing and fails in clouds', correct: true },
    { id: 'c', label: 'Doesn\'t work in space — lasers need atmosphere to propagate' },
    { id: 'd', label: '1000x higher but only works within the inner solar system' },
  ];

  const renderTwistPredict = () => (
    <PhaseWrapper
      nav={
        <NavigationBar
          onBack={() => goToPhase('review')}
          onNext={() => { emitEvent('prediction_made', { twistPrediction }); goToPhase('twist_play'); }}
          nextDisabled={twistPrediction === null}
          nextLabel="Explore the Twist"
        />
      }
    >
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
          The Twist: Optical Communication
        </h2>
        <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px' }}>
          Phase 5 of 10 — New Variable
        </p>

        <div style={{
          background: colors.bgCard, borderRadius: '16px',
          padding: isMobile ? '20px' : '32px', border: `1px solid ${colors.border}`, marginBottom: '24px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.laser, marginBottom: '16px' }}>
            From Radio to Laser
          </h3>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
            What if instead of RF radio waves (X-band, 8.4 GHz, lambda = 3.6 cm), we used
            a <strong style={{ color: colors.laser }}>near-infrared laser</strong> (1550 nm, lambda = 0.00155 mm)?
            The wavelength is <strong style={{ color: colors.warning }}>23,000x shorter</strong>,
            meaning the same-size aperture produces enormously more gain. Switching from RF to optical
            laser communication...
          </p>

          {/* Static SVG showing RF vs optical concept */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
            {renderSpaceSVG(31000000, rfRate, calcFSPL(31000000, wavelength), 70)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {twistPredictOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); emitEvent('selection_made', { option: opt.id }); }}
                style={{
                  padding: '16px 20px',
                  background: twistPrediction === opt.id ? `${colors.laser}22` : colors.bgSecondary,
                  border: `2px solid ${twistPrediction === opt.id ? colors.laser : colors.border}`,
                  borderRadius: '12px', color: colors.textPrimary, textAlign: 'left',
                  cursor: 'pointer', fontSize: typo.body.fontSize,
                  fontWeight: twistPrediction === opt.id ? 600 : 400, transition: 'all 0.2s ease',
                }}
              >
                <span style={{ color: colors.laser, fontWeight: 700, marginRight: '12px' }}>
                  {opt.id.toUpperCase()}.
                </span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </PhaseWrapper>
  );

  // --------------------------------------------------------------------------
  // PHASE: TWIST PLAY — RF vs Optical comparison
  // --------------------------------------------------------------------------
  const renderTwistPlay = () => (
    <PhaseWrapper
      nav={
        <NavigationBar
          onBack={() => goToPhase('twist_predict')}
          onNext={() => goToPhase('twist_review')}
          nextLabel="Deep Insight"
        />
      }
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
          RF vs Optical Communication
        </h2>

        {/* Toggle */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px',
        }}>
          <button
            onClick={() => { playSound('click'); setUseOptical(false); }}
            style={{
              padding: '10px 24px', borderRadius: '10px', fontWeight: 600, fontSize: '15px',
              background: !useOptical ? `${colors.accent}33` : colors.bgCard,
              color: !useOptical ? colors.accent : colors.textMuted,
              border: `2px solid ${!useOptical ? colors.accent : colors.border}`, cursor: 'pointer',
            }}
          >
            RF (X-band)
          </button>
          <button
            onClick={() => { playSound('click'); setUseOptical(true); }}
            style={{
              padding: '10px 24px', borderRadius: '10px', fontWeight: 600, fontSize: '15px',
              background: useOptical ? `${colors.laser}33` : colors.bgCard,
              color: useOptical ? colors.laser : colors.textMuted,
              border: `2px solid ${useOptical ? colors.laser : colors.border}`, cursor: 'pointer',
            }}
          >
            Optical (Laser)
          </button>
        </div>

        {/* SVG for current mode */}
        <div style={{
          background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            {renderSpaceSVG(
              twistDistKm,
              useOptical ? opticalRate : rfRate,
              calcFSPL(twistDistKm, useOptical ? laserWavelength : wavelength),
              useOptical ? 5.1 : 70,
              useOptical
            )}
          </div>

          {/* Distance slider */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>Distance</span>
              <span style={{ ...typo.small, color: colors.signal, fontWeight: 600 }}>
                {formatDistance(twistDistKm)}
              </span>
            </div>
            <input
              type="range" min="5" max="10.4" step="0.01" value={twistDistance}
              onInput={(e) => { setTwistDistance(parseFloat((e.target as HTMLInputElement).value)); emitEvent("slider_changed", { twistDistance: parseFloat((e.target as HTMLInputElement).value) }); }}
              onChange={(e) => { setTwistDistance(parseFloat(e.target.value)); emitEvent('slider_changed', { twistDistance: parseFloat(e.target.value) }); }}
              style={sliderStyle(useOptical ? colors.laser : colors.accent, twistDistance, 5, 10.4)}
            />
          </div>

          {/* Comparison table */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
          }}>
            <div style={{
              background: `${colors.accent}11`, borderRadius: '12px', padding: '16px',
              border: `1px solid ${colors.accent}33`, textAlign: 'center',
            }}>
              <p style={{ ...typo.small, color: colors.accent, fontWeight: 700, marginBottom: '8px' }}>RF (X-band)</p>
              <p style={{ ...typo.h2, color: colors.textPrimary, margin: '8px 0' }}>{formatDataRate(rfRate)}</p>
              <p style={{ ...typo.small, color: colors.textMuted }}>70m DSN dish</p>
              <p style={{ ...typo.small, color: colors.textMuted }}>Works in all weather</p>
              <p style={{ ...typo.small, color: colors.textMuted }}>Beam: ~0.06 degrees</p>
            </div>
            <div style={{
              background: `${colors.laser}11`, borderRadius: '12px', padding: '16px',
              border: `1px solid ${colors.laser}33`, textAlign: 'center',
            }}>
              <p style={{ ...typo.small, color: colors.laser, fontWeight: 700, marginBottom: '8px' }}>Optical (Laser)</p>
              <p style={{ ...typo.h2, color: colors.textPrimary, margin: '8px 0' }}>{formatDataRate(opticalRate)}</p>
              <p style={{ ...typo.small, color: colors.textMuted }}>5.1m telescope</p>
              <p style={{ ...typo.small, color: colors.warning }}>Fails in clouds/rain</p>
              <p style={{ ...typo.small, color: colors.textMuted }}>Beam: micro-arc-seconds</p>
            </div>
          </div>

          {/* Multiplier */}
          <div style={{
            background: colors.bgSecondary, borderRadius: '12px', padding: '16px', marginTop: '16px',
            textAlign: 'center', border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Optical advantage at this distance:</p>
            <p style={{ ...typo.h2, color: colors.laser, margin: 0 }}>
              {(opticalRate / rfRate).toFixed(0)}x faster
            </p>
          </div>
        </div>
      </div>
    </PhaseWrapper>
  );

  // --------------------------------------------------------------------------
  // PHASE: TWIST REVIEW
  // --------------------------------------------------------------------------
  const renderTwistReview = () => (
    <PhaseWrapper
      nav={
        <NavigationBar
          onBack={() => goToPhase('twist_play')}
          onNext={() => goToPhase('transfer')}
          nextLabel="Real-World Applications"
        />
      }
    >
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
          The Optical Revolution
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          <div style={{
            background: colors.bgCard, borderRadius: '12px', padding: '20px',
            border: `1px solid ${colors.border}`,
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Why Optical Wins on Gain</h3>
            <p style={{ ...typo.body, color: colors.laser, fontFamily: 'monospace', marginBottom: '12px' }}>
              Gain ratio = (λ_RF / λ_optical)² = (3.6cm / 1.55µm)² = 5.4 × 10⁸
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              A 22cm optical telescope produces the same gain as a theoretical 5-kilometer RF dish.
              The shorter wavelength focuses energy into an incredibly tight beam. NASA&apos;s DSOC
              demonstrated 267 Mbps from 31 million km — proving the technology works.
            </p>
          </div>

          <div style={{
            background: colors.bgCard, borderRadius: '12px', padding: '20px',
            border: `1px solid ${colors.border}`,
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>The Pointing Challenge</h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              That incredibly tight beam is both blessing and curse. The spacecraft must point the
              laser with micro-arc-second precision — like hitting a coin from 30 kilometers away.
              Any vibration, attitude error, or thermal distortion breaks the link. This requires
              active beam steering and spacecraft attitude control far beyond what RF needs.
            </p>
          </div>

          <div style={{
            background: colors.bgCard, borderRadius: '12px', padding: '20px',
            border: `1px solid ${colors.border}`,
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Weather Vulnerability</h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Unlike RF, optical beams cannot penetrate clouds, rain, or heavy atmosphere. NASA&apos;s
              solution: weather-diverse ground networks with multiple stations worldwide. If one site
              is cloudy, another will be clear. This adds complexity and cost but solves the availability
              problem.
            </p>
          </div>

          <div style={{
            background: `${colors.laser}11`, borderRadius: '12px', padding: '20px',
            border: `1px solid ${colors.laser}33`,
          }}>
            <h3 style={{ ...typo.h3, color: colors.laser, marginBottom: '12px' }}>The Future</h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Optical communication will transform deep space exploration. Instead of waiting hours
              for a single image from Mars, we could stream live HD video. The technology is proven —
              now it&apos;s about engineering reliable, operational systems that work every day.
            </p>
          </div>
        </div>
      </div>
    </PhaseWrapper>
  );

  // --------------------------------------------------------------------------
  // PHASE: TRANSFER
  // --------------------------------------------------------------------------
  const allAppsCompleted = completedApps.every(Boolean);

  const renderTransfer = () => (
    <PhaseWrapper
      nav={
        <NavigationBar
          onBack={() => goToPhase('twist_review')}
          onNext={() => goToPhase('test')}
          nextDisabled={!allAppsCompleted}
          nextLabel="Take the Test"
        />
      }
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
          Real-World Applications
        </h2>
        <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '24px' }}>
          Phase 8 of 10 — Explore all 4 applications to continue
        </p>

        {selectedApp === null ? (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px',
            }}>
              {realWorldApps.map((app, i) => (
                <button
                  key={i}
                  onClick={() => { playSound('click'); setSelectedApp(i); emitEvent('selection_made', { app: app.title }); }}
                  style={{
                    background: colors.bgCard, borderRadius: '16px', padding: '24px',
                    border: `2px solid ${completedApps[i] ? colors.success : app.color}44`,
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease', position: 'relative',
                  }}
                >
                  {completedApps[i] && (
                    <span style={{ position: 'absolute', top: '12px', right: '12px', color: colors.success, fontSize: '20px' }}>
                      ✓
                    </span>
                  )}
                  <span style={{ fontSize: '36px' }}>{app.icon}</span>
                  <h3 style={{ ...typo.h3, color: app.color, marginTop: '12px', marginBottom: '8px' }}>
                    {app.title}
                  </h3>
                  <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '12px' }}>
                    {app.tagline}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {app.stats.map((stat, j) => (
                      <span key={j} style={{
                        background: `${app.color}22`, color: app.color,
                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                      }}>
                        {stat.icon} {stat.value}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            {!allAppsCompleted && (
              <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginTop: '20px' }}>
                Explore all 4 applications to unlock the test ({completedApps.filter(Boolean).length}/4 completed)
              </p>
            )}
          </>
        ) : (
          (() => {
            const app = realWorldApps[selectedApp];
            return (
              <div>
                <button
                  onClick={() => setSelectedApp(null)}
                  style={{
                    background: 'none', border: 'none', color: colors.accent,
                    cursor: 'pointer', fontSize: '15px', fontWeight: 600, marginBottom: '16px', padding: 0,
                  }}
                >
                  ← Back to all applications
                </button>

                <div style={{
                  background: colors.bgCard, borderRadius: '16px',
                  padding: isMobile ? '20px' : '32px', border: `1px solid ${app.color}44`, marginBottom: '20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '48px' }}>{app.icon}</span>
                    <div>
                      <h3 style={{ ...typo.h2, color: app.color, marginBottom: '4px' }}>{app.title}</h3>
                      <p style={{ ...typo.small, color: colors.textMuted }}>{app.tagline}</p>
                    </div>
                  </div>

                  <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '20px' }}>
                    {app.description}
                  </p>

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {app.stats.map((stat, j) => (
                      <div key={j} style={{
                        flex: 1, minWidth: '100px', background: `${app.color}11`,
                        borderRadius: '12px', padding: '16px', textAlign: 'center',
                        border: `1px solid ${app.color}33`,
                      }}>
                        <span style={{ fontSize: '24px' }}>{stat.icon}</span>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: app.color, marginTop: '4px' }}>
                          {stat.value}
                        </div>
                        <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Connection */}
                  <div style={{
                    background: colors.bgSecondary, borderRadius: '12px', padding: '16px',
                    marginBottom: '20px', borderLeft: `4px solid ${app.color}`,
                  }}>
                    <h4 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px', fontSize: '16px' }}>
                      Connection to Link Budgets
                    </h4>
                    <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                      {app.connection}
                    </p>
                  </div>

                  {/* How it works */}
                  <h4 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '8px', fontSize: '16px' }}>
                    How It Works
                  </h4>
                  <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '20px' }}>
                    {app.howItWorks}
                  </p>

                  {/* Examples */}
                  <h4 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '8px', fontSize: '16px' }}>
                    Real Examples
                  </h4>
                  <div style={{ marginBottom: '20px' }}>
                    {app.examples.map((ex, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ color: app.color }}>•</span>
                        <span style={{ ...typo.body, color: colors.textSecondary }}>{ex}</span>
                      </div>
                    ))}
                  </div>

                  {/* Companies */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    {app.companies.map((co, j) => (
                      <span key={j} style={{
                        background: `${app.color}18`, color: app.color,
                        padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
                        border: `1px solid ${app.color}33`,
                      }}>
                        {co}
                      </span>
                    ))}
                  </div>

                  {/* Future impact */}
                  <div style={{
                    background: `${app.color}11`, borderRadius: '12px', padding: '16px',
                    border: `1px solid ${app.color}22`,
                  }}>
                    <h4 style={{ ...typo.h3, color: app.color, marginBottom: '8px', fontSize: '16px' }}>
                      Future Impact
                    </h4>
                    <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                      {app.futureImpact}
                    </p>
                  </div>
                </div>

                {/* Got It button */}
                <button
                  onClick={() => {
                    playSound('success');
                    const newCompleted = [...completedApps];
                    newCompleted[selectedApp] = true;
                    setCompletedApps(newCompleted);
                    emitEvent('button_clicked', { action: 'app_completed', app: app.title });
                    setSelectedApp(null);
                  }}
                  style={{
                    width: '100%', padding: '16px', background: app.color, color: '#FFFFFF',
                    border: 'none', borderRadius: '12px', fontSize: '17px', fontWeight: 700,
                    cursor: 'pointer', boxShadow: `0 0 24px ${app.color}44`,
                  }}
                >
                  Got It!
                </button>
              </div>
            );
          })()
        )}
      </div>
    </PhaseWrapper>
  );

  // --------------------------------------------------------------------------
  // PHASE: TEST
  // --------------------------------------------------------------------------
  const renderTest = () => {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <PhaseWrapper
          nav={
            <NavigationBar
              onBack={() => goToPhase('transfer')}
              onNext={passed ? () => { playSound('complete'); goToPhase('mastery'); } : undefined}
              nextLabel={passed ? 'Complete Lesson' : undefined}
              nextDisabled={!passed}
            />
          }
        >
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>
              {passed ? '🏆' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Good Job — Keep Learning!'}
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: '8px 0' }}>
              You scored
            </p>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand space communication link budgets and the physics of deep space signals!'
                : 'Review the concepts and try again to master space communication.'}
            </p>
            {!passed && (
              <button
                onClick={() => {
                  setTestSubmitted(false);
                  setTestAnswers(Array(10).fill(null));
                  setCurrentQuestion(0);
                  setTestScore(0);
                  goToPhase('hook');
                }}
                style={{ ...primaryButtonStyle }}
              >
                Review & Try Again
              </button>
            )}
          </div>
        </PhaseWrapper>
      );
    }

    const question = testQuestions[currentQuestion];
    return (
      <PhaseWrapper
        nav={
          <NavigationBar
            onBack={currentQuestion > 0 ? () => setCurrentQuestion(currentQuestion - 1) : () => goToPhase('transfer')}
            onNext={
              currentQuestion < 9
                ? () => { if (testAnswers[currentQuestion]) setCurrentQuestion(currentQuestion + 1); }
                : () => {
                    const score = testAnswers.reduce((acc, ans, i) => {
                      const correct = testQuestions[i].options.find(o => o.correct)?.id;
                      return acc + (ans === correct ? 1 : 0);
                    }, 0);
                    setTestScore(score);
                    setTestSubmitted(true);
                    playSound(score >= 7 ? 'complete' : 'failure');
                    emitEvent('game_completed', { score, total: 10 });
                  }
            }
            nextDisabled={!testAnswers[currentQuestion]}
            nextLabel={currentQuestion < 9 ? 'Next' : 'Submit Test'}
          />
        }
      >
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Knowledge Test: Space Comms
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Apply your understanding of link budgets, antenna gain, path loss, noise, and coding to
            real space communication scenarios. Consider the inverse-square law, Shannon&apos;s theorem,
            and the RF-to-optical trade-offs as you work through each problem.
          </p>

          {/* Progress */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px',
          }}>
            <span style={{ ...typo.h3, color: colors.accent }}>
              Q{currentQuestion + 1} of 10
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
                  borderRadius: '10px', padding: '14px 16px', textAlign: 'left',
                  cursor: 'pointer', minHeight: '44px',
                }}
              >
                <span style={{
                  display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center', lineHeight: '24px', marginRight: '10px',
                  fontSize: '12px', fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </PhaseWrapper>
    );
  };

  // --------------------------------------------------------------------------
  // PHASE: MASTERY
  // --------------------------------------------------------------------------
  const renderMastery = () => (
    <PhaseWrapper
      nav={
        <NavigationBar
          onBack={() => goToPhase('test')}
          backDisabled
          nextDisabled
        />
      }
    >
      <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '100px', marginBottom: '24px' }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Space Comms Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', margin: '0 auto 32px auto' }}>
          You now understand why Voyager&apos;s whisper can cross 24 billion kilometers and still be
          heard — and why the future of deep space communication is optical.
        </p>

        <div style={{
          background: colors.bgCard, borderRadius: '16px', padding: '24px',
          marginBottom: '32px', textAlign: 'left',
        }}>
          <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '20px' }}>
            What You Learned
          </h3>
          {[
            'The inverse-square law dominates deep space communication — doubling distance quarters signal power',
            'Antenna gain scales as D²/λ² — bigger dish and higher frequency both help',
            'Free-space path loss at Voyager distance exceeds 310 dB — an astronomical number',
            'Error-correcting codes provide ~7 dB coding gain, equivalent to 5x more transmitter power',
            'Optical communication offers 10-100x improvement but requires micro-arc-second pointing',
            'The DSN with 70m dishes and cryogenic receivers is humanity\'s ear to the cosmos',
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px',
            }}>
              <span style={{ color: colors.success, fontSize: '18px', lineHeight: 1.6, flexShrink: 0 }}>
                ✓
              </span>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>{item}</p>
            </div>
          ))}
        </div>

        {/* Memorable takeaway */}
        <div style={{
          background: `linear-gradient(135deg, ${colors.bgCard}, ${colors.accent}11)`,
          borderRadius: '16px', padding: '24px', border: `1px solid ${colors.accent}33`,
          marginBottom: '32px',
        }}>
          <p style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>
            The Core Insight
          </p>
          <p style={{ ...typo.body, color: colors.textSecondary, fontStyle: 'italic' }}>
            &ldquo;Space communication is a war against the inverse-square law. Every mission
            pushes the boundary of what physics allows — giant antennas, cryogenic receivers,
            mathematical coding tricks, and now lasers. Voyager&apos;s 160 bps from 24 billion km is
            not a limitation. It is a triumph.&rdquo;
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '14px 28px', borderRadius: '10px',
              border: `1px solid ${colors.border}`, background: 'transparent',
              color: colors.textSecondary, cursor: 'pointer', minHeight: '44px',
            }}
          >
            Play Again
          </button>
          <a href="/" style={{ ...primaryButtonStyle, textDecoration: 'none', display: 'inline-block' }}>
            Return to Dashboard
          </a>
        </div>
      </div>
    </PhaseWrapper>
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================
  switch (phase) {
    case 'hook':
      return renderHook();
    case 'predict':
      return renderPredict();
    case 'play':
      return renderPlay();
    case 'review':
      return renderReview();
    case 'twist_predict':
      return renderTwistPredict();
    case 'twist_play':
      return renderTwistPlay();
    case 'twist_review':
      return renderTwistReview();
    case 'transfer':
      return renderTransfer();
    case 'test':
      return renderTest();
    case 'mastery':
      return renderMastery();
    default:
      return renderHook();
  }
};

export default ELON_SpaceCommsRenderer;
