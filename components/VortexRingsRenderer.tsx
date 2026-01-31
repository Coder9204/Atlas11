import React, { useState, useEffect, useCallback, useRef } from 'react';

interface VortexRingsRendererProps {
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
  vortexCore: '#3b82f6',
  vortexFlow: '#60a5fa',
  velocity: '#f59e0b',
  fog: 'rgba(200, 200, 200, 0.6)',
};

interface VortexRing {
  id: number;
  x: number;
  y: number;
  radius: number;
  velocity: number;
  rotation: number;
  opacity: number;
}

const VortexRingsRenderer: React.FC<VortexRingsRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [apertureSize, setApertureSize] = useState(40);
  const [tapStrength, setTapStrength] = useState(5);
  const [airViscosity, setAirViscosity] = useState<'low' | 'high'>('low');
  const [showFog, setShowFog] = useState(false);
  const [rings, setRings] = useState<VortexRing[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const ringIdRef = useRef(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Create a vortex ring
  const createRing = useCallback(() => {
    const baseVelocity = tapStrength * 0.5;
    const sizeMultiplier = apertureSize / 40;
    const newRing: VortexRing = {
      id: ringIdRef.current++,
      x: 100,
      y: 175,
      radius: apertureSize * 0.4,
      velocity: baseVelocity * (airViscosity === 'low' ? 1 : 0.6),
      rotation: 0,
      opacity: 1,
    };
    setRings(prev => [...prev, newRing]);
  }, [apertureSize, tapStrength, airViscosity]);

  // Animation loop
  useEffect(() => {
    if (!isAnimating && rings.length === 0) return;

    const interval = setInterval(() => {
      setRings(prev => {
        const updated = prev.map(ring => ({
          ...ring,
          x: ring.x + ring.velocity,
          rotation: ring.rotation + 5,
          opacity: Math.max(0, ring.opacity - (airViscosity === 'high' ? 0.008 : 0.004)),
          velocity: ring.velocity * (airViscosity === 'high' ? 0.995 : 0.998),
        })).filter(ring => ring.x < 500 && ring.opacity > 0);
        return updated;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [isAnimating, airViscosity, rings.length]);

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
    { id: 'nothing', label: 'Nothing visible happens - air is invisible' },
    { id: 'wave', label: 'A wave of air spreads out in all directions' },
    { id: 'ring', label: 'A donut-shaped ring of spinning air travels forward' },
    { id: 'turbulence', label: 'Random turbulent swirls fill the space' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'The ring looks exactly the same' },
    { id: 'visible', label: 'You can see the ring\'s spiral structure with fog' },
    { id: 'disappear', label: 'The fog prevents the ring from forming' },
    { id: 'color', label: 'The ring changes color' },
  ];

  const transferApplications = [
    {
      title: 'Smoke Rings',
      description: 'Smokers can blow visible smoke rings by forming a circular mouth opening and pushing air with a quick tongue motion.',
      question: 'Why do smoke rings stay together instead of dispersing?',
      answer: 'The rotational flow of the vortex ring creates a self-contained structure. Smoke particles are trapped in the rotating air, making the ring visible while the stable vortex maintains its shape as it travels.',
    },
    {
      title: 'Bubble Rings Underwater',
      description: 'Dolphins and skilled divers create toroidal air bubbles that travel through water, maintaining their ring shape.',
      question: 'How can air form stable rings in water?',
      answer: 'The same vortex physics applies in water. The rotating flow creates a stable toroidal structure. In water, the higher density and viscosity actually help stabilize the ring initially, though they also cause faster decay.',
    },
    {
      title: 'Volcanic Eruptions',
      description: 'Some volcanic vents emit giant smoke rings hundreds of meters across, visible for miles.',
      question: 'What creates vortex rings in volcanic eruptions?',
      answer: 'When a pulse of hot gas exits a volcanic vent, the edges experience friction with surrounding air. This creates the rotational flow needed for a vortex ring, scaled up to enormous size by the massive energy release.',
    },
    {
      title: 'Squid Jet Propulsion',
      description: 'Squids and jellyfish create vortex rings when they jet water through their siphons for propulsion.',
      question: 'Why is vortex ring propulsion efficient for sea creatures?',
      answer: 'Vortex rings transfer momentum very efficiently. The rotating structure carries energy with minimal dissipation. Squids optimize their siphon opening to create clean vortex rings, maximizing thrust per unit of expelled water.',
    },
  ];

  const testQuestions = [
    {
      question: 'What gives a vortex ring its stability?',
      options: [
        { text: 'External pressure from surrounding air', correct: false },
        { text: 'The rotational flow creates a self-sustaining structure', correct: true },
        { text: 'Surface tension of the air', correct: false },
        { text: 'Magnetic fields in the atmosphere', correct: false },
      ],
    },
    {
      question: 'How does a vortex ring transport momentum?',
      options: [
        { text: 'By moving a large mass of air forward', correct: false },
        { text: 'Through the rotating flow pattern that carries impulse', correct: true },
        { text: 'By creating pressure differences', correct: false },
        { text: 'Through sound waves', correct: false },
      ],
    },
    {
      question: 'What happens to a vortex ring in high-viscosity fluid?',
      options: [
        { text: 'It travels faster', correct: false },
        { text: 'It grows larger', correct: false },
        { text: 'It slows down and dissipates more quickly', correct: true },
        { text: 'It splits into multiple rings', correct: false },
      ],
    },
    {
      question: 'A larger aperture creates vortex rings that are:',
      options: [
        { text: 'Smaller and faster', correct: false },
        { text: 'Larger in diameter', correct: true },
        { text: 'More colorful', correct: false },
        { text: 'Impossible to form', correct: false },
      ],
    },
    {
      question: 'The velocity of a vortex ring is related to:',
      options: [
        { text: 'Only the temperature of the air', correct: false },
        { text: 'The impulse given and the ring diameter', correct: true },
        { text: 'The color of smoke used', correct: false },
        { text: 'Gravity alone', correct: false },
      ],
    },
    {
      question: 'Vortex rings demonstrate energy transport because:',
      options: [
        { text: 'They glow in the dark', correct: false },
        { text: 'They carry kinetic energy without net mass flow', correct: true },
        { text: 'They create heat', correct: false },
        { text: 'They absorb light', correct: false },
      ],
    },
    {
      question: 'Why do smoke rings make vortex rings visible?',
      options: [
        { text: 'Smoke creates the vortex', correct: false },
        { text: 'Smoke particles are trapped in the rotating flow', correct: true },
        { text: 'Smoke changes the physics of the ring', correct: false },
        { text: 'Smoke reflects sound waves', correct: false },
      ],
    },
    {
      question: 'The cross-section of a vortex ring shows:',
      options: [
        { text: 'Static air with no motion', correct: false },
        { text: 'Two counter-rotating cores of circulation', correct: true },
        { text: 'A single point of rotation', correct: false },
        { text: 'Random turbulent motion', correct: false },
      ],
    },
    {
      question: 'Increasing tap strength (impulse) makes the vortex ring:',
      options: [
        { text: 'Move slower', correct: false },
        { text: 'Move faster initially', correct: true },
        { text: 'Change direction', correct: false },
        { text: 'Become invisible', correct: false },
      ],
    },
    {
      question: 'Dolphins create bubble rings by:',
      options: [
        { text: 'Blowing air through their blowholes with a quick pulse', correct: true },
        { text: 'Swimming in circles', correct: false },
        { text: 'Using echolocation', correct: false },
        { text: 'Heating the water', correct: false },
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

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 350;

    // Draw vortex ring cross-section
    const renderVortexCrossSection = (ring: VortexRing) => {
      const { x, y, radius, rotation, opacity } = ring;
      const coreRadius = radius * 0.25;

      // Number of flow lines
      const flowLines = [];
      const numLines = 8;

      for (let i = 0; i < numLines; i++) {
        const angle = (i / numLines) * Math.PI * 2 + (rotation * Math.PI / 180);
        const nextAngle = ((i + 1) / numLines) * Math.PI * 2 + (rotation * Math.PI / 180);

        // Upper core rotation
        const ux1 = x + Math.cos(angle) * coreRadius;
        const uy1 = (y - radius * 0.6) + Math.sin(angle) * coreRadius;
        const ux2 = x + Math.cos(nextAngle) * coreRadius;
        const uy2 = (y - radius * 0.6) + Math.sin(nextAngle) * coreRadius;

        // Lower core rotation (opposite direction)
        const lx1 = x + Math.cos(-angle) * coreRadius;
        const ly1 = (y + radius * 0.6) + Math.sin(-angle) * coreRadius;
        const lx2 = x + Math.cos(-nextAngle) * coreRadius;
        const ly2 = (y + radius * 0.6) + Math.sin(-nextAngle) * coreRadius;

        flowLines.push(
          <line key={`upper-${ring.id}-${i}`} x1={ux1} y1={uy1} x2={ux2} y2={uy2} stroke={colors.vortexFlow} strokeWidth={2} opacity={opacity * 0.8} />,
          <line key={`lower-${ring.id}-${i}`} x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke={colors.vortexFlow} strokeWidth={2} opacity={opacity * 0.8} />
        );
      }

      return (
        <g key={ring.id}>
          {/* Fog visualization if enabled */}
          {showFog && (
            <>
              <ellipse
                cx={x}
                cy={y}
                rx={radius}
                ry={radius * 1.2}
                fill={colors.fog}
                opacity={opacity * 0.5}
              />
              <ellipse
                cx={x}
                cy={y}
                rx={radius * 0.7}
                ry={radius * 0.9}
                fill="rgba(15, 23, 42, 0.8)"
                opacity={opacity}
              />
            </>
          )}

          {/* Vortex ring outline */}
          <ellipse
            cx={x}
            cy={y}
            rx={radius}
            ry={radius * 1.2}
            fill="none"
            stroke={colors.vortexCore}
            strokeWidth={2}
            opacity={opacity}
          />

          {/* Upper vortex core */}
          <circle
            cx={x}
            cy={y - radius * 0.6}
            r={coreRadius}
            fill={colors.vortexCore}
            opacity={opacity}
          />

          {/* Lower vortex core */}
          <circle
            cx={x}
            cy={y + radius * 0.6}
            r={coreRadius}
            fill={colors.vortexCore}
            opacity={opacity}
          />

          {/* Flow lines */}
          {flowLines}

          {/* Velocity vector */}
          <line
            x1={x + radius + 5}
            y1={y}
            x2={x + radius + 5 + ring.velocity * 4}
            y2={y}
            stroke={colors.velocity}
            strokeWidth={2}
            opacity={opacity}
            markerEnd="url(#arrowhead)"
          />

          {/* Circulation arrows on cores */}
          <path
            d={`M ${x - coreRadius * 0.6} ${y - radius * 0.6 - coreRadius * 0.3}
                A ${coreRadius * 0.6} ${coreRadius * 0.6} 0 1 1
                ${x + coreRadius * 0.6} ${y - radius * 0.6 - coreRadius * 0.3}`}
            fill="none"
            stroke={colors.velocity}
            strokeWidth={1.5}
            opacity={opacity}
            markerEnd="url(#smallArrow)"
          />
          <path
            d={`M ${x + coreRadius * 0.6} ${y + radius * 0.6 + coreRadius * 0.3}
                A ${coreRadius * 0.6} ${coreRadius * 0.6} 0 1 1
                ${x - coreRadius * 0.6} ${y + radius * 0.6 + coreRadius * 0.3}`}
            fill="none"
            stroke={colors.velocity}
            strokeWidth={1.5}
            opacity={opacity}
            markerEnd="url(#smallArrow)"
          />
        </g>
      );
    };

    // Draw bottle with membrane
    const renderBottle = () => (
      <g>
        {/* Bottle body */}
        <rect x={30} y={120} width={60} height={110} rx={5} fill="rgba(100, 149, 237, 0.3)" stroke={colors.vortexFlow} strokeWidth={2} />

        {/* Bottle neck */}
        <rect x={45} y={100} width={30} height={25} fill="rgba(100, 149, 237, 0.3)" stroke={colors.vortexFlow} strokeWidth={2} />

        {/* Aperture/opening */}
        <rect x={50} y={95} width={apertureSize * 0.5} height={8} fill={colors.bgPrimary} stroke={colors.accent} strokeWidth={2} />

        {/* Membrane (back of bottle) */}
        <rect x={30} y={225} width={60} height={5} fill={colors.warning} opacity={0.8} />

        {/* Tap indicator */}
        <text x={60} y={250} fill={colors.textSecondary} fontSize={10} textAnchor="middle">Tap here</text>
        <path d="M 60 235 L 60 245 L 55 240 M 60 245 L 65 240" stroke={colors.warning} strokeWidth={1.5} fill="none" />

        {/* Air inside bottle */}
        <text x={60} y={175} fill={colors.textMuted} fontSize={9} textAnchor="middle">Air</text>
      </g>
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={colors.velocity} />
            </marker>
            <marker id="smallArrow" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
              <polygon points="0 0, 6 2.5, 0 5" fill={colors.velocity} />
            </marker>
          </defs>

          {/* Background grid for depth perception */}
          {Array.from({ length: 10 }).map((_, i) => (
            <line
              key={`grid-${i}`}
              x1={i * 40 + 40}
              y1={50}
              x2={i * 40 + 40}
              y2={300}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
            />
          ))}

          {/* Bottle */}
          {renderBottle()}

          {/* Vortex rings */}
          {rings.map(ring => renderVortexCrossSection(ring))}

          {/* Static demo ring when no rings exist */}
          {rings.length === 0 && !interactive && (
            renderVortexCrossSection({
              id: -1,
              x: 250,
              y: 175,
              radius: 30,
              velocity: 3,
              rotation: 0,
              opacity: 1,
            })
          )}

          {/* Labels */}
          <text x={20} y={25} fill={colors.textSecondary} fontSize={11}>
            Aperture: {apertureSize}mm
          </text>
          <text x={20} y={40} fill={colors.textSecondary} fontSize={11}>
            Tap strength: {tapStrength}
          </text>
          <text x={width - 100} y={25} fill={colors.textSecondary} fontSize={11}>
            Viscosity: {airViscosity}
          </text>
          {showFog && (
            <text x={width - 100} y={40} fill={colors.fog} fontSize={11}>
              Fog: ON
            </text>
          )}

          {/* Legend */}
          <g transform="translate(280, 280)">
            <circle cx={0} cy={0} r={5} fill={colors.vortexCore} />
            <text x={10} y={4} fill={colors.textMuted} fontSize={9}>Vortex core</text>
            <line x1={0} y1={15} x2={20} y2={15} stroke={colors.velocity} strokeWidth={2} />
            <text x={25} y={19} fill={colors.textMuted} fontSize={9}>Velocity</text>
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => {
                createRing();
                setIsAnimating(true);
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: colors.accent,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Tap Membrane
            </button>
            <button
              onClick={() => { setRings([]); setIsAnimating(false); }}
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
          Aperture Size: {apertureSize}mm
        </label>
        <input
          type="range"
          min="20"
          max="60"
          step="5"
          value={apertureSize}
          onChange={(e) => setApertureSize(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Larger aperture = larger ring diameter
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Tap Strength: {tapStrength}
        </label>
        <input
          type="range"
          min="1"
          max="10"
          step="1"
          value={tapStrength}
          onChange={(e) => setTapStrength(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Stronger tap = faster ring velocity
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Air Viscosity
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setAirViscosity('low')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: airViscosity === 'low' ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
              background: airViscosity === 'low' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              color: colors.textPrimary,
              cursor: 'pointer',
            }}
          >
            Low (Normal Air)
          </button>
          <button
            onClick={() => setAirViscosity('high')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: airViscosity === 'high' ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
              background: airViscosity === 'high' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              color: colors.textPrimary,
              cursor: 'pointer',
            }}
          >
            High (Humid/Dense)
          </button>
        </div>
      </div>

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Ring velocity ~ Impulse / Diameter
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Smaller rings travel faster; stronger taps give more impulse
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
              Vortex Rings
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Can you throw a "ring of air" you can feel?
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
                Cut a hole in a cardboard box, cover the back with plastic, and tap the membrane.
                You can blow out candles from across the room with an invisible "smoke donut" -
                even without the smoke!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                These are vortex rings - stable structures of rotating air that travel remarkably far.
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Click "Tap Membrane" to launch vortex rings and watch them travel!
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
              A bottle with a flexible membrane at the back and a circular opening at the front.
              When you tap the membrane sharply, air is pushed out through the opening.
              The cross-section shows two vortex cores (the ring seen from the side) with
              arrows indicating the rotational flow.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              When you tap the membrane, what happens to the air?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Vortex Rings</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust aperture, tap strength, and viscosity to see how rings behave
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
              <li>Small aperture + strong tap = fast, compact ring</li>
              <li>Large aperture + gentle tap = slow, large ring</li>
              <li>High viscosity = ring slows and fades faster</li>
              <li>Rapid tapping = multiple rings that may interact!</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'ring';

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
              A donut-shaped vortex ring forms and travels forward, carrying momentum efficiently!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Vortex Rings</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Ring Formation:</strong> When air exits
                the aperture, friction between the fast-moving jet and surrounding still air creates
                rotation at the edges. This curl rolls up into a toroidal (donut) shape.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Stability:</strong> The rotating flow
                creates a self-sustaining structure. Each part of the ring induces motion in adjacent
                parts, maintaining the shape as it travels.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Energy Transport:</strong> Vortex rings
                carry kinetic energy and momentum through the fluid without significant mass transfer -
                they're remarkably efficient at moving impulse over distance.
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
              What if we add fog to see the invisible rings?
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
              Fill the bottle with fog (from a fog machine or dry ice) before tapping.
              Now the vortex ring will carry fog particles with it as it travels.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              With fog added, what will you observe about the ring?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Fog Visualization</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Toggle fog to see the vortex ring structure revealed
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '16px' }}>
            <button
              onClick={() => setShowFog(!showFog)}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '8px',
                border: showFog ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                background: showFog ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              {showFog ? 'Fog: ON - See the spiral!' : 'Fog: OFF - Toggle to see rings'}
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
              With fog, you can see the toroidal structure of the vortex ring! The fog particles
              are trapped in the rotating flow, making the invisible visible. Notice how the
              ring maintains its shape as it travels.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'visible';

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
              Fog reveals the beautiful spiral structure of the vortex ring!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why Fog Makes Rings Visible</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Particle Trapping:</strong> Fog
                particles are small and light. Once caught in the vortex ring's rotating flow,
                they stay trapped, carried along with the ring.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Structure Revealed:</strong> The
                fog shows the toroidal shape and internal rotation. You can see the spiraling
                motion within the ring's cross-section.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Classic "Smoke Rings":</strong> This
                is exactly how traditional smoke rings work - smoke particles visualize the
                vortex structure that would otherwise be invisible in air.
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
              Vortex rings appear throughout nature and technology
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
                {testScore >= 8 ? 'You\'ve mastered vortex ring physics!' : 'Review the material and try again.'}
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
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>MASTERY</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered vortex ring physics and fluid dynamics</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Vortex ring stability from rotational flow</li>
              <li>Ring velocity related to impulse and diameter</li>
              <li>Energy transport without mass transport</li>
              <li>Visualization with fog/smoke particles</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Vortex rings are studied extensively in fluid dynamics. They appear in heart valves
              during blood flow, in jet engines, and in the wakes of aircraft. The mathematics
              of vortex dynamics connects to topology - vortex rings can link and knot in
              fascinating ways!
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

export default VortexRingsRenderer;
