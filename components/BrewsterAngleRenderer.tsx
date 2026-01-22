'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// BREWSTER ANGLE RENDERER - GLARE ELIMINATION
// Premium 10-screen educational game following WaveParticleDualityRenderer pattern
// ============================================================================

interface BrewsterAngleRendererProps {
  width?: number;
  height?: number;
  onBack?: () => void;
  metadata?: {
    currentPhase?: number;
    showPrediction?: boolean;
    showQuiz?: boolean;
  };
}

// Premium Design System
const colors = {
  background: '#0a0f1a',
  cardBg: '#141e2c',
  primary: '#60a5fa',
  secondary: '#818cf8',
  accent: '#f472b6',
  success: '#34d399',
  warning: '#fbbf24',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  border: '#1e3a5f',
  gradientStart: '#1e3a8a',
  gradientEnd: '#7c3aed',
};

const typography = {
  h1: { fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em' },
  h2: { fontSize: '22px', fontWeight: '600', letterSpacing: '-0.01em' },
  h3: { fontSize: '18px', fontWeight: '600' },
  body: { fontSize: '16px', fontWeight: '400', lineHeight: '1.6' },
  small: { fontSize: '14px', fontWeight: '400' },
};

const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
const radius = { sm: 8, md: 12, lg: 16, xl: 24 };

// ============================================================================
// GAME CONTENT DATA
// ============================================================================

// Numeric phases: 0=hook, 1=predict, 2=play, 3=review, 4=twist_predict, 5=twist_play, 6=twist_review, 7=transfer, 8=test, 9=mastery
const PHASES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const phaseLabels: Record<number, string> = {
  0: 'Hook', 1: 'Predict', 2: 'Lab', 3: 'Review', 4: 'Twist Predict',
  5: 'Twist Lab', 6: 'Twist Review', 7: 'Transfer', 8: 'Test', 9: 'Mastery'
};

// Common materials and their refractive indices
const materials: Record<string, { name: string; n: number; color: string }> = {
  glass: { name: 'Glass', n: 1.52, color: '#88c0d0' },
  water: { name: 'Water', n: 1.33, color: '#5e81ac' },
  diamond: { name: 'Diamond', n: 2.42, color: '#d8dee9' },
  plastic: { name: 'Acrylic', n: 1.49, color: '#a3be8c' },
};

const predictions = {
  initial: {
    question: "You're at a lake on a sunny day. There's horrible glare on the water. You put on polarized sunglasses, but then you notice something strange - at one specific angle when you look at the water, the glare is COMPLETELY eliminated, not just reduced. What's happening?",
    options: [
      { id: 'a', text: 'The sunglasses are focusing at that exact spot', icon: '🔍' },
      { id: 'b', text: 'The water surface is different at that angle', icon: '🌊' },
      { id: 'c', text: 'Light reflecting at that angle is perfectly polarized', icon: '⚡' },
      { id: 'd', text: 'Your eyes adjust better at that viewing angle', icon: '👁️' },
    ],
    correct: 'c',
    explanation: "At Brewster's angle (about 53° for water), reflected light becomes 100% horizontally polarized. Your vertical polarized sunglasses can then block it completely! This magic angle was discovered by Sir David Brewster in 1815."
  },
  twist: {
    question: "Photographers use Brewster's angle with a different trick: instead of blocking glare, they can maximize or minimize reflections by rotating their polarizing filter. What determines if they see MORE or LESS reflection?",
    options: [
      { id: 'a', text: 'The thickness of the filter', icon: '📏' },
      { id: 'b', text: 'The rotation angle of the polarizing filter', icon: '🔄' },
      { id: 'c', text: 'How close they are to the subject', icon: '📸' },
      { id: 'd', text: 'The color of the reflected light', icon: '🌈' },
    ],
    correct: 'b',
    explanation: "Since reflection at Brewster's angle is 100% polarized, rotating the polarizer lets photographers dial the reflection from 0% to maximum. Horizontal filter = maximum reflection. Vertical filter = zero reflection. It's like having a reflection volume knob!"
  }
};

const realWorldApplications = [
  {
    id: 'photography',
    title: '📸 Landscape Photography',
    subtitle: 'Control reflections like magic',
    description: 'Photographers use circular polarizing filters at Brewster\'s angle to either eliminate or enhance reflections. They can make water crystal clear to see the bottom, or enhance window reflections for artistic effect.',
    formula: 'θ_B = arctan(n₂/n₁) ≈ 53° for water, 56° for glass',
    realExample: 'Shooting through glass? Position yourself at 56° to the glass and rotate your polarizer - reflections vanish!',
    interactiveHint: 'Next time you see photos of crystal-clear lake bottoms, the photographer used this exact technique!'
  },
  {
    id: 'sunglasses',
    title: '🕶️ Premium Sunglasses',
    subtitle: 'Why viewing angle matters',
    description: 'Polarized sunglasses work best when you\'re looking at surfaces at angles close to Brewster\'s angle. Road glare, water glare, and snow glare often occur near these angles because of how the sun sits in the sky.',
    formula: 'Horizontal surfaces + sun position → Light hits near Brewster\'s angle',
    realExample: 'In the morning/evening when sun is lower, glare from roads becomes more polarized - exactly when polarized sunglasses help most!',
    interactiveHint: 'Try tilting your head with polarized sunglasses - the glare blocking changes!'
  },
  {
    id: 'lasers',
    title: '⚡ Laser Windows',
    subtitle: 'Zero reflection entry',
    description: 'High-power lasers need to enter optical systems without any light bouncing back (reflections could damage the laser). Brewster windows are tilted at exactly Brewster\'s angle so p-polarized light passes with zero reflection.',
    formula: 'At θ_B: R_p = 0%, meaning 100% transmission for p-polarized light',
    realExample: 'Gas lasers like helium-neon lasers use Brewster windows - that\'s why their output is polarized!',
    interactiveHint: 'The windows on laser tubes are tilted at that exact angle for this reason.'
  },
  {
    id: 'displays',
    title: '📱 Display Technology',
    subtitle: 'Anti-glare engineering',
    description: 'Engineers designing outdoor displays consider Brewster\'s angle when adding anti-reflective coatings. Understanding polarization of reflected light helps design screens that work better in bright sunlight.',
    formula: 'Multi-layer coatings exploit interference + polarization effects',
    realExample: 'E-readers with matte screens are designed considering typical viewing angles and Brewster reflection.',
    interactiveHint: 'Notice how phone screens are harder to see at certain angles in sunlight? That\'s Brewster at work!'
  }
];

const quizQuestions = [
  {
    question: "What is Brewster's angle?",
    options: [
      "The angle where all light is absorbed",
      "The angle where reflected light is completely polarized",
      "The angle where light splits into colors",
      "The angle of total internal reflection"
    ],
    correct: 1,
    explanation: "Brewster's angle is the specific angle where light reflecting off a surface becomes 100% polarized in one direction (parallel to the surface)."
  },
  {
    question: "What is the formula for Brewster's angle?",
    options: [
      "θ_B = sin⁻¹(n₂/n₁)",
      "θ_B = cos⁻¹(n₂/n₁)",
      "θ_B = tan⁻¹(n₂/n₁)",
      "θ_B = n₁/n₂"
    ],
    correct: 2,
    explanation: "Brewster's angle is calculated as θ_B = arctan(n₂/n₁), where n₁ is the refractive index of the first medium (usually air) and n₂ is the second medium."
  },
  {
    question: "For glass (n=1.52) in air, what is Brewster's angle approximately?",
    options: ["35°", "42°", "53°", "57°"],
    correct: 3,
    explanation: "θ_B = arctan(1.52/1.0) ≈ 56.7°, approximately 57°. Different materials have different Brewster angles based on their refractive index."
  },
  {
    question: "At Brewster's angle, what is special about the reflected and refracted rays?",
    options: [
      "They are parallel",
      "They are perpendicular (90° apart)",
      "They have the same intensity",
      "They have the same wavelength"
    ],
    correct: 1,
    explanation: "A key property of Brewster's angle: the reflected and refracted rays are exactly 90° apart. This geometry is why the reflected light becomes completely polarized."
  },
  {
    question: "Why do photographers use polarizing filters when shooting through glass?",
    options: [
      "To make the glass darker",
      "To change the color of reflections",
      "To eliminate or control reflections at Brewster's angle",
      "To make the glass appear thicker"
    ],
    correct: 2,
    explanation: "Glass reflections at Brewster's angle are polarized. A polarizing filter can completely eliminate these reflections or, if rotated, enhance them for artistic effect."
  },
  {
    question: "Why do gas lasers use windows tilted at Brewster's angle?",
    options: [
      "To focus the beam better",
      "To change the laser color",
      "To achieve zero reflection and 100% transmission for p-polarized light",
      "To make the laser safer"
    ],
    correct: 2,
    explanation: "At Brewster's angle, p-polarized light has exactly zero reflection. This means 100% of the light passes through, and the laser output becomes polarized."
  },
  {
    question: "Which polarization is the reflected light at Brewster's angle?",
    options: [
      "Circular",
      "Unpolarized",
      "Parallel to surface (s-polarized)",
      "Perpendicular to surface (p-polarized)"
    ],
    correct: 2,
    explanation: "Reflected light at Brewster's angle is 100% s-polarized (electric field parallel to the surface). The p-polarized component has zero reflection and is completely transmitted."
  },
  {
    question: "Why are polarized sunglasses particularly effective at reducing road glare?",
    options: [
      "Roads are painted with special materials",
      "Car headlights are already polarized",
      "Sunlight reflecting off roads is often near Brewster's angle and horizontally polarized",
      "The lenses are thicker than regular sunglasses"
    ],
    correct: 2,
    explanation: "When the sun is at typical daytime angles, light reflecting off horizontal surfaces like roads is close to Brewster's angle, making it horizontally polarized - exactly what vertical polarizer sunglasses block."
  },
  {
    question: "If you increase the refractive index of a material, what happens to Brewster's angle?",
    options: [
      "It decreases",
      "It increases",
      "It stays the same",
      "It becomes undefined"
    ],
    correct: 1,
    explanation: "Since θ_B = arctan(n₂/n₁), a higher refractive index n₂ means a larger Brewster's angle. Diamond (n=2.42) has a larger Brewster's angle than water (n=1.33)."
  },
  {
    question: "What percentage of p-polarized light is reflected at Brewster's angle?",
    options: ["100%", "50%", "25%", "0%"],
    correct: 3,
    explanation: "At Brewster's angle, the reflection coefficient for p-polarized light is exactly zero - all p-polarized light is transmitted. Only s-polarized light reflects."
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const BrewsterAngleRenderer: React.FC<BrewsterAngleRendererProps> = ({
  width = 800,
  height = 600,
  onBack,
  metadata
}) => {
  // Core state - using numeric phases
  const [phase, setPhase] = useState<number>(0);

  // Navigation refs
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

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
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showQuizFeedback, setShowQuizFeedback] = useState(false);
  const [completedApps, setCompletedApps] = useState<string[]>([]);
  const [currentAppIndex, setCurrentAppIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Interactive state for simulation
  const [incidentAngle, setIncidentAngle] = useState(45);
  const [selectedMaterial, setSelectedMaterial] = useState('glass');
  const [showPolarization, setShowPolarization] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [filterAngle, setFilterAngle] = useState(0); // 0 = horizontal, 90 = vertical
  const [animationTime, setAnimationTime] = useState(0);

  // Animation ref
  const animationRef = useRef<number>();
  const isTransitioningRef = useRef(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      setAnimationTime(t => t + 0.02);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Calculate Brewster's angle for current material
  const brewsterAngle = useCallback((n: number): number => {
    return Math.atan(n) * 180 / Math.PI;
  }, []);

  const currentMaterial = materials[selectedMaterial];
  const currentBrewsterAngle = brewsterAngle(currentMaterial.n);

  // Calculate reflection coefficients using Fresnel equations
  const calculateReflection = useCallback((theta: number, n: number): { rs: number; rp: number } => {
    const thetaRad = theta * Math.PI / 180;
    const sinTheta2 = Math.sin(thetaRad) / n;

    if (sinTheta2 > 1) {
      // Total internal reflection
      return { rs: 1, rp: 1 };
    }

    const theta2Rad = Math.asin(sinTheta2);
    const cosTheta1 = Math.cos(thetaRad);
    const cosTheta2 = Math.cos(theta2Rad);

    // Fresnel equations
    const rs = Math.pow((cosTheta1 - n * cosTheta2) / (cosTheta1 + n * cosTheta2), 2);
    const rp = Math.pow((n * cosTheta1 - cosTheta2) / (n * cosTheta1 + cosTheta2), 2);

    return { rs: Math.min(1, Math.max(0, rs)), rp: Math.min(1, Math.max(0, rp)) };
  }, []);

  const reflection = calculateReflection(incidentAngle, currentMaterial.n);
  const isAtBrewster = Math.abs(incidentAngle - currentBrewsterAngle) < 1;

  // Calculate how much light passes through polarizer
  const polarizedIntensity = useCallback((rs: number, rp: number, filterAng: number): number => {
    // At Brewster angle, reflected light is 100% s-polarized
    // s-polarization is horizontal, p-polarization is vertical
    const filterRad = filterAng * Math.PI / 180;
    // s-polarized component passes through at cos²(filterAngle)
    // p-polarized component passes through at sin²(filterAngle)
    const sComponent = rs * Math.pow(Math.cos(filterRad), 2);
    const pComponent = rp * Math.pow(Math.sin(filterRad), 2);
    return sComponent + pComponent;
  }, []);

  const throughFilter = polarizedIntensity(reflection.rs, reflection.rp, filterAngle);

  // Phase navigation with debouncing
  const goToPhase = useCallback((newPhase: number) => {
    if (navigationLockRef.current) return;
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    lastClickRef.current = now;
    navigationLockRef.current = true;
    playSound('transition');

    setPhase(newPhase);
    setSelectedPrediction(null);
    setShowPredictionFeedback(false);

    // Reset simulation for certain phases
    if (newPhase === 2) { // play
      setIncidentAngle(45);
      setFilterAngle(0);
    } else if (newPhase === 5) { // twist_play
      setIncidentAngle(Math.round(currentBrewsterAngle));
      setFilterAngle(0);
    }

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 400);
  }, [currentBrewsterAngle, playSound]);

  // Prediction handling
  const handlePredictionSelect = useCallback((optionId: string) => {
    if (showPredictionFeedback || isTransitioningRef.current) return;
    setSelectedPrediction(optionId);
  }, [showPredictionFeedback]);

  const handlePredictionSubmit = useCallback(() => {
    if (!selectedPrediction || showPredictionFeedback || isTransitioningRef.current) return;
    setShowPredictionFeedback(true);
  }, [selectedPrediction, showPredictionFeedback]);

  // Quiz handling
  const handleAnswerSelect = useCallback((index: number) => {
    if (showQuizFeedback || isTransitioningRef.current) return;
    setSelectedAnswer(index);
  }, [showQuizFeedback]);

  const handleAnswerSubmit = useCallback(() => {
    if (selectedAnswer === null || showQuizFeedback || isTransitioningRef.current) return;
    setShowQuizFeedback(true);
    if (selectedAnswer === quizQuestions[currentQuestion].correct) {
      setScore(s => s + 1);
    }
  }, [selectedAnswer, showQuizFeedback, currentQuestion]);

  const handleNextQuestion = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(q => q + 1);
      setSelectedAnswer(null);
      setShowQuizFeedback(false);
    } else {
      goToPhase(9);
    }

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 400);
  }, [currentQuestion, goToPhase]);

  // Application navigation with sequential unlock
  const handleCompleteApp = useCallback((appId: string) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    if (!completedApps.includes(appId)) {
      setCompletedApps(prev => [...prev, appId]);
    }

    if (currentAppIndex < realWorldApplications.length - 1) {
      setCurrentAppIndex(i => i + 1);
    }

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 400);
  }, [completedApps, currentAppIndex]);

  const canAccessQuiz = completedApps.length >= realWorldApplications.length;

  // ============================================================================
  // RENDER HELPERS (Functions, not components)
  // ============================================================================

  const renderButton = (
    label: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'success' = 'primary',
    disabled = false
  ) => {
    const bgColor = variant === 'primary' ? colors.primary
      : variant === 'success' ? colors.success
      : 'transparent';
    const borderColor = variant === 'secondary' ? colors.primary : 'transparent';

    return (
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          if (!disabled) onClick();
        }}
        disabled={disabled}
        style={{
          padding: `${spacing.sm}px ${spacing.lg}px`,
          fontSize: typography.body.fontSize,
          fontWeight: '600',
          color: variant === 'secondary' ? colors.primary : colors.text,
          background: bgColor,
          border: `2px solid ${borderColor}`,
          borderRadius: radius.md,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s ease',
        }}
      >
        {label}
      </button>
    );
  };

  const renderProgressBar = () => {
    const currentIndex = phases.indexOf(phase);
    const progress = ((currentIndex + 1) / phases.length) * 100;

    return (
      <div style={{ marginBottom: spacing.lg }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: spacing.xs,
          fontSize: typography.small.fontSize,
          color: colors.textSecondary,
        }}>
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div style={{
          height: 8,
          background: colors.border,
          borderRadius: radius.sm,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
            borderRadius: radius.sm,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>
    );
  };

  // ============================================================================
  // BREWSTER ANGLE VISUALIZATION
  // ============================================================================

  const renderBrewsterSimulation = () => {
    const simWidth = isMobile ? width - 40 : 500;
    const simHeight = 340;
    const centerX = simWidth / 2;
    const surfaceY = simHeight / 2 + 20;
    const rayLength = 120;

    // Convert angles for SVG (measure from vertical/normal)
    const incidentRad = incidentAngle * Math.PI / 180;
    const refractedAngle = Math.asin(Math.sin(incidentRad) / currentMaterial.n) * 180 / Math.PI;
    const refractedRad = refractedAngle * Math.PI / 180;

    // Calculate ray endpoints
    const incidentStart = {
      x: centerX - Math.sin(incidentRad) * rayLength,
      y: surfaceY - Math.cos(incidentRad) * rayLength
    };
    const reflectedEnd = {
      x: centerX + Math.sin(incidentRad) * rayLength,
      y: surfaceY - Math.cos(incidentRad) * rayLength
    };
    const refractedEnd = {
      x: centerX + Math.sin(refractedRad) * (rayLength * 0.8),
      y: surfaceY + Math.cos(refractedRad) * (rayLength * 0.8)
    };

    // Intensity for visualization (with filter if showing)
    const displayReflection = phase === 5 ? throughFilter : (reflection.rs + reflection.rp) / 2;

    return (
      <div style={{
        background: 'linear-gradient(180deg, #1a1a2e 0%, #0a0a1a 100%)',
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
      }}>
        <svg width={simWidth} height={simHeight} style={{ display: 'block', margin: '0 auto' }}>
          <defs>
            <linearGradient id="surfaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={currentMaterial.color} stopOpacity="0.9" />
              <stop offset="100%" stopColor={currentMaterial.color} stopOpacity="0.4" />
            </linearGradient>
            <pattern id="materialPattern" patternUnits="userSpaceOnUse" width="10" height="10">
              <rect width="10" height="10" fill={currentMaterial.color} fillOpacity="0.2" />
              <circle cx="5" cy="5" r="0.5" fill={currentMaterial.color} fillOpacity="0.4" />
            </pattern>
          </defs>

          {/* Air region (top) */}
          <rect x={0} y={0} width={simWidth} height={surfaceY} fill="transparent" />
          <text x={20} y={30} fill={colors.textSecondary} fontSize={12}>Air (n=1.0)</text>

          {/* Material region (bottom) */}
          <rect x={0} y={surfaceY} width={simWidth} height={simHeight - surfaceY}
                fill="url(#surfaceGrad)" />
          <rect x={0} y={surfaceY} width={simWidth} height={simHeight - surfaceY}
                fill="url(#materialPattern)" />
          <text x={20} y={surfaceY + 30} fill={colors.text} fontSize={12}>
            {currentMaterial.name} (n={currentMaterial.n})
          </text>

          {/* Surface line */}
          <line x1={0} y1={surfaceY} x2={simWidth} y2={surfaceY}
                stroke={colors.primary} strokeWidth={2} />

          {/* Normal line (dashed) */}
          <line x1={centerX} y1={surfaceY - 100} x2={centerX} y2={surfaceY + 80}
                stroke={colors.textSecondary} strokeWidth={1} strokeDasharray="5,5" />
          <text x={centerX + 5} y={surfaceY - 85} fill={colors.textSecondary} fontSize={10}>
            Normal
          </text>

          {/* Angle arcs */}
          {showAngles && (
            <>
              {/* Incident angle arc */}
              <path
                d={`M ${centerX} ${surfaceY - 30} A 30 30 0 0 0 ${centerX - 30 * Math.sin(incidentRad)} ${surfaceY - 30 * Math.cos(incidentRad)}`}
                fill="none"
                stroke={colors.warning}
                strokeWidth={2}
              />
              <text
                x={centerX - 45}
                y={surfaceY - 35}
                fill={colors.warning}
                fontSize={11}
              >
                θ₁={incidentAngle}°
              </text>

              {/* Reflected angle arc */}
              <path
                d={`M ${centerX} ${surfaceY - 30} A 30 30 0 0 1 ${centerX + 30 * Math.sin(incidentRad)} ${surfaceY - 30 * Math.cos(incidentRad)}`}
                fill="none"
                stroke={colors.accent}
                strokeWidth={2}
              />

              {/* Refracted angle arc */}
              <path
                d={`M ${centerX} ${surfaceY + 25} A 25 25 0 0 1 ${centerX + 25 * Math.sin(refractedRad)} ${surfaceY + 25 * Math.cos(refractedRad)}`}
                fill="none"
                stroke={colors.success}
                strokeWidth={2}
              />
              <text
                x={centerX + 30}
                y={surfaceY + 45}
                fill={colors.success}
                fontSize={11}
              >
                θ₂={refractedAngle.toFixed(1)}°
              </text>
            </>
          )}

          {/* Incident ray */}
          <line
            x1={incidentStart.x}
            y1={incidentStart.y}
            x2={centerX}
            y2={surfaceY}
            stroke="#ffd700"
            strokeWidth={3}
          />
          {/* Arrow head for incident */}
          <polygon
            points={`${centerX},${surfaceY} ${centerX - 8},${surfaceY - 15} ${centerX + 4},${surfaceY - 12}`}
            fill="#ffd700"
            transform={`rotate(${incidentAngle}, ${centerX}, ${surfaceY})`}
          />

          {/* Animated incident wave pulses */}
          {[0, 1, 2].map(i => {
            const t = (animationTime + i * 0.33) % 1;
            const x = incidentStart.x + (centerX - incidentStart.x) * t;
            const y = incidentStart.y + (surfaceY - incidentStart.y) * t;
            return (
              <circle
                key={`inc-${i}`}
                cx={x}
                cy={y}
                r={4}
                fill="#ffd700"
                opacity={1 - t}
              />
            );
          })}

          {/* Reflected ray */}
          <line
            x1={centerX}
            y1={surfaceY}
            x2={reflectedEnd.x}
            y2={reflectedEnd.y}
            stroke={colors.accent}
            strokeWidth={3}
            opacity={displayReflection}
          />

          {/* Polarization indicator on reflected ray */}
          {showPolarization && displayReflection > 0.05 && (
            <g>
              {/* s-polarization (horizontal oscillation) */}
              {reflection.rs > 0.01 && (
                <g transform={`translate(${(centerX + reflectedEnd.x) / 2}, ${(surfaceY + reflectedEnd.y) / 2})`}>
                  <line
                    x1={-12} y1={0} x2={12} y2={0}
                    stroke={colors.primary}
                    strokeWidth={2}
                    transform={`rotate(${-incidentAngle})`}
                  />
                  <text x={15} y={-10} fill={colors.primary} fontSize={9}>s</text>
                </g>
              )}
              {/* p-polarization (in plane of incidence) */}
              {reflection.rp > 0.01 && (
                <g transform={`translate(${(centerX + reflectedEnd.x) / 2 + 15}, ${(surfaceY + reflectedEnd.y) / 2})`}>
                  <line
                    x1={0} y1={-8} x2={0} y2={8}
                    stroke={colors.secondary}
                    strokeWidth={2}
                    transform={`rotate(${-incidentAngle})`}
                  />
                  <text x={5} y={-5} fill={colors.secondary} fontSize={9}>p</text>
                </g>
              )}
            </g>
          )}

          {/* Refracted ray */}
          <line
            x1={centerX}
            y1={surfaceY}
            x2={refractedEnd.x}
            y2={refractedEnd.y}
            stroke={colors.success}
            strokeWidth={3}
            opacity={Math.max(0.3, 1 - displayReflection)}
          />

          {/* Brewster angle indicator */}
          {isAtBrewster && (
            <g>
              <circle cx={centerX} cy={surfaceY} r={8} fill={colors.success} opacity={0.5}>
                <animate attributeName="r" values="8;15;8" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0.2;0.5" dur="1s" repeatCount="indefinite" />
              </circle>
              <text x={centerX - 60} y={20} fill={colors.success} fontSize={14} fontWeight="bold">
                At Brewster's Angle!
              </text>
            </g>
          )}

          {/* Polarizer filter (twist mode) */}
          {phase === 5 && (
            <g transform={`translate(${reflectedEnd.x - 30}, ${reflectedEnd.y - 50})`}>
              <rect
                x={-20} y={-30} width={40} height={60}
                fill={colors.cardBg}
                stroke={colors.accent}
                strokeWidth={2}
                rx={4}
                transform={`rotate(${filterAngle})`}
              />
              {/* Filter lines */}
              {[-20, -10, 0, 10, 20].map(offset => (
                <line
                  key={offset}
                  x1={-15}
                  y1={offset}
                  x2={15}
                  y2={offset}
                  stroke={colors.accent}
                  strokeWidth={1}
                  transform={`rotate(${filterAngle})`}
                />
              ))}
              <text x={-30} y={45} fill={colors.accent} fontSize={10}>
                Filter: {filterAngle}°
              </text>
            </g>
          )}

          {/* Labels */}
          <text x={incidentStart.x - 10} y={incidentStart.y - 10} fill="#ffd700" fontSize={11}>
            Incident
          </text>
          <text x={reflectedEnd.x - 30} y={reflectedEnd.y - 10} fill={colors.accent} fontSize={11}>
            Reflected
          </text>
          <text x={refractedEnd.x + 5} y={refractedEnd.y - 5} fill={colors.success} fontSize={11}>
            Refracted
          </text>
        </svg>

        {/* Reflection coefficients display */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: spacing.md,
          marginTop: spacing.lg,
        }}>
          <div style={{
            background: colors.background,
            padding: spacing.md,
            borderRadius: radius.md,
            textAlign: 'center',
          }}>
            <div style={{ color: colors.primary, fontSize: typography.small.fontSize }}>
              s-polarized (R_s)
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: colors.primary }}>
              {(reflection.rs * 100).toFixed(1)}%
            </div>
          </div>
          <div style={{
            background: colors.background,
            padding: spacing.md,
            borderRadius: radius.md,
            textAlign: 'center',
          }}>
            <div style={{ color: colors.secondary, fontSize: typography.small.fontSize }}>
              p-polarized (R_p)
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: isAtBrewster ? colors.success : colors.secondary
            }}>
              {(reflection.rp * 100).toFixed(1)}%
              {isAtBrewster && ' ✓'}
            </div>
          </div>
          <div style={{
            background: colors.background,
            padding: spacing.md,
            borderRadius: radius.md,
            textAlign: 'center',
          }}>
            <div style={{ color: colors.warning, fontSize: typography.small.fontSize }}>
              Brewster Angle
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: colors.warning }}>
              {currentBrewsterAngle.toFixed(1)}°
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: spacing.md,
      marginBottom: spacing.lg,
    }}>
      <div style={{
        background: colors.cardBg,
        padding: spacing.md,
        borderRadius: radius.md,
        border: `1px solid ${colors.border}`,
      }}>
        <label style={{
          color: colors.warning,
          fontSize: typography.small.fontSize,
          display: 'block',
          marginBottom: 8
        }}>
          Incident Angle: {incidentAngle}°
          {Math.abs(incidentAngle - currentBrewsterAngle) < 1 &&
            <span style={{ color: colors.success, marginLeft: 8 }}>= Brewster!</span>
          }
        </label>
        <input
          type="range"
          min={5}
          max={85}
          value={incidentAngle}
          onChange={(e) => setIncidentAngle(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        background: colors.cardBg,
        padding: spacing.md,
        borderRadius: radius.md,
        border: `1px solid ${colors.border}`,
      }}>
        <label style={{
          color: colors.textSecondary,
          fontSize: typography.small.fontSize,
          display: 'block',
          marginBottom: 8
        }}>
          Material
        </label>
        <select
          value={selectedMaterial}
          onChange={(e) => setSelectedMaterial(e.target.value)}
          style={{
            width: '100%',
            padding: spacing.sm,
            background: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            color: colors.text,
            fontSize: typography.body.fontSize,
          }}
        >
          {Object.entries(materials).map(([key, mat]) => (
            <option key={key} value={key}>
              {mat.name} (n = {mat.n})
            </option>
          ))}
        </select>
      </div>

      {phase === 5 && (
        <div style={{
          background: colors.cardBg,
          padding: spacing.md,
          borderRadius: radius.md,
          border: `1px solid ${colors.accent}`,
          gridColumn: isMobile ? '1' : '1 / -1',
        }}>
          <label style={{
            color: colors.accent,
            fontSize: typography.small.fontSize,
            display: 'block',
            marginBottom: 8
          }}>
            Polarizer Filter Rotation: {filterAngle}°
            {filterAngle === 90 && <span style={{ color: colors.success, marginLeft: 8 }}>= Vertical (blocks glare!)</span>}
          </label>
          <input
            type="range"
            min={0}
            max={180}
            value={filterAngle}
            onChange={(e) => setFilterAngle(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: spacing.xs,
            color: colors.textSecondary,
            fontSize: typography.small.fontSize,
          }}>
            <span>0° (Horizontal - max glare)</span>
            <span>90° (Vertical - blocks glare)</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderQuickButtons = () => (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.lg,
      justifyContent: 'center',
    }}>
      <button
        onMouseDown={() => setIncidentAngle(Math.round(currentBrewsterAngle))}
        style={{
          padding: `${spacing.xs}px ${spacing.md}px`,
          background: isAtBrewster ? colors.success : colors.cardBg,
          border: `1px solid ${isAtBrewster ? colors.success : colors.border}`,
          borderRadius: radius.sm,
          color: colors.text,
          fontSize: typography.small.fontSize,
          cursor: 'pointer',
        }}
      >
        Jump to Brewster ({currentBrewsterAngle.toFixed(0)}°)
      </button>
      <button
        onMouseDown={() => setShowPolarization(!showPolarization)}
        style={{
          padding: `${spacing.xs}px ${spacing.md}px`,
          background: showPolarization ? colors.primary : colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.sm,
          color: colors.text,
          fontSize: typography.small.fontSize,
          cursor: 'pointer',
        }}
      >
        {showPolarization ? '📊 Polarization On' : '📊 Polarization Off'}
      </button>
      <button
        onMouseDown={() => setShowAngles(!showAngles)}
        style={{
          padding: `${spacing.xs}px ${spacing.md}px`,
          background: showAngles ? colors.secondary : colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.sm,
          color: colors.text,
          fontSize: typography.small.fontSize,
          cursor: 'pointer',
        }}
      >
        {showAngles ? '📐 Angles On' : '📐 Angles Off'}
      </button>
    </div>
  );

  // ============================================================================
  // PHASE RENDERERS
  // ============================================================================

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Main title with gradient */}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
        The Perfect Angle
      </h1>

      <p className="text-lg text-slate-400 max-w-md mb-10">
        Discover the magic angle where you can completely eliminate glare
      </p>

      {/* Premium card with graphic */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 rounded-3xl" />

        <div className="relative">
          <div className="text-6xl mb-6">🌊 + 🕶️ = 🔮</div>

          <div className="mt-8 space-y-4">
            <p className="text-xl text-white/90 font-medium leading-relaxed">
              At exactly the right angle, reflected light becomes 100% polarized
            </p>
            <p className="text-lg text-slate-400 leading-relaxed">
              A simple filter can block it entirely!
            </p>
            <div className="pt-2">
              <p className="text-base text-cyan-400 font-semibold">
                Sir David Brewster discovered this in 1815
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium CTA button */}
      <button
        onMouseDown={(e) => { e.preventDefault(); goToPhase(1); }}
        className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Discover the Secret
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {/* Feature hints */}
      <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Polarization
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Photography Tricks
        </div>
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">✦</span>
          Laser Windows
        </div>
      </div>
    </div>
  );

  const renderPrediction = (isTwist = false) => {
    const pred = isTwist ? predictions.twist : predictions.initial;

    return (
      <div>
        <h2 style={{ ...typography.h2, color: colors.text, marginBottom: spacing.lg, textAlign: 'center' }}>
          {isTwist ? '🔮 Control the Reflection' : '🤔 Make Your Prediction'}
        </h2>
        <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' }}>
          {pred.question}
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: spacing.md,
          marginBottom: spacing.lg,
        }}>
          {pred.options.map((opt) => (
            <div
              key={opt.id}
              onClick={() => handlePredictionSelect(opt.id)}
              style={{
                padding: spacing.lg,
                background: selectedPrediction === opt.id
                  ? `linear-gradient(135deg, ${colors.primary}33, ${colors.secondary}33)`
                  : colors.cardBg,
                border: `2px solid ${selectedPrediction === opt.id ? colors.primary : colors.border}`,
                borderRadius: radius.lg,
                cursor: showPredictionFeedback ? 'default' : 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: spacing.sm }}>{opt.icon}</div>
              <p style={{ color: colors.text, margin: 0 }}>{opt.text}</p>
            </div>
          ))}
        </div>

        {showPredictionFeedback && (
          <div style={{
            padding: spacing.lg,
            background: selectedPrediction === pred.correct
              ? `${colors.success}22`
              : `${colors.warning}22`,
            border: `1px solid ${selectedPrediction === pred.correct ? colors.success : colors.warning}`,
            borderRadius: radius.lg,
            marginBottom: spacing.lg,
          }}>
            <h3 style={{
              color: selectedPrediction === pred.correct ? colors.success : colors.warning,
              marginBottom: spacing.sm,
            }}>
              {selectedPrediction === pred.correct ? '✓ Exactly right!' : '✗ Not quite!'}
            </h3>
            <p style={{ color: colors.text, margin: 0 }}>{pred.explanation}</p>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          {!showPredictionFeedback ? (
            renderButton('Lock In Prediction', handlePredictionSubmit, 'primary', !selectedPrediction)
          ) : (
            renderButton('See It In Action →', () => goToPhase(isTwist ? 'twist_play' : 'play'))
          )}
        </div>
      </div>
    );
  };

  const renderPlay = (isTwist = false) => (
    <div>
      <h2 style={{ ...typography.h2, color: colors.text, marginBottom: spacing.md, textAlign: 'center' }}>
        {isTwist ? '📸 Photographer\'s Secret Weapon' : '🔬 Brewster\'s Angle Lab'}
      </h2>
      <p style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' }}>
        {isTwist
          ? 'At Brewster\'s angle, rotate the polarizer to control reflections from 0% to maximum!'
          : 'Adjust the angle and watch how the s and p polarization reflection coefficients change.'}
      </p>

      {renderBrewsterSimulation()}
      {renderControls()}
      {renderQuickButtons()}

      {isTwist && (
        <div style={{
          background: `${colors.accent}22`,
          padding: spacing.lg,
          borderRadius: radius.lg,
          marginBottom: spacing.lg,
        }}>
          <h3 style={{ color: colors.accent, marginBottom: spacing.sm }}>📸 Pro Tip</h3>
          <p style={{ color: colors.text, margin: 0 }}>
            Photographers call this their "reflection volume knob." At Brewster's angle,
            rotating the polarizer from 0° to 90° takes you from maximum reflection to zero reflection.
            Try rotating the filter while watching the reflection intensity!
          </p>
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        {renderButton('I Understand This →', () => goToPhase(isTwist ? 'twist_review' : 'review'))}
      </div>
    </div>
  );

  const renderReview = (isTwist = false) => (
    <div>
      <h2 style={{ ...typography.h2, color: colors.text, marginBottom: spacing.lg, textAlign: 'center' }}>
        {isTwist ? '🎯 Mastering Reflections' : '📚 Brewster\'s Law'}
      </h2>

      <div style={{
        background: colors.cardBg,
        padding: spacing.xl,
        borderRadius: radius.lg,
        marginBottom: spacing.lg,
      }}>
        {isTwist ? (
          <>
            <h3 style={{ color: colors.accent, marginBottom: spacing.md }}>The Polarizer Reflection Control</h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: spacing.lg,
            }}>
              <div style={{
                background: colors.background,
                padding: spacing.md,
                borderRadius: radius.md,
              }}>
                <h4 style={{ color: colors.primary, marginBottom: spacing.sm }}>Horizontal Filter (0°)</h4>
                <p style={{ color: colors.textSecondary, margin: 0 }}>
                  Passes s-polarized (horizontal) light<br/>
                  At Brewster's angle: <strong style={{ color: colors.warning }}>Maximum reflection</strong>
                </p>
              </div>
              <div style={{
                background: colors.background,
                padding: spacing.md,
                borderRadius: radius.md,
              }}>
                <h4 style={{ color: colors.secondary, marginBottom: spacing.sm }}>Vertical Filter (90°)</h4>
                <p style={{ color: colors.textSecondary, margin: 0 }}>
                  Blocks s-polarized (horizontal) light<br/>
                  At Brewster's angle: <strong style={{ color: colors.success }}>Zero reflection!</strong>
                </p>
              </div>
            </div>

            <div style={{
              marginTop: spacing.lg,
              padding: spacing.md,
              background: colors.background,
              borderRadius: radius.md,
              textAlign: 'center',
            }}>
              <p style={{ color: colors.text, margin: 0 }}>
                <span style={{ fontSize: '24px' }}>🎛️</span> At Brewster's angle, your polarizer becomes a
                <strong style={{ color: colors.accent }}> reflection dimmer switch!</strong>
              </p>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ color: colors.primary, marginBottom: spacing.md }}>The Mathematics</h3>

            <div style={{
              textAlign: 'center',
              padding: spacing.lg,
              background: colors.background,
              borderRadius: radius.md,
              marginBottom: spacing.lg,
            }}>
              <div style={{ fontSize: '28px', color: colors.primary, fontFamily: 'monospace' }}>
                θ_B = arctan(n₂/n₁)
              </div>
              <p style={{ color: colors.textSecondary, margin: `${spacing.sm}px 0 0` }}>
                Where n₂ is the material and n₁ is air (1.0)
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: spacing.md,
              marginBottom: spacing.lg,
            }}>
              <div style={{
                background: colors.background,
                padding: spacing.md,
                borderRadius: radius.md,
              }}>
                <h4 style={{ color: colors.warning, marginBottom: spacing.sm }}>Key Property</h4>
                <p style={{ color: colors.textSecondary, margin: 0 }}>
                  At Brewster's angle, reflected and refracted rays are <strong>90° apart</strong>
                </p>
              </div>
              <div style={{
                background: colors.background,
                padding: spacing.md,
                borderRadius: radius.md,
              }}>
                <h4 style={{ color: colors.success, marginBottom: spacing.sm }}>Result</h4>
                <p style={{ color: colors.textSecondary, margin: 0 }}>
                  <strong>R_p = 0%</strong> (p-polarized reflection vanishes)<br/>
                  Reflected light is 100% s-polarized
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
              gap: spacing.sm,
            }}>
              {Object.entries(materials).map(([key, mat]) => (
                <div key={key} style={{
                  textAlign: 'center',
                  padding: spacing.sm,
                  background: colors.background,
                  borderRadius: radius.sm,
                }}>
                  <div style={{ color: mat.color, fontWeight: '600' }}>{mat.name}</div>
                  <div style={{ color: colors.text, fontSize: typography.h3.fontSize }}>
                    {brewsterAngle(mat.n).toFixed(1)}°
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        {renderButton(
          isTwist ? 'See Real Applications →' : 'What\'s the Twist? →',
          () => goToPhase(isTwist ? 'transfer' : 'twist_predict')
        )}
      </div>
    </div>
  );

  const renderTransfer = () => {
    const currentApp = realWorldApplications[currentAppIndex];

    return (
      <div>
        <h2 style={{ ...typography.h2, color: colors.text, marginBottom: spacing.md, textAlign: 'center' }}>
          🌍 Brewster's Angle in Action
        </h2>

        {/* App navigation dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: spacing.sm,
          marginBottom: spacing.lg,
        }}>
          {realWorldApplications.map((app, index) => {
            const isCompleted = completedApps.includes(app.id);
            const isCurrent = index === currentAppIndex;
            const isLocked = index > 0 && !completedApps.includes(realWorldApplications[index - 1].id);

            return (
              <div
                key={app.id}
                onClick={() => {
                  if (!isLocked && !isTransitioningRef.current) {
                    setCurrentAppIndex(index);
                  }
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isCurrent ? colors.primary : isCompleted ? colors.success : colors.cardBg,
                  border: `2px solid ${isCurrent ? colors.primary : isCompleted ? colors.success : colors.border}`,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.4 : 1,
                  transition: 'all 0.3s ease',
                  fontSize: '16px',
                }}
              >
                {isLocked ? '🔒' : isCompleted ? '✓' : index + 1}
              </div>
            );
          })}
        </div>

        {/* Current application card */}
        <div style={{
          background: colors.cardBg,
          borderRadius: radius.lg,
          padding: spacing.xl,
          marginBottom: spacing.lg,
        }}>
          <div style={{ fontSize: '48px', marginBottom: spacing.md, textAlign: 'center' }}>
            {currentApp.title.split(' ')[0]}
          </div>
          <h3 style={{ ...typography.h3, color: colors.primary, marginBottom: spacing.xs, textAlign: 'center' }}>
            {currentApp.title.substring(currentApp.title.indexOf(' ') + 1)}
          </h3>
          <p style={{ color: colors.secondary, textAlign: 'center', marginBottom: spacing.lg }}>
            {currentApp.subtitle}
          </p>

          <p style={{ ...typography.body, color: colors.text, marginBottom: spacing.lg }}>
            {currentApp.description}
          </p>

          <div style={{
            background: colors.background,
            padding: spacing.md,
            borderRadius: radius.md,
            marginBottom: spacing.md,
          }}>
            <div style={{ color: colors.textSecondary, fontSize: typography.small.fontSize, marginBottom: 4 }}>
              Key Concept:
            </div>
            <code style={{ color: colors.primary }}>{currentApp.formula}</code>
          </div>

          <div style={{
            background: `${colors.success}22`,
            padding: spacing.md,
            borderRadius: radius.md,
            marginBottom: spacing.md,
          }}>
            <div style={{ color: colors.success, marginBottom: 4 }}>💡 Real Example:</div>
            <p style={{ color: colors.text, margin: 0 }}>{currentApp.realExample}</p>
          </div>

          <div style={{
            background: `${colors.accent}22`,
            padding: spacing.md,
            borderRadius: radius.md,
          }}>
            <div style={{ color: colors.accent, marginBottom: 4 }}>🔬 Try This:</div>
            <p style={{ color: colors.text, margin: 0 }}>{currentApp.interactiveHint}</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: spacing.md }}>
          {!completedApps.includes(currentApp.id) ? (
            renderButton('Got It! ✓', () => handleCompleteApp(currentApp.id), 'success')
          ) : currentAppIndex < realWorldApplications.length - 1 ? (
            renderButton('Next Application →', () => setCurrentAppIndex(i => i + 1))
          ) : null}

          {canAccessQuiz && (
            renderButton('Take the Quiz →', () => {
              setCurrentQuestion(0);
              setSelectedAnswer(null);
              setShowQuizFeedback(false);
              setScore(0);
              goToPhase(8);
            }, 'success')
          )}
        </div>

        {!canAccessQuiz && (
          <p style={{
            textAlign: 'center',
            color: colors.textSecondary,
            marginTop: spacing.md,
            fontSize: typography.small.fontSize,
          }}>
            Complete all {realWorldApplications.length} applications to unlock the quiz
            ({completedApps.length}/{realWorldApplications.length} completed)
          </p>
        )}
      </div>
    );
  };

  const renderTest = () => {
    const question = quizQuestions[currentQuestion];

    return (
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.lg,
        }}>
          <span style={{ color: colors.textSecondary }}>
            Question {currentQuestion + 1} of {quizQuestions.length}
          </span>
          <span style={{ color: colors.success, fontWeight: '600' }}>
            Score: {score}/{currentQuestion + (showQuizFeedback ? 1 : 0)}
          </span>
        </div>

        <div style={{
          background: colors.cardBg,
          padding: spacing.xl,
          borderRadius: radius.lg,
          marginBottom: spacing.lg,
        }}>
          <h3 style={{ ...typography.h3, color: colors.text, marginBottom: spacing.lg }}>
            {question.question}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === question.correct;
              const showResult = showQuizFeedback;

              let bgColor = colors.background;
              let borderColor = colors.border;

              if (showResult) {
                if (isCorrect) {
                  bgColor = `${colors.success}33`;
                  borderColor = colors.success;
                } else if (isSelected && !isCorrect) {
                  bgColor = `${colors.warning}33`;
                  borderColor = colors.warning;
                }
              } else if (isSelected) {
                bgColor = `${colors.primary}33`;
                borderColor = colors.primary;
              }

              return (
                <div
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  style={{
                    padding: spacing.md,
                    background: bgColor,
                    border: `2px solid ${borderColor}`,
                    borderRadius: radius.md,
                    cursor: showQuizFeedback ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ color: colors.text }}>{option}</span>
                  {showResult && isCorrect && <span style={{ marginLeft: 8 }}>✓</span>}
                  {showResult && isSelected && !isCorrect && <span style={{ marginLeft: 8 }}>✗</span>}
                </div>
              );
            })}
          </div>

          {showQuizFeedback && (
            <div style={{
              marginTop: spacing.lg,
              padding: spacing.md,
              background: `${colors.primary}22`,
              borderRadius: radius.md,
            }}>
              <p style={{ color: colors.text, margin: 0 }}>{question.explanation}</p>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          {!showQuizFeedback ? (
            renderButton('Submit Answer', handleAnswerSubmit, 'primary', selectedAnswer === null)
          ) : (
            renderButton(
              currentQuestion < quizQuestions.length - 1 ? 'Next Question →' : 'See Results →',
              handleNextQuestion
            )
          )}
        </div>
      </div>
    );
  };

  const renderMastery = () => {
    const percentage = Math.round((score / quizQuestions.length) * 100);
    const passed = percentage >= 70;

    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '72px', marginBottom: spacing.lg }}>
          {passed ? '🏆' : '📚'}
        </div>
        <h2 style={{ ...typography.h1, color: colors.text, marginBottom: spacing.md }}>
          {passed ? 'Brewster Master!' : 'Keep Learning!'}
        </h2>

        <div style={{
          background: colors.cardBg,
          padding: spacing.xl,
          borderRadius: radius.lg,
          marginBottom: spacing.lg,
          maxWidth: 400,
          margin: '0 auto',
        }}>
          <div style={{
            fontSize: '48px',
            fontWeight: '700',
            color: passed ? colors.success : colors.warning,
            marginBottom: spacing.sm,
          }}>
            {percentage}%
          </div>
          <p style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
            {score} out of {quizQuestions.length} correct
          </p>

          <div style={{
            height: 8,
            background: colors.border,
            borderRadius: radius.sm,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${percentage}%`,
              background: passed ? colors.success : colors.warning,
              borderRadius: radius.sm,
              transition: 'width 1s ease',
            }} />
          </div>
        </div>

        <div style={{
          background: `linear-gradient(135deg, ${colors.gradientStart}, ${colors.gradientEnd})`,
          padding: spacing.lg,
          borderRadius: radius.lg,
          marginBottom: spacing.xl,
          maxWidth: 500,
          margin: '0 auto 24px',
        }}>
          <h3 style={{ color: colors.text, marginBottom: spacing.sm }}>🧠 Key Takeaways</h3>
          <ul style={{ color: colors.textSecondary, textAlign: 'left', margin: 0, paddingLeft: 20 }}>
            <li>Brewster's angle: θ_B = arctan(n₂/n₁)</li>
            <li>At this angle, p-polarized reflection = 0%</li>
            <li>Reflected light is 100% s-polarized</li>
            <li>Reflected and refracted rays are 90° apart</li>
            <li>Photographers use this for reflection control</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: spacing.md, justifyContent: 'center', flexWrap: 'wrap' }}>
          {!passed && renderButton('Try Again', () => {
            setCurrentQuestion(0);
            setSelectedAnswer(null);
            setShowQuizFeedback(false);
            setScore(0);
            goToPhase(8);
          })}
          {renderButton('Restart Journey', () => {
            setCompletedApps([]);
            setCurrentAppIndex(0);
            goToPhase(0);
          }, 'secondary')}
          {onBack && renderButton('Back to Menu', onBack, 'secondary')}
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const renderPhaseContent = () => {
    switch (phase) {
      case 0: return renderHook();
      case 1: return renderPrediction(false);
      case 2: return renderPlay(false);
      case 3: return renderReview(false);
      case 4: return renderPrediction(true);
      case 5: return renderPlay(true);
      case 6: return renderReview(true);
      case 7: return renderTransfer();
      case 8: return renderTest();
      case 9: return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Brewster's Angle</span>
          <div className="flex items-center gap-1.5">
            {PHASES.map((p) => (
              <button
                key={p}
                onMouseDown={(e) => { e.preventDefault(); goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                    : phase > p
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-cyan-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div className="max-w-4xl mx-auto px-4">
          {renderPhaseContent()}
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default BrewsterAngleRenderer;
