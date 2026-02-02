'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Phone Seismometer - Complete 10-Phase Game
// Discover how the accelerometer in your phone can detect earthquakes
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

interface PhoneSeismometerRendererProps {
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
    scenario: "You're developing a fitness app and need to understand how phones detect motion. The app should count steps accurately even when the phone is in different orientations.",
    question: "How does the MEMS accelerometer in a smartphone fundamentally detect motion?",
    options: [
      { id: 'a', label: "It uses GPS signals to calculate position changes over time" },
      { id: 'b', label: "A microscopic proof mass on silicon springs deflects, changing capacitance between electrodes", correct: true },
      { id: 'c', label: "Piezoelectric crystals generate voltage when the phone moves through magnetic fields" },
      { id: 'd', label: "An internal gyroscope spins and resists changes in orientation" }
    ],
    explanation: "MEMS accelerometers contain a tiny proof mass (about a microgram) suspended on microscopic silicon springs. When the phone accelerates, inertia causes the mass to lag behind, changing its position relative to fixed capacitor plates. This capacitance change is measured and converted to an electrical signal representing acceleration."
  },
  {
    scenario: "An engineer at a semiconductor company is explaining MEMS technology to new employees. They show a microscope image of an accelerometer chip smaller than a grain of rice.",
    question: "What does MEMS stand for, and why is this technology revolutionary?",
    options: [
      { id: 'a', label: "Magnetic Electromagnetic Motion System - it uses Earth's magnetic field" },
      { id: 'b', label: "Micro-Electro-Mechanical System - it combines microscopic mechanical structures with electronics on silicon", correct: true },
      { id: 'c', label: "Multi-Element Measurement Sensor - it combines multiple sensor types" },
      { id: 'd', label: "Motion Energy Monitoring System - it harvests energy from movement" }
    ],
    explanation: "MEMS (Micro-Electro-Mechanical Systems) technology allows mechanical structures like springs, masses, and capacitor plates to be fabricated at the microscale using semiconductor processes. This enables incredibly small, low-power sensors that can detect accelerations as small as 0.001g."
  },
  {
    scenario: "Scientists at UC Berkeley developed the MyShake app, downloaded by millions. During a magnitude 5.1 earthquake in California, the app successfully detected the event and sent warnings.",
    question: "Why are smartphone-based earthquake detection networks potentially more effective than traditional seismometer stations?",
    options: [
      { id: 'a', label: "Smartphones have more sensitive accelerometers than professional seismometers" },
      { id: 'b', label: "The dense geographic distribution of millions of phones provides better coverage, faster detection, and redundancy", correct: true },
      { id: 'c', label: "Smartphones can predict earthquakes before they happen using AI" },
      { id: 'd', label: "Phone networks are immune to damage during earthquakes" }
    ],
    explanation: "While individual phones are less sensitive than professional seismometers, the sheer number and geographic distribution creates an incredibly dense sensor network. This enables faster detection, better location accuracy through triangulation, and natural redundancy."
  },
  {
    scenario: "During an earthquake, a seismologist notices their monitoring station recorded two distinct wave arrivals - one at 2:15:03 PM causing compression, another at 2:15:18 PM causing side-to-side shaking.",
    question: "What explains the two different wave arrivals and their distinct characteristics?",
    options: [
      { id: 'a', label: "The first wave was reflected off the Earth's core while the second traveled directly" },
      { id: 'b', label: "P-waves (compression) travel faster and arrive first, while S-waves (shear) travel slower but cause more ground motion", correct: true },
      { id: 'c', label: "The first wave came from the initial rupture and the second from an aftershock" },
      { id: 'd', label: "Surface waves always split into two components in different soil types" }
    ],
    explanation: "P-waves (Primary) compress and expand rock like sound waves, traveling about 6 km/s. S-waves (Secondary) shake rock perpendicular to their travel direction at about 3.5 km/s. The time difference helps calculate distance to the epicenter."
  },
  {
    scenario: "A news reporter announces: 'Today's earthquake measured 6.0 on the Richter scale.' However, scientists increasingly prefer using 'moment magnitude' for large earthquakes.",
    question: "What is the key limitation of the Richter scale that led scientists to develop moment magnitude?",
    options: [
      { id: 'a', label: "The Richter scale only works for earthquakes in California" },
      { id: 'b', label: "The Richter scale saturates for large earthquakes above ~7.0, while moment magnitude accounts for fault area and slip distance", correct: true },
      { id: 'c', label: "The Richter scale requires expensive equipment most countries can't afford" },
      { id: 'd', label: "The Richter scale measures intensity rather than earthquake size" }
    ],
    explanation: "The Richter scale 'saturates' for large earthquakes - a magnitude 8.0 and 9.0 might produce similar maximum amplitudes despite the 9.0 releasing 31 times more energy. Moment magnitude directly calculates energy by multiplying fault rupture area times average slip distance times rock rigidity."
  },
  {
    scenario: "The MyShake app on your phone suddenly detects vibrations. The algorithm must determine within milliseconds whether this is a real earthquake or just someone dropping their phone.",
    question: "How do crowdsourced earthquake apps distinguish real earthquakes from false triggers?",
    options: [
      { id: 'a', label: "They use machine learning to recognize earthquake 'sounds' through the microphone" },
      { id: 'b', label: "They require spatial and temporal correlation - multiple phones in a region must detect similar signals within a short time window", correct: true },
      { id: 'c', label: "They check the phone's GPS to see if it moved to a new location" },
      { id: 'd', label: "They measure battery temperature changes caused by seismic energy" }
    ],
    explanation: "Single-phone detection is unreliable. Crowdsourced systems require corroborating evidence: multiple phones in a region must detect characteristic earthquake signatures within a short time window. The system uses triangulation to verify the detection pattern matches a propagating earthquake."
  },
  {
    scenario: "A data scientist working on earthquake detection notices raw accelerometer data is extremely noisy - capturing footsteps, HVAC vibrations, and traffic that create false alarms.",
    question: "What signal processing technique is most critical for extracting earthquake signals from noisy data?",
    options: [
      { id: 'a', label: "Amplifying all signals equally to make weak earthquakes detectable" },
      { id: 'b', label: "Bandpass filtering to isolate the 1-10 Hz frequency range where earthquake energy is concentrated", correct: true },
      { id: 'c', label: "Recording only during nighttime when there's less human activity" },
      { id: 'd', label: "Using GPS coordinates to ignore data from areas without recent earthquakes" }
    ],
    explanation: "Earthquake signals have characteristic frequency content, typically 1-10 Hz for body waves. Human activities like walking, typing, and electronic noise can be filtered out. Additional algorithms look for the specific P-wave then S-wave pattern of earthquakes."
  },
  {
    scenario: "Three seismometer stations detect an earthquake. Station A recorded the P-wave at 10:00:00, Station B at 10:00:04, and Station C at 10:00:07. Each station is 50 km apart.",
    question: "How do seismologists use data from multiple stations to pinpoint an earthquake's epicenter?",
    options: [
      { id: 'a', label: "They average the GPS coordinates of all stations that detected the earthquake" },
      { id: 'b', label: "They use triangulation - the P-S wave time difference at each station gives distance, and three circles intersect at the epicenter", correct: true },
      { id: 'c', label: "They trace the direction each seismometer was pointing during strongest signal" },
      { id: 'd', label: "They measure which station recorded the loudest signal, as that's closest" }
    ],
    explanation: "Each station calculates its distance from the epicenter using P-S wave time delay. This distance defines a circle around each station. With three or more stations, circles intersect at a single point - the epicenter. Dense smartphone networks provide incredibly precise locations."
  },
  {
    scenario: "Mexico City's earthquake early warning system gave residents up to 60 seconds of warning before strong shaking arrived from a magnitude 7.1 earthquake 120 km away.",
    question: "How can earthquake early warning systems provide advance notice when earthquakes travel at kilometers per second?",
    options: [
      { id: 'a', label: "They predict earthquakes hours in advance by monitoring underground pressure" },
      { id: 'b', label: "Electronic signals travel at light speed (300,000 km/s), while seismic waves travel at only 3-6 km/s", correct: true },
      { id: 'c', label: "They use satellites to detect ground deformation before waves arrive" },
      { id: 'd', label: "Underground sensors feel the earthquake before it reaches the surface" }
    ],
    explanation: "Early warning systems exploit the vast speed difference between electronic communications (essentially instantaneous) and seismic waves (3-8 km/s). Sensors near the epicenter detect P-waves within seconds and immediately transmit alerts that outrace the destructive S-waves."
  },
  {
    scenario: "After a moderate earthquake, engineers notice a 15-story building swayed significantly more than shorter buildings nearby, even though they experienced the same ground shaking.",
    question: "What phenomenon explains why certain buildings experience amplified shaking during earthquakes?",
    options: [
      { id: 'a', label: "Taller buildings are closer to the earthquake's energy source in Earth's crust" },
      { id: 'b', label: "Resonance occurs when earthquake frequency matches the building's natural frequency, causing amplified oscillations", correct: true },
      { id: 'c', label: "Taller buildings have more windows that let seismic waves enter" },
      { id: 'd', label: "The building's foundation was improperly constructed" }
    ],
    explanation: "Every structure has natural frequencies at which it 'wants' to vibrate. When earthquake waves contain energy at these frequencies, resonance causes amplified motion. A 10-story building (~1 Hz natural frequency) resonates with typical earthquake frequencies."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '📱',
    title: 'Earthquake Early Warning',
    short: 'Smartphone networks detect quakes in seconds',
    tagline: 'Crowdsourced seismology saves lives',
    description: 'Apps like MyShake and ShakeAlert use millions of smartphone accelerometers as a distributed seismic network. When multiple phones detect shaking simultaneously, alerts go out before damaging waves arrive.',
    connection: 'MEMS accelerometers in phones can detect P-waves, which travel faster than destructive S-waves and surface waves, providing crucial seconds of warning time.',
    howItWorks: 'Machine learning distinguishes earthquake signatures from everyday phone movement. When a quake is confirmed, alerts propagate to users in the affected area within seconds.',
    stats: [
      { value: '10-60s', label: 'Warning time', icon: '⏱️' },
      { value: '3M+', label: 'MyShake users', icon: '📱' },
      { value: '99%', label: 'Detection accuracy', icon: '✅' }
    ],
    examples: ['California ShakeAlert', 'Japan JMA warnings', 'Mexico SASMEX', 'MyShake app'],
    companies: ['UC Berkeley', 'USGS', 'Google', 'Apple'],
    futureImpact: 'Global smartphone coverage will enable earthquake early warning everywhere.',
    color: '#EF4444'
  },
  {
    icon: '👟',
    title: 'Fitness & Step Tracking',
    short: 'Step counting through accelerometer patterns',
    tagline: 'Every step is physics in action',
    description: 'Fitness trackers and smartphones count steps by detecting the characteristic acceleration pattern of walking. The accelerometer senses the impact of each footfall and periodic motion of gait.',
    connection: 'Walking produces a distinctive vertical acceleration signature: a sharp spike on heel strike followed by oscillation. Algorithms detect these peaks to count steps accurately.',
    howItWorks: 'Signal processing filters out noise and detects peaks in acceleration data. Machine learning distinguishes walking from running, climbing stairs, and other activities.',
    stats: [
      { value: '97%', label: 'Step accuracy', icon: '✅' },
      { value: '500M+', label: 'Fitness devices', icon: '⌚' },
      { value: '$36B', label: 'Wearables market', icon: '📈' }
    ],
    examples: ['Apple Watch Activity', 'Fitbit step tracking', 'Google Fit', 'Samsung Health'],
    companies: ['Apple', 'Fitbit', 'Garmin', 'Samsung'],
    futureImpact: 'Multi-sensor fusion will enable accurate activity recognition for any movement pattern.',
    color: '#22C55E'
  },
  {
    icon: '🚗',
    title: 'Vehicle Crash Detection',
    short: 'Sudden deceleration triggers emergency response',
    tagline: 'Accelerometers that save lives',
    description: 'Modern smartphones and vehicles detect crashes using accelerometers. A sudden high-G deceleration event triggers automatic calls to emergency services with GPS location.',
    connection: 'Crashes produce distinctive acceleration signatures: multi-G deceleration over tens of milliseconds, often with rapid direction changes that differ from phone drops.',
    howItWorks: 'Sensors sample at 100+ Hz to capture impact dynamics. Multiple axes detect frontal, side, and rollover impacts. Confirmation prompts prevent false alerts.',
    stats: [
      { value: '100G', label: 'Detection range', icon: '💥' },
      { value: '30s', label: 'Time to call 911', icon: '⏱️' },
      { value: '10K+', label: 'Lives saved yearly', icon: '❤️' }
    ],
    examples: ['iPhone Crash Detection', 'Pixel emergency SOS', 'OnStar response', 'GM crash sensors'],
    companies: ['Apple', 'Google', 'GM OnStar', 'BMW'],
    futureImpact: 'Autonomous vehicles will use accelerometer data for real-time safety and automated response.',
    color: '#F59E0B'
  },
  {
    icon: '🎮',
    title: 'Motion Gaming & VR',
    short: 'Controllers sense every tilt and shake',
    tagline: 'Physics becomes gameplay',
    description: 'Game controllers from Nintendo Wii to modern VR use accelerometers to translate physical motion into game input. Players swing, tilt, and gesture to control gameplay.',
    connection: 'Accelerometers measure both gravitational orientation and dynamic motion. Combined with gyroscopes, they provide complete 6-DOF motion tracking for immersive gaming.',
    howItWorks: 'Sensor fusion combines accelerometer and gyroscope data. Dead reckoning tracks motion while gravity provides absolute orientation reference. Drift is corrected continuously.',
    stats: [
      { value: '1000Hz', label: 'Sampling rate', icon: '⚡' },
      { value: '6-DOF', label: 'Motion tracking', icon: '🎯' },
      { value: '$180B', label: 'Gaming market', icon: '📈' }
    ],
    examples: ['Nintendo Switch Joy-Con', 'PlayStation DualSense', 'Meta Quest', 'Mobile gaming'],
    companies: ['Nintendo', 'Sony', 'Meta', 'Valve'],
    futureImpact: 'Full-body motion tracking will create increasingly immersive gaming experiences.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const PhoneSeismometerRenderer: React.FC<PhoneSeismometerRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state
  const [vibrationSource, setVibrationSource] = useState<'none' | 'footstep' | 'door' | 'earthquake'>('none');
  const [signalHistory, setSignalHistory] = useState<number[]>(Array(100).fill(0));
  const [massPosition, setMassPosition] = useState(0);
  const [isRecording, setIsRecording] = useState(true);
  const [animPhase, setAnimPhase] = useState(0);

  // Twist phase state - distributed network
  const [phoneCount, setPhoneCount] = useState(1);
  const [earthquakeStrength, setEarthquakeStrength] = useState(0);
  const [phoneDetections, setPhoneDetections] = useState<boolean[]>([false]);

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

  // Animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => p + 0.05);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Generate vibration signal
  const getVibrationSignal = (source: string, t: number): number => {
    switch (source) {
      case 'footstep':
        const footPhase = t % 1;
        return footPhase < 0.1 ? Math.sin(footPhase * Math.PI * 10) * 0.6 * Math.exp(-footPhase * 30) : 0;
      case 'door':
        if (t < 2) {
          return Math.sin(t * 50) * Math.exp(-t * 3) * 0.8;
        }
        return 0;
      case 'earthquake':
        return (Math.sin(t * 3) * 0.4 + Math.sin(t * 7) * 0.3 + Math.sin(t * 11) * 0.2) *
          (1 + Math.sin(t * 0.5) * 0.5);
      default:
        return (Math.random() - 0.5) * 0.05;
    }
  };

  // Signal simulation
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      const signal = getVibrationSignal(vibrationSource, animPhase);
      setMassPosition(signal * 30);
      setSignalHistory(prev => [...prev.slice(1), signal]);
    }, 50);
    return () => clearInterval(interval);
  }, [isRecording, vibrationSource, animPhase]);

  // Earthquake detection simulation
  useEffect(() => {
    if (phase !== 'twist_play' || earthquakeStrength === 0) return;
    const baseDetectionProb = earthquakeStrength / 10;
    setPhoneDetections(Array(phoneCount).fill(false).map(() =>
      Math.random() < baseDetectionProb + (phoneCount > 1 ? 0.2 : 0)
    ));
    const timeout = setTimeout(() => setEarthquakeStrength(0), 3000);
    return () => clearTimeout(timeout);
  }, [phase, earthquakeStrength, phoneCount]);

  // Reset on phase change
  useEffect(() => {
    if (phase === 'play') {
      setVibrationSource('none');
      setSignalHistory(Array(100).fill(0));
      setMassPosition(0);
      setIsRecording(true);
    }
    if (phase === 'twist_play') {
      setPhoneCount(1);
      setEarthquakeStrength(0);
      setPhoneDetections([false]);
    }
  }, [phase]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#10B981', // Emerald for seismic theme
    accentGlow: 'rgba(16, 185, 129, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    seismic: '#10B981',
    wave: '#14B8A6',
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
    twist_play: 'Network',
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
        gameType: 'phone-seismometer',
        gameTitle: 'Phone Seismometer',
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

  // MEMS Accelerometer Visualization
  const MEMSVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 280 : 340;

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="memsChip" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="memsMass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="memsSpring" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="memsCapacitor" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
          <filter id="glowEffect">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          MEMS Accelerometer Cross-Section
        </text>

        {/* Chip housing */}
        <g transform={`translate(${width/2 - 100}, 50)`}>
          <rect x="0" y="0" width="200" height="120" rx="8" fill="url(#memsChip)" stroke="#64748b" strokeWidth="2" />
          <rect x="10" y="10" width="180" height="100" rx="4" fill="#111827" />

          {/* Fixed frame */}
          <rect x="15" y="15" width="170" height="8" fill="#475569" rx="2" />
          <rect x="15" y="97" width="170" height="8" fill="#475569" rx="2" />

          {/* Springs */}
          <path
            d={`M 35 23 Q 25 35 35 47 Q 45 59 35 71 Q 25 83 35 97`}
            fill="none" stroke="url(#memsSpring)" strokeWidth="4" strokeLinecap="round"
          />
          <path
            d={`M 165 23 Q 175 35 165 47 Q 155 59 165 71 Q 175 83 165 97`}
            fill="none" stroke="url(#memsSpring)" strokeWidth="4" strokeLinecap="round"
          />

          {/* Fixed capacitor plates */}
          <rect x="50" y="30" width="5" height="60" fill="url(#memsCapacitor)" rx="2" />
          <rect x="145" y="30" width="5" height="60" fill="url(#memsCapacitor)" rx="2" />

          {/* Proof mass (moves with acceleration) */}
          <g transform={`translate(${massPosition * 0.5}, 0)`} filter="url(#glowEffect)">
            <rect x="65" y="35" width="70" height="50" fill="url(#memsMass)" rx="4" stroke="#fcd34d" strokeWidth="1" />
            <text x="100" y="65" textAnchor="middle" fill="#78350f" fontSize="10" fontWeight="bold">MASS</text>
          </g>

          {/* Capacitance labels */}
          <text x="52" y="100" fill="#4ade80" fontSize="9">C1</text>
          <text x="142" y="100" fill="#4ade80" fontSize="9">C2</text>
        </g>

        {/* Explanation */}
        <text x={width/2} y="190" textAnchor="middle" fill={colors.textSecondary} fontSize="11">
          Mass displacement changes capacitance between electrodes
        </text>

        {/* Signal display area */}
        <g transform={`translate(20, 210)`}>
          <rect x="0" y="0" width={width - 40} height="100" rx="6" fill="#0f172a" stroke="#334155" />

          {/* Grid lines */}
          <line x1="0" y1="50" x2={width - 40} y2="50" stroke="#1e293b" strokeWidth="1" />
          {[1, 2, 3, 4].map(i => (
            <line key={i} x1={(width - 40) * i / 5} y1="0" x2={(width - 40) * i / 5} y2="100" stroke="#1e293b" strokeWidth="1" />
          ))}

          {/* Signal trace */}
          <path
            d={`M 0 50 ${signalHistory.map((v, i) => `L ${i * (width - 40) / 100} ${50 - v * 40}`).join(' ')}`}
            fill="none" stroke={colors.seismic} strokeWidth="2" filter="url(#glowEffect)"
          />

          {/* Current value dot */}
          <circle
            cx={width - 40}
            cy={50 - (signalHistory[signalHistory.length - 1] || 0) * 40}
            r="4" fill={colors.seismic}
          />

          {/* Labels */}
          <text x="5" y="15" fill={colors.textMuted} fontSize="9">+1g</text>
          <text x="5" y="55" fill={colors.textMuted} fontSize="9">0</text>
          <text x="5" y="95" fill={colors.textMuted} fontSize="9">-1g</text>
          <text x={width - 100} y="15" fill={colors.seismic} fontSize="10" fontWeight="600">
            {(signalHistory[signalHistory.length - 1] || 0).toFixed(3)}g
          </text>
        </g>

        {/* Source indicator */}
        <g transform={`translate(${width/2 - 80}, ${height - 25})`}>
          <rect x="0" y="0" width="160" height="20" rx="4" fill="#1e293b" />
          <circle cx="12" cy="10" r="4" fill={vibrationSource !== 'none' ? colors.warning : colors.success}>
            {vibrationSource !== 'none' && (
              <animate attributeName="opacity" values="1;0.3;1" dur="0.5s" repeatCount="indefinite" />
            )}
          </circle>
          <text x="80" y="14" textAnchor="middle" fill={colors.textPrimary} fontSize="10">
            {vibrationSource === 'none' ? 'Idle' : vibrationSource === 'footstep' ? 'Footsteps' : vibrationSource === 'door' ? 'Door Slam' : 'Earthquake!'}
          </text>
        </g>
      </svg>
    );
  };

  // Network Visualization
  const NetworkVisualization = () => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 240 : 300;
    const detectionsCount = phoneDetections.filter(d => d).length;
    const accuracy = phoneCount > 0 ? Math.round((detectionsCount / phoneCount) * 100) : 0;

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <radialGradient id="epicenter" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="phoneGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </radialGradient>
          <filter id="epicenterGlow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background map area */}
        <ellipse cx={width/2} cy={height/2} rx={width * 0.4} ry={height * 0.35} fill="#164e63" fillOpacity="0.2" />

        {/* Earthquake epicenter */}
        {earthquakeStrength > 0 && (
          <g transform={`translate(${width/2}, ${height/2})`}>
            {/* Seismic waves */}
            {[1, 2, 3].map(i => (
              <circle
                key={i}
                cx={0} cy={0}
                r={i * 30 * ((animPhase * 0.5) % 1)}
                fill="none" stroke="#ef4444" strokeWidth="2"
                opacity={1 - ((animPhase * 0.5) % 1)}
              />
            ))}
            <circle cx={0} cy={0} r={15} fill="url(#epicenter)" filter="url(#epicenterGlow)" />
            <text x={0} y={-25} textAnchor="middle" fill="#fca5a5" fontSize="11" fontWeight="600">
              M{earthquakeStrength.toFixed(1)}
            </text>
          </g>
        )}

        {/* Idle epicenter marker */}
        {earthquakeStrength === 0 && (
          <g transform={`translate(${width/2}, ${height/2})`}>
            <circle cx={0} cy={0} r={12} fill="none" stroke="#4b5563" strokeWidth="2" strokeDasharray="4 2" />
            <text x={0} y={4} textAnchor="middle" fill="#6b7280" fontSize="10">?</text>
          </g>
        )}

        {/* Phone network */}
        {Array(phoneCount).fill(0).map((_, i) => {
          const angle = (i / Math.max(phoneCount, 1)) * Math.PI * 2 + (i * 0.3);
          const radius = 50 + (i % 3) * 30;
          const x = width/2 + Math.cos(angle) * radius;
          const y = height/2 + Math.sin(angle) * radius * 0.6;
          const detected = phoneDetections[i];

          return (
            <g key={i} transform={`translate(${x}, ${y})`}>
              {/* Detection glow */}
              {detected && (
                <circle cx={0} cy={0} r={15} fill="url(#phoneGlow)" opacity="0.6">
                  <animate attributeName="r" values="10;20;10" dur="1s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Phone icon */}
              <rect x="-6" y="-10" width="12" height="20" rx="2"
                fill={detected ? "#22c55e" : "#4b5563"}
                stroke={detected ? "#86efac" : "#6b7280"} strokeWidth="1"
              />
              <rect x="-4" y="-7" width="8" height="12" rx="1" fill={detected ? "#dcfce7" : "#1f2937"} />
            </g>
          );
        })}

        {/* Stats panel */}
        <g transform="translate(10, 10)">
          <rect x="0" y="0" width="120" height="70" rx="6" fill="#1e293b" stroke="#334155" />
          <text x="60" y="18" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">NETWORK STATUS</text>
          <text x="10" y="35" fill="#94a3b8" fontSize="9">Phones: {phoneCount}</text>
          <text x="10" y="50" fill="#94a3b8" fontSize="9">Detected: {detectionsCount}</text>
          <text x="10" y="65" fill={accuracy > 50 ? "#22c55e" : "#f59e0b"} fontSize="10" fontWeight="600">
            Confidence: {accuracy}%
          </text>
        </g>
      </svg>
    );
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
      zIndex: 100,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.wave})`,
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
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.wave})`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
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
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          📱🌋
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Phone Seismometer
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          Your pocket holds a <span style={{ color: colors.accent }}>scientific instrument</span> sensitive enough to detect earthquakes. How does a tiny chip sense motion and vibration?
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
            "The accelerometer in your phone that rotates your screen is actually a vibration sensor capable of detecting ground motion. Millions of phones working together could revolutionize earthquake early warning."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - UC Berkeley Seismological Laboratory
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore MEMS Sensors
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'A tiny mass on springs - movement changes capacitance between electrodes', correct: true },
      { id: 'b', text: 'A fluid that sloshes around, detected by pressure sensors' },
      { id: 'c', text: 'A spinning disk (gyroscope) that resists rotation' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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
            Your phone detects when you tilt or shake it. What is inside the MEMS accelerometer chip?
          </h2>

          {/* Simple diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>📱</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Shake Phone</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>-&gt;</div>
              <div style={{
                background: colors.accent + '33',
                padding: '20px 30px',
                borderRadius: '8px',
                border: `2px solid ${colors.accent}`,
              }}>
                <div style={{ fontSize: '24px', color: colors.accent }}>???</div>
                <p style={{ ...typo.small, color: colors.textPrimary }}>MEMS Chip</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>-&gt;</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>📊</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Acceleration Data</p>
              </div>
            </div>
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

  // PLAY PHASE - Interactive MEMS Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            MEMS Accelerometer Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Apply different vibration sources and watch the proof mass respond.
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <MEMSVisualization />
            </div>

            {/* Vibration source buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {[
                { id: 'none', label: 'None', icon: '📴' },
                { id: 'footstep', label: 'Footsteps', icon: '👟' },
                { id: 'door', label: 'Door Slam', icon: '🚪' },
                { id: 'earthquake', label: 'Earthquake', icon: '🌋' },
              ].map(src => (
                <button
                  key={src.id}
                  onClick={() => { playSound('click'); setVibrationSource(src.id as typeof vibrationSource); }}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    border: `2px solid ${vibrationSource === src.id ? (src.id === 'earthquake' ? colors.error : colors.accent) : colors.border}`,
                    background: vibrationSource === src.id ? (src.id === 'earthquake' ? `${colors.error}22` : `${colors.accent}22`) : colors.bgSecondary,
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {src.icon} {src.label}
                </button>
              ))}
            </div>

            {/* Explanation */}
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                <strong style={{ color: colors.accent }}>MEMS = Micro-Electro-Mechanical System.</strong> A tiny proof mass (~microgram) on silicon springs. When the phone accelerates, inertia makes the mass "lag", changing capacitance between electrodes.
              </p>
            </div>
          </div>

          {vibrationSource !== 'none' && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Notice how the mass moves and the signal changes! Different sources produce different patterns.
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
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
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            How MEMS Accelerometers Work
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Newton&apos;s Second Law at Microscale</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                When your phone accelerates, the proof mass inside the MEMS chip experiences <span style={{ color: colors.accent }}>inertial force (F = ma)</span>. This causes it to deflect against the silicon springs.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Capacitive Sensing</strong>
              </p>
              <p>
                The mass position changes the gap to fixed electrodes, altering <span style={{ color: colors.success }}>capacitance (C = epsilon * A / d)</span>. This tiny change is measured and converted to an acceleration reading.
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
              Key Insight: Incredible Sensitivity
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              Modern MEMS accelerometers can detect:
            </p>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>Accelerations as small as <strong>0.001g</strong> (one-thousandth of gravity)</li>
              <li>Footsteps from across a room</li>
              <li>Your heartbeat through a table</li>
              <li>Earthquake P-waves before shaking arrives</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
              Your Prediction: {prediction === 'a' ? 'Correct!' : 'Not quite'}
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              {prediction === 'a'
                ? 'You correctly identified that MEMS accelerometers use a proof mass on springs with capacitive sensing.'
                : 'The correct answer is a tiny mass on springs. The capacitance change between the mass and fixed electrodes is what gets measured.'}
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover the Twist
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Triangulate epicenter location and reject false alarms through corroboration', correct: true },
      { id: 'b', text: 'Make the signal louder by adding them together' },
      { id: 'c', text: 'Share battery power to keep sensors running longer' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Distributed Networks
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            One phone can detect an earthquake. But what if millions of phones worked together?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              Instead of one expensive seismometer, imagine a network of <span style={{ color: colors.accent }}>millions of smartphone sensors</span> spread across a city...
            </p>
            <div style={{ marginTop: '16px', fontSize: '48px' }}>
              📱📱📱📱📱 = 🌐
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
              Test the Network
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const detectionsCount = phoneDetections.filter(d => d).length;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Distributed Seismometer Network
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Build a network and trigger an earthquake to see how detection improves with more phones.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <NetworkVisualization />
            </div>

            {/* Phone count slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Phones in Network</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{phoneCount}</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={phoneCount}
                onChange={(e) => {
                  setPhoneCount(parseInt(e.target.value));
                  setPhoneDetections(Array(parseInt(e.target.value)).fill(false));
                }}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Trigger earthquake button */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <button
                onClick={() => {
                  playSound('click');
                  setEarthquakeStrength(4 + Math.random() * 3);
                }}
                disabled={earthquakeStrength > 0}
                style={{
                  padding: '16px 32px',
                  borderRadius: '12px',
                  border: 'none',
                  background: earthquakeStrength > 0 ? colors.border : colors.error,
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '16px',
                  cursor: earthquakeStrength > 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {earthquakeStrength > 0 ? 'Detecting...' : 'Simulate Earthquake'}
              </button>
            </div>

            {/* Detection results */}
            {earthquakeStrength > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
              }}>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: colors.accent }}>{detectionsCount}/{phoneCount}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Phones Detected</div>
                </div>
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ ...typo.h3, color: detectionsCount >= 3 ? colors.success : colors.warning }}>
                    {detectionsCount >= 3 ? 'CONFIRMED' : 'UNCERTAIN'}
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Event Status</div>
                </div>
              </div>
            )}
          </div>

          {phoneCount >= 5 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                More phones = better triangulation, fewer false alarms, and faster warnings!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Benefits
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
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Crowdsourced Seismology
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📍</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Triangulation</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Multiple detection times from different locations allow precise calculation of earthquake epicenter and depth. Three or more observations enable triangulation.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🚫</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>False Alarm Rejection</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                One phone shaking could be dropped. Many phones shaking in a pattern that propagates outward = real earthquake. Corroboration eliminates false positives.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⏰</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Early Warning</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Electronic signals travel at light speed (~300,000 km/s) while seismic waves travel at ~3-6 km/s. Phones near epicenter can alert phones farther away before shaking arrives.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🌐</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>MyShake Network</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                UC Berkeley&apos;s MyShake app has millions of users creating a global distributed seismometer network. It has successfully detected earthquakes worldwide and provides early warning alerts.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications
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
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

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
                How MEMS Sensors Connect:
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
                ? 'You understand MEMS sensors and earthquake detection!'
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
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          MEMS Sensor Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how the tiny accelerometer in your phone can detect motion and contribute to global earthquake early warning systems.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Learned:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'MEMS accelerometers use a proof mass on silicon springs',
              'Capacitive sensing measures tiny displacements',
              'Phones can detect earthquakes, footsteps, and crashes',
              'Distributed networks enable triangulation',
              'Early warning saves lives by outrunning seismic waves',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
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

export default PhoneSeismometerRenderer;
