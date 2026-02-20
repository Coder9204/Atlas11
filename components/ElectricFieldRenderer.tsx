'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ============================================================
// ELECTRIC FIELD RENDERER - SPEC-COMPLIANT IMPLEMENTATION
// The fundamental concept of force per unit charge
// E = F/q and E = kq/r² for point charges
// ============================================================

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

interface Props {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
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
  howItWorks: string;
  stats: string[];
  examples: string[];
  companies: string[];
  futureImpact: string;
  color: string;
}

interface SourceCharge {
  id: number;
  x: number;
  y: number;
  q: number;
}

const realWorldApps = [
  {
    icon: '📺',
    title: 'CRT Displays & Electron Beams',
    short: 'Steering electrons with fields',
    tagline: 'Drawing pictures with electric force',
    description: 'Cathode ray tubes used electric fields to steer electron beams, creating the images on old TVs and oscilloscopes. The beam deflection is proportional to the field strength.',
    connection: 'Electrons experience force F = qE in an electric field. Deflection plates create uniform fields that bend the beam. The deflection angle depends on field strength and beam energy.',
    howItWorks: 'An electron gun emits a beam. Pairs of deflection plates create electric fields that push the beam left/right and up/down. Varying the field rapidly scans the beam across the phosphor screen.',
    stats: [
      { value: '25kV', label: 'Accelerating voltage', icon: '⚡' },
      { value: '0.3 mm', label: 'Spot size', icon: '🎯' },
      { value: '100 MHz', label: 'Deflection bandwidth', icon: '📊' }
    ],
    examples: ['Old televisions', 'Oscilloscopes', 'Radar displays', 'Electron microscopes'],
    companies: ['Tektronix', 'Sony', 'Samsung', 'RCA'],
    futureImpact: 'While flat panels replaced CRTs for displays, electron beam steering remains essential in electron microscopes, particle accelerators, and semiconductor lithography.',
    color: '#3B82F6'
  },
  {
    icon: '⚡',
    title: 'High-Voltage Insulation',
    short: 'Preventing breakdown',
    tagline: 'Designing for intense electric fields',
    description: 'High-voltage equipment must manage extreme electric fields without breakdown. Field intensity at sharp points can exceed the dielectric strength of air, causing corona or arcing.',
    connection: 'Electric field concentrates at points and edges (small radius of curvature). Engineers use field simulations to shape conductors and insulators, keeping E below breakdown thresholds.',
    howItWorks: 'Smooth, rounded shapes spread field lines over larger areas, reducing peak E. Corona rings and grading electrodes control field distribution. Insulating gases/oils have higher breakdown strength.',
    stats: [
      { value: '3 MV/m', label: 'Air breakdown', icon: '⚡' },
      { value: '20 MV/m', label: 'SF6 breakdown', icon: '🛡️' },
      { value: '765 kV', label: 'Max transmission', icon: '🔌' }
    ],
    examples: ['Transmission lines', 'Substation equipment', 'X-ray tubes', 'Van de Graaff generators'],
    companies: ['ABB', 'Siemens Energy', 'GE Vernova', 'Hitachi Energy'],
    futureImpact: 'New SF6-free insulation systems and solid-state circuit breakers are making high-voltage equipment more environmentally friendly.',
    color: '#F59E0B'
  },
  {
    icon: '🧬',
    title: 'Gel Electrophoresis',
    short: 'Separating DNA by size',
    tagline: 'Electric fields sort molecules',
    description: 'Gel electrophoresis uses uniform electric fields to move charged DNA fragments through a gel matrix. Smaller fragments move faster, separating molecules by size for analysis.',
    connection: 'DNA is negatively charged (phosphate backbone). In an electric field, F = qE drives DNA toward the positive electrode. Gel resistance causes size-dependent mobility - smaller = faster.',
    howItWorks: 'DNA samples are loaded into wells in an agarose gel. An electric field (~5 V/cm) is applied. DNA moves toward + electrode at rates inversely proportional to fragment length.',
    stats: [
      { value: '5-10 V/cm', label: 'Field strength', icon: '⚡' },
      { value: '100-10000 bp', label: 'Size range', icon: '🧬' },
      { value: '30-60 min', label: 'Run time', icon: '⏱️' }
    ],
    examples: ['DNA fingerprinting', 'PCR verification', 'Protein analysis', 'RNA quantification'],
    companies: ['Bio-Rad', 'Thermo Fisher', 'Agilent', 'QIAGEN'],
    futureImpact: 'Capillary and microfluidic electrophoresis enable faster, automated DNA analysis for rapid diagnostics and high-throughput sequencing.',
    color: '#10B981'
  },
  {
    icon: '🖥️',
    title: 'Semiconductor Device Physics',
    short: 'Transistor operation',
    tagline: 'Fields that switch billions of times per second',
    description: 'Every transistor in your computer uses electric fields to control current flow. Gate voltage creates a field that attracts or repels carriers, turning the transistor on or off.',
    connection: 'In a MOSFET, the gate electrode creates an electric field through the thin oxide. This field attracts electrons to form a conductive channel, or repels them to turn the transistor off.',
    howItWorks: 'Applying positive gate voltage creates downward E field. Electrons are attracted to the oxide interface, forming an inversion layer that conducts current between source and drain.',
    stats: [
      { value: '10 MV/cm', label: 'Oxide field', icon: '⚡' },
      { value: '1 nm', label: 'Gate oxide thickness', icon: '📏' },
      { value: '100B+', label: 'Transistors per chip', icon: '🖥️' }
    ],
    examples: ['CPU transistors', 'Memory cells', 'Power MOSFETs', 'Image sensors'],
    companies: ['Intel', 'TSMC', 'Samsung', 'NVIDIA'],
    futureImpact: 'New transistor architectures (GAA, CFET) and materials (high-k, 2D channels) are pushing Moore\'s Law forward despite atomic-scale challenges.',
    color: '#8B5CF6'
  }
];

// Coulomb's constant
const k = 8.99e9; // N·m²/C²

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
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

