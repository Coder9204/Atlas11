'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// GAME 199: RADIATION EFFECTS ON ELECTRONICS
// Physics: SEU rate, Total Ionizing Dose (TID), Latchup from energetic particles
// The Van Allen belts trap high-energy particles creating hazardous regions
// ============================================================================

const realWorldApps = [
  {
    icon: '🛰️',
    title: 'Satellite Radiation Hardening',
    short: 'Protecting spacecraft electronics from cosmic rays and trapped particles in the Van Allen belts',
    tagline: 'Surviving the harsh space radiation environment',
    description: 'Satellites operating in Earth orbit face constant bombardment from high-energy protons, electrons, and heavy ions. The Van Allen radiation belts create particularly intense zones where particle fluxes can be millions of times higher than at ground level. Without proper radiation hardening, satellite electronics can experience bit flips, permanent damage, and catastrophic latchup events that can destroy entire systems within hours.',
    connection: 'This game teaches exactly how radiation interacts with semiconductor devices - the same physics that satellite engineers must understand to design systems that survive 15+ years in orbit.',
    howItWorks: 'Radiation-hardened designs use specialized manufacturing processes with insulating substrates (SOI), triple modular redundancy (TMR), error-correcting memory, current-limiting circuits for latchup protection, and thick shielding. Critical systems use multiple layers of protection since no single technique is sufficient.',
    stats: [
      { value: '10-15', label: 'Year mission lifetimes', icon: '📅' },
      { value: '$500M+', label: 'Typical satellite cost', icon: '💰' },
      { value: '100x', label: 'Rad-hard chip cost premium', icon: '🔧' }
    ],
    examples: ['GPS III satellites', 'James Webb Space Telescope', 'Juno Jupiter probe', 'Mars rovers Curiosity/Perseverance'],
    companies: ['BAE Systems', 'Honeywell', 'Microchip (Microsemi)', 'Cobham Advanced Electronic Solutions'],
    futureImpact: 'As mega-constellations deploy thousands of satellites, radiation-tolerant commercial designs will become crucial. Cheaper hardening techniques could enable democratized space access.',
    color: '#3B82F6'
  },
  {
    icon: '⚛️',
    title: 'Nuclear Facility Control Systems',
    short: 'Electronics that operate reliably in extreme gamma and neutron radiation environments',
    tagline: 'Keeping reactors safe under intense radiation',
    description: 'Nuclear power plants and research reactors require instrumentation and control systems that function reliably in radiation fields that would destroy ordinary electronics within minutes. Sensors measuring reactor conditions must operate continuously in environments where total ionizing dose can reach megarads per year. Safety systems must guarantee correct operation even when radiation is causing ongoing damage.',
    connection: 'The TID (Total Ionizing Dose) accumulation mechanics in this game directly model how reactor instrumentation degrades over time, requiring scheduled replacement before failure.',
    howItWorks: 'Nuclear-grade electronics use radiation-hardened components rated for 1 Mrad or more total dose. Analog circuits often outperform digital in high-radiation areas. Fiber optic cables replace electrical wiring in high-dose zones. Systems are designed with wide safety margins and redundancy to tolerate gradual degradation.',
    stats: [
      { value: '1 Mrad', label: 'Typical TID tolerance', icon: '☢️' },
      { value: '40+', label: 'Year reactor lifetimes', icon: '⏱️' },
      { value: '99.9%', label: 'Required availability', icon: '✓' }
    ],
    examples: ['Reactor protection systems', 'In-core neutron detectors', 'Fuel handling robotics', 'Remote inspection cameras'],
    companies: ['Westinghouse', 'Framatome', 'General Electric', 'Rolls-Royce'],
    futureImpact: 'Small modular reactors and fusion power plants will need new generations of rad-hard electronics capable of operating in even more extreme environments.',
    color: '#10B981'
  },
  {
    icon: '✈️',
    title: 'High-Altitude Avionics',
    short: 'Aircraft electronics designed to handle increased cosmic ray flux at flight altitudes',
    tagline: 'Flying safely through cosmic radiation',
    description: 'Commercial aircraft cruising at 35,000-40,000 feet experience cosmic ray flux 100-300 times higher than at sea level. Single Event Upsets (SEUs) in flight computers have caused autopilot disconnects, display anomalies, and navigation errors. The polar routes favored for transpacific flights pass through regions with even higher radiation intensity.',
    connection: 'This game simulates SEU rates at different altitudes - the exact analysis avionics engineers perform when certifying flight-critical systems for high-altitude operation.',
    howItWorks: 'Aviation electronics use triple-redundant computing with voting logic, error-detecting and correcting memory (EDAC), watchdog timers to catch frozen processors, and architectural isolation to prevent single-point failures. Designs are validated through neutron beam testing at particle accelerators.',
    stats: [
      { value: '300x', label: 'Increased cosmic flux at altitude', icon: '📊' },
      { value: '10^-9', label: 'Required failure rate per hour', icon: '🎯' },
      { value: '$1B+', label: 'Avionics per aircraft type', icon: '💵' }
    ],
    examples: ['Boeing 787 flight computers', 'Airbus A350 avionics', 'Fly-by-wire systems', 'Engine control units'],
    companies: ['Collins Aerospace', 'Honeywell Aerospace', 'Thales', 'Safran'],
    futureImpact: 'Supersonic and hypersonic aircraft operating at 60,000+ feet will require even more robust radiation protection as cosmic ray flux continues increasing with altitude.',
    color: '#8B5CF6'
  },
  {
    icon: '🔬',
    title: 'Particle Physics Detectors',
    short: 'Electronics operating at particle accelerators amid intense radiation from beam collisions',
    tagline: 'Discovering particles in a sea of radiation',
    description: 'The Large Hadron Collider generates radiation environments more intense than any spacecraft encounters - detector electronics near the beam pipe receive radiation doses equivalent to decades in space within months. Yet these systems must precisely measure particles from collisions happening 40 million times per second while embedded in this extreme environment.',
    connection: 'The SEU and latchup mechanisms explored in this game are daily concerns for physicists designing detector readout electronics that must survive LHC radiation levels.',
    howItWorks: 'Detector ASICs use deep submicron processes with built-in radiation tolerance, redundant encoding of configuration data, frequent refresh of stored values, and architectures that can continue operating even with some failed channels. Systems are designed assuming ongoing radiation damage throughout their operational life.',
    stats: [
      { value: '1 GGy', label: 'LHC detector lifetime dose', icon: '⚡' },
      { value: '40 MHz', label: 'Collision rate', icon: '🔄' },
      { value: '10^8', label: 'Readout channels', icon: '📡' }
    ],
    examples: ['ATLAS detector', 'CMS experiment', 'LHCb spectrometer', 'ALICE heavy-ion detector'],
    companies: ['CERN', 'Fermilab', 'SLAC', 'DESY'],
    futureImpact: 'Future colliders like the FCC will produce even more intense radiation, driving innovation in radiation-tolerant electronics that may benefit space and medical applications.',
    color: '#F59E0B'
  }
];

