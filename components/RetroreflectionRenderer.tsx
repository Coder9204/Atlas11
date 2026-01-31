import React, { useState, useEffect } from 'react';

interface RetroreflectionRendererProps {
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
  accent: '#f97316',
  accentGlow: 'rgba(249, 115, 22, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  lightBeam: '#fbbf24',
  mirror: '#3b82f6',
  retroreflector: '#10b981',
};

const RetroreflectionRenderer: React.FC<RetroreflectionRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  const [sourceAngle, setSourceAngle] = useState(30);
  const [viewerAngle, setViewerAngle] = useState(30);
  const [showMirror, setShowMirror] = useState(true);
  const [showRetro, setShowRetro] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
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

  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setSourceAngle(prev => {
        const newVal = prev + 1;
        if (newVal > 70) return 10;
        return newVal;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'same', label: 'Both reflect light the same way' },
    { id: 'mirror_better', label: 'The mirror reflects more light overall' },
    { id: 'retro_source', label: 'The retroreflector sends light back toward the source' },
    { id: 'retro_scatter', label: 'The retroreflector scatters light in all directions' },
  ];

  const twistPredictions = [
    { id: 'same_brightness', label: 'Both types appear equally bright' },
    { id: 'mirror_bright', label: 'The flat mirror appears brighter' },
    { id: 'retro_bright', label: 'The retroreflector appears brighter from the source position' },
    { id: 'neither', label: 'Neither reflects back to the source' },
  ];

  const transferApplications = [
    {
      title: 'Road Signs and Lane Markers',
      description: 'Highway signs and road markings use tiny glass beads or prisms to reflect headlights back to drivers, making them visible at night.',
      question: 'Why do road signs seem to glow when your headlights hit them?',
      answer: 'Retroreflective materials send light back toward its source. Since your headlights and eyes are nearly in the same position, the sign reflects your headlights directly back to you, appearing bright.',
    },
    {
      title: 'Lunar Laser Ranging',
      description: 'Apollo astronauts left retroreflector arrays on the Moon. Scientists bounce lasers off them to measure Earth-Moon distance to millimeter precision.',
      question: 'Why are retroreflectors essential for measuring Moon distance with lasers?',
      answer: 'A regular mirror would need perfect alignment to return light. Retroreflectors return light parallel to its incoming path from any angle, so the laser pulse comes back to its source regardless of Moon orientation.',
    },
    {
      title: 'Safety Gear and Clothing',
      description: 'Reflective strips on safety vests, running shoes, and bike gear use retroreflective materials to make wearers visible to drivers.',
      question: 'Why is retroreflective tape more effective than just bright colors at night?',
      answer: 'Bright colors need ambient light to be visible. Retroreflective tape redirects car headlights back to drivers, creating intense brightness from the driver\'s viewpoint even in complete darkness.',
    },
    {
      title: 'Surveying and Distance Measurement',
      description: 'Total station surveying instruments use retroreflective prisms as targets. The instrument measures distance by timing reflected laser pulses.',
      question: 'Why do surveyors use retroreflective prisms instead of regular targets?',
      answer: 'Retroreflectors return light to the source regardless of exact alignment. This means the prism doesn\'t need to be perfectly aimed at the instrument, making surveying faster and more reliable.',
    },
  ];

  const testQuestions = [
    {
      question: 'What makes retroreflection different from regular mirror reflection?',
      options: [
        { text: 'Retroreflectors are brighter', correct: false },
        { text: 'Retroreflectors return light toward the source regardless of angle', correct: true },
        { text: 'Retroreflectors only work with laser light', correct: false },
        { text: 'Retroreflectors absorb more light', correct: false },
      ],
    },
    {
      question: 'A corner-cube retroreflector works by:',
      options: [
        { text: 'Bending light like a lens', correct: false },
        { text: 'Using three perpendicular mirrors to reverse ray direction', correct: true },
        { text: 'Creating interference patterns', correct: false },
        { text: 'Absorbing and re-emitting light', correct: false },
      ],
    },
    {
      question: 'When you shine a light at a retroreflector at 45 degrees:',
      options: [
        { text: 'Light reflects at 45 degrees to the other side', correct: false },
        { text: 'Light returns parallel to the incoming beam', correct: true },
        { text: 'Light is absorbed', correct: false },
        { text: 'Light scatters randomly', correct: false },
      ],
    },
    {
      question: 'A flat mirror reflects light back to the source only when:',
      options: [
        { text: 'The light hits at any angle', correct: false },
        { text: 'The light hits perpendicular to the surface', correct: true },
        { text: 'The mirror is curved', correct: false },
        { text: 'The light is polarized', correct: false },
      ],
    },
    {
      question: 'Road signs are highly visible to drivers at night because:',
      options: [
        { text: 'They are made of luminous paint', correct: false },
        { text: 'Retroreflective materials return headlight light to the driver', correct: true },
        { text: 'They have built-in lights', correct: false },
        { text: 'They absorb moonlight', correct: false },
      ],
    },
    {
      question: 'The Apollo lunar retroreflectors can return laser light because:',
      options: [
        { text: 'They are precisely aimed at Earth', correct: false },
        { text: 'They return light parallel to incoming rays regardless of angle', correct: true },
        { text: 'They amplify the laser signal', correct: false },
        { text: 'They use special Moon materials', correct: false },
      ],
    },
    {
      question: 'A cat\'s eye road marker is bright to drivers because:',
      options: [
        { text: 'It contains batteries', correct: false },
        { text: 'It uses retroreflective glass beads or prisms', correct: true },
        { text: 'It reflects moonlight', correct: false },
        { text: 'It is painted with glow-in-the-dark paint', correct: false },
      ],
    },
    {
      question: 'Bicycle reflectors typically use:',
      options: [
        { text: 'Flat mirrors', correct: false },
        { text: 'Corner-cube arrays or molded prisms', correct: true },
        { text: 'Fluorescent materials', correct: false },
        { text: 'LED lights', correct: false },
      ],
    },
    {
      question: 'The key geometric principle of corner-cube retroreflection is:',
      options: [
        { text: 'Light focuses to a point', correct: false },
        { text: 'Each of three reflections reverses one direction component', correct: true },
        { text: 'Light diffracts around corners', correct: false },
        { text: 'Light changes color on reflection', correct: false },
      ],
    },
    {
      question: 'Surveyors prefer retroreflective prisms because:',
      options: [
        { text: 'They are cheaper than mirrors', correct: false },
        { text: 'Precise angular alignment is not required', correct: true },
        { text: 'They work only in daylight', correct: false },
        { text: 'They measure angles directly', correct: false },
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
      if (testAnswers[i] !== null && q.options[testAnswers[i]].correct) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 700;
    const height = 400;
    const centerY = height / 2;

    // Calculate mirror reflection (angle in = angle out)
    const mirrorReflectAngle = -sourceAngle;

    // Calculate angles in radians
    const sourceRad = (sourceAngle * Math.PI) / 180;
    const mirrorReflectRad = (mirrorReflectAngle * Math.PI) / 180;

    // Positions
    const lightSourceX = 100;
    const lightSourceY = centerY - 20;
    const viewerX = 100;
    const viewerY = centerY + 60;

    const mirrorX = 320;
    const mirrorY = centerY - 70;

    const retroX = 320;
    const retroY = centerY + 100;

    // Mirror hit point
    const mirrorHitX = mirrorX + 60;
    const mirrorHitY = mirrorY;

    // Retro hit point
    const retroHitX = retroX + 70;
    const retroHitY = retroY;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(135deg, #030712 0%, #0a0f1a 50%, #030712 100%)', borderRadius: '12px', maxWidth: '700px' }}
        >
          {/* === COMPREHENSIVE DEFS SECTION === */}
          <defs>
            {/* Premium light source gradient - sun/lamp effect */}
            <radialGradient id="retroLightSourceGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
              <stop offset="25%" stopColor="#fcd34d" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* Light source housing gradient */}
            <linearGradient id="retroLightHousing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="25%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="75%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Flat mirror surface gradient - reflective metal */}
            <linearGradient id="retroMirrorSurface" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="20%" stopColor="#3b82f6" />
              <stop offset="40%" stopColor="#60a5fa" />
              <stop offset="60%" stopColor="#93c5fd" />
              <stop offset="80%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            {/* Mirror frame gradient */}
            <linearGradient id="retroMirrorFrame" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="30%" stopColor="#4b5563" />
              <stop offset="70%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Corner cube retroreflector gradient - glass prism effect */}
            <linearGradient id="retroCornerCubeGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="25%" stopColor="#34d399" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#6ee7b7" stopOpacity="0.6" />
              <stop offset="75%" stopColor="#34d399" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
            </linearGradient>

            {/* Corner cube face gradients for 3D effect */}
            <linearGradient id="retroCubeFace1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#059669" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.3" />
            </linearGradient>

            <linearGradient id="retroCubeFace2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.3" />
            </linearGradient>

            <linearGradient id="retroCubeFace3" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#34d399" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
            </linearGradient>

            {/* Retroreflector housing gradient */}
            <linearGradient id="retroHousing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#065f46" />
              <stop offset="30%" stopColor="#047857" />
              <stop offset="70%" stopColor="#065f46" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>

            {/* Light beam gradient - incoming */}
            <linearGradient id="retroBeamIncoming" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
              <stop offset="30%" stopColor="#fcd34d" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#fef3c7" stopOpacity="1" />
              <stop offset="70%" stopColor="#fcd34d" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.3" />
            </linearGradient>

            {/* Light beam gradient - returned (green) */}
            <linearGradient id="retroBeamReturned" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="30%" stopColor="#34d399" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#6ee7b7" stopOpacity="1" />
              <stop offset="70%" stopColor="#34d399" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
            </linearGradient>

            {/* Light beam gradient - reflected away (dimmer yellow) */}
            <linearGradient id="retroBeamReflectedAway" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1" />
            </linearGradient>

            {/* Eye/viewer gradient */}
            <radialGradient id="retroEyeGradient" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#dbeafe" />
              <stop offset="50%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#3b82f6" />
            </radialGradient>

            {/* Eye sclera gradient */}
            <radialGradient id="retroEyeSclera" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </radialGradient>

            {/* Lab background gradient */}
            <linearGradient id="retroLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="50%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Glow filter for light source */}
            <filter id="retroLightGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glow filter for light beams */}
            <filter id="retroBeamGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft glow for returned beam */}
            <filter id="retroReturnGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glass reflection effect */}
            <filter id="retroGlassShine" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Mirror shine effect */}
            <filter id="retroMirrorShine" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="0.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arrow markers */}
            <marker id="retroArrowYellow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#fbbf24" />
            </marker>
            <marker id="retroArrowGreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#10b981" />
            </marker>

            {/* Grid pattern for lab background */}
            <pattern id="retroLabGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <rect width="30" height="30" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* === BACKGROUND === */}
          <rect width={width} height={height} fill="url(#retroLabBg)" />
          <rect width={width} height={height} fill="url(#retroLabGrid)" />

          {/* Optical table base */}
          <rect x="10" y={height - 40} width={width - 20} height="35" rx="4" fill="#111827" />
          <rect x="10" y={height - 40} width={width - 20} height="4" fill="#1f2937" />

          {/* === PREMIUM LIGHT SOURCE === */}
          <g transform={`translate(${lightSourceX}, ${lightSourceY})`}>
            {/* Housing */}
            <rect x="-35" y="-30" width="70" height="60" rx="8" fill="url(#retroLightHousing)" stroke="#475569" strokeWidth="1.5" />
            <rect x="-30" y="-25" width="60" height="50" rx="6" fill="#1e293b" opacity="0.3" />

            {/* Lens/emitter */}
            <circle cx="20" cy="0" r="18" fill="url(#retroLightSourceGlow)" filter="url(#retroLightGlow)">
              <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="20" cy="0" r="12" fill="#fef3c7" opacity="0.9" />
            <circle cx="20" cy="0" r="6" fill="#ffffff" />

            {/* Power indicator */}
            <circle cx="-20" cy="20" r="4" fill="#22c55e">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
            </circle>

            {/* Label */}
            <text x="0" y="-42" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">LIGHT SOURCE</text>
            <text x="0" y="50" textAnchor="middle" fill="#64748b" fontSize="9">Angle: {sourceAngle}</text>
          </g>

          {/* === PREMIUM VIEWER/OBSERVER === */}
          <g transform={`translate(${viewerX}, ${viewerY})`}>
            {/* Eye sclera (white) */}
            <ellipse cx="0" cy="0" rx="22" ry="14" fill="url(#retroEyeSclera)" stroke="#cbd5e1" strokeWidth="1" />

            {/* Iris */}
            <circle cx="3" cy="0" r="10" fill="url(#retroEyeGradient)" />

            {/* Pupil */}
            <circle cx="3" cy="0" r="5" fill="#1e293b" />

            {/* Eye highlight */}
            <circle cx="6" cy="-3" r="2.5" fill="#ffffff" opacity="0.9" />
            <circle cx="1" cy="2" r="1" fill="#ffffff" opacity="0.5" />

            {/* Eyelids hint */}
            <path d="M -22 0 Q 0 -18 22 0" fill="none" stroke="#94a3b8" strokeWidth="1" />
            <path d="M -22 0 Q 0 18 22 0" fill="none" stroke="#94a3b8" strokeWidth="1" />

            {/* Label */}
            <text x="0" y="30" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">OBSERVER</text>
            <text x="0" y="42" textAnchor="middle" fill="#64748b" fontSize="8">(Near light source)</text>
          </g>

          {/* === FLAT MIRROR SECTION === */}
          {showMirror && (
            <g>
              {/* Section label */}
              <rect x={mirrorX - 20} y="25" width="120" height="20" rx="4" fill="rgba(59, 130, 246, 0.2)" />
              <text x={mirrorX + 40} y="39" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="bold">FLAT MIRROR</text>

              {/* Mirror frame */}
              <rect x={mirrorX + 45} y={mirrorY - 55} width="35" height="110" rx="6" fill="url(#retroMirrorFrame)" stroke="#4b5563" strokeWidth="1" />

              {/* Mirror surface */}
              <rect x={mirrorX + 52} y={mirrorY - 48} width="12" height="96" fill="url(#retroMirrorSurface)" filter="url(#retroMirrorShine)" rx="2" />

              {/* Reflection lines on mirror */}
              <line x1={mirrorX + 54} y1={mirrorY - 40} x2={mirrorX + 62} y2={mirrorY - 35} stroke="#bfdbfe" strokeWidth="0.5" opacity="0.6" />
              <line x1={mirrorX + 54} y1={mirrorY - 20} x2={mirrorX + 62} y2={mirrorY - 15} stroke="#bfdbfe" strokeWidth="0.5" opacity="0.4" />
              <line x1={mirrorX + 54} y1={mirrorY + 10} x2={mirrorX + 62} y2={mirrorY + 15} stroke="#bfdbfe" strokeWidth="0.5" opacity="0.5" />

              {/* Normal line (perpendicular to mirror) */}
              <line
                x1={mirrorX + 58} y1={mirrorY - 60}
                x2={mirrorX + 58} y2={mirrorY + 60}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1"
                strokeDasharray="6,4"
              />
              <text x={mirrorX + 75} y={mirrorY - 50} fill="#64748b" fontSize="8">Normal</text>

              {/* Incident ray to mirror */}
              <line
                x1={lightSourceX + 40}
                y1={lightSourceY}
                x2={mirrorHitX}
                y2={mirrorHitY}
                stroke="#fbbf24"
                strokeWidth="4"
                filter="url(#retroBeamGlow)"
                markerEnd="url(#retroArrowYellow)"
              />

              {/* Reflected ray from mirror (goes AWAY from viewer) */}
              <line
                x1={mirrorHitX}
                y1={mirrorHitY}
                x2={mirrorHitX + 120 * Math.cos(mirrorReflectRad)}
                y2={mirrorHitY - 120 * Math.sin(mirrorReflectRad)}
                stroke="#fbbf24"
                strokeWidth="3"
                opacity="0.5"
                strokeDasharray="10,5"
                filter="url(#retroBeamGlow)"
                markerEnd="url(#retroArrowYellow)"
              />

              {/* Angle indicators */}
              <path
                d={`M ${mirrorHitX + 20} ${mirrorHitY} A 20 20 0 0 0 ${mirrorHitX} ${mirrorHitY - 20}`}
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.5"
                opacity="0.7"
              />
              <text x={mirrorHitX + 25} y={mirrorHitY - 15} fill="#fbbf24" fontSize="8">i</text>

              <path
                d={`M ${mirrorHitX + 20 * Math.cos(mirrorReflectRad)} ${mirrorHitY - 20 * Math.sin(mirrorReflectRad)} A 20 20 0 0 0 ${mirrorHitX} ${mirrorHitY - 20}`}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                opacity="0.7"
              />
              <text x={mirrorHitX - 5} y={mirrorHitY - 25} fill="#f59e0b" fontSize="8">r</text>

              {/* Miss indicator */}
              <g transform={`translate(${mirrorHitX + 80 * Math.cos(mirrorReflectRad)}, ${mirrorHitY - 80 * Math.sin(mirrorReflectRad) - 15})`}>
                <rect x="-45" y="-10" width="90" height="20" rx="4" fill="rgba(239, 68, 68, 0.2)" stroke="#ef4444" strokeWidth="1" />
                <text x="0" y="4" textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="bold">MISSES OBSERVER</text>
              </g>

              {/* Physics note */}
              <text x={mirrorX + 40} y={mirrorY + 70} textAnchor="middle" fill="#64748b" fontSize="8">angle in = angle out</text>
            </g>
          )}

          {/* === RETROREFLECTOR SECTION === */}
          {showRetro && (
            <g>
              {/* Section label */}
              <rect x={retroX - 20} y={retroY - 90} width="140" height="20" rx="4" fill="rgba(16, 185, 129, 0.2)" />
              <text x={retroX + 50} y={retroY - 76} textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="bold">CORNER CUBE RETROREFLECTOR</text>

              {/* Retroreflector housing */}
              <rect x={retroX + 40} y={retroY - 50} width="80" height="100" rx="8" fill="url(#retroHousing)" stroke="#059669" strokeWidth="1.5" />

              {/* Corner cube prism visualization - 3D effect */}
              <g transform={`translate(${retroX + 55}, ${retroY - 30})`}>
                {/* Back face */}
                <polygon points="0,0 50,0 50,60 0,60" fill="url(#retroCubeFace3)" stroke="#10b981" strokeWidth="1" />

                {/* Left face */}
                <polygon points="0,0 0,60 -15,45 -15,-15" fill="url(#retroCubeFace1)" stroke="#10b981" strokeWidth="1" filter="url(#retroGlassShine)" />

                {/* Top face */}
                <polygon points="0,0 50,0 35,-15 -15,-15" fill="url(#retroCubeFace2)" stroke="#10b981" strokeWidth="1" filter="url(#retroGlassShine)" />

                {/* Corner edges - the key geometry */}
                <line x1="0" y1="0" x2="-15" y2="-15" stroke="#34d399" strokeWidth="2" />
                <line x1="0" y1="0" x2="0" y2="60" stroke="#34d399" strokeWidth="2" />
                <line x1="0" y1="0" x2="50" y2="0" stroke="#34d399" strokeWidth="2" />

                {/* Corner vertex highlight */}
                <circle cx="0" cy="0" r="4" fill="#6ee7b7" opacity="0.8" />

                {/* Glass microbeads visualization (array of small spheres) */}
                {[10, 25, 40].map((x, i) => (
                  [15, 35].map((y, j) => (
                    <circle key={`bead-${i}-${j}`} cx={x} cy={y} r="6" fill="url(#retroCornerCubeGlass)" stroke="#34d399" strokeWidth="0.5" opacity="0.7" />
                  ))
                ))}
              </g>

              {/* Incident ray to retroreflector */}
              <line
                x1={lightSourceX + 40}
                y1={lightSourceY + 30}
                x2={retroHitX}
                y2={retroHitY}
                stroke="#fbbf24"
                strokeWidth="4"
                filter="url(#retroBeamGlow)"
                markerEnd="url(#retroArrowYellow)"
              />

              {/* Internal reflection path visualization */}
              <g opacity="0.8">
                <polyline
                  points={`${retroHitX},${retroHitY} ${retroHitX + 25},${retroHitY - 15} ${retroHitX + 35},${retroHitY + 10} ${retroHitX + 20},${retroHitY + 5}`}
                  fill="none"
                  stroke="#fcd34d"
                  strokeWidth="2"
                  strokeDasharray="4,2"
                />
                {/* Bounce points */}
                <circle cx={retroHitX + 25} cy={retroHitY - 15} r="3" fill="#fbbf24" opacity="0.8" />
                <circle cx={retroHitX + 35} cy={retroHitY + 10} r="3" fill="#fbbf24" opacity="0.8" />
              </g>

              {/* Returned ray - PARALLEL to incident, going back to source */}
              <line
                x1={retroHitX}
                y1={retroHitY}
                x2={lightSourceX + 35}
                y2={lightSourceY + 25}
                stroke="#10b981"
                strokeWidth="4"
                filter="url(#retroReturnGlow)"
                markerEnd="url(#retroArrowGreen)"
              />

              {/* Success indicator */}
              <g transform={`translate(${(retroHitX + lightSourceX + 35) / 2}, ${(retroHitY + lightSourceY + 25) / 2 - 20})`}>
                <rect x="-55" y="-12" width="110" height="24" rx="6" fill="rgba(16, 185, 129, 0.3)" stroke="#10b981" strokeWidth="1" />
                <text x="0" y="4" textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="bold">RETURNS TO SOURCE</text>
              </g>

              {/* Physics note */}
              <text x={retroX + 60} y={retroY + 65} textAnchor="middle" fill="#64748b" fontSize="8">3 perpendicular reflections</text>
              <text x={retroX + 60} y={retroY + 77} textAnchor="middle" fill="#64748b" fontSize="8">reverse all direction components</text>
            </g>
          )}

          {/* === LEGEND === */}
          <g transform={`translate(20, ${height - 70})`}>
            <rect x="-5" y="-5" width="280" height="30" rx="4" fill="rgba(15, 23, 42, 0.8)" stroke="#334155" strokeWidth="1" />

            <rect x="5" y="3" width="16" height="16" rx="3" fill="#fbbf24" />
            <text x="28" y="15" fill="#94a3b8" fontSize="10">Incoming light</text>

            <rect x="120" y="3" width="16" height="16" rx="3" fill="#10b981" />
            <text x="143" y="15" fill="#94a3b8" fontSize="10">Returned light</text>
          </g>

          {/* === INFO BAR === */}
          <g transform={`translate(${width / 2}, ${height - 15})`}>
            <text x="0" y="0" textAnchor="middle" fill="#64748b" fontSize="10">
              Source angle: {sourceAngle} | Mirror: angle in = angle out | Retroreflector: always returns to source
            </text>
          </g>

          {/* Comparison arrows/indicators */}
          {showMirror && showRetro && (
            <g>
              <line x1={width / 2} y1="60" x2={width / 2} y2={height - 90} stroke="#334155" strokeWidth="1" strokeDasharray="8,4" />
              <text x={width / 2} y="55" textAnchor="middle" fill="#475569" fontSize="9" fontWeight="bold">COMPARISON</text>
            </g>
          )}
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: isAnimating ? '0 4px 15px rgba(239, 68, 68, 0.3)' : '0 4px 15px rgba(16, 185, 129, 0.3)'
              }}
            >
              {isAnimating ? 'Stop Animation' : 'Animate Angle'}
            </button>
            <button
              onClick={() => { setSourceAngle(30); setIsAnimating(false); setShowMirror(true); setShowRetro(true); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `2px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Reset View
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
          Light Source Angle: {sourceAngle} degrees
        </label>
        <input type="range" min="10" max="70" step="5" value={sourceAngle} onChange={(e) => setSourceAngle(parseInt(e.target.value))} style={{ width: '100%' }} />
      </div>
      <div style={{ display: 'flex', gap: '16px' }}>
        <label style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" checked={showMirror} onChange={(e) => setShowMirror(e.target.checked)} />
          Show Mirror
        </label>
        <label style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" checked={showRetro} onChange={(e) => setShowRetro(e.target.checked)} />
          Show Retroreflector
        </label>
      </div>
      <div style={{ background: 'rgba(249, 115, 22, 0.2)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Notice: The mirror reflects at the opposite angle, missing the source. The retroreflector always returns light to the source!
        </div>
      </div>
    </div>
  );

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 24px', background: colors.bgDark, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }}>
      <button onClick={onPhaseComplete} disabled={disabled && !canProceed} style={{ padding: '12px 32px', borderRadius: '8px', border: 'none', background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)', color: canProceed ? 'white' : colors.textMuted, fontWeight: 'bold', cursor: canProceed ? 'pointer' : 'not-allowed', fontSize: '16px' }}>{buttonText}</button>
    </div>
  );

  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>How can light return to the source no matter the angle?</h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>The magic geometry of retroreflectors</p>
          </div>
          {renderVisualization(true)}
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Bike reflectors, road signs, and even mirrors on the Moon all use a special trick: no matter what angle light comes from, it bounces straight back to the source.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is retroreflection - and it uses clever geometry, not magic.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction')}
      </div>
    );
  }

  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A light source shining on both a flat mirror (top) and a corner-cube retroreflector (bottom). The yellow lines show incoming light, the green lines show returned light. A viewer/eye is positioned near the light source.
            </p>
          </div>
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>How do these two reflectors differ?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button key={p.id} onClick={() => setPrediction(p.id)} style={{ padding: '16px', borderRadius: '8px', border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: prediction === p.id ? 'rgba(249, 115, 22, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Retroreflection</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Change the source angle and compare mirror vs retroreflector</p>
          </div>
          {renderVisualization(true)}
          {renderControls()}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Change the source angle - mirror reflection direction changes</li>
              <li>Notice retroreflector always returns to source</li>
              <li>At steep angles, mirror light goes far from viewer</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  if (phase === 'review') {
    const wasCorrect = prediction === 'retro_source';
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}` }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>{wasCorrect ? 'Correct!' : 'Not Quite!'}</h3>
            <p style={{ color: colors.textPrimary }}>The retroreflector always sends light back toward its source!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Retroreflection</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Corner-Cube Geometry:</strong> Three mutually perpendicular surfaces form a corner. Light bouncing off all three surfaces has each of its direction components reversed, sending it back parallel to the incoming ray.</p>
              <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Angle Independence:</strong> Unlike a flat mirror (angle in = angle out), a corner cube returns light parallel to its entry regardless of the entry angle.</p>
              <p><strong style={{ color: colors.textPrimary }}>Practical Design:</strong> Bike reflectors use arrays of tiny corner cubes molded into plastic. Road signs use glass microbeads that act as tiny spherical retroreflectors.</p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>Standing next to a car at night with headlights on...</p>
          </div>
          {renderVisualization(false)}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>Imagine you're a driver with headlights shining on two road signs: one with a regular mirror surface, one with retroreflective material. Both are angled slightly away from perpendicular to your view.</p>
          </div>
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>Which sign appears brighter to the driver?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button key={p.id} onClick={() => setTwistPrediction(p.id)} style={{ padding: '16px', borderRadius: '8px', border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)', background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Driver Visibility</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Compare what the driver sees from each surface type</p>
          </div>
          {renderVisualization(true)}
          {renderControls()}
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `3px solid ${colors.warning}` }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>The mirror reflects light away from the driver at most angles. The retroreflector sends headlight light back to the driver's eyes, appearing brilliantly bright even when the sign isn't perpendicular!</p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'retro_bright';
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px', borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}` }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>{wasCorrect ? 'Correct!' : 'Not Quite!'}</h3>
            <p style={{ color: colors.textPrimary }}>The retroreflector appears much brighter from the driver's position!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why Road Signs Work</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}><strong style={{ color: colors.textPrimary }}>Source-Observer Coincidence:</strong> In a car, your eyes are very close to the headlights. Retroreflectors return light to the source - which is almost exactly where your eyes are!</p>
              <p><strong style={{ color: colors.textPrimary }}>Practical Result:</strong> Road signs covered with retroreflective material appear to "glow" when your headlights hit them, even though they have no internal light source. The brightness comes from your own headlights being returned directly to you.</p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>Real-World Applications</h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>Retroreflection keeps us safe and enables precision measurement</p>
          </div>
          {transferApplications.map((app, index) => (
            <div key={index} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Done</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))} style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}>Reveal Answer</button>
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

  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{ background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', margin: '16px', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error }}>{testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}</h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>{opt.correct ? 'Correct:' : userAnswer === oIndex ? 'Your answer:' : ''} {opt.text}</div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review and Retry')}
        </div>
      );
    }
    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}><h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2><span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / 10</span></div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>{testQuestions.map((_, i) => (<div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />))}</div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}><p style={{ color: colors.textPrimary, fontSize: '16px' }}>{currentQ.question}</p></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{currentQ.options.map((opt, oIndex) => (<button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(249, 115, 22, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>{opt.text}</button>))}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
            {currentTestQuestion < 9 ? <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button> : <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit</button>}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Achievement</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary }}>You understand how retroreflectors return light to its source</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Corner-cube geometry reverses ray direction</li>
              <li>Retroreflection is angle-independent</li>
              <li>Driver sees reflected headlights from road signs</li>
              <li>Lunar ranging uses retroreflector arrays</li>
            </ul>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default RetroreflectionRenderer;