const ElectricFieldRenderer: React.FC<Props> = ({ onGameEvent, gamePhase }) => {
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
    hook: 'INTRO SCREEN: Title "Electric Fields", animated field line visualization, Start button.',
    predict: 'PREDICTION SCREEN: User predicts field direction around a point charge.',
    play: 'EXPERIMENT SCREEN: Interactive simulation with point charges, field lines, and vectors.',
    review: 'REVIEW SCREEN: Explains E = kQ/r², field superposition, field line rules.',
    twist_predict: 'TWIST PREDICTION: What happens to the field between two opposite charges (dipole)?',
    twist_play: 'DIPOLE EXPERIMENT: Interactive dipole field visualization with test charge.',
    twist_review: 'DIPOLE REVIEW: Explains dipole fields and field cancellation.',
    transfer: 'REAL WORLD APPLICATIONS: Capacitors, Lightning Rods, Electrostatic Precipitators, Touchscreens.',
    test: 'KNOWLEDGE TEST: 10 scenario-based questions about electric fields.',
    mastery: 'COMPLETION SCREEN: Summary of electric field concepts mastered.'
  };

  const coachMessages: Record<Phase, string> = {
    hook: "Welcome! Electric fields surround every charge, invisible but powerful.",
    predict: "Think about what direction a positive test charge would move...",
    play: "Drag the test charge around to explore how the field changes!",
    review: "The field E = kQ/r² follows an inverse-square law, just like gravity!",
    twist_predict: "Here's a twist - what happens between opposite charges?",
    twist_play: "Notice how the field lines connect the positive to the negative charge!",
    twist_review: "Dipoles create beautiful field patterns - from atoms to antennas!",
    transfer: "Electric fields power amazing technology all around us!",
    test: "Test your understanding with these challenging scenarios!",
    mastery: "Congratulations! You've mastered electric fields!"
  };

  // State
  const [phase, setPhase] = useState<Phase>(() => {
    const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    if (gamePhase && validPhases.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  });

  // Sync gamePhase prop
  useEffect(() => {
    const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);
  const [testAnswers, setTestAnswers] = useState<number[]>(Array(10).fill(-1));
  const [showTestResults, setShowTestResults] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [confirmedIndex, setConfirmedIndex] = useState<number | null>(null);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppIndex, setActiveAppIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation states
  const [sourceCharges, setSourceCharges] = useState<SourceCharge[]>([
    { id: 1, x: 250, y: 200, q: 5 }
  ]);
  const [testChargePos, setTestChargePos] = useState({ x: 350, y: 200 });
  const [showFieldLines, setShowFieldLines] = useState(true);
  const [showFieldVectors, setShowFieldVectors] = useState(true);
  const [animationTime, setAnimationTime] = useState(0);
  const [selectedConfig, setSelectedConfig] = useState<'single' | 'dipole' | 'parallel'>('single');
  const [isDraggingTestCharge, setIsDraggingTestCharge] = useState(false);
  const [chargeMagnitude, setChargeMagnitude] = useState(5); // uC

  const lastClickRef = useRef(0);
  const hasEmittedStart = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

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
    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 0.05);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Update charge configuration
  useEffect(() => {
    switch (selectedConfig) {
      case 'single':
        setSourceCharges([{ id: 1, x: 250, y: 200, q: chargeMagnitude }]);
        setTestChargePos({ x: 350, y: 200 });
        break;
      case 'dipole':
        setSourceCharges([
          { id: 1, x: 180, y: 200, q: chargeMagnitude },
          { id: 2, x: 320, y: 200, q: -chargeMagnitude }
        ]);
        setTestChargePos({ x: 250, y: 120 });
        break;
      case 'parallel':
        setSourceCharges([
          { id: 1, x: 100, y: 100, q: chargeMagnitude },
          { id: 2, x: 100, y: 150, q: chargeMagnitude },
          { id: 3, x: 100, y: 200, q: chargeMagnitude },
          { id: 4, x: 100, y: 250, q: chargeMagnitude },
          { id: 5, x: 100, y: 300, q: chargeMagnitude },
          { id: 6, x: 400, y: 100, q: -chargeMagnitude },
          { id: 7, x: 400, y: 150, q: -chargeMagnitude },
          { id: 8, x: 400, y: 200, q: -chargeMagnitude },
          { id: 9, x: 400, y: 250, q: -chargeMagnitude },
          { id: 10, x: 400, y: 300, q: -chargeMagnitude }
        ]);
        setTestChargePos({ x: 250, y: 200 });
        break;
    }
  }, [selectedConfig, chargeMagnitude]);

  // Emit game event
  const emitGameEvent = useCallback((
    eventType: GameEvent['eventType'],
    details: Partial<GameEvent['details']> = {}
  ) => {
    if (!onGameEvent) return;
    const phaseIndex = phaseOrder.indexOf(phase);
    onGameEvent({
      eventType,
      gameType: 'electric_field',
      gameTitle: 'Electric Fields',
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
  }, [onGameEvent, phase, phaseLabels, screenDescriptions, coachMessages]);

  // Emit game_started on mount
  useEffect(() => {
    if (!hasEmittedStart.current) {
      hasEmittedStart.current = true;
      emitGameEvent('game_started', {
        message: 'Starting Electric Fields exploration'
      });
    }
  }, [emitGameEvent]);

  // Reset test state when entering test phase
  useEffect(() => {
    if (phase === 'test') {
      setTestAnswers(Array(10).fill(-1));
      setShowTestResults(false);
    }
  }, [phase]);

  // Navigation
  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;

    lastClickRef.current = now;
    playSound('transition');
    setPhase(p);

    const phaseIndex = phaseOrder.indexOf(p);
    emitGameEvent('phase_changed', {
      phase: p,
      phaseLabel: phaseLabels[p],
      currentScreen: phaseIndex + 1,
      totalScreens: 10,
      screenDescription: screenDescriptions[p],
      coachMessage: coachMessages[p]
    });
  }, [emitGameEvent, phaseLabels, screenDescriptions, coachMessages]);

  // Calculate electric field at a point
  const calculateField = useCallback((x: number, y: number): { Ex: number; Ey: number; E: number } => {
    let Ex = 0, Ey = 0;

    sourceCharges.forEach(charge => {
      const dx = x - charge.x;
      const dy = y - charge.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r < 10) return;

      const q_C = charge.q * 1e-6;
      const r_m = r * 0.001;
      const E_mag = k * Math.abs(q_C) / (r_m * r_m);
      const direction = charge.q > 0 ? 1 : -1;

      Ex += direction * E_mag * (dx / r);
      Ey += direction * E_mag * (dy / r);
    });

    const E = Math.sqrt(Ex * Ex + Ey * Ey);
    return { Ex, Ey, E };
  }, [sourceCharges]);

  const handlePrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;

    setSelectedPrediction(prediction);
    setShowPredictionFeedback(true);

    const isCorrect = prediction === 'C';
    playSound(isCorrect ? 'success' : 'failure');
    emitGameEvent('prediction_made', { prediction, isCorrect });
  }, [emitGameEvent]);

  const handleTwistPrediction = useCallback((prediction: string) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;

    setTwistPrediction(prediction);
    setShowTwistFeedback(true);

    const isCorrect = prediction === 'B';
    playSound(isCorrect ? 'success' : 'failure');
    emitGameEvent('prediction_made', { prediction, isCorrect });
  }, [emitGameEvent]);

  const handleTestAnswer = useCallback((questionIndex: number, answerIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;

    playSound('click');
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = answerIndex;
      return newAnswers;
    });
    emitGameEvent('answer_submitted', { question: questionIndex, answer: answerIndex });
  }, [emitGameEvent]);

  const handleAppComplete = useCallback((appIndex: number) => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) return;
    lastClickRef.current = now;

    setCompletedApps(prev => new Set([...prev, appIndex]));
    playSound('complete');
    emitGameEvent('app_completed', { appIndex });
  }, [emitGameEvent]);

  // Handle test charge dragging
  const handleMouseMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingTestCharge || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 500;
    const y = ((e.clientY - rect.top) / rect.height) * 400;

    setTestChargePos({ x: Math.max(20, Math.min(480, x)), y: Math.max(20, Math.min(380, y)) });
  }, [isDraggingTestCharge]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingTestCharge(false);
  }, []);

  // Test questions with scenarios
  const testQuestions: TestQuestion[] = [
    {
      scenario: "A small positive test charge is placed near a large positive source charge. The test charge experiences a force pushing it away.",
      question: "What is the direction of the electric field at the test charge's location?",
      options: [
        { text: "Toward the source charge", correct: false },
        { text: "Away from the source charge", correct: true },
        { text: "Perpendicular to the line between charges", correct: false },
        { text: "The field has no direction", correct: false }
      ],
      explanation: "Electric field direction is defined as the direction a positive test charge would be pushed. Since like charges repel, the field points away from positive charges."
    },
    {
      scenario: "An electron (negative charge) is placed in a uniform electric field pointing to the right with magnitude 1000 N/C.",
      question: "In which direction will the electron accelerate?",
      options: [
        { text: "To the right (same as E)", correct: false },
        { text: "To the left (opposite to E)", correct: true },
        { text: "The electron won't move", correct: false },
        { text: "Perpendicular to E", correct: false }
      ],
      explanation: "The force on a charge in an electric field is F = qE. For a negative charge (electron), the force is opposite to the field direction."
    },
    {
      scenario: "A physics student observes electric field lines around two equal positive charges placed side by side.",
      question: "What happens to the field lines between the two charges?",
      options: [
        { text: "They connect the two charges directly", correct: false },
        { text: "They curve away from both charges, leaving a null point between them", correct: true },
        { text: "They form closed loops around each charge", correct: false },
        { text: "The field is strongest between the charges", correct: false }
      ],
      explanation: "Like charges repel, so their fields push against each other. Field lines curve away from both charges, creating a point of zero field exactly midway between them."
    },
    {
      scenario: "Inside a hollow conducting sphere that has been given a positive charge, a student wants to measure the electric field.",
      question: "What will the student find for the electric field inside the conductor?",
      options: [
        { text: "Very strong, pointing toward the center", correct: false },
        { text: "Very strong, pointing outward", correct: false },
        { text: "Zero everywhere inside", correct: true },
        { text: "It varies depending on position", correct: false }
      ],
      explanation: "Inside a conductor in electrostatic equilibrium, the electric field is always zero. This is the basis for electrostatic shielding (Faraday cage)."
    },
    {
      scenario: "Two parallel plates are charged, with the top plate positive (+) and bottom plate negative (-). The separation is 5 mm and the voltage difference is 1000 V.",
      question: "What is the electric field magnitude between the plates?",
      options: [
        { text: "200 N/C", correct: false },
        { text: "5000 N/C", correct: false },
        { text: "200,000 N/C (or 200 kV/m)", correct: true },
        { text: "1,000,000 N/C", correct: false }
      ],
      explanation: "For a uniform field between parallel plates, E = V/d. Here E = 1000 V / 0.005 m = 200,000 V/m = 200,000 N/C."
    },
    {
      scenario: "A charge of +2 uC creates an electric field. At a distance of 3 m from this charge, you measure the field strength.",
      question: "What is the approximate electric field magnitude at this point?",
      options: [
        { text: "2000 N/C", correct: true },
        { text: "6000 N/C", correct: false },
        { text: "18,000 N/C", correct: false },
        { text: "600 N/C", correct: false }
      ],
      explanation: "E = kq/r^2 = (8.99x10^9)(2x10^-6)/(3)^2 = 2000 N/C. The field points radially outward from the positive charge."
    },
    {
      scenario: "An electric dipole consists of a +Q and -Q charge separated by a small distance. You observe the field far away from the dipole.",
      question: "How does the field strength vary with distance r from a dipole?",
      options: [
        { text: "It falls off as 1/r (linear)", correct: false },
        { text: "It falls off as 1/r^2 (inverse square)", correct: false },
        { text: "It falls off as 1/r^3 (inverse cube)", correct: true },
        { text: "It remains constant with distance", correct: false }
      ],
      explanation: "Unlike a single charge (1/r^2), a dipole's field falls off as 1/r^3. This is because the fields from the + and - charges largely cancel at large distances."
    },
    {
      scenario: "Electric field lines are drawn around a negative point charge.",
      question: "Which statement correctly describes these field lines?",
      options: [
        { text: "They point radially outward from the charge", correct: false },
        { text: "They point radially inward toward the charge", correct: true },
        { text: "They form circles around the charge", correct: false },
        { text: "There are no field lines around negative charges", correct: false }
      ],
      explanation: "Electric field lines always point in the direction a positive test charge would move. A positive test charge would be attracted to a negative charge, so field lines point inward."
    },
    {
      scenario: "A proton and an electron are placed in the same uniform electric field of 500 N/C.",
      question: "How do their accelerations compare?",
      options: [
        { text: "Same magnitude, same direction", correct: false },
        { text: "Same magnitude, opposite directions", correct: false },
        { text: "Different magnitudes, opposite directions (electron accelerates ~1836x faster)", correct: true },
        { text: "Different magnitudes, same direction", correct: false }
      ],
      explanation: "Force F = qE is the same magnitude for both (same |q|). But a = F/m, and the electron's mass is ~1836 times smaller than the proton's. They accelerate in opposite directions because their charges have opposite signs."
    },
    {
      scenario: "In a cathode ray tube, electrons are accelerated through a potential difference of 10,000 V and then deflected by electric fields between parallel plates.",
      question: "Why do CRT displays use electric fields for electron beam control?",
      options: [
        { text: "Electric fields only affect electrons, not protons", correct: false },
        { text: "Electric fields can precisely control charged particle trajectories", correct: true },
        { text: "Magnetic fields don't work on moving charges", correct: false },
        { text: "Electric fields are cheaper to produce", correct: false }
      ],
      explanation: "Electric fields exert precise, controllable forces on charged particles (F = qE). By varying the voltage on deflection plates, the electron beam can be steered to any point on the screen."
    }
  ];

  // Transfer applications
  const transferApps: TransferApp[] = [
    {
      icon: "🔋",
      title: "Capacitors",
      short: "Energy Storage",
      tagline: "Storing energy in electric fields",
      description: "Capacitors store electrical energy by maintaining an electric field between two conductive plates separated by an insulator.",
      connection: "The uniform electric field E = V/d between plates stores energy. Energy density is proportional to E^2.",
      howItWorks: "When voltage is applied, charges accumulate on the plates creating a field. The field stores energy as U = (1/2)CV^2. Dielectrics increase capacity by reducing the effective field.",
      stats: [
        "Supercapacitors: >10,000 F",
        "Discharge in milliseconds",
        "Energy density: 5-10 Wh/kg",
        "Millions of charge cycles"
      ],
      examples: [
        "Camera flash units",
        "Electric vehicle regenerative braking",
        "Power grid stabilization",
        "Defibrillators"
      ],
      companies: ["Maxwell Technologies", "Panasonic", "Samsung SDI", "Nichicon"],
      futureImpact: "Graphene supercapacitors may achieve battery-level energy density with capacitor-level power density, revolutionizing electric vehicles.",
      color: "from-amber-700 to-orange-900"
    },
    {
      icon: "⚡",
      title: "Lightning Rods",
      short: "Storm Protection",
      tagline: "Guiding nature's electric fury",
      description: "Lightning rods use the principle of charge concentration at sharp points to safely direct lightning strikes to ground.",
      connection: "Electric field strength is highest at pointed conductors. The rod creates a preferred path for the lightning discharge.",
      howItWorks: "The sharp point concentrates the electric field, ionizing nearby air and creating a conductive channel. When lightning strikes, current flows safely through the rod to ground.",
      stats: [
        "Lightning: 300 million volts",
        "Current: up to 200,000 A",
        "Temperature: 30,000 K",
        "Duration: 0.0002 seconds"
      ],
      examples: [
        "Skyscrapers and tall buildings",
        "Church steeples",
        "Power transmission towers",
        "Aircraft static dischargers"
      ],
      companies: ["Lightning Protection Institute", "ERICO", "Alltec", "Harger"],
      futureImpact: "Laser-triggered lightning could enable controlled atmospheric discharge for renewable energy harvesting.",
      color: "from-yellow-700 to-amber-900"
    },
    {
      icon: "🏭",
      title: "Electrostatic Precipitators",
      short: "Clean Air",
      tagline: "Removing pollution with electric fields",
      description: "Industrial smokestacks use strong electric fields to remove 99%+ of particulate pollution from exhaust gases.",
      connection: "Particles are charged by corona discharge, then experience force F = qE driving them to collection plates.",
      howItWorks: "High-voltage corona wires ionize gas molecules, which attach to passing particles. The charged particles then drift toward grounded plates in the strong electric field.",
      stats: [
        "Removes 99.9% of particles",
        "Captures particles down to 0.01 um",
        "Operates at 450C+",
        "Voltage: 20-100 kV"
      ],
      examples: [
        "Coal power plants",
        "Cement kilns",
        "Steel mills",
        "Waste incinerators"
      ],
      companies: ["GE Power", "Mitsubishi", "Babcock & Wilcox", "FLSmidth"],
      futureImpact: "Wet electrostatic precipitators may capture fine particulates and mercury from industrial emissions.",
      color: "from-slate-600 to-slate-800"
    },
    {
      icon: "📱",
      title: "Touchscreens",
      short: "Capacitive Touch",
      tagline: "Sensing fingers through electric fields",
      description: "Modern touchscreens detect finger touches by measuring changes in the electric field pattern on the screen surface.",
      connection: "Your finger acts as a conductor, distorting the local electric field and changing capacitance at that location.",
      howItWorks: "A grid of transparent electrodes creates an electric field pattern. When your finger approaches, it couples capacitively to the electrodes, changing the field distribution. The controller triangulates touch position.",
      stats: [
        "Response time: <10 ms",
        "Resolution: 0.1 mm",
        "Multi-touch: 10+ points",
        "Works through glass"
      ],
      examples: [
        "Smartphones and tablets",
        "ATM machines",
        "Interactive kiosks",
        "Car infotainment systems"
      ],
      companies: ["Apple", "Samsung", "Synaptics", "Cypress"],
      futureImpact: "Force-sensitive and hover-detection touchscreens will enable new gesture-based interfaces.",
      color: "from-blue-700 to-indigo-900"
    }
  ];

  const calculateTestScore = useCallback(() => {
    return testAnswers.reduce((score, answer, index) => {
      if (answer === -1) return score;
      return score + (testQuestions[index].options[answer]?.correct ? 1 : 0);
    }, 0);
  }, [testAnswers, testQuestions]);

  // Render electric field lines
  const renderFieldLines = useCallback(() => {
    if (!showFieldLines) return null;

    const lines: JSX.Element[] = [];
    const numLinesPerCharge = 12;

    sourceCharges.forEach((charge, chargeIndex) => {
      if (charge.q === 0) return;

      for (let i = 0; i < numLinesPerCharge; i++) {
        const angle = (2 * Math.PI * i) / numLinesPerCharge;
        const points: { x: number; y: number }[] = [];

        let x = charge.x + Math.cos(angle) * 15;
        let y = charge.y + Math.sin(angle) * 15;

        const direction = charge.q > 0 ? 1 : -1;

        for (let step = 0; step < 80; step++) {
          if (x < 0 || x > 500 || y < 0 || y > 400) break;

          points.push({ x, y });

          const { Ex, Ey, E } = calculateField(x, y);
          if (E < 1e6) break;

          const stepSize = 4;
          x += direction * (Ex / E) * stepSize;
          y += direction * (Ey / E) * stepSize;

          const nearCharge = sourceCharges.find(c =>
            c.id !== charge.id &&
            Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2) < 15
          );
          if (nearCharge && nearCharge.q * charge.q < 0) break;
        }

        if (points.length > 3) {
          const polyPoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

          lines.push(
            <polyline
              key={`field-${chargeIndex}-${i}`}
              points={polyPoints}
              fill="none"
              stroke={charge.q > 0 ? 'url(#elecPlayFieldLineRedGrad)' : 'url(#elecPlayFieldLineBlueGrad)'}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.7"
              markerEnd={charge.q > 0 ? "url(#elecPlayArrowRed)" : undefined}
            />
          );
        }
      }
    });

    return <g>{lines}</g>;
  }, [showFieldLines, sourceCharges, calculateField]);

  // Render field vectors on a grid
  const renderFieldVectors = useCallback(() => {
    if (!showFieldVectors) return null;

    const vectors: JSX.Element[] = [];
    const gridSize = 40;

    for (let x = gridSize; x < 500; x += gridSize) {
      for (let y = gridSize; y < 400; y += gridSize) {
        const tooClose = sourceCharges.some(c =>
          Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2) < 25
        );
        if (tooClose) continue;

        const { Ex, Ey, E } = calculateField(x, y);
        if (E < 1e6) continue;

        const scale = Math.min(15, Math.log10(E / 1e6) * 5);
        const endX = x + (Ex / E) * scale;
        const endY = y + (Ey / E) * scale;

        vectors.push(
          <line
            key={`vector-${x}-${y}`}
            x1={x}
            y1={y}
            x2={endX}
            y2={endY}
            stroke="#22c55e"
            strokeWidth="2"
            strokeLinecap="round"
            markerEnd="url(#elecPlayArrowGreen)"
            opacity="0.7"
          />
        );
      }
    }

    return <g>{vectors}</g>;
  }, [showFieldVectors, sourceCharges, calculateField]);

  // Phase renderers
  const renderHook = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '24px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', backgroundColor: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '20px', marginBottom: '24px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#06b6d4' }} />
        <span style={{ color: '#22d3ee', fontSize: '14px', fontWeight: 600 }}>Electromagnetic Physics</span>
      </div>

      <h1 style={{ fontSize: isMobile ? '28px' : '36px', fontWeight: 800, background: 'linear-gradient(135deg, #22d3ee, #3b82f6, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: '12px' }}>
        Electric Fields
      </h1>

      <p style={{ color: '#94a3b8', fontSize: '18px', fontWeight: 400, marginBottom: '32px', maxWidth: '400px', lineHeight: 1.6 }}>
        Visualize the invisible force that shapes our universe
      </p>

      <div style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '24px', maxWidth: '600px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
        <svg viewBox="0 0 500 300" className="w-full max-w-md mx-auto mb-6">
          <defs>
            {/* Premium gradient for positive charge - 3D effect */}
            <radialGradient id="elecHookPosGrad" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#991b1b" />
            </radialGradient>
            {/* Glow filter for positive charge */}
            <filter id="elecHookPosGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feFlood floodColor="#ef4444" floodOpacity="0.6" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Test charge gradient - 3D effect */}
            <radialGradient id="elecHookTestGrad" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#166534" />
            </radialGradient>
            {/* Glow filter for test charge */}
            <filter id="elecHookTestGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#22c55e" floodOpacity="0.5" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Field line gradient */}
            <linearGradient id="elecHookFieldLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.3" />
            </linearGradient>
            {/* Arrow marker with gradient */}
            <marker id="elecHookArrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 L2,5 Z" fill="#ef4444" />
            </marker>
            {/* Force arrow marker */}
            <marker id="elecHookForceArrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 L2,5 Z" fill="#4ade80" />
            </marker>
            {/* Grid pattern */}
            <pattern id="elecHookGrid" width="25" height="25" patternUnits="userSpaceOnUse">
              <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#1e3a5f" strokeWidth="0.5" opacity="0.5" />
            </pattern>
            {/* Outer glow for charge */}
            <radialGradient id="elecHookChargeAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#ef4444" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background with grid */}
          <rect x="0" y="0" width="500" height="300" fill="#0a0f1a" rx="12" />
          <rect x="0" y="0" width="500" height="300" fill="url(#elecHookGrid)" rx="12" />

          {/* Subtle radial background glow */}
          <circle cx="250" cy="150" r="140" fill="url(#elecHookChargeAura)">
            <animate attributeName="r" values="120;150;120" dur="3s" repeatCount="indefinite" />
          </circle>

          {/* Animated field lines radiating from center */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
            const angle = (i * 45) * Math.PI / 180;
            const pulseOffset = Math.sin(animationTime * 2 + i * 0.5) * 10;
            const startR = 45;
            const endR = 125 + pulseOffset;
            return (
              <line
                key={`line-${i}`}
                x1={250 + Math.cos(angle) * startR}
                y1={150 + Math.sin(angle) * startR}
                x2={250 + Math.cos(angle) * endR}
                y2={150 + Math.sin(angle) * endR}
                stroke="url(#elecHookFieldLineGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                markerEnd="url(#elecHookArrow)"
                opacity={0.7 + Math.sin(animationTime + i) * 0.2}
              />
            );
          })}

          {/* Central positive charge with premium glow */}
          <circle cx="250" cy="150" r="32" fill="url(#elecHookPosGrad)" filter="url(#elecHookPosGlow)">
            <animate attributeName="r" values="30;34;30" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x="250" y="160" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>+</text>

          {/* Test charge being pushed with premium styling */}
          <g transform={`translate(${350 + Math.sin(animationTime * 3) * 20}, 150)`}>
            <circle r="14" fill="url(#elecHookTestGrad)" filter="url(#elecHookTestGlow)" />
            <text y="5" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>q</text>
          </g>

          {/* Force arrow with enhanced styling */}
          <line
            x1={320 + Math.sin(animationTime * 3) * 20}
            y1={150}
            x2={385 + Math.sin(animationTime * 3) * 20}
            y2={150}
            stroke="#4ade80"
            strokeWidth="3"
            strokeLinecap="round"
            markerEnd="url(#elecHookForceArrow)"
            opacity="0.9"
          />
        </svg>
        <p style={{ textAlign: 'center', color: 'rgba(148,163,184,1)', fontFamily: 'monospace', fontSize: typo.body }}>
          E = F/q = kQ/r<sup>2</sup>
        </p>

        <p style={{ fontSize: '20px', color: '#cbd5e1', marginBottom: '16px', lineHeight: 1.5 }}>
          Invisible force fields surround every charge...
        </p>
        <p style={{ fontSize: '18px', color: '#22d3ee', fontWeight: 600 }}>
          How can we "see" and measure these electric fields?
        </p>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px' }}>
          The field exists at every point in space, even with no test charge present
        </p>
      </div>

      <button
        onClick={() => goToPhase('predict')}
        style={{ marginTop: '32px', padding: '16px 32px', background: 'linear-gradient(135deg, #0891b2, #2563eb)', color: 'white', fontSize: '18px', fontWeight: 700, borderRadius: '16px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(6,182,212,0.3)', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        Start Exploring →
      </button>

      <p style={{ marginTop: '16px', color: '#64748b', fontSize: '14px' }}>
        Tap to begin your exploration
      </p>
    </div>
  );

  const renderPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Make Your Prediction</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <p className="text-lg text-slate-300 mb-4">
          A positive test charge is placed near a large negative source charge.
          The test charge experiences a force pulling it toward the source.
        </p>
        <svg viewBox="0 0 400 150" className="w-full max-w-sm mx-auto my-4">
          <defs>
            {/* Premium gradient for negative charge - 3D effect */}
            <radialGradient id="elecPredictNegGrad" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e40af" />
            </radialGradient>
            {/* Glow filter for negative charge */}
            <filter id="elecPredictNegGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor="#3b82f6" floodOpacity="0.5" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Test charge gradient */}
            <radialGradient id="elecPredictTestGrad" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#166534" />
            </radialGradient>
            {/* Glow filter for test charge */}
            <filter id="elecPredictTestGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#22c55e" floodOpacity="0.4" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Force arrow gradient */}
            <linearGradient id="elecPredictForceGrad" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
            {/* Arrow marker */}
            <marker id="elecPredictArrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 L2,4 Z" fill="#4ade80" />
            </marker>
            {/* Grid pattern */}
            <pattern id="elecPredictGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" opacity="0.4" />
            </pattern>
            {/* Blue charge aura */}
            <radialGradient id="elecPredictBlueAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width="400" height="150" fill="#0f172a" rx="8" />
          <rect x="0" y="0" width="400" height="150" fill="url(#elecPredictGrid)" rx="8" />

          {/* Blue charge aura */}
          <circle cx="100" cy="75" r="60" fill="url(#elecPredictBlueAura)" />

          {/* Negative source charge with premium styling */}
          <circle cx="100" cy="75" r="30" fill="url(#elecPredictNegGrad)" filter="url(#elecPredictNegGlow)" />
          <text x="100" y="88" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>-</text>

          {/* Test charge with premium styling */}
          <circle cx="280" cy="75" r="15" fill="url(#elecPredictTestGrad)" filter="url(#elecPredictTestGlow)" />
          <text x="280" y="81" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>+</text>

          {/* Force arrow with gradient */}
          <line x1="250" y1="75" x2="175" y2="75" stroke="url(#elecPredictForceGrad)" strokeWidth="4" strokeLinecap="round" markerEnd="url(#elecPredictArrow)" />
        </svg>
        {/* Labels moved outside SVG using typo system */}
        <div className="flex justify-between max-w-sm mx-auto px-4 mb-2">
          <span className="text-blue-400" style={{ fontSize: typo.small }}>Source: -Q</span>
          <span className="text-green-400" style={{ fontSize: typo.small }}>Test: +q</span>
        </div>
        <div className="flex justify-center items-center gap-4 mb-2">
          <span className="text-green-400 font-medium" style={{ fontSize: typo.small }}>F (force)</span>
          <span className="text-yellow-400 font-bold" style={{ fontSize: typo.bodyLarge }}>E = ?</span>
        </div>
        <p className="text-cyan-400 font-medium">
          What is the direction of the electric field at the test charge's location?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'Away from the negative charge (pointing right)' },
          { id: 'B', text: 'Perpendicular to the line between charges' },
          { id: 'C', text: 'Toward the negative charge (pointing left)' },
          { id: 'D', text: 'Electric field has no direction, only magnitude' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{ zIndex: 10 }}
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
            Correct! Electric field points toward negative charges!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            E is defined as the direction a <em>positive</em> test charge would be pushed.
            Since positive charges are attracted to negative charges, E points toward -Q.
          </p>
          <button
            onClick={() => goToPhase('play')}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-semibold rounded-xl hover:from-yellow-500 hover:to-orange-500 transition-all duration-300"
          >
            Explore the Field Lab
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => {
    const { Ex, Ey, E } = calculateField(testChargePos.x, testChargePos.y);
    const angle = Math.atan2(Ey, Ex) * 180 / Math.PI;

    return (
      <div className="flex flex-col items-center p-4 md:p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Electric Field Lab</h2>

        {/* Side-by-side layout */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '20px',
          width: '100%',
          alignItems: isMobile ? 'center' : 'flex-start',
          maxWidth: '900px',
        }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
        <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 w-full">
          <svg
            ref={svgRef}
            viewBox="0 0 500 400"
            className="w-full bg-slate-900 rounded-xl cursor-crosshair"
            onPointerMove={handleMouseMove}
            onPointerUp={handleMouseUp}
            onPointerLeave={handleMouseUp}
          >
            <defs>
              {/* Premium positive charge gradient - 3D sphere effect */}
              <radialGradient id="elecPlayPosGrad" cx="35%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#fca5a5" />
                <stop offset="40%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#991b1b" />
              </radialGradient>
              {/* Premium negative charge gradient - 3D sphere effect */}
              <radialGradient id="elecPlayNegGrad" cx="35%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="40%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1e40af" />
              </radialGradient>
              {/* Test charge gradient */}
              <radialGradient id="elecPlayTestGrad" cx="35%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#86efac" />
                <stop offset="40%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#166534" />
              </radialGradient>
              {/* Glow filter for positive charges */}
              <filter id="elecPlayPosGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feFlood floodColor="#ef4444" floodOpacity="0.5" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Glow filter for negative charges */}
              <filter id="elecPlayNegGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feFlood floodColor="#3b82f6" floodOpacity="0.5" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Glow filter for test charge */}
              <filter id="elecPlayTestGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feFlood floodColor="#22c55e" floodOpacity="0.4" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Active drag glow */}
              <filter id="elecPlayDragGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feFlood floodColor="#fbbf24" floodOpacity="0.6" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Field line gradients */}
              <linearGradient id="elecPlayFieldLineRedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="elecPlayFieldLineBlueGrad" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
              </linearGradient>
              {/* Arrow markers with better styling */}
              <marker id="elecPlayArrowRed" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 L2,4 Z" fill="#ef4444" />
              </marker>
              <marker id="elecPlayArrowBlue" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 L2,4 Z" fill="#3b82f6" />
              </marker>
              <marker id="elecPlayArrowGreen" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 L2,4 Z" fill="#22c55e" />
              </marker>
              <marker id="elecPlayArrowYellow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 L2,4 Z" fill="#fbbf24" />
              </marker>
              {/* Grid pattern */}
              <pattern id="elecPlayGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e3a5f" strokeWidth="0.5" opacity="0.6" />
              </pattern>
              {/* Equipotential line glow */}
              <filter id="elecPlayEquipotGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feFlood floodColor="#a855f7" floodOpacity="0.3" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Charge auras */}
              <radialGradient id="elecPlayPosAura" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="elecPlayNegAura" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Background with premium grid */}
            <rect x="0" y="0" width="500" height="400" fill="#0a0f1a" />
            <rect x="0" y="0" width="500" height="400" fill="url(#elecPlayGrid)" />

            {/* Educational labels */}
            <text x="250" y="18" textAnchor="middle" fill="#93c5fd" fontSize="12" fontWeight="bold">Electric Field Map</text>
            <text x="250" y="393" textAnchor="middle" fill="#a78bfa" fontSize="11">X-axis (position, m)</text>
            <text x="12" y="200" textAnchor="middle" fill="#a78bfa" fontSize="11" transform="rotate(-90, 12, 200)">Y-axis (position, m)</text>
            <text x="15" y="370" fill="#a78bfa" fontSize="11">E = kQ/r² (Coulomb's Law)</text>
            <text x="485" y="370" textAnchor="end" fill="#6ee7b7" fontSize="11">Drag test charge to explore</text>

            {/* E vs distance curve - shows inverse square law visually */}
            {(() => {
              const curvePoints: string[] = [];
              const chartX0 = 350;
              const chartY0 = 30;
              const chartW = 140;
              const chartH = 340;
              const qFrac = chargeMagnitude / 10;
              for (let i = 0; i <= 20; i++) {
                const frac = i / 20;
                const rVal = 1 + frac * 4;
                const eVal = qFrac / (rVal * rVal);
                const eNorm = eVal;
                const px = chartX0 + frac * chartW;
                const py = chartY0 + chartH - eNorm * chartH;
                curvePoints.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`);
              }
              const interFrac = 0.3;
              const rValInter = 1 + interFrac * 4;
              const eValInter = qFrac / (rValInter * rValInter);
              const eNormInter = eValInter;
              const markerCx = chartX0 + interFrac * chartW;
              const markerCy = chartY0 + chartH - eNormInter * chartH;
              return (
                <g>
                  <rect x={chartX0 - 5} y={chartY0 - 5} width={chartW + 10} height={chartH + 25} rx="6" fill="rgba(15,23,42,0.85)" stroke="#334155" strokeWidth="1" />
                  <text x={chartX0 + chartW / 2} y={chartY0 + chartH + 14} textAnchor="middle" fill="#94a3b8" fontSize="11">Distance (r)</text>
                  <text x={chartX0 - 2} y={chartY0 + 5} fill="#94a3b8" fontSize="11" textAnchor="end">E</text>
                  <line x1={chartX0} y1={chartY0} x2={chartX0} y2={chartY0 + chartH} stroke="#475569" strokeWidth="1" opacity="0.5" />
                  <line x1={chartX0} y1={chartY0 + chartH} x2={chartX0 + chartW} y2={chartY0 + chartH} stroke="#475569" strokeWidth="1" opacity="0.5" />
                  <path d={curvePoints.join(' ')} fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
                  <circle cx={markerCx} cy={markerCy} r="7" fill="#fbbf24" stroke="#fff" strokeWidth="1.5" filter="url(#elecPlayDragGlow)" data-interactive="true" />
                </g>
              );
            })()}

            {/* Charge auras (ambient glow behind charges) */}
            {sourceCharges.map(charge => (
              <circle
                key={`aura-${charge.id}`}
                cx={charge.x}
                cy={charge.y}
                r={50 + Math.sin(animationTime * 2) * 5}
                fill={charge.q > 0 ? 'url(#elecPlayPosAura)' : 'url(#elecPlayNegAura)'}
              />
            ))}

            {/* Field lines */}
            {renderFieldLines()}

            {/* Field vectors */}
            {renderFieldVectors()}

            {/* Source charges with premium 3D styling */}
            {sourceCharges.map(charge => (
              <g key={charge.id}>
                <circle
                  cx={charge.x}
                  cy={charge.y}
                  r={20 + Math.sin(animationTime * 3) * 2}
                  fill={charge.q > 0 ? 'url(#elecPlayPosGrad)' : 'url(#elecPlayNegGrad)'}
                  filter={charge.q > 0 ? 'url(#elecPlayPosGlow)' : 'url(#elecPlayNegGlow)'}
                />
                <text
                  x={charge.x}
                  y={charge.y + (charge.q > 0 ? 8 : 10)}
                  textAnchor="middle"
                  fill="white"
                  fontSize={charge.q > 0 ? '24' : '28'}
                  fontWeight="bold"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                >
                  {charge.q > 0 ? '+' : '-'}
                </text>
              </g>
            ))}

            {/* Test charge (draggable) with premium styling */}
            <g
              onPointerDown={() => setIsDraggingTestCharge(true)}
              style={{ cursor: 'grab' }}
            >
              <circle
                cx={testChargePos.x}
                cy={testChargePos.y}
                r="16"
                fill="url(#elecPlayTestGrad)"
                filter={isDraggingTestCharge ? 'url(#elecPlayDragGlow)' : 'url(#elecPlayTestGlow)'}
              />
              <text
                x={testChargePos.x}
                y={testChargePos.y + 5}
                textAnchor="middle"
                fill="white"
                fontSize="14"
                fontWeight="bold"
                className="pointer-events-none"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
              >
                q
              </text>

              {/* Field vector at test charge with enhanced styling */}
              {E > 1e6 && (
                <line
                  x1={testChargePos.x}
                  y1={testChargePos.y}
                  x2={testChargePos.x + (Ex / E) * 35}
                  y2={testChargePos.y + (Ey / E) * 35}
                  stroke="#fbbf24"
                  strokeWidth="3"
                  strokeLinecap="round"
                  markerEnd="url(#elecPlayArrowYellow)"
                  className="pointer-events-none"
                  opacity="0.9"
                />
              )}
            </g>
          </svg>
          {/* Instruction text moved outside SVG using typo system */}
          <p className="text-center text-slate-500 mt-2" style={{ fontSize: typo.small }}>
            Drag the test charge (q) to explore the field
          </p>
        </div>
        </div>

        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
        {/* Configuration selector */}
        <div className="flex gap-2 mb-4 flex-wrap justify-center">
          {[
            { key: 'single', label: 'Single Charge', icon: '+' },
            { key: 'dipole', label: 'Dipole', icon: '+-' },
            { key: 'parallel', label: 'Parallel Plates', icon: '||' }
          ].map(config => (
            <button
              key={config.key}
              onClick={() => {
                setSelectedConfig(config.key as typeof selectedConfig);
                emitGameEvent('value_changed', { config: config.key });
              }}
              style={{ zIndex: 10 }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedConfig === config.key
                  ? 'bg-yellow-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {config.icon} {!isMobile && config.label}
            </button>
          ))}
        </div>

        {/* Charge Magnitude Slider */}
        <div style={{ touchAction: 'pan-y', width: '100%', maxWidth: '672px', marginBottom: '16px', backgroundColor: 'rgba(30,41,59,0.5)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(51,65,85,0.5)' }}>
          <label className="block text-slate-300 font-medium mb-2">
            Charge Magnitude (Q): {chargeMagnitude} uC
          </label>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={chargeMagnitude}
            onChange={(e) => {
              const val = Number(e.target.value);
              setChargeMagnitude(val);
              emitGameEvent('slider_changed', { parameter: 'chargeMagnitude', value: val });
            }}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            style={{ accentColor: '#3b82f6', touchAction: 'pan-y', height: '20px', width: '100%' }}
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>1 uC</span>
            <span>10 uC</span>
          </div>
          <p className="text-slate-400 text-xs mt-2">
            When you increase the charge magnitude, the electric field strength increases proportionally. This demonstrates why high voltage power lines use careful insulation - stronger charges create more intense fields.
          </p>
        </div>

        {/* Display toggles */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mb-4">
          <button
            onClick={() => setShowFieldLines(!showFieldLines)}
            style={{ zIndex: 10 }}
            className={`p-3 rounded-xl transition-colors ${
              showFieldLines ? 'bg-red-600' : 'bg-slate-700'
            } text-white font-medium`}
          >
            {showFieldLines ? 'Field Lines: ON' : 'Field Lines: OFF'}
          </button>
          <button
            onClick={() => setShowFieldVectors(!showFieldVectors)}
            style={{ zIndex: 10 }}
            className={`p-3 rounded-xl transition-colors ${
              showFieldVectors ? 'bg-green-600' : 'bg-slate-700'
            } text-white font-medium`}
          >
            {showFieldVectors ? 'Vectors: ON' : 'Vectors: OFF'}
          </button>
        </div>

        {/* Educational explanation */}
        <div style={{ width: '100%', maxWidth: '672px', marginBottom: '16px', backgroundColor: 'rgba(6,182,212,0.1)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(6,182,212,0.2)' }}>
          <p className="text-cyan-400 text-sm font-medium mb-2">
            This visualization shows how electric field lines radiate from charges.
          </p>
          <p className="text-slate-400 text-xs">
            Understanding electric fields is important for real-world applications like designing capacitors, touchscreens, and high-voltage equipment. Engineers use these principles to control electron beams in displays and to prevent dangerous electrical discharges.
          </p>
        </div>

        {/* Field information */}
        <div style={{ width: '100%', maxWidth: '672px', backgroundColor: 'rgba(30,41,59,0.7)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(51,65,85,0.5)' }}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-slate-400 text-sm">Current Field Magnitude:</p>
              <p className="text-xl font-bold text-yellow-400">
                {E > 1e6 ? (E / 1e6).toFixed(1) + ' MN/C' : '~0 N/C'}
              </p>
              <p className="text-slate-500 text-xs">Reference: 5.0 MN/C at Q=5uC, r=3cm</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Current Field Direction:</p>
              <p className="text-xl font-bold text-cyan-400">
                {E > 1e6 ? angle.toFixed(0) + ' deg' : 'N/A'}
              </p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-slate-400 text-sm">Test Charge Position:</p>
              <p className="text-sm font-medium text-slate-300">
                ({testChargePos.x.toFixed(0)}, {testChargePos.y.toFixed(0)})
              </p>
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-2">
            E = kQ/r^2 for point charges | E = V/d for parallel plates
          </p>
        </div>
        </div>
        </div>

        <button
          onClick={() => goToPhase('review')}
          style={{ zIndex: 10 }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-semibold rounded-xl hover:from-yellow-500 hover:to-orange-500 transition-all duration-300"
        >
          Review Key Concepts
        </button>
      </div>
    );
  };

  const renderReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Electric Field Fundamentals</h2>

      {/* Reference to prediction */}
      <div className="bg-slate-800/50 rounded-xl p-4 max-w-2xl mb-6 text-center">
        <p className="text-cyan-400 text-sm">
          As you observed in the experiment, the electric field points toward negative charges and away from positive charges - exactly as you predicted! The field strength follows the inverse square law.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-gradient-to-br from-yellow-900/50 to-orange-900/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-yellow-400 mb-3">Field Definition</h3>
          <div className="space-y-3 text-slate-300 text-sm">
            <p className="text-lg text-center font-mono bg-slate-900/50 rounded-lg p-3">
              E = F/q (N/C or V/m)
            </p>
            <ul className="space-y-2">
              <li>- Force per unit positive test charge</li>
              <li>- Vector quantity (magnitude + direction)</li>
              <li>- Exists at every point in space</li>
              <li>- Independent of whether test charge is present</li>
            </ul>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-900/50 to-red-800/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-red-400 mb-3">Point Charge Field</h3>
          <div className="space-y-3 text-slate-300 text-sm">
            <p className="text-center font-mono bg-slate-900/50 rounded-lg p-3">
              E = kQ/r^2
            </p>
            <ul className="space-y-2">
              <li>- Radial field (outward from + or inward to -)</li>
              <li>- Inverse square law (like gravity)</li>
              <li>- k = 8.99 x 10^9 N m^2/C^2</li>
              <li>- Superposition: E_total = E1 + E2 + ...</li>
            </ul>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-blue-400 mb-3">Field Line Rules</h3>
          <div className="space-y-3 text-slate-300 text-sm">
            <ul className="space-y-2">
              <li>- Start on positive charges, end on negative</li>
              <li>- Never cross (field has unique direction at each point)</li>
              <li>- Denser lines = stronger field</li>
              <li>- Tangent to line = field direction at that point</li>
              <li>- Perpendicular to conductor surfaces</li>
            </ul>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-900/50 to-cyan-800/30 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-cyan-400 mb-3">Uniform Field</h3>
          <div className="space-y-3 text-slate-300 text-sm">
            <p className="text-center font-mono bg-slate-900/50 rounded-lg p-3">
              E = V/d (parallel plates)
            </p>
            <ul className="space-y-2">
              <li>- Constant magnitude and direction</li>
              <li>- Between large parallel plates</li>
              <li>- Field lines are parallel and equally spaced</li>
              <li>- Used in capacitors, deflection systems</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        onClick={() => goToPhase('twist_predict')}
        style={{ zIndex: 10 }}
        className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Discover a Surprising Twist
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">The Twist Challenge</h2>
      <div className="bg-slate-800/50 rounded-2xl p-6 max-w-2xl mb-6">
        <svg viewBox="0 0 400 300" className="w-full max-w-md mx-auto mb-4">
          <defs>
            {/* Premium positive charge gradient */}
            <radialGradient id="elecTwistPredPosGrad" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#991b1b" />
            </radialGradient>
            {/* Premium negative charge gradient */}
            <radialGradient id="elecTwistPredNegGrad" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e40af" />
            </radialGradient>
            {/* Positive glow */}
            <filter id="elecTwistPredPosGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#ef4444" floodOpacity="0.5" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Negative glow */}
            <filter id="elecTwistPredNegGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#3b82f6" floodOpacity="0.5" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Question mark glow */}
            <filter id="elecTwistPredQGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#fbbf24" floodOpacity="0.6" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Grid pattern */}
            <pattern id="elecTwistPredGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" opacity="0.4" />
            </pattern>
            {/* Charge auras */}
            <radialGradient id="elecTwistPredPosAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="elecTwistPredNegAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width="400" height="300" fill="#0f172a" rx="8" />
          <rect x="0" y="0" width="400" height="300" fill="url(#elecTwistPredGrid)" rx="8" />

          {/* Title */}
          <text x="200" y="25" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">Electric Dipole - Field at Midpoint?</text>

          {/* Charge auras */}
          <circle cx="130" cy="150" r="50" fill="url(#elecTwistPredPosAura)" />
          <circle cx="270" cy="150" r="50" fill="url(#elecTwistPredNegAura)" />

          {/* Connection line hint */}
          <line x1="155" y1="150" x2="245" y2="150" stroke="#475569" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" />

          {/* Curved field line hints spanning vertical space */}
          <path d="M 130 150 Q 200 40 270 150" fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="4,4" opacity="0.4" />
          <path d="M 130 150 Q 200 260 270 150" fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="4,4" opacity="0.4" />

          {/* Dipole charges with premium styling */}
          <circle cx="130" cy="150" r="25" fill="url(#elecTwistPredPosGrad)" filter="url(#elecTwistPredPosGlow)" />
          <text x="130" y="160" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>+</text>

          <circle cx="270" cy="150" r="25" fill="url(#elecTwistPredNegGrad)" filter="url(#elecTwistPredNegGlow)" />
          <text x="270" y="162" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>-</text>

          {/* Animated question mark */}
          <text x="200" y="165" textAnchor="middle" fill="#fbbf24" fontSize="40" fontWeight="bold" filter="url(#elecTwistPredQGlow)">
            ?
            <animate attributeName="opacity" values="1;0.6;1" dur="1.5s" repeatCount="indefinite" />
          </text>

          {/* Bottom label */}
          <text x="200" y="290" textAnchor="middle" fill="#64748b" fontSize="11">What is the field strength at the midpoint?</text>
        </svg>
        {/* Labels moved outside SVG using typo system */}
        <div className="flex justify-between max-w-md mx-auto px-8 mb-2">
          <span className="text-red-400 font-medium" style={{ fontSize: typo.small }}>+Q</span>
          <span className="text-slate-400" style={{ fontSize: typo.small }}>Electric Dipole</span>
          <span className="text-blue-400 font-medium" style={{ fontSize: typo.small }}>-Q</span>
        </div>

        <p className="text-lg text-slate-300 mb-4">
          A positive charge (+Q) and negative charge (-Q) of equal magnitude are separated by a small distance, forming an electric dipole.
        </p>
        <p className="text-lg text-cyan-400 font-medium">
          What happens to the electric field exactly at the midpoint between the two charges?
        </p>
      </div>

      <div className="grid gap-3 w-full max-w-xl">
        {[
          { id: 'A', text: 'The field is zero because the charges cancel out' },
          { id: 'B', text: 'The field points from positive to negative (strongest here)' },
          { id: 'C', text: 'The field points from negative to positive' },
          { id: 'D', text: 'The field is perpendicular to the line between charges' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{ zIndex: 10 }}
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
            Correct! The fields add up, they don't cancel!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Both charges create fields pointing from + to - at the midpoint.
            The fields are in the SAME direction, so they reinforce each other!
            The midpoint has a strong field, not zero.
          </p>
          <button
            onClick={() => goToPhase('twist_play')}
            style={{ zIndex: 10 }}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
          >
            See the Dipole Field
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-4">Dipole Field Visualization</h2>

      {/* Side-by-side layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        alignItems: isMobile ? 'center' : 'flex-start',
        maxWidth: '900px',
      }}>
      <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
      <div className="bg-slate-800/50 rounded-2xl p-6 mb-6">
        <svg viewBox="0 0 500 300" className="w-full">
          <defs>
            {/* Premium positive charge gradient */}
            <radialGradient id="elecTwistPlayPosGrad" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#991b1b" />
            </radialGradient>
            {/* Premium negative charge gradient */}
            <radialGradient id="elecTwistPlayNegGrad" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e40af" />
            </radialGradient>
            {/* Positive glow filter */}
            <filter id="elecTwistPlayPosGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor="#ef4444" floodOpacity="0.5" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Negative glow filter */}
            <filter id="elecTwistPlayNegGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood floodColor="#3b82f6" floodOpacity="0.5" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Field line gradient */}
            <linearGradient id="elecTwistPlayFieldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
            </linearGradient>
            {/* Arrow gradient */}
            <linearGradient id="elecTwistPlayArrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
            {/* Arrow marker */}
            <marker id="elecTwistPlayArrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 L2,4 Z" fill="#22c55e" />
            </marker>
            {/* Grid pattern */}
            <pattern id="elecTwistPlayGrid" width="25" height="25" patternUnits="userSpaceOnUse">
              <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#1e3a5f" strokeWidth="0.5" opacity="0.5" />
            </pattern>
            {/* Charge auras */}
            <radialGradient id="elecTwistPlayPosAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="elecTwistPlayNegAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
            {/* Field line glow */}
            <filter id="elecTwistPlayLineGlow" x="-10%" y="-50%" width="120%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feFlood floodColor="#a855f7" floodOpacity="0.3" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x="0" y="0" width="500" height="300" fill="#0a0f1a" rx="12" />
          <rect x="0" y="0" width="500" height="300" fill="url(#elecTwistPlayGrid)" rx="12" />

          {/* Title */}
          <text x="250" y="20" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">Dipole Field Pattern</text>

          {/* Charge auras */}
          <circle cx="150" cy="150" r="60" fill="url(#elecTwistPlayPosAura)">
            <animate attributeName="r" values="55;65;55" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="350" cy="150" r="60" fill="url(#elecTwistPlayNegAura)">
            <animate attributeName="r" values="55;65;55" dur="3s" repeatCount="indefinite" />
          </circle>

          {/* Dipole field lines with gradient - spread vertically */}
          {[0, 1, 2, 3, 4, 5].map(i => {
            const yOffset = (i - 2.5) * 40;
            const amplitude = 80 + Math.abs(i - 2.5) * 30;
            return (
              <path
                key={`dipole-line-${i}`}
                d={`M 150 ${150 + yOffset} Q 250 ${150 + yOffset - amplitude * Math.sign(yOffset || 1)} 350 ${150 + yOffset}`}
                fill="none"
                stroke="url(#elecTwistPlayFieldGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.7"
                filter="url(#elecTwistPlayLineGlow)"
              />
            );
          })}

          {/* Field arrows along middle line with enhanced styling */}
          {[180, 215, 250, 285].map(x => (
            <line
              key={`arrow-${x}`}
              x1={x}
              y1="150"
              x2={x + 25}
              y2="150"
              stroke="url(#elecTwistPlayArrowGrad)"
              strokeWidth="3"
              strokeLinecap="round"
              markerEnd="url(#elecTwistPlayArrow)"
            />
          ))}

          {/* Positive charge with premium styling */}
          <circle cx="150" cy="150" r="25" fill="url(#elecTwistPlayPosGrad)" filter="url(#elecTwistPlayPosGlow)">
            <animate attributeName="r" values="23;27;23" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x="150" y="158" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>+</text>

          {/* Negative charge with premium styling */}
          <circle cx="350" cy="150" r="25" fill="url(#elecTwistPlayNegGrad)" filter="url(#elecTwistPlayNegGlow)">
            <animate attributeName="r" values="23;27;23" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x="350" y="160" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>-</text>

          {/* Bottom annotation for vertical distribution */}
          <text x="250" y="285" textAnchor="middle" fill="#64748b" fontSize="11">Field lines curve from + to - charge</text>
        </svg>
        {/* Labels moved outside SVG using typo system */}
        <p className="text-center text-green-400 font-bold mt-3" style={{ fontSize: typo.body }}>
          Field points from + to -
        </p>
        <p className="text-center text-slate-400 mt-1" style={{ fontSize: typo.small }}>
          Fields from both charges reinforce at the midpoint
        </p>
      </div>
      </div>

      <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
        <div className="mt-4 space-y-3 text-slate-300">
          <div className="flex items-start gap-3">
            <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">1</div>
            <p>The + charge creates a field pointing AWAY from itself (toward the right)</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">2</div>
            <p>The - charge creates a field pointing TOWARD itself (also toward the right)</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">3</div>
            <p>Both fields point in the SAME direction between the charges!</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold">4</div>
            <p>The total field is DOUBLED, not cancelled - superposition at work!</p>
          </div>
        </div>
      </div>
      </div>

      <button
        onClick={() => goToPhase('twist_review')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
      >
        Review the Discovery
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div className="flex flex-col items-center p-6">
      <h2 className="text-2xl font-bold text-purple-400 mb-6">Key Discovery: Dipole Fields</h2>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 max-w-2xl mb-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">The Superposition Principle</h3>
        <div className="space-y-4 text-slate-300">
          <p>
            Electric fields from multiple charges simply ADD as vectors. This leads to some surprising results:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Between opposite charges (dipole): fields REINFORCE</li>
            <li>Between like charges: fields CANCEL at the midpoint</li>
            <li>Dipole fields fall off as 1/r^3, faster than single charges</li>
            <li>Many molecules are dipoles (like water H2O)!</li>
          </ul>
          <div className="bg-slate-900/50 rounded-xl p-4 mt-4">
            <p className="text-cyan-400 font-medium">
              "Dipoles are everywhere - from water molecules to radio antennas.
              Understanding them unlocks chemistry and telecommunications!"
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 max-w-3xl mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">H2O</div>
          <p className="text-sm text-slate-300">Water Molecule (polar)</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">||</div>
          <p className="text-sm text-slate-300">Dipole Antenna</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">+-</div>
          <p className="text-sm text-slate-300">Polar Bonds</p>
        </div>
      </div>

      <button
        onClick={() => goToPhase('transfer')}
        style={{ zIndex: 10 }}
        className="mt-6 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-semibold rounded-xl hover:from-yellow-500 hover:to-orange-500 transition-all duration-300"
      >
        Explore Real-World Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div className="flex flex-col items-center p-4 md:p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Real-World Applications</h2>

      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {transferApps.map((app, index) => (
          <button
            key={index}
            onClick={() => {
              setActiveAppIndex(index);
              emitGameEvent('app_changed', { appIndex: index, appTitle: app.title });
            }}
            style={{ zIndex: 10 }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeAppIndex === index
                ? 'bg-yellow-600 text-white'
                : completedApps.has(index)
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {app.icon} {isMobile ? '' : app.short}
          </button>
        ))}
      </div>

      <div className={`bg-gradient-to-br ${transferApps[activeAppIndex].color} rounded-2xl p-6 max-w-2xl w-full`}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{transferApps[activeAppIndex].icon}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{transferApps[activeAppIndex].title}</h3>
            <p className="text-slate-300 text-sm">{transferApps[activeAppIndex].tagline}</p>
          </div>
        </div>

        <p className="text-slate-200 mb-4">{transferApps[activeAppIndex].description}</p>

        <div className="bg-black/20 rounded-xl p-4 mb-4">
          <h4 className="text-cyan-400 font-semibold mb-2">Physics Connection</h4>
          <p className="text-slate-300 text-sm">{transferApps[activeAppIndex].connection}</p>
        </div>

        <div className="bg-black/20 rounded-xl p-4 mb-4">
          <h4 className="text-yellow-400 font-semibold mb-2">How It Works</h4>
          <p className="text-slate-300 text-sm">{transferApps[activeAppIndex].howItWorks}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-black/20 rounded-xl p-4">
            <h4 className="text-green-400 font-semibold mb-2">Key Stats</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              {transferApps[activeAppIndex].stats.map((stat, i) => (
                <li key={i}>- {stat}</li>
              ))}
            </ul>
          </div>

          <div className="bg-black/20 rounded-xl p-4">
            <h4 className="text-orange-400 font-semibold mb-2">Examples</h4>
            <ul className="text-slate-300 text-sm space-y-1">
              {transferApps[activeAppIndex].examples.map((ex, i) => (
                <li key={i}>- {ex}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-black/20 rounded-xl p-4 mb-4">
          <h4 className="text-purple-400 font-semibold mb-2">Future Impact</h4>
          <p className="text-slate-300 text-sm">{transferApps[activeAppIndex].futureImpact}</p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {transferApps[activeAppIndex].companies.map((company, i) => (
            <span key={i} style={{ padding: '4px 8px', backgroundColor: 'rgba(100,116,139,0.3)', borderRadius: '4px', fontSize: '12px', color: '#cbd5e1' }}>
              {company}
            </span>
          ))}
        </div>

        <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(148,163,184,1)', fontWeight: 400, lineHeight: 1.6, margin: 0 }}>
            Electric fields are used in applications spanning over 500 km of high-voltage transmission lines operating at 765 kV. Modern capacitors can store 10 W of power per kilogram, with discharge times under 5 ms. Electrostatic precipitators clean over 100 million tons of exhaust annually, removing particles as small as 10 nm. Touchscreens respond in under 8 ms with 0.1 mm precision. The global market for these technologies exceeds $200 billion annually.
          </p>
        </div>

        {!completedApps.has(activeAppIndex) && (
          <button
            onClick={() => handleAppComplete(activeAppIndex)}
            style={{ zIndex: 10 }}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-colors"
          >
            Mark as Understood
          </button>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <span className="text-slate-400">Progress:</span>
        <div className="flex gap-1">
          {transferApps.map((_, i) => (
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
          style={{ zIndex: 10 }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-semibold rounded-xl hover:from-yellow-500 hover:to-orange-500 transition-all duration-300"
        >
          Take the Knowledge Test
        </button>
      )}
    </div>
  );

  const renderTest = () => {
    const q = testQuestions[currentQuestion];
    const isConfirmed = confirmedIndex === currentQuestion;
    const score = calculateTestScore();

    if (showTestResults) {
      return (
        <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ backgroundColor: 'rgba(30,41,59,0.5)', borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '20px', border: '1px solid rgba(51,65,85,0.5)' }}>
            <p style={{ fontSize: '48px', marginBottom: '8px' }}>{score >= 7 ? 'E' : '?'}</p>
            <p style={{ fontSize: '32px', fontWeight: 800, color: score >= 7 ? '#10b981' : '#f59e0b', margin: '0 0 8px' }}>
              {score}/10
            </p>
            <p style={{ fontSize: '16px', color: '#94a3b8', margin: 0 }}>
              {score >= 7 ? "Excellent! You've mastered Electric Fields!" : 'Keep studying!'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>Knowledge Test</h2>
        <p style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 400, marginBottom: '16px', lineHeight: 1.6 }}>
          Apply your understanding of electric fields, field lines, superposition, and real-world applications to solve challenging physics scenarios. Question {currentQuestion + 1} of 10.
        </p>

        <div style={{ display: 'flex', gap: '3px', marginBottom: '20px' }}>
          {Array(10).fill(0).map((_, i) => (
            <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: i < currentQuestion ? '#10b981' : i === currentQuestion ? '#3b82f6' : '#1e293b' }} />
          ))}
        </div>

        <div style={{ backgroundColor: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
          <p style={{ fontSize: '14px', color: '#22d3ee', fontStyle: 'italic', margin: 0 }}>{q.scenario}</p>
        </div>

        <p style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '16px' }}>{q.question}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {q.options.map((opt, i) => {
            const isSelected = testAnswers[currentQuestion] === i;
            const isCorrectOption = opt.correct;
            const showResult = isConfirmed;

            let borderColor = isSelected ? '#3b82f6' : '#334155';
            let bgColor = isSelected ? 'rgba(59,130,246,0.15)' : '#0f172a';

            if (showResult) {
              if (isCorrectOption) {
                borderColor = '#10b981';
                bgColor = 'rgba(16,185,129,0.2)';
              } else if (isSelected && !isCorrectOption) {
                borderColor = '#ef4444';
                bgColor = 'rgba(239,68,68,0.2)';
              }
            }

            return (
              <button key={i} onClick={() => { if (!isConfirmed) { const newA = [...testAnswers]; newA[currentQuestion] = i; setTestAnswers(newA); } }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', border: `2px solid ${borderColor}`, backgroundColor: bgColor, cursor: isConfirmed ? 'default' : 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: '16px', color: 'white' }}>
                  {showResult && isCorrectOption && <span style={{ color: '#10b981', marginRight: '8px' }}>&#10003;</span>}
                  {showResult && isSelected && !isCorrectOption && <span style={{ color: '#ef4444', marginRight: '8px' }}>&#10007;</span>}
                  {String.fromCharCode(65 + i)}) {opt.text}
                </span>
              </button>
            );
          })}
        </div>

        {/* Explanation box - shown after confirming answer */}
        {isConfirmed && (
          <div style={{ backgroundColor: q.options[testAnswers[currentQuestion]]?.correct ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${q.options[testAnswers[currentQuestion]]?.correct ? '#10b981' : '#ef4444'}`, borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: q.options[testAnswers[currentQuestion]]?.correct ? '#10b981' : '#ef4444', marginBottom: '8px' }}>
              {q.options[testAnswers[currentQuestion]]?.correct ? 'Correct!' : 'Incorrect'}
            </p>
            <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
              <strong>Explanation:</strong> {q.explanation}
            </p>
          </div>
        )}

        {!isConfirmed ? (
          <button onClick={() => { if (testAnswers[currentQuestion] !== -1) setConfirmedIndex(currentQuestion); }} disabled={testAnswers[currentQuestion] === -1} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: testAnswers[currentQuestion] !== -1 ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#1e293b', color: testAnswers[currentQuestion] !== -1 ? 'white' : '#64748b', fontSize: '16px', fontWeight: 700, cursor: testAnswers[currentQuestion] !== -1 ? 'pointer' : 'not-allowed', opacity: testAnswers[currentQuestion] !== -1 ? 1 : 0.5 }}>
            Check Answer
          </button>
        ) : currentQuestion < 9 ? (
          <button onClick={() => { setConfirmedIndex(null); setCurrentQuestion(currentQuestion + 1); }} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>
            Next Question
          </button>
        ) : (
          <button onClick={() => { setTestSubmitted(true); setShowTestResults(true); emitGameEvent('game_completed', { score: calculateTestScore(), maxScore: 10 }); }} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #10b981, #3b82f6)', color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>
            Submit Test
          </button>
        )}
      </div>
    );
  };

  const renderMastery = () => (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="bg-gradient-to-br from-yellow-900/50 via-orange-900/50 to-red-900/50 rounded-3xl p-8 max-w-2xl">
        <div className="text-8xl mb-6">E</div>
        <h1 className="text-3xl font-bold text-white mb-4">Electric Field Master!</h1>
        <p className="text-xl text-slate-300 mb-6">
          You have mastered the fundamental concept of electric fields!
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">F/q</div>
            <p className="text-sm text-slate-300">E = F/q</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">---</div>
            <p className="text-sm text-slate-300">Field Lines</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">+-</div>
            <p className="text-sm text-slate-300">Dipole Fields</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="text-2xl mb-2">App</div>
            <p className="text-sm text-slate-300">Applications</p>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
          <p className="text-yellow-400 font-mono text-lg">
            E = kQ/r^2 | E = V/d
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Field direction: toward - charges, away from + charges
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => goToPhase('hook')}
            style={{ zIndex: 10 }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            Explore Again
          </button>
        </div>
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
      if (phase === 'transfer') {
        return (
          <TransferPhaseView
            conceptName="Electric Field"
            applications={realWorldApps}
            onComplete={() => goToPhase('test')}
            isMobile={isMobile}
            colors={colors}
            typo={typo}
            playSound={playSound}
          />
        );
      }

      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  const phaseIndex = phaseOrder.indexOf(phase);
  const isFirstPhase = phaseIndex === 0;
  const isLastPhase = phaseIndex === phaseOrder.length - 1;
  const isTestPhase = phase === 'test';
  const canGoNext = !isLastPhase && (!isTestPhase || testSubmitted);

  const renderBottomBar = () => (
    <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
      <button onClick={() => !isFirstPhase && goToPhase(phaseOrder[phaseIndex - 1])} style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: isFirstPhase ? 'rgba(255,255,255,0.3)' : 'white', cursor: isFirstPhase ? 'not-allowed' : 'pointer', opacity: isFirstPhase ? 0.4 : 1, transition: 'all 0.3s ease' }}>
        ← Back
      </button>
      <div style={{ display: 'flex', gap: '6px' }}>
        {phaseOrder.map((p, i) => (
          <div key={p} onClick={() => i <= phaseIndex && goToPhase(p)} title={phaseLabels[p]} style={{ width: p === phase ? '20px' : '10px', height: '10px', borderRadius: '5px', background: p === phase ? '#3b82f6' : i < phaseIndex ? '#10b981' : 'rgba(255,255,255,0.2)', cursor: i <= phaseIndex ? 'pointer' : 'default', transition: 'all 0.3s ease' }} />
        ))}
      </div>
      <button onClick={() => canGoNext && goToPhase(phaseOrder[phaseIndex + 1])} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: canGoNext ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.1)', color: 'white', cursor: canGoNext ? 'pointer' : 'not-allowed', opacity: canGoNext ? 1 : 0.4, transition: 'all 0.3s ease' }}>
        Next →
      </button>
    </div>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0a0f1a 0%, #0f172a 50%, #0a0f1a 100%)', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', minHeight: '100vh' }}>
      {/* Top bar */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.9)', position: 'relative', zIndex: 10 }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>Electric Fields</span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {phaseOrder.map((p, i) => (
            <button key={p} aria-label={phaseLabels[p]} title={phaseLabels[p]} onClick={() => i <= phaseIndex && goToPhase(p)} style={{ width: phase === p ? '20px' : '8px', height: '8px', borderRadius: '4px', border: 'none', backgroundColor: i < phaseIndex ? '#10b981' : phase === p ? '#06b6d4' : '#334155', cursor: i <= phaseIndex ? 'pointer' : 'default', transition: 'all 0.3s ease' }} />
          ))}
        </div>
        <span style={{ fontSize: '14px', color: '#64748b' }}>{phaseIndex + 1}/10</span>
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative', paddingBottom: '100px', paddingTop: '48px' }}>
        <div style={{ position: 'fixed', top: 0, left: 0, width: `${((phaseIndex + 1) / 10) * 100}%`, height: '3px', background: 'linear-gradient(90deg, #06b6d4, #3b82f6)', transition: 'width 0.3s ease', zIndex: 20 }} />
        {renderPhase()}
      </div>
      {/* Bottom bar */}
      {renderBottomBar()}
    </div>
  );
};

export default ElectricFieldRenderer;
