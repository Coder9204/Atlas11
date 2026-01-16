"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

// Game event interface for AI coach integration
interface GameEvent {
  type: string;
  data?: Record<string, unknown>;
  timestamp: number;
  phase: string;
}

// Phase type definition
type Phase =
  | "hook"
  | "predict"
  | "play"
  | "review"
  | "twist_predict"
  | "twist_play"
  | "twist_review"
  | "transfer"
  | "test"
  | "mastery";

// Props interface
interface HandWarmerRendererProps {
  onBack?: () => void;
  onGameEvent?: (event: GameEvent) => void;
}

// Sound utility
const playSound = (
  type: "click" | "success" | "failure" | "transition" | "complete"
): void => {
  if (typeof window === "undefined") return;
  try {
    const audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch (type) {
      case "click":
        oscillator.frequency.value = 600;
        gainNode.gain.value = 0.1;
        oscillator.type = "sine";
        break;
      case "success":
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.15;
        oscillator.type = "sine";
        break;
      case "failure":
        oscillator.frequency.value = 300;
        gainNode.gain.value = 0.15;
        oscillator.type = "sawtooth";
        break;
      case "transition":
        oscillator.frequency.value = 500;
        gainNode.gain.value = 0.1;
        oscillator.type = "triangle";
        break;
      case "complete":
        oscillator.frequency.value = 1000;
        gainNode.gain.value = 0.15;
        oscillator.type = "sine";
        break;
    }

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.2
    );
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch {
    // Audio not available
  }
};

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

// Phase validation helper
const isValidPhase = (phase: string): phase is Phase => {
  return [
    "hook",
    "predict",
    "play",
    "review",
    "twist_predict",
    "twist_play",
    "twist_review",
    "transfer",
    "test",
    "mastery",
  ].includes(phase);
};

