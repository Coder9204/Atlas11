import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// GAME 108: MARANGONI TEARS OF WINE
// The "wine legs" phenomenon caused by surface tension gradients
// Demonstrates Marangoni flow from alcohol evaporation
// ============================================================================

interface MarangoniTearsRendererProps {
  phase: string;
  onPhaseComplete?: () => void;
  onPredictionMade?: (prediction: string) => void;
}

// Color palette with proper contrast
const colors = {
  // Text colors - HIGH CONTRAST
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',

  // Background colors
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',

  // Wine colors
  wineRed: '#7c2d12',
  wineDeep: '#450a0a',
  wineLight: '#dc2626',
  wineHighlight: '#f87171',

  // Glass colors
  glass: 'rgba(200, 200, 220, 0.2)',
  glassEdge: 'rgba(200, 200, 220, 0.5)',
  glassHighlight: 'rgba(255, 255, 255, 0.3)',

  // Surface tension indicators
  highTension: '#3b82f6',
  lowTension: '#f59e0b',

  // UI colors
  accent: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

const MarangoniTearsRenderer: React.FC<MarangoniTearsRendererProps> = ({
  phase,
  onPhaseComplete,
  onPredictionMade,
}) => {
  // ==================== STATE ====================
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showTwistResult, setShowTwistResult] = useState(false);

  // Animation state
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Interactive controls
  const [alcoholContent, setAlcoholContent] = useState(12); // % ABV
  const [temperature, setTemperature] = useState(20); // Celsius
  const [glassAngle, setGlassAngle] = useState(0); // Tilt angle

  // Transfer phase tracking
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());

  // Test phase
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);

  // ==================== PHYSICS CALCULATIONS ====================
  const calculateTearFormation = useCallback(() => {
    // Tears form more prominently with higher alcohol content
    // and higher temperature (faster evaporation)
    const evaporationRate = (alcoholContent / 100) * (1 + (temperature - 20) / 40);
    const tearCount = Math.floor(4 + evaporationRate * 8);
    const tearSpeed = 0.5 + evaporationRate * 1.5;
    const tearSize = 2 + (alcoholContent / 20);

    return { tearCount, tearSpeed, tearSize, evaporationRate };
  }, [alcoholContent, temperature]);

  const calculateSurfaceTension = useCallback(() => {
    // Pure water: ~72 mN/m, Pure ethanol: ~22 mN/m
    // Wine is a mixture
    const waterTension = 72;
    const ethanolTension = 22;
    const bulkTension = waterTension - (alcoholContent / 100) * (waterTension - ethanolTension);

    // After evaporation (in the film), alcohol content is lower
    // so surface tension is higher
    const filmTension = bulkTension + (alcoholContent / 100) * 15;

    return { bulkTension, filmTension };
  }, [alcoholContent]);

  // ==================== ANIMATION LOOP ====================
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setAnimationTime(t => t + 0.03);
    }, 30);

    return () => clearInterval(interval);
  }, [isAnimating]);

  // ==================== RENDER VISUALIZATION ====================
  const renderVisualization = (interactive: boolean) => {
    const { tearCount, tearSpeed, tearSize, evaporationRate } = calculateTearFormation();
    const { bulkTension, filmTension } = calculateSurfaceTension();

    // Generate tear positions
    const tears = [];
    for (let i = 0; i < tearCount; i++) {
      const angle = (i / tearCount) * 360;
      const phase = (animationTime * tearSpeed + i * 0.5) % 3;

      // Tear lifecycle: 0-1 forming, 1-2 falling, 2-3 merging
      let y, opacity, size;
      if (phase < 1) {
        // Forming at top
        y = 60 + phase * 20;
        opacity = 0.3 + phase * 0.5;
        size = tearSize * phase;
      } else if (phase < 2) {
        // Falling down
        y = 80 + (phase - 1) * 120;
        opacity = 0.8;
        size = tearSize;
      } else {
        // Merging back into pool
        y = 200 + (phase - 2) * 20;
        opacity = Math.max(0, 0.8 - (phase - 2));
        size = tearSize * (1 + (phase - 2) * 0.5);
      }

      tears.push({ angle, y, opacity, size, phase });
    }

    return (
      <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        <svg
          viewBox="0 0 400 380"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', background: colors.bgDark, borderRadius: '12px' }}
        >
          <defs>
            {/* Wine gradient */}
            <linearGradient id="wineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.wineLight} stopOpacity="0.7" />
              <stop offset="50%" stopColor={colors.wineRed} />
              <stop offset="100%" stopColor={colors.wineDeep} />
            </linearGradient>

            {/* Glass gradient */}
            <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.glassHighlight} />
              <stop offset="50%" stopColor={colors.glass} />
              <stop offset="100%" stopColor={colors.glassHighlight} />
            </linearGradient>

            {/* Film gradient (thinner wine on glass) */}
            <linearGradient id="filmGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.wineHighlight} stopOpacity="0.2" />
              <stop offset="100%" stopColor={colors.wineRed} stopOpacity="0.5" />
            </linearGradient>

            {/* Evaporation effect */}
            <filter id="evaporationBlur">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>

          {/* Title */}
          <text x="200" y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="16" fontWeight="bold">
            Tears of Wine (Glass Cross-Section)
          </text>

          {/* Wine glass outline */}
          <g transform={`rotate(${glassAngle}, 200, 200)`}>
            {/* Glass body - simplified bowl shape */}
            <path
              d="M 100,50 Q 60,150 80,250 L 90,320 L 310,320 L 320,250 Q 340,150 300,50 Z"
              fill="url(#glassGradient)"
              stroke={colors.glassEdge}
              strokeWidth="2"
            />

            {/* Inner glass surface (where tears form) */}
            <path
              d="M 110,60 Q 75,150 90,240"
              fill="none"
              stroke={colors.glassEdge}
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            <path
              d="M 290,60 Q 325,150 310,240"
              fill="none"
              stroke={colors.glassEdge}
              strokeWidth="1"
              strokeDasharray="4,4"
            />

            {/* Wine pool at bottom */}
            <ellipse
              cx="200"
              cy="260"
              rx="110"
              ry="30"
              fill="url(#wineGradient)"
            />

            {/* Thin film on glass (meniscus) */}
            <path
              d="M 95,230 Q 75,180 85,100"
              fill="none"
              stroke={colors.wineHighlight}
              strokeWidth="8"
              strokeOpacity="0.3"
              strokeLinecap="round"
            />
            <path
              d="M 305,230 Q 325,180 315,100"
              fill="none"
              stroke={colors.wineHighlight}
              strokeWidth="8"
              strokeOpacity="0.3"
              strokeLinecap="round"
            />

            {/* Tear drops on left side */}
            {tears.slice(0, Math.ceil(tearCount / 2)).map((tear, i) => (
              <g key={`left-${i}`}>
                {/* Tear drop shape */}
                <ellipse
                  cx={85 + Math.sin(tear.phase * Math.PI) * 5}
                  cy={tear.y}
                  rx={tear.size}
                  ry={tear.size * 1.5}
                  fill={colors.wineRed}
                  opacity={tear.opacity}
                />
                {/* Highlight */}
                <ellipse
                  cx={83 + Math.sin(tear.phase * Math.PI) * 5}
                  cy={tear.y - tear.size * 0.3}
                  rx={tear.size * 0.3}
                  ry={tear.size * 0.4}
                  fill={colors.wineHighlight}
                  opacity={tear.opacity * 0.5}
                />
              </g>
            ))}

            {/* Tear drops on right side */}
            {tears.slice(Math.ceil(tearCount / 2)).map((tear, i) => (
              <g key={`right-${i}`}>
                <ellipse
                  cx={315 - Math.sin(tear.phase * Math.PI) * 5}
                  cy={tear.y}
                  rx={tear.size}
                  ry={tear.size * 1.5}
                  fill={colors.wineRed}
                  opacity={tear.opacity}
                />
                <ellipse
                  cx={317 - Math.sin(tear.phase * Math.PI) * 5}
                  cy={tear.y - tear.size * 0.3}
                  rx={tear.size * 0.3}
                  ry={tear.size * 0.4}
                  fill={colors.wineHighlight}
                  opacity={tear.opacity * 0.5}
                />
              </g>
            ))}

            {/* Evaporation indicators (wavy lines above film) */}
            {interactive && (
              <g opacity={evaporationRate * 0.6}>
                {[0, 1, 2].map(i => (
                  <path
                    key={`evap-left-${i}`}
                    d={`M ${70 - i * 5},${100 + i * 30}
                        q -5,${-10 - Math.sin(animationTime * 2 + i) * 5} 0,-20
                        q 5,${-10 - Math.sin(animationTime * 2 + i + 1) * 5} 0,-20`}
                    fill="none"
                    stroke={colors.lowTension}
                    strokeWidth="1.5"
                    strokeOpacity={0.5 - i * 0.1}
                  />
                ))}
                {[0, 1, 2].map(i => (
                  <path
                    key={`evap-right-${i}`}
                    d={`M ${330 + i * 5},${100 + i * 30}
                        q 5,${-10 - Math.sin(animationTime * 2 + i) * 5} 0,-20
                        q -5,${-10 - Math.sin(animationTime * 2 + i + 1) * 5} 0,-20`}
                    fill="none"
                    stroke={colors.lowTension}
                    strokeWidth="1.5"
                    strokeOpacity={0.5 - i * 0.1}
                  />
                ))}
              </g>
            )}

            {/* Flow direction arrows (Marangoni flow) */}
            {interactive && (
              <g>
                {/* Upward flow arrows */}
                <path d="M 88,200 L 88,170 L 83,175 M 88,170 L 93,175"
                  fill="none" stroke={colors.highTension} strokeWidth="2" />
                <path d="M 312,200 L 312,170 L 307,175 M 312,170 L 317,175"
                  fill="none" stroke={colors.highTension} strokeWidth="2" />

                {/* Labels */}
                <text x="65" y="185" fill={colors.highTension} fontSize="9" textAnchor="end">
                  High γ
                </text>
                <text x="335" y="185" fill={colors.highTension} fontSize="9">
                  High γ
                </text>
              </g>
            )}
          </g>

          {/* Legend and info */}
          <g transform="translate(10, 300)">
            <rect x="0" y="0" width="180" height="65" fill={colors.bgCard} rx="6" />
            <text x="10" y="18" fill={colors.textMuted} fontSize="10">Surface Tension:</text>
            <text x="10" y="33" fill={colors.textSecondary} fontSize="9">
              Bulk (pool): {bulkTension.toFixed(1)} mN/m
            </text>
            <text x="10" y="48" fill={colors.textSecondary} fontSize="9">
              Film (glass): {filmTension.toFixed(1)} mN/m
            </text>
            <circle cx="165" cy="18" r="6" fill={colors.lowTension} />
            <circle cx="165" cy="40" r="6" fill={colors.highTension} />
          </g>

          {/* Mechanism diagram */}
          <g transform="translate(200, 300)">
            <rect x="0" y="0" width="190" height="65" fill={colors.bgCard} rx="6" />
            <text x="10" y="15" fill={colors.textMuted} fontSize="9">Marangoni Effect:</text>
            <text x="10" y="30" fill={colors.lowTension} fontSize="8">
              1. Alcohol evaporates (↓ γ in film)
            </text>
            <text x="10" y="43" fill={colors.highTension} fontSize="8">
              2. Water-rich film (↑ γ) pulls wine up
            </text>
            <text x="10" y="56" fill={colors.wineHighlight} fontSize="8">
              3. Tears form and fall back down
            </text>
          </g>
        </svg>
      </div>
    );
  };

  // ==================== RENDER CONTROLS ====================
  const renderControls = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '16px',
      background: colors.bgCard,
      borderRadius: '12px',
      margin: '16px',
    }}>
      <div style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold' }}>
        🎮 Adjust Parameters:
      </div>

      {/* Alcohol Content Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          🍷 Alcohol Content: {alcoholContent}% ABV
        </label>
        <input
          type="range"
          min="5"
          max="40"
          value={alcoholContent}
          onChange={(e) => setAlcoholContent(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Light Beer (5%)</span>
          <span>Whiskey (40%)</span>
        </div>
      </div>

      {/* Temperature Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          🌡️ Temperature: {temperature}°C
        </label>
        <input
          type="range"
          min="5"
          max="35"
          value={temperature}
          onChange={(e) => setTemperature(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Chilled (5°C)</span>
          <span>Warm (35°C)</span>
        </div>
      </div>

      {/* Glass Tilt Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: colors.textSecondary, fontSize: '13px' }}>
          📐 Glass Tilt: {glassAngle}°
        </label>
        <input
          type="range"
          min="-15"
          max="15"
          value={glassAngle}
          onChange={(e) => setGlassAngle(Number(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>Left (-15°)</span>
          <span>Right (+15°)</span>
        </div>
      </div>

      {/* Current measurements */}
      <div style={{
        padding: '12px',
        background: 'rgba(15, 23, 42, 0.5)',
        borderRadius: '8px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
      }}>
        <div style={{ color: colors.textMuted, fontSize: '11px' }}>Tear Count:</div>
        <div style={{ color: colors.textPrimary, fontSize: '11px', fontWeight: 'bold' }}>
          ~{calculateTearFormation().tearCount}
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px' }}>Evaporation Rate:</div>
        <div style={{ color: colors.lowTension, fontSize: '11px', fontWeight: 'bold' }}>
          {(calculateTearFormation().evaporationRate * 100).toFixed(0)}%
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px' }}>Tension Gradient:</div>
        <div style={{ color: colors.highTension, fontSize: '11px', fontWeight: 'bold' }}>
          {(calculateSurfaceTension().filmTension - calculateSurfaceTension().bulkTension).toFixed(1)} mN/m
        </div>
      </div>
    </div>
  );

  // ==================== PREDICTION OPTIONS ====================
  const predictions = [
    { id: 'more', text: 'MORE prominent tears (more "legs")', correct: true },
    { id: 'less', text: 'LESS prominent tears (fewer "legs")' },
    { id: 'same', text: 'The same amount of tears' },
    { id: 'none', text: 'No tears at all' },
  ];

  const twistPredictions = [
    { id: 'yes', text: 'Yes - it would still form tears from evaporation' },
    { id: 'no', text: 'No - without a free surface, no tears form', correct: true },
    { id: 'more', text: 'Even more tears due to pressure' },
    { id: 'different', text: 'Different pattern but still forms tears' },
  ];

  // ==================== TEST QUESTIONS ====================
  const testQuestions = [
    {
      id: 1,
      question: 'What causes the Marangoni effect in wine?',
      options: [
        { id: 'a', text: 'Gravity pulling the wine down' },
        { id: 'b', text: 'Surface tension gradients from alcohol evaporation', correct: true },
        { id: 'c', text: 'The shape of the wine glass' },
        { id: 'd', text: 'Temperature differences in the wine' },
      ],
    },
    {
      id: 2,
      question: 'Where is the surface tension HIGHER in a glass of wine?',
      options: [
        { id: 'a', text: 'In the bulk liquid at the bottom' },
        { id: 'b', text: 'On the thin film on the glass wall', correct: true },
        { id: 'c', text: 'Surface tension is the same everywhere' },
        { id: 'd', text: 'At the center of the wine surface' },
      ],
    },
    {
      id: 3,
      question: 'Why does alcohol evaporating increase surface tension in the film?',
      options: [
        { id: 'a', text: 'Alcohol has higher surface tension than water' },
        { id: 'b', text: 'Evaporation creates bubbles' },
        { id: 'c', text: 'Water has higher surface tension than alcohol', correct: true },
        { id: 'd', text: 'The glass surface creates friction' },
      ],
    },
    {
      id: 4,
      question: 'How does higher alcohol content affect tear formation?',
      options: [
        { id: 'a', text: 'Fewer, smaller tears' },
        { id: 'b', text: 'More prominent tears', correct: true },
        { id: 'c', text: 'No effect on tears' },
        { id: 'd', text: 'Tears form only at high alcohol content' },
      ],
    },
    {
      id: 5,
      question: 'If you cover a wine glass, what happens to the tears?',
      options: [
        { id: 'a', text: 'They form faster' },
        { id: 'b', text: 'They stop forming (evaporation blocked)', correct: true },
        { id: 'c', text: 'They form in the opposite direction' },
        { id: 'd', text: 'They become larger' },
      ],
    },
    {
      id: 6,
      question: 'Which liquid property drives Marangoni flow?',
      options: [
        { id: 'a', text: 'Density' },
        { id: 'b', text: 'Viscosity' },
        { id: 'c', text: 'Surface tension gradient', correct: true },
        { id: 'd', text: 'Temperature' },
      ],
    },
    {
      id: 7,
      question: 'In which direction does Marangoni flow move liquid?',
      options: [
        { id: 'a', text: 'From high to low surface tension' },
        { id: 'b', text: 'From low to high surface tension', correct: true },
        { id: 'c', text: 'Always downward due to gravity' },
        { id: 'd', text: 'Randomly in all directions' },
      ],
    },
    {
      id: 8,
      question: 'What is the surface tension of pure water compared to pure ethanol?',
      options: [
        { id: 'a', text: 'Water: ~22 mN/m, Ethanol: ~72 mN/m' },
        { id: 'b', text: 'Water: ~72 mN/m, Ethanol: ~22 mN/m', correct: true },
        { id: 'c', text: 'They are the same' },
        { id: 'd', text: 'Depends on temperature only' },
      ],
    },
    {
      id: 9,
      question: 'How does temperature affect tear formation?',
      options: [
        { id: 'a', text: 'Higher temperature = more tears (faster evaporation)', correct: true },
        { id: 'b', text: 'Higher temperature = fewer tears' },
        { id: 'c', text: 'Temperature has no effect' },
        { id: 'd', text: 'Only affects the taste, not the tears' },
      ],
    },
    {
      id: 10,
      question: 'Can the "quality" of wine be judged by its tears?',
      options: [
        { id: 'a', text: 'Yes - more tears means better wine' },
        { id: 'b', text: 'No - tears only indicate alcohol content, not quality', correct: true },
        { id: 'c', text: 'Yes - fewer tears means better wine' },
        { id: 'd', text: 'Tears indicate the age of the wine' },
      ],
    },
  ];

  // ==================== TRANSFER APPLICATIONS ====================
  const transferApplications = [
    {
      id: 0,
      title: '🖨️ Inkjet Printing',
      description: 'Marangoni flows can cause uneven drying in printed ink drops, leading to the "coffee ring effect" where pigment concentrates at edges. Printer manufacturers add surfactants to control these flows.',
      insight: 'Understanding Marangoni flow helps engineers print circuits, solar cells, and biological samples with uniform coating.',
    },
    {
      id: 1,
      title: '🌊 Oil Spill Dispersants',
      description: 'Dispersant chemicals work partly through Marangoni effects - they create surface tension gradients that help break up and spread oil slicks into smaller droplets.',
      insight: 'The same physics that makes wine climb a glass helps emergency responders manage environmental disasters.',
    },
    {
      id: 2,
      title: '💧 Soap Boats',
      description: 'A classic science experiment: a small boat with soap at one end propels itself forward. The soap lowers surface tension behind it, and the higher tension in front pulls it along.',
      insight: 'This simple toy demonstrates the same physics as the tears of wine - movement from low to high surface tension regions.',
    },
    {
      id: 3,
      title: '🔬 Microfluidics',
      description: 'Researchers use temperature or chemical gradients to create Marangoni flows in tiny channels. This allows precise control of liquid movement without mechanical pumps.',
      insight: 'Lab-on-a-chip devices use Marangoni flow to mix reagents, separate cells, and perform medical diagnostics using just a drop of blood.',
    },
  ];

  // ==================== BOTTOM BAR RENDERER ====================
  const renderBottomBar = (showButton: boolean, buttonEnabled: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 20px',
      background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))',
      borderTop: '1px solid rgba(148, 163, 184, 0.2)',
      zIndex: 1000,
    }}>
      {showButton && (
        <button
          onClick={() => onPhaseComplete?.()}
          disabled={!buttonEnabled}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: buttonEnabled
              ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
              : 'rgba(71, 85, 105, 0.5)',
            border: 'none',
            borderRadius: '12px',
            color: buttonEnabled ? colors.textPrimary : colors.textMuted,
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: buttonEnabled ? 'pointer' : 'not-allowed',
            opacity: buttonEnabled ? 1 : 0.5,
          }}
        >
          {buttonText}
        </button>
      )}
    </div>
  );

  // ==================== PHASE RENDERERS ====================

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
              🍷 The Crying Glass
            </h1>
            <p style={{ color: colors.accent, fontSize: '18px', marginBottom: '24px' }}>
              Game 108: Marangoni Tears of Wine
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{ padding: '20px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
            }}>
              <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '12px' }}>
                🤯 Have You Ever Noticed?
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '15px', lineHeight: '1.6' }}>
                Swirl a glass of wine and watch the inside of the glass. You'll see "legs" or "tears"
                of wine climbing up the glass, forming droplets, then streaming back down. Wine
                connoisseurs call these <strong style={{ color: colors.wineHighlight }}>"tears of wine"</strong> or
                <strong style={{ color: colors.wineHighlight }}>"wine legs"</strong>.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
                This is the <span style={{ color: colors.accent }}>Marangoni Effect</span>
              </h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
                Named after Italian physicist Carlo Marangoni, this phenomenon occurs when liquids
                flow due to <strong>surface tension gradients</strong>. It's the same physics that
                powers soap boats, helps disperse oil spills, and enables precision microfluidic
                devices!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, "Let's Explore! →")}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {/* 1. STATIC GRAPHIC FIRST */}
          {renderVisualization(false)}

          {/* 2. WHAT YOU'RE LOOKING AT */}
          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              📋 What You're Looking At:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              This is a <strong>cross-section of a wine glass</strong>. After swirling, a thin film
              of wine coats the glass walls. Alcohol evaporates from this film (faster than water),
              leaving behind water-rich liquid with <span style={{ color: colors.highTension }}>
              higher surface tension</span>. This pulls more wine up from the pool below, forming
              the "tears" that then fall back down.
            </p>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '8px' }}>
              <strong>γ (gamma)</strong> represents surface tension. Higher γ in the film creates
              the upward pull that forms tears.
            </p>
          </div>

          {/* 3. PREDICTION QUESTION BELOW */}
          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              🤔 If you pour STRONGER alcohol (higher %), what happens to the tears?
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPrediction(p.id);
                    onPredictionMade?.(p.id);
                  }}
                  style={{
                    padding: '16px',
                    background: prediction === p.id
                      ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
                      : 'rgba(51, 65, 85, 0.7)',
                    border: prediction === p.id ? '2px solid #a78bfa' : '2px solid transparent',
                    borderRadius: '12px',
                    color: colors.textPrimary,
                    fontSize: '14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {p.text}
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '20px', marginBottom: '4px' }}>
              🔬 Experiment Time!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust alcohol content and temperature to see how tears change
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
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '8px' }}>
              🎯 Try These Experiments:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>Increase alcohol → more and faster tears</li>
              <li>Increase temperature → faster evaporation = more tears</li>
              <li>Tilt the glass → see how gravity affects tear flow</li>
              <li>Try "light beer" (5%) vs "whiskey" (40%)</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'See What I Learned →')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const selectedPrediction = predictions.find(p => p.id === prediction);
    const isCorrect = selectedPrediction?.correct === true;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {isCorrect ? '🎯' : '💡'}
            </div>
            <h2 style={{
              color: isCorrect ? colors.success : colors.warning,
              fontSize: '24px',
              marginBottom: '8px',
            }}>
              {isCorrect ? 'Excellent Prediction!' : 'Interesting Thinking!'}
            </h2>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              📚 The Physics Explained:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              Higher alcohol content means <strong>more evaporation</strong> and a <strong>larger
              surface tension gradient</strong>. This creates a stronger Marangoni flow, pulling
              more wine up the glass and forming <strong style={{ color: colors.accent }}>more
              prominent tears</strong>.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              The key insight: alcohol has <strong>lower surface tension</strong> than water. When
              alcohol evaporates from the thin film, what's left has higher surface tension. This
              high-tension region pulls liquid up from the lower-tension bulk.
            </p>
            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '8px',
              padding: '12px',
            }}>
              <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
                Key Insight:
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
                Liquid flows from regions of LOW surface tension to regions of HIGH surface tension.
                This is the Marangoni effect.
              </p>
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🍷 Wine Quality Myth:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              Many believe prominent "legs" indicate high-quality wine. In reality, legs only indicate
              <strong style={{ color: colors.warning }}> alcohol content</strong>, not quality!
              A cheap high-alcohol wine will have more legs than an expensive low-alcohol wine.
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'Ready for a Challenge →')}
      </div>
    );
  }

  // TWIST_PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '22px', marginBottom: '8px' }}>
              🌀 Plot Twist!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              What if we sealed the glass?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🧪 The Thought Experiment:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              Imagine you put a tight lid on the wine glass, creating a <strong>sealed container</strong>.
              No air can get in or out. Would the tears of wine still form?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px', textAlign: 'center' }}>
              🤔 In a sealed glass, would tears still form?
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setTwistPrediction(p.id);
                  }}
                  style={{
                    padding: '16px',
                    background: twistPrediction === p.id
                      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                      : 'rgba(51, 65, 85, 0.7)',
                    border: twistPrediction === p.id ? '2px solid #fbbf24' : '2px solid transparent',
                    borderRadius: '12px',
                    color: colors.textPrimary,
                    fontSize: '14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {p.text}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'See What Happens →')}
      </div>
    );
  }

  // TWIST_PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, fontSize: '20px', marginBottom: '4px' }}>
              🔬 Exploring Evaporation's Role
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              See why a free surface is essential
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
            <h3 style={{ color: colors.textPrimary, fontSize: '14px', marginBottom: '8px' }}>
              💡 Key Observations:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>Tears require ongoing evaporation</li>
              <li>Evaporation creates the surface tension gradient</li>
              <li>In a sealed container, vapor reaches equilibrium</li>
              <li>At equilibrium, no net evaporation = no gradient = no tears</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'Understand the Twist →')}
      </div>
    );
  }

  // TWIST_REVIEW PHASE
  if (phase === 'twist_review') {
    const selectedTwist = twistPredictions.find(p => p.id === twistPrediction);
    const isCorrect = selectedTwist?.correct === true;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {isCorrect ? '🎯' : '🤯'}
            </div>
            <h2 style={{
              color: isCorrect ? colors.success : colors.accent,
              fontSize: '24px',
              marginBottom: '8px',
            }}>
              {isCorrect ? 'You Got It!' : 'Surprising Result!'}
            </h2>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🔒 No Evaporation = No Tears!
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' }}>
              In a sealed container, the air above the wine quickly becomes <strong>saturated</strong>
              with alcohol and water vapor. Once equilibrium is reached, there's no net evaporation
              from the film.
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              Without evaporation, there's <strong style={{ color: colors.accent }}>no surface tension
              gradient</strong> - the film has the same composition as the bulk. No gradient means
              no Marangoni flow, and no tears form!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', marginBottom: '12px' }}>
              🧪 Try It Yourself:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.7' }}>
              Pour wine in a glass and swirl it - watch the tears form. Then cover the glass tightly
              with plastic wrap and swirl again. After the vapor saturates (a few minutes), you'll
              notice the tears stop forming or become much less prominent!
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'See Real Applications →')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const allCompleted = transferCompleted.size >= 4;

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px', marginBottom: '8px' }}>
              🌍 Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Explore all {transferApplications.length} applications to continue
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '12px',
            }}>
              {transferApplications.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: transferCompleted.has(i) ? colors.success : 'rgba(71, 85, 105, 0.5)',
                  }}
                />
              ))}
            </div>
          </div>

          {transferApplications.map((app) => (
            <div
              key={app.id}
              onClick={() => {
                setTransferCompleted(prev => new Set([...prev, app.id]));
              }}
              style={{
                background: transferCompleted.has(app.id)
                  ? 'rgba(16, 185, 129, 0.1)'
                  : colors.bgCard,
                border: transferCompleted.has(app.id)
                  ? '2px solid rgba(16, 185, 129, 0.3)'
                  : '2px solid transparent',
                margin: '12px 16px',
                padding: '16px',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px', margin: 0 }}>
                  {app.title}
                </h3>
                {transferCompleted.has(app.id) && (
                  <span style={{ color: colors.success, fontSize: '18px' }}>✓</span>
                )}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '13px', lineHeight: '1.6', marginTop: '8px' }}>
                {app.description}
              </p>
              <div style={{
                background: 'rgba(139, 92, 246, 0.1)',
                borderRadius: '6px',
                padding: '10px',
                marginTop: '10px',
              }}>
                <p style={{ color: colors.accent, fontSize: '12px', margin: 0 }}>
                  💡 {app.insight}
                </p>
              </div>
            </div>
          ))}
        </div>
        {renderBottomBar(true, allCompleted, allCompleted ? 'Take the Test →' : `Explore ${4 - transferCompleted.size} More`)}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    const answeredCount = Object.keys(testAnswers).length;
    const allAnswered = answeredCount === testQuestions.length;

    if (testSubmitted) {
      const correctCount = testQuestions.filter(q => {
        const correctOption = q.options.find(o => o.correct);
        return testAnswers[q.id] === correctOption?.id;
      }).length;
      const score = Math.round((correctCount / testQuestions.length) * 100);

      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                {score >= 80 ? '🏆' : score >= 60 ? '📚' : '💪'}
              </div>
              <h2 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
                {score}% Score
              </h2>
              <p style={{ color: colors.textSecondary, fontSize: '16px' }}>
                {correctCount} of {testQuestions.length} correct
              </p>
            </div>

            {testQuestions.map((q, idx) => {
              const correctOption = q.options.find(o => o.correct);
              const userAnswer = testAnswers[q.id];
              const isCorrect = userAnswer === correctOption?.id;

              return (
                <div
                  key={q.id}
                  style={{
                    background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    margin: '12px 16px',
                    padding: '14px',
                    borderRadius: '10px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ color: isCorrect ? colors.success : colors.error, fontSize: '16px' }}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <span style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold' }}>
                      Q{idx + 1}
                    </span>
                  </div>
                  <p style={{ color: colors.textSecondary, fontSize: '12px', margin: '0 0 4px 0' }}>
                    {q.question}
                  </p>
                  {!isCorrect && (
                    <p style={{ color: colors.success, fontSize: '11px', margin: 0 }}>
                      Correct: {correctOption?.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {renderBottomBar(true, true, score >= 70 ? 'Complete! 🎉' : 'Review & Continue →')}
        </div>
      );
    }

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontSize: '22px', marginBottom: '8px' }}>
              📝 Knowledge Check
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              {answeredCount} of {testQuestions.length} answered
            </p>
          </div>

          {testQuestions.map((q, idx) => (
            <div
              key={q.id}
              style={{
                background: colors.bgCard,
                margin: '12px 16px',
                padding: '16px',
                borderRadius: '12px',
              }}
            >
              <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>
                {idx + 1}. {q.question}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {q.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setTestAnswers(prev => ({ ...prev, [q.id]: option.id }))}
                    style={{
                      padding: '10px 14px',
                      background: testAnswers[q.id] === option.id
                        ? 'rgba(139, 92, 246, 0.3)'
                        : 'rgba(51, 65, 85, 0.5)',
                      border: testAnswers[q.id] === option.id
                        ? '1px solid rgba(139, 92, 246, 0.5)'
                        : '1px solid transparent',
                      borderRadius: '8px',
                      color: colors.textSecondary,
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {allAnswered ? (
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px 20px',
            background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))',
            borderTop: '1px solid rgba(148, 163, 184, 0.2)',
            zIndex: 1000,
          }}>
            <button
              onClick={() => setTestSubmitted(true)}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                border: 'none',
                borderRadius: '12px',
                color: colors.textPrimary,
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Submit Answers
            </button>
          </div>
        ) : (
          renderBottomBar(false, false, '')
        )}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '72px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
              Marangoni Master!
            </h1>
            <p style={{ color: colors.accent, fontSize: '16px' }}>
              You've mastered surface tension flow
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', marginBottom: '16px' }}>
              🎓 What You've Learned:
            </h3>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '2', paddingLeft: '20px', margin: 0 }}>
              <li>Liquid flows from low to high surface tension</li>
              <li>Alcohol evaporation creates tension gradients</li>
              <li>Wine tears indicate alcohol content, not quality</li>
              <li>Marangoni flow requires ongoing evaporation</li>
              <li>The effect is used in printing, microfluidics, and more</li>
            </ul>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.2))',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(139, 92, 246, 0.3)',
          }}>
            <h3 style={{ color: colors.accent, fontSize: '16px', marginBottom: '12px' }}>
              🚀 Keep Exploring:
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.6' }}>
              Next time you have a glass of wine (or any alcoholic beverage), swirl it and watch
              the tears! Try comparing different alcohol percentages. You can even demonstrate
              the sealed-glass experiment to impress your friends with your physics knowledge!
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'Complete Game →')}
      </div>
    );
  }

  // Default fallback
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p style={{ color: colors.textSecondary }}>Loading phase: {phase}...</p>
    </div>
  );
};

export default MarangoniTearsRenderer;
