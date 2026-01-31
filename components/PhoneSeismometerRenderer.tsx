'use client';

import React, { useState, useEffect, useRef } from 'react';

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
      <svg viewBox="0 0 400 280" className="w-full h-56">
        <rect width="400" height="280" fill="#111827" />

        {/* MEMS chip diagram */}
        <g transform="translate(50, 40)">
          <text x="60" y="-10" textAnchor="middle" className="fill-gray-400 text-xs font-semibold">
            MEMS Accelerometer (inside your phone)
          </text>

          {/* Chip housing */}
          <rect x="0" y="0" width="120" height="80" rx="5" fill="#1f2937" stroke="#4b5563" strokeWidth="2" />

          {/* Fixed frame */}
          <rect x="10" y="10" width="100" height="60" fill="#374151" rx="3" />

          {/* Springs */}
          <path
            d={`M 30 40 Q 25 35 30 30 Q 35 25 30 20`}
            fill="none"
            stroke="#60a5fa"
            strokeWidth="2"
          />
          <path
            d={`M 90 40 Q 95 35 90 30 Q 85 25 90 20`}
            fill="none"
            stroke="#60a5fa"
            strokeWidth="2"
          />

          {/* Proof mass (moves with acceleration) */}
          <rect
            x={45 + massPosition}
            y="25"
            width="30"
            height="30"
            fill="#f59e0b"
            rx="3"
            className="transition-transform"
          />

          {/* Capacitor plates (fixed) */}
          <rect x="35" y="20" width="3" height="40" fill="#22c55e" />
          <rect x="82" y="20" width="3" height="40" fill="#22c55e" />

          {/* Labels */}
          <text x="60" y="95" textAnchor="middle" className="fill-gray-500 text-xs">
            Mass moves → Capacitance changes
          </text>
        </g>

        {/* Signal waveform */}
        <g transform="translate(200, 30)">
          <text x="90" y="0" textAnchor="middle" className="fill-gray-400 text-xs font-semibold">
            Accelerometer Signal
          </text>

          {/* Graph background */}
          <rect x="0" y="10" width="180" height="100" fill="#0f172a" rx="5" />

          {/* Grid lines */}
          {[...Array(5)].map((_, i) => (
            <line
              key={i}
              x1="0"
              y1={30 + i * 20}
              x2="180"
              y2={30 + i * 20}
              stroke="#1e293b"
              strokeWidth="1"
            />
          ))}

          {/* Zero line */}
          <line x1="0" y1="60" x2="180" y2="60" stroke="#4b5563" strokeWidth="1" />

          {/* Signal trace */}
          <path
            d={`M 0 60 ${signalHistory.map((v, i) => `L ${i * 1.8} ${60 - v * 40}`).join(' ')}`}
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
          />

          {/* Current value indicator */}
          <circle
            cx={180}
            cy={60 - (signalHistory[signalHistory.length - 1] || 0) * 40}
            r={4}
            fill="#22c55e"
            className="animate-pulse"
          />

          {/* Y-axis labels */}
          <text x="-5" y="35" textAnchor="end" className="fill-gray-500 text-xs">+1g</text>
          <text x="-5" y="65" textAnchor="end" className="fill-gray-500 text-xs">0</text>
          <text x="-5" y="95" textAnchor="end" className="fill-gray-500 text-xs">-1g</text>
        </g>

        {/* Phone visualization */}
        <g transform="translate(50, 150)">
          <rect x="0" y="0" width="60" height="100" rx="8" fill="#374151" stroke="#6b7280" strokeWidth="2" />
          <rect x="5" y="15" width="50" height="70" rx="3" fill="#0f172a" />
          {/* Screen showing waveform mini */}
          <path
            d={`M 10 50 ${signalHistory.slice(-20).map((v, i) => `L ${10 + i * 2} ${50 - v * 15}`).join(' ')}`}
            fill="none"
            stroke="#22c55e"
            strokeWidth="1"
          />
          <circle cx="30" cy="93" r="4" fill="#4b5563" />

          {/* Shake indicator */}
          {vibrationSource !== 'none' && (
            <g className="animate-pulse">
              <line x1="-10" y1="50" x2="-5" y2="45" stroke="#f59e0b" strokeWidth="2" />
              <line x1="-10" y1="50" x2="-5" y2="55" stroke="#f59e0b" strokeWidth="2" />
              <line x1="70" y1="50" x2="65" y2="45" stroke="#f59e0b" strokeWidth="2" />
              <line x1="70" y1="50" x2="65" y2="55" stroke="#f59e0b" strokeWidth="2" />
            </g>
          )}
        </g>

        {/* Source label */}
        <text x="200" y="270" textAnchor="middle" className="fill-gray-300 text-sm">
          Source: {vibrationSource === 'none' ? 'Background noise' :
            vibrationSource === 'footstep' ? '👟 Footsteps' :
              vibrationSource === 'door' ? '🚪 Door slam' : '🌋 Earthquake!'}
        </text>
      </svg>
    );
  };

  const renderNetworkScene = () => {
    const detectionsCount = phoneDetections.filter(d => d).length;
    const accuracy = phoneCount > 0 ? (detectionsCount / phoneCount * 100).toFixed(0) : 0;

    return (
      <svg viewBox="0 0 400 250" className="w-full h-48">
        <rect width="400" height="250" fill="#111827" />

        {/* Map background */}
        <ellipse cx="200" cy="120" rx="150" ry="100" fill="#1e3a5f" opacity="0.3" />

        {/* Earthquake epicenter */}
        {earthquakeStrength > 0 && (
          <g transform="translate(200, 120)">
            {[1, 2, 3].map(i => (
              <circle
                key={i}
                cx={0}
                cy={0}
                r={i * 30 * (animPhase % 1)}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                opacity={1 - (animPhase % 1)}
              />
            ))}
            <circle cx={0} cy={0} r={10} fill="#ef4444" className="animate-pulse" />
            <text x={0} y={-20} textAnchor="middle" className="fill-red-400 text-xs font-bold">
              M{earthquakeStrength.toFixed(1)}
            </text>
          </g>
        )}

        {/* Phone icons distributed on map */}
        {Array(phoneCount).fill(0).map((_, i) => {
          const angle = (i / phoneCount) * Math.PI * 2;
          const radius = 50 + (i % 3) * 30;
          const x = 200 + Math.cos(angle) * radius;
          const y = 120 + Math.sin(angle) * radius * 0.6;
          const detected = phoneDetections[i];

          return (
            <g key={i} transform={`translate(${x}, ${y})`}>
              <rect x="-8" y="-12" width="16" height="24" rx="2" fill={detected ? '#22c55e' : '#4b5563'} />
              <rect x="-6" y="-8" width="12" height="16" rx="1" fill={detected ? '#86efac' : '#1f2937'} />
              {detected && (
                <circle cx={0} cy={0} r={20} fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.5" className="animate-ping" />
              )}
            </g>
          );
        })}

        {/* Statistics panel */}
        <g transform="translate(10, 10)">
          <rect x="0" y="0" width="120" height="70" fill="#1f2937" rx="5" opacity="0.95" />
          <text x="10" y="20" className="fill-gray-300 text-xs">Phones: {phoneCount}</text>
          <text x="10" y="38" className="fill-gray-300 text-xs">
            Detected: {detectionsCount}/{phoneCount}
          </text>
          <text x="10" y="56" className={`text-xs ${detectionsCount > phoneCount * 0.5 ? 'fill-green-400' : 'fill-yellow-400'}`}>
            Confidence: {accuracy}%
          </text>
        </g>

        {/* Network benefit explanation */}
        <text x="200" y="240" textAnchor="middle" className="fill-gray-400 text-xs">
          More phones = better triangulation + noise rejection
        </text>
      </svg>
    );
  };

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
        onMouseDown={() => { playSound('click'); nextPhase(); }}
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
            onMouseDown={() => {
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
            onMouseDown={() => { playSound('click'); nextPhase(); }}
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
          onMouseDown={() => { playSound('click'); setVibrationSource('none'); }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            vibrationSource === 'none'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          📴 None
        </button>
        <button
          onMouseDown={() => { playSound('click'); setVibrationSource('footstep'); }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            vibrationSource === 'footstep'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          👟 Footsteps
        </button>
        <button
          onMouseDown={() => { playSound('click'); setVibrationSource('door'); }}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            vibrationSource === 'door'
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          🚪 Door Slam
        </button>
        <button
          onMouseDown={() => { playSound('click'); setVibrationSource('earthquake'); }}
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
          onMouseDown={() => { playSound('click'); nextPhase(); }}
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
          onMouseDown={() => { playSound('click'); nextPhase(); }}
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
            onMouseDown={() => {
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
            onMouseDown={() => { playSound('click'); nextPhase(); }}
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
          onMouseDown={() => {
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
          onMouseDown={() => { playSound('click'); nextPhase(); }}
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
          onMouseDown={() => { playSound('click'); nextPhase(); }}
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
            onMouseDown={() => {
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
            onMouseDown={() => { playSound('click'); nextPhase(); }}
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
            onMouseDown={() => {
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
              onMouseDown={() => {
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
        onMouseDown={() => {
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
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
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
