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
interface SoundDeadSpotsRendererProps {
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

// Play interference sound demonstration
const playInterferenceDemo = (
  frequency: number,
  amplitude: number,
  duration: number = 0.5
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

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gainNode.gain.value = amplitude * 0.3;

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration
    );
    oscillator.stop(audioContext.currentTime + duration);
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

export default function SoundDeadSpotsRenderer({
  onBack,
  onGameEvent,
}: SoundDeadSpotsRendererProps) {
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
  const [speakersOn, setSpeakersOn] = useState(true);
  const [listenerX, setListenerX] = useState(200);
  const [listenerY, setListenerY] = useState(250);
  const [isDragging, setIsDragging] = useState(false);
  const [frequency, setFrequency] = useState(200);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [showFieldOverlay, setShowFieldOverlay] = useState(false);
  const [foundDeadSpots, setFoundDeadSpots] = useState(0);

  // Twist state - speaker phase adjustment
  const [speaker2Phase, setSpeaker2Phase] = useState(0);
  const [twistListenerX, setTwistListenerX] = useState(200);
  const [twistListenerY, setTwistListenerY] = useState(250);
  const [twistIsDragging, setTwistIsDragging] = useState(false);

  // Constants
  const speaker1X = 100;
  const speaker2X = 300;
  const speakerY = 100;
  const speedOfSound = 343; // m/s
  const wavelength = speedOfSound / frequency;
  const pixelsPerMeter = 100; // 100 pixels = 1 meter

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

  // Animation loop for wave visualization
  useEffect(() => {
    if (!speakersOn) return;

    const interval = setInterval(() => {
      setAnimationFrame((f) => (f + 1) % 360);
    }, 50);

    return () => clearInterval(interval);
  }, [speakersOn]);

  // Calculate interference amplitude at a point
  const calculateInterference = useCallback(
    (x: number, y: number, phaseOffset: number = 0): number => {
      // Distances from each speaker (in meters)
      const d1 = Math.sqrt(Math.pow((x - speaker1X) / pixelsPerMeter, 2) +
                          Math.pow((y - speakerY) / pixelsPerMeter, 2));
      const d2 = Math.sqrt(Math.pow((x - speaker2X) / pixelsPerMeter, 2) +
                          Math.pow((y - speakerY) / pixelsPerMeter, 2));

      // Phase from distance (2π per wavelength) plus time animation
      const phase1 = (2 * Math.PI * d1 / wavelength) - (animationFrame * Math.PI / 30);
      const phase2 = (2 * Math.PI * d2 / wavelength) - (animationFrame * Math.PI / 30) + phaseOffset;

      // Sum of two waves with equal amplitude
      const amplitude = Math.cos(phase1) + Math.cos(phase2);

      return amplitude; // Range -2 to +2
    },
    [wavelength, animationFrame]
  );

  // Get amplitude at listener position
  const getListenerAmplitude = useCallback((): number => {
    return Math.abs(calculateInterference(listenerX, listenerY, 0));
  }, [calculateInterference, listenerX, listenerY]);

  // Get twist amplitude
  const getTwistAmplitude = useCallback((): number => {
    return Math.abs(calculateInterference(twistListenerX, twistListenerY, speaker2Phase));
  }, [calculateInterference, twistListenerX, twistListenerY, speaker2Phase]);

  // Track dead spots found
  useEffect(() => {
    if (phase === "play" && getListenerAmplitude() < 0.3) {
      setFoundDeadSpots((prev) => Math.min(prev + 1, 5));
    }
  }, [phase, listenerX, listenerY, getListenerAmplitude]);

  // Handle mouse move for dragging
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isDragging && !twistIsDragging) return;

      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const x = Math.max(50, Math.min(350, ((e.clientX - rect.left) / rect.width) * 400));
      const y = Math.max(150, Math.min(380, ((e.clientY - rect.top) / rect.height) * 400));

