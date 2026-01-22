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
interface ReverberationRendererProps {
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

// Play clap with reverb effect
const playClapWithReverb = (rt60: number): void => {
  if (typeof window === "undefined") return;
  try {
    const audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();

    // Create the initial "clap" - short burst of noise
    const bufferSize = audioContext.sampleRate * 0.05;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }

    const noise = audioContext.createBufferSource();
    noise.buffer = noiseBuffer;

    // Apply reverb envelope
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + rt60);

    // Filter to shape sound
    const filter = audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2000;

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    noise.start();
    noise.stop(audioContext.currentTime + rt60);
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

// Material properties
interface Material {
  name: string;
  absorption: number;
  color: string;
  icon: string;
}

const materials: Material[] = [
  { name: "Concrete", absorption: 0.02, color: "#9e9e9e", icon: "🧱" },
  { name: "Glass", absorption: 0.04, color: "#87ceeb", icon: "🪟" },
  { name: "Wood Panels", absorption: 0.15, color: "#8b4513", icon: "🪵" },
  { name: "Carpet", absorption: 0.35, color: "#654321", icon: "🟤" },
  { name: "Acoustic Foam", absorption: 0.85, color: "#333", icon: "🔲" },
  { name: "Heavy Drapes", absorption: 0.55, color: "#4a0080", icon: "🎭" },
];

export default function ReverberationRenderer({
  onBack,
  onGameEvent,
}: ReverberationRendererProps) {
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
  const [wallMaterial, setWallMaterial] = useState(0); // Concrete
  const [ceilingMaterial, setCeilingMaterial] = useState(0);
  const [floorMaterial, setFloorMaterial] = useState(3); // Carpet
  const [roomVolume, setRoomVolume] = useState(500); // m³
  const [clapActive, setClapActive] = useState(false);
  const [soundWaves, setSoundWaves] = useState<{ x: number; y: number; age: number; reflection: number }[]>([]);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Twist state - comparing room types
  const [roomType, setRoomType] = useState<"studio" | "concert">("studio");

  // Calculate RT60 (Sabine equation)
  const calculateRT60 = useCallback((): number => {
    // Approximate room dimensions for given volume
    const height = 3; // meters
    const width = Math.sqrt(roomVolume / (height * 1.5));
    const length = width * 1.5;

    // Surface areas
    const wallArea = 2 * height * (width + length);
    const floorArea = width * length;
    const ceilingArea = width * length;

    // Total absorption (Sabine formula)
    const A =
      wallArea * materials[wallMaterial].absorption +
      floorArea * materials[floorMaterial].absorption +
      ceilingArea * materials[ceilingMaterial].absorption;

    // RT60 = 0.161 × V / A
    const rt60 = (0.161 * roomVolume) / A;
    return Math.min(Math.max(rt60, 0.1), 10);
  }, [wallMaterial, floorMaterial, ceilingMaterial, roomVolume]);

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
      setSoundWaves((prev) =>
        prev
          .map((w) => ({ ...w, age: w.age + 1 }))
          .filter((w) => w.age < 60)
      );
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Handle clap
  const handleClap = () => {
    if (clapActive) return;
    setClapActive(true);
    const rt60 = calculateRT60();
    playClapWithReverb(Math.min(rt60, 3));

    // Create sound waves
    const newWaves: { x: number; y: number; age: number; reflection: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      newWaves.push({
        x: 200 + Math.cos(angle) * 5,
        y: 200 + Math.sin(angle) * 5,
        age: 0,
        reflection: 0,
      });
    }
    setSoundWaves(newWaves);

    setTimeout(() => {
      setClapActive(false);
    }, rt60 * 1000);

    emitEvent("clap_performed", { rt60 });
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
      question: "What is RT60?",
      options: [
        "The time for sound to reach 60 dB",
        "The time for sound to decay by 60 dB",
        "60 reflections of sound",
        "60 Hz reverb frequency"
      ],
      correct: 1,
      explanation:
        "RT60 (Reverberation Time 60) measures how long it takes for sound to decay by 60 dB (become one millionth of its original intensity)."
    },
    {
      question: "According to the Sabine equation, what happens if you double the room volume?",
      options: [
        "RT60 halves",
        "RT60 doubles",
        "RT60 stays the same",
        "Sound disappears"
      ],
      correct: 1,
      explanation:
        "RT60 = 0.161V/A. If volume V doubles and absorption A stays the same, RT60 doubles. Larger rooms have longer reverb."
    },
    {
      question: "Which material would REDUCE reverb the most?",
      options: [
        "Concrete walls",
        "Glass windows",
        "Acoustic foam panels",
        "Marble floors"
      ],
      correct: 2,
      explanation:
        "Acoustic foam has very high absorption (~0.85), converting sound energy to heat rather than reflecting it back."
    },
    {
      question: "Why do recording studios have short reverb times?",
      options: [
        "To save money on materials",
        "To capture clean sound that can have reverb added later",
        "Because musicians prefer silence",
        "To make rooms smaller"
      ],
      correct: 1,
      explanation:
        "Dead rooms let engineers capture dry audio. Reverb can be added digitally afterward with precise control, but it can't be removed."
    },
    {
      question: "Why do concert halls aim for RT60 around 1.5-2 seconds?",
      options: [
        "It's the cheapest to build",
        "Sound blends and creates warmth without losing clarity",
        "Audiences can't hear shorter reverb",
        "It's required by law"
      ],
      correct: 1,
      explanation:
        "1.5-2s allows notes to blend beautifully for orchestral music while maintaining enough clarity to distinguish individual notes."
    },
    {
      question: "What's the main way absorption works?",
      options: [
        "Sound bounces back faster",
        "Sound energy converts to heat in the material",
        "Sound passes through to the next room",
        "Sound frequency increases"
      ],
      correct: 1,
      explanation:
        "Absorptive materials convert sound wave energy into tiny amounts of heat through friction in the material's fibers or pores."
    },
    {
      question: "You clap in a bathroom with tile walls. What do you expect?",
      options: [
        "Short, dry sound",
        "Long, echoing reverb",
        "No sound at all",
        "Very bass-heavy sound"
      ],
      correct: 1,
      explanation:
        "Hard, smooth surfaces like tile have low absorption (~0.02). Sound bounces many times, creating noticeable reverb."
    },
    {
      question: "How do flutter echoes differ from reverb?",
      options: [
        "Flutter echoes are single reflections, reverb is continuous",
        "Reverb happens in bathrooms only",
        "Flutter echoes are rapid distinct repetitions between parallel walls",
        "They are exactly the same"
      ],
      correct: 2,
      explanation:
        "Flutter echoes occur when sound bounces rapidly between two parallel hard surfaces, creating a distinctive 'zinging' repetitive sound."
    },
    {
      question: "Why is it hard to understand speech in a gym?",
      options: [
        "The room is too small",
        "Long reverb causes syllables to overlap and blur",
        "Gyms absorb all sound",
        "People speak quietly in gyms"
      ],
      correct: 1,
      explanation:
        "Large gyms with hard surfaces have long RT60. Each syllable's reverb overlaps with the next syllable, reducing speech intelligibility."
    },
    {
      question: "What's the absorption coefficient of a perfect absorber?",
      options: [
        "0 (reflects all sound)",
        "0.5 (reflects half)",
        "1.0 (absorbs all sound)",
        "100 (amplifies sound)"
      ],
      correct: 2,
      explanation:
        "Absorption coefficient ranges from 0 (perfect reflector) to 1.0 (perfect absorber). An open window is often used as the reference at 1.0."
    }
  ];