interface Props {
  onGameEvent?: (event: { type: string; data?: Record<string, unknown> }) => void;
  gamePhase?: string;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const RadiationEffectsRenderer: React.FC<Props> = ({ onGameEvent, gamePhase }) => {
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
  const [altitude, setAltitude] = useState(400); // km (ISS altitude)
  const [shielding, setShielding] = useState(2); // mm aluminum equivalent
  const [chipType, setChipType] = useState<'commercial' | 'rad-tolerant' | 'rad-hard'>('commercial');
  const [solarActivity, setSolarActivity] = useState<'quiet' | 'moderate' | 'storm'>('quiet');
  const [animPhase, setAnimPhase] = useState(0);
  const [seuCount, setSeuCount] = useState(0);
  const [tidAccumulated, setTidAccumulated] = useState(0);
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
  const calculateRadiation = useCallback(() => {
    // Van Allen belt radiation model (simplified)
    // Inner belt peak: ~1000-5000 km, Outer belt: ~15000-25000 km
    let fluxFactor = 1;

    if (altitude < 1000) {
      fluxFactor = altitude / 1000; // Below inner belt
    } else if (altitude >= 1000 && altitude <= 6000) {
      fluxFactor = 10 + 90 * Math.sin((altitude - 1000) / 5000 * Math.PI); // Inner belt
    } else if (altitude > 6000 && altitude < 13000) {
      fluxFactor = 10 - 8 * ((altitude - 6000) / 7000); // Slot region
    } else if (altitude >= 13000 && altitude <= 30000) {
      fluxFactor = 2 + 50 * Math.sin((altitude - 13000) / 17000 * Math.PI); // Outer belt
    } else {
      fluxFactor = 5; // Beyond outer belt
    }

    // Solar activity multiplier
    const solarMultiplier = solarActivity === 'quiet' ? 1 : solarActivity === 'moderate' ? 3 : 10;

    // Shielding attenuation (exponential)
    const shieldingFactor = Math.exp(-shielding / 5);

    // Chip hardness factor
    const hardnessFactor = chipType === 'commercial' ? 1 : chipType === 'rad-tolerant' ? 0.1 : 0.01;

    // SEU rate (upsets per day)
    const seuRate = fluxFactor * solarMultiplier * shieldingFactor * hardnessFactor * 0.1;

    // TID rate (rad per day)
    const tidRate = fluxFactor * solarMultiplier * shieldingFactor * 10;

    // Latchup risk
    const latchupRisk = fluxFactor * solarMultiplier * shieldingFactor * hardnessFactor > 5 ? 'HIGH' :
                        fluxFactor * solarMultiplier * shieldingFactor * hardnessFactor > 1 ? 'MODERATE' : 'LOW';

    return {
      fluxFactor: fluxFactor.toFixed(1),
      seuRate: seuRate.toFixed(2),
      tidRate: tidRate.toFixed(1),
      latchupRisk,
      beltRegion: altitude < 1000 ? 'Below Inner Belt' :
                  altitude <= 6000 ? 'INNER BELT (Danger!)' :
                  altitude < 13000 ? 'Slot Region' :
                  altitude <= 30000 ? 'OUTER BELT (Danger!)' : 'Beyond Belts',
      riskLevel: fluxFactor > 50 ? 'CRITICAL' : fluxFactor > 10 ? 'HIGH' : fluxFactor > 2 ? 'MODERATE' : 'LOW'
    };
  }, [altitude, shielding, chipType, solarActivity]);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase !== undefined && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 360);
      // Simulate SEU accumulation
      const rad = calculateRadiation();
      if (Math.random() < parseFloat(rad.seuRate) / 100) {
        setSeuCount(c => c + 1);
      }
      setTidAccumulated(t => t + parseFloat(rad.tidRate) / 8640); // Per second accumulation
    }, 100);
    return () => clearInterval(interval);
  }, [calculateRadiation]);

  const playSound = useCallback((soundType: 'transition' | 'correct' | 'incorrect' | 'complete' | 'click' | 'beep') => {
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
        },
        beep: () => {
          oscillator.frequency.setValueAtTime(1000, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.03);
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
                  backgroundColor: i < currentIndex ? '#22c55e' : i === currentIndex ? '#ef4444' : '#334155',
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
          background: 'rgba(239, 68, 68, 0.2)',
          color: '#ef4444',
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
              background: canGoNext ? 'linear-gradient(135deg, #ef4444 0%, #a855f7 100%)' : '#1e293b',
              color: canGoNext ? '#ffffff' : '#475569',
              border: 'none',
              cursor: canGoNext ? 'pointer' : 'not-allowed',
              opacity: canGoNext ? 1 : 0.5,
              boxShadow: canGoNext ? '0 2px 12px rgba(239, 68, 68, 0.3)' : 'none',
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
    playSound(prediction === 'bitflips' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'prediction_made', data: { prediction, correct: prediction === 'bitflips' } });
  }, [playSound, onGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    playSound(prediction === 'van_allen' ? 'correct' : 'incorrect');
    onGameEvent?.({ type: 'twist_prediction_made', data: { prediction, correct: prediction === 'van_allen' } });
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
      question: "What is a Single Event Upset (SEU)?",
      options: [
        { text: "A satellite collision", correct: false },
        { text: "A bit flip in memory caused by a high-energy particle", correct: true },
        { text: "An electrical short circuit", correct: false },
        { text: "A software bug", correct: false }
      ]
    },
    {
      question: "Why do space-grade chips cost so much more than commercial chips?",
      options: [
        { text: "They use gold instead of copper", correct: false },
        { text: "They are rad-hardened with special design and manufacturing", correct: true },
        { text: "They are hand-made by astronauts", correct: false },
        { text: "Space agencies overcharge for them", correct: false }
      ]
    },
    {
      question: "What are the Van Allen belts?",
      options: [
        { text: "Asteroid debris orbiting Earth", correct: false },
        { text: "Regions of trapped energetic particles around Earth", correct: true },
        { text: "Radio interference zones", correct: false },
        { text: "Magnetic field lines visible from space", correct: false }
      ]
    },
    {
      question: "Total Ionizing Dose (TID) causes damage by:",
      options: [
        { text: "Making the chip physically crack", correct: false },
        { text: "Accumulating charge in oxide layers, degrading transistor performance", correct: true },
        { text: "Changing the chip's color", correct: false },
        { text: "Making the chip radioactive", correct: false }
      ]
    },
    {
      question: "What is latchup in electronics?",
      options: [
        { text: "When a chip gets locked in a high-current state, potentially destructive", correct: true },
        { text: "When the satellite latches onto a space station", correct: false },
        { text: "A type of memory storage", correct: false },
        { text: "Normal chip operation", correct: false }
      ]
    },
    {
      question: "Which orbit altitude is typically MOST hazardous for radiation?",
      options: [
        { text: "LEO at 400 km (below inner belt)", correct: false },
        { text: "MEO passing through Van Allen belts (1000-30000 km)", correct: true },
        { text: "GEO at 36000 km (above outer belt)", correct: false },
        { text: "All orbits have identical radiation", correct: false }
      ]
    },
    {
      question: "How does shielding help protect electronics?",
      options: [
        { text: "It makes the satellite invisible to particles", correct: false },
        { text: "It absorbs or deflects incoming particles, reducing dose", correct: true },
        { text: "It creates a magnetic field", correct: false },
        { text: "It has no effect on space radiation", correct: false }
      ]
    },
    {
      question: "During a solar storm, radiation levels can:",
      options: [
        { text: "Stay exactly the same", correct: false },
        { text: "Increase by 10-1000x for hours to days", correct: true },
        { text: "Drop to zero", correct: false },
        { text: "Only affect the Sun", correct: false }
      ]
    },
    {
      question: "Triple Modular Redundancy (TMR) protects against SEUs by:",
      options: [
        { text: "Using three copies and voting - one upset is outvoted", correct: true },
        { text: "Making the chip three times thicker", correct: false },
        { text: "Running the chip three times faster", correct: false },
        { text: "It doesn't protect against SEUs", correct: false }
      ]
    },
    {
      question: "Why do GPS satellites in MEO require more radiation hardening than ISS?",
      options: [
        { text: "GPS satellites are older", correct: false },
        { text: "GPS orbits pass through the Van Allen belts", correct: true },
        { text: "ISS has astronauts who can fix things", correct: false },
        { text: "GPS satellites are smaller", correct: false }
      ]
    }
  ];

  const transferApps = [
    {
      title: "Mars Curiosity Rover",
      short: "Mars Rover",
      description: "Uses a RAD750 processor - radiation-hardened version of PowerPC costing ~$200,000 each.",
      connection: "Space radiation exists throughout the solar system. Curiosity's chips must survive cosmic rays and solar storms for years."
    },
    {
      title: "GPS Constellation",
      short: "GPS",
      description: "24+ satellites at 20,200 km altitude - right in the outer Van Allen belt.",
      connection: "GPS satellites experience intense radiation and use heavily hardened electronics to maintain navigation accuracy for 10+ years."
    },
    {
      title: "Medical Proton Therapy",
      short: "Medical",
      description: "Proton beams used to treat cancer exploit the same particle physics as space radiation.",
      connection: "Understanding how particles deposit energy helps design both cancer treatments and radiation protection."
    },
    {
      title: "Aviation Avionics",
      short: "Aviation",
      description: "Aircraft at high altitude experience increased cosmic ray flux - especially polar routes.",
      connection: "Avionics systems use error correction and redundancy similar to spacecraft to handle occasional upsets."
    }
  ];

  const renderVisualization = () => {
    const rad = calculateRadiation();

    // Generate radiation particle tracks with physics-based trajectories
    const particleTracks = [...Array(15)].map((_, i) => {
      const startX = Math.random() * 100 - 50;
      const startY = -20;
      const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
      const speed = 2 + Math.random() * 2;
      const trackLength = 80 + Math.random() * 60;
      const phase = (animPhase * speed + i * 40) % 400;
      return {
        x1: 300 + startX + Math.cos(angle) * phase,
        y1: startY + Math.sin(angle) * phase,
        x2: 300 + startX + Math.cos(angle) * (phase + trackLength),
        y2: startY + Math.sin(angle) * (phase + trackLength),
        type: i % 4 === 0 ? 'proton' : i % 4 === 1 ? 'electron' : i % 4 === 2 ? 'heavy' : 'cosmic',
        visible: phase < 300 && phase > 0
      };
    });

    // SEU event positions on silicon die
    const seuEvents = [...Array(Math.min(seuCount, 8))].map((_, i) => ({
      x: 45 + (i % 4) * 15 + Math.sin(animPhase * 0.1 + i) * 3,
      y: 75 + Math.floor(i / 4) * 18 + Math.cos(animPhase * 0.15 + i) * 2,
      intensity: 0.4 + Math.sin(animPhase * 0.2 + i * 0.5) * 0.3
    }));

    return (
      <svg viewBox="0 0 500 350" className="w-full h-auto max-w-xl">
        <defs>
          {/* === PREMIUM LINEAR GRADIENTS === */}

          {/* Deep space background with stellar depth */}
          <linearGradient id="radeffSpaceDepth" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="25%" stopColor="#0a0f1a" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="75%" stopColor="#0a1628" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* Chip package gradient with metallic depth */}
          <linearGradient id="radeffChipPackage" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#374151" />
            <stop offset="20%" stopColor="#1f2937" />
            <stop offset="50%" stopColor="#111827" />
            <stop offset="80%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#374151" />
          </linearGradient>

          {/* Silicon die gradient - commercial (gray) */}
          <linearGradient id="radeffSiliconCommercial" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="25%" stopColor="#4b5563" />
            <stop offset="50%" stopColor="#374151" />
            <stop offset="75%" stopColor="#4b5563" />
            <stop offset="100%" stopColor="#6b7280" />
          </linearGradient>

          {/* Silicon die gradient - rad-tolerant (blue) */}
          <linearGradient id="radeffSiliconTolerant" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="25%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#0369a1" />
            <stop offset="75%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>

          {/* Silicon die gradient - rad-hard (green) */}
          <linearGradient id="radeffSiliconHardened" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="25%" stopColor="#059669" />
            <stop offset="50%" stopColor="#047857" />
            <stop offset="75%" stopColor="#059669" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          {/* Gold pin gradient with metallic sheen */}
          <linearGradient id="radeffGoldPin" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ca8a04" />
            <stop offset="25%" stopColor="#eab308" />
            <stop offset="50%" stopColor="#fde047" />
            <stop offset="75%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>

          {/* Inner Van Allen belt - proton-rich (red tones) */}
          <linearGradient id="radeffInnerBelt" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
            <stop offset="30%" stopColor="#dc2626" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#b91c1c" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.05" />
          </linearGradient>

          {/* Outer Van Allen belt - electron-rich (amber/orange tones) */}
          <linearGradient id="radeffOuterBelt" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
            <stop offset="30%" stopColor="#d97706" stopOpacity="0.2" />
            <stop offset="60%" stopColor="#b45309" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#78350f" stopOpacity="0.03" />
          </linearGradient>

          {/* Status panel gradient */}
          <linearGradient id="radeffStatusPanel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#020617" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
          </linearGradient>

          {/* === PREMIUM RADIAL GRADIENTS === */}

          {/* Earth with realistic atmospheric glow */}
          <radialGradient id="radeffEarthCore" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="30%" stopColor="#3b82f6" />
            <stop offset="60%" stopColor="#2563eb" />
            <stop offset="85%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#1e3a5f" />
          </radialGradient>

          {/* Earth atmosphere glow */}
          <radialGradient id="radeffAtmosphere" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="85%" stopColor="#60a5fa" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.1" />
          </radialGradient>

          {/* Proton particle glow (red/orange) */}
          <radialGradient id="radeffProtonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef2f2" stopOpacity="1" />
            <stop offset="25%" stopColor="#fca5a5" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#ef4444" stopOpacity="0.6" />
            <stop offset="75%" stopColor="#dc2626" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
          </radialGradient>

          {/* Electron particle glow (blue/cyan) */}
          <radialGradient id="radeffElectronGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ecfeff" stopOpacity="1" />
            <stop offset="25%" stopColor="#67e8f9" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.6" />
            <stop offset="75%" stopColor="#06b6d4" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
          </radialGradient>

          {/* Heavy ion particle glow (purple) */}
          <radialGradient id="radeffHeavyIonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#faf5ff" stopOpacity="1" />
            <stop offset="25%" stopColor="#d8b4fe" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.6" />
            <stop offset="75%" stopColor="#9333ea" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>

          {/* Cosmic ray glow (intense white/yellow) */}
          <radialGradient id="radeffCosmicGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="20%" stopColor="#fef9c3" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#fde047" stopOpacity="0.7" />
            <stop offset="70%" stopColor="#facc15" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
          </radialGradient>

          {/* SEU damage indicator glow */}
          <radialGradient id="radeffSEUDamage" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="20%" stopColor="#fef08a" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#f97316" stopOpacity="0.5" />
            <stop offset="80%" stopColor="#ef4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
          </radialGradient>

          {/* Satellite glow */}
          <radialGradient id="radeffSatelliteGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
            <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.7" />
            <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
          </radialGradient>

          {/* === PREMIUM GLOW FILTERS === */}

          {/* Particle track glow filter */}
          <filter id="radeffParticleGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* SEU flash glow filter */}
          <filter id="radeffSEUFlash" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Earth atmosphere glow */}
          <filter id="radeffEarthGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Satellite beacon glow */}
          <filter id="radeffBeaconGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Status indicator glow */}
          <filter id="radeffStatusGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Van Allen belt shimmer effect */}
          <filter id="radeffBeltShimmer" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" />
          </filter>

          {/* Subtle grid pattern for lab/space station feel */}
          <pattern id="radeffGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
          </pattern>

          {/* Circuit pattern for chip */}
          <pattern id="radeffCircuit" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M0,4 L3,4 L3,0 M8,4 L5,4 L5,8 M4,0 L4,3 L8,3 M4,8 L4,5 L0,5"
                  fill="none" stroke="#475569" strokeWidth="0.5" strokeOpacity="0.4" />
          </pattern>
        </defs>

        {/* === PREMIUM SPACE BACKGROUND === */}
        <rect width="500" height="350" fill="url(#radeffSpaceDepth)" />
        <rect width="500" height="350" fill="url(#radeffGrid)" opacity="0.5" />

        {/* Distant stars */}
        {[...Array(30)].map((_, i) => (
          <circle
            key={`star-${i}`}
            cx={15 + (i * 47) % 470}
            cy={10 + (i * 31) % 330}
            r={0.3 + (i % 3) * 0.3}
            fill="#ffffff"
            opacity={0.3 + (i % 4) * 0.15}
          >
            <animate attributeName="opacity"
                     values={`${0.2 + (i % 4) * 0.1};${0.5 + (i % 3) * 0.15};${0.2 + (i % 4) * 0.1}`}
                     dur={`${2 + i % 3}s`}
                     repeatCount="indefinite" />
          </circle>
        ))}

        {/* === VAN ALLEN BELT VISUALIZATION === */}
        <g transform="translate(300, 165)">
          {/* Outer belt with gradient and shimmer */}
          <ellipse cx="0" cy="0" rx="135" ry="85" fill="url(#radeffOuterBelt)" />
          <ellipse cx="0" cy="0" rx="135" ry="85" fill="none" stroke="#f59e0b" strokeWidth="0.5" strokeOpacity="0.3" strokeDasharray="4 2" />
          <ellipse cx="0" cy="0" rx="115" ry="65" fill="#020617" />

          {/* Inner belt with gradient */}
          <ellipse cx="0" cy="0" rx="75" ry="45" fill="url(#radeffInnerBelt)" />
          <ellipse cx="0" cy="0" rx="75" ry="45" fill="none" stroke="#ef4444" strokeWidth="0.5" strokeOpacity="0.4" strokeDasharray="3 2" />
          <ellipse cx="0" cy="0" rx="55" ry="30" fill="#020617" />

          {/* Earth with atmosphere effect */}
          <circle cx="0" cy="0" r="30" fill="url(#radeffAtmosphere)" filter="url(#radeffEarthGlow)" />
          <circle cx="0" cy="0" r="25" fill="url(#radeffEarthCore)" />

          {/* Earth surface details */}
          <ellipse cx="-8" cy="-5" rx="8" ry="5" fill="#22c55e" opacity="0.4" />
          <ellipse cx="5" cy="8" rx="6" ry="4" fill="#22c55e" opacity="0.3" />
          <ellipse cx="-3" cy="12" rx="4" ry="3" fill="#22c55e" opacity="0.25" />

          {/* Satellite position with glow */}
          <g transform={`translate(${Math.min((altitude / 1000) * 3, 120)}, ${-Math.min((altitude / 1000) * 0.8, 30)})`}>
            <circle r="12" fill="url(#radeffSatelliteGlow)" filter="url(#radeffBeaconGlow)" />
            <rect x="-4" y="-2" width="8" height="4" fill="#94a3b8" rx="1" />
            <rect x="-8" y="-1" width="4" height="2" fill="#06b6d4" />
            <rect x="4" y="-1" width="4" height="2" fill="#06b6d4" />
            <circle r="1.5" fill="#22d3ee">
              <animate attributeName="opacity" values="1;0.4;1" dur="0.8s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* Belt region labels */}
          <text x="0" y="55" textAnchor="middle" fill="#ef4444" fontSize="7" fontWeight="600" opacity="0.8">INNER BELT</text>
          <text x="0" y="95" textAnchor="middle" fill="#f59e0b" fontSize="7" fontWeight="600" opacity="0.8">OUTER BELT</text>
          <text x="0" y="-95" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="700">VAN ALLEN RADIATION BELTS</text>
        </g>

        {/* === RADIATION PARTICLE TRACKS === */}
        {particleTracks.filter(t => t.visible).map((track, i) => {
          const gradientId = track.type === 'proton' ? 'radeffProtonGlow' :
                             track.type === 'electron' ? 'radeffElectronGlow' :
                             track.type === 'heavy' ? 'radeffHeavyIonGlow' : 'radeffCosmicGlow';
          const strokeColor = track.type === 'proton' ? '#ef4444' :
                              track.type === 'electron' ? '#22d3ee' :
                              track.type === 'heavy' ? '#a855f7' : '#fde047';
          return (
            <g key={`track-${i}`} filter="url(#radeffParticleGlow)">
              {/* Main track line */}
              <line
                x1={track.x1} y1={track.y1}
                x2={track.x2} y2={track.y2}
                stroke={strokeColor}
                strokeWidth={track.type === 'cosmic' ? 2 : track.type === 'heavy' ? 1.5 : 1}
                strokeOpacity={0.7}
                strokeLinecap="round"
              />
              {/* Particle head */}
              <circle
                cx={track.x2} cy={track.y2}
                r={track.type === 'cosmic' ? 4 : track.type === 'heavy' ? 3 : 2}
                fill={`url(#${gradientId})`}
              />
            </g>
          );
        })}

        {/* === PREMIUM CHIP VISUALIZATION === */}
        <g transform="translate(20, 45)">
          {/* Chip package with premium gradient */}
          <rect x="0" y="0" width="120" height="95" rx="6" fill="url(#radeffChipPackage)" stroke="#475569" strokeWidth="1.5" />

          {/* Inner cavity */}
          <rect x="8" y="8" width="104" height="79" rx="4" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />

          {/* Die attach pad */}
          <rect x="18" y="18" width="84" height="59" rx="2" fill="#1e293b" />

          {/* Silicon die with appropriate gradient */}
          <rect
            x="28" y="25"
            width="64" height="45"
            rx="2"
            fill={chipType === 'rad-hard' ? 'url(#radeffSiliconHardened)' :
                  chipType === 'rad-tolerant' ? 'url(#radeffSiliconTolerant)' : 'url(#radeffSiliconCommercial)'}
            stroke={chipType === 'rad-hard' ? '#10b981' : chipType === 'rad-tolerant' ? '#0ea5e9' : '#6b7280'}
            strokeWidth="0.5"
          />

          {/* Circuit pattern overlay on die */}
          <rect x="28" y="25" width="64" height="45" rx="2" fill="url(#radeffCircuit)" opacity="0.6" />

          {/* Die bond wires */}
          {[0, 1, 2, 3, 4].map(i => (
            <React.Fragment key={`wire-${i}`}>
              <path d={`M${32 + i * 12},25 Q${32 + i * 12},15 ${22 + i * 18},10`}
                    fill="none" stroke="#fcd34d" strokeWidth="0.7" opacity="0.7" />
              <path d={`M${32 + i * 12},70 Q${32 + i * 12},80 ${22 + i * 18},87`}
                    fill="none" stroke="#fcd34d" strokeWidth="0.7" opacity="0.7" />
            </React.Fragment>
          ))}

          {/* Premium gold pins */}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <React.Fragment key={`pin-${i}`}>
              <rect x={12 + i * 17} y="87" width="6" height="18" rx="1" fill="url(#radeffGoldPin)" />
              <rect x={12 + i * 17} y="-10" width="6" height="18" rx="1" fill="url(#radeffGoldPin)" />
            </React.Fragment>
          ))}

          {/* SEU damage indicators on silicon die */}
          {seuEvents.map((seu, i) => (
            <g key={`seu-${i}`} transform={`translate(${seu.x}, ${seu.y})`}>
              <circle r="6" fill="url(#radeffSEUDamage)" filter="url(#radeffSEUFlash)" opacity={seu.intensity}>
                <animate attributeName="r" values="4;8;4" dur="0.5s" repeatCount="indefinite" />
              </circle>
              <circle r="2" fill="#ffffff" opacity={seu.intensity * 0.8}>
                <animate attributeName="opacity" values="0.8;0.3;0.8" dur="0.3s" repeatCount="indefinite" />
              </circle>
            </g>
          ))}

          {/* Active SEU flash effect */}
          {seuCount > 0 && (animPhase % 60 < 15) && (
            <g transform="translate(60, 47)">
              <circle r="20" fill="url(#radeffSEUDamage)" filter="url(#radeffSEUFlash)" opacity="0.8">
                <animate attributeName="r" values="8;25;8" dur="0.4s" repeatCount="1" />
                <animate attributeName="opacity" values="0.9;0.2;0" dur="0.4s" repeatCount="1" />
              </circle>
            </g>
          )}

          {/* Chip type label */}
          <text x="60" y="115" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="600">
            {chipType === 'rad-hard' ? 'RAD-HARDENED' : chipType === 'rad-tolerant' ? 'RAD-TOLERANT' : 'COMMERCIAL COTS'}
          </text>

          {/* Chip protection level indicator */}
          <rect x="25" y="120" width="70" height="4" rx="2" fill="#1e293b" />
          <rect x="25" y="120"
                width={chipType === 'rad-hard' ? 70 : chipType === 'rad-tolerant' ? 45 : 15}
                height="4" rx="2"
                fill={chipType === 'rad-hard' ? '#10b981' : chipType === 'rad-tolerant' ? '#0ea5e9' : '#ef4444'} />
        </g>

        {/* === PREMIUM STATUS PANEL === */}
        <g transform="translate(10, 180)">
          <rect x="0" y="0" width="145" height="160" rx="8" fill="url(#radeffStatusPanel)" stroke="#334155" strokeWidth="1" />

          {/* Panel header */}
          <rect x="0" y="0" width="145" height="24" rx="8" fill="#ef4444" opacity="0.15" />
          <text x="72" y="16" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="700" filter="url(#radeffStatusGlow)">RADIATION STATUS</text>

          {/* Status rows with improved styling */}
          <text x="10" y="40" fill="#64748b" fontSize="8">Altitude:</text>
          <text x="135" y="40" textAnchor="end" fill="#22d3ee" fontSize="9" fontWeight="600">{altitude.toLocaleString()} km</text>

          <text x="10" y="55" fill="#64748b" fontSize="8">Region:</text>
          <text x="135" y="55" textAnchor="end" fill={rad.beltRegion.includes('BELT') ? '#ef4444' : '#22c55e'} fontSize="8" fontWeight="600">{rad.beltRegion}</text>

          <text x="10" y="70" fill="#64748b" fontSize="8">Flux Factor:</text>
          <text x="135" y="70" textAnchor="end" fill="#f59e0b" fontSize="9" fontWeight="600">{rad.fluxFactor}x</text>

          <line x1="10" y1="78" x2="135" y2="78" stroke="#334155" strokeWidth="0.5" />

          <text x="10" y="93" fill="#64748b" fontSize="8">SEU Rate:</text>
          <text x="135" y="93" textAnchor="end" fill="#a855f7" fontSize="9" fontWeight="600">{rad.seuRate}/day</text>

          <text x="10" y="108" fill="#64748b" fontSize="8">TID Rate:</text>
          <text x="135" y="108" textAnchor="end" fill="#f97316" fontSize="9" fontWeight="600">{rad.tidRate} rad/day</text>

          <text x="10" y="123" fill="#64748b" fontSize="8">Latchup Risk:</text>
          <text x="135" y="123" textAnchor="end"
                fill={rad.latchupRisk === 'HIGH' ? '#ef4444' : rad.latchupRisk === 'MODERATE' ? '#f59e0b' : '#22c55e'}
                fontSize="9" fontWeight="700">{rad.latchupRisk}</text>

          {/* Risk level indicator bar */}
          <rect x="10" y="133" width="125" height="18" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
          <rect x="12" y="135" width="121" height="14" rx="3"
                fill={rad.riskLevel === 'CRITICAL' ? '#ef4444' : rad.riskLevel === 'HIGH' ? '#f97316' : rad.riskLevel === 'MODERATE' ? '#eab308' : '#22c55e'}
                opacity="0.25" />
          <text x="72" y="146" textAnchor="middle"
                fill={rad.riskLevel === 'CRITICAL' ? '#ef4444' : rad.riskLevel === 'HIGH' ? '#f97316' : rad.riskLevel === 'MODERATE' ? '#eab308' : '#22c55e'}
                fontSize="10" fontWeight="700" filter="url(#radeffStatusGlow)">{rad.riskLevel}</text>
        </g>

        {/* === SEU COUNTER PANEL === */}
        <g transform="translate(380, 275)">
          <rect x="0" y="0" width="105" height="60" rx="8" fill="url(#radeffStatusPanel)" stroke="#a855f7" strokeWidth="1" />
          <rect x="0" y="0" width="105" height="20" rx="8" fill="#a855f7" opacity="0.15" />
          <text x="52" y="14" textAnchor="middle" fill="#a855f7" fontSize="9" fontWeight="700">SEU EVENTS</text>
          <text x="52" y="45" textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="700" filter="url(#radeffStatusGlow)">{seuCount}</text>
          <circle cx="90" cy="45" r="4" fill={seuCount > 10 ? '#ef4444' : seuCount > 5 ? '#f59e0b' : '#22c55e'}>
            <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* === SOLAR ACTIVITY INDICATOR === */}
        <g transform="translate(380, 10)">
          <rect x="0" y="0" width="105" height="30" rx="6" fill="url(#radeffStatusPanel)" stroke="#334155" strokeWidth="0.5" />
          <circle cx="15" cy="15" r="8"
                  fill={solarActivity === 'storm' ? '#ef4444' : solarActivity === 'moderate' ? '#f59e0b' : '#22c55e'}>
            <animate attributeName="r" values="6;8;6" dur={solarActivity === 'storm' ? '0.3s' : '1s'} repeatCount="indefinite" />
          </circle>
          <text x="60" y="18" textAnchor="middle"
                fill={solarActivity === 'storm' ? '#ef4444' : solarActivity === 'moderate' ? '#f59e0b' : '#22c55e'}
                fontSize="9" fontWeight="700">{solarActivity.toUpperCase()}</text>
        </g>

        {/* Particle type legend */}
        <g transform="translate(380, 50)">
          <rect x="0" y="0" width="105" height="60" rx="6" fill="url(#radeffStatusPanel)" stroke="#334155" strokeWidth="0.5" opacity="0.8" />
          <text x="52" y="12" textAnchor="middle" fill="#94a3b8" fontSize="7" fontWeight="600">PARTICLE TYPES</text>
          <circle cx="12" cy="24" r="3" fill="url(#radeffProtonGlow)" />
          <text x="22" y="27" fill="#94a3b8" fontSize="7">Proton</text>
          <circle cx="62" cy="24" r="3" fill="url(#radeffElectronGlow)" />
          <text x="72" y="27" fill="#94a3b8" fontSize="7">Electron</text>
          <circle cx="12" cy="42" r="3" fill="url(#radeffHeavyIonGlow)" />
          <text x="22" y="45" fill="#94a3b8" fontSize="7">Heavy Ion</text>
          <circle cx="62" cy="42" r="3" fill="url(#radeffCosmicGlow)" />
          <text x="72" y="45" fill="#94a3b8" fontSize="7">Cosmic</text>
        </g>
      </svg>
    );
  };

  const renderControls = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <div className="bg-slate-800/50 p-4 rounded-xl">
        <label className="text-slate-300 text-sm block mb-2">Altitude: {altitude} km</label>
        <input
          type="range"
          min="200"
          max="40000"
          step="200"
          value={altitude}
          onChange={(e) => setAltitude(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>LEO</span>
          <span>Van Allen</span>
          <span>GEO</span>
        </div>
      </div>
      <div className="bg-slate-800/50 p-4 rounded-xl">
        <label className="text-slate-300 text-sm block mb-2">Shielding: {shielding} mm Al</label>
        <input
          type="range"
          min="0"
          max="20"
          step="1"
          value={shielding}
          onChange={(e) => setShielding(parseInt(e.target.value))}
          className="w-full"
        />
      </div>
      <div className="bg-slate-800/50 p-4 rounded-xl">
        <label className="text-slate-300 text-sm block mb-2">Chip Type</label>
        <div className="flex gap-2">
          {['commercial', 'rad-tolerant', 'rad-hard'].map(type => (
            <button
              key={type}
              onClick={() => setChipType(type as typeof chipType)}
              style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold ${chipType === type ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              {type === 'commercial' ? 'Comm' : type === 'rad-tolerant' ? 'Tolerant' : 'Hardened'}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-slate-800/50 p-4 rounded-xl">
        <label className="text-slate-300 text-sm block mb-2">Solar Activity</label>
        <div className="flex gap-2">
          {['quiet', 'moderate', 'storm'].map(activity => (
            <button
              key={activity}
              onClick={() => setSolarActivity(activity as typeof solarActivity)}
              style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold ${solarActivity === activity ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              {activity.charAt(0).toUpperCase() + activity.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPhaseContent = () => {
    switch (phase) {
      case 'hook':
        return (
          <div className="flex flex-col items-center justify-center min-h-[500px] px-6 py-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full mb-6">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-red-400 tracking-wide">SPACE RADIATION</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white via-red-100 to-purple-200 bg-clip-text text-transparent">
              Why Do Space Chips Cost 1000x More Than Regular Chips?
            </h1>
            <p className="text-lg text-slate-400 max-w-xl mb-6">
              Your phone has more processing power than early spacecraft, but would fail in minutes in space. What is so different?
            </p>

            <div className="bg-slate-800/60 rounded-2xl p-4 max-w-2xl border border-slate-700/50 mb-6">
              {renderVisualization()}
            </div>

            <button
              onClick={() => goToPhase('predict')}
              style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-red-600 to-purple-600 text-white text-lg font-semibold rounded-2xl transition-all hover:scale-[1.02]"
            >
              Discover Radiation Effects
            </button>
          </div>
        );

      case 'predict':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-red-400 mb-6">Make Your Prediction</h2>
            <p className="text-lg text-slate-200 mb-6 text-center max-w-lg">
              High-energy particles from the Sun and cosmic rays bombard spacecraft constantly. What is the most common effect on electronics?
            </p>

            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'heat', text: 'They heat up the chip until it melts' },
                { id: 'bitflips', text: 'They flip bits in memory - turning 0s to 1s randomly' },
                { id: 'glow', text: 'They make the chip glow with radiation' },
                { id: 'nothing', text: 'Modern chips are immune to radiation' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => handlePrediction(option.id)}
                  disabled={showPredictionFeedback}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showPredictionFeedback && option.id === 'bitflips'
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
                <p className={`font-bold text-lg mb-2 ${selectedPrediction === 'bitflips' ? 'text-green-400' : 'text-red-400'}`}>
                  {selectedPrediction === 'bitflips' ? 'Exactly!' : 'Close, but the main effect is more subtle!'}
                </p>
                <p className="text-slate-300 mb-3">
                  Single Event Upsets (SEUs) - when a particle strikes a transistor and flips a bit - are the most common radiation effect. One cosmic ray can change your data or crash your program!
                </p>
                <button
                  onClick={() => goToPhase('play')}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className="mt-2 px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl"
                >
                  Explore Radiation Effects
                </button>
              </div>
            )}
          </div>
        );

      case 'play':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Radiation Environment Simulator</h2>
            <p className="text-slate-300 mb-4 text-center max-w-lg">
              Adjust altitude and shielding to see how radiation levels change. Watch the SEU counter!
            </p>

            <div className="bg-slate-800/60 rounded-2xl p-4 max-w-2xl border border-slate-700/50 mb-4">
              {renderVisualization()}
            </div>

            {renderControls()}

            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 max-w-lg mt-4">
              <p className="text-red-400 text-sm">
                <strong>Warning:</strong> Move to 3000 km altitude and watch the danger level spike as you enter the inner Van Allen belt!
              </p>
            </div>

            <button
              onClick={() => goToPhase('review')}
              style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
              className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl"
            >
              Review the Physics
            </button>
          </div>
        );

      case 'review':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-red-400 mb-6">Radiation Effects on Electronics</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mb-6">
              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-purple-400 mb-3">Single Event Upset (SEU)</h3>
                <p className="text-slate-300 text-sm">
                  A particle strike flips one or more bits in memory. Non-destructive but can corrupt data or crash systems. Happens constantly in space!
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-orange-400 mb-3">Total Ionizing Dose (TID)</h3>
                <p className="text-slate-300 text-sm">
                  Accumulated radiation damage to transistor oxides. Gradual degradation over months/years. Eventually makes chips fail permanently.
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-red-400 mb-3">Single Event Latchup (SEL)</h3>
                <p className="text-slate-300 text-sm">
                  Particle creates a parasitic thyristor, causing high current draw. Can destroy the chip if power is not cut immediately!
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-green-400 mb-3">Rad-Hardening Techniques</h3>
                <p className="text-slate-300 text-sm">
                  Special transistor designs, triple redundancy (TMR), error-correcting memory, and watchdog timers. Costs 100-1000x more!
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
            <h2 className="text-2xl font-bold text-purple-400 mb-6">The Most Dangerous Place</h2>
            <div className="bg-slate-800 p-5 rounded-xl mb-6 max-w-lg">
              <p className="text-slate-200 text-center mb-4">
                Satellites operate at many different altitudes. Some orbits are far more hazardous than others.
              </p>
              <p className="text-xl text-purple-300 text-center font-bold">
                Where is radiation the most intense around Earth?
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-6">
              {[
                { id: 'surface', text: 'Right at Earth\'s surface - closest to the core' },
                { id: 'leo', text: 'Low Earth Orbit at 400 km - like the ISS' },
                { id: 'van_allen', text: 'The Van Allen belts at 1000-30000 km altitude' },
                { id: 'deep', text: 'Deep space, far from any planet' }
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => handleTwistPrediction(option.id)}
                  disabled={showTwistFeedback}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className={`p-4 rounded-xl text-left transition-all ${
                    showTwistFeedback && option.id === 'van_allen'
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
                <p className={`font-bold text-lg mb-2 ${twistPrediction === 'van_allen' ? 'text-green-400' : 'text-purple-400'}`}>
                  {twistPrediction === 'van_allen' ? 'Correct!' : 'The Van Allen belts are the danger zone!'}
                </p>
                <p className="text-slate-300">
                  Earth's magnetic field traps energetic particles in donut-shaped belts. Radiation there is 100-1000x higher than in LEO or GEO. Apollo astronauts had to pass through quickly!
                </p>
                <button
                  onClick={() => goToPhase('twist_play')}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl"
                >
                  Explore the Belts
                </button>
              </div>
            )}
          </div>
        );

      case 'twist_play':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Van Allen Belt Explorer</h2>

            <div className="bg-slate-800/60 rounded-2xl p-4 max-w-2xl border border-slate-700/50 mb-4">
              {renderVisualization()}
            </div>

            <div className="bg-slate-800 p-4 rounded-xl max-w-lg mb-4">
              <p className="text-slate-300 text-sm mb-3">
                <strong className="text-purple-400">Sweep through altitude</strong> to see how radiation changes. Notice the peaks at the inner and outer belts!
              </p>
              <input
                type="range"
                min="200"
                max="40000"
                step="200"
                value={altitude}
                onChange={(e) => setAltitude(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-center text-purple-400 font-bold mt-2">{altitude} km</p>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-lg text-center text-xs">
              <div className="bg-green-900/30 p-2 rounded-lg">
                <p className="text-green-400 font-bold">LEO</p>
                <p className="text-slate-400">Below belts</p>
              </div>
              <div className="bg-red-900/30 p-2 rounded-lg">
                <p className="text-red-400 font-bold">Van Allen</p>
                <p className="text-slate-400">Danger zone!</p>
              </div>
              <div className="bg-blue-900/30 p-2 rounded-lg">
                <p className="text-blue-400 font-bold">GEO</p>
                <p className="text-slate-400">Above belts</p>
              </div>
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
            <h2 className="text-2xl font-bold text-purple-400 mb-6">Navigating the Radiation Environment</h2>

            <div className="grid grid-cols-1 gap-4 max-w-lg mb-6">
              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-green-400 mb-2">Safe Havens</h3>
                <p className="text-slate-300 text-sm">
                  LEO (400 km) is protected by Earth's magnetic field. GEO (36,000 km) is above the outer belt. Most satellites operate in these zones.
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-red-400 mb-2">Danger Zones</h3>
                <p className="text-slate-300 text-sm">
                  Inner belt (1,500-5,000 km) has trapped protons. Outer belt (13,000-25,000 km) has trapped electrons. GPS satellites at 20,000 km need heavy shielding.
                </p>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl">
                <h3 className="text-lg font-bold text-orange-400 mb-2">Apollo's Challenge</h3>
                <p className="text-slate-300 text-sm">
                  Moon-bound astronauts passed through both belts. The trajectory was optimized to minimize time in the danger zone. Total dose was significant but not lethal.
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
                      ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {completedApps.has(index) && '+ '}{app.short}
                </button>
              ))}
            </div>

            <div className="bg-gradient-to-r from-red-600 to-purple-600 p-1 rounded-xl w-full max-w-2xl">
              <div className="bg-slate-900 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-2">{transferApps[activeAppTab].title}</h3>
                <p className="text-slate-300 mb-4">{transferApps[activeAppTab].description}</p>

                <div className="bg-slate-800/50 p-4 rounded-lg mb-4">
                  <h4 className="text-red-400 font-bold mb-2">Radiation Connection</h4>
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

            <div className="flex gap-4 mt-4">
              {activeAppTab < transferApps.length - 1 && (
                <button
                  onClick={() => setActiveAppTab(activeAppTab + 1)}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl"
                >
                  Next Application →
                </button>
              )}
              {completedApps.size >= 3 && (
                <button
                  onClick={() => goToPhase('test')}
                  style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                  className="px-8 py-3 bg-gradient-to-r from-red-600 to-purple-600 text-white font-bold rounded-xl"
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
            <h2 className="text-2xl font-bold text-red-400 mb-6">Knowledge Test</h2>

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
                            ? 'bg-purple-600 text-white'
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
                <p className="text-3xl font-bold text-red-400 mb-2">
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
            <h2 className="text-4xl font-bold bg-gradient-to-r from-red-400 to-purple-400 bg-clip-text text-transparent mb-4">
              Radiation Effects Master!
            </h2>
            <div className="bg-gradient-to-r from-red-600/20 to-purple-600/20 border-2 border-red-500/50 p-8 rounded-2xl max-w-md mb-6">
              <p className="text-slate-200 mb-6 text-lg">
                You understand why space electronics must be specially hardened!
              </p>
              <div className="text-left text-slate-300 space-y-3">
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>SEU, TID, and Latchup mechanisms</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>Van Allen belts trap dangerous particles</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>Shielding and rad-hardening protect electronics</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-green-400 text-xl">+</span>
                  <span>Different orbits have different radiation levels</span>
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
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-red-400">Radiation Effects</span>
          <div className="flex gap-1.5">
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-gradient-to-r from-red-400 to-purple-400 w-6'
                    : currentIndex > i
                    ? 'bg-emerald-500 w-2'
                    : 'bg-slate-600 w-2 hover:bg-slate-500'
                }`}
                title={phaseNames[p]}
              />
            ))}
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

export default RadiationEffectsRenderer;