      if (isDragging) {
        setListenerX(x);
        setListenerY(y);
      } else if (twistIsDragging) {
        setTwistListenerX(x);
        setTwistListenerY(y);
      }
    },
    [isDragging, twistIsDragging]
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (!isDragging && !twistIsDragging) return;

      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const touch = e.touches[0];
      const x = Math.max(50, Math.min(350, ((touch.clientX - rect.left) / rect.width) * 400));
      const y = Math.max(150, Math.min(380, ((touch.clientY - rect.top) / rect.height) * 400));

      if (isDragging) {
        setListenerX(x);
        setListenerY(y);
      } else if (twistIsDragging) {
        setTwistListenerX(x);
        setTwistListenerY(y);
      }
    },
    [isDragging, twistIsDragging]
  );

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
      question: "What causes 'dead spots' in sound?",
      options: [
        "Speaker malfunction",
        "Destructive interference between waves",
        "Air absorbing the sound",
        "Walls blocking sound"
      ],
      correct: 1,
      explanation:
        "Dead spots occur where sound waves from multiple sources meet out of phase and cancel each other through destructive interference."
    },
    {
      question: "When do two waves constructively interfere?",
      options: [
        "When path difference is half a wavelength",
        "When path difference is a whole number of wavelengths",
        "When speakers are turned off",
        "Only at high frequencies"
      ],
      correct: 1,
      explanation:
        "Constructive interference occurs when the path difference is 0, λ, 2λ, etc. - whole wavelength multiples put waves in phase."
    },
    {
      question: "If you're at a dead spot and step 1/4 wavelength sideways, what happens?",
      options: [
        "Sound gets louder",
        "Sound stays the same",
        "Sound disappears completely",
        "Frequency changes"
      ],
      correct: 0,
      explanation:
        "Moving 1/4 wavelength changes the path difference enough to move from destructive (dead spot) toward constructive interference (louder)."
    },
    {
      question: "Why are dead spots at different locations for different frequencies?",
      options: [
        "Higher frequencies are louder",
        "Lower frequencies are quieter",
        "Different frequencies have different wavelengths",
        "The room shape changes"
      ],
      correct: 2,
      explanation:
        "Interference patterns depend on wavelength. Different frequencies have different wavelengths, so their constructive/destructive zones are at different positions."
    },
    {
      question: "What happens when one speaker is flipped 180° out of phase?",
      options: [
        "Sound doubles everywhere",
        "Dead spots and loud spots swap positions",
        "All sound cancels everywhere",
        "Only bass is affected"
      ],
      correct: 1,
      explanation:
        "Inverting one speaker's phase swaps the interference pattern - where waves added before they now cancel, and vice versa."
    },
    {
      question: "On the center line between two identical speakers, what do you hear?",
      options: [
        "Silence (dead spot)",
        "Normal volume (constructive)",
        "Random noise",
        "Only one speaker"
      ],
      correct: 1,
      explanation:
        "On the center line, both speakers are equidistant, so path difference is zero. The waves are in phase and add constructively."
    },
    {
      question: "Concert halls are designed to minimize dead spots. How?",
      options: [
        "Using only one speaker",
        "Using reflective surfaces to mix sound paths",
        "Playing very loud",
        "Seating people close together"
      ],
      correct: 1,
      explanation:
        "Acoustic design uses diffusers and strategic reflections to create many overlapping sound paths, preventing consistent interference patterns."
    },
    {
      question: "If wavelength is 1 meter, how far apart are adjacent dead spots?",
      options: [
        "0.25 meters",
        "0.5 meters",
        "1 meter",
        "2 meters"
      ],
      correct: 1,
      explanation:
        "Dead spots are separated by half a wavelength. Going from one dead spot to the next changes the path difference by λ, which means λ/2 in space."
    },
    {
      question: "Why do bass frequencies have fewer dead spots than treble?",
      options: [
        "Bass is louder",
        "Bass has longer wavelengths, so interference zones are wider",
        "Treble reflects more",
        "Bass travels faster"
      ],
      correct: 1,
      explanation:
        "Bass has longer wavelengths (meters vs centimeters for treble), so interference zones are much larger and fewer fit in a given space."
    },
    {
      question: "In a car with speakers in each door, where might you find a dead spot?",
      options: [
        "Right next to one speaker",
        "Exactly between the speakers",
        "Off-center, where path difference equals λ/2",
        "At the back of the car only"
      ],
      correct: 2,
      explanation:
        "Dead spots occur where path difference = (n + 0.5)λ. Off-center positions can create the half-wavelength difference needed for cancellation."
    }
  ];

  // Real-world applications
  const applications = [
    {
      title: "Concert Hall Acoustics",
      description:
        "Acoustic engineers design concert halls to prevent dead spots. They use curved surfaces, diffusers, and strategic speaker placement to ensure every seat receives clear, balanced sound. The Royal Albert Hall famously had dead spots until acoustic 'mushrooms' were installed.",
      icon: "🎭"
    },
    {
      title: "Noise-Canceling Headphones",
      description:
        "Active noise cancellation deliberately creates destructive interference. Microphones pick up ambient noise, and the headphones play the same sound 180° out of phase, creating a 'dead spot' at your ear that cancels unwanted noise.",
      icon: "🎧"
    },
    {
      title: "Car Audio Systems",
      description:
        "Premium car audio uses multiple speakers, digital signal processing, and phase alignment to minimize dead spots. Engineers map interference patterns and adjust timing so sound waves arrive in phase at the listener's position.",
      icon: "🚗"
    },
    {
      title: "Stadium PA Systems",
      description:
        "Stadium sound systems use delayed speaker arrays. By delaying distant speakers, sound from all sources arrives simultaneously at seating areas, preventing the interference patterns that would create dead zones.",
      icon: "🏟️"
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

  // Generate interference field
  const renderInterferenceField = () => {
    if (!showFieldOverlay) return null;

    const points: JSX.Element[] = [];
    const step = 15;

    for (let x = 50; x <= 350; x += step) {
      for (let y = 150; y <= 380; y += step) {
        const amplitude = Math.abs(calculateInterference(x, y,
          phase.includes("twist") ? speaker2Phase : 0));
        const intensity = amplitude / 2; // Normalize to 0-1

        // Green for loud, red for quiet
        const red = Math.round(255 * (1 - intensity));
        const green = Math.round(255 * intensity);

        points.push(
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r={6}
            fill={`rgba(${red}, ${green}, 0, 0.4)`}
          />
        );
      }
    }

    return <g>{points}</g>;
  };

  // Render speakers
  const renderSpeakers = () => (
    <g>
      {/* Speaker 1 */}
      <rect x={speaker1X - 20} y={speakerY - 25} width={40} height={50} fill="#333" rx={5} />
      <circle cx={speaker1X} cy={speakerY} r={15} fill="#555" />
      <circle cx={speaker1X} cy={speakerY} r={10} fill={speakersOn ? "#4CAF50" : "#666"} />
      {speakersOn && (
        <>
          <circle cx={speaker1X} cy={speakerY} r={8} fill="none" stroke="#4CAF50" strokeWidth={2} opacity={0.6 + 0.4 * Math.sin(animationFrame * Math.PI / 15)} />
        </>
      )}
      <text x={speaker1X} y={speakerY + 45} textAnchor="middle" fontSize="11" fill="#666">Speaker 1</text>

      {/* Speaker 2 */}
      <rect x={speaker2X - 20} y={speakerY - 25} width={40} height={50} fill="#333" rx={5} />
      <circle cx={speaker2X} cy={speakerY} r={15} fill="#555" />
      <circle cx={speaker2X} cy={speakerY} r={10} fill={speakersOn ? "#2196F3" : "#666"} />
      {speakersOn && (
        <>
          <circle cx={speaker2X} cy={speakerY} r={8} fill="none" stroke="#2196F3" strokeWidth={2} opacity={0.6 + 0.4 * Math.sin(animationFrame * Math.PI / 15 + (phase.includes("twist") ? speaker2Phase : 0))} />
        </>
      )}
      <text x={speaker2X} y={speakerY + 45} textAnchor="middle" fontSize="11" fill="#666">Speaker 2</text>
    </g>
  );

  // Render wave circles
  const renderWaves = () => {
    if (!speakersOn) return null;

    const waves: JSX.Element[] = [];
    const numWaves = 5;
    const maxRadius = 300;

    for (let i = 0; i < numWaves; i++) {
      const phase1 = (animationFrame + i * 60) % 360;
      const radius1 = (phase1 / 360) * maxRadius;
      const opacity = 1 - radius1 / maxRadius;

      if (radius1 > 0 && radius1 < maxRadius) {
        waves.push(
          <circle
            key={`w1-${i}`}
            cx={speaker1X}
            cy={speakerY}
            r={radius1}
            fill="none"
            stroke="#4CAF50"
            strokeWidth={2}
            opacity={opacity * 0.3}
          />
        );

        const phase2Offset = phase.includes("twist") ? (speaker2Phase * 180 / Math.PI) : 0;
        const phase2 = (animationFrame + i * 60 + phase2Offset) % 360;
        const radius2 = (phase2 / 360) * maxRadius;
        const opacity2 = 1 - radius2 / maxRadius;

        if (radius2 > 0 && radius2 < maxRadius) {
          waves.push(
            <circle
              key={`w2-${i}`}
              cx={speaker2X}
              cy={speakerY}
              r={radius2}
              fill="none"
              stroke="#2196F3"
              strokeWidth={2}
              opacity={opacity2 * 0.3}
            />
          );
        }
      }
    }

    return <g>{waves}</g>;
  };

  // Render listener
  const renderListener = (x: number, y: number, amplitude: number, onMouseDown: () => void) => {
    // Color based on amplitude: green = loud, red = quiet
    const intensity = Math.min(amplitude / 2, 1);
    const color = `rgb(${Math.round(255 * (1 - intensity))}, ${Math.round(255 * intensity)}, 0)`;

    return (
      <g>
        {/* Listener icon (ear) */}
        <circle
          cx={x}
          cy={y}
          r={20}
          fill={color}
          stroke="#333"
          strokeWidth={2}
          style={{ cursor: "grab" }}
          onMouseDown={onMouseDown}
          onTouchStart={onMouseDown}
        />
        <text x={x} y={y + 5} textAnchor="middle" fontSize="16" fill="#333" pointerEvents="none">
          👂
        </text>

        {/* Volume indicator */}
        <text x={x} y={y + 40} textAnchor="middle" fontSize="11" fill="#333">
          {amplitude < 0.3 ? "DEAD SPOT!" : amplitude < 0.8 ? "Quiet" : amplitude < 1.5 ? "Normal" : "LOUD!"}
        </text>

        {/* Sound level bars */}
        <g transform={`translate(${x - 25}, ${y + 50})`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x={i * 12}
              y={0}
              width={8}
              height={12}
              fill={amplitude > i * 0.4 ? color : "#ddd"}
              rx={2}
            />
          ))}
        </g>
      </g>
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
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-purple-100 to-blue-200 bg-clip-text text-transparent">
        The Mysterious Disappearing Sound
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover why sound vanishes at certain spots in a room
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">🔊 👻 🔊</div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              Two speakers play the exact same note at the same volume
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              Walk around the room... and the sound VANISHES! Step to the side—it's back!
            </p>
            <div className="pt-2">
              <p className="text-base text-purple-400 font-semibold">
                Can sound waves actually cancel each other out?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={() => goToPhase("predict")}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-purple-500 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Investigate
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-purple-400">✦</span>
          Wave Interference
        </div>
        <div className="flex items-center gap-2">
          <span className="text-purple-400">✦</span>
          Dead Spots
        </div>
        <div className="flex items-center gap-2">
          <span className="text-purple-400">✦</span>
          Noise Cancellation
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
          Two identical speakers play a 200 Hz tone. You stand exactly
          between them, equidistant from both. Then you step to the side
          so you're closer to one speaker than the other.
        </p>
      </div>

      <p className="text-gray-700 font-medium mb-4">
        What happens to the volume as you move off-center?
      </p>

      <div className="space-y-3">
        {[
          { id: "same", text: "The sound stays the same volume everywhere" },
          { id: "louder", text: "It gets louder near one speaker, quieter near the other" },
          { id: "pattern", text: "The volume goes up and down in a pattern as you move" },
          { id: "random", text: "The changes are random and unpredictable" }
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
    const amplitude = getListenerAmplitude();

    return (
      <div className="p-4 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Find the Dead Spots!
        </h2>
        <p className="text-gray-600 mb-4">
          Drag the listener (👂) around the room. Can you find positions where
          the sound almost disappears?
        </p>

        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <svg
            viewBox="0 0 400 400"
            className="w-full max-w-md mx-auto touch-none"
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => setIsDragging(false)}
          >
            {/* Background */}
            <rect width="400" height="400" fill="#f5f5f5" />

            {/* Room */}
            <rect x="30" y="60" width="340" height="330" fill="#e8e8e8" stroke="#999" strokeWidth={2} rx={10} />

            {/* Interference field overlay */}
            {renderInterferenceField()}

            {/* Wave circles */}
            {renderWaves()}

            {/* Speakers */}
            {renderSpeakers()}

            {/* Listener */}
            {renderListener(listenerX, listenerY, amplitude, () => setIsDragging(true))}

            {/* Path difference info */}
            <text x="200" y="395" textAnchor="middle" fontSize="10" fill="#666">
              Path difference: {Math.abs(
                Math.sqrt(Math.pow(listenerX - speaker1X, 2) + Math.pow(listenerY - speakerY, 2)) -
                Math.sqrt(Math.pow(listenerX - speaker2X, 2) + Math.pow(listenerY - speakerY, 2))
              ).toFixed(0)} px = {(Math.abs(
                Math.sqrt(Math.pow((listenerX - speaker1X) / pixelsPerMeter, 2) + Math.pow((listenerY - speakerY) / pixelsPerMeter, 2)) -
                Math.sqrt(Math.pow((listenerX - speaker2X) / pixelsPerMeter, 2) + Math.pow((listenerY - speakerY) / pixelsPerMeter, 2))
              )).toFixed(2)} m
            </text>
          </svg>

          <div className="flex justify-center gap-4 mt-4">
            <button
              onMouseDown={() => {
                setShowFieldOverlay(!showFieldOverlay);
                playSound("click");
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                showFieldOverlay
                  ? "bg-purple-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {showFieldOverlay ? "Hide" : "Show"} Field Map
            </button>

            <button
              onMouseDown={() => {
                playInterferenceDemo(frequency, amplitude);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
            >
              🔊 Hear It
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg p-4 shadow mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Frequency: {frequency} Hz (λ = {(speedOfSound / frequency).toFixed(2)} m)
          </label>
          <input
            type="range"
            min="100"
            max="500"
            value={frequency}
            onChange={(e) => setFrequency(parseInt(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Higher frequency = shorter wavelength = closer dead spots
          </p>
        </div>

        {/* Progress indicator */}
        <div className="bg-green-50 p-3 rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <span className="text-green-700">Dead spots found: {foundDeadSpots}/5</span>
            <div className="flex-1 bg-green-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${(foundDeadSpots / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <button
          onMouseDown={() => {
            setShowExplanation(true);
            goToPhase("review");
          }}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold shadow-lg"
        >
          I Found Them! Explain Why →
        </button>
      </div>
    );
  };

  // Render review phase
  const renderReview = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Wave Interference Explained
      </h2>

      <div className="space-y-4">
        <div className="bg-gradient-to-r from-green-50 to-teal-50 p-4 rounded-lg">
          <h3 className="font-bold text-green-800 mb-2">✅ Constructive Interference (LOUD)</h3>
          <p className="text-gray-700">
            When path difference = 0, λ, 2λ, 3λ... the waves arrive in phase.
            Crests meet crests, troughs meet troughs. They ADD together,
            making the sound LOUDER.
          </p>
          <div className="mt-2 font-mono text-sm text-green-700">
            Path difference = n × λ (n = 0, 1, 2, 3...)
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-lg">
          <h3 className="font-bold text-red-800 mb-2">❌ Destructive Interference (DEAD SPOT)</h3>
          <p className="text-gray-700">
            When path difference = λ/2, 3λ/2, 5λ/2... waves arrive out of phase.
            Crests meet troughs! They CANCEL, making the sound disappear.
          </p>
          <div className="mt-2 font-mono text-sm text-red-700">
            Path difference = (n + 0.5) × λ
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">📐 The Math</h3>
          <p className="text-gray-700 mb-2">
            At {frequency} Hz, wavelength λ = {speedOfSound}/{frequency} = <strong>{(speedOfSound / frequency).toFixed(2)} m</strong>
          </p>
          <p className="text-gray-700">
            Dead spots occur every {((speedOfSound / frequency) / 2).toFixed(2)} m (λ/2) as you move off-center.
          </p>
        </div>

        {prediction === "pattern" && (
          <div className="bg-green-100 p-4 rounded-lg border-2 border-green-400">
            <p className="text-green-800 font-semibold">
              🎉 You predicted correctly! The volume follows a regular interference
              pattern based on the path difference to each speaker.
            </p>
          </div>
        )}

        {prediction && prediction !== "pattern" && (
          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-amber-800">
              The key insight: it's not about being closer to one speaker.
              It's about the PATH DIFFERENCE—how much farther the sound from
              one speaker travels compared to the other. That determines
              whether waves add or cancel!
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
      <h2 className="text-xl font-bold text-gray-800 mb-4">🔄 The Phase Twist</h2>

      <div className="bg-purple-50 p-4 rounded-lg mb-6">
        <p className="text-gray-700">
          What if we flip the wiring on Speaker 2 so it pushes when Speaker 1
          pulls? (This adds 180° = π radians of phase shift.)
        </p>
      </div>

      <p className="text-gray-700 font-medium mb-4">
        What happens to the dead spots and loud spots?
      </p>

      <div className="space-y-3">
        {[
          { id: "swap", text: "They swap! Dead spots become loud, loud spots become dead" },
          { id: "disappear", text: "All dead spots disappear" },
          { id: "double", text: "Twice as many dead spots appear" },
          { id: "nothing", text: "Nothing changes—it's the same sound" }
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
          Test the Phase Flip →
        </button>
      )}
    </div>
  );

  // Render twist play phase
  const renderTwistPlay = () => {
    const amplitude = getTwistAmplitude();

    return (
      <div className="p-4 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Speaker Phase Control
        </h2>
        <p className="text-gray-600 mb-4">
          Adjust Speaker 2's phase and see how the interference pattern changes!
        </p>

        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <svg
            viewBox="0 0 400 400"
            className="w-full max-w-md mx-auto touch-none"
            onMouseMove={handleMouseMove}
            onMouseUp={() => setTwistIsDragging(false)}
            onMouseLeave={() => setTwistIsDragging(false)}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => setTwistIsDragging(false)}
          >
            {/* Background */}
            <rect width="400" height="400" fill="#f5f5f5" />

            {/* Room */}
            <rect x="30" y="60" width="340" height="330" fill="#e8e8e8" stroke="#999" strokeWidth={2} rx={10} />

            {/* Interference field overlay */}
            {renderInterferenceField()}

            {/* Wave circles */}
            {renderWaves()}

            {/* Speakers */}
            {renderSpeakers()}

            {/* Phase indicator on speaker 2 */}
            <text x={speaker2X} y={speakerY - 35} textAnchor="middle" fontSize="10" fill="#2196F3">
              +{(speaker2Phase * 180 / Math.PI).toFixed(0)}°
            </text>

            {/* Listener */}
            {renderListener(twistListenerX, twistListenerY, amplitude, () => setTwistIsDragging(true))}
          </svg>

          <div className="flex justify-center gap-4 mt-4">
            <button
              onMouseDown={() => {
                setShowFieldOverlay(!showFieldOverlay);
                playSound("click");
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                showFieldOverlay
                  ? "bg-purple-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {showFieldOverlay ? "Hide" : "Show"} Field Map
            </button>

            <button
              onMouseDown={() => {
                playInterferenceDemo(frequency, amplitude);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
            >
              🔊 Hear It
            </button>
          </div>
        </div>

        {/* Phase control */}
        <div className="bg-white rounded-lg p-4 shadow mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Speaker 2 Phase Offset: {(speaker2Phase * 180 / Math.PI).toFixed(0)}°
          </label>
          <input
            type="range"
            min="0"
            max={Math.PI.toString()}
            step="0.01"
            value={speaker2Phase}
            onChange={(e) => setSpeaker2Phase(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0° (In Phase)</span>
            <span>90°</span>
            <span>180° (Opposite)</span>
          </div>
        </div>

        <div className="bg-purple-50 p-3 rounded-lg mb-4">
          <p className="text-purple-800 text-sm">
            💡 Try setting phase to 180° and compare to where dead spots
            were before!
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
        Phase Inversion Explained
      </h2>

      <div className="space-y-4">
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-bold text-purple-800 mb-2">🔄 The Pattern Swap</h3>
          <p className="text-gray-700">
            Adding 180° phase shift is like adding λ/2 to the path difference
            everywhere. This converts constructive → destructive and
            destructive → constructive!
          </p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">📐 Why It Happens</h3>
          <p className="text-gray-700 mb-2">
            Original: Dead spot at path difference = λ/2
          </p>
          <p className="text-gray-700 mb-2">
            With 180° shift: That same spot now has effective path difference = λ/2 + λ/2 = λ
          </p>
          <p className="text-gray-700">
            Path difference = λ means waves are IN PHASE → LOUD!
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-bold text-green-800 mb-2">🎧 Practical Use</h3>
          <p className="text-gray-700">
            This is how noise-canceling headphones work! They detect incoming
            noise and play it back 180° out of phase. Your ear becomes a
            "dead spot" for that noise!
          </p>
        </div>

        {twistPrediction === "swap" && (
          <div className="bg-green-100 p-4 rounded-lg border-2 border-green-400">
            <p className="text-green-800 font-semibold">
              🎉 Correct! The interference pattern completely inverts when
              you flip one speaker's phase.
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
        Sound Interference in the Real World
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
                ? "Excellent! You understand sound interference!"
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
                {["🔊", "👂", "🎵", "⭐", "✨"][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        )}

        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Interference Master!
        </h2>

        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Key Concepts Mastered
          </h3>
          <div className="grid gap-3 text-left">
            {[
              "Wave superposition: multiple waves combine at each point",
              "Constructive interference when path difference = nλ",
              "Destructive interference (dead spots) when path difference = (n+0.5)λ",
              "Phase shift can invert the entire interference pattern",
              "Noise cancellation uses deliberate destructive interference",
              "Acoustic design minimizes dead spots through diffusion"
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
            🎧 Next time you use noise-canceling headphones, you'll know
            they're creating a personal dead spot at your ear!
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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Sound Dead Spots</span>
          <div className="flex items-center gap-1.5">
            {phases.map((p, i) => (
              <button
                key={p}
                onMouseDown={() => goToPhase(p)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-purple-400 w-6 shadow-lg shadow-purple-400/30'
                    : i < currentPhaseIndex
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-purple-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
}
