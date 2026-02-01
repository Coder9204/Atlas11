import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// GAME 114: BRACHISTOCHRONE
// The curve of fastest descent - a cycloid, not a straight line!
// Demonstrates calculus of variations, energy/time tradeoffs
// ============================================================================

interface BrachistochroneRendererProps {
  phase: string;
  onPhaseComplete?: () => void;
  onPredictionMade?: (prediction: string) => void;
}

// Color palette
const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
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
  phase,
  onPhaseComplete,
  onPredictionMade,
}) => {
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

  // Path calculations
  const startX = 50, startY = 80;
  const endX = 50 + (endPointX / 100) * 280;
  const endY = 80 + (endPointY / 100) * 180;

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

          {/* === TITLE === */}
          <text x="200" y="25" textAnchor="middle" fill="url(#brachTitleGrad)" fontSize="16" fontWeight="bold">
            Brachistochrone Problem
          </text>
          <text x="200" y="42" textAnchor="middle" fill={colors.textMuted} fontSize="10">
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
              d={`M ${startX},${startY + 2} ${parabolaPath.map(p => `L ${p.x},${p.y + 2}`).join(' ')}`}
              fill="none" stroke="#78350f" strokeWidth="5" strokeOpacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Main track */}
            <path
              d={`M ${startX},${startY} ${parabolaPath.map(p => `L ${p.x},${p.y}`).join(' ')}`}
              fill="none" stroke="url(#brachParabolaTrack)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {/* Highlight edge */}
            <path
              d={`M ${startX},${startY - 1} ${parabolaPath.map(p => `L ${p.x},${p.y - 1}`).join(' ')}`}
              fill="none" stroke="#fef3c7" strokeWidth="1" strokeOpacity="0.4" strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {/* Cycloid path - with shadow layer for depth (THE WINNER!) */}
          <g filter="url(#brachTrackGlow)">
            {/* Shadow/depth layer */}
            <path
              d={`M ${startX},${startY + 2} ${cycloidPath.map(p => `L ${p.x},${p.y + 2}`).join(' ')}`}
              fill="none" stroke="#14532d" strokeWidth="5" strokeOpacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Main track */}
            <path
              d={`M ${startX},${startY} ${cycloidPath.map(p => `L ${p.x},${p.y}`).join(' ')}`}
              fill="none" stroke="url(#brachCycloidTrack)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {/* Highlight edge */}
            <path
              d={`M ${startX},${startY - 1} ${cycloidPath.map(p => `L ${p.x},${p.y - 1}`).join(' ')}`}
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
          <g transform="translate(20, 260)">
            {/* Panel background with border */}
            <rect x="0" y="0" width="360" height="55" fill="url(#brachLegendBg)" rx="8" stroke="#334155" strokeWidth="1" />

            {/* Path indicators with premium styling */}
            {/* Straight path */}
            <g transform="translate(15, 15)">
              <rect x="0" y="0" width="30" height="6" rx="3" fill="url(#brachStraightTrack)" />
              <text x="38" y="8" fill="#f87171" fontSize="11" fontWeight="600">Straight</text>
            </g>

            {/* Parabola path */}
            <g transform="translate(125, 15)">
              <rect x="0" y="0" width="30" height="6" rx="3" fill="url(#brachParabolaTrack)" />
              <text x="38" y="8" fill="#fbbf24" fontSize="11" fontWeight="600">Parabola</text>
            </g>

            {/* Cycloid path */}
            <g transform="translate(245, 15)">
              <rect x="0" y="0" width="30" height="6" rx="3" fill="url(#brachCycloidTrack)" />
              <text x="38" y="8" fill="#4ade80" fontSize="11" fontWeight="600">Cycloid</text>
            </g>

            {/* Winner announcement */}
            {winner && (
              <g transform="translate(180, 40)">
                <text textAnchor="middle" fill="#4ade80" fontSize="13" fontWeight="bold" filter="url(#brachBallGlow)">
                  CYCLOID WINS - Fastest Path!
                </text>
              </g>
            )}
          </g>
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
          background: isRacing ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
          border: 'none', borderRadius: '8px', color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
        }}
      >
        {isRacing ? '🔄 Reset Race' : '🏁 Start Race!'}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          📏 Horizontal Distance: {endPointX}%
        </label>
        <input type="range" min="40" max="100" value={endPointX}
          onChange={(e) => { setEndPointX(Number(e.target.value)); resetRace(); }}
          style={{ width: '100%', accentColor: colors.accent }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          📐 Vertical Drop: {endPointY}%
        </label>
        <input type="range" min="30" max="100" value={endPointY}
          onChange={(e) => { setEndPointY(Number(e.target.value)); resetRace(); }}
          style={{ width: '100%', accentColor: colors.accent }} />
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
    { id: 0, title: '🎢 Roller Coaster Design', description: 'Roller coaster engineers use brachistochrone principles to design thrilling first drops. The steeper initial descent maximizes speed for the ride.', insight: 'The first drop of many coasters follows a curve close to a cycloid for maximum thrill!' },
    { id: 1, title: '⛷️ Ski Jump Ramps', description: 'Ski jump ramps are designed using similar optimization principles. The ramp shape affects takeoff speed and angle.', insight: 'Modern ski jumps are computer-optimized using calculus of variations - the same math that solves the brachistochrone.' },
    { id: 2, title: '🚀 Spacecraft Trajectories', description: 'Space mission planners use variational calculus to find optimal paths. Minimizing fuel or time often leads to non-intuitive trajectories.', insight: 'The Hohmann transfer orbit is a "brachistochrone" for reaching other planets efficiently.' },
    { id: 3, title: '⏱️ Isochronous Pendulums', description: 'Huygens designed pendulum clocks with cycloid-shaped cheeks so the period was independent of swing amplitude - perfect timekeeping!', insight: 'The same curve that\'s fastest down is also the curve where time doesn\'t depend on starting position.' },
  ];

  // Real-world applications of brachistochrone/optimal path principles
  const realWorldApps = [
    {
      icon: '🎢',
      title: 'Roller Coaster Design',
      short: 'Thrill Engineering',
      tagline: 'Where Physics Meets Adrenaline',
      description: 'Roller coaster engineers apply brachistochrone principles to design the perfect first drop. By using a steeper initial descent curve rather than a straight slope, coasters achieve maximum speed faster, delivering the gut-dropping sensation riders crave.',
      connection: 'The cycloid curve principle shows that a steeper initial drop accelerates riders faster than a straight decline. This counterintuitive insight from 1696 directly shapes how modern thrill rides are engineered for maximum excitement.',
      howItWorks: 'Engineers model the track as a series of connected curves optimized for speed, g-forces, and safety. The first drop often approximates a clothoid or cycloid curve, ensuring smooth acceleration. Computer simulations test thousands of curve variations to find the optimal path that maximizes velocity while keeping g-forces within safe limits for human physiology.',
      stats: [
        { value: '150+ mph', label: 'Top Speed (Formula Rossa)', icon: '💨' },
        { value: '456 ft', label: 'Tallest Drop (Kingda Ka)', icon: '📏' },
        { value: '6.3 Gs', label: 'Max G-Force Experienced', icon: '🎯' },
      ],
      examples: [
        'Steel Vengeance at Cedar Point uses optimized drop curves',
        'Formula Rossa uses launch systems informed by trajectory optimization',
        'Millennium Force pioneered computer-designed drop profiles',
        'Fury 325 employs parabolic-cycloid hybrid curves',
      ],
      companies: ['Intamin', 'Bolliger & Mabillard', 'Rocky Mountain Construction', 'Mack Rides', 'Vekoma'],
      futureImpact: 'Future coasters will use AI-driven real-time track adjustment systems that modify curve profiles based on weather conditions and rider weight distribution, creating personalized optimal experiences for each train.',
      color: '#ef4444',
    },
    {
      icon: '⛷️',
      title: 'Ski Jump Ramp Design',
      short: 'Sports Engineering',
      tagline: 'Launching Athletes into Flight',
      description: 'Modern ski jump ramps are marvels of physics engineering, designed using calculus of variations to give athletes maximum takeoff speed and optimal launch angles. The ramp profile is the result of solving an optimization problem similar to the brachistochrone.',
      connection: 'Just as the brachistochrone finds the fastest descent path, ski jump engineers find the curve that converts potential energy into maximum kinetic energy at takeoff while maintaining athlete control and safety.',
      howItWorks: 'The in-run (approach ramp) follows a carefully calculated curve that balances speed gain with skier stability. The takeoff table angle and curvature are optimized using differential equations. Wind tunnel testing and CFD simulations refine the design. The landing hill profile is equally optimized to reduce impact forces using parabolic curves that match the jumper\'s trajectory.',
      stats: [
        { value: '253.5 m', label: 'World Record Jump', icon: '🏆' },
        { value: '105 km/h', label: 'Typical Takeoff Speed', icon: '🚀' },
        { value: '5-7°', label: 'Optimal Takeoff Angle', icon: '📐' },
      ],
      examples: [
        'Vikersund ski flying hill with 225m hill size',
        'Planica Nordic Center hosting World Championships',
        'Holmenkollen redesigned for 2011 World Championships',
        'Oberstdorf Four Hills Tournament venue',
      ],
      companies: ['FIS (International Ski Federation)', 'Doppelmayr', 'AUT Engineering', 'Nordic Engineering Partners', 'WSC Sports Facilities'],
      futureImpact: 'Next-generation ski jumps will incorporate adjustable ramp sections with embedded sensors that can modify the approach curve based on real-time wind conditions and individual athlete biomechanics.',
      color: '#3b82f6',
    },
    {
      icon: '🚀',
      title: 'Optimal Spacecraft Trajectories',
      short: 'Orbital Mechanics',
      tagline: 'The Cosmic Brachistochrone',
      description: 'Space mission planners solve a cosmic version of the brachistochrone problem when designing spacecraft trajectories. Finding the optimal path between planets involves trading off fuel consumption, travel time, and payload mass.',
      connection: 'The calculus of variations developed to solve the brachistochrone is the same mathematical framework used to compute optimal spacecraft trajectories. Both seek paths that minimize or maximize a quantity (time, fuel, or delta-v) under physical constraints.',
      howItWorks: 'Mission designers use Pontryagin\'s maximum principle and optimal control theory to compute fuel-optimal or time-optimal trajectories. The Hohmann transfer ellipse is the "brachistochrone of space" for minimum-fuel transfers. Low-thrust missions use continuous optimization to compute spiral trajectories. Gravity assists exploit planetary motion to gain free velocity changes.',
      stats: [
        { value: '7 years', label: 'Cassini Saturn Journey', icon: '🪐' },
        { value: '35%', label: 'Fuel Savings via Gravity Assists', icon: '⛽' },
        { value: '17 km/s', label: 'Voyager 1 Escape Velocity', icon: '🌟' },
      ],
      examples: [
        'Voyager missions used gravity slingshots for Grand Tour',
        'Parker Solar Probe uses Venus gravity assists',
        'JWST traveled to L2 point via optimal trajectory',
        'Mars missions use Hohmann transfer windows',
      ],
      companies: ['NASA JPL', 'SpaceX', 'ESA', 'Blue Origin', 'Rocket Lab'],
      futureImpact: 'AI-powered trajectory optimization will enable autonomous spacecraft to dynamically recalculate optimal paths in real-time, adapting to unexpected conditions and discovering more efficient routes through the solar system.',
      color: '#8b5cf6',
    },
    {
      icon: '📦',
      title: 'Automated Material Handling',
      short: 'Warehouse Logistics',
      tagline: 'Optimizing Every Movement',
      description: 'Modern fulfillment centers use brachistochrone-inspired path optimization to move millions of packages daily. Conveyor systems, robotic pickers, and automated guided vehicles all rely on optimal path algorithms to maximize throughput.',
      connection: 'The principle that the fastest path isn\'t always the shortest directly applies to warehouse logistics. Optimal routing considers acceleration limits, traffic congestion, and system constraints—just like the brachistochrone considers gravity and curve geometry.',
      howItWorks: 'Warehouse management systems use variants of the traveling salesman problem combined with time-optimal control theory. Conveyor systems are designed with banked curves and optimal inclines. Robotic arms compute minimum-time trajectories using the same calculus of variations. Machine learning continuously refines path predictions based on real-time congestion data.',
      stats: [
        { value: '1M+', label: 'Packages/Day (Amazon FC)', icon: '📦' },
        { value: '400%', label: 'Efficiency Gain with Optimization', icon: '📈' },
        { value: '< 2 hrs', label: 'Avg Order Fulfillment Time', icon: '⏱️' },
      ],
      examples: [
        'Amazon robotics uses path optimization algorithms',
        'Ocado automated grocery fulfillment centers',
        'Alibaba smart warehouses with 1000+ robots',
        'DHL automated sorting hubs processing 60K/hour',
      ],
      companies: ['Amazon Robotics', 'Ocado Technology', 'Dematic', 'KUKA', 'Fetch Robotics'],
      futureImpact: 'Quantum computing will solve complex multi-robot path optimization problems that are currently intractable, enabling warehouses where thousands of autonomous agents coordinate in real-time for near-perfect efficiency.',
      color: '#f59e0b',
    },
  ];

  const renderBottomBar = (showButton: boolean, buttonEnabled: boolean, buttonText: string) => (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))', borderTop: '1px solid rgba(148, 163, 184, 0.2)', zIndex: 1000 }}>
      {showButton && (
        <button onClick={() => onPhaseComplete?.()} disabled={!buttonEnabled}
          style={{ width: '100%', padding: '14px 24px', background: buttonEnabled ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(71, 85, 105, 0.5)', border: 'none', borderRadius: '12px', color: buttonEnabled ? colors.textPrimary : colors.textMuted, fontSize: '16px', fontWeight: 'bold', cursor: buttonEnabled ? 'pointer' : 'not-allowed' }}>
          {buttonText}
        </button>
      )}
    </div>
  );

  // Phase renderers (abbreviated structure)
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>🏎️ The Fastest Slide</h1>
            <p style={{ color: colors.accent, fontSize: '18px' }}>Game 114: Brachistochrone</p>
          </div>
          {renderVisualization(false)}
          <div style={{ padding: '20px' }}>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '12px' }}>🤯 A 330-Year-Old Puzzle</h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6' }}>
                In 1696, Johann Bernoulli challenged the world's mathematicians: <strong style={{ color: colors.cycloid }}>
                What shape slide gets a ball from A to B in the shortest TIME?</strong>
              </p>
            </div>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px' }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
                The answer shocked everyone - it's NOT the straight line! Isaac Newton famously solved it overnight.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, "Let's Explore! →")}
      </div>
    );
  }

  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}
          <div style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>📋 What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              Three different paths connect the same two points. A ball will slide frictionlessly under gravity. Which path gets the ball to the end fastest?
            </p>
          </div>
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              🤔 Which path is fastest?
            </h3>
            {predictions.map((p) => (
              <button key={p.id} onClick={() => { setPrediction(p.id); onPredictionMade?.(p.id); }}
                style={{ display: 'block', width: '100%', padding: '16px', marginBottom: '12px', background: prediction === p.id ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(51, 65, 85, 0.7)', border: prediction === p.id ? '2px solid #4ade80' : '2px solid transparent', borderRadius: '12px', color: colors.textPrimary, fontSize: '14px', textAlign: 'left', cursor: 'pointer' }}>
                {p.text}
              </button>
            ))}
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction →')}
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '20px' }}>🏁 Race the Paths!</h2>
          </div>
          {renderVisualization(true)}
          {renderControls()}
        </div>
        {renderBottomBar(true, true, 'See What I Learned →')}
      </div>
    );
  }

  if (phase === 'review') {
    const isCorrect = predictions.find(p => p.id === prediction)?.correct;
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>{isCorrect ? '🎯' : '💡'}</div>
            <h2 style={{ color: isCorrect ? colors.success : colors.warning, fontSize: '24px' }}>
              {isCorrect ? 'Excellent!' : 'Counterintuitive!'}
            </h2>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>📚 The Physics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              The <strong style={{ color: colors.cycloid }}>cycloid</strong> wins because it drops steeply at first,
              building up speed quickly. Even though the path is longer, the ball is moving faster for more of the journey!
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'Ready for a Challenge →')}
      </div>
    );
  }

  if (phase === 'twist_predict' || phase === 'twist_play' || phase === 'twist_review') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '22px' }}>🌀 Historical Twist!</h2>
          </div>
          {renderVisualization(true)}
          {phase === 'twist_predict' && (
            <div style={{ padding: '16px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '16px' }}>Who posed this challenge in 1696?</h3>
              {twistPredictions.map((p) => (
                <button key={p.id} onClick={() => setTwistPrediction(p.id)}
                  style={{ display: 'block', width: '100%', padding: '14px', marginBottom: '10px', background: twistPrediction === p.id ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(51, 65, 85, 0.7)', border: 'none', borderRadius: '10px', color: colors.textPrimary, cursor: 'pointer' }}>
                  {p.text}
                </button>
              ))}
            </div>
          )}
          {(phase === 'twist_play' || phase === 'twist_review') && renderControls()}
        </div>
        {renderBottomBar(true, phase === 'twist_predict' ? !!twistPrediction : true,
          phase === 'twist_predict' ? 'See The Answer →' : phase === 'twist_play' ? 'Learn More →' : 'See Applications →')}
      </div>
    );
  }

  if (phase === 'transfer') {
    const allCompleted = transferCompleted.size >= 4;
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px' }}>🌍 Real Applications</h2>
          </div>
          {transferApplications.map((app) => (
            <div key={app.id} onClick={() => setTransferCompleted(prev => new Set([...prev, app.id]))}
              style={{ background: transferCompleted.has(app.id) ? 'rgba(16, 185, 129, 0.1)' : colors.bgCard, border: transferCompleted.has(app.id) ? '2px solid rgba(16, 185, 129, 0.3)' : '2px solid transparent', margin: '12px 16px', padding: '16px', borderRadius: '12px', cursor: 'pointer' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
              <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '8px' }}>{app.description}</p>
            </div>
          ))}
        </div>
        {renderBottomBar(true, allCompleted, allCompleted ? 'Take the Test →' : `Explore ${4 - transferCompleted.size} More`)}
      </div>
    );
  }

  if (phase === 'test') {
    const answeredCount = Object.keys(testAnswers).length;
    const allAnswered = answeredCount === testQuestions.length;

    if (testSubmitted) {
      const correctCount = testQuestions.filter(q => testAnswers[q.id] === q.options.find(o => o.correct)?.id).length;
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px' }}>{correctCount >= 8 ? '🏆' : '📚'}</div>
              <h2 style={{ color: colors.textPrimary, fontSize: '28px' }}>{Math.round(correctCount / 10 * 100)}%</h2>
            </div>
          </div>
          {renderBottomBar(true, true, 'Complete! 🎉')}
        </div>
      );
    }

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px' }}>📝 Test</h2>
          </div>
          {testQuestions.map((q, idx) => (
            <div key={q.id} style={{ background: colors.bgCard, margin: '12px 16px', padding: '16px', borderRadius: '12px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>{idx + 1}. {q.question}</p>
              {q.options.map(opt => (
                <button key={opt.id} onClick={() => setTestAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                  style={{ display: 'block', width: '100%', padding: '10px', marginBottom: '8px', background: testAnswers[q.id] === opt.id ? 'rgba(34, 197, 94, 0.3)' : 'rgba(51, 65, 85, 0.5)', border: 'none', borderRadius: '8px', color: colors.textSecondary, textAlign: 'left', cursor: 'pointer' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          ))}
        </div>
        {allAnswered && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', background: colors.bgDark }}>
            <button onClick={() => setTestSubmitted(true)} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: '12px', color: colors.textPrimary, fontWeight: 'bold', cursor: 'pointer' }}>Submit</button>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '72px' }}>🏆</div>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px' }}>Brachistochrone Master!</h1>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.textPrimary }}>🎓 Key Learnings:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: '2' }}>
              <li>The fastest path is a cycloid, not a straight line</li>
              <li>Steeper initial drop = faster overall time</li>
              <li>This led to the calculus of variations</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'Complete Game →')}
      </div>
    );
  }

  return <div style={{ padding: '20px' }}><p style={{ color: colors.textSecondary }}>Loading: {phase}</p></div>;
};

export default BrachistochroneRenderer;
