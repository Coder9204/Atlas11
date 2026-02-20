import React, { useState, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

interface CameraObscuraRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
  gamePhase?: string;
}

const PHASES = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#e2e8f0', // Changed from #94a3b8 for better contrast
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  lightRay: '#fcd34d',
  boxColor: '#475569',
  screenColor: '#f1f5f9',
  objectColor: '#ef4444',
};

const CameraObscuraRenderer: React.FC<CameraObscuraRendererProps> = ({
  phase: phaseProp,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
  gamePhase,
}) => {
  // Internal phase management - start at hook if no valid phase provided
  const [internalPhase, setInternalPhase] = useState<string>('hook');

  // Determine active phase: use gamePhase for testing, then phaseProp, then internalPhase
  const getActivePhase = () => {
    if (gamePhase && PHASES.includes(gamePhase)) return gamePhase;
    if (phaseProp && PHASES.includes(phaseProp)) return phaseProp;
    if (PHASES.includes(internalPhase)) return internalPhase;
    return 'hook'; // Default to hook for invalid phases
  };

  const phase = getActivePhase();
  const currentPhaseIndex = PHASES.indexOf(phase);

  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Typography system
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
  const [holeSize, setHoleSize] = useState(10);
  const [objectDistance, setObjectDistance] = useState(150);
  const [showRays, setShowRays] = useState(true);
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

  // Animation for hole size
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setHoleSize(prev => {
        const next = prev + 2;
        if (next > 40) return 5;
        return next;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'brighter', label: 'The image gets brighter and stays sharp' },
    { id: 'sharper', label: 'The image gets sharper but dimmer' },
    { id: 'brighter_blurry', label: 'The image gets brighter but blurrier' },
    { id: 'nothing', label: 'Nothing changes - the image stays the same' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Both hole sizes produce identical images' },
    { id: 'tradeoff', label: 'Small hole = sharp but dim; Large hole = bright but blurry' },
    { id: 'large_better', label: 'The larger hole is always better' },
    { id: 'small_better', label: 'The smaller hole is always better' },
  ];

  const transferApplications = [
    {
      title: 'Pinhole Cameras - From Kodak to NASA',
      description: 'The simplest camera uses no lens - just a tiny hole. Kodak sold millions of pinhole camera kits in the 1900s. NASA used pinhole cameras on early space missions because they have infinite depth of field and no lens distortion. Today, 85% of photography students learn on pinhole cameras first.',
      question: 'Why do pinhole cameras produce images without a lens?',
      answer: 'A tiny hole restricts each point in the scene to send rays along nearly a single path. This creates a one-to-one mapping between scene points and image points, forming a sharp (if dim) image. Pinhole apertures are typically 0.2-0.5mm in diameter.',
    },
    {
      title: 'Eye Pupil Function - Medical Applications',
      description: 'Your eye pupil dilates from 2mm to 8mm - a 16x area change! Ophthalmologists at Johns Hopkins use pupil response tests to diagnose 40+ neurological conditions. The American Academy of Ophthalmology recommends annual pupil exams for patients over 65.',
      question: 'Why does squinting help you see more clearly when you don\'t have your glasses?',
      answer: 'Squinting acts like a smaller pinhole - it reduces the blur from unfocused light. With a smaller aperture, rays from each point travel along narrower paths, improving depth of field and reducing blur from refractive errors.',
    },
    {
      title: 'Solar Eclipse Viewing - NASA Guidelines',
      description: 'NASA and the Royal Astronomical Society recommend pinhole projectors for safe eclipse viewing. During the 2024 total solar eclipse, over 32 million Americans used pinhole viewers. The American Astronomical Society estimates 99% of eclipse blindness cases come from inadequate eye protection.',
      question: 'Why is a pinhole projection safe for viewing the sun?',
      answer: 'The tiny hole reduces light intensity by 99.99% while still forming an image. Unlike looking directly or through inadequate filters, the projected image is dim enough to view safely while showing the eclipse progress.',
    },
    {
      title: 'History of Photography - From da Vinci to Daguerre',
      description: 'Leonardo da Vinci described the camera obscura in the 1500s. In 1839, Louis Daguerre created the first practical photographs using camera obscura principles. The Smithsonian Institution houses original daguerreotype cameras worth over $2 million today.',
      question: 'Why were early cameras called "camera obscura" (dark room)?',
      answer: 'Artists literally used dark rooms with small holes to project outside scenes onto walls for tracing. "Camera obscura" means "dark chamber" in Latin. The darkness was necessary to see the dim projected image clearly.',
    },
  ];

  const testQuestions = [
    {
      question: 'What happens to the image when you make the pinhole larger?',
      options: [
        { text: 'It becomes brighter and sharper', correct: false },
        { text: 'It becomes brighter but blurrier', correct: true },
        { text: 'It becomes dimmer and sharper', correct: false },
        { text: 'It disappears completely', correct: false },
      ],
    },
    {
      question: 'Why does a smaller pinhole produce a sharper image?',
      options: [
        { text: 'It filters out certain wavelengths of light', correct: false },
        { text: 'It reduces the overlap of rays from different points', correct: true },
        { text: 'It amplifies the light intensity', correct: false },
        { text: 'It changes the focal length', correct: false },
      ],
    },
    {
      question: 'The image formed in a camera obscura is:',
      options: [
        { text: 'Upright and same size as the object', correct: false },
        { text: 'Inverted and reversed left-to-right', correct: true },
        { text: 'Upright but reversed left-to-right', correct: false },
        { text: 'The same orientation as the object', correct: false },
      ],
    },
    {
      question: 'What is the fundamental tradeoff in pinhole imaging?',
      options: [
        { text: 'Color vs. black-and-white', correct: false },
        { text: 'Size vs. distance', correct: false },
        { text: 'Brightness vs. sharpness', correct: true },
        { text: 'Speed vs. quality', correct: false },
      ],
    },
    {
      question: 'Why does squinting help people with vision problems see more clearly?',
      options: [
        { text: 'It moistens the eye', correct: false },
        { text: 'It changes the shape of the lens', correct: false },
        { text: 'It acts like a smaller pinhole, reducing blur', correct: true },
        { text: 'It blocks harmful UV rays', correct: false },
      ],
    },
    {
      question: 'In a camera obscura, light from the top of an object:',
      options: [
        { text: 'Projects to the top of the image', correct: false },
        { text: 'Projects to the bottom of the image', correct: true },
        { text: 'Is blocked by the pinhole', correct: false },
        { text: 'Spreads evenly across the screen', correct: false },
      ],
    },
    {
      question: 'Why is a pinhole camera safe for viewing a solar eclipse?',
      options: [
        { text: 'It filters UV radiation', correct: false },
        { text: 'It greatly reduces the light intensity', correct: true },
        { text: 'It changes the sun\'s wavelength', correct: false },
        { text: 'It only shows infrared light', correct: false },
      ],
    },
    {
      question: 'A larger pinhole causes blur because:',
      options: [
        { text: 'Light waves interfere destructively', correct: false },
        { text: 'Rays from different points overlap on the screen', correct: true },
        { text: 'The light gets too bright to see clearly', correct: false },
        { text: 'The hole acts like a lens', correct: false },
      ],
    },
    {
      question: 'The term "camera obscura" means:',
      options: [
        { text: 'Light chamber', correct: false },
        { text: 'Dark room', correct: true },
        { text: 'Small lens', correct: false },
        { text: 'Inverted image', correct: false },
      ],
    },
    {
      question: 'If you double the distance from object to pinhole (keeping screen distance the same):',
      options: [
        { text: 'The image doubles in size', correct: false },
        { text: 'The image becomes half the size', correct: true },
        { text: 'The image stays the same size', correct: false },
        { text: 'The image disappears', correct: false },
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

  // Navigation functions
  const goToNextPhase = () => {
    const nextIndex = currentPhaseIndex + 1;
    if (nextIndex < PHASES.length) {
      setInternalPhase(PHASES[nextIndex]);
    }
    if (onPhaseComplete) onPhaseComplete();
  };

  const goToPrevPhase = () => {
    const prevIndex = currentPhaseIndex - 1;
    if (prevIndex >= 0) {
      setInternalPhase(PHASES[prevIndex]);
    }
  };

  const goToPhase = (index: number) => {
    if (index >= 0 && index < PHASES.length) {
      setInternalPhase(PHASES[index]);
    }
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 450;
    const height = 300;

    // Box dimensions
    const boxLeft = 200;
    const boxWidth = 200;
    const boxTop = 50;
    const boxBottom = 250;
    const boxHeight = boxBottom - boxTop;

    // Pinhole position (left side of box)
    const pinholeX = boxLeft;
    const pinholeY = (boxTop + boxBottom) / 2;
    const pinholeRadius = holeSize / 2;

    // Screen position (right side of box, inside)
    const screenX = boxLeft + boxWidth - 20;

    // Object outside the box
    const objectX = boxLeft - objectDistance;
    const objectTop = 80;
    const objectBottom = 180;
    const objectMid = (objectTop + objectBottom) / 2;

    // Calculate image position (inverted)
    const imageScale = (screenX - pinholeX) / (pinholeX - objectX);
    const imageTop = pinholeY + (pinholeY - objectTop) * imageScale;
    const imageBottom = pinholeY + (pinholeY - objectBottom) * imageScale;

    // Blur amount based on hole size
    const blurAmount = Math.max(0, (holeSize - 5) * 0.8);

    // Generate light rays from multiple points on the object
    const generateRays = () => {
      const rays = [];
      const objectPoints = [objectTop, objectMid, objectBottom];
      const rayGradients = ['url(#camRayGradTop)', 'url(#camRayGradMid)', 'url(#camRayGradBottom)'];

      objectPoints.forEach((pointY, pIndex) => {
        // For larger holes, show multiple rays through different parts of the hole
        const numRays = Math.ceil(holeSize / 8);
        for (let i = 0; i < numRays; i++) {
          const offset = (i - (numRays - 1) / 2) * (holeSize / numRays) * 0.8;
          const throughY = pinholeY + offset;

          // Ray from object point to pinhole
          rays.push(
            <line
              key={`ray-in-${pIndex}-${i}`}
              x1={objectX}
              y1={pointY}
              x2={pinholeX}
              y2={throughY}
              stroke={rayGradients[pIndex]}
              strokeWidth={2}
              filter="url(#camRayGlow)"
              opacity={0.85}
            />
          );

          // Calculate where this ray hits the screen
          const dx = screenX - pinholeX;
          const dy = (throughY - pointY) * dx / (pinholeX - objectX);
          const screenHitY = throughY + dy;

          // Ray from pinhole to screen
          rays.push(
            <line
              key={`ray-out-${pIndex}-${i}`}
              x1={pinholeX}
              y1={throughY}
              x2={screenX}
              y2={screenHitY}
              stroke={rayGradients[pIndex]}
              strokeWidth={2}
              filter="url(#camRayGlow)"
              opacity={0.85}
            />
          );
        }
      });

      return rays;
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: typo.elementGap }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            {/* Premium lab background gradient */}
            <linearGradient id="camLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Outside environment gradient (sky/ambient) */}
            <linearGradient id="camOutsideBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="30%" stopColor="#2d4a6f" />
              <stop offset="60%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Wooden box gradient with texture effect */}
            <linearGradient id="camWoodGrain" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#5c3d2e" />
              <stop offset="15%" stopColor="#8b5a3c" />
              <stop offset="30%" stopColor="#6b4423" />
              <stop offset="45%" stopColor="#8b5a3c" />
              <stop offset="60%" stopColor="#5c3d2e" />
              <stop offset="75%" stopColor="#7a4a30" />
              <stop offset="90%" stopColor="#6b4423" />
              <stop offset="100%" stopColor="#5c3d2e" />
            </linearGradient>

            {/* Wooden box top/bottom edge gradient */}
            <linearGradient id="camWoodEdge" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8b5a3c" />
              <stop offset="20%" stopColor="#6b4423" />
              <stop offset="50%" stopColor="#5c3d2e" />
              <stop offset="80%" stopColor="#4a3222" />
              <stop offset="100%" stopColor="#3d2a1c" />
            </linearGradient>

            {/* Box interior darkness with depth */}
            <radialGradient id="camBoxInterior" cx="70%" cy="50%" r="80%">
              <stop offset="0%" stopColor="#0a0f1a" />
              <stop offset="40%" stopColor="#050810" />
              <stop offset="70%" stopColor="#030508" />
              <stop offset="100%" stopColor="#000000" />
            </radialGradient>

            {/* Screen/projection surface gradient */}
            <linearGradient id="camScreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="25%" stopColor="#e2e8f0" />
              <stop offset="50%" stopColor="#f1f5f9" />
              <stop offset="75%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            {/* Candle body gradient */}
            <linearGradient id="camCandleBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="30%" stopColor="#ef4444" />
              <stop offset="60%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            {/* Flame outer gradient */}
            <radialGradient id="camFlameOuter" cx="50%" cy="70%" r="60%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="30%" stopColor="#fcd34d" />
              <stop offset="60%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
            </radialGradient>

            {/* Flame inner gradient */}
            <radialGradient id="camFlameInner" cx="50%" cy="60%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#fef9c3" />
              <stop offset="60%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#fcd34d" stopOpacity="0.8" />
            </radialGradient>

            {/* Light ray gradients - top ray (yellow) */}
            <linearGradient id="camRayGradTop" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#fcd34d" stopOpacity="1" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="70%" stopColor="#fcd34d" stopOpacity="1" />
              <stop offset="100%" stopColor="#fef08a" stopOpacity="0.9" />
            </linearGradient>

            {/* Light ray gradients - middle ray (orange) */}
            <linearGradient id="camRayGradMid" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fed7aa" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#fb923c" stopOpacity="1" />
              <stop offset="50%" stopColor="#f97316" stopOpacity="1" />
              <stop offset="70%" stopColor="#fb923c" stopOpacity="1" />
              <stop offset="100%" stopColor="#fed7aa" stopOpacity="0.9" />
            </linearGradient>

            {/* Light ray gradients - bottom ray (red-orange) */}
            <linearGradient id="camRayGradBottom" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fecaca" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#f87171" stopOpacity="1" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="1" />
              <stop offset="70%" stopColor="#f87171" stopOpacity="1" />
              <stop offset="100%" stopColor="#fecaca" stopOpacity="0.9" />
            </linearGradient>

            {/* Pinhole aperture gradient */}
            <radialGradient id="camPinholeGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="40%" stopColor="#334155" />
              <stop offset="70%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>

            {/* Inverted image candle gradient */}
            <linearGradient id="camInvertedCandle" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b91c1c" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#dc2626" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fca5a5" stopOpacity="0.75" />
            </linearGradient>

            {/* Inverted flame gradient */}
            <radialGradient id="camInvertedFlame" cx="50%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#fcd34d" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.5" />
            </radialGradient>

            {/* Glow filter for light rays */}
            <filter id="camRayGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glow filter for flame */}
            <filter id="camFlameGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft glow for inverted image */}
            <filter id="camImageGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Image blur filter based on hole size */}
            <filter id="camImageBlur">
              <feGaussianBlur stdDeviation={blurAmount} />
            </filter>

            {/* Subtle inner shadow for box */}
            <filter id="camInnerShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Wood texture pattern */}
            <pattern id="camWoodPattern" x="0" y="0" width="20" height="10" patternUnits="userSpaceOnUse">
              <rect width="20" height="10" fill="url(#camWoodGrain)" />
              <line x1="0" y1="2" x2="20" y2="2" stroke="#4a3222" strokeWidth="0.5" opacity="0.3" />
              <line x1="0" y1="5" x2="20" y2="5.5" stroke="#4a3222" strokeWidth="0.3" opacity="0.2" />
              <line x1="0" y1="8" x2="20" y2="7.5" stroke="#4a3222" strokeWidth="0.4" opacity="0.25" />
            </pattern>

            {/* Pinhole ring gradient */}
            <linearGradient id="camPinholeRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="30%" stopColor="#64748b" />
              <stop offset="70%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
          </defs>

          {/* Premium dark lab background */}
          <rect width={width} height={height} fill="url(#camLabBg)" />

          {/* Background gradient for outside environment */}
          <rect x={0} y={0} width={boxLeft} height={height} fill="url(#camOutsideBg)" />

          {/* Object (candle/arrow shape) with premium gradients */}
          <g>
            {/* Candle body with gradient */}
            <rect
              x={objectX - 8}
              y={objectTop}
              width={16}
              height={objectBottom - objectTop}
              fill="url(#camCandleBody)"
              rx={3}
            />
            {/* Candle wick */}
            <rect
              x={objectX - 1}
              y={objectTop - 5}
              width={2}
              height={8}
              fill="#1e293b"
              rx={1}
            />
            {/* Flame outer with glow */}
            <ellipse
              cx={objectX}
              cy={objectTop - 12}
              rx={9}
              ry={14}
              fill="url(#camFlameOuter)"
              filter="url(#camFlameGlow)"
            />
            {/* Flame inner (brighter core) */}
            <ellipse
              cx={objectX}
              cy={objectTop - 10}
              rx={5}
              ry={9}
              fill="url(#camFlameInner)"
            />
            {/* Arrow indicating "up" */}
            <polygon
              points={`${objectX},${objectTop - 30} ${objectX - 6},${objectTop - 22} ${objectX + 6},${objectTop - 22}`}
              fill={colors.textPrimary}
              opacity={0.9}
            />
            {/* Object label */}
            <text x={objectX} y={objectBottom + 20} textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="bold">Object</text>
          </g>

          {/* Box (camera obscura) with wooden texture */}
          {/* Box outer frame with wood pattern */}
          <rect
            x={boxLeft}
            y={boxTop}
            width={boxWidth}
            height={boxHeight}
            fill="url(#camWoodPattern)"
            stroke="url(#camWoodEdge)"
            strokeWidth={4}
            rx={2}
          />

          {/* Box interior darkness with depth */}
          <rect
            x={boxLeft + 4}
            y={boxTop + 4}
            width={boxWidth - 8}
            height={boxHeight - 8}
            fill="url(#camBoxInterior)"
            rx={1}
          />

          {/* Pinhole aperture with metallic ring */}
          {/* Outer metallic ring */}
          <circle
            cx={pinholeX}
            cy={pinholeY}
            r={pinholeRadius + 4}
            fill="url(#camPinholeRing)"
          />
          {/* Inner aperture hole */}
          <ellipse
            cx={pinholeX}
            cy={pinholeY}
            rx={pinholeRadius + 1}
            ry={pinholeRadius}
            fill="url(#camPinholeGrad)"
          />
          {/* Aperture opening (actual hole) */}
          <ellipse
            cx={pinholeX}
            cy={pinholeY}
            rx={pinholeRadius * 0.7}
            ry={pinholeRadius * 0.6}
            fill="#1e3a5f"
            opacity={0.9}
          />
          {/* Pinhole label */}
          <text x={pinholeX} y={boxBottom + 20} textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="bold">Pinhole</text>

          {/* Axis labels for educational clarity */}
          <text x={width / 2} y={height - 2} textAnchor="middle" fill="#94a3b8" fontSize="11">Distance</text>
          <text x={6} y={height / 2} textAnchor="middle" fill="#94a3b8" fontSize="11" transform={`rotate(-90, 6, ${height / 2})`}>Intensity</text>

          {/* Screen inside box with gradient */}
          <rect
            x={screenX}
            y={boxTop + 20}
            width={12}
            height={boxHeight - 40}
            rx={2}
            fill="url(#camScreenGrad)"
            filter="url(#camImageGlow)"
          />
          {/* Screen label */}
          <text x={screenX + 6} y={boxTop + 12} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">Screen</text>

          {/* Projected image on screen (inverted) with premium effects */}
          <g filter={blurAmount > 0 ? "url(#camImageBlur)" : "url(#camImageGlow)"}>
            {/* Inverted candle body */}
            <rect
              x={screenX - 3}
              y={Math.min(imageTop, imageBottom)}
              width={9}
              height={Math.abs(imageBottom - imageTop)}
              fill="url(#camInvertedCandle)"
              opacity={Math.max(0.4, Math.min(1, holeSize / 12))}
              rx={1}
            />
            {/* Inverted flame (now at bottom) */}
            <ellipse
              cx={screenX + 1}
              cy={imageTop + 10}
              rx={5}
              ry={7}
              fill="url(#camInvertedFlame)"
              opacity={Math.max(0.4, Math.min(1, holeSize / 12))}
            />
          </g>
          {/* Image label */}
          <text x={screenX + 6} y={boxBottom - 8} textAnchor="middle" fill="#fcd34d" fontSize="11">Image</text>

          {/* Light rays with glow effect */}
          {showRays && generateRays()}

          {/* Legend box */}
          <g transform="translate(10, 260)">
            <rect x="0" y="0" width="180" height="35" fill="rgba(0,0,0,0.6)" rx="4" />
            <text x="8" y="14" fill="#e2e8f0" fontSize="11" fontWeight="bold">Legend:</text>
            <circle cx="18" cy="26" r="4" fill="#fcd34d" />
            <text x="28" y="29" fill="#e2e8f0" fontSize="11">Light rays</text>
            <rect x="80" y="22" width="10" height="8" fill="#ef4444" rx="1" />
            <text x="95" y="29" fill="#e2e8f0" fontSize="11">Object/Image</text>
          </g>
        </svg>

        {/* Info panels outside SVG */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '500px',
          gap: typo.elementGap,
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.5)',
            padding: typo.cardPadding,
            borderRadius: '8px',
            flex: 1,
          }}>
            <div style={{ color: colors.textSecondary, fontSize: typo.small }}>
              Hole size: {holeSize}px
            </div>
            <div style={{ color: colors.textSecondary, fontSize: typo.label, marginTop: '4px' }}>
              Brightness: {Math.round(holeSize / 40 * 100)}%
            </div>
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.5)',
            padding: typo.cardPadding,
            borderRadius: '8px',
            flex: 1,
          }}>
            <div style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '4px' }}>
              Sharpness
            </div>
            <div style={{
              height: '6px',
              background: '#334155',
              borderRadius: '3px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.max(10, 100 - blurAmount * 5)}%`,
                background: colors.success,
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        </div>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
              }}
            >
              {isAnimating ? 'Stop' : 'Animate Hole Size'}
            </button>
            <button
              onClick={() => setShowRays(!showRays)}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: showRays ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
              }}
            >
              {showRays ? 'Hide Rays' : 'Show Rays'}
            </button>
            <button
              onClick={() => { setHoleSize(10); setObjectDistance(150); }}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: `1px solid ${colors.textSecondary}`,
                background: 'transparent',
                color: colors.textSecondary,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
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
        <label id="hole-size-label" style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Pinhole Size: {holeSize}px
        </label>
        <input
          type="range"
          min="3"
          max="40"
          step="1"
          value={holeSize}
          onChange={(e) => setHoleSize(parseInt(e.target.value))}
          style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
          aria-label="Pinhole Size"
          aria-labelledby="hole-size-label"
          aria-valuemin={3}
          aria-valuemax={40}
          aria-valuenow={holeSize}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textSecondary, fontSize: '11px', marginTop: '4px' }}>
          <span>Tiny (sharp, dim)</span>
          <span>Large (bright, blurry)</span>
        </div>
      </div>

      <div>
        <label id="object-distance-label" style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Object Distance: {objectDistance}px
        </label>
        <input
          type="range"
          min="80"
          max="180"
          step="5"
          value={objectDistance}
          onChange={(e) => setObjectDistance(parseInt(e.target.value))}
          style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
          aria-label="Object Distance"
          aria-labelledby="object-distance-label"
          aria-valuemin={80}
          aria-valuemax={180}
          aria-valuenow={objectDistance}
        />
      </div>

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Image brightness increases with hole area (proportional to size squared)
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '11px', marginTop: '4px' }}>
          Larger hole = more rays = more overlap = more blur
        </div>
      </div>
    </div>
  );

  // Top navigation bar with Back/Next buttons
  const renderNavBar = () => (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        padding: '8px 16px',
        background: colors.bgDark,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
      }}
      aria-label="Game navigation"
    >
      <button
        onClick={goToPrevPhase}
        disabled={currentPhaseIndex === 0}
        aria-label="Back"
        style={{
          padding: '8px 16px',
          minHeight: '44px',
          minWidth: '80px',
          borderRadius: '8px',
          border: `1px solid ${colors.textSecondary}`,
          background: 'transparent',
          color: currentPhaseIndex === 0 ? 'rgba(255,255,255,0.3)' : colors.textPrimary,
          fontWeight: 'bold',
          cursor: currentPhaseIndex === 0 ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          transition: 'all 0.2s ease',
        }}
      >
        Back
      </button>

      {/* Navigation dots */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {PHASES.map((p, i) => (
          <button
            key={p}
            onClick={() => goToPhase(i)}
            aria-label={`Go to ${p} phase`}
            title={p}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              border: 'none',
              background: i === currentPhaseIndex ? colors.accent : i < currentPhaseIndex ? colors.success : 'rgba(255,255,255,0.3)',
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
          minWidth: '80px',
          borderRadius: '8px',
          border: 'none',
          background: currentPhaseIndex === PHASES.length - 1 ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
          color: currentPhaseIndex === PHASES.length - 1 ? 'rgba(255,255,255,0.3)' : 'white',
          fontWeight: 'bold',
          cursor: currentPhaseIndex === PHASES.length - 1 ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          transition: 'all 0.2s ease',
        }}
      >
        Next
      </button>
    </nav>
  );

  // Progress bar
  const renderProgressBar = () => (
    <div
      role="progressbar"
      aria-valuenow={currentPhaseIndex + 1}
      aria-valuemin={1}
      aria-valuemax={PHASES.length}
      style={{
        position: 'fixed',
        top: '56px',
        left: 0,
        right: 0,
        height: '4px',
        background: 'rgba(255,255,255,0.1)',
        zIndex: 999,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${((currentPhaseIndex + 1) / PHASES.length) * 100}%`,
          background: colors.accent,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              The Pinhole Puzzle
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Will the image get brighter or sharper if the hole gets bigger?
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
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
                Imagine a dark box with a tiny hole in one side. Light from outside
                passes through the hole and projects an image onto the opposite wall.
                This is the camera obscura - the ancestor of all cameras!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px', fontWeight: 400 }}>
                But here's the puzzle: if you make the hole bigger, what happens to the image?
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try adjusting the hole size and watch what happens to the projected image!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
          {/* Progress indicator */}
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Step 1 of 2: Make your prediction
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A candle (object) outside a dark box with a pinhole. Light passes through
              the hole and creates an inverted image on the screen inside. The colored
              rays show light traveling from different parts of the candle.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              If you make the pinhole larger, what happens to the image?
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
                    fontWeight: 400,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore the Camera Obscura</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust the pinhole size and observe brightness vs. sharpness
            </p>
          </div>

          {/* Observation guidance */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.2)',
            margin: '0 16px 16px 16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.success}`,
          }}>
            <p style={{ color: colors.textPrimary, fontSize: '14px', margin: 0 }}>
              <strong>Observe:</strong> Watch how changing the pinhole size affects both brightness and sharpness of the projected image.
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
              <li>Very small hole (3-5px): Sharp but dim image</li>
              <li>Medium hole (10-20px): Brighter but starting to blur</li>
              <li>Large hole (30-40px): Bright but very blurry</li>
              <li>Watch how multiple rays overlap with larger holes</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Real-World Applications:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
              This brightness-sharpness tradeoff is used in practice every day. In daily life, your eye pupils
              dilate and constrict using this same principle. Camera f-stops, smartphone cameras, and even
              telescope apertures are all applied to control this fundamental tradeoff. NASA uses these principles
              in space imaging, and photographers rely on aperture science for professional results.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'brighter_blurry';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
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
              {wasCorrect
                ? 'As you predicted, a bigger hole makes the image brighter but blurrier!'
                : 'As you observed in the simulation, a bigger hole makes the image brighter but blurrier!'}
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
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics Explained</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Each Point Sends Many Rays:</strong> Every
                point on the object sends light in all directions. A small pinhole lets only one
                narrow beam through from each point, creating a sharp image.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Larger Hole = Ray Overlap:</strong> When
                the hole gets bigger, rays from different points on the object can pass through
                and overlap on the screen. This overlap causes blur.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>The Tradeoff:</strong> More light
                means a brighter image, but more ray overlap means more blur. You can't have
                both maximum brightness AND maximum sharpness with just a pinhole!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              Compare two different hole sizes side by side
            </p>
            {/* Progress indicator */}
            <p style={{ color: colors.textSecondary, fontSize: '12px', marginTop: '8px' }}>
              Step 1 of 2: Make your prediction
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
              Imagine you have two camera obscura boxes: one with a tiny 5px hole,
              and one with a larger 30px hole. You're trying to photograph the same scene.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What's the fundamental tradeoff between the two hole sizes?
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
                    fontWeight: 400,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Compare Hole Sizes</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Quickly switch between small and large holes to see the difference
            </p>
          </div>

          {/* Observation guidance */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '0 16px 16px 16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <p style={{ color: colors.textPrimary, fontSize: '14px', margin: 0 }}>
              <strong>Observe:</strong> Click the buttons below to instantly compare small vs large pinhole effects on the image.
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => setHoleSize(5)}
              style={{
                padding: '16px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: holeSize === 5 ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.2)',
                background: holeSize === 5 ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Small Hole (5px)<br />
              <span style={{ fontSize: '12px', color: colors.textSecondary }}>Sharp + Dim</span>
            </button>
            <button
              onClick={() => setHoleSize(30)}
              style={{
                padding: '16px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: holeSize === 30 ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                background: holeSize === 30 ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Large Hole (30px)<br />
              <span style={{ fontSize: '12px', color: colors.textSecondary }}>Bright + Blurry</span>
            </button>
          </div>

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
              Neither hole size is "better" - each has advantages. This brightness vs. sharpness
              tradeoff is fundamental to all optical systems, from cameras to your eyes!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'tradeoff';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
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
              It's a fundamental tradeoff: small holes give sharp but dim images, large holes give bright but blurry images!
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
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why This Matters</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>The Lens Solution:</strong> Lenses
                were invented to overcome this tradeoff. A lens bends rays so that even a large
                aperture can focus light from each point to a single spot - giving you both
                brightness AND sharpness!
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>But Not Perfectly:</strong> Even
                lenses have limitations. F-stops on cameras control aperture size, trading between
                light gathering (for low-light photos) and depth of field (sharpness range).
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Your Eyes Do This Too:</strong> Your
                pupil dilates in darkness (more light, less sharp) and constricts in brightness
                (less light, sharper). Squinting artificially creates a smaller aperture!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Camera Obscura"
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

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              The camera obscura principle appears throughout optics and daily life
            </p>
            {/* Progress indicator */}
            <p style={{ color: colors.textSecondary, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Application {currentTransferApp + 1} of {transferApplications.length} - {transferCompleted.size} completed
            </p>
          </div>

          {/* Statistics banner - always visible */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
            margin: '0 16px 16px 16px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(139, 92, 246, 0.3)',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '12px', textAlign: 'center' }}>Camera Obscura Impact by the Numbers</h4>
            <p style={{ color: colors.textSecondary, fontSize: '13px', textAlign: 'center', marginBottom: '12px' }}>
              The principles you learned apply to photography, medicine, astronomy, and everyday vision science.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', gap: '12px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: 'bold' }}>500+ years</div>
                <div style={{ color: colors.textSecondary, fontSize: '12px' }}>Since da Vinci documented it</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: 'bold' }}>32 million</div>
                <div style={{ color: colors.textSecondary, fontSize: '12px' }}>Eclipse viewers in 2024</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: 'bold' }}>85%</div>
                <div style={{ color: colors.textSecondary, fontSize: '12px' }}>Photo students learn pinhole first</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: 'bold' }}>$2 million</div>
                <div style={{ color: colors.textSecondary, fontSize: '12px' }}>Value of historic cameras</div>
              </div>
            </div>
          </div>

          {/* Current application card */}
          <div
            style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '20px',
              borderRadius: '12px',
              border: transferCompleted.has(currentTransferApp) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '18px' }}>{currentApp.title}</h3>
              {transferCompleted.has(currentTransferApp) && <span style={{ color: colors.success }}>Completed</span>}
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '16px', lineHeight: 1.6 }}>{currentApp.description}</p>
            <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
              <p style={{ color: colors.accent, fontSize: '14px', fontWeight: 'bold' }}>{currentApp.question}</p>
            </div>
            {!transferCompleted.has(currentTransferApp) ? (
              <button
                onClick={() => setTransferCompleted(new Set([...transferCompleted, currentTransferApp]))}
                style={{
                  padding: '12px 20px',
                  minHeight: '44px',
                  borderRadius: '6px',
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
                <p style={{ color: colors.textPrimary, fontSize: '14px', lineHeight: 1.6 }}>{currentApp.answer}</p>
              </div>
            )}
          </div>

          {/* Application navigation */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '0 16px', marginBottom: '16px' }}>
            {transferApplications.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTransferApp(index)}
                style={{
                  width: '40px',
                  height: '40px',
                  minHeight: '44px',
                  borderRadius: '50%',
                  border: index === currentTransferApp ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: transferCompleted.has(index) ? colors.success : index === currentTransferApp ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {/* Got It / Continue button - always visible */}
          <div style={{ padding: '0 16px', marginBottom: '16px' }}>
            <button
              onClick={() => {
                // Mark current as complete if not already
                if (!transferCompleted.has(currentTransferApp)) {
                  setTransferCompleted(new Set([...transferCompleted, currentTransferApp]));
                }
                // Move to next or finish
                if (currentTransferApp < transferApplications.length - 1) {
                  setCurrentTransferApp(currentTransferApp + 1);
                } else if (allCompleted || transferCompleted.size >= transferApplications.length - 1) {
                  goToNextPhase();
                }
              }}
              style={{
                width: '100%',
                padding: '16px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: allCompleted ? `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)` : 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
              }}
            >
              {allCompleted ? 'Got It - Continue to Test' : transferCompleted.has(currentTransferApp) ? `Got It - Next Application` : 'Got It - Continue'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderNavBar()}
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
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
                {testScore >= 8 ? 'You\'ve mastered the camera obscura!' : 'Review the material and try again.'}
              </p>
            </div>
            <div style={{ margin: '16px', padding: '12px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', textAlign: 'center' }}>
              <span style={{ color: colors.textSecondary }}>Quiz Progress: {testScore}/{testQuestions.length} correct ({Math.round(testScore / testQuestions.length * 100)}%)</span>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>Question {qIndex + 1}/{testQuestions.length}: {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>Question {currentTestQuestion + 1} of {testQuestions.length} ({currentTestQuestion + 1}/{testQuestions.length})</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textSecondary : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px', borderLeft: `3px solid ${colors.accent}` }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
                Apply what you learned about the camera obscura, pinhole optics, and the brightness-sharpness tradeoff.
                Consider how light rays travel through apertures and form images on surfaces.
                Think about the physics you observed when adjusting the pinhole size and object distance.
              </p>
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', minHeight: '44px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px', fontWeight: 400, transition: 'all 0.2s ease' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', minHeight: '44px', borderRadius: '8px', border: `1px solid ${colors.textSecondary}`, background: 'transparent', color: currentTestQuestion === 0 ? 'rgba(255,255,255,0.3)' : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', minHeight: '44px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', minHeight: '44px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? 'rgba(255,255,255,0.2)' : colors.success, color: testAnswers.includes(null) ? 'rgba(255,255,255,0.5)' : 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    const predictionLabel = predictions.find(p => p.id === prediction)?.label || 'what would happen';
    const twistPredictionLabel = twistPredictions.find(p => p.id === twistPrediction)?.label || 'the tradeoff';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }} role="img" aria-label="Trophy">&#127942;</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '12px' }}>You've mastered the camera obscura and pinhole optics</p>
            <p style={{ color: colors.accent, fontSize: '18px', fontWeight: 'bold' }}>
              Final Score: {testScore}/{testQuestions.length} ({Math.round(testScore / testQuestions.length * 100)}%)
            </p>
          </div>

          {/* Recap of journey and predictions */}
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', margin: '16px', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${colors.success}` }}>
            <h3 style={{ color: colors.success, marginBottom: '12px' }}>Your Learning Journey</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, marginBottom: '12px' }}>
              You started by predicting "{predictionLabel}" - and through experimentation, you observed
              exactly how pinhole size affects image quality. You saw that larger holes create brighter but blurrier images.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              In the twist challenge, you predicted "{twistPredictionLabel}" and explored the fundamental
              brightness-sharpness tradeoff that governs all optical systems. As you noticed during the simulation,
              this tradeoff is inescapable with simple apertures!
            </p>
          </div>

          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Pinhole image formation and inversion</li>
              <li>Brightness vs. sharpness tradeoff</li>
              <li>Ray overlap causes blur in larger apertures</li>
              <li>Applications from cameras to human vision</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              The camera obscura principle led to the invention of photography in the 1800s.
              Modern cameras use lenses to overcome the brightness-sharpness tradeoff, but
              even today, pinhole cameras are used for their unique aesthetic and for
              specialized applications like viewing solar eclipses safely. The same principles
              govern how your eyes work and why optometrists measure your pupil response!
            </p>
          </div>
          {renderVisualization(true)}
        </div>
      </div>
    );
  }

  // Default fallback - render hook phase
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
      {renderNavBar()}
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '70px', paddingBottom: '80px' }}>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
            The Pinhole Puzzle
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
            Will the image get brighter or sharper if the hole gets bigger?
          </p>
        </div>
        {renderVisualization(true)}
      </div>
    </div>
  );
};

export default CameraObscuraRenderer;
