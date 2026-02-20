import React, { useState, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

const realWorldApps = [
  {
    icon: '🎧',
    title: 'Noise-Canceling Headphones',
    short: 'Creating anti-sound to silence the world',
    tagline: 'Silence through physics',
    description: 'Active noise cancellation uses microphones to detect incoming sound and speakers to emit an inverted waveform. The original sound and anti-sound interfere destructively, reducing noise by up to 30dB.',
    connection: 'This simulation demonstrates destructive interference at half-wavelength path differences. Noise-canceling headphones create a path difference of exactly half a wavelength inside your ear canal.',
    howItWorks: 'External microphones capture ambient noise. DSP chips compute the inverted waveform (180° phase shift) in microseconds. Speakers emit anti-sound that arrives at your eardrum simultaneously with the original noise, causing destructive interference.',
    stats: [
      { value: '30 dB', label: 'Maximum noise reduction', icon: '📉' },
      { value: '$15B', label: 'ANC headphone market', icon: '💰' },
      { value: '10μs', label: 'Processing latency', icon: '⚡' }
    ],
    examples: ['Bose QuietComfort', 'Sony WH-1000XM', 'Apple AirPods Pro', 'Aviation headsets'],
    companies: ['Bose', 'Sony', 'Apple', 'Sennheiser'],
    futureImpact: 'Transparent mode and spatial audio use the same physics to selectively enhance desired sounds while canceling unwanted noise.',
    color: '#8B5CF6'
  },
  {
    icon: '🎭',
    title: 'Concert Hall Acoustics',
    short: 'Designing spaces where every seat sounds perfect',
    tagline: 'Architecture of sound',
    description: 'Concert hall designers carefully position reflective surfaces, absorbers, and diffusers to ensure constructive interference enhances music while destructive interference eliminates echoes and dead spots.',
    connection: 'This simulation shows how speaker position creates interference patterns with loud and quiet spots. Concert halls are designed so reflections from walls, ceiling, and stage create beneficial interference at all seats.',
    howItWorks: 'Ray tracing models predict sound paths from stage to every seat. Early reflections (within 50ms) should reinforce the direct sound through constructive interference. Later reflections are scattered by diffusers to create ambiance without distinct echoes.',
    stats: [
      { value: '1.8-2.2s', label: 'Ideal reverberation time', icon: '🎵' },
      { value: '$500M+', label: 'Major concert hall cost', icon: '🏛️' },
      { value: '50ms', label: 'Critical early reflection window', icon: '⏱️' }
    ],
    examples: ['Sydney Opera House', 'Walt Disney Concert Hall', 'Elbphilharmonie Hamburg', 'Boston Symphony Hall'],
    companies: ['Arup Acoustics', 'Nagata Acoustics', 'Kirkegaard', 'Jaffe Holden'],
    futureImpact: 'Programmable acoustic surfaces with active elements could transform a single hall into multiple acoustic environments on demand.',
    color: '#10B981'
  },
  {
    icon: '📡',
    title: 'Phased Array Radar & Sonar',
    short: 'Steering beams electronically without moving parts',
    tagline: 'The power of many',
    description: 'Phased array systems use multiple transmitters with precisely controlled timing. Constructive interference in one direction creates a focused beam, while destructive interference suppresses energy elsewhere. Electronic timing changes steer the beam instantly.',
    connection: 'This simulation shows two-source interference patterns. Phased arrays use dozens to thousands of sources with controlled phase delays to create complex interference patterns that can be steered and shaped.',
    howItWorks: 'Each antenna element transmits with a programmable time delay. Waves from all elements arrive in phase (constructive interference) only in one direction, determined by the delay pattern. Changing delays electronically steers the beam in microseconds.',
    stats: [
      { value: '1000+', label: 'Elements in advanced arrays', icon: '📡' },
      { value: '1μs', label: 'Beam steering time', icon: '⚡' },
      { value: '$50B', label: 'Phased array market', icon: '💵' }
    ],
    examples: ['AEGIS naval radar', 'F-35 fighter radar', 'SpaceX Starlink antennas', 'Medical ultrasound'],
    companies: ['Raytheon', 'Northrop Grumman', 'Lockheed Martin', 'SpaceX'],
    futureImpact: 'Low-cost digital phased arrays will enable 5G/6G communications, autonomous vehicle radar, and satellite internet for everyone.',
    color: '#F59E0B'
  },
  {
    icon: '🔬',
    title: 'Gravitational Wave Detection',
    short: 'Interferometers detect ripples in spacetime itself',
    tagline: 'Hearing the universe',
    description: 'LIGO detects gravitational waves by measuring interference changes when a passing wave stretches space differently in perpendicular directions. This remarkable achievement measures distances 1/10,000th the width of a proton.',
    connection: 'LIGO is essentially a giant version of this simulation, using laser light instead of sound. When path lengths change due to gravitational waves, the interference pattern shifts detectably.',
    howItWorks: 'A laser beam is split and sent down 4km perpendicular arms. Mirrors reflect the beams back to recombine at a detector. Normally the beams interfere destructively (dark output). A gravitational wave changes arm lengths asymmetrically, shifting the interference and creating a signal.',
    stats: [
      { value: '10⁻²¹', label: 'Strain sensitivity', icon: '🎯' },
      { value: '4 km', label: 'Arm length', icon: '📏' },
      { value: '90+', label: 'Gravitational wave events detected', icon: '🌌' }
    ],
    examples: ['LIGO Hanford & Livingston', 'Virgo (Italy)', 'KAGRA (Japan)', 'Future LISA space detector'],
    companies: ['Caltech', 'MIT', 'LIGO Scientific Collaboration', 'Max Planck Society'],
    futureImpact: 'Space-based interferometers like LISA will detect gravitational waves from supermassive black holes and the early universe.',
    color: '#3B82F6'
  }
];

interface SoundInterferenceRendererProps {
  phase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  gamePhase?: string;
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
  onGameEvent?: (event: unknown) => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  speaker: '#3b82f6',
  constructive: '#10b981',
  destructive: '#ef4444',
  neutral: '#6366f1',
};

const VALID_PHASES = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const SoundInterferenceRenderer: React.FC<SoundInterferenceRendererProps> = (props) => {
  const {
    onPhaseComplete,
    onCorrectAnswer,
    onIncorrectAnswer,
  } = props;

  // Resolve phase from either prop
  const rawPhase = props.phase || props.gamePhase || 'hook';
  const phase = VALID_PHASES.includes(rawPhase) ? rawPhase : 'hook';

  // Internal phase management for self-managing mode
  const [internalPhase, setInternalPhase] = useState(phase);

  // Update internal phase when prop changes
  useEffect(() => {
    setInternalPhase(phase);
  }, [phase]);

  const currentPhase = internalPhase;

  const advancePhase = () => {
    const idx = VALID_PHASES.indexOf(currentPhase);
    if (idx < VALID_PHASES.length - 1) {
      setInternalPhase(VALID_PHASES[idx + 1]);
    }
    if (onPhaseComplete) onPhaseComplete();
  };

  // Simulation state
  const [frequency, setFrequency] = useState(340); // Hz
  const [speakerSeparation, setSpeakerSeparation] = useState(2); // meters
  const [listenerX, setListenerX] = useState(0); // meters from center
  const [listenerY, setListenerY] = useState(3); // meters from speakers
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

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

  // Physics constants
  const speedOfSound = 343; // m/s at room temperature
  const wavelength = speedOfSound / frequency;

  // Calculate path difference and interference
  const speaker1X = -speakerSeparation / 2;
  const speaker2X = speakerSeparation / 2;
  const speakerY = 0;

  const distance1 = Math.sqrt((listenerX - speaker1X) ** 2 + (listenerY - speakerY) ** 2);
  const distance2 = Math.sqrt((listenerX - speaker2X) ** 2 + (listenerY - speakerY) ** 2);
  const pathDifference = Math.abs(distance2 - distance1);
  const phaseRatio = (pathDifference % wavelength) / wavelength;

  // Interference: 0 = destructive, 0.5 = neutral, 1 = constructive
  const interferenceValue = Math.cos(2 * Math.PI * pathDifference / wavelength);
  const isDestructive = Math.abs(interferenceValue) < 0.3;
  const isConstructive = interferenceValue > 0.7;

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => (prev + 0.05) % (2 * Math.PI));
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'always_loud', label: 'Both speakers always make it louder everywhere' },
    { id: 'dead_spots', label: 'Some spots are silent (dead spots) while others are extra loud' },
    { id: 'average', label: 'Sound is the same volume everywhere - they average out' },
    { id: 'cancel_all', label: 'The two sounds completely cancel each other out' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'The dead spots stay in exactly the same places' },
    { id: 'move', label: 'The dead spots move - their spacing changes' },
    { id: 'disappear', label: 'All dead spots disappear' },
    { id: 'more', label: 'More dead spots appear but they stay in the same positions' },
  ];

  const transferApplications = [
    {
      title: 'Concert Hall Acoustics',
      description: 'Large venues with multiple speaker arrays must carefully manage interference patterns to ensure all seats hear balanced sound.',
      question: 'Why do sound engineers position speakers at specific angles?',
      answer: 'By controlling speaker placement and timing, engineers minimize destructive interference in seating areas. Some systems use delay lines to align wavefronts, ensuring constructive interference where audiences sit.',
    },
    {
      title: 'Noise-Canceling Headphones',
      description: 'Active noise cancellation creates "anti-sound" that interferes destructively with incoming noise.',
      question: 'How do noise-canceling headphones use interference?',
      answer: 'Microphones detect external noise, and speakers emit an inverted waveform (180 degrees out of phase). This creates destructive interference, canceling the noise. The path difference is essentially zero at your ear.',
    },
    {
      title: 'Sonar and Radar Arrays',
      description: 'Phased arrays use multiple transmitters with controlled timing to create directional beams through interference.',
      question: 'How do phased arrays "steer" their beams without moving?',
      answer: 'By adjusting the phase delay between elements, the array creates constructive interference in a chosen direction. Signals in other directions interfere destructively, creating a focused, steerable beam.',
    },
    {
      title: 'Radio Antenna Arrays',
      description: 'AM radio stations often use multiple towers to direct their signal toward populated areas.',
      question: 'Why do some radio stations have multiple transmission towers?',
      answer: 'Multiple towers create interference patterns that concentrate signal strength in desired directions (toward cities) while reducing it in others (toward other stations or the ocean). This is called a directional antenna pattern.',
    },
  ];

  const testQuestions = [
    {
      question: 'What causes "dead spots" in sound when two speakers play the same tone?',
      options: [
        { text: 'The speakers are too far apart', correct: false },
        { text: 'Destructive interference where path difference equals half-wavelengths', correct: true },
        { text: 'The sound waves run out of energy', correct: false },
        { text: 'Echo effects from the walls', correct: false },
      ],
    },
    {
      question: 'For destructive interference to occur, the path difference must be:',
      options: [
        { text: 'Zero', correct: false },
        { text: 'A whole number of wavelengths (n times lambda)', correct: false },
        { text: 'An odd number of half-wavelengths ((n + 1/2) times lambda)', correct: true },
        { text: 'Greater than 10 meters', correct: false },
      ],
    },
    {
      question: 'If you double the frequency of the sound, the spacing between dead spots:',
      options: [
        { text: 'Doubles', correct: false },
        { text: 'Halves', correct: true },
        { text: 'Stays the same', correct: false },
        { text: 'Becomes random', correct: false },
      ],
    },
    {
      question: 'At a point equidistant from both speakers, you experience:',
      options: [
        { text: 'Destructive interference - silence', correct: false },
        { text: 'Constructive interference - louder sound', correct: true },
        { text: 'No sound at all', correct: false },
        { text: 'Sound from only one speaker', correct: false },
      ],
    },
    {
      question: 'The wavelength of sound in air is given by:',
      options: [
        { text: 'Wavelength = frequency times speed', correct: false },
        { text: 'Wavelength = speed divided by frequency', correct: true },
        { text: 'Wavelength = frequency divided by speed', correct: false },
        { text: 'Wavelength = speed minus frequency', correct: false },
      ],
    },
    {
      question: 'Why are sound interference patterns easier to notice with pure tones than music?',
      options: [
        { text: 'Music is always quieter', correct: false },
        { text: 'Pure tones have a single wavelength, creating stable interference patterns', correct: true },
        { text: 'Musicians avoid standing in dead spots', correct: false },
        { text: 'Music creates more echoes', correct: false },
      ],
    },
    {
      question: 'Noise-canceling headphones work by:',
      options: [
        { text: 'Blocking sound with thick padding only', correct: false },
        { text: 'Creating sound waves that destructively interfere with noise', correct: true },
        { text: 'Amplifying desired sounds to mask noise', correct: false },
        { text: 'Filtering sound electronically after it enters the ear', correct: false },
      ],
    },
    {
      question: 'Moving the listener perpendicular to the line between speakers causes:',
      options: [
        { text: 'No change in interference pattern', correct: false },
        { text: 'Alternating loud and quiet zones', correct: true },
        { text: 'The sound to get steadily quieter', correct: false },
        { text: 'Both speakers to sound muffled', correct: false },
      ],
    },
    {
      question: 'Increasing the speaker separation while keeping frequency constant:',
      options: [
        { text: 'Creates more dead spots in the same area', correct: true },
        { text: 'Eliminates all dead spots', correct: false },
        { text: 'Has no effect on the interference pattern', correct: false },
        { text: 'Makes all sound quieter', correct: false },
      ],
    },
    {
      question: 'For a 343 Hz tone (wavelength = 1m), at what path difference is there complete destructive interference?',
      options: [
        { text: '0.25 m', correct: false },
        { text: '0.5 m', correct: true },
        { text: '1.0 m', correct: false },
        { text: '2.0 m', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  const handleVisualizationPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    setIsDragging(true);
  }, []);

  const handleVisualizationPointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleVisualizationPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 8 - 4; // -4 to 4 meters
    const y = ((e.clientY - rect.top) / rect.height) * 6; // 0 to 6 meters (inverted)
    setListenerX(Math.max(-3.5, Math.min(3.5, x)));
    setListenerY(Math.max(0.5, Math.min(5.5, 6 - y)));
  }, [isDragging]);

  // Generate interference intensity path for SVG
  const generateInterferencePath = (yPos: number, width: number, height: number) => {
    const points: string[] = [];
    const scale = 55;
    const centerX = width / 2;
    const speakerYPx = height - 70;
    const yMeters = (speakerYPx - yPos) / scale;

    for (let px = 0; px <= width; px += Math.max(1, Math.floor(width / 40))) {
      const xMeters = (px - centerX) / scale;
      const d1 = Math.sqrt((xMeters - speaker1X) ** 2 + yMeters ** 2);
      const d2 = Math.sqrt((xMeters - speaker2X) ** 2 + yMeters ** 2);
      const pd = Math.abs(d2 - d1);
      const interference = Math.cos(2 * Math.PI * pd / wavelength);
      const yVal = yPos + (1 - interference) * 120;
      points.push(`${px} ${yVal.toFixed(1)}`);
    }
    return `M ${points[0]} ${points.slice(1).map(p => `L ${p}`).join(' ')}`;
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 500;
    const height = 400;
    const scale = 55; // pixels per meter
    const centerX = width / 2;
    const speakerYPx = height - 70;

    // Generate interference pattern with premium gradients
    const patternElements = [];
    const resolution = 8;
    for (let px = 0; px < width; px += resolution) {
      for (let py = 50; py < height - 50; py += resolution) {
        const x = (px - centerX) / scale;
        const y = (speakerYPx - py) / scale;

        const d1 = Math.sqrt((x - speaker1X) ** 2 + y ** 2);
        const d2 = Math.sqrt((x - speaker2X) ** 2 + y ** 2);
        const pd = Math.abs(d2 - d1);
        const interference = Math.cos(2 * Math.PI * pd / wavelength);

        // Color based on interference with enhanced gradients
        let fillColor;
        if (interference > 0.3) {
          const intensity = (interference - 0.3) / 0.7;
          fillColor = `rgba(16, 185, 129, ${0.15 + intensity * 0.45})`; // Green for constructive
        } else if (interference < -0.3) {
          const intensity = (-interference - 0.3) / 0.7;
          fillColor = `rgba(239, 68, 68, ${0.15 + intensity * 0.45})`; // Red for destructive
        } else {
          fillColor = 'rgba(99, 102, 241, 0.08)'; // Purple for neutral
        }

        patternElements.push(
          <rect
            key={`${px}-${py}`}
            x={px}
            y={py}
            width={resolution}
            height={resolution}
            fill={fillColor}
          />
        );
      }
    }

    // Speaker positions in pixels
    const speaker1Px = centerX + speaker1X * scale;
    const speaker2Px = centerX + speaker2X * scale;

    // Listener position in pixels
    const listenerPxX = centerX + listenerX * scale;
    const listenerPxY = speakerYPx - listenerY * scale;

    // Premium animated wave circles with gradient effect
    const waveCircles = [];
    if (isAnimating) {
      const numWaves = 10;
      for (let i = 0; i < numWaves; i++) {
        const radius = ((animationTime + i * (2 * Math.PI / numWaves)) % (2 * Math.PI)) / (2 * Math.PI) * 220;
        const opacity = Math.pow(1 - radius / 220, 1.5);
        if (opacity > 0.05) {
          waveCircles.push(
            <circle
              key={`wave1-${i}`}
              cx={speaker1Px}
              cy={speakerYPx - 15}
              r={radius}
              fill="none"
              stroke="url(#sintfWaveGradient)"
              strokeWidth={2.5 - radius / 150}
              opacity={opacity * 0.7}
              filter="url(#sintfWaveGlow)"
            />,
            <circle
              key={`wave2-${i}`}
              cx={speaker2Px}
              cy={speakerYPx - 15}
              r={radius}
              fill="none"
              stroke="url(#sintfWaveGradient)"
              strokeWidth={2.5 - radius / 150}
              opacity={opacity * 0.7}
              filter="url(#sintfWaveGlow)"
            />
          );
        }
      }
    }

    // Generate interference path for visualization
    const interferencePath = generateInterferencePath(150, width, height);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', borderRadius: '16px', maxWidth: '550px', cursor: interactive ? 'crosshair' : 'default', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)', touchAction: 'none' }}
          onPointerDown={interactive ? handleVisualizationPointerDown : undefined}
          onPointerUp={interactive ? handleVisualizationPointerUp : undefined}
          onPointerMove={interactive ? handleVisualizationPointerMove : undefined}
          onPointerLeave={interactive ? handleVisualizationPointerUp : undefined}
        >
          {/* === PREMIUM DEFS SECTION === */}
          <defs>
            {/* Premium speaker housing gradient - metallic finish */}
            <linearGradient id="sintfSpeakerHousing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="20%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="80%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Speaker cone gradient - depth effect */}
            <radialGradient id="sintfSpeakerCone" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="40%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#020617" />
              <stop offset="100%" stopColor="#000000" />
            </radialGradient>

            {/* Speaker membrane vibration glow */}
            <radialGradient id="sintfMembraneGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#2563eb" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
            </radialGradient>

            {/* Sound wave gradient */}
            <linearGradient id="sintfWaveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
              <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#93c5fd" stopOpacity="1" />
              <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.3" />
            </linearGradient>

            {/* Constructive interference indicator gradient */}
            <radialGradient id="sintfConstructiveGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="1" />
              <stop offset="30%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#059669" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0" />
            </radialGradient>

            {/* Destructive interference indicator gradient */}
            <radialGradient id="sintfDestructiveGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f87171" stopOpacity="1" />
              <stop offset="30%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#dc2626" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
            </radialGradient>

            {/* Neutral interference gradient */}
            <radialGradient id="sintfNeutralGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="1" />
              <stop offset="30%" stopColor="#8b5cf6" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6d28d9" stopOpacity="0" />
            </radialGradient>

            {/* Listener marker gradient */}
            <radialGradient id="sintfListenerGlow" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* Floor/stage gradient */}
            <linearGradient id="sintfFloorGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="30%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#020617" />
              <stop offset="100%" stopColor="#000000" />
            </linearGradient>

            {/* Wave glow filter */}
            <filter id="sintfWaveGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Speaker glow filter */}
            <filter id="sintfSpeakerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Listener glow filter */}
            <filter id="sintfListenerGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Text glow filter */}
            <filter id="sintfTextGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Info box shadow filter */}
            <filter id="sintfBoxShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Premium background with subtle grid */}
          <g className="background-layer">
            <rect width={width} height={height} fill="url(#sintfFloorGradient)" rx="16" />

            {/* Subtle grid pattern */}
            {Array.from({ length: Math.floor(width / 50) + 1 }).map((_, i) => (
              <line key={`vgrid-${i}`} x1={i * 50} y1="0" x2={i * 50} y2={height} stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity={0.15} />
            ))}
            {Array.from({ length: Math.floor(height / 50) + 1 }).map((_, i) => (
              <line key={`hgrid-${i}`} x1="0" y1={i * 50} x2={width} y2={i * 50} stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity={0.15} />
            ))}
          </g>

          {/* Interference pattern */}
          <g className="interference-pattern-layer">
            {patternElements}
          </g>

          {/* Interference intensity path curve */}
          <g className="curve-layer">
            <path
              d={interferencePath}
              fill="none"
              stroke="#60a5fa"
              strokeWidth="1.5"
              opacity={0.5}
            />
          </g>

          {/* Animated waves */}
          {waveCircles}

          {/* Path lines from speakers to listener with gradient */}
          {interactive && (
            <>
              <line
                x1={speaker1Px}
                y1={speakerYPx - 15}
                x2={listenerPxX}
                y2={listenerPxY}
                stroke="#60a5fa"
                strokeWidth={2}
                strokeDasharray="8 4"
                opacity={0.6}
              />
              <line
                x1={speaker2Px}
                y1={speakerYPx - 15}
                x2={listenerPxX}
                y2={listenerPxY}
                stroke="#60a5fa"
                strokeWidth={2}
                strokeDasharray="8 4"
                opacity={0.6}
              />
              {/* Distance labels on path lines - positioned with absolute coords */}
              <text
                x={(speaker1Px + listenerPxX) / 2 - 15}
                y={(speakerYPx - 15 + listenerPxY) / 2}
                fill="#60a5fa"
                fontSize="11"
                fontWeight="bold"
                opacity={0.8}
              >
                d1
              </text>
              <text
                x={(speaker2Px + listenerPxX) / 2 + 8}
                y={(speakerYPx - 15 + listenerPxY) / 2 + 14}
                fill="#60a5fa"
                fontSize="11"
                fontWeight="bold"
                opacity={0.8}
              >
                d2
              </text>
            </>
          )}

          {/* === PREMIUM SPEAKER 1 === */}
          {/* Speaker 1 cabinet */}
          <rect x={speaker1Px - 22} y={speakerYPx - 35} width="44" height="50" rx="6" fill="url(#sintfSpeakerHousing)" stroke="#475569" strokeWidth="1" />
          <rect x={speaker1Px - 20} y={speakerYPx - 33} width="40" height="46" rx="5" fill="#0f172a" opacity="0.3" />
          {/* Speaker 1 cone */}
          <ellipse cx={speaker1Px} cy={speakerYPx - 15} rx="16" ry="14" fill="url(#sintfSpeakerCone)" stroke="#334155" strokeWidth="1" />
          <ellipse cx={speaker1Px} cy={speakerYPx - 15} rx="12" ry="10" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
          <ellipse cx={speaker1Px} cy={speakerYPx - 15} rx="6" ry="5" fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
          <circle cx={speaker1Px} cy={speakerYPx - 15} r="3" fill="#020617" />
          {isAnimating && (
            <ellipse cx={speaker1Px} cy={speakerYPx - 15} rx="14" ry="12" fill="url(#sintfMembraneGlow)" filter="url(#sintfSpeakerGlow)">
              <animate attributeName="rx" values="12;16;12" dur="0.15s" repeatCount="indefinite" />
              <animate attributeName="ry" values="10;14;10" dur="0.15s" repeatCount="indefinite" />
            </ellipse>
          )}
          <circle cx={speaker1Px + 14} cy={speakerYPx + 7} r="3" fill={isAnimating ? "#22c55e" : "#475569"}>
            {isAnimating && <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />}
          </circle>

          {/* Speaker 1 label */}
          <text x={speaker1Px} y={speakerYPx + 25} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600" filter="url(#sintfTextGlow)">Speaker 1</text>

          {/* === PREMIUM SPEAKER 2 === */}
          <rect x={speaker2Px - 22} y={speakerYPx - 35} width="44" height="50" rx="6" fill="url(#sintfSpeakerHousing)" stroke="#475569" strokeWidth="1" />
          <rect x={speaker2Px - 20} y={speakerYPx - 33} width="40" height="46" rx="5" fill="#0f172a" opacity="0.3" />
          <ellipse cx={speaker2Px} cy={speakerYPx - 15} rx="16" ry="14" fill="url(#sintfSpeakerCone)" stroke="#334155" strokeWidth="1" />
          <ellipse cx={speaker2Px} cy={speakerYPx - 15} rx="12" ry="10" fill="#1e293b" stroke="#475569" strokeWidth="0.5" />
          <ellipse cx={speaker2Px} cy={speakerYPx - 15} rx="6" ry="5" fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
          <circle cx={speaker2Px} cy={speakerYPx - 15} r="3" fill="#020617" />
          {isAnimating && (
            <ellipse cx={speaker2Px} cy={speakerYPx - 15} rx="14" ry="12" fill="url(#sintfMembraneGlow)" filter="url(#sintfSpeakerGlow)">
              <animate attributeName="rx" values="12;16;12" dur="0.15s" repeatCount="indefinite" />
              <animate attributeName="ry" values="10;14;10" dur="0.15s" repeatCount="indefinite" />
            </ellipse>
          )}
          <circle cx={speaker2Px + 14} cy={speakerYPx + 7} r="3" fill={isAnimating ? "#22c55e" : "#475569"}>
            {isAnimating && <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />}
          </circle>

          {/* Speaker 2 label */}
          <text x={speaker2Px} y={speakerYPx + 25} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600" filter="url(#sintfTextGlow)">Speaker 2</text>

          {/* Speaker separation indicator */}
          <line x1={speaker1Px} y1={speakerYPx + 35} x2={speaker2Px} y2={speakerYPx + 35} stroke="#64748b" strokeWidth="1" opacity={0.6} />
          <line x1={speaker1Px} y1={speakerYPx + 32} x2={speaker1Px} y2={speakerYPx + 38} stroke="#64748b" strokeWidth="1" opacity={0.6} />
          <line x1={speaker2Px} y1={speakerYPx + 32} x2={speaker2Px} y2={speakerYPx + 38} stroke="#64748b" strokeWidth="1" opacity={0.6} />
          <text x={centerX} y={speakerYPx + 48} textAnchor="middle" fill="#64748b" fontSize="11" opacity={0.6}>{speakerSeparation.toFixed(1)}m separation</text>

          {/* === LISTENER WITH INTERFERENCE INDICATOR === */}
          {interactive && (
            <>
              {/* Outer glow ring based on interference type */}
              <circle
                cx={listenerPxX}
                cy={listenerPxY}
                r={20}
                fill={isDestructive ? "url(#sintfDestructiveGlow)" : isConstructive ? "url(#sintfConstructiveGlow)" : "url(#sintfNeutralGlow)"}
                opacity={0.6}
              />

              {/* Listener marker - interactive circle that moves */}
              <circle
                cx={listenerPxX}
                cy={listenerPxY}
                r={14}
                fill={isDestructive ? "#ef4444" : isConstructive ? "#10b981" : "#8b5cf6"}
                stroke={colors.textPrimary}
                strokeWidth={2.5}
              />

              {/* Inner indicator */}
              <circle
                cx={listenerPxX}
                cy={listenerPxY}
                r={8}
                fill={isDestructive ? "#fca5a5" : isConstructive ? "#6ee7b7" : "#c4b5fd"}
                opacity={0.5}
              />

              {/* Symbol */}
              <text x={listenerPxX} y={listenerPxY + 5} textAnchor="middle" fill={colors.textPrimary} fontSize={14} fontWeight="bold">
                {isDestructive ? 'X' : isConstructive ? '+' : 'o'}
              </text>

              {/* Listener label */}
              <text x={listenerPxX} y={listenerPxY - 24} textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold">LISTENER</text>
            </>
          )}

          {/* === PREMIUM LEGEND - top-left === */}
          <rect x="12" y="12" width="130" height="75" rx="8" fill="rgba(15, 23, 42, 0.9)" stroke="#334155" strokeWidth="1" />
          <circle cx="26" cy="30" r="8" fill="url(#sintfConstructiveGlow)" />
          <text x="40" y="34" fill="#10b981" fontSize="11" fontWeight="600">Loud (constructive)</text>
          <circle cx="26" cy="52" r="8" fill="url(#sintfDestructiveGlow)" />
          <text x="40" y="56" fill="#ef4444" fontSize="11" fontWeight="600">Quiet (destructive)</text>
          <circle cx="26" cy="74" r="8" fill="url(#sintfNeutralGlow)" />
          <text x="40" y="78" fill="#8b5cf6" fontSize="11" fontWeight="600">Partial</text>

          {/* === PREMIUM INFO BOX - top-right, positioned to not overlap legend === */}
          {interactive && (
            <>
              <rect x={width - 155} y="100" width="143" height="90" rx="8" fill="rgba(15, 23, 42, 0.95)" stroke="#334155" strokeWidth="1" />
              <rect x={width - 155} y="100" width="143" height="22" rx="8" fill="rgba(59, 130, 246, 0.2)" />
              <rect x={width - 155} y="114" width="143" height="8" fill="rgba(59, 130, 246, 0.2)" />
              <text x={width - 155 + 72} y="115" textAnchor="middle" fill="#60a5fa" fontSize="11" fontWeight="700">PATH ANALYSIS</text>

              <text x={width - 143} y="140" fill="#94a3b8" fontSize="11">d1:</text>
              <text x={width - 120} y="140" fill="#f8fafc" fontSize="11" fontWeight="600">{distance1.toFixed(2)}m</text>

              <text x={width - 75} y="140" fill="#94a3b8" fontSize="11">d2:</text>
              <text x={width - 52} y="140" fill="#f8fafc" fontSize="11" fontWeight="600">{distance2.toFixed(2)}m</text>

              <line x1={width - 143} y1="150" x2={width - 24} y2="150" stroke="#334155" strokeWidth="1" />
              <text x={width - 143} y="165" fill="#94a3b8" fontSize="11">Diff:</text>
              <text x={width - 108} y="165" fill={isDestructive ? "#ef4444" : isConstructive ? "#10b981" : "#8b5cf6"} fontSize="12" fontWeight="700">{pathDifference.toFixed(3)}m</text>

              <text x={width - 143} y="182" fill="#64748b" fontSize="11">= {(pathDifference / wavelength).toFixed(2)} wavelengths</text>
            </>
          )}

          {/* === INTERFERENCE STATUS INDICATOR === */}
          {interactive && (
            <>
              <rect x={centerX - 80} y="95" width="160" height="28" rx="14" fill={isDestructive ? "rgba(239, 68, 68, 0.2)" : isConstructive ? "rgba(16, 185, 129, 0.2)" : "rgba(139, 92, 246, 0.2)"} stroke={isDestructive ? "#ef4444" : isConstructive ? "#10b981" : "#8b5cf6"} strokeWidth="1.5" />
              <text x={centerX} y="114" textAnchor="middle" fill={isDestructive ? "#f87171" : isConstructive ? "#34d399" : "#a78bfa"} fontSize="12" fontWeight="700">
                {isDestructive ? 'DESTRUCTIVE' : isConstructive ? 'CONSTRUCTIVE' : 'PARTIAL'}
              </text>
            </>
          )}

          {/* Wavelength indicator at bottom */}
          <text x={centerX} y={height - 8} textAnchor="middle" fill="#64748b" fontSize="11" opacity={0.7}>
            f={frequency}Hz | v=343m/s | lambda = v/f = {wavelength.toFixed(2)}m
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '14px 28px',
                minHeight: '44px',
                borderRadius: '12px',
                border: 'none',
                background: isAnimating
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: isAnimating
                  ? '0 4px 20px rgba(239, 68, 68, 0.4)'
                  : '0 4px 20px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.3s ease',
              }}
            >
              {isAnimating ? 'Stop Waves' : 'Show Waves'}
            </button>
            <button
              onClick={() => { setFrequency(340); setSpeakerSeparation(2); setListenerX(0); setListenerY(3); }}
              style={{
                padding: '14px 28px',
                minHeight: '44px',
                borderRadius: '12px',
                border: `2px solid ${colors.accent}`,
                background: 'rgba(139, 92, 246, 0.1)',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.3s ease',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const sliderStyle: React.CSSProperties = {
    height: '20px',
    width: '100%',
    touchAction: 'pan-y',
    accentColor: colors.accent,
    cursor: 'pointer',
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Frequency: {frequency} Hz (wavelength = {wavelength.toFixed(2)} m)
        </label>
        <input
          type="range"
          min="100"
          max="1000"
          step="10"
          value={frequency}
          onChange={(e) => setFrequency(parseInt(e.target.value))}
          onInput={(e) => setFrequency(parseInt((e.target as HTMLInputElement).value))}
          style={sliderStyle}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>100 Hz (Low)</span>
          <span>1000 Hz (High)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Speaker Separation: {speakerSeparation.toFixed(1)} m
        </label>
        <input
          type="range"
          min="0.5"
          max="4"
          step="0.1"
          value={speakerSeparation}
          onChange={(e) => setSpeakerSeparation(parseFloat(e.target.value))}
          onInput={(e) => setSpeakerSeparation(parseFloat((e.target as HTMLInputElement).value))}
          style={sliderStyle}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>0.5 m (Min)</span>
          <span>4 m (Max)</span>
        </div>
      </div>

      <div style={{
        display: 'flex', flexDirection: 'row', gap: '12px', flexWrap: 'wrap',
      }}>
        <div style={{
          flex: 1, minWidth: '140px',
          background: isDestructive ? 'rgba(239, 68, 68, 0.2)' : isConstructive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.2)',
          padding: '12px',
          borderRadius: '8px',
          borderLeft: `3px solid ${isDestructive ? colors.destructive : isConstructive ? colors.constructive : colors.accent}`,
        }}>
          <div style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
            Current: {isDestructive ? 'DEAD SPOT' : isConstructive ? 'LOUD' : 'Partial'}
          </div>
          <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
            Path difference: {pathDifference.toFixed(3)} m = {(pathDifference / wavelength).toFixed(2)} wavelengths
          </div>
          <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
            {isDestructive
              ? 'Waves arrive out of phase and cancel!'
              : isConstructive
              ? 'Waves arrive in phase and add!'
              : 'Waves partially cancel'}
          </div>
        </div>

        <div style={{
          flex: 1, minWidth: '140px',
          background: colors.bgCard,
          padding: '12px',
          borderRadius: '8px',
          borderLeft: `3px solid ${colors.speaker}`,
        }}>
          <div style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
            Reference baseline
          </div>
          <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
            Formula: lambda = v / f = {speedOfSound} / {frequency} = {wavelength.toFixed(2)} m
          </div>
          <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
            Destructive at delta d = (n+1/2) x lambda
          </div>
        </div>
      </div>

      <div style={{
        background: colors.bgCard,
        padding: '12px',
        borderRadius: '8px',
      }}>
        <div style={{ color: colors.textMuted, fontSize: '12px' }}>
          Drag the listener (circle) around the room to explore the interference pattern!
        </div>
      </div>
    </div>
  );

  const phaseLabels = ['Hook', 'Predict', 'Play', 'Review', 'Twist Predict', 'Twist Play', 'Twist Review', 'Transfer', 'Test', 'Mastery'];

  const renderNavDots = () => {
    const currentIdx = VALID_PHASES.indexOf(currentPhase);
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '8px 16px' }}>
        {VALID_PHASES.map((p, i) => (
          <button
            key={p}
            aria-label={phaseLabels[i]}
            title={phaseLabels[i]}
            onClick={() => setInternalPhase(p)}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              border: 'none',
              background: i === currentIdx ? colors.accent : i < currentIdx ? colors.success : 'rgba(255,255,255,0.2)',
              cursor: 'pointer',
              padding: 0,
              transition: 'all 0.2s ease',
            }}
          />
        ))}
      </div>
    );
  };

  const renderNavBar = (showBack: boolean, canProceed: boolean, buttonText: string, disabled?: boolean) => (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: '68px',
          left: 0,
          right: 0,
          zIndex: 1002,
        }}
      >
        {renderNavDots()}
      </div>
      <nav
        aria-label="Game navigation"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 24px',
          background: colors.bgDark,
          borderTop: `1px solid rgba(255,255,255,0.1)`,
          display: 'flex',
          justifyContent: currentPhase !== 'hook' ? 'space-between' : 'flex-end',
          alignItems: 'center',
          zIndex: 1001,
        }}
      >
        {currentPhase !== 'hook' && (
          <button
            onClick={() => {
              const idx = VALID_PHASES.indexOf(currentPhase);
              if (idx > 0) setInternalPhase(VALID_PHASES[idx - 1]);
            }}
            aria-label="Go back"
            style={{
              padding: '12px 24px',
              minHeight: '44px',
              borderRadius: '8px',
              border: `1px solid ${colors.textMuted}`,
              background: 'transparent',
              color: colors.textSecondary,
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'all 0.3s ease',
            }}
          >
            Back
          </button>
        )}
        <button
          onClick={advancePhase}
          disabled={disabled && !canProceed}
          aria-label={buttonText}
          style={{
            padding: '12px 32px',
            minHeight: '44px',
            borderRadius: '8px',
            border: 'none',
            background: canProceed ? `linear-gradient(135deg, ${colors.accent} 0%, #7c3aed 100%)` : 'rgba(255,255,255,0.1)',
            color: canProceed ? 'white' : colors.textMuted,
            fontWeight: 'bold',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            transition: 'all 0.3s ease',
            boxShadow: canProceed ? '0 4px 15px rgba(139, 92, 246, 0.4)' : 'none',
          }}
        >
          {buttonText}
        </button>
      </nav>
    </>
  );

  // Review phase visualization - a simple SVG diagram of interference concept
  const renderReviewDiagram = () => (
    <svg width="100%" height="160" viewBox="0 0 400 160" style={{ maxWidth: '450px', margin: '0 auto', display: 'block' }}>
      <defs>
        <linearGradient id="sintfReviewGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      <rect width="400" height="160" rx="8" fill="#0f172a" />
      {/* Constructive wave */}
      <path d="M 20 40 L 40 25 L 60 40 L 80 55 L 100 40 L 120 25 L 140 40 L 160 55 L 180 40 L 200 25 L 220 40 L 240 55 L 260 40 L 280 25 L 300 40 L 320 55 L 340 40 L 360 25 L 380 40" fill="none" stroke="#10b981" strokeWidth="2" />
      {/* Destructive wave */}
      <path d="M 20 120 L 40 105 L 60 120 L 80 135 L 100 120 L 120 135 L 140 120 L 160 105 L 180 120 L 200 135 L 220 120 L 240 105 L 260 120 L 280 135 L 300 120 L 320 105 L 340 120 L 360 135 L 380 120" fill="none" stroke="#ef4444" strokeWidth="2" />
      <text x="200" y="18" textAnchor="middle" fill="#10b981" fontSize="12" fontWeight="bold">Constructive (in phase)</text>
      <text x="200" y="80" textAnchor="middle" fill="#94a3b8" fontSize="11">delta d = n x lambda</text>
      <text x="200" y="98" textAnchor="middle" fill="#94a3b8" fontSize="11">delta d = (n+1/2) x lambda</text>
      <text x="200" y="152" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">Destructive (out of phase)</text>
    </svg>
  );

  // HOOK PHASE
  if (currentPhase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Sound Dead Spots
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px', fontWeight: 400 }}>
              Can two loud speakers make silence in certain spots? Let's discover how waves work!
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Imagine standing between two speakers playing the same pure tone.
                Walk sideways and the sound gets loud, quiet, loud, quiet...
                There are spots where two loud speakers create silence!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is sound wave interference - and it reveals something profound about waves.
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Drag the listener around the room to find the dead spots (red zones)!
              </p>
            </div>
          </div>
        </div>
        {renderNavBar(false, true, 'Start Exploring')}
      </div>
    );
  }

  // PREDICT PHASE
  if (currentPhase === 'predict') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A top-down view of a room with two speakers at the bottom, both playing the same
              frequency tone. The colored pattern shows where sound is loud (green) and quiet (red).
              The stripes are interference patterns created by the overlapping sound waves.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px', maxWidth: '600px', margin: '0 auto' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What do you predict will happen as you walk sideways between two speakers?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderNavBar(true, !!prediction, 'Continue')}
      </div>
    );
  }

  // PLAY PHASE
  if (currentPhase === 'play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>Explore Sound Interference</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
              Drag the listener and adjust controls to find dead spots.
              This concept is important because it is used in real-world applications like noise-canceling headphones, concert hall design, and phased array radar technology.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '8px', fontWeight: 400 }}>
              Observe how when you increase frequency, the wavelength decreases and the interference stripes get closer together.
              The formula lambda = v / f = 343 / f gives the relationship between frequency and wavelength.
            </p>
          </div>

          {/* Side-by-side layout: SVG left, controls right */}


          <div style={{


            display: 'flex',


            flexDirection: isMobile ? 'column' : 'row',


            gap: isMobile ? '12px' : '20px',


            width: '100%',


            alignItems: isMobile ? 'center' : 'flex-start',


          }}>


            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


              {renderVisualization(true)}


            </div>


            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


              {renderControls()}


            </div>


          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Move directly between the speakers - notice it's always loud on the center line</li>
              <li>Move sideways and count the loud/quiet bands</li>
              <li>Change frequency and watch the stripe spacing change</li>
              <li>Increase speaker separation and observe more stripes appear</li>
            </ul>
          </div>
        </div>
        {renderNavBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (currentPhase === 'review') {
    const wasCorrect = prediction === 'dead_spots';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? '✅ Correct!' : '❌ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              {wasCorrect
                ? 'Your prediction was correct! As you observed in the experiment, some spots are silent (dead spots) while others are extra loud.'
                : 'Your prediction was not quite right. As you observed in the experiment, some spots are silent (dead spots) while others are extra loud.'}
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '8px' }}>
              This demonstrates the principle of wave interference, because sound waves from two sources can either reinforce or cancel each other depending on the path difference.
            </p>
          </div>

          {renderReviewDiagram()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Sound Interference</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Path Difference:</strong> Sound from each speaker
                travels a different distance to reach you. The path difference determines whether waves
                add up or cancel out.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Constructive (Loud):</strong> When path difference = 0, 1, 2, 3...
                wavelengths, waves arrive "in phase" and add together. Sound is louder!
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Destructive (Quiet):</strong> When path difference = 0.5, 1.5, 2.5...
                wavelengths, waves arrive "out of phase" and cancel. Dead spot!
              </p>
              <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                padding: '12px',
                borderRadius: '8px',
                marginTop: '12px',
                fontFamily: 'monospace',
              }}>
                <div>Constructive: delta d = n x lambda (n = 0, 1, 2...)</div>
                <div>Destructive: delta d = (n + 1/2) x lambda</div>
                <div>lambda = v / f = {speedOfSound} / f</div>
              </div>
            </div>
          </div>
        </div>
        {renderNavBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (currentPhase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What do you predict will happen when you change the frequency?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              You've found a dead spot at a certain frequency. Now the sound engineer
              changes the frequency to a higher pitch. The speakers stay in the same positions.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px', maxWidth: '600px', margin: '0 auto' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              When frequency increases, what happens to the dead spots?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderNavBar(true, !!twistPrediction, 'Continue')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (currentPhase === 'twist_play') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Frequency Changes</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Change the frequency and watch the interference pattern shift.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '8px' }}>
              Observe how higher frequencies create more closely-spaced interference stripes.
            </p>
          </div>

          {/* Side-by-side layout: SVG left, controls right */}


          <div style={{


            display: 'flex',


            flexDirection: isMobile ? 'column' : 'row',


            gap: isMobile ? '12px' : '20px',


            width: '100%',


            alignItems: isMobile ? 'center' : 'flex-start',


          }}>


            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


              {renderVisualization(true)}


            </div>


            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


              {renderControls()}


            </div>


          </div>

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Higher frequency means shorter wavelength. Shorter wavelength means the path
              difference needed for destructive interference is smaller - so the stripes
              get closer together!
            </p>
          </div>
        </div>
        {renderNavBar(false, true, 'Continue')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (currentPhase === 'twist_review') {
    const wasCorrect = twistPrediction === 'move';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              The dead spots move - their spacing changes with frequency!
            </p>
          </div>

          {renderReviewDiagram()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why Frequency Changes the Pattern</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Wavelength and Frequency:</strong> Higher frequency
                means shorter wavelength (lambda = v/f). Since destructive interference occurs at half-wavelength
                path differences, shorter wavelengths mean the dead spots are closer together.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Practical Implication:</strong> At concerts, bass
                notes (low frequency, long wavelength) have widely-spaced interference zones, while treble notes
                (high frequency, short wavelength) have tightly-packed zones. This is why bass feels more "even"
                across a room!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>The Formula:</strong> Stripe spacing is proportional
                to wavelength divided by speaker separation. Double the frequency, halve the stripe spacing!
              </p>
            </div>
          </div>
        </div>
        {renderNavBar(false, true, 'Continue')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (currentPhase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Sound Interference"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (currentPhase === 'transfer') {
    const allAppsCompleted = transferCompleted.size >= realWorldApps.length;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Wave interference appears in acoustics, electronics, and communication
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              App {Math.min(transferCompleted.size + 1, realWorldApps.length)} of {realWorldApps.length} ({transferCompleted.size} of {realWorldApps.length} done)
            </p>
          </div>

          {realWorldApps.map((app, index) => (
            <div
              key={index}
              style={{
                background: colors.bgCard,
                margin: '16px',
                padding: '16px',
                borderRadius: '12px',
                border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
                maxWidth: '600px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>
                  <span style={{ marginRight: '8px' }}>{app.icon}</span>
                  {app.title}
                </h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>✅ Done</span>}
              </div>
              <p style={{ color: colors.textMuted, fontSize: '13px', fontStyle: 'italic', marginBottom: '8px' }}>{app.tagline}</p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>

              {/* Stats row with numeric data */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {app.stats.map((stat, si) => (
                  <div key={si} style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '8px 12px', borderRadius: '8px', flex: '1', minWidth: '100px', textAlign: 'center' }}>
                    <div style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: '14px' }}>{stat.icon} {stat.value}</div>
                    <div style={{ color: colors.textMuted, fontSize: '11px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {!transferCompleted.has(index) ? (
                <div>
                  <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                    <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>How does it connect?</p>
                    <p style={{ color: colors.textSecondary, fontSize: '13px' }}>{app.connection}</p>
                  </div>
                  <button
                    onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                    style={{ padding: '8px 16px', minHeight: '44px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s ease' }}
                  >
                    Reveal Details
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '8px' }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>How It Works:</p>
                    <p style={{ color: colors.textSecondary, fontSize: '13px' }}>{app.howItWorks}</p>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <p style={{ color: colors.textMuted, fontSize: '12px' }}>
                      <strong>Companies:</strong> {app.companies.join(', ')}
                    </p>
                    <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
                      <strong>Examples:</strong> {app.examples.join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={() => {}}
                    style={{ padding: '8px 16px', minHeight: '44px', borderRadius: '6px', border: 'none', background: `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`, color: 'white', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s ease' }}
                  >
                    Got It
                  </button>
                </div>
              )}
            </div>
          ))}

          {allAppsCompleted && (
            <div style={{ padding: '16px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
              <button
                onClick={advancePhase}
                style={{
                  padding: '14px 32px',
                  minHeight: '44px',
                  borderRadius: '12px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${colors.accent} 0%, #7c3aed 100%)`,
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '16px',
                  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
                }}
              >
                Take the Test
              </button>
            </div>
          )}
        </div>
        {renderNavBar(true, allAppsCompleted, allAppsCompleted ? 'Continue \u2192' : 'Continue')}
      </div>
    );
  }

  // TEST PHASE
  if (currentPhase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
              maxWidth: '600px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>You scored {testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered sound interference!' : 'Review the material and try again.'}
              </p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`, maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderNavBar(false, testScore >= 8, testScore >= 8 ? 'Continue' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
            </div>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '12px' }}>
              Test your understanding of sound wave interference, path differences, wavelength relationships,
              and real-world applications of constructive and destructive interference patterns.
              Select the best answer for each question below.
            </p>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', minHeight: '44px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px', transition: 'all 0.2s ease' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', minHeight: '44px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', minHeight: '44px', borderRadius: '8px', border: 'none', background: `linear-gradient(135deg, ${colors.accent} 0%, #7c3aed 100%)`, color: 'white', cursor: 'pointer', transition: 'all 0.2s ease' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', minHeight: '44px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease' }}>Submit Test</button>
            )}
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (currentPhase === 'mastery') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered sound wave interference</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Path difference determines interference type</li>
              <li>Constructive: waves in phase, path diff = n wavelengths</li>
              <li>Destructive: waves out of phase, path diff = (n+1/2) wavelengths</li>
              <li>Wavelength = speed / frequency</li>
              <li>Higher frequency = shorter wavelength = tighter stripe pattern</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              The same physics applies to light! Young's double-slit experiment demonstrated that light
              behaves as a wave by showing interference patterns. Modern applications include
              holography, interferometric measurement, noise cancellation, and phased array systems
              in radar, sonar, and 5G antennas.
            </p>
          </div>
          {renderVisualization(true)}
        </div>
        {renderNavBar(false, true, 'Complete Game')}
      </div>
    );
  }

  // Fallback - should never reach here since we validate phase above, but just in case
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '48px', paddingBottom: '100px' }}>
        <div style={{ padding: '24px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
            Sound Dead Spots
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
            Explore how sound waves interfere!
          </p>
        </div>
      </div>
    </div>
  );
};

export default SoundInterferenceRenderer;
