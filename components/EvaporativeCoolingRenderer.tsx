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
interface EvaporativeCoolingRendererProps {
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

export default function EvaporativeCoolingRenderer({
  onBack,
  onGameEvent,
}: EvaporativeCoolingRendererProps) {
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
  const [skinWet, setSkinWet] = useState(false);
  const [humidity, setHumidity] = useState(30);
  const [temperature, setTemperature] = useState(30);
  const [skinTemp, setSkinTemp] = useState(37);
  const [waterDroplets, setWaterDroplets] = useState<{ x: number; y: number; id: number }[]>([]);
  const [evaporatingDroplets, setEvaporatingDroplets] = useState<number[]>([]);
  const [animationFrame, setAnimationFrame] = useState(0);
  const dropletIdRef = useRef(0);

  // Twist state - wind effect
  const [windSpeed, setWindSpeed] = useState(0);
  const [twistSkinWet, setTwistSkinWet] = useState(true);
  const [twistSkinTemp, setTwistSkinTemp] = useState(37);

  // Constants
  const latentHeatVaporization = 2260; // kJ/kg for water
  const bodyTempNormal = 37;

  // Calculate evaporation rate (simplified)
  const calculateEvaporationRate = useCallback(
    (humid: number, wind: number = 0): number => {
      // Rate decreases with humidity, increases with wind
      const baseRate = (100 - humid) / 100;
      const windFactor = 1 + wind / 10;
      return baseRate * windFactor;
    },
    []
  );

  // Calculate cooling effect
  const calculateCooling = useCallback(
    (evapRate: number): number => {
      // Simplified: more evaporation = more cooling
      return evapRate * 3; // °C of cooling effect
    },
    []
  );

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

  // Evaporation simulation
  useEffect(() => {
    if (!skinWet || waterDroplets.length === 0) return;

    const evapRate = calculateEvaporationRate(humidity);
    const interval = setInterval(() => {
      if (Math.random() < evapRate * 0.3) {
        // Pick a random droplet to evaporate
        const droplet = waterDroplets[Math.floor(Math.random() * waterDroplets.length)];
        if (droplet && !evaporatingDroplets.includes(droplet.id)) {
          setEvaporatingDroplets((prev) => [...prev, droplet.id]);
          // Remove after animation
          setTimeout(() => {
            setWaterDroplets((prev) => prev.filter((d) => d.id !== droplet.id));
            setEvaporatingDroplets((prev) => prev.filter((id) => id !== droplet.id));
          }, 500);
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [skinWet, waterDroplets, humidity, evaporatingDroplets, calculateEvaporationRate]);

  // Update skin temperature based on evaporation
  useEffect(() => {
    if (!skinWet) {
      setSkinTemp(bodyTempNormal);
      return;
    }

    const evapRate = calculateEvaporationRate(humidity);
    const cooling = calculateCooling(evapRate);
    setSkinTemp(bodyTempNormal - cooling);
  }, [skinWet, humidity, calculateEvaporationRate, calculateCooling]);

  // Twist: Update temperature with wind
  useEffect(() => {
    if (!twistSkinWet) {
      setTwistSkinTemp(bodyTempNormal);
      return;
    }

    const evapRate = calculateEvaporationRate(humidity, windSpeed);
    const cooling = calculateCooling(evapRate);
    setTwistSkinTemp(bodyTempNormal - cooling);
  }, [twistSkinWet, humidity, windSpeed, calculateEvaporationRate, calculateCooling]);

  // Add water droplets when skin gets wet
  const wetTheSkin = () => {
    setSkinWet(true);
    const newDroplets: { x: number; y: number; id: number }[] = [];
    for (let i = 0; i < 20; i++) {
      newDroplets.push({
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 150,
        id: dropletIdRef.current++,
      });
    }
    setWaterDroplets(newDroplets);
    playSound("click");
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
      question: "What provides the energy for water to evaporate from your skin?",
      options: [
        "The air around you",
        "Heat from your skin (body)",
        "The water itself",
        "Sunlight only"
      ],
      correct: 1,
      explanation:
        "Evaporation requires the latent heat of vaporization. This heat energy comes from your skin, cooling it down in the process."
    },
    {
      question: "Why doesn't sweating cool you down as well in humid weather?",
      options: [
        "Sweat is different in humid weather",
        "Your body produces less sweat",
        "Air saturated with water can't accept more evaporation",
        "Humidity makes sweat hotter"
      ],
      correct: 2,
      explanation:
        "In high humidity, the air already contains a lot of water vapor. Evaporation slows dramatically because the air can't hold much more water."
    },
    {
      question: "The latent heat of vaporization for water is about:",
      options: [
        "226 J/g",
        "2,260 J/g",
        "22,600 J/g",
        "4.18 J/g"
      ],
      correct: 1,
      explanation:
        "Water's latent heat of vaporization is 2,260 J/g (or 540 cal/g). This is why evaporation removes so much heat—it takes a LOT of energy."
    },
    {
      question: "Why does blowing on wet skin cool it faster?",
      options: [
        "Your breath is cold",
        "Moving air carries away humid air, allowing faster evaporation",
        "Blowing adds water to your skin",
        "It doesn't actually cool faster"
      ],
      correct: 1,
      explanation:
        "Moving air removes the saturated layer of humid air near your skin, replacing it with drier air. This increases the evaporation rate."
    },
    {
      question: "Why do dogs pant instead of sweating?",
      options: [
        "Dogs can't produce sweat",
        "Fur traps sweat; panting evaporates water from tongue and lungs",
        "Panting is just for breathing",
        "Dogs don't need to cool down"
      ],
      correct: 1,
      explanation:
        "Dogs have few sweat glands and fur that traps heat. Panting evaporates water from their tongue and respiratory tract, which isn't covered in fur."
    },
    {
      question: "Rubbing alcohol evaporates faster than water and feels colder because:",
      options: [
        "Alcohol is colder than water",
        "Alcohol evaporates faster, removing heat more quickly",
        "Alcohol absorbs heat from the air",
        "Alcohol reflects body heat"
      ],
      correct: 1,
      explanation:
        "Alcohol has a lower heat of vaporization and evaporates faster. More evaporation per second means faster heat removal."
    },
    {
      question: "In a desert with 10% humidity vs a jungle with 90%, which cools better by sweating?",
      options: [
        "Jungle (more moisture)",
        "Desert (lower humidity allows more evaporation)",
        "They're the same",
        "Neither—too hot to sweat"
      ],
      correct: 1,
      explanation:
        "Low humidity means more room in the air for water vapor. Desert heat feels more bearable because sweat evaporates efficiently."
    },
    {
      question: "Why does getting out of a swimming pool make you feel cold?",
      options: [
        "Pool water is always cold",
        "Air temperature drops near pools",
        "Water on skin evaporates rapidly, pulling heat from your body",
        "Chlorine makes water feel colder"
      ],
      correct: 2,
      explanation:
        "The water film on your skin evaporates, pulling heat energy from your body. More surface area wet = more cooling."
    },
    {
      question: "Evaporative coolers (swamp coolers) work best in:",
      options: [
        "Humid climates",
        "Dry climates",
        "Cold climates",
        "Any climate equally"
      ],
      correct: 1,
      explanation:
        "Swamp coolers blow air through wet pads. In dry climates, water evaporates readily, cooling the air. In humid climates, little evaporation occurs."
    },
    {
      question: "Which takes more energy: heating 1g of water by 1°C, or evaporating 1g of water?",
      options: [
        "Heating by 1°C (specific heat)",
        "Evaporating (latent heat)",
        "They're the same",
        "Depends on the temperature"
      ],
      correct: 1,
      explanation:
        "Evaporating 1g water takes ~2,260 J. Heating 1g by 1°C takes only 4.18 J. Evaporation takes about 540 times more energy!"
    }
  ];

  // Real-world applications
  const applications = [
    {
      title: "Sweating in Humans",
      description:
        "Humans can produce 2-4 liters of sweat per hour during intense exercise. At 2,260 J/g, evaporating 1 liter removes 2.26 MJ of heat—equivalent to a 1,000W heater running for 40 minutes!",
      icon: "💪"
    },
    {
      title: "Evaporative Coolers",
      description:
        "Desert coolers (swamp coolers) blow air through wet pads. Water evaporates, cooling the air by 10-15°C. They use 75% less electricity than AC but only work in low humidity (<30%).",
      icon: "❄️"
    },
    {
      title: "Wet Bulb Temperature",
      description:
        "Meteorologists use wet bulb temperature to measure humidity's effect. A thermometer wrapped in wet cloth shows how much evaporation can cool—critical for heat wave warnings.",
      icon: "🌡️"
    },
    {
      title: "Cooling Towers",
      description:
        "Power plants and factories use massive cooling towers. Hot water sprays through the air, evaporating partially. The remaining water cools by 10-20°C and recirculates.",
      icon: "🏭"
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

  // Get skin color based on temperature
  const getSkinColor = (temp: number): string => {
    if (temp >= 37) return "#e8b4a0";
    if (temp >= 35) return "#d4a090";
    if (temp >= 33) return "#c09080";
    return "#b08878";
  };

  // Render skin visualization
  const renderSkinVisualization = (wet: boolean, temp: number, wind: number = 0) => {
    const evapRate = calculateEvaporationRate(humidity, wind);

    return (
      <svg viewBox="0 0 400 350" className="w-full max-w-md mx-auto">
        {/* Background gradient showing air temp */}
        <defs>
          <linearGradient id="airGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#87CEEB" />
            <stop offset="100%" stopColor="#ADD8E6" />
          </linearGradient>
          <linearGradient id="skinGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={getSkinColor(temp)} />
            <stop offset="100%" stopColor="#d4a088" />
          </linearGradient>
        </defs>

        {/* Air */}
        <rect width="400" height="100" fill="url(#airGradient)" />

        {/* Humidity particles in air */}
        {[...Array(Math.round(humidity / 10))].map((_, i) => (
          <circle
            key={i}
            cx={50 + i * 35 + Math.sin(animationFrame / 10 + i) * 10}
            cy={30 + Math.cos(animationFrame / 15 + i) * 15}
            r={3}
            fill="rgba(100, 149, 237, 0.5)"
          />
        ))}

        {/* Wind arrows */}
        {wind > 0 && (
          <g>
            {[...Array(Math.round(wind / 2))].map((_, i) => {
              const x = 30 + ((animationFrame * 2 + i * 50) % 340);
              return (
                <g key={i} transform={`translate(${x}, ${40 + i * 15})`}>
                  <path d="M 0 0 L 20 0 L 15 -5 M 20 0 L 15 5" fill="none" stroke="#4169E1" strokeWidth={2} />
                </g>
              );
            })}
          </g>
        )}

        {/* Skin surface */}
        <rect y="100" width="400" height="250" fill="url(#skinGradient)" />

        {/* Skin texture lines */}
        {[...Array(8)].map((_, i) => (
          <path
            key={i}
            d={`M ${i * 50 + 25} 100 Q ${i * 50 + 40} 150 ${i * 50 + 25} 200`}
            fill="none"
            stroke="rgba(0,0,0,0.1)"
            strokeWidth={1}
          />
        ))}

        {/* Water droplets on skin */}
        {wet && waterDroplets.map((droplet) => {
          const isEvaporating = evaporatingDroplets.includes(droplet.id);
          return (
            <g key={droplet.id}>
              {/* Droplet */}
              <ellipse
                cx={droplet.x}
                cy={droplet.y}
                rx={isEvaporating ? 4 : 6}
                ry={isEvaporating ? 2 : 4}
                fill="rgba(100, 149, 237, 0.7)"
                className={isEvaporating ? "animate-pulse" : ""}
              />
              {/* Evaporation vapor */}
              {isEvaporating && (
                <g>
                  {[0, 1, 2].map((i) => (
                    <circle
                      key={i}
                      cx={droplet.x + (i - 1) * 8}
                      cy={droplet.y - 10 - animationFrame % 20}
                      r={3}
                      fill="rgba(100, 149, 237, 0.3)"
                    />
                  ))}
                </g>
              )}
            </g>
          );
        })}

        {/* Rising vapor (when wet and evaporating) */}
        {wet && evapRate > 0 && (
          <g>
            {[...Array(Math.round(evapRate * 5))].map((_, i) => {
              const x = 80 + i * 60 + Math.sin(animationFrame / 20 + i) * 20;
              const y = 95 - (animationFrame + i * 10) % 50;
              const opacity = 0.3 * (1 - ((animationFrame + i * 10) % 50) / 50);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={4}
                  fill={`rgba(100, 149, 237, ${opacity})`}
                />
              );
            })}
          </g>
        )}

        {/* Temperature indicator */}
        <g transform="translate(320, 150)">
          <rect x={0} y={0} width={50} height={120} fill="#fff" stroke="#333" rx={5} />
          <rect
            x={10}
            y={110 - (temp - 30) * 10}
            width={30}
            height={(temp - 30) * 10}
            fill={temp >= 36 ? "#ff6b6b" : temp >= 34 ? "#feca57" : "#54a0ff"}
            rx={3}
          />
          <text x={25} y={-10} textAnchor="middle" fontSize="12" fill="#333">
            {temp.toFixed(1)}°C
          </text>
          <text x={25} y={135} textAnchor="middle" fontSize="10" fill="#666">
            Skin Temp
          </text>
        </g>

        {/* Labels */}
        <text x={20} y={30} fontSize="12" fill="#333">
          Humidity: {humidity}%
        </text>
        <text x={20} y={50} fontSize="12" fill="#333">
          Evap Rate: {(evapRate * 100).toFixed(0)}%
        </text>
        {wind > 0 && (
          <text x={20} y={70} fontSize="12" fill="#4169E1">
            Wind: {wind} m/s
          </text>
        )}
      </svg>
    );
  };

  // Render hook phase
  const renderHook = () => (
    <div className="p-6 text-center max-w-2xl mx-auto">
      <div className="text-5xl mb-4">💧 🌡️ ❄️</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Why Does Sweating Cool You Down?
      </h2>
      <p className="text-gray-600 mb-6">
        You step out of a shower, and even though the bathroom is warm, you
        feel chilly. Your wet skin loses heat rapidly as water evaporates.
        But where does that cooling power come from?
      </p>
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg mb-6">
        <p className="text-blue-800 font-medium">
          💡 Water doesn't just disappear—evaporation requires enormous energy!
        </p>
      </div>
      <button
        onMouseDown={() => goToPhase("predict")}
        className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      >
        Explore Evaporative Cooling →
      </button>
    </div>
  );

  // Render predict phase
  const renderPredict = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Make Your Prediction</h2>
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <p className="text-gray-700">
          Your skin is wet with water. As the water evaporates, where does the
          energy come from to change liquid water into water vapor?
        </p>
      </div>

      <p className="text-gray-700 font-medium mb-4">
        What provides the energy for evaporation?
      </p>

      <div className="space-y-3">
        {[
          { id: "air", text: "The surrounding air—warm air provides the energy" },
          { id: "skin", text: "Your skin—the water 'steals' heat from your body" },
          { id: "water", text: "The water itself—it has stored energy" },
          { id: "sun", text: "Only sunlight can provide evaporation energy" }
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
        Evaporation & Skin Temperature
      </h2>
      <p className="text-gray-600 mb-4">
        Wet your skin and adjust humidity to see how evaporation affects temperature!
      </p>

      <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
        {renderSkinVisualization(skinWet, skinTemp)}

        <button
          onMouseDown={wetTheSkin}
          disabled={skinWet && waterDroplets.length > 0}
          className={`w-full mt-4 py-3 rounded-lg font-bold text-lg ${
            skinWet && waterDroplets.length > 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-400 text-white hover:bg-blue-300"
          }`}
        >
          {skinWet && waterDroplets.length > 0 ? "Water Evaporating..." : "💧 Wet the Skin"}
        </button>
      </div>

      {/* Humidity control */}
      <div className="bg-white rounded-lg p-4 shadow mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Air Humidity: {humidity}%
        </label>
        <input
          type="range"
          min="10"
          max="95"
          value={humidity}
          onChange={(e) => setHumidity(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Desert (10%)</span>
          <span>Normal (50%)</span>
          <span>Jungle (95%)</span>
        </div>
      </div>

      {/* Info panel */}
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <h3 className="font-bold text-blue-800 mb-2">What's Happening?</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Normal body temperature: <strong>37°C</strong></li>
          <li>• Current skin temp: <strong>{skinTemp.toFixed(1)}°C</strong></li>
          <li>• Cooling effect: <strong>{(37 - skinTemp).toFixed(1)}°C</strong></li>
          <li>• Evaporation rate: <strong>{(calculateEvaporationRate(humidity) * 100).toFixed(0)}%</strong></li>
        </ul>
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
        The Science of Evaporative Cooling
      </h2>

      <div className="space-y-4">
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">🔥 Latent Heat of Vaporization</h3>
          <p className="text-gray-700 text-sm mb-2">
            Converting liquid water to vapor requires enormous energy:
          </p>
          <div className="font-mono text-center text-lg mb-2">
            L<sub>v</sub> = 2,260 J/g (or 540 cal/g)
          </div>
          <p className="text-gray-700 text-sm">
            This energy comes from whatever is in contact with the water—your skin!
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-bold text-green-800 mb-2">💧 Where Does the Heat Go?</h3>
          <p className="text-gray-700 text-sm">
            Water molecules need energy to break free from liquid and become gas.
            They "steal" this energy from your skin as heat. The fastest-moving
            (hottest) molecules escape first, leaving cooler ones behind.
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-bold text-purple-800 mb-2">💨 Humidity's Role</h3>
          <p className="text-gray-700 text-sm">
            Evaporation can only happen if air can accept more water vapor.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
            <div className="bg-white p-2 rounded">
              <p className="font-medium">Low Humidity (Desert)</p>
              <p className="text-gray-600">Lots of "room" for vapor → fast evaporation → strong cooling</p>
            </div>
            <div className="bg-white p-2 rounded">
              <p className="font-medium">High Humidity (Jungle)</p>
              <p className="text-gray-600">Air "full" → slow evaporation → weak cooling</p>
            </div>
          </div>
        </div>

        {prediction === "skin" && (
          <div className="bg-green-100 p-4 rounded-lg border-2 border-green-400">
            <p className="text-green-800 font-semibold">
              🎉 Correct! The water pulls heat energy from your skin to evaporate.
              That's why wet skin feels cold—it's literally losing heat!
            </p>
          </div>
        )}

        {prediction && prediction !== "skin" && (
          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-amber-800">
              The energy comes from your skin! Water molecules need energy to
              escape into the air, and they take it from whatever they're
              touching. That's the whole point of sweating—heat leaves your body.
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
      <h2 className="text-xl font-bold text-gray-800 mb-4">💨 The Wind Twist</h2>

      <div className="bg-purple-50 p-4 rounded-lg mb-6">
        <p className="text-gray-700">
          You have wet skin. Someone starts blowing air across it (like a fan).
          The humidity stays the same.
        </p>
      </div>

      <p className="text-gray-700 font-medium mb-4">
        What happens to the cooling effect when wind blows across wet skin?
      </p>

      <div className="space-y-3">
        {[
          { id: "faster", text: "Cooling increases—wind speeds up evaporation" },
          { id: "slower", text: "Cooling decreases—wind 'blows away' the cool" },
          { id: "same", text: "No change—humidity is what matters" },
          { id: "dry", text: "Skin dries instantly, no more cooling" }
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
          Test the Wind Effect →
        </button>
      )}
    </div>
  );

  // Render twist play phase
  const renderTwistPlay = () => (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        Wind & Evaporative Cooling
      </h2>
      <p className="text-gray-600 mb-4">
        Adjust wind speed and see how it affects the cooling!
      </p>

      <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
        {renderSkinVisualization(twistSkinWet, twistSkinTemp, windSpeed)}

        <button
          onMouseDown={() => setTwistSkinWet(true)}
          disabled={twistSkinWet}
          className={`w-full mt-4 py-3 rounded-lg font-bold ${
            twistSkinWet
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-400 text-white hover:bg-blue-300"
          }`}
        >
          {twistSkinWet ? "Skin is Wet" : "💧 Wet the Skin"}
        </button>
      </div>

      {/* Wind control */}
      <div className="bg-white rounded-lg p-4 shadow mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Wind Speed: {windSpeed} m/s
        </label>
        <input
          type="range"
          min="0"
          max="10"
          value={windSpeed}
          onChange={(e) => setWindSpeed(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Still Air</span>
          <span>Light Breeze</span>
          <span>Strong Wind</span>
        </div>
      </div>

      {/* Humidity control */}
      <div className="bg-white rounded-lg p-4 shadow mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Humidity: {humidity}%
        </label>
        <input
          type="range"
          min="10"
          max="95"
          value={humidity}
          onChange={(e) => setHumidity(parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Comparison */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <h4 className="font-bold text-sm">No Wind</h4>
          <p className="text-sm">Temp: {(37 - calculateCooling(calculateEvaporationRate(humidity, 0))).toFixed(1)}°C</p>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg">
          <h4 className="font-bold text-sm">With Wind</h4>
          <p className="text-sm">Temp: {twistSkinTemp.toFixed(1)}°C</p>
          <p className="text-xs text-blue-600">
            {windSpeed > 0 ? `${((37 - twistSkinTemp) - (37 - (37 - calculateCooling(calculateEvaporationRate(humidity, 0))))).toFixed(1)}°C extra cooling!` : "Add wind!"}
          </p>
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
        Wind Chill & Evaporation
      </h2>

      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">💨 Why Wind Helps</h3>
          <p className="text-gray-700 text-sm">
            A thin layer of humid air forms right above wet skin. This
            "boundary layer" is nearly saturated with vapor, slowing further
            evaporation.
          </p>
          <p className="text-gray-700 text-sm mt-2">
            Wind blows this humid layer away, replacing it with drier air.
            Result: faster evaporation and more cooling!
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-bold text-green-800 mb-2">🌡️ Wind Chill Effect</h3>
          <p className="text-gray-700 text-sm">
            This is why wind feels colder than still air at the same temperature.
            It's not that the air IS colder—it just removes heat faster by:
          </p>
          <ul className="text-sm mt-2 space-y-1">
            <li>1. Increasing evaporation (if wet)</li>
            <li>2. Breaking up the insulating air layer on your skin</li>
          </ul>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-bold text-purple-800 mb-2">🏠 Practical Uses</h3>
          <ul className="text-gray-700 text-sm space-y-1">
            <li>• <strong>Fans:</strong> Feel cooler (only if skin can sweat)</li>
            <li>• <strong>Cooling towers:</strong> Fan-assisted evaporation</li>
            <li>• <strong>Drying clothes:</strong> Wind speeds evaporation</li>
          </ul>
        </div>

        {twistPrediction === "faster" && (
          <div className="bg-green-100 p-4 rounded-lg border-2 border-green-400">
            <p className="text-green-800 font-semibold">
              🎉 Correct! Wind removes the saturated boundary layer, allowing
              fresh dry air to contact the wet surface and accelerate evaporation.
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
        Evaporative Cooling in the Real World
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
                ? "Excellent! You understand evaporative cooling!"
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
                {["💧", "❄️", "💨", "⭐", "✨"][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        )}

        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Cooling Master!
        </h2>

        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Key Concepts Mastered
          </h3>
          <div className="grid gap-3 text-left">
            {[
              "Latent heat of vaporization: 2,260 J/g for water",
              "Evaporation takes heat energy from the surface it's on",
              "Low humidity = more evaporation = more cooling",
              "Wind removes humid boundary layer, speeding evaporation",
              "This is why sweating keeps you cool",
              "Evaporative coolers only work in dry climates"
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
            💧 Next time you feel cold stepping out of the shower, appreciate
            that each gram of water evaporating removes 2,260 joules from your skin!
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-cyan-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💧</span>
            <div>
              <h1 className="font-bold text-gray-800">Evaporative Cooling</h1>
              <p className="text-xs text-gray-500">Why sweating keeps you cool</p>
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
                  i <= currentPhaseIndex ? "bg-cyan-500" : "bg-gray-200"
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
