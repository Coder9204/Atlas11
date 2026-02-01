'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// STANDING WAVES - Premium Design System
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

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

const realWorldApps = [
  {
    icon: '🎸',
    title: 'Musical Instruments',
    short: 'Creating music through vibrating strings and air',
    tagline: 'Physics makes harmony',
    description: 'Every stringed and wind instrument produces sound through standing waves. Guitar strings, violin bows, and flute air columns all vibrate in specific patterns determined by their length, tension, and material.',
    connection: 'The harmonic series from standing waves creates the overtones that give each instrument its unique timbre. Nodes and antinodes determine where to place fingers or frets.',
    howItWorks: 'Plucking a string excites multiple harmonics simultaneously. The fundamental frequency determines pitch while the relative strength of overtones creates timbre. Instrument bodies amplify and shape these frequencies.',
    stats: [
      { value: '440Hz', label: 'Concert A pitch', icon: '🎵' },
      { value: '88', label: 'Piano keys (7+ octaves)', icon: '🎹' },
      { value: '20+', label: 'Audible harmonics', icon: '🔊' }
    ],
    examples: ['Guitar harmonics', 'Violin overtones', 'Pipe organ resonance', 'Didgeridoo drones'],
    companies: ['Steinway', 'Fender', 'Yamaha', 'Martin Guitar'],
    futureImpact: 'Digital instruments and synthesizers use standing wave physics to create realistic virtual instruments and entirely new sounds impossible with physical materials.',
    color: '#f59e0b'
  },
  {
    icon: '📡',
    title: 'Antenna Design',
    short: 'Radio waves in resonant structures',
    tagline: 'Tuned to the right frequency',
    description: 'Radio antennas work by creating standing electromagnetic waves. Dipole antennas are sized to be half a wavelength, creating current antinodes at feed points for maximum efficiency.',
    connection: 'Antenna length determines resonant frequency just like string length determines pitch. Standing wave ratio (SWR) measures how well antenna impedance matches the transmission line.',
    howItWorks: 'RF current flows back and forth in the antenna, creating standing waves of current and voltage. Maximum radiation occurs at current antinodes. Array antennas use interference between elements for beam steering.',
    stats: [
      { value: 'λ/2', label: 'Dipole antenna length', icon: '📏' },
      { value: '1.0', label: 'Perfect SWR', icon: '📊' },
      { value: '73Ω', label: 'Dipole impedance', icon: '⚡' }
    ],
    examples: ['Cell phone antennas', 'WiFi routers', 'TV broadcast towers', 'Satellite dishes'],
    companies: ['Qualcomm', 'Ericsson', 'CommScope', 'Laird Connectivity'],
    futureImpact: 'Metamaterial antennas will use engineered standing wave patterns to create ultra-thin, reconfigurable antennas for 6G communications and radar.',
    color: '#3b82f6'
  },
  {
    icon: '🔬',
    title: 'Laser Cavities',
    short: 'Light standing waves for coherent beams',
    tagline: 'Light waves in perfect sync',
    description: 'Lasers create coherent light using standing electromagnetic waves between mirrors. Only wavelengths that fit exactly between the mirrors are amplified, selecting specific frequencies for the laser beam.',
    connection: 'The laser cavity acts like a pipe for light waves. Mirror spacing determines which wavelengths form standing waves (cavity modes). Mode selection creates the laser\'s pure color.',
    howItWorks: 'Light bounces between mirrors, with some escaping through a partially reflective output coupler. Gain medium amplifies the standing wave. Mode locking synchronizes many standing wave modes for ultrashort pulses.',
    stats: [
      { value: '10^15', label: 'Light oscillations/second', icon: '💡' },
      { value: 'fs', label: 'Shortest pulse duration', icon: '⚡' },
      { value: '<1nm', label: 'Wavelength precision', icon: '🎯' }
    ],
    examples: ['Fiber optic communications', 'Laser surgery', 'Barcode scanners', 'Laser shows'],
    companies: ['Coherent', 'Trumpf', 'IPG Photonics', 'Lumentum'],
    futureImpact: 'Optical frequency combs using precisely spaced standing wave modes will enable atomic clocks and quantum sensors with unprecedented precision.',
    color: '#8b5cf6'
  },
  {
    icon: '🌊',
    title: 'Microwave Ovens',
    short: 'Standing waves cook your food',
    tagline: 'Hot spots and cold spots explained',
    description: 'Microwave ovens create standing electromagnetic waves inside a metal cavity. The uneven heating patterns (hot and cold spots) result from nodes and antinodes in these standing waves.',
    connection: 'The rotating turntable moves food through alternating nodes (cold) and antinodes (hot) of the microwave standing wave pattern, averaging out the heating.',
    howItWorks: 'A magnetron generates 2.45 GHz microwaves that reflect off metal walls. Interference creates a 3D standing wave pattern. Mode stirrers and turntables help distribute energy evenly.',
    stats: [
      { value: '12.2cm', label: 'Wavelength in oven', icon: '📏' },
      { value: '2.45GHz', label: 'Operating frequency', icon: '📡' },
      { value: '1000W', label: 'Typical power', icon: '⚡' }
    ],
    examples: ['Home microwave cooking', 'Industrial food processing', 'Laboratory heating', 'Material drying'],
    companies: ['Panasonic', 'LG', 'Samsung', 'Sharp'],
    futureImpact: 'Solid-state microwave generators will replace magnetrons, enabling precise standing wave control for uniform heating without turntables.',
    color: '#22c55e'
  }
];

