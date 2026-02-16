import React, { useState, useEffect, useCallback, useRef } from 'react';

const realWorldApps = [
  {
    icon: '🎭',
    title: 'Concert Hall Acoustics',
    short: 'Architects design room shapes and materials for optimal reverberation time',
    tagline: 'Engineering the perfect listening experience',
    description: 'Concert halls are precision-engineered acoustic instruments. The reverberation time (RT60) - how long sound takes to decay 60 dB - determines whether music sounds intimate or grand. Symphony halls target 1.8-2.2 seconds, while opera houses need 1.2-1.5 seconds for vocal clarity. Every surface material and angle is calculated.',
    connection: 'This game teaches exactly how room volume, surface areas, and absorption coefficients determine RT60 - the core calculation acoustic architects use.',
    howItWorks: 'Sound bounces between surfaces, losing energy at each reflection based on material absorption. The Sabine equation (RT60 = 0.161*V/A) relates room volume to total absorption. Reflective surfaces (wood, plaster) extend reverb; absorptive materials (carpet, curtains) shorten it.',
    stats: [
      { value: '1.8-2.2s', label: 'Ideal symphony RT60', icon: '🎵' },
      { value: '$500M+', label: 'Major concert hall cost', icon: '💰' },
      { value: '2000+', label: 'Seats in major venues', icon: '🎫' }
    ],
    examples: ['Vienna Musikverein', 'Boston Symphony Hall', 'Berlin Philharmonie', 'Walt Disney Concert Hall'],
    companies: ['Arup Acoustics', 'Kirkegaard Associates', 'Nagata Acoustics', 'Jaffe Holden'],
    futureImpact: 'Variable acoustics systems with motorized panels and active sound enhancement will let single halls adapt to different performance types.',
    color: '#8B5CF6'
  },
  {
    icon: '🎤',
    title: 'Recording Studio Design',
    short: 'Studios minimize reverberation for clean recordings that can be processed later',
    tagline: 'Capturing sound in its purest form',
    description: 'Recording studios aim for the opposite of concert halls - minimal reverberation (RT60 under 0.3 seconds) so engineers have complete control over the sound. Highly absorptive treatments cover walls, bass traps fill corners, and diffusers break up remaining reflections. Clean recordings allow reverb to be added digitally during mixing.',
    connection: 'The room acoustics simulated in this game show why recording studios need extensive acoustic treatment to achieve near-zero reverberation.',
    howItWorks: 'Studios use broadband absorption (fiberglass, rockwool) to kill mid/high frequencies and specialized bass traps for low frequencies that are hardest to absorb. Floating floors and isolated walls prevent external noise. Control rooms often use reflection-free zones around the mixing position.',
    stats: [
      { value: '<0.3s', label: 'Target studio RT60', icon: '🎙️' },
      { value: '0.7-0.9', label: 'Absorption coefficients', icon: '📊' },
      { value: '$100K+', label: 'Professional treatment cost', icon: '🏗️' }
    ],
    examples: ['Abbey Road Studios', 'Electric Lady Studios', 'Capitol Records', 'Sunset Sound'],
    companies: ['Primacoustic', 'Auralex', 'GIK Acoustics', 'RealTraps'],
    futureImpact: 'AI denoising and dereverberation algorithms may reduce physical treatment needs, but premium studios will continue prioritizing acoustic perfection.',
    color: '#10B981'
  },
  {
    icon: '🏛️',
    title: 'Worship Space Acoustics',
    short: 'Churches and temples balance speech clarity with musical resonance',
    tagline: 'Sacred spaces that inspire through sound',
    description: 'Religious spaces face a unique challenge: long reverberation enhances organ music and choral singing, but obscures spoken sermons. Historic cathedrals with 5+ second RT60 sound majestic but require slow, deliberate speech. Modern worship spaces often use electronic speech reinforcement while preserving natural reverb for music.',
    connection: 'This game demonstrates how room volume and absorption create vastly different RT60 values - explaining why cathedrals sound so different from modern churches.',
    howItWorks: 'Large stone cathedrals have massive volume and minimal absorption, yielding RT60 of 4-8 seconds. Modern worship spaces use adjustable absorption (fabric banners, curtains) to balance music and speech. Sound systems with directional speakers deliver clear speech while allowing natural room reverb for music.',
    stats: [
      { value: '4-8s', label: 'Cathedral RT60', icon: '⛪' },
      { value: '1.0-1.5s', label: 'Modern worship target', icon: '🕌' },
      { value: 'Millions', label: 'Active worship spaces globally', icon: '🌍' }
    ],
    examples: ['Notre-Dame Paris', 'St. Peter Basilica', 'Crystal Cathedral', 'Sagrada Familia'],
    companies: ['Bose Professional', 'Meyer Sound', 'QSC', 'L-Acoustics'],
    futureImpact: 'Beam-steering loudspeaker arrays will deliver personalized audio zones, solving the speech-vs-music tradeoff without physical changes.',
    color: '#F59E0B'
  },
  {
    icon: '🎮',
    title: 'Video Game Audio',
    short: 'Real-time reverb algorithms simulate virtual acoustic environments',
    tagline: 'Immersive worlds through sound',
    description: 'Modern video games simulate reverberation in real-time based on virtual room geometry. Walking from a tight corridor into a vast cave, players hear reverb change instantly. This acoustic feedback is crucial for immersion and spatial awareness. Ray-traced audio is emerging alongside ray-traced graphics.',
    connection: 'The reverb physics in this game - how room size and materials affect sound decay - is exactly what game audio engines simulate in real-time.',
    howItWorks: 'Game engines calculate early reflections based on nearby virtual surfaces and late reverb from room volume/absorption estimates. Impulse response convolution or algorithmic reverb creates the effect. Modern GPUs can trace audio rays for physically accurate room simulation.',
    stats: [
      { value: '10-50ms', label: 'Audio latency budget', icon: '⏱️' },
      { value: '$180B', label: 'Global games market', icon: '🎮' },
      { value: '3B+', label: 'Global gamers', icon: '👥' }
    ],
    examples: ['Battlefield series', 'The Last of Us', 'Half-Life: Alyx', 'Forza Horizon'],
    companies: ['Dolby', 'Audiokinetic (Wwise)', 'FMOD', 'Steam Audio'],
    futureImpact: 'Full ray-traced spatial audio will create perfectly accurate virtual acoustics, making games and VR experiences indistinguishable from reality.',
    color: '#3B82F6'
  }
];

