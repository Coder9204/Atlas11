'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

const realWorldApps = [
   {
      icon: '🔭',
      title: 'James Webb Space Telescope',
      short: 'Coldest telescope in space',
      tagline: 'Seeing the universe in infrared',
      description: 'JWST operates at -233°C, colder than any natural place in our solar system. Its tennis-court-sized sunshield creates a 300°C temperature difference between the hot and cold sides.',
      connection: 'The Stefan-Boltzmann law governs how JWST radiates heat to space. The five-layer sunshield blocks solar radiation while the cold side radiates remaining heat away to achieve cryogenic temperatures.',
      howItWorks: 'Each sunshield layer reflects most incident radiation. The gaps between layers allow residual heat to radiate sideways. The cold side faces deep space at 3K, providing maximum radiative cooling.',
      stats: [
         { value: '-233°C', label: 'Operating temp', icon: '❄️' },
         { value: '5', label: 'Sunshield layers', icon: '🛡️' },
         { value: '300°C', label: 'Hot/cold difference', icon: '🌡️' }
      ],
      examples: ['Infrared astronomy', 'Exoplanet detection', 'Galaxy formation studies', 'Star birth observation'],
      companies: ['NASA', 'ESA', 'Northrop Grumman', 'Ball Aerospace'],
      futureImpact: 'Future space telescopes will use even more advanced thermal control for detecting biosignatures on exoplanets.',
      color: '#3B82F6'
   },
   {
      icon: '🚀',
      title: 'Mars Rovers',
      short: 'Surviving Martian extremes',
      tagline: 'Engineering for -100°C nights',
      description: 'Mars rovers experience temperature swings from +20°C during the day to -100°C at night. Radioisotope heaters and careful thermal design keep electronics within survival limits.',
      connection: 'With Mars thin atmosphere providing minimal insulation, rovers rely entirely on radiative heat transfer and nuclear decay heat to survive the freezing nights.',
      howItWorks: 'Plutonium-238 radioisotope heater units (RHUs) provide constant warmth. Multi-layer insulation traps heat at night while louvers can open to reject excess heat during warm days.',
      stats: [
         { value: '120°C', label: 'Daily temp swing', icon: '🌡️' },
         { value: '10+', label: 'RHUs per rover', icon: '☢️' },
         { value: '10+ yrs', label: 'Design life', icon: '📅' }
      ],
      examples: ['Curiosity rover', 'Perseverance rover', 'InSight lander', 'Future Mars helicopters'],
      companies: ['NASA JPL', 'Lockheed Martin', 'DOE', 'Aerojet Rocketdyne'],
      futureImpact: 'Crewed Mars missions will require larger-scale thermal systems to protect habitats and equipment.',
      color: '#EF4444'
   },
   {
      icon: '🛸',
      title: 'International Space Station',
      short: 'Managing 100kW of heat',
      tagline: 'The ultimate thermal challenge',
      description: 'ISS generates over 100kW of waste heat from crew, experiments, and equipment. Giant radiator panels and ammonia heat exchangers reject this heat to the cold of space.',
      connection: 'The Stefan-Boltzmann law determines radiator sizing. ISS radiators operate at ~280K, requiring large surface areas to reject heat at the T^4 rate.',
      howItWorks: 'Internal water loops collect heat from equipment. Heat exchangers transfer this to external ammonia loops, which carry heat to large radiator panels that radiate it to space.',
      stats: [
         { value: '100kW', label: 'Heat rejection', icon: '🔥' },
         { value: '1,400m²', label: 'Radiator area', icon: '📐' },
         { value: '-40°C', label: 'Ammonia temp', icon: '❄️' }
      ],
      examples: ['Crew life support', 'Science experiments', 'Power systems', 'Computer cooling'],
      companies: ['NASA', 'Roscosmos', 'Boeing', 'Thales Alenia'],
      futureImpact: 'Lunar Gateway and future space stations will use similar but more compact thermal systems.',
      color: '#10B981'
   },
   {
      icon: '📦',
      title: 'CubeSat Thermal Design',
      short: 'Tiny satellites, big challenges',
      tagline: 'Passive thermal control in a shoebox',
      description: 'CubeSats have minimal thermal mass and limited power for heaters. Creative passive designs using surface coatings, strategic component placement, and thermal straps keep these tiny satellites operational.',
      connection: 'With small surface areas and rapid orbital thermal cycling, CubeSats rely heavily on surface emissivity and absorptivity properties to manage the radiative heat balance.',
      howItWorks: 'Gold or silver coatings reflect solar radiation while white paint radiates heat. Internal components are positioned to share heat, and thermal straps conduct heat to radiating surfaces.',
      stats: [
         { value: '10cm', label: 'Typical size (1U)', icon: '📏' },
         { value: '90min', label: 'Orbital period', icon: '🔄' },
         { value: '±50°C', label: 'Temp swing', icon: '🌡️' }
      ],
      examples: ['University research', 'IoT constellations', 'Earth observation', 'Technology demos'],
      companies: ['Planet Labs', 'Spire Global', 'Swarm', 'Various universities'],
      futureImpact: 'Mega-constellations of small satellites will require mass-produced, standardized thermal solutions.',
      color: '#8B5CF6'
   }
];

// ============================================================================
// GAME 198: SATELLITE THERMAL CONTROL
// Physics: Q_rad = epsilon * sigma * A * T^4 (Stefan-Boltzmann Law)
// In vacuum, conduction and convection are minimal - only radiation works
// ============================================================================

