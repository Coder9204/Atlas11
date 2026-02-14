'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Antenna Gain & Radiation Patterns - Complete 10-Phase Game
// Why focusing electromagnetic energy matters for wireless communication
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

interface AntennaGainRendererProps {
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
    scenario: "A satellite dish installer notices that a larger dish receives a stronger signal from a communications satellite, even though both dishes are aimed at the same satellite.",
    question: "Why does a larger dish antenna receive a stronger signal?",
    options: [
      { id: 'a', label: "Larger dishes have better quality electronics inside" },
      { id: 'b', label: "A larger aperture collects more electromagnetic energy and focuses it more precisely", correct: true },
      { id: 'c', label: "The satellite transmits more power to larger receivers" },
      { id: 'd', label: "Larger dishes are always positioned at better locations" }
    ],
    explanation: "Antenna gain comes from collecting energy over a larger area (aperture) and focusing it in a narrower beam. A larger dish has more collecting area, gathering more of the incoming wave energy. This is the fundamental principle: Gain = (4*pi*A)/wavelength^2, where A is the effective aperture area."
  },
  {
    scenario: "A Wi-Fi engineer needs to provide coverage across an entire office floor. She's choosing between a high-gain directional antenna and a low-gain omnidirectional antenna.",
    question: "Why might the low-gain omnidirectional antenna be the better choice for office coverage?",
    options: [
      { id: 'a', label: "Low-gain antennas use less power" },
      { id: 'b', label: "Omnidirectional antennas spread energy in all horizontal directions, providing broader coverage", correct: true },
      { id: 'c', label: "High-gain antennas only work outdoors" },
      { id: 'd', label: "Directional antennas interfere with office equipment" }
    ],
    explanation: "Gain is about focusing energy. A high-gain antenna concentrates energy in one direction (great for point-to-point links), while a low-gain omnidirectional antenna spreads energy equally in all directions. For coverage, spreading is better. It's a fundamental tradeoff: more gain means narrower beam, less coverage area."
  },
  {
    scenario: "A radio astronomer is studying signals from a distant galaxy. She's using a 100-meter diameter radio telescope instead of a handheld antenna.",
    question: "How much more signal does the 100m telescope collect compared to a 1m dish at the same frequency?",
    options: [
      { id: 'a', label: "100 times more (proportional to diameter)" },
      { id: 'b', label: "10,000 times more (proportional to area, which is diameter squared)", correct: true },
      { id: 'c', label: "1,000,000 times more (proportional to diameter cubed)" },
      { id: 'd', label: "The same amount, just more precisely aimed" }
    ],
    explanation: "Antenna gain scales with aperture area, not diameter. Area = pi*r^2, so a 100m dish has (100/1)^2 = 10,000 times the area of a 1m dish. This translates directly to 10,000 times more signal collection and 40 dB more gain. This is why radio telescopes are enormous."
  },
  {
    scenario: "A cellular network operates at both 700 MHz and 2.6 GHz. Engineers notice that 700 MHz antennas provide wider coverage but lower data capacity, while 2.6 GHz antennas have narrower beams.",
    question: "Why do higher frequencies naturally produce narrower beams for the same antenna size?",
    options: [
      { id: 'a', label: "Higher frequencies carry more data, leaving less room for spreading" },
      { id: 'b', label: "Shorter wavelengths at higher frequencies make the antenna electrically larger, increasing directivity", correct: true },
      { id: 'c', label: "Higher frequency signals are absorbed more by air" },
      { id: 'd', label: "The antenna electronics are faster at higher frequencies" }
    ],
    explanation: "Gain depends on antenna size measured in wavelengths. A 1-meter dish at 2.6 GHz (wavelength ~12cm) is about 8 wavelengths across, while at 700 MHz (wavelength ~43cm) it's only 2.3 wavelengths across. More wavelengths across = higher gain = narrower beam. The formula: Gain proportional to (D/wavelength)^2."
  },
  {
    scenario: "A point-to-point microwave link uses 30 dBi gain antennas at both ends. The link budget shows the received power depends on the product of both antenna gains.",
    question: "If one antenna is replaced with a 20 dBi antenna, how much does the received signal drop?",
    options: [
      { id: 'a', label: "By 5 dB (half the gain difference)" },
      { id: 'b', label: "By 10 dB (the full gain reduction of one antenna)", correct: true },
      { id: 'c', label: "By 20 dB (the gain difference squared)" },
      { id: 'd', label: "No change because the other antenna compensates" }
    ],
    explanation: "In a link budget, received power = transmitted power + transmit antenna gain + receive antenna gain - path loss. Reducing one antenna from 30 dBi to 20 dBi reduces total system gain by exactly 10 dB. Decibels are logarithmic: 10 dB means 10x less power. Each antenna contributes independently."
  },
  {
    scenario: "A radar system needs to detect small aircraft at long range. The engineer is choosing between a larger antenna and a more powerful transmitter.",
    question: "Why is doubling antenna size often more effective than doubling transmitter power?",
    options: [
      { id: 'a', label: "Antennas are always cheaper than transmitters" },
      { id: 'b', label: "A larger antenna increases gain for both transmission AND reception, providing double benefit", correct: true },
      { id: 'c', label: "Transmitters have strict regulatory limits" },
      { id: 'd', label: "Larger antennas look more impressive" }
    ],
    explanation: "Radar uses the same antenna for transmit and receive. Doubling antenna area quadruples gain (area scales as diameter squared). This quadrupled gain applies twice: once on transmit (focusing more power toward target) and once on receive (collecting more reflected energy). Net effect: 16x improvement vs. only 2x from doubling transmitter power."
  },
  {
    scenario: "A drone operator notices that when the drone flies directly overhead, the signal weakens significantly even though the drone is at its closest distance.",
    question: "What causes this 'overhead null' in the signal?",
    options: [
      { id: 'a', label: "The drone's motors interfere with radio signals when overhead" },
      { id: 'b', label: "The ground station antenna has low gain directly above due to its radiation pattern shape", correct: true },
      { id: 'c', label: "Signals can't travel straight up effectively" },
      { id: 'd', label: "The drone's antenna is blocked by its own body" }
    ],
    explanation: "Antenna radiation patterns aren't spherical. A typical ground station antenna (like a vertical monopole) has a donut-shaped pattern with nulls (weak spots) directly above and below. This is because the antenna's fields cancel in those directions. Gain varies dramatically with direction - that's why radiation patterns matter."
  },
  {
    scenario: "A 5G base station uses massive MIMO with 64 antenna elements. The system can 'steer' beams toward individual users without physically moving the antenna.",
    question: "How does the antenna array create a steerable beam?",
    options: [
      { id: 'a', label: "Each element rotates mechanically toward the user" },
      { id: 'b', label: "By adjusting the phase and timing of signals to each element, creating constructive interference in the desired direction", correct: true },
      { id: 'c', label: "The array turns on only the elements facing the user" },
      { id: 'd', label: "Software filters out signals from other directions" }
    ],
    explanation: "Phased array beamforming works by controlling when each element transmits. When signals from all elements arrive 'in phase' at a particular direction, they add constructively (beam forms there). Other directions see destructive interference. By electronically adjusting phases, the beam can be steered instantly without moving parts. This is the principle behind massive MIMO."
  },
  {
    scenario: "A ham radio operator measures an antenna's gain as 6 dBi at 14 MHz. They want to know what this means in practical terms.",
    question: "What does 6 dBi gain mean for this antenna?",
    options: [
      { id: 'a', label: "It creates 6 times more electromagnetic field" },
      { id: 'b', label: "In its main beam direction, it concentrates power 4 times (about 4x) more than an isotropic radiator would", correct: true },
      { id: 'c', label: "It operates 6% more efficiently than average" },
      { id: 'd', label: "It can receive signals from 6 decibels further away" }
    ],
    explanation: "dBi means 'decibels relative to isotropic' - compared to a theoretical antenna that radiates equally in all directions. 6 dBi means 10^(6/10) = 4x power concentration in the main beam. The antenna doesn't create power; it borrows from other directions. An isotropic antenna (0 dBi) is the theoretical reference for comparing all real antennas."
  },
  {
    scenario: "A spacecraft antenna designer must choose between a 2-meter parabolic dish and a phased array of 100 small elements for a deep space mission.",
    question: "What is a key advantage of the phased array for spacecraft applications?",
    options: [
      { id: 'a', label: "Phased arrays are always lighter than dishes" },
      { id: 'b', label: "Phased arrays can maintain beam pointing without mechanical movement, improving reliability", correct: true },
      { id: 'c', label: "Phased arrays work better in vacuum" },
      { id: 'd', label: "Dishes can't achieve the same gain as phased arrays" }
    ],
    explanation: "In space, mechanical systems are reliability risks - motors can fail, bearings can seize. Phased arrays electronically steer beams with no moving parts, critical for decades-long missions. While a parabolic dish might achieve similar gain, it needs mechanical pointing. Modern spacecraft increasingly use phased arrays for their reliability and ability to form multiple beams simultaneously."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '📡',
    title: 'Satellite Communications',
    short: 'Earth-to-space connectivity',
    tagline: 'Bridging millions of miles with focused beams',
    description: 'Satellite communication relies entirely on antenna gain to make long-distance links possible. Ground stations use large parabolic dishes (30-70 dBi gain) to focus energy toward specific satellites, while satellites use shaped-beam antennas to illuminate coverage regions on Earth.',
    connection: 'Without high antenna gain, the signal would spread uselessly into space. A 10-meter ground station dish provides about 60 dBi gain at Ku-band, concentrating energy into a beam only 0.1 degrees wide - precise enough to hit a satellite 36,000 km away.',
    howItWorks: 'Parabolic reflectors focus radio waves like mirrors focus light. The dish collects energy across its entire aperture and concentrates it at the feed horn. Gain increases with the square of dish diameter, making larger dishes dramatically more capable.',
    stats: [
      { value: '70 dBi', label: 'Large ground station gain', icon: '📡' },
      { value: '36,000 km', label: 'Geostationary distance', icon: '🛰️' },
      { value: '0.1°', label: 'Typical beamwidth', icon: '🎯' }
    ],
    examples: ['Intelsat ground stations', 'Starlink user terminals', 'GPS satellites', 'Deep Space Network'],
    companies: ['Hughes', 'Viasat', 'SpaceX', 'SES'],
    futureImpact: 'Electronically steered flat-panel antennas will replace dishes, enabling satellite internet on moving vehicles and aircraft.',
    color: '#3B82F6'
  },
  {
    icon: '📱',
    title: '5G Cellular Networks',
    short: 'Massive MIMO beamforming',
    tagline: 'Thousands of beams serving millions of users',
    description: '5G networks use massive MIMO antenna arrays with 64-256 elements to create multiple simultaneous beams. Each beam follows its user, maximizing signal strength while minimizing interference to others. This spatial multiplexing dramatically increases network capacity.',
    connection: 'Traditional cell towers broadcast in all directions, wasting most energy. Beamforming concentrates energy toward each user, effectively increasing gain in that direction. A 64-element array can achieve 15-20 dB more gain than a single antenna, extending range or reducing power.',
    howItWorks: 'Digital signal processing calculates the optimal phase and amplitude for each antenna element in real-time. When properly aligned, signals add constructively toward the user and destructively elsewhere, creating a focused beam that can track moving devices.',
    stats: [
      { value: '64-256', label: 'Antenna elements per array', icon: '📶' },
      { value: '20 dB', label: 'Beamforming gain', icon: '📈' },
      { value: '100x', label: 'Capacity vs 4G', icon: '🚀' }
    ],
    examples: ['Ericsson AIR 6488', 'Nokia AirScale', 'Samsung Massive MIMO', 'Huawei AAU'],
    companies: ['Ericsson', 'Nokia', 'Samsung', 'Qualcomm'],
    futureImpact: '6G will use even larger arrays with AI-driven beamforming, potentially including reconfigurable intelligent surfaces that shape the radio environment.',
    color: '#10B981'
  },
  {
    icon: '✈️',
    title: 'Radar Systems',
    short: 'Detecting and tracking targets',
    tagline: 'Seeing through darkness and weather',
    description: 'Radar depends on antenna gain twice: once to focus transmitted power toward targets, and again to collect the tiny reflected echoes. High-gain antennas are essential because radar signals travel to the target AND back, making path loss extremely severe (proportional to range to the fourth power).',
    connection: 'The radar range equation shows detection range proportional to the fourth root of antenna gain times aperture. Doubling antenna diameter increases range by 2^(4/4) = 2x because gain improves both transmit focus and receive collection.',
    howItWorks: 'Modern radars use phased arrays to electronically scan without mechanical movement. By controlling the phase of thousands of elements, the beam can jump instantly between directions, track multiple targets, and form specialized patterns for different modes.',
    stats: [
      { value: '1000s', label: 'Elements in military arrays', icon: '🎚️' },
      { value: '400+ km', label: 'Air defense radar range', icon: '🎯' },
      { value: '<1 ms', label: 'Electronic beam steering', icon: '⚡' }
    ],
    examples: ['AEGIS SPY-1 radar', 'Airport surveillance radar', 'Weather radar (NEXRAD)', 'Automotive radar'],
    companies: ['Raytheon', 'Lockheed Martin', 'Northrop Grumman', 'L3Harris'],
    futureImpact: 'Digital beamforming radars will create thousands of simultaneous beams, enabling cognitive radar that adapts in real-time to threats and interference.',
    color: '#F59E0B'
  },
  {
    icon: '🔭',
    title: 'Radio Astronomy',
    short: 'Listening to the universe',
    tagline: 'Turning the cosmos into a laboratory',
    description: 'Radio telescopes require extreme antenna gain because cosmic radio sources are incredibly faint. The largest single dishes (like Arecibo at 305m) and interferometer arrays (like the VLA with 27 dishes) achieve gains of 70-80 dBi, detecting signals billions of times weaker than a cell phone.',
    connection: 'Radio astronomy pushed antenna technology to its limits. The signals are so weak that every fraction of a dB matters. Large collecting areas, cryogenically cooled receivers, and sophisticated signal processing combine to detect sources at the edge of the observable universe.',
    howItWorks: 'Single dishes work like satellite antennas but much larger. Interferometers combine signals from multiple dishes separated by kilometers, synthesizing an aperture the size of their maximum spacing. This achieves angular resolution impossible with single dishes.',
    stats: [
      { value: '500m', label: 'FAST telescope diameter', icon: '📡' },
      { value: '80 dBi', label: 'Effective array gain', icon: '📈' },
      { value: '13.8B ly', label: 'Observable universe', icon: '🌌' }
    ],
    examples: ['FAST (China)', 'VLA (New Mexico)', 'ALMA (Chile)', 'Event Horizon Telescope'],
    companies: ['NRAO', 'ESO', 'CSIRO', 'NAOJ'],
    futureImpact: 'The Square Kilometre Array will have collecting area of one square kilometer, opening new windows into the universe including detecting signals from the cosmic dawn.',
    color: '#8B5CF6'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const AntennaGainRenderer: React.FC<AntennaGainRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [antennaDiameter, setAntennaDiameter] = useState(1); // meters
  const [frequency, setFrequency] = useState(10); // GHz
  const [pointingAngle, setPointingAngle] = useState(0); // degrees from boresight
  const [animationFrame, setAnimationFrame] = useState(0);

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
    accent: '#3B82F6', // Blue for RF/antenna theme
    accentGlow: 'rgba(59, 130, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#94a3b8', // Slate-400 for secondary text
    textMuted: '#64748b', // Slate-500 for muted text
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

  // Calculate antenna parameters
  const wavelength = 0.3 / frequency; // c/f in meters, where c = 0.3 m*GHz
  const diameterInWavelengths = antennaDiameter / wavelength;
  const gain_linear = Math.pow(Math.PI * antennaDiameter / wavelength, 2) * 0.55; // 55% efficiency
  const gain_dBi = 10 * Math.log10(gain_linear);
  const beamwidth = 70 / diameterInWavelengths; // approximate half-power beamwidth in degrees

  // Calculate radiation pattern (simplified sinc-squared pattern)
  const calculatePattern = useCallback((angle: number) => {
    if (diameterInWavelengths < 0.5) return 1; // Below half wavelength, nearly isotropic
    const u = Math.PI * diameterInWavelengths * Math.sin(angle * Math.PI / 180);
    if (Math.abs(u) < 0.001) return 1;
    // Simplified Airy pattern for circular aperture
    const pattern = Math.pow(2 * Math.abs(Math.sin(u) / u), 2);
    return Math.max(pattern, 0.001); // Floor to prevent log(0)
  }, [diameterInWavelengths]);

  // Get pattern value at pointing angle
  const patternAtPointing = calculatePattern(pointingAngle);
  const effectiveGain_dBi = gain_dBi + 10 * Math.log10(patternAtPointing);

  // Radiation Pattern Polar Plot - plain render function (not a component)
  const renderRadiationPattern = (showBeamwidth = true, interactive = false) => {
    const size = isMobile ? 280 : 360;
    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = size / 2 - 40;

    // Generate pattern points for polar plot
    const patternPoints: { x: number; y: number; angle: number; value: number }[] = [];
    for (let angle = -180; angle <= 180; angle += 2) {
      const patternValue = calculatePattern(angle);
      const patternDb = 10 * Math.log10(patternValue);
      // Normalize: 0 dB at max radius, -30 dB at center
      const normalizedRadius = Math.max(0, (patternDb + 30) / 30) * maxRadius;
      const angleRad = (angle - 90) * Math.PI / 180; // Rotate so 0 is up
      patternPoints.push({
        x: centerX + normalizedRadius * Math.cos(angleRad),
        y: centerY + normalizedRadius * Math.sin(angleRad),
        angle,
        value: patternDb
      });
    }

    const patternPath = patternPoints.map((pt, i) =>
      `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`
    ).join(' ') + ' Z';

    // Interactive point: positioned on the main beam tip. The main beam radius
    // scales with gain (gain_dBi normalized to plot). As diameter increases, the
    // pattern concentrates more energy in the main beam, extending the tip further.
    // Map gain_dBi (range ~5 to ~45) to a radius fraction (0.3 to 1.0 of maxRadius)
    const gainFrac = Math.max(0.1, Math.min(1.0, (gain_dBi - 5) / 40));
    const interactiveRadius = gainFrac * maxRadius;
    // Place the point at the main beam direction (top = 0 degrees boresight)
    const interactivePointX = centerX + interactiveRadius * Math.sin(pointingAngle * Math.PI / 180);
    const interactivePointY = centerY - interactiveRadius * Math.cos(pointingAngle * Math.PI / 180);

    // Arrow direction indicator
    const pointingRad = (pointingAngle - 90) * Math.PI / 180;
    const arrowX = centerX + maxRadius * 1.1 * Math.cos(pointingRad);
    const arrowY = centerY + maxRadius * 1.1 * Math.sin(pointingRad);

    // Beamwidth arc
    const halfBW = beamwidth / 2;
    const bwStart = (pointingAngle - halfBW - 90) * Math.PI / 180;
    const bwEnd = (pointingAngle + halfBW - 90) * Math.PI / 180;
    const bwRadius = maxRadius * 0.5;

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          {/* Gradient for radiation pattern */}
          <radialGradient id="patternGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="0.2" />
          </radialGradient>
          {/* Linear gradient for main beam */}
          <linearGradient id="beamGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.success} stopOpacity="0.6" />
            <stop offset="100%" stopColor={colors.success} stopOpacity="0.1" />
          </linearGradient>
          {/* Glow filter for depth */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          {/* Drop shadow filter */}
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.3"/>
          </filter>
          {/* Arrow marker */}
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={colors.warning} />
          </marker>
        </defs>

        {/* Background layer group */}
        <g id="background-layer">
          <circle cx={centerX} cy={centerY} r={maxRadius * 0.3} fill={colors.accent} opacity="0.1" />
        </g>

        {/* Grid layer group */}
        <g id="grid-layer">
          {[0.25, 0.5, 0.75, 1].map((frac, i) => (
            <circle
              key={i}
              cx={centerX}
              cy={centerY}
              r={maxRadius * frac}
              fill="none"
              stroke={colors.border}
              strokeDasharray="3,3"
            />
          ))}
          {/* Cardinal direction lines */}
          {[0, 90, 180, -90].map((dir, i) => {
            const rad = (dir - 90) * Math.PI / 180;
            return (
              <line
                key={i}
                x1={centerX}
                y1={centerY}
                x2={centerX + maxRadius * Math.cos(rad)}
                y2={centerY + maxRadius * Math.sin(rad)}
                stroke={colors.border}
                strokeDasharray="3,3"
              />
            );
          })}
        </g>

        {/* Labels layer group - axis labels with physics terms */}
        <g id="labels-layer">
          <text x={centerX} y={14} fill="#e2e8f0" fontSize="12" textAnchor="middle">Angle (degrees)</text>
          <g transform={`translate(${size - 6},${centerY}) rotate(-90)`}>
            <text x={0} y={0} fill="#e2e8f0" fontSize="12" textAnchor="middle">Gain Intensity (dB)</text>
          </g>
          <text x={10} y={centerY - 14} fill="#e2e8f0" fontSize="11" textAnchor="start">-90</text>
          <text x={size - 10} y={centerY - 14} fill="#e2e8f0" fontSize="11" textAnchor="end">90</text>
          <text x={centerX} y={size - 6} fill="#e2e8f0" fontSize="11" textAnchor="middle">180</text>
          {/* Axis tick marks at edges for spatial reference */}
          <circle cx={10} cy={centerY} r={2} fill={colors.border} />
          <circle cx={size - 10} cy={centerY} r={2} fill={colors.border} />
          <circle cx={centerX} cy={10} r={2} fill={colors.border} />
          <circle cx={centerX} cy={size - 10} r={2} fill={colors.border} />
        </g>

        {/* Pattern layer group */}
        <g id="pattern-layer">
          <path
            d={patternPath}
            fill="url(#patternGradient)"
            stroke={colors.accent}
            strokeWidth="2"
            filter="url(#shadow)"
          />
          {showBeamwidth && beamwidth < 90 && (
            <path
              d={`M ${centerX} ${centerY} L ${centerX + bwRadius * Math.cos(bwStart)} ${centerY + bwRadius * Math.sin(bwStart)} A ${bwRadius} ${bwRadius} 0 0 1 ${centerX + bwRadius * Math.cos(bwEnd)} ${centerY + bwRadius * Math.sin(bwEnd)} Z`}
              fill="url(#beamGradient)"
              stroke={colors.success}
              strokeWidth="1"
              strokeDasharray="4,2"
            />
          )}
        </g>

        {/* Interactive layer group */}
        <g id="interactive-layer">
          {interactive && (
            <>
              <line
                x1={centerX}
                y1={centerY}
                x2={arrowX}
                y2={arrowY}
                stroke={colors.warning}
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
                filter="url(#glow)"
              />
              {/* Interactive point - moves with antennaDiameter via beamwidth edge */}
              <circle cx={interactivePointX} cy={interactivePointY} r={8} fill={colors.warning} filter="url(#glow)" stroke="#fff" strokeWidth={2} />
            </>
          )}
        </g>

        {/* Center marker layer group */}
        <g id="center-layer">
          <circle cx={centerX} cy={centerY} r="5" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="2" />
          <circle cx={centerX} cy={centerY} r="3" fill={colors.accent} />
        </g>
      </svg>
    );
  };

  // Navigation bar component - fixed at top with z-index
  const renderNavBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: colors.bgSecondary,
        borderBottom: `1px solid ${colors.border}`,
        zIndex: 1000,
        padding: '8px 16px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '800px',
          margin: '0 auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {canGoBack && (
              <button
                onClick={() => goToPhase(phaseOrder[currentIndex - 1])}
                style={{
                  background: 'transparent',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  minHeight: '44px',
                  minWidth: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Back"
              >
                Back
              </button>
            )}
            <span style={{ ...typo.small, color: '#e2e8f0' }}>
              {phaseLabels[phase]} ({currentIndex + 1}/{phaseOrder.length})
            </span>
          </div>
          <div style={{
            display: 'flex',
            gap: '4px',
          }}>
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{
                  width: '12px',
                  height: '12px',
                  minWidth: '12px',
                  minHeight: '12px',
                  borderRadius: '50%',
                  border: 'none',
                  background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
                  cursor: 'pointer',
                }}
                aria-label={phaseLabels[p]}
              />
            ))}
          </div>
        </div>
        {/* Progress bar */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: colors.bgPrimary,
        }}>
          <div style={{
            height: '100%',
            width: `${((currentIndex + 1) / phaseOrder.length) * 100}%`,
            background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>
    );
  };

  // Fixed footer spacer (no duplicate nav dots - nav is in header)
  const renderNavDots = () => (
    <div style={{
      height: '80px', // Spacer for fixed footer content area
    }} />
  );

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
    minHeight: '52px',
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
        padding: '80px 24px 100px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          📡🎯
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Antenna Gain & Radiation Patterns
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          A larger antenna does not create more power - it <span style={{ color: colors.accent }}>focuses</span> the same power into a narrower beam. That is the secret to reaching across oceans, into space, and through walls.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p className="text-secondary" style={{ ...typo.small, color: '#94a3b8', fontStyle: 'italic' }}>
            Gain is simply focusing. An antenna with 30 dBi gain concentrates energy 1,000 times more than spreading it equally - like a flashlight versus a bare bulb.
          </p>
          <p className="text-muted" style={{ ...typo.small, color: '#64748b', marginTop: '8px' }}>
            - RF Engineering Principle
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Begin Learning
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // Static SVG for predict phase - plain render function (not a component)
  const renderStaticRadiationPattern = () => {
    const size = isMobile ? 260 : 320;
    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = size / 2 - 40;

    // Generate a fixed pattern for 1m antenna at 10GHz
    const fixedDiameterInWavelengths = 33; // 1m at 10GHz
    const patternPoints: { x: number; y: number }[] = [];
    for (let angle = -180; angle <= 180; angle += 2) {
      const u = Math.PI * fixedDiameterInWavelengths * Math.sin(angle * Math.PI / 180);
      let patternValue = 1;
      if (Math.abs(u) >= 0.001) {
        patternValue = Math.pow(2 * Math.abs(Math.sin(u) / u), 2);
      }
      const patternDb = 10 * Math.log10(Math.max(patternValue, 0.001));
      const normalizedRadius = Math.max(0, (patternDb + 30) / 30) * maxRadius;
      const angleRad = (angle - 90) * Math.PI / 180;
      patternPoints.push({
        x: centerX + normalizedRadius * Math.cos(angleRad),
        y: centerY + normalizedRadius * Math.sin(angleRad),
      });
    }
    const patternPath = patternPoints.map((pt, i) =>
      `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`
    ).join(' ') + ' Z';

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <radialGradient id="staticPatternGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="0.2" />
          </radialGradient>
          <filter id="staticGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="staticShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.3"/>
          </filter>
        </defs>
        {/* Background group */}
        <g id="static-background">
          <circle cx={centerX} cy={centerY} r={maxRadius * 0.3} fill={colors.accent} opacity="0.1" filter="url(#staticGlow)" />
        </g>
        {/* Grid group */}
        <g id="static-grid">
          {[0.25, 0.5, 0.75, 1].map((frac, i) => (
            <circle key={i} cx={centerX} cy={centerY} r={maxRadius * frac} fill="none" stroke={colors.border} strokeDasharray="3,3" />
          ))}
        </g>
        {/* Labels group */}
        <g id="static-labels">
          <text x={centerX} y={14} fill="#e2e8f0" fontSize="12" textAnchor="middle">Angle (degrees)</text>
          <text x={centerX} y={size - 6} fill="#e2e8f0" fontSize="11" textAnchor="middle">Main Beam (0 deg)</text>
          <text x={size - 10} y={centerY - 14} fill="#e2e8f0" fontSize="11" textAnchor="end">90</text>
          <text x={10} y={centerY - 14} fill="#e2e8f0" fontSize="11" textAnchor="start">-90</text>
        </g>
        {/* Pattern group */}
        <g id="static-pattern">
          <path d={patternPath} fill="url(#staticPatternGradient)" stroke={colors.accent} strokeWidth="2" filter="url(#staticShadow)" />
        </g>
        {/* Center group */}
        <g id="static-center">
          <circle cx={centerX} cy={centerY} r="8" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="2" filter="url(#staticShadow)" />
          <circle cx={centerX} cy={centerY} r="4" fill={colors.accent} />
        </g>
      </svg>
    );
  };

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Bigger antennas amplify the signal, creating more electromagnetic energy' },
      { id: 'b', text: 'Bigger antennas focus energy into a narrower beam, concentrating power in one direction' },
      { id: 'c', text: 'Bigger antennas receive signals from more directions simultaneously' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '80px 24px 100px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: '#e2e8f0', margin: 0 }}>
              Prediction 1 of 2 - Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: '#e2e8f0', marginBottom: '24px' }}>
            Why do larger antennas have higher "gain"? What does gain actually mean?
          </h2>

          {/* Static SVG visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.small, color: '#e2e8f0', marginBottom: '16px' }}>
              Observe this radiation pattern - notice how energy is distributed
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {renderStaticRadiationPattern()}
            </div>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '16px' }}>
              The blue shape shows signal strength in each direction
            </p>
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
                  minHeight: '52px',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: prediction === opt.id ? 'white' : '#e2e8f0',
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: '#e2e8f0', ...typo.body }}>
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
              Continue to Experiment
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Radiation Pattern
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderNavBar()}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '48px',
        paddingBottom: '100px',
        paddingLeft: '24px',
        paddingRight: '24px',
      }}>

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: '#e2e8f0', marginBottom: '8px', textAlign: 'center' }}>
            Shape the Radiation Pattern
          </h2>
          <p style={{ ...typo.body, color: '#e2e8f0', textAlign: 'center', marginBottom: '16px' }}>
            Adjust antenna size to see how the beam narrows and gain increases
          </p>

          {/* Observation guidance */}
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: '#e2e8f0', margin: 0 }}>
              What to Watch: Notice how increasing antenna diameter concentrates energy in the main beam direction
            </p>
          </div>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              {renderRadiationPattern(true, true)}
            </div>

            {/* Antenna diameter slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: '#e2e8f0' }}>Antenna Diameter</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{antennaDiameter.toFixed(1)}m ({diameterInWavelengths.toFixed(1)} wavelengths)</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={antennaDiameter}
                onChange={(e) => setAntennaDiameter(parseFloat(e.target.value))}
                aria-label="Antenna Diameter"
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.accent} ${(antennaDiameter / 3) * 100}%, ${colors.border} ${(antennaDiameter / 3) * 100}%)`,
                  cursor: 'pointer',
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                }}
              />
            </div>

            {/* Pointing angle slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: '#e2e8f0' }}>Look Direction</span>
                <span style={{ ...typo.small, color: colors.warning, fontWeight: 600 }}>{pointingAngle.toFixed(0)} degrees off-axis</span>
              </div>
              <input
                type="range"
                min="-90"
                max="90"
                step="5"
                value={pointingAngle}
                onChange={(e) => setPointingAngle(parseFloat(e.target.value))}
                aria-label="Look Direction"
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                }}
              />
            </div>

            {/* Stats display */}
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
                <div style={{ ...typo.h3, color: colors.accent }}>{gain_dBi.toFixed(1)} dBi</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Peak Gain</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.success }}>{beamwidth.toFixed(1)} deg</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Beamwidth (3dB)</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{
                  ...typo.h3,
                  color: effectiveGain_dBi > gain_dBi - 3 ? colors.success : effectiveGain_dBi > gain_dBi - 10 ? colors.warning : colors.error
                }}>
                  {effectiveGain_dBi.toFixed(1)} dBi
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Gain at Angle</div>
              </div>
            </div>
          </div>

          {/* Educational content - cause-effect, definitions, real-world relevance */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.border}`,
          }}>
            <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '12px', fontWeight: 600 }}>
              Key Physics Terms
            </h4>
            <ul style={{ ...typo.small, color: '#e2e8f0', margin: 0, paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: colors.accent }}>Gain</strong> is defined as the ratio of power focused in a direction compared to an isotropic radiator. The formula is: Gain = (pi * D / wavelength)^2 * efficiency</li>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: colors.accent }}>Beamwidth</strong> is the measure of angular width where antenna gain is within 3dB of its peak</li>
              <li><strong style={{ color: colors.accent }}>Aperture</strong> refers to the effective area that captures or transmits electromagnetic waves</li>
            </ul>
          </div>

          <div style={{
            background: `${colors.warning}11`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}33`,
          }}>
            <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 600 }}>
              Cause and Effect
            </h4>
            <p style={{ ...typo.small, color: '#e2e8f0', margin: 0 }}>
              When you <strong style={{ color: colors.accent }}>increase antenna diameter</strong>, the aperture area grows with the square of diameter.
              This causes the beam to <strong style={{ color: colors.accent }}>narrow</strong> and the gain to <strong style={{ color: colors.accent }}>increase quadratically</strong>.
              Doubling the diameter quadruples the gain (+6 dB).
            </p>
          </div>

          <div style={{
            background: `${colors.success}11`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.success}33`,
          }}>
            <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 600 }}>
              Why This Matters in the Real World
            </h4>
            <p style={{ ...typo.small, color: '#e2e8f0', margin: 0 }}>
              This principle is why satellite dishes are large, why 5G uses massive antenna arrays, and why radar systems need precise aiming.
              Higher gain means longer range and better signal quality, but requires more precise pointing.
            </p>
          </div>

          {/* Discovery prompt */}
          {antennaDiameter >= 2 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: '#e2e8f0', margin: 0 }}>
                Notice how the beam gets narrower as the antenna gets larger. The gain increases because energy is concentrated!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Continue to Review
          </button>
        </div>

        {renderNavDots()}
      </div>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const correctPrediction = prediction === 'b';
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '80px 24px 100px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: '#e2e8f0', marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Antenna Gain
          </h2>

          {/* Connection to prediction */}
          <div style={{
            background: correctPrediction ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${correctPrediction ? colors.success : colors.warning}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: '#e2e8f0', margin: 0 }}>
              {correctPrediction ? (
                <>As you predicted, bigger antennas focus energy into a narrower beam. You observed this in the experiment - the pattern narrowed as diameter increased!</>
              ) : (
                <>You saw in the experiment that larger antennas don't amplify - they focus. As you noticed, the beam got narrower and gain increased because energy is concentrated, not created.</>
              )}
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              {renderRadiationPattern(true, false)}
            </div>

            <div style={{ ...typo.body, color: '#e2e8f0' }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#e2e8f0' }}>Gain = Focusing Power</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                An <span style={{ color: colors.accent }}>isotropic antenna</span> (theoretical) radiates equally in all directions - like a bare light bulb. Real antennas concentrate energy in certain directions.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <span style={{ color: colors.accent }}>Gain in dBi</span> compares to this isotropic reference. +10 dBi means 10x power concentration in the main beam.
              </p>
              <p>
                The key equation: <span style={{ color: colors.success, fontWeight: 600 }}>Gain = (pi*D/wavelength)^2 * efficiency</span>. Larger diameter OR shorter wavelength = higher gain.
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
              Key Insight
            </h3>
            <p style={{ ...typo.body, color: '#e2e8f0', margin: 0 }}>
              Antennas do not create power - they <strong>redistribute</strong> it. High gain in one direction means low gain elsewhere. This is the fundamental tradeoff: <span style={{ color: colors.warning }}>coverage vs. gain</span>.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Continue to Next Concept
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'The pattern stays the same—frequency doesn\'t affect antenna shape' },
      { id: 'b', text: 'Higher frequency = shorter wavelength = antenna is "larger" in wavelengths = narrower beam' },
      { id: 'c', text: 'Higher frequency signals travel further, so the beam appears narrower' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '80px 24px 100px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: '#e2e8f0', margin: 0 }}>
              Prediction 2 of 2 - New Variable: Frequency
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: '#e2e8f0', marginBottom: '24px' }}>
            If you double the frequency (keeping antenna size the same), what happens to the radiation pattern?
          </h2>

          {/* Static SVG for twist predict */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.small, color: '#e2e8f0', marginBottom: '12px' }}>
              Current pattern at 10 GHz - What will happen at 20 GHz?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {renderStaticRadiationPattern()}
            </div>
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
                  minHeight: '52px',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : '#e2e8f0',
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: '#e2e8f0', ...typo.body }}>
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
              Continue to Experiment
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
        padding: '80px 24px 100px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: '#e2e8f0', marginBottom: '8px', textAlign: 'center' }}>
            Frequency & Antenna Size Relationship
          </h2>
          <p style={{ ...typo.body, color: '#e2e8f0', textAlign: 'center', marginBottom: '16px' }}>
            Adjust frequency and see how it affects gain and beamwidth
          </p>

          {/* Observation guidance */}
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: '#e2e8f0', margin: 0 }}>
              What to Watch: Try changing the frequency - observe how wavelength affects the pattern
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              {renderRadiationPattern(true, false)}
            </div>

            {/* Frequency slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: '#e2e8f0' }}>Frequency</span>
                <span style={{
                  ...typo.small,
                  color: colors.warning,
                  fontWeight: 600
                }}>
                  {frequency} GHz (wavelength = {(wavelength * 100).toFixed(1)} cm)
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={frequency}
                onChange={(e) => setFrequency(parseInt(e.target.value))}
                aria-label="Frequency"
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: '#e2e8f0' }}>1 GHz (30cm)</span>
                <span style={{ ...typo.small, color: '#e2e8f0' }}>30 GHz (1cm)</span>
              </div>
            </div>

            {/* Antenna size slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: '#e2e8f0' }}>Antenna Diameter</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{antennaDiameter.toFixed(1)}m</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={antennaDiameter}
                onChange={(e) => setAntennaDiameter(parseFloat(e.target.value))}
                aria-label="Antenna Diameter"
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  touchAction: 'pan-y',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: '#e2e8f0' }}>0.1m</span>
                <span style={{ ...typo.small, color: '#e2e8f0' }}>3m</span>
              </div>
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
                <div style={{ ...typo.h3, color: colors.accent }}>{diameterInWavelengths.toFixed(1)}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Diameter in Wavelengths</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.success }}>{gain_dBi.toFixed(1)} dBi</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Antenna Gain</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Continue to Review
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
        padding: '80px 24px 100px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: '#e2e8f0', marginBottom: '24px', textAlign: 'center' }}>
            The Wavelength Connection
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📏</span>
                <h3 style={{ ...typo.h3, color: '#e2e8f0', margin: 0 }}>Size in Wavelengths</h3>
              </div>
              <p style={{ ...typo.body, color: '#e2e8f0', margin: 0 }}>
                What matters is antenna size <span style={{ color: colors.accent }}>measured in wavelengths</span>, not physical size. A 1m dish at 10 GHz (3cm wavelength) is 33 wavelengths across. At 1 GHz (30cm), it's only 3.3 wavelengths.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📐</span>
                <h3 style={{ ...typo.h3, color: '#e2e8f0', margin: 0 }}>Aperture Formula</h3>
              </div>
              <p style={{ ...typo.body, color: '#e2e8f0', margin: 0 }}>
                <code style={{ color: colors.warning, background: colors.bgSecondary, padding: '2px 6px', borderRadius: '4px' }}>
                  Gain = (4*pi*A) / wavelength^2
                </code><br/>
                The effective aperture A relates to how much wavefront the antenna captures. Smaller wavelength = more wavelengths fit across = higher gain.
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
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>The Tradeoff</h3>
              </div>
              <p style={{ ...typo.body, color: '#e2e8f0', margin: 0 }}>
                <strong>Higher gain = narrower beam = harder to aim.</strong> A 60 dBi antenna might have a 0.1-degree beamwidth—miss by that much and you lose the signal entirely. This is why satellite dishes need precise alignment and tracking systems.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Continue to Applications
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
        padding: '80px 24px 100px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: '#e2e8f0', marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.small, color: '#e2e8f0', textAlign: 'center', marginBottom: '24px' }}>
            Application {selectedApp + 1} of {realWorldApps.length} - Explore all to continue
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
                  minHeight: '52px',
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
                    +
                  </div>
                )}
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
                <div style={{ ...typo.small, color: '#e2e8f0', fontWeight: 500 }}>
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
                <h3 style={{ ...typo.h3, color: '#e2e8f0', margin: 0 }}>{app.title}</h3>
                <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ ...typo.body, color: '#e2e8f0', marginBottom: '16px' }}>
              {app.description}
            </p>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                How Antenna Gain Matters:
              </h4>
              <p style={{ ...typo.small, color: '#e2e8f0', margin: 0 }}>
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
                  <div style={{ ...typo.small, color: '#e2e8f0' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Got It button for each app */}
          <button
            onClick={() => {
              playSound('click');
              const newCompleted = [...completedApps];
              newCompleted[selectedApp] = true;
              setCompletedApps(newCompleted);
              // Auto-advance to next unviewed app or stay
              if (selectedApp < realWorldApps.length - 1 && !completedApps[selectedApp + 1]) {
                setSelectedApp(selectedApp + 1);
              }
            }}
            style={{
              ...primaryButtonStyle,
              width: '100%',
              marginBottom: '16px',
              background: completedApps[selectedApp] ? colors.success : `linear-gradient(135deg, ${colors.accent}, #2563EB)`,
            }}
          >
            {completedApps[selectedApp] ? 'Got It - Completed' : 'Got It - Mark as Read'}
          </button>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%', background: `linear-gradient(135deg, ${colors.success}, #059669)` }}
            >
              Continue to Knowledge Test
            </button>
          )}

          {!allAppsCompleted && (
            <p style={{ ...typo.small, color: '#e2e8f0', textAlign: 'center' }}>
              {completedCount} of {realWorldApps.length} applications viewed
            </p>
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
          padding: '80px 24px 100px',
          overflowY: 'auto',
        }}>
          {renderNavBar()}

          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🏆' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: '#e2e8f0', margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: '#e2e8f0', marginBottom: '32px' }}>
              {passed
                ? 'You\'ve mastered Antenna Gain and Radiation Patterns!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Continue to Completion
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
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '80px 24px 100px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.h3, color: '#e2e8f0' }}>
              Q{currentQuestion + 1}: Question {currentQuestion + 1} of 10
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
            <p style={{ ...typo.small, color: '#e2e8f0', margin: 0 }}>
              {question.scenario}
            </p>
          </div>

          {/* Question */}
          <h3 style={{ ...typo.h3, color: '#e2e8f0', marginBottom: '20px' }}>
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
                  minHeight: '52px',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : '#e2e8f0',
                  textAlign: 'center',
                  lineHeight: '24px',
                  marginRight: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: '#e2e8f0', ...typo.small }}>
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
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  minHeight: '52px',
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
                  minHeight: '52px',
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
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '52px',
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
        padding: '80px 24px 100px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderNavBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          📡
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Antenna Gain Expert!
        </h1>

        <p style={{ ...typo.body, color: '#e2e8f0', maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how antennas focus electromagnetic energy and why gain is fundamental to all wireless systems.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: '#e2e8f0', marginBottom: '16px' }}>
            You Learned:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Gain = focusing power, not amplification',
              'Larger aperture = narrower beam = higher gain',
              'Gain measured in dBi vs isotropic reference',
              'Wavelength and frequency relationship',
              'Coverage vs. gain tradeoff',
              'Real applications: satellites, 5G, radar, radio astronomy',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>+</span>
                <span style={{ ...typo.small, color: '#e2e8f0' }}>{item}</span>
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
              color: '#e2e8f0',
              cursor: 'pointer',
              minHeight: '52px',
            }}
          >
            Play Again
          </button>
          <a
            href="/"
            style={{
              ...primaryButtonStyle,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
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

export default AntennaGainRenderer;
