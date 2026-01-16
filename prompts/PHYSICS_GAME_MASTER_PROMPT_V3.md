# Physics Simulation Game Generator - Master Prompt v3.0
## "Get It Right on First Try" Edition

---

## CRITICAL: READ THIS FIRST

This prompt generates production-ready educational physics games that work perfectly on first build. Every pattern here has been battle-tested across 77+ games.

**The Golden Rule**: When in doubt, SIMPLIFY. Simple code works. Complex code breaks.

---

## PHASE STRUCTURE (EXACTLY 10 PHASES)

```typescript
type Phase =
  | "hook"           // 1. Compelling introduction
  | "predict"        // 2. User makes prediction
  | "play"           // 3. Interactive simulation
  | "review"         // 4. Explain what happened
  | "twist_predict"  // 5. New variable prediction
  | "twist_play"     // 6. Explore the twist
  | "twist_review"   // 7. Deep insight
  | "transfer"       // 8. 4 real-world apps (SINGLE PHASE)
  | "test"           // 9. 10-question quiz
  | "mastery";       // 10. Celebration

// Phase validation helper
const isValidPhase = (phase: string): phase is Phase => {
  return [
    "hook", "predict", "play", "review",
    "twist_predict", "twist_play", "twist_review",
    "transfer", "test", "mastery",
  ].includes(phase);
};
```

---

## COMPLETE WORKING TEMPLATE

Copy this template EXACTLY for new games. Only modify the content, not the structure.

