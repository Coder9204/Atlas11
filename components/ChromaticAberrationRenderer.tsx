'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// =============================================================================
// CHROMATIC ABERRATION RENDERER - WHY EDGES GET COLOR FRINGES
// =============================================================================
// Game 131: Premium educational game demonstrating how wavelength-dependent
// refraction causes different colors to focus at different points. Students
// explore how achromatic doublets correct this optical aberration.
// =============================================================================

interface ChromaticAberrationRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
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
    question: 'What causes chromatic aberration in lenses?',
    options: [
      { text: 'Lens manufacturing defects', correct: false },
      { text: 'Different wavelengths refract by different amounts (dispersion)', correct: true },
      { text: 'Light absorption in glass', correct: false },
      { text: 'Reflection inside the lens', correct: false },
    ],
    explanation: 'Glass has a wavelength-dependent refractive index. Blue light bends more than red, so different colors focus at different distances from the lens.',
  },
  {
    id: 2,
    question: 'Which color of light is bent the MOST by a glass lens?',
    options: [
      { text: 'Red (longest wavelength)', correct: false },
      { text: 'Yellow (middle wavelength)', correct: false },
      { text: 'Blue/Violet (shortest wavelength)', correct: true },
      { text: 'All colors bend equally', correct: false },
    ],
    explanation: 'Shorter wavelengths have higher refractive indices in glass (normal dispersion). Blue/violet light bends more and focuses closer to the lens than red light.',
  },
  {
    id: 3,
    question: 'Where does chromatic aberration appear most noticeably in photos?',
    options: [
      { text: 'In the center of the image', correct: false },
      { text: 'At high-contrast edges, especially toward frame edges', correct: true },
      { text: 'In out-of-focus areas', correct: false },
      { text: 'Only in black and white images', correct: false },
    ],
    explanation: 'Chromatic aberration shows as color fringes along high-contrast edges. It\'s worse toward frame edges where rays hit the lens at steeper angles.',
  },
  {
    id: 4,
    question: 'What is an achromatic doublet?',
    options: [
      { text: 'Two identical lenses glued together', correct: false },
      { text: 'A crown glass + flint glass lens pair designed to focus two wavelengths to the same point', correct: true },
      { text: 'A lens with anti-reflective coating', correct: false },
      { text: 'Two cameras used together', correct: false },
    ],
    explanation: 'An achromatic doublet combines a converging crown glass lens with a diverging flint glass lens. Flint glass has higher dispersion, allowing the pair to cancel chromatic aberration.',
  },
  {
    id: 5,
    question: 'How does flint glass differ from crown glass?',
    options: [
      { text: 'Flint glass is harder', correct: false },
      { text: 'Flint glass has higher dispersion (more separation of colors)', correct: true },
      { text: 'Flint glass is clearer', correct: false },
      { text: 'Flint glass is cheaper', correct: false },
    ],
    explanation: 'Flint glass contains lead oxide, giving it higher refractive index AND higher dispersion than crown glass. This makes it useful for correcting chromatic aberration.',
  },
  {
    id: 6,
    question: 'An apochromatic lens corrects chromatic aberration for:',
    options: [
      { text: 'One wavelength only', correct: false },
      { text: 'Two wavelengths (like achromatic)', correct: false },
      { text: 'Three wavelengths, with even better correction', correct: true },
      { text: 'All wavelengths perfectly', correct: false },
    ],
    explanation: 'Apochromatic (APO) lenses use special glass types to bring three wavelengths to a common focus point. They\'re essential for demanding applications like astrophotography.',
  },
  {
    id: 7,
    question: 'Why do cheap binoculars often show purple fringes around bright objects?',
    options: [
      { text: 'The glass is tinted purple', correct: false },
      { text: 'They lack proper chromatic aberration correction', correct: true },
      { text: 'Your eyes are playing tricks', correct: false },
      { text: 'The object itself is purple', correct: false },
    ],
    explanation: 'Inexpensive optics use simple lenses without achromatic correction. Blue/violet light focuses at a different point than red/green, creating visible purple or magenta fringes.',
  },
  {
    id: 8,
    question: 'The Abbe number (V-number) measures:',
    options: [
      { text: 'Lens magnification power', correct: false },
      { text: 'A material\'s dispersion - how much it separates colors', correct: true },
      { text: 'Lens diameter', correct: false },
      { text: 'Image brightness', correct: false },
    ],
    explanation: 'The Abbe number quantifies dispersion. Higher V = lower dispersion (crown glass ~60). Lower V = higher dispersion (flint glass ~30). Achromat design requires balancing these.',
  },
  {
    id: 9,
    question: 'Why do reflecting telescopes (mirrors) have no chromatic aberration?',
    options: [
      { text: 'Mirrors are made of special glass', correct: false },
      { text: 'Reflection angle doesn\'t depend on wavelength', correct: true },
      { text: 'Mirrors are curved perfectly', correct: false },
      { text: 'Telescopes are too far from objects', correct: false },
    ],
    explanation: 'Mirrors reflect all wavelengths at the same angle (law of reflection). Only refraction depends on wavelength. That\'s why large telescopes use mirrors instead of lenses.',
  },
  {
    id: 10,
    question: 'Modern camera lenses use ED (Extra-low Dispersion) glass to:',
    options: [
      { text: 'Make lenses lighter', correct: false },
      { text: 'Reduce chromatic aberration with special low-dispersion elements', correct: true },
      { text: 'Improve autofocus speed', correct: false },
      { text: 'Increase maximum aperture', correct: false },
    ],
    explanation: 'ED glass has unusually low dispersion for its refractive index. Including ED elements allows better chromatic correction in fewer lens elements, improving image quality.',
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
    description: 'Sharp images without color fringes',
    icon: '📷',
    details: [
      'Modern lenses use 10-20 elements including ED and aspherical glass',
      'Achromatic correction is essential for professional photography',
      'Purple fringing in cheap lenses is uncorrected chromatic aberration',
      'Software can partially correct CA in post-processing',
    ],
  },
  {
    id: 2,
    title: 'Telescope Design',
    description: 'Seeing the universe clearly',
    icon: '🔭',
    details: [
      'Refractor telescopes need achromatic or apochromatic objectives',
      'Large telescopes use mirrors to avoid chromatic aberration entirely',
      'Astronomy demands the highest optical correction',
      'Fluorite glass enables premium apochromatic refractors',
    ],
  },
  {
    id: 3,
    title: 'Eyeglasses',
    description: 'Clear vision across the spectrum',
    icon: '👓',
    details: [
      'High-index lenses can have more chromatic aberration',
      'Abbe number is a quality factor when choosing lens materials',
      'CR-39 plastic (Abbe 58) has less CA than polycarbonate (Abbe 30)',
      'Peripheral vision can show color fringes in strong prescriptions',
    ],
  },
  {
    id: 4,
    title: 'Microscope Objectives',
    description: 'Precise scientific imaging',
    icon: '🔬',
    details: [
      'Plan-apochromat objectives correct for 3+ wavelengths and field curvature',
      'Essential for accurate color imaging in biology and materials science',
      'Oil immersion objectives must also correct for the immersion medium',
      'Highest quality objectives can cost more than the microscope body',
    ],
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function ChromaticAberrationRenderer({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}: ChromaticAberrationRendererProps) {
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
    if (onPhaseComplete) onPhaseComplete();
  }, [playSound, onPhaseComplete]);

  const allAppsCompleted = completedApps.every(Boolean);

  // =============================================================================
  // CHROMATIC ABERRATION VISUALIZATION
  // =============================================================================
  const renderChromaticVisualization = useCallback(() => {
    const width = isMobile ? 320 : 580;
    const height = isMobile ? 380 : 420;
    const lensX = width * 0.35;
    const lensY = height * 0.5;
    const lensHeight = 120;

    // Calculate focal points for each wavelength
    const focalPoints = wavelengths.map((_, i) => ({
      x: lensX + getFocalPoint(i) * 1.5,
      color: wavelengths[i].color,
      name: wavelengths[i].name,
    }));

    // Incoming ray position
    const rayStartX = 30;
    const rayY = lensY;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: defined.spacing.md }}>
        <svg width={width} height={height} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="crownGlassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(147, 197, 253, 0.1)" />
              <stop offset="50%" stopColor="rgba(147, 197, 253, 0.3)" />
              <stop offset="100%" stopColor="rgba(147, 197, 253, 0.1)" />
            </linearGradient>
            <linearGradient id="flintGlassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(251, 191, 36, 0.1)" />
              <stop offset="50%" stopColor="rgba(251, 191, 36, 0.3)" />
              <stop offset="100%" stopColor="rgba(251, 191, 36, 0.1)" />
            </linearGradient>
            <filter id="rayGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width={width} height={height} fill={defined.colors.background.secondary} rx="12" />

          {/* Labels */}
          <text x="30" y="25" fill={defined.colors.text.muted} fontSize="11">White light source</text>
          <text x={lensX - 10} y="25" fill={defined.colors.text.muted} fontSize="11">{useDoublet ? 'Achromatic Doublet' : 'Simple Lens'}</text>
          <text x={width - 80} y="25" fill={defined.colors.text.muted} fontSize="11">Focal points</text>

          {/* Optical axis */}
          <line x1="20" y1={lensY} x2={width - 20} y2={lensY} stroke={defined.colors.text.muted} strokeWidth="1" strokeDasharray="4,4" />

          {/* Simple lens or doublet */}
          {useDoublet ? (
            <>
              {/* Crown glass (converging) */}
              <ellipse cx={lensX - 8} cy={lensY} rx="12" ry={lensHeight / 2} fill="url(#crownGlassGrad)" stroke={defined.colors.spectrum.blue} strokeWidth="2" />
              {/* Flint glass (diverging) */}
              <path
                d={`M ${lensX + 4} ${lensY - lensHeight / 2}
                    Q ${lensX - 5} ${lensY} ${lensX + 4} ${lensY + lensHeight / 2}
                    L ${lensX + 15} ${lensY + lensHeight / 2}
                    Q ${lensX + 5} ${lensY} ${lensX + 15} ${lensY - lensHeight / 2}
                    Z`}
                fill="url(#flintGlassGrad)"
                stroke={defined.colors.accent}
                strokeWidth="2"
              />
              <text x={lensX - 15} y={lensY + lensHeight / 2 + 20} fill={defined.colors.spectrum.blue} fontSize="9" textAnchor="middle">Crown</text>
              <text x={lensX + 10} y={lensY + lensHeight / 2 + 20} fill={defined.colors.accent} fontSize="9" textAnchor="middle">Flint</text>
            </>
          ) : (
            <ellipse
              cx={lensX}
              cy={lensY}
              rx={8 + lensCurvature * 0.1}
              ry={lensHeight / 2}
              fill="url(#crownGlassGrad)"
              stroke={defined.colors.primary}
              strokeWidth="2"
            />
          )}

          {/* White light indicator */}
          <circle cx={rayStartX} cy={rayY} r="10" fill="white" filter="url(#rayGlow)" />
          <circle cx={rayStartX} cy={rayY} r="6" fill="white" />

          {/* Rays - either all wavelengths or selected one */}
          {showAllWavelengths ? (
            wavelengths.map((wl, i) => {
              const focalX = focalPoints[i].x;
              const yOffset = (i - 3) * 3; // Slight vertical spread for visibility

              // Ray from source to lens
              const lensHitY = lensY + yOffset * 2;

              // Animated light pulse
              const pulseProgress = ((animationFrame / 360) + i * 0.1) % 1;
              const pulseX = rayStartX + pulseProgress * (lensX - rayStartX - 10);

              return (
                <g key={wl.name}>
                  {/* Incoming ray */}
                  <line
                    x1={rayStartX + 10}
                    y1={rayY}
                    x2={lensX - 10}
                    y2={lensHitY}
                    stroke={wl.color}
                    strokeWidth="2"
                    opacity="0.8"
                  />
                  {/* Refracted ray to focal point */}
                  <line
                    x1={lensX + 10}
                    y1={lensHitY}
                    x2={Math.min(focalX, width - 30)}
                    y2={lensY}
                    stroke={wl.color}
                    strokeWidth="2"
                    opacity="0.8"
                    filter="url(#rayGlow)"
                  />
                  {/* Focal point indicator */}
                  <circle cx={Math.min(focalX, width - 30)} cy={lensY} r="5" fill={wl.color} />

                  {/* Animated pulse */}
                  {pulseProgress < 0.5 && (
                    <circle
                      cx={pulseX}
                      cy={rayY + yOffset * (pulseProgress * 4)}
                      r="4"
                      fill={wl.color}
                      opacity={1 - pulseProgress * 2}
                    />
                  )}
                </g>
              );
            })
          ) : (
            // Single wavelength
            (() => {
              const wl = wavelengths[selectedWavelength];
              const focalX = focalPoints[selectedWavelength].x;

              return (
                <g>
                  <line
                    x1={rayStartX + 10}
                    y1={rayY}
                    x2={lensX - 10}
                    y2={lensY}
                    stroke={wl.color}
                    strokeWidth="3"
                  />
                  <line
                    x1={lensX + 10}
                    y1={lensY}
                    x2={Math.min(focalX, width - 30)}
                    y2={lensY}
                    stroke={wl.color}
                    strokeWidth="3"
                    filter="url(#rayGlow)"
                  />
                  <circle cx={Math.min(focalX, width - 30)} cy={lensY} r="8" fill={wl.color} />
                  <text x={Math.min(focalX, width - 30)} y={lensY + 25} fill={wl.color} fontSize="11" textAnchor="middle">
                    {wl.name} ({wl.wavelength}nm)
                  </text>
                </g>
              );
            })()
          )}

          {/* Focal spread indicator */}
          {showAllWavelengths && (
            <g>
              <line
                x1={Math.min(...focalPoints.map(f => f.x))}
                y1={lensY + 50}
                x2={Math.max(...focalPoints.map(f => f.x))}
                y2={lensY + 50}
                stroke={defined.colors.accent}
                strokeWidth="2"
              />
              <text
                x={(Math.min(...focalPoints.map(f => f.x)) + Math.max(...focalPoints.map(f => f.x))) / 2}
                y={lensY + 70}
                fill={defined.colors.accent}
                fontSize="10"
                textAnchor="middle"
              >
                Focal spread: {useDoublet ? 'Minimized' : 'Chromatic aberration!'}
              </text>
            </g>
          )}

          {/* Legend */}
          <g transform={`translate(20, ${height - 70})`}>
            <rect x="-5" y="-5" width={width - 30} height="55" fill={defined.colors.background.card} rx="4" />
            {wavelengths.map((wl, i) => (
              <g key={wl.name} transform={`translate(${i * ((width - 40) / 7)}, 0)`}>
                <circle cx="10" cy="15" r="6" fill={wl.color} />
                <text x="10" y="35" fill={defined.colors.text.muted} fontSize="8" textAnchor="middle">
                  {wl.wavelength}
                </text>
              </g>
            ))}
          </g>
        </svg>

        {/* Controls */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: defined.spacing.md,
          width: '100%',
          maxWidth: '550px',
        }}>
          <div style={{ background: defined.colors.background.card, padding: defined.spacing.md, borderRadius: defined.radius.lg }}>
            <label style={{ color: defined.colors.primary, fontSize: defined.typography.sizes.sm, display: 'block', marginBottom: '4px' }}>
              Lens Curvature: {lensCurvature}%
            </label>
            <input
              type="range"
              min="20"
              max="100"
              value={lensCurvature}
              onChange={(e) => setLensCurvature(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.xs, marginTop: '4px' }}>
              More curvature = stronger lens = more aberration
            </div>
          </div>
          <div style={{ background: defined.colors.background.card, padding: defined.spacing.md, borderRadius: defined.radius.lg }}>
            <label style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm, display: 'block', marginBottom: '8px' }}>
              Wavelength Selection
            </label>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowAllWavelengths(true)}
                style={{
                  padding: '4px 8px',
                  background: showAllWavelengths ? defined.colors.primary : defined.colors.background.tertiary,
                  color: defined.colors.text.primary,
                  border: 'none',
                  borderRadius: defined.radius.sm,
                  fontSize: defined.typography.sizes.xs,
                  cursor: 'pointer',
                }}
              >
                All
              </button>
              {wavelengths.map((wl, i) => (
                <button
                  key={wl.name}
                  onClick={() => {
                    setShowAllWavelengths(false);
                    setSelectedWavelength(i);
                  }}
                  style={{
                    width: '20px',
                    height: '20px',
                    background: !showAllWavelengths && selectedWavelength === i ? wl.color : defined.colors.background.tertiary,
                    border: `2px solid ${wl.color}`,
                    borderRadius: defined.radius.full,
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Doublet toggle */}
        <button
          onClick={() => setUseDoublet(!useDoublet)}
          style={{
            padding: `${defined.spacing.sm} ${defined.spacing.lg}`,
            background: useDoublet ? defined.colors.success : defined.colors.background.tertiary,
            color: defined.colors.text.primary,
            border: `2px solid ${useDoublet ? defined.colors.success : defined.colors.primary}`,
            borderRadius: defined.radius.md,
            cursor: 'pointer',
            fontSize: defined.typography.sizes.sm,
            fontWeight: defined.typography.weights.semibold,
          }}
        >
          {useDoublet ? '✓ Achromatic Doublet (Corrected)' : 'Simple Lens (Uncorrected)'}
        </button>
      </div>
    );
  }, [isMobile, lensCurvature, showAllWavelengths, selectedWavelength, useDoublet, animationFrame, getFocalPoint]);

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
      }}>
        Look closely at photos from cheap cameras. See those purple or green fringes around bright edges? That's chromatic aberration - and it reveals something fundamental about how light interacts with glass.
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

      <button
        onClick={handlePhaseComplete}
        style={{
          background: `linear-gradient(135deg, ${defined.colors.primary}, ${defined.colors.primaryDark})`,
          color: defined.colors.text.primary,
          border: 'none',
          borderRadius: defined.radius.lg,
          padding: `${defined.spacing.md} ${defined.spacing.xl}`,
          fontSize: defined.typography.sizes.lg,
          fontWeight: defined.typography.weights.semibold,
          cursor: 'pointer',
        }}
      >
        Explore Chromatic Aberration
      </button>
    </div>
  );

  const renderPredict = () => (
    <div style={{ padding: defined.spacing.lg, maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ color: defined.colors.text.primary, textAlign: 'center', marginBottom: defined.spacing.lg }}>
        Make Your Prediction
      </h2>

      <div style={{
        background: defined.colors.background.card,
        borderRadius: defined.radius.lg,
        padding: defined.spacing.lg,
        marginBottom: defined.spacing.lg,
      }}>
        <p style={{ color: defined.colors.text.secondary, marginBottom: defined.spacing.md }}>
          White light passes through a glass lens. The refractive index of glass is slightly different for each color (wavelength).
        </p>
        <p style={{ color: defined.colors.text.primary, fontWeight: defined.typography.weights.semibold }}>
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
            marginBottom: defined.spacing.sm,
            background: prediction === option.id ? defined.colors.primary : defined.colors.background.tertiary,
            color: prediction === option.id ? defined.colors.text.primary : option.color,
            border: prediction === option.id ? `2px solid ${defined.colors.primary}` : `2px solid ${option.color}33`,
            borderRadius: defined.radius.md,
            cursor: 'pointer',
            textAlign: 'left',
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
          <p style={{ color: prediction === 'C' ? defined.colors.success : defined.colors.warning, fontWeight: defined.typography.weights.semibold }}>
            {prediction === 'C' ? 'Correct!' : 'Not quite!'}
          </p>
          <p style={{ color: defined.colors.text.secondary, marginTop: defined.spacing.sm }}>
            Blue/violet light has a higher refractive index in glass, so it bends more and focuses closer to the lens. This is called "normal dispersion" - shorter wavelengths bend more.
          </p>
          <button
            onClick={handlePhaseComplete}
            style={{
              marginTop: defined.spacing.md,
              background: defined.colors.primary,
              color: defined.colors.text.primary,
              border: 'none',
              borderRadius: defined.radius.md,
              padding: `${defined.spacing.sm} ${defined.spacing.lg}`,
              cursor: 'pointer',
            }}
          >
            See the Ray Diagram
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{ padding: defined.spacing.lg }}>
      <h2 style={{ color: defined.colors.text.primary, textAlign: 'center', marginBottom: defined.spacing.md }}>
        Chromatic Aberration Lab
      </h2>
      <p style={{ color: defined.colors.text.secondary, textAlign: 'center', marginBottom: defined.spacing.lg }}>
        Watch how different wavelengths focus at different points through the lens.
      </p>

      {renderChromaticVisualization()}

      <div style={{
        background: defined.colors.background.card,
        borderRadius: defined.radius.lg,
        padding: defined.spacing.lg,
        marginTop: defined.spacing.lg,
        maxWidth: '550px',
        margin: '0 auto',
      }}>
        <h3 style={{ color: defined.colors.primary, marginBottom: defined.spacing.sm }}>Key Observations:</h3>
        <ul style={{ color: defined.colors.text.secondary, paddingLeft: defined.spacing.lg, lineHeight: '1.8' }}>
          <li>Blue/violet focuses closer to the lens than red</li>
          <li>Stronger lens curvature = more chromatic aberration</li>
          <li>The "focal spread" shows the range of focus points</li>
          <li>Toggle the achromatic doublet to see correction</li>
        </ul>
      </div>

      <div style={{ textAlign: 'center', marginTop: defined.spacing.lg }}>
        <button
          onClick={handlePhaseComplete}
          style={{
            background: defined.colors.primary,
            color: defined.colors.text.primary,
            border: 'none',
            borderRadius: defined.radius.md,
            padding: `${defined.spacing.md} ${defined.spacing.xl}`,
            cursor: 'pointer',
            fontSize: defined.typography.sizes.base,
          }}
        >
          Understand the Physics
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div style={{ padding: defined.spacing.lg, maxWidth: '700px', margin: '0 auto' }}>
      <h2 style={{ color: defined.colors.text.primary, textAlign: 'center', marginBottom: defined.spacing.lg }}>
        The Physics of Chromatic Aberration
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: defined.spacing.md,
        marginBottom: defined.spacing.lg,
      }}>
        <div style={{ background: defined.colors.background.card, padding: defined.spacing.lg, borderRadius: defined.radius.lg }}>
          <h3 style={{ color: defined.colors.spectrum.violet, marginBottom: defined.spacing.sm }}>Dispersion</h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Refractive index depends on wavelength. In glass: n(blue) {'>'} n(green) {'>'} n(red). This is called "normal dispersion."
          </p>
        </div>
        <div style={{ background: defined.colors.background.card, padding: defined.spacing.lg, borderRadius: defined.radius.lg }}>
          <h3 style={{ color: defined.colors.accent, marginBottom: defined.spacing.sm }}>Abbe Number</h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
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
        <p style={{ color: defined.colors.text.muted, textAlign: 'center', marginTop: defined.spacing.sm, fontSize: defined.typography.sizes.sm }}>
          Shorter wavelength (lambda) = higher refractive index (n) = bends more
        </p>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handlePhaseComplete}
          style={{
            background: defined.colors.secondary,
            color: defined.colors.text.primary,
            border: 'none',
            borderRadius: defined.radius.md,
            padding: `${defined.spacing.md} ${defined.spacing.xl}`,
            cursor: 'pointer',
          }}
        >
          See the Solution
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ padding: defined.spacing.lg, maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ color: defined.colors.secondary, textAlign: 'center', marginBottom: defined.spacing.lg }}>
        The Twist: The Achromatic Doublet
      </h2>

      <div style={{
        background: defined.colors.background.card,
        borderRadius: defined.radius.lg,
        padding: defined.spacing.lg,
        marginBottom: defined.spacing.lg,
      }}>
        <p style={{ color: defined.colors.text.secondary, marginBottom: defined.spacing.md }}>
          Chromatic aberration seems unavoidable - different wavelengths MUST bend differently. Yet professional lenses produce sharp, color-fringe-free images.
        </p>
        <p style={{ color: defined.colors.text.primary, fontWeight: defined.typography.weights.semibold }}>
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
            marginBottom: defined.spacing.sm,
            background: twistPrediction === option.id ? defined.colors.secondary : defined.colors.background.tertiary,
            color: defined.colors.text.primary,
            border: twistPrediction === option.id ? `2px solid ${defined.colors.secondary}` : '2px solid transparent',
            borderRadius: defined.radius.md,
            cursor: 'pointer',
            textAlign: 'left',
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
          <p style={{ color: twistPrediction === 'B' ? defined.colors.success : defined.colors.warning, fontWeight: defined.typography.weights.semibold }}>
            {twistPrediction === 'B' ? 'Exactly right!' : twistPrediction === 'A' ? 'Mirrors work, but we can also fix lenses!' : 'Clever, but there\'s a better way!'}
          </p>
          <p style={{ color: defined.colors.text.secondary, marginTop: defined.spacing.sm }}>
            An achromatic doublet pairs a converging crown glass lens with a diverging flint glass lens. Flint glass has higher dispersion, so a weaker diverging flint element can cancel the color spread of the crown element.
          </p>
          <button
            onClick={handlePhaseComplete}
            style={{
              marginTop: defined.spacing.md,
              background: defined.colors.secondary,
              color: defined.colors.text.primary,
              border: 'none',
              borderRadius: defined.radius.md,
              padding: `${defined.spacing.sm} ${defined.spacing.lg}`,
              cursor: 'pointer',
            }}
          >
            See the Doublet in Action
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ padding: defined.spacing.lg }}>
      <h2 style={{ color: defined.colors.secondary, textAlign: 'center', marginBottom: defined.spacing.md }}>
        Achromatic Doublet Demonstration
      </h2>
      <p style={{ color: defined.colors.text.secondary, textAlign: 'center', marginBottom: defined.spacing.lg }}>
        Toggle between simple lens and doublet to see how combining two glass types corrects chromatic aberration.
      </p>

      {renderChromaticVisualization()}

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: defined.spacing.md,
        marginTop: defined.spacing.lg,
        maxWidth: '600px',
        margin: '0 auto',
      }}>
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${defined.colors.error}`,
          borderRadius: defined.radius.lg,
          padding: defined.spacing.md,
        }}>
          <h4 style={{ color: defined.colors.error, marginBottom: defined.spacing.sm }}>Simple Lens</h4>
          <ul style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm, paddingLeft: defined.spacing.md }}>
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
          <ul style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm, paddingLeft: defined.spacing.md }}>
            <li>Minimized focal spread</li>
            <li>Two colors share focus</li>
            <li>Professional optics</li>
          </ul>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: defined.spacing.lg }}>
        <button
          onClick={handlePhaseComplete}
          style={{
            background: defined.colors.secondary,
            color: defined.colors.text.primary,
            border: 'none',
            borderRadius: defined.radius.md,
            padding: `${defined.spacing.md} ${defined.spacing.xl}`,
            cursor: 'pointer',
          }}
        >
          Review the Solution
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ padding: defined.spacing.lg, maxWidth: '700px', margin: '0 auto' }}>
      <h2 style={{ color: defined.colors.secondary, textAlign: 'center', marginBottom: defined.spacing.lg }}>
        Correcting Chromatic Aberration
      </h2>

      <div style={{ background: defined.colors.background.card, padding: defined.spacing.lg, borderRadius: defined.radius.lg, marginBottom: defined.spacing.lg }}>
        <h3 style={{ color: defined.colors.primary, marginBottom: defined.spacing.md }}>Types of Correction</h3>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: defined.spacing.md }}>
          <div style={{ background: defined.colors.background.secondary, padding: defined.spacing.md, borderRadius: defined.radius.md, textAlign: 'center' }}>
            <h4 style={{ color: defined.colors.warning }}>Achromat</h4>
            <p style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>2 elements<br/>2 colors focused</p>
          </div>
          <div style={{ background: defined.colors.background.secondary, padding: defined.spacing.md, borderRadius: defined.radius.md, textAlign: 'center' }}>
            <h4 style={{ color: defined.colors.success }}>Apochromat</h4>
            <p style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>3+ elements<br/>3 colors focused</p>
          </div>
          <div style={{ background: defined.colors.background.secondary, padding: defined.spacing.md, borderRadius: defined.radius.md, textAlign: 'center' }}>
            <h4 style={{ color: defined.colors.primary }}>Superachromat</h4>
            <p style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>Special glasses<br/>4+ colors focused</p>
          </div>
        </div>
      </div>

      <div style={{ background: defined.colors.background.card, padding: defined.spacing.lg, borderRadius: defined.radius.lg, marginBottom: defined.spacing.lg }}>
        <h3 style={{ color: defined.colors.accent, marginBottom: defined.spacing.sm }}>The Key Insight</h3>
        <p style={{ color: defined.colors.text.secondary }}>
          Crown glass (low dispersion, converging) + Flint glass (high dispersion, diverging) = net converging lens with reduced dispersion. The flint element "undoes" the color spread without undoing all the focusing power.
        </p>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handlePhaseComplete}
          style={{
            background: defined.colors.primary,
            color: defined.colors.text.primary,
            border: 'none',
            borderRadius: defined.radius.md,
            padding: `${defined.spacing.md} ${defined.spacing.xl}`,
            cursor: 'pointer',
          }}
        >
          Real-World Applications
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => (
    <div style={{ padding: defined.spacing.lg, maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: defined.colors.text.primary, textAlign: 'center', marginBottom: defined.spacing.lg }}>
        Real-World Applications
      </h2>

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
              background: selectedApp === i ? defined.colors.primary : defined.colors.background.tertiary,
              color: defined.colors.text.primary,
              border: 'none',
              borderRadius: defined.radius.md,
              cursor: 'pointer',
              opacity: completedApps[i] ? 0.7 : 1,
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
        <p style={{ color: defined.colors.primary, textAlign: 'center', marginBottom: defined.spacing.lg }}>
          {applications[selectedApp].description}
        </p>
        <ul style={{ color: defined.colors.text.secondary, lineHeight: '2' }}>
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
              padding: `${defined.spacing.sm} ${defined.spacing.lg}`,
              background: defined.colors.success,
              color: defined.colors.text.primary,
              border: 'none',
              borderRadius: defined.radius.md,
              cursor: 'pointer',
            }}
          >
            Mark as Understood
          </button>
        )}
      </div>

      {allAppsCompleted && (
        <div style={{ textAlign: 'center', marginTop: defined.spacing.lg }}>
          <button
            onClick={handlePhaseComplete}
            style={{
              background: defined.colors.primary,
              color: defined.colors.text.primary,
              border: 'none',
              borderRadius: defined.radius.lg,
              padding: `${defined.spacing.md} ${defined.spacing.xl}`,
              cursor: 'pointer',
              fontSize: defined.typography.sizes.lg,
            }}
          >
            Take the Test
          </button>
        </div>
      )}
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
            <p style={{ color: defined.colors.text.secondary, marginTop: defined.spacing.md }}>
              {passed ? 'You\'ve mastered chromatic aberration!' : 'Review the material and try again.'}
            </p>
          </div>
          {passed && (
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={handlePhaseComplete}
                style={{
                  background: defined.colors.primary,
                  color: defined.colors.text.primary,
                  border: 'none',
                  borderRadius: defined.radius.md,
                  padding: `${defined.spacing.md} ${defined.spacing.xl}`,
                  cursor: 'pointer',
                }}
              >
                Continue to Mastery
              </button>
            </div>
          )}
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
          <span style={{ color: defined.colors.text.secondary }}>
            Question {currentQuestion + 1} of {questions.length}
          </span>
          <span style={{ color: defined.colors.success }}>Score: {score}</span>
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
                  marginBottom: defined.spacing.sm,
                  background: bg,
                  color: defined.colors.text.primary,
                  border: `2px solid ${border}`,
                  borderRadius: defined.radius.md,
                  cursor: showResult ? 'default' : 'pointer',
                  textAlign: 'left',
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
              <p style={{ color: defined.colors.text.secondary }}>{question.explanation}</p>
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
                padding: `${defined.spacing.md} ${defined.spacing.xl}`,
                cursor: 'pointer',
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
        <p style={{ color: defined.colors.text.secondary }}>
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
        <ul style={{ color: defined.colors.text.secondary, lineHeight: '2' }}>
          <li>Glass bends blue more than red (normal dispersion)</li>
          <li>This causes different colors to focus at different points</li>
          <li>Achromatic doublets combine crown and flint glass to correct</li>
          <li>Apochromats correct for three wavelengths</li>
        </ul>
      </div>

      <button
        onClick={handlePhaseComplete}
        style={{
          background: defined.colors.primary,
          color: defined.colors.text.primary,
          border: 'none',
          borderRadius: defined.radius.md,
          padding: `${defined.spacing.md} ${defined.spacing.xl}`,
          cursor: 'pointer',
        }}
      >
        Complete Game
      </button>
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
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  const phaseLabels: Record<string, string> = {
    hook: 'Hook',
    predict: 'Predict',
    play: 'Lab',
    review: 'Review',
    twist_predict: 'Twist Predict',
    twist_play: 'Twist Lab',
    twist_review: 'Twist Review',
    transfer: 'Transfer',
    test: 'Test',
    mastery: 'Mastery',
  };

  const phaseOrder = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const currentPhaseIndex = phaseOrder.indexOf(phase);

  return (
    <div style={{
      minHeight: '100vh',
      background: defined.colors.background.primary,
      fontFamily: defined.typography.fontFamily,
      color: defined.colors.text.primary,
      position: 'relative',
    }}>
      {/* Fixed Header */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
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

      {/* Main Content */}
      <div style={{ paddingTop: '60px', paddingBottom: '100px' }}>
        {renderPhase()}
      </div>

      {/* Fixed Footer Navigation */}
      <div style={{
        position: 'fixed',
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
        <span style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
          {currentPhaseIndex + 1} / {phaseOrder.length}
        </span>
        <button
          onClick={handlePhaseComplete}
          style={{
            padding: `${defined.spacing.sm} ${defined.spacing.lg}`,
            background: defined.colors.primary,
            color: defined.colors.text.primary,
            border: 'none',
            borderRadius: defined.radius.md,
            cursor: 'pointer',
            fontWeight: defined.typography.weights.semibold,
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
