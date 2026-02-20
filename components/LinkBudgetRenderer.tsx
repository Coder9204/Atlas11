'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// GAME 197: LINK BUDGET CALCULATION
// Physics: Link Budget = P_tx + G_tx - FSPL + G_rx - System Losses
// Free Space Path Loss: FSPL = 20*log10(d) + 20*log10(f) + 20*log10(4*pi/c)
// ============================================================================

interface GameEvent {
  type: 'phase_change' | 'prediction' | 'interaction' | 'completion';
  phase?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface LinkBudgetRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility
const playSound = (type: 'click' | 'success' | 'error' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const frequencies: Record<string, number> = { click: 600, success: 800, error: 300, transition: 500, complete: 900 };
    oscillator.frequency.value = frequencies[type] || 440;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch { /* Audio not available */ }
};

// Phase type definition
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "A satellite engineer is designing a communication link for a LEO satellite at 400 km altitude. The system requires reliable data transmission.",
    question: "What is the primary purpose of a link budget calculation?",
    options: [
      { id: 'a', label: "To determine the color of the satellite", correct: false },
      { id: 'b', label: "To ensure reliable communication with adequate signal margin", correct: true },
      { id: 'c', label: "To calculate the satellite's orbital period", correct: false },
      { id: 'd', label: "To measure the satellite's mass", correct: false }
    ],
    explanation: "A link budget calculation ensures the received signal has sufficient margin above the noise floor for reliable communication. It accounts for all gains and losses in the signal path."
  },
  {
    scenario: "An engineer notices that moving from L-band (1.5 GHz) to Ka-band (30 GHz) significantly impacts the link budget despite using the same distance.",
    question: "Free Space Path Loss increases with:",
    options: [
      { id: 'a', label: "Higher frequency and greater distance", correct: true },
      { id: 'b', label: "Lower frequency and shorter distance", correct: false },
      { id: 'c', label: "Higher antenna gain only", correct: false },
      { id: 'd', label: "Atmospheric pressure changes", correct: false }
    ],
    explanation: "FSPL = 20*log10(d) + 20*log10(f) + constant. Both distance and frequency appear in the equation, so increasing either increases path loss. Doubling frequency or distance adds ~6 dB loss."
  },
  {
    scenario: "A ground station operator is optimizing the uplink to a geostationary satellite at 36,000 km.",
    question: "What does EIRP stand for?",
    options: [
      { id: 'a', label: "Electronic Infrared Radiation Power", correct: false },
      { id: 'b', label: "Effective Isotropic Radiated Power", correct: true },
      { id: 'c', label: "External Input Radio Protocol", correct: false },
      { id: 'd', label: "Elevated Integrated Radio Platform", correct: false }
    ],
    explanation: "EIRP = Transmitter Power + Antenna Gain. It represents the power that would be needed from an isotropic antenna to produce the same signal strength in the peak direction."
  },
  {
    scenario: "A drone communication link works well at 1 km range. The operator wants to extend the range to 2 km using the same equipment.",
    question: "Doubling the distance in a link budget:",
    options: [
      { id: 'a', label: "Adds approximately 6 dB to path loss", correct: true },
      { id: 'b', label: "Has no effect on path loss", correct: false },
      { id: 'c', label: "Reduces path loss by half", correct: false },
      { id: 'd', label: "Adds exactly 3 dB to path loss", correct: false }
    ],
    explanation: "Path loss follows the inverse square law. Doubling distance means 4x the spreading loss, which equals 10*log10(4) = 6 dB additional loss. This is why FSPL has 20*log10(d)."
  },
  {
    scenario: "NASA's Deep Space Network uses 70-meter dish antennas to communicate with spacecraft billions of kilometers away.",
    question: "Why do satellite communication systems use high-gain antennas?",
    options: [
      { id: 'a', label: "To make the antenna look impressive", correct: false },
      { id: 'b', label: "To compensate for enormous path losses over vast distances", correct: true },
      { id: 'c', label: "To reduce the satellite's weight", correct: false },
      { id: 'd', label: "To change the signal frequency", correct: false }
    ],
    explanation: "High-gain antennas focus signal energy like a flashlight beam. A 40 dBi antenna provides 10,000x power concentration in its main beam direction, essential for overcoming massive space path losses."
  },
  {
    scenario: "A satellite link has been designed with 10 dB of link margin above the minimum required SNR for reliable demodulation.",
    question: "What is link margin?",
    options: [
      { id: 'a', label: "The extra signal strength above the minimum required", correct: true },
      { id: 'b', label: "The physical size of the antenna", correct: false },
      { id: 'c', label: "The distance between satellites", correct: false },
      { id: 'd', label: "The power consumption of the transmitter", correct: false }
    ],
    explanation: "Link margin is the safety buffer - the amount by which received signal strength exceeds the minimum required for reliable communication. It accounts for rain fade, pointing errors, and equipment aging."
  },
  {
    scenario: "An engineer is analyzing the FSPL formula: FSPL = 20*log10(d) + 20*log10(f) + 92.45 dB (with d in km, f in GHz).",
    question: "The formula shows that path loss:",
    options: [
      { id: 'a', label: "Is independent of frequency", correct: false },
      { id: 'b', label: "Increases logarithmically with both distance and frequency", correct: true },
      { id: 'c', label: "Decreases with distance", correct: false },
      { id: 'd', label: "Only depends on transmitter power", correct: false }
    ],
    explanation: "Both distance and frequency terms have the 20*log10() factor, meaning each doubling adds 6 dB. Path loss scales with the square of both distance and frequency in linear terms."
  },
  {
    scenario: "Starlink operates at ~550 km altitude while traditional TV satellites operate at 36,000 km (GEO). Both must deliver reliable signals to user terminals.",
    question: "A GEO satellite has much higher path loss than a LEO satellite because:",
    options: [
      { id: 'a', label: "GEO satellites are older technology", correct: false },
      { id: 'b', label: "Path loss follows inverse square law - 65x more distance means huge loss increase", correct: true },
      { id: 'c', label: "GEO satellites use weaker transmitters", correct: false },
      { id: 'd', label: "The atmosphere is thicker at GEO altitude", correct: false }
    ],
    explanation: "At 65x the distance, path loss increases by 20*log10(65) = 36 dB! This is why GEO satellites need much larger antennas and higher power to achieve similar link budgets as LEO constellations."
  },
  {
    scenario: "The Voyager 1 spacecraft communicates with Earth using S-band (2.3 GHz) rather than higher frequencies despite lower bandwidth.",
    question: "Why might you choose a lower frequency for deep space communications?",
    options: [
      { id: 'a', label: "Lower frequencies are more colorful", correct: false },
      { id: 'b', label: "Lower FSPL, but at the cost of lower data rates", correct: true },
      { id: 'c', label: "Higher frequencies cannot travel through space", correct: false },
      { id: 'd', label: "Deep space probes only receive AM radio", correct: false }
    ],
    explanation: "Lower frequencies have less free space path loss (20*log10(f) is smaller). However, available bandwidth is proportional to frequency, so lower frequencies mean lower data rates. It's an engineering tradeoff."
  },
  {
    scenario: "A ground station upgrade replaces a 10-meter dish with a 20-meter dish, doubling the diameter.",
    question: "What happens to the link budget if you increase receiver antenna gain by 6 dB?",
    options: [
      { id: 'a', label: "Received power increases by 6 dB, improving the link", correct: true },
      { id: 'b', label: "Path loss increases by 6 dB", correct: false },
      { id: 'c', label: "The transmitter power doubles", correct: false },
      { id: 'd', label: "The signal frequency changes", correct: false }
    ],
    explanation: "Antenna gain directly adds to received power in the link budget equation: P_rx = EIRP - FSPL + G_rx. Doubling dish diameter quadruples area, giving 6 dB more gain and 6 dB better link margin."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🛰',
    title: 'Satellite Communications',
    short: 'Satcom',
    tagline: 'Every decibel counts in space',
    description: 'Communication satellites orbit 36,000 km above Earth, making link budget calculations critical. Engineers must ensure signals arrive with sufficient strength after path losses exceeding 200 dB.',
    connection: 'The link budget equation directly determines whether a satellite link works. Free space path loss increases with distance squared, requiring high-gain antennas and powerful transmitters for geostationary orbits.',
    howItWorks: 'Ground stations use large dish antennas (10-30m) for high gain. Satellites use spot beams to concentrate power. Link margins account for rain fade, atmospheric absorption, and equipment degradation.',
    stats: [
      { value: '200+ dB', label: 'Path loss', icon: '📡' },
      { value: '10+ Gbps', label: 'Throughput', icon: '📈' },
      { value: '$270B', label: 'Satcom market', icon: '💰' }
    ],
    examples: ['Starlink LEO constellation', 'Inmarsat maritime', 'DirecTV broadcasting', 'GPS navigation'],
    companies: ['SpaceX', 'Viasat', 'SES', 'Intelsat'],
    futureImpact: 'LEO mega-constellations will reduce path losses and latency, enabling satellite internet competitive with terrestrial fiber.',
    color: '#8B5CF6'
  },
  {
    icon: '🔭',
    title: 'Deep Space Networks',
    short: 'Deep Space',
    tagline: 'Whispering across the solar system',
    description: 'NASA\'s Deep Space Network communicates with probes billions of kilometers away. At these distances, received signals are unimaginably weak - often less than a billionth of a billionth of a watt.',
    connection: 'Deep space links push link budget principles to extremes. Free space path loss to Mars can exceed 280 dB. Only massive ground antennas (70m dishes), cryogenic receivers, and sophisticated coding make communication possible.',
    howItWorks: 'DSN uses 34m and 70m antennas worldwide. Cryogenic receivers minimize noise temperature. Error-correcting codes extract signals below the noise floor. Missions plan data rates based on link budget at maximum distance.',
    stats: [
      { value: '280 dB', label: 'Mars path loss', icon: '🔴' },
      { value: '20 hours', label: 'Voyager roundtrip', icon: '⏱' },
      { value: '160 bps', label: 'Voyager rate', icon: '📊' }
    ],
    examples: ['Mars rovers', 'Voyager 1 and 2', 'New Horizons', 'James Webb Space Telescope'],
    companies: ['NASA JPL', 'ESA', 'JAXA', 'ISRO'],
    futureImpact: 'Optical deep space links using lasers will provide 10-100x higher data rates than radio, enabling high-definition video from Mars.',
    color: '#3B82F6'
  },
  {
    icon: '📶',
    title: '5G Wireless Networks',
    short: '5G mmWave',
    tagline: 'Millimeter waves meet link budgets',
    description: '5G networks use millimeter wave frequencies (24-100 GHz) for high bandwidth but face challenging link budgets. Higher frequencies have greater path loss and don\'t penetrate buildings well.',
    connection: 'Free space path loss increases with frequency squared. 5G at 28 GHz has 10x the path loss of 4G at 2.8 GHz for the same distance, requiring compensating antenna gains and denser cell sites.',
    howItWorks: 'Base stations use massive MIMO arrays with 64-256 elements to create focused beams. Beamforming concentrates energy toward users, adding 15-20 dB effective gain. Small cells provide coverage in challenging locations.',
    stats: [
      { value: '10 Gbps', label: 'Peak rate', icon: '⚡' },
      { value: '1 ms', label: 'Latency', icon: '🚀' },
      { value: '$700B', label: '5G investment', icon: '💰' }
    ],
    examples: ['Urban 5G networks', 'Fixed wireless access', 'Stadium connectivity', 'Industrial IoT'],
    companies: ['Ericsson', 'Nokia', 'Samsung', 'Huawei'],
    futureImpact: '6G will use sub-THz frequencies, pushing link budget engineering to even higher frequencies and requiring even more sophisticated beamforming.',
    color: '#10B981'
  },
  {
    icon: '📻',
    title: 'Radio Astronomy',
    short: 'Radio Telescopes',
    tagline: 'Detecting whispers from galaxies',
    description: 'Radio telescopes detect incredibly weak signals from astronomical sources. Link budget concepts apply in reverse - calculating the sensitivity needed to detect natural emissions from cosmic sources.',
    connection: 'Radio astronomy applies link budget principles to natural sources. The "transmitter" is a distant galaxy; path loss is cosmological. Telescope sensitivity must exceed the link budget deficit to detect the signal.',
    howItWorks: 'Large dish antennas (up to 500m) maximize collecting area. Cryogenic receivers minimize noise. Interferometry combines multiple telescopes for greater resolution. Integration time trades speed for sensitivity.',
    stats: [
      { value: '500m', label: 'FAST diameter', icon: '📡' },
      { value: '10^-26 W', label: 'Detection limit', icon: '🔬' },
      { value: '$1.5B', label: 'SKA cost', icon: '💰' }
    ],
    examples: ['ALMA in Chile', 'VLA in New Mexico', 'FAST in China', 'SKA under construction'],
    companies: ['NRAO', 'ESO', 'CSIRO', 'MPIfR'],
    futureImpact: 'The Square Kilometre Array will have unprecedented sensitivity, potentially detecting radio emissions from exoplanets.',
    color: '#F59E0B'
  }
];

