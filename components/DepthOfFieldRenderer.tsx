'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// =============================================================================
// DEPTH OF FIELD RENDERER - WHAT CONTROLS BLUR IN PHOTOGRAPHY
// =============================================================================
// Game 130: Premium educational game demonstrating how aperture, subject distance,
// and focus affect depth of field and blur circles. Students explore the physics
// of circle of confusion and how it creates artistic blur in photography.
// =============================================================================

interface DepthOfFieldRendererProps {
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
    lens: {
      glass: 'rgba(147, 197, 253, 0.3)',
      ray: '#60A5FA',
      focus: '#22C55E',
      blur: '#F472B6',
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
    question: 'What is the "circle of confusion" in photography?',
    options: [
      { text: 'A type of lens distortion', correct: false },
      { text: 'The blur disk formed when light from an out-of-focus point spreads on the sensor', correct: true },
      { text: 'A measurement of lens quality', correct: false },
      { text: 'The confusion photographers feel about settings', correct: false },
    ],
    explanation: 'When a point is out of focus, rays from that point don\'t converge to a single point on the sensor. Instead, they form a disk called the circle of confusion.',
  },
  {
    id: 2,
    question: 'What happens to depth of field when you open the aperture wider (smaller f-number)?',
    options: [
      { text: 'Depth of field increases (more in focus)', correct: false },
      { text: 'Depth of field decreases (more blur)', correct: true },
      { text: 'No change to depth of field', correct: false },
      { text: 'Only background blur changes', correct: false },
    ],
    explanation: 'A wider aperture (like f/1.8) creates a larger cone of light rays, which spreads into a larger blur circle for out-of-focus objects. This narrows the depth of field.',
  },
  {
    id: 3,
    question: 'Why do portrait photographers often use large apertures (f/1.4, f/2)?',
    options: [
      { text: 'To let in more light for dark rooms', correct: false },
      { text: 'To create shallow depth of field with blurred backgrounds', correct: true },
      { text: 'To reduce lens aberrations', correct: false },
      { text: 'To make the camera lighter', correct: false },
    ],
    explanation: 'Large apertures create shallow depth of field, blurring distracting backgrounds while keeping the subject sharp. This isolates the subject and creates pleasing bokeh.',
  },
  {
    id: 4,
    question: 'What happens to background blur when you move closer to your subject?',
    options: [
      { text: 'Background blur decreases', correct: false },
      { text: 'Background blur increases', correct: true },
      { text: 'Background blur stays the same', correct: false },
      { text: 'The background becomes sharper', correct: false },
    ],
    explanation: 'Moving closer to the subject while maintaining focus on them increases the relative distance to the background, making the background\'s circle of confusion larger.',
  },
  {
    id: 5,
    question: 'Why do smartphone cameras struggle to create natural background blur?',
    options: [
      { text: 'Their sensors are too small', correct: false },
      { text: 'Their small sensor and short focal length create deep depth of field naturally', correct: true },
      { text: 'They use digital sensors instead of film', correct: false },
      { text: 'They don\'t have manual focus', correct: false },
    ],
    explanation: 'Small sensors require short focal lengths, and shorter focal lengths create deeper depth of field. Phones use computational blur (portrait mode) to simulate what large cameras do optically.',
  },
  {
    id: 6,
    question: 'What is "bokeh" in photography?',
    options: [
      { text: 'A type of camera brand', correct: false },
      { text: 'The aesthetic quality of blur in out-of-focus areas', correct: true },
      { text: 'A Japanese word for sharp focus', correct: false },
      { text: 'A lens cleaning technique', correct: false },
    ],
    explanation: 'Bokeh (Japanese for "blur") refers to the aesthetic quality of the blur produced by circles of confusion. Smooth, round bokeh is generally considered pleasing.',
  },
  {
    id: 7,
    question: 'Why does aperture shape affect bokeh appearance?',
    options: [
      { text: 'It doesn\'t - all apertures create round bokeh', correct: false },
      { text: 'The aperture shape determines the shape of each circle of confusion', correct: true },
      { text: 'Aperture shape only affects sharpness', correct: false },
      { text: 'Modern lenses don\'t have aperture blades', correct: false },
    ],
    explanation: 'Out-of-focus points become little images of the aperture. A 6-blade aperture creates hexagonal bokeh; a perfectly round aperture creates circular bokeh.',
  },
  {
    id: 8,
    question: 'In the formula for depth of field, what does focal length affect?',
    options: [
      { text: 'Longer focal length = deeper depth of field', correct: false },
      { text: 'Longer focal length = shallower depth of field at same framing', correct: true },
      { text: 'Focal length doesn\'t affect depth of field', correct: false },
      { text: 'Only wide-angle lenses create blur', correct: false },
    ],
    explanation: 'At the same subject magnification (framing), longer focal lengths produce shallower depth of field because you\'re further away, creating a larger angular difference to background.',
  },
  {
    id: 9,
    question: 'What is "hyperfocal distance"?',
    options: [
      { text: 'The closest distance a lens can focus', correct: false },
      { text: 'The focus distance that maximizes depth of field from half that distance to infinity', correct: true },
      { text: 'The distance where bokeh is most beautiful', correct: false },
      { text: 'The distance at which lenses work best', correct: false },
    ],
    explanation: 'Focusing at the hyperfocal distance makes everything from half that distance to infinity acceptably sharp. Landscape photographers use this to maximize sharpness throughout the scene.',
  },
  {
    id: 10,
    question: 'Why do cinema cameras use large sensors?',
    options: [
      { text: 'To capture more megapixels', correct: false },
      { text: 'For shallow depth of field that mimics human visual attention', correct: true },
      { text: 'Because film was large', correct: false },
      { text: 'For better low-light performance only', correct: false },
    ],
    explanation: 'Large sensors allow shallow depth of field at normal apertures, letting filmmakers guide viewer attention. The "cinematic look" partly comes from this selective focus.',
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
    title: 'Portrait Photography',
    description: 'Isolating subjects with blur',
    icon: '📸',
    details: [
      'Large apertures (f/1.4-f/2.8) create creamy background blur',
      'Subject stays sharp while background melts away',
      'Directs viewer attention to the face and eyes',
      '85mm lenses are popular for flattering perspective + blur',
    ],
  },
  {
    id: 2,
    title: 'Microscopy',
    description: 'Extreme shallow depth of field',
    icon: '🔬',
    details: [
      'High magnification means extremely shallow depth of field',
      'Only a thin slice of specimen is sharp at once',
      'Z-stacking combines multiple focal planes computationally',
      'Confocal microscopy uses this for 3D reconstruction',
    ],
  },
  {
    id: 3,
    title: 'Cinema',
    description: 'The "film look" through selective focus',
    icon: '🎬',
    details: [
      'Shallow depth of field guides audience attention',
      'Rack focus transitions between subjects dramatically',
      'Large format cameras (IMAX) have even shallower DOF',
      'Focus pulling is a skilled craft in filmmaking',
    ],
  },
  {
    id: 4,
    title: 'Computational Blur',
    description: 'How phones fake bokeh',
    icon: '📱',
    details: [
      'Depth sensing (dual cameras or LIDAR) maps scene distances',
      'Software applies variable blur based on depth',
      'Can simulate any aperture size or shape digitally',
      'Struggles with fine details like hair at edges',
    ],
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function DepthOfFieldRenderer({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}: DepthOfFieldRendererProps) {
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
  const [apertureSize, setApertureSize] = useState(50);
  const [subjectDistance, setSubjectDistance] = useState(100);
  const [focusDistance, setFocusDistance] = useState(100);
  const [showRayCone, setShowRayCone] = useState(true);
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
  const calculateCircleOfConfusion = useCallback((objectDist: number, focusDist: number, aperture: number): number => {
    // Simplified circle of confusion calculation
    // CoC proportional to aperture * |1/objectDist - 1/focusDist|
    const focusError = Math.abs(1 / objectDist - 1 / focusDist);
    return aperture * focusError * 500;
  }, []);

  const getBlurAmount = useCallback((distance: number): number => {
    return calculateCircleOfConfusion(distance, focusDistance, apertureSize);
  }, [calculateCircleOfConfusion, focusDistance, apertureSize]);

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
  // RAY CONE VISUALIZATION
  // =============================================================================
  const renderRayConeVisualization = useCallback(() => {
    const width = isMobile ? 320 : 550;
    const height = isMobile ? 350 : 400;

    // Scene setup
    const lensX = width * 0.5;
    const lensY = height * 0.5;
    const sensorX = width * 0.85;
    const apertureRadius = apertureSize * 0.3;

    // Calculate positions
    const subjectX = 50 + (subjectDistance / 200) * (lensX - 80);
    const backgroundX = 30;
    const foregroundX = lensX - 30;

    // Calculate where focused rays converge
    const focusedObjX = 50 + (focusDistance / 200) * (lensX - 80);

    // Calculate blur circles on sensor
    const subjectBlur = getBlurAmount(subjectDistance);
    const backgroundBlur = getBlurAmount(30); // Fixed far background
    const foregroundBlur = getBlurAmount(180); // Fixed near foreground

    // Determine if subject is in focus
    const subjectInFocus = Math.abs(subjectDistance - focusDistance) < 10;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: defined.spacing.md }}>
        <svg width={width} height={height} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="lensGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(147, 197, 253, 0.1)" />
              <stop offset="50%" stopColor="rgba(147, 197, 253, 0.4)" />
              <stop offset="100%" stopColor="rgba(147, 197, 253, 0.1)" />
            </linearGradient>
            <filter id="blurFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
            <radialGradient id="cocGradient">
              <stop offset="0%" stopColor="rgba(244, 114, 182, 0.8)" />
              <stop offset="100%" stopColor="rgba(244, 114, 182, 0)" />
            </radialGradient>
          </defs>

          {/* Background */}
          <rect width={width} height={height} fill={defined.colors.background.secondary} rx="12" />

          {/* Scene labels */}
          <text x="30" y="25" fill={defined.colors.text.muted} fontSize="11">Scene (objects)</text>
          <text x={lensX - 20} y="25" fill={defined.colors.text.muted} fontSize="11">Lens</text>
          <text x={sensorX - 20} y="25" fill={defined.colors.text.muted} fontSize="11">Sensor</text>

          {/* Optical axis */}
          <line x1="20" y1={lensY} x2={width - 20} y2={lensY} stroke={defined.colors.text.muted} strokeWidth="1" strokeDasharray="4,4" />

          {/* Lens representation */}
          <ellipse cx={lensX} cy={lensY} rx="8" ry={apertureRadius + 20} fill="url(#lensGradient)" stroke={defined.colors.lens.glass} strokeWidth="2" />

          {/* Aperture blades indicator */}
          <line x1={lensX} y1={lensY - apertureRadius} x2={lensX} y2={lensY - apertureRadius - 15} stroke={defined.colors.accent} strokeWidth="3" strokeLinecap="round" />
          <line x1={lensX} y1={lensY + apertureRadius} x2={lensX} y2={lensY + apertureRadius + 15} stroke={defined.colors.accent} strokeWidth="3" strokeLinecap="round" />

          {/* Sensor */}
          <rect x={sensorX - 5} y={lensY - 80} width="10" height="160" fill="#1F2937" stroke={defined.colors.text.muted} strokeWidth="1" rx="2" />

          {/* Background object (tree icon) */}
          <g transform={`translate(${backgroundX}, ${lensY})`}>
            <line x1="0" y1="0" x2="0" y2="-40" stroke="#166534" strokeWidth="4" />
            <circle cx="0" cy="-50" r="15" fill="#22C55E" opacity="0.7" />
            <text x="0" y="30" fill={defined.colors.text.muted} fontSize="9" textAnchor="middle">Far BG</text>
          </g>

          {/* Subject (person icon) */}
          <g transform={`translate(${subjectX}, ${lensY})`}>
            <circle cx="0" cy="-35" r="12" fill={subjectInFocus ? defined.colors.success : defined.colors.warning} />
            <line x1="0" y1="-23" x2="0" y2="10" stroke={subjectInFocus ? defined.colors.success : defined.colors.warning} strokeWidth="3" />
            <line x1="-15" y1="-10" x2="15" y2="-10" stroke={subjectInFocus ? defined.colors.success : defined.colors.warning} strokeWidth="3" />
            <text x="0" y="30" fill={defined.colors.text.secondary} fontSize="9" textAnchor="middle">Subject</text>
          </g>

          {/* Foreground object */}
          <g transform={`translate(${foregroundX}, ${lensY})`}>
            <rect x="-8" y="-20" width="16" height="30" fill="#F59E0B" opacity="0.7" rx="2" />
            <text x="0" y="30" fill={defined.colors.text.muted} fontSize="9" textAnchor="middle">Near FG</text>
          </g>

          {/* Focus distance indicator */}
          <g>
            <line x1={focusedObjX} y1={lensY + 60} x2={focusedObjX} y2={lensY + 80} stroke={defined.colors.success} strokeWidth="2" />
            <text x={focusedObjX} y={lensY + 95} fill={defined.colors.success} fontSize="10" textAnchor="middle">Focus plane</text>
          </g>

          {/* Ray cone from subject through lens */}
          {showRayCone && (
            <g opacity="0.7">
              {/* Top ray */}
              <line x1={subjectX} y1={lensY - 30} x2={lensX} y2={lensY - apertureRadius} stroke={defined.colors.lens.ray} strokeWidth="1.5" />
              {/* Bottom ray */}
              <line x1={subjectX} y1={lensY - 30} x2={lensX} y2={lensY + apertureRadius} stroke={defined.colors.lens.ray} strokeWidth="1.5" />

              {/* Rays to sensor - convergence depends on focus */}
              {subjectInFocus ? (
                <>
                  <line x1={lensX} y1={lensY - apertureRadius} x2={sensorX} y2={lensY - 20} stroke={defined.colors.lens.focus} strokeWidth="1.5" />
                  <line x1={lensX} y1={lensY + apertureRadius} x2={sensorX} y2={lensY - 20} stroke={defined.colors.lens.focus} strokeWidth="1.5" />
                  <circle cx={sensorX} cy={lensY - 20} r="4" fill={defined.colors.lens.focus} />
                  <text x={sensorX + 15} y={lensY - 15} fill={defined.colors.success} fontSize="9">Sharp</text>
                </>
              ) : (
                <>
                  <line x1={lensX} y1={lensY - apertureRadius} x2={sensorX} y2={lensY - 20 - subjectBlur / 2} stroke={defined.colors.lens.blur} strokeWidth="1.5" />
                  <line x1={lensX} y1={lensY + apertureRadius} x2={sensorX} y2={lensY - 20 + subjectBlur / 2} stroke={defined.colors.lens.blur} strokeWidth="1.5" />
                  <ellipse cx={sensorX} cy={lensY - 20} rx="3" ry={Math.max(4, subjectBlur / 2)} fill="url(#cocGradient)" />
                  <text x={sensorX + 15} y={lensY - 15} fill={defined.colors.lens.blur} fontSize="9">CoC</text>
                </>
              )}
            </g>
          )}

          {/* Circle of Confusion indicators on sensor */}
          <g transform={`translate(${sensorX}, ${lensY})`}>
            {/* Background blur circle */}
            <circle cx="0" cy="40" r={Math.max(2, Math.min(20, backgroundBlur / 2))} fill={defined.colors.lens.blur} opacity="0.5" />
            <text x="20" y="45" fill={defined.colors.text.muted} fontSize="8">BG blur</text>

            {/* Foreground blur circle */}
            <circle cx="0" cy="-50" r={Math.max(2, Math.min(15, foregroundBlur / 2))} fill={defined.colors.lens.blur} opacity="0.5" />
            <text x="20" y="-45" fill={defined.colors.text.muted} fontSize="8">FG blur</text>
          </g>

          {/* Aperture size label */}
          <text x={lensX} y={height - 15} fill={defined.colors.accent} fontSize="11" textAnchor="middle">
            Aperture: f/{(100 / apertureSize).toFixed(1)}
          </text>

          {/* Legend */}
          <g transform={`translate(20, ${height - 60})`}>
            <rect x="-5" y="-5" width="100" height="45" fill={defined.colors.background.card} rx="4" />
            <circle cx="10" cy="8" r="5" fill={defined.colors.lens.focus} />
            <text x="20" y="12" fill={defined.colors.text.secondary} fontSize="9">In focus</text>
            <circle cx="10" cy="28" r="5" fill={defined.colors.lens.blur} />
            <text x="20" y="32" fill={defined.colors.text.secondary} fontSize="9">Circle of confusion</text>
          </g>
        </svg>

        {/* Controls */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
          gap: defined.spacing.md,
          width: '100%',
          maxWidth: '550px',
        }}>
          <div style={{ background: defined.colors.background.card, padding: defined.spacing.md, borderRadius: defined.radius.lg }}>
            <label style={{ color: defined.colors.accent, fontSize: defined.typography.sizes.sm, display: 'block', marginBottom: '4px' }}>
              Aperture: f/{(100 / apertureSize).toFixed(1)}
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={apertureSize}
              onChange={(e) => setApertureSize(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.xs, marginTop: '4px' }}>
              {apertureSize > 60 ? 'Wide (shallow DOF)' : apertureSize > 30 ? 'Medium' : 'Narrow (deep DOF)'}
            </div>
          </div>
          <div style={{ background: defined.colors.background.card, padding: defined.spacing.md, borderRadius: defined.radius.lg }}>
            <label style={{ color: defined.colors.success, fontSize: defined.typography.sizes.sm, display: 'block', marginBottom: '4px' }}>
              Subject Distance: {subjectDistance}
            </label>
            <input
              type="range"
              min="50"
              max="180"
              value={subjectDistance}
              onChange={(e) => setSubjectDistance(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ background: defined.colors.background.card, padding: defined.spacing.md, borderRadius: defined.radius.lg }}>
            <label style={{ color: defined.colors.primary, fontSize: defined.typography.sizes.sm, display: 'block', marginBottom: '4px' }}>
              Focus Distance: {focusDistance}
            </label>
            <input
              type="range"
              min="50"
              max="180"
              value={focusDistance}
              onChange={(e) => setFocusDistance(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={() => setShowRayCone(!showRayCone)}
          style={{
            padding: `${defined.spacing.sm} ${defined.spacing.md}`,
            background: showRayCone ? defined.colors.primary : defined.colors.background.tertiary,
            color: defined.colors.text.primary,
            border: 'none',
            borderRadius: defined.radius.md,
            cursor: 'pointer',
            fontSize: defined.typography.sizes.sm,
          }}
        >
          {showRayCone ? 'Hide' : 'Show'} Ray Cone
        </button>
      </div>
    );
  }, [isMobile, apertureSize, subjectDistance, focusDistance, showRayCone, getBlurAmount]);

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
        <span style={{ color: defined.colors.primary, fontSize: defined.typography.sizes.sm }}>OPTICS & PHOTOGRAPHY</span>
      </div>

