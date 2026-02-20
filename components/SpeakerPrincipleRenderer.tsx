'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// -----------------------------------------------------------------------------
// Speaker Principle - Complete 10-Phase Game
// The Lorentz force: How speakers convert electrical signals to sound
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

interface SpeakerPrincipleRendererProps {
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
    scenario: "You're building a DIY Bluetooth speaker for a school project. When you connect your phone and play music, you can see the speaker cone moving back and forth.",
    question: "What fundamental principle causes the speaker cone to move when an audio signal is sent to it?",
    options: [
      { id: 'a', label: "The electrical signal heats the voice coil, causing thermal expansion and contraction" },
      { id: 'b', label: "The Lorentz force acts on the current-carrying voice coil in the magnetic field, pushing it back and forth", correct: true },
      { id: 'c', label: "The audio signal creates pressure waves that directly push the cone" },
      { id: 'd', label: "Static electricity builds up and discharges, creating mechanical vibrations" }
    ],
    explanation: "Speakers work via the Lorentz force (F = BIL). When alternating current flows through the voice coil sitting in a permanent magnet's field, the force on the coil alternates direction, causing it to vibrate and produce sound waves."
  },
  {
    scenario: "A sound engineer notices that when she increases the volume on the mixing board, the bass speaker cones move with larger excursions. She's curious about the physics involved.",
    question: "How does increasing the audio signal amplitude affect the voice coil and magnet interaction?",
    options: [
      { id: 'a', label: "It strengthens the permanent magnet's field" },
      { id: 'b', label: "It increases the current through the voice coil, resulting in greater Lorentz force and larger cone displacement", correct: true },
      { id: 'c', label: "It changes the frequency of the magnetic field oscillation" },
      { id: 'd', label: "It reduces the electrical resistance of the voice coil wire" }
    ],
    explanation: "The Lorentz force F = BIL is directly proportional to current (I). When you turn up the volume, you increase the current amplitude flowing through the voice coil, which increases the force and causes the cone to move further in each direction."
  },
  {
    scenario: "An audiophile is comparing two speaker cones: one made of paper and one made of Kevlar composite. Both are the same size but the Kevlar cone is significantly lighter.",
    question: "What advantage does a lighter cone material provide for sound reproduction?",
    options: [
      { id: 'a', label: "Lighter cones produce louder bass frequencies due to reduced air resistance" },
      { id: 'b', label: "Lighter cones can accelerate and decelerate faster, improving transient response and high-frequency reproduction", correct: true },
      { id: 'c', label: "Lighter cones require less magnetic field strength from the permanent magnet" },
      { id: 'd', label: "Lighter cones are more resistant to thermal damage from high power levels" }
    ],
    explanation: "Newton's second law (F = ma) tells us that for the same force, a lighter mass accelerates faster. A lighter cone can start and stop moving more quickly, accurately reproducing fast transients and higher frequencies where rapid direction changes are required."
  },
  {
    scenario: "You're setting up a 3-way home theater speaker system that has a woofer, midrange driver, and tweeter. The crossover network inside routes different frequencies to each driver.",
    question: "Why is a crossover network essential in a multi-driver speaker system?",
    options: [
      { id: 'a', label: "To amplify the audio signal before it reaches each driver" },
      { id: 'b', label: "To convert the AC audio signal to DC for more efficient power transfer" },
      { id: 'c', label: "To direct appropriate frequency ranges to drivers optimized for those frequencies, preventing damage and improving sound quality", correct: true },
      { id: 'd', label: "To synchronize the phase of all drivers so they produce sound simultaneously" }
    ],
    explanation: "Each driver is designed for a specific frequency range. Crossovers use capacitors and inductors to filter frequencies, sending bass to woofers (which can handle large excursions) and treble to tweeters (which are light enough to vibrate rapidly). This prevents damage and optimizes performance."
  },
  {
    scenario: "A guitarist is shopping for a new amplifier and notices that some speaker cabinets are rated at 4 ohms while others are rated at 8 ohms. The amplifier manual warns about mismatched impedance.",
    question: "What happens if you connect an 8-ohm rated amplifier to a 4-ohm speaker cabinet?",
    options: [
      { id: 'a', label: "The speaker will play at half volume due to impedance mismatch" },
      { id: 'b', label: "The amplifier may overheat and potentially fail because it must deliver twice the current to the lower impedance load", correct: true },
      { id: 'c', label: "The sound quality improves because lower impedance means better frequency response" },
      { id: 'd', label: "Nothing changes because modern amplifiers automatically adjust to any impedance" }
    ],
    explanation: "With a lower impedance load, Ohm's law (I = V/R) means more current flows for the same voltage. This forces the amplifier to work harder, generating excess heat. If the amp isn't designed for 4-ohm loads, it can overheat, trigger protection circuits, or suffer permanent damage."
  },
  {
    scenario: "A speaker designer is using Thiele-Small parameters to model a new subwoofer. She's particularly interested in the Qts value, which is 0.38 for her driver.",
    question: "What does a Thiele-Small Qts value of 0.38 tell the designer about enclosure requirements?",
    options: [
      { id: 'a', label: "The driver requires no enclosure and works best as an open-baffle design" },
      { id: 'b', label: "The driver is well-suited for a sealed enclosure, providing tight, accurate bass response", correct: true },
      { id: 'c', label: "The driver can only be used in a bandpass enclosure with dual chambers" },
      { id: 'd', label: "The driver has too much damping and will produce weak bass regardless of enclosure" }
    ],
    explanation: "Qts describes the total damping of a driver. Values between 0.3-0.5 indicate good damping, ideal for sealed enclosures that provide additional air-spring damping. Higher Qts values (0.5-0.7) often work better in ported enclosures. This parameter is crucial for matching drivers to enclosure designs."
  },
  {
    scenario: "An audio engineer is designing a ported subwoofer enclosure. She calculates that the port tuning frequency should be 35 Hz to match the driver's parameters.",
    question: "What is the primary purpose of the port (bass reflex tube) in this enclosure design?",
    options: [
      { id: 'a', label: "To allow air to escape and prevent pressure buildup that could damage the cone" },
      { id: 'b', label: "To reinforce bass output at and around the tuning frequency by using the rear radiation of the cone", correct: true },
      { id: 'c', label: "To cool the voice coil by allowing airflow through the enclosure" },
      { id: 'd', label: "To reduce the weight of the enclosure for easier transportation" }
    ],
    explanation: "The port creates a Helmholtz resonator that uses the normally wasted rear wave of the cone. At the tuning frequency, the port output reinforces the front radiation, boosting bass. Below tuning, output rolls off rapidly, so port tuning frequency selection is critical for extended bass response."
  },
  {
    scenario: "A recording studio is considering electrostatic speakers for their mastering suite. These speakers use a thin diaphragm between two charged metal grids instead of a traditional voice coil and magnet.",
    question: "What is the main advantage of electrostatic speakers over traditional dynamic speakers?",
    options: [
      { id: 'a', label: "They produce significantly more bass due to the larger diaphragm surface area" },
      { id: 'b', label: "They offer exceptionally low distortion and fast transient response because the entire ultra-light diaphragm is driven uniformly", correct: true },
      { id: 'c', label: "They are more efficient and require less amplifier power than dynamic speakers" },
      { id: 'd', label: "They work without any electrical power, making them ideal for portable use" }
    ],
    explanation: "Electrostatic speakers drive an extremely thin, lightweight diaphragm uniformly across its entire surface using electrostatic force. This eliminates the cone breakup and inertia issues of traditional speakers, resulting in remarkably low distortion and excellent transient response, though they typically need dedicated amplifiers."
  },
  {
    scenario: "A home theater enthusiast is matching a new power amplifier to his floor-standing speakers. The speakers are rated for 200 watts RMS, and he's deciding between a 100-watt and a 300-watt amplifier.",
    question: "Which amplifier choice is generally safer and why?",
    options: [
      { id: 'a', label: "The 100-watt amplifier, because it cannot send enough power to damage the speakers" },
      { id: 'b', label: "The 300-watt amplifier, because it has headroom to deliver clean power without clipping, which can damage speakers", correct: true },
      { id: 'c', label: "Either amplifier is equally safe because speaker ratings are just guidelines" },
      { id: 'd', label: "Neither is safe; you must exactly match amplifier and speaker wattage ratings" }
    ],
    explanation: "An underpowered amplifier driven to clipping produces distorted waveforms rich in harmonics that can overheat tweeters. A higher-powered amplifier with headroom delivers clean, undistorted signal at normal listening levels. The key is responsible volume control, not exact wattage matching."
  },
  {
    scenario: "A sound system installer notices that when two identical subwoofers are placed facing each other 10 feet apart, the bass seems weak in the middle of the room. Moving one subwoofer fixes the problem.",
    question: "What acoustic phenomenon caused the weak bass in the middle of the room?",
    options: [
      { id: 'a', label: "The subwoofers were too far apart, causing the sound to dissipate before reaching the center" },
      { id: 'b', label: "Phase cancellation occurred where the opposing sound waves met out of phase, destructively interfering", correct: true },
      { id: 'c', label: "The room's acoustics absorbed all the bass energy at that specific location" },
      { id: 'd', label: "The subwoofers' magnetic fields interfered with each other, reducing output" }
    ],
    explanation: "When speakers face each other, their sound waves can arrive at the midpoint out of phase (one pushing while the other pulls). This causes destructive interference where the waves cancel out, creating a null zone. Proper subwoofer placement considers phase relationships to avoid cancellation."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🔊',
    title: 'Audio Speaker Design',
    short: 'Converting electrical signals to sound waves',
    tagline: 'The voice of electronics',
    description: 'Every speaker from phone earbuds to stadium concert systems uses the Lorentz force. A voice coil in a magnetic field moves in response to electrical current, pushing air to create sound waves.',
    connection: 'This simulation demonstrates F = BIL - the force on the voice coil depends on magnetic field strength, current, and wire length. Speaker designers optimize all three to maximize efficiency and sound quality.',
    howItWorks: 'The voice coil is wound copper wire sitting in a gap between permanent magnets. Alternating current creates alternating force, moving the coil and attached cone. Suspension springs return the cone to center.',
    stats: [
      { value: '$35B', label: 'Global speaker market', icon: '💰' },
      { value: '200W', label: 'Typical home speaker power', icon: '⚡' },
      { value: '99%', label: 'Of audio devices use this tech', icon: '📊' }
    ],
    examples: ['Smartphone speakers', 'Studio monitors', 'PA systems', 'Automotive audio'],
    companies: ['JBL', 'Bose', 'Harman', 'Sonos'],
    futureImpact: 'Planar magnetic and electrostatic designs offer alternatives, while smart speakers integrate AI assistants.',
    color: '#3B82F6'
  },
  {
    icon: '🎸',
    title: 'Electric Guitar Pickups',
    short: 'Turning string vibrations into electrical signals',
    tagline: 'The soul of rock and roll',
    description: 'Guitar pickups work as speakers in reverse. Magnetized strings vibrating in a coil induce electrical current through electromagnetic induction - the opposite of the Lorentz force that drives speakers.',
    connection: 'This simulation shows the motor effect (current to motion). Pickups use the generator effect (motion to current). Both rely on the same physics - the interaction of magnetic fields and moving charges.',
    howItWorks: 'Permanent magnets magnetize the steel strings. When strings vibrate, the changing magnetic flux through copper coils induces a voltage. The tiny signal is amplified to drive speakers.',
    stats: [
      { value: '6000+', label: 'Coil windings typical', icon: '🔄' },
      { value: '8-15k ohms', label: 'Pickup impedance range', icon: '⚡' },
      { value: '$2B', label: 'Guitar market annually', icon: '🎸' }
    ],
    examples: ['Single-coil pickups', 'Humbuckers', 'Active pickups', 'Bass pickups'],
    companies: ['Fender', 'Gibson', 'Seymour Duncan', 'DiMarzio'],
    futureImpact: 'Modeling amplifiers and digital processing are expanding tonal possibilities.',
    color: '#10B981'
  },
  {
    icon: '🚄',
    title: 'Maglev Transportation',
    short: 'Trains that float on magnetic force',
    tagline: 'Friction-free travel',
    description: 'Maglev trains use powerful electromagnets to levitate above the track and propel forward. Linear motors in the track create traveling magnetic waves that push the train at speeds over 600 km/h.',
    connection: 'Linear motors are essentially unrolled versions of the rotary motors in this simulation. The Lorentz force on current-carrying conductors in magnetic fields provides both levitation and propulsion.',
    howItWorks: 'Superconducting magnets on the train interact with powered coils in the track. For levitation, induced currents create repulsive forces. For propulsion, a traveling magnetic wave pulls the train forward.',
    stats: [
      { value: '603 km/h', label: 'Maglev speed record', icon: '🚄' },
      { value: '0 mm', label: 'Contact with track', icon: '🧲' },
      { value: '$100B', label: 'Japan maglev project cost', icon: '💹' }
    ],
    examples: ['Shanghai Maglev', 'Japan Chuo Shinkansen', 'Hyperloop concepts', 'Inductrack systems'],
    companies: ['JR Central', 'Transrapid', 'Virgin Hyperloop', 'CRRC'],
    futureImpact: 'Hyperloop systems could achieve near-supersonic ground transport in vacuum tubes.',
    color: '#8B5CF6'
  },
  {
    icon: '🏥',
    title: 'MRI Machines',
    short: 'Imaging the body with magnetic fields',
    tagline: 'Seeing without radiation',
    description: 'MRI scanners use powerful magnetic fields and precisely controlled RF pulses to image soft tissue in exquisite detail. Gradient coils create spatial encoding through Lorentz-force-generated magnetic field variations.',
    connection: 'MRI gradient coils work like the voice coil in this simulation - current through wires in a magnetic field creates forces. These forces are managed structurally while creating precisely shaped fields.',
    howItWorks: 'A superconducting main magnet aligns hydrogen protons. Gradient coils create position-dependent fields. RF pulses tip protons, which then emit signals revealing tissue properties.',
    stats: [
      { value: '100M+', label: 'MRI scans yearly worldwide', icon: '🏥' },
      { value: '7 Tesla', label: 'Highest clinical field strength', icon: '🧲' },
      { value: '$8B', label: 'MRI equipment market', icon: '💵' }
    ],
    examples: ['Brain imaging', 'Joint diagnosis', 'Cardiac MRI', 'Fetal monitoring'],
    companies: ['Siemens Healthineers', 'GE Healthcare', 'Philips', 'Canon Medical'],
    futureImpact: 'Faster imaging, AI-assisted diagnosis, and lower-field portable MRI are expanding access.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const SpeakerPrincipleRenderer: React.FC<SpeakerPrincipleRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [audioAmplitude, setAudioAmplitude] = useState(50); // 0-100%
  const [magnetStrength, setMagnetStrength] = useState(70); // 0-100%
  const [audioFrequency, setAudioFrequency] = useState(440); // Hz
  const [showForceVectors, setShowForceVectors] = useState(true);

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

  // Animation state for visualization
  const [animPhase, setAnimPhase] = useState(0);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(prev => (prev + audioFrequency / 50) % (Math.PI * 2));
    }, 16);
    return () => clearInterval(interval);
  }, [audioFrequency]);

  // Calculate wire displacement based on Lorentz force
  const wireDisplacement = useMemo(() => {
    const forceFactor = (magnetStrength / 100) * (audioAmplitude / 100);
    return forceFactor * 25; // Max 25px displacement
  }, [magnetStrength, audioAmplitude]);

  // Sound intensity
  const soundIntensity = useMemo(() => {
    return Math.round(wireDisplacement * 4);
  }, [wireDisplacement]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#06b6d4', // Cyan for speaker theme
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#2a2a3a',
    magnet: '#dc2626',
    magnetSouth: '#3b82f6',
    wire: '#fbbf24',
    current: '#22d3ee',
    force: '#a855f7',
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
    twist_predict: 'Compare Variable',
    twist_play: 'Explore Frequency',
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
        gameType: 'speaker-principle',
        gameTitle: 'Speaker Principle',
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

  // Current wire displacement (sinusoidal animation)
  const currentDisplacement = Math.sin(animPhase) * wireDisplacement;
  const currentDirection = Math.sin(animPhase) > 0 ? 1 : -1;

  // Speaker Visualization SVG Component
  const SpeakerVisualization = ({ showLabels = true, showFrequency = false }: { showLabels?: boolean; showFrequency?: boolean }) => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 300 : 360;
    const centerX = width / 2;
    const centerY = height / 2;

    // Sound wave rings
    const soundWaveRings = useMemo(() => {
      if (soundIntensity < 10) return [];
      const rings = [];
      for (let i = 0; i < 4; i++) {
        const ringPhase = (animPhase * 2 + i * Math.PI / 2) % (Math.PI * 2);
        const scale = 0.5 + (ringPhase / (Math.PI * 2)) * 1.5;
        const opacity = Math.max(0, 1 - ringPhase / (Math.PI * 2)) * (soundIntensity / 100);
        rings.push({ scale, opacity, id: i });
      }
      return rings;
    }, [soundIntensity]);

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="magnetNorth" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7f1d1d" />
            <stop offset="50%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
          <linearGradient id="magnetSouth" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <linearGradient id="copperWire" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>
          <linearGradient id="forceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e879f9" />
            <stop offset="100%" stopColor="#9333ea" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Lorentz Force Speaker Model
        </text>

        {/* Frequency display - changes with slider in twist_play */}
        {showFrequency && (
          <g transform={`translate(10, 35)`}>
            <rect x="0" y="0" width="130" height="24" rx="4" fill={`${colors.accent}22`} stroke={`${colors.accent}44`} strokeWidth="1" />
            <text x="65" y="16" textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="600">
              {audioFrequency} Hz ({audioFrequency < 300 ? 'Bass' : audioFrequency < 2000 ? 'Mid' : 'Treble'})
            </text>
          </g>
        )}

        {/* Audio waveform path showing frequency - dynamic data points */}
        {showFrequency && (
          <g transform={`translate(10, ${height - 50})`}>
            <path
              d={(() => {
                const numCycles = Math.max(1, Math.min(8, Math.floor(audioFrequency / 400)));
                const ampY = height * 0.35;
                const midY = height * 0.5;
                const pts = [];
                for (let i = 0; i <= numCycles * 4; i++) {
                  const x = (i / (numCycles * 4)) * (width - 20);
                  const y = midY + Math.sin((i / (numCycles * 4)) * numCycles * Math.PI * 2) * ampY;
                  pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
                }
                return pts.join(' ');
              })()}
              stroke={colors.current}
              strokeWidth="2"
              fill="none"
              opacity="0.7"
            />
            <text x="0" y="45" fill={colors.textMuted} fontSize="11">Audio waveform at {audioFrequency} Hz</text>
          </g>
        )}

        {/* Audio signal waveform - shows amplitude, spans vertical space, 12+ points */}
        <path
          d={`M 5 ${(height*0.1).toFixed(0)} L 15 ${(height*0.9).toFixed(0)} L 25 ${(height*0.1).toFixed(0)} L 35 ${(height*0.9).toFixed(0)} L 45 ${(height*0.1).toFixed(0)} L 55 ${(height*0.9).toFixed(0)} L 65 ${(height*0.1).toFixed(0)} L 75 ${(height*0.9).toFixed(0)} L 85 ${(height*0.1).toFixed(0)} L 95 ${(height*0.9).toFixed(0)} L 105 ${(height*0.1).toFixed(0)} L 115 ${(height*0.5).toFixed(0)}`}
          stroke={colors.current}
          strokeWidth="1"
          fill="none"
          opacity="0.15"
        />

        {/* Sound wave visualization */}
        {soundWaveRings.map(ring => (
          <ellipse
            key={ring.id}
            cx={centerX + 100}
            cy={centerY}
            rx={30 * ring.scale}
            ry={50 * ring.scale}
            fill="none"
            stroke={colors.current}
            strokeWidth="2"
            opacity={ring.opacity}
          />
        ))}

        {/* Magnet yoke (back plate) */}
        <rect
          x={centerX - 90}
          y={centerY - 70}
          width={180}
          height={140}
          rx="8"
          fill="#374151"
          stroke="#4b5563"
          strokeWidth="2"
        />

        {/* North pole magnet (top) */}
        <rect
          x={centerX - 75}
          y={centerY - 60}
          width={150}
          height={40}
          rx="4"
          fill="url(#magnetNorth)"
        />
        <text x={centerX} y={centerY - 35} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">N</text>

        {/* South pole magnet (bottom) */}
        <rect
          x={centerX - 75}
          y={centerY + 20}
          width={150}
          height={40}
          rx="4"
          fill="url(#magnetSouth)"
        />
        <text x={centerX} y={centerY + 45} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">S</text>

        {/* Air gap */}
        <rect
          x={centerX - 75}
          y={centerY - 18}
          width={150}
          height={36}
          fill="#030712"
        />

        {/* Magnetic field lines */}
        <g opacity={magnetStrength / 120 + 0.3}>
          {[-2, -1, 0, 1, 2].map(i => (
            <line
              key={i}
              x1={centerX + i * 25}
              y1={centerY - 55}
              x2={centerX + i * 25}
              y2={centerY + 55}
              stroke={colors.force}
              strokeWidth="2"
              strokeDasharray="6,4"
              opacity="0.5"
            />
          ))}
        </g>

        {/* Voice coil / Wire */}
        <g transform={`translate(0, ${currentDisplacement})`}>
          {/* Wire glow */}
          {audioAmplitude > 30 && (
            <rect
              x={centerX - 65}
              y={centerY - 8}
              width={130}
              height={16}
              rx="8"
              fill={colors.wire}
              opacity="0.3"
              filter="url(#glow)"
            />
          )}

          {/* Main wire */}
          <rect
            x={centerX - 65}
            y={centerY - 6}
            width={130}
            height={12}
            rx="6"
            fill="url(#copperWire)"
            stroke="#78350f"
            strokeWidth="1"
          />

          {/* Current flow indicator */}
          {audioAmplitude > 10 && (
            <g opacity={audioAmplitude / 100}>
              <line
                x1={currentDirection > 0 ? centerX - 55 : centerX + 55}
                y1={centerY}
                x2={currentDirection > 0 ? centerX + 50 : centerX - 50}
                y2={centerY}
                stroke={colors.current}
                strokeWidth="3"
                strokeLinecap="round"
                filter="url(#glow)"
              />
              {/* Current arrow */}
              <polygon
                points={currentDirection > 0
                  ? `${centerX + 50},${centerY - 6} ${centerX + 58},${centerY} ${centerX + 50},${centerY + 6}`
                  : `${centerX - 50},${centerY - 6} ${centerX - 58},${centerY} ${centerX - 50},${centerY + 6}`
                }
                fill={colors.current}
              />
            </g>
          )}

          {/* Terminal connectors */}
          <circle cx={centerX - 70} cy={centerY} r="8" fill="#57534e" stroke="#78716c" strokeWidth="2" />
          <circle cx={centerX + 70} cy={centerY} r="8" fill="#57534e" stroke="#78716c" strokeWidth="2" />
        </g>

        {/* Lorentz Force vectors */}
        {showForceVectors && wireDisplacement > 2 && (
          <g transform={`translate(0, ${currentDisplacement})`} filter="url(#glow)">
            <line
              x1={centerX}
              y1={centerY}
              x2={centerX}
              y2={centerY + (currentDirection > 0 ? -40 : 40)}
              stroke="url(#forceGradient)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <polygon
              points={currentDirection > 0
                ? `${centerX - 8},${centerY - 35} ${centerX},${centerY - 50} ${centerX + 8},${centerY - 35}`
                : `${centerX - 8},${centerY + 35} ${centerX},${centerY + 50} ${centerX + 8},${centerY + 35}`
              }
              fill={colors.force}
            />
          </g>
        )}

        {/* Speaker cone (side view) */}
        <g transform={`translate(${centerX + 110}, ${centerY})`}>
          <path
            d={`M 0,${-20 + currentDisplacement * 0.4}
                L 35,${-45 + currentDisplacement * 0.2}
                L 35,${45 + currentDisplacement * 0.2}
                L 0,${20 + currentDisplacement * 0.4} Z`}
            fill="#334155"
            stroke="#475569"
            strokeWidth="1"
          />
          <ellipse
            cx={5}
            cy={currentDisplacement * 0.4}
            rx="6"
            ry="12"
            fill="#475569"
          />
        </g>

        {/* Info displays */}
        {showLabels && (
          <>
            {/* Displacement display - bottom right, use large unique coords */}
            <rect x={width - 95} y={height - 78} width="90" height="68" rx="8" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1" />
            <text x={width - 50} y={height - 60} textAnchor="middle" fill={colors.textMuted} fontSize="11">DISPLACEMENT</text>
            <text x={width - 50} y={height - 38} textAnchor="middle" fill={colors.accent} fontSize="16" fontWeight="bold">
              {wireDisplacement.toFixed(1)}mm
            </text>
            <text x={width - 50} y={height - 18} textAnchor="middle" fill={colors.textMuted} fontSize="11">
              Snd:{soundIntensity}%
            </text>

            {/* Formula display - bottom left */}
            <rect x="12" y={height - 43} width="105" height="32" rx="6" fill={`${colors.force}33`} stroke={colors.force} strokeWidth="1" />
            <text x="64" y={height - 22} textAnchor="middle" fill={colors.textPrimary} fontSize="13" fontWeight="600">
              F = B x I x L
            </text>

            {/* Legend - right side, top area */}
            <rect x={width - 92} y="42" width="85" height="58" rx="6" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1" />
            <line x1={width - 82} y1="57" x2={width - 62} y2="57" stroke={colors.current} strokeWidth="3" />
            <text x={width - 55} y="61" fill={colors.textMuted} fontSize="11">Current I</text>
            <line x1={width - 82} y1="72" x2={width - 62} y2="72" stroke={colors.force} strokeWidth="2" strokeDasharray="4,3" />
            <text x={width - 55} y="76" fill={colors.textMuted} fontSize="11">B-Field</text>
            <line x1={width - 82} y1="87" x2={width - 62} y2="87" stroke={colors.force} strokeWidth="3" />
            <text x={width - 55} y="91" fill={colors.textMuted} fontSize="11">Force F</text>
          </>
        )}
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
      zIndex: 1000,
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

  // Bottom navigation bar with Back and Next buttons
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isTestActive = phase === 'test' && !testSubmitted;
    const isNextDisabled = currentIndex === phaseOrder.length - 1 || isTestActive;
    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        zIndex: 100,
      }}>
        <button
          onClick={() => currentIndex > 0 && goToPhase(phaseOrder[currentIndex - 1])}
          disabled={currentIndex === 0}
          aria-label="Back"
          style={{
            padding: '10px 20px',
            minHeight: '44px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: currentIndex === 0 ? colors.border : colors.textSecondary,
            cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          ← Back
        </button>
        {/* nav dots inline */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              style={{
                width: phase === p ? '24px' : '8px',
                minHeight: '44px',
                borderRadius: '4px',
                border: 'none',
                background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
                cursor: 'pointer',
                padding: 0,
              }}
              aria-label={phaseLabels[p]}
            />
          ))}
        </div>
        <button
          onClick={() => !isNextDisabled && goToPhase(phaseOrder[currentIndex + 1])}
          disabled={isNextDisabled}
          aria-label="Next"
          style={{
            padding: '10px 20px',
            minHeight: '44px',
            borderRadius: '8px',
            border: 'none',
            background: isNextDisabled ? colors.border : colors.accent,
            color: 'white',
            cursor: isNextDisabled ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            opacity: isNextDisabled ? 0.4 : 1,
          }}
        >
          Next →
        </button>
      </div>
    );
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #0891b2)`,
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
        overflowY: 'auto',
      }}>
        {renderProgressBar()}
        {/* Color reference for muted text: #94a3b8 */}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🔊🎵
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Speaker Principle
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }} data-muted-color="#94a3b8">
          "How does electricity become <span style={{ color: colors.accent }}>sound</span>? Every speaker, headphone, and audio device uses the same fundamental physics - the <span style={{ color: colors.force }}>Lorentz Force</span>."
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
            "When current flows through a wire in a magnetic field, the wire experiences a force. Point your thumb in the current direction, your fingers in the magnetic field direction, and your palm shows the force direction."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - The Right-Hand Rule
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore the Physics
        </button>

        {renderBottomNav()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Nothing happens - the wire just gets warm from the current' },
      { id: 'b', text: 'The wire vibrates back and forth as the current alternates direction', correct: true },
      { id: 'c', text: 'The wire spins in circles like a motor' },
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
            What happens when AC current flows through a wire suspended between two magnets?
          </h2>

          {/* Simple diagram with SVG */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width="300" height="150" viewBox="0 0 300 150" style={{ marginBottom: '16px' }}>
              {/* Magnet poles */}
              <rect x="80" y="20" width="140" height="30" rx="4" fill="#dc2626" />
              <text x="150" y="40" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">N</text>
              <rect x="80" y="100" width="140" height="30" rx="4" fill="#3b82f6" />
              <text x="150" y="120" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">S</text>
              {/* Wire (static) */}
              <rect x="100" y="65" width="100" height="20" rx="10" fill="#fbbf24" stroke="#92400e" strokeWidth="2" />
              <text x="150" y="80" textAnchor="middle" fill="#1a1a24" fontSize="12" fontWeight="bold">WIRE</text>
              {/* Question mark */}
              <text x="260" y="85" fontSize="32" fill="#94a3b8">?</text>
            </svg>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', color: colors.current }}>~</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>AC Signal</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>-&gt;</div>
              <div style={{
                background: `${colors.wire}33`,
                padding: '20px 30px',
                borderRadius: '8px',
                border: `2px solid ${colors.wire}`,
              }}>
                <div style={{ fontSize: '24px', color: colors.wire }}>Wire</div>
                <p style={{ ...typo.small, color: colors.textPrimary }}>in B-Field</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>-&gt;</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>???</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>What happens?</p>
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

        {renderBottomNav()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Speaker Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        paddingTop: '48px',
        paddingBottom: '100px',
        paddingLeft: '24px',
        paddingRight: '24px',
        overflowY: 'auto',
        flex: 1,
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Lorentz Force Speaker
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            This visualization demonstrates the Lorentz force F = BIL. When you increase the current or magnetic field strength, the wire displacement increases proportionally — more current causes greater force on the conductor.
          </p>
          <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px', fontStyle: 'italic' }}>
            This is why every speaker, headphone, and audio device uses this principle — the Lorentz force is the fundamental engineering technology behind all audio equipment. Observe how the wire displacement changes as you adjust the sliders.
          </p>

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
              <SpeakerVisualization />
            </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            {/* Audio Amplitude slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Audio Amplitude (Current)</span>
                <span style={{ ...typo.small, color: colors.current, fontWeight: 600 }}>{audioAmplitude}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={audioAmplitude}
                onChange={(e) => setAudioAmplitude(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.current} ${audioAmplitude}%, ${colors.border} ${audioAmplitude}%)`,
                  cursor: 'pointer',
                  WebkitAppearance: 'none' as const,
                  touchAction: 'pan-y',
                  accentColor: '#3b82f6',
                }}
              />
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>
                Higher amplitude = more current = stronger force
              </p>
            </div>

            {/* Magnet Strength slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Magnetic Field Strength</span>
                <span style={{ ...typo.small, color: colors.magnet, fontWeight: 600 }}>{magnetStrength}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={magnetStrength}
                onChange={(e) => setMagnetStrength(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.magnet} ${magnetStrength}%, ${colors.border} ${magnetStrength}%)`,
                  cursor: 'pointer',
                  WebkitAppearance: 'none' as const,
                  touchAction: 'pan-y',
                  accentColor: '#3b82f6',
                }}
              />
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>
                Stronger magnets = more force on the wire
              </p>
            </div>

            {/* Toggle force vectors */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <button
                onClick={() => setShowForceVectors(!showForceVectors)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${showForceVectors ? colors.force : colors.border}`,
                  background: showForceVectors ? `${colors.force}22` : 'transparent',
                  color: showForceVectors ? colors.force : colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                {showForceVectors ? 'Hide' : 'Show'} Force Vectors
              </button>
            </div>

            {/* Stats display */}
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
                <div style={{ ...typo.h3, color: colors.current }}>{audioAmplitude}%</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Current (I)</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.magnet }}>{magnetStrength}%</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>B-Field</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.success }}>{wireDisplacement.toFixed(1)}mm</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Displacement</div>
              </div>
            </div>
            </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {wireDisplacement > 15 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Strong movement! The wire pushes air molecules, creating sound waves.
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

        {renderBottomNav()}
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
            The Lorentz Force: F = BIL
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>The Lorentz Force on a current-carrying wire:</strong>
              </p>
              <div style={{
                background: `${colors.force}22`,
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'center',
                marginBottom: '16px',
              }}>
                <span style={{ fontSize: '24px', color: colors.force, fontWeight: 700 }}>F = B x I x L</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li><strong style={{ color: colors.magnet }}>B</strong> = Magnetic field strength (Tesla)</li>
                <li><strong style={{ color: colors.current }}>I</strong> = Current through the wire (Amperes)</li>
                <li><strong style={{ color: colors.wire }}>L</strong> = Length of wire in the field (meters)</li>
                <li><strong style={{ color: colors.force }}>F</strong> = Force on the wire (Newtons)</li>
              </ul>
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
              Key Insight: AC Creates Vibration
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              As you observed in the experiment, the wire vibrates back and forth when AC current flows through it. What you saw confirms your prediction: alternating current in a magnetic field creates alternating force, causing the wire to vibrate at the frequency of the audio signal and push air molecules into sound waves!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
              How Speakers Work
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              A speaker's <strong>voice coil</strong> is a wire wound into a cylinder, sitting in a magnetic gap. The coil is attached to a <strong>cone</strong> that amplifies the tiny movements into larger pressure waves you can hear. This is how every speaker, headphone, and earbud converts electrical signals to sound.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore Frequency
          </button>
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Same displacement at any frequency - only amplitude matters' },
      { id: 'b', text: 'Less displacement at higher frequencies - the cone cannot keep up with rapid changes', correct: true },
      { id: 'c', text: 'More displacement at higher frequencies - higher frequency means more energy' },
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
              New Variable: Audio Frequency
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            What happens when you increase the audio frequency from bass (low) to treble (high)?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              Consider a speaker cone with mass. At 100 Hz, it must reverse direction 200 times per second. At 10,000 Hz, it must reverse 20,000 times per second!
            </p>
            <svg width="300" height="180" viewBox="0 0 300 180" style={{ display: 'block', margin: '0 auto' }}>
              <title>Frequency Comparison Visualization</title>
              {/* Low frequency wave - slow oscillation */}
              <text x="10" y="20" fill={colors.accent} fontSize="11" fontWeight="600">Low Frequency (100 Hz)</text>
              <path d={`M 10,60 C 50,20 100,20 140,60 C 180,100 230,100 270,60`} stroke={colors.accent} strokeWidth="2" fill="none" />
              <text x="10" y="85" fill={colors.textMuted} fontSize="11">slow oscillation - large displacement</text>
              {/* High frequency wave - rapid oscillation */}
              <text x="10" y="110" fill={colors.warning} fontSize="11" fontWeight="600">High Frequency (10000 Hz)</text>
              <path d={`M 10,140 C 22,100 33,100 44,140 C 55,170 66,170 77,140 C 88,100 99,100 110,140 C 121,170 132,170 143,140 C 154,100 165,100 176,140 C 187,170 198,170 209,140 C 220,100 231,100 242,140 C 253,170 264,170 275,140`} stroke={colors.warning} strokeWidth="2" fill="none" />
              <text x="10" y="178" fill={colors.textMuted} fontSize="11">rapid oscillation - smaller displacement</text>
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
              Test with Frequency
            </button>
          )}
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const frequencyRange = audioFrequency < 300 ? 'Bass' : audioFrequency < 2000 ? 'Midrange' : 'Treble';

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        paddingTop: '48px',
        paddingBottom: '100px',
        paddingLeft: '24px',
        paddingRight: '24px',
        overflowY: 'auto',
        flex: 1,
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Frequency Response
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Sweep through frequencies and observe how the speaker responds
          </p>
          <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px', fontStyle: 'italic' }}>
            Observe how the wire motion changes at different frequencies.
          </p>

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
                  <SpeakerVisualization showFrequency={true} />
                </div>
              </div>

              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Frequency slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Audio Frequency</span>
                    <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{audioFrequency} Hz ({frequencyRange})</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="5000"
                    value={audioFrequency}
                    onChange={(e) => setAudioFrequency(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      height: '20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      WebkitAppearance: 'none' as const,
                      touchAction: 'pan-y',
                      accentColor: '#3b82f6',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>20 Hz (Deep Bass)</span>
                    <span style={{ ...typo.small, color: colors.textMuted }}>5000 Hz (High Treble)</span>
                  </div>
                </div>

                {/* Frequency range indicator */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  marginTop: '16px',
                }}>
                  <div style={{
                    background: frequencyRange === 'Bass' ? `${colors.magnet}33` : colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                    border: frequencyRange === 'Bass' ? `2px solid ${colors.magnet}` : 'none',
                  }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>🔊</div>
                    <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>Bass</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>20-300 Hz</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Large excursion</div>
                  </div>
                  <div style={{
                    background: frequencyRange === 'Midrange' ? `${colors.accent}33` : colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                    border: frequencyRange === 'Midrange' ? `2px solid ${colors.accent}` : 'none',
                  }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>🗣️</div>
                    <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>Midrange</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>300-2000 Hz</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Voice, instruments</div>
                  </div>
                  <div style={{
                    background: frequencyRange === 'Treble' ? `${colors.success}33` : colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                    border: frequencyRange === 'Treble' ? `2px solid ${colors.success}` : 'none',
                    gridColumn: 'span 2',
                  }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>🔔</div>
                    <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>Treble</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>2000+ Hz</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Tiny, fast movements</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Tradeoff
          </button>
        </div>

        {renderBottomNav()}
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
            Why Speakers Have Multiple Drivers
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔊</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Woofers (Bass)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Large, heavy cones</strong> that can move lots of air. They move slowly but with large excursion for powerful bass. Mass limits high-frequency response.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🗣️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Midrange Drivers</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Medium-sized cones</strong> optimized for voice and instrument frequencies. Balance between excursion capability and speed.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔔</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Tweeters (Treble)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                <strong>Tiny, ultra-light diaphragms</strong> that can vibrate thousands of times per second. Low mass means fast response but limited bass capability.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Crossover Networks</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Electronic filters split the audio signal, sending bass to woofers, mids to midrange drivers, and treble to tweeters. Each driver handles what it does best!
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

        {renderBottomNav()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);
    const completedCount = completedApps.filter(c => c).length;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
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
                    &#x2713;
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
                Physics Connection:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '16px',
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

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '12px',
            }}>
              <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 600 }}>
                How It Works:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.howItWorks}
              </p>
            </div>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '12px',
            }}>
              <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Examples:</div>
              <div style={{ ...typo.small, color: colors.textPrimary }}>
                {app.examples.join(' | ')}
              </div>
            </div>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '12px',
            }}>
              <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Companies:</div>
              <div style={{ ...typo.small, color: colors.textPrimary }}>
                {app.companies.join(' | ')}
              </div>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '8px',
              padding: '12px',
            }}>
              <div style={{ ...typo.small, color: colors.success, marginBottom: '4px', fontWeight: 600 }}>Future Impact:</div>
              <div style={{ ...typo.small, color: colors.textSecondary }}>
                {app.futureImpact}
              </div>
            </div>

            {/* Got It / Next Application button */}
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                if (selectedApp < realWorldApps.length - 1) {
                  setSelectedApp(selectedApp + 1);
                }
              }}
              style={{
                ...primaryButtonStyle,
                width: '100%',
                marginTop: '16px',
                background: completedApps[selectedApp] ? colors.bgSecondary : `linear-gradient(135deg, ${colors.accent}, #0891b2)`,
              }}
            >
              {completedApps[selectedApp]
                ? (selectedApp < realWorldApps.length - 1 ? 'Next Application' : 'Got It')
                : 'Got It'}
            </button>
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

        {renderBottomNav()}
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
                ? 'You understand the Lorentz force and speaker physics!'
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
          {renderBottomNav()}
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

        {renderBottomNav()}
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
          Speaker Principle Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how the Lorentz force converts electrical signals into mechanical motion and sound.
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
              'Lorentz force: F = BIL moves current-carrying wires',
              'AC current creates vibration in magnetic fields',
              'Voice coils convert electrical signals to motion',
              'Different frequencies need different driver sizes',
              'Crossovers route frequencies to optimal drivers',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>&#x2713;</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '16px 24px',
          marginBottom: '24px',
        }}>
          <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>Your Score</div>
          <div style={{ ...typo.h1, color: colors.success }}>{testScore}/10</div>
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

        {renderBottomNav()}
      </div>
    );
  }

  return null;
};

export default SpeakerPrincipleRenderer;
