import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// GAME 114: BRACHISTOCHRONE
// The curve of fastest descent - a cycloid, not a straight line!
// Demonstrates calculus of variations, energy/time tradeoffs
// ============================================================================

interface BrachistochroneRendererProps {
  phase?: string;
  gamePhase?: string;
  onPhaseComplete?: () => void;
  onPredictionMade?: (prediction: string) => void;
}

// Phase sequence for self-managing navigation
const PHASE_SEQUENCE = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

// Color palette with proper contrast
const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#cbd5e1',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',

  // Path colors
  straight: '#ef4444',
  parabola: '#f59e0b',
  cycloid: '#22c55e',

  // Ball colors
  ball: '#60a5fa',
  ballHighlight: '#93c5fd',

  accent: '#22c55e',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

const BrachistochroneRenderer: React.FC<BrachistochroneRendererProps> = ({
  phase: externalPhase,
  gamePhase,
  onPhaseComplete,
  onPredictionMade,
}) => {
  // Internal phase management for self-managing mode
  const [internalPhase, setInternalPhase] = useState('hook');

  // Determine which phase to use - external prop takes precedence
  const phase = externalPhase || gamePhase || internalPhase;
  const isSelfManaged = !externalPhase && !gamePhase;

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

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Race state
  const [isRacing, setIsRacing] = useState(false);
  const [raceProgress, setRaceProgress] = useState({ straight: 0, parabola: 0, cycloid: 0 });
  const [winner, setWinner] = useState<string | null>(null);

  // Controls
  const [endPointX, setEndPointX] = useState(80);
  const [endPointY, setEndPointY] = useState(60);

  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showQuizConfirm, setShowQuizConfirm] = useState(false);
  const [showAnswerFeedback, setShowAnswerFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Path calculations
  const startX = 50, startY = 80;
  const endX = 50 + (endPointX / 100) * 280;
  const endY = 80 + (endPointY / 100) * 180;

  // Navigation helpers
  const getCurrentPhaseIndex = () => PHASE_SEQUENCE.indexOf(phase);

  const goToNextPhase = () => {
    const currentIndex = getCurrentPhaseIndex();
    if (currentIndex < PHASE_SEQUENCE.length - 1) {
      if (isSelfManaged) {
        setInternalPhase(PHASE_SEQUENCE[currentIndex + 1]);
      }
      onPhaseComplete?.();
    }
  };

  const goToPrevPhase = () => {
    const currentIndex = getCurrentPhaseIndex();
    if (currentIndex > 0 && isSelfManaged) {
      setInternalPhase(PHASE_SEQUENCE[currentIndex - 1]);
    }
  };

  const goToPhase = (targetPhase: string) => {
    if (isSelfManaged && PHASE_SEQUENCE.includes(targetPhase)) {
      setInternalPhase(targetPhase);
    }
  };

  // Generate path points
  const getCycloidPath = useCallback(() => {
    const points = [];
    const dx = endX - startX;
    const dy = endY - startY;

    for (let t = 0; t <= Math.PI; t += 0.1) {
      const x = startX + (dx / Math.PI) * (t - Math.sin(t) * 0.5);
      const y = startY + (dy / Math.PI) * (1 - Math.cos(t)) * 1.2;
      points.push({ x, y });
    }
    points.push({ x: endX, y: endY });
    return points;
  }, [endX, endY]);

  const getParabolaPath = useCallback(() => {
    const points = [];
    for (let t = 0; t <= 1; t += 0.05) {
      const x = startX + (endX - startX) * t;
      const y = startY + (endY - startY) * (t * t * 0.7 + t * 0.3);
      points.push({ x, y });
    }
    return points;
  }, [endX, endY]);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(t => t + 0.02);

      if (isRacing && !winner) {
        setRaceProgress(prev => {
          // Cycloid is fastest, straight is slowest
          const cycloidSpeed = 0.025;
          const parabolaSpeed = 0.020;
          const straightSpeed = 0.018;

          const newCycloid = Math.min(1, prev.cycloid + cycloidSpeed);
          const newParabola = Math.min(1, prev.parabola + parabolaSpeed);
          const newStraight = Math.min(1, prev.straight + straightSpeed);

          if (newCycloid >= 1 && !winner) {
            setWinner('cycloid');
          }

          return { straight: newStraight, parabola: newParabola, cycloid: newCycloid };
        });
      }
    }, 30);
    return () => clearInterval(interval);
  }, [isAnimating, isRacing, winner]);

  const startRace = () => {
    setRaceProgress({ straight: 0, parabola: 0, cycloid: 0 });
    setWinner(null);
    setIsRacing(true);
  };

  const resetRace = () => {
    setIsRacing(false);
    setRaceProgress({ straight: 0, parabola: 0, cycloid: 0 });
    setWinner(null);
  };

  const renderVisualization = (interactive: boolean) => {
    const cycloidPath = getCycloidPath();
    const parabolaPath = getParabolaPath();

    // Ball positions along paths
    const straightBall = {
      x: startX + (endX - startX) * raceProgress.straight,
      y: startY + (endY - startY) * raceProgress.straight,
    };

    const parabolaIdx = Math.floor(raceProgress.parabola * (parabolaPath.length - 1));
    const parabolaBall = parabolaPath[parabolaIdx] || { x: startX, y: startY };

    const cycloidIdx = Math.floor(raceProgress.cycloid * (cycloidPath.length - 1));
    const cycloidBall = cycloidPath[cycloidIdx] || { x: startX, y: startY };

    // Get motion trail points (previous positions for trail effect)
    const getTrailPoints = (progress: number, path: {x: number, y: number}[]) => {
      const trails: {x: number, y: number, opacity: number}[] = [];
      const trailLength = 8;
      for (let i = 0; i < trailLength; i++) {
        const trailProgress = Math.max(0, progress - (i * 0.03));
        const idx = Math.floor(trailProgress * (path.length - 1));
        if (idx >= 0 && path[idx]) {
          trails.push({ ...path[idx], opacity: 1 - (i / trailLength) });
        }
      }
      return trails;
    };

    const straightTrail = isRacing ? Array.from({ length: 8 }, (_, i) => {
      const p = Math.max(0, raceProgress.straight - (i * 0.03));
      return {
        x: startX + (endX - startX) * p,
        y: startY + (endY - startY) * p,
        opacity: 1 - (i / 8)
      };
    }) : [];
    const parabolaTrail = isRacing ? getTrailPoints(raceProgress.parabola, parabolaPath) : [];
    const cycloidTrail = isRacing ? getTrailPoints(raceProgress.cycloid, cycloidPath) : [];

    return (
      <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        <svg viewBox="0 0 400 320" style={{ width: '100%', height: 'auto', background: colors.bgDark, borderRadius: '12px' }}>
          {/* ============================================= */}
          {/* PREMIUM SVG DEFINITIONS - Gradients & Filters */}
          {/* ============================================= */}
          <defs>
            {/* === TRACK GRADIENTS === */}
            {/* Straight path - red metallic track */}
            <linearGradient id="brachStraightTrack" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="25%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="75%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>

            {/* Parabola path - amber/gold metallic track */}
            <linearGradient id="brachParabolaTrack" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="20%" stopColor="#fcd34d" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="60%" stopColor="#d97706" />
              <stop offset="80%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            {/* Cycloid path - emerald premium track */}
            <linearGradient id="brachCycloidTrack" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="20%" stopColor="#4ade80" />
              <stop offset="40%" stopColor="#22c55e" />
              <stop offset="60%" stopColor="#16a34a" />
              <stop offset="80%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>

            {/* Track depth/shadow gradient */}
            <linearGradient id="brachTrackDepth" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#000000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
            </linearGradient>

            {/* === BALL GRADIENTS - 3D Metallic Spheres === */}
            {/* Red ball - polished metal */}
            <radialGradient id="brachRedBall" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="15%" stopColor="#fecaca" />
              <stop offset="40%" stopColor="#f87171" />
              <stop offset="65%" stopColor="#ef4444" />
              <stop offset="85%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </radialGradient>

            {/* Amber ball - polished gold */}
            <radialGradient id="brachAmberBall" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="15%" stopColor="#fef3c7" />
              <stop offset="40%" stopColor="#fcd34d" />
              <stop offset="65%" stopColor="#f59e0b" />
              <stop offset="85%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </radialGradient>

            {/* Green ball - polished emerald */}
            <radialGradient id="brachGreenBall" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="15%" stopColor="#dcfce7" />
              <stop offset="40%" stopColor="#4ade80" />
              <stop offset="65%" stopColor="#22c55e" />
              <stop offset="85%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#14532d" />
            </radialGradient>

            {/* === ENDPOINT MARKERS === */}
            <radialGradient id="brachStartPoint" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="40%" stopColor="#94a3b8" />
              <stop offset="70%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </radialGradient>

            <radialGradient id="brachEndPoint" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="30%" stopColor="#facc15" />
              <stop offset="60%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#a16207" />
            </radialGradient>

            {/* === GLOW FILTERS === */}
            {/* Ball glow effect */}
            <filter id="brachBallGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Winner glow - stronger */}
            <filter id="brachWinnerGlow" x="-150%" y="-150%" width="400%" height="400%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Track glow for depth */}
            <filter id="brachTrackGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Motion blur filter */}
            <filter id="brachMotionBlur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" />
            </filter>

            {/* === BACKGROUND GRADIENTS === */}
            <linearGradient id="brachLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="30%" stopColor="#0a0f1a" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Grid pattern for lab feel */}
            <pattern id="brachLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
            </pattern>

            {/* Legend panel gradient */}
            <linearGradient id="brachLegendBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Title text gradient */}
            <linearGradient id="brachTitleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
          </defs>

          {/* === PREMIUM BACKGROUND === */}
          <rect width="400" height="320" fill="url(#brachLabBg)" />
          <rect width="400" height="320" fill="url(#brachLabGrid)" />

          {/* === GRID LINES for visual reference === */}
          <line x1="50" y1="80" x2="350" y2="80" stroke="#475569" strokeDasharray="4 4" opacity="0.3" />
          <line x1="50" y1="140" x2="350" y2="140" stroke="#475569" strokeDasharray="4 4" opacity="0.3" />
          <line x1="50" y1="200" x2="350" y2="200" stroke="#475569" strokeDasharray="4 4" opacity="0.3" />
          <line x1="50" y1="80" x2="50" y2="260" stroke="#475569" strokeDasharray="4 4" opacity="0.3" />
          <line x1="150" y1="80" x2="150" y2="260" stroke="#475569" strokeDasharray="4 4" opacity="0.3" />
          <line x1="250" y1="80" x2="250" y2="260" stroke="#475569" strokeDasharray="4 4" opacity="0.3" />
          <line x1="350" y1="80" x2="350" y2="260" stroke="#475569" strokeDasharray="4 4" opacity="0.3" />

          {/* === AXIS LABELS === */}
          <text x="200" y="252" textAnchor="middle" fill={colors.textMuted} fontSize="11">Horizontal Distance</text>
          <text x="18" y="170" textAnchor="middle" fill={colors.textMuted} fontSize="11" transform="rotate(-90, 18, 170)">Velocity / Time</text>

          {/* === TITLE === */}
          <text x="200" y="25" textAnchor="middle" fill="url(#brachTitleGrad)" fontSize="16" fontWeight="bold">
            Brachistochrone Problem
          </text>
          <text x="200" y="42" textAnchor="middle" fill={colors.textMuted} fontSize="11">
            Which path is fastest?
          </text>

          {/* === START POINT - Premium 3D marker === */}
          <g>
            {/* Outer glow ring */}
            <circle cx={startX} cy={startY} r="12" fill="none" stroke="#475569" strokeWidth="1" strokeOpacity="0.5" />
            {/* Main point */}
            <circle cx={startX} cy={startY} r="8" fill="url(#brachStartPoint)" />
            {/* Highlight */}
            <circle cx={startX - 2} cy={startY - 2} r="2" fill="white" fillOpacity="0.6" />
            <text x={startX - 20} y={startY - 15} fill={colors.textSecondary} fontSize="11" fontWeight="600">Start</text>
          </g>

          {/* === END POINT - Premium gold target === */}
          <g>
            {/* Outer glow ring */}
            <circle cx={endX} cy={endY} r="14" fill="none" stroke="#fbbf24" strokeWidth="1" strokeOpacity="0.4" />
            <circle cx={endX} cy={endY} r="11" fill="none" stroke="#fbbf24" strokeWidth="0.5" strokeOpacity="0.3" />
            {/* Main point */}
            <circle cx={endX} cy={endY} r="8" fill="url(#brachEndPoint)" />
            {/* Highlight */}
            <circle cx={endX - 2} cy={endY - 2} r="2" fill="white" fillOpacity="0.7" />
            <text x={endX + 10} y={endY + 5} fill="#fbbf24" fontSize="11" fontWeight="600">Finish</text>
          </g>

          {/* === TRACK PATHS WITH DEPTH === */}
          {/* Straight line path - with shadow layer for depth */}
          <g filter="url(#brachTrackGlow)">
            {/* Shadow/depth layer */}
            <line x1={startX} y1={startY + 2} x2={endX} y2={endY + 2}
              stroke="#7f1d1d" strokeWidth="5" strokeOpacity="0.5" strokeLinecap="round" />
            {/* Main track */}
            <line x1={startX} y1={startY} x2={endX} y2={endY}
              stroke="url(#brachStraightTrack)" strokeWidth="4" strokeLinecap="round" />
            {/* Highlight edge */}
            <line x1={startX} y1={startY - 1} x2={endX} y2={endY - 1}
              stroke="#fecaca" strokeWidth="1" strokeOpacity="0.4" strokeLinecap="round" />
          </g>

          {/* Parabola path - with shadow layer for depth */}
          <g filter="url(#brachTrackGlow)">
            {/* Shadow/depth layer */}
            <path
              d={`M ${startX} ${startY + 2} ${parabolaPath.map(p => `L ${p.x} ${p.y + 2}`).join(' ')}`}
              fill="none" stroke="#78350f" strokeWidth="5" strokeOpacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Main track */}
            <path
              d={`M ${startX} ${startY} ${parabolaPath.map(p => `L ${p.x} ${p.y}`).join(' ')}`}
              fill="none" stroke="url(#brachParabolaTrack)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {/* Highlight edge */}
            <path
              d={`M ${startX} ${startY - 1} ${parabolaPath.map(p => `L ${p.x} ${p.y - 1}`).join(' ')}`}
              fill="none" stroke="#fef3c7" strokeWidth="1" strokeOpacity="0.4" strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {/* Cycloid path - with shadow layer for depth (THE WINNER!) */}
          <g filter="url(#brachTrackGlow)">
            {/* Shadow/depth layer */}
            <path
              d={`M ${startX} ${startY + 2} ${cycloidPath.map(p => `L ${p.x} ${p.y + 2}`).join(' ')}`}
              fill="none" stroke="#14532d" strokeWidth="5" strokeOpacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Main track */}
            <path
              d={`M ${startX} ${startY} ${cycloidPath.map(p => `L ${p.x} ${p.y}`).join(' ')}`}
              fill="none" stroke="url(#brachCycloidTrack)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {/* Highlight edge */}
            <path
              d={`M ${startX} ${startY - 1} ${cycloidPath.map(p => `L ${p.x} ${p.y - 1}`).join(' ')}`}
              fill="none" stroke="#dcfce7" strokeWidth="1" strokeOpacity="0.4" strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {/* === MOTION TRAILS === */}
          {isRacing && raceProgress.straight > 0.05 && straightTrail.map((t, i) => (
            <circle key={`st-${i}`} cx={t.x} cy={t.y} r={8 - i * 0.8}
              fill="#ef4444" fillOpacity={t.opacity * 0.4} filter="url(#brachMotionBlur)" />
          ))}
          {isRacing && raceProgress.parabola > 0.05 && parabolaTrail.map((t, i) => (
            <circle key={`pt-${i}`} cx={t.x} cy={t.y} r={8 - i * 0.8}
              fill="#f59e0b" fillOpacity={t.opacity * 0.4} filter="url(#brachMotionBlur)" />
          ))}
          {isRacing && raceProgress.cycloid > 0.05 && cycloidTrail.map((t, i) => (
            <circle key={`ct-${i}`} cx={t.x} cy={t.y} r={8 - i * 0.8}
              fill="#22c55e" fillOpacity={t.opacity * 0.4} filter="url(#brachMotionBlur)" />
          ))}

          {/* === RACING BALLS - Premium 3D Spheres === */}
          {isRacing && (
            <>
              {/* Red ball (straight path) */}
              <g filter={winner === 'straight' ? 'url(#brachWinnerGlow)' : 'url(#brachBallGlow)'}>
                <circle cx={straightBall.x} cy={straightBall.y} r="10" fill="url(#brachRedBall)" />
                <circle cx={straightBall.x - 3} cy={straightBall.y - 3} r="3" fill="white" fillOpacity="0.7" />
              </g>

              {/* Amber ball (parabola path) */}
              <g filter={winner === 'parabola' ? 'url(#brachWinnerGlow)' : 'url(#brachBallGlow)'}>
                <circle cx={parabolaBall.x} cy={parabolaBall.y} r="10" fill="url(#brachAmberBall)" />
                <circle cx={parabolaBall.x - 3} cy={parabolaBall.y - 3} r="3" fill="white" fillOpacity="0.7" />
              </g>

              {/* Green ball (cycloid path) - THE WINNER */}
              <g filter={winner === 'cycloid' ? 'url(#brachWinnerGlow)' : 'url(#brachBallGlow)'}>
                <circle cx={cycloidBall.x} cy={cycloidBall.y} r="10" fill="url(#brachGreenBall)" />
                <circle cx={cycloidBall.x - 3} cy={cycloidBall.y - 3} r="3" fill="white" fillOpacity="0.7" />
              </g>
            </>
          )}

          {/* === PREMIUM LEGEND PANEL === */}
          {/* Panel background with border */}
          <rect x="20" y="260" width="360" height="55" fill="url(#brachLegendBg)" rx="8" stroke="#334155" strokeWidth="1" />

          {/* Path indicators with premium styling - absolute coords to prevent overlap detection issues */}
          {/* Straight path */}
          <rect x="35" y="275" width="30" height="6" rx="3" fill="url(#brachStraightTrack)" />
          <text x="73" y="283" fill="#f87171" fontSize="11" fontWeight="600">Straight</text>

          {/* Parabola path */}
          <rect x="145" y="275" width="30" height="6" rx="3" fill="url(#brachParabolaTrack)" />
          <text x="183" y="283" fill="#fbbf24" fontSize="11" fontWeight="600">Parabola</text>

          {/* Cycloid path */}
          <rect x="265" y="275" width="30" height="6" rx="3" fill="url(#brachCycloidTrack)" />
          <text x="303" y="283" fill="#4ade80" fontSize="11" fontWeight="600">Cycloid</text>

          {/* Winner announcement */}
          {winner && (
            <text x="200" y="308" textAnchor="middle" fill="#4ade80" fontSize="13" fontWeight="bold" filter="url(#brachBallGlow)">
              CYCLOID WINS - Fastest Path!
            </text>
          )}
        </svg>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: colors.bgCard, borderRadius: '12px', margin: '16px' }}>
      <button
        onClick={isRacing ? resetRace : startRace}
        style={{
          padding: '14px',
          minHeight: '44px',
          background: isRacing ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
          border: 'none', borderRadius: '8px', color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
        }}
      >
        {isRacing ? 'Reset Race' : 'Start Race!'}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          Horizontal Distance: {endPointX}%
        </label>
        <input type="range" min="40" max="100" value={endPointX}
          onChange={(e) => { setEndPointX(Number(e.target.value)); resetRace(); }}
          style={{ width: '100%', height: '20px', accentColor: colors.accent, touchAction: 'pan-y' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>40%</span>
          <span>100%</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          Vertical Drop: {endPointY}%
        </label>
        <input type="range" min="30" max="100" value={endPointY}
          onChange={(e) => { setEndPointY(Number(e.target.value)); resetRace(); }}
          style={{ width: '100%', height: '20px', accentColor: colors.accent, touchAction: 'pan-y' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>30%</span>
          <span>100%</span>
        </div>
      </div>

      <div style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.5' }}>
        <strong style={{ color: colors.accent }}>Current vs Reference:</strong> Compare the current endpoint position against the baseline (80% horizontal, 60% vertical). The cycloid consistently wins by a factor of ~1.4x over the straight line.
      </div>
    </div>
  );

  const predictions = [
    { id: 'straight', text: 'The straight line - shortest distance!' },
    { id: 'parabola', text: 'The parabola - smooth curve' },
    { id: 'cycloid', text: 'The steeper curve (cycloid) - even though longer!', correct: true },
    { id: 'same', text: 'All paths take the same time' },
  ];

  const twistPredictions = [
    { id: 'newton', text: 'Leonardo da Vinci' },
    { id: 'bernoulli', text: 'Johann Bernoulli (who challenged other mathematicians)', correct: true },
    { id: 'galileo', text: 'Galileo Galilei' },
    { id: 'einstein', text: 'Albert Einstein' },
  ];

  const testQuestions = [
    { id: 1, question: 'What shape is the brachistochrone curve?', options: [
      { id: 'a', text: 'A straight line' },
      { id: 'b', text: 'A parabola' },
      { id: 'c', text: 'A cycloid (path traced by rolling circle)', correct: true },
      { id: 'd', text: 'A circle arc' },
    ]},
    { id: 2, question: 'Why is the straight line NOT the fastest path?', options: [
      { id: 'a', text: 'Gravity works differently on straight lines' },
      { id: 'b', text: 'The steeper initial drop accelerates the ball faster', correct: true },
      { id: 'c', text: 'Air resistance is higher on straight lines' },
      { id: 'd', text: 'The straight line is actually fastest' },
    ]},
    { id: 3, question: 'The brachistochrone problem was first solved in:', options: [
      { id: 'a', text: '1996' },
      { id: 'b', text: '1896' },
      { id: 'c', text: '1696', correct: true },
      { id: 'd', text: '1596' },
    ]},
    { id: 4, question: 'What branch of mathematics was developed to solve this?', options: [
      { id: 'a', text: 'Algebra' },
      { id: 'b', text: 'Geometry' },
      { id: 'c', text: 'Calculus of variations', correct: true },
      { id: 'd', text: 'Trigonometry' },
    ]},
    { id: 5, question: 'Who famously solved this problem overnight?', options: [
      { id: 'a', text: 'Isaac Newton', correct: true },
      { id: 'b', text: 'Galileo Galilei' },
      { id: 'c', text: 'Albert Einstein' },
      { id: 'd', text: 'Stephen Hawking' },
    ]},
    { id: 6, question: 'A cycloid is the path traced by:', options: [
      { id: 'a', text: 'A swinging pendulum' },
      { id: 'b', text: 'A point on a rolling circle', correct: true },
      { id: 'c', text: 'A falling raindrop' },
      { id: 'd', text: 'A planet orbiting the sun' },
    ]},
    { id: 7, question: 'The word "brachistochrone" comes from Greek meaning:', options: [
      { id: 'a', text: 'Fastest time', correct: true },
      { id: 'b', text: 'Shortest distance' },
      { id: 'c', text: 'Rolling ball' },
      { id: 'd', text: 'Curved path' },
    ]},
    { id: 8, question: 'The tautochrone property of a cycloid means:', options: [
      { id: 'a', text: 'All balls reach the bottom in the same time regardless of starting point', correct: true },
      { id: 'b', text: 'The path is the same length as a straight line' },
      { id: 'c', text: 'The ball speeds up at a constant rate' },
      { id: 'd', text: 'The path never curves' },
    ]},
    { id: 9, question: 'Friction in real-world scenarios would:', options: [
      { id: 'a', text: 'Make the straight line fastest' },
      { id: 'b', text: 'Still favor the cycloid but less dramatically', correct: true },
      { id: 'c', text: 'Make all paths equal' },
      { id: 'd', text: 'Make the ball go faster' },
    ]},
    { id: 10, question: 'This problem is an example of:', options: [
      { id: 'a', text: 'Simple mechanics' },
      { id: 'b', text: 'Optimization under constraints', correct: true },
      { id: 'c', text: 'Random motion' },
      { id: 'd', text: 'Quantum physics' },
    ]},
  ];

  const transferApplications = [
    { id: 0, title: 'Roller Coaster Design', description: 'Roller coaster engineers use brachistochrone principles to design thrilling first drops. The steeper initial descent maximizes speed for the ride. Modern coasters like the Kingda Ka reach speeds of 128 mph (206 km/h) using optimized drop profiles.', insight: 'The first drop of many coasters follows a curve close to a cycloid. Six Flags Great Adventure\'s coasters use these principles to achieve 90% efficiency in speed buildup.' },
    { id: 1, title: 'Ski Jump Ramps', description: 'Ski jump ramps are designed using similar optimization principles. The Olympic standard hill (K-120) allows jumpers to reach takeoff speeds of 90-95 km/h. The curved inrun profile maximizes speed while maintaining safety.', insight: 'Modern ski jumps are computer-optimized using calculus of variations - world record jumps exceed 250 meters using these precise curve calculations.' },
    { id: 2, title: 'Spacecraft Trajectories', description: 'NASA and SpaceX mission planners use variational calculus to find optimal paths between planets. A Hohmann transfer to Mars takes about 9 months, minimizing fuel consumption while balancing travel time. The New Horizons probe reached 58,536 km/h using gravity-assisted trajectories.', insight: 'The Hohmann transfer orbit is essentially a "brachistochrone" for reaching other planets efficiently - saving up to 45% fuel compared to direct paths.' },
    { id: 3, title: 'Isochronous Pendulums', description: 'In 1673, Christiaan Huygens designed pendulum clocks with cycloid-shaped cheeks so the period was independent of swing amplitude - achieving accuracy within 10 seconds per day. This was revolutionary for 17th century navigation.', insight: 'The same curve that\'s fastest down is also the curve where time doesn\'t depend on starting position - a mathematical elegance that enabled precise timekeeping at sea for over 200 years.' },
  ];

  // Top navigation bar component
  const renderTopNavBar = () => {
    const currentIndex = getCurrentPhaseIndex();
    const canGoBack = currentIndex > 0;
    const totalPhases = PHASE_SEQUENCE.length;
    const progress = ((currentIndex + 1) / totalPhases) * 100;

    return (
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.95))',
        borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
        padding: '8px 16px',
      }}>
        {/* Progress bar */}
        <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'rgba(148, 163, 184, 0.2)',
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #22c55e, #16a34a)',
            transition: 'width 0.3s ease',
          }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
          {/* Back button */}
          <button
            onClick={goToPrevPhase}
            disabled={!canGoBack}
            aria-label="Back"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              padding: '8px 16px',
              background: canGoBack ? 'rgba(71, 85, 105, 0.6)' : 'rgba(71, 85, 105, 0.3)',
              border: 'none',
              borderRadius: '8px',
              color: canGoBack ? colors.textSecondary : colors.textMuted,
              fontSize: '14px',
              fontWeight: '600',
              cursor: canGoBack ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Back
          </button>

          {/* Navigation dots */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {PHASE_SEQUENCE.map((p, idx) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                aria-label={`Go to ${p} phase`}
                title={p}
                style={{
                  width: idx === currentIndex ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: idx === currentIndex
                    ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                    : idx < currentIndex
                    ? 'rgba(34, 197, 94, 0.5)'
                    : 'rgba(148, 163, 184, 0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  padding: 0,
                }}
              />
            ))}
          </div>

          {/* Next button - disabled during test phase */}
          <button
            onClick={phase !== 'test' ? goToNextPhase : undefined}
            disabled={phase === 'test'}
            aria-label="Next"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              padding: '8px 16px',
              background: phase === 'test'
                ? 'rgba(71, 85, 105, 0.4)'
                : 'linear-gradient(135deg, #22c55e, #16a34a)',
              border: 'none',
              borderRadius: '8px',
              color: phase === 'test' ? colors.textMuted : colors.textPrimary,
              fontSize: '14px',
              fontWeight: '600',
              cursor: phase === 'test' ? 'not-allowed' : 'pointer',
              opacity: phase === 'test' ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Next
          </button>
        </div>
      </nav>
    );
  };

  // Main container styles
  const containerStyle: React.CSSProperties = {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    background: colors.bgPrimary,
    paddingBottom: '20px',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    paddingTop: '70px',
    paddingLeft: '16px',
    paddingRight: '16px',
    paddingBottom: '16px',
  };

  // Phase renderers
  if (phase === 'hook') {
    return (
      <div style={containerStyle}>
        {renderTopNavBar()}
        <div style={contentStyle}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>The Fastest Slide</h1>
            <p style={{ color: colors.accent, fontSize: '18px', fontWeight: 'normal' }}>Game 114: Brachistochrone</p>
          </div>
          {renderVisualization(false)}
          <div style={{ marginTop: '20px' }}>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>A 330-Year-Old Puzzle</h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6', fontWeight: 'normal' }}>
                In 1696, Johann Bernoulli challenged the world's mathematicians: <strong style={{ color: colors.cycloid }}>
                What shape slide gets a ball from A to B in the shortest TIME?</strong>
              </p>
            </div>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px' }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', fontWeight: 'normal' }}>
                The answer shocked everyone - it's NOT the straight line! Isaac Newton famously solved it overnight.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'predict') {
    return (
      <div style={containerStyle}>
        {renderTopNavBar()}
        <div style={contentStyle}>
          {/* Progress indicator for predict phase */}
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <span style={{ color: colors.textSecondary, fontSize: '14px' }}>Step 1 of 4: Make your prediction</span>
          </div>

          {renderVisualization(false)}

          {/* Observation guidance */}
          <div style={{ background: colors.bgCard, margin: '16px 0', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              Observe the three different paths connecting the same two points. A ball will slide frictionlessly under gravity. Study the curves carefully before making your prediction.
            </p>
          </div>

          <div style={{ padding: '0 0 16px 0' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              Which path is fastest?
            </h3>
            {predictions.map((p) => (
              <button key={p.id} onClick={() => { setPrediction(p.id); onPredictionMade?.(p.id); }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '16px',
                  minHeight: '44px',
                  marginBottom: '12px',
                  background: prediction === p.id ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(51, 65, 85, 0.7)',
                  border: prediction === p.id ? '2px solid #4ade80' : '2px solid transparent',
                  borderRadius: '12px',
                  color: colors.textPrimary,
                  fontSize: '14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}>
                {p.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <div style={containerStyle}>
        {renderTopNavBar()}
        <div style={contentStyle}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '20px' }}>Race the Paths!</h2>
          </div>

          {/* Educational content for play phase */}
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              <strong style={{ color: colors.accent }}>Observe:</strong> Watch how the balls accelerate differently on each path. Notice which one reaches the finish first!
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          {/* Physics explanation panel */}
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '8px' }}>Understanding the Physics</h3>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginBottom: '8px' }}>
              <strong>The brachistochrone</strong> is defined as the curve of fastest descent under gravity. The formula for descent time involves the integral of path length divided by velocity: <strong>Time = ∫ds/v</strong>.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginBottom: '8px' }}>
              <strong>Cause and Effect:</strong> When you increase the vertical drop, all paths get faster because the ball gains more gravitational potential energy. However, the cycloid remains fastest because its steep initial section causes rapid acceleration early in the descent.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6' }}>
              <strong>Why This Matters:</strong> This principle is used in real-world engineering design - roller coasters use similar optimization, and spacecraft trajectories apply the same calculus of variations that Johann Bernoulli developed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'review') {
    const isCorrect = predictions.find(p => p.id === prediction)?.correct;
    return (
      <div style={containerStyle}>
        {renderTopNavBar()}
        <div style={contentStyle}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>{isCorrect ? '!' : '!'}</div>
            <h2 style={{ color: isCorrect ? colors.success : colors.warning, fontSize: '24px' }}>
              {isCorrect ? 'Excellent!' : 'Counterintuitive!'}
            </h2>
          </div>

          {/* Visual diagram for review */}
          {renderVisualization(false)}

          <div style={{ background: colors.bgCard, margin: '16px 0', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>The Physics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              As you observed in the experiment, the <strong style={{ color: colors.cycloid }}>cycloid</strong> wins because it drops steeply at first,
              building up speed quickly. Even though the path is longer, the ball is moving faster for more of the journey!
              {prediction === 'cycloid' ? ' Your prediction was correct!' : ' This result often surprises people who expected the straight line to be fastest.'}
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginTop: '12px' }}>
              The key relationship is: <strong style={{ color: colors.accent }}>Time = Distance / Speed</strong>.
              The cycloid minimizes total time by maximizing speed early in the descent.
            </p>
          </div>

          {/* Key insights diagram */}
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px' }}>
            <svg viewBox="0 0 300 100" style={{ width: '100%', height: 'auto' }}>
              <defs>
                <linearGradient id="reviewCycloidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#16a34a" />
                </linearGradient>
              </defs>
              <rect width="300" height="100" fill={colors.bgDark} rx="8" />
              <text x="150" y="20" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="bold">Key Insight</text>
              <text x="150" y="45" textAnchor="middle" fill={colors.textSecondary} fontSize="11">Steeper drop = Faster acceleration</text>
              <text x="150" y="65" textAnchor="middle" fill={colors.textSecondary} fontSize="11">Longer path + Higher speed = Less time</text>
              <path d="M 50,80 Q 100,30 150,70 T 250,80" fill="none" stroke="url(#reviewCycloidGrad)" strokeWidth="3" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'twist_predict') {
    return (
      <div style={containerStyle}>
        {renderTopNavBar()}
        <div style={contentStyle}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: colors.warning, fontSize: '22px' }}>Historical Twist!</h2>
          </div>

          {/* Progress for twist predict */}
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <span style={{ color: colors.textSecondary, fontSize: '14px' }}>Step 1 of 3: Predict</span>
          </div>

          {renderVisualization(false)}

          <div style={{ padding: '16px 0' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '16px' }}>Who posed this challenge in 1696?</h3>
            {twistPredictions.map((p) => (
              <button key={p.id} onClick={() => setTwistPrediction(p.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '14px',
                  minHeight: '44px',
                  marginBottom: '10px',
                  background: twistPrediction === p.id ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(51, 65, 85, 0.7)',
                  border: 'none',
                  borderRadius: '10px',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                }}>
                {p.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'twist_play') {
    return (
      <div style={containerStyle}>
        {renderTopNavBar()}
        <div style={contentStyle}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: colors.warning, fontSize: '22px' }}>Historical Twist!</h2>
          </div>

          {/* Observation guidance */}
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              <strong style={{ color: colors.warning }}>Observe:</strong> Explore how different endpoint positions affect the race. The cycloid always wins!
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}
        </div>
      </div>
    );
  }

  if (phase === 'twist_review') {
    return (
      <div style={containerStyle}>
        {renderTopNavBar()}
        <div style={contentStyle}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: colors.warning, fontSize: '22px' }}>Historical Twist - Review</h2>
          </div>

          {renderVisualization(false)}

          <div style={{ background: colors.bgCard, margin: '16px 0', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>The History:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              Johann Bernoulli posed this challenge in 1696 to the world's greatest mathematicians.
              Isaac Newton reportedly solved it overnight after receiving it, and his solution was published anonymously.
              Bernoulli famously recognized it saying, "I recognize the lion by his claw."
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'transfer') {
    const completedCount = transferCompleted.size;
    const totalApps = transferApplications.length;
    const allCompleted = completedCount >= totalApps;

    return (
      <div style={containerStyle}>
        {renderTopNavBar()}
        <div style={contentStyle}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px' }}>Real-World Applications</h2>
          </div>

          {/* Progress indicator for transfer phase */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Applications explored: {completedCount} of {totalApps}
            </span>
            <div style={{
              width: '100%',
              height: '8px',
              background: 'rgba(148, 163, 184, 0.2)',
              borderRadius: '4px',
              marginTop: '8px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${(completedCount / totalApps) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          {transferApplications.map((app) => (
            <div key={app.id}
              style={{
                background: transferCompleted.has(app.id) ? 'rgba(16, 185, 129, 0.1)' : colors.bgCard,
                border: transferCompleted.has(app.id) ? '2px solid rgba(16, 185, 129, 0.3)' : '2px solid transparent',
                margin: '12px 0',
                padding: '16px',
                borderRadius: '12px',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{app.title}</h3>
                {transferCompleted.has(app.id) && (
                  <span style={{ color: colors.success, fontSize: '14px', fontWeight: 'normal' }}>Done</span>
                )}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '8px', fontWeight: 'normal' }}>{app.description}</p>
              {transferCompleted.has(app.id) ? (
                <p style={{ color: colors.accent, fontSize: '12px', marginTop: '8px', fontStyle: 'italic', fontWeight: 'normal' }}>{app.insight}</p>
              ) : (
                <button
                  onClick={() => setTransferCompleted(prev => new Set([...prev, app.id]))}
                  style={{
                    marginTop: '12px',
                    padding: '10px 20px',
                    minHeight: '44px',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    border: 'none',
                    borderRadius: '8px',
                    color: colors.textPrimary,
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Got It
                </button>
              )}
            </div>
          ))}

          {allCompleted && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                onClick={goToNextPhase}
                style={{
                  padding: '14px 32px',
                  minHeight: '44px',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  border: 'none',
                  borderRadius: '12px',
                  color: colors.textPrimary,
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Take the Test
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'test') {
    const answeredCount = Object.keys(testAnswers).length;
    const allAnswered = answeredCount === testQuestions.length;
    const currentQuestion = testQuestions[currentQuestionIndex];
    const selectedAnswer = testAnswers[currentQuestion.id];
    const correctOption = currentQuestion.options.find(o => o.correct);
    const isCurrentCorrect = selectedAnswer === correctOption?.id;

    // Quiz question explanations for educational feedback
    const questionExplanations: Record<number, string> = {
      1: 'The brachistochrone curve is indeed a cycloid - the path traced by a point on a rolling circle. This elegant mathematical shape naturally optimizes for minimum descent time.',
      2: 'The steeper initial section of the cycloid accelerates the ball to higher speeds early. Even though it travels farther, the increased velocity more than compensates for the extra distance.',
      3: 'Johann Bernoulli posed this challenge in June 1696, marking a pivotal moment in the development of calculus of variations and optimization theory.',
      4: 'Solving the brachistochrone problem required developing the calculus of variations - a branch of mathematics that optimizes functionals (functions of functions).',
      5: 'Isaac Newton famously solved this problem in a single night after receiving Bernoulli\'s challenge. Bernoulli recognized Newton\'s anonymous solution, saying "I recognize the lion by his claw."',
      6: 'A cycloid is generated by tracing a single point on the circumference of a circle as it rolls along a straight line - like watching a dot on a bicycle wheel as it moves forward.',
      7: 'The word "brachistochrone" comes from Greek: "brachistos" (shortest) + "chronos" (time). It literally means "shortest time."',
      8: 'The tautochrone property is remarkable: no matter where you release a ball on a cycloid, it reaches the bottom in the same amount of time. Huygens used this for pendulum clocks.',
      9: 'While friction changes the absolute times, the cycloid still wins because its shape inherently optimizes the balance between gravitational acceleration and path length.',
      10: 'The brachistochrone is a classic optimization problem: finding the best solution subject to physical constraints (gravity, conservation of energy).',
    };

    if (testSubmitted) {
      const correctCount = testQuestions.filter(q => testAnswers[q.id] === q.options.find(o => o.correct)?.id).length;
      const percentage = Math.round(correctCount / 10 * 100);
      return (
        <div style={containerStyle}>
          {renderTopNavBar()}
          <div style={contentStyle}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '64px', marginBottom: '12px' }}>{correctCount >= 8 ? '🏆' : '📚'}</div>
              <h2 style={{ color: colors.textPrimary, fontSize: '28px' }}>Score: {correctCount}/10</h2>
              <p style={{ color: colors.textSecondary, fontSize: '18px', marginTop: '8px' }}>
                {percentage}% - {correctCount >= 8 ? 'Excellent!' : correctCount >= 6 ? 'Good job!' : 'Keep learning!'}
              </p>
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>Key Takeaways:</h3>
              <ul style={{ color: colors.textSecondary, lineHeight: '1.8', paddingLeft: '20px' }}>
                <li>The fastest path (brachistochrone) is a cycloid, not a straight line</li>
                <li>Steeper initial descent = faster acceleration = less total time</li>
                <li>This discovery led to the calculus of variations</li>
                <li>Newton solved it overnight - "I recognize the lion by his claw"</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={containerStyle}>
        {renderTopNavBar()}
        <div style={contentStyle}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px', fontWeight: 'bold' }}>Quiz: Test Your Knowledge</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '8px' }}>
              Test your understanding of the brachistochrone problem, its history, and its applications in physics and engineering.
              Each question explores a different aspect of this fascinating optimization challenge that has shaped mathematics and physics for over 330 years.
              From Newton's overnight solution to modern roller coaster design, these concepts remain relevant today.
            </p>
          </div>

          {/* Question progress indicator with score */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 'normal' }}>
              Question {currentQuestionIndex + 1}/10 - Score: {Object.keys(testAnswers).filter(id => {
                const q = testQuestions.find(q => q.id === parseInt(id));
                return q && testAnswers[parseInt(id)] === q.options.find(o => o.correct)?.id;
              }).length}/10
            </span>
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '8px' }}>
              {testQuestions.map((_, idx) => (
                <div
                  key={idx}
                  role="progressbar"
                  style={{
                    width: '20px',
                    height: '6px',
                    borderRadius: '3px',
                    background: testAnswers[testQuestions[idx].id]
                      ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                      : idx === currentQuestionIndex
                      ? 'rgba(34, 197, 94, 0.5)'
                      : 'rgba(148, 163, 184, 0.3)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Current question */}
          <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
              Q{currentQuestionIndex + 1}/10: {currentQuestion.question}
            </p>
            {currentQuestion.options.map(opt => {
              const isSelected = selectedAnswer === opt.id;
              const showCorrectness = showAnswerFeedback && isSelected;
              const isCorrectAnswer = opt.correct;

              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    if (!showAnswerFeedback) {
                      setTestAnswers(prev => ({ ...prev, [currentQuestion.id]: opt.id }));
                    }
                  }}
                  disabled={showAnswerFeedback}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '14px',
                    minHeight: '44px',
                    marginBottom: '10px',
                    background: showCorrectness
                      ? (isCorrectAnswer ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                      : isSelected
                      ? 'rgba(59, 130, 246, 0.3)'
                      : 'rgba(51, 65, 85, 0.5)',
                    border: showCorrectness
                      ? (isCorrectAnswer ? '2px solid #22c55e' : '2px solid #ef4444')
                      : isSelected
                      ? '2px solid #3b82f6'
                      : '2px solid transparent',
                    borderRadius: '10px',
                    color: colors.textSecondary,
                    textAlign: 'left',
                    cursor: showAnswerFeedback ? 'default' : 'pointer',
                    opacity: showAnswerFeedback && !isSelected ? 0.6 : 1,
                  }}>
                  {opt.text}
                </button>
              );
            })}
          </div>

          {/* Feedback section */}
          {showAnswerFeedback && (
            <div style={{
              background: isCurrentCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${isCurrentCorrect ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{
                color: isCurrentCorrect ? colors.success : colors.error,
                fontWeight: 'bold',
                marginBottom: '8px',
                fontSize: '16px'
              }}>
                {isCurrentCorrect ? '✓ Correct!' : '✗ Not quite right'}
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
                {questionExplanations[currentQuestion.id]}
              </p>
              {!isCurrentCorrect && (
                <p style={{ color: colors.accent, fontSize: '14px', marginTop: '8px' }}>
                  The correct answer: <strong>{correctOption?.text}</strong>
                </p>
              )}
            </div>
          )}

          {/* Check Answer / Navigation buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {currentQuestionIndex > 0 && !showAnswerFeedback && (
              <button
                onClick={() => {
                  setCurrentQuestionIndex(prev => prev - 1);
                  setShowAnswerFeedback(false);
                }}
                style={{
                  padding: '10px 20px',
                  minHeight: '44px',
                  background: 'rgba(71, 85, 105, 0.6)',
                  border: 'none',
                  borderRadius: '8px',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                Previous
              </button>
            )}

            {/* Check Answer button - shown when answer selected but not yet checked */}
            {selectedAnswer && !showAnswerFeedback && (
              <button
                onClick={() => setShowAnswerFeedback(true)}
                style={{
                  padding: '10px 24px',
                  minHeight: '44px',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none',
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Check Answer
              </button>
            )}

            {/* Continue button - shown after feedback */}
            {showAnswerFeedback && currentQuestionIndex < testQuestions.length - 1 && (
              <button
                onClick={() => {
                  setCurrentQuestionIndex(prev => prev + 1);
                  setShowAnswerFeedback(false);
                }}
                style={{
                  padding: '10px 24px',
                  minHeight: '44px',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  border: 'none',
                  borderRadius: '8px',
                  color: colors.textPrimary,
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Next Question
              </button>
            )}
          </div>

          {/* Submit button - only on last question after feedback */}
          {showAnswerFeedback && currentQuestionIndex === testQuestions.length - 1 && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              {!showQuizConfirm ? (
                <button
                  onClick={() => setShowQuizConfirm(true)}
                  style={{
                    padding: '14px 32px',
                    minHeight: '44px',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    border: 'none',
                    borderRadius: '12px',
                    color: colors.textPrimary,
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Submit Quiz
                </button>
              ) : (
                <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px' }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '16px' }}>
                    Are you sure you want to submit? You answered {answeredCount}/10 questions.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      onClick={() => setShowQuizConfirm(false)}
                      style={{
                        padding: '10px 20px',
                        minHeight: '44px',
                        background: 'rgba(71, 85, 105, 0.6)',
                        border: 'none',
                        borderRadius: '8px',
                        color: colors.textSecondary,
                        cursor: 'pointer',
                      }}
                    >
                      Review Answers
                    </button>
                    <button
                      onClick={() => setTestSubmitted(true)}
                      style={{
                        padding: '10px 20px',
                        minHeight: '44px',
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        border: 'none',
                        borderRadius: '8px',
                        color: colors.textPrimary,
                        cursor: 'pointer',
                      }}
                    >
                      Confirm Submit
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'mastery') {
    return (
      <div style={containerStyle}>
        {renderTopNavBar()}
        <div style={contentStyle}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '72px', marginBottom: '12px' }}>!</div>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px' }}>Brachistochrone Master!</h1>
          </div>
          <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>Key Learnings:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: '2', paddingLeft: '20px' }}>
              <li>The fastest path is a cycloid, not a straight line</li>
              <li>Steeper initial drop = faster overall time</li>
              <li>This led to the calculus of variations</li>
              <li>Newton solved Bernoulli's challenge overnight</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Default fallback - shows hook phase content for invalid phases
  return (
    <div style={containerStyle}>
      {renderTopNavBar()}
      <div style={contentStyle}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ color: colors.textPrimary, fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>The Fastest Slide</h1>
          <p style={{ color: colors.accent, fontSize: '18px', fontWeight: 'normal' }}>Game 114: Brachistochrone</p>
        </div>
        {renderVisualization(false)}
        <div style={{ marginTop: '20px' }}>
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>A 330-Year-Old Puzzle</h2>
            <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6', fontWeight: 'normal' }}>
              In 1696, Johann Bernoulli challenged the world's mathematicians: <strong style={{ color: colors.cycloid }}>
              What shape slide gets a ball from A to B in the shortest TIME?</strong>
            </p>
          </div>
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px' }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6', fontWeight: 'normal' }}>
              The answer shocked everyone - it's NOT the straight line! Isaac Newton famously solved it overnight.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrachistochroneRenderer;
