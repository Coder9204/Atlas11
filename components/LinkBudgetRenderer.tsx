'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// GAME 197: LINK BUDGET CALCULATION
// Physics: Link Budget = P_tx + G_tx - FSPL + G_rx - System Losses
// Free Space Path Loss: FSPL = 20*log10(d) + 20*log10(f) + 20*log10(4*pi/c)
// ============================================================================

interface Props {
  onGameEvent?: (event: { type: string; data?: Record<string, unknown> }) => void;
  gamePhase?: string;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const realWorldApps = [
  {
    icon: '🛰️',
    title: 'Satellite Communications',
    short: 'Bridging thousands of kilometers',
    tagline: 'Every decibel counts in space',
    description: 'Communication satellites orbit 36,000 km above Earth, making link budget calculations critical. Engineers must ensure signals arrive with sufficient strength after path losses exceeding 200 dB. Antenna gains, transmit power, and receiver sensitivity are precisely balanced.',
    connection: 'The link budget equation directly determines whether a satellite link works. Free space path loss increases with distance squared, requiring high-gain antennas and powerful transmitters for geostationary orbits.',
    howItWorks: 'Ground stations use large dish antennas (10-30m) for high gain. Satellites use spot beams to concentrate power. Link margins account for rain fade, atmospheric absorption, and equipment degradation.',
    stats: [
      { value: '200+ dB', label: 'Path loss', icon: '⚡' },
      { value: '10+ Gbps', label: 'Throughput', icon: '📈' },
      { value: '$270B', label: 'Satcom market', icon: '🚀' }
    ],
    examples: ['Starlink LEO constellation', 'Inmarsat maritime', 'DirecTV broadcasting', 'GPS navigation'],
    companies: ['SpaceX', 'Viasat', 'SES', 'Intelsat'],
    futureImpact: 'LEO mega-constellations will reduce path losses and latency, enabling satellite internet competitive with terrestrial fiber.',
    color: '#8B5CF6'
  },
  {
    icon: '📡',
    title: 'Deep Space Networks',
    short: 'Talking to interplanetary probes',
    tagline: 'Whispering across the solar system',
    description: 'NASA\'s Deep Space Network communicates with probes billions of kilometers away. At these distances, received signals are unimaginably weak—often less than a billionth of a billionth of a watt. Link budgets must account for every possible dB.',
    connection: 'Deep space links push link budget principles to extremes. Free space path loss to Mars can exceed 280 dB. Only massive ground antennas (70m dishes), cryogenic receivers, and sophisticated coding make communication possible.',
    howItWorks: 'DSN uses 34m and 70m antennas worldwide. Cryogenic receivers minimize noise temperature. Error-correcting codes extract signals below the noise floor. Missions plan data rates based on link budget at maximum distance.',
    stats: [
      { value: '280 dB', label: 'Mars path loss', icon: '⚡' },
      { value: '20 hours', label: 'Voyager roundtrip', icon: '📈' },
      { value: '160 bps', label: 'Voyager rate', icon: '🚀' }
    ],
    examples: ['Mars rovers', 'Voyager 1 and 2', 'New Horizons', 'James Webb Space Telescope'],
    companies: ['NASA JPL', 'ESA', 'JAXA', 'ISRO'],
    futureImpact: 'Optical deep space links using lasers will provide 10-100x higher data rates than radio, enabling high-definition video from Mars.',
    color: '#3B82F6'
  },
  {
    icon: '📶',
    title: '5G Wireless Networks',
    short: 'Gigabit mobile connectivity',
    tagline: 'Millimeter waves meet link budgets',
    description: '5G networks use millimeter wave frequencies (24-100 GHz) for high bandwidth but face challenging link budgets. Higher frequencies have greater path loss and don\'t penetrate buildings. Massive MIMO and beamforming are essential for coverage.',
    connection: 'Free space path loss increases with frequency squared. 5G at 28 GHz has 10x the path loss of 4G at 2.8 GHz for the same distance, requiring compensating antenna gains and denser cell sites.',
    howItWorks: 'Base stations use massive MIMO arrays with 64-256 elements to create focused beams. Beamforming concentrates energy toward users, adding 15-20 dB effective gain. Small cells provide coverage in challenging locations.',
    stats: [
      { value: '10 Gbps', label: 'Peak rate', icon: '⚡' },
      { value: '1 ms', label: 'Latency', icon: '📈' },
      { value: '$700B', label: '5G investment', icon: '🚀' }
    ],
    examples: ['Urban 5G networks', 'Fixed wireless access', 'Stadium connectivity', 'Industrial IoT'],
    companies: ['Ericsson', 'Nokia', 'Samsung', 'Huawei'],
    futureImpact: '6G will use sub-THz frequencies, pushing link budget engineering to even higher frequencies and requiring even more sophisticated beamforming.',
    color: '#10B981'
  },
  {
    icon: '🔭',
    title: 'Radio Astronomy',
    short: 'Listening to the cosmos',
    tagline: 'Detecting whispers from galaxies',
    description: 'Radio telescopes detect incredibly weak signals from astronomical sources. Link budget concepts apply in reverse—calculating the sensitivity needed to detect natural emissions. Receiver noise temperature and antenna collecting area determine detection limits.',
    connection: 'Radio astronomy applies link budget principles to natural sources. The "transmitter" is a distant galaxy; path loss is cosmological. Telescope sensitivity must exceed the link budget deficit to detect the signal.',
    howItWorks: 'Large dish antennas (up to 500m) maximize collecting area. Cryogenic receivers minimize noise. Interferometry combines multiple telescopes for greater resolution. Integration time trades speed for sensitivity.',
    stats: [
      { value: '500m', label: 'FAST diameter', icon: '⚡' },
      { value: '10⁻²⁶ W', label: 'Detection limit', icon: '📈' },
      { value: '$1.5B', label: 'SKA cost', icon: '🚀' }
    ],
    examples: ['ALMA in Chile', 'VLA in New Mexico', 'FAST in China', 'SKA under construction'],
    companies: ['NRAO', 'ESO', 'CSIRO', 'MPIfR'],
    futureImpact: 'The Square Kilometre Array will have unprecedented sensitivity, potentially detecting radio emissions from exoplanets.',
    color: '#F59E0B'
  }
];

const LinkBudgetRenderer: React.FC<Props> = ({ onGameEvent, gamePhase }) => {
  const getInitialPhase = (): Phase => {
    if (gamePhase !== undefined && phaseOrder.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);

  // Simulation state
  const [distance, setDistance] = useState(400); // km
  const [frequency, setFrequency] = useState(10); // GHz
  const [txPower, setTxPower] = useState(10); // dBW
  const [txGain, setTxGain] = useState(40); // dBi
  const [rxGain, setRxGain] = useState(30); // dBi
  const [animPhase, setAnimPhase] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);

  const phaseNames: Record<Phase, string> = {
    'hook': 'Hook',
    'predict': 'Predict',
    'play': 'Play',
    'review': 'Review',
    'twist_predict': 'Twist Predict',
    'twist_play': 'Twist Play',
    'twist_review': 'Twist Review',
    'transfer': 'Transfer',
    'test': 'Test',
    'mastery': 'Mastery'
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

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase !== undefined && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const playSound = useCallback((soundType: 'transition' | 'correct' | 'incorrect' | 'complete' | 'click') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const soundConfigs: Record<string, () => void> = {
        transition: () => {
          oscillator.frequency.setValueAtTime(440, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.15);
        },
        correct: () => {
          oscillator.frequency.setValueAtTime(523, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.2);
        },
        incorrect: () => {
          oscillator.frequency.setValueAtTime(200, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.25);
        },
        complete: () => {
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(392, ctx.currentTime);
          oscillator.frequency.setValueAtTime(523, ctx.currentTime + 0.15);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
        },
        click: () => {
          oscillator.frequency.setValueAtTime(600, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.05);
        }
      };

      soundConfigs[soundType]?.();
    } catch {
      // Audio not available
    }
  }, []);