interface StandingWavesRendererProps {
  width?: number;
  height?: number;
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const StandingWavesRenderer: React.FC<StandingWavesRendererProps> = ({ onGameEvent, gamePhase, onPhaseComplete }) => {
  // Phase state
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  });

  // Sync phase with external prop
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Game state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [harmonic, setHarmonic] = useState(1);
  const [tension, setTension] = useState(50);
  const [time, setTime] = useState(0);
  const [discoveredHarmonics, setDiscoveredHarmonics] = useState<number[]>([1]);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [testIndex, setTestIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [showResult, setShowResult] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const animationRef = useRef<number>();

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

  // Animation loop
  useEffect(() => {
    let lastTime = performance.now();
    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      setTime(t => t + delta * (1.5 + tension / 100));
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [tension]);

  // Track discovered harmonics
  useEffect(() => {
    if ((phase === 'play' || phase === 'twist_play') && !discoveredHarmonics.includes(harmonic)) {
      setDiscoveredHarmonics(prev => [...new Set([...prev, harmonic])].sort((a, b) => a - b));
    }
  }, [harmonic, phase, discoveredHarmonics]);

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
    setPhase(newPhase);
    playSound('transition');
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
    onPhaseComplete?.(newPhase);
  }, [phase, playSound, emitEvent, onPhaseComplete]);

  // Calculate frequency
  const baseFrequency = 80 + tension * 3.2;
  const frequency = Math.round(baseFrequency * harmonic);

  // Test questions
  const questions = [
    { question: "A rope fixed at both ends is shaken. When do stable standing wave patterns form?", options: [{ text: "Any frequency", correct: false }, { text: "Only resonant frequencies fitting whole half-wavelengths", correct: true }, { text: "Only low frequencies", correct: false }, { text: "Only high frequencies", correct: false }], explanation: "Standing waves form only at resonant frequencies where whole numbers of half-wavelengths fit between the fixed ends." },
    { question: "If the fundamental frequency is 100 Hz, what is the 3rd harmonic?", options: [{ text: "150 Hz", correct: false }, { text: "200 Hz", correct: false }, { text: "300 Hz", correct: true }, { text: "400 Hz", correct: false }], explanation: "Harmonics are integer multiples of the fundamental: 3rd harmonic = 3 x 100 Hz = 300 Hz." },
    { question: "How does increasing rope tension affect wave speed?", options: [{ text: "No effect", correct: false }, { text: "Increases speed", correct: true }, { text: "Decreases speed", correct: false }, { text: "Depends on frequency", correct: false }], explanation: "Wave speed v = sqrt(T/u). Higher tension = faster waves = higher resonant frequencies." },
    { question: "At a node in a standing wave, what do you observe?", options: [{ text: "Maximum motion", correct: false }, { text: "Zero motion", correct: true }, { text: "Half maximum", correct: false }, { text: "Random motion", correct: false }], explanation: "Nodes are points of destructive interference where the string stays stationary." },
    { question: "A string's 2nd harmonic is 330 Hz. What's the fundamental frequency?", options: [{ text: "110 Hz", correct: false }, { text: "165 Hz", correct: true }, { text: "220 Hz", correct: false }, { text: "660 Hz", correct: false }], explanation: "Fundamental = 2nd harmonic / 2 = 330 / 2 = 165 Hz." },
    { question: "What creates a standing wave on a fixed rope?", options: [{ text: "Two separate wave sources", correct: false }, { text: "A wave interfering with its reflection", correct: true }, { text: "Air resonance", correct: false }, { text: "Natural vibration", correct: false }], explanation: "Standing waves form when a traveling wave reflects off a fixed end and interferes with itself." },
    { question: "To raise a string's pitch without changing its length, you should:", options: [{ text: "Loosen the string", correct: false }, { text: "Tighten the string", correct: true }, { text: "Use a thicker string", correct: false }, { text: "It's impossible", correct: false }], explanation: "Increasing tension increases wave speed and therefore frequency (pitch)." },
    { question: "A standing wave has 4 nodes (including both ends). Which harmonic is this?", options: [{ text: "2nd harmonic", correct: false }, { text: "3rd harmonic", correct: true }, { text: "4th harmonic", correct: false }, { text: "5th harmonic", correct: false }], explanation: "The nth harmonic has (n+1) nodes including the endpoints. 4 nodes means n = 3 (3rd harmonic)." },
    { question: "Why do different instruments playing the same note sound different?", options: [{ text: "Different volumes", correct: false }, { text: "Different harmonic mixtures (timbre)", correct: true }, { text: "Different wave speeds", correct: false }, { text: "Room acoustics only", correct: false }], explanation: "Timbre comes from unique combinations of harmonics each instrument produces." },
    { question: "If you double the frequency while keeping wave speed constant, wavelength:", options: [{ text: "Doubles", correct: false }, { text: "Halves", correct: true }, { text: "Stays the same", correct: false }, { text: "Quadruples", correct: false }], explanation: "From v = f*lambda, if v is constant and f doubles, lambda must halve." }
  ];

  // Real-world applications
  const applications = [
    {
      id: 'guitar',
      title: 'Guitar Strings',
      subtitle: 'The Physics of Music',
      description: 'When you pluck a guitar string, it vibrates at specific frequencies determined by length, tension, and mass. Pressing frets shortens the vibrating length, raising pitch.',
      stat: 'f = (1/2L)sqrt(T/u)',
      color: '#f59e0b'
    },
    {
      id: 'laser',
      title: 'Laser Cavities',
      subtitle: 'Standing Light Waves',
      description: 'Lasers use mirrors to create standing light waves. Only wavelengths that form exact standing wave patterns are amplified, producing coherent, monochromatic light.',
      stat: 'L = n*lambda/2',
      color: '#8b5cf6'
    },
    {
      id: 'quantum',
      title: 'Electron Orbitals',
      subtitle: 'Quantum Standing Waves',
      description: 'Electrons in atoms behave as standing waves around the nucleus. Only whole-number wavelengths fit the orbit, explaining why only certain energy levels are allowed.',
      stat: 'n*lambda = 2*pi*r',
      color: '#10b981'
    },
    {
      id: 'acoustics',
      title: 'Room Acoustics',
      subtitle: 'Architectural Resonance',
      description: 'Parallel walls create standing waves called "room modes." Acoustic engineers use diffusers and absorbers to minimize problematic resonances in concert halls.',
      stat: 'f = c/(2L)',
      color: '#ec4899'
    }
  ];

  // Test questions - comprehensive scenario-based multiple choice
  const testQuestions = [
    {
      scenario: "A physics student plucks a guitar string and observes that certain points along the string remain completely still while others vibrate with maximum amplitude.",
      question: "What are these stationary points called, and why do they occur?",
      options: [
        { id: 'a', label: 'Antinodes - where constructive interference is maximum' },
        { id: 'b', label: 'Nodes - where destructive interference creates zero displacement', correct: true },
        { id: 'c', label: 'Harmonics - where the wave frequency is highest' },
        { id: 'd', label: 'Resonance points - where energy accumulates' }
      ],
      explanation: "Nodes are points where two waves traveling in opposite directions always cancel out through destructive interference, resulting in zero net displacement regardless of time."
    },
    {
      scenario: "A guitarist touches the 12th fret lightly while plucking the string, producing a clear harmonic one octave above the open string's fundamental note.",
      question: "Which harmonic mode is being isolated by this technique?",
      options: [
        { id: 'a', label: 'The fundamental (1st harmonic)' },
        { id: 'b', label: 'The 2nd harmonic', correct: true },
        { id: 'c', label: 'The 3rd harmonic' },
        { id: 'd', label: 'The 4th harmonic' }
      ],
      explanation: "The 12th fret is at the string's midpoint. Touching here creates a node that suppresses the fundamental, allowing only the 2nd harmonic (with a node at the center) to resonate, producing a note one octave higher."
    },
    {
      scenario: "A pipe organ has two types of pipes: open pipes (both ends open) and stopped pipes (one end closed). The organist notices that stopped pipes of the same length produce lower notes.",
      question: "Why do stopped pipes produce lower fundamental frequencies than open pipes of equal length?",
      options: [
        { id: 'a', label: 'Stopped pipes have more air resistance' },
        { id: 'b', label: 'Stopped pipes only support odd harmonics and have wavelength = 4L', correct: true },
        { id: 'c', label: 'The closed end absorbs sound energy' },
        { id: 'd', label: 'Air moves slower in stopped pipes' }
      ],
      explanation: "A stopped pipe has a node at the closed end and antinode at the open end, so the fundamental wavelength is 4L (vs 2L for open pipes). This longer wavelength means a lower frequency: f = v/4L instead of f = v/2L."
    },
    {
      scenario: "A violin string is 32 cm long with linear mass density 0.5 g/m. When tuned, it produces a fundamental frequency of 440 Hz (A4).",
      question: "What is the approximate wave speed on this string?",
      options: [
        { id: 'a', label: '141 m/s' },
        { id: 'b', label: '282 m/s', correct: true },
        { id: 'c', label: '440 m/s' },
        { id: 'd', label: '564 m/s' }
      ],
      explanation: "For a string fixed at both ends, the fundamental has wavelength = 2L = 0.64 m. Using v = f*lambda: v = 440 Hz * 0.64 m = 281.6 m/s, approximately 282 m/s."
    },
    {
      scenario: "An audio engineer is comparing the harmonic content of a flute (approximately an open pipe) and a clarinet (approximately a closed pipe) playing the same fundamental note.",
      question: "What key difference in harmonic structure will the engineer observe?",
      options: [
        { id: 'a', label: 'The flute has no harmonics, only the fundamental' },
        { id: 'b', label: 'The clarinet has all harmonics (1st, 2nd, 3rd, etc.)' },
        { id: 'c', label: 'The clarinet emphasizes odd harmonics (1st, 3rd, 5th, etc.)', correct: true },
        { id: 'd', label: 'Both instruments have identical harmonic structures' }
      ],
      explanation: "Closed pipes (like clarinets) can only support standing waves with odd multiples of the fundamental frequency because the closed end must be a node. This gives clarinets their distinctive hollow timbre."
    },
    {
      scenario: "A sound engineer discovers that a 4-meter-wide recording studio has a problematic bass frequency that causes uneven sound levels. The speed of sound is 340 m/s.",
      question: "What is the frequency of this room mode?",
      options: [
        { id: 'a', label: '21.25 Hz' },
        { id: 'b', label: '42.5 Hz', correct: true },
        { id: 'c', label: '85 Hz' },
        { id: 'd', label: '170 Hz' }
      ],
      explanation: "Room modes occur when standing waves form between parallel walls. The fundamental mode has wavelength = 2L = 8m. Frequency = v/lambda = 340/8 = 42.5 Hz. This bass frequency will be unnaturally boosted or cancelled at different positions."
    },
    {
      scenario: "A scientist sprinkles fine sand on a vibrating metal plate and observes intricate geometric patterns forming as the plate resonates at different frequencies.",
      question: "What determines where the sand collects in these Chladni patterns?",
      options: [
        { id: 'a', label: 'Sand moves to antinodes where vibration is maximum' },
        { id: 'b', label: 'Sand moves to nodes where vibration is minimum', correct: true },
        { id: 'c', label: 'Sand moves randomly due to chaotic vibrations' },
        { id: 'd', label: 'Sand moves to the edges due to centrifugal force' }
      ],
      explanation: "Sand bounces away from vibrating regions (antinodes) and accumulates at nodal lines where the plate remains stationary. Different frequencies produce different mode shapes, revealing the 2D standing wave patterns."
    },
    {
      scenario: "A physicist designs a helium-neon laser with a cavity length of 30 cm. The laser operates at 632.8 nm wavelength.",
      question: "Approximately how many standing wave modes (longitudinal modes) fit in this cavity?",
      options: [
        { id: 'a', label: 'About 475,000' },
        { id: 'b', label: 'About 950,000', correct: true },
        { id: 'c', label: 'About 1,900,000' },
        { id: 'd', label: 'About 63 million' }
      ],
      explanation: "For a laser cavity, n*lambda/2 = L, so n = 2L/lambda = 2(0.30 m)/(632.8e-9 m) = 948,000 half-wavelengths. This is why lasers can support many longitudinal modes within their gain bandwidth."
    },
    {
      scenario: "An RF engineer measures the voltage along a transmission line feeding an antenna and finds periodic maxima and minima, indicating the antenna is not perfectly matched.",
      question: "What is the relationship between adjacent voltage maxima on the line?",
      options: [
        { id: 'a', label: 'They are separated by one full wavelength' },
        { id: 'b', label: 'They are separated by one half wavelength', correct: true },
        { id: 'c', label: 'They are separated by one quarter wavelength' },
        { id: 'd', label: 'Their spacing depends on the mismatch ratio' }
      ],
      explanation: "Standing waves on transmission lines form the same way as on strings. Voltage maxima (antinodes) are separated by half a wavelength (lambda/2), regardless of the standing wave ratio (SWR)."
    },
    {
      scenario: "In quantum mechanics, an electron is confined to a one-dimensional 'box' of length L. The electron's wavefunction must go to zero at both walls.",
      question: "Which statement correctly describes the allowed quantum states?",
      options: [
        { id: 'a', label: 'The electron can have any energy, but prefers lower states' },
        { id: 'b', label: 'Only energies where n half-wavelengths fit in the box are allowed', correct: true },
        { id: 'c', label: 'The electron has no definite position or energy' },
        { id: 'd', label: 'Quantum effects eliminate standing wave behavior' }
      ],
      explanation: "Just like classical standing waves, the quantum wavefunction must satisfy boundary conditions: psi = 0 at both walls. This requires n*lambda/2 = L, quantizing the allowed wavelengths and hence energies: E = n^2*h^2/(8mL^2)."
    }
  ];

  // Standing wave SVG visualization
  const renderWaveVisualization = () => {
    const stringLength = 400;
    const stringY = 120;
    const n = harmonic;
    const amp = 50 * (1 - n * 0.05);
    const omega = baseFrequency * n * 0.015;

    const generateWavePath = () => {
      const points: string[] = [];
      for (let x = 0; x <= stringLength; x += 2) {
        const relX = x / stringLength;
        const envelope = Math.sin(Math.PI * n * relX);
        const y = stringY + amp * envelope * Math.sin(omega * time);
        points.push(`${50 + x},${y}`);
      }
      return `M ${points.join(' L ')}`;
    };

    const nodes: number[] = [];
    const antinodes: number[] = [];
    for (let i = 0; i <= n; i++) nodes.push(50 + (i * stringLength / n));
    for (let i = 0; i < n; i++) antinodes.push(50 + ((i + 0.5) * stringLength / n));

    return (
      <div className="flex flex-col items-center gap-2 w-full">
        <svg viewBox="0 0 500 200" className="w-full h-full max-h-52">
          <defs>
            {/* Premium wave gradient */}
            <linearGradient id="standWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="25%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="75%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            {/* Wave glow filter */}
            <filter id="standWaveGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur1" />
              <feGaussianBlur stdDeviation="8" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Node gradient with glow */}
            <radialGradient id="standNodeGrad" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#991b1b" />
            </radialGradient>
            <filter id="standNodeGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#ef4444" floodOpacity="0.6" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Antinode gradient with glow */}
            <radialGradient id="standAntinodeGrad" cx="30%" cy="30%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </radialGradient>
            <filter id="standAntinodeGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feFlood floodColor="#10b981" floodOpacity="0.5" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Fixed end gradient */}
            <linearGradient id="standFixedEndGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="50%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>
            {/* Background gradient */}
            <linearGradient id="standBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#05060a" />
            </linearGradient>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width="500" height="200" fill="url(#standBgGrad)" rx="12" />

          {/* Subtle grid */}
          <g opacity="0.08">
            {[...Array(5)].map((_, i) => (
              <line key={`standGrid-h${i}`} x1="50" y1={40 + i * 35} x2="450" y2={40 + i * 35} stroke="#6b7488" strokeWidth="0.5" />
            ))}
            {[...Array(9)].map((_, i) => (
              <line key={`standGrid-v${i}`} x1={50 + i * 50} y1="25" x2={50 + i * 50} y2="175" stroke="#6b7488" strokeWidth="0.5" />
            ))}
          </g>

          {/* Equilibrium line */}
          <line x1="50" y1={stringY} x2="450" y2={stringY} stroke="#6b7488" strokeDasharray="6,4" opacity="0.25" strokeWidth="1" />

          {/* Fixed ends with premium styling */}
          <g>
            <rect x="32" y={stringY - 30} width="24" height="60" rx="6" fill="url(#standFixedEndGrad)" stroke="#4b5563" strokeWidth="1" />
            <rect x="36" y={stringY - 26} width="4" height="52" rx="2" fill="#6b7280" opacity="0.3" />
          </g>
          <g>
            <rect x="444" y={stringY - 30} width="24" height="60" rx="6" fill="url(#standFixedEndGrad)" stroke="#4b5563" strokeWidth="1" />
            <rect x="460" y={stringY - 26} width="4" height="52" rx="2" fill="#6b7280" opacity="0.3" />
          </g>

          {/* Antinode amplitude indicators */}
          {antinodes.map((x, i) => (
            <g key={`standAmpIndicator-${i}`}>
              <line x1={x} y1={stringY - amp - 8} x2={x} y2={stringY + amp + 8} stroke="#10b981" strokeWidth="1" strokeDasharray="4,3" opacity="0.3" />
              <circle cx={x} cy={stringY - amp - 12} r="3" fill="#10b981" opacity="0.4" />
              <circle cx={x} cy={stringY + amp + 12} r="3" fill="#10b981" opacity="0.4" />
            </g>
          ))}

          {/* Vibrating string with premium glow */}
          <path d={generateWavePath()} fill="none" stroke="url(#standWaveGrad)" strokeWidth="5" strokeLinecap="round" filter="url(#standWaveGlow)" />

          {/* Nodes with labels */}
          {nodes.map((x, i) => (
            <g key={`standNode-${i}`}>
              <circle cx={x} cy={stringY} r="10" fill="url(#standNodeGrad)" filter="url(#standNodeGlow)">
                <animate attributeName="r" values="10;12;10" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={x} cy={stringY} r="4" fill="#fef2f2" />
              {/* Node label marker */}
              <circle cx={x} cy={stringY + 28} r="8" fill="#1f2937" stroke="#ef4444" strokeWidth="1" opacity="0.9" />
              <text x={x} y={stringY + 32} textAnchor="middle" fill="#fca5a5" fontSize="8" fontWeight="700">N</text>
            </g>
          ))}

          {/* Antinodes with labels */}
          {antinodes.map((x, i) => (
            <g key={`standAntinode-${i}`}>
              <circle cx={x} cy={stringY} r="8" fill="url(#standAntinodeGrad)" filter="url(#standAntinodeGlow)" opacity="0.9" />
              <circle cx={x} cy={stringY} r="3" fill="#d1fae5" />
              {/* Antinode label marker */}
              <circle cx={x} cy={stringY - 28} r="8" fill="#1f2937" stroke="#10b981" strokeWidth="1" opacity="0.9" />
              <text x={x} y={stringY - 24} textAnchor="middle" fill="#6ee7b7" fontSize="8" fontWeight="700">A</text>
            </g>
          ))}

          {/* Harmonic indicator badge */}
          <g transform="translate(10, 10)">
            <rect x="0" y="0" width="50" height="28" rx="6" fill="#1f2937" stroke="#f59e0b" strokeWidth="1" />
            <text x="25" y="11" textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="600">n = {n}</text>
            <text x="25" y="22" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="800">
              {n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`}
            </text>
          </g>
        </svg>
        {/* Text labels moved outside SVG using typo system */}
        <div className="flex items-center justify-between w-full px-4" style={{ maxWidth: 500 }}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span style={{ fontSize: typo.label }} className="text-slate-400 font-medium">Nodes ({n + 1})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span style={{ fontSize: typo.label }} className="text-slate-400 font-medium">Antinodes ({n})</span>
            </div>
          </div>
          <div className="text-right">
            <span style={{ fontSize: typo.small }} className="text-amber-400 font-bold">{frequency} Hz</span>
          </div>
        </div>
      </div>
    );
  };

  // Application tab SVG graphics
  const renderApplicationGraphic = () => {
    const app = applications[activeApp];

    if (app.id === 'guitar') {
      return (
        <div className="flex flex-col items-center gap-2">
          <svg viewBox="0 0 300 170" className="w-full h-36">
            <defs>
              {/* Premium guitar body gradient */}
              <radialGradient id="standGuitarBody" cx="40%" cy="30%">
                <stop offset="0%" stopColor="#b45309" />
                <stop offset="50%" stopColor="#92400e" />
                <stop offset="100%" stopColor="#78350f" />
              </radialGradient>
              <linearGradient id="standGuitarNeck" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#57534e" />
                <stop offset="30%" stopColor="#44403c" />
                <stop offset="70%" stopColor="#44403c" />
                <stop offset="100%" stopColor="#292524" />
              </linearGradient>
              <linearGradient id="standGuitarString" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <filter id="standGuitarGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feFlood floodColor="#f59e0b" floodOpacity="0.5" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="standGuitarShadow">
                <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
              </filter>
              <linearGradient id="standGuitarBg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0a0f1a" />
                <stop offset="100%" stopColor="#05060a" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="300" height="170" fill="url(#standGuitarBg)" rx="12" />

            {/* Guitar body with shadow */}
            <g filter="url(#standGuitarShadow)">
              <ellipse cx="220" cy="100" rx="60" ry="65" fill="url(#standGuitarBody)" />
            </g>
            {/* Sound hole */}
            <ellipse cx="220" cy="100" rx="20" ry="20" fill="#1c1917" />
            <ellipse cx="220" cy="100" rx="18" ry="18" fill="none" stroke="#44403c" strokeWidth="2" />

            {/* Neck with fretboard */}
            <rect x="40" y="85" width="145" height="30" fill="url(#standGuitarNeck)" rx="3" />
            {/* Fretboard inlay */}
            <rect x="42" y="87" width="141" height="26" fill="#292524" rx="2" />

            {/* Frets with metallic look */}
            {[60, 85, 105, 120, 135, 150, 165].map((x, i) => (
              <g key={`standFret-${i}`}>
                <line x1={x} y1="87" x2={x} y2="113" stroke="#d6d3d1" strokeWidth="2" />
                <line x1={x + 1} y1="87" x2={x + 1} y2="113" stroke="#78716c" strokeWidth="1" opacity="0.5" />
              </g>
            ))}

            {/* Position markers */}
            <circle cx="95" cy="100" r="3" fill="#78716c" opacity="0.6" />
            <circle cx="135" cy="100" r="3" fill="#78716c" opacity="0.6" />

            {/* Strings with vibration */}
            {[90, 95, 100, 105, 110].map((y, i) => (
              <g key={`standString-${i}`}>
                {i === 2 ? (
                  <path
                    d={`M 40 ${y} Q 80 ${y + 6 * Math.sin(time * 6)} 120 ${y} Q 160 ${y - 6 * Math.sin(time * 6)} 200 ${y} Q 240 ${y + 6 * Math.sin(time * 6)} 280 ${y}`}
                    fill="none"
                    stroke="url(#standGuitarString)"
                    strokeWidth="2"
                    filter="url(#standGuitarGlow)"
                  />
                ) : (
                  <line x1="40" y1={y} x2="280" y2={y} stroke="#92400e" strokeWidth={1.5 - i * 0.1} opacity="0.6" />
                )}
              </g>
            ))}

            {/* Finger position with glow */}
            <g>
              <circle cx="75" cy="100" r="10" fill="#f59e0b" opacity="0.3" filter="url(#standGuitarGlow)">
                <animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="75" cy="100" r="7" fill="#fbbf24">
                <animate attributeName="opacity" values="0.9;1;0.9" dur="1s" repeatCount="indefinite" />
              </circle>
            </g>

            {/* Length indicator */}
            <g opacity="0.6">
              <line x1="75" y1="125" x2="280" y2="125" stroke="#10b981" strokeWidth="1" strokeDasharray="4,2" />
              <polygon points="75,122 75,128 80,125" fill="#10b981" />
              <polygon points="280,122 280,128 275,125" fill="#10b981" />
            </g>

            {/* Harmonic indicator */}
            <g transform="translate(10, 10)">
              <rect x="0" y="0" width="40" height="22" rx="4" fill="#1f2937" stroke="#f59e0b" strokeWidth="1" opacity="0.9" />
              <text x="20" y="15" textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="700">L/2</text>
            </g>
          </svg>
          <p style={{ fontSize: typo.label }} className="text-slate-400 text-center px-4">
            Pressing frets changes effective string length, raising pitch
          </p>
        </div>
      );
    }

    if (app.id === 'laser') {
      return (
        <div className="flex flex-col items-center gap-2">
          <svg viewBox="0 0 300 160" className="w-full h-36">
            <defs>
              {/* Premium laser beam gradient */}
              <linearGradient id="standLaserBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6d28d9" stopOpacity="0.3" />
                <stop offset="25%" stopColor="#7c3aed" />
                <stop offset="50%" stopColor="#a78bfa" />
                <stop offset="75%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.3" />
              </linearGradient>
              {/* Mirror gradient */}
              <linearGradient id="standMirrorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c4b5fd" />
                <stop offset="50%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              {/* Laser glow filter */}
              <filter id="standLaserGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="5" result="blur1" />
                <feGaussianBlur stdDeviation="10" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Cavity tube gradient */}
              <linearGradient id="standCavityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1f2937" />
                <stop offset="50%" stopColor="#111827" />
                <stop offset="100%" stopColor="#1f2937" />
              </linearGradient>
              <linearGradient id="standLaserBg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0a0f1a" />
                <stop offset="100%" stopColor="#05060a" />
              </linearGradient>
              {/* Output beam gradient */}
              <linearGradient id="standOutputBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#c4b5fd" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="300" height="160" fill="url(#standLaserBg)" rx="12" />

            {/* Laser cavity tube with premium styling */}
            <rect x="40" y="60" width="220" height="40" rx="8" fill="url(#standCavityGrad)" stroke="#374151" strokeWidth="1" />
            <rect x="42" y="62" width="216" height="2" rx="1" fill="#4b5563" opacity="0.3" />

            {/* Standing light wave nodes */}
            <g opacity="0.95">
              {[0, 1, 2, 3, 4].map((i) => {
                const x = 55 + i * 50;
                const phase = time * 8 + i * Math.PI * 0.5;
                return (
                  <g key={`standLaserNode-${i}`}>
                    {/* Wave amplitude envelope */}
                    <ellipse cx={x} cy={80} rx="4" ry={Math.abs(Math.sin(phase)) * 18 + 2} fill="#a78bfa" opacity="0.8">
                      <animate attributeName="ry" values="18;2;18" dur="0.4s" repeatCount="indefinite" begin={`${i * 0.08}s`} />
                    </ellipse>
                    {/* Node marker */}
                    {i < 4 && (
                      <circle cx={x + 25} cy={80} r="3" fill="#6d28d9" opacity="0.6" />
                    )}
                  </g>
                );
              })}
            </g>

            {/* Laser beam core with intense glow */}
            <rect x="50" y="76" width="200" height="8" rx="4" fill="url(#standLaserBeam)" filter="url(#standLaserGlow)" />
            <rect x="50" y="78" width="200" height="4" rx="2" fill="#c4b5fd" opacity="0.6" />

            {/* Mirrors with premium styling */}
            <g>
              {/* Left mirror - fully reflective */}
              <rect x="28" y="52" width="18" height="56" rx="4" fill="url(#standMirrorGrad)" />
              <rect x="30" y="54" width="3" height="52" rx="1" fill="#ddd6fe" opacity="0.4" />
              <text x="37" y="125" textAnchor="middle" fill="#a78bfa" fontSize="8" fontWeight="600">100%</text>
            </g>
            <g>
              {/* Right mirror - partially transmissive */}
              <rect x="254" y="52" width="18" height="56" rx="4" fill="url(#standMirrorGrad)" opacity="0.7" />
              <rect x="256" y="54" width="3" height="52" rx="1" fill="#ddd6fe" opacity="0.3" />
              <text x="263" y="125" textAnchor="middle" fill="#a78bfa" fontSize="8" fontWeight="600">~99%</text>
            </g>

            {/* Output beam with animation */}
            <g>
              <line x1="272" y1="80" x2="295" y2="80" stroke="url(#standOutputBeam)" strokeWidth="4" strokeLinecap="round" filter="url(#standLaserGlow)">
                <animate attributeName="opacity" values="0.7;1;0.7" dur="0.15s" repeatCount="indefinite" />
              </line>
              {/* Beam particles */}
              {[0, 1, 2].map((i) => (
                <circle key={`standBeamParticle-${i}`} cy="80" r="2" fill="#c4b5fd">
                  <animate attributeName="cx" values="275;300" dur="0.3s" repeatCount="indefinite" begin={`${i * 0.1}s`} />
                  <animate attributeName="opacity" values="1;0" dur="0.3s" repeatCount="indefinite" begin={`${i * 0.1}s`} />
                </circle>
              ))}
            </g>

            {/* Wavelength indicator */}
            <g transform="translate(10, 10)">
              <rect x="0" y="0" width="55" height="22" rx="4" fill="#1f2937" stroke="#8b5cf6" strokeWidth="1" opacity="0.9" />
              <text x="28" y="15" textAnchor="middle" fill="#a78bfa" fontSize="9" fontWeight="700">L = n(lambda)/2</text>
            </g>
          </svg>
          <p style={{ fontSize: typo.label }} className="text-slate-400 text-center px-4">
            Only resonant wavelengths amplify between mirrors
          </p>
        </div>
      );
    }

    if (app.id === 'quantum') {
      return (
        <div className="flex flex-col items-center gap-2">
          <svg viewBox="0 0 300 160" className="w-full h-36">
            <defs>
              {/* Premium nucleus gradient */}
              <radialGradient id="standNucleus" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </radialGradient>
              {/* Nucleus glow */}
              <filter id="standNucleusGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feFlood floodColor="#f59e0b" floodOpacity="0.6" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Electron glow */}
              <filter id="standElectronGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feFlood floodColor="#10b981" floodOpacity="0.7" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Orbital gradients */}
              <linearGradient id="standOrbital1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6ee7b7" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <linearGradient id="standOrbital2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="standOrbital3" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
              <linearGradient id="standQuantumBg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0a0f1a" />
                <stop offset="100%" stopColor="#05060a" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="300" height="160" fill="url(#standQuantumBg)" rx="12" />

            {/* Nucleus with premium glow */}
            <g>
              <circle cx="150" cy="80" r="18" fill="url(#standNucleus)" filter="url(#standNucleusGlow)">
                <animate attributeName="r" values="18;20;18" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="145" cy="75" r="4" fill="#fef3c7" opacity="0.6" />
              {/* Protons/neutrons visual */}
              <circle cx="148" cy="82" r="5" fill="#fbbf24" opacity="0.7" />
              <circle cx="155" cy="78" r="5" fill="#f59e0b" opacity="0.7" />
            </g>

            {/* Electron orbitals as standing waves */}
            {[35, 55, 78].map((r, i) => {
              const points: string[] = [];
              const n = i + 1;
              for (let angle = 0; angle <= 360; angle += 3) {
                const rad = (angle * Math.PI) / 180;
                const waveAmp = 6 * Math.sin(n * rad * 2 + time * 2.5);
                const x = 150 + (r + waveAmp) * Math.cos(rad);
                const y = 80 + (r + waveAmp) * Math.sin(rad);
                points.push(`${x},${y}`);
              }
              return (
                <g key={`standOrbital-${i}`}>
                  {/* Orbital wave path */}
                  <path
                    d={`M ${points.join(' L ')} Z`}
                    fill="none"
                    stroke={`url(#standOrbital${i + 1})`}
                    strokeWidth={2.5 - i * 0.3}
                    opacity={0.5 + i * 0.15}
                  />
                  {/* Electron with glow trail */}
                  <g>
                    <circle
                      cx={150 + r * Math.cos(time * (2.5 - i * 0.5))}
                      cy={80 + r * Math.sin(time * (2.5 - i * 0.5))}
                      r="6"
                      fill="#10b981"
                      filter="url(#standElectronGlow)"
                    />
                    <circle
                      cx={150 + r * Math.cos(time * (2.5 - i * 0.5))}
                      cy={80 + r * Math.sin(time * (2.5 - i * 0.5))}
                      r="3"
                      fill="#d1fae5"
                    />
                  </g>
                </g>
              );
            })}

            {/* Energy level labels with premium styling */}
            <g transform="translate(240, 25)">
              <rect x="0" y="0" width="50" height="70" rx="6" fill="#1f2937" stroke="#10b981" strokeWidth="1" opacity="0.8" />
              <text x="25" y="15" textAnchor="middle" fill="#6ee7b7" fontSize="8" fontWeight="600">SHELLS</text>
              <g transform="translate(10, 25)">
                <circle cx="8" cy="0" r="4" fill="#047857" />
                <text x="18" y="4" fill="#6b7488" fontSize="9" fontWeight="500">n=1</text>
              </g>
              <g transform="translate(10, 40)">
                <circle cx="8" cy="0" r="4" fill="#059669" />
                <text x="18" y="4" fill="#6b7488" fontSize="9" fontWeight="500">n=2</text>
              </g>
              <g transform="translate(10, 55)">
                <circle cx="8" cy="0" r="4" fill="#10b981" />
                <text x="18" y="4" fill="#6b7488" fontSize="9" fontWeight="500">n=3</text>
              </g>
            </g>

            {/* Quantum number indicator */}
            <g transform="translate(10, 10)">
              <rect x="0" y="0" width="65" height="22" rx="4" fill="#1f2937" stroke="#10b981" strokeWidth="1" opacity="0.9" />
              <text x="33" y="15" textAnchor="middle" fill="#6ee7b7" fontSize="9" fontWeight="700">n*lambda = 2*pi*r</text>
            </g>
          </svg>
          <p style={{ fontSize: typo.label }} className="text-slate-400 text-center px-4">
            Only whole-number wavelengths form stable orbitals
          </p>
        </div>
      );
    }

    if (app.id === 'acoustics') {
      return (
        <div className="flex flex-col items-center gap-2">
          <svg viewBox="0 0 300 160" className="w-full h-36">
            <defs>
              {/* Room wall gradient */}
              <linearGradient id="standWallGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#374151" />
                <stop offset="50%" stopColor="#4b5563" />
                <stop offset="100%" stopColor="#374151" />
              </linearGradient>
              {/* Sound wave gradient */}
              <linearGradient id="standSoundWave" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="50%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#f472b6" />
              </linearGradient>
              {/* Pressure node glow */}
              <filter id="standPressureGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feFlood floodColor="#ec4899" floodOpacity="0.6" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Absorber gradient */}
              <linearGradient id="standAbsorberGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1f2937" />
                <stop offset="50%" stopColor="#111827" />
                <stop offset="100%" stopColor="#1f2937" />
              </linearGradient>
              <linearGradient id="standAcousticsBg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0a0f1a" />
                <stop offset="100%" stopColor="#05060a" />
              </linearGradient>
              {/* Floor gradient */}
              <linearGradient id="standFloorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1f2937" />
                <stop offset="100%" stopColor="#111827" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="300" height="160" fill="url(#standAcousticsBg)" rx="12" />

            {/* Room 3D effect - floor */}
            <polygon points="50,130 250,130 270,145 30,145" fill="url(#standFloorGrad)" opacity="0.5" />

            {/* Room walls with premium styling */}
            <g>
              {/* Left wall */}
              <rect x="40" y="30" width="8" height="100" fill="url(#standWallGrad)" />
              <rect x="40" y="30" width="2" height="100" fill="#6b7280" opacity="0.3" />
              {/* Right wall */}
              <rect x="252" y="30" width="8" height="100" fill="url(#standWallGrad)" />
              <rect x="258" y="30" width="2" height="100" fill="#374151" opacity="0.3" />
              {/* Top wall */}
              <rect x="40" y="26" width="220" height="8" fill="url(#standWallGrad)" />
              {/* Bottom wall */}
              <rect x="40" y="126" width="220" height="8" fill="url(#standWallGrad)" />
            </g>

            {/* Room interior */}
            <rect x="48" y="34" width="204" height="92" fill="#0a0f1a" opacity="0.8" />

            {/* Standing wave patterns (room modes) */}
            {[0, 1, 2].map((mode) => {
              const y = 55 + mode * 25;
              const points: string[] = [];
              const n = 2;
              const phaseShift = mode * 0.7;
              for (let x = 48; x <= 252; x += 3) {
                const relX = (x - 48) / 204;
                const amp = 10 * Math.sin(Math.PI * n * relX) * Math.sin(time * 3.5 + phaseShift);
                points.push(`${x},${y + amp}`);
              }
              return (
                <path
                  key={`standRoomMode-${mode}`}
                  d={`M ${points.join(' L ')}`}
                  fill="none"
                  stroke="url(#standSoundWave)"
                  strokeWidth={2.5 - mode * 0.3}
                  opacity={0.6 + mode * 0.12}
                  strokeLinecap="round"
                />
              );
            })}

            {/* Pressure nodes/antinodes */}
            <g>
              {/* Center antinode (high pressure) */}
              <circle cx="150" cy="80" r="12" fill="#ec4899" opacity="0.2" filter="url(#standPressureGlow)">
                <animate attributeName="r" values="12;18;12" dur="1.2s" repeatCount="indefinite" />
              </circle>
              <circle cx="150" cy="80" r="6" fill="#ec4899" opacity="0.7">
                <animate attributeName="opacity" values="0.7;1;0.7" dur="1.2s" repeatCount="indefinite" />
              </circle>
              {/* Side nodes (low pressure) */}
              <circle cx="99" cy="80" r="4" fill="#6b7280" opacity="0.5" />
              <circle cx="201" cy="80" r="4" fill="#6b7280" opacity="0.5" />
            </g>

            {/* Acoustic absorber panels with premium styling */}
            <g>
              {/* Left absorbers */}
              <rect x="50" y="38" width="10" height="25" rx="3" fill="url(#standAbsorberGrad)" stroke="#374151" strokeWidth="0.5" />
              <rect x="52" y="40" width="2" height="21" rx="1" fill="#4b5563" opacity="0.3" />
              <rect x="50" y="100" width="10" height="25" rx="3" fill="url(#standAbsorberGrad)" stroke="#374151" strokeWidth="0.5" />
              <rect x="52" y="102" width="2" height="21" rx="1" fill="#4b5563" opacity="0.3" />
              {/* Right absorbers */}
              <rect x="240" y="38" width="10" height="25" rx="3" fill="url(#standAbsorberGrad)" stroke="#374151" strokeWidth="0.5" />
              <rect x="246" y="40" width="2" height="21" rx="1" fill="#374151" opacity="0.3" />
              <rect x="240" y="100" width="10" height="25" rx="3" fill="url(#standAbsorberGrad)" stroke="#374151" strokeWidth="0.5" />
              <rect x="246" y="102" width="2" height="21" rx="1" fill="#374151" opacity="0.3" />
            </g>

            {/* Room mode indicator */}
            <g transform="translate(10, 10)">
              <rect x="0" y="0" width="50" height="22" rx="4" fill="#1f2937" stroke="#ec4899" strokeWidth="1" opacity="0.9" />
              <text x="25" y="15" textAnchor="middle" fill="#f472b6" fontSize="9" fontWeight="700">f = c/(2L)</text>
            </g>

            {/* Wavelength label */}
            <g opacity="0.6">
              <line x1="99" y1="138" x2="201" y2="138" stroke="#ec4899" strokeWidth="1" />
              <polygon points="99,135 99,141 104,138" fill="#ec4899" />
              <polygon points="201,135 201,141 196,138" fill="#ec4899" />
              <text x="150" y="148" textAnchor="middle" fill="#f472b6" fontSize="8">lambda/2</text>
            </g>
          </svg>
          <p style={{ fontSize: typo.label }} className="text-slate-400 text-center px-4">
            Room modes cause bass buildup between parallel walls
          </p>
        </div>
      );
    }

    return null;
  };

  // Calculate score
  const score = answers.filter((a, i) => a !== null && questions[i].options[a]?.correct).length;

  // ==================== PHASE RENDERS ====================

  const renderPhase = () => {
    // HOOK
    if (phase === 'hook') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
          {/* Floating background elements */}
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

          {/* Icon */}
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-amber-600/20 to-slate-800 border-2 border-amber-500/30 flex items-center justify-center mb-6 shadow-lg shadow-amber-500/20">
            <svg viewBox="0 0 60 60" className="w-3/5 h-3/5">
              <path
                d={`M 5 30 Q 15 ${30 - 12 * Math.sin(time * 4)} 30 30 Q 45 ${30 + 12 * Math.sin(time * 4)} 55 30`}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="5" cy="30" r="4" fill="#fbbf24" />
              <circle cx="55" cy="30" r="4" fill="#fbbf24" />
              <circle cx="30" cy="30" r="3" fill="#10b981" />
            </svg>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Standing Waves
          </h1>

          <p className="text-lg text-slate-300 mb-2 max-w-lg">
            Why do guitar strings only produce <span className="text-amber-400 font-semibold">certain musical notes</span>?
          </p>

          <p className="text-sm text-slate-500 mb-8 max-w-md">
            Discover harmonics, nodes, and the physics of music
          </p>

          {/* Feature cards */}
          <div className="flex gap-4 mb-8">
            {[
              { icon: '🎵', label: 'Harmonics' },
              { icon: '🔬', label: 'Physics' },
              { icon: '🎸', label: 'Music' }
            ].map((item, i) => (
              <div key={i} className="px-6 py-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{item.label}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => goToPhase('predict')}
            className="px-10 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-lg shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all"
            style={{ zIndex: 10 }}
          >
            Start Learning
          </button>

          <p className="text-xs text-slate-600 mt-6">
            ~5 minutes - Interactive simulation
          </p>
        </div>
      );
    }

    // PREDICT
    if (phase === 'predict') {
      const options = [
        { id: 'same', text: 'The same single loop, just faster' },
        { id: 'more', text: 'More loops appear at specific frequencies' },
        { id: 'random', text: 'Completely random patterns' },
        { id: 'disappear', text: 'The wave disappears completely' }
      ];

      return (
        <div className="flex flex-col min-h-[80vh] px-6 py-8">
          <div className="max-w-xl mx-auto w-full">
            <p className="text-xs font-bold text-amber-400 mb-2 uppercase tracking-widest">Predict</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
              What happens when you increase frequency?
            </h2>
            <p className="text-slate-400 mb-6">
              Imagine a guitar string fixed at both ends. You start shaking it slowly, then faster and faster.
            </p>

            <div className="flex flex-col gap-3 mb-8">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setPrediction(opt.id);
                    emitEvent('prediction_made', { value: opt.id });
                  }}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${
                    prediction === opt.id
                      ? 'border-amber-500 bg-amber-500/10 text-white'
                      : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                  }`}
                  style={{ zIndex: 10 }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => { if (prediction) goToPhase('play'); }}
                disabled={!prediction}
                className={`px-8 py-3 rounded-xl font-bold transition-all ${
                  prediction
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
                style={{ zIndex: 10 }}
              >
                Let's Find Out
              </button>
            </div>
          </div>
        </div>
      );
    }

    // LAB
    if (phase === 'play') {
      return (
        <div className="flex flex-col min-h-[80vh]">
          {/* Visualization */}
          <div className="flex-1 flex items-center justify-center p-4 min-h-64">
            {renderWaveVisualization()}
          </div>

          {/* Controls */}
          <div className="p-6 bg-slate-900/80 border-t border-slate-800">
            <div className="max-w-xl mx-auto">
              {/* Harmonic slider */}
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-slate-400 font-semibold">Harmonic Mode</label>
                  <span className="text-sm text-amber-400 font-bold">n = {harmonic}</span>
                </div>
                <input
                  type="range" min="1" max="6" value={harmonic}
                  onChange={(e) => setHarmonic(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Discovered harmonics */}
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6].map(h => (
                    <div key={h} className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                      discoveredHarmonics.includes(h)
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-800 text-slate-600'
                    } ${harmonic === h ? 'ring-2 ring-amber-400' : ''}`}>
                      {h}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { if (discoveredHarmonics.length >= 3) goToPhase('review'); }}
                  disabled={discoveredHarmonics.length < 3}
                  className={`px-6 py-2 rounded-xl font-bold transition-all ${
                    discoveredHarmonics.length >= 3
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                  style={{ zIndex: 10 }}
                >
                  {discoveredHarmonics.length >= 3 ? 'Continue' : `Discover ${3 - discoveredHarmonics.length} more`}
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
        <div className="flex flex-col min-h-[80vh] px-6 py-8">
          <div className="max-w-2xl mx-auto w-full">
            <p className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-widest">Understanding</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-6">
              The Physics of Standing Waves
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { icon: '〰️', title: 'Standing Waves', desc: 'Form when a wave reflects and interferes with itself' },
                { icon: '⚫', title: 'Nodes', desc: 'Points of zero motion (destructive interference)' },
                { icon: '🟢', title: 'Antinodes', desc: 'Points of maximum amplitude (constructive interference)' },
                { icon: '🎵', title: 'Harmonics', desc: 'Integer multiples of the fundamental frequency' }
              ].map((item, i) => (
                <div key={i} className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Formula box */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-amber-500/10 to-slate-800 border border-amber-500/20 text-center mb-8">
              <p className="text-xs font-bold text-amber-400 mb-4 uppercase tracking-widest">Key Formula</p>
              <p className="text-3xl font-serif text-white mb-4">
                f<sub>n</sub> = n x f<sub>1</sub> = (n/2L)sqrt(T/u)
              </p>
              <p className="text-sm text-slate-400">
                Frequency depends on harmonic number, length, tension, and mass density
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => goToPhase('twist_predict')}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-lg shadow-amber-500/30"
                style={{ zIndex: 10 }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      );
    }

    // TWIST PREDICT
    if (phase === 'twist_predict') {
      const options = [
        { id: 'nothing', text: 'Nothing changes - frequency stays the same' },
        { id: 'higher', text: 'All frequencies increase proportionally' },
        { id: 'lower', text: 'All frequencies decrease' },
        { id: 'random', text: 'Changes unpredictably' }
      ];

      return (
        <div className="flex flex-col min-h-[80vh] px-6 py-8">
          <div className="max-w-xl mx-auto w-full">
            <p className="text-xs font-bold text-violet-400 mb-2 uppercase tracking-widest">New Variable</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
              What happens when you increase string tension?
            </h2>
            <p className="text-slate-400 mb-6">
              Think about tuning a guitar - what happens when you tighten the tuning peg?
            </p>

            <div className="flex flex-col gap-3 mb-8">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setTwistPrediction(opt.id);
                    emitEvent('twist_prediction_made', { value: opt.id });
                  }}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${
                    twistPrediction === opt.id
                      ? 'border-violet-500 bg-violet-500/10 text-white'
                      : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                  }`}
                  style={{ zIndex: 10 }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => { if (twistPrediction) goToPhase('twist_play'); }}
                disabled={!twistPrediction}
                className={`px-8 py-3 rounded-xl font-bold transition-all ${
                  twistPrediction
                    ? 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/30'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
                style={{ zIndex: 10 }}
              >
                Test It
              </button>
            </div>
          </div>
        </div>
      );
    }

    // TWIST LAB
    if (phase === 'twist_play') {
      return (
        <div className="flex flex-col min-h-[80vh]">
          {/* Visualization */}
          <div className="flex-1 flex items-center justify-center p-4 min-h-64">
            {renderWaveVisualization()}
          </div>

          {/* Controls */}
          <div className="p-6 bg-slate-900/80 border-t border-slate-800">
            <div className="max-w-xl mx-auto">
              {/* Tension slider */}
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-slate-400 font-semibold">String Tension</label>
                  <span className="text-sm text-violet-400 font-bold">{tension}%</span>
                </div>
                <input
                  type="range" min="10" max="100" value={tension}
                  onChange={(e) => setTension(parseInt(e.target.value))}
                  className="w-full accent-violet-500"
                />
              </div>

              {/* Harmonic slider */}
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-slate-400 font-semibold">Harmonic</label>
                  <span className="text-sm text-amber-400 font-bold">n = {harmonic}</span>
                </div>
                <input
                  type="range" min="1" max="6" value={harmonic}
                  onChange={(e) => setHarmonic(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="flex justify-between items-center">
                <div className="px-5 py-3 rounded-xl bg-slate-800">
                  <span className="text-xs text-slate-500">Frequency: </span>
                  <span className="text-lg font-black text-amber-400">{frequency} Hz</span>
                </div>
                <button
                  onClick={() => goToPhase('twist_review')}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-lg shadow-amber-500/30"
                  style={{ zIndex: 10 }}
                >
                  Continue
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
        <div className="flex flex-col min-h-[80vh] px-6 py-8">
          <div className="max-w-xl mx-auto w-full">
            <p className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-widest">Deep Insight</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-6">
              You've Mastered the Variables!
            </h2>

            <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-8">
              <p className="text-slate-300 leading-relaxed mb-4">
                Standing wave frequency depends on four key variables:
              </p>
              <ul className="space-y-3">
                <li className="text-white">
                  <strong className="text-amber-400">Harmonic number (n)</strong> - Integer multiples of fundamental
                </li>
                <li className="text-white">
                  <strong className="text-violet-400">Tension (T)</strong> - Higher tension = higher frequency
                </li>
                <li className="text-white">
                  <strong className="text-emerald-400">Length (L)</strong> - Shorter string = higher frequency
                </li>
                <li className="text-white">
                  <strong className="text-pink-400">Mass density (u)</strong> - Lighter string = higher frequency
                </li>
              </ul>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => goToPhase('transfer')}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-lg shadow-amber-500/30"
                style={{ zIndex: 10 }}
              >
                See Real Applications
              </button>
            </div>
          </div>
        </div>
      );
    }

    // TRANSFER
    if (phase === 'transfer') {
      const app = applications[activeApp];
      const allAppsCompleted = completedApps.size === applications.length;

      return (
        <div className="flex flex-col min-h-[80vh]">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-3 py-4 bg-slate-900/80 border-b border-slate-800">
            <span className="text-sm text-slate-400">
              Application {activeApp + 1} of {applications.length}
            </span>
            <div className="flex gap-1.5">
              {applications.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all ${
                    completedApps.has(idx) ? 'bg-emerald-500' : idx === activeApp ? 'bg-amber-400' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-slate-500">
              ({completedApps.size}/{applications.length} read)
            </span>
          </div>

          {/* Tab bar */}
          <div className="flex gap-2 px-4 py-3 bg-slate-900/80 border-b border-slate-800 overflow-x-auto">
            {applications.map((a, idx) => {
              const isCompleted = completedApps.has(idx);
              const isCurrent = idx === activeApp;
              const canAccess = isCompleted || idx === activeApp;
              return (
                <button
                  key={a.id}
                  onClick={() => {
                    if (canAccess) {
                      setActiveApp(idx);
                      emitEvent('app_explored', { appIndex: idx });
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                    isCurrent
                      ? 'bg-slate-800 text-white'
                      : isCompleted
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'text-slate-500 opacity-50 cursor-not-allowed'
                  }`}
                  style={{ zIndex: 10 }}
                >
                  {isCompleted && !isCurrent ? '✓ ' : ''}{a.title}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-2xl mx-auto">
              {/* Graphic */}
              <div className="mb-6 rounded-xl overflow-hidden border border-slate-800">
                {renderApplicationGraphic()}
              </div>

              {/* Info */}
              <h3 className="text-2xl font-black text-white mb-1">{app.title}</h3>
              <p className="text-sm font-semibold mb-4" style={{ color: app.color }}>{app.subtitle}</p>
              <p className="text-slate-300 leading-relaxed mb-6">{app.description}</p>

              {/* Formula */}
              <div className="p-5 rounded-xl mb-6" style={{ background: `${app.color}15`, borderColor: `${app.color}30`, borderWidth: 1 }}>
                <p className="text-xs font-bold uppercase mb-2" style={{ color: app.color }}>Key Formula</p>
                <p className="text-xl font-serif text-white">{app.stat}</p>
              </div>

              {/* Next Application Button */}
              {!completedApps.has(activeApp) ? (
                <button
                  onClick={() => {
                    const newCompleted = new Set(completedApps);
                    newCompleted.add(activeApp);
                    setCompletedApps(newCompleted);
                    emitEvent('app_explored', { app: app.id });
                    if (activeApp < applications.length - 1) {
                      setTimeout(() => setActiveApp(activeApp + 1), 300);
                    }
                  }}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold text-lg shadow-lg shadow-amber-500/30"
                  style={{ zIndex: 10 }}
                >
                  {activeApp < applications.length - 1 ? 'Next Application →' : '✓ Complete Applications'}
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <span className="text-emerald-400 font-semibold">✓ Completed</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="p-4 bg-slate-900/80 border-t border-slate-800">
            <div className="max-w-2xl mx-auto">
              {allAppsCompleted ? (
                <div className="text-center">
                  <div className="mb-3 text-emerald-400 font-semibold">
                    ✓ All {applications.length} applications read!
                  </div>
                  <button
                    onClick={() => goToPhase('test')}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/30"
                    style={{ zIndex: 10 }}
                  >
                    Take the Quiz
                  </button>
                </div>
              ) : (
                <div className="text-center py-3 px-4 rounded-xl bg-slate-800 text-slate-500">
                  Read all {applications.length} applications to unlock the quiz ({completedApps.size}/{applications.length} completed)
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // TEST
    if (phase === 'test') {
      const q = questions[testIndex];
      const answered = answers[testIndex] !== null;

      if (showResult) {
        return (
          <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
            <div className="text-7xl mb-6">
              {score >= 8 ? '🏆' : score >= 6 ? '⭐' : '📚'}
            </div>
            <h2 className="text-4xl font-black text-white mb-4">
              {score}/10 Correct
            </h2>
            <p className="text-lg text-slate-400 mb-8 max-w-md">
              {score >= 8 ? "Excellent! You've truly mastered standing waves!" :
               score >= 6 ? "Good job! Review the concepts you missed." :
               "Keep practicing! Review the material and try again."}
            </p>
            <button
              onClick={() => goToPhase('mastery')}
              className="px-10 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-lg shadow-lg shadow-emerald-500/30"
              style={{ zIndex: 10 }}
            >
              Complete Lesson
            </button>
          </div>
        );
      }

      return (
        <div className="flex flex-col min-h-[80vh] px-6 py-8">
          <div className="max-w-xl mx-auto w-full flex-1">
            {/* Progress */}
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm text-slate-500 font-semibold">
                Question {testIndex + 1} of 10
              </span>
              <div className="flex gap-1.5">
                {answers.slice(0, 10).map((a, i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-full ${
                    a !== null ? (questions[i].options[a]?.correct ? 'bg-emerald-500' : 'bg-red-500') :
                    i === testIndex ? 'bg-amber-400' : 'bg-slate-700'
                  }`} />
                ))}
              </div>
            </div>

            {/* Question */}
            <h3 className="text-xl font-bold text-white mb-6 leading-relaxed">
              {q.question}
            </h3>

            {/* Options */}
            <div className="flex flex-col gap-3 mb-6">
              {q.options.map((opt, i) => {
                const isSelected = answers[testIndex] === i;
                const isCorrect = opt.correct;
                const showFeedback = answered;

                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (!answered) {
                        const newAnswers = [...answers];
                        newAnswers[testIndex] = i;
                        setAnswers(newAnswers);
                        emitEvent('test_answered', { questionIndex: testIndex, correct: opt.correct });
                      }
                    }}
                    disabled={answered}
                    className={`p-5 rounded-xl border-2 text-left transition-all ${
                      showFeedback
                        ? isCorrect
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : isSelected
                            ? 'border-red-500 bg-red-500/10'
                            : 'border-slate-700 bg-slate-800/50'
                        : isSelected
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-slate-700 bg-slate-800/50'
                    } ${answered ? 'cursor-default' : 'cursor-pointer hover:border-slate-600'}`}
                    style={{ zIndex: 10 }}
                  >
                    <span className="text-white">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {answered && (
              <div className={`p-5 rounded-xl border ${
                q.options[answers[testIndex] as number]?.correct
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <p className="text-white">
                  <strong className={q.options[answers[testIndex] as number]?.correct ? 'text-emerald-400' : 'text-red-400'}>
                    {q.options[answers[testIndex] as number]?.correct ? '✓ Correct!' : '✗ Not quite.'}
                  </strong>{' '}
                  {q.explanation}
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between gap-4 pt-4 border-t border-slate-800">
            <button
              onClick={() => { if (testIndex > 0) setTestIndex(testIndex - 1); }}
              disabled={testIndex === 0}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                testIndex === 0 ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              style={{ zIndex: 10 }}
            >
              ← Previous
            </button>
            {testIndex < 9 ? (
              <button
                onClick={() => { if (answered) setTestIndex(testIndex + 1); }}
                disabled={!answered}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  answered
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
                style={{ zIndex: 10 }}
              >
                Next Question →
              </button>
            ) : (
              <button
                onClick={() => { if (answered) setShowResult(true); }}
                disabled={!answered}
                className={`px-6 py-3 rounded-xl font-bold transition-all ${
                  answered
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
                style={{ zIndex: 10 }}
              >
                See Results →
              </button>
            )}
          </div>
        </div>
      );
    }

    // MASTERY
    if (phase === 'mastery') {
      return (
        <div className="relative flex flex-col items-center justify-center min-h-[80vh] px-6 text-center overflow-hidden">
          {/* Confetti */}
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2.5 h-2.5 rounded-sm animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: ['#f59e0b', '#8b5cf6', '#10b981', '#ec4899'][i % 4],
                animation: `confettiFall 3s ease-out ${Math.random() * 2}s infinite`,
                opacity: 0.8
              }}
            />
          ))}

          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/30 z-10">
            <span className="text-5xl">🎓</span>
          </div>

          <h1 className="text-4xl font-black text-white mb-4 z-10">
            Congratulations!
          </h1>
          <p className="text-lg text-slate-400 mb-6 max-w-md z-10">
            You've mastered Standing Waves! You now understand the physics behind every musical instrument.
          </p>

          {/* Score */}
          <div className="px-8 py-4 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-8 z-10">
            <p className="text-sm text-slate-500 mb-1">Quiz Score</p>
            <p className={`text-4xl font-black ${score >= 8 ? 'text-emerald-400' : 'text-amber-400'}`}>{score}/10</p>
          </div>

          {/* Topics learned */}
          <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-8 max-w-md z-10">
            <p className="text-xs font-bold text-emerald-400 mb-3 uppercase tracking-widest">What You Learned</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Harmonics', 'Nodes', 'Antinodes', 'Tension', 'Frequency', 'Music Physics'].map((topic, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full bg-slate-800 text-white text-sm font-semibold">
                  {topic}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-4 z-10">
            <button
              onClick={() => {
                setPhase('hook');
                setTestIndex(0);
                setAnswers(Array(10).fill(null));
                setShowResult(false);
                setDiscoveredHarmonics([1]);
                setActiveApp(0);
                setCompletedApps(new Set());
              }}
              className="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-all"
              style={{ zIndex: 10 }}
            >
              Replay Lesson
            </button>
            <button
              onClick={() => goToPhase('play')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-lg shadow-amber-500/30"
              style={{ zIndex: 10 }}
            >
              Free Exploration
            </button>
          </div>

          <style>{`
            @keyframes confettiFall {
              0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
              100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
          `}</style>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Standing Waves</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-amber-400 w-6 shadow-lg shadow-amber-400/30'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
                style={{ zIndex: 10 }}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-amber-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12">{renderPhase()}</div>
    </div>
  );
};

export default StandingWavesRenderer;
