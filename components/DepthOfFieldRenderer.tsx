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
  // RAY CONE VISUALIZATION - Premium SVG Graphics
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

    // Bokeh particles for out-of-focus areas
    const bokehParticles = [];
    const bokehCount = Math.floor(apertureSize / 10);
    for (let i = 0; i < bokehCount; i++) {
      bokehParticles.push({
        x: 20 + Math.random() * 60,
        y: lensY - 80 + Math.random() * 160,
        r: 3 + Math.random() * 8,
        opacity: 0.1 + Math.random() * 0.3,
      });
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: defined.spacing.md }}>
        {/* SVG Labels moved outside */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: width,
          paddingLeft: '20px',
          paddingRight: '20px',
        }}>
          <span style={{ color: defined.colors.text.muted, fontSize: typo.label }}>Scene (objects)</span>
          <span style={{ color: defined.colors.text.muted, fontSize: typo.label }}>Lens</span>
          <span style={{ color: defined.colors.text.muted, fontSize: typo.label }}>Sensor</span>
        </div>

        <svg width={width} height={height - 30} style={{ overflow: 'visible' }}>
          <defs>
            {/* Premium lab background gradient */}
            <linearGradient id="dofLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0a0f1a" />
              <stop offset="25%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="75%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#0a0f1a" />
            </linearGradient>

            {/* Camera lens glass gradient with depth */}
            <radialGradient id="dofLensGlass" cx="30%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.4" />
              <stop offset="20%" stopColor="#67e8f9" stopOpacity="0.3" />
              <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.2" />
              <stop offset="80%" stopColor="#0891b2" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0e7490" stopOpacity="0.1" />
            </radialGradient>

            {/* Lens edge metallic gradient */}
            <linearGradient id="dofLensMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="25%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="75%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Aperture blade gradient */}
            <linearGradient id="dofApertureBlades" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e1e1e" />
              <stop offset="20%" stopColor="#3f3f3f" />
              <stop offset="50%" stopColor="#2a2a2a" />
              <stop offset="80%" stopColor="#3f3f3f" />
              <stop offset="100%" stopColor="#1e1e1e" />
            </linearGradient>

            {/* Focus plane glow gradient */}
            <linearGradient id="dofFocusPlane" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
              <stop offset="20%" stopColor="#22c55e" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#4ade80" stopOpacity="0.6" />
              <stop offset="80%" stopColor="#22c55e" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>

            {/* Sensor gradient */}
            <linearGradient id="dofSensorGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="30%" stopColor="#374151" />
              <stop offset="50%" stopColor="#4b5563" />
              <stop offset="70%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Circle of confusion blur gradient */}
            <radialGradient id="dofCoCGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f472b6" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#ec4899" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#db2777" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#be185d" stopOpacity="0" />
            </radialGradient>

            {/* Sharp focus point gradient */}
            <radialGradient id="dofSharpFocus" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#86efac" stopOpacity="1" />
              <stop offset="40%" stopColor="#4ade80" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#22c55e" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
            </radialGradient>

            {/* Ray beam gradient - incoming */}
            <linearGradient id="dofRayIn" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="1" />
            </linearGradient>

            {/* Ray beam gradient - to sensor (focused) */}
            <linearGradient id="dofRayFocused" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
              <stop offset="50%" stopColor="#22c55e" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0.6" />
            </linearGradient>

            {/* Ray beam gradient - to sensor (blurred) */}
            <linearGradient id="dofRayBlurred" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f472b6" stopOpacity="1" />
              <stop offset="50%" stopColor="#ec4899" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#db2777" stopOpacity="0.6" />
            </linearGradient>

            {/* Bokeh circle gradient */}
            <radialGradient id="dofBokeh" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#d97706" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
            </radialGradient>

            {/* Subject glow gradient */}
            <radialGradient id="dofSubjectGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={subjectInFocus ? '#86efac' : '#fcd34d'} stopOpacity="1" />
              <stop offset="50%" stopColor={subjectInFocus ? '#4ade80' : '#fbbf24'} stopOpacity="0.6" />
              <stop offset="100%" stopColor={subjectInFocus ? '#22c55e' : '#f59e0b'} stopOpacity="0" />
            </radialGradient>

            {/* Tree foliage gradient */}
            <radialGradient id="dofTreeFoliage" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#22c55e" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#16a34a" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#15803d" stopOpacity="0.3" />
            </radialGradient>

            {/* Foreground object gradient */}
            <linearGradient id="dofForegroundObj" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="30%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Glow filter for lens */}
            <filter id="dofLensGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glow filter for focus point */}
            <filter id="dofFocusGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft blur for bokeh effect */}
            <filter id="dofBokehBlur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" />
            </filter>

            {/* Ray glow filter */}
            <filter id="dofRayGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft glow for subject */}
            <filter id="dofSubjectFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* CoC blur filter */}
            <filter id="dofCoCBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Premium dark lab background */}
          <rect width={width} height={height - 30} fill="url(#dofLabBg)" rx="12" />

          {/* Subtle grid pattern for depth */}
          <pattern id="dofLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.2" />
          </pattern>
          <rect width={width} height={height - 30} fill="url(#dofLabGrid)" rx="12" />

          {/* Bokeh particles in background (out-of-focus aesthetic) */}
          <g filter="url(#dofBokehBlur)">
            {bokehParticles.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="url(#dofBokeh)" opacity={p.opacity} />
            ))}
          </g>

          {/* Optical axis with gradient effect */}
          <line x1="20" y1={lensY} x2={width - 20} y2={lensY} stroke="#475569" strokeWidth="1" strokeDasharray="6,4" opacity="0.6" />

          {/* Focus plane visualization */}
          <rect x={focusedObjX - 2} y={lensY - 70} width="4" height="140" fill="url(#dofFocusPlane)" opacity="0.5" />

          {/* Camera lens body - outer ring */}
          <ellipse cx={lensX} cy={lensY} rx="18" ry={apertureRadius + 35} fill="url(#dofLensMetal)" stroke="#1e293b" strokeWidth="2" />

          {/* Camera lens - glass element */}
          <ellipse cx={lensX} cy={lensY} rx="12" ry={apertureRadius + 25} fill="url(#dofLensGlass)" filter="url(#dofLensGlow)" stroke="#67e8f9" strokeWidth="1" strokeOpacity="0.5" />

          {/* Aperture opening visualization */}
          <ellipse cx={lensX} cy={lensY} rx="4" ry={apertureRadius} fill="#030712" stroke="url(#dofApertureBlades)" strokeWidth="2" />

          {/* Aperture blades indicator - top */}
          <g>
            <line x1={lensX - 6} y1={lensY - apertureRadius - 3} x2={lensX + 6} y2={lensY - apertureRadius - 3} stroke="#1e1e1e" strokeWidth="4" strokeLinecap="round" />
            <line x1={lensX - 4} y1={lensY - apertureRadius - 3} x2={lensX + 4} y2={lensY - apertureRadius - 3} stroke="#4b4b4b" strokeWidth="2" strokeLinecap="round" />
          </g>
          {/* Aperture blades indicator - bottom */}
          <g>
            <line x1={lensX - 6} y1={lensY + apertureRadius + 3} x2={lensX + 6} y2={lensY + apertureRadius + 3} stroke="#1e1e1e" strokeWidth="4" strokeLinecap="round" />
            <line x1={lensX - 4} y1={lensY + apertureRadius + 3} x2={lensX + 4} y2={lensY + apertureRadius + 3} stroke="#4b4b4b" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Sensor with premium gradient */}
          <rect x={sensorX - 6} y={lensY - 80} width="12" height="160" fill="url(#dofSensorGradient)" stroke="#6b7280" strokeWidth="1" rx="2" />
          {/* Sensor active area glow */}
          <rect x={sensorX - 4} y={lensY - 75} width="8" height="150" fill="#1f2937" stroke="#4b5563" strokeWidth="0.5" rx="1" opacity="0.8" />

          {/* Background object (tree icon) with gradient */}
          <g transform={`translate(${backgroundX}, ${lensY})`} filter="url(#dofBokehBlur)">
            <line x1="0" y1="0" x2="0" y2="-40" stroke="#166534" strokeWidth="5" strokeLinecap="round" />
            <circle cx="0" cy="-50" r="18" fill="url(#dofTreeFoliage)" />
            <circle cx="-8" cy="-42" r="10" fill="url(#dofTreeFoliage)" opacity="0.8" />
            <circle cx="8" cy="-42" r="10" fill="url(#dofTreeFoliage)" opacity="0.8" />
          </g>

          {/* Subject (person icon) with glow */}
          <g transform={`translate(${subjectX}, ${lensY})`} filter="url(#dofSubjectFilter)">
            <circle cx="0" cy="-35" r="14" fill="url(#dofSubjectGlow)" />
            <circle cx="0" cy="-35" r="10" fill={subjectInFocus ? '#4ade80' : '#fbbf24'} />
            <line x1="0" y1="-21" x2="0" y2="12" stroke={subjectInFocus ? '#22c55e' : '#f59e0b'} strokeWidth="4" strokeLinecap="round" />
            <line x1="-16" y1="-8" x2="16" y2="-8" stroke={subjectInFocus ? '#22c55e' : '#f59e0b'} strokeWidth="4" strokeLinecap="round" />
            <line x1="-8" y1="12" x2="-12" y2="30" stroke={subjectInFocus ? '#22c55e' : '#f59e0b'} strokeWidth="3" strokeLinecap="round" />
            <line x1="8" y1="12" x2="12" y2="30" stroke={subjectInFocus ? '#22c55e' : '#f59e0b'} strokeWidth="3" strokeLinecap="round" />
          </g>

          {/* Foreground object with gradient */}
          <g transform={`translate(${foregroundX}, ${lensY})`} filter="url(#dofBokehBlur)">
            <rect x="-10" y="-25" width="20" height="40" fill="url(#dofForegroundObj)" rx="3" />
            <rect x="-6" y="-20" width="12" height="30" fill="#fcd34d" opacity="0.4" rx="2" />
          </g>

          {/* Ray cone from subject through lens */}
          {showRayCone && (
            <g>
              {/* Top ray - incoming */}
              <line x1={subjectX} y1={lensY - 30} x2={lensX} y2={lensY - apertureRadius} stroke="url(#dofRayIn)" strokeWidth="2" filter="url(#dofRayGlow)" />
              {/* Bottom ray - incoming */}
              <line x1={subjectX} y1={lensY - 30} x2={lensX} y2={lensY + apertureRadius} stroke="url(#dofRayIn)" strokeWidth="2" filter="url(#dofRayGlow)" />

              {/* Rays to sensor - convergence depends on focus */}
              {subjectInFocus ? (
                <g>
                  <line x1={lensX} y1={lensY - apertureRadius} x2={sensorX} y2={lensY - 20} stroke="url(#dofRayFocused)" strokeWidth="2" filter="url(#dofRayGlow)" />
                  <line x1={lensX} y1={lensY + apertureRadius} x2={sensorX} y2={lensY - 20} stroke="url(#dofRayFocused)" strokeWidth="2" filter="url(#dofRayGlow)" />
                  <circle cx={sensorX} cy={lensY - 20} r="6" fill="url(#dofSharpFocus)" filter="url(#dofFocusGlow)" />
                </g>
              ) : (
                <g>
                  <line x1={lensX} y1={lensY - apertureRadius} x2={sensorX} y2={lensY - 20 - subjectBlur / 2} stroke="url(#dofRayBlurred)" strokeWidth="2" filter="url(#dofRayGlow)" />
                  <line x1={lensX} y1={lensY + apertureRadius} x2={sensorX} y2={lensY - 20 + subjectBlur / 2} stroke="url(#dofRayBlurred)" strokeWidth="2" filter="url(#dofRayGlow)" />
                  <ellipse cx={sensorX} cy={lensY - 20} rx="5" ry={Math.max(6, subjectBlur / 2)} fill="url(#dofCoCGradient)" filter="url(#dofCoCBlur)" />
                </g>
              )}
            </g>
          )}

          {/* Circle of Confusion indicators on sensor */}
          <g transform={`translate(${sensorX}, ${lensY})`}>
            {/* Background blur circle */}
            <circle cx="0" cy="40" r={Math.max(3, Math.min(22, backgroundBlur / 2))} fill="url(#dofCoCGradient)" filter="url(#dofCoCBlur)" opacity="0.7" />
            {/* Foreground blur circle */}
            <circle cx="0" cy="-50" r={Math.max(3, Math.min(18, foregroundBlur / 2))} fill="url(#dofCoCGradient)" filter="url(#dofCoCBlur)" opacity="0.7" />
          </g>
        </svg>

        {/* Labels moved outside SVG using typo system */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          width: '100%',
          maxWidth: width,
          marginTop: '-8px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ color: defined.colors.text.muted, fontSize: typo.label }}>Far BG</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ color: defined.colors.text.secondary, fontSize: typo.label }}>Subject</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ color: defined.colors.text.muted, fontSize: typo.label }}>Near FG</span>
          </div>
          <div style={{ textAlign: 'center', marginLeft: 'auto' }}>
            <span style={{ color: defined.colors.text.muted, fontSize: typo.label }}>BG blur</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ color: defined.colors.text.muted, fontSize: typo.label }}>FG blur</span>
          </div>
        </div>

        {/* Focus plane and sharp/blur status */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: defined.spacing.lg,
          width: '100%',
          maxWidth: width,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: defined.colors.success }} />
            <span style={{ color: defined.colors.text.secondary, fontSize: typo.small }}>Focus plane</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: subjectInFocus ? defined.colors.success : defined.colors.warning }} />
            <span style={{ color: subjectInFocus ? defined.colors.success : defined.colors.warning, fontSize: typo.small }}>
              {subjectInFocus ? 'Sharp' : 'Circle of Confusion'}
            </span>
          </div>
        </div>

        {/* Aperture indicator */}
        <div style={{
          background: defined.colors.background.card,
          borderRadius: defined.radius.lg,
          padding: `${defined.spacing.sm} ${defined.spacing.md}`,
          display: 'flex',
          alignItems: 'center',
          gap: defined.spacing.md,
        }}>
          <span style={{ color: defined.colors.accent, fontSize: typo.body, fontWeight: defined.typography.weights.semibold }}>
            Aperture: f/{(100 / apertureSize).toFixed(1)}
          </span>
          <span style={{ color: defined.colors.text.muted, fontSize: typo.label }}>
            {apertureSize > 60 ? '(Wide - Shallow DOF)' : apertureSize > 30 ? '(Medium)' : '(Narrow - Deep DOF)'}
          </span>
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex',
          gap: defined.spacing.md,
          background: defined.colors.background.card,
          padding: defined.spacing.sm,
          borderRadius: defined.radius.md,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'linear-gradient(135deg, #86efac 0%, #22c55e 100%)' }} />
            <span style={{ color: defined.colors.text.secondary, fontSize: typo.label }}>In focus</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)' }} />
            <span style={{ color: defined.colors.text.secondary, fontSize: typo.label }}>Circle of confusion</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
          gap: defined.spacing.md,
          width: '100%',
          maxWidth: '550px',
        }}>
          <div style={{ background: defined.colors.background.card, padding: defined.spacing.md, borderRadius: defined.radius.lg }}>
            <label style={{ color: defined.colors.accent, fontSize: typo.small, display: 'block', marginBottom: '4px' }}>
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
            <div style={{ color: defined.colors.text.muted, fontSize: typo.label, marginTop: '4px' }}>
              {apertureSize > 60 ? 'Wide (shallow DOF)' : apertureSize > 30 ? 'Medium' : 'Narrow (deep DOF)'}
            </div>
          </div>
          <div style={{ background: defined.colors.background.card, padding: defined.spacing.md, borderRadius: defined.radius.lg }}>
            <label style={{ color: defined.colors.success, fontSize: typo.small, display: 'block', marginBottom: '4px' }}>
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
            <label style={{ color: defined.colors.primary, fontSize: typo.small, display: 'block', marginBottom: '4px' }}>
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
            background: showRayCone ? `linear-gradient(135deg, ${defined.colors.primary}, ${defined.colors.primaryDark})` : defined.colors.background.tertiary,
            color: defined.colors.text.primary,
            border: 'none',
            borderRadius: defined.radius.md,
            cursor: 'pointer',
            fontSize: typo.small,
            boxShadow: showRayCone ? `0 4px 15px ${defined.colors.primary}40` : 'none',
          }}
        >
          {showRayCone ? 'Hide' : 'Show'} Ray Cone
        </button>
      </div>
    );
  }, [isMobile, apertureSize, subjectDistance, focusDistance, showRayCone, getBlurAmount, typo]);

  // =============================================================================
  // TEST QUESTIONS DATA - Scenario-based multiple choice questions
  // =============================================================================
  const testQuestions = [
    {
      scenario: "A photography student is learning about depth of field and wants to understand what physically creates the blur in out-of-focus areas.",
      question: "What is the primary factor that determines depth of field in a photograph?",
      options: [
        { id: 'a', label: 'The resolution of the camera sensor' },
        { id: 'b', label: 'The aperture size relative to focal length', correct: true },
        { id: 'c', label: 'The shutter speed setting' },
        { id: 'd', label: 'The ISO sensitivity' }
      ],
      explanation: "Depth of field is primarily determined by the aperture size (f-number). A wider aperture (lower f-number) creates a larger cone of light rays passing through the lens, which spreads into larger circles of confusion for out-of-focus objects, resulting in shallower depth of field."
    },
    {
      scenario: "A portrait photographer wants to capture a headshot with a beautifully blurred background that separates the subject from distracting elements.",
      question: "Which aperture setting should they choose for maximum background blur?",
      options: [
        { id: 'a', label: 'f/16 for maximum sharpness throughout' },
        { id: 'b', label: 'f/8 as a balanced middle ground' },
        { id: 'c', label: 'f/1.8 for shallow depth of field', correct: true },
        { id: 'd', label: 'f/22 to capture more detail' }
      ],
      explanation: "f/1.8 creates a wide aperture opening, producing a large cone of light rays. This results in bigger circles of confusion for the background, creating creamy bokeh that isolates the subject. Portrait photographers commonly use f/1.4 to f/2.8 for this effect."
    },
    {
      scenario: "A landscape photographer is shooting a mountain scene and wants everything from nearby wildflowers to distant peaks to be sharp.",
      question: "What camera settings and technique should they use?",
      options: [
        { id: 'a', label: 'Wide aperture (f/2.8) focused on infinity' },
        { id: 'b', label: 'Narrow aperture (f/11-f/16) focused at hyperfocal distance', correct: true },
        { id: 'c', label: 'Any aperture focused on the flowers' },
        { id: 'd', label: 'Maximum aperture with image stabilization' }
      ],
      explanation: "A narrow aperture (f/11-f/16) minimizes the circle of confusion size, extending depth of field. Focusing at the hyperfocal distance maximizes sharpness from half that distance to infinity, ensuring both foreground flowers and distant mountains are acceptably sharp."
    },
    {
      scenario: "A macro photographer is shooting a tiny insect at 1:1 magnification and notices that even at f/16, only a thin slice of the subject is in focus.",
      question: "Why is depth of field so extremely shallow in macro photography?",
      options: [
        { id: 'a', label: 'Macro lenses have defective optics' },
        { id: 'b', label: 'The close focusing distance dramatically reduces depth of field', correct: true },
        { id: 'c', label: 'Small subjects always appear blurry' },
        { id: 'd', label: 'Camera sensors struggle with close objects' }
      ],
      explanation: "At macro distances, the subject is extremely close to the lens, which dramatically increases the angular spread of light rays from any point. This creates larger circles of confusion even at narrow apertures, resulting in razor-thin depth of field measured in millimeters."
    },
    {
      scenario: "A smartphone user wonders why their phone's 'Portrait Mode' uses computational processing while their friend's DSLR creates natural background blur.",
      question: "Why do smartphones struggle to create optical background blur like DSLRs?",
      options: [
        { id: 'a', label: 'Smartphone cameras have lower megapixel counts' },
        { id: 'b', label: 'Their small sensors and short focal lengths create deep depth of field naturally', correct: true },
        { id: 'c', label: 'Smartphones only use digital zoom' },
        { id: 'd', label: 'Phone apps are not optimized for bokeh' }
      ],
      explanation: "Smartphones have tiny sensors requiring very short focal lengths (typically 4-6mm equivalent). The combination of small sensor and short focal length creates inherently deep depth of field. DSLRs with larger sensors use longer focal lengths at equivalent fields of view, enabling shallow depth of field optically."
    },
    {
      scenario: "A landscape photographer learns about hyperfocal distance and wants to maximize the depth of field in their 35mm lens shot at f/11.",
      question: "What is the hyperfocal distance technique and how does it work?",
      options: [
        { id: 'a', label: 'Focusing on the closest object in frame' },
        { id: 'b', label: 'Focusing at infinity for distant sharpness' },
        { id: 'c', label: 'Focusing at a specific distance where everything from half that distance to infinity appears sharp', correct: true },
        { id: 'd', label: 'Using autofocus to find the best focus point' }
      ],
      explanation: "The hyperfocal distance is the focus distance that maximizes depth of field. When focused at this distance, acceptable sharpness extends from half the hyperfocal distance to infinity. It's calculated based on focal length, aperture, and the acceptable circle of confusion size for the format."
    },
    {
      scenario: "An optical engineer is designing a camera system and must specify the maximum acceptable circle of confusion for their sensor.",
      question: "What is the circle of confusion and why does it matter for depth of field?",
      options: [
        { id: 'a', label: 'A lens aberration that reduces image quality' },
        { id: 'b', label: 'The blur disk formed when light from an out-of-focus point spreads on the sensor', correct: true },
        { id: 'c', label: 'The area of the lens that light passes through' },
        { id: 'd', label: 'A measurement of lens sharpness at the center' }
      ],
      explanation: "When a point is out of focus, light rays don't converge to a single point on the sensor but form a disk called the circle of confusion. If this disk is smaller than the sensor's resolving ability, we perceive it as sharp. This threshold defines the boundaries of acceptable depth of field."
    },
    {
      scenario: "A cinematographer is filming a dialogue scene and needs to shift audience attention from one actor to another mid-shot without cutting.",
      question: "What technique uses depth of field to guide viewer attention in cinema?",
      options: [
        { id: 'a', label: 'Zooming between subjects' },
        { id: 'b', label: 'Rack focus or focus pulling between sharp and blurred subjects', correct: true },
        { id: 'c', label: 'Changing the aperture during the shot' },
        { id: 'd', label: 'Moving the camera closer to subjects' }
      ],
      explanation: "Rack focus (focus pulling) smoothly shifts focus between subjects at different distances. Using shallow depth of field, only one subject is sharp at a time. A skilled focus puller adjusts focus during the shot, directing audience attention by making the intended subject sharp while others blur."
    },
    {
      scenario: "An architectural photographer is using a tilt-shift lens to photograph a tall building while keeping the entire facade sharp despite the camera angle.",
      question: "How do tilt-shift lenses manipulate depth of field differently than standard lenses?",
      options: [
        { id: 'a', label: 'They use larger apertures for more light' },
        { id: 'b', label: 'They tilt the focus plane so it no longer parallels the sensor', correct: true },
        { id: 'c', label: 'They digitally extend the depth of field' },
        { id: 'd', label: 'They reduce the circle of confusion size' }
      ],
      explanation: "Tilt-shift lenses can angle the focus plane relative to the sensor using the Scheimpflug principle. This allows the plane of focus to align with non-parallel surfaces like building facades or tables, achieving sharp focus across subjects at varying distances without stopping down to tiny apertures."
    },
    {
      scenario: "A smartphone manufacturer is developing a new Portrait Mode feature that simulates DSLR-like background blur using dual cameras and AI processing.",
      question: "How does computational bokeh work in modern smartphones?",
      options: [
        { id: 'a', label: 'By using larger physical apertures in the lens' },
        { id: 'b', label: 'By capturing depth information and applying variable blur based on distance from subject', correct: true },
        { id: 'c', label: 'By mechanically adjusting the sensor position' },
        { id: 'd', label: 'By using optical zoom to compress perspective' }
      ],
      explanation: "Computational bokeh uses depth sensing (from dual cameras, structured light, or LIDAR) to create a depth map of the scene. Software then applies progressive blur based on each pixel's distance from the focused subject, simulating optical bokeh. Challenges include accurate edge detection around fine details like hair."
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
