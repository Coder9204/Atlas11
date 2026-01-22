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
interface SolarHeatingRendererProps {
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

// Surface properties
interface Surface {
  name: string;
  absorptivity: number;
  emissivity: number;
  color: string;
  icon: string;
}

const surfaces: Surface[] = [
  { name: "Matte Black", absorptivity: 0.95, emissivity: 0.95, color: "#1a1a1a", icon: "⬛" },
  { name: "Dark Blue", absorptivity: 0.85, emissivity: 0.85, color: "#1a3a5c", icon: "🟦" },
  { name: "Red", absorptivity: 0.75, emissivity: 0.75, color: "#8b0000", icon: "🟥" },
  { name: "Green", absorptivity: 0.65, emissivity: 0.65, color: "#2d5a27", icon: "🟩" },
  { name: "White", absorptivity: 0.20, emissivity: 0.90, color: "#f5f5f5", icon: "⬜" },
  { name: "Mirror/Shiny", absorptivity: 0.05, emissivity: 0.05, color: "#d4d4d4", icon: "🪞" },
];

export default function SolarHeatingRenderer({
  onBack,
  onGameEvent,
}: SolarHeatingRendererProps) {
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
  const [surface1Index, setSurface1Index] = useState(0); // Black
  const [surface2Index, setSurface2Index] = useState(5); // Mirror
  const [sunIntensity, setSunIntensity] = useState(800); // W/m²
  const [ambientTemp, setAmbientTemp] = useState(25);
  const [temp1, setTemp1] = useState(25);
  const [temp2, setTemp2] = useState(25);
  const [simRunning, setSimRunning] = useState(false);
  const [simTime, setSimTime] = useState(0);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Twist state - night cooling
  const [timeOfDay, setTimeOfDay] = useState<"day" | "night">("day");
  const [twistTemp1, setTwistTemp1] = useState(50);
  const [twistTemp2, setTwistTemp2] = useState(50);
  const [twistSimRunning, setTwistSimRunning] = useState(false);

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

  // Day heating simulation
  useEffect(() => {
    if (!simRunning) return;

    const interval = setInterval(() => {
      setSimTime((t) => t + 1);

      const surface1 = surfaces[surface1Index];
      const surface2 = surfaces[surface2Index];

      // Simplified heating model: dT/dt = α × I - ε × σ × (T⁴ - T_amb⁴)
      // Approximated as: T approaches equilibrium exponentially
      const equilibrium1 = ambientTemp + (sunIntensity * surface1.absorptivity) / 20;
      const equilibrium2 = ambientTemp + (sunIntensity * surface2.absorptivity) / 20;

      setTemp1((t) => t + (equilibrium1 - t) * 0.05);
      setTemp2((t) => t + (equilibrium2 - t) * 0.05);
    }, 100);

    return () => clearInterval(interval);
  }, [simRunning, surface1Index, surface2Index, sunIntensity, ambientTemp]);

  // Night cooling simulation
  useEffect(() => {
    if (!twistSimRunning || timeOfDay !== "night") return;

    const interval = setInterval(() => {
      const surface1 = surfaces[surface1Index];
      const surface2 = surfaces[surface2Index];

      // At night, good emitters (high ε) cool faster
      const coolRate1 = surface1.emissivity * 0.5;
      const coolRate2 = surface2.emissivity * 0.5;

      setTwistTemp1((t) => Math.max(ambientTemp, t - coolRate1));
      setTwistTemp2((t) => Math.max(ambientTemp, t - coolRate2));
    }, 100);

    return () => clearInterval(interval);
  }, [twistSimRunning, timeOfDay, surface1Index, surface2Index, ambientTemp]);

  // Start simulation
  const startSim = () => {
    setTemp1(ambientTemp);
    setTemp2(ambientTemp);
    setSimTime(0);
    setSimRunning(true);
    playSound("click");
    emitEvent("simulation_started", {
      surface1: surfaces[surface1Index].name,
      surface2: surfaces[surface2Index].name,
    });
  };

  // Reset simulation
  const resetSim = () => {
    setSimRunning(false);
    setTemp1(ambientTemp);
    setTemp2(ambientTemp);
    setSimTime(0);
  };

  // Start twist simulation
  const startTwistSim = () => {
    setTwistTemp1(50);
    setTwistTemp2(50);
    setTwistSimRunning(true);
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
      question: "Why does a black car get hotter than a white car in sunlight?",
      options: [
        "Black paint is thicker",
        "Black absorbs more light energy, converting it to heat",
        "White cars have better air conditioning",
        "Black metal conducts heat better"
      ],
      correct: 1,
      explanation:
        "Black surfaces absorb most wavelengths of light (~95%), converting that energy to heat. White surfaces reflect most light (~80%) away."
    },
    {
      question: "What is absorptivity (α)?",
      options: [
        "How hot a surface can get",
        "The fraction of incoming radiation absorbed",
        "How fast heat spreads through a material",
        "The surface's reflectivity"
      ],
      correct: 1,
      explanation:
        "Absorptivity (α) is the fraction of incident radiation that is absorbed. It ranges from 0 (perfect reflector) to 1 (perfect absorber)."
    },
    {
      question: "According to Kirchhoff's Law, a good absorber is also:",
      options: [
        "A good insulator",
        "A poor reflector only",
        "A good emitter at the same wavelength",
        "A good conductor"
      ],
      correct: 2,
      explanation:
        "Kirchhoff's Law states α = ε (absorptivity equals emissivity) for a given wavelength. Objects that absorb radiation well also emit it well."
    },
    {
      question: "Why are many roofs in hot climates painted white?",
      options: [
        "White paint is cheaper",
        "White reflects sunlight, reducing solar heat gain",
        "White roofs are more waterproof",
        "It's a tradition"
      ],
      correct: 1,
      explanation:
        "White or reflective roofs bounce solar radiation away, reducing heat absorption and keeping buildings cooler with less air conditioning."
    },
    {
      question: "A shiny metal surface has low absorptivity AND low emissivity. At night it will:",
      options: [
        "Cool very quickly",
        "Stay warm longer than a black surface",
        "Heat up",
        "Not change temperature"
      ],
      correct: 1,
      explanation:
        "Low emissivity means it radiates heat slowly. While a black surface (high ε) radiates heat away quickly, shiny surfaces retain heat longer."
    },
    {
      question: "Solar water heaters are painted black because:",
      options: [
        "Black looks professional",
        "Black maximizes solar absorption for heating",
        "Black resists corrosion",
        "Black is the cheapest paint"
      ],
      correct: 1,
      explanation:
        "Black maximizes solar absorption (α ≈ 0.95). The absorbed solar energy heats the water. This is the primary goal of solar thermal collectors."
    },
    {
      question: "A 'selective surface' in solar technology has high absorptivity and low emissivity. Why is this ideal?",
      options: [
        "It looks better",
        "It absorbs solar energy but doesn't radiate it away as heat",
        "It's cheaper to manufacture",
        "It reflects harmful UV"
      ],
      correct: 1,
      explanation:
        "Selective surfaces absorb visible/solar wavelengths (which heat them) but don't emit infrared (which would cool them). This maximizes efficiency."
    },
    {
      question: "On a clear night, which surface will cool below ambient air temperature first?",
      options: [
        "White surface",
        "Black surface",
        "Mirror surface",
        "All cool equally"
      ],
      correct: 1,
      explanation:
        "Black surfaces have high emissivity, radiating heat to the cold sky efficiently. They can cool below air temperature through radiative cooling."
    },
    {
      question: "Why do desert animals often have light-colored fur or scales?",
      options: [
        "Camouflage only",
        "Light colors reflect solar radiation, keeping them cooler",
        "Darker animals can't survive",
        "It's random evolution"
      ],
      correct: 1,
      explanation:
        "Light coloring reflects solar radiation, reducing heat absorption. This is crucial for survival in hot, sunny desert environments."
    },
    {
      question: "Albedo is the fraction of light reflected. Earth's average albedo is ~0.30. This means:",
      options: [
        "Earth absorbs all sunlight",
        "Earth reflects 30% and absorbs 70% of incoming sunlight",
        "Earth reflects 70% of sunlight",
        "Albedo only applies to ice"
      ],
      correct: 1,
      explanation:
        "An albedo of 0.30 means 30% of incoming solar radiation is reflected back to space, while 70% is absorbed by Earth's surface and atmosphere."
    }
  ];

