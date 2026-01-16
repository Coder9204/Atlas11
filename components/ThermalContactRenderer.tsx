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
interface ThermalContactRendererProps {
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

// Interface types
type InterfaceType = "air_gap" | "bare_contact" | "thermal_paste";

interface InterfaceOption {
  type: InterfaceType;
  name: string;
  conductivity: number;
  color: string;
  description: string;
}

const interfaceOptions: InterfaceOption[] = [
  {
    type: "air_gap",
    name: "Air Gap (1mm)",
    conductivity: 0.026,
    color: "#e3f2fd",
    description: "Air trapped between surfaces"
  },
  {
    type: "bare_contact",
    name: "Bare Metal Contact",
    conductivity: 2.5,
    color: "#90a4ae",
    description: "Direct contact with microscopic air pockets"
  },
  {
    type: "thermal_paste",
    name: "Thermal Paste",
    conductivity: 8.5,
    color: "#bdbdbd",
    description: "Paste fills gaps, maximizing contact"
  }
];

export default function ThermalContactRenderer({
  onBack,
  onGameEvent,
}: ThermalContactRendererProps) {
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
  const [interfaceType, setInterfaceType] = useState<InterfaceType>("bare_contact");
  const [hotBlockTemp, setHotBlockTemp] = useState(80);
  const [coldBlockTemp, setColdBlockTemp] = useState(20);
  const [simRunning, setSimRunning] = useState(false);
  const [simTime, setSimTime] = useState(0);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [showMicroscopic, setShowMicroscopic] = useState(false);

  // Twist state - CPU cooling comparison
  const [cpuTemp, setCpuTemp] = useState(90);
  const [coolerType, setCoolerType] = useState<"no_paste" | "with_paste">("no_paste");
  const [cpuSimRunning, setCpuSimRunning] = useState(false);

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

  // Heat transfer simulation
  useEffect(() => {
    if (!simRunning) return;

    const currentInterface = interfaceOptions.find(o => o.type === interfaceType);
    const conductivity = currentInterface?.conductivity || 1;

    const interval = setInterval(() => {
      setSimTime((t) => t + 1);

      // Heat transfer rate proportional to conductivity and temp difference
      const heatRate = conductivity * 0.02;
      const tempDiff = hotBlockTemp - coldBlockTemp;

      if (tempDiff > 1) {
        setHotBlockTemp((t) => Math.max(coldBlockTemp, t - heatRate * tempDiff * 0.1));
        setColdBlockTemp((t) => Math.min(hotBlockTemp, t + heatRate * tempDiff * 0.1));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [simRunning, interfaceType, hotBlockTemp, coldBlockTemp]);

  // CPU cooling simulation
  useEffect(() => {
    if (!cpuSimRunning) return;

    const coolingRate = coolerType === "with_paste" ? 3.0 : 0.5;

    const interval = setInterval(() => {
      setCpuTemp((t) => {
        const targetTemp = coolerType === "with_paste" ? 45 : 75;
        const diff = t - targetTemp;
        if (Math.abs(diff) < 0.5) return targetTemp;
        return t - diff * coolingRate * 0.02;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [cpuSimRunning, coolerType]);

  // Start simulation
  const startSim = () => {
    setHotBlockTemp(80);
    setColdBlockTemp(20);
    setSimTime(0);
    setSimRunning(true);
    playSound("click");
    emitEvent("simulation_started", { interfaceType });
  };

  // Reset simulation
  const resetSim = () => {
    setSimRunning(false);
    setHotBlockTemp(80);
    setColdBlockTemp(20);
    setSimTime(0);
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
      question: "What causes thermal contact resistance?",
      options: [
        "The materials repelling each other",
        "Microscopic air gaps between imperfectly smooth surfaces",
        "Magnetic fields at the interface",
        "Chemical reactions between surfaces"
      ],
      correct: 1,
      explanation:
        "Even polished surfaces have microscopic roughness. When pressed together, only peaks touch, leaving tiny air gaps. Air is a poor thermal conductor."
    },
    {
      question: "Why is air such a poor thermal conductor?",
      options: [
        "Air is too cold",
        "Air molecules are far apart, limiting heat transfer by collision",
        "Air absorbs heat instead of conducting it",
        "Air is invisible"
      ],
      correct: 1,
      explanation:
        "In gases, molecules are far apart and transfer heat slowly via random collisions. Air's thermal conductivity is ~0.026 W/m·K vs copper's ~400 W/m·K."
    },
    {
      question: "Thermal paste works by:",
      options: [
        "Generating its own heat",
        "Cooling surfaces chemically",
        "Filling microscopic gaps to displace air",
        "Increasing the air gap"
      ],
      correct: 2,
      explanation:
        "Thermal paste fills the microscopic valleys between surfaces. Even though paste isn't as conductive as metal, it's far better than air."
    },
    {
      question: "What happens if you use too much thermal paste?",
      options: [
        "Better cooling",
        "No difference",
        "Excess paste can act as an insulating layer",
        "The CPU runs faster"
      ],
      correct: 2,
      explanation:
        "Too much paste creates a thick layer between surfaces. Thermal paste is less conductive than metal, so excess paste increases resistance."
    },
    {
      question: "Thermal conductivity of copper is ~400 W/m·K. Air is ~0.026 W/m·K. Copper conducts heat:",
      options: [
        "About 4 times better",
        "About 150 times better",
        "About 15,000 times better",
        "About the same"
      ],
      correct: 2,
      explanation:
        "400 / 0.026 ≈ 15,000. Copper conducts heat about 15,000 times better than air. This is why even tiny air gaps are problematic."
    },
    {
      question: "When mounting a CPU cooler, you should apply thermal paste:",
      options: [
        "In a thick layer covering the entire IHS",
        "A thin layer or small amount in the center",
        "Only on the cooler, never on the CPU",
        "No paste is needed with modern coolers"
      ],
      correct: 1,
      explanation:
        "A pea-sized dot in the center or thin layer is ideal. Mounting pressure spreads it. Too much creates an insulating layer; too little leaves air gaps."
    },
    {
      question: "Why do heat sinks have flat, polished bases?",
      options: [
        "For aesthetics",
        "To minimize air gaps when contacting the heat source",
        "To reflect heat radiation",
        "Flat bases are cheaper to make"
      ],
      correct: 1,
      explanation:
        "Flatter surfaces mean more direct metal-to-metal contact and fewer air gaps. High-quality coolers have mirror-polished bases."
    },
    {
      question: "Thermal pads (used for VRMs, M.2 drives) differ from paste because:",
      options: [
        "Pads are better conductors",
        "Pads bridge larger gaps and are easier to apply",
        "Pads don't need contact pressure",
        "Pads are cheaper"
      ],
      correct: 1,
      explanation:
        "Thermal pads are thicker and conform to irregular surfaces. They're ideal for components with varying heights or where precise paste application is difficult."
    },
    {
      question: "In the formula Q = kA(T₁-T₂)/d, what does 'd' represent?",
      options: [
        "Density",
        "Diameter",
        "Thickness/distance through which heat flows",
        "Duration"
      ],
      correct: 2,
      explanation:
        "In Fourier's Law of heat conduction, d is the thickness of the material. Thicker barriers (including thick paste layers) reduce heat flow."
    },
    {
      question: "A laptop throttles (slows down) when hot. Better thermal paste could help by:",
      options: [
        "Making the CPU generate less heat",
        "Reducing thermal resistance to the cooler, lowering CPU temperature",
        "Making the fan spin faster",
        "Cooling the battery"
      ],
      correct: 1,
      explanation:
        "Better thermal interface allows heat to transfer faster from CPU to cooler. Lower CPU temps mean less throttling and better sustained performance."
    }
  ];

  // Real-world applications
  const applications = [
    {
      title: "Computer CPU Cooling",
      description:
        "CPUs generate 65-300W in a tiny area. Thermal paste between the CPU and heatsink is critical. Poor contact can mean 20-30°C higher temps, causing throttling or damage. Premium pastes use silver or diamond particles.",
      icon: "💻"
    },
    {
      title: "LED Lighting",
      description:
        "High-power LEDs convert 30-50% of energy to heat. Thermal interface materials bond LED chips to heat sinks. Without proper thermal management, LEDs dim rapidly and fail early. Star boards use thermal adhesive.",
      icon: "💡"
    },
    {
      title: "Electric Vehicle Batteries",
      description:
        "EV battery packs use thermal pads between cells and cooling plates. Uniform thermal contact ensures even cell temperatures, maximizing range, charging speed, and battery lifespan. Gap fillers accommodate manufacturing tolerances.",
      icon: "🔋"
    },
    {
      title: "Spacecraft Electronics",
      description:
        "In space, there's no air for convection. Electronics rely entirely on conduction to radiators. Thermal interface materials and bolted joints must be perfect—there's no repair possible once launched.",
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
    if (temp < 30) return "#3b82f6";
    if (temp < 45) return "#22c55e";
    if (temp < 60) return "#eab308";
    if (temp < 75) return "#f97316";
    return "#ef4444";
  };

  // Render heat transfer visualization
  const renderHeatTransfer = () => {
    const currentInterface = interfaceOptions.find(o => o.type === interfaceType);

    return (
      <svg viewBox="0 0 400 350" className="w-full max-w-md mx-auto">
        {/* Background */}
        <rect width="400" height="350" fill="#f5f5f5" />

        {/* Hot block (left) */}
        <g transform="translate(50, 100)">
          <rect
            width="120"
            height="150"
            fill={getTempColor(hotBlockTemp)}
            stroke="#333"
            strokeWidth={2}
            rx={5}
          />
          <text x="60" y="75" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">
            {hotBlockTemp.toFixed(1)}°C
          </text>
          <text x="60" y="100" textAnchor="middle" fill="white" fontSize="12">
            HOT
          </text>

          {/* Heat energy visualization */}
          {simRunning && hotBlockTemp > coldBlockTemp + 5 && (
            <g>
              {[0, 1, 2, 3, 4].map((i) => (
                <circle
                  key={i}
                  cx={90 + (animationFrame / 5 + i * 20) % 100}
                  cy={30 + i * 25}
                  r={4}
                  fill="white"
                  opacity={0.6}
                />
              ))}
            </g>
          )}
        </g>

        {/* Interface gap */}
        <g transform="translate(170, 100)">
          <rect
            width="60"
            height="150"
            fill={currentInterface?.color || "#e0e0e0"}
            stroke="#333"
            strokeWidth={2}
          />

          {/* Show microscopic detail if enabled */}
          {showMicroscopic && interfaceType !== "thermal_paste" && (
            <g>
              {/* Rough surface representation */}
              {[...Array(10)].map((_, i) => (
                <g key={i}>
                  {/* Left surface bumps */}
                  <rect
                    x={0}
                    y={15 + i * 14}
                    width={5 + Math.random() * 10}
                    height={10}
                    fill="#78909c"
                  />
                  {/* Right surface bumps */}
                  <rect
                    x={45 - Math.random() * 10}
                    y={15 + i * 14}
                    width={5 + Math.random() * 10}
                    height={10}
                    fill="#78909c"
                  />
                  {/* Air pocket */}
                  {interfaceType === "air_gap" && (
                    <circle
                      cx={30}
                      cy={20 + i * 14}
                      r={3}
                      fill="rgba(100,149,237,0.3)"
                    />
                  )}
                </g>
              ))}
            </g>
          )}

          {/* Thermal paste fills gaps */}
          {interfaceType === "thermal_paste" && (
            <rect x={5} y={5} width={50} height={140} fill="#9e9e9e" rx={2} />
          )}

          <text x="30" y="-10" textAnchor="middle" fontSize="10" fill="#333">
            {currentInterface?.name}
          </text>
          <text x="30" y="170" textAnchor="middle" fontSize="9" fill="#666">
            k = {currentInterface?.conductivity} W/m·K
          </text>
        </g>

        {/* Cold block (right) */}
        <g transform="translate(230, 100)">
          <rect
            width="120"
            height="150"
            fill={getTempColor(coldBlockTemp)}
            stroke="#333"
            strokeWidth={2}
            rx={5}
          />
          <text x="60" y="75" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">
            {coldBlockTemp.toFixed(1)}°C
          </text>
          <text x="60" y="100" textAnchor="middle" fill="white" fontSize="12">
            COLD
          </text>
        </g>

        {/* Heat flow arrows */}
        {simRunning && hotBlockTemp > coldBlockTemp + 2 && (
          <g transform="translate(200, 175)">
            {[0, 1, 2].map((i) => {
              const offset = (animationFrame / 3 + i * 15) % 50;
              const conductivity = currentInterface?.conductivity || 1;
              const opacity = Math.min(1, conductivity / 5);
              return (
                <polygon
                  key={i}
                  points={`${-15 + offset},0 ${-5 + offset},-8 ${-5 + offset},-3 ${10 + offset},-3 ${10 + offset},-8 ${20 + offset},0 ${10 + offset},8 ${10 + offset},3 ${-5 + offset},3 ${-5 + offset},8`}
                  fill="#ff5722"
                  opacity={opacity * (1 - offset / 50)}
                />
              );
            })}
          </g>
        )}

        {/* Info */}
        <text x="200" y="30" textAnchor="middle" fontSize="14" fill="#333" fontWeight="bold">
          Heat Transfer Through Interface
        </text>
        <text x="200" y="290" textAnchor="middle" fontSize="11" fill="#666">
          Temperature Difference: {(hotBlockTemp - coldBlockTemp).toFixed(1)}°C
        </text>
        <text x="200" y="310" textAnchor="middle" fontSize="11" fill="#666">
          Time: {(simTime / 10).toFixed(1)}s | Heat Flow Rate: {((hotBlockTemp - coldBlockTemp) * (currentInterface?.conductivity || 1) * 0.1).toFixed(1)} W
        </text>
      </svg>
    );
  };

  // Render CPU cooling visualization
  const renderCPUCooling = () => {
    return (
      <svg viewBox="0 0 400 300" className="w-full max-w-md mx-auto">
        {/* Background */}
        <rect width="400" height="300" fill="#1a1a2e" />

        {/* Motherboard */}
        <rect x="50" y="200" width="300" height="80" fill="#1b5e20" stroke="#333" strokeWidth={2} />
        <text x="200" y="250" textAnchor="middle" fill="#a5d6a7" fontSize="10">
          MOTHERBOARD
        </text>

        {/* CPU */}
        <rect x="150" y="160" width="100" height="40" fill={getTempColor(cpuTemp)} stroke="#333" strokeWidth={2} />
        <text x="200" y="185" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
          CPU {cpuTemp.toFixed(0)}°C
        </text>

        {/* Thermal interface */}
        <rect
          x="155"
          y="155"
          width="90"
          height="5"
          fill={coolerType === "with_paste" ? "#bdbdbd" : "#e3f2fd"}
          stroke="#333"
        />
        {coolerType === "no_paste" && (
          <text x="200" y="152" textAnchor="middle" fontSize="8" fill="#f44336">
            AIR GAPS!
          </text>
        )}

        {/* Heat sink */}
        <rect x="140" y="70" width="120" height="85" fill="#78909c" stroke="#333" strokeWidth={2} />
        {/* Heat sink fins */}
        {[...Array(8)].map((_, i) => (
          <rect
            key={i}
            x={145 + i * 14}
            y="20"
            width="10"
            height="50"
            fill="#90a4ae"
            stroke="#333"
          />
        ))}

        {/* Heat flow visualization */}
        {cpuSimRunning && (
          <g>
            {[0, 1, 2].map((i) => {
              const y = 150 - (animationFrame / 2 + i * 20) % 80;
              const opacity = coolerType === "with_paste" ? 0.8 : 0.3;
              return (
                <circle
                  key={i}
                  cx={170 + i * 30}
                  cy={y}
                  r={5}
                  fill="#ff5722"
                  opacity={opacity * (1 - (150 - y) / 80)}
                />
              );
            })}
          </g>
        )}

        {/* Labels */}
        <text x="200" y="15" textAnchor="middle" fill="white" fontSize="12">
          {coolerType === "with_paste" ? "WITH Thermal Paste" : "WITHOUT Thermal Paste"}
        </text>

        {/* Temperature indicator */}
        <g transform="translate(330, 80)">
          <rect x={0} y={0} width={40} height={120} fill="#333" stroke="#555" rx={5} />
          <rect
            x={5}
            y={115 - (cpuTemp - 30) * 1.5}
            width={30}
            height={(cpuTemp - 30) * 1.5}
            fill={getTempColor(cpuTemp)}
            rx={3}
          />
          <text x={20} y={-10} textAnchor="middle" fontSize="10" fill="white">
            {cpuTemp.toFixed(0)}°C
          </text>
        </g>

        {/* Status */}
        <text x="200" y="280" textAnchor="middle" fontSize="11" fill={cpuTemp > 80 ? "#f44336" : cpuTemp > 60 ? "#ff9800" : "#4caf50"}>
          {cpuTemp > 80 ? "THROTTLING! Too Hot!" : cpuTemp > 60 ? "Warm - Reduced Performance" : "Cool - Full Performance"}
        </text>
      </svg>
    );
  };

  // Render hook phase
  const renderHook = () => (
    <div className="p-6 text-center max-w-2xl mx-auto">
      <div className="text-5xl mb-4">🔥 ↔️ ❄️</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        The Hidden Heat Barrier
      </h2>
      <p className="text-gray-600 mb-6">
        You press two metal blocks together—one hot, one cold. Heat should
        flow freely between them, right? But something invisible is blocking
        the way. Even "smooth" surfaces have a secret that makes heat transfer
        surprisingly difficult.
      </p>
      <div className="bg-gradient-to-r from-red-50 to-blue-50 p-4 rounded-lg mb-6">
        <p className="text-gray-800 font-medium">
          🔬 Why does your computer need thermal paste? The answer lies in microscopic details!
        </p>
      </div>
      <button
        onMouseDown={() => goToPhase("predict")}
        className="px-8 py-4 bg-gradient-to-r from-red-500 to-blue-500 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      >
        Discover Thermal Contact →
      </button>
    </div>
  );

  // Render predict phase
  const renderPredict = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Make Your Prediction</h2>
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <p className="text-gray-700">
          Two polished metal blocks (hot and cold) are pressed firmly together.
          Under a microscope, the "smooth" surfaces are actually rough, with
          tiny peaks and valleys. Only the peaks actually touch.
        </p>
      </div>

      <p className="text-gray-700 font-medium mb-4">
        What fills the tiny gaps between the surfaces?
      </p>

      <div className="space-y-3">
        {[
          { id: "nothing", text: "Nothing—it's a vacuum" },
          { id: "air", text: "Air—a poor thermal conductor" },
          { id: "metal", text: "Metal flows to fill the gaps" },
          { id: "heat", text: "Heat itself fills the gaps" }
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
                ? "bg-blue-500 text-white shadow-lg"
                : "bg-white border-2 border-gray-200 hover:border-blue-300"
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
        Thermal Contact Experiment
      </h2>
      <p className="text-gray-600 mb-4">
        Compare heat transfer through different interface types!
      </p>

      <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
        {renderHeatTransfer()}

        <div className="flex gap-2 mt-4">
          {!simRunning ? (
            <button
              onMouseDown={startSim}
              className="flex-1 py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-400"
            >
              🔥 Start Heat Transfer
            </button>
          ) : (
            <button
              onMouseDown={resetSim}
              className="flex-1 py-3 bg-gray-400 text-white rounded-lg font-bold hover:bg-gray-300"
            >
              Reset
            </button>
          )}
          <button
            onMouseDown={() => setShowMicroscopic(!showMicroscopic)}
            className={`px-4 py-3 rounded-lg font-medium ${
              showMicroscopic
                ? "bg-purple-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            🔬
          </button>
        </div>
      </div>

      {/* Interface selector */}
      <div className="bg-white rounded-lg p-4 shadow mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Interface Type:
        </label>
        <div className="grid grid-cols-3 gap-2">
          {interfaceOptions.map((opt) => (
            <button
              key={opt.type}
              onMouseDown={() => {
                setInterfaceType(opt.type);
                resetSim();
              }}
              className={`p-2 rounded-lg text-sm transition-all ${
                interfaceType === opt.type
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {opt.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {interfaceOptions.find(o => o.type === interfaceType)?.description}
        </p>
      </div>

      {/* Thermal conductivity comparison */}
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <h3 className="font-bold text-blue-800 mb-2">Thermal Conductivity (W/m·K)</h3>
        <div className="space-y-2">
          {[
            { name: "Air", k: 0.026, width: 1 },
            { name: "Bare Contact", k: 2.5, width: 10 },
            { name: "Thermal Paste", k: 8.5, width: 35 },
            { name: "Copper", k: 400, width: 100 },
          ].map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <span className="w-24 text-sm">{item.name}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-500 h-4 rounded-full"
                  style={{ width: `${item.width}%` }}
                />
              </div>
              <span className="text-xs w-12">{item.k}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onMouseDown={() => goToPhase("review")}
        className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold shadow-lg"
      >
        Learn the Science →
      </button>
    </div>
  );

  // Render review phase
  const renderReview = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Thermal Contact Resistance
      </h2>

      <div className="space-y-4">
        <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-lg">
          <h3 className="font-bold text-red-800 mb-2">🔬 The Microscopic Problem</h3>
          <p className="text-gray-700 text-sm">
            Even "smooth" surfaces are rough at the microscale. When pressed together:
          </p>
          <ul className="text-sm mt-2 space-y-1">
            <li>• Only ~1-2% of the area actually touches</li>
            <li>• The rest is filled with AIR (k = 0.026 W/m·K)</li>
            <li>• Air is ~15,000× worse at conducting heat than copper!</li>
          </ul>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">🧴 The Solution: Thermal Interface Materials</h3>
          <p className="text-gray-700 text-sm">
            Thermal paste/grease fills the air gaps:
          </p>
          <ul className="text-sm mt-2 space-y-1">
            <li>• Displaces air (bad conductor) with paste (better conductor)</li>
            <li>• Even though paste isn't as good as metal, it's 300× better than air</li>
            <li>• Reduces thermal resistance by 50-80%</li>
          </ul>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-bold text-green-800 mb-2">📐 Fourier's Law</h3>
          <div className="font-mono text-center mb-2">
            Q = k × A × (T₁ - T₂) / d
          </div>
          <p className="text-gray-600 text-sm">
            Heat flow (Q) depends on conductivity (k), area (A), temperature
            difference, and thickness (d). Better interface → higher effective k.
          </p>
        </div>

        {prediction === "air" && (
          <div className="bg-green-100 p-4 rounded-lg border-2 border-green-400">
            <p className="text-green-800 font-semibold">
              🎉 Correct! The gaps are filled with air, which is a terrible
              thermal conductor. That's why we use thermal paste!
            </p>
          </div>
        )}

        {prediction && prediction !== "air" && (
          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-amber-800">
              The answer is air! Those microscopic gaps trap air between the
              surfaces. Since air conducts heat very poorly, it creates
              significant thermal resistance.
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
      <h2 className="text-xl font-bold text-gray-800 mb-4">💻 The CPU Twist</h2>

      <div className="bg-purple-50 p-4 rounded-lg mb-6">
        <p className="text-gray-700">
          A CPU generates 100W of heat in an area smaller than your thumbnail.
          A heat sink is mounted on top. What happens if you forget the thermal paste?
        </p>
      </div>

      <p className="text-gray-700 font-medium mb-4">
        Without thermal paste, the CPU temperature will be:
      </p>

      <div className="space-y-3">
        {[
          { id: "same", text: "About the same—metal-to-metal contact is fine" },
          { id: "higher", text: "Much higher—air gaps act as insulation" },
          { id: "lower", text: "Actually lower—paste slows heat transfer" },
          { id: "varies", text: "It depends on the weather" }
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
          Test CPU Cooling →
        </button>
      )}
    </div>
  );

  // Render twist play phase
  const renderTwistPlay = () => (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        CPU Thermal Paste Test
      </h2>
      <p className="text-gray-600 mb-4">
        Compare CPU cooling with and without thermal paste!
      </p>

      {/* Cooler type selector */}
      <div className="flex gap-2 mb-4">
        <button
          onMouseDown={() => {
            setCoolerType("no_paste");
            setCpuTemp(90);
            setCpuSimRunning(false);
          }}
          className={`flex-1 py-3 rounded-lg font-medium ${
            coolerType === "no_paste"
              ? "bg-red-500 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          No Paste
        </button>
        <button
          onMouseDown={() => {
            setCoolerType("with_paste");
            setCpuTemp(90);
            setCpuSimRunning(false);
          }}
          className={`flex-1 py-3 rounded-lg font-medium ${
            coolerType === "with_paste"
              ? "bg-green-500 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          With Paste
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
        {renderCPUCooling()}

        <button
          onMouseDown={() => {
            setCpuTemp(90);
            setCpuSimRunning(true);
          }}
          disabled={cpuSimRunning}
          className={`w-full mt-4 py-3 rounded-lg font-bold ${
            cpuSimRunning
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-400"
          }`}
        >
          {cpuSimRunning ? "Cooling..." : "Start CPU Load"}
        </button>
      </div>

      {/* Comparison results */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-red-50 p-3 rounded-lg">
          <h4 className="font-bold text-red-800 text-sm">Without Paste</h4>
          <p className="text-lg font-bold text-red-600">~75-85°C</p>
          <p className="text-xs text-gray-600">Throttling likely</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <h4 className="font-bold text-green-800 text-sm">With Paste</h4>
          <p className="text-lg font-bold text-green-600">~45-55°C</p>
          <p className="text-xs text-gray-600">Full performance</p>
        </div>
      </div>

      <div className="bg-purple-50 p-3 rounded-lg mb-4">
        <p className="text-purple-800 text-sm">
          💡 Proper thermal paste application can reduce temperatures by 20-30°C!
        </p>
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
        Why Thermal Paste is Critical
      </h2>

      <div className="space-y-4">
        <div className="bg-red-50 p-4 rounded-lg">
          <h3 className="font-bold text-red-800 mb-2">❌ Without Thermal Paste</h3>
          <ul className="text-gray-700 text-sm space-y-1">
            <li>• Air gaps trap heat on the CPU surface</li>
            <li>• Only peak-to-peak contact (1-2% of area)</li>
            <li>• CPU reaches 75-85°C or higher</li>
            <li>• Throttling reduces performance by 20-50%</li>
            <li>• Risk of thermal shutdown or damage</li>
          </ul>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-bold text-green-800 mb-2">✓ With Thermal Paste</h3>
          <ul className="text-gray-700 text-sm space-y-1">
            <li>• Paste fills all microscopic gaps</li>
            <li>• Effective 100% thermal contact</li>
            <li>• CPU stays at 45-55°C under load</li>
            <li>• Full boost clocks maintained</li>
            <li>• Longer CPU lifespan</li>
          </ul>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">🎯 Application Tips</h3>
          <ul className="text-gray-700 text-sm space-y-1">
            <li>• Pea-sized dot in center, or thin X pattern</li>
            <li>• Mounting pressure spreads it evenly</li>
            <li>• Too much = thick insulating layer (bad)</li>
            <li>• Too little = air gaps remain (bad)</li>
            <li>• Replace every 3-5 years (paste dries out)</li>
          </ul>
        </div>

        {twistPrediction === "higher" && (
          <div className="bg-green-100 p-4 rounded-lg border-2 border-green-400">
            <p className="text-green-800 font-semibold">
              🎉 Correct! Without thermal paste, air gaps act as insulation,
              causing 20-30°C higher temperatures and performance throttling.
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
        Thermal Contact in the Real World
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
                          ? "bg-blue-500 text-white"
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
                ? "Excellent! You understand thermal contact!"
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
                {["💻", "🔥", "❄️", "⭐", "✨"][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        )}

        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Thermal Contact Master!
        </h2>

        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Key Concepts Mastered
          </h3>
          <div className="grid gap-3 text-left">
            {[
              "Thermal contact resistance from microscopic air gaps",
              "Air is ~15,000× worse conductor than copper",
              "Thermal paste fills gaps to displace air",
              "Proper application: thin layer or pea-sized dot",
              "Too much paste creates insulating layer",
              "Critical for CPUs, LEDs, EVs, and spacecraft"
            ].map((concept, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span className="text-gray-700">{concept}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-xl mb-6">
          <p className="text-blue-800">
            💻 Next time you build a PC, you'll know exactly why that tiny
            tube of thermal paste is so important!
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <h1 className="font-bold text-gray-800">Thermal Contact</h1>
              <p className="text-xs text-gray-500">Heat gaps & thermal paste</p>
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
                  i <= currentPhaseIndex ? "bg-blue-500" : "bg-gray-200"
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
