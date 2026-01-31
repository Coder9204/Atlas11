import React, { useState, useEffect, useCallback } from 'react';

interface CameraObscuraRendererProps {
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
  lightRay: '#fcd34d',
  boxColor: '#475569',
  screenColor: '#f1f5f9',
  objectColor: '#ef4444',
};

const CameraObscuraRenderer: React.FC<CameraObscuraRendererProps> = ({
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
  const [holeSize, setHoleSize] = useState(10);
  const [objectDistance, setObjectDistance] = useState(150);
  const [showRays, setShowRays] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
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
      title: 'Pinhole Cameras',
      description: 'The simplest camera uses no lens - just a tiny hole. Light from each point in the scene passes through to create an inverted image.',
      question: 'Why do pinhole cameras produce images without a lens?',
      answer: 'A tiny hole restricts each point in the scene to send rays along nearly a single path. This creates a one-to-one mapping between scene points and image points, forming a sharp (if dim) image.',
    },
    {
      title: 'Eye Pupil Function',
      description: 'Your eye\'s pupil dilates in darkness and constricts in bright light. This isn\'t just about brightness control.',
      question: 'Why does squinting help you see more clearly when you don\'t have your glasses?',
      answer: 'Squinting acts like a smaller pinhole - it reduces the blur from unfocused light. With a smaller aperture, rays from each point travel along narrower paths, improving depth of field and reducing blur from refractive errors.',
    },
    {
      title: 'Solar Eclipse Viewing',
      description: 'During a solar eclipse, you can safely view the sun by projecting its image through a pinhole onto a surface.',
      question: 'Why is a pinhole projection safe for viewing the sun?',
      answer: 'The tiny hole drastically reduces light intensity while still forming an image. Unlike looking directly or through inadequate filters, the projected image is dim enough to view safely while showing the eclipse\'s progress.',
    },
    {
      title: 'Earliest Photography',
      description: 'Before lenses were perfected, the camera obscura principle was used for drawing aids and eventually the first photographs.',
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
      const rayColors = ['#fcd34d', '#fb923c', '#f87171'];

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
              stroke={rayColors[pIndex]}
              strokeWidth={1.5}
              opacity={0.6}
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
              stroke={rayColors[pIndex]}
              strokeWidth={1.5}
              opacity={0.6}
            />
          );
        }
      });

      return rays;
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: '#1e293b', borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Define blur filter */}
          <defs>
            <filter id="imageBlur">
              <feGaussianBlur stdDeviation={blurAmount} />
            </filter>
          </defs>

          {/* Background gradient for outside */}
          <rect x={0} y={0} width={boxLeft} height={height} fill="#334155" />

          {/* Object (candle/arrow shape) */}
          <g>
            {/* Candle body */}
            <rect
              x={objectX - 8}
              y={objectTop}
              width={16}
              height={objectBottom - objectTop}
              fill={colors.objectColor}
              rx={2}
            />
            {/* Flame */}
            <ellipse
              cx={objectX}
              cy={objectTop - 10}
              rx={8}
              ry={12}
              fill="#fcd34d"
            />
            <ellipse
              cx={objectX}
              cy={objectTop - 8}
              rx={4}
              ry={8}
              fill="#fed7aa"
            />
            {/* Arrow indicating "up" */}
            <polygon
              points={`${objectX},${objectTop - 25} ${objectX - 5},${objectTop - 18} ${objectX + 5},${objectTop - 18}`}
              fill={colors.textPrimary}
            />
          </g>

          {/* Box (camera obscura) */}
          <rect
            x={boxLeft}
            y={boxTop}
            width={boxWidth}
            height={boxHeight}
            fill="#1e293b"
            stroke={colors.boxColor}
            strokeWidth={3}
          />

          {/* Box interior darkness */}
          <rect
            x={boxLeft + 3}
            y={boxTop + 3}
            width={boxWidth - 6}
            height={boxHeight - 6}
            fill="#0f172a"
          />

          {/* Pinhole opening */}
          <rect
            x={pinholeX - 2}
            y={pinholeY - pinholeRadius}
            width={4}
            height={pinholeRadius * 2}
            fill="#334155"
          />

          {/* Screen inside box */}
          <rect
            x={screenX}
            y={boxTop + 20}
            width={10}
            height={boxHeight - 40}
            fill={colors.screenColor}
            rx={2}
          />

          {/* Projected image on screen (inverted) */}
          <g filter={blurAmount > 0 ? "url(#imageBlur)" : undefined}>
            {/* Inverted candle body */}
            <rect
              x={screenX - 4}
              y={Math.min(imageTop, imageBottom)}
              width={8}
              height={Math.abs(imageBottom - imageTop)}
              fill={colors.objectColor}
              opacity={Math.max(0.3, Math.min(1, holeSize / 15))}
              rx={1}
            />
            {/* Inverted flame (now at bottom) */}
            <ellipse
              cx={screenX}
              cy={imageTop + 8}
              rx={4}
              ry={6}
              fill="#fcd34d"
              opacity={Math.max(0.3, Math.min(1, holeSize / 15))}
            />
          </g>

          {/* Light rays */}
          {showRays && generateRays()}

          {/* Labels */}
          <text x={objectX} y={objectBottom + 20} fill={colors.textPrimary} fontSize={11} textAnchor="middle">
            Object
          </text>
          <text x={pinholeX} y={boxBottom + 20} fill={colors.textPrimary} fontSize={11} textAnchor="middle">
            Pinhole
          </text>
          <text x={screenX + 5} y={boxBottom + 20} fill={colors.textPrimary} fontSize={11} textAnchor="middle">
            Screen
          </text>

          {/* Info panel */}
          <rect x={10} y={10} width={120} height={50} fill="rgba(0,0,0,0.5)" rx={6} />
          <text x={20} y={28} fill={colors.textSecondary} fontSize={11}>
            Hole size: {holeSize}px
          </text>
          <text x={20} y={45} fill={colors.textSecondary} fontSize={11}>
            Brightness: {Math.round(holeSize / 40 * 100)}%
          </text>

          {/* Sharpness/brightness indicator */}
          <g transform={`translate(${width - 130}, 10)`}>
            <rect width={120} height={50} fill="rgba(0,0,0,0.5)" rx={6} />
            <text x={10} y={20} fill={colors.textSecondary} fontSize={10}>
              Sharpness
            </text>
            <rect x={10} y={28} width={100} height={6} fill="#334155" rx={3} />
            <rect x={10} y={28} width={Math.max(10, 100 - blurAmount * 5)} height={6} fill={colors.success} rx={3} />
          </g>
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
              }}
            >
              {isAnimating ? 'Stop' : 'Animate Hole Size'}
            </button>
            <button
              onClick={() => setShowRays(!showRays)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: showRays ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {showRays ? 'Hide Rays' : 'Show Rays'}
            </button>
            <button
              onClick={() => { setHoleSize(10); setObjectDistance(150); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`,
                background: 'transparent',
                color: colors.textMuted,
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
          Pinhole Size: {holeSize}px
        </label>
        <input
          type="range"
          min="3"
          max="40"
          step="1"
          value={holeSize}
          onChange={(e) => setHoleSize(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          <span>Tiny (sharp, dim)</span>
          <span>Large (bright, blurry)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Object Distance: {objectDistance}px
        </label>
        <input
          type="range"
          min="80"
          max="180"
          step="5"
          value={objectDistance}
          onChange={(e) => setObjectDistance(parseInt(e.target.value))}
          style={{ width: '100%' }}
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
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Larger hole = more rays = more overlap = more blur
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
      borderTop: '1px solid rgba(255,255,255,0.1)',
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
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Imagine a dark box with a tiny hole in one side. Light from outside
                passes through the hole and projects an image onto the opposite wall.
                This is the camera obscura - the ancestor of all cameras!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore the Camera Obscura</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust the pinhole size and observe brightness vs. sharpness
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
              <li>Very small hole (3-5px): Sharp but dim image</li>
              <li>Medium hole (10-20px): Brighter but starting to blur</li>
              <li>Large hole (30-40px): Bright but very blurry</li>
              <li>Watch how multiple rays overlap with larger holes</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'brighter_blurry';

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
              A bigger hole makes the image brighter but blurrier!
            </p>
          </div>

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
              Compare two different hole sizes side by side
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Compare Hole Sizes</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Quickly switch between small and large holes to see the difference
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => setHoleSize(5)}
              style={{
                padding: '16px 24px',
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
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'tradeoff';

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
              It's a fundamental tradeoff: small holes give sharp but dim images, large holes give bright but blurry images!
            </p>
          </div>

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
              The camera obscura principle appears throughout optics and daily life
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
                {testScore >= 8 ? 'You\'ve mastered the camera obscura!' : 'Review the material and try again.'}
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
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered the camera obscura and pinhole optics</p>
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
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default CameraObscuraRenderer;
