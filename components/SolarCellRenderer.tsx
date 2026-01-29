import React, { useState, useEffect, useCallback } from 'react';

interface SolarCellRendererProps {
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
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  solar: '#3b82f6',
  light: '#fcd34d',
  panel: '#1e3a5f',
};

const SolarCellRenderer: React.FC<SolarCellRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [lightDistance, setLightDistance] = useState(50);
  const [panelAngle, setPanelAngle] = useState(0);
  const [lightIntensity, setLightIntensity] = useState(100);
  const [useMagnifier, setUseMagnifier] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics calculations
  const calculateOutput = useCallback(() => {
    // Base intensity from source
    const baseIntensity = lightIntensity / 100;

    // Inverse square law: I proportional to 1/r^2
    // Normalize distance (50 is reference distance)
    const distanceFactor = Math.pow(50 / lightDistance, 2);

    // Angle dependence: I proportional to cos(theta)
    const angleRad = (panelAngle * Math.PI) / 180;
    const angleFactor = Math.max(0, Math.cos(angleRad));

    // Magnifier effect (2.5x intensity boost when used)
    const magnifierFactor = useMagnifier ? 2.5 : 1;

    // Combined intensity on panel
    const effectiveIntensity = baseIntensity * distanceFactor * angleFactor * magnifierFactor;

    // Solar cell output (current proportional to intensity, voltage relatively stable)
    const voltage = Math.min(0.6, 0.45 + 0.15 * Math.sqrt(effectiveIntensity));
    const current = effectiveIntensity * 100; // mA
    const power = voltage * current; // mW

    // Efficiency (typical silicon cell ~15-20%)
    const inputPower = effectiveIntensity * 1000; // Arbitrary scaling for display
    const efficiency = inputPower > 0 ? (power / inputPower) * 100 : 0;

    return {
      voltage: Math.min(voltage, 0.65),
      current: Math.min(current, 250),
      power: Math.min(power, 150),
      efficiency: Math.min(efficiency, 22),
      effectiveIntensity: Math.min(effectiveIntensity, 2.5),
    };
  }, [lightDistance, panelAngle, lightIntensity, useMagnifier]);

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setLightDistance(prev => {
        const newVal = prev + (Math.random() > 0.5 ? 2 : -2);
        return Math.max(20, Math.min(100, newVal));
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'linear', label: 'Output increases linearly with brightness - double the light, double the power' },
    { id: 'nonlinear', label: 'Output increases but NOT linearly - diminishing returns at high intensity' },
    { id: 'constant', label: 'Output stays roughly constant once there is enough light' },
    { id: 'threshold', label: 'No output until brightness reaches a threshold, then jumps up' },
  ];

  const twistPredictions = [
    { id: 'dangerous', label: 'The magnifier will damage the solar cell from too much heat' },
    { id: 'boost', label: 'Output increases significantly due to concentrated light' },
    { id: 'same', label: 'Output stays the same - the cell can only absorb so much' },
    { id: 'decrease', label: 'Output decreases because the magnifier blocks some light' },
  ];

  const transferApplications = [
    {
      title: 'Solar Farms',
      description: 'Large-scale solar installations use tracking systems to follow the sun, maximizing the cosine factor throughout the day.',
      question: 'Why do solar farms use sun-tracking mounts instead of fixed panels?',
      answer: 'Fixed panels only achieve optimal angle (cos(0) = 1) briefly each day. Tracking systems keep panels perpendicular to sunlight, maximizing energy capture by 25-40% compared to fixed installations.',
    },
    {
      title: 'Satellite Power Systems',
      description: 'Satellites in orbit must carefully manage their solar panel orientation relative to the Sun while also managing thermal loads.',
      question: 'How does the inverse-square law affect satellite solar panel design?',
      answer: 'Satellites closer to the Sun (like Mercury missions) receive more intense light but also more heat. They may angle panels away from perpendicular to reduce thermal stress, trading efficiency for survivability.',
    },
    {
      title: 'Light Meters in Photography',
      description: 'Photographers use light meters with photodiodes (similar to solar cells) to measure scene brightness for proper exposure.',
      question: 'Why do light meters need to account for angle of incidence?',
      answer: 'A light meter pointed at an angle to the light source underestimates the true illumination. Professional meters use cosine-corrected diffusers to accurately measure light from any direction.',
    },
    {
      title: 'Solar-Powered Calculators',
      description: 'Simple calculators use small photovoltaic cells that work even in indoor lighting conditions.',
      question: 'How do calculator solar cells work in dim indoor light?',
      answer: 'Amorphous silicon cells in calculators are optimized for low-light conditions. They sacrifice peak efficiency for better performance across a wide intensity range, following a more logarithmic response.',
    },
  ];

  const testQuestions = [
    {
      question: 'What happens to light intensity as you double the distance from a point source?',
      options: [
        { text: 'Intensity doubles', correct: false },
        { text: 'Intensity decreases to 1/4', correct: true },
        { text: 'Intensity decreases to 1/2', correct: false },
        { text: 'Intensity stays the same', correct: false },
      ],
    },
    {
      question: 'When a solar panel is tilted 60 degrees from perpendicular to the light source, its output is:',
      options: [
        { text: 'Zero', correct: false },
        { text: 'About 50% of maximum', correct: true },
        { text: 'About 87% of maximum', correct: false },
        { text: 'The same as when perpendicular', correct: false },
      ],
    },
    {
      question: 'The relationship between solar cell current and light intensity is approximately:',
      options: [
        { text: 'Exponential', correct: false },
        { text: 'Linear (proportional)', correct: true },
        { text: 'Inverse', correct: false },
        { text: 'Logarithmic', correct: false },
      ],
    },
    {
      question: 'Solar cell voltage under illumination:',
      options: [
        { text: 'Increases dramatically with more light', correct: false },
        { text: 'Remains relatively constant, with slight logarithmic increase', correct: true },
        { text: 'Decreases with more light', correct: false },
        { text: 'Oscillates unpredictably', correct: false },
      ],
    },
    {
      question: 'The power output of a solar cell (P = V x I) depends on intensity because:',
      options: [
        { text: 'Voltage increases linearly with intensity', correct: false },
        { text: 'Current increases linearly with intensity while voltage is nearly constant', correct: true },
        { text: 'Both voltage and current decrease with intensity', correct: false },
        { text: 'Power is independent of intensity', correct: false },
      ],
    },
    {
      question: 'Using a magnifying lens to concentrate light on a solar cell:',
      options: [
        { text: 'Always improves efficiency without any drawbacks', correct: false },
        { text: 'Increases current but may cause thermal damage if not managed', correct: true },
        { text: 'Has no effect on output', correct: false },
        { text: 'Only works with certain wavelengths of light', correct: false },
      ],
    },
    {
      question: 'The cosine law for solar panels states that effective intensity depends on:',
      options: [
        { text: 'The temperature of the panel', correct: false },
        { text: 'The angle between incident light and the panel normal', correct: true },
        { text: 'The color of the panel surface', correct: false },
        { text: 'The age of the solar cell', correct: false },
      ],
    },
    {
      question: 'Why does a solar panel produce maximum power when perpendicular to sunlight?',
      options: [
        { text: 'The panel absorbs more heat when perpendicular', correct: false },
        { text: 'Maximum projected area captures the most photons', correct: true },
        { text: 'Light travels faster when hitting perpendicular surfaces', correct: false },
        { text: 'Electrons flow more easily in perpendicular orientation', correct: false },
      ],
    },
    {
      question: 'The inverse-square law applies to solar panels because:',
      options: [
        { text: 'Light is absorbed by air over distance', correct: false },
        { text: 'Light spreads over a larger area as it travels from the source', correct: true },
        { text: 'Photons slow down with distance', correct: false },
        { text: 'Solar cells become less efficient with distance', correct: false },
      ],
    },
    {
      question: 'Solar cell efficiency is typically measured as:',
      options: [
        { text: 'Output current divided by input light intensity', correct: false },
        { text: 'Electrical power output divided by incident light power', correct: true },
        { text: 'Voltage produced per unit area', correct: false },
        { text: 'Number of photons absorbed per second', correct: false },
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

  const renderVisualization = (interactive: boolean, showMagnifier: boolean = false) => {
    const width = 400;
    const height = 350;
    const output = calculateOutput();

    // Light source position based on distance
    const lightX = 80 + (100 - lightDistance) * 2;
    const lightY = 80;

    // Panel center
    const panelCenterX = 280;
    const panelCenterY = 200;
    const panelWidth = 100;
    const panelHeight = 60;

    // Calculate panel corners with rotation
    const angleRad = (panelAngle * Math.PI) / 180;

    // Light rays
    const numRays = 8;
    const rays = [];
    for (let i = 0; i < numRays; i++) {
      const targetY = panelCenterY - panelHeight/2 + (i * panelHeight) / (numRays - 1);
      const opacity = Math.max(0.1, output.effectiveIntensity * 0.4);
      rays.push(
        <line
          key={`ray${i}`}
          x1={lightX}
          y1={lightY}
          x2={panelCenterX - panelWidth/2}
          y2={targetY}
          stroke={colors.light}
          strokeWidth={2}
          opacity={opacity}
          strokeDasharray={showMagnifier && useMagnifier ? "none" : "5,5"}
        />
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Light source (sun/lamp) */}
          <defs>
            <radialGradient id="lightGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colors.light} stopOpacity={lightIntensity / 100} />
              <stop offset="100%" stopColor={colors.light} stopOpacity="0" />
            </radialGradient>
            <linearGradient id="panelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>
          </defs>

          {/* Light glow */}
          <circle cx={lightX} cy={lightY} r={40} fill="url(#lightGlow)" />
          <circle cx={lightX} cy={lightY} r={20} fill={colors.light} opacity={0.9} />
          <circle cx={lightX} cy={lightY} r={12} fill="#fff" opacity={0.8} />

          {/* Light rays */}
          {rays}

          {/* Magnifier lens (if enabled) */}
          {showMagnifier && useMagnifier && (
            <>
              <ellipse
                cx={(lightX + panelCenterX) / 2}
                cy={(lightY + panelCenterY) / 2}
                rx={25}
                ry={35}
                fill="rgba(200, 230, 255, 0.3)"
                stroke={colors.solar}
                strokeWidth={3}
              />
              <text
                x={(lightX + panelCenterX) / 2}
                y={(lightY + panelCenterY) / 2 + 50}
                fill={colors.accent}
                fontSize={10}
                textAnchor="middle"
              >
                2.5x Magnifier
              </text>
            </>
          )}

          {/* Solar panel */}
          <g transform={`rotate(${panelAngle}, ${panelCenterX}, ${panelCenterY})`}>
            {/* Panel frame */}
            <rect
              x={panelCenterX - panelWidth/2 - 5}
              y={panelCenterY - panelHeight/2 - 5}
              width={panelWidth + 10}
              height={panelHeight + 10}
              fill="#374151"
              rx={4}
            />
            {/* Solar cells grid */}
            <rect
              x={panelCenterX - panelWidth/2}
              y={panelCenterY - panelHeight/2}
              width={panelWidth}
              height={panelHeight}
              fill="url(#panelGradient)"
              rx={2}
            />
            {/* Cell grid lines */}
            {[1, 2, 3].map(i => (
              <line
                key={`hline${i}`}
                x1={panelCenterX - panelWidth/2}
                y1={panelCenterY - panelHeight/2 + (i * panelHeight) / 4}
                x2={panelCenterX + panelWidth/2}
                y2={panelCenterY - panelHeight/2 + (i * panelHeight) / 4}
                stroke="#1e3a8a"
                strokeWidth={1}
              />
            ))}
            {[1, 2, 3, 4, 5].map(i => (
              <line
                key={`vline${i}`}
                x1={panelCenterX - panelWidth/2 + (i * panelWidth) / 6}
                y1={panelCenterY - panelHeight/2}
                x2={panelCenterX - panelWidth/2 + (i * panelWidth) / 6}
                y2={panelCenterY + panelHeight/2}
                stroke="#1e3a8a"
                strokeWidth={1}
              />
            ))}
          </g>

          {/* Panel stand */}
          <line
            x1={panelCenterX}
            y1={panelCenterY + panelHeight/2 + 5}
            x2={panelCenterX}
            y2={300}
            stroke="#4b5563"
            strokeWidth={4}
          />
          <rect x={panelCenterX - 20} y={295} width={40} height={10} fill="#4b5563" rx={2} />

          {/* Output display panel */}
          <rect x={10} y={250} width={150} height={90} fill="rgba(0,0,0,0.6)" rx={8} stroke={colors.accent} strokeWidth={1} />
          <text x={20} y={270} fill={colors.textSecondary} fontSize={11}>OUTPUT READINGS</text>

          <text x={20} y={290} fill={colors.textPrimary} fontSize={12}>
            Voltage: {output.voltage.toFixed(2)} V
          </text>
          <text x={20} y={308} fill={colors.textPrimary} fontSize={12}>
            Current: {output.current.toFixed(1)} mA
          </text>
          <text x={20} y={326} fill={colors.success} fontSize={12} fontWeight="bold">
            Power: {output.power.toFixed(1)} mW
          </text>

          {/* Distance indicator */}
          <text x={lightX} y={140} fill={colors.textSecondary} fontSize={10} textAnchor="middle">
            Distance: {lightDistance} cm
          </text>

          {/* Angle indicator */}
          <text x={panelCenterX} y={320} fill={colors.textSecondary} fontSize={10} textAnchor="middle">
            Angle: {panelAngle}deg
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
              {isAnimating ? 'Stop' : 'Animate Distance'}
            </button>
            <button
              onClick={() => { setLightDistance(50); setPanelAngle(0); setLightIntensity(100); setUseMagnifier(false); }}
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

  const renderControls = (showMagnifier: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Light Distance: {lightDistance} cm
        </label>
        <input
          type="range"
          min="20"
          max="100"
          step="5"
          value={lightDistance}
          onChange={(e) => setLightDistance(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Panel Angle: {panelAngle} degrees
        </label>
        <input
          type="range"
          min="-80"
          max="80"
          step="5"
          value={panelAngle}
          onChange={(e) => setPanelAngle(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Light Intensity: {lightIntensity}%
        </label>
        <input
          type="range"
          min="10"
          max="100"
          step="5"
          value={lightIntensity}
          onChange={(e) => setLightIntensity(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {showMagnifier && (
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
              checked={useMagnifier}
              onChange={(e) => setUseMagnifier(e.target.checked)}
              style={{ width: '20px', height: '20px' }}
            />
            Use Magnifying Lens (2.5x concentration)
          </label>
        </div>
      )}

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Effective Intensity: {(calculateOutput().effectiveIntensity * 100).toFixed(0)}%
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          I = I_0 x cos(theta) x (1/r^2) {useMagnifier ? 'x 2.5 (lens)' : ''}
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
              Solar Cell as a Physics Detector
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Does brightness scale linearly with output?
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
                A solar cell converts light into electricity. But how does the power output
                change when you move the light closer? When you tilt the panel? The answers
                reveal fundamental physics!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                Solar cells act as precise physics detectors for light intensity.
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try adjusting the distance and angle to see how power output changes!
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
              A light source illuminating a solar panel. The panel converts light energy into
              electrical current and voltage. The display shows real-time voltage (V), current (mA),
              and power output (mW = V x I).
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              If you double the light brightness, what happens to the power output?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Solar Cell Response</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust distance, angle, and intensity to discover the physics
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
              <li>Move light from 20cm to 100cm - how does power change?</li>
              <li>Keep distance fixed, tilt panel from 0 to 80 degrees</li>
              <li>Find the combination for maximum power output</li>
              <li>Note: current changes more than voltage!</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'nonlinear';

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
              Power output depends on intensity, but through multiple factors: current is linear with intensity,
              while voltage increases only logarithmically. The result is approximately linear for current, but the
              overall system shows nonlinear behavior at extremes.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Solar Cells</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Inverse Square Law:</strong> Light intensity
                decreases as 1/r^2 from a point source. Moving twice as far means only 1/4 the intensity!
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Cosine Law:</strong> Effective intensity
                depends on cos(theta) where theta is the angle from perpendicular. At 60 degrees, only 50%
                of the light is captured.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Current vs Voltage:</strong> Photocurrent
                is proportional to intensity (more photons = more electrons). Voltage increases only
                logarithmically with intensity.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Power:</strong> P = V x I. Since V is nearly
                constant and I is proportional to intensity, power is approximately proportional to intensity.
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
              What if we add a magnifying lens to concentrate the light?
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
              A magnifying lens is placed between the light source and the solar panel.
              The lens concentrates the light, increasing the intensity hitting the panel
              by about 2.5x. This is similar to concentrated solar power (CSP) systems.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What will happen when we use the magnifier with indoor light?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test the Magnifier</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Toggle the magnifier and observe the output changes
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
              The magnifier increases effective intensity by concentrating light onto a smaller area.
              With careful indoor use, this boosts power output significantly. In bright sunlight,
              thermal management becomes critical!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'boost';

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
              With indoor light, the magnifier safely boosts output! The concentrated light increases
              current significantly, producing more power.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Concentrated Solar Power</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Concentration Factor:</strong> A simple
                magnifier provides 2-3x concentration. Industrial concentrators can achieve 500-1000x!
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Thermal Challenge:</strong> In sunlight,
                concentrated solar creates intense heat. Special multi-junction cells with cooling
                systems are required for high concentration ratios.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Indoor Safety:</strong> With typical
                indoor lighting (~500 lux vs 100,000 lux sunlight), magnification is safe and
                demonstrates the principle without thermal risks.
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
              Solar cell physics applies across many technologies
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
                {testScore >= 8 ? 'You\'ve mastered solar cell physics!' : 'Review the material and try again.'}
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
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered solar cell physics and light detection</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Inverse-square law for light intensity (I proportional to 1/r^2)</li>
              <li>Cosine dependence on angle of incidence</li>
              <li>Current proportional to intensity, voltage nearly constant</li>
              <li>Power = Voltage x Current</li>
              <li>Concentrated solar power principles</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Modern solar cells achieve up to 47% efficiency using multi-junction designs and
              concentration. Space missions use solar panels with tracking systems to maximize power.
              The same physics applies to photodiodes used in optical communication, camera sensors,
              and medical imaging devices!
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

export default SolarCellRenderer;
