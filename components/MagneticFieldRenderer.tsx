'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

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

const MagneticFieldRenderer: React.FC<Props> = ({ onGameEvent }) => {
  // Phase labels and descriptions
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'Electromagnet Challenge',
    twist_play: 'Electromagnet Simulation',
    twist_review: 'Electromagnet Insight',
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
  const [phase, setPhase] = useState<Phase>('hook');
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
      <svg width={width} height={height} className="mx-auto">
        <defs>
          <linearGradient id="wireGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill="#1e293b" rx="8" />

        {/* Current direction indicator */}
        <text x={centerX} y="25" textAnchor="middle" fill="#94a3b8" fontSize="11">
          Current: {wireCurrent.toFixed(1)} A (into page)
        </text>

        {/* Wire cross-section */}
        <circle cx={centerX} cy={centerY} r="15" fill="url(#wireGrad)" stroke="#fca5a5" strokeWidth="2" />
        <text x={centerX} y={centerY + 4} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">X</text>

        {/* Concentric field lines */}
        {showFieldLines && [30, 50, 70, 90, 110].map((r, i) => {
          const fieldStrength = 1 / (r / 30);
          return (
            <g key={i}>
              <circle
                cx={centerX}
                cy={centerY}
                r={r}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={1.5 * fieldStrength}
                strokeDasharray={r > 70 ? "8 4" : "none"}
                opacity={0.5 + 0.3 * fieldStrength}
              />
              {/* Field direction arrows (clockwise for current into page) */}
              {[0, 90, 180, 270].map((angle, j) => {
                const arrowX = centerX + r * Math.cos((angle + animationTime * 30) * Math.PI / 180);
                const arrowY = centerY + r * Math.sin((angle + animationTime * 30) * Math.PI / 180);
                const tangentAngle = angle + 90 + animationTime * 30;
                return (
                  <g key={j} transform={`translate(${arrowX}, ${arrowY}) rotate(${tangentAngle})`}>
                    <path d="M-6,0 L6,0 M3,-3 L6,0 L3,3" stroke="#60a5fa" strokeWidth="1.5" fill="none" />
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Test point */}
        <circle cx={centerX + wireDistance * 1500} cy={centerY} r="6" fill="#22c55e" />
        <text x={centerX + wireDistance * 1500} y={centerY - 12} textAnchor="middle" fill="#22c55e" fontSize="10">
          B = {(currentField * 1e6).toFixed(1)} uT
        </text>

        {/* Distance line */}
        <line
          x1={centerX + 20}
          y1={centerY + 30}
          x2={centerX + wireDistance * 1500}
          y2={centerY + 30}
          stroke="#94a3b8"
          strokeWidth="1"
          strokeDasharray="4 2"
        />
        <text x={centerX + wireDistance * 750 + 10} y={centerY + 45} textAnchor="middle" fill="#94a3b8" fontSize="10">
          r = {(wireDistance * 100).toFixed(1)} cm
        </text>

        {/* Right-hand rule reminder */}
        <g transform={`translate(${width - 70}, ${height - 50})`}>
          <rect x="0" y="0" width="60" height="45" fill="#334155" rx="4" />
          <text x="30" y="15" textAnchor="middle" fill="#94a3b8" fontSize="9">Right Hand</text>
          <text x="30" y="28" textAnchor="middle" fill="#22c55e" fontSize="9">Thumb: I</text>
          <text x="30" y="41" textAnchor="middle" fill="#3b82f6" fontSize="9">Curl: B</text>
        </g>

        {/* Formula */}
        <rect x="10" y={height - 40} width="140" height="30" fill="#0f172a" rx="4" />
        <text x="80" y={height - 20} textAnchor="middle" fill="#f8fafc" fontSize="12" fontFamily="monospace">
          B = u0I / (2pr)
        </text>
      </svg>
    );
  };

  // Render solenoid visualization
  const renderSolenoidVisualization = (width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;

    return (
      <svg width={width} height={height} className="mx-auto">
        <rect x="0" y="0" width={width} height={height} fill="#1e293b" rx="8" />

        <text x={centerX} y="25" textAnchor="middle" fill="#94a3b8" fontSize="11">
          Solenoid: {Math.round(electromagnetCoils)} turns, {electromagnetCurrent.toFixed(1)} A
        </text>

        {/* Solenoid coils */}
        <g transform={`translate(${centerX - 80}, ${centerY - 30})`}>
          {Array.from({ length: 10 }).map((_, i) => (
            <ellipse
              key={i}
              cx={i * 16 + 8}
              cy="30"
              rx="8"
              ry="25"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
            />
          ))}
          {/* Core */}
          <rect x="0" y="20" width="160" height="20" fill="#64748b" opacity="0.3" />
        </g>

        {/* Internal field lines */}
        {showFieldLines && [-15, 0, 15].map((offset, i) => (
          <g key={i}>
            <line
              x1={centerX - 70}
              y1={centerY + offset}
              x2={centerX + 70}
              y2={centerY + offset}
              stroke="#3b82f6"
              strokeWidth="2"
            />
            {/* Arrows */}
            <polygon
              points={`${centerX + 60},${centerY + offset - 5} ${centerX + 70},${centerY + offset} ${centerX + 60},${centerY + offset + 5}`}
              fill="#3b82f6"
            />
          </g>
        ))}

        {/* External field (curved) */}
        {showFieldLines && (
          <g>
            <path
              d={`M ${centerX + 70} ${centerY - 15} Q ${centerX + 120} ${centerY - 60} ${centerX} ${centerY - 70} Q ${centerX - 120} ${centerY - 60} ${centerX - 70} ${centerY - 15}`}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            <path
              d={`M ${centerX + 70} ${centerY + 15} Q ${centerX + 120} ${centerY + 60} ${centerX} ${centerY + 70} Q ${centerX - 120} ${centerY + 60} ${centerX - 70} ${centerY + 15}`}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
          </g>
        )}

        {/* N and S poles */}
        <text x={centerX + 90} y={centerY + 5} fill="#ef4444" fontSize="16" fontWeight="bold">N</text>
        <text x={centerX - 100} y={centerY + 5} fill="#3b82f6" fontSize="16" fontWeight="bold">S</text>

        {/* Field strength */}
        <rect x="10" y={height - 50} width="180" height="40" fill="#0f172a" rx="4" />
        <text x="100" y={height - 32} textAnchor="middle" fill="#f8fafc" fontSize="11" fontFamily="monospace">
          B = u0 * n * I
        </text>
        <text x="100" y={height - 16} textAnchor="middle" fill="#22c55e" fontSize="11">
          = {(solenoidField * 1000).toFixed(2)} mT
        </text>
      </svg>
    );
  };

  // Render electromagnet visualization for twist phase
  const renderElectromagnetVisualization = (width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const fieldStrength = electromagnetCurrent * electromagnetCoils / 100;

    return (
      <svg width={width} height={height} className="mx-auto">
        <rect x="0" y="0" width={width} height={height} fill="#1e293b" rx="8" />

        <text x={centerX} y="20" textAnchor="middle" fill="#94a3b8" fontSize="11">
          Electromagnet Control Panel
        </text>

        {/* Iron core */}
        <rect x={centerX - 60} y={centerY - 20} width="120" height="40" fill="#4a5568" rx="4" />
        <text x={centerX} y={centerY + 5} textAnchor="middle" fill="#94a3b8" fontSize="10">Iron Core</text>

        {/* Coils visualization */}
        <g transform={`translate(${centerX - 60}, ${centerY - 35})`}>
          {Array.from({ length: Math.min(Math.round(electromagnetCoils / 10), 12) }).map((_, i) => (
            <rect
              key={i}
              x={i * 10}
              y="0"
              width="8"
              height="70"
              fill="none"
              stroke={electromagnetCurrent > 0 ? "#ef4444" : "#64748b"}
              strokeWidth="2"
              rx="2"
            />
          ))}
        </g>

        {/* Magnetic field lines (proportional to strength) */}
        {electromagnetCurrent > 0 && showFieldLines && Array.from({ length: Math.min(Math.round(fieldStrength), 5) }).map((_, i) => {
          const offset = (i - 2) * 15;
          return (
            <g key={i}>
              <line
                x1={centerX - 50}
                y1={centerY + offset}
                x2={centerX + 50}
                y2={centerY + offset}
                stroke="#3b82f6"
                strokeWidth={Math.max(1, 3 - Math.abs(offset) / 10)}
                opacity={0.8}
              />
              <polygon
                points={`${centerX + 45},${centerY + offset - 4} ${centerX + 55},${centerY + offset} ${centerX + 45},${centerY + offset + 4}`}
                fill="#3b82f6"
              />
            </g>
          );
        })}

        {/* Poles */}
        {electromagnetCurrent > 0 && (
          <>
            <circle cx={centerX + 80} cy={centerY} r="15" fill="#ef4444" opacity="0.3" />
            <text x={centerX + 80} y={centerY + 5} textAnchor="middle" fill="#ef4444" fontSize="14" fontWeight="bold">N</text>
            <circle cx={centerX - 80} cy={centerY} r="15" fill="#3b82f6" opacity="0.3" />
            <text x={centerX - 80} y={centerY + 5} textAnchor="middle" fill="#3b82f6" fontSize="14" fontWeight="bold">S</text>
          </>
        )}

        {/* Paper clips attracted */}
        {electromagnetCurrent > 0 && fieldStrength > 0.5 && (
          <g>
            {Array.from({ length: Math.min(Math.round(fieldStrength * 2), 6) }).map((_, i) => (
              <g key={i} transform={`translate(${centerX + 90 + (i % 2) * 15}, ${centerY + 30 + Math.floor(i / 2) * 12})`}>
                <ellipse rx="5" ry="3" fill="#94a3b8" />
              </g>
            ))}
          </g>
        )}

        {/* Power indicator */}
        <rect x={width - 80} y={height - 60} width="70" height="50" fill="#0f172a" rx="4" />
        <text x={width - 45} y={height - 42} textAnchor="middle" fill="#94a3b8" fontSize="9">Field Strength</text>
        <rect x={width - 75} y={height - 35} width="60" height="8" fill="#334155" rx="2" />
        <rect x={width - 75} y={height - 35} width={Math.min(fieldStrength * 12, 60)} height="8" fill="#22c55e" rx="2" />
        <text x={width - 45} y={height - 12} textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="bold">
          {fieldStrength > 0 ? 'ON' : 'OFF'}
        </text>
      </svg>
    );
  };

  // ============================================================
  // PHASE RENDERERS
  // ============================================================

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-8 px-6">
      {/* Premium badge */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
        <span className="text-cyan-400/80 text-sm font-medium tracking-wide uppercase">Electromagnetism</span>
      </div>

      {/* Gradient title */}
      <h1 className="text-4xl md:text-5xl font-bold text-center mb-3 bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
        Magnetic Fields
      </h1>

      {/* Subtitle */}
      <p className="text-slate-400 text-lg md:text-xl text-center mb-8 max-w-lg">
        The invisible force fields created by moving charges
      </p>

      {/* Premium card */}
      <div className="w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
        <svg width={isMobile ? 280 : 340} height={180} className="mx-auto mb-4">
          <rect x="0" y="0" width={isMobile ? 280 : 340} height="180" fill="#0f172a" rx="8" />

          {/* Bar magnet */}
          <rect x={isMobile ? 90 : 120} y="70" width="40" height="40" fill="#ef4444" rx="4" />
          <rect x={isMobile ? 130 : 160} y="70" width="40" height="40" fill="#3b82f6" rx="4" />
          <text x={isMobile ? 110 : 140} y="95" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">N</text>
          <text x={isMobile ? 150 : 180} y="95" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">S</text>

          {/* Field lines */}
          <path d={`M ${isMobile ? 90 : 120} 90 Q ${isMobile ? 50 : 70} 50 ${isMobile ? 170 : 200} 90`} fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="4 2" />
          <path d={`M ${isMobile ? 90 : 120} 90 Q ${isMobile ? 50 : 70} 130 ${isMobile ? 170 : 200} 90`} fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="4 2" />

          {/* Compass needle */}
          <g transform={`translate(${isMobile ? 50 : 60}, 60)`}>
            <circle r="12" fill="#334155" stroke="#64748b" strokeWidth="1" />
            <line x1="-6" y1="0" x2="6" y2="0" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
            <circle r="2" fill="#64748b" />
          </g>

          <text x={isMobile ? 140 : 170} y="160" textAnchor="middle" fill="#94a3b8" fontSize="10">
            Compasses reveal invisible field lines
          </text>
        </svg>

        <p className="text-gray-300 text-center leading-relaxed">
          A compass needle always points north... but bring a magnet close and it swings away! What invisible force reaches through space to push and pull?
        </p>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => goToPhase('predict')}
        style={{ position: 'relative', zIndex: 10 }}
        className="group px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 flex items-center gap-2"
      >
        Explore the Magnetic Field
        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>

      {/* Hint text */}
      <p className="text-slate-500 text-sm mt-6">
        Discover how moving charges create magnetic fields
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>

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

      {/* Demo selector */}
      <div className="flex gap-2 mb-4">
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

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
        {selectedDemo === 'wire'
          ? renderFieldVisualization(isMobile ? 320 : 400, isMobile ? 280 : 320)
          : renderSolenoidVisualization(isMobile ? 320 : 400, isMobile ? 280 : 320)
        }
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-2xl mb-4">
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
              <input
                type="range"
                min="1"
                max="20"
                value={wireCurrent}
                onChange={(e) => setWireCurrent(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-cyan-400 font-bold">{wireCurrent.toFixed(1)}</div>
            </div>

            <div className="p-3 bg-slate-700/50 rounded-xl text-center">
              <div className="text-sm text-slate-400">Distance (cm)</div>
              <input
                type="range"
                min="1"
                max="20"
                value={wireDistance * 100}
                onChange={(e) => setWireDistance(parseFloat(e.target.value) / 100)}
                className="w-full"
              />
              <div className="text-cyan-400 font-bold">{(wireDistance * 100).toFixed(1)}</div>
            </div>
          </>
        ) : (
          <>
            <div className="p-3 bg-slate-700/50 rounded-xl text-center">
              <div className="text-sm text-slate-400">Current (A)</div>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={electromagnetCurrent}
                onChange={(e) => setElectromagnetCurrent(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-cyan-400 font-bold">{electromagnetCurrent.toFixed(1)}</div>
            </div>

            <div className="p-3 bg-slate-700/50 rounded-xl text-center">
              <div className="text-sm text-slate-400">Turns</div>
              <input
                type="range"
                min="10"
                max="200"
                step="10"
                value={electromagnetCoils}
                onChange={(e) => setElectromagnetCoils(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-cyan-400 font-bold">{electromagnetCoils}</div>
            </div>
          </>
        )}
      </div>

      <div className="bg-slate-800/70 rounded-xl p-4 max-w-2xl">
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Key Equations:</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-300">
          <div>
            <div className="font-mono text-white bg-slate-700 px-3 py-2 rounded mb-2">B = u0*I / (2*pi*r)</div>
            <p>Field from straight wire decreases with distance</p>
          </div>
          <div>
            <div className="font-mono text-white bg-slate-700 px-3 py-2 rounded mb-2">B = u0*n*I</div>
            <p>Solenoid field depends on turns per length</p>
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

      <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
        {renderElectromagnetVisualization(isMobile ? 320 : 400, isMobile ? 250 : 280)}
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-4">
        <div className="p-4 bg-slate-700/50 rounded-xl text-center">
          <div className="text-sm text-slate-400 mb-2">Current (Amperes)</div>
          <input
            type="range"
            min="0"
            max="5"
            step="0.5"
            value={electromagnetCurrent}
            onChange={(e) => setElectromagnetCurrent(parseFloat(e.target.value))}
            className="w-full mb-2"
          />
          <div className="text-cyan-400 font-bold text-xl">{electromagnetCurrent.toFixed(1)} A</div>
        </div>

        <div className="p-4 bg-slate-700/50 rounded-xl text-center">
          <div className="text-sm text-slate-400 mb-2">Number of Coils</div>
          <input
            type="range"
            min="10"
            max="100"
            step="10"
            value={electromagnetCoils}
            onChange={(e) => setElectromagnetCoils(parseInt(e.target.value))}
            className="w-full mb-2"
          />
          <div className="text-cyan-400 font-bold text-xl">{electromagnetCoils} turns</div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-xl mb-6">
        <h3 className="text-lg font-bold text-purple-400 mb-3">What You're Seeing:</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>- <strong>More current</strong> = stronger magnetic field</li>
          <li>- <strong>More coils</strong> = stronger magnetic field</li>
          <li>- <strong>Iron core</strong> concentrates the field (about 1000x stronger!)</li>
          <li>- <strong>Zero current</strong> = no magnetic field (unlike permanent magnets)</li>
          <li>- Field strength: B = u0 * n * I</li>
        </ul>
      </div>

      <button
        onClick={() => setShowFieldLines(!showFieldLines)}
        style={{ position: 'relative', zIndex: 10 }}
        className={`mb-4 px-4 py-2 rounded-lg font-medium transition-colors ${
          showFieldLines ? 'bg-cyan-600' : 'bg-slate-600'
        } text-white`}
      >
        Field Lines: {showFieldLines ? 'ON' : 'OFF'}
      </button>

      <button
        onClick={() => goToPhase('twist_review')}
        style={{ position: 'relative', zIndex: 10 }}
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
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

        {!completedApps.has(activeAppIndex) && (
          <button
            onClick={() => handleAppComplete(activeAppIndex)}
            style={{ position: 'relative', zIndex: 10 }}
            className="w-full mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
          >
            Mark as Understood
          </button>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
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
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Knowledge Assessment</h2>

      {!showTestResults ? (
        <div className="space-y-6 max-w-2xl w-full">
          {testQuestions.map((q, qIndex) => (
            <div key={qIndex} className="bg-slate-800/50 rounded-xl p-4">
              <div className="bg-slate-700/50 rounded-lg p-3 mb-3">
                <p className="text-cyan-400 text-sm italic">{q.scenario}</p>
              </div>
              <p className="text-white font-medium mb-3">
                {qIndex + 1}. {q.question}
              </p>
              <div className="grid gap-2">
                {q.options.map((option, oIndex) => (
                  <button
                    key={oIndex}
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    style={{ position: 'relative', zIndex: 10 }}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      testAnswers[qIndex] === oIndex
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={() => { setShowTestResults(true); playSound('complete'); emitEvent('game_completed', { score: calculateScore(), maxScore: 10 }); }}
            disabled={testAnswers.includes(-1)}
            style={{ position: 'relative', zIndex: 10 }}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              testAnswers.includes(-1)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500'
            }`}
          >
            Submit Answers
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">{calculateScore() >= 7 ? '!' : '?'}</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Score: {calculateScore()}/10
            </h3>
            <p className="text-slate-300">
              {calculateScore() >= 7
                ? 'Excellent! You\'ve mastered magnetic fields!'
                : 'Keep studying! Review the concepts and try again.'}
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {testQuestions.map((q, qIndex) => {
              const isCorrect = q.options[testAnswers[qIndex]]?.correct;
              return (
                <div key={qIndex} className={`p-3 rounded-lg ${isCorrect ? 'bg-emerald-900/30' : 'bg-red-900/30'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={isCorrect ? 'text-emerald-400' : 'text-red-400'}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                    <span className="text-sm text-slate-300">Question {qIndex + 1}</span>
                  </div>
                  <p className="text-xs text-slate-400">{q.explanation}</p>
                </div>
              );
            })}
          </div>

          {calculateScore() >= 7 ? (
            <button
              onClick={() => goToPhase('mastery')}
              style={{ position: 'relative', zIndex: 10 }}
              className="w-full px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
            >
              Claim Your Mastery Badge
            </button>
          ) : (
            <button
              onClick={() => { setShowTestResults(false); setTestAnswers(Array(10).fill(-1)); goToPhase('review'); }}
              style={{ position: 'relative', zIndex: 10 }}
              className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all duration-300"
            >
              Review and Try Again
            </button>
          )}
        </div>
      )}
    </div>
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
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Ambient background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Premium progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/70 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-400">Magnetic Fields</span>
            <span className="text-sm text-slate-500">{phaseLabels[phase]}</span>
          </div>
          {/* Phase dots */}
          <div className="flex justify-between px-1">
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ position: 'relative', zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phaseOrder.indexOf(phase) >= i
                    ? 'bg-cyan-500'
                    : 'bg-slate-700'
                } ${phase === p ? 'w-6' : 'w-2'}`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="pt-20 pb-8 relative z-10">
        {renderPhase()}
      </div>
    </div>
  );
};

export default MagneticFieldRenderer;
