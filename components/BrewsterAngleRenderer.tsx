import React, { useState, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

interface BrewsterAngleRendererProps {
  phase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  gamePhase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const PHASES = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'] as const;

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#cbd5e1',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  lightRay: '#fbbf24',
  reflectedRay: '#f97316',
  refractedRay: '#3b82f6',
  polarized: '#10b981',
  surface: '#64748b',
};

// Material refractive indices
const materials = {
  glass: { name: 'Glass', n: 1.52, brewsterAngle: 56.7 },
  water: { name: 'Water', n: 1.33, brewsterAngle: 53.1 },
  plastic: { name: 'Plastic (Acrylic)', n: 1.49, brewsterAngle: 56.1 },
};

const BrewsterAngleRenderer: React.FC<BrewsterAngleRendererProps> = ({
  phase: phaseProp,
  gamePhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase management
  const [internalPhase, setInternalPhase] = useState<typeof PHASES[number]>('hook');

  // Determine active phase - prefer gamePhase, then phase prop, then internal state
  const activePhase = gamePhase || phaseProp || internalPhase;

  // Ensure valid phase (default to hook for invalid phases)
  const phase = PHASES.includes(activePhase as typeof PHASES[number]) ? activePhase : 'hook';

  const currentPhaseIndex = PHASES.indexOf(phase as typeof PHASES[number]);

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

  // Simulation state
  const [incidentAngle, setIncidentAngle] = useState(30);
  const [polarizerAngle, setPolarizerAngle] = useState(0);
  const [material, setMaterial] = useState<keyof typeof materials>('glass');
  const [showPolarizer, setShowPolarizer] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTransferApp, setCurrentTransferApp] = useState(0);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [checkedAnswers, setCheckedAnswers] = useState<Set<number>>(new Set());

  // Calculate physics
  const currentMaterial = materials[material];
  const brewsterAngle = currentMaterial.brewsterAngle;
  const n = currentMaterial.n;

  // Fresnel equations for s and p polarization (simplified for visualization)
  const angleRad = (incidentAngle * Math.PI) / 180;
  const refractedAngleRad = Math.asin(Math.sin(angleRad) / n);
  const refractedAngle = (refractedAngleRad * 180) / Math.PI;

  // Reflectivity for p-polarized light (approaches 0 at Brewster angle)
  const cosThetaI = Math.cos(angleRad);
  const cosThetaT = Math.cos(refractedAngleRad);
  const rs = Math.pow((cosThetaI - n * cosThetaT) / (cosThetaI + n * cosThetaT), 2);
  const rp = Math.pow((n * cosThetaI - cosThetaT) / (n * cosThetaI + cosThetaT), 2);

  // Glare intensity depends on polarizer alignment and p-polarization
  const polarizationFactor = Math.cos((polarizerAngle * Math.PI) / 180);
  const glareIntensity = showPolarizer
    ? rs * Math.pow(polarizationFactor, 2) + rp * Math.pow(Math.sin((polarizerAngle * Math.PI) / 180), 2)
    : (rs + rp) / 2;

  // How close to Brewster angle
  const brewsterProximity = 1 - Math.abs(incidentAngle - brewsterAngle) / 90;

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setIncidentAngle(prev => {
        const next = prev + 0.5;
        return next > 85 ? 5 : next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'no_angle', label: 'Glare is equally strong at all angles' },
    { id: 'perpendicular', label: 'Glare is strongest at 90 degrees (perpendicular)' },
    { id: 'brewster', label: 'There is a specific angle where glare reduction is maximum' },
    { id: 'parallel', label: 'Glare is strongest at grazing angles (near parallel)' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'The magic angle is the same for all materials' },
    { id: 'different', label: 'Different materials have different magic angles' },
    { id: 'none', label: 'Some materials have no special angle at all' },
    { id: 'multiple', label: 'Each material has multiple magic angles' },
  ];

  const transferApplications = [
    {
      title: 'Photography with Polarizing Filters',
      description: 'Photographers use circular polarizing filters to reduce glare from water, glass, and foliage, making colors more vivid and skies bluer.',
      question: 'Why do photographers rotate their polarizing filter when shooting?',
      answer: 'The reflected light is polarized in a specific direction. Rotating the filter aligns its polarization axis to block the polarized reflected light while allowing the unpolarized scene light through.',
    },
    {
      title: 'Laser Windows (Brewster Windows)',
      description: 'High-power lasers use windows tilted at Brewster angle. The p-polarized laser light passes through with zero reflection loss.',
      question: 'Why are Brewster windows used in laser cavities?',
      answer: 'At Brewster angle, p-polarized light has zero reflection. This eliminates power loss at windows and naturally selects a single polarization state for the laser output.',
    },
    {
      title: 'Glare-Free Glass Displays',
      description: 'Some electronic displays and museum cases are designed with viewing angles optimized near Brewster angle to minimize reflections.',
      question: 'How can display designers minimize glare without anti-reflective coatings?',
      answer: 'By tilting displays so the typical viewing angle approaches Brewster angle, reflected ambient light becomes strongly polarized. Users can then use polarized glasses to eliminate the glare.',
    },
    {
      title: 'Sunglasses Design',
      description: 'Polarized sunglasses are designed to block horizontally polarized light, which is the polarization of glare from horizontal surfaces like roads and water.',
      question: 'Why are polarized sunglasses most effective for reducing road and water glare?',
      answer: 'Light reflecting off horizontal surfaces at angles near Brewster angle becomes horizontally polarized. Sunglasses with vertical polarization filters block this specific polarization, dramatically reducing glare.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is Brewster angle?',
      options: [
        { text: 'The angle at which all light is absorbed', correct: false },
        { text: 'The angle at which reflected light becomes completely p-polarized', correct: false },
        { text: 'The angle at which reflected light becomes completely s-polarized (and p-polarized reflection is zero)', correct: true },
        { text: 'The angle of total internal reflection', correct: false },
      ],
      explanation: 'Brewster angle is the specific angle at which p-polarized light has zero reflection, leaving only s-polarized light in the reflected beam. This is because the oscillating electric field of p-polarized light at this angle cannot radiate in the reflection direction.',
    },
    {
      question: 'At Brewster angle, what happens to p-polarized light?',
      options: [
        { text: 'It is completely reflected', correct: false },
        { text: 'It is completely transmitted (zero reflection)', correct: true },
        { text: 'It is converted to s-polarized light', correct: false },
        { text: 'It is absorbed by the surface', correct: false },
      ],
      explanation: 'At Brewster angle, p-polarized light is completely transmitted into the medium with zero reflection. The reflected and refracted rays are perpendicular to each other, which geometrically prevents p-polarized oscillations from coupling into the reflected direction.',
    },
    {
      question: 'The Brewster angle depends on:',
      options: [
        { text: 'The color of light only', correct: false },
        { text: 'The refractive index of the material', correct: true },
        { text: 'The thickness of the material', correct: false },
        { text: 'The temperature of the material', correct: false },
      ],
      explanation: 'Brewster angle is determined by the formula tan(theta_B) = n, where n is the refractive index. Different materials with different refractive indices have different Brewster angles.',
    },
    {
      question: 'Polarized sunglasses reduce glare because:',
      options: [
        { text: 'They absorb all light equally', correct: false },
        { text: 'Glare is often horizontally polarized, and the glasses block that polarization', correct: true },
        { text: 'They change the Brewster angle of your eyes', correct: false },
        { text: 'They heat up and absorb infrared', correct: false },
      ],
      explanation: 'Light reflecting off horizontal surfaces (roads, water) near Brewster angle becomes predominantly horizontally polarized. Polarized sunglasses have vertical polarization filters that block this horizontally polarized glare while allowing other light through.',
    },
    {
      question: 'For glass (n = 1.5), Brewster angle is approximately:',
      options: [
        { text: '30 degrees', correct: false },
        { text: '45 degrees', correct: false },
        { text: '56 degrees', correct: true },
        { text: '75 degrees', correct: false },
      ],
      explanation: 'Using tan(theta_B) = n = 1.5, we get theta_B = arctan(1.5) = 56.3 degrees. This is why photographers often position themselves at roughly this angle when using polarizing filters on glass.',
    },
    {
      question: 'Why are Brewster windows used in lasers?',
      options: [
        { text: 'To focus the laser beam', correct: false },
        { text: 'To eliminate reflection losses for polarized laser light', correct: true },
        { text: 'To cool the laser cavity', correct: false },
        { text: 'To change the laser color', correct: false },
      ],
      explanation: 'Brewster windows are tilted at Brewster angle so that p-polarized laser light passes through with zero reflection loss. This maximizes power efficiency and naturally selects a single polarization state for the laser output.',
    },
    {
      question: 'Light reflecting off a lake at a low angle is:',
      options: [
        { text: 'Unpolarized', correct: false },
        { text: 'Circularly polarized', correct: false },
        { text: 'Mostly horizontally polarized', correct: true },
        { text: 'Mostly vertically polarized', correct: false },
      ],
      explanation: 'When sunlight reflects off a horizontal water surface at angles near Brewster angle (~53 degrees for water), the reflected light becomes strongly horizontally polarized. This is why polarized sunglasses are so effective at reducing water glare.',
    },
    {
      question: 'The mathematical relationship for Brewster angle is:',
      options: [
        { text: 'sin(theta) = n', correct: false },
        { text: 'tan(theta) = n', correct: true },
        { text: 'cos(theta) = n', correct: false },
        { text: 'theta = 45 degrees always', correct: false },
      ],
      explanation: 'The Brewster angle formula is tan(theta_B) = n2/n1, where n2 is the refractive index of the second medium and n1 is the first (usually air, n1=1). This elegant relationship comes from the geometry where reflected and refracted rays are perpendicular.',
    },
    {
      question: 'Water has a lower refractive index than glass. Therefore, water\'s Brewster angle is:',
      options: [
        { text: 'Higher than glass', correct: false },
        { text: 'Lower than glass', correct: true },
        { text: 'The same as glass', correct: false },
        { text: 'Undefined for water', correct: false },
      ],
      explanation: 'Since tan(theta_B) = n, a lower refractive index (water: 1.33 vs glass: 1.52) means a smaller Brewster angle. Water has theta_B = 53.1 degrees, while glass has theta_B = 56.7 degrees.',
    },
    {
      question: 'A polarizing filter is most effective at reducing glare when the viewing angle is:',
      options: [
        { text: 'Perpendicular to the surface (looking straight down)', correct: false },
        { text: 'Near Brewster angle where reflected light is most polarized', correct: true },
        { text: 'Parallel to the surface (grazing angle)', correct: false },
        { text: 'It works equally at all angles', correct: false },
      ],
      explanation: 'Polarizing filters work best when the reflected light is strongly polarized, which occurs near Brewster angle. At other angles, the reflected light is only partially polarized, so the filter is less effective at blocking it.',
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
    // Don't auto-check - require explicit Check Answer click
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

  // Navigation functions
  const goToPhase = (newPhase: typeof PHASES[number]) => {
    setInternalPhase(newPhase);
  };

  const goToNextPhase = () => {
    const nextIndex = currentPhaseIndex + 1;
    if (nextIndex < PHASES.length) {
      setInternalPhase(PHASES[nextIndex]);
    }
    if (onPhaseComplete) {
      onPhaseComplete();
    }
  };

  const goToPreviousPhase = () => {
    const prevIndex = currentPhaseIndex - 1;
    if (prevIndex >= 0) {
      setInternalPhase(PHASES[prevIndex]);
    }
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 500;
    const height = 400;
    const surfaceY = height * 0.55;
    const hitPoint = { x: width / 2, y: surfaceY };

    // Calculate ray endpoints
    const rayLength = 140;
    const incidentRad = (incidentAngle * Math.PI) / 180;
    const incidentStart = {
      x: hitPoint.x - rayLength * Math.sin(incidentRad),
      y: hitPoint.y - rayLength * Math.cos(incidentRad),
    };
    const reflectedEnd = {
      x: hitPoint.x + rayLength * Math.sin(incidentRad),
      y: hitPoint.y - rayLength * Math.cos(incidentRad),
    };
    const refractedEnd = {
      x: hitPoint.x + rayLength * 0.85 * Math.sin(refractedAngleRad),
      y: hitPoint.y + rayLength * 0.85 * Math.cos(refractedAngleRad),
    };

    // Glare meter dimensions
    const glareWidth = 110;
    const glareHeight = 22;

    // Polarization indicator
    const nearBrewster = Math.abs(incidentAngle - brewsterAngle) < 5;

    // Calculate polarization wave positions for animation
    const waveOffset = (Date.now() / 50) % 360;

    // Light source position
    const lightSourceX = incidentStart.x - 30;
    const lightSourceY = incidentStart.y - 30;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '16px', maxWidth: '550px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
        >
          {/* === COMPREHENSIVE DEFS SECTION === */}
          <defs>
            {/* Premium sky/air gradient with atmospheric depth */}
            <linearGradient id="brewSkyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0c1929" />
              <stop offset="25%" stopColor="#0f2744" />
              <stop offset="50%" stopColor="#162d50" />
              <stop offset="75%" stopColor="#1a3a5c" />
              <stop offset="100%" stopColor="#1e4268" />
            </linearGradient>

            {/* Glass/dielectric surface gradient with realistic refraction look */}
            <linearGradient id="brewGlassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6b8cae" stopOpacity="0.85" />
              <stop offset="15%" stopColor="#5a7a9c" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#4a6a8c" stopOpacity="0.92" />
              <stop offset="70%" stopColor="#3a5a7c" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#2a4a6c" stopOpacity="0.98" />
            </linearGradient>

            {/* Water surface gradient with deep blue tones */}
            <linearGradient id="brewWaterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.7" />
              <stop offset="20%" stopColor="#2563eb" stopOpacity="0.75" />
              <stop offset="45%" stopColor="#1d4ed8" stopOpacity="0.82" />
              <stop offset="70%" stopColor="#1e40af" stopOpacity="0.88" />
              <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.95" />
            </linearGradient>

            {/* Plastic/acrylic surface gradient */}
            <linearGradient id="brewPlasticGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a8a29e" stopOpacity="0.75" />
              <stop offset="25%" stopColor="#8a8580" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#78716c" stopOpacity="0.85" />
              <stop offset="75%" stopColor="#686460" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#57534e" stopOpacity="0.95" />
            </linearGradient>

            {/* Light source radial glow */}
            <radialGradient id="brewLightSourceGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
              <stop offset="25%" stopColor="#fde68a" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* Incident beam gradient (golden light) */}
            <linearGradient id="brewIncidentBeam" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="30%" stopColor="#fde68a" />
              <stop offset="60%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            {/* Reflected beam gradient (orange tones) */}
            <linearGradient id="brewReflectedBeam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="35%" stopColor="#f97316" />
              <stop offset="65%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>

            {/* Refracted beam gradient (blue tones for inside medium) */}
            <linearGradient id="brewRefractedBeam" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="30%" stopColor="#3b82f6" />
              <stop offset="60%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* Polarization indicator gradient (green success) */}
            <linearGradient id="brewPolarizedGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>

            {/* Polarizer filter gradient */}
            <linearGradient id="brewPolarizerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.4" />
              <stop offset="25%" stopColor="#8b5cf6" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.55" />
              <stop offset="75%" stopColor="#8b5cf6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.4" />
            </linearGradient>

            {/* Glare meter background */}
            <linearGradient id="brewGlareBg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Glare meter fill - high (red/danger) */}
            <linearGradient id="brewGlareHigh" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* Glare meter fill - medium (amber/warning) */}
            <linearGradient id="brewGlareMedium" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Glare meter fill - low (green/success) */}
            <linearGradient id="brewGlareLow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Surface interface highlight */}
            <linearGradient id="brewSurfaceHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="30%" stopColor="rgba(255,255,255,0.3)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.5)" />
              <stop offset="70%" stopColor="rgba(255,255,255,0.3)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>

            {/* === GLOW FILTERS === */}
            {/* Light source glow filter */}
            <filter id="brewLightGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="blur1" />
              <feGaussianBlur stdDeviation="4" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Beam glow filter */}
            <filter id="brewBeamGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Hit point glow filter */}
            <filter id="brewHitGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur1" />
              <feGaussianBlur stdDeviation="3" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Polarizer glow filter */}
            <filter id="brewPolarizerGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft shadow filter */}
            <filter id="brewSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
            </filter>

            {/* Text shadow filter */}
            <filter id="brewTextGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* S-polarization wave pattern */}
            <pattern id="brewSPolarPattern" x="0" y="0" width="20" height="10" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="5" r="2" fill="#10b981" opacity="0.8" />
            </pattern>

            {/* P-polarization wave pattern */}
            <pattern id="brewPPolarPattern" x="0" y="0" width="20" height="10" patternUnits="userSpaceOnUse">
              <line x1="5" y1="0" x2="15" y2="10" stroke="#f59e0b" strokeWidth="1.5" opacity="0.8" />
            </pattern>
          </defs>

          {/* === BACKGROUND === */}
          {/* Sky/air region above surface */}
          <rect x="0" y="0" width={width} height={surfaceY} fill="url(#brewSkyGradient)" />

          {/* Subtle grid pattern for depth */}
          <pattern id="brewGridPattern" width="25" height="25" patternUnits="userSpaceOnUse">
            <rect width="25" height="25" fill="none" stroke="#1e3a5f" strokeWidth="0.3" strokeOpacity="0.4" />
          </pattern>
          <rect x="0" y="0" width={width} height={surfaceY} fill="url(#brewGridPattern)" opacity="0.5" />

          {/* === DIELECTRIC SURFACE (Glass/Water/Plastic) === */}
          <rect
            x={0}
            y={surfaceY}
            width={width}
            height={height - surfaceY}
            fill={material === 'water' ? 'url(#brewWaterGradient)' : material === 'glass' ? 'url(#brewGlassGradient)' : 'url(#brewPlasticGradient)'}
          />

          {/* Surface interface line with highlight */}
          <line
            x1={0}
            y1={surfaceY}
            x2={width}
            y2={surfaceY}
            stroke="url(#brewSurfaceHighlight)"
            strokeWidth={4}
          />
          <line
            x1={0}
            y1={surfaceY + 2}
            x2={width}
            y2={surfaceY + 2}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth={1}
          />

          {/* Internal refraction lines (subtle caustics effect) */}
          {[1, 2, 3].map((i) => (
            <line
              key={`caustic-${i}`}
              x1={hitPoint.x + (i * 15)}
              y1={surfaceY + 10}
              x2={hitPoint.x + (i * 25) + 40 * Math.sin(refractedAngleRad)}
              y2={height - 20}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
              strokeDasharray="4,8"
            />
          ))}

          {/* === NORMAL LINE (dashed) === */}
          <line
            x1={hitPoint.x}
            y1={surfaceY - 120}
            x2={hitPoint.x}
            y2={surfaceY + 80}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={1.5}
            strokeDasharray="6,4"
          />
          <text
            x={hitPoint.x + 8}
            y={surfaceY - 130}
            fill="rgba(255,255,255,0.5)"
            fontSize={11}
            fontStyle="italic"
          >
            normal
          </text>

          {/* === LIGHT SOURCE === */}
          <g filter="url(#brewLightGlow)">
            <circle
              cx={lightSourceX}
              cy={lightSourceY}
              r={18}
              fill="url(#brewLightSourceGlow)"
            />
            <circle
              cx={lightSourceX}
              cy={lightSourceY}
              r={8}
              fill="#fef3c7"
            />
          </g>
          {/* Light source rays (emanating) */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <line
              key={`ray-${angle}`}
              x1={lightSourceX + 20 * Math.cos((angle * Math.PI) / 180)}
              y1={lightSourceY + 20 * Math.sin((angle * Math.PI) / 180)}
              x2={lightSourceX + 28 * Math.cos((angle * Math.PI) / 180)}
              y2={lightSourceY + 28 * Math.sin((angle * Math.PI) / 180)}
              stroke="#fbbf24"
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.6}
            />
          ))}

          {/* === INCIDENT RAY === */}
          <g filter="url(#brewBeamGlow)">
            {/* Main beam */}
            <line
              x1={incidentStart.x}
              y1={incidentStart.y}
              x2={hitPoint.x}
              y2={hitPoint.y}
              stroke="url(#brewIncidentBeam)"
              strokeWidth={6}
              strokeLinecap="round"
            />
            {/* Beam highlight */}
            <line
              x1={incidentStart.x + 1}
              y1={incidentStart.y + 1}
              x2={hitPoint.x}
              y2={hitPoint.y}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </g>

          {/* Incident ray arrowhead */}
          <polygon
            points={`${hitPoint.x},${hitPoint.y} ${hitPoint.x - 10},${hitPoint.y - 20} ${hitPoint.x + 10},${hitPoint.y - 20}`}
            fill="#fbbf24"
            filter="url(#brewBeamGlow)"
            transform={`rotate(${incidentAngle}, ${hitPoint.x}, ${hitPoint.y})`}
          />

          {/* Polarization waves on incident beam (unpolarized - both S and P) */}
          {[0.25, 0.5, 0.75].map((t, i) => {
            const wx = incidentStart.x + t * (hitPoint.x - incidentStart.x);
            const wy = incidentStart.y + t * (hitPoint.y - incidentStart.y);
            const offset = Math.sin((waveOffset + i * 120) * Math.PI / 180) * 4;
            return (
              <g key={`inc-wave-${i}`} transform={`rotate(${incidentAngle}, ${wx}, ${wy})`}>
                {/* S-polarization (perpendicular - circles) */}
                <circle
                  cx={wx + offset}
                  cy={wy}
                  r={3}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  opacity={0.7}
                />
                {/* P-polarization (parallel - lines) */}
                <line
                  x1={wx - 4}
                  y1={wy + offset}
                  x2={wx + 4}
                  y2={wy + offset}
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  opacity={0.7}
                />
              </g>
            );
          })}

          {/* === HIT POINT GLOW === */}
          <g filter="url(#brewHitGlow)">
            <circle
              cx={hitPoint.x}
              cy={hitPoint.y}
              r={10}
              fill={nearBrewster ? '#10b981' : '#fbbf24'}
              opacity={0.6}
            />
            <circle
              cx={hitPoint.x}
              cy={hitPoint.y}
              r={5}
              fill="#fff"
              opacity={0.8}
            />
          </g>

          {/* === REFLECTED RAY === */}
          <g filter="url(#brewBeamGlow)" opacity={0.3 + glareIntensity * 0.7}>
            {/* Main beam */}
            <line
              x1={hitPoint.x}
              y1={hitPoint.y}
              x2={reflectedEnd.x}
              y2={reflectedEnd.y}
              stroke="url(#brewReflectedBeam)"
              strokeWidth={5}
              strokeLinecap="round"
            />
            {/* Beam highlight */}
            <line
              x1={hitPoint.x}
              y1={hitPoint.y}
              x2={reflectedEnd.x - 1}
              y2={reflectedEnd.y + 1}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          </g>

          {/* Polarization indicator on reflected ray (S-polarized at Brewster) */}
          {[0.3, 0.55, 0.8].map((t, i) => {
            const wx = hitPoint.x + t * (reflectedEnd.x - hitPoint.x);
            const wy = hitPoint.y + t * (reflectedEnd.y - hitPoint.y);
            const offset = Math.sin((waveOffset + i * 120) * Math.PI / 180) * 4;
            // Show mostly S-polarization when near Brewster (p-polarized is transmitted)
            const sPolarIntensity = nearBrewster ? 1 : 0.5;
            const pPolarIntensity = nearBrewster ? 0.1 : 0.5;
            return (
              <g key={`ref-wave-${i}`} transform={`rotate(${-incidentAngle}, ${wx}, ${wy})`} opacity={0.3 + glareIntensity * 0.7}>
                {/* S-polarization (perpendicular - circles) - dominant at Brewster */}
                <circle
                  cx={wx + offset}
                  cy={wy}
                  r={3}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  opacity={sPolarIntensity * 0.8}
                />
                {/* P-polarization (parallel - lines) - minimal at Brewster */}
                <line
                  x1={wx - 4}
                  y1={wy + offset}
                  x2={wx + 4}
                  y2={wy + offset}
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  opacity={pPolarIntensity * 0.6}
                />
              </g>
            );
          })}

          {/* Reflected ray arrowhead */}
          <polygon
            points={`${reflectedEnd.x},${reflectedEnd.y} ${reflectedEnd.x - 10},${reflectedEnd.y + 8} ${reflectedEnd.x + 4},${reflectedEnd.y + 14}`}
            fill="#f97316"
            opacity={0.3 + glareIntensity * 0.7}
            filter="url(#brewBeamGlow)"
            transform={`rotate(${-incidentAngle + 90}, ${reflectedEnd.x}, ${reflectedEnd.y})`}
          />

          {/* === REFRACTED RAY === */}
          <g filter="url(#brewBeamGlow)" opacity={0.85}>
            {/* Main beam */}
            <line
              x1={hitPoint.x}
              y1={hitPoint.y}
              x2={refractedEnd.x}
              y2={refractedEnd.y}
              stroke="url(#brewRefractedBeam)"
              strokeWidth={5}
              strokeLinecap="round"
            />
            {/* Beam highlight */}
            <line
              x1={hitPoint.x + 1}
              y1={hitPoint.y + 1}
              x2={refractedEnd.x}
              y2={refractedEnd.y}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          </g>

          {/* Refracted ray arrowhead */}
          <polygon
            points={`${refractedEnd.x},${refractedEnd.y} ${refractedEnd.x - 8},${refractedEnd.y - 10} ${refractedEnd.x + 8},${refractedEnd.y - 10}`}
            fill="#3b82f6"
            filter="url(#brewBeamGlow)"
            transform={`rotate(${refractedAngle}, ${refractedEnd.x}, ${refractedEnd.y})`}
          />

          {/* === BREWSTER ANGLE MARKER === */}
          <g opacity={0.8}>
            <line
              x1={hitPoint.x}
              y1={hitPoint.y}
              x2={hitPoint.x + 60 * Math.sin((brewsterAngle * Math.PI) / 180)}
              y2={hitPoint.y - 60 * Math.cos((brewsterAngle * Math.PI) / 180)}
              stroke={colors.success}
              strokeWidth={2.5}
              strokeDasharray="4,4"
            />
            <circle
              cx={hitPoint.x + 65 * Math.sin((brewsterAngle * Math.PI) / 180)}
              cy={hitPoint.y - 65 * Math.cos((brewsterAngle * Math.PI) / 180)}
              r={4}
              fill={colors.success}
            />
            <text
              x={hitPoint.x + 78 * Math.sin((brewsterAngle * Math.PI) / 180)}
              y={hitPoint.y - 72 * Math.cos((brewsterAngle * Math.PI) / 180)}
              fill={colors.success}
              fontSize={11}
              fontWeight="bold"
              filter="url(#brewTextGlow)"
            >
              Brewster {brewsterAngle.toFixed(1)}
            </text>
          </g>

          {/* === ANGLE ARC === */}
          <path
            d={`M ${hitPoint.x} ${hitPoint.y - 50} A 50 50 0 0 1 ${hitPoint.x + 50 * Math.sin(incidentRad)} ${hitPoint.y - 50 * Math.cos(incidentRad)}`}
            fill="none"
            stroke="#fbbf24"
            strokeWidth={2.5}
            opacity={0.8}
          />
          <text
            x={hitPoint.x + 62 * Math.sin(incidentRad / 2)}
            y={hitPoint.y - 60 * Math.cos(incidentRad / 2)}
            fill="#fbbf24"
            fontSize={14}
            fontWeight="bold"
            filter="url(#brewTextGlow)"
          >
            {incidentAngle.toFixed(0)}
          </text>

          {/* === POLARIZER FILTER (if enabled) === */}
          {showPolarizer && (
            <g transform={`translate(${reflectedEnd.x + 25}, ${reflectedEnd.y - 35})`} filter="url(#brewPolarizerGlow)">
              {/* Filter frame */}
              <rect
                x={-25}
                y={-35}
                width={50}
                height={70}
                fill="url(#brewPolarizerGradient)"
                stroke={colors.accent}
                strokeWidth={2}
                rx={6}
              />
              {/* Glass/filter interior */}
              <rect
                x={-20}
                y={-30}
                width={40}
                height={60}
                fill="rgba(139, 92, 246, 0.15)"
                rx={4}
              />
              {/* Polarization axis line */}
              <line
                x1={0}
                y1={-26}
                x2={0}
                y2={26}
                stroke={colors.accent}
                strokeWidth={4}
                strokeLinecap="round"
                transform={`rotate(${polarizerAngle}, 0, 0)`}
              />
              {/* Polarization grid lines */}
              {[-15, -8, 0, 8, 15].map((offset) => (
                <line
                  key={`grid-${offset}`}
                  x1={offset}
                  y1={-26}
                  x2={offset}
                  y2={26}
                  stroke={colors.accent}
                  strokeWidth={1}
                  opacity={0.3}
                  transform={`rotate(${polarizerAngle}, 0, 0)`}
                />
              ))}
              {/* Label */}
              <text x={0} y={48} fill={colors.textSecondary} fontSize={11} textAnchor="middle" fontWeight="600">
                Polarizer
              </text>
              <text x={0} y={64} fill={colors.textMuted} fontSize={11} textAnchor="middle">
                {polarizerAngle}°
              </text>
            </g>
          )}

          {/* === LABELS PANEL === */}
          <g filter="url(#brewSoftShadow)">
            <rect x={12} y={12} width={165} height={65} rx={8} fill="rgba(15, 23, 42, 0.85)" />
            <text x={22} y={32} fill={colors.textPrimary} fontSize={13} fontWeight="bold">
              {currentMaterial.name}
            </text>
            <text x={22} y={62} fill={colors.textSecondary} fontSize={11}>
              n = {n.toFixed(2)} | Brewster: {brewsterAngle.toFixed(1)}°
            </text>
          </g>

          {/* === GLARE INTENSITY METER === */}
          {(() => {
            const gx = width - glareWidth - 22;
            const gy = 14;
            return (
              <g filter="url(#brewSoftShadow)">
                <rect x={gx - 8} y={gy - 6} width={glareWidth + 16} height={50} rx={8} fill="rgba(15, 23, 42, 0.85)" />
                <text x={gx + glareWidth / 2} y={gy + 8} fill={colors.textSecondary} fontSize={11} textAnchor="middle" fontWeight="600">
                  Glare Intensity
                </text>
                <rect x={gx} y={gy + 16} width={glareWidth} height={glareHeight} fill="url(#brewGlareBg)" rx={6} />
                <rect
                  x={gx}
                  y={gy + 16}
                  width={glareWidth * glareIntensity}
                  height={glareHeight}
                  fill={glareIntensity > 0.5 ? 'url(#brewGlareHigh)' : glareIntensity > 0.2 ? 'url(#brewGlareMedium)' : 'url(#brewGlareLow)'}
                  rx={6}
                />
                <text x={gx + glareWidth / 2} y={gy + 32} fill={colors.textPrimary} fontSize={12} textAnchor="middle" fontWeight="bold">
                  {(glareIntensity * 100).toFixed(0)}%
                </text>
              </g>
            );
          })()}

          {/* === RAY LABELS === */}
          <text
            x={incidentStart.x + 20}
            y={incidentStart.y + 5}
            fill="#fbbf24"
            fontSize={11}
            fontWeight="600"
          >
            Incident
          </text>
          <text
            x={reflectedEnd.x - 50}
            y={reflectedEnd.y + 5}
            fill="#f97316"
            fontSize={11}
            fontWeight="600"
            opacity={0.3 + glareIntensity * 0.7}
          >
            Reflected
          </text>
          <text
            x={refractedEnd.x + 8}
            y={refractedEnd.y - 5}
            fill="#3b82f6"
            fontSize={11}
            fontWeight="600"
          >
            Refracted
          </text>

          {/* === POLARIZATION LEGEND === */}
          <rect x={width - 108} y={height - 63} width={96} height={52} rx={6} fill="rgba(15, 23, 42, 0.8)" />
          <text x={width - 100} y={height - 49} fill={colors.textSecondary} fontSize={11} fontWeight="600">Polarization:</text>
          <circle cx={width - 92} cy={height - 35} r={4} fill="none" stroke="#10b981" strokeWidth={1.5} />
          <text x={width - 82} y={height - 31} fill="#10b981" fontSize={11}>S (perpendicular)</text>
          <line x1={width - 96} y1={height - 20} x2={width - 88} y2={height - 20} stroke="#f59e0b" strokeWidth={1.5} />
          <text x={width - 82} y={height - 17} fill="#f59e0b" fontSize={11}>P (parallel)</text>

          {/* === STATUS INDICATOR (Near Brewster) === */}
          {nearBrewster && (
            <g>
              <rect x={width / 2 - 95} y={height - 42} width={190} height={28} fill="rgba(16, 185, 129, 0.25)" rx={14} stroke={colors.success} strokeWidth={1.5} />
              <circle cx={width / 2 - 75} cy={height - 28} r={5} fill={colors.success}>
                <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite" />
              </circle>
              <text x={width / 2} y={height - 23} fill={colors.success} fontSize={13} textAnchor="middle" fontWeight="bold">
                Near Brewster Angle!
              </text>
            </g>
          )}
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '10px',
                border: 'none',
                background: isAnimating
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: isAnimating
                  ? '0 4px 20px rgba(239, 68, 68, 0.4)'
                  : '0 4px 20px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              {isAnimating ? 'Stop' : 'Sweep Angles'}
            </button>
            <button
              onClick={() => { setIncidentAngle(brewsterAngle); setIsAnimating(false); }}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '10px',
                border: `2px solid ${colors.success}`,
                background: 'rgba(16, 185, 129, 0.1)',
                color: colors.success,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease',
              }}
            >
              Go to Brewster
            </button>
            <button
              onClick={() => { setIncidentAngle(45); setPolarizerAngle(0); setMaterial('glass'); }}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '10px',
                border: `2px solid ${colors.accent}`,
                background: 'rgba(139, 92, 246, 0.1)',
                color: colors.accent,
                fontWeight: 'bold',
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
          Incident Angle: {incidentAngle.toFixed(1)} (Brewster: {brewsterAngle.toFixed(1)})
        </label>
        <input
          type="range"
          min="5"
          max="85"
          step="0.5"
          value={incidentAngle}
          onChange={(e) => setIncidentAngle(parseFloat(e.target.value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', minHeight: '44px', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Polarizer Rotation: {polarizerAngle.toFixed(0)}
        </label>
        <input
          type="range"
          min="0"
          max="90"
          step="1"
          value={polarizerAngle}
          onChange={(e) => setPolarizerAngle(parseFloat(e.target.value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', minHeight: '44px', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Surface Material:
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(Object.keys(materials) as Array<keyof typeof materials>).map((m) => (
            <button
              key={m}
              onClick={() => setMaterial(m)}
              style={{
                padding: '8px 16px',
                minHeight: '44px',
                borderRadius: '6px',
                border: material === m ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: material === m ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {materials[m].name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textSecondary, cursor: 'pointer', minHeight: '44px' }}>
          <input
            type="checkbox"
            checked={showPolarizer}
            onChange={(e) => setShowPolarizer(e.target.checked)}
          />
          Show Polarizing Filter
        </label>
      </div>

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          P-polarized reflectivity: {(rp * 100).toFixed(1)}%
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          S-polarized reflectivity: {(rs * 100).toFixed(1)}%
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          At Brewster angle, p-polarized reflection drops to 0%
        </div>
      </div>
    </div>
  );

  // Navigation bar component - fixed at top
  const renderNavigationBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      background: colors.bgDark,
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      zIndex: 1000,
    }}>
      <button
        onClick={goToPreviousPhase}
        disabled={currentPhaseIndex === 0}
        aria-label="Back"
        style={{
          padding: '8px 16px',
          minHeight: '44px',
          borderRadius: '8px',
          border: `1px solid ${colors.textMuted}`,
          background: 'transparent',
          color: currentPhaseIndex === 0 ? colors.textMuted : colors.textPrimary,
          cursor: currentPhaseIndex === 0 ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '14px',
        }}
      >
        Back
      </button>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {PHASES.map((p, i) => (
          <button
            key={p}
            onClick={() => goToPhase(p)}
            aria-label={`Go to ${p} phase`}
            title={p}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              border: 'none',
              background: i === currentPhaseIndex ? colors.accent : i < currentPhaseIndex ? colors.success : 'rgba(255,255,255,0.2)',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>

      <button
        onClick={goToNextPhase}
        disabled={currentPhaseIndex === PHASES.length - 1}
        aria-label="Next"
        style={{
          padding: '8px 16px',
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: currentPhaseIndex === PHASES.length - 1 ? 'rgba(255,255,255,0.1)' : colors.accent,
          color: currentPhaseIndex === PHASES.length - 1 ? colors.textMuted : 'white',
          cursor: currentPhaseIndex === PHASES.length - 1 ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '14px',
        }}
      >
        Next
      </button>
    </nav>
  );

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: '60px',
      left: 0,
      right: 0,
      height: '4px',
      background: 'rgba(255,255,255,0.1)',
      zIndex: 999,
    }}>
      <div
        role="progressbar"
        aria-valuenow={((currentPhaseIndex + 1) / PHASES.length) * 100}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height: '100%',
          width: `${((currentPhaseIndex + 1) / PHASES.length) * 100}%`,
          background: colors.accent,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );

  // Main layout wrapper
  const renderLayout = (content: React.ReactNode) => (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: colors.bgPrimary
    }}>
      {renderNavigationBar()}
      {renderProgressBar()}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '70px',
        paddingBottom: '80px',
      }}>
        {content}
      </div>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return renderLayout(
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 'normal', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Introduction
        </p>
        <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
          The Glare-Killing Angle
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: '18px', fontWeight: 400, marginBottom: '24px' }}>
          At what angle does glare become most polarizable?
        </p>

        {renderVisualization(true)}

        <div style={{
          background: colors.bgCard,
          padding: '20px',
          borderRadius: '12px',
          marginTop: '16px',
          marginBottom: '16px',
        }}>
          <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: 'normal' }}>
            Shine a light on a glossy surface. Rotate a polarizing filter in front of your
            eyes and watch the glare change. At certain viewing angles, the polarizer can
            almost completely eliminate the reflection!
          </p>
          <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px', fontWeight: 400 }}>
            This magic angle is called the Brewster angle - and it is the secret behind
            polarized sunglasses and glare-free optics.
          </p>
        </div>

        <div style={{
          background: 'rgba(139, 92, 246, 0.2)',
          padding: '16px',
          borderRadius: '8px',
          borderLeft: `3px solid ${colors.accent}`,
        }}>
          <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'normal' }}>
            Click Sweep Angles to watch how glare intensity changes with viewing angle!
          </p>
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return renderLayout(
      <>
        {/* Progress indicator for predict phase */}
        <div style={{
          padding: '16px',
          textAlign: 'center',
          background: 'rgba(139, 92, 246, 0.1)',
          borderBottom: '1px solid rgba(139, 92, 246, 0.3)',
        }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, fontWeight: 'normal' }}>
            Step 1 of 2: Make your prediction
          </p>
          {/* Step indicators */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
            <div style={{ width: '24px', height: '4px', borderRadius: '2px', background: colors.accent }} />
            <div style={{ width: '24px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)' }} />
          </div>
        </div>

        {renderVisualization(false)}

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '16px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You Are Looking At:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, fontWeight: 'normal' }}>
            A light ray hitting a glossy surface. The yellow ray is incoming light.
            The orange ray is reflected light (glare). The blue ray is light entering the material.
            The glare meter shows how much light is reflected.
          </p>
        </div>

        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
            When you change the viewing angle, what happens to glare reduction with a polarizer?
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {predictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setPrediction(p.id)}
                style={{
                  padding: '16px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: 'normal',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {prediction && (
          <div style={{ padding: '0 16px 16px 16px' }}>
            <button
              onClick={goToNextPhase}
              style={{
                width: '100%',
                padding: '16px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: colors.accent,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              Test My Prediction
            </button>
          </div>
        )}
      </>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return renderLayout(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Brewster Angle</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>

            Adjust the angle and polarizer to minimize glare. Observe how the reflectance ratio changes with angle.
          </p>
        </div>

        {/* Real-world relevance */}
        <div style={{
          background: 'rgba(139, 92, 246, 0.15)',
          margin: '0 16px 8px 16px',
          padding: '12px 16px',
          borderRadius: '8px',
          borderLeft: `3px solid ${colors.accent}`,
        }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
            <strong style={{ color: colors.accent }}>Why This Matters:</strong> This concept is used in industry by companies like Ray-Ban and Oakley for polarized sunglasses, Canon and Nikon for camera filters, and in laser technology for Brewster windows. Understanding this helps engineers design better optical systems.
          </p>
        </div>

        {/* Observation guidance */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          margin: '0 16px 16px 16px',
          padding: '12px 16px',
          borderRadius: '8px',
          borderLeft: `3px solid ${colors.success}`,
        }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
            <strong style={{ color: colors.success }}>Observe:</strong> Watch how the glare intensity changes as you adjust the incident angle. Notice when p-polarized reflectivity approaches zero.
          </p>
        </div>

        {/* Side-by-side layout: SVG left, controls right */}


        <div style={{


          display: 'flex',


          flexDirection: isMobile ? 'column' : 'row',


          gap: isMobile ? '12px' : '20px',


          width: '100%',


          alignItems: isMobile ? 'center' : 'flex-start',


        }}>


          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


            {renderVisualization(true)}


          </div>


          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


            {renderControls()}


          </div>


        </div>

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '16px',
          borderRadius: '12px',
        }}>
          <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
          <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
            <li>Set angle near 56 for glass - watch p-polarized reflection vanish</li>
            <li>Rotate polarizer at Brewster angle - glare drops dramatically</li>
            <li>Compare angles far from Brewster - polarizer is less effective</li>
            <li>Try Sweep Angles to see the intensity curve</li>
          </ul>
        </div>
      </>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'brewster';

    return renderLayout(
      <>
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
          <p style={{ color: colors.textPrimary, fontWeight: 'normal' }}>
            {wasCorrect
              ? 'As you predicted, there is a specific angle where glare reduction is maximum!'
              : 'You predicted differently, but the result shows there is a specific angle where glare reduction is maximum.'}
          </p>
          <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '8px', fontWeight: 'normal' }}>
            This demonstrates the key insight: the Brewster angle is real and predictable.
          </p>
        </div>

        {/* Visual diagram for review */}
        {renderVisualization(false)}

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Understanding the Physics</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, fontWeight: 'normal' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>The Reason:</strong> Because light is a transverse wave,
              it can oscillate in different directions. When light reflects at an angle, it splits into two
              polarization components: s-polarized (perpendicular) and p-polarized (parallel to the plane).
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Brewster Discovery:</strong> At a specific
              angle (tan(theta) = n), the reflected and refracted rays are perpendicular. Therefore,
              p-polarized light cannot reflect because the oscillation direction aligns with the reflected ray direction.
            </p>
            <p>
              <strong style={{ color: colors.textPrimary }}>The Result:</strong> The reflected light
              at Brewster angle is 100% s-polarized. This means a polarizer aligned to block s-polarization can
              eliminate glare completely.
            </p>
          </div>
        </div>
      </>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return renderLayout(
      <>
        {/* Progress indicator */}
        <div style={{
          padding: '16px',
          textAlign: 'center',
          background: 'rgba(245, 158, 11, 0.1)',
          borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
        }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, fontWeight: 'normal' }}>
            Step 1 of 2: Make your twist prediction
          </p>
          {/* Step indicators */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
            <div style={{ width: '24px', height: '4px', borderRadius: '2px', background: colors.warning }} />
            <div style={{ width: '24px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)' }} />
          </div>
        </div>

        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
          <p style={{ color: colors.textSecondary, fontWeight: 'normal' }}>
            What happens when we try different materials?
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
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5, fontWeight: 'normal' }}>
            We found the Brewster angle for glass. But water and plastic have different
            refractive indices. Does the magic angle change?
          </p>
        </div>

        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
            For different materials (water, glass, plastic), what happens to Brewster angle?
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {twistPredictions.map((p) => (
              <button
                key={p.id}
                onClick={() => setTwistPrediction(p.id)}
                style={{
                  padding: '16px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                  background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: 'normal',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {twistPrediction && (
          <div style={{ padding: '0 16px 16px 16px' }}>
            <button
              onClick={goToNextPhase}
              style={{
                width: '100%',
                padding: '16px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: colors.warning,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              Test My Prediction
            </button>
          </div>
        )}
      </>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return renderLayout(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Compare Materials</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            Switch between water, glass, and plastic to compare Brewster angles
          </p>
        </div>

        {/* Observation guidance */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.15)',
          margin: '0 16px 16px 16px',
          padding: '12px 16px',
          borderRadius: '8px',
          borderLeft: `3px solid ${colors.warning}`,
        }}>
          <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
            <strong style={{ color: colors.warning }}>Observe:</strong> Switch between materials and note how the Brewster angle changes. Higher refractive index means higher Brewster angle.
          </p>
        </div>

        {/* Side-by-side layout: SVG left, controls right */}


        <div style={{


          display: 'flex',


          flexDirection: isMobile ? 'column' : 'row',


          gap: isMobile ? '12px' : '20px',


          width: '100%',


          alignItems: isMobile ? 'center' : 'flex-start',


        }}>


          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


            {renderVisualization(true)}


          </div>


          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


            {renderControls()}


          </div>


        </div>

        <div style={{
          background: 'rgba(245, 158, 11, 0.2)',
          margin: '16px',
          padding: '16px',
          borderRadius: '12px',
          borderLeft: `3px solid ${colors.warning}`,
        }}>
          <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            Water (n=1.33): Brewster angle = 53.1<br/>
            Plastic (n=1.49): Brewster angle = 56.1<br/>
            Glass (n=1.52): Brewster angle = 56.7<br/><br/>
            Higher refractive index means higher Brewster angle!
          </p>
        </div>
      </>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'different';

    return renderLayout(
      <>
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
            Different materials have different Brewster angles based on their refractive index!
          </p>
        </div>

        {/* Visual diagram for twist review */}
        {renderVisualization(false)}

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Brewster Formula</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>tan(theta_B) = n</strong><br/>
              The Brewster angle is simply the arctangent of the refractive index.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Physical Meaning:</strong> At Brewster
              angle, the reflected and refracted rays are exactly 90 apart. This geometry
              prevents p-polarized oscillations from coupling into the reflected direction.
            </p>
            <p>
              <strong style={{ color: colors.textPrimary }}>Practical Impact:</strong> Photographers
              must adjust their polarizer angle when shooting different surfaces - water vs glass
              have optimal angles that differ by several degrees!
            </p>
          </div>
        </div>
      </>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Brewster Angle"
        applications={transferApplications}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (phase === 'transfer') {
    const currentApp = transferApplications[currentTransferApp];
    const allCompleted = transferCompleted.size >= transferApplications.length;

    return renderLayout(
      <>
        <div style={{ padding: '16px' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
            Brewster angle physics is used by companies like Canon, Nikon, Zeiss, and Coherent in their optical products
          </p>

          {/* Progress indicator for transfer phase */}
          <div style={{
            background: 'rgba(139, 92, 246, 0.1)',
            padding: '12px',
            borderRadius: '8px',
            textAlign: 'center',
            marginBottom: '16px',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              Application {currentTransferApp + 1} of {transferApplications.length} - {transferCompleted.size} completed
            </p>
          </div>

          {/* Industry context */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            borderLeft: `3px solid ${colors.success}`,
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
              <strong style={{ color: colors.success }}>Industry Impact:</strong> The global polarized sunglasses market is worth over $5 billion annually. Polarizing filters reduce glare by up to 99% when aligned correctly. In high-power laser systems, Brewster windows can handle intensities exceeding 10 MW/cm2 without damage. Professional photographers rely on these principles - a quality circular polarizer filter costs $100-300 and can transform outdoor photography by eliminating 95% of reflections from water and glass surfaces.
            </p>
          </div>

          {/* Key statistics */}
          <div style={{
            background: 'rgba(139, 92, 246, 0.1)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
              <strong style={{ color: colors.accent }}>Key Numbers:</strong> Glass has a Brewster angle of 56.7 degrees (n=1.52). Water is at 53.1 degrees (n=1.33). Diamond, with n=2.42, has a Brewster angle of approximately 67.5 degrees. These precise angles are critical for optical engineering applications.
            </p>
          </div>
        </div>

        {/* Current application card */}
        <div
          style={{
            background: colors.bgCard,
            margin: '0 16px 16px 16px',
            padding: '20px',
            borderRadius: '12px',
            border: transferCompleted.has(currentTransferApp) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', margin: 0 }}>{currentApp.title}</h3>
            {transferCompleted.has(currentTransferApp) && <span style={{ color: colors.success, fontWeight: 'bold' }}>Completed</span>}
          </div>
          <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '16px', lineHeight: 1.6 }}>{currentApp.description}</p>
          <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
            <p style={{ color: colors.accent, fontSize: '14px', fontWeight: 'bold', margin: 0 }}>{currentApp.question}</p>
          </div>
          {!transferCompleted.has(currentTransferApp) ? (
            <button
              onClick={() => setTransferCompleted(new Set([...transferCompleted, currentTransferApp]))}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              Reveal Answer
            </button>
          ) : (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px', margin: 0, lineHeight: 1.6 }}>{currentApp.answer}</p>
            </div>
          )}
        </div>

        {/* Navigation between applications */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px 16px 16px', gap: '12px' }}>
          <button
            onClick={() => setCurrentTransferApp(Math.max(0, currentTransferApp - 1))}
            disabled={currentTransferApp === 0}
            style={{
              flex: 1,
              padding: '12px',
              minHeight: '44px',
              borderRadius: '8px',
              border: `1px solid ${colors.textMuted}`,
              background: 'transparent',
              color: currentTransferApp === 0 ? colors.textMuted : colors.textPrimary,
              cursor: currentTransferApp === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            Previous App
          </button>
          {currentTransferApp < transferApplications.length - 1 ? (
            <button
              onClick={() => setCurrentTransferApp(currentTransferApp + 1)}
              style={{
                flex: 1,
                padding: '12px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: colors.accent,
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Next App
            </button>
          ) : (
            <button
              onClick={goToNextPhase}
              disabled={!allCompleted}
              style={{
                flex: 1,
                padding: '12px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: allCompleted ? colors.success : 'rgba(255,255,255,0.1)',
                color: allCompleted ? 'white' : colors.textMuted,
                cursor: allCompleted ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
              }}
            >
              Got It - Continue
            </button>
          )}
        </div>

        {/* Application dots indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '0 16px 16px 16px' }}>
          {transferApplications.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentTransferApp(i)}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                border: 'none',
                background: i === currentTransferApp
                  ? colors.accent
                  : transferCompleted.has(i)
                    ? colors.success
                    : 'rgba(255,255,255,0.2)',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          ))}
        </div>
      </>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return renderLayout(
        <>
          <div style={{
            background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
          }}>
            <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
              Test Complete! {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>You scored {testScore}/10</p>
            <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
              {testScore >= 8 ? 'You have mastered Brewster angle!' : 'Review the material and try again.'}
            </p>
          </div>
          {testQuestions.map((q, qIndex) => {
            const userAnswer = testAnswers[qIndex];
            const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
            return (
              <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>Q{qIndex + 1}. {q.question}</p>
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                    {opt.correct ? 'Correct:' : userAnswer === oIndex ? 'Your answer:' : ''} {opt.text}
                  </div>
                ))}
              </div>
            );
          })}
          <div style={{ padding: '16px' }}>
            <button
              onClick={testScore >= 8 ? goToNextPhase : () => { setTestSubmitted(false); setCurrentTestQuestion(0); setTestAnswers(new Array(10).fill(null)); setCheckedAnswers(new Set()); }}
              style={{
                width: '100%',
                padding: '16px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: testScore >= 8 ? colors.success : colors.accent,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              {testScore >= 8 ? 'Complete Mastery' : 'Review and Retry'}
            </button>
          </div>
        </>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    const isChecked = checkedAnswers.has(currentTestQuestion);
    const userAnswer = testAnswers[currentTestQuestion];
    const isCorrect = userAnswer !== null && currentQ.options[userAnswer].correct;
    const correctIndex = currentQ.options.findIndex(o => o.correct);

    const handleCheckAnswer = () => {
      if (userAnswer !== null) {
        setCheckedAnswers(new Set([...checkedAnswers, currentTestQuestion]));
      }
    };

    const handleNextQuestion = () => {
      if (currentTestQuestion < testQuestions.length - 1) {
        setCurrentTestQuestion(currentTestQuestion + 1);
      }
    };

    return renderLayout(
      <>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: colors.textPrimary, margin: 0 }}>Knowledge Test</h2>
            <span style={{ color: colors.textSecondary, fontWeight: 'bold' }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
          </div>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
            {testQuestions.map((_, i) => (
              <div key={i} onClick={() => !isChecked && setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: checkedAnswers.has(i) ? colors.success : testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: isChecked ? 'default' : 'pointer' }} />
            ))}
          </div>
          <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5, margin: 0 }}>
              <strong style={{ color: colors.accent }}>Question {currentTestQuestion + 1}:</strong> {currentQ.question}
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '8px', fontStyle: 'italic' }}>
              This question tests your understanding of Brewster angle and polarization physics.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentQ.options.map((opt, oIndex) => {
              let borderStyle = '1px solid rgba(255,255,255,0.2)';
              let bgStyle = 'transparent';
              if (isChecked) {
                if (opt.correct) {
                  borderStyle = `2px solid ${colors.success}`;
                  bgStyle = 'rgba(16, 185, 129, 0.2)';
                } else if (userAnswer === oIndex) {
                  borderStyle = `2px solid ${colors.error}`;
                  bgStyle = 'rgba(239, 68, 68, 0.2)';
                }
              } else if (userAnswer === oIndex) {
                borderStyle = `2px solid ${colors.accent}`;
                bgStyle = 'rgba(139, 92, 246, 0.2)';
              }
              return (
                <button
                  key={oIndex}
                  onClick={() => !isChecked && handleTestAnswer(currentTestQuestion, oIndex)}
                  disabled={isChecked}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: borderStyle,
                    background: bgStyle,
                    color: colors.textPrimary,
                    cursor: isChecked ? 'default' : 'pointer',
                    textAlign: 'left',
                    fontSize: '14px'
                  }}
                >
                  {String.fromCharCode(65 + oIndex)}) {opt.text}
                  {isChecked && opt.correct && <span style={{ marginLeft: '8px', color: colors.success }}>Correct</span>}
                  {isChecked && userAnswer === oIndex && !opt.correct && <span style={{ marginLeft: '8px', color: colors.error }}>Your answer</span>}
                </button>
              );
            })}
          </div>

          {/* Explanation section after checking */}
          {isChecked && (
            <div style={{
              background: isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              padding: '16px',
              borderRadius: '8px',
              marginTop: '16px',
              borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
            }}>
              <p style={{ color: isCorrect ? colors.success : colors.error, fontWeight: 'bold', marginBottom: '8px' }}>
                {isCorrect ? 'Correct!' : `Incorrect. The correct answer is ${String.fromCharCode(65 + correctIndex)}.`}
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
                <strong>Explanation:</strong> {currentQ.explanation}
              </p>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', gap: '12px' }}>
          <button
            onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
            disabled={currentTestQuestion === 0 || isChecked}
            style={{
              flex: 1,
              padding: '12px 24px',
              minHeight: '44px',
              borderRadius: '8px',
              border: `1px solid ${colors.textMuted}`,
              background: 'transparent',
              color: (currentTestQuestion === 0 || isChecked) ? colors.textMuted : colors.textPrimary,
              cursor: (currentTestQuestion === 0 || isChecked) ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            Previous
          </button>
          {!isChecked ? (
            <button
              onClick={() => {
                if (userAnswer !== null) {
                  handleCheckAnswer();
                }
              }}
              style={{
                flex: 1,
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: userAnswer === null ? colors.textMuted : colors.accent,
                color: 'white',
                cursor: userAnswer === null ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={currentTestQuestion < testQuestions.length - 1 ? handleNextQuestion : submitTest}
              aria-label={currentTestQuestion < testQuestions.length - 1 ? "Next Question" : "Submit Test"}
              style={{
                flex: 1,
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: currentTestQuestion < testQuestions.length - 1 ? colors.accent : colors.success,
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              {currentTestQuestion < testQuestions.length - 1 ? 'Next Question' : 'Submit Test'}
            </button>
          )}
        </div>
      </>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return renderLayout(
      <>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }} role="img" aria-label="trophy">&#127942;</div>
          <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
          <p style={{ color: colors.textSecondary, marginBottom: '24px', fontWeight: 'normal' }}>You have mastered Brewster angle and polarization-based glare control</p>
        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
            <li>Brewster angle: tan(theta) = n</li>
            <li>P-polarized light has zero reflection at Brewster angle</li>
            <li>Reflected light becomes s-polarized at Brewster angle</li>
            <li>Different materials have different Brewster angles</li>
            <li>Polarizing filters exploit this for glare reduction</li>
          </ul>
        </div>
        <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
            Brewster angle has applications in laser physics, fiber optics, and even art authentication.
            Ellipsometry uses Brewster angle principles to measure thin film properties at the nanometer
            scale. The mathematics connects to Fresnel equations and electromagnetic wave theory!
          </p>
        </div>
        {renderVisualization(true)}
        <div style={{ padding: '16px' }}>
          <button
            onClick={onPhaseComplete}
            style={{
              width: '100%',
              padding: '16px',
              minHeight: '44px',
              borderRadius: '8px',
              border: 'none',
              background: colors.success,
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Complete Game
          </button>
        </div>
      </>
    );
  }

  // Fallback for invalid phase - render hook
  return renderLayout(
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
        The Glare-Killing Angle
      </h1>
      <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
        At what angle does glare become most polarizable?
      </p>
      {renderVisualization(true)}
    </div>
  );
};

export default BrewsterAngleRenderer;