export default function HandWarmerRenderer({
  onBack,
  onGameEvent,
}: HandWarmerRendererProps) {
  // Core state
  const [phase, setPhase] = useState<Phase>("hook");
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

  // Emit game events
  const emitEvent = useCallback(
    (type: string, data?: Record<string, unknown>) => {
      if (onGameEvent) {
        onGameEvent({ type, data, timestamp: Date.now(), phase });
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
    (newPhase: Phase) => {
      if (navigationLockRef.current) return;
      if (!isValidPhase(newPhase)) return;

      navigationLockRef.current = true;
      playSound("transition");
      emitEvent("phase_change", { from: phase, to: newPhase });
      setPhase(newPhase);
      setShowExplanation(false);

      setTimeout(() => {
        navigationLockRef.current = false;
      }, 400);
    },
    [phase, emitEvent]
  );

  // Test questions
  const testQuestions = [
    {
      question: "What is 'latent heat of fusion'?",
      options: [
        "Heat needed to change temperature",
        "Energy released or absorbed during phase change (solid↔liquid)",
        "Heat from nuclear fusion",
        "Temperature of melting"
      ],
      correct: 1,
      explanation:
        "Latent heat of fusion is the energy released (freezing) or absorbed (melting) during the solid-liquid phase transition, without changing temperature."
    },
    {
      question: "Why can sodium acetate stay liquid below its freezing point (54°C)?",
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
        "As crystals form, latent heat is released, heating the solution to its melting point (54°C). It stays there until crystallization completes."
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
        "Heating the crystallized sodium acetate above 54°C re-dissolves the crystals. When cooled carefully, it becomes supercooled liquid again, ready to reuse."
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
        "It heats up 264°C",
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
        "Melting absorbs latent heat from surroundings. Ice packs stay at 0°C while melting because the absorbed heat goes into phase change, not temperature rise."
    }
  ];

  // Real-world applications
  const applications = [
    {
      title: "Reusable Hand Warmers",
      description:
        "Sodium acetate hand warmers can be reused hundreds of times. Click to crystallize and release heat (54°C for up to an hour). Boil in water for 10 minutes to reset. More economical and eco-friendly than disposables.",
      icon: "🧤"
    },
    {
      title: "Thermal Energy Storage",
      description:
        "Phase change materials (PCMs) store energy in buildings. Melting during hot days and solidifying at night, they reduce heating/cooling costs by 20-30%. Paraffin wax and salt hydrates are common PCMs.",
      icon: "🏢"
    },
    {
      title: "Food Transport",
      description:
        "Phase change gel packs keep vaccines, organs, and temperature-sensitive foods within precise ranges during shipping. They absorb/release heat while staying at constant temperature during phase change.",
      icon: "📦"
    },
    {
      title: "Spacecraft Thermal Control",
      description:
        "Satellites use PCMs to handle extreme temperature swings between sun and shadow. The PCM absorbs excess heat (melting) and releases it when cold (solidifying), maintaining stable equipment temperatures.",
      icon: "🛰️"
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
        <rect width="400" height="400" fill="#f0f4f8" />

        {/* Hand warmer pouch outline */}
        <ellipse
          cx="200"
          cy="220"
          rx="130"
          ry="100"
          fill={isLiquid ? "#b3e5fc" : isCrystallizing ? "#81d4fa" : "#e1e8ed"}
          stroke="#333"
          strokeWidth={3}
        />

        {/* Liquid shimmer effect */}
        {isLiquid && (
          <>
            <ellipse
              cx={180 + Math.sin(animationFrame / 20) * 10}
              cy={200}
              rx={80}
              ry={50}
              fill="rgba(255,255,255,0.3)"
            />
            <ellipse
              cx={220}
              cy={240 + Math.cos(animationFrame / 15) * 5}
              rx={60}
              ry={30}
              fill="rgba(255,255,255,0.2)"
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
                  stroke="#b0bec5"
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
            fill={discClicked ? "#757575" : "#9e9e9e"}
            stroke="#616161"
            strokeWidth={2}
            style={{ cursor: isLiquid ? "pointer" : "default" }}
            onMouseDown={isLiquid ? activateWarmer : undefined}
          />
          <circle r={15} fill="none" stroke="#bdbdbd" strokeWidth={1} />
          <circle r={8} fill="#bdbdbd" />
          {!discClicked && isLiquid && (
            <text y={45} textAnchor="middle" fontSize="11" fill="#333">
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
          <rect x={-25} y={-60} width={50} height={120} fill="#fff" stroke="#333" rx={5} />
          <rect
            x={-15}
            y={50 - (temperature - 15) * 2}
            width={30}
            height={(temperature - 15) * 2}
            fill={getTempColor(temperature)}
            rx={3}
          />
          <text x={0} y={-70} textAnchor="middle" fontSize="12" fill="#333">
            {temperature.toFixed(1)}°C
          </text>
        </g>

        {/* State label */}
        <text x="200" y="350" textAnchor="middle" fontSize="14" fill="#333" fontWeight="bold">
          {isLiquid ? "Supercooled Liquid (Ready)" :
           isCrystallizing ? `Crystallizing... ${crystalProgress.toFixed(0)}%` :
           "Crystallized (Releasing Heat)"}
        </text>

        {/* Energy info */}
        <text x="200" y="375" textAnchor="middle" fontSize="11" fill="#666">
          Latent Heat: {latentHeatFusion} kJ/kg | Melting Point: {meltingPoint}°C
        </text>
      </svg>
    );
  };

  // Render comparison visualization for twist
  const renderComparisonVisualization = () => {
    return (
      <svg viewBox="0 0 400 300" className="w-full max-w-md mx-auto">
        {/* Background */}
        <rect width="400" height="300" fill="#f5f5f5" />

        {/* Warmer pouch */}
        <ellipse
          cx="200"
          cy="120"
          rx="100"
          ry="70"
          fill={
            warmerType === "phase"
              ? twistState === "inactive" ? "#b3e5fc" : twistState === "active" ? "#fff9c4" : "#e0e0e0"
              : twistState === "inactive" ? "#ffccbc" : twistState === "active" ? "#ff8a65" : "#bdbdbd"
          }
          stroke="#333"
          strokeWidth={2}
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
        <text x="200" y="130" textAnchor="middle" fontSize="24" fill="#333" fontWeight="bold">
          {twistTemperature.toFixed(1)}°C
        </text>

        {/* Energy bar */}
        <g transform="translate(100, 200)">
          <text x="100" y="-10" textAnchor="middle" fontSize="12" fill="#666">
            Energy Remaining: {energyRemaining.toFixed(0)}%
          </text>
          <rect width="200" height="20" fill="#e0e0e0" rx={5} />
          <rect
            width={energyRemaining * 2}
            height="20"
            fill={energyRemaining > 50 ? "#4caf50" : energyRemaining > 20 ? "#ff9800" : "#f44336"}
            rx={5}
          />
        </g>

        {/* Labels */}
        <text x="200" y="250" textAnchor="middle" fontSize="14" fill="#333" fontWeight="bold">
          {warmerType === "phase" ? "Phase-Change (Reusable)" : "Chemical (Disposable)"}
        </text>
        <text x="200" y="270" textAnchor="middle" fontSize="11" fill="#666">
          {warmerType === "phase"
            ? "Sodium acetate crystallization"
            : "Iron + oxygen → rust + heat"}
        </text>

        {/* State indicator */}
        <text x="200" y="290" textAnchor="middle" fontSize="12" fill={
          twistState === "inactive" ? "#2196f3" :
          twistState === "active" ? "#ff9800" : "#9e9e9e"
        }>
          {twistState === "inactive" ? "Ready" :
           twistState === "active" ? "Heating..." : "Depleted"}
        </text>
      </svg>
    );
  };

  // Render hook phase
  const renderHook = () => (
    <div className="p-6 text-center max-w-2xl mx-auto">
      <div className="text-5xl mb-4">🧤 ❄️ → 🔥</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        The Magic Hand Warmer
      </h2>
      <p className="text-gray-600 mb-6">
        It's just a pouch of clear liquid—but click a tiny metal disc inside,
        and INSTANT heat! Within seconds, it's warm enough to hold. The liquid
        turns solid, and it stays hot for an hour. What's the magic?
      </p>
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-lg mb-6">
        <p className="text-orange-800 font-medium">
          🤔 Where does all that heat come from?
        </p>
      </div>
      <button
        onMouseDown={() => goToPhase("predict")}
        className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      >
        Discover Phase Change Energy →
      </button>
    </div>
  );

  // Render predict phase
  const renderPredict = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Make Your Prediction</h2>
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <p className="text-gray-700">
          A reusable hand warmer contains sodium acetate solution. It can be
          stored as a clear liquid at room temperature (20°C). When you flex
          the metal disc inside, it rapidly heats to 54°C and turns solid.
        </p>
      </div>

      <p className="text-gray-700 font-medium mb-4">
        Where does the heat energy come from?
      </p>

      <div className="space-y-3">
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
            className={`w-full p-4 rounded-lg text-left transition-all ${
              prediction === option.id
                ? "bg-orange-500 text-white shadow-lg"
                : "bg-white border-2 border-gray-200 hover:border-orange-300"
            }`}
          >
            {option.text}
          </button>
        ))}
      </div>

      {prediction && (
        <button
          onMouseDown={() => goToPhase("play")}
          className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          Test Your Prediction →
        </button>
      )}
    </div>
  );

  // Render play phase
  const renderPlay = () => (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        Activate the Hand Warmer
      </h2>
      <p className="text-gray-600 mb-4">
        Click the metal disc to trigger crystallization. Watch the temperature rise!
      </p>

      <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
        {renderHandWarmer()}

        {warmerState === "solid" && (
          <button
            onMouseDown={resetWarmer}
            className="w-full mt-4 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-400"
          >
            🔄 Reset (Simulates Boiling)
          </button>
        )}
      </div>

      {/* Explanation of current state */}
      <div className={`p-4 rounded-lg mb-4 ${
        warmerState === "liquid" ? "bg-blue-50" :
        warmerState === "crystallizing" ? "bg-yellow-50" : "bg-green-50"
      }`}>
        {warmerState === "liquid" && (
          <>
            <h3 className="font-bold text-blue-800">Supercooled State</h3>
            <p className="text-sm text-gray-700">
              The sodium acetate is dissolved and stable at 20°C—even though it
              "wants" to be solid below 54°C! It's waiting for a trigger.
            </p>
          </>
        )}
        {warmerState === "crystallizing" && (
          <>
            <h3 className="font-bold text-yellow-800">Crystallization!</h3>
            <p className="text-sm text-gray-700">
              The disc created a nucleation site. Crystals form rapidly, releasing
              {" "}{latentHeatFusion} kJ/kg of latent heat energy!
            </p>
          </>
        )}
        {warmerState === "solid" && (
          <>
            <h3 className="font-bold text-green-800">Fully Crystallized</h3>
            <p className="text-sm text-gray-700">
              All the latent heat has been released. The warmer will slowly cool
              to room temperature. To reset, heat it above {meltingPoint}°C.
            </p>
          </>
        )}
      </div>

      <button
        onMouseDown={() => goToPhase("review")}
        className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold shadow-lg"
      >
        Learn the Science →
      </button>
    </div>
  );

  // Render review phase
  const renderReview = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        The Science of Phase Change Energy
      </h2>

      <div className="space-y-4">
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-lg">
          <h3 className="font-bold text-orange-800 mb-2">🔥 Latent Heat of Fusion</h3>
          <p className="text-gray-700 text-sm mb-2">
            When matter changes phase (liquid→solid), energy is released or absorbed
            WITHOUT changing temperature. For sodium acetate:
          </p>
          <div className="font-mono text-center text-lg mb-2">
            L<sub>f</sub> = 264 kJ/kg
          </div>
          <p className="text-gray-600 text-sm">
            That's enough to raise 1 kg of water by 63°C!
          </p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">🧊 Supercooling</h3>
          <p className="text-gray-700 text-sm">
            Sodium acetate solution can remain liquid below its freezing point (54°C)
            because crystal formation needs a "seed"—a nucleation site. The metal disc
            provides this trigger when flexed, creating a tiny crystal that starts
            a chain reaction.
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-bold text-purple-800 mb-2">♻️ Reusability</h3>
          <p className="text-gray-700 text-sm">
            Unlike chemical warmers, phase-change warmers can be reset! Boiling
            re-dissolves the crystals. When cooled carefully (no bumps!), it returns
            to the supercooled state—ready to use again.
          </p>
        </div>

        {prediction === "phase" && (
          <div className="bg-green-100 p-4 rounded-lg border-2 border-green-400">
            <p className="text-green-800 font-semibold">
              🎉 Correct! The heat comes from the latent heat of fusion—energy
              released when the liquid crystallizes into solid form.
            </p>
          </div>
        )}

        {prediction && prediction !== "phase" && (
          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-amber-800">
              The answer is phase change energy! When the supercooled liquid
              crystallizes, it releases 264 kJ/kg of stored energy. No batteries,
              no chemical consumption—just the physics of freezing.
            </p>
          </div>
        )}
      </div>

      <button
        onMouseDown={() => goToPhase("twist_predict")}
        className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold shadow-lg"
      >
        Ready for a Twist? →
      </button>
    </div>
  );

  // Render twist predict phase
  const renderTwistPredict = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">🔋 The Comparison Twist</h2>

      <div className="bg-purple-50 p-4 rounded-lg mb-6">
        <p className="text-gray-700">
          There are two types of hand warmers:
        </p>
        <ul className="mt-2 space-y-1 text-gray-700 text-sm">
          <li>• <strong>Phase-change:</strong> Sodium acetate crystallization (reusable)</li>
          <li>• <strong>Chemical:</strong> Iron oxidation/rusting (disposable)</li>
        </ul>
      </div>

      <p className="text-gray-700 font-medium mb-4">
        Which type provides heat for LONGER?
      </p>

      <div className="space-y-3">
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
            className={`w-full p-4 rounded-lg text-left transition-all ${
              twistPrediction === option.id
                ? "bg-purple-500 text-white shadow-lg"
                : "bg-white border-2 border-gray-200 hover:border-purple-300"
            }`}
          >
            {option.text}
          </button>
        ))}
      </div>

      {twistPrediction && (
        <button
          onMouseDown={() => goToPhase("twist_play")}
          className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold shadow-lg"
        >
          Compare Both Types →
        </button>
      )}
    </div>
  );

  // Render twist play phase
  const renderTwistPlay = () => (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        Phase-Change vs Chemical
      </h2>
      <p className="text-gray-600 mb-4">
        Compare how the two types of hand warmers behave!
      </p>

      {/* Type selector */}
      <div className="flex gap-2 mb-4">
        <button
          onMouseDown={() => {
            setWarmerType("phase");
            resetTwist();
          }}
          className={`flex-1 py-3 rounded-lg font-medium ${
            warmerType === "phase"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          🧊 Phase-Change
        </button>
        <button
          onMouseDown={() => {
            setWarmerType("chemical");
            resetTwist();
          }}
          className={`flex-1 py-3 rounded-lg font-medium ${
            warmerType === "chemical"
              ? "bg-orange-500 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          🔥 Chemical
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
        {renderComparisonVisualization()}

        <div className="flex gap-2 mt-4">
          {twistState === "inactive" && (
            <button
              onMouseDown={warmerType === "phase" ? activatePhaseWarmer : activateChemicalWarmer}
              className={`flex-1 py-3 rounded-lg font-bold ${
                warmerType === "phase"
                  ? "bg-blue-400 text-white hover:bg-blue-300"
                  : "bg-orange-400 text-white hover:bg-orange-300"
              }`}
            >
              Activate
            </button>
          )}
          {twistState !== "inactive" && (
            <button
              onMouseDown={resetTwist}
              className="flex-1 py-3 bg-gray-400 text-white rounded-lg font-bold"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Comparison info */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <h4 className="font-bold text-blue-800 text-sm">Phase-Change</h4>
          <ul className="text-xs text-gray-600 mt-1 space-y-1">
            <li>• Heats quickly (54°C)</li>
            <li>• Lasts ~30-60 min</li>
            <li>• Reusable (boil to reset)</li>
          </ul>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg">
          <h4 className="font-bold text-orange-800 text-sm">Chemical</h4>
          <ul className="text-xs text-gray-600 mt-1 space-y-1">
            <li>• Heats slowly (~50°C)</li>
            <li>• Lasts 6-12 hours</li>
            <li>• Single-use (disposable)</li>
          </ul>
        </div>
      </div>

      <button
        onMouseDown={() => goToPhase("twist_review")}
        className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold shadow-lg"
      >
        See Explanation →
      </button>
    </div>
  );

  // Render twist review phase
  const renderTwistReview = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Two Types of Hand Warmers
      </h2>

      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">🧊 Phase-Change (Reusable)</h3>
          <ul className="text-gray-700 text-sm space-y-1">
            <li>• Uses sodium acetate supercooling</li>
            <li>• Releases heat through crystallization</li>
            <li>• Reaches 54°C quickly, lasts 30-60 min</li>
            <li>• Can be recharged by boiling</li>
            <li>• Eco-friendly (hundreds of uses)</li>
          </ul>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <h3 className="font-bold text-orange-800 mb-2">🔥 Chemical (Disposable)</h3>
          <ul className="text-gray-700 text-sm space-y-1">
            <li>• Uses iron oxidation: 4Fe + 3O₂ → 2Fe₂O₃ + heat</li>
            <li>• Slow, sustained reaction</li>
            <li>• Lower temp (~50°C) but lasts 6-12 hours</li>
            <li>• Irreversible (single use)</li>
            <li>• Better for long outdoor activities</li>
          </ul>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-bold text-green-800 mb-2">🎯 Choose the Right One</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-white p-2 rounded">
              <p className="font-medium">Quick warmth, short trips:</p>
              <p className="text-blue-600">Phase-change</p>
            </div>
            <div className="bg-white p-2 rounded">
              <p className="font-medium">All-day outdoor activity:</p>
              <p className="text-orange-600">Chemical</p>
            </div>
          </div>
        </div>

        {twistPrediction === "chemical" && (
          <div className="bg-green-100 p-4 rounded-lg border-2 border-green-400">
            <p className="text-green-800 font-semibold">
              🎉 Correct! Chemical warmers last much longer (6-12 hours vs 30-60 min)
              because oxidation is a slow, sustained reaction.
            </p>
          </div>
        )}
      </div>

      <button
        onMouseDown={() => goToPhase("transfer")}
        className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg font-semibold shadow-lg"
      >
        See Real-World Applications →
      </button>
    </div>
  );

  // Render transfer phase
  const renderTransfer = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Phase Change Energy in the Real World
      </h2>

      <div className="space-y-4">
        {applications.map((app, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
              completedApps.has(index)
                ? "bg-green-50 border-green-300"
                : currentApp === index
                ? "bg-blue-50 border-blue-400"
                : "bg-white border-gray-200 hover:border-blue-300"
            }`}
            onMouseDown={() => {
              if (!completedApps.has(index)) {
                setCurrentApp(index);
                playSound("click");
              }
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">{app.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-800">{app.title}</h3>
                  {completedApps.has(index) && (
                    <span className="text-green-500">✓</span>
                  )}
                </div>
                {(currentApp === index || completedApps.has(index)) && (
                  <p className="text-gray-600 text-sm mt-2">{app.description}</p>
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
                className="mt-3 w-full py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
              >
                Got It! ✓
              </button>
            )}
          </div>
        ))}
      </div>

      {completedApps.size === applications.length && (
        <button
          onMouseDown={() => goToPhase("test")}
          className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-semibold shadow-lg"
        >
          Take the Quiz →
        </button>
      )}
    </div>
  );

  // Render test phase
  const renderTest = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Test Your Knowledge
      </h2>

      {!testSubmitted ? (
        <>
          <div className="space-y-6">
            {testQuestions.map((q, qIndex) => (
              <div key={qIndex} className="bg-white p-4 rounded-lg shadow">
                <p className="font-medium text-gray-800 mb-3">
                  {qIndex + 1}. {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((option, oIndex) => (
                    <button
                      key={oIndex}
                      onMouseDown={() => {
                        setTestAnswers((prev) => ({ ...prev, [qIndex]: oIndex }));
                        playSound("click");
                      }}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        testAnswers[qIndex] === oIndex
                          ? "bg-orange-500 text-white"
                          : "bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {Object.keys(testAnswers).length === testQuestions.length && (
            <button
              onMouseDown={handleTestSubmit}
              className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-semibold shadow-lg"
            >
              Submit Answers
            </button>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div
            className={`p-6 rounded-xl text-center ${
              testScore >= 7
                ? "bg-green-100 text-green-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            <div className="text-4xl mb-2">
              {testScore >= 7 ? "🎉" : "📚"}
            </div>
            <p className="text-2xl font-bold">
              {testScore} / {testQuestions.length}
            </p>
            <p className="mt-2">
              {testScore >= 7
                ? "Excellent! You understand phase change energy!"
                : "Review the concepts and try again!"}
            </p>
          </div>

          <div className="space-y-4">
            {testQuestions.map((q, qIndex) => (
              <div
                key={qIndex}
                className={`p-4 rounded-lg ${
                  testAnswers[qIndex] === q.correct
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <p className="font-medium text-gray-800 mb-2">
                  {qIndex + 1}. {q.question}
                </p>
                <p
                  className={`${
                    testAnswers[qIndex] === q.correct
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  Your answer: {q.options[testAnswers[qIndex]]}
                  {testAnswers[qIndex] !== q.correct && (
                    <span className="block text-green-700 mt-1">
                      Correct: {q.options[q.correct]}
                    </span>
                  )}
                </p>
                <p className="text-gray-600 text-sm mt-2 italic">
                  {q.explanation}
                </p>
              </div>
            ))}
          </div>

          {testScore >= 7 && (
            <button
              onMouseDown={() => goToPhase("mastery")}
              className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-semibold shadow-lg"
            >
              Claim Your Mastery! 🏆
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
      <div className="p-6 text-center max-w-2xl mx-auto relative">
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
                {["🧤", "🔥", "❄️", "⭐", "✨"][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        )}

        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Phase Change Master!
        </h2>

        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Key Concepts Mastered
          </h3>
          <div className="grid gap-3 text-left">
            {[
              "Latent heat of fusion: energy in phase change (no temp change)",
              "Supercooling: liquids below freezing point without crystallizing",
              "Nucleation: crystal formation needs a 'seed' to start",
              "Sodium acetate: 264 kJ/kg latent heat, melts at 54°C",
              "Phase-change warmers are reusable; chemical ones aren't",
              "PCMs store thermal energy in buildings and spacecraft"
            ].map((concept, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span className="text-gray-700">{concept}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-xl mb-6">
          <p className="text-orange-800">
            🧤 Next time you use a hand warmer, you'll understand the
            amazing physics of phase transitions and latent heat!
          </p>
        </div>

        {onBack && (
          <button
            onMouseDown={onBack}
            className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            ← Back to Games
          </button>
        )}
      </div>
    );
  };

  // Main render
  const renderPhase = () => {
    switch (phase) {
      case "hook":
        return renderHook();
      case "predict":
        return renderPredict();
      case "play":
        return renderPlay();
      case "review":
        return renderReview();
      case "twist_predict":
        return renderTwistPredict();
      case "twist_play":
        return renderTwistPlay();
      case "twist_review":
        return renderTwistReview();
      case "transfer":
        return renderTransfer();
      case "test":
        return renderTest();
      case "mastery":
        return renderMastery();
      default:
        return renderHook();
    }
  };

  // Progress indicator
  const phases: Phase[] = [
    "hook", "predict", "play", "review",
    "twist_predict", "twist_play", "twist_review",
    "transfer", "test", "mastery"
  ];
  const currentPhaseIndex = phases.indexOf(phase);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-orange-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧤</span>
            <div>
              <h1 className="font-bold text-gray-800">Hand Warmer Physics</h1>
              <p className="text-xs text-gray-500">Latent heat of fusion</p>
            </div>
          </div>
          {onBack && (
            <button
              onMouseDown={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mt-3">
          <div className="flex gap-1">
            {phases.map((p, i) => (
              <div
                key={p}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i <= currentPhaseIndex ? "bg-orange-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">
            {currentPhaseIndex + 1} / {phases.length}:{" "}
            {phase.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="pb-8">{renderPhase()}</div>
    </div>
  );
}
