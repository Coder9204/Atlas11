import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface ChladniPatternsRendererProps {
  phase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  gamePhase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#e2e8f0',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#14b8a6',
  accentGlow: 'rgba(20, 184, 166, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  plate: '#475569',
  sand: '#fbbf24',
  nodal: '#0ea5e9',
};

const PHASES = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'] as const;

const ChladniPatternsRenderer: React.FC<ChladniPatternsRendererProps> = ({
  phase: phaseProp,
  gamePhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase state for self-managing navigation
  const [internalPhaseIndex, setInternalPhaseIndex] = useState(0);

  // Use gamePhase prop if provided, otherwise fall back to phase prop, or use internal state
  const externalPhase = gamePhase || phaseProp;
  const currentPhase = externalPhase || PHASES[internalPhaseIndex];
  // Validate phase - if invalid, default to 'hook'
  const phase = PHASES.includes(currentPhase as typeof PHASES[number]) ? currentPhase : 'hook';

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
  const [frequency, setFrequency] = useState(200);
  const [modeM, setModeM] = useState(2);
  const [modeN, setModeN] = useState(2);
  const [isVibrating, setIsVibrating] = useState(false);
  const [showNodalLines, setShowNodalLines] = useState(true);
  const [plateShape, setPlateShape] = useState<'square' | 'circle'>('square');

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistResult, setShowTwistResult] = useState(false);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTransferApp, setCurrentTransferApp] = useState(0);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation time
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (!isVibrating) return;

    const interval = setInterval(() => {
      setTime(prev => prev + 0.05);
    }, 50);

    return () => clearInterval(interval);
  }, [isVibrating]);

  // Map frequency to mode numbers (simplified)
  useEffect(() => {
    // Simplified mapping: frequency determines complexity
    const modeFromFreq = Math.floor(frequency / 100);
    if (frequency < 150) {
      setModeM(1);
      setModeN(1);
    } else if (frequency < 250) {
      setModeM(2);
      setModeN(1);
    } else if (frequency < 350) {
      setModeM(2);
      setModeN(2);
    } else if (frequency < 450) {
      setModeM(3);
      setModeN(2);
    } else if (frequency < 550) {
      setModeM(3);
      setModeN(3);
    } else {
      setModeM(4);
      setModeN(3);
    }
  }, [frequency]);

  const predictions = [
    { id: 'center', label: 'Sand collects in the center of the plate' },
    { id: 'nodal', label: 'Sand collects along lines where the plate doesn\'t move' },
    { id: 'edges', label: 'Sand flies off the edges of the plate' },
    { id: 'random', label: 'Sand spreads randomly across the plate' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'The pattern stays the same' },
    { id: 'more', label: 'The pattern becomes more complex (more lines)' },
    { id: 'less', label: 'The pattern becomes simpler (fewer lines)' },
    { id: 'disappear', label: 'The pattern disappears completely' },
  ];

  const transferApplications = [
    {
      title: 'Musical Instrument Design',
      description: 'Violin makers use Chladni patterns to see how the top plate vibrates at frequencies from 200 Hz to 5000 Hz. A typical violin plate is tested at over 50 different frequencies, with patterns revealing if the 3 mm thick spruce wood is properly shaped for good sound.',
      question: 'Why do luthiers want to see specific Chladni patterns on violins?',
      answer: 'Certain patterns indicate the wood will vibrate efficiently at frequencies important for the violin\'s tone. Symmetrical patterns mean even vibration, which produces a balanced, resonant sound.',
    },
    {
      title: 'Speaker Cone Testing',
      description: 'Audio engineers use laser vibrometry (modern Chladni patterns) to identify "breakup modes" where speaker cones stop moving as a piston. High-end speakers are tested from 20 Hz to 20000 Hz, with measurements accurate to 0.01 mm amplitude.',
      question: 'What do complex Chladni patterns on a speaker cone indicate?',
      answer: 'Complex patterns show the cone is breaking up into multiple vibrating zones at that frequency. This causes distortion. Good speakers are designed so breakup occurs above the audible range.',
    },
    {
      title: 'Earthquake Engineering',
      description: 'Building vibration modes are like 3D Chladni patterns. Engineers identify nodal floors during earthquakes. A 100 m tall building might have its first mode at 0.5 Hz, second mode at 1.5 Hz, creating distinct vibration patterns.',
      question: 'Where would you want critical equipment in a vibrating building?',
      answer: 'At nodal points (floors) where vibration amplitude is minimal, like sand collecting on nodal lines. Different earthquake frequencies excite different modes, so design must consider multiple scenarios.',
    },
    {
      title: 'Cymbal Manufacturing',
      description: 'Cymbal makers hammer specific areas based on how they want the cymbal to vibrate. A 20 inch ride cymbal vibrates from 300 Hz to 15000 Hz. Different zones produce different overtones, with hammering affecting vibration by up to 30%.',
      question: 'How do Chladni patterns help cymbal design?',
      answer: 'Patterns show which areas move most for each frequency. Hammering nodal lines changes the cymbal\'s overtone structure minimally, while hammering antinodal areas (where sand moves away) has maximum effect on that frequency.',
    },
  ];

  const testQuestions = [
    {
      question: 'Where does sand collect on a vibrating Chladni plate?',
      options: [
        { text: 'Where the plate vibrates most', correct: false },
        { text: 'Along nodal lines where the plate doesn\'t move', correct: true },
        { text: 'At the center of the plate', correct: false },
        { text: 'Randomly across the surface', correct: false },
      ],
    },
    {
      question: 'What do nodal lines represent on a Chladni plate?',
      options: [
        { text: 'Lines of maximum vibration amplitude', correct: false },
        { text: 'Lines of zero vibration amplitude', correct: true },
        { text: 'Lines where frequency is highest', correct: false },
        { text: 'Lines connecting the sound source to edges', correct: false },
      ],
    },
    {
      question: 'What happens to Chladni patterns as frequency increases?',
      options: [
        { text: 'Patterns become simpler with fewer lines', correct: false },
        { text: 'Patterns become more complex with more lines', correct: true },
        { text: 'Patterns remain the same', correct: false },
        { text: 'Patterns disappear entirely', correct: false },
      ],
    },
    {
      question: 'What is the physical cause of Chladni patterns?',
      options: [
        { text: 'Electromagnetic forces from the speaker', correct: false },
        { text: 'Standing waves creating stationary nodes', correct: true },
        { text: 'Air pressure pushing sand around', correct: false },
        { text: 'Static electricity on the plate', correct: false },
      ],
    },
    {
      question: 'Why do only certain frequencies produce clear patterns?',
      options: [
        { text: 'Other frequencies are absorbed by the sand', correct: false },
        { text: 'Only resonant frequencies create stable standing waves', correct: true },
        { text: 'The speaker can only produce certain frequencies', correct: false },
        { text: 'Sand particles only respond to certain frequencies', correct: false },
      ],
    },
    {
      question: 'What determines the shape of a Chladni pattern?',
      options: [
        { text: 'The type of sand used', correct: false },
        { text: 'The plate geometry and vibration frequency (mode)', correct: true },
        { text: 'The loudness of the sound', correct: false },
        { text: 'The temperature of the plate', correct: false },
      ],
    },
    {
      question: 'On a square plate, why are patterns often symmetric?',
      options: [
        { text: 'Sound waves prefer symmetry', correct: false },
        { text: 'The boundary conditions enforce symmetry in modes', correct: true },
        { text: 'Square plates are more rigid', correct: false },
        { text: 'It\'s just a coincidence', correct: false },
      ],
    },
    {
      question: 'What is the relationship between mode number and pattern complexity?',
      options: [
        { text: 'Higher mode numbers = simpler patterns', correct: false },
        { text: 'Higher mode numbers = more nodal lines', correct: true },
        { text: 'Mode number doesn\'t affect pattern', correct: false },
        { text: 'Mode number only affects pattern size', correct: false },
      ],
    },
    {
      question: 'If you touched the plate at a nodal line during vibration, what would you feel?',
      options: [
        { text: 'Maximum vibration', correct: false },
        { text: 'Almost no vibration', correct: true },
        { text: 'The plate would stop vibrating', correct: false },
        { text: 'Electric shock from static', correct: false },
      ],
    },
    {
      question: 'Why are Chladni patterns useful in acoustics?',
      options: [
        { text: 'They make pretty art', correct: false },
        { text: 'They visualize invisible vibration modes', correct: true },
        { text: 'They amplify sound', correct: false },
        { text: 'They reduce noise', correct: false },
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

  // Generate sand particles based on Chladni pattern
  const generateSandParticles = useMemo(() => {
    const particles: { x: number; y: number; size: number }[] = [];
    const size = 300;
    const numParticles = 800;

    for (let i = 0; i < numParticles; i++) {
      let x = Math.random() * size;
      let y = Math.random() * size;

      if (isVibrating) {
        // Move particles toward nodal lines using Chladni equation
        // For a square plate: cos(mπx/L)cos(nπy/L) - cos(nπx/L)cos(mπy/L) = 0
        for (let iter = 0; iter < 5; iter++) {
          const z1 = Math.cos(modeM * Math.PI * x / size) * Math.cos(modeN * Math.PI * y / size);
          const z2 = Math.cos(modeN * Math.PI * x / size) * Math.cos(modeM * Math.PI * y / size);
          const amplitude = Math.abs(z1 - z2);

          // Move toward lower amplitude
          const gradient = 0.5 + amplitude * 2;
          x += (Math.random() - 0.5) * 10 / gradient;
          y += (Math.random() - 0.5) * 10 / gradient;

          // Keep in bounds
          x = Math.max(5, Math.min(size - 5, x));
          y = Math.max(5, Math.min(size - 5, y));
        }
      }

      particles.push({
        x,
        y,
        size: 2 + Math.random() * 2,
      });
    }

    return particles;
  }, [isVibrating, modeM, modeN]);

  // Get current phase index for progress tracking
  const currentPhaseIndex = PHASES.indexOf(phase as typeof PHASES[number]);
  const progressPercent = ((currentPhaseIndex + 1) / PHASES.length) * 100;

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (externalPhase) {
      // External control mode - call onPhaseComplete
      onPhaseComplete?.();
    } else {
      // Self-managing mode - advance internal state
      setInternalPhaseIndex(prev => Math.min(prev + 1, PHASES.length - 1));
    }
  }, [externalPhase, onPhaseComplete]);

  const handleBack = useCallback(() => {
    if (externalPhase) {
      onPhaseComplete?.();
    } else {
      setInternalPhaseIndex(prev => Math.max(prev - 1, 0));
    }
  }, [externalPhase, onPhaseComplete]);

  const handleDotClick = useCallback((index: number) => {
    if (externalPhase) {
      onPhaseComplete?.();
    } else {
      setInternalPhaseIndex(index);
    }
  }, [externalPhase, onPhaseComplete]);

  // Common button styles with transitions
  const buttonBaseStyle = {
    transition: 'all 0.2s ease',
  };

  // Navigation bar component with fixed position at top
  const renderNavBar = (showBack: boolean = true) => (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '12px 16px',
        background: colors.bgDark,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
      }}
      aria-label="navigation"
    >
      {showBack && currentPhaseIndex > 0 ? (
        <button
          onClick={handleBack}
          aria-label="Back"
          style={{
            ...buttonBaseStyle,
            padding: '10px 20px',
            minHeight: '44px',
            borderRadius: '8px',
            border: `1px solid ${colors.textSecondary}`,
            background: 'transparent',
            color: colors.textSecondary,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 700,
          }}
        >
          Back
        </button>
      ) : (
        <div style={{ width: '80px' }} />
      )}

      {/* Navigation dots */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {PHASES.map((p, i) => (
          <button
            key={p}
            onClick={() => handleDotClick(i)}
            aria-label={`Go to ${p} phase`}
            title={p}
            style={{
              ...buttonBaseStyle,
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              border: 'none',
              background: i === currentPhaseIndex
                ? colors.accent
                : i < currentPhaseIndex
                ? colors.success
                : 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>

      <button
        onClick={handleNext}
        aria-label="Next"
        style={{
          ...buttonBaseStyle,
          padding: '10px 20px',
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: `linear-gradient(135deg, ${colors.accent} 0%, #0d9488 100%)`,
          color: 'white',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 700,
        }}
      >
        Next
      </button>
    </nav>
  );

  // Progress bar component
  const renderProgressBar = () => (
    <div
      role="progressbar"
      aria-valuenow={progressPercent}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        position: 'fixed',
        top: '68px',
        left: 0,
        right: 0,
        height: '4px',
        background: 'rgba(255,255,255,0.1)',
        zIndex: 999,
      }}
    >
      <div
        style={{
          width: `${progressPercent}%`,
          height: '100%',
          background: colors.accent,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 380;
    const plateSize = 280;
    const plateX = (width - plateSize) / 2;
    const plateY = 40;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: colors.bgDark, borderRadius: '12px', maxWidth: '500px' }}
          role="img"
          aria-label="Chladni pattern visualization showing vibrating plate with sand particles"
        >
          <defs>
            {/* Premium metal plate gradient - brushed steel effect */}
            <linearGradient id="chladPlateMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="20%" stopColor="#94a3b8" />
              <stop offset="40%" stopColor="#64748b" />
              <stop offset="60%" stopColor="#475569" />
              <stop offset="80%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Plate surface with depth */}
            <radialGradient id="chladPlateSurface" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="40%" stopColor="#4b5563" />
              <stop offset="70%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </radialGradient>

            {/* Nodal line glow gradient */}
            <linearGradient id="chladNodalGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0" />
              <stop offset="30%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#7dd3fc" stopOpacity="1" />
              <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
            </linearGradient>

            {/* Sand particle gradient - gold/amber */}
            <radialGradient id="chladSandGrain" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="40%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </radialGradient>

            {/* Vibration amplitude visualization gradient */}
            <radialGradient id="chladVibrationWave" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#2dd4bf" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#5eead4" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#99f6e4" stopOpacity="0" />
            </radialGradient>

            {/* Speaker/driver glow */}
            <radialGradient id="chladSpeakerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="50%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#0f766e" stopOpacity="0.5" />
            </radialGradient>

            {/* Background lab gradient */}
            <linearGradient id="chladLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Glow filter for nodal lines */}
            <filter id="chladNodalGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glow filter for sand particles */}
            <filter id="chladSandGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft glow for vibration indicator */}
            <filter id="chladVibrationGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner shadow for plate depth */}
            <filter id="chladPlateInnerShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Plate edge highlight gradient */}
            <linearGradient id="chladPlateEdge" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
          </defs>

          {/* Premium dark lab background */}
          <rect width={width} height={height} fill="url(#chladLabBg)" />

          {/* Subtle grid pattern */}
          <defs>
            <pattern id="chladLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#chladLabGrid)" />

          {/* Plate shadow for depth */}
          <rect
            x={plateX + 4}
            y={plateY + 4}
            width={plateSize}
            height={plateSize}
            fill="#000"
            opacity={0.3}
            rx={4}
          />

          {/* Premium metal plate with metallic gradient */}
          <rect
            x={plateX}
            y={plateY}
            width={plateSize}
            height={plateSize}
            fill="url(#chladPlateSurface)"
            stroke="url(#chladPlateEdge)"
            strokeWidth={3}
            rx={2}
            filter="url(#chladPlateInnerShadow)"
          />

          {/* Plate label */}
          <text
            x={plateX + plateSize / 2}
            y={plateY - 10}
            textAnchor="middle"
            fill={colors.textSecondary}
            fontSize="12"
            fontWeight="bold"
          >
            Metal Plate
          </text>

          {/* Plate surface highlight */}
          <rect
            x={plateX + 2}
            y={plateY + 2}
            width={plateSize - 4}
            height={8}
            fill="url(#chladPlateMetallic)"
            opacity={0.3}
            rx={1}
          />

          {/* Vibration amplitude visualization - concentric waves when vibrating */}
          {isVibrating && (
            <g>
              {[0.3, 0.5, 0.7].map((scale, idx) => (
                <rect
                  key={`vib-${idx}`}
                  x={plateX + plateSize * (1 - scale) / 2}
                  y={plateY + plateSize * (1 - scale) / 2}
                  width={plateSize * scale}
                  height={plateSize * scale}
                  fill="none"
                  stroke="url(#chladVibrationWave)"
                  strokeWidth={1}
                  opacity={0.3 + Math.sin(time * 8 + idx) * 0.2}
                  rx={2}
                />
              ))}
            </g>
          )}

          {/* Nodal lines visualization with glow */}
          {showNodalLines && isVibrating && (
            <g filter="url(#chladNodalGlowFilter)">
              {/* Draw approximate nodal lines for current mode */}
              {Array.from({ length: modeM }).map((_, i) => (
                <g key={`v${i}`}>
                  <line
                    x1={plateX + (plateSize * (i + 0.5)) / modeM}
                    y1={plateY}
                    x2={plateX + (plateSize * (i + 0.5)) / modeM}
                    y2={plateY + plateSize}
                    stroke="url(#chladNodalGlow)"
                    strokeWidth={3}
                    strokeDasharray="8,4"
                    opacity={0.7 + Math.sin(time * 6) * 0.2}
                  />
                  {i === 0 && (
                    <text
                      x={plateX + (plateSize * (i + 0.5)) / modeM + 8}
                      y={plateY + 20}
                      fill={colors.nodal}
                      fontSize="10"
                    >
                      Nodal Line
                    </text>
                  )}
                </g>
              ))}
              {Array.from({ length: modeN }).map((_, i) => (
                <line
                  key={`h${i}`}
                  x1={plateX}
                  y1={plateY + (plateSize * (i + 0.5)) / modeN}
                  x2={plateX + plateSize}
                  y2={plateY + (plateSize * (i + 0.5)) / modeN}
                  stroke="url(#chladNodalGlow)"
                  strokeWidth={3}
                  strokeDasharray="8,4"
                  opacity={0.7 + Math.sin(time * 6) * 0.2}
                />
              ))}
            </g>
          )}

          {/* Sand particles with premium gradient and glow */}
          <g filter="url(#chladSandGlow)">
            {generateSandParticles.slice(0, 100).map((p, i) => (
              <circle
                key={i}
                cx={plateX + (p.x * plateSize) / 300}
                cy={plateY + (p.y * plateSize) / 300}
                r={p.size}
                fill="url(#chladSandGrain)"
                opacity={0.85}
              />
            ))}
          </g>

          {/* Sand label */}
          <text
            x={plateX + 20}
            y={plateY + plateSize - 15}
            fill={colors.sand}
            fontSize="11"
            fontWeight="bold"
          >
            Sand Particles
          </text>

          {/* Vibration indicator - speaker/driver visualization */}
          {isVibrating && (
            <g filter="url(#chladVibrationGlow)">
              <circle
                cx={width / 2}
                cy={plateY + plateSize + 30}
                r={15 + Math.sin(time * 10) * 5}
                fill="none"
                stroke="url(#chladSpeakerGlow)"
                strokeWidth={3}
                opacity={0.6 + Math.sin(time * 10) * 0.3}
              />
              <circle
                cx={width / 2}
                cy={plateY + plateSize + 30}
                r={8 + Math.sin(time * 10) * 2}
                fill="url(#chladSpeakerGlow)"
                opacity={0.4}
              />
              <text
                x={width / 2}
                y={plateY + plateSize + 55}
                textAnchor="middle"
                fill={colors.accent}
                fontSize="10"
              >
                Speaker ({frequency} Hz)
              </text>
            </g>
          )}

          {/* Legend inside SVG */}
          <g transform={`translate(${width - 110}, 15)`}>
            <rect x="0" y="0" width="100" height="50" fill="rgba(0,0,0,0.5)" rx="4" />
            <circle cx="12" cy="15" r="5" fill="url(#chladSandGrain)" />
            <text x="22" y="18" fill={colors.textSecondary} fontSize="10">Sand</text>
            <line x1="7" y1="35" x2="25" y2="35" stroke={colors.nodal} strokeWidth="2" strokeDasharray="4,2" />
            <text x="30" y="38" fill={colors.textSecondary} fontSize="10">Node</text>
          </g>
        </svg>

        {/* Labels moved outside SVG using typo system */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '500px',
          padding: `0 ${typo.cardPadding}`,
        }}>
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: typo.elementGap }} role="legend">
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 50%, #d97706 100%)',
            }} />
            <span style={{ color: colors.textSecondary, fontSize: typo.label }}>Sand</span>
            {showNodalLines && (
              <>
                <div style={{
                  width: '24px',
                  height: '3px',
                  marginLeft: '8px',
                  background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)',
                  borderRadius: '2px',
                }} />
                <span style={{ color: colors.textSecondary, fontSize: typo.label }}>Nodal lines</span>
              </>
            )}
          </div>

          {/* Mode indicator */}
          <div style={{ color: colors.textSecondary, fontSize: typo.label }}>
            Mode ({modeM}, {modeN})
          </div>
        </div>

        {/* Frequency indicator outside SVG */}
        {isVibrating && (
          <div style={{
            color: colors.accent,
            fontSize: typo.small,
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span style={{ fontSize: '16px' }}>&#9835;</span>
            <span>{frequency} Hz</span>
          </div>
        )}

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsVibrating(!isVibrating)}
              style={{
                ...buttonBaseStyle,
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: isVibrating
                  ? `linear-gradient(135deg, ${colors.error} 0%, #dc2626 100%)`
                  : `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {isVibrating ? 'Stop' : 'Vibrate'}
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
          Frequency: {frequency} Hz
        </label>
        <input
          type="range"
          min="100"
          max="600"
          step="50"
          value={frequency}
          onChange={(e) => setFrequency(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent, background: 'rgba(20, 184, 166, 0.2)' }}
          aria-label="Frequency slider"
        />
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <label style={{ color: colors.textSecondary }}>
          <input
            type="checkbox"
            checked={showNodalLines}
            onChange={(e) => setShowNodalLines(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Show nodal lines
        </label>
      </div>

      <div style={{
        background: 'rgba(20, 184, 166, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', marginBottom: '4px' }}>
          Current Mode: ({modeM}, {modeN})
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Higher frequency = More complex pattern
        </div>
      </div>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar(false)}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Seeing Sound
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              What if you could see the patterns hidden in vibrations?
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
                In 1787, Ernst Chladni discovered that sprinkling sand on a vibrating metal
                plate reveals beautiful geometric patterns - different for each musical note!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px', fontWeight: 400 }}>
                These "Chladni figures" let us see the hidden structure of sound waves.
              </p>
            </div>

            <div style={{
              background: 'rgba(20, 184, 166, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 400 }}>
                Press "Vibrate" to see where the sand collects!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const selectedCount = prediction ? 1 : 0;
    const totalRequired = 1;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
          {/* Progress indicator for predict phase */}
          <div style={{
            padding: '12px 16px',
            background: 'rgba(20, 184, 166, 0.1)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center',
          }}>
            <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Progress: {selectedCount} of {totalRequired} prediction made
            </span>
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
              A metal plate covered with sand particles (yellow dots). The plate can be
              vibrated at different frequencies by a speaker underneath.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              When the plate vibrates, where will the sand go?
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
                    background: prediction === p.id ? 'rgba(20, 184, 166, 0.2)' : 'transparent',
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
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Chladni Patterns</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Change the frequency to see different vibration modes
            </p>
          </div>

          {/* Observation guidance */}
          <div style={{
            margin: '0 16px 16px 16px',
            padding: '12px 16px',
            background: 'rgba(20, 184, 166, 0.15)',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              <strong style={{ color: colors.accent }}>Observe:</strong> Watch how sand particles move toward the nodal lines (areas of zero vibration) as you change the frequency.
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
              <li>Start at low frequency (100 Hz) - simple pattern</li>
              <li>Increase to 300 Hz - more complex pattern</li>
              <li>Go to 500+ Hz - intricate nodal lines</li>
              <li>Toggle nodal lines to understand the structure</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(20, 184, 166, 0.15)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Real-World Applications:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
              This technology is important in engineering and design. Musical instrument makers use
              Chladni patterns to design violins and guitars. Engineers apply this principle to
              test car body panels and aircraft components. The real-world application of standing
              wave analysis helps us build better speakers and audio equipment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'nodal';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
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
              Sand collects along nodal lines - places where the plate doesn't move!
            </p>
          </div>

          {/* Visual diagram for review */}
          <div style={{ margin: '16px' }}>
            {renderVisualization(false)}
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Standing Waves</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Why Your Observation Matters:</strong> As you observed during the experiment,
                the sand collects in specific lines. This happens because these are the nodal lines - places where the plate
                experiences zero vibration due to destructive interference.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Standing Waves:</strong> When a plate
                vibrates at resonant frequencies, waves reflect from the edges and interfere, creating
                standing waves with fixed nodal lines. Therefore, the pattern you saw is the result of wave superposition.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Nodes vs Antinodes:</strong> The key insight is that nodal lines
                are where destructive interference creates zero motion. Antinodes have maximum vibration.
                Because sand is bounced away from antinodes by the vibration, it settles at nodes where there's no motion.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>The Formula:</strong> For a square plate, the Chladni equation
                shows that amplitude = cos(m*pi*x/L)*cos(n*pi*y/L) - cos(n*pi*x/L)*cos(m*pi*y/L), where m and n are mode numbers.
                Sand collects where this equation equals zero.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Modes:</strong> Each resonant frequency
                creates a unique "mode" with its own pattern. Higher frequencies = more complex patterns
                with more nodal lines. This demonstrates the principle of standing wave formation.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const selectedCount = twistPrediction ? 1 : 0;
    const totalRequired = 1;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
          {/* Progress indicator */}
          <div style={{
            padding: '12px 16px',
            background: 'rgba(245, 158, 11, 0.1)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center',
          }}>
            <span style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Progress: {selectedCount} of {totalRequired} prediction made
            </span>
          </div>

          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What happens if we double the frequency?
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
              You've seen a pattern at 200 Hz. Now imagine we increase to 400 Hz -
              a higher-pitched sound with more energy vibrating the plate.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              When we double the frequency, what happens to the pattern?
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
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Frequency vs Pattern</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Sweep through frequencies and watch the pattern evolve
            </p>
          </div>

          {/* Observation guidance */}
          <div style={{
            margin: '0 16px 16px 16px',
            padding: '12px 16px',
            background: 'rgba(245, 158, 11, 0.15)',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              <strong style={{ color: colors.warning }}>Observe:</strong> Notice how the number of nodal lines increases as you raise the frequency. Each mode has its unique signature pattern.
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
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Higher frequency = shorter wavelength = more nodes can fit on the plate = more
              complex pattern. Each "mode" has its own unique signature!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'more';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
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
              Higher frequency creates more complex patterns with more nodal lines!
            </p>
          </div>

          {/* Visual diagram for twist review */}
          <div style={{ margin: '16px' }}>
            {renderVisualization(false)}
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Mode Numbers Explained</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Mode (m, n):</strong> Each pattern is
                described by two numbers indicating how many nodal lines exist in each direction.
                Mode (2, 1) has 2 vertical and 1 horizontal nodal line.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Frequency Relationship:</strong> Higher
                modes have higher resonant frequencies. The relationship follows f is proportional to the square root of (m squared + n squared),
                meaning complexity increases with frequency.
              </p>
              <p>
                This is why musical instruments have overtones - each is a different mode of the
                vibrating surface, creating the rich timbre we hear!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const completedCount = transferCompleted.size;
    const totalApps = transferApplications.length;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Chladni patterns have practical uses in acoustics and engineering
            </p>
            {/* Progress indicator for transfer phase */}
            <p style={{ color: colors.textSecondary, fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>
              Progress: {completedCount} of {totalApps} applications completed
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
                  <span style={{ color: colors.success }}>Completed</span>
                )}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>
                {app.description}
              </p>
              <div style={{
                background: 'rgba(20, 184, 166, 0.1)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '8px',
              }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                  {app.question}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {!transferCompleted.has(index) ? (
                  <button
                    onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                    style={{
                      ...buttonBaseStyle,
                      padding: '12px 20px',
                      minHeight: '44px',
                      borderRadius: '6px',
                      border: `1px solid ${colors.accent}`,
                      background: `linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(13, 148, 136, 0.1) 100%)`,
                      color: colors.accent,
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 700,
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
                    marginBottom: '12px',
                    width: '100%',
                  }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 400 }}>{app.answer}</p>
                  </div>
                )}
                <button
                  onClick={() => {
                    if (!transferCompleted.has(index)) {
                      setTransferCompleted(new Set([...transferCompleted, index]));
                    }
                    if (index < transferApplications.length - 1) {
                      setCurrentTransferApp(index + 1);
                    }
                  }}
                  data-action="got-it"
                  aria-label="Got it, continue to next application"
                  style={{
                    ...buttonBaseStyle,
                    padding: '10px 20px',
                    minHeight: '44px',
                    borderRadius: '6px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                >
                  Got it
                </button>
              </div>
            </div>
          ))}
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
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
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
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>
                {testScore} / 10
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered Chladni patterns!' : 'Review the material and try again.'}
              </p>
            </div>

            {/* Answer review section with checkmark/X indicators */}
            <div style={{ margin: '16px', padding: '16px', background: colors.bgCard, borderRadius: '12px' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '16px', fontWeight: 700 }}>Answer Review</h3>
              {testQuestions.map((q, qIndex) => {
                const userAnswer = testAnswers[qIndex];
                const isCorrect = userAnswer !== null && q.options[userAnswer].correct;

                return (
                  <div
                    key={qIndex}
                    data-answer-review="true"
                    data-correct={isCorrect}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      borderRadius: '8px',
                      background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span
                        className={isCorrect ? 'correct-indicator' : 'incorrect-indicator'}
                        style={{
                          color: isCorrect ? colors.success : colors.error,
                          fontWeight: 700,
                          fontSize: '20px',
                          lineHeight: 1,
                        }}
                        aria-label={isCorrect ? 'Correct answer' : 'Incorrect answer'}
                      >
                        {isCorrect ? '\u2713' : '\u2717'}
                      </span>
                      <span style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 600 }}>
                        Question {qIndex + 1}
                      </span>
                    </div>
                    <p style={{ color: colors.textPrimary, fontSize: '14px', margin: 0, fontWeight: 400 }}>
                      {q.question}
                    </p>
                    {!isCorrect && userAnswer !== null && (
                      <p style={{ color: colors.error, fontSize: '12px', marginTop: '4px', fontWeight: 400 }}>
                        Your answer: {q.options[userAnswer].text}
                      </p>
                    )}
                    <p style={{ color: colors.success, fontSize: '12px', marginTop: '4px', fontWeight: 400 }}>
                      Correct answer: {q.options.find(o => o.correct)?.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    const answeredCount = testAnswers.filter(a => a !== null).length;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>
                {currentTestQuestion + 1} / {testQuestions.length}
              </span>
            </div>

            {/* Test introduction and context */}
            <div style={{
              background: 'rgba(20, 184, 166, 0.1)',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
                Test your understanding of Chladni patterns and standing waves. These questions cover
                the physics of vibrating plates, nodal lines, resonant frequencies, and real-world
                applications in acoustics and engineering. Each question builds on concepts from the
                exploration phase. Take your time and think about what you observed during the experiment.
              </p>
            </div>

            {/* Question number prominently shown */}
            <div style={{
              background: colors.bgCard,
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              <span style={{ color: colors.accent, fontSize: '18px', fontWeight: 'bold' }}>
                Q{currentTestQuestion + 1} of {testQuestions.length}
              </span>
              <span style={{ color: colors.textSecondary, fontSize: '14px', marginLeft: '12px' }}>
                ({answeredCount} answered)
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
                      ? colors.textSecondary
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
                    minHeight: '44px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex
                      ? `2px solid ${colors.accent}`
                      : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex
                      ? 'rgba(20, 184, 166, 0.2)'
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
              aria-label="Previous question"
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: `1px solid ${colors.textSecondary}`,
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textSecondary : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                opacity: currentTestQuestion === 0 ? 0.5 : 1,
              }}
            >
              Previous
            </button>

            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                aria-label="Next question"
                style={{
                  padding: '12px 24px',
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
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
                  minHeight: '44px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? colors.textSecondary : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  opacity: testAnswers.includes(null) ? 0.5 : 1,
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
        {renderNavBar()}
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }} aria-label="trophy">&#127942;</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You've mastered Chladni patterns and standing waves
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Standing waves and nodal/antinodal regions</li>
              <li>Resonant frequencies and vibration modes</li>
              <li>Mode numbers (m, n) and pattern complexity</li>
              <li>Frequency-pattern relationship</li>
              <li>Applications in acoustics and instrument design</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(20, 184, 166, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Modern laser vibrometry creates 3D Chladni patterns, revealing vibrations in
              everything from car bodies to biological cells. The same mathematics describes
              electron orbitals in atoms - quantum "standing waves" around the nucleus!
            </p>
          </div>

          {renderVisualization(true)}
        </div>
      </div>
    );
  }

  // Default fallback - should not reach here due to phase validation
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
      {renderNavBar(false)}
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '80px', paddingBottom: '80px', textAlign: 'center', padding: '24px' }}>
        <h1 style={{ color: colors.textPrimary }}>Chladni Patterns</h1>
        <p style={{ color: colors.textSecondary }}>Loading...</p>
      </div>
    </div>
  );
};

export default ChladniPatternsRenderer;