```typescript
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// INTERFACES
// ============================================================
interface GameEvent {
  type: string;
  data?: Record<string, unknown>;
  timestamp: number;
  phase: string;
}

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

interface YourGameRendererProps {
  onBack?: () => void;
  onGameEvent?: (event: GameEvent) => void;
}

// ============================================================
// SOUND UTILITY (COPY EXACTLY)
// ============================================================
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
    "hook", "predict", "play", "review",
    "twist_predict", "twist_play", "twist_review",
    "transfer", "test", "mastery",
  ].includes(phase);
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function YourGameRenderer({
  onBack,
  onGameEvent,
}: YourGameRendererProps) {
  // --------------------------------------------------------
  // CORE STATE (COPY EXACTLY)
  // --------------------------------------------------------
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

  // --------------------------------------------------------
  // GAME-SPECIFIC STATE (CUSTOMIZE PER GAME)
  // --------------------------------------------------------
  const [animationFrame, setAnimationFrame] = useState(0);
  // Add your game-specific state here...

  // --------------------------------------------------------
  // UTILITY FUNCTIONS (COPY EXACTLY)
  // --------------------------------------------------------
  const emitEvent = useCallback(
    (type: string, data?: Record<string, unknown>) => {
      if (onGameEvent) {
        onGameEvent({ type, data, timestamp: Date.now(), phase });
      }
    },
    [onGameEvent, phase]
  );

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
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

  // --------------------------------------------------------
  // NAVIGATION (COPY EXACTLY)
  // --------------------------------------------------------
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

  // --------------------------------------------------------
  // TEST QUESTIONS (CUSTOMIZE - EXACTLY 10)
  // --------------------------------------------------------
  const testQuestions = [
    {
      question: "Question 1?",
      options: ["A", "B", "C", "D"],
      correct: 0,
      explanation: "Explanation here."
    },
    // ... 9 more questions
  ];

  // --------------------------------------------------------
  // REAL-WORLD APPLICATIONS (EXACTLY 4)
  // --------------------------------------------------------
  const applications = [
    {
      title: "Application 1",
      description: "Description of how this uses the physics concept.",
      icon: "🎯"
    },
    {
      title: "Application 2",
      description: "Description.",
      icon: "💡"
    },
    {
      title: "Application 3",
      description: "Description.",
      icon: "🔬"
    },
    {
      title: "Application 4",
      description: "Description.",
      icon: "🌍"
    }
  ];

  // --------------------------------------------------------
  // TEST SUBMISSION
  // --------------------------------------------------------
  const handleTestSubmit = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] === q.correct) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    emitEvent("test_submitted", { score, total: testQuestions.length });
    if (score >= 7) playSound("complete");
    else playSound("failure");
  };

  // --------------------------------------------------------
  // PHASE RENDERERS
  // --------------------------------------------------------

  // HOOK PHASE
  const renderHook = () => (
    <div className="p-6 text-center max-w-2xl mx-auto">
      <div className="text-5xl mb-4">🎯</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Compelling Title Here
      </h2>
      <p className="text-gray-600 mb-6">
        Engaging hook description that makes users curious.
      </p>
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg mb-6">
        <p className="text-blue-800 font-medium">
          🤔 Thought-provoking question?
        </p>
      </div>
      <button
        onMouseDown={() => goToPhase("predict")}
        className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      >
        Start Exploring →
      </button>
    </div>
  );

  // PREDICT PHASE
  const renderPredict = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Make Your Prediction</h2>
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <p className="text-gray-700">Context for the prediction...</p>
      </div>

      <p className="text-gray-700 font-medium mb-4">What do you think will happen?</p>

      <div className="space-y-3">
        {[
          { id: "a", text: "Option A" },
          { id: "b", text: "Option B" },
          { id: "c", text: "Option C" },
          { id: "d", text: "Option D" }
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
          className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-semibold shadow-lg"
        >
          Test Your Prediction →
        </button>
      )}
    </div>
  );

  // PLAY PHASE (with interactive SVG)
  const renderPlay = () => (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        Experiment Title
      </h2>
      <p className="text-gray-600 mb-4">Instructions for the simulation.</p>

      <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
        <svg viewBox="0 0 400 300" className="w-full max-w-md mx-auto">
          {/* Your interactive visualization */}
          <rect width="400" height="300" fill="#f5f5f5" />
          <text x="200" y="150" textAnchor="middle" fill="#333">
            Interactive Visualization Here
          </text>
        </svg>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg p-4 shadow mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Control Label
        </label>
        <input type="range" min="0" max="100" className="w-full" />
      </div>

      <button
        onMouseDown={() => goToPhase("review")}
        className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold shadow-lg"
      >
        Understand What Happened →
      </button>
    </div>
  );

  // REVIEW PHASE
  const renderReview = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Understanding the Concept
      </h2>

      <div className="space-y-4">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
          <h3 className="font-bold text-blue-800 mb-2">🔬 Key Insight</h3>
          <p className="text-gray-700 text-sm">Explanation of the physics...</p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-bold text-green-800 mb-2">📐 The Math</h3>
          <div className="font-mono text-center mb-2">Formula = Here</div>
          <p className="text-gray-600 text-sm">What the formula means...</p>
        </div>

        {prediction === "correct_answer" && (
          <div className="bg-green-100 p-4 rounded-lg border-2 border-green-400">
            <p className="text-green-800 font-semibold">
              🎉 You predicted correctly!
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

  // TWIST PREDICT PHASE
  const renderTwistPredict = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">🔄 The Twist</h2>
      <div className="bg-purple-50 p-4 rounded-lg mb-6">
        <p className="text-gray-700">New variable introduction...</p>
      </div>

      <p className="text-gray-700 font-medium mb-4">What happens now?</p>

      <div className="space-y-3">
        {[
          { id: "a", text: "Twist Option A" },
          { id: "b", text: "Twist Option B" },
          { id: "c", text: "Twist Option C" }
        ].map((option) => (
          <button
            key={option.id}
            onMouseDown={() => {
              setTwistPrediction(option.id);
              playSound("click");
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
          Test the Twist →
        </button>
      )}
    </div>
  );

  // TWIST PLAY PHASE
  const renderTwistPlay = () => (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Exploring the Twist</h2>
      <p className="text-gray-600 mb-4">New instructions...</p>

      <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
        <svg viewBox="0 0 400 300" className="w-full max-w-md mx-auto">
          <rect width="400" height="300" fill="#f0f0f5" />
          <text x="200" y="150" textAnchor="middle" fill="#333">
            Twist Visualization
          </text>
        </svg>
      </div>

      <button
        onMouseDown={() => goToPhase("twist_review")}
        className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold shadow-lg"
      >
        See Explanation →
      </button>
    </div>
  );

  // TWIST REVIEW PHASE
  const renderTwistReview = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Deep Insight</h2>

      <div className="space-y-4">
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-bold text-purple-800 mb-2">🎯 The Key Insight</h3>
          <p className="text-gray-700 text-sm">Deep explanation...</p>
        </div>

        {twistPrediction === "correct" && (
          <div className="bg-green-100 p-4 rounded-lg border-2 border-green-400">
            <p className="text-green-800 font-semibold">🎉 Correct!</p>
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

  // TRANSFER PHASE (4 apps in single phase)
  const renderTransfer = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Real-World Applications
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

                  // Auto-advance to next incomplete app
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

  // TEST PHASE
  const renderTest = () => (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Test Your Knowledge</h2>

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
          <div className={`p-6 rounded-xl text-center ${
            testScore >= 7 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
          }`}>
            <div className="text-4xl mb-2">{testScore >= 7 ? "🎉" : "📚"}</div>
            <p className="text-2xl font-bold">{testScore} / {testQuestions.length}</p>
            <p className="mt-2">
              {testScore >= 7 ? "Excellent work!" : "Review the concepts and try again!"}
            </p>
          </div>

          {/* Show all questions with answers */}
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
                <p className={testAnswers[qIndex] === q.correct ? "text-green-700" : "text-red-700"}>
                  Your answer: {q.options[testAnswers[qIndex]]}
                  {testAnswers[qIndex] !== q.correct && (
                    <span className="block text-green-700 mt-1">
                      Correct: {q.options[q.correct]}
                    </span>
                  )}
                </p>
                <p className="text-gray-600 text-sm mt-2 italic">{q.explanation}</p>
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

  // MASTERY PHASE
  const renderMastery = () => {
    if (!showConfetti) {
      setShowConfetti(true);
      playSound("complete");
      emitEvent("mastery_achieved", {});
    }

    return (
      <div className="p-6 text-center max-w-2xl mx-auto relative">
        {/* Confetti */}
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
                {["🎯", "⭐", "✨", "🏆", "💡"][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        )}

        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Master!</h2>

        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Key Concepts Mastered</h3>
          <div className="grid gap-3 text-left">
            {[
              "Concept 1 learned",
              "Concept 2 learned",
              "Concept 3 learned",
              "Concept 4 learned"
            ].map((concept, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span className="text-gray-700">{concept}</span>
              </div>
            ))}
          </div>
        </div>

        {onBack && (
          <button
            onMouseDown={onBack}
            className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-xl font-semibold shadow-lg"
          >
            ← Back to Games
          </button>
        )}
      </div>
    );
  };

  // --------------------------------------------------------
  // MAIN RENDER
  // --------------------------------------------------------
  const renderPhase = () => {
    switch (phase) {
      case "hook": return renderHook();
      case "predict": return renderPredict();
      case "play": return renderPlay();
      case "review": return renderReview();
      case "twist_predict": return renderTwistPredict();
      case "twist_play": return renderTwistPlay();
      case "twist_review": return renderTwistReview();
      case "transfer": return renderTransfer();
      case "test": return renderTest();
      case "mastery": return renderMastery();
      default: return renderHook();
    }
  };

  // Progress bar
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
            <span className="text-2xl">🎯</span>
            <div>
              <h1 className="font-bold text-gray-800">Game Title</h1>
              <p className="text-xs text-gray-500">Subtitle</p>
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
```

