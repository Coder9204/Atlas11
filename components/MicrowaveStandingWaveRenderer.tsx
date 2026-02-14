'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Microwave Standing Wave - Complete 10-Phase Game
// Why microwaves create hot spots and cold spots
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

interface MicrowaveStandingWaveRendererProps {
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
    scenario: "You place a bowl of cold soup in a microwave oven without the turntable spinning. After 2 minutes, you notice some spots are scalding hot while others are barely warm.",
    question: "What fundamental wave phenomenon causes this uneven heating pattern?",
    options: [
      { id: 'a', label: "Sound waves from the magnetron create pressure differences in the food" },
      { id: 'b', label: "Standing waves form when microwaves reflect off metal walls, creating fixed hot spots (antinodes) and cold spots (nodes)", correct: true },
      { id: 'c', label: "The magnetron rotates and misses certain areas of the cavity" },
      { id: 'd', label: "Microwave radiation decays exponentially from the source" }
    ],
    explanation: "Standing waves occur when waves traveling in opposite directions interfere. At antinodes, waves constructively interfere (hot spots). At nodes, they destructively interfere (cold spots)."
  },
  {
    scenario: "A food scientist places thermal-sensitive paper in a microwave and runs it for 30 seconds. The paper reveals a checkerboard pattern with heated regions about 6.1 cm apart.",
    question: "What does the 6.1 cm spacing reveal about the microwave radiation?",
    options: [
      { id: 'a', label: "The magnetron is oscillating at 6.1 GHz" },
      { id: 'b', label: "The wavelength is approximately 12.2 cm, since hot spots are separated by half a wavelength", correct: true },
      { id: 'c', label: "The cavity is exactly 6.1 cm wide" },
      { id: 'd', label: "The power output is 6.1 watts per square centimeter" }
    ],
    explanation: "Adjacent antinodes are separated by exactly half a wavelength (lambda/2). If hot spots are 6.1 cm apart, wavelength = 12.2 cm, corresponding to 2.45 GHz."
  },
  {
    scenario: "An engineer designing a compact RV microwave considers eliminating the turntable to reduce unit depth. Her colleague warns this would impact cooking performance.",
    question: "What is the primary engineering purpose of the rotating turntable?",
    options: [
      { id: 'a', label: "To prevent the food container from melting" },
      { id: 'b', label: "To move food through fixed nodes and antinodes, ensuring all parts receive energy for uniform heating", correct: true },
      { id: 'c', label: "To create additional microwave radiation through induction" },
      { id: 'd', label: "To prevent standing waves from forming" }
    ],
    explanation: "The standing wave pattern is fixed in space. The turntable ensures all food portions pass through both hot and cold spots over time, averaging the heating."
  },
  {
    scenario: "A telecommunications technician installs a satellite dish. The microwave signal travels through a rectangular metal tube (waveguide) to reach the receiver.",
    question: "Why must a waveguide's dimensions be larger than half the signal wavelength?",
    options: [
      { id: 'a', label: "Smaller dimensions would cause the metal to overheat" },
      { id: 'b', label: "Below cutoff, the wave becomes evanescent and decays exponentially, unable to propagate", correct: true },
      { id: 'c', label: "The signal would travel too fast and create timing errors" },
      { id: 'd', label: "Smaller guides would amplify the signal dangerously" }
    ],
    explanation: "Waveguides support propagation through standing wave patterns. Below the cutoff dimension (lambda/2), waves cannot sustain these patterns and decay exponentially."
  },
  {
    scenario: "A radio engineer measures VSWR (Voltage Standing Wave Ratio) of 3:1 on a transmission line feeding an antenna. A perfect match would show VSWR of 1:1.",
    question: "What does the 3:1 VSWR indicate, and why is it problematic?",
    options: [
      { id: 'a', label: "The antenna receives 3x more signal than expected" },
      { id: 'b', label: "Impedance mismatch causes partial reflection; about 25% of power is reflected rather than radiated", correct: true },
      { id: 'c', label: "The transmission line is exactly 3 wavelengths long" },
      { id: 'd', label: "The antenna operates at 3x its designed frequency" }
    ],
    explanation: "VSWR of 3:1 means reflection coefficient = 0.5, so 25% of power reflects back. This reduces efficiency and can damage the transmitter."
  },
  {
    scenario: "A physicist designs a microwave cavity resonator for a particle accelerator. The cylindrical cavity must resonate at exactly 2.856 GHz to accelerate electrons.",
    question: "Why is dimensional precision so critical for cavity resonators?",
    options: [
      { id: 'a', label: "Larger dimensions increase capacitance" },
      { id: 'b', label: "Resonance occurs only when dimensions support standing waves with nodes at conducting walls; millimeter errors shift frequency significantly", correct: true },
      { id: 'c', label: "Resonant frequency depends only on wall material" },
      { id: 'd', label: "Cavities resonate at all frequencies" }
    ],
    explanation: "Cavity resonators require specific boundary conditions. At 2.856 GHz, even 1mm error shifts frequency by ~10 MHz - critical for particle timing."
  },
  {
    scenario: "An antenna engineer designs a horn antenna feed for a satellite dish, positioning it at the focal point and adjusting the flare angle.",
    question: "How do standing wave principles influence waveguide-to-horn transition design?",
    options: [
      { id: 'a', label: "The horn must be exactly one wavelength long" },
      { id: 'b', label: "Gradual impedance taper from waveguide to free space minimizes reflections and standing waves, maximizing power transfer", correct: true },
      { id: 'c', label: "Standing waves in the horn focus the beam more tightly" },
      { id: 'd', label: "The horn creates beneficial standing waves that increase gain" }
    ],
    explanation: "A horn provides gradual impedance transition from ~500 ohm waveguide to 377 ohm free space, minimizing reflections and maximizing radiated power."
  },
  {
    scenario: "A circuit designer sends a 1 ns pulse down a 50 ohm transmission line terminated with 150 ohm instead of the correct 50 ohm. She observes the signal at the source end.",
    question: "What will the oscilloscope display show?",
    options: [
      { id: 'a', label: "A single pulse with 3x original amplitude" },
      { id: 'b', label: "Original pulse followed by a smaller reflected pulse (50% amplitude, same polarity) after round-trip delay", correct: true },
      { id: 'c', label: "The pulse is completely absorbed with no reflection" },
      { id: 'd', label: "A continuous sine wave at the pulse frequency" }
    ],
    explanation: "Reflection coefficient = (150-50)/(150+50) = 0.5. The 50% reflected pulse arrives after propagating down and back. Multiple reflections cause 'ringing'."
  },
  {
    scenario: "A microwave engineer uses a Smith chart. She plots a point at the center, then another at the right edge along the real axis.",
    question: "What do these two points represent?",
    options: [
      { id: 'a', label: "Center = maximum inductance; right edge = maximum capacitance" },
      { id: 'b', label: "Center = perfect match (VSWR=1, no reflections); right edge = open circuit (VSWR=infinity, total reflection)", correct: true },
      { id: 'c', label: "Center = zero impedance; right edge = infinite frequency" },
      { id: 'd', label: "Both points = same impedance at different frequencies" }
    ],
    explanation: "Smith chart center is matched load (no standing waves). Right edge is open circuit with total reflection. Engineers use it to design matching networks."
  },
  {
    scenario: "Students use a slotted line at 3 GHz to measure unknown load impedance. They slide a probe along the line, recording voltage at each position.",
    question: "How does the slotted line measurement utilize standing waves?",
    options: [
      { id: 'a', label: "The probe measures magnetic field, constant regardless of standing waves" },
      { id: 'b', label: "The probe samples the standing wave pattern; Vmax/Vmin gives VSWR, position of first minimum reveals impedance phase", correct: true },
      { id: 'c', label: "The slot creates new standing waves that interfere with the signal" },
      { id: 'd', label: "The probe measures frequency shift caused by the load" }
    ],
    explanation: "Finding Vmax and Vmin positions gives VSWR (reflection magnitude). Distance from load to first minimum gives reflection phase. Together, they determine load impedance."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🔬',
    title: 'Microwave Chemistry',
    short: 'Accelerated chemical reactions',
    tagline: 'Heating molecules from the inside out',
    description: 'Industrial microwave reactors use precisely controlled standing wave patterns to heat chemical reactions. By placing reactants at antinodes (hot spots), chemists achieve uniform heating that can accelerate reactions 100x while reducing energy consumption.',
    connection: 'The standing wave patterns create fixed hot spots at antinodes. Industrial reactors position reaction vessels at these maxima for optimal energy coupling.',
    howItWorks: 'Microwave cavity tuned to create specific standing wave pattern. Reaction vessel placed at antinode position. Dielectric heating excites polar molecules uniformly throughout volume.',
    stats: [
      { value: '100x', label: 'Reaction speed increase', icon: '⚡' },
      { value: '90%', label: 'Energy efficiency', icon: '📈' },
      { value: '$2B', label: 'Industrial market', icon: '💰' }
    ],
    examples: ['Pharmaceutical synthesis', 'Polymer curing', 'Organic chemistry', 'Materials processing'],
    companies: ['CEM Corporation', 'Anton Paar', 'Milestone', 'Biotage'],
    futureImpact: 'Continuous flow microwave reactors will enable on-demand pharmaceutical manufacturing at point of care.',
    color: '#8B5CF6'
  },
  {
    icon: '📡',
    title: 'Antenna Design',
    short: 'Standing wave ratio in RF systems',
    tagline: 'Maximizing signal, minimizing reflections',
    description: 'Radio engineers obsess over standing wave ratio (SWR) - the measure of how much energy reflects back versus being radiated. Impedance mismatches create standing waves that waste power and can damage transmitters.',
    connection: 'Wave reflections from impedance mismatches create standing waves on transmission lines, reducing efficiency - the same physics as microwave hot spots.',
    howItWorks: 'Antenna impedance must match transmission line (typically 50 ohm). Mismatch causes partial reflection. SWR meter measures ratio. Matching networks tune out reflections.',
    stats: [
      { value: '1.5:1', label: 'Acceptable SWR', icon: '📊' },
      { value: '50Ω', label: 'Standard impedance', icon: '⚡' },
      { value: '$30B', label: 'RF component market', icon: '📈' }
    ],
    examples: ['Cell tower antennas', 'Ham radio stations', 'WiFi routers', 'Satellite uplinks'],
    companies: ['Ericsson', 'CommScope', 'Amphenol', 'TE Connectivity'],
    futureImpact: 'Reconfigurable intelligent surfaces will dynamically shape standing wave patterns to optimize 6G wireless coverage.',
    color: '#3B82F6'
  },
  {
    icon: '🎸',
    title: 'Musical Instrument Acoustics',
    short: 'Standing waves make music',
    tagline: 'Every note is a resonant mode',
    description: 'Musical instruments work by creating standing waves - on strings, in air columns, or on vibrating surfaces. The fundamental frequency and overtones that give each instrument its timbre are different standing wave patterns.',
    connection: 'The microwave standing wave patterns directly parallel acoustic standing waves. The lambda/2 spacing between nodes applies to guitars, flutes, and drums alike.',
    howItWorks: 'String or air column length determines fundamental wavelength. Boundary conditions set node positions. Multiple modes produce harmonics. Body shapes amplify certain frequencies.',
    stats: [
      { value: '440Hz', label: 'A4 concert pitch', icon: '🎵' },
      { value: '20-20kHz', label: 'Human hearing range', icon: '👂' },
      { value: '$20B', label: 'Instrument market', icon: '📈' }
    ],
    examples: ['Guitar harmonics', 'Organ pipes', 'Violin resonances', 'Drum modes'],
    companies: ['Fender', 'Yamaha', 'Steinway', 'Gibson'],
    futureImpact: 'Computational acoustics will enable 3D-printed instruments with geometries optimized for specific tonal qualities.',
    color: '#10B981'
  },
  {
    icon: '⚛️',
    title: 'Particle Accelerators',
    short: 'RF cavities for atom smashing',
    tagline: 'Surfing on electromagnetic waves',
    description: 'Particle accelerators use radio frequency cavities where standing electromagnetic waves accelerate charged particles. Particles arrive when the electric field peaks, gaining energy each pass.',
    connection: 'Antinodes are energy maxima. In accelerator cavities, particles must arrive when the standing wave electric field peaks - timing synchronized to lambda/2 spacing.',
    howItWorks: 'RF power creates standing wave in resonant cavity. Electric field oscillates at GHz frequencies. Particle bunches timed to arrive at field maximum. Each cavity adds ~1 MeV.',
    stats: [
      { value: '14TeV', label: 'LHC collision energy', icon: '⚡' },
      { value: '400MHz', label: 'LHC RF frequency', icon: '📡' },
      { value: '$10B', label: 'Accelerator cost', icon: '📈' }
    ],
    examples: ['Large Hadron Collider', 'Cancer proton therapy', 'X-ray synchrotrons', 'Spallation sources'],
    companies: ['CERN', 'Fermilab', 'SLAC', 'Varian Medical'],
    futureImpact: 'Plasma wakefield accelerators will achieve LHC energies in meters instead of kilometers.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const MicrowaveStandingWaveRenderer: React.FC<MicrowaveStandingWaveRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Simulation state - Play phase
  const [frequency, setFrequency] = useState(2.45); // GHz
  const [cavityLength, setCavityLength] = useState(30); // cm
  const [powerLevel, setPowerLevel] = useState(100); // percentage
  const [isCooking, setIsCooking] = useState(false);
  const [turntableOn, setTurntableOn] = useState(false);
  const [cookTime, setCookTime] = useState(0);
  const [foodTemp, setFoodTemp] = useState<number[]>(Array(25).fill(20));
  const [turntableAngle, setTurntableAngle] = useState(0);
  const [animPhase, setAnimPhase] = useState(0);

  // Twist phase state
  const [foodPosition, setFoodPosition] = useState<'center' | 'edge' | 'corner'>('center');
  const [cavityMode, setCavityMode] = useState<1 | 2 | 3>(1);
  const [twistCookTime, setTwistCookTime] = useState(0);
  const [twistNoTurntableTemp, setTwistNoTurntableTemp] = useState<number[]>(Array(25).fill(20));
  const [twistWithTurntableTemp, setTwistWithTurntableTemp] = useState<number[]>(Array(25).fill(20));
  const [twistComparisonRunning, setTwistComparisonRunning] = useState(false);
  const [twistComparisonComplete, setTwistComparisonComplete] = useState(false);

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

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate wavelength from frequency
  const wavelength = (3e8 / (frequency * 1e9)) * 100; // in cm

  // Standing wave intensity calculation
  const getIntensityAt = (x: number, y: number, angle: number, mode: number = 1) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;
    const scaleFactor = (cavityLength / 30) * (2.45 / frequency) * mode;
    const intensity = Math.abs(
      Math.sin(rx * Math.PI * 2 * scaleFactor) *
      Math.sin(ry * Math.PI * 2 * scaleFactor)
    );
    return intensity * (powerLevel / 100);
  };

  // Get food position offset
  const getFoodPositionOffset = () => {
    switch (foodPosition) {
      case 'center': return { x: 0, y: 0 };
      case 'edge': return { x: 0.3, y: 0 };
      case 'corner': return { x: 0.3, y: 0.3 };
      default: return { x: 0, y: 0 };
    }
  };

  // Animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimPhase(p => (p + 0.15) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Cooking simulation for Play phase
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
  }, [isCooking, turntableOn, turntableAngle, powerLevel]);

  // Twist comparison simulation
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

  // Reset when entering phases
  useEffect(() => {
    if (phase === 'play') {
      setIsCooking(false);
      setTurntableOn(false);
      setCookTime(0);
      setFoodTemp(Array(25).fill(20));
      setTurntableAngle(0);
    }
    if (phase === 'twist_play') {
      setTwistCookTime(0);
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

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
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
    twist_predict: 'New Variable',
    twist_play: 'Turntable Lab',
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
        gameType: 'microwave-standing-wave',
        gameTitle: 'Microwave Standing Wave',
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

  // Navigation bar component with fixed positioning
  const renderNavBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: colors.bgSecondary,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <span style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>
        Microwave Standing Wave
      </span>
      <span style={{ ...typo.small, color: colors.textSecondary }}>
        {phaseLabels[phase]} ({phaseOrder.indexOf(phase) + 1}/{phaseOrder.length})
      </span>
    </div>
  );

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 56,
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

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #D97706)`,
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

  // Standing wave SVG visualization
  const renderStandingWaveSVG = (interactive: boolean = false, showLabels: boolean = true) => {
    const svgWidth = 400;
    const svgHeight = 300;
    const waveAmplitude = 40;
    const numPoints = 100;

    // Generate standing wave pattern
    const generateWavePath = (phase: number, yOffset: number) => {
      let path = '';
      for (let i = 0; i <= numPoints; i++) {
        const x = (i / numPoints) * svgWidth;
        const normalizedX = i / numPoints;
        const standingWaveAmplitude = Math.abs(Math.sin(normalizedX * Math.PI * 3 + animPhase)) * Math.sin(phase);
        const y = yOffset + standingWaveAmplitude * waveAmplitude;
        path += (i === 0 ? 'M' : 'L') + `${x},${y}`;
      }
      return path;
    };

    // Calculate hotspot positions
    const hotspots = [];
    for (let i = 0; i < 4; i++) {
      const x = (i * svgWidth) / 3;
      hotspots.push({ x, isAntinode: i % 2 === 1 });
    }

    return (
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ width: '100%', maxWidth: '400px', height: 'auto' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.accent} />
            <stop offset="100%" stopColor={colors.success} />
          </linearGradient>
          <linearGradient id="hotGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="coldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={svgWidth} height={svgHeight} fill={colors.bgCard} rx="8" />

        {/* Microwave cavity walls */}
        <g id="cavity-walls">
          <rect x="20" y="60" width={svgWidth - 40} height="180" fill="none" stroke="#6B7280" strokeWidth="3" rx="4" />
          <text x="30" y="50" fill={colors.textSecondary} fontSize="12" fontWeight="500">Metal Cavity</text>
        </g>

        {/* Hot spots (antinodes) and cold spots (nodes) */}
        <g id="intensity-zones">
          {[0, 1, 2, 3].map((i) => {
            const x = 20 + (i * (svgWidth - 40)) / 3;
            const isAntinode = i % 2 === 1;
            return (
              <g key={i}>
                <rect
                  x={x - 15}
                  y="70"
                  width="30"
                  height="160"
                  fill={isAntinode ? 'url(#hotGradient)' : 'url(#coldGradient)'}
                  opacity="0.5"
                />
                {showLabels && (
                  <text
                    x={x}
                    y="250"
                    fill={isAntinode ? '#ef4444' : '#3b82f6'}
                    fontSize="10"
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {isAntinode ? 'HOT' : 'COLD'}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Standing wave pattern */}
        <g id="standing-wave">
          <path
            d={generateWavePath(1, 150)}
            fill="none"
            stroke="url(#waveGradient)"
            strokeWidth="3"
            opacity="0.9"
          />
          <path
            d={generateWavePath(-1, 150)}
            fill="none"
            stroke="url(#waveGradient)"
            strokeWidth="3"
            opacity="0.5"
            strokeDasharray="5,5"
          />
        </g>

        {/* Wavelength indicator */}
        <g id="wavelength-marker">
          <line x1="85" y1="270" x2="200" y2="270" stroke={colors.accent} strokeWidth="2" markerEnd="url(#arrowEnd)" />
          <line x1="200" y1="270" x2="315" y2="270" stroke={colors.accent} strokeWidth="2" />
          <text x="200" y="290" fill={colors.accent} fontSize="11" textAnchor="middle" fontWeight="600">
            lambda/2 = {(wavelength / 2).toFixed(1)} cm
          </text>
        </g>

        {/* Labels */}
        <g id="labels">
          <text x={svgWidth / 2} y="25" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="700">
            Standing Wave Pattern
          </text>
          {interactive && (
            <text x={svgWidth / 2} y="42" fill={colors.textSecondary} fontSize="11" textAnchor="middle">
              Adjust frequency to change pattern
            </text>
          )}
        </g>

        {/* Food representation in center */}
        <g id="food-item">
          <ellipse cx={svgWidth / 2} cy="150" rx="35" ry="25" fill="#92400E" stroke="#78350F" strokeWidth="2" />
          <text x={svgWidth / 2} y="155" fill="#FEF3C7" fontSize="10" textAnchor="middle">Food</text>
        </g>
      </svg>
    );
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
        paddingTop: '80px',
        textAlign: 'center',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🍲🔥
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          The Microwave Mystery
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          You heat leftovers in the microwave. One bite is <span style={{ color: '#3b82f6' }}>ice cold</span>, the next is <span style={{ color: '#ef4444' }}>scalding hot</span>! Why does this happen?
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
            "Inside every microwave oven, electromagnetic waves bounce back and forth, creating invisible patterns of hot spots and cold spots. Understanding these standing waves reveals why your food heats so unevenly."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Standing Wave Physics
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Investigate the Mystery
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Random chaos - energy scatters everywhere equally' },
      { id: 'b', text: 'Standing waves form with fixed hot spots and cold spots', correct: true },
      { id: 'c', text: 'All energy concentrates in the center' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
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
            Microwaves bounce back and forth inside the oven. What happens when waves reflect off the metal walls?
          </h2>

          {/* SVG Diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            {renderStandingWaveSVG(false, false)}
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
                  minHeight: '44px',
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
            <div style={{ textAlign: 'center' }}>
              <div style={{
                background: prediction === 'b' ? `${colors.success}22` : `${colors.error}22`,
                border: `1px solid ${prediction === 'b' ? colors.success : colors.error}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
              }}>
                <p style={{ ...typo.body, color: prediction === 'b' ? colors.success : colors.error, margin: 0 }}>
                  {prediction === 'b' ? 'Correct!' : 'Not quite!'} Standing waves create fixed patterns of high and low energy!
                </p>
              </div>
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                See It in Action
              </button>
            </div>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Microwave Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Standing Wave Laboratory
          </h2>
          <p style={{ ...typo.body, color: '#e2e8f0', textAlign: 'center', marginBottom: '24px' }}>
            Adjust parameters to see how standing waves create hot spots and cold spots.
          </p>

          {/* SVG Visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            {renderStandingWaveSVG(true, true)}
          </div>

          {/* Controls panel */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Frequency slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Microwave Frequency</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{frequency.toFixed(2)} GHz</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="3.0"
                step="0.05"
                value={frequency}
                onChange={(e) => setFrequency(parseFloat(e.target.value))}
                style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>2.0 GHz</span>
                <span style={{ ...typo.small, color: colors.accent }}>Standard: 2.45 GHz</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>3.0 GHz</span>
              </div>
            </div>

            {/* Cavity length slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Cavity Length</span>
                <span style={{ ...typo.small, color: '#3b82f6', fontWeight: 600 }}>{cavityLength} cm</span>
              </div>
              <input
                type="range"
                min="20"
                max="50"
                step="1"
                value={cavityLength}
                onChange={(e) => setCavityLength(parseInt(e.target.value))}
                style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Power slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Power Level</span>
                <span style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>{powerLevel}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="10"
                value={powerLevel}
                onChange={(e) => setPowerLevel(parseInt(e.target.value))}
                style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Wavelength display */}
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '8px',
              padding: '12px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.textPrimary, margin: 0 }}>
                <strong>Wavelength:</strong> {wavelength.toFixed(2)} cm | <strong>Hot spot spacing:</strong> {(wavelength / 2).toFixed(1)} cm (lambda/2)
              </p>
            </div>
          </div>

          {/* Food grid visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '16px' }}>
              Food Temperature Grid (Blue=Cold, Green=Warm, Yellow=Hot, Red=Very Hot)
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '4px',
              maxWidth: '200px',
              margin: '0 auto 16px',
            }}>
              {foodTemp.map((temp, i) => (
                <div
                  key={i}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '4px',
                    backgroundColor: tempToColor(temp),
                    transition: 'background-color 0.2s',
                  }}
                  title={`${temp.toFixed(0)}C`}
                />
              ))}
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px' }}>
              <div>
                <div style={{ ...typo.h3, color: colors.accent }}>{cookTime.toFixed(1)}s</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Cook Time</div>
              </div>
              <div>
                <div style={{ ...typo.h3, color: colors.success }}>
                  {(foodTemp.reduce((a, b) => a + b, 0) / 25).toFixed(0)}C
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Avg Temp</div>
              </div>
              <div>
                <div style={{ ...typo.h3, color: turntableOn ? '#3b82f6' : colors.textMuted }}>
                  {turntableOn ? 'ON' : 'OFF'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Turntable</div>
              </div>
            </div>

            {/* Control buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => { setIsCooking(!isCooking); playSound('click'); }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isCooking ? colors.error : colors.success,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                {isCooking ? 'Stop' : 'Start Cooking'}
              </button>
              <button
                onClick={() => { setTurntableOn(!turntableOn); playSound('click'); }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: turntableOn ? '#3b82f6' : colors.bgSecondary,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                Turntable: {turntableOn ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => {
                  setFoodTemp(Array(25).fill(20));
                  setCookTime(0);
                  setIsCooking(false);
                  playSound('click');
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Real-world relevance */}
          <div style={{
            background: `${colors.success}11`,
            border: `1px solid ${colors.success}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <p style={{ ...typo.body, color: '#e2e8f0', margin: 0 }}>
              <strong style={{ color: colors.success }}>Real-World Application:</strong> The same standing wave physics that creates microwave hot spots is used in particle accelerators at CERN to accelerate particles to near light speed, and in antenna design to optimize signal transmission.
            </p>
          </div>

          {/* Discovery prompt */}
          <div style={{
            background: `${colors.accent}22`,
            border: `1px solid ${colors.accent}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.accent, margin: 0 }}>
              Try cooking with turntable OFF, then ON. Notice how the turntable helps distribute heat evenly!
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
        </div>

        {renderNavDots()}
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
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Standing Waves
          </h2>

          {/* Reference user's prediction */}
          <div style={{
            background: prediction === 'b' ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${prediction === 'b' ? colors.success : colors.warning}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: '#e2e8f0', margin: 0 }}>
              {prediction === 'b'
                ? 'Your prediction was correct! Standing waves do form with fixed hot spots and cold spots.'
                : `You predicted "${prediction === 'a' ? 'random chaos' : 'energy concentrates in center'}". Let's see why standing waves actually create fixed patterns of hot and cold spots.`}
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: '#e2e8f0' }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Standing Waves = Interference Pattern</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                When microwaves bounce off metal walls and meet incoming waves, they <span style={{ color: colors.accent }}>interfere</span>. At some points they reinforce (antinodes = hot), at others they cancel (nodes = cold).
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Wavelength: lambda = c / f</strong>
              </p>
              <p>
                At 2.45 GHz, lambda = 3x10^8 / 2.45x10^9 = <span style={{ color: colors.success }}>12.2 cm</span>. Hot spots are spaced <span style={{ color: colors.accent }}>6.1 cm apart</span> (lambda/2).
              </p>
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
              Key Insight: Fixed Pattern
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              The standing wave pattern is <strong>fixed in space</strong>. Nodes and antinodes don't move - they're determined by the cavity dimensions and wavelength. This is why food at a node stays cold no matter how long you cook!
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{
              background: `${colors.error}22`,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid ${colors.error}44`,
            }}>
              <h4 style={{ ...typo.h3, color: colors.error, marginBottom: '8px' }}>Antinodes (Hot)</h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                Maximum amplitude. Waves reinforce. Food heats rapidly.
              </p>
            </div>
            <div style={{
              background: `#3b82f622`,
              borderRadius: '12px',
              padding: '16px',
              border: `1px solid #3b82f644`,
            }}>
              <h4 style={{ ...typo.h3, color: '#3b82f6', marginBottom: '8px' }}>Nodes (Cold)</h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                Zero amplitude. Waves cancel. Food stays cold.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover the Solution
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'It just stirs the food like a mixer' },
      { id: 'b', text: 'Turntable moves food through hot spots for even heating', correct: true },
      { id: 'c', text: 'It creates additional microwaves through induction' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        overflowY: 'auto',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              The Twist Challenge
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            If standing waves create fixed hot spots, why do microwave ovens have a turntable?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔄</div>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              The turntable rotates the food, but the standing wave pattern stays fixed...
            </p>
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
                  minHeight: '44px',
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
            <div style={{ textAlign: 'center' }}>
              <div style={{
                background: twistPrediction === 'b' ? `${colors.success}22` : `${colors.error}22`,
                border: `1px solid ${twistPrediction === 'b' ? colors.success : colors.error}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
              }}>
                <p style={{ ...typo.body, color: twistPrediction === 'b' ? colors.success : colors.error, margin: 0 }}>
                  {twistPrediction === 'b' ? 'Exactly!' : 'Not quite!'} The turntable moves food through the pattern for even heating!
                </p>
              </div>
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                See How It Works
              </button>
            </div>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const startComparison = () => {
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

    const calcVariance = (temps: number[]) => {
      const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
      return Math.sqrt(temps.reduce((acc, t) => acc + Math.pow(t - avg, 2), 0) / temps.length);
    };

    const noTurntableVariance = calcVariance(twistNoTurntableTemp);
    const withTurntableVariance = calcVariance(twistWithTurntableTemp);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Turntable Comparison Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Compare cooking with and without turntable rotation
          </p>

          {/* Controls */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
              {/* Food position */}
              <div>
                <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>Food Position</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['center', 'edge', 'corner'] as const).map(pos => (
                    <button
                      key={pos}
                      onClick={() => { if (!twistComparisonRunning) { setFoodPosition(pos); resetComparison(); } }}
                      disabled={twistComparisonRunning}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: foodPosition === pos ? colors.accent : colors.bgSecondary,
                        color: 'white',
                        fontWeight: 500,
                        cursor: twistComparisonRunning ? 'not-allowed' : 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cavity mode */}
              <div>
                <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>Cavity Mode</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {([1, 2, 3] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => { if (!twistComparisonRunning) { setCavityMode(mode); resetComparison(); } }}
                      disabled={twistComparisonRunning}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: cavityMode === mode ? '#3b82f6' : colors.bgSecondary,
                        color: 'white',
                        fontWeight: 500,
                        cursor: twistComparisonRunning ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Mode {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-side comparison */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '16px',
            marginBottom: '24px',
          }}>
            {/* Without turntable */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center',
            }}>
              <h3 style={{ ...typo.h3, color: colors.error, marginBottom: '16px' }}>Without Turntable</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '4px',
                maxWidth: '160px',
                margin: '0 auto 16px',
              }}>
                {twistNoTurntableTemp.map((temp, i) => (
                  <div
                    key={i}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '4px',
                      backgroundColor: tempToColor(temp),
                    }}
                  />
                ))}
              </div>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                Avg: {(twistNoTurntableTemp.reduce((a, b) => a + b, 0) / 25).toFixed(0)}C
              </p>
              <p style={{ ...typo.small, color: noTurntableVariance > 15 ? colors.error : colors.warning }}>
                Variation: +/-{noTurntableVariance.toFixed(1)}C
              </p>
            </div>

            {/* With turntable */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center',
            }}>
              <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '16px' }}>With Turntable</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '4px',
                maxWidth: '160px',
                margin: '0 auto 16px',
              }}>
                {twistWithTurntableTemp.map((temp, i) => (
                  <div
                    key={i}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '4px',
                      backgroundColor: tempToColor(temp),
                    }}
                  />
                ))}
              </div>
              <p style={{ ...typo.small, color: colors.textSecondary }}>
                Avg: {(twistWithTurntableTemp.reduce((a, b) => a + b, 0) / 25).toFixed(0)}C
              </p>
              <p style={{ ...typo.small, color: withTurntableVariance < 10 ? colors.success : colors.warning }}>
                Variation: +/-{withTurntableVariance.toFixed(1)}C
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          {twistComparisonRunning && (
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.accent, marginBottom: '8px' }}>
                Cooking... {twistCookTime.toFixed(1)}s remaining
              </p>
              <div style={{
                height: '8px',
                background: colors.bgSecondary,
                borderRadius: '4px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${((10 - twistCookTime) / 10) * 100}%`,
                  background: colors.accent,
                  transition: 'width 0.1s',
                }} />
              </div>
            </div>
          )}

          {/* Result */}
          {twistComparisonComplete && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                The turntable reduced temperature variation by {Math.max(0, noTurntableVariance - withTurntableVariance).toFixed(1)}C!
              </p>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
            <button
              onClick={startComparison}
              disabled={twistComparisonRunning}
              style={{
                ...primaryButtonStyle,
                opacity: twistComparisonRunning ? 0.5 : 1,
                cursor: twistComparisonRunning ? 'not-allowed' : 'pointer',
              }}
            >
              {twistComparisonComplete ? 'Run Again' : 'Start Comparison'}
            </button>
            <button
              onClick={resetComparison}
              disabled={twistComparisonRunning}
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.textSecondary,
                fontWeight: 600,
                cursor: twistComparisonRunning ? 'not-allowed' : 'pointer',
              }}
            >
              Reset
            </button>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Solution
          </button>
        </div>

        {renderNavDots()}
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
            The Turntable Solution
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔄</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Moving Through Fixed Pattern</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                The turntable doesn't change the standing wave pattern - it moves the <strong>food</strong> through it! Every part of the food rotates through both hot spots (antinodes) and cold spots (nodes) over time.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📊</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Time Averaging</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Over a full rotation, each food position spends equal time in hot and cold zones. The result is <strong>averaged heating</strong> - much more uniform than stationary food!
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🛠️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Alternative: Mode Stirrers</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Some commercial microwaves use rotating metal "mode stirrers" instead. These reflect the waves in changing directions, effectively moving the hot spots instead of the food!
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💡</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Marshmallow Experiment</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Remove the turntable, place marshmallows across the floor, and microwave briefly. The melted spots reveal the standing wave pattern! Measure the distance between them to calculate wavelength.
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

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

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
                    ✓
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
                How Standing Waves Connect:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
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

        {renderNavDots()}
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
                ? 'You understand standing wave physics!'
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
          {renderNavDots()}
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

        {renderNavDots()}
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
          Standing Wave Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how microwaves create hot spots and cold spots through standing wave interference.
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
              'Standing waves form from wave interference',
              'Antinodes = hot spots (maximum amplitude)',
              'Nodes = cold spots (zero amplitude)',
              'Spacing between hot spots = lambda/2',
              'Turntables move food through the pattern',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
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

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default MicrowaveStandingWaveRenderer;