  // Real-world applications
  const applications = [
    {
      title: "Recording Studios",
      description:
        "Professional studios have RT60 under 0.3 seconds. They use bass traps, diffusers, and absorbers strategically placed. This 'dead' room captures clean audio that can have any reverb added digitally during mixing.",
      icon: "🎙️"
    },
    {
      title: "Concert Halls",
      description:
        "The Boston Symphony Hall has RT60 of 1.9 seconds—considered acoustically perfect. Curved walls, coffered ceilings, and specific seat materials create warm, enveloping sound where every note blends beautifully.",
      icon: "🎻"
    },
    {
      title: "Classrooms & Offices",
      description:
        "Poor acoustics hurt learning and productivity. Acoustic ceiling tiles, carpet, and fabric-covered panels reduce RT60 to 0.5-0.7 seconds, improving speech clarity without feeling 'dead.'",
      icon: "🏫"
    },
    {
      title: "Home Theaters",
      description:
        "Enthusiasts balance absorption and diffusion. Too dead feels sterile; too live causes echoes. Strategic placement of panels, plush furniture, and thick curtains creates cinema-like immersion.",
      icon: "🎬"
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

  // Room presets for twist
  const getPresetValues = (type: "studio" | "concert") => {
    if (type === "studio") {
      return {
        wall: 4, // Acoustic foam
        ceiling: 4,
        floor: 3, // Carpet
        volume: 50,
      };
    } else {
      return {
        wall: 2, // Wood panels
        ceiling: 0, // Concrete
        floor: 2, // Wood
        volume: 15000,
      };
    }
  };

  // Apply room preset
  const applyPreset = (type: "studio" | "concert") => {
    const preset = getPresetValues(type);
    setWallMaterial(preset.wall);
    setCeilingMaterial(preset.ceiling);
    setFloorMaterial(preset.floor);
    setRoomVolume(preset.volume);
    setRoomType(type);
  };

  // Render room visualization
  const renderRoom = () => {
    const rt60 = calculateRT60();

    return (
      <svg viewBox="0 0 400 400" className="w-full max-w-md mx-auto">
        {/* Room background */}
        <rect width="400" height="400" fill="#1a1a2e" />

        {/* Floor */}
        <polygon
          points="50,350 350,350 300,250 100,250"
          fill={materials[floorMaterial].color}
          stroke="#444"
          strokeWidth={2}
        />

        {/* Back wall */}
        <polygon
          points="100,250 300,250 300,100 100,100"
          fill={materials[wallMaterial].color}
          stroke="#444"
          strokeWidth={2}
        />

        {/* Left wall */}
        <polygon
          points="50,350 100,250 100,100 30,170"
          fill={materials[wallMaterial].color}
          opacity={0.7}
          stroke="#444"
          strokeWidth={2}
        />

        {/* Right wall */}
        <polygon
          points="350,350 300,250 300,100 370,170"
          fill={materials[wallMaterial].color}
          opacity={0.7}
          stroke="#444"
          strokeWidth={2}
        />

        {/* Ceiling */}
        <polygon
          points="30,170 100,100 300,100 370,170"
          fill={materials[ceilingMaterial].color}
          opacity={0.5}
          stroke="#444"
          strokeWidth={2}
        />

        {/* Sound source (person clapping) */}
        <g transform="translate(200, 300)">
          <circle r={20} fill="#ffd93d" stroke="#333" strokeWidth={2} />
          <text y={5} textAnchor="middle" fontSize="20">
            👏
          </text>
        </g>

        {/* Sound waves */}
        {soundWaves.map((wave, i) => {
          const maxRadius = 150;
          const radius = (wave.age / 60) * maxRadius;
          const opacity = 1 - wave.age / 60;
          const intensity = Math.pow(1 - wave.age / 60, 1 / rt60);

          return (
            <circle
              key={i}
              cx={200}
              cy={280}
              r={radius}
              fill="none"
              stroke={`rgba(255, 217, 61, ${opacity * intensity})`}
              strokeWidth={3 * intensity}
            />
          );
        })}

        {/* RT60 indicator */}
        <g transform="translate(200, 50)">
          <text textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
            RT60: {rt60.toFixed(2)} seconds
          </text>
          <text y={20} textAnchor="middle" fill="#aaa" fontSize="12">
            {rt60 < 0.4 ? "Dead Room" : rt60 < 1.0 ? "Controlled" : rt60 < 2 ? "Live" : "Very Reverberant"}
          </text>
        </g>

        {/* Visual decay bar */}
        <g transform="translate(50, 75)">
          <rect width="300" height="8" fill="#333" rx={4} />
          <rect
            width={clapActive ? 300 * (1 - (animationFrame % 60) / 60) : 0}
            height="8"
            fill="#ffd93d"
            rx={4}
          />
        </g>
      </svg>
    );
  };

  // Render hook phase
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-purple-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-purple-100 to-fuchsia-200 bg-clip-text text-transparent">
        Why Do Bathrooms Echo?
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover the physics of room acoustics
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-fuchsia-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-5xl mb-6">👏 🎭 🔊</div>
          <p className="text-xl text-white/90 font-medium leading-relaxed mb-6">
            Clap in your bathroom—you hear a ringy echo. Clap in your bedroom—almost nothing. Same clap, totally different sound!
          </p>
          <p className="text-lg text-purple-400 font-semibold">
            Can you design a room that sounds exactly how you want?
          </p>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={() => goToPhase("predict")}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Explore Room Acoustics
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-purple-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-fuchsia-400">✦</span>
          10 Phases
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
          You have two identical rooms. One has concrete walls and tile floors.
          The other has acoustic foam on the walls and thick carpet. You clap
          in both rooms.
        </p>
      </div>

      <p className="text-gray-700 font-medium mb-4">
        Which room will have the longer "reverb tail" (echo decay)?
      </p>

      <div className="space-y-3">
        {[
          { id: "concrete", text: "The concrete/tile room—sound bounces longer" },
          { id: "foam", text: "The foam/carpet room—soft materials amplify sound" },
          { id: "same", text: "They'll sound the same—room size matters more" },
          { id: "neither", text: "Neither will have reverb—rooms are too small" }
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
  const renderPlay = () => {
    const rt60 = calculateRT60();

    return (
      <div className="p-4 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Design Your Room's Sound
        </h2>
        <p className="text-gray-600 mb-4">
          Change the materials and room size. Then clap to hear how it affects reverb!
        </p>

        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          {renderRoom()}

          <button
            onMouseDown={handleClap}
            disabled={clapActive}
            className={`w-full mt-4 py-3 rounded-lg font-bold text-lg ${
              clapActive
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-yellow-400 text-gray-800 hover:bg-yellow-300"
            }`}
          >
            {clapActive ? "Sound decaying..." : "👏 CLAP!"}
          </button>
        </div>

        {/* Material controls */}
        <div className="bg-white rounded-lg p-4 shadow mb-4">
          <h3 className="font-bold text-gray-700 mb-3">Room Materials</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Walls: {materials[wallMaterial].icon} {materials[wallMaterial].name}
                (α = {materials[wallMaterial].absorption})
              </label>
              <input
                type="range"
                min="0"
                max={materials.length - 1}
                value={wallMaterial}
                onChange={(e) => setWallMaterial(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Ceiling: {materials[ceilingMaterial].icon} {materials[ceilingMaterial].name}
                (α = {materials[ceilingMaterial].absorption})
              </label>
              <input
                type="range"
                min="0"
                max={materials.length - 1}
                value={ceilingMaterial}
                onChange={(e) => setCeilingMaterial(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Floor: {materials[floorMaterial].icon} {materials[floorMaterial].name}
                (α = {materials[floorMaterial].absorption})
              </label>
              <input
                type="range"
                min="0"
                max={materials.length - 1}
                value={floorMaterial}
                onChange={(e) => setFloorMaterial(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Room Volume: {roomVolume} m³
              </label>
              <input
                type="range"
                min="20"
                max="5000"
                step="10"
                value={roomVolume}
                onChange={(e) => setRoomVolume(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>Closet</span>
                <span>Bedroom</span>
                <span>Gym</span>
              </div>
            </div>
          </div>
        </div>

        {/* RT60 explanation */}
        <div className="bg-blue-50 p-3 rounded-lg mb-4">
          <p className="text-blue-800 text-sm">
            <strong>RT60</strong> = time for sound to decay 60 dB (become 1 millionth as loud).
            Current: <strong>{rt60.toFixed(2)}s</strong> — {rt60 < 0.4 ? "very dry/dead" : rt60 < 1 ? "controlled" : rt60 < 2 ? "lively" : "very reverberant"}
          </p>
        </div>

        <button
          onMouseDown={() => {
            setShowExplanation(true);
            goToPhase("review");
          }}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold shadow-lg"
        >
          Understand the Science →
        </button>
      </div>
    );
  };

  // Render review phase
  const renderReview = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        The Science of Room Acoustics
      </h2>

      <div className="space-y-4">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">🧮 The Sabine Equation</h3>
          <div className="font-mono text-center text-lg mb-2">
            RT60 = 0.161 × V / A
          </div>
          <p className="text-gray-700 text-sm">
            <strong>V</strong> = room volume (m³) — bigger rooms = longer reverb<br />
            <strong>A</strong> = total absorption (sum of surface × absorption coefficient)
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-bold text-green-800 mb-2">🧽 Absorption Coefficient (α)</h3>
          <p className="text-gray-700 mb-2">
            α ranges from 0 (perfect reflector) to 1 (perfect absorber).
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {materials.map((m) => (
              <div key={m.name} className="flex items-center gap-2">
                <span>{m.icon}</span>
                <span>{m.name}: α = {m.absorption}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-bold text-purple-800 mb-2">🔊 Why It Matters</h3>
          <p className="text-gray-700">
            Sound bounces off walls. Hard surfaces reflect ~95% of energy, soft
            surfaces absorb most of it. Each reflection loses energy. More
            absorption → faster decay → shorter reverb.
          </p>
        </div>

        {prediction === "concrete" && (
          <div className="bg-green-100 p-4 rounded-lg border-2 border-green-400">
            <p className="text-green-800 font-semibold">
              🎉 Correct! Hard surfaces like concrete reflect sound, causing
              many reflections and longer reverb. Soft absorptive materials
              capture the energy quickly.
            </p>
          </div>
        )}

        {prediction && prediction !== "concrete" && (
          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-amber-800">
              The concrete room wins! Hard surfaces reflect sound energy,
              letting it bounce around longer. Foam and carpet absorb energy
              on each bounce, quickly killing the reverb.
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
      <h2 className="text-xl font-bold text-gray-800 mb-4">🎭 The Purpose Twist</h2>

      <div className="bg-purple-50 p-4 rounded-lg mb-6">
        <p className="text-gray-700">
          A recording studio needs RT60 ≈ 0.2 seconds (very dead).<br />
          A symphony hall needs RT60 ≈ 2.0 seconds (very live).
        </p>
      </div>

      <p className="text-gray-700 font-medium mb-4">
        Why would a concert hall WANT longer reverb when studios try to eliminate it?
      </p>

      <div className="space-y-3">
        {[
          { id: "blend", text: "Reverb helps notes blend together beautifully" },
          { id: "cheaper", text: "It's cheaper to build live rooms" },
          { id: "volume", text: "Reverb makes music louder" },
          { id: "tradition", text: "It's just historical tradition" }
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
          Compare Room Types →
        </button>
      )}
    </div>
  );

  // Render twist play phase
  const renderTwistPlay = () => {
    const rt60 = calculateRT60();

    return (
      <div className="p-4 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Studio vs Concert Hall
        </h2>
        <p className="text-gray-600 mb-4">
          Compare how different room designs create completely different sounds!
        </p>

        <div className="flex gap-2 mb-4">
          <button
            onMouseDown={() => applyPreset("studio")}
            className={`flex-1 py-3 rounded-lg font-medium ${
              roomType === "studio"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            🎙️ Recording Studio
          </button>
          <button
            onMouseDown={() => applyPreset("concert")}
            className={`flex-1 py-3 rounded-lg font-medium ${
              roomType === "concert"
                ? "bg-purple-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            🎻 Concert Hall
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          {renderRoom()}

          <button
            onMouseDown={handleClap}
            disabled={clapActive}
            className={`w-full mt-4 py-3 rounded-lg font-bold text-lg ${
              clapActive
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-yellow-400 text-gray-800 hover:bg-yellow-300"
            }`}
          >
            {clapActive ? "Sound decaying..." : "👏 CLAP!"}
          </button>
        </div>

        {/* Comparison info */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={`p-3 rounded-lg ${roomType === "studio" ? "bg-blue-100" : "bg-gray-100"}`}>
            <h4 className="font-bold text-sm">🎙️ Studio</h4>
            <p className="text-xs text-gray-600">RT60 ≈ 0.2s</p>
            <p className="text-xs text-gray-600">50 m³, foam walls</p>
          </div>
          <div className={`p-3 rounded-lg ${roomType === "concert" ? "bg-purple-100" : "bg-gray-100"}`}>
            <h4 className="font-bold text-sm">🎻 Concert Hall</h4>
            <p className="text-xs text-gray-600">RT60 ≈ 2.0s</p>
            <p className="text-xs text-gray-600">15,000 m³, wood/concrete</p>
          </div>
        </div>

        <div className="bg-purple-50 p-3 rounded-lg mb-4">
          <p className="text-purple-800 text-sm">
            💡 Studios capture clean audio to add reverb later. Concert halls
            create natural acoustic "glue" that blends instruments together.
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
  };

  // Render twist review phase
  const renderTwistReview = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Purpose-Driven Acoustics
      </h2>

      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">🎙️ Recording Studios Want "Dead" Rooms</h3>
          <ul className="text-gray-700 text-sm space-y-1">
            <li>• Capture clean, dry audio without room coloring</li>
            <li>• Add reverb digitally later with precise control</li>
            <li>• Can't remove reverb, but can always add it</li>
            <li>• RT60 typically 0.1-0.3 seconds</li>
          </ul>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-bold text-purple-800 mb-2">🎻 Concert Halls Want "Live" Rooms</h3>
          <ul className="text-gray-700 text-sm space-y-1">
            <li>• Natural reverb creates warmth and richness</li>
            <li>• Notes blend together beautifully</li>
            <li>• Sound envelops the audience</li>
            <li>• RT60 typically 1.5-2.5 seconds for orchestral music</li>
          </ul>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-bold text-green-800 mb-2">🎯 The Sweet Spot</h3>
          <p className="text-gray-700 text-sm">
            Different music genres prefer different RT60:
          </p>
          <div className="mt-2 text-sm">
            <div className="flex justify-between">
              <span>Speech/podcast:</span>
              <span>0.3-0.5s</span>
            </div>
            <div className="flex justify-between">
              <span>Jazz:</span>
              <span>0.8-1.2s</span>
            </div>
            <div className="flex justify-between">
              <span>Chamber music:</span>
              <span>1.3-1.7s</span>
            </div>
            <div className="flex justify-between">
              <span>Symphony:</span>
              <span>1.8-2.2s</span>
            </div>
            <div className="flex justify-between">
              <span>Organ/choral:</span>
              <span>2.5-4.0s</span>
            </div>
          </div>
        </div>

        {twistPrediction === "blend" && (
          <div className="bg-green-100 p-4 rounded-lg border-2 border-green-400">
            <p className="text-green-800 font-semibold">
              🎉 Exactly right! Concert hall reverb creates the "glue" that
              makes orchestras sound rich and unified. Each note's tail
              blends with the next.
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
        Room Acoustics in the Real World
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
                ? "Excellent! You understand room acoustics!"
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
                {["🎭", "🎙️", "🎻", "⭐", "✨"][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        )}

        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Acoustics Master!
        </h2>

        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Key Concepts Mastered
          </h3>
          <div className="grid gap-3 text-left">
            {[
              "RT60: time for sound to decay 60 dB",
              "Sabine equation: RT60 = 0.161V/A",
              "Absorption coefficient determines how much energy is captured",
              "Hard surfaces reflect; soft surfaces absorb",
              "Studios want dead rooms; concert halls want live rooms",
              "Room size and materials both affect reverb"
            ].map((concept, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span className="text-gray-700">{concept}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-xl mb-6">
          <p className="text-purple-800">
            🎭 Next time you enter a room, clap once and listen to the reverb—
            you'll know exactly what materials and design created that sound!
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
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Room Reverberation</span>
          <div className="flex items-center gap-1.5">
            {phases.map((p, i) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-purple-400 w-6 shadow-lg shadow-purple-400/30'
                    : currentPhaseIndex > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={p.replace('_', ' ')}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-purple-400 capitalize">{phase.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
}
