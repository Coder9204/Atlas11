'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

const realWorldApps = [
  {
    icon: '🔊',
    title: 'Audio Speaker Design',
    short: 'Converting electrical signals to sound waves',
    tagline: 'The voice of electronics',
    description: 'Every speaker from phone earbuds to stadium concert systems uses the Lorentz force. A voice coil in a magnetic field moves in response to electrical current, pushing air to create sound waves.',
    connection: 'This simulation demonstrates F = BIL - the force on the voice coil depends on magnetic field strength, current, and wire length. Speaker designers optimize all three to maximize efficiency and sound quality.',
    howItWorks: 'The voice coil is wound copper wire sitting in a gap between permanent magnets. Alternating current creates alternating force, moving the coil and attached cone. Suspension springs return the cone to center. The cone pushes air, creating pressure waves we hear as sound.',
    stats: [
      { value: '$35B', label: 'Global speaker market', icon: '💰' },
      { value: '20-20kHz', label: 'Human hearing range', icon: '👂' },
      { value: '99%', label: 'Of audio devices use this tech', icon: '📊' }
    ],
    examples: ['Smartphone speakers', 'Studio monitors', 'PA systems', 'Automotive audio'],
    companies: ['JBL', 'Bose', 'Harman', 'Sonos'],
    futureImpact: 'Planar magnetic and electrostatic designs offer alternatives, while smart speakers integrate AI assistants, transforming how we interact with audio.',
    color: '#3B82F6'
  },
  {
    icon: '🎸',
    title: 'Electric Guitar Pickups',
    short: 'Turning string vibrations into electrical signals',
    tagline: 'The soul of rock and roll',
    description: 'Guitar pickups work as speakers in reverse. Magnetized strings vibrating in a coil induce electrical current through electromagnetic induction - the opposite of the Lorentz force that drives speakers.',
    connection: 'This simulation shows the motor effect (current to motion). Pickups use the generator effect (motion to current). Both rely on the same physics - the interaction of magnetic fields and moving charges.',
    howItWorks: 'Permanent magnets magnetize the steel strings. When strings vibrate, the changing magnetic flux through copper coils induces a voltage (Faraday\'s law). The tiny signal (millivolts) is amplified to drive speakers.',
    stats: [
      { value: '6000+', label: 'Coil windings typical', icon: '🔄' },
      { value: '8-15kΩ', label: 'Pickup impedance range', icon: '⚡' },
      { value: '$2B', label: 'Guitar market annually', icon: '🎸' }
    ],
    examples: ['Single-coil pickups', 'Humbuckers', 'Active pickups', 'Bass pickups'],
    companies: ['Fender', 'Gibson', 'Seymour Duncan', 'DiMarzio'],
    futureImpact: 'Modeling amplifiers and digital processing are expanding tonal possibilities, while traditional pickups remain essential for authentic analog tone.',
    color: '#10B981'
  },
  {
    icon: '🚄',
    title: 'Maglev Transportation',
    short: 'Trains that float on magnetic force',
    tagline: 'Friction-free travel',
    description: 'Maglev trains use powerful electromagnets to levitate above the track and propel forward. Linear motors in the track create traveling magnetic waves that push the train at speeds over 600 km/h.',
    connection: 'Linear motors are essentially unrolled versions of the rotary motors in this simulation. The Lorentz force on current-carrying conductors in magnetic fields provides both levitation and propulsion.',
    howItWorks: 'Superconducting magnets on the train interact with powered coils in the track. For levitation, induced currents create repulsive forces. For propulsion, a traveling magnetic wave in the track pulls the train forward like a surfboard riding a wave.',
    stats: [
      { value: '603 km/h', label: 'Maglev speed record', icon: '🚄' },
      { value: '0 mm', label: 'Contact with track', icon: '🧲' },
      { value: '$100B', label: 'Japan maglev project cost', icon: '💹' }
    ],
    examples: ['Shanghai Maglev', 'Japan Chuo Shinkansen', 'Hyperloop concepts', 'Inductrack systems'],
    companies: ['JR Central', 'Transrapid', 'Virgin Hyperloop', 'CRRC'],
    futureImpact: 'Hyperloop systems could achieve near-supersonic ground transport in vacuum tubes, revolutionizing intercity travel.',
    color: '#8B5CF6'
  },
  {
    icon: '🏥',
    title: 'MRI Machines',
    short: 'Imaging the body with magnetic fields and radio waves',
    tagline: 'Seeing without radiation',
    description: 'MRI scanners use powerful magnetic fields and precisely controlled RF pulses to image soft tissue in exquisite detail. Gradient coils create spatial encoding through Lorentz-force-generated magnetic field variations.',
    connection: 'MRI gradient coils work like the voice coil in this simulation - current through wires in a magnetic field creates forces. These forces are managed structurally while the coils create precisely shaped magnetic fields for imaging.',
    howItWorks: 'A superconducting main magnet aligns hydrogen protons. Gradient coils (using Lorentz forces) create position-dependent fields. RF pulses tip protons, which then emit signals revealing tissue properties. Fourier transforms reconstruct 3D images.',
    stats: [
      { value: '100M+', label: 'MRI scans yearly worldwide', icon: '🏥' },
      { value: '7 Tesla', label: 'Highest clinical field strength', icon: '🧲' },
      { value: '$8B', label: 'MRI equipment market', icon: '💵' }
    ],
    examples: ['Brain imaging', 'Joint diagnosis', 'Cardiac MRI', 'Fetal monitoring'],
    companies: ['Siemens Healthineers', 'GE Healthcare', 'Philips', 'Canon Medical'],
    futureImpact: 'Faster imaging, AI-assisted diagnosis, and lower-field portable MRI are expanding access to this radiation-free imaging modality.',
    color: '#F59E0B'
  }
];

// ============================================================================
// SPEAKER PRINCIPLE GAME
// Core Concept: Lorentz force on current-carrying wire in magnetic field
// Real-World Application: How speakers convert electrical signals to sound
// ============================================================================

