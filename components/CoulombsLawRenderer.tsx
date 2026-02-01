'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// COULOMB'S LAW RENDERER - SPEC-COMPLIANT IMPLEMENTATION
// Follows GAME_TEST_SPECIFICATION.md exactly
// F = k × q₁ × q₂ / r² where k = 8.99 × 10⁹ N·m²/C²
// ============================================================================

// GameEvent interface - matches spec exactly
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

interface CoulombsLawRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility - matches spec
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

// Coulomb's constant
const k = 8.99e9; // N·m²/C²

const realWorldApps = [
  {
    icon: '⚡',
    title: 'Electrostatic Precipitators',
    short: 'Industrial air cleaning',
    tagline: 'Capturing pollution with electric force',
    description: 'Power plants and factories use Coulomb\'s law to remove particulates from exhaust. Charged particles are attracted to oppositely charged plates with forces proportional to q₁×q₂/r².',
    connection: 'Particles are given a strong negative charge by corona discharge. Coulomb attraction to positive collector plates pulls them out of the gas stream, achieving 99%+ removal efficiency.',
    howItWorks: 'Dirty gas flows between electrode plates. Corona wires give particles a negative charge. The charged particles experience F = kq₁q₂/r² toward positive plates, where they collect and are removed.',
    stats: [
      { value: '99%+', label: 'Removal efficiency', icon: '✅' },
      { value: '50kV', label: 'Operating voltage', icon: '⚡' },
      { value: '10M+ tons', label: 'Particles removed/year', icon: '🏭' }
    ],
    examples: ['Coal power plants', 'Cement factories', 'Steel mills', 'Paper mills'],
    companies: ['GE Environmental', 'Babcock & Wilcox', 'Siemens', 'FLSmidth'],
    futureImpact: 'Hybrid precipitators combining electrostatic and fabric filtration are achieving near-zero emissions for ultra-fine particles.',
    color: '#3B82F6'
  },
  {
    icon: '🖨️',
    title: 'Laser Printers & Copiers',
    short: 'Electrostatic imaging',
    tagline: 'Printing with charged toner particles',
    description: 'Laser printers use Coulomb forces to transfer toner particles to paper. Charged toner is attracted to oppositely charged areas on a drum, then transferred to paper by even stronger attraction.',
    connection: 'The photoconductor drum is selectively charged by a laser. Toner particles (charged to ~-20μC/g) experience Coulomb force toward positively charged image areas, creating the print.',
    howItWorks: 'A laser writes the image as a charge pattern on the drum. Toner is attracted to charged areas. Paper is given an even higher charge, pulling toner from drum to paper. Heat fuses the image.',
    stats: [
      { value: '1200 dpi', label: 'Print resolution', icon: '📝' },
      { value: '-20 μC/g', label: 'Toner charge', icon: '⚡' },
      { value: '50+ ppm', label: 'Print speed', icon: '⏱️' }
    ],
    examples: ['Office printers', 'Copy machines', 'Digital presses', 'Photo printers'],
    companies: ['HP', 'Canon', 'Xerox', 'Brother'],
    futureImpact: 'Direct-to-garment and 3D printing are extending electrostatic principles to new materials and applications.',
    color: '#8B5CF6'
  },
  {
    icon: '💊',
    title: 'Drug Delivery Systems',
    short: 'Targeted medicine',
    tagline: 'Guiding charged particles to their target',
    description: 'Some advanced drug delivery systems use charged nanoparticles that can be guided by electric fields to specific locations in the body, taking advantage of Coulomb forces.',
    connection: 'Charged drug carriers experience F = qE in an electric field. By controlling field strength and direction, particles can be concentrated at tumor sites or driven across cell membranes.',
    howItWorks: 'Drug molecules are attached to charged nanoparticles. External or implanted electrodes create electric fields. Coulomb force drives particles toward the treatment site, improving efficacy.',
    stats: [
      { value: '10x', label: 'Drug concentration increase', icon: '💉' },
      { value: '100 nm', label: 'Particle size', icon: '🔬' },
      { value: '$200B', label: 'Drug delivery market', icon: '💰' }
    ],
    examples: ['Cancer treatment', 'Gene therapy', 'Transdermal patches', 'Eye treatments'],
    companies: ['Novartis', 'Johnson & Johnson', 'Endo International', 'Inovio'],
    futureImpact: 'Electrochemically-controlled drug release could enable precise dosing based on real-time biomarker feedback.',
    color: '#10B981'
  },
  {
    icon: '🧪',
    title: 'Mass Spectrometry',
    short: 'Molecular identification',
    tagline: 'Sorting molecules by charge and mass',
    description: 'Mass spectrometers ionize molecules and use electric fields to accelerate and separate them. Coulomb force F = qE accelerates ions, with trajectory depending on mass-to-charge ratio.',
    connection: 'Ions are accelerated by electric fields where F = qE. Their paths through the analyzer depend on m/q ratio. This separates molecules by mass, enabling identification of unknown compounds.',
    howItWorks: 'Molecules are ionized (given charge q). An electric field accelerates them with F = qE. Magnetic or electric analyzers separate ions by m/q. Detectors measure ion abundance at each mass.',
    stats: [
      { value: '0.001 Da', label: 'Mass resolution', icon: '🎯' },
      { value: 'ppt', label: 'Detection limits', icon: '🔬' },
      { value: '$6B', label: 'Market size', icon: '📈' }
    ],
    examples: ['Proteomics research', 'Drug testing', 'Environmental analysis', 'Forensics'],
    companies: ['Thermo Fisher', 'Agilent', 'Waters', 'SCIEX'],
    futureImpact: 'Miniaturized mass specs and ambient ionization are enabling real-time chemical analysis in the field for security and medical diagnostics.',
    color: '#F59E0B'
  }
];

