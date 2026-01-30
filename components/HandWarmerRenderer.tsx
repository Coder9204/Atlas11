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

  // Render temperature graph
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

    return (
      <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} style={{ width: '100%', maxWidth: '280px', background: '#1e293b', borderRadius: '8px' }}>
        {/* Grid lines */}
        {[0, 25, 50].map((temp, i) => {
          const y = graphHeight - padding - ((temp - minHistoryTemp) / (maxHistoryTemp - minHistoryTemp)) * (graphHeight - 2 * padding);
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={graphWidth - padding} y2={y} stroke="#374151" strokeWidth="1" strokeDasharray="2,2" />
              <text x={padding - 5} y={y + 4} fontSize="8" fill="#94a3b8" textAnchor="end">{temp}C</text>
            </g>
          );
        })}

        {/* Temperature line */}
        <polyline
          points={points}
          fill="none"
          stroke={getTempColor(chemicalTemp)}
          strokeWidth="2"
        />

        {/* Current temperature dot */}
        {temperatureHistory.length > 0 && (
          <circle
            cx={padding + ((temperatureHistory.length - 1) / 50) * (graphWidth - 2 * padding)}
            cy={graphHeight - padding - ((temperatureHistory[temperatureHistory.length - 1] - minHistoryTemp) / (maxHistoryTemp - minHistoryTemp)) * (graphHeight - 2 * padding)}
            r="4"
            fill={getTempColor(chemicalTemp)}
          />
        )}

        {/* Labels */}
        <text x={graphWidth / 2} y={graphHeight - 2} fontSize="9" fill="#94a3b8" textAnchor="middle">Time</text>
        <text x={graphWidth / 2} y={12} fontSize="10" fill="#e2e8f0" textAnchor="middle" fontWeight="bold">Temperature vs Time</text>
      </svg>
    );
  };

  // Render iron oxidation animation
  const renderIronOxidationAnimation = () => {
    const ironParticles = [];
    const oxygenParticles = [];
    const rustParticles = [];

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
      <svg viewBox="0 0 160 160" style={{ width: '100%', maxWidth: '160px' }}>
        <rect width="160" height="160" fill="#1e293b" rx="8" />

        {/* Iron particles */}
        {ironParticles.map((p, i) => (
          <circle key={`iron-${i}`} cx={p.x} cy={p.y} r="8" fill="#6b7280" opacity={p.opacity} />
        ))}

        {/* Oxygen particles */}
        {oxygenParticles.map((p, i) => (
          <circle key={`oxygen-${i}`} cx={p.x} cy={p.y} r="5" fill="#3b82f6" opacity={p.opacity} />
        ))}

        {/* Rust particles */}
        {rustParticles.map((p, i) => (
          <circle key={`rust-${i}`} cx={p.x} cy={p.y} r="10" fill="#b45309" opacity={p.opacity} />
        ))}

        {/* Heat waves when reacting */}
        {isReacting && heatOutput > 5 && (
          <g>
            {[0, 1, 2].map((i) => {
              const offset = (animationFrame + i * 20) % 40;
              return (
                <path
                  key={i}
                  d={`M ${60 + i * 20} ${30 - offset} Q ${65 + i * 20} ${25 - offset} ${60 + i * 20} ${20 - offset}`}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  opacity={(40 - offset) / 40}
                />
              );
            })}
          </g>
        )}

        {/* Reaction equation */}
        <text x="80" y="150" textAnchor="middle" fontSize="8" fill="#94a3b8">
          4Fe + 3O2 = 2Fe2O3 + heat
        </text>
      </svg>
    );
  };

  // Render heat output indicator
  const renderHeatOutputIndicator = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Heat Output</div>
        <div style={{
          width: '60px',
          height: '120px',
          background: '#1f2937',
          borderRadius: '8px',
          position: 'relative',
          overflow: 'hidden',
          border: '2px solid #374151'
        }}>
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${heatOutput * 3}%`,
            background: `linear-gradient(to top, ${getTempColor(chemicalTemp)}, ${getTempColor(chemicalTemp)}88)`,
            transition: 'height 0.3s'
          }} />
          {/* Scale markers */}
          {[0, 25, 50, 75, 100].map((val, i) => (
            <div key={i} style={{
              position: 'absolute',
              bottom: `${val}%`,
              left: 0,
              right: 0,
              borderTop: '1px solid #374151',
              fontSize: '6px',
              color: '#64748b',
              paddingLeft: '2px'
            }}>
              {val > 0 && val < 100 ? `${val}%` : ''}
            </div>
          ))}
        </div>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: getTempColor(chemicalTemp) }}>
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

  // Render hand warmer visualization (phase change)
  const renderHandWarmer = () => {
    const isLiquid = warmerState === "liquid";
    const isCrystallizing = warmerState === "crystallizing";
    const isSolid = warmerState === "solid";

    return (
      <svg viewBox="0 0 400 400" className="w-full max-w-md mx-auto">
        <rect width="400" height="400" fill="#1e293b" />

        <ellipse
          cx="200"
          cy="220"
          rx="130"
          ry="100"
          fill={isLiquid ? "#0ea5e9" : isCrystallizing ? "#38bdf8" : "#64748b"}
          stroke="#475569"
          strokeWidth={3}
          opacity={0.8}
        />

        {isLiquid && (
          <>
            <ellipse
              cx={180 + Math.sin(animationFrame / 20) * 10}
              cy={200}
              rx={80}
              ry={50}
              fill="rgba(255,255,255,0.2)"
            />
            <ellipse
              cx={220}
              cy={240 + Math.cos(animationFrame / 15) * 5}
              rx={60}
              ry={30}
              fill="rgba(255,255,255,0.15)"
            />
          </>
        )}

        {(isCrystallizing || isSolid) && (
          <g>
            {crystalPoints.map((point, i) => (
              <g key={i} transform={`translate(${point.x}, ${point.y})`}>
                <polygon
                  points={`0,${-point.size} ${point.size * 0.866},${-point.size / 2} ${point.size * 0.866},${point.size / 2} 0,${point.size} ${-point.size * 0.866},${point.size / 2} ${-point.size * 0.866},${-point.size / 2}`}
                  fill="rgba(255,255,255,0.8)"
                  stroke="#94a3b8"
                  strokeWidth={0.5}
                />
              </g>
            ))}
          </g>
        )}

        {/* Crystallization wave */}
        {isCrystallizing && (
          <circle
            cx="200"
            cy="180"
            r={crystalWaveRadius}
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="4"
          />
        )}

        <g transform="translate(200, 180)">
          <circle
            r={20}
            fill={discClicked ? "#475569" : "#64748b"}
            stroke="#334155"
            strokeWidth={2}
            style={{ cursor: isLiquid ? "pointer" : "default" }}
            onClick={isLiquid ? activateWarmer : undefined}
          />
          <circle r={15} fill="none" stroke="#94a3b8" strokeWidth={1} />
          <circle r={8} fill="#94a3b8" />
          {!discClicked && isLiquid && (
            <text y={45} textAnchor="middle" fontSize="11" fill="#94a3b8">
              Click disc to activate
            </text>
          )}
        </g>

        {isCrystallizing && (
          <ellipse
            cx="200"
            cy="220"
            rx={crystalProgress * 1.3}
            ry={crystalProgress}
            fill="none"
            stroke="#ffffff"
            strokeWidth={4}
            opacity={0.6}
          />
        )}

        {temperature > 30 && (
          <g>
            {[0, 1, 2].map((i) => {
              const offset = (animationFrame + i * 30) % 60;
              return (
                <path
                  key={i}
                  d={`M ${150 + i * 50} ${120 - offset} Q ${160 + i * 50} ${110 - offset} ${150 + i * 50} ${100 - offset}`}
                  fill="none"
                  stroke={getTempColor(temperature)}
                  strokeWidth={2}
                  opacity={1 - offset / 60}
                />
              );
            })}
          </g>
        )}

        <g transform="translate(330, 200)">
          <rect x={-25} y={-60} width={50} height={120} fill="#1f2937" stroke="#374151" rx={5} />
          <rect
            x={-15}
            y={50 - (temperature - 15) * 2}
            width={30}
            height={(temperature - 15) * 2}
            fill={getTempColor(temperature)}
            rx={3}
          />
          <text x={0} y={-70} textAnchor="middle" fontSize="12" fill="#e2e8f0">
            {temperature.toFixed(1)}C
          </text>
        </g>

        <text x="200" y="350" textAnchor="middle" fontSize="14" fill="#e2e8f0" fontWeight="bold">
          {isLiquid ? "Supercooled Liquid (Ready)" :
           isCrystallizing ? `Crystallizing... ${crystalProgress.toFixed(0)}%` :
           "Crystallized (Releasing Heat)"}
        </text>

        <text x="200" y="375" textAnchor="middle" fontSize="11" fill="#94a3b8">
          Latent Heat: {latentHeatFusion} kJ/kg | Melting Point: {meltingPoint}C
        </text>
      </svg>
    );
  };

  // Render comparison visualization for twist
  const renderComparisonVisualization = () => {
    return (
      <svg viewBox="0 0 400 300" className="w-full max-w-md mx-auto">
        <rect width="400" height="300" fill="#1e293b" />

        <ellipse
          cx="200"
          cy="120"
          rx="100"
          ry="70"
          fill={
            warmerType === "phase"
              ? twistState === "inactive" ? "#0ea5e9" : twistState === "active" ? "#fbbf24" : "#64748b"
              : twistState === "inactive" ? "#f97316" : twistState === "active" ? "#ef4444" : "#64748b"
          }
          stroke="#475569"
          strokeWidth={2}
          opacity={0.8}
        />

        {/* Crystallization animation for phase warmer */}
        {warmerType === "phase" && twistState === "active" && (
          <g>
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i / 8) * Math.PI * 2 + animationFrame / 20;
              const radius = 30 + (100 - energyRemaining) * 0.4;
              return (
                <polygon
                  key={i}
                  points={`0,-5 4,-2 4,2 0,5 -4,2 -4,-2`}
                  transform={`translate(${200 + Math.cos(angle) * radius}, ${120 + Math.sin(angle) * radius * 0.7})`}
                  fill="rgba(255,255,255,0.8)"
                />
              );
            })}
          </g>
        )}

        {/* Iron oxidation animation for chemical warmer */}
        {warmerType === "chemical" && twistState === "active" && (
          <g>
            {Array.from({ length: 6 }).map((_, i) => {
              const angle = (i / 6) * Math.PI * 2 + animationFrame / 15;
              const radius = 40;
              return (
                <circle
                  key={i}
                  cx={200 + Math.cos(angle) * radius}
                  cy={120 + Math.sin(angle) * radius * 0.6}
                  r={5}
                  fill="#b45309"
                  opacity={0.8}
                />
              );
            })}
          </g>
        )}

        {twistState === "active" && (
          <g>
            {[0, 1, 2].map((i) => {
              const offset = (animationFrame + i * 25) % 50;
              return (
                <path
                  key={i}
                  d={`M ${140 + i * 40} ${50 - offset} Q ${150 + i * 40} ${40 - offset} ${140 + i * 40} ${30 - offset}`}
                  fill="none"
                  stroke={getTempColor(twistTemperature)}
                  strokeWidth={2}
                  opacity={1 - offset / 50}
                />
              );
            })}
          </g>
        )}

        <text x="200" y="130" textAnchor="middle" fontSize="24" fill="#e2e8f0" fontWeight="bold">
          {twistTemperature.toFixed(1)}C
        </text>

        <g transform="translate(100, 200)">
          <text x="100" y="-10" textAnchor="middle" fontSize="12" fill="#94a3b8">
            Energy Remaining: {energyRemaining.toFixed(0)}%
          </text>
          <rect width="200" height="20" fill="#1f2937" rx={5} />
          <rect
            width={energyRemaining * 2}
            height="20"
            fill={energyRemaining > 50 ? "#22c55e" : energyRemaining > 20 ? "#f97316" : "#ef4444"}
            rx={5}
          />
        </g>

        <text x="200" y="250" textAnchor="middle" fontSize="14" fill="#e2e8f0" fontWeight="bold">
          {warmerType === "phase" ? "Phase-Change (Reusable)" : "Chemical (Disposable)"}
        </text>
        <text x="200" y="270" textAnchor="middle" fontSize="11" fill="#94a3b8">
          {warmerType === "phase"
            ? "Sodium acetate crystallization"
            : "4Fe + 3O2 = 2Fe2O3 + heat"}
        </text>

        <text x="200" y="290" textAnchor="middle" fontSize="12" fill={
          twistState === "inactive" ? "#0ea5e9" :
          twistState === "active" ? "#f97316" : "#64748b"
        }>
          {twistState === "inactive" ? "Ready" :
           twistState === "active" ? "Heating..." : "Depleted"}
        </text>
      </svg>
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
