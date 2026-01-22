"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

// Game event interface for AI coach integration
interface GameEvent {
  type: string;
  data?: Record<string, unknown>;
  timestamp: number;
  phase: string;
}

// Numeric phases: 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery
const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook', 1: 'Predict', 2: 'Lab', 3: 'Review', 4: 'Twist Predict',
  5: 'Twist Lab', 6: 'Twist Review', 7: 'Transfer', 8: 'Test', 9: 'Mastery'
};

// Props interface
interface HandWarmerRendererProps {
  onBack?: () => void;
  onGameEvent?: (event: GameEvent) => void;
  onPhaseComplete?: (phase: number) => void;
}

// Play crystallization sound
const playCrystallizeSound = (): void => {
  if (typeof window === "undefined") return;
  try {
    const audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();

    // Create crackling/crystallization sound
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
  onBack,
  onGameEvent,
  onPhaseComplete,
}: HandWarmerRendererProps) {
  // Core state
  const [phase, setPhase] = useState<number>(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<number, number>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [currentApp, setCurrentApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Game-specific state
  const [warmerState, setWarmerState] = useState<"liquid" | "crystallizing" | "solid">("liquid");
  const [temperature, setTemperature] = useState(20);
  const [crystalProgress, setCrystalProgress] = useState(0);
  const [crystalPoints, setCrystalPoints] = useState<{ x: number; y: number; size: number }[]>([]);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [discClicked, setDiscClicked] = useState(false);

  // Twist state - comparing warmer types
  const [warmerType, setWarmerType] = useState<"phase" | "chemical">("phase");
  const [twistTemperature, setTwistTemperature] = useState(20);
  const [twistState, setTwistState] = useState<"inactive" | "active" | "depleted">("inactive");
  const [energyRemaining, setEnergyRemaining] = useState(100);

  // Constants
  const latentHeatFusion = 264; // kJ/kg for sodium acetate
  const meltingPoint = 54; // °C
  const maxTemp = 54; // Reaches melting point during crystallization

  // Sound utility
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

  // Emit game events
  const emitEvent = useCallback(
    (type: string, data?: Record<string, unknown>) => {
      if (onGameEvent) {
        onGameEvent({ type, data, timestamp: Date.now(), phase: phaseLabels[phase] });
      }
    },
    [onGameEvent, phase]
  );

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame((f) => (f + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

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

      // Add crystal points
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

      // Update temperature
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

  // Activate the hand warmer
  const activateWarmer = () => {
    if (warmerState !== "liquid") return;
    setDiscClicked(true);
    playCrystallizeSound();

    setTimeout(() => {
      setWarmerState("crystallizing");
      emitEvent("warmer_activated", { type: "phase_change" });
    }, 300);
  };

  // Reset the warmer (simulates boiling to reset)
  const resetWarmer = () => {
    setWarmerState("liquid");
    setTemperature(20);
    setCrystalProgress(0);
    setCrystalPoints([]);
    setDiscClicked(false);
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
        // Chemical warmers heat up and slowly deplete
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
        // Phase change warmers heat quickly, stay at melting point, then cool
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

  // Navigate to phase
  const goToPhase = useCallback(
    (newPhase: number) => {
      if (navigationLockRef.current) return;
      const now = Date.now();
      if (now - lastClickRef.current < 200) return;
      lastClickRef.current = now;

      navigationLockRef.current = true;
      playSound("transition");
      emitEvent("phase_change", { from: phase, to: newPhase });
      setPhase(newPhase);
      setShowExplanation(false);
      onPhaseComplete?.(newPhase);

      setTimeout(() => {
        navigationLockRef.current = false;
      }, 400);
    },
    [phase, emitEvent, playSound, onPhaseComplete]
  );

  // Test questions
  const testQuestions = [
    {
      question: "What is 'latent heat of fusion'?",
      options: [
        "Heat needed to change temperature",
        "Energy released or absorbed during phase change (solid-liquid)",
        "Heat from nuclear fusion",
        "Temperature of melting"
      ],
      correct: 1,
      explanation:
        "Latent heat of fusion is the energy released (freezing) or absorbed (melting) during the solid-liquid phase transition, without changing temperature."
    },
    {
      question: "Why can sodium acetate stay liquid below its freezing point (54C)?",
      options: [
        "It's not real sodium acetate",
        "The container keeps it warm",
        "Without nucleation sites, crystals can't form (supercooling)",
        "It has no freezing point"
      ],
      correct: 2,
      explanation:
        "Supersaturated/supercooled solutions need a 'seed' or nucleation site to start crystallization. Without disturbance, they remain liquid below freezing point."
    },
    {
      question: "When the metal disc is clicked, what happens?",
      options: [
        "It heats the solution electrically",
        "It creates a nucleation site that triggers crystallization",
        "It mixes chemicals together",
        "It releases stored heat directly"
      ],
      correct: 1,
      explanation:
        "The disc's deformation creates a tiny crystal that acts as a nucleation site. Crystallization spreads rapidly from this point, releasing latent heat."
    },
    {
      question: "During crystallization, the hand warmer's temperature:",
      options: [
        "Drops to freezing",
        "Rises to the melting/freezing point and stays there",
        "Fluctuates randomly",
        "Stays at room temperature"
      ],
      correct: 1,
      explanation:
        "As crystals form, latent heat is released, heating the solution to its melting point (54C). It stays there until crystallization completes."
    },
    {
      question: "How do you 'recharge' a reusable hand warmer?",
      options: [
        "Plug it into electricity",
        "Add more chemicals",
        "Boil it in water to re-dissolve the crystals",
        "Let it sit overnight"
      ],
      correct: 2,
      explanation:
        "Heating the crystallized sodium acetate above 54C re-dissolves the crystals. When cooled carefully, it becomes supercooled liquid again, ready to reuse."
    },
    {
      question: "Chemical (iron oxidation) hand warmers differ from phase-change ones because:",
      options: [
        "They're reusable",
        "They produce heat through irreversible chemical reaction",
        "They work faster",
        "They get hotter"
      ],
      correct: 1,
      explanation:
        "Chemical warmers use iron oxidation (rusting), which is irreversible. Once the iron is oxidized, the warmer is depleted and must be discarded."
    },
    {
      question: "The latent heat of fusion for sodium acetate is about 264 kJ/kg. This means:",
      options: [
        "It heats up 264C",
        "264 kJ is released when 1 kg crystallizes",
        "It takes 264 kg to heat it",
        "264 is its melting point"
      ],
      correct: 1,
      explanation:
        "Latent heat is energy per unit mass. When 1 kg of liquid sodium acetate crystallizes, it releases 264 kJ of heat energy."
    },
    {
      question: "Why does the crystallization spread so rapidly after the disc is clicked?",
      options: [
        "The disc is very hot",
        "Each new crystal triggers neighbors to crystallize (chain reaction)",
        "The solution is compressed",
        "Air rushes in"
      ],
      correct: 1,
      explanation:
        "Once crystallization starts, each new crystal surface acts as a nucleation site for more crystallization. This creates a rapid chain reaction."
    },
    {
      question: "A supercooled liquid is:",
      options: [
        "Colder than absolute zero",
        "A liquid below its normal freezing point",
        "A very cold solid",
        "Liquid nitrogen"
      ],
      correct: 1,
      explanation:
        "Supercooled liquids remain liquid below their freezing point due to lack of nucleation sites. They're metastable and can crystallize suddenly when disturbed."
    },
    {
      question: "Ice packs that stay cold for hours work by:",
      options: [
        "Being very well insulated",
        "Absorbing latent heat during melting (opposite of hand warmers)",
        "Chemical reactions that make cold",
        "Containing supercold liquid"
      ],
      correct: 1,
      explanation:
        "Melting absorbs latent heat from surroundings. Ice packs stay at 0C while melting because the absorbed heat goes into phase change, not temperature rise."
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
      if (testAnswers[i] === q.correct) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    emitEvent("test_submitted", { score, total: testQuestions.length });

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

  // Render hand warmer visualization
  const renderHandWarmer = () => {
    const isLiquid = warmerState === "liquid";
    const isCrystallizing = warmerState === "crystallizing";
    const isSolid = warmerState === "solid";

    return (
      <svg viewBox="0 0 400 400" className="w-full max-w-md mx-auto">
        {/* Background */}
        <rect width="400" height="400" fill="#1e293b" />

        {/* Hand warmer pouch outline */}
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

        {/* Liquid shimmer effect */}
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

        {/* Crystal formation during crystallization */}
        {(isCrystallizing || isSolid) && (
          <g>
            {crystalPoints.map((point, i) => (
              <g key={i} transform={`translate(${point.x}, ${point.y})`}>
                {/* Hexagonal crystal shape */}
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

        {/* Metal disc (activation button) */}
        <g transform="translate(200, 180)">
          <circle
            r={20}
            fill={discClicked ? "#475569" : "#64748b"}
            stroke="#334155"
            strokeWidth={2}
            style={{ cursor: isLiquid ? "pointer" : "default" }}
            onMouseDown={isLiquid ? activateWarmer : undefined}
          />
          <circle r={15} fill="none" stroke="#94a3b8" strokeWidth={1} />
          <circle r={8} fill="#94a3b8" />
          {!discClicked && isLiquid && (
            <text y={45} textAnchor="middle" fontSize="11" fill="#94a3b8">
              Click disc to activate
            </text>
          )}
        </g>

        {/* Crystallization front (wave) */}
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

        {/* Heat waves emanating */}
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

        {/* Temperature display */}
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

        {/* State label */}
        <text x="200" y="350" textAnchor="middle" fontSize="14" fill="#e2e8f0" fontWeight="bold">
          {isLiquid ? "Supercooled Liquid (Ready)" :
           isCrystallizing ? `Crystallizing... ${crystalProgress.toFixed(0)}%` :
           "Crystallized (Releasing Heat)"}
        </text>

        {/* Energy info */}
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
        {/* Background */}
        <rect width="400" height="300" fill="#1e293b" />

        {/* Warmer pouch */}
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

        {/* Heat waves if active */}
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

        {/* Temperature */}
        <text x="200" y="130" textAnchor="middle" fontSize="24" fill="#e2e8f0" fontWeight="bold">
          {twistTemperature.toFixed(1)}C
        </text>

        {/* Energy bar */}
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

        {/* Labels */}
        <text x="200" y="250" textAnchor="middle" fontSize="14" fill="#e2e8f0" fontWeight="bold">
          {warmerType === "phase" ? "Phase-Change (Reusable)" : "Chemical (Disposable)"}
        </text>
        <text x="200" y="270" textAnchor="middle" fontSize="11" fill="#94a3b8">
          {warmerType === "phase"
            ? "Sodium acetate crystallization"
            : "Iron + oxygen -> rust + heat"}
        </text>

        {/* State indicator */}
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

  // Render hook phase
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-orange-400 tracking-wide">THERMAL PHYSICS</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-orange-100 to-yellow-200 bg-clip-text text-transparent">
        The Magic Hand Warmer
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover how a simple click unleashes hidden thermal energy
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-yellow-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">
            <span className="inline-block animate-pulse">&#129348;</span>
            <span className="mx-2">&#10052;&#65039;</span>
            <span className="inline-block">&#10132;</span>
            <span className="ml-2">&#128293;</span>
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

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover Phase Change Energy
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-orange-400">&#10022;</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-400">&#10022;</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-400">&#10022;</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  // Render predict phase
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
            onMouseDown={() => {
              setPrediction(option.id);
              playSound("click");
              emitEvent("prediction_made", { prediction: option.id });
            }}
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
            onMouseDown={() => goToPhase(2)}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl"
          >
            Test Your Prediction
          </button>
        </div>
      )}
    </div>
  );

  // Render play phase
  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Activate the Hand Warmer</h2>
      <p className="text-slate-400 mb-6 text-center max-w-md">
        Click the metal disc to trigger crystallization. Watch the temperature rise!
      </p>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6">
        {renderHandWarmer()}

        {warmerState === "solid" && (
          <button
            onMouseDown={resetWarmer}
            className="w-full mt-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition-colors"
          >
            Reset (Simulates Boiling)
          </button>
        )}
      </div>

      {/* Explanation of current state */}
      <div className={`p-4 rounded-xl mb-6 max-w-xl w-full ${
        warmerState === "liquid" ? "bg-blue-900/30 border border-blue-600" :
        warmerState === "crystallizing" ? "bg-yellow-900/30 border border-yellow-600" : "bg-emerald-900/30 border border-emerald-600"
      }`}>
        {warmerState === "liquid" && (
          <>
            <h3 className="font-bold text-blue-400 mb-2">Supercooled State</h3>
            <p className="text-sm text-slate-300">
              The sodium acetate is dissolved and stable at 20C—even though it
              "wants" to be solid below 54C! It's waiting for a trigger.
            </p>
          </>
        )}
        {warmerState === "crystallizing" && (
          <>
            <h3 className="font-bold text-yellow-400 mb-2">Crystallization!</h3>
            <p className="text-sm text-slate-300">
              The disc created a nucleation site. Crystals form rapidly, releasing
              {" "}{latentHeatFusion} kJ/kg of latent heat energy!
            </p>
          </>
        )}
        {warmerState === "solid" && (
          <>
            <h3 className="font-bold text-emerald-400 mb-2">Fully Crystallized</h3>
            <p className="text-sm text-slate-300">
              All the latent heat has been released. The warmer will slowly cool
              to room temperature. To reset, heat it above {meltingPoint}C.
            </p>
          </>
        )}
      </div>

      <button
        onMouseDown={() => goToPhase(3)}
        className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-xl"
      >
        Learn the Science
      </button>
    </div>
  );

  // Render review phase
  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">The Science of Phase Change Energy</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-orange-900/40 to-yellow-900/40 rounded-2xl p-6 border border-orange-600/30">
          <h3 className="text-xl font-bold text-orange-400 mb-3">Latent Heat of Fusion</h3>
          <p className="text-slate-300 text-sm mb-3">
            When matter changes phase (liquid to solid), energy is released or absorbed
            WITHOUT changing temperature. For sodium acetate:
          </p>
          <div className="font-mono text-center text-lg text-orange-400 mb-2">
            L<sub>f</sub> = 264 kJ/kg
          </div>
          <p className="text-slate-400 text-sm">
            That's enough to raise 1 kg of water by 63C!
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-2xl p-6 border border-blue-600/30">
          <h3 className="text-xl font-bold text-blue-400 mb-3">Supercooling</h3>
          <p className="text-slate-300 text-sm">
            Sodium acetate solution can remain liquid below its freezing point (54C)
            because crystal formation needs a "seed"—a nucleation site. The metal disc
            provides this trigger when flexed, creating a tiny crystal that starts
            a chain reaction.
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 border border-purple-600/30 md:col-span-2">
          <h3 className="text-xl font-bold text-purple-400 mb-3">Reusability</h3>
          <p className="text-slate-300 text-sm">
            Unlike chemical warmers, phase-change warmers can be reset! Boiling
            re-dissolves the crystals. When cooled carefully (no bumps!), it returns
            to the supercooled state—ready to use again.
          </p>
        </div>
      </div>

      {prediction === "phase" && (
        <div className="mt-6 p-4 bg-emerald-900/30 rounded-xl border border-emerald-600 max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! The heat comes from the latent heat of fusion—energy
            released when the liquid crystallizes into solid form.
          </p>
        </div>
      )}

      <button
        onMouseDown={() => goToPhase(4)}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
      >
        Ready for a Twist?
      </button>
    </div>
  );

  // Render twist predict phase
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
            onMouseDown={() => {
              setTwistPrediction(option.id);
              playSound("click");
              emitEvent("twist_prediction_made", { prediction: option.id });
            }}
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
            onMouseDown={() => goToPhase(5)}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
          >
            Compare Both Types
          </button>
        </div>
      )}
    </div>
  );

  // Render twist play phase
  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">Phase-Change vs Chemical</h2>
      <p className="text-slate-400 mb-6">Compare how the two types of hand warmers behave!</p>

      {/* Type selector */}
      <div className="flex gap-2 mb-6">
        <button
          onMouseDown={() => {
            setWarmerType("phase");
            resetTwist();
          }}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            warmerType === "phase"
              ? "bg-blue-600 text-white"
              : "bg-slate-700 text-slate-300"
          }`}
        >
          Phase-Change
        </button>
        <button
          onMouseDown={() => {
            setWarmerType("chemical");
            resetTwist();
          }}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            warmerType === "chemical"
              ? "bg-orange-600 text-white"
              : "bg-slate-700 text-slate-300"
          }`}
        >
          Chemical
        </button>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6">
        {renderComparisonVisualization()}

        <div className="flex gap-2 mt-4">
          {twistState === "inactive" && (
            <button
              onMouseDown={warmerType === "phase" ? activatePhaseWarmer : activateChemicalWarmer}
              className={`flex-1 py-3 rounded-lg font-bold ${
                warmerType === "phase"
                  ? "bg-blue-600 text-white hover:bg-blue-500"
                  : "bg-orange-600 text-white hover:bg-orange-500"
              }`}
            >
              Activate
            </button>
          )}
          {twistState !== "inactive" && (
            <button
              onMouseDown={resetTwist}
              className="flex-1 py-3 bg-slate-600 text-white rounded-lg font-bold"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Comparison info */}
      <div className="grid grid-cols-2 gap-4 max-w-xl mb-6">
        <div className="bg-blue-900/30 p-4 rounded-xl border border-blue-600/30">
          <h4 className="font-bold text-blue-400 text-sm mb-2">Phase-Change</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>Heats quickly (54C)</li>
            <li>Lasts ~30-60 min</li>
            <li>Reusable (boil to reset)</li>
          </ul>
        </div>
        <div className="bg-orange-900/30 p-4 rounded-xl border border-orange-600/30">
          <h4 className="font-bold text-orange-400 text-sm mb-2">Chemical</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>Heats slowly (~50C)</li>
            <li>Lasts 6-12 hours</li>
            <li>Single-use (disposable)</li>
          </ul>
        </div>
      </div>

      <button
        onMouseDown={() => goToPhase(6)}
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
      >
        See Explanation
      </button>
    </div>
  );

  // Render twist review phase
  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Two Types of Hand Warmers</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-2xl p-6 border border-blue-600/30">
          <h3 className="text-xl font-bold text-blue-400 mb-3">Phase-Change (Reusable)</h3>
          <ul className="text-slate-300 text-sm space-y-1">
            <li>Uses sodium acetate supercooling</li>
            <li>Releases heat through crystallization</li>
            <li>Reaches 54C quickly, lasts 30-60 min</li>
            <li>Can be recharged by boiling</li>
            <li>Eco-friendly (hundreds of uses)</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-orange-900/40 to-red-900/40 rounded-2xl p-6 border border-orange-600/30">
          <h3 className="text-xl font-bold text-orange-400 mb-3">Chemical (Disposable)</h3>
          <ul className="text-slate-300 text-sm space-y-1">
            <li>Uses iron oxidation: 4Fe + 3O2 -> 2Fe2O3 + heat</li>
            <li>Slow, sustained reaction</li>
            <li>Lower temp (~50C) but lasts 6-12 hours</li>
            <li>Irreversible (single use)</li>
            <li>Better for long outdoor activities</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-2xl p-6 border border-emerald-600/30 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Choose the Right One</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="font-medium text-slate-300">Quick warmth, short trips:</p>
              <p className="text-blue-400">Phase-change</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg">
              <p className="font-medium text-slate-300">All-day outdoor activity:</p>
              <p className="text-orange-400">Chemical</p>
            </div>
          </div>
        </div>
      </div>

      {twistPrediction === "chemical" && (
        <div className="mt-6 p-4 bg-emerald-900/30 rounded-xl border border-emerald-600 max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! Chemical warmers last much longer (6-12 hours vs 30-60 min)
            because oxidation is a slow, sustained reaction.
          </p>
        </div>
      )}

      <button
        onMouseDown={() => goToPhase(7)}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-teal-600 to-blue-600 text-white font-semibold rounded-xl"
      >
        See Real-World Applications
      </button>
    </div>
  );

  // Render transfer phase
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
            onMouseDown={() => {
              if (!completedApps.has(index)) {
                setCurrentApp(index);
                playSound("click");
              }
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">
                {app.icon === "glove" && "&#129348;"}
                {app.icon === "building" && "&#127970;"}
                {app.icon === "package" && "&#128230;"}
                {app.icon === "satellite" && "&#128752;"}
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
                onMouseDown={(e) => {
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
          onMouseDown={() => goToPhase(8)}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
        >
          Take the Quiz
        </button>
      )}
    </div>
  );

  // Render test phase
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
                    onMouseDown={() => {
                      setTestAnswers((prev) => ({ ...prev, [qIndex]: oIndex }));
                      playSound("click");
                    }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? "bg-orange-600 text-white"
                        : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(testAnswers).length === testQuestions.length && (
            <button
              onMouseDown={handleTestSubmit}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold text-lg"
            >
              Submit Answers
            </button>
          )}
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full text-center">
          <div className="text-6xl mb-4">{testScore >= 7 ? "&#127881;" : "&#128218;"}</div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {testScore} / {testQuestions.length}
          </h3>
          <p className="text-slate-300 mb-6">
            {testScore >= 7
              ? "Excellent! You understand phase change energy!"
              : "Review the concepts and try again!"}
          </p>

          {testScore >= 7 ? (
            <button
              onMouseDown={() => goToPhase(9)}
              className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-xl"
            >
              Claim Your Mastery!
            </button>
          ) : (
            <button
              onMouseDown={() => {
                setTestSubmitted(false);
                setTestAnswers({});
                goToPhase(3);
              }}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
            >
              Review and Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );

  // Render mastery phase
  const renderMastery = () => {
    if (!showConfetti) {
      setShowConfetti(true);
      playSound("complete");
      emitEvent("mastery_achieved", {});
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center relative">
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random()}s`,
                  fontSize: `${12 + Math.random() * 12}px`,
                }}
              >
                {["&#129348;", "&#128293;", "&#10052;&#65039;", "&#11088;", "&#10024;"][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        )}

        <div className="relative bg-gradient-to-br from-orange-900/50 via-yellow-900/50 to-red-900/50 rounded-3xl p-8 max-w-2xl border border-orange-600/30">
          <div className="text-8xl mb-6">&#127942;</div>
          <h1 className="text-3xl font-bold text-white mb-4">Phase Change Master!</h1>

          <p className="text-xl text-slate-300 mb-6">You've mastered latent heat and phase change energy!</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl mb-2">&#128293;</div>
              <p className="text-sm text-slate-300">Latent Heat</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl mb-2">&#10052;&#65039;</div>
              <p className="text-sm text-slate-300">Supercooling</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl mb-2">&#128142;</div>
              <p className="text-sm text-slate-300">Nucleation</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl mb-2">&#9851;&#65039;</div>
              <p className="text-sm text-slate-300">Reusability</p>
            </div>
          </div>

          <div className="p-4 bg-orange-900/30 rounded-xl border border-orange-600/30 mb-6">
            <p className="text-orange-300">
              Next time you use a hand warmer, you'll understand the
              amazing physics of phase transitions and latent heat!
            </p>
          </div>

          {onBack && (
            <button
              onMouseDown={onBack}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl"
            >
              Back to Games
            </button>
          )}
        </div>
      </div>
    );
  };

  // Main render
  const renderPhase = () => {
    switch (phase) {
      case 0: return renderHook();
      case 1: return renderPredict();
      case 2: return renderPlay();
      case 3: return renderReview();
      case 4: return renderTwistPredict();
      case 5: return renderTwistPlay();
      case 6: return renderTwistReview();
      case 7: return renderTransfer();
      case 8: return renderTest();
      case 9: return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Hand Warmer Physics</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-orange-400 w-6 shadow-lg shadow-orange-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-orange-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
}
