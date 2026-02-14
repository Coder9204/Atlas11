import React, { useState, useEffect, useCallback } from 'react';

// Real-world applications for Moire patterns
const realWorldApps = [
  {
    icon: '🔬',
    title: 'Precision Measurement',
    short: 'Nanometer-scale displacement sensing',
    tagline: 'Amplifying tiny movements into visible patterns',
    description: 'Moire patterns amplify small displacements into large, easily measured pattern shifts. Optical encoders in CNC machines, semiconductor equipment, and scientific instruments use moire interference between gratings to achieve nanometer precision.',
    connection: 'The game showed how small rotations create dramatic pattern changes. Optical encoders exploit this - tiny grating movements cause large moire fringe shifts, enabling nanometer resolution from visible patterns.',
    howItWorks: 'Two fine gratings with slightly different spacings overlap. Relative movement shifts moire fringes. Photodetectors count fringes for position. Interpolation achieves sub-fringe resolution. Reference marks enable absolute positioning.',
    stats: [
      { value: '1nm', label: 'Resolution achieved', icon: '🔬' },
      { value: '3m', label: 'Maximum travel', icon: '📏' },
      { value: '$4B', label: 'Encoder market', icon: '📈' }
    ],
    examples: ['ASML lithography stages', 'CMM machines', 'Telescope mounts', 'Robotic arms'],
    companies: ['Renishaw', 'Heidenhain', 'Mitutoyo', 'ASML'],
    futureImpact: 'Quantum-enhanced moire sensing will push measurement precision to atomic scales for next-generation manufacturing.',
    color: '#3b82f6'
  },
  {
    icon: '📰',
    title: 'Print Quality Control',
    short: 'Avoiding moire in color printing',
    tagline: 'The enemy of halftone reproduction',
    description: 'Color printing overlays cyan, magenta, yellow, and black halftone screens. If screen angles aren\'t carefully chosen, moire patterns create visible interference. Print engineers use specific rosette patterns to minimize this artifact.',
    connection: 'The game demonstrated how overlapping grids create interference patterns. In printing, the periodic dot patterns of each color ink are essentially grids that can produce unwanted moire.',
    howItWorks: 'Each color printed as halftone screen of dots. Different angles minimize interference (typically 15°, 45°, 75°, 0°). Wrong angles create visible rosette or moire. Digital screening algorithms optimize dot placement. High frequency screens reduce visibility.',
    stats: [
      { value: '175lpi', label: 'Magazine screen ruling', icon: '📰' },
      { value: '15°', label: 'Typical screen angle offset', icon: '📐' },
      { value: '$90B', label: 'Commercial print market', icon: '📈' }
    ],
    examples: ['Magazine printing', 'Packaging graphics', 'Fine art reproduction', 'Billboard printing'],
    companies: ['Heidelberg', 'HP Indigo', 'Kodak', 'Screen Holdings'],
    futureImpact: 'AI-optimized stochastic screening will eliminate moire while enabling finer detail reproduction than traditional halftones.',
    color: '#f59e0b'
  },
  {
    icon: '💳',
    title: 'Security Features',
    short: 'Anti-counterfeiting moire patterns',
    tagline: 'Hidden images that reveal themselves',
    description: 'Currency, passports, and secure documents use moire patterns as anti-counterfeiting features. Special overlays or viewing angles reveal hidden images encoded in line patterns that are nearly impossible to reproduce with standard printers or copiers.',
    connection: 'The interactive moire exploration shows how specific alignments reveal patterns. Security features use this - hidden images appear only when a decoder lens aligns with the printed pattern.',
    howItWorks: 'Document contains high-frequency line pattern encoding hidden image. Decoder overlay with matching frequency placed on top. Moire interference reveals hidden message or image. Photocopiers cannot capture fine lines, defeating reproduction.',
    stats: [
      { value: '150+', label: 'Countries using moire security', icon: '🌍' },
      { value: '1000lpi', label: 'Security pattern resolution', icon: '🔬' },
      { value: '$30B', label: 'Security printing market', icon: '📈' }
    ],
    examples: ['US currency', 'EU passports', 'Bank checks', 'Event tickets'],
    companies: ['De La Rue', 'Giesecke+Devrient', 'Crane Currency', 'Oberthur'],
    futureImpact: 'Smartphone-readable moire codes will enable instant document authentication without special equipment.',
    color: '#8b5cf6'
  },
  {
    icon: '⚛️',
    title: 'Twisted Bilayer Graphene',
    short: 'Magic angle superconductivity',
    tagline: 'Moire physics wins Nobel Prize',
    description: 'When two graphene layers are stacked with a 1.1° twist, moire patterns in the atomic lattice create flat electronic bands. This "magic angle" enables superconductivity and exotic quantum states, launching a new field of twistronics.',
    connection: 'The game showed how slight angle changes dramatically affect moire patterns. In twisted bilayer graphene, the atomic-scale moire superlattice completely changes electronic properties - same physics, quantum scale.',
    howItWorks: 'Two graphene sheets stacked with slight twist. Moire pattern creates periodic potential for electrons. At magic angle (~1.1°), electronic bands flatten. Flat bands enhance interactions. Result: correlated insulator and superconductor phases.',
    stats: [
      { value: '1.1°', label: 'Magic twist angle', icon: '📐' },
      { value: '14nm', label: 'Moire wavelength', icon: '🔬' },
      { value: '1.7K', label: 'Superconducting Tc', icon: '❄️' }
    ],
    examples: ['Graphene superconductors', 'Moire excitons', 'Topological states', 'Quantum simulators'],
    companies: ['MIT', 'Columbia University', 'Stanford', 'Max Planck'],
    futureImpact: 'Moire quantum materials may enable room-temperature superconductors or fault-tolerant quantum computers.',
    color: '#22c55e'
  }
];

interface MoirePatternsRendererProps {
  gamePhase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  phase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const PHASE_ORDER = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'] as const;

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
  grid1: '#3b82f6',
  grid2: '#ef4444',
  moire: '#10b981',
  cyan: '#06b6d4',
  purple: '#a855f7',
};

