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
interface SoundLocalizationRendererProps {
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

// Play localized sound with ITD and ILD
const playLocalizedSound = (
  angle: number,
  frequency: number,
  duration: number = 0.3
): void => {
  if (typeof window === "undefined") return;
  try {
    const audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();

    const oscillator = audioContext.createOscillator();
    const leftGain = audioContext.createGain();
    const rightGain = audioContext.createGain();
    const merger = audioContext.createChannelMerger(2);

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";

    // Convert angle to radians (-90 to +90, where 0 is center)
    const rad = (angle * Math.PI) / 180;

    // ILD (Interaural Level Difference) - more pronounced at high frequencies
    const headShadowFactor = frequency > 1000 ? 0.4 : 0.15;
    const ildLeft = Math.max(0.1, 1 - Math.sin(rad) * headShadowFactor);
    const ildRight = Math.max(0.1, 1 + Math.sin(rad) * headShadowFactor);

    // ITD (Interaural Time Difference) - head diameter ~17cm, max delay ~0.7ms
    const maxDelay = 0.0007;
    const itdDelay = Math.sin(rad) * maxDelay;

    // Create delay nodes
    const leftDelay = audioContext.createDelay();
    const rightDelay = audioContext.createDelay();
    leftDelay.delayTime.value = Math.max(0, -itdDelay);
    rightDelay.delayTime.value = Math.max(0, itdDelay);

    // Connect graph
    oscillator.connect(leftDelay);
    oscillator.connect(rightDelay);
    leftDelay.connect(leftGain);
    rightDelay.connect(rightGain);
    leftGain.connect(merger, 0, 0);
    rightGain.connect(merger, 0, 1);
    merger.connect(audioContext.destination);

    leftGain.gain.value = ildLeft * 0.2;
    rightGain.gain.value = ildRight * 0.2;

    oscillator.start();
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

export default function SoundLocalizationRenderer({
  onBack,
  onGameEvent,
}: SoundLocalizationRendererProps) {
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
  const [soundAngle, setSoundAngle] = useState(0);
  const [soundFrequency, setSoundFrequency] = useState(1000);
  const [userGuess, setUserGuess] = useState<number | null>(null);
  const [showCorrect, setShowCorrect] = useState(false);
  const [trials, setTrials] = useState(0);
  const [correctTrials, setCorrectTrials] = useState(0);
  const [soundPlaying, setSoundPlaying] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Twist state - frequency comparison
  const [twistFrequency, setTwistFrequency] = useState<"low" | "high">("high");
  const [twistAngle, setTwistAngle] = useState(45);
  const [twistUserGuess, setTwistUserGuess] = useState<number | null>(null);
  const [twistShowCorrect, setTwistShowCorrect] = useState(false);
  const [lowFreqTrials, setLowFreqTrials] = useState(0);
  const [lowFreqCorrect, setLowFreqCorrect] = useState(0);
  const [highFreqTrials, setHighFreqTrials] = useState(0);
  const [highFreqCorrect, setHighFreqCorrect] = useState(0);

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

  // Generate random angle for trial
  const generateNewTrial = () => {
    const angles = [-60, -45, -30, -15, 0, 15, 30, 45, 60];
    const newAngle = angles[Math.floor(Math.random() * angles.length)];
    setSoundAngle(newAngle);
    setUserGuess(null);
    setShowCorrect(false);
  };

  // Generate twist trial
  const generateTwistTrial = () => {
    const angles = [-60, -45, -30, -15, 15, 30, 45, 60];
    const newAngle = angles[Math.floor(Math.random() * angles.length)];
    setTwistAngle(newAngle);
    setTwistUserGuess(null);
    setTwistShowCorrect(false);
  };

  // Play sound at current angle
  const handlePlaySound = () => {
    if (soundPlaying) return;
    setSoundPlaying(true);
    playLocalizedSound(soundAngle, soundFrequency, 0.5);
    setTimeout(() => setSoundPlaying(false), 600);
  };

  // Play twist sound
  const handlePlayTwistSound = () => {
    if (soundPlaying) return;
    setSoundPlaying(true);
    const freq = twistFrequency === "high" ? 4000 : 200;
    playLocalizedSound(twistAngle, freq, 0.5);
    setTimeout(() => setSoundPlaying(false), 600);
  };

  // Submit guess
  const handleGuessSubmit = () => {
    if (userGuess === null) return;

    setShowCorrect(true);
    setTrials((t) => t + 1);

    const error = Math.abs(userGuess - soundAngle);
    if (error <= 15) {
      setCorrectTrials((c) => c + 1);
      playSound("success");
    } else {
      playSound("failure");
    }

    emitEvent("localization_guess", {
      actual: soundAngle,
      guess: userGuess,
      error,
      frequency: soundFrequency,
    });
  };

  // Submit twist guess
  const handleTwistGuessSubmit = () => {
    if (twistUserGuess === null) return;

    setTwistShowCorrect(true);
    const error = Math.abs(twistUserGuess - twistAngle);
    const correct = error <= 20;

    if (twistFrequency === "low") {
      setLowFreqTrials((t) => t + 1);
      if (correct) setLowFreqCorrect((c) => c + 1);
    } else {
      setHighFreqTrials((t) => t + 1);
      if (correct) setHighFreqCorrect((c) => c + 1);
    }

    if (correct) {
      playSound("success");
    } else {
      playSound("failure");
    }
  };

  // Test questions
  const testQuestions = [
    {
      question: "What does ITD stand for?",
      options: [
        "Internal Time Delay",
        "Interaural Time Difference",
        "Intensity-Time Dynamics",
        "Inner Temporal Detection"
      ],
      correct: 1,
      explanation:
        "ITD (Interaural Time Difference) is the time difference between when sound reaches your two ears."
    },
    {
      question: "What causes the 'head shadow' effect?",
      options: [
        "The ears block sound",
        "The head blocks high frequencies from the far ear",
        "Hair absorbs sound",
        "The brain delays processing"
      ],
      correct: 1,
      explanation:
        "Your head physically blocks high-frequency sounds (short wavelength) from reaching the far ear, creating a level difference."
    },
    {
      question: "Why is bass (low frequency) harder to localize?",
      options: [
        "Bass is quieter",
        "Bass wavelengths are longer than head width, so they bend around",
        "Bass damages hearing",
        "Bass moves faster than treble"
      ],
      correct: 1,
      explanation:
        "Low frequencies have wavelengths longer than your head (~17cm), so they diffract around it. There's little ILD, and ITD is the only cue."
    },
    {
      question: "Maximum ITD for humans is about:",
      options: [
        "0.07 milliseconds",
        "0.7 milliseconds",
        "7 milliseconds",
        "70 milliseconds"
      ],
      correct: 1,
      explanation:
        "Sound travels 17cm (head width) in about 0.5-0.7ms. This tiny difference is enough for your brain to calculate direction."
    },
    {
      question: "What is the 'cone of confusion'?",
      options: [
        "A speaker design",
        "Locations with identical ITD/ILD where front/back is ambiguous",
        "Hearing loss pattern",
        "A meditation technique"
      ],
      correct: 1,
      explanation:
        "Points forming a cone around your ear-to-ear axis have identical ITD and ILD. The brain needs head movement or reflections to resolve front/back ambiguity."
    },
    {
      question: "How does the brain resolve front/back ambiguity?",
      options: [
        "It can't—we always confuse front and back",
        "Head movement changes ITD/ILD patterns differently",
        "We use the third ear",
        "Vision overrides hearing"
      ],
      correct: 1,
      explanation:
        "Slight head turns change ITD differently for front vs back sources. The pinna (outer ear shape) also filters sounds differently based on direction."
    },
    {
      question: "Why do subwoofers work well placed anywhere in a room?",
      options: [
        "They're louder",
        "Bass is non-directional due to long wavelengths",
        "Subwoofers are expensive",
        "Walls amplify bass"
      ],
      correct: 1,
      explanation:
        "Since we can't localize bass well, a single subwoofer can be placed anywhere—you won't hear where it's coming from."
    },
    {
      question: "ILD is most effective at which frequencies?",
      options: [
        "Low frequencies (bass)",
        "Mid frequencies",
        "High frequencies (treble)",
        "All frequencies equally"
      ],
      correct: 2,
      explanation:
        "High frequencies have short wavelengths that can't bend around your head. The head casts a 'shadow,' creating a noticeable level difference between ears."
    },
    {
      question: "Binaural recordings recreate 3D sound by:",
      options: [
        "Using extra loud speakers",
        "Recording with microphones in a dummy head's ears",
        "Digital processing alone",
        "Mono recording with delay"
      ],
      correct: 1,
      explanation:
        "Binaural recordings place microphones exactly where human ears would be in a dummy head, capturing natural ITD, ILD, and pinna effects."
    },
    {
      question: "What happens to sound localization when you hear with one ear blocked?",
      options: [
        "It improves",
        "It's impossible—no ITD or ILD cues",
        "Only bass localization is affected",
        "Nothing changes"
      ],
      correct: 1,
      explanation:
        "Monaural (one-ear) hearing loses ITD and ILD cues entirely. You lose spatial hearing and rely on loudness and reflections."
    }
  ];

  // Real-world applications
  const applications = [
    {
      title: "Surround Sound Systems",
      description:
        "Home theater systems use 5.1 or 7.1 channels to create directional audio. The '.1' is a subwoofer that can go anywhere because bass is non-directional. Speakers are placed to leverage ITD and ILD for spatial immersion.",
      icon: "🎬"
    },
    {
      title: "Binaural Audio for VR",
      description:
        "Virtual reality headphones simulate 3D audio by calculating ITD and ILD in real-time based on virtual sound source positions and head tracking. This makes VR experiences incredibly immersive.",
      icon: "🥽"
    },
    {
      title: "Hearing Aid Design",
      description:
        "Modern hearing aids sync wirelessly between ears to preserve ITD and ILD cues. Older aids amplified each ear independently, destroying spatial hearing and making cocktail parties overwhelming.",
      icon: "🦻"
    },
    {
      title: "Owl Hunting at Night",
      description:
        "Owls have asymmetrical ear positions—one higher than the other. This gives them vertical AND horizontal localization, letting them pinpoint mice in complete darkness with sub-degree accuracy!",
      icon: "🦉"
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

  // Render head with sound visualization
  const renderHeadVisualization = (angle: number, showActual: boolean, guessAngle: number | null) => {
    const headRadius = 60;
    const soundDistance = 140;

    // Calculate sound position
    const soundX = 200 + Math.sin((angle * Math.PI) / 180) * soundDistance;
    const soundY = 200 - Math.cos((angle * Math.PI) / 180) * soundDistance;

    // Calculate ear positions
    const leftEarX = 200 - headRadius * 0.9;
    const rightEarX = 200 + headRadius * 0.9;
    const earY = 200;

    // ITD visualization
    const distToLeft = Math.sqrt(Math.pow(soundX - leftEarX, 2) + Math.pow(soundY - earY, 2));
    const distToRight = Math.sqrt(Math.pow(soundX - rightEarX, 2) + Math.pow(soundY - earY, 2));
    const itdMs = ((distToRight - distToLeft) / soundDistance * 0.7).toFixed(2);

    // ILD visualization (simplified)
    const ildDiff = angle !== 0 ? Math.round(Math.sin((angle * Math.PI) / 180) * 8) : 0;

    return (
      <svg viewBox="0 0 400 400" className="w-full max-w-md mx-auto">
        {/* Background */}
        <rect width="400" height="400" fill="#1a1a2e" />

        {/* Direction indicators */}
        {[-90, -60, -45, -30, -15, 0, 15, 30, 45, 60, 90].map((a) => {
          const x = 200 + Math.sin((a * Math.PI) / 180) * (soundDistance + 20);
          const y = 200 - Math.cos((a * Math.PI) / 180) * (soundDistance + 20);
          return (
            <text
              key={a}
              x={x}
              y={y}
              textAnchor="middle"
              fill="#666"
              fontSize="10"
            >
              {a}°
            </text>
          );
        })}

        {/* Sound waves from source */}
        {soundPlaying && (
          <>
            {[0, 1, 2].map((i) => {
              const r = 20 + (animationFrame * 2 + i * 30) % 100;
              const opacity = 1 - r / 100;
              return (
                <circle
                  key={i}
                  cx={soundX}
                  cy={soundY}
                  r={r}
                  fill="none"
                  stroke="#ffd93d"
                  strokeWidth={2}
                  opacity={opacity}
                />
              );
            })}
          </>
        )}

        {/* Sound source */}
        {(showActual || !showCorrect) && (
          <g transform={`translate(${soundX}, ${soundY})`}>
            <circle r={15} fill={showActual ? "#4CAF50" : "#ffd93d"} />
            <text y={4} textAnchor="middle" fontSize="14">🔊</text>
          </g>
        )}

        {/* User guess indicator */}
        {guessAngle !== null && (
          <g transform={`translate(${200 + Math.sin((guessAngle * Math.PI) / 180) * soundDistance}, ${200 - Math.cos((guessAngle * Math.PI) / 180) * soundDistance})`}>
            <circle r={12} fill="none" stroke="#2196F3" strokeWidth={3} strokeDasharray="4,4" />
            <text y={30} textAnchor="middle" fill="#2196F3" fontSize="10">Your guess</text>
          </g>
        )}

        {/* Head */}
        <circle cx={200} cy={200} r={headRadius} fill="#e8d4b8" stroke="#333" strokeWidth={2} />

        {/* Face */}
        <circle cx={185} cy={185} r={5} fill="#333" /> {/* Left eye */}
        <circle cx={215} cy={185} r={5} fill="#333" /> {/* Right eye */}
        <ellipse cx={200} cy={205} rx={8} ry={5} fill="#d4a574" /> {/* Nose */}
        <path d="M 185 225 Q 200 235 215 225" fill="none" stroke="#333" strokeWidth={2} /> {/* Smile */}

        {/* Ears */}
        <ellipse cx={leftEarX - 10} cy={earY} rx={10} ry={20} fill="#e8d4b8" stroke="#333" strokeWidth={2} />
        <ellipse cx={rightEarX + 10} cy={earY} rx={10} ry={20} fill="#e8d4b8" stroke="#333" strokeWidth={2} />

        {/* Hair */}
        <path
          d={`M ${140} ${170} Q ${150} ${120} ${200} ${130} Q ${250} ${120} ${260} ${170}`}
          fill="#4a3520"
          stroke="#333"
          strokeWidth={1}
        />

        {/* Sound path lines */}
        {soundPlaying && (
          <>
            <line
              x1={soundX}
              y1={soundY}
              x2={leftEarX - 10}
              y2={earY}
              stroke="#4CAF50"
              strokeWidth={2}
              strokeDasharray="5,5"
              opacity={0.5}
            />
            <line
              x1={soundX}
              y1={soundY}
              x2={rightEarX + 10}
              y2={earY}
              stroke="#2196F3"
              strokeWidth={2}
              strokeDasharray="5,5"
              opacity={0.5}
            />
          </>
        )}

        {/* ITD/ILD info */}
        {showActual && (
          <>
            <text x={200} y={350} textAnchor="middle" fill="white" fontSize="12">
              ITD: {itdMs}ms | ILD: {ildDiff > 0 ? "+" : ""}{ildDiff} dB (right ear {ildDiff > 0 ? "louder" : ildDiff < 0 ? "quieter" : "same"})
            </text>
            <text x={200} y={370} textAnchor="middle" fill="#4CAF50" fontSize="14">
              Actual: {angle}°
            </text>
          </>
        )}

        {/* Labels */}
        <text x={200} y={30} textAnchor="middle" fill="#888" fontSize="12">
          FRONT
        </text>
        <text x={30} y={205} fill="#888" fontSize="12">
          LEFT
        </text>
        <text x={340} y={205} fill="#888" fontSize="12">
          RIGHT
        </text>
      </svg>
    );
  };

  // Render hook phase
  const renderHook = () => (
    <div className="p-6 text-center max-w-2xl mx-auto">
      <div className="text-5xl mb-4">👂 🎯 👂</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        How Do You Know Where Sounds Come From?
      </h2>
      <p className="text-gray-600 mb-6">
        Close your eyes and someone snaps their fingers. Instantly, you know
        exactly where they are! But how? Your brain performs incredible
        calculations using just two ears, separated by 17 centimeters.
      </p>
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg mb-6">
        <p className="text-purple-800 font-medium">
          🤔 What clues does your brain use to pinpoint sound location?
        </p>
      </div>
      <button
        onMouseDown={() => goToPhase("predict")}
        className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      >
        Test Your Sound Location Skills →
      </button>
    </div>
  );

  // Render predict phase
  const renderPredict = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Make Your Prediction</h2>
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <p className="text-gray-700">
          A sound plays from your right side. Think about what's different
          between what your left ear and right ear experience.
        </p>
      </div>

      <p className="text-gray-700 font-medium mb-4">
        What's the MAIN way your brain knows the sound is from the right?
      </p>

      <div className="space-y-3">
        {[
          { id: "time", text: "Sound reaches the right ear slightly BEFORE the left" },
          { id: "loud", text: "Sound is LOUDER in the right ear due to head shadow" },
          { id: "both", text: "BOTH timing and loudness differences" },
          { id: "pitch", text: "The pitch sounds different in each ear" }
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
          onMouseDown={() => {
            generateNewTrial();
            goToPhase("play");
          }}
          className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          Test Your Localization →
        </button>
      )}
    </div>
  );

  // Render play phase
  const renderPlay = () => (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        Locate the Sound!
      </h2>
      <p className="text-gray-600 mb-2">
        {isMobile ? "Use headphones for best effect!" : "Use headphones for best effect!"}
        {" "}Play the sound, then guess where it came from.
      </p>

      <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
        {renderHeadVisualization(soundAngle, showCorrect, userGuess)}

        <button
          onMouseDown={handlePlaySound}
          disabled={soundPlaying}
          className={`w-full mt-4 py-3 rounded-lg font-bold text-lg ${
            soundPlaying
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-yellow-400 text-gray-800 hover:bg-yellow-300"
          }`}
        >
          {soundPlaying ? "Playing..." : "🔊 Play Sound"}
        </button>
      </div>

      {/* Frequency control */}
      <div className="bg-white rounded-lg p-4 shadow mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sound Frequency: {soundFrequency} Hz
        </label>
        <input
          type="range"
          min="200"
          max="4000"
          step="100"
          value={soundFrequency}
          onChange={(e) => setSoundFrequency(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Bass (hard)</span>
          <span>Treble (easy)</span>
        </div>
      </div>

      {/* Guess slider */}
      {!showCorrect && (
        <div className="bg-white rounded-lg p-4 shadow mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Guess: {userGuess !== null ? `${userGuess}°` : "Move slider"}
          </label>
          <input
            type="range"
            min="-90"
            max="90"
            step="5"
            value={userGuess ?? 0}
            onChange={(e) => setUserGuess(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>← Left (-90°)</span>
            <span>Center (0°)</span>
            <span>Right (+90°) →</span>
          </div>

          {userGuess !== null && (
            <button
              onMouseDown={handleGuessSubmit}
              className="w-full mt-3 py-2 bg-blue-500 text-white rounded-lg font-medium"
            >
              Submit Guess
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {showCorrect && (
        <div className={`p-4 rounded-lg mb-4 ${
          Math.abs((userGuess ?? 0) - soundAngle) <= 15
            ? "bg-green-100"
            : "bg-red-100"
        }`}>
          <p className="font-bold">
            {Math.abs((userGuess ?? 0) - soundAngle) <= 15 ? "✓ Great!" : "✗ Off target"}
          </p>
          <p className="text-sm">
            Actual: {soundAngle}° | Your guess: {userGuess}° | Error: {Math.abs((userGuess ?? 0) - soundAngle)}°
          </p>
          <button
            onMouseDown={generateNewTrial}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
          >
            Try Another
          </button>
        </div>
      )}

      {/* Progress */}
      <div className="bg-blue-50 p-3 rounded-lg mb-4">
        <p className="text-blue-800 text-sm">
          Accuracy: {trials > 0 ? Math.round((correctTrials / trials) * 100) : 0}%
          ({correctTrials}/{trials} within 15°)
        </p>
      </div>

      {trials >= 3 && (
        <button
          onMouseDown={() => goToPhase("review")}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold shadow-lg"
        >
          Learn How It Works →
        </button>
      )}
    </div>
  );

  // Render review phase
  const renderReview = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Your Brain's Location System
      </h2>

      <div className="space-y-4">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">⏱️ ITD: Interaural Time Difference</h3>
          <p className="text-gray-700 text-sm mb-2">
            Sound from the right reaches your right ear ~0.7ms before your left ear.
            Your brain detects this tiny delay with incredible precision!
          </p>
          <div className="font-mono text-sm text-blue-700">
            Max ITD ≈ 0.7 ms (head width ÷ speed of sound)
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-teal-50 p-4 rounded-lg">
          <h3 className="font-bold text-green-800 mb-2">📢 ILD: Interaural Level Difference</h3>
          <p className="text-gray-700 text-sm mb-2">
            Your head casts a "shadow" for high frequencies. Sound from the right
            is louder in the right ear because the head blocks it from the left.
          </p>
          <div className="font-mono text-sm text-green-700">
            ILD up to ~20 dB for high frequencies
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-bold text-purple-800 mb-2">🔢 Frequency Matters!</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white p-2 rounded">
              <p className="font-medium">Bass (&lt;500 Hz)</p>
              <p className="text-gray-600">ITD only. Waves bend around head.</p>
            </div>
            <div className="bg-white p-2 rounded">
              <p className="font-medium">Treble (&gt;1500 Hz)</p>
              <p className="text-gray-600">ITD + ILD. Head shadow works.</p>
            </div>
          </div>
        </div>

        {(prediction === "both" || prediction === "time") && (
          <div className="bg-green-100 p-4 rounded-lg border-2 border-green-400">
            <p className="text-green-800 font-semibold">
              🎉 {prediction === "both"
                ? "Correct! The brain uses BOTH timing (ITD) and loudness (ILD) differences."
                : "Partially right! Timing (ITD) is crucial, but loudness (ILD) matters too, especially for high frequencies."}
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
      <h2 className="text-xl font-bold text-gray-800 mb-4">🔊 The Frequency Twist</h2>

      <div className="bg-purple-50 p-4 rounded-lg mb-6">
        <p className="text-gray-700">
          You'll try to localize two different sounds:
        </p>
        <ul className="mt-2 space-y-1 text-gray-700">
          <li>• 4000 Hz (high pitched beep)</li>
          <li>• 200 Hz (low bass tone)</li>
        </ul>
      </div>

      <p className="text-gray-700 font-medium mb-4">
        Which frequency will be EASIER to localize?
      </p>

      <div className="space-y-3">
        {[
          { id: "high", text: "4000 Hz (high) — head shadow creates ILD" },
          { id: "low", text: "200 Hz (low) — bass travels farther" },
          { id: "same", text: "Both equally easy" },
          { id: "neither", text: "Neither can be localized" }
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
            generateTwistTrial();
            goToPhase("twist_play");
          }}
          className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold shadow-lg"
        >
          Test Both Frequencies →
        </button>
      )}
    </div>
  );

  // Render twist play phase
  const renderTwistPlay = () => (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        High vs Low Frequency Localization
      </h2>
      <p className="text-gray-600 mb-2">
        Test both frequencies and compare your accuracy!
      </p>

      {/* Frequency toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onMouseDown={() => {
            setTwistFrequency("high");
            generateTwistTrial();
          }}
          className={`flex-1 py-3 rounded-lg font-medium ${
            twistFrequency === "high"
              ? "bg-purple-500 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          High (4000 Hz)
        </button>
        <button
          onMouseDown={() => {
            setTwistFrequency("low");
            generateTwistTrial();
          }}
          className={`flex-1 py-3 rounded-lg font-medium ${
            twistFrequency === "low"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Low (200 Hz)
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
        {renderHeadVisualization(twistAngle, twistShowCorrect, twistUserGuess)}

        <button
          onMouseDown={handlePlayTwistSound}
          disabled={soundPlaying}
          className={`w-full mt-4 py-3 rounded-lg font-bold text-lg ${
            soundPlaying
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : twistFrequency === "high"
              ? "bg-purple-400 text-white hover:bg-purple-300"
              : "bg-blue-400 text-white hover:bg-blue-300"
          }`}
        >
          {soundPlaying ? "Playing..." : `🔊 Play ${twistFrequency === "high" ? "4000" : "200"} Hz`}
        </button>
      </div>

      {/* Guess slider */}
      {!twistShowCorrect && (
        <div className="bg-white rounded-lg p-4 shadow mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Guess: {twistUserGuess !== null ? `${twistUserGuess}°` : "Move slider"}
          </label>
          <input
            type="range"
            min="-90"
            max="90"
            step="5"
            value={twistUserGuess ?? 0}
            onChange={(e) => setTwistUserGuess(parseInt(e.target.value))}
            className="w-full"
          />

          {twistUserGuess !== null && (
            <button
              onMouseDown={handleTwistGuessSubmit}
              className="w-full mt-3 py-2 bg-blue-500 text-white rounded-lg font-medium"
            >
              Submit Guess
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {twistShowCorrect && (
        <div className={`p-4 rounded-lg mb-4 ${
          Math.abs((twistUserGuess ?? 0) - twistAngle) <= 20
            ? "bg-green-100"
            : "bg-red-100"
        }`}>
          <p className="font-bold">
            Error: {Math.abs((twistUserGuess ?? 0) - twistAngle)}°
          </p>
          <button
            onMouseDown={generateTwistTrial}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
          >
            Try Another
          </button>
        </div>
      )}

      {/* Comparison stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-purple-50 p-3 rounded-lg">
          <h4 className="font-bold text-purple-800 text-sm">High (4000 Hz)</h4>
          <p className="text-sm">
            {highFreqTrials > 0
              ? `${Math.round((highFreqCorrect / highFreqTrials) * 100)}% (${highFreqCorrect}/${highFreqTrials})`
              : "No trials yet"}
          </p>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg">
          <h4 className="font-bold text-blue-800 text-sm">Low (200 Hz)</h4>
          <p className="text-sm">
            {lowFreqTrials > 0
              ? `${Math.round((lowFreqCorrect / lowFreqTrials) * 100)}% (${lowFreqCorrect}/${lowFreqTrials})`
              : "No trials yet"}
          </p>
        </div>
      </div>

      {(highFreqTrials >= 2 && lowFreqTrials >= 2) && (
        <button
          onMouseDown={() => goToPhase("twist_review")}
          className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold shadow-lg"
        >
          See Explanation →
        </button>
      )}
    </div>
  );

  // Render twist review phase
  const renderTwistReview = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Why Treble Is Easier to Locate
      </h2>

      <div className="space-y-4">
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-bold text-purple-800 mb-2">🎵 High Frequencies: Both Cues Work</h3>
          <ul className="text-gray-700 text-sm space-y-1">
            <li>• <strong>ITD:</strong> Timing difference works at all frequencies</li>
            <li>• <strong>ILD:</strong> Head shadow blocks short wavelengths (high freq)</li>
            <li>• Your brain gets TWO strong cues</li>
          </ul>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">🎸 Low Frequencies: Only ITD</h3>
          <ul className="text-gray-700 text-sm space-y-1">
            <li>• <strong>ITD:</strong> Still works (timing is timing)</li>
            <li>• <strong>ILD:</strong> Long wavelengths BEND around your head!</li>
            <li>• No shadow effect → only ONE cue → harder to localize</li>
          </ul>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-bold text-green-800 mb-2">📊 The Physics</h3>
          <p className="text-gray-700 text-sm">
            A 200 Hz wave has wavelength λ = 343/200 = <strong>1.7 meters</strong>.
            Your head is only 17cm wide—the wave barely notices it!
          </p>
          <p className="text-gray-700 text-sm mt-2">
            A 4000 Hz wave has λ = 343/4000 = <strong>8.6 cm</strong>.
            Your head is TWICE as wide, casting a strong shadow.
          </p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="font-bold text-yellow-800 mb-2">🔊 Real-World Implication</h3>
          <p className="text-gray-700 text-sm">
            This is why subwoofers can be placed ANYWHERE in a room—you can't
            tell where bass comes from! But high-frequency speakers need careful
            placement for spatial audio.
          </p>
        </div>

        {twistPrediction === "high" && (
          <div className="bg-green-100 p-4 rounded-lg border-2 border-green-400">
            <p className="text-green-800 font-semibold">
              🎉 Correct! High frequencies are easier to localize because the
              head shadow creates ILD in addition to ITD.
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
        Sound Localization in the Real World
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
                ? "Excellent! You understand sound localization!"
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
                {["👂", "🔊", "🎯", "⭐", "✨"][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        )}

        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Sound Localization Master!
        </h2>

        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Key Concepts Mastered
          </h3>
          <div className="grid gap-3 text-left">
            {[
              "ITD: Interaural Time Difference (~0.7ms max)",
              "ILD: Interaural Level Difference (head shadow)",
              "High frequencies use both ITD and ILD",
              "Low frequencies only have ITD (waves bend around head)",
              "Cone of confusion: front/back ambiguity",
              "Subwoofers are non-directional for this reason"
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
            👂 Next time you hear a sound, appreciate the incredible
            microsecond-level processing your brain does to tell you exactly
            where it came from!
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
            <span className="text-2xl">👂</span>
            <div>
              <h1 className="font-bold text-gray-800">Sound Localization</h1>
              <p className="text-xs text-gray-500">How you find sounds in space</p>
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
