import React, { useState, useRef, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────
// SpeedOfSoundRenderer – Measure the speed of sound
// ─────────────────────────────────────────────────────────────
// Physics: v = d/t, speed of sound ≈ 343 m/s at 20°C
// Temperature dependence: v ≈ 331 + 0.6T (m/s)
// Methods: echo timing, two microphones, resonance tube

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

interface SpeedOfSoundRendererProps {
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

const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const soundConfig = {
      click: { frequency: 440, duration: 0.1, oscType: 'sine' as OscillatorType, volume: 0.2 },
      success: { frequency: 600, duration: 0.15, oscType: 'sine' as OscillatorType, volume: 0.3 },
      failure: { frequency: 200, duration: 0.2, oscType: 'sawtooth' as OscillatorType, volume: 0.3 },
      transition: { frequency: 520, duration: 0.15, oscType: 'sine' as OscillatorType, volume: 0.2 },
      complete: { frequency: 800, duration: 0.3, oscType: 'sine' as OscillatorType, volume: 0.3 },
    };

    const config = soundConfig[type];
    oscillator.frequency.value = config.frequency;
    oscillator.type = config.oscType;
    gainNode.gain.setValueAtTime(config.volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + config.duration);
  } catch {}
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function SpeedOfSoundRenderer({ onGameEvent }: SpeedOfSoundRendererProps) {
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

  // Simulation state - echo method
  const [distance, setDistance] = useState(170); // meters to wall (340m round trip)
  const [soundWavePos, setSoundWavePos] = useState(-1);
  const [echoWavePos, setEchoWavePos] = useState(-1);
  const [measuring, setMeasuring] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [calculatedSpeed, setCalculatedSpeed] = useState(0);
  const [hasMeasured, setHasMeasured] = useState(false);

  // Twist - temperature effect
  const [temperature, setTemperature] = useState(20); // °C
  const [twistMeasuring, setTwistMeasuring] = useState(false);
  const [twistTime, setTwistTime] = useState(0);
  const [twistSpeed, setTwistSpeed] = useState(0);

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
    playSound('transition');
  };

  // Speed of sound at temperature (simplified formula)
  const speedAtTemp = (temp: number) => 331 + 0.6 * temp;

  // Simulate echo measurement
  const makeSound = () => {
    if (measuring) return;
    setMeasuring(true);
    setHasMeasured(true);
    setSoundWavePos(0);
    setEchoWavePos(-1);
    setElapsedTime(0);

    playSound('click');

    const actualSpeed = speedAtTemp(20); // 343 m/s at 20°C
    const roundTripDistance = distance * 2;
    const totalTime = roundTripDistance / actualSpeed;

    // Animation: sound wave travels to wall
    const startTime = Date.now();
    const waveToWall = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setElapsedTime(elapsed);

      const progress = elapsed / totalTime;
      if (progress < 0.5) {
        setSoundWavePos(progress * 2 * 100);
      } else {
        setSoundWavePos(-1);
        setEchoWavePos(100 - (progress - 0.5) * 2 * 100);
      }

      if (elapsed >= totalTime) {
        clearInterval(waveToWall);
        setSoundWavePos(-1);
        setEchoWavePos(-1);
        setElapsedTime(totalTime);
        setCalculatedSpeed(roundTripDistance / totalTime);
        setMeasuring(false);
        playSound('success');
      }
    }, 30);
  };

  const resetMeasurement = () => {
    setSoundWavePos(-1);
    setEchoWavePos(-1);
    setElapsedTime(0);
    setCalculatedSpeed(0);
    setHasMeasured(false);
    setMeasuring(false);
  };

  // Twist simulation - temperature effect
  const measureTwist = () => {
    if (twistMeasuring) return;
    setTwistMeasuring(true);
    setTwistTime(0);
    setTwistSpeed(0);

    playSound('click');

    const actualSpeed = speedAtTemp(temperature);
    const roundTripDistance = 340; // Fixed distance
    const totalTime = roundTripDistance / actualSpeed;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setTwistTime(elapsed);

      if (elapsed >= totalTime) {
        clearInterval(interval);
        setTwistTime(totalTime);
        setTwistSpeed(roundTripDistance / totalTime);
        setTwistMeasuring(false);
        playSound('success');
      }
    }, 30);
  };

  const handlePrediction = (choice: string) => {
    setPrediction(choice);
    if (onGameEvent) {
      onGameEvent({ type: 'prediction', phase: 'predict', prediction: choice });
    }
    playSound('click');
  };

  const handleTwistPrediction = (choice: string) => {
    setTwistPrediction(choice);
    if (onGameEvent) {
      onGameEvent({ type: 'prediction', phase: 'twist_predict', prediction: choice });
    }
    playSound('click');
  };

  const handleTestAnswer = (q: number, a: number) => {
    if (!testSubmitted) {
      setTestAnswers(prev => ({ ...prev, [q]: a }));
      playSound('click');
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
    playSound(score >= 7 ? 'complete' : 'failure');
  };

  const testQuestions = [
    {
      q: "What is the approximate speed of sound in air at 20°C?",
      options: [
        "100 m/s",
        "343 m/s",
        "768 m/s",
        "1,000 m/s"
      ],
      correct: 1,
      explanation: "Sound travels at approximately 343 m/s (about 767 mph) in air at 20°C. This is much slower than light but still quite fast - about 1 km every 3 seconds."
    },
    {
      q: "How does temperature affect the speed of sound in air?",
      options: [
        "No effect at all",
        "Higher temperature = faster sound",
        "Higher temperature = slower sound",
        "Only affects volume, not speed"
      ],
      correct: 1,
      explanation: "Higher temperature makes air molecules move faster and more energetically, allowing sound waves to propagate faster. The formula is approximately v = 331 + 0.6T m/s."
    },
    {
      q: "To measure sound speed using an echo, you need:",
      options: [
        "Just the distance to the wall",
        "Distance to wall and round-trip time",
        "Only the time for echo to return",
        "The frequency of the sound"
      ],
      correct: 1,
      explanation: "Speed = distance/time. For an echo, the sound travels to the wall and back, so you need: speed = (2 × distance to wall) / round-trip time."
    },
    {
      q: "Why can you see lightning before you hear thunder?",
      options: [
        "Thunder is quieter than lightning",
        "Light is much faster than sound",
        "Thunder travels through ground",
        "Lightning heats the air"
      ],
      correct: 1,
      explanation: "Light travels at about 300,000,000 m/s while sound only travels at ~343 m/s. Light is nearly a million times faster, so it reaches you almost instantly while sound takes noticeable time."
    },
    {
      q: "Approximately how far away is a storm if thunder arrives 5 seconds after lightning?",
      options: [
        "About 500 meters",
        "About 1 mile (1.6 km)",
        "About 5 miles",
        "About 10 km"
      ],
      correct: 1,
      explanation: "Sound travels about 343 m/s × 5 s = 1,715 m ≈ 1 mile. The rule of thumb '5 seconds = 1 mile' is a good approximation for estimating storm distance."
    },
    {
      q: "In which medium does sound travel fastest?",
      options: [
        "Air",
        "Water",
        "Steel",
        "Vacuum"
      ],
      correct: 2,
      explanation: "Sound travels fastest in solids (~5,000 m/s in steel), slower in liquids (~1,500 m/s in water), and slowest in gases (~343 m/s in air). Sound cannot travel through vacuum."
    },
    {
      q: "Why does sound travel faster in solids than in gases?",
      options: [
        "Solids are denser",
        "Molecules are closer together and more tightly bonded",
        "Solids have more air pockets",
        "Gravity is stronger in solids"
      ],
      correct: 1,
      explanation: "In solids, molecules are tightly bonded and close together, allowing vibrations to transfer from one molecule to the next very quickly. The high stiffness of solids is the key factor."
    },
    {
      q: "What is the 'flash-to-bang' method?",
      options: [
        "Creating sound with explosions",
        "Counting seconds between lightning and thunder to estimate distance",
        "Measuring brightness of lightning",
        "A type of sound recording"
      ],
      correct: 1,
      explanation: "The flash-to-bang method uses the time delay between seeing lightning (flash) and hearing thunder (bang) to estimate storm distance. Each 3 seconds ≈ 1 km, or 5 seconds ≈ 1 mile."
    },
    {
      q: "If sound speed is 343 m/s and you hear an echo 2 seconds after clapping, how far is the wall?",
      options: [
        "171.5 meters",
        "343 meters",
        "686 meters",
        "34.3 meters"
      ],
      correct: 1,
      explanation: "In 2 seconds, sound travels 343 × 2 = 686 m total. But that's the round trip! The wall is at half that distance: 686 / 2 = 343 meters away."
    },
    {
      q: "Why might your measured speed of sound differ from the textbook value?",
      options: [
        "Textbooks are always wrong",
        "Temperature, humidity, and measurement errors",
        "Sound changes speed randomly",
        "Distance doesn't matter"
      ],
      correct: 1,
      explanation: "Temperature significantly affects sound speed. Humidity has a small effect (moist air is slightly faster). Plus, timing and distance measurement errors add uncertainty to real experiments."
    }
  ];

  const applications = [
    {
      title: "Storm Distance",
      description: "Lightning-thunder delay",
      detail: "Count seconds between lightning flash and thunder, divide by 3 for km or 5 for miles. This works because light is nearly instant while sound takes about 3 seconds per kilometer.",
      icon: "⛈️"
    },
    {
      title: "Sonar Navigation",
      description: "Submarines and depth finding",
      detail: "Sonar sends sound pulses and times echoes. Knowing sound speed in water (~1,500 m/s), submarines can map ocean floors and detect objects. Dolphins use the same principle!",
      icon: "🚢"
    },
    {
      title: "Ultrasound Imaging",
      description: "Medical imaging",
      detail: "Medical ultrasound uses high-frequency sound waves. By timing echoes from body tissues (which have different speeds), doctors create detailed images of organs and babies.",
      icon: "🏥"
    },
    {
      title: "Acoustic Thermometry",
      description: "Temperature from sound speed",
      detail: "Since sound speed depends on temperature, measuring sound speed precisely can determine temperature. This is used in ocean monitoring and industrial processes.",
      icon: "🌡️"
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
              How Fast Is Sound?
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500 }}>
              You see the lightning... 1... 2... 3... BOOM! The thunder arrives.
              Can we use this to measure how fast sound travels?
            </p>

            <svg viewBox="0 0 400 250" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              {/* Sky */}
              <rect x="0" y="0" width="400" height="180" fill="#1e293b" />

              {/* Lightning bolt */}
              <path
                d="M 200,20 L 180,60 L 200,60 L 170,120 L 190,120 L 150,180"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <animate attributeName="opacity" values="1;0.3;1;0.3;1" dur="0.5s" repeatCount="indefinite" />
              </path>

              {/* Ground */}
              <rect x="0" y="180" width="400" height="70" fill="#166534" />

              {/* Person */}
              <g transform="translate(320, 140)">
                <circle cx="0" cy="0" r="12" fill="#fed7aa" />
                <rect x="-8" y="12" width="16" height="25" fill="#3b82f6" rx="3" />
                <line x1="-8" y1="37" x2="-12" y2="55" stroke="#1e293b" strokeWidth="4" />
                <line x1="8" y1="37" x2="12" y2="55" stroke="#1e293b" strokeWidth="4" />
              </g>

              {/* Sound waves traveling */}
              <g opacity="0.5">
                {[0, 1, 2].map(i => (
                  <ellipse
                    key={i}
                    cx={200 + i * 40}
                    cy="170"
                    rx={10 + i * 15}
                    ry={5 + i * 3}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2"
                  >
                    <animate attributeName="rx" values={`${10 + i * 15};${30 + i * 15};${10 + i * 15}`} dur="2s" repeatCount="indefinite" />
                  </ellipse>
                ))}
              </g>

              {/* Distance label */}
              <text x="200" y="210" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">
                Sound takes time to travel...
              </text>
              <text x="200" y="230" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
                But how much time? And how fast?
              </text>
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
              Measure Sound Speed
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
              You're standing 170 meters from a large wall. You clap your hands and
              wait for the echo. Approximately how fast is sound traveling?
            </p>

            <svg viewBox="0 0 400 120" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              {/* Person */}
              <g transform="translate(50, 50)">
                <circle cx="0" cy="0" r="10" fill="#fed7aa" />
                <rect x="-6" y="10" width="12" height="20" fill="#3b82f6" rx="2" />
                {/* Hands clapping */}
                <ellipse cx="-15" cy="20" rx="8" ry="5" fill="#fed7aa" />
                <ellipse cx="15" cy="20" rx="8" ry="5" fill="#fed7aa" />
              </g>

              {/* Wall */}
              <rect x="330" y="20" width="20" height="80" fill="#64748b" />
              <rect x="335" y="25" width="10" height="70" fill="#475569" />

              {/* Distance arrow */}
              <path d="M 70,90 L 320,90" fill="none" stroke="#22c55e" strokeWidth="2" />
              <polygon points="320,90 310,85 310,95" fill="#22c55e" />
              <polygon points="70,90 80,85 80,95" fill="#22c55e" />
              <text x="195" y="110" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">
                170 meters
              </text>

              {/* Sound wave hint */}
              <text x="195" y="55" textAnchor="middle" fill="#64748b" fontSize="10">
                Sound goes there AND back...
              </text>
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 400 }}>
              {[
                { id: 'a', text: 'About 34 m/s (walking pace)' },
                { id: 'b', text: 'About 343 m/s (faster than a jet plane!)' },
                { id: 'c', text: 'About 3,400 m/s (like a bullet)' }
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
                Measure It!
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
              Echo Measurement
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>
              Clap to send a sound wave and time the echo!
            </p>

            <svg viewBox="0 0 400 180" style={{ width: '100%', maxWidth: 450, marginBottom: '1rem' }}>
              {/* Background */}
              <rect x="10" y="30" width="380" height="100" fill="#f8fafc" rx="5" />

              {/* Person */}
              <g transform="translate(40, 60)">
                <circle cx="0" cy="0" r="15" fill="#fed7aa" />
                <rect x="-10" y="15" width="20" height="30" fill="#3b82f6" rx="3" />
                {/* Clapping hands animation */}
                <ellipse cx="-18" cy="30" rx="10" ry="6" fill="#fed7aa">
                  <animate attributeName="cx" values="-18;-8;-18" dur="0.3s" repeatCount="1" begin="indefinite" />
                </ellipse>
                <ellipse cx="18" cy="30" rx="10" ry="6" fill="#fed7aa">
                  <animate attributeName="cx" values="18;8;18" dur="0.3s" repeatCount="1" begin="indefinite" />
                </ellipse>
              </g>

              {/* Wall */}
              <rect x="350" y="35" width="30" height="90" fill="#475569" rx="3" />

              {/* Sound wave going out */}
              {soundWavePos >= 0 && (
                <g>
                  <circle
                    cx={60 + soundWavePos * 2.8}
                    cy="80"
                    r="15"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3"
                    opacity={1 - soundWavePos / 150}
                  />
                  <text x={60 + soundWavePos * 2.8} y="60" textAnchor="middle" fill="#f59e0b" fontSize="10">
                    CLAP →
                  </text>
                </g>
              )}

              {/* Echo wave coming back */}
              {echoWavePos >= 0 && (
                <g>
                  <circle
                    cx={60 + echoWavePos * 2.8}
                    cy="80"
                    r="15"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="3"
                    opacity={echoWavePos / 100}
                  />
                  <text x={60 + echoWavePos * 2.8} y="60" textAnchor="middle" fill="#22c55e" fontSize="10">
                    ← ECHO
                  </text>
                </g>
              )}

              {/* Distance marker */}
              <path d="M 55,135 L 345,135" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="5,5" />
              <text x="200" y="150" textAnchor="middle" fill="#64748b" fontSize="11">
                {distance} m to wall (round trip: {distance * 2} m)
              </text>

              {/* Timer display */}
              <rect x="140" y="5" width="120" height="25" fill="#1e293b" rx="5" />
              <text x="200" y="22" textAnchor="middle" fill="#22c55e" fontSize="14" fontFamily="monospace">
                {elapsedTime.toFixed(3)} s
              </text>
            </svg>

            {/* Results display */}
            {calculatedSpeed > 0 && (
              <div style={{
                background: '#dcfce7',
                padding: '1rem',
                borderRadius: 12,
                marginBottom: '1rem',
                textAlign: 'center',
                width: '100%',
                maxWidth: 350
              }}>
                <p style={{ fontSize: '0.9rem', color: '#166534', marginBottom: '0.5rem' }}>
                  Round trip distance: {distance * 2} m
                </p>
                <p style={{ fontSize: '0.9rem', color: '#166534', marginBottom: '0.5rem' }}>
                  Time measured: {elapsedTime.toFixed(3)} seconds
                </p>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#166534' }}>
                  Speed = {distance * 2} m / {elapsedTime.toFixed(3)} s = {calculatedSpeed.toFixed(0)} m/s
                </p>
              </div>
            )}

            {/* Distance slider */}
            <div style={{ width: '100%', maxWidth: 350, marginBottom: '1rem' }}>
              <label style={{ color: '#64748b', fontSize: '0.9rem' }}>
                Distance to wall: {distance} m
              </label>
              <input
                type="range"
                min="50"
                max="500"
                step="10"
                value={distance}
                onChange={(e) => {
                  setDistance(parseInt(e.target.value));
                  resetMeasurement();
                }}
                disabled={measuring}
                style={{ width: '100%' }}
              />
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button
                onMouseDown={makeSound}
                disabled={measuring}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: measuring
                    ? '#94a3b8'
                    : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: measuring ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                👏 CLAP!
              </button>

              {hasMeasured && !measuring && (
                <button
                  onMouseDown={resetMeasurement}
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

            {calculatedSpeed > 0 && (
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
                  {prediction === 'b' ? '✓ Correct!' : 'Now you know!'}
                </p>
                <p style={{ color: '#1e293b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Sound travels at about <strong>343 m/s</strong> in air at room temperature.
                  That's faster than most jet airplanes but much slower than light!
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
              The Physics of Sound Speed
            </h2>

            <div style={{
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#1d4ed8', marginBottom: '0.75rem' }}>The Formula</h3>

              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: 10,
                textAlign: 'center',
                marginBottom: '1rem'
              }}>
                <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#1e293b' }}>
                  v = d / t
                </p>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                  Speed = Distance / Time
                </p>
              </div>

              <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                <p style={{ marginBottom: '0.75rem' }}>
                  For the echo method:
                </p>
                <div style={{
                  background: 'white',
                  padding: '0.75rem',
                  borderRadius: 8,
                  textAlign: 'center'
                }}>
                  <p style={{ fontWeight: 'bold', color: '#1d4ed8' }}>
                    v = 2 × distance / echo time
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    (Factor of 2 because sound travels there AND back)
                  </p>
                </div>
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#ca8a04', marginBottom: '0.75rem' }}>Speed Comparison</h3>

              <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ background: '#fef3c7' }}>
                      <td style={{ padding: '0.5rem' }}>🚶 Walking</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>~1.5 m/s</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.5rem' }}>🚗 Car (highway)</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>~30 m/s</td>
                    </tr>
                    <tr style={{ background: '#dcfce7' }}>
                      <td style={{ padding: '0.5rem' }}>🔊 <strong>Sound in air</strong></td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}><strong>~343 m/s</strong></td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.5rem' }}>✈️ Commercial jet</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>~250 m/s</td>
                    </tr>
                    <tr style={{ background: '#fef3c7' }}>
                      <td style={{ padding: '0.5rem' }}>💨 Sound in water</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>~1,500 m/s</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.5rem' }}>🔩 Sound in steel</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>~5,100 m/s</td>
                    </tr>
                  </tbody>
                </table>
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
              Try a Twist! 🌡️
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
              Temperature Challenge
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500 }}>
              It's a hot summer day (35°C) vs a cold winter night (-10°C).
              How does temperature affect sound speed?
            </p>

            <svg viewBox="0 0 400 140" style={{ width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              {/* Summer side */}
              <g transform="translate(30, 20)">
                <rect x="0" y="0" width="150" height="100" fill="#fef3c7" rx="10" />
                <circle cx="75" cy="25" r="15" fill="#fbbf24" />
                <text x="75" y="30" textAnchor="middle" fill="white" fontSize="10">☀️</text>
                <text x="75" y="60" textAnchor="middle" fill="#92400e" fontSize="14" fontWeight="bold">
                  35°C
                </text>
                <text x="75" y="80" textAnchor="middle" fill="#92400e" fontSize="11">
                  HOT
                </text>
              </g>

              {/* Winter side */}
              <g transform="translate(220, 20)">
                <rect x="0" y="0" width="150" height="100" fill="#dbeafe" rx="10" />
                <text x="75" y="30" textAnchor="middle" fontSize="20">❄️</text>
                <text x="75" y="60" textAnchor="middle" fill="#1d4ed8" fontSize="14" fontWeight="bold">
                  -10°C
                </text>
                <text x="75" y="80" textAnchor="middle" fill="#1d4ed8" fontSize="11">
                  COLD
                </text>
              </g>

              {/* VS */}
              <text x="200" y="75" textAnchor="middle" fill="#64748b" fontSize="16" fontWeight="bold">vs</text>
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 400 }}>
              {[
                { id: 'a', text: 'Same speed - temperature doesn\'t matter' },
                { id: 'b', text: 'Faster in hot air (molecules move faster)' },
                { id: 'c', text: 'Faster in cold air (denser = better conductor)' }
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
        const expectedSpeed = speedAtTemp(temperature);

        return (
          <div className="flex flex-col items-center">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              Temperature Effect on Sound Speed
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1rem', textAlign: 'center' }}>
              Adjust temperature and measure sound speed
            </p>

            {/* Temperature display */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2rem',
              marginBottom: '1.5rem'
            }}>
              {/* Thermometer */}
              <svg viewBox="0 0 60 150" style={{ width: 60, height: 150 }}>
                {/* Tube */}
                <rect x="22" y="10" width="16" height="110" fill="#e2e8f0" rx="8" />
                <rect
                  x="25"
                  y={120 - (temperature + 20) * 0.9}
                  width="10"
                  height={(temperature + 20) * 0.9}
                  fill={temperature > 20 ? '#ef4444' : '#3b82f6'}
                  rx="5"
                />
                {/* Bulb */}
                <circle cx="30" cy="130" r="15" fill={temperature > 20 ? '#ef4444' : '#3b82f6'} />

                {/* Scale marks */}
                {[-10, 0, 10, 20, 30, 40].map(t => (
                  <g key={t}>
                    <line x1="40" y1={110 - (t + 10) * 0.9} x2="50" y2={110 - (t + 10) * 0.9} stroke="#64748b" strokeWidth="1" />
                    <text x="55" y={113 - (t + 10) * 0.9} fill="#64748b" fontSize="8">{t}°</text>
                  </g>
                ))}
              </svg>

              {/* Speed display */}
              <div style={{
                background: '#f8fafc',
                padding: '1.5rem',
                borderRadius: 12,
                textAlign: 'center'
              }}>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  At {temperature}°C:
                </p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>
                  {twistSpeed > 0 ? twistSpeed.toFixed(0) : expectedSpeed.toFixed(0)} m/s
                </p>
                <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  Formula: v = 331 + 0.6T
                </p>
              </div>
            </div>

            {/* Temperature slider */}
            <div style={{ width: '100%', maxWidth: 350, marginBottom: '1.5rem' }}>
              <label style={{ color: '#64748b', fontSize: '0.9rem' }}>
                Temperature: {temperature}°C
              </label>
              <input
                type="range"
                min="-20"
                max="45"
                value={temperature}
                onChange={(e) => setTemperature(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                <span>❄️ -20°C</span>
                <span>☀️ 45°C</span>
              </div>
            </div>

            {/* Speed comparison chart */}
            <div style={{
              background: 'white',
              borderRadius: 12,
              padding: '1rem',
              width: '100%',
              maxWidth: 350,
              marginBottom: '1rem'
            }}>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                Speed at different temperatures:
              </p>
              {[-10, 0, 20, 35].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ width: 50, fontSize: '0.8rem', color: '#1e293b' }}>{t}°C:</span>
                  <div style={{
                    height: 16,
                    width: `${(speedAtTemp(t) - 300) * 2}px`,
                    background: t === temperature ? '#3b82f6' : '#e2e8f0',
                    borderRadius: 3
                  }} />
                  <span style={{ fontSize: '0.8rem', color: '#1e293b' }}>{speedAtTemp(t).toFixed(0)} m/s</span>
                </div>
              ))}
            </div>

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
                  {twistPrediction === 'b' ? '✓ Correct!' : 'Temperature matters!'}
                </p>
                <p style={{ color: '#1e293b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Sound travels <strong>faster in hot air</strong>! At higher temperatures, air molecules
                  move faster and can transmit vibrations more quickly. Each 1°C increase adds
                  about 0.6 m/s to the speed of sound.
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
              Temperature and Sound Speed
            </h2>

            <div style={{
              background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ color: '#ca8a04', marginBottom: '0.75rem' }}>The Temperature Formula</h3>

              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: 10,
                textAlign: 'center',
                marginBottom: '1rem'
              }}>
                <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#1e293b' }}>
                  v ≈ 331 + 0.6T (m/s)
                </p>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                  T = temperature in Celsius
                </p>
              </div>

              <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong>Why hotter = faster?</strong>
                </p>
                <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  <li>Higher temperature = faster molecule motion</li>
                  <li>Faster molecules collide more frequently</li>
                  <li>Sound waves (pressure waves) propagate faster</li>
                </ul>
              </div>
            </div>

            <div style={{
              background: '#f0fdf4',
              borderRadius: 12,
              padding: '1rem',
              maxWidth: 500,
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ color: '#166534', marginBottom: '0.5rem' }}>Practical Impact</h4>
              <p style={{ color: '#1e293b', fontSize: '0.9rem' }}>
                This is why outdoor concerts sound different on hot vs cold days!
                Musicians may need to retune instruments as temperature changes
                because the pitch depends on sound speed.
              </p>
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
              Sound Speed in the Real World
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
                    playSound('click');
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
              Speed of Sound Mastery Test
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
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔊⏱️🎉</div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#1e293b' }}>
              Sound Speed Master!
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: 400 }}>
              You can now calculate storm distances and understand how
              temperature affects the speed of sound!
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
                  <li>Sound speed ≈ 343 m/s at 20°C</li>
                  <li>v = 331 + 0.6T (temperature effect)</li>
                  <li>Echo method: v = 2d / t</li>
                  <li>5 seconds ≈ 1 mile (storm distance)</li>
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
                  fill={['#3b82f6', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6'][i % 5]}
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
                resetMeasurement();
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
  const phaseLabels: Record<Phase, string> = {
    hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review',
    twist_predict: 'Twist Predict', twist_play: 'Twist Lab', twist_review: 'Twist Review',
    transfer: 'Transfer', test: 'Test', mastery: 'Mastery'
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Speed of Sound</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onMouseDown={() => goToPhase(p)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-blue-400 w-6 shadow-lg shadow-blue-400/30'
                    : i < currentIndex
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-blue-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
            {renderPhase()}
          </div>
        </div>
      </div>
    </div>
  );
}
