import React, { useState, useEffect, useCallback } from 'react';

interface ThinFilmInterferenceRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  filmTop: '#60a5fa',
  filmBottom: '#3b82f6',
  lightRay: '#fbbf24',
};

const ThinFilmInterferenceRenderer: React.FC<ThinFilmInterferenceRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [thickness, setThickness] = useState(400);
  const [viewAngle, setViewAngle] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation for draining effect
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 1);
      setThickness(prev => {
        const newThickness = prev - 2;
        return newThickness < 100 ? 800 : newThickness;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

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

  // Calculate interference color based on thickness and angle
  const calculateInterferenceColor = (t: number, angle: number = 0): string => {
    const n = 1.33; // Refractive index of soap film
    const cosAngle = Math.cos((angle * Math.PI) / 180);
    const pathDiff = 2 * n * t * cosAngle;

    // Calculate interference for RGB wavelengths
    const wavelengthR = 650; // Red
    const wavelengthG = 550; // Green
    const wavelengthB = 450; // Blue

    const intensityR = Math.pow(Math.cos((Math.PI * pathDiff) / wavelengthR), 2);
    const intensityG = Math.pow(Math.cos((Math.PI * pathDiff) / wavelengthG), 2);
    const intensityB = Math.pow(Math.cos((Math.PI * pathDiff) / wavelengthB), 2);

    const r = Math.round(intensityR * 255);
    const g = Math.round(intensityG * 255);
    const b = Math.round(intensityB * 255);

    return `rgb(${r}, ${g}, ${b})`;
  };

  const predictions = [
    { id: 'pigment', label: 'The colors come from pigments dissolved in the soap' },
    { id: 'rainbow', label: 'Light is splitting into a rainbow like a prism' },
    { id: 'interference', label: 'Reflections from front and back surfaces interfere' },
    { id: 'absorption', label: 'The soap absorbs certain colors from white light' },
  ];

  const twistPredictions = [
    { id: 'brighter', label: 'The colors become brighter and more vivid' },
    { id: 'darker', label: 'Some colors become darker or disappear' },
    { id: 'same', label: 'Nothing changes - polarization has no effect' },
    { id: 'rainbow', label: 'A new rainbow appears' },
  ];

  const transferApplications = [
    {
      title: 'Anti-Reflection Coatings',
      description: 'Camera lenses, glasses, and solar panels use thin coatings to reduce unwanted reflections and increase light transmission.',
      question: 'How does a thin coating eliminate reflections?',
      answer: 'The coating thickness is chosen so reflections from its top and bottom surfaces destructively interfere at visible wavelengths. The reflected waves cancel out, allowing more light through.',
    },
    {
      title: 'Oil Slicks on Water',
      description: 'Oil spilled on water creates swirling rainbow patterns that shift as the oil spreads and thins.',
      question: 'Why do oil slicks show different colors in different regions?',
      answer: 'The oil layer varies in thickness across its surface. Each thickness selectively reinforces different wavelengths through interference, creating bands of color that trace the thickness contours.',
    },
    {
      title: 'Butterfly Wings',
      description: 'Morpho butterflies display brilliant iridescent blue despite having no blue pigment in their wings.',
      question: 'How do butterflies create colors without pigments?',
      answer: 'Their wing scales contain nanoscale structures with precise layer thicknesses. Light reflecting from multiple layers interferes constructively only for blue wavelengths, creating structural color that shifts with viewing angle.',
    },
    {
      title: 'Soap Bubble Art',
      description: 'Artists create stunning images by photographing soap films as they drain, capturing the ever-changing interference patterns.',
      question: 'Why do the colors constantly change in a vertical soap film?',
      answer: 'Gravity pulls soap solution downward, making the film progressively thinner at the top. As thickness changes, the interference condition shifts, causing each spot to cycle through colors until the film becomes too thin and appears black.',
    },
  ];

  const testQuestions = [
    {
      question: 'What causes the colors in a soap film?',
      options: [
        { text: 'Pigments dissolved in the soap solution', correct: false },
        { text: 'Interference between reflections from front and back surfaces', correct: true },
        { text: 'Refraction splitting white light into colors', correct: false },
        { text: 'Fluorescence from soap molecules', correct: false },
      ],
    },
    {
      question: 'When a soap film appears black (no color), it means:',
      options: [
        { text: 'The film has absorbed all light', correct: false },
        { text: 'The film is too thick for interference', correct: false },
        { text: 'The film is extremely thin - reflections destructively interfere', correct: true },
        { text: 'The soap has evaporated completely', correct: false },
      ],
    },
    {
      question: 'As a soap film drains and becomes thinner, the colors:',
      options: [
        { text: 'Stay the same', correct: false },
        { text: 'Shift through a sequence as different wavelengths interfere constructively', correct: true },
        { text: 'Always become more blue', correct: false },
        { text: 'Fade to white', correct: false },
      ],
    },
    {
      question: 'The path difference for thin-film interference depends on:',
      options: [
        { text: 'Film thickness and refractive index only', correct: false },
        { text: 'Film thickness, refractive index, and viewing angle', correct: true },
        { text: 'Only the color of incident light', correct: false },
        { text: 'Only the viewing angle', correct: false },
      ],
    },
    {
      question: 'Anti-reflection coatings work by:',
      options: [
        { text: 'Absorbing reflected light', correct: false },
        { text: 'Making reflections destructively interfere', correct: true },
        { text: 'Bending light around the surface', correct: false },
        { text: 'Scattering light in all directions', correct: false },
      ],
    },
    {
      question: 'Why do butterfly wing colors change with viewing angle?',
      options: [
        { text: 'The pigments are angle-sensitive', correct: false },
        { text: 'The effective path difference changes with angle', correct: true },
        { text: 'Light is polarized differently at different angles', correct: false },
        { text: 'The wing surface is curved', correct: false },
      ],
    },
    {
      question: 'For constructive interference in a thin film, the path difference should equal:',
      options: [
        { text: 'Any multiple of the wavelength', correct: false },
        { text: 'An integer number of wavelengths (accounting for phase shifts)', correct: true },
        { text: 'Exactly one wavelength', correct: false },
        { text: 'Half a wavelength', correct: false },
      ],
    },
    {
      question: 'Oil on water shows colors because:',
      options: [
        { text: 'Oil contains colored chemicals', correct: false },
        { text: 'Water refracts light into colors', correct: false },
        { text: 'The thin oil layer creates interference patterns', correct: true },
        { text: 'Sunlight heats the oil to glow', correct: false },
      ],
    },
    {
      question: 'Polarizing sunglasses can affect thin-film colors because:',
      options: [
        { text: 'They filter out specific wavelengths', correct: false },
        { text: 'They can reduce glare from reflections, altering perceived brightness', correct: true },
        { text: 'Polarization changes the film thickness', correct: false },
        { text: 'They have their own thin-film coating', correct: false },
      ],
    },
    {
      question: 'A coating designed to eliminate reflection of green light would:',
      options: [
        { text: 'Appear green because green is absorbed', correct: false },
        { text: 'Appear purple/magenta because green is not reflected', correct: true },
        { text: 'Appear black', correct: false },
        { text: 'Be invisible', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
    if (score < 8 && onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 500;
    const height = 480;
    const filmLeft = 120;
    const filmRight = 340;
    const filmTop = 100;
    const filmHeight = 200;

    // Generate thickness gradient colors for interference pattern
    const gradientStops = [];
    for (let i = 0; i <= 10; i++) {
      const t = thickness - (i * 50);
      const color = calculateInterferenceColor(Math.max(t, 50), viewAngle);
      gradientStops.push({ offset: i * 10, color });
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)', borderRadius: '16px', maxWidth: '550px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
        >
          <defs>
            {/* === COMPREHENSIVE GRADIENTS & FILTERS === */}

            {/* Premium lab background gradient */}
            <linearGradient id="tfiLabBackground" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="25%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Light source radial glow */}
            <radialGradient id="tfiLightSourceGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
              <stop offset="25%" stopColor="#fcd34d" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* Light beam gradient with depth */}
            <linearGradient id="tfiLightBeam" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.9" />
              <stop offset="25%" stopColor="#fcd34d" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.7" />
              <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.5" />
            </linearGradient>

            {/* Soap film layer gradient - top surface sheen */}
            <linearGradient id="tfiFilmTopSurface" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
              <stop offset="20%" stopColor="#7dd3fc" stopOpacity="0.5" />
              <stop offset="40%" stopColor="#bae6fd" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#7dd3fc" stopOpacity="0.5" />
              <stop offset="80%" stopColor="#38bdf8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.2" />
            </linearGradient>

            {/* Soap film iridescent layer */}
            <linearGradient id="tfiFilmIridescent" x1="0%" y1="0%" x2="0%" y2="100%">
              {gradientStops.map((stop, i) => (
                <stop key={i} offset={`${stop.offset}%`} stopColor={stop.color} stopOpacity="0.85" />
              ))}
            </linearGradient>

            {/* Bottom surface depth gradient */}
            <linearGradient id="tfiFilmBottomSurface" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0369a1" stopOpacity="0.2" />
              <stop offset="30%" stopColor="#0c4a6e" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#082f49" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.8" />
            </linearGradient>

            {/* Reflected ray 1 gradient (top surface reflection) */}
            <linearGradient id="tfiReflectedRay1" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
              <stop offset="25%" stopColor="#93c5fd" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#bfdbfe" stopOpacity="0.7" />
              <stop offset="75%" stopColor="#93c5fd" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.4" />
            </linearGradient>

            {/* Reflected ray 2 gradient (bottom surface reflection) */}
            <linearGradient id="tfiReflectedRay2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
              <stop offset="25%" stopColor="#60a5fa" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.7" />
              <stop offset="75%" stopColor="#60a5fa" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
            </linearGradient>

            {/* Path difference accent gradient */}
            <linearGradient id="tfiPathDiffGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
              <stop offset="25%" stopColor="#c084fc" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#d8b4fe" stopOpacity="0.7" />
              <stop offset="75%" stopColor="#c084fc" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.5" />
            </linearGradient>

            {/* Interference result glow */}
            <radialGradient id="tfiResultGlow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor={calculateInterferenceColor(thickness, viewAngle)} stopOpacity="1" />
              <stop offset="40%" stopColor={calculateInterferenceColor(thickness, viewAngle)} stopOpacity="0.7" />
              <stop offset="70%" stopColor={calculateInterferenceColor(thickness, viewAngle)} stopOpacity="0.3" />
              <stop offset="100%" stopColor={calculateInterferenceColor(thickness, viewAngle)} stopOpacity="0" />
            </radialGradient>

            {/* Observer eye gradient */}
            <radialGradient id="tfiEyeGradient" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#f8fafc" stopOpacity="1" />
              <stop offset="30%" stopColor="#e2e8f0" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#cbd5e1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.7" />
            </radialGradient>

            {/* Eye iris gradient */}
            <radialGradient id="tfiIrisGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="1" />
              <stop offset="40%" stopColor="#1e3a5f" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#0c4a6e" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.9" />
            </radialGradient>

            {/* === PREMIUM GLOW FILTERS === */}

            {/* Light source intense glow */}
            <filter id="tfiLightGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur1" />
              <feGaussianBlur stdDeviation="3" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Ray glow effect */}
            <filter id="tfiRayGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft glow for film */}
            <filter id="tfiFilmGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Interference result glow */}
            <filter id="tfiResultGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur1" />
              <feGaussianBlur stdDeviation="2" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle inner shadow for depth */}
            <filter id="tfiInnerShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Text shadow for labels */}
            <filter id="tfiTextShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle grid pattern */}
            <pattern id="tfiGridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Background with subtle grid */}
          <rect width={width} height={height} fill="url(#tfiLabBackground)" />
          <rect width={width} height={height} fill="url(#tfiGridPattern)" />

          {/* Title label */}
          <text x={width / 2} y={30} fill={colors.textPrimary} fontSize={16} fontWeight="600" textAnchor="middle" filter="url(#tfiTextShadow)">
            Thin-Film Interference
          </text>
          <text x={width / 2} y={50} fill={colors.textSecondary} fontSize={12} textAnchor="middle">
            Soap Film Cross-Section
          </text>

          {/* === PREMIUM LIGHT SOURCE === */}
          <g transform="translate(55, 55)">
            {/* Outer glow rings */}
            <circle cx="0" cy="0" r="35" fill="url(#tfiLightSourceGlow)" opacity="0.3" />
            <circle cx="0" cy="0" r="25" fill="url(#tfiLightSourceGlow)" opacity="0.5" />
            {/* Main light source */}
            <circle cx="0" cy="0" r="18" fill="url(#tfiLightSourceGlow)" filter="url(#tfiLightGlow)" />
            {/* Bright center */}
            <circle cx="-3" cy="-3" r="8" fill="#fef3c7" opacity="0.9" />
            <circle cx="-2" cy="-2" r="4" fill="#ffffff" opacity="0.8" />
          </g>
          <text x={55} y={100} fill={colors.textSecondary} fontSize={11} textAnchor="middle" fontWeight="500">
            White Light
          </text>

          {/* === INCIDENT LIGHT BEAM === */}
          <line
            x1={75}
            y1={65}
            x2={filmLeft + 50}
            y2={filmTop + 25}
            stroke="url(#tfiLightBeam)"
            strokeWidth={5}
            filter="url(#tfiRayGlow)"
            strokeLinecap="round"
          />
          {/* Beam arrow */}
          <polygon
            points={`${filmLeft + 50},${filmTop + 25} ${filmLeft + 38},${filmTop + 12} ${filmLeft + 52},${filmTop + 8}`}
            fill="#fbbf24"
            filter="url(#tfiRayGlow)"
          />

          {/* === PREMIUM SOAP FILM === */}
          {/* Film shadow */}
          <rect
            x={filmLeft + 4}
            y={filmTop + 4}
            width={filmRight - filmLeft}
            height={filmHeight}
            rx={8}
            fill="#000000"
            opacity="0.3"
          />

          {/* Main film body with interference colors */}
          <rect
            x={filmLeft}
            y={filmTop}
            width={filmRight - filmLeft}
            height={filmHeight}
            fill="url(#tfiFilmIridescent)"
            rx={8}
            filter="url(#tfiFilmGlow)"
          />

          {/* Top surface sheen overlay */}
          <rect
            x={filmLeft}
            y={filmTop}
            width={filmRight - filmLeft}
            height={8}
            fill="url(#tfiFilmTopSurface)"
            rx={8}
          />

          {/* Bottom depth overlay */}
          <rect
            x={filmLeft}
            y={filmTop + filmHeight - 15}
            width={filmRight - filmLeft}
            height={15}
            fill="url(#tfiFilmBottomSurface)"
            style={{ clipPath: `inset(0 0 0 0 round 0 0 8px 8px)` }}
          />

          {/* Film border highlights */}
          <rect
            x={filmLeft}
            y={filmTop}
            width={filmRight - filmLeft}
            height={filmHeight}
            fill="none"
            stroke="#60a5fa"
            strokeWidth={2}
            rx={8}
            opacity="0.6"
          />

          {/* Film surface labels with connecting lines */}
          <line x1={filmRight + 5} y1={filmTop + 4} x2={filmRight + 25} y2={filmTop + 4} stroke="#60a5fa" strokeWidth={1} opacity="0.6" />
          <text x={filmRight + 30} y={filmTop + 8} fill="#60a5fa" fontSize={11} fontWeight="500">
            Top Surface
          </text>

          <line x1={filmRight + 5} y1={filmTop + filmHeight - 4} x2={filmRight + 25} y2={filmTop + filmHeight - 4} stroke="#3b82f6" strokeWidth={1} opacity="0.6" />
          <text x={filmRight + 30} y={filmTop + filmHeight} fill="#3b82f6" fontSize={11} fontWeight="500">
            Bottom Surface
          </text>

          {/* === REFLECTION FROM TOP SURFACE (RAY 1) === */}
          <line
            x1={filmLeft + 50}
            y1={filmTop + 25}
            x2={filmLeft + 110}
            y2={filmTop - 40}
            stroke="url(#tfiReflectedRay1)"
            strokeWidth={4}
            filter="url(#tfiRayGlow)"
            strokeLinecap="round"
          />
          {/* Ray 1 label badge */}
          <rect x={filmLeft + 95} y={filmTop - 65} width={50} height={20} rx={10} fill="#1e3a8a" opacity="0.8" />
          <text x={filmLeft + 120} y={filmTop - 51} fill="#93c5fd" fontSize={10} textAnchor="middle" fontWeight="600">
            Ray 1
          </text>

          {/* === LIGHT TRAVELING THROUGH FILM === */}
          <line
            x1={filmLeft + 50}
            y1={filmTop + 25}
            x2={filmLeft + 75}
            y2={filmTop + filmHeight - 25}
            stroke="url(#tfiLightBeam)"
            strokeWidth={3}
            opacity={0.7}
            strokeLinecap="round"
          />

          {/* === REFLECTION FROM BOTTOM SURFACE (RAY 2) === */}
          <line
            x1={filmLeft + 75}
            y1={filmTop + filmHeight - 25}
            x2={filmLeft + 140}
            y2={filmTop - 40}
            stroke="url(#tfiReflectedRay2)"
            strokeWidth={4}
            filter="url(#tfiRayGlow)"
            strokeLinecap="round"
          />
          {/* Ray 2 label badge */}
          <rect x={filmLeft + 130} y={filmTop - 50} width={50} height={20} rx={10} fill="#1e3a5f" opacity="0.8" />
          <text x={filmLeft + 155} y={filmTop - 36} fill="#60a5fa" fontSize={10} textAnchor="middle" fontWeight="600">
            Ray 2
          </text>

          {/* === PATH DIFFERENCE INDICATOR === */}
          <line
            x1={filmLeft + 80}
            y1={filmTop + 30}
            x2={filmLeft + 80}
            y2={filmTop + filmHeight - 30}
            stroke="url(#tfiPathDiffGradient)"
            strokeWidth={3}
            strokeDasharray="6,4"
            filter="url(#tfiRayGlow)"
          />
          {/* Double-headed arrow */}
          <polygon points={`${filmLeft + 80},${filmTop + 35} ${filmLeft + 75},${filmTop + 45} ${filmLeft + 85},${filmTop + 45}`} fill="#a855f7" />
          <polygon points={`${filmLeft + 80},${filmTop + filmHeight - 35} ${filmLeft + 75},${filmTop + filmHeight - 45} ${filmLeft + 85},${filmTop + filmHeight - 45}`} fill="#a855f7" />
          {/* Path diff label */}
          <rect x={filmLeft + 88} y={filmTop + filmHeight / 2 - 12} width={75} height={24} rx={12} fill="rgba(139, 92, 246, 0.3)" />
          <text x={filmLeft + 125} y={filmTop + filmHeight / 2 + 4} fill="#d8b4fe" fontSize={10} textAnchor="middle" fontWeight="500">
            Path Difference
          </text>

          {/* === OBSERVER EYE === */}
          <g transform={`translate(${filmLeft + 130}, ${filmTop - 80})`}>
            {/* Eye white */}
            <ellipse cx="0" cy="0" rx="18" ry="12" fill="url(#tfiEyeGradient)" />
            {/* Iris */}
            <circle cx="0" cy="0" r="8" fill="url(#tfiIrisGradient)" />
            {/* Pupil */}
            <circle cx="0" cy="0" r="3" fill="#0f172a" />
            {/* Highlight */}
            <circle cx="-2" cy="-2" r="2" fill="#ffffff" opacity="0.8" />
            {/* Eye outline */}
            <ellipse cx="0" cy="0" rx="18" ry="12" fill="none" stroke="#64748b" strokeWidth="1.5" />
          </g>
          <text x={filmLeft + 130} y={filmTop - 95} fill={colors.textSecondary} fontSize={10} textAnchor="middle">
            Observer
          </text>

          {/* === INTERFERENCE RESULT DISPLAY === */}
          <g transform={`translate(${filmLeft + 50}, ${filmTop + filmHeight + 40})`}>
            {/* Glow behind result */}
            <ellipse cx="60" cy="25" rx="80" ry="35" fill={calculateInterferenceColor(thickness, viewAngle)} opacity="0.2" filter="url(#tfiResultGlowFilter)" />

            {/* Result color box */}
            <rect
              x="0"
              y="0"
              width="120"
              height="50"
              fill={calculateInterferenceColor(thickness, viewAngle)}
              rx={12}
              filter="url(#tfiResultGlowFilter)"
            />
            {/* Inner highlight */}
            <rect
              x="5"
              y="5"
              width="110"
              height="20"
              fill="rgba(255,255,255,0.2)"
              rx={8}
            />
            {/* Border */}
            <rect
              x="0"
              y="0"
              width="120"
              height="50"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="2"
              rx={12}
            />
          </g>
          <text x={filmLeft + 110} y={filmTop + filmHeight + 110} fill={colors.textPrimary} fontSize={12} textAnchor="middle" fontWeight="500">
            Resulting Color
          </text>
          <text x={filmLeft + 110} y={filmTop + filmHeight + 125} fill={colors.textSecondary} fontSize={10} textAnchor="middle">
            (Constructive Interference)
          </text>

          {/* === INFO DISPLAY PANEL === */}
          <g transform="translate(15, 340)">
            <rect x="0" y="0" width="160" height="60" rx="10" fill="rgba(30, 41, 59, 0.8)" stroke="#334155" strokeWidth="1" />
            <text x="12" y="22" fill={colors.textSecondary} fontSize={11} fontWeight="500">
              Film Thickness:
            </text>
            <text x="140" y="22" fill={colors.accent} fontSize={12} fontWeight="600" textAnchor="end">
              {thickness.toFixed(0)} nm
            </text>
            <text x="12" y="45" fill={colors.textSecondary} fontSize={11} fontWeight="500">
              View Angle:
            </text>
            <text x="140" y="45" fill={colors.accent} fontSize={12} fontWeight="600" textAnchor="end">
              {viewAngle.toFixed(0)}°
            </text>
          </g>

          {/* === INTERFERENCE COLOR SPECTRUM LEGEND === */}
          <g transform={`translate(${width - 180}, 340)`}>
            <rect x="0" y="0" width="165" height="60" rx="10" fill="rgba(30, 41, 59, 0.8)" stroke="#334155" strokeWidth="1" />
            <text x="82" y="18" fill={colors.textSecondary} fontSize={10} textAnchor="middle" fontWeight="500">
              Interference Spectrum
            </text>
            {/* Color spectrum bar */}
            <defs>
              <linearGradient id="tfiSpectrumGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => {
                  const t = 100 + i * 70;
                  return <stop key={i} offset={`${i * 10}%`} stopColor={calculateInterferenceColor(t, 0)} />;
                })}
              </linearGradient>
            </defs>
            <rect x="10" y="28" width="145" height="12" rx="6" fill="url(#tfiSpectrumGradient)" />
            <rect x="10" y="28" width="145" height="12" rx="6" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <text x="10" y="52" fill={colors.textMuted} fontSize={8}>Thin</text>
            <text x="155" y="52" fill={colors.textMuted} fontSize={8} textAnchor="end">Thick</text>
          </g>

          {/* === REFRACTIVE INDEX LABEL === */}
          <text x={filmLeft + (filmRight - filmLeft) / 2} y={filmTop + filmHeight / 2} fill="rgba(255,255,255,0.5)" fontSize={11} textAnchor="middle" fontWeight="500">
            n = 1.33
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '12px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                border: 'none',
                background: isAnimating
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: isAnimating
                  ? '0 4px 20px rgba(239, 68, 68, 0.4)'
                  : '0 4px 20px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              {isAnimating ? 'Stop Draining' : 'Simulate Draining'}
            </button>
            <button
              onClick={() => { setThickness(400); setViewAngle(0); setIsAnimating(false); }}
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                border: `2px solid ${colors.accent}`,
                background: 'rgba(139, 92, 246, 0.1)',
                color: colors.accent,
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Film Thickness: {thickness.toFixed(0)} nm
        </label>
        <input
          type="range"
          min="100"
          max="800"
          step="10"
          value={thickness}
          onChange={(e) => setThickness(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Viewing Angle: {viewAngle.toFixed(0)}°
        </label>
        <input
          type="range"
          min="0"
          max="60"
          step="5"
          value={viewAngle}
          onChange={(e) => setViewAngle(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Path difference = 2 x n x t x cos(angle)
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          n = 1.33 (soap film), t = thickness
        </div>
      </div>
    </div>
  );

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 1000,
    }}>
      <button
        onClick={onPhaseComplete}
        disabled={disabled && !canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              The Colors of Nothing
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Are those colors in the soap, or created by light?
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Dip a wire loop in soap solution and hold it up to the light.
                Brilliant colors swirl across the surface - colors that shift
                and change as the film drains and thins.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The soap has no pigment. Where do these colors come from?
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Click "Simulate Draining" to watch the film thin and colors shift!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Light hits a thin soap film. Some reflects from the top surface,
              some enters the film and reflects from the bottom surface. These
              two reflections travel different distances before reaching your eye.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Why does a soap film show swirling colors?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Thin-Film Interference</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust thickness and angle to see how colors change
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Slowly decrease thickness - watch colors cycle</li>
              <li>At very thin (~100nm) the film appears dark</li>
              <li>Change viewing angle - colors shift!</li>
              <li>Notice: same thickness, different angle = different color</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'interference';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              The colors arise from interference between reflections from the top and bottom surfaces!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Thin-Film Interference</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Two Reflections:</strong> When light hits
                a thin film, part reflects from the top surface and part enters, reflects from the
                bottom, and exits. These two rays can interfere.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Path Difference:</strong> The ray reflecting
                from the bottom travels extra distance (through the film twice). This path difference
                determines which wavelengths constructively or destructively interfere.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Thickness Selects Color:</strong> Different
                thicknesses create different path differences. A 400nm film might boost blue while
                canceling red. As thickness changes, so does the color!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if you view the soap film through polarizing sunglasses?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Polarizing sunglasses filter light based on its vibration direction.
              Reflections from surfaces often become partially polarized.
              What happens when you view thin-film colors through polarized lenses?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Through polarizing sunglasses, the thin-film colors will:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Polarization Effect</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Observe how polarization affects the brightness of reflections
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Polarizing filters reduce glare from reflections. Since thin-film colors come from
              reflected light, the filter can reduce the brightness of certain reflections more
              than others, altering the apparent intensity but not eliminating the colors entirely.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'darker';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Polarizing filters can reduce the brightness of reflections, making some colors appear darker!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Polarization and Thin Films</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Partial Polarization:</strong> Light reflecting
                from surfaces becomes partially polarized, especially at certain angles (Brewster's angle).
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Selective Reduction:</strong> Polarizing sunglasses
                filter out horizontally polarized light (glare). This reduces the intensity of some
                reflections more than others.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Color Persistence:</strong> The interference
                colors don't disappear because they depend on path difference, not polarization.
                But the overall brightness and contrast can change significantly!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Thin-film interference creates colors in nature and technology
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test
            </p>
          </div>

          {transferApplications.map((app, index) => (
            <div
              key={index}
              style={{
                background: colors.bgCard,
                margin: '16px',
                padding: '16px',
                borderRadius: '12px',
                border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Done</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered thin-film interference!' : 'Review the material and try again.'}
              </p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? 'Correct:' : userAnswer === oIndex ? 'Your answer:' : ''} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered thin-film interference</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Interference between front and back surface reflections</li>
              <li>Path difference determines which colors are enhanced</li>
              <li>Thickness and viewing angle both affect colors</li>
              <li>Applications from anti-reflection coatings to butterfly wings</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Multi-layer coatings stack many thin films to create highly selective filters -
              like the dichroic mirrors in projectors. Interference filters can transmit only
              a narrow band of wavelengths, crucial for spectroscopy and laser optics.
              Nature uses similar structures for camouflage and communication!
            </p>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default ThinFilmInterferenceRenderer;
