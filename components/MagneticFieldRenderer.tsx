'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ════════════════════════════════════════════════════════════════════════════
// MAGNETIC FIELDS - Field Lines, Forces, and Current Sources
// ════════════════════════════════════════════════════════════════════════════
// Core Physics:
// - B = μ₀I/(2πr) for long straight wire (Biot-Savart simplified)
// - B = μ₀nI for solenoid (n = turns per length)
// - F = qv × B (Lorentz force on moving charge)
// - F = BIL sin(θ) (force on current-carrying wire)
// - Right-hand rule for field direction
// ════════════════════════════════════════════════════════════════════════════

// Real-world applications for magnetic fields
const realWorldApps = [
  {
    icon: '🏥',
    title: 'MRI Medical Imaging',
    short: 'Magnetic resonance imaging for diagnosis',
    tagline: 'See inside the body without radiation',
    description: 'MRI machines use powerful superconducting magnets (1.5-7 Tesla) to align hydrogen atoms in body tissue. Radio pulses flip these atoms, and the magnetic field detects their return signal, creating detailed 3D images of soft tissue, brain, and organs.',
    connection: 'MRI relies on the Lorentz force and magnetic field interactions you explored. The solenoid field equation B = μ₀nI determines the main field strength, while gradient coils use F = BIL forces to spatially encode position.',
    howItWorks: 'Superconducting coils create uniform 1.5-3T field. RF pulses excite hydrogen nuclei. Gradient coils (using F = BIL) encode spatial information. Relaxation signals are detected and reconstructed into images.',
    stats: [
      { value: '40M+', label: 'MRI scans per year (US)', icon: '🏥' },
      { value: '$8B', label: 'MRI equipment market', icon: '📈' },
      { value: '0.1mm', label: 'Spatial resolution', icon: '🔬' }
    ],
    examples: ['Brain tumor detection', 'Cardiac imaging', 'Orthopedic diagnosis', 'Neurological research'],
    companies: ['Siemens Healthineers', 'GE Healthcare', 'Philips', 'Canon Medical'],
    futureImpact: '7T ultra-high-field MRI will enable visualization of individual neural pathways, revolutionizing brain research and early Alzheimer\'s detection.',
    color: '#3b82f6'
  },
  {
    icon: '🚄',
    title: 'Maglev Transportation',
    short: 'Magnetic levitation trains',
    tagline: 'Floating at 600 km/h on magnetic fields',
    description: 'Maglev trains use powerful electromagnets to levitate above the track, eliminating friction. The Lorentz force F = qv × B propels the train forward, while magnetic field gradients provide stable levitation and guidance without physical contact.',
    connection: 'The magnetic force F = BIL sin(θ) on current-carrying rails demonstrates the same physics used to accelerate maglev trains. Understanding field direction via the right-hand rule is essential for designing stable levitation.',
    howItWorks: 'Superconducting or electromagnetic coils create repulsive/attractive forces for levitation. Linear motors use traveling magnetic waves to propel trains. Active control systems adjust currents for stability.',
    stats: [
      { value: '603km/h', label: 'Speed record (Japan)', icon: '🚀' },
      { value: '30km', label: 'Longest commercial line', icon: '📏' },
      { value: '0', label: 'Wheel friction', icon: '⚡' }
    ],
    examples: ['Shanghai Maglev', 'Japan Chuo Shinkansen', 'Hyperloop concepts', 'Urban people movers'],
    companies: ['Central Japan Railway', 'CRRC', 'Transrapid', 'Virgin Hyperloop'],
    futureImpact: 'Vacuum tube maglev (Hyperloop) could achieve 1000+ km/h, making cross-country travel faster than flying.',
    color: '#8b5cf6'
  },
  {
    icon: '⚡',
    title: 'Electric Motors & Generators',
    short: 'Converting electricity and motion',
    tagline: 'The force that moves the world',
    description: 'Every electric motor uses F = BIL - the force on a current-carrying wire in a magnetic field. From tiny computer fans to massive industrial drives, this fundamental interaction converts electrical energy to mechanical motion (and vice versa in generators).',
    connection: 'The interactive simulation showed how F = BIL sin(θ) depends on field strength, current, and angle. Motors optimize this by using radial magnetic fields and commutation to maintain maximum torque throughout rotation.',
    howItWorks: 'Permanent magnets or electromagnets create radial field. Current through rotor windings experiences F = BIL force. Commutator or inverter switches current direction to maintain rotation. Generators reverse the process.',
    stats: [
      { value: '45%', label: 'Of global electricity to motors', icon: '⚡' },
      { value: '$175B', label: 'Electric motor market', icon: '📈' },
      { value: '97%', label: 'Best motor efficiency', icon: '🎯' }
    ],
    examples: ['Electric vehicles', 'Industrial drives', 'HVAC systems', 'Wind turbines'],
    companies: ['Tesla', 'Siemens', 'ABB', 'Nidec'],
    futureImpact: 'Axial flux motors with halbach arrays will double EV range by achieving >98% efficiency in compact packages.',
    color: '#22c55e'
  },
  {
    icon: '💾',
    title: 'Data Storage Technology',
    short: 'Magnetic recording in hard drives',
    tagline: 'Trillions of tiny magnets storing data',
    description: 'Hard disk drives store data as magnetic domains - tiny regions magnetized in one of two directions representing 0s and 1s. Read/write heads use the Biot-Savart law to create precise magnetic fields that flip these domains, achieving densities of 1 terabit per square inch.',
    connection: 'The field from a current-carrying wire (B = μ₀I/2πr) is the basis for write heads. The closer the head gets to the disk, the stronger and more localized the field, enabling higher storage density.',
    howItWorks: 'Write head creates localized magnetic field from current pulse. Field magnetizes tiny grain on disk surface. Read head detects stray field from magnetized regions. Giant magnetoresistance (GMR) amplifies tiny signals.',
    stats: [
      { value: '20TB', label: 'Current HDD capacity', icon: '💾' },
      { value: '1Tb/in²', label: 'Areal density', icon: '🔬' },
      { value: '$65B', label: 'Storage market', icon: '📈' }
    ],
    examples: ['Data centers', 'Cloud storage', 'Surveillance systems', 'Archival storage'],
    companies: ['Seagate', 'Western Digital', 'Toshiba', 'Samsung'],
    futureImpact: 'Heat-assisted magnetic recording (HAMR) will push densities to 10 Tb/in², enabling 100TB drives by 2030.',
    color: '#f59e0b'
  }
];

// Phase type - 10 phases per spec
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

// GameEvent interface
export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
             'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
             'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
             'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected' |
             'coach_prompt' | 'guide_paused' | 'guide_resumed' | 'question_changed' | 'app_completed' | 'app_changed';
  gameType: string;
  gameTitle: string;
  details: {
    phase?: string;
    phaseLabel?: string;
    currentScreen?: number;
    totalScreens?: number;
    screenDescription?: string;
    prediction?: string;
    predictionLabel?: string;
    answer?: string;
    isCorrect?: boolean;
    score?: number;
    maxScore?: number;
    message?: string;
    coachMessage?: string;
    [key: string]: unknown;
  };
  timestamp: number;
}

interface TestQuestion {
  scenario: string;
  question: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  howItWorks: string[];
  stats: { value: string; label: string }[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}

interface Props {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
    oscillator.type = sound.type;
    oscillator.frequency.setValueAtTime(sound.freq, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch {
    // Audio not available
  }
};

const MagneticFieldRenderer: React.FC<Props> = ({ onGameEvent, gamePhase }) => {
  // Phase labels and descriptions
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const screenDescriptions: Record<Phase, string> = {
    hook: 'INTRO SCREEN: Title "Magnetic Fields", animated field visualization, Start button.',
    predict: 'PREDICTION SCREEN: User predicts field shape around a current-carrying wire.',
    play: 'EXPERIMENT SCREEN: Interactive simulation with wire, solenoid, and field lines.',
    review: 'REVIEW SCREEN: Explains right-hand rule, B = μ₀I/2πr formula.',
    twist_predict: 'TWIST PREDICTION: What happens when you wrap wire into a coil?',
    twist_play: 'ELECTROMAGNET EXPERIMENT: Interactive electromagnet with adjustable current and coils.',
    twist_review: 'ELECTROMAGNET REVIEW: Explains how electromagnets work and why they\'re controllable.',
    transfer: 'REAL WORLD APPLICATIONS: Electric Motors, MRI Machines, Maglev Trains, Speakers.',
    test: 'KNOWLEDGE TEST: 10 scenario-based questions about magnetic fields.',
    mastery: 'COMPLETION SCREEN: Summary of magnetic field concepts mastered.'
  };

  const coachMessages: Record<Phase, string> = {
    hook: "Welcome! Magnetic fields are invisible forces created by moving charges.",
    predict: "Think about what pattern the field might form around a wire with current...",
    play: "Adjust the current and see how the magnetic field responds!",
    review: "The right-hand rule helps us predict field direction every time!",
    twist_predict: "Here's a twist - what if we coil the wire?",
    twist_play: "Watch how more coils and more current create a stronger electromagnet!",
    twist_review: "Electromagnets can be turned on and off - that's their superpower!",
    transfer: "Magnetic fields power motors, speakers, MRI machines, and maglev trains!",
    test: "Test your understanding with these challenging scenarios!",
    mastery: "Congratulations! You've mastered magnetic fields!"
  };

  // State
  const [phase, setPhase] = useState<Phase>(() => {
    const vp: Phase[] = ['hook','predict','play','review','twist_predict','twist_play','twist_review','transfer','test','mastery'];
    if (gamePhase && vp.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  });
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [confirmedIndex, setConfirmedIndex] = useState<number | null>(null);
  const [testSubmitted, setTestSubmitted] = useState(false);

  useEffect(() => {
    const vp: Phase[] = ['hook','predict','play','review','twist_predict','twist_play','twist_review','transfer','test','mastery'];
    if (gamePhase && vp.includes(gamePhase as Phase)) setPhase(gamePhase as Phase);
  }, [gamePhase]);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppIndex, setActiveAppIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [wireCurrent, setWireCurrent] = useState(5); // Amperes
  const [wireDistance, setWireDistance] = useState(0.05); // meters
  const [fieldAngle, setFieldAngle] = useState(90); // degrees from velocity
  const [selectedDemo, setSelectedDemo] = useState<'wire' | 'solenoid'>('wire');
  const [showFieldLines, setShowFieldLines] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);

  // Electromagnet state
  const [electromagnetCurrent, setElectromagnetCurrent] = useState(2); // Amperes
  const [electromagnetCoils, setElectromagnetCoils] = useState(50); // number of turns
  const [showMagneticDomain, setShowMagneticDomain] = useState(false);

  const animationRef = useRef<number | null>(null);
  const hasEmittedStart = useRef(false);

  // Physical constants
  const MU_0 = 4 * Math.PI * 1e-7; // Permeability of free space

  // Check for mobile
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
    if (!isAnimating) return;

    const animate = () => {
      setAnimationTime(prev => (prev + 0.02) % (2 * Math.PI));
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating]);

