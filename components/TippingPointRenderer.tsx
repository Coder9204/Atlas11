import React, { useState, useEffect, useCallback } from 'react';

interface TippingPointRendererProps {
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
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  stable: '#3b82f6',
  unstable: '#ef4444',
  com: '#fbbf24',
  support: '#10b981',
};

const TippingPointRenderer: React.FC<TippingPointRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [objectHeight, setObjectHeight] = useState(150);
  const [baseWidth, setBaseWidth] = useState(60);
  const [pushHeight, setPushHeight] = useState(100);
  const [tiltAngle, setTiltAngle] = useState(0);
  const [isPushing, setIsPushing] = useState(false);
  const [hasAddedWeight, setHasAddedWeight] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Calculate critical angle: theta_c = arctan(base_width / (2 * COM_height))
  const comHeight = hasAddedWeight ? objectHeight * 0.3 : objectHeight * 0.5;
  const criticalAngle = Math.atan(baseWidth / (2 * comHeight)) * (180 / Math.PI);
  const stabilityRatio = (criticalAngle - Math.abs(tiltAngle)) / criticalAngle;
  const isTipping = Math.abs(tiltAngle) >= criticalAngle;

  // Animation for pushing
  useEffect(() => {
    if (!isPushing) return;
    const interval = setInterval(() => {
      setTiltAngle(prev => {
        const pushForce = 0.5 * (pushHeight / objectHeight);
        const restoringForce = hasAddedWeight ? 0.3 : 0.15;
        const newAngle = prev + pushForce;
        if (newAngle >= criticalAngle) {
          setIsPushing(false);
          return criticalAngle;
        }
        return newAngle;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isPushing, pushHeight, objectHeight, criticalAngle, hasAddedWeight]);

  // Restore when not pushing
  useEffect(() => {
    if (isPushing || isTipping) return;
    const interval = setInterval(() => {
      setTiltAngle(prev => {
        if (Math.abs(prev) < 0.5) return 0;
        return prev * 0.9;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isPushing, isTipping]);

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

  const predictions = [
    { id: 'short', label: 'The short bottle is easier to tip' },
    { id: 'tall', label: 'The tall bottle is easier to tip' },
    { id: 'same', label: 'Both are equally easy to tip' },
    { id: 'weight', label: 'It only depends on how heavy they are' },
  ];

  const twistPredictions = [
    { id: 'nothing', label: 'Adding weight at the bottom does nothing' },
    { id: 'worse', label: 'Adding weight makes it tip more easily' },
    { id: 'better', label: 'Adding weight significantly increases stability' },
    { id: 'height', label: 'It only helps if the object is already short' },
  ];

  const transferApplications = [
    {
      title: 'Furniture Safety',
      description: 'Tall bookshelves and dressers pose tipping hazards, especially with children climbing. Anchor straps and low center of mass design prevent accidents.',
      question: 'Why are anti-tip anchor straps required for tall furniture?',
      answer: 'Tall furniture has a high center of mass relative to its narrow base. When a child climbs, the COM shifts outward. The critical tipping angle is small, so even slight forces can cause the COM to cross the support boundary, leading to catastrophic tipping.',
    },
    {
      title: 'Vehicle Rollover',
      description: 'SUVs and trucks have higher rollover risk than sedans due to their elevated center of mass and narrower track width relative to height.',
      question: 'How do engineers reduce rollover risk in tall vehicles?',
      answer: 'They widen the wheelbase (increasing base width), place heavy components like the battery low (lowering COM), and use electronic stability control to detect and prevent conditions approaching the critical rollover angle.',
    },
    {
      title: 'Earthquake Building Design',
      description: 'Buildings in earthquake zones must resist lateral forces that try to tip them over. Base isolation and tuned mass dampers help.',
      question: 'Why do some earthquake-safe buildings have heavy bases?',
      answer: 'A heavy, wide base lowers the overall center of mass, increasing the critical angle before tipping. Combined with deep foundations that extend the support polygon into the ground, buildings can withstand larger lateral accelerations.',
    },
    {
      title: 'Sports Stances',
      description: 'Athletes in wrestling, martial arts, and football adopt wide stances and lower their center of gravity to resist being pushed over.',
      question: 'Why do athletes bend their knees and widen their stance when bracing for impact?',
      answer: 'Bending knees lowers the COM, and widening stance increases the support polygon. Both changes increase the critical tipping angle, meaning greater force is needed to move the COM outside the base of support.',
    },
  ];

  const testQuestions = [
    {
      question: 'What determines the critical tipping angle of an object?',
      options: [
        { text: 'Only the weight of the object', correct: false },
        { text: 'The ratio of base width to center of mass height', correct: true },
        { text: 'Only the height of the object', correct: false },
        { text: 'The color and material of the object', correct: false },
      ],
    },
    {
      question: 'When does an object tip over?',
      options: [
        { text: 'When any force is applied', correct: false },
        { text: 'When its weight exceeds a limit', correct: false },
        { text: 'When its center of mass moves outside the support polygon', correct: true },
        { text: 'When it starts to slide', correct: false },
      ],
    },
    {
      question: 'Comparing a tall bottle and a short bottle with the same base width:',
      options: [
        { text: 'The tall bottle has a larger critical tipping angle', correct: false },
        { text: 'The short bottle has a smaller critical tipping angle', correct: false },
        { text: 'The tall bottle tips more easily (smaller critical angle)', correct: true },
        { text: 'Both have the same critical tipping angle', correct: false },
      ],
    },
    {
      question: 'The formula for critical angle is theta = arctan(base_width / (2 x COM_height)). If you double the base width:',
      options: [
        { text: 'The critical angle doubles exactly', correct: false },
        { text: 'The critical angle increases (more stable)', correct: true },
        { text: 'The critical angle decreases (less stable)', correct: false },
        { text: 'The critical angle stays the same', correct: false },
      ],
    },
    {
      question: 'Adding weight to the bottom of an object:',
      options: [
        { text: 'Makes the object heavier and easier to tip', correct: false },
        { text: 'Lowers the center of mass, increasing the critical angle', correct: true },
        { text: 'Raises the center of mass, decreasing stability', correct: false },
        { text: 'Has no effect on tipping behavior', correct: false },
      ],
    },
    {
      question: 'Torque about the tipping edge depends on:',
      options: [
        { text: 'Force times perpendicular distance to the edge', correct: true },
        { text: 'Force divided by distance', correct: false },
        { text: 'Only the magnitude of the force', correct: false },
        { text: 'Only the height of the object', correct: false },
      ],
    },
    {
      question: 'Pushing an object higher up (near the top) compared to lower down:',
      options: [
        { text: 'Requires more force to tip it', correct: false },
        { text: 'Requires less force to tip it due to greater torque arm', correct: true },
        { text: 'Has no effect on tipping', correct: false },
        { text: 'Only affects sliding, not tipping', correct: false },
      ],
    },
    {
      question: 'A support polygon is:',
      options: [
        { text: 'The shape of the object when viewed from above', correct: false },
        { text: 'The area enclosed by the contact points with the ground', correct: true },
        { text: 'The weight distribution of the object', correct: false },
        { text: 'The shadow cast by the object', correct: false },
      ],
    },
    {
      question: 'Why do SUVs have higher rollover risk than sedans?',
      options: [
        { text: 'They are heavier', correct: false },
        { text: 'They have a higher center of mass relative to their track width', correct: true },
        { text: 'They have wider tires', correct: false },
        { text: 'They accelerate faster', correct: false },
      ],
    },
    {
      question: 'An athlete crouching in a wide stance is more stable because:',
      options: [
        { text: 'They become heavier', correct: false },
        { text: 'Their muscles work harder', correct: false },
        { text: 'Lower COM and wider base increase the critical tipping angle', correct: true },
        { text: 'Air resistance is reduced', correct: false },
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
  };

  const renderVisualization = (interactive: boolean, showTwist: boolean = false) => {
    const width = 500;
    const height = 400;
    const groundY = height - 60;
    const centerX = width / 2;

    // Calculate object position with tilt
    const tiltRad = (tiltAngle * Math.PI) / 180;
    const pivotX = centerX + (tiltAngle >= 0 ? baseWidth / 2 : -baseWidth / 2);
    const pivotY = groundY;

    // Calculate COM position (world coordinates)
    const localComX = 0;
    const localComY = -comHeight;
    const rotatedComX = localComX * Math.cos(tiltRad) - localComY * Math.sin(tiltRad);
    const rotatedComY = localComX * Math.sin(tiltRad) + localComY * Math.cos(tiltRad);
    const worldComX = pivotX + rotatedComX;
    const worldComY = pivotY + rotatedComY;

    // Check if COM is over support
    const comOverSupport = worldComX >= centerX - baseWidth / 2 && worldComX <= centerX + baseWidth / 2;

    // Tipping meter calculation
    const meterWidth = 220;
    const meterX = (width - meterWidth) / 2;
    const meterY = 20;
    const meterFill = Math.min(100, (Math.abs(tiltAngle) / criticalAngle) * 100);

    // Stability zone visualization
    const stabilityZoneRadius = 50;
    const stabilityAngleRad = criticalAngle * Math.PI / 180;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '16px', maxWidth: '550px' }}
        >
          {/* === COMPREHENSIVE DEFS SECTION === */}
          <defs>
            {/* Premium background gradient */}
            <linearGradient id="tippBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="25%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Ground surface gradient with depth */}
            <linearGradient id="tippGroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="20%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="80%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Stable object gradient (blue tones) */}
            <linearGradient id="tippObjectStable" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="25%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="75%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            {/* Unstable object gradient (red tones) */}
            <linearGradient id="tippObjectUnstable" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="25%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="75%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            {/* Object side shadow gradient */}
            <linearGradient id="tippObjectShadow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(0,0,0,0.4)" />
              <stop offset="50%" stopColor="rgba(0,0,0,0.1)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </linearGradient>

            {/* Weight block gradient (gold/amber) */}
            <linearGradient id="tippWeightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="30%" stopColor="#fbbf24" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Support base gradient (green) */}
            <linearGradient id="tippSupportGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="40%" stopColor="#10b981" />
              <stop offset="70%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            {/* Stability meter gradient */}
            <linearGradient id="tippMeterBg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Meter fill stable (green to yellow) */}
            <linearGradient id="tippMeterStable" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#84cc16" />
            </linearGradient>

            {/* Meter fill warning (yellow to orange) */}
            <linearGradient id="tippMeterWarning" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#eab308" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>

            {/* Meter fill danger (orange to red) */}
            <linearGradient id="tippMeterDanger" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* Center of mass radial glow */}
            <radialGradient id="tippComGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
              <stop offset="30%" stopColor="#fcd34d" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>

            {/* COM inner glow */}
            <radialGradient id="tippComInner" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fef9c3" />
              <stop offset="50%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#eab308" />
            </radialGradient>

            {/* Push force arrow gradient */}
            <linearGradient id="tippForceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.3" />
              <stop offset="40%" stopColor="#f87171" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#ef4444" stopOpacity="1" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="1" />
            </linearGradient>

            {/* Stability zone gradient */}
            <radialGradient id="tippStabilityZone" cx="50%" cy="100%" r="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>

            {/* Danger zone gradient */}
            <radialGradient id="tippDangerZone" cx="50%" cy="100%" r="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="60%" stopColor="#ef4444" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>

            {/* Angle arc gradient */}
            <linearGradient id="tippAngleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>

            {/* COM glow filter */}
            <filter id="tippComGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Object shadow filter */}
            <filter id="tippObjectShadowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="4" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.4" />
            </filter>

            {/* Support base glow filter */}
            <filter id="tippSupportGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Weight glow filter */}
            <filter id="tippWeightGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Force arrow glow */}
            <filter id="tippForceGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Text glow filter */}
            <filter id="tippTextGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arrow marker for force */}
            <marker id="tippArrowhead" markerWidth="12" markerHeight="9" refX="0" refY="4.5" orient="auto">
              <polygon points="0 0, 12 4.5, 0 9" fill="url(#tippForceGradient)" />
            </marker>

            {/* Grid pattern */}
            <pattern id="tippGridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* === PREMIUM BACKGROUND === */}
          <rect width={width} height={height} fill="url(#tippBgGradient)" />
          <rect width={width} height={height} fill="url(#tippGridPattern)" />

          {/* === STABILITY METER === */}
          <g>
            {/* Meter background with premium styling */}
            <rect
              x={meterX - 5}
              y={meterY - 5}
              width={meterWidth + 10}
              height={30}
              rx={15}
              fill="#0f172a"
              stroke="#475569"
              strokeWidth={1}
            />
            <rect
              x={meterX}
              y={meterY}
              width={meterWidth}
              height={20}
              rx={10}
              fill="url(#tippMeterBg)"
            />

            {/* Meter fill with dynamic gradient */}
            <rect
              x={meterX}
              y={meterY}
              width={meterWidth * meterFill / 100}
              height={20}
              rx={10}
              fill={meterFill < 50 ? 'url(#tippMeterStable)' : meterFill < 80 ? 'url(#tippMeterWarning)' : 'url(#tippMeterDanger)'}
            />

            {/* Meter text */}
            <text
              x={meterX + meterWidth / 2}
              y={meterY + 14}
              textAnchor="middle"
              fill="#f8fafc"
              fontSize={11}
              fontWeight="bold"
              filter="url(#tippTextGlow)"
            >
              Tipping Risk: {meterFill.toFixed(0)}%
            </text>

            {/* Labels */}
            <text x={meterX - 10} y={meterY + 14} textAnchor="end" fill="#10b981" fontSize={10} fontWeight="600">STABLE</text>
            <text x={meterX + meterWidth + 10} y={meterY + 14} textAnchor="start" fill="#ef4444" fontSize={10} fontWeight="600">TIP!</text>
          </g>

          {/* === GROUND SURFACE === */}
          <rect x={0} y={groundY} width={width} height={height - groundY} fill="url(#tippGroundGradient)" />
          <line x1={0} y1={groundY} x2={width} y2={groundY} stroke="#64748b" strokeWidth={2} />

          {/* === SUPPORT BASE WITH GLOW === */}
          <g filter="url(#tippSupportGlowFilter)">
            <rect
              x={centerX - baseWidth / 2}
              y={groundY}
              width={baseWidth}
              height={8}
              rx={2}
              fill="url(#tippSupportGradient)"
            />
          </g>
          <text
            x={centerX}
            y={groundY + 25}
            textAnchor="middle"
            fill="#10b981"
            fontSize={11}
            fontWeight="600"
            filter="url(#tippTextGlow)"
          >
            Support Base ({baseWidth}px)
          </text>

          {/* === STABILITY ZONE VISUALIZATION === */}
          <g opacity={0.6}>
            {/* Safe zone arc */}
            <path
              d={`M ${centerX + baseWidth / 2} ${groundY}
                  L ${centerX + baseWidth / 2 + stabilityZoneRadius} ${groundY}
                  A ${stabilityZoneRadius} ${stabilityZoneRadius} 0 0 0 ${centerX + baseWidth / 2 + stabilityZoneRadius * Math.cos(stabilityAngleRad)} ${groundY - stabilityZoneRadius * Math.sin(stabilityAngleRad)}
                  Z`}
              fill="url(#tippStabilityZone)"
            />
            {/* Danger zone arc */}
            <path
              d={`M ${centerX + baseWidth / 2 + stabilityZoneRadius * Math.cos(stabilityAngleRad)} ${groundY - stabilityZoneRadius * Math.sin(stabilityAngleRad)}
                  A ${stabilityZoneRadius} ${stabilityZoneRadius} 0 0 0 ${centerX + baseWidth / 2} ${groundY - stabilityZoneRadius}
                  L ${centerX + baseWidth / 2} ${groundY}
                  Z`}
              fill="url(#tippDangerZone)"
            />
          </g>

          {/* === TIPPING OBJECT (DOMINO/BOX) === */}
          <g transform={`rotate(${tiltAngle}, ${pivotX}, ${pivotY})`} filter="url(#tippObjectShadowFilter)">
            {/* Main body with premium gradient */}
            <rect
              x={pivotX - baseWidth / 2}
              y={pivotY - objectHeight}
              width={baseWidth}
              height={objectHeight}
              fill={isTipping ? 'url(#tippObjectUnstable)' : 'url(#tippObjectStable)'}
              stroke={isTipping ? '#991b1b' : '#1d4ed8'}
              strokeWidth={2}
              rx={6}
            />

            {/* 3D effect - side highlight */}
            <rect
              x={pivotX - baseWidth / 2 + 3}
              y={pivotY - objectHeight + 3}
              width={6}
              height={objectHeight - 6}
              fill="rgba(255,255,255,0.15)"
              rx={2}
            />

            {/* Top edge highlight */}
            <rect
              x={pivotX - baseWidth / 2 + 3}
              y={pivotY - objectHeight + 3}
              width={baseWidth - 6}
              height={4}
              fill="rgba(255,255,255,0.2)"
              rx={2}
            />

            {/* Object label */}
            <text
              x={pivotX}
              y={pivotY - objectHeight / 2}
              textAnchor="middle"
              fill="#f8fafc"
              fontSize={12}
              fontWeight="bold"
              transform={`rotate(${-tiltAngle}, ${pivotX}, ${pivotY - objectHeight / 2})`}
            >
              {objectHeight}px
            </text>

            {/* === ADDED WEIGHT AT BOTTOM (TWIST) === */}
            {(showTwist || hasAddedWeight) && (
              <g filter="url(#tippWeightGlowFilter)">
                <rect
                  x={pivotX - baseWidth / 2 + 5}
                  y={pivotY - 28}
                  width={baseWidth - 10}
                  height={24}
                  fill="url(#tippWeightGradient)"
                  stroke="#b45309"
                  strokeWidth={2}
                  rx={4}
                />
                {/* Weight texture lines */}
                <line
                  x1={pivotX - baseWidth / 2 + 10}
                  y1={pivotY - 20}
                  x2={pivotX + baseWidth / 2 - 10}
                  y2={pivotY - 20}
                  stroke="#92400e"
                  strokeWidth={1}
                  strokeOpacity={0.5}
                />
                <line
                  x1={pivotX - baseWidth / 2 + 10}
                  y1={pivotY - 12}
                  x2={pivotX + baseWidth / 2 - 10}
                  y2={pivotY - 12}
                  stroke="#92400e"
                  strokeWidth={1}
                  strokeOpacity={0.5}
                />
                <text
                  x={pivotX}
                  y={pivotY - 13}
                  textAnchor="middle"
                  fill="#78350f"
                  fontSize={9}
                  fontWeight="bold"
                >
                  WEIGHT
                </text>
              </g>
            )}

            {/* === PUSH FORCE INDICATOR === */}
            {interactive && (
              <g filter="url(#tippForceGlowFilter)">
                {/* Force application point */}
                <circle
                  cx={pivotX + baseWidth / 2 + 5}
                  cy={pivotY - pushHeight}
                  r={8}
                  fill="url(#tippForceGradient)"
                  stroke="#dc2626"
                  strokeWidth={2}
                >
                  <animate attributeName="r" values="7;9;7" dur="0.8s" repeatCount="indefinite" />
                </circle>

                {/* Force arrow */}
                <line
                  x1={pivotX + baseWidth / 2 + 45}
                  y1={pivotY - pushHeight}
                  x2={pivotX + baseWidth / 2 + 15}
                  y2={pivotY - pushHeight}
                  stroke="url(#tippForceGradient)"
                  strokeWidth={4}
                  markerEnd="url(#tippArrowhead)"
                />

                {/* Force label */}
                <text
                  x={pivotX + baseWidth / 2 + 55}
                  y={pivotY - pushHeight + 4}
                  fill="#f87171"
                  fontSize={10}
                  fontWeight="bold"
                >
                  PUSH
                </text>
              </g>
            )}
          </g>

          {/* === CENTER OF MASS MARKER === */}
          <g filter="url(#tippComGlowFilter)">
            {/* Outer glow */}
            <circle
              cx={worldComX}
              cy={worldComY}
              r={16}
              fill="url(#tippComGlow)"
            />
            {/* Main COM circle */}
            <circle
              cx={worldComX}
              cy={worldComY}
              r={12}
              fill="url(#tippComInner)"
              stroke="#b45309"
              strokeWidth={2}
            />
            {/* COM label */}
            <text
              x={worldComX}
              y={worldComY + 4}
              textAnchor="middle"
              fill="#78350f"
              fontSize={10}
              fontWeight="bold"
            >
              CM
            </text>
          </g>

          {/* === VERTICAL PROJECTION LINE FROM COM === */}
          <line
            x1={worldComX}
            y1={worldComY + 12}
            x2={worldComX}
            y2={groundY}
            stroke={comOverSupport ? '#10b981' : '#ef4444'}
            strokeWidth={2}
            strokeDasharray="6,4"
            strokeOpacity={0.8}
          />
          {/* Projection point indicator */}
          <circle
            cx={worldComX}
            cy={groundY}
            r={5}
            fill={comOverSupport ? '#10b981' : '#ef4444'}
            stroke={comOverSupport ? '#059669' : '#dc2626'}
            strokeWidth={2}
          />

          {/* === CRITICAL ANGLE INDICATOR === */}
          <g>
            {/* Angle arc */}
            <path
              d={`M ${centerX + baseWidth / 2 + 35} ${groundY}
                  A 35 35 0 0 0 ${centerX + baseWidth / 2 + 35 * Math.cos(stabilityAngleRad)} ${groundY - 35 * Math.sin(stabilityAngleRad)}`}
              fill="none"
              stroke="url(#tippAngleGradient)"
              strokeWidth={2}
              strokeDasharray="4,2"
            />
            {/* Critical angle line */}
            <line
              x1={centerX + baseWidth / 2}
              y1={groundY}
              x2={centerX + baseWidth / 2 + 50 * Math.cos(stabilityAngleRad)}
              y2={groundY - 50 * Math.sin(stabilityAngleRad)}
              stroke="#a855f7"
              strokeWidth={1.5}
              strokeDasharray="3,3"
              strokeOpacity={0.7}
            />
            {/* Angle label with background */}
            <rect
              x={centerX + baseWidth / 2 + 42}
              y={groundY - 35}
              width={50}
              height={18}
              rx={4}
              fill="#1e1b4b"
              stroke="#7c3aed"
              strokeWidth={1}
            />
            <text
              x={centerX + baseWidth / 2 + 67}
              y={groundY - 22}
              textAnchor="middle"
              fill="#c4b5fd"
              fontSize={10}
              fontWeight="bold"
            >
              {criticalAngle.toFixed(1)}deg
            </text>
          </g>

          {/* === CURRENT TILT ANGLE INDICATOR === */}
          {Math.abs(tiltAngle) > 0.5 && (
            <g>
              <path
                d={`M ${pivotX + 30} ${groundY}
                    A 30 30 0 0 0 ${pivotX + 30 * Math.cos(tiltRad)} ${groundY - 30 * Math.sin(tiltRad)}`}
                fill="none"
                stroke={isTipping ? '#ef4444' : '#3b82f6'}
                strokeWidth={2}
              />
              <text
                x={pivotX + 45}
                y={groundY - 15}
                fill={isTipping ? '#f87171' : '#60a5fa'}
                fontSize={9}
                fontWeight="bold"
              >
                {tiltAngle.toFixed(1)}deg
              </text>
            </g>
          )}

          {/* === INFO PANEL === */}
          <g>
            <rect
              x={12}
              y={55}
              width={120}
              height={90}
              rx={8}
              fill="rgba(15, 23, 42, 0.9)"
              stroke="#475569"
              strokeWidth={1}
            />
            <text x={20} y={75} fill="#94a3b8" fontSize={10}>Height:</text>
            <text x={100} y={75} fill="#f8fafc" fontSize={10} fontWeight="bold" textAnchor="end">{objectHeight}px</text>

            <text x={20} y={92} fill="#94a3b8" fontSize={10}>Base:</text>
            <text x={100} y={92} fill="#f8fafc" fontSize={10} fontWeight="bold" textAnchor="end">{baseWidth}px</text>

            <text x={20} y={109} fill="#94a3b8" fontSize={10}>COM Height:</text>
            <text x={100} y={109} fill="#fbbf24" fontSize={10} fontWeight="bold" textAnchor="end">{comHeight.toFixed(0)}px</text>

            <text x={20} y={126} fill="#94a3b8" fontSize={10}>Crit. Angle:</text>
            <text x={100} y={126} fill="#a855f7" fontSize={10} fontWeight="bold" textAnchor="end">{criticalAngle.toFixed(1)}deg</text>
          </g>

          {/* === STABILITY STATUS BADGE === */}
          <g>
            <rect
              x={width - 110}
              y={55}
              width={95}
              height={30}
              rx={15}
              fill={isTipping ? 'rgba(239, 68, 68, 0.2)' : comOverSupport ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}
              stroke={isTipping ? '#ef4444' : comOverSupport ? '#10b981' : '#f59e0b'}
              strokeWidth={2}
            />
            <text
              x={width - 62}
              y={74}
              textAnchor="middle"
              fill={isTipping ? '#f87171' : comOverSupport ? '#34d399' : '#fbbf24'}
              fontSize={11}
              fontWeight="bold"
            >
              {isTipping ? 'TIPPING!' : comOverSupport ? 'STABLE' : 'WARNING'}
            </text>
          </g>
        </svg>

        {interactive && (
          <div style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            padding: '12px',
            background: 'rgba(15, 23, 42, 0.8)',
            borderRadius: '12px',
            border: '1px solid rgba(71, 85, 105, 0.5)'
          }}>
            <button
              onMouseDown={() => setIsPushing(true)}
              onMouseUp={() => setIsPushing(false)}
              onMouseLeave={() => setIsPushing(false)}
              onTouchStart={() => setIsPushing(true)}
              onTouchEnd={() => setIsPushing(false)}
              style={{
                padding: '14px 28px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '15px',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              Hold to Push
            </button>
            <button
              onClick={() => { setTiltAngle(0); setObjectHeight(150); setBaseWidth(60); setPushHeight(100); setHasAddedWeight(false); }}
              style={{
                padding: '14px 28px',
                borderRadius: '10px',
                border: '2px solid #8b5cf6',
                background: 'rgba(139, 92, 246, 0.1)',
                color: '#a78bfa',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '15px',
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

  const renderControls = (showTwist: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Object Height: {objectHeight}px
        </label>
        <input
          type="range"
          min="80"
          max="250"
          step="10"
          value={objectHeight}
          onChange={(e) => setObjectHeight(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Base Width: {baseWidth}px
        </label>
        <input
          type="range"
          min="30"
          max="120"
          step="5"
          value={baseWidth}
          onChange={(e) => setBaseWidth(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Push Force Height: {pushHeight}px (higher = more torque)
        </label>
        <input
          type="range"
          min="20"
          max={objectHeight - 10}
          step="10"
          value={Math.min(pushHeight, objectHeight - 10)}
          onChange={(e) => setPushHeight(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {showTwist && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={hasAddedWeight}
              onChange={(e) => setHasAddedWeight(e.target.checked)}
              style={{ width: '20px', height: '20px' }}
            />
            Add weight at bottom (lowers COM)
          </label>
        </div>
      )}

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Critical Angle = arctan({baseWidth} / (2 x {comHeight.toFixed(0)})) = {criticalAngle.toFixed(1)}deg
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          {hasAddedWeight ? 'Weight at bottom lowers COM, increasing stability!' : 'Wider base or lower COM = more stable'}
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
              The Tipping Point
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Which is easier to tip: a tall bottle or a short one - why?
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
                Push a tall water bottle and a short one with the same force.
                One tips over easily while the other barely moves.
                What determines when something falls?
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The answer lies in the center of mass and the critical tipping angle.
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Hold the "Push" button to apply force. Watch the tipping meter!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction')}
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
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A rectangular object that can tilt on its base. The yellow circle (CM) marks the center of mass.
              The green line shows the support base. The dashed line drops vertically from the CM -
              if it leaves the support base, the object tips!
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Given two bottles with the same base width, which is easier to tip?
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
                    background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
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
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Tipping Physics</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust height, base width, and push height to see how stability changes
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
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Make the object very tall - see how small the critical angle becomes</li>
              <li>Widen the base - notice the increased stability</li>
              <li>Push high vs. low - higher push = more torque!</li>
              <li>Find the exact angle where tipping becomes inevitable</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'tall';

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
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              The tall bottle is easier to tip because its center of mass is higher, giving it a smaller critical tipping angle.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Tipping</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Critical Angle:</strong> An object tips when tilted beyond
                its critical angle: theta_c = arctan(base_width / (2 x COM_height)). Higher COM = smaller critical angle = less stable.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Support Polygon:</strong> The base of support is the area
                enclosed by all ground contact points. The center of mass must project vertically within this area for stability.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Torque:</strong> Pushing higher up creates more torque
                (tau = F x d) about the pivot edge, making it easier to tip the object.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if you tape coins to the bottom of the bottle?
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Imagine taping several heavy coins to the very bottom of a tall bottle.
              The total weight increases, but where is the center of mass now?
              The yellow weight at the bottom shows the added mass.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What happens to the stability when you add weight at the bottom?
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
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Bottom Weight</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Toggle the bottom weight and observe the stability change
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls(true)}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adding weight at the bottom dramatically lowers the center of mass.
              This significantly increases the critical tipping angle - a big stability jump
              from a simple modification!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'better';

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
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Adding weight at the bottom creates a dramatic stability jump by lowering the center of mass!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why Bottom Weight Works So Well</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Weighted Average:</strong> The center of mass is the
                weighted average of all mass positions. Adding mass at the bottom pulls the overall COM down significantly.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Nonlinear Effect:</strong> Because critical angle depends
                on the ratio base/COM_height, even a modest drop in COM height can dramatically increase the critical angle.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Real Applications:</strong> This is why ships have heavy
                ballast at the bottom, why sports cars have low-mounted engines, and why weighted bases on trophies and lamps
                keep them stable!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
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
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Tipping physics affects safety, vehicles, buildings, and sports
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
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Done</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}
                >
                  Reveal Answer
                </button>
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
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered tipping physics!' : 'Review the material and try again.'}
              </p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
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
              <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
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
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered tipping point physics</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Critical angle formula: theta = arctan(base / 2*COM_height)</li>
              <li>Center of mass and support polygon relationship</li>
              <li>Torque and leverage in tipping</li>
              <li>Bottom weighting for stability</li>
              <li>Real-world applications in safety and engineering</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Dynamic tipping involves inertia and angular momentum - a running person can lean further than standing still!
              Gyroscopic effects in spinning tops and bicycles add another layer of stability physics.
              The mathematics connects to rigid body dynamics and is essential in robotics and vehicle design.
            </p>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default TippingPointRenderer;