  const goToPhase = useCallback((newPhase: Phase) => {
    if (!phaseOrder.includes(newPhase)) return;
    playSound('transition');
    setPhase(newPhase);
    onGameEvent?.({ type: 'phase_change', data: { phase: newPhase, phaseName: phaseNames[newPhase] } });
  }, [playSound, onGameEvent, phaseNames]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Progress bar showing all 10 phases
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #334155',
        backgroundColor: '#0f172a',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                onClick={() => i <= currentIndex && goToPhase(p)}
                style={{
                  height: '8px',
                  width: phase === p ? '24px' : '8px',
                  borderRadius: '4px',
                  backgroundColor: i < currentIndex ? '#22c55e' : phase === p ? '#06b6d4' : '#334155',
                  cursor: i <= currentIndex ? 'pointer' : 'default',
                  transition: 'all 0.3s',
                  zIndex: 10
                }}
                title={phaseNames[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>
            {currentIndex + 1} / {phaseOrder.length}
          </span>
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          background: 'rgba(6, 182, 212, 0.2)',
          color: '#06b6d4',
          fontSize: '11px',
          fontWeight: 700
        }}>
          {phaseNames[phase]}
        </div>
      </div>
    );
  };

  // Bottom navigation bar with Back/Next
  const renderBottomBar = (canGoNext: boolean = true, nextLabel: string = 'Next') => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canBack = currentIndex > 0;
    const isLastPhase = phase === 'mastery';

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        borderTop: '1px solid #334155',
        backgroundColor: '#0f172a',
        marginTop: 'auto'
      }}>
        <button
          onClick={goBack}
          disabled={!canBack}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '14px',
            backgroundColor: '#1e293b',
            color: canBack ? '#e2e8f0' : '#475569',
            border: '1px solid #334155',
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.5,
            zIndex: 10
          }}
        >
          Back
        </button>

        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
          {phaseNames[phase]}
        </span>

        {!isLastPhase && (
          <button
            onClick={goNext}
            disabled={!canGoNext}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              background: canGoNext ? 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' : '#1e293b',
              color: canGoNext ? '#ffffff' : '#475569',
              border: 'none',
              cursor: canGoNext ? 'pointer' : 'not-allowed',
              opacity: canGoNext ? 1 : 0.5,
              boxShadow: canGoNext ? '0 2px 12px rgba(6, 182, 212, 0.3)' : 'none',
              zIndex: 10
            }}
          >
            {nextLabel}
          </button>
        )}
        {isLastPhase && (
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(34, 197, 94, 0.3)',
              zIndex: 10
            }}
          >
            Start Over
          </button>
        )}
      </div>
    );
  };

  const handlePrediction = useCallback((prediction: string) => {
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    playSound(prediction === 'antenna' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'prediction_made', data: { prediction, correct: prediction === 'antenna' } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'more_loss' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'twist_prediction_made', data: { prediction, correct: prediction === 'more_loss' } });
  }, [playSound, onGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerIndex;
    setTestAnswers(newAnswers);

    const isCorrect = testQuestions[questionIndex].options[answerIndex].correct;
    playSound(isCorrect ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'test_answered', data: { questionIndex, answerIndex, isCorrect } });
  }, [testAnswers, playSound, onGameEvent]);

  const calculateTestScore = useCallback(() => {
    return testAnswers.reduce((score, answer, index) => {
      if (answer !== -1 && testQuestions[index].options[answer].correct) {
        return score + 1;
      }
      return score;
    }, 0);
  }, [testAnswers]);

  const handleAppComplete = useCallback((appIndex: number) => {
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    onGameEvent?.({ type: 'app_explored', data: { appIndex, appTitle: transferApps[appIndex].title } });
  }, [playSound, onGameEvent]);

  const testQuestions = [
    {
      question: "What is the primary purpose of a link budget calculation?",
      options: [
        { text: "To determine the color of the satellite", correct: false },
        { text: "To ensure reliable communication with adequate signal margin", correct: true },
        { text: "To calculate the satellite's orbital period", correct: false },
        { text: "To measure the satellite's mass", correct: false }
      ]
    },
    {
      question: "Free Space Path Loss increases with:",
      options: [
        { text: "Higher frequency and greater distance", correct: true },
        { text: "Lower frequency and shorter distance", correct: false },
        { text: "Higher antenna gain only", correct: false },
        { text: "Atmospheric pressure changes", correct: false }
      ]
    },
    {
      question: "What does EIRP stand for?",
      options: [
        { text: "Electronic Infrared Radiation Power", correct: false },
        { text: "Effective Isotropic Radiated Power", correct: true },
        { text: "External Input Radio Protocol", correct: false },
        { text: "Elevated Integrated Radio Platform", correct: false }
      ]
    },
    {
      question: "Doubling the distance in a link budget:",
      options: [
        { text: "Adds approximately 6 dB to path loss", correct: true },
        { text: "Has no effect on path loss", correct: false },
        { text: "Reduces path loss by half", correct: false },
        { text: "Adds exactly 3 dB to path loss", correct: false }
      ]
    },
    {
      question: "Why do satellite communication systems use high-gain antennas?",
      options: [
        { text: "To make the antenna look impressive", correct: false },
        { text: "To compensate for enormous path losses over vast distances", correct: true },
        { text: "To reduce the satellite's weight", correct: false },
        { text: "To change the signal frequency", correct: false }
      ]
    },
    {
      question: "What is link margin?",
      options: [
        { text: "The extra signal strength above the minimum required", correct: true },
        { text: "The physical size of the antenna", correct: false },
        { text: "The distance between satellites", correct: false },
        { text: "The power consumption of the transmitter", correct: false }
      ]
    },
    {
      question: "The formula FSPL = 20*log10(d) + 20*log10(f) + constant shows that path loss:",
      options: [
        { text: "Is independent of frequency", correct: false },
        { text: "Increases logarithmically with both distance and frequency", correct: true },
        { text: "Decreases with distance", correct: false },
        { text: "Only depends on transmitter power", correct: false }
      ]
    },
    {
      question: "A GEO satellite at 36,000 km has much higher path loss than a LEO satellite at 400 km because:",
      options: [
        { text: "GEO satellites are older technology", correct: false },
        { text: "Path loss follows inverse square law - 90x more distance means huge loss increase", correct: true },
        { text: "GEO satellites use weaker transmitters", correct: false },
        { text: "The atmosphere is thicker at GEO altitude", correct: false }
      ]
    },
    {
      question: "Why might you choose a lower frequency for deep space communications?",
      options: [
        { text: "Lower frequencies are more colorful", correct: false },
        { text: "Lower FSPL, but at the cost of lower data rates", correct: true },
        { text: "Higher frequencies cannot travel through space", correct: false },
        { text: "Deep space probes only receive AM radio", correct: false }
      ]
    },
    {
      question: "What happens to the link budget if you increase receiver antenna gain by 3 dB?",
      options: [
        { text: "Received power increases by 3 dB, improving the link", correct: true },
        { text: "Path loss increases by 3 dB", correct: false },
        { text: "The transmitter power doubles", correct: false },
        { text: "The signal frequency changes", correct: false }
      ]
    }
  ];

  const transferApps = [
    {
      title: "Deep Space Network",
      short: "Deep Space",
      description: "NASA's DSN communicates with spacecraft billions of km away using massive 70m dishes.",
      connection: "Extreme distances require enormous antenna gains to overcome path losses exceeding 270 dB."
    },
    {
      title: "Starlink Satellites",
      short: "Starlink",
      description: "LEO constellation providing global internet with thousands of satellites at ~550 km altitude.",
      connection: "Lower altitude reduces path loss, enabling smaller user terminals and higher data rates."
    },
    {
      title: "GPS Navigation",
      short: "GPS",
      description: "24+ satellites at 20,200 km broadcast precise timing signals to receivers worldwide.",
      connection: "Link budget ensures weak signals (about -130 dBm) can still be detected by small antennas."
    },
    {
      title: "Maritime VSAT",
      short: "Ship Comms",
      description: "Ships at sea use satellite terminals for voice, data, and safety communications.",
      connection: "Moving platforms require careful link margin to maintain connectivity despite antenna pointing errors."
    }
  ];

  // Generate consistent star positions
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

  const renderVisualization = () => {
    const budget = calculateLinkBudget();
    const waveOffset = animPhase * 2;
    const marginValue = parseFloat(budget.margin);
    const signalStrength = Math.max(0, Math.min(100, (marginValue + 30) * 2)); // Map margin to 0-100%

    return (
      <svg viewBox="0 0 560 380" className="w-full h-auto max-w-2xl">
        <defs>
          {/* ==================== PREMIUM GRADIENT DEFINITIONS ==================== */}

          {/* Deep space background gradient */}
          <linearGradient id="lnkbSpaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="25%" stopColor="#0a0f1a" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="75%" stopColor="#0a1628" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* Satellite body metallic gradient */}
          <linearGradient id="lnkbSatelliteMetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="25%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#475569" />
            <stop offset="75%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Solar panel gradient with depth */}
          <linearGradient id="lnkbSolarPanel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="20%" stopColor="#2563eb" />
            <stop offset="50%" stopColor="#1d4ed8" />
            <stop offset="80%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>

          {/* Ground station building gradient */}
          <linearGradient id="lnkbBuildingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="30%" stopColor="#374151" />
            <stop offset="60%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>

          {/* Antenna dish gradient - receiver */}
          <radialGradient id="lnkbDishGradRx" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="30%" stopColor="#60a5fa" />
            <stop offset="60%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </radialGradient>

          {/* Antenna dish gradient - transmitter */}
          <radialGradient id="lnkbDishGradTx" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="30%" stopColor="#fbbf24" />
            <stop offset="60%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </radialGradient>

          {/* Signal wave gradient with attenuation */}
          <linearGradient id="lnkbSignalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
            <stop offset="25%" stopColor="#06b6d4" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#0891b2" stopOpacity="0.5" />
            <stop offset="75%" stopColor="#0e7490" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#155e75" stopOpacity="0.15" />
          </linearGradient>

          {/* Signal strength good gradient */}
          <linearGradient id="lnkbStrengthGood" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="40%" stopColor="#16a34a" />
            <stop offset="70%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>

          {/* Signal strength marginal gradient */}
          <linearGradient id="lnkbStrengthMarginal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="40%" stopColor="#dc2626" />
            <stop offset="70%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>

          {/* Earth atmosphere gradient */}
          <radialGradient id="lnkbEarthGrad" cx="50%" cy="0%" r="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="30%" stopColor="#1d4ed8" />
            <stop offset="60%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#172554" />
          </radialGradient>

          {/* Earth land mass gradient */}
          <linearGradient id="lnkbLandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#16a34a" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#15803d" stopOpacity="0.4" />
          </linearGradient>

          {/* Panel info box gradient */}
          <linearGradient id="lnkbPanelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#0f172a" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
          </linearGradient>

          {/* Transmitter glow radial gradient */}
          <radialGradient id="lnkbTxGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#d97706" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
          </radialGradient>

          {/* Receiver glow radial gradient */}
          <radialGradient id="lnkbRxGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
          </radialGradient>

          {/* ==================== GLOW FILTER DEFINITIONS ==================== */}

          {/* Satellite glow filter */}
          <filter id="lnkbSatGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Signal wave glow filter */}
          <filter id="lnkbSignalGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Strong antenna glow */}
          <filter id="lnkbAntennaGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Star twinkle filter */}
          <filter id="lnkbStarGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Status indicator glow */}
          <filter id="lnkbStatusGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ==================== SPACE BACKGROUND ==================== */}
        <rect width="560" height="380" fill="url(#lnkbSpaceGrad)" />

        {/* Animated stars with twinkle effect */}
        {starPositions.map((star, i) => (
          <circle
            key={i}
            cx={star.cx}
            cy={star.cy}
            r={star.r}
            fill="#ffffff"
            opacity={star.opacity * (0.7 + 0.3 * Math.sin((animPhase + star.twinkleOffset) * 0.05))}
            filter={star.r > 1 ? "url(#lnkbStarGlow)" : undefined}
          />
        ))}

        {/* ==================== EARTH ==================== */}
        <g transform="translate(450, 320)">
          {/* Atmosphere halo */}
          <ellipse cx="0" cy="0" rx="130" ry="85" fill="url(#lnkbEarthGrad)" opacity="0.3" />
          {/* Earth body */}
          <ellipse cx="0" cy="0" rx="110" ry="70" fill="url(#lnkbEarthGrad)" />
          {/* Land masses */}
          <ellipse cx="-20" cy="-20" rx="45" ry="18" fill="url(#lnkbLandGrad)" transform="rotate(-15)" />
          <ellipse cx="30" cy="10" rx="30" ry="12" fill="url(#lnkbLandGrad)" transform="rotate(10)" />
          {/* Earth highlight */}
          <ellipse cx="-30" cy="-25" rx="25" ry="10" fill="#60a5fa" opacity="0.15" />
        </g>

        {/* ==================== SATELLITE (TRANSMITTER) ==================== */}
        <g transform="translate(70, 70)">
          {/* Transmitter glow effect */}
          <ellipse cx="0" cy="18" rx="20" ry="12" fill="url(#lnkbTxGlow)" opacity={0.5 + 0.3 * Math.sin(animPhase * 0.1)} />

          {/* Satellite body */}
          <rect x="-18" y="-10" width="36" height="20" fill="url(#lnkbSatelliteMetal)" rx="3" stroke="#94a3b8" strokeWidth="0.5" />

          {/* Solar panel left */}
          <g transform="translate(-55, 0)">
            <rect x="0" y="-6" width="35" height="12" fill="url(#lnkbSolarPanel)" rx="1" />
            {/* Panel grid lines */}
            <line x1="7" y1="-6" x2="7" y2="6" stroke="#1e3a8a" strokeWidth="0.5" />
            <line x1="14" y1="-6" x2="14" y2="6" stroke="#1e3a8a" strokeWidth="0.5" />
            <line x1="21" y1="-6" x2="21" y2="6" stroke="#1e3a8a" strokeWidth="0.5" />
            <line x1="28" y1="-6" x2="28" y2="6" stroke="#1e3a8a" strokeWidth="0.5" />
            <line x1="0" y1="0" x2="35" y2="0" stroke="#1e3a8a" strokeWidth="0.5" />
          </g>

          {/* Solar panel right */}
          <g transform="translate(20, 0)">
            <rect x="0" y="-6" width="35" height="12" fill="url(#lnkbSolarPanel)" rx="1" />
            <line x1="7" y1="-6" x2="7" y2="6" stroke="#1e3a8a" strokeWidth="0.5" />
            <line x1="14" y1="-6" x2="14" y2="6" stroke="#1e3a8a" strokeWidth="0.5" />
            <line x1="21" y1="-6" x2="21" y2="6" stroke="#1e3a8a" strokeWidth="0.5" />
            <line x1="28" y1="-6" x2="28" y2="6" stroke="#1e3a8a" strokeWidth="0.5" />
            <line x1="0" y1="0" x2="35" y2="0" stroke="#1e3a8a" strokeWidth="0.5" />
          </g>

          {/* Transmit antenna dish */}
          <g transform="translate(0, 18)" filter="url(#lnkbAntennaGlow)">
            <ellipse cx="0" cy="0" rx="12" ry="5" fill="url(#lnkbDishGradTx)" />
            <ellipse cx="0" cy="-2" rx="8" ry="3" fill="#fcd34d" opacity="0.5" />
            {/* Feed horn */}
            <line x1="0" y1="0" x2="0" y2="-8" stroke="#fbbf24" strokeWidth="1.5" />
            <circle cx="0" cy="-8" r="2" fill="#fcd34d" />
          </g>

          {/* Labels */}
          <text x="0" y="-22" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="600">SATELLITE TX</text>
          <text x="0" y="42" textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="500">{txPower} dBW | {txGain} dBi</text>
        </g>

        {/* ==================== SIGNAL PATH WITH ATTENUATION ==================== */}
        <g>
          {/* Signal path line (dashed) */}
          <line x1="90" y1="95" x2="400" y2="205" stroke="#475569" strokeWidth="1" strokeDasharray="6,4" opacity="0.5" />

          {/* Animated signal waves showing attenuation */}
          {[0, 1, 2, 3, 4, 5].map(i => {
            const progress = ((waveOffset / 60) + i * 0.18) % 1;
            const x = 90 + progress * 310;
            const y = 95 + progress * 110;
            const opacity = 0.9 - progress * 0.7; // Fade as signal travels
            const scale = 1 - progress * 0.3; // Shrink as signal attenuates

            return (
              <g key={i} transform={`translate(${x}, ${y})`} filter="url(#lnkbSignalGlow)">
                {/* Wave arc */}
                <path
                  d={`M -${15 * scale} 0 Q 0 -${12 * scale} ${15 * scale} 0`}
                  stroke="#22d3ee"
                  strokeWidth={2 * scale}
                  fill="none"
                  opacity={opacity}
                />
                {/* Inner wave arc */}
                <path
                  d={`M -${10 * scale} 0 Q 0 -${8 * scale} ${10 * scale} 0`}
                  stroke="#67e8f9"
                  strokeWidth={1.5 * scale}
                  fill="none"
                  opacity={opacity * 0.7}
                />
              </g>
            );
          })}

          {/* Distance label with background */}
          <g transform="translate(245, 130)">
            <rect x="-45" y="-12" width="90" height="24" fill="#0f172a" rx="6" stroke="#334155" strokeWidth="1" />
            <text x="0" y="5" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="700">
              {distance.toLocaleString()} km
            </text>
          </g>

          {/* FSPL indicator along path */}
          <g transform="translate(180, 175)">
            <rect x="-50" y="-10" width="100" height="20" fill="rgba(239,68,68,0.15)" rx="4" stroke="#ef4444" strokeWidth="0.5" strokeOpacity="0.5" />
            <text x="0" y="5" textAnchor="middle" fill="#f87171" fontSize="10" fontWeight="500">
              FSPL: -{budget.fspl} dB
            </text>
          </g>
        </g>

        {/* ==================== GROUND STATION (RECEIVER) ==================== */}
        <g transform="translate(410, 220)">
          {/* Receiver glow effect */}
          <ellipse cx="0" cy="-50" rx="25" ry="15" fill="url(#lnkbRxGlow)" opacity={0.4 + 0.2 * Math.sin(animPhase * 0.08)} />

          {/* Building structure */}
          <rect x="-25" y="0" width="50" height="35" fill="url(#lnkbBuildingGrad)" rx="3" stroke="#475569" strokeWidth="0.5" />
          {/* Building windows */}
          <rect x="-18" y="8" width="8" height="6" fill="#fbbf24" opacity="0.6" rx="1" />
          <rect x="-5" y="8" width="8" height="6" fill="#fbbf24" opacity="0.4" rx="1" />
          <rect x="8" y="8" width="8" height="6" fill="#fbbf24" opacity="0.5" rx="1" />
          <rect x="-18" y="20" width="8" height="6" fill="#fbbf24" opacity="0.3" rx="1" />
          <rect x="8" y="20" width="8" height="6" fill="#fbbf24" opacity="0.5" rx="1" />

          {/* Antenna support structure */}
          <path d="M0 0 L-35 -45 L35 -45 Z" fill="url(#lnkbBuildingGrad)" stroke="#64748b" strokeWidth="0.5" />

          {/* Receiver dish with premium gradient */}
          <g transform="translate(0, -55)" filter="url(#lnkbAntennaGlow)">
            <ellipse cx="0" cy="0" rx="30" ry="12" fill="url(#lnkbDishGradRx)" stroke="#93c5fd" strokeWidth="1" />
            <ellipse cx="0" cy="-3" rx="20" ry="7" fill="#bfdbfe" opacity="0.3" />
            {/* Dish ribs */}
            <line x1="0" y1="-12" x2="0" y2="12" stroke="#1e40af" strokeWidth="0.5" opacity="0.5" />
            <line x1="-25" y1="0" x2="25" y2="0" stroke="#1e40af" strokeWidth="0.5" opacity="0.5" />
            {/* Feed assembly */}
            <line x1="0" y1="0" x2="0" y2="-18" stroke="#60a5fa" strokeWidth="2" />
            <circle cx="0" cy="-18" r="3" fill="#93c5fd" />
            <circle cx="0" cy="-18" r="1.5" fill="#ffffff" opacity="0.5" />
          </g>

          {/* Labels */}
          <text x="0" y="52" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="600">GROUND STATION RX</text>
          <text x="0" y="66" textAnchor="middle" fill="#22d3ee" fontSize="9" fontWeight="500">{rxGain} dBi Gain</text>
        </g>

        {/* ==================== SIGNAL STRENGTH INDICATOR ==================== */}
        <g transform="translate(400, 50)">
          {/* Background panel */}
          <rect x="0" y="0" width="150" height="45" fill="url(#lnkbPanelGrad)" rx="8" stroke="#334155" strokeWidth="1" />

          {/* Title */}
          <text x="75" y="15" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="600" letterSpacing="0.5">SIGNAL STRENGTH</text>

          {/* Signal bar background */}
          <rect x="10" y="22" width="130" height="14" fill="#1e293b" rx="4" stroke="#475569" strokeWidth="0.5" />

          {/* Signal bar fill with gradient */}
          <rect
            x="12"
            y="24"
            width={Math.max(0, (signalStrength / 100) * 126)}
            height="10"
            fill={marginValue > 0 ? "url(#lnkbStrengthGood)" : "url(#lnkbStrengthMarginal)"}
            rx="3"
            filter="url(#lnkbStatusGlow)"
          />

          {/* Signal level markers */}
          <line x1="45" y1="22" x2="45" y2="36" stroke="#475569" strokeWidth="0.5" />
          <line x1="75" y1="22" x2="75" y2="36" stroke="#475569" strokeWidth="0.5" />
          <line x1="105" y1="22" x2="105" y2="36" stroke="#475569" strokeWidth="0.5" />
        </g>

        {/* ==================== LINK BUDGET PANEL ==================== */}
        <g transform="translate(10, 165)">
          {/* Panel background */}
          <rect x="0" y="0" width="155" height="190" fill="url(#lnkbPanelGrad)" rx="10" stroke="#334155" strokeWidth="1" />

          {/* Header */}
          <rect x="0" y="0" width="155" height="28" fill="rgba(245,158,11,0.1)" rx="10" />
          <rect x="0" y="14" width="155" height="14" fill="rgba(245,158,11,0.1)" />
          <text x="77" y="19" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700" letterSpacing="0.5">LINK BUDGET</text>

          {/* Divider */}
          <line x1="10" y1="32" x2="145" y2="32" stroke="#334155" strokeWidth="1" />

          {/* EIRP */}
          <text x="12" y="50" fill="#94a3b8" fontSize="10">EIRP:</text>
          <text x="143" y="50" textAnchor="end" fill="#22c55e" fontSize="10" fontWeight="600">+{budget.eirp} dBW</text>

          {/* FSPL */}
          <text x="12" y="68" fill="#94a3b8" fontSize="10">Path Loss:</text>
          <text x="143" y="68" textAnchor="end" fill="#ef4444" fontSize="10" fontWeight="600">-{budget.fspl} dB</text>

          {/* Rx Gain */}
          <text x="12" y="86" fill="#94a3b8" fontSize="10">Rx Gain:</text>
          <text x="143" y="86" textAnchor="end" fill="#22c55e" fontSize="10" fontWeight="600">+{rxGain} dBi</text>

          {/* Calculation line */}
          <line x1="12" y1="96" x2="143" y2="96" stroke="#475569" strokeWidth="1" strokeDasharray="3,2" />

          {/* Rx Power */}
          <text x="12" y="114" fill="#94a3b8" fontSize="10">Received Power:</text>
          <text x="143" y="114" textAnchor="end" fill="#60a5fa" fontSize="10" fontWeight="600">{budget.rxPower} dBm</text>

          {/* SNR */}
          <text x="12" y="132" fill="#94a3b8" fontSize="10">SNR:</text>
          <text x="143" y="132" textAnchor="end" fill="#a78bfa" fontSize="10" fontWeight="600">{budget.snr} dB</text>

          {/* Link Margin */}
          <text x="12" y="150" fill="#94a3b8" fontSize="10">Link Margin:</text>
          <text x="143" y="150" textAnchor="end" fill={marginValue > 0 ? '#22c55e' : '#ef4444'} fontSize="11" fontWeight="700">
            {marginValue > 0 ? '+' : ''}{budget.margin} dB
          </text>

          {/* Status indicator */}
          <rect x="12" y="160" width="131" height="22" fill={marginValue > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'} rx="6" stroke={marginValue > 0 ? '#22c55e' : '#ef4444'} strokeWidth="1" />
          <circle cx="26" cy="171" r="5" fill={marginValue > 0 ? '#22c55e' : '#ef4444'} filter="url(#lnkbStatusGlow)" opacity={0.7 + 0.3 * Math.sin(animPhase * 0.15)} />
          <text x="85" y="175" textAnchor="middle" fill={marginValue > 0 ? '#22c55e' : '#ef4444'} fontSize="11" fontWeight="700">
            {budget.linkStatus}
          </text>
        </g>

        {/* ==================== FREQUENCY INFO ==================== */}
        <g transform="translate(180, 350)">
          <rect x="-70" y="-12" width="140" height="24" fill="url(#lnkbPanelGrad)" rx="6" stroke="#334155" strokeWidth="1" />
          <text x="0" y="5" textAnchor="middle" fill="#a855f7" fontSize="11" fontWeight="600">
            Frequency: {frequency} GHz
          </text>
        </g>

        {/* ==================== LEGEND ==================== */}
        <g transform="translate(10, 10)">
          <rect x="0" y="0" width="140" height="55" fill="url(#lnkbPanelGrad)" rx="6" stroke="#334155" strokeWidth="1" opacity="0.9" />
          <text x="10" y="16" fill="#94a3b8" fontSize="9" fontWeight="600">LINK COMPONENTS</text>
          <circle cx="18" cy="28" r="4" fill="#fbbf24" />
          <text x="28" y="31" fill="#e2e8f0" fontSize="9">Transmitter (Tx)</text>
          <circle cx="18" cy="43" r="4" fill="#22d3ee" />
          <text x="28" y="46" fill="#e2e8f0" fontSize="9">Receiver (Rx)</text>
        </g>
      </svg>
    );
  };

  const renderControls = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <div className="bg-slate-800/50 p-4 rounded-xl">
        <label className="text-slate-300 text-sm block mb-2">Distance: {distance} km</label>
        <input
          type="range"
          min="200"
          max="36000"
          step="100"
          value={distance}
          onChange={(e) => setDistance(parseInt(e.target.value))}
          className="w-full"
        />
      </div>
      <div className="bg-slate-800/50 p-4 rounded-xl">
        <label className="text-slate-300 text-sm block mb-2">Frequency: {frequency} GHz</label>
        <input
          type="range"
          min="1"
          max="30"
          step="1"
          value={frequency}
          onChange={(e) => setFrequency(parseInt(e.target.value))}
          className="w-full"
        />
      </div>
      <div className="bg-slate-800/50 p-4 rounded-xl">
        <label className="text-slate-300 text-sm block mb-2">Tx Power: {txPower} dBW</label>
        <input
          type="range"
          min="0"
          max="30"
          step="1"
          value={txPower}
          onChange={(e) => setTxPower(parseInt(e.target.value))}
          className="w-full"
        />
      </div>
      <div className="bg-slate-800/50 p-4 rounded-xl">
        <label className="text-slate-300 text-sm block mb-2">Antenna Gains: Tx {txGain} / Rx {rxGain} dBi</label>
        <input
          type="range"
          min="10"
          max="60"
          step="2"
          value={txGain}
          onChange={(e) => { setTxGain(parseInt(e.target.value)); setRxGain(parseInt(e.target.value) - 10); }}
          className="w-full"
        />
      </div>
    </div>
  );

  const renderPhaseContent = () => {
    switch (phase) {
      case 'hook':
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] px-6 py-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-6">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-cyan-400 tracking-wide">SATELLITE COMMUNICATIONS</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
              How Does a Tiny Satellite Antenna Talk to a Dish Thousands of km Away?
            </h1>
            <p className="text-lg text-slate-400 max-w-xl mb-6">
              The signal starts strong but weakens dramatically over vast distances. How do we ensure it arrives loud and clear?
            </p>

            <div className="bg-slate-800/60 rounded-2xl p-4 max-w-2xl border border-slate-700/50 mb-6">
              {renderVisualization()}
            </div>

            <button
              onClick={() => goToPhase('predict')}
              style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all hover:scale-[1.02]"
            >
              Discover Link Budgets
            </button>
          </div>
        );

      case 'predict':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">Make Your Prediction</h2>
            <p className="text-lg text-slate-200 mb-6 text-center max-w-lg">
              A satellite transmits 10 watts of power. By the time it reaches a ground station 36,000 km away, what primarily compensates for the massive signal loss?
            </p>

            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'power', text: 'Simply increasing transmitter power to megawatts' },
                { id: 'antenna', text: 'High-gain antennas that focus the signal like a flashlight beam' },
                { id: 'frequency', text: 'Using very low frequencies that travel farther' },
                { id: 'repeaters', text: 'Signal repeaters floating in space along the path' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => handlePrediction(option.id)}
                  disabled={showPredictionFeedback}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showPredictionFeedback && option.id === 'antenna'
                      ? 'bg-green-600 text-white ring-2 ring-green-400'
                      : showPredictionFeedback && selectedPrediction === option.id
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  {option.text}
                </button>
              ))}
            </div>

            {showPredictionFeedback && (
              <div className="bg-slate-800 p-5 rounded-xl mb-4 max-w-md">
                <p className={`font-bold text-lg mb-2 ${selectedPrediction === 'antenna' ? 'text-green-400' : 'text-cyan-400'}`}>
                  {selectedPrediction === 'antenna' ? 'Excellent!' : 'Not quite!'}
                </p>
                <p className="text-slate-300 mb-3">
                  High-gain antennas are the key! They focus signal energy into a narrow beam, effectively multiplying power in that direction by thousands or millions of times.
                </p>
                <button
                  onClick={() => goToPhase('play')}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className="mt-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl"
                >
                  Explore Link Budgets
                </button>
              </div>
            )}
          </div>
        );

      case 'play':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">Link Budget Calculator</h2>
            <p className="text-slate-300 mb-4 text-center max-w-lg">
              Adjust parameters to see how distance, frequency, and antenna gain affect the signal strength.
            </p>

            <div className="bg-slate-800/60 rounded-2xl p-4 max-w-2xl border border-slate-700/50 mb-4">
              {renderVisualization()}
            </div>

            {renderControls()}

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 max-w-lg mt-4">
              <p className="text-amber-400 text-sm">
                <strong>Try this:</strong> Move the distance slider from LEO (400 km) to GEO (36,000 km) and watch the path loss skyrocket!
              </p>
            </div>

            <button
              onClick={() => goToPhase('review')}
              style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
              className="mt-4 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl"
            >
              Review the Physics
            </button>
          </div>
        );

      case 'review':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">The Link Budget Equation</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mb-6">
              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-cyan-400 mb-3">Free Space Path Loss</h3>
                <div className="bg-slate-900 p-3 rounded-lg text-center mb-2">
                  <span className="text-cyan-400 font-mono text-sm">FSPL = 20log(d) + 20log(f) + 92.45 dB</span>
                </div>
                <p className="text-slate-300 text-sm">
                  Path loss increases with distance (inverse square law) and frequency. Doubling distance adds 6 dB loss.
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-amber-400 mb-3">EIRP</h3>
                <div className="bg-slate-900 p-3 rounded-lg text-center mb-2">
                  <span className="text-amber-400 font-mono text-sm">EIRP = P_tx + G_tx</span>
                </div>
                <p className="text-slate-300 text-sm">
                  Effective Isotropic Radiated Power: transmit power plus antenna gain. A 40 dBi antenna multiplies power 10,000x in that direction!
                </p>
              </div>

              <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 p-5 rounded-xl md:col-span-2">
                <h3 className="text-lg font-bold text-white mb-3">Complete Link Budget</h3>
                <div className="bg-slate-900 p-3 rounded-lg text-center mb-3">
                  <span className="text-green-400 font-mono">P_rx = EIRP - FSPL + G_rx - Losses</span>
                </div>
                <p className="text-slate-300 text-sm">
                  The received power equals transmitted EIRP minus path loss plus receiver antenna gain minus any system losses (cables, atmosphere, etc.).
                </p>
              </div>
            </div>

            <button
              onClick={() => goToPhase('twist_predict')}
              style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl"
            >
              Explore the Twist
            </button>
          </div>
        );

      case 'twist_predict':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">The Frequency Trade-off</h2>
            <div className="bg-slate-800 p-5 rounded-xl mb-6 max-w-lg">
              <p className="text-slate-200 text-center mb-4">
                Higher frequencies (like Ka-band at 30 GHz) can carry much more data than lower frequencies (like L-band at 1.5 GHz).
              </p>
              <p className="text-xl text-purple-300 text-center font-bold">
                But what happens to the link budget at higher frequencies?
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'same', text: 'Path loss stays the same - frequency does not affect it' },
                { id: 'less_loss', text: 'Higher frequencies have LESS path loss (they penetrate better)' },
                { id: 'more_loss', text: 'Higher frequencies have MORE path loss (FSPL increases with f)' },
                { id: 'unpredictable', text: 'It varies randomly depending on space weather' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => handleTwistPrediction(option.id)}
                  disabled={showTwistFeedback}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showTwistFeedback && option.id === 'more_loss'
                      ? 'bg-green-600 text-white ring-2 ring-green-400'
                      : showTwistFeedback && twistPrediction === option.id
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  {option.text}
                </button>
              ))}
            </div>

            {showTwistFeedback && (
              <div className="bg-slate-800 p-5 rounded-xl max-w-md">
                <p className={`font-bold text-lg mb-2 ${twistPrediction === 'more_loss' ? 'text-green-400' : 'text-purple-400'}`}>
                  {twistPrediction === 'more_loss' ? 'Correct!' : 'Not quite!'}
                </p>
                <p className="text-slate-300">
                  FSPL includes 20*log10(f) - doubling frequency adds 6 dB of loss! This is why high-bandwidth Ka-band links need even larger antennas.
                </p>
                <button
                  onClick={() => goToPhase('twist_play')}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl"
                >
                  See the Trade-off
                </button>
              </div>
            )}
          </div>
        );

      case 'twist_play':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Frequency vs Data Rate Trade-off</h2>

            <div className="bg-slate-800/60 rounded-2xl p-4 max-w-2xl border border-slate-700/50 mb-4">
              {renderVisualization()}
            </div>

            <div className="bg-slate-800 p-4 rounded-xl max-w-lg mb-4">
              <p className="text-slate-300 text-sm mb-2">
                <strong className="text-purple-400">Try adjusting frequency</strong> from 1 GHz to 30 GHz at a fixed distance. Watch the path loss change!
              </p>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={frequency}
                onChange={(e) => setFrequency(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-center text-purple-400 font-bold mt-2">{frequency} GHz</p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-lg">
              <div className="bg-blue-900/30 p-3 rounded-lg text-center">
                <p className="text-blue-400 font-bold">L-band (1.5 GHz)</p>
                <p className="text-slate-400 text-xs">Lower loss, lower data rate</p>
                <p className="text-slate-400 text-xs">Good for voice, IoT</p>
              </div>
              <div className="bg-purple-900/30 p-3 rounded-lg text-center">
                <p className="text-purple-400 font-bold">Ka-band (30 GHz)</p>
                <p className="text-slate-400 text-xs">Higher loss, higher data rate</p>
                <p className="text-slate-400 text-xs">Good for broadband internet</p>
              </div>
            </div>

            <button
              onClick={() => goToPhase('twist_review')}
              style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
              className="mt-6 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl"
            >
              Understand the Trade-off
            </button>
          </div>
        );

      case 'twist_review':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">The Bandwidth-Loss Trade-off</h2>

            <div className="grid grid-cols-1 gap-4 max-w-lg mb-6">
              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-purple-400 mb-2">Higher Frequency = More Loss</h3>
                <p className="text-slate-300 text-sm">
                  Every doubling of frequency adds 6 dB to path loss. Going from 1 GHz to 30 GHz adds nearly 30 dB of additional loss!
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-cyan-400 mb-2">Higher Frequency = More Bandwidth</h3>
                <p className="text-slate-300 text-sm">
                  But higher frequencies can carry more data. Ka-band can support 500+ Mbps while L-band maxes out around 500 kbps.
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-amber-400 mb-2">The Solution: Bigger Antennas!</h3>
                <p className="text-slate-300 text-sm">
                  To use high frequencies profitably, we compensate with larger antennas. Starlink user terminals have phased arrays optimized for Ka-band.
                </p>
              </div>
            </div>

            <button
              onClick={() => goToPhase('transfer')}
              style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold rounded-xl"
            >
              See Real Applications
            </button>
          </div>
        );

      case 'transfer':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-green-400 mb-6">Real-World Applications</h2>

            <div className="flex gap-2 mb-4 flex-wrap justify-center">
              {transferApps.map((app, index) => (
                <button
                  key={index}
                  onClick={() => setActiveAppTab(index)}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeAppTab === index
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {completedApps.has(index) && '+ '}{app.short}
                </button>
              ))}
            </div>

            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-1 rounded-xl w-full max-w-2xl">
              <div className="bg-slate-900 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-2">{transferApps[activeAppTab].title}</h3>
                <p className="text-slate-300 mb-4">{transferApps[activeAppTab].description}</p>

                <div className="bg-slate-800/50 p-4 rounded-lg mb-4">
                  <h4 className="text-cyan-400 font-bold mb-2">Link Budget Connection</h4>
                  <p className="text-slate-300 text-sm">{transferApps[activeAppTab].connection}</p>
                </div>

                {!completedApps.has(activeAppTab) && (
                  <button
                    onClick={() => handleAppComplete(activeAppTab)}
                    style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg"
                  >
                    Mark as Understood
                  </button>
                )}
              </div>
            </div>

            <p className="text-slate-400 mt-4">Completed: {completedApps.size} / {transferApps.length}</p>

            <button
              onClick={() => {
                if (activeAppTab < transferApps.length - 1) {
                  setActiveAppTab(activeAppTab + 1);
                } else {
                  goToPhase('test');
                }
              }}
              style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
              className="mt-4 px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl"
            >
              {activeAppTab < transferApps.length - 1 ? 'Next Application \u2192' : 'Take the Test'}
            </button>
          </div>
        );

      case 'test':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">Knowledge Test</h2>

            <div className="w-full max-w-2xl space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {testQuestions.map((q, qIndex) => (
                <div key={qIndex} className="bg-slate-800 p-4 rounded-xl">
                  <p className="text-slate-200 mb-3 font-medium">{qIndex + 1}. {q.question}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {q.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onClick={() => handleTestAnswer(qIndex, oIndex)}
                        disabled={showTestResults}
                        style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                        className={`p-3 rounded-lg text-sm text-left transition-all ${
                          showTestResults && option.correct
                            ? 'bg-green-600 text-white'
                            : showTestResults && testAnswers[qIndex] === oIndex && !option.correct
                            ? 'bg-red-600 text-white'
                            : testAnswers[qIndex] === oIndex
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                        }`}
                      >
                        {option.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {!showTestResults && testAnswers.every(a => a !== -1) && (
              <button
                onClick={() => {
                  setShowTestResults(true);
                  playSound('complete');
                  onGameEvent?.({ type: 'test_completed', data: { score: calculateTestScore() } });
                }}
                style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                className="mt-6 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl"
              >
                Submit Answers
              </button>
            )}

            {showTestResults && (
              <div className="mt-6 text-center">
                <p className="text-3xl font-bold text-cyan-400 mb-2">
                  Score: {calculateTestScore()} / 10
                </p>
                {calculateTestScore() >= 7 && (
                  <button
                    onClick={() => goToPhase('mastery')}
                    style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                    className="mt-4 px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-xl"
                  >
                    Claim Mastery Badge!
                  </button>
                )}
              </div>
            )}
          </div>
        );

      case 'mastery':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
            <div className="text-8xl mb-6">Trophy</div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-4">
              Link Budget Master!
            </h2>
            <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border-2 border-cyan-500/50 p-8 rounded-2xl max-w-md mb-6">
              <p className="text-slate-200 mb-6 text-lg">
                You understand how satellites communicate across the void of space!
              </p>
              <div className="text-left text-slate-300 space-y-3">
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>FSPL = 20log(d) + 20log(f) + 92.45 dB</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>High-gain antennas compensate for path loss</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>Higher frequency = more bandwidth but more loss</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>Link margin ensures reliable communication</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => goToPhase('hook')}
              style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl"
            >
              Start Over
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-cyan-400">Link Budget</span>
          <div className="flex gap-1.5">
            {phaseOrder.map((p) => {
              const currentIndex = phaseOrder.indexOf(phase);
              const pIndex = phaseOrder.indexOf(p);
              return (
                <button
                  key={p}
                  onClick={() => goToPhase(p)}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    phase === p
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-400 w-6'
                      : pIndex < currentIndex
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-600 w-2 hover:bg-slate-500'
                  }`}
                  title={phaseNames[p]}
                />
              );
            })}
          </div>
          <span className="text-sm text-slate-400 font-medium">{phaseNames[phase]}</span>
        </div>
      </div>

      <div className="relative z-10 pt-16 pb-8">
        {renderPhaseContent()}
      </div>
    </div>
  );
};

export default LinkBudgetRenderer;
