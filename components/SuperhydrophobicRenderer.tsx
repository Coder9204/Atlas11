import React, { useState, useEffect, useCallback } from 'react';

interface SuperhydrophobicRendererProps {
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
  water: '#3b82f6',
  waterLight: '#60a5fa',
  surface: '#64748b',
  air: '#e0f2fe',
};

const SuperhydrophobicRenderer: React.FC<SuperhydrophobicRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [surfaceRoughness, setSurfaceRoughness] = useState(0.8);
  const [surfaceChemistry, setSurfaceChemistry] = useState<'hydrophilic' | 'hydrophobic' | 'superhydrophobic'>('superhydrophobic');
  const [hasDetergent, setHasDetergent] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dropletPosition, setDropletPosition] = useState({ x: 200, y: 120 });
  const [dropletVelocity, setDropletVelocity] = useState(0);

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

  // Calculate contact angle based on surface properties
  const calculateContactAngle = useCallback(() => {
    if (hasDetergent) {
      // Detergent reduces surface tension, causing wetting
      return 30 + Math.random() * 20;
    }

    const baseAngle = {
      'hydrophilic': 30,
      'hydrophobic': 100,
      'superhydrophobic': 150,
    }[surfaceChemistry];

    // Cassie-Baxter effect: roughness amplifies the intrinsic wettability
    const roughnessEffect = surfaceChemistry === 'superhydrophobic'
      ? surfaceRoughness * 20
      : surfaceChemistry === 'hydrophobic'
        ? surfaceRoughness * 10
        : -surfaceRoughness * 10;

    return Math.min(175, Math.max(10, baseAngle + roughnessEffect));
  }, [surfaceRoughness, surfaceChemistry, hasDetergent]);

  const contactAngle = calculateContactAngle();

  // Animation for rolling droplet
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setDropletPosition(prev => {
        const rollSpeed = contactAngle > 150 ? 3 : contactAngle > 90 ? 1 : 0.2;
        const newX = prev.x + rollSpeed;
        if (newX > 380) {
          return { x: 20, y: prev.y };
        }
        return { x: newX, y: prev.y };
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating, contactAngle]);

  const predictions = [
    { id: 'flat', label: 'Water spreads flat like on glass - low contact angle' },
    { id: 'slight', label: 'Water forms slight beads - moderate contact angle' },
    { id: 'ball', label: 'Water balls up into near-perfect spheres that roll easily' },
    { id: 'absorb', label: 'The surface absorbs the water completely' },
  ];

  const twistPredictions = [
    { id: 'nothing', label: 'Nothing changes - detergent only affects dirty water' },
    { id: 'stronger', label: 'The beading becomes even stronger' },
    { id: 'collapse', label: 'The beading collapses - water spreads and wets the surface' },
    { id: 'color', label: 'The water changes color' },
  ];

  const transferApplications = [
    {
      title: 'Self-Cleaning Surfaces',
      description: 'Building facades and solar panels use superhydrophobic coatings. When rain hits, dirt particles are picked up by rolling water droplets and carried away.',
      question: 'Why do superhydrophobic surfaces stay cleaner than regular surfaces?',
      answer: 'Water droplets on superhydrophobic surfaces roll instead of sliding. As they roll, they pick up dirt particles (which adhere better to water than to the low-energy surface), carrying debris away - the "lotus effect."',
    },
    {
      title: 'Water-Repellent Fabrics',
      description: 'Gore-Tex and similar materials use micro/nano texture plus hydrophobic chemistry to repel water while allowing vapor to pass through.',
      question: 'How do breathable waterproof fabrics work?',
      answer: 'The fabric has pores large enough for water vapor molecules to pass (sweat evaporation) but the hydrophobic surface prevents liquid water droplets from entering. The contact angle keeps droplets from penetrating the texture.',
    },
    {
      title: 'Anti-Icing Coatings',
      description: 'Aircraft, wind turbines, and power lines use superhydrophobic coatings to prevent ice accumulation. Water droplets bounce off before they can freeze.',
      question: 'Why do superhydrophobic surfaces resist ice formation?',
      answer: 'Water has minimal contact with the surface, so it either rolls off before freezing or freezes with minimal adhesion. The air pockets in the texture also act as thermal insulators, slowing heat transfer.',
    },
    {
      title: 'Lotus Leaves in Nature',
      description: 'The lotus leaf has waxy micro-bumps covered with nano-pillars. This hierarchical structure creates contact angles over 160 degrees, keeping the leaf clean in muddy water.',
      question: 'What makes the lotus leaf "self-cleaning"?',
      answer: 'Hierarchical roughness (micro + nano features) plus waxy chemistry creates a Cassie-Baxter state where water sits on air pockets. The extremely low adhesion lets droplets roll at just 2-degree tilt, collecting any particles.',
    },
  ];

  const testQuestions = [
    {
      question: 'What defines a superhydrophobic surface?',
      options: [
        { text: 'Contact angle greater than 90 degrees', correct: false },
        { text: 'Contact angle greater than 150 degrees', correct: true },
        { text: 'Contact angle less than 90 degrees', correct: false },
        { text: 'Any surface that repels water', correct: false },
      ],
    },
    {
      question: 'The lotus effect combines which two features?',
      options: [
        { text: 'High temperature and pressure', correct: false },
        { text: 'Surface texture (roughness) and low surface energy chemistry', correct: true },
        { text: 'Electrical charge and magnetism', correct: false },
        { text: 'Smooth surface and high surface energy', correct: false },
      ],
    },
    {
      question: 'In the Cassie-Baxter state, water droplets:',
      options: [
        { text: 'Completely wet the surface texture', correct: false },
        { text: 'Sit on top of air pockets trapped in the texture', correct: true },
        { text: 'Absorb into the material', correct: false },
        { text: 'Form chemical bonds with the surface', correct: false },
      ],
    },
    {
      question: 'Why does adding detergent collapse the superhydrophobic effect?',
      options: [
        { text: 'Detergent heats the water', correct: false },
        { text: 'Detergent changes water color', correct: false },
        { text: 'Detergent lowers water surface tension, allowing it to wet the texture', correct: true },
        { text: 'Detergent makes water heavier', correct: false },
      ],
    },
    {
      question: 'Young\'s equation relates contact angle to:',
      options: [
        { text: 'Temperature and pressure', correct: false },
        { text: 'Surface tensions at solid-vapor, solid-liquid, and liquid-vapor interfaces', correct: true },
        { text: 'Water volume and droplet size', correct: false },
        { text: 'Gravity and air resistance', correct: false },
      ],
    },
    {
      question: 'Surface roughness on a hydrophobic surface:',
      options: [
        { text: 'Makes it more hydrophilic', correct: false },
        { text: 'Has no effect on wettability', correct: false },
        { text: 'Amplifies the hydrophobic effect, increasing contact angle', correct: true },
        { text: 'Only affects the color', correct: false },
      ],
    },
    {
      question: 'Why do water droplets on superhydrophobic surfaces roll instead of slide?',
      options: [
        { text: 'The surface is tilted at a steep angle', correct: false },
        { text: 'Minimal contact area means very low adhesion and friction', correct: true },
        { text: 'The water is lighter than normal', correct: false },
        { text: 'Magnetic forces push the droplet', correct: false },
      ],
    },
    {
      question: 'Self-cleaning surfaces work because:',
      options: [
        { text: 'They absorb dirt into their structure', correct: false },
        { text: 'Rolling droplets pick up and carry away particles', correct: true },
        { text: 'Chemical reactions destroy the dirt', correct: false },
        { text: 'UV light sterilizes the surface', correct: false },
      ],
    },
    {
      question: 'Hierarchical surface structure means:',
      options: [
        { text: 'Multiple levels of texture (micro + nano features)', correct: true },
        { text: 'A completely smooth surface', correct: false },
        { text: 'Only microscale roughness', correct: false },
        { text: 'A surface that changes over time', correct: false },
      ],
    },
    {
      question: 'Which transition destroys superhydrophobicity?',
      options: [
        { text: 'Wenzel to Cassie-Baxter state', correct: false },
        { text: 'Cassie-Baxter to Wenzel state (air pockets collapse)', correct: true },
        { text: 'Solid to liquid phase change', correct: false },
        { text: 'Color change of the surface', correct: false },
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

  const renderDroplet = (cx: number, cy: number, radius: number, angle: number, showMicrostructure: boolean = false) => {
    // Calculate droplet shape based on contact angle
    const angleRad = (angle * Math.PI) / 180;
    const flatness = Math.cos(angleRad);

    // For high contact angles, droplet is more spherical
    const heightRatio = angle > 90 ? 1 - (180 - angle) / 180 : 0.3 + angle / 300;
    const width = radius;
    const height = radius * heightRatio * 1.5;

    return (
      <g>
        {/* Droplet shape */}
        <ellipse
          cx={cx}
          cy={cy - height / 2}
          rx={width}
          ry={height}
          fill={`url(#waterGradient)`}
          stroke={colors.waterLight}
          strokeWidth={1}
        />
        {/* Highlight */}
        <ellipse
          cx={cx - width * 0.3}
          cy={cy - height * 0.7}
          rx={width * 0.2}
          ry={height * 0.15}
          fill="rgba(255, 255, 255, 0.6)"
        />
        {/* Contact angle indicator */}
        <path
          d={`M ${cx - 25} ${cy} L ${cx} ${cy} L ${cx + 25 * Math.cos(angleRad - Math.PI)} ${cy + 25 * Math.sin(angleRad - Math.PI)}`}
          stroke={colors.warning}
          strokeWidth={2}
          fill="none"
        />
        <text x={cx + 30} y={cy - 10} fill={colors.textPrimary} fontSize={12} fontWeight="bold">
          {angle.toFixed(0)}
        </text>
      </g>
    );
  };

  const renderSurface = (showMicrostructure: boolean, roughness: number) => {
    const width = 400;
    const surfaceY = 200;
    const bumps = [];

    if (showMicrostructure && roughness > 0.3) {
      // Render micro-pillars
      const numPillars = Math.floor(20 + roughness * 30);
      const pillarWidth = 6 - roughness * 2;
      const pillarHeight = 8 + roughness * 15;
      const spacing = width / numPillars;

      for (let i = 0; i < numPillars; i++) {
        const x = 20 + i * spacing;
        const h = pillarHeight * (0.8 + Math.random() * 0.4);

        bumps.push(
          <rect
            key={`pillar-${i}`}
            x={x - pillarWidth / 2}
            y={surfaceY - h}
            width={pillarWidth}
            height={h}
            fill={colors.surface}
            stroke="#475569"
            strokeWidth={0.5}
          />
        );

        // Air pockets (shown between pillars for superhydrophobic)
        if (surfaceChemistry === 'superhydrophobic' && !hasDetergent && i > 0) {
          bumps.push(
            <rect
              key={`air-${i}`}
              x={x - spacing + pillarWidth / 2}
              y={surfaceY - h + 2}
              width={spacing - pillarWidth}
              height={h - 4}
              fill={colors.air}
              opacity={0.5}
            />
          );
        }
      }
    }

    return (
      <g>
        {/* Base surface */}
        <rect
          x={0}
          y={surfaceY}
          width={width}
          height={60}
          fill={colors.surface}
        />
        {/* Micro-pillars and air pockets */}
        {bumps}
        {/* Surface label */}
        <text x={200} y={surfaceY + 40} fill={colors.textPrimary} fontSize={11} textAnchor="middle">
          {showMicrostructure ? `Microstructured Surface (roughness: ${roughness.toFixed(1)})` : surfaceChemistry.charAt(0).toUpperCase() + surfaceChemistry.slice(1)}
        </text>
      </g>
    );
  };

  const renderVisualization = (interactive: boolean, showMicrostructure: boolean = false) => {
    const width = 400;
    const height = 300;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>

          {/* Surface */}
          {renderSurface(showMicrostructure, surfaceRoughness)}

          {/* Droplet */}
          {renderDroplet(
            interactive ? dropletPosition.x : 200,
            200,
            25,
            contactAngle,
            showMicrostructure
          )}

          {/* Contact angle meter */}
          <g transform="translate(320, 30)">
            <rect x={0} y={0} width={70} height={50} rx={8} fill="rgba(0,0,0,0.5)" />
            <text x={35} y={18} fill={colors.textMuted} fontSize={10} textAnchor="middle">Contact Angle</text>
            <text x={35} y={40} fill={contactAngle > 150 ? colors.success : contactAngle > 90 ? colors.warning : colors.error} fontSize={18} fontWeight="bold" textAnchor="middle">
              {contactAngle.toFixed(0)}
            </text>
          </g>

          {/* State indicator */}
          <g transform="translate(10, 30)">
            <rect x={0} y={0} width={100} height={35} rx={8} fill="rgba(0,0,0,0.5)" />
            <text x={50} y={15} fill={colors.textMuted} fontSize={9} textAnchor="middle">Surface State</text>
            <text x={50} y={28} fill={colors.accent} fontSize={10} fontWeight="bold" textAnchor="middle">
              {hasDetergent ? 'Wetted' : contactAngle > 150 ? 'Cassie-Baxter' : contactAngle > 90 ? 'Hydrophobic' : 'Wenzel'}
            </text>
          </g>

          {/* Labels */}
          <text x={20} y={height - 10} fill={colors.textSecondary} fontSize={11}>
            {hasDetergent ? 'Detergent added - surface tension reduced!' : `Chemistry: ${surfaceChemistry}`}
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
              }}
            >
              {isAnimating ? 'Stop Rolling' : 'Roll Droplet'}
            </button>
            <button
              onClick={() => {
                setSurfaceRoughness(0.8);
                setSurfaceChemistry('superhydrophobic');
                setHasDetergent(false);
                setDropletPosition({ x: 200, y: 120 });
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
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
          Surface Roughness: {surfaceRoughness.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={surfaceRoughness}
          onChange={(e) => setSurfaceRoughness(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Surface Chemistry
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['hydrophilic', 'hydrophobic', 'superhydrophobic'] as const).map((chem) => (
            <button
              key={chem}
              onClick={() => setSurfaceChemistry(chem)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: surfaceChemistry === chem ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: surfaceChemistry === chem ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              {chem.charAt(0).toUpperCase() + chem.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: 'rgba(6, 182, 212, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Contact Angle: {contactAngle.toFixed(0)} - {contactAngle > 150 ? 'Superhydrophobic' : contactAngle > 90 ? 'Hydrophobic' : 'Hydrophilic'}
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Higher roughness + low surface energy = higher contact angle
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
              The Lotus Secret
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Can water bead so much it rolls like mercury?
            </p>
          </div>

          {renderVisualization(true, true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Drop water on a lotus leaf and watch it ball up into perfect spheres,
                rolling away at the slightest tilt - carrying dirt with it!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is the superhydrophobic effect - when surfaces become
                "water-fearing" to an extreme degree.
              </p>
            </div>

            <div style={{
              background: 'rgba(6, 182, 212, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Click "Roll Droplet" to see how easily water moves on a superhydrophobic surface!
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
          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A water droplet sitting on a textured surface. The surface has tiny
              micro-pillars coated with a waxy, low-energy material - similar to
              a lotus leaf. The angle where water meets surface is the "contact angle."
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              When you place a water droplet on this lotus-like surface, what happens?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Surface Wettability</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust roughness and chemistry to see how contact angle changes
            </p>
          </div>

          {renderVisualization(true, true)}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Set to hydrophilic - water spreads flat (low angle)</li>
              <li>Set to hydrophobic - water beads up (angle near 100)</li>
              <li>Set to superhydrophobic with high roughness - angle exceeds 150!</li>
              <li>Notice how roughness amplifies the effect</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'ball';

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
              Water forms near-perfect spheres that roll easily - the superhydrophobic effect!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Superhydrophobicity</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Young's Equation:</strong> The contact angle
                depends on three surface tensions - solid-vapor, solid-liquid, and liquid-vapor.
                Low-energy surfaces (waxy, fluorinated) increase the contact angle.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Cassie-Baxter State:</strong> Surface texture
                traps air pockets. Water sits on top of these air cushions, only touching the
                peaks of the pillars - dramatically reducing contact area and adhesion.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Contact angle greater than 150:</strong> When both chemistry
                and roughness work together, contact angles can exceed 150, and water
                droplets become nearly spherical.
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
              What if we add a tiny drop of detergent to the water?
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
              Detergent (soap) is a surfactant - it reduces water's surface tension.
              Normally this helps water spread and clean things. What happens when
              we add it to water on a superhydrophobic surface?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              With detergent added to the water, what happens to the beading?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test the Detergent Effect</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Toggle detergent on and off to see the dramatic change
            </p>
          </div>

          {renderVisualization(true, true)}

          <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => setHasDetergent(!hasDetergent)}
              style={{
                padding: '16px 32px',
                borderRadius: '8px',
                border: 'none',
                background: hasDetergent ? colors.error : colors.warning,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              {hasDetergent ? 'Remove Detergent' : 'Add Detergent'}
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
              {hasDetergent
                ? 'The contact angle dropped dramatically! Water now wets the surface texture instead of sitting on air pockets.'
                : 'Without detergent, water maintains high contact angle on the superhydrophobic surface.'}
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'collapse';

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
              The beading collapses! Detergent destroys the superhydrophobic effect.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Cassie to Wenzel Transition</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Surface Tension Matters:</strong> Detergent
                lowers water's surface tension (liquid-vapor interface). This changes the
                balance in Young's equation, favoring wetting.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Air Pockets Collapse:</strong> With lower
                surface tension, water can now penetrate into the texture gaps. The Cassie-Baxter
                state (sitting on air) transitions to the Wenzel state (filling the texture).
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Irreversible Change:</strong> Once the air
                pockets are displaced, the surface loses its superhydrophobic properties until
                it dries out completely. This is why soap helps water clean surfaces!
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
              Superhydrophobic surfaces appear in nature and technology
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
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Completed</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
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
                {testScore >= 8 ? 'You\'ve mastered superhydrophobic surfaces!' : 'Review the material and try again.'}
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
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(6, 182, 212, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered superhydrophobic surfaces and the lotus effect</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Contact angle and Young's equation</li>
              <li>Cassie-Baxter state (air-trapping texture)</li>
              <li>Surface energy and chemistry effects</li>
              <li>How surfactants collapse superhydrophobicity</li>
              <li>Self-cleaning lotus effect</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(6, 182, 212, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Researchers are developing "omniphobic" surfaces that repel not just water
              but oils and other liquids too. These use re-entrant textures - overhanging
              structures that trap air even under oil. Applications include anti-fingerprint
              screens, non-stick cookware, and even anti-fouling boat hulls!
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

export default SuperhydrophobicRenderer;
