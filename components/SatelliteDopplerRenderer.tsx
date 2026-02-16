'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

const realWorldApps = [
   {
      icon: '🛰️',
      title: 'GPS Navigation Systems',
      short: 'Precise positioning worldwide',
      tagline: 'Doppler correction for centimeter accuracy',
      description: 'GPS satellites transmit signals that experience Doppler shifts as they orbit. Receivers must correct for these shifts to calculate precise positions, enabling everything from smartphone navigation to autonomous vehicles.',
      connection: 'The Doppler effect causes GPS signal frequencies to shift by several kHz as satellites move relative to receivers. Without compensation, position errors would accumulate rapidly.',
      howItWorks: 'GPS receivers track the carrier frequency of satellite signals and compute the Doppler shift. This reveals the satellite velocity vector, which combined with timing data gives position accuracy within centimeters.',
      stats: [
         { value: '31', label: 'Active GPS satellites', icon: '🛰️' },
         { value: '±5kHz', label: 'Typical Doppler shift', icon: '📊' },
         { value: '<1m', label: 'Position accuracy', icon: '📍' }
      ],
      examples: ['Smartphone navigation', 'Aircraft guidance', 'Precision agriculture', 'Autonomous vehicles'],
      companies: ['Garmin', 'Trimble', 'u-blox', 'Qualcomm'],
      futureImpact: 'Next-generation GNSS systems will use multi-frequency Doppler tracking for sub-centimeter positioning accuracy.',
      color: '#3B82F6'
   },
   {
      icon: '📡',
      title: 'Starlink Internet',
      short: 'Global broadband from LEO',
      tagline: 'Tracking thousands of fast-moving satellites',
      description: 'SpaceX Starlink satellites orbit at 550km altitude, moving at 7.5 km/s. User terminals must continuously track Doppler-shifted signals from rapidly moving satellites while seamlessly handing off between them.',
      connection: 'LEO satellites create massive Doppler shifts (±40 kHz at Ku-band) that change rapidly during each pass. Phased array antennas and software-defined radios handle this automatically.',
      howItWorks: 'Starlink dishes use electronically-steered phased arrays to track satellites. Onboard processors predict and compensate for Doppler shifts in real-time, maintaining stable connections during satellite handoffs.',
      stats: [
         { value: '5,000+', label: 'Satellites in orbit', icon: '🛰️' },
         { value: '7.5 km/s', label: 'Orbital velocity', icon: '⚡' },
         { value: '~100ms', label: 'Latency to ground', icon: '📶' }
      ],
      examples: ['Rural broadband', 'Maritime connectivity', 'Aviation WiFi', 'Disaster response'],
      companies: ['SpaceX', 'Amazon Kuiper', 'OneWeb', 'Telesat'],
      futureImpact: 'LEO constellations will provide global 5G-like connectivity, requiring advanced Doppler compensation at massive scale.',
      color: '#10B981'
   },
   {
      icon: '🚀',
      title: 'Deep Space Communications',
      short: 'Talking to distant spacecraft',
      tagline: 'Extracting signals from interplanetary distances',
      description: 'NASA Deep Space Network tracks spacecraft billions of kilometers away. Doppler measurements reveal spacecraft velocity with extraordinary precision, enabling navigation to distant planets and moons.',
      connection: 'At X-band frequencies, even small velocity changes produce measurable Doppler shifts. This allows tracking spacecraft motion to fractions of a millimeter per second.',
      howItWorks: 'Giant dish antennas receive extremely weak signals from distant spacecraft. Hydrogen maser atomic clocks provide the frequency stability needed to measure Doppler shifts of millihertz.',
      stats: [
         { value: '70m', label: 'Largest DSN dishes', icon: '📡' },
         { value: '0.1 mm/s', label: 'Velocity precision', icon: '📏' },
         { value: '24B km', label: 'Voyager 1 distance', icon: '🌌' }
      ],
      examples: ['Mars rover communications', 'Voyager missions', 'James Webb telescope', 'Asteroid missions'],
      companies: ['NASA JPL', 'ESA ESTRACK', 'JAXA', 'ISRO'],
      futureImpact: 'Optical communications will supplement radio, but Doppler tracking remains essential for precision navigation.',
      color: '#8B5CF6'
   },
   {
      icon: '🌍',
      title: 'Weather Satellites',
      short: 'Monitoring Earth from orbit',
      tagline: 'Continuous global weather observation',
      description: 'Polar-orbiting weather satellites circle Earth every 100 minutes, requiring ground stations to track rapidly changing Doppler shifts. Geostationary satellites provide fixed coverage without Doppler complications.',
      connection: 'NOAA polar satellites experience significant Doppler shifts during each pass. Ground stations like HRPT receivers must track these shifts to download weather imagery.',
      howItWorks: 'Polar satellites transmit at L-band frequencies. As they pass overhead, receivers use phase-locked loops to track the changing frequency and decode high-resolution weather data.',
      stats: [
         { value: '14', label: 'Orbits per day (polar)', icon: '🔄' },
         { value: '850 km', label: 'Typical altitude', icon: '📐' },
         { value: '±25 kHz', label: 'Doppler range', icon: '📊' }
      ],
      examples: ['Hurricane tracking', 'Climate monitoring', 'Search and rescue', 'Agriculture forecasting'],
      companies: ['NOAA', 'EUMETSAT', 'JMA', 'CMA'],
      futureImpact: 'Next-generation weather satellites will use higher frequencies with larger Doppler shifts, requiring more sophisticated tracking.',
      color: '#F59E0B'
   }
];

// ============================================================================
// GAME 200: DOPPLER SHIFT IN SATELLITE COMMUNICATIONS
// Physics: f_received = f_transmitted * (1 + v_radial/c)
// LEO satellites have huge Doppler shifts (~40 kHz at S-band)
// GEO satellites have almost none (stationary relative to ground)
// ============================================================================