      <h1 style={{
        fontSize: isMobile ? defined.typography.sizes['2xl'] : defined.typography.sizes['3xl'],
        fontWeight: defined.typography.weights.bold,
        color: defined.colors.text.primary,
        marginBottom: defined.spacing.md,
      }}>
        What Actually Controls Blur: Zoom, Distance, or Aperture?
      </h1>

      <p style={{
        color: defined.colors.text.secondary,
        fontSize: defined.typography.sizes.lg,
        maxWidth: '500px',
        marginBottom: defined.spacing.xl,
      }}>
        Professional photos have creamy, blurred backgrounds. Phone cameras struggle to match this. Why?
      </p>

      <div style={{
        background: defined.colors.background.card,
        borderRadius: defined.radius.xl,
        padding: defined.spacing.xl,
        maxWidth: '400px',
        marginBottom: defined.spacing.xl,
      }}>
        <div style={{ fontSize: '4rem', marginBottom: defined.spacing.md }}>📷</div>
        <p style={{ color: defined.colors.text.primary, fontSize: defined.typography.sizes.base }}>
          The secret lies in geometry: how light rays form cones through the lens and spread into blur circles on the sensor.
        </p>
        <p style={{ color: defined.colors.lens.blur, marginTop: defined.spacing.md, fontWeight: defined.typography.weights.semibold }}>
          Understanding the "circle of confusion" unlocks the mystery!
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
        Master Depth of Field
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
          You want to photograph a flower with a blurred background. You can either: open your aperture wider, move closer to the flower, or both.
        </p>
        <p style={{ color: defined.colors.text.primary, fontWeight: defined.typography.weights.semibold }}>
          Which factor has the BIGGEST effect on background blur?
        </p>
      </div>

