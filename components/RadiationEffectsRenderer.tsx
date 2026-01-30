'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// GAME 199: RADIATION EFFECTS ON ELECTRONICS
// Physics: SEU rate, Total Ionizing Dose (TID), Latchup from energetic particles
// The Van Allen belts trap high-energy particles creating hazardous regions
// ============================================================================

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
    const particlePositions = [...Array(20)].map((_, i) => ({
      x: (animPhase * (3 + i * 0.5) + i * 50) % 500,
      y: 50 + Math.sin((animPhase + i * 30) * Math.PI / 180) * 30 + (i * 15) % 200
    }));

    // Belt visualization
    const innerBeltY = 280 - (3000 / 40000 * 250);
    const outerBeltY = 280 - (20000 / 40000 * 250);
    const currentAltY = 280 - (altitude / 40000 * 250);

    return (
      <svg viewBox="0 0 500 350" className="w-full h-auto max-w-xl">
        <defs>
          <linearGradient id="spaceGradRad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a0a1a" />
            <stop offset="100%" stopColor="#1a1a3a" />
          </linearGradient>
          <radialGradient id="earthGradRad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e3a5f" />
          </radialGradient>
        </defs>

        <rect width="500" height="350" fill="url(#spaceGradRad)" />

        {/* Van Allen belt visualization (side view) */}
        <g transform="translate(180, 0)">
          {/* Outer belt */}
          <ellipse cx="60" cy="155" rx="130" ry="80" fill="#f59e0b" opacity="0.15" />
          <ellipse cx="60" cy="155" rx="110" ry="60" fill="#0a0a1a" />

          {/* Inner belt */}
          <ellipse cx="60" cy="155" rx="70" ry="40" fill="#ef4444" opacity="0.2" />
          <ellipse cx="60" cy="155" rx="50" ry="25" fill="#0a0a1a" />

          {/* Earth */}
          <circle cx="60" cy="155" r="25" fill="url(#earthGradRad)" />

          {/* Satellite position indicator */}
          <circle
            cx={60 + (altitude / 1000) * 2}
            cy={155 - (altitude / 1000) * 0.5}
            r="5"
            fill="#22d3ee"
            stroke="white"
            strokeWidth="2"
          >
            <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite" />
          </circle>

          <text x="60" y="200" textAnchor="middle" fill="#94a3b8" fontSize="8">Inner Belt</text>
          <text x="60" y="250" textAnchor="middle" fill="#94a3b8" fontSize="8">Outer Belt</text>
        </g>

        {/* Particle animation */}
        {particlePositions.slice(0, altitude > 1000 ? 20 : 5).map((pos, i) => (
          <circle
            key={i}
            cx={pos.x}
            cy={pos.y}
            r={Math.random() * 2 + 1}
            fill={i % 3 === 0 ? '#ef4444' : i % 3 === 1 ? '#fbbf24' : '#60a5fa'}
            opacity={0.7}
          >
            <animate attributeName="opacity" values="0.7;0.2;0.7" dur={`${0.5 + Math.random()}s`} repeatCount="indefinite" />
          </circle>
        ))}

        {/* Chip diagram */}
        <g transform="translate(20, 50)">
          <rect x="0" y="0" width="100" height="80" fill="#1f2937" stroke="#374151" strokeWidth="2" rx="4" />
          <rect x="10" y="10" width="80" height="60" fill="#374151" rx="2" />

          {/* Die */}
          <rect x="25" y="20" width="50" height="40" fill={chipType === 'rad-hard' ? '#047857' : chipType === 'rad-tolerant' ? '#0369a1' : '#6b7280'} rx="1" />

          {/* Pins */}
          {[0, 1, 2, 3, 4].map(i => (
            <React.Fragment key={i}>
              <rect x={15 + i * 15} y="65" width="5" height="20" fill="#d4af37" />
              <rect x={15 + i * 15} y="-5" width="5" height="20" fill="#d4af37" />
            </React.Fragment>
          ))}

          {/* SEU flash effect */}
          {seuCount > 0 && (animPhase % 60 < 10) && (
            <circle cx="50" cy="40" r="15" fill="#ef4444" opacity="0.5">
              <animate attributeName="r" values="5;20;5" dur="0.3s" repeatCount="1" />
            </circle>
          )}

          <text x="50" y="100" textAnchor="middle" fill="#94a3b8" fontSize="9">
            {chipType === 'rad-hard' ? 'Rad-Hard' : chipType === 'rad-tolerant' ? 'Rad-Tolerant' : 'Commercial'}
          </text>
        </g>

        {/* Status panel */}
        <g transform="translate(10, 190)">
          <rect x="0" y="0" width="140" height="150" fill="rgba(0,0,0,0.7)" rx="8" stroke="#334155" />
          <text x="70" y="18" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="bold">RADIATION STATUS</text>

          <text x="10" y="38" fill="#94a3b8" fontSize="9">Altitude:</text>
          <text x="130" y="38" textAnchor="end" fill="#22d3ee" fontSize="9">{altitude} km</text>

          <text x="10" y="53" fill="#94a3b8" fontSize="9">Region:</text>
          <text x="130" y="53" textAnchor="end" fill={rad.beltRegion.includes('BELT') ? '#ef4444' : '#22c55e'} fontSize="8">{rad.beltRegion}</text>

          <text x="10" y="70" fill="#94a3b8" fontSize="9">Flux Factor:</text>
          <text x="130" y="70" textAnchor="end" fill="#f59e0b" fontSize="9">{rad.fluxFactor}x</text>

          <line x1="10" y1="78" x2="130" y2="78" stroke="#475569" />

          <text x="10" y="93" fill="#94a3b8" fontSize="9">SEU Rate:</text>
          <text x="130" y="93" textAnchor="end" fill="#a855f7" fontSize="9">{rad.seuRate}/day</text>

          <text x="10" y="108" fill="#94a3b8" fontSize="9">TID Rate:</text>
          <text x="130" y="108" textAnchor="end" fill="#f97316" fontSize="9">{rad.tidRate} rad/day</text>

          <text x="10" y="123" fill="#94a3b8" fontSize="9">Latchup Risk:</text>
          <text x="130" y="123" textAnchor="end" fill={rad.latchupRisk === 'HIGH' ? '#ef4444' : rad.latchupRisk === 'MODERATE' ? '#f59e0b' : '#22c55e'} fontSize="9">{rad.latchupRisk}</text>

          <rect x="10" y="130" width="120" height="14" fill={rad.riskLevel === 'CRITICAL' ? '#ef4444' : rad.riskLevel === 'HIGH' ? '#f97316' : '#22c55e'} rx="3" opacity="0.3" />
          <text x="70" y="141" textAnchor="middle" fill={rad.riskLevel === 'CRITICAL' ? '#ef4444' : rad.riskLevel === 'HIGH' ? '#f97316' : '#22c55e'} fontSize="10" fontWeight="bold">{rad.riskLevel}</text>
        </g>

        {/* SEU counter */}
        <g transform="translate(380, 280)">
          <rect x="0" y="0" width="100" height="50" fill="rgba(0,0,0,0.6)" rx="6" stroke="#a855f7" />
          <text x="50" y="18" textAnchor="middle" fill="#a855f7" fontSize="10" fontWeight="bold">SEU COUNT</text>
          <text x="50" y="40" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">{seuCount}</text>
        </g>

        {/* Solar activity indicator */}
        <text x="380" y="20" fill={solarActivity === 'storm' ? '#ef4444' : solarActivity === 'moderate' ? '#f59e0b' : '#22c55e'} fontSize="10">
          Solar: {solarActivity.toUpperCase()}
        </text>
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
