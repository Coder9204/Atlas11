'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================================================
// WAVE SPEED & TENSION - Premium Design System
// ============================================================================

const realWorldApps = [
  {
    icon: '🎸',
    title: 'Musical Instrument Design',
    short: 'Engineering perfect pitch and tone',
    tagline: 'The physics behind every note',
    description: 'Stringed instruments rely entirely on wave speed physics. Guitar strings, piano wires, and violin strings are precisely engineered with specific tensions and linear densities to produce exact musical frequencies.',
    connection: 'Wave speed v = sqrt(T/μ) directly determines the fundamental frequency of a vibrating string. Instrument makers manipulate tension (tuning pegs) and linear density (string gauge) to achieve desired pitches.',
    howItWorks: 'Thicker strings (higher μ) vibrate slower, producing lower notes. Tightening a string (higher T) increases wave speed and pitch. String length determines the wavelength, and together these set the frequency: f = v/(2L).',
    stats: [
      { value: '440Hz', label: 'Concert A standard', icon: '🎵' },
      { value: '$7B', label: 'String instrument market', icon: '📈' },
      { value: '200MPa', label: 'Piano wire tension', icon: '⚡' }
    ],
    examples: ['Guitar string gauges', 'Piano bass strings', 'Violin gut vs steel', 'Harp string design'],
    companies: ['Steinway', 'Martin Guitar', 'D\'Addario', 'Ernie Ball'],
    futureImpact: 'Smart instruments with automatic tuning systems continuously adjust tension to maintain perfect pitch despite temperature changes.',
    color: '#F59E0B'
  },
  {
    icon: '🏗️',
    title: 'Suspension Bridge Cables',
    short: 'Engineering massive spans',
    tagline: 'Cables that carry cities',
    description: 'Suspension bridge main cables must support enormous loads while resisting wind-induced oscillations. Engineers carefully control cable tension and mass to ensure dangerous resonant frequencies don\'t match wind or traffic vibrations.',
    connection: 'The wave speed in bridge cables determines their natural vibration frequencies. The Tacoma Narrows collapse showed what happens when wind frequency matches a cable\'s natural frequency - destructive resonance.',
    howItWorks: 'Bridge cables are pre-tensioned to specific values that push natural frequencies away from common excitation sources. Dampers add energy dissipation. Cable design balances strength, weight, and vibration characteristics.',
    stats: [
      { value: '2km', label: 'Longest cable spans', icon: '📏' },
      { value: '60,000T', label: 'Cable tension force', icon: '💪' },
      { value: '100+yrs', label: 'Design lifespan', icon: '⏳' }
    ],
    examples: ['Golden Gate Bridge', 'Akashi Kaikyo Bridge', 'Brooklyn Bridge', 'Millau Viaduct'],
    companies: ['Freyssinet', 'Bridon-Bekaert', 'Kiswire', 'WireCo WorldGroup'],
    futureImpact: 'Active damping systems using real-time tension adjustment will enable even longer spans by controlling vibration dynamically.',
    color: '#DC2626'
  },
  {
    icon: '⚡',
    title: 'Power Line Engineering',
    short: 'Transmitting electricity across continents',
    tagline: 'Keeping the lights on everywhere',
    description: 'High-voltage power lines span thousands of kilometers. Their tension must be carefully maintained to prevent dangerous sag, while their wave characteristics affect how they respond to wind, ice loading, and galloping oscillations.',
    connection: 'Power line conductors behave as vibrating strings. Aeolian vibration from steady wind can cause fatigue failure. Engineers use the wave speed equation to predict vibration modes and install dampers at calculated positions.',
    howItWorks: 'Stockbridge dampers positioned along power lines absorb vibration energy at specific frequencies. Conductor tension is set to balance sag limits with vibration susceptibility. Ice accumulation changes μ, affecting all calculations.',
    stats: [
      { value: '800kV', label: 'Max transmission voltage', icon: '⚡' },
      { value: '500km', label: 'Typical span length', icon: '📏' },
      { value: '$2T', label: 'Global grid value', icon: '💰' }
    ],
    examples: ['HVDC transmission lines', 'Rural distribution', 'Submarine power cables', 'Mountain crossings'],
    companies: ['ABB', 'Siemens Energy', 'Prysmian', 'Nexans'],
    futureImpact: 'Smart grid sensors will continuously monitor line tension and vibration, enabling predictive maintenance and automatic re-tensioning.',
    color: '#2563EB'
  },
  {
    icon: '🏃',
    title: 'Sports Equipment Technology',
    short: 'Optimizing athletic performance',
    tagline: 'Physics for champions',
    description: 'Tennis rackets, badminton strings, and archery bowstrings all depend on wave mechanics. String tension affects ball speed, control, and the "sweet spot" size. Athletes and equipment makers obsess over these parameters.',
    connection: 'When a ball hits a racket, waves propagate through the strings. Higher tension means faster wave speed and quicker energy return, but smaller sweet spot. Players choose tension based on playing style.',
    howItWorks: 'Racket strings are tensioned between 50-70 lbs. Higher tension gives more control but less power. String material (nylon, polyester, natural gut) affects both tension retention and linear density, changing wave behavior.',
    stats: [
      { value: '70lbs', label: 'Pro tennis tension', icon: '🎾' },
      { value: '160mph', label: 'Fastest tennis serve', icon: '🚀' },
      { value: '$400M', label: 'String market size', icon: '📈' }
    ],
    examples: ['Tennis string patterns', 'Badminton rackets', 'Archery compound bows', 'Squash equipment'],
    companies: ['Wilson', 'Babolat', 'Luxilon', 'Yonex'],
    futureImpact: 'Smart rackets with tension sensors and embedded electronics will help players optimize string setup for their exact playing style.',
    color: '#10B981'
  }
];

type Phase = 'hook' | 'intro' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'intro', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

const phaseLabels: Record<Phase, string> = {
  'hook': 'Hook',
  'intro': 'Intro',
  'predict': 'Predict',
  'play': 'Lab',
  'review': 'Review',
  'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Lab',
  'twist_review': 'Twist Review',
  'transfer': 'Transfer',
  'test': 'Test',
  'mastery': 'Mastery'
};