  // Auto-start animation in hook phase for compass needle
  useEffect(() => {
    if (phase === 'hook') {
      setIsAnimating(true);
    }
  }, [phase]);

  // Emit game events
  const emitEvent = useCallback((eventType: GameEvent['eventType'], details: Partial<GameEvent['details']> = {}) => {
    if (onGameEvent) {
      const phaseIndex = phaseOrder.indexOf(phase);
      onGameEvent({
        eventType,
        gameType: 'magnetic_field',
        gameTitle: 'Magnetic Fields',
        details: {
          phase,
          phaseLabel: phaseLabels[phase],
          currentScreen: phaseIndex + 1,
          totalScreens: 10,
          screenDescription: screenDescriptions[phase],
          coachMessage: coachMessages[phase],
          ...details
        },
        timestamp: Date.now()
      });
    }
  }, [onGameEvent, phase, phaseLabels, screenDescriptions, coachMessages]);

  // Emit start event
  useEffect(() => {
    if (!hasEmittedStart.current) {
      hasEmittedStart.current = true;
      emitEvent('game_started', { message: 'Magnetic Fields game started' });
    }
  }, [emitEvent]);

  // Navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_changed', { phase: newPhase, phaseLabel: phaseLabels[newPhase] });
  }, [emitEvent, phaseLabels]);

  // Calculate magnetic field from straight wire
  const calculateWireField = useCallback((I: number, r: number): number => {
    // B = μ₀I / (2πr)
    if (r <= 0) return 0;
    return (MU_0 * I) / (2 * Math.PI * r);
  }, []);

  // Calculate solenoid field
  const calculateSolenoidField = useCallback((I: number, n: number): number => {
    // B = μ₀nI (n = turns per meter)
    return MU_0 * n * I;
  }, []);

  const handlePrediction = useCallback((prediction: string) => {
    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);
    const isCorrect = prediction === 'C';
    playSound(isCorrect ? 'success' : 'failure');
    emitEvent('prediction_made', { prediction, isCorrect });
  }, [emitEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    setTwistPrediction(prediction);
    setShowTwistFeedback(true);
    const isCorrect = prediction === 'B';
    playSound(isCorrect ? 'success' : 'failure');
    emitEvent('prediction_made', { prediction, isCorrect, message: 'Electromagnet prediction' });
  }, [emitEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    playSound('click');
    emitEvent('answer_submitted', { questionIndex, answerIndex });
  }, [emitEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    emitEvent('app_completed', { appIndex });
  }, [emitEvent]);

  // Test questions with scenarios and explanations
  const testQuestions: TestQuestion[] = [
    {
      scenario: "A physics student places a compass near a wire carrying current upward. The compass needle, initially pointing north, deflects.",
      question: "Which way does the compass needle point relative to the wire?",
      options: [
        { text: "Toward the wire", correct: false },
        { text: "Away from the wire", correct: false },
        { text: "Tangent to a circle around the wire (perpendicular to a radius)", correct: true },
        { text: "Parallel to the wire", correct: false }
      ],
      explanation: "Magnetic field lines around a current-carrying wire form concentric circles. The compass aligns with the local field, which is always tangent to these circles."
    },
    {
      scenario: "An engineer doubles the current in an electromagnet while keeping everything else the same.",
      question: "How does the magnetic field strength change?",
      options: [
        { text: "Stays the same (current doesn't affect field)", correct: false },
        { text: "Doubles (B is proportional to I)", correct: true },
        { text: "Quadruples (B is proportional to I squared)", correct: false },
        { text: "Halves (more current means weaker field)", correct: false }
      ],
      explanation: "The Biot-Savart law shows B = μ₀I/(2πr) for a wire, where B is directly proportional to current I. Double the current means double the field strength."
    },
    {
      scenario: "A proton travels horizontally through a region where the magnetic field points straight up.",
      question: "In which direction does the magnetic force act on the proton?",
      options: [
        { text: "Upward (parallel to B)", correct: false },
        { text: "Downward (opposite to B)", correct: false },
        { text: "Horizontal, perpendicular to both velocity and B", correct: true },
        { text: "Backward, opposing the motion", correct: false }
      ],
      explanation: "The Lorentz force F = qv x B is always perpendicular to both the velocity and the magnetic field. Using the right-hand rule: point fingers along v, curl toward B, thumb points in force direction."
    },
    {
      scenario: "A charged particle enters a uniform magnetic field with velocity perpendicular to the field.",
      question: "What path does the particle follow?",
      options: [
        { text: "Straight line (magnetic fields don't curve paths)", correct: false },
        { text: "Circular arc (constant perpendicular force)", correct: true },
        { text: "Parabola (like projectile motion)", correct: false },
        { text: "Spiral that loses energy", correct: false }
      ],
      explanation: "The magnetic force is always perpendicular to velocity, so it acts as a centripetal force. The result is circular motion. Since the force is always perpendicular to motion, no work is done and speed remains constant."
    },
    {
      scenario: "Two parallel wires carry current in the same direction. Students observe they move toward each other.",
      question: "Why do parallel currents attract?",
      options: [
        { text: "Electric fields from the currents attract", correct: false },
        { text: "Each wire's field exerts a force on the other wire's current", correct: true },
        { text: "Gravitational attraction between the wires", correct: false },
        { text: "This is wrong; parallel currents repel", correct: false }
      ],
      explanation: "Wire 1 creates a magnetic field at Wire 2. The current in Wire 2 experiences F = BIL in this field. By the right-hand rule, this force points toward Wire 1. Parallel currents attract!"
    },
    {
      scenario: "A scientist wraps 1000 turns of wire tightly around a 10 cm tube and passes 2 amperes through it.",
      question: "What has she created?",
      options: [
        { text: "A capacitor storing electric charge", correct: false },
        { text: "A solenoid creating a uniform internal magnetic field", correct: true },
        { text: "A transformer stepping up voltage", correct: false },
        { text: "A generator producing AC current", correct: false }
      ],
      explanation: "A tightly wound coil of wire is a solenoid. Inside, it creates a nearly uniform magnetic field B = μ₀nI, where n is turns per unit length. This is the basis for electromagnets."
    },
    {
      scenario: "An electron moving at 1x10^7 m/s enters a 0.5 T magnetic field at 90 degrees to the field direction.",
      question: "What is the approximate magnitude of the force on the electron?",
      options: [
        { text: "8 x 10^-13 N", correct: true },
        { text: "8 x 10^-19 N", correct: false },
        { text: "1.6 x 10^-19 N", correct: false },
        { text: "5 x 10^6 N", correct: false }
      ],
      explanation: "F = qvB sin(theta) = (1.6x10^-19 C)(1x10^7 m/s)(0.5 T)(sin 90 degrees) = 8x10^-13 N. This tiny force is significant for the low-mass electron."
    },
    {
      scenario: "A bar magnet is suspended and allowed to rotate freely. It settles pointing roughly north-south.",
      question: "What does this tell us about Earth?",
      options: [
        { text: "Earth has an electric field pointing north", correct: false },
        { text: "Earth has its own magnetic field, like a giant bar magnet", correct: true },
        { text: "Gravity is stronger in the north", correct: false },
        { text: "The magnet is attracted to geographic north by electrostatics", correct: false }
      ],
      explanation: "Earth acts like a giant bar magnet (generated by convection currents in the molten outer core). A compass needle aligns with Earth's field, pointing approximately toward the magnetic poles."
    },
    {
      scenario: "A charged particle moves parallel to a magnetic field (velocity and field in the same direction).",
      question: "What force does it experience?",
      options: [
        { text: "Maximum force (aligned with field)", correct: false },
        { text: "Zero force (sin 0 degrees = 0)", correct: true },
        { text: "Half the maximum force", correct: false },
        { text: "It depends on the charge sign", correct: false }
      ],
      explanation: "The Lorentz force F = qv x B involves the cross product. When v and B are parallel (theta = 0 degrees), sin(0) = 0, so the force is zero. Magnetic forces only act on the component of velocity perpendicular to the field."
    },
    {
      scenario: "MRI machines use magnetic fields of 1.5 to 3 Tesla, while Earth's field is about 50 microtesla.",
      question: "How many times stronger is an MRI field compared to Earth's field?",
      options: [
        { text: "About 30 times stronger", correct: false },
        { text: "About 3,000 times stronger", correct: false },
        { text: "About 30,000 to 60,000 times stronger", correct: true },
        { text: "About the same strength", correct: false }
      ],
      explanation: "MRI field: 1.5 T = 1,500,000 μT. Earth's field: 50 μT. Ratio: 1,500,000/50 = 30,000 times. At 3 T, it's 60,000 times stronger! This extreme field strength is why MRI rooms require special metal-free zones."
    }
  ];

  // Real-world applications
  const applications: TransferApp[] = [
    {
      icon: "M",
      title: "Electric Motors",
      short: "Motors",
      tagline: "Converting electricity into motion",
      description: "Electric motors use magnetic fields to convert electrical energy into rotational motion, powering everything from fans to electric vehicles.",
      connection: "The force F = BIL on current-carrying coils in a magnetic field creates torque, spinning the motor's rotor.",
      howItWorks: [
        "Permanent magnets or electromagnets create a stationary magnetic field (stator)",
        "Current flows through wire coils on the rotating part (rotor)",
        "The magnetic force on the current creates torque",
        "Commutator or electronics reverse current to maintain rotation",
        "Continuous rotation converts electrical to mechanical energy"
      ],
      stats: [
        { value: "95%", label: "Efficiency of modern motors" },
        { value: "10M+", label: "EVs with electric motors worldwide" },
        { value: "1-1000", label: "Horsepower range" },
        { value: "50-60 Hz", label: "Typical AC motor frequency" }
      ],
      examples: [
        "Electric vehicle drivetrains",
        "Industrial pumps and fans",
        "Household appliances",
        "Power tools and drills"
      ],
      companies: ["Tesla", "Siemens", "ABB", "Nidec"],
      futureImpact: "High-efficiency motors with rare-earth magnets are revolutionizing transportation and reducing global energy consumption.",
      color: "from-yellow-600 to-orange-600"
    },
    {
      icon: "H",
      title: "MRI Machines",
      short: "MRI",
      tagline: "Seeing inside the body without radiation",
      description: "Magnetic Resonance Imaging uses powerful magnetic fields to align hydrogen atoms in the body, then detects signals as they return to equilibrium.",
      connection: "The superconducting electromagnet creates a uniform field 30,000+ times stronger than Earth's, causing proton spins to align predictably for imaging.",
      howItWorks: [
        "Superconducting coils create a powerful, uniform magnetic field (1.5-7 Tesla)",
        "Hydrogen protons in body tissue align with the field",
        "Radio pulses temporarily disturb this alignment",
        "As protons relax back, they emit detectable radio signals",
        "Signal patterns reveal tissue structure with millimeter precision"
      ],
      stats: [
        { value: "3 T", label: "Typical clinical field strength" },
        { value: "$3M", label: "Cost of one MRI machine" },
        { value: "40M+", label: "MRI scans per year in US" },
        { value: "0.1 mm", label: "Best resolution achievable" }
      ],
      examples: [
        "Brain tumor detection",
        "Spinal cord injury assessment",
        "Joint and soft tissue imaging",
        "Cardiac function analysis"
      ],
      companies: ["Siemens Healthineers", "GE Healthcare", "Philips", "Canon Medical"],
      futureImpact: "Ultra-high-field 7T MRI is enabling visualization of individual brain cell layers, while portable low-field MRI could bring imaging to ambulances.",
      color: "from-blue-600 to-cyan-600"
    },
    {
      icon: "T",
      title: "Maglev Trains",
      short: "Maglev",
      tagline: "Flying on magnetic cushions",
      description: "Magnetic levitation trains float above their tracks using powerful magnetic fields, eliminating friction and enabling speeds over 600 km/h.",
      connection: "Superconducting magnets on the train interact with track coils through the Lorentz force, creating both levitation and propulsion without physical contact.",
      howItWorks: [
        "Superconducting magnets on train create strong persistent currents",
        "Moving magnets induce currents in track coils (Faraday's law)",
        "Induced currents create magnetic fields opposing the train's magnets",
        "Repulsive force lifts the train 10-15 cm above the guideway",
        "Linear motor propulsion pushes the train forward using alternating fields"
      ],
      stats: [
        { value: "603 km/h", label: "World record speed (Japan)" },
        { value: "10 cm", label: "Levitation height" },
        { value: "500 km", label: "Tokyo-Osaka Chuo Shinkansen" },
        { value: "85%", label: "Energy efficiency vs. air travel" }
      ],
      examples: [
        "Shanghai Maglev (430 km/h commercial)",
        "Japan SCMaglev (test runs)",
        "Inductrack passive levitation",
        "Hyperloop magnetic suspension concepts"
      ],
      companies: ["JR Central", "CRRC", "Transrapid", "Virgin Hyperloop"],
      futureImpact: "Combining maglev with vacuum tubes (hyperloop) could achieve near-supersonic ground transport, revolutionizing intercity travel.",
      color: "from-purple-600 to-indigo-600"
    },
    {
      icon: "S",
      title: "Speakers & Headphones",
      short: "Speakers",
      tagline: "Converting electricity to sound",
      description: "Every speaker and dynamic microphone uses the force on a current-carrying coil in a magnetic field to convert between electrical signals and sound waves.",
      connection: "The force F = BIL on the voice coil in the permanent magnet's field moves the cone, creating pressure waves. Microphones work in reverse.",
      howItWorks: [
        "Permanent magnet creates a strong radial magnetic field",
        "Voice coil wrapped around cylindrical core sits in this field",
        "Audio current flows through coil, creating force F = BIL",
        "Force moves the coil and attached speaker cone",
        "Cone motion creates sound pressure waves in air"
      ],
      stats: [
        { value: "1 T", label: "Typical speaker magnet field" },
        { value: "20-20k Hz", label: "Human hearing range" },
        { value: "90 dB", label: "High-efficiency speaker output" },
        { value: "1%", label: "Electrical to acoustic efficiency" }
      ],
      examples: [
        "Home audio speakers",
        "Headphones and earbuds",
        "PA and concert systems",
        "Dynamic microphones (SM58, etc.)"
      ],
      companies: ["JBL", "Bose", "Shure", "Sennheiser"],
      futureImpact: "Planar magnetic and electrostatic technologies offer improved fidelity, while bone conduction speakers use alternative magnetic configurations.",
      color: "from-emerald-600 to-teal-600"
    }
  ];

  const calculateScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  };

  // Calculate current field values
  const currentField = calculateWireField(wireCurrent, wireDistance);
  const solenoidField = calculateSolenoidField(electromagnetCurrent, electromagnetCoils / 0.1); // 10cm length

  // Render magnetic field visualization for wire
  const renderFieldVisualization = (width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;

    return (
      <>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="mx-auto">
          <defs>
            {/* Premium copper wire gradient with metallic sheen */}
            <linearGradient id="magfWireCopper" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="25%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="75%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>

            {/* Wire core gradient showing current */}
            <radialGradient id="magfWireCore" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="40%" stopColor="#fcd34d" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </radialGradient>

            {/* Magnetic field line gradient - blue with intensity falloff */}
            <linearGradient id="magfFieldLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
              <stop offset="25%" stopColor="#60a5fa" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.7" />
              <stop offset="75%" stopColor="#60a5fa" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.9" />
            </linearGradient>

            {/* Test point glow gradient */}
            <radialGradient id="magfTestPoint" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0.5" />
            </radialGradient>

            {/* Background gradient for lab environment */}
            <linearGradient id="magfLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Arrow gradient for field direction */}
            <linearGradient id="magfArrow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>

            {/* Glow filter for field lines */}
            <filter id="magfFieldGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glow filter for wire */}
            <filter id="magfWireGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glow filter for test point */}
            <filter id="magfTestGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Current flow indicator glow */}
            <radialGradient id="magfCurrentGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width={width} height={height} fill="url(#magfLabBg)" rx="8" />

          {/* Test point with glow - y offset shows field strength response to current */}
          <circle cx={centerX + wireDistance * 1500} cy={centerY - wireCurrent * 3} r="8" fill="url(#magfTestPoint)" filter="url(#magfTestGlow)" />

          {/* Wire cross-section with premium gradient and glow */}
          <circle cx={centerX} cy={centerY} r="20" fill="url(#magfCurrentGlow)" filter="url(#magfWireGlow)" />
          <circle cx={centerX} cy={centerY} r="15" fill="url(#magfWireCore)" stroke="url(#magfWireCopper)" strokeWidth="3" />
          <text x={centerX} y={centerY + 5} textAnchor="middle" fill="#78350f" fontSize="14" fontWeight="bold">X</text>

          {/* Concentric field lines with glow */}
          {showFieldLines && [30, 50, 70, 90, 110].map((r, i) => {
            const fieldStrength = 1 / (r / 30);
            const glowIntensity = fieldStrength > 0.6 ? "url(#magfFieldGlow)" : undefined;
            return (
              <g key={i}>
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={r}
                  fill="none"
                  stroke="url(#magfFieldLine)"
                  strokeWidth={2 * fieldStrength}
                  strokeDasharray={r > 70 ? "8 4" : "none"}
                  opacity={0.5 + 0.4 * fieldStrength}
                  filter={glowIntensity}
                />
                {/* Field direction arrows (clockwise for current into page) */}
                {[0, 90, 180, 270].map((angle, j) => {
                  const arrowX = centerX + r * Math.cos((angle + animationTime * 30) * Math.PI / 180);
                  const arrowY = centerY + r * Math.sin((angle + animationTime * 30) * Math.PI / 180);
                  const tangentAngle = angle + 90 + animationTime * 30;
                  return (
                    <g key={j} transform={`translate(${arrowX}, ${arrowY}) rotate(${tangentAngle})`}>
                      <path d="M-6,0 L6,0 M3,-3 L6,0 L3,3" stroke="url(#magfArrow)" strokeWidth="2" fill="none" filter="url(#magfFieldGlow)" />
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Grid reference lines */}
          <line x1={40} y1={centerY} x2={width - 40} y2={centerY} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
          <line x1={centerX} y1={40} x2={centerX} y2={height - 50} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />

          {/* Distance line */}
          <line
            x1={centerX + 20}
            y1={centerY + 35}
            x2={centerX + wireDistance * 1500}
            y2={centerY + 35}
            stroke="#64748b"
            strokeWidth="1"
            strokeDasharray="4 2"
          />

          {/* Right-hand rule reminder */}
          <g transform={`translate(${width - 75}, ${height - 55})`}>
            <rect x="0" y="0" width="65" height="50" fill="#1e293b" stroke="#334155" strokeWidth="1" rx="6" />
          </g>

          {/* Educational labels */}
          <text x={centerX} y={20} textAnchor="middle" fill="#93c5fd" fontSize="11" fontWeight="bold">Magnetic Field Lines</text>
          <text x={centerX + wireDistance * 1500} y={centerY - wireCurrent * 3 - 14} textAnchor="middle" fill="#4ade80" fontSize="11">Test Point</text>
          <text x={centerX} y={centerY + 40} textAnchor="middle" fill="#fbbf24" fontSize="11">Current-Carrying Wire</text>

          {/* Formula box with current value */}
          <rect x="10" y={height - 45} width="180" height="35" fill="#0f172a" stroke="#334155" strokeWidth="1" rx="6" />
          <text x="100" y={height - 22} textAnchor="middle" fill="#f8fafc" fontSize="12" fontFamily="monospace">
            B = u0*{wireCurrent.toFixed(1)}A / (2pr)
          </text>
        </svg>

        {/* Labels outside SVG using typo system */}
        <div className="flex justify-between items-start mt-2 px-2" style={{ fontSize: typo.small }}>
          <div className="text-cyan-400">
            Current: {wireCurrent.toFixed(1)} A (into page)
          </div>
          <div className="text-emerald-400">
            B = {(currentField * 1e6).toFixed(1)} uT at r = {(wireDistance * 100).toFixed(1)} cm
          </div>
        </div>

        {/* Right-hand rule label */}
        <div className="flex justify-end mt-1 px-2" style={{ fontSize: typo.label }}>
          <div className="text-center bg-slate-700/50 px-2 py-1 rounded">
            <div className="text-slate-400">Right Hand</div>
            <div className="text-emerald-400">Thumb: I</div>
            <div className="text-blue-400">Curl: B</div>
          </div>
        </div>
      </>
    );
  };

  // Render solenoid visualization
  const renderSolenoidVisualization = (width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;

    return (
      <>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="mx-auto">
          <defs>
            {/* Premium copper coil gradient */}
            <linearGradient id="magfSolenoidCoil" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="30%" stopColor="#f59e0b" />
              <stop offset="60%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            {/* Iron core gradient with metallic sheen */}
            <linearGradient id="magfIronCore" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="25%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="75%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* North pole gradient - warm red */}
            <radialGradient id="magfNorthPole" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </radialGradient>

            {/* South pole gradient - cool blue */}
            <radialGradient id="magfSouthPole" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </radialGradient>

            {/* Internal field line gradient */}
            <linearGradient id="magfInternalField" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="30%" stopColor="#60a5fa" />
              <stop offset="70%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.6" />
            </linearGradient>

            {/* Background gradient */}
            <linearGradient id="magfSolenoidBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Coil glow filter */}
            <filter id="magfCoilGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Pole glow filter */}
            <filter id="magfPoleGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Field line glow */}
            <filter id="magfFieldLineGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width={width} height={height} fill="url(#magfSolenoidBg)" rx="8" />

          {/* Iron core with metallic gradient */}
          <g transform={`translate(${centerX - 80}, ${centerY - 30})`}>
            <rect x="0" y="15" width="160" height="30" fill="url(#magfIronCore)" rx="4" opacity="0.8" />

            {/* Solenoid coils with premium copper gradient */}
            {Array.from({ length: 10 }).map((_, i) => (
              <ellipse
                key={i}
                cx={i * 16 + 8}
                cy="30"
                rx="10"
                ry="28"
                fill="none"
                stroke="url(#magfSolenoidCoil)"
                strokeWidth="3"
                filter="url(#magfCoilGlow)"
              />
            ))}
          </g>

          {/* Internal field lines with glow */}
          {showFieldLines && [-15, 0, 15].map((offset, i) => (
            <g key={i}>
              <line
                x1={centerX - 70}
                y1={centerY + offset}
                x2={centerX + 70}
                y2={centerY + offset}
                stroke="url(#magfInternalField)"
                strokeWidth="3"
                filter="url(#magfFieldLineGlow)"
              />
              {/* Arrows */}
              <polygon
                points={`${centerX + 60},${centerY + offset - 6} ${centerX + 72},${centerY + offset} ${centerX + 60},${centerY + offset + 6}`}
                fill="#ef4444"
                filter="url(#magfFieldLineGlow)"
              />
            </g>
          ))}

          {/* External field (curved) with glow */}
          {showFieldLines && (
            <g>
              <path
                d={`M ${centerX + 70} ${centerY - 15} Q ${centerX + 130} ${centerY - 65} ${centerX} ${centerY - 80} Q ${centerX - 130} ${centerY - 65} ${centerX - 70} ${centerY - 15}`}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2"
                strokeDasharray="6 3"
                filter="url(#magfFieldLineGlow)"
                opacity="0.7"
              />
              <path
                d={`M ${centerX + 70} ${centerY + 15} Q ${centerX + 130} ${centerY + 65} ${centerX} ${centerY + 80} Q ${centerX - 130} ${centerY + 65} ${centerX - 70} ${centerY + 15}`}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2"
                strokeDasharray="6 3"
                filter="url(#magfFieldLineGlow)"
                opacity="0.7"
              />
            </g>
          )}

          {/* N and S pole indicators with glow */}
          <circle cx={centerX + 95} cy={centerY} r="18" fill="url(#magfNorthPole)" filter="url(#magfPoleGlow)" opacity="0.6" />
          <text x={centerX + 95} y={centerY + 6} textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">N</text>

          <circle cx={centerX - 95} cy={centerY} r="18" fill="url(#magfSouthPole)" filter="url(#magfPoleGlow)" opacity="0.6" />
          <text x={centerX - 95} y={centerY + 6} textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">S</text>

          {/* Educational labels */}
          <text x={centerX} y={20} textAnchor="middle" fill="#93c5fd" fontSize="11" fontWeight="bold">Solenoid Field</text>
          <text x={centerX} y={centerY - 45} textAnchor="middle" fill="#fbbf24" fontSize="11">Copper Coil Windings</text>
          <text x={width - 10} y={20} textAnchor="end" fill="#a78bfa" fontSize="11">Uniform Interior Field</text>

          {/* Formula box */}
          <rect x="10" y={height - 55} width="170" height="45" fill="#0f172a" stroke="#334155" strokeWidth="1" rx="6" />
          <text x="95" y={height - 35} textAnchor="middle" fill="#f8fafc" fontSize="12" fontFamily="monospace">
            B = u0 * n * I
          </text>
          <text x="95" y={height - 17} textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">
            = {(solenoidField * 1000).toFixed(2)} mT
          </text>
        </svg>

        {/* Label outside SVG using typo system */}
        <div className="text-center mt-2" style={{ fontSize: typo.small }}>
          <span className="text-slate-400">Solenoid: </span>
          <span className="text-amber-400">{Math.round(electromagnetCoils)} turns</span>
          <span className="text-slate-400">, </span>
          <span className="text-cyan-400">{electromagnetCurrent.toFixed(1)} A</span>
        </div>
      </>
    );
  };

  // Render electromagnet visualization for twist phase
  const renderElectromagnetVisualization = (width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const fieldStrength = electromagnetCurrent * electromagnetCoils / 100;

    return (
      <>
        <svg width={width} height={height} className="mx-auto">
          <defs>
            {/* Premium iron core gradient */}
            <linearGradient id="magfElectroCore" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="25%" stopColor="#4b5563" />
              <stop offset="50%" stopColor="#6b7280" />
              <stop offset="75%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* Copper coil gradient - active */}
            <linearGradient id="magfElectroCoilActive" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="25%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#ea580c" />
              <stop offset="75%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>

            {/* Copper coil gradient - inactive */}
            <linearGradient id="magfElectroCoilInactive" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>

            {/* North pole radial gradient */}
            <radialGradient id="magfElectroNorth" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fecaca" />
              <stop offset="40%" stopColor="#f87171" />
              <stop offset="70%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0.8" />
            </radialGradient>

            {/* South pole radial gradient */}
            <radialGradient id="magfElectroSouth" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#bfdbfe" />
              <stop offset="40%" stopColor="#60a5fa" />
              <stop offset="70%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.8" />
            </radialGradient>

            {/* Field line gradient */}
            <linearGradient id="magfElectroField" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
              <stop offset="30%" stopColor="#60a5fa" />
              <stop offset="70%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.5" />
            </linearGradient>

            {/* Power indicator gradient */}
            <linearGradient id="magfPowerBar" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#86efac" />
            </linearGradient>

            {/* Paper clip metallic gradient */}
            <linearGradient id="magfPaperClip" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d1d5db" />
              <stop offset="50%" stopColor="#9ca3af" />
              <stop offset="100%" stopColor="#6b7280" />
            </linearGradient>

            {/* Background gradient */}
            <linearGradient id="magfElectroBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Coil glow filter */}
            <filter id="magfElectroCoilGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Pole glow filter */}
            <filter id="magfElectroPoleGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Field line glow */}
            <filter id="magfElectroFieldGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width={width} height={height} fill="url(#magfElectroBg)" rx="8" />

          {/* Iron core with premium gradient */}
          <rect x={centerX - 65} y={centerY - 22} width="130" height="44" fill="url(#magfElectroCore)" rx="6" stroke="#1e293b" strokeWidth="2" />

          {/* Coils visualization with gradient */}
          <g transform={`translate(${centerX - 60}, ${centerY - 38})`}>
            {Array.from({ length: Math.min(Math.round(electromagnetCoils / 10), 12) }).map((_, i) => (
              <rect
                key={i}
                x={i * 10}
                y="0"
                width="8"
                height="76"
                fill="none"
                stroke={electromagnetCurrent > 0 ? "url(#magfElectroCoilActive)" : "url(#magfElectroCoilInactive)"}
                strokeWidth="3"
                rx="3"
                filter={electromagnetCurrent > 0 ? "url(#magfElectroCoilGlow)" : undefined}
              />
            ))}
          </g>

          {/* Magnetic field lines (proportional to strength) with glow */}
          {electromagnetCurrent > 0 && showFieldLines && Array.from({ length: Math.min(Math.round(fieldStrength), 5) }).map((_, i) => {
            const offset = (i - 2) * 15;
            return (
              <g key={i}>
                <line
                  x1={centerX - 55}
                  y1={centerY + offset}
                  x2={centerX + 55}
                  y2={centerY + offset}
                  stroke="url(#magfElectroField)"
                  strokeWidth={Math.max(2, 4 - Math.abs(offset) / 8)}
                  opacity={0.9}
                  filter="url(#magfElectroFieldGlow)"
                />
                <polygon
                  points={`${centerX + 50},${centerY + offset - 5} ${centerX + 62},${centerY + offset} ${centerX + 50},${centerY + offset + 5}`}
                  fill="#ef4444"
                  filter="url(#magfElectroFieldGlow)"
                />
              </g>
            );
          })}

          {/* Poles with premium gradients and glow */}
          {electromagnetCurrent > 0 && (
            <>
              <circle cx={centerX + 85} cy={centerY} r="20" fill="url(#magfElectroNorth)" filter="url(#magfElectroPoleGlow)" opacity="0.7" />
              <text x={centerX + 85} y={centerY + 6} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">N</text>
              <circle cx={centerX - 85} cy={centerY} r="20" fill="url(#magfElectroSouth)" filter="url(#magfElectroPoleGlow)" opacity="0.7" />
              <text x={centerX - 85} y={centerY + 6} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">S</text>
            </>
          )}

          {/* Paper clips attracted with metallic gradient */}
          {electromagnetCurrent > 0 && fieldStrength > 0.5 && (
            <g>
              {Array.from({ length: Math.min(Math.round(fieldStrength * 2), 6) }).map((_, i) => (
                <g key={i} transform={`translate(${centerX + 95 + (i % 2) * 18}, ${centerY + 32 + Math.floor(i / 2) * 14})`}>
                  <ellipse rx="7" ry="4" fill="url(#magfPaperClip)" stroke="#9ca3af" strokeWidth="0.5" />
                </g>
              ))}
            </g>
          )}

          {/* Power indicator panel */}
          <rect x={width - 85} y={height - 65} width="75" height="55" fill="#0f172a" stroke="#334155" strokeWidth="1" rx="6" />
          <rect x={width - 80} y={height - 38} width="65" height="10" fill="#1e293b" rx="3" />
          <rect
            x={width - 80}
            y={height - 38}
            width={Math.min(fieldStrength * 13, 65)}
            height="10"
            fill="url(#magfPowerBar)"
            rx="3"
          />
          <text
            x={width - 47}
            y={height - 14}
            textAnchor="middle"
            fill={fieldStrength > 0 ? '#4ade80' : '#64748b'}
            fontSize="12"
            fontWeight="bold"
          >
            {fieldStrength > 0 ? 'ON' : 'OFF'}
          </text>
        </svg>

        {/* Labels outside SVG using typo system */}
        <div className="flex justify-between items-center mt-2 px-2" style={{ fontSize: typo.small }}>
          <div>
            <span className="text-slate-400">Core: </span>
            <span className="text-slate-300">Iron</span>
          </div>
          <div>
            <span className="text-slate-400">Field Strength: </span>
            <span className={fieldStrength > 0 ? 'text-emerald-400' : 'text-slate-500'}>{fieldStrength.toFixed(1)}</span>
          </div>
        </div>
      </>
    );
  };

  // ============================================================
  // PHASE RENDERERS
  // ============================================================

  const renderHook = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#06b6d4' }} />
        <span style={{ color: '#22d3ee', fontSize: '14px', fontWeight: 600 }}>Electromagnetism</span>
      </div>

      <h1 style={{ fontSize: '36px', fontWeight: 800, background: 'linear-gradient(135deg, #22d3ee, #3b82f6, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: '12px' }}>
        Magnetic Fields
      </h1>

      <p style={{ color: 'rgba(148,163,184,1)', fontSize: '18px', fontWeight: 400, marginBottom: '32px', maxWidth: '400px', lineHeight: 1.6 }}>
        The invisible force fields created by moving charges
      </p>

      <div style={{ width: '100%', maxWidth: '400px', backdropFilter: 'blur(20px)', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', marginBottom: '32px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
        <svg width={isMobile ? 280 : 340} height={180} className="mx-auto mb-4">
          <defs>
            {/* Premium bar magnet north pole gradient */}
            <linearGradient id="magfBarNorth" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="25%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="75%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            {/* Premium bar magnet south pole gradient */}
            <linearGradient id="magfBarSouth" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="25%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="75%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* Field line gradient */}
            <linearGradient id="magfHookField" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="30%" stopColor="#a855f7" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#60a5fa" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
            </linearGradient>

            {/* Compass body gradient */}
            <radialGradient id="magfCompass" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </radialGradient>

            {/* Compass needle gradient */}
            <linearGradient id="magfNeedle" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Background gradient */}
            <linearGradient id="magfHookBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#020617" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Glow filter for field lines */}
            <filter id="magfHookFieldGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glow filter for magnet */}
            <filter id="magfMagnetGlow" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Compass needle animation glow */}
            <filter id="magfNeedleGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width={isMobile ? 280 : 340} height="180" fill="url(#magfHookBg)" rx="8" />

          {/* Field lines with glow - curved from N to S */}
          <path
            d={`M ${isMobile ? 90 : 120} 90 Q ${isMobile ? 50 : 70} 40 ${isMobile ? 170 : 200} 90`}
            fill="none"
            stroke="url(#magfHookField)"
            strokeWidth="2.5"
            strokeDasharray="6 3"
            filter="url(#magfHookFieldGlow)"
          />
          <path
            d={`M ${isMobile ? 90 : 120} 90 Q ${isMobile ? 50 : 70} 140 ${isMobile ? 170 : 200} 90`}
            fill="none"
            stroke="url(#magfHookField)"
            strokeWidth="2.5"
            strokeDasharray="6 3"
            filter="url(#magfHookFieldGlow)"
          />
          <path
            d={`M ${isMobile ? 90 : 120} 90 Q ${isMobile ? 30 : 40} 90 ${isMobile ? 90 : 120} 90`}
            fill="none"
            stroke="url(#magfHookField)"
            strokeWidth="2"
            strokeDasharray="4 2"
            filter="url(#magfHookFieldGlow)"
            opacity="0.6"
          />

          {/* Bar magnet with premium gradients and glow */}
          <g filter="url(#magfMagnetGlow)">
            <rect x={isMobile ? 90 : 120} y="68" width="40" height="44" fill="url(#magfBarNorth)" rx="4" stroke="#fecaca" strokeWidth="1" />
            <rect x={isMobile ? 130 : 160} y="68" width="40" height="44" fill="url(#magfBarSouth)" rx="4" stroke="#bfdbfe" strokeWidth="1" />
          </g>
          <text x={isMobile ? 110 : 140} y="95" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">N</text>
          <text x={isMobile ? 150 : 180} y="95" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">S</text>

          {/* Compass with animated needle */}
          <g transform={`translate(${isMobile ? 50 : 60}, 60)`}>
            <circle r="16" fill="url(#magfCompass)" stroke="#64748b" strokeWidth="2" />
            {/* Compass needle with gradient and glow - animated rotation */}
            <g style={{ transform: `rotate(${Math.sin(animationTime * 2) * 15 + 30}deg)`, transformOrigin: 'center' }}>
              <line x1="-10" y1="0" x2="10" y2="0" stroke="url(#magfNeedle)" strokeWidth="4" strokeLinecap="round" filter="url(#magfNeedleGlow)" />
            </g>
            <circle r="3" fill="#94a3b8" />
          </g>

          {/* Additional compass showing field direction */}
          <g transform={`translate(${isMobile ? 230 : 280}, 60)`}>
            <circle r="14" fill="url(#magfCompass)" stroke="#64748b" strokeWidth="2" />
            <g style={{ transform: `rotate(${Math.sin(animationTime * 2 + 1) * 10 - 20}deg)`, transformOrigin: 'center' }}>
              <line x1="-8" y1="0" x2="8" y2="0" stroke="url(#magfNeedle)" strokeWidth="3" strokeLinecap="round" filter="url(#magfNeedleGlow)" />
            </g>
            <circle r="2" fill="#94a3b8" />
          </g>
        </svg>

        {/* Text label outside SVG using typo system */}
        <p className="text-slate-400 text-center mb-4" style={{ fontSize: typo.small }}>
          Compasses reveal invisible field lines
        </p>

        <p className="text-gray-300 text-center leading-relaxed">
          A compass needle always points north... but bring a magnet close and it swings away! What invisible force reaches through space to push and pull?
        </p>
      </div>

      <button onClick={() => goToPhase('predict')} style={{ marginTop: '16px', padding: '16px 32px', background: 'linear-gradient(135deg, #0891b2, #2563eb)', color: 'white', fontSize: '18px', fontWeight: 700, borderRadius: '16px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(6,182,212,0.3)', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '8px' }}>
        Start Exploring →
      </button>

      <p style={{ marginTop: '16px', color: '#64748b', fontSize: '14px' }}>
        Discover how moving charges create magnetic fields
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>

      {/* SVG diagram of wire with compass */}
      <svg width="320" height="200" viewBox="0 0 320 200" style={{ marginBottom: 16 }}>
        <defs>
          <radialGradient id="predictWireGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="predictWireCopper" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>
          <filter id="predictGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Background */}
        <rect width="320" height="200" rx="12" fill="#0f172a" />
        <rect x="2" y="2" width="316" height="196" rx="10" fill="none" stroke="#334155" strokeWidth="1" />
        {/* Wire going up */}
        <line x1="160" y1="180" x2="160" y2="20" stroke="url(#predictWireCopper)" strokeWidth="6" />
        <circle cx="160" cy="100" r="20" fill="url(#predictWireGlow)" />
        {/* Current direction arrow */}
        <polygon points="160,30 155,45 165,45" fill="#fbbf24" />
        <text x="175" y="40" fill="#fbbf24" fontSize="11" fontFamily="sans-serif">I (up)</text>
        {/* Question marks for field pattern */}
        <text x="120" y="80" fill="#60a5fa" fontSize="16" fontFamily="sans-serif" opacity="0.7">?</text>
        <text x="195" y="115" fill="#60a5fa" fontSize="16" fontFamily="sans-serif" opacity="0.7">?</text>
        <text x="130" y="140" fill="#60a5fa" fontSize="16" fontFamily="sans-serif" opacity="0.7">?</text>
        <text x="185" y="75" fill="#60a5fa" fontSize="16" fontFamily="sans-serif" opacity="0.7">?</text>
        {/* Compass nearby */}
        <circle cx="230" cy="100" r="18" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
        <line x1="230" y1="88" x2="225" y2="108" stroke="#ef4444" strokeWidth="2" />
        <line x1="230" y1="88" x2="235" y2="108" stroke="#94a3b8" strokeWidth="2" />
        <text x="222" y="84" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">N</text>
        <circle cx="230" cy="100" r="2" fill="#e2e8f0" />
        {/* Label */}
        <text x="160" y="195" fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="sans-serif">Wire carrying current with nearby compass</text>
      </svg>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A wire carries electric current straight up. A compass is placed nearby. The compass needle deflects from north and points in a new direction.
        </p>
        <p className="text-cyan-400 font-medium">
          What shape do the magnetic field lines around the wire have?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Straight lines parallel to the wire' },
          { id: 'B', text: 'Straight lines radiating outward from the wire' },
          { id: 'C', text: 'Concentric circles around the wire' },
          { id: 'D', text: 'Random, chaotic lines with no pattern' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{ position: 'relative', zIndex: 10 }}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showPredictionFeedback && selectedPrediction === option.id
                ? option.id === 'C'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showPredictionFeedback && option.id === 'C'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! Field lines form <span className="text-cyan-400">concentric circles</span> around the wire!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            This is described by the Biot-Savart Law and can be predicted using the right-hand rule.
          </p>
          <button
            onClick={() => goToPhase('play')}
            style={{ position: 'relative', zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all duration-300"
          >
            Explore the Physics
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Magnetic Field Lab</h2>

      {/* Observation guidance */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', maxWidth: '800px', width: '100%', border: '1px solid #334155' }}>
        <p style={{ color: '#93c5fd', fontSize: '14px', margin: 0 }}>
          Try adjusting the sliders below and observe how the magnetic field strength changes. Experiment with different current values and distances to see the relationship between B, I, and r.
        </p>
        <p style={{ color: '#a5b4fc', fontSize: '13px', margin: '8px 0 0 0' }}>
          When you increase the current, the magnetic field strength increases proportionally. This is important because electric motors, MRI machines, and many real-world technologies rely on controlling magnetic field strength by adjusting current. Understanding these relationships is essential for engineering applications like power generation, medical imaging, and transportation systems.
        </p>
      </div>

      {/* Side-by-side layout: SVG left, Controls right */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px', width: '100%', maxWidth: '800px', alignItems: isMobile ? 'center' : 'flex-start' }}>
        {/* SVG panel */}
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          {/* Demo selector */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => setSelectedDemo('wire')}
              style={{ position: 'relative', zIndex: 10 }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedDemo === 'wire' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              Straight Wire
            </button>
            <button
              onClick={() => setSelectedDemo('solenoid')}
              style={{ position: 'relative', zIndex: 10 }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedDemo === 'solenoid' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              Solenoid
            </button>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', border: '1px solid #334155' }}>
            {selectedDemo === 'wire'
              ? renderFieldVisualization(isMobile ? 320 : 400, isMobile ? 280 : 320)
              : renderSolenoidVisualization(isMobile ? 320 : 400, isMobile ? 280 : 320)
            }
          </div>
        </div>

        {/* Controls panel */}
        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '12px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{ position: 'relative', zIndex: 10 }}
              className={`p-3 rounded-xl font-semibold transition-colors ${
                isAnimating ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'
              } text-white`}
            >
              {isAnimating ? 'Stop' : 'Animate'}
            </button>

            <button
              onClick={() => setShowFieldLines(!showFieldLines)}
              style={{ position: 'relative', zIndex: 10 }}
              className={`p-3 rounded-xl font-medium transition-colors ${
                showFieldLines ? 'bg-cyan-600' : 'bg-slate-600'
              } text-white`}
            >
              Lines: {showFieldLines ? 'ON' : 'OFF'}
            </button>

            {selectedDemo === 'wire' ? (
              <>
                <div className="p-3 bg-slate-700/50 rounded-xl text-center">
                  <div className="text-sm text-slate-400">Current (A)</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(148,163,184,0.7)' }}>
                    <span>Low 1</span><span>Strong 20</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={wireCurrent}
                    onChange={(e) => setWireCurrent(parseFloat(e.target.value))}
                    className="w-full"
                    style={{ width: '100%', height: '20px', accentColor: '#3b82f6', cursor: 'pointer', touchAction: 'pan-y', WebkitAppearance: 'none' }}
                  />
                  <div className="text-cyan-400 font-bold">{wireCurrent.toFixed(1)}</div>
                </div>

                <div className="p-3 bg-slate-700/50 rounded-xl text-center">
                  <div className="text-sm text-slate-400">Distance (cm)</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(148,163,184,0.7)' }}>
                    <span>Min 1</span><span>Max 20</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={wireDistance * 100}
                    onChange={(e) => setWireDistance(parseFloat(e.target.value) / 100)}
                    className="w-full"
                    style={{ width: '100%', height: '20px', accentColor: '#3b82f6', cursor: 'pointer', touchAction: 'pan-y', WebkitAppearance: 'none' }}
                  />
                  <div className="text-cyan-400 font-bold">{(wireDistance * 100).toFixed(1)}</div>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-slate-700/50 rounded-xl text-center">
                  <div className="text-sm text-slate-400">Current (A)</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(148,163,184,0.7)' }}>
                    <span>Low 0.5</span><span>Strong 10</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={electromagnetCurrent}
                    onChange={(e) => setElectromagnetCurrent(parseFloat(e.target.value))}
                    className="w-full"
                    style={{ width: '100%', height: '20px', accentColor: '#3b82f6', cursor: 'pointer', touchAction: 'pan-y', WebkitAppearance: 'none' }}
                  />
                  <div className="text-cyan-400 font-bold">{electromagnetCurrent.toFixed(1)}</div>
                </div>

                <div className="p-3 bg-slate-700/50 rounded-xl text-center">
                  <div className="text-sm text-slate-400">Turns</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(148,163,184,0.7)' }}>
                    <span>Min 10</span><span>Max 200</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="10"
                    value={electromagnetCoils}
                    onChange={(e) => setElectromagnetCoils(parseInt(e.target.value))}
                    className="w-full"
                    style={{ width: '100%', height: '20px', accentColor: '#3b82f6', cursor: 'pointer', touchAction: 'pan-y', WebkitAppearance: 'none' }}
                  />
                  <div className="text-cyan-400 font-bold">{electromagnetCoils}</div>
                </div>
              </>
            )}
          </div>

          {/* Key equations in controls panel */}
          <div style={{ background: 'rgba(30,41,59,0.7)', borderRadius: '12px', padding: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#22d3ee', marginBottom: '8px' }}>Key Equations:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#cbd5e1' }}>
              <div>
                <div className="font-mono text-white bg-slate-700 px-3 py-2 rounded mb-1" style={{ fontSize: '12px' }}>B = u0*I / (2*pi*r)</div>
                <p style={{ margin: 0, fontSize: '11px' }}>Wire field decreases with distance</p>
              </div>
              <div>
                <div className="font-mono text-white bg-slate-700 px-3 py-2 rounded mb-1" style={{ fontSize: '12px' }}>B = u0*n*I</div>
                <p style={{ margin: 0, fontSize: '11px' }}>Solenoid field: turns per length</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => { setIsAnimating(false); goToPhase('review'); }}
        style={{ position: 'relative', zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all duration-300"
      >
        Review the Concepts
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Understanding Magnetic Fields</h2>

      {/* Connect to prediction/observation */}
      <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 rounded-xl p-4 mb-6 max-w-3xl">
        <p className="text-cyan-300 text-sm">
          As you observed in the experiment, the magnetic field forms concentric circles around the wire.
          The correct prediction was that field lines form circles - this is because the field direction
          at any point is tangent to these circles, just as you saw when adjusting the current.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">Sources of Magnetic Fields</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>- Moving electric charges (currents)</li>
            <li>- Permanent magnets (aligned electron spins)</li>
            <li>- Changing electric fields</li>
            <li>- Earth's liquid iron core convection</li>
            <li>- B = u0*I/(2*pi*r) for straight wire</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-purple-400 mb-3">Right-Hand Rules</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>- <strong>Wire:</strong> Thumb = current, fingers curl = B direction</li>
            <li>- <strong>Force:</strong> Fingers = v, curl to B, thumb = F</li>
            <li>- <strong>Solenoid:</strong> Fingers curl with current, thumb = N pole</li>
            <li>- Works for positive charges (reverse for negative)</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-amber-400 mb-3">Lorentz Force</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>- F = qv x B (cross product)</li>
            <li>- Force perpendicular to both v and B</li>
            <li>- Maximum when v perpendicular to B</li>
            <li>- Zero when v parallel to B</li>
            <li>- Causes circular motion for perpendicular entry</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-3">Field Properties</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>- Measured in Tesla (T) or Gauss (1 T = 10,000 G)</li>
            <li>- Field lines always form closed loops</li>
            <li>- Lines never cross (direction would be ambiguous)</li>
            <li>- Density of lines indicates field strength</li>
            <li>- Earth's field is about 50 uT, MRI is about 3 T</li>
          </ul>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{ position: 'relative', zIndex: 10 }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Discover Electromagnets
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">The Electromagnet Challenge</h2>

      {/* SVG diagram of electromagnet */}
      <svg width="320" height="200" viewBox="0 0 320 200" style={{ marginBottom: 16 }}>
        <defs>
          <linearGradient id="twpIronCore" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id="twpCoilWire" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <filter id="twpGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect width="320" height="200" rx="12" fill="#0f172a" />
        {/* Iron core */}
        <rect x="80" y="85" width="160" height="30" rx="4" fill="url(#twpIronCore)" stroke="#475569" strokeWidth="1" />
        <text x="160" y="105" textAnchor="middle" fill="#1e293b" fontSize="11" fontWeight="bold" fontFamily="sans-serif">Iron Core</text>
        {/* Coil windings */}
        {[0,1,2,3,4,5,6,7].map(i => (
          <g key={i}>
            <ellipse cx={95 + i * 19} cy={100} rx="8" ry="22" fill="none" stroke="url(#twpCoilWire)" strokeWidth="2.5" />
          </g>
        ))}
        {/* Field lines (dashed to show pattern) */}
        <path d="M 70,100 C 70,50 250,50 250,100" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6" />
        <path d="M 70,100 C 70,150 250,150 250,100" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6" />
        <path d="M 60,100 C 60,35 260,35 260,100" fill="none" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />
        <path d="M 60,100 C 60,165 260,165 260,100" fill="none" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />
        {/* N and S poles */}
        <text x="260" y="105" fill="#ef4444" fontSize="14" fontWeight="bold" fontFamily="sans-serif">N</text>
        <text x="55" y="105" fill="#3b82f6" fontSize="14" fontWeight="bold" fontFamily="sans-serif">S</text>
        {/* Battery / power source */}
        <line x1="95" y1="122" x2="95" y2="160" stroke="#fbbf24" strokeWidth="2" />
        <line x1="240" y1="122" x2="240" y2="160" stroke="#fbbf24" strokeWidth="2" />
        <line x1="95" y1="160" x2="150" y2="160" stroke="#fbbf24" strokeWidth="2" />
        <line x1="185" y1="160" x2="240" y2="160" stroke="#fbbf24" strokeWidth="2" />
        <rect x="150" y="152" width="35" height="16" rx="3" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.5" />
        <text x="167" y="163" textAnchor="middle" fill="#fbbf24" fontSize="11" fontFamily="sans-serif">Battery</text>
        {/* Current arrow */}
        <polygon points="130,157 135,153 135,161" fill="#fbbf24" />
        {/* Title */}
        <text x="160" y="25" textAnchor="middle" fill="#c4b5fd" fontSize="12" fontFamily="sans-serif">Electromagnet: Wire coiled around iron core</text>
      </svg>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          Instead of a straight wire, what if we coil the wire into many loops around an iron core? We've created an electromagnet!
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          What is the main advantage of an electromagnet over a permanent magnet?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Electromagnets are always stronger than permanent magnets' },
          { id: 'B', text: 'Electromagnets can be turned on/off and their strength can be adjusted' },
          { id: 'C', text: 'Electromagnets don\'t need any power source' },
          { id: 'D', text: 'Electromagnets only work at very high temperatures' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{ position: 'relative', zIndex: 10 }}
            className={`p-4 rounded-xl text-left transition-all duration-300 ${
              showTwistFeedback && twistPrediction === option.id
                ? option.id === 'B'
                  ? 'bg-emerald-600/40 border-2 border-emerald-400'
                  : 'bg-red-600/40 border-2 border-red-400'
                : showTwistFeedback && option.id === 'B'
                ? 'bg-emerald-600/40 border-2 border-emerald-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 border-2 border-transparent'
            }`}
          >
            <span className="font-bold text-white">{option.id}.</span>
            <span className="text-slate-200 ml-2">{option.text}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded-xl max-w-xl">
          <p className="text-emerald-400 font-semibold">
            Correct! Electromagnets are controllable!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            By adjusting the current, we can turn the magnet on/off instantly and control its strength. This makes them essential for motors, MRI machines, and countless other applications.
          </p>
          <button
            onClick={() => goToPhase('twist_play')}
            style={{ position: 'relative', zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            Build Your Own Electromagnet
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-4">Electromagnet Simulator</h2>

      {/* Side-by-side layout: SVG left, Controls right */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px', width: '100%', maxWidth: '800px', alignItems: isMobile ? 'center' : 'flex-start' }}>
        {/* SVG panel */}
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          <div className="bg-slate-800/50 rounded-2xl p-4">
            {renderElectromagnetVisualization(isMobile ? 320 : 400, isMobile ? 250 : 280)}
          </div>
        </div>

        {/* Controls panel */}
        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '12px' }}>
            <div className="p-4 bg-slate-700/50 rounded-xl text-center">
              <div className="text-sm text-slate-400 mb-2">Current (Amperes)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(148,163,184,0.7)' }}>
                <span>Zero 0</span><span>Strong 5</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={electromagnetCurrent}
                onChange={(e) => setElectromagnetCurrent(parseFloat(e.target.value))}
                className="w-full mb-2"
                style={{ width: '100%', height: '20px', accentColor: '#3b82f6', cursor: 'pointer', touchAction: 'pan-y', WebkitAppearance: 'none' }}
              />
              <div className="text-cyan-400 font-bold text-xl">{electromagnetCurrent.toFixed(1)} A</div>
            </div>

            <div className="p-4 bg-slate-700/50 rounded-xl text-center">
              <div className="text-sm text-slate-400 mb-2">Number of Coils</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(148,163,184,0.7)' }}>
                <span>Min 10</span><span>Max 100</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="10"
                value={electromagnetCoils}
                onChange={(e) => setElectromagnetCoils(parseInt(e.target.value))}
                className="w-full mb-2"
                style={{ width: '100%', height: '20px', accentColor: '#3b82f6', cursor: 'pointer', touchAction: 'pan-y', WebkitAppearance: 'none' }}
              />
              <div className="text-cyan-400 font-bold text-xl">{electromagnetCoils} turns</div>
            </div>

            <button
              onClick={() => setShowFieldLines(!showFieldLines)}
              style={{ position: 'relative', zIndex: 10 }}
              className={`p-3 rounded-xl font-medium transition-colors ${
                showFieldLines ? 'bg-cyan-600' : 'bg-slate-600'
              } text-white`}
            >
              Field Lines: {showFieldLines ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Explanation in controls panel */}
          <div style={{ background: 'linear-gradient(135deg, rgba(88,28,135,0.4), rgba(157,23,77,0.4))', borderRadius: '12px', padding: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#c084fc', marginBottom: '8px' }}>What You're Seeing:</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#cbd5e1' }}>
              <li>- <strong>More current</strong> = stronger field</li>
              <li>- <strong>More coils</strong> = stronger field</li>
              <li>- <strong>Iron core</strong> concentrates field (~1000x)</li>
              <li>- <strong>Zero current</strong> = no field</li>
              <li>- B = u0 * n * I</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_review')}
        style={{ position: 'relative', zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Review Electromagnets
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">Electromagnet Mastery</h2>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mb-6">
        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-purple-400 mb-3">How Electromagnets Work</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>- Coiled wire creates magnetic field when current flows</li>
            <li>- Each loop adds to the total field (superposition)</li>
            <li>- Iron core amplifies field by about 1000x</li>
            <li>- Magnetic domains in iron align with the field</li>
            <li>- Formula: B = u0 * n * I (inside solenoid)</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">Why They're Special</h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li>- Can be turned on and off instantly</li>
            <li>- Strength adjustable by changing current</li>
            <li>- Polarity can be reversed (flip current direction)</li>
            <li>- Can achieve very strong fields (MRI: 3+ Tesla)</li>
            <li>- Essential for motors, generators, and transformers</li>
          </ul>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-emerald-400 mb-3">Key Takeaway</h3>
        <p className="text-slate-300">
          Electromagnets give us <span className="text-cyan-400">controllable magnetism</span>. Unlike permanent magnets, we can turn them on/off, adjust their strength, and reverse their polarity. This controllability is what makes electric motors, MRI machines, maglev trains, and countless other technologies possible!
        </p>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        style={{ position: 'relative', zIndex: 10 }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all duration-300"
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>

      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {applications.map((app, index) => (
          <button
            key={index}
            onClick={() => setActiveAppIndex(index)}
            style={{ position: 'relative', zIndex: 10 }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppIndex === index
                ? 'bg-blue-600 text-white'
                : completedApps.has(index)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.short}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${applications[activeAppIndex].color} flex items-center justify-center text-2xl font-bold text-white`}>
            {applications[activeAppIndex].icon}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{applications[activeAppIndex].title}</h3>
            <p className="text-cyan-400 text-sm">{applications[activeAppIndex].tagline}</p>
          </div>
        </div>

        <p className="text-slate-300 mb-4">{applications[activeAppIndex].description}</p>

        <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
          <h4 className="text-sm font-semibold text-cyan-400 mb-2">Physics Connection:</h4>
          <p className="text-sm text-slate-300">{applications[activeAppIndex].connection}</p>
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-semibold text-white mb-2">How It Works:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-slate-300">
            {applications[activeAppIndex].howItWorks.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {applications[activeAppIndex].stats.map((stat, i) => (
            <div key={i} className="bg-slate-700/50 rounded-lg p-2 text-center">
              <div className="text-cyan-400 font-bold text-sm">{stat.value}</div>
              <div className="text-slate-400 text-xs">{stat.label}</div>
            </div>
          ))}
        </div>

        <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(148,163,184,1)', fontWeight: 400, lineHeight: 1.6, margin: 0 }}>
            Magnetic fields power real-world applications spanning over 603 km/h maglev trains, MRI machines generating fields of 3 W per voxel at 0.1 mm resolution, electric motors consuming 45% of the world's 175 billion kWh electricity, and hard drives storing 20 TB of data at 1 Tb per square inch. Companies like Siemens, Tesla, GE Healthcare, and Seagate drive innovation worth $200 billion annually across these magnetic field application areas.
          </p>
        </div>

        {!completedApps.has(activeAppIndex) && (
          <button
            onClick={() => handleAppComplete(activeAppIndex)}
            style={{ position: 'relative', zIndex: 10, width: '100%', padding: '12px', backgroundColor: '#059669', color: 'white', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer' }}
          >
            Mark as Understood
          </button>
        )}
      </div>

      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#94a3b8' }}>Progress:</span>
        <div className="flex gap-1">
          {applications.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${completedApps.has(i) ? 'bg-emerald-500' : 'bg-slate-600'}`}
            />
          ))}
        </div>
        <span className="text-slate-400">{completedApps.size}/4</span>
      </div>

      {completedApps.size >= 4 && (
        <button
          onClick={() => goToPhase('test')}
          style={{ position: 'relative', zIndex: 10 }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all duration-300"
        >
          Take the Knowledge Test
        </button>
      )}
    </div>
  );

  const renderTest = () => (
    (() => { const q = testQuestions[currentQuestion]; const isConf = confirmedIndex === currentQuestion; const sc = calculateScore();
    if (showTestResults) return (
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ backgroundColor: 'rgba(30,41,59,0.5)', borderRadius: '16px', padding: '24px', textAlign: 'center', border: '1px solid rgba(51,65,85,0.5)' }}>
          <p style={{ fontSize: '32px', fontWeight: 800, color: sc >= 7 ? '#10b981' : '#f59e0b' }}>{sc}/10</p>
          <p style={{ fontSize: '16px', color: '#94a3b8' }}>{sc >= 7 ? "Congratulations! You've mastered magnetic fields!" : 'Keep studying!'}</p>
        </div>
      </div>
    );
    return (
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>Knowledge Test</h2>
        <p style={{ fontSize: '14px', color: 'rgba(148,163,184,1)', fontWeight: 400, marginBottom: '16px', lineHeight: 1.6 }}>Apply your understanding of magnetic fields, the right-hand rule, Lorentz force, and electromagnetic induction to solve real-world physics scenarios. Question {currentQuestion + 1} of 10.</p>
        <div style={{ display: 'flex', gap: '3px', marginBottom: '20px' }}>{Array(10).fill(0).map((_, i) => (<div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: i < currentQuestion ? '#10b981' : i === currentQuestion ? '#3b82f6' : '#1e293b' }} />))}</div>
        <div style={{ backgroundColor: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}><p style={{ fontSize: '14px', color: '#22d3ee', fontStyle: 'italic', margin: 0 }}>{q.scenario}</p></div>
        <p style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>{q.question}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {q.options.map((opt, i) => (<button key={i} onClick={() => { if (!isConf) { const nA = [...testAnswers]; nA[currentQuestion] = i; setTestAnswers(nA); }}} style={{ padding: '12px', borderRadius: '10px', border: testAnswers[currentQuestion] === i ? '2px solid #3b82f6' : '1px solid #334155', backgroundColor: testAnswers[currentQuestion] === i ? 'rgba(59,130,246,0.15)' : '#0f172a', cursor: isConf ? 'default' : 'pointer', textAlign: 'left' }}><span style={{ fontSize: '16px', color: 'white' }}>{String.fromCharCode(65+i)}) {opt.text}</span></button>))}
        </div>
        {!isConf ? (
          <button onClick={() => { if (testAnswers[currentQuestion] !== -1) setConfirmedIndex(currentQuestion); }} disabled={testAnswers[currentQuestion] === -1} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: testAnswers[currentQuestion] !== -1 ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#1e293b', color: testAnswers[currentQuestion] !== -1 ? 'white' : '#64748b', fontSize: '16px', fontWeight: 700, cursor: testAnswers[currentQuestion] !== -1 ? 'pointer' : 'not-allowed', opacity: testAnswers[currentQuestion] !== -1 ? 1 : 0.5 }}>Check Answer</button>
        ) : currentQuestion < 9 ? (
          <button onClick={() => { setConfirmedIndex(null); setCurrentQuestion(currentQuestion + 1); }} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>Next Question</button>
        ) : (
          <button onClick={() => { setTestSubmitted(true); setShowTestResults(true); playSound('complete'); emitEvent('game_completed', { score: calculateScore(), maxScore: 10 }); }} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #10b981, #3b82f6)', color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>Submit Test</button>
        )}
      </div>
    ); })()
  );

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-blue-900/50 via-indigo-900/50 to-purple-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">M</div>
        <h1 className="text-3xl font-bold text-white mb-4">Magnetic Field Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          Congratulations! You've mastered the physics of magnetic fields and forces!
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">O</div>
            <p className="text-sm text-slate-300">Circular Field Lines</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">R</div>
            <p className="text-sm text-slate-300">Right-Hand Rule</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">F</div>
            <p className="text-sm text-slate-300">Lorentz Force</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">E</div>
            <p className="text-sm text-slate-300">Electromagnets</p>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
          <h3 className="text-lg font-bold text-cyan-400 mb-2">What You've Learned:</h3>
          <ul className="text-sm text-slate-300 text-left space-y-1">
            <li>- Magnetic fields form concentric circles around current-carrying wires</li>
            <li>- The right-hand rule predicts field and force directions</li>
            <li>- B = u0*I/(2*pi*r) for straight wire, B = u0*n*I for solenoid</li>
            <li>- Electromagnets provide controllable magnetic fields</li>
            <li>- Applications include motors, MRI, maglev trains, and speakers</li>
          </ul>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => goToPhase('hook')}
            style={{ position: 'relative', zIndex: 10 }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            Explore Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            style={{ position: 'relative', zIndex: 10 }}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-xl transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  // Phase renderer
  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return (
          <TransferPhaseView
          conceptName="Magnetic Field"
          applications={realWorldApps}
          onComplete={() => goToPhase('test')}
          isMobile={isMobile}
          colors={colors}
          typo={typo}
          playSound={playSound}
          />
        );
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  const pidx = phaseOrder.indexOf(phase);
  const isFirstP = pidx === 0;
  const isLastP = pidx === phaseOrder.length - 1;
  const isTestP = phase === 'test';
  const canNext = !isLastP && (!isTestP || testSubmitted);

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0a0f1a 0%, #0f172a 50%, #0a0f1a 100%)', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', minHeight: '100dvh' }}>
      {/* Top bar */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.9)', position: 'relative', zIndex: 10 }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>Magnetic Fields</span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {phaseOrder.map((p, i) => (
            <button key={p} aria-label={phaseLabels[p]} title={phaseLabels[p]} onClick={() => i <= pidx && goToPhase(p)} style={{ width: phase === p ? '20px' : '8px', height: '8px', borderRadius: '4px', border: 'none', backgroundColor: i < pidx ? '#10b981' : phase === p ? '#06b6d4' : '#334155', cursor: i <= pidx ? 'pointer' : 'default', transition: 'all 0.3s ease' }} />
          ))}
        </div>
        <span style={{ fontSize: '14px', color: '#64748b' }}>{pidx + 1}/10</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative', paddingTop: '48px', paddingBottom: '16px' }}>
        <div style={{ position: 'fixed', top: 0, left: 0, width: `${((pidx + 1) / 10) * 100}%`, height: '3px', background: 'linear-gradient(90deg, #06b6d4, #3b82f6)', transition: 'width 0.3s ease', zIndex: 20 }} />
        {renderPhase()}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
        <button onClick={() => !isFirstP && goToPhase(phaseOrder[pidx - 1])} style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: isFirstP ? 'rgba(255,255,255,0.3)' : 'white', cursor: isFirstP ? 'not-allowed' : 'pointer', opacity: isFirstP ? 0.4 : 1, transition: 'all 0.3s ease' }}>← Back</button>
        <div style={{ display: 'flex', gap: '6px' }}>
          {phaseOrder.map((p, i) => (
            <div key={p} onClick={() => i <= pidx && goToPhase(p)} title={phaseLabels[p]} style={{ width: p === phase ? '20px' : '10px', height: '10px', borderRadius: '5px', background: p === phase ? '#3b82f6' : i < pidx ? '#10b981' : 'rgba(255,255,255,0.2)', cursor: i <= pidx ? 'pointer' : 'default', transition: 'all 0.3s ease' }} />
          ))}
        </div>
        <button onClick={() => canNext && goToPhase(phaseOrder[pidx + 1])} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: canNext ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.1)', color: 'white', cursor: canNext ? 'pointer' : 'not-allowed', opacity: canNext ? 1 : 0.4, transition: 'all 0.3s ease' }}>Next →</button>
      </div>
    </div>
  );
};

export default MagneticFieldRenderer;
