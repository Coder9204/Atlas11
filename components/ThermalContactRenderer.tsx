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
interface ThermalContactRendererProps {
  onBack?: () => void;
  onGameEvent?: (event: GameEvent) => void;
  onPhaseComplete?: (phase: number) => void;
}

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
  onPhaseComplete,
}: ThermalContactRendererProps) {
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
        "In gases, molecules are far apart and transfer heat slowly via random collisions. Air's thermal conductivity is ~0.026 W/m-K vs copper's ~400 W/m-K."
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
      question: "Thermal conductivity of copper is ~400 W/m-K. Air is ~0.026 W/m-K. Copper conducts heat:",
      options: [
        "About 4 times better",
        "About 150 times better",
        "About 15,000 times better",
        "About the same"
      ],
      correct: 2,
      explanation:
        "400 / 0.026 = 15,000. Copper conducts heat about 15,000 times better than air. This is why even tiny air gaps are problematic."
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
      question: "In the formula Q = kA(T1-T2)/d, what does 'd' represent?",
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
        "CPUs generate 65-300W in a tiny area. Thermal paste between the CPU and heatsink is critical. Poor contact can mean 20-30C higher temps, causing throttling or damage. Premium pastes use silver or diamond particles.",
      icon: "cpu"
    },
    {
      title: "LED Lighting",
      description:
        "High-power LEDs convert 30-50% of energy to heat. Thermal interface materials bond LED chips to heat sinks. Without proper thermal management, LEDs dim rapidly and fail early. Star boards use thermal adhesive.",
      icon: "led"
    },
    {
      title: "Electric Vehicle Batteries",
      description:
        "EV battery packs use thermal pads between cells and cooling plates. Uniform thermal contact ensures even cell temperatures, maximizing range, charging speed, and battery lifespan. Gap fillers accommodate manufacturing tolerances.",
      icon: "battery"
    },
    {
      title: "Spacecraft Electronics",
      description:
        "In space, there's no air for convection. Electronics rely entirely on conduction to radiators. Thermal interface materials and bolted joints must be perfect - there's no repair possible once launched.",
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
        <rect width="400" height="350" fill="#1e293b" />

        {/* Hot block (left) */}
        <g transform="translate(50, 100)">
          <rect
            width="120"
            height="150"
            fill={getTempColor(hotBlockTemp)}
            stroke="#475569"
            strokeWidth={2}
            rx={5}
          />
          <text x="60" y="75" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">
            {hotBlockTemp.toFixed(1)}C
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
            stroke="#475569"
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

          <text x="30" y="-10" textAnchor="middle" fontSize="10" fill="#94a3b8">
            {currentInterface?.name}
          </text>
          <text x="30" y="170" textAnchor="middle" fontSize="9" fill="#64748b">
            k = {currentInterface?.conductivity} W/m-K
          </text>
        </g>

        {/* Cold block (right) */}
        <g transform="translate(230, 100)">
          <rect
            width="120"
            height="150"
            fill={getTempColor(coldBlockTemp)}
            stroke="#475569"
            strokeWidth={2}
            rx={5}
          />
          <text x="60" y="75" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">
            {coldBlockTemp.toFixed(1)}C
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
        <text x="200" y="30" textAnchor="middle" fontSize="14" fill="#e2e8f0" fontWeight="bold">
          Heat Transfer Through Interface
        </text>
        <text x="200" y="290" textAnchor="middle" fontSize="11" fill="#94a3b8">
          Temperature Difference: {(hotBlockTemp - coldBlockTemp).toFixed(1)}C
        </text>
        <text x="200" y="310" textAnchor="middle" fontSize="11" fill="#94a3b8">
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
        <rect width="400" height="300" fill="#1e293b" />

        {/* Motherboard */}
        <rect x="50" y="200" width="300" height="80" fill="#1b5e20" stroke="#475569" strokeWidth={2} />
        <text x="200" y="250" textAnchor="middle" fill="#a5d6a7" fontSize="10">
          MOTHERBOARD
        </text>

        {/* CPU */}
        <rect x="150" y="160" width="100" height="40" fill={getTempColor(cpuTemp)} stroke="#475569" strokeWidth={2} />
        <text x="200" y="185" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
          CPU {cpuTemp.toFixed(0)}C
        </text>

        {/* Thermal interface */}
        <rect
          x="155"
          y="155"
          width="90"
          height="5"
          fill={coolerType === "with_paste" ? "#bdbdbd" : "#e3f2fd"}
          stroke="#475569"
        />
        {coolerType === "no_paste" && (
          <text x="200" y="152" textAnchor="middle" fontSize="8" fill="#f44336">
            AIR GAPS!
          </text>
        )}

        {/* Heat sink */}
        <rect x="140" y="70" width="120" height="85" fill="#78909c" stroke="#475569" strokeWidth={2} />
        {/* Heat sink fins */}
        {[...Array(8)].map((_, i) => (
          <rect
            key={i}
            x={145 + i * 14}
            y="20"
            width="10"
            height="50"
            fill="#90a4ae"
            stroke="#475569"
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
          <rect x={0} y={0} width={40} height={120} fill="#1f2937" stroke="#374151" rx={5} />
          <rect
            x={5}
            y={115 - (cpuTemp - 30) * 1.5}
            width={30}
            height={(cpuTemp - 30) * 1.5}
            fill={getTempColor(cpuTemp)}
            rx={3}
          />
          <text x={20} y={-10} textAnchor="middle" fontSize="10" fill="white">
            {cpuTemp.toFixed(0)}C
          </text>
        </g>

        {/* Status */}
        <text x="200" y="290" textAnchor="middle" fontSize="11" fill={cpuTemp > 80 ? "#f44336" : cpuTemp > 60 ? "#ff9800" : "#4caf50"}>
          {cpuTemp > 80 ? "THROTTLING! Too Hot!" : cpuTemp > 60 ? "Warm - Reduced Performance" : "Cool - Full Performance"}
        </text>
      </svg>
    );
  };

  // Render hook phase
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-red-400 tracking-wide">HEAT TRANSFER PHYSICS</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-red-100 to-blue-200 bg-clip-text text-transparent">
        The Hidden Heat Barrier
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover why microscopic gaps can block the flow of thermal energy
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-blue-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">
            <span className="inline-block">&#128293;</span>
            <span className="mx-2">&#8596;&#65039;</span>
            <span className="inline-block">&#10052;&#65039;</span>
          </div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              You press two metal blocks together - one hot, one cold. Heat should
              flow freely between them, right?
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              But something invisible is blocking the way. Even "smooth" surfaces have a secret that
              makes heat transfer surprisingly difficult.
            </p>
            <div className="pt-2">
              <p className="text-base text-red-400 font-semibold">
                Why does your computer need thermal paste?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover Thermal Contact
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-red-400">&#10022;</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-400">&#10022;</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-red-400">&#10022;</span>
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
          Two polished metal blocks (hot and cold) are pressed firmly together.
          Under a microscope, the "smooth" surfaces are actually rough, with
          tiny peaks and valleys. Only the peaks actually touch.
        </p>
        <p className="text-lg text-red-400 font-medium">
          What fills the tiny gaps between the surfaces?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: "nothing", text: "Nothing - it's a vacuum" },
          { id: "air", text: "Air - a poor thermal conductor" },
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
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              prediction === option.id
                ? option.id === "air" ? "bg-emerald-600/40 border-2 border-emerald-400" : "bg-red-600/40 border-2 border-red-400"
                : "bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent"
            }`}
          >
            <span className="text-slate-200">{option.text}</span>
          </button>
        ))}
      </div>

      {prediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className={`font-semibold ${prediction === "air" ? "text-emerald-400" : "text-red-400"}`}>
            {prediction === "air"
              ? "Correct! The gaps are filled with air, which is a terrible thermal conductor!"
              : "Not quite - the gaps are actually filled with air, a poor thermal conductor."}
          </p>
          <button
            onMouseDown={() => goToPhase(2)}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl"
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
      <h2 className="text-2xl font-bold text-white mb-4">Thermal Contact Experiment</h2>
      <p className="text-slate-400 mb-6 text-center max-w-md">
        Compare heat transfer through different interface types!
      </p>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6">
        {renderHeatTransfer()}

        <div className="flex gap-2 mt-4">
          {!simRunning ? (
            <button
              onMouseDown={startSim}
              className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-500"
            >
              &#128293; Start Heat Transfer
            </button>
          ) : (
            <button
              onMouseDown={resetSim}
              className="flex-1 py-3 bg-slate-600 text-white rounded-lg font-bold hover:bg-slate-500"
            >
              Reset
            </button>
          )}
          <button
            onMouseDown={() => setShowMicroscopic(!showMicroscopic)}
            className={`px-4 py-3 rounded-lg font-medium ${
              showMicroscopic
                ? "bg-purple-600 text-white"
                : "bg-slate-700 text-slate-300"
            }`}
          >
            &#128300;
          </button>
        </div>
      </div>

      {/* Interface selector */}
      <div className="bg-slate-800/50 rounded-xl p-4 mb-6 w-full max-w-md">
        <label className="block text-sm font-medium text-slate-300 mb-2">
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
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {opt.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {interfaceOptions.find(o => o.type === interfaceType)?.description}
        </p>
      </div>

      {/* Thermal conductivity comparison */}
      <div className="bg-blue-900/30 p-4 rounded-xl border border-blue-600/30 mb-6 w-full max-w-md">
        <h3 className="font-bold text-blue-400 mb-2">Thermal Conductivity (W/m-K)</h3>
        <div className="space-y-2">
          {[
            { name: "Air", k: 0.026, width: 1 },
            { name: "Bare Contact", k: 2.5, width: 10 },
            { name: "Thermal Paste", k: 8.5, width: 35 },
            { name: "Copper", k: 400, width: 100 },
          ].map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <span className="w-24 text-sm text-slate-300">{item.name}</span>
              <div className="flex-1 bg-slate-700 rounded-full h-4">
                <div
                  className="bg-blue-500 h-4 rounded-full"
                  style={{ width: `${item.width}%` }}
                />
              </div>
              <span className="text-xs w-12 text-slate-400">{item.k}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onMouseDown={() => goToPhase(3)}
        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl"
      >
        Learn the Science
      </button>
    </div>
  );

  // Render review phase
  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Thermal Contact Resistance</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-red-900/40 to-orange-900/40 rounded-2xl p-6 border border-red-600/30">
          <h3 className="text-xl font-bold text-red-400 mb-3">&#128300; The Microscopic Problem</h3>
          <p className="text-slate-300 text-sm mb-2">
            Even "smooth" surfaces are rough at the microscale. When pressed together:
          </p>
          <ul className="text-sm space-y-1 text-slate-300">
            <li>Only ~1-2% of the area actually touches</li>
            <li>The rest is filled with AIR (k = 0.026 W/m-K)</li>
            <li>Air is ~15,000x worse at conducting heat than copper!</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-2xl p-6 border border-blue-600/30">
          <h3 className="text-xl font-bold text-blue-400 mb-3">&#129521; The Solution</h3>
          <p className="text-slate-300 text-sm mb-2">
            Thermal paste/grease fills the air gaps:
          </p>
          <ul className="text-sm space-y-1 text-slate-300">
            <li>Displaces air (bad conductor) with paste (better)</li>
            <li>Even though paste isn't as good as metal, it's 300x better than air</li>
            <li>Reduces thermal resistance by 50-80%</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-2xl p-6 border border-emerald-600/30 md:col-span-2">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">&#128208; Fourier's Law</h3>
          <div className="font-mono text-center text-lg text-emerald-400 mb-2">
            Q = k x A x (T1 - T2) / d
          </div>
          <p className="text-slate-300 text-sm">
            Heat flow (Q) depends on conductivity (k), area (A), temperature
            difference, and thickness (d). Better interface = higher effective k.
          </p>
        </div>
      </div>

      {prediction === "air" && (
        <div className="mt-6 p-4 bg-emerald-900/30 rounded-xl border border-emerald-600 max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! The gaps are filled with air, which is a terrible thermal conductor. That's why we use thermal paste!
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
      <h2 className="text-2xl font-bold text-amber-400 mb-6">&#128187; The CPU Twist</h2>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A CPU generates 100W of heat in an area smaller than your thumbnail.
          A heat sink is mounted on top. What happens if you forget the thermal paste?
        </p>
        <p className="text-lg text-amber-400 font-medium">
          Without thermal paste, the CPU temperature will be:
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: "same", text: "About the same - metal-to-metal contact is fine" },
          { id: "higher", text: "Much higher - air gaps act as insulation" },
          { id: "lower", text: "Actually lower - paste slows heat transfer" },
          { id: "varies", text: "It depends on the weather" }
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
                ? option.id === "higher" ? "bg-emerald-600/40 border-2 border-emerald-400" : "bg-purple-600/40 border-2 border-purple-400"
                : "bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent"
            }`}
          >
            <span className="text-slate-200">{option.text}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className={`font-semibold ${twistPrediction === "higher" ? "text-emerald-400" : "text-amber-400"}`}>
            {twistPrediction === "higher"
              ? "Correct! Without thermal paste, air gaps act as insulation, causing 20-30C higher temperatures!"
              : "Not quite - air gaps act as insulation, causing much higher temperatures!"}
          </p>
          <button
            onMouseDown={() => goToPhase(5)}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
          >
            Test CPU Cooling
          </button>
        </div>
      )}
    </div>
  );

  // Render twist play phase
  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-4">CPU Thermal Paste Test</h2>
      <p className="text-slate-400 mb-6">Compare CPU cooling with and without thermal paste!</p>

      {/* Cooler type selector */}
      <div className="flex gap-2 mb-6">
        <button
          onMouseDown={() => {
            setCoolerType("no_paste");
            setCpuTemp(90);
            setCpuSimRunning(false);
          }}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            coolerType === "no_paste"
              ? "bg-red-600 text-white"
              : "bg-slate-700 text-slate-300"
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
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            coolerType === "with_paste"
              ? "bg-emerald-600 text-white"
              : "bg-slate-700 text-slate-300"
          }`}
        >
          With Paste
        </button>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6">
        {renderCPUCooling()}

        <button
          onMouseDown={() => {
            setCpuTemp(90);
            setCpuSimRunning(true);
          }}
          disabled={cpuSimRunning}
          className={`w-full mt-4 py-3 rounded-lg font-bold ${
            cpuSimRunning
              ? "bg-slate-600 text-slate-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-500"
          }`}
        >
          {cpuSimRunning ? "Cooling..." : "Start CPU Load"}
        </button>
      </div>

      {/* Comparison results */}
      <div className="grid grid-cols-2 gap-4 max-w-xl mb-6">
        <div className="bg-red-900/30 p-4 rounded-xl border border-red-600/30">
          <h4 className="font-bold text-red-400 text-sm mb-2">Without Paste</h4>
          <p className="text-lg font-bold text-red-400">~75-85C</p>
          <p className="text-xs text-slate-400">Throttling likely</p>
        </div>
        <div className="bg-emerald-900/30 p-4 rounded-xl border border-emerald-600/30">
          <h4 className="font-bold text-emerald-400 text-sm mb-2">With Paste</h4>
          <p className="text-lg font-bold text-emerald-400">~45-55C</p>
          <p className="text-xs text-slate-400">Full performance</p>
        </div>
      </div>

      <div className="bg-purple-900/30 p-4 rounded-xl border border-purple-600/30 mb-6 max-w-xl">
        <p className="text-purple-300 text-sm">
          &#128161; Proper thermal paste application can reduce temperatures by 20-30C!
        </p>
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
      <h2 className="text-2xl font-bold text-amber-400 mb-6">Why Thermal Paste is Critical</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-red-900/40 to-orange-900/40 rounded-2xl p-6 border border-red-600/30">
          <h3 className="text-xl font-bold text-red-400 mb-3">&#10060; Without Thermal Paste</h3>
          <ul className="text-slate-300 text-sm space-y-1">
            <li>Air gaps trap heat on the CPU surface</li>
            <li>Only peak-to-peak contact (1-2% of area)</li>
            <li>CPU reaches 75-85C or higher</li>
            <li>Throttling reduces performance by 20-50%</li>
            <li>Risk of thermal shutdown or damage</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-2xl p-6 border border-emerald-600/30">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">&#10003; With Thermal Paste</h3>
          <ul className="text-slate-300 text-sm space-y-1">
            <li>Paste fills all microscopic gaps</li>
            <li>Effective 100% thermal contact</li>
            <li>CPU stays at 45-55C under load</li>
            <li>Full boost clocks maintained</li>
            <li>Longer CPU lifespan</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-2xl p-6 border border-blue-600/30 md:col-span-2">
          <h3 className="text-xl font-bold text-blue-400 mb-3">&#127919; Application Tips</h3>
          <ul className="text-slate-300 text-sm space-y-1">
            <li>Pea-sized dot in center, or thin X pattern</li>
            <li>Mounting pressure spreads it evenly</li>
            <li>Too much = thick insulating layer (bad)</li>
            <li>Too little = air gaps remain (bad)</li>
            <li>Replace every 3-5 years (paste dries out)</li>
          </ul>
        </div>
      </div>

      {twistPrediction === "higher" && (
        <div className="mt-6 p-4 bg-emerald-900/30 rounded-xl border border-emerald-600 max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! Without thermal paste, air gaps act as insulation,
            causing 20-30C higher temperatures and performance throttling.
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
      <h2 className="text-2xl font-bold text-white mb-6">Thermal Contact in the Real World</h2>

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
                {app.icon === "cpu" && "&#128187;"}
                {app.icon === "led" && "&#128161;"}
                {app.icon === "battery" && "&#128267;"}
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
                        ? "bg-blue-600 text-white"
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
              ? "Excellent! You understand thermal contact!"
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
                {["&#128187;", "&#128293;", "&#10052;&#65039;", "&#11088;", "&#10024;"][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        )}

        <div className="relative bg-gradient-to-br from-red-900/50 via-orange-900/50 to-blue-900/50 rounded-3xl p-8 max-w-2xl border border-orange-600/30">
          <div className="text-8xl mb-6">&#127942;</div>
          <h1 className="text-3xl font-bold text-white mb-4">Thermal Contact Master!</h1>

          <p className="text-xl text-slate-300 mb-6">You've mastered thermal contact resistance and heat transfer!</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl mb-2">&#128300;</div>
              <p className="text-sm text-slate-300">Microscopic Gaps</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl mb-2">&#129521;</div>
              <p className="text-sm text-slate-300">Thermal Paste</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl mb-2">&#128187;</div>
              <p className="text-sm text-slate-300">CPU Cooling</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl mb-2">&#128208;</div>
              <p className="text-sm text-slate-300">Fourier's Law</p>
            </div>
          </div>

          <div className="p-4 bg-blue-900/30 rounded-xl border border-blue-600/30 mb-6">
            <p className="text-blue-300">
              &#128187; Next time you build a PC, you'll know exactly why that tiny
              tube of thermal paste is so important!
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Thermal Contact</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-red-400 w-6 shadow-lg shadow-red-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-red-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
}