interface WaveSpeedTensionRendererProps {
  onComplete?: () => void;
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const WaveSpeedTensionRenderer: React.FC<WaveSpeedTensionRendererProps> = ({ onComplete, onGameEvent, gamePhase, onPhaseComplete }) => {
  // Navigation debouncing
  const lastClickRef = useRef(0);

  // Phase state
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase !== undefined && phaseOrder.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  });

  // Sync phase with external prop
  useEffect(() => {
    if (gamePhase !== undefined && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [tension, setTension] = useState(50);
  const [linearDensity, setLinearDensity] = useState(0.01);
  const [twistLinearDensity, setTwistLinearDensity] = useState(0.02);
  const [isPulseSent, setIsPulseSent] = useState(false);
  const [pulsePosition, setPulsePosition] = useState(0);
  const [pulseComplete, setPulseComplete] = useState(false);
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Physics constants
  const ropeLength = 5;

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
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

  // Web Audio API sound
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const sounds = {
        click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType },
        success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
        failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
        transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType },
        complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType }
      };
      const sound = sounds[type];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch { /* Audio not supported */ }
  }, []);

  // Emit game events
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    onGameEvent?.({ type, data });
  }, [onGameEvent]);

  // Navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    if (!phaseOrder.includes(newPhase)) return;

    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase });
    onPhaseComplete?.(newPhase);

    if (newPhase === 'play' || newPhase === 'twist_play') {
      setPulsePosition(0);
      setIsPulseSent(false);
      setPulseComplete(false);
      setStopwatchTime(0);
      if (newPhase === 'play') {
        setTension(50);
        setLinearDensity(0.01);
      }
    }
  }, [emitEvent, phase, playSound, onPhaseComplete]);

  // Wave speed physics - memoized for performance
  const waveSpeed = useMemo(() => Math.sqrt(tension / linearDensity), [tension, linearDensity]);
  const twistWaveSpeed = useMemo(() => Math.sqrt(tension / twistLinearDensity), [tension, twistLinearDensity]);

  // Pulse animation
  useEffect(() => {
    if ((phase === 'play' || phase === 'twist_play') && isPulseSent && !pulseComplete) {
      const speed = phase === 'twist_play' ? twistWaveSpeed : waveSpeed;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const position = (speed * elapsed) / ropeLength;

        if (position >= 1) {
          setPulsePosition(1);
          setPulseComplete(true);
          setStopwatchTime(ropeLength / speed);
          setIsPulseSent(false);
          emitEvent('simulation_started', { type: 'pulse_complete', travelTime: ropeLength / speed, speed });
        } else {
          setPulsePosition(position);
          setStopwatchTime(elapsed);
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }
  }, [phase, isPulseSent, pulseComplete, waveSpeed, twistWaveSpeed, ropeLength, emitEvent]);

  // Test questions
  const testQuestions = useMemo(() => [
    {
      scenario: "A rope has tension T = 100 N and linear density u = 0.01 kg/m.",
      question: "What is the wave speed?",
      options: [
        { text: "10 m/s", correct: false },
        { text: "50 m/s", correct: false },
        { text: "100 m/s", correct: true },
        { text: "1000 m/s", correct: false }
      ],
      explanation: "v = sqrt(T/u) = sqrt(100/0.01) = sqrt(10000) = 100 m/s."
    },
    {
      scenario: "The formula for wave speed on a string is v = sqrt(T/u).",
      question: "What happens to wave speed if tension doubles?",
      options: [
        { text: "Speed doubles", correct: false },
        { text: "Speed increases by sqrt(2)", correct: true },
        { text: "Speed halves", correct: false },
        { text: "Speed stays the same", correct: false }
      ],
      explanation: "Because of the square root, v is proportional to sqrt(T). Doubling T multiplies v by sqrt(2) = 1.414."
    },
    {
      scenario: "A guitar string is replaced with a thicker string (more mass per length).",
      question: "How does the wave speed change?",
      options: [
        { text: "Increases", correct: false },
        { text: "Decreases", correct: true },
        { text: "Stays the same", correct: false },
        { text: "Depends on tension only", correct: false }
      ],
      explanation: "v = sqrt(T/u). Higher u (mass density) in the denominator means lower wave speed."
    },
    {
      scenario: "A wave travels 10 meters in 0.2 seconds on a rope.",
      question: "What is the wave speed?",
      options: [
        { text: "2 m/s", correct: false },
        { text: "20 m/s", correct: false },
        { text: "50 m/s", correct: true },
        { text: "200 m/s", correct: false }
      ],
      explanation: "v = distance/time = 10m / 0.2s = 50 m/s."
    },
    {
      scenario: "Two strings have the same tension. String A has u = 0.01 kg/m, String B has u = 0.04 kg/m.",
      question: "How do their wave speeds compare?",
      options: [
        { text: "Same speed", correct: false },
        { text: "A is twice as fast", correct: true },
        { text: "A is four times as fast", correct: false },
        { text: "B is twice as fast", correct: false }
      ],
      explanation: "vA/vB = sqrt(uB/uA) = sqrt(0.04/0.01) = sqrt(4) = 2. String A (lighter) is 2x faster."
    },
    {
      scenario: "A piano's bass strings are wrapped with wire (higher mass density).",
      question: "Why is this done?",
      options: [
        { text: "To increase wave speed", correct: false },
        { text: "To produce lower pitch notes", correct: true },
        { text: "To make them louder", correct: false },
        { text: "Only for durability", correct: false }
      ],
      explanation: "Higher mass = lower wave speed = lower frequency = lower pitch."
    },
    {
      scenario: "A tightrope walker increases the rope tension.",
      question: "What happens to wave speed if you pluck the rope?",
      options: [
        { text: "Decreases", correct: false },
        { text: "Increases", correct: true },
        { text: "Stays the same", correct: false },
        { text: "Becomes zero", correct: false }
      ],
      explanation: "v = sqrt(T/u). Higher tension = higher wave speed."
    },
    {
      scenario: "Sound travels through air at ~343 m/s and through steel at ~5000 m/s.",
      question: "Why is steel so much faster?",
      options: [
        { text: "Steel is hotter", correct: false },
        { text: "Steel is much stiffer (higher tension equivalent)", correct: true },
        { text: "Steel is less dense", correct: false },
        { text: "Steel has fewer molecules", correct: false }
      ],
      explanation: "Steel's extreme stiffness dominates its higher density, resulting in much faster wave propagation."
    },
    {
      scenario: "A pulse takes 0.5 s to travel a 10m rope with T = 80 N.",
      question: "What is the rope's linear density?",
      options: [
        { text: "0.01 kg/m", correct: false },
        { text: "0.02 kg/m", correct: false },
        { text: "0.05 kg/m", correct: false },
        { text: "0.2 kg/m", correct: true }
      ],
      explanation: "v = 10m/0.5s = 20 m/s. From v^2 = T/u, u = T/v^2 = 80/(20)^2 = 80/400 = 0.2 kg/m."
    },
    {
      scenario: "Seismic waves travel faster in denser rock layers deep in Earth.",
      question: "How is this possible given v = sqrt(T/u)?",
      options: [
        { text: "The formula doesn't apply", correct: false },
        { text: "Extreme pressure increases stiffness more than density", correct: true },
        { text: "Deeper rock is less dense", correct: false },
        { text: "Temperature makes them faster", correct: false }
      ],
      explanation: "At great depths, extreme pressure increases the rock's elastic modulus faster than density."
    }
  ], []);

  // Applications data
  const applications = useMemo(() => [
    {
      id: 'guitar',
      title: 'Guitar Strings',
      icon: '🎸',
      description: 'How string tension and thickness determine pitch.',
      physics: 'Tuning pegs adjust tension (T) while string gauge affects mass density (u). Together they control wave speed and frequency.',
      formula: 'f = (1/2L)sqrt(T/u)'
    },
    {
      id: 'bridge',
      title: 'Bridge Cables',
      icon: '🌉',
      description: 'Engineers monitor cable health by measuring wave speed.',
      physics: 'Cable tension affects wave propagation speed. Damaged or corroded cables have different vibration characteristics.',
      formula: 'v = sqrt(T/u) --> T = u*v^2'
    },
    {
      id: 'medical',
      title: 'Medical Imaging',
      icon: '🏥',
      description: 'Ultrasound uses wave speed differences to image tissue.',
      physics: 'Sound waves travel at different speeds through different tissues based on their density and stiffness.',
      formula: 'v = sqrt(K/rho)'
    },
    {
      id: 'seismic',
      title: 'Seismology',
      icon: '🌍',
      description: "Earthquake waves reveal Earth's internal structure.",
      physics: "P-waves and S-waves travel at speeds determined by rock density and elastic properties.",
      formula: 'vP = sqrt((K + 4G/3)/rho)'
    }
  ], []);

  // Static rope SVG for predict/review phases (no pulse animation, no sliders)
  const renderStaticRopeVisualization = () => {
    return (
      <svg viewBox="0 0 700 300" style={{ width: '100%', height: '100%', maxHeight: '280px' }}>
        <defs>
          <linearGradient id="wstBgStatic" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#05060a" />
            <stop offset="100%" stopColor="#0a0f1a" />
          </linearGradient>
          <linearGradient id="ropeGradStatic" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c4a574" />
            <stop offset="30%" stopColor="#8b6914" />
            <stop offset="70%" stopColor="#5c4a1f" />
            <stop offset="100%" stopColor="#3d2e16" />
          </linearGradient>
          <linearGradient id="weightGradStatic" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <radialGradient id="anchorGradStatic" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#374151" />
          </radialGradient>
        </defs>

        <rect width="700" height="300" fill="url(#wstBgStatic)" rx="12" />

        {/* Grid lines */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(i => (
          <line key={`vg${i}`} x1={i * 42} y1="0" x2={i * 42} y2="300"
            stroke="#252a38" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
          <line key={`hg${i}`} x1="0" y1={i * 43} x2="700" y2={i * 43}
            stroke="#252a38" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
        ))}

        {/* Distance markers along bottom */}
        {[0, 1, 2, 3, 4, 5].map(m => (
          <g key={m} transform={`translate(${80 + m * 96}, 230)`}>
            <line x1="0" y1="-8" x2="0" y2="0" stroke="#4b5563" strokeWidth="2" />
            <text x="0" y="18" textAnchor="middle" fill="#6b7488" fontSize="12" fontWeight="600">{m}m</text>
          </g>
        ))}

        {/* Left anchor (wall) */}
        <g transform="translate(30, 0)">
          <rect x="0" y="110" width="28" height="90" rx="4" fill="url(#anchorGradStatic)" stroke="#4b5563" strokeWidth="2" />
          <rect x="4" y="115" width="20" height="80" rx="2" fill="#4b5563" />
          <circle cx="14" cy="128" r="4" fill="#1f2937" />
          <circle cx="14" cy="184" r="4" fill="#1f2937" />
        </g>

        {/* Right anchor (pulley system) */}
        <g transform="translate(590, 0)">
          <circle cx="25" cy="155" r="22" fill="url(#anchorGradStatic)" stroke="#4b5563" strokeWidth="2" />
          <circle cx="25" cy="155" r="14" fill="#4b5563" />
          <circle cx="25" cy="155" r="5" fill="#374151" />
          <line x1="25" y1="177" x2="25" y2="215" stroke="url(#ropeGradStatic)" strokeWidth="5" strokeLinecap="round" />
          <rect x="5" y="215" width="40" height="45" rx="6" fill="url(#weightGradStatic)" stroke="#b45309" strokeWidth="2" />
          <text x="25" y="244" textAnchor="middle" fill="#1c1917" fontSize="14" fontWeight="900">T</text>
        </g>

        {/* Main rope */}
        <line x1="58" y1="158" x2="590" y2="158" stroke="rgba(0,0,0,0.3)" strokeWidth="8" strokeLinecap="round" />
        <line x1="58" y1="155" x2="590" y2="155" stroke="url(#ropeGradStatic)" strokeWidth="7" strokeLinecap="round" />

        {/* Rope wave indication (static sine curve) */}
        <path d="M200,155 Q230,115 260,155 Q290,195 320,155 Q350,115 380,155 Q410,195 440,155"
          fill="none" stroke="#fbbf24" strokeWidth="3" opacity="0.6" strokeDasharray="8 4" />

        {/* Reference baseline marker */}
        <line x1="80" y1="90" x2="80" y2="240" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" />
        <text x="80" y="82" textAnchor="middle" fill="#3b82f6" fontSize="10" fontWeight="600">START</text>

        {/* Labels - positioned to avoid overlap */}
        <g transform="translate(130, 50)">
          <rect x="-30" y="-14" width="80" height="26" rx="8" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" strokeWidth="1.5" />
          <text x="10" y="6" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="800">Tension T</text>
        </g>

        <g transform="translate(400, 50)">
          <rect x="-55" y="-14" width="110" height="26" rx="6" fill="rgba(234, 179, 8, 0.15)" stroke="#eab308" strokeWidth="1" />
          <text x="0" y="6" textAnchor="middle" fill="#eab308" fontSize="11" fontWeight="700">mass density μ</text>
        </g>

        <g transform="translate(580, 50)">
          <rect x="-50" y="-14" width="100" height="26" rx="8" fill="rgba(34, 197, 94, 0.15)" stroke="#22c55e" strokeWidth="1.5" />
          <text x="0" y="6" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="800">v = √(T/μ)</text>
        </g>
      </svg>
    );
  };

  // SVG rope visualizer
  const renderRopeVisualization = (currentDensity: number) => {
    const currentSpeed = Math.sqrt(tension / currentDensity);
    const ropeThickness = Math.min(14, 3 + currentDensity * 500);
    const pulseX = 80 + pulsePosition * 480;

    return (
      <svg viewBox="0 0 700 300" style={{ width: '100%', height: '100%', maxHeight: '280px' }}>
        <defs>
          <linearGradient id="wstBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#05060a" />
            <stop offset="50%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#05060a" />
          </linearGradient>
          <linearGradient id="ropeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c4a574" />
            <stop offset="30%" stopColor="#8b6914" />
            <stop offset="70%" stopColor="#5c4a1f" />
            <stop offset="100%" stopColor="#3d2e16" />
          </linearGradient>
          <linearGradient id="weightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <radialGradient id="anchorGrad" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#374151" />
          </radialGradient>
          <filter id="pulseGlow">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="700" height="300" fill="url(#wstBg)" rx="12" />

        {/* Grid lines */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(i => (
          <line key={`vg${i}`} x1={i * 42} y1="0" x2={i * 42} y2="300"
            stroke="#252a38" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
          <line key={`hg${i}`} x1="0" y1={i * 43} x2="700" y2={i * 43}
            stroke="#252a38" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
        ))}

        {/* Distance markers */}
        {[0, 1, 2, 3, 4, 5].map(m => (
          <g key={m} transform={`translate(${80 + m * 96}, 230)`}>
            <line x1="0" y1="-8" x2="0" y2="0" stroke="#4b5563" strokeWidth="2" />
            <text x="0" y="18" textAnchor="middle" fill="#6b7488" fontSize="12" fontWeight="600">{m}m</text>
          </g>
        ))}

        {/* Reference baseline marker */}
        <line x1="80" y1="80" x2="80" y2="240" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" />
        <text x="80" y="72" textAnchor="middle" fill="#3b82f6" fontSize="10" fontWeight="600">REF</text>

        {/* Left anchor (wall) */}
        <g transform="translate(30, 0)">
          <rect x="0" y="110" width="28" height="90" rx="4" fill="url(#anchorGrad)" stroke="#4b5563" strokeWidth="2" />
          <rect x="4" y="115" width="20" height="80" rx="2" fill="#4b5563" />
          <circle cx="14" cy="128" r="4" fill="#1f2937" />
          <circle cx="14" cy="184" r="4" fill="#1f2937" />
        </g>

        {/* Right anchor (pulley system) */}
        <g transform="translate(590, 0)">
          <circle cx="25" cy="155" r="22" fill="url(#anchorGrad)" stroke="#4b5563" strokeWidth="2" />
          <circle cx="25" cy="155" r="14" fill="#4b5563" />
          <circle cx="25" cy="155" r="5" fill="#374151" />
          <line x1="25" y1="177" x2="25" y2="215" stroke="url(#ropeGrad)" strokeWidth={ropeThickness * 0.7} strokeLinecap="round" />
          <rect x="5" y="215" width="40" height="45" rx="6" fill="url(#weightGrad)" stroke="#b45309" strokeWidth="2" />
          <text x="25" y="244" textAnchor="middle" fill="#1c1917" fontSize="14" fontWeight="900">T</text>
        </g>

        {/* Main rope */}
        <line x1="58" y1="158" x2="590" y2="158" stroke="rgba(0,0,0,0.3)" strokeWidth={ropeThickness + 2} strokeLinecap="round" />
        <line x1="58" y1="155" x2="590" y2="155" stroke="url(#ropeGrad)" strokeWidth={ropeThickness} strokeLinecap="round" />

        {/* Pulse visualization */}
        {(isPulseSent || (pulseComplete && pulsePosition > 0)) && (
          <g transform={`translate(${pulseX}, 155)`} filter="url(#pulseGlow)">
            <ellipse cx="0" cy="-20" rx="35" ry="30" fill="#f59e0b" opacity="0.25">
              {isPulseSent && <animate attributeName="opacity" values="0.2;0.4;0.2" dur="0.25s" repeatCount="indefinite" />}
            </ellipse>
            <path d={`M-25,0 Q-12,-${35 + tension/8} 0,-${35 + tension/8} Q12,-${35 + tension/8} 25,0`} fill="none" stroke="#fbbf24" strokeWidth="5" />
            <path d={`M-20,0 Q-10,-${30 + tension/10} 0,-${30 + tension/10} Q10,-${30 + tension/10} 20,0`} fill="none" stroke="#f59e0b" strokeWidth="3" />
            <circle cx="0" cy={-25 - tension/12} r="8" fill="#fbbf24" opacity="0.9">
              {isPulseSent && <animate attributeName="r" values="6;10;6" dur="0.3s" repeatCount="indefinite" />}
            </circle>
          </g>
        )}

        {/* Info panels - positioned well apart to avoid overlap */}
        <g transform="translate(130, 40)">
          <rect x="-42" y="-14" width="84" height="26" rx="8" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" strokeWidth="1.5" />
          <text x="0" y="6" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="800">T={tension}N</text>
        </g>

        <g transform="translate(400, 40)">
          <rect x="-60" y="-14" width="120" height="26" rx="6" fill="rgba(234, 179, 8, 0.15)" stroke="#eab308" strokeWidth="1" />
          <text x="0" y="6" textAnchor="middle" fill="#eab308" fontSize="11" fontWeight="700">μ = {(currentDensity * 1000).toFixed(1)} g/m</text>
        </g>

        <g transform="translate(600, 40)">
          <rect x="-52" y="-14" width="104" height="26" rx="8" fill="rgba(34, 197, 94, 0.15)" stroke="#22c55e" strokeWidth="1.5" />
          <text x="0" y="6" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="800">v={currentSpeed.toFixed(1)} m/s</text>
        </g>

        {/* Stopwatch display - positioned at bottom center */}
        <g transform="translate(350, 265)">
          <rect x="-80" y="-16" width="100" height="28" rx="10" fill="#161a24" stroke={pulseComplete ? "#22c55e" : "#252a38"} strokeWidth="2" />
          <text x="-36" y="6" fill="#6b7488" fontSize="11" fontWeight="600">TIME:</text>
          <text x="16" y="6" textAnchor="middle" fill={pulseComplete ? "#22c55e" : "#fbbf24"} fontSize="15" fontWeight="900">{stopwatchTime.toFixed(3)}s</text>
        </g>

        {/* Completion indicator */}
        {pulseComplete && (
          <g transform="translate(570, 90)">
            <circle cx="0" cy="0" r="20" fill="rgba(34, 197, 94, 0.2)" />
            <text x="0" y="7" textAnchor="middle" fill="#22c55e" fontSize="20">✓</text>
          </g>
        )}
      </svg>
    );
  };

  // Application graphics
  const renderAppGraphic = (appId: string) => {
    switch (appId) {
      case 'guitar':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-32">
            <rect x="0" y="0" width="200" height="120" fill="#05060a" rx="8" />
            <defs>
              <linearGradient id="guitarBody" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#92400e" />
                <stop offset="100%" stopColor="#451a03" />
              </linearGradient>
            </defs>
            <ellipse cx="100" cy="75" rx="50" ry="35" fill="url(#guitarBody)" stroke="#78350f" strokeWidth="2" />
            <circle cx="100" cy="75" r="15" fill="#1c1917" />
            <rect x="145" y="35" width="50" height="15" rx="2" fill="#854d0e" />
            {[0, 1, 2, 3, 4, 5].map(i => (
              <line key={i} x1="85" y1={60 + i * 5} x2="195" y2={37 + i * 2.5} stroke={i < 3 ? "#e5e7eb" : "#d97706"} strokeWidth={0.8 + (5 - i) * 0.15} />
            ))}
            {[0, 1, 2, 3].map(i => (
              <line key={i} x1={155 + i * 12} y1="35" x2={155 + i * 12} y2="50" stroke="#fbbf24" strokeWidth="2" />
            ))}
            <text x="100" y="115" textAnchor="middle" fill="#6b7488" fontSize="9">Tension affects pitch</text>
          </svg>
        );

      case 'bridge':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-32">
            <rect x="0" y="0" width="200" height="120" fill="#05060a" rx="8" />
            <rect x="0" y="90" width="200" height="30" fill="#0ea5e9" opacity="0.3" />
            <rect x="50" y="25" width="12" height="70" rx="2" fill="#92400e" />
            <rect x="138" y="25" width="12" height="70" rx="2" fill="#92400e" />
            <path d="M10,30 Q56,70 100,70 Q144,70 190,30" fill="none" stroke="#f59e0b" strokeWidth="3" />
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
              const x = 30 + i * 20;
              const y = 35 + Math.abs(3.5 - i) * 10;
              return <line key={i} x1={x} y1={y} x2={x} y2="85" stroke="#fbbf24" strokeWidth="1.5" />;
            })}
            <rect x="20" y="85" width="160" height="8" rx="2" fill="#374151" />
            <circle cx="56" cy="50" r="8" fill="#f59e0b" opacity="0.3">
              <animate attributeName="r" values="4;12;4" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <text x="100" y="115" textAnchor="middle" fill="#6b7488" fontSize="9">Cable health monitoring</text>
          </svg>
        );

      case 'medical':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-32">
            <rect x="0" y="0" width="200" height="120" fill="#05060a" rx="8" />
            <ellipse cx="100" cy="70" rx="70" ry="45" fill="#fca5a5" opacity="0.3" stroke="#f87171" strokeWidth="2" />
            <rect x="85" y="5" width="30" height="30" rx="4" fill="#374151" />
            <rect x="92" y="35" width="16" height="10" fill="#4b5563" />
            {[0, 1, 2].map(i => (
              <path key={i} d={`M100,45 Q${85 - i * 10},${60 + i * 10} 100,${75 + i * 15} Q${115 + i * 10},${60 + i * 10} 100,45`}
                fill="none" stroke="#f59e0b" strokeWidth="2" opacity={0.7 - i * 0.2}>
                <animate attributeName="opacity" values={`${0.7 - i * 0.2};${0.3};${0.7 - i * 0.2}`} dur="1s" repeatCount="indefinite" />
              </path>
            ))}
            <ellipse cx="100" cy="80" rx="25" ry="15" fill="#dc2626" opacity="0.4" />
            <circle cx="100" cy="65" r="5" fill="#fbbf24">
              <animate attributeName="r" values="3;6;3" dur="0.8s" repeatCount="indefinite" />
            </circle>
            <text x="100" y="115" textAnchor="middle" fill="#6b7488" fontSize="9">Tissue imaging via wave speed</text>
          </svg>
        );

      case 'seismic':
        return (
          <svg viewBox="0 0 200 120" className="w-full h-32">
            <rect x="0" y="0" width="200" height="120" fill="#05060a" rx="8" />
            <circle cx="100" cy="100" r="90" fill="#fbbf24" opacity="0.2" />
            <circle cx="100" cy="100" r="65" fill="#dc2626" opacity="0.3" />
            <circle cx="100" cy="100" r="40" fill="#78350f" />
            <rect x="0" y="0" width="200" height="20" fill="#22c55e" opacity="0.3" />
            <path d="M30,15 Q50,50 70,40 Q90,30 100,60" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4,2">
              <animate attributeName="stroke-dashoffset" values="0;-12" dur="1s" repeatCount="indefinite" />
            </path>
            <path d="M170,15 Q150,50 130,40 Q110,30 100,60" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4,2">
              <animate attributeName="stroke-dashoffset" values="0;-12" dur="1s" repeatCount="indefinite" />
            </path>
            <circle cx="100" cy="15" r="6" fill="#f59e0b">
              <animate attributeName="r" values="4;8;4" dur="0.5s" repeatCount="indefinite" />
            </circle>
            <text x="100" y="10" textAnchor="middle" fill="#fef3c7" fontSize="8" fontWeight="bold">EPICENTER</text>
          </svg>
        );

      default:
        return null;
    }
  };

  // ==================== PHASE RENDERS ====================

  const renderPhase = () => {
    // HOOK
    if (phase === 'hook') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center"
          style={{ minHeight: '100vh', paddingTop: '48px', paddingBottom: '100px' }}>
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

          <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-amber-600/20 to-slate-800 border-2 border-amber-500/30 flex items-center justify-center mb-6 shadow-lg shadow-amber-500/20 animate-bounce" style={{ animationDuration: '3s' }}>
            <span className="text-5xl">🪢</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Wave Speed on Strings
          </h1>

          <p className="text-lg text-slate-300 mb-2 max-w-lg">
            Why do <span className="text-amber-400 font-semibold">tight ropes</span> carry pulses faster than loose ones?
          </p>

          <p className="text-sm text-slate-500 mb-8 max-w-md">
            Discover the v = sqrt(T/u) formula through hands-on experimentation
          </p>

          <div className="flex gap-4 mb-8">
            {[
              { icon: '🎯', label: 'Tension' },
              { icon: '⚖️', label: 'Mass' },
              { icon: '⏱️', label: 'Timing' }
            ].map((item, i) => (
              <div key={i} className="px-6 py-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{item.label}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => goToPhase('predict')}
            className="px-10 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-lg shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all duration-300"
            style={{ zIndex: 10, minHeight: '44px', background: 'linear-gradient(to right, #f59e0b, #ea580c)' }}
          >
            Start Experiment
          </button>

          <p className="text-xs text-slate-600 mt-6">
            ~5 minutes - Interactive simulation - 10 mastery questions
          </p>
        </div>
      );
    }


    // INTRO
    if (phase === 'intro') {
      return (
        <div className="flex flex-col flex-1" style={{ overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', flex: 1 }}>
          <div className="flex flex-col items-center justify-center px-6 py-8" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 className="text-3xl font-black text-white mb-6 text-center">Understanding Wave Speed</h2>
            <div className="space-y-6 w-full">
              <div className="p-6 rounded-xl" style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(71,85,105,0.5)', borderRadius: '12px', marginBottom: '16px' }}>
                <h3 className="text-xl font-bold text-amber-400 mb-3">The Physics</h3>
                <p className="text-slate-300 leading-relaxed mb-4">
                  When you send a pulse down a rope, how fast does it travel? The answer depends on two key factors: how tightly the rope is stretched (tension) and how heavy the rope is per unit length (linear density).
                </p>
                <p className="text-slate-300 leading-relaxed">
                  Higher tension means the rope snaps back faster when disturbed, increasing wave speed. More mass means more inertia to overcome, decreasing wave speed.
                </p>
              </div>

              <div className="p-6 rounded-xl text-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', marginBottom: '16px' }}>
                <p className="text-sm font-bold text-amber-400 mb-3">THE FORMULA</p>
                <p className="text-3xl font-serif text-white mb-3">
                  v = sqrt(T / u)
                </p>
                <p className="text-sm text-slate-400">
                  <span className="text-amber-400 font-semibold">T</span> = tension force (N) | <span className="text-yellow-400 font-semibold">u</span> = linear density (kg/m)
                </p>
              </div>

              <div className="p-6 rounded-xl" style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(71,85,105,0.5)', borderRadius: '12px', marginBottom: '16px' }}>
                <h3 className="text-xl font-bold text-emerald-400 mb-3">Real-World Impact</h3>
                <p className="text-slate-300 leading-relaxed">
                  This principle governs guitar strings producing perfect pitch, suspension bridge cables resisting oscillation, and seismic waves revealing Earth's interior structure.
                </p>
              </div>
            </div>

            <button
              onClick={() => goToPhase('predict')}
              className="mt-8 px-10 py-4 rounded-xl text-white font-bold text-lg shadow-lg shadow-amber-500/30 transition-all duration-300"
              style={{ zIndex: 10, minHeight: '44px', cursor: 'pointer', background: 'linear-gradient(to right, #f59e0b, #ea580c)' }}
            >
              Make Your Prediction
            </button>
          </div>
        </div>
      );
    }


    // PREDICT
    if (phase === 'predict') {
      const options = [
        { id: 'faster', label: 'Pulse travels faster', desc: 'Higher tension = faster pulse', icon: '🚀' },
        { id: 'slower', label: 'Pulse travels slower', desc: 'Higher tension = slower pulse', icon: '🐢' },
        { id: 'same', label: 'No change in speed', desc: "Tension doesn't affect speed", icon: '➡️' }
      ];

      return (
        <div className="flex flex-col flex-1" style={{ overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', flex: 1 }}>
          <div className="flex flex-col px-6 py-8">
            <div className="max-w-xl mx-auto w-full">
              <p className="text-xs font-bold text-amber-400 mb-2 uppercase tracking-widest">Predict</p>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
                Tight vs. Loose Rope?
              </h2>
              <p className="text-slate-400 mb-6">
                You snap a pulse into a rope tied between two posts. What happens when you increase the rope's tension?
              </p>

              {/* Static SVG visualization for predict phase */}
              <div className="w-full mb-6 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(71,85,105,0.5)' }}>
                {renderStaticRopeVisualization()}
              </div>

              <div className="flex flex-col gap-3 mb-8">
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setPrediction(opt.id);
                      emitEvent('prediction_made', { prediction: opt.id, label: opt.label });
                    }}
                    className={`flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all duration-300 ${
                      prediction === opt.id
                        ? 'border-amber-500 bg-amber-500/10 text-white'
                        : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                    }`}
                    style={{ zIndex: 10, minHeight: '44px' }}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div>
                      <p className="font-bold">{opt.label}</p>
                      <p className="text-sm text-slate-400">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-6">
                <p className="text-xs font-bold text-amber-400 mb-2">💡 THINK ABOUT IT</p>
                <p className="text-sm text-slate-400">
                  Think about a guitar string. When you turn the tuning peg tighter, what happens to the note's pitch?
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => { if (prediction) goToPhase('play'); }}
                  disabled={!prediction}
                  className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 ${
                    prediction
                      ? 'text-white shadow-lg shadow-amber-500/30'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                  style={{ zIndex: 10, minHeight: '44px', ...(prediction ? { background: 'linear-gradient(to right, #f59e0b, #ea580c)' } : {}) }}
                >
                  Test It
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // LAB (play)
    if (phase === 'play') {
      return (
        <div className="flex flex-col flex-1" style={{ overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px', flex: 1 }}>
          <div className="flex-1 flex flex-col items-center p-4">

            {/* SVG visualization */}
            <div className="w-full max-w-3xl mb-6" style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(71,85,105,0.5)' }}>
              {renderRopeVisualization(linearDensity)}
            </div>

            <div className="w-full max-w-2xl mb-6"
              style={{ padding: '20px', borderRadius: '12px', background: 'rgba(30,41,59,0.3)', border: '1px solid rgba(71,85,105,0.5)' }}>
              <p className="text-xs font-bold text-amber-400 mb-2">👀 OBSERVE</p>
              <p className="text-sm text-slate-300 leading-relaxed">
                Watch how changing tension force affects the wave pulse travel time. Higher tension makes the rope "snap back" faster, increasing wave speed. This is why guitar strings produce different pitches when tightened.
              </p>
            </div>

            {/* Data readout cards */}
            <div className="w-full max-w-2xl grid grid-cols-2 gap-4 mb-6">
              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', transition: 'all 0.3s ease' }}>
                <p className="text-xs font-bold text-amber-400 mb-1">CURRENT SPEED</p>
                <p className="text-2xl font-black text-white">{waveSpeed.toFixed(1)} m/s</p>
                <p className="text-xs text-slate-400">Wave velocity</p>
              </div>
              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', transition: 'all 0.3s ease' }}>
                <p className="text-xs font-bold text-emerald-400 mb-1">TRAVEL TIME</p>
                <p className="text-2xl font-black text-white">{(ropeLength / waveSpeed).toFixed(2)}s</p>
                <p className="text-xs text-slate-400">For {ropeLength}m rope</p>
              </div>
            </div>

            <div className="w-full max-w-2xl">
              <div className="flex justify-center mb-6">
                <button
                  onClick={() => {
                    if (isPulseSent) return;
                    setPulsePosition(0);
                    setIsPulseSent(true);
                    setPulseComplete(false);
                    setStopwatchTime(0);
                    emitEvent('simulation_started', { action: 'send_pulse', tension, linearDensity, expectedSpeed: waveSpeed });
                  }}
                  disabled={isPulseSent}
                  className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 ${
                    isPulseSent
                      ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      : 'text-white shadow-lg shadow-amber-500/30'
                  }`}
                  style={{ zIndex: 10, minHeight: '44px', ...(isPulseSent ? {} : { background: 'linear-gradient(to right, #f59e0b, #ea580c)' }) }}
                >
                  {isPulseSent ? 'Traveling...' : 'Send Pulse'}
                </button>
              </div>

              {/* Tension slider */}
              <div className="mb-6 w-full" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(30,41,59,0.3)', border: '1px solid rgba(71,85,105,0.5)' }}>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-slate-300 font-semibold">
                    Tension Force (T) — controls how tightly the rope is stretched
                  </label>
                  <span className="text-sm text-amber-400 font-bold">{tension} N</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={tension}
                  onChange={(e) => {
                    setTension(parseInt(e.target.value));
                    setPulsePosition(0);
                    setIsPulseSent(false);
                    setPulseComplete(false);
                    setStopwatchTime(0);
                    emitEvent('parameter_changed', { param: 'tension', value: parseInt(e.target.value) });
                  }}
                  style={{
                    width: '100%',
                    height: '20px',
                    accentColor: '#3b82f6',
                    WebkitAppearance: 'none',
                    touchAction: 'pan-y',
                    cursor: 'pointer'
                  }}
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>10 N (loose)</span>
                  <span>200 N (tight)</span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => { if (pulseComplete) goToPhase('review'); }}
                  disabled={!pulseComplete}
                  className={`px-6 py-2 rounded-xl font-bold transition-all duration-300 ${
                    pulseComplete
                      ? 'text-white'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                  style={{ zIndex: 10, minHeight: '44px', ...(pulseComplete ? { background: 'linear-gradient(to right, #f59e0b, #ea580c)' } : {}) }}
                >
                  Understand Why
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // REVIEW
    if (phase === 'review') {
      return (
        <div className="flex flex-col flex-1 overflow-y-auto" style={{ paddingTop: '48px', paddingBottom: '100px' }}>
          <div className="flex flex-col px-6 py-8">
            <div className="max-w-2xl mx-auto w-full">
              <p className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-widest">Understanding</p>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
                Why Does Tension Increase Speed?
              </h2>
              <p className="text-slate-400 mb-6">
                {prediction === 'faster'
                  ? '✅ You predicted correctly! Higher tension means faster wave speed.'
                  : "Higher tension actually increases wave speed. Here's why:"}
              </p>

              {/* Static SVG diagram for review */}
              <div className="w-full mb-6 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(71,85,105,0.5)' }}>
                {renderStaticRopeVisualization()}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', transition: 'all 0.3s ease' }}>
                  <div className="text-2xl mb-2">🎯</div>
                  <h4 className="text-sm font-bold text-amber-400 mb-1">Restoring Force</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Higher tension means stronger restoring force. The rope "snaps back" faster when disturbed!
                  </p>
                </div>
                <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', transition: 'all 0.3s ease' }}>
                  <div className="text-2xl mb-2">⚡</div>
                  <h4 className="text-sm font-bold text-emerald-400 mb-1">Faster Propagation</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Wave speed increases with the square root of tension: v ∝ sqrt(T)
                  </p>
                </div>
              </div>

              <div className="p-8 rounded-2xl text-center mb-8"
                style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(30,41,59,1))', border: '1px solid rgba(245,158,11,0.2)' }}>
                <p className="text-xs font-bold text-amber-400 mb-4 uppercase tracking-widest">The Wave Speed Formula</p>
                <p className="text-3xl font-serif text-white mb-4">
                  v = sqrt(<span className="text-amber-400">T</span> / <span className="text-yellow-400">u</span>)
                </p>
                <p className="text-sm text-slate-400">
                  <span className="text-amber-400">T</span> = tension (N) | <span className="text-yellow-400">u</span> = mass per length (kg/m)
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => goToPhase('twist_predict')}
                  className="px-8 py-3 rounded-xl text-white font-bold shadow-lg shadow-amber-500/30 transition-all duration-300"
                  style={{ zIndex: 10, minHeight: '44px', background: 'linear-gradient(to right, #f59e0b, #ea580c)' }}
                >
                  Explore Mass Effect
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // TWIST PREDICT
    if (phase === 'twist_predict') {
      const options = [
        { id: 'faster', label: 'Wave travels faster', desc: 'More mass = more momentum = faster', icon: '🚀' },
        { id: 'slower', label: 'Wave travels slower', desc: 'More mass = more inertia = slower', icon: '🐢' },
        { id: 'same', label: 'No change in speed', desc: "Mass doesn't affect wave speed", icon: '➡️' }
      ];

      return (
        <div className="flex flex-col flex-1 overflow-y-auto" style={{ paddingTop: '48px', paddingBottom: '100px' }}>
          <div className="flex flex-col px-6 py-8">
            <div className="max-w-xl mx-auto w-full">
              <p className="text-xs font-bold text-violet-400 mb-2 uppercase tracking-widest">New Variable</p>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
                What About Rope Mass?
              </h2>
              <p className="text-slate-400 mb-6">
                Now keep tension the same, but use a HEAVIER rope (more mass per meter). How does this affect wave speed?
              </p>

              {/* Static SVG visualization for twist_predict phase */}
              <div className="w-full mb-6 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(71,85,105,0.5)' }}>
                {renderStaticRopeVisualization()}
              </div>

              <div className="flex flex-col gap-3 mb-8">
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setTwistPrediction(opt.id);
                      emitEvent('twist_prediction_made', { prediction: opt.id });
                    }}
                    className={`flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all duration-300 ${
                      twistPrediction === opt.id
                        ? 'border-violet-500 bg-violet-500/10 text-white'
                        : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                    }`}
                    style={{ zIndex: 10, minHeight: '44px' }}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div>
                      <p className="font-bold">{opt.label}</p>
                      <p className="text-sm text-slate-400">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-6">
                <p className="text-xs font-bold text-amber-400 mb-2">💡 THINK ABOUT IT</p>
                <p className="text-sm text-slate-400">
                  Imagine pushing a heavy cart vs. a light cart. Which responds faster to the same force?
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => { if (twistPrediction) goToPhase('twist_play'); }}
                  disabled={!twistPrediction}
                  className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 ${
                    twistPrediction
                      ? 'text-white shadow-lg shadow-violet-500/30'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                  style={{ zIndex: 10, minHeight: '44px', ...(twistPrediction ? { background: 'linear-gradient(to right, #7c3aed, #6d28d9)' } : {}) }}
                >
                  Test Your Prediction
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // TWIST LAB (twist_play)
    if (phase === 'twist_play') {
      return (
        <div className="flex flex-col flex-1 overflow-auto" style={{ paddingTop: '48px', paddingBottom: '100px' }}>
          <div className="flex-1 flex flex-col items-center p-4">
            <div className="w-full max-w-3xl mb-6" style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(71,85,105,0.5)' }}>
              {renderRopeVisualization(twistLinearDensity)}
            </div>

            <div className="w-full max-w-2xl mb-6"
              style={{ padding: '20px', borderRadius: '12px', background: 'rgba(30,41,59,0.3)', border: '1px solid rgba(71,85,105,0.5)' }}>
              <p className="text-xs font-bold text-violet-400 mb-2">👀 OBSERVE</p>
              <p className="text-sm text-slate-300 leading-relaxed">
                Notice how heavier ropes (higher mass density) carry waves more slowly. More inertia means the rope responds slower to disturbances.
              </p>
            </div>

            <div className="w-full max-w-2xl grid grid-cols-2 gap-4 mb-6">
              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', transition: 'all 0.3s ease' }}>
                <p className="text-xs font-bold text-violet-400 mb-1">CURRENT SPEED</p>
                <p className="text-2xl font-black text-white">{twistWaveSpeed.toFixed(1)} m/s</p>
                <p className="text-xs text-slate-400">Wave velocity</p>
              </div>
              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', transition: 'all 0.3s ease' }}>
                <p className="text-xs font-bold text-emerald-400 mb-1">COMPARISON</p>
                <p className="text-2xl font-black text-white">{((waveSpeed - twistWaveSpeed) / waveSpeed * 100).toFixed(0)}%</p>
                <p className="text-xs text-slate-400">vs. lighter rope</p>
              </div>
            </div>

            <div className="w-full max-w-2xl">
              <div className="flex justify-center mb-6">
                <button
                  onClick={() => {
                    if (isPulseSent) return;
                    setPulsePosition(0);
                    setIsPulseSent(true);
                    setPulseComplete(false);
                    setStopwatchTime(0);
                    emitEvent('simulation_started', { action: 'send_pulse', tension, linearDensity: twistLinearDensity, expectedSpeed: twistWaveSpeed });
                  }}
                  disabled={isPulseSent}
                  className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 ${
                    isPulseSent
                      ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      : 'text-white shadow-lg shadow-amber-500/30'
                  }`}
                  style={{ zIndex: 10, minHeight: '44px', ...(isPulseSent ? {} : { background: 'linear-gradient(to right, #f59e0b, #ea580c)' }) }}
                >
                  {isPulseSent ? 'Traveling...' : 'Send Pulse'}
                </button>
              </div>

              {/* Linear density slider */}
              <div className="mb-6 w-full" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(30,41,59,0.3)', border: '1px solid rgba(71,85,105,0.5)' }}>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-slate-300 font-semibold">
                    Linear Mass Density (μ) — mass per unit length of rope
                  </label>
                  <span className="text-sm text-yellow-400 font-bold">{(twistLinearDensity * 1000).toFixed(1)} g/m</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={twistLinearDensity * 1000}
                  onChange={(e) => {
                    setTwistLinearDensity(parseInt(e.target.value) / 1000);
                    setPulsePosition(0);
                    setIsPulseSent(false);
                    setPulseComplete(false);
                    setStopwatchTime(0);
                    emitEvent('parameter_changed', { param: 'linearDensity', value: parseInt(e.target.value) / 1000 });
                  }}
                  style={{
                    width: '100%',
                    height: '20px',
                    accentColor: '#3b82f6',
                    WebkitAppearance: 'none',
                    touchAction: 'pan-y',
                    cursor: 'pointer'
                  }}
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>5 g/m (light)</span>
                  <span>100 g/m (heavy)</span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => { if (pulseComplete) goToPhase('twist_review'); }}
                  disabled={!pulseComplete}
                  className={`px-6 py-2 rounded-xl font-bold transition-all duration-300 ${
                    pulseComplete
                      ? 'text-white'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                  style={{ zIndex: 10, minHeight: '44px', ...(pulseComplete ? { background: 'linear-gradient(to right, #f59e0b, #ea580c)' } : {}) }}
                >
                  See the Full Picture
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // TWIST REVIEW
    if (phase === 'twist_review') {
      return (
        <div className="flex flex-col flex-1 overflow-y-auto" style={{ paddingTop: '48px', paddingBottom: '100px' }}>
          <div className="flex flex-col px-6 py-8">
            <div className="max-w-xl mx-auto w-full">
              <p className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-widest">Deep Insight</p>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
                The Complete Picture
              </h2>
              <p className="text-slate-400 mb-6">
                {twistPrediction === 'slower'
                  ? '✅ Correct! More mass means more inertia, making the rope respond slower.'
                  : 'More mass per length actually DECREASES wave speed!'}
              </p>

              {/* Static SVG diagram for twist_review */}
              <div className="w-full mb-6 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(71,85,105,0.5)' }}>
                {renderStaticRopeVisualization()}
              </div>

              <div className="p-8 rounded-2xl text-center mb-8 transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(30,41,59,1))', border: '1px solid rgba(245,158,11,0.2)' }}>
                <p className="text-xs font-bold text-amber-400 mb-4 uppercase tracking-widest">Wave Speed on a String</p>
                <p className="text-3xl font-serif text-white mb-4">
                  v = sqrt(<span className="text-amber-400">T</span> / <span className="text-yellow-400">u</span>)
                </p>
                <div className="flex justify-center gap-8 mt-4">
                  <div>
                    <p className="text-lg text-amber-400 font-bold">↑ T</p>
                    <p className="text-xs text-slate-400">Faster</p>
                  </div>
                  <div>
                    <p className="text-lg text-yellow-400 font-bold">↑ u</p>
                    <p className="text-xs text-slate-400">Slower</p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-8">
                <p className="text-xs font-bold text-emerald-400 mb-2">🎓 KEY INSIGHT</p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Wave speed is the balance between restoring force (tension pulling the rope back) and inertia (mass resisting motion). This formula applies to guitar strings, bridge cables, and even seismic waves!
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => goToPhase('transfer')}
                  className="px-8 py-3 rounded-xl text-white font-bold shadow-lg shadow-amber-500/30 transition-all duration-300"
                  style={{ zIndex: 10, minHeight: '44px', background: 'linear-gradient(to right, #f59e0b, #ea580c)' }}
                >
                  Real-World Applications
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // TRANSFER
    if (phase === 'transfer') {
      const app = realWorldApps[activeApp];
      const allAppsCompleted = completedApps.size === realWorldApps.length;

      return (
        <div className="flex flex-col flex-1" style={{ paddingTop: '48px', paddingBottom: '100px' }}>
          <div className="flex items-center justify-center gap-3 py-4 bg-slate-900/80 border-b border-slate-800">
            <span className="text-sm text-slate-400">
              Application {activeApp + 1} of {realWorldApps.length}
            </span>
            <div className="flex gap-1.5">
              {realWorldApps.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all ${
                    completedApps.has(idx) ? 'bg-emerald-500' : idx === activeApp ? 'bg-amber-400' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-slate-500">
              ({completedApps.size}/{realWorldApps.length} read)
            </span>
          </div>

          {/* Scrollable app tab buttons */}
          <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', background: 'rgba(15,23,42,0.8)', borderBottom: '1px solid rgba(30,41,59,1)', overflowX: 'auto', overflowY: 'hidden' }}>
            {realWorldApps.map((a, idx) => {
              const isCompleted = completedApps.has(idx);
              const isCurrent = idx === activeApp;
              return (
                <button
                  key={a.title}
                  onClick={() => {
                    const now = Date.now();
                    if (now - lastClickRef.current < 200) return;
                    lastClickRef.current = now;
                    setActiveApp(idx);
                    emitEvent('app_explored', { appIndex: idx });
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
                    isCurrent
                      ? 'bg-slate-800 text-white'
                      : isCompleted
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                  }`}
                  style={{ zIndex: 10, minHeight: '44px' }}
                >
                  {a.icon} {isCompleted && !isCurrent ? '✓ ' : ''}{isMobile ? '' : a.title}
                </button>
              );
            })}
          </div>

          {/* Scrollable content area wrapping all app cards */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <div style={{ padding: '24px' }}>
              <div style={{ maxWidth: '640px', margin: '0 auto' }}>

                {/* App graphic */}
                <div style={{ marginBottom: '24px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(30,41,59,1)' }}>
                  {renderAppGraphic(app.id)}
                </div>

                {/* App header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                    {app.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: 0 }}>{app.title}</h3>
                    <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>{app.description}</p>
                  </div>
                </div>

                {/* Tagline */}
                <div style={{ padding: '12px 16px', borderRadius: '10px', background: `${app.color}15`, border: `1px solid ${app.color}40`, marginBottom: '16px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: app.color, margin: 0 }}>{app.tagline}</p>
                </div>

                {/* Description */}
                <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(71,85,105,0.5)', marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px' }}>📖 OVERVIEW</p>
                  <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>{app.description}</p>
                </div>

                {/* Connection */}
                <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(71,85,105,0.5)', marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px' }}>🔬 THE PHYSICS CONNECTION</p>
                  <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>{app.connection}</p>
                </div>

                {/* How it works */}
                <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(71,85,105,0.5)', marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e', marginBottom: '8px' }}>⚙️ HOW IT WORKS</p>
                  <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>{app.howItWorks}</p>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '16px' }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(71,85,105,0.5)', textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', marginBottom: '4px' }}>{stat.icon}</div>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: app.color }}>{stat.value}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Examples */}
                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(71,85,105,0.5)', marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#a78bfa', marginBottom: '8px' }}>📋 EXAMPLES</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {app.examples.map((ex, i) => (
                      <span key={i} style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', fontSize: '12px', color: '#c4b5fd' }}>{ex}</span>
                    ))}
                  </div>
                </div>

                {/* Companies */}
                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(71,85,105,0.5)', marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa', marginBottom: '8px' }}>🏢 KEY COMPANIES</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {app.companies.map((co, i) => (
                      <span key={i} style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', fontSize: '12px', color: '#93c5fd' }}>{co}</span>
                    ))}
                  </div>
                </div>

                {/* Future impact */}
                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', marginBottom: '24px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#34d399', marginBottom: '8px' }}>🚀 FUTURE IMPACT</p>
                  <p style={{ fontSize: '13px', color: '#a7f3d0', lineHeight: 1.6, margin: 0 }}>{app.futureImpact}</p>
                </div>

                {/* Action button */}
                {!completedApps.has(activeApp) ? (
                  <button
                    onClick={() => {
                      const now = Date.now();
                      if (now - lastClickRef.current < 200) return;
                      lastClickRef.current = now;
                      const newCompleted = new Set(completedApps);
                      newCompleted.add(activeApp);
                      setCompletedApps(newCompleted);
                      emitEvent('app_explored', { app: app.title });
                    }}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'rgba(16,185,129,0.1)',
                      border: '2px solid #10b981',
                      color: '#34d399',
                      fontWeight: 600,
                      fontSize: '18px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      zIndex: 10,
                      minHeight: '44px'
                    }}
                  >
                    Got It — Continue →
                  </button>
                ) : (
                  activeApp < realWorldApps.length - 1 ? (
                    <button
                      onClick={() => {
                        const now = Date.now();
                        if (now - lastClickRef.current < 200) return;
                        lastClickRef.current = now;
                        setActiveApp(activeApp + 1);
                      }}
                      style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '12px',
                        background: 'linear-gradient(to right, #f59e0b, #ea580c)',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '18px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        zIndex: 10,
                        minHeight: '44px'
                      }}
                    >
                      Next Application →
                    </button>
                  ) : (
                    allAppsCompleted ? (
                      <button
                        onClick={() => goToPhase('test')}
                        style={{
                          width: '100%',
                          padding: '16px',
                          borderRadius: '12px',
                          background: 'linear-gradient(to right, #10b981, #059669)',
                          border: 'none',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '18px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          zIndex: 10,
                          minHeight: '44px'
                        }}
                      >
                        Take the Test →
                      </button>
                    ) : (
                      <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', textAlign: 'center' }}>
                        <span style={{ color: '#34d399', fontWeight: 600 }}>Completed</span>
                      </div>
                    )
                  )
                )}

                {/* Take the test button when all apps completed */}
                {allAppsCompleted && activeApp < realWorldApps.length - 1 && (
                  <button
                    onClick={() => goToPhase('test')}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'linear-gradient(to right, #10b981, #059669)',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '16px',
                      cursor: 'pointer',
                      marginTop: '12px',
                      transition: 'all 0.3s ease',
                      zIndex: 10,
                      minHeight: '44px'
                    }}
                  >
                    All Apps Done — Take the Test →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // TEST
    if (phase === 'test') {
      if (testSubmitted) {
        const score = testAnswers.reduce((acc, ans, i) => acc + (testQuestions[i].options[ans as number]?.correct ? 1 : 0), 0);
        const percentage = Math.round((score / testQuestions.length) * 100);
        const passed = percentage >= 70;

        return (
          <div className="flex flex-col flex-1 overflow-y-auto items-center justify-center px-6 text-center" style={{ paddingTop: '48px', paddingBottom: '100px' }}>
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-amber-500/30"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #10b981)' }}>
              <span className="text-5xl">{passed ? '🏆' : '📚'}</span>
            </div>

            <h2 className="text-3xl font-black text-white mb-4">
              {percentage >= 90 ? 'Outstanding!' : percentage >= 70 ? 'Great Job!' : 'Keep Learning!'}
            </h2>

            <p className="text-5xl font-black text-amber-400 mb-2">{score}/{testQuestions.length}</p>

            <p className="text-lg text-slate-400 mb-8 max-w-md">
              {percentage >= 90
                ? "You've mastered wave speed physics!"
                : percentage >= 70
                  ? 'Solid understanding of tension and mass effects!'
                  : 'Review the concepts and try again!'}
            </p>

            <button
              onClick={() => {
                if (passed) {
                  goToPhase('mastery');
                } else {
                  setTestSubmitted(false);
                  setTestIndex(0);
                  setTestAnswers(Array(testQuestions.length).fill(null));
                }
              }}
              className="px-10 py-4 rounded-xl text-white font-bold text-lg shadow-lg shadow-amber-500/30 transition-all duration-300"
              style={{ zIndex: 10, minHeight: '44px', background: 'linear-gradient(to right, #f59e0b, #ea580c)' }}
            >
              {passed ? 'Complete Lesson' : 'Try Again'}
            </button>
          </div>
        );
      }

      const q = testQuestions[testIndex];
      const selected = testAnswers[testIndex];

      return (
        <div className="flex flex-col flex-1 overflow-y-auto" style={{ paddingTop: '48px', paddingBottom: '100px' }}>
          <div className="flex flex-col px-6 py-8 flex-1">
            <div className="max-w-xl mx-auto w-full flex-1">
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm text-slate-500 font-semibold">
                  Question {testIndex + 1} of {testQuestions.length}
                </span>
                <div className="flex gap-1.5">
                  {testQuestions.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full ${
                        testAnswers[i] !== null ? 'bg-emerald-500' : i === testIndex ? 'bg-amber-400' : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Scenario context */}
              <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(71,85,105,0.5)', marginBottom: '24px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px' }}>📋 SCENARIO</p>
                <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>{q.scenario}</p>
              </div>

              <h3 className="text-xl font-bold text-white mb-6">
                {q.question}
              </h3>

              <div className="flex flex-col gap-3 mb-6">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const newAnswers = [...testAnswers];
                      newAnswers[testIndex] = i;
                      setTestAnswers(newAnswers);
                      emitEvent('test_answered', { question: testIndex, answer: i });
                    }}
                    className={`p-5 rounded-xl border-2 text-left transition-all duration-300 ${
                      selected === i
                        ? 'border-amber-500 bg-amber-500/10 text-white'
                        : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                    }`}
                    style={{ zIndex: 10, minHeight: '44px' }}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>

              {/* Explanation after answer */}
              {selected !== null && (
                <div style={{ padding: '16px', borderRadius: '12px', background: q.options[selected]?.correct ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${q.options[selected]?.correct ? '#22c55e' : '#ef4444'}`, marginBottom: '16px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: q.options[selected]?.correct ? '#22c55e' : '#ef4444', marginBottom: '6px' }}>
                    {q.options[selected]?.correct ? '✓ Correct!' : '✗ Not quite'}
                  </p>
                  <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>{q.explanation}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between gap-4 pt-4 border-t border-slate-800">
              <button
                onClick={() => { if (testIndex > 0) setTestIndex(testIndex - 1); }}
                disabled={testIndex === 0}
                className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                  testIndex === 0 ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                style={{ zIndex: 10, minHeight: '44px' }}
              >
                Previous
              </button>

              {testIndex < testQuestions.length - 1 ? (
                <button
                  onClick={() => { if (selected !== null) setTestIndex(testIndex + 1); }}
                  disabled={selected === null}
                  className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                    selected !== null
                      ? 'text-white'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                  style={{ zIndex: 10, ...(selected !== null ? { background: 'linear-gradient(to right, #f59e0b, #ea580c)' } : {}) }}
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (testAnswers.every(a => a !== null)) {
                      setTestSubmitted(true);
                      emitEvent('test_completed', {
                        score: testAnswers.reduce((acc, ans, i) => acc + (testQuestions[i].options[ans as number]?.correct ? 1 : 0), 0),
                        total: testQuestions.length
                      });
                    }
                  }}
                  disabled={!testAnswers.every(a => a !== null)}
                  className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                    testAnswers.every(a => a !== null)
                      ? 'text-white'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                  style={{ zIndex: 10, ...(testAnswers.every(a => a !== null) ? { background: 'linear-gradient(to right, #10b981, #059669)' } : {}) }}
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // MASTERY
    if (phase === 'mastery') {
      return (
        <div className="relative flex flex-col items-center justify-center min-h-[80vh] px-6 text-center overflow-hidden"
          style={{ minHeight: '100vh', paddingTop: '48px', paddingBottom: '100px' }}>
          {/* Confetti */}
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2.5 h-2.5 rounded-sm"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: ['#f59e0b', '#22c55e', '#f97316', '#eab308'][i % 4],
                animation: `confettiFall 3s ease-out ${Math.random() * 2}s infinite`,
                opacity: 0.8
              }}
            />
          ))}

          <div className="w-28 h-28 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-amber-500/30 z-10"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', animation: 'float 3s ease-in-out infinite' }}>
            <span className="text-5xl">🏆</span>
          </div>

          <h1 className="text-4xl font-black text-white mb-4 z-10">
            Wave Speed Master!
          </h1>
          <p className="text-lg text-slate-400 mb-6 max-w-md z-10">
            You've mastered the v = sqrt(T/u) formula! From guitar strings to seismic waves, you now understand how tension and mass control wave propagation.
          </p>

          <div className="flex flex-wrap gap-3 justify-center mb-8 z-10">
            {['Tension Effect', 'Mass Effect', 'Wave Formula', 'Applications'].map((item, i) => (
              <span key={i} className="px-4 py-2 rounded-full bg-slate-800 text-white text-sm font-semibold">
                ✓ {item}
              </span>
            ))}
          </div>

          <button
            onClick={() => {
              emitEvent('mastery_achieved', { game: 'wave_speed_tension' });
              if (onComplete) onComplete();
            }}
            className="px-10 py-4 rounded-xl text-white font-bold text-lg shadow-lg shadow-amber-500/30 z-10 transition-all duration-300"
            style={{ zIndex: 10, background: 'linear-gradient(to right, #f59e0b, #ea580c)' }}
          >
            Complete Lesson 🎉
          </button>

          <style>{`
            @keyframes confettiFall {
              0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
              100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
            }
          `}</style>
        </div>
      );
    }

    return null;
  };

  // Navigation bar helpers
  const currentPhaseIndex = phaseOrder.indexOf(phase);
  const canGoBack = currentPhaseIndex > 0;
  const canGoNext = currentPhaseIndex < phaseOrder.length - 1;

  return (
    <div className="flex flex-col bg-[#0a0f1a] text-white relative overflow-hidden" style={{ minHeight: '100dvh' }}>
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/3 rounded-full blur-3xl" />

      {/* Header nav */}
      <nav aria-label="phase navigation" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }} className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span style={{ color: '#e2e8f0' }} className="text-sm font-semibold tracking-wide">Wave Speed &amp; Tension</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p, idx) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                aria-label={`${phaseLabels[p]} phase - ${p === phase ? 'current' : phaseOrder.indexOf(phase) > idx ? 'completed' : 'upcoming'}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-amber-400 w-6 shadow-lg shadow-amber-400/30'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? 'bg-emerald-500 w-2'
                      : 'w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
                style={{
                  zIndex: 10,
                  minHeight: '44px',
                  minWidth: '44px',
                  cursor: 'pointer',
                  backgroundColor: phase === p ? '#fbbf24' : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p) ? '#10b981' : 'rgba(148,163,184,0.7)'
                }}
              />
            ))}
          </div>
          <span style={{ color: '#e2e8f0' }} className="text-sm font-medium">{phaseLabels[phase]}</span>
        </div>
        {/* Progress bar */}
        <div style={{ height: '3px', background: 'rgba(71,85,105,0.3)' }}>
          <div style={{
            height: '100%',
            width: `${((currentPhaseIndex + 1) / phaseOrder.length) * 100}%`,
            background: 'linear-gradient(to right, #f59e0b, #10b981)',
            transition: 'width 0.4s ease'
          }} />
        </div>
      </nav>

      {/* Main content */}
      <div className="relative flex-1 flex flex-col" style={{ paddingTop: '64px', paddingBottom: '80px' }}>{renderPhase()}</div>

      {/* Bottom navigation bar */}
      <nav aria-label="game navigation" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(30,41,59,1)', padding: '12px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '768px', margin: '0 auto' }}>
          <button
            onClick={() => { if (canGoBack) goToPhase(phaseOrder[currentPhaseIndex - 1]); }}
            disabled={!canGoBack}
            aria-label="Back"
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: canGoBack ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              background: canGoBack ? 'rgba(30,41,59,0.8)' : 'rgba(15,23,42,0.5)',
              color: canGoBack ? '#e2e8f0' : '#475569',
              border: '1px solid rgba(71,85,105,0.5)',
              minHeight: '44px'
            }}
          >
            ← Back
          </button>

          <span style={{ fontSize: '12px', color: 'rgba(148,163,184,0.7)', fontWeight: 600 }}>
            {currentPhaseIndex + 1} / {phaseOrder.length}
          </span>

          <button
            onClick={() => { if (canGoNext) goToPhase(phaseOrder[currentPhaseIndex + 1]); }}
            disabled={!canGoNext}
            aria-label="Next"
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: canGoNext ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              background: canGoNext ? 'linear-gradient(to right, #f59e0b, #ea580c)' : 'rgba(15,23,42,0.5)',
              color: canGoNext ? '#fff' : '#475569',
              border: 'none',
              minHeight: '44px'
            }}
          >
            Next →
          </button>
        </div>
      </nav>
    </div>
  );
};

export default WaveSpeedTensionRenderer;
