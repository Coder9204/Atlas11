import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────
// HeliumBalloonCarRenderer – Teach acceleration fields & buoyancy
// ─────────────────────────────────────────────────────────────
// Physics: In accelerating car, helium balloon moves FORWARD!
// Air is denser than helium → pushed backward by inertia
// Creates pressure gradient → balloon "rises" toward lower pressure
// Demonstrates equivalence principle: acceleration ≈ gravity field

interface HeliumBalloonCarRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
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

// Slider component for consistent styling
interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  color?: string;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, unit, onChange, color = '#3b82f6' }) => (
  <div style={{ marginBottom: '1rem', width: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
      <label style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 500 }}>{label}</label>
      <span style={{ fontSize: '0.85rem', color: color, fontWeight: 600 }}>{value.toFixed(1)} {unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{
        width: '100%',
        height: '8px',
        borderRadius: '4px',
        background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, #475569 ${((value - min) / (max - min)) * 100}%, #475569 100%)`,
        appearance: 'none',
        cursor: 'pointer',
        outline: 'none',
      }}
    />
  </div>
);

// Premium sound system
const playGameSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const sounds = {
      click: { freq: 600, duration: 0.08, type: 'sine' as OscillatorType, vol: 0.15 },
      success: { freq: 880, duration: 0.15, type: 'sine' as OscillatorType, vol: 0.2 },
      failure: { freq: 220, duration: 0.2, type: 'triangle' as OscillatorType, vol: 0.15 },
      transition: { freq: 440, duration: 0.12, type: 'sine' as OscillatorType, vol: 0.15 },
      complete: { freq: 660, duration: 0.25, type: 'sine' as OscillatorType, vol: 0.2 },
    };

    const s = sounds[type];
    oscillator.frequency.value = s.freq;
    oscillator.type = s.type;
    gainNode.gain.setValueAtTime(s.vol, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + s.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + s.duration);
  } catch {}
};

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
export default function HeliumBalloonCarRenderer({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}: HeliumBalloonCarRendererProps) {
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [testAnswers, setTestAnswers] = useState<Record<number, number>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state
  const [carState, setCarState] = useState<'stopped' | 'accelerating' | 'braking' | 'constant'>('stopped');
  const [balloonAngle, setBalloonAngle] = useState(0); // degrees from vertical
  const [pendulumAngle, setPendulumAngle] = useState(0);
  const [carPosition, setCarPosition] = useState(50);
  const [hasAccelerated, setHasAccelerated] = useState(false);

  // Interactive play phase parameters
  const [carAcceleration, setCarAcceleration] = useState(5); // m/s^2 (0-15)
  const [balloonBuoyancy, setBalloonBuoyancy] = useState(0.8); // relative buoyancy (0.1-2.0)
  const [airDensity, setAirDensity] = useState(1.2); // kg/m^3 (0.5-2.0)
  const [showForceVectors, setShowForceVectors] = useState(true);
  const [showPressureGradient, setShowPressureGradient] = useState(true);
  const [animationTime, setAnimationTime] = useState(0);

  // Twist state - compare with heavy pendulum
  const [twistCarState, setTwistCarState] = useState<'stopped' | 'accelerating'>('stopped');
  const [twistBalloonAngle, setTwistBalloonAngle] = useState(0);
  const [twistPendulumAngle, setTwistPendulumAngle] = useState(0);

  // Twist play phase extended state
  const [twistMode, setTwistMode] = useState<'accelerate' | 'brake' | 'turn_left' | 'turn_right'>('accelerate');
  const [showWaterBucket, setShowWaterBucket] = useState(false);
  const [showWeightComparison, setShowWeightComparison] = useState(false);
  const [twistAnimationTime, setTwistAnimationTime] = useState(0);
  const [bucketAngle, setBucketAngle] = useState(0);
  const [weightAngle, setWeightAngle] = useState(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const goToPhase = (newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;

    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setTimeout(() => { navigationLockRef.current = false; }, 400);

    onPhaseComplete?.();
    playGameSound('transition');
  };

  // Accelerate the car - uses interactive parameters
  const accelerateCar = useCallback(() => {
    if (carState !== 'stopped') return;
    setCarState('accelerating');
    setHasAccelerated(true);

    playGameSound('transition');

    let angle = 0;
    let pos = carPosition;
    let time = 0;

    // Calculate max angle based on acceleration and buoyancy
    // Higher acceleration = more tilt, higher buoyancy = more responsive
    const maxAngle = Math.min(carAcceleration * balloonBuoyancy * 3, 45);
    // Air density affects how quickly the pressure gradient forms
    const angleIncrement = (carAcceleration / 5) * (airDensity / 1.2) * 1.5;

    const interval = setInterval(() => {
      time += 40;
      setAnimationTime(time);

      // Balloon tilts FORWARD (positive angle)
      angle = Math.min(angle + angleIncrement, maxAngle);
      setBalloonAngle(angle);

      // Pendulum tilts BACKWARD (negative angle) - not affected by buoyancy
      setPendulumAngle(-angle / balloonBuoyancy);

      // Car moves - speed based on acceleration
      pos += carAcceleration * 0.4;
      setCarPosition(Math.min(pos, 350));

      if (angle >= maxAngle) {
        setTimeout(() => {
          // Return to neutral
          setCarState('constant');
          let returnAngle = angle;
          const returnInterval = setInterval(() => {
            returnAngle *= 0.9;
            setBalloonAngle(returnAngle);
            setPendulumAngle(-returnAngle / balloonBuoyancy);
            if (Math.abs(returnAngle) < 0.5) {
              setBalloonAngle(0);
              setPendulumAngle(0);
              setAnimationTime(0);
              clearInterval(returnInterval);
            }
          }, 50);
        }, 500);
        clearInterval(interval);
      }
    }, 40);
  }, [carState, carPosition, carAcceleration, balloonBuoyancy, airDensity]);

  const brakeCar = useCallback(() => {
    if (carState !== 'constant') return;
    setCarState('braking');

    playGameSound('click');

    let angle = 0;
    let time = 0;
    const maxAngle = Math.min(carAcceleration * balloonBuoyancy * 2.5, 35);
    const angleIncrement = (carAcceleration / 5) * (airDensity / 1.2) * 1.5;

    const interval = setInterval(() => {
      time += 40;
      setAnimationTime(time);

      // Balloon tilts BACKWARD during braking
      angle = Math.min(angle + angleIncrement, maxAngle);
      setBalloonAngle(-angle);
      setPendulumAngle(angle / balloonBuoyancy);

      if (angle >= maxAngle) {
        setTimeout(() => {
          setCarState('stopped');
          let returnAngle = angle;
          const returnInterval = setInterval(() => {
            returnAngle *= 0.9;
            setBalloonAngle(-returnAngle);
            setPendulumAngle(returnAngle / balloonBuoyancy);
            if (Math.abs(returnAngle) < 0.5) {
              setBalloonAngle(0);
              setPendulumAngle(0);
              setAnimationTime(0);
              clearInterval(returnInterval);
            }
          }, 50);
        }, 500);
        clearInterval(interval);
      }
    }, 40);
  }, [carState, carAcceleration, balloonBuoyancy, airDensity]);

  const resetSimulation = () => {
    setCarState('stopped');
    setBalloonAngle(0);
    setPendulumAngle(0);
    setCarPosition(50);
    setHasAccelerated(false);
  };

  // Twist simulation with extended modes
  const runTwistSimulation = useCallback(() => {
    if (twistCarState !== 'stopped') return;
    setTwistCarState('accelerating');

    playGameSound('transition');

    let angle = 0;
    let bucketAng = 0;
    let weightAng = 0;
    let time = 0;

    const interval = setInterval(() => {
      time += 40;
      setTwistAnimationTime(time);
      angle = Math.min(angle + 1.5, 25);
      bucketAng = Math.min(bucketAng + 1.2, 20);
      weightAng = Math.min(weightAng + 1.8, 30);

      // Direction depends on mode
      switch (twistMode) {
        case 'accelerate':
          // Balloon forward, pendulum backward
          setTwistBalloonAngle(angle);
          setTwistPendulumAngle(-angle);
          setBucketAngle(-bucketAng); // Bucket leans backward
          setWeightAngle(-weightAng); // Weight swings backward
          break;
        case 'brake':
          // Balloon backward, pendulum forward
          setTwistBalloonAngle(-angle);
          setTwistPendulumAngle(angle);
          setBucketAngle(bucketAng);
          setWeightAngle(weightAng);
          break;
        case 'turn_left':
          // Balloon left (into turn), pendulum right (away from turn)
          setTwistBalloonAngle(-angle * 0.8);
          setTwistPendulumAngle(angle * 0.8);
          setBucketAngle(bucketAng);
          setWeightAngle(weightAng);
          break;
        case 'turn_right':
          // Balloon right (into turn), pendulum left
          setTwistBalloonAngle(angle * 0.8);
          setTwistPendulumAngle(-angle * 0.8);
          setBucketAngle(-bucketAng);
          setWeightAngle(-weightAng);
          break;
      }

      if (angle >= 25) {
        clearInterval(interval);
      }
    }, 40);
  }, [twistCarState, twistMode]);

  const resetTwist = useCallback(() => {
    setTwistCarState('stopped');
    setTwistBalloonAngle(0);
    setTwistPendulumAngle(0);
    setBucketAngle(0);
    setWeightAngle(0);
    setTwistAnimationTime(0);
  }, []);

  const handlePrediction = (choice: string) => {
    setPrediction(choice);
    playGameSound('click');
  };

  const handleTwistPrediction = (choice: string) => {
    setTwistPrediction(choice);
    playGameSound('click');
  };

  const handleTestAnswer = (q: number, a: number) => {
    if (!testSubmitted) {
      setTestAnswers(prev => ({ ...prev, [q]: a }));
      playGameSound('click');
    }
  };

  const submitTest = () => {
    setTestSubmitted(true);
    const score = testQuestions.reduce((acc, q, i) => {
      if (testAnswers[i] !== undefined && q.options[testAnswers[i]]?.correct) {
        return acc + 1;
      }
      return acc;
    }, 0);
    if (score >= 7) {
      onCorrectAnswer?.();
      playGameSound('success');
    } else {
      onIncorrectAnswer?.();
      playGameSound('failure');
    }
  };

  const testQuestions = [
    {
      question: "When a car accelerates forward, which way does a helium balloon move?",
      options: [
        { text: "Backward (like everything else)", correct: false },
        { text: "Forward (opposite to everything else)", correct: true },
        { text: "Stays perfectly still", correct: false },
        { text: "Moves side to side", correct: false }
      ],
    },
    {
      question: "Why does the helium balloon behave opposite to a heavy pendulum?",
      options: [
        { text: "Helium is magnetic", correct: false },
        { text: "The string is different", correct: false },
        { text: "Helium is less dense than surrounding air", correct: true },
        { text: "The balloon has more surface area", correct: false }
      ],
    },
    {
      question: "What creates the forward force on the balloon during acceleration?",
      options: [
        { text: "Wind from outside", correct: false },
        { text: "Air pressure gradient inside the car", correct: true },
        { text: "Static electricity", correct: false },
        { text: "The car's heater", correct: false }
      ],
    },
    {
      question: "What physics principle explains why acceleration affects objects like gravity?",
      options: [
        { text: "Newton's First Law", correct: false },
        { text: "Conservation of Energy", correct: false },
        { text: "Einstein's Equivalence Principle", correct: true },
        { text: "Hooke's Law", correct: false }
      ],
    },
    {
      question: "What happens to the balloon when the car brakes (decelerates)?",
      options: [
        { text: "Moves forward even faster", correct: false },
        { text: "Moves backward", correct: true },
        { text: "Stays perfectly still", correct: false },
        { text: "Pops", correct: false }
      ],
    },
    {
      question: "In the car's reference frame, what 'pseudo-force' do objects experience during forward acceleration?",
      options: [
        { text: "A forward force", correct: false },
        { text: "A backward force", correct: true },
        { text: "An upward force", correct: false },
        { text: "No force", correct: false }
      ],
    },
    {
      question: "If you put a bubble in a bottle of water and accelerate forward, which way does the bubble go?",
      options: [
        { text: "Backward (with inertia)", correct: false },
        { text: "Forward (like the helium balloon)", correct: true },
        { text: "Straight up", correct: false },
        { text: "Straight down", correct: false }
      ],
    },
    {
      question: "Why doesn't this balloon effect happen when the car moves at constant speed?",
      options: [
        { text: "Air stops moving", correct: false },
        { text: "No acceleration means no pressure gradient", correct: true },
        { text: "The balloon pops", correct: false },
        { text: "Friction stops it", correct: false }
      ],
    },
    {
      question: "How is the balloon in a car similar to a balloon in an elevator accelerating upward?",
      options: [
        { text: "Both pop from pressure", correct: false },
        { text: "Both rise relative to the car/elevator", correct: false },
        { text: "Both experience enhanced 'gravity' making balloon rise more", correct: true },
        { text: "They behave completely differently", correct: false }
      ],
    },
    {
      question: "What would happen to the helium balloon in a car that's turning left?",
      options: [
        { text: "Moves left (into the turn)", correct: true },
        { text: "Moves right (away from turn)", correct: false },
        { text: "Stays centered", correct: false },
        { text: "Moves backward", correct: false }
      ],
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
              onClick={() => goToPhase('predict')}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                zIndex: 10,
                position: 'relative' as const
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
                  onClick={() => handlePrediction(opt.id)}
                  style={{
                    padding: '1rem',
                    background: prediction === opt.id ? '#3b82f6' : 'white',
                    color: prediction === opt.id ? 'white' : '#1e293b',
                    border: `2px solid ${prediction === opt.id ? '#3b82f6' : '#e2e8f0'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    zIndex: 10,
                    position: 'relative' as const
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            {prediction && (
              <button
                onClick={() => goToPhase('play')}
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                  zIndex: 10,
                  position: 'relative' as const
                }}
              >
                Test It!
              </button>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // PLAY - Enhanced with interactive sliders
      // ───────────────────────────────────────────────────
      case 'play':
        // Calculate balloon size based on buoyancy
        const balloonSize = 14 + (balloonBuoyancy - 0.8) * 10;
        // Calculate pressure gradient intensity
        const pressureIntensity = (carState === 'accelerating' || carState === 'braking')
          ? Math.min(carAcceleration * airDensity / 6, 1) : 0;
        // Force vector magnitudes
        const buoyancyForce = carAcceleration * balloonBuoyancy * airDensity;
        const inertiaForce = carAcceleration * (1 / balloonBuoyancy);

        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#e2e8f0' }}>
              Balloon vs Pendulum Simulator
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1rem', textAlign: 'center' }}>
              Adjust parameters and watch the physics in action
            </p>

            {/* Interactive Sliders Panel */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
              gap: '1rem',
              width: '100%',
              maxWidth: 600,
              marginBottom: '1rem',
              padding: '1rem',
              background: 'rgba(30, 41, 59, 0.6)',
              borderRadius: 12,
              border: '1px solid rgba(71, 85, 105, 0.5)'
            }}>
              <Slider
                label="Car Acceleration"
                value={carAcceleration}
                min={1}
                max={15}
                step={0.5}
                unit="m/s²"
                onChange={setCarAcceleration}
                color="#22c55e"
              />
              <Slider
                label="Balloon Buoyancy"
                value={balloonBuoyancy}
                min={0.2}
                max={2.0}
                step={0.1}
                unit="x"
                onChange={setBalloonBuoyancy}
                color="#a855f7"
              />
              <Slider
                label="Air Density"
                value={airDensity}
                min={0.5}
                max={2.0}
                step={0.1}
                unit="kg/m³"
                onChange={setAirDensity}
                color="#3b82f6"
              />
            </div>

            {/* Toggle buttons for visualization options */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => setShowForceVectors(!showForceVectors)}
                style={{
                  padding: '0.5rem 1rem',
                  background: showForceVectors ? 'rgba(34, 197, 94, 0.2)' : 'rgba(71, 85, 105, 0.3)',
                  color: showForceVectors ? '#22c55e' : '#94a3b8',
                  border: `1px solid ${showForceVectors ? '#22c55e' : '#475569'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  zIndex: 10,
                  position: 'relative'
                }}
              >
                {showForceVectors ? '✓' : '○'} Force Vectors
              </button>
              <button
                onClick={() => setShowPressureGradient(!showPressureGradient)}
                style={{
                  padding: '0.5rem 1rem',
                  background: showPressureGradient ? 'rgba(59, 130, 246, 0.2)' : 'rgba(71, 85, 105, 0.3)',
                  color: showPressureGradient ? '#3b82f6' : '#94a3b8',
                  border: `1px solid ${showPressureGradient ? '#3b82f6' : '#475569'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  zIndex: 10,
                  position: 'relative'
                }}
              >
                {showPressureGradient ? '✓' : '○'} Pressure Gradient
              </button>
            </div>

            <svg viewBox="0 0 450 280" style={{ width: '100%', maxWidth: 500, marginBottom: '1rem' }}>
              {/* Definitions for gradients and markers */}
              <defs>
                <linearGradient id="pressureGradPlay" x1="100%" y1="0%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={pressureIntensity * 0.6} />
                  <stop offset="50%" stopColor="#fbbf24" stopOpacity={pressureIntensity * 0.3} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={pressureIntensity * 0.6} />
                </linearGradient>
                <marker id="arrowGreen" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
                </marker>
                <marker id="arrowRed" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                </marker>
                <marker id="arrowPurple" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#a855f7" />
                </marker>
                <marker id="arrowBlue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                </marker>
              </defs>

              {/* Road */}
              <rect x="0" y="230" width="450" height="50" fill="#334155" />
              <line x1="0" y1="255" x2="450" y2="255" stroke="#fbbf24" strokeWidth="3" strokeDasharray="20,10" />

              {/* Status display */}
              <text x="225" y="25" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="bold">
                {carState === 'stopped' && 'Ready - Press Accelerate'}
                {carState === 'accelerating' && `ACCELERATING at ${carAcceleration.toFixed(1)} m/s²`}
                {carState === 'constant' && 'Constant Speed - Press Brake'}
                {carState === 'braking' && `BRAKING at ${carAcceleration.toFixed(1)} m/s²`}
              </text>

              {/* Car body - animated position */}
              <g transform={`translate(${Math.min(carPosition, 200)}, 0)`}>
                {/* Car shell */}
                <rect x="30" y="140" width="200" height="70" fill="#3b82f6" rx="10" />
                <rect x="50" y="105" width="160" height="50" fill="#1d4ed8" rx="8" />

                {/* Windows with pressure gradient visualization */}
                <rect x="60" y="112" width="60" height="38" fill="#93c5fd" rx="5" />
                <rect x="130" y="112" width="70" height="38" fill="#93c5fd" rx="5" />

                {/* Pressure gradient overlay inside car */}
                {showPressureGradient && (carState === 'accelerating' || carState === 'braking') && (
                  <rect
                    x="55" y="107"
                    width="150" height="48"
                    fill={carState === 'accelerating' ? 'url(#pressureGradPlay)' : 'url(#pressureGradPlay)'}
                    rx="5"
                    style={{ transform: carState === 'braking' ? 'scaleX(-1)' : 'none', transformOrigin: '130px 131px' }}
                  />
                )}

                {/* Pressure labels */}
                {showPressureGradient && (carState === 'accelerating' || carState === 'braking') && (
                  <>
                    <text
                      x={carState === 'accelerating' ? 70 : 185}
                      y="100"
                      fill="#22c55e"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      LOW P
                    </text>
                    <text
                      x={carState === 'accelerating' ? 175 : 75}
                      y="100"
                      fill="#ef4444"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      HIGH P
                    </text>
                  </>
                )}

                {/* Interior ceiling line */}
                <line x1="55" y1="110" x2="205" y2="110" stroke="#1e40af" strokeWidth="2" />

                {/* Helium Balloon - dynamic size and tilt */}
                <g transform={`rotate(${balloonAngle}, 100, 150)`}>
                  <line x1="100" y1="150" x2="100" y2={150 - 25 - balloonSize} stroke="#94a3b8" strokeWidth="1.5" />
                  <ellipse
                    cx="100"
                    cy={150 - 30 - balloonSize}
                    rx={balloonSize}
                    ry={balloonSize * 1.15}
                    fill="#a855f7"
                    opacity="0.85"
                  >
                    {/* Pulsing animation when accelerating */}
                    {(carState === 'accelerating' || carState === 'braking') && (
                      <animate attributeName="opacity" values="0.85;0.95;0.85" dur="0.5s" repeatCount="indefinite" />
                    )}
                  </ellipse>
                  <text x="100" y={150 - 27 - balloonSize} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">He</text>

                  {/* Force vectors on balloon */}
                  {showForceVectors && (carState === 'accelerating' || carState === 'braking') && (
                    <>
                      {/* Buoyancy force - forward during acceleration */}
                      <line
                        x1="100"
                        y1={150 - 30 - balloonSize}
                        x2={100 + (carState === 'accelerating' ? buoyancyForce * 2 : -buoyancyForce * 2)}
                        y2={150 - 30 - balloonSize}
                        stroke="#22c55e"
                        strokeWidth="3"
                        markerEnd="url(#arrowGreen)"
                      />
                      <text
                        x={100 + (carState === 'accelerating' ? buoyancyForce * 2 + 5 : -buoyancyForce * 2 - 25)}
                        y={150 - 35 - balloonSize}
                        fill="#22c55e"
                        fontSize="7"
                      >
                        Fbuoy
                      </text>
                    </>
                  )}
                </g>

                {/* Pendulum - tilts opposite direction */}
                <g transform={`rotate(${pendulumAngle}, 160, 110)`}>
                  <line x1="160" y1="110" x2="160" y2="145" stroke="#64748b" strokeWidth="2.5" />
                  <circle cx="160" cy="150" r="10" fill="#ef4444" />

                  {/* Force vectors on pendulum */}
                  {showForceVectors && (carState === 'accelerating' || carState === 'braking') && (
                    <>
                      {/* Inertia force - backward during acceleration */}
                      <line
                        x1="160"
                        y1="150"
                        x2={160 + (carState === 'accelerating' ? -inertiaForce * 1.5 : inertiaForce * 1.5)}
                        y2="150"
                        stroke="#ef4444"
                        strokeWidth="3"
                        markerEnd="url(#arrowRed)"
                      />
                      <text
                        x={160 + (carState === 'accelerating' ? -inertiaForce * 1.5 - 25 : inertiaForce * 1.5 + 5)}
                        y="145"
                        fill="#ef4444"
                        fontSize="7"
                      >
                        Finertia
                      </text>
                    </>
                  )}
                </g>

                {/* Labels */}
                <text x="100" y="175" textAnchor="middle" fill="white" fontSize="9">Balloon</text>
                <text x="160" y="175" textAnchor="middle" fill="white" fontSize="9">Weight</text>

                {/* Wheels with rotation animation */}
                <g>
                  <circle cx="75" cy="210" r="22" fill="#1e293b" />
                  <circle cx="75" cy="210" r="10" fill="#64748b" />
                  {carState !== 'stopped' && (
                    <line x1="75" y1="195" x2="75" y2="225" stroke="#94a3b8" strokeWidth="2">
                      <animateTransform attributeName="transform" type="rotate" from="0 75 210" to="360 75 210" dur="0.5s" repeatCount="indefinite" />
                    </line>
                  )}
                </g>
                <g>
                  <circle cx="185" cy="210" r="22" fill="#1e293b" />
                  <circle cx="185" cy="210" r="10" fill="#64748b" />
                  {carState !== 'stopped' && (
                    <line x1="185" y1="195" x2="185" y2="225" stroke="#94a3b8" strokeWidth="2">
                      <animateTransform attributeName="transform" type="rotate" from="0 185 210" to="360 185 210" dur="0.5s" repeatCount="indefinite" />
                    </line>
                  )}
                </g>

                {/* Direction indicator arrow */}
                {carState === 'accelerating' && (
                  <g>
                    <path d="M 230,140 L 260,140" stroke="#22c55e" strokeWidth="4" markerEnd="url(#arrowGreen)">
                      <animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite" />
                    </path>
                  </g>
                )}
                {carState === 'braking' && (
                  <g>
                    <path d="M 30,140 L 0,140" stroke="#ef4444" strokeWidth="4" markerEnd="url(#arrowRed)">
                      <animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite" />
                    </path>
                  </g>
                )}
              </g>

              {/* Result highlight */}
              {hasAccelerated && carState !== 'accelerating' && carState !== 'braking' && (
                <g>
                  <rect x="100" y="40" width="250" height="30" fill="rgba(34, 197, 94, 0.1)" rx="6" />
                  <text x="225" y="60" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">
                    Balloon: {balloonAngle > 0 ? 'FORWARD' : 'BACKWARD'} | Pendulum: {pendulumAngle > 0 ? 'FORWARD' : 'BACKWARD'}
                  </text>
                </g>
              )}

              {/* Physics info box */}
              <g transform="translate(320, 75)">
                <rect x="0" y="0" width="120" height="80" fill="rgba(30, 41, 59, 0.8)" rx="8" stroke="#475569" />
                <text x="60" y="18" textAnchor="middle" fill="#e2e8f0" fontSize="9" fontWeight="bold">Live Physics</text>
                <text x="10" y="35" fill="#94a3b8" fontSize="8">Accel: {carAcceleration.toFixed(1)} m/s²</text>
                <text x="10" y="48" fill="#a855f7" fontSize="8">Buoyancy: {balloonBuoyancy.toFixed(1)}x</text>
                <text x="10" y="61" fill="#3b82f6" fontSize="8">Air: {airDensity.toFixed(1)} kg/m³</text>
                <text x="10" y="74" fill="#22c55e" fontSize="8">Tilt: {Math.abs(balloonAngle).toFixed(1)}°</text>
              </g>
            </svg>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={accelerateCar}
                disabled={carState !== 'stopped'}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: carState !== 'stopped'
                    ? '#475569'
                    : 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: carState !== 'stopped' ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  zIndex: 10,
                  position: 'relative'
                }}
              >
                Accelerate
              </button>

              {carState === 'constant' && (
                <button
                  onClick={brakeCar}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600,
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  Brake
                </button>
              )}

              {(carState === 'stopped' && hasAccelerated) && (
                <button
                  onClick={resetSimulation}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #64748b, #475569)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600,
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  Reset
                </button>
              )}
            </div>

            {hasAccelerated && carState === 'stopped' && (
              <button
                onClick={() => {
                  setShowResult(true);
                  if (prediction === 'b') {
                    onCorrectAnswer?.();
                  } else {
                    onIncorrectAnswer?.();
                  }
                }}
                style={{
                  padding: '1rem 2rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                  zIndex: 10,
                  position: 'relative'
                }}
              >
                See Results
              </button>
            )}

            {showResult && (
              <div style={{
                marginTop: '1rem',
                padding: '1.25rem',
                background: prediction === 'b' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                borderRadius: 12,
                textAlign: 'center',
                maxWidth: 450,
                border: `1px solid ${prediction === 'b' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`
              }}>
                <p style={{ fontWeight: 600, color: prediction === 'b' ? '#22c55e' : '#fbbf24', fontSize: '1.1rem' }}>
                  {prediction === 'b' ? 'Correct!' : 'Surprising, right?'}
                </p>
                <p style={{ color: '#e2e8f0', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  The balloon moves <strong style={{ color: '#22c55e' }}>forward</strong> - opposite to the pendulum!
                  This happens because helium is less dense than air. When air is pushed
                  backward during acceleration, the balloon moves to fill the low-pressure
                  region at the front.
                </p>
                <button
                  onClick={() => goToPhase('review')}
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 2rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600,
                    zIndex: 10,
                    position: 'relative'
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
              onClick={() => goToPhase('twist_predict')}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600,
                zIndex: 10,
                position: 'relative' as const
              }}
            >
              Try a Twist!
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
                  onClick={() => handleTwistPrediction(opt.id)}
                  style={{
                    padding: '1rem',
                    background: twistPrediction === opt.id ? '#f59e0b' : 'white',
                    color: twistPrediction === opt.id ? 'white' : '#1e293b',
                    border: `2px solid ${twistPrediction === opt.id ? '#f59e0b' : '#e2e8f0'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 500,
                    zIndex: 10,
                    position: 'relative' as const
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            {twistPrediction && (
              <button
                onClick={() => goToPhase('twist_play')}
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem 2.5rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                  zIndex: 10,
                  position: 'relative' as const
                }}
              >
                Test It!
              </button>
            )}
          </div>
        );

      // ───────────────────────────────────────────────────
      // TWIST PLAY - Enhanced with comparisons
      // ───────────────────────────────────────────────────
      case 'twist_play':
        const getModeLabel = () => {
          switch (twistMode) {
            case 'accelerate': return 'ACCELERATING FORWARD';
            case 'brake': return 'BRAKING';
            case 'turn_left': return 'TURNING LEFT';
            case 'turn_right': return 'TURNING RIGHT';
          }
        };

        const getModeColor = () => {
          switch (twistMode) {
            case 'accelerate': return '#22c55e';
            case 'brake': return '#ef4444';
            case 'turn_left': return '#3b82f6';
            case 'turn_right': return '#f59e0b';
          }
        };

        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#e2e8f0' }}>
              Extended Comparison Lab
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1rem', textAlign: 'center' }}>
              Compare balloon behavior with other objects in different scenarios
            </p>

            {/* Mode selector buttons */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              {(['accelerate', 'brake', 'turn_left', 'turn_right'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setTwistMode(mode);
                    resetTwist();
                    playGameSound('click');
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: twistMode === mode
                      ? mode === 'accelerate' ? 'rgba(34, 197, 94, 0.2)'
                      : mode === 'brake' ? 'rgba(239, 68, 68, 0.2)'
                      : mode === 'turn_left' ? 'rgba(59, 130, 246, 0.2)'
                      : 'rgba(245, 158, 11, 0.2)'
                      : 'rgba(71, 85, 105, 0.3)',
                    color: twistMode === mode
                      ? mode === 'accelerate' ? '#22c55e'
                      : mode === 'brake' ? '#ef4444'
                      : mode === 'turn_left' ? '#3b82f6'
                      : '#f59e0b'
                      : '#94a3b8',
                    border: `1px solid ${twistMode === mode
                      ? mode === 'accelerate' ? '#22c55e'
                      : mode === 'brake' ? '#ef4444'
                      : mode === 'turn_left' ? '#3b82f6'
                      : '#f59e0b'
                      : '#475569'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  {mode === 'accelerate' && 'Accelerate'}
                  {mode === 'brake' && 'Brake'}
                  {mode === 'turn_left' && 'Turn Left'}
                  {mode === 'turn_right' && 'Turn Right'}
                </button>
              ))}
            </div>

            {/* Comparison toggle buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => setShowWaterBucket(!showWaterBucket)}
                style={{
                  padding: '0.5rem 1rem',
                  background: showWaterBucket ? 'rgba(59, 130, 246, 0.2)' : 'rgba(71, 85, 105, 0.3)',
                  color: showWaterBucket ? '#3b82f6' : '#94a3b8',
                  border: `1px solid ${showWaterBucket ? '#3b82f6' : '#475569'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  zIndex: 10,
                  position: 'relative'
                }}
              >
                {showWaterBucket ? '✓' : '○'} Water Bucket
              </button>
              <button
                onClick={() => setShowWeightComparison(!showWeightComparison)}
                style={{
                  padding: '0.5rem 1rem',
                  background: showWeightComparison ? 'rgba(239, 68, 68, 0.2)' : 'rgba(71, 85, 105, 0.3)',
                  color: showWeightComparison ? '#ef4444' : '#94a3b8',
                  border: `1px solid ${showWeightComparison ? '#ef4444' : '#475569'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  zIndex: 10,
                  position: 'relative'
                }}
              >
                {showWeightComparison ? '✓' : '○'} Heavy Weight
              </button>
            </div>

            <svg viewBox="0 0 500 320" style={{ width: '100%', maxWidth: 550, marginBottom: '1rem' }}>
              <defs>
                <marker id="twistArrowGreen" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
                </marker>
                <marker id="twistArrowRed" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                </marker>
              </defs>

              {/* Status display */}
              <text x="250" y="25" textAnchor="middle" fill={getModeColor()} fontSize="14" fontWeight="bold">
                {twistCarState === 'stopped' ? `Ready - ${getModeLabel()}` : getModeLabel()}
              </text>

              {/* Car interior - top view for turning */}
              {(twistMode === 'turn_left' || twistMode === 'turn_right') ? (
                // Top-down view for turning
                <g transform="translate(50, 50)">
                  <rect x="0" y="0" width="400" height="180" fill="#334155" rx="10" stroke="#475569" />
                  <text x="200" y="20" textAnchor="middle" fill="#94a3b8" fontSize="10">TOP VIEW</text>

                  {/* Car outline from top */}
                  <rect x="150" y="50" width="100" height="120" fill="#1d4ed8" rx="8" stroke="#3b82f6" />

                  {/* Balloon from top - moves into turn */}
                  <circle
                    cx={200 + (twistMode === 'turn_left' ? -twistBalloonAngle : twistBalloonAngle)}
                    cy={90}
                    r="18"
                    fill="#a855f7"
                    opacity="0.85"
                  >
                    {twistCarState === 'accelerating' && (
                      <animate attributeName="opacity" values="0.85;0.95;0.85" dur="0.5s" repeatCount="indefinite" />
                    )}
                  </circle>
                  <text
                    x={200 + (twistMode === 'turn_left' ? -twistBalloonAngle : twistBalloonAngle)}
                    y="94"
                    textAnchor="middle"
                    fill="white"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    He
                  </text>

                  {/* Heavy pendulum from top - swings away from turn */}
                  <circle
                    cx={200 + (twistMode === 'turn_left' ? twistPendulumAngle * 0.8 : -twistPendulumAngle * 0.8)}
                    cy={140}
                    r="12"
                    fill="#ef4444"
                  />

                  {/* Turn direction indicator */}
                  <g transform={`translate(${twistMode === 'turn_left' ? 50 : 350}, 110)`}>
                    <path
                      d={twistMode === 'turn_left'
                        ? "M 0,0 A 30,30 0 0,0 -25,-25"
                        : "M 0,0 A 30,30 0 0,1 25,-25"}
                      fill="none"
                      stroke={getModeColor()}
                      strokeWidth="3"
                    />
                    <text x={twistMode === 'turn_left' ? -35 : 35} y="-15" fill={getModeColor()} fontSize="10" fontWeight="bold">
                      TURN
                    </text>
                  </g>

                  {/* Labels */}
                  <text x={200 + (twistMode === 'turn_left' ? -30 : 30)} y="70" fill="#a855f7" fontSize="9">
                    Balloon moves {twistMode === 'turn_left' ? 'LEFT' : 'RIGHT'}
                  </text>
                  <text x={200 + (twistMode === 'turn_left' ? 30 : -30)} y="165" fill="#ef4444" fontSize="9">
                    Weight swings {twistMode === 'turn_left' ? 'RIGHT' : 'LEFT'}
                  </text>
                </g>
              ) : (
                // Side view for accelerate/brake
                <g transform="translate(25, 45)">
                  <rect x="0" y="0" width="450" height="160" fill="#334155" rx="10" stroke="#475569" />

                  {/* Sections */}
                  {/* Left: Helium balloon */}
                  <g transform="translate(30, 15)">
                    <text x="50" y="12" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="bold">
                      Balloon
                    </text>
                    <rect x="10" y="22" width="80" height="90" fill="rgba(30, 64, 175, 0.3)" rx="5" />

                    <g transform={`rotate(${twistBalloonAngle}, 50, 100)`}>
                      <line x1="50" y1="100" x2="50" y2="60" stroke="#94a3b8" strokeWidth="1.5" />
                      <ellipse cx="50" cy="45" rx="16" ry="18" fill="#a855f7" opacity="0.9">
                        {twistCarState === 'accelerating' && (
                          <animate attributeName="opacity" values="0.9;1;0.9" dur="0.5s" repeatCount="indefinite" />
                        )}
                      </ellipse>
                      <text x="50" y="49" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">He</text>
                    </g>
                    <text x="50" y="130" textAnchor="middle" fill="#a855f7" fontSize="9">
                      {twistBalloonAngle > 0 ? 'Forward' : twistBalloonAngle < 0 ? 'Backward' : 'Neutral'}
                    </text>
                  </g>

                  {/* Middle: Water bottle with bubble */}
                  <g transform="translate(150, 15)">
                    <text x="50" y="12" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="bold">
                      Bubble in Water
                    </text>
                    <rect x="15" y="25" width="70" height="85" fill="#3b82f6" rx="5" />
                    <rect x="30" y="18" width="40" height="12" fill="#64748b" rx="3" />

                    {/* Bubble moves same direction as balloon */}
                    <ellipse
                      cx={50 + twistBalloonAngle * 0.7}
                      cy={60}
                      rx="14"
                      ry="12"
                      fill="white"
                      opacity="0.9"
                    >
                      {twistCarState === 'accelerating' && (
                        <animate attributeName="opacity" values="0.9;1;0.9" dur="0.5s" repeatCount="indefinite" />
                      )}
                    </ellipse>
                    <text x="50" y="130" textAnchor="middle" fill="#3b82f6" fontSize="9">
                      {twistBalloonAngle > 0 ? 'Forward' : twistBalloonAngle < 0 ? 'Backward' : 'Neutral'}
                    </text>
                  </g>

                  {/* Water bucket on string (optional) */}
                  {showWaterBucket && (
                    <g transform="translate(270, 15)">
                      <text x="40" y="12" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="bold">
                        Water Bucket
                      </text>

                      <g transform={`rotate(${bucketAngle}, 40, 25)`}>
                        <line x1="40" y1="25" x2="40" y2="75" stroke="#94a3b8" strokeWidth="2" />
                        {/* Bucket shape */}
                        <path d="M 25,75 L 25,100 L 55,100 L 55,75 Z" fill="#64748b" />
                        {/* Water inside - sloshes opposite to bucket tilt */}
                        <path
                          d={`M 27,${80 - bucketAngle * 0.3} L 53,${80 + bucketAngle * 0.3} L 53,97 L 27,97 Z`}
                          fill="#3b82f6"
                          opacity="0.8"
                        />
                      </g>
                      <text x="40" y="130" textAnchor="middle" fill="#64748b" fontSize="9">
                        {bucketAngle > 0 ? 'Forward' : bucketAngle < 0 ? 'Backward' : 'Neutral'}
                      </text>
                    </g>
                  )}

                  {/* Heavy weight pendulum (optional) */}
                  {showWeightComparison && (
                    <g transform={`translate(${showWaterBucket ? 370 : 300}, 15)`}>
                      <text x="40" y="12" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="bold">
                        Heavy Weight
                      </text>

                      <g transform={`rotate(${weightAngle}, 40, 25)`}>
                        <line x1="40" y1="25" x2="40" y2="80" stroke="#64748b" strokeWidth="2" />
                        <circle cx="40" cy="90" r="15" fill="#ef4444" />
                        <text x="40" y="94" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">5kg</text>
                      </g>
                      <text x="40" y="130" textAnchor="middle" fill="#ef4444" fontSize="9">
                        {weightAngle > 0 ? 'Forward' : weightAngle < 0 ? 'Backward' : 'Neutral'}
                      </text>
                    </g>
                  )}
                </g>
              )}

              {/* Direction indicator */}
              <g transform="translate(175, 240)">
                {twistMode === 'accelerate' && (
                  <>
                    <path d="M 0,15 L 80,15" stroke="#22c55e" strokeWidth="4" markerEnd="url(#twistArrowGreen)">
                      {twistCarState === 'accelerating' && (
                        <animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite" />
                      )}
                    </path>
                    <text x="40" y="40" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="bold">
                      ACCELERATE
                    </text>
                  </>
                )}
                {twistMode === 'brake' && (
                  <>
                    <path d="M 80,15 L 0,15" stroke="#ef4444" strokeWidth="4" markerEnd="url(#twistArrowRed)">
                      {twistCarState === 'accelerating' && (
                        <animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite" />
                      )}
                    </path>
                    <text x="40" y="40" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="bold">
                      BRAKING
                    </text>
                  </>
                )}
              </g>

              {/* Result message */}
              {twistCarState === 'accelerating' && Math.abs(twistBalloonAngle) > 20 && (
                <g>
                  <rect x="125" y="270" width="250" height="35" fill="rgba(34, 197, 94, 0.15)" rx="8" stroke="rgba(34, 197, 94, 0.3)" />
                  <text x="250" y="292" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">
                    Balloon & Bubble: OPPOSITE to Weight!
                  </text>
                </g>
              )}

              {/* Physics explanation box */}
              <g transform="translate(350, 240)">
                <rect x="0" y="0" width="140" height="70" fill="rgba(30, 41, 59, 0.9)" rx="8" stroke="#475569" />
                <text x="70" y="18" textAnchor="middle" fill="#e2e8f0" fontSize="9" fontWeight="bold">Key Insight</text>
                <text x="10" y="35" fill="#a855f7" fontSize="8">Less dense: moves INTO accel</text>
                <text x="10" y="50" fill="#ef4444" fontSize="8">More dense: moves AWAY</text>
                <text x="10" y="65" fill="#94a3b8" fontSize="7">Same physics, opposite motion!</text>
              </g>
            </svg>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={runTwistSimulation}
                disabled={twistCarState !== 'stopped'}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: twistCarState !== 'stopped'
                    ? '#475569'
                    : `linear-gradient(135deg, ${getModeColor()}, ${getModeColor()}dd)`,
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: twistCarState !== 'stopped' ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  zIndex: 10,
                  position: 'relative'
                }}
              >
                {twistMode === 'accelerate' && 'Accelerate'}
                {twistMode === 'brake' && 'Brake'}
                {twistMode === 'turn_left' && 'Turn Left'}
                {twistMode === 'turn_right' && 'Turn Right'}
              </button>

              <button
                onClick={resetTwist}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #64748b, #475569)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 600,
                  zIndex: 10,
                  position: 'relative'
                }}
              >
                Reset
              </button>
            </div>

            {twistCarState === 'accelerating' && Math.abs(twistBalloonAngle) > 20 && (
              <button
                onClick={() => {
                  setShowTwistResult(true);
                  if (twistPrediction === 'b') {
                    onCorrectAnswer?.();
                  } else {
                    onIncorrectAnswer?.();
                  }
                }}
                style={{
                  padding: '1rem 2rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                  zIndex: 10,
                  position: 'relative'
                }}
              >
                See Results
              </button>
            )}

            {showTwistResult && (
              <div style={{
                marginTop: '1rem',
                padding: '1.25rem',
                background: twistPrediction === 'b' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                borderRadius: 12,
                textAlign: 'center',
                maxWidth: 450,
                border: `1px solid ${twistPrediction === 'b' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`
              }}>
                <p style={{ fontWeight: 600, color: twistPrediction === 'b' ? '#22c55e' : '#fbbf24', fontSize: '1.1rem' }}>
                  {twistPrediction === 'b' ? 'Correct!' : 'Same physics everywhere!'}
                </p>
                <p style={{ color: '#e2e8f0', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  The bubble moves the <strong style={{ color: '#22c55e' }}>same direction as the balloon</strong> - both are less dense than their surroundings.
                  Heavy objects (weight, water bucket) swing the opposite way due to inertia.
                  {twistMode.includes('turn') && ' In turns, the balloon moves INTO the turn while weights swing OUT!'}
                </p>
                <button
                  onClick={() => goToPhase('twist_review')}
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 2rem',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600,
                    zIndex: 10,
                    position: 'relative'
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
              onClick={() => goToPhase('transfer')}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600,
                zIndex: 10,
                position: 'relative' as const
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
                  onClick={() => {
                    setCompletedApps(prev => new Set([...prev, index]));
                    playGameSound('click');
                  }}
                  style={{
                    background: completedApps.has(index)
                      ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)'
                      : 'white',
                    borderRadius: 12,
                    padding: '1rem',
                    cursor: 'pointer',
                    border: `2px solid ${completedApps.has(index) ? '#22c55e' : '#e2e8f0'}`,
                    transition: 'all 0.2s',
                    zIndex: 10,
                    position: 'relative' as const
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{app.icon}</div>
                  <h3 style={{ color: '#1e293b', fontSize: '1rem', marginBottom: '0.25rem' }}>
                    {app.title}
                    {completedApps.has(index) && ' '}
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
                onClick={() => goToPhase('test')}
                style={{
                  padding: '1rem 2.5rem',
                  fontSize: '1.1rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                  zIndex: 10,
                  position: 'relative' as const
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
        const score = testQuestions.reduce((acc, q, i) => {
          if (testAnswers[i] !== undefined && q.options[testAnswers[i]]?.correct) {
            return acc + 1;
          }
          return acc;
        }, 0);

        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>
              Acceleration Buoyancy Mastery Test
            </h2>

            <div style={{ width: '100%', maxWidth: 600 }}>
              {testQuestions.map((tq, qi) => {
                const isCorrect = tq.options[testAnswers[qi]]?.correct;
                return (
                <div
                  key={qi}
                  style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: `2px solid ${
                      testSubmitted
                        ? isCorrect
                          ? '#22c55e'
                          : testAnswers[qi] !== undefined
                          ? '#ef4444'
                          : '#e2e8f0'
                        : '#e2e8f0'
                    }`
                  }}
                >
                  <p style={{ fontWeight: 600, color: '#1e293b', marginBottom: '0.75rem' }}>
                    {qi + 1}. {tq.question}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {tq.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() => handleTestAnswer(qi, oi)}
                        disabled={testSubmitted}
                        style={{
                          padding: '0.6rem 1rem',
                          textAlign: 'left',
                          background: testSubmitted
                            ? opt.correct
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
                              ? opt.correct
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
                          fontSize: '0.9rem',
                          zIndex: 10,
                          position: 'relative' as const
                        }}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                </div>
              )})}
            </div>

            {!testSubmitted ? (
              <button
                onClick={submitTest}
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
                  fontWeight: 600,
                  zIndex: 10,
                  position: 'relative' as const
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
                  onClick={() => goToPhase('mastery')}
                  style={{
                    padding: '1rem 2.5rem',
                    fontSize: '1.1rem',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    cursor: 'pointer',
                    fontWeight: 600,
                    zIndex: 10,
                    position: 'relative' as const
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
        const finalScore = testQuestions.reduce((acc, q, i) => {
          if (testAnswers[i] !== undefined && q.options[testAnswers[i]]?.correct) {
            return acc + 1;
          }
          return acc;
        }, 0);

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
              onClick={() => {
                onPhaseComplete?.();
                playGameSound('complete');
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
                fontWeight: 600,
                zIndex: 10,
                position: 'relative' as const
              }}
            >
              Complete Lesson
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const currentIndex = phaseOrder.indexOf(phase);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />

      {/* Ambient glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/3 rounded-full blur-3xl" />

      {/* Fixed header with phase navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                <span className="text-lg">🎈</span>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white">Helium Balloon Car</h1>
                <p className="text-xs text-slate-400">Acceleration Buoyancy</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {phaseOrder.map((p, i) => (
                <div
                  key={p}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentIndex
                      ? 'w-6 bg-gradient-to-r from-purple-400 to-blue-400'
                      : i < currentIndex
                      ? 'w-2 bg-purple-500'
                      : 'w-2 bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="relative z-10 pt-20 pb-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 md:p-8">
            {renderPhase()}
          </div>
        </div>
      </div>
    </div>
  );
}
