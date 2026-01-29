import React, { useState, useEffect, useCallback } from 'react';

interface PowerLossRendererProps {
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
  wireCopper: '#b87333',
  wireThin: '#cd7f32',
  battery: '#fbbf24',
  bulbOn: '#fef08a',
  bulbDim: '#854d0e',
  heat: '#ef4444',
};

// Wire gauge data (AWG to diameter in mm)
const wireGauges = [
  { awg: 10, diameter: 2.59, area: 5.26, label: '10 AWG (Thick)' },
  { awg: 14, diameter: 1.63, area: 2.08, label: '14 AWG (Medium)' },
  { awg: 18, diameter: 1.02, area: 0.82, label: '18 AWG (Thin)' },
  { awg: 22, diameter: 0.64, area: 0.32, label: '22 AWG (Very Thin)' },
];

// Resistivity of copper (ohm*mm^2/m)
const COPPER_RESISTIVITY = 0.0172;

const PowerLossRenderer: React.FC<PowerLossRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [wireLength, setWireLength] = useState(10); // meters
  const [gaugeIndex, setGaugeIndex] = useState(1); // Start with 14 AWG
  const [current, setCurrent] = useState(2); // Amps
  const [isCoiled, setIsCoiled] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Calculate resistance, power loss, voltage drop
  const gauge = wireGauges[gaugeIndex];
  const effectiveLength = isCoiled ? wireLength * 3 : wireLength; // Coiling triples effective length
  const resistance = (COPPER_RESISTIVITY * effectiveLength) / gauge.area;
  const powerLoss = current * current * resistance;
  const voltageDrop = current * resistance;
  const supplyVoltage = 12;
  const loadVoltage = Math.max(0, supplyVoltage - voltageDrop);
  const brightness = Math.max(0, Math.min(1, loadVoltage / supplyVoltage));

  // Animation for electron flow
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const predictions = [
    { id: 'same', label: 'The bulb will be just as bright - same battery, same power' },
    { id: 'brighter', label: 'The bulb will be brighter - longer wire carries more energy' },
    { id: 'dimmer', label: 'The bulb will be dimmer - the wire "uses up" some voltage' },
    { id: 'flicker', label: 'The bulb will flicker due to the long wire' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Coiling has no effect - same amount of copper' },
    { id: 'brighter', label: 'Coiling makes it brighter - magnetic field helps' },
    { id: 'dimmer', label: 'Coiling makes it even dimmer - more wire length to travel' },
    { id: 'heat', label: 'Coiling only makes the wire hotter, bulb stays the same' },
  ];

  const transferApplications = [
    {
      title: 'Power Grid Transmission',
      description: 'Power plants send electricity hundreds of miles through transmission lines. Why use high voltage (hundreds of thousands of volts)?',
      question: 'If power loss is I squared R, how does high voltage reduce losses over long distances?',
      answer: 'Power = Voltage x Current. For the same power, higher voltage means lower current. Since losses are I squared R, halving the current reduces losses by 4x! This is why transmission lines use 115kV-765kV.',
    },
    {
      title: 'USB Charging Cables',
      description: 'You may notice that cheap, thin USB cables charge your phone slower or not at all for power-hungry devices.',
      question: 'Why do high-quality USB cables use thicker wires inside?',
      answer: 'Thicker wires have lower resistance (R = rho*L/A). With 2-3 amps for fast charging, thin wires can drop enough voltage that the phone reduces charging current. Quality cables maintain voltage for full-speed charging.',
    },
    {
      title: 'Speaker Wires',
      description: 'Audiophiles debate speaker wire gauge. For a 100W speaker 50 feet from the amplifier, wire choice matters.',
      question: 'How does speaker wire resistance affect sound quality?',
      answer: 'Speaker wire resistance creates a voltage divider with the speaker. High resistance wastes power as heat and can cause frequency-dependent damping. Thick gauge (12-14 AWG) ensures <5% power loss for long runs.',
    },
    {
      title: 'EV Charging',
      description: 'Electric vehicle charging stations deliver 50-350 kW through thick cables. The cables are often liquid-cooled!',
      question: 'Why do DC fast chargers need such thick, cooled cables?',
      answer: 'At 500A (some chargers), even low-resistance cables generate massive heat (P = I squared R). A 0.001 ohm cable at 500A loses 250W as heat per meter! Thick copper and liquid cooling prevent fire and maintain efficiency.',
    },
  ];

  const testQuestions = [
    {
      question: 'The resistance of a wire depends on:',
      options: [
        { text: 'Length only', correct: false },
        { text: 'Cross-sectional area only', correct: false },
        { text: 'Both length and cross-sectional area', correct: true },
        { text: 'Only the material type', correct: false },
      ],
    },
    {
      question: 'If you double the length of a wire, its resistance:',
      options: [
        { text: 'Stays the same', correct: false },
        { text: 'Doubles', correct: true },
        { text: 'Halves', correct: false },
        { text: 'Quadruples', correct: false },
      ],
    },
    {
      question: 'If you double the cross-sectional area of a wire, its resistance:',
      options: [
        { text: 'Stays the same', correct: false },
        { text: 'Doubles', correct: false },
        { text: 'Halves', correct: true },
        { text: 'Quadruples', correct: false },
      ],
    },
    {
      question: 'Power loss in a wire is calculated as:',
      options: [
        { text: 'P = IR', correct: false },
        { text: 'P = V/R', correct: false },
        { text: 'P = I squared R', correct: true },
        { text: 'P = R/I', correct: false },
      ],
    },
    {
      question: 'If current doubles while resistance stays the same, power loss:',
      options: [
        { text: 'Doubles', correct: false },
        { text: 'Stays the same', correct: false },
        { text: 'Quadruples', correct: true },
        { text: 'Halves', correct: false },
      ],
    },
    {
      question: 'Why do power transmission lines use high voltage?',
      options: [
        { text: 'To increase the speed of electricity', correct: false },
        { text: 'To reduce current and thus I squared R losses', correct: true },
        { text: 'Because transformers only work at high voltage', correct: false },
        { text: 'To prevent lightning strikes', correct: false },
      ],
    },
    {
      question: 'A wire carrying 3A has resistance of 2 ohms. The power lost as heat is:',
      options: [
        { text: '6 watts', correct: false },
        { text: '9 watts', correct: false },
        { text: '18 watts', correct: true },
        { text: '1.5 watts', correct: false },
      ],
    },
    {
      question: 'Coiling a wire (without overlapping) affects its resistance by:',
      options: [
        { text: 'No effect - same amount of material', correct: false },
        { text: 'Increasing it - longer path for current', correct: true },
        { text: 'Decreasing it - magnetic field helps', correct: false },
        { text: 'Making it variable', correct: false },
      ],
    },
    {
      question: 'Why do phone charger cables get warm during fast charging?',
      options: [
        { text: 'The phone generates heat that travels up the cable', correct: false },
        { text: 'I squared R power loss in the cable resistance', correct: true },
        { text: 'Chemical reactions in the wire', correct: false },
        { text: 'Friction from moving electrons', correct: false },
      ],
    },
    {
      question: 'A 12V battery powers an LED through a long thin wire. The LED gets 9V. The wire has dropped:',
      options: [
        { text: '9 volts', correct: false },
        { text: '3 volts', correct: true },
        { text: '12 volts', correct: false },
        { text: '21 volts', correct: false },
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
    const height = 320;

    // Wire thickness based on gauge
    const wireThickness = 2 + (10 - gaugeIndex * 2);
    const heatIntensity = Math.min(1, powerLoss / 20);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: '#1e293b', borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Battery */}
          <rect x={30} y={100} width={40} height={100} rx={4} fill={colors.battery} stroke="#92400e" strokeWidth={2} />
          <rect x={42} y={90} width={16} height={12} rx={2} fill={colors.battery} />
          <text x={50} y={155} textAnchor="middle" fill="#92400e" fontSize={12} fontWeight="bold">12V</text>
          <text x={50} y={175} textAnchor="middle" fill="#92400e" fontSize={10}>+</text>

          {/* Top wire (positive) - with length visualization */}
          <defs>
            <linearGradient id="wireHeat" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.wireCopper} />
              <stop offset="50%" stopColor={`rgba(239, 68, 68, ${heatIntensity})`} />
              <stop offset="100%" stopColor={colors.wireCopper} />
            </linearGradient>
          </defs>

          {isCoiled ? (
            // Coiled wire visualization
            <>
              <path
                d={`M 70 100
                    Q 100 70, 130 100 Q 160 130, 190 100 Q 220 70, 250 100
                    Q 280 130, 310 100 L 330 100`}
                fill="none"
                stroke={`url(#wireHeat)`}
                strokeWidth={wireThickness}
                strokeLinecap="round"
              />
              {/* Electron flow animation for coiled */}
              {[0, 25, 50, 75].map((offset) => (
                <circle
                  key={offset}
                  r={3}
                  fill="#60a5fa"
                  opacity={0.8}
                >
                  <animateMotion
                    dur="2s"
                    repeatCount="indefinite"
                    begin={`${offset / 100}s`}
                    path="M 70 100 Q 100 70, 130 100 Q 160 130, 190 100 Q 220 70, 250 100 Q 280 130, 310 100 L 330 100"
                  />
                </circle>
              ))}
            </>
          ) : (
            // Straight wire
            <>
              <line
                x1={70}
                y1={100}
                x2={330}
                y2={100}
                stroke={`url(#wireHeat)`}
                strokeWidth={wireThickness}
                strokeLinecap="round"
              />
              {/* Electron flow animation */}
              {[0, 0.25, 0.5, 0.75].map((offset) => (
                <circle
                  key={offset}
                  cx={70 + ((animationFrame / 100 + offset) % 1) * 260}
                  cy={100}
                  r={3}
                  fill="#60a5fa"
                  opacity={0.8}
                />
              ))}
            </>
          )}

          {/* LED/Bulb */}
          <circle
            cx={350}
            cy={150}
            r={25}
            fill={`rgba(254, 240, 138, ${brightness})`}
            stroke={brightness > 0.5 ? colors.bulbOn : colors.bulbDim}
            strokeWidth={3}
          />
          {brightness > 0.3 && (
            <>
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <line
                  key={angle}
                  x1={350 + Math.cos((angle * Math.PI) / 180) * 30}
                  y1={150 + Math.sin((angle * Math.PI) / 180) * 30}
                  x2={350 + Math.cos((angle * Math.PI) / 180) * (35 + brightness * 10)}
                  y2={150 + Math.sin((angle * Math.PI) / 180) * (35 + brightness * 10)}
                  stroke={colors.bulbOn}
                  strokeWidth={2}
                  opacity={brightness}
                />
              ))}
            </>
          )}
          <text x={350} y={155} textAnchor="middle" fill={brightness > 0.5 ? '#92400e' : colors.textMuted} fontSize={10} fontWeight="bold">
            LED
          </text>

          {/* Bottom wire (return) */}
          <line
            x1={70}
            y1={200}
            x2={330}
            y2={200}
            stroke={colors.wireCopper}
            strokeWidth={wireThickness}
            strokeLinecap="round"
          />

          {/* Vertical connections */}
          <line x1={70} y1={100} x2={70} y2={200} stroke={colors.wireCopper} strokeWidth={wireThickness} />
          <line x1={350} y1={125} x2={350} y2={175} stroke={colors.wireCopper} strokeWidth={wireThickness / 2} />
          <line x1={330} y1={100} x2={350} y2={125} stroke={colors.wireCopper} strokeWidth={wireThickness / 2} />
          <line x1={330} y1={200} x2={350} y2={175} stroke={colors.wireCopper} strokeWidth={wireThickness / 2} />

          {/* Voltage drop visualization */}
          <rect x={80} y={60} width={240} height={25} rx={4} fill="rgba(0,0,0,0.3)" />
          <rect
            x={80}
            y={60}
            width={240 * (loadVoltage / supplyVoltage)}
            height={25}
            rx={4}
            fill={colors.success}
            opacity={0.7}
          />
          <text x={200} y={77} textAnchor="middle" fill={colors.textPrimary} fontSize={11} fontWeight="bold">
            {loadVoltage.toFixed(1)}V at LED ({(brightness * 100).toFixed(0)}% brightness)
          </text>

          {/* Heat indicator */}
          {powerLoss > 1 && (
            <g>
              <text x={200} y={140} textAnchor="middle" fill={colors.error} fontSize={10}>
                {powerLoss.toFixed(2)}W lost as heat
              </text>
              {powerLoss > 5 && (
                <>
                  <text x={200} y={155} textAnchor="middle" fill={colors.error} fontSize={18}>
                    ~
                  </text>
                </>
              )}
            </g>
          )}

          {/* Current meter */}
          <rect x={130} y={220} width={140} height={45} rx={6} fill={colors.bgCard} stroke={colors.accent} strokeWidth={2} />
          <text x={200} y={238} textAnchor="middle" fill={colors.textMuted} fontSize={10}>CURRENT</text>
          <text x={200} y={258} textAnchor="middle" fill={colors.accent} fontSize={16} fontWeight="bold">{current.toFixed(1)} A</text>

          {/* Wire info */}
          <text x={200} y={290} textAnchor="middle" fill={colors.textSecondary} fontSize={11}>
            {gauge.label} | {effectiveLength}m | R = {resistance.toFixed(3)} ohm
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <div style={{
              background: colors.bgCard,
              padding: '8px 16px',
              borderRadius: '8px',
              textAlign: 'center',
            }}>
              <div style={{ color: colors.textMuted, fontSize: '10px' }}>VOLTAGE DROP</div>
              <div style={{ color: colors.warning, fontSize: '16px', fontWeight: 'bold' }}>{voltageDrop.toFixed(2)}V</div>
            </div>
            <div style={{
              background: colors.bgCard,
              padding: '8px 16px',
              borderRadius: '8px',
              textAlign: 'center',
            }}>
              <div style={{ color: colors.textMuted, fontSize: '10px' }}>POWER LOSS</div>
              <div style={{ color: colors.error, fontSize: '16px', fontWeight: 'bold' }}>{powerLoss.toFixed(2)}W</div>
            </div>
            <div style={{
              background: colors.bgCard,
              padding: '8px 16px',
              borderRadius: '8px',
              textAlign: 'center',
            }}>
              <div style={{ color: colors.textMuted, fontSize: '10px' }}>RESISTANCE</div>
              <div style={{ color: colors.accent, fontSize: '16px', fontWeight: 'bold' }}>{resistance.toFixed(3)} ohm</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Wire Length: {wireLength}m {isCoiled && `(Effective: ${effectiveLength}m coiled)`}
        </label>
        <input
          type="range"
          min="1"
          max="50"
          step="1"
          value={wireLength}
          onChange={(e) => setWireLength(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Wire Gauge: {gauge.label}
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {wireGauges.map((g, i) => (
            <button
              key={g.awg}
              onClick={() => setGaugeIndex(i)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: gaugeIndex === i ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: gaugeIndex === i ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              {g.awg} AWG
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Current: {current.toFixed(1)} A
        </label>
        <input
          type="range"
          min="0.5"
          max="10"
          step="0.5"
          value={current}
          onChange={(e) => setCurrent(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
          Physics Equations:
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', fontFamily: 'monospace' }}>
          R = rho * L / A = {COPPER_RESISTIVITY} * {effectiveLength} / {gauge.area} = {resistance.toFixed(4)} ohm
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', fontFamily: 'monospace', marginTop: '4px' }}>
          P = I squared * R = {current.toFixed(1)} squared * {resistance.toFixed(4)} = {powerLoss.toFixed(3)} W
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', fontFamily: 'monospace', marginTop: '4px' }}>
          V_drop = I * R = {current.toFixed(1)} * {resistance.toFixed(4)} = {voltageDrop.toFixed(3)} V
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
              Power Loss in Wires
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Same battery - will a long thin wire dim a bulb?
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
                Ever noticed phone charger cables getting warm? Or wondered why power lines
                use such thick wires? The answer lies in a simple equation that costs
                power companies billions of dollars a year.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                Wires are not perfect conductors - they fight back.
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try the controls: adjust wire length and gauge to see the effect on the LED!
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
              A 12V battery connected to an LED through copper wire. The wire has some length
              and thickness (gauge). Current flows through the circuit, and we measure the
              voltage that actually reaches the LED.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              If you use a much longer, thinner wire, what happens to the LED brightness?
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Wire Resistance</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust length, gauge, and current to see power loss in action
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
              <li>Max out the length (50m) with thin wire - watch the LED dim!</li>
              <li>Switch to thick wire (10 AWG) - see the difference</li>
              <li>Increase current to 10A - feel the (virtual) heat</li>
              <li>Notice: doubling current quadruples power loss (I squared!)</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'dimmer';

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
              The bulb dims because wire resistance "uses up" voltage before it reaches the load!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Wire Resistance</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Resistance Formula:</strong> R = rho * L / A
              </p>
              <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
                <li>rho = resistivity (material property, copper approx 0.017 ohm*mm squared/m)</li>
                <li>L = length (longer wire = more resistance)</li>
                <li>A = cross-sectional area (thicker wire = less resistance)</li>
              </ul>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Power Loss:</strong> P = I squared * R
              </p>
              <p style={{ marginBottom: '12px' }}>
                This is why current matters so much! Double the current means 4x the power
                wasted as heat. This energy comes from the source and never reaches your device.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Voltage Drop:</strong> V = I * R
              </p>
              <p>
                The wire acts like a voltage divider. The more resistance, the more voltage
                is "dropped" across the wire instead of powering your load.
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
              What if you coil the thin wire into a tight bundle?
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
              You have 10 meters of thin wire. Instead of running it straight, you coil it
              up so it fits in a small space. The coil is tight - the wire loops back and
              forth multiple times, effectively tripling the path length the current must travel.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does coiling affect the bulb brightness?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Coiling Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Toggle coiling and observe the dramatic change
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '16px' }}>
            <button
              onClick={() => setIsCoiled(!isCoiled)}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '8px',
                border: 'none',
                background: isCoiled ? colors.warning : colors.accent,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '16px',
                marginBottom: '16px',
              }}
            >
              {isCoiled ? 'Uncoil Wire (Straight)' : 'Coil Wire (3x Path Length)'}
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
              Coiling doesn't change the amount of copper, but it dramatically increases
              the path length! Current must travel through every loop, so resistance
              increases proportionally. This is why extension cords should be uncoiled
              when carrying high current - a coiled cord can overheat!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'dimmer';

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
              Coiling makes the bulb even dimmer because the current must travel a longer path!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why Coiling Matters</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Path Length vs. Physical Length:</strong> Resistance
                depends on how far electrons must travel, not how compact the wire is.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Real-World Hazard:</strong> A coiled extension
                cord carrying high current can overheat and start fires! The heat from I squared R
                is concentrated in a small volume when coiled.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Positive Use:</strong> This principle is used
                in heating elements! Nichrome wire coiled tightly provides high resistance in
                a small space for toasters, hair dryers, and electric stoves.
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
              Wire resistance affects everything from power grids to phone chargers
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
                {testScore >= 8 ? 'You\'ve mastered power loss in wires!' : 'Review the material and try again.'}
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You understand why long cables get warm</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>R = rho * L / A (resistance depends on length and area)</li>
              <li>P = I squared * R (power loss, why current matters so much)</li>
              <li>V = IR (voltage drop across wires)</li>
              <li>Why power transmission uses high voltage</li>
              <li>Practical implications for cables and cords</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              This simple relationship - P = I squared R - is why Nikola Tesla's AC power won over Edison's
              DC. AC can be easily transformed to high voltage for efficient transmission, then
              stepped down for safe use. Without this, we'd need power plants every few miles!
              Today, HVDC (High Voltage DC) is making a comeback for very long distances where
              AC losses become significant.
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

export default PowerLossRenderer;