const CoulombsLawRenderer: React.FC<CoulombsLawRendererProps> = ({ onGameEvent }) => {
  // Phase type - string-based per spec
  type CLPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

  const phaseOrder: CLPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const phaseLabels: Record<CLPhase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Polarization',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const screenDescriptions: Record<CLPhase, string> = {
    hook: 'INTRO SCREEN: Title "Coulomb\'s Law", animated charge visualization, Start button.',
    predict: 'PREDICTION SCREEN: User predicts what happens between +4μC and -2μC charges 10cm apart.',
    play: 'EXPERIMENT SCREEN: Interactive simulation with adjustable charges and distance. Force calculation shown.',
    review: 'REVIEW SCREEN: Explains inverse-square law, charge interactions, Coulomb\'s constant.',
    twist_predict: 'TWIST PREDICTION: What happens when a charged balloon approaches a NEUTRAL wall?',
    twist_play: 'POLARIZATION EXPERIMENT: See how charges redistribute in neutral objects.',
    twist_review: 'POLARIZATION REVIEW: Explains electrostatic induction and why neutral objects attract.',
    transfer: 'REAL WORLD APPLICATIONS: 4 cards showing electrostatic technology.',
    test: 'KNOWLEDGE TEST: 10 scenario-based questions about Coulomb\'s Law.',
    mastery: 'COMPLETION SCREEN: Summary of 5 electrostatics concepts mastered.'
  };

  const coachMessages: Record<CLPhase, string> = {
    hook: "Welcome to electrostatics! ⚡ Coulomb's Law governs the invisible force between charges.",
    predict: "Time to make a prediction! What forces will opposite charges experience?",
    play: "Now let's experiment! Adjust charges and distance to see how force changes.",
    review: "The inverse-square law is powerful! Let's understand why it matters.",
    twist_predict: "Here's the twist! What happens with a NEUTRAL object?",
    twist_play: "Watch polarization in action! See how charges redistribute.",
    twist_review: "You've discovered electrostatic induction! Even neutral objects can be attracted.",
    transfer: "Coulomb's Law powers amazing technology! Let's explore real-world applications. 🚀",
    test: "Time to test your understanding! Take your time with each question.",
    mastery: "Congratulations! You've mastered Coulomb's Law! ⚡"
  };

  // State
  const [phase, setPhase] = useState<CLPhase>('hook');
  const [isMobile, setIsMobile] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [animationTime, setAnimationTime] = useState(0);

  // Simulation state
  const [charge1, setCharge1] = useState(5);
  const [charge2, setCharge2] = useState(-5);
  const [separation, setSeparation] = useState(200);
  const [showFieldLines, setShowFieldLines] = useState(true);
  const [showForceVectors, setShowForceVectors] = useState(true);
  const [hasExperimented, setHasExperimented] = useState(false);

  // Transfer state
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
  const [activeAppIndex, setActiveAppIndex] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [showResults, setShowResults] = useState(false);

  // Navigation
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);
  const hasEmittedStart = useRef(false);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Premium Design System
  const colors = {
    primary: '#ef4444',       // red-500 (positive charge)
    primaryDark: '#dc2626',   // red-600
    accent: '#3b82f6',        // blue-500 (negative charge)
    secondary: '#8b5cf6',     // violet-500
    success: '#10b981',       // emerald-500
    danger: '#ef4444',        // red-500
    warning: '#f59e0b',       // amber-500
    bgDark: '#020617',        // slate-950
    bgCard: '#0f172a',        // slate-900
    bgCardLight: '#1e293b',   // slate-800
    textPrimary: '#f8fafc',   // slate-50
    textSecondary: '#94a3b8', // slate-400
    textMuted: '#64748b',     // slate-500
    border: '#334155',        // slate-700
    borderLight: '#475569',   // slate-600
    // Theme-specific
    positiveCharge: '#ef4444', // red-500
    negativeCharge: '#3b82f6', // blue-500
    fieldLines: '#a78bfa',     // violet-400
    force: '#22c55e',          // green-500
    // Aliases for cleaner code
    positive: '#ef4444',       // red-500
    negative: '#3b82f6',       // blue-500
  };

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

  // Premium SVG Defs - Comprehensive gradients and filters for realistic 3D charged particles
  const renderPremiumSVGDefs = () => (
    <defs>
      {/* === LINEAR GRADIENTS FOR DEPTH === */}

      {/* Premium positive charge sphere gradient - 3D red metallic */}
      <linearGradient id="coulPositiveSphere" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fca5a5" />
        <stop offset="25%" stopColor="#f87171" />
        <stop offset="50%" stopColor="#ef4444" />
        <stop offset="75%" stopColor="#dc2626" />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>

      {/* Premium negative charge sphere gradient - 3D blue metallic */}
      <linearGradient id="coulNegativeSphere" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#93c5fd" />
        <stop offset="25%" stopColor="#60a5fa" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="75%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>

      {/* Electric field line gradient - animated flow effect */}
      <linearGradient id="coulFieldLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.2" />
        <stop offset="25%" stopColor="#c4b5fd" stopOpacity="0.6" />
        <stop offset="50%" stopColor="#ddd6fe" stopOpacity="0.9" />
        <stop offset="75%" stopColor="#c4b5fd" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.2" />
      </linearGradient>

      {/* Force arrow gradient - directional green */}
      <linearGradient id="coulForceArrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#86efac" />
        <stop offset="30%" stopColor="#4ade80" />
        <stop offset="60%" stopColor="#22c55e" />
        <stop offset="100%" stopColor="#16a34a" />
      </linearGradient>

      {/* Attraction force arrow - pulling gradient */}
      <linearGradient id="coulAttractionArrow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="50%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>

      {/* Repulsion force arrow - pushing gradient */}
      <linearGradient id="coulRepulsionArrow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>

      {/* Lab background gradient */}
      <linearGradient id="coulLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#030712" />
        <stop offset="30%" stopColor="#0f172a" />
        <stop offset="70%" stopColor="#1e293b" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>

      {/* Neutral object gradient - gray metallic */}
      <linearGradient id="coulNeutralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9ca3af" />
        <stop offset="25%" stopColor="#6b7280" />
        <stop offset="50%" stopColor="#4b5563" />
        <stop offset="75%" stopColor="#374151" />
        <stop offset="100%" stopColor="#1f2937" />
      </linearGradient>

      {/* Balloon gradient - deep blue rubber */}
      <linearGradient id="coulBalloonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="30%" stopColor="#3b82f6" />
        <stop offset="60%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#1e40af" />
      </linearGradient>

      {/* === RADIAL GRADIENTS FOR 3D SPHERE EFFECTS === */}

      {/* Positive charge 3D sphere with highlight */}
      <radialGradient id="coulPositive3D" cx="35%" cy="35%" r="60%" fx="25%" fy="25%">
        <stop offset="0%" stopColor="#fecaca" />
        <stop offset="20%" stopColor="#fca5a5" />
        <stop offset="50%" stopColor="#ef4444" />
        <stop offset="80%" stopColor="#dc2626" />
        <stop offset="100%" stopColor="#7f1d1d" />
      </radialGradient>

      {/* Negative charge 3D sphere with highlight */}
      <radialGradient id="coulNegative3D" cx="35%" cy="35%" r="60%" fx="25%" fy="25%">
        <stop offset="0%" stopColor="#dbeafe" />
        <stop offset="20%" stopColor="#93c5fd" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="80%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </radialGradient>

      {/* Positive charge outer glow */}
      <radialGradient id="coulPositiveGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
        <stop offset="40%" stopColor="#ef4444" stopOpacity="0.4" />
        <stop offset="70%" stopColor="#f87171" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#fca5a5" stopOpacity="0" />
      </radialGradient>

      {/* Negative charge outer glow */}
      <radialGradient id="coulNegativeGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
        <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.4" />
        <stop offset="70%" stopColor="#60a5fa" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#93c5fd" stopOpacity="0" />
      </radialGradient>

      {/* Positive charge inner highlight */}
      <radialGradient id="coulPositiveHighlight" cx="30%" cy="30%" r="40%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
        <stop offset="50%" stopColor="#fecaca" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
      </radialGradient>

      {/* Negative charge inner highlight */}
      <radialGradient id="coulNegativeHighlight" cx="30%" cy="30%" r="40%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
        <stop offset="50%" stopColor="#dbeafe" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
      </radialGradient>

      {/* Force field energy glow */}
      <radialGradient id="coulFieldEnergy" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.6" />
        <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
      </radialGradient>

      {/* === GLOW FILTERS === */}

      {/* Positive charge glow filter */}
      <filter id="coulPositiveGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feFlood floodColor="#ef4444" floodOpacity="0.6" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Negative charge glow filter */}
      <filter id="coulNegativeGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feFlood floodColor="#3b82f6" floodOpacity="0.6" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Force arrow glow filter */}
      <filter id="coulForceGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feFlood floodColor="#22c55e" floodOpacity="0.5" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Field line glow filter */}
      <filter id="coulFieldGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Soft glow for general use */}
      <filter id="coulSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* === MARKERS FOR ARROWS === */}

      {/* Force arrow marker - premium gradient */}
      <marker id="coulForceArrowHead" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
        <path d="M0,0 L12,6 L0,12 L3,6 Z" fill="url(#coulForceArrowGrad)" />
      </marker>

      {/* Attraction arrow marker */}
      <marker id="coulAttractionHead" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
        <path d="M0,0 L12,6 L0,12 L3,6 Z" fill="url(#coulAttractionArrow)" />
      </marker>

      {/* Field line flow marker */}
      <marker id="coulFieldFlowMarker" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <circle cx="4" cy="4" r="2" fill="#c4b5fd" />
      </marker>

      {/* === PATTERNS === */}

      {/* Lab grid pattern */}
      <pattern id="coulLabGrid" width="25" height="25" patternUnits="userSpaceOnUse">
        <rect width="25" height="25" fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.3" />
      </pattern>

      {/* Electric field pattern - dotted */}
      <pattern id="coulFieldPattern" width="10" height="10" patternUnits="userSpaceOnUse">
        <circle cx="5" cy="5" r="1" fill="#a78bfa" fillOpacity="0.4" />
      </pattern>
    </defs>
  );

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationTime(t => t + 0.05);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Emit game event
  const emitGameEvent = useCallback((
    eventType: GameEvent['eventType'],
    details: Partial<GameEvent['details']> = {}
  ) => {
    if (!onGameEvent) return;
    const phaseIndex = phaseOrder.indexOf(phase);
    onGameEvent({
      eventType,
      gameType: 'coulombs_law',
      gameTitle: "Coulomb's Law",
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
  }, [onGameEvent, phase, phaseLabels, phaseOrder, screenDescriptions, coachMessages]);

  // Emit game_started on mount
  useEffect(() => {
    if (!hasEmittedStart.current) {
      hasEmittedStart.current = true;
      emitGameEvent('game_started', {
        message: "Starting Coulomb's Law exploration"
      });
    }
  }, [emitGameEvent]);

  // Reset test state when entering test phase
  useEffect(() => {
    if (phase === 'test') {
      setCurrentQuestion(0);
      setTestAnswers(Array(10).fill(null));
    }
  }, [phase]);

  // Navigation
  const goToPhase = useCallback((p: CLPhase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    playSound('transition');
    setPhase(p);

    // Reset simulation when entering play phases
    if (p === 'play') {
      setHasExperimented(false);
    }

    const phaseIndex = phaseOrder.indexOf(p);
    emitGameEvent('phase_changed', {
      phase: p,
      phaseLabel: phaseLabels[p],
      currentScreen: phaseIndex + 1,
      totalScreens: 10,
      screenDescription: screenDescriptions[p],
      coachMessage: coachMessages[p]
    });

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [emitGameEvent, phaseLabels, phaseOrder, screenDescriptions, coachMessages]);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, phaseOrder, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, phaseOrder, goToPhase]);

  // Calculate force
  const calculateForce = useCallback((q1: number, q2: number, r: number): number => {
    const q1_C = q1 * 1e-6;
    const q2_C = q2 * 1e-6;
    const r_m = r * 0.001; // pixels to meters (1px = 1mm)
    if (r_m === 0) return 0;
    return k * q1_C * q2_C / (r_m * r_m);
  }, []);

  // Predictions
  const predictions = [
    { id: 'repel', label: 'Push apart', desc: 'Both charges repel each other', icon: '← →', tag: 'Repel' },
    { id: 'attract', label: 'Pull together', desc: 'Opposite charges attract', icon: '→ ←', tag: 'Attract' },
    { id: 'nothing', label: 'No force', desc: 'Only one charge feels a force', icon: '○ ○', tag: 'None' },
  ];

  const twistPredictions = [
    { id: 'nothing', label: 'Nothing happens', desc: "Neutral objects don't interact", icon: '○' },
    { id: 'repel', label: 'Wall repels balloon', desc: 'Like charges would repel', icon: '← →' },
    { id: 'attract', label: 'Balloon sticks to wall', desc: 'Some kind of attraction', icon: '→ ←' },
  ];

  // Transfer apps
  const transferApps = [
    {
      icon: '🏭',
      title: 'Electrostatic Precipitators',
      short: 'Clean Air',
      tagline: 'Removing pollution with electric fields',
      description: "Industrial plants use Coulomb's Law to remove 99%+ of particulate matter from exhaust.",
      connection: 'Charged particles experience Coulomb force toward collection plates.',
      howItWorks: 'Corona wires ionize air molecules which charge passing particles. The electric field drives particles to grounded plates.',
      stats: [
        { value: '99.9%', label: 'Particle removal', icon: '✓' },
        { value: '450°C', label: 'Max temperature', icon: '🔥' },
        { value: '0.01μm', label: 'Smallest captured', icon: '🔬' }
      ],
      examples: ['Coal power plants', 'Cement kilns', 'Steel mills', 'Paper mills'],
      companies: ['GE Power', 'Mitsubishi', 'Siemens', 'Babcock & Wilcox'],
      futureImpact: 'Next-gen precipitators with pulsed power will achieve higher efficiency with less energy.',
      color: colors.textMuted
    },
    {
      icon: '🖨️',
      title: 'Laser Printing',
      short: 'Xerography',
      tagline: 'Printing with charged particles',
      description: 'Every laser printer uses Coulomb forces to place toner particles precisely.',
      connection: 'Charged toner is attracted to oppositely charged areas on the drum.',
      howItWorks: 'A laser discharges specific areas on a charged drum. Toner sticks only to discharged areas. Paper receives stronger charge to pull toner off.',
      stats: [
        { value: '4800', label: 'DPI resolution', icon: '📊' },
        { value: '~5μm', label: 'Toner particle size', icon: '⚫' },
        { value: '1000V', label: 'Drum voltage', icon: '⚡' }
      ],
      examples: ['Office printers', 'Commercial printing', 'Photocopiers', 'Digital press'],
      companies: ['Xerox', 'HP', 'Canon', 'Ricoh'],
      futureImpact: 'Electrostatic 3D printing enables precise microstructures for electronics and biomedical devices.',
      color: colors.primary
    },
    {
      icon: '🎨',
      title: 'Electrostatic Coating',
      short: 'Spray Painting',
      tagline: 'Perfect finishes with charge attraction',
      description: 'Charged paint particles wrap around objects for 95%+ coverage efficiency.',
      connection: 'Coulomb attraction pulls paint to grounded objects, even reaching hidden surfaces.',
      howItWorks: 'Paint is charged at 60-100kV as it leaves the spray gun. Grounded workpieces attract particles along field lines.',
      stats: [
        { value: '95%', label: 'Transfer efficiency', icon: '✓' },
        { value: '90%', label: 'Less overspray', icon: '🎯' },
        { value: '80%', label: 'VOC reduction', icon: '🌿' }
      ],
      examples: ['Car painting', 'Appliance coating', 'Furniture finishing', 'Aerospace parts'],
      companies: ['Graco', 'Nordson', 'Wagner', 'SAMES KREMLIN'],
      futureImpact: 'Smart systems will create gradient coatings—harder outside, flexible inside—in single passes.',
      color: colors.accent
    },
    {
      icon: '⚡',
      title: 'Lightning Protection',
      short: 'Lightning Rods',
      tagline: 'Taming nature\'s electricity',
      description: 'Lightning rods use charge concentration at sharp points to protect buildings.',
      connection: 'Sharp points create intense local fields that ionize air and provide safe discharge paths.',
      howItWorks: 'Pointed rods concentrate charge, creating corona discharge that bleeds charge gradually. If lightning strikes, the rod provides a low-resistance path to ground.',
      stats: [
        { value: '200kA', label: 'Peak current', icon: '⚡' },
        { value: '5C', label: 'Charge per strike', icon: '🔋' },
        { value: '45°', label: 'Protection cone', icon: '📐' }
      ],
      examples: ['Building rods', 'Aircraft dischargers', 'Wind turbines', 'Launch pads'],
      companies: ['ERICO', 'Pentair', 'Lightning Protection Intl', 'East Coast Lightning'],
      futureImpact: 'Laser-triggered lightning may enable precise control of strike locations for sensitive facilities.',
      color: colors.warning
    }
  ];

  // Test questions
  const testQuestions = [
    {
      scenario: "Two metal spheres, each with +3μC charge, are placed 10cm apart on an insulating surface.",
      question: "What happens when released?",
      options: [
        { id: 'a', label: 'They move toward each other' },
        { id: 'b', label: 'They move away from each other', correct: true },
        { id: 'c', label: 'They remain stationary' },
        { id: 'd', label: 'They orbit each other' }
      ],
      explanation: "Like charges repel. Both positive spheres push apart with F = kq₁q₂/r² ≈ 8.1 N."
    },
    {
      scenario: "An engineer doubles the distance between two charges from 1m to 2m.",
      question: "How does the electrostatic force change?",
      options: [
        { id: 'a', label: 'It doubles' },
        { id: 'b', label: 'It halves' },
        { id: 'c', label: 'It becomes one-fourth', correct: true },
        { id: 'd', label: 'It quadruples' }
      ],
      explanation: "F ∝ 1/r². Double distance → (1/2)² = 1/4 the force."
    },
    {
      scenario: "A charged balloon (-2μC) sticks to a neutral wall.",
      question: "How can a charged object attract a neutral object?",
      options: [
        { id: 'a', label: 'The wall becomes permanently charged' },
        { id: 'b', label: 'Gravity assists the attraction' },
        { id: 'c', label: 'The balloon induces polarization', correct: true },
        { id: 'd', label: 'Neutral objects are always attracted' }
      ],
      explanation: "The balloon repels electrons in the wall, leaving positive charges closer. Since F ∝ 1/r², closer positive charges create stronger attraction."
    },
    {
      scenario: "In hydrogen, an electron orbits a proton at 5.3×10⁻¹¹ m. Both have charge ±1.6×10⁻¹⁹ C.",
      question: "What is the Coulomb force?",
      options: [
        { id: 'a', label: '8.2 × 10⁻⁸ N', correct: true },
        { id: 'b', label: '8.2 × 10⁻¹⁵ N' },
        { id: 'c', label: '9.0 × 10⁹ N' },
        { id: 'd', label: '1.6 × 10⁻¹⁹ N' }
      ],
      explanation: "F = kq²/r² = (8.99×10⁹)(1.6×10⁻¹⁹)²/(5.3×10⁻¹¹)² ≈ 8.2×10⁻⁸ N."
    },
    {
      scenario: "Setup A: +4μC and -2μC at 5cm. Setup B: +2μC and -1μC at 5cm.",
      question: "How do forces compare?",
      options: [
        { id: 'a', label: 'Force A = Force B' },
        { id: 'b', label: 'Force A = 2 × Force B' },
        { id: 'c', label: 'Force A = 4 × Force B', correct: true },
        { id: 'd', label: 'Force A = 8 × Force B' }
      ],
      explanation: "F ∝ q₁q₂. Setup A: |4×2| = 8. Setup B: |2×1| = 2. Ratio: 8/2 = 4."
    },
    {
      scenario: "Three charges in a line: +Q at x=0, +Q at x=d, and +q at x=d/2.",
      question: "What is the net force on +q?",
      options: [
        { id: 'a', label: 'Net force points left' },
        { id: 'b', label: 'Net force points right' },
        { id: 'c', label: 'Net force is zero', correct: true },
        { id: 'd', label: 'Net force points up' }
      ],
      explanation: "By symmetry, +q is equidistant from both +Q charges. Equal repulsive forces cancel."
    },
    {
      scenario: "Lightning rods have sharp pointed tips rather than rounded ends.",
      question: "Why does the sharp point help?",
      options: [
        { id: 'a', label: 'Sharp points are cheaper' },
        { id: 'b', label: 'Points create stronger fields that ionize air', correct: true },
        { id: 'c', label: 'Points attract lightning by being taller' },
        { id: 'd', label: 'Shape doesn\'t matter' }
      ],
      explanation: "Charge concentrates at sharp points, creating intense fields that ionize air for corona discharge."
    },
    {
      scenario: "In a Van de Graaff generator, charges spread over a metal dome's surface.",
      question: "Why do charges spread to the outer surface?",
      options: [
        { id: 'a', label: 'Air attracts charges outside' },
        { id: 'b', label: 'Gravity pulls them down' },
        { id: 'c', label: 'Like charges repel, maximizing distance', correct: true },
        { id: 'd', label: 'Metal conducts automatically' }
      ],
      explanation: "Like charges repel and spread as far apart as possible—on the outer surface."
    },
    {
      scenario: "An inkjet printer uses charged droplets passing between ±1500V deflection plates.",
      question: "How does this direct ink?",
      options: [
        { id: 'a', label: 'Magnetic fields guide droplets' },
        { id: 'b', label: 'Electric field exerts Coulomb force', correct: true },
        { id: 'c', label: 'Air pressure pushes droplets' },
        { id: 'd', label: 'Gravity curves the paths' }
      ],
      explanation: "F = qE. The electric field deflects charged droplets. Varying charge controls landing position."
    },
    {
      scenario: "Electrostatic precipitators use -50,000V wires to charge smoke particles.",
      question: "Why do particles move toward grounded plates?",
      options: [
        { id: 'a', label: 'Particles become magnetic' },
        { id: 'b', label: 'Wind blows them' },
        { id: 'c', label: 'Negative particles attracted to positive plates', correct: true },
        { id: 'd', label: 'Particles become heavier' }
      ],
      explanation: "Negatively charged particles experience Coulomb force toward the relatively positive ground plates."
    }
  ];

  // Mastery items
  const masteryItems = [
    { icon: '⚡', title: "Coulomb's Law", desc: 'F = kq₁q₂/r² governs electrostatic force', color: colors.primary },
    { icon: '📐', title: 'Inverse Square', desc: 'Force decreases with square of distance', color: colors.accent },
    { icon: '🧲', title: 'Polarization', desc: 'Charged objects can attract neutral objects through induction', color: colors.danger },
    { icon: '🏭', title: 'Applications', desc: 'From precipitators to printers, electrostatics powers technology', color: colors.success },
    { icon: '🔢', title: "Coulomb's Constant", desc: 'k = 8.99×10⁹ N·m²/C² makes atomic forces immense', color: colors.warning },
  ];

  // Calculate test score
  const testScore = testAnswers.reduce((score, answer, idx) => {
    if (answer === null) return score;
    const correct = testQuestions[idx].options.findIndex(o => o.correct);
    return score + (answer === correct ? 1 : 0);
  }, 0);

  // renderBottomBar - uses onClick for single-click behavior
  const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void, accentColor?: string) => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 16px',
      borderTop: `1px solid ${colors.border}`,
      backgroundColor: colors.bgCard,
      gap: '8px'
    }}>
      {canGoBack ? (
        <button
          onClick={() => goBack()}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            border: `1px solid ${colors.border}`,
            backgroundColor: 'transparent',
            color: colors.textSecondary,
            fontSize: typo.body,
            fontWeight: 600,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          ← Back
        </button>
      ) : <div />}

      <span style={{ fontSize: typo.small, color: colors.textMuted, fontWeight: 500 }}>
        {phaseLabels[phase]}
      </span>

      <button
        onClick={() => { if (canGoNext) { onNext ? onNext() : goNext(); } }}
        disabled={!canGoNext}
        style={{
          padding: '10px 20px',
          borderRadius: '10px',
          border: 'none',
          background: canGoNext
            ? `linear-gradient(135deg, ${accentColor || colors.primary} 0%, ${colors.accent} 100%)`
            : colors.bgCardLight,
          color: canGoNext ? '#fff' : colors.textMuted,
          fontSize: typo.body,
          fontWeight: 700,
          cursor: canGoNext ? 'pointer' : 'not-allowed',
          opacity: canGoNext ? 1 : 0.5,
          boxShadow: canGoNext ? `0 4px 20px ${(accentColor || colors.primary)}40` : 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        {nextLabel} →
      </button>
    </div>
  );

  // renderSectionHeader
  const renderSectionHeader = (phaseName: string, title: string, subtitle?: string) => (
    <div style={{ marginBottom: typo.sectionGap }}>
      <p style={{
        fontSize: typo.label,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: colors.primary,
        marginBottom: '4px'
      }}>
        {phaseName}
      </p>
      <h2 style={{
        fontSize: typo.heading,
        fontWeight: 800,
        color: colors.textPrimary,
        lineHeight: 1.2,
        margin: 0
      }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{
          fontSize: typo.small,
          color: colors.textSecondary,
          lineHeight: 1.4,
          marginTop: '6px'
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );

  // renderPremiumWrapper - MUST be a render function, NOT a component
  const renderPremiumWrapper = (children: React.ReactNode, footer?: React.ReactNode) => {
    const phaseIndex = phaseOrder.indexOf(phase);

    return (
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.bgDark,
        color: colors.textPrimary
      }}>
        {/* Background gradient */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgDark} 50%, ${colors.bgCard} 100%)`,
          pointerEvents: 'none'
        }} />

        {/* Decorative orbs */}
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '300px',
          height: '300px',
          background: `radial-gradient(circle, ${colors.positive}15 0%, transparent 70%)`,
          borderRadius: '50%',
          filter: 'blur(40px)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: '300px',
          height: '300px',
          background: `radial-gradient(circle, ${colors.negative}15 0%, transparent 70%)`,
          borderRadius: '50%',
          filter: 'blur(40px)',
          pointerEvents: 'none'
        }} />

        {/* Header */}
        <div style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: `${colors.bgCard}ee`,
          backdropFilter: 'blur(10px)',
          position: 'relative',
          zIndex: 10
        }}>
          {/* Back button */}
          {phaseIndex > 0 ? (
            <button
              onClick={() => goBack()}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                backgroundColor: 'transparent',
                color: colors.textSecondary,
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              ←
            </button>
          ) : (
            <div style={{ width: '36px' }} />
          )}

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                onClick={() => i <= phaseIndex && goToPhase(p)}
                disabled={i > phaseIndex}
                style={{
                  width: phase === p ? '20px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: i < phaseIndex ? colors.success : phase === p ? colors.primary : colors.border,
                  cursor: i <= phaseIndex ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  WebkitTapHighlightColor: 'transparent'
                }}
              />
            ))}
          </div>

          {/* Phase indicator */}
          <span style={{
            fontSize: typo.small,
            color: colors.textMuted,
            fontWeight: 600,
            minWidth: '36px',
            textAlign: 'right'
          }}>
            {phaseIndex + 1}/10
          </span>
        </div>

        {/* Main scrollable content */}
        <div style={{
          flex: '1 1 0%',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          position: 'relative',
          zIndex: 1
        }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{ flexShrink: 0, position: 'relative', zIndex: 10 }}>
            {footer}
          </div>
        )}
      </div>
    );
  };

  // ========== PHASE RENDERS ==========

  // HOOK
  if (phase === 'hook') {
    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%' }}>
        {/* Category tag */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          backgroundColor: `${colors.primary}15`,
          border: `1px solid ${colors.primary}30`,
          borderRadius: '20px',
          marginBottom: '24px'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colors.primary }} />
          <span style={{ fontSize: typo.small, fontWeight: 700, color: colors.primary, letterSpacing: '0.05em' }}>
            ELECTROSTATICS
          </span>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: typo.title,
          fontWeight: 800,
          textAlign: 'center',
          marginBottom: '12px',
          background: `linear-gradient(135deg, ${colors.positive} 0%, ${colors.textPrimary} 50%, ${colors.negative} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Coulomb's Law
        </h1>

        <p style={{
          fontSize: typo.bodyLarge,
          color: colors.textSecondary,
          textAlign: 'center',
          maxWidth: '400px',
          lineHeight: 1.5,
          marginBottom: '24px'
        }}>
          The invisible force between electric charges that holds atoms together and powers lightning
        </p>

        {/* Animated visualization - Premium SVG */}
        <div style={{
          width: '100%',
          maxWidth: '400px',
          aspectRatio: '4/3',
          backgroundColor: colors.bgCard,
          borderRadius: '16px',
          border: `1px solid ${colors.border}`,
          marginBottom: '24px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <svg viewBox="0 0 400 300" style={{ width: '100%', height: '100%' }}>
            {renderPremiumSVGDefs()}

            {/* Premium dark lab background */}
            <rect width="400" height="300" fill="url(#coulLabBg)" />
            <rect width="400" height="300" fill="url(#coulLabGrid)" />

            {/* Animated electric field lines with flow effect */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
              const angle = (i * 45) * Math.PI / 180;
              const flowOffset = (animationTime * 30 + i * 20) % 140;
              const pulseOpacity = 0.3 + Math.sin(animationTime * 2 + i * 0.5) * 0.2;
              return (
                <g key={`field-${i}`}>
                  {/* Main field line */}
                  <path
                    d={`M ${130 + Math.cos(angle) * 35} ${140 + Math.sin(angle) * 35}
                        Q 200 ${140 + Math.sin(animationTime * 2 + i) * 8}
                        ${270 + Math.cos(angle + Math.PI) * 35} ${140 + Math.sin(angle + Math.PI) * 35}`}
                    stroke="url(#coulFieldLineGrad)"
                    strokeWidth="2.5"
                    fill="none"
                    opacity={pulseOpacity}
                    filter="url(#coulFieldGlowFilter)"
                  />
                  {/* Animated flow particles along field lines */}
                  <circle
                    cx={130 + flowOffset}
                    cy={140 + Math.sin((130 + flowOffset - 130) * 0.02 + angle) * 10}
                    r="3"
                    fill="#c4b5fd"
                    opacity={0.8}
                  >
                    <animate
                      attributeName="opacity"
                      values="0.8;0.3;0.8"
                      dur="1s"
                      repeatCount="indefinite"
                      begin={`${i * 0.1}s`}
                    />
                  </circle>
                </g>
              );
            })}

            {/* Positive charge outer glow - pulsing */}
            <circle
              cx="130"
              cy="140"
              r={55 + Math.sin(animationTime * 3) * 8}
              fill="url(#coulPositiveGlow)"
            />
            {/* Positive charge - 3D sphere */}
            <circle
              cx="130"
              cy="140"
              r="32"
              fill="url(#coulPositive3D)"
              filter="url(#coulPositiveGlowFilter)"
            />
            {/* Positive charge highlight */}
            <circle cx="122" cy="132" r="10" fill="url(#coulPositiveHighlight)" />
            {/* Positive charge symbol */}
            <text x="130" y="148" textAnchor="middle" fill="white" fontSize="26" fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>+</text>
            {/* Label */}
            <text x="130" y="190" textAnchor="middle" fill={colors.positive} fontSize="11" fontWeight="600">q₁ = +5 μC</text>

            {/* Negative charge outer glow - pulsing */}
            <circle
              cx="270"
              cy="140"
              r={55 + Math.sin(animationTime * 3 + 1) * 8}
              fill="url(#coulNegativeGlow)"
            />
            {/* Negative charge - 3D sphere */}
            <circle
              cx="270"
              cy="140"
              r="32"
              fill="url(#coulNegative3D)"
              filter="url(#coulNegativeGlowFilter)"
            />
            {/* Negative charge highlight */}
            <circle cx="262" cy="132" r="10" fill="url(#coulNegativeHighlight)" />
            {/* Negative charge symbol */}
            <text x="270" y="148" textAnchor="middle" fill="white" fontSize="26" fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>−</text>
            {/* Label */}
            <text x="270" y="190" textAnchor="middle" fill={colors.negative} fontSize="11" fontWeight="600">q₂ = −5 μC</text>

            {/* Force arrows with gradient and glow */}
            <g filter="url(#coulForceGlowFilter)">
              {/* Arrow from positive toward negative */}
              <line
                x1="168"
                y1="140"
                x2="198"
                y2="140"
                stroke="url(#coulAttractionArrow)"
                strokeWidth="5"
                strokeLinecap="round"
                markerEnd="url(#coulAttractionHead)"
              />
              {/* Arrow from negative toward positive */}
              <line
                x1="232"
                y1="140"
                x2="202"
                y2="140"
                stroke="url(#coulAttractionArrow)"
                strokeWidth="5"
                strokeLinecap="round"
                markerEnd="url(#coulAttractionHead)"
              />
            </g>
            {/* Force label */}
            <text x="200" y="125" textAnchor="middle" fill={colors.success} fontSize="10" fontWeight="600">ATTRACTIVE FORCE</text>

            {/* Distance indicator */}
            <line x1="130" y1="210" x2="270" y2="210" stroke={colors.textMuted} strokeWidth="1" strokeDasharray="4,4" />
            <line x1="130" y1="205" x2="130" y2="215" stroke={colors.textMuted} strokeWidth="1" />
            <line x1="270" y1="205" x2="270" y2="215" stroke={colors.textMuted} strokeWidth="1" />
            <text x="200" y="225" textAnchor="middle" fill={colors.textMuted} fontSize="10">r = 10 cm</text>

            {/* Equation with glow */}
            <rect x="100" y="248" width="200" height="32" rx="6" fill={colors.bgCard} fillOpacity="0.8" />
            <text x="200" y="270" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontFamily="monospace" fontWeight="600">
              F = k × q₁ × q₂ / r²
            </text>
          </svg>
        </div>

        {/* Quote */}
        <div style={{
          backgroundColor: `${colors.accent}10`,
          border: `1px solid ${colors.accent}30`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          maxWidth: '400px'
        }}>
          <p style={{ fontSize: typo.body, color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', margin: 0 }}>
            "Nature uses only the longest threads to weave her patterns, so each small piece of her fabric reveals the organization of the entire tapestry."
          </p>
          <p style={{ fontSize: typo.small, color: colors.textMuted, textAlign: 'center', marginTop: '8px' }}>
            — Richard Feynman
          </p>
        </div>

        {/* Features */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { icon: '⚡', text: '5 min' },
            { icon: '🧪', text: 'Lab' },
            { icon: '🧠', text: 'Quiz' }
          ].map((f, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: colors.bgCardLight,
              borderRadius: '8px'
            }}>
              <span>{f.icon}</span>
              <span style={{ fontSize: typo.small, color: colors.textSecondary }}>{f.text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => goToPhase('predict')}
          style={{
            padding: '16px 32px',
            borderRadius: '14px',
            border: 'none',
            background: `linear-gradient(135deg, ${colors.positive} 0%, ${colors.negative} 100%)`,
            color: '#fff',
            fontSize: typo.bodyLarge,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: `0 4px 20px ${colors.primary}40`,
            marginBottom: '12px',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          Begin Experiment →
        </button>

        <p style={{ fontSize: typo.small, color: colors.textMuted }}>
          ★★★★★ Loved by 10,000+ learners
        </p>
      </div>
    );
  }

  // PREDICT
  if (phase === 'predict') {
    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        {renderSectionHeader('Step 1 • Make Your Prediction', 'What Forces Will They Feel?', 'Two charges are placed near each other. What happens?')}

        {/* Setup diagram - Premium SVG */}
        <div style={{
          backgroundColor: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: typo.sectionGap,
          border: `1px solid ${colors.border}`
        }}>
          <svg viewBox="0 0 400 170" style={{ width: '100%' }}>
            {renderPremiumSVGDefs()}

            {/* Premium background */}
            <rect x="0" y="0" width="400" height="170" fill="url(#coulLabBg)" rx="8" />
            <rect x="0" y="0" width="400" height="170" fill="url(#coulLabGrid)" rx="8" />

            {/* Question mark in center with glow */}
            <text x="200" y="80" textAnchor="middle" fill={colors.warning} fontSize="48" fontWeight="bold" opacity="0.3">?</text>

            {/* Positive charge glow */}
            <circle cx="110" cy="75" r={40 + Math.sin(animationTime * 2) * 3} fill="url(#coulPositiveGlow)" />
            {/* Positive charge - 3D sphere */}
            <circle cx="110" cy="75" r="28" fill="url(#coulPositive3D)" filter="url(#coulPositiveGlowFilter)" />
            {/* Highlight */}
            <circle cx="102" cy="67" r="8" fill="url(#coulPositiveHighlight)" />
            {/* Symbol */}
            <text x="110" y="83" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>+</text>
            {/* Label */}
            <text x="110" y="130" textAnchor="middle" fill={colors.positive} fontSize="12" fontWeight="600">+4 μC</text>

            {/* Negative charge glow */}
            <circle cx="290" cy="75" r={40 + Math.sin(animationTime * 2 + 1) * 3} fill="url(#coulNegativeGlow)" />
            {/* Negative charge - 3D sphere */}
            <circle cx="290" cy="75" r="28" fill="url(#coulNegative3D)" filter="url(#coulNegativeGlowFilter)" />
            {/* Highlight */}
            <circle cx="282" cy="67" r="8" fill="url(#coulNegativeHighlight)" />
            {/* Symbol */}
            <text x="290" y="83" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>−</text>
            {/* Label */}
            <text x="290" y="130" textAnchor="middle" fill={colors.negative} fontSize="12" fontWeight="600">−2 μC</text>

            {/* Distance indicator with styled line */}
            <line x1="138" y1="30" x2="262" y2="30" stroke={colors.fieldLines} strokeWidth="2" strokeDasharray="6,3" />
            <line x1="138" y1="24" x2="138" y2="36" stroke={colors.fieldLines} strokeWidth="2" />
            <line x1="262" y1="24" x2="262" y2="36" stroke={colors.fieldLines} strokeWidth="2" />
            <rect x="170" y="15" width="60" height="20" rx="4" fill={colors.bgCard} />
            <text x="200" y="29" textAnchor="middle" fill={colors.fieldLines} fontSize="12" fontWeight="600">10 cm</text>

            {/* Scenario label */}
            <text x="200" y="160" textAnchor="middle" fill={colors.textMuted} fontSize="10">What force will these charges experience?</text>
          </svg>
        </div>

        {/* Prediction options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: typo.elementGap }}>
          {predictions.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                if (prediction === p.id) return;
                playSound('click');
                setPrediction(p.id);
                emitGameEvent('prediction_made', { prediction: p.id, predictionLabel: p.label });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                borderRadius: '12px',
                border: prediction === p.id ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                backgroundColor: prediction === p.id ? `${colors.primary}15` : colors.bgCard,
                cursor: 'pointer',
                textAlign: 'left',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span style={{
                fontSize: '20px',
                width: '50px',
                textAlign: 'center',
                fontFamily: 'monospace'
              }}>{p.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                  {p.label}
                </p>
                <p style={{ fontSize: typo.small, color: colors.textSecondary, margin: 0 }}>
                  {p.desc}
                </p>
              </div>
              <span style={{
                padding: '4px 8px',
                backgroundColor: prediction === p.id ? colors.primary : colors.bgCardLight,
                color: prediction === p.id ? '#fff' : colors.textMuted,
                borderRadius: '6px',
                fontSize: typo.label,
                fontWeight: 600
              }}>{p.tag}</span>
            </button>
          ))}
        </div>

        {/* Hint */}
        <div style={{
          marginTop: typo.sectionGap,
          padding: '12px',
          backgroundColor: `${colors.warning}10`,
          border: `1px solid ${colors.warning}30`,
          borderRadius: '10px'
        }}>
          <p style={{ fontSize: typo.small, color: colors.warning, margin: 0 }}>
            💡 Hint: Think about what happens when you rub a balloon on your hair!
          </p>
        </div>
      </div>,
      renderBottomBar(true, !!prediction, 'Run Experiment')
    );
  }

  // PLAY
  if (phase === 'play') {
    const force = calculateForce(charge1, charge2, separation);
    const isAttractive = charge1 * charge2 < 0;

    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        {renderSectionHeader('Step 2 • Experiment', "Coulomb's Law Lab", 'Adjust charges and distance to see how force changes')}

        {/* Simulation - Premium SVG */}
        <div style={{
          backgroundColor: colors.bgCard,
          borderRadius: '12px',
          padding: '12px',
          marginBottom: typo.sectionGap,
          border: `1px solid ${colors.border}`
        }}>
          <svg viewBox="0 0 400 300" style={{ width: '100%', borderRadius: '8px' }}>
            {renderPremiumSVGDefs()}

            {/* Premium lab background */}
            <rect width="400" height="300" fill="url(#coulLabBg)" rx="8" />
            <rect width="400" height="300" fill="url(#coulLabGrid)" rx="8" />

            {/* Electric field lines with animated flow */}
            {showFieldLines && (() => {
              const c1x = 200 - separation/2;
              const c2x = 200 + separation/2;
              const isOppSigns = charge1 * charge2 < 0;
              const chargeRadius1 = 20 + Math.abs(charge1) * 1.5;
              const chargeRadius2 = 20 + Math.abs(charge2) * 1.5;

              return [0,1,2,3,4,5,6,7].map(i => {
                const angle = (i * 45) * Math.PI / 180;
                const pulseOpacity = 0.25 + Math.sin(animationTime * 2 + i * 0.5) * 0.15;
                const flowOffset = (animationTime * 40 + i * 15) % (separation);

                if (isOppSigns) {
                  // Attractive field lines - curved from + to -
                  return (
                    <g key={`fl-${i}`}>
                      <path
                        d={`M ${c1x + Math.cos(angle) * chargeRadius1} ${150 + Math.sin(angle) * chargeRadius1}
                            Q 200 ${150 + Math.sin(animationTime * 1.5 + i) * 15}
                            ${c2x + Math.cos(angle + Math.PI) * chargeRadius2} ${150 + Math.sin(angle + Math.PI) * chargeRadius2}`}
                        stroke="url(#coulFieldLineGrad)"
                        strokeWidth="2.5"
                        fill="none"
                        opacity={pulseOpacity}
                        filter="url(#coulFieldGlowFilter)"
                      />
                      {/* Animated flow particle */}
                      <circle
                        cx={c1x + flowOffset}
                        cy={150 + Math.sin((flowOffset / separation) * Math.PI + angle) * 15}
                        r="2.5"
                        fill="#c4b5fd"
                        opacity={0.7}
                      />
                    </g>
                  );
                } else {
                  // Repulsive field lines - radiate outward
                  const lineLength = 50 + Math.abs(charge1) * 3;
                  return (
                    <g key={`fl-${i}`}>
                      {/* Field lines from charge 1 */}
                      <line
                        x1={c1x + Math.cos(angle) * chargeRadius1}
                        y1={150 + Math.sin(angle) * chargeRadius1}
                        x2={c1x + Math.cos(angle) * lineLength}
                        y2={150 + Math.sin(angle) * lineLength}
                        stroke={charge1 > 0 ? '#fca5a5' : '#93c5fd'}
                        strokeWidth="2"
                        opacity={pulseOpacity}
                        filter="url(#coulFieldGlowFilter)"
                      />
                      {/* Field lines from charge 2 */}
                      <line
                        x1={c2x + Math.cos(angle) * chargeRadius2}
                        y1={150 + Math.sin(angle) * chargeRadius2}
                        x2={c2x + Math.cos(angle) * (50 + Math.abs(charge2) * 3)}
                        y2={150 + Math.sin(angle) * (50 + Math.abs(charge2) * 3)}
                        stroke={charge2 > 0 ? '#fca5a5' : '#93c5fd'}
                        strokeWidth="2"
                        opacity={pulseOpacity}
                        filter="url(#coulFieldGlowFilter)"
                      />
                    </g>
                  );
                }
              });
            })()}

            {/* Charge 1 outer glow - pulsing */}
            <circle
              cx={200 - separation/2}
              cy="150"
              r={50 + Math.abs(charge1) * 2 + Math.sin(animationTime * 3) * 5}
              fill={charge1 > 0 ? 'url(#coulPositiveGlow)' : 'url(#coulNegativeGlow)'}
            />
            {/* Charge 1 - 3D sphere */}
            <circle
              cx={200 - separation/2}
              cy="150"
              r={20 + Math.abs(charge1) * 1.5}
              fill={charge1 > 0 ? 'url(#coulPositive3D)' : 'url(#coulNegative3D)'}
              filter={charge1 > 0 ? 'url(#coulPositiveGlowFilter)' : 'url(#coulNegativeGlowFilter)'}
            />
            {/* Charge 1 highlight */}
            <circle
              cx={200 - separation/2 - 8}
              cy="142"
              r={6 + Math.abs(charge1) * 0.5}
              fill={charge1 > 0 ? 'url(#coulPositiveHighlight)' : 'url(#coulNegativeHighlight)'}
            />
            {/* Charge 1 symbol */}
            <text
              x={200 - separation/2}
              y="158"
              textAnchor="middle"
              fill="white"
              fontSize="24"
              fontWeight="bold"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
            >{charge1 > 0 ? '+' : '−'}</text>
            {/* Charge 1 label */}
            <text
              x={200 - separation/2}
              y="205"
              textAnchor="middle"
              fill={charge1 > 0 ? colors.positive : colors.negative}
              fontSize="11"
              fontWeight="600"
            >q₁ = {charge1 > 0 ? '+' : ''}{charge1} μC</text>

            {/* Charge 2 outer glow - pulsing */}
            <circle
              cx={200 + separation/2}
              cy="150"
              r={50 + Math.abs(charge2) * 2 + Math.sin(animationTime * 3 + 1) * 5}
              fill={charge2 > 0 ? 'url(#coulPositiveGlow)' : 'url(#coulNegativeGlow)'}
            />
            {/* Charge 2 - 3D sphere */}
            <circle
              cx={200 + separation/2}
              cy="150"
              r={20 + Math.abs(charge2) * 1.5}
              fill={charge2 > 0 ? 'url(#coulPositive3D)' : 'url(#coulNegative3D)'}
              filter={charge2 > 0 ? 'url(#coulPositiveGlowFilter)' : 'url(#coulNegativeGlowFilter)'}
            />
            {/* Charge 2 highlight */}
            <circle
              cx={200 + separation/2 - 8}
              cy="142"
              r={6 + Math.abs(charge2) * 0.5}
              fill={charge2 > 0 ? 'url(#coulPositiveHighlight)' : 'url(#coulNegativeHighlight)'}
            />
            {/* Charge 2 symbol */}
            <text
              x={200 + separation/2}
              y="158"
              textAnchor="middle"
              fill="white"
              fontSize="24"
              fontWeight="bold"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
            >{charge2 > 0 ? '+' : '−'}</text>
            {/* Charge 2 label */}
            <text
              x={200 + separation/2}
              y="205"
              textAnchor="middle"
              fill={charge2 > 0 ? colors.positive : colors.negative}
              fontSize="11"
              fontWeight="600"
            >q₂ = {charge2 > 0 ? '+' : ''}{charge2} μC</text>

            {/* Force vectors with premium gradients */}
            {showForceVectors && Math.abs(force) > 0.001 && (
              <g filter="url(#coulForceGlowFilter)">
                {/* Force arrow on charge 1 */}
                <line
                  x1={200 - separation/2 + (isAttractive ? 35 : -35)}
                  y1="150"
                  x2={200 - separation/2 + (isAttractive ? 65 : -65)}
                  y2="150"
                  stroke={isAttractive ? 'url(#coulAttractionArrow)' : 'url(#coulRepulsionArrow)'}
                  strokeWidth="5"
                  strokeLinecap="round"
                  markerEnd={isAttractive ? 'url(#coulAttractionHead)' : 'url(#coulForceArrowHead)'}
                />
                {/* Force arrow on charge 2 */}
                <line
                  x1={200 + separation/2 + (isAttractive ? -35 : 35)}
                  y1="150"
                  x2={200 + separation/2 + (isAttractive ? -65 : 65)}
                  y2="150"
                  stroke={isAttractive ? 'url(#coulAttractionArrow)' : 'url(#coulRepulsionArrow)'}
                  strokeWidth="5"
                  strokeLinecap="round"
                  markerEnd={isAttractive ? 'url(#coulAttractionHead)' : 'url(#coulForceArrowHead)'}
                />
                {/* Force type label */}
                <text
                  x="200"
                  y="130"
                  textAnchor="middle"
                  fill={isAttractive ? colors.success : colors.warning}
                  fontSize="10"
                  fontWeight="700"
                >
                  {isAttractive ? 'ATTRACTIVE' : 'REPULSIVE'}
                </text>
              </g>
            )}

            {/* Distance measurement with styled line */}
            <line
              x1={200 - separation/2}
              y1="235"
              x2={200 + separation/2}
              y2="235"
              stroke={colors.fieldLines}
              strokeWidth="2"
              strokeDasharray="6,3"
            />
            <line x1={200 - separation/2} y1="230" x2={200 - separation/2} y2="240" stroke={colors.fieldLines} strokeWidth="2" />
            <line x1={200 + separation/2} y1="230" x2={200 + separation/2} y2="240" stroke={colors.fieldLines} strokeWidth="2" />
            {/* Distance label background */}
            <rect x="160" y="248" width="80" height="20" rx="4" fill={colors.bgCard} fillOpacity="0.9" />
            <text x="200" y="262" textAnchor="middle" fill={colors.fieldLines} fontSize="11" fontWeight="600">
              r = {(separation * 0.001).toFixed(3)} m
            </text>

            {/* Scale indicator */}
            <text x="20" y="285" fill={colors.textMuted} fontSize="9" opacity="0.6">1 px = 1 mm</text>
          </svg>
        </div>

        {/* Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: typo.elementGap, marginBottom: typo.sectionGap }}>
          <div style={{ backgroundColor: colors.bgCard, borderRadius: '10px', padding: '12px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: typo.small, color: colors.positive, fontWeight: 600 }}>Charge 1 (μC)</label>
            <input
              type="range"
              min="-10"
              max="10"
              step="1"
              value={charge1}
              onChange={(e) => {
                setCharge1(Number(e.target.value));
                setHasExperimented(true);
                emitGameEvent('slider_changed', { param: 'charge1', value: Number(e.target.value) });
              }}
              style={{ width: '100%', marginTop: '8px', accentColor: colors.positive }}
            />
            <p style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary, textAlign: 'center', margin: '4px 0 0' }}>
              {charge1 > 0 ? '+' : ''}{charge1}
            </p>
          </div>

          <div style={{ backgroundColor: colors.bgCard, borderRadius: '10px', padding: '12px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: typo.small, color: colors.negative, fontWeight: 600 }}>Charge 2 (μC)</label>
            <input
              type="range"
              min="-10"
              max="10"
              step="1"
              value={charge2}
              onChange={(e) => {
                setCharge2(Number(e.target.value));
                setHasExperimented(true);
                emitGameEvent('slider_changed', { param: 'charge2', value: Number(e.target.value) });
              }}
              style={{ width: '100%', marginTop: '8px', accentColor: colors.negative }}
            />
            <p style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary, textAlign: 'center', margin: '4px 0 0' }}>
              {charge2 > 0 ? '+' : ''}{charge2}
            </p>
          </div>

          <div style={{ backgroundColor: colors.bgCard, borderRadius: '10px', padding: '12px', border: `1px solid ${colors.border}` }}>
            <label style={{ fontSize: typo.small, color: colors.success, fontWeight: 600 }}>Distance (mm)</label>
            <input
              type="range"
              min="50"
              max="300"
              step="10"
              value={separation}
              onChange={(e) => {
                setSeparation(Number(e.target.value));
                setHasExperimented(true);
                emitGameEvent('slider_changed', { param: 'separation', value: Number(e.target.value) });
              }}
              style={{ width: '100%', marginTop: '8px', accentColor: colors.success }}
            />
            <p style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary, textAlign: 'center', margin: '4px 0 0' }}>
              {separation}
            </p>
          </div>
        </div>

        {/* Toggles */}
        <div style={{ display: 'flex', gap: typo.elementGap, marginBottom: typo.sectionGap }}>
          <button
            onClick={() => setShowFieldLines(!showFieldLines)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: showFieldLines ? colors.accent : colors.bgCardLight,
              color: colors.textPrimary,
              fontSize: typo.small,
              fontWeight: 600,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            🔮 Field Lines {showFieldLines ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setShowForceVectors(!showForceVectors)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: showForceVectors ? colors.success : colors.bgCardLight,
              color: colors.textPrimary,
              fontSize: typo.small,
              fontWeight: 600,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            ➡️ Force Vectors {showForceVectors ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Force result */}
        <div style={{
          background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgCardLight} 100%)`,
          borderRadius: '12px',
          padding: '16px',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontSize: typo.small, color: colors.textMuted, margin: 0 }}>Electrostatic Force:</p>
              <p style={{ fontSize: '24px', fontWeight: 800, color: colors.primary, margin: 0, fontFamily: 'monospace' }}>
                {Math.abs(force).toExponential(2)} N
              </p>
            </div>
            <div style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: isAttractive ? `${colors.success}20` : `${colors.danger}20`
            }}>
              <p style={{ fontSize: typo.body, fontWeight: 700, color: isAttractive ? colors.success : colors.danger, margin: 0 }}>
                {isAttractive ? '← ATTRACTIVE →' : '→ REPULSIVE ←'}
              </p>
            </div>
          </div>
          <p style={{ fontSize: typo.small, color: colors.textMuted, marginTop: '8px', fontFamily: 'monospace' }}>
            F = (8.99×10⁹) × |{charge1}×10⁻⁶| × |{charge2}×10⁻⁶| / ({(separation * 0.001).toFixed(3)})²
          </p>
        </div>
      </div>,
      renderBottomBar(true, hasExperimented, 'Understand Why')
    );
  }

  // REVIEW
  if (phase === 'review') {
    const takeaways = [
      { icon: '📐', title: 'Inverse Square Law', desc: 'Double distance → 1/4 force' },
      { icon: '🔄', title: 'Newton\'s Third Law', desc: 'Both charges feel equal & opposite forces' },
      { icon: '⚡', title: 'k = 8.99×10⁹', desc: 'Makes atomic forces immense!' }
    ];

    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        {renderSectionHeader('Step 3 • Understanding', "Coulomb's Law Explained")}

        {/* Dual cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: typo.elementGap, marginBottom: typo.sectionGap }}>
          <div style={{
            background: `linear-gradient(135deg, ${colors.positive}15 0%, ${colors.positive}05 100%)`,
            border: `1px solid ${colors.positive}30`,
            borderRadius: '12px',
            padding: typo.cardPadding
          }}>
            <h3 style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.positive, margin: '0 0 8px' }}>
              Like Charges
            </h3>
            <p style={{ fontSize: typo.small, color: colors.textSecondary, margin: 0 }}>
              + + or − − → Repel
            </p>
            <p style={{ fontSize: typo.small, color: colors.textMuted, marginTop: '6px' }}>
              Force pushes them apart
            </p>
          </div>
          <div style={{
            background: `linear-gradient(135deg, ${colors.negative}15 0%, ${colors.negative}05 100%)`,
            border: `1px solid ${colors.negative}30`,
            borderRadius: '12px',
            padding: typo.cardPadding
          }}>
            <h3 style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.negative, margin: '0 0 8px' }}>
              Opposite Charges
            </h3>
            <p style={{ fontSize: typo.small, color: colors.textSecondary, margin: 0 }}>
              + − → Attract
            </p>
            <p style={{ fontSize: typo.small, color: colors.textMuted, marginTop: '6px' }}>
              Force pulls them together
            </p>
          </div>
        </div>

        {/* Formula card */}
        <div style={{
          backgroundColor: colors.bgCard,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: typo.sectionGap,
          border: `1px solid ${colors.border}`,
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: colors.primary, fontFamily: 'monospace', margin: 0 }}>
            F = k × q₁ × q₂ / r²
          </p>
          <p style={{ fontSize: typo.small, color: colors.textMuted, marginTop: '8px' }}>
            k = 8.99 × 10⁹ N·m²/C² (Coulomb's constant)
          </p>
        </div>

        {/* Key takeaways */}
        <div style={{ marginBottom: typo.sectionGap }}>
          <p style={{ fontSize: typo.label, fontWeight: 700, color: colors.textMuted, marginBottom: '8px', textTransform: 'uppercase' }}>
            Key Takeaways
          </p>
          {takeaways.map((t, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px',
              backgroundColor: colors.bgCard,
              borderRadius: '10px',
              marginBottom: '6px',
              border: `1px solid ${colors.border}`
            }}>
              <span style={{ fontSize: '20px' }}>{t.icon}</span>
              <div>
                <span style={{ fontSize: typo.body, fontWeight: 700, color: colors.textPrimary }}>{t.title}: </span>
                <span style={{ fontSize: typo.body, color: colors.textSecondary }}>{t.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Why it matters */}
        <div style={{
          backgroundColor: `${colors.accent}10`,
          border: `1px solid ${colors.accent}30`,
          borderRadius: '12px',
          padding: '14px'
        }}>
          <p style={{ fontSize: typo.small, color: colors.accent, margin: 0, fontWeight: 600 }}>
            💡 Why It Matters
          </p>
          <p style={{ fontSize: typo.small, color: colors.textSecondary, margin: '6px 0 0' }}>
            Coulomb's Law is ~10⁴⁰ times stronger than gravity! This is why atoms hold together despite the tiny masses of electrons and protons.
          </p>
        </div>
      </div>,
      renderBottomBar(true, true, 'Discover the Twist', undefined, colors.accent)
    );
  }

  // TWIST_PREDICT
  if (phase === 'twist_predict') {
    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        {renderSectionHeader('Step 4 • New Variable', 'The Polarization Puzzle', 'What happens with a NEUTRAL object?')}

        {/* Setup diagram - Premium SVG */}
        <div style={{
          backgroundColor: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: typo.sectionGap,
          border: `1px solid ${colors.border}`
        }}>
          <svg viewBox="0 0 400 220" style={{ width: '100%' }}>
            {renderPremiumSVGDefs()}

            {/* Premium background */}
            <rect x="0" y="0" width="400" height="220" fill="url(#coulLabBg)" rx="8" />
            <rect x="0" y="0" width="400" height="220" fill="url(#coulLabGrid)" rx="8" />

            {/* Balloon glow */}
            <ellipse cx="100" cy="95" rx={60 + Math.sin(animationTime * 2) * 4} ry={70 + Math.sin(animationTime * 2) * 4} fill="url(#coulNegativeGlow)" />

            {/* Balloon - 3D gradient */}
            <ellipse cx="100" cy="95" rx="48" ry="58" fill="url(#coulBalloonGrad)" filter="url(#coulNegativeGlowFilter)" />
            {/* Balloon highlight */}
            <ellipse cx="85" cy="75" rx="15" ry="20" fill="url(#coulNegativeHighlight)" />
            {/* Balloon knot/string */}
            <path d="M100,153 L95,160 L100,165 L105,160 Z" fill="#1e40af" />
            <line x1="100" y1="165" x2="100" y2="190" stroke="#374151" strokeWidth="2" />

            {/* Charge symbols on balloon */}
            <text x="100" y="80" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>− − −</text>
            <text x="100" y="105" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>− − −</text>

            {/* Balloon label */}
            <text x="100" y="210" textAnchor="middle" fill={colors.negative} fontSize="11" fontWeight="600">Charged: −2 μC</text>

            {/* Wall - 3D gradient */}
            <rect x="255" y="35" width="35" height="140" rx="4" fill="url(#coulNeutralGrad)" />
            {/* Wall highlight */}
            <rect x="255" y="35" width="8" height="140" rx="2" fill="rgba(255,255,255,0.1)" />
            {/* Wall label */}
            <text x="330" y="95" textAnchor="middle" fill={colors.textSecondary} fontSize="13" fontWeight="600">Neutral</text>
            <text x="330" y="115" textAnchor="middle" fill={colors.textSecondary} fontSize="13" fontWeight="600">Wall</text>
            <text x="330" y="135" textAnchor="middle" fill={colors.textMuted} fontSize="10">(net charge = 0)</text>

            {/* Question mark with glow */}
            <text x="185" y="110" textAnchor="middle" fill={colors.warning} fontSize="48" fontWeight="bold" filter="url(#coulSoftGlow)" opacity="0.9">?</text>

            {/* Arrow indicating approach */}
            <line x1="150" y1="95" x2="220" y2="95" stroke={colors.textMuted} strokeWidth="2" strokeDasharray="8,4" opacity="0.5" />
          </svg>
          <p style={{ fontSize: typo.body, color: colors.textSecondary, textAlign: 'center', margin: '12px 0 0' }}>
            A charged balloon approaches a wall with NO net charge
          </p>
        </div>

        {/* Prediction options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: typo.elementGap }}>
          {twistPredictions.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                if (twistPrediction === p.id) return;
                playSound('click');
                setTwistPrediction(p.id);
                emitGameEvent('prediction_made', { prediction: p.id, predictionLabel: p.label, twist: true });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                borderRadius: '12px',
                border: twistPrediction === p.id ? `2px solid ${colors.danger}` : `1px solid ${colors.border}`,
                backgroundColor: twistPrediction === p.id ? `${colors.danger}15` : colors.bgCard,
                cursor: 'pointer',
                textAlign: 'left',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span style={{ fontSize: '20px', width: '40px', textAlign: 'center', fontFamily: 'monospace' }}>{p.icon}</span>
              <div>
                <p style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                  {p.label}
                </p>
                <p style={{ fontSize: typo.small, color: colors.textSecondary, margin: 0 }}>
                  {p.desc}
                </p>
              </div>
              {twistPrediction === p.id && <span style={{ color: colors.danger, fontSize: '18px' }}>✓</span>}
            </button>
          ))}
        </div>
      </div>,
      renderBottomBar(true, !!twistPrediction, 'See What Happens', undefined, colors.danger)
    );
  }

  // TWIST_PLAY
  if (phase === 'twist_play') {
    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        {renderSectionHeader('Step 5 • Polarization', 'Electrostatic Induction', 'See how charges redistribute in neutral objects')}

        {/* Animation - Premium SVG */}
        <div style={{
          backgroundColor: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: typo.sectionGap,
          border: `1px solid ${colors.border}`
        }}>
          <svg viewBox="0 0 500 320" style={{ width: '100%' }}>
            {renderPremiumSVGDefs()}

            {/* Premium lab background */}
            <rect x="0" y="0" width="500" height="320" fill="url(#coulLabBg)" rx="8" />
            <rect x="0" y="0" width="500" height="320" fill="url(#coulLabGrid)" rx="8" />

            {/* Electric field lines from balloon to wall */}
            {[0, 1, 2, 3, 4].map(i => {
              const balloonOffset = 80 + Math.sin(animationTime) * 25;
              const yPos = 80 + i * 40;
              const flowOffset = (animationTime * 50) % 180;
              return (
                <g key={`field-${i}`}>
                  <path
                    d={`M ${balloonOffset + 145} ${yPos} Q ${balloonOffset + 200} ${yPos + Math.sin(animationTime * 2 + i) * 8} 285 ${yPos}`}
                    stroke="url(#coulFieldLineGrad)"
                    strokeWidth="2"
                    fill="none"
                    opacity={0.4 + Math.sin(animationTime + i) * 0.15}
                    filter="url(#coulFieldGlowFilter)"
                  />
                  {/* Flow particle */}
                  <circle
                    cx={balloonOffset + 145 + (flowOffset % 140)}
                    cy={yPos + Math.sin((flowOffset / 140) * Math.PI + i) * 8}
                    r="2"
                    fill="#c4b5fd"
                    opacity={0.6}
                  />
                </g>
              );
            })}

            {/* Balloon approaching - with oscillation */}
            <g transform={`translate(${80 + Math.sin(animationTime) * 25}, 0)`}>
              {/* Balloon glow */}
              <ellipse cx="100" cy="150" rx={70 + Math.sin(animationTime * 2) * 5} ry={80 + Math.sin(animationTime * 2) * 5} fill="url(#coulNegativeGlow)" />

              {/* Balloon - 3D gradient */}
              <ellipse cx="100" cy="150" rx="55" ry="65" fill="url(#coulBalloonGrad)" filter="url(#coulNegativeGlowFilter)" />
              {/* Balloon highlight */}
              <ellipse cx="80" cy="125" rx="18" ry="22" fill="url(#coulNegativeHighlight)" />

              {/* Charge symbols */}
              <text x="100" y="135" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>− − −</text>
              <text x="100" y="160" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>− − −</text>
              <text x="100" y="185" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>− − −</text>

              {/* Balloon knot */}
              <path d="M100,215 L93,225 L100,232 L107,225 Z" fill="#1e40af" />
              <line x1="100" y1="232" x2="100" y2="260" stroke="#374151" strokeWidth="2" />
            </g>

            {/* Wall - 3D gradient with depth */}
            <rect x="280" y="45" width="110" height="210" rx="6" fill="url(#coulNeutralGrad)" />
            {/* Wall side highlight */}
            <rect x="280" y="45" width="12" height="210" rx="3" fill="rgba(255,255,255,0.08)" />

            {/* Polarized charges in wall - animated separation */}
            {[0, 1, 2, 3, 4].map(i => {
              const chargeShift = Math.sin(animationTime * 2) * 8;
              const yPos = 80 + i * 40;
              return (
                <g key={`polarized-${i}`}>
                  {/* Positive (attracted to balloon - moves left) */}
                  <circle
                    cx={300 + chargeShift}
                    cy={yPos}
                    r="12"
                    fill="url(#coulPositive3D)"
                    filter="url(#coulPositiveGlowFilter)"
                  />
                  <circle cx={296 + chargeShift} cy={yPos - 4} r="4" fill="url(#coulPositiveHighlight)" />
                  <text
                    x={300 + chargeShift}
                    y={yPos + 5}
                    textAnchor="middle"
                    fill="white"
                    fontSize="14"
                    fontWeight="bold"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                  >+</text>

                  {/* Negative (repelled from balloon - moves right) */}
                  <circle
                    cx={370 - chargeShift}
                    cy={yPos}
                    r="12"
                    fill="url(#coulNegative3D)"
                    filter="url(#coulNegativeGlowFilter)"
                  />
                  <circle cx={366 - chargeShift} cy={yPos - 4} r="4" fill="url(#coulNegativeHighlight)" />
                  <text
                    x={370 - chargeShift}
                    y={yPos + 5}
                    textAnchor="middle"
                    fill="white"
                    fontSize="14"
                    fontWeight="bold"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                  >−</text>

                  {/* Connection line showing separation */}
                  <line
                    x1={312 + chargeShift}
                    y1={yPos}
                    x2={358 - chargeShift}
                    y2={yPos}
                    stroke={colors.textMuted}
                    strokeWidth="1"
                    strokeDasharray="3,3"
                    opacity="0.4"
                  />
                </g>
              );
            })}

            {/* Force arrow with glow */}
            <g filter="url(#coulForceGlowFilter)">
              <line
                x1={80 + Math.sin(animationTime) * 25 + 160}
                y1="150"
                x2="260"
                y2="150"
                stroke="url(#coulAttractionArrow)"
                strokeWidth="6"
                strokeLinecap="round"
                markerEnd="url(#coulAttractionHead)"
              />
            </g>
            {/* Force label */}
            <rect x="185" y="120" width="80" height="22" rx="4" fill={colors.bgCard} fillOpacity="0.9" />
            <text x="225" y="136" textAnchor="middle" fill={colors.success} fontSize="12" fontWeight="700">ATTRACTION!</text>

            {/* Labels */}
            <text x={80 + Math.sin(animationTime) * 25 + 100} y="300" textAnchor="middle" fill={colors.negative} fontSize="11" fontWeight="600">Charged Balloon (−2 μC)</text>
            <text x="335" y="300" textAnchor="middle" fill={colors.textMuted} fontSize="11" fontWeight="600">Neutral Wall (Polarized)</text>

            {/* Diagram annotations */}
            <text x="300" y="38" textAnchor="start" fill={colors.positive} fontSize="9" opacity="0.8">+ attracted</text>
            <text x="355" y="38" textAnchor="end" fill={colors.negative} fontSize="9" opacity="0.8">− repelled</text>
          </svg>
        </div>

        {/* Explanation steps */}
        <div style={{ marginBottom: typo.sectionGap }}>
          {[
            { step: 1, color: colors.negative, text: "Balloon's negative charge repels electrons in wall surface" },
            { step: 2, color: colors.positive, text: "Positive charges (protons) are left closer to balloon" },
            { step: 3, color: colors.success, text: "F ∝ 1/r² means closer + charges create stronger attraction" },
            { step: 4, color: colors.accent, text: "Net result: Balloon sticks to the wall!" }
          ].map((s) => (
            <div key={s.step} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              marginBottom: '10px'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                backgroundColor: s.color,
                color: '#fff',
                fontSize: typo.small,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>{s.step}</div>
              <p style={{ fontSize: typo.body, color: colors.textSecondary, margin: 0 }}>{s.text}</p>
            </div>
          ))}
        </div>

        {/* Key insight */}
        <div style={{
          backgroundColor: `${colors.success}15`,
          border: `1px solid ${colors.success}30`,
          borderRadius: '12px',
          padding: '14px'
        }}>
          <p style={{ fontSize: typo.body, color: colors.success, fontWeight: 700, margin: 0 }}>
            🎈 This is why a balloon sticks to walls after rubbing on your hair!
          </p>
        </div>
      </div>,
      renderBottomBar(true, true, 'Understand Why')
    );
  }

  // TWIST_REVIEW
  if (phase === 'twist_review') {
    const insights = [
      { icon: '🎈', title: 'Polarization', desc: 'Charges shift within neutral objects near charges' },
      { icon: '📐', title: '1/r² Asymmetry', desc: 'Closer charges dominate due to inverse square' },
      { icon: '⚡', title: 'Static Cling', desc: 'Explains clothes, dust attraction, water bending' }
    ];

    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        {renderSectionHeader('Step 6 • Deep Insight', 'Electrostatic Induction Revealed')}

        {/* Comparison cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: typo.elementGap, marginBottom: typo.sectionGap }}>
          <div style={{
            background: `linear-gradient(135deg, ${colors.accent}15 0%, ${colors.accent}05 100%)`,
            border: `1px solid ${colors.accent}30`,
            borderRadius: '12px',
            padding: typo.cardPadding
          }}>
            <span style={{ fontSize: '24px' }}>🔵</span>
            <h3 style={{ fontSize: typo.body, fontWeight: 700, color: colors.accent, margin: '8px 0 4px' }}>Charged Object</h3>
            <p style={{ fontSize: typo.small, color: colors.textSecondary, margin: 0 }}>Attracts opposites, repels likes</p>
          </div>
          <div style={{
            background: `linear-gradient(135deg, ${colors.warning}15 0%, ${colors.warning}05 100%)`,
            border: `1px solid ${colors.warning}30`,
            borderRadius: '12px',
            padding: typo.cardPadding
          }}>
            <span style={{ fontSize: '24px' }}>⚪</span>
            <h3 style={{ fontSize: typo.body, fontWeight: 700, color: colors.warning, margin: '8px 0 4px' }}>Neutral Object</h3>
            <p style={{ fontSize: typo.small, color: colors.textSecondary, margin: 0 }}>Becomes polarized → attracted!</p>
          </div>
        </div>

        {/* Quote */}
        <div style={{
          backgroundColor: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: typo.sectionGap,
          border: `1px solid ${colors.border}`,
          textAlign: 'center'
        }}>
          <p style={{ fontSize: typo.body, color: colors.textSecondary, fontStyle: 'italic', margin: 0 }}>
            "The attraction to a polarized neutral object falls off as 1/r⁴—even faster than Coulomb's Law!"
          </p>
        </div>

        {/* Key insights */}
        <div>
          <p style={{ fontSize: typo.label, fontWeight: 700, color: colors.textMuted, marginBottom: '8px', textTransform: 'uppercase' }}>
            Key Insights
          </p>
          {insights.map((t, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px',
              backgroundColor: colors.bgCard,
              borderRadius: '10px',
              marginBottom: '6px',
              border: `1px solid ${colors.border}`
            }}>
              <span style={{ fontSize: '20px' }}>{t.icon}</span>
              <div>
                <span style={{ fontSize: typo.body, fontWeight: 700, color: colors.textPrimary }}>{t.title}: </span>
                <span style={{ fontSize: typo.body, color: colors.textSecondary }}>{t.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>,
      renderBottomBar(true, true, 'Real-World Applications')
    );
  }

  // TRANSFER
  if (phase === 'transfer') {
    const app = transferApps[activeAppIndex];
    const allComplete = completedApps.every(c => c);
    const currentAppComplete = completedApps[activeAppIndex];
    const isLastApp = activeAppIndex === transferApps.length - 1;

    // Handle app tab click with proper event emission
    const handleAppTabClick = (index: number) => {
      if (index === activeAppIndex) return; // Already on this app

      // Only allow clicking on completed apps or the next unlocked one
      const canAccess = index === 0 || completedApps[index - 1] || completedApps[index];
      if (!canAccess) return;

      setActiveAppIndex(index);
      const targetApp = transferApps[index];

      // Override screenDescription and coachMessage with app-specific info
      const appScreenDescription = `REAL WORLD APPLICATION ${index + 1}/4: "${targetApp.title}" - ${targetApp.tagline}. ${targetApp.description}`;
      const appCoachMessage = `Now let's explore ${targetApp.title}! ${targetApp.tagline}. ${targetApp.connection}`;

      emitGameEvent('app_changed', {
        appNumber: index + 1,
        totalApps: 4,
        appTitle: targetApp.title,
        appTagline: targetApp.tagline,
        appConnection: targetApp.connection,
        screenDescription: appScreenDescription,
        coachMessage: appCoachMessage,
        message: `NOW viewing Real-World Application ${index + 1}/4: ${targetApp.title}. ${targetApp.tagline}. Physics connection: ${targetApp.connection}`
      });
    };

    // Handle continue to next app
    const handleContinueToNextApp = () => {
      if (activeAppIndex < transferApps.length - 1) {
        const nextIndex = activeAppIndex + 1;
        setActiveAppIndex(nextIndex);
        const targetApp = transferApps[nextIndex];

        // Override screenDescription and coachMessage with app-specific info
        const appScreenDescription = `REAL WORLD APPLICATION ${nextIndex + 1}/4: "${targetApp.title}" - ${targetApp.tagline}. ${targetApp.description}`;
        const appCoachMessage = `Now let's explore ${targetApp.title}! ${targetApp.tagline}. ${targetApp.connection}`;

        emitGameEvent('app_changed', {
          appNumber: nextIndex + 1,
          totalApps: 4,
          appTitle: targetApp.title,
          appTagline: targetApp.tagline,
          appConnection: targetApp.connection,
          screenDescription: appScreenDescription,
          coachMessage: appCoachMessage,
          message: `NOW viewing Real-World Application ${nextIndex + 1}/4: ${targetApp.title}. ${targetApp.tagline}. Physics connection: ${targetApp.connection}`
        });
      }
    };

    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        {renderSectionHeader('Step 7 • Real World', 'Electrostatics in Technology')}

        {/* App tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: typo.sectionGap, flexWrap: 'wrap' }}>
          {transferApps.map((a, i) => {
            const isLocked = i > 0 && !completedApps[i - 1] && !completedApps[i];
            const isActive = i === activeAppIndex;
            return (
              <button
                key={i}
                onClick={() => !isLocked && handleAppTabClick(i)}
                disabled={isLocked}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: isActive ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                  backgroundColor: isActive ? `${colors.primary}20` : completedApps[i] ? `${colors.success}20` : colors.bgCard,
                  color: isLocked ? colors.textMuted : colors.textPrimary,
                  fontSize: typo.small,
                  fontWeight: 600,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {isLocked ? '🔒' : completedApps[i] && !isActive ? '✓' : a.icon}
                {!isMobile && a.short}
              </button>
            );
          })}
        </div>

        {/* App content */}
        <div style={{
          backgroundColor: colors.bgCard,
          borderRadius: '12px',
          padding: typo.cardPadding,
          border: `1px solid ${colors.border}`,
          marginBottom: typo.sectionGap
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '32px' }}>{app.icon}</span>
            <div>
              <h3 style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
              <p style={{ fontSize: typo.small, color: colors.textMuted, margin: 0 }}>{app.tagline}</p>
            </div>
          </div>

          <p style={{ fontSize: typo.body, color: colors.textSecondary, marginBottom: '12px' }}>{app.description}</p>

          <div style={{ backgroundColor: colors.bgCardLight, borderRadius: '8px', padding: '10px', marginBottom: '12px' }}>
            <p style={{ fontSize: typo.small, color: colors.primary, fontWeight: 600, margin: '0 0 4px' }}>🔗 Physics Connection</p>
            <p style={{ fontSize: typo.small, color: colors.textSecondary, margin: 0 }}>{app.connection}</p>
          </div>

          <div style={{ backgroundColor: colors.bgCardLight, borderRadius: '8px', padding: '10px', marginBottom: '12px' }}>
            <p style={{ fontSize: typo.small, color: colors.warning, fontWeight: 600, margin: '0 0 4px' }}>⚙️ How It Works</p>
            <p style={{ fontSize: typo.small, color: colors.textSecondary, margin: 0 }}>{app.howItWorks}</p>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {app.stats.map((s, i) => (
              <div key={i} style={{
                flex: 1,
                minWidth: '80px',
                backgroundColor: colors.bgCardLight,
                borderRadius: '8px',
                padding: '8px',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: typo.bodyLarge, fontWeight: 800, color: colors.primary, margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: '9px', color: colors.textMuted, margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Examples */}
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: typo.small, color: colors.textMuted, fontWeight: 600, marginBottom: '4px' }}>Examples:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {app.examples.map((ex, i) => (
                <span key={i} style={{
                  padding: '4px 8px',
                  backgroundColor: colors.bgCardLight,
                  borderRadius: '4px',
                  fontSize: '10px',
                  color: colors.textSecondary
                }}>{ex}</span>
              ))}
            </div>
          </div>

          {/* Complete button - only show if not completed */}
          {!currentAppComplete && (
            <button
              onClick={() => {
                playSound('success');
                const newCompleted = [...completedApps];
                newCompleted[activeAppIndex] = true;
                setCompletedApps(newCompleted);
                emitGameEvent('app_completed', {
                  appNumber: activeAppIndex + 1,
                  appTitle: app.title,
                  message: `Completed application ${activeAppIndex + 1}/4: ${app.title}`
                });
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: colors.success,
                color: '#fff',
                fontSize: typo.body,
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: '12px'
              }}
            >
              ✓ Mark as Complete
            </button>
          )}

          {/* Continue button - show after completing current app, if not last app */}
          {currentAppComplete && !isLastApp && (
            <button
              onClick={handleContinueToNextApp}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                color: '#fff',
                fontSize: typo.body,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: `0 4px 20px ${colors.primary}40`,
                marginBottom: '12px'
              }}
            >
              Continue to {transferApps[activeAppIndex + 1].title} →
            </button>
          )}
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span style={{ fontSize: typo.small, color: colors.textMuted }}>Progress:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {completedApps.map((c, i) => (
              <div key={i} style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: c ? colors.success : colors.bgCardLight
              }} />
            ))}
          </div>
          <span style={{ fontSize: typo.small, color: colors.textMuted }}>
            {completedApps.filter(c => c).length}/4
          </span>
        </div>
      </div>,
      // Bottom bar logic:
      // - If all complete: Show "Take the Test"
      // - If current app complete but not last: Show "Continue to Next App"
      // - If current app not complete: Show disabled "Mark Complete First"
      allComplete
        ? renderBottomBar(true, true, 'Take the Test', undefined, colors.warning)
        : currentAppComplete && !isLastApp
          ? renderBottomBar(true, true, `Continue to ${transferApps[activeAppIndex + 1].title}`, handleContinueToNextApp)
          : renderBottomBar(true, false, 'Mark Complete First')
    );
  }

  // TEST
  if (phase === 'test') {
    if (showResults) {
      const passed = testScore >= 7;

      return renderPremiumWrapper(
        <div style={{ padding: typo.pagePadding }}>
          {renderSectionHeader('Step 8 • Results', passed ? 'Excellent Work!' : 'Keep Learning')}

          {/* Score display */}
          <div style={{
            backgroundColor: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            marginBottom: typo.sectionGap,
            border: `1px solid ${colors.border}`
          }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>
              {passed ? '⚡' : '📚'}
            </div>
            <p style={{ fontSize: '32px', fontWeight: 800, color: passed ? colors.success : colors.warning, margin: '0 0 8px' }}>
              {testScore}/10
            </p>
            <p style={{ fontSize: typo.body, color: colors.textSecondary, margin: 0 }}>
              {passed ? "You've mastered Coulomb's Law!" : 'Review the concepts and try again'}
            </p>
          </div>

          {/* Review answers */}
          <div style={{ marginBottom: typo.sectionGap }}>
            {testQuestions.map((q, idx) => {
              const userAnswer = testAnswers[idx];
              const correctIdx = q.options.findIndex(o => o.correct);
              const isCorrect = userAnswer === correctIdx;

              return (
                <div key={idx} style={{
                  backgroundColor: isCorrect ? `${colors.success}10` : `${colors.danger}10`,
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '8px',
                  border: `1px solid ${isCorrect ? colors.success : colors.danger}30`
                }}>
                  <p style={{ fontSize: typo.small, color: colors.textPrimary, fontWeight: 600, margin: '0 0 4px' }}>
                    {idx + 1}. {q.question}
                  </p>
                  <p style={{ fontSize: typo.small, color: isCorrect ? colors.success : colors.danger, margin: 0 }}>
                    Your answer: {userAnswer !== null ? q.options[userAnswer].label : 'Not answered'}
                  </p>
                  {!isCorrect && (
                    <p style={{ fontSize: typo.small, color: colors.success, margin: '4px 0 0' }}>
                      Correct: {q.options[correctIdx].label}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {passed ? (
            <button
              onClick={() => goToPhase('mastery')}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.success} 0%, ${colors.primary} 100%)`,
                color: '#fff',
                fontSize: typo.bodyLarge,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Claim Your Mastery Badge →
            </button>
          ) : (
            <button
              onClick={() => {
                setShowResults(false);
                setTestAnswers(Array(10).fill(null));
                setCurrentQuestion(0);
                goToPhase('review');
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                color: '#fff',
                fontSize: typo.bodyLarge,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Review & Try Again
            </button>
          )}
        </div>
      );
    }

    const q = testQuestions[currentQuestion];

    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding }}>
        {renderSectionHeader('Step 8 • Knowledge Test', `Question ${currentQuestion + 1} of 10`)}

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: '3px', marginBottom: typo.sectionGap }}>
          {Array(10).fill(0).map((_, i) => (
            <div key={i} style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              backgroundColor: i < currentQuestion ? colors.success : i === currentQuestion ? colors.primary : colors.bgCardLight
            }} />
          ))}
        </div>

        {/* Scenario */}
        <div style={{
          backgroundColor: `${colors.primary}15`,
          border: `1px solid ${colors.primary}30`,
          borderRadius: '10px',
          padding: '12px',
          marginBottom: typo.sectionGap
        }}>
          <p style={{ fontSize: typo.small, color: colors.primary, fontStyle: 'italic', margin: 0 }}>
            {q.scenario}
          </p>
        </div>

        {/* Question */}
        <p style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary, marginBottom: typo.sectionGap }}>
          {q.question}
        </p>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: typo.elementGap, marginBottom: typo.sectionGap }}>
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => {
                if (testAnswers[currentQuestion] === i) return; // Already selected
                playSound('click');
                const newAnswers = [...testAnswers];
                newAnswers[currentQuestion] = i;
                setTestAnswers(newAnswers);
                emitGameEvent('answer_submitted', {
                  questionNumber: currentQuestion + 1,
                  answer: opt.label,
                  isCorrect: opt.correct || false
                });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '10px',
                border: testAnswers[currentQuestion] === i ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                backgroundColor: testAnswers[currentQuestion] === i ? `${colors.primary}15` : colors.bgCard,
                cursor: 'pointer',
                textAlign: 'left',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: testAnswers[currentQuestion] === i ? colors.primary : colors.bgCardLight,
                color: testAnswers[currentQuestion] === i ? '#fff' : colors.textMuted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: typo.small,
                fontWeight: 700
              }}>
                {String.fromCharCode(65 + i)}
              </span>
              <span style={{ fontSize: typo.body, color: colors.textPrimary }}>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>,
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard
      }}>
        <button
          onClick={() => currentQuestion > 0 && setCurrentQuestion(currentQuestion - 1)}
          disabled={currentQuestion === 0}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            border: `1px solid ${colors.border}`,
            backgroundColor: 'transparent',
            color: currentQuestion === 0 ? colors.textMuted : colors.textSecondary,
            fontSize: typo.body,
            fontWeight: 600,
            cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
            opacity: currentQuestion === 0 ? 0.5 : 1
          }}
        >
          ← Previous
        </button>

        <span style={{ fontSize: typo.small, color: colors.textMuted }}>
          {currentQuestion + 1}/10
        </span>

        {currentQuestion < 9 ? (
          <button
            onClick={() => testAnswers[currentQuestion] !== null && setCurrentQuestion(currentQuestion + 1)}
            disabled={testAnswers[currentQuestion] === null}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: testAnswers[currentQuestion] !== null
                ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`
                : colors.bgCardLight,
              color: testAnswers[currentQuestion] !== null ? '#fff' : colors.textMuted,
              fontSize: typo.body,
              fontWeight: 700,
              cursor: testAnswers[currentQuestion] !== null ? 'pointer' : 'not-allowed',
              opacity: testAnswers[currentQuestion] !== null ? 1 : 0.5
            }}
          >
            Next →
          </button>
        ) : (
          <button
            onClick={() => {
              if (!testAnswers.includes(null)) {
                playSound('complete');
                setShowResults(true);
                emitGameEvent('game_completed', {
                  score: testScore,
                  maxScore: 10,
                  passed: testScore >= 7
                });
              }
            }}
            disabled={testAnswers.includes(null)}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: !testAnswers.includes(null)
                ? `linear-gradient(135deg, ${colors.success} 0%, ${colors.primary} 100%)`
                : colors.bgCardLight,
              color: !testAnswers.includes(null) ? '#fff' : colors.textMuted,
              fontSize: typo.body,
              fontWeight: 700,
              cursor: !testAnswers.includes(null) ? 'pointer' : 'not-allowed',
              opacity: !testAnswers.includes(null) ? 1 : 0.5
            }}
          >
            Submit →
          </button>
        )}
      </div>
    );
  }

  // MASTERY
  if (phase === 'mastery') {
    const percentage = Math.round((testScore / 10) * 100);
    const isPassing = testScore >= 7;

    // Handle return to dashboard
    const handleReturnToDashboard = () => {
      emitGameEvent('button_clicked', {
        action: 'return_to_dashboard',
        message: 'User requested to return to dashboard'
      });
      window.dispatchEvent(new CustomEvent('returnToDashboard'));
    };

    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {renderSectionHeader(
          'Step 10 • Results',
          isPassing ? "Coulomb's Law Master!" : 'Keep Practicing!'
        )}

        {/* Badge */}
        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: isPassing
            ? `linear-gradient(135deg, ${colors.positive} 0%, ${colors.negative} 100%)`
            : colors.bgCardLight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          boxShadow: isPassing ? `0 0 40px ${colors.primary}40` : 'none'
        }}>
          <span style={{ fontSize: '56px' }}>{isPassing ? '⚡' : '📚'}</span>
        </div>

        {/* Score */}
        <p style={{ fontSize: typo.bodyLarge, color: colors.textSecondary, marginBottom: '8px' }}>
          You scored <span style={{ fontWeight: 700, color: isPassing ? colors.success : colors.danger }}>{testScore}/10</span> ({percentage}%)
        </p>

        <p style={{ fontSize: typo.small, color: colors.textMuted, marginBottom: '24px', textAlign: 'center' }}>
          {isPassing ? "Congratulations! You've mastered Coulomb's Law!" : 'You need 70% to pass. Review and try again!'}
        </p>

        {/* Mastered concepts - only show checkmarks if passing */}
        <div style={{ width: '100%', maxWidth: '400px', marginBottom: '24px' }}>
          {masteryItems.map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: `linear-gradient(135deg, ${item.color}15 0%, ${item.color}05 100%)`,
              border: `1px solid ${item.color}30`,
              borderRadius: '10px',
              marginBottom: '8px'
            }}>
              {isPassing && (
                <span style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: colors.success,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px'
                }}>✓</span>
              )}
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <div>
                <p style={{ fontSize: typo.body, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>{item.title}</p>
                <p style={{ fontSize: typo.small, color: colors.textSecondary, margin: 0 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quote */}
        <div style={{
          backgroundColor: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          maxWidth: '400px',
          textAlign: 'center',
          border: `1px solid ${colors.border}`
        }}>
          <p style={{ fontSize: typo.body, color: colors.textSecondary, fontStyle: 'italic', margin: 0 }}>
            "The universe is not only queerer than we suppose, but queerer than we can suppose."
          </p>
          <p style={{ fontSize: typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — J.B.S. Haldane
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px' }}>
          {/* Primary action */}
          {isPassing ? (
            <button
              onClick={handleReturnToDashboard}
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                color: '#fff',
                fontSize: typo.bodyLarge,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: `0 4px 20px ${colors.primary}40`
              }}
            >
              🏠 Return to Dashboard
            </button>
          ) : (
            <button
              onClick={() => {
                setShowResults(false);
                setTestAnswers(Array(10).fill(null));
                setCurrentQuestion(0);
                goToPhase('test');
              }}
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                color: '#fff',
                fontSize: typo.bodyLarge,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: `0 4px 20px ${colors.primary}40`
              }}
            >
              ↺ Retake Test
            </button>
          )}

          {/* Secondary action - Review Lesson */}
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              backgroundColor: 'transparent',
              color: colors.textSecondary,
              fontSize: typo.body,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🔬 Review Lesson
          </button>

          {/* Tertiary action - Return to Dashboard (if not passing) */}
          {!isPassing && (
            <button
              onClick={handleReturnToDashboard}
              style={{
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                background: 'transparent',
                color: colors.textMuted,
                fontWeight: 600,
                fontSize: typo.small,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Return to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  // Default fallback
  return renderPremiumWrapper(
    <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
      <p>Loading...</p>
    </div>
  );
};

export default CoulombsLawRenderer;
