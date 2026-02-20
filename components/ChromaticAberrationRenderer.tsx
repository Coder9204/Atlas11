'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

// =============================================================================
// CHROMATIC ABERRATION RENDERER - WHY EDGES GET COLOR FRINGES
// =============================================================================
// Game 131: Premium educational game demonstrating how wavelength-dependent
// refraction causes different colors to focus at different points. Students
// explore how achromatic doublets correct this optical aberration.
// =============================================================================

interface ChromaticAberrationRendererProps {
  phase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  gamePhase?: string;
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
  onGameEvent?: (event: Record<string, unknown>) => void;
}

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
    spectrum: {
      red: '#EF4444',
      orange: '#F97316',
      yellow: '#EAB308',
      green: '#22C55E',
      cyan: '#06B6D4',
      blue: '#3B82F6',
      violet: '#8B5CF6',
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
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
};

// =============================================================================
// WAVELENGTH DATA
// =============================================================================
const wavelengths = [
  { name: 'Red', wavelength: 700, color: defined.colors.spectrum.red, n: 1.510 },
  { name: 'Orange', wavelength: 620, color: defined.colors.spectrum.orange, n: 1.514 },
  { name: 'Yellow', wavelength: 580, color: defined.colors.spectrum.yellow, n: 1.517 },
  { name: 'Green', wavelength: 530, color: defined.colors.spectrum.green, n: 1.521 },
  { name: 'Cyan', wavelength: 490, color: defined.colors.spectrum.cyan, n: 1.525 },
  { name: 'Blue', wavelength: 450, color: defined.colors.spectrum.blue, n: 1.530 },
  { name: 'Violet', wavelength: 400, color: defined.colors.spectrum.violet, n: 1.538 },
];

// =============================================================================
// QUESTIONS DATA
// =============================================================================
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

const questions: Question[] = [
  {
    id: 1,
    question: 'A photographer notices purple and green fringes along the edges of tree branches against a bright sky. The camera uses a simple single-element lens. What is the primary cause of these colored fringes appearing in the image?',
    options: [
      { text: 'Lens manufacturing defects causing irregular surfaces', correct: false },
      { text: 'Different wavelengths refract by different amounts (dispersion)', correct: true },
      { text: 'Light absorption in the glass creating color casts', correct: false },
      { text: 'Internal reflections between lens surfaces', correct: false },
    ],
    explanation: 'Glass has a wavelength-dependent refractive index. Blue light bends more than red, so different colors focus at different distances from the lens. This dispersion creates the visible color fringes.',
  },
  {
    id: 2,
    question: 'An optical engineer is designing a lens and needs to determine which wavelengths will focus closest to the lens surface. The lens uses standard crown glass (n=1.52 for green). Based on the physics of dispersion, which color of visible light will bend the most?',
    options: [
      { text: 'Red light (700nm wavelength) bends most', correct: false },
      { text: 'Yellow light (580nm wavelength) bends most', correct: false },
      { text: 'Blue/Violet light (400-450nm wavelength) bends most', correct: true },
      { text: 'All colors bend equally through any glass material', correct: false },
    ],
    explanation: 'Shorter wavelengths have higher refractive indices in glass (normal dispersion). Blue/violet light bends more and focuses closer to the lens than red light, with indices ranging from n=1.51 (red) to n=1.53 (violet).',
  },
  {
    id: 3,
    question: 'A wildlife photographer reviewing their 600mm telephoto lens images notices the chromatic aberration is much worse at the edges of the frame than in the center. The subject, a white egret against dark vegetation, shows severe color fringing. Where and why does CA appear most noticeably?',
    options: [
      { text: 'In the center of the image where focus is sharpest', correct: false },
      { text: 'At high-contrast edges, especially toward frame edges', correct: true },
      { text: 'Only in out-of-focus background areas', correct: false },
      { text: 'Uniformly across the entire image field', correct: false },
    ],
    explanation: 'Chromatic aberration shows as color fringes along high-contrast edges. It is worse toward frame edges where rays hit the lens at steeper angles, causing more separation between wavelengths.',
  },
  {
    id: 4,
    question: 'A telescope manufacturer advertises their refractor uses an "achromatic doublet" objective lens. This design combines a convex crown glass element (Abbe 60) with a concave flint glass element (Abbe 30). What does this achromatic doublet actually accomplish?',
    options: [
      { text: 'Two identical lenses glued together for strength', correct: false },
      { text: 'A crown + flint glass pair designed to focus two wavelengths to the same point', correct: true },
      { text: 'A lens with anti-reflective coating on both surfaces', correct: false },
      { text: 'Two separate cameras used in stereo configuration', correct: false },
    ],
    explanation: 'An achromatic doublet combines a converging crown glass lens with a diverging flint glass lens. Flint glass has higher dispersion, allowing the pair to cancel most chromatic aberration for two wavelengths.',
  },
  {
    id: 5,
    question: 'An optician is explaining lens materials to a customer. Crown glass has an Abbe number around 60, while flint glass (containing lead oxide) has an Abbe number around 30. What is the key optical difference that makes flint glass useful in achromatic designs?',
    options: [
      { text: 'Flint glass is mechanically harder and more scratch-resistant', correct: false },
      { text: 'Flint glass has higher dispersion (more separation of colors)', correct: true },
      { text: 'Flint glass transmits more light with higher clarity', correct: false },
      { text: 'Flint glass is less expensive to manufacture', correct: false },
    ],
    explanation: 'Flint glass contains lead oxide, giving it higher refractive index AND higher dispersion than crown glass. This property makes it essential for correcting chromatic aberration when paired with crown glass.',
  },
  {
    id: 6,
    question: 'A professional astrophotographer is comparing telescope specifications. An apochromatic (APO) refractor costs $6,000 while an achromatic refractor costs $600. The APO uses exotic fluorite glass elements. How many wavelengths does an apochromatic lens correct for compared to standard achromats?',
    options: [
      { text: 'One wavelength only, same as simple lenses', correct: false },
      { text: 'Two wavelengths, identical to achromatic designs', correct: false },
      { text: 'Three wavelengths, with even better correction', correct: true },
      { text: 'All wavelengths perfectly with zero residual error', correct: false },
    ],
    explanation: 'Apochromatic (APO) lenses use special glass types to bring three wavelengths (typically red, green, and blue) to a common focus point. They are essential for demanding applications like astrophotography.',
  },
  {
    id: 7,
    question: 'A birdwatcher using $50 binoculars notices distracting purple and magenta fringes around a white heron against the bright sky. Their friend with $500 ED binoculars sees no such fringes. Why do inexpensive binoculars show these purple color fringes around bright objects?',
    options: [
      { text: 'The glass is intentionally tinted purple', correct: false },
      { text: 'They lack proper chromatic aberration correction', correct: true },
      { text: 'The observer is experiencing optical illusions', correct: false },
      { text: 'The bird itself has purple coloring', correct: false },
    ],
    explanation: 'Inexpensive optics use simple lenses without achromatic correction. Blue/violet light focuses at a different point than red/green, creating visible purple or magenta fringes around high-contrast subjects.',
  },
  {
    id: 8,
    question: 'An optical designer is comparing lens materials using their Abbe numbers: CR-39 plastic (V=58), polycarbonate (V=30), and Trivex (V=45). The customer wants minimal color fringing. What does the Abbe number (V-number) actually measure?',
    options: [
      { text: 'The magnification power of the lens material', correct: false },
      { text: 'A material dispersion - how much it separates colors', correct: true },
      { text: 'The physical diameter of the lens element', correct: false },
      { text: 'The brightness and light transmission of the lens', correct: false },
    ],
    explanation: 'The Abbe number quantifies dispersion. Higher V = lower dispersion (crown glass ~60, CR-39 ~58). Lower V = higher dispersion (flint glass ~30, polycarbonate ~30). Achromat design requires balancing these values.',
  },
  {
    id: 9,
    question: 'The Hubble Space Telescope uses a 2.4-meter primary mirror rather than a refracting lens. Ground-based observatories like Keck (10m) and GMT (25m) also use mirrors. Why do all large research telescopes use reflecting designs instead of refractors?',
    options: [
      { text: 'Mirrors are made of special chromatic-correcting glass', correct: false },
      { text: 'Reflection angle does not depend on wavelength', correct: true },
      { text: 'Mirrors can be ground to mathematically perfect curves', correct: false },
      { text: 'Distant astronomical objects require reflective optics', correct: false },
    ],
    explanation: 'Mirrors reflect all wavelengths at the same angle (law of reflection). Only refraction depends on wavelength. This is why all large telescopes use mirrors instead of lenses - completely eliminating chromatic aberration.',
  },
  {
    id: 10,
    question: 'Canon L-series lenses advertise "UD" and "Super UD" glass elements, while Nikon uses "ED" (Extra-low Dispersion) glass. These specialty materials cost 5-10x more than standard optical glass. What is the primary purpose of using ED glass in modern camera lenses?',
    options: [
      { text: 'To make the lens body lighter and more portable', correct: false },
      { text: 'To reduce chromatic aberration with special low-dispersion elements', correct: true },
      { text: 'To improve autofocus motor speed and accuracy', correct: false },
      { text: 'To increase the maximum aperture to f/1.4', correct: false },
    ],
    explanation: 'ED glass has unusually low dispersion for its refractive index. Including ED elements allows better chromatic correction in fewer lens elements, significantly improving image quality for professional photography.',
  },
];

// =============================================================================
// APPLICATIONS DATA
// =============================================================================
interface Application {
  id: number;
  title: string;
  description: string;
  icon: string;
  details: string[];
}

