import React, { useState, useRef, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────
// HeliumBalloonCarRenderer – Teach acceleration fields & buoyancy
// ─────────────────────────────────────────────────────────────
// Physics: In accelerating car, helium balloon moves FORWARD!
// Air is denser than helium → pushed backward by inertia
// Creates pressure gradient → balloon "rises" toward lower pressure
// Demonstrates equivalence principle: acceleration ≈ gravity field

interface GameEvent {
  type: 'phase_change' | 'prediction' | 'result' | 'complete';
  from?: string;
  to?: string;
  phase?: string;
  prediction?: string;
  actual?: string;
  correct?: boolean;
  score?: number;
  total?: number;
  percentage?: number;
}

interface HeliumBalloonCarRendererProps {
  onGameEvent?: (event: GameEvent) => void;
}

type Phase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

const phaseOrder: Phase[] = [
  'hook',
  'predict',
  'play',
  'review',
  'twist_predict',
  'twist_play',
  'twist_review',
  'transfer',
  'test',
  'mastery',
];

function isValidPhase(p: string): p is Phase {
  return phaseOrder.includes(p as Phase);
}

const playSound = (frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {}
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function HeliumBalloonCarRenderer({ onGameEvent }: HeliumBalloonCarRendererProps) {
  const [phase, setPhase] = useState<Phase>('hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [testAnswers, setTestAnswers] = useState<Record<number, number>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const navigationLockRef = useRef(false);

  // Simulation state
  const [carState, setCarState] = useState<'stopped' | 'accelerating' | 'braking' | 'constant'>('stopped');
  const [balloonAngle, setBalloonAngle] = useState(0); // degrees from vertical
  const [pendulumAngle, setPendulumAngle] = useState(0);
  const [carPosition, setCarPosition] = useState(50);
  const [hasAccelerated, setHasAccelerated] = useState(false);

  // Twist state - compare with heavy pendulum
  const [twistCarState, setTwistCarState] = useState<'stopped' | 'accelerating'>('stopped');
  const [twistBalloonAngle, setTwistBalloonAngle] = useState(0);
  const [twistPendulumAngle, setTwistPendulumAngle] = useState(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const goToPhase = (newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setTimeout(() => { navigationLockRef.current = false; }, 400);

    if (onGameEvent) {
      onGameEvent({ type: 'phase_change', from: phase, to: newPhase });
    }
    setPhase(newPhase);
    playSound(440, 0.15, 'sine', 0.2);
  };

  // Accelerate the car
  const accelerateCar = () => {
    if (carState !== 'stopped') return;
    setCarState('accelerating');
    setHasAccelerated(true);

    playSound(150, 0.5, 'sawtooth', 0.15);

    let angle = 0;
    let pos = carPosition;

    const interval = setInterval(() => {
      // Balloon tilts FORWARD (positive angle)
      angle = Math.min(angle + 1.5, 25);
      setBalloonAngle(angle);

      // Pendulum tilts BACKWARD (negative angle)
      setPendulumAngle(-angle);

      // Car moves
      pos += 2;
      setCarPosition(Math.min(pos, 300));

      if (angle >= 25) {
        setTimeout(() => {
          // Return to neutral
          setCarState('constant');
          let returnAngle = angle;
          const returnInterval = setInterval(() => {
            returnAngle *= 0.9;
            setBalloonAngle(returnAngle);
            setPendulumAngle(-returnAngle);
            if (Math.abs(returnAngle) < 0.5) {
              setBalloonAngle(0);
              setPendulumAngle(0);
              clearInterval(returnInterval);
            }
          }, 50);
        }, 500);
        clearInterval(interval);
      }
    }, 40);
  };

  const brakeCar = () => {
    if (carState !== 'constant') return;
    setCarState('braking');

    playSound(100, 0.3, 'square', 0.15);

    let angle = 0;
    const interval = setInterval(() => {
      // Balloon tilts BACKWARD during braking
      angle = Math.min(angle + 1.5, 20);
      setBalloonAngle(-angle);
      setPendulumAngle(angle);

      if (angle >= 20) {
        setTimeout(() => {
          setCarState('stopped');
          let returnAngle = angle;
          const returnInterval = setInterval(() => {
            returnAngle *= 0.9;
            setBalloonAngle(-returnAngle);
            setPendulumAngle(returnAngle);
            if (Math.abs(returnAngle) < 0.5) {
              setBalloonAngle(0);
              setPendulumAngle(0);
              clearInterval(returnInterval);
            }
          }, 50);
        }, 500);
        clearInterval(interval);
      }
    }, 40);
  };

  const resetSimulation = () => {
    setCarState('stopped');
    setBalloonAngle(0);
    setPendulumAngle(0);
    setCarPosition(50);
    setHasAccelerated(false);
  };

  // Twist simulation
  const accelerateTwistCar = () => {
    if (twistCarState !== 'stopped') return;
    setTwistCarState('accelerating');

    playSound(150, 0.5, 'sawtooth', 0.15);

    let angle = 0;
    const interval = setInterval(() => {
      angle = Math.min(angle + 1.5, 25);
      setTwistBalloonAngle(angle);
      setTwistPendulumAngle(-angle);

      if (angle >= 25) {
        clearInterval(interval);
      }
    }, 40);
  };

  const resetTwist = () => {
    setTwistCarState('stopped');
    setTwistBalloonAngle(0);
    setTwistPendulumAngle(0);
  };

  const handlePrediction = (choice: string) => {
    setPrediction(choice);
    if (onGameEvent) {
      onGameEvent({ type: 'prediction', phase: 'predict', prediction: choice });
    }
    playSound(330, 0.1, 'sine', 0.2);
  };

  const handleTwistPrediction = (choice: string) => {
    setTwistPrediction(choice);
    if (onGameEvent) {
      onGameEvent({ type: 'prediction', phase: 'twist_predict', prediction: choice });
    }
    playSound(330, 0.1, 'sine', 0.2);
  };

  const handleTestAnswer = (q: number, a: number) => {
    if (!testSubmitted) {
      setTestAnswers(prev => ({ ...prev, [q]: a }));
      playSound(330, 0.1, 'sine', 0.2);
    }
  };

  const submitTest = () => {
    setTestSubmitted(true);
    const score = testQuestions.reduce((acc, tq, i) => acc + (testAnswers[i] === tq.correct ? 1 : 0), 0);
    if (onGameEvent) {
      onGameEvent({
        type: 'result',
        phase: 'test',
        score,
        total: testQuestions.length,
        percentage: Math.round((score / testQuestions.length) * 100),
      });
    }
    playSound(score >= 7 ? 523 : 330, 0.3, 'sine', 0.3);
  };

  const testQuestions = [
    {
      q: "When a car accelerates forward, which way does a helium balloon move?",
      options: [
        "Backward (like everything else)",
        "Forward (opposite to everything else)",
        "Stays perfectly still",
        "Moves side to side"
      ],
      correct: 1,
      explanation: "The helium balloon moves forward! When the car accelerates, the denser air is pushed backward, creating higher pressure at the back. The balloon moves toward the lower pressure at the front."
    },
    {
      q: "Why does the helium balloon behave opposite to a heavy pendulum?",
      options: [
        "Helium is magnetic",
        "The string is different",
        "Helium is less dense than surrounding air",
        "The balloon has more surface area"
      ],
      correct: 2,
      explanation: "The key is relative density. The pendulum is denser than air, so it follows the 'pseudo-force' backward. Helium is less dense than air, so it moves opposite - toward where the air is being pushed away from."
    },
    {
      q: "What creates the forward force on the balloon during acceleration?",
      options: [
        "Wind from outside",
        "Air pressure gradient inside the car",
        "Static electricity",
        "The car's heater"
      ],
      correct: 1,
      explanation: "Acceleration creates a pressure gradient: air piles up at the back (higher pressure) and thins at the front (lower pressure). The balloon experiences a net buoyant force toward the low-pressure region."
    },
    {
      q: "What physics principle explains why acceleration affects objects like gravity?",
      options: [
        "Newton's First Law",
        "Conservation of Energy",
        "Einstein's Equivalence Principle",
        "Hooke's Law"
      ],
      correct: 2,
      explanation: "Einstein's Equivalence Principle states that the effects of acceleration are indistinguishable from gravity. In an accelerating car, forward acceleration creates an effective 'gravity' pointing backward."
    },
    {
      q: "What happens to the balloon when the car brakes (decelerates)?",
      options: [
        "Moves forward even faster",
        "Moves backward",
        "Stays perfectly still",
        "Pops"
      ],
      correct: 1,
      explanation: "During braking (negative acceleration), the pressure gradient reverses - higher pressure at front, lower at back. The balloon moves backward, toward the lower pressure region."
    },
    {
      q: "In the car's reference frame, what 'pseudo-force' do objects experience during forward acceleration?",
      options: [
        "A forward force",
        "A backward force",
        "An upward force",
        "No force"
      ],
      correct: 1,
      explanation: "In the accelerating car's reference frame, objects experience a backward pseudo-force (opposite to acceleration direction). This is why loose objects slide backward and pendulums swing backward."
    },
    {
      q: "If you put a bubble in a bottle of water and accelerate forward, which way does the bubble go?",
      options: [
        "Backward (with inertia)",
        "Forward (like the helium balloon)",
        "Straight up",
        "Straight down"
      ],
      correct: 1,
      explanation: "The bubble moves forward, just like the helium balloon! It's less dense than water, so when water is pushed backward by acceleration, the bubble goes the opposite direction."
    },
    {
      q: "Why doesn't this balloon effect happen when the car moves at constant speed?",
      options: [
        "Air stops moving",
        "No acceleration means no pressure gradient",
        "The balloon pops",
        "Friction stops it"
      ],
      correct: 1,
      explanation: "At constant velocity, there's no acceleration, so no pressure gradient develops inside the car. Without a pressure difference, there's no net buoyant force on the balloon."
    },
    {
      q: "How is the balloon in a car similar to a balloon in an elevator accelerating upward?",
      options: [
        "Both pop from pressure",
        "Both rise relative to the car/elevator",
        "Both experience enhanced 'gravity' making balloon rise more",
        "They behave completely differently"
      ],
      correct: 2,
      explanation: "An upward-accelerating elevator creates stronger effective gravity. Just like real gravity makes the balloon rise (buoyancy), enhanced effective gravity makes it rise even faster relative to the elevator."
    },
    {
      q: "What would happen to the helium balloon in a car that's turning left?",
      options: [
        "Moves left (into the turn)",
        "Moves right (away from turn)",
        "Stays centered",
        "Moves backward"
      ],
      correct: 0,
      explanation: "The balloon moves INTO the turn (left). The centripetal acceleration points left, so the air is pushed right. The balloon moves toward the lower pressure region on the left."
    }
  ];

  const applications = [
    {
      title: "Aircraft Fuel Gauges",
      description: "Accurate readings during maneuvers",
      detail: "Aircraft fuel systems account for acceleration effects. During climbs, dives, and turns, fuel sloshes and sensors must compensate for pseudo-gravity to give accurate readings.",
      icon: "✈️"
    },
    {
      title: "Submarine Buoyancy",
      description: "Neutral buoyancy during maneuvers",
      detail: "Submarines must carefully manage buoyancy. During acceleration, denser water redistributes, affecting the sub's trim. Ballast systems compensate for these dynamic effects.",
      icon: "🚢"
    },
    {
      title: "Centrifuges",
      description: "Separating by density",
      detail: "Medical and industrial centrifuges use extreme acceleration to separate substances by density. Blood components, DNA, and chemical mixtures separate because denser materials move outward.",
      icon: "🔬"
    },
    {
      title: "Hot Air Balloons",
      description: "Buoyancy in the atmosphere",
      detail: "Hot air balloons rise because heated air is less dense than cool air. They experience acceleration effects too - tilting during horizontal wind changes just like our helium balloon.",
      icon: "🎈"
    }
  ];

  const renderPhase = () => {
    switch (phase) {
      // ───────────────────────────────────────────────────
      // HOOK
      // ───────────────────────────────────────────────────
      case 'hook':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              The Backward Balloon
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500 }}>
              Everything slides backward when a car accelerates... but what about a helium balloon?
            </p>

            <svg viewBox="0 0 400 250" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              {/* Car body */}
              <rect x="80" y="130" width="240" height="80" fill="#475569" rx="10" />
              <rect x="100" y="100" width="200" height="50" fill="#334155" rx="8" />

              {/* Windows */}
              <rect x="115" y="108" width="70" height="35" fill="#60a5fa" rx="5" />
              <rect x="195" y="108" width="90" height="35" fill="#60a5fa" rx="5" />

              {/* Wheels */}
              <circle cx="130" cy="210" r="25" fill="#1e293b" />
              <circle cx="130" cy="210" r="12" fill="#94a3b8" />
              <circle cx="270" cy="210" r="25" fill="#1e293b" />
              <circle cx="270" cy="210" r="12" fill="#94a3b8" />

              {/* Inside car - balloon and pendulum */}
              {/* Pendulum (heavy ball) */}
              <line x1="250" y1="115" x2="270" y2="145" stroke="#64748b" strokeWidth="2" />
              <circle cx="270" cy="145" r="8" fill="#ef4444" />
              <text x="285" y="148" fill="#ef4444" fontSize="9">Heavy</text>

              {/* Helium balloon */}
              <line x1="170" y1="140" x2="150" y2="115" stroke="#94a3b8" strokeWidth="1" />
              <ellipse cx="150" cy="95" rx="20" ry="22" fill="#a855f7" opacity="0.8" />
              <text x="150" y="99" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">He</text>

              {/* Direction arrow */}
              <path d="M 340,170 L 380,170" fill="none" stroke="#22c55e" strokeWidth="4" />
              <polygon points="385,170 375,163 375,177" fill="#22c55e" />
              <text x="350" y="195" fill="#22c55e" fontSize="12" fontWeight="bold">ACCELERATE</text>

              {/* Question */}
              <text x="200" y="45" textAnchor="middle" fill="#1e293b" fontSize="14" fontWeight="bold">
                Which way does the balloon move?
              </text>
              <text x="150" y="70" textAnchor="middle" fill="#f59e0b" fontSize="24">?</text>
            </svg>

            <button
              onMouseDown={() => goToPhase('predict')}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
              }}
            >
              Make Your Prediction
            </button>
          </div>
        );

      // ───────────────────────────────────────────────────
      // PREDICT
      // ───────────────────────────────────────────────────
      case 'predict':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              Make Your Prediction
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500 }}>
              A helium balloon is tied to the floor of a car. When the car
              <strong> accelerates forward</strong>, which way does the balloon tilt?
            </p>

            <svg viewBox="0 0 400 140" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              {/* Simplified car interior */}
              <rect x="50" y="40" width="300" height="80" fill="#334155" rx="8" />

              {/* Floor */}
              <rect x="50" y="110" width="300" height="10" fill="#475569" />

              {/* Balloon */}
              <line x1="200" y1="110" x2="200" y2="70" stroke="#94a3b8" strokeWidth="1" />
              <ellipse cx="200" cy="55" rx="18" ry="20" fill="#a855f7" opacity="0.8" />
              <text x="200" y="59" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">He</text>

              {/* Direction labels */}
              <text x="80" y="140" fill="#64748b" fontSize="10">← BACK</text>
              <text x="300" y="140" fill="#22c55e" fontSize="10" fontWeight="bold">FRONT →</text>

              {/* Acceleration arrow */}
              <path d="M 350,75 L 380,75" fill="none" stroke="#22c55e" strokeWidth="3" />
              <polygon points="385,75 378,70 378,80" fill="#22c55e" />
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 400 }}>
              {[
                { id: 'a', text: 'Backward (like a hanging pendulum)' },
                { id: 'b', text: 'Forward (opposite to a pendulum)' },
                { id: 'c', text: 'Stays straight up (unaffected)' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={() => handlePrediction(opt.id)}
                  style={{
                    padding: '1rem',
                    background: prediction === opt.id ? '#3b82f6' : 'white',
                    color: prediction === opt.id ? 'white' : '#1e293b',
                    border: `2px solid ${prediction === opt.id ? '#3b82f6' : '#e2e8f0'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.2s'
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            {prediction && (
              <button
                onMouseDown={() => goToPhase('play')}
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Test It!
              </button>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // PLAY
      // ───────────────────────────────────────────────────
      case 'play':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              Balloon vs Pendulum Simulator
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>
              Watch both the balloon AND pendulum when the car accelerates
            </p>

            <svg viewBox="0 0 400 240" style={{ width: '100%', maxWidth: 450, marginBottom: '1rem' }}>
              {/* Road */}
              <rect x="0" y="200" width="400" height="40" fill="#475569" />
              <line x1="0" y1="220" x2="400" y2="220" stroke="#fbbf24" strokeWidth="3" strokeDasharray="20,10" />

              {/* Car body - moves with position */}
              <g transform={`translate(${carPosition - 50}, 0)`}>
                {/* Car shell */}
                <rect x="30" y="120" width="180" height="60" fill="#3b82f6" rx="8" />
                <rect x="50" y="90" width="140" height="45" fill="#1d4ed8" rx="6" />

                {/* Windows */}
                <rect x="60" y="97" width="50" height="32" fill="#93c5fd" rx="4" />
                <rect x="120" y="97" width="60" height="32" fill="#93c5fd" rx="4" />

                {/* Interior ceiling */}
                <line x1="55" y1="95" x2="185" y2="95" stroke="#1e40af" strokeWidth="2" />

                {/* Helium Balloon - tilts with angle */}
                <g transform={`rotate(${balloonAngle}, 100, 130)`}>
                  <line x1="100" y1="130" x2="100" y2="105" stroke="#94a3b8" strokeWidth="1" />
                  <ellipse cx="100" cy="90" rx="14" ry="16" fill="#a855f7" opacity="0.8" />
                  <text x="100" y="94" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">He</text>
                </g>

                {/* Pendulum - tilts opposite direction */}
                <g transform={`rotate(${pendulumAngle}, 150, 95)`}>
                  <line x1="150" y1="95" x2="150" y2="125" stroke="#64748b" strokeWidth="2" />
                  <circle cx="150" cy="130" r="8" fill="#ef4444" />
                </g>

                {/* Labels */}
                <text x="100" y="155" textAnchor="middle" fill="white" fontSize="8">Balloon</text>
                <text x="150" y="155" textAnchor="middle" fill="white" fontSize="8">Pendulum</text>

                {/* Wheels */}
                <circle cx="70" cy="180" r="20" fill="#1e293b" />
                <circle cx="70" cy="180" r="8" fill="#64748b" />
                <circle cx="170" cy="180" r="20" fill="#1e293b" />
                <circle cx="170" cy="180" r="8" fill="#64748b" />
              </g>

              {/* Status */}
              <text x="200" y="35" textAnchor="middle" fill="#1e293b" fontSize="12" fontWeight="bold">
                {carState === 'stopped' && 'Car is stopped'}
                {carState === 'accelerating' && '→ ACCELERATING FORWARD →'}
                {carState === 'constant' && 'Constant speed'}
                {carState === 'braking' && '← BRAKING ←'}
              </text>

              {/* Result highlight */}
              {hasAccelerated && carState !== 'accelerating' && (
                <g>
                  <text x="200" y="55" textAnchor="middle" fill="#22c55e" fontSize="11">
                    Balloon: FORWARD | Pendulum: BACKWARD
                  </text>
                </g>
              )}
            </svg>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button
                onMouseDown={accelerateCar}
                disabled={carState !== 'stopped'}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: carState !== 'stopped'
                    ? '#94a3b8'
                    : 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: carState !== 'stopped' ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                🚗 Accelerate!
              </button>

              {carState === 'constant' && (
                <button
                  onMouseDown={brakeCar}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  🛑 Brake!
                </button>
              )}

              {(carState === 'stopped' && hasAccelerated) && (
                <button
                  onMouseDown={resetSimulation}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #64748b, #475569)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  🔄 Reset
                </button>
              )}
            </div>

            {hasAccelerated && carState === 'stopped' && (
              <button
                onMouseDown={() => {
                  setShowResult(true);
                  if (onGameEvent) {
                    onGameEvent({
                      type: 'result',
                      phase: 'play',
                      prediction,
                      actual: 'b',
                      correct: prediction === 'b'
                    });
                  }
                }}
                style={{
                  padding: '1rem 2rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                See Results
              </button>
            )}

            {showResult && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: prediction === 'b' ? '#dcfce7' : '#fef3c7',
                borderRadius: 12,
                textAlign: 'center',
                maxWidth: 400
              }}>
                <p style={{ fontWeight: 600, color: prediction === 'b' ? '#166534' : '#92400e' }}>
                  {prediction === 'b' ? '✓ Correct!' : 'Surprising, right?'}
                </p>
                <p style={{ color: '#1e293b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  The balloon moves <strong>forward</strong> - opposite to the pendulum!
                  This happens because helium is less dense than air. When air is pushed
                  backward during acceleration, the balloon moves to fill the low-pressure
                  region at the front.
                </p>
                <button
                  onMouseDown={() => goToPhase('review')}
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 2rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Learn the Physics
                </button>
              </div>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // REVIEW
      // ───────────────────────────────────────────────────
      case 'review':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              The Physics: Buoyancy in Acceleration
            </h2>

            <div style={{
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#1d4ed8', marginBottom: '0.75rem' }}>Why It Happens</h3>

              <svg viewBox="0 0 300 150" style={{ width: '100%', marginBottom: '1rem' }}>
                {/* Car interior box */}
                <rect x="30" y="20" width="240" height="110" fill="#334155" rx="5" />

                {/* Pressure gradient visualization */}
                <defs>
                  <linearGradient id="pressureGrad" x1="100%" y1="0%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0.5" />
                  </linearGradient>
                </defs>
                <rect x="35" y="25" width="230" height="100" fill="url(#pressureGrad)" rx="3" />

                {/* Pressure labels */}
                <text x="60" y="45" fill="#22c55e" fontSize="9" fontWeight="bold">LOW P</text>
                <text x="220" y="45" fill="#ef4444" fontSize="9" fontWeight="bold">HIGH P</text>

                {/* Air molecules moving backward */}
                {[0, 1, 2].map(i => (
                  <g key={i}>
                    <circle cx={200 - i * 40} cy={75 + (i % 2) * 20} r="6" fill="#60a5fa" opacity="0.6" />
                    <path
                      d={`M ${180 - i * 40},${75 + (i % 2) * 20} L ${210 - i * 40},${75 + (i % 2) * 20}`}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      markerEnd="url(#blueArrow)"
                    />
                  </g>
                ))}

                {/* Balloon moving forward */}
                <ellipse cx="80" cy="75" rx="20" ry="22" fill="#a855f7" opacity="0.8" />
                <text x="80" y="79" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">He</text>
                <path d="M 55,75 L 35,75" fill="none" stroke="#22c55e" strokeWidth="3" markerEnd="url(#greenArr)" />

                {/* Acceleration arrow */}
                <text x="150" y="145" textAnchor="middle" fill="#64748b" fontSize="10">
                  ← Balloon | Air →
                </text>

                <defs>
                  <marker id="blueArrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
                  </marker>
                  <marker id="greenArr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                    <polygon points="8 0, 0 3, 8 6" fill="#22c55e" />
                  </marker>
                </defs>
              </svg>

              <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                <ol style={{ paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  <li>Car accelerates forward</li>
                  <li>Air (denser) has inertia → pushed backward</li>
                  <li>Creates pressure gradient: High (back) → Low (front)</li>
                  <li>Balloon (less dense) moves toward low pressure</li>
                </ol>
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#ca8a04', marginBottom: '0.75rem' }}>The Equivalence Principle</h3>

              <p style={{ fontSize: '0.9rem', color: '#1e293b', marginBottom: '1rem' }}>
                Einstein realized that <strong>acceleration is indistinguishable from gravity</strong>
                in a closed system:
              </p>

              <div style={{
                background: 'white',
                padding: '0.75rem',
                borderRadius: 8,
                textAlign: 'center'
              }}>
                <p style={{ fontWeight: 'bold', color: '#ca8a04' }}>
                  Forward acceleration = "Gravity" pointing backward
                </p>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Balloon "rises" against this pseudo-gravity → moves forward!
                </p>
              </div>
            </div>

            <button
              onMouseDown={() => goToPhase('twist_predict')}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Try a Twist! 🎈
            </button>
          </div>
        );

      // ───────────────────────────────────────────────────
      // TWIST PREDICT
      // ───────────────────────────────────────────────────
      case 'twist_predict':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              Bubble in Water
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500 }}>
              Now imagine a <strong>sealed bottle of water with an air bubble inside</strong>.
              When the car accelerates forward, which way does the bubble move?
            </p>

            <svg viewBox="0 0 400 150" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              {/* Car interior */}
              <rect x="50" y="30" width="300" height="80" fill="#334155" rx="8" />

              {/* Water bottle */}
              <rect x="170" y="45" width="60" height="50" fill="#3b82f6" rx="5" />
              <rect x="185" y="35" width="30" height="15" fill="#64748b" rx="3" />

              {/* Air bubble */}
              <ellipse cx="200" cy="65" rx="10" ry="8" fill="white" opacity="0.8" />
              <text x="200" y="68" textAnchor="middle" fill="#3b82f6" fontSize="7">air</text>

              {/* Direction arrow */}
              <path d="M 350,70 L 380,70" fill="none" stroke="#22c55e" strokeWidth="3" />
              <polygon points="385,70 378,65 378,75" fill="#22c55e" />
              <text x="365" y="95" fill="#22c55e" fontSize="10">Accel</text>

              {/* Question mark */}
              <text x="145" y="70" fill="#f59e0b" fontSize="20">?</text>
              <text x="255" y="70" fill="#f59e0b" fontSize="20">?</text>
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 400 }}>
              {[
                { id: 'a', text: 'Bubble moves backward (with inertia)' },
                { id: 'b', text: 'Bubble moves forward (like helium balloon)' },
                { id: 'c', text: 'Bubble stays in place' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={() => handleTwistPrediction(opt.id)}
                  style={{
                    padding: '1rem',
                    background: twistPrediction === opt.id ? '#f59e0b' : 'white',
                    color: twistPrediction === opt.id ? 'white' : '#1e293b',
                    border: `2px solid ${twistPrediction === opt.id ? '#f59e0b' : '#e2e8f0'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            {twistPrediction && (
              <button
                onMouseDown={() => goToPhase('twist_play')}
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem 2.5rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Test It!
              </button>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // TWIST PLAY
      // ───────────────────────────────────────────────────
      case 'twist_play':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              Balloon vs Bubble Comparison
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>
              Same principle, different mediums!
            </p>

            <svg viewBox="0 0 400 220" style={{ width: '100%', maxWidth: 450, marginBottom: '1rem' }}>
              {/* Car interior */}
              <rect x="30" y="40" width="340" height="130" fill="#334155" rx="10" />

              {/* Left side: Helium balloon in air */}
              <g transform="translate(80, 50)">
                <text x="50" y="10" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                  Balloon in Air
                </text>

                {/* Air box */}
                <rect x="10" y="20" width="80" height="80" fill="#1e40af" rx="5" opacity="0.3" />
                <text x="50" y="115" textAnchor="middle" fill="#64748b" fontSize="9">
                  He in air
                </text>

                {/* Balloon tilts forward */}
                <g transform={`rotate(${twistBalloonAngle}, 50, 90)`}>
                  <line x1="50" y1="90" x2="50" y2="55" stroke="#94a3b8" strokeWidth="1" />
                  <ellipse cx="50" cy="42" rx="15" ry="17" fill="#a855f7" opacity="0.9" />
                </g>
              </g>

              {/* Right side: Bubble in water */}
              <g transform="translate(230, 50)">
                <text x="50" y="10" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                  Bubble in Water
                </text>

                {/* Water bottle */}
                <rect x="15" y="20" width="70" height="80" fill="#3b82f6" rx="5" />
                <rect x="30" y="10" width="40" height="15" fill="#64748b" rx="3" />
                <text x="50" y="115" textAnchor="middle" fill="#64748b" fontSize="9">
                  Air in water
                </text>

                {/* Bubble moves forward */}
                <ellipse
                  cx={50 + twistBalloonAngle * 0.8}
                  cy="55"
                  rx="12"
                  ry="10"
                  fill="white"
                  opacity="0.9"
                />
              </g>

              {/* Direction arrow */}
              <path d="M 200,190 L 250,190" fill="none" stroke="#22c55e" strokeWidth="4" />
              <polygon points="255,190 248,183 248,197" fill="#22c55e" />
              <text x="225" y="210" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="bold">
                ACCELERATE
              </text>

              {/* Result */}
              {twistCarState === 'accelerating' && twistBalloonAngle > 20 && (
                <text x="200" y="30" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">
                  Both move FORWARD!
                </text>
              )}
            </svg>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button
                onMouseDown={accelerateTwistCar}
                disabled={twistCarState !== 'stopped'}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: twistCarState !== 'stopped'
                    ? '#94a3b8'
                    : 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: twistCarState !== 'stopped' ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                🚗 Accelerate!
              </button>

              <button
                onMouseDown={resetTwist}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #64748b, #475569)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                🔄 Reset
              </button>
            </div>

            {twistCarState === 'accelerating' && twistBalloonAngle > 20 && (
              <button
                onMouseDown={() => {
                  setShowTwistResult(true);
                  if (onGameEvent) {
                    onGameEvent({
                      type: 'result',
                      phase: 'twist_play',
                      prediction: twistPrediction,
                      actual: 'b',
                      correct: twistPrediction === 'b'
                    });
                  }
                }}
                style={{
                  padding: '1rem 2rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                See Results
              </button>
            )}

            {showTwistResult && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: twistPrediction === 'b' ? '#dcfce7' : '#fef3c7',
                borderRadius: 12,
                textAlign: 'center',
                maxWidth: 400
              }}>
                <p style={{ fontWeight: 600, color: twistPrediction === 'b' ? '#166534' : '#92400e' }}>
                  {twistPrediction === 'b' ? '✓ Correct!' : 'Same physics!'}
                </p>
                <p style={{ color: '#1e293b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  The bubble moves <strong>forward</strong> - exactly like the helium balloon!
                  It's all about relative density: air bubble in water behaves just like
                  helium balloon in air. Both are less dense than their surroundings.
                </p>
                <button
                  onMouseDown={() => goToPhase('twist_review')}
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 2rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Understand Why
                </button>
              </div>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // TWIST REVIEW
      // ───────────────────────────────────────────────────
      case 'twist_review':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              The Universal Principle
            </h2>

            <div style={{
              background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#ca8a04', marginBottom: '0.75rem' }}>Relative Density is Key</h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{ background: 'white', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🎈</div>
                  <p style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '0.9rem' }}>Helium in Air</p>
                  <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    ρ<sub>He</sub> = 0.18 kg/m³
                    <br />
                    ρ<sub>air</sub> = 1.2 kg/m³
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '0.25rem' }}>
                    He is 7× lighter
                  </p>
                </div>

                <div style={{ background: 'white', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>💧</div>
                  <p style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '0.9rem' }}>Air in Water</p>
                  <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    ρ<sub>air</sub> = 1.2 kg/m³
                    <br />
                    ρ<sub>water</sub> = 1000 kg/m³
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '0.25rem' }}>
                    Air is 830× lighter
                  </p>
                </div>
              </div>

              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: 8,
                textAlign: 'center'
              }}>
                <p style={{ fontWeight: 'bold', color: '#ca8a04', marginBottom: '0.5rem' }}>
                  The Rule:
                </p>
                <p style={{ color: '#1e293b', fontSize: '0.9rem' }}>
                  In any acceleration, <strong>less dense objects move opposite</strong> to the
                  direction of pseudo-force (they "rise" against the effective gravity).
                </p>
              </div>
            </div>

            <div style={{
              background: '#f0fdf4',
              borderRadius: 12,
              padding: '1rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ color: '#166534', marginBottom: '0.5rem' }}>More Examples</h4>
              <ul style={{ color: '#1e293b', fontSize: '0.9rem', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                <li><strong>Turning car:</strong> Balloon moves INTO the turn</li>
                <li><strong>Elevator going up:</strong> Balloon rises faster relative to car</li>
                <li><strong>Airplane takeoff:</strong> Balloon tilts toward cockpit</li>
              </ul>
            </div>

            <button
              onMouseDown={() => goToPhase('transfer')}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              See Real Applications
            </button>
          </div>
        );

      // ───────────────────────────────────────────────────
      // TRANSFER
      // ───────────────────────────────────────────────────
      case 'transfer':
        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              Buoyancy Effects in Action
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center' }}>
              Explore each application to unlock the test
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '1rem',
              width: '100%',
              maxWidth: 600,
              marginBottom: '1.5rem'
            }}>
              {applications.map((app, index) => (
                <div
                  key={index}
                  onMouseDown={() => {
                    setCompletedApps(prev => new Set([...prev, index]));
                    playSound(500 + index * 100, 0.15, 'sine', 0.2);
                  }}
                  style={{
                    background: completedApps.has(index)
                      ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)'
                      : 'white',
                    borderRadius: 12,
                    padding: '1rem',
                    cursor: 'pointer',
                    border: `2px solid ${completedApps.has(index) ? '#22c55e' : '#e2e8f0'}`,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{app.icon}</div>
                  <h3 style={{ color: '#1e293b', fontSize: '1rem', marginBottom: '0.25rem' }}>
                    {app.title}
                    {completedApps.has(index) && ' ✓'}
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    {app.description}
                  </p>
                  {completedApps.has(index) && (
                    <p style={{ color: '#1e293b', fontSize: '0.8rem', fontStyle: 'italic' }}>
                      {app.detail}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {completedApps.size} / {applications.length} applications explored
            </p>

            {completedApps.size >= applications.length && (
              <button
                onMouseDown={() => goToPhase('test')}
                style={{
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Take the Test
              </button>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // TEST
      // ───────────────────────────────────────────────────
      case 'test':
        const score = testQuestions.reduce((acc, tq, i) => acc + (testAnswers[i] === tq.correct ? 1 : 0), 0);

        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              Acceleration Buoyancy Mastery Test
            </h2>

            <div style={{ width: '100%', maxWidth: 600 }}>
              {testQuestions.map((tq, qi) => (
                <div
                  key={qi}
                  style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: `2px solid ${
                      testSubmitted
                        ? testAnswers[qi] === tq.correct
                          ? '#22c55e'
                          : testAnswers[qi] !== undefined
                          ? '#ef4444'
                          : '#e2e8f0'
                        : '#e2e8f0'
                    }`
                  }}
                >
                  <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
                    {qi + 1}. {tq.q}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {tq.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onMouseDown={() => handleTestAnswer(qi, oi)}
                        disabled={testSubmitted}
                        style={{
                          padding: '0.6rem 1rem',
                          textAlign: 'left',
                          background: testSubmitted
                            ? oi === tq.correct
                              ? '#dcfce7'
                              : testAnswers[qi] === oi
                              ? '#fee2e2'
                              : '#f8fafc'
                            : testAnswers[qi] === oi
                            ? '#dbeafe'
                            : '#f8fafc',
                          color: '#1e293b',
                          border: `1px solid ${
                            testSubmitted
                              ? oi === tq.correct
                                ? '#22c55e'
                                : testAnswers[qi] === oi
                                ? '#ef4444'
                                : '#e2e8f0'
                              : testAnswers[qi] === oi
                              ? '#3b82f6'
                              : '#e2e8f0'
                          }`,
                          borderRadius: 8,
                          cursor: testSubmitted ? 'default' : 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  {testSubmitted && (
                    <p style={{
                      marginTop: '0.75rem',
                      padding: '0.5rem',
                      background: '#f0f9ff',
                      borderRadius: 6,
                      fontSize: '0.85rem',
                      color: '#1e293b'
                    }}>
                      💡 {tq.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {!testSubmitted ? (
              <button
                onMouseDown={submitTest}
                disabled={Object.keys(testAnswers).length < testQuestions.length}
                style={{
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  background: Object.keys(testAnswers).length < testQuestions.length
                    ? '#94a3b8'
                    : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: Object.keys(testAnswers).length < testQuestions.length ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                Submit Test ({Object.keys(testAnswers).length}/{testQuestions.length})
              </button>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: score >= 7 ? '#22c55e' : '#f59e0b',
                  marginBottom: '1rem'
                }}>
                  Score: {score}/{testQuestions.length} ({Math.round(score / testQuestions.length * 100)}%)
                </p>

                <button
                  onMouseDown={() => goToPhase('mastery')}
                  style={{
                    padding: '1rem 2.5rem',
                    fontSize: '1.1rem',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Complete Journey
                </button>
              </div>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // MASTERY
      // ───────────────────────────────────────────────────
      case 'mastery':
        const finalScore = testQuestions.reduce((acc, tq, i) => acc + (testAnswers[i] === tq.correct ? 1 : 0), 0);

        return (
          <div className="flex flex-col items-center" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎈🚗🎉</div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              Acceleration Buoyancy Master!
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: 400 }}>
              You now understand why helium balloons seem to defy physics
              and how acceleration creates effective gravity fields!
            </p>

            <div style={{
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 400,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#1d4ed8', marginBottom: '1rem' }}>Your Achievements</h3>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b' }}>
                    {finalScore}/{testQuestions.length}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Test Score</p>
                </div>
                <div>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b' }}>4</p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Applications</p>
                </div>
              </div>

              <div style={{
                background: 'white',
                borderRadius: 10,
                padding: '1rem',
                textAlign: 'left'
              }}>
                <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
                  Key Takeaways:
                </p>
                <ul style={{ color: '#64748b', fontSize: '0.85rem', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  <li>Acceleration creates pressure gradients</li>
                  <li>Less dense objects move toward low pressure</li>
                  <li>Equivalence principle: acceleration ≈ gravity</li>
                  <li>Same rule: balloon in air = bubble in water</li>
                </ul>
              </div>
            </div>

            {/* Confetti */}
            <svg viewBox="0 0 300 100" style={{ width: '100%', maxWidth: 300 }}>
              {[...Array(20)].map((_, i) => (
                <circle
                  key={i}
                  cx={Math.random() * 300}
                  cy={Math.random() * 100}
                  r={3 + Math.random() * 4}
                  fill={['#3b82f6', '#a855f7', '#22c55e', '#f59e0b', '#ef4444'][i % 5]}
                >
                  <animate
                    attributeName="cy"
                    values={`${Math.random() * 30};${70 + Math.random() * 30}`}
                    dur={`${1 + Math.random()}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="1;0"
                    dur={`${1 + Math.random()}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </svg>

            <button
              onMouseDown={() => {
                if (onGameEvent) {
                  onGameEvent({ type: 'complete', score: finalScore, total: testQuestions.length });
                }
                goToPhase('hook');
                setTestAnswers({});
                setTestSubmitted(false);
                setCompletedApps(new Set());
                resetSimulation();
                resetTwist();
              }}
              style={{
                marginTop: '1rem',
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Play Again
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const currentIndex = phaseOrder.indexOf(phase);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc, #e0f2fe)',
      padding: isMobile ? '1rem' : '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Progress bar */}
      <div style={{
        maxWidth: 700,
        margin: '0 auto 1.5rem auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '0.5rem'
        }}>
          {phaseOrder.map((p, i) => (
            <div
              key={p}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: i <= currentIndex
                  ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                  : '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: i <= currentIndex ? 'white' : '#94a3b8',
                fontSize: '0.7rem',
                fontWeight: 600
              }}
            >
              {i < currentIndex ? '✓' : i + 1}
            </div>
          ))}
        </div>
        <div style={{
          height: 4,
          background: '#e2e8f0',
          borderRadius: 2,
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${(currentIndex / (phaseOrder.length - 1)) * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Main content */}
      <div style={{
        maxWidth: 700,
        margin: '0 auto',
        background: 'white',
        borderRadius: 20,
        padding: isMobile ? '1.5rem' : '2rem',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)'
      }}>
        {renderPhase()}
      </div>
    </div>
  );
}
