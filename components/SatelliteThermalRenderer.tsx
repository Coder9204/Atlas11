'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

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
    const tempColor = parseInt(thermal.tempC) > 50 ? '#ef4444' : parseInt(thermal.tempC) < -20 ? '#3b82f6' : '#22c55e';

    return (
      <svg viewBox="0 0 500 350" className="w-full h-auto max-w-xl">
        <defs>
          <linearGradient id="spaceGradThermal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a0a1a" />
            <stop offset="100%" stopColor="#1a1a3a" />
          </linearGradient>
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="70%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="500" height="350" fill="url(#spaceGradThermal)" />

        {/* Stars */}
        {[...Array(20)].map((_, i) => (
          <circle
            key={i}
            cx={(i * 37 + 20) % 500}
            cy={(i * 23 + 10) % 350}
            r={Math.random() * 1.5 + 0.5}
            fill="white"
            opacity={0.5}
          />
        ))}

        {/* Sun */}
        {!inShadow && (
          <g transform={`translate(${60 + Math.sin(sunAngle * Math.PI / 180) * 10}, 80)`}>
            <circle cx="0" cy="0" r="50" fill="url(#sunGlow)" />
            <circle cx="0" cy="0" r="30" fill="#fcd34d" />
            {/* Sun rays */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
              <line
                key={angle}
                x1={Math.cos(angle * Math.PI / 180) * 35}
                y1={Math.sin(angle * Math.PI / 180) * 35}
                x2={Math.cos(angle * Math.PI / 180) * 55}
                y2={Math.sin(angle * Math.PI / 180) * 55}
                stroke="#fcd34d"
                strokeWidth="3"
                opacity="0.6"
              />
            ))}
          </g>
        )}

        {/* Earth shadow indicator */}
        {inShadow && (
          <g transform="translate(50, 175)">
            <text x="0" y="0" fill="#64748b" fontSize="12" fontWeight="bold">ECLIPSE</text>
            <circle cx="-20" cy="-5" r="40" fill="#1e3a5f" opacity="0.5" />
          </g>
        )}

        {/* Satellite body */}
        <g transform="translate(280, 150)">
          {/* MLI layers (gold foil look) */}
          <rect x="-40" y="-30" width="80" height="60" fill={tempColor} rx="4" opacity="0.3" />
          <rect x="-38" y="-28" width="76" height="56" fill="#b8860b" rx="3" opacity="0.6" />
          <rect x="-36" y="-26" width="72" height="52" fill="#ffd700" rx="2" opacity="0.4" />

          {/* Main body */}
          <rect x="-35" y="-25" width="70" height="50" fill="#374151" stroke="#94a3b8" strokeWidth="2" rx="2" />

          {/* Solar panels */}
          <rect x="-90" y="-15" width="50" height="30" fill="#1e40af" stroke="#3b82f6" strokeWidth="1" />
          <rect x="40" y="-15" width="50" height="30" fill="#1e40af" stroke="#3b82f6" strokeWidth="1" />
          {/* Panel grid lines */}
          {[1, 2, 3, 4].map(i => (
            <React.Fragment key={i}>
              <line x1={-90 + i * 10} y1="-15" x2={-90 + i * 10} y2="15" stroke="#3b82f6" strokeWidth="0.5" />
              <line x1={40 + i * 10} y1="-15" x2={40 + i * 10} y2="15" stroke="#3b82f6" strokeWidth="0.5" />
            </React.Fragment>
          ))}

          {/* Radiator (white surface) */}
          <rect x="15" y="-20" width="15" height="40" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
          <text x="22" y="30" textAnchor="middle" fill="#64748b" fontSize="7">RAD</text>

          {/* Louvers */}
          <g transform="translate(-25, -20)">
            {[0, 1, 2, 3, 4].map(i => (
              <rect
                key={i}
                x="0"
                y={i * 8}
                width="35"
                height="6"
                fill="#94a3b8"
                transform={`rotate(${(louversOpen / 100) * 30}, 17.5, ${i * 8 + 3})`}
              />
            ))}
          </g>
          <text x="-7" y="35" textAnchor="middle" fill="#64748b" fontSize="7">LOUVERS</text>

          {/* Heater indicator */}
          {heatersOn && (
            <circle cx="0" cy="0" r="8" fill="#ef4444" opacity="0.7">
              <animate attributeName="opacity" values="0.7;0.3;0.7" dur="1s" repeatCount="indefinite" />
            </circle>
          )}

          {/* Heat arrows from sun */}
          {!inShadow && (
            <>
              <path d="M -120 -50 L -45 -10" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrowOrange)" />
              <text x="-100" y="-55" fill="#f59e0b" fontSize="8">Solar: {thermal.qAbsorbed}W</text>
            </>
          )}

          {/* Radiation arrows out */}
          <path d="M 95 0 L 130 0" stroke="#3b82f6" strokeWidth="2" />
          <path d="M 0 35 L 0 60" stroke="#3b82f6" strokeWidth="2" />
          <text x="125" y="-10" fill="#3b82f6" fontSize="8">Radiated: {thermal.qRadiated}W</text>
        </g>

        {/* Thermal status panel */}
        <g transform="translate(10, 220)">
          <rect x="0" y="0" width="150" height="120" fill="rgba(0,0,0,0.7)" rx="8" stroke="#334155" />
          <text x="75" y="20" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="bold">THERMAL STATUS</text>

          <text x="10" y="40" fill="#94a3b8" fontSize="9">Solar Input:</text>
          <text x="140" y="40" textAnchor="end" fill="#fcd34d" fontSize="9">{thermal.qAbsorbed} W</text>

          <text x="10" y="55" fill="#94a3b8" fontSize="9">Internal Heat:</text>
          <text x="140" y="55" textAnchor="end" fill="#f97316" fontSize="9">{thermal.qInternal} W</text>

          <text x="10" y="70" fill="#94a3b8" fontSize="9">Heaters:</text>
          <text x="140" y="70" textAnchor="end" fill={heatersOn ? '#ef4444' : '#64748b'} fontSize="9">{thermal.qHeater} W</text>

          <line x1="10" y1="78" x2="140" y2="78" stroke="#475569" />

          <text x="10" y="93" fill="#94a3b8" fontSize="9">Temperature:</text>
          <text x="140" y="93" textAnchor="end" fill={tempColor} fontSize="10" fontWeight="bold">{thermal.tempC} C</text>

          <rect x="10" y="100" width="130" height="14" fill={tempColor} rx="3" opacity="0.3" />
          <text x="75" y="111" textAnchor="middle" fill={tempColor} fontSize="10" fontWeight="bold">{thermal.status}</text>
        </g>

        {/* Emissivity display */}
        <text x="380" y="320" textAnchor="middle" fill="#94a3b8" fontSize="9">
          Effective Emissivity: {thermal.effectiveEmissivity}
        </text>
      </svg>
    );
  };

  const renderControls = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <div className="bg-slate-800/50 p-4 rounded-xl">
        <label className="text-slate-300 text-sm block mb-2">Louvers: {louversOpen}% open</label>
        <input
          type="range"
          min="0"
          max="100"
          step="10"
          value={louversOpen}
          onChange={(e) => setLouversOpen(parseInt(e.target.value))}
          className="w-full"
        />
      </div>
      <div className="bg-slate-800/50 p-4 rounded-xl">
        <label className="text-slate-300 text-sm block mb-2">Surface Absorptivity: {absorptivity}</label>
        <input
          type="range"
          min="0.1"
          max="0.9"
          step="0.1"
          value={absorptivity}
          onChange={(e) => setAbsorptivity(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>
      <div className="bg-slate-800/50 p-4 rounded-xl flex items-center gap-4">
        <button
          onClick={() => setHeatersOn(!heatersOn)}
          style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
          className={`px-4 py-2 rounded-lg font-bold ${heatersOn ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`}
        >
          Heaters {heatersOn ? 'ON' : 'OFF'}
        </button>
      </div>
      <div className="bg-slate-800/50 p-4 rounded-xl flex items-center gap-4">
        <button
          onClick={() => setInShadow(!inShadow)}
          style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
          className={`px-4 py-2 rounded-lg font-bold ${inShadow ? 'bg-slate-900 text-blue-400' : 'bg-yellow-600 text-white'}`}
        >
          {inShadow ? 'In Eclipse' : 'In Sunlight'}
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
            <p className="text-lg text-slate-200 mb-6 text-center max-w-lg">
              A satellite in orbit generates 100 watts of internal heat from its electronics. Without any air around it, how does it get rid of this heat?
            </p>

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
            <h2 className="text-2xl font-bold text-orange-400 mb-6">The Physics of Space Thermal Control</h2>

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
            <div className="bg-slate-800 p-5 rounded-xl mb-6 max-w-lg">
              <p className="text-slate-200 text-center mb-4">
                Space is incredibly cold (-270 C background). You might think cooling is easy. But surprisingly...
              </p>
              <p className="text-xl text-purple-300 text-center font-bold">
                Why do satellites often need heaters in the freezing void of space?
              </p>
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
                      ? 'bg-gradient-to-r from-orange-600 to-yellow-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {completedApps.has(index) && '+ '}{app.short}
                </button>
              ))}
            </div>

            <div className="bg-gradient-to-r from-orange-600 to-yellow-600 p-1 rounded-xl w-full max-w-2xl">
              <div className="bg-slate-900 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-2">{transferApps[activeAppTab].title}</h3>
                <p className="text-slate-300 mb-4">{transferApps[activeAppTab].description}</p>

                <div className="bg-slate-800/50 p-4 rounded-lg mb-4">
                  <h4 className="text-orange-400 font-bold mb-2">Thermal Connection</h4>
                  <p className="text-slate-300 text-sm">{transferApps[activeAppTab].connection}</p>
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
                      const nextIncomplete = transferApps.findIndex((_, i) => !completedApps.has(i));
                      if (nextIncomplete !== -1) {
                        setActiveAppTab(nextIncomplete);
                      }
                    }}
                    style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg"
                  >
                    Next Application &rarr;
                  </button>
                )}
              </div>
            </div>

            <p className="text-slate-400 mt-4">Completed: {completedApps.size} / {transferApps.length}</p>

            {completedApps.size >= 3 && (
              <button
                onClick={() => goToPhase('test')}
                style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                className="mt-4 px-8 py-3 bg-gradient-to-r from-orange-600 to-yellow-600 text-white font-bold rounded-xl"
              >
                Take the Test
              </button>
            )}
          </div>
        );

      case 'test':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
            <h2 className="text-2xl font-bold text-orange-400 mb-6">Knowledge Test</h2>

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
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />

      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-medium text-orange-400">Thermal Control</span>
          <div className="flex gap-1.5">
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ WebkitTapHighlightColor: 'transparent', zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-gradient-to-r from-orange-400 to-yellow-400 w-6'
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

export default SatelliteThermalRenderer;