---

## CRITICAL PATTERNS CHECKLIST

### ✅ Button Handling
```typescript
// ALWAYS use onMouseDown, NEVER onClick
<button onMouseDown={() => { ... }}>

// ALWAYS wrap state changes with sound feedback
onMouseDown={() => {
  setPrediction(value);
  playSound("click");
  emitEvent("prediction_made", { prediction: value });
}}
```

### ✅ Navigation Lock
```typescript
const navigationLockRef = useRef(false);

const goToPhase = useCallback((newPhase: Phase) => {
  if (navigationLockRef.current) return;  // Prevent double-clicks
  if (!isValidPhase(newPhase)) return;    // Type safety

  navigationLockRef.current = true;
  // ... state changes ...
  setTimeout(() => { navigationLockRef.current = false; }, 400);
}, [deps]);
```

### ✅ Transfer Phase Pattern
```typescript
// Single phase with Set tracking
const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

// Mark complete and auto-advance
const newCompleted = new Set(completedApps);
newCompleted.add(index);
setCompletedApps(newCompleted);

if (newCompleted.size < applications.length) {
  const nextIncomplete = applications.findIndex((_, i) => !newCompleted.has(i));
  setCurrentApp(nextIncomplete);
}
```

### ✅ Test State Pattern
```typescript
const [testAnswers, setTestAnswers] = useState<Record<number, number>>({});
const [testSubmitted, setTestSubmitted] = useState(false);
const [testScore, setTestScore] = useState(0);

// Only show submit when all answered
{Object.keys(testAnswers).length === testQuestions.length && (
  <button onMouseDown={handleTestSubmit}>Submit</button>
)}
```

---

## CONTENT REQUIREMENTS

### Test Questions (10 Required)
1. Questions 1-3: Basic recall
2. Questions 4-6: Apply concept
3. Questions 7-8: Compare scenarios
4. Questions 9-10: Predict new situations

Each question needs:
- `question`: Clear, concise question
- `options`: 4 choices (one correct)
- `correct`: Index (0-3) of correct answer
- `explanation`: Why the answer is correct (2-3 sentences)

### Real-World Applications (4 Required)
1. Technology application
2. Nature/biology application
3. Everyday life application
4. Industrial/scientific application

Each application needs:
- `title`: 2-4 word title
- `description`: 2-3 sentences explaining connection to physics
- `icon`: Single emoji

### SVG Visualizations
- Use `viewBox="0 0 400 XXX"` for consistent sizing
- Make interactive elements respond to state
- Add animations using `animationFrame` state
- Use semantic colors (temperature, intensity, etc.)

---

## COMMON MISTAKES TO AVOID

1. ❌ Using `onClick` instead of `onMouseDown`
2. ❌ Creating separate phases for each application
3. ❌ Forgetting `navigationLockRef` debouncing
4. ❌ Using inline styles instead of Tailwind
5. ❌ Missing `playSound()` feedback
6. ❌ Not using `Set<number>` for completedApps
7. ❌ Forgetting phase validation with `isValidPhase()`
8. ❌ Missing `showConfetti` state for mastery
9. ❌ Not showing test results after submission
10. ❌ Missing back button in mastery phase

---

## FINAL CHECKLIST

Before considering a game complete:

- [ ] 10 phases defined correctly
- [ ] `onMouseDown` used on ALL buttons
- [ ] `navigationLockRef` prevents double-clicks
- [ ] `playSound()` called on user interactions
- [ ] 10 test questions with explanations
- [ ] 4 real-world applications
- [ ] `completedApps` Set for transfer phase
- [ ] Interactive SVG visualization
- [ ] Confetti on mastery phase
- [ ] Progress bar shows correct phase
- [ ] Mobile responsive (`isMobile` state)
- [ ] Build succeeds without errors