      {[
        { id: 'A', text: 'Aperture size (f-number)' },
        { id: 'B', text: 'Distance to subject' },
        { id: 'C', text: 'Focal length of lens' },
        { id: 'D', text: 'Sensor size' },
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
          background: prediction === 'A' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
          border: `1px solid ${prediction === 'A' ? defined.colors.success : defined.colors.warning}`,
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          marginTop: defined.spacing.lg,
        }}>
          <p style={{ color: prediction === 'A' ? defined.colors.success : defined.colors.warning, fontWeight: defined.typography.weights.semibold }}>
            {prediction === 'A' ? 'Correct!' : 'Good thinking, but...'}
          </p>
          <p style={{ color: defined.colors.text.secondary, marginTop: defined.spacing.sm }}>
            Aperture has the most direct effect. A wider aperture (like f/1.8) creates a larger cone of rays, which forms a larger blur circle (circle of confusion) for out-of-focus objects. All factors matter, but aperture is king!
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
        Depth of Field Lab
      </h2>
      <p style={{ color: defined.colors.text.secondary, textAlign: 'center', marginBottom: defined.spacing.lg }}>
        Adjust aperture, subject distance, and focus to see how blur circles form on the sensor.
      </p>

      {renderRayConeVisualization()}

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
          <li>Wider aperture = larger ray cone = bigger blur circles</li>
          <li>Objects at the focus distance form a point (no blur)</li>
          <li>Objects farther from focus plane have larger circles of confusion</li>
          <li>The blur circle shape matches the aperture shape</li>
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
        The Physics of Depth of Field
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: defined.spacing.md,
        marginBottom: defined.spacing.lg,
      }}>
        <div style={{ background: defined.colors.background.card, padding: defined.spacing.lg, borderRadius: defined.radius.lg }}>
          <h3 style={{ color: defined.colors.lens.blur, marginBottom: defined.spacing.sm }}>Circle of Confusion</h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            When a point is out of focus, light from it doesn't converge to a point on the sensor. Instead, it forms a disk. If this disk is small enough, we perceive it as sharp.
          </p>
        </div>
        <div style={{ background: defined.colors.background.card, padding: defined.spacing.lg, borderRadius: defined.radius.lg }}>
          <h3 style={{ color: defined.colors.accent, marginBottom: defined.spacing.sm }}>F-Number</h3>
          <p style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm }}>
            f-number = focal length / aperture diameter. Lower f-number means wider aperture, larger blur circles, shallower depth of field.
          </p>
        </div>
      </div>

      <div style={{ background: defined.colors.background.card, padding: defined.spacing.lg, borderRadius: defined.radius.lg, marginBottom: defined.spacing.lg }}>
        <h3 style={{ color: defined.colors.primary, marginBottom: defined.spacing.md, textAlign: 'center' }}>Depth of Field Factors</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: defined.spacing.md,
        }}>
          <div style={{ background: defined.colors.background.secondary, padding: defined.spacing.md, borderRadius: defined.radius.md, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: defined.spacing.xs }}>f/1.8</div>
            <p style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>Wide aperture<br/>Shallow DOF</p>
          </div>
          <div style={{ background: defined.colors.background.secondary, padding: defined.spacing.md, borderRadius: defined.radius.md, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: defined.spacing.xs }}>f/8</div>
            <p style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>Medium aperture<br/>Moderate DOF</p>
          </div>
          <div style={{ background: defined.colors.background.secondary, padding: defined.spacing.md, borderRadius: defined.radius.md, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: defined.spacing.xs }}>f/22</div>
            <p style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>Narrow aperture<br/>Deep DOF</p>
          </div>
        </div>
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
        The Twist: Distance Matters Too
      </h2>

      <div style={{
        background: defined.colors.background.card,
        borderRadius: defined.radius.lg,
        padding: defined.spacing.lg,
        marginBottom: defined.spacing.lg,
      }}>
        <p style={{ color: defined.colors.text.secondary, marginBottom: defined.spacing.md }}>
          You're photographing a person with a tree in the background. Without changing aperture, you walk closer to the person and refocus.
        </p>
        <p style={{ color: defined.colors.text.primary, fontWeight: defined.typography.weights.semibold }}>
          What happens to the background blur?
        </p>
      </div>

      {[
        { id: 'A', text: 'Background blur decreases (more in focus)' },
        { id: 'B', text: 'Background blur increases (more blurred)' },
        { id: 'C', text: 'Background blur stays the same' },
        { id: 'D', text: 'The background disappears' },
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
            {twistPrediction === 'B' ? 'Exactly right!' : 'Surprising, isn\'t it?'}
          </p>
          <p style={{ color: defined.colors.text.secondary, marginTop: defined.spacing.sm }}>
            Moving closer to the subject while maintaining focus on them increases the angular difference to the background. This makes the background's circle of confusion larger - more blur!
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
            Test This Effect
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ padding: defined.spacing.lg }}>
      <h2 style={{ color: defined.colors.secondary, textAlign: 'center', marginBottom: defined.spacing.md }}>
        Distance and Background Blur
      </h2>
      <p style={{ color: defined.colors.text.secondary, textAlign: 'center', marginBottom: defined.spacing.lg }}>
        Keep aperture constant. Move the subject closer while keeping it in focus. Watch the background blur!
      </p>

      {renderRayConeVisualization()}

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
          <h4 style={{ color: defined.colors.success, marginBottom: defined.spacing.sm }}>Closer to Subject</h4>
          <ul style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm, paddingLeft: defined.spacing.md }}>
            <li>Larger subject in frame</li>
            <li>Background becomes more blurred</li>
            <li>Shallower effective DOF</li>
          </ul>
        </div>
        <div style={{
          background: 'rgba(96, 165, 250, 0.1)',
          border: `1px solid ${defined.colors.lens.ray}`,
          borderRadius: defined.radius.lg,
          padding: defined.spacing.md,
        }}>
          <h4 style={{ color: defined.colors.lens.ray, marginBottom: defined.spacing.sm }}>Farther from Subject</h4>
          <ul style={{ color: defined.colors.text.secondary, fontSize: defined.typography.sizes.sm, paddingLeft: defined.spacing.md }}>
            <li>Smaller subject in frame</li>
            <li>Background becomes less blurred</li>
            <li>Deeper effective DOF</li>
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
        Key Discovery: It's All About Angles
      </h2>

      <div style={{ background: defined.colors.background.card, padding: defined.spacing.lg, borderRadius: defined.radius.lg, marginBottom: defined.spacing.lg }}>
        <h3 style={{ color: defined.colors.primary, marginBottom: defined.spacing.md }}>Three Ways to Increase Background Blur</h3>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: defined.spacing.md }}>
          <div style={{ background: defined.colors.background.secondary, padding: defined.spacing.md, borderRadius: defined.radius.md, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: defined.spacing.xs }}>1</div>
            <h4 style={{ color: defined.colors.accent }}>Open Aperture</h4>
            <p style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>f/2.8 to f/1.4</p>
          </div>
          <div style={{ background: defined.colors.background.secondary, padding: defined.spacing.md, borderRadius: defined.radius.md, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: defined.spacing.xs }}>2</div>
            <h4 style={{ color: defined.colors.success }}>Move Closer</h4>
            <p style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>Increases angle to BG</p>
          </div>
          <div style={{ background: defined.colors.background.secondary, padding: defined.spacing.md, borderRadius: defined.radius.md, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: defined.spacing.xs }}>3</div>
            <h4 style={{ color: defined.colors.lens.ray }}>Longer Lens</h4>
            <p style={{ color: defined.colors.text.muted, fontSize: defined.typography.sizes.sm }}>Compresses perspective</p>
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
              {passed ? 'You\'ve mastered depth of field!' : 'Review the material and try again.'}
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
        Depth of Field Master!
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
          You understand how aperture, distance, and focus create depth of field!
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
          <li>Circle of confusion determines perceived sharpness</li>
          <li>Wider aperture = shallower depth of field</li>
          <li>Closer subject = more background blur</li>
          <li>Bokeh quality depends on aperture shape and lens design</li>
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
            Depth of Field
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