interface Props {
  onGameEvent?: (event: { type: string; data?: Record<string, unknown> }) => void;
  gamePhase?: string;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const SatelliteDopplerRenderer: React.FC<Props> = ({ onGameEvent, gamePhase }) => {
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
  const [orbitType, setOrbitType] = useState<'LEO' | 'MEO' | 'GEO'>('LEO');
  const [frequency, setFrequency] = useState(2200); // MHz (S-band)
  const [passProgress, setPassProgress] = useState(50); // 0-100, 50 = overhead
  const [animPhase, setAnimPhase] = useState(0);
  const [isTracking, setIsTracking] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);

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
  const calculateDoppler = useCallback(() => {
    const c = 299792458; // Speed of light (m/s)
    const freqHz = frequency * 1e6;

    // Orbital velocities
    const orbitalVelocities = {
      'LEO': 7800, // m/s at 400 km
      'MEO': 3900, // m/s at 20,000 km
      'GEO': 3070  // m/s at 36,000 km (but zero relative to ground!)
    };

    // For GEO, the satellite moves with Earth, so radial velocity is ~0
    // For LEO/MEO, max radial velocity depends on pass geometry
    const orbitalV = orbitalVelocities[orbitType];

    // Pass geometry: at horizon (0 or 100), max radial velocity
    // At overhead (50), zero radial velocity
    const passAngle = (passProgress - 50) / 50 * (Math.PI / 2);
    let radialVelocity = orbitalV * Math.sin(passAngle);

    // GEO has essentially zero Doppler (geostationary)
    if (orbitType === 'GEO') {
      radialVelocity = radialVelocity * 0.001; // Tiny residual from orbit eccentricity
    }

    // Doppler shift
    const dopplerShift = freqHz * (radialVelocity / c);
    const receivedFreq = freqHz + dopplerShift;

    // Rate of change (Hz/s)
    const dopplerRate = orbitType === 'LEO' ? 500 : orbitType === 'MEO' ? 100 : 0.1;

    return {
      txFreq: (freqHz / 1e6).toFixed(3),
      rxFreq: (receivedFreq / 1e6).toFixed(6),
      dopplerShift: (dopplerShift / 1000).toFixed(2), // kHz
      dopplerRate: dopplerRate.toFixed(1),
      radialVelocity: radialVelocity.toFixed(0),
      approaching: radialVelocity < 0,
      orbitalVelocity: orbitalV,
      maxShift: ((orbitalV / c) * freqHz / 1000).toFixed(1) // kHz
    };
  }, [orbitType, frequency, passProgress]);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase !== undefined && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 360);
      // Auto-advance pass progress for animation
      if (phase === 'play' || phase === 'twist_play') {
        setPassProgress(p => {
          const newP = p + 0.5;
          return newP > 100 ? 0 : newP;
        });
      }
    }, 50);
    return () => clearInterval(interval);
  }, [phase]);

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
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #334155',
        backgroundColor: '#0f172a',
        gap: '16px',
        position: 'relative',
        zIndex: 50
      }}>
        <span style={{ fontSize: '14px', fontWeight: '600', color: '#06b6d4', minWidth: '120px' }}>Satellite Doppler</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                aria-label={phaseNames[p]}
                style={{
                  height: '10px',
                  width: phase === p ? '24px' : '10px',
                  borderRadius: '5px',
                  backgroundColor: i < currentIndex ? '#22c55e' : phase === p ? '#06b6d4' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease-in-out',
                  zIndex: 10,
                  border: 'none',
                  padding: 0
                }}
                title={phaseNames[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>
            {currentIndex + 1} / {phaseOrder.length}
          </span>
        </div>
        <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '600', minWidth: '120px', textAlign: 'right' }}>{phaseNames[phase]}</span>
      </div>
    );
  };

  // Bottom navigation bar with Back/Next
  const renderBottomBar = () => {
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
        position: 'relative',
        zIndex: 50
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
            zIndex: 10,
            transition: 'all 0.2s ease-in-out'
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
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #22c55e 100%)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(6, 182, 212, 0.3)',
              zIndex: 10,
              transition: 'all 0.2s ease-in-out'
            }}
          >
            Next
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
              zIndex: 10,
              transition: 'all 0.2s ease-in-out'
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
    playSound(prediction === 'shifts' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'prediction_made', data: { prediction, correct: prediction === 'shifts' } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'none' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'twist_prediction_made', data: { prediction, correct: prediction === 'none' } });
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
    onGameEvent?.({ type: 'app_explored', data: { appIndex, appTitle: realWorldApps[appIndex].title } });
  }, [playSound, onGameEvent]);

  const testQuestions = [
    {
      question: "What is the Doppler effect?",
      options: [
        { text: "A change in signal strength with distance", correct: false },
        { text: "A change in frequency due to relative motion between source and observer", correct: true },
        { text: "A type of signal encryption", correct: false },
        { text: "An error in satellite positioning", correct: false }
      ]
    },
    {
      question: "As a satellite approaches you, the received frequency is:",
      options: [
        { text: "Lower than transmitted (red-shifted)", correct: false },
        { text: "Higher than transmitted (blue-shifted)", correct: true },
        { text: "Exactly the same as transmitted", correct: false },
        { text: "Randomly varying", correct: false }
      ]
    },
    {
      question: "LEO satellites have much larger Doppler shifts than GEO satellites because:",
      options: [
        { text: "LEO satellites use higher frequencies", correct: false },
        { text: "LEO satellites move rapidly relative to ground stations", correct: true },
        { text: "GEO satellites are stationary in space", correct: false },
        { text: "LEO satellites are bigger", correct: false }
      ]
    },
    {
      question: "A GEO satellite has almost zero Doppler because:",
      options: [
        { text: "It orbits so slowly the signal has time to catch up", correct: false },
        { text: "It rotates with Earth, staying stationary relative to ground", correct: true },
        { text: "It uses special Doppler-canceling technology", correct: false },
        { text: "It is too far away for Doppler to matter", correct: false }
      ]
    },
    {
      question: "The Doppler formula is approximately:",
      options: [
        { text: "f_received = f_transmitted x (1 + v/c)", correct: true },
        { text: "f_received = f_transmitted + v", correct: false },
        { text: "f_received = f_transmitted / distance", correct: false },
        { text: "f_received = f_transmitted x temperature", correct: false }
      ]
    },
    {
      question: "Why must satellite receivers track the changing Doppler shift?",
      options: [
        { text: "To save battery power", correct: false },
        { text: "To stay tuned to the signal as its frequency changes during a pass", correct: true },
        { text: "To encrypt the communication", correct: false },
        { text: "Doppler tracking is optional for modern receivers", correct: false }
      ]
    },
    {
      question: "When is the Doppler shift zero during a LEO satellite pass?",
      options: [
        { text: "When the satellite is at the horizon", correct: false },
        { text: "When the satellite is directly overhead (closest approach)", correct: true },
        { text: "At the start of the pass only", correct: false },
        { text: "The shift is never zero", correct: false }
      ]
    },
    {
      question: "If a satellite transmits at exactly 2.200000 GHz and is approaching at 7 km/s, the received frequency is approximately:",
      options: [
        { text: "2.200000 GHz (no change)", correct: false },
        { text: "Slightly higher, around 2.200051 GHz", correct: true },
        { text: "Slightly lower, around 2.199949 GHz", correct: false },
        { text: "Doubled to 4.400000 GHz", correct: false }
      ]
    },
    {
      question: "GPS satellites measure distance using signal timing. How does Doppler affect GPS?",
      options: [
        { text: "It has no effect on GPS", correct: false },
        { text: "Doppler must be corrected or it causes positioning errors", correct: true },
        { text: "GPS only works when satellites are stationary", correct: false },
        { text: "Doppler improves GPS accuracy", correct: false }
      ]
    },
    {
      question: "Starlink satellites in LEO require more sophisticated frequency tracking than GEO satellites because:",
      options: [
        { text: "Starlink uses cheaper radios", correct: false },
        { text: "LEO orbital velocity causes large, rapidly-changing Doppler shifts", correct: true },
        { text: "GEO satellites don't use radio frequencies", correct: false },
        { text: "Starlink satellites are always stationary", correct: false }
      ]
    }
  ];

  const transferApps = [
    {
      title: "Police Radar Guns",
      short: "Radar",
      description: "Measure vehicle speed by detecting the Doppler shift of reflected radio waves.",
      connection: "Same physics as satellite Doppler - the frequency shift reveals the target's radial velocity."
    },
    {
      title: "Weather Radar",
      short: "Weather",
      description: "Doppler weather radar detects rotation in storms, helping predict tornadoes.",
      connection: "By measuring the Doppler shift of raindrops, meteorologists can see which way and how fast precipitation is moving."
    },
    {
      title: "Astronomical Redshift",
      short: "Astronomy",
      description: "Distant galaxies show redshifted light, revealing the universe is expanding.",
      connection: "The same Doppler principle that shifts satellite signals also shifts starlight from receding galaxies."
    },
    {
      title: "Medical Ultrasound",
      short: "Medical",
      description: "Doppler ultrasound measures blood flow velocity in arteries and veins.",
      connection: "Sound waves reflected from moving blood cells are frequency-shifted, revealing flow speed and direction."
    }
  ];

  const renderVisualization = () => {
    const doppler = calculateDoppler();
    const satX = 80 + (passProgress / 100) * 340;
    const satY = 120 - Math.sin((passProgress / 100) * Math.PI) * 80;

    // Wave compression/expansion visualization - more dramatic effect
    const baseWaveSpacing = 18;
    const compressionFactor = passProgress < 50 ? 0.6 + (passProgress / 50) * 0.4 : 1.0 + ((passProgress - 50) / 50) * 0.5;
    const waveSpacing = baseWaveSpacing * compressionFactor;

    // Frequency shift for wave color animation
    const shiftAmount = parseFloat(doppler.dopplerShift);
    const isApproaching = passProgress < 50;

    return (
      <svg viewBox="0 0 500 400" style={{ width: '100%', height: 'auto', maxWidth: '600px' }}>
        <defs>
          {/* === PREMIUM SKY/SPACE GRADIENTS === */}
          <linearGradient id="satdSpaceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="25%" stopColor="#0a0a2e" />
            <stop offset="50%" stopColor="#0c1445" />
            <stop offset="75%" stopColor="#1e3a5f" />
            <stop offset="100%" stopColor="#1e3a5f" />
          </linearGradient>

          {/* Earth atmosphere gradient */}
          <linearGradient id="satdAtmosphereGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
            <stop offset="50%" stopColor="#0891b2" stopOpacity="0.1" />
            <stop offset="80%" stopColor="#155e75" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#164e63" stopOpacity="0.3" />
          </linearGradient>

          {/* Premium Earth surface gradient */}
          <linearGradient id="satdEarthSurface" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#166534" />
            <stop offset="30%" stopColor="#14532d" />
            <stop offset="60%" stopColor="#0f3d1c" />
            <stop offset="100%" stopColor="#052e16" />
          </linearGradient>

          {/* Earth curve highlight */}
          <radialGradient id="satdEarthCurve" cx="50%" cy="0%" r="100%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
            <stop offset="40%" stopColor="#166534" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#052e16" stopOpacity="0" />
          </radialGradient>

          {/* === SATELLITE GRADIENTS === */}
          <linearGradient id="satdSatelliteBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="25%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#475569" />
            <stop offset="75%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Solar panel gradient with cell pattern effect */}
          <linearGradient id="satdSolarPanel" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="20%" stopColor="#2563eb" />
            <stop offset="40%" stopColor="#1d4ed8" />
            <stop offset="60%" stopColor="#3b82f6" />
            <stop offset="80%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>

          {/* Satellite antenna glow */}
          <radialGradient id="satdAntennaGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
            <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
          </radialGradient>

          {/* === GROUND STATION GRADIENTS === */}
          <linearGradient id="satdStationMetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="30%" stopColor="#475569" />
            <stop offset="70%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Dish reflector gradient */}
          <radialGradient id="satdDishReflector" cx="30%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="30%" stopColor="#cbd5e1" />
            <stop offset="60%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </radialGradient>

          {/* Station glow effect */}
          <radialGradient id="satdStationGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
          </radialGradient>

          {/* === SIGNAL WAVE GRADIENTS === */}
          {/* Blue-shifted (approaching) signal */}
          <linearGradient id="satdSignalApproaching" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
            <stop offset="30%" stopColor="#4ade80" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#86efac" stopOpacity="1" />
            <stop offset="70%" stopColor="#4ade80" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>

          {/* Red-shifted (receding) signal */}
          <linearGradient id="satdSignalReceding" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
            <stop offset="30%" stopColor="#f87171" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#fca5a5" stopOpacity="1" />
            <stop offset="70%" stopColor="#f87171" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </linearGradient>

          {/* Neutral signal (overhead) */}
          <linearGradient id="satdSignalNeutral" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
            <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#67e8f9" stopOpacity="1" />
            <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>

          {/* === GLOW FILTERS === */}
          <filter id="satdSatelliteGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="satdSignalGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="satdStationBeamGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="satdPanelShine" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="satdStarGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Orbit path gradient */}
          <linearGradient id="satdOrbitPath" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Premium space background */}
        <rect width="500" height="400" fill="url(#satdSpaceGradient)" />

        {/* Stars with glow effect */}
        {[...Array(25)].map((_, i) => {
          const starX = (i * 47 + 20) % 490 + 5;
          const starY = (i * 23 + 10) % 180;
          const starSize = (i % 3) * 0.5 + 0.8;
          const opacity = 0.4 + (i % 4) * 0.15;
          return (
            <circle
              key={i}
              cx={starX}
              cy={starY}
              r={starSize}
              fill="white"
              opacity={opacity}
              filter="url(#satdStarGlow)"
            >
              <animate
                attributeName="opacity"
                values={`${opacity};${opacity * 0.5};${opacity}`}
                dur={`${2 + (i % 3)}s`}
                repeatCount="indefinite"
              />
            </circle>
          );
        })}

        {/* Orbital path arc */}
        <path
          d="M 60 120 Q 250 20 440 120"
          fill="none"
          stroke="url(#satdOrbitPath)"
          strokeWidth="2"
          strokeDasharray="8 4"
          opacity="0.5"
        />
        <text x="250" y="35" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="600">
          {orbitType} ORBIT PATH ({orbitType === 'LEO' ? '400 km' : orbitType === 'MEO' ? '20,000 km' : '36,000 km'})
        </text>

        {/* Atmosphere layer */}
        <rect x="0" y="240" width="500" height="40" fill="url(#satdAtmosphereGradient)" />

        {/* Earth surface with curvature */}
        <ellipse cx="250" cy="340" rx="300" ry="80" fill="url(#satdEarthSurface)" />
        <ellipse cx="250" cy="280" rx="280" ry="40" fill="url(#satdEarthCurve)" />

        {/* Ground terrain details */}
        <ellipse cx="100" cy="295" rx="40" ry="8" fill="#0f3d1c" opacity="0.6" />
        <ellipse cx="380" cy="300" rx="50" ry="10" fill="#0f3d1c" opacity="0.5" />
        <ellipse cx="200" cy="310" rx="30" ry="6" fill="#0f3d1c" opacity="0.4" />

        {/* === PREMIUM GROUND STATION === */}
        <g transform="translate(250, 265)">
          {/* Station glow */}
          <ellipse cx="0" cy="0" rx="50" ry="20" fill="url(#satdStationGlow)" />

          {/* Building base */}
          <rect x="-20" y="5" width="40" height="30" fill="url(#satdStationMetal)" rx="3" />
          <rect x="-18" y="7" width="36" height="26" fill="#1e293b" opacity="0.3" rx="2" />

          {/* Equipment details */}
          <rect x="-15" y="20" width="8" height="12" fill="#22c55e" opacity="0.6" rx="1">
            <animate attributeName="opacity" values="0.4;0.8;0.4" dur="1.5s" repeatCount="indefinite" />
          </rect>
          <rect x="-3" y="22" width="6" height="10" fill="#3b82f6" opacity="0.5" rx="1" />
          <rect x="7" y="18" width="8" height="14" fill="#f59e0b" opacity="0.5" rx="1">
            <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite" />
          </rect>

          {/* Dish support structure */}
          <rect x="-4" y="-25" width="8" height="30" fill="url(#satdStationMetal)" rx="1" />
          <polygon points="-15,-5 15,-5 8,5 -8,5" fill="#475569" />

          {/* Main dish - premium reflector */}
          <g transform={`rotate(${(satX - 250) * 0.15}, 0, -35)`}>
            <ellipse cx="0" cy="-40" rx="28" ry="12" fill="url(#satdDishReflector)" stroke="#94a3b8" strokeWidth="1.5" />
            <ellipse cx="0" cy="-40" rx="24" ry="10" fill="none" stroke="#cbd5e1" strokeWidth="0.5" strokeOpacity="0.5" />
            <ellipse cx="0" cy="-40" rx="18" ry="7" fill="none" stroke="#e2e8f0" strokeWidth="0.3" strokeOpacity="0.3" />

            {/* Feed horn */}
            <line x1="0" y1="-40" x2="0" y2="-55" stroke="#64748b" strokeWidth="2" />
            <circle cx="0" cy="-57" r="4" fill="#475569" stroke="#64748b" />
            <circle cx="0" cy="-57" r="2" fill="#06b6d4">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="0.5s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* Tracking beam to satellite */}
          {isTracking && (
            <line
              x1="0"
              y1="-55"
              x2={(satX - 250) * 0.4}
              y2={(satY - 265) * 0.4 - 55}
              stroke={isApproaching ? '#4ade80' : passProgress > 50 ? '#f87171' : '#22d3ee'}
              strokeWidth="1.5"
              strokeOpacity="0.4"
              filter="url(#satdStationBeamGlow)"
            />
          )}

          {/* Station label */}
          <rect x="-35" y="40" width="70" height="14" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
          <text x="0" y="50" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">GROUND STATION</text>
        </g>

        {/* === PREMIUM SATELLITE === */}
        <g transform={`translate(${satX}, ${satY})`} filter="url(#satdSatelliteGlow)">
          {/* Main body with depth */}
          <rect x="-15" y="-8" width="30" height="16" fill="url(#satdSatelliteBody)" rx="3" stroke="#64748b" strokeWidth="0.5" />
          <rect x="-13" y="-6" width="26" height="12" fill="#1e293b" opacity="0.3" rx="2" />

          {/* Solar panels with cell pattern */}
          <g filter="url(#satdPanelShine)">
            <rect x="-45" y="-5" width="28" height="10" fill="url(#satdSolarPanel)" rx="1" stroke="#1e40af" strokeWidth="0.5" />
            <rect x="17" y="-5" width="28" height="10" fill="url(#satdSolarPanel)" rx="1" stroke="#1e40af" strokeWidth="0.5" />
            {/* Panel grid lines */}
            {[-40, -35, -30, -25, 22, 27, 32, 37].map((x, i) => (
              <line key={i} x1={x} y1="-4" x2={x} y2="4" stroke="#1e3a8a" strokeWidth="0.3" strokeOpacity="0.5" />
            ))}
          </g>

          {/* Panel hinges */}
          <rect x="-17" y="-3" width="4" height="6" fill="#475569" rx="1" />
          <rect x="13" y="-3" width="4" height="6" fill="#475569" rx="1" />

          {/* Antenna array */}
          <circle cx="0" cy="12" r="6" fill="url(#satdAntennaGlow)" />
          <circle cx="0" cy="12" r="3" fill="#06b6d4">
            <animate attributeName="r" values="3;4;3" dur="1s" repeatCount="indefinite" />
          </circle>

          {/* Status lights */}
          <circle cx="-8" cy="-3" r="1.5" fill="#22c55e">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
          </circle>
          <circle cx="8" cy="-3" r="1.5" fill="#f59e0b">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
          </circle>

          {/* Orbit type label */}
          <rect x="-20" y="-28" width="40" height="12" rx="3" fill="#0f172a" fillOpacity="0.8" />
          <text x="0" y="-20" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">
            {orbitType}
          </text>
        </g>

        {/* === DOPPLER-SHIFTED SIGNAL WAVES === */}
        {isTracking && [...Array(6)].map((_, i) => {
          const progress = (animPhase / 360 + i / 6) % 1;
          const waveX = satX - (satX - 250) * progress;
          const waveY = satY + 15 + (265 - satY - 15) * progress;

          // Wave color based on Doppler shift
          const gradientId = Math.abs(shiftAmount) < 5
            ? 'satdSignalNeutral'
            : isApproaching ? 'satdSignalApproaching' : 'satdSignalReceding';

          // Wave compression effect
          const compressionScale = isApproaching ? 0.7 : passProgress > 50 ? 1.4 : 1.0;
          const waveWidth = (15 + i * 4) * compressionScale;

          if (waveY > 255) return null;

          return (
            <g key={i} filter="url(#satdSignalGlow)">
              <ellipse
                cx={waveX}
                cy={waveY}
                rx={waveWidth}
                ry={waveWidth * 0.3}
                fill="none"
                stroke={isApproaching ? '#4ade80' : passProgress > 50 ? '#f87171' : '#22d3ee'}
                strokeWidth={2 - i * 0.2}
                opacity={0.8 - i * 0.1}
              />
            </g>
          );
        })}

        {/* Direction indicator with velocity */}
        <g transform={`translate(${satX}, ${satY - 42})`}>
          <rect x="-35" y="-8" width="70" height="16" rx="4" fill="#0f172a" fillOpacity="0.9" stroke={isApproaching ? '#22c55e' : passProgress > 50 ? '#ef4444' : '#06b6d4'} strokeWidth="0.5" />
          <path
            d={isApproaching ? "M -25 0 L -15 0 L -18 -3 M -15 0 L -18 3" : passProgress > 50 ? "M 25 0 L 15 0 L 18 -3 M 15 0 L 18 3" : "M -5 0 L 5 0"}
            stroke={isApproaching ? '#22c55e' : passProgress > 50 ? '#ef4444' : '#06b6d4'}
            strokeWidth="2"
            fill="none"
          />
          <text x={isApproaching ? 5 : passProgress > 50 ? -5 : 0} y="4" textAnchor="middle" fill={isApproaching ? '#4ade80' : passProgress > 50 ? '#f87171' : '#67e8f9'} fontSize="11" fontWeight="bold">
            {Math.abs(passProgress - 50) < 5 ? 'OVERHEAD' : isApproaching ? 'APPROACHING' : 'RECEDING'}
          </text>
        </g>

        {/* === PREMIUM DOPPLER STATUS PANEL === */}
        <g transform="translate(10, 10)">
          <rect x="0" y="0" width="165" height="145" fill="#0f172a" fillOpacity="0.95" rx="10" stroke="#334155" strokeWidth="1" />
          <rect x="2" y="2" width="161" height="20" rx="8" fill="#1e293b" />
          <text x="82" y="16" textAnchor="middle" fill="#22d3ee" fontSize="11" fontWeight="bold">DOPPLER TELEMETRY</text>

          {/* Data rows with better styling */}
          <text x="10" y="38" fill="#64748b" fontSize="11" fontWeight="600">TX FREQUENCY</text>
          <text x="155" y="38" textAnchor="end" fill="#f59e0b" fontSize="11" fontWeight="bold">{doppler.txFreq} MHz</text>

          <text x="10" y="55" fill="#64748b" fontSize="11" fontWeight="600">RX FREQUENCY</text>
          <text x="155" y="55" textAnchor="end" fill="#22d3ee" fontSize="11" fontWeight="bold">{doppler.rxFreq} MHz</text>

          <line x1="10" y1="62" x2="155" y2="62" stroke="#334155" strokeWidth="0.5" />

          <text x="10" y="77" fill="#64748b" fontSize="11" fontWeight="600">DOPPLER SHIFT</text>
          <text x="155" y="77" textAnchor="end" fill={shiftAmount > 0 ? '#ef4444' : shiftAmount < 0 ? '#22c55e' : '#64748b'} fontSize="11" fontWeight="bold">
            {shiftAmount > 0 ? '+' : ''}{doppler.dopplerShift} kHz
          </text>

          <text x="10" y="94" fill="#64748b" fontSize="11" fontWeight="600">RADIAL VELOCITY</text>
          <text x="155" y="94" textAnchor="end" fill="#a855f7" fontSize="11" fontWeight="bold">{doppler.radialVelocity} m/s</text>

          <text x="10" y="111" fill="#64748b" fontSize="11" fontWeight="600">MAX SHIFT ({orbitType})</text>
          <text x="155" y="111" textAnchor="end" fill="#f97316" fontSize="11" fontWeight="bold">+/-{doppler.maxShift} kHz</text>

          {/* Tracking status bar */}
          <rect x="10" y="120" width="145" height="18" rx="5" fill={isTracking ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'} stroke={isTracking ? '#22c55e' : '#ef4444'} strokeWidth="0.5" />
          <circle cx="22" cy="129" r="4" fill={isTracking ? '#22c55e' : '#ef4444'}>
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
          </circle>
          <text x="82" y="133" textAnchor="middle" fill={isTracking ? '#4ade80' : '#f87171'} fontSize="11" fontWeight="bold">
            {isTracking ? 'SIGNAL LOCKED' : 'SIGNAL LOST'}
          </text>
        </g>

        {/* === FREQUENCY SPECTRUM VISUALIZATION === */}
        <g transform="translate(325, 10)">
          <rect x="0" y="0" width="165" height="95" fill="#0f172a" fillOpacity="0.95" rx="10" stroke="#334155" strokeWidth="1" />
          <rect x="2" y="2" width="161" height="18" rx="8" fill="#1e293b" />
          <text x="82" y="14" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold">FREQUENCY SPECTRUM</text>

          {/* Spectrum background with grid */}
          <rect x="10" y="25" width="145" height="55" fill="#020617" rx="4" />
          {[...Array(7)].map((_, i) => (
            <line key={i} x1={10 + i * 24.2} y1="25" x2={10 + i * 24.2} y2="80" stroke="#1e293b" strokeWidth="0.5" />
          ))}
          {[...Array(4)].map((_, i) => (
            <line key={i} x1="10" y1={25 + i * 18.3} x2="155" y2={25 + i * 18.3} stroke="#1e293b" strokeWidth="0.5" />
          ))}

          {/* Center frequency marker */}
          <line x1="82" y1="25" x2="82" y2="80" stroke="#475569" strokeWidth="1" strokeDasharray="3 2" />

          {/* Signal peak with Doppler offset */}
          <rect
            x={82 + shiftAmount * 1.5 - 8}
            y="32"
            width="16"
            height="45"
            rx="3"
            fill={shiftAmount > 0 ? '#ef4444' : shiftAmount < 0 ? '#22c55e' : '#06b6d4'}
            opacity="0.8"
          >
            <animate attributeName="opacity" values="0.6;0.9;0.6" dur="0.5s" repeatCount="indefinite" />
          </rect>
          <rect
            x={82 + shiftAmount * 1.5 - 4}
            y="38"
            width="8"
            height="33"
            rx="2"
            fill={shiftAmount > 0 ? '#fca5a5' : shiftAmount < 0 ? '#86efac' : '#67e8f9'}
            opacity="0.9"
          />

          {/* Labels */}
          <text x="20" y="90" fill="#64748b" fontSize="11">-{doppler.maxShift}kHz</text>
          <text x="82" y="90" textAnchor="middle" fill="#64748b" fontSize="11">Center</text>
          <text x="145" y="90" textAnchor="end" fill="#64748b" fontSize="11">+{doppler.maxShift}kHz</text>
        </g>

        {/* === PASS PROGRESS INDICATOR === */}
        <g transform="translate(10, 345)">
          <rect x="0" y="0" width="480" height="45" fill="#0f172a" fillOpacity="0.95" rx="10" stroke="#334155" strokeWidth="1" />

          <text x="15" y="18" fill="#64748b" fontSize="11" fontWeight="600">SATELLITE PASS PROGRESS</text>

          {/* Progress bar with gradient */}
          <rect x="15" y="25" width="380" height="12" fill="#1e293b" rx="6" />
          <rect
            x="15"
            y="25"
            width={passProgress * 3.8}
            height="12"
            fill={isApproaching ? '#22c55e' : passProgress > 50 ? '#ef4444' : '#06b6d4'}
            rx="6"
          />

          {/* Position markers */}
          <text x="15" y="45" fill="#64748b" fontSize="11">RISE</text>
          <text x="200" y="45" textAnchor="middle" fill="#64748b" fontSize="11">OVERHEAD</text>
          <text x="395" y="45" textAnchor="end" fill="#64748b" fontSize="11">SET</text>

          {/* Current position indicator */}
          <circle cx={15 + passProgress * 3.8} cy="31" r="6" fill="#ffffff" stroke={isApproaching ? '#22c55e' : passProgress > 50 ? '#ef4444' : '#06b6d4'} strokeWidth="2" />

          {/* Percentage display */}
          <rect x="410" y="20" width="55" height="20" rx="5" fill="#1e293b" />
          <text x="437" y="34" textAnchor="middle" fill="#22d3ee" fontSize="11" fontWeight="bold">{passProgress.toFixed(0)}%</text>
        </g>
      </svg>
    );
  };

  const renderControls = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      <div className="bg-slate-800/50 p-4 rounded-xl">
        <label className="text-slate-300 text-sm block mb-2">Orbit Type</label>
        <div className="flex gap-2">
          {['LEO', 'MEO', 'GEO'].map(orbit => (
            <button
              key={orbit}
              onClick={() => setOrbitType(orbit as typeof orbitType)}
              style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold ${orbitType === orbit ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              {orbit}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-slate-800/50 p-4 rounded-xl">
        <label className="text-slate-300 text-sm block mb-2">Frequency: {frequency} MHz (S-band: 2-4 GHz)</label>
        <input
          type="range"
          min="400"
          max="12000"
          step="100"
          value={frequency}
          onChange={(e) => setFrequency(parseInt(e.target.value))}
          className="w-full"
          style={{ accentColor: '#06b6d4', height: '20px', touchAction: 'none' }}
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>400 MHz</span>
          <span>12 GHz</span>
        </div>
      </div>
      <div className="bg-slate-800/50 p-4 rounded-xl">
        <label className="text-slate-300 text-sm block mb-2">Pass Position: {passProgress.toFixed(0)}% (0% = rising, 50% = overhead, 100% = setting)</label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={passProgress}
          onChange={(e) => setPassProgress(parseInt(e.target.value))}
          className="w-full"
          style={{ accentColor: '#06b6d4', height: '20px', touchAction: 'none' }}
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>Rise (0%)</span>
          <span>Overhead (50%)</span>
          <span>Set (100%)</span>
        </div>
      </div>
    </div>
  );

  const renderPhaseContent = () => {
    switch (phase) {
      case 'hook':
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] px-6 py-8 text-center" style={{ fontWeight: 400 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full mb-6">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-cyan-400 tracking-wide" style={{ fontWeight: 600 }}>SATELLITE COMMUNICATIONS</span>
            </div>

            <h1 className="text-3xl md:text-4xl mb-4 bg-gradient-to-r from-white via-cyan-100 to-green-200 bg-clip-text text-transparent" style={{ fontWeight: 700 }}>
              Why Do Satellite Signals Need Frequency Tracking?
            </h1>
            <p className="text-lg text-slate-400 max-w-xl mb-6">
              A satellite transmits at exactly 2.2000 GHz. But the ground station receives something different. What is happening?
            </p>

            <div className="bg-slate-800/60 rounded-2xl p-4 max-w-2xl border-2 border-slate-700/70 mb-6">
              {renderVisualization()}
            </div>

            <button
              onClick={() => goToPhase('predict')}
              style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10, background: 'linear-gradient(135deg, #06b6d4 0%, #22c55e 100%)', fontWeight: 700, cursor: 'pointer' }}
              className="px-8 py-4 text-white text-lg rounded-2xl transition-all hover:scale-[1.02]"
            >
              Discover the Doppler Effect
            </button>
          </div>
        );

      case 'predict':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">Make Your Prediction</h2>
            <p className="text-lg text-slate-200 mb-6 text-center max-w-lg">
              A LEO satellite at 400 km altitude moves at 7.8 km/s. It transmits at exactly 2.200000 GHz. What does the ground station receive?
            </p>

            <div className="bg-slate-800/60 rounded-2xl p-4 max-w-2xl border border-slate-700/50 mb-6">
              {renderVisualization()}
            </div>

            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'same', text: 'Exactly 2.200000 GHz - radio waves travel at light speed' },
                { id: 'shifts', text: 'A frequency that shifts as the satellite passes overhead' },
                { id: 'random', text: 'A randomly varying frequency due to space noise' },
                { id: 'half', text: 'Half the frequency due to distance attenuation' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => handlePrediction(option.id)}
                  disabled={showPredictionFeedback}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showPredictionFeedback && option.id === 'shifts'
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
                <p className={`font-bold text-lg mb-2 ${selectedPrediction === 'shifts' ? 'text-green-400' : 'text-cyan-400'}`}>
                  {selectedPrediction === 'shifts' ? 'Exactly right!' : 'Close! The frequency does change.'}
                </p>
                <p className="text-slate-300 mb-3">
                  This is the Doppler effect! As the satellite approaches, the frequency is higher. As it recedes, the frequency is lower. At S-band, shifts can exceed +/-50 kHz!
                </p>
                <button
                  onClick={() => goToPhase('play')}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className="mt-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl"
                >
                  Explore Doppler Shifts
                </button>
              </div>
            )}
          </div>
        );

      case 'play':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">Satellite Doppler Simulator</h2>
            <p className="text-slate-300 mb-4 text-center max-w-lg">
              This visualization shows how <strong>radial velocity</strong> (the component of satellite motion toward or away from the ground station) changes the received frequency. The <strong>Doppler effect</strong> is the change in frequency when source and observer are in relative motion.
            </p>

            <div className="bg-slate-800/60 rounded-2xl p-4 max-w-2xl border border-slate-700/50 mb-4">
              {renderVisualization()}
              <div className="mt-4 p-3 bg-slate-900/70 rounded-lg border border-cyan-500/30">
                <p className="text-center text-cyan-400 font-mono text-lg mb-1">
                  f<sub>received</sub> = f<sub>transmitted</sub> × (1 + v<sub>radial</sub>/c)
                </p>
                <p className="text-center text-slate-400 text-xs">
                  Doppler shift formula: frequency shifts by the ratio of radial velocity to speed of light
                </p>
              </div>
            </div>

            {renderControls()}

            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 max-w-lg mt-4">
              <p className="text-cyan-400 text-sm mb-3">
                <strong>What you're seeing:</strong> The satellite (top) transmits radio waves (concentric rings) down to the ground station (bottom dish). The wave spacing changes based on satellite motion - compressed when approaching (blue shift), stretched when receding (red shift).
              </p>
              <p className="text-cyan-400 text-sm mb-3">
                <strong>Key Terms:</strong> <em>Doppler Shift</em> = frequency change due to motion. <em>Radial Velocity</em> = speed component along the line of sight. <em>Blue Shift</em> = frequency increases (approaching). <em>Red Shift</em> = frequency decreases (receding).
              </p>
              <p className="text-cyan-400 text-sm">
                <strong>Why it matters:</strong> GPS, satellite internet (Starlink), and space communications all require precise frequency tracking. Without Doppler compensation, the receiver can't lock onto the signal. LEO satellites need sophisticated tracking; GEO satellites stay stationary relative to Earth, so no tracking needed!
              </p>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">The Doppler Effect in Space</h2>

            {selectedPrediction && (
              <div className="bg-cyan-900/30 border border-cyan-500/30 p-4 rounded-xl max-w-xl mb-4">
                <p className="text-cyan-300 text-sm">
                  <strong>Remember your prediction:</strong> You thought the received frequency would {selectedPrediction === 'shifts' ? 'shift as the satellite passes' : selectedPrediction === 'same' ? 'stay the same' : selectedPrediction === 'random' ? 'vary randomly' : 'be half the transmitted frequency'}. {selectedPrediction === 'shifts' ? 'You were correct!' : 'The frequency actually shifts continuously!'} Let's understand why.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mb-6">
              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-cyan-400 mb-3">Doppler Formula</h3>
                <div className="bg-slate-900 p-3 rounded-lg text-center mb-2">
                  <span className="text-cyan-400 font-mono text-sm">f_rx = f_tx * (1 + v_r/c)</span>
                </div>
                <p className="text-slate-300 text-sm">
                  The received frequency shifts by v/c. At 7.8 km/s, that is about 26 ppm - significant at GHz frequencies!
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-green-400 mb-3">Approaching = Higher</h3>
                <p className="text-slate-300 text-sm">
                  When the satellite approaches, waves are compressed - higher frequency (blue shift). When receding, waves stretch - lower frequency (red shift).
                </p>
              </div>

              <div className="bg-gradient-to-r from-cyan-900/50 to-green-900/50 p-5 rounded-xl md:col-span-2">
                <h3 className="text-lg font-bold text-white mb-3">Doppler by Orbit Type</h3>
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <p className="text-cyan-400 font-bold">LEO (400 km)</p>
                    <p className="text-slate-400">v = 7.8 km/s</p>
                    <p className="text-slate-300">+/- 50+ kHz shift</p>
                  </div>
                  <div>
                    <p className="text-green-400 font-bold">MEO (20,000 km)</p>
                    <p className="text-slate-400">v = 3.9 km/s</p>
                    <p className="text-slate-300">+/- 25 kHz shift</p>
                  </div>
                  <div>
                    <p className="text-amber-400 font-bold">GEO (36,000 km)</p>
                    <p className="text-slate-400">v ~ 0 relative</p>
                    <p className="text-slate-300">~0 kHz shift!</p>
                  </div>
                </div>
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
            <h2 className="text-2xl font-bold text-purple-400 mb-6">The GEO Advantage</h2>
            <div className="bg-slate-800 p-5 rounded-xl mb-6 max-w-lg">
              <p className="text-slate-200 text-center mb-4">
                GEO satellites orbit at exactly Earth's rotation rate, staying fixed over one spot. They're 36,000 km away and moving at 3 km/s through space.
              </p>
              <p className="text-xl text-purple-300 text-center font-bold">
                How much Doppler shift does a GEO satellite have?
              </p>
            </div>

            <div className="bg-slate-800/60 rounded-2xl p-4 max-w-2xl border border-slate-700/50 mb-6">
              {renderVisualization()}
            </div>

            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'huge', text: 'Huge - they are moving fast through space' },
                { id: 'moderate', text: 'Moderate - about +/- 20 kHz' },
                { id: 'small', text: 'Small - about +/- 5 kHz' },
                { id: 'none', text: 'Almost zero - they move with Earth!' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => handleTwistPrediction(option.id)}
                  disabled={showTwistFeedback}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showTwistFeedback && option.id === 'none'
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
                <p className={`font-bold text-lg mb-2 ${twistPrediction === 'none' ? 'text-green-400' : 'text-purple-400'}`}>
                  {twistPrediction === 'none' ? 'Exactly!' : 'The key is RELATIVE velocity!'}
                </p>
                <p className="text-slate-300">
                  GEO satellites are "geostationary" - they orbit at the same rate Earth rotates. From the ground, they appear stationary, so there is almost no radial velocity and thus no Doppler shift!
                </p>
                <button
                  onClick={() => goToPhase('twist_play')}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl"
                >
                  Compare Orbits
                </button>
              </div>
            )}
          </div>
        );

      case 'twist_play':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">LEO vs GEO Doppler Comparison</h2>

            <div className="bg-slate-800/60 rounded-2xl p-4 max-w-2xl border border-slate-700/50 mb-4">
              {renderVisualization()}
            </div>

            <div className="bg-slate-800 p-4 rounded-xl max-w-lg mb-4">
              <p className="text-slate-300 text-sm mb-3">
                <strong className="text-purple-400">Switch between LEO and GEO</strong> to see the dramatic difference in Doppler shift!
              </p>
              <div className="flex gap-4 justify-center">
                {['LEO', 'MEO', 'GEO'].map(orbit => (
                  <button
                    key={orbit}
                    onClick={() => setOrbitType(orbit as typeof orbitType)}
                    style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                    className={`px-6 py-2 rounded-lg font-bold ${orbitType === orbit ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                  >
                    {orbit}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-lg text-center">
              <div className="bg-cyan-900/30 p-3 rounded-lg">
                <p className="text-cyan-400 font-bold">LEO Challenge</p>
                <p className="text-slate-400 text-xs">Must track rapidly changing frequency</p>
                <p className="text-slate-400 text-xs">Receiver needs wide bandwidth</p>
              </div>
              <div className="bg-amber-900/30 p-3 rounded-lg">
                <p className="text-amber-400 font-bold">GEO Advantage</p>
                <p className="text-slate-400 text-xs">Fixed frequency - simple receivers</p>
                <p className="text-slate-400 text-xs">But higher path loss!</p>
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
            <h2 className="text-2xl font-bold text-purple-400 mb-6">The Orbit Trade-off</h2>

            <div className="grid grid-cols-1 gap-4 max-w-lg mb-6">
              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-cyan-400 mb-2">LEO Doppler Challenge</h3>
                <p className="text-slate-300 text-sm">
                  Starlink and other LEO constellations need sophisticated frequency tracking. The ground terminal must continuously adjust its receiver as the satellite races overhead.
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-amber-400 mb-2">GEO Simplicity</h3>
                <p className="text-slate-300 text-sm">
                  TV satellites in GEO can use fixed-frequency receivers. Your satellite dish points at one spot in the sky and never moves. But the 36,000 km distance means higher latency and path loss.
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-green-400 mb-2">Modern Solutions</h3>
                <p className="text-slate-300 text-sm">
                  Software-defined radios and digital signal processing make Doppler tracking routine. Starlink user terminals handle it automatically - you never notice!
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
              {realWorldApps.map((app, index) => (
                <button
                  key={index}
                  onClick={() => setActiveAppTab(index)}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeAppTab === index
                      ? 'bg-gradient-to-r from-cyan-600 to-green-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {completedApps.has(index) && '✓ '}{app.icon} {app.short}
                </button>
              ))}
            </div>

            <div className="bg-gradient-to-r from-cyan-600 to-green-600 p-1 rounded-xl w-full max-w-2xl">
              <div className="bg-slate-900 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-2">{realWorldApps[activeAppTab].icon} {realWorldApps[activeAppTab].title}</h3>
                <p className="text-sm text-cyan-400 mb-4">{realWorldApps[activeAppTab].tagline}</p>
                <p className="text-slate-300 mb-4">{realWorldApps[activeAppTab].description}</p>

                <div className="bg-slate-800/50 p-4 rounded-lg mb-4">
                  <h4 className="text-cyan-400 font-bold mb-2">Doppler Connection</h4>
                  <p className="text-slate-300 text-sm mb-3">{realWorldApps[activeAppTab].connection}</p>
                  <h4 className="text-green-400 font-bold mb-2">How It Works</h4>
                  <p className="text-slate-300 text-sm">{realWorldApps[activeAppTab].howItWorks}</p>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {realWorldApps[activeAppTab].stats.map((stat, i) => (
                    <div key={i} className="bg-slate-800/70 p-3 rounded-lg text-center">
                      <div className="text-2xl mb-1">{stat.icon}</div>
                      <div className="text-cyan-400 font-bold text-sm">{stat.value}</div>
                      <div className="text-slate-400 text-xs">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <h4 className="text-purple-400 font-bold mb-2 text-sm">Companies & Organizations</h4>
                  <p className="text-slate-300 text-sm">{realWorldApps[activeAppTab].companies.join(', ')}</p>
                </div>

                <div className="bg-green-900/20 p-3 rounded-lg mb-4">
                  <h4 className="text-green-400 font-bold mb-2 text-sm">Future Impact</h4>
                  <p className="text-slate-300 text-sm">{realWorldApps[activeAppTab].futureImpact}</p>
                </div>

                {!completedApps.has(activeAppTab) && (
                  <button
                    onClick={() => handleAppComplete(activeAppTab)}
                    style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10, background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
                    className="w-full py-3 text-white font-bold rounded-lg transition-all"
                  >
                    Mark as Understood
                  </button>
                )}
              </div>
            </div>

            <p className="text-slate-400 mt-4">Completed: {completedApps.size} / {realWorldApps.length}</p>

            <div className="flex gap-4 mt-4">
              {activeAppTab < realWorldApps.length - 1 && (
                <button
                  onClick={() => setActiveAppTab(activeAppTab + 1)}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
                >
                  Next Application →
                </button>
              )}
              {completedApps.size >= 3 && (
                <button
                  onClick={() => goToPhase('test')}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10, background: 'linear-gradient(135deg, #06b6d4 0%, #22c55e 100%)' }}
                  className="px-8 py-3 text-white font-bold rounded-xl transition-all"
                >
                  Take the Test
                </button>
              )}
            </div>
          </div>
        );

      case 'test':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-cyan-400 mb-2">Knowledge Test</h2>
            <p className="text-slate-400 mb-6">Question {testAnswers.filter(a => a !== -1).length + 1} of {testQuestions.length}</p>

            <div className="w-full max-w-2xl space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {testQuestions.map((q, qIndex) => (
                <div key={qIndex} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold">
                      {qIndex + 1}
                    </div>
                    <p className="text-slate-200 font-medium flex-1">{q.question}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {q.options.map((option, oIndex) => (
                      <button
                        key={oIndex}
                        onClick={() => handleTestAnswer(qIndex, oIndex)}
                        disabled={showTestResults}
                        style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10, transition: 'all 0.2s ease-in-out' }}
                        className={`p-3 rounded-lg text-sm text-left ${
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
                style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10, background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
                className="mt-6 px-8 py-3 text-white font-bold rounded-xl transition-all"
              >
                Submit Answers
              </button>
            )}

            {showTestResults && (
              <div className="mt-6 text-center bg-slate-800 p-6 rounded-xl border-2 border-cyan-500">
                <p className="text-4xl font-bold text-cyan-400 mb-2">
                  Score: {calculateTestScore()} / 10
                </p>
                <p className="text-slate-300 mb-4">{Math.round((calculateTestScore() / 10) * 100)}% Correct</p>
                {calculateTestScore() >= 7 && (
                  <button
                    onClick={() => goToPhase('mastery')}
                    style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10, background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)' }}
                    className="mt-4 px-8 py-3 text-white font-bold rounded-xl transition-all"
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
            <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent mb-4">
              Satellite Doppler Master!
            </h2>
            <div className="bg-gradient-to-r from-cyan-600/20 to-green-600/20 border-2 border-cyan-500/50 p-8 rounded-2xl max-w-md mb-6">
              <p className="text-slate-200 mb-6 text-lg">
                You understand why satellite signals need frequency tracking!
              </p>
              <div className="text-left text-slate-300 space-y-3">
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>f_rx = f_tx * (1 + v/c)</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>LEO satellites have huge Doppler shifts</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>GEO satellites have almost zero Doppler</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>Approaching = higher, Receding = lower</span>
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

  const currentIndex = phaseOrder.indexOf(phase);

  return (
    <div style={{ minHeight: '100vh', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', backgroundColor: '#0a0f1a', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', lineHeight: '1.6' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />

      {renderProgressBar()}

      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 10 }}>
        {renderPhaseContent()}
      </div>

      {renderBottomBar()}
    </div>
  );
};

export default SatelliteDopplerRenderer;
