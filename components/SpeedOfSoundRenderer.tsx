import React, { useState, useRef, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────
// SpeedOfSoundRenderer – Measure the speed of sound
// ─────────────────────────────────────────────────────────────
// Physics: v = d/t, speed of sound ≈ 343 m/s at 20°C
// Temperature dependence: v ≈ 331 + 0.6T (m/s)
// Methods: echo timing, two microphones, resonance tube

interface SpeedOfSoundRendererProps {
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
export default function SpeedOfSoundRenderer({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer
}: SpeedOfSoundRendererProps) {
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

  // Responsive typography
  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px',
  };

  const goToPhase = (newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    setTimeout(() => { navigationLockRef.current = false; }, 400);

    onPhaseComplete?.();
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
    playSound('click');
  };

  const handleTwistPrediction = (choice: string) => {
    setTwistPrediction(choice);
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
    const score = testQuestions.reduce((acc, q, i) => {
      if (testAnswers[i] !== undefined && q.options[testAnswers[i]]?.correct) {
        return acc + 1;
      }
      return acc;
    }, 0);
    if (score >= 7) {
      onCorrectAnswer?.();
      playSound('success');
    } else {
      onIncorrectAnswer?.();
      playSound('failure');
    }
  };

  const testQuestions = [
    {
      question: "What is the approximate speed of sound in air at 20°C?",
      options: [
        { text: "100 m/s", correct: false },
        { text: "343 m/s", correct: true },
        { text: "768 m/s", correct: false },
        { text: "1,000 m/s", correct: false }
      ],
    },
    {
      question: "How does temperature affect the speed of sound in air?",
      options: [
        { text: "No effect at all", correct: false },
        { text: "Higher temperature = faster sound", correct: true },
        { text: "Higher temperature = slower sound", correct: false },
        { text: "Only affects volume, not speed", correct: false }
      ],
    },
    {
      question: "To measure sound speed using an echo, you need:",
      options: [
        { text: "Just the distance to the wall", correct: false },
        { text: "Distance to wall and round-trip time", correct: true },
        { text: "Only the time for echo to return", correct: false },
        { text: "The frequency of the sound", correct: false }
      ],
    },
    {
      question: "Why can you see lightning before you hear thunder?",
      options: [
        { text: "Thunder is quieter than lightning", correct: false },
        { text: "Light is much faster than sound", correct: true },
        { text: "Thunder travels through ground", correct: false },
        { text: "Lightning heats the air", correct: false }
      ],
    },
    {
      question: "Approximately how far away is a storm if thunder arrives 5 seconds after lightning?",
      options: [
        { text: "About 500 meters", correct: false },
        { text: "About 1 mile (1.6 km)", correct: true },
        { text: "About 5 miles", correct: false },
        { text: "About 10 km", correct: false }
      ],
    },
    {
      question: "In which medium does sound travel fastest?",
      options: [
        { text: "Air", correct: false },
        { text: "Water", correct: false },
        { text: "Steel", correct: true },
        { text: "Vacuum", correct: false }
      ],
    },
    {
      question: "Why does sound travel faster in solids than in gases?",
      options: [
        { text: "Solids are denser", correct: false },
        { text: "Molecules are closer together and more tightly bonded", correct: true },
        { text: "Solids have more air pockets", correct: false },
        { text: "Gravity is stronger in solids", correct: false }
      ],
    },
    {
      question: "What is the 'flash-to-bang' method?",
      options: [
        { text: "Creating sound with explosions", correct: false },
        { text: "Counting seconds between lightning and thunder to estimate distance", correct: true },
        { text: "Measuring brightness of lightning", correct: false },
        { text: "A type of sound recording", correct: false }
      ],
    },
    {
      question: "If sound speed is 343 m/s and you hear an echo 2 seconds after clapping, how far is the wall?",
      options: [
        { text: "171.5 meters", correct: false },
        { text: "343 meters", correct: true },
        { text: "686 meters", correct: false },
        { text: "34.3 meters", correct: false }
      ],
    },
    {
      question: "Why might your measured speed of sound differ from the textbook value?",
      options: [
        { text: "Textbooks are always wrong", correct: false },
        { text: "Temperature, humidity, and measurement errors", correct: true },
        { text: "Sound changes speed randomly", correct: false },
        { text: "Distance doesn't matter", correct: false }
      ],
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
            <h2 style={{ fontSize: typo.title, marginBottom: '0.5rem', color: '#f8fafc', fontWeight: 700 }}>
              How Fast Is Sound?
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500, fontSize: typo.body }}>
              You see the lightning... 1... 2... 3... BOOM! The thunder arrives.
              Can we use this to measure how fast sound travels?
            </p>

            <svg viewBox="0 0 400 250" style={{ width: '100%', maxWidth: 400, marginBottom: '1rem' }}>
              <defs>
                {/* Premium sky gradient with depth */}
                <linearGradient id="sosSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="30%" stopColor="#1e293b" />
                  <stop offset="60%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>

                {/* Storm cloud gradient */}
                <radialGradient id="sosCloudGrad" cx="50%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="50%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#1e293b" />
                </radialGradient>

                {/* Lightning glow gradient */}
                <linearGradient id="sosLightningGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="30%" stopColor="#fbbf24" />
                  <stop offset="70%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>

                {/* Ground gradient with depth */}
                <linearGradient id="sosGroundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#166534" />
                  <stop offset="40%" stopColor="#14532d" />
                  <stop offset="100%" stopColor="#052e16" />
                </linearGradient>

                {/* Sound wave gradient */}
                <radialGradient id="sosSoundWaveGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                </radialGradient>

                {/* Person skin gradient */}
                <radialGradient id="sosSkinGrad" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="50%" stopColor="#fed7aa" />
                  <stop offset="100%" stopColor="#fdba74" />
                </radialGradient>

                {/* Person shirt gradient */}
                <linearGradient id="sosShirtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>

                {/* Lightning glow filter */}
                <filter id="sosLightningGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Sound wave glow filter */}
                <filter id="sosSoundGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Sky with gradient */}
              <rect x="0" y="0" width="400" height="180" fill="url(#sosSkyGrad)" />

              {/* Storm clouds */}
              <ellipse cx="180" cy="25" rx="80" ry="25" fill="url(#sosCloudGrad)" opacity="0.8" />
              <ellipse cx="220" cy="35" rx="60" ry="20" fill="url(#sosCloudGrad)" opacity="0.9" />
              <ellipse cx="160" cy="40" rx="50" ry="18" fill="url(#sosCloudGrad)" opacity="0.7" />

              {/* Lightning bolt with glow */}
              <path
                d="M 200,20 L 180,60 L 200,60 L 170,120 L 190,120 L 150,180"
                fill="none"
                stroke="url(#sosLightningGrad)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#sosLightningGlow)"
              >
                <animate attributeName="opacity" values="1;0.2;1;0.3;1" dur="0.5s" repeatCount="indefinite" />
              </path>
              {/* Lightning core (brighter) */}
              <path
                d="M 200,20 L 180,60 L 200,60 L 170,120 L 190,120 L 150,180"
                fill="none"
                stroke="#fef9c3"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <animate attributeName="opacity" values="1;0.2;1;0.3;1" dur="0.5s" repeatCount="indefinite" />
              </path>

              {/* Ground with gradient */}
              <rect x="0" y="180" width="400" height="70" fill="url(#sosGroundGrad)" />
              {/* Ground texture lines */}
              <line x1="0" y1="185" x2="400" y2="185" stroke="#22c55e" strokeWidth="1" opacity="0.3" />
              <line x1="0" y1="195" x2="400" y2="195" stroke="#14532d" strokeWidth="1" opacity="0.5" />

              {/* Person with premium gradients */}
              <g transform="translate(320, 140)">
                {/* Head with skin gradient */}
                <circle cx="0" cy="0" r="12" fill="url(#sosSkinGrad)" />
                {/* Hair */}
                <ellipse cx="0" cy="-8" rx="10" ry="5" fill="#44403c" />
                {/* Body with shirt gradient */}
                <rect x="-8" y="12" width="16" height="25" fill="url(#sosShirtGrad)" rx="3" />
                {/* Legs */}
                <line x1="-5" y1="37" x2="-8" y2="55" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
                <line x1="5" y1="37" x2="8" y2="55" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
                {/* Arms raised in surprise */}
                <line x1="-8" y1="18" x2="-18" y2="8" stroke="url(#sosShirtGrad)" strokeWidth="4" strokeLinecap="round" />
                <line x1="8" y1="18" x2="18" y2="8" stroke="url(#sosShirtGrad)" strokeWidth="4" strokeLinecap="round" />
              </g>

              {/* Sound waves traveling with glow */}
              <g filter="url(#sosSoundGlow)">
                {[0, 1, 2].map(i => (
                  <ellipse
                    key={i}
                    cx={180 + i * 45}
                    cy="175"
                    rx={12 + i * 18}
                    ry={6 + i * 4}
                    fill="none"
                    stroke="url(#sosLightningGrad)"
                    strokeWidth="2.5"
                    opacity={0.8 - i * 0.2}
                  >
                    <animate attributeName="rx" values={`${12 + i * 18};${35 + i * 18};${12 + i * 18}`} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values={`${0.8 - i * 0.2};${0.4 - i * 0.1};${0.8 - i * 0.2}`} dur="2s" repeatCount="indefinite" />
                  </ellipse>
                ))}
              </g>
            </svg>

            {/* Text labels moved outside SVG for responsive typography */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <p style={{ color: '#22c55e', fontSize: typo.body, fontWeight: 600, marginBottom: '0.25rem' }}>
                Sound takes time to travel...
              </p>
              <p style={{ color: '#f8fafc', fontSize: typo.bodyLarge, fontWeight: 700 }}>
                But how much time? And how fast?
              </p>
            </div>

            <button
              onMouseDown={() => goToPhase('predict')}
              style={{
                padding: '1rem 2.5rem',
                fontSize: typo.bodyLarge,
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
            <h2 style={{ fontSize: typo.heading, marginBottom: '1rem', color: '#f8fafc', fontWeight: 700 }}>
              Make Your Prediction
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500, fontSize: typo.body }}>
              You're standing 170 meters from a large wall. You clap your hands and
              wait for the echo. Approximately how fast is sound traveling?
            </p>

            <svg viewBox="0 0 400 100" style={{ width: '100%', maxWidth: 400, marginBottom: '0.5rem' }}>
              <defs>
                {/* Background gradient */}
                <linearGradient id="sosPredictBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="50%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>

                {/* Wall gradient with depth */}
                <linearGradient id="sosWallGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="30%" stopColor="#64748b" />
                  <stop offset="70%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#334155" />
                </linearGradient>

                {/* Wall texture pattern */}
                <pattern id="sosWallTexture" width="10" height="10" patternUnits="userSpaceOnUse">
                  <rect width="10" height="10" fill="none" />
                  <line x1="0" y1="5" x2="10" y2="5" stroke="#334155" strokeWidth="0.5" />
                </pattern>

                {/* Person skin gradient */}
                <radialGradient id="sosPredictSkin" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="50%" stopColor="#fed7aa" />
                  <stop offset="100%" stopColor="#fdba74" />
                </radialGradient>

                {/* Person shirt gradient */}
                <linearGradient id="sosPredictShirt" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>

                {/* Clap wave gradient */}
                <radialGradient id="sosClapsWaveGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
                  <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                </radialGradient>

                {/* Distance arrow gradient */}
                <linearGradient id="sosDistanceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="50%" stopColor="#4ade80" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>

                {/* Clap glow filter */}
                <filter id="sosClapsGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background */}
              <rect x="0" y="0" width="400" height="100" fill="url(#sosPredictBg)" rx="8" />

              {/* Person with clapping animation */}
              <g transform="translate(50, 45)">
                {/* Head */}
                <circle cx="0" cy="0" r="10" fill="url(#sosPredictSkin)" />
                {/* Hair */}
                <ellipse cx="0" cy="-7" rx="8" ry="4" fill="#44403c" />
                {/* Body */}
                <rect x="-6" y="10" width="12" height="20" fill="url(#sosPredictShirt)" rx="2" />
                {/* Legs */}
                <line x1="-4" y1="30" x2="-6" y2="45" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
                <line x1="4" y1="30" x2="6" y2="45" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
                {/* Hands clapping with glow */}
                <g filter="url(#sosClapsGlow)">
                  <ellipse cx="-12" cy="18" rx="7" ry="5" fill="url(#sosPredictSkin)">
                    <animate attributeName="cx" values="-12;-5;-12" dur="0.5s" repeatCount="indefinite" />
                  </ellipse>
                  <ellipse cx="12" cy="18" rx="7" ry="5" fill="url(#sosPredictSkin)">
                    <animate attributeName="cx" values="12;5;12" dur="0.5s" repeatCount="indefinite" />
                  </ellipse>
                </g>
                {/* Clap waves */}
                <circle cx="0" cy="18" r="8" fill="none" stroke="#fbbf24" strokeWidth="2" opacity="0.6">
                  <animate attributeName="r" values="5;25;5" dur="1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0;0.8" dur="1s" repeatCount="indefinite" />
                </circle>
              </g>

              {/* Wall with premium gradient and texture */}
              <g>
                <rect x="340" y="10" width="25" height="80" fill="url(#sosWallGrad)" rx="2" />
                <rect x="340" y="10" width="25" height="80" fill="url(#sosWallTexture)" rx="2" />
                {/* Wall shadow */}
                <rect x="338" y="12" width="4" height="76" fill="#1e293b" opacity="0.5" />
                {/* Wall highlight */}
                <rect x="362" y="12" width="2" height="76" fill="#94a3b8" opacity="0.3" />
              </g>

              {/* Distance arrow with gradient */}
              <path d="M 70,85 L 330,85" fill="none" stroke="url(#sosDistanceGrad)" strokeWidth="2" />
              <polygon points="330,85 318,80 318,90" fill="#22c55e" />
              <polygon points="70,85 82,80 82,90" fill="#22c55e" />
            </svg>

            {/* Text labels outside SVG */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <p style={{ color: '#22c55e', fontSize: typo.body, fontWeight: 700, marginBottom: '0.25rem' }}>
                170 meters
              </p>
              <p style={{ color: '#64748b', fontSize: typo.small, fontStyle: 'italic' }}>
                Sound goes there AND back...
              </p>
            </div>

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
                    background: prediction === opt.id
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.15))'
                      : 'rgba(30, 41, 59, 0.8)',
                    color: prediction === opt.id ? '#60a5fa' : '#e2e8f0',
                    border: `1px solid ${prediction === opt.id ? 'rgba(59, 130, 246, 0.5)' : '#334155'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    fontSize: typo.body
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
                  fontSize: typo.bodyLarge,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
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
            <h2 style={{ fontSize: typo.heading, marginBottom: '0.5rem', color: '#f8fafc', fontWeight: 700 }}>
              Echo Measurement
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1rem', textAlign: 'center', fontSize: typo.body }}>
              Clap to send a sound wave and time the echo!
            </p>

            <svg viewBox="0 0 400 150" style={{ width: '100%', maxWidth: 450, marginBottom: '0.5rem' }}>
              <defs>
                {/* Lab background gradient */}
                <linearGradient id="sosLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="50%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>

                {/* Air medium gradient - shows the medium sound travels through */}
                <linearGradient id="sosMediumGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.05" />
                  <stop offset="25%" stopColor="#06b6d4" stopOpacity="0.08" />
                  <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.1" />
                  <stop offset="75%" stopColor="#06b6d4" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05" />
                </linearGradient>

                {/* Wall gradient with brick-like depth */}
                <linearGradient id="sosPlayWallGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#374151" />
                  <stop offset="20%" stopColor="#4b5563" />
                  <stop offset="50%" stopColor="#6b7280" />
                  <stop offset="80%" stopColor="#4b5563" />
                  <stop offset="100%" stopColor="#374151" />
                </linearGradient>

                {/* Person skin */}
                <radialGradient id="sosPlaySkin" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="50%" stopColor="#fed7aa" />
                  <stop offset="100%" stopColor="#fdba74" />
                </radialGradient>

                {/* Person shirt */}
                <linearGradient id="sosPlayShirt" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>

                {/* Sound wave outgoing gradient */}
                <radialGradient id="sosWaveOutGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0" />
                  <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#d97706" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
                </radialGradient>

                {/* Echo wave gradient */}
                <radialGradient id="sosWaveEchoGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
                  <stop offset="40%" stopColor="#4ade80" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#22c55e" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
                </radialGradient>

                {/* Timer display gradient */}
                <linearGradient id="sosTimerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="50%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>

                {/* Sound wave glow filter */}
                <filter id="sosPlayWaveGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Timer glow filter */}
                <filter id="sosTimerGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Lab background */}
              <rect x="0" y="0" width="400" height="150" fill="url(#sosLabBg)" rx="8" />

              {/* Air medium visualization */}
              <rect x="55" y="25" width="290" height="80" fill="url(#sosMediumGrad)" rx="4" />
              {/* Air particle hints */}
              {[...Array(8)].map((_, i) => (
                <circle key={i} cx={80 + i * 35} cy={65} r="1.5" fill="#06b6d4" opacity="0.3">
                  <animate attributeName="opacity" values="0.2;0.5;0.2" dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite" />
                </circle>
              ))}

              {/* Person with premium design */}
              <g transform="translate(35, 50)">
                {/* Head */}
                <circle cx="0" cy="0" r="12" fill="url(#sosPlaySkin)" />
                {/* Hair */}
                <ellipse cx="0" cy="-8" rx="10" ry="5" fill="#44403c" />
                {/* Body */}
                <rect x="-8" y="12" width="16" height="25" fill="url(#sosPlayShirt)" rx="3" />
                {/* Legs */}
                <line x1="-5" y1="37" x2="-7" y2="52" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
                <line x1="5" y1="37" x2="7" y2="52" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
                {/* Hands */}
                <ellipse cx="-14" cy="25" rx="8" ry="5" fill="url(#sosPlaySkin)" />
                <ellipse cx="14" cy="25" rx="8" ry="5" fill="url(#sosPlaySkin)" />
              </g>

              {/* Wall with premium gradient */}
              <g>
                <rect x="350" y="20" width="35" height="90" fill="url(#sosPlayWallGrad)" rx="3" />
                {/* Wall texture lines (bricks) */}
                {[0, 1, 2, 3, 4].map(i => (
                  <line key={i} x1="352" y1={30 + i * 18} x2="383" y2={30 + i * 18} stroke="#334155" strokeWidth="1" />
                ))}
                {/* Wall shadow */}
                <rect x="348" y="22" width="4" height="86" fill="#1e293b" opacity="0.6" />
              </g>

              {/* Sound wave going out with glow */}
              {soundWavePos >= 0 && (
                <g filter="url(#sosPlayWaveGlow)">
                  <circle
                    cx={55 + soundWavePos * 2.9}
                    cy="65"
                    r="18"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="4"
                    opacity={Math.max(0.2, 1 - soundWavePos / 120)}
                  />
                  <circle
                    cx={55 + soundWavePos * 2.9}
                    cy="65"
                    r="10"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="2"
                    opacity={Math.max(0.3, 1 - soundWavePos / 100)}
                  />
                </g>
              )}

              {/* Echo wave coming back with glow */}
              {echoWavePos >= 0 && (
                <g filter="url(#sosPlayWaveGlow)">
                  <circle
                    cx={55 + echoWavePos * 2.9}
                    cy="65"
                    r="18"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="4"
                    opacity={Math.max(0.2, echoWavePos / 120)}
                  />
                  <circle
                    cx={55 + echoWavePos * 2.9}
                    cy="65"
                    r="10"
                    fill="none"
                    stroke="#4ade80"
                    strokeWidth="2"
                    opacity={Math.max(0.3, echoWavePos / 100)}
                  />
                </g>
              )}

              {/* Timer display with glow */}
              <g filter="url(#sosTimerGlow)">
                <rect x="145" y="3" width="110" height="22" fill="url(#sosTimerGrad)" rx="6" stroke="#334155" strokeWidth="1" />
                <text x="200" y="18" textAnchor="middle" fill="#22c55e" fontSize="13" fontFamily="monospace" fontWeight="bold">
                  {elapsedTime.toFixed(3)} s
                </text>
              </g>

              {/* Distance marker */}
              <path d="M 55,125 L 345,125" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="5,5" />
            </svg>

            {/* Labels outside SVG */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {soundWavePos >= 0 && (
                <span style={{ color: '#f59e0b', fontSize: typo.small, fontWeight: 600 }}>CLAP going out...</span>
              )}
              {echoWavePos >= 0 && (
                <span style={{ color: '#22c55e', fontSize: typo.small, fontWeight: 600 }}>ECHO returning...</span>
              )}
              {soundWavePos < 0 && echoWavePos < 0 && (
                <span style={{ color: '#64748b', fontSize: typo.small }}>
                  {distance} m to wall (round trip: {distance * 2} m)
                </span>
              )}
            </div>

            {/* Results display */}
            {calculatedSpeed > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(22, 101, 52, 0.3), rgba(34, 197, 94, 0.15))',
                padding: '1rem',
                borderRadius: 12,
                marginBottom: '1rem',
                textAlign: 'center',
                width: '100%',
                maxWidth: 350,
                border: '1px solid rgba(34, 197, 94, 0.4)'
              }}>
                <p style={{ fontSize: typo.body, color: '#4ade80', marginBottom: '0.5rem' }}>
                  Round trip distance: {distance * 2} m
                </p>
                <p style={{ fontSize: typo.body, color: '#4ade80', marginBottom: '0.5rem' }}>
                  Time measured: {elapsedTime.toFixed(3)} seconds
                </p>
                <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4ade80' }}>
                  Speed = {distance * 2} m / {elapsedTime.toFixed(3)} s = {calculatedSpeed.toFixed(0)} m/s
                </p>
              </div>
            )}

            {/* Distance slider */}
            <div style={{ width: '100%', maxWidth: 350, marginBottom: '1rem' }}>
              <label style={{ color: '#94a3b8', fontSize: typo.body }}>
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
                style={{ width: '100%', accentColor: '#3b82f6' }}
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
                    ? '#475569'
                    : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: measuring ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: typo.body,
                  boxShadow: measuring ? 'none' : '0 4px 14px rgba(245, 158, 11, 0.4)'
                }}
              >
                CLAP!
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
                    fontWeight: 600,
                    fontSize: typo.body
                  }}
                >
                  Reset
                </button>
              )}
            </div>

            {calculatedSpeed > 0 && (
              <button
                onMouseDown={() => {
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
                  fontSize: typo.body,
                  boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)'
                }}
              >
                See Results
              </button>
            )}

            {showResult && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: prediction === 'b'
                  ? 'linear-gradient(135deg, rgba(22, 101, 52, 0.3), rgba(34, 197, 94, 0.15))'
                  : 'linear-gradient(135deg, rgba(146, 64, 14, 0.3), rgba(245, 158, 11, 0.15))',
                borderRadius: 12,
                textAlign: 'center',
                maxWidth: 400,
                border: `1px solid ${prediction === 'b' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
              }}>
                <p style={{ fontWeight: 600, color: prediction === 'b' ? '#4ade80' : '#fbbf24', fontSize: typo.bodyLarge }}>
                  {prediction === 'b' ? 'Correct!' : 'Now you know!'}
                </p>
                <p style={{ color: '#e2e8f0', fontSize: typo.body, marginTop: '0.5rem' }}>
                  Sound travels at about <strong style={{ color: '#60a5fa' }}>343 m/s</strong> in air at room temperature.
                  That is faster than most jet airplanes but much slower than light!
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
                    fontWeight: 600,
                    fontSize: typo.body,
                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
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
            <h2 style={{ fontSize: typo.heading, marginBottom: '1rem', color: '#f8fafc', fontWeight: 700 }}>
              The Physics of Sound Speed
            </h2>

            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.2), rgba(59, 130, 246, 0.1))',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              <h3 style={{ color: '#60a5fa', marginBottom: '0.75rem', fontSize: typo.bodyLarge }}>The Formula</h3>

              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                padding: '1rem',
                borderRadius: 10,
                textAlign: 'center',
                marginBottom: '1rem',
                border: '1px solid #334155'
              }}>
                <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#f8fafc' }}>
                  v = d / t
                </p>
                <p style={{ fontSize: typo.small, color: '#94a3b8', marginTop: '0.5rem' }}>
                  Speed = Distance / Time
                </p>
              </div>

              <div style={{ fontSize: typo.body, color: '#e2e8f0' }}>
                <p style={{ marginBottom: '0.75rem' }}>
                  For the echo method:
                </p>
                <div style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  padding: '0.75rem',
                  borderRadius: 8,
                  textAlign: 'center',
                  border: '1px solid #334155'
                }}>
                  <p style={{ fontWeight: 'bold', color: '#60a5fa' }}>
                    v = 2 x distance / echo time
                  </p>
                  <p style={{ fontSize: typo.small, color: '#94a3b8' }}>
                    (Factor of 2 because sound travels there AND back)
                  </p>
                </div>
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(202, 138, 4, 0.2), rgba(234, 179, 8, 0.1))',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem',
              border: '1px solid rgba(234, 179, 8, 0.3)'
            }}>
              <h3 style={{ color: '#fbbf24', marginBottom: '0.75rem', fontSize: typo.bodyLarge }}>Speed Comparison</h3>

              <div style={{ fontSize: typo.body, color: '#e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ background: 'rgba(234, 179, 8, 0.1)' }}>
                      <td style={{ padding: '0.5rem', borderRadius: '4px 0 0 4px' }}>Walking</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', borderRadius: '0 4px 4px 0' }}>~1.5 m/s</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.5rem' }}>Car (highway)</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>~30 m/s</td>
                    </tr>
                    <tr style={{ background: 'rgba(34, 197, 94, 0.2)', borderRadius: 4 }}>
                      <td style={{ padding: '0.5rem', fontWeight: 'bold', color: '#4ade80', borderRadius: '4px 0 0 4px' }}>Sound in air</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold', color: '#4ade80', borderRadius: '0 4px 4px 0' }}>~343 m/s</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.5rem' }}>Commercial jet</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>~250 m/s</td>
                    </tr>
                    <tr style={{ background: 'rgba(234, 179, 8, 0.1)' }}>
                      <td style={{ padding: '0.5rem', borderRadius: '4px 0 0 4px' }}>Sound in water</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', borderRadius: '0 4px 4px 0' }}>~1,500 m/s</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.5rem' }}>Sound in steel</td>
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
                fontSize: typo.bodyLarge,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
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
            <h2 style={{ fontSize: typo.heading, marginBottom: '1rem', color: '#f8fafc', fontWeight: 700 }}>
              Temperature Challenge
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', textAlign: 'center', maxWidth: 500, fontSize: typo.body }}>
              It's a hot summer day (35 deg C) vs a cold winter night (-10 deg C).
              How does temperature affect sound speed?
            </p>

            <svg viewBox="0 0 400 120" style={{ width: '100%', maxWidth: 400, marginBottom: '0.5rem' }}>
              <defs>
                {/* Hot/Summer gradient */}
                <linearGradient id="sosSummerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="30%" stopColor="#fde68a" />
                  <stop offset="70%" stopColor="#fcd34d" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>

                {/* Cold/Winter gradient */}
                <linearGradient id="sosWinterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#dbeafe" />
                  <stop offset="30%" stopColor="#bfdbfe" />
                  <stop offset="70%" stopColor="#93c5fd" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>

                {/* Sun gradient */}
                <radialGradient id="sosSunGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fef9c3" />
                  <stop offset="40%" stopColor="#fde047" />
                  <stop offset="70%" stopColor="#facc15" />
                  <stop offset="100%" stopColor="#eab308" />
                </radialGradient>

                {/* Snowflake/cold gradient */}
                <radialGradient id="sosSnowGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="40%" stopColor="#e0f2fe" />
                  <stop offset="70%" stopColor="#bae6fd" />
                  <stop offset="100%" stopColor="#7dd3fc" />
                </radialGradient>

                {/* VS badge gradient */}
                <linearGradient id="sosVsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="50%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>

                {/* Sun glow filter */}
                <filter id="sosSunGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Snow glow filter */}
                <filter id="sosSnowGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Summer side */}
              <g transform="translate(25, 10)">
                <rect x="0" y="0" width="150" height="100" fill="url(#sosSummerGrad)" rx="12" stroke="#f59e0b" strokeWidth="1.5" />
                {/* Sun with glow */}
                <g filter="url(#sosSunGlow)">
                  <circle cx="75" cy="30" r="18" fill="url(#sosSunGrad)" />
                </g>
                {/* Sun rays */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                  <line
                    key={i}
                    x1={75 + Math.cos(angle * Math.PI / 180) * 22}
                    y1={30 + Math.sin(angle * Math.PI / 180) * 22}
                    x2={75 + Math.cos(angle * Math.PI / 180) * 28}
                    y2={30 + Math.sin(angle * Math.PI / 180) * 28}
                    stroke="#fbbf24"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                ))}
                {/* Heat wave lines */}
                <path d="M 40,70 Q 50,65 60,70 Q 70,75 80,70 Q 90,65 100,70 Q 110,75 120,70"
                      fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.6">
                  <animate attributeName="opacity" values="0.6;0.3;0.6" dur="2s" repeatCount="indefinite" />
                </path>
              </g>

              {/* Winter side */}
              <g transform="translate(225, 10)">
                <rect x="0" y="0" width="150" height="100" fill="url(#sosWinterGrad)" rx="12" stroke="#3b82f6" strokeWidth="1.5" />
                {/* Snowflake with glow */}
                <g filter="url(#sosSnowGlow)" transform="translate(75, 30)">
                  {/* Main snowflake shape */}
                  {[0, 60, 120].map((angle, i) => (
                    <g key={i} transform={`rotate(${angle})`}>
                      <line x1="0" y1="-15" x2="0" y2="15" stroke="url(#sosSnowGrad)" strokeWidth="3" strokeLinecap="round" />
                      <line x1="-4" y1="-10" x2="0" y2="-15" stroke="url(#sosSnowGrad)" strokeWidth="2" strokeLinecap="round" />
                      <line x1="4" y1="-10" x2="0" y2="-15" stroke="url(#sosSnowGrad)" strokeWidth="2" strokeLinecap="round" />
                      <line x1="-4" y1="10" x2="0" y2="15" stroke="url(#sosSnowGrad)" strokeWidth="2" strokeLinecap="round" />
                      <line x1="4" y1="10" x2="0" y2="15" stroke="url(#sosSnowGrad)" strokeWidth="2" strokeLinecap="round" />
                    </g>
                  ))}
                  <circle cx="0" cy="0" r="4" fill="url(#sosSnowGrad)" />
                </g>
                {/* Falling snow particles */}
                {[20, 50, 80, 110, 130].map((x, i) => (
                  <circle key={i} cx={x} cy={70 + i * 5} r="2" fill="white" opacity="0.7">
                    <animate attributeName="cy" values={`${60 + i * 3};${85 + i * 3};${60 + i * 3}`} dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                  </circle>
                ))}
              </g>

              {/* VS badge */}
              <g transform="translate(200, 60)">
                <circle cx="0" cy="0" r="18" fill="url(#sosVsGrad)" stroke="#64748b" strokeWidth="2" />
                <text x="0" y="5" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold">vs</text>
              </g>
            </svg>

            {/* Temperature labels outside SVG */}
            <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', maxWidth: 400, marginBottom: '1.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#f59e0b', fontSize: typo.bodyLarge, fontWeight: 700 }}>35 deg C</p>
                <p style={{ color: '#92400e', fontSize: typo.small }}>HOT</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#3b82f6', fontSize: typo.bodyLarge, fontWeight: 700 }}>-10 deg C</p>
                <p style={{ color: '#1d4ed8', fontSize: typo.small }}>COLD</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: 400 }}>
              {[
                { id: 'a', text: 'Same speed - temperature does not matter' },
                { id: 'b', text: 'Faster in hot air (molecules move faster)' },
                { id: 'c', text: 'Faster in cold air (denser = better conductor)' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onMouseDown={() => handleTwistPrediction(opt.id)}
                  style={{
                    padding: '1rem',
                    background: twistPrediction === opt.id
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(245, 158, 11, 0.15))'
                      : 'rgba(30, 41, 59, 0.8)',
                    color: twistPrediction === opt.id ? '#fbbf24' : '#e2e8f0',
                    border: `1px solid ${twistPrediction === opt.id ? 'rgba(245, 158, 11, 0.5)' : '#334155'}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: typo.body
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
                  fontSize: typo.bodyLarge,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
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
            <h2 style={{ fontSize: typo.heading, marginBottom: '0.5rem', color: '#f8fafc', fontWeight: 700 }}>
              Temperature Effect on Sound Speed
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1rem', textAlign: 'center', fontSize: typo.body }}>
              Adjust temperature and measure sound speed
            </p>

            {/* Temperature display */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2rem',
              marginBottom: '1.5rem'
            }}>
              {/* Premium Thermometer SVG */}
              <svg viewBox="0 0 70 160" style={{ width: 70, height: 160 }}>
                <defs>
                  {/* Thermometer glass gradient */}
                  <linearGradient id="sosThermoGlass" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#475569" />
                    <stop offset="20%" stopColor="#64748b" />
                    <stop offset="50%" stopColor="#94a3b8" />
                    <stop offset="80%" stopColor="#64748b" />
                    <stop offset="100%" stopColor="#475569" />
                  </linearGradient>

                  {/* Hot mercury gradient */}
                  <linearGradient id="sosHotMercury" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fca5a5" />
                    <stop offset="30%" stopColor="#f87171" />
                    <stop offset="70%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>

                  {/* Cold mercury gradient */}
                  <linearGradient id="sosColdMercury" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#93c5fd" />
                    <stop offset="30%" stopColor="#60a5fa" />
                    <stop offset="70%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>

                  {/* Bulb glow filter */}
                  <filter id="sosBulbGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Thermometer outer tube */}
                <rect x="22" y="8" width="20" height="115" fill="url(#sosThermoGlass)" rx="10" />
                {/* Inner tube (white background for mercury) */}
                <rect x="26" y="12" width="12" height="107" fill="#1e293b" rx="6" />

                {/* Mercury column */}
                <rect
                  x="28"
                  y={115 - Math.max(5, (temperature + 25) * 1.5)}
                  width="8"
                  height={Math.max(5, (temperature + 25) * 1.5)}
                  fill={temperature > 20 ? 'url(#sosHotMercury)' : 'url(#sosColdMercury)'}
                  rx="4"
                />

                {/* Bulb with glow */}
                <g filter="url(#sosBulbGlow)">
                  <circle cx="32" cy="138" r="18" fill={temperature > 20 ? 'url(#sosHotMercury)' : 'url(#sosColdMercury)'} />
                </g>
                {/* Bulb highlight */}
                <circle cx="26" cy="132" r="4" fill="white" opacity="0.3" />

                {/* Scale marks and labels */}
                {[-20, -10, 0, 10, 20, 30, 40].map(t => (
                  <g key={t}>
                    <line x1="44" y1={108 - (t + 20) * 1.5} x2="52" y2={108 - (t + 20) * 1.5} stroke="#64748b" strokeWidth="1.5" />
                    <text x="56" y={112 - (t + 20) * 1.5} fill="#94a3b8" fontSize="9" fontWeight="500">{t}</text>
                  </g>
                ))}

                {/* Current temperature indicator */}
                <polygon
                  points={`18,${108 - (temperature + 20) * 1.5} 10,${104 - (temperature + 20) * 1.5} 10,${112 - (temperature + 20) * 1.5}`}
                  fill={temperature > 20 ? '#ef4444' : '#3b82f6'}
                />
              </svg>

              {/* Premium Speed display */}
              <div style={{
                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                padding: '1.5rem',
                borderRadius: 16,
                textAlign: 'center',
                border: '1px solid #334155',
                minWidth: 160
              }}>
                <p style={{ color: '#94a3b8', fontSize: typo.small, marginBottom: '0.5rem' }}>
                  At {temperature} deg C:
                </p>
                <p style={{
                  fontSize: '1.8rem',
                  fontWeight: 'bold',
                  color: '#f8fafc',
                  textShadow: temperature > 20 ? '0 0 10px rgba(239, 68, 68, 0.5)' : '0 0 10px rgba(59, 130, 246, 0.5)'
                }}>
                  {twistSpeed > 0 ? twistSpeed.toFixed(0) : expectedSpeed.toFixed(0)} m/s
                </p>
                <p style={{ color: '#64748b', fontSize: typo.label, marginTop: '0.5rem' }}>
                  Formula: v = 331 + 0.6T
                </p>
                {/* Speed indicator bar */}
                <div style={{
                  marginTop: '0.75rem',
                  height: 6,
                  background: '#334155',
                  borderRadius: 3,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${((expectedSpeed - 300) / 70) * 100}%`,
                    background: temperature > 20
                      ? 'linear-gradient(90deg, #ef4444, #f87171)'
                      : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                    borderRadius: 3,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            </div>

            {/* Temperature slider */}
            <div style={{ width: '100%', maxWidth: 350, marginBottom: '1.5rem' }}>
              <label style={{ color: '#94a3b8', fontSize: typo.body }}>
                Temperature: {temperature} deg C
              </label>
              <input
                type="range"
                min="-20"
                max="45"
                value={temperature}
                onChange={(e) => setTemperature(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: temperature > 20 ? '#ef4444' : '#3b82f6' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typo.small, color: '#64748b' }}>
                <span>-20 deg C (Cold)</span>
                <span>45 deg C (Hot)</span>
              </div>
            </div>

            {/* Speed comparison chart */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))',
              borderRadius: 12,
              padding: '1rem',
              width: '100%',
              maxWidth: 350,
              marginBottom: '1rem',
              border: '1px solid #334155'
            }}>
              <p style={{ color: '#94a3b8', fontSize: typo.small, marginBottom: '0.5rem' }}>
                Speed at different temperatures:
              </p>
              {[-10, 0, 20, 35].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ width: 55, fontSize: typo.small, color: '#e2e8f0' }}>{t} deg C:</span>
                  <div style={{
                    height: 16,
                    width: `${(speedAtTemp(t) - 300) * 2}px`,
                    background: t === temperature
                      ? 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                      : '#334155',
                    borderRadius: 3,
                    transition: 'all 0.3s ease'
                  }} />
                  <span style={{ fontSize: typo.small, color: t === temperature ? '#60a5fa' : '#94a3b8' }}>{speedAtTemp(t).toFixed(0)} m/s</span>
                </div>
              ))}
            </div>

            <button
              onMouseDown={() => {
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
                fontSize: typo.body,
                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)'
              }}
            >
              See Results
            </button>

            {showTwistResult && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: twistPrediction === 'b'
                  ? 'linear-gradient(135deg, rgba(22, 101, 52, 0.3), rgba(34, 197, 94, 0.15))'
                  : 'linear-gradient(135deg, rgba(146, 64, 14, 0.3), rgba(245, 158, 11, 0.15))',
                borderRadius: 12,
                textAlign: 'center',
                maxWidth: 400,
                border: `1px solid ${twistPrediction === 'b' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
              }}>
                <p style={{ fontWeight: 600, color: twistPrediction === 'b' ? '#4ade80' : '#fbbf24', fontSize: typo.bodyLarge }}>
                  {twistPrediction === 'b' ? 'Correct!' : 'Temperature matters!'}
                </p>
                <p style={{ color: '#e2e8f0', fontSize: typo.body, marginTop: '0.5rem' }}>
                  Sound travels <strong style={{ color: '#ef4444' }}>faster in hot air</strong>! At higher temperatures, air molecules
                  move faster and can transmit vibrations more quickly. Each 1 deg C increase adds
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
                    fontWeight: 600,
                    fontSize: typo.body,
                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
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
            <h2 style={{ fontSize: typo.heading, marginBottom: '1rem', color: '#f8fafc', fontWeight: 700 }}>
              Temperature and Sound Speed
            </h2>

            <div style={{
              background: 'linear-gradient(135deg, rgba(202, 138, 4, 0.2), rgba(234, 179, 8, 0.1))',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 500,
              marginBottom: '1.5rem',
              border: '1px solid rgba(234, 179, 8, 0.3)'
            }}>
              <h3 style={{ color: '#fbbf24', marginBottom: '0.75rem', fontSize: typo.bodyLarge }}>The Temperature Formula</h3>

              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                padding: '1rem',
                borderRadius: 10,
                textAlign: 'center',
                marginBottom: '1rem',
                border: '1px solid #334155'
              }}>
                <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#f8fafc' }}>
                  v = 331 + 0.6T (m/s)
                </p>
                <p style={{ fontSize: typo.small, color: '#94a3b8', marginTop: '0.5rem' }}>
                  T = temperature in Celsius
                </p>
              </div>

              <div style={{ fontSize: typo.body, color: '#e2e8f0' }}>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong style={{ color: '#fbbf24' }}>Why hotter = faster?</strong>
                </p>
                <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  <li>Higher temperature = faster molecule motion</li>
                  <li>Faster molecules collide more frequently</li>
                  <li>Sound waves (pressure waves) propagate faster</li>
                </ul>
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(22, 101, 52, 0.2), rgba(34, 197, 94, 0.1))',
              borderRadius: 12,
              padding: '1rem',
              maxWidth: 500,
              marginBottom: '1.5rem',
              border: '1px solid rgba(34, 197, 94, 0.3)'
            }}>
              <h4 style={{ color: '#4ade80', marginBottom: '0.5rem', fontSize: typo.body }}>Practical Impact</h4>
              <p style={{ color: '#e2e8f0', fontSize: typo.body }}>
                This is why outdoor concerts sound different on hot vs cold days!
                Musicians may need to retune instruments as temperature changes
                because the pitch depends on sound speed.
              </p>
            </div>

            <button
              onMouseDown={() => goToPhase('transfer')}
              style={{
                padding: '1rem 2.5rem',
                fontSize: typo.bodyLarge,
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
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
            <h2 style={{ fontSize: typo.heading, marginBottom: '1rem', color: '#f8fafc', fontWeight: 700 }}>
              Sound Speed in the Real World
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', textAlign: 'center', fontSize: typo.body }}>
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
                      ? 'linear-gradient(135deg, rgba(22, 101, 52, 0.3), rgba(34, 197, 94, 0.15))'
                      : 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))',
                    borderRadius: 12,
                    padding: '1rem',
                    cursor: 'pointer',
                    border: `1px solid ${completedApps.has(index) ? 'rgba(34, 197, 94, 0.5)' : '#334155'}`,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{app.icon}</div>
                  <h3 style={{ color: '#f8fafc', fontSize: typo.body, marginBottom: '0.25rem', fontWeight: 600 }}>
                    {app.title}
                    {completedApps.has(index) && <span style={{ color: '#4ade80', marginLeft: '0.5rem' }}>Done</span>}
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: typo.small, marginBottom: '0.5rem' }}>
                    {app.description}
                  </p>
                  {completedApps.has(index) && (
                    <p style={{ color: '#e2e8f0', fontSize: typo.small, fontStyle: 'italic' }}>
                      {app.detail}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <p style={{ color: '#94a3b8', fontSize: typo.body, marginBottom: '1rem' }}>
              {completedApps.size} / {applications.length} applications explored
            </p>

            {completedApps.size >= applications.length && (
              <button
                onMouseDown={() => goToPhase('test')}
                style={{
                  padding: '1rem 2.5rem',
                  fontSize: typo.bodyLarge,
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)'
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
            <h2 style={{ fontSize: typo.heading, marginBottom: '1rem', color: '#f8fafc', fontWeight: 700 }}>
              Speed of Sound Mastery Test
            </h2>

            <div style={{ width: '100%', maxWidth: 600 }}>
              {testQuestions.map((tq, qi) => {
                const isCorrect = tq.options[testAnswers[qi]]?.correct;
                return (
                <div
                  key={qi}
                  style={{
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))',
                    borderRadius: 12,
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: `1px solid ${
                      testSubmitted
                        ? isCorrect
                          ? 'rgba(34, 197, 94, 0.5)'
                          : testAnswers[qi] !== undefined
                          ? 'rgba(239, 68, 68, 0.5)'
                          : '#334155'
                        : '#334155'
                    }`
                  }}
                >
                  <p style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '0.75rem', fontSize: typo.body }}>
                    {qi + 1}. {tq.question}
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
                            ? opt.correct
                              ? 'rgba(34, 197, 94, 0.2)'
                              : testAnswers[qi] === oi
                              ? 'rgba(239, 68, 68, 0.2)'
                              : 'rgba(15, 23, 42, 0.6)'
                            : testAnswers[qi] === oi
                            ? 'rgba(59, 130, 246, 0.2)'
                            : 'rgba(15, 23, 42, 0.6)',
                          color: testSubmitted
                            ? opt.correct
                              ? '#4ade80'
                              : testAnswers[qi] === oi
                              ? '#f87171'
                              : '#e2e8f0'
                            : testAnswers[qi] === oi
                            ? '#60a5fa'
                            : '#e2e8f0',
                          border: `1px solid ${
                            testSubmitted
                              ? opt.correct
                                ? 'rgba(34, 197, 94, 0.5)'
                                : testAnswers[qi] === oi
                                ? 'rgba(239, 68, 68, 0.5)'
                                : '#334155'
                              : testAnswers[qi] === oi
                              ? 'rgba(59, 130, 246, 0.5)'
                              : '#334155'
                          }`,
                          borderRadius: 8,
                          cursor: testSubmitted ? 'default' : 'pointer',
                          fontSize: typo.small
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
                onMouseDown={submitTest}
                disabled={Object.keys(testAnswers).length < testQuestions.length}
                style={{
                  padding: '1rem 2.5rem',
                  fontSize: typo.bodyLarge,
                  background: Object.keys(testAnswers).length < testQuestions.length
                    ? '#475569'
                    : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  cursor: Object.keys(testAnswers).length < testQuestions.length ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  boxShadow: Object.keys(testAnswers).length >= testQuestions.length ? '0 4px 14px rgba(139, 92, 246, 0.4)' : 'none'
                }}
              >
                Submit Test ({Object.keys(testAnswers).length}/{testQuestions.length})
              </button>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: score >= 7 ? '#4ade80' : '#fbbf24',
                  marginBottom: '1rem',
                  textShadow: score >= 7 ? '0 0 10px rgba(74, 222, 128, 0.5)' : '0 0 10px rgba(251, 191, 36, 0.5)'
                }}>
                  Score: {score}/{testQuestions.length} ({Math.round(score / testQuestions.length * 100)}%)
                </p>

                <button
                  onMouseDown={() => goToPhase('mastery')}
                  style={{
                    padding: '1rem 2.5rem',
                    fontSize: typo.bodyLarge,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    cursor: 'pointer',
                    fontWeight: 600,
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
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

        // Generate stable confetti positions (seeded by index)
        const confettiData = [...Array(25)].map((_, i) => ({
          x: (i * 37 + 13) % 300,
          y: (i * 23 + 7) % 80,
          r: 3 + (i % 4),
          color: ['#3b82f6', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4'][i % 6],
          delay: (i * 0.15) % 2,
          duration: 1.5 + (i % 3) * 0.5
        }));

        return (
          <div className="flex flex-col items-center" style={{ textAlign: 'center' }}>
            {/* Premium celebration SVG */}
            <svg viewBox="0 0 120 60" style={{ width: 120, height: 60, marginBottom: '0.5rem' }}>
              <defs>
                {/* Sound wave icon gradient */}
                <linearGradient id="sosSoundIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                {/* Timer icon gradient */}
                <linearGradient id="sosTimerIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
                {/* Trophy gradient */}
                <linearGradient id="sosTrophyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="30%" stopColor="#fbbf24" />
                  <stop offset="70%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
                {/* Icon glow */}
                <filter id="sosIconGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Sound wave icon */}
              <g transform="translate(20, 30)" filter="url(#sosIconGlow)">
                <circle cx="0" cy="0" r="12" fill="url(#sosSoundIconGrad)" />
                {[8, 14, 20].map((r, i) => (
                  <path key={i} d={`M 5,-${r * 0.7} Q ${r},0 5,${r * 0.7}`} fill="none" stroke="url(#sosSoundIconGrad)" strokeWidth="2" opacity={0.8 - i * 0.2}>
                    <animate attributeName="opacity" values={`${0.8 - i * 0.2};${0.3};${0.8 - i * 0.2}`} dur="1.5s" repeatCount="indefinite" />
                  </path>
                ))}
              </g>

              {/* Timer icon */}
              <g transform="translate(60, 30)" filter="url(#sosIconGlow)">
                <circle cx="0" cy="0" r="12" fill="none" stroke="url(#sosTimerIconGrad)" strokeWidth="3" />
                <line x1="0" y1="0" x2="0" y2="-7" stroke="url(#sosTimerIconGrad)" strokeWidth="2" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="4s" repeatCount="indefinite" />
                </line>
                <line x1="0" y1="0" x2="5" y2="0" stroke="url(#sosTimerIconGrad)" strokeWidth="2" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="60s" repeatCount="indefinite" />
                </line>
                <circle cx="0" cy="0" r="2" fill="url(#sosTimerIconGrad)" />
              </g>

              {/* Trophy icon */}
              <g transform="translate(100, 30)" filter="url(#sosIconGlow)">
                <path d="M -8,-10 L 8,-10 L 6,2 L 2,8 L -2,8 L -6,2 Z" fill="url(#sosTrophyGrad)" />
                <rect x="-4" y="8" width="8" height="3" fill="url(#sosTrophyGrad)" />
                <rect x="-6" y="11" width="12" height="2" fill="url(#sosTrophyGrad)" rx="1" />
                <ellipse cx="-10" cy="-5" rx="3" ry="5" fill="none" stroke="url(#sosTrophyGrad)" strokeWidth="2" />
                <ellipse cx="10" cy="-5" rx="3" ry="5" fill="none" stroke="url(#sosTrophyGrad)" strokeWidth="2" />
              </g>
            </svg>

            <h2 style={{ fontSize: typo.title, marginBottom: '0.5rem', color: '#f8fafc', fontWeight: 700 }}>
              Sound Speed Master!
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', maxWidth: 400, fontSize: typo.body }}>
              You can now calculate storm distances and understand how
              temperature affects the speed of sound!
            </p>

            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.2), rgba(59, 130, 246, 0.1))',
              borderRadius: 16,
              padding: '1.5rem',
              maxWidth: 400,
              marginBottom: '1.5rem',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              <h3 style={{ color: '#60a5fa', marginBottom: '1rem', fontSize: typo.bodyLarge }}>Your Achievements</h3>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1rem' }}>
                <div>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f8fafc' }}>
                    {finalScore}/{testQuestions.length}
                  </p>
                  <p style={{ fontSize: typo.small, color: '#94a3b8' }}>Test Score</p>
                </div>
                <div>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f8fafc' }}>4</p>
                  <p style={{ fontSize: typo.small, color: '#94a3b8' }}>Applications</p>
                </div>
              </div>

              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: 10,
                padding: '1rem',
                textAlign: 'left',
                border: '1px solid #334155'
              }}>
                <p style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '0.5rem', fontSize: typo.body }}>
                  Key Takeaways:
                </p>
                <ul style={{ color: '#94a3b8', fontSize: typo.small, paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                  <li>Sound speed = 343 m/s at 20 deg C</li>
                  <li>v = 331 + 0.6T (temperature effect)</li>
                  <li>Echo method: v = 2d / t</li>
                  <li>5 seconds = 1 mile (storm distance)</li>
                </ul>
              </div>
            </div>

            {/* Premium Confetti SVG */}
            <svg viewBox="0 0 300 100" style={{ width: '100%', maxWidth: 300 }}>
              <defs>
                {/* Confetti glow filter */}
                <filter id="sosConfettiGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {confettiData.map((c, i) => (
                <g key={i} filter="url(#sosConfettiGlow)">
                  {i % 3 === 0 ? (
                    // Circle confetti
                    <circle cx={c.x} cy={c.y} r={c.r} fill={c.color}>
                      <animate attributeName="cy" values={`${c.y};${c.y + 60};${c.y}`} dur={`${c.duration}s`} begin={`${c.delay}s`} repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0.3;1" dur={`${c.duration}s`} begin={`${c.delay}s`} repeatCount="indefinite" />
                      <animateTransform attributeName="transform" type="rotate" from={`0 ${c.x} ${c.y}`} to={`360 ${c.x} ${c.y + 30}`} dur={`${c.duration}s`} begin={`${c.delay}s`} repeatCount="indefinite" />
                    </circle>
                  ) : i % 3 === 1 ? (
                    // Square confetti
                    <rect x={c.x - c.r} y={c.y - c.r} width={c.r * 2} height={c.r * 2} fill={c.color} rx="1">
                      <animate attributeName="y" values={`${c.y - c.r};${c.y + 60 - c.r};${c.y - c.r}`} dur={`${c.duration}s`} begin={`${c.delay}s`} repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0.3;1" dur={`${c.duration}s`} begin={`${c.delay}s`} repeatCount="indefinite" />
                      <animateTransform attributeName="transform" type="rotate" from={`0 ${c.x} ${c.y}`} to={`360 ${c.x} ${c.y + 30}`} dur={`${c.duration * 0.8}s`} begin={`${c.delay}s`} repeatCount="indefinite" />
                    </rect>
                  ) : (
                    // Star/diamond confetti
                    <polygon points={`${c.x},${c.y - c.r} ${c.x + c.r * 0.6},${c.y} ${c.x},${c.y + c.r} ${c.x - c.r * 0.6},${c.y}`} fill={c.color}>
                      <animate attributeName="transform" type="translate" values={`0,0;0,60;0,0`} dur={`${c.duration}s`} begin={`${c.delay}s`} repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0.3;1" dur={`${c.duration}s`} begin={`${c.delay}s`} repeatCount="indefinite" />
                    </polygon>
                  )}
                </g>
              ))}
            </svg>

            <button
              onMouseDown={() => {
                onPhaseComplete?.();
                playSound('complete');
              }}
              style={{
                marginTop: '1rem',
                padding: '1rem 2.5rem',
                fontSize: typo.bodyLarge,
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
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