// --- GAME EVENT INTERFACE FOR AI COACH INTEGRATION ---
export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
             'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
             'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
             'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected' |
             'coach_prompt' | 'guide_paused' | 'guide_resumed';
  gameType: string;
  gameTitle: string;
  details: {
     currentScreen?: number;
     totalScreens?: number;
     phase?: string;
     phaseLabel?: string;
     prediction?: string;
     answer?: string;
     isCorrect?: boolean;
     score?: number;
     maxScore?: number;
     message?: string;
     coachMessage?: string;
     needsHelp?: boolean;
     [key: string]: any;
  };
  timestamp: number;
}

interface ReverberationRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
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
  soundWave: '#3b82f6',
  absorbed: '#10b981',
  reflected: '#ef4444',
  wall: '#64748b',
};

interface SoundRay {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  energy: number;
  bounces: number;
  trail: { x: number; y: number }[];
}

interface RoomConfig {
  name: string;
  width: number;
  height: number;
  volume: number;
  surfaces: {
    name: string;
    area: number;
    absorption: number;
    color: string;
  }[];
  description: string;
}

const roomTypes: Record<string, RoomConfig> = {
  bathroom: {
    name: 'Bathroom',
    width: 300,
    height: 200,
    volume: 15,
    surfaces: [
      { name: 'Tile Walls', area: 30, absorption: 0.01, color: '#94a3b8' },
      { name: 'Tile Floor', area: 6, absorption: 0.01, color: '#64748b' },
      { name: 'Glass/Mirror', area: 4, absorption: 0.02, color: '#a5b4fc' },
      { name: 'Ceiling', area: 6, absorption: 0.02, color: '#cbd5e1' },
    ],
    description: 'Hard, reflective surfaces everywhere',
  },
  bedroom: {
    name: 'Bedroom',
    width: 300,
    height: 200,
    volume: 40,
    surfaces: [
      { name: 'Drywall', area: 40, absorption: 0.05, color: '#e2e8f0' },
      { name: 'Carpet', area: 15, absorption: 0.30, color: '#7c3aed' },
      { name: 'Bed/Furniture', area: 8, absorption: 0.40, color: '#c084fc' },
      { name: 'Curtains', area: 6, absorption: 0.50, color: '#a78bfa' },
    ],
    description: 'Soft furnishings absorb sound',
  },
  concertHall: {
    name: 'Concert Hall',
    width: 350,
    height: 220,
    volume: 15000,
    surfaces: [
      { name: 'Wood Panels', area: 800, absorption: 0.10, color: '#d97706' },
      { name: 'Audience', area: 400, absorption: 0.80, color: '#f59e0b' },
      { name: 'Ceiling', area: 600, absorption: 0.05, color: '#fbbf24' },
      { name: 'Stage', area: 200, absorption: 0.15, color: '#b45309' },
    ],
    description: 'Designed for optimal RT60 of 1.5-2.5s',
  },
  studio: {
    name: 'Recording Studio',
    width: 300,
    height: 180,
    volume: 80,
    surfaces: [
      { name: 'Acoustic Foam', area: 30, absorption: 0.70, color: '#1e293b' },
      { name: 'Bass Traps', area: 8, absorption: 0.90, color: '#334155' },
      { name: 'Diffusers', area: 10, absorption: 0.40, color: '#475569' },
      { name: 'Carpet', area: 12, absorption: 0.30, color: '#4b5563' },
    ],
    description: 'Heavily treated for minimal reverb',
  },
};

