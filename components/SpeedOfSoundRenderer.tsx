'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

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
    scenario: "You're watching a fireworks display from a safe distance. You see a beautiful explosion in the sky, then about 3 seconds later you hear the boom. Sound travels at about 343 m/s at room temperature. Light arrives essentially instantaneously.",
    question: "Approximately how far away are the fireworks?",
    options: [
      { id: 'a', label: "About 100 meters" },
      { id: 'b', label: "About 500 meters" },
      { id: 'c', label: "About 1 kilometer", correct: true },
      { id: 'd', label: "About 3 kilometers" }
    ],
    explanation: "Sound travels at about 343 m/s at room temperature. In 3 seconds, sound travels approximately 3 × 343 = 1,029 meters, or about 1 kilometer. Light arrives almost instantly, so the delay is entirely due to sound travel time."
  },
  {
    scenario: "A submarine captain needs to determine the depth of the ocean floor. The sonar pulse takes 4 seconds to return after being sent. Sound travels at about 1,500 m/s in seawater. The pulse travels down AND back.",
    question: "What is the approximate depth to the ocean floor?",
    options: [
      { id: 'a', label: "About 1,500 meters" },
      { id: 'b', label: "About 3,000 meters", correct: true },
      { id: 'c', label: "About 6,000 meters" },
      { id: 'd', label: "About 750 meters" }
    ],
    explanation: "Sound travels at about 1,500 m/s in seawater. The sonar pulse travels down AND back, so the one-way distance is half the total time: 2 seconds × 1,500 m/s = 3,000 meters depth."
  },
  {
    scenario: "An outdoor concert is held on a hot summer day (35°C) versus a cold winter evening (-10°C). The speed of sound formula is v = 331 + 0.6T m/s. The stage is 100 meters from the back row.",
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
    scenario: "A geologist taps a steel rail with a hammer. Her colleague 1 km away puts his ear to the rail and hears TWO sounds - one through the rail, then one through the air. Sound in steel travels about 5,100 m/s.",
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
    scenario: "A bat emits ultrasonic pulses and uses the echoes to navigate and hunt insects in complete darkness. This is called echolocation. The bat's brain processes echo timing using the relationship v = d/t.",
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
    scenario: "Thunder rumbles for several seconds instead of being a single sharp crack. Lightning bolts are often several kilometers long, with different parts at different distances from the observer.",
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
    scenario: "A medical ultrasound technician is imaging a patient. The probe emits pulses and receives echoes from internal organs at different depths. The machine converts echo timing to distance measurements.",
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
    scenario: "At a track and field event, the starter uses a gun that produces both a flash and a bang. Timers at the finish line of a 100m race start their stopwatches when they see the flash, not when they hear the bang.",
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
    scenario: "Dolphins use echolocation to find fish. They emit clicking sounds and listen for echoes. In tropical waters, the speed of sound is about 1,530 m/s. The echo returns 0.02 seconds after clicking.",
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
    scenario: "Engineers designing a concert hall must carefully plan the shape so that sound reflections enhance rather than distort the music. First reflections should arrive within 20ms of direct sound. Sound travels at 343 m/s.",
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
    description: 'Submarines and marine vessels use sonar to detect objects underwater by measuring the time for sound to echo back. Since light cannot penetrate deep water, sound is the primary sensing method in oceans. Active sonar emits pulses and times echoes; passive sonar listens for ambient sounds.',
    connection: 'Sonar directly applies v = d/t. Knowing the speed of sound in water (about 1,500 m/s) allows calculating distance from echo time. Temperature, salinity, and depth affect the speed of sound in seawater, requiring careful calibration. The speed varies from about 1,450 m/s near the surface to over 1,500 m/s at depth.',
    howItWorks: 'Active sonar emits pulses and times echoes. Passive sonar listens for sounds. The speed of sound in seawater varies with depth, temperature, and salinity, creating "sound channels" that bend acoustic rays and allow signals to travel thousands of kilometers.',
    stats: [
      { value: '1500', label: 'm/s in seawater', icon: '🌊' },
      { value: '10km', label: 'Detection range', icon: '📡' },
      { value: '4x', label: 'Faster than in air', icon: '⚡' }
    ],
    examples: ['Submarine detection', 'Fish finding', 'Seafloor mapping', 'Underwater communication'],
    companies: ['Raytheon', 'Thales', 'Kongsberg', 'L3Harris'],
    futureImpact: 'Autonomous underwater vehicles will use advanced sonar arrays and AI to explore ocean depths, map the seafloor, and monitor marine ecosystems with unprecedented detail.',
    color: '#3B82F6'
  },
  {
    icon: '🏥',
    title: 'Medical Ultrasound',
    short: 'Imaging inside the body with sound',
    tagline: 'Safe imaging without radiation',
    description: 'Ultrasound imaging uses high-frequency sound waves to create images of organs, fetuses, and blood flow. It is safe, real-time, and portable, making it essential in medicine worldwide. A transducer emits ultrasound pulses (1-20 MHz) and detects echoes from tissue interfaces.',
    connection: 'Medical ultrasound measures the time for sound echoes to return from tissue interfaces. The speed of sound in tissue (about 1,540 m/s) is used to calculate depths and create images. The formula v = 2d/t is used, where d is the depth of the reflecting surface and t is the round-trip echo time.',
    howItWorks: 'Different tissues reflect sound differently based on acoustic impedance. The time delay gives depth; amplitude gives brightness. Modern phased-array probes create real-time 2D and 3D images by rapidly scanning across angles.',
    stats: [
      { value: '1540', label: 'm/s in soft tissue', icon: '🫀' },
      { value: '0.1mm', label: 'Resolution possible', icon: '🔬' },
      { value: '140M', label: 'Scans per year (US)', icon: '📊' }
    ],
    examples: ['Fetal imaging', 'Cardiac echo', 'Guided biopsies', 'Vascular doppler'],
    companies: ['GE Healthcare', 'Philips', 'Siemens Healthineers', 'Canon Medical'],
    futureImpact: 'Portable AI-powered ultrasound devices will bring imaging to remote areas and enable point-of-care diagnostics globally, transforming healthcare access.',
    color: '#EC4899'
  },
  {
    icon: '🎭',
    title: 'Concert Hall Acoustics',
    short: 'Designing spaces for perfect sound',
    tagline: 'Where physics meets art',
    description: 'Concert halls are carefully designed so sound reaches every seat with proper delay, clarity, and reverberation. The speed of sound determines optimal room dimensions and surface placements. Acoustic engineers calculate reflection paths and design surfaces to direct early reflections toward listeners.',
    connection: 'The speed of sound determines how long sound takes to travel from stage to listener and reflect off surfaces. Delays over 50ms cause echoes; careful design ensures reflections enhance rather than muddy the sound. The 20ms rule requires reflecting surfaces to be within 6.9 meters extra path length.',
    howItWorks: 'Acoustic engineers calculate reflection paths using the speed of sound. Surfaces are angled to direct early reflections toward listeners. Diffusers scatter sound to prevent flutter echoes. Variable acoustics systems use movable panels to adjust the hall for different performance types.',
    stats: [
      { value: '1.5-2s', label: 'Optimal reverberation', icon: '🎵' },
      { value: '17ms', label: 'Per 6m of travel', icon: '⏱️' },
      { value: '$100M+', label: 'Major hall construction', icon: '🏛️' }
    ],
    examples: ['Sydney Opera House', 'Carnegie Hall', 'Berlin Philharmonie', 'Walt Disney Concert Hall'],
    companies: ['Arup Acoustics', 'Nagata Acoustics', 'Kirkegaard', 'Threshold Acoustics'],
    futureImpact: 'Variable acoustics systems using movable panels and electronic enhancement will allow single venues to optimize for symphony, opera, or amplified music on demand.',
    color: '#F59E0B'
  },
  {
    icon: '⛈️',
    title: 'Lightning Distance',
    short: 'Calculating storm proximity by sound delay',
    tagline: 'Flash-to-bang tells the truth',
    description: 'The "flash-to-bang" method uses the delay between seeing lightning and hearing thunder to estimate storm distance. This simple application of sound speed helps people stay safe during thunderstorms. Lightning heats air to 30,000K in microseconds, creating a supersonic shockwave that becomes thunder.',
    connection: 'Light travels almost instantaneously (300,000,000 m/s), while sound travels at about 343 m/s. Counting seconds between flash and bang, then dividing by 3, gives distance in kilometers. The formula is: distance (km) = time (seconds) / 3. Or for miles: distance (miles) = time (seconds) / 5.',
    howItWorks: 'Lightning heats air to 30,000K in microseconds, creating a supersonic shockwave that becomes thunder. The 5-second-per-mile rule (or 3-second-per-km) uses v = d/t with sound speed ≈ 340 m/s. Long lightning bolts produce rumbling thunder because different parts of the bolt are at different distances.',
    stats: [
      { value: '5sec', label: 'Per mile to thunder', icon: '⚡' },
      { value: '30000K', label: 'Lightning temperature', icon: '🌡️' },
      { value: '25M', label: 'Lightning strikes/year', icon: '🌍' }
    ],
    examples: ['Outdoor safety protocols', 'Sports event decisions', 'Aviation weather', 'Emergency management'],
    companies: ['Vaisala', 'Earth Networks', 'AccuWeather', 'National Weather Service'],
    futureImpact: 'Lightning location networks using arrival time differences at multiple sensors provide real-time mapping of storm electrical activity for safety and research purposes.',
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
    accent: '#3b82f6', // Blue for sound/waves theme
    accentGlow: 'rgba(59, 130, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
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
    hook: 'Explore',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Temperature',
    twist_review: 'Deep Insight',
    transfer: 'Apply',
    test: 'Quiz',
    mastery: 'Transfer'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
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

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
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
      top: 0,
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

  // Bottom bar navigation
  const renderBottomBar = (canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 200,
      minHeight: '72px',
      background: 'rgba(18, 18, 26, 0.98)',
      borderTop: `1px solid ${colors.border}`,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
      padding: '16px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <button
        onClick={prevPhase}
        style={{
          padding: '12px 24px',
          minHeight: '44px',
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          background: 'transparent',
          color: colors.textSecondary,
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        ← Back
      </button>
      <button
        onClick={() => { if (canProceed) { playSound('success'); nextPhase(); } }}
        disabled={!canProceed}
        style={{
          padding: '12px 32px',
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? `linear-gradient(135deg, ${colors.accent}, #1D4ED8)` : colors.border,
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // Slider style helper
  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    cursor: 'pointer',
    accentColor: '#3b82f6',
    touchAction: 'pan-y',
    WebkitAppearance: 'none',
    appearance: 'none',
  };

  // Echo Visualization Component
  const EchoVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 200 : 240;

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
        <text x={width/2} y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">
          Echo Measurement — v = 2d/t
        </text>

        {/* Formula display */}
        <g transform={`translate(${width - 100}, 35)`}>
          <rect x="-40" y="-12" width="100" height="22" rx="4" fill={colors.bgSecondary} stroke={colors.border} />
          <text x="10" y="4" textAnchor="middle" fill={colors.accent} fontSize="11" fontFamily="monospace" fontWeight="bold">
            v = 2d/t
          </text>
        </g>

        {/* X-axis label */}
        <text x={width/2} y={height - 8} textAnchor="middle" fill={colors.textMuted} fontSize="11">
          Distance (d = {distance} m) → Round trip = {distance * 2} m
        </text>

        {/* Reference baseline */}
        <line x1="55" y1="105" x2={width - 45} y2="105" stroke={colors.border} strokeWidth="1" strokeDasharray="4,4" />
        <text x="58" y="102" fill={colors.textMuted} fontSize="11">reference</text>

        {/* Sound wave arcs (static) showing propagation pattern */}
        <path d={`M 55,105 Q 70,75 70,105 Q 70,135 55,105`} fill="none" stroke="#F59E0B" strokeWidth="1.5" opacity="0.3" />
        <path d={`M 55,105 Q 85,55 85,105 Q 85,155 55,105`} fill="none" stroke="#F59E0B" strokeWidth="1" opacity="0.2" />

        {/* Person */}
        <g transform="translate(40, 80)">
          <circle cx="0" cy="0" r="12" fill="#FCD34D" />
          <rect x="-8" y="14" width="16" height="28" fill="#3B82F6" rx="3" />
          <line x1="-4" y1="42" x2="-6" y2="60" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
          <line x1="4" y1="42" x2="6" y2="60" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
          <text x="0" y="76" textAnchor="middle" fill={colors.textSecondary} fontSize="11">You</text>
        </g>

        {/* Wall */}
        <g>
          <rect x={width - 50} y="45" width="28" height="110" fill="#475569" rx="3" />
          <path d={`M ${width-50},55 L ${width-50+8},60 L ${width-50},65 Z`} fill="#64748b" />
          <path d={`M ${width-50},75 L ${width-50+8},80 L ${width-50},85 Z`} fill="#64748b" />
          <text x={width - 36} y={height - 22} textAnchor="middle" fill={colors.textMuted} fontSize="11">Wall</text>
        </g>

        {/* Sound wave going out */}
        {soundWavePos >= 0 && (
          <g filter="url(#waveGlow)">
            <circle
              cx={60 + soundWavePos * (width - 130) / 100}
              cy="105"
              r="15"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="4"
              opacity={1 - soundWavePos / 150}
            />
            <circle
              cx={60 + soundWavePos * (width - 130) / 100}
              cy="105"
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
              cy="105"
              r="15"
              fill="none"
              stroke="#10B981"
              strokeWidth="4"
              opacity={echoWavePos / 100}
            />
            <circle
              cx={60 + echoWavePos * (width - 130) / 100}
              cy="105"
              r="8"
              fill="none"
              stroke="#34D399"
              strokeWidth="2"
              opacity={echoWavePos / 80}
            />
          </g>
        )}

        {/* Distance label - moved to avoid overlap */}
        <line x1="60" y1="48" x2={width - 55} y2="48" stroke={colors.success} strokeWidth="2" />
        <polygon points={`${width - 55},48 ${width - 65},43 ${width - 65},53`} fill={colors.success} />
        <polygon points="60,48 70,43 70,53" fill={colors.success} />
        <text x={width/2} y="43" textAnchor="middle" fill={colors.success} fontSize="12" fontWeight="600">
          {distance} m →
        </text>

        {/* Timer */}
        <rect x={width/2 - 55} y={height - 45} width="110" height="28" rx="6" fill={colors.bgSecondary} stroke={colors.border} />
        <text x={width/2} y={height - 26} textAnchor="middle" fill={colors.success} fontSize="13" fontFamily="monospace" fontWeight="bold">
          t = {elapsedTime.toFixed(3)} s
        </text>
      </svg>
    );
  };

  // Temperature Visualization
  const TemperatureVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 220 : 260;
    const expectedSpeed = speedAtTemp(temperature);
    const refSpeed = speedAtTemp(20);

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

        {/* Title */}
        <text x={width/2} y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">
          Temperature Effect on Sound Speed
        </text>

        {/* Formula */}
        <text x={width/2} y="36" textAnchor="middle" fill={colors.accent} fontSize="12" fontFamily="monospace">
          v = 331 + 0.6T (m/s)
        </text>

        {/* X-axis label */}
        <text x={width/2} y={height - 8} textAnchor="middle" fill={colors.textMuted} fontSize="11">
          Temperature T (°C) — Speed changes by 0.6 m/s per °C
        </text>

        {/* Y-axis label */}
        <text x="14" y={height/2} textAnchor="middle" fill={colors.textMuted} fontSize="11" transform={`rotate(-90, 14, ${height/2})`}>
          Speed (m/s)
        </text>

        {/* Reference line at 20°C */}
        <line x1="100" y1="90" x2={width - 20} y2="90" stroke={colors.border} strokeWidth="1" strokeDasharray="4,4" />
        <text x="102" y="88" fill={colors.textMuted} fontSize="11">reference (20°C = {refSpeed.toFixed(0)} m/s)</text>

        {/* Thermometer */}
        <g transform="translate(60, 55)">
          <rect x="-8" y="0" width="16" height="90" fill={colors.bgSecondary} rx="8" stroke={colors.border} />
          <rect
            x="-5"
            y={80 - Math.max(5, (temperature + 30) * 1.1)}
            width="10"
            height={Math.max(5, (temperature + 30) * 1.1)}
            fill={temperature > 20 ? 'url(#hotGrad)' : 'url(#coldGrad)'}
            rx="5"
          />
          <circle cx="0" cy="105" r="16" fill={temperature > 20 ? 'url(#hotGrad)' : 'url(#coldGrad)'} />

          {/* Scale */}
          {[-20, 0, 20, 40].map(t => (
            <g key={t}>
              <line x1="12" y1={80 - (t + 25) * 1.1} x2="20" y2={80 - (t + 25) * 1.1} stroke={colors.textMuted} strokeWidth="1" />
              <text x="25" y={83 - (t + 25) * 1.1} fill={colors.textMuted} fontSize="11">{t}°C</text>
            </g>
          ))}
        </g>

        {/* Speed display */}
        <g transform={`translate(${width/2 + 40}, 75)`}>
          <rect x="-80" y="-20" width="160" height="80" rx="12" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="1.5" />
          <text x="0" y="0" textAnchor="middle" fill={colors.textMuted} fontSize="12">
            At {temperature}°C:
          </text>
          <text x="0" y="30" textAnchor="middle" fill={colors.textPrimary} fontSize="26" fontWeight="700">
            {expectedSpeed.toFixed(0)} m/s
          </text>
          <text x="0" y="48" textAnchor="middle" fill={colors.textMuted} fontSize="11">
            Δ = {(expectedSpeed - refSpeed).toFixed(0)} m/s vs 20°C
          </text>
        </g>

        {/* Speed comparison bar */}
        <g transform={`translate(${width/2 - 80}, ${height - 60})`}>
          <text x="80" y="-8" textAnchor="middle" fill={colors.textMuted} fontSize="11">Speed Range (300–380 m/s)</text>
          <rect x="0" y="0" width="160" height="18" rx="4" fill={colors.bgSecondary} />
          <rect
            x="0"
            y="0"
            width={Math.max(10, (expectedSpeed - 300) * 2)}
            height="18"
            rx="4"
            fill={temperature > 20 ? '#EF4444' : '#3B82F6'}
          />
          <text x="0" y="32" fill={colors.textMuted} fontSize="11">300</text>
          <text x="160" y="32" textAnchor="end" fill={colors.textMuted} fontSize="11">380 m/s</text>
        </g>
      </svg>
    );
  };

  // Predict Diagram SVG
  const PredictDiagramSVG = () => {
    const width = isMobile ? 340 : 480;
    const height = 170;
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        {/* Title */}
        <text x={width/2} y="18" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">
          Echo Experiment Setup
        </text>

        {/* X-axis label */}
        <text x={width/2} y={height - 5} textAnchor="middle" fill={colors.textMuted} fontSize="11">
          Round trip = 340 m total — v = 2 × 170 / t
        </text>

        {/* Person */}
        <g transform="translate(50, 55)">
          <circle cx="0" cy="0" r="14" fill="#FCD34D" />
          <rect x="-9" y="16" width="18" height="32" fill="#3B82F6" rx="3" />
          <text x="0" y="64" textAnchor="middle" fill={colors.textSecondary} fontSize="12">You</text>
          <text x="0" y="78" textAnchor="middle" fill={colors.warning} fontSize="11">CLAP!</text>
        </g>

        {/* Arrow */}
        <line x1="88" y1="65" x2={width - 88} y2="65" stroke={colors.warning} strokeWidth="3" />
        <polygon points={`${width - 88},65 ${width - 98},60 ${width - 98},70`} fill={colors.warning} />

        {/* Distance label above arrow */}
        <text x={width / 2} y="52" textAnchor="middle" fill={colors.success} fontSize="13" fontWeight="600">170 m</text>

        {/* Wall */}
        <g>
          <rect x={width - 64} y="35" width="28" height="78" fill="#475569" rx="3" />
          <text x={width - 50} y="125" textAnchor="middle" fill={colors.textSecondary} fontSize="12">Wall</text>
        </g>
      </svg>
    );
  };

  // Determine canProceed and button text for bottom bar
  const getCanProceed = (): boolean => {
    switch (phase) {
      case 'hook': return true;
      case 'predict': return prediction !== null;
      case 'play': return calculatedSpeed > 0;
      case 'review': return true;
      case 'twist_predict': return twistPrediction !== null;
      case 'twist_play': return true;
      case 'twist_review': return true;
      case 'transfer': return completedApps.every(c => c);
      case 'test': return false; // handled separately
      case 'mastery': return false;
      default: return true;
    }
  };

  const getButtonText = (): string => {
    switch (phase) {
      case 'hook': return 'Start Learning →';
      case 'predict': return 'Test My Prediction →';
      case 'play': return 'Continue →';
      case 'review': return 'Continue →';
      case 'twist_predict': return 'Explore →';
      case 'twist_play': return 'Continue →';
      case 'twist_review': return 'See Applications →';
      case 'transfer': return 'Take the Test →';
      default: return 'Next →';
    }
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  const renderHook = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>
        ⚡🔊
      </div>

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
        Using the formula <strong style={{ color: colors.accent }}>v = d/t</strong>, you can calculate the speed of sound from real echo experiments.
      </p>

      <div style={{
        background: colors.bgCard,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px',
        maxWidth: '500px',
        border: `1px solid ${colors.border}`,
      }}>
        <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic', marginBottom: '8px' }}>
          "Count the seconds between lightning and thunder, divide by 5, and you have the distance in miles.
          This simple trick uses one of the most fundamental properties of waves — their speed through a medium."
        </p>
        <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
          — Basic Physics of Sound
        </p>
      </div>

      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: colors.accent }}>343</div>
          <div style={{ ...typo.small, color: colors.textMuted }}>m/s in air</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: colors.success }}>1500</div>
          <div style={{ ...typo.small, color: colors.textMuted }}>m/s in water</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: colors.warning }}>5100</div>
          <div style={{ ...typo.small, color: colors.textMuted }}>m/s in steel</div>
        </div>
      </div>
    </div>
  );

  const renderPredict = () => {
    const options = [
      { id: 'a', text: 'About 34 m/s — similar to a fast car on the highway' },
      { id: 'b', text: 'About 343 m/s — faster than most commercial jets!', correct: true },
      { id: 'c', text: 'About 3,000 m/s — almost as fast as a bullet' },
    ];

    return (
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
        <div style={{
          background: `${colors.accent}22`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          border: `1px solid ${colors.accent}44`,
        }}>
          <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
            🔮 Make Your Prediction
          </p>
        </div>

        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
          You stand 170 meters from a wall and clap your hands. About how fast does the sound travel to the wall and back?
        </h2>

        {/* Static SVG diagram */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
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
      </div>
    );
  };

  const renderPlay = () => (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
        🔬 Echo Experiment
      </h2>
      <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
        Clap to send a sound wave and time the echo! This is the classic echo method for measuring the speed of sound.
      </p>

      {/* Key physics terms */}
      <div style={{
        background: `${colors.accent}15`,
        border: `1px solid ${colors.accent}44`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
          <strong style={{ color: colors.accent }}>Observe:</strong> The animation below visualizes the sound wave traveling from you to the wall and back as an echo.
          Notice how the round-trip time changes when you adjust the distance slider — this demonstrates the relationship <strong style={{ color: colors.success }}>v = 2d/t</strong>.
          This is important in real-world applications like sonar, medical ultrasound, and engineering design — all technology that uses this principle to calculate distance from echo timing.
        </p>
      </div>

      {/* Main visualization */}
      <div style={{
        background: colors.bgCard,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        {/* Side-by-side layout */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '20px',
          width: '100%',
          alignItems: isMobile ? 'center' : 'flex-start',
        }}>
          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <EchoVisualization />
            </div>
          </div>
          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            {/* Distance slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Distance to Wall</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{distance} m</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="10"
                value={distance}
                onChange={(e) => { setDistance(parseInt(e.target.value)); resetMeasurement(); }}
                disabled={measuring}
                style={sliderStyle}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>50 m</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>500 m</span>
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
                {measuring ? 'Measuring...' : '🔊 CLAP!'}
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
          </div>
        </div>

        {/* Results — comparison display */}
        {calculatedSpeed > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
          }}>
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ ...typo.h3, color: colors.warning }}>{distance * 2} m</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Round Trip (2d)</div>
            </div>
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ ...typo.h3, color: colors.success }}>{elapsedTime.toFixed(3)} s</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Time (t)</div>
            </div>
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              border: `2px solid ${colors.accent}`,
              boxShadow: `0 0 12px ${colors.accentGlow}`,
            }}>
              <div style={{ ...typo.h3, color: colors.accent }}>{calculatedSpeed.toFixed(0)} m/s</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Speed (v = 2d/t)</div>
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
          textAlign: 'center',
        }}>
          <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
            ✅ Sound travels at about {calculatedSpeed.toFixed(0)} m/s — faster than most jet planes but much slower than light!
            Compare: at 50 m, echo time = {(100/343).toFixed(3)} s; at 500 m, echo time = {(1000/343).toFixed(3)} s.
          </p>
        </div>
      )}
    </div>
  );

  const renderReview = () => (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
      <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
        The Physics of Sound Speed
      </h2>

      {/* Connect to prediction */}
      <div style={{
        background: `${colors.accent}11`,
        border: `1px solid ${colors.accent}33`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
          💡 As you predicted and observed in the experiment, sound travels at approximately 343 m/s at 20°C —
          much faster than a car but much slower than light. Did your prediction match?
        </p>
      </div>

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
          {[
            { label: 'Walking', value: '~1.5 m/s' },
            { label: 'Highway car', value: '~30 m/s' },
            { label: 'Sound in air', value: '~343 m/s', highlight: true },
            { label: 'Commercial jet', value: '~250 m/s' },
            { label: 'Sound in water', value: '~1,500 m/s' },
            { label: 'Sound in steel', value: '~5,100 m/s' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: i < 5 ? `1px solid ${colors.border}` : 'none',
              background: item.highlight ? `${colors.success}22` : 'transparent',
            }}>
              <span style={{ fontWeight: item.highlight ? 700 : 400, color: item.highlight ? colors.success : 'inherit' }}>{item.label}</span>
              <span style={{ fontWeight: item.highlight ? 700 : 400, color: item.highlight ? colors.success : colors.textPrimary }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        background: colors.bgCard,
        borderRadius: '12px',
        padding: '20px',
      }}>
        <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
          ⚡ The Flash-to-Bang Rule
        </h3>
        <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
          Light travels almost instantly (300,000,000 m/s). Sound takes about <strong>5 seconds per mile</strong> (or 3 seconds per km).
          Count the seconds between lightning and thunder, divide by 5, and you know how many miles away the storm is!
        </p>
      </div>
    </div>
  );

  const renderTwistPredict = () => {
    const options = [
      { id: 'a', text: 'Same speed — temperature has no effect on sound' },
      { id: 'b', text: 'Faster in hot air — molecules move faster', correct: true },
      { id: 'c', text: 'Faster in cold air — denser means better conduction' },
    ];

    return (
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
        <div style={{
          background: `${colors.warning}22`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          border: `1px solid ${colors.warning}44`,
        }}>
          <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
            🌡️ New Variable: Temperature
          </p>
        </div>

        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
          On a hot summer day (35°C) versus a cold winter night (-10°C), does sound travel at the same speed?
        </h2>

        {/* Static graphic showing hot vs cold */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <svg width="100%" height="140" viewBox="0 0 400 140" style={{ display: 'block' }}>
            <text x="200" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">
              Hot Air vs Cold Air
            </text>
            {/* Hot side */}
            <g transform="translate(80, 60)">
              <circle cx="0" cy="0" r="28" fill="#FCA5A5" opacity="0.7" />
              <circle cx="0" cy="0" r="18" fill="#EF4444" />
              <text x="0" y="5" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">35°C</text>
              <text x="0" y="42" textAnchor="middle" fill="#FCA5A5" fontSize="11">Hot air</text>
              <text x="0" y="55" textAnchor="middle" fill={colors.textMuted} fontSize="11">Fast molecules</text>
            </g>
            <text x="200" y="70" textAnchor="middle" fill={colors.textMuted} fontSize="16">vs</text>
            {/* Cold side */}
            <g transform="translate(320, 60)">
              <circle cx="0" cy="0" r="28" fill="#93C5FD" opacity="0.7" />
              <circle cx="0" cy="0" r="18" fill="#2563EB" />
              <text x="0" y="5" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">-10°C</text>
              <text x="0" y="42" textAnchor="middle" fill="#93C5FD" fontSize="11">Cold air</text>
              <text x="0" y="55" textAnchor="middle" fill={colors.textMuted} fontSize="11">Slow molecules</text>
            </g>
            {/* X-axis reference */}
            <text x="200" y="125" textAnchor="middle" fill={colors.textMuted} fontSize="11">
              Which temperature leads to faster sound?
            </text>
          </svg>
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
      </div>
    );
  };

  const renderTwistPlay = () => {
    const expectedSpeed = speedAtTemp(temperature);

    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
          🌡️ Temperature and Sound Speed
        </h2>
        <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
          Adjust the temperature and watch how sound speed changes using v = 331 + 0.6T m/s
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
            <strong style={{ color: colors.accent }}>Observe:</strong> Drag the temperature slider and watch how the speed of sound changes (m/s). Hotter air means faster sound because molecules move faster and transmit pressure waves more quickly!
          </p>
        </div>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                <TemperatureVisualization />
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Temperature slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Temperature</span>
                  <span style={{ ...typo.small, color: temperature > 20 ? '#EF4444' : '#3B82F6', fontWeight: 600 }}>{temperature}°C → {expectedSpeed.toFixed(0)} m/s</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="50"
                  value={temperature}
                  onChange={(e) => setTemperature(parseInt(e.target.value))}
                  style={sliderStyle}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ ...typo.small, color: '#3B82F6' }}>-30°C (Arctic)</span>
                  <span style={{ ...typo.small, color: '#EF4444' }}>50°C (Desert)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Speed examples — comparison display */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
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
          textAlign: 'center',
        }}>
          <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
            ✅ At {temperature}°C, sound travels at {expectedSpeed.toFixed(0)} m/s —
            that is {Math.abs(expectedSpeed - 343).toFixed(0)} m/s {expectedSpeed > 343 ? 'faster' : 'slower'} than at 20°C!
          </p>
        </div>
      </div>
    );
  };

  const renderTwistReview = () => (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
      <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
        Why Temperature Matters
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '24px' }}>📐</span>
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
            <span style={{ fontSize: '24px' }}>⚛️</span>
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
            <span style={{ fontSize: '24px' }}>🎵</span>
            <h3 style={{ ...typo.h3, color: colors.warning, margin: 0 }}>Real-World Impact</h3>
          </div>
          <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
            Musicians at outdoor concerts may need to retune as temperature changes!
            Wind instruments change pitch because the sound wavelength depends on air temperature.
            A 10°C change can cause noticeable pitch shifts.
          </p>
        </div>
      </div>
    </div>
  );

  const renderTransfer = () => {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
          🌍 Real-World Applications
        </h2>

        {/* Progress indicator */}
        <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
          Application {selectedApp + 1} of {realWorldApps.length} — explore all to unlock the test
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
                  textAlign: 'center',
                }}>
                  ✓
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
          marginBottom: '16px',
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
              🔗 How Sound Speed Connects:
            </h4>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {app.connection}
            </p>
          </div>

          <div style={{
            background: colors.bgSecondary,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 600 }}>
              ⚙️ How It Works:
            </h4>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {app.howItWorks}
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

        {/* Got It button */}
        <button
          onClick={() => {
            playSound('success');
            const newCompleted = [...completedApps];
            newCompleted[selectedApp] = true;
            setCompletedApps(newCompleted);
            // Auto-advance to next app if available
            if (selectedApp < realWorldApps.length - 1) {
              const next = selectedApp + 1;
              setSelectedApp(next);
              newCompleted[next] = true;
              setCompletedApps(newCompleted);
            }
          }}
          style={{
            ...primaryButtonStyle,
            width: '100%',
            marginBottom: '16px',
            background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
          }}
        >
          {selectedApp < realWorldApps.length - 1 ? `Got It! → Next Application` : 'Got It! ✓'}
        </button>

        {allAppsCompleted && (
          <div style={{
            background: `${colors.success}22`,
            border: `1px solid ${colors.success}`,
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
              🎉 Excellent! You have explored all {realWorldApps.length} applications. Use the Next button to take the knowledge test!
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderTest = () => {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>
            {passed ? '🏆' : '📚'}
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

          {/* Answer review */}
          <div style={{ textAlign: 'left', marginBottom: '32px' }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>Answer Review:</h3>
            {testQuestions.map((q, i) => {
              const correct = q.options.find(o => o.correct)?.id;
              const userAnswer = testAnswers[i];
              const isCorrect = userAnswer === correct;
              return (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px',
                  marginBottom: '8px',
                  borderRadius: '8px',
                  background: isCorrect ? `${colors.success}22` : `${colors.error}22`,
                  border: `1px solid ${isCorrect ? colors.success : colors.error}`,
                }}>
                  <span style={{ fontSize: '18px' }}>{isCorrect ? '✅' : '❌'}</span>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>
                    Q{i + 1}: {isCorrect ? 'Correct' : `Incorrect (correct: ${correct?.toUpperCase()})`}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson →
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
                Replay
              </button>
            )}
            <button
              onClick={() => goToPhase('hook')}
              style={{
                padding: '14px 28px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.textSecondary,
                cursor: 'pointer',
                fontWeight: 600,
                minHeight: '44px',
              }}
            >
              Home
            </button>
          </div>
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
          🎯 Knowledge Test
        </h2>
        <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
          Apply what you have learned about the speed of sound. Each question presents a real-world scenario.
        </p>
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
              Back
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
              Next Question
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
    );
  };

  const renderMastery = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '100px', marginBottom: '24px' }}>🏆</div>

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
              <span style={{ color: colors.success }}>✅</span>
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
          🔄 Play Again
        </button>
        <a
          href="/"
          style={{
            ...primaryButtonStyle,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          🏠 Return to Dashboard
        </a>
      </div>
    </div>
  );

  const renderPhaseContent = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return (
          <TransferPhaseView
          conceptName="Speed Of Sound"
          applications={realWorldApps}
          onComplete={() => goToPhase('test')}
          isMobile={isMobile}
          colors={colors}
          typo={typo}
          playSound={playSound}
          />
        );
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: colors.bgPrimary,
      lineHeight: 1.6,
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '60px' }}>
        {renderPhaseContent()}
        {renderNavDots()}
      </div>
      {phase !== 'mastery' && phase !== 'test' && renderBottomBar(getCanProceed(), getButtonText())}
    </div>
  );
};

export default SpeedOfSoundRenderer;