// Colors
const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#e2e8f0',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#06b6d4',
  accentGlow: 'rgba(6, 182, 212, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  signal: '#22d3ee',
  transmitter: '#fbbf24',
  receiver: '#3b82f6',
};

const LinkBudgetRenderer: React.FC<LinkBudgetRendererProps> = ({ onGameEvent, gamePhase }) => {
  // Phase order and labels
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Hook',
    predict: 'Predict',
    play: 'Play',
    review: 'Review',
    twist_predict: 'Twist',
    twist_play: 'Explore',
    twist_review: 'Insight',
    transfer: 'Transfer',
    test: 'Test',
    mastery: 'Mastery',
  };

  // Get initial phase
  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  // State management
  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [isMobile, setIsMobile] = useState(false);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state
  const [distance, setDistance] = useState(400); // km
  const [frequency, setFrequency] = useState(10); // GHz
  const [txPower, setTxPower] = useState(10); // dBW
  const [txGain, setTxGain] = useState(40); // dBi
  const [rxGain, setRxGain] = useState(30); // dBi
  const [animPhase, setAnimPhase] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Sync phase with gamePhase prop
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
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

  // Physics calculations
  const calculateLinkBudget = useCallback(() => {
    // Free Space Path Loss (dB)
    // FSPL = 20*log10(d_km) + 20*log10(f_GHz) + 92.45 dB
    const fspl = 20 * Math.log10(distance) + 20 * Math.log10(frequency) + 92.45;

    // EIRP (Effective Isotropic Radiated Power)
    const eirp = txPower + txGain;

    // Received Power
    const rxPower = eirp - fspl + rxGain;

    // Noise floor (typical for satellite receiver)
    const noiseFloor = -120; // dBm

    // Signal to Noise Ratio
    const snr = rxPower - noiseFloor;

    // Link margin (assuming required SNR of 10 dB for reliable comms)
    const requiredSnr = 10;
    const margin = snr - requiredSnr;

    return {
      fspl: fspl.toFixed(1),
      eirp: eirp.toFixed(1),
      rxPower: rxPower.toFixed(1),
      snr: snr.toFixed(1),
      margin: margin.toFixed(1),
      linkStatus: margin > 0 ? 'GOOD' : 'MARGINAL',
      marginValue: margin
    };
  }, [distance, frequency, txPower, txGain, rxGain]);

  const budget = calculateLinkBudget();

  // Emit game event helper
  const emitGameEvent = useCallback((type: GameEvent['type'], data?: Record<string, unknown>) => {
    if (onGameEvent) {
      onGameEvent({ type, phase, data, timestamp: Date.now() });
    }
  }, [onGameEvent, phase]);

  // Navigation functions
  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;
    lastClickRef.current = now;
    isNavigating.current = true;

    playSound('transition');
    setPhase(p);
    emitGameEvent('phase_change', {
      from: phase,
      to: p,
      label: phaseLabels[p],
      index: phaseOrder.indexOf(p)
    });

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [emitGameEvent, phase, phaseLabels, phaseOrder]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, phaseOrder, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, phaseOrder, goToPhase]);

  // Test handlers
  const handleTestAnswer = (questionIndex: number, answerId: string) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerId;
    setTestAnswers(newAnswers);
    playSound('click');
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      const correctOption = q.options.find(o => o.correct);
      if (testAnswers[i] === correctOption?.id) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    playSound(score >= 7 ? 'success' : 'error');
    emitGameEvent('completion', { score, total: 10 });
  };

  // Prediction options
  const predictions = [
    { id: 'power', label: 'Simply increasing transmitter power to megawatts' },
    { id: 'antenna', label: 'High-gain antennas that focus the signal like a flashlight beam' },
    { id: 'frequency', label: 'Using very low frequencies that travel farther' },
    { id: 'repeaters', label: 'Signal repeaters floating in space along the path' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Path loss stays the same - frequency does not affect it' },
    { id: 'less_loss', label: 'Higher frequencies have LESS path loss (they penetrate better)' },
    { id: 'more_loss', label: 'Higher frequencies have MORE path loss (FSPL increases with f)' },
    { id: 'unpredictable', label: 'It varies randomly depending on space weather' },
  ];

  // Generate star positions
  const starPositions = React.useMemo(() => {
    const stars = [];
    for (let i = 0; i < 40; i++) {
      stars.push({
        cx: (i * 137.5) % 500,
        cy: ((i * 89.3) % 180) + 10,
        r: ((i * 7.3) % 1.5) + 0.5,
        opacity: ((i * 11.7) % 0.5) + 0.3,
        twinkleOffset: i * 36
      });
    }
    return stars;
  }, []);

  // Progress bar component
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: colors.bgDark,
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                onClick={() => i <= currentIdx && goToPhase(p)}
                style={{
                  height: '8px',
                  width: i === currentIdx ? '24px' : '8px',
                  borderRadius: '5px',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
                  cursor: i <= currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s',
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textSecondary }}>
            {currentIdx + 1} / {phaseOrder.length}
          </span>
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          background: `${colors.accent}20`,
          color: colors.accent,
          fontSize: '11px',
          fontWeight: 700
        }}>
          {phaseLabels[phase]}
        </div>
      </div>
    );
  };

  // Navigation dots
  const renderNavDots = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        padding: '16px',
      }}>
        {phaseOrder.map((p, i) => (
          <button
            key={p}
            onClick={() => goToPhase(p)}
            style={{
              width: i === currentIdx ? '24px' : '10px',
              height: '10px',
              borderRadius: '5px',
              border: 'none',
              background: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
              cursor: 'pointer',
              transition: 'all 0.3s',
              WebkitTapHighlightColor: 'transparent',
            }}
            title={phaseLabels[p]}
          />
        ))}
      </div>
    );
  };

  // Bottom bar with navigation
  const renderBottomBar = (canProceed: boolean, buttonText: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = currentIdx > 0;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: colors.bgDark,
        gap: '12px',
      }}>
        <button
          onClick={goBack}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '14px',
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            color: colors.textSecondary,
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '44px',
            WebkitTapHighlightColor: 'transparent',
            transition: 'all 0.3s ease',
          }}
          disabled={!canBack}
        >
          Back
        </button>

        <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>

        <button
          onClick={onNext || goNext}
          disabled={!canProceed}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '14px',
            background: canProceed ? `linear-gradient(135deg, ${colors.accent} 0%, #0891b2 100%)` : 'rgba(30, 41, 59, 0.9)',
            color: canProceed ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            opacity: canProceed ? 1 : 0.4,
            boxShadow: canProceed ? `0 2px 12px ${colors.accentGlow}` : 'none',
            minHeight: '44px',
            WebkitTapHighlightColor: 'transparent',
            transition: 'all 0.3s ease',
          }}
        >
          {buttonText}
        </button>
      </div>
    );
  };

  // Wrapper for phase content
  const wrapPhaseContent = (content: React.ReactNode, bottomBarContent?: React.ReactNode) => (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      background: colors.bgPrimary,
      color: colors.textPrimary,
      minHeight: '100vh',
    }}>
      <div style={{ flexShrink: 0 }}>{renderProgressBar()}</div>
      <div style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingTop: '48px' }}>
        {content}
      </div>
      {bottomBarContent && <div style={{ flexShrink: 0 }}>{bottomBarContent}</div>}
    </div>
  );

  // Link Budget Visualization
  const renderVisualization = () => {
    const waveOffset = animPhase * 2;
    const marginValue = parseFloat(budget.margin);
    const signalStrength = Math.max(0, Math.min(100, (marginValue + 30) * 2));

    return (
      <svg viewBox="0 0 520 480" style={{ width: '100%', maxWidth: '600px', height: 'auto', transition: 'all 0.3s ease' }}>
        <defs>
          <linearGradient id="lnkbSpaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>
          <linearGradient id="lnkbSolarPanel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <radialGradient id="lnkbTxGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="lnkbRxGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lnkbStrengthGood" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>
          <linearGradient id="lnkbStrengthBad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>
          <filter id="lnkbGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width="520" height="480" fill="url(#lnkbSpaceGrad)" />

        {/* Stars */}
        {starPositions.map((star, i) => (
          <circle
            key={i}
            cx={star.cx}
            cy={star.cy * 1.4}
            r={star.r}
            fill="#ffffff"
            opacity={star.opacity * (0.7 + 0.3 * Math.sin((animPhase + star.twinkleOffset) * 0.05))}
          />
        ))}

        {/* Earth */}
        <g transform="translate(410, 340)">
          <ellipse cx="0" cy="0" rx="90" ry="55" fill="#1d4ed8" opacity="0.3" />
          <ellipse cx="0" cy="0" rx="80" ry="50" fill="#2563eb" />
          <ellipse cx="-15" cy="-15" rx="35" ry="15" fill="#22c55e" opacity="0.5" transform="rotate(-15)" />
        </g>

        {/* Satellite (decorative only - text placed absolutely below) */}
        <g transform="translate(70, 55)">
          <ellipse cx="0" cy="18" rx="20" ry="12" fill="url(#lnkbTxGlow)" opacity={0.5 + 0.3 * Math.sin(animPhase * 0.1)} />
          <rect x="-18" y="-10" width="36" height="20" fill="#475569" rx="3" stroke="#94a3b8" strokeWidth="0.5" />
          <rect x="-50" y="-6" width="30" height="12" fill="url(#lnkbSolarPanel)" rx="1" />
          <rect x="20" y="-6" width="30" height="12" fill="url(#lnkbSolarPanel)" rx="1" />
          <ellipse cx="0" cy="16" rx="10" ry="4" fill="#fbbf24" filter="url(#lnkbGlow)" />
        </g>
        {/* Satellite text - absolute coords (70+0=70, 55-24=31) and (70+0=70, 55+42=97) */}
        <text x="70" y="31" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="600">SATELLITE TX</text>
        <text x="70" y="110" textAnchor="middle" fill="#fbbf24" fontSize="11">{txPower} dBW | {txGain} dBi</text>

        {/* Signal Path - large arcing wave for vertical space */}
        <line x1="95" y1="120" x2="360" y2="280" stroke="#475569" strokeWidth="1" strokeDasharray="6,4" opacity="0.5" />
        {/* Signal wave - large vertical amplitude for 25%+ utilization */}
        <path
          d={`M 95 120 Q 150 ${120 - 130 + Math.sin(waveOffset * 0.02) * 20} 190 190 Q 230 ${190 + 130 + Math.sin(waveOffset * 0.03) * 15} 280 230 Q 320 ${230 - 110 + Math.sin(waveOffset * 0.025) * 10} 360 280`}
          stroke="#22d3ee"
          strokeWidth="2.5"
          fill="none"
          opacity="0.6"
          filter="url(#lnkbGlow)"
        />
        {[0, 1, 2, 3, 4].map(i => {
          const progress = ((waveOffset / 60) + i * 0.2) % 1;
          const x = 95 + progress * 265;
          const y = 120 + progress * 160;
          const opacity = 0.9 - progress * 0.6;
          const scale = 1 - progress * 0.3;
          return (
            <circle key={i} cx={x} cy={y} r={4 * scale} fill="#22d3ee" opacity={opacity} filter="url(#lnkbGlow)" />
          );
        })}
        {/* Distance label */}
        <rect x="194" y="153" width="92" height="24" fill="#0f172a" rx="5" stroke="#334155" />
        <text x="240" y="170" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="700">Distance: {distance.toLocaleString()} km</text>
        {/* FSPL label */}
        <rect x="184" y="228" width="112" height="24" fill="rgba(239,68,68,0.15)" rx="4" stroke="#ef4444" strokeWidth="0.5" />
        <text x="240" y="245" textAnchor="middle" fill="#f87171" fontSize="11">FSPL: -{budget.fspl} dB</text>

        {/* Ground Station (decorative only - text placed absolutely below) */}
        <g transform="translate(370, 290)">
          <ellipse cx="0" cy="-45" rx="20" ry="12" fill="url(#lnkbRxGlow)" opacity={0.4 + 0.2 * Math.sin(animPhase * 0.08)} />
          <rect x="-20" y="0" width="40" height="30" fill="#374151" rx="3" stroke="#475569" strokeWidth="0.5" />
          <rect x="-14" y="6" width="6" height="5" fill="#fbbf24" opacity="0.5" rx="1" />
          <rect x="-4" y="6" width="6" height="5" fill="#fbbf24" opacity="0.4" rx="1" />
          <rect x="6" y="6" width="6" height="5" fill="#fbbf24" opacity="0.5" rx="1" />
          <polygon points="0,0 -30,-40 30,-40" fill="#374151" stroke="#64748b" strokeWidth="0.5" />
          <ellipse cx="0" cy="-48" rx="25" ry="10" fill="#3b82f6" stroke="#93c5fd" filter="url(#lnkbGlow)" />
          <line x1="0" y1="-48" x2="0" y2="-62" stroke="#60a5fa" strokeWidth="2" />
          <circle cx="0" cy="-62" r="2.5" fill="#93c5fd" />
        </g>
        {/* Ground station text - absolute coords (370, 290+48=338) and (370, 290+66=356) */}
        <text x="370" y="340" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="600">GROUND RX</text>
        <text x="370" y="358" textAnchor="middle" fill="#22d3ee" fontSize="11">{rxGain} dBi Gain</text>

        {/* Signal Strength panel (decorative) */}
        <g transform="translate(355, 15)">
          <rect x="0" y="0" width="155" height="40" fill="#1e293b" rx="8" stroke="#334155" />
          <rect x="8" y="22" width="139" height="12" fill="#0f172a" rx="4" />
          <rect x="10" y="24" width={Math.max(0, (signalStrength / 100) * 135)} height="8" fill={marginValue > 0 ? "url(#lnkbStrengthGood)" : "url(#lnkbStrengthBad)"} rx="3" />
        </g>
        {/* Signal strength text - absolute: (355+78=433, 15+15=30) */}
        <text x="433" y="30" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">SIGNAL STRENGTH</text>

        {/* Link Budget Panel (decorative background) */}
        <g transform="translate(10, 150)">
          <rect x="0" y="0" width="145" height="202" fill="#1e293b" rx="8" stroke="#334155" />
          <rect x="0" y="0" width="145" height="28" fill="rgba(6,182,212,0.15)" rx="8" />
          <rect x="0" y="14" width="145" height="14" fill="rgba(6,182,212,0.15)" />
          <line x1="8" y1="32" x2="137" y2="32" stroke="#334155" />
          <line x1="10" y1="118" x2="135" y2="118" stroke="#475569" strokeDasharray="3,2" />
          <rect x="10" y="170" width="125" height="22" fill={marginValue > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'} rx="5" stroke={marginValue > 0 ? '#22c55e' : '#ef4444'} />
          <circle cx="24" cy="181" r="4" fill={marginValue > 0 ? '#22c55e' : '#ef4444'} opacity={0.7 + 0.3 * Math.sin(animPhase * 0.15)} />
        </g>
        {/* Link Budget text - all absolute coords (add 10 to x, 150 to y from local positions) */}
        <text x="82" y="169" textAnchor="middle" fill="#22d3ee" fontSize="12" fontWeight="700">LINK BUDGET</text>
        <text x="20" y="202" fill="#94a3b8" fontSize="11">EIRP</text>
        <text x="145" y="202" textAnchor="end" fill="#22c55e" fontSize="11" fontWeight="600">+{budget.eirp} dBW</text>
        <text x="20" y="224" fill="#94a3b8" fontSize="11">Loss</text>
        <text x="145" y="224" textAnchor="end" fill="#ef4444" fontSize="11" fontWeight="600">-{budget.fspl} dB</text>
        <text x="20" y="246" fill="#94a3b8" fontSize="11">RxG</text>
        <text x="145" y="246" textAnchor="end" fill="#22c55e" fontSize="11" fontWeight="600">+{rxGain} dBi</text>
        <text x="20" y="282" fill="#94a3b8" fontSize="11">RxP</text>
        <text x="145" y="282" textAnchor="end" fill="#60a5fa" fontSize="11" fontWeight="600">{budget.rxPower} dBm</text>
        <text x="20" y="306" fill="#94a3b8" fontSize="11">Mgn</text>
        <text x="145" y="306" textAnchor="end" fill={marginValue > 0 ? '#22c55e' : '#ef4444'} fontSize="12" fontWeight="700">{marginValue > 0 ? '+' : ''}{budget.margin} dB</text>
        <text x="82" y="338" textAnchor="middle" fill={marginValue > 0 ? '#22c55e' : '#ef4444'} fontSize="12" fontWeight="700">{budget.linkStatus}</text>

        {/* Frequency */}
        <rect x="188" y="441" width="144" height="28" fill="#1e293b" rx="5" stroke="#334155" />
        <text x="260" y="460" textAnchor="middle" fill="#a855f7" fontSize="12" fontWeight="600">Frequency: {frequency} GHz</text>
      </svg>
    );
  };

  // Controls
  const renderControls = () => (
    <div style={{ padding: typo.pagePadding, display: 'flex', flexDirection: 'column', gap: typo.sectionGap, maxWidth: '500px', margin: '0 auto' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
          Distance: {distance.toLocaleString()} km
        </label>
        <input
          type="range"
          min="200"
          max="36000"
          step="100"
          value={distance}
          onChange={(e) => setDistance(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.warning, touchAction: 'pan-y' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typo.label, color: colors.textMuted, marginTop: '4px' }}>
          <span>LEO (200km)</span>
          <span>GEO (36,000km)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
          Frequency: {frequency} GHz
        </label>
        <input
          type="range"
          min="1"
          max="30"
          step="1"
          value={frequency}
          onChange={(e) => setFrequency(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#a855f7', touchAction: 'pan-y' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
          Tx Power: {txPower} dBW
        </label>
        <input
          type="range"
          min="0"
          max="30"
          step="1"
          value={txPower}
          onChange={(e) => setTxPower(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.transmitter, touchAction: 'pan-y' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
          Tx Antenna Gain: {txGain} dBi | Rx Antenna Gain: {rxGain} dBi
        </label>
        <input
          type="range"
          min="10"
          max="60"
          step="2"
          value={txGain}
          onChange={(e) => { setTxGain(parseInt(e.target.value)); setRxGain(Math.max(10, parseInt(e.target.value) - 10)); }}
          style={{ width: '100%', accentColor: colors.accent, touchAction: 'pan-y' }}
        />
      </div>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding, paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px' }}>
            <span style={{ color: colors.accent, fontSize: typo.small, textTransform: 'uppercase', letterSpacing: '2px' }}>Satellite Communications</span>
            <h1 style={{ fontSize: typo.title, marginTop: '8px', background: 'linear-gradient(90deg, #22d3ee, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Link Budget Calculation
            </h1>
            <p style={{ color: colors.textMuted, fontSize: typo.bodyLarge, marginTop: '8px', fontWeight: 400 }}>
              How does a tiny satellite talk to Earth across thousands of kilometers?
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            {renderVisualization()}
          </div>

          <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', borderLeft: `4px solid ${colors.accent}`, textAlign: 'left' }}>
            <p style={{ fontSize: typo.bodyLarge, lineHeight: 1.6, marginBottom: '12px' }}>
              <strong style={{ color: colors.accent }}>The signal starts strong but weakens dramatically over vast distances.</strong>
            </p>
            <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6 }}>
              A satellite transmitting 10 watts at 36,000 km altitude delivers less than a trillionth of a watt to a ground antenna. How do we ensure the signal arrives loud and clear?
            </p>
          </div>

          <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📡</div>
              <div style={{ color: colors.transmitter, fontWeight: 'bold', fontSize: typo.body }}>Transmitter</div>
              <div style={{ color: colors.textMuted, fontSize: typo.small }}>Power + Antenna Gain</div>
            </div>
            <div style={{ background: 'rgba(34, 211, 238, 0.1)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🛰</div>
              <div style={{ color: colors.signal, fontWeight: 'bold', fontSize: typo.body }}>Path Loss</div>
              <div style={{ color: colors.textMuted, fontSize: typo.small }}>Distance + Frequency</div>
            </div>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Explore Link Budgets')
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding, paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '24px', fontSize: typo.heading }}>Make Your Prediction</h2>

          {/* Static visualization */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            {renderVisualization()}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <p style={{ fontSize: typo.body, marginBottom: '8px', lineHeight: 1.6 }}>
              A satellite transmits 10 watts of power. By the time it reaches a ground station 36,000 km away, the signal is incredibly weak.
            </p>
            <p style={{ color: colors.accent, fontWeight: 'bold', fontSize: typo.body }}>
              What primarily compensates for this massive signal loss?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {predictions.map((p) => (
              <button
                key={p.id}
                onClick={() => { setPrediction(p.id); playSound('click'); }}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid #475569',
                  background: prediction === p.id ? 'rgba(6, 182, 212, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: typo.body,
                  minHeight: '44px',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'all 0.3s ease',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>,
      renderBottomBar(!!prediction, 'Test My Prediction')
    );
  }

  // Helper function to get prediction label
  const getPredictionLabel = () => {
    const found = predictions.find(p => p.id === prediction);
    return found ? found.label : 'your prediction';
  };

  // PLAY PHASE
  if (phase === 'play') {
    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding, paddingBottom: '100px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: typo.heading }}>Link Budget Calculator</h2>
          <p style={{ textAlign: 'center', color: colors.textSecondary, marginBottom: '24px', fontSize: typo.body }}>
            Adjust parameters to see how distance, frequency, and gain affect signal strength
          </p>

          {/* Observation guidance */}
          <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', borderLeft: `3px solid ${colors.accent}` }}>
            <p style={{ color: colors.textSecondary, fontSize: typo.small, margin: 0 }}>
              <strong style={{ color: colors.accent }}>Observe:</strong> Watch how the link margin and signal strength change as you adjust the sliders below.
            </p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontSize: typo.body }}>Key Terms Defined:</h4>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', fontSize: typo.small, fontWeight: 400 }}>
              <li><strong>FSPL (Free Space Path Loss)</strong> is defined as the signal attenuation due to spreading over distance, calculated as 20*log10(d) + 20*log10(f) + 92.45 dB</li>
              <li><strong>EIRP</strong> is the measure of Effective Isotropic Radiated Power = Tx Power + Tx Antenna Gain</li>
              <li><strong>Link Margin</strong> refers to the safety buffer above minimum required SNR for reliable communication</li>
            </ul>
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
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                {renderVisualization()}
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${colors.warning}`, marginBottom: '16px' }}>
                <h4 style={{ color: colors.warning, marginBottom: '8px', fontSize: typo.body }}>Experiments to Try:</h4>
                <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', fontSize: typo.small }}>
                  <li>Move distance from LEO to GEO - watch path loss skyrocket!</li>
                  <li>Increase antenna gain to compensate for distance</li>
                  <li>Change frequency and observe FSPL changes</li>
                </ul>
              </div>

              <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${colors.accent}` }}>
                <h4 style={{ color: colors.accent, marginBottom: '8px', fontSize: typo.body }}>Why This Matters:</h4>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.6 }}>
                  Every communication satellite relies on precise link budget analysis. Engineers use these calculations to design antennas, select frequencies, and determine power requirements.
                </p>
              </div>
            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {renderControls()}
            </div>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Review the Physics')
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'antenna';

    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding, paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, fontSize: typo.heading }}>
              {wasCorrect ? 'Excellent! Your prediction was correct!' : 'Not quite what you predicted!'}
            </h3>
            <p style={{ fontSize: typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
              You predicted: "{getPredictionLabel()}"
            </p>
            <p style={{ fontSize: typo.body, lineHeight: 1.6 }}>
              High-gain antennas are the key! As you observed in the experiment, they focus signal energy into a narrow beam, effectively multiplying power in that direction by thousands or millions of times. A 40 dBi antenna concentrates power 10,000x in its main beam.
            </p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '16px', fontSize: typo.body }}>Free Space Path Loss</h3>
            <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', textAlign: 'center', marginBottom: '12px' }}>
              <code style={{ color: colors.signal, fontSize: typo.body }}>FSPL = 20*log10(d) + 20*log10(f) + 92.45 dB</code>
            </div>
            <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: colors.textSecondary, fontSize: typo.body }}>
              <li><strong>d</strong> - Distance in km (doubling adds 6 dB)</li>
              <li><strong>f</strong> - Frequency in GHz (doubling adds 6 dB)</li>
              <li>This is the inverse square law in logarithmic form!</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: colors.transmitter, marginBottom: '16px', fontSize: typo.body }}>EIRP (Effective Isotropic Radiated Power)</h3>
            <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', textAlign: 'center', marginBottom: '12px' }}>
              <code style={{ color: colors.transmitter, fontSize: typo.body }}>EIRP = P_tx + G_tx</code>
            </div>
            <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6 }}>
              Transmit power plus antenna gain. A 10W transmitter with a 40 dBi antenna produces the same peak signal as a 100,000W isotropic transmitter!
            </p>
          </div>

          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.success, marginBottom: '16px', fontSize: typo.body }}>Complete Link Budget</h3>
            <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', textAlign: 'center', marginBottom: '12px' }}>
              <code style={{ color: colors.success, fontSize: typo.body }}>P_rx = EIRP - FSPL + G_rx - Losses</code>
            </div>
            <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6 }}>
              Received power equals transmitted EIRP minus path loss plus receiver antenna gain minus any system losses (cables, atmosphere, rain fade).
            </p>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Discover the Twist')
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding, paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#a855f7', marginBottom: '24px', fontSize: typo.heading }}>The Frequency Trade-off</h2>

          {/* Static visualization */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            {renderVisualization()}
          </div>

          <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '24px', borderLeft: '4px solid #a855f7' }}>
            <p style={{ fontSize: typo.body, marginBottom: '12px', lineHeight: 1.6 }}>
              Higher frequencies (like Ka-band at 30 GHz) can carry much more data than lower frequencies (like L-band at 1.5 GHz).
            </p>
            <p style={{ color: '#c4b5fd', fontWeight: 'bold', fontSize: typo.body }}>
              But what happens to the link budget at higher frequencies?
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {twistPredictions.map((p) => (
              <button
                key={p.id}
                onClick={() => { setTwistPrediction(p.id); playSound('click'); }}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: twistPrediction === p.id ? '2px solid #a855f7' : '1px solid #475569',
                  background: twistPrediction === p.id ? 'rgba(168, 85, 247, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: typo.body,
                  minHeight: '44px',
                  transition: 'all 0.3s ease',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>,
      renderBottomBar(!!twistPrediction, 'Experiment')
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding, paddingBottom: '100px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#a855f7', marginBottom: '8px', fontSize: typo.heading }}>Frequency vs Data Rate Trade-off</h2>
          <p style={{ textAlign: 'center', color: colors.textSecondary, marginBottom: '24px', fontSize: typo.body }}>
            Adjust frequency and observe the effect on path loss
          </p>

          {/* Observation guidance */}
          <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', borderLeft: '3px solid #a855f7' }}>
            <p style={{ color: colors.textSecondary, fontSize: typo.small, margin: 0 }}>
              <strong style={{ color: '#a855f7' }}>Observe:</strong> Watch the FSPL value change as you adjust the frequency slider.
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
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                {renderVisualization()}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: typo.body }}>L-band (1.5 GHz)</div>
                  <div style={{ color: colors.textMuted, fontSize: typo.small, marginTop: '4px' }}>Lower loss, lower data rate</div>
                  <div style={{ color: colors.textMuted, fontSize: typo.label, marginTop: '4px' }}>Good for voice, IoT</div>
                </div>
                <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#a855f7', fontWeight: 'bold', fontSize: typo.body }}>Ka-band (30 GHz)</div>
                  <div style={{ color: colors.textMuted, fontSize: typo.small, marginTop: '4px' }}>Higher loss, higher data rate</div>
                  <div style={{ color: colors.textMuted, fontSize: typo.label, marginTop: '4px' }}>Good for broadband</div>
                </div>
              </div>
            </div>

            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
                  Frequency: {frequency} GHz
                </label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={frequency}
                  onChange={(e) => setFrequency(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#a855f7', touchAction: 'pan-y' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typo.label, color: colors.textMuted, marginTop: '4px' }}>
                  <span>L-band (1.5)</span>
                  <span>Ka-band (30)</span>
                </div>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '12px', borderRadius: '8px' }}>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.6 }}>
                  <strong style={{ color: '#a855f7' }}>Experiment:</strong> Note the FSPL as you move from 1 to 30 GHz. How much does path loss increase?
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Understand the Trade-off')
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'more_loss';

    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding, paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, fontSize: typo.heading }}>
              {wasCorrect ? 'Correct!' : 'The answer might surprise you!'}
            </h3>
            <p style={{ fontSize: typo.body, lineHeight: 1.6 }}>
              FSPL includes <strong>20*log10(f)</strong> - doubling frequency adds 6 dB of loss! Going from 1 GHz to 30 GHz adds nearly 30 dB of additional path loss. This is why high-bandwidth Ka-band links need even larger antennas.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.error, marginBottom: '12px', fontSize: typo.body }}>Higher Frequency = More Loss</h3>
              <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6 }}>
                Every doubling of frequency adds 6 dB to path loss. Going from 1 GHz to 30 GHz adds nearly 30 dB of additional loss! This is a fundamental physics constraint.
              </p>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.body }}>Higher Frequency = More Bandwidth</h3>
              <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6 }}>
                But higher frequencies can carry more data. Ka-band can support 500+ Mbps while L-band maxes out around 500 kbps. Available bandwidth is proportional to carrier frequency.
              </p>
            </div>

            <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.transmitter, marginBottom: '12px', fontSize: typo.body }}>The Solution: Bigger Antennas!</h3>
              <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6 }}>
                To use high frequencies profitably, we compensate with larger antennas. Starlink user terminals have sophisticated phased arrays optimized for Ka-band. The gain increase offsets the frequency penalty.
              </p>
            </div>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'See Real-World Applications')
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const allAppsCompleted = completedApps.every(c => c);
    const app = realWorldApps[selectedApp];

    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding, paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: typo.heading }}>Real-World Applications</h2>
          <p style={{ textAlign: 'center', color: colors.textMuted, marginBottom: '24px', fontSize: typo.body }}>
            Explore all 4 to unlock the test ({completedApps.filter(c => c).length}/4)
          </p>

          {/* App selector */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
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
                  border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : '#475569'}`,
                  borderRadius: '12px',
                  padding: '12px 8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'all 0.3s ease',
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
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>{a.icon}</div>
                <div style={{ color: colors.textPrimary, fontSize: typo.label, fontWeight: 500 }}>{a.short}</div>
              </button>
            ))}
          </div>

          {/* Selected app details */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '20px',
            borderLeft: `4px solid ${app.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '40px' }}>{app.icon}</span>
              <div>
                <h3 style={{ color: colors.textPrimary, margin: 0, fontSize: typo.body }}>{app.title}</h3>
                <p style={{ color: app.color, margin: 0, fontSize: typo.small }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ color: colors.textSecondary, fontSize: typo.body, marginBottom: '16px', lineHeight: 1.6, fontWeight: 400 }}>
              {app.description}
            </p>

            <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <h4 style={{ color: colors.accent, marginBottom: '8px', fontSize: typo.small, fontWeight: 600 }}>Link Budget Connection:</h4>
              <p style={{ color: colors.textSecondary, fontSize: typo.small, margin: 0, lineHeight: 1.6, fontWeight: 400 }}>{app.connection}</p>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <h4 style={{ color: colors.warning, marginBottom: '8px', fontSize: typo.small, fontWeight: 600 }}>How It Works:</h4>
              <p style={{ color: colors.textSecondary, fontSize: typo.small, margin: 0, lineHeight: 1.6, fontWeight: 400 }}>{app.howItWorks}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{ background: colors.bgDark, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ color: app.color, fontWeight: 'bold', fontSize: typo.body }}>{stat.value}</div>
                  <div style={{ color: colors.textSecondary, fontSize: typo.label, fontWeight: 400 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <h4 style={{ color: '#a855f7', marginBottom: '8px', fontSize: typo.small, fontWeight: 600 }}>Future Impact:</h4>
              <p style={{ color: colors.textSecondary, fontSize: typo.small, margin: 0, lineHeight: 1.6, fontWeight: 400 }}>{app.futureImpact}</p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ color: colors.textSecondary, marginBottom: '8px', fontSize: typo.small, fontWeight: 600 }}>Examples: </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {app.examples.map((example, i) => (
                  <span key={i} style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: typo.label, color: colors.textSecondary, fontWeight: 400 }}>
                    {example}
                  </span>
                ))}
              </div>
            </div>

            {/* Got It / Next Application button */}
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                if (selectedApp < realWorldApps.length - 1) {
                  setSelectedApp(selectedApp + 1);
                }
              }}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '14px 24px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: typo.body,
                background: `linear-gradient(135deg, ${app.color} 0%, ${app.color}dd 100%)`,
                color: colors.textPrimary,
                border: 'none',
                cursor: 'pointer',
                minHeight: '44px',
                transition: 'all 0.3s ease',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {selectedApp < realWorldApps.length - 1 ? 'Got It - Next Application' : 'Got It'}
            </button>
          </div>
        </div>
      </div>,
      renderBottomBar(allAppsCompleted, 'Take the Test')
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return wrapPhaseContent(
        <div style={{ padding: typo.pagePadding, paddingBottom: '100px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              background: testScore >= 7 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '32px',
              borderRadius: '16px',
              textAlign: 'center',
              marginBottom: '24px',
            }}>
              <h2 style={{ color: testScore >= 7 ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.heading }}>
                {testScore >= 7 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ fontSize: '48px', fontWeight: 'bold' }}>{testScore}/10</p>
              <p style={{ color: colors.textMuted, fontSize: typo.body }}>
                {testScore >= 7 ? 'You understand link budget calculations!' : 'Review the concepts and try again.'}
              </p>
            </div>

            {testScore >= 7 && (
              <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px' }}>
                <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.body }}>Key Takeaways</h3>
                <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: colors.textSecondary, fontSize: typo.body }}>
                  <li>FSPL increases with both distance and frequency (20*log10 each)</li>
                  <li>High-gain antennas compensate for enormous path losses</li>
                  <li>EIRP = Transmitter Power + Antenna Gain</li>
                  <li>Link margin provides buffer for rain fade and equipment aging</li>
                  <li>Higher frequency = more bandwidth but more path loss</li>
                </ul>
              </div>
            )}
          </div>
        </div>,
        renderBottomBar(true, testScore >= 7 ? 'Claim Mastery' : 'Try Again', testScore >= 7 ? goNext : () => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); setCurrentTestQuestion(0); })
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding, paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: typo.heading }}>Knowledge Test</h2>
            <span style={{ color: colors.textSecondary, fontSize: typo.body }}>Question {currentTestQuestion + 1} of 10</span>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
            {testQuestions.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrentTestQuestion(i)}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? '#64748b' : '#1e293b',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '16px', borderRadius: '12px', marginBottom: '12px', borderLeft: `3px solid ${colors.accent}` }}>
            <p style={{ color: colors.textSecondary, fontSize: typo.small, margin: 0, lineHeight: 1.6 }}>{currentQ.scenario}</p>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ fontSize: typo.body, lineHeight: 1.6 }}>{currentQ.question}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {currentQ.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleTestAnswer(currentTestQuestion, opt.id)}
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: testAnswers[currentTestQuestion] === opt.id ? `2px solid ${colors.accent}` : '1px solid #475569',
                  background: testAnswers[currentTestQuestion] === opt.id ? 'rgba(6, 182, 212, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: typo.small,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: testAnswers[currentTestQuestion] === opt.id ? colors.accent : '#334155',
                  color: 'white',
                  textAlign: 'center',
                  lineHeight: '24px',
                  marginRight: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                {opt.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #475569',
                background: 'transparent',
                color: currentTestQuestion === 0 ? '#475569' : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                fontSize: typo.small,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Previous
            </button>

            {currentTestQuestion < 9 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: typo.small,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? '#475569' : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  fontSize: typo.small,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Submit
              </button>
            )}
          </div>
        </div>
      </div>,
      null
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return wrapPhaseContent(
      <div style={{ padding: typo.pagePadding, paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>
            🏆
          </div>
          <h1 style={{
            color: colors.success,
            marginBottom: '8px',
            fontSize: typo.title,
            background: 'linear-gradient(90deg, #22d3ee, #10b981)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Link Budget Master!
          </h1>
          <p style={{ color: colors.textMuted, marginBottom: '32px', fontSize: typo.body }}>
            You understand how satellites communicate across the void of space!
          </p>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '24px', borderRadius: '16px', marginBottom: '24px', textAlign: 'left' }}>
            <h3 style={{ color: colors.accent, marginBottom: '16px', fontSize: typo.body }}>Key Concepts Mastered:</h3>
            <ul style={{ lineHeight: 2, paddingLeft: '20px', fontSize: typo.body }}>
              <li><strong style={{ color: colors.signal }}>FSPL</strong> = 20*log10(d) + 20*log10(f) + 92.45 dB</li>
              <li><strong style={{ color: colors.transmitter }}>EIRP</strong> = Transmitter Power + Antenna Gain</li>
              <li><strong style={{ color: colors.success }}>High-gain antennas</strong> compensate for path loss</li>
              <li><strong style={{ color: '#a855f7' }}>Higher frequency</strong> = more bandwidth but more loss</li>
              <li><strong style={{ color: colors.warning }}>Link margin</strong> ensures reliable communication</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontSize: typo.body }}>The Core Insight</h4>
            <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6 }}>
              Every satellite communication link is a careful balance of power, antenna gain, frequency, and distance. Engineers meticulously calculate link budgets to ensure signals arrive with adequate margin for reliable communication across thousands or billions of kilometers.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {realWorldApps.slice(0, 4).map((app, i) => (
              <div key={i} style={{ background: `${app.color}15`, padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{app.icon}</div>
                <div style={{ color: app.color, fontWeight: 'bold', fontSize: typo.small }}>{app.short}</div>
              </div>
            ))}
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Complete')
    );
  }

  return null;
};

export default LinkBudgetRenderer;
