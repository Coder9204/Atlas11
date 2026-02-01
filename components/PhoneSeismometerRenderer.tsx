'use client';

import React, { useState, useEffect, useRef } from 'react';

const realWorldApps = [
  {
    icon: '📱',
    title: 'Earthquake Early Warning',
    short: 'Smartphone networks detect quakes in seconds',
    tagline: 'Crowdsourced seismology saves lives',
    description: 'Apps like MyShake and ShakeAlert use millions of smartphone accelerometers as a distributed seismic network. When multiple phones detect shaking simultaneously, alerts go out before damaging waves arrive.',
    connection: 'MEMS accelerometers in phones can detect P-waves, which travel faster than destructive S-waves and surface waves, providing crucial seconds of warning.',
    howItWorks: 'Machine learning distinguishes earthquake signatures from everyday phone movement. When a quake is confirmed, alerts propagate to users in the affected area within seconds.',
    stats: [
      { value: '10-60', label: 'seconds warning', icon: '⏱️' },
      { value: '3M+', label: 'MyShake users', icon: '📱' },
      { value: '99%', label: 'detection accuracy', icon: '✅' }
    ],
    examples: ['California ShakeAlert', 'Japan JMA warnings', 'Mexico SASMEX', 'MyShake app'],
    companies: ['UC Berkeley', 'USGS', 'Google', 'Apple'],
    futureImpact: 'Global smartphone coverage will enable earthquake early warning everywhere, not just in regions with expensive seismometer networks.',
    color: '#EF4444'
  },
  {
    icon: '👟',
    title: 'Fitness Tracking',
    short: 'Step counting through accelerometer patterns',
    tagline: 'Every step is physics in action',
    description: 'Fitness trackers and smartphones count steps by detecting the characteristic acceleration pattern of walking. The accelerometer senses the impact of each footfall and periodic motion of gait.',
    connection: 'Walking produces a distinctive vertical acceleration signature: a sharp spike on heel strike followed by oscillation. Algorithms detect these patterns to count steps accurately.',
    howItWorks: 'Signal processing filters out noise and detects peaks in acceleration data. Machine learning distinguishes walking from running, climbing stairs, and other activities.',
    stats: [
      { value: '97%', label: 'step accuracy', icon: '✅' },
      { value: '500M+', label: 'fitness devices', icon: '⌚' },
      { value: '$36B', label: 'wearables market', icon: '📈' }
    ],
    examples: ['Apple Watch Activity', 'Fitbit step tracking', 'Google Fit', 'Samsung Health'],
    companies: ['Apple', 'Fitbit', 'Garmin', 'Samsung'],
    futureImpact: 'Multi-sensor fusion will enable accurate activity recognition for any movement pattern, from swimming to weightlifting.',
    color: '#22C55E'
  },
  {
    icon: '🚗',
    title: 'Vehicle Crash Detection',
    short: 'Sudden deceleration triggers emergency response',
    tagline: 'Accelerometers that save lives',
    description: 'Modern smartphones and vehicles detect crashes using accelerometers. A sudden high-G deceleration event triggers automatic calls to emergency services with GPS location.',
    connection: 'Crashes produce distinctive acceleration signatures: multi-G deceleration over tens of milliseconds, often with rapid direction changes. Algorithms distinguish crashes from drops.',
    howItWorks: 'Sensors sample at 100+ Hz to capture impact dynamics. Multiple accelerometer axes detect frontal, side, and rollover impacts. Confirmation prompts prevent false alerts.',
    stats: [
      { value: '100G', label: 'crash detection range', icon: '💥' },
      { value: '30', label: 'seconds to call 911', icon: '⏱️' },
      { value: '10K+', label: 'lives saved yearly', icon: '❤️' }
    ],
    examples: ['iPhone Crash Detection', 'Pixel emergency SOS', 'OnStar response', 'GM crash sensors'],
    companies: ['Apple', 'Google', 'GM OnStar', 'BMW'],
    futureImpact: 'Autonomous vehicles will use accelerometer data for real-time safety systems and post-crash automated response.',
    color: '#F59E0B'
  },
  {
    icon: '🎮',
    title: 'Motion Gaming',
    short: 'Controllers sense every tilt and shake',
    tagline: 'Physics becomes gameplay',
    description: 'Game controllers from the Nintendo Wii to modern VR controllers use accelerometers to translate physical motion into game input. Players swing, tilt, and gesture to control gameplay.',
    connection: 'Accelerometers measure both gravitational orientation and dynamic motion. Combined with gyroscopes, they provide complete 6-DOF motion tracking for immersive gaming.',
    howItWorks: 'Sensor fusion combines accelerometer and gyroscope data. Dead reckoning tracks motion, while gravity provides absolute orientation reference. Drift is corrected continuously.',
    stats: [
      { value: '1000', label: 'Hz sampling rate', icon: '⚡' },
      { value: '6', label: 'degrees of freedom', icon: '🎯' },
      { value: '$180B', label: 'gaming market', icon: '📈' }
    ],
    examples: ['Nintendo Switch Joy-Con', 'PlayStation DualSense', 'Oculus Quest 2', 'Mobile gaming'],
    companies: ['Nintendo', 'Sony', 'Meta', 'Valve'],
    futureImpact: 'Full-body motion tracking and haptic feedback will create increasingly immersive gaming experiences.',
    color: '#8B5CF6'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
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

interface GameEvent {
  type: 'prediction' | 'observation' | 'interaction' | 'completion';
  phase: Phase;
  data: Record<string, unknown>;
}

interface PhoneSeismometerRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

interface GameState {
  phase: Phase;
  prediction: string | null;
  twistPrediction: string | null;
  testAnswers: number[];
  completedApps: number[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const PHASES: Phase[] = [
  'hook', 'predict', 'play', 'review',
  'twist_predict', 'twist_play', 'twist_review',
  'transfer', 'test', 'mastery'
];

const TEST_QUESTIONS = [
  {
    question: 'How does a MEMS accelerometer in your phone detect motion?',
    options: [
      { text: 'Using GPS signals from satellites', correct: false },
      { text: 'A tiny mass on springs moves relative to the chip, changing capacitance', correct: true },
      { text: 'It senses air pressure changes from movement', correct: false },
      { text: 'Magnetic fields interact with phone motion', correct: false }
    ]
  },
  {
    question: 'Why can your phone detect an earthquake even though it\'s not a scientific seismometer?',
    options: [
      { text: 'Phones are more sensitive than real seismometers', correct: false },
      { text: 'Earthquakes create vibrations that accelerometers can measure', correct: true },
      { text: 'Phones connect to earthquake warning systems via internet', correct: false },
      { text: 'Only special earthquake apps can detect quakes', correct: false }
    ]
  },
  {
    question: 'What does the accelerometer actually measure?',
    options: [
      { text: 'Speed (velocity)', correct: false },
      { text: 'Position (location)', correct: false },
      { text: 'Acceleration (rate of velocity change)', correct: true },
      { text: 'Distance traveled', correct: false }
    ]
  },
  {
    question: 'Why do many phones together make better earthquake detectors than one?',
    options: [
      { text: 'They share battery power', correct: false },
      { text: 'Distributed sensors provide location triangulation and noise averaging', correct: true },
      { text: 'More phones means louder sound detection', correct: false },
      { text: 'They boost each other\'s signals', correct: false }
    ]
  },
  {
    question: 'Which type of seismic wave travels fastest and arrives first at a seismometer?',
    options: [
      { text: 'Surface waves (Love and Rayleigh waves)', correct: false },
      { text: 'S-waves (secondary/shear waves)', correct: false },
      { text: 'P-waves (primary/pressure waves)', correct: true },
      { text: 'All seismic waves travel at the same speed', correct: false }
    ]
  },
  {
    question: 'What is the difference between P-waves and S-waves?',
    options: [
      { text: 'P-waves compress and expand rock; S-waves shake rock side-to-side', correct: true },
      { text: 'P-waves only travel through water; S-waves travel through rock', correct: false },
      { text: 'P-waves are stronger than S-waves', correct: false },
      { text: 'There is no difference; they are the same wave', correct: false }
    ]
  },
  {
    question: 'Why can\'t S-waves travel through Earth\'s liquid outer core?',
    options: [
      { text: 'The core is too hot for any waves', correct: false },
      { text: 'S-waves require a rigid medium to propagate shear motion', correct: true },
      { text: 'S-waves are absorbed by iron', correct: false },
      { text: 'The core reflects all seismic waves', correct: false }
    ]
  },
  {
    question: 'What does the Richter magnitude scale measure?',
    options: [
      { text: 'The duration of earthquake shaking', correct: false },
      { text: 'The logarithmic amplitude of seismic waves (energy released)', correct: true },
      { text: 'The depth of the earthquake focus', correct: false },
      { text: 'The number of aftershocks', correct: false }
    ]
  },
  {
    question: 'How does your phone know which way is "down" for screen rotation?',
    options: [
      { text: 'It uses GPS to determine orientation', correct: false },
      { text: 'The accelerometer detects the direction of gravitational acceleration', correct: true },
      { text: 'It uses the camera to see the horizon', correct: false },
      { text: 'The phone has a built-in compass', correct: false }
    ]
  },
  {
    question: 'Why are surface waves often the most destructive during earthquakes?',
    options: [
      { text: 'They travel the fastest', correct: false },
      { text: 'They have the largest amplitude and cause ground rolling/shaking at the surface', correct: true },
      { text: 'They only occur during major earthquakes', correct: false },
      { text: 'They travel through the Earth\'s core', correct: false }
    ]
  }
];

const TRANSFER_APPS = [
  {
    title: 'MyShake App',
    description: 'Turns millions of phones into a distributed earthquake early warning network!',
    icon: '📱'
  },
  {
    title: 'Step Counting',
    description: 'Pedometers use accelerometer patterns to detect walking, running, climbing stairs.',
    icon: '👟'
  },
  {
    title: 'Screen Rotation',
    description: 'Accelerometer detects gravity direction to know which way is "down" for your display.',
    icon: '🔄'
  },
  {
    title: 'Vehicle Crash Detection',
    description: 'Sudden high-G deceleration triggers automatic emergency calls in modern phones/cars.',
    icon: '🚗'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function playSound(type: 'click' | 'success' | 'failure' | 'transition' | 'complete'): void {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const sounds: Record<string, { freq: number; type: OscillatorType; duration: number }> = {
      click: { freq: 600, type: 'sine', duration: 0.08 },
      success: { freq: 880, type: 'sine', duration: 0.15 },
      failure: { freq: 220, type: 'sine', duration: 0.25 },
      transition: { freq: 440, type: 'triangle', duration: 0.12 },
      complete: { freq: 660, type: 'sine', duration: 0.2 }
    };

    const sound = sounds[type];
    oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch {
    // Audio not available
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function PhoneSeismometerRenderer({ phase: initialPhase, onPhaseComplete, onCorrectAnswer, onIncorrectAnswer }: PhoneSeismometerRendererProps) {
  // ─── State ───────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>(initialPhase || 'hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<number[]>([]);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Simulation state
  const [vibrationSource, setVibrationSource] = useState<'none' | 'footstep' | 'door' | 'earthquake'>('none');
  const [signalHistory, setSignalHistory] = useState<number[]>(Array(100).fill(0));
  const [massPosition, setMassPosition] = useState(0);
  const [isRecording, setIsRecording] = useState(true);
  const [animPhase, setAnimPhase] = useState(0);

  // Twist state - distributed network
  const [phoneCount, setPhoneCount] = useState(1);
  const [earthquakeStrength, setEarthquakeStrength] = useState(0);
  const [phoneDetections, setPhoneDetections] = useState<boolean[]>([false]);
  const [isMobile, setIsMobile] = useState(false);

  const navigationLockRef = useRef(false);

  // Responsive detection
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

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const goToPhase = (newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;

    playSound('transition');
    setPhase(newPhase);
    if (onPhaseComplete) onPhaseComplete();

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  };

  const nextPhase = () => {
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex < PHASES.length - 1) {
      goToPhase(PHASES[currentIndex + 1]);
    }
  };

  // Generate vibration signal based on source
  const getVibrationSignal = (source: string, t: number): number => {
    switch (source) {
      case 'footstep':
        // Periodic sharp impacts
        const footPhase = t % 1;
        return footPhase < 0.1 ? Math.sin(footPhase * Math.PI * 10) * 0.6 * Math.exp(-footPhase * 30) : 0;
      case 'door':
        // Single sharp impact that decays
        if (t < 2) {
          return Math.sin(t * 50) * Math.exp(-t * 3) * 0.8;
        }
        return 0;
      case 'earthquake':
        // Complex low frequency vibration
        return (Math.sin(t * 3) * 0.4 + Math.sin(t * 7) * 0.3 + Math.sin(t * 11) * 0.2) *
          (1 + Math.sin(t * 0.5) * 0.5);
      default:
        // Noise floor
        return (Math.random() - 0.5) * 0.05;
    }
  };

  // ─── Animation Effects ───────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => p + 0.05);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Signal simulation
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      const signal = getVibrationSignal(vibrationSource, animPhase);
      setMassPosition(signal * 30);

      setSignalHistory(prev => {
        const newHistory = [...prev.slice(1), signal];
        return newHistory;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isRecording, vibrationSource, animPhase]);

  // Twist - earthquake detection simulation
  useEffect(() => {
    if (phase !== 'twist_play' || earthquakeStrength === 0) return;

    // Simulate detection across phone network
    const detectionThreshold = 0.3;
    const baseDetectionProb = earthquakeStrength / 10;

    setPhoneDetections(Array(phoneCount).fill(false).map(() =>
      Math.random() < baseDetectionProb + (phoneCount > 1 ? 0.2 : 0)
    ));

    const timeout = setTimeout(() => {
      setEarthquakeStrength(0);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [phase, earthquakeStrength, phoneCount]);

  // Reset when returning to play phase
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

  // ─── Render Helpers ──────────────────────────────────────────────────────────
  const renderProgressBar = () => (
    <div className="flex items-center gap-1 mb-6">
      {PHASES.map((p, i) => (
        <div
          key={p}
          className={`h-2 flex-1 rounded-full transition-all duration-300 ${
            i <= PHASES.indexOf(phase)
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
              : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );

  const renderAccelerometerScene = () => {
    return (
      <svg viewBox="0 0 700 400" className="w-full h-72">
        <defs>
          {/* Premium background gradient */}
          <linearGradient id="pseisLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="25%" stopColor="#0a1628" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="75%" stopColor="#0a1628" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* MEMS chip housing gradient - metallic look */}
          <linearGradient id="pseisChipMetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="20%" stopColor="#475569" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="80%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Silicon substrate gradient */}
          <linearGradient id="pseisSilicon" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4b5563" />
            <stop offset="30%" stopColor="#374151" />
            <stop offset="70%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>

          {/* Proof mass gradient - golden metallic */}
          <linearGradient id="pseisProofMass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="25%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="75%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Capacitor plate gradient - green metallic */}
          <linearGradient id="pseisCapacitor" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>

          {/* Spring gradient - blue metallic */}
          <linearGradient id="pseisSpring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="50%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>

          {/* Phone body gradient - premium dark metal */}
          <linearGradient id="pseisPhoneBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4b5563" />
            <stop offset="20%" stopColor="#374151" />
            <stop offset="50%" stopColor="#1f2937" />
            <stop offset="80%" stopColor="#374151" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>

          {/* Phone screen gradient */}
          <linearGradient id="pseisPhoneScreen" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Signal waveform glow */}
          <radialGradient id="pseisSignalGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
            <stop offset="40%" stopColor="#22c55e" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </radialGradient>

          {/* Oscilloscope screen gradient */}
          <linearGradient id="pseisOscilloscope" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#022c22" />
            <stop offset="50%" stopColor="#064e3b" />
            <stop offset="100%" stopColor="#022c22" />
          </linearGradient>

          {/* Vibration wave radial */}
          <radialGradient id="pseisVibrationWave" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>

          {/* Glow filter for signal dot */}
          <filter id="pseisSignalDotGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Glow filter for proof mass */}
          <filter id="pseisProofMassGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Phone screen glow */}
          <filter id="pseisScreenGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Vibration shake filter */}
          <filter id="pseisShakeEffect" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Grid pattern for oscilloscope */}
          <pattern id="pseisGridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#134e4a" strokeWidth="0.5" strokeOpacity="0.4" />
          </pattern>

          {/* Lab grid pattern */}
          <pattern id="pseisLabGrid" width="25" height="25" patternUnits="userSpaceOnUse">
            <rect width="25" height="25" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
        </defs>

        {/* Premium dark background */}
        <rect width="700" height="400" fill="url(#pseisLabBg)" />
        <rect width="700" height="400" fill="url(#pseisLabGrid)" />

        {/* === MEMS CHIP SECTION === */}
        <g transform="translate(40, 60)">
          {/* Section label */}
          <text x="100" y="-20" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="600" letterSpacing="0.5">
            MEMS ACCELEROMETER
          </text>
          <text x="100" y="-5" textAnchor="middle" fill="#64748b" fontSize="10">
            (inside your smartphone)
          </text>

          {/* Chip outer housing - premium metallic */}
          <rect x="0" y="0" width="200" height="140" rx="10" fill="url(#pseisChipMetal)" stroke="#64748b" strokeWidth="2" />

          {/* Chip inner bezel */}
          <rect x="8" y="8" width="184" height="124" rx="6" fill="#111827" stroke="#374151" strokeWidth="1" />

          {/* Silicon substrate */}
          <rect x="16" y="16" width="168" height="108" rx="4" fill="url(#pseisSilicon)" />

          {/* Fixed frame rails */}
          <rect x="20" y="20" width="160" height="10" fill="#475569" rx="2" />
          <rect x="20" y="110" width="160" height="10" fill="#475569" rx="2" />

          {/* Left spring - animated zigzag */}
          <path
            d={`M 45 30
                Q 35 40 45 50
                Q 55 60 45 70
                Q 35 80 45 90
                Q 55 100 45 110`}
            fill="none"
            stroke="url(#pseisSpring)"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Right spring - animated zigzag */}
          <path
            d={`M 155 30
                Q 165 40 155 50
                Q 145 60 155 70
                Q 165 80 155 90
                Q 145 100 155 110`}
            fill="none"
            stroke="url(#pseisSpring)"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Left capacitor plate (fixed) */}
          <rect x="55" y="35" width="6" height="70" fill="url(#pseisCapacitor)" rx="2" />

          {/* Right capacitor plate (fixed) */}
          <rect x="139" y="35" width="6" height="70" fill="url(#pseisCapacitor)" rx="2" />

          {/* Proof mass (moves with acceleration) */}
          <g transform={`translate(${massPosition * 0.8}, 0)`} filter="url(#pseisProofMassGlow)">
            <rect
              x="70"
              y="40"
              width="60"
              height="60"
              fill="url(#pseisProofMass)"
              rx="6"
              stroke="#fcd34d"
              strokeWidth="1"
            />
            {/* Mass surface detail */}
            <rect x="75" y="45" width="50" height="50" rx="4" fill="#d97706" opacity="0.3" />
            <text x="100" y="75" textAnchor="middle" fill="#78350f" fontSize="10" fontWeight="bold">
              MASS
            </text>
          </g>

          {/* Capacitance arrows */}
          <g opacity="0.7">
            <text x="62" y="90" fill="#4ade80" fontSize="8">C₁</text>
            <text x="130" y="90" fill="#4ade80" fontSize="8">C₂</text>
          </g>

          {/* Labels below chip */}
          <text x="100" y="160" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="500">
            Mass displacement → Capacitance change → Voltage signal
          </text>
        </g>

        {/* === OSCILLOSCOPE / SIGNAL DISPLAY === */}
        <g transform="translate(280, 50)">
          {/* Section label */}
          <text x="180" y="-15" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="600" letterSpacing="0.5">
            ACCELEROMETER SIGNAL
          </text>

          {/* Oscilloscope frame */}
          <rect x="0" y="0" width="360" height="170" rx="8" fill="#1f2937" stroke="#475569" strokeWidth="2" />

          {/* Screen bezel */}
          <rect x="8" y="8" width="344" height="154" rx="4" fill="#111827" />

          {/* Phosphor screen */}
          <rect x="12" y="12" width="336" height="146" rx="2" fill="url(#pseisOscilloscope)" />

          {/* Grid overlay */}
          <rect x="12" y="12" width="336" height="146" rx="2" fill="url(#pseisGridPattern)" />

          {/* Grid major lines */}
          {[...Array(7)].map((_, i) => (
            <line
              key={`h${i}`}
              x1="12"
              y1={33 + i * 21}
              x2="348"
              y2={33 + i * 21}
              stroke="#134e4a"
              strokeWidth={i === 3 ? "1.5" : "0.5"}
              opacity={i === 3 ? 1 : 0.6}
            />
          ))}
          {[...Array(17)].map((_, i) => (
            <line
              key={`v${i}`}
              x1={12 + i * 21}
              y1="12"
              x2={12 + i * 21}
              y2="158"
              stroke="#134e4a"
              strokeWidth="0.5"
              opacity="0.6"
            />
          ))}

          {/* Zero reference line */}
          <line x1="12" y1="85" x2="348" y2="85" stroke="#22c55e" strokeWidth="1" opacity="0.4" />

          {/* Signal trace with glow */}
          <path
            d={`M 12 85 ${signalHistory.map((v, i) => `L ${12 + i * 3.36} ${85 - v * 65}`).join(' ')}`}
            fill="none"
            stroke="#4ade80"
            strokeWidth="2.5"
            filter="url(#pseisScreenGlow)"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current value indicator with glow */}
          <circle
            cx={348}
            cy={85 - (signalHistory[signalHistory.length - 1] || 0) * 65}
            r={6}
            fill="url(#pseisSignalGlow)"
            filter="url(#pseisSignalDotGlow)"
          />

          {/* Y-axis labels */}
          <text x="5" y="25" textAnchor="end" fill="#4ade80" fontSize="10" fontWeight="500">+1g</text>
          <text x="5" y="88" textAnchor="end" fill="#6b7280" fontSize="10" fontWeight="500">0</text>
          <text x="5" y="155" textAnchor="end" fill="#4ade80" fontSize="10" fontWeight="500">-1g</text>

          {/* Accelerometer reading display */}
          <g transform="translate(12, 175)">
            <rect x="0" y="0" width="336" height="40" rx="4" fill="#111827" stroke="#374151" strokeWidth="1" />
            <text x="10" y="16" fill="#64748b" fontSize="10">X-AXIS:</text>
            <text x="60" y="16" fill="#4ade80" fontSize="11" fontWeight="600">
              {(signalHistory[signalHistory.length - 1] || 0).toFixed(3)}g
            </text>
            <text x="120" y="16" fill="#64748b" fontSize="10">Y-AXIS:</text>
            <text x="170" y="16" fill="#60a5fa" fontSize="11" fontWeight="600">0.000g</text>
            <text x="230" y="16" fill="#64748b" fontSize="10">Z-AXIS:</text>
            <text x="280" y="16" fill="#f472b6" fontSize="11" fontWeight="600">1.000g</text>
            <text x="10" y="32" fill="#64748b" fontSize="9">SAMPLE RATE: 100Hz</text>
            <text x="150" y="32" fill="#64748b" fontSize="9">SENSITIVITY: ±2g</text>
            <text x="280" y="32" fill={vibrationSource !== 'none' ? '#f59e0b' : '#22c55e'} fontSize="9" fontWeight="600">
              {vibrationSource !== 'none' ? 'ACTIVE' : 'IDLE'}
            </text>
          </g>
        </g>

        {/* === SMARTPHONE VISUALIZATION === */}
        <g transform="translate(40, 240)">
          {/* Section label */}
          <text x="50" y="-10" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">
            SMARTPHONE
          </text>

          {/* Phone body with premium gradient */}
          <rect x="0" y="0" width="100" height="150" rx="12" fill="url(#pseisPhoneBody)" stroke="#6b7280" strokeWidth="2" />

          {/* Phone inner bezel */}
          <rect x="4" y="4" width="92" height="142" rx="10" fill="#1f2937" />

          {/* Screen */}
          <rect x="8" y="20" width="84" height="110" rx="4" fill="url(#pseisPhoneScreen)" />

          {/* Mini waveform on screen */}
          <path
            d={`M 12 75 ${signalHistory.slice(-35).map((v, i) => `L ${12 + i * 2.3} ${75 - v * 25}`).join(' ')}`}
            fill="none"
            stroke="#4ade80"
            strokeWidth="1.5"
            filter="url(#pseisScreenGlow)"
          />

          {/* Screen UI elements */}
          <text x="50" y="35" textAnchor="middle" fill="#94a3b8" fontSize="8">ACCELEROMETER</text>
          <text x="50" y="115" textAnchor="middle" fill="#6b7280" fontSize="7">
            {(signalHistory[signalHistory.length - 1] || 0).toFixed(2)}g
          </text>

          {/* Camera notch */}
          <rect x="35" y="8" width="30" height="6" rx="3" fill="#111827" />
          <circle cx="50" cy="11" r="2" fill="#374151" />

          {/* Home button */}
          <circle cx="50" cy="140" r="6" fill="#374151" stroke="#4b5563" strokeWidth="1" />

          {/* Vibration waves when active */}
          {vibrationSource !== 'none' && (
            <g filter="url(#pseisShakeEffect)">
              {[1, 2, 3].map(i => (
                <ellipse
                  key={i}
                  cx="50"
                  cy="75"
                  rx={20 + i * 15}
                  ry={10 + i * 8}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  opacity={0.6 - i * 0.15}
                  style={{
                    animation: `pulse ${1 + i * 0.3}s ease-out infinite`,
                  }}
                />
              ))}
              {/* Shake arrows */}
              <path d="M -15 75 L -8 68 M -15 75 L -8 82" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 115 75 L 108 68 M 115 75 L 108 82" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          )}
        </g>

        {/* === SEISMIC WAVE VISUALIZATION === */}
        <g transform="translate(160, 280)">
          <text x="220" y="-5" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">
            SEISMIC WAVE PROPAGATION
          </text>

          {/* Ground layer */}
          <rect x="0" y="30" width="480" height="60" rx="4" fill="#1f2937" stroke="#374151" strokeWidth="1" />
          <text x="10" y="65" fill="#64748b" fontSize="9">GROUND SURFACE</text>

          {/* P-wave and S-wave visualization */}
          {vibrationSource === 'earthquake' && (
            <>
              {/* P-wave (compression) */}
              <g>
                {[...Array(8)].map((_, i) => (
                  <rect
                    key={`p${i}`}
                    x={50 + i * 25 + Math.sin(animPhase * 3 + i) * 5}
                    y="40"
                    width="15"
                    height="40"
                    fill="#22c55e"
                    opacity={0.3 + Math.sin(animPhase * 3 + i) * 0.2}
                    rx="2"
                  />
                ))}
                <text x="130" y="25" fill="#22c55e" fontSize="10" fontWeight="600">P-WAVE (Primary)</text>
              </g>

              {/* S-wave (shear) */}
              <g>
                <path
                  d={`M 280 60 ${[...Array(10)].map((_, i) =>
                    `Q ${290 + i * 20} ${50 + Math.sin(animPhase * 2 + i) * 15} ${300 + i * 20} 60`
                  ).join(' ')}`}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="3"
                />
                <text x="380" y="25" fill="#f59e0b" fontSize="10" fontWeight="600">S-WAVE (Secondary)</text>
              </g>
            </>
          )}

          {/* Idle state */}
          {vibrationSource === 'none' && (
            <text x="240" y="65" textAnchor="middle" fill="#64748b" fontSize="10" fontStyle="italic">
              Select a vibration source above to visualize seismic waves
            </text>
          )}
        </g>

        {/* === SOURCE INDICATOR === */}
        <g transform="translate(0, 375)">
          <rect x="200" y="0" width="300" height="25" rx="6" fill="#111827" stroke="#374151" strokeWidth="1" />
          <text x="350" y="17" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="600">
            Source: {vibrationSource === 'none' ? 'Background noise' :
              vibrationSource === 'footstep' ? 'Footsteps' :
                vibrationSource === 'door' ? 'Door slam' : 'Earthquake!'}
          </text>
          {vibrationSource !== 'none' && (
            <circle cx="215" cy="12" r="5" fill={vibrationSource === 'earthquake' ? '#ef4444' : '#f59e0b'}>
              <animate attributeName="opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" />
            </circle>
          )}
        </g>
      </svg>
    );
  };

  const renderNetworkScene = () => {
    const detectionsCount = phoneDetections.filter(d => d).length;
    const accuracy = phoneCount > 0 ? (detectionsCount / phoneCount * 100).toFixed(0) : 0;

    return (
      <svg viewBox="0 0 700 350" className="w-full h-64">
        <defs>
          {/* Premium background gradient - darker for network view */}
          <linearGradient id="pseisNetBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="25%" stopColor="#0c1929" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="75%" stopColor="#0c1929" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Map region gradient - earth tones */}
          <radialGradient id="pseisMapRegion" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#164e63" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#155e75" stopOpacity="0.25" />
            <stop offset="70%" stopColor="#0e4456" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0" />
          </radialGradient>

          {/* Earthquake epicenter gradient */}
          <radialGradient id="pseisEpicenter" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fca5a5" stopOpacity="1" />
            <stop offset="30%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#dc2626" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
          </radialGradient>

          {/* Phone detected gradient - green glow */}
          <radialGradient id="pseisPhoneDetected" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#86efac" stopOpacity="1" />
            <stop offset="50%" stopColor="#22c55e" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </radialGradient>

          {/* Phone idle gradient */}
          <linearGradient id="pseisPhoneIdle" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="50%" stopColor="#4b5563" />
            <stop offset="100%" stopColor="#374151" />
          </linearGradient>

          {/* Phone detected body gradient */}
          <linearGradient id="pseisPhoneActive" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>

          {/* Stats panel gradient */}
          <linearGradient id="pseisStatsPanel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>

          {/* Connection line gradient */}
          <linearGradient id="pseisConnectionLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
            <stop offset="50%" stopColor="#22c55e" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>

          {/* Seismic wave gradient */}
          <radialGradient id="pseisSeismicWave" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
            <stop offset="70%" stopColor="#ef4444" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>

          {/* Glow filter for epicenter */}
          <filter id="pseisEpicenterGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Glow filter for detected phones */}
          <filter id="pseisDetectionGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Pulse animation for detection rings */}
          <filter id="pseisPulseGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Grid pattern for map */}
          <pattern id="pseisMapGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <rect width="30" height="30" fill="none" stroke="#1e3a5f" strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
        </defs>

        {/* Background */}
        <rect width="700" height="350" fill="url(#pseisNetBg)" />

        {/* Map grid overlay */}
        <rect width="700" height="350" fill="url(#pseisMapGrid)" />

        {/* Map region - larger coverage area */}
        <ellipse cx="350" cy="175" rx="280" ry="140" fill="url(#pseisMapRegion)" />

        {/* Terrain contour lines */}
        {[1, 2, 3].map(i => (
          <ellipse
            key={`contour${i}`}
            cx="350"
            cy="175"
            rx={100 + i * 60}
            ry={50 + i * 30}
            fill="none"
            stroke="#164e63"
            strokeWidth="0.5"
            opacity={0.4 - i * 0.1}
          />
        ))}

        {/* === EARTHQUAKE EPICENTER === */}
        {earthquakeStrength > 0 && (
          <g transform="translate(350, 175)">
            {/* Seismic waves propagating outward */}
            {[1, 2, 3, 4, 5].map(i => (
              <circle
                key={i}
                cx={0}
                cy={0}
                r={i * 40 * ((animPhase * 0.5) % 1)}
                fill="none"
                stroke="url(#pseisSeismicWave)"
                strokeWidth={4 - i * 0.5}
                opacity={1 - ((animPhase * 0.5) % 1)}
              />
            ))}

            {/* Epicenter core with glow */}
            <g filter="url(#pseisEpicenterGlow)">
              <circle cx={0} cy={0} r={20} fill="url(#pseisEpicenter)" />
              <circle cx={0} cy={0} r={12} fill="#ef4444">
                <animate attributeName="r" values="12;15;12" dur="0.5s" repeatCount="indefinite" />
              </circle>
              <circle cx={0} cy={0} r={5} fill="#fca5a5" />
            </g>

            {/* Magnitude label */}
            <g transform="translate(0, -40)">
              <rect x="-35" y="-12" width="70" height="24" rx="4" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1" />
              <text x={0} y={5} textAnchor="middle" fill="#fca5a5" fontSize="13" fontWeight="700">
                M {earthquakeStrength.toFixed(1)}
              </text>
            </g>

            {/* Depth indicator */}
            <text x={0} y={40} textAnchor="middle" fill="#f87171" fontSize="9" fontWeight="500">
              DEPTH: 10km
            </text>
          </g>
        )}

        {/* Idle epicenter marker when no earthquake */}
        {earthquakeStrength === 0 && (
          <g transform="translate(350, 175)">
            <circle cx={0} cy={0} r={15} fill="#374151" stroke="#4b5563" strokeWidth="2" strokeDasharray="4 2" />
            <text x={0} y={5} textAnchor="middle" fill="#6b7280" fontSize="10">?</text>
            <text x={0} y={35} textAnchor="middle" fill="#64748b" fontSize="9">Epicenter</text>
          </g>
        )}

        {/* === DISTRIBUTED PHONE NETWORK === */}
        {Array(phoneCount).fill(0).map((_, i) => {
          const angle = (i / Math.max(phoneCount, 1)) * Math.PI * 2 + (i * 0.3);
          const radius = 70 + (i % 4) * 45;
          const x = 350 + Math.cos(angle) * radius;
          const y = 175 + Math.sin(angle) * radius * 0.5;
          const detected = phoneDetections[i];

          return (
            <g key={i} transform={`translate(${x}, ${y})`}>
              {/* Connection lines to epicenter when detected */}
              {detected && earthquakeStrength > 0 && (
                <line
                  x1={0}
                  y1={0}
                  x2={350 - x}
                  y2={175 - y}
                  stroke="url(#pseisConnectionLine)"
                  strokeWidth="2"
                  strokeDasharray="6 3"
                  opacity="0.6"
                />
              )}

              {/* Detection pulse ring */}
              {detected && (
                <g filter="url(#pseisPulseGlow)">
                  <circle cx={0} cy={0} r={25} fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.6">
                    <animate attributeName="r" values="15;30;15" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                </g>
              )}

              {/* Phone device */}
              <g filter={detected ? "url(#pseisDetectionGlow)" : undefined}>
                {/* Phone body */}
                <rect
                  x="-10"
                  y="-16"
                  width="20"
                  height="32"
                  rx="4"
                  fill={detected ? "url(#pseisPhoneActive)" : "url(#pseisPhoneIdle)"}
                  stroke={detected ? "#86efac" : "#6b7280"}
                  strokeWidth="1.5"
                />

                {/* Phone screen */}
                <rect
                  x="-7"
                  y="-12"
                  width="14"
                  height="20"
                  rx="2"
                  fill={detected ? "#dcfce7" : "#1f2937"}
                />

                {/* Screen content - mini waveform when detected */}
                {detected && (
                  <path
                    d="M -5 -2 Q -3 -6 -1 -2 Q 1 2 3 -2 Q 5 -6 7 -2"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="1.5"
                  />
                )}

                {/* Home button */}
                <circle cx={0} cy={12} r={2} fill={detected ? "#16a34a" : "#4b5563"} />
              </g>

              {/* Detection timestamp */}
              {detected && earthquakeStrength > 0 && (
                <text x={0} y={-24} textAnchor="middle" fill="#86efac" fontSize="8" fontWeight="600">
                  {(Math.random() * 2).toFixed(1)}s
                </text>
              )}
            </g>
          );
        })}

        {/* === STATISTICS PANEL === */}
        <g transform="translate(15, 15)">
          <rect x="0" y="0" width="160" height="100" rx="8" fill="url(#pseisStatsPanel)" stroke="#334155" strokeWidth="1.5" />

          {/* Panel header */}
          <rect x="0" y="0" width="160" height="24" rx="8" fill="#1e293b" />
          <text x="80" y="16" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600" letterSpacing="0.5">
            NETWORK STATUS
          </text>

          {/* Stats content */}
          <text x="12" y="42" fill="#94a3b8" fontSize="10">Phones in Network:</text>
          <text x="148" y="42" textAnchor="end" fill="#f8fafc" fontSize="11" fontWeight="600">{phoneCount}</text>

          <text x="12" y="58" fill="#94a3b8" fontSize="10">Active Detections:</text>
          <text x="148" y="58" textAnchor="end" fill={detectionsCount > 0 ? "#4ade80" : "#6b7280"} fontSize="11" fontWeight="600">
            {detectionsCount}/{phoneCount}
          </text>

          <text x="12" y="74" fill="#94a3b8" fontSize="10">Detection Confidence:</text>
          <text x="148" y="74" textAnchor="end" fill={Number(accuracy) > 50 ? "#22c55e" : Number(accuracy) > 0 ? "#f59e0b" : "#6b7280"} fontSize="11" fontWeight="700">
            {accuracy}%
          </text>

          {/* Confidence bar */}
          <rect x="12" y="82" width="136" height="6" rx="3" fill="#1f2937" />
          <rect x="12" y="82" width={136 * Number(accuracy) / 100} height="6" rx="3" fill={Number(accuracy) > 50 ? "#22c55e" : "#f59e0b"} />
        </g>

        {/* === LEGEND === */}
        <g transform="translate(525, 15)">
          <rect x="0" y="0" width="160" height="80" rx="8" fill="url(#pseisStatsPanel)" stroke="#334155" strokeWidth="1.5" />

          <text x="80" y="18" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600" letterSpacing="0.5">
            LEGEND
          </text>

          <circle cx="18" cy="38" r="6" fill="#ef4444" />
          <text x="32" y="42" fill="#f8fafc" fontSize="10">Epicenter</text>

          <rect x="12" y="52" width="12" height="18" rx="2" fill="url(#pseisPhoneActive)" />
          <text x="32" y="64" fill="#f8fafc" fontSize="10">Phone Detected</text>

          <rect x="12" y="72" width="12" height="18" rx="2" fill="url(#pseisPhoneIdle)" opacity="0.6" />
          <text x="32" y="84" fill="#6b7280" fontSize="10">Phone Idle</text>
        </g>

        {/* === BOTTOM INFO BAR === */}
        <g transform="translate(0, 310)">
          <rect x="100" y="0" width="500" height="35" rx="6" fill="#111827" stroke="#334155" strokeWidth="1" />

          <text x="350" y="14" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="500">
            DISTRIBUTED SEISMIC NETWORK
          </text>
          <text x="350" y="28" textAnchor="middle" fill="#64748b" fontSize="9">
            Multiple detections enable triangulation, noise rejection, and early warning systems
          </text>

          {/* Status indicator */}
          <circle cx="115" cy="17" r="5" fill={earthquakeStrength > 0 ? "#ef4444" : "#22c55e"}>
            {earthquakeStrength > 0 && (
              <animate attributeName="opacity" values="1;0.3;1" dur="0.5s" repeatCount="indefinite" />
            )}
          </circle>
          <text x="130" y="21" fill={earthquakeStrength > 0 ? "#f87171" : "#86efac"} fontSize="9" fontWeight="600">
            {earthquakeStrength > 0 ? "ALERT" : "MONITORING"}
          </text>
        </g>
      </svg>
    );
  };

  // ─── Test Questions for Assessment ───────────────────────────────────────────
  const testQuestions = [
    {
      scenario: "You're developing a fitness app and need to understand how phones detect motion. The app should count steps accurately even when the phone is in different orientations.",
      question: "How does the MEMS accelerometer in a smartphone fundamentally detect motion and acceleration?",
      options: [
        { id: 'a', label: "It uses GPS signals to calculate position changes over time" },
        { id: 'b', label: "A microscopic proof mass on silicon springs deflects, changing capacitance between electrodes that is converted to an electrical signal", correct: true },
        { id: 'c', label: "Piezoelectric crystals generate voltage when the phone moves through magnetic fields" },
        { id: 'd', label: "An internal gyroscope spins and resists changes in orientation" }
      ],
      explanation: "MEMS accelerometers contain a tiny proof mass (about a microgram) suspended on microscopic silicon springs. When the phone accelerates, inertia causes the mass to lag behind, changing its position relative to fixed capacitor plates. This capacitance change is measured and converted to an electrical signal representing acceleration. This is Newton's Second Law (F=ma) at the microscale!"
    },
    {
      scenario: "An engineer at a semiconductor company is explaining MEMS technology to new employees. They show a microscope image of an accelerometer chip that's smaller than a grain of rice.",
      question: "What does MEMS stand for, and why is this technology revolutionary for smartphone sensors?",
      options: [
        { id: 'a', label: "Magnetic Electromagnetic Motion System - it uses Earth's magnetic field for detection" },
        { id: 'b', label: "Micro-Electro-Mechanical System - it combines microscopic mechanical structures with electronics on a single silicon chip", correct: true },
        { id: 'c', label: "Multi-Element Measurement Sensor - it combines multiple sensor types in one package" },
        { id: 'd', label: "Motion Energy Monitoring System - it harvests energy from movement" }
      ],
      explanation: "MEMS (Micro-Electro-Mechanical Systems) technology allows mechanical structures like springs, masses, and capacitor plates to be fabricated at the microscale using the same processes that make computer chips. This enables incredibly small, low-power, and inexpensive sensors that can detect accelerations as small as 0.001g - sensitive enough to detect earthquakes, footsteps, or even your heartbeat through a table!"
    },
    {
      scenario: "Scientists at UC Berkeley developed the MyShake app, which has been downloaded by millions of users worldwide. During a magnitude 5.1 earthquake in California, the app successfully detected the event and sent warnings.",
      question: "Why are smartphone-based earthquake detection networks potentially more effective than traditional seismometer stations alone?",
      options: [
        { id: 'a', label: "Smartphones have more sensitive accelerometers than professional seismometers" },
        { id: 'b', label: "The dense geographic distribution of millions of phones provides better coverage, faster detection, and redundancy that fixed stations cannot match", correct: true },
        { id: 'c', label: "Smartphones can predict earthquakes before they happen using AI" },
        { id: 'd', label: "Phone networks are immune to damage during earthquakes unlike seismometer stations" }
      ],
      explanation: "While individual phones are less sensitive than professional seismometers, the sheer number and geographic distribution of smartphones creates an incredibly dense sensor network. This enables faster detection (phones closer to the epicenter detect it first), better location accuracy through triangulation, and natural redundancy. Traditional seismometer networks have gaps in coverage, but smartphones fill urban areas densely, enabling early warning systems that can alert people seconds before shaking arrives."
    },
    {
      scenario: "During an earthquake, a seismologist notices that their monitoring station recorded two distinct wave arrivals - one at 2:15:03 PM and another at 2:15:18 PM. The first wave caused compression, while the second caused side-to-side shaking.",
      question: "What explains the two different wave arrivals and their distinct characteristics?",
      options: [
        { id: 'a', label: "The first wave was reflected off the Earth's core while the second traveled directly" },
        { id: 'b', label: "P-waves (primary/compression waves) travel faster through rock and arrive first, while S-waves (secondary/shear waves) travel slower but cause more ground motion", correct: true },
        { id: 'c', label: "The first wave came from the earthquake's initial rupture and the second from an aftershock" },
        { id: 'd', label: "Surface waves always split into two components when traveling through different soil types" }
      ],
      explanation: "Earthquakes generate multiple wave types. P-waves (Primary) compress and expand rock like sound waves, traveling about 6 km/s through Earth's crust - they arrive first but cause less damage. S-waves (Secondary) shake rock perpendicular to their travel direction at about 3.5 km/s. The time difference between P and S wave arrivals helps seismologists calculate distance to the epicenter. Interestingly, S-waves cannot travel through liquids, which is how scientists discovered Earth's liquid outer core!"
    },
    {
      scenario: "A news reporter announces: 'Today's earthquake measured 6.0 on the Richter scale.' However, scientists increasingly prefer using 'moment magnitude' for large earthquakes instead of the original Richter scale.",
      question: "What is the key limitation of the Richter scale that led scientists to develop moment magnitude?",
      options: [
        { id: 'a', label: "The Richter scale only works for earthquakes in California where it was developed" },
        { id: 'b', label: "The Richter scale saturates for large earthquakes (above ~7.0) and doesn't accurately represent the total energy released, while moment magnitude accounts for fault area, slip distance, and rock rigidity", correct: true },
        { id: 'c', label: "The Richter scale requires expensive equipment that most countries cannot afford" },
        { id: 'd', label: "The Richter scale measures intensity of shaking rather than earthquake size" }
      ],
      explanation: "The Richter scale measures the maximum amplitude of seismic waves on a specific seismometer type. However, it 'saturates' for large earthquakes - a magnitude 8.0 and 9.0 might produce similar maximum amplitudes despite the 9.0 releasing 31 times more energy. Moment magnitude (Mw) directly calculates energy by multiplying fault rupture area × average slip distance × rock rigidity. This makes it accurate for all earthquake sizes and comparable worldwide. Both scales are logarithmic - each whole number represents about 31.6 times more energy!"
    },
    {
      scenario: "The MyShake app on your phone suddenly detects vibrations. The app's algorithm must determine within milliseconds whether this is a real earthquake or just someone dropping their phone or a truck driving by.",
      question: "How do crowdsourced earthquake apps distinguish real earthquakes from false triggers like dropped phones or local vibrations?",
      options: [
        { id: 'a', label: "They use machine learning to recognize the 'sound' of earthquakes through the phone's microphone" },
        { id: 'b', label: "They require spatial and temporal correlation - multiple phones in a geographic region must detect similar signals within a short time window for confirmation", correct: true },
        { id: 'c', label: "They check the phone's GPS to see if it moved to a new location" },
        { id: 'd', label: "They measure battery temperature changes caused by seismic energy" }
      ],
      explanation: "Single-phone detection is unreliable because many things cause vibrations (dropping phone, walking, traffic). Crowdsourced systems require corroborating evidence: multiple phones in a region must detect characteristic earthquake signatures (specific frequency content, P-wave then S-wave pattern) within a short time window. The system also uses triangulation - if phones detect waves at slightly different times, algorithms can locate the epicenter and verify the detection pattern matches a real propagating earthquake rather than random coincidental triggers."
    },
    {
      scenario: "A data scientist working on an earthquake detection app notices that raw accelerometer data is extremely noisy - it captures footsteps, HVAC vibrations, traffic, and many other non-earthquake sources that create false alarms.",
      question: "What signal processing technique is most critical for extracting earthquake signals from noisy accelerometer data?",
      options: [
        { id: 'a', label: "Amplifying all signals equally to make weak earthquakes detectable" },
        { id: 'b', label: "Bandpass filtering to isolate the 1-10 Hz frequency range where earthquake energy is concentrated, while rejecting high-frequency human activities and very low-frequency drift", correct: true },
        { id: 'c', label: "Recording only during nighttime when there's less human activity" },
        { id: 'd', label: "Using GPS coordinates to ignore data from areas without recent earthquakes" }
      ],
      explanation: "Earthquake signals have characteristic frequency content, typically 1-10 Hz for body waves detectable by phones. Human activities like walking (1-2 Hz but with different patterns), typing (10-20 Hz), and electronic noise (60 Hz from power lines) can be filtered out. Bandpass filters allow only frequencies in the earthquake range to pass. Additional algorithms look for the specific pattern of earthquake waves - a P-wave arrival followed by larger S-waves - rather than the impulsive signatures of impacts or the periodic patterns of footsteps."
    },
    {
      scenario: "Three seismometer stations detect an earthquake. Station A recorded the P-wave at 10:00:00, Station B at 10:00:04, and Station C at 10:00:07. Each station is in a different city roughly 50 km apart.",
      question: "How do seismologists use data from multiple stations to pinpoint an earthquake's epicenter?",
      options: [
        { id: 'a', label: "They average the GPS coordinates of all stations that detected the earthquake" },
        { id: 'b', label: "They use triangulation - the P-S wave time difference at each station gives distance to the epicenter, and three or more distance circles intersect at the epicenter location", correct: true },
        { id: 'c', label: "They trace the direction each seismometer was pointing when it detected the strongest signal" },
        { id: 'd', label: "They measure which station recorded the loudest signal, as that station is closest" }
      ],
      explanation: "Each station can calculate its distance from the epicenter using the P-S wave time delay (since both waves travel at known but different speeds). This distance defines a circle around each station where the epicenter could be. With three or more stations, these circles intersect at a single point - the epicenter. This is similar to how GPS works! With dense smartphone networks, hundreds of 'stations' provide incredibly precise locations. The different arrival times also help determine earthquake depth."
    },
    {
      scenario: "Mexico City's earthquake early warning system successfully gave residents up to 60 seconds of warning before strong shaking arrived from a magnitude 7.1 earthquake whose epicenter was 120 km away.",
      question: "How can earthquake early warning systems provide advance notice when earthquakes travel at kilometers per second?",
      options: [
        { id: 'a', label: "They predict earthquakes hours in advance by monitoring underground pressure changes" },
        { id: 'b', label: "Electronic signals travel at light speed (300,000 km/s), while seismic waves travel at only 3-6 km/s, allowing warnings to outrace the shaking to distant cities", correct: true },
        { id: 'c', label: "They use satellites to detect ground deformation before the waves arrive" },
        { id: 'd', label: "Underground sensors can feel the earthquake before it reaches the surface" }
      ],
      explanation: "Early warning systems exploit the vast speed difference between electronic communications (essentially instantaneous at ~300,000 km/s) and seismic waves (3-8 km/s). Sensors near the epicenter detect P-waves within seconds of rupture and immediately transmit alerts. These warnings arrive at distant cities before the destructive S-waves and surface waves. The warning time depends on distance from epicenter - cities 100 km away might get 20-30 seconds, enough to stop trains, open fire station doors, and alert people to drop, cover, and hold on."
    },
    {
      scenario: "After a moderate earthquake, engineers notice that a 15-story building swayed significantly more than shorter buildings nearby, even though they experienced the same ground shaking. Some items fell from shelves only in certain floors.",
      question: "What phenomenon explains why certain buildings experience amplified shaking during earthquakes?",
      options: [
        { id: 'a', label: "Taller buildings are closer to the earthquake's energy source in the Earth's crust" },
        { id: 'b', label: "Resonance occurs when the earthquake's dominant frequency matches the building's natural frequency, causing dramatically amplified oscillations", correct: true },
        { id: 'c', label: "Taller buildings have more windows that let seismic waves enter" },
        { id: 'd', label: "The building's foundation was improperly constructed" }
      ],
      explanation: "Every structure has natural frequencies at which it 'wants' to vibrate - like a tuning fork. For buildings, this depends on height, construction, and materials (roughly 10/N Hz, where N is the number of stories). When earthquake waves contain energy at these frequencies, resonance causes the building to oscillate with amplified motion. A 10-story building (~1 Hz natural frequency) resonates with typical earthquake frequencies. This is why building codes require engineers to analyze resonance and why some earthquakes damage medium-rise buildings more than shorter or taller ones nearby."
    }
  ];

  // ─── Phase Renderers ─────────────────────────────────────────────────────────
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-emerald-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-emerald-100 to-teal-200 bg-clip-text text-transparent">
        Your Phone is a Seismometer!
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover the sensitive motion sensors hidden in your pocket
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">📱🌋</div>

          <div className="space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              That little chip that rotates your screen?
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              It&apos;s actually a <span className="text-emerald-400 font-semibold">vibration sensor</span> sensitive enough to detect earthquakes, footsteps, even your heartbeat through the table!
            </p>
            <div className="pt-2">
              <p className="text-base text-emerald-400 font-semibold">
                How does a tiny silicon chip detect motion and vibration?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onPointerDown={() => { playSound('click'); nextPhase(); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Investigate!
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">✦</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">✦</span>
          Real-World Examples
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">✦</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Make Your Prediction</h2>
      <p className="text-gray-300 text-center">
        Your phone detects when you tilt it or shake it. What&apos;s inside the accelerometer chip?
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'mass', text: 'A tiny mass on springs - movement changes capacitance', icon: '⚖️' },
          { id: 'fluid', text: 'A fluid that sloshes around, detected by pressure sensors', icon: '💧' },
          { id: 'gyro', text: 'A spinning disk that resists rotation', icon: '🔄' },
          { id: 'magnetic', text: 'Magnets that sense Earth\'s magnetic field changes', icon: '🧲' }
        ].map((option) => (
          <button
            key={option.id}
            onPointerDown={() => {
              playSound('click');
              setPrediction(option.id);
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              prediction === option.id
                ? 'border-emerald-500 bg-emerald-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {prediction && (
        <div className="text-center">
          <button
            onPointerDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl text-white font-semibold hover:from-emerald-500 hover:to-teal-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">MEMS Accelerometer</h2>

      {renderAccelerometerScene()}

      <div className="flex flex-wrap justify-center gap-3">
        <button
          onPointerDown={() => { playSound('click'); setVibrationSource('none'); }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            vibrationSource === 'none'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          📴 None
        </button>
        <button
          onPointerDown={() => { playSound('click'); setVibrationSource('footstep'); }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            vibrationSource === 'footstep'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          👟 Footsteps
        </button>
        <button
          onPointerDown={() => { playSound('click'); setVibrationSource('door'); }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            vibrationSource === 'door'
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          🚪 Door Slam
        </button>
        <button
          onPointerDown={() => { playSound('click'); setVibrationSource('earthquake'); }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            vibrationSource === 'earthquake'
              ? 'bg-red-600 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          🌋 Earthquake
        </button>
      </div>

      <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 rounded-xl p-4 max-w-lg mx-auto">
        <p className="text-emerald-300 text-sm text-center">
          <strong>MEMS = Micro-Electro-Mechanical System.</strong> A tiny proof mass (~microgram) on silicon springs.
          When the phone accelerates, inertia makes the mass &quot;lag&quot;, changing capacitance between electrodes.
        </p>
      </div>

      <div className="text-center">
        <button
          onPointerDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl text-white font-semibold hover:from-emerald-500 hover:to-teal-500 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">How MEMS Accelerometers Work</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">1</div>
            <div>
              <h3 className="text-white font-semibold">Proof Mass on Springs</h3>
              <p className="text-gray-400 text-sm">Tiny silicon mass suspended by microscopic springs</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold">2</div>
            <div>
              <h3 className="text-white font-semibold">Capacitive Sensing</h3>
              <p className="text-gray-400 text-sm">Mass position changes gap to fixed electrodes → capacitance changes</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold">3</div>
            <div>
              <h3 className="text-white font-semibold">3-Axis Detection</h3>
              <p className="text-gray-400 text-sm">Three orthogonal masses measure X, Y, Z acceleration separately</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-emerald-900/30 rounded-xl p-4 max-w-lg mx-auto text-center">
        <p className="text-emerald-300 font-semibold">Newton&apos;s Second Law at Work</p>
        <p className="text-gray-400 text-sm mt-1">
          F = ma → Acceleration causes the mass to deflect against the springs.
          Sensitivity can detect ~0.001g (less than 1/1000th of Earth&apos;s gravity)!
        </p>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-emerald-400 font-semibold">{prediction === 'mass' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onPointerDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl text-white font-semibold hover:from-emerald-500 hover:to-teal-500 transition-all"
        >
          But wait... →
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">🔄 The Twist!</h2>
      <p className="text-gray-300 text-center max-w-lg mx-auto">
        One phone can detect an earthquake. But what if <span className="text-yellow-400 font-semibold">millions of phones</span> worked together?
        How would a distributed network improve earthquake detection?
      </p>

      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
        {[
          { id: 'triangulate', text: 'Triangulate epicenter location and reject false alarms', icon: '📍' },
          { id: 'louder', text: 'Make the signal louder by adding them together', icon: '🔊' },
          { id: 'battery', text: 'Share battery to keep sensors running longer', icon: '🔋' },
          { id: 'nothing', text: 'No benefit - one good sensor is enough', icon: '1️⃣' }
        ].map((option) => (
          <button
            key={option.id}
            onPointerDown={() => {
              playSound('click');
              setTwistPrediction(option.id);
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              twistPrediction === option.id
                ? 'border-teal-500 bg-teal-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-gray-200">{option.text}</span>
          </button>
        ))}
      </div>

      {twistPrediction && (
        <div className="text-center">
          <button
            onPointerDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl text-white font-semibold hover:from-teal-500 hover:to-cyan-500 transition-all"
          >
            Test It! →
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white text-center">Distributed Seismometer Network</h2>

      {renderNetworkScene()}

      <div className="max-w-lg mx-auto space-y-3">
        <div>
          <label className="text-gray-400 text-sm">Phones in Network: {phoneCount}</label>
          <input
            type="range"
            min="1"
            max="20"
            value={phoneCount}
            onChange={(e) => {
              setPhoneCount(Number(e.target.value));
              setPhoneDetections(Array(Number(e.target.value)).fill(false));
            }}
            className="w-full"
          />
        </div>

        <button
          onPointerDown={() => {
            playSound('click');
            setEarthquakeStrength(4 + Math.random() * 3);
          }}
          disabled={earthquakeStrength > 0}
          className="w-full px-6 py-3 rounded-lg font-medium bg-red-600 text-white hover:bg-red-500 disabled:bg-gray-600 transition-all"
        >
          {earthquakeStrength > 0 ? '🌋 Detecting...' : '🌋 Simulate Earthquake'}
        </button>
      </div>

      <div className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 rounded-xl p-4 max-w-lg mx-auto">
        <p className="text-teal-300 text-sm text-center">
          <strong>MyShake and similar apps</strong> turn your phone into part of a global seismic network.
          Multiple detections confirm real earthquakes vs. someone dropping their phone!
        </p>
      </div>

      <div className="text-center">
        <button
          onPointerDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl text-white font-semibold hover:from-teal-500 hover:to-cyan-500 transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Crowdsourced Seismology</h2>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 max-w-lg mx-auto">
        <p className="text-gray-300 text-center mb-4">
          Benefits of distributed phone networks:
        </p>

        <div className="space-y-3 text-sm">
          <div className="bg-emerald-900/30 rounded-lg p-3">
            <div className="text-emerald-400 font-semibold">📍 Triangulation</div>
            <div className="text-gray-500">Multiple detection times → calculate epicenter location</div>
          </div>
          <div className="bg-teal-900/30 rounded-lg p-3">
            <div className="text-teal-400 font-semibold">🚫 False Alarm Rejection</div>
            <div className="text-gray-500">One phone shaking ≠ earthquake. Many phones = real event</div>
          </div>
          <div className="bg-cyan-900/30 rounded-lg p-3">
            <div className="text-cyan-400 font-semibold">⏰ Early Warning</div>
            <div className="text-gray-500">Phones near epicenter alert phones farther away BEFORE shaking arrives</div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-2">Your prediction: <span className="text-teal-400 font-semibold">{twistPrediction === 'triangulate' ? '✓ Correct!' : '✗ Not quite'}</span></p>
        <button
          onPointerDown={() => { playSound('click'); nextPhase(); }}
          className="px-8 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl text-white font-semibold hover:from-teal-500 hover:to-cyan-500 transition-all"
        >
          See Applications →
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white text-center">Real-World Applications</h2>
      <p className="text-gray-400 text-center">Tap each application to explore</p>

      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
        {TRANSFER_APPS.map((app, index) => (
          <button
            key={index}
            onPointerDown={() => {
              playSound('click');
              setCompletedApps(prev => new Set([...prev, index]));
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              completedApps.has(index)
                ? 'border-emerald-500 bg-emerald-900/30'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <div className="text-3xl mb-2">{app.icon}</div>
            <h3 className="text-white font-semibold text-sm">{app.title}</h3>
            <p className="text-gray-400 text-xs mt-1">{app.description}</p>
          </button>
        ))}
      </div>

      {completedApps.size >= 4 && (
        <div className="text-center">
          <button
            onPointerDown={() => { playSound('click'); nextPhase(); }}
            className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl text-white font-semibold hover:from-emerald-500 hover:to-teal-500 transition-all"
          >
            Take the Quiz →
          </button>
        </div>
      )}
    </div>
  );

  const renderTest = () => {
    const currentQuestion = testAnswers.length;
    const question = TEST_QUESTIONS[currentQuestion];

    if (!question) {
      const score = testAnswers.filter((a, i) => TEST_QUESTIONS[i].options[a]?.correct).length;
      if (score >= 3 && onCorrectAnswer) onCorrectAnswer();
      return (
        <div className="text-center space-y-6">
          <div className="text-6xl">{score >= 3 ? '🎉' : '📚'}</div>
          <h2 className="text-2xl font-bold text-white">Quiz Complete!</h2>
          <p className="text-gray-300">You got {score} out of {TEST_QUESTIONS.length} correct!</p>
          <button
            onPointerDown={() => {
              playSound(score >= 3 ? 'complete' : 'click');
              nextPhase();
            }}
            className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl text-white font-semibold hover:from-emerald-500 hover:to-teal-500 transition-all"
          >
            {score >= 3 ? 'Complete! 🎊' : 'Continue →'}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white text-center">Quiz: Question {currentQuestion + 1}/{TEST_QUESTIONS.length}</h2>
        <p className="text-gray-300 text-center max-w-lg mx-auto">{question.question}</p>

        <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
          {question.options.map((option, i) => (
            <button
              key={i}
              onPointerDown={() => {
                playSound(option.correct ? 'success' : 'failure');
                setTestAnswers([...testAnswers, i]);
              }}
              className="p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-emerald-500 transition-all text-left text-gray-200"
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="text-center space-y-6">
      <div className="text-6xl">🏆</div>
      <h2 className="text-2xl font-bold text-white">MEMS Sensor Master!</h2>
      <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 rounded-xl p-6 max-w-md mx-auto">
        <p className="text-emerald-300 font-medium mb-4">You now understand:</p>
        <ul className="text-gray-300 text-sm space-y-2 text-left">
          <li>✓ MEMS accelerometers use proof mass on springs</li>
          <li>✓ Capacitive sensing detects tiny movements</li>
          <li>✓ Phones can detect earthquakes, footsteps, impacts</li>
          <li>✓ Distributed networks enable early warning systems</li>
        </ul>
      </div>
      <p className="text-gray-400 text-sm">
        Your pocket holds a science instrument! 📱⚗️
      </p>
      <button
        onPointerDown={() => {
          playSound('complete');
          if (onPhaseComplete) onPhaseComplete();
        }}
        className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl text-white font-semibold hover:from-emerald-500 hover:to-teal-500 transition-all"
      >
        Complete! 🎊
      </button>
    </div>
  );

  // ─── Main Render ─────────────────────────────────────────────────────────────
  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Phone Seismometer</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p, i) => (
              <button
                key={p}
                onPointerDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  PHASES.indexOf(phase) === i
                    ? 'bg-emerald-400 w-6 shadow-lg shadow-emerald-400/30'
                    : PHASES.indexOf(phase) > i
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={p}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-emerald-400">{phase.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12 px-6">
        <div className="max-w-2xl mx-auto">
          {renderPhase()}
        </div>
      </div>
    </div>
  );
}
