import React, { useState, useEffect, useCallback, useRef } from 'react';

// Phase type for internal state management
type EAPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface EtchAnisotropyRendererProps {
  gamePhase?: EAPhase; // Optional for resume functionality
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
  material: '#64748b',
  mask: '#7c3aed',
  plasma: '#60a5fa',
  substrate: '#1e293b',
  etched: '#0f172a',
};

// Phase order and labels for navigation
const phaseOrder: EAPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<EAPhase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Explore',
  review: 'Review',
  twist_predict: 'Twist',
  twist_play: 'Test Twist',
  twist_review: 'Twist Review',
  transfer: 'Apply',
  test: 'Test',
  mastery: 'Mastery',
};

const EtchAnisotropyRenderer: React.FC<EtchAnisotropyRendererProps> = ({
  gamePhase,
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

  // Internal phase state management
  const [phase, setPhase] = useState<EAPhase>(() => gamePhase || 'hook');
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Sync phase with gamePhase prop when it changes (for resume)
  useEffect(() => {
    if (gamePhase && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase]);

  // Navigation functions with debouncing
  const goToPhase = useCallback((targetPhase: EAPhase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 300 || isNavigating.current) return;
    lastClickRef.current = now;
    isNavigating.current = true;
    setPhase(targetPhase);
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Simulation state
  const [etchTime, setEtchTime] = useState(0); // 0-100%
  const [isIsotropic, setIsIsotropic] = useState(true);
  const [etchRate, setEtchRate] = useState(50); // nm/s
  const [sidewallPassivation, setSidewallPassivation] = useState(50); // 0-100%
  const [isAnimating, setIsAnimating] = useState(false);
  const [showUndercut, setShowUndercut] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation effect
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setEtchTime(prev => {
        if (prev >= 100) {
          setIsAnimating(false);
          return 100;
        }
        return prev + 2;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Physics calculations for etch profiles
  const calculateEtchProfile = useCallback(() => {
    const depth = (etchTime / 100) * 100; // max 100nm depth

    // Isotropic etch: lateral etch = vertical etch
    // Anisotropic etch: lateral etch << vertical etch
    const anisotropyFactor = isIsotropic ? 1.0 : (100 - sidewallPassivation) / 100;
    const lateralEtch = depth * anisotropyFactor;

    // Undercut under mask
    const undercutAmount = lateralEtch;

    // Feature dimensions
    const maskWidth = 60; // nm
    const openingWidth = maskWidth + (2 * lateralEtch);

    // Critical dimension (CD) at bottom
    const bottomCD = maskWidth - (2 * undercutAmount * (isIsotropic ? 1 : anisotropyFactor * 0.3));

    // Sidewall angle (90 = perfectly vertical)
    const sidewallAngle = isIsotropic
      ? 45 + (45 * (1 - etchTime / 100))
      : 90 - (10 * anisotropyFactor);

    // Profile quality metrics
    const verticalityError = Math.abs(90 - sidewallAngle);
    const cdVariation = Math.abs(openingWidth - maskWidth);
    const profileQuality = 100 - verticalityError - (cdVariation / 2);

    return {
      depth,
      lateralEtch,
      undercutAmount,
      maskWidth,
      openingWidth,
      bottomCD: Math.max(0, bottomCD),
      sidewallAngle,
      verticalityError,
      cdVariation,
      profileQuality: Math.max(0, profileQuality),
      anisotropyRatio: depth > 0 ? depth / Math.max(1, lateralEtch) : Infinity,
    };
  }, [etchTime, isIsotropic, sidewallPassivation]);

  const predictions = [
    { id: 'equal', label: 'Etching dissolves material equally in all directions' },
    { id: 'directional', label: 'Some etch processes can be made directional, preserving edges' },
    { id: 'top_only', label: 'Etching only removes material from the top surface' },
    { id: 'random', label: 'Etch direction is random and cannot be controlled' },
  ];

  const twistPredictions = [
    { id: 'no_undercut', label: 'Undercut never happens in anisotropic etching' },
    { id: 'small_undercut', label: 'Some undercut still occurs but can be minimized with sidewall passivation' },
    { id: 'same_undercut', label: 'Undercut is the same regardless of etch type' },
    { id: 'more_undercut', label: 'Anisotropic etching has more undercut than isotropic' },
  ];

  const transferApplications = [
    {
      title: 'Transistor Gate Patterning',
      description: 'The transistor gate must have near-vertical sidewalls to control channel length precisely.',
      question: 'Why is anisotropic etching critical for transistor gates?',
      answer: 'The gate length determines transistor speed. Isotropic etching would undercut the mask, making the gate shorter than designed. At 5nm node, even 1nm of undercut represents a 20% variation in gate length!',
    },
    {
      title: 'Via and Contact Holes',
      description: 'Vias connect metal layers through holes in dielectric material.',
      question: 'How does etch profile affect via resistance?',
      answer: 'A tapered (isotropic) etch creates a cone-shaped via with smaller bottom area, increasing contact resistance. Anisotropic etching creates vertical vias with maximum contact area and consistent resistance.',
    },
    {
      title: 'MEMS Fabrication',
      description: 'Micro-Electro-Mechanical Systems require precise 3D structures.',
      question: 'When would isotropic etching be preferred in MEMS?',
      answer: 'Isotropic etching creates smooth, rounded profiles useful for fluid channels and release of suspended structures. The Bosch process alternates anisotropic and isotropic steps to create high-aspect-ratio structures.',
    },
    {
      title: 'Memory Cell Trenches',
      description: 'DRAM capacitors are built in deep trenches to maximize storage density.',
      question: 'How do aspect ratios challenge anisotropic etching?',
      answer: 'Deep narrow trenches (aspect ratio more than 50:1) make it hard to maintain passivation at the bottom while removing material. Ion shadowing and etch gas depletion cause profile bowing and tapered bottoms.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is "isotropic" etching?',
      options: [
        { text: 'Etching that only occurs vertically', correct: false },
        { text: 'Etching that proceeds equally in all directions', correct: true },
        { text: 'Etching that only removes the mask', correct: false },
        { text: 'Etching at very low temperatures', correct: false },
      ],
    },
    {
      question: 'What is "anisotropic" etching?',
      options: [
        { text: 'Etching that is completely random', correct: false },
        { text: 'Etching that proceeds preferentially in one direction (typically vertical)', correct: true },
        { text: 'Etching that uses only chemicals', correct: false },
        { text: 'Etching without a mask', correct: false },
      ],
    },
    {
      question: 'What causes undercut in etching?',
      options: [
        { text: 'The mask being too thick', correct: false },
        { text: 'Lateral etching beneath the mask edges', correct: true },
        { text: 'The substrate being too hard', correct: false },
        { text: 'Using too much power', correct: false },
      ],
    },
    {
      question: 'Plasma etching achieves anisotropy through:',
      options: [
        { text: 'Using colder temperatures', correct: false },
        { text: 'Directional ion bombardment and sidewall passivation', correct: true },
        { text: 'Faster etch rates', correct: false },
        { text: 'Thicker masks', correct: false },
      ],
    },
    {
      question: 'Sidewall passivation in RIE (Reactive Ion Etching) works by:',
      options: [
        { text: 'Heating the sidewalls', correct: false },
        { text: 'Depositing a protective layer that prevents lateral etching', correct: true },
        { text: 'Making the sidewalls thicker', correct: false },
        { text: 'Removing all ions from the plasma', correct: false },
      ],
    },
    {
      question: 'A sugar cube dissolving in water is an example of:',
      options: [
        { text: 'Anisotropic etching', correct: false },
        { text: 'Isotropic etching (dissolves equally from all surfaces)', correct: true },
        { text: 'Directional etching', correct: false },
        { text: 'No etching', correct: false },
      ],
    },
    {
      question: 'The aspect ratio in etching refers to:',
      options: [
        { text: 'The ratio of mask thickness to opening width', correct: false },
        { text: 'The ratio of etch depth to opening width', correct: true },
        { text: 'The ratio of horizontal to vertical etch rate', correct: false },
        { text: 'The ratio of etch time to depth', correct: false },
      ],
    },
    {
      question: 'High aspect ratio etching is challenging because:',
      options: [
        { text: 'The etch rate becomes too fast', correct: false },
        { text: 'It is harder to maintain profile and remove byproducts from deep features', correct: true },
        { text: 'The mask always fails', correct: false },
        { text: 'It requires less precise control', correct: false },
      ],
    },
    {
      question: 'The Bosch process for silicon etching:',
      options: [
        { text: 'Uses only isotropic etching', correct: false },
        { text: 'Alternates between etching and passivation steps', correct: true },
        { text: 'Is only used for wet chemistry', correct: false },
        { text: 'Cannot achieve vertical sidewalls', correct: false },
      ],
    },
    {
      question: 'For transistor fabrication, the ideal sidewall angle is:',
      options: [
        { text: '45 degrees', correct: false },
        { text: 'Close to 90 degrees (vertical)', correct: true },
        { text: '0 degrees (horizontal)', correct: false },
        { text: 'Any angle works equally well', correct: false },
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
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = (interactive: boolean, showUndercutMode: boolean = false) => {
    const width = 500;
    const height = 420;
    const result = calculateEtchProfile();

    // Scale factor for visualization
    const scale = 1.5;
    const centerX = 180;
    const surfaceY = 150;
    const maxDepth = 150;

    // Calculate etch profile points
    const maskWidth = 60;
    const halfMask = maskWidth / 2;

    // Profile path for isotropic vs anisotropic
    const generateEtchProfile = () => {
      const depth = result.depth * scale;
      const lateral = result.lateralEtch * scale;
      const undercut = result.undercutAmount * scale;

      if (etchTime === 0) {
        return `M ${centerX - halfMask},${surfaceY} L ${centerX + halfMask},${surfaceY}`;
      }

      if (isIsotropic) {
        // Isotropic: rounded profile with undercut
        return `
          M ${centerX - halfMask - undercut},${surfaceY}
          Q ${centerX - halfMask - undercut},${surfaceY + depth} ${centerX},${surfaceY + depth}
          Q ${centerX + halfMask + undercut},${surfaceY + depth} ${centerX + halfMask + undercut},${surfaceY}
        `;
      } else {
        // Anisotropic: near-vertical sidewalls with small taper
        const taper = lateral * 0.3;
        return `
          M ${centerX - halfMask - undercut * 0.1},${surfaceY}
          L ${centerX - halfMask + taper},${surfaceY + depth}
          L ${centerX + halfMask - taper},${surfaceY + depth}
          L ${centerX + halfMask + undercut * 0.1},${surfaceY}
        `;
      }
    };

    // Calculate sidewall angle for indicator
    const getSidewallPath = () => {
      if (etchTime === 0) return '';
      const depth = result.depth * scale;
      const lateral = result.lateralEtch * scale;
      const undercut = result.undercutAmount * scale;

      if (isIsotropic) {
        // For isotropic, show arc at 45 degrees
        const startX = centerX - halfMask - undercut;
        const startY = surfaceY;
        return `M ${startX},${startY} L ${startX + 15},${startY} A 15 15 0 0 1 ${startX + 10.6},${startY + 10.6}`;
      } else {
        // For anisotropic, show near-vertical angle
        const taper = lateral * 0.3;
        const startX = centerX - halfMask - undercut * 0.1;
        const startY = surfaceY;
        const angleRad = Math.atan2(depth, taper);
        const arcEndX = startX + 15 * Math.sin(angleRad);
        const arcEndY = startY + 15 * Math.cos(angleRad);
        return `M ${startX},${startY} L ${startX},${startY + 15} A 15 15 0 0 0 ${arcEndX},${arcEndY}`;
      }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        {/* Title moved outside SVG using typo system */}
        <div style={{
          textAlign: 'center',
          marginBottom: '4px',
          padding: '8px 16px',
          background: `linear-gradient(135deg, ${isIsotropic ? 'rgba(245, 158, 11, 0.2)' : 'rgba(96, 165, 250, 0.2)'} 0%, transparent 100%)`,
          borderRadius: '8px',
        }}>
          <span style={{
            color: isIsotropic ? colors.warning : colors.plasma,
            fontSize: typo.bodyLarge,
            fontWeight: 'bold'
          }}>
            {isIsotropic ? 'Isotropic Etch (Chemical)' : 'Anisotropic Etch (Plasma RIE)'}
          </span>
        </div>

        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '550px' }}
        >
          <defs>
            {/* Premium background gradient */}
            <linearGradient id="etchLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0a0f1a" />
              <stop offset="30%" stopColor="#0f172a" />
              <stop offset="70%" stopColor="#1a1a2e" />
              <stop offset="100%" stopColor="#0f0f1a" />
            </linearGradient>

            {/* Substrate material gradient - silicon wafer look */}
            <linearGradient id="etchSubstrate" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#78716c" />
              <stop offset="15%" stopColor="#64748b" />
              <stop offset="40%" stopColor="#57534e" />
              <stop offset="60%" stopColor="#64748b" />
              <stop offset="85%" stopColor="#475569" />
              <stop offset="100%" stopColor="#44403c" />
            </linearGradient>

            {/* Substrate side/depth gradient */}
            <linearGradient id="etchSubstrateDepth" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3f3f46" />
              <stop offset="50%" stopColor="#52525b" />
              <stop offset="100%" stopColor="#3f3f46" />
            </linearGradient>

            {/* Mask gradient - photoresist purple */}
            <linearGradient id="etchMask" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="30%" stopColor="#8b5cf6" />
              <stop offset="70%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>

            {/* Etched area gradient - dark void */}
            <linearGradient id="etchVoid" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#020617" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Plasma ion gradient - blue energy */}
            <radialGradient id="etchPlasmaIon" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="1" />
              <stop offset="40%" stopColor="#60a5fa" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </radialGradient>

            {/* Plasma beam gradient */}
            <linearGradient id="etchPlasmaBeam" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0" />
              <stop offset="20%" stopColor="#93c5fd" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#bfdbfe" stopOpacity="0.9" />
              <stop offset="80%" stopColor="#93c5fd" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.3" />
            </linearGradient>

            {/* Chemical etchant gradient - amber/orange */}
            <radialGradient id="etchChemical" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* Passivation layer gradient - protective coating */}
            <linearGradient id="etchPassivation" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>

            {/* Sidewall angle indicator gradient */}
            <linearGradient id="etchAngleIndicator" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
            </linearGradient>

            {/* Comparison diagram gradients */}
            <linearGradient id="etchCompSubstrate" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            <linearGradient id="etchCompMask" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>

            {/* Glow filters using feGaussianBlur + feMerge pattern */}
            <filter id="etchPlasmaGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="etchIonGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="etchChemGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="etchMaskGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="etchDepthShadow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Arrow markers with gradients */}
            <marker id="etchArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="url(#etchPlasmaBeam)" />
            </marker>
            <marker id="etchStartArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <line x1="0" y1="3" x2="6" y2="3" stroke={colors.success} strokeWidth="1" />
            </marker>
            <marker id="etchEndArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <line x1="0" y1="3" x2="6" y2="3" stroke={colors.success} strokeWidth="1" />
            </marker>

            {/* Grid pattern for lab background */}
            <pattern id="etchLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* Premium lab background */}
          <rect width={width} height={height} fill="url(#etchLabBg)" />
          <rect width={width} height={height} fill="url(#etchLabGrid)" />

          {/* Plasma/etchant effects (only during etching) */}
          {etchTime > 0 && etchTime < 100 && (
            <g>
              {!isIsotropic && (
                <>
                  {/* Plasma ion beams with glow */}
                  {[-30, -15, 0, 15, 30].map((offset, i) => (
                    <g key={i} filter="url(#etchPlasmaGlow)">
                      {/* Ion beam line */}
                      <line
                        x1={centerX + offset}
                        y1={40}
                        x2={centerX + offset}
                        y2={surfaceY - 5}
                        stroke="url(#etchPlasmaBeam)"
                        strokeWidth={3}
                        opacity={0.7}
                      />
                      {/* Animated ion particles */}
                      <circle
                        cx={centerX + offset}
                        cy={50 + ((etchTime * 2 + i * 15) % 80)}
                        r={4}
                        fill="url(#etchPlasmaIon)"
                        filter="url(#etchIonGlow)"
                      />
                      <circle
                        cx={centerX + offset}
                        cy={70 + ((etchTime * 2 + i * 15 + 40) % 80)}
                        r={3}
                        fill="url(#etchPlasmaIon)"
                        filter="url(#etchIonGlow)"
                        opacity={0.7}
                      />
                    </g>
                  ))}
                  {/* Passivation layer on sidewalls (if anisotropic and has depth) */}
                  {etchTime > 10 && !isIsotropic && (
                    <>
                      <rect
                        x={centerX - halfMask - 2}
                        y={surfaceY}
                        width={3}
                        height={result.depth * scale}
                        fill="url(#etchPassivation)"
                        opacity={sidewallPassivation / 100}
                      />
                      <rect
                        x={centerX + halfMask - 1}
                        y={surfaceY}
                        width={3}
                        height={result.depth * scale}
                        fill="url(#etchPassivation)"
                        opacity={sidewallPassivation / 100}
                      />
                    </>
                  )}
                </>
              )}
              {isIsotropic && (
                <>
                  {/* Chemical etchant particles spreading in all directions */}
                  {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => {
                    const rad = (angle * Math.PI) / 180;
                    const baseR = 25 + (etchTime / 100) * 30;
                    const r = baseR + Math.sin(etchTime / 10 + i) * 5;
                    return (
                      <circle
                        key={i}
                        cx={centerX + Math.cos(rad) * r}
                        cy={surfaceY + result.depth * scale / 2 + Math.sin(rad) * r * 0.6}
                        r={3 + Math.sin(etchTime / 5 + i) * 1.5}
                        fill="url(#etchChemical)"
                        filter="url(#etchChemGlow)"
                        opacity={0.8}
                      />
                    );
                  })}
                </>
              )}
            </g>
          )}

          {/* Substrate base layer */}
          <rect
            x={centerX - 100}
            y={surfaceY + maxDepth}
            width={200}
            height={8}
            fill="#1e1e2e"
            rx={2}
          />

          {/* Substrate material with premium gradient */}
          <rect
            x={centerX - 100}
            y={surfaceY}
            width={200}
            height={maxDepth}
            fill="url(#etchSubstrate)"
            filter="url(#etchDepthShadow)"
          />

          {/* Substrate edge highlights */}
          <line x1={centerX - 100} y1={surfaceY} x2={centerX - 100} y2={surfaceY + maxDepth} stroke="#94a3b8" strokeWidth="0.5" opacity="0.3" />
          <line x1={centerX + 100} y1={surfaceY} x2={centerX + 100} y2={surfaceY + maxDepth} stroke="#1e293b" strokeWidth="0.5" opacity="0.5" />

          {/* Etch profile (cut out from material) with gradient void */}
          <path
            d={generateEtchProfile()}
            fill="url(#etchVoid)"
            stroke={colors.accent}
            strokeWidth={1.5}
            filter="url(#etchDepthShadow)"
          />

          {/* Sidewall angle indicator */}
          {etchTime > 20 && (
            <g opacity={0.8}>
              <path
                d={getSidewallPath()}
                fill="none"
                stroke="url(#etchAngleIndicator)"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </g>
          )}

          {/* Mask with premium gradient and glow */}
          <rect
            x={centerX - 100}
            y={surfaceY - 15}
            width={100 - halfMask - 5}
            height={15}
            fill="url(#etchMask)"
            rx={2}
            filter="url(#etchMaskGlow)"
          />
          <rect
            x={centerX + halfMask + 5}
            y={surfaceY - 15}
            width={100 - halfMask - 5}
            height={15}
            fill="url(#etchMask)"
            rx={2}
            filter="url(#etchMaskGlow)"
          />

          {/* Dimension lines */}
          {etchTime > 0 && (
            <g>
              {/* Depth marker */}
              <line
                x1={centerX + 85}
                y1={surfaceY}
                x2={centerX + 85}
                y2={surfaceY + result.depth * scale}
                stroke={colors.success}
                strokeWidth={1.5}
                markerStart="url(#etchStartArrow)"
                markerEnd="url(#etchEndArrow)"
              />
              <rect
                x={centerX + 78}
                y={surfaceY + result.depth * scale / 2 - 8}
                width={36}
                height={16}
                fill="rgba(0,0,0,0.7)"
                rx={4}
              />
              <text x={centerX + 96} y={surfaceY + result.depth * scale / 2 + 4} fill={colors.success} fontSize={9} textAnchor="middle" fontWeight="bold">
                {result.depth.toFixed(0)}nm
              </text>

              {/* Undercut marker (if significant) */}
              {result.undercutAmount > 5 && (
                <>
                  <line
                    x1={centerX - halfMask}
                    y1={surfaceY + 8}
                    x2={centerX - halfMask - result.undercutAmount * scale}
                    y2={surfaceY + 8}
                    stroke={colors.error}
                    strokeWidth={1.5}
                    strokeDasharray="3,2"
                  />
                  <rect
                    x={centerX - halfMask - result.undercutAmount * scale / 2 - 25}
                    y={surfaceY + 14}
                    width={50}
                    height={14}
                    fill="rgba(239, 68, 68, 0.2)"
                    rx={3}
                  />
                  <text
                    x={centerX - halfMask - result.undercutAmount * scale / 2}
                    y={surfaceY + 25}
                    fill={colors.error}
                    fontSize={8}
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {result.undercutAmount.toFixed(0)}nm
                  </text>
                </>
              )}
            </g>
          )}

          {/* Comparison diagram with premium styling */}
          <g transform="translate(340, 30)">
            {/* Isotropic example */}
            <rect x={10} y={30} width={100} height={60} fill="url(#etchCompSubstrate)" rx={2} />
            <path d="M 30,30 Q 30,70 60,70 Q 90,70 90,30" fill="url(#etchVoid)" />
            <rect x={10} y={20} width={20} height={10} fill="url(#etchCompMask)" rx={1} />
            <rect x={90} y={20} width={20} height={10} fill="url(#etchCompMask)" rx={1} />

            {/* Anisotropic example */}
            <rect x={10} y={130} width={100} height={60} fill="url(#etchCompSubstrate)" rx={2} />
            <rect x={35} y={130} width={50} height={60} fill="url(#etchVoid)" />
            <rect x={10} y={120} width={25} height={10} fill="url(#etchCompMask)" rx={1} />
            <rect x={85} y={120} width={25} height={10} fill="url(#etchCompMask)" rx={1} />
          </g>

          {/* Metrics panel with premium styling */}
          <rect x={15} y={320} width={210} height={90} fill="rgba(0,0,0,0.7)" rx={10} stroke={colors.accent} strokeWidth={1} strokeOpacity={0.5} />
          <rect x={15} y={320} width={210} height={20} fill="rgba(249, 115, 22, 0.15)" rx={10} />

          {/* Quality indicator panel */}
          <rect x={235} y={320} width={125} height={90} fill="rgba(0,0,0,0.5)" rx={10} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
          <rect x={245} y={355} width={105} height={12} fill="rgba(255,255,255,0.08)" rx={4} />
          <rect
            x={245}
            y={355}
            width={result.profileQuality * 1.05}
            height={12}
            fill={result.profileQuality > 70 ? colors.success : result.profileQuality > 40 ? colors.warning : colors.error}
            rx={4}
          />
        </svg>

        {/* Labels moved outside SVG using typo system */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '550px',
          marginTop: '-95px',
          padding: '0 20px',
          position: 'relative',
          zIndex: 10,
        }}>
          {/* Etch Metrics */}
          <div style={{
            flex: '1 1 180px',
            minWidth: '180px',
          }}>
            <div style={{ color: colors.textSecondary, fontSize: typo.label, fontWeight: 'bold', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Etch Metrics
            </div>
            <div style={{ color: colors.textPrimary, fontSize: typo.small, marginBottom: '3px' }}>
              Depth: <span style={{ fontWeight: 'bold' }}>{result.depth.toFixed(0)} nm</span>
            </div>
            <div style={{ color: colors.textPrimary, fontSize: typo.small, marginBottom: '3px' }}>
              Lateral: <span style={{ fontWeight: 'bold' }}>{result.lateralEtch.toFixed(1)} nm</span>
            </div>
            <div style={{ color: result.sidewallAngle > 80 ? colors.success : colors.warning, fontSize: typo.small, marginBottom: '3px' }}>
              Sidewall: <span style={{ fontWeight: 'bold' }}>{result.sidewallAngle.toFixed(0)}°</span>
            </div>
            <div style={{ color: colors.accent, fontSize: typo.small }}>
              Anisotropy: <span style={{ fontWeight: 'bold' }}>{result.anisotropyRatio === Infinity ? 'Perfect' : result.anisotropyRatio.toFixed(1) + ':1'}</span>
            </div>
          </div>

          {/* Quality Indicator */}
          <div style={{
            flex: '1 1 100px',
            minWidth: '100px',
            textAlign: 'center',
          }}>
            <div style={{ color: colors.textSecondary, fontSize: typo.label, fontWeight: 'bold', marginBottom: '8px' }}>
              Profile Quality
            </div>
            <div style={{ color: colors.textPrimary, fontSize: typo.heading, fontWeight: 'bold' }}>
              {result.profileQuality.toFixed(0)}%
            </div>
            <div style={{ color: result.profileQuality > 70 ? colors.success : colors.error, fontSize: typo.small, fontWeight: 'bold' }}>
              {result.profileQuality > 70 ? 'Good Profile' : 'Poor Profile'}
            </div>
          </div>

          {/* Comparison Labels */}
          <div style={{
            flex: '1 1 100px',
            minWidth: '100px',
            textAlign: 'center',
          }}>
            <div style={{ color: colors.textSecondary, fontSize: typo.label, fontWeight: 'bold', marginBottom: '4px' }}>
              Profile Comparison
            </div>
            <div style={{ color: colors.textMuted, fontSize: typo.label, marginBottom: '2px' }}>
              Isotropic <span style={{ color: colors.error }}>(Undercut)</span>
            </div>
            <div style={{ marginTop: '50px', color: colors.textMuted, fontSize: typo.label }}>
              Anisotropic <span style={{ color: colors.success }}>(Vertical)</span>
            </div>
          </div>
        </div>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px', marginTop: '8px' }}>
            <button
              onClick={() => {
                setEtchTime(0);
                setIsAnimating(true);
              }}
              disabled={isAnimating}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.textMuted : `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: isAnimating ? 'not-allowed' : 'pointer',
                fontSize: typo.body,
                boxShadow: isAnimating ? 'none' : `0 4px 15px ${colors.success}40`,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnimating ? 'Etching...' : 'Start Etch'}
            </button>
            <button
              onClick={() => { setEtchTime(0); setIsAnimating(false); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = (showPassivation: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Etch Progress: {etchTime}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={etchTime}
          onChange={(e) => { setEtchTime(parseInt(e.target.value)); setIsAnimating(false); }}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{
          color: colors.textSecondary,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={!isIsotropic}
            onChange={(e) => setIsIsotropic(!e.target.checked)}
            style={{ width: '20px', height: '20px' }}
          />
          Use Anisotropic (Plasma RIE) Etching
        </label>
      </div>

      {showPassivation && !isIsotropic && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Sidewall Passivation: {sidewallPassivation}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={sidewallPassivation}
            onChange={(e) => setSidewallPassivation(parseInt(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      )}

      <div style={{
        background: 'rgba(249, 115, 22, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Isotropic: Etches equally in all directions (chemical etching)
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', marginTop: '4px' }}>
          Anisotropic: Etches preferentially downward (plasma + passivation)
        </div>
      </div>
    </div>
  );

  // Progress bar showing all 10 phases
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '12px 16px',
        background: 'rgba(0,0,0,0.3)',
        overflowX: 'auto',
      }}>
        {phaseOrder.map((p, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <div
              key={p}
              onClick={() => isCompleted && goToPhase(p)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: isCompleted ? 'pointer' : 'default',
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: isCompleted ? colors.success : isCurrent ? colors.accent : 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: 'white',
                fontWeight: 'bold',
                flexShrink: 0,
              }}>
                {isCompleted ? '✓' : index + 1}
              </div>
              <span style={{
                fontSize: '10px',
                color: isCurrent ? colors.accent : colors.textMuted,
                whiteSpace: 'nowrap',
                display: index < 4 || isCurrent ? 'block' : 'none',
              }}>
                {phaseLabels[p]}
              </span>
              {index < phaseOrder.length - 1 && (
                <div style={{
                  width: '12px',
                  height: '2px',
                  background: isCompleted ? colors.success : 'rgba(255,255,255,0.2)',
                  flexShrink: 0,
                }} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Bottom bar with Back/Next navigation
  const renderBottomBar = (canProceed: boolean, nextLabel: string = 'Next') => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        background: colors.bgDark,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        zIndex: 1000,
      }}>
        <button
          onClick={goBack}
          disabled={isFirst}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${colors.textMuted}`,
            background: 'transparent',
            color: isFirst ? colors.textMuted : colors.textPrimary,
            fontWeight: 'bold',
            cursor: isFirst ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: isFirst ? 0.5 : 1,
          }}
        >
          Back
        </button>
        <button
          onClick={goNext}
          disabled={!canProceed || isLast}
          style={{
            padding: '12px 32px',
            borderRadius: '8px',
            border: 'none',
            background: canProceed && !isLast ? colors.accent : 'rgba(255,255,255,0.1)',
            color: canProceed && !isLast ? 'white' : colors.textMuted,
            fontWeight: 'bold',
            cursor: canProceed && !isLast ? 'pointer' : 'not-allowed',
            fontSize: '16px',
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  // Wrapper for consistent layout
  const renderWrapper = (content: React.ReactNode, canProceed: boolean, nextLabel: string = 'Next') => (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
        {content}
      </div>
      {renderBottomBar(canProceed, nextLabel)}
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return renderWrapper(
      <>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
            Etch Anisotropy
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
            If you "etch" material, will it dissolve equally in all directions?
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
              Think of dissolving a sugar cube in water - it dissolves from all surfaces equally.
              But what if you wanted to carve a precise vertical trench? Dissolving would
              create a rounded bowl, not a sharp-edged feature!
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
              Chip manufacturing requires etching precise patterns. How can we control the etch direction?
            </p>
          </div>

          <div style={{
            background: 'rgba(249, 115, 22, 0.2)',
            padding: '16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
              Compare isotropic and anisotropic etching to see the difference!
            </p>
          </div>
        </div>
      </>,
      true,
      'Make a Prediction'
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return renderWrapper(
      <>
        {renderVisualization(false)}

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '16px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Etching in Chip Manufacturing:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
            A mask protects some areas while others are exposed to etchant. The pattern transfers
            from mask to material. But if etching is like dissolving, the material would undercut
            the mask edges and lose the precise pattern shape.
          </p>
        </div>

        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
            Can etching be controlled to preserve feature edges?
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
                  background: prediction === p.id ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </>,
      !!prediction,
      'Test My Prediction'
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return renderWrapper(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Etch Profiles</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            Compare isotropic and anisotropic etching behavior
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
          <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Experiments to Try:</h4>
          <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
            <li>Run isotropic etch to 100% - observe the profile shape</li>
            <li>Reset and switch to anisotropic - compare the result</li>
            <li>Notice the undercut amount in each case</li>
            <li>Compare sidewall angles between the two methods</li>
          </ul>
        </div>
      </>,
      true,
      'Continue to Review'
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'directional';

    return renderWrapper(
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
            Plasma etching can be made highly directional (anisotropic) by combining directional
            ion bombardment with sidewall passivation chemistry. This preserves precise feature edges!
          </p>
        </div>

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Etch Anisotropy</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Isotropic Etching:</strong> Chemical
              etching (wet or vapor) proceeds equally in all directions. The etch rate depends
              only on the chemistry, not direction. This creates rounded profiles with undercut.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Anisotropic Etching:</strong> Plasma
              (dry) etching uses energetic ions accelerated perpendicular to the surface. These
              ions enhance the etch rate in the vertical direction only.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Sidewall Passivation:</strong> Special
              gases deposit a protective layer on sidewalls. Vertical ion bombardment removes this
              layer from the bottom, but it protects the sidewalls from lateral etching.
            </p>
            <p>
              <strong style={{ color: colors.textPrimary }}>Result:</strong> Near-vertical sidewalls
              with anisotropy ratios of 20:1 or better - essential for nanometer-scale features!
            </p>
          </div>
        </div>
      </>,
      true,
      'Next: A Twist!'
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return renderWrapper(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
          <p style={{ color: colors.textSecondary }}>
            What about undercut in anisotropic etching?
          </p>
        </div>

        {renderVisualization(false, true)}

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '16px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Undercut Challenge:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
            Even with plasma etching, some undercut can occur. Sidewall passivation is not perfect -
            if the passivation layer is too thin, some lateral etching happens. If it is too thick,
            the etch may not reach the bottom properly.
          </p>
        </div>

        <div style={{ padding: '0 16px 16px 16px' }}>
          <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
            How does undercut behave in anisotropic etching?
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
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </>,
      !!twistPrediction,
      'Test My Prediction'
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return renderWrapper(
      <>
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Sidewall Passivation</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            Adjust passivation strength and observe undercut behavior
          </p>
        </div>

        {renderVisualization(true, true)}
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
            Increasing sidewall passivation reduces undercut but can cause other issues like
            grass formation or residue buildup. The optimal process balances vertical profile
            with clean, complete etching. This is why etch recipe development is critical!
          </p>
        </div>
      </>,
      true,
      'See the Explanation'
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'small_undercut';

    return renderWrapper(
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
            Even anisotropic etching has some undercut, but it can be minimized with proper
            sidewall passivation. The goal is to balance profile control with etch completion.
          </p>
        </div>

        <div style={{
          background: colors.bgCard,
          margin: '16px',
          padding: '20px',
          borderRadius: '12px',
        }}>
          <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Undercut Control Techniques</h3>
          <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Passivation Chemistry:</strong> Gases
              like CHF3, C4F8, or SiCl4 deposit protective films on sidewalls. The balance
              between etch and deposition gases controls the profile.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong style={{ color: colors.textPrimary }}>Process Cycling:</strong> The Bosch
              process alternates etch (SF6) and passivation (C4F8) steps to create highly
              vertical profiles, even in deep trenches.
            </p>
            <p>
              <strong style={{ color: colors.textPrimary }}>Ion Energy:</strong> Higher ion
              energy improves anisotropy but can damage underlying layers. Process engineers
              optimize voltage, pressure, and gas flows together.
            </p>
          </div>
        </div>
      </>,
      true,
      'Apply This Knowledge'
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return renderWrapper(
      <>
        <div style={{ padding: '16px' }}>
          <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Etch anisotropy enables precise nanofabrication
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
              {transferCompleted.has(index) && <span style={{ color: colors.success }}>Complete</span>}
            </div>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
            <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
              <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
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
                  WebkitTapHighlightColor: 'transparent',
                }}
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
      </>,
      transferCompleted.size >= 4,
      'Take the Test'
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return renderWrapper(
        <>
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
              {testScore >= 8 ? 'You understand etch anisotropy!' : 'Review the material and try again.'}
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
        </>,
        testScore >= 8,
        testScore >= 8 ? 'Complete Mastery' : 'Review & Retry'
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return renderWrapper(
      <>
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
              <button
                key={oIndex}
                onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  WebkitTapHighlightColor: 'transparent',
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
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Previous
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
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Next
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
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Submit Test
            </button>
          )}
        </div>
      </>,
      !testAnswers.includes(null),
      'Submit Test'
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return renderWrapper(
      <>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>Etch Icon</div>
          <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
          <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You understand etch anisotropy and profile control</p>
        </div>
        <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
            <li>Isotropic vs anisotropic etching mechanisms</li>
            <li>Sidewall passivation for profile control</li>
            <li>Undercut and its minimization</li>
            <li>Plasma RIE for directional etching</li>
            <li>Aspect ratio challenges in deep etching</li>
          </ul>
        </div>
        <div style={{ background: 'rgba(249, 115, 22, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
            Advanced etch technologies include atomic layer etching (ALE) for Angstrom-level control,
            cryogenic etching for extreme anisotropy, and selective etching that removes one material
            while leaving others intact. These enable 3nm transistors and 200+ layer 3D NAND!
          </p>
        </div>
        {renderVisualization(true, true)}
      </>,
      true,
      'Complete Game'
    );
  }

  return null;
};

export default EtchAnisotropyRenderer;