const applications: Application[] = [
  {
    id: 1,
    title: 'Camera Lenses',
    description: 'Canon, Nikon, and Sony use ED glass for professional optics worth $2,000-$15,000',
    icon: '📷',
    details: [
      'Canon L-series lenses use up to 17 elements including 3-4 ED glass elements for 95% aberration correction',
      'Nikon Z-mount lenses achieve 0.1% lateral CA through advanced fluorite glass designs costing $3,000+',
      'Sony G Master lenses use XA (extreme aspherical) elements reducing purple fringing by 90% in 24MP+ sensors',
      'Adobe Lightroom can remove 85% of residual CA through lens profile corrections applied to RAW files',
      'Professional cinema lenses from Zeiss and Arri cost $25,000-$50,000 for near-perfect chromatic correction',
    ],
  },
  {
    id: 2,
    title: 'Telescope Design',
    description: 'Takahashi and TeleVue manufacture $5,000-$20,000 apochromatic refractors',
    icon: '🔭',
    details: [
      'The 1-meter Swedish Solar Telescope uses a triplet apochromat correcting to 0.05 arcseconds',
      'Takahashi FSQ-106 ($6,800) uses 4-element Petzval design achieving 99.7% chromatic correction',
      'TeleVue NP-101is ($4,500) features premium fluorite glass for astrophotography at f/5.4',
      'NASA Hubble Space Telescope mirrors avoid all chromatic aberration, enabling observations at 0.05 arcsecond resolution',
      'Large Binocular Telescope (8.4m mirrors) cost $120 million, eliminating CA that would plague equivalent refracting designs',
    ],
  },
  {
    id: 3,
    title: 'Eyeglasses',
    description: 'Essilor and Carl Zeiss produce 500 million lenses annually with Abbe numbers from 30-60',
    icon: '👓',
    details: [
      'High-index 1.74 lenses (Abbe 33) show 40% more chromatic aberration than CR-39 (Abbe 58)',
      'Zeiss Individual 2 lenses ($800/pair) use Digital Inside Technology reducing CA by 25%',
      'Essilor Varilux X series progressives cost $400-$600 with enhanced chromatic correction zones',
      'Polycarbonate safety lenses (Abbe 30) trade optical quality for 10x impact resistance at $150/pair',
      'Trivex material (Abbe 45) offers 50% better optical clarity than polycarbonate for the same $200 price',
    ],
  },
  {
    id: 4,
    title: 'Microscope Objectives',
    description: 'Olympus and Nikon produce $3,000-$8,000 plan-apochromat objectives for research',
    icon: '🔬',
    details: [
      'Olympus 100x UPLSAPO objective ($7,500) corrects for 4 wavelengths across 405-700nm spectrum',
      'Nikon CFI Apo 60x oil immersion ($4,200) achieves numerical aperture of 1.49 with full color correction',
      'Zeiss Plan-Apochromat 63x ($6,800) uses 14 lens elements for research-grade fluorescence microscopy',
      'Leica HC PL APO objectives ($5,000-$12,000) are essential for 98% color accuracy in pathology imaging',
      'Research institutions spend $50,000-$200,000 per microscope system with matched apochromatic objective sets',
    ],
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function ChromaticAberrationRenderer({
  phase: externalPhase,
  gamePhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
  onGameEvent,
}: ChromaticAberrationRendererProps) {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    const prop = externalPhase || gamePhase;
    if (prop && validPhases.includes(prop as Phase)) {
      return prop as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Scroll to top on phase change
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
  }, [phase]);


  // Sync with external phase changes
  useEffect(() => {
    const prop = externalPhase || gamePhase;
    if (prop && validPhases.includes(prop as Phase)) {
      setPhase(prop as Phase);
    }
  }, [externalPhase, gamePhase]);

  // State management
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [userAnswers, setUserAnswers] = useState<{questionIndex: number; answerIndex: number; correct: boolean}[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Interactive simulation state
  const [lensCurvature, setLensCurvature] = useState(50);
  const [showAllWavelengths, setShowAllWavelengths] = useState(true);
  const [selectedWavelength, setSelectedWavelength] = useState(3);
  const [useDoublet, setUseDoublet] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Navigation refs
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  // Sound function
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
    const animate = () => {
      setAnimationFrame((prev) => (prev + 1) % 360);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Cleanup
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
  const calculateFocalLength = useCallback((n: number, curvature: number): number => {
    // Simplified lensmaker's equation: 1/f = (n-1) * curvature
    // Higher n = shorter focal length
    const baseFocal = 200 / (n - 1);
    const curvatureFactor = curvature / 50;
    return baseFocal / curvatureFactor;
  }, []);

  const getFocalPoint = useCallback((wavelengthIndex: number): number => {
    const wl = wavelengths[wavelengthIndex];
    let focalLength = calculateFocalLength(wl.n, lensCurvature);

    // If using doublet, reduce the focal spread
    if (useDoublet) {
      const middleN = wavelengths[3].n; // Green as reference
      const middleFocal = calculateFocalLength(middleN, lensCurvature);
      focalLength = middleFocal + (focalLength - middleFocal) * 0.15; // 85% correction
    }

    return focalLength;
  }, [lensCurvature, useDoublet, calculateFocalLength]);

  // =============================================================================
  // NAVIGATION HANDLERS
  // =============================================================================
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

      const isCorrect = questions[currentQuestion].options[index].correct;
      setUserAnswers(prev => [...prev, { questionIndex: currentQuestion, answerIndex: index, correct: isCorrect }]);
      if (isCorrect) {
        setScore((prev) => prev + 1);
        if (onCorrectAnswer) onCorrectAnswer();
      } else {
        if (onIncorrectAnswer) onIncorrectAnswer();
      }
    },
    [showResult, currentQuestion, onCorrectAnswer, onIncorrectAnswer]
  );

  const handleNextQuestion = useCallback(() => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setTestSubmitted(true);
    }
  }, [currentQuestion]);

  const handlePhaseComplete = useCallback(() => {
    playSound('transition');
    const currentIdx = validPhases.indexOf(phase);
    if (currentIdx < validPhases.length - 1) {
      setPhase(validPhases[currentIdx + 1]);
    }
    if (onPhaseComplete) onPhaseComplete();
  }, [playSound, onPhaseComplete, phase]);

  const allAppsCompleted = completedApps.every(Boolean);

  // =============================================================================
  // CHROMATIC ABERRATION VISUALIZATION - PREMIUM SVG GRAPHICS
  // =============================================================================
  const renderChromaticVisualization = useCallback(() => {
    const width = isMobile ? 340 : 620;
    const height = isMobile ? 400 : 450;
    const lensX = width * 0.32;
    const lensY = height * 0.48;
    const lensHeight = isMobile ? 100 : 130;

    // Calculate focal points for each wavelength
    const focalPoints = wavelengths.map((_, i) => ({
      x: lensX + getFocalPoint(i) * 1.5,
      color: wavelengths[i].color,
      name: wavelengths[i].name,
    }));

    // Incoming ray position
    const rayStartX = 40;
    const rayY = lensY;

    // Correction status for indicator
    const correctionLevel = useDoublet ? 'Corrected' : 'Uncorrected';
    const focalSpread = Math.max(...focalPoints.map(f => f.x)) - Math.min(...focalPoints.map(f => f.x));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: defined.spacing.md }}>
        {/* SVG Labels - Outside SVG using typo system */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: `${width}px`,
          padding: `0 ${defined.spacing.sm}`,
          marginBottom: defined.spacing.xs,
        }}>
          <span style={{ color: '#e2e8f0', fontSize: typo.small }}>White Light Source</span>
          <span style={{
            color: useDoublet ? defined.colors.success : defined.colors.primary,
            fontSize: typo.small,
            fontWeight: defined.typography.weights.semibold,
          }}>
            {useDoublet ? 'Achromatic Doublet' : 'Simple Lens'}
          </span>
          <span style={{ color: '#e2e8f0', fontSize: typo.small }}>Focal Region</span>
        </div>

        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible', maxWidth: `${width}px` }}>
          <defs>
            {/* Premium background gradient */}
            <linearGradient id="chromBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0a0f1a" />
              <stop offset="25%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="75%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#0a0f1a" />
            </linearGradient>

            {/* Crown glass lens gradient - premium glass refraction effect */}
            <linearGradient id="chromCrownGlass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(96, 165, 250, 0.08)" />
              <stop offset="20%" stopColor="rgba(147, 197, 253, 0.25)" />
              <stop offset="50%" stopColor="rgba(191, 219, 254, 0.4)" />
              <stop offset="80%" stopColor="rgba(147, 197, 253, 0.25)" />
              <stop offset="100%" stopColor="rgba(96, 165, 250, 0.08)" />
            </linearGradient>

            {/* Crown glass radial highlight for 3D effect */}
            <radialGradient id="chromCrownHighlight" cx="30%" cy="30%" r="60%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.35)" />
              <stop offset="40%" stopColor="rgba(191, 219, 254, 0.15)" />
              <stop offset="100%" stopColor="rgba(96, 165, 250, 0)" />
            </radialGradient>

            {/* Flint glass gradient - warmer amber tones */}
            <linearGradient id="chromFlintGlass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(217, 119, 6, 0.1)" />
              <stop offset="25%" stopColor="rgba(251, 191, 36, 0.3)" />
              <stop offset="50%" stopColor="rgba(253, 224, 71, 0.4)" />
              <stop offset="75%" stopColor="rgba(251, 191, 36, 0.3)" />
              <stop offset="100%" stopColor="rgba(217, 119, 6, 0.1)" />
            </linearGradient>

            {/* Flint glass radial highlight */}
            <radialGradient id="chromFlintHighlight" cx="70%" cy="30%" r="60%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.3)" />
              <stop offset="40%" stopColor="rgba(253, 224, 71, 0.1)" />
              <stop offset="100%" stopColor="rgba(251, 191, 36, 0)" />
            </radialGradient>

            {/* White light source gradient */}
            <radialGradient id="chromWhiteLight" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#f8fafc" />
              <stop offset="70%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
            </radialGradient>

            {/* Spectrum gradient for wavelength bar */}
            <linearGradient id="chromSpectrumBar" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={defined.colors.spectrum.red} />
              <stop offset="17%" stopColor={defined.colors.spectrum.orange} />
              <stop offset="33%" stopColor={defined.colors.spectrum.yellow} />
              <stop offset="50%" stopColor={defined.colors.spectrum.green} />
              <stop offset="67%" stopColor={defined.colors.spectrum.cyan} />
              <stop offset="83%" stopColor={defined.colors.spectrum.blue} />
              <stop offset="100%" stopColor={defined.colors.spectrum.violet} />
            </linearGradient>

            {/* Correction indicator gradients */}
            <linearGradient id="chromCorrectedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>

            <linearGradient id="chromUncorrectedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f87171" />
            </linearGradient>

            {/* Ray glow filter - premium light effect */}
            <filter id="chromRayGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Intense glow for white light source */}
            <filter id="chromSourceGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur1" />
              <feGaussianBlur stdDeviation="12" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Focal point glow */}
            <filter id="chromFocalGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Lens edge highlight filter */}
            <filter id="chromLensGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle inner shadow for depth */}
            <filter id="chromInnerShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Premium dark background with gradient */}
          <rect width={width} height={height} fill="url(#chromBgGrad)" rx="16" />

          {/* Subtle grid pattern for lab feel */}
          <defs>
            <pattern id="chromLabGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <rect width="30" height="30" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.4" />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#chromLabGrid)" rx="16" opacity="0.5" />

          {/* Optical axis - dashed line */}
          <line
            x1="25"
            y1={lensY}
            x2={width - 25}
            y2={lensY}
            stroke="#475569"
            strokeWidth="1"
            strokeDasharray="8,4"
            opacity="0.6"
          />

          {/* Grid lines for reference */}
          {[0.25, 0.5, 0.75].map((frac) => (
            <line key={`vgrid-${frac}`} x1={width * frac} y1={30} x2={width * frac} y2={height - 60} stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
          ))}
          {[0.25, 0.5, 0.75].map((frac) => (
            <line key={`hgrid-${frac}`} x1={30} y1={height * frac} x2={width - 30} y2={height * frac} stroke="#475569" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
          ))}

          {/* Axis labels */}
          <text x={width / 2} y={height - 70} fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="middle">Wavelength (nm)</text>
          <text x={12} y={38} fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="start">Distance</text>

          {/* Interactive focal point indicator - moves with slider */}
          <circle
            cx={Math.min(focalPoints[3].x, width - 40)}
            cy={lensY}
            r={8}
            fill={defined.colors.spectrum.green}
            filter="url(#chromFocalGlow)"
            stroke="#fff"
            strokeWidth={2}
            opacity="0.95"
          />

          {/* ============ WHITE LIGHT SOURCE ============ */}
          <g>
            {/* Outer glow rings */}
            <circle cx={rayStartX} cy={rayY} r="22" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <circle cx={rayStartX} cy={rayY} r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

            {/* Main light source with intense glow */}
            <circle cx={rayStartX} cy={rayY} r="16" fill="url(#chromWhiteLight)" filter="url(#chromSourceGlow)" />
            <circle cx={rayStartX} cy={rayY} r="10" fill="white" />
            <circle cx={rayStartX} cy={rayY} r="5" fill="white" opacity="0.9" />

            {/* Rainbow corona around source */}
            {wavelengths.map((wl, i) => (
              <circle
                key={`corona-${wl.name}`}
                cx={rayStartX}
                cy={rayY}
                r={18 + i * 1.5}
                fill="none"
                stroke={wl.color}
                strokeWidth="0.8"
                opacity={0.3 - i * 0.03}
              />
            ))}
          </g>

          {/* ============ LENS SYSTEM ============ */}
          {useDoublet ? (
            <g>
              {/* Crown glass (converging lens) - biconvex shape */}
              <ellipse
                cx={lensX - 10}
                cy={lensY}
                rx={14 + lensCurvature * 0.08}
                ry={lensHeight / 2}
                fill="url(#chromCrownGlass)"
                stroke="rgba(96, 165, 250, 0.6)"
                strokeWidth="1.5"
                filter="url(#chromLensGlow)"
              />
              {/* Crown glass highlight overlay */}
              <ellipse
                cx={lensX - 12}
                cy={lensY - 10}
                rx={10 + lensCurvature * 0.06}
                ry={lensHeight / 2.5}
                fill="url(#chromCrownHighlight)"
              />

              {/* Flint glass (diverging lens) - meniscus shape */}
              <path
                d={`M ${lensX + 6} ${lensY - lensHeight / 2}
                    Q ${lensX - 4} ${lensY} ${lensX + 6} ${lensY + lensHeight / 2}
                    L ${lensX + 20} ${lensY + lensHeight / 2}
                    Q ${lensX + 10} ${lensY} ${lensX + 20} ${lensY - lensHeight / 2}
                    Z`}
                fill="url(#chromFlintGlass)"
                stroke="rgba(251, 191, 36, 0.6)"
                strokeWidth="1.5"
                filter="url(#chromLensGlow)"
              />
              {/* Flint glass highlight */}
              <path
                d={`M ${lensX + 12} ${lensY - lensHeight / 3}
                    Q ${lensX + 6} ${lensY - 10} ${lensX + 12} ${lensY + lensHeight / 4}`}
                fill="none"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Cement line between lenses */}
              <line
                x1={lensX + 3}
                y1={lensY - lensHeight / 2 + 5}
                x2={lensX + 3}
                y2={lensY + lensHeight / 2 - 5}
                stroke="rgba(148, 163, 184, 0.4)"
                strokeWidth="1"
                strokeDasharray="3,2"
              />
            </g>
          ) : (
            <g>
              {/* Simple biconvex lens with glass refraction effect */}
              <ellipse
                cx={lensX}
                cy={lensY}
                rx={10 + lensCurvature * 0.12}
                ry={lensHeight / 2}
                fill="url(#chromCrownGlass)"
                stroke="rgba(99, 102, 241, 0.5)"
                strokeWidth="2"
                filter="url(#chromLensGlow)"
              />
              {/* Glass highlight for 3D effect */}
              <ellipse
                cx={lensX - 3}
                cy={lensY - 15}
                rx={6 + lensCurvature * 0.08}
                ry={lensHeight / 2.8}
                fill="url(#chromCrownHighlight)"
              />
              {/* Edge refraction lines */}
              <ellipse
                cx={lensX}
                cy={lensY}
                rx={10 + lensCurvature * 0.12}
                ry={lensHeight / 2}
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="1"
              />
            </g>
          )}

          {/* ============ COLOR SEPARATION RAYS ============ */}
          {showAllWavelengths ? (
            wavelengths.map((wl, i) => {
              const focalX = Math.min(focalPoints[i].x, width - 40);
              const yOffset = (i - 3) * 3.5;
              const lensHitY = lensY + yOffset * 2;

              // Animated light pulse
              const pulseProgress = ((animationFrame / 360) + i * 0.12) % 1;
              const incomingPulseX = rayStartX + 18 + pulseProgress * (lensX - rayStartX - 35);
              const outgoingPulseProgress = ((animationFrame / 360) + i * 0.12 + 0.3) % 1;

              return (
                <g key={wl.name}>
                  {/* Incoming white light ray segment (colored for visualization) */}
                  <line
                    x1={rayStartX + 16}
                    y1={rayY}
                    x2={lensX - (useDoublet ? 24 : 12)}
                    y2={lensHitY}
                    stroke={wl.color}
                    strokeWidth="2.5"
                    opacity="0.7"
                  />

                  {/* Refracted ray after lens - with glow */}
                  <line
                    x1={lensX + (useDoublet ? 22 : 12)}
                    y1={lensHitY}
                    x2={focalX}
                    y2={lensY}
                    stroke={wl.color}
                    strokeWidth="2.5"
                    opacity="0.85"
                    filter="url(#chromRayGlow)"
                  />

                  {/* Ray continuation past focal point (dimmer) */}
                  <line
                    x1={focalX}
                    y1={lensY}
                    x2={focalX + 35}
                    y2={lensY + (i - 3) * 4}
                    stroke={wl.color}
                    strokeWidth="1.5"
                    opacity="0.3"
                  />

                  {/* Focal point marker with glow */}
                  <circle
                    cx={focalX}
                    cy={lensY}
                    r="6"
                    fill={wl.color}
                    filter="url(#chromFocalGlow)"
                    opacity="0.9"
                  />
                  <circle cx={focalX} cy={lensY} r="3" fill="white" opacity="0.6" />

                  {/* Animated photon pulse on incoming ray */}
                  {pulseProgress < 0.7 && (
                    <circle
                      cx={incomingPulseX}
                      cy={rayY + yOffset * (pulseProgress * 2)}
                      r="5"
                      fill={wl.color}
                      opacity={0.9 - pulseProgress}
                      filter="url(#chromRayGlow)"
                    />
                  )}

                  {/* Animated photon pulse on outgoing ray */}
                  {outgoingPulseProgress > 0.2 && outgoingPulseProgress < 0.9 && (
                    <circle
                      cx={lensX + (useDoublet ? 22 : 12) + (outgoingPulseProgress - 0.2) * (focalX - lensX - 30)}
                      cy={lensHitY - (outgoingPulseProgress - 0.2) * yOffset * 1.5}
                      r="4"
                      fill={wl.color}
                      opacity={0.8 - (outgoingPulseProgress - 0.2)}
                      filter="url(#chromRayGlow)"
                    />
                  )}
                </g>
              );
            })
          ) : (
            // Single wavelength mode
            (() => {
              const wl = wavelengths[selectedWavelength];
              const focalX = Math.min(focalPoints[selectedWavelength].x, width - 40);

              return (
                <g>
                  {/* Incoming ray - thicker for single wavelength */}
                  <line
                    x1={rayStartX + 16}
                    y1={rayY}
                    x2={lensX - (useDoublet ? 24 : 12)}
                    y2={lensY}
                    stroke={wl.color}
                    strokeWidth="4"
                    opacity="0.8"
                  />
                  {/* Refracted ray */}
                  <line
                    x1={lensX + (useDoublet ? 22 : 12)}
                    y1={lensY}
                    x2={focalX}
                    y2={lensY}
                    stroke={wl.color}
                    strokeWidth="4"
                    opacity="0.9"
                    filter="url(#chromRayGlow)"
                  />
                  {/* Focal point with enhanced glow */}
                  <circle cx={focalX} cy={lensY} r="12" fill={wl.color} filter="url(#chromFocalGlow)" opacity="0.8" />
                  <circle cx={focalX} cy={lensY} r="6" fill="white" opacity="0.7" />
                </g>
              );
            })()
          )}

          {/* ============ FOCAL SPREAD INDICATOR ============ */}
          {showAllWavelengths && (
            <g>
              {/* Focal region bracket */}
              <line
                x1={Math.min(...focalPoints.map(f => Math.min(f.x, width - 40)))}
                y1={lensY + 55}
                x2={Math.max(...focalPoints.map(f => Math.min(f.x, width - 40)))}
                y2={lensY + 55}
                stroke={useDoublet ? 'url(#chromCorrectedGrad)' : 'url(#chromUncorrectedGrad)'}
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* End caps */}
              <line
                x1={Math.min(...focalPoints.map(f => Math.min(f.x, width - 40)))}
                y1={lensY + 48}
                x2={Math.min(...focalPoints.map(f => Math.min(f.x, width - 40)))}
                y2={lensY + 62}
                stroke={useDoublet ? '#10b981' : '#ef4444'}
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1={Math.max(...focalPoints.map(f => Math.min(f.x, width - 40)))}
                y1={lensY + 48}
                x2={Math.max(...focalPoints.map(f => Math.min(f.x, width - 40)))}
                y2={lensY + 62}
                stroke={useDoublet ? '#10b981' : '#ef4444'}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* ============ WAVELENGTH SPECTRUM BAR ============ */}
          <g>
            {/* Background panel */}
            <rect
              x="15"
              y={height - 65}
              width={width - 30}
              height="50"
              fill="rgba(15, 23, 42, 0.85)"
              rx="8"
              stroke="rgba(71, 85, 105, 0.4)"
              strokeWidth="1"
            />

            {/* Spectrum gradient bar */}
            <rect
              x="30"
              y={height - 53}
              width={width - 60}
              height="8"
              fill="url(#chromSpectrumBar)"
              rx="4"
            />

            {/* Individual wavelength markers */}
            {wavelengths.map((wl, i) => {
              const xPos = 30 + (i / (wavelengths.length - 1)) * (width - 70);
              return (
                <g key={wl.name}>
                  <circle cx={xPos} cy={height - 49} r="5" fill={wl.color} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                  <text x={xPos} y={height - 29} fill={defined.colors.text.muted} fontSize="11" textAnchor="middle">
                    {wl.wavelength}nm
                  </text>
                </g>
              );
            })}
          </g>

          {/* ============ CORRECTION STATUS INDICATOR ============ */}
          <g>
            <rect
              x={width - 103}
              y="10"
              width="88"
              height="28"
              fill={useDoublet ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}
              rx="6"
              stroke={useDoublet ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}
              strokeWidth="1"
            />
            <circle
              cx={width - 89}
              cy="24"
              r="5"
              fill={useDoublet ? '#10b981' : '#ef4444'}
            />
            <text
              x={width - 77}
              y="28"
              fill={useDoublet ? '#34d399' : '#f87171'}
              fontSize="11"
              fontWeight="600"
            >
              {correctionLevel}
            </text>
          </g>
        </svg>

        {/* External Labels - Using typo system */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          maxWidth: `${width}px`,
          padding: `0 ${defined.spacing.sm}`,
        }}>
          {useDoublet && (
            <div style={{ display: 'flex', gap: defined.spacing.md, fontSize: typo.small }}>
              <span style={{ color: defined.colors.spectrum.blue }}>Crown Glass</span>
              <span style={{ color: defined.colors.text.muted }}>+</span>
              <span style={{ color: defined.colors.accent }}>Flint Glass</span>
            </div>
          )}
          {!useDoublet && (
            <span style={{ color: '#e2e8f0', fontSize: typo.small }}>
              Curvature affects dispersion
            </span>
          )}
          {showAllWavelengths && (
            <span style={{
              color: useDoublet ? defined.colors.success : defined.colors.error,
              fontSize: typo.small,
              fontWeight: defined.typography.weights.medium,
            }}>
              Focal Spread: {useDoublet ? 'Minimized' : `${Math.round(focalSpread)}px`}
            </span>
          )}
          {!showAllWavelengths && (
            <span style={{
              color: wavelengths[selectedWavelength].color,
              fontSize: typo.small,
              fontWeight: defined.typography.weights.medium,
            }}>
              {wavelengths[selectedWavelength].name} ({wavelengths[selectedWavelength].wavelength}nm)
            </span>
          )}
        </div>

        {/* Controls */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: defined.spacing.md,
          width: '100%',
          maxWidth: `${width}px`,
        }}>
          <div style={{
            background: defined.colors.background.card,
            padding: defined.spacing.md,
            borderRadius: defined.radius.lg,
            border: '1px solid rgba(71, 85, 105, 0.3)',
          }}>
            <label style={{
              color: '#e2e8f0',
              fontSize: typo.small,
              display: 'block',
              marginBottom: '6px',
              fontWeight: defined.typography.weights.medium,
            }}>
              Lens Curvature: {lensCurvature}%
            </label>
            <input
              type="range"
              min="20"
              max="100"
              value={lensCurvature}
              onChange={(e) => setLensCurvature(Number(e.target.value))}
              style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as const, accentColor: '#3b82f6' }}
            />
            <div style={{ color: '#e2e8f0', fontSize: typo.label, marginTop: '4px' }}>
              Higher curvature = more dispersion
            </div>
          </div>
          <div style={{
            background: defined.colors.background.card,
            padding: defined.spacing.md,
            borderRadius: defined.radius.lg,
            border: '1px solid rgba(71, 85, 105, 0.3)',
          }}>
            <label style={{
              color: defined.colors.text.secondary,
              fontSize: typo.small,
              display: 'block',
              marginBottom: '8px',
              fontWeight: defined.typography.weights.medium,
            }}>
              Wavelength Selection
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => setShowAllWavelengths(true)}
                style={{
                  padding: '6px 12px',
                  background: showAllWavelengths
                    ? `linear-gradient(135deg, ${defined.colors.primary}, ${defined.colors.secondary})`
                    : defined.colors.background.tertiary,
                  color: defined.colors.text.primary,
                  border: 'none',
                  borderRadius: defined.radius.sm,
                  fontSize: typo.label,
                  cursor: 'pointer',
                  fontWeight: defined.typography.weights.medium,
                }}
              >
                All Colors
              </button>
              {wavelengths.map((wl, i) => (
                <button
                  key={wl.name}
                  onClick={() => {
                    setShowAllWavelengths(false);
                    setSelectedWavelength(i);
                  }}
                  title={`${wl.name} (${wl.wavelength}nm)`}
                  style={{
                    width: '24px',
                    height: '24px',
                    background: !showAllWavelengths && selectedWavelength === i
                      ? wl.color
                      : defined.colors.background.tertiary,
                    border: `2px solid ${wl.color}`,
                    borderRadius: defined.radius.full,
                    cursor: 'pointer',
                    boxShadow: !showAllWavelengths && selectedWavelength === i
                      ? `0 0 8px ${wl.color}`
                      : 'none',
                    transition: 'box-shadow 0.2s ease',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Doublet toggle - premium styling */}
        <button
          onClick={() => setUseDoublet(!useDoublet)}
          style={{
            padding: `${defined.spacing.sm} ${defined.spacing.xl}`,
            minHeight: '44px',
            background: useDoublet
              ? `linear-gradient(135deg, ${defined.colors.success}, #059669)`
              : defined.colors.background.tertiary,
            color: defined.colors.text.primary,
            border: useDoublet
              ? 'none'
              : `2px solid ${defined.colors.primary}`,
            borderRadius: defined.radius.lg,
            cursor: 'pointer',
            fontSize: typo.body,
            fontWeight: defined.typography.weights.semibold,
            boxShadow: useDoublet
              ? `0 4px 15px rgba(16, 185, 129, 0.3)`
              : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          {useDoublet ? 'Achromatic Doublet (Corrected)' : 'Simple Lens (Uncorrected)'}
        </button>
      </div>
    );
  }, [isMobile, lensCurvature, showAllWavelengths, selectedWavelength, useDoublet, animationFrame, getFocalPoint, typo]);

  // =============================================================================
  // TEST QUESTIONS - SCENARIO-BASED MULTIPLE CHOICE
  // =============================================================================
  const testQuestions = [
    {
      scenario: "A photographer notices that white light passing through a simple glass lens separates into different colors, with each color focusing at a slightly different distance from the lens.",
      question: "What fundamental property of glass causes this color separation phenomenon?",
      options: [
        { id: 'a', label: "Glass absorbs certain wavelengths more than others", correct: false },
        { id: 'b', label: "The refractive index of glass varies with wavelength (dispersion)", correct: true },
        { id: 'c', label: "Glass reflects shorter wavelengths back toward the source", correct: false },
        { id: 'd', label: "Air gaps between glass molecules scatter light randomly", correct: false },
      ],
      explanation: "Glass exhibits dispersion, meaning its refractive index depends on the wavelength of light. Shorter wavelengths (blue/violet) have a higher refractive index and bend more than longer wavelengths (red). This wavelength-dependent refraction is described by Cauchy's equation: n(λ) = A + B/λ² + C/λ⁴, where shorter λ yields higher n.",
    },
    {
      scenario: "A wildlife photographer reviewing their images notices purple and green fringes around tree branches photographed against a bright sky, especially toward the edges of the frame.",
      question: "Why does this color fringing appear most prominently at high-contrast edges near the frame's periphery?",
      options: [
        { id: 'a', label: "The camera sensor has defective pixels at the edges", correct: false },
        { id: 'b', label: "Light rays hit the lens at steeper angles at the edges, amplifying chromatic aberration", correct: true },
        { id: 'c', label: "The lens coating wears off faster at the edges", correct: false },
        { id: 'd', label: "The image processor applies less correction at frame edges", correct: false },
      ],
      explanation: "Chromatic aberration is most visible at high-contrast boundaries where misaligned color channels create visible fringes. The effect worsens toward frame edges because peripheral rays strike the lens at oblique angles, experiencing greater refraction differences between wavelengths. This is why fast wide-angle lenses require more complex optical designs.",
    },
    {
      scenario: "An optical engineer is designing a telescope objective lens and decides to cement together a biconvex crown glass element (Abbe number ~60) with a plano-concave flint glass element (Abbe number ~30).",
      question: "How does this achromatic doublet design reduce chromatic aberration?",
      options: [
        { id: 'a', label: "The two lenses cancel all refraction, producing parallel light", correct: false },
        { id: 'b', label: "The high-dispersion flint element's divergence counteracts the crown's color spread while preserving net convergence", correct: true },
        { id: 'c', label: "The cement between the lenses filters out problematic wavelengths", correct: false },
        { id: 'd', label: "Flint glass converts chromatic aberration into spherical aberration", correct: false },
      ],
      explanation: "An achromatic doublet pairs a converging crown glass lens (low dispersion, high Abbe number) with a diverging flint glass lens (high dispersion, low Abbe number). Because flint glass disperses light more strongly per unit of refractive power, a weaker diverging flint element can cancel the color spread of the crown element without canceling all its focusing power. The result is a net converging lens that brings two wavelengths (typically red and blue) to a common focus.",
    },
    {
      scenario: "An amateur astronomer is choosing between two refractor telescopes: one with a standard achromatic doublet objective and one with an apochromatic triplet using ED (extra-low dispersion) glass.",
      question: "What advantage does the apochromatic design offer for planetary observation?",
      options: [
        { id: 'a', label: "It gathers more light, making planets appear brighter", correct: false },
        { id: 'b', label: "It brings three wavelengths to a common focus, virtually eliminating residual color fringing", correct: true },
        { id: 'c', label: "It magnifies images more than achromatic designs", correct: false },
        { id: 'd', label: "It automatically tracks celestial objects", correct: false },
      ],
      explanation: "While achromatic doublets bring two wavelengths to a common focus, they leave residual 'secondary spectrum' (typically a purple halo around bright objects). Apochromatic lenses use three or more elements with special glasses (like ED or fluorite) to bring three wavelengths to a common focus, dramatically reducing secondary spectrum. This produces crisper, more color-accurate planetary images with minimal false color around limbs and details.",
    },
    {
      scenario: "An ophthalmology student learns that the human eye has significant chromatic aberration—about 2 diopters difference between red and blue focus—yet we don't normally see colored fringes around objects.",
      question: "What primary mechanism allows humans to perceive sharp images despite ocular chromatic aberration?",
      options: [
        { id: 'a', label: "The cornea contains special proteins that correct chromatic aberration", correct: false },
        { id: 'b', label: "The brain's visual processing filters out chromatic blur and the eye focuses yellow-green light on the fovea", correct: true },
        { id: 'c', label: "Tears form a corrective liquid lens over the eye", correct: false },
        { id: 'd', label: "The iris blocks peripheral light rays that would cause aberration", correct: false },
      ],
      explanation: "The human visual system compensates for chromatic aberration through multiple mechanisms. The eye's accommodation system focuses yellow-green light (peak sensitivity ~555nm) on the fovea, leaving red slightly behind and blue slightly in front. The brain's visual cortex then performs sophisticated processing to suppress awareness of chromatic blur. Additionally, the fovea's cone density and the eye's small pupil in bright light naturally reduce the visible effects of chromatic aberration.",
    },
    {
      scenario: "A lens designer is creating a premium apochromatic lens for astrophotography. They're considering adding a fourth element made of fluorite crystal (calcium fluoride) to the three-element design.",
      question: "What unique optical property makes fluorite valuable for advanced chromatic correction?",
      options: [
        { id: 'a', label: "Fluorite has the highest refractive index of any optical material", correct: false },
        { id: 'b', label: "Fluorite exhibits anomalous partial dispersion, allowing correction of secondary spectrum", correct: true },
        { id: 'c', label: "Fluorite is completely colorless, unlike regular glass", correct: false },
        { id: 'd', label: "Fluorite amplifies certain wavelengths to compensate for absorption", correct: false },
      ],
      explanation: "Fluorite and certain ED glasses exhibit 'anomalous partial dispersion'—their dispersion characteristics deviate from the normal relationship between Abbe number and partial dispersion found in conventional glasses. This allows lens designers to correct secondary spectrum (the residual color error in achromatic doublets) that cannot be eliminated using only normal glasses. Fluorite's position on the partial dispersion diagram enables superachromatic designs approaching diffraction-limited performance across the visible spectrum.",
    },
    {
      scenario: "A research biologist is selecting a microscope objective for fluorescence imaging. They must choose between a plan-achromat (2 wavelengths corrected) and a plan-apochromat (3+ wavelengths corrected) objective, both at 60x magnification.",
      question: "Why is the plan-apochromat objective essential for accurate multi-channel fluorescence microscopy?",
      options: [
        { id: 'a', label: "It produces brighter images due to larger aperture", correct: false },
        { id: 'b', label: "It ensures different fluorescent emission wavelengths focus in the same plane, enabling accurate colocalization", correct: true },
        { id: 'c', label: "It eliminates the need for emission filters", correct: false },
        { id: 'd', label: "It prevents photobleaching of fluorescent samples", correct: false },
      ],
      explanation: "In multi-channel fluorescence microscopy, researchers image the same sample using different fluorophores that emit at different wavelengths (e.g., blue DAPI, green GFP, red mCherry). With a plan-achromat objective, these wavelengths focus at slightly different planes, causing apparent shifts in structure positions between channels. Plan-apochromat objectives correct chromatic aberration across the visible spectrum, ensuring all fluorescent channels focus precisely in the same plane—critical for accurate colocalization studies determining whether proteins interact or structures overlap.",
    },
    {
      scenario: "An optician is helping a patient with a -8.00 diopter prescription choose between standard polycarbonate lenses (Abbe number 30) and higher-cost CR-39 plastic lenses (Abbe number 58).",
      question: "Why might the CR-39 lenses provide better visual comfort despite being thicker and heavier?",
      options: [
        { id: 'a', label: "CR-39 blocks more UV radiation than polycarbonate", correct: false },
        { id: 'b', label: "CR-39's higher Abbe number means less chromatic aberration and reduced color fringing in peripheral vision", correct: true },
        { id: 'c', label: "CR-39 has better scratch resistance than polycarbonate", correct: false },
        { id: 'd', label: "CR-39 lenses are easier to clean and maintain", correct: false },
      ],
      explanation: "The Abbe number (V-number) quantifies a material's dispersion—higher values indicate less chromatic aberration. Strong prescriptions require thick lenses where peripheral viewing involves rays at steep angles, amplifying chromatic effects. Polycarbonate's low Abbe number (30) can produce noticeable color fringes when looking through lens peripheries, causing visual discomfort. CR-39's Abbe number of 58 produces roughly half the chromatic aberration, making it preferable for high prescriptions despite being thicker. This is why premium high-index materials emphasize Abbe number alongside refractive index.",
    },
    {
      scenario: "A software engineer is developing an automatic chromatic aberration correction algorithm for a smartphone camera app. They notice the aberration pattern differs between the center and edges of images.",
      question: "What optical phenomenon must their algorithm account for that causes this position-dependent aberration pattern?",
      options: [
        { id: 'a', label: "Sensor pixel size varies across the chip", correct: false },
        { id: 'b', label: "Lateral chromatic aberration shifts colors sideways by increasing amounts toward frame edges", correct: true },
        { id: 'c', label: "The lens aperture shape changes with field position", correct: false },
        { id: 'd', label: "Digital noise increases toward image edges", correct: false },
      ],
      explanation: "Chromatic aberration has two components: longitudinal (axial) and lateral (transverse). Longitudinal CA causes colors to focus at different distances along the optical axis, producing color fringes everywhere. Lateral CA causes different wavelengths to be magnified differently, shifting colors perpendicular to the optical axis. Lateral CA is zero at the image center (on-axis) and increases toward edges, creating position-dependent color shifts. Effective digital correction must model this radial variation, typically using polynomial functions calibrated to the specific lens profile.",
    },
    {
      scenario: "A physics student is analyzing why a prism creates a broader spectrum than a simple lens. Both are made of the same BK7 glass, but the prism spreads colors across a 4-degree arc while the lens only shows subtle focal differences.",
      question: "What geometric factor explains why prisms produce more dramatic visible dispersion than lenses?",
      options: [
        { id: 'a', label: "Prisms use higher-quality glass with more dispersion", correct: false },
        { id: 'b', label: "Prisms refract light at two non-parallel surfaces, accumulating angular deviation that separates into a spatial spread", correct: true },
        { id: 'c', label: "Prisms absorb some wavelengths, making others more visible", correct: false },
        { id: 'd', label: "Light travels farther through prisms, increasing wavelength separation", correct: false },
      ],
      explanation: "While both prisms and lenses exhibit the same wavelength-dependent refractive index, their geometry produces different effects. A prism's non-parallel faces cause light to deviate from its original path, with different wavelengths deviating by different amounts—this angular dispersion spreads into visible spatial separation. Lenses have curved surfaces designed so rays converge (or diverge) rather than deviate, converting dispersion into focal length differences. The prism's design intentionally maximizes angular separation while lens design minimizes it, though cannot eliminate it entirely—hence chromatic aberration.",
    },
  ];

  // =============================================================================
  // REAL-WORLD APPLICATIONS - Comprehensive industry applications
  // =============================================================================
  const realWorldApps = [
    {
      icon: "📷",
      title: "Camera Lens Design",
      short: "Photography",
      tagline: "Capturing crisp, color-accurate images across the frame",
      description: "Professional camera lenses are marvels of optical engineering, employing multiple glass elements with carefully selected dispersive properties to minimize chromatic aberration. Modern lenses use 10-20 elements including ED (Extra-low Dispersion) glass, aspherical surfaces, and fluorite crystals to ensure that red, green, and blue light all focus at precisely the same point. Without these corrections, every photograph would show colored fringes around high-contrast edges, making sharp images impossible.",
      connection: "Just as we observed different wavelengths focusing at different distances in our simulation, camera designers must counteract this same dispersion effect. The achromatic doublet principle—pairing crown and flint glass—is the foundation of every quality lens, from smartphones to cinema cameras.",
      howItWorks: "Lens designers use ray tracing software to model how thousands of light rays of different wavelengths traverse each lens element. By selecting glass types with complementary dispersion curves and precisely calculating element curvatures, they create systems where the focal point spread across the visible spectrum is minimized. ED glass elements provide anomalous dispersion that cancels residual color errors that normal glass combinations cannot eliminate.",
      stats: [
        { val: "15+", label: "Elements in premium zoom lenses" },
        { val: "< 1μm", label: "Focus accuracy across wavelengths" },
        { val: "$15B", label: "Annual camera lens market" }
      ],
      examples: [
        "Professional DSLR and mirrorless camera lenses",
        "Smartphone camera modules with ED elements",
        "Cinema lenses for film and television production",
        "Machine vision lenses for industrial inspection"
      ],
      companies: ["Canon", "Nikon", "Sony", "ZEISS", "Leica"],
      futureImpact: "Computational photography is revolutionizing lens design by allowing software correction of residual chromatic aberration. AI-powered algorithms can now remove color fringing in real-time, enabling smaller, lighter lens designs that rely on digital correction for perfection. Metalenses—flat optical elements using nanoscale structures—promise to eliminate chromatic aberration entirely through wavelength-independent focusing.",
      color: "#6366F1"
    },
    {
      icon: "🔭",
      title: "Telescope Optics",
      short: "Astronomy",
      tagline: "Revealing the universe with optical precision",
      description: "Astronomical telescopes demand the highest optical quality because they must resolve faint, distant objects across the entire visible spectrum and beyond. Refracting telescopes use achromatic or apochromatic objective lenses to bring starlight to a common focus, while reflecting telescopes (using mirrors) avoid chromatic aberration entirely since reflection angles don't depend on wavelength. The largest ground-based telescopes all use mirrors precisely because eliminating chromatic aberration in large refracting elements is prohibitively difficult and expensive.",
      connection: "Our simulation showed how a simple lens creates a 'spectrum' of focal points. For astronomers, this would mean blurry, rainbow-fringed images of stars and planets. The achromatic doublet we explored is exactly what 18th-century astronomers invented to solve this problem, revolutionizing our view of the cosmos.",
      howItWorks: "Refractor telescopes use crown-flint achromatic doublets for cost-effective instruments, or triplet and quadruplet apochromatic designs using fluorite or ED glass for premium visual and photographic performance. Reflector telescopes use parabolic or hyperbolic mirrors coated with aluminum or silver, which reflect all wavelengths identically. Modern professional observatories use segmented mirror arrays with adaptive optics that correct for atmospheric distortion in real-time.",
      stats: [
        { val: "10.4m", label: "Largest single-mirror telescope (GTC)" },
        { val: "0.001°", label: "Color correction in APO refractors" },
        { val: "39m", label: "Planned ELT mirror diameter" }
      ],
      examples: [
        "Apochromatic refractors for planetary observation",
        "Newtonian reflectors for deep-sky imaging",
        "Space telescopes like Hubble and James Webb",
        "Amateur telescopes with ED glass objectives"
      ],
      companies: ["Celestron", "Sky-Watcher", "Takahashi", "Tele Vue", "Meade"],
      futureImpact: "Next-generation extremely large telescopes (ELTs) will use segmented mirrors spanning 30-40 meters, capable of directly imaging exoplanets around nearby stars. Space-based interferometers will link multiple telescopes to achieve angular resolutions impossible for single apertures. These systems will search for biosignatures in exoplanet atmospheres, potentially answering whether we are alone in the universe.",
      color: "#3B82F6"
    },
    {
      icon: "👓",
      title: "Eyeglasses and Vision Correction",
      short: "Optometry",
      tagline: "Clear vision through optimized optical materials",
      description: "Prescription eyeglasses must correct refractive errors while minimizing chromatic aberration that causes visual discomfort. The Abbe number—a measure of a material's dispersion—is a critical specification when selecting lens materials. High-index plastics that make thin, lightweight lenses often have low Abbe numbers, producing noticeable color fringes in peripheral vision. Optometrists must balance aesthetics (thin lenses) against optical quality (high Abbe number) for each patient's prescription strength and visual demands.",
      connection: "The wavelength-dependent refraction we explored directly affects everyday vision through glasses. When looking through the edge of a strong prescription lens at a steep angle, different colors focus at different points on the retina, just like in our simulation—creating the rainbow fringes some glasses wearers experience.",
      howItWorks: "Lens material selection balances refractive index (higher = thinner lens), Abbe number (higher = less chromatic aberration), specific gravity (lower = lighter), and impact resistance. CR-39 plastic (Abbe ~58) offers excellent optics but produces thick lenses for strong prescriptions. Polycarbonate (Abbe ~30) is thin and impact-resistant but produces more color fringing. Premium materials like Trivex (Abbe ~43) and high-index glasses attempt to optimize all properties simultaneously.",
      stats: [
        { val: "75%", label: "Of adults need vision correction" },
        { val: "58", label: "CR-39 Abbe number (excellent)" },
        { val: "30", label: "Polycarbonate Abbe number (lower)" }
      ],
      examples: [
        "High-prescription single vision lenses",
        "Progressive multifocal lenses",
        "Sports eyewear with impact-resistant materials",
        "Computer glasses optimized for intermediate distance"
      ],
      companies: ["Essilor", "ZEISS", "Hoya", "Rodenstock"],
      futureImpact: "Smart glasses incorporating AR displays will require optical systems that project digital information while maintaining natural vision quality. Liquid crystal lenses with electronically adjustable focal length may eliminate the need for progressive lenses. Advanced materials combining high refractive index with high Abbe numbers will enable ultra-thin lenses without optical compromises.",
      color: "#10B981"
    },
    {
      icon: "🔬",
      title: "Microscope Objectives",
      short: "Scientific Imaging",
      tagline: "Revealing the microscopic world in true color",
      description: "Research microscopes require objectives that maintain chromatic correction while achieving extreme magnification and resolution. Plan-apochromat objectives—the gold standard for scientific imaging—correct chromatic aberration for three or more wavelengths while also flattening field curvature across the entire field of view. These complex optical systems may contain 15+ lens elements and cost more than entire entry-level microscopes, but they're essential for accurate fluorescence imaging where different cellular components are labeled with dyes emitting at different wavelengths.",
      connection: "Our simulation demonstrated how uncorrected lenses create focus errors between colors. In fluorescence microscopy, this would cause apparent shifts between structures labeled with different colored dyes, leading researchers to false conclusions about whether proteins colocalize or structures overlap—the stakes of chromatic aberration in science are real discoveries.",
      howItWorks: "Microscope objectives are classified by chromatic correction level: achromats (2 wavelengths), semi-apochromats/fluorites (partial correction), and apochromats (3+ wavelengths). The 'plan' prefix indicates correction for field curvature. Objectives are designed for specific tube lens focal lengths, cover slip thicknesses, and immersion media (air, water, oil). Oil immersion objectives must also correct for the optical properties of the immersion medium between the lens and specimen.",
      stats: [
        { val: "100x", label: "Maximum useful magnification" },
        { val: "1.4 NA", label: "Oil immersion numerical aperture" },
        { val: "$5,000+", label: "Cost of premium plan-apo objectives" }
      ],
      examples: [
        "Confocal fluorescence microscopy for cell biology",
        "Pathology microscopes for medical diagnosis",
        "Semiconductor inspection systems",
        "Super-resolution microscopy for nanoscale imaging"
      ],
      companies: ["Olympus", "Nikon Instruments", "ZEISS Microscopy", "Leica Microsystems"],
      futureImpact: "Adaptive optics originally developed for astronomy are being integrated into microscopes to correct aberrations introduced by thick biological specimens. AI-powered deconvolution algorithms can computationally reverse the effects of residual aberrations. New super-resolution techniques are pushing microscopy beyond the diffraction limit, requiring even more precise chromatic correction to achieve nanometer-scale accuracy.",
      color: "#F59E0B"
    }
  ];

  // =============================================================================
  // PHASE RENDERERS
  // =============================================================================
  const renderHook = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      textAlign: 'center',
      padding: defined.spacing.lg,
    }}>
      <div style={{
        background: 'rgba(99, 102, 241, 0.1)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: defined.radius.full,
        padding: `${defined.spacing.sm} ${defined.spacing.md}`,
        marginBottom: defined.spacing.lg,
      }}>
        <span style={{ color: defined.colors.primary, fontSize: defined.typography.sizes.sm }}>LENS PHYSICS</span>
      </div>

      <h1 style={{
        fontSize: isMobile ? defined.typography.sizes['2xl'] : defined.typography.sizes['3xl'],
        fontWeight: defined.typography.weights.bold,
        color: defined.colors.text.primary,
        marginBottom: defined.spacing.md,
      }}>
        Can a Lens Bend Blue More Than Red?
      </h1>

      <p style={{
        color: defined.colors.text.secondary,
        fontSize: defined.typography.sizes.lg,
        maxWidth: '500px',
        marginBottom: defined.spacing.xl,
        lineHeight: 1.6,
      }}>
        Let's explore how light interacts with glass. Look closely at photos from cheap cameras. See those purple or green fringes around bright edges? Discover how chromatic aberration works and what it reveals about the physics of lenses.
      </p>

      <div style={{
        background: defined.colors.background.card,
        borderRadius: defined.radius.xl,
        padding: defined.spacing.xl,
        maxWidth: '400px',
        marginBottom: defined.spacing.xl,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '4px',
          marginBottom: defined.spacing.md,
        }}>
          {Object.values(defined.colors.spectrum).map((color, i) => (
            <div
              key={i}
              style={{
                width: '30px',
                height: '60px',
                background: color,
                borderRadius: i === 0 ? '8px 0 0 8px' : i === 6 ? '0 8px 8px 0' : '0',
              }}
            />
          ))}
        </div>
        <p style={{ color: defined.colors.text.primary, fontSize: defined.typography.sizes.base }}>
          White light contains all colors. But glass bends each color differently...
        </p>
        <p style={{ color: defined.colors.spectrum.violet, marginTop: defined.spacing.md, fontWeight: defined.typography.weights.semibold }}>
          The result: colors focus at different distances!
        </p>
      </div>

    </div>
  );

  // Static visualization for predict phase (no controls)
  const renderStaticVisualization = () => {
    const width = isMobile ? 340 : 620;
    const height = isMobile ? 280 : 320;
    const lensX = width * 0.32;
    const lensY = height * 0.5;
    const lensHeight = isMobile ? 80 : 100;

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible', maxWidth: `${width}px` }}>
        <defs>
          <linearGradient id="predictBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a0f1a" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0a0f1a" />
          </linearGradient>
          <linearGradient id="predictLensGlass" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(96, 165, 250, 0.08)" />
            <stop offset="50%" stopColor="rgba(191, 219, 254, 0.4)" />
            <stop offset="100%" stopColor="rgba(96, 165, 250, 0.08)" />
          </linearGradient>
        </defs>
        <rect width={width} height={height} fill="url(#predictBgGrad)" rx="16" />

        {/* Optical axis */}
        <line x1="25" y1={lensY} x2={width - 25} y2={lensY} stroke="#475569" strokeWidth="1" strokeDasharray="8,4" opacity="0.6" />

        {/* White light source */}
        <circle cx="40" cy={lensY} r="12" fill="white" />
        <circle cx="40" cy={lensY} r="8" fill="#f8fafc" />

        {/* Simple lens */}
        <ellipse cx={lensX} cy={lensY} rx={12} ry={lensHeight / 2} fill="url(#predictLensGlass)" stroke="rgba(99, 102, 241, 0.5)" strokeWidth="2" />

        {/* Color rays separating - static display */}
        {wavelengths.map((wl, i) => {
          const yOffset = (i - 3) * 4;
          const focalX = lensX + 120 - i * 8;
          return (
            <g key={wl.name}>
              <line x1="52" y1={lensY} x2={lensX - 12} y2={lensY + yOffset} stroke={wl.color} strokeWidth="2" opacity="0.7" />
              <line x1={lensX + 12} y1={lensY + yOffset} x2={focalX} y2={lensY} stroke={wl.color} strokeWidth="2" opacity="0.8" />
              <circle cx={focalX} cy={lensY} r="4" fill={wl.color} opacity="0.9" />
            </g>
          );
        })}

        {/* Labels */}
        <text x="40" y={lensY - 25} fill="#e2e8f0" fontSize="11" textAnchor="middle">White Light</text>
        <text x={lensX} y={lensY - lensHeight / 2 - 10} fill="#e2e8f0" fontSize="11" textAnchor="middle">Glass Lens</text>
        <text x={lensX + 100} y={lensY + 35} fill="#e2e8f0" fontSize="11" textAnchor="middle">Different focal points?</text>
      </svg>
    );
  };

  const renderPredict = () => (
    <div style={{ padding: defined.spacing.lg, maxWidth: '600px', margin: '0 auto' }}>
      {/* Progress indicator */}
      <div style={{ textAlign: 'center', marginBottom: defined.spacing.md }}>
        <span style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.sm }}>Step 1 of 1</span>
      </div>

      <h2 style={{ color: defined.colors.text.primary, textAlign: 'center', marginBottom: defined.spacing.lg }}>
        Make Your Prediction
      </h2>

      {/* Static visualization */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: defined.spacing.lg }}>
        {renderStaticVisualization()}
      </div>

      <div style={{
        background: defined.colors.background.card,
        borderRadius: defined.radius.lg,
        padding: defined.spacing.lg,
        marginBottom: defined.spacing.lg,
      }}>
        <p style={{ color: '#e2e8f0', marginBottom: defined.spacing.md, lineHeight: 1.6 }}>
          White light passes through a glass lens. The refractive index of glass is slightly different for each color (wavelength).
        </p>
        <p style={{ color: defined.colors.text.primary, fontWeight: defined.typography.weights.semibold, lineHeight: 1.6 }}>
          Which color will focus CLOSEST to the lens?
        </p>
      </div>

      {[
        { id: 'A', text: 'Red (longest wavelength)', color: defined.colors.spectrum.red },
        { id: 'B', text: 'Green (middle wavelength)', color: defined.colors.spectrum.green },
        { id: 'C', text: 'Blue/Violet (shortest wavelength)', color: defined.colors.spectrum.violet },
        { id: 'D', text: 'All colors focus at the same point', color: defined.colors.text.primary },
      ].map((option) => (
        <button
          key={option.id}
          onClick={() => setPrediction(option.id)}
          style={{
            width: '100%',
            padding: defined.spacing.md,
            minHeight: '48px',
            marginBottom: defined.spacing.sm,
            background: prediction === option.id ? defined.colors.primary : defined.colors.background.tertiary,
            color: prediction === option.id ? defined.colors.text.primary : option.color,
            border: prediction === option.id ? `2px solid ${defined.colors.primary}` : `2px solid ${option.color}33`,
            borderRadius: defined.radius.md,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s ease',
          }}
        >
          {option.id}. {option.text}
        </button>
      ))}

      {prediction && (
        <div style={{
          background: prediction === 'C' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
          border: `1px solid ${prediction === 'C' ? defined.colors.success : defined.colors.warning}`,
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          marginTop: defined.spacing.lg,
        }}>
          <p style={{ color: prediction === 'C' ? defined.colors.success : defined.colors.warning, fontWeight: defined.typography.weights.semibold, lineHeight: 1.6 }}>
            {prediction === 'C' ? 'Correct!' : 'Not quite!'}
          </p>
          <p style={{ color: '#e2e8f0', marginTop: defined.spacing.sm, lineHeight: 1.6 }}>
            Blue/violet light has a higher refractive index in glass, so it bends more and focuses closer to the lens. This is called "normal dispersion" - shorter wavelengths bend more.
          </p>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{ padding: defined.spacing.lg }}>
      <h2 style={{ color: defined.colors.text.primary, textAlign: 'center', marginBottom: defined.spacing.md }}>
        Chromatic Aberration Lab
      </h2>
      <p style={{ color: '#e2e8f0', textAlign: 'center', marginBottom: defined.spacing.sm, lineHeight: 1.6 }}>
        Watch how different wavelengths focus at different points through the lens.
      </p>

      {/* Observation guidance */}
      <p style={{ color: '#e2e8f0', textAlign: 'center', marginBottom: defined.spacing.lg, fontStyle: 'italic', lineHeight: 1.6 }}>
        Observe: Adjust the lens curvature slider and toggle the doublet to see how chromatic aberration changes.
      </p>

      {/* Side-by-side layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        alignItems: isMobile ? 'center' : 'flex-start',
      }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          {renderChromaticVisualization()}
        </div>
        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
      <div style={{
        background: defined.colors.background.card,
        borderRadius: defined.radius.lg,
        padding: defined.spacing.lg,
      }}>
        <h3 style={{ color: '#e2e8f0', marginBottom: defined.spacing.sm }}>Key Observations:</h3>
        <ul style={{ color: '#e2e8f0', paddingLeft: defined.spacing.lg, lineHeight: 1.8 }}>
          <li>Blue/violet focuses closer to the lens than red</li>
          <li>Stronger lens curvature = more chromatic aberration</li>
          <li>The "focal spread" shows the range of focus points</li>
          <li>Toggle the achromatic doublet to see correction</li>
        </ul>
      </div>

      {/* Real-world relevance section */}
      <div style={{
        background: 'rgba(99, 102, 241, 0.1)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: defined.radius.lg,
        padding: defined.spacing.lg,
        marginTop: defined.spacing.lg,
        maxWidth: '550px',
        margin: `${defined.spacing.lg} auto 0`,
      }}>
        <h4 style={{ color: '#e2e8f0', marginBottom: defined.spacing.sm, fontWeight: defined.typography.weights.semibold }}>Why This Matters</h4>
        <p style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.sm, lineHeight: 1.6, fontWeight: defined.typography.weights.normal }}>
          Understanding chromatic aberration is important for engineers designing camera lenses, telescopes, and microscopes. This technology is used in everyday photography, scientific research, and medical imaging to ensure sharp, color-accurate images.
        </p>
      </div>
        </div>
      </div>
    </div>
  );

  // Static review diagram for review phases
  const renderReviewDiagram = () => {
    const width = isMobile ? 300 : 400;
    const height = 180;
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ maxWidth: `${width}px` }}>
        <defs>
          <linearGradient id="reviewBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>
        <rect width={width} height={height} fill="url(#reviewBgGrad)" rx="12" />

        {/* Dispersion diagram */}
        <text x={width/2} y="25" fill="#e2e8f0" fontSize="12" textAnchor="middle" fontWeight="600">Wavelength-Dependent Refraction</text>

        {/* Prism shape */}
        <polygon points={`${width*0.35},${height*0.3} ${width*0.35},${height*0.7} ${width*0.55},${height*0.5}`} fill="rgba(147, 197, 253, 0.3)" stroke="rgba(147, 197, 253, 0.6)" strokeWidth="1.5" />

        {/* Incoming white light */}
        <line x1={width*0.15} y1={height*0.5} x2={width*0.35} y2={height*0.5} stroke="white" strokeWidth="3" />
        <text x={width*0.15} y={height*0.5 - 10} fill="#e2e8f0" fontSize="11" textAnchor="middle">White</text>

        {/* Separated colors */}
        <line x1={width*0.55} y1={height*0.5} x2={width*0.85} y2={height*0.3} stroke="#EF4444" strokeWidth="2" />
        <line x1={width*0.55} y1={height*0.5} x2={width*0.85} y2={height*0.45} stroke="#22C55E" strokeWidth="2" />
        <line x1={width*0.55} y1={height*0.5} x2={width*0.85} y2={height*0.6} stroke="#3B82F6" strokeWidth="2" />
        <line x1={width*0.55} y1={height*0.5} x2={width*0.85} y2={height*0.7} stroke="#8B5CF6" strokeWidth="2" />

        {/* Labels */}
        <text x={width*0.88} y={height*0.32} fill="#EF4444" fontSize="11">Red (least bent)</text>
        <text x={width*0.88} y={height*0.72} fill="#8B5CF6" fontSize="11">Violet (most bent)</text>

        {/* Formula hint */}
        <text x={width*0.45} y={height*0.9} fill="#e2e8f0" fontSize="11" textAnchor="middle">n increases as wavelength decreases</text>
      </svg>
    );
  };

  const renderReview = () => (
    <div style={{ padding: defined.spacing.lg, maxWidth: '700px', margin: '0 auto' }}>
      <h2 style={{ color: defined.colors.text.primary, textAlign: 'center', marginBottom: defined.spacing.lg }}>
        The Physics of Chromatic Aberration
      </h2>

      {/* Reference to prediction */}
      <div style={{
        background: prediction === 'C' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
        border: `1px solid ${prediction === 'C' ? defined.colors.success : defined.colors.warning}`,
        borderRadius: defined.radius.lg,
        padding: defined.spacing.md,
        marginBottom: defined.spacing.lg,
        textAlign: 'center',
      }}>
        <p style={{ color: '#e2e8f0', fontWeight: defined.typography.weights.normal, lineHeight: 1.6 }}>
          {prediction === 'C'
            ? 'Your prediction was correct! As you observed, blue/violet light focuses closer to the lens because it bends more than red light.'
            : 'As you saw in the experiment, blue/violet light actually focuses closest to the lens. This is the result of wavelength-dependent refraction.'}
        </p>
      </div>

      {/* Visual diagram */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: defined.spacing.lg }}>
        {renderReviewDiagram()}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: defined.spacing.md,
        marginBottom: defined.spacing.lg,
      }}>
        <div style={{ background: defined.colors.background.card, padding: defined.spacing.lg, borderRadius: defined.radius.lg }}>
          <h3 style={{ color: defined.colors.spectrum.violet, marginBottom: defined.spacing.sm }}>Dispersion</h3>
          <p style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.sm, lineHeight: 1.6, fontWeight: defined.typography.weights.normal }}>
            Refractive index depends on wavelength. In glass: n(blue) {'>'} n(green) {'>'} n(red). This is called "normal dispersion."
          </p>
        </div>
        <div style={{ background: defined.colors.background.card, padding: defined.spacing.lg, borderRadius: defined.radius.lg }}>
          <h3 style={{ color: defined.colors.accent, marginBottom: defined.spacing.sm }}>Abbe Number</h3>
          <p style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.sm, lineHeight: 1.6, fontWeight: defined.typography.weights.normal }}>
            V = (n_d - 1)/(n_F - n_C) measures dispersion. Higher V = less dispersion. Crown glass: V~60. Flint glass: V~30.
          </p>
        </div>
      </div>

      <div style={{ background: defined.colors.background.card, padding: defined.spacing.lg, borderRadius: defined.radius.lg, marginBottom: defined.spacing.lg }}>
        <h3 style={{ color: defined.colors.primary, marginBottom: defined.spacing.md, textAlign: 'center' }}>Cauchy's Equation</h3>
        <div style={{
          background: defined.colors.background.primary,
          padding: defined.spacing.md,
          borderRadius: defined.radius.md,
          textAlign: 'center',
          fontFamily: 'monospace',
          color: defined.colors.text.primary,
          fontSize: defined.typography.sizes.lg,
        }}>
          n(lambda) = A + B/lambda^2 + C/lambda^4
        </div>
        <p style={{ color: '#e2e8f0', textAlign: 'center', marginTop: defined.spacing.sm, fontSize: defined.typography.sizes.sm, lineHeight: 1.6, fontWeight: defined.typography.weights.normal }}>
          Shorter wavelength (lambda) = higher refractive index (n) = bends more
        </p>
      </div>
    </div>
  );

  // Static SVG for twist_predict phase
  const renderTwistPredictSVG = () => {
    const width = isMobile ? 300 : 400;
    const height = 160;
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ maxWidth: `${width}px` }}>
        <defs>
          <linearGradient id="twistPredictBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>
        <rect width={width} height={height} fill="url(#twistPredictBg)" rx="12" />

        <text x={width/2} y="22" fill="#e2e8f0" fontSize="11" textAnchor="middle" fontWeight="600">The Problem: Color Fringes</text>

        {/* Simple lens showing aberration */}
        <ellipse cx={width*0.25} cy={height*0.55} rx="8" ry="35" fill="rgba(147, 197, 253, 0.3)" stroke="rgba(147, 197, 253, 0.6)" strokeWidth="1" />

        {/* Separated rays */}
        <line x1={width*0.1} y1={height*0.55} x2={width*0.25} y2={height*0.55} stroke="white" strokeWidth="2" />
        <line x1={width*0.33} y1={height*0.55} x2={width*0.55} y2={height*0.4} stroke="#EF4444" strokeWidth="1.5" />
        <line x1={width*0.33} y1={height*0.55} x2={width*0.52} y2={height*0.55} stroke="#22C55E" strokeWidth="1.5" />
        <line x1={width*0.33} y1={height*0.55} x2={width*0.48} y2={height*0.7} stroke="#8B5CF6" strokeWidth="1.5" />

        {/* Question mark */}
        <text x={width*0.7} y={height*0.5} fill="#8B5CF6" fontSize="36" textAnchor="middle" fontWeight="bold">?</text>
        <text x={width*0.7} y={height*0.72} fill="#e2e8f0" fontSize="11" textAnchor="middle">How to fix?</text>

        {/* Labels */}
        <text x={width*0.5} y={height*0.95} fill="#94a3b8" fontSize="11" textAnchor="middle">Colors focus at different points</text>
      </svg>
    );
  };

  const renderTwistPredict = () => (
    <div style={{ padding: defined.spacing.lg, maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ color: defined.colors.secondary, textAlign: 'center', marginBottom: defined.spacing.lg }}>
        The Twist: The Achromatic Doublet
      </h2>

      {/* Static visualization */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: defined.spacing.lg }}>
        {renderTwistPredictSVG()}
      </div>

      <div style={{
        background: defined.colors.background.card,
        borderRadius: defined.radius.lg,
        padding: defined.spacing.lg,
        marginBottom: defined.spacing.lg,
      }}>
        <p style={{ color: '#e2e8f0', marginBottom: defined.spacing.md, lineHeight: 1.6, fontWeight: defined.typography.weights.normal }}>
          Chromatic aberration seems unavoidable - different wavelengths MUST bend differently. Yet professional lenses produce sharp, color-fringe-free images.
        </p>
        <p style={{ color: defined.colors.text.primary, fontWeight: defined.typography.weights.semibold, lineHeight: 1.6 }}>
          How can we correct chromatic aberration?
        </p>
      </div>

      {[
        { id: 'A', text: 'Use mirrors instead of lenses' },
        { id: 'B', text: 'Combine two different glass types that cancel each other\'s dispersion' },
        { id: 'C', text: 'Use only one color of light' },
        { id: 'D', text: 'Make the lens thinner' },
      ].map((option) => (
        <button
          key={option.id}
          onClick={() => setTwistPrediction(option.id)}
          style={{
            width: '100%',
            padding: defined.spacing.md,
            minHeight: '48px',
            marginBottom: defined.spacing.sm,
            background: twistPrediction === option.id ? defined.colors.secondary : defined.colors.background.tertiary,
            color: defined.colors.text.primary,
            border: twistPrediction === option.id ? `2px solid ${defined.colors.secondary}` : '2px solid transparent',
            borderRadius: defined.radius.md,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s ease',
          }}
        >
          {option.id}. {option.text}
        </button>
      ))}

      {twistPrediction && (
        <div style={{
          background: twistPrediction === 'B' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
          border: `1px solid ${twistPrediction === 'B' ? defined.colors.success : defined.colors.warning}`,
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          marginTop: defined.spacing.lg,
        }}>
          <p style={{ color: twistPrediction === 'B' ? defined.colors.success : defined.colors.warning, fontWeight: defined.typography.weights.semibold, lineHeight: 1.6 }}>
            {twistPrediction === 'B' ? 'Exactly right!' : twistPrediction === 'A' ? 'Mirrors work, but we can also fix lenses!' : 'Clever, but there\'s a better way!'}
          </p>
          <p style={{ color: defined.colors.text.secondary, marginTop: defined.spacing.sm, lineHeight: 1.6 }}>
            An achromatic doublet pairs a converging crown glass lens with a diverging flint glass lens. Flint glass has higher dispersion, so a weaker diverging flint element can cancel the color spread of the crown element.
          </p>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ padding: defined.spacing.lg }}>
      <h2 style={{ color: defined.colors.secondary, textAlign: 'center', marginBottom: defined.spacing.md }}>
        Achromatic Doublet Demonstration
      </h2>
      <p style={{ color: defined.colors.text.secondary, textAlign: 'center', marginBottom: defined.spacing.lg, lineHeight: 1.6 }}>
        Toggle between simple lens and doublet to see how combining two glass types corrects chromatic aberration.
      </p>

      {/* Side-by-side layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        alignItems: isMobile ? 'center' : 'flex-start',
      }}>
      <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
      {renderChromaticVisualization()}
      </div>
      <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: defined.spacing.md,
      }}>
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${defined.colors.error}`,
          borderRadius: defined.radius.lg,
          padding: defined.spacing.md,
        }}>
          <h4 style={{ color: defined.colors.error, marginBottom: defined.spacing.sm }}>Simple Lens</h4>
          <ul style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm, paddingLeft: defined.spacing.md, lineHeight: 1.6 }}>
            <li>Large focal spread</li>
            <li>Color fringes visible</li>
            <li>Cheap binoculars/cameras</li>
          </ul>
        </div>
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: `1px solid ${defined.colors.success}`,
          borderRadius: defined.radius.lg,
          padding: defined.spacing.md,
        }}>
          <h4 style={{ color: defined.colors.success, marginBottom: defined.spacing.sm }}>Achromatic Doublet</h4>
          <ul style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm, paddingLeft: defined.spacing.md, lineHeight: 1.6 }}>
            <li>Minimized focal spread</li>
            <li>Two colors share focus</li>
            <li>Professional optics</li>
          </ul>
        </div>
      </div>
      </div>
      </div>
    </div>
  );

  // Twist review diagram showing achromatic doublet
  const renderTwistReviewDiagram = () => {
    const width = isMobile ? 300 : 420;
    const height = 200;
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ maxWidth: `${width}px` }}>
        <defs>
          <linearGradient id="twistBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(96, 165, 250, 0.1)" />
            <stop offset="50%" stopColor="rgba(147, 197, 253, 0.35)" />
            <stop offset="100%" stopColor="rgba(96, 165, 250, 0.1)" />
          </linearGradient>
          <linearGradient id="flintGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(251, 191, 36, 0.1)" />
            <stop offset="50%" stopColor="rgba(253, 224, 71, 0.35)" />
            <stop offset="100%" stopColor="rgba(251, 191, 36, 0.1)" />
          </linearGradient>
        </defs>
        <rect width={width} height={height} fill="url(#twistBgGrad)" rx="12" />

        <text x={width/2} y="22" fill="#e2e8f0" fontSize="12" textAnchor="middle" fontWeight="600">Achromatic Doublet Design</text>

        {/* Crown glass lens (biconvex) */}
        <ellipse cx={width*0.38} cy={height*0.5} rx="12" ry="45" fill="url(#crownGrad)" stroke="rgba(96, 165, 250, 0.6)" strokeWidth="1.5" />
        <text x={width*0.38} y={height*0.5 + 60} fill="#60a5fa" fontSize="11" textAnchor="middle">Crown</text>
        <text x={width*0.38} y={height*0.5 + 72} fill="#60a5fa" fontSize="11" textAnchor="middle">(low disp.)</text>

        {/* Flint glass lens (plano-concave) */}
        <path d={`M ${width*0.44} ${height*0.5 - 40}
                  Q ${width*0.52} ${height*0.5} ${width*0.44} ${height*0.5 + 40}
                  L ${width*0.52} ${height*0.5 + 40}
                  L ${width*0.52} ${height*0.5 - 40} Z`}
              fill="url(#flintGrad)" stroke="rgba(251, 191, 36, 0.6)" strokeWidth="1.5" />
        <text x={width*0.52} y={height*0.5 + 60} fill="#fbbf24" fontSize="11" textAnchor="middle">Flint</text>
        <text x={width*0.52} y={height*0.5 + 72} fill="#fbbf24" fontSize="11" textAnchor="middle">(high disp.)</text>

        {/* Incoming rays */}
        <line x1={width*0.12} y1={height*0.4} x2={width*0.38} y2={height*0.45} stroke="white" strokeWidth="2" opacity="0.8" />
        <line x1={width*0.12} y1={height*0.6} x2={width*0.38} y2={height*0.55} stroke="white" strokeWidth="2" opacity="0.8" />

        {/* Corrected output - colors converge */}
        <line x1={width*0.52} y1={height*0.47} x2={width*0.82} y2={height*0.5} stroke="#EF4444" strokeWidth="1.5" opacity="0.9" />
        <line x1={width*0.52} y1={height*0.49} x2={width*0.82} y2={height*0.5} stroke="#22C55E" strokeWidth="1.5" opacity="0.9" />
        <line x1={width*0.52} y1={height*0.51} x2={width*0.82} y2={height*0.5} stroke="#3B82F6" strokeWidth="1.5" opacity="0.9" />
        <line x1={width*0.52} y1={height*0.53} x2={width*0.82} y2={height*0.5} stroke="#8B5CF6" strokeWidth="1.5" opacity="0.9" />

        {/* Common focal point */}
        <circle cx={width*0.82} cy={height*0.5} r="6" fill="white" opacity="0.9" />
        <text x={width*0.82} y={height*0.5 + 20} fill="#10b981" fontSize="11" textAnchor="middle">Common focus</text>

        {/* Explanation arrow */}
        <text x={width*0.12} y={height*0.88} fill="#e2e8f0" fontSize="11">Flint glass dispersion cancels crown glass dispersion</text>
      </svg>
    );
  };

  const renderTwistReview = () => (
    <div style={{ padding: defined.spacing.lg, maxWidth: '700px', margin: '0 auto' }}>
      <h2 style={{ color: defined.colors.secondary, textAlign: 'center', marginBottom: defined.spacing.lg }}>
        Correcting Chromatic Aberration
      </h2>

      {/* Visual diagram */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: defined.spacing.lg }}>
        {renderTwistReviewDiagram()}
      </div>

      <div style={{ background: defined.colors.background.card, padding: defined.spacing.lg, borderRadius: defined.radius.lg, marginBottom: defined.spacing.lg }}>
        <h3 style={{ color: defined.colors.primary, marginBottom: defined.spacing.md }}>Types of Correction</h3>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: defined.spacing.md }}>
          <div style={{ background: defined.colors.background.secondary, padding: defined.spacing.md, borderRadius: defined.radius.md, textAlign: 'center' }}>
            <h4 style={{ color: defined.colors.warning }}>Achromat</h4>
            <p style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.sm, lineHeight: 1.6, fontWeight: defined.typography.weights.normal }}>2 elements<br/>2 colors focused</p>
          </div>
          <div style={{ background: defined.colors.background.secondary, padding: defined.spacing.md, borderRadius: defined.radius.md, textAlign: 'center' }}>
            <h4 style={{ color: defined.colors.success }}>Apochromat</h4>
            <p style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.sm, lineHeight: 1.6, fontWeight: defined.typography.weights.normal }}>3+ elements<br/>3 colors focused</p>
          </div>
          <div style={{ background: defined.colors.background.secondary, padding: defined.spacing.md, borderRadius: defined.radius.md, textAlign: 'center' }}>
            <h4 style={{ color: defined.colors.primary }}>Superachromat</h4>
            <p style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.sm, lineHeight: 1.6, fontWeight: defined.typography.weights.normal }}>Special glasses<br/>4+ colors focused</p>
          </div>
        </div>
      </div>

      <div style={{ background: defined.colors.background.card, padding: defined.spacing.lg, borderRadius: defined.radius.lg, marginBottom: defined.spacing.lg }}>
        <h3 style={{ color: defined.colors.accent, marginBottom: defined.spacing.sm }}>The Key Insight</h3>
        <p style={{ color: '#e2e8f0', lineHeight: 1.6, fontWeight: defined.typography.weights.normal }}>
          Crown glass (low dispersion, converging) + Flint glass (high dispersion, diverging) = net converging lens with reduced dispersion. The flint element "undoes" the color spread without undoing all the focusing power.
        </p>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div style={{ padding: defined.spacing.lg, maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: defined.colors.text.primary, textAlign: 'center', marginBottom: defined.spacing.lg }}>
        Real-World Applications
      </h2>

      <p style={{ color: defined.colors.text.secondary, textAlign: 'center', marginBottom: defined.spacing.lg, lineHeight: 1.6 }}>
        Chromatic aberration correction is essential across many industries. From Canon and Nikon camera lenses costing $2,000-$15,000 to Takahashi telescopes at $5,000-$20,000, the principles of achromatic doublets and apochromatic designs impact everyday photography, scientific research, medical imaging, and astronomical observation. Explore how these applications use the physics of wavelength-dependent refraction.
      </p>

      <div style={{
        display: 'flex',
        gap: defined.spacing.sm,
        marginBottom: defined.spacing.lg,
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {applications.map((app, i) => (
          <button
            key={app.id}
            onClick={() => setSelectedApp(i)}
            style={{
              padding: `${defined.spacing.sm} ${defined.spacing.md}`,
              minHeight: '44px',
              background: selectedApp === i ? defined.colors.primary : defined.colors.background.tertiary,
              color: defined.colors.text.primary,
              border: 'none',
              borderRadius: defined.radius.md,
              cursor: 'pointer',
              opacity: completedApps[i] ? 0.7 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {app.icon} {app.title} {completedApps[i] && '✓'}
          </button>
        ))}
      </div>

      <div style={{
        background: defined.colors.background.card,
        borderRadius: defined.radius.xl,
        padding: defined.spacing.xl,
      }}>
        <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: defined.spacing.md }}>
          {applications[selectedApp].icon}
        </div>
        <h3 style={{ color: defined.colors.text.primary, textAlign: 'center', marginBottom: defined.spacing.sm }}>
          {applications[selectedApp].title}
        </h3>
        <p style={{ color: defined.colors.primary, textAlign: 'center', marginBottom: defined.spacing.lg, lineHeight: 1.6 }}>
          {applications[selectedApp].description}
        </p>
        <ul style={{ color: defined.colors.text.secondary, lineHeight: 1.8 }}>
          {applications[selectedApp].details.map((detail, i) => (
            <li key={i}>{detail}</li>
          ))}
        </ul>

        {!completedApps[selectedApp] && (
          <button
            onClick={handleCompleteApp}
            style={{
              display: 'block',
              margin: `${defined.spacing.lg} auto 0`,
              padding: '12px 24px',
              minHeight: '48px',
              background: defined.colors.success,
              color: defined.colors.text.primary,
              border: 'none',
              borderRadius: defined.radius.md,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Got It
          </button>
        )}
        {completedApps[selectedApp] && selectedApp < applications.length - 1 && (
          <button
            onClick={() => setSelectedApp(selectedApp + 1)}
            style={{
              display: 'block',
              margin: `${defined.spacing.lg} auto 0`,
              padding: '12px 24px',
              minHeight: '48px',
              background: defined.colors.primary,
              color: defined.colors.text.primary,
              border: 'none',
              borderRadius: defined.radius.md,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            Continue to Next App
          </button>
        )}
      </div>

      <div style={{
        background: allAppsCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.05)',
        border: `1px solid ${allAppsCompleted ? defined.colors.success : 'rgba(99, 102, 241, 0.3)'}`,
        borderRadius: defined.radius.lg,
        padding: defined.spacing.lg,
        marginTop: defined.spacing.lg,
        textAlign: 'center',
      }}>
        <p style={{ color: allAppsCompleted ? defined.colors.success : defined.colors.text.secondary, fontWeight: defined.typography.weights.semibold, lineHeight: 1.6, marginBottom: defined.spacing.md }}>
          {allAppsCompleted ? 'All applications explored! You can now take the test.' : 'Explore the applications above, then proceed to the knowledge test.'}
        </p>
        <button
          onClick={handlePhaseComplete}
          aria-label="Continue to test phase"
          style={{
            padding: '12px 24px',
            minHeight: '48px',
            background: allAppsCompleted ? defined.colors.success : defined.colors.primary,
            color: defined.colors.text.primary,
            border: 'none',
            borderRadius: defined.radius.md,
            cursor: 'pointer',
            fontWeight: defined.typography.weights.semibold,
            transition: 'all 0.2s ease',
          }}
        >
          Continue to the Knowledge Test and Demonstrate Your Understanding
        </button>
      </div>
    </div>
  );

  const renderTest = () => {
    const question = questions[currentQuestion];

    if (testSubmitted) {
      const passed = score >= 7;
      return (
        <div style={{ padding: defined.spacing.lg, maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            borderRadius: defined.radius.lg,
            padding: defined.spacing.xl,
            textAlign: 'center',
            marginBottom: defined.spacing.lg,
          }}>
            <h2 style={{ color: passed ? defined.colors.success : defined.colors.error, marginBottom: defined.spacing.md }}>
              {passed ? 'Excellent Work!' : 'Keep Learning!'}
            </h2>
            <p style={{ color: defined.colors.text.primary, fontSize: defined.typography.sizes['2xl'], fontWeight: defined.typography.weights.bold }}>
              {score} / {questions.length}
            </p>
            <p style={{ color: '#e2e8f0', marginTop: defined.spacing.md, lineHeight: 1.6, fontWeight: defined.typography.weights.normal }}>
              {passed ? 'You\'ve mastered chromatic aberration!' : 'Review the material and try again.'}
            </p>
          </div>

          {/* Answer Review Section */}
          <div style={{
            background: defined.colors.background.card,
            borderRadius: defined.radius.lg,
            padding: defined.spacing.lg,
            marginBottom: defined.spacing.lg,
          }}>
            <h3 style={{ color: defined.colors.text.primary, marginBottom: defined.spacing.md }}>Answer Review</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: defined.spacing.sm }}>
              {userAnswers.map((answer, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: defined.spacing.sm,
                    padding: defined.spacing.sm,
                    background: answer.correct ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    borderRadius: defined.radius.md,
                    border: `1px solid ${answer.correct ? defined.colors.success : defined.colors.error}`,
                  }}
                >
                  <span style={{
                    color: answer.correct ? defined.colors.success : defined.colors.error,
                    fontWeight: defined.typography.weights.bold,
                    fontSize: defined.typography.sizes.lg,
                    minWidth: '24px',
                  }}>
                    {answer.correct ? '✓' : '✗'}
                  </span>
                  <span style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.sm, fontWeight: defined.typography.weights.normal }}>
                    Question {answer.questionIndex + 1}: {answer.correct ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ padding: defined.spacing.lg, maxWidth: '700px', margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: defined.spacing.lg,
        }}>
          <span style={{ color: '#e2e8f0' }}>
            Question {currentQuestion + 1} of {questions.length}
          </span>
          <span style={{ color: defined.colors.success }}>Score: {score}</span>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: defined.spacing.lg }}>
          {questions.map((_, i) => (
            <div
              key={i}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: i === currentQuestion ? defined.colors.primary : i < currentQuestion ? defined.colors.success : defined.colors.background.tertiary,
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        <div style={{
          background: defined.colors.background.card,
          borderRadius: defined.radius.lg,
          padding: defined.spacing.xl,
          marginBottom: defined.spacing.lg,
        }}>
          <h3 style={{ color: defined.colors.text.primary, marginBottom: defined.spacing.lg }}>
            {question.question}
          </h3>

          {question.options.map((option, i) => {
            let bg = defined.colors.background.tertiary;
            let border = 'transparent';

            if (showResult) {
              if (option.correct) {
                bg = 'rgba(16, 185, 129, 0.3)';
                border = defined.colors.success;
              } else if (i === selectedAnswer) {
                bg = 'rgba(239, 68, 68, 0.3)';
                border = defined.colors.error;
              }
            } else if (i === selectedAnswer) {
              bg = defined.colors.primary;
            }

            return (
              <button
                key={i}
                onClick={() => handleAnswerSelect(i)}
                disabled={showResult}
                style={{
                  width: '100%',
                  padding: defined.spacing.md,
                  minHeight: '48px',
                  marginBottom: defined.spacing.sm,
                  background: bg,
                  color: defined.colors.text.primary,
                  border: `2px solid ${border}`,
                  borderRadius: defined.radius.md,
                  cursor: showResult ? 'default' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
              >
                {option.text}
              </button>
            );
          })}

          {showResult && (
            <div style={{
              background: defined.colors.background.secondary,
              borderRadius: defined.radius.md,
              padding: defined.spacing.md,
              marginTop: defined.spacing.lg,
            }}>
              <p style={{ color: '#e2e8f0', lineHeight: 1.6 }}>{question.explanation}</p>
            </div>
          )}
        </div>

        {showResult && (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={handleNextQuestion}
              style={{
                background: defined.colors.primary,
                color: defined.colors.text.primary,
                border: 'none',
                borderRadius: defined.radius.md,
                padding: '12px 24px',
                minHeight: '48px',
                minWidth: '140px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {currentQuestion < questions.length - 1 ? 'Next Question' : 'See Results'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderMastery = () => (
    <div style={{
      padding: defined.spacing.lg,
      maxWidth: '600px',
      margin: '0 auto',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '4rem', marginBottom: defined.spacing.lg }}>
        🏆
      </div>

      <h2 style={{ color: defined.colors.text.primary, marginBottom: defined.spacing.md }}>
        Chromatic Aberration Master!
      </h2>

      <div style={{
        background: defined.colors.background.card,
        borderRadius: defined.radius.xl,
        padding: defined.spacing.xl,
        marginBottom: defined.spacing.lg,
      }}>
        <div style={{
          fontSize: defined.typography.sizes['3xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.success,
          marginBottom: defined.spacing.md,
        }}>
          {score} / {questions.length}
        </div>
        <p style={{ color: defined.colors.text.secondary, lineHeight: 1.6 }}>
          You understand how dispersion causes chromatic aberration and how to correct it!
        </p>
      </div>

      <div style={{
        background: defined.colors.background.card,
        borderRadius: defined.radius.lg,
        padding: defined.spacing.lg,
        marginBottom: defined.spacing.lg,
        textAlign: 'left',
      }}>
        <h3 style={{ color: defined.colors.primary, marginBottom: defined.spacing.md }}>Key Takeaways</h3>
        <ul style={{ color: defined.colors.text.secondary, lineHeight: 1.8 }}>
          <li>Glass bends blue more than red (normal dispersion)</li>
          <li>This causes different colors to focus at different points</li>
          <li>Achromatic doublets combine crown and flint glass to correct</li>
          <li>Apochromats correct for three wavelengths</li>
        </ul>
      </div>
    </div>
  );

  // =============================================================================
  // MAIN RENDER
  // =============================================================================
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
          conceptName="Chromatic Aberration"
          applications={realWorldApps}
          onComplete={() => setPhase('test')}
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

  const phaseLabels: Record<string, string> = {
    hook: 'Hook',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Review',
    twist_predict: 'Twist Predict',
    twist_play: 'Twist Experiment',
    twist_review: 'Twist Review',
    transfer: 'Transfer',
    test: 'Test',
    mastery: 'Mastery',
  };

  const phaseOrder = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const currentPhaseIndex = phaseOrder.indexOf(phase);

  // Get the appropriate next button label for each phase
  const getNextButtonLabel = (): string => {
    switch (phase) {
      case 'hook': return 'Start Exploring';
      case 'predict': return prediction ? 'Continue to Experiment' : 'Select an Answer';
      case 'play': return 'Continue to Review';
      case 'review': return 'Continue to Twist';
      case 'twist_predict': return twistPrediction ? 'Continue to Doublet' : 'Select an Answer';
      case 'twist_play': return 'Continue to Review';
      case 'twist_review': return 'Continue to Applications';
      case 'transfer': return 'Advance to the Chromatic Aberration Knowledge Assessment';
      case 'test': return testSubmitted ? (score >= 7 ? 'Continue to Mastery' : 'Review & Retry') : 'Answer Questions';
      case 'mastery': return 'Complete Game';
      default: return 'Continue';
    }
  };

  // Determine if the next button should be enabled
  const isNextEnabled = (): boolean => {
    switch (phase) {
      case 'predict': return !!prediction;
      case 'twist_predict': return !!twistPrediction;
      case 'test': return testSubmitted && score >= 7;
      default: return true;
    }
  };

  // Render the fixed bottom navigation bar
  const renderBottomBar = () => (
    <div style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      minHeight: '72px',
      background: 'rgba(30, 41, 59, 0.98)',
      borderTop: '1px solid rgba(148, 163, 184, 0.2)',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
      padding: '16px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: defined.spacing.md }}>
        {currentPhaseIndex > 0 && (
          <button
            onClick={() => {/* Back navigation handled by parent */}}
            style={{
              padding: '8px 16px',
              minHeight: '44px',
              background: 'transparent',
              color: '#e2e8f0',
              border: `1px solid ${defined.colors.background.tertiary}`,
              borderRadius: defined.radius.md,
              cursor: 'pointer',
              fontSize: defined.typography.sizes.sm,
              fontWeight: defined.typography.weights.normal,
              transition: 'all 0.2s ease',
            }}
          >
            Back
          </button>
        )}
        <span style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.sm, fontWeight: defined.typography.weights.normal }}>
          {currentPhaseIndex + 1} / {phaseOrder.length}
        </span>
      </div>
      <button
        onClick={handlePhaseComplete}
        disabled={!isNextEnabled()}
        style={{
          padding: '12px 24px',
          minHeight: '48px',
          minWidth: '160px',
          background: isNextEnabled()
            ? `linear-gradient(135deg, ${defined.colors.primary}, ${defined.colors.primaryDark})`
            : defined.colors.background.tertiary,
          color: defined.colors.text.primary,
          border: 'none',
          borderRadius: defined.radius.md,
          cursor: isNextEnabled() ? 'pointer' : 'not-allowed',
          fontWeight: defined.typography.weights.semibold,
          fontSize: defined.typography.sizes.base,
          transition: 'all 0.2s ease',
          opacity: isNextEnabled() ? 1 : 0.5,
        }}
      >
        {getNextButtonLabel()}
      </button>
    </div>
  );

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: defined.colors.background.primary,
      fontFamily: defined.typography.fontFamily,
      color: defined.colors.text.primary,
    }}>
      {/* Fixed Header */}
      <div style={{
        flexShrink: 0,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${defined.colors.background.tertiary}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${defined.spacing.sm} ${defined.spacing.lg}`,
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <span style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Chromatic Aberration
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {phaseOrder.map((p, index) => (
              <div
                key={p}
                style={{
                  width: phase === p ? '24px' : '8px',
                  height: '8px',
                  borderRadius: defined.radius.full,
                  background: phase === p ? defined.colors.primary : index < currentPhaseIndex ? defined.colors.success : defined.colors.background.tertiary,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ color: defined.colors.primary, fontSize: defined.typography.sizes.sm }}>
            {phaseLabels[phase]}
          </span>
        </div>
      </div>

      {/* Scrollable Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        {renderPhase()}
      </div>

      {/* Fixed Footer Navigation */}
      {renderBottomBar()}
    </div>
  );
}
