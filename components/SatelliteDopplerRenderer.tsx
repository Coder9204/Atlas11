'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

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
              background: canGoNext ? 'linear-gradient(135deg, #06b6d4 0%, #22c55e 100%)' : '#1e293b',
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
    onGameEvent?.({ type: 'app_explored', data: { appIndex, appTitle: transferApps[appIndex].title } });
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

    // Wave compression/expansion visualization
    const waveSpacing = passProgress < 50 ? 15 - (50 - passProgress) * 0.1 : 15 + (passProgress - 50) * 0.1;

    return (
      <svg viewBox="0 0 500 350" className="w-full h-auto max-w-xl">
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a0a2e" />
            <stop offset="100%" stopColor="#1e3a5f" />
          </linearGradient>
          <radialGradient id="stationGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="500" height="350" fill="url(#skyGrad)" />

        {/* Stars */}
        {[...Array(15)].map((_, i) => (
          <circle
            key={i}
            cx={(i * 47 + 20) % 500}
            cy={(i * 17 + 10) % 150}
            r={Math.random() * 1 + 0.5}
            fill="white"
            opacity={0.5}
          />
        ))}

        {/* Ground */}
        <rect x="0" y="260" width="500" height="90" fill="#1a3a20" />
        <ellipse cx="250" cy="260" rx="250" ry="30" fill="#0f2915" />

        {/* Ground station */}
        <g transform="translate(250, 250)">
          <circle cx="0" cy="0" r="40" fill="url(#stationGlow)" />
          <rect x="-15" y="-5" width="30" height="25" fill="#374151" rx="2" />
          <path d="M0 -5 L-25 -35 L25 -35 Z" fill="#64748b" />
          <ellipse cx="0" cy="-40" rx="20" ry="8" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="2" />
          {/* Dish pointing at satellite */}
          <line
            x1="0"
            y1="-40"
            x2={(satX - 250) * 0.3}
            y2={(satY - 250) * 0.3 - 40}
            stroke="#22d3ee"
            strokeWidth="2"
            opacity="0.5"
          />
          <text x="0" y="35" textAnchor="middle" fill="#94a3b8" fontSize="9">Ground Station</text>
        </g>

        {/* Satellite */}
        <g transform={`translate(${satX}, ${satY})`}>
          <rect x="-12" y="-6" width="24" height="12" fill="#475569" stroke="#94a3b8" strokeWidth="1" />
          <rect x="-35" y="-3" width="20" height="6" fill="#3b82f6" />
          <rect x="15" y="-3" width="20" height="6" fill="#3b82f6" />
          <circle cx="0" cy="8" r="4" fill="#22d3ee" />

          {/* Orbit type label */}
          <text x="0" y="-15" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">
            {orbitType}
          </text>
        </g>

        {/* Signal waves from satellite to ground */}
        {isTracking && [...Array(5)].map((_, i) => {
          const waveY = satY + 30 + i * waveSpacing;
          if (waveY > 240) return null;
          return (
            <ellipse
              key={i}
              cx={satX - (satX - 250) * (i / 8)}
              cy={waveY + (250 - satY) * (i / 8)}
              rx={10 + i * 3}
              ry={4 + i * 1}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="1.5"
              opacity={1 - i * 0.15}
            />
          );
        })}

        {/* Direction arrow */}
        <g transform={`translate(${satX}, ${satY - 30})`}>
          <path
            d={passProgress < 50 ? "M -15 0 L 15 0 L 10 -5 M 15 0 L 10 5" : "M 15 0 L -15 0 L -10 -5 M -15 0 L -10 5"}
            stroke={passProgress < 50 ? '#22c55e' : '#ef4444'}
            strokeWidth="2"
            fill="none"
          />
          <text x="0" y="-10" textAnchor="middle" fill={passProgress < 50 ? '#22c55e' : '#ef4444'} fontSize="8">
            {passProgress < 50 ? 'Approaching' : 'Receding'}
          </text>
        </g>

        {/* Doppler status panel */}
        <g transform="translate(10, 10)">
          <rect x="0" y="0" width="160" height="130" fill="rgba(0,0,0,0.7)" rx="8" stroke="#334155" />
          <text x="80" y="18" textAnchor="middle" fill="#22d3ee" fontSize="11" fontWeight="bold">DOPPLER STATUS</text>

          <text x="10" y="38" fill="#94a3b8" fontSize="9">Tx Frequency:</text>
          <text x="150" y="38" textAnchor="end" fill="#f59e0b" fontSize="9">{doppler.txFreq} MHz</text>

          <text x="10" y="53" fill="#94a3b8" fontSize="9">Rx Frequency:</text>
          <text x="150" y="53" textAnchor="end" fill="#22d3ee" fontSize="9">{doppler.rxFreq} MHz</text>

          <line x1="10" y1="60" x2="150" y2="60" stroke="#475569" />

          <text x="10" y="75" fill="#94a3b8" fontSize="9">Doppler Shift:</text>
          <text x="150" y="75" textAnchor="end" fill={parseFloat(doppler.dopplerShift) > 0 ? '#ef4444' : parseFloat(doppler.dopplerShift) < 0 ? '#22c55e' : '#64748b'} fontSize="9" fontWeight="bold">
            {parseFloat(doppler.dopplerShift) > 0 ? '+' : ''}{doppler.dopplerShift} kHz
          </text>

          <text x="10" y="90" fill="#94a3b8" fontSize="9">Radial Velocity:</text>
          <text x="150" y="90" textAnchor="end" fill="#a855f7" fontSize="9">{doppler.radialVelocity} m/s</text>

          <text x="10" y="105" fill="#94a3b8" fontSize="9">Max Shift ({orbitType}):</text>
          <text x="150" y="105" textAnchor="end" fill="#f97316" fontSize="9">+/-{doppler.maxShift} kHz</text>

          <rect x="10" y="112" width="140" height="12" fill={isTracking ? '#22c55e' : '#ef4444'} rx="3" opacity="0.3" />
          <text x="80" y="122" textAnchor="middle" fill={isTracking ? '#22c55e' : '#ef4444'} fontSize="9" fontWeight="bold">
            {isTracking ? 'TRACKING' : 'LOST SIGNAL'}
          </text>
        </g>

        {/* Frequency spectrum visualization */}
        <g transform="translate(330, 10)">
          <rect x="0" y="0" width="160" height="80" fill="rgba(0,0,0,0.6)" rx="6" stroke="#334155" />
          <text x="80" y="15" textAnchor="middle" fill="#94a3b8" fontSize="9">FREQUENCY SPECTRUM</text>

          {/* Center frequency line */}
          <line x1="80" y1="25" x2="80" y2="70" stroke="#475569" strokeWidth="1" strokeDasharray="2" />
          <text x="80" y="78" textAnchor="middle" fill="#64748b" fontSize="7">Center</text>

          {/* Shifted signal */}
          <rect
            x={80 + parseFloat(doppler.dopplerShift) * 2 - 5}
            y="30"
            width="10"
            height="35"
            fill="#22d3ee"
            opacity="0.8"
          />
          <text x={80 + parseFloat(doppler.dopplerShift) * 2} y="25" textAnchor="middle" fill="#22d3ee" fontSize="7">Signal</text>
        </g>

        {/* Pass progress indicator */}
        <g transform="translate(10, 300)">
          <text x="0" y="0" fill="#94a3b8" fontSize="9">Pass Progress:</text>
          <rect x="80" y="-8" width="150" height="8" fill="#1e293b" rx="4" />
          <rect x="80" y="-8" width={passProgress * 1.5} height="8" fill="#22d3ee" rx="4" />
          <text x="240" y="0" fill="#22d3ee" fontSize="9">{passProgress.toFixed(0)}%</text>
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
        <label className="text-slate-300 text-sm block mb-2">Frequency: {frequency} MHz</label>
        <input
          type="range"
          min="400"
          max="12000"
          step="100"
          value={frequency}
          onChange={(e) => setFrequency(parseInt(e.target.value))}
          className="w-full"
        />
      </div>
      <div className="bg-slate-800/50 p-4 rounded-xl">
        <label className="text-slate-300 text-sm block mb-2">Pass Position: {passProgress.toFixed(0)}%</label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={passProgress}
          onChange={(e) => setPassProgress(parseInt(e.target.value))}
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

            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-green-200 bg-clip-text text-transparent">
              Why Do Satellite Signals Need Frequency Tracking?
            </h1>
            <p className="text-lg text-slate-400 max-w-xl mb-6">
              A satellite transmits at exactly 2.2000 GHz. But the ground station receives something different. What is happening?
            </p>

            <div className="bg-slate-800/60 rounded-2xl p-4 max-w-2xl border border-slate-700/50 mb-6">
              {renderVisualization()}
            </div>

            <button
              onClick={() => goToPhase('predict')}
              style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-green-600 text-white text-lg font-semibold rounded-2xl transition-all hover:scale-[1.02]"
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
              Watch the Doppler shift change as a satellite passes overhead. Compare LEO vs GEO!
            </p>

            <div className="bg-slate-800/60 rounded-2xl p-4 max-w-2xl border border-slate-700/50 mb-4">
              {renderVisualization()}
            </div>

            {renderControls()}

            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 max-w-lg mt-4">
              <p className="text-cyan-400 text-sm">
                <strong>Experiment:</strong> Compare the max Doppler shift for LEO vs GEO. Notice how GEO has almost no shift because it moves with Earth!
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
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">The Doppler Effect in Space</h2>

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
              {transferApps.map((app, index) => (
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
                  {completedApps.has(index) && '+ '}{app.short}
                </button>
              ))}
            </div>

            <div className="bg-gradient-to-r from-cyan-600 to-green-600 p-1 rounded-xl w-full max-w-2xl">
              <div className="bg-slate-900 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-2">{transferApps[activeAppTab].title}</h3>
                <p className="text-slate-300 mb-4">{transferApps[activeAppTab].description}</p>

                <div className="bg-slate-800/50 p-4 rounded-lg mb-4">
                  <h4 className="text-cyan-400 font-bold mb-2">Doppler Connection</h4>
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
                  className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-green-600 text-white font-bold rounded-xl"
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
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />

      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-cyan-400">Satellite Doppler</span>
          <div className="flex gap-1.5">
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-gradient-to-r from-cyan-400 to-green-400 w-6'
                    : i < currentIndex
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

export default SatelliteDopplerRenderer;
