'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// =============================================================================
// POLARIZED SKY RENDERER - NAVIGATION PHYSICS IN THE ATMOSPHERE
// =============================================================================
// Game 129: Premium educational game demonstrating how Rayleigh scattering
// polarizes light in a pattern across the sky. Vikings and bees use this
// for navigation. Students explore how polarization varies with sun position.
// =============================================================================

interface PolarizedSkyRendererProps {
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
    sky: {
      zenith: '#1E40AF',
      horizon: '#7DD3FC',
      sun: '#FCD34D',
      polarized: '#60A5FA',
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
    question: 'What causes skylight to become polarized?',
    options: [
      { text: 'Reflection from clouds', correct: false },
      { text: 'Rayleigh scattering by air molecules', correct: true },
      { text: 'Absorption by ozone', correct: false },
      { text: 'Refraction through ice crystals', correct: false },
    ],
    explanation: 'Rayleigh scattering by nitrogen and oxygen molecules preferentially scatters light polarized perpendicular to the scattering plane, creating a pattern of polarization across the sky.',
  },
  {
    id: 2,
    question: 'At what angle from the sun is skylight most strongly polarized?',
    options: [
      { text: '0 degrees (toward sun)', correct: false },
      { text: '45 degrees', correct: false },
      { text: '90 degrees', correct: true },
      { text: '180 degrees (opposite sun)', correct: false },
    ],
    explanation: 'Polarization is maximum at 90 degrees from the sun. At this angle, the scattered light is nearly 100% polarized perpendicular to the scattering plane.',
  },
  {
    id: 3,
    question: 'How did Vikings likely use sky polarization for navigation?',
    options: [
      { text: 'To predict weather', correct: false },
      { text: 'To locate the sun through overcast skies using sunstones', correct: true },
      { text: 'To measure altitude', correct: false },
      { text: 'To find magnetic north', correct: false },
    ],
    explanation: 'Vikings used calcite crystals (sunstones) that change appearance based on polarization direction. This let them find the sun\'s position even through clouds.',
  },
  {
    id: 4,
    question: 'What happens to sky polarization on a hazy or polluted day?',
    options: [
      { text: 'It increases dramatically', correct: false },
      { text: 'It stays exactly the same', correct: false },
      { text: 'It decreases because large particles scatter unpolarized light', correct: true },
      { text: 'It reverses direction', correct: false },
    ],
    explanation: 'Haze and pollution contain larger particles that scatter all polarizations equally (Mie scattering), diluting the polarization pattern created by Rayleigh scattering.',
  },
  {
    id: 5,
    question: 'How do honeybees use sky polarization?',
    options: [
      { text: 'To find flowers by color', correct: false },
      { text: 'To navigate using the polarization pattern as a compass', correct: true },
      { text: 'To detect predators', correct: false },
      { text: 'To communicate with other bees', correct: false },
    ],
    explanation: 'Bees have specialized photoreceptors that detect polarization direction. They use the sky\'s polarization pattern as a compass to navigate to and from the hive.',
  },
  {
    id: 6,
    question: 'Why is the sky near the horizon less polarized than at the zenith?',
    options: [
      { text: 'Less air molecules there', correct: false },
      { text: 'Light travels through more atmosphere, experiencing multiple scatterings', correct: true },
      { text: 'The sun is brighter near horizon', correct: false },
      { text: 'Ground reflections interfere', correct: false },
    ],
    explanation: 'Near the horizon, light passes through much more atmosphere. Multiple scattering events randomize the polarization, reducing the net polarization degree.',
  },
  {
    id: 7,
    question: 'A polarizing filter in photography can darken blue skies because:',
    options: [
      { text: 'It blocks all blue light', correct: false },
      { text: 'It selectively blocks polarized scattered light when oriented correctly', correct: true },
      { text: 'It reflects skylight back', correct: false },
      { text: 'It absorbs UV radiation', correct: false },
    ],
    explanation: 'The polarizing filter blocks the polarized component of scattered skylight. Since blue sky is partially polarized, the filter darkens it while leaving unpolarized objects unchanged.',
  },
  {
    id: 8,
    question: 'The neutral points (Arago, Babinet, Brewster) in the sky are where:',
    options: [
      { text: 'The sky is brightest', correct: false },
      { text: 'Polarization is zero due to cancellation effects', correct: true },
      { text: 'Stars are visible during day', correct: false },
      { text: 'UV radiation is maximum', correct: false },
    ],
    explanation: 'Neutral points are locations where multiple polarization contributions cancel out. They occur near the sun and anti-sun points due to complex scattering geometry.',
  },
  {
    id: 9,
    question: 'Why does polarization direction form a pattern around the sun?',
    options: [
      { text: 'The sun emits polarized light', correct: false },
      { text: 'Electric oscillations in scattered light are perpendicular to the scattering plane', correct: true },
      { text: 'Magnetic fields align the air molecules', correct: false },
      { text: 'Temperature gradients rotate polarization', correct: false },
    ],
    explanation: 'Rayleigh scattering produces light polarized perpendicular to the plane containing the sun, scattering molecule, and observer. This creates a systematic pattern around the sun.',
  },
  {
    id: 10,
    question: 'Atmospheric scientists study sky polarization to:',
    options: [
      { text: 'Predict earthquakes', correct: false },
      { text: 'Monitor aerosol and pollution levels', correct: true },
      { text: 'Measure ocean currents', correct: false },
      { text: 'Track bird migrations', correct: false },
    ],
    explanation: 'Aerosols and pollutants reduce sky polarization. Polarimetric measurements help scientists monitor air quality and study atmospheric particle distributions.',
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
    title: 'Viking Navigation',
    description: 'Finding the sun through clouds',
    icon: '⛵',
    details: [
      'Vikings sailed the North Atlantic without magnetic compasses',
      'Calcite "sunstones" act as natural polarizers',
      'Even under overcast skies, polarization pattern persists',
      'Could locate sun position to within a few degrees',
    ],
  },
  {
    id: 2,
    title: 'Bee Navigation',
    description: 'How insects find their way home',
    icon: '🐝',
    details: [
      'Bees have polarization-sensitive photoreceptors in their eyes',
      'They memorize the polarization pattern during orientation flights',
      'Use it as a compass to navigate to flowers and back',
      'Works even when sun is obscured by clouds or terrain',
    ],
  },
  {
    id: 3,
    title: 'Atmospheric Science',
    description: 'Monitoring air quality',
    icon: '🌍',
    details: [
      'Degree of polarization indicates aerosol concentration',
      'Satellites measure global polarization patterns',
      'Helps track pollution, dust storms, and volcanic ash',
      'Key data for climate models and air quality forecasts',
    ],
  },
  {
    id: 4,
    title: 'Photography',
    description: 'Controlling reflections and sky darkness',
    icon: '📷',
    details: [
      'Polarizing filters darken blue skies dramatically',
      'Maximum effect at 90 degrees from the sun',
      'Also reduces reflections from water and glass',
      'Essential tool for landscape and outdoor photographers',
    ],
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function PolarizedSkyRenderer({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}: PolarizedSkyRendererProps) {
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
  const [sunAzimuth, setSunAzimuth] = useState(45);
  const [sunElevation, setSunElevation] = useState(45);
  const [polarizerAngle, setPolarizerAngle] = useState(0);
  const [showVectors, setShowVectors] = useState(true);
  const [hazeLevel, setHazeLevel] = useState(0);
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
  const calculatePolarization = useCallback((angleFromSun: number): number => {
    // Polarization is maximum at 90 degrees from sun
    const radians = (angleFromSun * Math.PI) / 180;
    const maxPolarization = 0.75 * (1 - hazeLevel / 100);
    return maxPolarization * Math.pow(Math.sin(radians), 2);
  }, [hazeLevel]);

  const getPolarizationDirection = useCallback((x: number, y: number, sunX: number, sunY: number): number => {
    // Polarization direction is perpendicular to the line from sun to this point
    const dx = x - sunX;
    const dy = y - sunY;
    return Math.atan2(dy, dx) + Math.PI / 2;
  }, []);

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
  // SKY DOME VISUALIZATION
  // =============================================================================
  const renderSkyDome = useCallback(() => {
    const width = isMobile ? 320 : 500;
    const height = isMobile ? 300 : 400;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.4;

    // Sun position in sky dome coordinates
    const sunRadians = (sunAzimuth * Math.PI) / 180;
    const sunDist = radius * (1 - sunElevation / 90);
    const sunX = centerX + sunDist * Math.cos(sunRadians);
    const sunY = centerY + sunDist * Math.sin(sunRadians);

    // Generate polarization vectors across the dome
    const vectors: { x: number; y: number; angle: number; strength: number }[] = [];
    const gridSize = isMobile ? 6 : 8;

    for (let i = -gridSize; i <= gridSize; i++) {
      for (let j = -gridSize; j <= gridSize; j++) {
        const x = centerX + (i / gridSize) * radius;
        const y = centerY + (j / gridSize) * radius;
        const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

        if (distFromCenter <= radius) {
          const distFromSun = Math.sqrt((x - sunX) ** 2 + (y - sunY) ** 2);
          const angleFromSun = Math.atan2(distFromSun, radius) * (180 / Math.PI);
          const strength = calculatePolarization(Math.min(90, angleFromSun * 1.5));
          const direction = getPolarizationDirection(x, y, sunX, sunY);

          vectors.push({ x, y, angle: direction, strength });
        }
      }
    }

    // Calculate what the polarizer sees
    const polarizerRad = (polarizerAngle * Math.PI) / 180;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: defined.spacing.md }}>
        <svg width={width} height={height} style={{ overflow: 'visible' }}>
          <defs>
            <radialGradient id="skyGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={defined.colors.sky.zenith} />
              <stop offset="100%" stopColor={defined.colors.sky.horizon} />
            </radialGradient>
            <filter id="sunGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="hazeFilter">
              <feGaussianBlur stdDeviation={hazeLevel / 10} />
            </filter>
          </defs>

          {/* Sky dome background */}
          <circle cx={centerX} cy={centerY} r={radius} fill="url(#skyGradient)" filter={hazeLevel > 20 ? "url(#hazeFilter)" : undefined} />

          {/* Haze overlay */}
          {hazeLevel > 0 && (
            <circle cx={centerX} cy={centerY} r={radius} fill="white" opacity={hazeLevel / 200} />
          )}

          {/* Horizon line */}
          <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke={defined.colors.text.muted} strokeWidth="2" />

          {/* Cardinal directions */}
          {['N', 'E', 'S', 'W'].map((dir, i) => {
            const angle = (i * Math.PI) / 2 - Math.PI / 2;
            const x = centerX + (radius + 20) * Math.cos(angle);
            const y = centerY + (radius + 20) * Math.sin(angle);
            return (
              <text key={dir} x={x} y={y} fill={defined.colors.text.secondary} fontSize="12" textAnchor="middle" dominantBaseline="middle">
                {dir}
              </text>
            );
          })}

          {/* Polarization vectors */}
          {showVectors && vectors.map((v, i) => {
            const length = 12 * v.strength;
            const opacity = 0.3 + v.strength * 0.7;

            // Calculate transmission through polarizer
            const angleDiff = v.angle - polarizerRad;
            const transmission = Math.pow(Math.cos(angleDiff), 2);
            const color = `rgba(96, 165, 250, ${opacity * transmission})`;

            return (
              <g key={i}>
                <line
                  x1={v.x - length * Math.cos(v.angle)}
                  y1={v.y - length * Math.sin(v.angle)}
                  x2={v.x + length * Math.cos(v.angle)}
                  y2={v.y + length * Math.sin(v.angle)}
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* Sun */}
          <circle cx={sunX} cy={sunY} r="20" fill={defined.colors.sky.sun} filter="url(#sunGlow)" />
          <circle cx={sunX} cy={sunY} r="12" fill="#FFF" opacity="0.8" />

          {/* 90-degree arc from sun (maximum polarization) */}
          <circle
            cx={sunX}
            cy={sunY}
            r={radius * 0.7}
            fill="none"
            stroke={defined.colors.primary}
            strokeWidth="2"
            strokeDasharray="8,4"
            opacity="0.5"
          />
          <text
            x={sunX + radius * 0.7 + 10}
            y={sunY}
            fill={defined.colors.primary}
            fontSize="10"
          >
            90 deg (max polarization)
          </text>

          {/* Polarizer indicator */}
          <g transform={`translate(${width - 60}, 30)`}>
            <rect x="-25" y="-15" width="50" height="30" fill={defined.colors.background.card} rx="4" />
            <line
              x1={-15 * Math.cos(polarizerRad)}
              y1={-15 * Math.sin(polarizerRad)}
              x2={15 * Math.cos(polarizerRad)}
              y2={15 * Math.sin(polarizerRad)}
              stroke={defined.colors.accent}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <text x="0" y="25" fill={defined.colors.text.secondary} fontSize="9" textAnchor="middle">
              Polarizer
            </text>
          </g>

          {/* Legend */}
          <g transform={`translate(20, ${height - 60})`}>
            <rect x="-10" y="-10" width="120" height="50" fill={defined.colors.background.card} rx="4" />
            <line x1="0" y1="5" x2="20" y2="5" stroke={defined.colors.sky.polarized} strokeWidth="2" />
            <text x="25" y="9" fill={defined.colors.text.secondary} fontSize="10">Polarization</text>
            <circle cx="10" cy="25" r="6" fill={defined.colors.sky.sun} />
            <text x="25" y="29" fill={defined.colors.text.secondary} fontSize="10">Sun position</text>
          </g>
        </svg>

        {/* Controls */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: defined.spacing.md,
          width: '100%',
          maxWidth: '500px',
        }}>
          <div style={{ background: defined.colors.background.card, padding: defined.spacing.md, borderRadius: defined.radius.lg }}>
            <label style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm, display: 'block', marginBottom: '4px' }}>
              Sun Azimuth: {sunAzimuth}deg
            </label>
            <input
              type="range"
              min="0"
              max="360"
              value={sunAzimuth}
              onChange={(e) => setSunAzimuth(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ background: defined.colors.background.card, padding: defined.spacing.md, borderRadius: defined.radius.lg }}>
            <label style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm, display: 'block', marginBottom: '4px' }}>
              Sun Elevation: {sunElevation}deg
            </label>
            <input
              type="range"
              min="5"
              max="90"
              value={sunElevation}
              onChange={(e) => setSunElevation(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ background: defined.colors.background.card, padding: defined.spacing.md, borderRadius: defined.radius.lg }}>
            <label style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm, display: 'block', marginBottom: '4px' }}>
              Polarizer Angle: {polarizerAngle}deg
            </label>
            <input
              type="range"
              min="0"
              max="180"
              value={polarizerAngle}
              onChange={(e) => setPolarizerAngle(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ background: defined.colors.background.card, padding: defined.spacing.md, borderRadius: defined.radius.lg }}>
            <label style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm, display: 'block', marginBottom: '4px' }}>
              Haze Level: {hazeLevel}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={hazeLevel}
              onChange={(e) => setHazeLevel(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={() => setShowVectors(!showVectors)}
          style={{
            padding: `${defined.spacing.sm} ${defined.spacing.md}`,
            background: showVectors ? defined.colors.primary : defined.colors.background.tertiary,
            color: defined.colors.text.primary,
            border: 'none',
            borderRadius: defined.radius.md,
            cursor: 'pointer',
            fontSize: defined.typography.sizes.sm,
          }}
        >
          {showVectors ? 'Hide' : 'Show'} Polarization Vectors
        </button>
      </div>
    );
  }, [isMobile, sunAzimuth, sunElevation, polarizerAngle, hazeLevel, showVectors, calculatePolarization, getPolarizationDirection]);

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
        <span style={{ color: defined.colors.primary, fontSize: defined.typography.sizes.sm }}>ATMOSPHERIC OPTICS</span>
      </div>

      <h1 style={{
        fontSize: isMobile ? defined.typography.sizes['2xl'] : defined.typography.sizes['3xl'],
        fontWeight: defined.typography.weights.bold,
        color: defined.colors.text.primary,
        marginBottom: defined.spacing.md,
      }}>
        Is the Sky Polarized in a Pattern You Can Map?
      </h1>

      <p style={{
        color: defined.colors.text.secondary,
        fontSize: defined.typography.sizes.lg,
        maxWidth: '500px',
        marginBottom: defined.spacing.xl,
      }}>
        Vikings navigated without compasses. Bees find their way home through forests. The secret is hidden in plain sight - in the sky itself.
      </p>

      <div style={{
        background: defined.colors.background.card,
        borderRadius: defined.radius.xl,
        padding: defined.spacing.xl,
        maxWidth: '400px',
        marginBottom: defined.spacing.xl,
      }}>
        <div style={{ fontSize: '4rem', marginBottom: defined.spacing.md }}>🌤</div>
        <p style={{ color: defined.colors.text.primary, fontSize: defined.typography.sizes.base }}>
          Look at the sky through polarized sunglasses and rotate them. Notice anything strange?
        </p>
        <p style={{ color: defined.colors.sky.polarized, marginTop: defined.spacing.md, fontWeight: defined.typography.weights.semibold }}>
          The sky changes brightness depending on where you look and how you rotate!
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
        Explore Sky Polarization
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
          You notice that scattered blue skylight appears darker in some directions when viewed through polarized sunglasses.
        </p>
        <p style={{ color: defined.colors.text.primary, fontWeight: defined.typography.weights.semibold }}>
          Where in the sky would you expect the light to be MOST polarized?
        </p>
      </div>

      {[
        { id: 'A', text: 'Directly toward the sun' },
        { id: 'B', text: 'At 90 degrees from the sun' },
        { id: 'C', text: 'Directly opposite the sun' },
        { id: 'D', text: 'Near the horizon everywhere' },
      ].map((option) => (
        <button
          key={option.id}
          onClick={() => setPrediction(option.id)}
          style={{
            width: '100%',
            padding: defined.spacing.md,
            marginBottom: defined.spacing.sm,
            background: prediction === option.id ? defined.colors.primary : defined.colors.background.tertiary,
            color: defined.colors.text.primary,
            border: prediction === option.id ? `2px solid ${defined.colors.primary}` : '2px solid transparent',
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
          background: prediction === 'B' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
          border: `1px solid ${prediction === 'B' ? defined.colors.success : defined.colors.warning}`,
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          marginTop: defined.spacing.lg,
        }}>
          <p style={{ color: prediction === 'B' ? defined.colors.success : defined.colors.warning, fontWeight: defined.typography.weights.semibold }}>
            {prediction === 'B' ? 'Correct!' : 'Not quite!'}
          </p>
          <p style={{ color: defined.colors.text.secondary, marginTop: defined.spacing.sm }}>
            Rayleigh scattering creates maximum polarization at 90 degrees from the sun. The scattered light oscillates perpendicular to the scattering plane.
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
            See It In Action
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{ padding: defined.spacing.lg }}>
      <h2 style={{ color: defined.colors.text.primary, textAlign: 'center', marginBottom: defined.spacing.md }}>
        Sky Polarization Lab
      </h2>
      <p style={{ color: defined.colors.text.secondary, textAlign: 'center', marginBottom: defined.spacing.lg }}>
        Move the sun and rotate the polarizer to see how polarization varies across the sky.
      </p>

      {renderSkyDome()}

      <div style={{
        background: defined.colors.background.card,
        borderRadius: defined.radius.lg,
        padding: defined.spacing.lg,
        marginTop: defined.spacing.lg,
        maxWidth: '500px',
        margin: '0 auto',
      }}>
        <h3 style={{ color: defined.colors.primary, marginBottom: defined.spacing.sm }}>Key Observations:</h3>
        <ul style={{ color: defined.colors.text.secondary, paddingLeft: defined.spacing.lg, lineHeight: '1.8' }}>
          <li>Polarization is strongest at 90 degrees from the sun (dashed circle)</li>
          <li>Near the sun and opposite the sun, polarization is weakest</li>
          <li>Rotating the polarizer changes which vectors appear bright</li>
          <li>Increasing haze reduces the overall polarization strength</li>
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
        The Physics of Sky Polarization
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: defined.spacing.md,
        marginBottom: defined.spacing.lg,
      }}>
        <div style={{ background: defined.colors.background.card, padding: defined.spacing.lg, borderRadius: defined.radius.lg }}>
          <h3 style={{ color: defined.colors.sky.polarized, marginBottom: defined.spacing.sm }}>Rayleigh Scattering</h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            Air molecules scatter light by re-radiating it. The scattered light is polarized perpendicular to the scattering plane (the plane containing the sun, molecule, and observer).
          </p>
        </div>
        <div style={{ background: defined.colors.background.card, padding: defined.spacing.lg, borderRadius: defined.radius.lg }}>
          <h3 style={{ color: defined.colors.accent, marginBottom: defined.spacing.sm }}>90-Degree Rule</h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            At 90 degrees from the sun, the scattering plane is edge-on to us, so we only see polarization perpendicular to it. Maximum polarization can reach 75-80%.
          </p>
        </div>
      </div>

      <div style={{ background: defined.colors.background.card, padding: defined.spacing.lg, borderRadius: defined.radius.lg, marginBottom: defined.spacing.lg }}>
        <h3 style={{ color: defined.colors.primary, marginBottom: defined.spacing.md, textAlign: 'center' }}>Key Formula</h3>
        <div style={{
          background: defined.colors.background.primary,
          padding: defined.spacing.md,
          borderRadius: defined.radius.md,
          textAlign: 'center',
          fontFamily: 'monospace',
          color: defined.colors.text.primary,
          fontSize: defined.typography.sizes.lg,
        }}>
          P = P_max * sin^2(theta)
        </div>
        <p style={{ color: defined.colors.text.muted, textAlign: 'center', marginTop: defined.spacing.sm, fontSize: defined.typography.sizes.sm }}>
          theta = angular distance from sun, P_max depends on atmospheric clarity
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
          See the Twist
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ padding: defined.spacing.lg, maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ color: defined.colors.secondary, textAlign: 'center', marginBottom: defined.spacing.lg }}>
        The Twist: Clear vs Hazy Skies
      </h2>

      <div style={{
        background: defined.colors.background.card,
        borderRadius: defined.radius.lg,
        padding: defined.spacing.lg,
        marginBottom: defined.spacing.lg,
      }}>
        <p style={{ color: defined.colors.text.secondary, marginBottom: defined.spacing.md }}>
          On a clear mountain day, the sky polarization is strong and easy to detect. But what about in a polluted city or on a hazy day?
        </p>
        <p style={{ color: defined.colors.text.primary, fontWeight: defined.typography.weights.semibold }}>
          How does haze affect sky polarization?
        </p>
      </div>

      {[
        { id: 'A', text: 'Haze increases polarization by filtering light' },
        { id: 'B', text: 'Haze decreases polarization - large particles scatter unpolarized light' },
        { id: 'C', text: 'Haze has no effect on polarization' },
        { id: 'D', text: 'Haze reverses the polarization direction' },
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
            {twistPrediction === 'B' ? 'Exactly right!' : 'Not quite!'}
          </p>
          <p style={{ color: defined.colors.text.secondary, marginTop: defined.spacing.sm }}>
            Large particles (dust, pollution, water droplets) scatter light via Mie scattering, which produces unpolarized light. This dilutes the polarization pattern from Rayleigh scattering.
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
            Compare Clear vs Hazy
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ padding: defined.spacing.lg }}>
      <h2 style={{ color: defined.colors.secondary, textAlign: 'center', marginBottom: defined.spacing.md }}>
        Clear vs Hazy Day Comparison
      </h2>
      <p style={{ color: defined.colors.text.secondary, textAlign: 'center', marginBottom: defined.spacing.lg }}>
        Use the haze slider to see how air quality affects polarization strength.
      </p>

      {renderSkyDome()}

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: defined.spacing.md,
        marginTop: defined.spacing.lg,
        maxWidth: '600px',
        margin: '0 auto',
      }}>
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: `1px solid ${defined.colors.success}`,
          borderRadius: defined.radius.lg,
          padding: defined.spacing.md,
        }}>
          <h4 style={{ color: defined.colors.success, marginBottom: defined.spacing.sm }}>Clear Day (0% haze)</h4>
          <ul style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm, paddingLeft: defined.spacing.md }}>
            <li>Strong polarization pattern</li>
            <li>Vikings could navigate accurately</li>
            <li>Bees navigate easily</li>
          </ul>
        </div>
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${defined.colors.error}`,
          borderRadius: defined.radius.lg,
          padding: defined.spacing.md,
        }}>
          <h4 style={{ color: defined.colors.error, marginBottom: defined.spacing.sm }}>Hazy Day (high haze)</h4>
          <ul style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm, paddingLeft: defined.spacing.md }}>
            <li>Weak polarization pattern</li>
            <li>Navigation more difficult</li>
            <li>Mie scattering dominates</li>
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
          Review the Discovery
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ padding: defined.spacing.lg, maxWidth: '700px', margin: '0 auto' }}>
      <h2 style={{ color: defined.colors.secondary, textAlign: 'center', marginBottom: defined.spacing.lg }}>
        Key Discovery: Atmospheric Clarity Matters
      </h2>

      <div style={{ background: defined.colors.background.card, padding: defined.spacing.lg, borderRadius: defined.radius.lg, marginBottom: defined.spacing.lg }}>
        <h3 style={{ color: defined.colors.primary, marginBottom: defined.spacing.md }}>Two Types of Scattering</h3>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: defined.spacing.md }}>
          <div style={{ background: defined.colors.background.secondary, padding: defined.spacing.md, borderRadius: defined.radius.md }}>
            <h4 style={{ color: defined.colors.sky.polarized }}>Rayleigh (small particles)</h4>
            <p style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              Air molecules N2, O2 (diameter much smaller than wavelength). Produces polarized light. Creates blue sky.
            </p>
          </div>
          <div style={{ background: defined.colors.background.secondary, padding: defined.spacing.md, borderRadius: defined.radius.md }}>
            <h4 style={{ color: defined.colors.warning }}>Mie (large particles)</h4>
            <p style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>
              Dust, pollen, pollution, water droplets (diameter comparable to wavelength). Produces unpolarized white light.
            </p>
          </div>
        </div>
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
              {passed ? 'You\'ve mastered sky polarization!' : 'Review the material and try again.'}
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
        Sky Polarization Master!
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
          You understand how Rayleigh scattering creates sky polarization and its applications!
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
          <li>Rayleigh scattering polarizes skylight in a pattern around the sun</li>
          <li>Maximum polarization occurs at 90 degrees from the sun</li>
          <li>Vikings and bees use this pattern for navigation</li>
          <li>Haze and pollution reduce polarization (Mie scattering)</li>
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
            Polarized Sky
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
