'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

// =============================================================================
// DIFFRACTION RENDERER - SINGLE & DOUBLE SLIT PATTERNS
// =============================================================================
// Premium educational game demonstrating light diffraction through narrow slits.
// Students explore single-slit patterns, Young's double-slit experiment,
// and discover direct evidence that light behaves as a wave.
// =============================================================================

// Premium Design System
const defined = {
  colors: {
    primary: '#6366F1',
    primaryDark: '#4F46E5',
    secondary: '#8B5CF6',
    accent: '#F59E0B',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    background: {
      primary: '#0F172A',
      secondary: '#1E293B',
      tertiary: '#334155',
      card: 'rgba(30, 41, 59, 0.8)',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
      muted: '#64748B',
    },
    laser: {
      red: '#EF4444',
      green: '#22C55E',
      blue: '#3B82F6',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    glow: '0 0 20px rgba(99, 102, 241, 0.3)',
  },
};

// =============================================================================
// PHYSICS CONSTANTS
// =============================================================================
const WAVELENGTHS: Record<string, { name: string; wavelength: number; color: string }> = {
  red: { name: 'Red', wavelength: 650, color: '#EF4444' },
  green: { name: 'Green', wavelength: 532, color: '#22C55E' },
  blue: { name: 'Blue', wavelength: 450, color: '#3B82F6' },
};

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================
type Phase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

interface QuestionOption {
  text: string;
  correct: boolean;
}

interface Question {
  id: number;
  question: string;
  options: QuestionOption[];
  explanation: string;
}

interface Application {
  id: number;
  title: string;
  description: string;
  icon: string;
  details: string[];
}

// =============================================================================
// QUESTIONS DATA
// =============================================================================
const questions: Question[] = [
  {
    id: 1,
    question: 'What does diffraction prove about light?',
    options: [
      { text: 'Light is made of particles', correct: false },
      { text: 'Light behaves as a wave', correct: true },
      { text: 'Light travels in straight lines only', correct: false },
      { text: 'Light has mass', correct: false },
    ],
    explanation:
      'Diffraction patterns can only be explained by wave behavior. Particles would create sharp shadows, but waves bend around edges and interfere with each other.',
  },
  {
    id: 2,
    question: 'In a single-slit pattern, what creates the dark bands (minima)?',
    options: [
      { text: 'Light is absorbed at those points', correct: false },
      { text: 'Destructive interference between waves from different parts of the slit', correct: true },
      { text: 'The screen blocks light at those spots', correct: false },
      { text: 'The slit filters out some light', correct: false },
    ],
    explanation:
      'Different parts of the wavefront passing through the slit travel different distances. Where they arrive out of phase, they cancel (destructive interference), creating dark bands.',
  },
  {
    id: 3,
    question: "What happens to the diffraction pattern if you make the slit NARROWER?",
    options: [
      { text: 'Pattern gets narrower', correct: false },
      { text: 'Pattern gets wider (more spreading)', correct: true },
      { text: 'Pattern disappears', correct: false },
      { text: 'No change', correct: false },
    ],
    explanation:
      "Narrower slits cause more spreading! This seems counterintuitive, but smaller apertures diffract light more. Think of squeezing water through a narrow gap - it fans out more.",
  },
  {
    id: 4,
    question: 'In Young\'s double-slit experiment, what creates the pattern of bright fringes?',
    options: [
      { text: 'Light reflecting between the slits', correct: false },
      { text: 'Constructive interference where waves arrive in phase', correct: true },
      { text: 'The slits acting as lenses', correct: false },
      { text: 'Different colors separating', correct: false },
    ],
    explanation:
      'Light from both slits travels to the screen. Where path lengths differ by whole wavelengths (0, λ, 2λ...), waves arrive in phase and add up constructively - bright fringe!',
  },
  {
    id: 5,
    question: 'For double-slit interference, where is the central bright fringe?',
    options: [
      { text: 'Directly behind one slit', correct: false },
      { text: 'At the point equidistant from both slits', correct: true },
      { text: 'At the edge of the screen', correct: false },
      { text: 'It moves randomly', correct: false },
    ],
    explanation:
      'The central maximum is where both waves travel equal distances - zero path difference. Waves arrive perfectly in phase, creating the brightest fringe.',
  },
  {
    id: 6,
    question: 'If you use red light instead of blue, how does the fringe spacing change?',
    options: [
      { text: 'Spacing decreases (fringes closer together)', correct: false },
      { text: 'Spacing increases (fringes farther apart)', correct: true },
      { text: 'No change - color doesn\'t matter', correct: false },
      { text: 'Fringes disappear', correct: false },
    ],
    explanation:
      'Fringe spacing is proportional to wavelength. Red light (λ ≈ 650nm) has longer wavelength than blue (λ ≈ 450nm), so red produces wider-spaced fringes.',
  },
  {
    id: 7,
    question: 'What is the condition for a bright fringe in double-slit interference?',
    options: [
      { text: 'd·sin(θ) = (m + ½)λ', correct: false },
      { text: 'd·sin(θ) = mλ (where m = 0, 1, 2...)', correct: true },
      { text: 'd·cos(θ) = mλ', correct: false },
      { text: 'λ/d = sin(θ)', correct: false },
    ],
    explanation:
      'Bright fringes occur when path difference equals a whole number of wavelengths: d·sin(θ) = mλ. The integer m indicates the fringe order (0 = central, 1 = first, etc.).',
  },
  {
    id: 8,
    question: 'Why is diffraction more noticeable with laser light than sunlight?',
    options: [
      { text: 'Lasers are brighter', correct: false },
      { text: 'Laser light is coherent (same phase and wavelength)', correct: true },
      { text: 'Sunlight is too heavy', correct: false },
      { text: 'Lasers travel faster', correct: false },
    ],
    explanation:
      'Coherence is key! Laser light has a single wavelength and consistent phase. Sunlight contains many wavelengths and random phases, blurring interference patterns.',
  },
  {
    id: 9,
    question: "What happens in single-slit diffraction as slit width approaches zero?",
    options: [
      { text: 'Light stops passing through', correct: false },
      { text: 'The pattern approaches a single very wide central maximum', correct: true },
      { text: 'Multiple sharp fringes appear', correct: false },
      { text: 'Light travels backward', correct: false },
    ],
    explanation:
      "As the slit narrows, diffraction increases until the central maximum spreads across nearly the entire screen. In the limit, the slit acts as a point source radiating in all directions.",
  },
  {
    id: 10,
    question: 'Electron diffraction experiments show electrons have wave properties. What does this demonstrate?',
    options: [
      { text: 'Electrons are actually made of light', correct: false },
      { text: 'Wave-particle duality applies to matter too', correct: true },
      { text: 'Diffraction only works with charged particles', correct: false },
      { text: 'Electrons are heavier than expected', correct: false },
    ],
    explanation:
      'De Broglie proposed all matter has wave-like properties. Electron diffraction through crystals produces patterns just like light diffraction - confirming quantum wave-particle duality!',
  },
];

// =============================================================================
// APPLICATIONS DATA
// =============================================================================
const applications: Application[] = [
  {
    id: 1,
    title: 'CD/DVD Reading',
    description: 'Laser track detection',
    icon: '💿',
    details: [
      'CD tracks are 1.6μm apart - comparable to laser wavelength',
      'Diffraction from pit patterns encodes data as intensity changes',
      'Blu-ray uses shorter wavelength (405nm) for finer track pitch (320nm)',
      'The same physics enables DVD to hold 7x more data than CD',
    ],
  },
  {
    id: 2,
    title: 'X-ray Crystallography',
    description: 'Revealing atomic structure',
    icon: '🔬',
    details: [
      'X-rays have wavelengths similar to atomic spacing (~0.1nm)',
      'Crystal lattice acts as a 3D diffraction grating',
      'Diffraction pattern reveals atomic arrangement',
      'Used to discover DNA double helix structure (Rosalind Franklin)',
    ],
  },
  {
    id: 3,
    title: 'Holography',
    description: '3D images from interference',
    icon: '✨',
    details: [
      'Hologram records interference pattern between object and reference beams',
      'When illuminated, diffraction recreates the original wavefront',
      'Produces true 3D images viewable from different angles',
      'Security holograms on credit cards use the same principle',
    ],
  },
  {
    id: 4,
    title: 'Electron Microscopy',
    description: 'Seeing atoms',
    icon: '🔎',
    details: [
      'Electron wavelength is ~100,000x smaller than visible light',
      'Can resolve individual atoms via electron diffraction',
      'Transmission electron microscopes achieve 0.05nm resolution',
      'Confirmed quantum mechanics predictions about matter waves',
    ],
  },
];

// =============================================================================
// REAL-WORLD APPLICATIONS DATA (Rich Transfer Phase)
// =============================================================================
const realWorldApps = [
  {
    icon: '🔬',
    title: 'X-Ray Crystallography',
    short: 'Protein structure determination',
    tagline: 'Revealing Molecular Architecture',
    description: 'X-ray crystallography uses diffraction patterns to determine the atomic structure of proteins, DNA, and other complex molecules. When X-rays pass through a crystal, they diffract off the regularly arranged atoms, creating a pattern that encodes the 3D structure.',
    connection: 'Just like light diffracting through your slit creates a pattern that reveals wavelength information, X-rays diffracting through crystals create patterns that reveal atomic positions. The mathematics is identical - both use wave interference!',
    howItWorks: 'A crystal is bombarded with X-rays (wavelength ~0.1nm, similar to atomic spacing). Each atom scatters the X-rays, creating interference patterns on a detector. Fourier transforms convert these patterns into electron density maps, revealing atomic positions.',
    stats: [
      { value: '100,000+', label: 'Protein structures solved', icon: '🧬' },
      { value: '0.1 nm', label: 'Resolution achieved', icon: '🎯' },
      { value: '29', label: 'Nobel Prizes awarded', icon: '🏆' }
    ],
    examples: [
      'Rosalind Franklin used X-ray diffraction to capture Photo 51, revealing DNA\'s helical structure',
      'COVID-19 spike protein structure was solved in weeks using modern crystallography',
      'Drug discovery relies on seeing how molecules fit into protein binding sites',
      'Ribosome structure (2009 Nobel Prize) required solving millions of diffraction spots'
    ],
    companies: ['Diamond Light Source', 'SLAC National Lab', 'European Synchrotron (ESRF)', 'Rigaku', 'Bruker'],
    futureImpact: 'AI-assisted crystallography and cryo-EM are revolutionizing structural biology, enabling rapid drug discovery and understanding of disease mechanisms at the atomic level.',
    color: defined.colors.primary
  },
  {
    icon: '✨',
    title: 'Holography',
    short: '3D imaging technology',
    tagline: 'Recording Light Waves in Full',
    description: 'Holograms are created by recording the interference pattern between a reference beam and light scattered from an object. When illuminated, the hologram diffracts light to recreate the original wavefront - producing a true 3D image.',
    connection: 'Your double-slit experiment shows how two coherent sources create interference patterns. A hologram records the interference between object and reference beams. When illuminated, diffraction from this pattern reconstructs the original 3D wavefront.',
    howItWorks: 'A laser beam is split into reference and object beams. The object beam illuminates the subject, and both beams meet at a photographic plate. The resulting interference pattern is recorded. When the hologram is illuminated by the reference beam, diffraction recreates the original light field.',
    stats: [
      { value: '$5.5B', label: 'Holography market (2025)', icon: '💰' },
      { value: '10,000+', label: 'Lines per mm resolution', icon: '📏' },
      { value: '1971', label: 'Gabor Nobel Prize', icon: '🏅' }
    ],
    examples: [
      'Security holograms on credit cards and banknotes prevent counterfeiting',
      'Holographic data storage can store terabytes in a sugar-cube-sized crystal',
      'Medical holography creates 3D models of organs for surgical planning',
      'Holographic displays in museums show artifacts viewable from all angles'
    ],
    companies: ['Microsoft HoloLens', 'Looking Glass Factory', 'HOLOEYE', 'Zebra Imaging', 'Light Field Lab'],
    futureImpact: 'True holographic displays and holographic telepresence are becoming reality, promising to transform communication, entertainment, and how we interact with digital information.',
    color: defined.colors.secondary
  },
  {
    icon: '🌈',
    title: 'Diffraction Gratings',
    short: 'Precision spectrometers',
    tagline: 'Separating Light by Wavelength',
    description: 'Diffraction gratings contain thousands of precisely spaced slits that spread light into its component wavelengths. This is the same physics as your double-slit experiment, but with millions of slits for extreme precision.',
    connection: 'Your double-slit shows how path difference creates constructive interference at specific angles depending on wavelength. Gratings multiply this effect with thousands of slits - each wavelength diffracts to a unique angle with incredible precision.',
    howItWorks: 'Light hits a surface with thousands of parallel grooves (slits). Each groove acts as a source of diffracted light. Constructive interference occurs at angles where d·sin(θ)=mλ. Different wavelengths meet this condition at different angles, separating the spectrum.',
    stats: [
      { value: '1,200', label: 'Lines per mm typical', icon: '📐' },
      { value: '0.001 nm', label: 'Wavelength resolution', icon: '🔍' },
      { value: '$2.3B', label: 'Spectrometer market', icon: '📊' }
    ],
    examples: [
      'Astronomers identify elements in distant stars by their spectral fingerprints',
      'Smartphones use miniature spectrometers for color calibration',
      'Environmental monitors detect pollutants by their absorption spectra',
      'Raman spectrometers identify unknown chemicals in seconds'
    ],
    companies: ['Ocean Insight', 'Horiba', 'Thorlabs', 'Newport', 'Shimadzu'],
    futureImpact: 'Portable spectrometers are democratizing chemical analysis - soon your phone may identify food freshness, counterfeit drugs, or environmental pollutants instantly.',
    color: defined.colors.accent
  },
  {
    icon: '💿',
    title: 'CD/DVD Data Storage',
    short: 'Optical media technology',
    tagline: 'Data Encoded in Diffraction',
    description: 'CDs and DVDs store data as microscopic pits along spiral tracks. The track spacing acts as a diffraction grating - that\'s why discs show rainbow colors! The laser reads data by detecting intensity changes from interference.',
    connection: 'The rainbow you see on a CD is diffraction in action - the same phenomenon as your slit experiment. Track spacing (~1.6μm for CDs) is similar to visible light wavelengths, creating beautiful diffraction patterns.',
    howItWorks: 'A focused laser reads pits and lands on the disc surface. When the beam spans a pit edge, part reflects from the pit and part from the land. These paths differ by λ/4, causing destructive interference - a drop in reflected intensity that encodes binary data.',
    stats: [
      { value: '700 MB', label: 'CD capacity', icon: '💾' },
      { value: '25 GB', label: 'Blu-ray capacity', icon: '📀' },
      { value: '200B+', label: 'Discs manufactured', icon: '🏭' }
    ],
    examples: [
      'CD track pitch (1.6μm) matches red laser wavelength for optimal reading',
      'DVD uses shorter wavelength red laser to fit more data (650nm vs 780nm)',
      'Blu-ray\'s 405nm blue laser enables 0.32μm track pitch - 5x CD density',
      'Holographic discs may store 1TB using 3D diffraction patterns'
    ],
    companies: ['Sony', 'Philips', 'Panasonic', 'Pioneer'],
    futureImpact: 'While streaming dominates, optical archival storage using advanced diffraction techniques offers century-long data preservation for libraries and archives.',
    color: defined.colors.success
  }
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const PHASES: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction', predict: 'Predict', play: 'Experiment', review: 'Understanding',
  twist_predict: 'New Variable', twist_play: 'Explore Twist', twist_review: 'Deep Insight',
  transfer: 'Real World', test: 'Knowledge Test', mastery: 'Mastery'
};

export default function DiffractionRenderer(props: { gamePhase?: string; onCorrectAnswer?: () => void }) {
  const { gamePhase, onCorrectAnswer } = props;
  // State management
  const [phase, setPhase] = useState<Phase>('hook');

  // Scroll to top on phase change
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
  }, [phase]);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Interactive simulation state
  const [slitWidth, setSlitWidth] = useState(50); // Arbitrary units
  const [slitSeparation, setSlitSeparation] = useState(100); // For double slit
  const [wavelength, setWavelength] = useState<'red' | 'green' | 'blue'>('red');
  const [slitMode, setSlitMode] = useState<'single' | 'double'>('single');
  const [showWaves, setShowWaves] = useState(true);
  const [animationPhase, setAnimationPhase] = useState(0);

  // Test phase state for confirm flow
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [confirmedIndex, setConfirmedIndex] = useState<number | null>(null);
  const [testScore, setTestScore] = useState(0);
  const [testComplete, setTestComplete] = useState(false);
  const testAnswersRef = useRef<(number | null)[]>(new Array(10).fill(null));

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionIndex] = optionIndex;
      testAnswersRef.current = newAnswers;
      return newAnswers;
    });
  };

  // Navigation debouncing
  const isNavigating = useRef(false);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickRef = useRef(0);
  const animationRef = useRef<number | null>(null);

  // Audio feedback
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

  // Sync with external gamePhase prop
  useEffect(() => {
    if (gamePhase && PHASES.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Typography responsive system
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
    const animate = () => {
      setAnimationPhase((prev) => (prev + 2) % 360);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  // =============================================================================
  // PHYSICS CALCULATIONS
  // =============================================================================
  const calculateSingleSlitPattern = useCallback(() => {
    const points: number[] = [];
    const lambda = WAVELENGTHS[wavelength].wavelength; // nm
    const a = slitWidth; // arbitrary units mapped to produce good patterns

    for (let i = -100; i <= 100; i++) {
      const theta = (i / 100) * 0.5; // Wider angular range for visible pattern
      const beta = (Math.PI * a * Math.sin(theta)) / (lambda * 0.08);

      // Single slit intensity: I = I0 * (sin(β)/β)²
      const intensity = beta === 0 ? 1 : Math.pow(Math.sin(beta) / beta, 2);
      points.push(intensity);
    }
    return points;
  }, [slitWidth, wavelength]);

  const calculateDoubleSlitPattern = useCallback(() => {
    const points: number[] = [];
    const lambda = WAVELENGTHS[wavelength].wavelength; // nm
    const a = slitWidth;
    const d = slitSeparation;

    for (let i = -100; i <= 100; i++) {
      const theta = (i / 100) * 0.5;
      const beta = (Math.PI * a * Math.sin(theta)) / (lambda * 0.08);
      const delta = (Math.PI * d * Math.sin(theta)) / (lambda * 0.08);

      // Double slit: single-slit envelope × double-slit interference
      const singleSlitFactor = beta === 0 ? 1 : Math.pow(Math.sin(beta) / beta, 2);
      const doubleSlitFactor = Math.pow(Math.cos(delta), 2);
      points.push(singleSlitFactor * doubleSlitFactor);
    }
    return points;
  }, [slitWidth, slitSeparation, wavelength]);

  const pattern = slitMode === 'single' ? calculateSingleSlitPattern() : calculateDoubleSlitPattern();

  // =============================================================================
  // NAVIGATION HANDLERS
  // =============================================================================
  const handleNavigation = useCallback((nextPhase: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;

    setPhase(nextPhase);

    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    navigationTimeoutRef.current = setTimeout(() => {
      isNavigating.current = false;
    }, 400);
  }, []);

  const handleCompleteApp = useCallback(() => {
    const newCompleted = [...completedApps];
    newCompleted[selectedApp] = true;
    setCompletedApps(newCompleted);

    if (selectedApp < applications.length - 1) {
      setSelectedApp(selectedApp + 1);
    }
  }, [completedApps, selectedApp]);

  const handleAnswerSelect = useCallback(
    (index: number) => {
      if (showResult) return;
      setSelectedAnswer(index);
      setShowResult(true);

      if (questions[currentQuestion].options[index]?.correct) {
        setScore((prev) => prev + 1);
      }
    },
    [showResult, currentQuestion]
  );

  const handleNextQuestion = useCallback(() => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      handleNavigation('mastery');
    }
  }, [currentQuestion, handleNavigation]);

  const allAppsCompleted = completedApps.every(Boolean);

  // Navigation helpers
  const goNext = useCallback(() => {
    const idx = PHASES.indexOf(phase);
    if (idx < PHASES.length - 1) handleNavigation(PHASES[idx + 1]);
  }, [phase, handleNavigation]);

  const goBack = useCallback(() => {
    const idx = PHASES.indexOf(phase);
    if (idx > 0) handleNavigation(PHASES[idx - 1]);
  }, [phase, handleNavigation]);

  // Test phase confirm handlers
  const testCurrentQ = questions[currentTestQuestion];
  const testSelectedIdx = testAnswers[currentTestQuestion];
  const testIsConfirmed = confirmedIndex !== null;

  const handleTestConfirm = () => {
    const sel = testAnswersRef.current[currentTestQuestion];
    if (sel === null || sel === undefined) return;
    setConfirmedIndex(sel);
    if (questions[currentTestQuestion]?.options[sel]?.correct) {
      setTestScore(prev => prev + 1);
      if (onCorrectAnswer) onCorrectAnswer();
    }
  };

  const handleTestNextQ = () => {
    setConfirmedIndex(null);
    if (currentTestQuestion < questions.length - 1) {
      setCurrentTestQuestion(prev => prev + 1);
    } else {
      let sc = 0;
      questions.forEach((tq, i) => {
        const correctI = tq.options.findIndex(o => o.correct);
        if (testAnswers[i] === correctI) sc++;
      });
      setTestScore(sc);
      setTestComplete(true);
    }
  };

  // =============================================================================
  // BUTTON COMPONENT
  // =============================================================================
  const Button = useCallback(
    ({
      children,
      onClick,
      variant = 'primary',
      disabled = false,
      size = 'md',
      fullWidth = false,
    }: {
      children: React.ReactNode;
      onClick: () => void;
      variant?: 'primary' | 'secondary' | 'ghost' | 'success';
      disabled?: boolean;
      size?: 'sm' | 'md' | 'lg';
      fullWidth?: boolean;
    }) => {
      const baseStyles: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: defined.spacing.sm,
        borderRadius: defined.radius.lg,
        fontFamily: defined.typography.fontFamily,
        fontWeight: defined.typography.weights.semibold,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        border: 'none',
        opacity: disabled ? 0.5 : 1,
        width: fullWidth ? '100%' : 'auto',
        ...(size === 'sm' && {
          padding: `${defined.spacing.sm} ${defined.spacing.md}`,
          fontSize: defined.typography.sizes.sm,
          minHeight: '40px',
        }),
        ...(size === 'md' && {
          padding: `${defined.spacing.md} ${defined.spacing.lg}`,
          fontSize: defined.typography.sizes.base,
          minHeight: '48px',
        }),
        ...(size === 'lg' && {
          padding: `${defined.spacing.lg} ${defined.spacing.xl}`,
          fontSize: defined.typography.sizes.lg,
          minHeight: '52px',
        }),
      };

      const variantStyles: Record<string, React.CSSProperties> = {
        primary: {
          background: `linear-gradient(135deg, ${defined.colors.primary}, ${defined.colors.primaryDark})`,
          color: defined.colors.text.primary,
          boxShadow: defined.shadows.md,
        },
        secondary: {
          background: defined.colors.background.tertiary,
          color: defined.colors.text.primary,
          border: `1px solid ${defined.colors.background.tertiary}`,
        },
        ghost: {
          background: 'transparent',
          color: defined.colors.text.secondary,
        },
        success: {
          background: `linear-gradient(135deg, ${defined.colors.success}, #059669)`,
          color: defined.colors.text.primary,
          boxShadow: defined.shadows.md,
        },
      };

      return (
        <button
          onClick={disabled ? undefined : onClick}
          disabled={disabled}
          style={{ ...baseStyles, ...variantStyles[variant] }}
        >
          {children}
        </button>
      );
    },
    []
  );

  // =============================================================================
  // PROGRESS BAR COMPONENT
  // =============================================================================
  const ProgressBar = useCallback(
    ({ current, total }: { current: number; total: number }) => (
      <div
        style={{
          display: 'flex',
          gap: defined.spacing.xs,
          justifyContent: 'center',
          marginBottom: defined.spacing.lg,
        }}
      >
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              width: isMobile ? '20px' : '32px',
              height: '4px',
              borderRadius: defined.radius.full,
              background:
                i < current
                  ? defined.colors.primary
                  : i === current
                    ? defined.colors.accent
                    : defined.colors.background.tertiary,
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>
    ),
    [isMobile]
  );

  // =============================================================================
  // DIFFRACTION VISUALIZATION - PREMIUM QUALITY
  // =============================================================================
  const renderDiffractionVisualization = useCallback(() => {
    const width = isMobile ? 340 : 500;
    const height = isMobile ? 380 : 450;
    const laserColor = WAVELENGTHS[wavelength].color;

    // Derive lighter/darker variants for gradients
    const laserColorLight = wavelength === 'red' ? '#FF6B6B' : wavelength === 'green' ? '#4ADE80' : '#60A5FA';
    const laserColorDark = wavelength === 'red' ? '#B91C1C' : wavelength === 'green' ? '#15803D' : '#1D4ED8';

    // Positions
    const laserX = 30;
    const laserY = height * 0.4;
    const slitX = width * 0.35;
    const screenX = width - 40;

    // Pattern display height
    const patternHeight = height * 0.7;
    const patternTop = height * 0.15;

    // Distance measurement
    const slitToScreen = screenX - slitX;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: defined.spacing.md,
        }}
      >
        {/* Title moved outside SVG using typo system */}
        <div
          style={{
            fontSize: typo.body,
            fontWeight: defined.typography.weights.semibold,
            color: defined.colors.text.secondary,
            textAlign: 'center',
          }}
        >
          {slitMode === 'single' ? 'Single Slit' : 'Double Slit'} Diffraction
        </div>

        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
          <defs>
            {/* Premium laser glow filter */}
            <filter id="diffLaserGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur1" />
              <feGaussianBlur stdDeviation="3" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Wave glow filter */}
            <filter id="diffWaveGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Screen glow filter for interference pattern */}
            <filter id="diffScreenGlow" x="-100%" y="-20%" width="300%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Intensity bloom filter */}
            <filter id="diffIntensityBloom" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="bloom" />
              <feBlend in="SourceGraphic" in2="bloom" mode="screen" />
            </filter>

            {/* Metal gradient for slit barrier */}
            <linearGradient id="diffMetalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1F2937" />
              <stop offset="15%" stopColor="#374151" />
              <stop offset="30%" stopColor="#4B5563" />
              <stop offset="50%" stopColor="#6B7280" />
              <stop offset="70%" stopColor="#4B5563" />
              <stop offset="85%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1F2937" />
            </linearGradient>

            {/* Metal edge highlight */}
            <linearGradient id="diffMetalEdge" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9CA3AF" />
              <stop offset="50%" stopColor="#D1D5DB" />
              <stop offset="100%" stopColor="#9CA3AF" />
            </linearGradient>

            {/* Laser source gradient */}
            <linearGradient id="diffLaserBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4B5563" />
              <stop offset="50%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1F2937" />
            </linearGradient>

            {/* Laser beam gradient */}
            <linearGradient id="diffBeamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={laserColor} stopOpacity="1" />
              <stop offset="100%" stopColor={laserColorLight} stopOpacity="0.8" />
            </linearGradient>

            {/* Wave gradient for animated circles */}
            <radialGradient id="diffWaveRadial" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={laserColor} stopOpacity="0" />
              <stop offset="70%" stopColor={laserColor} stopOpacity="0.6" />
              <stop offset="100%" stopColor={laserColorLight} stopOpacity="0" />
            </radialGradient>

            {/* Screen base gradient */}
            <linearGradient id="diffScreenBase" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="50%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>

            {/* Diffraction pattern gradient with realistic intensity */}
            <linearGradient id="diffPatternGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              {pattern.map((intensity, i) => {
                // Enhanced intensity mapping for realistic look
                const enhancedIntensity = Math.pow(intensity, 0.7); // Gamma correction
                return (
                  <stop
                    key={i}
                    offset={`${(i / pattern.length) * 100}%`}
                    stopColor={intensity > 0.7 ? laserColorLight : laserColor}
                    stopOpacity={enhancedIntensity * 0.95 + 0.05}
                  />
                );
              })}
            </linearGradient>

            {/* Glow overlay for bright fringes */}
            <linearGradient id="diffGlowOverlay" x1="0%" y1="0%" x2="0%" y2="100%">
              {pattern.map((intensity, i) => (
                <stop
                  key={i}
                  offset={`${(i / pattern.length) * 100}%`}
                  stopColor="#FFFFFF"
                  stopOpacity={intensity > 0.8 ? 0.3 : 0}
                />
              ))}
            </linearGradient>

            {/* Background gradient */}
            <linearGradient id="diffBgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>

            {/* Intensity graph gradient */}
            <linearGradient id="diffGraphGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={laserColor} stopOpacity="0.8" />
              <stop offset="100%" stopColor={laserColorDark} stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Background with subtle gradient */}
          <rect width={width} height={height} fill="url(#diffBgGradient)" rx="12" />

          {/* Interactive point marker that moves with slider - positioned at ~70% of pattern to show sensitivity */}
          {(() => {
            const markerIdx = Math.floor(pattern.length * 0.7);
            const markerIntensity = pattern[markerIdx] || 0;
            const markerY = patternTop + patternHeight * 0.15 + (1 - markerIntensity) * patternHeight * 0.7;
            return (
              <circle
                cx={screenX - 3}
                cy={markerY}
                r={8}
                fill={laserColor}
                stroke="#ffffff"
                strokeWidth="2"
                filter="url(#diffLaserGlow)"
                opacity="0.9"
              />
            );
          })()}

          {/* Subtle grid pattern for depth */}
          <g opacity="0.05">
            {[...Array(Math.floor(width / 30))].map((_, i) => (
              <line key={`v${i}`} x1={i * 30} y1="0" x2={i * 30} y2={height} stroke="#64748B" strokeWidth="0.5" />
            ))}
            {[...Array(Math.floor(height / 30))].map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 30} x2={width} y2={i * 30} stroke="#64748B" strokeWidth="0.5" />
            ))}
          </g>

          {/* Laser source with premium styling */}
          <g>
            {/* Laser housing */}
            <rect x={laserX - 12} y={laserY - 18} width="36" height="36" fill="url(#diffLaserBody)" rx="6" />
            <rect x={laserX - 12} y={laserY - 18} width="36" height="2" fill="url(#diffMetalEdge)" rx="1" />

            {/* Laser aperture */}
            <circle cx={laserX + 20} cy={laserY} r="8" fill="#1F2937" />
            <circle cx={laserX + 20} cy={laserY} r="6" fill="#0F172A" />

            {/* Laser emission point with glow */}
            <circle cx={laserX + 20} cy={laserY} r="4" fill={laserColor} filter="url(#diffLaserGlow)" />
            <circle cx={laserX + 20} cy={laserY} r="2" fill={laserColorLight} />
          </g>

          {/* Laser beam to slit with gradient */}
          <line
            x1={laserX + 26}
            y1={laserY}
            x2={slitX - 5}
            y2={laserY}
            stroke="url(#diffBeamGradient)"
            strokeWidth="4"
            filter="url(#diffLaserGlow)"
          />
          {/* Core beam */}
          <line
            x1={laserX + 26}
            y1={laserY}
            x2={slitX - 5}
            y2={laserY}
            stroke={laserColorLight}
            strokeWidth="1.5"
            opacity="0.9"
          />

          {/* Slit barrier with metal gradient */}
          <rect
            x={slitX - 6}
            y={patternTop}
            width="12"
            height={patternHeight}
            fill="url(#diffMetalGradient)"
            stroke="#4B5563"
            strokeWidth="0.5"
          />
          {/* Top edge highlight */}
          <rect x={slitX - 6} y={patternTop} width="12" height="2" fill="url(#diffMetalEdge)" opacity="0.5" />

          {/* Slits with glow effect */}
          {slitMode === 'single' ? (
            // Single slit with edge glow
            <g>
              <rect
                x={slitX - 6}
                y={laserY - slitWidth / 4}
                width="12"
                height={slitWidth / 2}
                fill="#0F172A"
              />
              {/* Slit edge glow */}
              <line
                x1={slitX - 6}
                y1={laserY - slitWidth / 4}
                x2={slitX - 6}
                y2={laserY + slitWidth / 4}
                stroke={laserColor}
                strokeWidth="1"
                opacity="0.4"
              />
              <line
                x1={slitX + 6}
                y1={laserY - slitWidth / 4}
                x2={slitX + 6}
                y2={laserY + slitWidth / 4}
                stroke={laserColor}
                strokeWidth="1"
                opacity="0.4"
              />
              {/* Slit width measurement */}
              <g opacity="0.6">
                <line
                  x1={slitX}
                  y1={laserY - slitWidth / 4 - 8}
                  x2={slitX}
                  y2={laserY + slitWidth / 4 + 8}
                  stroke={defined.colors.accent}
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
              </g>
            </g>
          ) : (
            // Double slit with edge glow
            <g>
              <rect
                x={slitX - 6}
                y={laserY - slitSeparation / 4 - slitWidth / 8}
                width="12"
                height={slitWidth / 4}
                fill="#0F172A"
              />
              <rect
                x={slitX - 6}
                y={laserY + slitSeparation / 4 - slitWidth / 8}
                width="12"
                height={slitWidth / 4}
                fill="#0F172A"
              />
              {/* Slit edge glow for both slits */}
              {[-1, 1].map((dir) => (
                <g key={dir}>
                  <line
                    x1={slitX - 6}
                    y1={laserY + dir * slitSeparation / 4 - slitWidth / 8}
                    x2={slitX - 6}
                    y2={laserY + dir * slitSeparation / 4 + slitWidth / 8}
                    stroke={laserColor}
                    strokeWidth="1"
                    opacity="0.4"
                  />
                  <line
                    x1={slitX + 6}
                    y1={laserY + dir * slitSeparation / 4 - slitWidth / 8}
                    x2={slitX + 6}
                    y2={laserY + dir * slitSeparation / 4 + slitWidth / 8}
                    stroke={laserColor}
                    strokeWidth="1"
                    opacity="0.4"
                  />
                </g>
              ))}
              {/* Slit separation measurement */}
              <g opacity="0.6">
                <line
                  x1={slitX + 15}
                  y1={laserY - slitSeparation / 4}
                  x2={slitX + 15}
                  y2={laserY + slitSeparation / 4}
                  stroke={defined.colors.accent}
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <line
                  x1={slitX + 12}
                  y1={laserY - slitSeparation / 4}
                  x2={slitX + 18}
                  y2={laserY - slitSeparation / 4}
                  stroke={defined.colors.accent}
                  strokeWidth="1"
                />
                <line
                  x1={slitX + 12}
                  y1={laserY + slitSeparation / 4}
                  x2={slitX + 18}
                  y2={laserY + slitSeparation / 4}
                  stroke={defined.colors.accent}
                  strokeWidth="1"
                />
              </g>
            </g>
          )}

          {/* Wave visualization with gradient and glow */}
          {showWaves && (
            <g>
              {/* Clip path for waves */}
              <clipPath id="diffWaveClip">
                <rect x={slitX + 6} y={patternTop} width={screenX - slitX - 20} height={patternHeight} />
              </clipPath>

              {slitMode === 'single' ? (
                // Single source waves with gradient
                <g clipPath="url(#diffWaveClip)">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                    const radius = 25 + i * 22 + (animationPhase % 22);
                    const opacity = Math.max(0, 0.5 - i * 0.07);
                    return (
                      <circle
                        key={i}
                        cx={slitX}
                        cy={laserY}
                        r={radius}
                        fill="none"
                        stroke={laserColor}
                        strokeWidth="2"
                        opacity={opacity}
                        filter="url(#diffWaveGlow)"
                      />
                    );
                  })}
                </g>
              ) : (
                // Two source waves with interference visualization
                <g clipPath="url(#diffWaveClip)">
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    const radius = 22 + i * 20 + (animationPhase % 20);
                    const opacity = Math.max(0, 0.45 - i * 0.07);
                    return (
                      <g key={i}>
                        <circle
                          cx={slitX}
                          cy={laserY - slitSeparation / 4}
                          r={radius}
                          fill="none"
                          stroke={laserColor}
                          strokeWidth="1.5"
                          opacity={opacity}
                          filter="url(#diffWaveGlow)"
                        />
                        <circle
                          cx={slitX}
                          cy={laserY + slitSeparation / 4}
                          r={radius}
                          fill="none"
                          stroke={laserColor}
                          strokeWidth="1.5"
                          opacity={opacity}
                          filter="url(#diffWaveGlow)"
                        />
                      </g>
                    );
                  })}
                </g>
              )}
            </g>
          )}

          {/* Diffracted light rays with intensity-based opacity */}
          <g opacity="0.4">
            {[...Array(15)].map((_, i) => {
              const angle = ((i - 7) / 7) * 0.3;
              const endY = laserY + Math.tan(angle) * (screenX - slitX - 15);
              const patternIndex = Math.floor((i / 15) * pattern.length + pattern.length * 0.35);
              const intensity = pattern[Math.min(patternIndex, pattern.length - 1)] || 0;

              if (intensity < 0.1) return null;

              return (
                <line
                  key={i}
                  x1={slitX + 6}
                  y1={laserY}
                  x2={screenX - 12}
                  y2={endY}
                  stroke={laserColor}
                  strokeWidth={intensity * 2}
                  opacity={intensity * 0.5}
                  filter={intensity > 0.7 ? "url(#diffWaveGlow)" : undefined}
                />
              );
            })}
          </g>

          {/* Screen with premium styling */}
          <g>
            {/* Screen base */}
            <rect
              x={screenX - 12}
              y={patternTop}
              width="18"
              height={patternHeight}
              fill="url(#diffScreenBase)"
              stroke="#374151"
              strokeWidth="0.5"
              rx="2"
            />

            {/* Diffraction pattern with realistic intensity */}
            <rect
              x={screenX - 10}
              y={patternTop + 2}
              width="14"
              height={patternHeight - 4}
              fill="url(#diffPatternGradient)"
              rx="1"
              filter="url(#diffScreenGlow)"
            />

            {/* Glow overlay for bright spots */}
            <rect
              x={screenX - 10}
              y={patternTop + 2}
              width="14"
              height={patternHeight - 4}
              fill="url(#diffGlowOverlay)"
              rx="1"
              filter="url(#diffIntensityBloom)"
            />

            {/* Screen frame highlight */}
            <rect
              x={screenX - 12}
              y={patternTop}
              width="18"
              height="2"
              fill="url(#diffMetalEdge)"
              opacity="0.3"
              rx="1"
            />
          </g>

          {/* Distance measurement line */}
          <g opacity="0.5">
            <line
              x1={slitX}
              y1={patternTop + patternHeight + 15}
              x2={screenX - 3}
              y2={patternTop + patternHeight + 15}
              stroke={defined.colors.text.muted}
              strokeWidth="1"
              strokeDasharray="4,2"
            />
            <line
              x1={slitX}
              y1={patternTop + patternHeight + 10}
              x2={slitX}
              y2={patternTop + patternHeight + 20}
              stroke={defined.colors.text.muted}
              strokeWidth="1"
            />
            <line
              x1={screenX - 3}
              y1={patternTop + patternHeight + 10}
              x2={screenX - 3}
              y2={patternTop + patternHeight + 20}
              stroke={defined.colors.text.muted}
              strokeWidth="1"
            />
          </g>

          {/* Fringe order indicators for double slit */}
          {slitMode === 'double' && (
            <g>
              {/* Central maximum indicator */}
              <circle cx={screenX + 8} cy={laserY} r="3" fill={defined.colors.primary} opacity="0.8" />
              {/* First order maxima indicators */}
              <circle cx={screenX + 8} cy={laserY - 35} r="2" fill={defined.colors.accent} opacity="0.6" />
              <circle cx={screenX + 8} cy={laserY + 35} r="2" fill={defined.colors.accent} opacity="0.6" />
            </g>
          )}

          {/* Labels inside SVG */}
          <text x={laserX + 8} y={patternTop + 15} fill="#64748B" fontSize="11" fontFamily="sans-serif" textAnchor="middle">Laser</text>
          <text x={slitX} y={patternTop + 30} fill="#64748B" fontSize="11" fontFamily="sans-serif" textAnchor="middle">Slit</text>
          <text x={screenX} y={patternTop + 15} fill="#64748B" fontSize="11" fontFamily="sans-serif" textAnchor="middle">Screen</text>
          <text x={(slitX + screenX) / 2} y={patternTop + patternHeight + 28} fill="#64748B" fontSize="11" fontFamily="sans-serif" textAnchor="middle">Intensity Pattern</text>
        </svg>

        {/* Labels moved outside SVG using typo system */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: width,
            padding: `0 ${defined.spacing.sm}`,
          }}
        >
          <div style={{ fontSize: typo.label, color: defined.colors.text.muted, textAlign: 'center', width: '60px' }}>
            Laser
          </div>
          <div style={{ fontSize: typo.label, color: defined.colors.text.muted, textAlign: 'center', flex: 1 }}>
            {slitMode === 'single' ? `Slit (${slitWidth} \u03BCm)` : `Slits (d = ${slitSeparation} \u03BCm)`}
          </div>
          <div style={{ fontSize: typo.label, color: defined.colors.text.muted, textAlign: 'center', width: '60px' }}>
            Screen
          </div>
        </div>

        {/* Fringe order labels for double slit - outside SVG */}
        {slitMode === 'double' && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              width: '100%',
              maxWidth: width,
              gap: defined.spacing.md,
              fontSize: typo.label,
            }}
          >
            <span style={{ color: defined.colors.primary }}>m=0 (central)</span>
            <span style={{ color: defined.colors.accent }}>m=\u00B11 (first order)</span>
          </div>
        )}

        {/* Pattern graph with premium styling */}
        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.md,
            width: '100%',
            maxWidth: width,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div
            style={{
              fontSize: typo.small,
              color: defined.colors.text.muted,
              marginBottom: defined.spacing.sm,
              textAlign: 'center',
              fontWeight: defined.typography.weights.medium,
            }}
          >
            Intensity Distribution I(\u03B8)
          </div>
          <svg width="100%" height="70" viewBox="0 0 200 70" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="diffGraphFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={laserColor} stopOpacity="0.6" />
                <stop offset="100%" stopColor={laserColor} stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <g opacity="0.15">
              <line x1="0" y1="35" x2="200" y2="35" stroke="#64748B" strokeWidth="0.5" strokeDasharray="2,4" />
              <line x1="100" y1="5" x2="100" y2="65" stroke="#64748B" strokeWidth="0.5" strokeDasharray="2,4" />
            </g>

            {/* Filled area under curve */}
            <path
              d={`M 0 65 L 0 ${65 - pattern[0] * 55} ${pattern
                .map((p, i) => `L ${(i / pattern.length) * 200} ${65 - p * 55}`)
                .join(' ')} L 200 65 Z`}
              fill="url(#diffGraphFill)"
            />

            {/* Main curve with glow */}
            <path
              d={`M 0 ${65 - pattern[0] * 55} ${pattern
                .map((p, i) => `L ${(i / pattern.length) * 200} ${65 - p * 55}`)
                .join(' ')}`}
              fill="none"
              stroke={laserColor}
              strokeWidth="2.5"
              filter="url(#diffWaveGlow)"
            />

            {/* Bright line on top */}
            <path
              d={`M 0 ${65 - pattern[0] * 55} ${pattern
                .map((p, i) => `L ${(i / pattern.length) * 200} ${65 - p * 55}`)
                .join(' ')}`}
              fill="none"
              stroke={laserColorLight}
              strokeWidth="1"
              opacity="0.7"
            />
          </svg>

          {/* Axis labels */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: typo.label,
              color: defined.colors.text.muted,
              marginTop: '4px',
            }}
          >
            <span>-\u03B8</span>
            <span style={{ color: defined.colors.text.secondary }}>Position on Screen</span>
            <span>+\u03B8</span>
          </div>
        </div>
      </div>
    );
  }, [isMobile, wavelength, slitWidth, slitSeparation, slitMode, showWaves, pattern, animationPhase, typo]);

  // =============================================================================
  // CONTROLS PANEL
  // =============================================================================
  const renderControls = useCallback(
    () => (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: defined.spacing.md,
          background: defined.colors.background.card,
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          width: isMobile ? '100%' : '260px',
        }}
      >
        {/* Slit Mode Toggle */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: defined.typography.sizes.sm,
              color: defined.colors.text.secondary,
              marginBottom: defined.spacing.sm,
            }}
          >
            Slit Type
          </label>
          <div style={{ display: 'flex', gap: defined.spacing.xs }}>
            {(['single', 'double'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSlitMode(mode)}
                style={{
                  flex: 1,
                  padding: defined.spacing.md,
                  minHeight: '48px',
                  borderRadius: defined.radius.md,
                  border:
                    slitMode === mode
                      ? `2px solid ${defined.colors.primary}`
                      : '2px solid transparent',
                  background:
                    slitMode === mode
                      ? defined.colors.background.tertiary
                      : defined.colors.background.secondary,
                  color: defined.colors.text.primary,
                  cursor: 'pointer',
                  fontFamily: defined.typography.fontFamily,
                  fontSize: defined.typography.sizes.sm,
                  textTransform: 'capitalize',
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Slit Width */}
        <div>
          <label
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: defined.typography.sizes.sm,
              color: defined.colors.text.secondary,
              marginBottom: defined.spacing.sm,
            }}
          >
            <span>Slit Width</span>
            <span style={{ color: defined.colors.text.primary }}>{slitWidth} μm</span>
          </label>
          <input
            type="range"
            min="10"
            max="100"
            value={slitWidth}
            onChange={(e) => setSlitWidth(Number(e.target.value))}
            style={{
              width: '100%',
              height: '20px',
              accentColor: '#3b82f6',
              touchAction: 'pan-y',
              WebkitAppearance: 'none',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: defined.typography.sizes.xs,
              color: defined.colors.text.muted,
            }}
          >
            <span>Narrow</span>
            <span>Wide</span>
          </div>
        </div>

        {/* Slit Separation (double slit only) */}
        {slitMode === 'double' && (
          <div>
            <label
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: defined.typography.sizes.sm,
                color: defined.colors.text.secondary,
                marginBottom: defined.spacing.sm,
              }}
            >
              <span>Slit Separation</span>
              <span style={{ color: defined.colors.text.primary }}>{slitSeparation} μm</span>
            </label>
            <input
              type="range"
              min="50"
              max="200"
              value={slitSeparation}
              onChange={(e) => setSlitSeparation(Number(e.target.value))}
              style={{
                width: '100%',
                height: '20px',
                accentColor: '#3b82f6',
                touchAction: 'pan-y',
                WebkitAppearance: 'none',
              }}
            />
          </div>
        )}

        {/* Wavelength Selector */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: defined.typography.sizes.sm,
              color: defined.colors.text.secondary,
              marginBottom: defined.spacing.sm,
            }}
          >
            Laser Wavelength
          </label>
          <div style={{ display: 'flex', gap: defined.spacing.xs }}>
            {Object.entries(WAVELENGTHS).map(([key, data]) => (
              <button
                key={key}
                onClick={() => setWavelength(key as typeof wavelength)}
                style={{
                  flex: 1,
                  padding: defined.spacing.sm,
                  minHeight: '48px',
                  borderRadius: defined.radius.md,
                  border:
                    wavelength === key
                      ? `2px solid ${data.color}`
                      : '2px solid transparent',
                  background:
                    wavelength === key
                      ? `${data.color}30`
                      : defined.colors.background.secondary,
                  color: data.color,
                  cursor: 'pointer',
                  fontFamily: defined.typography.fontFamily,
                  fontSize: defined.typography.sizes.xs,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: data.color,
                  }}
                />
                {data.wavelength}nm
              </button>
            ))}
          </div>
        </div>

        {/* Show Waves Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: defined.typography.sizes.sm,
              color: defined.colors.text.secondary,
            }}
          >
            Show Waves
          </span>
          <button
            onClick={() => setShowWaves(!showWaves)}
            aria-label={showWaves ? 'Hide waves' : 'Show waves'}
            style={{
              width: '52px',
              minHeight: '48px',
              padding: '10px 2px',
              borderRadius: defined.radius.full,
              border: 'none',
              cursor: 'pointer',
              background: showWaves ? defined.colors.primary : defined.colors.background.tertiary,
              position: 'relative',
              transition: 'background 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: showWaves ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'white',
                transition: 'all 0.3s ease',
                margin: '0 2px',
              }}
            />
          </button>
        </div>

        {/* Key insight */}
        <div
          style={{
            background: `${WAVELENGTHS[wavelength].color}15`,
            borderRadius: defined.radius.md,
            padding: defined.spacing.md,
            border: `1px solid ${WAVELENGTHS[wavelength].color}30`,
          }}
        >
          <div
            style={{
              fontSize: defined.typography.sizes.sm,
              color: WAVELENGTHS[wavelength].color,
              fontWeight: defined.typography.weights.semibold,
              marginBottom: defined.spacing.xs,
            }}
          >
            {slitMode === 'single' ? '📊 Single Slit' : '📊 Double Slit'}
          </div>
          <div
            style={{
              fontSize: defined.typography.sizes.xs,
              color: defined.colors.text.secondary,
            }}
          >
            {slitMode === 'single'
              ? 'Narrower slit → wider central maximum'
              : 'More fringes from wave interference between two sources'}
          </div>
        </div>
      </div>
    ),
    [isMobile, slitMode, slitWidth, slitSeparation, wavelength, showWaves]
  );

  // =============================================================================
  // TEST QUESTIONS - SCENARIO-BASED MULTIPLE CHOICE
  // =============================================================================
  const testQuestions = [
    {
      scenario: "You're at a beach watching ocean waves approach a small gap in a rock formation. Despite the narrow opening, the waves spread out widely on the other side.",
      question: "Why do waves spread out after passing through a narrow opening?",
      options: [
        { id: 'a', label: 'The rocks push the waves outward' },
        { id: 'b', label: 'Waves naturally bend around obstacles and spread through openings comparable to their wavelength', correct: true },
        { id: 'c', label: 'The water pressure is higher on the other side' },
        { id: 'd', label: 'Waves always travel in straight lines' }
      ],
      explanation: "Diffraction occurs when waves encounter obstacles or openings comparable to their wavelength. The wave bends around edges and spreads out because each point on the wavefront acts as a source of new wavelets (Huygens' principle). This is why sound can be heard around corners and why ocean waves spread after passing through gaps."
    },
    {
      scenario: "When you tilt a CD or DVD under white light, you see vibrant rainbow patterns shifting across the surface as you change the viewing angle.",
      question: "What causes the rainbow colors on a CD/DVD surface?",
      options: [
        { id: 'a', label: 'The plastic is painted with rainbow colors' },
        { id: 'b', label: 'Light reflects off different colored layers' },
        { id: 'c', label: 'The microscopic track grooves act as a diffraction grating, separating wavelengths', correct: true },
        { id: 'd', label: 'Static electricity attracts different colors' }
      ],
      explanation: "CD/DVD surfaces have microscopic spiral tracks spaced about 1.6 micrometers apart (similar to visible light wavelengths). These act as a reflection diffraction grating. Different wavelengths diffract at different angles according to the grating equation, separating white light into its component colors - just like a prism but using interference instead of refraction."
    },
    {
      scenario: "A physicist shines a laser through a single narrow slit and observes a pattern on a distant screen: a bright central band flanked by progressively dimmer bands separated by dark regions.",
      question: "What determines the width of the central bright band in single-slit diffraction?",
      options: [
        { id: 'a', label: 'Only the laser brightness matters' },
        { id: 'b', label: 'The central band gets wider when the slit is made narrower', correct: true },
        { id: 'c', label: 'The central band gets narrower when the slit is made narrower' },
        { id: 'd', label: 'Slit width has no effect on the pattern' }
      ],
      explanation: "Counter-intuitively, a narrower slit produces a wider diffraction pattern. The angular width of the central maximum is inversely proportional to slit width (θ ≈ λ/a). When the slit approaches the wavelength of light, diffraction becomes extreme and light spreads nearly hemispherically. This inverse relationship is a fundamental property of wave diffraction."
    },
    {
      scenario: "A microbiologist is frustrated that their optical microscope cannot resolve two bacteria that are only 100 nanometers apart, even with perfect lenses.",
      question: "What fundamentally limits how small an optical microscope can see?",
      options: [
        { id: 'a', label: 'The quality of the glass lenses' },
        { id: 'b', label: 'Diffraction limits resolution to roughly half the wavelength of light used', correct: true },
        { id: 'c', label: 'Bacteria are too transparent' },
        { id: 'd', label: 'The eyepiece magnification is insufficient' }
      ],
      explanation: "The diffraction limit (Abbe limit) states that optical instruments cannot resolve details smaller than roughly λ/(2NA), where NA is numerical aperture. For visible light (~500 nm), this limits resolution to about 200-250 nm. This is why electron microscopes (with much smaller wavelengths) are needed to image individual molecules and atoms. The limit exists because light waves spread when passing through the finite aperture of any lens."
    },
    {
      scenario: "A radio engineer notices that AM radio (wavelength ~300 meters) can be received in valleys and behind hills, while FM radio (wavelength ~3 meters) often loses signal in the same locations.",
      question: "Why do longer wavelength radio waves travel better around obstacles?",
      options: [
        { id: 'a', label: 'Longer waves carry more energy' },
        { id: 'b', label: 'Longer wavelengths diffract more around obstacles comparable to or smaller than their wavelength', correct: true },
        { id: 'c', label: 'FM radio is absorbed by trees' },
        { id: 'd', label: 'AM transmitters are more powerful' }
      ],
      explanation: "Diffraction is most pronounced when the obstacle size is comparable to or smaller than the wavelength. AM radio waves (~300m) easily diffract around buildings and hills (much smaller than the wavelength), while FM waves (~3m) experience less diffraction around the same obstacles. This is why AM radio provides better coverage in mountainous terrain and urban canyons, though at the cost of lower audio fidelity."
    },
    {
      scenario: "Rosalind Franklin directed X-rays at crystallized DNA and captured a distinctive X-shaped diffraction pattern on photographic film, which was crucial evidence for the double helix structure.",
      question: "Why are X-rays used instead of visible light to determine molecular structures?",
      options: [
        { id: 'a', label: 'X-rays are brighter than visible light' },
        { id: 'b', label: 'X-ray wavelengths (~0.1 nm) match atomic spacing, enabling diffraction from crystal lattices', correct: true },
        { id: 'c', label: 'Visible light damages molecular samples' },
        { id: 'd', label: 'X-rays travel faster through crystals' }
      ],
      explanation: "X-ray crystallography works because X-ray wavelengths (0.01-10 nm) are comparable to interatomic distances in crystals (~0.1-0.3 nm). The regular atomic arrangement acts as a three-dimensional diffraction grating, producing characteristic patterns that can be mathematically inverted to reveal atomic positions. Visible light wavelengths (400-700 nm) are thousands of times larger than atomic spacing, making them useless for resolving molecular structure."
    },
    {
      scenario: "A photographer notices that stopping down their lens to f/22 (very small aperture) to maximize depth of field actually makes their images slightly softer than at f/8.",
      question: "Why does using a very small camera aperture reduce image sharpness?",
      options: [
        { id: 'a', label: 'Small apertures let in less light' },
        { id: 'b', label: 'Diffraction at small apertures spreads light, blurring fine details', correct: true },
        { id: 'c', label: 'The lens glass is lower quality at the edges' },
        { id: 'd', label: 'Sensor pixels are too large' }
      ],
      explanation: "As aperture decreases, diffraction effects increase. Light passing through a small opening spreads into an Airy disk pattern rather than focusing to a perfect point. When the Airy disk becomes larger than a pixel, resolution is lost. This creates a tradeoff: larger apertures have shallower depth of field but less diffraction, while smaller apertures have greater depth of field but more diffraction softening. The 'diffraction limit' for a camera depends on pixel size and wavelength."
    },
    {
      scenario: "Security holograms on credit cards display three-dimensional images that shift as you tilt the card. These are created by splitting a laser beam and recording the interference pattern on film.",
      question: "How does a hologram store and reconstruct a 3D image?",
      options: [
        { id: 'a', label: 'Tiny lenses molded into the surface' },
        { id: 'b', label: 'The recorded interference pattern diffracts light to recreate the original wavefront', correct: true },
        { id: 'c', label: 'Layers of different colored inks' },
        { id: 'd', label: 'Magnetic particles aligned by the original image' }
      ],
      explanation: "Holograms record the interference pattern between light reflected from an object (object beam) and a reference beam. This pattern encodes both amplitude and phase information. When illuminated, the hologram diffracts light according to this pattern, reconstructing the original wavefront. Your eyes perceive this as a 3D image because the reconstructed wavefront contains the same directional information as the original light from the 3D scene."
    },
    {
      scenario: "Materials scientists fire electrons at a thin gold foil and observe a pattern of concentric rings on a detector behind it, similar to X-ray diffraction patterns from crystals.",
      question: "What does electron diffraction reveal about the nature of electrons?",
      options: [
        { id: 'a', label: 'Electrons are deflected by magnetic fields in the gold' },
        { id: 'b', label: 'Electrons have wave-like properties with wavelengths determined by their momentum', correct: true },
        { id: 'c', label: 'Electrons bounce off gold atoms randomly' },
        { id: 'd', label: 'Gold atoms emit new electrons' }
      ],
      explanation: "Electron diffraction demonstrates wave-particle duality. De Broglie proposed λ = h/p (wavelength = Planck's constant / momentum). For electrons accelerated through ~100V, wavelengths are ~0.1 nm - perfect for diffracting from atomic lattices. The ring patterns prove electrons interfere like waves, with crystal spacing determinable from the pattern. This confirmed quantum mechanics predictions and earned the 1937 Nobel Prize for Davisson and Germer."
    },
    {
      scenario: "Astronomers use multiple telescopes spread across continents, combining their signals to achieve the resolution of a single telescope thousands of kilometers wide. This technique recently produced the first image of a black hole.",
      question: "How does combining distant telescopes overcome the diffraction limit of a single telescope?",
      options: [
        { id: 'a', label: 'Each telescope captures a different color' },
        { id: 'b', label: 'The effective aperture becomes the distance between telescopes, dramatically improving angular resolution', correct: true },
        { id: 'c', label: 'More telescopes collect more light' },
        { id: 'd', label: 'Computer processing sharpens blurry images' }
      ],
      explanation: "Interferometry exploits the fact that angular resolution scales as λ/D, where D is aperture diameter. By correlating signals from telescopes separated by thousands of kilometers, astronomers create a 'synthetic aperture' with resolution matching a planet-sized telescope. The Event Horizon Telescope combined dishes worldwide to achieve micro-arcsecond resolution, sufficient to resolve the event horizon of the M87 black hole 55 million light-years away."
    }
  ];

  // =============================================================================
  // PHASE RENDERERS
  // =============================================================================

  // HOOK PHASE
  const renderHook = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '600px', padding: '48px 24px', textAlign: 'center',
      fontFamily: defined.typography.fontFamily, fontWeight: 400,
    }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        padding: '8px 16px', background: 'rgba(99,102,241,0.1)',
        border: '1px solid rgba(99,102,241,0.2)', borderRadius: '9999px', marginBottom: '32px',
      }}>
        <span style={{ width: '8px', height: '8px', background: '#818CF8', borderRadius: '50%' }} />
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#818CF8', letterSpacing: '0.05em' }}>PHYSICS EXPLORATION</span>
      </div>

      <h1 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '16px', color: defined.colors.text.primary, lineHeight: 1.2 }}>
        Light Diffraction
      </h1>

      <p style={{ fontSize: '18px', color: 'rgba(148,163,184,0.7)', maxWidth: '480px', marginBottom: '40px', lineHeight: 1.6 }}>
        Discover how light bends around corners and proves its wave nature
      </p>

      <div style={{
        background: 'rgba(30,41,59,0.8)', borderRadius: '24px', padding: '32px',
        maxWidth: '560px', width: '100%', border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
      }}>
        <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.9)', fontWeight: 500, lineHeight: 1.6, marginBottom: '16px' }}>
          Shine a laser through a tiny slit.
        </p>
        <p style={{ fontSize: '18px', color: 'rgba(148,163,184,0.7)', lineHeight: 1.6, marginBottom: '16px' }}>
          Instead of a sharp line, you see bands of light spreading outward!
        </p>
        <p style={{ fontSize: '16px', color: '#818CF8', fontWeight: 600 }}>
          This &quot;diffraction&quot; pattern proves light is a wave!
        </p>
      </div>

      <button
        onClick={() => { playSound('transition'); handleNavigation('predict'); }}
        style={{
          marginTop: '40px', padding: '16px 40px', borderRadius: '16px', border: 'none',
          background: 'linear-gradient(135deg, #6366F1, #7C3AED)', color: '#fff',
          fontSize: '18px', fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.2s ease', fontFamily: defined.typography.fontFamily,
        }}
      >
        Explore Diffraction
      </button>
    </div>
  );

  // PREDICT PHASE
  const renderPredict = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: defined.spacing.xl,
        padding: defined.spacing.xl,
      }}
    >
      <h2
        style={{
          fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.text.primary,
          textAlign: 'center',
          margin: 0,
        }}
      >
        Make Your Prediction
      </h2>

      <svg viewBox="0 0 400 200" style={{ width: '100%', height: 'auto' }}>
        <defs>
          <linearGradient id="predLaser" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="400" height="200" fill="#0F172A" rx="8" />
        <text x="30" y="30" fill="#94A3B8" fontSize="12" fontFamily="sans-serif">Laser Source</text>
        <circle cx="40" cy="100" r="15" fill="#EF4444" opacity="0.6" />
        <circle cx="40" cy="100" r="8" fill="#EF4444" />
        <line x1="55" y1="100" x2="180" y2="100" stroke="#EF4444" strokeWidth="3" opacity="0.8" />
        <rect x="180" y="60" width="6" height="80" fill="#334155" />
        <rect x="180" y="92" width="6" height="16" fill="#0F172A" />
        <text x="175" y="55" fill="#94A3B8" fontSize="11" fontFamily="sans-serif" textAnchor="middle">Slit</text>
        <line x1="186" y1="100" x2="350" y2="60" stroke="url(#predLaser)" strokeWidth="2" opacity="0.5" />
        <line x1="186" y1="100" x2="350" y2="80" stroke="url(#predLaser)" strokeWidth="2" opacity="0.7" />
        <line x1="186" y1="100" x2="350" y2="100" stroke="url(#predLaser)" strokeWidth="3" opacity="0.9" />
        <line x1="186" y1="100" x2="350" y2="120" stroke="url(#predLaser)" strokeWidth="2" opacity="0.7" />
        <line x1="186" y1="100" x2="350" y2="140" stroke="url(#predLaser)" strokeWidth="2" opacity="0.5" />
        <rect x="350" y="40" width="4" height="120" fill="#334155" rx="2" />
        <rect x="351" y="90" width="2" height="20" fill="#EF4444" opacity="0.9" />
        <rect x="351" y="70" width="2" height="15" fill="#EF4444" opacity="0.4" />
        <rect x="351" y="115" width="2" height="15" fill="#EF4444" opacity="0.4" />
        <rect x="351" y="55" width="2" height="10" fill="#EF4444" opacity="0.2" />
        <rect x="351" y="135" width="2" height="10" fill="#EF4444" opacity="0.2" />
        <text x="355" y="50" fill="#94A3B8" fontSize="11" fontFamily="sans-serif">Screen</text>
        <text x="200" y="190" fill="#64748B" fontSize="11" fontFamily="sans-serif" textAnchor="middle">What happens to the pattern?</text>
      </svg>

      <p
        style={{
          fontSize: defined.typography.sizes.base,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        Think about what you expect will happen: If you make the slit NARROWER, what happens to the diffraction pattern on the screen?
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: defined.spacing.md,
          width: '100%',
          maxWidth: '500px',
        }}
      >
        {[
          { id: 'wider', text: 'Pattern gets WIDER (more spreading)' },
          { id: 'narrower', text: 'Pattern gets NARROWER (less spreading)' },
          { id: 'same', text: 'Pattern stays the same size' },
          { id: 'disappears', text: 'Pattern disappears completely' },
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => setPrediction(option.id)}
            style={{
              padding: defined.spacing.lg,
              borderRadius: defined.radius.lg,
              border:
                prediction === option.id
                  ? `2px solid ${defined.colors.primary}`
                  : '2px solid rgba(255,255,255,0.1)',
              background:
                prediction === option.id
                  ? 'rgba(99, 102, 241, 0.2)'
                  : defined.colors.background.secondary,
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.base,
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: defined.typography.fontFamily,
              transition: 'all 0.2s ease',
            }}
          >
            {option.text}
          </button>
        ))}
      </div>

      {Button({
        children: 'Test My Prediction →',
        onClick: () => handleNavigation('play'),
        disabled: !prediction,
        size: 'lg',
      })}
    </div>
  );

  // PLAY PHASE
  const renderPlay = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: defined.spacing.lg,
        padding: defined.spacing.lg,
      }}
    >
      <h2
        style={{
          fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.text.primary,
          margin: 0,
        }}
      >
        Explore Single Slit Diffraction
      </h2>

      <p
        style={{
          fontSize: defined.typography.sizes.sm,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        Adjust the slit width and light frequency to observe how diffraction affects wave behavior.
        Watch how the pattern changes when you increase or decrease the aperture size!
      </p>

      {/* Educational insight panel */}
      <div
        style={{
          background: 'rgba(99, 102, 241, 0.1)',
          borderRadius: defined.radius.lg,
          padding: defined.spacing.md,
          maxWidth: '600px',
          border: '1px solid rgba(99, 102, 241, 0.3)',
        }}
      >
        <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm, margin: 0 }}>
          <strong style={{ color: defined.colors.primary }}>Key Principle:</strong> Diffraction is defined as the bending and spreading of waves around obstacles.
          When you decrease the slit width, more diffraction causes the central maximum to become wider.
          This relationship between aperture size and wave spreading is important for engineering applications
          like designing antennas, optical systems, and even understanding why sound travels around corners.
          The formula for the first minimum is calculated as sin(theta) = wavelength/slit_width.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: defined.spacing.xl,
          alignItems: 'flex-start',
          width: '100%',
          maxWidth: '850px',
        }}
      >
        {renderDiffractionVisualization()}
        {renderControls()}
      </div>

      {Button({
        children: 'I See the Pattern → Review',
        onClick: () => handleNavigation('review'),
        size: 'lg',
      })}
    </div>
  );

  // REVIEW PHASE
  const renderReview = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: defined.spacing.xl,
        padding: defined.spacing.xl,
      }}
    >
      <h2
        style={{
          fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.text.primary,
          margin: 0,
        }}
      >
        The Wave Nature of Light
      </h2>

      <div
        style={{
          background:
            prediction === 'wider' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          maxWidth: '500px',
          textAlign: 'center',
          border: `1px solid ${prediction === 'wider' ? defined.colors.success : defined.colors.error}`,
        }}
      >
        <div
          style={{
            fontSize: defined.typography.sizes.lg,
            fontWeight: defined.typography.weights.semibold,
            color: prediction === 'wider' ? defined.colors.success : defined.colors.error,
            marginBottom: defined.spacing.sm,
          }}
        >
          {prediction === 'wider' ? '✓ Correct!' : '✗ Counterintuitive!'}
        </div>
        <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
          As you observed in the experiment, narrower slits produce WIDER patterns! Your prediction about what would happen was {prediction === 'wider' ? 'spot on' : 'a common misconception'}.
          What you saw demonstrates a key principle of wave physics: waves diffract more when passing through smaller apertures.
          Therefore, the spreading pattern you noticed is a signature of wave behavior, which is why diffraction proves light behaves as a wave rather than a particle.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: defined.spacing.lg,
          maxWidth: '700px',
        }}
      >
        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.lg,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>〰️</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Huygens' Principle
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Every point on a wavefront acts as a source of secondary wavelets. At a narrow slit,
            these wavelets spread widely.
          </p>
        </div>

        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.lg,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>⚡</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Interference
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Waves from different parts of the slit interfere. In phase = bright bands. Out of phase
            = dark bands.
          </p>
        </div>

        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.lg,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>📐</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Single Slit Formula
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Minima occur at: a·sin(θ) = mλ
            <br />
            Where a = slit width, m = 1, 2, 3...
          </p>
        </div>

        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.lg,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>🔴</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.lg,
              marginBottom: defined.spacing.sm,
            }}
          >
            Wavelength Effect
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Longer wavelength (red) → wider pattern. Blue light creates narrower fringes than red
            light.
          </p>
        </div>
      </div>

      {Button({
        children: 'Try Double Slit →',
        onClick: () => handleNavigation('twist_predict'),
        size: 'lg',
      })}
    </div>
  );

  // TWIST PREDICT PHASE
  const renderTwistPredict = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: defined.spacing.xl,
        padding: defined.spacing.xl,
      }}
    >
      <div
        style={{
          background: 'rgba(245, 158, 11, 0.2)',
          borderRadius: defined.radius.full,
          padding: `${defined.spacing.sm} ${defined.spacing.lg}`,
          border: '1px solid rgba(245, 158, 11, 0.3)',
        }}
      >
        <span style={{ color: defined.colors.accent, fontWeight: defined.typography.weights.semibold }}>
          🔄 TWIST CHALLENGE
        </span>
      </div>

      <h2
        style={{
          fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.text.primary,
          textAlign: 'center',
          margin: 0,
        }}
      >
        New Variable: Young's Double-Slit Experiment
      </h2>

      <svg viewBox="0 0 400 200" style={{ width: '100%', height: 'auto' }}>
        <rect x="0" y="0" width="400" height="200" fill="#0F172A" rx="8" />
        <text x="30" y="25" fill="#F59E0B" fontSize="12" fontFamily="sans-serif">Double Slit Setup</text>
        <circle cx="40" cy="100" r="12" fill="#EF4444" opacity="0.6" />
        <circle cx="40" cy="100" r="6" fill="#EF4444" />
        <line x1="52" y1="100" x2="175" y2="85" stroke="#EF4444" strokeWidth="2" opacity="0.6" />
        <line x1="52" y1="100" x2="175" y2="115" stroke="#EF4444" strokeWidth="2" opacity="0.6" />
        <rect x="175" y="50" width="6" height="80" fill="#334155" />
        <rect x="175" y="78" width="6" height="10" fill="#0F172A" />
        <rect x="175" y="108" width="6" height="10" fill="#0F172A" />
        <text x="178" y="45" fill="#94A3B8" fontSize="11" fontFamily="sans-serif" textAnchor="middle">Two Slits</text>
        {[60,75,85,95,100,105,115,125,140].map((y, i) => (
          <line key={i} x1="181" y1="83" x2="350" y2={y} stroke="#EF4444" strokeWidth="1" opacity={0.3 + 0.4 * Math.exp(-Math.pow((y-100)/20, 2))} />
        ))}
        {[60,75,85,95,100,105,115,125,140].map((y, i) => (
          <line key={`b${i}`} x1="181" y1="113" x2="350" y2={y} stroke="#EF4444" strokeWidth="1" opacity={0.3 + 0.4 * Math.exp(-Math.pow((y-100)/20, 2))} />
        ))}
        <rect x="350" y="40" width="4" height="120" fill="#334155" rx="2" />
        {[55,70,85,100,115,130,145].map((y, i) => (
          <rect key={i} x="351" y={y-3} width="2" height="6" fill="#EF4444" opacity={i % 2 === 0 ? 0.2 : 0.8} />
        ))}
        <text x="200" y="190" fill="#64748B" fontSize="11" fontFamily="sans-serif" textAnchor="middle">Predict: What pattern do you expect?</text>
      </svg>

      <p
        style={{
          fontSize: defined.typography.sizes.base,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        Think about what you expect: Now use TWO slits instead of one. How will the pattern change compared to a single slit?
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: defined.spacing.md,
          width: '100%',
          maxWidth: '500px',
        }}
      >
        {[
          { id: 'more', text: 'MORE fringes - interference creates additional bright/dark bands' },
          { id: 'same', text: 'SAME pattern - two slits act like one wider slit' },
          { id: 'blur', text: 'BLUR - light from two slits cancels randomly' },
          { id: 'double', text: 'TWO separate patterns - one from each slit' },
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => setTwistPrediction(option.id)}
            style={{
              padding: defined.spacing.lg,
              borderRadius: defined.radius.lg,
              border:
                twistPrediction === option.id
                  ? `2px solid ${defined.colors.accent}`
                  : '2px solid rgba(255,255,255,0.1)',
              background:
                twistPrediction === option.id
                  ? 'rgba(245, 158, 11, 0.2)'
                  : defined.colors.background.secondary,
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.base,
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: defined.typography.fontFamily,
              transition: 'all 0.2s ease',
            }}
          >
            {option.text}
          </button>
        ))}
      </div>

      {Button({
        children: 'See Double Slit Pattern →',
        onClick: () => {
          setSlitMode('double');
          handleNavigation('twist_play');
        },
        disabled: !twistPrediction,
        size: 'lg',
      })}
    </div>
  );

  // TWIST PLAY PHASE
  const renderTwistPlay = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: defined.spacing.lg,
        padding: defined.spacing.lg,
      }}
    >
      <div
        style={{
          background: 'rgba(245, 158, 11, 0.2)',
          borderRadius: defined.radius.full,
          padding: `${defined.spacing.sm} ${defined.spacing.lg}`,
          border: '1px solid rgba(245, 158, 11, 0.3)',
        }}
      >
        <span style={{ color: defined.colors.accent, fontWeight: defined.typography.weights.semibold }}>
          📡 DOUBLE SLIT INTERFERENCE
        </span>
      </div>

      <h2
        style={{
          fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.text.primary,
          margin: 0,
        }}
      >
        Two Sources, One Pattern
      </h2>

      <p
        style={{
          fontSize: defined.typography.sizes.sm,
          color: defined.colors.text.secondary,
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        Adjust slit separation and see how the interference pattern changes. More separation =
        closer fringes!
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: defined.spacing.xl,
          alignItems: 'flex-start',
          width: '100%',
          maxWidth: '850px',
        }}
      >
        {renderDiffractionVisualization()}
        {renderControls()}
      </div>

      {Button({
        children: 'See the Science →',
        onClick: () => handleNavigation('twist_review'),
        size: 'lg',
      })}
    </div>
  );

  // TWIST REVIEW PHASE
  const renderTwistReview = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: defined.spacing.xl,
        padding: defined.spacing.xl,
      }}
    >
      <h2
        style={{
          fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.text.primary,
          margin: 0,
        }}
      >
        The Historic Proof of Light Waves!
      </h2>

      <div
        style={{
          background:
            twistPrediction === 'more' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          maxWidth: '500px',
          textAlign: 'center',
          border: `1px solid ${twistPrediction === 'more' ? defined.colors.success : defined.colors.error}`,
        }}
      >
        <div
          style={{
            fontSize: defined.typography.sizes.lg,
            fontWeight: defined.typography.weights.semibold,
            color: twistPrediction === 'more' ? defined.colors.success : defined.colors.error,
            marginBottom: defined.spacing.sm,
          }}
        >
          {twistPrediction === 'more' ? '✓ Exactly right!' : '✗ The pattern is surprising!'}
        </div>
        <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
          Waves from both slits interfere, creating many more bright and dark fringes. This pattern
          is impossible to explain with particles - it's proof that light is a wave!
        </p>
      </div>

      <div
        style={{
          background: defined.colors.background.card,
          borderRadius: defined.radius.xl,
          padding: defined.spacing.xl,
          maxWidth: '600px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <h3
          style={{
            color: defined.colors.text.primary,
            fontSize: defined.typography.sizes.lg,
            marginBottom: defined.spacing.lg,
            textAlign: 'center',
          }}
        >
          Thomas Young's 1801 Discovery
        </h3>
        <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm, marginBottom: defined.spacing.md }}>
          Young's double-slit experiment definitively proved light's wave nature. The interference
          pattern could only be explained by waves - not Newton's "corpuscles" (particles).
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: defined.spacing.xl,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'serif',
                fontSize: defined.typography.sizes.lg,
                color: defined.colors.primary,
              }}
            >
              d·sin(θ) = mλ
            </div>
            <div style={{ fontSize: defined.typography.sizes.xs, color: defined.colors.text.muted }}>
              Bright fringes (maxima)
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'serif',
                fontSize: defined.typography.sizes.lg,
                color: defined.colors.accent,
              }}
            >
              d·sin(θ) = (m+½)λ
            </div>
            <div style={{ fontSize: defined.typography.sizes.xs, color: defined.colors.text.muted }}>
              Dark fringes (minima)
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: defined.spacing.lg,
          maxWidth: '600px',
        }}
      >
        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.lg,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>📏</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.base,
              marginBottom: defined.spacing.sm,
            }}
          >
            Path Difference
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Waves from two slits travel different distances. Where difference = whole wavelengths,
            they add (bright). Half wavelengths = cancel (dark).
          </p>
        </div>

        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.lg,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.sm }}>🎯</div>
          <h3
            style={{
              color: defined.colors.text.primary,
              fontSize: defined.typography.sizes.base,
              marginBottom: defined.spacing.sm,
            }}
          >
            Central Maximum
          </h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            At the center, both waves travel equal distances - zero path difference - always a
            bright spot (m = 0).
          </p>
        </div>
      </div>

      {Button({
        children: 'See Real-World Applications →',
        onClick: () => handleNavigation('transfer'),
        size: 'lg',
      })}
    </div>
  );

  // TRANSFER PHASE
  const renderTransfer = () => {
    const currentApp = applications[selectedApp];
    const rwApp = realWorldApps[selectedApp] || realWorldApps[0];

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: defined.spacing.lg,
          padding: defined.spacing.lg,
          minHeight: '500px',
        }}
      >
        <h2
          style={{
            fontSize: isMobile ? defined.typography.sizes.xl : defined.typography.sizes['2xl'],
            fontWeight: defined.typography.weights.bold,
            color: defined.colors.text.primary,
            textAlign: 'center',
            margin: 0,
          }}
        >
          Real-World Applications
        </h2>

        {/* Rich real-world application content from realWorldApps */}
        <div style={{
          background: defined.colors.background.card, borderRadius: defined.radius.xl,
          padding: defined.spacing.xl, border: '1px solid rgba(255,255,255,0.1)', marginBottom: '16px',
        }}>
          <h3 style={{ color: rwApp.color, fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
            {rwApp.icon} {rwApp.title}: {rwApp.tagline}
          </h3>
          <p style={{ color: defined.colors.text.secondary, lineHeight: 1.7, marginBottom: '12px' }}>{rwApp.description}</p>
          <p style={{ color: defined.colors.text.secondary, lineHeight: 1.7, marginBottom: '12px' }}>{rwApp.connection}</p>
          <p style={{ color: defined.colors.text.secondary, lineHeight: 1.7, marginBottom: '16px' }}>{rwApp.howItWorks}</p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {rwApp.stats.map((stat: { value: string; label: string; icon: string }, i: number) => (
              <div key={i} style={{ background: 'rgba(99,102,241,0.1)', borderRadius: '12px', padding: '12px 16px', flex: '1 1 120px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: defined.colors.text.primary }}>{stat.value}</div>
                <div style={{ fontSize: '12px', color: defined.colors.text.muted }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '12px' }}>
            <h4 style={{ color: defined.colors.text.primary, fontSize: '14px', marginBottom: '8px' }}>Key Examples:</h4>
            {rwApp.examples.map((ex: string, i: number) => (
              <p key={i} style={{ color: defined.colors.text.secondary, fontSize: '13px', lineHeight: 1.6, marginBottom: '4px' }}>• {ex}</p>
            ))}
          </div>

          <p style={{ color: defined.colors.text.muted, fontSize: '13px', marginBottom: '8px' }}>
            Leading organizations: {rwApp.companies.join(', ')}
          </p>
          <p style={{ color: defined.colors.text.secondary, fontSize: '13px', fontStyle: 'italic' }}>{rwApp.futureImpact}</p>
        </div>

        {/* Progress indicator */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: defined.spacing.xs,
          }}
        >
          {applications.map((_, i) => (
            <div
              key={i}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: completedApps[i]
                  ? defined.colors.success
                  : i === selectedApp
                    ? defined.colors.primary
                    : defined.colors.background.tertiary,
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Application tabs */}
        <div
          style={{
            display: 'flex',
            gap: defined.spacing.sm,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {applications.map((app, i) => {
            const isCompleted = completedApps[i];
            const isLocked = i > 0 && !completedApps[i - 1] && !isCompleted;

            return (
              <button
                key={app.id}
                onClick={() => !isLocked && setSelectedApp(i)}
                disabled={isLocked}
                style={{
                  padding: `${defined.spacing.sm} ${defined.spacing.md}`,
                  borderRadius: defined.radius.lg,
                  border:
                    selectedApp === i
                      ? `2px solid ${defined.colors.primary}`
                      : '2px solid transparent',
                  background:
                    selectedApp === i
                      ? defined.colors.background.tertiary
                      : defined.colors.background.secondary,
                  color: isLocked ? defined.colors.text.muted : defined.colors.text.primary,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  fontFamily: defined.typography.fontFamily,
                  fontSize: defined.typography.sizes.sm,
                  opacity: isLocked ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: defined.spacing.xs,
                }}
              >
                <span>{isLocked ? '🔒' : app.icon}</span>
                {!isMobile && app.title}
                {isCompleted && <span style={{ color: defined.colors.success }}>✓</span>}
              </button>
            );
          })}
        </div>

        {/* Current application content */}
        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.xl,
            padding: defined.spacing.xl,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            flex: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: defined.spacing.md,
              marginBottom: defined.spacing.lg,
            }}
          >
            <span style={{ fontSize: '2.5rem' }}>{currentApp.icon}</span>
            <div>
              <h3
                style={{
                  color: defined.colors.text.primary,
                  fontSize: defined.typography.sizes.xl,
                  margin: 0,
                }}
              >
                {currentApp.title}
              </h3>
              <p
                style={{
                  color: defined.colors.text.muted,
                  fontSize: defined.typography.sizes.sm,
                  margin: 0,
                }}
              >
                {currentApp.description}
              </p>
            </div>
          </div>

          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: defined.spacing.md,
            }}
          >
            {currentApp.details.map((detail, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: defined.spacing.md,
                  color: defined.colors.text.secondary,
                  fontSize: defined.typography.sizes.base,
                }}
              >
                <span style={{ color: defined.colors.primary, fontWeight: 'bold' }}>•</span>
                {detail}
              </li>
            ))}
          </ul>
        </div>

        {/* Navigation */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: defined.spacing.md,
          }}
        >
          {Button({
            children: '← Previous',
            onClick: () => setSelectedApp(Math.max(0, selectedApp - 1)),
            variant: 'secondary',
            disabled: selectedApp === 0,
          })}

          {!completedApps[selectedApp] ? (
            Button({
              children:
                selectedApp < applications.length - 1
                  ? 'Next Application →'
                  : 'Complete Applications',
              onClick: handleCompleteApp,
              variant: 'primary',
            })
          ) : selectedApp < applications.length - 1 ? (
            Button({
              children: 'Next Application →',
              onClick: () => setSelectedApp(selectedApp + 1),
              variant: 'secondary',
            })
          ) : allAppsCompleted ? (
            Button({
              children: 'Take the Quiz →',
              onClick: () => handleNavigation('test'),
              variant: 'success',
            })
          ) : (
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              Complete all applications to take the quiz
            </div>
          )}
        </div>
      </div>
    );
  };

  // TEST PHASE
  const renderTest = () => {
    const question = questions[currentQuestion];

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: defined.spacing.xl,
          padding: defined.spacing.xl,
        }}
      >
        {ProgressBar({ current: currentQuestion, total: questions.length })}

        <div
          style={{
            fontSize: defined.typography.sizes.sm,
            color: defined.colors.text.muted,
          }}
        >
          Question {currentQuestion + 1} of {questions.length}
        </div>

        <h2
          style={{
            fontSize: isMobile ? defined.typography.sizes.lg : defined.typography.sizes.xl,
            fontWeight: defined.typography.weights.semibold,
            color: defined.colors.text.primary,
            textAlign: 'center',
            margin: 0,
            maxWidth: '600px',
          }}
        >
          {question.question}
        </h2>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: defined.spacing.md,
            width: '100%',
            maxWidth: '500px',
          }}
        >
          {question.options.map((option, i) => {
            let background = defined.colors.background.secondary;
            let borderColor = 'rgba(255,255,255,0.1)';

            if (showResult) {
              if (option.correct) {
                background = 'rgba(16, 185, 129, 0.2)';
                borderColor = defined.colors.success;
              } else if (i === selectedAnswer && !option.correct) {
                background = 'rgba(239, 68, 68, 0.2)';
                borderColor = defined.colors.error;
              }
            } else if (i === selectedAnswer) {
              background = 'rgba(99, 102, 241, 0.2)';
              borderColor = defined.colors.primary;
            }

            return (
              <button
                key={i}
                onClick={() => handleAnswerSelect(i)}
                disabled={showResult}
                style={{
                  padding: defined.spacing.lg,
                  borderRadius: defined.radius.lg,
                  border: `2px solid ${borderColor}`,
                  background,
                  color: defined.colors.text.primary,
                  fontSize: defined.typography.sizes.base,
                  textAlign: 'left',
                  cursor: showResult ? 'default' : 'pointer',
                  fontFamily: defined.typography.fontFamily,
                  transition: 'all 0.2s ease',
                }}
              >
                {option.text}
              </button>
            );
          })}
        </div>

        {showResult && (
          <div
            style={{
              background: defined.colors.background.card,
              borderRadius: defined.radius.lg,
              padding: defined.spacing.lg,
              maxWidth: '500px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <p
              style={{
                color: defined.colors.text.secondary,
                fontSize: defined.typography.sizes.sm,
                margin: 0,
              }}
            >
              {question.explanation}
            </p>
          </div>
        )}

        {showResult &&
          Button({
            children: currentQuestion < questions.length - 1 ? 'Next Question →' : 'See Results →',
            onClick: handleNextQuestion,
            size: 'lg',
          })}
      </div>
    );
  };

  // MASTERY PHASE
  const renderMastery = () => {
    const percentage = (testScore / 10) * 100;
    const passed = percentage >= 70;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: defined.spacing.xl,
          padding: defined.spacing.xl,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '4rem',
            marginBottom: defined.spacing.md,
          }}
        >
          {passed ? '〰️' : '📚'}
        </div>

        <h1
          style={{
            fontSize: isMobile ? defined.typography.sizes['2xl'] : defined.typography.sizes['3xl'],
            fontWeight: defined.typography.weights.bold,
            color: defined.colors.text.primary,
            margin: 0,
          }}
        >
          {passed ? 'Complete Your Mastery - Wave Master!' : 'Complete Your Mastery - Keep Practicing!'}
        </h1>

        <div
          style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.xl,
            padding: defined.spacing.xl,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div
            style={{
              fontSize: defined.typography.sizes['4xl'],
              fontWeight: defined.typography.weights.bold,
              color: passed ? defined.colors.success : defined.colors.accent,
              marginBottom: defined.spacing.sm,
            }}
          >
            {testScore}/10
          </div>
          <div
            style={{
              fontSize: defined.typography.sizes.lg,
              color: defined.colors.text.secondary,
            }}
          >
            {percentage.toFixed(0)}% Correct
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: '200px',
              height: '8px',
              background: defined.colors.background.tertiary,
              borderRadius: defined.radius.full,
              overflow: 'hidden',
              margin: `${defined.spacing.lg} auto 0`,
            }}
          >
            <div
              style={{
                width: `${percentage}%`,
                height: '100%',
                background: passed
                  ? defined.colors.success
                  : percentage >= 50
                    ? defined.colors.accent
                    : defined.colors.error,
                transition: 'width 1s ease',
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: defined.spacing.md,
            maxWidth: '600px',
            width: '100%',
          }}
        >
          <div
            style={{
              background: defined.colors.background.card,
              borderRadius: defined.radius.lg,
              padding: defined.spacing.md,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.xs }}>〰️</div>
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              Wave Behavior
            </div>
          </div>
          <div
            style={{
              background: defined.colors.background.card,
              borderRadius: defined.radius.lg,
              padding: defined.spacing.md,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.xs }}>⚡</div>
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              Interference
            </div>
          </div>
          <div
            style={{
              background: defined.colors.background.card,
              borderRadius: defined.radius.lg,
              padding: defined.spacing.md,
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: defined.spacing.xs }}>🔬</div>
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              Crystallography
            </div>
          </div>
        </div>

        <p
          style={{
            fontSize: defined.typography.sizes.base,
            color: defined.colors.text.secondary,
            maxWidth: '500px',
          }}
        >
          {passed
            ? "You understand how diffraction reveals light's wave nature - from Young's historic experiment to modern X-ray crystallography!"
            : "Review diffraction concepts and try again. Understanding wave behavior is essential for modern physics!"}
        </p>

        <div style={{ display: 'flex', gap: defined.spacing.md }}>
          {Button({
            children: 'Start Over',
            onClick: () => {
              setPhase('hook');
              setPrediction(null);
              setTwistPrediction(null);
              setCurrentQuestion(0);
              setSelectedAnswer(null);
              setShowResult(false);
              setScore(0);
              setCompletedApps([false, false, false, false]);
              setSelectedApp(0);
              setSlitMode('single');
              setSlitWidth(50);
            },
            variant: 'secondary',
          })}
        </div>
      </div>
    );
  };

  // =============================================================================
  // RENDER
  // =============================================================================
  const phaseIdx = PHASES.indexOf(phase);
  const isFirst = phaseIdx === 0;
  const isLast = phaseIdx === PHASES.length - 1;
  const isTestPhase = phase === 'test';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      minHeight: '100dvh', height: '100dvh', background: 'linear-gradient(135deg, #0f172a, #0a1628, #0f172a)',
      color: '#f8fafc', position: 'relative', overflow: 'hidden',
      fontFamily: defined.typography.fontFamily, fontWeight: 400,
    }}>
      {/* Main content area */}
      <div style={{
        position: 'relative', flex: 1, paddingTop: '16px', paddingBottom: '16px',
        maxWidth: '900px', margin: '0 auto', width: '100%', padding: '16px 16px 80px',
        overflowY: 'auto',
      }}>
        {phase === 'hook' && renderHook()}
        {phase === 'predict' && renderPredict()}
        {phase === 'play' && renderPlay()}
        {phase === 'review' && renderReview()}
        {phase === 'twist_predict' && renderTwistPredict()}
        {phase === 'twist_play' && renderTwistPlay()}
        {phase === 'twist_review' && renderTwistReview()}
        {phase === 'transfer' && (
          <TransferPhaseView
            conceptName="Diffraction"
            applications={realWorldApps}
            onComplete={() => setPhase('test')}
            isMobile={isMobile}
            colors={colors}
            typo={typo}
            playSound={playSound}
          />
        )}
        {phase === 'test' && testComplete && (
          <div style={{ textAlign: 'center', padding: '24px', fontFamily: defined.typography.fontFamily }}>
            <h2 style={{ color: defined.colors.success, marginBottom: '8px' }}>
              {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ color: defined.colors.text.primary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
            <p style={{ color: '#94a3b8', marginTop: '8px' }}>
              {testScore >= 8 ? 'You\'ve mastered diffraction!' : 'Review the material and try again.'}
            </p>
          </div>
        )}
        {phase === 'test' && !testComplete && testCurrentQ && (
          <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto', fontFamily: defined.typography.fontFamily }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: defined.colors.text.primary, fontSize: '20px', fontWeight: 700 }}>Knowledge Test</h2>
              <span style={{ color: '#64748b', fontSize: '14px' }}>Question {currentTestQuestion + 1} of 10</span>
            </div>

            <div style={{
              background: 'rgba(30,41,59,0.8)', padding: '16px', borderRadius: '12px',
              marginBottom: '16px', borderLeft: `3px solid ${defined.colors.primary}`,
            }}>
              <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.6, marginBottom: '8px' }}>
                {[
                  'A student in an advanced optics laboratory shines a laser pointer through the narrow gap between two pencils held closely together and notices a peculiar spreading pattern of alternating bright and dark bands appearing on the far wall, which cannot be explained by simple ray optics.',
                  'In a university physics lab, students carefully observe bright and dark bands forming on a white screen placed behind a single narrow slit illuminated by a monochromatic laser beam, and they need to explain why the pattern has a wide central maximum with progressively narrower side fringes.',
                  'A teacher demonstrates what happens when the slit width is gradually reduced from 500 micrometers to 50 micrometers while students watch the diffraction pattern on the projection screen carefully, noting how the central maximum changes dramatically in width.',
                  'In the year 1801, Thomas Young performed his famous double-slit experiment that changed our understanding of light forever, providing the first definitive evidence that light exhibits wave-like behavior through the observation of an interference pattern on a distant screen.',
                  'Two narrow slits separated by 0.2 millimeters are illuminated by a 650 nm red laser beam. A student measures the position of the central bright fringe and the first-order maxima on a screen placed 2 meters away, and must calculate the expected fringe spacing using the interference equation.',
                  'A researcher switches between red (650 nm) and blue (450 nm) laser sources while observing double-slit interference patterns on a screen placed at a fixed distance, and carefully records how the fringe spacing changes with the wavelength of incident light.',
                  'An advanced physics student is asked to derive the mathematical condition for constructive interference in a double-slit setup where the path difference between waves from the two slits must equal an integer multiple of the wavelength for bright fringes to appear at that location.',
                  'A lab instructor explains to the class why they must use coherent laser light rather than an ordinary flashlight bulb for diffraction experiments, emphasizing the importance of monochromatic and phase-coherent illumination for producing clear, stable interference patterns.',
                  'A theoretical physics exercise asks students to consider the limiting case as a single slit becomes infinitesimally narrow, approaching a point source, and to predict what happens to the diffraction pattern based on Huygens principle and the superposition of wavelets.',
                  'In a modern physics class, students learn about electron diffraction experiments performed by Davisson and Germer that mirror optical diffraction results, demonstrating that particles also exhibit wave-like properties with a de Broglie wavelength inversely proportional to their momentum.',
                ][currentTestQuestion]}
              </p>
              <p style={{ color: defined.colors.text.primary, fontSize: '16px', lineHeight: 1.5, fontWeight: 600 }}>
                {testCurrentQ.question}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {testCurrentQ.options.map((opt, oIndex) => {
                const isSelected = testSelectedIdx === oIndex;
                const wasConfirmedCorrect = testIsConfirmed && opt.correct;
                const wasConfirmedWrong = testIsConfirmed && confirmedIndex === oIndex && !opt.correct;
                return (
                  <button
                    key={oIndex}
                    onClick={() => { if (!testIsConfirmed) handleTestAnswer(currentTestQuestion, oIndex); }}
                    style={{
                      padding: '14px 16px', borderRadius: '8px',
                      border: wasConfirmedCorrect ? `2px solid ${defined.colors.success}` : wasConfirmedWrong ? `2px solid ${defined.colors.error}` : isSelected ? `2px solid ${defined.colors.primary}` : '1px solid rgba(255,255,255,0.2)',
                      background: wasConfirmedCorrect ? 'rgba(16, 185, 129, 0.2)' : wasConfirmedWrong ? 'rgba(239, 68, 68, 0.2)' : isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                      color: defined.colors.text.primary, cursor: testIsConfirmed ? 'default' : 'pointer',
                      textAlign: 'left' as const, fontSize: '14px', transition: 'all 0.2s ease',
                      fontFamily: defined.typography.fontFamily,
                    }}
                  >
                    {(['A', 'B', 'C', 'D'])[oIndex]}) {opt.text}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '16px' }}>
              {!testIsConfirmed && testSelectedIdx !== null && (
                <button onClick={handleTestConfirm} style={{
                  padding: '12px 24px', borderRadius: '8px', border: 'none',
                  background: `linear-gradient(135deg, ${defined.colors.primary}, #4F46E5)`,
                  color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                  transition: 'all 0.2s ease', fontFamily: defined.typography.fontFamily,
                }}>
                  Check Answer
                </button>
              )}
              {testIsConfirmed && (
                <button onClick={handleTestNextQ} style={{
                  padding: '12px 24px', borderRadius: '8px', border: 'none',
                  background: `linear-gradient(135deg, ${defined.colors.success}, #059669)`,
                  color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                  transition: 'all 0.2s ease', fontFamily: defined.typography.fontFamily,
                }}>
                  {currentTestQuestion < questions.length - 1 ? 'Next Question' : 'See Results'}
                </button>
              )}
            </div>

            {testIsConfirmed && (
              <div style={{
                background: 'rgba(30,41,59,0.8)', borderRadius: '12px', padding: '16px',
                marginTop: '16px', border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                  {testCurrentQ.explanation}
                </p>
              </div>
            )}
          </div>
        )}
        {phase === 'mastery' && renderMastery()}
      </div>

      {/* Bottom navigation bar */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={goBack} style={{
          padding: '12px 20px', minHeight: '48px', border: 'none', borderRadius: '8px',
          background: 'transparent', color: isFirst ? 'rgba(148,163,184,0.3)' : '#e2e8f0',
          cursor: isFirst ? 'not-allowed' : 'pointer', fontFamily: defined.typography.fontFamily,
          fontSize: '14px', fontWeight: 500, opacity: isFirst ? 0.4 : 1,
          transition: 'all 0.2s ease',
        }}>
          {'\u2190 Back'}
        </button>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {PHASES.map((p, i) => (
            <div key={p} onClick={() => handleNavigation(p)} title={phaseLabels[p]} role="button" tabIndex={0} style={{
              width: phase === p ? '24px' : '8px', height: '8px',
              borderRadius: '4px',
              background: phase === p ? defined.colors.primary : (i < phaseIdx ? defined.colors.success : 'rgba(100,116,139,0.4)'),
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        <button onClick={goNext} disabled={isLast || isTestPhase} style={{
          padding: '12px 24px', minHeight: '48px', border: 'none', borderRadius: '8px',
          background: (isLast || isTestPhase) ? 'rgba(100,116,139,0.3)' : 'linear-gradient(135deg, #6366F1, #4F46E5)',
          color: '#f8fafc', cursor: (isLast || isTestPhase) ? 'not-allowed' : 'pointer',
          fontFamily: defined.typography.fontFamily, fontSize: '14px', fontWeight: 600,
          opacity: (isLast || isTestPhase) ? 0.4 : 1,
          transition: 'all 0.2s ease',
          boxShadow: (isLast || isTestPhase) ? 'none' : '0 2px 8px rgba(99,102,241,0.3)',
        }}>
          {'Next \u2192'}
        </button>
      </nav>
    </div>
  );
}