interface GameEvent {
  eventType: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface SpeakerPrincipleRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound effects
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number }> = {
      click: { freq: 600, duration: 0.1 },
      success: { freq: 800, duration: 0.2 },
      failure: { freq: 300, duration: 0.3 },
      transition: { freq: 500, duration: 0.15 },
      complete: { freq: 900, duration: 0.4 }
    };
    const sound = sounds[type];
    oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SpeakerPrincipleRenderer: React.FC<SpeakerPrincipleRendererProps> = ({ onGameEvent }) => {
  // Phase management
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const [phase, setPhase] = useState<Phase>('hook');
  const [isMobile, setIsMobile] = useState(false);

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [audioFrequency, setAudioFrequency] = useState(440); // Hz
  const [audioAmplitude, setAudioAmplitude] = useState(50); // 0-100%
  const [magnetStrength, setMagnetStrength] = useState(70); // 0-100%
  const [showForceVectors, setShowForceVectors] = useState(true);

  // Transfer state
  const [completedApps, setCompletedApps] = useState([false, false, false, false]);
  const [activeApp, setActiveApp] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [testScore, setTestScore] = useState(0);

  const isNavigating = useRef(false);

  // Responsive check
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

  // Calculate wire displacement based on Lorentz force
  const wireDisplacement = useMemo(() => {
    // F = BIL, displacement proportional to force
    const forceFactor = (magnetStrength / 100) * (audioAmplitude / 100);
    return forceFactor * 25; // Max 25px displacement
  }, [magnetStrength, audioAmplitude]);

  // Sound intensity (what you'd hear)
  const soundIntensity = useMemo(() => {
    return Math.round(wireDisplacement * 4); // 0-100%
  }, [wireDisplacement]);

  // Colors
  const colors = {
    bgDeep: '#030712',
    bgSurface: '#0f172a',
    bgElevated: '#1e293b',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#64748b',
    primary: '#06b6d4',
    primaryDark: '#0891b2',
    accent: '#f59e0b',
    warning: '#f59e0b',
    success: '#22c55e',
    error: '#ef4444',
    magnet: '#dc2626',
    magnetSouth: '#3b82f6',
    wire: '#fbbf24',
    current: '#22d3ee',
    force: '#a855f7',
  };

  // Emit game events for AI coach
  const emitGameEvent = useCallback((eventType: string, details: Record<string, unknown> = {}) => {
    onGameEvent?.({
      eventType,
      gameType: 'speaker_principle',
      gameTitle: 'Speaker Principle',
      details: { phase, audioFrequency, audioAmplitude, magnetStrength, ...details },
      timestamp: Date.now()
    });
  }, [onGameEvent, phase, audioFrequency, audioAmplitude, magnetStrength]);

  // ============================================================================
  // TEST QUESTIONS - Scenario-based multiple choice questions
  // ============================================================================
  const testQuestions = [
    {
      scenario: "You're building a DIY Bluetooth speaker for a school project. When you connect your phone and play music, you can see the speaker cone moving back and forth.",
      question: "What fundamental principle causes the speaker cone to move when an audio signal is sent to it?",
      options: [
        { id: 'a', label: "The electrical signal heats the voice coil, causing thermal expansion and contraction", correct: false },
        { id: 'b', label: "The Lorentz force acts on the current-carrying voice coil in the magnetic field, pushing it back and forth", correct: true },
        { id: 'c', label: "The audio signal creates pressure waves that directly push the cone", correct: false },
        { id: 'd', label: "Static electricity builds up and discharges, creating mechanical vibrations", correct: false }
      ],
      explanation: "Speakers work via the Lorentz force (F = BIL). When alternating current flows through the voice coil sitting in a permanent magnet's field, the force on the coil alternates direction, causing it to vibrate and produce sound waves."
    },
    {
      scenario: "A sound engineer notices that when she increases the volume on the mixing board, the bass speaker cones move with larger excursions. She's curious about the physics involved.",
      question: "How does increasing the audio signal amplitude affect the voice coil and magnet interaction?",
      options: [
        { id: 'a', label: "It strengthens the permanent magnet's field", correct: false },
        { id: 'b', label: "It increases the current through the voice coil, resulting in greater Lorentz force and larger cone displacement", correct: true },
        { id: 'c', label: "It changes the frequency of the magnetic field oscillation", correct: false },
        { id: 'd', label: "It reduces the electrical resistance of the voice coil wire", correct: false }
      ],
      explanation: "The Lorentz force F = BIL is directly proportional to current (I). When you turn up the volume, you increase the current amplitude flowing through the voice coil, which increases the force and causes the cone to move further in each direction."
    },
    {
      scenario: "An audiophile is comparing two speaker cones: one made of paper and one made of Kevlar composite. Both are the same size but the Kevlar cone is significantly lighter.",
      question: "What advantage does a lighter cone material provide for sound reproduction?",
      options: [
        { id: 'a', label: "Lighter cones produce louder bass frequencies due to reduced air resistance", correct: false },
        { id: 'b', label: "Lighter cones can accelerate and decelerate faster, improving transient response and high-frequency reproduction", correct: true },
        { id: 'c', label: "Lighter cones require less magnetic field strength from the permanent magnet", correct: false },
        { id: 'd', label: "Lighter cones are more resistant to thermal damage from high power levels", correct: false }
      ],
      explanation: "Newton's second law (F = ma) tells us that for the same force, a lighter mass accelerates faster. A lighter cone can start and stop moving more quickly, accurately reproducing fast transients and higher frequencies where rapid direction changes are required."
    },
    {
      scenario: "You're setting up a 3-way home theater speaker system that has a woofer, midrange driver, and tweeter. The crossover network inside routes different frequencies to each driver.",
      question: "Why is a crossover network essential in a multi-driver speaker system?",
      options: [
        { id: 'a', label: "To amplify the audio signal before it reaches each driver", correct: false },
        { id: 'b', label: "To convert the AC audio signal to DC for more efficient power transfer", correct: false },
        { id: 'c', label: "To direct appropriate frequency ranges to drivers optimized for those frequencies, preventing damage and improving sound quality", correct: true },
        { id: 'd', label: "To synchronize the phase of all drivers so they produce sound simultaneously", correct: false }
      ],
      explanation: "Each driver is designed for a specific frequency range. Crossovers use capacitors and inductors to filter frequencies, sending bass to woofers (which can handle large excursions) and treble to tweeters (which are light enough to vibrate rapidly). This prevents damage and optimizes performance."
    },
    {
      scenario: "A guitarist is shopping for a new amplifier and notices that some speaker cabinets are rated at 4 ohms while others are rated at 8 ohms. The amplifier manual warns about mismatched impedance.",
      question: "What happens if you connect an 8-ohm rated amplifier to a 4-ohm speaker cabinet?",
      options: [
        { id: 'a', label: "The speaker will play at half volume due to impedance mismatch", correct: false },
        { id: 'b', label: "The amplifier may overheat and potentially fail because it must deliver twice the current to the lower impedance load", correct: true },
        { id: 'c', label: "The sound quality improves because lower impedance means better frequency response", correct: false },
        { id: 'd', label: "Nothing changes because modern amplifiers automatically adjust to any impedance", correct: false }
      ],
      explanation: "With a lower impedance load, Ohm's law (I = V/R) means more current flows for the same voltage. This forces the amplifier to work harder, generating excess heat. If the amp isn't designed for 4-ohm loads, it can overheat, trigger protection circuits, or suffer permanent damage."
    },
    {
      scenario: "A speaker designer is using Thiele-Small parameters to model a new subwoofer. She's particularly interested in the Qts value, which is 0.38 for her driver.",
      question: "What does a Thiele-Small Qts value of 0.38 tell the designer about enclosure requirements?",
      options: [
        { id: 'a', label: "The driver requires no enclosure and works best as an open-baffle design", correct: false },
        { id: 'b', label: "The driver is well-suited for a sealed enclosure, providing tight, accurate bass response", correct: true },
        { id: 'c', label: "The driver can only be used in a bandpass enclosure with dual chambers", correct: false },
        { id: 'd', label: "The driver has too much damping and will produce weak bass regardless of enclosure", correct: false }
      ],
      explanation: "Qts describes the total damping of a driver. Values between 0.3-0.5 indicate good damping, ideal for sealed enclosures that provide additional air-spring damping. Higher Qts values (0.5-0.7) often work better in ported enclosures. This parameter is crucial for matching drivers to enclosure designs."
    },
    {
      scenario: "An audio engineer is designing a ported subwoofer enclosure. She calculates that the port tuning frequency should be 35 Hz to match the driver's parameters.",
      question: "What is the primary purpose of the port (bass reflex tube) in this enclosure design?",
      options: [
        { id: 'a', label: "To allow air to escape and prevent pressure buildup that could damage the cone", correct: false },
        { id: 'b', label: "To reinforce bass output at and around the tuning frequency by using the rear radiation of the cone", correct: true },
        { id: 'c', label: "To cool the voice coil by allowing airflow through the enclosure", correct: false },
        { id: 'd', label: "To reduce the weight of the enclosure for easier transportation", correct: false }
      ],
      explanation: "The port creates a Helmholtz resonator that uses the normally wasted rear wave of the cone. At the tuning frequency, the port output reinforces the front radiation, boosting bass. Below tuning, output rolls off rapidly, so port tuning frequency selection is critical for extended bass response."
    },
    {
      scenario: "A recording studio is considering electrostatic speakers for their mastering suite. These speakers use a thin diaphragm between two charged metal grids instead of a traditional voice coil and magnet.",
      question: "What is the main advantage of electrostatic speakers over traditional dynamic speakers?",
      options: [
        { id: 'a', label: "They produce significantly more bass due to the larger diaphragm surface area", correct: false },
        { id: 'b', label: "They offer exceptionally low distortion and fast transient response because the entire ultra-light diaphragm is driven uniformly", correct: true },
        { id: 'c', label: "They are more efficient and require less amplifier power than dynamic speakers", correct: false },
        { id: 'd', label: "They work without any electrical power, making them ideal for portable use", correct: false }
      ],
      explanation: "Electrostatic speakers drive an extremely thin, lightweight diaphragm uniformly across its entire surface using electrostatic force. This eliminates the cone breakup and inertia issues of traditional speakers, resulting in remarkably low distortion and excellent transient response, though they typically need dedicated amplifiers."
    },
    {
      scenario: "A home theater enthusiast is matching a new power amplifier to his floor-standing speakers. The speakers are rated for 200 watts RMS, and he's deciding between a 100-watt and a 300-watt amplifier.",
      question: "Which amplifier choice is generally safer and why?",
      options: [
        { id: 'a', label: "The 100-watt amplifier, because it cannot send enough power to damage the speakers", correct: false },
        { id: 'b', label: "The 300-watt amplifier, because it has headroom to deliver clean power without clipping, which can damage speakers", correct: true },
        { id: 'c', label: "Either amplifier is equally safe because speaker ratings are just guidelines", correct: false },
        { id: 'd', label: "Neither is safe; you must exactly match amplifier and speaker wattage ratings", correct: false }
      ],
      explanation: "An underpowered amplifier driven to clipping produces distorted waveforms rich in harmonics that can overheat tweeters. A higher-powered amplifier with headroom delivers clean, undistorted signal at normal listening levels. The key is responsible volume control, not exact wattage matching."
    },
    {
      scenario: "A sound system installer notices that when two identical subwoofers are placed facing each other 10 feet apart, the bass seems weak in the middle of the room. Moving one subwoofer fixes the problem.",
      question: "What acoustic phenomenon caused the weak bass in the middle of the room?",
      options: [
        { id: 'a', label: "The subwoofers were too far apart, causing the sound to dissipate before reaching the center", correct: false },
        { id: 'b', label: "Phase cancellation occurred where the opposing sound waves met out of phase, destructively interfering", correct: true },
        { id: 'c', label: "The room's acoustics absorbed all the bass energy at that specific location", correct: false },
        { id: 'd', label: "The subwoofers' magnetic fields interfered with each other, reducing output", correct: false }
      ],
      explanation: "When speakers face each other, their sound waves can arrive at the midpoint out of phase (one pushing while the other pulls). This causes destructive interference where the waves cancel out, creating a null zone. Proper subwoofer placement considers phase relationships to avoid cancellation."
    }
  ];

  // Navigation
  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    emitGameEvent('phase_changed', { newPhase: p });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [emitGameEvent]);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) goToPhase(phaseOrder[idx + 1]);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) goToPhase(phaseOrder[idx - 1]);
  }, [phase, goToPhase]);

  // ============================================================================
  // REUSABLE COMPONENTS
  // ============================================================================

  const Button: React.FC<{
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
    disabled?: boolean;
    children: React.ReactNode;
    style?: React.CSSProperties;
  }> = ({ onClick, variant = 'primary', disabled, children, style }) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
          playSound('click');
          onClick();
        }
      }}
      disabled={disabled}
      style={{
        padding: isMobile ? '14px 20px' : '16px 28px',
        minHeight: '48px',
        minWidth: '48px',
        background: variant === 'primary'
          ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`
          : variant === 'secondary' ? colors.bgElevated : 'transparent',
        color: colors.textPrimary,
        border: variant === 'ghost' ? `1px solid ${colors.bgElevated}` : 'none',
        borderRadius: '12px',
        fontSize: isMobile ? '14px' : '16px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        ...style
      }}
    >
      {children}
    </button>
  );

  const SliderControl: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    unit: string;
    hint: string;
    onChange: (v: number) => void;
    color?: string;
    showImpact?: { current: string; status: string };
  }> = ({ label, value, min, max, unit, hint, onChange, color = colors.primary, showImpact }) => {
    const [isDragging, setIsDragging] = useState(false);

    return (
      <div style={{
        padding: isMobile ? '14px' : '18px',
        backgroundColor: colors.bgSurface,
        borderRadius: '12px',
        border: `1px solid ${isDragging ? color : colors.bgElevated}`,
        transition: 'border-color 0.2s'
      }}>
        <div style={{
          fontSize: isMobile ? '12px' : '14px',
          fontWeight: 600,
          color: colors.textPrimary,
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {label}
        </div>

        <div style={{
          fontSize: isMobile ? '28px' : '36px',
          fontWeight: 700,
          color: color,
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'baseline',
          gap: '4px'
        }}>
          <span>{value}</span>
          <span style={{ fontSize: isMobile ? '16px' : '20px', color: colors.textSecondary }}>{unit}</span>
        </div>

        {showImpact && (
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '12px',
            padding: '10px 12px',
            backgroundColor: colors.bgDeep,
            borderRadius: '8px'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', color: colors.textMuted, marginBottom: '2px' }}>RESULT</div>
              <div style={{ fontSize: '14px', color: colors.textPrimary, fontWeight: 600 }}>{showImpact.current}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', color: colors.textMuted, marginBottom: '2px' }}>STATUS</div>
              <div style={{ fontSize: '14px', color: color, fontWeight: 600 }}>{showImpact.status}</div>
            </div>
          </div>
        )}

        <div style={{ height: '48px', display: 'flex', alignItems: 'center' }}>
          <input
            type="range"
            min={min}
            max={max}
            step={1}
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            onPointerDown={() => setIsDragging(true)}
            onPointerUp={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            style={{
              width: '100%',
              height: '48px',
              cursor: 'grab',
              accentColor: color,
              touchAction: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
          />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: colors.textMuted,
          marginTop: '4px'
        }}>
          <span>{min}{unit}</span>
          <span style={{ color: colors.textSecondary }}>← Drag to adjust →</span>
          <span>{max}{unit}</span>
        </div>

        <div style={{
          fontSize: isMobile ? '12px' : '13px',
          color: colors.textSecondary,
          marginTop: '10px',
          padding: '10px 12px',
          backgroundColor: `${color}10`,
          borderRadius: '8px',
          borderLeft: `3px solid ${color}`
        }}>
          💡 {hint}
        </div>
      </div>
    );
  };

  const ExplanationBox: React.FC<{
    whatHappens: string;
    whyItHappens: string;
    realWorldExample: string;
  }> = ({ whatHappens, whyItHappens, realWorldExample }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '14px' }}>
      <div style={{
        padding: '14px 16px',
        backgroundColor: `${colors.primary}15`,
        borderLeft: `4px solid ${colors.primary}`,
        borderRadius: '0 8px 8px 0'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: colors.primary, textTransform: 'uppercase', marginBottom: '6px' }}>
          What Happens
        </div>
        <div style={{ fontSize: isMobile ? '13px' : '14px', color: colors.textPrimary, lineHeight: 1.5 }}>
          {whatHappens}
        </div>
      </div>
      <div style={{
        padding: '14px 16px',
        backgroundColor: `${colors.force}15`,
        borderLeft: `4px solid ${colors.force}`,
        borderRadius: '0 8px 8px 0'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: colors.force, textTransform: 'uppercase', marginBottom: '6px' }}>
          Why It Happens (Lorentz Force)
        </div>
        <div style={{ fontSize: isMobile ? '13px' : '14px', color: colors.textPrimary, lineHeight: 1.5 }}>
          {whyItHappens}
        </div>
      </div>
      <div style={{
        padding: '14px 16px',
        backgroundColor: `${colors.success}15`,
        borderLeft: `4px solid ${colors.success}`,
        borderRadius: '0 8px 8px 0'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: colors.success, textTransform: 'uppercase', marginBottom: '6px' }}>
          Real-World Example
        </div>
        <div style={{ fontSize: isMobile ? '13px' : '14px', color: colors.textPrimary, lineHeight: 1.5 }}>
          {realWorldExample}
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // SPEAKER VISUALIZATION (Premium SVG with gradients and effects)
  // ============================================================================

  const SpeakerVisualization: React.FC<{
    showLabels?: boolean;
    showWaveform?: boolean;
    animated?: boolean;
  }> = ({ showLabels = true, showWaveform = true, animated = true }) => {
    const svgWidth = isMobile ? 340 : 500;
    const svgHeight = isMobile ? 320 : 400;
    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2;

    // Animation state
    const [animPhase, setAnimPhase] = useState(0);
    useEffect(() => {
      if (!animated) return;
      const interval = setInterval(() => {
        setAnimPhase(prev => (prev + audioFrequency / 50) % (Math.PI * 2));
      }, 16);
      return () => clearInterval(interval);
    }, [animated, audioFrequency]);

    // Current wire displacement (sinusoidal)
    const currentDisplacement = animated
      ? Math.sin(animPhase) * wireDisplacement
      : wireDisplacement * 0.7;

    // Current direction (for force calculation display)
    const currentDirection = Math.sin(animPhase) > 0 ? 1 : -1;

    // Waveform points
    const waveformPoints = useMemo(() => {
      const points: string[] = [];
      const waveWidth = 120;
      const waveHeight = 40 * (audioAmplitude / 100);
      for (let i = 0; i <= 60; i++) {
        const x = 20 + (i / 60) * waveWidth;
        const y = svgHeight - 50 + Math.sin((i / 60) * Math.PI * 4 + animPhase) * waveHeight;
        points.push(`${x},${y}`);
      }
      return points.join(' ');
    }, [animPhase, audioAmplitude, svgHeight]);

    // Sound wave rings for visualization
    const soundWaveRings = useMemo(() => {
      if (!animated || soundIntensity < 10) return [];
      const rings = [];
      for (let i = 0; i < 4; i++) {
        const phase = (animPhase * 2 + i * Math.PI / 2) % (Math.PI * 2);
        const scale = 0.5 + (phase / (Math.PI * 2)) * 1.5;
        const opacity = Math.max(0, 1 - phase / (Math.PI * 2)) * (soundIntensity / 100);
        rings.push({ scale, opacity, id: i });
      }
      return rings;
    }, [animPhase, animated, soundIntensity]);

    return (
      <div style={{ position: 'relative' }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ maxWidth: svgWidth, margin: '0 auto', display: 'block' }}
        >
          {/* === COMPREHENSIVE DEFS SECTION === */}
          <defs>
            {/* === MAGNET GRADIENTS === */}
            {/* Premium North pole magnet - metallic red with depth */}
            <linearGradient id="spkMagnetNorth" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7f1d1d" />
              <stop offset="15%" stopColor="#991b1b" />
              <stop offset="35%" stopColor="#dc2626" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="65%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>

            {/* Premium South pole magnet - metallic blue with depth */}
            <linearGradient id="spkMagnetSouth" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="15%" stopColor="#1d4ed8" />
              <stop offset="35%" stopColor="#2563eb" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="65%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>

            {/* Magnet yoke - brushed steel effect */}
            <linearGradient id="spkYokeMetal" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="20%" stopColor="#374151" />
              <stop offset="40%" stopColor="#4b5563" />
              <stop offset="60%" stopColor="#374151" />
              <stop offset="80%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Magnet yoke vertical gradient for 3D effect */}
            <linearGradient id="spkYokeDepth" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="20%" stopColor="#374151" />
              <stop offset="80%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>

            {/* === VOICE COIL / WIRE GRADIENTS === */}
            {/* Premium copper wire with 3D shading */}
            <linearGradient id="spkCopperWire" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="15%" stopColor="#fcd34d" />
              <stop offset="35%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>

            {/* Wire highlight for specular reflection */}
            <linearGradient id="spkWireHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
              <stop offset="30%" stopColor="rgba(255,255,255,0.2)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>

            {/* Voice coil winding pattern */}
            <linearGradient id="spkCoilWinding" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="10%" stopColor="#d97706" />
              <stop offset="20%" stopColor="#b45309" />
              <stop offset="30%" stopColor="#d97706" />
              <stop offset="40%" stopColor="#b45309" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="60%" stopColor="#b45309" />
              <stop offset="70%" stopColor="#d97706" />
              <stop offset="80%" stopColor="#b45309" />
              <stop offset="90%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            {/* Terminal connector metallic */}
            <radialGradient id="spkTerminal" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#a8a29e" />
              <stop offset="40%" stopColor="#78716c" />
              <stop offset="80%" stopColor="#57534e" />
              <stop offset="100%" stopColor="#44403c" />
            </radialGradient>

            {/* === CURRENT & ELECTRICITY GRADIENTS === */}
            {/* Electric current glow */}
            <radialGradient id="spkCurrentGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
              <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
            </radialGradient>

            {/* Current flow beam */}
            <linearGradient id="spkCurrentBeam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
              <stop offset="30%" stopColor="#67e8f9" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#a5f3fc" stopOpacity="1" />
              <stop offset="70%" stopColor="#67e8f9" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.2" />
            </linearGradient>

            {/* === FORCE VECTOR GRADIENTS === */}
            {/* Lorentz force arrow gradient */}
            <linearGradient id="spkForceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e879f9" />
              <stop offset="30%" stopColor="#c084fc" />
              <stop offset="60%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>

            {/* Force arrow glow */}
            <radialGradient id="spkForceGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e879f9" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </radialGradient>

            {/* === MAGNETIC FIELD GRADIENTS === */}
            {/* B-field line gradient */}
            <linearGradient id="spkFieldLine" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#dc2626" stopOpacity="0.6" />
              <stop offset="25%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#c084fc" stopOpacity="1" />
              <stop offset="75%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
            </linearGradient>

            {/* === SPEAKER CONE GRADIENTS === */}
            {/* Speaker cone 3D effect */}
            <radialGradient id="spkConeGradient" cx="50%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="30%" stopColor="#334155" />
              <stop offset="60%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>

            {/* Cone dust cap */}
            <radialGradient id="spkDustCap" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </radialGradient>

            {/* === SOUND WAVE GRADIENTS === */}
            {/* Sound wave ring */}
            <radialGradient id="spkSoundWave" cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="#06b6d4" stopOpacity="0" />
              <stop offset="85%" stopColor="#22d3ee" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#67e8f9" stopOpacity="0" />
            </radialGradient>

            {/* Waveform display gradient */}
            <linearGradient id="spkWaveformGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="25%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="75%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>

            {/* === BACKGROUND GRADIENTS === */}
            {/* Lab background */}
            <linearGradient id="spkLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="30%" stopColor="#0a101a" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Air gap darkness */}
            <linearGradient id="spkAirGap" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#020617" />
              <stop offset="50%" stopColor="#030712" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Info panel background */}
            <linearGradient id="spkPanelBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(15,23,42,0.98)" />
              <stop offset="100%" stopColor="rgba(2,6,23,0.95)" />
            </linearGradient>

            {/* === GLOW FILTERS === */}
            {/* Premium wire glow effect */}
            <filter id="spkWireGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur1" />
              <feGaussianBlur stdDeviation="2" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Current particle glow */}
            <filter id="spkCurrentGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Force arrow glow */}
            <filter id="spkForceGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Magnet shadow with depth */}
            <filter id="spkMagnetShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="3" dy="5" stdDeviation="6" floodOpacity="0.5" />
            </filter>

            {/* Inner glow for panels */}
            <filter id="spkPanelGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Sound wave pulse filter */}
            <filter id="spkSoundPulse" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* === ARROW MARKERS === */}
            {/* Force arrow marker */}
            <marker id="spkForceArrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
              <path d="M0,2 L10,5 L0,8 L2,5 Z" fill="url(#spkForceGradient)" />
            </marker>

            {/* Current arrow marker */}
            <marker id="spkCurrentArrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <path d="M0,1 L8,4 L0,7 L1.5,4 Z" fill="#67e8f9" />
            </marker>

            {/* B-field arrow marker */}
            <marker id="spkFieldArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#c084fc" />
            </marker>

            {/* === PATTERNS === */}
            {/* Lab grid pattern */}
            <pattern id="spkLabGrid" width="25" height="25" patternUnits="userSpaceOnUse">
              <rect width="25" height="25" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>

            {/* Voice coil winding pattern */}
            <pattern id="spkCoilPattern" width="6" height="12" patternUnits="userSpaceOnUse">
              <rect width="6" height="12" fill="#b45309" />
              <rect x="0" y="0" width="6" height="2" fill="#d97706" />
              <rect x="0" y="6" width="6" height="2" fill="#d97706" />
            </pattern>
          </defs>

          {/* === PREMIUM BACKGROUND === */}
          <rect width={svgWidth} height={svgHeight} fill="url(#spkLabBg)" rx="12" />
          <rect width={svgWidth} height={svgHeight} fill="url(#spkLabGrid)" rx="12" />

          {/* === SOUND WAVE VISUALIZATION (behind speaker) === */}
          {soundWaveRings.map(ring => (
            <ellipse
              key={ring.id}
              cx={centerX + 120}
              cy={centerY}
              rx={30 * ring.scale}
              ry={50 * ring.scale}
              fill="none"
              stroke="url(#spkSoundWave)"
              strokeWidth="3"
              opacity={ring.opacity}
              filter="url(#spkSoundPulse)"
            />
          ))}

          {/* === PREMIUM MAGNET ASSEMBLY === */}
          <g filter="url(#spkMagnetShadow)">
            {/* Magnet yoke (back plate) with 3D effect */}
            <rect
              x={centerX - 100}
              y={centerY - 80}
              width={200}
              height={160}
              rx="8"
              fill="url(#spkYokeMetal)"
            />
            {/* Yoke depth shading */}
            <rect
              x={centerX - 100}
              y={centerY - 80}
              width={200}
              height={160}
              rx="8"
              fill="url(#spkYokeDepth)"
              opacity="0.5"
            />
            {/* Yoke highlight edge */}
            <rect
              x={centerX - 100}
              y={centerY - 80}
              width={200}
              height={6}
              rx="3"
              fill="rgba(255,255,255,0.1)"
            />

            {/* Magnet yoke inner detail */}
            <rect
              x={centerX - 95}
              y={centerY - 75}
              width={190}
              height={150}
              rx="6"
              fill="#111827"
              opacity="0.6"
            />

            {/* North pole magnet (top) with metallic sheen */}
            <rect
              x={centerX - 80}
              y={centerY - 65}
              width={160}
              height={45}
              rx="4"
              fill="url(#spkMagnetNorth)"
            />
            {/* North magnet highlight */}
            <rect
              x={centerX - 78}
              y={centerY - 63}
              width={156}
              height={8}
              rx="2"
              fill="rgba(255,255,255,0.15)"
            />

            {/* South pole magnet (bottom) with metallic sheen */}
            <rect
              x={centerX - 80}
              y={centerY + 20}
              width={160}
              height={45}
              rx="4"
              fill="url(#spkMagnetSouth)"
            />
            {/* South magnet highlight */}
            <rect
              x={centerX - 78}
              y={centerY + 22}
              width={156}
              height={8}
              rx="2"
              fill="rgba(255,255,255,0.12)"
            />

            {/* Air gap (where the voice coil goes) */}
            <rect
              x={centerX - 80}
              y={centerY - 18}
              width={160}
              height={36}
              fill="url(#spkAirGap)"
              stroke="#1f2937"
              strokeWidth="1"
            />

            {/* Air gap inner shadow */}
            <rect
              x={centerX - 78}
              y={centerY - 16}
              width={156}
              height={32}
              fill="none"
              stroke="rgba(0,0,0,0.3)"
              strokeWidth="2"
              rx="1"
            />
          </g>

          {/* === MAGNETIC FIELD LINES === */}
          <g opacity={magnetStrength / 120 + 0.2}>
            {[-2, -1, 0, 1, 2].map(i => {
              const xOffset = i * 30;
              return (
                <g key={i}>
                  <line
                    x1={centerX + xOffset}
                    y1={centerY - 58}
                    x2={centerX + xOffset}
                    y2={centerY + 58}
                    stroke="url(#spkFieldLine)"
                    strokeWidth="2"
                    strokeDasharray="6,4"
                    opacity="0.7"
                    markerEnd="url(#spkFieldArrow)"
                  />
                  {/* Field line glow */}
                  <line
                    x1={centerX + xOffset}
                    y1={centerY - 58}
                    x2={centerX + xOffset}
                    y2={centerY + 58}
                    stroke="#a855f7"
                    strokeWidth="4"
                    strokeDasharray="6,4"
                    opacity="0.15"
                  />
                </g>
              );
            })}
          </g>

          {/* === PREMIUM VOICE COIL / WIRE === */}
          <g transform={`translate(0, ${currentDisplacement})`}>
            {/* Wire glow when active */}
            {audioAmplitude > 30 && (
              <rect
                x={centerX - 72}
                y={centerY - 8}
                width={144}
                height={16}
                rx="8"
                fill="#fbbf24"
                opacity="0.3"
                filter="url(#spkWireGlow)"
              />
            )}

            {/* Voice coil winding detail (background) */}
            <rect
              x={centerX - 70}
              y={centerY - 6}
              width={140}
              height={12}
              rx="6"
              fill="url(#spkCoilPattern)"
              opacity="0.8"
            />

            {/* Main wire body with copper gradient */}
            <rect
              x={centerX - 70}
              y={centerY - 6}
              width={140}
              height={12}
              rx="6"
              fill="url(#spkCopperWire)"
              stroke="#78350f"
              strokeWidth="1"
            />

            {/* Wire specular highlight */}
            <rect
              x={centerX - 68}
              y={centerY - 5}
              width={136}
              height={4}
              rx="2"
              fill="url(#spkWireHighlight)"
            />

            {/* Wire shadow (bottom) */}
            <rect
              x={centerX - 68}
              y={centerY + 3}
              width={136}
              height={2}
              rx="1"
              fill="rgba(0,0,0,0.3)"
            />

            {/* Terminal connectors */}
            <circle cx={centerX - 78} cy={centerY} r="10" fill="url(#spkTerminal)" stroke="#44403c" strokeWidth="2" />
            <circle cx={centerX - 78} cy={centerY} r="5" fill="#292524" />
            <circle cx={centerX + 78} cy={centerY} r="10" fill="url(#spkTerminal)" stroke="#44403c" strokeWidth="2" />
            <circle cx={centerX + 78} cy={centerY} r="5" fill="#292524" />

            {/* Current flow visualization */}
            {audioAmplitude > 10 && (
              <g opacity={audioAmplitude / 100} filter="url(#spkCurrentGlowFilter)">
                {/* Current beam */}
                <line
                  x1={currentDirection > 0 ? centerX - 60 : centerX + 60}
                  y1={centerY}
                  x2={currentDirection > 0 ? centerX + 55 : centerX - 55}
                  y2={centerY}
                  stroke="url(#spkCurrentBeam)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  markerEnd="url(#spkCurrentArrow)"
                />

                {/* Animated current particles */}
                {[0, 1, 2, 3].map(i => {
                  const particleX = centerX - 55 + ((animPhase * 25 + i * 30) % 110);
                  return (
                    <circle
                      key={i}
                      cx={particleX}
                      cy={centerY}
                      r="5"
                      fill="url(#spkCurrentGlow)"
                    />
                  );
                })}
              </g>
            )}
          </g>

          {/* === LORENTZ FORCE VECTORS === */}
          {showForceVectors && wireDisplacement > 2 && (
            <g transform={`translate(0, ${currentDisplacement})`} filter="url(#spkForceGlowFilter)">
              {/* Force arrow glow background */}
              <line
                x1={centerX}
                y1={centerY}
                x2={centerX}
                y2={centerY + (currentDirection > 0 ? -45 : 45)}
                stroke="url(#spkForceGlow)"
                strokeWidth="10"
                strokeLinecap="round"
                opacity="0.5"
              />

              {/* Main force arrow */}
              <line
                x1={centerX}
                y1={centerY}
                x2={centerX}
                y2={centerY + (currentDirection > 0 ? -42 : 42)}
                stroke="url(#spkForceGradient)"
                strokeWidth="5"
                strokeLinecap="round"
                markerEnd="url(#spkForceArrow)"
              />
            </g>
          )}

          {/* === MINI SPEAKER CONE VISUALIZATION (side view) === */}
          <g transform={`translate(${centerX + 130}, ${centerY})`}>
            {/* Cone outline */}
            <path
              d={`M 0,${-25 + currentDisplacement * 0.5}
                  L 40,${-50 + currentDisplacement * 0.3}
                  L 40,${50 + currentDisplacement * 0.3}
                  L 0,${25 + currentDisplacement * 0.5} Z`}
              fill="url(#spkConeGradient)"
              stroke="#475569"
              strokeWidth="1"
            />
            {/* Dust cap */}
            <ellipse
              cx={5}
              cy={currentDisplacement * 0.5}
              rx="8"
              ry="15"
              fill="url(#spkDustCap)"
            />
            {/* Cone surround (flexible edge) */}
            <path
              d={`M 40,${-50 + currentDisplacement * 0.3}
                  Q 55,${-45 + currentDisplacement * 0.1} 55,0
                  Q 55,${45 + currentDisplacement * 0.1} 40,${50 + currentDisplacement * 0.3}`}
              fill="none"
              stroke="#374151"
              strokeWidth="4"
              opacity="0.7"
            />
          </g>

          {/* === WAVEFORM DISPLAY (Audio Signal) === */}
          {showWaveform && (
            <g>
              <rect
                x={15}
                y={svgHeight - 90}
                width={130}
                height={80}
                rx="8"
                fill="url(#spkPanelBg)"
                stroke="#334155"
                strokeWidth="1"
              />
              {/* Panel inner glow */}
              <rect
                x={17}
                y={svgHeight - 88}
                width={126}
                height={76}
                rx="6"
                fill="none"
                stroke="rgba(6,182,212,0.1)"
                strokeWidth="1"
              />

              {/* Waveform with gradient */}
              <polyline
                points={waveformPoints}
                fill="none"
                stroke="url(#spkWaveformGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Center baseline */}
              <line
                x1={20}
                y1={svgHeight - 50}
                x2={140}
                y2={svgHeight - 50}
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.6"
              />
            </g>
          )}

          {/* === DISPLACEMENT METER === */}
          {showLabels && (
            <g transform={`translate(${svgWidth - 100}, ${svgHeight - 90})`}>
              <rect x={0} y={0} width={90} height={80} rx="8" fill="url(#spkPanelBg)" stroke="#334155" strokeWidth="1" />

              {/* Displacement bar background */}
              <rect x={15} y={28} width={60} height={10} rx="5" fill="#1e293b" />
              {/* Displacement bar fill */}
              <rect
                x={15}
                y={28}
                width={Math.min(60, wireDisplacement * 2.4)}
                height={10}
                rx="5"
                fill={wireDisplacement > 15 ? colors.success : wireDisplacement > 8 ? colors.warning : '#475569'}
              />
              {/* Bar highlight */}
              <rect
                x={15}
                y={28}
                width={Math.min(60, wireDisplacement * 2.4)}
                height={3}
                rx="1.5"
                fill="rgba(255,255,255,0.2)"
              />
            </g>
          )}

          {/* === LEGEND PANEL === */}
          {showLabels && (
            <g transform={`translate(${svgWidth - 120}, 70)`}>
              <rect x={0} y={0} width={110} height={58} rx="6" fill="url(#spkPanelBg)" stroke="#334155" strokeWidth="1" />
              {/* Current line */}
              <line x1={8} y1={15} x2={28} y2={15} stroke="url(#spkCurrentBeam)" strokeWidth="3" strokeLinecap="round" />
              {/* B-field line */}
              <line x1={8} y1={31} x2={28} y2={31} stroke="url(#spkFieldLine)" strokeWidth="2" strokeDasharray="4,3" />
              {/* Force line */}
              <line x1={8} y1={47} x2={28} y2={47} stroke="url(#spkForceGradient)" strokeWidth="3" strokeLinecap="round" />
            </g>
          )}
        </svg>

        {/* === TEXT LABELS OUTSIDE SVG (using typo system) === */}
        {showLabels && (
          <>
            {/* Waveform label */}
            {showWaveform && (
              <div style={{
                position: 'absolute',
                left: isMobile ? '25px' : '35px',
                bottom: isMobile ? '72px' : '82px',
                fontSize: typo.label,
                fontWeight: 600,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                AUDIO SIGNAL
              </div>
            )}

            {/* Displacement label and value */}
            <div style={{
              position: 'absolute',
              right: isMobile ? '25px' : '35px',
              bottom: isMobile ? '72px' : '82px',
              textAlign: 'center',
              width: '80px'
            }}>
              <div style={{
                fontSize: typo.label,
                fontWeight: 600,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px'
              }}>
                DISPLACEMENT
              </div>
              <div style={{
                fontSize: typo.heading,
                fontWeight: 700,
                color: colors.textPrimary
              }}>
                {wireDisplacement.toFixed(1)}mm
              </div>
              <div style={{
                fontSize: typo.label,
                color: colors.textMuted
              }}>
                Sound: {soundIntensity}%
              </div>
            </div>

            {/* Frequency display - Top left */}
            <div style={{
              position: 'absolute',
              left: isMobile ? '18px' : '22px',
              top: isMobile ? '18px' : '22px',
              textAlign: 'center',
              padding: '8px 12px',
              background: 'rgba(2,6,23,0.9)',
              borderRadius: '8px',
              border: '1px solid #334155'
            }}>
              <div style={{
                fontSize: typo.label,
                fontWeight: 600,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '2px'
              }}>
                FREQUENCY
              </div>
              <div style={{
                fontSize: typo.bodyLarge,
                fontWeight: 700,
                color: colors.current
              }}>
                {audioFrequency}Hz
              </div>
            </div>

            {/* Magnet strength - Top right */}
            <div style={{
              position: 'absolute',
              right: isMobile ? '18px' : '22px',
              top: isMobile ? '18px' : '22px',
              textAlign: 'center',
              padding: '8px 12px',
              background: 'rgba(2,6,23,0.9)',
              borderRadius: '8px',
              border: '1px solid #334155'
            }}>
              <div style={{
                fontSize: typo.label,
                fontWeight: 600,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '2px'
              }}>
                B-FIELD
              </div>
              <div style={{
                fontSize: typo.bodyLarge,
                fontWeight: 700,
                color: colors.magnet
              }}>
                {magnetStrength}%
              </div>
            </div>

            {/* Force label (when showing force vectors) */}
            {showForceVectors && wireDisplacement > 2 && (
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(30px, ${currentDisplacement + (Math.sin(animPhase) > 0 ? -50 : 20)}px)`,
                padding: '4px 10px',
                background: 'rgba(168,85,247,0.2)',
                border: '1px solid #a855f7',
                borderRadius: '6px',
                fontSize: typo.small,
                fontWeight: 700,
                color: colors.force
              }}>
                F
              </div>
            )}

            {/* Legend labels */}
            <div style={{
              position: 'absolute',
              right: isMobile ? '18px' : '22px',
              top: isMobile ? '82px' : '86px',
              fontSize: typo.label,
              color: colors.textMuted,
              lineHeight: '16px'
            }}>
              <div style={{ marginBottom: '1px', marginLeft: '32px' }}>Current (I)</div>
              <div style={{ marginBottom: '1px', marginLeft: '32px', marginTop: '6px' }}>B-Field</div>
              <div style={{ marginLeft: '32px', marginTop: '6px' }}>Force (F)</div>
            </div>

            {/* Formula display - Bottom center */}
            <div style={{
              position: 'absolute',
              left: '50%',
              bottom: isMobile ? '12px' : '16px',
              transform: 'translateX(-50%)',
              padding: '6px 16px',
              background: 'rgba(168,85,247,0.15)',
              border: '1px solid #a855f7',
              borderRadius: '8px',
              fontSize: typo.body,
              fontWeight: 600,
              color: colors.textPrimary
            }}>
              F = B × I × L
            </div>

            {/* N/S pole labels */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(-50%, ${isMobile ? -52 : -58}px)`,
              fontSize: typo.body,
              fontWeight: 700,
              color: '#fef2f2'
            }}>
              N
            </div>
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(-50%, ${isMobile ? 38 : 42}px)`,
              fontSize: typo.body,
              fontWeight: 700,
              color: '#eff6ff'
            }}>
              S
            </div>
          </>
        )}
      </div>
    );
  };

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  const renderHook = () => (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isMobile ? '20px' : '40px',
      textAlign: 'center'
    }}>
      <div style={{
        padding: '8px 20px',
        background: `${colors.primary}20`,
        border: `1px solid ${colors.primary}40`,
        borderRadius: '100px',
        marginBottom: '24px'
      }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: colors.primary, textTransform: 'uppercase' }}>
          Lorentz Force in Action
        </span>
      </div>

      <h1 style={{
        fontSize: isMobile ? '28px' : '40px',
        fontWeight: 700,
        color: colors.textPrimary,
        marginBottom: '20px',
        lineHeight: 1.2
      }}>
        Can Electricity Push<br />a Wire Back and Forth?
      </h1>

      <p style={{
        fontSize: isMobile ? '16px' : '18px',
        color: colors.textSecondary,
        maxWidth: '500px',
        marginBottom: '24px',
        lineHeight: 1.6
      }}>
        Every speaker, headphone, and microphone relies on a simple principle:
        <strong style={{ color: colors.force }}> a wire carrying current in a magnetic field feels a force</strong>.
        Let's discover how electricity becomes sound.
      </p>

      <div style={{
        width: '100%',
        maxWidth: '400px',
        height: isMobile ? '220px' : '280px',
        marginBottom: '32px',
        backgroundColor: colors.bgSurface,
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        <SpeakerVisualization showLabels={false} showWaveform={false} />
      </div>

      <Button onClick={goNext}>
        Explore the Force →
      </Button>
    </div>
  );

  const renderPredict = () => (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: isMobile ? '16px' : '32px'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <span style={{ fontSize: '11px', color: colors.primary, fontWeight: 600, textTransform: 'uppercase' }}>
          Step 2 of 10 • Make a Prediction
        </span>

        <h2 style={{
          fontSize: isMobile ? '22px' : '28px',
          color: colors.textPrimary,
          margin: '12px 0 20px'
        }}>
          What happens when AC current flows through a wire in a magnetic field?
        </h2>

        <p style={{
          color: colors.textSecondary,
          marginBottom: '24px',
          lineHeight: 1.6
        }}>
          A thin copper wire is suspended between two strong magnets.
          When we connect it to an audio signal (alternating current that changes direction rapidly), what will happen?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {[
            { id: 'nothing', icon: '🔇', label: 'Nothing happens', desc: 'The wire just gets warm' },
            { id: 'vibrate', icon: '〰️', label: 'The wire vibrates back and forth', desc: 'Following the changing current' },
            { id: 'spin', icon: '🔄', label: 'The wire spins in circles', desc: 'Like a motor' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => { setPrediction(opt.id); playSound('click'); }}
              style={{
                padding: '16px',
                background: prediction === opt.id ? `${colors.primary}20` : colors.bgSurface,
                border: prediction === opt.id ? `2px solid ${colors.primary}` : `1px solid ${colors.bgElevated}`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '28px' }}>{opt.icon}</span>
              <div>
                <div style={{ color: colors.textPrimary, fontWeight: 600 }}>{opt.label}</div>
                <div style={{ color: colors.textMuted, fontSize: '13px' }}>{opt.desc}</div>
              </div>
              {prediction === opt.id && (
                <span style={{ marginLeft: 'auto', color: colors.primary, fontSize: '20px' }}>✓</span>
              )}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
          <Button variant="ghost" onClick={goBack}>← Back</Button>
          <Button onClick={goNext} disabled={!prediction}>Test It →</Button>
        </div>
      </div>
    </div>
  );

  const renderPlay = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: isMobile ? '12px 16px' : '16px 24px',
        borderBottom: `1px solid ${colors.bgElevated}`,
        background: colors.bgSurface
      }}>
        <span style={{ fontSize: '11px', color: colors.primary, fontWeight: 600 }}>
          Step 3 of 10 • Interactive Experiment
        </span>
        <h2 style={{
          fontSize: isMobile ? '18px' : '22px',
          color: colors.textPrimary,
          margin: '4px 0'
        }}>
          LORENTZ FORCE SPEAKER
        </h2>
        <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0 }}>
          Adjust the audio signal and magnetic field to see how the wire moves
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px' : '20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Visualization */}
          <div style={{
            backgroundColor: colors.bgSurface,
            borderRadius: '12px',
            padding: '8px',
            marginBottom: '16px'
          }}>
            <SpeakerVisualization />
          </div>

          {/* Controls */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <SliderControl
              label="Audio Amplitude"
              value={audioAmplitude}
              min={0}
              max={100}
              unit="%"
              hint="Higher amplitude = more current = stronger force"
              onChange={setAudioAmplitude}
              color={colors.current}
              showImpact={{
                current: `${wireDisplacement.toFixed(1)}mm`,
                status: wireDisplacement > 15 ? 'Strong' : wireDisplacement > 8 ? 'Medium' : 'Weak'
              }}
            />
            <SliderControl
              label="Magnet Strength"
              value={magnetStrength}
              min={10}
              max={100}
              unit="%"
              hint="Stronger magnetic field = more force on the wire"
              onChange={setMagnetStrength}
              color={colors.magnet}
            />
          </div>

          {/* Frequency control */}
          <SliderControl
            label="Audio Frequency"
            value={audioFrequency}
            min={20}
            max={2000}
            unit="Hz"
            hint="This is the pitch of the sound - low = bass, high = treble"
            onChange={setAudioFrequency}
            color={colors.accent}
          />
        </div>
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid ${colors.bgElevated}`,
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <Button variant="ghost" onClick={goBack}>← Back</Button>
        <Button onClick={goNext}>See Why →</Button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <span style={{ fontSize: '11px', color: colors.primary, fontWeight: 600 }}>
          Step 4 of 10 • Understanding
        </span>
        <h2 style={{
          fontSize: isMobile ? '22px' : '28px',
          color: colors.textPrimary,
          margin: '12px 0 24px'
        }}>
          The Lorentz Force: Electricity Creates Motion
        </h2>

        <ExplanationBox
          whatHappens="When alternating current flows through the wire, it vibrates back and forth. The direction of movement reverses each time the current direction changes. This vibration pushes air molecules, creating sound waves you can hear."
          whyItHappens="The Lorentz Force (F = BIL) acts on any current-carrying wire in a magnetic field. B is the magnetic field strength, I is the current, and L is the wire length. When current alternates (AC), the force alternates too, causing oscillation."
          realWorldExample="Every speaker uses this principle! A coil of wire (voice coil) sits in a magnetic gap. Audio signals drive current through the coil, making it vibrate. The coil is attached to a cone that amplifies these vibrations into the sound you hear from your headphones, phone speakers, and concert PA systems."
        />

        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: `${colors.warning}15`,
          borderRadius: '12px',
          border: `1px solid ${colors.warning}40`
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: colors.warning, marginBottom: '8px' }}>
            ⚡ Safety Note
          </div>
          <div style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.5 }}>
            Keep currents low when experimenting. Never short audio outputs directly - always use appropriate resistance. The wire should be thin and light to move easily.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '24px' }}>
          <Button variant="ghost" onClick={goBack}>← Back</Button>
          <Button onClick={goNext}>Try the Twist →</Button>
        </div>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <span style={{ fontSize: '11px', color: colors.accent, fontWeight: 600, textTransform: 'uppercase' }}>
          Step 5 of 10 • Twist Prediction
        </span>

        <h2 style={{
          fontSize: isMobile ? '22px' : '28px',
          color: colors.textPrimary,
          margin: '12px 0 20px'
        }}>
          What happens when you change the frequency?
        </h2>

        <p style={{ color: colors.textSecondary, marginBottom: '24px', lineHeight: 1.6 }}>
          You've seen the wire vibrate. Now, what if we change the frequency of the audio signal from low (bass) to high (treble)?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {[
            { id: 'same', icon: '➡️', label: 'Same displacement, just faster', desc: 'Wire moves the same distance at any frequency' },
            { id: 'less', icon: '📉', label: 'Less displacement at higher frequencies', desc: 'Wire can\'t keep up with fast changes' },
            { id: 'more', icon: '📈', label: 'More displacement at higher frequencies', desc: 'Higher frequency means more energy' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => { setTwistPrediction(opt.id); playSound('click'); }}
              style={{
                padding: '16px',
                background: twistPrediction === opt.id ? `${colors.accent}20` : colors.bgSurface,
                border: twistPrediction === opt.id ? `2px solid ${colors.accent}` : `1px solid ${colors.bgElevated}`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '28px' }}>{opt.icon}</span>
              <div>
                <div style={{ color: colors.textPrimary, fontWeight: 600 }}>{opt.label}</div>
                <div style={{ color: colors.textMuted, fontSize: '13px' }}>{opt.desc}</div>
              </div>
              {twistPrediction === opt.id && (
                <span style={{ marginLeft: 'auto', color: colors.accent }}>✓</span>
              )}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
          <Button variant="ghost" onClick={goBack}>← Back</Button>
          <Button onClick={goNext} disabled={!twistPrediction}>Test It →</Button>
        </div>
      </div>
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: isMobile ? '12px 16px' : '16px 24px',
        borderBottom: `1px solid ${colors.bgElevated}`,
        background: `linear-gradient(135deg, ${colors.accent}20 0%, ${colors.bgSurface} 100%)`
      }}>
        <span style={{ fontSize: '11px', color: colors.accent, fontWeight: 600 }}>
          Step 6 of 10 • Twist Experiment
        </span>
        <h2 style={{ fontSize: isMobile ? '18px' : '22px', color: colors.textPrimary, margin: '4px 0' }}>
          FREQUENCY RESPONSE
        </h2>
        <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0 }}>
          Sweep the frequency and watch how the wire's response changes
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px' : '20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{
            backgroundColor: colors.bgSurface,
            borderRadius: '12px',
            padding: '8px',
            marginBottom: '16px'
          }}>
            <SpeakerVisualization />
          </div>

          <SliderControl
            label="Sweep Frequency"
            value={audioFrequency}
            min={20}
            max={2000}
            unit="Hz"
            hint="Notice: Real speakers have different responses at different frequencies. Subwoofers handle bass, tweeters handle treble."
            onChange={setAudioFrequency}
            color={colors.accent}
            showImpact={{
              current: audioFrequency < 200 ? 'Bass' : audioFrequency < 800 ? 'Midrange' : 'Treble',
              status: `${audioFrequency}Hz`
            }}
          />
        </div>
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid ${colors.bgElevated}`,
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <Button variant="ghost" onClick={goBack}>← Back</Button>
        <Button onClick={goNext}>Continue →</Button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <span style={{ fontSize: '11px', color: colors.accent, fontWeight: 600 }}>
          Step 7 of 10 • Twist Understanding
        </span>

        <h2 style={{
          fontSize: isMobile ? '22px' : '28px',
          color: colors.textPrimary,
          margin: '12px 0 24px'
        }}>
          Why Speakers Need Different Drivers
        </h2>

        <ExplanationBox
          whatHappens="At higher frequencies, the wire vibrates faster but with smaller displacement. At lower frequencies, it moves larger distances but more slowly. Each speaker driver is optimized for a specific frequency range."
          whyItHappens="Mechanical inertia limits how quickly the wire can change direction. Heavy cones move well at low frequencies (woofers), while light diaphragms respond to high frequencies (tweeters). This is why quality speakers have multiple drivers."
          realWorldExample="A typical home speaker has a woofer (bass), midrange driver, and tweeter (treble). A crossover circuit sends different frequencies to each driver. Subwoofers are even larger and heavier for the deepest bass notes."
        />

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '24px' }}>
          <Button variant="ghost" onClick={goBack}>← Back</Button>
          <Button onClick={goNext}>Real World →</Button>
        </div>
      </div>
    </div>
  );

  const renderTransfer = () => {
    const applications = [
      {
        title: 'Headphones & Earbuds',
        icon: '🎧',
        description: 'Tiny voice coils in miniature magnetic gaps. The same Lorentz force principle, just scaled down incredibly small.',
        insight: 'Premium headphones use neodymium magnets for stronger fields in less space.'
      },
      {
        title: 'Concert Speakers',
        icon: '🔊',
        description: 'Massive voice coils, huge magnets, and reinforced cones to move serious amounts of air.',
        insight: 'Large speakers can draw hundreds of watts and produce forces that shake buildings.'
      },
      {
        title: 'Electric Guitar Pickups',
        icon: '🎸',
        description: 'Works in reverse! String vibration near magnets induces current in coils.',
        insight: 'Same physics, opposite direction: motion → electricity instead of electricity → motion.'
      },
      {
        title: 'MRI Machines',
        icon: '🏥',
        description: 'The loud knocking sound in MRI comes from Lorentz forces on gradient coils.',
        insight: 'Powerful magnetic fields + rapid current changes = intense mechanical forces.'
      }
    ];

    return (
      <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <span style={{ fontSize: '11px', color: colors.success, fontWeight: 600 }}>
            Step 8 of 10 • Real-World Applications
          </span>

          <h2 style={{ fontSize: isMobile ? '22px' : '28px', color: colors.textPrimary, margin: '12px 0 24px' }}>
            The Lorentz Force is Everywhere
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {applications.map((app, i) => (
              <div
                key={i}
                onClick={() => {
                  const newCompleted = [...completedApps];
                  newCompleted[i] = true;
                  setCompletedApps(newCompleted);
                  setActiveApp(i);
                  playSound('click');
                }}
                style={{
                  padding: '16px',
                  backgroundColor: activeApp === i ? `${colors.success}15` : colors.bgSurface,
                  border: `1px solid ${completedApps[i] ? colors.success : colors.bgElevated}`,
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px' }}>{app.icon}</span>
                  <span style={{ color: colors.textPrimary, fontWeight: 600 }}>{app.title}</span>
                  {completedApps[i] && <span style={{ marginLeft: 'auto', color: colors.success }}>✓</span>}
                </div>
                {activeApp === i && (
                  <>
                    <p style={{ color: colors.textSecondary, fontSize: '14px', margin: '8px 0', lineHeight: 1.5 }}>
                      {app.description}
                    </p>
                    <p style={{ color: colors.accent, fontSize: '13px', margin: 0, fontStyle: 'italic' }}>
                      💡 {app.insight}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '24px' }}>
            <Button variant="ghost" onClick={goBack}>← Back</Button>
            <Button onClick={goNext} disabled={!completedApps.some(c => c)}>
              Take the Test →
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderTest = () => {
    const currentQ = testQuestions[currentQuestion];
    const selectedAnswer = testAnswers[currentQuestion];
    const hasAnswered = selectedAnswer !== null;
    const selectedOption = hasAnswered ? currentQ.options[selectedAnswer] : null;
    const isCorrect = selectedOption?.correct ?? false;

    return (
      <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '16px' : '32px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <span style={{ fontSize: '11px', color: colors.primary, fontWeight: 600, textTransform: 'uppercase' }}>
              Step 9 of 10 - Question {currentQuestion + 1} of {testQuestions.length}
            </span>
            <span style={{
              fontSize: '14px',
              color: colors.textSecondary,
              padding: '4px 12px',
              backgroundColor: colors.bgSurface,
              borderRadius: '12px'
            }}>
              Score: {testScore}/{testQuestions.length}
            </span>
          </div>

          {/* Scenario Box */}
          <div style={{
            padding: '16px 20px',
            backgroundColor: `${colors.primary}10`,
            borderLeft: `4px solid ${colors.primary}`,
            borderRadius: '0 12px 12px 0',
            marginBottom: '20px'
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: colors.primary,
              textTransform: 'uppercase',
              marginBottom: '8px',
              letterSpacing: '0.5px'
            }}>
              Scenario
            </div>
            <div style={{
              fontSize: isMobile ? '14px' : '15px',
              color: colors.textSecondary,
              lineHeight: 1.6
            }}>
              {currentQ.scenario}
            </div>
          </div>

          {/* Question */}
          <h2 style={{
            fontSize: isMobile ? '18px' : '22px',
            color: colors.textPrimary,
            margin: '0 0 20px',
            lineHeight: 1.4
          }}>
            {currentQ.question}
          </h2>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentQ.options.map((opt, i) => {
              const isSelected = selectedAnswer === i;
              const showCorrect = hasAnswered && opt.correct;
              const showIncorrect = hasAnswered && isSelected && !opt.correct;

              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    if (hasAnswered) return;
                    const newAnswers = [...testAnswers];
                    newAnswers[currentQuestion] = i;
                    setTestAnswers(newAnswers);
                    if (opt.correct) setTestScore(prev => prev + 1);
                    playSound(opt.correct ? 'success' : 'failure');
                  }}
                  disabled={hasAnswered}
                  style={{
                    padding: '16px 20px',
                    background: showCorrect
                      ? `${colors.success}15`
                      : showIncorrect
                        ? `${colors.error}15`
                        : colors.bgSurface,
                    border: showCorrect
                      ? `2px solid ${colors.success}`
                      : showIncorrect
                        ? `2px solid ${colors.error}`
                        : `1px solid ${colors.bgElevated}`,
                    borderRadius: '12px',
                    color: colors.textPrimary,
                    fontSize: isMobile ? '14px' : '15px',
                    textAlign: 'left',
                    cursor: hasAnswered ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    transition: 'all 0.2s',
                    opacity: hasAnswered && !isSelected && !opt.correct ? 0.6 : 1
                  }}
                >
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: showCorrect
                      ? colors.success
                      : showIncorrect
                        ? colors.error
                        : colors.bgElevated,
                    color: showCorrect || showIncorrect ? '#fff' : colors.textSecondary,
                    fontSize: '13px',
                    fontWeight: 600,
                    flexShrink: 0
                  }}>
                    {showCorrect ? '✓' : showIncorrect ? '✗' : opt.id.toUpperCase()}
                  </span>
                  <span style={{ lineHeight: 1.5, paddingTop: '3px' }}>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation (shown after answering) */}
          {hasAnswered && (
            <div style={{
              marginTop: '24px',
              padding: '16px 20px',
              backgroundColor: isCorrect ? `${colors.success}10` : `${colors.warning}10`,
              borderLeft: `4px solid ${isCorrect ? colors.success : colors.warning}`,
              borderRadius: '0 12px 12px 0'
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: isCorrect ? colors.success : colors.warning,
                textTransform: 'uppercase',
                marginBottom: '8px',
                letterSpacing: '0.5px'
              }}>
                {isCorrect ? 'Correct!' : 'Explanation'}
              </div>
              <div style={{
                fontSize: isMobile ? '14px' : '15px',
                color: colors.textSecondary,
                lineHeight: 1.6
              }}>
                {currentQ.explanation}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'space-between',
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: `1px solid ${colors.bgElevated}`
          }}>
            <Button variant="ghost" onClick={goBack}>← Back</Button>
            {hasAnswered && (
              <Button onClick={() => {
                if (currentQuestion < testQuestions.length - 1) {
                  setCurrentQuestion(prev => prev + 1);
                } else {
                  goNext();
                }
              }}>
                {currentQuestion < testQuestions.length - 1 ? 'Next Question →' : 'See Results →'}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isMobile ? '20px' : '40px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉🔊</div>

      <h1 style={{
        fontSize: isMobile ? '28px' : '36px',
        fontWeight: 700,
        color: colors.textPrimary,
        marginBottom: '16px'
      }}>
        Mastery Achieved!
      </h1>

      <p style={{
        fontSize: isMobile ? '16px' : '18px',
        color: colors.textSecondary,
        maxWidth: '500px',
        marginBottom: '24px',
        lineHeight: 1.6
      }}>
        You now understand how the Lorentz force converts electrical signals into mechanical motion and sound. This principle powers every speaker and audio device in the world.
      </p>

      <div style={{
        padding: '20px',
        backgroundColor: colors.bgSurface,
        borderRadius: '12px',
        marginBottom: '24px'
      }}>
        <div style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '8px' }}>Test Score</div>
        <div style={{ color: colors.success, fontSize: '36px', fontWeight: 700 }}>{testScore}/10</div>
      </div>

      <Button onClick={() => goToPhase('hook')}>
        Start Over
      </Button>
    </div>
  );

  // Phase renderer mapping
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
      default: return renderHook();
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: colors.bgDeep,
      color: colors.textPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Progress bar */}
      <div style={{
        height: '4px',
        backgroundColor: colors.bgElevated,
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
          backgroundColor: colors.primary,
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {renderPhase()}
      </div>
    </div>
  );
};

export default SpeakerPrincipleRenderer;
