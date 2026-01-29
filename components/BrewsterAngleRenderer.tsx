import React, { useState, useEffect, useCallback } from 'react';

interface BrewsterAngleRendererProps {
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
  lightRay: '#fbbf24',
  reflectedRay: '#f97316',
  refractedRay: '#3b82f6',
  polarized: '#10b981',
  surface: '#64748b',
};

// Material refractive indices
const materials = {
  glass: { name: 'Glass', n: 1.52, brewsterAngle: 56.7 },
  water: { name: 'Water', n: 1.33, brewsterAngle: 53.1 },
  plastic: { name: 'Plastic (Acrylic)', n: 1.49, brewsterAngle: 56.1 },
};

const BrewsterAngleRenderer: React.FC<BrewsterAngleRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [incidentAngle, setIncidentAngle] = useState(45);
  const [polarizerAngle, setPolarizerAngle] = useState(0);
  const [material, setMaterial] = useState<keyof typeof materials>('glass');
  const [showPolarizer, setShowPolarizer] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Calculate physics
  const currentMaterial = materials[material];
  const brewsterAngle = currentMaterial.brewsterAngle;
  const n = currentMaterial.n;

  // Fresnel equations for s and p polarization (simplified for visualization)
  const angleRad = (incidentAngle * Math.PI) / 180;
  const refractedAngleRad = Math.asin(Math.sin(angleRad) / n);
  const refractedAngle = (refractedAngleRad * 180) / Math.PI;

  // Reflectivity for p-polarized light (approaches 0 at Brewster angle)
  const cosThetaI = Math.cos(angleRad);
  const cosThetaT = Math.cos(refractedAngleRad);
  const rs = Math.pow((cosThetaI - n * cosThetaT) / (cosThetaI + n * cosThetaT), 2);
  const rp = Math.pow((n * cosThetaI - cosThetaT) / (n * cosThetaI + cosThetaT), 2);

  // Glare intensity depends on polarizer alignment and p-polarization
  const polarizationFactor = Math.cos((polarizerAngle * Math.PI) / 180);
  const glareIntensity = showPolarizer
    ? rs * Math.pow(polarizationFactor, 2) + rp * Math.pow(Math.sin((polarizerAngle * Math.PI) / 180), 2)
    : (rs + rp) / 2;

  // How close to Brewster angle
  const brewsterProximity = 1 - Math.abs(incidentAngle - brewsterAngle) / 90;

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setIncidentAngle(prev => {
        const next = prev + 0.5;
        return next > 85 ? 5 : next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'no_angle', label: 'Glare is equally strong at all angles' },
    { id: 'perpendicular', label: 'Glare is strongest at 90 degrees (perpendicular)' },
    { id: 'brewster', label: 'There is a specific angle where glare reduction is maximum' },
    { id: 'parallel', label: 'Glare is strongest at grazing angles (near parallel)' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'The magic angle is the same for all materials' },
    { id: 'different', label: 'Different materials have different magic angles' },
    { id: 'none', label: 'Some materials have no special angle at all' },
    { id: 'multiple', label: 'Each material has multiple magic angles' },
  ];

  const transferApplications = [
    {
      title: 'Photography with Polarizing Filters',
      description: 'Photographers use circular polarizing filters to reduce glare from water, glass, and foliage, making colors more vivid and skies bluer.',
      question: 'Why do photographers rotate their polarizing filter when shooting?',
      answer: 'The reflected light is polarized in a specific direction. Rotating the filter aligns its polarization axis to block the polarized reflected light while allowing the unpolarized scene light through.',
    },
    {
      title: 'Laser Windows (Brewster Windows)',
      description: 'High-power lasers use windows tilted at Brewster angle. The p-polarized laser light passes through with zero reflection loss.',
      question: 'Why are Brewster windows used in laser cavities?',
      answer: 'At Brewster angle, p-polarized light has zero reflection. This eliminates power loss at windows and naturally selects a single polarization state for the laser output.',
    },
    {
      title: 'Glare-Free Glass Displays',
      description: 'Some electronic displays and museum cases are designed with viewing angles optimized near Brewster angle to minimize reflections.',
      question: 'How can display designers minimize glare without anti-reflective coatings?',
      answer: 'By tilting displays so the typical viewing angle approaches Brewster angle, reflected ambient light becomes strongly polarized. Users can then use polarized glasses to eliminate the glare.',
    },
    {
      title: 'Sunglasses Design',
      description: 'Polarized sunglasses are designed to block horizontally polarized light, which is the polarization of glare from horizontal surfaces like roads and water.',
      question: 'Why are polarized sunglasses most effective for reducing road and water glare?',
      answer: 'Light reflecting off horizontal surfaces at angles near Brewster angle becomes horizontally polarized. Sunglasses with vertical polarization filters block this specific polarization, dramatically reducing glare.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is Brewster angle?',
      options: [
        { text: 'The angle at which all light is absorbed', correct: false },
        { text: 'The angle at which reflected light becomes completely p-polarized', correct: false },
        { text: 'The angle at which reflected light becomes completely s-polarized (and p-polarized reflection is zero)', correct: true },
        { text: 'The angle of total internal reflection', correct: false },
      ],
    },
    {
      question: 'At Brewster angle, what happens to p-polarized light?',
      options: [
        { text: 'It is completely reflected', correct: false },
        { text: 'It is completely transmitted (zero reflection)', correct: true },
        { text: 'It is converted to s-polarized light', correct: false },
        { text: 'It is absorbed by the surface', correct: false },
      ],
    },
    {
      question: 'The Brewster angle depends on:',
      options: [
        { text: 'The color of light only', correct: false },
        { text: 'The refractive index of the material', correct: true },
        { text: 'The thickness of the material', correct: false },
        { text: 'The temperature of the material', correct: false },
      ],
    },
    {
      question: 'Polarized sunglasses reduce glare because:',
      options: [
        { text: 'They absorb all light equally', correct: false },
        { text: 'Glare is often horizontally polarized, and the glasses block that polarization', correct: true },
        { text: 'They change the Brewster angle of your eyes', correct: false },
        { text: 'They heat up and absorb infrared', correct: false },
      ],
    },
    {
      question: 'For glass (n = 1.5), Brewster angle is approximately:',
      options: [
        { text: '30 degrees', correct: false },
        { text: '45 degrees', correct: false },
        { text: '56 degrees', correct: true },
        { text: '75 degrees', correct: false },
      ],
    },
    {
      question: 'Why are Brewster windows used in lasers?',
      options: [
        { text: 'To focus the laser beam', correct: false },
        { text: 'To eliminate reflection losses for polarized laser light', correct: true },
        { text: 'To cool the laser cavity', correct: false },
        { text: 'To change the laser color', correct: false },
      ],
    },
    {
      question: 'Light reflecting off a lake at a low angle is:',
      options: [
        { text: 'Unpolarized', correct: false },
        { text: 'Circularly polarized', correct: false },
        { text: 'Mostly horizontally polarized', correct: true },
        { text: 'Mostly vertically polarized', correct: false },
      ],
    },
    {
      question: 'The mathematical relationship for Brewster angle is:',
      options: [
        { text: 'sin(theta) = n', correct: false },
        { text: 'tan(theta) = n', correct: true },
        { text: 'cos(theta) = n', correct: false },
        { text: 'theta = 45 degrees always', correct: false },
      ],
    },
    {
      question: 'Water has a lower refractive index than glass. Therefore, water\'s Brewster angle is:',
      options: [
        { text: 'Higher than glass', correct: false },
        { text: 'Lower than glass', correct: true },
        { text: 'The same as glass', correct: false },
        { text: 'Undefined for water', correct: false },
      ],
    },
    {
      question: 'A polarizing filter is most effective at reducing glare when the viewing angle is:',
      options: [
        { text: 'Perpendicular to the surface (looking straight down)', correct: false },
        { text: 'Near Brewster angle where reflected light is most polarized', correct: true },
        { text: 'Parallel to the surface (grazing angle)', correct: false },
        { text: 'It works equally at all angles', correct: false },
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
    const width = 400;
    const height = 350;
    const surfaceY = height * 0.6;
    const hitPoint = { x: width / 2, y: surfaceY };

    // Calculate ray endpoints
    const rayLength = 120;
    const incidentRad = (incidentAngle * Math.PI) / 180;
    const incidentStart = {
      x: hitPoint.x - rayLength * Math.sin(incidentRad),
      y: hitPoint.y - rayLength * Math.cos(incidentRad),
    };
    const reflectedEnd = {
      x: hitPoint.x + rayLength * Math.sin(incidentRad),
      y: hitPoint.y - rayLength * Math.cos(incidentRad),
    };
    const refractedEnd = {
      x: hitPoint.x + rayLength * 0.8 * Math.sin(refractedAngleRad),
      y: hitPoint.y + rayLength * 0.8 * Math.cos(refractedAngleRad),
    };

    // Glare meter
    const glareWidth = 100;
    const glareHeight = 20;

    // Polarization indicator
    const nearBrewster = Math.abs(incidentAngle - brewsterAngle) < 5;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Surface */}
          <rect
            x={0}
            y={surfaceY}
            width={width}
            height={height - surfaceY}
            fill={material === 'water' ? 'rgba(59, 130, 246, 0.5)' : material === 'glass' ? 'rgba(148, 163, 184, 0.6)' : 'rgba(168, 162, 158, 0.5)'}
          />
          <line
            x1={0}
            y1={surfaceY}
            x2={width}
            y2={surfaceY}
            stroke={colors.surface}
            strokeWidth={3}
          />

          {/* Normal line (dashed) */}
          <line
            x1={hitPoint.x}
            y1={surfaceY - 100}
            x2={hitPoint.x}
            y2={surfaceY + 60}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1}
            strokeDasharray="5,5"
          />

          {/* Incident ray */}
          <line
            x1={incidentStart.x}
            y1={incidentStart.y}
            x2={hitPoint.x}
            y2={hitPoint.y}
            stroke={colors.lightRay}
            strokeWidth={4}
          />
          <polygon
            points={`${hitPoint.x},${hitPoint.y} ${hitPoint.x - 8},${hitPoint.y - 16} ${hitPoint.x + 8},${hitPoint.y - 16}`}
            fill={colors.lightRay}
            transform={`rotate(${incidentAngle}, ${hitPoint.x}, ${hitPoint.y})`}
          />

          {/* Reflected ray with intensity based on glare */}
          <line
            x1={hitPoint.x}
            y1={hitPoint.y}
            x2={reflectedEnd.x}
            y2={reflectedEnd.y}
            stroke={colors.reflectedRay}
            strokeWidth={4}
            opacity={0.3 + glareIntensity * 0.7}
          />

          {/* Refracted ray */}
          <line
            x1={hitPoint.x}
            y1={hitPoint.y}
            x2={refractedEnd.x}
            y2={refractedEnd.y}
            stroke={colors.refractedRay}
            strokeWidth={4}
            opacity={0.8}
          />

          {/* Polarization indicators on reflected ray */}
          {nearBrewster && (
            <g>
              <circle cx={reflectedEnd.x - 20} cy={reflectedEnd.y - 20} r={8} fill="none" stroke={colors.polarized} strokeWidth={2} />
              <line x1={reflectedEnd.x - 28} y1={reflectedEnd.y - 20} x2={reflectedEnd.x - 12} y2={reflectedEnd.y - 20} stroke={colors.polarized} strokeWidth={2} />
            </g>
          )}

          {/* Polarizer filter (if enabled) */}
          {showPolarizer && (
            <g transform={`translate(${reflectedEnd.x + 20}, ${reflectedEnd.y - 40})`}>
              <rect
                x={-20}
                y={-30}
                width={40}
                height={60}
                fill="rgba(139, 92, 246, 0.3)"
                stroke={colors.accent}
                strokeWidth={2}
                rx={4}
              />
              <line
                x1={0}
                y1={-25}
                x2={0}
                y2={25}
                stroke={colors.accent}
                strokeWidth={3}
                transform={`rotate(${polarizerAngle}, 0, 0)`}
              />
              <text x={0} y={45} fill={colors.textSecondary} fontSize={10} textAnchor="middle">Polarizer</text>
            </g>
          )}

          {/* Brewster angle marker */}
          <g>
            <line
              x1={hitPoint.x}
              y1={hitPoint.y}
              x2={hitPoint.x + 50 * Math.sin((brewsterAngle * Math.PI) / 180)}
              y2={hitPoint.y - 50 * Math.cos((brewsterAngle * Math.PI) / 180)}
              stroke={colors.success}
              strokeWidth={2}
              strokeDasharray="3,3"
              opacity={0.7}
            />
            <text
              x={hitPoint.x + 55 * Math.sin((brewsterAngle * Math.PI) / 180)}
              y={hitPoint.y - 55 * Math.cos((brewsterAngle * Math.PI) / 180)}
              fill={colors.success}
              fontSize={10}
            >
              Brewster
            </text>
          </g>

          {/* Angle arc */}
          <path
            d={`M ${hitPoint.x} ${hitPoint.y - 40} A 40 40 0 0 1 ${hitPoint.x + 40 * Math.sin(incidentRad)} ${hitPoint.y - 40 * Math.cos(incidentRad)}`}
            fill="none"
            stroke={colors.lightRay}
            strokeWidth={2}
          />
          <text
            x={hitPoint.x + 50 * Math.sin(incidentRad / 2)}
            y={hitPoint.y - 50 * Math.cos(incidentRad / 2)}
            fill={colors.lightRay}
            fontSize={12}
          >
            {incidentAngle.toFixed(0)}°
          </text>

          {/* Labels */}
          <text x={20} y={25} fill={colors.textPrimary} fontSize={12}>
            Material: {currentMaterial.name} (n = {n})
          </text>
          <text x={20} y={42} fill={colors.textSecondary} fontSize={11}>
            Brewster angle: {brewsterAngle.toFixed(1)}°
          </text>

          {/* Glare intensity meter */}
          <g transform={`translate(${width - glareWidth - 20}, 20)`}>
            <text x={0} y={0} fill={colors.textSecondary} fontSize={11}>Glare Intensity</text>
            <rect x={0} y={8} width={glareWidth} height={glareHeight} fill="rgba(255,255,255,0.1)" rx={4} />
            <rect x={0} y={8} width={glareWidth * glareIntensity} height={glareHeight} fill={glareIntensity > 0.5 ? colors.error : glareIntensity > 0.2 ? colors.warning : colors.success} rx={4} />
            <text x={glareWidth / 2} y={23} fill={colors.textPrimary} fontSize={10} textAnchor="middle">
              {(glareIntensity * 100).toFixed(0)}%
            </text>
          </g>

          {/* Status indicator */}
          {nearBrewster && (
            <g transform={`translate(${width / 2}, ${height - 30})`}>
              <rect x={-80} y={-12} width={160} height={24} fill="rgba(16, 185, 129, 0.3)" rx={12} />
              <text x={0} y={5} fill={colors.success} fontSize={12} textAnchor="middle">
                Near Brewster Angle!
              </text>
            </g>
          )}
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
              {isAnimating ? 'Stop' : 'Sweep Angles'}
            </button>
            <button
              onClick={() => { setIncidentAngle(brewsterAngle); setIsAnimating(false); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.success}`,
                background: 'transparent',
                color: colors.success,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Go to Brewster
            </button>
            <button
              onClick={() => { setIncidentAngle(45); setPolarizerAngle(0); setMaterial('glass'); }}
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
          Incident Angle: {incidentAngle.toFixed(1)}° (Brewster: {brewsterAngle.toFixed(1)}°)
        </label>
        <input
          type="range"
          min="5"
          max="85"
          step="0.5"
          value={incidentAngle}
          onChange={(e) => setIncidentAngle(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Polarizer Rotation: {polarizerAngle.toFixed(0)}°
        </label>
        <input
          type="range"
          min="0"
          max="90"
          step="1"
          value={polarizerAngle}
          onChange={(e) => setPolarizerAngle(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Surface Material:
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(Object.keys(materials) as Array<keyof typeof materials>).map((m) => (
            <button
              key={m}
              onClick={() => setMaterial(m)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: material === m ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: material === m ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {materials[m].name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textSecondary, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showPolarizer}
            onChange={(e) => setShowPolarizer(e.target.checked)}
          />
          Show Polarizing Filter
        </label>
      </div>

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          P-polarized reflectivity: {(rp * 100).toFixed(1)}%
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          S-polarized reflectivity: {(rs * 100).toFixed(1)}%
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          At Brewster angle, p-polarized reflection drops to 0%
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
              The Glare-Killing Angle
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              At what angle does glare become "most polarizable"?
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
                Shine a light on a glossy surface. Rotate a polarizing filter in front of your
                eyes and watch the glare change. At certain viewing angles, the polarizer can
                almost completely eliminate the reflection!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This magic angle is called the Brewster angle - and it is the secret behind
                polarized sunglasses and glare-free optics.
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Click "Sweep Angles" to watch how glare intensity changes with viewing angle!
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
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You Are Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A light ray hitting a glossy surface. The yellow ray is incoming light.
              The orange ray is reflected light (glare). The blue ray is light entering the material.
              The glare meter shows how much light is reflected.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              When you change the viewing angle, what happens to glare reduction with a polarizer?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Brewster Angle</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust the angle and polarizer to minimize glare
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
              <li>Set angle near 56° for glass - watch p-polarized reflection vanish</li>
              <li>Rotate polarizer at Brewster angle - glare drops dramatically</li>
              <li>Compare angles far from Brewster - polarizer is less effective</li>
              <li>Try "Sweep Angles" to see the intensity curve</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'brewster';

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
              There is a specific angle where glare reduction is maximum - the Brewster angle!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Brewster Angle</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Polarization Split:</strong> When light
                reflects at an angle, it splits into two polarization components: s-polarized (perpendicular
                to the plane) and p-polarized (parallel to the plane).
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Brewster's Discovery:</strong> At a specific
                angle (tan(theta) = n), the reflected and refracted rays are perpendicular. At this angle,
                p-polarized light cannot reflect - it is all transmitted!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Polarized Glare:</strong> The reflected light
                at Brewster angle is 100% s-polarized. A polarizer aligned to block s-polarization can
                eliminate glare completely.
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
              What happens when we try different materials?
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
              We found the Brewster angle for glass. But water and plastic have different
              refractive indices. Does the "magic angle" change?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              For different materials (water, glass, plastic), what happens to Brewster angle?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Compare Materials</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Switch between water, glass, and plastic to compare Brewster angles
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
              Water (n=1.33): Brewster angle = 53.1°<br/>
              Plastic (n=1.49): Brewster angle = 56.1°<br/>
              Glass (n=1.52): Brewster angle = 56.7°<br/><br/>
              Higher refractive index means higher Brewster angle!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'different';

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
              Different materials have different Brewster angles based on their refractive index!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Brewster Formula</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>tan(theta_B) = n</strong><br/>
                The Brewster angle is simply the arctangent of the refractive index.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Physical Meaning:</strong> At Brewster
                angle, the reflected and refracted rays are exactly 90° apart. This geometry
                prevents p-polarized oscillations from coupling into the reflected direction.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Practical Impact:</strong> Photographers
                must adjust their polarizer angle when shooting different surfaces - water vs glass
                have optimal angles that differ by several degrees!
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
              Brewster angle physics in photography, lasers, and everyday life
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
                {testScore >= 8 ? 'You have mastered Brewster angle!' : 'Review the material and try again.'}
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
                      {opt.correct ? 'Correct:' : userAnswer === oIndex ? 'Your answer:' : ''} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review and Retry')}
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You have mastered Brewster angle and polarization-based glare control</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Brewster angle: tan(theta) = n</li>
              <li>P-polarized light has zero reflection at Brewster angle</li>
              <li>Reflected light becomes s-polarized at Brewster angle</li>
              <li>Different materials have different Brewster angles</li>
              <li>Polarizing filters exploit this for glare reduction</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Brewster angle has applications in laser physics, fiber optics, and even art authentication.
              Ellipsometry uses Brewster angle principles to measure thin film properties at the nanometer
              scale. The mathematics connects to Fresnel equations and electromagnetic wave theory!
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

export default BrewsterAngleRenderer;