interface Props {
  onGameEvent?: (event: { type: string; data?: Record<string, unknown> }) => void;
  gamePhase?: string;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const SatelliteThermalRenderer: React.FC<Props> = ({ onGameEvent, gamePhase }) => {
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
  const [solarInput, setSolarInput] = useState(1361); // W/m^2 solar constant
  const [emissivity, setEmissivity] = useState(0.8);
  const [absorptivity, setAbsorptivity] = useState(0.3);
  const [heatersOn, setHeatersOn] = useState(false);
  const [louversOpen, setLouversOpen] = useState(50); // percentage
  const [inShadow, setInShadow] = useState(false);
  const [animPhase, setAnimPhase] = useState(0);
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
  const calculateThermal = useCallback(() => {
    const sigma = 5.67e-8; // Stefan-Boltzmann constant
    const area = 10; // m^2 satellite surface area

    // Absorbed solar power
    const effectiveSolar = inShadow ? 0 : solarInput;
    const qAbsorbed = absorptivity * effectiveSolar * (area / 4); // Only one face sees sun

    // Internal heat from electronics
    const qInternal = 100; // W
    const qHeater = heatersOn ? 50 : 0;

    // Effective emissivity based on louvers
    const effectiveEmissivity = emissivity * (0.5 + 0.5 * (louversOpen / 100));

    // Total heat in
    const qIn = qAbsorbed + qInternal + qHeater;

    // Equilibrium temperature (solving Q_in = epsilon * sigma * A * T^4)
    const T4 = qIn / (effectiveEmissivity * sigma * area);
    const tempK = Math.pow(T4, 0.25);
    const tempC = tempK - 273.15;

    // Heat radiated at equilibrium
    const qOut = effectiveEmissivity * sigma * area * Math.pow(tempK, 4);

    return {
      qAbsorbed: qAbsorbed.toFixed(0),
      qInternal: qInternal.toFixed(0),
      qHeater: qHeater.toFixed(0),
      qTotal: qIn.toFixed(0),
      qRadiated: qOut.toFixed(0),
      tempK: tempK.toFixed(0),
      tempC: tempC.toFixed(0),
      status: tempC > 50 ? 'HOT' : tempC < -20 ? 'COLD' : 'NOMINAL',
      effectiveEmissivity: effectiveEmissivity.toFixed(2)
    };
  }, [solarInput, emissivity, absorptivity, heatersOn, louversOpen, inShadow]);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase !== undefined && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

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
                  width: i === currentIndex ? '24px' : '8px',
                  borderRadius: '4px',
                  backgroundColor: i < currentIndex ? '#22c55e' : i === currentIndex ? '#f97316' : '#334155',
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
          background: 'rgba(249, 115, 22, 0.2)',
          color: '#f97316',
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
              background: canGoNext ? 'linear-gradient(135deg, #f97316 0%, #eab308 100%)' : '#1e293b',
              color: canGoNext ? '#ffffff' : '#475569',
              border: 'none',
              cursor: canGoNext ? 'pointer' : 'not-allowed',
              opacity: canGoNext ? 1 : 0.5,
              boxShadow: canGoNext ? '0 2px 12px rgba(249, 115, 22, 0.3)' : 'none',
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
    playSound(prediction === 'radiation' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'prediction_made', data: { prediction, correct: prediction === 'radiation' } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'heaters' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'twist_prediction_made', data: { prediction, correct: prediction === 'heaters' } });
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
      question: "In the vacuum of space, which heat transfer mechanism is available for cooling?",
      options: [
        { text: "Conduction through the air", correct: false },
        { text: "Convection from solar wind", correct: false },
        { text: "Radiation only", correct: true },
        { text: "All three mechanisms work equally", correct: false }
      ]
    },
    {
      question: "What does the Stefan-Boltzmann law describe?",
      options: [
        { text: "The speed of light in vacuum", correct: false },
        { text: "Radiative power proportional to T^4", correct: true },
        { text: "How gravity affects satellites", correct: false },
        { text: "The frequency of radio signals", correct: false }
      ]
    },
    {
      question: "Multi-Layer Insulation (MLI) works by:",
      options: [
        { text: "Absorbing all incoming radiation", correct: false },
        { text: "Reflecting radiation and minimizing heat transfer between layers", correct: true },
        { text: "Generating electricity from sunlight", correct: false },
        { text: "Creating convection currents in vacuum", correct: false }
      ]
    },
    {
      question: "Why might a satellite need heaters despite being in direct sunlight?",
      options: [
        { text: "Heaters make the satellite look professional", correct: false },
        { text: "Parts in shadow or during eclipse can get extremely cold", correct: true },
        { text: "Sunlight provides no heat to satellites", correct: false },
        { text: "Heaters are required by space law", correct: false }
      ]
    },
    {
      question: "What are thermal louvers?",
      options: [
        { text: "Windows for astronauts to look through", correct: false },
        { text: "Adjustable panels that control radiative heat rejection", correct: true },
        { text: "Solar panels that generate electricity", correct: false },
        { text: "Antennas for communication", correct: false }
      ]
    },
    {
      question: "A surface with high emissivity and low absorptivity would be best for:",
      options: [
        { text: "Absorbing maximum solar heat", correct: false },
        { text: "A radiator that rejects internal heat while staying cool in sunlight", correct: true },
        { text: "A solar panel", correct: false },
        { text: "Hiding the satellite from detection", correct: false }
      ]
    },
    {
      question: "During an eclipse, a satellite's temperature will:",
      options: [
        { text: "Stay exactly the same", correct: false },
        { text: "Drop rapidly because there's no solar input", correct: true },
        { text: "Increase due to less cooling", correct: false },
        { text: "Oscillate wildly", correct: false }
      ]
    },
    {
      question: "Why do satellites in LEO experience more thermal cycling than GEO satellites?",
      options: [
        { text: "LEO satellites orbit faster and pass through Earth's shadow more often", correct: true },
        { text: "GEO satellites are closer to the Sun", correct: false },
        { text: "LEO satellites have no thermal control", correct: false },
        { text: "GEO satellites never see the Sun", correct: false }
      ]
    },
    {
      question: "The solar constant at Earth's orbit is approximately:",
      options: [
        { text: "100 W/m^2", correct: false },
        { text: "1361 W/m^2", correct: true },
        { text: "5000 W/m^2", correct: false },
        { text: "50 W/m^2", correct: false }
      ]
    },
    {
      question: "Heat pipes in satellites transfer heat by:",
      options: [
        { text: "Pumping liquid coolant with electric pumps", correct: false },
        { text: "Passive evaporation and condensation of working fluid", correct: true },
        { text: "Conducting heat through solid metal only", correct: false },
        { text: "Magnetic levitation of electrons", correct: false }
      ]
    }
  ];

  const transferApps = [
    {
      title: "James Webb Space Telescope",
      short: "JWST",
      description: "Operates at -233 degrees C using a massive sunshield to block solar and Earth heat.",
      connection: "Five-layer MLI sunshield keeps instruments cold enough to detect faint infrared light from distant galaxies."
    },
    {
      title: "Mars Rovers",
      short: "Mars Rovers",
      description: "Survive -100 degrees C nights and +20 degrees C days on the Martian surface.",
      connection: "Radioisotope heaters and carefully designed thermal insulation maintain survivable temperatures."
    },
    {
      title: "ISS Thermal Control",
      short: "ISS",
      description: "Manages heat from 100+ kW of equipment plus varying solar input in LEO.",
      connection: "Ammonia-loop heat exchangers and large radiator panels reject waste heat to space."
    },
    {
      title: "Cubesats",
      short: "Cubesats",
      description: "Tiny satellites with minimal thermal mass face extreme temperature swings.",
      connection: "Passive thermal control using surface coatings and strategic component placement."
    }
  ];

  const renderVisualization = () => {
    const thermal = calculateThermal();
    const sunAngle = animPhase * 0.5;
    const tempC = parseInt(thermal.tempC);
    const tempColor = tempC > 50 ? '#ef4444' : tempC < -20 ? '#3b82f6' : '#22c55e';
    const tempStatus = tempC > 50 ? 'HOT' : tempC < -20 ? 'COLD' : 'NOMINAL';

    // Temperature gauge calculation (map -100 to 100 C to 0-100%)
    const tempPercent = Math.max(0, Math.min(100, ((tempC + 100) / 200) * 100));

    return (
      <svg viewBox="0 0 600 400" className="w-full h-auto max-w-2xl">
        <defs>
          {/* === PREMIUM SPACE BACKGROUND GRADIENT === */}
          <linearGradient id="satthSpaceBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="25%" stopColor="#0a0f1a" />
            <stop offset="50%" stopColor="#0c1526" />
            <stop offset="75%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* === SUN RADIAL GRADIENT WITH DEPTH === */}
          <radialGradient id="satthSunCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff7ed" />
            <stop offset="20%" stopColor="#fef3c7" />
            <stop offset="40%" stopColor="#fcd34d" />
            <stop offset="70%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </radialGradient>

          <radialGradient id="satthSunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#ea580c" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
          </radialGradient>

          {/* === SATELLITE BODY MLI (MULTI-LAYER INSULATION) === */}
          <linearGradient id="satthMLIGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="20%" stopColor="#fcd34d" />
            <stop offset="40%" stopColor="#b8860b" />
            <stop offset="60%" stopColor="#fcd34d" />
            <stop offset="80%" stopColor="#b8860b" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>

          {/* === SATELLITE BODY METALLIC GRADIENT === */}
          <linearGradient id="satthBodyMetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="25%" stopColor="#475569" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="75%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* === THERMAL HEAT ZONE (HOT) === */}
          <radialGradient id="satthHotZone" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.9" />
            <stop offset="30%" stopColor="#ef4444" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#dc2626" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#991b1b" stopOpacity="0" />
          </radialGradient>

          {/* === THERMAL COLD ZONE === */}
          <radialGradient id="satthColdZone" cx="70%" cy="70%" r="70%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.8" />
            <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#1d4ed8" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
          </radialGradient>

          {/* === SOLAR PANEL GRADIENT === */}
          <linearGradient id="satthSolarPanel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="25%" stopColor="#1e40af" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="75%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>

          {/* === RADIATOR WHITE SURFACE === */}
          <linearGradient id="satthRadiator" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="30%" stopColor="#e2e8f0" />
            <stop offset="70%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>

          {/* === LOUVER METALLIC === */}
          <linearGradient id="satthLouverMetal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="25%" stopColor="#9ca3af" />
            <stop offset="50%" stopColor="#d1d5db" />
            <stop offset="75%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#6b7280" />
          </linearGradient>

          {/* === HEAT ARROW GRADIENT === */}
          <linearGradient id="satthHeatArrow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fcd34d" stopOpacity="0" />
            <stop offset="20%" stopColor="#fcd34d" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="1" />
            <stop offset="80%" stopColor="#ea580c" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0.3" />
          </linearGradient>

          {/* === RADIATION OUT GRADIENT (BLUE/IR) === */}
          <linearGradient id="satthRadiationOut" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#93c5fd" stopOpacity="0" />
          </linearGradient>

          {/* === TEMPERATURE GAUGE GRADIENTS === */}
          <linearGradient id="satthTempGauge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="25%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="75%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>

          {/* === CONTROL PANEL GRADIENT === */}
          <linearGradient id="satthPanelBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* === EARTH SHADOW GRADIENT === */}
          <radialGradient id="satthEarthShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#0c1526" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#030712" stopOpacity="0.3" />
          </radialGradient>

          {/* === GLOW FILTERS === */}
          <filter id="satthSunBlur" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="satthHeatGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="satthHeaterGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="satthColdGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="satthStarGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>

          {/* === ARROW MARKERS === */}
          <marker id="satthArrowHeat" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
          </marker>

          <marker id="satthArrowCold" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
          </marker>
        </defs>

        {/* === PREMIUM SPACE BACKGROUND === */}
        <rect width="600" height="400" fill="url(#satthSpaceBg)" />

        {/* Subtle grid pattern */}
        <pattern id="satthGrid" width="30" height="30" patternUnits="userSpaceOnUse">
          <rect width="30" height="30" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.2" />
        </pattern>
        <rect width="600" height="400" fill="url(#satthGrid)" />

        {/* === STARS WITH VARYING SIZES AND GLOW === */}
        {[...Array(35)].map((_, i) => {
          const x = (i * 47 + 15) % 600;
          const y = (i * 31 + 8) % 400;
          const size = (i % 3 === 0) ? 1.5 : (i % 2 === 0) ? 1 : 0.7;
          const opacity = (i % 4 === 0) ? 0.9 : 0.5;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={size}
              fill="white"
              opacity={opacity}
              filter={i % 5 === 0 ? "url(#satthStarGlow)" : undefined}
            >
              {i % 7 === 0 && (
                <animate attributeName="opacity" values={`${opacity};${opacity * 0.4};${opacity}`} dur={`${2 + (i % 3)}s`} repeatCount="indefinite" />
              )}
            </circle>
          );
        })}

        {/* === SUN WITH PREMIUM GLOW AND RAYS === */}
        {!inShadow && (
          <g transform={`translate(${70 + Math.sin(sunAngle * Math.PI / 180) * 8}, 85)`}>
            {/* Outer glow */}
            <circle cx="0" cy="0" r="70" fill="url(#satthSunGlow)" filter="url(#satthSunBlur)" />

            {/* Sun corona */}
            <circle cx="0" cy="0" r="50" fill="url(#satthSunGlow)" opacity="0.6">
              <animate attributeName="r" values="48;52;48" dur="2s" repeatCount="indefinite" />
            </circle>

            {/* Sun core */}
            <circle cx="0" cy="0" r="32" fill="url(#satthSunCore)" />

            {/* Sun surface detail */}
            <circle cx="-8" cy="-8" r="6" fill="#fef3c7" opacity="0.4" />
            <circle cx="10" cy="5" r="4" fill="#fed7aa" opacity="0.3" />

            {/* Animated sun rays */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, idx) => (
              <line
                key={angle}
                x1={Math.cos(angle * Math.PI / 180) * 36}
                y1={Math.sin(angle * Math.PI / 180) * 36}
                x2={Math.cos(angle * Math.PI / 180) * (55 + (idx % 2) * 8)}
                y2={Math.sin(angle * Math.PI / 180) * (55 + (idx % 2) * 8)}
                stroke="#fcd34d"
                strokeWidth={idx % 3 === 0 ? 3 : 2}
                opacity={0.5}
                strokeLinecap="round"
              >
                <animate
                  attributeName="opacity"
                  values="0.5;0.8;0.5"
                  dur={`${1.5 + (idx % 3) * 0.3}s`}
                  repeatCount="indefinite"
                />
              </line>
            ))}

            {/* Sun label */}
            <text x="0" y="85" textAnchor="middle" fill="#fcd34d" fontSize="10" fontWeight="bold" letterSpacing="1">
              SOLAR INPUT: {thermal.qAbsorbed}W
            </text>
          </g>
        )}

        {/* === EARTH SHADOW / ECLIPSE INDICATOR === */}
        {inShadow && (
          <g transform="translate(70, 100)">
            <circle cx="0" cy="0" r="60" fill="url(#satthEarthShadow)" />
            <circle cx="0" cy="0" r="45" fill="#0c1526" opacity="0.8" />

            {/* Earth limb glow */}
            <ellipse cx="-15" cy="0" rx="30" ry="45" fill="none" stroke="#1e40af" strokeWidth="2" opacity="0.4" />

            {/* Eclipse label */}
            <text x="0" y="-70" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="bold" letterSpacing="2">
              ECLIPSE
            </text>
            <text x="0" y="-55" textAnchor="middle" fill="#475569" fontSize="8">
              NO SOLAR INPUT
            </text>

            {/* Cold indicator */}
            <g filter="url(#satthColdGlow)">
              <circle cx="0" cy="35" r="8" fill="#3b82f6" opacity="0.6">
                <animate attributeName="opacity" values="0.6;0.3;0.6" dur="2s" repeatCount="indefinite" />
              </circle>
            </g>
          </g>
        )}

        {/* === HEAT TRANSFER ARROWS FROM SUN === */}
        {!inShadow && (
          <g filter="url(#satthHeatGlow)">
            {/* Main heat ray */}
            <path
              d="M 135 100 Q 200 110 265 135"
              stroke="url(#satthHeatArrow)"
              strokeWidth="4"
              fill="none"
              markerEnd="url(#satthArrowHeat)"
              opacity="0.9"
            />
            {/* Secondary rays */}
            <path
              d="M 140 85 Q 195 95 260 115"
              stroke="url(#satthHeatArrow)"
              strokeWidth="2"
              fill="none"
              markerEnd="url(#satthArrowHeat)"
              opacity="0.6"
            />
            <path
              d="M 140 115 Q 200 125 265 155"
              stroke="url(#satthHeatArrow)"
              strokeWidth="2"
              fill="none"
              markerEnd="url(#satthArrowHeat)"
              opacity="0.6"
            />

            {/* Heat wave indicators */}
            {[0, 1, 2].map(i => (
              <path
                key={i}
                d={`M ${170 + i * 30} ${95 + i * 8} q 5 -5 10 0 q 5 5 10 0`}
                stroke="#f59e0b"
                strokeWidth="1.5"
                fill="none"
                opacity={0.4 - i * 0.1}
              >
                <animate
                  attributeName="opacity"
                  values={`${0.4 - i * 0.1};${0.7 - i * 0.1};${0.4 - i * 0.1}`}
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              </path>
            ))}
          </g>
        )}

        {/* === PREMIUM SATELLITE === */}
        <g transform="translate(350, 165)">
          {/* Thermal zones overlay (behind satellite) */}
          {tempC > 20 && !inShadow && (
            <ellipse cx="-30" cy="-10" rx="50" ry="40" fill="url(#satthHotZone)" opacity="0.5" />
          )}
          {tempC < 0 && (
            <ellipse cx="30" cy="10" rx="45" ry="35" fill="url(#satthColdZone)" opacity="0.5" />
          )}

          {/* === SOLAR PANELS === */}
          {/* Left panel structure */}
          <g transform="translate(-100, -20)">
            <rect x="0" y="0" width="55" height="40" rx="2" fill="url(#satthSolarPanel)" stroke="#3b82f6" strokeWidth="1.5" />
            {/* Panel cells */}
            {[0, 1, 2, 3, 4].map(i => (
              <React.Fragment key={`left-${i}`}>
                <line x1={11 * i + 11} y1="0" x2={11 * i + 11} y2="40" stroke="#1e3a8a" strokeWidth="0.8" />
                <line x1="0" y1={i * 8 + 8} x2="55" y2={i * 8 + 8} stroke="#1e3a8a" strokeWidth="0.5" />
              </React.Fragment>
            ))}
            {/* Panel reflection highlight */}
            <rect x="2" y="2" width="15" height="10" fill="#60a5fa" opacity="0.15" rx="1" />
            {/* Panel arm */}
            <rect x="55" y="15" width="10" height="10" fill="#475569" stroke="#64748b" strokeWidth="1" />
          </g>

          {/* Right panel structure */}
          <g transform="translate(55, -20)">
            <rect x="0" y="15" width="10" height="10" fill="#475569" stroke="#64748b" strokeWidth="1" />
            <rect x="10" y="0" width="55" height="40" rx="2" fill="url(#satthSolarPanel)" stroke="#3b82f6" strokeWidth="1.5" />
            {[0, 1, 2, 3, 4].map(i => (
              <React.Fragment key={`right-${i}`}>
                <line x1={10 + 11 * i + 11} y1="0" x2={10 + 11 * i + 11} y2="40" stroke="#1e3a8a" strokeWidth="0.8" />
                <line x1="10" y1={i * 8 + 8} x2="65" y2={i * 8 + 8} stroke="#1e3a8a" strokeWidth="0.5" />
              </React.Fragment>
            ))}
            <rect x="47" y="2" width="15" height="10" fill="#60a5fa" opacity="0.15" rx="1" />
          </g>

          {/* === MLI OUTER LAYER (Gold foil) === */}
          <rect x="-42" y="-32" width="84" height="64" rx="6" fill="url(#satthMLIGold)" opacity="0.4" />
          <rect x="-40" y="-30" width="80" height="60" rx="5" fill="url(#satthMLIGold)" opacity="0.3" />

          {/* === MAIN SATELLITE BODY === */}
          <rect x="-38" y="-28" width="76" height="56" rx="4" fill="url(#satthBodyMetal)" stroke="#64748b" strokeWidth="1.5" />

          {/* Body panel lines */}
          <line x1="-38" y1="-10" x2="38" y2="-10" stroke="#475569" strokeWidth="0.5" />
          <line x1="-38" y1="10" x2="38" y2="10" stroke="#475569" strokeWidth="0.5" />
          <line x1="-10" y1="-28" x2="-10" y2="28" stroke="#475569" strokeWidth="0.5" />
          <line x1="15" y1="-28" x2="15" y2="28" stroke="#475569" strokeWidth="0.5" />

          {/* === RADIATOR PANEL (White, high emissivity) === */}
          <g transform="translate(18, -22)">
            <rect x="0" y="0" width="16" height="44" rx="2" fill="url(#satthRadiator)" stroke="#94a3b8" strokeWidth="1" />
            {/* Radiator fins */}
            {[0, 1, 2, 3, 4, 5].map(i => (
              <line key={i} x1="0" y1={i * 7 + 7} x2="16" y2={i * 7 + 7} stroke="#64748b" strokeWidth="0.5" />
            ))}
            <text x="8" y="56" textAnchor="middle" fill="#64748b" fontSize="7" fontWeight="bold">RAD</text>
          </g>

          {/* === LOUVERS (Adjustable thermal control) === */}
          <g transform="translate(-32, -22)">
            <rect x="-2" y="-2" width="40" height="48" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
            {[0, 1, 2, 3, 4, 5].map(i => (
              <rect
                key={i}
                x="0"
                y={i * 7}
                width="36"
                height="5"
                rx="1"
                fill="url(#satthLouverMetal)"
                stroke="#9ca3af"
                strokeWidth="0.5"
                transform={`rotate(${(louversOpen / 100) * 45}, 18, ${i * 7 + 2.5})`}
              />
            ))}
            <text x="18" y="56" textAnchor="middle" fill="#64748b" fontSize="7" fontWeight="bold">LOUVERS</text>
            <text x="18" y="64" textAnchor="middle" fill="#94a3b8" fontSize="6">{louversOpen}% OPEN</text>
          </g>

          {/* === HEATER INDICATOR === */}
          {heatersOn && (
            <g transform="translate(0, 0)" filter="url(#satthHeaterGlow)">
              <circle cx="0" cy="0" r="12" fill="#ef4444" opacity="0.3">
                <animate attributeName="r" values="10;14;10" dur="1s" repeatCount="indefinite" />
              </circle>
              <circle cx="0" cy="0" r="8" fill="#ef4444" opacity="0.6">
                <animate attributeName="opacity" values="0.6;0.9;0.6" dur="0.8s" repeatCount="indefinite" />
              </circle>
              <circle cx="0" cy="0" r="4" fill="#fca5a5" />
              <text x="0" y="22" textAnchor="middle" fill="#ef4444" fontSize="6" fontWeight="bold">HEATER ON</text>
            </g>
          )}

          {/* === ANTENNA === */}
          <line x1="0" y1="-28" x2="0" y2="-45" stroke="#64748b" strokeWidth="2" />
          <circle cx="0" cy="-48" r="4" fill="#475569" stroke="#64748b" strokeWidth="1" />

          {/* Satellite label */}
          <text x="0" y="52" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold" letterSpacing="0.5">
            SPACECRAFT
          </text>
        </g>

        {/* === RADIATION OUTPUT ARROWS === */}
        <g>
          {/* Right radiation */}
          <path
            d="M 435 165 L 480 165"
            stroke="url(#satthRadiationOut)"
            strokeWidth="3"
            fill="none"
            markerEnd="url(#satthArrowCold)"
          />
          <path
            d="M 430 145 L 470 130"
            stroke="url(#satthRadiationOut)"
            strokeWidth="2"
            fill="none"
            markerEnd="url(#satthArrowCold)"
            opacity="0.7"
          />
          <path
            d="M 430 185 L 470 200"
            stroke="url(#satthRadiationOut)"
            strokeWidth="2"
            fill="none"
            markerEnd="url(#satthArrowCold)"
            opacity="0.7"
          />

          {/* Bottom radiation */}
          <path
            d="M 350 235 L 350 270"
            stroke="url(#satthRadiationOut)"
            strokeWidth="3"
            fill="none"
            markerEnd="url(#satthArrowCold)"
          />

          {/* Radiation label */}
          <text x="490" y="150" fill="#60a5fa" fontSize="9" fontWeight="bold">
            IR RADIATION
          </text>
          <text x="490" y="162" fill="#3b82f6" fontSize="8">
            {thermal.qRadiated}W
          </text>
        </g>

        {/* === PREMIUM THERMAL STATUS PANEL === */}
        <g transform="translate(15, 230)">
          <rect x="0" y="0" width="175" height="155" rx="10" fill="url(#satthPanelBg)" stroke="#334155" strokeWidth="1.5" />

          {/* Panel header */}
          <rect x="0" y="0" width="175" height="28" rx="10" fill="#1e293b" />
          <rect x="0" y="18" width="175" height="10" fill="#1e293b" />
          <text x="87" y="18" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold" letterSpacing="1">
            THERMAL STATUS
          </text>

          {/* Data rows */}
          <text x="12" y="46" fill="#94a3b8" fontSize="9">Solar Absorbed:</text>
          <text x="163" y="46" textAnchor="end" fill="#fcd34d" fontSize="9" fontWeight="bold">{thermal.qAbsorbed} W</text>

          <text x="12" y="63" fill="#94a3b8" fontSize="9">Internal Heat:</text>
          <text x="163" y="63" textAnchor="end" fill="#f97316" fontSize="9" fontWeight="bold">{thermal.qInternal} W</text>

          <text x="12" y="80" fill="#94a3b8" fontSize="9">Heaters:</text>
          <text x="163" y="80" textAnchor="end" fill={heatersOn ? '#ef4444' : '#475569'} fontSize="9" fontWeight="bold">{thermal.qHeater} W</text>

          <text x="12" y="97" fill="#94a3b8" fontSize="9">Radiated Out:</text>
          <text x="163" y="97" textAnchor="end" fill="#3b82f6" fontSize="9" fontWeight="bold">{thermal.qRadiated} W</text>

          <line x1="12" y1="107" x2="163" y2="107" stroke="#334155" strokeWidth="1" />

          {/* Temperature display */}
          <text x="12" y="126" fill="#e2e8f0" fontSize="10" fontWeight="bold">Temperature:</text>
          <text x="163" y="126" textAnchor="end" fill={tempColor} fontSize="12" fontWeight="bold">{thermal.tempC}°C</text>

          {/* Temperature gauge */}
          <rect x="12" y="136" width="151" height="10" rx="5" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
          <rect x="12" y="136" width="151" height="10" rx="5" fill="url(#satthTempGauge)" opacity="0.3" />
          <rect x="12" y="136" width={151 * tempPercent / 100} height="10" rx="5" fill="url(#satthTempGauge)" />

          {/* Gauge markers */}
          <text x="12" y="156" fill="#3b82f6" fontSize="6">-100°C</text>
          <text x="87" y="156" textAnchor="middle" fill="#22c55e" fontSize="6">0°C</text>
          <text x="163" y="156" textAnchor="end" fill="#ef4444" fontSize="6">+100°C</text>

          {/* Status indicator */}
          <rect x="45" y="148" width="85" height="18" rx="9" fill={tempColor} opacity="0.2" stroke={tempColor} strokeWidth="1" />
          <circle cx="55" cy="157" r="4" fill={tempColor}>
            <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <text x="95" y="161" textAnchor="middle" fill={tempColor} fontSize="10" fontWeight="bold">{tempStatus}</text>
        </g>

        {/* === PHYSICS PARAMETERS PANEL === */}
        <g transform="translate(420, 260)">
          <rect x="0" y="0" width="165" height="125" rx="10" fill="url(#satthPanelBg)" stroke="#334155" strokeWidth="1.5" />

          <rect x="0" y="0" width="165" height="26" rx="10" fill="#1e293b" />
          <rect x="0" y="16" width="165" height="10" fill="#1e293b" />
          <text x="82" y="17" textAnchor="middle" fill="#a855f7" fontSize="10" fontWeight="bold" letterSpacing="1">
            PARAMETERS
          </text>

          <text x="10" y="44" fill="#94a3b8" fontSize="8">Absorptivity (alpha):</text>
          <text x="155" y="44" textAnchor="end" fill="#f59e0b" fontSize="9" fontWeight="bold">{absorptivity.toFixed(2)}</text>

          <text x="10" y="61" fill="#94a3b8" fontSize="8">Base Emissivity (eps):</text>
          <text x="155" y="61" textAnchor="end" fill="#3b82f6" fontSize="9" fontWeight="bold">{emissivity.toFixed(2)}</text>

          <text x="10" y="78" fill="#94a3b8" fontSize="8">Effective Emissivity:</text>
          <text x="155" y="78" textAnchor="end" fill="#22d3ee" fontSize="9" fontWeight="bold">{thermal.effectiveEmissivity}</text>

          <line x1="10" y1="88" x2="155" y2="88" stroke="#334155" strokeWidth="0.5" />

          <text x="10" y="103" fill="#94a3b8" fontSize="8">Solar Constant:</text>
          <text x="155" y="103" textAnchor="end" fill="#fcd34d" fontSize="8" fontWeight="bold">{solarInput} W/m²</text>

          <text x="10" y="119" fill="#94a3b8" fontSize="8">Stefan-Boltzmann:</text>
          <text x="155" y="119" textAnchor="end" fill="#94a3b8" fontSize="7">5.67×10⁻⁸ W/m²K⁴</text>
        </g>

        {/* === TITLE LABEL === */}
        <text x="300" y="25" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="bold" letterSpacing="1">
          SATELLITE THERMAL CONTROL SYSTEM
        </text>
        <text x="300" y="40" textAnchor="middle" fill="#64748b" fontSize="9">
          Stefan-Boltzmann Law: Q = ε·σ·A·T⁴
        </text>
      </svg>
    );
  };

  const renderControls = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 w-full max-w-2xl">
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
        <label className="text-slate-300 text-sm font-semibold block mb-1">Louver Opening</label>
        <p className="text-slate-400 text-xs mb-3">Controls how much surface area radiates heat</p>
        <input
          type="range"
          min="0"
          max="100"
          step="10"
          value={louversOpen}
          onChange={(e) => setLouversOpen(parseInt(e.target.value))}
          style={{
            width: '100%',
            accentColor: '#f97316',
            touchAction: 'pan-y',
            WebkitAppearance: 'none',
            appearance: 'none',
            height: '6px',
            borderRadius: '3px',
            background: 'linear-gradient(90deg, #475569, #f97316)',
            outline: 'none'
          }}
        />
        <div className="text-orange-400 font-bold mt-2">{louversOpen}% Open</div>
      </div>
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
        <label className="text-slate-300 text-sm font-semibold block mb-1">Surface Absorptivity (α)</label>
        <p className="text-slate-400 text-xs mb-3">Fraction of solar energy absorbed</p>
        <input
          type="range"
          min="0.1"
          max="0.9"
          step="0.1"
          value={absorptivity}
          onChange={(e) => setAbsorptivity(parseFloat(e.target.value))}
          style={{
            width: '100%',
            accentColor: '#eab308',
            touchAction: 'pan-y',
            WebkitAppearance: 'none',
            appearance: 'none',
            height: '6px',
            borderRadius: '3px',
            background: 'linear-gradient(90deg, #475569, #eab308)',
            outline: 'none'
          }}
        />
        <div className="text-yellow-400 font-bold mt-2">{absorptivity.toFixed(1)}</div>
      </div>
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex flex-col justify-center">
        <label className="text-slate-300 text-sm font-semibold block mb-2">Electric Heaters</label>
        <button
          onClick={() => setHeatersOn(!heatersOn)}
          style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10, transition: 'all 0.2s ease' }}
          className={`px-6 py-3 rounded-lg font-bold ${heatersOn ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
        >
          {heatersOn ? '🔥 ON' : 'OFF'}
        </button>
      </div>
      <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex flex-col justify-center">
        <label className="text-slate-300 text-sm font-semibold block mb-2">Sun Exposure</label>
        <button
          onClick={() => setInShadow(!inShadow)}
          style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10, transition: 'all 0.2s ease' }}
          className={`px-6 py-3 rounded-lg font-bold ${inShadow ? 'bg-slate-900 text-blue-400 hover:bg-slate-800' : 'bg-yellow-600 text-white hover:bg-yellow-500'}`}
        >
          {inShadow ? '🌑 Eclipse' : '☀️ Sunlight'}
        </button>
      </div>
    </div>
  );

  const renderPhaseContent = () => {
    switch (phase) {
      case 'hook':
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] px-6 py-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-6">
              <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-orange-400 tracking-wide">SPACECRAFT THERMAL CONTROL</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white via-orange-100 to-yellow-200 bg-clip-text text-transparent">
              How Do Satellites Survive -200 C to +200 C Swings?
            </h1>
            <p className="text-lg text-slate-400 max-w-xl mb-6">
              In the vacuum of space, there is no air to carry heat away. Only one mechanism remains...
            </p>

            <div className="bg-slate-800/60 rounded-2xl p-4 max-w-2xl border border-slate-700/50 mb-6">
              {renderVisualization()}
            </div>

            <button
              onClick={() => goToPhase('predict')}
              style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-orange-600 to-yellow-600 text-white text-lg font-semibold rounded-2xl transition-all hover:scale-[1.02]"
            >
              Discover Thermal Control
            </button>
          </div>
        );

      case 'predict':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-orange-400 mb-6">Make Your Prediction</h2>
            <p className="text-lg text-slate-200 mb-4 text-center max-w-lg">
              A satellite in orbit generates 100 watts of internal heat from its electronics. Without any air around it, how does it get rid of this heat?
            </p>

            <div className="bg-slate-800/60 rounded-2xl p-4 max-w-lg border border-slate-700/50 mb-6">
              {renderVisualization()}
            </div>

            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'conduction', text: 'Heat conducts through space to nearby objects' },
                { id: 'convection', text: 'Solar wind carries the heat away like a breeze' },
                { id: 'radiation', text: 'The satellite radiates infrared light into space' },
                { id: 'nothing', text: 'It cannot - satellites must be kept cold before launch' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => handlePrediction(option.id)}
                  disabled={showPredictionFeedback}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showPredictionFeedback && option.id === 'radiation'
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
                <p className={`font-bold text-lg mb-2 ${selectedPrediction === 'radiation' ? 'text-green-400' : 'text-orange-400'}`}>
                  {selectedPrediction === 'radiation' ? 'Exactly right!' : 'Not quite!'}
                </p>
                <p className="text-slate-300 mb-3">
                  In vacuum, radiation is the only way to reject heat. Everything with temperature above absolute zero emits infrared radiation - and that is how satellites cool themselves!
                </p>
                <button
                  onClick={() => goToPhase('play')}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className="mt-2 px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl"
                >
                  Explore Thermal Control
                </button>
              </div>
            )}
          </div>
        );

      case 'play':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-orange-400 mb-4">Satellite Thermal Simulator</h2>
            <p className="text-slate-300 mb-4 text-center max-w-lg">
              Control the thermal systems and watch how temperature responds. Try entering eclipse!
            </p>

            <div className="bg-slate-800/60 rounded-2xl p-4 max-w-2xl border border-slate-700/50 mb-4">
              {renderVisualization()}
            </div>

            {renderControls()}

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 max-w-lg mt-4">
              <p className="text-blue-300 text-sm mb-2">
                <strong>How it works:</strong> Changing absorptivity affects how much solar energy the satellite absorbs. Higher emissivity means it radiates heat faster. Louvers adjust how much surface area can radiate heat away.
              </p>
              <p className="text-blue-300 text-sm">
                <strong>Why it matters:</strong> Real satellites use this exact physics to survive extreme space temperatures. NASA engineers carefully design thermal control systems using these principles to keep spacecraft operational for decades!
              </p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 max-w-lg mt-4">
              <p className="text-amber-400 text-sm">
                <strong>Try this:</strong> Put the satellite in eclipse and watch temperature drop. Then turn on heaters to compensate!
              </p>
            </div>

            <button
              onClick={() => goToPhase('review')}
              style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
              className="mt-4 px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl"
            >
              Review the Physics
            </button>
          </div>
        );

      case 'review':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-orange-400 mb-4">The Physics of Space Thermal Control</h2>

            {selectedPrediction && (
              <div className={`mb-6 p-4 rounded-xl max-w-lg ${selectedPrediction === 'radiation' ? 'bg-green-900/20 border border-green-500/30' : 'bg-orange-900/20 border border-orange-500/30'}`}>
                <p className={`text-sm ${selectedPrediction === 'radiation' ? 'text-green-300' : 'text-orange-300'}`}>
                  You predicted: {selectedPrediction === 'radiation' ? '✓ Radiation' : '✗ ' + selectedPrediction}. {selectedPrediction === 'radiation' ? 'You were exactly right!' : 'Remember - only radiation works in vacuum!'}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mb-6">
              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-orange-400 mb-3">Stefan-Boltzmann Law</h3>
                <div className="bg-slate-900 p-3 rounded-lg text-center mb-2">
                  <span className="text-orange-400 font-mono text-sm">Q = e * s * A * T^4</span>
                </div>
                <p className="text-slate-300 text-sm">
                  Radiated power scales with temperature to the 4th power! Double the temperature, 16x the radiation.
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-yellow-400 mb-3">Emissivity vs Absorptivity</h3>
                <p className="text-slate-300 text-sm">
                  Emissivity: how well a surface radiates heat away. Absorptivity: how much solar energy it absorbs. White paint has high emissivity but low absorptivity - ideal for radiators!
                </p>
              </div>

              <div className="bg-gradient-to-r from-orange-900/50 to-yellow-900/50 p-5 rounded-xl md:col-span-2">
                <h3 className="text-lg font-bold text-white mb-3">Thermal Control Hardware</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-orange-400 font-bold">MLI (Multi-Layer Insulation)</p>
                    <p className="text-slate-300">Gold/silver blankets that reflect radiation</p>
                  </div>
                  <div>
                    <p className="text-yellow-400 font-bold">Louvers</p>
                    <p className="text-slate-300">Adjustable panels to control heat rejection</p>
                  </div>
                  <div>
                    <p className="text-red-400 font-bold">Heaters</p>
                    <p className="text-slate-300">Electric heaters for cold components</p>
                  </div>
                  <div>
                    <p className="text-blue-400 font-bold">Heat Pipes</p>
                    <p className="text-slate-300">Passive heat transport using phase change</p>
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
            <h2 className="text-2xl font-bold text-purple-400 mb-6">The Cold Space Problem</h2>
            <div className="bg-slate-800 p-5 rounded-xl mb-4 max-w-lg">
              <p className="text-slate-200 text-center mb-4">
                Space is incredibly cold (-270 C background). You might think cooling is easy. But surprisingly...
              </p>
              <p className="text-xl text-purple-300 text-center font-bold">
                Why do satellites often need heaters in the freezing void of space?
              </p>
            </div>

            <div className="bg-slate-800/60 rounded-2xl p-4 max-w-lg border border-slate-700/50 mb-6">
              {renderVisualization()}
            </div>

            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'regulations', text: 'Space agencies require heaters by law' },
                { id: 'heaters', text: 'Parts in shadow or during eclipse get dangerously cold without them' },
                { id: 'solar', text: 'The Sun provides too much heat, so heaters balance it' },
                { id: 'vacuum', text: 'Heaters create artificial air pressure inside the satellite' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => handleTwistPrediction(option.id)}
                  disabled={showTwistFeedback}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showTwistFeedback && option.id === 'heaters'
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
                <p className={`font-bold text-lg mb-2 ${twistPrediction === 'heaters' ? 'text-green-400' : 'text-purple-400'}`}>
                  {twistPrediction === 'heaters' ? 'Correct!' : 'Think about what happens in shadow!'}
                </p>
                <p className="text-slate-300">
                  During eclipse, with no solar input, components can drop to -150 C or colder in minutes. Batteries, propellant lines, and sensitive electronics need heaters to survive!
                </p>
                <button
                  onClick={() => goToPhase('twist_play')}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl"
                >
                  See the Effect
                </button>
              </div>
            )}
          </div>
        );

      case 'twist_play':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Eclipse Survival Challenge</h2>

            <div className="bg-slate-800/60 rounded-2xl p-4 max-w-2xl border border-slate-700/50 mb-4">
              {renderVisualization()}
            </div>

            <div className="bg-slate-800 p-4 rounded-xl max-w-lg mb-4">
              <p className="text-slate-300 text-sm mb-3">
                <strong className="text-purple-400">Challenge:</strong> Put the satellite in eclipse and try to keep the temperature above -20 C using heaters and louver control!
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setInShadow(!inShadow)}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-bold ${inShadow ? 'bg-slate-900 text-blue-400' : 'bg-yellow-600 text-white'}`}
                >
                  {inShadow ? 'In Eclipse' : 'In Sunlight'}
                </button>
                <button
                  onClick={() => setHeatersOn(!heatersOn)}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-bold ${heatersOn ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                >
                  Heaters {heatersOn ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            <div className="bg-blue-900/30 p-3 rounded-lg max-w-lg text-center">
              <p className="text-blue-400 text-sm">
                In LEO, satellites experience ~16 eclipses per day, each lasting up to 36 minutes!
              </p>
            </div>

            <button
              onClick={() => goToPhase('twist_review')}
              style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
              className="mt-6 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl"
            >
              Understand the Challenge
            </button>
          </div>
        );

      case 'twist_review':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">The Thermal Balancing Act</h2>

            <div className="grid grid-cols-1 gap-4 max-w-lg mb-6">
              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-red-400 mb-2">The Hot Extreme</h3>
                <p className="text-slate-300 text-sm">
                  Sun-facing surfaces can reach +150 C. Too hot for electronics, batteries, and propellant. Need reflective coatings and radiators to dump heat.
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-blue-400 mb-2">The Cold Extreme</h3>
                <p className="text-slate-300 text-sm">
                  Shadowed surfaces and eclipse conditions drop to -150 C or colder. Batteries fail, propellant freezes, and joints can crack. Need heaters and insulation.
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-green-400 mb-2">The Solution: Active + Passive</h3>
                <p className="text-slate-300 text-sm">
                  Combine passive control (MLI, surface coatings) with active systems (heaters, louvers, heat pipes) to maintain all components within their survival temperature range.
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
          <div className="flex flex-col items-center p-6" style={{ minHeight: '400px', maxHeight: '80vh' }}>
            <h2 className="text-2xl font-bold text-green-400 mb-4">Real-World Applications</h2>

            <div className="flex gap-2 mb-4 flex-wrap justify-center">
              {realWorldApps.map((app, index) => (
                <button
                  key={index}
                  onClick={() => setActiveAppTab(index)}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeAppTab === index
                      ? 'bg-gradient-to-r from-orange-600 to-yellow-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {completedApps.has(index) && '✓ '}{app.short}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', width: '100%', maxWidth: '800px' }}>
              <div className="bg-gradient-to-r from-orange-600 to-yellow-600 p-1 rounded-xl w-full">
                <div className="bg-slate-900 p-6 rounded-lg">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '32px' }}>{realWorldApps[activeAppTab].icon}</span>
                    <h3 className="text-xl font-bold text-white">{realWorldApps[activeAppTab].title}</h3>
                  </div>
                  <p className="text-slate-300 mb-4">{realWorldApps[activeAppTab].description}</p>

                  <div className="bg-slate-800/50 p-4 rounded-lg mb-4">
                    <h4 className="text-orange-400 font-bold mb-2">How it Connects</h4>
                    <p className="text-slate-300 text-sm">{realWorldApps[activeAppTab].connection}</p>
                  </div>

                  <div className="bg-slate-800/50 p-4 rounded-lg mb-4">
                    <h4 className="text-blue-400 font-bold mb-2">How It Works</h4>
                    <p className="text-slate-300 text-sm">{realWorldApps[activeAppTab].howItWorks}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {realWorldApps[activeAppTab].stats.map((stat, i) => (
                      <div key={i} className="bg-slate-800/70 p-3 rounded-lg text-center">
                        <div className="text-2xl mb-1">{stat.icon}</div>
                        <div className="text-lg font-bold text-orange-400">{stat.value}</div>
                        <div className="text-xs text-slate-400">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-800/50 p-3 rounded-lg mb-4">
                    <p className="text-xs text-slate-400 mb-1">Key Examples:</p>
                    <p className="text-sm text-slate-300">{realWorldApps[activeAppTab].examples.join(' • ')}</p>
                  </div>

                  <div className="bg-slate-800/50 p-3 rounded-lg mb-4">
                    <p className="text-xs text-slate-400 mb-1">Leading Organizations:</p>
                    <p className="text-sm text-slate-300">{realWorldApps[activeAppTab].companies.join(', ')}</p>
                  </div>

                  {!completedApps.has(activeAppTab) ? (
                    <button
                      onClick={() => handleAppComplete(activeAppTab)}
                      style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                      className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg"
                    >
                      Mark as Understood
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const nextIncomplete = realWorldApps.findIndex((_, i) => !completedApps.has(i));
                        if (nextIncomplete !== -1) {
                          setActiveAppTab(nextIncomplete);
                        }
                      }}
                      style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                      className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg"
                    >
                      Next Application →
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <p className="text-slate-400 mb-3">Completed: {completedApps.size} / {realWorldApps.length}</p>

              {completedApps.size >= 3 && (
                <button
                  onClick={() => goToPhase('test')}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className="px-8 py-3 bg-gradient-to-r from-orange-600 to-yellow-600 text-white font-bold rounded-xl"
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
            <h2 className="text-2xl font-bold text-orange-400 mb-2">Knowledge Test</h2>
            <p className="text-slate-400 text-sm mb-6">
              {testAnswers.filter(a => a !== -1).length} of {testQuestions.length} answered
            </p>

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
                            ? 'bg-orange-600 text-white'
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
                <p className="text-3xl font-bold text-orange-400 mb-2">
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
            <h2 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent mb-4">
              Thermal Control Master!
            </h2>
            <div className="bg-gradient-to-r from-orange-600/20 to-yellow-600/20 border-2 border-orange-500/50 p-8 rounded-2xl max-w-md mb-6">
              <p className="text-slate-200 mb-6 text-lg">
                You understand how spacecraft survive extreme temperature swings!
              </p>
              <div className="text-left text-slate-300 space-y-3">
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>Only radiation works for cooling in vacuum</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>Q = e * s * A * T^4 (Stefan-Boltzmann)</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>MLI, louvers, heaters, and heat pipes</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>Balance hot and cold extremes carefully</span>
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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100dvh',
      height: '100dvh',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #0a0f1a 0%, #0f172a 50%, #1e293b 100%)',
      color: '#ffffff',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: '25%',
        width: '384px',
        height: '384px',
        background: 'radial-gradient(circle, rgba(249,115,22,0.05) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: 0,
        right: '25%',
        width: '384px',
        height: '384px',
        background: 'radial-gradient(circle, rgba(234,179,8,0.05) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />

      {renderProgressBar()}

      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
        zIndex: 1,
        WebkitOverflowScrolling: 'touch'
      }}>
        {renderPhaseContent()}
      </div>

      {renderBottomBar()}
    </div>
  );
};

export default SatelliteThermalRenderer;