  // Real-world applications
  const applications = [
    {
      title: "Cool Roofs",
      description:
        "White or reflective roofs can reduce building temperatures by 30°C compared to dark roofs. This cuts air conditioning costs by 10-40% and reduces urban heat island effects in cities.",
      icon: "🏠"
    },
    {
      title: "Solar Thermal Collectors",
      description:
        "Black-coated tubes absorb sunlight and heat water to 60-80°C for domestic hot water. Advanced 'selective surfaces' absorb solar wavelengths but don't emit infrared, reaching higher temperatures.",
      icon: "☀️"
    },
    {
      title: "Spacecraft Thermal Control",
      description:
        "Satellites use carefully chosen surface coatings: reflective MLI (Multi-Layer Insulation) to reject sunlight, and radiator panels with high emissivity to dump waste heat to cold space.",
      icon: "🛰️"
    },
    {
      title: "Desert Survival Clothing",
      description:
        "Traditional desert robes are often white on outside (reflects sun) and black on inside (absorbs body heat). The loose fit creates convection currents that carry heat away from the body.",
      icon: "🏜️"
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
    if (temp < 40) return "#22c55e";
    if (temp < 50) return "#eab308";
    if (temp < 60) return "#f97316";
    return "#ef4444";
  };

  // Render heating visualization
  const renderHeatingVisualization = () => {
    const surface1 = surfaces[surface1Index];
    const surface2 = surfaces[surface2Index];

    return (
      <svg viewBox="0 0 400 350" className="w-full max-w-md mx-auto">
        {/* Sky gradient */}
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#87CEEB" />
            <stop offset="100%" stopColor="#E0F4FF" />
          </linearGradient>
          <radialGradient id="sunGrad">
            <stop offset="0%" stopColor="#FFF700" />
            <stop offset="100%" stopColor="#FFD700" />
          </radialGradient>
        </defs>

        {/* Sky */}
        <rect width="400" height="200" fill="url(#skyGrad)" />

        {/* Sun */}
        <circle cx="200" cy="50" r={30 + sunIntensity / 100} fill="url(#sunGrad)" />
        {/* Sun rays */}
        {[...Array(8)].map((_, i) => {
          const angle = (i / 8) * Math.PI * 2 + animationFrame / 100;
          const r1 = 40 + sunIntensity / 100;
          const r2 = 60 + sunIntensity / 50;
          return (
            <line
              key={i}
              x1={200 + Math.cos(angle) * r1}
              y1={50 + Math.sin(angle) * r1}
              x2={200 + Math.cos(angle) * r2}
              y2={50 + Math.sin(angle) * r2}
              stroke="#FFD700"
              strokeWidth={3}
              opacity={0.7}
            />
          );
        })}

        {/* Ground */}
        <rect y="200" width="400" height="150" fill="#8B7355" />

        {/* Surface 1 (left) */}
        <g transform="translate(60, 180)">
          {/* Incoming rays */}
          {simRunning && [...Array(3)].map((_, i) => {
            const y = -80 + ((animationFrame * 2 + i * 40) % 100);
            const absorbed = surface1.absorptivity;
            return (
              <g key={i}>
                <line
                  x1={40 + i * 20}
                  y1={y}
                  x2={40 + i * 20}
                  y2={Math.min(0, y + 100)}
                  stroke="#FFD700"
                  strokeWidth={2}
                  opacity={0.8}
                />
                {/* Reflected portion */}
                {y > -20 && absorbed < 0.9 && (
                  <line
                    x1={40 + i * 20}
                    y1={0}
                    x2={30 + i * 20}
                    y2={-30}
                    stroke="#FFD700"
                    strokeWidth={2}
                    opacity={(1 - absorbed) * 0.8}
                  />
                )}
              </g>
            );
          })}

          {/* Surface block */}
          <rect
            x={0}
            y={0}
            width={120}
            height={80}
            fill={surface1.color}
            stroke="#333"
            strokeWidth={2}
          />

          {/* Heat glow */}
          {simRunning && temp1 > ambientTemp + 5 && (
            <rect
              x={0}
              y={0}
              width={120}
              height={80}
              fill={getTempColor(temp1)}
              opacity={0.3}
            />
          )}

          {/* Temperature display */}
          <text x={60} y={100} textAnchor="middle" fill="#333" fontSize="14" fontWeight="bold">
            {temp1.toFixed(1)}°C
          </text>
          <text x={60} y={115} textAnchor="middle" fill="#666" fontSize="10">
            {surface1.name}
          </text>
          <text x={60} y={130} textAnchor="middle" fill="#888" fontSize="9">
            α = {surface1.absorptivity}
          </text>
        </g>

        {/* Surface 2 (right) */}
        <g transform="translate(220, 180)">
          {/* Incoming rays */}
          {simRunning && [...Array(3)].map((_, i) => {
            const y = -80 + ((animationFrame * 2 + i * 40) % 100);
            const absorbed = surface2.absorptivity;
            return (
              <g key={i}>
                <line
                  x1={40 + i * 20}
                  y1={y}
                  x2={40 + i * 20}
                  y2={Math.min(0, y + 100)}
                  stroke="#FFD700"
                  strokeWidth={2}
                  opacity={0.8}
                />
                {/* Reflected portion */}
                {y > -20 && absorbed < 0.9 && (
                  <line
                    x1={40 + i * 20}
                    y1={0}
                    x2={50 + i * 20}
                    y2={-30}
                    stroke="#FFD700"
                    strokeWidth={2}
                    opacity={(1 - absorbed) * 0.8}
                  />
                )}
              </g>
            );
          })}

          {/* Surface block */}
          <rect
            x={0}
            y={0}
            width={120}
            height={80}
            fill={surface2.color}
            stroke="#333"
            strokeWidth={2}
          />

          {/* Reflection effect for shiny surfaces */}
          {surface2.absorptivity < 0.2 && (
            <rect x={10} y={10} width={30} height={20} fill="white" opacity={0.3} rx={5} />
          )}

          {/* Heat glow */}
          {simRunning && temp2 > ambientTemp + 5 && (
            <rect
              x={0}
              y={0}
              width={120}
              height={80}
              fill={getTempColor(temp2)}
              opacity={0.3}
            />
          )}

          {/* Temperature display */}
          <text x={60} y={100} textAnchor="middle" fill="#333" fontSize="14" fontWeight="bold">
            {temp2.toFixed(1)}°C
          </text>
          <text x={60} y={115} textAnchor="middle" fill="#666" fontSize="10">
            {surface2.name}
          </text>
          <text x={60} y={130} textAnchor="middle" fill="#888" fontSize="9">
            α = {surface2.absorptivity}
          </text>
        </g>

        {/* Info */}
        <text x={200} y={25} textAnchor="middle" fill="#333" fontSize="12">
          Sun Intensity: {sunIntensity} W/m² | Ambient: {ambientTemp}°C
        </text>
      </svg>
    );
  };

  // Render night cooling visualization
  const renderNightVisualization = () => {
    const surface1 = surfaces[surface1Index];
    const surface2 = surfaces[surface2Index];

    return (
      <svg viewBox="0 0 400 350" className="w-full max-w-md mx-auto">
        {/* Night sky */}
        <defs>
          <linearGradient id="nightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a1628" />
            <stop offset="100%" stopColor="#1a2a4a" />
          </linearGradient>
        </defs>

        <rect width="400" height="200" fill="url(#nightGrad)" />

        {/* Stars */}
        {[...Array(20)].map((_, i) => (
          <circle
            key={i}
            cx={20 + (i * 37) % 360}
            cy={20 + (i * 23) % 160}
            r={1 + Math.random()}
            fill="white"
            opacity={0.5 + Math.sin(animationFrame / 20 + i) * 0.3}
          />
        ))}

        {/* Moon */}
        <circle cx="320" cy="60" r="25" fill="#E8E8E8" />
        <circle cx="315" cy="55" r="5" fill="#C8C8C8" />
        <circle cx="330" cy="65" r="3" fill="#C8C8C8" />

        {/* Ground */}
        <rect y="200" width="400" height="150" fill="#3a3a3a" />

        {/* Surface 1 (left) */}
        <g transform="translate(60, 180)">
          {/* Infrared emission */}
          {twistSimRunning && twistTemp1 > ambientTemp && (
            <>
              {[...Array(3)].map((_, i) => {
                const progress = ((animationFrame + i * 30) % 60) / 60;
                return (
                  <line
                    key={i}
                    x1={30 + i * 30}
                    y1={0}
                    x2={30 + i * 30}
                    y2={-30 - progress * 50}
                    stroke="#ff6b6b"
                    strokeWidth={2}
                    opacity={(1 - progress) * surface1.emissivity}
                    strokeDasharray="4,4"
                  />
                );
              })}
            </>
          )}

          <rect
            x={0}
            y={0}
            width={120}
            height={80}
            fill={surface1.color}
            stroke="#555"
            strokeWidth={2}
          />

          {/* Heat glow */}
          {twistTemp1 > ambientTemp + 3 && (
            <rect
              x={0}
              y={0}
              width={120}
              height={80}
              fill={getTempColor(twistTemp1)}
              opacity={0.3}
            />
          )}

          <text x={60} y={100} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
            {twistTemp1.toFixed(1)}°C
          </text>
          <text x={60} y={115} textAnchor="middle" fill="#aaa" fontSize="10">
            {surface1.name}
          </text>
          <text x={60} y={130} textAnchor="middle" fill="#888" fontSize="9">
            ε = {surface1.emissivity}
          </text>
        </g>

        {/* Surface 2 (right) */}
        <g transform="translate(220, 180)">
          {/* Infrared emission */}
          {twistSimRunning && twistTemp2 > ambientTemp && (
            <>
              {[...Array(3)].map((_, i) => {
                const progress = ((animationFrame + i * 30) % 60) / 60;
                return (
                  <line
                    key={i}
                    x1={30 + i * 30}
                    y1={0}
                    x2={30 + i * 30}
                    y2={-30 - progress * 50}
                    stroke="#ff6b6b"
                    strokeWidth={2}
                    opacity={(1 - progress) * surface2.emissivity}
                    strokeDasharray="4,4"
                  />
                );
              })}
            </>
          )}

          <rect
            x={0}
            y={0}
            width={120}
            height={80}
            fill={surface2.color}
            stroke="#555"
            strokeWidth={2}
          />

          {surface2.absorptivity < 0.2 && (
            <rect x={10} y={10} width={30} height={20} fill="white" opacity={0.2} rx={5} />
          )}

          {twistTemp2 > ambientTemp + 3 && (
            <rect
              x={0}
              y={0}
              width={120}
              height={80}
              fill={getTempColor(twistTemp2)}
              opacity={0.3}
            />
          )}

          <text x={60} y={100} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
            {twistTemp2.toFixed(1)}°C
          </text>
          <text x={60} y={115} textAnchor="middle" fill="#aaa" fontSize="10">
            {surface2.name}
          </text>
          <text x={60} y={130} textAnchor="middle" fill="#888" fontSize="9">
            ε = {surface2.emissivity}
          </text>
        </g>

        <text x={200} y={25} textAnchor="middle" fill="white" fontSize="12">
          Night Sky (≈ 3K) | Ambient: {ambientTemp}°C
        </text>
        <text x={200} y={45} textAnchor="middle" fill="#ff6b6b" fontSize="10">
          ~ Infrared radiation escaping to cold sky ~
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
        <span className="text-sm font-medium text-orange-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-orange-100 to-yellow-200 bg-clip-text text-transparent">
        Why Do Black Cars Get So Hot?
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover why color matters for temperature in sunlight
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-yellow-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">☀️ ⬛ ⬜ 🌡️</div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              On a sunny day, a black car's interior can reach 70°C
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              while a white car stays much cooler
            </p>
            <div className="pt-2">
              <p className="text-base text-orange-400 font-semibold">
                Can you predict which color heats up fastest?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={() => goToPhase("predict")}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-orange-500 to-yellow-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Test Your Intuition
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-orange-400">✦</span>
          Solar Absorption
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-400">✦</span>
          Kirchhoff's Law
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-400">✦</span>
          Cool Roofs
        </div>
      </div>
    </div>
  );

  // Render predict phase
  const renderPredict = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Make Your Prediction</h2>
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <p className="text-gray-700">
          Two identical objects are placed in sunlight. One is matte black,
          the other is shiny mirror-like. After 10 minutes, which will be hotter?
        </p>
      </div>

      <p className="text-gray-700 font-medium mb-4">
        Which surface heats up more in sunlight?
      </p>

      <div className="space-y-3">
        {[
          { id: "black", text: "Matte black—it absorbs more sunlight" },
          { id: "mirror", text: "Shiny mirror—metal conducts heat better" },
          { id: "same", text: "Both the same—sunlight is the same intensity" },
          { id: "white", text: "Neither—only white surfaces absorb heat" }
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
                ? "bg-yellow-500 text-white shadow-lg"
                : "bg-white border-2 border-gray-200 hover:border-yellow-300"
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
        Solar Heating Experiment
      </h2>
      <p className="text-gray-600 mb-4">
        Compare how different surfaces heat up in sunlight!
      </p>

      <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
        {renderHeatingVisualization()}

        <div className="flex gap-2 mt-4">
          {!simRunning ? (
            <button
              onMouseDown={startSim}
              className="flex-1 py-3 bg-yellow-400 text-gray-800 rounded-lg font-bold hover:bg-yellow-300"
            >
              ☀️ Start Heating
            </button>
          ) : (
            <button
              onMouseDown={resetSim}
              className="flex-1 py-3 bg-gray-400 text-white rounded-lg font-bold hover:bg-gray-300"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Surface selection */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 shadow">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Surface 1:
          </label>
          <select
            value={surface1Index}
            onChange={(e) => {
              setSurface1Index(parseInt(e.target.value));
              resetSim();
            }}
            className="w-full p-2 border rounded"
          >
            {surfaces.map((s, i) => (
              <option key={i} value={i}>
                {s.icon} {s.name} (α={s.absorptivity})
              </option>
            ))}
          </select>
        </div>
        <div className="bg-white rounded-lg p-3 shadow">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Surface 2:
          </label>
          <select
            value={surface2Index}
            onChange={(e) => {
              setSurface2Index(parseInt(e.target.value));
              resetSim();
            }}
            className="w-full p-2 border rounded"
          >
            {surfaces.map((s, i) => (
              <option key={i} value={i}>
                {s.icon} {s.name} (α={s.absorptivity})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sun intensity control */}
      <div className="bg-white rounded-lg p-4 shadow mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sun Intensity: {sunIntensity} W/m²
        </label>
        <input
          type="range"
          min="200"
          max="1200"
          value={sunIntensity}
          onChange={(e) => setSunIntensity(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Cloudy</span>
          <span>Sunny</span>
          <span>Desert Noon</span>
        </div>
      </div>

      {/* Results */}
      {simTime > 30 && (
        <div className="bg-yellow-50 p-4 rounded-lg mb-4">
          <p className="text-yellow-800 font-medium">
            After heating: {surfaces[surface1Index].name} is at {temp1.toFixed(1)}°C,
            {surfaces[surface2Index].name} is at {temp2.toFixed(1)}°C.
          </p>
          <p className="text-yellow-700 text-sm mt-1">
            Difference: {Math.abs(temp1 - temp2).toFixed(1)}°C
          </p>
        </div>
      )}

      <button
        onMouseDown={() => goToPhase("review")}
        className="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-semibold shadow-lg"
      >
        Learn the Science →
      </button>
    </div>
  );

  // Render review phase
  const renderReview = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        The Science of Solar Absorption
      </h2>

      <div className="space-y-4">
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg">
          <h3 className="font-bold text-yellow-800 mb-2">📊 Absorptivity (α)</h3>
          <p className="text-gray-700 text-sm mb-2">
            Absorptivity is the fraction of incoming radiation that a surface absorbs:
          </p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="bg-white p-2 rounded text-center">
              <div className="font-bold">⬛ Black</div>
              <div>α ≈ 0.95</div>
              <div className="text-xs text-gray-500">Absorbs 95%</div>
            </div>
            <div className="bg-white p-2 rounded text-center">
              <div className="font-bold">⬜ White</div>
              <div>α ≈ 0.20</div>
              <div className="text-xs text-gray-500">Absorbs 20%</div>
            </div>
            <div className="bg-white p-2 rounded text-center">
              <div className="font-bold">🪞 Mirror</div>
              <div>α ≈ 0.05</div>
              <div className="text-xs text-gray-500">Absorbs 5%</div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">🔄 Energy Balance</h3>
          <p className="text-gray-700 text-sm">
            Light hitting a surface can be: <strong>absorbed</strong>, <strong>reflected</strong>, or <strong>transmitted</strong>.
          </p>
          <div className="font-mono text-center my-2">
            α + ρ + τ = 1
          </div>
          <p className="text-gray-600 text-sm">
            (absorptivity + reflectivity + transmissivity = 100%)
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-bold text-purple-800 mb-2">🌡️ Heat Gain</h3>
          <p className="text-gray-700 text-sm">
            The absorbed radiation becomes heat:
          </p>
          <div className="font-mono text-center my-2">
            Q<sub>absorbed</sub> = α × I × A
          </div>
          <p className="text-gray-600 text-sm">
            Where I = sun intensity (W/m²), A = surface area
          </p>
        </div>

        {prediction === "black" && (
          <div className="bg-green-100 p-4 rounded-lg border-2 border-green-400">
            <p className="text-green-800 font-semibold">
              🎉 Correct! Black surfaces absorb ~95% of sunlight, converting it
              to heat. Shiny surfaces reflect most light away.
            </p>
          </div>
        )}

        {prediction && prediction !== "black" && (
          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-amber-800">
              Black wins! It's not about conductivity—it's about absorption.
              Black absorbs nearly all light energy and converts it to heat.
              Mirrors reflect light away, so they stay cool.
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
      <h2 className="text-xl font-bold text-gray-800 mb-4">🌙 The Night Twist</h2>

      <div className="bg-purple-50 p-4 rounded-lg mb-6">
        <p className="text-gray-700">
          Now it's nighttime. Both surfaces start at 50°C and are exposed to
          a clear night sky. No sun, just radiation to the cold sky (≈ -270°C in space!).
        </p>
      </div>

      <p className="text-gray-700 font-medium mb-4">
        Which surface will cool down FASTER at night?
      </p>

      <div className="space-y-3">
        {[
          { id: "black", text: "Black surface—good absorbers are also good emitters" },
          { id: "shiny", text: "Shiny surface—it stayed cooler during the day" },
          { id: "same", text: "Both cool at the same rate" },
          { id: "neither", text: "Neither cools—heat only comes from the sun" }
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
          onMouseDown={() => {
            setTimeOfDay("night");
            goToPhase("twist_play");
          }}
          className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold shadow-lg"
        >
          Test Night Cooling →
        </button>
      )}
    </div>
  );

  // Render twist play phase
  const renderTwistPlay = () => (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        Radiative Night Cooling
      </h2>
      <p className="text-gray-600 mb-4">
        Watch how different surfaces radiate heat to the cold night sky!
      </p>

      <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
        {renderNightVisualization()}

        <button
          onMouseDown={startTwistSim}
          disabled={twistSimRunning}
          className={`w-full mt-4 py-3 rounded-lg font-bold ${
            twistSimRunning
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-indigo-500 text-white hover:bg-indigo-400"
          }`}
        >
          {twistSimRunning ? "Cooling in progress..." : "🌙 Start Night Cooling"}
        </button>
      </div>

      {/* Comparison */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-800 text-white p-3 rounded-lg">
          <h4 className="font-bold text-sm">{surfaces[surface1Index].name}</h4>
          <p className="text-sm">ε = {surfaces[surface1Index].emissivity}</p>
          <p className="text-lg font-bold">{twistTemp1.toFixed(1)}°C</p>
        </div>
        <div className="bg-gray-800 text-white p-3 rounded-lg">
          <h4 className="font-bold text-sm">{surfaces[surface2Index].name}</h4>
          <p className="text-sm">ε = {surfaces[surface2Index].emissivity}</p>
          <p className="text-lg font-bold">{twistTemp2.toFixed(1)}°C</p>
        </div>
      </div>

      <div className="bg-indigo-50 p-3 rounded-lg mb-4">
        <p className="text-indigo-800 text-sm">
          💡 <strong>Emissivity (ε)</strong> determines how well a surface
          radiates heat. According to Kirchhoff's Law: α = ε at the same wavelength.
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
        Kirchhoff's Law: The Great Equalizer
      </h2>

      <div className="space-y-4">
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-bold text-purple-800 mb-2">⚖️ Kirchhoff's Law</h3>
          <div className="font-mono text-center text-lg mb-2">
            α = ε (at the same wavelength)
          </div>
          <p className="text-gray-700 text-sm">
            A surface that absorbs radiation well (high α) must also emit
            radiation well (high ε). Nature demands symmetry!
          </p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">🌙 Night Cooling</h3>
          <p className="text-gray-700 text-sm">
            At night, surfaces radiate infrared to the cold sky:
          </p>
          <ul className="text-sm mt-2 space-y-1">
            <li>• <strong>Black (ε = 0.95):</strong> Excellent emitter → cools quickly</li>
            <li>• <strong>Shiny (ε = 0.05):</strong> Poor emitter → retains heat</li>
          </ul>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-bold text-green-800 mb-2">🏠 Practical Implications</h3>
          <ul className="text-gray-700 text-sm space-y-1">
            <li>• <strong>Day:</strong> Black heats fast, shiny stays cool</li>
            <li>• <strong>Night:</strong> Black cools fast, shiny stays warm</li>
            <li>• <strong>Space:</strong> Satellite radiators are black to dump heat</li>
          </ul>
        </div>

        {twistPrediction === "black" && (
          <div className="bg-green-100 p-4 rounded-lg border-2 border-green-400">
            <p className="text-green-800 font-semibold">
              🎉 Correct! Kirchhoff's Law means good absorbers are good emitters.
              Black surfaces radiate heat to the cold night sky efficiently.
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
        Solar Absorption in the Real World
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
                          ? "bg-yellow-500 text-white"
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
                ? "Excellent! You understand solar heating!"
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
                {["☀️", "⬛", "⬜", "⭐", "✨"][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        )}

        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Solar Heating Master!
        </h2>

        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Key Concepts Mastered
          </h3>
          <div className="grid gap-3 text-left">
            {[
              "Absorptivity (α): fraction of radiation absorbed",
              "Black surfaces have high α (~0.95), shiny surfaces have low α",
              "Kirchhoff's Law: α = ε (absorptivity = emissivity)",
              "Good absorbers heat fast in sun, cool fast at night",
              "White/reflective roofs reduce building heat gain",
              "Selective surfaces maximize solar collection efficiency"
            ].map((concept, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span className="text-gray-700">{concept}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-xl mb-6">
          <p className="text-yellow-800">
            ☀️ Now you know why parking a black car in the sun is a bad idea—
            and why cool roofs can save cities billions in energy costs!
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
  const phaseLabels: Record<Phase, string> = {
    hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review',
    twist_predict: 'Twist Predict', twist_play: 'Twist Lab', twist_review: 'Twist Review',
    transfer: 'Transfer', test: 'Test', mastery: 'Mastery'
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Solar Heating</span>
          <div className="flex items-center gap-1.5">
            {phases.map((p, i) => (
              <button
                key={p}
                onMouseDown={() => goToPhase(p)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-orange-400 w-6 shadow-lg shadow-orange-400/30'
                    : i < currentPhaseIndex
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
