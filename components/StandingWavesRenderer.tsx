'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

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
  'play': 'Play Experiment',
  'review': 'Review Understanding',
  'twist_predict': 'New Variable Predict',
  'twist_play': 'Twist Experiment',
  'twist_review': 'Deep Insight',
  'transfer': 'Real World Transfer',
  'test': 'Knowledge Test',
  'mastery': 'Mastery Complete'
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
      { value: '440 MHz', label: 'Concert A frequency', icon: '🎵' },
      { value: '88 m', label: 'String vibrations', icon: '🎹' },
      { value: '20 s', label: 'Note duration', icon: '🔊' }
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
      { value: '2.4 GHz', label: 'WiFi frequency', icon: '📏' },
      { value: '1.0 SWR', label: 'Perfect match', icon: '📊' },
      { value: '73 W', label: 'Typical power', icon: '⚡' }
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
      { value: '300 nm', label: 'UV wavelength', icon: '💡' },
      { value: '10 ms', label: 'Pulse duration', icon: '⚡' },
      { value: '5 W', label: 'Typical power', icon: '🎯' }
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
      { value: '12.2 m', label: 'Wavelength in oven', icon: '📏' },
      { value: '2.45 GHz', label: 'Operating frequency', icon: '📡' },
      { value: '1000 W', label: 'Typical power', icon: '⚡' }
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
  const [confirmed, setConfirmed] = useState<boolean[]>(Array(10).fill(false));
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
    const amp = 75 * (1 - n * 0.05);
    const omega = baseFrequency * n * 0.015;

    const generateWavePath = () => {
      const points: string[] = [];
      // Use max(abs(sin), 0.7) so the envelope is always visually prominent even at time=0
      const timeFactor = Math.sin(omega * time);
      const visibleFactor = Math.abs(timeFactor) < 0.75 ? (timeFactor >= 0 ? 0.75 : -0.75) : timeFactor;
      for (let x = 0; x <= stringLength; x += 2) {
        const relX = x / stringLength;
        const envelope = Math.sin(Math.PI * n * relX);
        const y = stringY + amp * envelope * visibleFactor;
        points.push(`${50 + x} ${y}`);
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

          {/* Interactive marker at first antinode - moves with harmonic/tension */}
          {antinodes.length > 0 && (
            <circle
              cx={antinodes[0]}
              cy={stringY - amp * 0.7}
              r="8"
              fill="#fbbf24"
              stroke="#ffffff"
              strokeWidth="2"
              filter="url(#standAntinodeGlow)"
              opacity="0.95"
            />
          )}

          {/* Nodes with labels */}
          {nodes.map((x, i) => (
            <g key={`standNode-${i}`}>
              <circle cx={x} cy={stringY} r="10" fill="url(#standNodeGrad)" filter="url(#standNodeGlow)">
                <animate attributeName="r" values="10;12;10" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={x} cy={stringY} r="4" fill="#fef2f2" />
              {/* Node label marker */}
              <circle cx={x} cy={stringY + 28} r="8" fill="#1f2937" stroke="#ef4444" strokeWidth="1" opacity="0.9" />
              <text x={x} y={stringY + 32} textAnchor="middle" fill="#fca5a5" fontSize="11" fontWeight="700">N</text>
            </g>
          ))}

          {/* Antinodes with labels */}
          {antinodes.map((x, i) => (
            <g key={`standAntinode-${i}`}>
              <circle cx={x} cy={stringY} r="8" fill="url(#standAntinodeGrad)" filter="url(#standAntinodeGlow)" opacity="0.9" />
              <circle cx={x} cy={stringY} r="3" fill="#d1fae5" />
              {/* Antinode label marker */}
              <circle cx={x} cy={stringY - 28} r="8" fill="#1f2937" stroke="#10b981" strokeWidth="1" opacity="0.9" />
              <text x={x} y={stringY - 24} textAnchor="middle" fill="#6ee7b7" fontSize="11" fontWeight="700">A</text>
            </g>
          ))}

          {/* Harmonic indicator badge */}
          <rect x="10" y="30" width="60" height="36" rx="6" fill="#1f2937" stroke="#f59e0b" strokeWidth="1" />
          <text x="40" y="43" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="600">Harmonic</text>
          <text x="40" y="59" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="800">
            n = {n}
          </text>

          {/* Tension indicator badge - updates SVG when tension changes */}
          <rect x="430" y="30" width="60" height="36" rx="6" fill="#1f2937" stroke="#8b5cf6" strokeWidth="1" />
          <text x="460" y="43" textAnchor="middle" fill="#a78bfa" fontSize="11" fontWeight="600">Tension</text>
          <text x="460" y="59" textAnchor="middle" fill="#8b5cf6" fontSize="12" fontWeight="800">
            {tension}%
          </text>

          {/* Educational labels */}
          <text x="250" y="18" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="600">Standing Wave Pattern</text>
          <text x="95" y="185" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="600">Nodes: Zero Motion</text>
          <text x="380" y="185" textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="600">Antinodes: Max Amplitude</text>
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
              <text x="20" y="15" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="700">L/2</text>
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
              <text x="37" y="125" textAnchor="middle" fill="#a78bfa" fontSize="11" fontWeight="600">100%</text>
            </g>
            <g>
              {/* Right mirror - partially transmissive */}
              <rect x="254" y="52" width="18" height="56" rx="4" fill="url(#standMirrorGrad)" opacity="0.7" />
              <rect x="256" y="54" width="3" height="52" rx="1" fill="#ddd6fe" opacity="0.3" />
              <text x="263" y="125" textAnchor="middle" fill="#a78bfa" fontSize="11" fontWeight="600">~99%</text>
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
              <text x="28" y="15" textAnchor="middle" fill="#a78bfa" fontSize="11" fontWeight="700">L = n(lambda)/2</text>
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
              <text x="25" y="15" textAnchor="middle" fill="#6ee7b7" fontSize="11" fontWeight="600">SHELLS</text>
              <g transform="translate(10, 25)">
                <circle cx="8" cy="0" r="4" fill="#047857" />
                <text x="18" y="4" fill="#6b7488" fontSize="11" fontWeight="500">n=1</text>
              </g>
              <g transform="translate(10, 40)">
                <circle cx="8" cy="0" r="4" fill="#059669" />
                <text x="18" y="4" fill="#6b7488" fontSize="11" fontWeight="500">n=2</text>
              </g>
              <g transform="translate(10, 55)">
                <circle cx="8" cy="0" r="4" fill="#10b981" />
                <text x="18" y="4" fill="#6b7488" fontSize="11" fontWeight="500">n=3</text>
              </g>
            </g>

            {/* Quantum number indicator */}
            <g transform="translate(10, 10)">
              <rect x="0" y="0" width="65" height="22" rx="4" fill="#1f2937" stroke="#10b981" strokeWidth="1" opacity="0.9" />
              <text x="33" y="15" textAnchor="middle" fill="#6ee7b7" fontSize="11" fontWeight="700">n*lambda = 2*pi*r</text>
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
              <text x="25" y="15" textAnchor="middle" fill="#f472b6" fontSize="11" fontWeight="700">f = c/(2L)</text>
            </g>

            {/* Wavelength label */}
            <g opacity="0.6">
              <line x1="99" y1="138" x2="201" y2="138" stroke="#ec4899" strokeWidth="1" />
              <polygon points="99,135 99,141 104,138" fill="#ec4899" />
              <polygon points="201,135 201,141 196,138" fill="#ec4899" />
              <text x="150" y="148" textAnchor="middle" fill="#f472b6" fontSize="11">lambda/2</text>
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
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          padding: '24px',
          textAlign: 'center'
        }}>
          {/* Icon */}
          <div style={{
            width: '112px',
            height: '112px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), #1e293b)',
            border: '2px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            boxShadow: '0 8px 32px rgba(245, 158, 11, 0.2)'
          }}>
            <svg viewBox="0 0 60 60" style={{ width: '60%', height: '60%' }}>
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

          <h1 style={{
            fontSize: isMobile ? '36px' : '48px',
            fontWeight: 900,
            color: '#f8fafc',
            marginBottom: '16px',
            letterSpacing: '-0.02em',
            lineHeight: 1.1
          }}>
            Standing Waves
          </h1>

          <p style={{
            fontSize: '18px',
            color: '#cbd5e1',
            marginBottom: '8px',
            maxWidth: '500px',
            lineHeight: 1.5
          }}>
            Why do guitar strings only produce <span style={{ color: '#f59e0b', fontWeight: 600 }}>certain musical notes</span>?
          </p>

          <p style={{
            fontSize: '14px',
            color: '#64748b',
            marginBottom: '32px',
            maxWidth: '400px',
            lineHeight: 1.5
          }}>
            Discover harmonics, nodes, and the physics of music
          </p>

          {/* Feature cards */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
            {[
              { icon: '🎵', label: 'Harmonics' },
              { icon: '🔬', label: 'Physics' },
              { icon: '🎸', label: 'Music' }
            ].map((item, i) => (
              <div key={i} style={{
                padding: '16px 24px',
                borderRadius: '12px',
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(51, 65, 85, 0.5)'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>{item.icon}</div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>{item.label}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => goToPhase('predict')}
            style={{
              padding: '16px 40px',
              borderRadius: '16px',
              border: 'none',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '18px',
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            Start Learning
          </button>

          <p style={{
            fontSize: '12px',
            color: '#475569',
            marginTop: '24px'
          }}>
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
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '80vh',
          padding: '32px 24px',
          gap: '24px'
        }}>
          <div style={{ maxWidth: '580px', margin: '0 auto', width: '100%' }}>
            <p style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#f59e0b',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>Predict</p>
            <h2 style={{
              fontSize: isMobile ? '24px' : '30px',
              fontWeight: 900,
              color: '#f8fafc',
              marginBottom: '8px',
              lineHeight: 1.2
            }}>
              What happens when you increase frequency?
            </h2>
            <p style={{
              color: '#94a3b8',
              marginBottom: '24px',
              fontSize: '16px',
              lineHeight: 1.6
            }}>
              Imagine a guitar string fixed at both ends. You start shaking it slowly, then faster and faster.
            </p>

            {/* Static Diagram - shows a string fixed at both ends */}
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              background: 'rgba(15, 23, 42, 0.8)',
              borderRadius: '16px',
              border: '1px solid rgba(51, 65, 85, 0.5)'
            }}>
              <svg viewBox="0 0 400 120" style={{ width: '100%', height: 'auto' }}>
                <defs>
                  <linearGradient id="predictStringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#d97706" />
                    <stop offset="50%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                </defs>
                {/* Background */}
                <rect x="0" y="0" width="400" height="120" fill="#0a0f1a" rx="8" />
                {/* Fixed ends */}
                <rect x="20" y="30" width="12" height="60" rx="4" fill="#374151" />
                <rect x="368" y="30" width="12" height="60" rx="4" fill="#374151" />
                {/* Static wave showing fundamental mode */}
                <path d="M 32 60 Q 110 20 200 60 Q 290 100 368 60" fill="none" stroke="url(#predictStringGrad)" strokeWidth="3" strokeLinecap="round" />
                {/* Node markers */}
                <circle cx="32" cy="60" r="6" fill="#ef4444" />
                <circle cx="368" cy="60" r="6" fill="#ef4444" />
                {/* Antinode marker */}
                <circle cx="200" cy="40" r="5" fill="#10b981" opacity="0.8" />
                {/* Labels */}
                <text x="32" y="105" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">Fixed</text>
                <text x="368" y="105" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">Fixed</text>
                <text x="200" y="105" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="600">Fundamental Mode</text>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setPrediction(opt.id);
                    emitEvent('prediction_made', { value: opt.id });
                  }}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    border: prediction === opt.id ? '2px solid #f59e0b' : '2px solid #334155',
                    background: prediction === opt.id ? 'rgba(245, 158, 11, 0.1)' : 'rgba(30, 41, 59, 0.5)',
                    color: prediction === opt.id ? '#f8fafc' : '#cbd5e1',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '15px',
                    fontWeight: 500,
                    lineHeight: 1.5
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { if (prediction) goToPhase('play'); }}
                disabled={!prediction}
                style={{
                  padding: '16px 32px',
                  borderRadius: '12px',
                  border: 'none',
                  background: prediction
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                    : '#1e293b',
                  color: prediction ? '#ffffff' : '#64748b',
                  fontWeight: 600,
                  fontSize: '16px',
                  cursor: prediction ? 'pointer' : 'not-allowed',
                  boxShadow: prediction ? '0 4px 20px rgba(245, 158, 11, 0.3)' : 'none',
                  transition: 'all 0.2s ease'
                }}
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
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '80vh'
        }}>
          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            padding: '0 16px',
            flex: 1,
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {/* Visualization */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                minHeight: '256px'
              }}>
                {renderWaveVisualization()}
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Controls */}
              <div style={{
                padding: '24px',
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: '12px',
              }}>
                <div style={{ maxWidth: '580px', margin: '0 auto' }}>
              {/* Info card with styled container */}
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <p style={{ color: '#fbbf24', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
                  Observe how this visualization shows standing wave patterns forming on a string fixed at both ends.
                  When you increase the harmonic number, more loops appear because higher harmonics create more nodes.
                  This is important in real-world applications - musical instruments, lasers, and antennas all use these principles.
                </p>
              </div>
              {/* Key equation: f = (n/2L) × √(T/μ) */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(51, 65, 85, 0.5)',
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                <span style={{ color: '#f8fafc', fontSize: '16px', fontFamily: 'serif' }}>
                  f = (n/2L) × √(T/μ) &nbsp;→&nbsp; f<sub>n</sub> = n × {Math.round(baseFrequency)} = {frequency} Hz
                </span>
              </div>
              {/* Current vs reference comparison */}
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{
                  flex: 1,
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '12px',
                  padding: '14px',
                  textAlign: 'center'
                }}>
                  <p style={{ color: '#e2e8f0', fontSize: '11px', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reference</p>
                  <p style={{ color: '#fbbf24', fontSize: '18px', fontWeight: 700, margin: 0 }}>{Math.round(baseFrequency)} Hz</p>
                </div>
                <div style={{
                  flex: 1,
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: '12px',
                  padding: '14px',
                  textAlign: 'center'
                }}>
                  <p style={{ color: '#e2e8f0', fontSize: '11px', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current</p>
                  <p style={{ color: '#f59e0b', fontSize: '18px', fontWeight: 700, margin: 0 }}>{frequency} Hz</p>
                </div>
                <div style={{
                  flex: 1,
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '12px',
                  padding: '14px',
                  textAlign: 'center'
                }}>
                  <p style={{ color: '#e2e8f0', fontSize: '11px', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Factor</p>
                  <p style={{ color: '#a78bfa', fontSize: '18px', fontWeight: 700, margin: 0 }}>{harmonic}x</p>
                </div>
              </div>
              {/* Harmonic slider */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <label style={{
                    fontSize: '14px',
                    color: '#94a3b8',
                    fontWeight: 600
                  }}>Wave Frequency Mode</label>
                  <span style={{
                    fontSize: '14px',
                    color: '#f59e0b',
                    fontWeight: 700
                  }}>n = {harmonic}</span>
                </div>
                <input
                  type="range" min="1" max="6" value={harmonic}
                  onChange={(e) => setHarmonic(parseInt(e.target.value))}
                  style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: '#f59e0b' }}
                />
              </div>

              {/* Discovered harmonics */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5, 6].map(h => (
                    <div key={h} style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 700,
                      background: discoveredHarmonics.includes(h) ? '#10b981' : '#1e293b',
                      color: discoveredHarmonics.includes(h) ? '#ffffff' : '#64748b',
                      border: harmonic === h ? '2px solid #f59e0b' : '2px solid transparent',
                      transition: 'all 0.2s ease'
                    }}>
                      {h}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { if (discoveredHarmonics.length >= 3) goToPhase('review'); }}
                  disabled={discoveredHarmonics.length < 3}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: discoveredHarmonics.length >= 3
                      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                      : '#1e293b',
                    color: discoveredHarmonics.length >= 3 ? '#ffffff' : '#64748b',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: discoveredHarmonics.length >= 3 ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {discoveredHarmonics.length >= 3 ? 'Continue' : `Discover ${3 - discoveredHarmonics.length} more`}
                </button>
              </div>
            </div>
          </div>
          </div>
          </div>
        </div>
      );
    }

    // REVIEW
    if (phase === 'review') {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '80vh',
          padding: '32px 24px'
        }}>
          <div style={{ maxWidth: '720px', margin: '0 auto', width: '100%' }}>
            <p style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#10b981',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>Understanding</p>
            <h2 style={{
              fontSize: isMobile ? '24px' : '30px',
              fontWeight: 900,
              color: '#f8fafc',
              marginBottom: '16px',
              lineHeight: 1.2
            }}>
              The Physics of Standing Waves
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#94a3b8',
              marginBottom: '24px',
              lineHeight: 1.6
            }}>
              As you observed in the experiment, standing waves only form at specific frequencies. Your prediction was tested through observation!
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px',
              marginBottom: '32px'
            }}>
              {[
                { icon: '〰️', title: 'Standing Waves', desc: 'Form when a wave reflects and interferes with itself' },
                { icon: '⚫', title: 'Nodes', desc: 'Points of zero motion (destructive interference)' },
                { icon: '🟢', title: 'Antinodes', desc: 'Points of maximum amplitude (constructive interference)' },
                { icon: '🎵', title: 'Harmonics', desc: 'Integer multiples of the fundamental frequency' }
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '20px',
                  borderRadius: '12px',
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(51, 65, 85, 0.5)'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#f8fafc',
                    marginBottom: '4px'
                  }}>{item.title}</h4>
                  <p style={{
                    fontSize: '12px',
                    color: '#94a3b8',
                    lineHeight: 1.5
                  }}>{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Formula box */}
            <div style={{
              padding: '32px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), #1e293b)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              textAlign: 'center',
              marginBottom: '32px'
            }}>
              <p style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#f59e0b',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>Key Formula</p>
              <p style={{
                fontSize: '28px',
                fontFamily: 'serif',
                color: '#f8fafc',
                marginBottom: '16px'
              }}>
                f<sub>n</sub> = n x f<sub>1</sub> = (n/2L)sqrt(T/u)
              </p>
              <p style={{
                fontSize: '14px',
                color: '#94a3b8',
                lineHeight: 1.5
              }}>
                Frequency depends on harmonic number, length, tension, and mass density
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => goToPhase('twist_predict')}
                style={{
                  padding: '16px 32px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '16px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)',
                  transition: 'all 0.2s ease'
                }}
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
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '80vh',
          padding: '32px 24px',
          gap: '24px'
        }}>
          <div style={{ maxWidth: '580px', margin: '0 auto', width: '100%' }}>
            <p style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#8b5cf6',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>New Variable</p>
            <h2 style={{
              fontSize: isMobile ? '24px' : '30px',
              fontWeight: 900,
              color: '#f8fafc',
              marginBottom: '8px',
              lineHeight: 1.2
            }}>
              What happens when you increase string tension?
            </h2>
            <p style={{
              color: '#94a3b8',
              marginBottom: '24px',
              fontSize: '16px',
              lineHeight: 1.6
            }}>
              Think about tuning a guitar - what happens when you tighten the tuning peg?
            </p>

            {/* Static Diagram - shows tension concept */}
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              background: 'rgba(15, 23, 42, 0.8)',
              borderRadius: '16px',
              border: '1px solid rgba(51, 65, 85, 0.5)'
            }}>
              <svg viewBox="0 0 400 140" style={{ width: '100%', height: 'auto' }}>
                <defs>
                  <linearGradient id="twistStringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="50%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                </defs>
                {/* Background */}
                <rect x="0" y="0" width="400" height="140" fill="#0a0f1a" rx="8" />

                {/* Low tension string (top, loose) */}
                <rect x="20" y="25" width="12" height="35" rx="4" fill="#374151" />
                <rect x="368" y="25" width="12" height="35" rx="4" fill="#374151" />
                <path d="M 32 42 Q 120 75 200 42 Q 280 9 368 42" fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="4,4" />
                <text x="200" y="20" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="600">Low Tension</text>

                {/* High tension string (bottom, taut) */}
                <rect x="20" y="80" width="12" height="35" rx="4" fill="#374151" />
                <rect x="368" y="80" width="12" height="35" rx="4" fill="#374151" />
                <path d="M 32 97 Q 120 78 200 97 Q 280 116 368 97" fill="none" stroke="url(#twistStringGrad)" strokeWidth="3" />
                <text x="200" y="130" textAnchor="middle" fill="#a78bfa" fontSize="11" fontWeight="600">High Tension</text>

                {/* Tension arrows */}
                <polygon points="8,42 18,38 18,46" fill="#f59e0b" />
                <polygon points="392,42 382,38 382,46" fill="#f59e0b" />
                <polygon points="8,97 18,93 18,101" fill="#f59e0b" />
                <polygon points="392,97 382,93 382,101" fill="#f59e0b" />

                {/* Labels */}
                <text x="55" y="70" fill="#f59e0b" fontSize="11" fontWeight="700">T</text>
                <text x="350" y="70" fill="#f59e0b" fontSize="11" fontWeight="700">T</text>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setTwistPrediction(opt.id);
                    emitEvent('twist_prediction_made', { value: opt.id });
                  }}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    border: twistPrediction === opt.id ? '2px solid #8b5cf6' : '2px solid #334155',
                    background: twistPrediction === opt.id ? 'rgba(139, 92, 246, 0.1)' : 'rgba(30, 41, 59, 0.5)',
                    color: twistPrediction === opt.id ? '#f8fafc' : '#cbd5e1',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '15px',
                    fontWeight: 500,
                    lineHeight: 1.5
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { if (twistPrediction) goToPhase('twist_play'); }}
                disabled={!twistPrediction}
                style={{
                  padding: '16px 32px',
                  borderRadius: '12px',
                  border: 'none',
                  background: twistPrediction
                    ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                    : '#1e293b',
                  color: twistPrediction ? '#ffffff' : '#64748b',
                  fontWeight: 600,
                  fontSize: '16px',
                  cursor: twistPrediction ? 'pointer' : 'not-allowed',
                  boxShadow: twistPrediction ? '0 4px 20px rgba(139, 92, 246, 0.3)' : 'none',
                  transition: 'all 0.2s ease'
                }}
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
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '80vh'
        }}>
          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            padding: '0 16px',
            flex: 1,
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {/* Visualization */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                minHeight: '256px'
              }}>
                {renderWaveVisualization()}
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              {/* Controls */}
              <div style={{
                padding: '24px',
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: '12px',
              }}>
                <div style={{ maxWidth: '580px', margin: '0 auto' }}>
              {/* Tension slider */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <label style={{
                    fontSize: '14px',
                    color: '#94a3b8',
                    fontWeight: 600
                  }}>String Tension</label>
                  <span style={{
                    fontSize: '14px',
                    color: '#8b5cf6',
                    fontWeight: 700
                  }}>{tension}%</span>
                </div>
                <input
                  type="range" min="10" max="100" value={tension}
                  onChange={(e) => setTension(parseInt(e.target.value))}
                  style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: '#8b5cf6' }}
                />
              </div>

              {/* Harmonic slider */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <label style={{
                    fontSize: '14px',
                    color: '#94a3b8',
                    fontWeight: 600
                  }}>Harmonic</label>
                  <span style={{
                    fontSize: '14px',
                    color: '#f59e0b',
                    fontWeight: 700
                  }}>n = {harmonic}</span>
                </div>
                <input
                  type="range" min="1" max="6" value={harmonic}
                  onChange={(e) => setHarmonic(parseInt(e.target.value))}
                  style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: '#f59e0b' }}
                />
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{
                  padding: '12px 20px',
                  borderRadius: '12px',
                  background: '#1e293b'
                }}>
                  <span style={{
                    fontSize: '12px',
                    color: '#64748b'
                  }}>Frequency: </span>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 900,
                    color: '#f59e0b'
                  }}>{frequency} Hz</span>
                </div>
                <button
                  onClick={() => goToPhase('twist_review')}
                  style={{
                    padding: '12px 32px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
          </div>
          </div>
        </div>
      );
    }

    // TWIST REVIEW
    if (phase === 'twist_review') {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '80vh',
          padding: '32px 24px'
        }}>
          <div style={{ maxWidth: '580px', margin: '0 auto', width: '100%' }}>
            <p style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#10b981',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>Deep Insight</p>
            <h2 style={{
              fontSize: isMobile ? '24px' : '30px',
              fontWeight: 900,
              color: '#f8fafc',
              marginBottom: '24px',
              lineHeight: 1.2
            }}>
              You've Mastered the Variables!
            </h2>

            <div style={{
              padding: '24px',
              borderRadius: '12px',
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(51, 65, 85, 0.5)',
              marginBottom: '32px'
            }}>
              <p style={{
                color: '#cbd5e1',
                lineHeight: 1.6,
                marginBottom: '16px',
                fontSize: '16px'
              }}>
                Standing wave frequency depends on four key variables:
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li style={{ color: '#f8fafc', fontSize: '15px', lineHeight: 1.5 }}>
                  <strong style={{ color: '#f59e0b' }}>Harmonic number (n)</strong> - Integer multiples of fundamental
                </li>
                <li style={{ color: '#f8fafc', fontSize: '15px', lineHeight: 1.5 }}>
                  <strong style={{ color: '#8b5cf6' }}>Tension (T)</strong> - Higher tension = higher frequency
                </li>
                <li style={{ color: '#f8fafc', fontSize: '15px', lineHeight: 1.5 }}>
                  <strong style={{ color: '#10b981' }}>Length (L)</strong> - Shorter string = higher frequency
                </li>
                <li style={{ color: '#f8fafc', fontSize: '15px', lineHeight: 1.5 }}>
                  <strong style={{ color: '#ec4899' }}>Mass density (u)</strong> - Lighter string = higher frequency
                </li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => goToPhase('transfer')}
                style={{
                  padding: '16px 32px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '16px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)',
                  transition: 'all 0.2s ease'
                }}
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
      return (
        <TransferPhaseView
          conceptName="Standing Waves"
          applications={realWorldApps}
          onComplete={() => goToPhase('test')}
          isMobile={isMobile}
          typo={typo}
          playSound={playSound}
        />
      );
    }

    if (phase === 'transfer') {
      const app = realWorldApps[activeApp];
      const allAppsCompleted = completedApps.size === realWorldApps.length;

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '80vh'
        }}>
          {/* Progress indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.8)',
            borderBottom: '1px solid rgba(51, 65, 85, 0.5)'
          }}>
            <span style={{ fontSize: '14px', color: '#94a3b8' }}>
              Application {activeApp + 1} of {realWorldApps.length}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {realWorldApps.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: completedApps.has(idx) ? '#10b981' : idx === activeApp ? '#f59e0b' : '#475569',
                    transition: 'all 0.2s ease'
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              ({completedApps.size}/{realWorldApps.length} read)
            </span>
          </div>

          {/* Tab bar */}
          <div style={{
            display: 'flex',
            gap: '8px',
            padding: '12px 16px',
            background: 'rgba(15, 23, 42, 0.8)',
            borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
            overflowX: 'auto'
          }}>
            {realWorldApps.map((a, idx) => {
              const isCompleted = completedApps.has(idx);
              const isCurrent = idx === activeApp;
              const canAccess = isCompleted || idx === activeApp;
              return (
                <button
                  key={a.title}
                  onClick={() => {
                    if (canAccess) {
                      setActiveApp(idx);
                      emitEvent('app_explored', { appIndex: idx });
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    cursor: canAccess ? 'pointer' : 'not-allowed',
                    background: isCurrent ? '#334155' : isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                    color: isCurrent ? '#f8fafc' : isCompleted ? '#10b981' : '#64748b',
                    opacity: canAccess ? 1 : 0.5,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isCompleted && !isCurrent ? '✓ ' : ''}{a.title}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          paddingBottom: '100px',
          paddingTop: '48px',
          paddingTop: '48px',
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
              {/* Graphic */}
              <div style={{
                marginBottom: '24px',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid rgba(51, 65, 85, 0.5)',
                background: 'rgba(15, 23, 42, 0.5)'
              }}>
                {renderApplicationGraphic()}
              </div>

              {/* Title and tagline */}
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '32px', marginRight: '12px' }}>{app.icon}</span>
                <h3 style={{
                  fontSize: '28px',
                  fontWeight: 900,
                  color: '#f8fafc',
                  display: 'inline',
                  lineHeight: 1.3
                }}>{app.title}</h3>
              </div>
              <p style={{
                fontSize: '16px',
                fontWeight: 600,
                color: app.color,
                marginBottom: '16px'
              }}>{app.tagline}</p>

              {/* Extended description */}
              <p style={{
                color: '#e2e8f0',
                fontSize: '16px',
                lineHeight: 1.7,
                marginBottom: '16px'
              }}>{app.description}</p>

              <p style={{
                color: '#cbd5e1',
                fontSize: '15px',
                lineHeight: 1.7,
                marginBottom: '16px'
              }}>{app.connection}</p>

              <p style={{
                color: '#94a3b8',
                fontSize: '14px',
                lineHeight: 1.7,
                marginBottom: '24px'
              }}>{app.howItWorks}</p>

              {/* Statistics Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '24px'
              }}>
                {app.stats.map((stat, i) => (
                  <div key={i} style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(51, 65, 85, 0.5)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: app.color }}>{stat.value}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Company names */}
              <div style={{
                padding: '16px',
                borderRadius: '12px',
                background: `${app.color}10`,
                border: `1px solid ${app.color}30`,
                marginBottom: '24px'
              }}>
                <p style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: app.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '8px'
                }}>Industry Leaders</p>
                <p style={{ color: '#e2e8f0', fontSize: '15px', lineHeight: 1.6 }}>
                  {app.companies.join(' • ')}
                </p>
              </div>

              {/* Future impact */}
              <div style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                marginBottom: '24px'
              }}>
                <p style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#a78bfa',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '8px'
                }}>Future Impact</p>
                <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6 }}>
                  {app.futureImpact}
                </p>
              </div>

              {/* Got It / Next Application Button */}
              {!completedApps.has(activeApp) ? (
                <button
                  onClick={() => {
                    const newCompleted = new Set(completedApps);
                    newCompleted.add(activeApp);
                    setCompletedApps(newCompleted);
                    emitEvent('app_explored', { app: app.title });
                    if (activeApp < realWorldApps.length - 1) {
                      setTimeout(() => setActiveApp(activeApp + 1), 300);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '16px 32px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '16px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {activeApp < realWorldApps.length - 1 ? 'Got It! Next Application →' : 'Got It! Complete Applications'}
                </button>
              ) : (
                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  textAlign: 'center'
                }}>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Completed</span>
                </div>
              )}
            </div>
          </div>

          {/* Take the Test Button - appears when all apps completed */}
          {allAppsCompleted && (
            <div style={{
              padding: '16px 24px',
              background: 'rgba(15, 23, 42, 0.95)',
              borderTop: '1px solid rgba(51, 65, 85, 0.5)'
            }}>
              <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
                <div style={{
                  marginBottom: '12px',
                  color: '#10b981',
                  fontWeight: 600,
                  fontSize: '14px'
                }}>
                  ✓ All {realWorldApps.length} applications read!
                </div>
                <button
                  onClick={() => goToPhase('test')}
                  style={{
                    width: '100%',
                    padding: '16px 32px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '18px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Take the Test
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // TEST
    if (phase === 'test') {
      const q = testQuestions[testIndex];
      const hasSelected = answers[testIndex] !== null;
      const isConfirmed = confirmed[testIndex];
      const answered = hasSelected && isConfirmed;

      if (showResult) {
        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '80vh',
            padding: '24px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '72px', marginBottom: '24px' }}>
              {score >= 8 ? '🏆' : score >= 6 ? '⭐' : '📚'}
            </div>
            <p style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#10b981',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              Test Complete! You scored
            </p>
            <h2 style={{
              fontSize: '36px',
              fontWeight: 900,
              color: '#f8fafc',
              marginBottom: '16px'
            }}>
              {score}/10 Correct
            </h2>
            <p style={{
              fontSize: '18px',
              color: '#94a3b8',
              marginBottom: '32px',
              maxWidth: '400px',
              lineHeight: 1.6
            }}>
              {score >= 8 ? "Excellent! You've truly mastered standing waves!" :
               score >= 6 ? "Good job! Review the concepts you missed." :
               "Keep practicing! Review the material and try again."}
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setPhase('hook');
                  setTestIndex(0);
                  setAnswers(Array(10).fill(null));
                  setConfirmed(Array(10).fill(false));
                  setShowResult(false);
                  setDiscoveredHarmonics([1]);
                  setActiveApp(0);
                  setCompletedApps(new Set());
                }}
                style={{
                  padding: '14px 28px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#334155',
                  color: '#e2e8f0',
                  fontWeight: 600,
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Replay Lesson
              </button>
              <button
                onClick={() => goToPhase('mastery')}
                style={{
                  padding: '16px 40px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '18px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.2s ease'
                }}
              >
                Complete Lesson
              </button>
            </div>
          </div>
        );
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '80vh',
          padding: '32px 24px'
        }}>
          <div style={{ maxWidth: '580px', margin: '0 auto', width: '100%', flex: 1 }}>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <span style={{
                fontSize: '14px',
                color: '#64748b',
                fontWeight: 600
              }}>
                Question {testIndex + 1} of 10
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {answers.slice(0, 10).map((a, i) => (
                  <div key={i} style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: a !== null
                      ? (testQuestions[i].options.find(o => o.correct)?.id === testQuestions[i].options[a]?.id ? '#10b981' : '#ef4444')
                      : i === testIndex ? '#f59e0b' : '#475569',
                    transition: 'all 0.2s ease'
                  }} />
                ))}
              </div>
            </div>

            {/* Scenario */}
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              marginBottom: '16px'
            }}>
              <p style={{
                fontSize: '14px',
                color: '#e2e8f0',
                lineHeight: 1.7,
                fontStyle: 'italic'
              }}>
                {q.scenario}
              </p>
            </div>

            {/* Question */}
            <h3 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#f8fafc',
              marginBottom: '24px',
              lineHeight: 1.5
            }}>
              {q.question}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {q.options.map((opt, i) => {
                const isSelected = answers[testIndex] === i;
                const isCorrect = opt.correct;
                const showFeedback = answered;

                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (!isConfirmed) {
                        const newAnswers = [...answers];
                        newAnswers[testIndex] = i;
                        setAnswers(newAnswers);
                      }
                    }}
                    disabled={isConfirmed}
                    style={{
                      padding: '16px 20px',
                      borderRadius: '12px',
                      border: showFeedback
                        ? isCorrect
                          ? '2px solid #10b981'
                          : isSelected
                            ? '2px solid #ef4444'
                            : '2px solid #334155'
                        : isSelected
                          ? '2px solid #f59e0b'
                          : '2px solid #334155',
                      background: showFeedback
                        ? isCorrect
                          ? 'rgba(16, 185, 129, 0.1)'
                          : isSelected
                            ? 'rgba(239, 68, 68, 0.1)'
                            : 'rgba(30, 41, 59, 0.5)'
                        : isSelected
                          ? 'rgba(245, 158, 11, 0.1)'
                          : 'rgba(30, 41, 59, 0.5)',
                      color: '#f8fafc',
                      textAlign: 'left',
                      cursor: isConfirmed ? 'default' : 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '15px',
                      lineHeight: 1.5,
                      fontWeight: 500
                    }}
                  >
                    <span style={{ marginRight: '8px', fontWeight: 700, color: '#94a3b8' }}>{opt.id.toUpperCase()})</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Check Answer button */}
            {hasSelected && !isConfirmed && (
              <button
                onClick={() => {
                  const newConfirmed = [...confirmed];
                  newConfirmed[testIndex] = true;
                  setConfirmed(newConfirmed);
                  emitEvent('test_answered', { questionIndex: testIndex, correct: q.options[answers[testIndex] as number]?.correct || false });
                }}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '16px',
                  cursor: 'pointer',
                  marginBottom: '16px',
                  boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
                  transition: 'all 0.2s ease'
                }}
              >
                Check Answer
              </button>
            )}

            {/* Explanation */}
            {answered && (
              <div style={{
                padding: '16px',
                borderRadius: '12px',
                background: q.options[answers[testIndex] as number]?.correct
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
                border: q.options[answers[testIndex] as number]?.correct
                  ? '1px solid rgba(16, 185, 129, 0.3)'
                  : '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                <p style={{ color: '#f8fafc', fontSize: '14px', lineHeight: 1.6 }}>
                  <strong style={{
                    color: q.options[answers[testIndex] as number]?.correct ? '#10b981' : '#ef4444'
                  }}>
                    {q.options[answers[testIndex] as number]?.correct ? '✓ Correct!' : '✗ Not quite.'}
                  </strong>{' '}
                  <span>Explanation: {q.explanation}</span>
                  {!q.options[answers[testIndex] as number]?.correct && (
                    <span style={{ display: 'block', marginTop: '8px', color: '#94a3b8' }}>
                      The correct answer is {q.options.find(o => o.correct)?.id.toUpperCase()}) {q.options.find(o => o.correct)?.label}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '16px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(51, 65, 85, 0.5)'
          }}>
            <button
              onClick={() => { if (testIndex > 0) setTestIndex(testIndex - 1); }}
              disabled={testIndex === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                background: testIndex === 0 ? '#1e293b' : '#334155',
                color: testIndex === 0 ? '#64748b' : '#e2e8f0',
                fontWeight: 600,
                fontSize: '14px',
                cursor: testIndex === 0 ? 'not-allowed' : 'pointer',
                opacity: testIndex === 0 ? 0.4 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              ← Previous
            </button>
            {testIndex < 9 ? (
              <button
                onClick={() => { if (answered) setTestIndex(testIndex + 1); }}
                disabled={!answered}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: answered
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                    : '#1e293b',
                  color: answered ? '#ffffff' : '#64748b',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: answered ? 'pointer' : 'not-allowed',
                  opacity: answered ? 1 : 0.4,
                  transition: 'all 0.2s ease'
                }}
              >
                Next Question →
              </button>
            ) : (
              <button
                onClick={() => { if (answered) setShowResult(true); }}
                disabled={!answered}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: answered
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : '#1e293b',
                  color: answered ? '#ffffff' : '#64748b',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: answered ? 'pointer' : 'not-allowed',
                  opacity: answered ? 1 : 0.4,
                  transition: 'all 0.2s ease'
                }}
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
        <div style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          padding: '24px',
          textAlign: 'center',
          overflow: 'hidden'
        }}>
          {/* Confetti */}
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: ['#f59e0b', '#8b5cf6', '#10b981', '#ec4899'][i % 4],
                animation: `confettiFall 3s ease-out ${Math.random() * 2}s infinite`,
                opacity: 0.8
              }}
            />
          ))}

          <div style={{
            width: '112px',
            height: '112px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #f59e0b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            boxShadow: '0 12px 40px rgba(16, 185, 129, 0.3)',
            zIndex: 10
          }}>
            <span style={{ fontSize: '48px' }}>🎓</span>
          </div>

          <h1 style={{
            fontSize: '36px',
            fontWeight: 900,
            color: '#f8fafc',
            marginBottom: '16px',
            zIndex: 10
          }}>
            Congratulations!
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#94a3b8',
            marginBottom: '24px',
            maxWidth: '400px',
            lineHeight: 1.6,
            zIndex: 10
          }}>
            You've mastered Standing Waves! You now understand the physics behind every musical instrument.
          </p>

          {/* Score */}
          <div style={{
            padding: '16px 32px',
            borderRadius: '12px',
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(51, 65, 85, 0.5)',
            marginBottom: '32px',
            zIndex: 10
          }}>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Quiz Score</p>
            <p style={{
              fontSize: '36px',
              fontWeight: 900,
              color: score >= 8 ? '#10b981' : '#f59e0b'
            }}>{score}/10</p>
          </div>

          {/* Topics learned */}
          <div style={{
            padding: '20px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            marginBottom: '32px',
            maxWidth: '400px',
            zIndex: 10
          }}>
            <p style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#10b981',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>What You Learned</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {['Harmonics', 'Nodes', 'Antinodes', 'Tension', 'Frequency', 'Music Physics'].map((topic, i) => (
                <span key={i} style={{
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  background: '#1e293b',
                  color: '#f8fafc',
                  fontSize: '14px',
                  fontWeight: 600
                }}>
                  {topic}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', zIndex: 10 }}>
            <button
              onClick={() => {
                setPhase('hook');
                setTestIndex(0);
                setAnswers(Array(10).fill(null));
                setConfirmed(Array(10).fill(false));
                setShowResult(false);
                setDiscoveredHarmonics([1]);
                setActiveApp(0);
                setCompletedApps(new Set());
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                background: '#334155',
                color: '#e2e8f0',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Replay Lesson
            </button>
            <button
              onClick={() => goToPhase('play')}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)',
                transition: 'all 0.2s ease'
              }}
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

  // Calculate progress for the progress bar
  const progressPercent = ((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100;

  // Handle navigation
  const currentPhaseIndex = phaseOrder.indexOf(phase);
  const canGoBack = currentPhaseIndex > 0;
  const canGoNext = currentPhaseIndex < phaseOrder.length - 1;

  const handleBack = () => {
    if (canGoBack) {
      goToPhase(phaseOrder[currentPhaseIndex - 1]);
    }
  };

  const handleNext = () => {
    if (canGoNext && phase !== 'test') {
      goToPhase(phaseOrder[currentPhaseIndex + 1]);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #0f172a 0%, #0a1628 50%, #0f172a 100%)',
      color: '#f8fafc',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Progress Bar - Fixed at top (using aside to not interfere with footer detection) */}
      <aside style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: '#1f2937',
        zIndex: 100
      }}>
        <span style={{
          display: 'block',
          height: '100%',
          width: `${progressPercent}%`,
          background: 'linear-gradient(90deg, #a855f7, #10b981)',
          transition: 'width 0.3s ease'
        }} />
      </aside>

      {/* Header with Navigation Dots */}
      <div style={{
        position: 'fixed',
        top: '4px',
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
        padding: '12px 24px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '896px',
          margin: '0 auto'
        }}>
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.8)',
            letterSpacing: '0.025em'
          }}>Standing Waves</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {phaseOrder.map((p, idx) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                aria-label={phaseLabels[p]}
                style={{
                  width: phase === p ? '24px' : '10px',
                  height: '10px',
                  borderRadius: '9999px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  background: phase === p
                    ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                    : phaseOrder.indexOf(phase) > idx
                      ? '#10b981'
                      : '#475569',
                  boxShadow: phase === p ? '0 0 12px rgba(245, 158, 11, 0.4)' : 'none'
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#f59e0b'
          }}>{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main scrollable content area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '72px',
        paddingBottom: '80px'
      }}>
        {renderPhase()}
      </div>

      {/* Fixed Bottom Navigation Bar */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#0f172a',
        borderTop: '1px solid #334155',
        padding: '12px 24px',
        zIndex: 100,
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '896px',
          margin: '0 auto'
        }}>
          <button
            onClick={handleBack}
            disabled={!canGoBack}
            style={{
              padding: '12px 24px',
              minHeight: '48px',
              borderRadius: '12px',
              border: 'none',
              background: canGoBack ? '#334155' : '#1e293b',
              color: canGoBack ? '#e2e8f0' : '#64748b',
              fontWeight: 600,
              fontSize: '14px',
              cursor: canGoBack ? 'pointer' : 'not-allowed',
              opacity: canGoBack ? 1 : 0.4,
              transition: 'all 0.2s ease'
            }}
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!canGoNext || phase === 'test'}
            style={{
              padding: '12px 24px',
              minHeight: '48px',
              borderRadius: '12px',
              border: 'none',
              background: (canGoNext && phase !== 'test')
                ? 'linear-gradient(135deg, #a855f7, #7c3aed)'
                : '#1e293b',
              color: (canGoNext && phase !== 'test') ? '#ffffff' : '#64748b',
              fontWeight: 600,
              fontSize: '14px',
              cursor: (canGoNext && phase !== 'test') ? 'pointer' : 'not-allowed',
              opacity: (canGoNext && phase !== 'test') ? 1 : 0.4,
              transition: 'all 0.2s ease'
            }}
          >
            Next
          </button>
        </div>
      </nav>
    </div>
  );
};

export default StandingWavesRenderer;
