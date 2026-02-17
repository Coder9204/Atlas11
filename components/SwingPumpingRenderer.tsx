'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Swing Pumping - Complete 10-Phase Game
// The physics of how you pump a swing higher without being pushed
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

interface SwingPumpingRendererProps {
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
    scenario: "A child on a playground swing wants to go higher without anyone pushing. They've been told to 'pump' the swing but don't know the exact timing.",
    question: "When should they stand up (raise their center of mass) to maximize energy gain?",
    options: [
      { id: 'a', label: "When passing through the lowest point of the swing" },
      { id: 'b', label: "At the highest points (extremes) of the swing arc", correct: true },
      { id: 'c', label: "Continuously throughout the entire swing motion" },
      { id: 'd', label: "Only when moving in the forward direction" }
    ],
    explanation: "Standing up at the extremes (highest points) of the swing adds energy most efficiently. Angular momentum is conserved: when you shorten the pendulum (stand up), angular velocity increases to keep L = I*omega constant."
  },
  {
    scenario: "A physics student is explaining swing pumping to their younger sibling. They want to explain why changing body position adds energy.",
    question: "What fundamental principle explains why shortening the pendulum increases angular velocity?",
    options: [
      { id: 'a', label: "Conservation of linear momentum (p = mv)" },
      { id: 'b', label: "Conservation of angular momentum (L = I*omega)", correct: true },
      { id: 'c', label: "Newton's third law of action-reaction" },
      { id: 'd', label: "Conservation of total energy alone" }
    ],
    explanation: "Angular momentum L = I*omega is conserved. When moment of inertia I decreases (standing up shortens the pendulum), angular velocity omega must increase proportionally."
  },
  {
    scenario: "An engineer is designing a parametric oscillator for a radio receiver. They need to add energy to a resonating circuit by varying a parameter.",
    question: "At what frequency should they vary the circuit parameter for optimal energy transfer?",
    options: [
      { id: 'a', label: "At the natural frequency of oscillation (1x)" },
      { id: 'b', label: "At twice the natural frequency (2x)", correct: true },
      { id: 'c', label: "At half the natural frequency (0.5x)" },
      { id: 'd', label: "Frequency doesn't matter for parametric pumping" }
    ],
    explanation: "Parametric pumping works optimally at twice the natural frequency because you need to add energy twice per cycle - once at each extreme of oscillation."
  },
  {
    scenario: "A researcher studies a child who just learned to pump a swing. Despite no physics training, the child naturally discovered the correct timing.",
    question: "How did the child learn the correct pumping phase without understanding the physics?",
    options: [
      { id: 'a', label: "Children have innate physics intuition from birth" },
      { id: 'b', label: "Trial and error reinforces the timing that adds energy", correct: true },
      { id: 'c', label: "Adults unconsciously teach them the correct timing" },
      { id: 'd', label: "Swing sets are designed to enforce correct pumping" }
    ],
    explanation: "Children learn through trial and error. Correct timing feels rewarding (swing goes higher), while wrong timing feels frustrating (swing slows down)."
  },
  {
    scenario: "A mischievous child decides to do the opposite of normal pumping: squatting at the extremes and standing at the bottom.",
    question: "What happens to the swing's amplitude with this reversed timing?",
    options: [
      { id: 'a', label: "The swing speeds up more slowly than normal pumping" },
      { id: 'b', label: "The swing loses energy and amplitude decreases", correct: true },
      { id: 'c', label: "Nothing changes - timing doesn't affect energy transfer" },
      { id: 'd', label: "The swing becomes unstable and motion becomes chaotic" }
    ],
    explanation: "Wrong timing removes energy instead of adding it - parametric damping. By doing work against the natural motion, you systematically extract energy from the oscillation."
  },
  {
    scenario: "A surfer is pumping their board on a wave to maintain speed. They're applying the same physics as swing pumping.",
    question: "When should the surfer shift their weight to add the most energy to their motion?",
    options: [
      { id: 'a', label: "Shift weight forward on the downward part, backward on upward part", correct: true },
      { id: 'b', label: "Keep weight centered at all times for maximum stability" },
      { id: 'c', label: "Shift weight randomly to create unpredictable motion" },
      { id: 'd', label: "Lean forward continuously to fight gravity" }
    ],
    explanation: "Surfboard pumping follows the same phase relationship as swing pumping. Weight shifts must be timed with the wave's oscillation to add energy at the right phase of each pump cycle."
  },
  {
    scenario: "An earthquake engineer is studying why some buildings collapsed while neighbors survived. Both buildings were similar height and construction.",
    question: "How might parametric resonance explain the selective collapse?",
    options: [
      { id: 'a', label: "The collapsed buildings were older and weaker" },
      { id: 'b', label: "Ground motion matched the building's natural frequency, amplifying oscillation", correct: true },
      { id: 'c', label: "Random variation in earthquake intensity between buildings" },
      { id: 'd', label: "Different soil conditions beneath each building" }
    ],
    explanation: "When earthquake frequency matches a building's natural frequency, parametric resonance can dramatically amplify oscillations. Engineers tune building frequencies to avoid common earthquake frequencies."
  },
  {
    scenario: "A quantum physicist is using parametric amplification to boost weak signals from a qubit. They need to understand the limits of amplification.",
    question: "What fundamentally limits how much you can pump a swing (or any oscillator)?",
    options: [
      { id: 'a', label: "The swing can only reach 90 degrees from vertical" },
      { id: 'b', label: "Energy losses per cycle eventually equal energy added by pumping", correct: true },
      { id: 'c', label: "Human legs can only push with limited force" },
      { id: 'd', label: "The swing chains reach maximum tension" }
    ],
    explanation: "In any real oscillator, damping removes energy each cycle. Maximum amplitude is reached when energy added by pumping equals energy lost to air resistance and friction."
  },
  {
    scenario: "A skateboard enthusiast notices that pumping on a half-pipe feels very similar to pumping a swing.",
    question: "Why are these two actions physically equivalent?",
    options: [
      { id: 'a', label: "Both involve moving legs up and down" },
      { id: 'b', label: "Both use timed center-of-mass changes to add energy to pendulum-like motion", correct: true },
      { id: 'c', label: "Both require pushing against a surface" },
      { id: 'd', label: "They're not equivalent - one uses gravity, one uses momentum" }
    ],
    explanation: "Both swing pumping and half-pipe pumping are parametric oscillations where you change the effective pendulum length at the right phase to add energy."
  },
  {
    scenario: "A MEMS (microelectromechanical systems) designer is building a tiny oscillator that uses parametric pumping to sustain vibration with minimal power.",
    question: "Why is parametric pumping preferred over direct driving for this application?",
    options: [
      { id: 'a', label: "Parametric pumping requires no electronics" },
      { id: 'b', label: "Parametric pumping adds energy only at resonance, rejecting noise at other frequencies", correct: true },
      { id: 'c', label: "Direct driving is impossible at the microscale" },
      { id: 'd', label: "Parametric pumping is easier to manufacture" }
    ],
    explanation: "Parametric amplifiers only add energy at specific phase relationships, naturally filtering out noise at other frequencies. Ideal for precision timing and sensing applications."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🔬',
    title: 'Parametric Amplifiers',
    short: 'Amplifying signals by pumping parameters',
    tagline: 'When changing conditions creates gain',
    description: 'Parametric amplifiers boost weak signals by periodically varying a circuit parameter like capacitance. The same physics that pumps a swing high applies to amplifying radio and quantum signals with 20dB of gain and noise temperatures near 0.5K.',
    connection: 'Just as pumping a swing at twice its natural frequency adds energy, parametric amplifiers pump a circuit parameter at twice the signal frequency to achieve gain without adding noise.',
    howItWorks: "A varactor diode's capacitance is modulated by a pump signal at 2f. Energy transfers from pump to signal. In quantum systems, Josephson junctions provide parametric amplification near the quantum limit.",
    stats: [
      { value: '20dB', label: 'Typical gain', icon: '📈' },
      { value: '0.5K', label: 'Quantum noise temp', icon: '❄️' },
      { value: '10GHz', label: 'Operating frequency', icon: '📡' }
    ],
    examples: ['Radio telescopes', 'Quantum computing readout', 'Radar receivers', 'Satellite communications'],
    companies: ['Low Noise Factory', 'Quantum Microwave', 'CalTech', 'IBM Quantum'],
    futureImpact: 'Quantum-limited parametric amplifiers will enable readout of millions of qubits needed for practical quantum computers.',
    color: '#8B5CF6'
  },
  {
    icon: '🛸',
    title: 'Space Tethers',
    short: 'Orbital maneuvers through momentum transfer',
    tagline: 'Climbing to orbit on a rope',
    description: 'Space tethers can change spacecraft orbits by exchanging momentum, similar to how a swinging person transfers energy. Electrodynamic tethers interact with Earth\'s magnetic field for propulsion, achieving 1km/s of delta-V with 90% fuel savings.',
    connection: 'A rotating tether system acts like a giant swing. Timing the release of a payload at the right phase can boost or lower orbits, applying parametric resonance principles to orbital mechanics.',
    howItWorks: 'Rotating tethers spin to create centrifugal force. Payloads attach at one end, released at the top of rotation for a velocity boost. Electrodynamic tethers push against the magnetic field using induced current.',
    stats: [
      { value: '10km', label: 'Typical tether length', icon: '📏' },
      { value: '1km/s', label: 'Delta-V possible', icon: '🚀' },
      { value: '90%', label: 'Fuel savings potential', icon: '⛽' }
    ],
    examples: ['Orbital debris removal', 'Moon cargo delivery', 'Deorbit systems', 'Inter-orbital transfer'],
    companies: ['Tethers Unlimited', 'NASA', 'ESA', 'JAXA'],
    futureImpact: 'Spinning tether systems could dramatically reduce the cost of reaching orbit and enable affordable Mars missions.',
    color: '#3B82F6'
  },
  {
    icon: '⚡',
    title: 'MEMS Oscillators',
    short: 'Timing devices through mechanical resonance',
    tagline: 'Microscopic pendulums keeping time',
    description: 'MEMS oscillators use tiny mechanical structures vibrating at precise frequencies for timing in electronics. Parametric excitation helps maintain these oscillations with 1ppm frequency accuracy at just 1uW power consumption operating up to 100MHz.',
    connection: 'MEMS resonators behave like miniature pendulums or swings. Parametric pumping at twice the resonant frequency sustains oscillation while filtering out noise at other frequencies.',
    howItWorks: 'Silicon microstructures resonate at MHz frequencies. Electrostatic actuation drives motion. Parametric excitation modulates spring constant. Phase-locked loops maintain frequency accuracy.',
    stats: [
      { value: '100MHz', label: 'Frequency range', icon: '🎵' },
      { value: '1ppm', label: 'Frequency accuracy', icon: '🎯' },
      { value: '1uW', label: 'Power consumption', icon: '🔋' }
    ],
    examples: ['Smartphone timing', 'IoT sensors', 'Wearable devices', 'Automotive electronics'],
    companies: ['SiTime', 'Analog Devices', 'Microchip', 'Murata'],
    futureImpact: 'Parametrically pumped MEMS will enable atomic-clock-like accuracy in consumer devices.',
    color: '#F59E0B'
  },
  {
    icon: '🌊',
    title: 'Wave Energy Converters',
    short: 'Harvesting ocean energy through resonance',
    tagline: 'Riding the waves for power',
    description: 'Wave energy devices use parametric resonance to efficiently extract power from ocean waves. Tuning the device to resonate with wave frequencies maximizes energy capture, with the global wave power potential of 2TW and 30% capture efficiency per device.',
    connection: 'Like pumping a swing in time with its motion, wave energy converters tune their natural frequency to match dominant wave periods. Parametric resonance amplifies the response.',
    howItWorks: 'Floating buoys or oscillating water columns resonate with wave periods. Power take-off systems convert mechanical motion to electricity. Active tuning adjusts to changing sea states.',
    stats: [
      { value: '2TW', label: 'Global wave power', icon: '🌊' },
      { value: '30%', label: 'Capture efficiency', icon: '📊' },
      { value: '100kW', label: 'Per device output', icon: '⚡' }
    ],
    examples: ['Pelamis wave farm', 'Oscillating buoys', 'Overtopping devices', 'Oscillating water columns'],
    companies: ['Ocean Power Technologies', 'Wello', 'CorPower', 'Carnegie Clean Energy'],
    futureImpact: 'Parametrically tuned wave farms will provide reliable baseload renewable energy to coastal communities.',
    color: '#10B981'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const SwingPumpingRenderer: React.FC<SwingPumpingRendererProps> = ({ onGameEvent, gamePhase }) => {
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

  // Swing simulation state
  const [swingAngle, setSwingAngle] = useState(0.3);
  const [swingVelocity, setSwingVelocity] = useState(0);
  const [swingLength, setSwingLength] = useState(1.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [maxAmplitude, setMaxAmplitude] = useState(0.3);
  const [pumpMode, setPumpMode] = useState<'none' | 'correct' | 'wrong'>('none');
  const [pumpPhase, setPumpPhase] = useState<'up' | 'down' | 'idle'>('idle');

  // Twist phase - timing comparison
  const [pumpFrequency, setPumpFrequency] = useState(2.0);

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

  // Physics constants
  const g = 9.81;
  const baseLength = 1.5;
  const pumpAmount = 0.2;

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Physics simulation
  useEffect(() => {
    if (!isPlaying) return;

    const dt = 0.016;
    const interval = setInterval(() => {
      setTime(t => t + dt);

      setSwingAngle(prevAngle => {
        let newLength = baseLength;
        let newPumpPhase: 'up' | 'down' | 'idle' = 'idle';

        if (pumpMode === 'correct') {
          if (Math.abs(prevAngle) > 0.7 * Math.abs(maxAmplitude)) {
            newLength = baseLength - pumpAmount;
            newPumpPhase = 'up';
          } else if (Math.abs(prevAngle) < 0.3 * Math.abs(maxAmplitude)) {
            newLength = baseLength + pumpAmount;
            newPumpPhase = 'down';
          }
        } else if (pumpMode === 'wrong') {
          if (Math.abs(prevAngle) > 0.7 * Math.abs(maxAmplitude)) {
            newLength = baseLength + pumpAmount;
            newPumpPhase = 'down';
          } else if (Math.abs(prevAngle) < 0.3 * Math.abs(maxAmplitude)) {
            newLength = baseLength - pumpAmount;
            newPumpPhase = 'up';
          }
        }

        setPumpPhase(newPumpPhase);
        setSwingLength(newLength);

        const lengthRatio = swingLength / newLength;
        const adjustedVelocity = swingVelocity * lengthRatio * lengthRatio;
        const alpha = -(g / newLength) * Math.sin(prevAngle);
        const damping = 0.002;
        const newVelocity = adjustedVelocity * (1 - damping) + alpha * dt;
        const newAngle = prevAngle + newVelocity * dt;

        setSwingVelocity(newVelocity);

        if (Math.abs(newAngle) > maxAmplitude) {
          setMaxAmplitude(Math.abs(newAngle));
        }

        return newAngle;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [isPlaying, pumpMode, maxAmplitude, swingLength, swingVelocity, g, baseLength, pumpAmount]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setTime(0);
    setIsPlaying(false);
    setMaxAmplitude(0.3);
    setSwingAngle(0.3);
    setSwingVelocity(0);
    setSwingLength(baseLength);
    setPumpPhase('idle');
  }, [baseLength]);

  // Calculate energy
  const getEnergy = () => {
    const m = 1;
    const v = swingLength * swingVelocity;
    const KE = 0.5 * m * v * v;
    const PE = m * g * swingLength * (1 - Math.cos(swingAngle));
    return { KE, PE, total: KE + PE };
  };

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#EC4899',
    accentGlow: 'rgba(236, 72, 153, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(148,163,184,0.7)',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    swing: '#F59E0B',
    person: '#3B82F6',
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
    hook: 'Explore',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore Twist',
    twist_review: 'Deep Insight',
    transfer: 'Apply',
    test: 'Quiz',
    mastery: 'Transfer'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'swing-pumping',
        gameTitle: 'Swing Pumping',
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

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  const currentIndex = phaseOrder.indexOf(phase);

  // Swing Visualization SVG Component
  const SwingVisualization = ({ interactive = false, showFormula = false }: { interactive?: boolean; showFormula?: boolean }) => {
    const width = 480;
    const height = 380;
    const pivotY = 60;
    const scale = 100;

    const displayLength = swingLength * scale;
    const seatX = width / 2 + displayLength * Math.sin(swingAngle);
    const seatY = pivotY + displayLength * Math.cos(swingAngle);

    const isStanding = pumpPhase === 'up';
    const personHeight = isStanding ? 55 : 38;

    const energy = getEnergy();
    const maxPossibleEnergy = energy.total * 3;
    const energyPercent = Math.min(100, 100 * energy.total / maxPossibleEnergy);
    const angleInDegrees = swingAngle * 180 / Math.PI;
    const maxAngleDegrees = maxAmplitude * 180 / Math.PI;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          style={{ background: colors.bgCard, borderRadius: '12px', maxHeight: '380px' }}
        >
          <defs>
            <linearGradient id="swingSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0c1929" />
              <stop offset="50%" stopColor="#1a2f4a" />
              <stop offset="100%" stopColor="#0a1628" />
            </linearGradient>
            <linearGradient id="swingFrameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#5a6a7d" />
              <stop offset="100%" stopColor="#2d3a4a" />
            </linearGradient>
            <linearGradient id="swingChainGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#71717a" />
              <stop offset="50%" stopColor="#d4d4d8" />
              <stop offset="100%" stopColor="#71717a" />
            </linearGradient>
            <linearGradient id="swingSeatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
            <linearGradient id="swingShirtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>
            <radialGradient id="swingSkinGrad" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#f59e0b" />
            </radialGradient>
            <linearGradient id="swingEnergyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#6ee7b7" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <filter id="swingGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width={width} height={height} fill="url(#swingSkyGrad)" />

          {/* Grid lines */}
          <line x1={width/2} y1={pivotY} x2={width/2} y2={height-45} stroke="#ffffff" strokeOpacity="0.3" strokeDasharray="4 4" strokeWidth="1" />

          {/* Title */}
          <text x={width / 2} y="22" textAnchor="middle" fill="#FFFFFF" fontSize="14" fontWeight="600">
            Swing Pumping Simulation
          </text>

          {/* Frame structure */}
          <g>
            <polygon
              points={`${width / 2 - 8},${pivotY - 5} ${width / 2 - 70},${pivotY + 40} ${width / 2 - 60},${pivotY + 40}`}
              fill="url(#swingFrameGrad)" stroke="#64748b" strokeWidth="1"
            />
            <polygon
              points={`${width / 2 + 8},${pivotY - 5} ${width / 2 + 70},${pivotY + 40} ${width / 2 + 60},${pivotY + 40}`}
              fill="url(#swingFrameGrad)" stroke="#64748b" strokeWidth="1"
            />
            <rect x={width / 2 - 80} y={pivotY + 33} width={160} height={10} rx={3} fill="url(#swingFrameGrad)" />
            <ellipse cx={width / 2} cy={pivotY} rx={10} ry={6} fill="#334155" stroke="#475569" strokeWidth="1.5" />
          </g>

          {/* Chains */}
          <line x1={width / 2 - 10} y1={pivotY} x2={seatX - 10} y2={seatY - 3} stroke="url(#swingChainGrad)" strokeWidth="3" />
          <line x1={width / 2 + 10} y1={pivotY} x2={seatX + 10} y2={seatY - 3} stroke="url(#swingChainGrad)" strokeWidth="3" />

          {/* Seat and person */}
          <g transform={`translate(${seatX}, ${seatY})`}>
            <ellipse cx={0} cy={height - seatY - 30} rx={25 + Math.abs(swingAngle) * 10} ry={6} fill="rgba(0,0,0,0.3)" />
            <rect x={-18} y={-4} width={36} height={8} rx={3} fill="url(#swingSeatGrad)" />
            <rect x={-9} y={-personHeight + 18} width={7} height={personHeight - 16} rx={3} fill="#334155" />
            <rect x={2} y={-personHeight + 18} width={7} height={personHeight - 16} rx={3} fill="#334155" />
            <ellipse cx={-5} cy={2} rx={5} ry={3} fill="#1e293b" />
            <ellipse cx={5} cy={2} rx={5} ry={3} fill="#1e293b" />
            <rect x={-11} y={-personHeight - 6} width={22} height={26} rx={5} fill="url(#swingShirtGrad)" />
            <line x1={-9} y1={-personHeight} x2={-12} y2={-personHeight - 22} stroke="url(#swingSkinGrad)" strokeWidth={4} strokeLinecap="round" />
            <line x1={9} y1={-personHeight} x2={12} y2={-personHeight - 22} stroke="url(#swingSkinGrad)" strokeWidth={4} strokeLinecap="round" />
            <circle cx={-12} cy={-personHeight - 24} r={3} fill="url(#swingSkinGrad)" />
            <circle cx={12} cy={-personHeight - 24} r={3} fill="url(#swingSkinGrad)" />
            <circle cx={0} cy={-personHeight - 18} r={10} fill="url(#swingSkinGrad)" filter="url(#swingGlow)" />
            <ellipse cx={0} cy={-personHeight - 25} rx={8} ry={5} fill="#451a03" />
            <circle cx={-3} cy={-personHeight - 19} r={1.2} fill="#1e293b" />
            <circle cx={3} cy={-personHeight - 19} r={1.2} fill="#1e293b" />
            <path d={`M -2 ${-personHeight - 14} Q 0 ${-personHeight - 12} 2 ${-personHeight - 14}`} fill="none" stroke="#92400e" strokeWidth="1.2" />
          </g>

          {/* Pump indicator */}
          {pumpPhase !== 'idle' && (
            <g transform={`translate(${seatX + 50}, ${seatY - personHeight - 10})`}>
              <rect x={-32} y={-10} width={64} height={20} rx={5}
                fill={pumpPhase === 'up' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(245, 158, 11, 0.9)'}
                filter="url(#swingGlow)"
              />
              <text x={0} y={5} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                {pumpPhase === 'up' ? '^ STAND' : 'v SQUAT'}
              </text>
            </g>
          )}

          {/* Ground */}
          <rect x={0} y={height - 45} width={width} height={45} fill="#1e293b" />
          <ellipse cx={width / 2} cy={height - 45} rx={100} ry={12} fill="#334155" />

          {/* Stats panel */}
          <g transform={`translate(15, ${height - 40})`}>
            <rect x={0} y={0} width={160} height={35} rx={6} fill="rgba(15, 23, 42, 0.9)" stroke="#334155" />
            <text x={10} y={12} fill="#9CA3AF" fontSize="11" fontWeight="bold">ENERGY</text>
            <rect x={10} y={16} width={65} height={10} rx={4} fill="rgba(255,255,255,0.1)" />
            <rect x={10} y={16} width={Math.max(5, 65 * energyPercent / 100)} height={10} rx={4} fill="url(#swingEnergyGrad)" />
            <text x={85} y={12} fill="#9CA3AF" fontSize="11" fontWeight="bold">AMPLITUDE</text>
            <rect x={85} y={16} width={65} height={10} rx={4} fill="rgba(255,255,255,0.1)" />
            <rect x={85} y={16} width={Math.max(5, Math.min(65, maxAngleDegrees * 1.3))} height={10} rx={4} fill="#EC4899" />
          </g>

          {/* Angle display */}
          <g transform={`translate(${width - 100}, ${height - 40})`}>
            <rect x={0} y={0} width={85} height={35} rx={6} fill="rgba(15, 23, 42, 0.9)" stroke="#334155" />
            <text x={10} y={14} fill="#9CA3AF" fontSize="11">
              Angle: <tspan fill="#FFFFFF" fontWeight="bold">{angleInDegrees.toFixed(1)}°</tspan>
            </text>
            <text x={10} y={28} fill="#9CA3AF" fontSize="11">
              Max: <tspan fill="#EC4899" fontWeight="bold">{maxAngleDegrees.toFixed(0)}°</tspan>
            </text>
          </g>

          {/* Formula overlay */}
          {showFormula && (
            <g>
              <rect x={10} y={35} width={200} height={22} rx={4} fill="rgba(0,0,0,0.7)" />
              <text x={20} y={50} fill="#F59E0B" fontSize="13" fontWeight="bold">
                L = I·ω = constant (angular momentum)
              </text>
            </g>
          )}
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => {
                playSound('click');
                setIsPlaying(!isPlaying);
              }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isPlaying ? colors.error : colors.success,
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={() => {
                playSound('click');
                resetSimulation();
              }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  // Progress bar component (fixed top)
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
      padding: '8px 0',
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

  // Bottom navigation bar (fixed, with Back and Next)
  const renderBottomNav = (onNext?: () => void, nextLabel?: string, nextDisabled?: boolean) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: colors.bgCard,
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 100,
    }}>
      <button
        onClick={() => { playSound('click'); goBack(); }}
        disabled={currentIndex === 0}
        style={{
          padding: '10px 20px',
          borderRadius: '8px',
          border: `1px solid ${currentIndex === 0 ? colors.border : colors.accent}`,
          background: 'transparent',
          color: currentIndex === 0 ? colors.textMuted : colors.accent,
          fontWeight: 600,
          cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
          opacity: currentIndex === 0 ? 0.5 : 1,
        }}
      >
        ← Back
      </button>

      {renderNavDots()}

      <button
        onClick={() => {
          if (!nextDisabled) {
            playSound('success');
            if (onNext) onNext();
            else nextPhase();
          }
        }}
        disabled={nextDisabled}
        style={{
          padding: '10px 20px',
          borderRadius: '8px',
          border: 'none',
          background: nextDisabled
            ? colors.border
            : `linear-gradient(135deg, ${colors.accent}, #BE185D)`,
          color: 'white',
          fontWeight: 600,
          cursor: nextDisabled ? 'not-allowed' : 'pointer',
          opacity: nextDisabled ? 0.5 : 1,
        }}
      >
        {nextLabel || 'Next →'}
      </button>
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #BE185D)`,
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

  // Slider style
  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '20px',
    borderRadius: '4px',
    cursor: 'pointer',
    accentColor: '#3b82f6',
    WebkitAppearance: 'none',
    touchAction: 'pan-y',
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
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px 100px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'swing 2s ease-in-out infinite',
          }}>
            🎢
          </div>
          <style>{`@keyframes swing { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Swing Pumping
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
          }}>
            "How do you go <span style={{ color: colors.accent }}>higher and higher</span> on a swing without anyone pushing? The secret lies in precise timing and a beautiful physics principle called <span style={{ color: colors.warning }}>parametric resonance</span>."
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
              "Every child learns to pump a swing - stand, squat, stand, squat. But why does this work? No one pushes you, yet you go higher and higher! The same physics powers quantum amplifiers and orbital mechanics."
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
              - The Hidden Physics of Everyday Motion
            </p>
          </div>

          <button
            onClick={() => { playSound('click'); nextPhase(); }}
            style={primaryButtonStyle}
          >
            Discover the Physics
          </button>
        </div>

        {renderBottomNav(nextPhase, 'Discover →')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: "Stand up at any time - timing doesn't matter" },
      { id: 'b', text: 'Stand up when passing through the lowest point' },
      { id: 'c', text: 'Stand up at the highest points (extremes) of the swing', correct: true },
      { id: 'd', text: "Pumping doesn't work - you need someone to push you" },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
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
              To pump a swing higher, when should you stand up (raise your center of mass)?
            </h2>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <SwingVisualization interactive={false} showFormula={false} />
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '12px' }}>
                Watch the swing oscillate. When would standing up add the most energy?
              </p>
            </div>

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
          </div>
        </div>

        {renderBottomNav(nextPhase, 'Test My Prediction →', !prediction)}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Swing Pumping Experiment
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Test different pumping strategies and observe how angular momentum L = I·ω changes amplitude.
              When moment of inertia I decreases (standing up), angular velocity ω must increase.
            </p>

            {/* Educational explanation */}
            <div style={{
              background: `${colors.accent}11`,
              border: `1px solid ${colors.accent}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 700 }}>
                What This Visualization Shows:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                The pendulum animation shows how body position timing affects swing amplitude.
                <strong style={{ color: colors.textPrimary }}> Correct timing (stand at extremes)</strong> adds energy each cycle.
                <strong style={{ color: colors.error }}> Wrong timing (stand at bottom)</strong> removes energy.
                This demonstrates parametric resonance - real-world applications include quantum amplifiers, MEMS oscillators, and wave energy converters.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <SwingVisualization interactive={true} showFormula={true} />

              {/* Comparison: Before/After - Pump mode selector */}
              <div style={{ marginTop: '20px' }}>
                <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>
                  Pumping Strategy (Before vs After - compare amplitude change):
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[
                    { mode: 'none' as const, label: 'No Pumping', color: colors.textMuted },
                    { mode: 'correct' as const, label: 'Correct Timing (adds energy)', color: colors.success },
                    { mode: 'wrong' as const, label: 'Wrong Timing (removes energy)', color: colors.error },
                  ].map(({ mode, label, color }) => (
                    <button
                      key={mode}
                      onClick={() => {
                        playSound('click');
                        setPumpMode(mode);
                        resetSimulation();
                      }}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '8px',
                        border: `2px solid ${pumpMode === mode ? color : colors.border}`,
                        background: pumpMode === mode ? `${color}22` : colors.bgSecondary,
                        color: pumpMode === mode ? color : colors.textSecondary,
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frequency ratio slider */}
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>
                    Pump Frequency Ratio (optimal = 2x natural frequency)
                  </span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                    {pumpFrequency.toFixed(1)}x natural
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={pumpFrequency}
                  onChange={(e) => {
                    setPumpFrequency(parseFloat(e.target.value));
                    playSound('click');
                  }}
                  style={sliderStyle}
                />
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>
                  Cause &amp; Effect: Higher pump frequency ratio = more energy input per unit time.
                  At 2x natural frequency, each oscillation cycle receives two energy boosts (at both extremes).
                </p>
              </div>

              {/* Current state info */}
              <div style={{
                background: `${colors.accent}22`,
                padding: '12px 16px',
                borderRadius: '8px',
                marginTop: '16px',
                borderLeft: `3px solid ${colors.accent}`,
              }}>
                <p style={{ ...typo.small, color: colors.textPrimary, margin: 0 }}>
                  Time: {time.toFixed(1)}s |{' '}
                  {pumpMode === 'correct' && 'Angular momentum transferred! Amplitude growing (L = I·ω conserved).'}
                  {pumpMode === 'wrong' && 'Energy extracted! Amplitude shrinking (parametric damping).'}
                  {pumpMode === 'none' && 'Natural oscillation with slight air resistance damping.'}
                </p>
              </div>
            </div>

            {/* Key physics terms */}
            <div style={{
              background: `${colors.warning}11`,
              border: `1px solid ${colors.warning}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.h3, color: colors.warning, marginBottom: '8px' }}>Key Physics Terms:</h4>
              <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
                <li><strong style={{ color: colors.textPrimary }}>Angular Momentum (L = I·ω)</strong> - conserved quantity for rotating systems</li>
                <li><strong style={{ color: colors.textPrimary }}>Moment of Inertia (I)</strong> - resistance to angular acceleration (decreases when you stand up)</li>
                <li><strong style={{ color: colors.textPrimary }}>Parametric Resonance</strong> - energy input by varying a system parameter at 2x natural frequency</li>
                <li><strong style={{ color: colors.textPrimary }}>Parametric Damping</strong> - energy extraction via wrong-phase parameter variation</li>
              </ul>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <h4 style={{ ...typo.h3, color: colors.success, marginBottom: '8px' }}>Real-World Relevance:</h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                The same parametric resonance principle powers quantum amplifiers (IBM Quantum), MEMS oscillators in your smartphone (SiTime), and wave energy converters. Understanding swing pumping unlocks the physics behind multi-billion dollar industries.
              </p>
            </div>
          </div>
        </div>

        {renderBottomNav(nextPhase, 'Understand Physics →')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'c';

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
            {/* Connect to prediction */}
            <div style={{
              background: wasCorrect ? `${colors.success}22` : `${colors.error}22`,
              border: `1px solid ${wasCorrect ? colors.success : colors.error}`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>{wasCorrect ? '✓' : '✗'}</div>
              <h3 style={{ ...typo.h3, color: wasCorrect ? colors.success : colors.error }}>
                {wasCorrect ? 'Your prediction was correct!' : 'Your prediction was not quite right!'}
              </h3>
              <p style={{ ...typo.body, color: colors.textPrimary }}>
                {wasCorrect
                  ? 'You correctly predicted: stand at the highest points (extremes)!'
                  : 'As you saw in the experiment: you should stand at the highest points (extremes)!'}
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, marginTop: '8px' }}>
                The observation confirms: correct phase timing adds energy each cycle, as your prediction {wasCorrect ? 'correctly identified' : 'did not quite capture'}.
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              The Physics of Swing Pumping
            </h2>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Angular Momentum Conservation (L = I × omega)</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  When you stand up (shorten the pendulum), moment of inertia I decreases. To conserve angular momentum L = I·ω = constant, angular velocity omega must <span style={{ color: colors.success }}>increase</span> - you speed up!
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Why at the Extremes?</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  At the extremes, you have maximum potential energy. Standing up converts some gravitational PE into kinetic energy. At the bottom, you already have max KE - squatting stores energy for the next pump.
                </p>
                <p>
                  <strong style={{ color: colors.textPrimary }}>Parametric Resonance</strong>: You change a parameter (pendulum length) at <span style={{ color: colors.accent }}>twice the natural frequency</span> to add energy each cycle.
                </p>
              </div>
            </div>

            <div style={{
              background: `${colors.warning}11`,
              border: `1px solid ${colors.warning}33`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '8px' }}>
                Key Formula
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary, fontFamily: 'monospace' }}>
                L = I × ω = m × r² × ω = constant
              </p>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
                When r decreases (stand up), ω must increase proportionally!
              </p>
            </div>
          </div>
        </div>

        {renderBottomNav(nextPhase, 'Explore the Twist →')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: "The swing still speeds up, just more slowly" },
      { id: 'b', text: "The swing slows down and loses energy", correct: true },
      { id: 'c', text: "Nothing changes - timing doesn't matter" },
      { id: 'd', text: "The swing becomes unstable and chaotic" },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Variable: What If Timing Is Reversed?
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              What happens if you pump with exactly WRONG timing? (Squat at extremes, stand at bottom)
            </h2>

            {/* Graphic without sliders */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <svg viewBox="0 0 400 200" width="100%" style={{ maxHeight: '200px' }}>
                <rect width="400" height="200" fill="#0f172a" rx="8" />
                <text x="200" y="30" textAnchor="middle" fill="#F59E0B" fontSize="14" fontWeight="bold">
                  Correct vs Wrong Timing
                </text>
                {/* Correct timing arc */}
                <path d="M 60 150 Q 100 80 140 50 Q 180 20 200 50 Q 220 80 240 100" fill="none" stroke="#10B981" strokeWidth="3" />
                <text x="200" y="170" textAnchor="middle" fill="#10B981" fontSize="12">Correct: energy grows</text>
                {/* Wrong timing arc */}
                <path d="M 260 80 Q 290 90 310 100 Q 330 110 340 130" fill="none" stroke="#EF4444" strokeWidth="3" strokeDasharray="5 3" />
                <text x="300" y="165" textAnchor="middle" fill="#EF4444" fontSize="12">Wrong: energy lost</text>
                <line x1="0" y1="155" x2="400" y2="155" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              </svg>
              <p style={{ ...typo.small, color: colors.textMuted, marginTop: '12px' }}>
                Instead of: Stand at extremes, squat at bottom (correct)
              </p>
              <p style={{ ...typo.small, color: colors.warning, marginTop: '4px' }}>
                Try: Squat at extremes, stand at bottom (reversed)
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
          </div>
        </div>

        {renderBottomNav(nextPhase, 'Test Wrong Timing →', !twistPrediction)}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Compare Correct vs Wrong Timing
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Observe how phase relationship determines energy flow. L = I·ω governs both cases.
            </p>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <SwingVisualization interactive={true} showFormula={true} />

              {/* Pump mode selector */}
              <div style={{ marginTop: '20px' }}>
                <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '12px' }}>
                  Compare Timing Strategies (before vs after):
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[
                    { mode: 'correct' as const, label: 'Correct (adds energy)', color: colors.success },
                    { mode: 'wrong' as const, label: 'Wrong (removes energy)', color: colors.error },
                  ].map(({ mode, label, color }) => (
                    <button
                      key={mode}
                      onClick={() => {
                        playSound('click');
                        setPumpMode(mode);
                        resetSimulation();
                      }}
                      style={{
                        padding: '12px 20px',
                        borderRadius: '8px',
                        border: `2px solid ${pumpMode === mode ? color : colors.border}`,
                        background: pumpMode === mode ? `${color}22` : 'transparent',
                        color: pumpMode === mode ? color : colors.textSecondary,
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frequency slider - modifies SVG visualization */}
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>Pump Frequency Ratio</span>
                  <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{pumpFrequency.toFixed(1)}x natural</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={pumpFrequency}
                  onChange={(e) => {
                    setPumpFrequency(parseFloat(e.target.value));
                    playSound('click');
                  }}
                  style={sliderStyle}
                />
                <p style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>
                  Optimal: 2x (pump twice per oscillation cycle). Drag slider to see amplitude change in the swing above.
                </p>
              </div>
            </div>

            <div style={{
              background: `${colors.warning}22`,
              border: `1px solid ${colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <h4 style={{ ...typo.h3, color: colors.warning, marginBottom: '8px' }}>Key Observation</h4>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Wrong timing systematically removes energy - this is <strong>parametric damping</strong>.
                The same principle is used in vibration control systems!
              </p>
            </div>
          </div>
        </div>

        {renderBottomNav(nextPhase, 'Deep Physics →')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'b';

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
            <div style={{
              background: wasCorrect ? `${colors.success}22` : `${colors.error}22`,
              border: `1px solid ${wasCorrect ? colors.success : colors.error}`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>{wasCorrect ? '✓' : '✗'}</div>
              <h3 style={{ ...typo.h3, color: wasCorrect ? colors.success : colors.error }}>
                {wasCorrect ? 'Correct!' : 'Not Quite!'}
              </h3>
              <p style={{ ...typo.body, color: colors.textPrimary }}>
                Wrong timing causes the swing to lose energy and slow down!
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Parametric Damping & Phase Sensitivity
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px', color: colors.accent }}>⟳</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Phase Matters Critically</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  When you do work <span style={{ color: colors.error }}>against</span> the natural motion instead of with it, you systematically remove energy. This is why children quickly learn the correct timing - wrong timing feels "off" because you're fighting the swing!
                </p>
              </div>

              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px', color: colors.success }}>↓</span>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Parametric Damping</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Engineers use this principle intentionally in vibration control. By changing stiffness at the <span style={{ color: colors.success }}>right phase</span>, they can remove unwanted oscillations from buildings, bridges, and machines.
                </p>
              </div>

              <div style={{
                background: `${colors.success}11`,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.success}33`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px', color: colors.success, fontWeight: 'bold' }}>2×</span>
                  <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>The 2x Frequency Rule</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Optimal parametric pumping occurs at <strong>twice</strong> the natural frequency - you add energy twice per oscillation (once at each extreme). This is universal: swings, quantum amplifiers, MEMS oscillators all follow this rule.
                </p>
              </div>
            </div>
          </div>
        </div>

        {renderBottomNav(nextPhase, 'Real-World Applications →')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);
    const completedCount = completedApps.filter(Boolean).length;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              App {selectedApp + 1} of {realWorldApps.length} — {completedCount} of {realWorldApps.length} explored
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
              marginBottom: '16px',
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
                  Connection to Swing Pumping:
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

              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '16px', fontStyle: 'italic' }}>
                Future impact: {app.futureImpact}
              </p>

              {/* Got It button for this app */}
              <button
                onClick={() => {
                  playSound('success');
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp] = true;
                  setCompletedApps(newCompleted);
                  // Move to next app or show completion
                  if (selectedApp < realWorldApps.length - 1) {
                    setSelectedApp(selectedApp + 1);
                    newCompleted[selectedApp + 1] = true;
                    setCompletedApps([...newCompleted]);
                  }
                }}
                style={{
                  ...primaryButtonStyle,
                  background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                  width: '100%',
                }}
              >
                Got It! Next App →
              </button>
            </div>

            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Take the Knowledge Test →
              </button>
            )}
          </div>
        </div>

        {renderBottomNav(nextPhase, 'Knowledge Test →', !allAppsCompleted)}
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
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {renderProgressBar()}

          <div style={{
            flex: 1,
            overflowY: 'auto',
            paddingTop: '48px',
            paddingBottom: '100px',
          }}>
            <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '24px' }}>
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
                  ? 'You understand parametric resonance and swing pumping!'
                  : 'Review the concepts and try again.'}
              </p>

              {/* Answer review - per-question breakdown */}
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
                textAlign: 'left',
                maxHeight: '400px',
                overflowY: 'auto',
              }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
                  Question Review:
                </h3>
                {testQuestions.map((q, i) => {
                  const correctId = q.options.find(o => o.correct)?.id;
                  const userAnswer = testAnswers[i];
                  const isCorrect = userAnswer === correctId;
                  return (
                    <div key={i} style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: isCorrect ? `${colors.success}11` : `${colors.error}11`,
                      border: `1px solid ${isCorrect ? colors.success : colors.error}33`,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}>
                      <span style={{
                        fontSize: '18px',
                        minWidth: '24px',
                        color: isCorrect ? colors.success : colors.error,
                        fontWeight: 'bold',
                      }}>
                        {isCorrect ? '✓' : '✗'}
                      </span>
                      <div>
                        <p style={{ ...typo.small, color: colors.textPrimary, margin: '0 0 4px', fontWeight: 600 }}>
                          Q{i + 1}: {q.question.substring(0, 80)}...
                        </p>
                        <p style={{ ...typo.small, color: isCorrect ? colors.success : colors.error, margin: 0 }}>
                          {isCorrect ? 'Correct' : `Correct answer: ${correctId?.toUpperCase()}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {passed ? (
                  <button
                    onClick={() => { playSound('complete'); nextPhase(); }}
                    style={primaryButtonStyle}
                  >
                    Complete Lesson →
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
                  Return to Dashboard
                </button>
              </div>
            </div>
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
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
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
        overflow: 'hidden',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '48px',
          paddingBottom: '100px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '48px 24px 100px',
        }}>
          <div style={{
            fontSize: '100px',
            marginBottom: '24px',
            animation: 'bounce 1s infinite',
          }}>
            🏆
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Swing Pumping Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand parametric resonance - the physics behind swings, quantum amplifiers, and orbital mechanics!
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '400px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              Key Concepts Mastered:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'Angular momentum conservation (L = I × ω)',
                'Parametric resonance at 2x natural frequency',
                'Correct phase timing adds energy',
                'Wrong phase causes parametric damping',
                'Applications from playgrounds to quantum computing',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>✓</span>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
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
        </div>

        {renderBottomNav()}
      </div>
    );
  }

  return null;
};

export default SwingPumpingRenderer;
