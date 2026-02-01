'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Real-world applications for microwave standing waves
const realWorldApps = [
  {
    icon: '🔬',
    title: 'Microwave Chemistry',
    short: 'Accelerated chemical reactions',
    tagline: 'Heating molecules from the inside out',
    description: 'Industrial microwave reactors use precisely controlled standing wave patterns to heat chemical reactions. By placing reactants at antinodes (hot spots), chemists achieve uniform heating that can accelerate reactions 100x while reducing energy consumption.',
    connection: 'The game showed how standing waves create fixed hot spots at antinodes. Industrial microwave reactors position reaction vessels at these maxima for optimal energy coupling, using the same λ/2 spacing principles.',
    howItWorks: 'Microwave cavity tuned to create specific standing wave pattern. Reaction vessel placed at antinode position. Dielectric heating excites polar molecules uniformly throughout volume. Temperature sensors and feedback adjust power.',
    stats: [
      { value: '100x', label: 'Reaction speed increase', icon: '⚡' },
      { value: '90%', label: 'Energy efficiency', icon: '📈' },
      { value: '$2B', label: 'Industrial microwave market', icon: '💰' }
    ],
    examples: ['Pharmaceutical synthesis', 'Polymer curing', 'Organic chemistry', 'Materials processing'],
    companies: ['CEM Corporation', 'Anton Paar', 'Milestone', 'Biotage'],
    futureImpact: 'Continuous flow microwave reactors will enable on-demand pharmaceutical manufacturing at point of care.',
    color: '#8b5cf6'
  },
  {
    icon: '📡',
    title: 'Antenna Design',
    short: 'Standing wave ratio in RF systems',
    tagline: 'Maximizing signal, minimizing reflections',
    description: 'Radio engineers obsess over standing wave ratio (SWR) - the measure of how much energy reflects back versus being radiated. Impedance mismatches create standing waves that waste power and can damage transmitters. Perfect matching means SWR = 1.',
    connection: 'The game demonstrated how wave reflections create standing patterns. In antennas, these same reflections from impedance mismatches create standing waves on transmission lines, reducing efficiency.',
    howItWorks: 'Antenna impedance must match transmission line (typically 50Ω). Mismatch causes partial reflection. Forward and reflected waves superpose into standing wave. SWR meter measures ratio. Matching networks tune out reflections.',
    stats: [
      { value: '1.5:1', label: 'Acceptable SWR', icon: '📊' },
      { value: '50Ω', label: 'Standard impedance', icon: '⚡' },
      { value: '$30B', label: 'RF component market', icon: '📈' }
    ],
    examples: ['Cell tower antennas', 'Ham radio stations', 'WiFi routers', 'Satellite uplinks'],
    companies: ['Ericsson', 'CommScope', 'Amphenol', 'TE Connectivity'],
    futureImpact: 'Reconfigurable intelligent surfaces will dynamically shape standing wave patterns to optimize 6G wireless coverage.',
    color: '#3b82f6'
  },
  {
    icon: '🎸',
    title: 'Musical Instrument Acoustics',
    short: 'Standing waves make music',
    tagline: 'Every note is a resonant mode',
    description: 'Musical instruments work by creating standing waves - on strings, in air columns, or on vibrating surfaces. The fundamental frequency and overtones that give each instrument its timbre are simply different standing wave patterns with nodes and antinodes.',
    connection: 'The microwave standing wave patterns directly parallel acoustic standing waves. The λ/2 spacing between nodes, the relationship between cavity size and wavelength, and resonance conditions apply to guitars, flutes, and drums alike.',
    howItWorks: 'String or air column length determines fundamental wavelength. Boundary conditions (fixed ends, open/closed pipes) set node positions. Multiple standing wave modes produce harmonics. Body/cavity shapes amplify certain frequencies.',
    stats: [
      { value: '440Hz', label: 'A4 concert pitch', icon: '🎵' },
      { value: '20-20kHz', label: 'Human hearing range', icon: '👂' },
      { value: '$20B', label: 'Musical instrument market', icon: '📈' }
    ],
    examples: ['Guitar harmonics', 'Organ pipes', 'Violin resonances', 'Drum modes'],
    companies: ['Fender', 'Yamaha', 'Steinway', 'Gibson'],
    futureImpact: 'Computational acoustics will enable 3D-printed instruments with impossible geometries optimized for specific tonal qualities.',
    color: '#22c55e'
  },
  {
    icon: '⚛️',
    title: 'Particle Accelerators',
    short: 'RF cavities for atom smashing',
    tagline: 'Surfing on electromagnetic waves',
    description: 'Particle accelerators use radio frequency cavities where standing electromagnetic waves accelerate charged particles. Particles arrive at the cavity just as the electric field reaches maximum (antinode), gaining energy each pass like surfers catching waves.',
    connection: 'The game showed antinodes as energy maxima. In accelerator cavities, particles must arrive when the standing wave electric field peaks - timing synchronized to λ/2 spacing between cavities determines the achievable energy.',
    howItWorks: 'RF power creates standing wave in resonant cavity. Electric field oscillates at GHz frequencies. Particle bunches timed to arrive at field maximum. Each cavity adds ~1 MeV. Thousands of cavities achieve TeV energies.',
    stats: [
      { value: '14TeV', label: 'LHC collision energy', icon: '⚡' },
      { value: '400MHz', label: 'LHC RF frequency', icon: '📡' },
      { value: '$10B', label: 'Accelerator construction', icon: '📈' }
    ],
    examples: ['Large Hadron Collider', 'Cancer proton therapy', 'X-ray synchrotrons', 'Spallation sources'],
    companies: ['CERN', 'Fermilab', 'SLAC', 'Varian Medical'],
    futureImpact: 'Plasma wakefield accelerators will achieve LHC energies in meters instead of kilometers using different wave physics.',
    color: '#f59e0b'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════
// String phases for game progression
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const PHASE_ORDER: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review', twist_predict: 'Twist Predict',
  twist_play: 'Twist Lab', twist_review: 'Twist Review', transfer: 'Transfer', test: 'Test', mastery: 'Mastery'
};

interface Props {
  currentPhase?: Phase;
  onPhaseComplete?: (phase: Phase) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const TEST_QUESTIONS = [
  {
    question: 'Why does a microwave oven have hot spots and cold spots?',
    options: [
      { text: 'The magnetron doesn\'t produce enough power', correct: false },
      { text: 'Standing waves form with fixed nodes (cold) and antinodes (hot)', correct: true },
      { text: 'Food absorbs microwaves unevenly due to its color', correct: false },
      { text: 'The walls absorb some of the microwave energy', correct: false }
    ]
  },
  {
    question: 'What happens at a standing wave node?',
    options: [
      { text: 'Maximum energy - food heats fastest', correct: false },
      { text: 'Minimum/zero energy - food barely heats', correct: true },
      { text: 'The wave changes direction', correct: false },
      { text: 'Microwaves are absorbed by the walls', correct: false }
    ]
  },
  {
    question: 'Why do microwave ovens have turntables?',
    options: [
      { text: 'To look more professional', correct: false },
      { text: 'To move food through hot spots for even heating', correct: true },
      { text: 'To prevent sparks', correct: false },
      { text: 'To reduce microwave power consumption', correct: false }
    ]
  },
  {
    question: 'The wavelength of microwave radiation is about 12 cm. What distance is between hot spots?',
    options: [
      { text: '12 cm (one wavelength)', correct: false },
      { text: '6 cm (half wavelength)', correct: true },
      { text: '3 cm (quarter wavelength)', correct: false },
      { text: '24 cm (two wavelengths)', correct: false }
    ]
  },
  {
    question: 'What is an antinode in a standing wave?',
    options: [
      { text: 'A point of zero amplitude where waves cancel out', correct: false },
      { text: 'A point of maximum amplitude where waves reinforce', correct: true },
      { text: 'The wavelength of the microwave', correct: false },
      { text: 'The frequency of the oscillation', correct: false }
    ]
  },
  {
    question: 'How do standing waves form inside a microwave oven?',
    options: [
      { text: 'The magnetron creates multiple beams', correct: false },
      { text: 'Waves reflect off metal walls and interfere with incoming waves', correct: true },
      { text: 'Food molecules vibrate and create new waves', correct: false },
      { text: 'The turntable generates secondary waves', correct: false }
    ]
  },
  {
    question: 'If microwave frequency is 2.45 GHz, what can you conclude about the wavelength?',
    options: [
      { text: 'Wavelength = speed of light / frequency, so about 12.2 cm', correct: true },
      { text: 'Wavelength equals frequency, so 2.45 cm', correct: false },
      { text: 'Wavelength cannot be calculated from frequency', correct: false },
      { text: 'Wavelength is always 1 meter for microwaves', correct: false }
    ]
  },
  {
    question: 'In a microwave without a turntable, where should you place food for best heating?',
    options: [
      { text: 'Always in the exact center', correct: false },
      { text: 'Near the walls where reflections are strongest', correct: false },
      { text: 'At antinode positions where energy is maximum', correct: true },
      { text: 'It doesn\'t matter where you place it', correct: false }
    ]
  },
  {
    question: 'Why do some microwaves use a rotating metal stirrer instead of a turntable?',
    options: [
      { text: 'To create more microwaves', correct: false },
      { text: 'To reflect waves in changing directions, moving the hot spots', correct: true },
      { text: 'To reduce power consumption', correct: false },
      { text: 'Stirrers are cheaper to manufacture', correct: false }
    ]
  },
  {
    question: 'You can measure microwave wavelength by heating marshmallows. Why does this work?',
    options: [
      { text: 'Marshmallows absorb only certain wavelengths', correct: false },
      { text: 'The distance between melted spots equals half the wavelength', correct: true },
      { text: 'Marshmallows change color at specific temperatures', correct: false },
      { text: 'Sugar molecules resonate at the microwave frequency', correct: false }
    ]
  }
];

const TRANSFER_APPS = [
  {
    title: 'Marshmallow Experiment',
    description: 'Remove the turntable, heat marshmallows, measure distance between melted spots to find wavelength!',
    icon: '🍡'
  },
  {
    title: 'Acoustic Room Modes',
    description: 'Bass frequencies create standing waves in rooms - some spots have strong bass, others weak.',
    icon: '🔊'
  },
  {
    title: 'Laser Cavities',
    description: 'Lasers use standing waves between mirrors to amplify light at specific frequencies.',
    icon: '🔴'
  },
  {
    title: 'Musical Instruments',
    description: 'String and wind instruments create standing waves at specific harmonics!',
    icon: '🎸'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const MicrowaveStandingWaveRenderer: React.FC<Props> = ({ currentPhase, onPhaseComplete }) => {
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

  const [phase, setPhase] = useState<Phase>(currentPhase ?? 'hook');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<number[]>([]);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Simulation state
  const [isCooking, setIsCooking] = useState(false);
  const [turntableOn, setTurntableOn] = useState(false);
  const [cookTime, setCookTime] = useState(0);
  const [foodTemp, setFoodTemp] = useState<number[]>(Array(25).fill(20));
  const [animPhase, setAnimPhase] = useState(0);
  const [turntableAngle, setTurntableAngle] = useState(0);

  // Interactive slider parameters for play phase
  const [frequency, setFrequency] = useState(2.45); // GHz - standard microwave frequency
  const [cavityLength, setCavityLength] = useState(30); // cm - typical cavity size
  const [powerLevel, setPowerLevel] = useState(100); // percentage

  // Twist state
  const [twistTurntable, setTwistTurntable] = useState(false);
  const [twistCookTime, setTwistCookTime] = useState(0);
  const [twistFoodTemp, setTwistFoodTemp] = useState<number[]>(Array(25).fill(20));

  // Twist comparison state
  const [twistNoTurntableTemp, setTwistNoTurntableTemp] = useState<number[]>(Array(25).fill(20));
  const [twistWithTurntableTemp, setTwistWithTurntableTemp] = useState<number[]>(Array(25).fill(20));
  const [twistComparisonRunning, setTwistComparisonRunning] = useState(false);
  const [twistComparisonComplete, setTwistComparisonComplete] = useState(false);

  // Food position state for twist
  const [foodPosition, setFoodPosition] = useState<'center' | 'edge' | 'corner'>('center');

  // Multi-mode cavity resonance
  const [cavityMode, setCavityMode] = useState<1 | 2 | 3>(1);

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // Phase sync
  useEffect(() => {
    if (currentPhase !== undefined && currentPhase !== phase) {
      setPhase(currentPhase);
    }
  }, [currentPhase, phase]);

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
    } catch { /* Audio not available */ }
  }, []);

  const goToPhase = useCallback((newPhase: Phase) => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    onPhaseComplete?.(newPhase);
    setTimeout(() => { navigationLockRef.current = false; }, 400);
  }, [playSound, onPhaseComplete]);

  const goToNextPhase = useCallback(() => {
    const currentIndex = PHASE_ORDER.indexOf(phase);
    if (currentIndex < PHASE_ORDER.length - 1) {
      goToPhase(PHASE_ORDER[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Calculate wavelength from frequency: λ = c/f
  const wavelength = (3e8 / (frequency * 1e9)) * 100; // in cm

  // Number of wavelengths that fit in cavity determines standing wave pattern
  const nodesPerCavity = Math.floor(cavityLength / (wavelength / 2));

  // Standing wave intensity pattern (simplified 2D) with frequency/cavity dependence
  const getIntensityAt = (x: number, y: number, angle: number, mode: number = 1) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;

    // Scale based on how many half-wavelengths fit in the cavity
    const scaleFactor = (cavityLength / 30) * (2.45 / frequency) * mode;
    const intensity = Math.abs(
      Math.sin(rx * Math.PI * 2 * scaleFactor) *
      Math.sin(ry * Math.PI * 2 * scaleFactor)
    );
    return intensity * (powerLevel / 100);
  };

  // Get position offset for different food positions
  const getFoodPositionOffset = () => {
    switch (foodPosition) {
      case 'center': return { x: 0, y: 0 };
      case 'edge': return { x: 0.3, y: 0 };
      case 'corner': return { x: 0.3, y: 0.3 };
      default: return { x: 0, y: 0 };
    }
  };

  // Animation Effect
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 0.15) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Cooking simulation
  useEffect(() => {
    if (!isCooking) return;

    const interval = setInterval(() => {
      setCookTime(t => t + 0.1);
      setTurntableAngle(a => turntableOn ? (a + 0.05) % (Math.PI * 2) : a);

      setFoodTemp(prev => {
        return prev.map((temp, i) => {
          const x = (i % 5) / 4 - 0.5;
          const y = Math.floor(i / 5) / 4 - 0.5;
          const intensity = getIntensityAt(x, y, turntableOn ? turntableAngle : 0, 1);
          const heating = intensity * 2 * (powerLevel / 100);
          return Math.min(100, temp + heating);
        });
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isCooking, turntableOn, turntableAngle]);

  // Twist cooking simulation with side-by-side comparison
  useEffect(() => {
    if (phase !== 'twist_play') return;
    if (!twistComparisonRunning) return;
    if (twistCookTime <= 0) {
      setTwistComparisonRunning(false);
      setTwistComparisonComplete(true);
      return;
    }

    const posOffset = getFoodPositionOffset();

    const cookInterval = setInterval(() => {
      setTwistCookTime(t => {
        if (t <= 0.1) return 0;
        return t - 0.1;
      });

      // Cook without turntable
      setTwistNoTurntableTemp(prev => {
        return prev.map((temp, i) => {
          const x = (i % 5) / 4 - 0.5 + posOffset.x;
          const y = Math.floor(i / 5) / 4 - 0.5 + posOffset.y;
          const intensity = getIntensityAt(x, y, 0, cavityMode);
          const heating = intensity * 3;
          return Math.min(100, temp + heating);
        });
      });

      // Cook with turntable
      setTwistWithTurntableTemp(prev => {
        return prev.map((temp, i) => {
          const x = (i % 5) / 4 - 0.5 + posOffset.x;
          const y = Math.floor(i / 5) / 4 - 0.5 + posOffset.y;
          const angle = (10 - twistCookTime) * 0.5;
          const intensity = getIntensityAt(x, y, angle, cavityMode);
          const heating = intensity * 3;
          return Math.min(100, temp + heating);
        });
      });
    }, 100);

    return () => clearInterval(cookInterval);
  }, [phase, twistCookTime, twistComparisonRunning, foodPosition, cavityMode]);

  // Reset when returning to play phase
  useEffect(() => {
    if (phase === 'play') {
      setIsCooking(false);
      setTurntableOn(false);
      setCookTime(0);
      setFoodTemp(Array(25).fill(20));
      setTurntableAngle(0);
    }
    if (phase === 'twist_play') {
      setTwistTurntable(false);
      setTwistCookTime(0);
      setTwistFoodTemp(Array(25).fill(20));
      setTwistNoTurntableTemp(Array(25).fill(20));
      setTwistWithTurntableTemp(Array(25).fill(20));
      setTwistComparisonRunning(false);
      setTwistComparisonComplete(false);
      setFoodPosition('center');
      setCavityMode(1);
    }
  }, [phase]);

  // Temperature to color
  const tempToColor = (temp: number) => {
    const normalized = (temp - 20) / 80;
    if (normalized < 0.25) return '#3b82f6';
    if (normalized < 0.5) return '#22c55e';
    if (normalized < 0.75) return '#eab308';
    return '#ef4444';
  };

  const handlePrediction = useCallback((id: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setPrediction(id);
    playSound('click');
  }, [playSound]);

  const handleTwistPrediction = useCallback((id: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTwistPrediction(id);
    playSound('click');
  }, [playSound]);

  const handleAppComplete = useCallback((index: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setCompletedApps(prev => new Set([...prev, index]));
    playSound('complete');
  }, [playSound]);

  const handleTestAnswer = useCallback((answerIndex: number, correct: boolean) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    setTestAnswers(prev => [...prev, answerIndex]);
    playSound(correct ? 'success' : 'failure');
  }, [playSound]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  const renderMicrowaveScene = (temps: number[], cooking: boolean, turntable: boolean, angle: number, showNodeLabels: boolean = true) => {
    // numNodes is derived from nodesPerCavity for display purposes
    // More nodes = more complex standing wave pattern
    void nodesPerCavity; // Used in getIntensityAt via scaleFactor

    return (
      <svg viewBox="0 0 500 400" className="w-full h-auto" style={{ maxHeight: '100%' }}>
        <defs>
          {/* Premium microwave oven body gradient - brushed stainless steel */}
          <linearGradient id="mswOvenBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="15%" stopColor="#4b5563" />
            <stop offset="40%" stopColor="#374151" />
            <stop offset="60%" stopColor="#4b5563" />
            <stop offset="85%" stopColor="#374151" />
            <stop offset="100%" stopColor="#1f2937" />
          </linearGradient>

          {/* Door frame metallic gradient */}
          <linearGradient id="mswDoorFrame" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3f3f46" />
            <stop offset="20%" stopColor="#52525b" />
            <stop offset="50%" stopColor="#3f3f46" />
            <stop offset="80%" stopColor="#27272a" />
            <stop offset="100%" stopColor="#18181b" />
          </linearGradient>

          {/* Cavity interior gradient - dark reflective metal */}
          <radialGradient id="mswCavityInterior" cx="50%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="40%" stopColor="#0f172a" />
            <stop offset="70%" stopColor="#0a1628" />
            <stop offset="100%" stopColor="#030712" />
          </radialGradient>

          {/* Glass door with depth effect */}
          <linearGradient id="mswGlassDoor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.3" />
            <stop offset="30%" stopColor="#0c4a6e" stopOpacity="0.15" />
            <stop offset="70%" stopColor="#164e63" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.25" />
          </linearGradient>

          {/* Magnetron housing gradient */}
          <linearGradient id="mswMagnetron" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#78716c" />
            <stop offset="30%" stopColor="#57534e" />
            <stop offset="70%" stopColor="#44403c" />
            <stop offset="100%" stopColor="#292524" />
          </linearGradient>

          {/* Hot spot radial gradient - intense red glow */}
          <radialGradient id="mswHotSpot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fca5a5" stopOpacity="1" />
            <stop offset="30%" stopColor="#f87171" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#ef4444" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
          </radialGradient>

          {/* Cold spot radial gradient - cool blue */}
          <radialGradient id="mswColdSpot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="1" />
            <stop offset="30%" stopColor="#60a5fa" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </radialGradient>

          {/* Medium intensity spot - amber/yellow */}
          <radialGradient id="mswMediumSpot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fde047" stopOpacity="1" />
            <stop offset="30%" stopColor="#facc15" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#eab308" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ca8a04" stopOpacity="0" />
          </radialGradient>

          {/* Turntable glass plate gradient */}
          <radialGradient id="mswTurntablePlate" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#9ca3af" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6b7280" stopOpacity="0.15" />
          </radialGradient>

          {/* Control panel gradient */}
          <linearGradient id="mswControlPanel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#27272a" />
            <stop offset="50%" stopColor="#18181b" />
            <stop offset="100%" stopColor="#09090b" />
          </linearGradient>

          {/* Power indicator glow */}
          <radialGradient id="mswPowerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
            <stop offset="40%" stopColor="#22c55e" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#16a34a" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
          </radialGradient>

          {/* Microwave beam gradient for wave visualization */}
          <linearGradient id="mswWaveBeam" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
            <stop offset="20%" stopColor="#fbbf24" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#fcd34d" stopOpacity="1" />
            <stop offset="80%" stopColor="#fbbf24" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>

          {/* Standing wave pattern gradient */}
          <linearGradient id="mswStandingWave" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="25%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="75%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>

          {/* Glow filter for hot spots */}
          <filter id="mswHotGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Glow filter for cold spots */}
          <filter id="mswColdGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Soft glow for power indicator */}
          <filter id="mswPowerIndicatorGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Wave animation glow */}
          <filter id="mswWaveGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Inner shadow for cavity depth */}
          <filter id="mswInnerShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur" />
            <feOffset dx="2" dy="2" result="offsetBlur" />
            <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
          </filter>

          {/* Food gradient - warm cooked appearance */}
          <linearGradient id="mswFoodHot" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="50%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>

          <linearGradient id="mswFoodCold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="50%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>

          <linearGradient id="mswFoodWarm" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="50%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="500" height="400" fill="#030712" />

        {/* Premium microwave oven body with shadow */}
        <rect x="35" y="25" width="330" height="235" rx="12" fill="#1f2937" opacity="0.6" />
        <rect x="30" y="20" width="330" height="235" rx="12" fill="url(#mswOvenBody)" stroke="#52525b" strokeWidth="2" />

        {/* Microwave door frame */}
        <rect x="45" y="35" width="240" height="200" rx="6" fill="url(#mswDoorFrame)" />

        {/* Cavity interior */}
        <rect x="55" y="45" width="220" height="180" rx="4" fill="url(#mswCavityInterior)" filter="url(#mswInnerShadow)" />

        {/* Glass door overlay */}
        <rect x="55" y="45" width="220" height="180" rx="4" fill="url(#mswGlassDoor)" />

        {/* Door mesh pattern - safety grid */}
        <g opacity="0.4">
          {[...Array(22)].map((_, i) => (
            <line key={`mh${i}`} x1="55" y1={50 + i * 8} x2="275" y2={50 + i * 8} stroke="#334155" strokeWidth="0.5" />
          ))}
          {[...Array(28)].map((_, i) => (
            <line key={`mv${i}`} x1={58 + i * 8} y1="45" x2={58 + i * 8} y2="225" stroke="#334155" strokeWidth="0.5" />
          ))}
        </g>

        {/* Standing wave pattern visualization */}
        <g opacity={cooking ? 0.8 : 0.5}>
          {[...Array(9)].map((_, yi) => (
            [...Array(9)].map((_, xi) => {
              const x = (xi / 8 - 0.5);
              const y = (yi / 8 - 0.5);
              const intensity = getIntensityAt(x, y, turntable ? angle : 0, 1);
              const pulseIntensity = cooking ? intensity * (0.6 + 0.4 * Math.sin(animPhase * 2)) : intensity * 0.5;
              const isAntinode = intensity > 0.7;
              const isNode = intensity < 0.15;
              const spotGradient = isAntinode ? 'url(#mswHotSpot)' : isNode ? 'url(#mswColdSpot)' : 'url(#mswMediumSpot)';
              const filterEffect = isAntinode ? 'url(#mswHotGlow)' : isNode ? 'url(#mswColdGlow)' : '';

              return (
                <g key={`sw${xi}-${yi}`}>
                  <circle
                    cx={75 + xi * 22}
                    cy={60 + yi * 18}
                    r={3 + pulseIntensity * 12}
                    fill={spotGradient}
                    filter={filterEffect}
                    opacity={0.3 + pulseIntensity * 0.5}
                  />
                  {/* Node/Antinode labels */}
                  {showNodeLabels && isAntinode && xi % 2 === 0 && yi % 2 === 0 && (
                    <text x={75 + xi * 22} y={60 + yi * 18 - 14} textAnchor="middle" fill="#fca5a5" fontWeight="bold" fontSize="8px">
                      HOT
                    </text>
                  )}
                  {showNodeLabels && isNode && xi % 2 === 0 && yi % 2 === 0 && (
                    <text x={75 + xi * 22} y={60 + yi * 18 - 14} textAnchor="middle" fill="#93c5fd" fontWeight="bold" fontSize="8px">
                      COLD
                    </text>
                  )}
                </g>
              );
            })
          ))}
        </g>

        {/* Magnetron housing (top of cavity) */}
        <rect x="130" y="30" width="70" height="18" rx="3" fill="url(#mswMagnetron)" />
        <text x="165" y="43" textAnchor="middle" fill="#a8a29e" fontSize="7px" fontWeight="bold">MAGNETRON</text>

        {/* Microwave beam animation from magnetron */}
        {cooking && (
          <g filter="url(#mswWaveGlow)">
            <path
              d={`M 165 48 Q ${165 + Math.sin(animPhase) * 20} 100, 165 135`}
              stroke="url(#mswWaveBeam)"
              strokeWidth="3"
              fill="none"
              opacity={0.6 + 0.3 * Math.sin(animPhase * 3)}
            />
            <path
              d={`M 165 48 Q ${165 + Math.sin(animPhase + 1) * 25} 80, ${100 + Math.sin(animPhase) * 10} 135`}
              stroke="url(#mswWaveBeam)"
              strokeWidth="2"
              fill="none"
              opacity={0.4 + 0.3 * Math.sin(animPhase * 2)}
            />
            <path
              d={`M 165 48 Q ${165 + Math.sin(animPhase + 2) * 25} 80, ${230 + Math.sin(animPhase) * 10} 135`}
              stroke="url(#mswWaveBeam)"
              strokeWidth="2"
              fill="none"
              opacity={0.4 + 0.3 * Math.sin(animPhase * 2 + 1)}
            />
          </g>
        )}

        {/* Turntable with glass plate effect */}
        <g transform="translate(165, 195)">
          <ellipse cx="0" cy="0" rx="75" ry="20" fill="#27272a" />
          <ellipse cx="0" cy="-3" rx="70" ry="18" fill="url(#mswTurntablePlate)" stroke="#6b7280" strokeWidth="1" />
          {/* Turntable rotation indicator */}
          {turntable && cooking && (
            <g>
              <line
                x1="0"
                y1="0"
                x2={Math.cos(angle) * 60}
                y2={Math.sin(angle) * 15}
                stroke="#d1d5db"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx={Math.cos(angle) * 60} cy={Math.sin(angle) * 15} r="3" fill="#e5e7eb" />
            </g>
          )}
        </g>

        {/* Food plate with temperature visualization */}
        <g transform={`translate(115, 120) rotate(${turntable ? angle * 180 / Math.PI : 0}, 50, 40)`}>
          {/* Plate base */}
          <ellipse cx="50" cy="50" rx="55" ry="15" fill="#d1d5db" opacity="0.3" />

          {/* Food items grid */}
          {temps.map((temp, i) => {
            const x = (i % 5) * 22;
            const y = Math.floor(i / 5) * 18;
            const normalized = (temp - 20) / 80;
            const foodGradient = normalized > 0.6 ? 'url(#mswFoodHot)' : normalized < 0.3 ? 'url(#mswFoodCold)' : 'url(#mswFoodWarm)';
            const glowFilter = normalized > 0.6 ? 'url(#mswHotGlow)' : '';

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width="20"
                  height="16"
                  rx="3"
                  fill={foodGradient}
                  filter={glowFilter}
                  stroke="#1f2937"
                  strokeWidth="1"
                  opacity={0.8 + normalized * 0.2}
                />
                {/* Temperature indicator dot */}
                <circle
                  cx={x + 10}
                  cy={y + 8}
                  r="2"
                  fill={tempToColor(temp)}
                  opacity="0.9"
                />
              </g>
            );
          })}
        </g>

        {/* Control panel */}
        <rect x="295" y="35" width="55" height="200" rx="6" fill="url(#mswControlPanel)" stroke="#3f3f46" strokeWidth="1" />

        {/* Power indicator with glow */}
        <g filter={cooking ? "url(#mswPowerIndicatorGlow)" : ""}>
          <circle cx="322" cy="65" r="15" fill={cooking ? 'url(#mswPowerGlow)' : '#3f3f46'} />
          <text x="322" y="68" textAnchor="middle" fill={cooking ? '#052e16' : '#6b7280'} fontSize="8px" fontWeight="bold">
            {cooking ? 'ON' : 'OFF'}
          </text>
        </g>

        {/* Turntable indicator */}
        <rect x="302" y="95" width="40" height="20" rx="4" fill={turntable ? '#2563eb' : '#3f3f46'} />
        <text x="322" y="109" textAnchor="middle" fill={turntable ? '#dbeafe' : '#6b7280'} fontSize="8px" fontWeight="bold">
          TURN
        </text>

        {/* Digital timer display */}
        <rect x="302" y="130" width="40" height="25" rx="3" fill="#0a0a0a" stroke="#1f2937" strokeWidth="1" />
        <text x="322" y="147" textAnchor="middle" fill="#4ade80" fontSize="12px" fontFamily="monospace" fontWeight="bold">
          {cookTime.toFixed(1)}
        </text>

        {/* Power level display */}
        <rect x="302" y="165" width="40" height="18" rx="3" fill="#0a0a0a" stroke="#1f2937" strokeWidth="1" />
        <text x="322" y="178" textAnchor="middle" fill="#fbbf24" fontSize="9px" fontWeight="bold">
          {powerLevel}%
        </text>

        {/* Control buttons */}
        <rect x="302" y="195" width="40" height="12" rx="2" fill="#27272a" stroke="#52525b" strokeWidth="1" />
        <rect x="302" y="212" width="40" height="12" rx="2" fill="#27272a" stroke="#52525b" strokeWidth="1" />

        {/* Premium legend section */}
        <g transform="translate(30, 270)">
          {/* Legend background */}
          <rect x="0" y="0" width="340" height="110" rx="8" fill="#111827" stroke="#1f2937" strokeWidth="1" />

          {/* Title */}
          <text x="170" y="20" textAnchor="middle" fill="#f8fafc" fontSize="11px" fontWeight="bold">
            Standing Wave Pattern - Hot & Cold Spots
          </text>

          {/* Temperature scale */}
          <g transform="translate(20, 35)">
            <text x="0" y="0" fill="#94a3b8" fontSize="9px" fontWeight="bold">Temperature Scale:</text>

            <rect x="0" y="8" width="25" height="14" rx="2" fill="url(#mswFoodCold)" />
            <text x="30" y="18" fill="#94a3b8" fontSize="8px">Node (Cold)</text>

            <rect x="100" y="8" width="25" height="14" rx="2" fill="url(#mswFoodWarm)" />
            <text x="130" y="18" fill="#94a3b8" fontSize="8px">Between</text>

            <rect x="200" y="8" width="25" height="14" rx="2" fill="url(#mswFoodHot)" />
            <text x="230" y="18" fill="#94a3b8" fontSize="8px">Antinode (Hot)</text>
          </g>

          {/* Wavelength info */}
          <g transform="translate(20, 65)">
            <text x="0" y="0" fill="#fbbf24" fontSize="9px" fontWeight="bold">
              {`Wavelength: λ = ${wavelength.toFixed(1)} cm`}
            </text>
            <text x="0" y="14" fill="#94a3b8" fontSize="8px">
              {`Hot spots every ${(wavelength / 2).toFixed(1)} cm (half wavelength)`}
            </text>
          </g>

          {/* Power bar */}
          <g transform="translate(20, 90)">
            <text x="0" y="0" fill="#94a3b8" fontSize="8px">Power:</text>
            <rect x="45" y="-8" width="120" height="10" rx="2" fill="#1f2937" />
            <rect x="45" y="-8" width={powerLevel * 1.2} height="10" rx="2" fill="url(#mswPowerGlow)" />
            <text x="175" y="0" fill="#4ade80" fontSize="8px" fontWeight="bold">{powerLevel}%</text>
          </g>
        </g>
      </svg>
    );
  };

  const renderTwistScene = (temps: number[], turntable: boolean) => {
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    const tempVariance = Math.sqrt(temps.reduce((acc, t) => acc + Math.pow(t - avgTemp, 2), 0) / temps.length);

    return (
      <svg viewBox="0 0 400 280" className="w-full h-auto" style={{ maxHeight: '100%' }}>
        <defs>
          {/* Background gradient */}
          <linearGradient id="mswTwistBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* Card background gradient */}
          <linearGradient id="mswTwistCard" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Score bar gradients */}
          <linearGradient id="mswScoreExcellent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>

          <linearGradient id="mswScoreOK" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#eab308" />
            <stop offset="50%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>

          <linearGradient id="mswScorePoor" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="50%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>

          {/* Food temperature gradients */}
          <radialGradient id="mswTwistHot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="60%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </radialGradient>

          <radialGradient id="mswTwistCold" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="60%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#2563eb" />
          </radialGradient>

          <radialGradient id="mswTwistWarm" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="60%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </radialGradient>

          {/* Glow effects */}
          <filter id="mswTwistGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="mswTwistShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
            <feOffset dx="2" dy="2" result="offset" />
            <feMerge>
              <feMergeNode in="offset" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width="400" height="280" fill="url(#mswTwistBg)" />

        {/* Title card */}
        <rect x="80" y="8" width="240" height="28" rx="6" fill="url(#mswTwistCard)" stroke="#334155" strokeWidth="1" />
        <text x="200" y="27" textAnchor="middle" fill="#f8fafc" fontSize="12px" fontWeight="bold">
          After 10 seconds of cooking:
        </text>

        {/* Mode indicator badge */}
        <rect
          x="140"
          y="42"
          width="120"
          height="22"
          rx="11"
          fill={turntable ? '#065f46' : '#7f1d1d'}
          stroke={turntable ? '#10b981' : '#ef4444'}
          strokeWidth="1"
        />
        <text x="200" y="57" textAnchor="middle" fill={turntable ? '#6ee7b7' : '#fca5a5'} fontSize="10px" fontWeight="bold">
          {turntable ? 'WITH Turntable' : 'NO Turntable'}
        </text>

        {/* Food grid container */}
        <rect x="85" y="70" width="130" height="130" rx="8" fill="url(#mswTwistCard)" stroke="#334155" strokeWidth="1" filter="url(#mswTwistShadow)" />

        {/* Food grid */}
        <g transform="translate(95, 80)">
          {temps.map((temp, i) => {
            const x = (i % 5) * 22;
            const y = Math.floor(i / 5) * 22;
            const normalized = (temp - 20) / 80;
            const foodGradient = normalized > 0.6 ? 'url(#mswTwistHot)' : normalized < 0.3 ? 'url(#mswTwistCold)' : 'url(#mswTwistWarm)';
            const filterEffect = normalized > 0.6 ? 'url(#mswTwistGlow)' : '';

            return (
              <rect
                key={i}
                x={x}
                y={y}
                width="20"
                height="20"
                rx="4"
                fill={foodGradient}
                filter={filterEffect}
                stroke="#1f2937"
                strokeWidth="1"
              />
            );
          })}
        </g>

        {/* Temperature stats */}
        <text x="150" y="218" textAnchor="middle" fill="#94a3b8" fontSize="10px">
          Avg: <tspan fill="#f8fafc" fontWeight="bold">{avgTemp.toFixed(0)}C</tspan>
        </text>
        <text x="150" y="234" textAnchor="middle" fill="#94a3b8" fontSize="10px">
          Variation: <tspan fill={tempVariance < 10 ? '#4ade80' : tempVariance < 20 ? '#fde047' : '#f87171'} fontWeight="bold">+/-{tempVariance.toFixed(0)}C</tspan>
        </text>

        {/* Evenness score section */}
        <g transform="translate(230, 80)">
          <text x="0" y="0" fill="#f8fafc" fontSize="11px" fontWeight="bold">Evenness Score</text>

          {/* Score bar background */}
          <rect x="0" y="12" width="140" height="24" rx="6" fill="#1f2937" stroke="#334155" strokeWidth="1" />

          {/* Score bar fill */}
          <rect
            x="2"
            y="14"
            width={Math.max(10, (136 - tempVariance * 5))}
            height="20"
            rx="5"
            fill={tempVariance < 10 ? 'url(#mswScoreExcellent)' : tempVariance < 20 ? 'url(#mswScoreOK)' : 'url(#mswScorePoor)'}
            filter="url(#mswTwistGlow)"
          />

          {/* Score label */}
          <text x="70" y="30" textAnchor="middle" fill="#f8fafc" fontSize="10px" fontWeight="bold">
            {tempVariance < 10 ? 'Excellent!' : tempVariance < 20 ? 'OK' : 'Uneven!'}
          </text>

          {/* Explanation box */}
          <rect x="0" y="50" width="140" height="70" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          <text x="70" y="70" textAnchor="middle" fill="#94a3b8" fontSize="9px">
            {turntable ? 'Turntable moves' : 'Food sits in'}
          </text>
          <text x="70" y="84" textAnchor="middle" fill="#94a3b8" fontSize="9px">
            {turntable ? 'food through' : 'fixed positions'}
          </text>
          <text x="70" y="98" textAnchor="middle" fill={turntable ? '#4ade80' : '#f87171'} fontSize="9px" fontWeight="bold">
            {turntable ? 'hot spots = even heating!' : '= hot and cold spots!'}
          </text>
        </g>

        {/* Bottom explanation */}
        <rect x="30" y="248" width="340" height="24" rx="6" fill={turntable ? '#052e16' : '#450a0a'} stroke={turntable ? '#16a34a' : '#dc2626'} strokeWidth="1" />
        <text x="200" y="264" textAnchor="middle" fill={turntable ? '#86efac' : '#fca5a5'} fontSize="10px" fontWeight="bold">
          {turntable
            ? 'Rotation ensures every part passes through hot spots'
            : 'Standing waves create fixed hot & cold positions'}
        </text>
      </svg>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE RENDERERS
  // ═══════════════════════════════════════════════════════════════════════════
  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-amber-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-amber-100 to-orange-200 bg-clip-text text-transparent">
        The Microwave Mystery
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover why microwaves create hot spots and cold spots
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-4">🍲</div>

          <div className="mt-8 space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              You heat leftovers in the microwave.
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              One bite is <span className="text-blue-400 font-semibold">ice cold</span>, the next is <span className="text-red-400 font-semibold">scalding hot</span>!
            </p>
            <div className="pt-2">
              <p className="text-base text-amber-400 font-semibold">
                Why does this happen?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onClick={() => goToNextPhase()}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
        style={{ position: 'relative', zIndex: 10 }}
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
          <span className="text-amber-400">*</span>
          Standing Waves
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400">*</span>
          Interactive Lab
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400">*</span>
          Real Experiments
        </div>
      </div>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Microwaves bounce back and forth inside the oven. What happens when waves reflect off the walls?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'random', text: 'Random chaos - energy scatters everywhere equally', icon: '🎲' },
          { id: 'standing', text: 'Standing waves form with fixed hot spots and cold spots', icon: '〰️' },
          { id: 'center', text: 'All energy concentrates in the center', icon: '🎯' },
          { id: 'absorbed', text: 'Walls absorb most energy - edges are hottest', icon: '🧱' }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={prediction !== null}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              prediction === option.id
                ? option.id === 'standing' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : prediction !== null && option.id === 'standing' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
            style={{ position: 'relative', zIndex: 10 }}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-slate-200">{option.text}</span>
          </button>
        ))}
      </div>
      {prediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            {prediction === 'standing' ? '✓ Correct!' : 'Not quite!'} Standing waves create fixed patterns of high and low energy!
          </p>
          <button
            onClick={() => goToNextPhase()}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
            style={{ position: 'relative', zIndex: 10 }}
          >
            See It in Action
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Standing Wave Lab</h2>

      {/* Interactive sliders panel */}
      <div className="bg-slate-800/60 rounded-2xl p-5 mb-4 w-full max-w-2xl border border-slate-700/50">
        <h3 className="text-lg font-semibold text-amber-400 mb-4">Microwave Parameters</h3>
        <div className="grid gap-5">
          {/* Frequency slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm text-slate-300 font-medium">Microwave Frequency</label>
              <span className="text-sm text-amber-400 font-mono">{frequency.toFixed(2)} GHz</span>
            </div>
            <input
              type="range"
              min="2.0"
              max="3.0"
              step="0.05"
              value={frequency}
              onChange={(e) => setFrequency(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              style={{ position: 'relative', zIndex: 10 }}
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>2.0 GHz</span>
              <span className="text-amber-400">Standard: 2.45 GHz</span>
              <span>3.0 GHz</span>
            </div>
          </div>

          {/* Cavity length slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm text-slate-300 font-medium">Cavity Length</label>
              <span className="text-sm text-blue-400 font-mono">{cavityLength} cm</span>
            </div>
            <input
              type="range"
              min="20"
              max="50"
              step="1"
              value={cavityLength}
              onChange={(e) => setCavityLength(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              style={{ position: 'relative', zIndex: 10 }}
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>20 cm (Small)</span>
              <span>50 cm (Large)</span>
            </div>
          </div>

          {/* Power level slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm text-slate-300 font-medium">Power Level</label>
              <span className="text-sm text-emerald-400 font-mono">{powerLevel}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="10"
              value={powerLevel}
              onChange={(e) => setPowerLevel(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              style={{ position: 'relative', zIndex: 10 }}
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>10% (Low)</span>
              <span>100% (High)</span>
            </div>
          </div>

          {/* Calculated wavelength display */}
          <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-lg p-3 border border-amber-500/20">
            <p className="text-sm text-slate-300">
              <span className="text-amber-400 font-semibold">Calculated Wavelength:</span>{' '}
              <span className="font-mono text-white">{wavelength.toFixed(2)} cm</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Formula: lambda = c / f = (3 x 10^8 m/s) / ({frequency} x 10^9 Hz)
            </p>
            <p className="text-xs text-slate-400 mt-1">
              <span className="text-red-400">Hot spots</span> every {(wavelength / 2).toFixed(1)} cm (half wavelength)
            </p>
          </div>
        </div>
      </div>

      {/* Microwave visualization */}
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
        {renderMicrowaveScene(foodTemp, isCooking, turntableOn, turntableAngle, true)}
      </div>

      {/* Control buttons */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        <button
          onClick={() => {
            const now = Date.now();
            if (now - lastClickRef.current < 200) return;
            lastClickRef.current = now;
            setIsCooking(!isCooking);
            playSound('click');
          }}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            isCooking ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
          }`}
          style={{ position: 'relative', zIndex: 10 }}
        >
          {isCooking ? 'Stop' : 'Start Cooking'}
        </button>
        <button
          onClick={() => {
            const now = Date.now();
            if (now - lastClickRef.current < 200) return;
            lastClickRef.current = now;
            setTurntableOn(!turntableOn);
            playSound('click');
          }}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            turntableOn ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
          }`}
          style={{ position: 'relative', zIndex: 10 }}
        >
          Turntable: {turntableOn ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={() => {
            const now = Date.now();
            if (now - lastClickRef.current < 200) return;
            lastClickRef.current = now;
            setFoodTemp(Array(25).fill(20));
            setCookTime(0);
            playSound('click');
          }}
          className="px-6 py-2 rounded-lg font-medium bg-slate-700 text-slate-300 hover:bg-slate-600"
          style={{ position: 'relative', zIndex: 10 }}
        >
          Reset
        </button>
      </div>

      <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 rounded-xl p-4 max-w-2xl w-full mb-6">
        <p className="text-amber-300 text-sm text-center">
          <strong>Standing waves:</strong> When microwaves bounce back and forth, they interfere to create
          fixed patterns of high energy (antinodes - <span className="text-red-400">HOT</span>) and
          low energy (nodes - <span className="text-blue-400">COLD</span>).
        </p>
        <p className="text-slate-400 text-xs text-center mt-2">
          Try adjusting the frequency and see how the wavelength and hot spot spacing changes!
        </p>
      </div>

      <button
        onClick={() => goToNextPhase()}
        className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
        style={{ position: 'relative', zIndex: 10 }}
      >
        Review the Science
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Standing Wave Physics</h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-3">Wave Reflection</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>* Microwaves bounce off metal walls</li>
            <li>* Outgoing + reflected waves interfere</li>
            <li>* Creates stable standing wave pattern</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-red-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-red-400 mb-3">Hot Spots & Cold Spots</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>* Antinodes = maximum energy (HOT)</li>
            <li>* Nodes = minimum energy (COLD)</li>
            <li>* Spacing = wavelength/2 = 6cm</li>
          </ul>
        </div>
        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl p-6 md:col-span-2">
          <h3 className="text-xl font-bold text-blue-400 mb-3">The Math</h3>
          <p className="text-slate-300 text-sm">
            <strong>Wavelength:</strong> lambda = c / f = 3x10^8 / 2.45x10^9 = 12.2 cm<br />
            <strong>Hot spot spacing:</strong> lambda/2 = 6.1 cm apart!
          </p>
        </div>
      </div>
      <button
        onClick={() => goToNextPhase()}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
        style={{ position: 'relative', zIndex: 10 }}
      >
        Discover the Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          If standing waves create fixed hot spots, why do microwave ovens have a <span className="text-blue-400 font-semibold">turntable</span>?
        </p>
      </div>
      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'even', text: 'Turntable moves food through hot spots for even heating', icon: '🔄' },
          { id: 'stir', text: 'It just stirs the food like a mixer', icon: '🥄' },
          { id: 'waves', text: 'Turntable creates additional microwaves', icon: '📡' },
          { id: 'nothing', text: 'It\'s decorative - doesn\'t really help', icon: '*' }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={twistPrediction !== null}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              twistPrediction === option.id
                ? option.id === 'even' ? 'bg-emerald-600/40 border-2 border-emerald-400' : 'bg-red-600/40 border-2 border-red-400'
                : twistPrediction !== null && option.id === 'even' ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
            style={{ position: 'relative', zIndex: 10 }}
          >
            <span className="mr-2">{option.icon}</span>
            <span className="text-slate-200">{option.text}</span>
          </button>
        ))}
      </div>
      {twistPrediction && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            {twistPrediction === 'even' ? '✓ Exactly!' : 'Not quite!'} The turntable moves food through the pattern for even heating!
          </p>
          <button
            onClick={() => goToNextPhase()}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
            style={{ position: 'relative', zIndex: 10 }}
          >
            See How It Works
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => {
    const startComparison = () => {
      const now = Date.now();
      if (now - lastClickRef.current < 200) return;
      lastClickRef.current = now;
      setTwistNoTurntableTemp(Array(25).fill(20));
      setTwistWithTurntableTemp(Array(25).fill(20));
      setTwistCookTime(10);
      setTwistComparisonRunning(true);
      setTwistComparisonComplete(false);
      playSound('click');
    };

    const resetComparison = () => {
      setTwistNoTurntableTemp(Array(25).fill(20));
      setTwistWithTurntableTemp(Array(25).fill(20));
      setTwistCookTime(0);
      setTwistComparisonRunning(false);
      setTwistComparisonComplete(false);
    };

    // Calculate evenness scores
    const calcVariance = (temps: number[]) => {
      const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
      return Math.sqrt(temps.reduce((acc, t) => acc + Math.pow(t - avg, 2), 0) / temps.length);
    };

    const noTurntableVariance = calcVariance(twistNoTurntableTemp);
    const withTurntableVariance = calcVariance(twistWithTurntableTemp);

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-2xl font-bold text-amber-400 mb-4">Turntable Comparison Lab</h2>

        {/* Controls panel */}
        <div className="bg-slate-800/60 rounded-2xl p-5 mb-4 w-full max-w-3xl border border-slate-700/50">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Food position selector */}
            <div className="space-y-3">
              <label className="text-sm text-slate-300 font-medium block">Food Position</label>
              <div className="flex gap-2">
                {(['center', 'edge', 'corner'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => {
                      if (!twistComparisonRunning) {
                        setFoodPosition(pos);
                        resetComparison();
                      }
                    }}
                    disabled={twistComparisonRunning}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                      foodPosition === pos
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    } ${twistComparisonRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ position: 'relative', zIndex: 10 }}
                  >
                    {pos}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Where the food is placed on the turntable plate
              </p>
            </div>

            {/* Cavity mode selector */}
            <div className="space-y-3">
              <label className="text-sm text-slate-300 font-medium block">Cavity Resonance Mode</label>
              <div className="flex gap-2">
                {([1, 2, 3] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      if (!twistComparisonRunning) {
                        setCavityMode(mode);
                        resetComparison();
                      }
                    }}
                    disabled={twistComparisonRunning}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      cavityMode === mode
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    } ${twistComparisonRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ position: 'relative', zIndex: 10 }}
                  >
                    Mode {mode}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Different resonance modes create different hot spot patterns
              </p>
            </div>
          </div>
        </div>

        {/* Side-by-side comparison visualization */}
        <div className="bg-slate-800/50 rounded-2xl p-6 mb-4 w-full max-w-3xl">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Without turntable */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-400 mb-3">Without Turntable</h3>
              <div className="bg-slate-900/50 rounded-xl p-4">
                <div className="grid grid-cols-5 gap-1 mx-auto w-fit mb-3">
                  {twistNoTurntableTemp.map((temp, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-sm transition-colors duration-200"
                      style={{ backgroundColor: tempToColor(temp) }}
                      title={`${temp.toFixed(0)}C`}
                    />
                  ))}
                </div>
                <div className="text-sm text-slate-400">
                  Avg: {(twistNoTurntableTemp.reduce((a, b) => a + b, 0) / 25).toFixed(0)}C
                </div>
                <div className="text-sm text-slate-500">
                  Variation: +/-{noTurntableVariance.toFixed(1)}C
                </div>
                {twistComparisonComplete && (
                  <div className={`mt-2 text-sm font-semibold ${noTurntableVariance > 15 ? 'text-red-400' : 'text-yellow-400'}`}>
                    {noTurntableVariance > 15 ? 'Very Uneven!' : 'Somewhat Uneven'}
                  </div>
                )}
              </div>
            </div>

            {/* With turntable */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-emerald-400 mb-3">With Turntable</h3>
              <div className="bg-slate-900/50 rounded-xl p-4">
                <div className="grid grid-cols-5 gap-1 mx-auto w-fit mb-3">
                  {twistWithTurntableTemp.map((temp, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-sm transition-colors duration-200"
                      style={{ backgroundColor: tempToColor(temp) }}
                      title={`${temp.toFixed(0)}C`}
                    />
                  ))}
                </div>
                <div className="text-sm text-slate-400">
                  Avg: {(twistWithTurntableTemp.reduce((a, b) => a + b, 0) / 25).toFixed(0)}C
                </div>
                <div className="text-sm text-slate-500">
                  Variation: +/-{withTurntableVariance.toFixed(1)}C
                </div>
                {twistComparisonComplete && (
                  <div className={`mt-2 text-sm font-semibold ${withTurntableVariance < 10 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                    {withTurntableVariance < 10 ? 'Even Heating!' : 'More Even'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress indicator */}
          {twistComparisonRunning && (
            <div className="mt-6 text-center">
              <div className="text-amber-400 font-medium mb-2">
                Cooking... {twistCookTime.toFixed(1)}s remaining
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-100"
                  style={{ width: `${((10 - twistCookTime) / 10) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-6 flex justify-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
              <span>Cold (20C)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }} />
              <span>Warm</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }} />
              <span>Hot</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
              <span>Very Hot (100C)</span>
            </div>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <button
            onClick={startComparison}
            disabled={twistComparisonRunning}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              twistComparisonRunning
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25'
            }`}
            style={{ position: 'relative', zIndex: 10 }}
          >
            {twistComparisonComplete ? 'Run Again' : 'Start Comparison'}
          </button>
          <button
            onClick={resetComparison}
            disabled={twistComparisonRunning}
            className="px-6 py-3 rounded-xl font-medium bg-slate-700 text-slate-300 hover:bg-slate-600"
            style={{ position: 'relative', zIndex: 10 }}
          >
            Reset
          </button>
        </div>

        {/* Explanation */}
        <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-xl p-4 max-w-2xl w-full mb-6 border border-blue-500/20">
          <p className="text-blue-300 text-sm text-center mb-2">
            <strong>Multi-Mode Cavity:</strong> Real microwaves have multiple resonance modes that create complex overlapping patterns.
          </p>
          <p className="text-slate-400 text-xs text-center">
            Mode 1 = Simple pattern | Mode 2 = More nodes | Mode 3 = Complex pattern
          </p>
        </div>

        {twistComparisonComplete && (
          <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 rounded-xl p-4 max-w-2xl w-full mb-6 border border-emerald-500/30">
            <p className="text-emerald-300 text-sm text-center">
              <strong>Result:</strong> The turntable reduces temperature variation by{' '}
              <span className="font-mono text-white">
                {Math.max(0, noTurntableVariance - withTurntableVariance).toFixed(1)}C
              </span>
              {' '}by moving food through the standing wave pattern!
            </p>
          </div>
        )}

        <button
          onClick={() => goToNextPhase()}
          className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
          style={{ position: 'relative', zIndex: 10 }}
        >
          Review Discovery
        </button>
      </div>
    );
  };

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-6">The Turntable Solution</h2>
      <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-slate-300 text-center mb-4">
          The turntable <span className="text-blue-400 font-semibold">doesn't change the standing wave pattern</span>,
          it moves the food through the pattern!
        </p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-red-900/30 rounded-lg p-3">
            <div className="text-red-400 font-semibold">Without Turntable</div>
            <div className="text-slate-500">Food in hot spots: scalding</div>
            <div className="text-slate-500">Food in cold spots: cold</div>
          </div>
          <div className="bg-emerald-900/30 rounded-lg p-3">
            <div className="text-emerald-400 font-semibold">With Turntable</div>
            <div className="text-slate-500">Each part visits hot spots</div>
            <div className="text-slate-500">Average heating is even!</div>
          </div>
        </div>
      </div>
      <button
        onClick={() => goToNextPhase()}
        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
        style={{ position: 'relative', zIndex: 10 }}
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>
      <p className="text-slate-400 mb-4">Explore each application</p>
      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mb-6">
        {TRANSFER_APPS.map((app, index) => (
          <button
            key={index}
            onClick={() => handleAppComplete(index)}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              completedApps.has(index)
                ? 'border-emerald-500 bg-emerald-900/30'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }`}
            style={{ position: 'relative', zIndex: 10 }}
          >
            <div className="text-3xl mb-2">{app.icon}</div>
            <h3 className="text-white font-semibold text-sm">{app.title}</h3>
            <p className="text-slate-400 text-xs mt-1">{app.description}</p>
            {completedApps.has(index) && <span className="text-emerald-400 text-xs">Explored!</span>}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">{TRANSFER_APPS.map((_, i) => (<div key={i} className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`} />))}</div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>
      {completedApps.size >= 4 && (
        <button
          onClick={() => goToNextPhase()}
          className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl"
          style={{ position: 'relative', zIndex: 10 }}
        >
          Take the Knowledge Test
        </button>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST QUESTIONS - Scenario-based multiple choice questions
  // ═══════════════════════════════════════════════════════════════════════════
  const testQuestions = [
    // Question 1: Core concept - what are standing waves (Easy)
    {
      scenario: "You place a bowl of cold soup in a microwave oven without the turntable spinning. After 2 minutes, you notice some spots are scalding hot while others are barely warm.",
      question: "What fundamental wave phenomenon causes this uneven heating pattern inside the microwave cavity?",
      options: [
        { id: 'a', label: "Sound waves from the magnetron create pressure differences in the food" },
        { id: 'b', label: "Standing waves form when microwaves reflect off metal walls and interfere with incoming waves, creating fixed hot spots (antinodes) and cold spots (nodes)", correct: true },
        { id: 'c', label: "The magnetron rotates and misses certain areas of the cavity" },
        { id: 'd', label: "Microwave radiation decays exponentially from the source, heating nearby areas more" }
      ],
      explanation: "Standing waves occur when waves traveling in opposite directions (incident and reflected) interfere with each other. In a microwave oven, electromagnetic waves bounce off the metal walls and superimpose with incoming waves. At antinodes, the waves constructively interfere creating maximum electric field strength (hot spots). At nodes, they destructively interfere creating minimum field strength (cold spots). These positions are fixed in space, determined by the wavelength and cavity dimensions."
    },
    // Question 2: Hot spots in microwave ovens (Easy-Medium)
    {
      scenario: "A food scientist is testing a new microwave oven design. She places a thin layer of thermal-sensitive paper across the entire cavity floor and runs the microwave for 30 seconds. The paper reveals a distinct checkerboard-like pattern of heated and unheated regions.",
      question: "The distance between adjacent hot spots on the thermal paper is approximately 6.1 cm. What does this measurement reveal about the microwave radiation?",
      options: [
        { id: 'a', label: "The magnetron is oscillating at 6.1 GHz" },
        { id: 'b', label: "The wavelength of the microwave radiation is approximately 12.2 cm, since hot spots (antinodes) are separated by half a wavelength", correct: true },
        { id: 'c', label: "The cavity is exactly 6.1 cm wide" },
        { id: 'd', label: "The power output is 6.1 watts per square centimeter" }
      ],
      explanation: "In a standing wave, adjacent antinodes (maximum amplitude points) are separated by exactly half a wavelength (λ/2). If the hot spots are 6.1 cm apart, the wavelength is 2 × 6.1 = 12.2 cm. This corresponds to a frequency of f = c/λ = (3×10⁸ m/s)/(0.122 m) ≈ 2.45 GHz, which is the standard operating frequency for household microwave ovens. This frequency was chosen because it efficiently heats water molecules."
    },
    // Question 3: Turntable purpose in microwaves (Medium)
    {
      scenario: "An engineer is designing a compact microwave for RVs where space is limited. She considers eliminating the turntable to reduce the unit's depth. Her colleague warns this would significantly impact cooking performance.",
      question: "What is the primary engineering purpose of the rotating turntable in a microwave oven?",
      options: [
        { id: 'a', label: "To prevent the food container from melting by distributing heat to the glass plate" },
        { id: 'b', label: "To move food through the fixed pattern of nodes and antinodes, ensuring all parts receive energy over time for more uniform heating", correct: true },
        { id: 'c', label: "To create additional microwave radiation through electromagnetic induction" },
        { id: 'd', label: "To prevent standing waves from forming by breaking up wave reflections" }
      ],
      explanation: "The standing wave pattern in a microwave cavity is fixed in space - the positions of nodes and antinodes don't change. By rotating the food, the turntable ensures that all portions of the food pass through both hot spots (antinodes) and cold spots (nodes) over time, resulting in more uniform average heating. Without rotation, food positioned at a node would remain cold while food at an antinode could overheat. Some commercial microwaves use rotating metal 'mode stirrers' instead, which redirect the waves to move the pattern itself."
    },
    // Question 4: Waveguide operation (Medium)
    {
      scenario: "A telecommunications technician is installing a satellite dish system. The microwave signal from the dish must travel through a rectangular metal tube to reach the receiver electronics. The tube's dimensions are precisely calculated based on the operating frequency.",
      question: "Why must a waveguide's cross-sectional dimensions be larger than half the wavelength of the signal it carries?",
      options: [
        { id: 'a', label: "Smaller dimensions would cause the metal to heat up from eddy currents" },
        { id: 'b', label: "Below the cutoff dimension, the wave cannot propagate - it becomes evanescent and decays exponentially, unable to sustain the standing wave modes needed for transmission", correct: true },
        { id: 'c', label: "The signal would travel too fast and create timing errors" },
        { id: 'd', label: "Smaller guides would amplify the signal beyond safe levels" }
      ],
      explanation: "A waveguide supports electromagnetic wave propagation through standing wave patterns across its cross-section. For a wave to propagate, it must 'fit' within the guide - specifically, the guide dimension must be at least λ/2 for the lowest mode (TE₁₀). Below this 'cutoff' dimension, the wave equation solutions become imaginary, meaning the wave amplitude decays exponentially rather than propagating. This is why microwave systems use precisely dimensioned waveguides matched to their operating frequency."
    },
    // Question 5: VSWR and impedance matching (Medium-Hard)
    {
      scenario: "A radio engineer measures a VSWR (Voltage Standing Wave Ratio) of 3:1 on a transmission line feeding an antenna. She knows that a perfectly matched system would show a VSWR of 1:1 with no standing waves.",
      question: "What does the 3:1 VSWR measurement indicate about the antenna system, and why is this problematic?",
      options: [
        { id: 'a', label: "The antenna is receiving 3 times more signal than expected, which could damage the receiver" },
        { id: 'b', label: "There is an impedance mismatch causing partial reflection of transmitted power back toward the source; approximately 25% of power is reflected rather than radiated", correct: true },
        { id: 'c', label: "The transmission line is exactly 3 wavelengths long" },
        { id: 'd', label: "The antenna is operating at 3 times its designed frequency" }
      ],
      explanation: "VSWR measures the ratio of maximum to minimum voltage amplitude in standing waves on a transmission line. A VSWR of 3:1 means Vmax/Vmin = 3. This occurs when there's an impedance mismatch between the line and antenna, causing partial reflection. The reflection coefficient Γ = (VSWR-1)/(VSWR+1) = 2/4 = 0.5, meaning 25% of power (Γ²) is reflected back. This reduces radiated power, can cause heating in the transmission line, and may damage the transmitter. Engineers use matching networks to minimize VSWR, ideally below 1.5:1."
    },
    // Question 6: Cavity resonators (Hard)
    {
      scenario: "A physicist is designing a microwave cavity resonator for a particle accelerator. The cylindrical metal cavity must resonate at exactly 2.856 GHz to accelerate electron bunches. She must calculate the precise cavity dimensions to achieve resonance.",
      question: "What fundamental principle determines the resonant frequencies of a microwave cavity, and why is dimensional precision so critical?",
      options: [
        { id: 'a', label: "The cavity acts as a simple LC circuit where larger dimensions increase capacitance" },
        { id: 'b', label: "Resonance occurs only when the cavity dimensions support standing wave patterns with nodes at the conducting walls; even millimeter errors shift the frequency significantly", correct: true },
        { id: 'c', label: "The resonant frequency depends only on the material of the cavity walls" },
        { id: 'd', label: "Cavities resonate at all frequencies but amplify the desired one through feedback" }
      ],
      explanation: "A cavity resonator is a 3D standing wave system. Electromagnetic waves must satisfy boundary conditions - the electric field tangential to the conducting walls must be zero (nodes). This constraint means only specific wavelengths (and thus frequencies) can form stable standing wave patterns inside. For a cylindrical cavity, resonant frequencies depend on radius and length according to the cavity's mode equations. At 2.856 GHz (λ ≈ 10.5 cm), a 1mm dimensional error shifts the frequency by roughly 10 MHz - significant for particle accelerators requiring precise timing."
    },
    // Question 7: Microwave antenna feed design (Hard)
    {
      scenario: "An antenna engineer is designing a horn antenna feed for a satellite dish. The feed must efficiently couple microwave energy from a waveguide into free space. She positions the feed at the dish's focal point and adjusts its flare angle.",
      question: "How do standing wave principles influence the design of the waveguide-to-horn transition in the antenna feed?",
      options: [
        { id: 'a', label: "The horn must be exactly one wavelength long to cancel all standing waves" },
        { id: 'b', label: "The gradual impedance taper from waveguide to free space (377Ω) minimizes reflections and standing waves, maximizing power transfer to the dish", correct: true },
        { id: 'c', label: "Standing waves in the horn focus the beam more tightly" },
        { id: 'd', label: "The horn creates beneficial standing waves that increase antenna gain by 3dB" }
      ],
      explanation: "When a waveguide (with characteristic impedance around 500Ω for rectangular guides) meets free space (377Ω), the impedance discontinuity causes reflections and standing waves. A horn antenna provides a gradual transition - the flaring geometry slowly transforms the waveguide impedance to match free space. This 'impedance taper' over several wavelengths minimizes reflections, reducing VSWR and maximizing power radiated into free space. Poor transitions create standing waves that reduce efficiency and can damage transmitter components through reflected power."
    },
    // Question 8: Transmission line reflections (Hard)
    {
      scenario: "A high-frequency circuit designer sends a 1 ns pulse down a 50Ω transmission line. The line is accidentally terminated with a 150Ω resistor instead of the correct 50Ω. She observes the signal on an oscilloscope at the source end.",
      question: "What will the oscilloscope display show, and why does this occur?",
      options: [
        { id: 'a', label: "A single pulse with 3 times the original amplitude" },
        { id: 'b', label: "The original pulse followed by a smaller reflected pulse (50% amplitude, same polarity) arriving after the round-trip delay, due to the positive reflection coefficient at the mismatched termination", correct: true },
        { id: 'c', label: "The pulse will be completely absorbed with no reflection" },
        { id: 'd', label: "A continuous sine wave at the pulse's fundamental frequency" }
      ],
      explanation: "When a pulse reaches a mismatched termination, part of it reflects. The reflection coefficient Γ = (ZL-Z0)/(ZL+Z0) = (150-50)/(150+50) = 0.5. This means 50% of the voltage amplitude reflects back with the same polarity. The oscilloscope first shows the outgoing pulse, then after the round-trip propagation delay, the reflected pulse appears. If the source is also mismatched, multiple reflections occur, creating a 'ringing' pattern. This is why proper termination (matched impedance) is critical in high-speed digital circuits to prevent signal integrity issues."
    },
    // Question 9: Smith chart basics (Hard)
    {
      scenario: "A microwave engineer uses a Smith chart to analyze a transmission line problem. She plots a point at the chart's center, then another point on the right edge of the chart along the real axis.",
      question: "What do these two points on the Smith chart represent in terms of impedance and standing wave behavior?",
      options: [
        { id: 'a', label: "Center represents maximum inductance; right edge represents maximum capacitance" },
        { id: 'b', label: "Center represents a perfect match (Z = Z₀, VSWR = 1, no reflections); right edge represents an open circuit (Z = ∞, total reflection, VSWR = ∞)", correct: true },
        { id: 'c', label: "Center represents zero impedance; right edge represents infinite frequency" },
        { id: 'd', label: "Both points represent the same impedance at different frequencies" }
      ],
      explanation: "The Smith chart is a graphical tool for analyzing transmission line impedance and reflections. The center point represents normalized impedance z = 1 (matched load), where Γ = 0 and VSWR = 1 - no standing waves exist. The right edge of the real axis represents z = ∞ (open circuit), where Γ = +1 and all incident power reflects in phase, creating maximum standing waves. The left edge (z = 0, short circuit) has Γ = -1 (phase-inverted reflection). Moving around the chart represents adding transmission line length or reactive components. Engineers use it to design matching networks."
    },
    // Question 10: Slotted line measurements (Hard)
    {
      scenario: "In a university RF lab, students use a slotted line - a section of transmission line with a narrow slot cut along its length and a movable probe - to measure an unknown load impedance at 3 GHz. They slide the probe along the line, recording voltage readings at each position.",
      question: "How does the slotted line measurement technique utilize standing waves to determine the unknown load impedance?",
      options: [
        { id: 'a', label: "The probe measures the magnetic field, which is constant regardless of standing waves" },
        { id: 'b', label: "The probe samples the standing wave pattern; the ratio of maximum to minimum voltage gives VSWR, and the position of the first minimum relative to the load reveals the impedance phase angle", correct: true },
        { id: 'c', label: "The slot creates new standing waves that interfere with the original signal" },
        { id: 'd', label: "The probe measures the frequency shift caused by the unknown load" }
      ],
      explanation: "A slotted line exploits standing wave properties for impedance measurement. When an unknown load creates reflections, standing waves form on the line with a pattern determined by the load. By sliding the probe, students find Vmax and Vmin positions. VSWR = Vmax/Vmin gives the reflection coefficient magnitude |Γ|. The distance from the load to the first voltage minimum (in wavelengths) gives the phase of Γ. Together, these fully characterize the complex reflection coefficient, which can be converted to load impedance using Z_L = Z₀(1+Γ)/(1-Γ). Though network analyzers have largely replaced slotted lines, they remain excellent teaching tools."
    }
  ];

  const renderTest = () => {
    const currentQuestion = testAnswers.length;
    const question = TEST_QUESTIONS[currentQuestion];

    if (!question) {
      const score = testAnswers.filter((a, i) => TEST_QUESTIONS[i].options[a]?.correct).length;
      const passingScore = Math.ceil(TEST_QUESTIONS.length * 0.7);
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
          <div className="text-6xl mb-4">{score >= passingScore ? '🎉' : '📚'}</div>
          <h2 className="text-2xl font-bold text-white mb-2">Score: {score}/{TEST_QUESTIONS.length}</h2>
          <p className="text-slate-300 mb-6">{score >= passingScore ? 'Excellent! You\'ve mastered standing waves!' : 'Keep studying! Review and try again.'}</p>
          {score >= passingScore ? (
            <button
              onClick={() => { playSound('complete'); goToNextPhase(); }}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl"
              style={{ position: 'relative', zIndex: 10 }}
            >
              Claim Your Mastery Badge
            </button>
          ) : (
            <button
              onClick={() => { setTestAnswers([]); goToPhase('review'); }}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl"
              style={{ position: 'relative', zIndex: 10 }}
            >
              Review & Try Again
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center p-6">
        <h2 className="text-xl font-bold text-white text-center mb-6">Quiz: Question {currentQuestion + 1}/{TEST_QUESTIONS.length}</h2>
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
          <p className="text-lg text-slate-300">{question.question}</p>
        </div>
        <div className="grid gap-3 w-full max-w-xl">
          {question.options.map((option, i) => (
            <button
              key={i}
              onClick={() => handleTestAnswer(i, option.correct)}
              className="p-4 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent text-left text-slate-200"
              style={{ position: 'relative', zIndex: 10 }}
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-amber-900/50 via-orange-900/50 to-red-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">🏆</div>
        <h1 className="text-3xl font-bold text-white mb-4">Standing Wave Master!</h1>
        <p className="text-xl text-slate-300 mb-6">You've mastered microwave standing wave physics!</p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">〰️</div><p className="text-sm text-slate-300">Standing Waves</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🔥</div><p className="text-sm text-slate-300">Hot Spots</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🔄</div><p className="text-sm text-slate-300">Turntable Solution</p></div>
          <div className="bg-slate-800/50 rounded-xl p-4"><div className="text-2xl mb-2">🍡</div><p className="text-sm text-slate-300">Marshmallow Test</p></div>
        </div>
        <button onClick={() => goToPhase('hook')} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl" style={{ position: 'relative', zIndex: 10 }}>Explore Again</button>
      </div>
    </div>
  );

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
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Standing Waves</span>
          <div className="flex items-center gap-1.5">
            {PHASE_ORDER.map((p, index) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-amber-400 w-6 shadow-lg shadow-amber-400/30'
                    : PHASE_ORDER.indexOf(phase) > index
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
                style={{ position: 'relative', zIndex: 10 }}
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

export default MicrowaveStandingWaveRenderer;
