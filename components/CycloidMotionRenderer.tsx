import React, { useState, useEffect, useCallback } from 'react';

interface CycloidMotionRendererProps {
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
  accent: '#06b6d4',
  accentGlow: 'rgba(6, 182, 212, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  wheel: '#3b82f6',
  point: '#ef4444',
  cycloid: '#10b981',
  ground: '#475569',
};

const CycloidMotionRenderer: React.FC<CycloidMotionRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
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
  const [theta, setTheta] = useState(0);  // Rotation angle
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);

  // Game parameters
  const [showTrace, setShowTrace] = useState(true);
  const [tracePointRadius, setTracePointRadius] = useState(1.0);  // 1.0 = rim, 0.5 = midpoint, 0 = center
  const [showVelocityVectors, setShowVelocityVectors] = useState(false);

  // Trace history
  const [tracePoints, setTracePoints] = useState<{x: number, y: number}[]>([]);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Wheel properties
  const wheelRadius = 50;
  const groundY = 300;
  const startX = 80;

  // Calculate positions
  const getWheelCenter = useCallback((angle: number) => {
    const x = startX + wheelRadius * angle;
    const y = groundY - wheelRadius;
    return { x, y };
  }, [startX, wheelRadius, groundY]);

  const getPointOnWheel = useCallback((angle: number, radiusFraction: number) => {
    const center = getWheelCenter(angle);
    const r = wheelRadius * radiusFraction;
    return {
      x: center.x + r * Math.sin(angle),
      y: center.y + r * Math.cos(angle),
    };
  }, [getWheelCenter, wheelRadius]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const speed = 1.5;
    const interval = setInterval(() => {
      setTheta(prev => {
        const newTheta = prev + 0.05 * speed;
        // Add to trace if enabled
        if (showTrace && newTheta < 15) {
          const point = getPointOnWheel(newTheta, tracePointRadius);
          setTracePoints(pts => [...pts, point]);
        }
        return newTheta;
      });
      setTime(prev => prev + 0.05);
    }, 30);

    return () => clearInterval(interval);
  }, [isPlaying, showTrace, tracePointRadius, getPointOnWheel]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setTime(0);
    setIsPlaying(false);
    setTheta(0);
    setTracePoints([]);
  }, []);

  // Calculate velocity at point
  const getVelocityAtPoint = useCallback((angle: number, radiusFraction: number) => {
    // For rolling without slipping, v_cm = ω * R
    // Point velocity = v_cm + ω × r
    const omega = 1.5; // Angular velocity (rad/s)
    const vcm = omega * wheelRadius;

    // Velocity components
    const vx = vcm + omega * wheelRadius * radiusFraction * Math.cos(angle);
    const vy = -omega * wheelRadius * radiusFraction * Math.sin(angle);

    return { vx, vy, speed: Math.sqrt(vx * vx + vy * vy) };
  }, [wheelRadius]);

  const predictions = [
    { id: 'circle', label: 'A circle - it just goes around and around' },
    { id: 'straight', label: 'A straight line - it moves with the wheel' },
    { id: 'cycloid', label: 'A looping curve that touches the ground periodically' },
    { id: 'wave', label: 'A smooth wave pattern' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'The same cycloid curve' },
    { id: 'smaller', label: 'A smaller, tighter loop' },
    { id: 'curtate', label: 'A wavy curve that doesn\'t touch the ground' },
    { id: 'prolate', label: 'A curve with extended loops below the wheel' },
  ];

  const transferApplications = [
    {
      title: 'Train Wheel Paradox',
      description: 'Train wheel flanges extend below the rail surface. The bottom of the flange actually moves backward relative to the ground - faster than the train!',
      question: 'How can part of a moving train move backward?',
      answer: 'Points below the wheel\'s contact point have negative velocity relative to ground. The flange at radius r > R traces a prolate cycloid, momentarily moving backward. This doesn\'t violate physics - it\'s just reference frame geometry!',
    },
    {
      title: 'Bicycle Valve Motion',
      description: 'Watch a bicycle valve stem as the wheel rolls. It traces a cycloid, speeding up at the top and stopping at the bottom.',
      question: 'When is the valve moving fastest? When is it stationary?',
      answer: 'The valve is stationary when touching the ground (instantaneous zero velocity). It\'s fastest at the top, moving at 2× the bike\'s speed! This is why the top of a rolling wheel appears blurred in photos while the bottom is sharp.',
    },
    {
      title: 'Tautochrone Problem',
      description: 'Galileo noticed pendulums aren\'t perfectly isochronous (period depends slightly on amplitude). Huygens discovered the cycloid solves this.',
      question: 'Why does a ball rolling on a cycloid take the same time regardless of starting height?',
      answer: 'The cycloid\'s curve exactly compensates for different starting positions. Higher starts have steeper initial slopes, accelerating the ball more. The math works out to equal time for all starting points - perfect isochrony.',
    },
    {
      title: 'Gear Tooth Design',
      description: 'Cycloidal gear teeth were used before involute gears. The rolling motion ensures smooth power transfer with minimal sliding friction.',
      question: 'Why do cycloidal gears produce smooth motion?',
      answer: 'Cycloidal curves arise from rolling motion. When gear teeth are shaped as cycloids, they mesh with pure rolling contact - no sliding friction. This was crucial before precision manufacturing made involute gears practical.',
    },
  ];

  const testQuestions = [
    {
      question: 'What curve does a point on a wheel\'s rim trace as it rolls without slipping?',
      options: [
        { text: 'Circle', correct: false },
        { text: 'Cycloid', correct: true },
        { text: 'Parabola', correct: false },
        { text: 'Sine wave', correct: false },
      ],
    },
    {
      question: 'What is "rolling without slipping"?',
      options: [
        { text: 'The wheel spins freely without touching ground', correct: false },
        { text: 'The contact point has zero velocity relative to ground', correct: true },
        { text: 'The wheel doesn\'t rotate at all', correct: false },
        { text: 'There is no friction between wheel and ground', correct: false },
      ],
    },
    {
      question: 'At what point on a rolling wheel is velocity momentarily zero?',
      options: [
        { text: 'At the center', correct: false },
        { text: 'At the top', correct: false },
        { text: 'At the contact point with ground', correct: true },
        { text: 'Nowhere - all points are always moving', correct: false },
      ],
    },
    {
      question: 'If a wheel\'s center moves at speed v, how fast is the top of the wheel moving?',
      options: [
        { text: 'v (same as center)', correct: false },
        { text: '2v (twice the center speed)', correct: true },
        { text: 'v/2 (half the center speed)', correct: false },
        { text: '0 (it\'s stationary)', correct: false },
      ],
    },
    {
      question: 'What is a "curtate cycloid"?',
      options: [
        { text: 'A cycloid traced by a point inside the wheel rim', correct: true },
        { text: 'A cycloid traced by a point outside the wheel', correct: false },
        { text: 'A cycloid traced very slowly', correct: false },
        { text: 'A cycloid traced on a curved surface', correct: false },
      ],
    },
    {
      question: 'Why does a cycloid have a "cusp" (pointed corner) at the bottom?',
      options: [
        { text: 'The wheel bounces at this point', correct: false },
        { text: 'The tracing point has zero velocity here', correct: true },
        { text: 'Friction creates a sharp corner', correct: false },
        { text: 'It\'s an optical illusion', correct: false },
      ],
    },
    {
      question: 'For a wheel of radius R moving with angular velocity ω, what is v_center?',
      options: [
        { text: 'ωR', correct: true },
        { text: 'ω/R', correct: false },
        { text: '2ωR', correct: false },
        { text: 'ω + R', correct: false },
      ],
    },
    {
      question: 'The brachistochrone (fastest descent path) is related to the cycloid because:',
      options: [
        { text: 'Cycloids are straight lines', correct: false },
        { text: 'An inverted cycloid minimizes travel time under gravity', correct: true },
        { text: 'Wheels naturally roll in cycloids', correct: false },
        { text: 'Cycloids conserve energy', correct: false },
      ],
    },
    {
      question: 'If you photographed a rolling bicycle wheel, which part would appear sharpest?',
      options: [
        { text: 'The top of the wheel', correct: false },
        { text: 'The hub at the center', correct: false },
        { text: 'The bottom (contact point)', correct: true },
        { text: 'All parts appear equally blurred', correct: false },
      ],
    },
    {
      question: 'What\'s the relationship between distance traveled and wheel rotation?',
      options: [
        { text: 'Distance = 2πR per rotation (circumference)', correct: true },
        { text: 'Distance = πR per rotation', correct: false },
        { text: 'Distance = R per rotation', correct: false },
        { text: 'No consistent relationship', correct: false },
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
      if (testAnswers[i] !== null && q.options[testAnswers[i]].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 500;
    const height = 380;

    const center = getWheelCenter(theta);
    const tracingPoint = getPointOnWheel(theta, tracePointRadius);
    const velocity = getVelocityAtPoint(theta, tracePointRadius);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: colors.bgDark, borderRadius: '12px', maxWidth: '550px' }}
        >
          {/* Premium defs section with gradients and filters */}
          <defs>
            {/* Background gradient */}
            <linearGradient id="cycBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="30%" stopColor="#0a0f1a" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Ground surface gradient with texture effect */}
            <linearGradient id="cycGroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="15%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="85%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Ground surface line highlight */}
            <linearGradient id="cycGroundLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#64748b" stopOpacity="0.3" />
              <stop offset="25%" stopColor="#94a3b8" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#cbd5e1" stopOpacity="1" />
              <stop offset="75%" stopColor="#94a3b8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#64748b" stopOpacity="0.3" />
            </linearGradient>

            {/* Wheel 3D gradient - radial for depth */}
            <radialGradient id="cycWheelGradient" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#2563eb" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.2" />
            </radialGradient>

            {/* Wheel rim gradient */}
            <linearGradient id="cycWheelRim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="25%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="75%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* Wheel hub gradient */}
            <radialGradient id="cycWheelHub" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e40af" />
            </radialGradient>

            {/* Spoke gradient */}
            <linearGradient id="cycSpokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.5" />
            </linearGradient>

            {/* Cycloid trace gradient */}
            <linearGradient id="cycTraceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="25%" stopColor="#34d399" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#6ee7b7" stopOpacity="0.9" />
              <stop offset="75%" stopColor="#34d399" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.5" />
            </linearGradient>

            {/* Tracing point gradient - radial glow */}
            <radialGradient id="cycPointGradient" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="40%" stopColor="#f87171" />
              <stop offset="70%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </radialGradient>

            {/* Velocity arrow gradients */}
            <linearGradient id="cycVelocityYellow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            <linearGradient id="cycVelocityGreen" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Contact indicator gradient */}
            <radialGradient id="cycContactGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#f87171" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>

            {/* Ground texture pattern */}
            <pattern id="cycGroundTexture" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" />
              <circle cx="2" cy="2" r="0.5" fill="#475569" fillOpacity="0.3" />
              <circle cx="12" cy="8" r="0.3" fill="#64748b" fillOpacity="0.2" />
              <circle cx="6" cy="15" r="0.4" fill="#475569" fillOpacity="0.25" />
              <circle cx="17" cy="12" r="0.3" fill="#64748b" fillOpacity="0.2" />
            </pattern>

            {/* Arrow markers with gradients */}
            <marker id="cycArrowYellow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="url(#cycVelocityYellow)" />
            </marker>
            <marker id="cycArrowGreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="url(#cycVelocityGreen)" />
            </marker>

            {/* Tracing point glow filter */}
            <filter id="cycPointGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#ef4444" floodOpacity="0.7" />
              <feComposite in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Wheel glow filter */}
            <filter id="cycWheelGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#3b82f6" floodOpacity="0.4" />
              <feComposite in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Trace path glow filter */}
            <filter id="cycTraceGlow" x="-10%" y="-50%" width="120%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feFlood floodColor="#10b981" floodOpacity="0.5" />
              <feComposite in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Hub glow filter */}
            <filter id="cycHubGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Contact pulse glow */}
            <filter id="cycContactPulse" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feFlood floodColor="#ef4444" floodOpacity="0.6" />
              <feComposite in2="blur" operator="in" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Premium background */}
          <rect width={width} height={height} fill="url(#cycBgGradient)" />

          {/* Subtle grid pattern for depth */}
          <pattern id="cycGrid" width="25" height="25" patternUnits="userSpaceOnUse">
            <rect width="25" height="25" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.2" />
          </pattern>
          <rect width={width} height={groundY} fill="url(#cycGrid)" />

          {/* Ground with texture */}
          <rect x={0} y={groundY} width={width} height={80} fill="url(#cycGroundGradient)" />
          <rect x={0} y={groundY} width={width} height={80} fill="url(#cycGroundTexture)" />

          {/* Ground surface highlight line */}
          <line x1={0} y1={groundY} x2={width} y2={groundY} stroke="url(#cycGroundLine)" strokeWidth={3} />
          <line x1={0} y1={groundY + 1} x2={width} y2={groundY + 1} stroke="#1e293b" strokeWidth={1} />

          {/* Trace path with gradient and glow */}
          {showTrace && tracePoints.length > 1 && (
            <path
              d={`M ${tracePoints[0].x} ${tracePoints[0].y} ${tracePoints.map(p => `L ${p.x} ${p.y}`).join(' ')}`}
              fill="none"
              stroke="url(#cycTraceGradient)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#cycTraceGlow)"
            />
          )}

          {/* Static cycloid preview (if not playing) */}
          {!isPlaying && theta === 0 && (
            <path
              d={Array.from({ length: 100 }, (_, i) => {
                const t = (i / 100) * 4 * Math.PI;
                const x = startX + wheelRadius * (t - Math.sin(t) * tracePointRadius);
                const y = groundY - wheelRadius * (1 - Math.cos(t) * tracePointRadius);
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke={colors.cycloid}
              strokeWidth={1.5}
              strokeDasharray="6,4"
              opacity={0.5}
            />
          )}

          {/* Wheel outer glow */}
          <circle
            cx={center.x}
            cy={center.y}
            r={wheelRadius + 2}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={1}
            opacity={0.3}
            filter="url(#cycWheelGlow)"
          />

          {/* Wheel with 3D gradient fill */}
          <circle
            cx={center.x}
            cy={center.y}
            r={wheelRadius}
            fill="url(#cycWheelGradient)"
            stroke="url(#cycWheelRim)"
            strokeWidth={4}
          />

          {/* Wheel inner ring for depth */}
          <circle
            cx={center.x}
            cy={center.y}
            r={wheelRadius - 5}
            fill="none"
            stroke="#60a5fa"
            strokeWidth={1}
            opacity={0.3}
          />

          {/* Wheel spokes with gradient */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const spokeAngle = theta + (i * Math.PI) / 3;
            return (
              <line
                key={i}
                x1={center.x}
                y1={center.y}
                x2={center.x + wheelRadius * Math.sin(spokeAngle)}
                y2={center.y + wheelRadius * Math.cos(spokeAngle)}
                stroke="url(#cycSpokeGradient)"
                strokeWidth={3}
                strokeLinecap="round"
              />
            );
          })}

          {/* Center hub with gradient and glow */}
          <circle
            cx={center.x}
            cy={center.y}
            r={8}
            fill="url(#cycWheelHub)"
            filter="url(#cycHubGlow)"
          />
          <circle
            cx={center.x}
            cy={center.y}
            r={4}
            fill="#93c5fd"
          />

          {/* Tracing point with premium glow */}
          <circle
            cx={tracingPoint.x}
            cy={tracingPoint.y}
            r={10}
            fill="url(#cycPointGradient)"
            filter="url(#cycPointGlow)"
          />
          {/* Inner highlight on tracing point */}
          <circle
            cx={tracingPoint.x - 2}
            cy={tracingPoint.y - 2}
            r={3}
            fill="#fecaca"
            opacity={0.6}
          />

          {/* Velocity vectors with gradients */}
          {showVelocityVectors && (
            <g>
              {/* Center velocity */}
              <line
                x1={center.x}
                y1={center.y}
                x2={center.x + 35}
                y2={center.y}
                stroke="url(#cycVelocityYellow)"
                strokeWidth={3}
                strokeLinecap="round"
                markerEnd="url(#cycArrowYellow)"
              />

              {/* Point velocity */}
              <line
                x1={tracingPoint.x}
                y1={tracingPoint.y}
                x2={tracingPoint.x + velocity.vx / 3}
                y2={tracingPoint.y + velocity.vy / 3}
                stroke="url(#cycVelocityGreen)"
                strokeWidth={3}
                strokeLinecap="round"
                markerEnd="url(#cycArrowGreen)"
              />
            </g>
          )}

          {/* Ground contact indicator with pulse effect */}
          {tracePointRadius === 1 && Math.abs(Math.cos(theta) - 1) < 0.1 && (
            <g>
              <circle
                cx={tracingPoint.x}
                cy={groundY}
                r={15}
                fill="url(#cycContactGlow)"
                filter="url(#cycContactPulse)"
              />
              <circle
                cx={tracingPoint.x}
                cy={groundY}
                r={12}
                fill="none"
                stroke="#f87171"
                strokeWidth={2}
                opacity={0.7}
              />
            </g>
          )}
        </svg>

        {/* Legend moved outside SVG using typo system */}
        <div style={{
          display: 'flex',
          gap: isMobile ? '12px' : '20px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          padding: '8px 16px',
          background: 'rgba(30, 41, 59, 0.6)',
          borderRadius: '8px',
          maxWidth: '500px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #60a5fa, #2563eb)'
            }} />
            <span style={{ fontSize: typo.small, color: colors.textMuted }}>Wheel center</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f87171, #dc2626)',
              boxShadow: '0 0 6px rgba(239, 68, 68, 0.5)'
            }} />
            <span style={{ fontSize: typo.small, color: colors.textMuted }}>Tracing point</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '16px',
              height: '3px',
              borderRadius: '2px',
              background: 'linear-gradient(90deg, #10b981, #6ee7b7, #10b981)'
            }} />
            <span style={{ fontSize: typo.small, color: colors.textMuted }}>Cycloid path</span>
          </div>
        </div>

        {/* Speed display moved outside SVG */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          padding: '6px 12px',
          background: 'rgba(6, 182, 212, 0.1)',
          borderRadius: '6px',
          border: '1px solid rgba(6, 182, 212, 0.2)'
        }}>
          <span style={{ fontSize: typo.body, color: colors.textSecondary }}>
            Point speed: <strong style={{ color: colors.accent }}>{velocity.speed.toFixed(1)}</strong> units
          </span>
          <span style={{ fontSize: typo.label, color: colors.textMuted }}>
            (Center = 1.0 unit)
          </span>
        </div>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isPlaying
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: isPlaying
                  ? '0 4px 15px rgba(239, 68, 68, 0.3)'
                  : '0 4px 15px rgba(16, 185, 129, 0.3)',
              }}
            >
              {isPlaying ? 'Pause' : 'Roll'}
            </button>
            <button
              onClick={resetSimulation}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'rgba(6, 182, 212, 0.1)',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
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
          Tracing Point Position: {tracePointRadius === 1 ? 'Rim' : tracePointRadius === 0.5 ? 'Midpoint' : 'Center'}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={tracePointRadius}
          onChange={(e) => {
            setTracePointRadius(parseFloat(e.target.value));
            resetSimulation();
          }}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.textMuted }}>
          <span>Center (no loop)</span>
          <span>Rim (full cycloid)</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <label style={{ color: colors.textSecondary }}>
          <input
            type="checkbox"
            checked={showTrace}
            onChange={(e) => setShowTrace(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Show trace
        </label>
        <label style={{ color: colors.textSecondary }}>
          <input
            type="checkbox"
            checked={showVelocityVectors}
            onChange={(e) => setShowVelocityVectors(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Show velocity
        </label>
      </div>

      <div style={{
        background: 'rgba(6, 182, 212, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          {tracePointRadius === 1 && 'Rim point traces a true cycloid with cusps.'}
          {tracePointRadius > 0 && tracePointRadius < 1 && 'Inner point traces a curtate cycloid (wavy, no cusps).'}
          {tracePointRadius === 0 && 'Center traces a straight line (no curve).'}
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
      borderTop: `1px solid rgba(255,255,255,0.1)`,
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
              ⚙️ The Dancing Point
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              What path does a point on a rolling wheel actually trace?
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
                When a wheel rolls, its center moves in a straight line. But a point on the rim?
                It dances through the air, tracing one of mathematics' most beautiful curves.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This curve - the cycloid - has fascinated mathematicians for 400 years.
              </p>
            </div>

            <div style={{
              background: 'rgba(6, 182, 212, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                💡 Watch the red point as the wheel rolls!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction →')}
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
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>📋 What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A wheel with a red point marked on its rim. The wheel will roll along the ground
              without slipping (no skidding). The green dashed line shows a preview of the path.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              🤔 What shape does the red point trace as the wheel rolls?
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
                    background: prediction === p.id ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
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
        {renderBottomBar(true, !!prediction, 'Test My Prediction →')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore the Cycloid</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Watch how different points on the wheel trace different curves
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
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>🔬 Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Rim point (1.0) - true cycloid with cusps</li>
              <li>Midpoint (0.5) - curtate cycloid (wavy)</li>
              <li>Center (0.0) - straight line!</li>
              <li>Enable velocity to see speed changes</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review →')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'cycloid';

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
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              The point traces a cycloid - a looping curve that touches the ground at regular intervals!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🎓 Understanding Rolling Without Slipping</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>The Constraint:</strong> For rolling without
                slipping, the contact point has zero velocity relative to the ground. The wheel doesn't
                skid - it "grips" the surface.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Velocity Distribution:</strong> The bottom
                of the wheel is momentarily stationary, while the top moves at 2× the center's speed.
                This creates the characteristic looping path.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>The Cusp:</strong> When the rim point touches
                the ground, it has zero velocity - creating a sharp "cusp" in the curve. This is unique
                to the true cycloid!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist! →')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>🔄 The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if we track a point inside the wheel, not on the rim?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>📋 The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Imagine moving the red point inward - halfway between the rim and the center.
              This point still rotates with the wheel but at a smaller radius.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              🤔 What curve does an interior point trace?
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
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction →')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Point Position</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Move the tracing point to different radii
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
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>💡 Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Interior points never touch the ground, so they trace smooth waves (curtate cycloid)
              instead of curves with cusps. Only the rim creates the true cycloid!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation →')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'curtate';

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
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Interior points trace a "curtate cycloid" - a smooth wave that never touches the ground!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>🔬 The Cycloid Family</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Cycloid:</strong> Traced by a point on
                the rim (r = R). Has cusps where velocity = 0.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Curtate Cycloid:</strong> Traced by a
                point inside (r {"<"} R). Smooth waves, never touches ground.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Prolate Cycloid:</strong> Traced by a
                point outside the wheel (like a train wheel flange, r {">"} R). Loops that dip below
                the rolling surface!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge →')}
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
              🌍 Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Cycloids appear in surprising places
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
                {transferCompleted.has(index) && (
                  <span style={{ color: colors.success }}>✓</span>
                )}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>
                {app.description}
              </p>
              <div style={{
                background: 'rgba(6, 182, 212, 0.1)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '8px',
              }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                  💭 {app.question}
                </p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.accent}`,
                    background: 'transparent',
                    color: colors.accent,
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${colors.success}`,
                }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test →')}
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
                {testScore >= 8 ? '🎉 Excellent!' : '📚 Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>
                {testScore} / 10
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered cycloid motion!' : 'Review the material and try again.'}
              </p>
            </div>

            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;

              return (
                <div
                  key={qIndex}
                  style={{
                    background: colors.bgCard,
                    margin: '16px',
                    padding: '16px',
                    borderRadius: '12px',
                    borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                  }}
                >
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>
                    {qIndex + 1}. {q.question}
                  </p>
                  {q.options.map((opt, oIndex) => (
                    <div
                      key={oIndex}
                      style={{
                        padding: '8px 12px',
                        marginBottom: '4px',
                        borderRadius: '6px',
                        background: opt.correct
                          ? 'rgba(16, 185, 129, 0.2)'
                          : userAnswer === oIndex
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'transparent',
                        color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary,
                      }}
                    >
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery →' : 'Review & Retry')}
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
              <span style={{ color: colors.textSecondary }}>
                {currentTestQuestion + 1} / {testQuestions.length}
              </span>
            </div>

            <div style={{
              display: 'flex',
              gap: '4px',
              marginBottom: '24px',
            }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: testAnswers[i] !== null
                      ? colors.accent
                      : i === currentTestQuestion
                      ? colors.textMuted
                      : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>
                {currentQ.question}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex
                      ? `2px solid ${colors.accent}`
                      : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex
                      ? 'rgba(6, 182, 212, 0.2)'
                      : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`,
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              ← Previous
            </button>

            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                }}
              >
                Submit Test
              </button>
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
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You've mastered cycloid motion and rolling without slipping
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🎓 Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Rolling without slipping constraint (v = ωR)</li>
              <li>Velocity distribution on a rolling wheel</li>
              <li>The cycloid curve and its properties</li>
              <li>Curtate and prolate cycloids</li>
              <li>Applications from trains to the brachistochrone</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(6, 182, 212, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>🚀 Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              The cycloid was called "the Helen of geometry" because of the mathematical
              feuds it inspired. It's the solution to both the brachistochrone (fastest
              descent) and tautochrone (equal time) problems - a remarkable mathematical
              coincidence that connects rolling motion to optimal paths!
            </p>
          </div>

          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game →')}
      </div>
    );
  }

  return null;
};

export default CycloidMotionRenderer;
