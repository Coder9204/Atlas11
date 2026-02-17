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
    description: 'Apps like MyShake and ShakeAlert use millions of smartphone accelerometers as a distributed seismic network. When multiple phones detect shaking simultaneously, alerts go out before damaging waves arrive. This technology represents the future of disaster preparedness, where everyday devices become life-saving sensors working in concert across entire cities and regions.',
    connection: 'MEMS accelerometers in phones can detect P-waves, which travel faster than destructive S-waves and surface waves, providing crucial seconds of warning time. The relationship F = ma means any acceleration—even seismic ground motion—deflects the proof mass and generates a measurable signal.',
    howItWorks: 'Machine learning algorithms distinguish earthquake signatures from everyday phone movement. When a quake is confirmed through spatial and temporal correlation across multiple devices, alerts propagate to users in the affected area within seconds via electronic signals traveling at light speed.',
    stats: [
      { value: '10-60s', label: 'Warning time', icon: '⏱️' },
      { value: '3M+', label: 'MyShake users', icon: '📱' },
      { value: '99%', label: 'Detection accuracy', icon: '✅' }
    ],
    examples: ['California ShakeAlert', 'Japan JMA warnings', 'Mexico SASMEX', 'MyShake app'],
    companies: ['UC Berkeley', 'USGS', 'Google', 'Apple'],
    futureImpact: 'Global smartphone coverage will enable earthquake early warning everywhere on Earth.',
    color: '#EF4444'
  },
  {
    icon: '👟',
    title: 'Fitness & Step Tracking',
    short: 'Step counting through accelerometer patterns',
    tagline: 'Every step is physics in action',
    description: 'Fitness trackers and smartphones count steps by detecting the characteristic acceleration pattern of walking. The accelerometer senses the impact of each footfall and periodic motion of gait. This technology powers a $36 billion wearables industry and helps hundreds of millions of people track their health and activity levels with remarkable precision.',
    connection: 'Walking produces a distinctive vertical acceleration signature: a sharp spike on heel strike followed by oscillation. Algorithms detect these peaks to count steps accurately. The capacitance change C = εA/d in the MEMS chip converts each footfall into a digital signal.',
    howItWorks: 'Signal processing filters out noise and detects peaks in acceleration data. Machine learning distinguishes walking from running, climbing stairs, and other activities. Sensor fusion combines accelerometer data with gyroscope readings for improved accuracy.',
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
    description: 'Modern smartphones and vehicles detect crashes using accelerometers. A sudden high-G deceleration event triggers automatic calls to emergency services with GPS location. This technology has already saved thousands of lives and represents one of the most impactful practical applications of MEMS sensor technology in consumer electronics.',
    connection: 'Crashes produce distinctive acceleration signatures: multi-G deceleration over tens of milliseconds, often with rapid direction changes that differ from phone drops. The MEMS proof mass experiences enormous inertial forces during impact—F = ma scales directly with crash severity.',
    howItWorks: 'Sensors sample at 100+ Hz to capture impact dynamics. Multiple axes detect frontal, side, and rollover impacts. Confirmation prompts prevent false alerts from minor bumps. The algorithm compares real-time acceleration against crash signatures learned from thousands of test events.',
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
    description: 'Game controllers from Nintendo Wii to modern VR use accelerometers to translate physical motion into game input. Players swing, tilt, and gesture to control gameplay. This technology has transformed interactive entertainment, making gaming more intuitive and physically engaging for hundreds of millions of users worldwide across a $180 billion industry.',
    connection: 'Accelerometers measure both gravitational orientation and dynamic motion. Combined with gyroscopes, they provide complete 6-DOF motion tracking for immersive gaming. The relationship between acceleration magnitude and the proof mass displacement (x = F/k) enables precise motion quantification.',
    howItWorks: 'Sensor fusion combines accelerometer and gyroscope data using complementary filters. Dead reckoning tracks motion while gravity provides absolute orientation reference. Drift is corrected continuously through Kalman filtering, maintaining accuracy across hours of gameplay.',
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

  // Simulation state - vibration source and amplitude
  const [vibrationAmp, setVibrationAmp] = useState(50);
  const [vibrationFreq, setVibrationFreq] = useState(3);
  const [signalHistory, setSignalHistory] = useState<number[]>(Array(100).fill(0));
  const [animPhase, setAnimPhase] = useState(0);

  // Twist phase state - distributed network
  const [phoneCount, setPhoneCount] = useState(5);
  const [earthquakeStrength, setEarthquakeStrength] = useState(0);
  const [phoneDetections, setPhoneDetections] = useState<boolean[]>(Array(5).fill(false));

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

  // Signal simulation - driven by amplitude and frequency sliders
  useEffect(() => {
    const amp = vibrationAmp / 100; // normalize 0-1
    const freq = vibrationFreq;
    const signal = amp * Math.sin(animPhase * freq) * 0.8 + amp * Math.sin(animPhase * freq * 2.3) * 0.3;
    setSignalHistory(prev => [...prev.slice(1), signal]);
  }, [animPhase, vibrationAmp, vibrationFreq]);

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
      setVibrationAmp(50);
      setVibrationFreq(3);
      setSignalHistory(Array(100).fill(0));
    }
    if (phase === 'twist_play') {
      setPhoneCount(5);
      setEarthquakeStrength(0);
      setPhoneDetections(Array(5).fill(false));
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
    textSecondary: 'rgba(148,163,184,0.7)',
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
    hook: 'Explore',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understand',
    twist_predict: 'New Variable',
    twist_play: 'Apply',
    twist_review: 'Insight',
    transfer: 'Transfer',
    test: 'Quiz',
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

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Seismic signal waveform SVG - used in both predict (static) and play (interactive)
  const renderSeismicSVG = (interactive: boolean, svgWidth: number, svgHeight: number) => {
    const amp = vibrationAmp / 100;
    const freq = vibrationFreq;

    // Generate signal path spanning full height
    const plotX0 = 60;
    const plotX1 = svgWidth - 20;
    const plotY0 = 30;
    const plotY1 = svgHeight - 50;
    const plotH = plotY1 - plotY0;
    const plotW = plotX1 - plotX0;
    const midY = plotY0 + plotH / 2;

    // Generate waveform points - in interactive mode use signalHistory
    let points: string;
    if (interactive) {
      points = signalHistory.map((v, i) => {
        const x = plotX0 + (i / (signalHistory.length - 1)) * plotW;
        const y = midY - v * (plotH * 0.45);
        return `${x},${y}`;
      }).join(' ');
    } else {
      // Static waveform for predict phase - show representative signal
      const staticPoints = Array.from({ length: 100 }, (_, i) => {
        const t = i / 99;
        const envelope = Math.sin(t * Math.PI);
        const sig = envelope * (Math.sin(t * 15) * 0.5 + Math.sin(t * 31) * 0.3 + Math.sin(t * 7) * 0.2);
        const x = plotX0 + t * plotW;
        const y = midY - sig * plotH * 0.38;
        return `${x},${y}`;
      });
      points = staticPoints.join(' ');
    }

    // Baseline reference at midY (before signal)
    const baselinePoints = Array.from({ length: 20 }, (_, i) => {
      const x = plotX0 + (i / 19) * plotW * 0.2;
      const y = midY;
      return `${x},${y}`;
    }).join(' ');

    // Grid lines
    const gridYPositions = [plotY0, plotY0 + plotH * 0.25, midY, plotY0 + plotH * 0.75, plotY1];
    const gridXPositions = [1, 2, 3, 4].map(i => plotX0 + i * plotW / 5);

    return (
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ background: colors.bgCard, borderRadius: '12px', display: 'block' }}
      >
        <defs>
          <linearGradient id="seismicGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.3" />
            <stop offset="50%" stopColor={colors.accent} />
            <stop offset="100%" stopColor={colors.wave} />
          </linearGradient>
          <filter id="signalGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={svgWidth / 2} y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">
          {interactive ? 'Live Seismic Signal' : 'Seismic Waveform'}
        </text>

        {/* Plot area background */}
        <rect x={plotX0} y={plotY0} width={plotW} height={plotH} fill="#0f172a" rx="4" />

        {/* Horizontal grid lines */}
        {gridYPositions.map((y, i) => (
          <line
            key={`hy${i}`}
            x1={plotX0} y1={y} x2={plotX1} y2={y}
            stroke="#1e3a5f" strokeWidth="1" strokeDasharray="4 4" opacity="0.7"
          />
        ))}

        {/* Vertical grid lines */}
        {gridXPositions.map((x, i) => (
          <line
            key={`vx${i}`}
            x1={x} y1={plotY0} x2={x} y2={plotY1}
            stroke="#1e3a5f" strokeWidth="1" strokeDasharray="4 4" opacity="0.5"
          />
        ))}

        {/* Baseline reference (compare marker) */}
        <polyline
          points={baselinePoints}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.5"
          opacity="0.4"
          strokeDasharray="3 3"
        />
        <text x={plotX0 + 5} y={midY - 6} fill="#94a3b8" fontSize="11" opacity="0.6">baseline</text>

        {/* Signal trace */}
        <polyline
          points={points}
          fill="none"
          stroke="url(#seismicGrad)"
          strokeWidth="2"
          filter="url(#signalGlow)"
        />

        {/* Current value dot */}
        {interactive && (
          <circle
            cx={plotX1}
            cy={midY - (signalHistory[signalHistory.length - 1] || 0) * plotH * 0.45}
            r="5"
            fill={colors.accent}
            filter="url(#signalGlow)"
          />
        )}

        {/* Y-axis labels */}
        <text x={plotX0 - 8} y={plotY0 + 5} textAnchor="end" fill={colors.textSecondary} fontSize="11">+1g</text>
        <text x={plotX0 - 8} y={midY + 4} textAnchor="end" fill={colors.textSecondary} fontSize="11">0</text>
        <text x={plotX0 - 8} y={plotY1} textAnchor="end" fill={colors.textSecondary} fontSize="11">-1g</text>

        {/* X-axis label */}
        <text x={plotX0 + plotW / 2} y={svgHeight - 10} textAnchor="middle" fill={colors.textSecondary} fontSize="11">
          Time (seconds)
        </text>

        {/* Y-axis label */}
        <text
          x="14"
          y={midY}
          textAnchor="middle"
          fill={colors.textSecondary}
          fontSize="11"
          transform={`rotate(-90, 14, ${midY})`}
        >
          Acceleration
        </text>

        {/* Current amplitude label if interactive */}
        {interactive && (
          <text x={plotX1 - 5} y={plotY0 + 18} textAnchor="end" fill={colors.accent} fontSize="11" fontWeight="600">
            amp: {((signalHistory[signalHistory.length - 1] || 0)).toFixed(3)}g
          </text>
        )}

        {/* Formula */}
        <text x={plotX0 + 5} y={plotY1 - 8} fill={colors.accent} fontSize="11" opacity="0.8">
          F = ma
        </text>

        {/* Frequency label */}
        {interactive && (
          <text x={plotX0 + plotW - 5} y={plotY1 - 8} textAnchor="end" fill={colors.wave} fontSize="11" opacity="0.8">
            {vibrationFreq} Hz
          </text>
        )}
      </svg>
    );
  };

  // Network Visualization for twist_play - spans full height
  const NetworkVisualization = ({ width, height }: { width: number; height: number }) => {
    const detectionsCount = phoneDetections.filter(d => d).length;

    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: colors.bgCard, borderRadius: '12px', display: 'block' }}
      >
        <defs>
          <radialGradient id="epicenterGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="phoneGlowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </radialGradient>
          <filter id="epicenterGlowFx">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="phoneGlowFx">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width / 2} y="22" textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="700">
          Distributed Seismometer Network
        </text>

        {/* Map background */}
        <ellipse cx={width / 2} cy={height / 2} rx={width * 0.38} ry={height * 0.35}
          fill="#164e63" fillOpacity="0.15" />

        {/* Grid reference lines */}
        <line x1={width * 0.1} y1={height / 2} x2={width * 0.9} y2={height / 2}
          stroke="#1e3a5f" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
        <line x1={width / 2} y1={height * 0.1} x2={width / 2} y2={height * 0.9}
          stroke="#1e3a5f" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />

        {/* Earthquake epicenter */}
        {earthquakeStrength > 0 ? (
          <g transform={`translate(${width / 2}, ${height / 2})`}>
            {[1, 2, 3].map(i => (
              <circle
                key={i}
                cx={0} cy={0}
                r={i * 35 * ((animPhase * 0.5) % 1)}
                fill="none" stroke="#ef4444" strokeWidth="2"
                opacity={1 - ((animPhase * 0.5) % 1)}
              />
            ))}
            <circle cx={0} cy={0} r={18} fill="url(#epicenterGrad)" filter="url(#epicenterGlowFx)" />
            <text x={0} y={-28} textAnchor="middle" fill="#fca5a5" fontSize="12" fontWeight="700">
              M{earthquakeStrength.toFixed(1)}
            </text>
          </g>
        ) : (
          <g transform={`translate(${width / 2}, ${height / 2})`}>
            <circle cx={0} cy={0} r={14} fill="none" stroke="#4b5563" strokeWidth="2" strokeDasharray="4 2" />
            <text x={0} y={5} textAnchor="middle" fill="#6b7280" fontSize="13">?</text>
          </g>
        )}

        {/* Phone network - distributed across full height */}
        {Array(phoneCount).fill(0).map((_, i) => {
          const angle = (i / Math.max(phoneCount, 1)) * Math.PI * 2;
          const tier = i % 3;
          const radius = 55 + tier * 38;
          const cx = width / 2 + Math.cos(angle) * radius * 1.2;
          const cy = height / 2 + Math.sin(angle) * radius * 0.75;
          const detected = phoneDetections[i];

          return (
            <g key={i} transform={`translate(${cx}, ${cy})`}>
              {detected && (
                <circle cx={0} cy={0} r={18} fill="url(#phoneGlowGrad)" opacity="0.5"
                  filter="url(#phoneGlowFx)" />
              )}
              <rect x="-7" y="-12" width="14" height="24" rx="3"
                fill={detected ? '#22c55e' : '#374151'}
                stroke={detected ? '#86efac' : '#6b7280'} strokeWidth="1.5"
              />
              <rect x="-5" y="-9" width="10" height="15" rx="1"
                fill={detected ? '#dcfce7' : '#1f2937'} />
              {detected && (
                <text x={0} y={-16} textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="700">✓</text>
              )}
            </g>
          );
        })}

        {/* Stats panel */}
        <g transform="translate(12, 35)">
          <rect x="0" y="0" width="130" height="80" rx="8" fill="#1e293b" stroke="#334155" />
          <text x="65" y="18" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="700">NETWORK STATUS</text>
          <line x1="10" y1="24" x2="120" y2="24" stroke="#334155" strokeWidth="1" />
          <text x="12" y="40" fill="#94a3b8" fontSize="11">Phones: {phoneCount}</text>
          <text x="12" y="56" fill="#94a3b8" fontSize="11">Detected: {detectionsCount}</text>
          <text x="12" y="72"
            fill={detectionsCount >= 3 ? '#22c55e' : '#f59e0b'} fontSize="12" fontWeight="700">
            {detectionsCount >= 3 ? '✓ CONFIRMED' : '? UNCERTAIN'}
          </text>
        </g>

        {/* Legend */}
        <g transform={`translate(${width - 12}, ${height - 80})`}>
          <rect x="-130" y="0" width="130" height="72" rx="6" fill="#1e293b" stroke="#334155" />
          <rect x="-120" y="10" width="12" height="18" rx="2" fill="#22c55e" />
          <text x="-102" y="23" fill="#94a3b8" fontSize="11">Detected quake</text>
          <rect x="-120" y="34" width="12" height="18" rx="2" fill="#374151" stroke="#6b7280" strokeWidth="1" />
          <text x="-102" y="47" fill="#94a3b8" fontSize="11">No detection</text>
          <circle cx="-114" cy="62" r="5" fill="#ef4444" />
          <text x="-102" y="66" fill="#94a3b8" fontSize="11">Epicenter</text>
        </g>
      </svg>
    );
  };

  // Fixed top progress bar
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
      padding: '12px 0 8px',
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

  // Fixed bottom navigation bar with Back / Next
  const renderBottomNav = (canGoNext: boolean, nextLabel = 'Next →') => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 90,
        gap: '12px',
      }}>
        {/* Back button */}
        <button
          onClick={() => { playSound('click'); prevPhase(); }}
          disabled={!canGoBack}
          style={{
            padding: '12px 20px',
            borderRadius: '10px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: canGoBack ? colors.textSecondary : 'rgba(148,163,184,0.2)',
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            fontSize: '14px',
            transition: 'all 0.2s',
          }}
        >
          ← Back
        </button>

        {/* Nav dots center */}
        {renderNavDots()}

        {/* Next button */}
        <button
          onClick={() => { if (canGoNext) { playSound('click'); nextPhase(); } }}
          disabled={!canGoNext}
          style={{
            padding: '12px 20px',
            borderRadius: '10px',
            border: 'none',
            background: canGoNext
              ? `linear-gradient(135deg, ${colors.accent}, ${colors.wave})`
              : colors.border,
            color: 'white',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            fontWeight: 700,
            fontSize: '14px',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

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
  // PHASE RENDERS - each uses a scrollable content container
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '120px',
        }}>
          <div style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '24px 24px 0',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>
              📱🌋
            </div>

            <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
              Phone Seismometer
            </h1>

            <p style={{
              ...typo.body,
              color: 'rgba(148,163,184,0.7)',
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
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: 'rgba(148,163,184,0.7)', fontStyle: 'italic' }}>
                "The accelerometer in your phone that rotates your screen is actually a vibration sensor capable of detecting ground motion. Millions of phones working together could revolutionize earthquake early warning."
              </p>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                — UC Berkeley Seismological Laboratory
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
              {[
                { icon: '🔬', label: 'MEMS Technology', desc: 'Microscale mechanics' },
                { icon: '📡', label: 'Signal Detection', desc: 'F = ma sensing' },
                { icon: '🌐', label: 'Network Effects', desc: 'Crowdsourced data' },
              ].map((item, i) => (
                <div key={i} style={{
                  background: colors.bgCard,
                  borderRadius: '12px',
                  padding: '16px',
                  border: `1px solid ${colors.border}`,
                  flex: '1',
                  minWidth: '100px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div>
                  <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>{item.label}</div>
                  <div style={{ ...typo.small, color: 'rgba(148,163,184,0.7)' }}>{item.desc}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => { playSound('click'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Explore MEMS Sensors →
            </button>
          </div>
        </div>

        {renderBottomNav(true, 'Next →')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'A tiny mass on springs — movement changes capacitance between electrodes', correct: true },
      { id: 'b', text: 'A fluid that sloshes around, detected by pressure sensors' },
      { id: 'c', text: 'A spinning disk (gyroscope) that resists rotation' },
    ];

    const svgW = isMobile ? 340 : 500;
    const svgH = isMobile ? 260 : 320;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '120px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Make Your Prediction — observe this waveform before experimenting
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              This waveform shows accelerometer output. What is inside the MEMS chip that generates this signal?
            </h2>

            {/* Static SVG graphic - no sliders */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '20px',
            }}>
              {renderSeismicSVG(false, svgW, svgH)}
            </div>

            <p style={{ ...typo.small, color: 'rgba(148,163,184,0.7)', marginBottom: '20px', textAlign: 'center' }}>
              The waveform represents acceleration detected by the MEMS chip. Notice the oscillating pattern typical of seismic activity.
            </p>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
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
                    color: prediction === opt.id ? 'white' : 'rgba(148,163,184,0.7)',
                    textAlign: 'center',
                    lineHeight: '28px',
                    marginRight: '12px',
                    fontWeight: 700,
                    verticalAlign: 'middle',
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
        </div>

        {renderBottomNav(!!prediction, 'Test My Prediction →')}
      </div>
    );
  }

  // PLAY PHASE - Interactive MEMS Simulator
  if (phase === 'play') {
    const svgW = isMobile ? 340 : 520;
    const svgH = isMobile ? 280 : 340;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '120px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              MEMS Accelerometer Simulator
            </h2>
            <p style={{ ...typo.body, color: 'rgba(148,163,184,0.7)', textAlign: 'center', marginBottom: '8px' }}>
              This visualization demonstrates how amplitude and frequency affect the seismic signal recorded by the MEMS accelerometer proof mass. Observe how changing parameters alters the waveform.
            </p>

            {/* Real-world relevance */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                🌍 This technology is used in earthquake early warning systems, fitness trackers, and crash detection — real-world applications that protect lives.
              </p>
            </div>

            {/* Main visualization */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                {renderSeismicSVG(true, svgW, svgH)}
              </div>

              {/* Sliders */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Amplitude slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ ...typo.small, color: 'rgba(148,163,184,0.7)' }}>Vibration Amplitude</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{vibrationAmp}% max</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={vibrationAmp}
                    onChange={(e) => {
                      setVibrationAmp(parseInt(e.target.value));
                      if (onGameEvent) onGameEvent({
                        eventType: 'slider_changed',
                        gameType: 'phone-seismometer',
                        gameTitle: 'Phone Seismometer',
                        details: { slider: 'amplitude', value: e.target.value },
                        timestamp: Date.now()
                      });
                    }}
                    style={{
                      width: '100%',
                      height: '20px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      accentColor: '#3b82f6',
                      WebkitAppearance: 'none',
                      touchAction: 'pan-y',
                    }}
                  />
                  <p style={{ ...typo.small, color: 'rgba(148,163,184,0.7)', marginTop: '4px' }}>
                    When amplitude increases, the proof mass deflects further — higher F = ma force means larger capacitance change C = εA/d.
                  </p>
                </div>

                {/* Frequency slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ ...typo.small, color: 'rgba(148,163,184,0.7)' }}>Vibration Frequency</span>
                    <span style={{ ...typo.small, color: colors.wave, fontWeight: 600 }}>{vibrationFreq} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={vibrationFreq}
                    onChange={(e) => {
                      setVibrationFreq(parseInt(e.target.value));
                      if (onGameEvent) onGameEvent({
                        eventType: 'slider_changed',
                        gameType: 'phone-seismometer',
                        gameTitle: 'Phone Seismometer',
                        details: { slider: 'frequency', value: e.target.value },
                        timestamp: Date.now()
                      });
                    }}
                    style={{
                      width: '100%',
                      height: '20px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      accentColor: '#3b82f6',
                      WebkitAppearance: 'none',
                      touchAction: 'pan-y',
                    }}
                  />
                  <p style={{ ...typo.small, color: 'rgba(148,163,184,0.7)', marginTop: '4px' }}>
                    Earthquake body waves are typically 1–10 Hz. Higher frequency results in faster oscillation of the proof mass relative to the chip housing.
                  </p>
                </div>
              </div>
            </div>

            {/* Comparison reference panel */}
            <div style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '12px',
              marginBottom: '20px',
            }}>
              <div style={{
                flex: 1,
                background: colors.bgCard,
                borderRadius: '10px',
                padding: '14px',
                border: `1px solid ${colors.border}`,
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.accent }}>{vibrationAmp}%</div>
                <div style={{ ...typo.small, color: 'rgba(148,163,184,0.7)' }}>Current amplitude</div>
              </div>
              <div style={{
                flex: 1,
                background: colors.bgCard,
                borderRadius: '10px',
                padding: '14px',
                border: `1px solid ${colors.border}`,
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.wave }}>{vibrationFreq} Hz</div>
                <div style={{ ...typo.small, color: 'rgba(148,163,184,0.7)' }}>Current frequency</div>
              </div>
              <div style={{
                flex: 1,
                background: colors.bgCard,
                borderRadius: '10px',
                padding: '14px',
                border: `1px solid ${colors.border}`,
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: vibrationAmp > 50 ? colors.error : colors.success }}>
                  {vibrationAmp > 70 ? 'Earthquake' : vibrationAmp > 30 ? 'Moderate' : 'Ambient'}
                </div>
                <div style={{ ...typo.small, color: 'rgba(148,163,184,0.7)' }}>Current vs baseline</div>
              </div>
            </div>

            {/* Physics explanation */}
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '10px',
              padding: '16px',
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ ...typo.small, color: 'rgba(148,163,184,0.7)', margin: 0 }}>
                <strong style={{ color: colors.accent }}>MEMS equation: F = ma, C = εA/d.</strong>{' '}
                A tiny proof mass (~microgram) on silicon springs deflects when the phone accelerates. Higher amplitude causes larger equation displacement, changing capacitance between electrodes. The ratio between current amplitude and the baseline reference determines detection confidence.
              </p>
            </div>
          </div>
        </div>

        {renderBottomNav(true, 'Understand the Physics →')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '120px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              How MEMS Accelerometers Work
            </h2>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ ...typo.body, color: 'rgba(148,163,184,0.7)' }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Newton's Second Law at Microscale: F = ma</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  When your phone accelerates, the proof mass inside the MEMS chip experiences <span style={{ color: colors.accent }}>inertial force (F = ma)</span>. This causes it to deflect against the silicon springs, with displacement proportional to applied acceleration.
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Capacitive Sensing: C = εA/d</strong>
                </p>
                <p>
                  The mass position changes the gap to fixed electrodes, altering <span style={{ color: colors.success }}>capacitance (C = ε × A / d)</span>. This tiny change — measured in femtofarads — is amplified and converted to an acceleration reading. The formula shows: smaller gap d = larger capacitance C.
                </p>
              </div>
            </div>

            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
                Key Insight: Incredible Sensitivity
              </h3>
              <p style={{ ...typo.body, color: 'rgba(148,163,184,0.7)', marginBottom: '8px' }}>
                Modern MEMS accelerometers can detect:
              </p>
              <ul style={{ ...typo.body, color: 'rgba(148,163,184,0.7)', margin: 0, paddingLeft: '20px' }}>
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
              marginBottom: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
                Your Prediction: {prediction === 'a' ? '✓ Correct!' : '✗ Not quite'}
              </h3>
              <p style={{ ...typo.body, color: 'rgba(148,163,184,0.7)', margin: 0 }}>
                {prediction === 'a'
                  ? 'You correctly identified that MEMS accelerometers use a proof mass on springs with capacitive sensing. The equation F = ma drives the proof mass displacement.'
                  : 'The correct answer is a tiny mass on springs. The capacitance change C = εA/d between the mass and fixed electrodes is what gets measured.'}
              </p>
            </div>
          </div>
        </div>

        {renderBottomNav(true, 'Discover the Twist →')}
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

    const svgW = isMobile ? 340 : 500;
    const svgH = isMobile ? 260 : 320;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '120px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Variable: Distributed Networks — observe before predicting
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '20px' }}>
              One phone can detect an earthquake. But what do millions of phones working together add that one cannot do alone?
            </h2>

            {/* Static network diagram - no sliders */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              {renderSeismicSVG(false, svgW, svgH)}
            </div>

            <p style={{ ...typo.small, color: 'rgba(148,163,184,0.7)', marginBottom: '20px', textAlign: 'center' }}>
              Notice how this waveform from a single sensor contains noise. What additional capabilities emerge from a distributed network of millions of sensors working together?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
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
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                    color: twistPrediction === opt.id ? 'white' : 'rgba(148,163,184,0.7)',
                    textAlign: 'center',
                    lineHeight: '28px',
                    marginRight: '12px',
                    fontWeight: 700,
                    verticalAlign: 'middle',
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
        </div>

        {renderBottomNav(!!twistPrediction, 'Test the Network →')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const detectionsCount = phoneDetections.filter(d => d).length;
    const svgW = isMobile ? 340 : 520;
    const svgH = isMobile ? 300 : 380;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '120px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Distributed Seismometer Network
            </h2>
            <p style={{ ...typo.body, color: 'rgba(148,163,184,0.7)', textAlign: 'center', marginBottom: '20px' }}>
              Build a network and trigger an earthquake to see how detection improves with more phones. More phones = better triangulation, fewer false alarms, and faster warnings.
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <NetworkVisualization width={svgW} height={svgH} />
              </div>

              {/* Phone count slider */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ ...typo.small, color: 'rgba(148,163,184,0.7)' }}>Phones in Network</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{phoneCount} devices</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={phoneCount}
                  onChange={(e) => {
                    const n = parseInt(e.target.value);
                    setPhoneCount(n);
                    setPhoneDetections(Array(n).fill(false));
                  }}
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    accentColor: '#3b82f6',
                    WebkitAppearance: 'none',
                    touchAction: 'pan-y',
                  }}
                />
              </div>

              {/* Trigger earthquake button */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <button
                  onClick={() => {
                    playSound('click');
                    setEarthquakeStrength(4 + Math.random() * 3);
                  }}
                  disabled={earthquakeStrength > 0}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '12px',
                    border: 'none',
                    background: earthquakeStrength > 0 ? colors.border : colors.error,
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '15px',
                    cursor: earthquakeStrength > 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
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
          </div>
        </div>

        {renderBottomNav(true, 'Understand the Benefits →')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '120px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Crowdsourced Seismology
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {[
                {
                  icon: '📍',
                  title: 'Triangulation',
                  text: 'Multiple detection times from different locations allow precise calculation of earthquake epicenter and depth. Three or more observations enable triangulation. The formula: distance = (P-wave arrival time) × (P-wave velocity) for each sensor.',
                  color: colors.accent,
                },
                {
                  icon: '🚫',
                  title: 'False Alarm Rejection',
                  text: 'One phone shaking could be dropped. Many phones shaking in a pattern that propagates outward = real earthquake. Corroboration eliminates false positives and improves detection accuracy to 99%.',
                  color: colors.warning,
                },
                {
                  icon: '⏰',
                  title: 'Early Warning',
                  text: 'Electronic signals travel at light speed (~300,000 km/s) while seismic waves travel at ~3-6 km/s. Phones near epicenter can alert phones farther away before shaking arrives, saving lives.',
                  color: colors.error,
                },
                {
                  icon: '🌐',
                  title: 'MyShake Network',
                  text: "UC Berkeley's MyShake app has millions of users creating a global distributed seismometer network. It has successfully detected earthquakes worldwide and provides early warning alerts with 99% detection accuracy.",
                  color: colors.success,
                },
              ].map((item, idx) => (
                <div key={idx} style={{
                  background: colors.bgCard,
                  borderRadius: '12px',
                  padding: '20px',
                  border: `1px solid ${colors.border}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '24px' }}>{item.icon}</span>
                    <h3 style={{ ...typo.h3, color: item.color, margin: 0 }}>{item.title}</h3>
                  </div>
                  <p style={{ ...typo.body, color: 'rgba(148,163,184,0.7)', margin: 0 }}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {renderBottomNav(true, 'See Real-World Applications →')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const viewedCount = completedApps.filter(c => c).length;
    const allAppsCompleted = completedApps.every(c => c);

    const handleSelectApp = (i: number) => {
      playSound('click');
      setSelectedApp(i);
      const newCompleted = [...completedApps];
      newCompleted[i] = true;
      setCompletedApps(newCompleted);
    };

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '120px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.small, color: 'rgba(148,163,184,0.7)', textAlign: 'center', marginBottom: '16px' }}>
              App {selectedApp + 1} of {realWorldApps.length} — {viewedCount}/{realWorldApps.length} explored
            </p>

            {/* App selector tabs */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              marginBottom: '20px',
            }}>
              {realWorldApps.map((a, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectApp(i)}
                  style={{
                    background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                    border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                    borderRadius: '12px',
                    padding: '12px 6px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    position: 'relative',
                    transition: 'all 0.2s',
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
                      fontSize: '11px',
                      lineHeight: '18px',
                      textAlign: 'center',
                    }}>
                      ✓
                    </div>
                  )}
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>{a.icon}</div>
                  <div style={{ fontSize: '11px', color: colors.textPrimary, fontWeight: 500, lineHeight: 1.3 }}>
                    {a.title.split(' ').slice(0, 2).join(' ')}
                  </div>
                </button>
              ))}
            </div>

            {/* Selected app details */}
            <div style={{
              borderRadius: '16px',
              overflow: 'hidden',
              marginBottom: '16px',
              border: `1px solid ${app.color}44`,
            }}>
              <div style={{
                background: `${app.color}15`,
                padding: '20px',
                borderBottom: `1px solid ${app.color}33`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '40px' }}>{app.icon}</span>
                  <div>
                    <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: '0 0 4px' }}>{app.title}</h3>
                    <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                  </div>
                </div>
              </div>

              <div style={{ background: colors.bgCard, padding: '20px' }}>
                <p style={{ ...typo.body, color: 'rgba(148,163,184,0.7)', marginBottom: '16px' }}>
                  {app.description}
                </p>

                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '14px',
                  marginBottom: '14px',
                  borderLeft: `3px solid ${colors.accent}`,
                }}>
                  <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '6px', fontWeight: 600 }}>
                    How MEMS Sensors Connect:
                  </h4>
                  <p style={{ ...typo.small, color: 'rgba(148,163,184,0.7)', margin: 0 }}>
                    {app.connection}
                  </p>
                </div>

                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '14px',
                  marginBottom: '14px',
                }}>
                  <h4 style={{ ...typo.small, color: colors.wave, marginBottom: '6px', fontWeight: 600 }}>
                    How It Works:
                  </h4>
                  <p style={{ ...typo.small, color: 'rgba(148,163,184,0.7)', margin: 0 }}>
                    {app.howItWorks}
                  </p>
                </div>

                {/* Stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                  marginBottom: '14px',
                }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{
                      background: colors.bgSecondary,
                      borderRadius: '8px',
                      padding: '10px',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '18px', marginBottom: '4px' }}>{stat.icon}</div>
                      <div style={{ fontSize: '16px', color: app.color, fontWeight: 700 }}>{stat.value}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Got It button */}
                <button
                  onClick={() => {
                    playSound('success');
                    const newCompleted = [...completedApps];
                    newCompleted[selectedApp] = true;
                    setCompletedApps(newCompleted);
                    // Advance to next app if available
                    const nextUnseen = realWorldApps.findIndex((_, i) => !newCompleted[i]);
                    if (nextUnseen >= 0) {
                      setSelectedApp(nextUnseen);
                    }
                  }}
                  style={{
                    ...primaryButtonStyle,
                    width: '100%',
                    fontSize: '15px',
                    padding: '12px 20px',
                    background: `linear-gradient(135deg, ${app.color}, ${app.color}bb)`,
                  }}
                >
                  Got It — Next App →
                </button>
              </div>
            </div>

            {/* Take the Test button — appears after viewing all apps */}
            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Take the Knowledge Test →
              </button>
            )}
          </div>
        </div>

        {renderBottomNav(allAppsCompleted, 'Take the Test →')}
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
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {renderProgressBar()}

          <div style={{
            flex: 1,
            overflowY: 'auto',
            paddingTop: '60px',
            paddingBottom: '120px',
          }}>
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
              <p style={{ ...typo.body, color: 'rgba(148,163,184,0.7)', marginBottom: '24px' }}>
                {passed
                  ? 'You understand MEMS sensors and earthquake detection!'
                  : 'Review the concepts and try again.'}
              </p>

              {/* Answer review */}
              <div style={{ textAlign: 'left', marginBottom: '24px' }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
                  Answer Review
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {testQuestions.map((q, i) => {
                    const correctId = q.options.find(o => o.correct)?.id;
                    const userAnswer = testAnswers[i];
                    const isCorrect = userAnswer === correctId;
                    return (
                      <div key={i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: colors.bgCard,
                        borderRadius: '8px',
                        padding: '10px 14px',
                        border: `1px solid ${isCorrect ? colors.success + '44' : colors.error + '44'}`,
                      }}>
                        <span style={{
                          fontSize: '16px',
                          color: isCorrect ? colors.success : colors.error,
                          fontWeight: 700,
                          minWidth: '20px',
                        }}>
                          {isCorrect ? '✓' : '✗'}
                        </span>
                        <span style={{ ...typo.small, color: 'rgba(148,163,184,0.7)' }}>
                          Q{i + 1}: {q.question.slice(0, 60)}...
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setTestSubmitted(false);
                    setTestAnswers(Array(10).fill(null));
                    setCurrentQuestion(0);
                    setTestScore(0);
                    goToPhase('hook');
                  }}
                  style={{
                    padding: '14px 24px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: 'rgba(148,163,184,0.7)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Play Again
                </button>
                {passed && (
                  <button
                    onClick={() => { playSound('complete'); nextPhase(); }}
                    style={primaryButtonStyle}
                  >
                    Complete Lesson →
                  </button>
                )}
              </div>
            </div>
          </div>

          {renderBottomNav(passed, 'Complete →')}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '120px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}>
              <span style={{ ...typo.small, color: 'rgba(148,163,184,0.7)' }}>
                Question {currentQuestion + 1} of 10
              </span>
              <div style={{ display: 'flex', gap: '5px' }}>
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
              padding: '14px 16px',
              marginBottom: '14px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ ...typo.small, color: 'rgba(148,163,184,0.7)', margin: 0 }}>
                {question.scenario}
              </p>
            </div>

            {/* Question */}
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '18px' }}>
              {question.question}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {question.options.map(opt => {
                const isSelected = testAnswers[currentQuestion] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      playSound('click');
                      const newAnswers = [...testAnswers];
                      newAnswers[currentQuestion] = opt.id;
                      setTestAnswers(newAnswers);
                    }}
                    style={{
                      background: isSelected ? `${colors.accent}22` : colors.bgCard,
                      border: `2px solid ${isSelected ? colors.accent : colors.border}`,
                      borderRadius: '10px',
                      padding: '14px 16px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      boxShadow: isSelected ? `0 0 12px ${colors.accentGlow}` : 'none',
                    }}
                  >
                    <span style={{
                      display: 'inline-block',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: isSelected ? colors.accent : colors.bgSecondary,
                      color: isSelected ? 'white' : 'rgba(148,163,184,0.7)',
                      textAlign: 'center',
                      lineHeight: '24px',
                      marginRight: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      verticalAlign: 'middle',
                    }}>
                      {opt.id.toUpperCase()}
                    </span>
                    <span style={{ color: colors.textPrimary, ...typo.small }}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {currentQuestion > 0 && (
                <button
                  onClick={() => setCurrentQuestion(currentQuestion - 1)}
                  style={{
                    flex: 1,
                    padding: '13px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: 'rgba(148,163,184,0.7)',
                    cursor: 'pointer',
                  }}
                >
                  ← Previous
                </button>
              )}
              {currentQuestion < 9 ? (
                <button
                  onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                  disabled={!testAnswers[currentQuestion]}
                  style={{
                    flex: 1,
                    padding: '13px',
                    borderRadius: '10px',
                    border: 'none',
                    background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                    color: 'white',
                    cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                >
                  Next →
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
                    padding: '13px',
                    borderRadius: '10px',
                    border: 'none',
                    background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                    color: 'white',
                    cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </div>

        {renderBottomNav(false)}
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
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '120px',
        }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '100px', marginBottom: '24px' }}>
              🏆
            </div>

            <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
              MEMS Sensor Master!
            </h1>

            <p style={{ ...typo.body, color: 'rgba(148,163,184,0.7)', maxWidth: '500px', margin: '0 auto 32px' }}>
              You now understand how the tiny accelerometer in your phone can detect motion and contribute to global earthquake early warning systems. This technology represents a remarkable application of physics at the microscale.
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '32px',
              border: `1px solid ${colors.border}`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
                You Learned:
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
                {[
                  'MEMS accelerometers use a proof mass on silicon springs',
                  'Equation F = ma drives the proof mass displacement',
                  'Capacitive sensing: C = εA/d measures tiny displacements',
                  'Phones can detect earthquakes, footsteps, and crashes',
                  'Distributed networks enable triangulation and false alarm rejection',
                  'Early warning saves lives by outrunning seismic waves at 3–6 km/s',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: colors.success, fontSize: '16px' }}>✓</span>
                    <span style={{ ...typo.small, color: 'rgba(148,163,184,0.7)' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => goToPhase('hook')}
                style={{
                  padding: '14px 28px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: 'rgba(148,163,184,0.7)',
                  cursor: 'pointer',
                  fontWeight: 600,
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
          </div>
        </div>

        {renderBottomNav(false)}
      </div>
    );
  }

  return null;
};

export default PhoneSeismometerRenderer;