const ReverberationRenderer: React.FC<ReverberationRendererProps> = ({
  onGameEvent,
  gamePhase,
}) => {
  type ReverbPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: ReverbPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): ReverbPhase => {
    if (gamePhase && validPhases.includes(gamePhase as ReverbPhase)) {
      return gamePhase as ReverbPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<ReverbPhase>(getInitialPhase);

  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as ReverbPhase) && gamePhase !== phase) {
      setPhase(gamePhase as ReverbPhase);
    }
  }, [gamePhase, phase]);

  // Simulation state
  const [selectedRoom, setSelectedRoom] = useState<string>('bathroom');
  const [rays, setRays] = useState<SoundRay[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [energyHistory, setEnergyHistory] = useState<number[]>([100]);
  const [hasFurnishings, setHasFurnishings] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const animationRef = useRef<number | null>(null);

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
  // Navigation
  const phaseOrder: ReverbPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<ReverbPhase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Add Materials',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  const emitGameEvent = useCallback((
    eventType: GameEvent['eventType'],
    details: GameEvent['details']
  ) => {
    if (onGameEvent) {
      onGameEvent({
        eventType,
        gameType: 'reverberation',
        gameTitle: 'Reverberation',
        details,
        timestamp: Date.now()
      });
    }
  }, [onGameEvent]);

  const goToPhase = useCallback((p: ReverbPhase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    isNavigating.current = true;
    lastClickRef.current = now;

    setPhase(p);

    const currentIndex = phaseOrder.indexOf(phase);
    const targetIndex = phaseOrder.indexOf(p);

    emitGameEvent('phase_changed', {
      currentScreen: targetIndex + 1,
      totalScreens: phaseOrder.length,
      phase: p,
      phaseLabel: phaseLabels[p],
      direction: targetIndex > currentIndex ? 'forward' : 'backward'
    });

    setTimeout(() => {
      isNavigating.current = false;
    }, 300);
  }, [phase, emitGameEvent]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);


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

  const room = roomTypes[selectedRoom];

  // Calculate RT60 using Sabine equation
  const calculateRT60 = useCallback((roomKey: string, withFurnishings: boolean = false) => {
    const r = roomTypes[roomKey];
    let totalAbsorption = r.surfaces.reduce((sum, s) => sum + s.area * s.absorption, 0);

    if (withFurnishings && (roomKey === 'bathroom' || roomKey === 'concertHall')) {
      // Adding blankets/pillows increases absorption significantly
      totalAbsorption += 5 * 0.5; // 5 m^2 of soft materials with 0.5 absorption
    }

    // Sabine equation: RT60 = 0.161 * V / A
    const rt60 = (0.161 * r.volume) / totalAbsorption;
    return Math.min(rt60, 10); // Cap at 10 seconds for display
  }, []);

  // Initialize rays
  const initializeRays = useCallback(() => {
    const newRays: SoundRay[] = [];
    const centerX = room.width / 2;
    const centerY = room.height / 2;

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 3;
      newRays.push({
        id: i,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        energy: 100,
        bounces: 0,
        trail: [{ x: centerX, y: centerY }],
      });
    }
    return newRays;
  }, [room]);

  // Get effective absorption for current room
  const getEffectiveAbsorption = useCallback(() => {
    let avgAbsorption = room.surfaces.reduce((sum, s) => sum + s.absorption, 0) / room.surfaces.length;
    if (hasFurnishings && (selectedRoom === 'bathroom' || selectedRoom === 'concertHall')) {
      avgAbsorption += 0.15;
    }
    return Math.min(avgAbsorption, 0.95);
  }, [room, hasFurnishings, selectedRoom]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const absorption = getEffectiveAbsorption();

    const animate = () => {
      setRays(prevRays => {
        const newRays = prevRays.map(ray => {
          if (ray.energy < 1) return ray;

          let newX = ray.x + ray.vx;
          let newY = ray.y + ray.vy;
          let newVx = ray.vx;
          let newVy = ray.vy;
          let newEnergy = ray.energy;
          let newBounces = ray.bounces;

          // Wall collisions
          const padding = 20;
          if (newX < padding || newX > room.width - padding) {
            newVx = -newVx;
            newEnergy *= (1 - absorption);
            newBounces++;
            newX = Math.max(padding, Math.min(room.width - padding, newX));
          }
          if (newY < padding || newY > room.height - padding) {
            newVy = -newVy;
            newEnergy *= (1 - absorption);
            newBounces++;
            newY = Math.max(padding, Math.min(room.height - padding, newY));
          }

          const newTrail = [...ray.trail, { x: newX, y: newY }].slice(-30);

          return {
            ...ray,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
            energy: newEnergy,
            bounces: newBounces,
            trail: newTrail,
          };
        });

        return newRays;
      });

      setTime(prev => prev + 0.05);
      setEnergyHistory(prev => {
        const avgEnergy = rays.reduce((sum, r) => sum + r.energy, 0) / Math.max(rays.length, 1);
        const newHistory = [...prev, avgEnergy].slice(-100);
        return newHistory;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, room, rays, getEffectiveAbsorption]);

  const startSimulation = () => {
    setRays(initializeRays());
    setTime(0);
    setEnergyHistory([100]);
    setIsPlaying(true);
  };

  const stopSimulation = () => {
    setIsPlaying(false);
  };

  const resetSimulation = () => {
    setIsPlaying(false);
    setRays([]);
    setTime(0);
    setEnergyHistory([100]);
  };

  const predictions = [
    { id: 'bathroom', label: 'The bathroom rings longer (more echo)' },
    { id: 'bedroom', label: 'The bedroom rings longer (more echo)' },
    { id: 'same', label: 'They sound exactly the same' },
    { id: 'neither', label: 'Neither room has any reverb' },
  ];

  const twistPredictions = [
    { id: 'increase', label: 'Reverb time increases (more echo)' },
    { id: 'decrease', label: 'Reverb time decreases (less echo)' },
    { id: 'same', label: 'Reverb time stays the same' },
    { id: 'frequency', label: 'Only high frequencies are affected' },
  ];

  const transferApplications = [
    {
      title: 'Concert Hall Design',
      description: 'Concert halls are carefully designed with RT60 of 1.5-2.5 seconds for orchestral music. Variable acoustics (curtains, panels) allow adjustment for different performances.',
      question: 'Why do concert halls need longer reverb than recording studios?',
      answer: 'Live music benefits from natural blending and "warmth" that reverb provides. It helps instruments blend together and creates the sense of a large, enveloping space. Studios need dry sound for post-processing control.',
    },
    {
      title: 'Recording Studios',
      description: 'Professional studios aim for RT60 under 0.3 seconds using acoustic foam, bass traps, and diffusers. This allows clean recording with reverb added digitally later.',
      question: 'Why do studios use both absorption AND diffusion?',
      answer: 'Pure absorption can make rooms sound "dead" and unnatural. Diffusers scatter sound without absorbing it, maintaining some ambience while preventing distinct echoes and flutter.',
    },
    {
      title: 'Speech Intelligibility',
      description: 'Classrooms and lecture halls need RT60 of 0.4-0.6 seconds. Too much reverb causes words to overlap and blur; too little sounds unnatural and straining.',
      question: 'Why is reverb control critical for hearing-impaired listeners?',
      answer: 'Hearing aids amplify all sound including reverb. Excessive reverb makes speech muddy and hard to distinguish. Optimal acoustics dramatically improve comprehension for all listeners.',
    },
    {
      title: 'Home Theater',
      description: 'Home theaters balance immersion with clarity, targeting RT60 of 0.3-0.5 seconds. Strategic placement of absorbers and diffusers creates cinema-like experience.',
      question: 'How do room dimensions affect home theater acoustics?',
      answer: 'Parallel walls create flutter echoes; non-parallel surfaces or treatment prevent this. Room modes (standing waves) at specific frequencies cause bass problems. Treatment placement must address both reverb and modes.',
    },
  ];

  const testQuestions = [
    {
      question: 'What does RT60 measure?',
      options: [
        { text: 'Time for sound to drop 60 decibels', correct: true },
        { text: 'Time for sound to travel 60 meters', correct: false },
        { text: 'Frequency response at 60 Hz', correct: false },
        { text: 'Sound pressure level at 60 feet', correct: false },
      ],
    },
    {
      question: 'According to the Sabine equation, reverb time increases when:',
      options: [
        { text: 'Room volume increases', correct: true },
        { text: 'Absorption increases', correct: false },
        { text: 'Temperature increases', correct: false },
        { text: 'Sound frequency increases', correct: false },
      ],
    },
    {
      question: 'Why does a bathroom have longer reverb than a bedroom?',
      options: [
        { text: 'Bathrooms are smaller', correct: false },
        { text: 'Hard tile surfaces reflect rather than absorb', correct: true },
        { text: 'Water vapor increases echo', correct: false },
        { text: 'Bedrooms have more windows', correct: false },
      ],
    },
    {
      question: 'The absorption coefficient ranges from:',
      options: [
        { text: '0 (perfect reflector) to 1 (perfect absorber)', correct: true },
        { text: '-1 to +1', correct: false },
        { text: '1 to 100', correct: false },
        { text: '0 to 60 dB', correct: false },
      ],
    },
    {
      question: 'Adding soft furnishings to a room will:',
      options: [
        { text: 'Increase reverb time', correct: false },
        { text: 'Decrease reverb time', correct: true },
        { text: 'Not affect reverb time', correct: false },
        { text: 'Only affect high frequencies', correct: false },
      ],
    },
    {
      question: 'For speech intelligibility, the ideal RT60 is approximately:',
      options: [
        { text: '0.0 seconds (anechoic)', correct: false },
        { text: '0.4-0.6 seconds', correct: true },
        { text: '2.0-3.0 seconds', correct: false },
        { text: '5.0+ seconds', correct: false },
      ],
    },
    {
      question: 'Concert halls are designed with longer RT60 because:',
      options: [
        { text: 'Musicians prefer echo for timing', correct: false },
        { text: 'Reverb helps blend instruments and creates warmth', correct: true },
        { text: 'Building codes require it', correct: false },
        { text: 'Sound travels slower in large spaces', correct: false },
      ],
    },
    {
      question: 'Recording studios use acoustic treatment to:',
      options: [
        { text: 'Make the room louder', correct: false },
        { text: 'Reduce reverb for clean, controllable recordings', correct: true },
        { text: 'Increase bass response', correct: false },
        { text: 'Block outside noise only', correct: false },
      ],
    },
    {
      question: 'The Sabine equation is: RT60 = 0.161 x V / A. What is A?',
      options: [
        { text: 'Room area in square meters', correct: false },
        { text: 'Total absorption (sum of surface area times absorption coefficient)', correct: true },
        { text: 'Air absorption coefficient', correct: false },
        { text: 'Amplitude of sound wave', correct: false },
      ],
    },
    {
      question: 'Why do empty rooms sound "echoey"?',
      options: [
        { text: 'Empty rooms are colder', correct: false },
        { text: 'Without furniture to absorb sound, more energy reflects', correct: true },
        { text: 'Air molecules echo more without obstacles', correct: false },
        { text: 'The ear perceives emptiness as echo', correct: false },
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

  const renderRoomVisualization = (interactive: boolean) => {
    const width = room.width;
    const height = room.height;
    const rt60 = calculateRT60(selectedRoom, hasFurnishings);
    const svgHeight = height + 120; // Extra space for RT60 indicator and decay graph

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg
          width="100%"
          height={svgHeight}
          viewBox={`0 0 ${width} ${svgHeight}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #020617 50%, #0f172a 100%)', borderRadius: '12px', maxWidth: '450px' }}
        >
          <defs>
            {/* Premium room wall gradient - creates depth effect */}
            <linearGradient id="reverbWallGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="25%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="75%" stopColor="#334155" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Floor gradient - simulates reflective surface */}
            <linearGradient id="reverbFloorGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="30%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#020617" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Ceiling gradient with subtle lighting */}
            <linearGradient id="reverbCeilingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="40%" stopColor="#475569" />
              <stop offset="80%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Sound source radial glow */}
            <radialGradient id="reverbSoundSourceGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="1" />
              <stop offset="30%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#2563eb" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
            </radialGradient>

            {/* Sound wave propagation gradient */}
            <radialGradient id="reverbWavePropagation" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#0891b2" stopOpacity="0.3" />
              <stop offset="70%" stopColor="#0e7490" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#155e75" stopOpacity="0" />
            </radialGradient>

            {/* High energy ray gradient */}
            <radialGradient id="reverbRayHighEnergy" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#d97706" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
            </radialGradient>

            {/* Low energy ray gradient (absorbed) */}
            <radialGradient id="reverbRayLowEnergy" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0" />
            </radialGradient>

            {/* RT60 indicator gradient */}
            <linearGradient id="reverbRT60Gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="25%" stopColor="#a78bfa" />
              <stop offset="50%" stopColor="#c4b5fd" />
              <stop offset="75%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>

            {/* Decay graph background gradient */}
            <linearGradient id="reverbDecayBgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#0f172a" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#020617" stopOpacity="1" />
            </linearGradient>

            {/* Energy curve glow gradient */}
            <linearGradient id="reverbEnergyCurveGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>

            {/* Soft furnishing gradient */}
            <linearGradient id="reverbFurnishingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c4b5fd" />
              <stop offset="30%" stopColor="#a78bfa" />
              <stop offset="70%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>

            {/* Sound source glow filter */}
            <filter id="reverbSourceGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Ray trail glow filter */}
            <filter id="reverbRayGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Wave propagation glow filter */}
            <filter id="reverbWaveGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* RT60 indicator glow filter */}
            <filter id="reverbRT60Glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Energy curve glow filter */}
            <filter id="reverbCurveGlow" x="-10%" y="-50%" width="120%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background gradient overlay */}
          <rect width={width} height={svgHeight} fill="url(#reverbDecayBgGradient)" opacity="0.3" />

          {/* Subtle grid pattern for depth */}
          <pattern id="reverbGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.2" />
          </pattern>
          <rect x={15} y={15} width={width - 30} height={height - 30} fill="url(#reverbGrid)" />

          {/* Room outline with premium gradient walls */}
          <rect
            x={15}
            y={15}
            width={width - 30}
            height={height - 30}
            fill="url(#reverbFloorGradient)"
            stroke="url(#reverbWallGradient)"
            strokeWidth={4}
            rx={3}
          />

          {/* Wall surface indicators with depth */}
          {/* Left wall */}
          <rect
            x={15}
            y={15}
            width={8}
            height={height - 30}
            fill={room.surfaces[0]?.color || '#94a3b8'}
            opacity={0.7}
          />
          {/* Right wall */}
          <rect
            x={width - 23}
            y={15}
            width={8}
            height={height - 30}
            fill={room.surfaces[1]?.color || '#64748b'}
            opacity={0.7}
          />
          {/* Ceiling */}
          <rect
            x={15}
            y={15}
            width={width - 30}
            height={8}
            fill="url(#reverbCeilingGradient)"
            opacity={0.8}
          />
          {/* Floor */}
          <rect
            x={15}
            y={height - 23}
            width={width - 30}
            height={8}
            fill={room.surfaces[3]?.color || '#475569'}
            opacity={0.7}
          />

          {/* Surface material labels */}
          {room.surfaces.slice(0, 4).map((surface, i) => {
            const labelPositions = [
              { x: 28, y: height / 2, rotate: -90 },
              { x: width - 28, y: height / 2, rotate: 90 },
              { x: width / 2, y: 28, rotate: 0 },
              { x: width / 2, y: height - 28, rotate: 0 },
            ];
            const pos = labelPositions[i];
            return (
              <g key={i} transform={`translate(${pos.x}, ${pos.y}) rotate(${pos.rotate})`}>
                <text
                  textAnchor="middle"
                  fill={colors.textMuted}
                  fontSize={7}
                  fontWeight="bold"
                >
                  {surface.name}
                </text>
                <text
                  y={10}
                  textAnchor="middle"
                  fill={surface.absorption > 0.3 ? colors.success : colors.error}
                  fontSize={6}
                >
                  {(surface.absorption * 100).toFixed(0)}% abs
                </text>
              </g>
            );
          })}

          {/* Sound wave propagation circles - animated concentric rings */}
          {isPlaying && (
            <g filter="url(#reverbWaveGlow)">
              {[1, 2, 3, 4, 5].map((ring) => (
                <circle
                  key={ring}
                  cx={width / 2}
                  cy={height / 2 - 20}
                  r={20 + ring * 18}
                  fill="none"
                  stroke="url(#reverbWavePropagation)"
                  strokeWidth={1.5}
                  opacity={0.6 - ring * 0.1}
                >
                  <animate
                    attributeName="r"
                    from={20 + ring * 18}
                    to={20 + ring * 18 + 60}
                    dur="2s"
                    repeatCount="indefinite"
                    begin={`${ring * 0.3}s`}
                  />
                  <animate
                    attributeName="opacity"
                    from={0.6 - ring * 0.1}
                    to="0"
                    dur="2s"
                    repeatCount="indefinite"
                    begin={`${ring * 0.3}s`}
                  />
                </circle>
              ))}
            </g>
          )}

          {/* Furnishings if enabled - premium styling */}
          {hasFurnishings && (selectedRoom === 'bathroom' || selectedRoom === 'concertHall') && (
            <g>
              {/* Soft furnishing with gradient and shadow */}
              <rect
                x={width / 2 - 35}
                y={height / 2 + 5}
                width={70}
                height={45}
                fill="url(#reverbFurnishingGradient)"
                rx={8}
                filter="url(#reverbRayGlow)"
              />
              {/* Texture lines on furnishing */}
              {[0, 1, 2].map((line) => (
                <line
                  key={line}
                  x1={width / 2 - 25}
                  y1={height / 2 + 15 + line * 12}
                  x2={width / 2 + 25}
                  y2={height / 2 + 15 + line * 12}
                  stroke="#e9d5ff"
                  strokeWidth={1}
                  strokeOpacity={0.3}
                />
              ))}
              <text
                x={width / 2}
                y={height / 2 + 32}
                fill={colors.textPrimary}
                fontSize={9}
                textAnchor="middle"
                fontWeight="bold"
              >
                Soft Absorbers
              </text>
            </g>
          )}

          {/* Premium sound source with glow effect */}
          <g filter="url(#reverbSourceGlow)">
            <circle
              cx={width / 2}
              cy={height / 2 - 20}
              r={12}
              fill="url(#reverbSoundSourceGlow)"
            />
            <circle
              cx={width / 2}
              cy={height / 2 - 20}
              r={6}
              fill="#93c5fd"
            >
              {isPlaying && (
                <animate
                  attributeName="r"
                  values="6;8;6"
                  dur="0.3s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
          </g>
          <text
            x={width / 2}
            y={height / 2 - 40}
            fill={colors.textSecondary}
            fontSize={10}
            textAnchor="middle"
            fontWeight="bold"
          >
            Sound Source
          </text>

          {/* Sound rays with premium glow effects */}
          {rays.map(ray => (
            <g key={ray.id} filter="url(#reverbRayGlow)">
              {/* Trail with gradient-like opacity */}
              {ray.trail.length > 1 && (
                <polyline
                  points={ray.trail.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={ray.energy > 50 ? '#fbbf24' : '#34d399'}
                  strokeWidth={2.5}
                  opacity={ray.energy / 100 * 0.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {/* Ray head with radial glow */}
              <circle
                cx={ray.x}
                cy={ray.y}
                r={5}
                fill={ray.energy > 50 ? 'url(#reverbRayHighEnergy)' : 'url(#reverbRayLowEnergy)'}
                opacity={Math.max(ray.energy / 100, 0.3)}
              />
              {/* Inner bright core */}
              <circle
                cx={ray.x}
                cy={ray.y}
                r={2}
                fill={ray.energy > 50 ? '#fef3c7' : '#d1fae5'}
                opacity={Math.max(ray.energy / 100, 0.4)}
              />
            </g>
          ))}

          {/* RT60 Decay Indicator Section */}
          <g transform={`translate(0, ${height + 5})`}>
            {/* Section background */}
            <rect
              x={15}
              y={0}
              width={width - 30}
              height={110}
              fill="url(#reverbDecayBgGradient)"
              rx={6}
              stroke="#334155"
              strokeWidth={1}
            />

            {/* RT60 Value Display */}
            <g transform={`translate(${width / 2}, 25)`}>
              <rect
                x={-60}
                y={-18}
                width={120}
                height={36}
                fill="rgba(139, 92, 246, 0.15)"
                stroke="url(#reverbRT60Gradient)"
                strokeWidth={2}
                rx={8}
                filter="url(#reverbRT60Glow)"
              />
              <text
                textAnchor="middle"
                y={-4}
                fill={colors.textMuted}
                fontSize={8}
                fontWeight="bold"
              >
                RT60 (Reverb Time)
              </text>
              <text
                textAnchor="middle"
                y={12}
                fill="#c4b5fd"
                fontSize={16}
                fontWeight="bold"
              >
                {rt60.toFixed(2)}s
              </text>
            </g>

            {/* Energy decay graph area */}
            <rect
              x={25}
              y={45}
              width={width - 50}
              height={55}
              fill="rgba(0,0,0,0.4)"
              rx={4}
              stroke="#475569"
              strokeWidth={0.5}
            />

            {/* Graph labels */}
            <text x={30} y={55} fill={colors.textMuted} fontSize={7} fontWeight="bold">
              Energy Decay
            </text>
            <text x={width - 35} y={55} fill={colors.textMuted} fontSize={6} textAnchor="end">
              100%
            </text>
            <text x={width - 35} y={95} fill={colors.textMuted} fontSize={6} textAnchor="end">
              0%
            </text>

            {/* 60dB threshold line (RT60 measurement point) */}
            <line
              x1={25}
              y1={45 + 55 - (0.001) * 50}
              x2={width - 25}
              y2={45 + 55 - (0.001) * 50}
              stroke={colors.warning}
              strokeWidth={1.5}
              strokeDasharray="4,3"
              opacity={0.8}
            />
            <rect
              x={width - 65}
              y={45 + 55 - (0.001) * 50 - 8}
              width={35}
              height={12}
              fill="rgba(245, 158, 11, 0.2)"
              rx={3}
            />
            <text
              x={width - 48}
              y={45 + 55 - (0.001) * 50 + 1}
              fill={colors.warning}
              fontSize={7}
              textAnchor="middle"
              fontWeight="bold"
            >
              -60dB
            </text>

            {/* Energy decay curve with glow */}
            {energyHistory.length > 1 && (
              <g filter="url(#reverbCurveGlow)">
                <polyline
                  points={energyHistory.map((e, i) =>
                    `${25 + (i / 100) * (width - 50)},${45 + 55 - (e / 100) * 50}`
                  ).join(' ')}
                  fill="none"
                  stroke="url(#reverbEnergyCurveGlow)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            )}

            {/* Time axis markers */}
            <text x={25} y={108} fill={colors.textMuted} fontSize={6}>
              0s
            </text>
            <text x={width / 2} y={108} fill={colors.textMuted} fontSize={6} textAnchor="middle">
              Time
            </text>
            <text x={width - 25} y={108} fill={colors.textMuted} fontSize={6} textAnchor="end">
              {(time * 0.1).toFixed(1)}s
            </text>
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={isPlaying ? stopSimulation : startSimulation}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isPlaying
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: isPlaying
                  ? '0 4px 15px rgba(239, 68, 68, 0.3)'
                  : '0 4px 15px rgba(16, 185, 129, 0.3)',
              }}
            >
              {isPlaying ? 'Stop' : 'Play Sound'}
            </button>
            <button
              onClick={resetSimulation}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `2px solid ${colors.accent}`,
                background: 'rgba(139, 92, 246, 0.1)',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderRoomSelector = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <label style={{ color: colors.textSecondary, fontSize: '14px' }}>
        Select Room Type:
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {Object.entries(roomTypes).map(([key, r]) => (
          <button
            key={key}
            onClick={() => {
              setSelectedRoom(key);
              resetSimulation();
            }}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: selectedRoom === key ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
              background: selectedRoom === key ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              color: colors.textPrimary,
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* Surface absorption display */}
      <div style={{
        background: colors.bgCard,
        padding: '12px',
        borderRadius: '8px',
        marginTop: '8px',
      }}>
        <h4 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: '14px' }}>
          Surface Materials:
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {room.surfaces.map((surface, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                background: surface.color,
              }} />
              <span style={{ color: colors.textSecondary, fontSize: '12px', flex: 1 }}>
                {surface.name}
              </span>
              <span style={{
                color: surface.absorption > 0.3 ? colors.success : colors.error,
                fontSize: '11px',
                fontWeight: 'bold',
              }}>
                {(surface.absorption * 100).toFixed(0)}% abs
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNavigationDots = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', padding: '12px 0' }}>
        {phaseOrder.map((p, index) => (
          <button
            key={p}
            onClick={() => goToPhase(p)}
            aria-label={phaseLabels[p]}
            title={phaseLabels[p]}
            style={{
              width: index === currentIndex ? '20px' : '10px',
              height: '10px',
              borderRadius: '5px',
              border: 'none',
              background: index === currentIndex ? colors.accent : index < currentIndex ? 'rgba(139, 92, 246, 0.5)' : 'rgba(255,255,255,0.2)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>
    );
  };

  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const progress = ((currentIndex + 1) / phaseOrder.length) * 100;
    return (
      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: colors.accent, transition: 'width 0.3s ease' }} />
      </div>
    );
  };

  const canProceed = () => {
    if (phase === 'predict') return prediction !== null;
    if (phase === 'twist_predict') return twistPrediction !== null;
    if (phase === 'transfer') return transferCompleted.size >= 4;
    if (phase === 'test') return testSubmitted && testScore >= 8;
    return true;
  };

  const renderBottomBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoNext = canProceed();
    const canGoBack = currentIndex > 0;
    const isLastPhase = currentIndex === phaseOrder.length - 1;

    return (
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgDark,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        zIndex: 1000,
      }}>
        {renderProgressBar()}
        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={goBack}
            disabled={!canGoBack}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: `2px solid ${canGoBack ? colors.accent : 'rgba(255,255,255,0.1)'}`,
              background: 'transparent',
              color: canGoBack ? colors.accent : colors.textMuted,
              fontWeight: 'bold',
              cursor: canGoBack ? 'pointer' : 'not-allowed',
              fontSize: '16px',
              opacity: canGoBack ? 1 : 0.5,
            }}
          >
            Back
          </button>

          {renderNavigationDots()}

          <button
            onClick={goNext}
            disabled={!canGoNext || isLastPhase}
            style={{
              padding: '12px 32px',
              borderRadius: '8px',
              border: 'none',
              background: canGoNext && !isLastPhase ? colors.accent : 'rgba(255,255,255,0.1)',
              color: canGoNext && !isLastPhase ? 'white' : colors.textMuted,
              fontWeight: 'bold',
              cursor: canGoNext && !isLastPhase ? 'pointer' : 'not-allowed',
              fontSize: '16px',
            }}
          >
            {isLastPhase ? 'Complete' : 'Next'}
          </button>
        </div>
      </nav>
    );
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Why Rooms Sound Different
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Which room "rings" longer: bathroom or bedroom?
            </p>
          </div>

          {renderRoomVisualization(true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Clap your hands in a bathroom, then in a carpeted bedroom.
                One space has a noticeable "ring" that lingers - the other
                sounds almost "dead". What causes this dramatic difference?
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is reverberation - and understanding it is key to acoustic design.
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Click "Play Sound" to visualize how sound energy bounces and decays!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderRoomVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A cross-section of a room with a sound source in the center.
              Sound rays travel outward and bounce off walls. The graph below
              shows how sound energy decays over time. RT60 is the time for
              sound to drop by 60 decibels (to 1/1,000,000th of original).
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Which room will have the LONGER reverberation time?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Reverberation</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare how different rooms affect sound decay
            </p>
          </div>

          {renderRoomVisualization(true)}
          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <label style={{ color: colors.textSecondary, fontSize: '14px', display: 'block', marginBottom: '8px' }}>
              Simulation Speed: {simulationSpeed.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={simulationSpeed}
              onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
              style={{
                width: '100%',
                accentColor: colors.accent,
              }}
            />
          </div>

          {renderRoomSelector()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Compare bathroom (tile) vs bedroom (carpet)</li>
              <li>Notice how concert halls balance reverb</li>
              <li>See how studio treatment kills reverb</li>
              <li>Watch the energy decay curve change</li>
            </ul>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'bathroom';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              The bathroom rings longer because hard tile surfaces reflect sound instead of absorbing it!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Reverberation</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>RT60 - Reverberation Time:</strong> The time
                for sound to decay by 60 dB (to one millionth of its original intensity). This is the
                standard measure of how "live" or "dead" a room sounds.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Sabine Equation:</strong> RT60 = 0.161 x V / A
                where V is room volume and A is total absorption. More absorption = shorter reverb.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Absorption Coefficient:</strong> Ranges from
                0 (perfect reflector, like tile) to 1 (perfect absorber, like acoustic foam). Soft
                materials absorb; hard materials reflect.
              </p>
            </div>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.soundWave}`,
          }}>
            <h4 style={{ color: colors.soundWave, marginBottom: '8px' }}>Typical RT60 Values:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6, paddingLeft: '20px', margin: 0 }}>
              <li>Recording studio: 0.2-0.4 seconds</li>
              <li>Living room: 0.4-0.6 seconds</li>
              <li>Classroom: 0.6-0.8 seconds</li>
              <li>Concert hall: 1.5-2.5 seconds</li>
              <li>Cathedral: 4-8 seconds</li>
            </ul>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if you add blankets and pillows to the bathroom?
            </p>
          </div>

          {renderRoomVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Imagine placing a stack of thick blankets and pillows in the bathroom.
              These soft materials have high absorption coefficients (around 0.5).
              The tile walls remain the same.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What happens to the bathroom's reverb time when you add soft furnishings?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Adding Soft Furnishings</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Toggle furnishings and observe the RT60 change
            </p>
          </div>

          {renderRoomVisualization(true)}

          <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => {
                setHasFurnishings(!hasFurnishings);
                resetSimulation();
              }}
              style={{
                padding: '14px 28px',
                borderRadius: '8px',
                border: hasFurnishings ? `2px solid ${colors.success}` : `2px solid ${colors.warning}`,
                background: hasFurnishings ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              {hasFurnishings ? 'Remove Blankets/Pillows' : 'Add Blankets/Pillows'}
            </button>
          </div>

          {renderRoomSelector()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Watch how RT60 drops when you add soft materials. Even a small amount of
              absorption can significantly reduce reverb time. This is why hotels put
              carpet and curtains in echoey spaces!
            </p>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'decrease';
    const rt60Without = calculateRT60('bathroom', false);
    const rt60With = calculateRT60('bathroom', true);

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Adding soft furnishings decreases reverb time by increasing total absorption!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Math Behind It</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Sabine Equation:</strong> RT60 = 0.161 x V / A
              </p>
              <p style={{ marginBottom: '12px' }}>
                Adding blankets increases A (total absorption) without changing V (volume).
                Since A is in the denominator, increasing it decreases RT60.
              </p>
              <div style={{
                background: 'rgba(139, 92, 246, 0.2)',
                padding: '12px',
                borderRadius: '8px',
                marginTop: '12px',
              }}>
                <p style={{ color: colors.textPrimary, marginBottom: '4px' }}>
                  Bathroom without blankets: RT60 = {rt60Without.toFixed(2)}s
                </p>
                <p style={{ color: colors.success }}>
                  Bathroom with blankets: RT60 = {rt60With.toFixed(2)}s
                </p>
                <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '8px' }}>
                  Reduction: {((1 - rt60With/rt60Without) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Real-World Application:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              This is exactly how acoustic treatment works! Recording studios use foam panels,
              bass traps, and diffusers to control reverb. Even hanging thick curtains or
              adding a rug can noticeably improve room acoustics.
            </p>
          </div>
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Reverberation control in architecture and audio engineering
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test
            </p>
          </div>

          {transferApplications.map((app, index) => (
            <div
              key={index}
              style={{
                background: colors.bgCard,
                margin: '16px',
                padding: '16px',
                borderRadius: '12px',
                border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Done</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered reverberation!' : 'Review the material and try again.'}
              </p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar()}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: 'rgba(139, 92, 246, 0.15)', margin: '0 16px 16px 16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.accent}` }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
                Test your understanding of reverberation physics. Answer all 10 questions to demonstrate mastery.
                You need 8 correct answers to pass. Take your time and think carefully about each question.
              </p>
            </div>

            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered reverberation and room acoustics</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>RT60 measures reverb decay time (60 dB drop)</li>
              <li>Sabine equation: RT60 = 0.161 x V / A</li>
              <li>Absorption coefficients of different materials</li>
              <li>How soft furnishings reduce reverb</li>
              <li>Optimal RT60 for different spaces</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Real acoustic design considers frequency-dependent absorption (bass traps for low frequencies),
              early reflections vs late reverb, diffusion vs absorption, and room modes. Modern concert halls
              use computer modeling and adjustable acoustic elements for precise control. The Sabine equation
              is just the beginning - Eyring and other equations handle high-absorption rooms better!
            </p>
          </div>
          {renderRoomVisualization(true)}
        </div>
        {renderBottomBar()}
      </div>
    );
  }

  return null;
};

export default ReverberationRenderer;
