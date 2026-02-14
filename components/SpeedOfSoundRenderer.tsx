'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Speed of Sound - Complete 10-Phase Game
// Measure and understand the speed of sound through interactive experiments
// -----------------------------------------------------------------------------

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface SpeedOfSoundRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
      click: { freq: 600, duration: 0.1, type: 'sine' },
      success: { freq: 800, duration: 0.2, type: 'sine' },
      failure: { freq: 300, duration: 0.3, type: 'sine' },
      transition: { freq: 500, duration: 0.15, type: 'sine' },
      complete: { freq: 900, duration: 0.4, type: 'sine' }
    };
    const sound = sounds[type];
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "You're watching a fireworks display from a safe distance. You see a beautiful explosion in the sky, then about 3 seconds later you hear the boom.",
    question: "Approximately how far away are the fireworks?",
    options: [
      { id: 'a', label: "About 100 meters" },
      { id: 'b', label: "About 500 meters" },
      { id: 'c', label: "About 1 kilometer", correct: true },
      { id: 'd', label: "About 3 kilometers" }
    ],
    explanation: "Sound travels at about 343 m/s at room temperature. In 3 seconds, sound travels approximately 3 x 343 = 1,029 meters, or about 1 kilometer. Light arrives almost instantly, so the delay is entirely due to sound travel time."
  },
  {
    scenario: "A submarine captain needs to determine the depth of the ocean floor. The sonar pulse takes 4 seconds to return after being sent.",
    question: "What is the approximate depth to the ocean floor?",
    options: [
      { id: 'a', label: "About 1,500 meters" },
      { id: 'b', label: "About 3,000 meters", correct: true },
      { id: 'c', label: "About 6,000 meters" },
      { id: 'd', label: "About 750 meters" }
    ],
    explanation: "Sound travels at about 1,500 m/s in seawater. The sonar pulse travels down AND back, so the one-way distance is half the total time: 2 seconds x 1,500 m/s = 3,000 meters depth."
  },
  {
    scenario: "An outdoor concert is held on a hot summer day (35°C) versus a cold winter evening (-10°C). The stage is 100 meters from the back row.",
    question: "How does temperature affect when the back row hears the music?",
    options: [
      { id: 'a', label: "No difference - sound speed is constant" },
      { id: 'b', label: "Sound arrives faster on the hot day", correct: true },
      { id: 'c', label: "Sound arrives faster on the cold night" },
      { id: 'd', label: "Temperature only affects loudness, not speed" }
    ],
    explanation: "Sound speed increases with temperature (v = 331 + 0.6T m/s). At 35°C, v ≈ 352 m/s. At -10°C, v ≈ 325 m/s. The hot day sound arrives about 8 milliseconds faster - enough to affect musicians' timing!"
  },
  {
    scenario: "A geologist taps a steel rail with a hammer. Her colleague 1 km away puts his ear to the rail and hears TWO sounds - one through the rail, then one through the air.",
    question: "Why does sound through the steel rail arrive first?",
    options: [
      { id: 'a', label: "Steel is less dense than air" },
      { id: 'b', label: "The rail guides the sound like a pipe" },
      { id: 'c', label: "Sound travels about 15x faster in steel than in air", correct: true },
      { id: 'd', label: "Air absorbs more sound energy" }
    ],
    explanation: "Sound travels at about 5,100 m/s in steel versus 343 m/s in air - roughly 15 times faster! The molecules in solids are tightly bonded, allowing vibrations to propagate much faster. Through steel: ~0.2s. Through air: ~2.9s."
  },
  {
    scenario: "A bat emits ultrasonic pulses and uses the echoes to navigate and hunt insects in complete darkness. This is called echolocation.",
    question: "What does the bat's brain calculate from the echo timing?",
    options: [
      { id: 'a', label: "Only the size of the object" },
      { id: 'b', label: "Only the direction of the object" },
      { id: 'c', label: "Distance to the object using v = d/t", correct: true },
      { id: 'd', label: "The color of the object" }
    ],
    explanation: "The bat's brain instinctively uses v = d/t. Knowing sound speed and measuring the time for echoes to return, the bat calculates distance with incredible precision - accurate to within millimeters, allowing it to catch tiny insects mid-flight."
  },
  {
    scenario: "Thunder rumbles for several seconds instead of being a single sharp crack. This happens because lightning bolts are often several kilometers long.",
    question: "Why does thunder from a long lightning bolt rumble instead of crack?",
    options: [
      { id: 'a', label: "The clouds absorb some frequencies" },
      { id: 'b', label: "Different parts of the bolt are at different distances, so sounds arrive at different times", correct: true },
      { id: 'c', label: "Thunder naturally vibrates at low frequencies" },
      { id: 'd', label: "Rain droplets scatter the sound" }
    ],
    explanation: "A lightning bolt several km long means different parts are at different distances from you. Sound from the closest part arrives first, then sounds from progressively farther parts arrive later, creating the rumbling effect that can last several seconds."
  },
  {
    scenario: "A medical ultrasound technician is imaging a patient. The ultrasound probe emits pulses and receives echoes from internal organs at different depths.",
    question: "What assumption must the ultrasound machine make to calculate organ positions?",
    options: [
      { id: 'a', label: "All organs have the same density" },
      { id: 'b', label: "Sound speed in body tissue is approximately constant (~1,540 m/s)", correct: true },
      { id: 'c', label: "Sound travels in straight lines only" },
      { id: 'd', label: "Organs don't move during the scan" }
    ],
    explanation: "Ultrasound machines assume sound travels at about 1,540 m/s through soft tissue. This allows them to convert echo timing to distance. Different tissues (fat, muscle, bone) have slightly different speeds, which can cause small imaging errors."
  },
  {
    scenario: "At a track and field event, the starter uses a gun that produces both a flash and a bang. Timers at the finish line start their stopwatches when they see the flash.",
    question: "Why do timers use the flash, not the bang, to start timing?",
    options: [
      { id: 'a', label: "The flash is more visible" },
      { id: 'b', label: "Light arrives almost instantly while sound would add ~0.3 seconds delay for a 100m track", correct: true },
      { id: 'c', label: "Sound might not be loud enough" },
      { id: 'd', label: "The gun flash happens before the sound is made" }
    ],
    explanation: "Light travels at 300,000,000 m/s (essentially instant). Sound at 343 m/s takes about 0.3 seconds to travel 100 meters. In a 100m dash where records differ by hundredths of seconds, this would be a massive timing error!"
  },
  {
    scenario: "Dolphins use echolocation to find fish. They emit clicking sounds and listen for echoes. In tropical waters, the speed of sound is about 1,530 m/s.",
    question: "If a dolphin detects an echo 0.02 seconds after clicking, how far away is the fish?",
    options: [
      { id: 'a', label: "About 30 meters" },
      { id: 'b', label: "About 15 meters", correct: true },
      { id: 'c', label: "About 60 meters" },
      { id: 'd', label: "About 7.5 meters" }
    ],
    explanation: "Distance = (speed × time) / 2 (divided by 2 because sound travels to the fish AND back). So: (1,530 m/s × 0.02 s) / 2 = 15.3 meters. The dolphin's brain does this calculation unconsciously in milliseconds!"
  },
  {
    scenario: "Engineers designing a concert hall must carefully plan the shape so that sound reflections enhance rather than distort the music. First reflections should arrive within 20ms of direct sound.",
    question: "For the 20ms rule, how close must the first reflecting surface be to the sound path?",
    options: [
      { id: 'a', label: "About 3.4 meters extra path length" },
      { id: 'b', label: "About 6.9 meters extra path length", correct: true },
      { id: 'c', label: "About 20 meters extra path length" },
      { id: 'd', label: "About 1 meter extra path length" }
    ],
    explanation: "In 20ms = 0.02s, sound travels 343 m/s × 0.02s = 6.86 meters. The reflected path can be at most 6.9 meters longer than the direct path. This determines where walls and ceiling panels must be placed for good acoustics."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🔊',
    title: 'Sonar & Echolocation',
    short: 'Underwater navigation using sound waves',
    tagline: 'Seeing with sound in the deep',
    description: 'Submarines and marine vessels use sonar to detect objects underwater by measuring the time for sound to echo back. Since light cannot penetrate deep water, sound is the primary sensing method in oceans.',
    connection: 'Sonar directly applies v = d/t. Knowing the speed of sound in water (about 1,500 m/s) allows calculating distance from echo time. Temperature and salinity affect speed, requiring careful calibration.',
    howItWorks: 'Active sonar emits pulses and times echoes. Passive sonar listens for sounds. The speed of sound in seawater varies with depth, temperature, and salinity, creating "sound channels" that bend acoustic rays.',
    stats: [
      { value: '1500', label: 'm/s in seawater', icon: '🌊' },
      { value: '10km', label: 'Detection range', icon: '📡' },
      { value: '4x', label: 'Faster than in air', icon: '⚡' }
    ],
    examples: ['Submarine detection', 'Fish finding', 'Seafloor mapping', 'Underwater communication'],
    companies: ['Raytheon', 'Thales', 'Kongsberg', 'L3Harris'],
    futureImpact: 'Autonomous underwater vehicles will use advanced sonar arrays and AI to explore ocean depths, map the seafloor, and monitor marine ecosystems.',
    color: '#3B82F6'
  },
  {
    icon: '🏥',
    title: 'Medical Ultrasound',
    short: 'Imaging inside the body with sound',
    tagline: 'Safe imaging without radiation',
    description: 'Ultrasound imaging uses high-frequency sound waves to create images of organs, fetuses, and blood flow. It is safe, real-time, and portable, making it essential in medicine.',
    connection: 'Medical ultrasound measures the time for sound echoes to return from tissue interfaces. The speed of sound in tissue (about 1,540 m/s) is used to calculate depths and create images.',
    howItWorks: 'A transducer emits ultrasound pulses (1-20 MHz) and detects echoes. Different tissues reflect sound differently based on acoustic impedance. The time delay gives depth; amplitude gives brightness.',
    stats: [
      { value: '1540', label: 'm/s in soft tissue', icon: '🫀' },
      { value: '0.1mm', label: 'Resolution possible', icon: '🔬' },
      { value: '140M', label: 'Scans per year (US)', icon: '📊' }
    ],
    examples: ['Fetal imaging', 'Cardiac echo', 'Guided biopsies', 'Vascular doppler'],
    companies: ['GE Healthcare', 'Philips', 'Siemens Healthineers', 'Canon Medical'],
    futureImpact: 'Portable AI-powered ultrasound devices will bring imaging to remote areas and enable point-of-care diagnostics globally.',
    color: '#EC4899'
  },
  {
    icon: '🎭',
    title: 'Concert Hall Acoustics',
    short: 'Designing spaces for perfect sound',
    tagline: 'Where physics meets art',
    description: 'Concert halls are carefully designed so sound reaches every seat with proper delay, clarity, and reverberation. The speed of sound determines optimal room dimensions and surface placements.',
    connection: 'The speed of sound determines how long sound takes to travel from stage to listener and reflect off surfaces. Delays over 50ms cause echoes; careful design ensures reflections enhance rather than muddy the sound.',
    howItWorks: 'Acoustic engineers calculate reflection paths using the speed of sound. Surfaces are angled to direct early reflections toward listeners. Diffusers scatter sound to prevent flutter echoes.',
    stats: [
      { value: '1.5-2s', label: 'Optimal reverberation', icon: '🎵' },
      { value: '17ms', label: 'Per 6m of travel', icon: '⏱️' },
      { value: '$100M+', label: 'Major hall construction', icon: '🏛️' }
    ],
    examples: ['Sydney Opera House', 'Carnegie Hall', 'Berlin Philharmonie', 'Walt Disney Concert Hall'],
    companies: ['Arup Acoustics', 'Nagata Acoustics', 'Kirkegaard', 'Threshold Acoustics'],
    futureImpact: 'Variable acoustics systems using movable panels and electronic enhancement will allow single venues to optimize for symphony, opera, or amplified music.',
    color: '#F59E0B'
  },
  {
    icon: '⛈️',
    title: 'Lightning Distance',
    short: 'Calculating storm proximity by sound delay',
    tagline: 'Flash-to-bang tells the truth',
    description: 'The "flash-to-bang" method uses the delay between seeing lightning and hearing thunder to estimate storm distance. This simple application of sound speed helps people stay safe during thunderstorms.',
    connection: 'Light travels almost instantaneously, while sound travels at about 343 m/s. Counting seconds between flash and bang, then dividing by 3, gives distance in kilometers.',
    howItWorks: 'Lightning heats air to 30,000K in microseconds, creating a supersonic shockwave that becomes thunder. The 5-second-per-mile rule (or 3-second-per-km) uses v = d/t with sound speed ≈ 340 m/s.',
    stats: [
      { value: '5sec', label: 'Per mile to thunder', icon: '⚡' },
      { value: '30000K', label: 'Lightning temperature', icon: '🌡️' },
      { value: '25M', label: 'Lightning strikes/year', icon: '🌍' }
    ],
    examples: ['Outdoor safety protocols', 'Sports event decisions', 'Aviation weather', 'Emergency management'],
    companies: ['Vaisala', 'Earth Networks', 'AccuWeather', 'National Weather Service'],
    futureImpact: 'Lightning location networks using arrival time differences at multiple sensors provide real-time mapping of storm electrical activity for safety and research.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const SpeedOfSoundRenderer: React.FC<SpeedOfSoundRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

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

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Speed of sound at temperature (simplified formula)
  const speedAtTemp = (temp: number) => 331 + 0.6 * temp;

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#3B82F6', // Blue for sound/waves theme
    accentGlow: 'rgba(59, 130, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#e2e8f0',
    border: '#2a2a3a',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Temperature',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'speed-of-sound',
        gameTitle: 'Speed of Sound',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

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

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: '56px',
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1001,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #1D4ED8)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    minHeight: '44px',
  };

  // Nav bar component
  const renderNavBar = () => (
    <nav
      data-testid="nav-bar"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: colors.bgSecondary,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 1000,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>🔊</span>
        <span style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>
          Speed of Sound
        </span>
      </div>
      <div style={{ ...typo.small, color: colors.textSecondary }}>
        {phaseLabels[phase]}
      </div>
    </nav>
  );

  // Echo Visualization Component
  const EchoVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 180 : 220;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="soundWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="echoWaveGrad" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.3" />
          </linearGradient>
          <filter id="waveGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width/2} y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Echo Measurement
        </text>

        {/* Person */}
        <g transform="translate(40, 80)">
          <circle cx="0" cy="0" r="12" fill="#FCD34D" />
          <rect x="-8" y="14" width="16" height="30" fill="#3B82F6" rx="3" />
          <line x1="-4" y1="44" x2="-6" y2="65" stroke="#1E293B" strokeWidth="5" strokeLinecap="round" />
          <line x1="4" y1="44" x2="6" y2="65" stroke="#1E293B" strokeWidth="5" strokeLinecap="round" />
          <text x="0" y="85" textAnchor="middle" fill={colors.textMuted} fontSize="10">You</text>
        </g>

        {/* Wall */}
        <rect x={width - 50} y="40" width="30" height="120" fill="#475569" rx="3" />
        <text x={width - 35} y="175" textAnchor="middle" fill={colors.textMuted} fontSize="10">Wall</text>

        {/* Sound wave going out */}
        {soundWavePos >= 0 && (
          <g filter="url(#waveGlow)">
            <circle
              cx={60 + soundWavePos * (width - 130) / 100}
              cy="95"
              r="15"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="4"
              opacity={1 - soundWavePos / 150}
            />
            <circle
              cx={60 + soundWavePos * (width - 130) / 100}
              cy="95"
              r="8"
              fill="none"
              stroke="#FBBF24"
              strokeWidth="2"
              opacity={1 - soundWavePos / 120}
            />
          </g>
        )}

        {/* Echo wave coming back */}
        {echoWavePos >= 0 && (
          <g filter="url(#waveGlow)">
            <circle
              cx={60 + echoWavePos * (width - 130) / 100}
              cy="95"
              r="15"
              fill="none"
              stroke="#10B981"
              strokeWidth="4"
              opacity={echoWavePos / 100}
            />
            <circle
              cx={60 + echoWavePos * (width - 130) / 100}
              cy="95"
              r="8"
              fill="none"
              stroke="#34D399"
              strokeWidth="2"
              opacity={echoWavePos / 80}
            />
          </g>
        )}

        {/* Distance label */}
        <line x1="60" y1="35" x2={width - 55} y2="35" stroke={colors.success} strokeWidth="2" />
        <polygon points={`${width - 55},35 ${width - 65},30 ${width - 65},40`} fill={colors.success} />
        <polygon points="60,35 70,30 70,40" fill={colors.success} />
        <text x={width/2} y="28" textAnchor="middle" fill={colors.success} fontSize="12" fontWeight="600">
          {distance} m
        </text>

        {/* Timer */}
        <rect x={width/2 - 55} y={height - 35} width="110" height="28" rx="6" fill={colors.bgSecondary} stroke={colors.border} />
        <text x={width/2} y={height - 16} textAnchor="middle" fill={colors.success} fontSize="14" fontFamily="monospace" fontWeight="bold">
          {elapsedTime.toFixed(3)} s
        </text>
      </svg>
    );
  };

  // Temperature Visualization
  const TemperatureVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 200 : 240;
    const expectedSpeed = speedAtTemp(temperature);

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="hotGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FCA5A5" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
          <linearGradient id="coldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>

        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Temperature Effect on Sound Speed
        </text>

        {/* Thermometer */}
        <g transform="translate(60, 50)">
          <rect x="-8" y="0" width="16" height="100" fill={colors.bgSecondary} rx="8" stroke={colors.border} />
          <rect
            x="-5"
            y={90 - Math.max(5, (temperature + 30) * 1.3)}
            width="10"
            height={Math.max(5, (temperature + 30) * 1.3)}
            fill={temperature > 20 ? 'url(#hotGrad)' : 'url(#coldGrad)'}
            rx="5"
          />
          <circle cx="0" cy="115" r="18" fill={temperature > 20 ? 'url(#hotGrad)' : 'url(#coldGrad)'} />

          {/* Scale */}
          {[-20, 0, 20, 40].map(t => (
            <g key={t}>
              <line x1="12" y1={90 - (t + 25) * 1.3} x2="20" y2={90 - (t + 25) * 1.3} stroke={colors.textMuted} />
              <text x="25" y={93 - (t + 25) * 1.3} fill={colors.textMuted} fontSize="10">{t}°</text>
            </g>
          ))}
        </g>

        {/* Speed display */}
        <g transform={`translate(${width/2 + 40}, 70)`}>
          <rect x="-80" y="-20" width="160" height="80" rx="12" fill={colors.bgSecondary} stroke={colors.border} />
          <text x="0" y="0" textAnchor="middle" fill={colors.textMuted} fontSize="12">
            At {temperature}°C:
          </text>
          <text x="0" y="30" textAnchor="middle" fill={colors.textPrimary} fontSize="28" fontWeight="700">
            {expectedSpeed.toFixed(0)} m/s
          </text>
          <text x="0" y="48" textAnchor="middle" fill={colors.textMuted} fontSize="10">
            v = 331 + 0.6T
          </text>
        </g>

        {/* Speed comparison bar */}
        <g transform={`translate(${width/2 - 80}, ${height - 55})`}>
          <text x="80" y="-8" textAnchor="middle" fill={colors.textMuted} fontSize="11">Speed Range</text>
          <rect x="0" y="0" width="160" height="20" rx="4" fill={colors.bgSecondary} />
          <rect
            x="0"
            y="0"
            width={Math.max(10, (expectedSpeed - 300) * 2)}
            height="20"
            rx="4"
            fill={temperature > 20 ? '#EF4444' : '#3B82F6'}
          />
          <text x="0" y="35" fill={colors.textMuted} fontSize="9">300</text>
          <text x="160" y="35" textAnchor="end" fill={colors.textMuted} fontSize="9">380 m/s</text>
        </g>
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingTop: '80px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          ⚡🔊
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Speed of Sound
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          You see the lightning flash... 1... 2... 3... <span style={{ color: colors.warning }}>BOOM!</span> The thunder arrives.
          How far away was that storm? And <span style={{ color: colors.accent }}>how fast does sound travel</span>?
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
            "Count the seconds between lightning and thunder, divide by 5, and you have the distance in miles.
            This simple trick uses one of the most fundamental properties of waves - their speed through a medium."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Basic Physics of Sound
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Start Learning
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // Static Prediction Diagram SVG
  const PredictDiagramSVG = () => {
    const width = isMobile ? 340 : 480;
    const height = 150;
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        {/* Person */}
        <g transform="translate(50, 50)">
          <circle cx="0" cy="0" r="15" fill="#FCD34D" />
          <rect x="-10" y="18" width="20" height="35" fill="#3B82F6" rx="3" />
          <text x="0" y="75" textAnchor="middle" fill={colors.textSecondary} fontSize="12">You</text>
          <text x="0" y="90" textAnchor="middle" fill={colors.warning} fontSize="10">CLAP!</text>
        </g>

        {/* Arrow */}
        <line x1="90" y1="60" x2={width - 90} y2="60" stroke={colors.warning} strokeWidth="3" />
        <polygon points={`${width - 90},60 ${width - 100},55 ${width - 100},65`} fill={colors.warning} />
        <text x={width / 2} y="45" textAnchor="middle" fill={colors.success} fontSize="14" fontWeight="600">170 m</text>

        {/* Wall */}
        <rect x={width - 60} y="30" width="30" height="80" fill="#475569" rx="3" />
        <text x={width - 45} y="130" textAnchor="middle" fill={colors.textSecondary} fontSize="12">Wall</text>

        {/* Round trip label */}
        <text x={width / 2} y={height - 10} textAnchor="middle" fill={colors.textSecondary} fontSize="11">
          Round trip = 340 meters total
        </text>
      </svg>
    );
  };

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'About 34 m/s - similar to a fast car on the highway' },
      { id: 'b', text: 'About 343 m/s - faster than most commercial jets!', correct: true },
      { id: 'c', text: 'About 3,000 m/s - almost as fast as a bullet' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            You stand 170 meters from a wall and clap your hands. About how fast does the sound travel to the wall and back?
          </h2>

          {/* Static SVG diagram */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '24px',
          }}>
            <PredictDiagramSVG />
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setPrediction(opt.id); }}
                style={{
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minHeight: '44px',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: prediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {prediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Test My Prediction
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Echo Measurement
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Echo Experiment
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Clap to send a sound wave and time the echo!
          </p>

          {/* Observation guidance */}
          <div style={{
            background: `${colors.accent}15`,
            border: `1px solid ${colors.accent}44`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.accent }}>Observe:</strong> Watch the sound wave travel to the wall and return as an echo. Notice how the time changes when you adjust the distance.
            </p>
          </div>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <EchoVisualization />
            </div>

            {/* Distance slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Distance to Wall</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{distance} meters</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="10"
                value={distance}
                onChange={(e) => { setDistance(parseInt(e.target.value)); resetMeasurement(); }}
                disabled={measuring}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: measuring ? 'not-allowed' : 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>50m</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>500m</span>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
              <button
                onClick={makeSound}
                disabled={measuring}
                style={{
                  padding: '14px 32px',
                  borderRadius: '10px',
                  border: 'none',
                  background: measuring ? colors.border : 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '18px',
                  cursor: measuring ? 'not-allowed' : 'pointer',
                  boxShadow: measuring ? 'none' : '0 4px 15px rgba(245, 158, 11, 0.4)',
                  minHeight: '44px',
                }}
              >
                {measuring ? 'Measuring...' : 'CLAP!'}
              </button>
              {hasMeasured && !measuring && (
                <button
                  onClick={resetMeasurement}
                  style={{
                    padding: '14px 24px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.textSecondary,
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  Reset
                </button>
              )}
            </div>

            {/* Results */}
            {calculatedSpeed > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.warning }}>{distance * 2} m</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Round Trip</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.success }}>{elapsedTime.toFixed(3)} s</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Time Elapsed</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.accent }}>{calculatedSpeed.toFixed(0)} m/s</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Sound Speed</div>
                </div>
              </div>
            )}
          </div>

          {/* Discovery prompt */}
          {calculatedSpeed > 0 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Sound travels at about 343 m/s - faster than most jet planes but much slower than light!
              </p>
            </div>
          )}

          {calculatedSpeed > 0 && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Continue
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Sound Speed
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>v = d / t (Speed = Distance / Time)</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                For echoes, sound travels there AND back, so the formula becomes:
              </p>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                marginBottom: '16px',
              }}>
                <span style={{ fontSize: '24px', color: colors.accent, fontWeight: 700 }}>
                  v = 2d / t
                </span>
              </div>
              <p>
                At room temperature (20°C), sound in air travels at approximately <span style={{ color: colors.success }}>343 m/s</span>.
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              Speed Comparison
            </h3>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${colors.border}` }}>
                <span>Walking</span>
                <span style={{ color: colors.textPrimary }}>~1.5 m/s</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${colors.border}` }}>
                <span>Highway car</span>
                <span style={{ color: colors.textPrimary }}>~30 m/s</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${colors.border}`, background: `${colors.success}22` }}>
                <span style={{ fontWeight: 700, color: colors.success }}>Sound in air</span>
                <span style={{ fontWeight: 700, color: colors.success }}>~343 m/s</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${colors.border}` }}>
                <span>Commercial jet</span>
                <span style={{ color: colors.textPrimary }}>~250 m/s</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${colors.border}` }}>
                <span>Sound in water</span>
                <span style={{ color: colors.textPrimary }}>~1,500 m/s</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span>Sound in steel</span>
                <span style={{ color: colors.textPrimary }}>~5,100 m/s</span>
              </div>
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
              The Flash-to-Bang Rule
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Light travels almost instantly (300,000,000 m/s). Sound takes about <strong>5 seconds per mile</strong> (or 3 seconds per km).
              Count the seconds between lightning and thunder, divide by 5, and you know how many miles away the storm is!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Continue
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Same speed - temperature has no effect on sound' },
      { id: 'b', text: 'Faster in hot air - molecules move faster', correct: true },
      { id: 'c', text: 'Faster in cold air - denser means better conduction' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Temperature
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            On a hot summer day (35°C) versus a cold winter night (-10°C), does sound travel at the same speed?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>Sun</div>
                <p style={{ color: '#EF4444', fontWeight: 700, fontSize: '20px' }}>35°C</p>
                <p style={{ color: colors.textMuted, ...typo.small }}>Hot Summer Day</p>
              </div>
              <div style={{ fontSize: '32px', color: colors.textMuted, alignSelf: 'center' }}>vs</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>Snow</div>
                <p style={{ color: '#3B82F6', fontWeight: 700, fontSize: '20px' }}>-10°C</p>
                <p style={{ color: colors.textMuted, ...typo.small }}>Cold Winter Night</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Continue
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const expectedSpeed = speedAtTemp(temperature);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Temperature and Sound Speed
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Adjust the temperature and watch how sound speed changes
          </p>

          {/* Observation guidance */}
          <div style={{
            background: `${colors.accent}15`,
            border: `1px solid ${colors.accent}44`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.accent }}>Observe:</strong> Drag the temperature slider and watch how the speed of sound changes. Hotter air means faster sound!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <TemperatureVisualization />
            </div>

            {/* Temperature slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Temperature</span>
                <span style={{ ...typo.small, color: temperature > 20 ? '#EF4444' : '#3B82F6', fontWeight: 600 }}>{temperature}°C</span>
              </div>
              <input
                type="range"
                min="-30"
                max="50"
                value={temperature}
                onChange={(e) => setTemperature(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: '#3B82F6' }}>-30°C (Arctic)</span>
                <span style={{ ...typo.small, color: '#EF4444' }}>50°C (Desert)</span>
              </div>
            </div>

            {/* Speed examples */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
            }}>
              {[-20, 0, 20, 40].map(t => (
                <div key={t} style={{
                  background: t === temperature ? `${colors.accent}33` : colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px 8px',
                  textAlign: 'center',
                  border: t === temperature ? `2px solid ${colors.accent}` : 'none',
                }}>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{t}°C</div>
                  <div style={{ ...typo.body, color: t === temperature ? colors.accent : colors.textPrimary, fontWeight: 600 }}>
                    {speedAtTemp(t).toFixed(0)} m/s
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background: `${colors.success}22`,
            border: `1px solid ${colors.success}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
              At {temperature}°C, sound travels at {expectedSpeed.toFixed(0)} m/s -
              that is {(expectedSpeed - 343).toFixed(0)} m/s {expectedSpeed > 343 ? 'faster' : 'slower'} than at 20°C!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Continue
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Temperature Matters
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Formula</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>The Temperature Formula</h3>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                marginBottom: '12px',
              }}>
                <span style={{ fontSize: '28px', color: colors.accent, fontWeight: 700, fontFamily: 'monospace' }}>
                  v = 331 + 0.6T
                </span>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Where v is speed in m/s and T is temperature in Celsius. Each degree adds about 0.6 m/s to the speed of sound.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Molecules</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Molecular Motion</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                At higher temperatures, air molecules move faster and collide more frequently.
                Sound is a pressure wave transmitted through these collisions, so faster-moving molecules = faster sound propagation.
              </p>
            </div>

            <div style={{
              background: `${colors.warning}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.warning}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>Music</span>
                <h3 style={{ ...typo.h3, color: colors.warning, margin: 0 }}>Real-World Impact</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Musicians at outdoor concerts may need to retune as temperature changes!
                Wind instruments change pitch because the sound wavelength depends on air temperature.
                A 10°C change can cause noticeable pitch shifts.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Continue
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

          {/* Progress indicator */}
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Application {selectedApp + 1} of {realWorldApps.length}
          </p>

          {/* App selector */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}>
            {realWorldApps.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  playSound('click');
                  setSelectedApp(i);
                  const newCompleted = [...completedApps];
                  newCompleted[i] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{
                  background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                  border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative',
                  minHeight: '44px',
                }}
              >
                {completedApps[i] && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: colors.success,
                    color: 'white',
                    fontSize: '12px',
                    lineHeight: '18px',
                  }}>
                    ok
                  </div>
                )}
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
                <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>
                  {a.title.split(' ').slice(0, 2).join(' ')}
                </div>
              </button>
            ))}
          </div>

          {/* Selected app details */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            borderLeft: `4px solid ${app.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '48px' }}>{app.icon}</span>
              <div>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              {app.description}
            </p>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                How Sound Speed Connects:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100vh',
          background: colors.bgPrimary,
          padding: '24px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? 'Trophy' : 'Book'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand sound speed and its applications!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson
              </button>
            ) : (
              <button
                onClick={() => {
                  setTestSubmitted(false);
                  setTestAnswers(Array(10).fill(null));
                  setCurrentQuestion(0);
                  setTestScore(0);
                  goToPhase('hook');
                }}
                style={primaryButtonStyle}
              >
                Review and Try Again
              </button>
            )}
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Question {currentQuestion + 1} of 10
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: i === currentQuestion
                    ? colors.accent
                    : testAnswers[i]
                      ? colors.success
                      : colors.border,
                }} />
              ))}
            </div>
          </div>

          {/* Scenario */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {question.scenario}
            </p>
          </div>

          {/* Question */}
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
            {question.question}
          </h3>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {question.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  const newAnswers = [...testAnswers];
                  newAnswers[currentQuestion] = opt.id;
                  setTestAnswers(newAnswers);
                }}
                style={{
                  background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '24px',
                  marginRight: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => {
                  const score = testAnswers.reduce((acc, ans, i) => {
                    const correct = testQuestions[i].options.find(o => o.correct)?.id;
                    return acc + (ans === correct ? 1 : 0);
                  }, 0);
                  setTestScore(score);
                  setTestSubmitted(true);
                  playSound(score >= 7 ? 'complete' : 'failure');
                }}
                disabled={testAnswers.some(a => a === null)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          Trophy
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Sound Speed Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how sound travels through air, how temperature affects it, and how this physics is used in real-world applications!
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            Key Takeaways:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Sound travels at ~343 m/s at 20°C',
              'Speed formula: v = 331 + 0.6T m/s',
              'Echo method: v = 2d / t',
              '5 seconds = 1 mile (flash-to-bang)',
              'Sound is faster in solids and liquids',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>Check</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '14px 28px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
            }}
          >
            Play Again
          </button>
          <a
            href="/"
            style={{
              ...primaryButtonStyle,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Return to Dashboard
          </a>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default SpeedOfSoundRenderer;