const MoirePatternsRenderer: React.FC<MoirePatternsRendererProps> = ({
  gamePhase,
  phase: phaseProp,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase state for self-managing mode
  const [internalPhase, setInternalPhase] = useState<typeof PHASE_ORDER[number]>('hook');

  // Use gamePhase prop if provided, otherwise use internal phase management
  const phase = gamePhase || phaseProp || internalPhase;
  const currentPhaseIndex = PHASE_ORDER.indexOf(phase as typeof PHASE_ORDER[number]);

  // Simulation state
  const [angle, setAngle] = useState(5);
  const [spacing1, setSpacing1] = useState(10);
  const [spacing2, setSpacing2] = useState(10);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
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

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAngle(prev => (prev + 0.2) % 90);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (onPhaseComplete) {
      onPhaseComplete();
    } else {
      // Self-managing mode: advance to next phase
      const nextIndex = currentPhaseIndex + 1;
      if (nextIndex < PHASE_ORDER.length) {
        setInternalPhase(PHASE_ORDER[nextIndex]);
      }
    }
  }, [onPhaseComplete, currentPhaseIndex]);

  const handleBack = useCallback(() => {
    const prevIndex = currentPhaseIndex - 1;
    if (prevIndex >= 0) {
      setInternalPhase(PHASE_ORDER[prevIndex]);
    }
  }, [currentPhaseIndex]);

  const handlePhaseClick = useCallback((index: number) => {
    if (index >= 0 && index < PHASE_ORDER.length) {
      setInternalPhase(PHASE_ORDER[index]);
    }
  }, []);

  const predictions = [
    { id: 'nothing', label: 'Nothing special - just two overlapping grids' },
    { id: 'blur', label: 'The pattern becomes blurry and hard to see' },
    { id: 'moire', label: 'Large-scale bands or waves appear that drift as you rotate' },
    { id: 'colors', label: 'Rainbow colors emerge from the interference' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'The moire pattern stays exactly the same' },
    { id: 'speed', label: 'The pattern bands move faster or in a different direction' },
    { id: 'disappear', label: 'The moire pattern disappears completely' },
    { id: 'color', label: 'The pattern changes color' },
  ];

  const transferApplications = [
    {
      title: 'Anti-Counterfeiting Security',
      description: 'Currency and documents use moire patterns as security features. When photocopied, hidden patterns become visible or distorted.',
      question: 'Why do moire patterns help detect counterfeit money?',
      answer: 'Copiers and scanners use fixed sampling grids. When these interact with the document\'s fine patterns, moire fringes appear that aren\'t on the original, revealing the copy.',
    },
    {
      title: 'Screen Door Effect in VR',
      description: 'Early VR headsets showed visible pixel grids. When your eyes\' accommodation changed, moire patterns could appear.',
      question: 'How do modern VR displays reduce the screen door effect?',
      answer: 'Higher pixel density reduces the grid spacing until it\'s below visual resolution. Some displays also use pentile layouts or diffusers to break up regular patterns.',
    },
    {
      title: 'Strain Measurement',
      description: 'Engineers overlay reference grids on structures. When the structure deforms under load, moire fringes reveal the strain pattern.',
      question: 'How do moire fringes measure tiny deformations?',
      answer: 'Small displacement changes the relative alignment of overlaid grids. This creates large-scale fringe shifts that are easy to measure, amplifying tiny strains into visible patterns.',
    },
    {
      title: 'TV/Monitor Filming',
      description: 'When filming screens, moire patterns often appear as wavy rainbow bands rolling across the image.',
      question: 'Why do moire patterns appear when filming screens?',
      answer: 'The camera sensor\'s pixel grid interacts with the screen\'s pixel grid. Different sampling rates create beat frequencies that appear as moving bands.',
    },
  ];

  const testQuestions = [
    {
      question: 'What creates moire patterns?',
      options: [
        { text: 'Wave interference like light diffraction', correct: false },
        { text: 'Spatial beating between two similar periodic patterns', correct: true },
        { text: 'Chemical reactions between overlapping materials', correct: false },
        { text: 'Magnetic field interactions', correct: false },
      ],
    },
    {
      question: 'When two identical grids are overlaid at a small angle, the moire bands are:',
      options: [
        { text: 'Parallel to the grids', correct: false },
        { text: 'Perpendicular to the grids', correct: false },
        { text: 'At an angle bisecting the two grid orientations', correct: true },
        { text: 'Circular', correct: false },
      ],
    },
    {
      question: 'As the angle between two grids increases (up to a point), the moire pattern:',
      options: [
        { text: 'Gets larger and more spaced out', correct: false },
        { text: 'Gets smaller and more closely spaced', correct: true },
        { text: 'Stays the same size', correct: false },
        { text: 'Changes color', correct: false },
      ],
    },
    {
      question: 'Moire patterns are an example of:',
      options: [
        { text: 'Optical illusion with no physical basis', correct: false },
        { text: 'Spatial aliasing or beat phenomenon', correct: true },
        { text: 'Quantum interference', correct: false },
        { text: 'Thermal effects', correct: false },
      ],
    },
    {
      question: 'If one grid has slightly different spacing than the other, the moire pattern:',
      options: [
        { text: 'Disappears completely', correct: false },
        { text: 'Shows bands even at zero rotation angle', correct: true },
        { text: 'Becomes three-dimensional', correct: false },
        { text: 'Only appears under UV light', correct: false },
      ],
    },
    {
      question: 'Moving one grid relative to the other causes the moire pattern to:',
      options: [
        { text: 'Stay stationary', correct: false },
        { text: 'Move in an amplified way (faster than the grid motion)', correct: true },
        { text: 'Move slower than the grid motion', correct: false },
        { text: 'Fade away', correct: false },
      ],
    },
    {
      question: 'The wavelength of moire fringes depends on:',
      options: [
        { text: 'The color of light used', correct: false },
        { text: 'The temperature of the room', correct: false },
        { text: 'The angle and spacing differences between grids', correct: true },
        { text: 'The thickness of the grids', correct: false },
      ],
    },
    {
      question: 'Why are moire patterns useful for measuring small displacements?',
      options: [
        { text: 'They amplify small changes into large visible effects', correct: true },
        { text: 'They are very colorful and easy to photograph', correct: false },
        { text: 'They require no equipment', correct: false },
        { text: 'They work at any scale', correct: false },
      ],
    },
    {
      question: 'Scanning a document with fine line patterns often produces moire because:',
      options: [
        { text: 'The scanner light is too bright', correct: false },
        { text: 'Scanner pixels interact with document patterns', correct: true },
        { text: 'The paper is too thin', correct: false },
        { text: 'The document is old', correct: false },
      ],
    },
    {
      question: 'To minimize moire when photographing fabric patterns, you should:',
      options: [
        { text: 'Use a higher resolution camera only', correct: false },
        { text: 'Rotate the camera or subject to avoid alignment', correct: true },
        { text: 'Use black and white mode', correct: false },
        { text: 'Move closer to the subject', correct: false },
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

  // Navigation bar component
  const renderNavBar = () => {
    const progress = ((currentPhaseIndex + 1) / PHASE_ORDER.length) * 100;

    return (
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)',
        borderBottom: '1px solid rgba(139, 92, 246, 0.3)',
        backdropFilter: 'blur(12px)',
        padding: '12px 16px',
      }}>
        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${currentPhaseIndex + 1} of ${PHASE_ORDER.length} phases`}
          style={{
            width: '100%',
            height: '4px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '2px',
            marginBottom: '12px',
            overflow: 'hidden',
          }}
        >
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #8b5cf6 0%, #06b6d4 100%)',
            borderRadius: '2px',
            transition: 'width 0.3s ease',
          }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          {/* Back button */}
          <button
            onClick={handleBack}
            disabled={currentPhaseIndex === 0}
            aria-label="Back"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              padding: '10px 16px',
              borderRadius: '10px',
              border: `1px solid ${currentPhaseIndex === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(139, 92, 246, 0.4)'}`,
              background: currentPhaseIndex === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(139, 92, 246, 0.1)',
              color: currentPhaseIndex === 0 ? colors.textMuted : colors.textSecondary,
              cursor: currentPhaseIndex === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              opacity: currentPhaseIndex === 0 ? 0.5 : 1,
            }}
          >
            Back
          </button>

          {/* Phase dots */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            {PHASE_ORDER.map((p, index) => (
              <button
                key={p}
                onClick={() => handlePhaseClick(index)}
                aria-label={`${p} phase`}
                aria-current={index === currentPhaseIndex ? 'step' : undefined}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  background: index === currentPhaseIndex
                    ? 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)'
                    : index < currentPhaseIndex
                      ? colors.success
                      : 'rgba(255,255,255,0.2)',
                  boxShadow: index === currentPhaseIndex ? '0 0 8px rgba(139, 92, 246, 0.6)' : 'none',
                  transition: 'all 0.2s ease',
                  padding: 0,
                }}
              />
            ))}
          </div>

          {/* Next button */}
          <button
            onClick={handleNext}
            aria-label="Next"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            Next
          </button>
        </div>
      </nav>
    );
  };

  // Premium SVG Visualization with comprehensive defs
  const renderVisualization = (interactive: boolean) => {
    const width = 500;
    const height = 420;
    const centerX = width / 2;
    const centerY = height / 2 - 20;
    const gridSize = 140;

    // Generate grid lines with premium styling
    const generateGridLines = (spacing: number, rotation: number, gradientId: string, ox: number, oy: number) => {
      const lines = [];
      const numLines = Math.ceil(gridSize * 2 / spacing) + 2;
      const rad = (rotation * Math.PI) / 180;

      for (let i = -numLines; i <= numLines; i++) {
        const offset = i * spacing + ox;
        const x1 = centerX + offset * Math.cos(rad) - gridSize * Math.sin(rad);
        const y1 = centerY + offset * Math.sin(rad) + gridSize * Math.cos(rad);
        const x2 = centerX + offset * Math.cos(rad) + gridSize * Math.sin(rad);
        const y2 = centerY + offset * Math.sin(rad) - gridSize * Math.cos(rad);

        lines.push(
          <line
            key={`v${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={`url(#${gradientId})`}
            strokeWidth={1.5}
            opacity={0.8}
          />
        );
      }
      return lines;
    };

    // Calculate moire period for display
    const moirePeriod = angle > 0.1 ? (spacing1 / (2 * Math.sin(angle * Math.PI / 360))).toFixed(1) : 'Very large';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            background: 'linear-gradient(135deg, #030712 0%, #0a0f1a 50%, #030712 100%)',
            borderRadius: '16px',
            maxWidth: '550px',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 60px rgba(139, 92, 246, 0.1)'
          }}
        >
          {/* Comprehensive Premium Defs Section */}
          <defs>
            {/* === LINEAR GRADIENTS WITH 4-6 COLOR STOPS FOR DEPTH === */}

            {/* Grid 1 Premium Gradient - Blue spectrum with depth */}
            <linearGradient id="moirGrid1Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
              <stop offset="25%" stopColor="#3b82f6" stopOpacity="1" />
              <stop offset="50%" stopColor="#2563eb" stopOpacity="0.95" />
              <stop offset="75%" stopColor="#1d4ed8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0.85" />
            </linearGradient>

            {/* Grid 2 Premium Gradient - Red/Orange spectrum with depth */}
            <linearGradient id="moirGrid2Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.9" />
              <stop offset="20%" stopColor="#f87171" stopOpacity="1" />
              <stop offset="40%" stopColor="#ef4444" stopOpacity="0.95" />
              <stop offset="60%" stopColor="#dc2626" stopOpacity="0.9" />
              <stop offset="80%" stopColor="#b91c1c" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#991b1b" stopOpacity="0.8" />
            </linearGradient>

            {/* Interference Zone Gradient - Purple/Cyan blend */}
            <linearGradient id="moirInterferenceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
              <stop offset="25%" stopColor="#8b5cf6" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="75%" stopColor="#8b5cf6" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.6" />
            </linearGradient>

            {/* Control Panel Metal Gradient */}
            <linearGradient id="moirPanelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="20%" stopColor="#4b5563" />
              <stop offset="40%" stopColor="#374151" />
              <stop offset="60%" stopColor="#4b5563" />
              <stop offset="80%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Frame Gradient with depth */}
            <linearGradient id="moirFrameGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="25%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#7c3aed" />
              <stop offset="75%" stopColor="#6d28d9" />
              <stop offset="100%" stopColor="#5b21b6" />
            </linearGradient>

            {/* === RADIAL GRADIENTS FOR PATTERN EFFECTS === */}

            {/* Center Glow Effect */}
            <radialGradient id="moirCenterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
              <stop offset="40%" stopColor="#6366f1" stopOpacity="0.2" />
              <stop offset="70%" stopColor="#4f46e5" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#4338ca" stopOpacity="0" />
            </radialGradient>

            {/* Interference Pattern Radial */}
            <radialGradient id="moirPatternRadial" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="30%" stopColor="#06b6d4" stopOpacity="0.2" />
              <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0" />
            </radialGradient>

            {/* Button Glow Radial */}
            <radialGradient id="moirButtonGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="1" />
              <stop offset="50%" stopColor="#16a34a" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#15803d" stopOpacity="0.4" />
            </radialGradient>

            {/* Rotation Indicator Glow */}
            <radialGradient id="moirRotationGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
              <stop offset="40%" stopColor="#d97706" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
            </radialGradient>

            {/* === GLOW FILTERS USING feGaussianBlur + feMerge === */}

            {/* Primary Glow Filter */}
            <filter id="moirPrimaryGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur1" />
              <feGaussianBlur stdDeviation="8" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Intense Glow for Accent Elements */}
            <filter id="moirIntenseGlow" x="-150%" y="-150%" width="400%" height="400%">
              <feGaussianBlur stdDeviation="3" result="blur1" />
              <feGaussianBlur stdDeviation="6" result="blur2" />
              <feGaussianBlur stdDeviation="12" result="blur3" />
              <feMerge>
                <feMergeNode in="blur3" />
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft Inner Glow */}
            <filter id="moirSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Grid Line Glow */}
            <filter id="moirGridGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Interference Highlight Filter */}
            <filter id="moirInterferenceFilter" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur1" />
              <feGaussianBlur stdDeviation="5" result="blur2" />
              <feBlend in="blur1" in2="blur2" mode="screen" result="blended" />
              <feMerge>
                <feMergeNode in="blended" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Clip path for circular view */}
            <clipPath id="moirGridClip">
              <circle cx={centerX} cy={centerY} r={gridSize} />
            </clipPath>

            {/* Background Pattern */}
            <pattern id="moirLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* Premium Lab Background */}
          <rect width={width} height={height} fill="#030712" />
          <rect width={width} height={height} fill="url(#moirLabGrid)" />

          {/* Ambient Glow Background */}
          <ellipse
            cx={centerX}
            cy={centerY}
            rx={gridSize + 60}
            ry={gridSize + 60}
            fill="url(#moirCenterGlow)"
          />

          {/* === TITLE AND HEADER === */}
          <text
            x={centerX}
            y="28"
            textAnchor="middle"
            fill="#f8fafc"
            fontSize="16"
            fontWeight="bold"
            style={{ letterSpacing: '0.05em' }}
          >
            MOIRE PATTERN LABORATORY
          </text>
          <line x1="100" y1="40" x2={width - 100} y2="40" stroke="url(#moirFrameGradient)" strokeWidth="1" opacity="0.5" />

          {/* === INTERFERENCE VISUALIZATION LAYER === */}
          <g clipPath="url(#moirGridClip)">
            {/* Background interference pattern overlay */}
            <circle
              cx={centerX}
              cy={centerY}
              r={gridSize}
              fill="url(#moirPatternRadial)"
            />

            {/* First grid (blue) - no rotation */}
            <g filter="url(#moirGridGlow)">
              {generateGridLines(spacing1, 0, 'moirGrid1Gradient', 0, 0)}
            </g>

            {/* Second grid (red) - rotated */}
            <g filter="url(#moirGridGlow)">
              {generateGridLines(spacing2, angle, 'moirGrid2Gradient', offsetX, offsetY)}
            </g>

            {/* Interference pattern visualization overlay */}
            {angle > 1 && (
              <circle
                cx={centerX}
                cy={centerY}
                r={gridSize - 5}
                fill="none"
                stroke="url(#moirInterferenceGradient)"
                strokeWidth="2"
                opacity={0.3}
              />
            )}
          </g>

          {/* === PREMIUM BORDER RING === */}
          <circle
            cx={centerX}
            cy={centerY}
            r={gridSize + 5}
            fill="none"
            stroke="url(#moirFrameGradient)"
            strokeWidth="4"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={gridSize}
            fill="none"
            stroke="#1e293b"
            strokeWidth="2"
          />

          {/* === ROTATION/SPACING CONTROLS VISUALIZATION === */}

          {/* Rotation Arc Indicator */}
          <g transform={`translate(${centerX}, ${centerY})`}>
            {/* Reference line (0 degrees) */}
            <line
              x1={gridSize + 15}
              y1="0"
              x2={gridSize + 35}
              y2="0"
              stroke="#3b82f6"
              strokeWidth="2"
              opacity="0.7"
            />

            {/* Rotated line indicator */}
            <line
              x1={(gridSize + 15) * Math.cos(-angle * Math.PI / 180)}
              y1={(gridSize + 15) * Math.sin(-angle * Math.PI / 180)}
              x2={(gridSize + 35) * Math.cos(-angle * Math.PI / 180)}
              y2={(gridSize + 35) * Math.sin(-angle * Math.PI / 180)}
              stroke="#ef4444"
              strokeWidth="2"
              opacity="0.7"
            />

            {/* Arc showing angle */}
            {angle > 0 && (
              <path
                d={`M ${gridSize + 25} 0 A ${gridSize + 25} ${gridSize + 25} 0 0 0 ${(gridSize + 25) * Math.cos(-angle * Math.PI / 180)} ${(gridSize + 25) * Math.sin(-angle * Math.PI / 180)}`}
                fill="none"
                stroke="url(#moirInterferenceGradient)"
                strokeWidth="2"
                strokeDasharray="4 2"
                filter="url(#moirSoftGlow)"
              />
            )}
          </g>

          {/* === INFO PANELS === */}

          {/* Left Panel - Grid 1 Info */}
          <rect x="10" y="42" width="90" height="34" rx="6" fill="#111827" stroke="#3b82f6" strokeWidth="1" opacity="0.9" />
          <text x="55" y="55" textAnchor="middle" fill="#60a5fa" fontSize="11" fontWeight="bold">GRID 1</text>
          <text x="15" y="70" fill="#e2e8f0" fontSize="11">{spacing1}px 0°</text>

          {/* Right Panel - Grid 2 Info */}
          <rect x={width - 100} y="42" width="90" height="34" rx="6" fill="#111827" stroke="#ef4444" strokeWidth="1" opacity="0.9" />
          <text x={width - 55} y="55" textAnchor="middle" fill="#fca5a5" fontSize="11" fontWeight="bold">GRID 2</text>
          <text x={width - 95} y="70" fill="#e2e8f0" fontSize="11">{spacing2}px {angle.toFixed(1)}°</text>

          {/* Interactive marker that moves with angle */}
          <circle
            cx={centerX + (angle / 45) * 80}
            cy={centerY - 10 + (angle / 45) * 60}
            r="8"
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth="2"
            filter="url(#moirSoftGlow)"
          />

          {/* Bottom Panel - Moire Info with formula */}
          <rect x={centerX - 100} y={height - 80} width="200" height="58" rx="10" fill="#111827" stroke="url(#moirFrameGradient)" strokeWidth="1.5" opacity="0.95" />
          <text x={centerX} y={height - 63} textAnchor="middle" fill="#a855f7" fontSize="11" fontWeight="bold">ANALYSIS</text>
          <text x={centerX - 90} y={height - 47} fill="#e2e8f0" fontSize="11">Period: {moirePeriod}px</text>
          <text x={centerX - 90} y={height - 30} fill="#cbd5e1" fontSize="11">Rot: {angle.toFixed(1)}°</text>

          {/* Angle indicator in corner */}
          <text x={width - 35} y={height - 126} textAnchor="middle" fill="#f59e0b" fontSize="11">Angle</text>
          <circle cx={width - 35} cy={height - 100} r="20" fill="#111827" stroke="#f59e0b" strokeWidth="1" opacity="0.9" />
          <circle cx={width - 35} cy={height - 100} r="3" fill="url(#moirRotationGlow)" filter="url(#moirIntenseGlow)" />
          <line
            x1={width - 35}
            y1={height - 100}
            x2={width - 35 + 15 * Math.cos(-angle * Math.PI / 180 - Math.PI/2)}
            y2={height - 100 + 15 * Math.sin(-angle * Math.PI / 180 - Math.PI/2)}
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <text x={width - 35} y={height - 72} textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">{angle.toFixed(0)}°</text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '14px 28px',
                minHeight: '44px',
                borderRadius: '12px',
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
              {isAnimating ? 'Stop Animation' : 'Start Animation'}
            </button>
            <button
              onClick={() => { setAngle(5); setSpacing1(10); setSpacing2(10); setOffsetX(0); setOffsetY(0); }}
              style={{
                padding: '14px 28px',
                minHeight: '44px',
                borderRadius: '12px',
                border: `2px solid ${colors.accent}`,
                background: 'rgba(139, 92, 246, 0.1)',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease',
              }}
            >
              Reset Values
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      background: 'rgba(15, 23, 42, 0.8)',
      borderRadius: '16px',
      border: '1px solid rgba(139, 92, 246, 0.2)',
      margin: '0 16px',
    }}>
      <div>
        <label style={{
          color: colors.textSecondary,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          fontSize: '14px',
        }}>
          <span>Rotation Angle</span>
          <span style={{
            color: colors.accent,
            fontWeight: 'bold',
            background: 'rgba(139, 92, 246, 0.2)',
            padding: '4px 12px',
            borderRadius: '8px',
          }}>{angle.toFixed(1)}deg</span>
        </label>
        <input
          type="range"
          min="0"
          max="45"
          step="0.5"
          value={angle}
          onChange={(e) => setAngle(parseFloat(e.target.value))}
          style={{ touchAction: 'pan-y',
            width: '100%',
            accentColor: colors.accent,
            height: '20px',
          }}
        />
      </div>

      <div>
        <label style={{
          color: colors.textSecondary,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          fontSize: '14px',
        }}>
          <span>Grid 1 Spacing</span>
          <span style={{
            color: colors.grid1,
            fontWeight: 'bold',
            background: 'rgba(59, 130, 246, 0.2)',
            padding: '4px 12px',
            borderRadius: '8px',
          }}>{spacing1}px</span>
        </label>
        <input
          type="range"
          min="6"
          max="20"
          step="1"
          value={spacing1}
          onChange={(e) => setSpacing1(parseInt(e.target.value))}
          style={{ touchAction: 'pan-y',
            width: '100%',
            accentColor: colors.grid1,
            height: '20px',
          }}
        />
      </div>

      <div>
        <label style={{
          color: colors.textSecondary,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          fontSize: '14px',
        }}>
          <span>Grid 2 Spacing</span>
          <span style={{
            color: colors.grid2,
            fontWeight: 'bold',
            background: 'rgba(239, 68, 68, 0.2)',
            padding: '4px 12px',
            borderRadius: '8px',
          }}>{spacing2}px</span>
        </label>
        <input
          type="range"
          min="6"
          max="20"
          step="1"
          value={spacing2}
          onChange={(e) => setSpacing2(parseInt(e.target.value))}
          style={{ touchAction: 'pan-y',
            width: '100%',
            accentColor: colors.grid2,
            height: '20px',
          }}
        />
      </div>

      <div style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
        padding: '16px',
        borderRadius: '12px',
        border: `1px solid ${colors.accent}`,
      }}>
        <div style={{
          color: colors.textPrimary,
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: colors.moire,
            boxShadow: `0 0 10px ${colors.moire}`,
          }} />
          Moire Period: {(spacing1 / (2 * Math.sin(angle * Math.PI / 360))).toFixed(1)}px | Frequency: {(1000 / (spacing1 / (2 * Math.sin(angle * Math.PI / 360)))).toFixed(1)} Hz
        </div>
        <div style={{ color: colors.textMuted, fontSize: '12px', lineHeight: 1.5, display: 'flex', flexDirection: 'row' as const, gap: '12px', flexWrap: 'wrap' as const }}>
          <span>Reference baseline: {spacing1}px grid vs current {spacing2}px grid</span>
          <span>Smaller angle or spacing difference creates larger moire bands</span>
        </div>
      </div>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #020617 50%, #0f172a 100%)' }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '80px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{
              color: colors.accent,
              fontSize: '32px',
              marginBottom: '8px',
              textShadow: '0 0 30px rgba(139, 92, 246, 0.5)',
            }}>
              The Ghost Patterns
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px', fontWeight: 400 }}>
              How can two simple grids create giant moving patterns?
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
              padding: '24px',
              borderRadius: '16px',
              marginBottom: '16px',
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.7, fontWeight: 400 }}>
                Overlay two window screens, or look through two layers of sheer fabric.
                Rotate one slightly and mysterious waves appear - waves that don't
                exist in either pattern alone!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px', fontWeight: 400 }}>
                These are moire patterns - interference without waves.
              </p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
              padding: '16px',
              borderRadius: '12px',
              border: `1px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 400 }}>
                Click "Start Animation" to slowly rotate one grid and watch the moire dance!
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #020617 50%, #0f172a 100%)' }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px', marginBottom: '8px' }}>Make Your Prediction</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Step 1 of 2: What do you think will happen?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
            margin: '16px',
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid rgba(139, 92, 246, 0.2)',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: '16px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Two identical line grids overlaid on each other. The blue grid is fixed.
              The red grid can be rotated. Where lines overlap or nearly align, the
              combined density creates patterns.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '16px', fontSize: '18px' }}>
              When you slowly rotate one grid relative to the other, what happens?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '18px',
                    minHeight: '44px',
                    borderRadius: '12px',
                    border: prediction === p.id
                      ? `2px solid ${colors.accent}`
                      : '1px solid rgba(255,255,255,0.15)',
                    background: prediction === p.id
                      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)'
                      : 'rgba(15, 23, 42, 0.8)',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    boxShadow: prediction === p.id ? '0 0 20px rgba(139, 92, 246, 0.3)' : 'none',
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #020617 50%, #0f172a 100%)' }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: '22px' }}>Explore Moire Patterns</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust angle and spacing to see how moire fringes change
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
            margin: '16px',
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid rgba(139, 92, 246, 0.2)',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '12px', fontSize: '16px' }}>Observation Guide:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px', fontWeight: 400 }}>
              Observe how the moire pattern changes as you adjust the controls. Notice the relationship between angle, spacing, and pattern size.
            </p>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 2, paddingLeft: '20px', margin: 0 }}>
              <li>Small angle (1-5deg) creates large, slow-moving bands</li>
              <li>Larger angle (15-30deg) creates smaller, faster bands</li>
              <li>Change one grid's spacing to see bands even at 0deg!</li>
              <li>Animate to see the pattern drift</li>
            </ul>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
            margin: '16px',
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}>
            <h4 style={{ color: colors.success, marginBottom: '12px', fontSize: '16px' }}>Real-World Relevance:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7, fontWeight: 400 }}>
              Moire patterns have important real-world applications in precision measurement instruments, anti-counterfeiting on currency, and security printing. Engineers must carefully avoid unwanted moire when photographing screens or designing displays.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'moire';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #020617 50%, #0f172a 100%)' }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '80px' }}>
          <div style={{
            background: wasCorrect
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)'
              : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%)',
            margin: '16px',
            padding: '24px',
            borderRadius: '16px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{
              color: wasCorrect ? colors.success : colors.error,
              marginBottom: '8px',
              fontSize: '20px',
            }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '8px', fontWeight: 400 }}>
              You predicted: {predictions.find(p => p.id === prediction)?.label || 'No prediction made'}
            </p>
            <p style={{ color: colors.textPrimary, fontSize: '16px' }}>
              Large-scale bands appear and drift - the moire effect!
            </p>
          </div>

          {/* SVG diagram for review */}
          <div style={{ padding: '0 16px', marginBottom: '16px' }}>
            <svg width="100%" height="120" viewBox="0 0 400 120" style={{ maxWidth: '400px', display: 'block', margin: '0 auto' }}>
              <defs>
                <linearGradient id="reviewGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <rect x="10" y="10" width="180" height="100" rx="8" fill="rgba(30,41,59,0.8)" stroke="#3b82f6" strokeWidth="2" />
              <text x="100" y="35" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold">Spatial Beating</text>
              <text x="100" y="55" textAnchor="middle" fill="#e2e8f0" fontSize="11">Two frequencies</text>
              <text x="100" y="70" textAnchor="middle" fill="#e2e8f0" fontSize="11">create visible beats</text>

              <rect x="210" y="10" width="180" height="100" rx="8" fill="rgba(30,41,59,0.8)" stroke="#8b5cf6" strokeWidth="2" />
              <text x="300" y="35" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold">Amplification</text>
              <text x="300" y="55" textAnchor="middle" fill="#e2e8f0" fontSize="11">Small differences</text>
              <text x="300" y="70" textAnchor="middle" fill="#e2e8f0" fontSize="11">large patterns</text>
            </svg>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
            margin: '16px',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid rgba(139, 92, 246, 0.2)',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '16px', fontSize: '18px' }}>The Physics of Moire</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8 }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Spatial Beating:</strong> Just as two
                similar frequencies create audible "beats," two similar spatial frequencies create
                visible moire bands. This demonstrates the principle of spatial interference,
                because the pattern is the "beat frequency" in space.
              </p>
              <p style={{
                marginBottom: '16px',
                background: 'rgba(139, 92, 246, 0.15)',
                padding: '12px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                textAlign: 'center' as const,
              }}>
                <strong style={{ color: colors.accent }}>Formula:</strong>{' '}
                <span style={{ color: colors.textPrimary }}>
                  Moire Period = d / (2 sin(theta/2))
                </span>
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Amplification:</strong> Small differences
                in spacing or angle create large-scale patterns. The reason is that moving one grid slightly causes
                the moire to shift dramatically - amplifying tiny motions.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>No Waves Required:</strong> Unlike
                diffraction, moire patterns are purely geometric because they arise from the overlap
                of two periodic structures, not from wave interference.
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #020617 50%, #0f172a 100%)' }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{
              color: colors.warning,
              marginBottom: '8px',
              fontSize: '24px',
              textShadow: '0 0 20px rgba(245, 158, 11, 0.4)',
            }}>The Twist</h2>
            <p style={{ color: colors.textSecondary, fontSize: '16px', marginBottom: '8px' }}>
              What if one grid is slightly stretched (different spacing)?
            </p>
            <p style={{ color: colors.textMuted, fontSize: '14px' }}>
              Step 1 of 2: Make your prediction
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
            margin: '16px',
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid rgba(245, 158, 11, 0.3)',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: '16px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Imagine one grid is printed on stretched plastic, so its line spacing is
              slightly different from the other grid. Now the grids have different periods.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '16px', fontSize: '18px' }}>
              With different grid spacings, what happens to the moire?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '18px',
                    minHeight: '44px',
                    borderRadius: '12px',
                    border: twistPrediction === p.id
                      ? `2px solid ${colors.warning}`
                      : '1px solid rgba(255,255,255,0.15)',
                    background: twistPrediction === p.id
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%)'
                      : 'rgba(15, 23, 42, 0.8)',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    boxShadow: twistPrediction === p.id ? '0 0 20px rgba(245, 158, 11, 0.3)' : 'none',
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #020617 50%, #0f172a 100%)' }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px', fontSize: '22px' }}>Test Spacing Differences</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Change the spacing of Grid 2 and observe the effects
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.15) 100%)',
            margin: '16px',
            padding: '20px',
            borderRadius: '16px',
            border: `1px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '10px', fontSize: '16px' }}>Observation Guide:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Observe how spacing differences affect the moire pattern. Even at zero angle, spacing differences create moire bands! As you rotate,
              the bands move faster or change direction depending on which effect dominates.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'speed';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #020617 50%, #0f172a 100%)' }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '80px' }}>
          <div style={{
            background: wasCorrect
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)'
              : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%)',
            margin: '16px',
            padding: '24px',
            borderRadius: '16px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{
              color: wasCorrect ? colors.success : colors.error,
              marginBottom: '8px',
              fontSize: '20px',
            }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '8px', fontWeight: 400 }}>
              You predicted: {twistPredictions.find(p => p.id === twistPrediction)?.label || 'No prediction made'}
            </p>
            <p style={{ color: colors.textPrimary, fontSize: '16px' }}>
              Spacing differences change the pattern's speed and direction of movement!
            </p>
          </div>

          {/* SVG diagram for twist review */}
          <div style={{ padding: '0 16px', marginBottom: '16px' }}>
            <svg width="100%" height="120" viewBox="0 0 400 120" style={{ maxWidth: '400px', display: 'block', margin: '0 auto' }}>
              <rect x="10" y="10" width="180" height="100" rx="8" fill="rgba(30,41,59,0.8)" stroke="#f59e0b" strokeWidth="2" />
              <text x="100" y="35" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold">Rotational Moire</text>
              <text x="100" y="55" textAnchor="middle" fill="#e2e8f0" fontSize="11">Angle differences</text>
              <text x="100" y="70" textAnchor="middle" fill="#e2e8f0" fontSize="11">perpendicular bands</text>

              <rect x="210" y="10" width="180" height="100" rx="8" fill="rgba(30,41,59,0.8)" stroke="#22c55e" strokeWidth="2" />
              <text x="300" y="35" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold">Scaling Moire</text>
              <text x="300" y="55" textAnchor="middle" fill="#e2e8f0" fontSize="11">Spacing differences</text>
              <text x="300" y="70" textAnchor="middle" fill="#e2e8f0" fontSize="11">bands at zero angle</text>
            </svg>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
            margin: '16px',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid rgba(245, 158, 11, 0.3)',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '16px', fontSize: '18px' }}>Two Types of Moire</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8 }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Rotational Moire:</strong> From angle
                differences. Bands are perpendicular to the rotation bisector.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Scaling Moire:</strong> From spacing
                differences. Creates bands even at zero angle.
              </p>
              <p>
                When both are present, they combine to determine the final pattern's
                orientation and sensitivity to motion. This is why stretching or
                compressing one grid dramatically changes the pattern behavior!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const currentApp = realWorldApps[currentTransferApp];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #020617 50%, #0f172a 100%)' }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center', fontSize: '22px' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '8px', fontSize: '14px' }}>
              Moire patterns appear in technology, security, and measurement
            </p>
            <p style={{ color: colors.textMuted, fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>
              Application {currentTransferApp + 1} of {realWorldApps.length}
            </p>
          </div>

          {/* Current application card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
            margin: '16px',
            padding: '24px',
            borderRadius: '16px',
            border: `2px solid ${currentApp.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '32px' }}>{currentApp.icon}</span>
              <div>
                <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 'bold' }}>{currentApp.title}</h3>
                <p style={{ color: colors.textSecondary, fontSize: '12px' }}>{currentApp.tagline}</p>
              </div>
            </div>

            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '16px', lineHeight: 1.6 }}>
              {currentApp.description}
            </p>

            <div style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <h4 style={{ color: currentApp.color, fontSize: '14px', marginBottom: '8px' }}>Connection to What You Learned:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6, marginBottom: '12px' }}>{currentApp.connection}</p>
              <h4 style={{ color: currentApp.color, fontSize: '14px', marginBottom: '8px' }}>How It Works:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6 }}>{currentApp.howItWorks}</p>
            </div>

            <div style={{
              background: 'rgba(0,0,0,0.2)',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
            }}>
              <h4 style={{ color: currentApp.color, fontSize: '13px', marginBottom: '6px' }}>Future Impact:</h4>
              <p style={{ color: colors.textMuted, fontSize: '12px', lineHeight: 1.5 }}>{currentApp.futureImpact}</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {currentApp.stats.map((stat, i) => (
                <div key={i} style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '12px',
                  borderRadius: '8px',
                  flex: '1',
                  minWidth: '80px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: currentApp.color }}>{stat.value}</div>
                  <div style={{ fontSize: '10px', color: colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation between apps */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '0 16px', marginBottom: '16px' }}>
            {realWorldApps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTransferApp(index)}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  background: index === currentTransferApp
                    ? 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)'
                    : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>

          {/* Got It button */}
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <button
              onClick={handleNext}
              style={{
                padding: '16px 48px',
                minHeight: '44px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '16px',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              Got It - Continue
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
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #020617 50%, #0f172a 100%)' }}>
          {renderNavBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '80px' }}>
            <div style={{
              background: testScore >= 8
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)'
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%)',
              margin: '16px',
              padding: '28px',
              borderRadius: '16px',
              textAlign: 'center',
              border: `2px solid ${testScore >= 8 ? colors.success : colors.error}`,
            }}>
              <h2 style={{
                color: testScore >= 8 ? colors.success : colors.error,
                marginBottom: '12px',
                fontSize: '24px',
              }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '32px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '12px', fontSize: '14px' }}>
                {testScore >= 8 ? 'You\'ve mastered moire patterns!' : 'Review the material and try again.'}
              </p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
                  margin: '16px',
                  padding: '18px',
                  borderRadius: '12px',
                  borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`
                }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '14px', fontWeight: 'bold', fontSize: '14px' }}>Question {qIndex + 1} of {testQuestions.length}: {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{
                      padding: '10px 14px',
                      marginBottom: '6px',
                      borderRadius: '8px',
                      background: opt.correct
                        ? 'rgba(16, 185, 129, 0.2)'
                        : userAnswer === oIndex
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'transparent',
                      color: opt.correct
                        ? colors.success
                        : userAnswer === oIndex
                          ? colors.error
                          : colors.textSecondary,
                      fontSize: '13px',
                    }}>
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''} {opt.text}
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #020617 50%, #0f172a 100%)' }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '80px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: '20px' }}>Knowledge Test</h2>
              <span style={{
                color: colors.accent,
                fontWeight: 'bold',
                background: 'rgba(139, 92, 246, 0.2)',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '14px',
              }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
            </div>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '16px', lineHeight: 1.6 }}>
              You have explored how two overlapping periodic grids create moire interference patterns through spatial beating.
              You discovered that the moire period depends on the angle between grids and their spacing differences.
              Now test your understanding of these concepts, including rotational moire, scaling moire, amplification effects,
              and real-world applications in security printing, precision measurement, display technology, and strain analysis.
            </p>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    background: testAnswers[i] !== null
                      ? 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)'
                      : i === currentTestQuestion
                        ? colors.textMuted
                        : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                />
              ))}
            </div>
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
              padding: '22px',
              borderRadius: '16px',
              marginBottom: '20px',
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '18px',
                    minHeight: '44px',
                    borderRadius: '12px',
                    border: testAnswers[currentTestQuestion] === oIndex
                      ? `2px solid ${colors.accent}`
                      : '1px solid rgba(255,255,255,0.15)',
                    background: testAnswers[currentTestQuestion] === oIndex
                      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)'
                      : 'rgba(15, 23, 42, 0.8)',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    boxShadow: testAnswers[currentTestQuestion] === oIndex ? '0 0 15px rgba(139, 92, 246, 0.3)' : 'none',
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
                padding: '12px 28px',
                minHeight: '44px',
                borderRadius: '10px',
                border: `1px solid ${colors.textMuted}`,
                background: 'rgba(15, 23, 42, 0.8)',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: currentTestQuestion === 0 ? 0.5 : 1,
              }}
            >
              Previous
            </button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 28px',
                  minHeight: '44px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                }}
              >
                Next Question
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 28px',
                  minHeight: '44px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.includes(null)
                    ? 'rgba(255,255,255,0.1)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  boxShadow: testAnswers.includes(null) ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.3)',
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #020617 50%, #0f172a 100%)' }}>
        {renderNavBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '80px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              fontSize: '72px',
              marginBottom: '16px',
              textShadow: '0 0 40px rgba(139, 92, 246, 0.6)',
            }}>🏆</div>
            <h1 style={{
              color: colors.success,
              marginBottom: '8px',
              fontSize: '28px',
              textShadow: '0 0 30px rgba(16, 185, 129, 0.5)',
            }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px', fontSize: '16px' }}>
              You've mastered moire patterns and spatial beating
            </p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
            margin: '16px',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid rgba(139, 92, 246, 0.3)',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '16px', fontSize: '18px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 2, paddingLeft: '20px', margin: 0, fontSize: '14px' }}>
              <li>Spatial beating between periodic patterns</li>
              <li>Rotational vs scaling moire</li>
              <li>Amplification of small differences</li>
              <li>Applications in security and measurement</li>
            </ul>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
            margin: '16px',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid rgba(139, 92, 246, 0.3)',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: '18px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              Moire interferometry is used to measure nanometer-scale displacements in materials
              science. In displays, careful anti-aliasing and screen design prevents unwanted moire.
              The mathematics connects to Fourier analysis and sampling theory!
            </p>
          </div>
          {renderVisualization(true)}
        </div>
      </div>
    );
  }

  // Default fallback to hook phase
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #020617 50%, #0f172a 100%)' }}>
      {renderNavBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '90px', paddingBottom: '20px' }}>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <h1 style={{
            color: colors.accent,
            fontSize: '32px',
            marginBottom: '8px',
            textShadow: '0 0 30px rgba(139, 92, 246, 0.5)',
          }}>
            The Ghost Patterns
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
            How can two simple grids create giant moving patterns?
          </p>
        </div>

        {renderVisualization(true)}

        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
            padding: '24px',
            borderRadius: '16px',
            marginBottom: '16px',
            border: '1px solid rgba(139, 92, 246, 0.2)',
          }}>
            <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.7 }}>
              Overlay two window screens, or look through two layers of sheer fabric.
              Rotate one slightly and mysterious waves appear - waves that don't
              exist in either pattern alone!
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
              These are moire patterns - interference without waves.
            </p>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
            padding: '16px',
            borderRadius: '12px',
            border: `1px solid ${colors.accent}`,
          }}>
            <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
              Click "Start Animation" to slowly rotate one grid and watch the moire dance!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoirePatternsRenderer;
