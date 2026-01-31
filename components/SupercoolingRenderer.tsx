'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// SUPERCOOLING RENDERER - Game 139
// Physics: Water below freezing that stays liquid without nucleation sites
// Metastable liquid region on phase diagram, instant freezing upon seeding
// ============================================================================

interface SupercoolingRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const SupercoolingRenderer: React.FC<SupercoolingRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}) => {
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);

  // Game-specific state
  const [temperature, setTemperature] = useState(20);
  const [waterState, setWaterState] = useState<'liquid' | 'supercooled' | 'crystallizing' | 'frozen'>('liquid');
  const [crystalProgress, setCrystalProgress] = useState(0);
  const [seedAdded, setSeedAdded] = useState(false);
  const [seedPosition, setSeedPosition] = useState({ x: 150, y: 100 });
  const [crystalPoints, setCrystalPoints] = useState<{ x: number; y: number; size: number; id: number }[]>([]);
  const [animationFrame, setAnimationFrame] = useState(0);
  const crystalIdRef = useRef(0);

  // Twist state - sodium acetate hand warmer
  const [twistState, setTwistState] = useState<'solution' | 'triggered' | 'crystallized'>('solution');
  const [twistTemp, setTwistTemp] = useState(25);
  const [twistCrystalProgress, setTwistCrystalProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const lastClickRef = useRef(0);

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

  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete' | 'freeze') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      if (type === 'freeze') {
        // Crackling freeze sound
        const bufferSize = audioContext.sampleRate * 0.5;
        const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 0.3) * 0.4;
        }
        const noise = audioContext.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;
        noise.connect(filter);
        filter.connect(audioContext.destination);
        noise.start();
        return;
      }

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
  }, []);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame((f) => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Crystallization effect when seed is added
  useEffect(() => {
    if (waterState !== 'crystallizing') return;

    const interval = setInterval(() => {
      setCrystalProgress(prev => {
        if (prev >= 100) {
          setWaterState('frozen');
          return 100;
        }
        return prev + 3;
      });

      // Add crystal points spreading from seed
      if (crystalProgress < 100) {
        const angle = Math.random() * Math.PI * 2;
        const distance = crystalProgress * 1.5 + Math.random() * 20;
        setCrystalPoints(prev => [
          ...prev.slice(-100),
          {
            x: seedPosition.x + Math.cos(angle) * distance,
            y: seedPosition.y + Math.sin(angle) * distance,
            size: 3 + Math.random() * 6,
            id: crystalIdRef.current++
          }
        ]);
      }
    }, 80);

    return () => clearInterval(interval);
  }, [waterState, crystalProgress, seedPosition]);

  // Twist crystallization effect
  useEffect(() => {
    if (twistState !== 'triggered') return;

    const interval = setInterval(() => {
      setTwistCrystalProgress(prev => {
        if (prev >= 100) {
          setTwistState('crystallized');
          return 100;
        }
        return prev + 2;
      });

      // Heat release during crystallization
      setTwistTemp(prev => Math.min(54, prev + 0.5));
    }, 100);

    return () => clearInterval(interval);
  }, [twistState, twistCrystalProgress]);

  // Temperature change handler
  const handleTemperatureChange = useCallback((newTemp: number) => {
    setTemperature(newTemp);

    if (newTemp < 0 && waterState === 'liquid') {
      setWaterState('supercooled');
    } else if (newTemp >= 0 && (waterState === 'supercooled')) {
      setWaterState('liquid');
    }
  }, [waterState]);

  // Add nucleation seed
  const addSeed = useCallback(() => {
    if (waterState !== 'supercooled') return;
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;

    setSeedAdded(true);
    setSeedPosition({ x: 150, y: 100 });
    playSound('freeze');

    setTimeout(() => {
      setWaterState('crystallizing');
      setCrystalProgress(0);
      setCrystalPoints([]);
    }, 300);
  }, [waterState, playSound]);

  // Reset experiment
  const resetExperiment = useCallback(() => {
    setTemperature(20);
    setWaterState('liquid');
    setCrystalProgress(0);
    setSeedAdded(false);
    setCrystalPoints([]);
    playSound('click');
  }, [playSound]);

  // Reset twist
  const resetTwist = useCallback(() => {
    setTwistState('solution');
    setTwistTemp(25);
    setTwistCrystalProgress(0);
    playSound('click');
  }, [playSound]);

  // Trigger twist crystallization
  const triggerTwist = useCallback(() => {
    if (twistState !== 'solution') return;
    setTwistState('triggered');
    playSound('freeze');
  }, [twistState, playSound]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    if (prediction === 'C') {
      playSound('success');
      onCorrectAnswer?.();
    } else {
      playSound('failure');
      onIncorrectAnswer?.();
    }
  }, [playSound, onCorrectAnswer, onIncorrectAnswer]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    if (prediction === 'B') {
      playSound('success');
      onCorrectAnswer?.();
    } else {
      playSound('failure');
      onIncorrectAnswer?.();
    }
  }, [playSound, onCorrectAnswer, onIncorrectAnswer]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
  }, []);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
  }, [playSound]);

  // Get water color based on state
  const getWaterColor = (state: string): string => {
    switch (state) {
      case 'liquid': return '#3b82f6';
      case 'supercooled': return '#06b6d4';
      case 'crystallizing': return '#60a5fa';
      case 'frozen': return '#e0f2fe';
      default: return '#3b82f6';
    }
  };

  const testQuestions = [
    { question: "What is supercooling?", options: [
      { text: "Extremely cold freezing", correct: false },
      { text: "A liquid cooled below its freezing point without solidifying", correct: true },
      { text: "Rapid cooling process", correct: false },
      { text: "Cooling with superconductors", correct: false }
    ]},
    { question: "Why can water stay liquid below 0C?", options: [
      { text: "It's a different type of water", correct: false },
      { text: "Without nucleation sites, ice crystals can't form", correct: true },
      { text: "Water doesn't freeze at 0C", correct: false },
      { text: "The thermometer is wrong", correct: false }
    ]},
    { question: "What triggers instant freezing in supercooled water?", options: [
      { text: "More cooling", correct: false },
      { text: "Adding salt", correct: false },
      { text: "A nucleation site (like a seed crystal or impurity)", correct: true },
      { text: "Shaking violently", correct: false }
    ]},
    { question: "The freezing point on a phase diagram represents:", options: [
      { text: "The coldest a liquid can get", correct: false },
      { text: "Temperature where solid and liquid phases are in equilibrium", correct: true },
      { text: "When water becomes a gas", correct: false },
      { text: "Maximum supercooling", correct: false }
    ]},
    { question: "A 'metastable' state means:", options: [
      { text: "Completely stable", correct: false },
      { text: "Temporarily stable but can change with a small trigger", correct: true },
      { text: "Completely unstable", correct: false },
      { text: "Cannot change state", correct: false }
    ]},
    { question: "When supercooled water freezes, it releases:", options: [
      { text: "Energy (latent heat)", correct: true },
      { text: "Bubbles", correct: false },
      { text: "Sound waves only", correct: false },
      { text: "Nothing", correct: false }
    ]},
    { question: "Supercooled water is most likely to freeze spontaneously:", options: [
      { text: "At exactly 0C", correct: false },
      { text: "At around -40C (homogeneous nucleation limit)", correct: true },
      { text: "At any temperature below 0C", correct: false },
      { text: "Never without a seed", correct: false }
    ]},
    { question: "Which of these would trigger nucleation?", options: [
      { text: "Adding more water", correct: false },
      { text: "Heating the water", correct: false },
      { text: "Tapping the container or adding an ice crystal", correct: true },
      { text: "Covering the container", correct: false }
    ]},
    { question: "In nature, supercooled clouds produce:", options: [
      { text: "Normal rain", correct: false },
      { text: "Freezing rain and ice storms", correct: true },
      { text: "Only snow", correct: false },
      { text: "No precipitation", correct: false }
    ]},
    { question: "Reusable hand warmers using sodium acetate exploit:", options: [
      { text: "Chemical combustion", correct: false },
      { text: "Supercooling and triggered crystallization", correct: true },
      { text: "Nuclear reactions", correct: false },
      { text: "Electric heating", correct: false }
    ]}
  ];

  const calculateScore = () => testAnswers.reduce((score, answer, index) => {
    if (answer !== null && testQuestions[index].options[answer].correct) {
      return score + 1;
    }
    return score;
  }, 0);

  const applications = [
    {
      title: "Ice Cream Making",
      icon: "🍦",
      description: "Premium ice cream uses supercooling to create smaller ice crystals, resulting in smoother texture. Rapid freezing with liquid nitrogen achieves extreme supercooling.",
      details: "The faster the freezing, the smaller the crystals. Artisanal ice cream makers manipulate this for texture control."
    },
    {
      title: "Weather & Aviation",
      icon: "✈️",
      description: "Supercooled water droplets in clouds cause dangerous aircraft icing. When disturbed by aircraft wings, they freeze instantly.",
      details: "Aircraft de-icing systems are critical because supercooled droplets can freeze on contact with cold surfaces, adding dangerous weight and disrupting airflow."
    },
    {
      title: "Cryopreservation",
      icon: "🧬",
      description: "Biological samples use controlled supercooling and cryoprotectants to minimize ice crystal damage during freezing.",
      details: "Sperm, eggs, embryos, and organs are preserved by avoiding large ice crystals that would rupture cell membranes."
    },
    {
      title: "Sodium Acetate Hand Warmers",
      icon: "🔥",
      description: "Reusable hand warmers contain supersaturated sodium acetate solution. A metal disc triggers crystallization, releasing latent heat instantly.",
      details: "The crystallization releases 264 kJ/kg, heating the pack to 54C. Boiling resets the metastable liquid state."
    }
  ];

  // Render phase diagram
  const renderPhaseDiagram = () => {
    const tempX = (temperature + 50) / 150 * 220 + 50; // Map -50 to 100C to x position

    return (
      <svg viewBox="0 0 300 200" style={{ width: '100%', maxWidth: '300px' }}>
        {/* Background */}
        <rect width="300" height="200" fill="#1e293b" rx="8" />

        {/* Axes */}
        <line x1="50" y1="170" x2="280" y2="170" stroke="#64748b" strokeWidth="2" />
        <line x1="50" y1="30" x2="50" y2="170" stroke="#64748b" strokeWidth="2" />

        {/* Labels */}
        <text x="165" y="195" fontSize="10" fill="#94a3b8" textAnchor="middle">Temperature (C)</text>
        <text x="15" y="100" fontSize="10" fill="#94a3b8" textAnchor="middle" transform="rotate(-90, 15, 100)">Pressure</text>

        {/* Phase regions */}
        {/* Solid region */}
        <path d="M 50 30 L 50 170 L 110 170 L 110 80 L 50 30" fill="rgba(147, 197, 253, 0.3)" />
        <text x="70" y="120" fontSize="11" fill="#93c5fd" fontWeight="bold">SOLID</text>

        {/* Liquid region */}
        <path d="M 110 80 L 110 170 L 200 170 L 200 50 L 110 80" fill="rgba(59, 130, 246, 0.3)" />
        <text x="150" y="100" fontSize="11" fill="#3b82f6" fontWeight="bold">LIQUID</text>

        {/* Gas region */}
        <path d="M 200 50 L 200 170 L 280 170 L 280 30 L 200 50" fill="rgba(34, 197, 94, 0.3)" />
        <text x="240" y="100" fontSize="11" fill="#22c55e" fontWeight="bold">GAS</text>

        {/* Metastable supercooled region (highlighted) */}
        <path d="M 50 170 L 110 170 L 110 130 L 70 130 L 50 170" fill="rgba(6, 182, 212, 0.4)" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4" />
        <text x="80" y="155" fontSize="8" fill="#06b6d4" fontWeight="bold">SUPERCOOLED</text>

        {/* Phase boundaries */}
        <line x1="110" y1="80" x2="110" y2="170" stroke="#f97316" strokeWidth="2" />
        <line x1="110" y1="80" x2="200" y2="50" stroke="#f97316" strokeWidth="2" />

        {/* Freezing point marker */}
        <line x1="110" y1="165" x2="110" y2="175" stroke="#ef4444" strokeWidth="2" />
        <text x="110" y="185" fontSize="9" fill="#ef4444" textAnchor="middle">0C</text>

        {/* Current state indicator */}
        <circle cx={Math.min(Math.max(tempX, 55), 275)} cy={130} r="6" fill="#fbbf24" stroke="white" strokeWidth="2">
          <animate attributeName="r" values="6;8;6" dur="1s" repeatCount="indefinite" />
        </circle>
        <text x={Math.min(Math.max(tempX, 55), 275)} y={118} fontSize="9" fill="#fbbf24" textAnchor="middle" fontWeight="bold">
          {temperature}C
        </text>

        {/* Legend */}
        <rect x="205" y="75" width="8" height="8" fill="rgba(6, 182, 212, 0.4)" stroke="#06b6d4" />
        <text x="218" y="82" fontSize="8" fill="#94a3b8">Metastable</text>
      </svg>
    );
  };

  // Render water container
  const renderWaterContainer = () => {
    const waterColor = getWaterColor(waterState);

    return (
      <svg viewBox="0 0 300 250" style={{ width: '100%', maxWidth: '300px' }}>
        {/* Background */}
        <rect width="300" height="250" fill="#0f172a" rx="8" />

        {/* Container */}
        <path
          d="M 70 50 L 70 180 Q 70 200 90 200 L 210 200 Q 230 200 230 180 L 230 50"
          fill="none"
          stroke="#64748b"
          strokeWidth="4"
        />

        {/* Water - different appearance based on state */}
        <rect
          x="74"
          y="70"
          width="152"
          height="126"
          fill={waterColor}
          opacity={waterState === 'frozen' ? 0.9 : 0.6}
          rx="2"
        />

        {/* Liquid shimmer for liquid/supercooled states */}
        {(waterState === 'liquid' || waterState === 'supercooled') && (
          <>
            <ellipse
              cx={150 + Math.sin(animationFrame / 15) * 20}
              cy={110}
              rx={40}
              ry={15}
              fill="rgba(255,255,255,0.15)"
            />
            <ellipse
              cx={140}
              cy={150 + Math.cos(animationFrame / 20) * 10}
              rx={30}
              ry={10}
              fill="rgba(255,255,255,0.1)"
            />
          </>
        )}

        {/* Crystal growth during crystallization */}
        {(waterState === 'crystallizing' || waterState === 'frozen') && (
          <g>
            {crystalPoints.map(cp => (
              <polygon
                key={cp.id}
                points={`${cp.x},${cp.y - cp.size} ${cp.x + cp.size * 0.866},${cp.y - cp.size / 2} ${cp.x + cp.size * 0.866},${cp.y + cp.size / 2} ${cp.x},${cp.y + cp.size} ${cp.x - cp.size * 0.866},${cp.y + cp.size / 2} ${cp.x - cp.size * 0.866},${cp.y - cp.size / 2}`}
                fill="rgba(255,255,255,0.8)"
                stroke="#bfdbfe"
                strokeWidth="0.5"
              />
            ))}

            {/* Crystallization front */}
            {waterState === 'crystallizing' && (
              <circle
                cx={seedPosition.x}
                cy={seedPosition.y}
                r={crystalProgress * 1.5}
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="3"
              />
            )}
          </g>
        )}

        {/* Seed crystal indicator */}
        {seedAdded && waterState !== 'liquid' && (
          <g transform={`translate(${seedPosition.x}, ${seedPosition.y})`}>
            <circle r="4" fill="#fbbf24" />
            <text y="-10" textAnchor="middle" fontSize="8" fill="#fbbf24">SEED</text>
          </g>
        )}

        {/* Ice pattern overlay for frozen state */}
        {waterState === 'frozen' && (
          <g opacity="0.3">
            {[...Array(6)].map((_, i) => (
              <path
                key={i}
                d={`M ${90 + i * 25} 80 L ${90 + i * 25} 190`}
                stroke="white"
                strokeWidth="1"
              />
            ))}
            {[...Array(5)].map((_, i) => (
              <path
                key={i}
                d={`M 80 ${90 + i * 25} L 220 ${90 + i * 25}`}
                stroke="white"
                strokeWidth="1"
              />
            ))}
          </g>
        )}

        {/* Temperature display */}
        <g transform="translate(255, 80)">
          <rect x="-20" y="0" width="40" height="100" fill="#1f2937" stroke="#374151" rx="4" />
          <rect
            x="-15"
            y={100 - Math.max(0, (temperature + 50) / 150) * 90}
            width="30"
            height={Math.max(5, (temperature + 50) / 150 * 90)}
            fill={temperature < 0 ? '#06b6d4' : '#ef4444'}
            rx="2"
          />
          <text x="0" y="-10" textAnchor="middle" fontSize="14" fill="#e2e8f0" fontWeight="bold">
            {temperature}C
          </text>
          <line x1="-20" y1={100 - (50 / 150) * 90} x2="20" y2={100 - (50 / 150) * 90} stroke="#ef4444" strokeWidth="2" strokeDasharray="2" />
          <text x="0" y={105 - (50 / 150) * 90} fontSize="8" fill="#ef4444" textAnchor="middle">0C</text>
        </g>

        {/* State label */}
        <text x="150" y="225" textAnchor="middle" fontSize="12" fill="#e2e8f0" fontWeight="bold">
          {waterState === 'liquid' ? 'LIQUID WATER' :
            waterState === 'supercooled' ? 'SUPERCOOLED (Metastable!)' :
              waterState === 'crystallizing' ? `CRYSTALLIZING... ${crystalProgress.toFixed(0)}%` :
                'FROZEN SOLID'}
        </text>
        <text x="150" y="240" textAnchor="middle" fontSize="10" fill={waterState === 'supercooled' ? '#f59e0b' : '#94a3b8'}>
          {waterState === 'supercooled' ? 'Add a seed to trigger freezing!' : ''}
        </text>
      </svg>
    );
  };

  // Render sodium acetate hand warmer for twist
  const renderSodiumAcetateWarmer = () => {
    return (
      <svg viewBox="0 0 300 200" style={{ width: '100%', maxWidth: '300px' }}>
        {/* Background */}
        <rect width="300" height="200" fill="#1e293b" rx="8" />

        {/* Hand warmer pouch */}
        <ellipse
          cx="150"
          cy="100"
          rx="100"
          ry="60"
          fill={twistState === 'solution' ? '#60a5fa' : twistState === 'triggered' ? '#fbbf24' : '#94a3b8'}
          opacity="0.8"
          stroke="#64748b"
          strokeWidth="3"
        />

        {/* Solution shimmer */}
        {twistState === 'solution' && (
          <>
            <ellipse
              cx={130 + Math.sin(animationFrame / 15) * 10}
              cy={90}
              rx={40}
              ry={20}
              fill="rgba(255,255,255,0.2)"
            />
          </>
        )}

        {/* Crystal growth */}
        {(twistState === 'triggered' || twistState === 'crystallized') && (
          <g>
            {[...Array(Math.floor(twistCrystalProgress / 5))].map((_, i) => {
              const angle = (i / 20) * Math.PI * 2;
              const dist = 10 + i * 2;
              const x = 150 + Math.cos(angle) * dist;
              const y = 100 + Math.sin(angle) * dist * 0.6;
              return (
                <polygon
                  key={i}
                  points={`${x},${y - 4} ${x + 3.5},${y - 2} ${x + 3.5},${y + 2} ${x},${y + 4} ${x - 3.5},${y + 2} ${x - 3.5},${y - 2}`}
                  fill="rgba(255,255,255,0.7)"
                />
              );
            })}
          </g>
        )}

        {/* Metal disc trigger */}
        <g transform="translate(150, 100)">
          <circle
            r="15"
            fill={twistState === 'solution' ? '#475569' : '#64748b'}
            stroke="#94a3b8"
            strokeWidth="2"
            style={{ cursor: twistState === 'solution' ? 'pointer' : 'default' }}
            onMouseDown={twistState === 'solution' ? triggerTwist : undefined}
          />
          <circle r="10" fill="none" stroke="#94a3b8" strokeWidth="1" />
          <circle r="5" fill="#94a3b8" />
        </g>

        {/* Temperature display */}
        <text x="255" y="90" textAnchor="middle" fontSize="20" fill="#e2e8f0" fontWeight="bold">
          {twistTemp.toFixed(0)}C
        </text>
        <text x="255" y="110" textAnchor="middle" fontSize="10" fill="#94a3b8">
          Temperature
        </text>

        {/* Heat waves if heating */}
        {twistState === 'triggered' && (
          <g>
            {[0, 1, 2].map(i => {
              const y = 30 - (animationFrame + i * 15) % 30;
              return (
                <path
                  key={i}
                  d={`M ${130 + i * 20} ${40 - y} Q ${140 + i * 20} ${35 - y} ${130 + i * 20} ${30 - y}`}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="2"
                  opacity={1 - y / 30}
                />
              );
            })}
          </g>
        )}

        {/* State label */}
        <text x="150" y="175" textAnchor="middle" fontSize="11" fill="#e2e8f0" fontWeight="bold">
          {twistState === 'solution' ? 'Supersaturated Solution (Click disc!)' :
            twistState === 'triggered' ? `Crystallizing... ${twistCrystalProgress.toFixed(0)}%` :
              'Crystallized (54C) - Releasing Heat!'}
        </text>
      </svg>
    );
  };

  // Fixed footer navigation
  const renderFooter = (canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      minHeight: '72px',
      background: 'rgba(30, 41, 59, 0.98)',
      borderTop: '1px solid rgba(148, 163, 184, 0.2)',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
      padding: '16px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ color: '#94a3b8', fontSize: '14px' }}>
        Supercooling
      </div>
      <button
        onClick={onPhaseComplete}
        disabled={!canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? 'linear-gradient(to right, #06b6d4, #0891b2)' : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : '#64748b',
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px'
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // Render hook phase
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '600px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            borderRadius: '9999px',
            marginBottom: '32px'
          }}>
            <span style={{ width: '8px', height: '8px', background: '#06b6d4', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#06b6d4', letterSpacing: '0.05em' }}>PHASE PHYSICS</span>
          </div>

          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '16px',
            background: 'linear-gradient(to right, #ffffff, #67e8f9, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Can Water Be Below 0C and Not Freeze?
          </h1>

          <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '500px', marginBottom: '40px' }}>
            Discover the mysterious world of supercooled liquids
          </p>

          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8))',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '560px',
            width: '100%',
            border: '1px solid rgba(71, 85, 105, 0.5)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ fontSize: '60px', marginBottom: '24px' }}>
              💧 ❄️ → 🤔
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.9)', fontWeight: '500', lineHeight: '1.6' }}>
                Pure water can be cooled to <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>-40C</span> and still remain liquid!
              </p>
              <p style={{ fontSize: '16px', color: '#94a3b8', lineHeight: '1.6' }}>
                It's waiting... perfectly still... until something tiny disturbs it. Then INSTANT ice!
              </p>
              <p style={{ fontSize: '16px', color: '#f59e0b', fontWeight: '600' }}>
                What keeps it liquid below freezing? And what triggers the freeze?
              </p>
            </div>
          </div>

          <div style={{ marginTop: '48px', display: 'flex', alignItems: 'center', gap: '32px', fontSize: '14px', color: '#64748b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#06b6d4' }}>✦</span>
              Phase Diagrams
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#06b6d4' }}>✦</span>
              Nucleation Triggers
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#06b6d4' }}>✦</span>
              Real Applications
            </div>
          </div>
        </div>
        {renderFooter(true, 'Make a Prediction →')}
      </div>
    );
  }

  // Render predict phase
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>Make Your Prediction</h2>
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '640px', marginBottom: '24px' }}>
            <p style={{ fontSize: '18px', color: '#cbd5e1', marginBottom: '16px' }}>
              You carefully cool very pure water below 0C. It stays liquid! Now you drop a tiny ice crystal into it.
            </p>
            <p style={{ fontSize: '18px', color: '#06b6d4', fontWeight: '500' }}>
              What happens?
            </p>
          </div>
          <div style={{ display: 'grid', gap: '12px', width: '100%', maxWidth: '560px' }}>
            {[
              { id: 'A', text: 'Nothing - the ice crystal just melts' },
              { id: 'B', text: 'The water slowly starts to freeze from the bottom' },
              { id: 'C', text: 'Instant freezing spreads rapidly from the crystal' },
              { id: 'D', text: 'The water temperature rises to exactly 0C' }
            ].map(option => (
              <button
                key={option.id}
                onMouseDown={(e) => { e.preventDefault(); handlePrediction(option.id); }}
                disabled={showPredictionFeedback}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  textAlign: 'left',
                  transition: 'all 0.3s',
                  background: showPredictionFeedback && selectedPrediction === option.id
                    ? option.id === 'C' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
                    : showPredictionFeedback && option.id === 'C' ? 'rgba(16, 185, 129, 0.4)'
                    : 'rgba(51, 65, 85, 0.5)',
                  border: showPredictionFeedback && selectedPrediction === option.id
                    ? option.id === 'C' ? '2px solid #10b981' : '2px solid #ef4444'
                    : showPredictionFeedback && option.id === 'C' ? '2px solid #10b981'
                    : '2px solid transparent',
                  cursor: showPredictionFeedback ? 'default' : 'pointer',
                  color: '#e2e8f0'
                }}
              >
                <span style={{ fontWeight: 'bold', color: 'white' }}>{option.id}.</span>
                <span style={{ marginLeft: '8px' }}>{option.text}</span>
              </button>
            ))}
          </div>
          {showPredictionFeedback && (
            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', maxWidth: '560px' }}>
              <p style={{ color: '#10b981', fontWeight: '600' }}>
                Correct! The ice crystal provides a "nucleation site" - a template for other water molecules to attach to. Freezing spreads like a chain reaction, releasing latent heat!
              </p>
            </div>
          )}
        </div>
        {renderFooter(showPredictionFeedback, 'Try It Yourself →')}
      </div>
    );
  }

  // Render play phase
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>Supercooling Lab</h2>
          <p style={{ color: '#94a3b8', marginBottom: '16px' }}>Cool the water below 0C, then add a seed crystal!</p>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* Water container */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px' }}>
              {renderWaterContainer()}

              {/* Controls */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ color: '#94a3b8', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                  Temperature: {temperature}C
                </label>
                <input
                  type="range"
                  min="-40"
                  max="20"
                  value={temperature}
                  onChange={(e) => handleTemperatureChange(parseInt(e.target.value))}
                  disabled={waterState === 'crystallizing' || waterState === 'frozen'}
                  style={{ width: '100%', accentColor: '#06b6d4' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                  <span>-40C</span>
                  <span style={{ color: '#ef4444' }}>0C (Freezing)</span>
                  <span>20C</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  onMouseDown={(e) => { e.preventDefault(); addSeed(); }}
                  disabled={waterState !== 'supercooled'}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: waterState !== 'supercooled' ? 'not-allowed' : 'pointer',
                    background: waterState === 'supercooled' ? 'linear-gradient(to right, #f59e0b, #d97706)' : '#475569',
                    color: waterState === 'supercooled' ? 'white' : '#94a3b8'
                  }}
                >
                  ❄️ Add Seed Crystal
                </button>
                <button
                  onMouseDown={(e) => { e.preventDefault(); resetExperiment(); }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    background: '#374151',
                    color: 'white'
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Phase diagram */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px' }}>
              <h3 style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '12px', textAlign: 'center' }}>Phase Diagram</h3>
              {renderPhaseDiagram()}
            </div>
          </div>

          {/* Explanation */}
          <div style={{
            marginTop: '24px',
            padding: '16px',
            borderRadius: '12px',
            background: waterState === 'supercooled' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(30, 41, 59, 0.5)',
            border: waterState === 'supercooled' ? '2px solid #06b6d4' : '2px solid transparent',
            maxWidth: '640px',
            width: '100%'
          }}>
            {waterState === 'liquid' && (
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                Water is above 0C - stable liquid state. Cool it below freezing to see supercooling!
              </p>
            )}
            {waterState === 'supercooled' && (
              <p style={{ color: '#06b6d4', fontSize: '14px' }}>
                <strong>Supercooled!</strong> The water is below freezing but has no nucleation sites for ice crystals to form. It's metastable - add a seed to trigger instant freezing!
              </p>
            )}
            {waterState === 'crystallizing' && (
              <p style={{ color: '#f59e0b', fontSize: '14px' }}>
                <strong>Crystallization cascade!</strong> Ice crystals are spreading from the seed point. Each new crystal provides more nucleation sites!
              </p>
            )}
            {waterState === 'frozen' && (
              <p style={{ color: '#93c5fd', fontSize: '14px' }}>
                <strong>Frozen solid!</strong> The water released latent heat (334 J/g) during crystallization. Notice it happened almost instantly!
              </p>
            )}
          </div>
        </div>
        {renderFooter(true, 'Learn the Science →')}
      </div>
    );
  }

  // Render review phase
  if (phase === 'review') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>The Science of Supercooling</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '900px' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(34, 211, 238, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#06b6d4', marginBottom: '12px' }}>What is Supercooling?</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                Supercooling occurs when a liquid is cooled below its freezing point without solidifying. The liquid is in a <strong>metastable state</strong> - it "wants" to freeze but can't start without help.
              </p>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 179, 8, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f97316', marginBottom: '12px' }}>Nucleation Sites</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                Ice formation needs a "seed" - a surface for molecules to organize into crystal structure. This can be: an existing ice crystal, dust particles, container scratches, or vibrations.
              </p>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(147, 197, 253, 0.2), rgba(96, 165, 250, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(147, 197, 253, 0.3)', gridColumn: 'span 2' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#93c5fd', marginBottom: '12px' }}>The Phase Diagram</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '12px' }}>
                The equilibrium phase diagram shows where each state is <strong>thermodynamically stable</strong>. Below 0C, ice is stable and liquid is not - but liquid can persist in the <strong>metastable supercooled region</strong>.
              </p>
              <p style={{ color: '#94a3b8', fontSize: '13px' }}>
                At -40C, water will freeze spontaneously even without seeds (homogeneous nucleation limit).
              </p>
            </div>
          </div>
        </div>
        {renderFooter(true, 'Discover a Twist →')}
      </div>
    );
  }

  // Render twist predict phase
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '24px' }}>The Hand Warmer Twist</h2>
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '640px', marginBottom: '24px' }}>
            <p style={{ fontSize: '18px', color: '#cbd5e1', marginBottom: '16px' }}>
              Reusable hand warmers contain sodium acetate solution that can be supercooled (actually "supersaturated").
              When you click the metal disc, crystals form instantly and the pack heats to 54C!
            </p>
            <p style={{ fontSize: '18px', color: '#f59e0b', fontWeight: '500' }}>
              Where does the heat come from?
            </p>
          </div>
          <div style={{ display: 'grid', gap: '12px', width: '100%', maxWidth: '560px' }}>
            {[
              { id: 'A', text: 'A battery hidden inside the pack' },
              { id: 'B', text: 'Latent heat released during crystallization' },
              { id: 'C', text: 'Chemical reaction with air' },
              { id: 'D', text: 'Friction from the metal disc clicking' }
            ].map(option => (
              <button
                key={option.id}
                onMouseDown={(e) => { e.preventDefault(); handleTwistPrediction(option.id); }}
                disabled={showTwistFeedback}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  textAlign: 'left',
                  transition: 'all 0.3s',
                  background: showTwistFeedback && twistPrediction === option.id
                    ? option.id === 'B' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
                    : showTwistFeedback && option.id === 'B' ? 'rgba(16, 185, 129, 0.4)'
                    : 'rgba(51, 65, 85, 0.5)',
                  border: showTwistFeedback && twistPrediction === option.id
                    ? option.id === 'B' ? '2px solid #10b981' : '2px solid #ef4444'
                    : showTwistFeedback && option.id === 'B' ? '2px solid #10b981'
                    : '2px solid transparent',
                  cursor: showTwistFeedback ? 'default' : 'pointer',
                  color: '#e2e8f0'
                }}
              >
                <span style={{ fontWeight: 'bold', color: 'white' }}>{option.id}.</span>
                <span style={{ marginLeft: '8px' }}>{option.text}</span>
              </button>
            ))}
          </div>
          {showTwistFeedback && (
            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', maxWidth: '560px' }}>
              <p style={{ color: '#10b981', fontWeight: '600' }}>
                Correct! Crystallization releases latent heat (264 kJ/kg for sodium acetate). The supercooled/supersaturated state stores this energy, releasing it when crystals form!
              </p>
            </div>
          )}
        </div>
        {renderFooter(showTwistFeedback, 'Try the Hand Warmer →')}
      </div>
    );
  }

  // Render twist play phase
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '16px' }}>Sodium Acetate Hand Warmer</h2>
          <p style={{ color: '#94a3b8', marginBottom: '16px' }}>Click the metal disc to trigger crystallization!</p>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
            {renderSodiumAcetateWarmer()}

            <button
              onMouseDown={(e) => { e.preventDefault(); resetTwist(); }}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                background: '#374151',
                color: 'white'
              }}
            >
              Reset (Simulates boiling)
            </button>
          </div>

          <div style={{
            padding: '16px',
            borderRadius: '12px',
            background: twistState === 'crystallized' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(30, 41, 59, 0.5)',
            border: twistState === 'crystallized' ? '2px solid #f97316' : '2px solid transparent',
            maxWidth: '500px',
            width: '100%'
          }}>
            {twistState === 'solution' && (
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                The supersaturated sodium acetate solution is stable at room temperature. It "wants" to crystallize but needs a trigger!
              </p>
            )}
            {twistState === 'triggered' && (
              <p style={{ color: '#f59e0b', fontSize: '14px' }}>
                Crystallization spreads rapidly! The latent heat of fusion (264 kJ/kg) is being released, heating the solution!
              </p>
            )}
            {twistState === 'crystallized' && (
              <p style={{ color: '#f97316', fontSize: '14px' }}>
                <strong>54C!</strong> The hand warmer is now hot and will stay warm for 30-60 minutes. Boiling it will redissolve the crystals and reset it.
              </p>
            )}
          </div>
        </div>
        {renderFooter(true, 'See Full Explanation →')}
      </div>
    );
  }

  // Render twist review phase
  if (phase === 'twist_review') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '24px' }}>Supercooling in Action: Hand Warmers</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '900px' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(6, 182, 212, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#60a5fa', marginBottom: '12px' }}>Supersaturation = Supercooling for Solutions</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                Sodium acetate dissolves much better in hot water than cold. When cooled, the solution holds MORE solute than it "should" - it's supersaturated, similar to how supercooled water is below its freezing point.
              </p>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 179, 8, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#f97316', marginBottom: '12px' }}>The Metal Disc Trigger</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                The disc is a convex piece of metal. When clicked, it creates tiny crystal nuclei that trigger the chain reaction. Each crystal creates more nucleation sites!
              </p>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(20, 184, 166, 0.2))', borderRadius: '16px', padding: '24px', border: '1px solid rgba(16, 185, 129, 0.3)', gridColumn: 'span 2' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981', marginBottom: '12px' }}>Reusability</h3>
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                Unlike chemical hand warmers that oxidize iron irreversibly, sodium acetate hand warmers can be reset! Boiling the crystallized pack redissolves the crystals. When cooled carefully (no vibrations!), it returns to the supersaturated state - ready to use again!
              </p>
            </div>
          </div>
        </div>
        {renderFooter(true, 'Explore Applications →')}
      </div>
    );
  }

  // Render transfer phase
  if (phase === 'transfer') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>Real-World Applications</h2>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {applications.map((app, index) => (
              <button
                key={index}
                onMouseDown={(e) => { e.preventDefault(); setActiveAppTab(index); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  transition: 'all 0.3s',
                  background: activeAppTab === index ? '#06b6d4' : completedApps.has(index) ? 'rgba(16, 185, 129, 0.3)' : '#374151',
                  border: completedApps.has(index) ? '1px solid #10b981' : '1px solid transparent',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                {app.icon} {app.title.split(' ')[0]}
              </button>
            ))}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '24px', maxWidth: '640px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '36px' }}>{applications[activeAppTab].icon}</span>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>{applications[activeAppTab].title}</h3>
            </div>
            <p style={{ fontSize: '16px', color: '#cbd5e1', marginBottom: '12px' }}>{applications[activeAppTab].description}</p>
            <p style={{ fontSize: '14px', color: '#94a3b8' }}>{applications[activeAppTab].details}</p>

            {!completedApps.has(activeAppTab) && (
              <button
                onMouseDown={(e) => { e.preventDefault(); handleAppComplete(activeAppTab); }}
                style={{
                  marginTop: '16px',
                  padding: '8px 16px',
                  background: '#10b981',
                  color: 'white',
                  borderRadius: '8px',
                  fontWeight: '500',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Mark as Understood
              </button>
            )}
          </div>

          <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#94a3b8' }}>Progress:</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {applications.map((_, i) => (
                <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: completedApps.has(i) ? '#10b981' : '#475569' }} />
              ))}
            </div>
            <span style={{ color: '#94a3b8' }}>{completedApps.size}/4</span>
          </div>
        </div>
        {renderFooter(completedApps.size >= 4, 'Take the Test →')}
      </div>
    );
  }

  // Render test phase
  if (phase === 'test') {
    const score = calculateScore();

    if (showTestResults) {
      return (
        <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
            <div style={{
              background: score >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '640px',
              width: '100%',
              textAlign: 'center',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>{score >= 8 ? '🎉' : '📚'}</div>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Score: {score}/10</h3>
              <p style={{ color: '#cbd5e1' }}>
                {score >= 8 ? 'Excellent! You\'ve mastered supercooling!' : 'Keep studying! Review and try again.'}
              </p>
            </div>

            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '12px',
                  maxWidth: '640px',
                  width: '100%',
                  borderLeft: `4px solid ${isCorrect ? '#10b981' : '#ef4444'}`
                }}>
                  <p style={{ color: 'white', fontWeight: '500', marginBottom: '12px' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{
                      padding: '8px 12px',
                      marginBottom: '4px',
                      borderRadius: '6px',
                      background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                      color: opt.correct ? '#10b981' : userAnswer === oIndex ? '#ef4444' : '#94a3b8'
                    }}>
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderFooter(score >= 8, score >= 8 ? 'Complete Mastery →' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', width: '100%', maxWidth: '640px' }}>
            <h2 style={{ color: 'white', fontSize: '20px' }}>Knowledge Test</h2>
            <span style={{ color: '#94a3b8' }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', width: '100%', maxWidth: '640px' }}>
            {testQuestions.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrentTestQuestion(i)}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  background: testAnswers[i] !== null ? '#06b6d4' : i === currentTestQuestion ? '#64748b' : 'rgba(255,255,255,0.1)',
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '20px', marginBottom: '16px', maxWidth: '640px', width: '100%' }}>
            <p style={{ color: 'white', fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '640px' }}>
            {currentQ.options.map((opt, oIndex) => (
              <button
                key={oIndex}
                onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: testAnswers[currentTestQuestion] === oIndex ? '2px solid #06b6d4' : '1px solid rgba(255,255,255,0.2)',
                  background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                  color: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px'
                }}
              >
                {opt.text}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', width: '100%', maxWidth: '640px', marginTop: '16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #64748b',
                background: 'transparent',
                color: currentTestQuestion === 0 ? '#64748b' : 'white',
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              ← Previous
            </button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#06b6d4',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={() => setShowTestResults(true)}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? '#64748b' : '#10b981',
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer'
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render mastery phase
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px', textAlign: 'center' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(16, 185, 129, 0.2), rgba(249, 115, 22, 0.2))',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '640px'
          }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>🏆</div>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>Supercooling Master!</h1>
            <p style={{ fontSize: '18px', color: '#cbd5e1', marginBottom: '24px' }}>
              You've mastered the physics of metastable liquids and nucleation!
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>❄️</div>
                <p style={{ fontSize: '14px', color: '#cbd5e1' }}>Supercooling</p>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔮</div>
                <p style={{ fontSize: '14px', color: '#cbd5e1' }}>Nucleation</p>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
                <p style={{ fontSize: '14px', color: '#cbd5e1' }}>Phase Diagrams</p>
              </div>
              <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔥</div>
                <p style={{ fontSize: '14px', color: '#cbd5e1' }}>Hand Warmers</p>
              </div>
            </div>
          </div>
        </div>
        {renderFooter(true, 'Complete Game →')}
      </div>
    );
  }

  return null;
};

export default SupercoolingRenderer;
