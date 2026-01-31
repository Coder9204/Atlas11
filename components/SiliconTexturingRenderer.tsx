import React, { useState, useEffect, useCallback, useRef } from 'react';

// Phase type for internal state management
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface SiliconTexturingRendererProps {
  gamePhase?: Phase; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// Phase order and labels for navigation
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Compare',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  solar: '#3b82f6',
  light: '#fcd34d',
  silicon: '#475569',
};

const SiliconTexturingRenderer: React.FC<SiliconTexturingRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase state management
  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase]);

  // Navigation refs
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state
  const [surfaceType, setSurfaceType] = useState<'smooth' | 'random' | 'periodic'>('smooth');
  const [textureDepth, setTextureDepth] = useState(50);
  const [lightAngle, setLightAngle] = useState(30);
  const [isAnimating, setIsAnimating] = useState(false);
  const [rayBounces, setRayBounces] = useState<number[][]>([]);

  // Phase-specific state
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

  // Physics calculations
  const calculateAbsorption = useCallback(() => {
    // Base absorption for smooth surface
    const baseAbsorption = 0.65;

    // Texture effect: deeper texture = more light trapping
    const depthFactor = textureDepth / 100;

    // Surface type effect
    let textureMultiplier = 1.0;
    if (surfaceType === 'random') {
      textureMultiplier = 1.2 + depthFactor * 0.3; // 20-50% improvement
    } else if (surfaceType === 'periodic') {
      textureMultiplier = 1.35 + depthFactor * 0.4; // 35-75% improvement
    }

    // Angle effect: glancing angles benefit more from texturing
    const angleRad = (lightAngle * Math.PI) / 180;
    const angleFactor = 1 + (1 - Math.cos(angleRad)) * 0.3;

    // Calculate effective path length
    const pathLength = surfaceType === 'smooth' ? 1 : (1.5 + depthFactor * 1.5);

    // Number of bounces (for visualization)
    const bounces = surfaceType === 'smooth' ? 1 : Math.round(2 + depthFactor * 3);

    // Final absorption (capped at 98%)
    const absorption = Math.min(0.98, baseAbsorption * textureMultiplier * angleFactor);

    // Reflection loss
    const reflection = 1 - absorption;

    return {
      absorption: absorption * 100,
      reflection: reflection * 100,
      pathLength,
      bounces,
      efficiency: absorption * 22, // Max ~22% cell efficiency
    };
  }, [surfaceType, textureDepth, lightAngle]);

  // Generate ray paths for visualization
  useEffect(() => {
    const generateRayPaths = () => {
      const output = calculateAbsorption();
      const paths: number[][] = [];
      const numRays = 5;

      for (let i = 0; i < numRays; i++) {
        const path: number[] = [];
        const startX = 50 + i * 60;
        path.push(startX, 30); // Start point

        if (surfaceType === 'smooth') {
          // Single reflection, most light passes through
          path.push(startX + 20, 150);
          path.push(startX + 40, 30); // Reflected out
        } else {
          // Multiple bounces
          let x = startX;
          let y = 30;
          for (let bounce = 0; bounce < output.bounces; bounce++) {
            const dx = (Math.random() - 0.5) * 40;
            const dy = 40 + Math.random() * 20;
            x += dx;
            y = Math.min(200, y + dy);
            path.push(x, y);
          }
        }
        paths.push(path);
      }
      setRayBounces(paths);
    };

    generateRayPaths();
  }, [surfaceType, textureDepth, calculateAbsorption]);

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setLightAngle(prev => {
        const newVal = prev + 2;
        return newVal > 80 ? 0 : newVal;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'same', label: 'Surface texture doesn\'t matter - only material affects absorption' },
    { id: 'rough_worse', label: 'Rougher surfaces scatter light away, reducing absorption' },
    { id: 'rough_better', label: 'Rougher surfaces trap light through multiple bounces, increasing absorption' },
    { id: 'depth_only', label: 'Only the depth of the material matters, not the surface' },
  ];

  const twistPredictions = [
    { id: 'random_better', label: 'Random texturing is better because it\'s more unpredictable' },
    { id: 'periodic_better', label: 'Periodic (pyramid) texturing is better due to optimized geometry' },
    { id: 'same', label: 'Both texturing types perform equally well' },
    { id: 'smooth_best', label: 'Actually, smooth surfaces are best for solar cells' },
  ];

  const transferApplications = [
    {
      title: 'Commercial Solar Panels',
      description: 'Modern silicon solar cells use KOH etching to create pyramid textures that boost absorption from ~65% to >95%.',
      question: 'Why do solar manufacturers texture silicon wafers?',
      answer: 'Texturing creates pyramid structures that cause light to bounce multiple times before escaping. Each bounce gives another chance for absorption, dramatically reducing reflection losses and increasing cell efficiency by 2-3 absolute percentage points.',
    },
    {
      title: 'Stealth Aircraft',
      description: 'Stealth planes use surface texturing and coatings to scatter radar waves instead of reflecting them back.',
      question: 'How does surface texturing help stealth technology?',
      answer: 'Similar to solar cells, textured surfaces scatter incoming radar waves in many directions instead of reflecting them directly back to the radar source. This reduces the radar cross-section and makes the aircraft harder to detect.',
    },
    {
      title: 'Anti-Glare Screens',
      description: 'Matte screen coatings use microscopic texturing to diffuse reflections and reduce eye strain.',
      question: 'How do matte displays reduce glare?',
      answer: 'Matte coatings have tiny textured surfaces that scatter reflected light in many directions (diffuse reflection) instead of a single direction (specular reflection). This prevents bright spots from light sources while letting display light through.',
    },
    {
      title: 'Black Silicon',
      description: 'Laser or plasma etching creates nano-scale spikes that make silicon appear completely black.',
      question: 'Why does "black silicon" absorb nearly 100% of light?',
      answer: 'Black silicon has nano-scale needle structures that trap light through extreme multiple reflections. Light bounces so many times between the needles that virtually none escapes, achieving >99% absorption across the visible spectrum.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is the primary benefit of texturing a silicon solar cell surface?',
      options: [
        { text: 'It makes the cell look more attractive', correct: false },
        { text: 'It increases light absorption by reducing reflection losses', correct: true },
        { text: 'It increases the cell\'s voltage', correct: false },
        { text: 'It makes the cell more resistant to damage', correct: false },
      ],
    },
    {
      question: 'How does a textured surface "trap" light?',
      options: [
        { text: 'It chemically bonds with photons', correct: false },
        { text: 'It creates electric fields that attract light', correct: false },
        { text: 'Light bounces multiple times, getting more chances to be absorbed', correct: true },
        { text: 'It slows down light to increase absorption time', correct: false },
      ],
    },
    {
      question: 'What happens to light hitting a smooth silicon surface at a shallow angle?',
      options: [
        { text: 'It is completely absorbed', correct: false },
        { text: 'Most of it reflects away (specular reflection)', correct: true },
        { text: 'It travels along the surface', correct: false },
        { text: 'It converts directly to electricity', correct: false },
      ],
    },
    {
      question: 'Why are pyramid-shaped textures particularly effective?',
      options: [
        { text: 'Pyramids are the cheapest shape to manufacture', correct: false },
        { text: 'The angled facets direct reflected light back into the material', correct: true },
        { text: 'Pyramids generate their own electricity', correct: false },
        { text: 'They increase the silicon\'s bandgap', correct: false },
      ],
    },
    {
      question: 'The "effective path length" of light in a textured cell refers to:',
      options: [
        { text: 'The thickness of the silicon wafer', correct: false },
        { text: 'The average distance light travels before escaping or being absorbed', correct: true },
        { text: 'The wavelength of the light', correct: false },
        { text: 'The distance from sun to cell', correct: false },
      ],
    },
    {
      question: 'How much can texturing improve a silicon cell\'s absorption?',
      options: [
        { text: 'Only about 1-2%', correct: false },
        { text: 'From ~65% to over 95% (30+ percentage points)', correct: true },
        { text: 'It actually decreases absorption', correct: false },
        { text: 'Texturing has no measurable effect', correct: false },
      ],
    },
    {
      question: 'What is "black silicon"?',
      options: [
        { text: 'Silicon painted with black dye', correct: false },
        { text: 'Silicon with nano-scale texturing that absorbs nearly all light', correct: true },
        { text: 'A different element that looks like silicon', correct: false },
        { text: 'Silicon heated to very high temperatures', correct: false },
      ],
    },
    {
      question: 'Random texturing vs. periodic pyramid texturing:',
      options: [
        { text: 'Random is always better', correct: false },
        { text: 'Both are equally effective', correct: false },
        { text: 'Periodic pyramids typically achieve better light trapping', correct: true },
        { text: 'Neither affects cell performance', correct: false },
      ],
    },
    {
      question: 'At what light angles does texturing provide the MOST benefit?',
      options: [
        { text: 'Only at perpendicular (90-degree) incidence', correct: false },
        { text: 'At shallow/glancing angles where smooth surfaces reflect most light', correct: true },
        { text: 'Texturing works the same at all angles', correct: false },
        { text: 'Only at exactly 45 degrees', correct: false },
      ],
    },
    {
      question: 'KOH etching is used in solar cell manufacturing to:',
      options: [
        { text: 'Clean the silicon surface only', correct: false },
        { text: 'Create pyramid-shaped surface textures through anisotropic etching', correct: true },
        { text: 'Add electrical contacts', correct: false },
        { text: 'Color the cell blue', correct: false },
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

  const renderVisualization = (interactive: boolean, showComparison: boolean = false) => {
    const width = 400;
    const height = 350;
    const output = calculateAbsorption();

    // Generate surface profile
    const generateSurface = (type: string, baseY: number) => {
      const points: string[] = [];
      for (let x = 50; x <= 350; x += 5) {
        let y = baseY;
        if (type === 'random') {
          y += Math.random() * textureDepth * 0.8 - textureDepth * 0.4;
        } else if (type === 'periodic') {
          const period = 30;
          const phase = (x - 50) % period;
          y -= (period / 2 - Math.abs(phase - period / 2)) * (textureDepth / 50);
        }
        points.push(`${x},${y}`);
      }
      return points.join(' ');
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            <linearGradient id="siliconGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>
            <linearGradient id="lightRay" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.light} stopOpacity="0.9" />
              <stop offset="100%" stopColor={colors.accent} stopOpacity="0.6" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Light source */}
          <circle cx="50" cy="30" r="20" fill={colors.light} opacity={0.8} />
          <circle cx="50" cy="30" r="12" fill="#fff" opacity={0.9} />
          <text x="50" y="60" fill={colors.textSecondary} fontSize="10" textAnchor="middle">
            Light ({lightAngle}deg)
          </text>

          {/* Silicon wafer */}
          <rect x="50" y="180" width="300" height="100" fill="url(#siliconGrad)" />

          {/* Textured surface */}
          <polyline
            points={generateSurface(surfaceType, 180)}
            fill="none"
            stroke={colors.silicon}
            strokeWidth="3"
          />

          {/* Light rays with bounces */}
          {rayBounces.map((path, i) => (
            <g key={i}>
              <polyline
                points={path.map((p, j) => j % 2 === 0 ? `${p},${path[j + 1]}` : '').filter(Boolean).join(' ')}
                fill="none"
                stroke={colors.light}
                strokeWidth="2"
                opacity={0.7}
                strokeDasharray={surfaceType === 'smooth' ? '5,5' : 'none'}
                filter="url(#glow)"
              />
              {/* Bounce points */}
              {path.filter((_, j) => j % 2 === 0 && j > 0).map((x, j) => (
                <circle
                  key={j}
                  cx={x}
                  cy={path[path.indexOf(x) + 1]}
                  r="4"
                  fill={colors.accent}
                  opacity={0.8}
                />
              ))}
            </g>
          ))}

          {/* Absorption meter */}
          <rect x="280" y="20" width="100" height="100" fill="rgba(0,0,0,0.6)" rx="8" stroke={colors.accent} strokeWidth="1" />
          <text x="330" y="40" fill={colors.textSecondary} fontSize="10" textAnchor="middle">ABSORPTION</text>

          {/* Meter bar */}
          <rect x="295" y="50" width="70" height="20" fill="rgba(255,255,255,0.1)" rx="4" />
          <rect x="295" y="50" width={70 * (output.absorption / 100)} height="20" fill={colors.success} rx="4" />
          <text x="330" y="65" fill={colors.textPrimary} fontSize="12" textAnchor="middle" fontWeight="bold">
            {output.absorption.toFixed(1)}%
          </text>

          <text x="330" y="90" fill={colors.textSecondary} fontSize="9" textAnchor="middle">
            Path: {output.pathLength.toFixed(1)}x
          </text>
          <text x="330" y="105" fill={colors.textSecondary} fontSize="9" textAnchor="middle">
            Bounces: {output.bounces}
          </text>

          {/* Surface type label */}
          <text x="200" y="320" fill={colors.accent} fontSize="14" textAnchor="middle" fontWeight="bold">
            {surfaceType.charAt(0).toUpperCase() + surfaceType.slice(1)} Surface
          </text>
          <text x="200" y="340" fill={colors.textSecondary} fontSize="11" textAnchor="middle">
            Efficiency: {output.efficiency.toFixed(1)}%
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnimating ? 'Stop' : 'Animate Angle'}
            </button>
            <button
              onClick={() => { setSurfaceType('smooth'); setTextureDepth(50); setLightAngle(30); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
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

  const renderControls = (showTwist: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Surface Type
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['smooth', 'random', 'periodic'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSurfaceType(type)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: surfaceType === type ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: surfaceType === type ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '13px',
                textTransform: 'capitalize',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Texture Depth: {textureDepth}%
        </label>
        <input
          type="range"
          min="10"
          max="100"
          step="5"
          value={textureDepth}
          onChange={(e) => setTextureDepth(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Light Incident Angle: {lightAngle} degrees
        </label>
        <input
          type="range"
          min="0"
          max="80"
          step="5"
          value={lightAngle}
          onChange={(e) => setLightAngle(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Light Trapping Factor: {calculateAbsorption().pathLength.toFixed(1)}x effective thickness
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          More bounces = higher absorption probability
        </div>
      </div>
    </div>
  );

  // Navigation function
  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);
    setTimeout(() => { isNavigating.current = false; }, 400);
  }, []);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase]);

  const currentIdx = phaseOrder.indexOf(phase);

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: colors.bgDark,
      borderBottom: `1px solid rgba(255,255,255,0.1)`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            background: currentIdx > 0 ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: currentIdx > 0 ? colors.textPrimary : colors.textMuted,
            cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
            fontSize: '14px',
          }}
        >
          Back
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {phaseOrder.map((p, i) => (
          <div
            key={p}
            onClick={() => i <= currentIdx && goToPhase(p)}
            style={{
              width: i === currentIdx ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
              cursor: i <= currentIdx ? 'pointer' : 'default',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: colors.textMuted, fontSize: '12px' }}>
          {currentIdx + 1}/{phaseOrder.length}
        </span>
        <span style={{
          padding: '4px 8px',
          borderRadius: '4px',
          background: 'rgba(245, 158, 11, 0.2)',
          color: colors.accent,
          fontSize: '11px',
          fontWeight: 'bold',
        }}>
          {phaseLabels[phase]}
        </span>
      </div>
    </div>
  );

  const renderBottomBar = (canGoBack: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <button
        onClick={goBack}
        disabled={currentIdx === 0}
        style={{
          padding: '12px 24px',
          borderRadius: '8px',
          border: `1px solid ${colors.textMuted}`,
          background: 'transparent',
          color: currentIdx > 0 ? colors.textSecondary : colors.textMuted,
          fontWeight: 'bold',
          cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          opacity: currentIdx > 0 ? 1 : 0.5,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Back
      </button>
      <span style={{ color: colors.textMuted, fontSize: '12px' }}>
        {phaseLabels[phase]}
      </span>
      <button
        onClick={goNext}
        disabled={!canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
          WebkitTapHighlightColor: 'transparent',
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
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Silicon Surface Texturing
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Would a rough surface absorb more light than a smooth one?
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
                A polished silicon surface reflects about 35% of incoming light. But what if we
                roughened it? Would that scatter light away... or trap it inside?
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The answer revolutionized solar cell efficiency!
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try comparing smooth vs textured surfaces to see the difference!
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
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Question:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A smooth silicon surface reflects 35% of light. If we sand or etch the surface to
              create tiny pyramids or random roughness, what happens to light absorption?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What do you predict will happen?
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
                    background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
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
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Light Trapping Lab</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare smooth vs textured surfaces
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
              <li>Compare smooth vs random vs periodic textures</li>
              <li>Increase texture depth and watch absorption rise</li>
              <li>Try shallow light angles - notice texturing helps more!</li>
              <li>Count the light bounces in each configuration</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'rough_better';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
              Textured surfaces trap light through multiple internal reflections, dramatically
              increasing absorption from ~65% to over 95%!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Light Trapping</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Specular Reflection:</strong> Smooth
                surfaces reflect light at equal angles. Once reflected, the light escapes forever.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Light Trapping:</strong> Textured
                surfaces redirect reflected light back into the material. Each bounce gives
                another 65% chance of absorption.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Effective Path Length:</strong> With
                pyramid textures, light can travel 4-10x further through the silicon before
                escaping, dramatically increasing absorption probability.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Efficiency Gain:</strong> Texturing
                alone can improve cell efficiency by 2-3 absolute percentage points - a huge
                improvement in solar cell manufacturing!
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
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              Random texturing vs. periodic pyramids - which is better?
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
              We can create textures two ways: random roughening (like sandpaper) or precise
              periodic pyramids (using chemical etching). Both trap light, but is one better?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Which texture type do you think works better?
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
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Compare Texture Types</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Switch between random and periodic textures
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
              Periodic pyramid structures achieve higher absorption than random textures because
              the facet angles are optimized to redirect light downward. Random textures sometimes
              scatter light sideways where it can escape more easily.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'periodic_better';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
              Periodic pyramid textures consistently outperform random textures because the
              geometry is optimized for light trapping!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why Pyramids Win</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Controlled Angles:</strong> Pyramid
                facets are tilted at ~54.7 degrees (the [111] crystal plane angle). This specific
                angle causes reflected light to hit the adjacent facet rather than escape.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Double Bounce Minimum:</strong> Even
                perpendicular light bounces at least twice before potentially escaping, giving
                ~90% minimum absorption.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Industrial Process:</strong> KOH
                (potassium hydroxide) etching naturally creates pyramids because it etches
                different crystal directions at different rates (anisotropic etching).
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
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Surface texturing applies far beyond solar cells
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
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
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
          {renderProgressBar()}
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
                {testScore >= 8 ? 'You\'ve mastered silicon texturing!' : 'Review the material and try again.'}
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
        {renderProgressBar()}
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
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
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
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered silicon surface texturing!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Light trapping through surface texturing</li>
              <li>Specular vs diffuse reflection</li>
              <li>Effective path length enhancement</li>
              <li>Random vs periodic texture comparison</li>
              <li>Absorption probability with multiple bounces</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Modern solar cells combine texturing with anti-reflection coatings (silicon nitride)
              to achieve over 99% light capture. Research into "black silicon" with nano-scale
              texturing pushes absorption even higher, approaching the theoretical limit!
            </p>
          </div>
          {renderVisualization(true, true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default SiliconTexturingRenderer;
