"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

// ============================================================================
// HAND WARMER RENDERER
// Physics: Fe + O2 -> Fe2O3 + heat (exothermic oxidation)
// Also covers sodium acetate phase change (crystallization)
// ============================================================================

interface HandWarmerRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// Play crystallization sound
const playCrystallizeSound = (): void => {
  if (typeof window === "undefined") return;
  try {
    const audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();

    const bufferSize = audioContext.sampleRate * 0.3;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 0.5) * 0.3;
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = audioContext.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2000;
    filter.Q.value = 2;

    noise.connect(filter);
    filter.connect(audioContext.destination);

    noise.start();
  } catch {
    // Audio not available
  }
};

export default function HandWarmerRenderer({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}: HandWarmerRendererProps) {
  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
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

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<number, number>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [currentApp, setCurrentApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const lastClickRef = useRef(0);

  // Game-specific state for phase-change warmer
  const [warmerState, setWarmerState] = useState<"liquid" | "crystallizing" | "solid">("liquid");
  const [temperature, setTemperature] = useState(20);
  const [crystalProgress, setCrystalProgress] = useState(0);
  const [crystalPoints, setCrystalPoints] = useState<{ x: number; y: number; size: number }[]>([]);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [discClicked, setDiscClicked] = useState(false);

  // Interactive slider controls for chemical (iron oxidation) warmer
  const [ironPowder, setIronPowder] = useState(50); // 0-100%
  const [saltConcentration, setSaltConcentration] = useState(50); // 0-100%
  const [oxygenAvailability, setOxygenAvailability] = useState(50); // 0-100%
  const [ambientTemp, setAmbientTemp] = useState(20); // -10 to 40C

  // Chemical warmer simulation state
  const [chemicalTemp, setChemicalTemp] = useState(20);
  const [reactionProgress, setReactionProgress] = useState(0);
  const [isReacting, setIsReacting] = useState(false);
  const [heatOutput, setHeatOutput] = useState(0);
  const [temperatureHistory, setTemperatureHistory] = useState<number[]>([20]);
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Twist state
  const [warmerType, setWarmerType] = useState<"phase" | "chemical">("phase");
  const [twistTemperature, setTwistTemperature] = useState(20);
  const [twistState, setTwistState] = useState<"inactive" | "active" | "depleted">("inactive");
  const [energyRemaining, setEnergyRemaining] = useState(100);

  // Crystallization animation state
  const [crystalWaveRadius, setCrystalWaveRadius] = useState(0);

  // Constants
  const latentHeatFusion = 264;
  const meltingPoint = 54;
  const maxTemp = 54;

  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const sounds = {
        click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType },
        success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
        failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
        transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType },
        complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType }
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

  // Chemical reaction simulation (iron oxidation)
  useEffect(() => {
    if (!isReacting || reactionProgress >= 100) return;

    const interval = setInterval(() => {
      // Calculate reaction rate based on parameters
      const ironFactor = ironPowder / 100;
      const saltFactor = 0.5 + (saltConcentration / 200); // Salt acts as catalyst
      const oxygenFactor = oxygenAvailability / 100;
      const reactionRate = ironFactor * saltFactor * oxygenFactor * 2;

      setReactionProgress((p) => {
        const newProgress = Math.min(100, p + reactionRate);
        if (newProgress >= 100) {
          setIsReacting(false);
        }
        return newProgress;
      });

      // Calculate heat output (exothermic reaction)
      const baseHeat = 30 * ironFactor * oxygenFactor;
      const newHeatOutput = baseHeat * saltFactor * (1 - reactionProgress / 200);
      setHeatOutput(newHeatOutput);

      // Update temperature
      const maxChemicalTemp = ambientTemp + 35 * ironFactor * oxygenFactor;
      setChemicalTemp((t) => {
        const targetTemp = ambientTemp + (maxChemicalTemp - ambientTemp) * (reactionProgress / 100);
        const diff = targetTemp - t;
        return t + diff * 0.1;
      });

      // Update temperature history
      setTemperatureHistory((prev) => [...prev.slice(-50), chemicalTemp]);
      setTimeElapsed((t) => t + 1);
    }, 100);

    return () => clearInterval(interval);
  }, [isReacting, reactionProgress, ironPowder, saltConcentration, oxygenAvailability, ambientTemp, chemicalTemp]);

  // Crystallization animation
  useEffect(() => {
    if (warmerState !== "crystallizing") return;

    const interval = setInterval(() => {
      setCrystalProgress((p) => {
        if (p >= 100) {
          setWarmerState("solid");
          return 100;
        }
        return p + 2;
      });

      setCrystalWaveRadius((r) => Math.min(150, r + 3));

      if (crystalProgress < 100) {
        setCrystalPoints((prev) => [
          ...prev,
          {
            x: 100 + Math.random() * 200,
            y: 150 + Math.random() * 150,
            size: 2 + Math.random() * 8,
          },
        ]);
      }

      setTemperature((t) => Math.min(maxTemp, t + 1));
    }, 100);

    return () => clearInterval(interval);
  }, [warmerState, crystalProgress]);

  // Cooling after crystallization
  useEffect(() => {
    if (warmerState !== "solid" || temperature <= 25) return;

    const interval = setInterval(() => {
      setTemperature((t) => Math.max(25, t - 0.3));
    }, 200);

    return () => clearInterval(interval);
  }, [warmerState, temperature]);

  // Activate the hand warmer (phase change)
  const activateWarmer = () => {
    if (warmerState !== "liquid") return;
    setDiscClicked(true);
    playCrystallizeSound();

    setTimeout(() => {
      setWarmerState("crystallizing");
    }, 300);
  };

  // Reset the warmer
  const resetWarmer = () => {
    setWarmerState("liquid");
    setTemperature(20);
    setCrystalProgress(0);
    setCrystalPoints([]);
    setDiscClicked(false);
    setCrystalWaveRadius(0);
    playSound("click");
  };

  // Start chemical reaction
  const startChemicalReaction = () => {
    if (isReacting) return;
    setIsReacting(true);
    setReactionProgress(0);
    setChemicalTemp(ambientTemp);
    setTemperatureHistory([ambientTemp]);
    setTimeElapsed(0);
    playSound("click");
  };

  // Reset chemical warmer
  const resetChemicalWarmer = () => {
    setIsReacting(false);
    setReactionProgress(0);
    setChemicalTemp(ambientTemp);
    setHeatOutput(0);
    setTemperatureHistory([ambientTemp]);
    setTimeElapsed(0);
    playSound("click");
  };

  // Twist: activate chemical warmer
  const activateChemicalWarmer = () => {
    if (twistState !== "inactive" || warmerType !== "chemical") return;
    setTwistState("active");
    playSound("click");
  };

  // Twist: activate phase change warmer
  const activatePhaseWarmer = () => {
    if (twistState !== "inactive" || warmerType !== "phase") return;
    setTwistState("active");
    playCrystallizeSound();
  };

  // Twist simulation
  useEffect(() => {
    if (twistState !== "active") return;

    const interval = setInterval(() => {
      if (warmerType === "chemical") {
        setTwistTemperature((t) => {
          if (energyRemaining > 80) return Math.min(50, t + 2);
          if (energyRemaining > 20) return Math.max(35, Math.min(50, t));
          return Math.max(20, t - 0.5);
        });
        setEnergyRemaining((e) => {
          const newE = e - 0.5;
          if (newE <= 0) {
            setTwistState("depleted");
            return 0;
          }
          return newE;
        });
      } else {
        setTwistTemperature((t) => {
          if (energyRemaining > 10) return Math.min(54, t + 3);
          return Math.max(20, t - 0.5);
        });
        setEnergyRemaining((e) => {
          const newE = e - 0.8;
          if (newE <= 0) {
            setTwistState("depleted");
            return 0;
          }
          return newE;
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [twistState, warmerType, energyRemaining]);

  // Reset twist
  const resetTwist = () => {
    setTwistState("inactive");
    setTwistTemperature(20);
    setEnergyRemaining(100);
  };

  // Test questions
  const testQuestions = [
    {
      question: "What is 'latent heat of fusion'?",
      options: [
        { text: "Heat needed to change temperature", correct: false },
        { text: "Energy released or absorbed during phase change (solid-liquid)", correct: true },
        { text: "Heat from nuclear fusion", correct: false },
        { text: "Temperature of melting", correct: false }
      ]
    },
    {
      question: "Why can sodium acetate stay liquid below its freezing point (54C)?",
      options: [
        { text: "It's not real sodium acetate", correct: false },
        { text: "The container keeps it warm", correct: false },
        { text: "Without nucleation sites, crystals can't form (supercooling)", correct: true },
        { text: "It has no freezing point", correct: false }
      ]
    },
    {
      question: "When the metal disc is clicked, what happens?",
      options: [
        { text: "It heats the solution electrically", correct: false },
        { text: "It creates a nucleation site that triggers crystallization", correct: true },
        { text: "It mixes chemicals together", correct: false },
        { text: "It releases stored heat directly", correct: false }
      ]
    },
    {
      question: "During crystallization, the hand warmer's temperature:",
      options: [
        { text: "Drops to freezing", correct: false },
        { text: "Rises to the melting/freezing point and stays there", correct: true },
        { text: "Fluctuates randomly", correct: false },
        { text: "Stays at room temperature", correct: false }
      ]
    },
    {
      question: "How do you 'recharge' a reusable hand warmer?",
      options: [
        { text: "Plug it into electricity", correct: false },
        { text: "Add more chemicals", correct: false },
        { text: "Boil it in water to re-dissolve the crystals", correct: true },
        { text: "Let it sit overnight", correct: false }
      ]
    },
    {
      question: "Chemical (iron oxidation) hand warmers differ from phase-change ones because:",
      options: [
        { text: "They're reusable", correct: false },
        { text: "They produce heat through irreversible chemical reaction", correct: true },
        { text: "They work faster", correct: false },
        { text: "They get hotter", correct: false }
      ]
    },
    {
      question: "The latent heat of fusion for sodium acetate is about 264 kJ/kg. This means:",
      options: [
        { text: "It heats up 264C", correct: false },
        { text: "264 kJ is released when 1 kg crystallizes", correct: true },
        { text: "It takes 264 kg to heat it", correct: false },
        { text: "264 is its melting point", correct: false }
      ]
    },
    {
      question: "Why does the crystallization spread so rapidly after the disc is clicked?",
      options: [
        { text: "The disc is very hot", correct: false },
        { text: "Each new crystal triggers neighbors to crystallize (chain reaction)", correct: true },
        { text: "The solution is compressed", correct: false },
        { text: "Air rushes in", correct: false }
      ]
    },
    {
      question: "A supercooled liquid is:",
      options: [
        { text: "Colder than absolute zero", correct: false },
        { text: "A liquid below its normal freezing point", correct: true },
        { text: "A very cold solid", correct: false },
        { text: "Liquid nitrogen", correct: false }
      ]
    },
    {
      question: "In disposable hand warmers, what role does salt play in iron oxidation?",
      options: [
        { text: "Provides the iron", correct: false },
        { text: "Acts as a catalyst to speed up the reaction", correct: true },
        { text: "Creates the heat directly", correct: false },
        { text: "Absorbs moisture", correct: false }
      ]
    }
  ];

  // Real-world applications
  const applications = [
    {
      title: "Reusable Hand Warmers",
      description:
        "Sodium acetate hand warmers can be reused hundreds of times. Click to crystallize and release heat (54C for up to an hour). Boil in water for 10 minutes to reset. More economical and eco-friendly than disposables.",
      icon: "glove"
    },
    {
      title: "Thermal Energy Storage",
      description:
        "Phase change materials (PCMs) store energy in buildings. Melting during hot days and solidifying at night, they reduce heating/cooling costs by 20-30%. Paraffin wax and salt hydrates are common PCMs.",
      icon: "building"
    },
    {
      title: "Food Transport",
      description:
        "Phase change gel packs keep vaccines, organs, and temperature-sensitive foods within precise ranges during shipping. They absorb/release heat while staying at constant temperature during phase change.",
      icon: "package"
    },
    {
      title: "Spacecraft Thermal Control",
      description:
        "Satellites use PCMs to handle extreme temperature swings between sun and shadow. The PCM absorbs excess heat (melting) and releases it when cold (solidifying), maintaining stable equipment temperatures.",
      icon: "satellite"
    }
  ];

  // Calculate score
  const handleTestSubmit = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== undefined && q.options[testAnswers[i]]?.correct) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);

    if (score >= 7) {
      playSound("complete");
    } else {
      playSound("failure");
    }
  };

  // Get temperature color
  const getTempColor = (temp: number): string => {
    if (temp < 25) return "#3b82f6";
    if (temp < 35) return "#22c55e";
    if (temp < 45) return "#eab308";
    if (temp < 52) return "#f97316";
    return "#ef4444";
  };

  // Render temperature graph - Premium SVG
  const renderTemperatureGraph = () => {
    const graphWidth = 280;
    const graphHeight = 100;
    const padding = 20;

    const maxHistoryTemp = Math.max(...temperatureHistory, 60);
    const minHistoryTemp = Math.min(...temperatureHistory, 0);

    const points = temperatureHistory.map((temp, i) => {
      const x = padding + (i / 50) * (graphWidth - 2 * padding);
      const y = graphHeight - padding - ((temp - minHistoryTemp) / (maxHistoryTemp - minHistoryTemp)) * (graphHeight - 2 * padding);
      return `${x},${y}`;
    }).join(" ");

    // Create fill area points
    const fillPoints = temperatureHistory.length > 0
      ? `${padding},${graphHeight - padding} ${points} ${padding + ((temperatureHistory.length - 1) / 50) * (graphWidth - 2 * padding)},${graphHeight - padding}`
      : '';

    return (
      <div style={{ width: '100%', maxWidth: '280px' }}>
        <div style={{
          fontSize: typo.small,
          fontWeight: 'bold',
          color: '#e2e8f0',
          textAlign: 'center',
          marginBottom: '6px'
        }}>
          Temperature vs Time
        </div>
        <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} style={{ width: '100%', borderRadius: '8px' }}>
          <defs>
            {/* Graph background gradient */}
            <linearGradient id="warmGraphBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Temperature line gradient */}
            <linearGradient id="warmTempLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="30%" stopColor="#22c55e" />
              <stop offset="60%" stopColor="#eab308" />
              <stop offset="80%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Area fill gradient */}
            <linearGradient id="warmAreaFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={getTempColor(chemicalTemp)} stopOpacity="0.4" />
              <stop offset="50%" stopColor={getTempColor(chemicalTemp)} stopOpacity="0.2" />
              <stop offset="100%" stopColor={getTempColor(chemicalTemp)} stopOpacity="0" />
            </linearGradient>

            {/* Dot glow filter */}
            <filter id="warmDotGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width={graphWidth} height={graphHeight} fill="url(#warmGraphBg)" rx="8" />

          {/* Grid lines */}
          {[0, 25, 50].map((temp, i) => {
            const y = graphHeight - padding - ((temp - minHistoryTemp) / (maxHistoryTemp - minHistoryTemp)) * (graphHeight - 2 * padding);
            return (
              <g key={i}>
                <line x1={padding} y1={y} x2={graphWidth - padding} y2={y} stroke="#374151" strokeWidth="1" strokeDasharray="3,3" />
                <text x={padding - 3} y={y + 3} fontSize="7" fill="#64748b" textAnchor="end">{temp}C</text>
              </g>
            );
          })}

          {/* Area fill under the line */}
          {temperatureHistory.length > 1 && (
            <polygon
              points={fillPoints}
              fill="url(#warmAreaFill)"
            />
          )}

          {/* Temperature line with gradient */}
          <polyline
            points={points}
            fill="none"
            stroke={getTempColor(chemicalTemp)}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current temperature dot with glow */}
          {temperatureHistory.length > 0 && (
            <g filter="url(#warmDotGlow)">
              <circle
                cx={padding + ((temperatureHistory.length - 1) / 50) * (graphWidth - 2 * padding)}
                cy={graphHeight - padding - ((temperatureHistory[temperatureHistory.length - 1] - minHistoryTemp) / (maxHistoryTemp - minHistoryTemp)) * (graphHeight - 2 * padding)}
                r="5"
                fill={getTempColor(chemicalTemp)}
              />
              <circle
                cx={padding + ((temperatureHistory.length - 1) / 50) * (graphWidth - 2 * padding)}
                cy={graphHeight - padding - ((temperatureHistory[temperatureHistory.length - 1] - minHistoryTemp) / (maxHistoryTemp - minHistoryTemp)) * (graphHeight - 2 * padding)}
                r="2.5"
                fill="#ffffff"
              />
            </g>
          )}
        </svg>
        <div style={{
          fontSize: typo.label,
          color: '#64748b',
          textAlign: 'center',
          marginTop: '4px'
        }}>
          Time Elapsed
        </div>
      </div>
    );
  };

  // Render iron oxidation animation - Premium SVG
  const renderIronOxidationAnimation = () => {
    const ironParticles: { x: number; y: number; opacity: number }[] = [];
    const oxygenParticles: { x: number; y: number; opacity: number }[] = [];
    const rustParticles: { x: number; y: number; opacity: number }[] = [];

    // Generate particles based on reaction progress
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + animationFrame / 30;
      const baseRadius = 30 + (isReacting ? Math.sin(animationFrame / 10 + i) * 5 : 0);

      if (reactionProgress < 50 + i * 5) {
        // Iron particles (gray)
        ironParticles.push({
          x: 80 + Math.cos(angle) * baseRadius,
          y: 80 + Math.sin(angle) * baseRadius,
          opacity: 1 - reactionProgress / 100
        });
      }

      if (reactionProgress > i * 10 && reactionProgress < 80 + i * 2) {
        // Oxygen particles coming in (blue)
        const oxygenAngle = angle + Math.PI / 8;
        const oxygenRadius = 60 - (reactionProgress - i * 10) * 0.3;
        oxygenParticles.push({
          x: 80 + Math.cos(oxygenAngle) * oxygenRadius,
          y: 80 + Math.sin(oxygenAngle) * oxygenRadius,
          opacity: Math.min(1, (reactionProgress - i * 10) / 20)
        });
      }

      if (reactionProgress > 30 + i * 8) {
        // Rust particles forming (rust color)
        rustParticles.push({
          x: 80 + Math.cos(angle + Math.PI / 4) * (baseRadius - 10),
          y: 80 + Math.sin(angle + Math.PI / 4) * (baseRadius - 10),
          opacity: Math.min(1, (reactionProgress - 30 - i * 8) / 30)
        });
      }
    }

    return (
      <div style={{ width: '100%', maxWidth: '160px' }}>
        <svg viewBox="0 0 160 140" style={{ width: '100%' }}>
          <defs>
            {/* Iron particle gradient */}
            <radialGradient id="warmIronGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="40%" stopColor="#6b7280" />
              <stop offset="70%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </radialGradient>

            {/* Oxygen particle gradient */}
            <radialGradient id="warmOxygenGrad" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="40%" stopColor="#60a5fa" />
              <stop offset="70%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </radialGradient>

            {/* Rust particle gradient */}
            <radialGradient id="warmRustGrad" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="30%" stopColor="#f59e0b" />
              <stop offset="60%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </radialGradient>

            {/* Heat wave gradient */}
            <linearGradient id="warmOxidHeatGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#f97316" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#fbbf24" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
            </linearGradient>

            {/* Background gradient */}
            <linearGradient id="warmOxidBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Particle glow filter */}
            <filter id="warmParticleGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Heat glow filter */}
            <filter id="warmOxidHeatGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width="160" height="140" fill="url(#warmOxidBg)" rx="8" />

          {/* Subtle center glow during reaction */}
          {isReacting && (
            <circle cx="80" cy="80" r="40" fill="#f97316" opacity={0.1 + heatOutput * 0.01} />
          )}

          {/* Iron particles with gradient */}
          <g filter="url(#warmParticleGlow)">
            {ironParticles.map((p, i) => (
              <circle key={`iron-${i}`} cx={p.x} cy={p.y} r="9" fill="url(#warmIronGrad)" opacity={p.opacity} />
            ))}
          </g>

          {/* Oxygen particles with gradient */}
          <g filter="url(#warmParticleGlow)">
            {oxygenParticles.map((p, i) => (
              <circle key={`oxygen-${i}`} cx={p.x} cy={p.y} r="6" fill="url(#warmOxygenGrad)" opacity={p.opacity} />
            ))}
          </g>

          {/* Rust particles with gradient */}
          <g filter="url(#warmParticleGlow)">
            {rustParticles.map((p, i) => (
              <circle key={`rust-${i}`} cx={p.x} cy={p.y} r="11" fill="url(#warmRustGrad)" opacity={p.opacity} />
            ))}
          </g>

          {/* Heat waves when reacting */}
          {isReacting && heatOutput > 5 && (
            <g filter="url(#warmOxidHeatGlow)">
              {[0, 1, 2, 3].map((i) => {
                const offset = (animationFrame + i * 15) % 40;
                const baseX = 50 + i * 20;
                return (
                  <path
                    key={i}
                    d={`M ${baseX} ${35 - offset}
                        Q ${baseX + 5} ${30 - offset} ${baseX} ${25 - offset}
                        Q ${baseX - 5} ${20 - offset} ${baseX} ${15 - offset}`}
                    fill="none"
                    stroke="url(#warmOxidHeatGrad)"
                    strokeWidth="2.5"
                    opacity={(40 - offset) / 40}
                    strokeLinecap="round"
                  />
                );
              })}
            </g>
          )}
        </svg>
        {/* Reaction equation outside SVG */}
        <div style={{
          textAlign: 'center',
          fontSize: typo.label,
          color: '#94a3b8',
          marginTop: '4px'
        }}>
          4Fe + 3O<sub>2</sub> = 2Fe<sub>2</sub>O<sub>3</sub> + heat
        </div>
      </div>
    );
  };

  // Render heat output indicator - Premium SVG
  const renderHeatOutputIndicator = () => {
    const indicatorHeight = 120;
    const indicatorWidth = 60;
    const fillHeight = Math.min(100, heatOutput * 3);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ fontSize: typo.small, color: '#94a3b8' }}>Heat Output</div>
        <svg viewBox={`0 0 ${indicatorWidth} ${indicatorHeight}`} style={{ width: '60px', height: '120px' }}>
          <defs>
            {/* Heat output gradient */}
            <linearGradient id="warmHeatOutputGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="25%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Indicator background gradient */}
            <linearGradient id="warmIndicatorBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Heat glow for active state */}
            <filter id="warmHeatIndicatorGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner glow */}
            <radialGradient id="warmHeatInnerGlow" cx="50%" cy="0%" r="100%">
              <stop offset="0%" stopColor={getTempColor(chemicalTemp)} stopOpacity="0.4" />
              <stop offset="100%" stopColor={getTempColor(chemicalTemp)} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background container */}
          <rect
            x="2"
            y="2"
            width={indicatorWidth - 4}
            height={indicatorHeight - 4}
            fill="url(#warmIndicatorBg)"
            stroke="#334155"
            strokeWidth="2"
            rx="6"
          />

          {/* Inner track */}
          <rect
            x="8"
            y="8"
            width={indicatorWidth - 16}
            height={indicatorHeight - 16}
            fill="#0f172a"
            rx="4"
          />

          {/* Heat fill with gradient */}
          <rect
            x="10"
            y={indicatorHeight - 12 - (fillHeight * (indicatorHeight - 20) / 100)}
            width={indicatorWidth - 20}
            height={(fillHeight * (indicatorHeight - 20) / 100)}
            fill="url(#warmHeatOutputGrad)"
            rx="3"
            filter={heatOutput > 10 ? "url(#warmHeatIndicatorGlow)" : undefined}
          />

          {/* Inner glow overlay */}
          {heatOutput > 5 && (
            <rect
              x="10"
              y={indicatorHeight - 12 - (fillHeight * (indicatorHeight - 20) / 100)}
              width={indicatorWidth - 20}
              height={(fillHeight * (indicatorHeight - 20) / 100)}
              fill="url(#warmHeatInnerGlow)"
              rx="3"
            />
          )}

          {/* Scale markers */}
          {[25, 50, 75].map((val) => {
            const y = indicatorHeight - 12 - (val * (indicatorHeight - 20) / 100);
            return (
              <g key={val}>
                <line
                  x1="6"
                  y1={y}
                  x2="12"
                  y2={y}
                  stroke="#475569"
                  strokeWidth="1"
                />
                <line
                  x1={indicatorWidth - 12}
                  y1={y}
                  x2={indicatorWidth - 6}
                  y2={y}
                  stroke="#475569"
                  strokeWidth="1"
                />
              </g>
            );
          })}
        </svg>
        <div style={{
          fontSize: typo.body,
          fontWeight: 'bold',
          color: getTempColor(chemicalTemp)
        }}>
          {heatOutput.toFixed(1)} W
        </div>
      </div>
    );
  };

  // Render slider control
  const renderSlider = (
    label: string,
    value: number,
    setValue: (v: number) => void,
    min: number,
    max: number,
    unit: string,
    color: string
  ) => {
    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '12px', color: '#e2e8f0' }}>{label}</span>
          <span style={{ fontSize: '12px', color: color, fontWeight: 'bold' }}>{value}{unit}</span>
        </div>
        <div style={{ position: 'relative', height: '24px' }}>
          <div style={{
            position: 'absolute',
            top: '10px',
            left: 0,
            right: 0,
            height: '4px',
            background: '#374151',
            borderRadius: '2px'
          }} />
          <div style={{
            position: 'absolute',
            top: '10px',
            left: 0,
            width: `${((value - min) / (max - min)) * 100}%`,
            height: '4px',
            background: color,
            borderRadius: '2px'
          }} />
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            disabled={isReacting}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '24px',
              opacity: 0,
              cursor: isReacting ? 'not-allowed' : 'pointer',
              zIndex: 10
            }}
          />
          <div style={{
            position: 'absolute',
            top: '4px',
            left: `calc(${((value - min) / (max - min)) * 100}% - 8px)`,
            width: '16px',
            height: '16px',
            background: color,
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }} />
        </div>
      </div>
    );
  };

  // Render hand warmer visualization (phase change) - Premium SVG
  const renderHandWarmer = () => {
    const isLiquid = warmerState === "liquid";
    const isCrystallizing = warmerState === "crystallizing";
    const isSolid = warmerState === "solid";

    return (
      <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
        <svg viewBox="0 0 400 340" className="w-full">
          <defs>
            {/* Premium dark lab background gradient */}
            <linearGradient id="warmLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="30%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Hand warmer pack outer gradient */}
            <linearGradient id="warmPackOuter" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="25%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="75%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Supercooled liquid gradient */}
            <radialGradient id="warmLiquidGrad" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
              <stop offset="30%" stopColor="#0ea5e9" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#0284c7" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.8" />
            </radialGradient>

            {/* Crystallizing state gradient */}
            <radialGradient id="warmCrystalGrad" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.95" />
              <stop offset="25%" stopColor="#fde68a" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#fcd34d" stopOpacity="0.85" />
              <stop offset="75%" stopColor="#fbbf24" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.75" />
            </radialGradient>

            {/* Solid crystallized gradient */}
            <radialGradient id="warmSolidGrad" cx="45%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#cbd5e1" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#94a3b8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#64748b" stopOpacity="0.75" />
            </radialGradient>

            {/* Metal disc gradient */}
            <radialGradient id="warmDiscGrad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="40%" stopColor="#64748b" />
              <stop offset="70%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </radialGradient>

            {/* Heat radiation gradient */}
            <linearGradient id="warmHeatRadiation" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#f97316" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
            </linearGradient>

            {/* Thermometer gradient */}
            <linearGradient id="warmThermoGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="30%" stopColor="#22c55e" />
              <stop offset="60%" stopColor="#eab308" />
              <stop offset="80%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Crystal shimmer gradient */}
            <linearGradient id="warmCrystalShimmer" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="warmHeatGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="warmCrystalGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="warmDiscGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="warmWaveGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Premium dark lab background */}
          <rect width="400" height="340" fill="url(#warmLabBg)" />

          {/* Subtle grid pattern for lab feel */}
          <g opacity="0.05">
            {Array.from({ length: 20 }).map((_, i) => (
              <line key={`vg-${i}`} x1={i * 20} y1="0" x2={i * 20} y2="340" stroke="#94a3b8" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 17 }).map((_, i) => (
              <line key={`hg-${i}`} x1="0" y1={i * 20} x2="400" y2={i * 20} stroke="#94a3b8" strokeWidth="0.5" />
            ))}
          </g>

          {/* Hand warmer pack shadow */}
          <ellipse
            cx="205"
            cy="195"
            rx="135"
            ry="105"
            fill="#000"
            opacity={0.3}
          />

          {/* Hand warmer pack outer shell */}
          <ellipse
            cx="200"
            cy="190"
            rx="135"
            ry="105"
            fill="url(#warmPackOuter)"
            stroke="#334155"
            strokeWidth={2}
          />

          {/* Hand warmer pack inner content area */}
          <ellipse
            cx="200"
            cy="190"
            rx="125"
            ry="95"
            fill={isLiquid ? "url(#warmLiquidGrad)" : isCrystallizing ? "url(#warmCrystalGrad)" : "url(#warmSolidGrad)"}
            stroke="#475569"
            strokeWidth={1}
          />

          {/* Liquid shimmer effects */}
          {isLiquid && (
            <g>
              <ellipse
                cx={175 + Math.sin(animationFrame / 20) * 12}
                cy={175}
                rx={75}
                ry={45}
                fill="rgba(255,255,255,0.15)"
              />
              <ellipse
                cx={225}
                cy={205 + Math.cos(animationFrame / 15) * 6}
                rx={55}
                ry={28}
                fill="rgba(255,255,255,0.1)"
              />
              {/* Bubble effects */}
              {[0, 1, 2].map((i) => {
                const bubbleY = 220 - ((animationFrame + i * 40) % 80);
                const bubbleX = 160 + i * 40 + Math.sin(animationFrame / 10 + i) * 5;
                return (
                  <circle
                    key={`bubble-${i}`}
                    cx={bubbleX}
                    cy={bubbleY}
                    r={3 + i}
                    fill="rgba(255,255,255,0.2)"
                    opacity={bubbleY > 140 ? 1 : 0}
                  />
                );
              })}
            </g>
          )}

          {/* Crystal formation during crystallization and solid state */}
          {(isCrystallizing || isSolid) && (
            <g filter="url(#warmCrystalGlow)">
              {crystalPoints.map((point, i) => (
                <g key={i} transform={`translate(${point.x}, ${point.y})`}>
                  <polygon
                    points={`0,${-point.size} ${point.size * 0.866},${-point.size / 2} ${point.size * 0.866},${point.size / 2} 0,${point.size} ${-point.size * 0.866},${point.size / 2} ${-point.size * 0.866},${-point.size / 2}`}
                    fill="url(#warmCrystalShimmer)"
                    stroke="#94a3b8"
                    strokeWidth={0.5}
                    opacity={0.85}
                  />
                </g>
              ))}
            </g>
          )}

          {/* Crystallization wave effect */}
          {isCrystallizing && crystalWaveRadius > 0 && (
            <g filter="url(#warmWaveGlow)">
              <circle
                cx="200"
                cy="160"
                r={crystalWaveRadius}
                fill="none"
                stroke="#fef3c7"
                strokeWidth="3"
                opacity={0.6 * (1 - crystalWaveRadius / 150)}
              />
              <circle
                cx="200"
                cy="160"
                r={crystalWaveRadius * 0.7}
                fill="none"
                stroke="#fde68a"
                strokeWidth="2"
                opacity={0.4 * (1 - crystalWaveRadius / 150)}
              />
            </g>
          )}

          {/* Metal activation disc */}
          <g transform="translate(200, 160)" filter={isLiquid ? "url(#warmDiscGlow)" : undefined}>
            <circle
              r={22}
              fill="url(#warmDiscGrad)"
              stroke={discClicked ? "#f59e0b" : "#64748b"}
              strokeWidth={discClicked ? 3 : 2}
              style={{ cursor: isLiquid ? "pointer" : "default" }}
              onClick={isLiquid ? activateWarmer : undefined}
            />
            {/* Disc concentric rings */}
            <circle r={17} fill="none" stroke="#94a3b8" strokeWidth={1} opacity={0.6} />
            <circle r={10} fill="#94a3b8" opacity={0.8} />
            <circle r={5} fill="#cbd5e1" />
            {/* Disc highlight */}
            <ellipse cx={-6} cy={-6} rx={4} ry={3} fill="rgba(255,255,255,0.3)" />
          </g>

          {/* Heat radiation waves when warm */}
          {temperature > 30 && (
            <g filter="url(#warmHeatGlow)">
              {[0, 1, 2, 3, 4].map((i) => {
                const offset = (animationFrame + i * 24) % 60;
                const baseX = 130 + i * 35;
                return (
                  <path
                    key={i}
                    d={`M ${baseX} ${100 - offset}
                        Q ${baseX + 8} ${90 - offset} ${baseX} ${80 - offset}
                        Q ${baseX - 8} ${70 - offset} ${baseX} ${60 - offset}`}
                    fill="none"
                    stroke="url(#warmHeatRadiation)"
                    strokeWidth={2.5}
                    opacity={(60 - offset) / 60}
                    strokeLinecap="round"
                  />
                );
              })}
            </g>
          )}

          {/* Premium temperature indicator */}
          <g transform="translate(355, 170)">
            {/* Thermometer body */}
            <rect x={-18} y={-55} width={36} height={110} fill="#0f172a" stroke="#334155" strokeWidth={2} rx={8} />
            {/* Inner track */}
            <rect x={-10} y={-45} width={20} height={90} fill="#1e293b" rx={4} />
            {/* Temperature fill with gradient */}
            <rect
              x={-8}
              y={35 - Math.min(70, (temperature - 15) * 1.8)}
              width={16}
              height={Math.min(70, (temperature - 15) * 1.8)}
              fill="url(#warmThermoGrad)"
              rx={3}
            />
            {/* Scale marks */}
            {[20, 30, 40, 50].map((t, i) => (
              <g key={i}>
                <line x1={-14} y1={35 - (t - 15) * 1.8} x2={-10} y2={35 - (t - 15) * 1.8} stroke="#64748b" strokeWidth={1} />
              </g>
            ))}
            {/* Bulb at bottom */}
            <circle cx={0} cy={50} r={12} fill={getTempColor(temperature)} />
            <circle cx={0} cy={50} r={8} fill={getTempColor(temperature)} opacity={0.6} />
          </g>
        </svg>

        {/* Text labels outside SVG using typo system */}
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <div style={{
            fontSize: typo.bodyLarge,
            fontWeight: 'bold',
            color: '#e2e8f0',
            marginBottom: '4px'
          }}>
            {isLiquid ? "Supercooled Liquid (Ready)" :
             isCrystallizing ? `Crystallizing... ${crystalProgress.toFixed(0)}%` :
             "Crystallized (Releasing Heat)"}
          </div>
          <div style={{
            fontSize: typo.small,
            color: '#94a3b8',
            marginBottom: '8px'
          }}>
            Latent Heat: {latentHeatFusion} kJ/kg | Melting Point: {meltingPoint}C
          </div>
          <div style={{
            fontSize: typo.heading,
            fontWeight: 'bold',
            color: getTempColor(temperature)
          }}>
            {temperature.toFixed(1)}C
          </div>
          {!discClicked && isLiquid && (
            <div style={{
              fontSize: typo.small,
              color: '#94a3b8',
              marginTop: '8px'
            }}>
              Click the metal disc to activate
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render comparison visualization for twist - Premium SVG
  const renderComparisonVisualization = () => {
    return (
      <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
        <svg viewBox="0 0 400 220" className="w-full">
          <defs>
            {/* Background gradient */}
            <linearGradient id="warmCompBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="30%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Phase warmer - inactive (blue liquid) */}
            <radialGradient id="warmCompPhaseInactive" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
              <stop offset="40%" stopColor="#0ea5e9" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#0284c7" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.8" />
            </radialGradient>

            {/* Phase warmer - active (warm yellow) */}
            <radialGradient id="warmCompPhaseActive" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.95" />
              <stop offset="30%" stopColor="#fde68a" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#fcd34d" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.75" />
            </radialGradient>

            {/* Phase warmer - depleted (gray) */}
            <radialGradient id="warmCompPhaseDepleted" cx="45%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#64748b" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#475569" stopOpacity="0.7" />
            </radialGradient>

            {/* Chemical warmer - inactive (orange) */}
            <radialGradient id="warmCompChemInactive" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fed7aa" stopOpacity="0.95" />
              <stop offset="40%" stopColor="#fdba74" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#f97316" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#c2410c" stopOpacity="0.8" />
            </radialGradient>

            {/* Chemical warmer - active (red hot) */}
            <radialGradient id="warmCompChemActive" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fecaca" stopOpacity="0.95" />
              <stop offset="30%" stopColor="#f87171" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#ef4444" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.75" />
            </radialGradient>

            {/* Crystal gradient */}
            <linearGradient id="warmCompCrystal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
            </linearGradient>

            {/* Rust particle gradient */}
            <radialGradient id="warmCompRust" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </radialGradient>

            {/* Heat wave gradient */}
            <linearGradient id="warmCompHeatWave" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#f97316" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#fbbf24" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
            </linearGradient>

            {/* Energy bar gradient - full */}
            <linearGradient id="warmCompEnergyFull" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>

            {/* Energy bar gradient - medium */}
            <linearGradient id="warmCompEnergyMed" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>

            {/* Energy bar gradient - low */}
            <linearGradient id="warmCompEnergyLow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="warmCompGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="warmCompCrystalGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width="400" height="220" fill="url(#warmCompBg)" />

          {/* Subtle grid */}
          <g opacity="0.03">
            {Array.from({ length: 20 }).map((_, i) => (
              <line key={`cv-${i}`} x1={i * 20} y1="0" x2={i * 20} y2="220" stroke="#94a3b8" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={`ch-${i}`} x1="0" y1={i * 20} x2="400" y2={i * 20} stroke="#94a3b8" strokeWidth="0.5" />
            ))}
          </g>

          {/* Warmer pack shadow */}
          <ellipse cx="205" cy="95" rx="105" ry="75" fill="#000" opacity={0.3} />

          {/* Warmer pack - use appropriate gradient based on type and state */}
          <ellipse
            cx="200"
            cy="90"
            rx="105"
            ry="75"
            fill={
              warmerType === "phase"
                ? twistState === "inactive" ? "url(#warmCompPhaseInactive)"
                : twistState === "active" ? "url(#warmCompPhaseActive)"
                : "url(#warmCompPhaseDepleted)"
                : twistState === "inactive" ? "url(#warmCompChemInactive)"
                : twistState === "active" ? "url(#warmCompChemActive)"
                : "url(#warmCompPhaseDepleted)"
            }
            stroke="#475569"
            strokeWidth={2}
          />

          {/* Crystallization animation for phase warmer */}
          {warmerType === "phase" && twistState === "active" && (
            <g filter="url(#warmCompCrystalGlow)">
              {Array.from({ length: 10 }).map((_, i) => {
                const angle = (i / 10) * Math.PI * 2 + animationFrame / 20;
                const radius = 25 + (100 - energyRemaining) * 0.5;
                const size = 4 + (100 - energyRemaining) * 0.03;
                return (
                  <polygon
                    key={i}
                    points={`0,${-size} ${size * 0.866},${-size / 2} ${size * 0.866},${size / 2} 0,${size} ${-size * 0.866},${size / 2} ${-size * 0.866},${-size / 2}`}
                    transform={`translate(${200 + Math.cos(angle) * radius}, ${90 + Math.sin(angle) * radius * 0.7})`}
                    fill="url(#warmCompCrystal)"
                  />
                );
              })}
            </g>
          )}

          {/* Iron oxidation animation for chemical warmer */}
          {warmerType === "chemical" && twistState === "active" && (
            <g filter="url(#warmCompCrystalGlow)">
              {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i / 8) * Math.PI * 2 + animationFrame / 15;
                const radius = 35 + Math.sin(animationFrame / 10 + i) * 5;
                return (
                  <circle
                    key={i}
                    cx={200 + Math.cos(angle) * radius}
                    cy={90 + Math.sin(angle) * radius * 0.6}
                    r={6}
                    fill="url(#warmCompRust)"
                    opacity={0.9}
                  />
                );
              })}
            </g>
          )}

          {/* Heat waves when active */}
          {twistState === "active" && (
            <g filter="url(#warmCompGlow)">
              {[0, 1, 2, 3, 4].map((i) => {
                const offset = (animationFrame + i * 20) % 50;
                const baseX = 120 + i * 40;
                return (
                  <path
                    key={i}
                    d={`M ${baseX} ${30 - offset}
                        Q ${baseX + 6} ${22 - offset} ${baseX} ${14 - offset}
                        Q ${baseX - 6} ${6 - offset} ${baseX} ${-2 - offset}`}
                    fill="none"
                    stroke="url(#warmCompHeatWave)"
                    strokeWidth="2.5"
                    opacity={(50 - offset) / 50}
                    strokeLinecap="round"
                  />
                );
              })}
            </g>
          )}

          {/* Energy bar background */}
          <g transform="translate(100, 180)">
            <rect width="200" height="16" fill="#0f172a" stroke="#334155" strokeWidth="1" rx={4} />
            {/* Energy fill */}
            <rect
              width={energyRemaining * 2}
              height="16"
              fill={
                energyRemaining > 50 ? "url(#warmCompEnergyFull)"
                : energyRemaining > 20 ? "url(#warmCompEnergyMed)"
                : "url(#warmCompEnergyLow)"
              }
              rx={4}
            />
            {/* Energy bar segments */}
            {[25, 50, 75].map((val) => (
              <line
                key={val}
                x1={val * 2}
                y1="0"
                x2={val * 2}
                y2="16"
                stroke="#0f172a"
                strokeWidth="1"
                opacity={0.5}
              />
            ))}
          </g>
        </svg>

        {/* Text labels outside SVG */}
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <div style={{
            fontSize: typo.heading,
            fontWeight: 'bold',
            color: getTempColor(twistTemperature),
            marginBottom: '4px'
          }}>
            {twistTemperature.toFixed(1)}C
          </div>
          <div style={{
            fontSize: typo.small,
            color: '#94a3b8',
            marginBottom: '8px'
          }}>
            Energy Remaining: {energyRemaining.toFixed(0)}%
          </div>
          <div style={{
            fontSize: typo.bodyLarge,
            fontWeight: 'bold',
            color: '#e2e8f0',
            marginBottom: '4px'
          }}>
            {warmerType === "phase" ? "Phase-Change (Reusable)" : "Chemical (Disposable)"}
          </div>
          <div style={{
            fontSize: typo.small,
            color: '#94a3b8',
            marginBottom: '4px'
          }}>
            {warmerType === "phase"
              ? "Sodium acetate crystallization"
              : "4Fe + 3O2 = 2Fe2O3 + heat"}
          </div>
          <div style={{
            fontSize: typo.body,
            fontWeight: '600',
            color: twistState === "inactive" ? "#0ea5e9" :
                   twistState === "active" ? "#f97316" : "#64748b"
          }}>
            {twistState === "inactive" ? "Ready" :
             twistState === "active" ? "Heating..." : "Depleted"}
          </div>
        </div>
      </div>
    );
  };

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-orange-400 tracking-wide">THERMAL PHYSICS</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-orange-100 to-yellow-200 bg-clip-text text-transparent">
        The Magic Hand Warmer
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover how a simple click unleashes hidden thermal energy
      </p>

      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-yellow-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">
            <span role="img" aria-label="glove">&#129350;</span>
            <span role="img" aria-label="ice">&#10052;</span>
            <span style={{ margin: '0 8px' }}>-&gt;</span>
            <span role="img" aria-label="fire">&#128293;</span>
          </div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              It's just a pouch of clear liquid—but click a tiny metal disc inside, and INSTANT heat!
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              Within seconds, it's warm enough to hold. The liquid turns solid, and it stays hot for an hour.
            </p>
            <div className="pt-2">
              <p className="text-base text-orange-400 font-semibold">
                Where does all that heat come from?
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => { onPhaseComplete?.(); }}
        style={{ zIndex: 10 }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover Phase Change Energy
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-orange-400">*</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-400">*</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-400">*</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A reusable hand warmer contains sodium acetate solution. It can be
          stored as a clear liquid at room temperature (20C). When you flex
          the metal disc inside, it rapidly heats to 54C and turns solid.
        </p>
        <p className="text-lg text-orange-400 font-medium">
          Where does the heat energy come from?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: "battery", text: "A hidden battery inside the pouch" },
          { id: "chemical", text: "A chemical reaction that consumes the liquid" },
          { id: "phase", text: "Energy released when liquid crystallizes into solid" },
          { id: "friction", text: "Friction from flexing the disc" }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => {
              setPrediction(option.id);
              playSound("click");
            }}
            style={{ zIndex: 10 }}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              prediction === option.id
                ? option.id === "phase" ? "bg-emerald-600/40 border-2 border-emerald-400" : "bg-orange-600/40 border-2 border-orange-400"
                : "bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent"
            }`}
          >
            <span className="text-slate-200">{option.text}</span>
          </button>
        ))}
      </div>

      {prediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className={`font-semibold ${prediction === "phase" ? "text-emerald-400" : "text-orange-400"}`}>
            {prediction === "phase"
              ? "Correct! This is latent heat of fusion—energy stored in the liquid phase!"
              : "Not quite—the energy actually comes from the phase change itself!"}
          </p>
          <button
            onClick={() => onPhaseComplete?.()}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl"
          >
            Test Your Prediction
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Iron Oxidation Hand Warmer Lab</h2>
      <p className="text-slate-400 mb-6 text-center max-w-md">
        Adjust the parameters to control the exothermic reaction: Fe + O2 → Fe2O3 + heat
      </p>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl w-full">
        {/* Controls Panel */}
        <div className="bg-slate-800/50 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Reaction Parameters</h3>

          {renderSlider("Iron Powder Amount", ironPowder, setIronPowder, 0, 100, "%", "#6b7280")}
          {renderSlider("Salt Concentration (Catalyst)", saltConcentration, setSaltConcentration, 0, 100, "%", "#f59e0b")}
          {renderSlider("Oxygen Availability", oxygenAvailability, setOxygenAvailability, 0, 100, "%", "#3b82f6")}
          {renderSlider("Ambient Temperature", ambientTemp, setAmbientTemp, -10, 40, "C", "#22c55e")}

          <div className="flex gap-2 mt-4">
            <button
              onClick={startChemicalReaction}
              disabled={isReacting}
              style={{ zIndex: 10 }}
              className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                isReacting
                  ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                  : "bg-orange-600 text-white hover:bg-orange-500"
              }`}
            >
              {isReacting ? "Reacting..." : "Start Reaction"}
            </button>
            <button
              onClick={resetChemicalWarmer}
              style={{ zIndex: 10 }}
              className="px-4 py-3 bg-slate-700 text-white rounded-lg font-bold hover:bg-slate-600"
            >
              Reset
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">Reaction Progress</span>
              <span className="text-orange-400 font-bold">{reactionProgress.toFixed(0)}%</span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
                style={{ width: `${reactionProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Visualization Panel */}
        <div className="bg-slate-800/50 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Visualization</h3>

          <div className="flex justify-around items-start mb-4">
            {renderIronOxidationAnimation()}
            {renderHeatOutputIndicator()}
          </div>

          {/* Temperature display */}
          <div className="text-center mb-4">
            <div className="text-3xl font-bold" style={{ color: getTempColor(chemicalTemp) }}>
              {chemicalTemp.toFixed(1)}C
            </div>
            <div className="text-sm text-slate-400">Current Temperature</div>
          </div>

          {/* Temperature graph */}
          <div className="flex justify-center">
            {renderTemperatureGraph()}
          </div>
        </div>
      </div>

      {/* Physics explanation */}
      <div className={`mt-6 p-4 rounded-xl max-w-xl w-full ${
        isReacting ? "bg-orange-900/30 border border-orange-600" :
        reactionProgress >= 100 ? "bg-emerald-900/30 border border-emerald-600" : "bg-blue-900/30 border border-blue-600"
      }`}>
        {!isReacting && reactionProgress === 0 && (
          <>
            <h3 className="font-bold text-blue-400 mb-2">Ready to React</h3>
            <p className="text-sm text-slate-300">
              Iron powder, salt (catalyst), and oxygen are the key ingredients. The salt speeds up
              the oxidation reaction. More iron and oxygen means more heat!
            </p>
          </>
        )}
        {isReacting && (
          <>
            <h3 className="font-bold text-orange-400 mb-2">Exothermic Reaction!</h3>
            <p className="text-sm text-slate-300">
              4Fe + 3O2 → 2Fe2O3 + heat. Iron is oxidizing (rusting) rapidly, releasing thermal energy.
              The salt acts as a catalyst, not consumed in the reaction.
            </p>
          </>
        )}
        {reactionProgress >= 100 && !isReacting && (
          <>
            <h3 className="font-bold text-emerald-400 mb-2">Reaction Complete</h3>
            <p className="text-sm text-slate-300">
              All the iron has been oxidized to rust (Fe2O3). This is why disposable hand warmers
              cannot be reused—the chemical reaction is irreversible.
            </p>
          </>
        )}
      </div>

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl"
      >
        Learn the Science
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">The Science of Exothermic Reactions</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-orange-900/40 to-red-900/40 rounded-2xl p-6 border border-orange-600/30">
          <h3 className="text-xl font-bold text-orange-400 mb-3">Iron Oxidation (Disposable)</h3>
          <p className="text-slate-300 text-sm mb-3">
            Chemical warmers use iron powder, salt, and activated carbon. When exposed to air:
          </p>
          <div className="font-mono text-center text-lg text-orange-400 mb-2">
            4Fe + 3O2 → 2Fe2O3 + heat
          </div>
          <ul className="text-slate-400 text-sm space-y-1">
            <li>- Salt acts as a catalyst (speeds reaction)</li>
            <li>- Produces ~50C for 6-12 hours</li>
            <li>- Irreversible (single use)</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-2xl p-6 border border-blue-600/30">
          <h3 className="text-xl font-bold text-blue-400 mb-3">Phase Change (Reusable)</h3>
          <p className="text-slate-300 text-sm mb-3">
            Sodium acetate releases latent heat when it crystallizes from a supercooled liquid state:
          </p>
          <div className="font-mono text-center text-lg text-blue-400 mb-2">
            Lf = 264 kJ/kg
          </div>
          <ul className="text-slate-400 text-sm space-y-1">
            <li>- Nucleation triggers crystallization</li>
            <li>- Produces 54C for 30-60 min</li>
            <li>- Boil to reset and reuse</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 border border-purple-600/30 md:col-span-2">
          <h3 className="text-xl font-bold text-purple-400 mb-3">Key Physics Concepts</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="font-medium text-white">Exothermic Reaction</p>
              <p className="text-slate-400">Energy is released to surroundings (negative enthalpy change)</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="font-medium text-white">Catalyst Effect</p>
              <p className="text-slate-400">Salt lowers activation energy, speeding the reaction</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="font-medium text-white">Supercooling</p>
              <p className="text-slate-400">Liquid below its freezing point without crystallizing</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="font-medium text-white">Latent Heat</p>
              <p className="text-slate-400">Energy released/absorbed during phase change</p>
            </div>
          </div>
        </div>
      </div>

      {prediction === "phase" && (
        <div className="mt-6 p-4 bg-emerald-900/30 rounded-xl border border-emerald-600 max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! Phase change warmers release latent heat of fusion during crystallization.
          </p>
        </div>
      )}

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ zIndex: 10 }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
      >
        Ready for a Twist?
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Comparison Twist</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          There are two types of hand warmers:
        </p>
        <ul className="space-y-2 text-slate-300">
          <li><strong className="text-blue-400">Phase-change:</strong> Sodium acetate crystallization (reusable)</li>
          <li><strong className="text-orange-400">Chemical:</strong> Iron oxidation/rusting (disposable)</li>
        </ul>
        <p className="text-lg text-amber-400 font-medium mt-4">
          Which type provides heat for LONGER?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: "phase", text: "Phase-change—crystals release heat slowly" },
          { id: "chemical", text: "Chemical—slow oxidation lasts hours" },
          { id: "same", text: "Both last about the same time" },
          { id: "depends", text: "Depends entirely on size" }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => {
              setTwistPrediction(option.id);
              playSound("click");
            }}
            style={{ zIndex: 10 }}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              twistPrediction === option.id
                ? option.id === "chemical" ? "bg-emerald-600/40 border-2 border-emerald-400" : "bg-purple-600/40 border-2 border-purple-400"
                : "bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent"
            }`}
          >
            <span className="text-slate-200">{option.text}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className={`font-semibold ${twistPrediction === "chemical" ? "text-emerald-400" : "text-amber-400"}`}>
            {twistPrediction === "chemical"
              ? "Correct! Chemical warmers last much longer (6-12 hours vs 30-60 min)!"
              : "Not quite—chemical warmers actually last much longer!"}
          </p>
          <button
            onClick={() => onPhaseComplete?.()}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
          >
            Compare Both Types
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Reusable vs Disposable Comparison</h2>
      <p className="text-slate-400 mb-6">Compare phase-change crystallization vs iron oxidation!</p>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => {
            setWarmerType("phase");
            resetTwist();
          }}
          style={{ zIndex: 10 }}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            warmerType === "phase"
              ? "bg-blue-600 text-white"
              : "bg-slate-700 text-slate-300"
          }`}
        >
          Phase-Change (Reusable)
        </button>
        <button
          onClick={() => {
            setWarmerType("chemical");
            resetTwist();
          }}
          style={{ zIndex: 10 }}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            warmerType === "chemical"
              ? "bg-orange-600 text-white"
              : "bg-slate-700 text-slate-300"
          }`}
        >
          Chemical (Disposable)
        </button>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6">
        {renderComparisonVisualization()}

        <div className="flex gap-2 mt-4">
          {twistState === "inactive" && (
            <button
              onClick={warmerType === "phase" ? activatePhaseWarmer : activateChemicalWarmer}
              style={{ zIndex: 10 }}
              className={`flex-1 py-3 rounded-lg font-bold ${
                warmerType === "phase"
                  ? "bg-blue-600 text-white hover:bg-blue-500"
                  : "bg-orange-600 text-white hover:bg-orange-500"
              }`}
            >
              {warmerType === "phase" ? "Click Disc (Crystallize)" : "Open Air Vent (Oxidize)"}
            </button>
          )}
          {twistState !== "inactive" && (
            <button
              onClick={resetTwist}
              style={{ zIndex: 10 }}
              className="flex-1 py-3 bg-slate-600 text-white rounded-lg font-bold"
            >
              {warmerType === "phase" ? "Boil to Reset" : "Replace (Disposable)"}
            </button>
          )}
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-4 max-w-xl mb-6">
        <div className={`p-4 rounded-xl border ${warmerType === 'phase' ? 'bg-blue-900/30 border-blue-600' : 'bg-slate-800/30 border-slate-600'}`}>
          <h4 className="font-bold text-blue-400 text-sm mb-2">Phase-Change</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>- Heats quickly to 54C</li>
            <li>- Duration: 30-60 min</li>
            <li>- Reusable (boil to reset)</li>
            <li>- Crystallization releases latent heat</li>
          </ul>
        </div>
        <div className={`p-4 rounded-xl border ${warmerType === 'chemical' ? 'bg-orange-900/30 border-orange-600' : 'bg-slate-800/30 border-slate-600'}`}>
          <h4 className="font-bold text-orange-400 text-sm mb-2">Chemical</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>- Heats slowly to ~50C</li>
            <li>- Duration: 6-12 hours</li>
            <li>- Single-use (disposable)</li>
            <li>- Oxidation releases chemical energy</li>
          </ul>
        </div>
      </div>

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ zIndex: 10 }}
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
      >
        See Explanation
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Activation Mechanisms Compared</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-2xl p-6 border border-blue-600/30">
          <h3 className="text-xl font-bold text-blue-400 mb-3">Phase-Change Activation</h3>
          <div className="space-y-3 text-sm">
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="font-medium text-white">1. Supercooled State</p>
              <p className="text-slate-400">Sodium acetate stays liquid below 54C (no crystal seeds)</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="font-medium text-white">2. Metal Disc Clicked</p>
              <p className="text-slate-400">Creates nucleation site for crystal formation</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="font-medium text-white">3. Chain Reaction</p>
              <p className="text-slate-400">Crystals spread rapidly, releasing 264 kJ/kg</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="font-medium text-white">4. Recharge</p>
              <p className="text-slate-400">Boil to dissolve crystals, cool carefully</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-900/40 to-red-900/40 rounded-2xl p-6 border border-orange-600/30">
          <h3 className="text-xl font-bold text-orange-400 mb-3">Chemical Activation</h3>
          <div className="space-y-3 text-sm">
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="font-medium text-white">1. Sealed Package</p>
              <p className="text-slate-400">Iron, salt, carbon stored without oxygen</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="font-medium text-white">2. Air Exposure</p>
              <p className="text-slate-400">Opening package lets oxygen reach iron</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="font-medium text-white">3. Oxidation</p>
              <p className="text-slate-400">4Fe + 3O2 → 2Fe2O3 + heat (slow, sustained)</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="font-medium text-white">4. Depleted</p>
              <p className="text-slate-400">All iron oxidized = no more heat = discard</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-2xl p-6 border border-emerald-600/30 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Choose the Right One</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="font-medium text-slate-300">Quick warmth, short trips:</p>
              <p className="text-blue-400 font-semibold">Phase-change (reusable)</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="font-medium text-slate-300">All-day outdoor activity:</p>
              <p className="text-orange-400 font-semibold">Chemical (disposable)</p>
            </div>
          </div>
        </div>
      </div>

      {twistPrediction === "chemical" && (
        <div className="mt-6 p-4 bg-emerald-900/30 rounded-xl border border-emerald-600 max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! Chemical warmers last 6-12 hours because oxidation is a slow, sustained reaction.
          </p>
        </div>
      )}

      <button
        onClick={() => onPhaseComplete?.()}
        style={{ zIndex: 10 }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-teal-600 to-blue-600 text-white font-semibold rounded-xl"
      >
        See Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Phase Change Energy in the Real World</h2>

      <div className="space-y-4 max-w-2xl w-full">
        {applications.map((app, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              completedApps.has(index)
                ? "bg-emerald-900/30 border-emerald-600"
                : currentApp === index
                ? "bg-blue-900/30 border-blue-600"
                : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
            }`}
            onClick={() => {
              if (!completedApps.has(index)) {
                setCurrentApp(index);
                playSound("click");
              }
            }}
            style={{ zIndex: 10 }}
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">
                {app.icon === 'glove' && <span role="img" aria-label="glove">&#129350;</span>}
                {app.icon === 'building' && <span role="img" aria-label="building">&#127970;</span>}
                {app.icon === 'package' && <span role="img" aria-label="package">&#128230;</span>}
                {app.icon === 'satellite' && <span role="img" aria-label="satellite">&#128752;</span>}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white">{app.title}</h3>
                  {completedApps.has(index) && (
                    <span className="text-emerald-400">&#10003;</span>
                  )}
                </div>
                {(currentApp === index || completedApps.has(index)) && (
                  <p className="text-slate-300 text-sm mt-2">{app.description}</p>
                )}
              </div>
            </div>

            {currentApp === index && !completedApps.has(index) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newCompleted = new Set(completedApps);
                  newCompleted.add(index);
                  setCompletedApps(newCompleted);
                  playSound("success");

                  if (newCompleted.size < applications.length) {
                    const nextIncomplete = applications.findIndex(
                      (_, i) => !newCompleted.has(i)
                    );
                    setCurrentApp(nextIncomplete);
                  }
                }}
                style={{ zIndex: 10 }}
                className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500"
              >
                Got It!
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">
          {applications.map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />
          ))}
        </div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>

      {completedApps.size === applications.length && (
        <button
          onClick={() => onPhaseComplete?.()}
          style={{ zIndex: 10 }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
        >
          Take the Quiz
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Test Your Knowledge</h2>

      {!testSubmitted ? (
        <div className="space-y-6 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <p className="font-medium text-white mb-3">
                {qIndex + 1}. {q.question}
              </p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onClick={() => {
                      setTestAnswers((prev) => ({ ...prev, [qIndex]: oIndex }));
                      playSound("click");
                    }}
                    style={{ zIndex: 10 }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? "bg-orange-600 text-white"
                        : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50"
                    }`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(testAnswers).length === testQuestions.length && (
            <button
              onClick={handleTestSubmit}
              style={{ zIndex: 10 }}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold text-lg"
            >
              Submit Answers
            </button>
          )}
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">{testScore >= 7 ? <span role="img" aria-label="celebration">&#127881;</span> : <span role="img" aria-label="books">&#128218;</span>}</div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {testScore} / {testQuestions.length}
          </h3>
          <p className="text-slate-300 mb-6">
            {testScore >= 7
              ? "Excellent! You understand hand warmer thermodynamics!"
              : "Review the concepts and try again!"}
          </p>

          {testScore >= 7 ? (
            <button
              onClick={() => { onCorrectAnswer?.(); onPhaseComplete?.(); }}
              style={{ zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-xl"
            >
              Claim Your Mastery!
            </button>
          ) : (
            <button
              onClick={() => {
                setTestSubmitted(false);
                setTestAnswers({});
                onIncorrectAnswer?.();
              }}
              style={{ zIndex: 10 }}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl"
            >
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="text-8xl mb-6">
        <span role="img" aria-label="trophy">&#127942;</span>
      </div>
      <h2 className="text-3xl font-bold text-yellow-400 mb-4">Mastery Achieved!</h2>
      <p className="text-xl text-slate-300 mb-6 max-w-md">
        You've mastered the physics of hand warmers and exothermic reactions!
      </p>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-md">
        <h3 className="text-lg font-bold text-white mb-3">Key Concepts Mastered:</h3>
        <ul className="text-slate-300 text-sm space-y-2 text-left">
          <li>&#10003; Iron oxidation: 4Fe + 3O2 → 2Fe2O3 + heat</li>
          <li>&#10003; Latent heat of fusion (264 kJ/kg for sodium acetate)</li>
          <li>&#10003; Supercooling and nucleation</li>
          <li>&#10003; Catalysts in chemical reactions</li>
          <li>&#10003; Reusable vs disposable warmer mechanisms</li>
        </ul>
      </div>
    </div>
  );

  // Main render
  switch (phase) {
    case 'hook':
      return renderHook();
    case 'predict':
      return renderPredict();
    case 'play':
      return renderPlay();
    case 'review':
      return renderReview();
    case 'twist_predict':
      return renderTwistPredict();
    case 'twist_play':
      return renderTwistPlay();
    case 'twist_review':
      return renderTwistReview();
    case 'transfer':
      return renderTransfer();
    case 'test':
      return renderTest();
    case 'mastery':
      return renderMastery();
    default:
      return renderHook();
  }
}
