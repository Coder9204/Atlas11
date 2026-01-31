'use client';

import React, { useState, useEffect, useCallback } from 'react';

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const PHASES: Phase[] = [
  'hook',
  'predict',
  'play',
  'review',
  'twist_predict',
  'twist_play',
  'twist_review',
  'transfer',
  'test',
  'mastery',
];

const PHASE_LABELS: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Bend Effects',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery',
};

interface FiberSignalLossRendererProps {
  phase?: Phase;
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
  fiber: '#22d3ee',
  fiberCore: '#67e8f9',
  laserRed: '#ef4444',
  laserGreen: '#22c55e',
};

// Fiber types with attenuation characteristics
const fiberTypes = [
  { name: 'Single-mode (1550nm)', attenuation: 0.2, label: 'Long-haul' },
  { name: 'Single-mode (1310nm)', attenuation: 0.35, label: 'Metro' },
  { name: 'Multi-mode (850nm)', attenuation: 2.5, label: 'Data center' },
  { name: 'Multi-mode (1300nm)', attenuation: 0.8, label: 'Campus' },
];

const FiberSignalLossRenderer: React.FC<FiberSignalLossRendererProps> = ({
  phase: initialPhase,
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

  // Internal phase state management
  const [phase, setPhase] = useState<Phase>(() => {
    if (initialPhase && PHASES.includes(initialPhase)) {
      return initialPhase;
    }
    return 'hook';
  });

  // Sync phase with prop changes (for resume functionality)
  useEffect(() => {
    if (initialPhase && PHASES.includes(initialPhase) && initialPhase !== phase) {
      setPhase(initialPhase);
    }
  }, [initialPhase]);

  // Navigation functions
  const goToPhase = useCallback((p: Phase) => {
    setPhase(p);
  }, []);

  const goNext = useCallback(() => {
    const idx = PHASES.indexOf(phase);
    if (idx < PHASES.length - 1) {
      goToPhase(PHASES[idx + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = PHASES.indexOf(phase);
    if (idx > 0) {
      goToPhase(PHASES[idx - 1]);
    }
  }, [phase, goToPhase]);

  // Simulation state
  const [fiberLength, setFiberLength] = useState(10); // km
  const [fiberTypeIndex, setFiberTypeIndex] = useState(0);
  const [inputPower, setInputPower] = useState(0); // dBm
  const [numConnectors, setNumConnectors] = useState(2);
  const [numSplices, setNumSplices] = useState(1);
  const [bendRadius, setBendRadius] = useState(30); // mm
  const [animationFrame, setAnimationFrame] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Calculate signal loss
  const fiber = fiberTypes[fiberTypeIndex];
  const fiberLoss = fiber.attenuation * fiberLength;
  const connectorLoss = numConnectors * 0.5; // 0.5 dB per connector
  const spliceLoss = numSplices * 0.1; // 0.1 dB per splice
  const bendLoss = bendRadius < 15 ? 3.0 : bendRadius < 25 ? 0.5 : 0;
  const totalLoss = fiberLoss + connectorLoss + spliceLoss + bendLoss;
  const outputPower = inputPower - totalLoss;
  const signalStrength = Math.max(0, Math.min(1, (outputPower + 30) / 30)); // Normalize to 0-1

  // Animation for light pulse
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const predictions = [
    { id: 'same', label: 'Signal stays the same - light travels perfectly in fiber' },
    { id: 'slight', label: 'Signal loses a little strength - minor absorption' },
    { id: 'significant', label: 'Signal weakens significantly over distance (dB/km loss)' },
    { id: 'amplified', label: 'Signal gets stronger - fiber acts like an amplifier' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Bends have no effect - light bounces internally' },
    { id: 'faster', label: 'Bends make light travel faster through shortcuts' },
    { id: 'more_loss', label: 'Tight bends cause more signal loss than straight runs' },
    { id: 'blocked', label: 'Bends completely block the signal' },
  ];

  const transferApplications = [
    {
      title: 'Submarine Cables',
      description: 'Undersea fiber cables span thousands of kilometers connecting continents. How do they maintain signal over such distances?',
      answer: 'Submarine cables use optical amplifiers (EDFAs) every 50-100km to boost the signal. They use single-mode fiber at 1550nm for lowest attenuation (0.2 dB/km). Even so, signals must be amplified dozens of times across the Atlantic!',
    },
    {
      title: 'OTDR Testing',
      description: 'Technicians use Optical Time Domain Reflectometers to find faults in fiber networks. How does OTDR work?',
      answer: 'OTDR sends light pulses and measures reflections. Distance is calculated from time-of-flight. Sudden spikes indicate connectors/splices, gradual slope shows attenuation, and sharp drops reveal breaks or macrobends. Its like radar for fiber!',
    },
    {
      title: 'Data Center Interconnects',
      description: 'Modern data centers use multimode fiber for short runs between racks. Why not single-mode everywhere?',
      answer: 'Multimode is cheaper for short distances (<500m) - larger core means easier alignment, cheaper transceivers. But modal dispersion limits bandwidth over distance. Single-mode costs more but supports 100km+ with proper amplification.',
    },
    {
      title: 'Fiber to the Home (FTTH)',
      description: 'Your home internet likely uses a Passive Optical Network (PON). How does one fiber serve multiple homes?',
      answer: 'PON uses optical splitters to divide one fiber signal to 32-128 homes. Each split adds ~3.5dB loss. A 1:32 splitter loses ~17dB! This limits total reach. GPON can serve homes up to 20km from the central office.',
    },
  ];

  const testQuestions = [
    {
      question: 'Fiber optic signal loss is measured in:',
      options: [
        { text: 'Watts per meter', correct: false },
        { text: 'Decibels per kilometer (dB/km)', correct: true },
        { text: 'Lumens per second', correct: false },
        { text: 'Hertz per mile', correct: false },
      ],
    },
    {
      question: 'Single-mode fiber at 1550nm has attenuation of approximately:',
      options: [
        { text: '10 dB/km', correct: false },
        { text: '2.5 dB/km', correct: false },
        { text: '0.2 dB/km', correct: true },
        { text: '0.02 dB/km', correct: false },
      ],
    },
    {
      question: 'If a 10km fiber run has 0.3 dB/km attenuation, total fiber loss is:',
      options: [
        { text: '0.03 dB', correct: false },
        { text: '0.3 dB', correct: false },
        { text: '3 dB', correct: true },
        { text: '30 dB', correct: false },
      ],
    },
    {
      question: 'A connector typically adds how much loss?',
      options: [
        { text: '0.01 dB', correct: false },
        { text: '0.5 dB', correct: true },
        { text: '5 dB', correct: false },
        { text: '10 dB', correct: false },
      ],
    },
    {
      question: 'Why do tight bends cause signal loss in fiber?',
      options: [
        { text: 'The glass cracks under pressure', correct: false },
        { text: 'Light escapes when angle exceeds critical angle', correct: true },
        { text: 'Electrical resistance increases', correct: false },
        { text: 'The fiber stretches and thins', correct: false },
      ],
    },
    {
      question: 'OTDR stands for:',
      options: [
        { text: 'Optical Transmission Data Rate', correct: false },
        { text: 'Optical Time Domain Reflectometer', correct: true },
        { text: 'Optical Termination Detection Radar', correct: false },
        { text: 'Output Terminal Digital Reader', correct: false },
      ],
    },
    {
      question: 'Why is 1550nm preferred for long-distance fiber communication?',
      options: [
        { text: 'Its invisible to the human eye', correct: false },
        { text: 'Lowest attenuation in silica glass', correct: true },
        { text: 'Highest bandwidth capacity', correct: false },
        { text: 'Cheapest laser diodes available', correct: false },
      ],
    },
    {
      question: 'A 1:32 optical splitter adds approximately how much loss?',
      options: [
        { text: '3.2 dB', correct: false },
        { text: '32 dB', correct: false },
        { text: '15-17 dB', correct: true },
        { text: '1.5 dB', correct: false },
      ],
    },
    {
      question: 'Modal dispersion limits bandwidth in:',
      options: [
        { text: 'Single-mode fiber', correct: false },
        { text: 'Multimode fiber', correct: true },
        { text: 'Both types equally', correct: false },
        { text: 'Neither type', correct: false },
      ],
    },
    {
      question: 'Submarine fiber cables use amplifiers every:',
      options: [
        { text: '1-5 km', correct: false },
        { text: '50-100 km', correct: true },
        { text: '500-1000 km', correct: false },
        { text: 'They dont need amplifiers', correct: false },
      ],
    },
  ];

  const handleTestAnswer = useCallback((questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  }, [testAnswers]);

  const submitTest = useCallback(() => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (score < 7 && onIncorrectAnswer) onIncorrectAnswer();
  }, [testAnswers, testQuestions, onCorrectAnswer, onIncorrectAnswer]);

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 300;
    const pulsePosition = (animationFrame / 100) * 300;
    const pulseIntensity = Math.max(0.2, 1 - (pulsePosition / 300) * (totalLoss / 20));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: '#1e293b', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            <linearGradient id="fiberGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.fiberCore} />
              <stop offset="100%" stopColor={colors.fiber} stopOpacity={signalStrength} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Title */}
          <text x={200} y={25} textAnchor="middle" fill={colors.textPrimary} fontSize={14} fontWeight="bold">
            Fiber Optic Signal Transmission
          </text>

          {/* Laser Source */}
          <rect x={20} y={110} width={50} height={60} rx={4} fill="#374151" stroke={colors.laserRed} strokeWidth={2} />
          <text x={45} y={135} textAnchor="middle" fill={colors.laserRed} fontSize={10} fontWeight="bold">LASER</text>
          <text x={45} y={150} textAnchor="middle" fill={colors.textMuted} fontSize={8}>{inputPower} dBm</text>
          <circle cx={45} cy={165} r={4} fill={colors.laserRed}>
            <animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite" />
          </circle>

          {/* Fiber Cable with bends visualization */}
          <path
            d={bendRadius < 25
              ? `M 70 140 Q 120 ${140 - (30 - bendRadius)}, 150 140 Q 200 ${140 + (30 - bendRadius)}, 250 140 Q 280 ${140 - (30 - bendRadius) / 2}, 310 140`
              : 'M 70 140 L 310 140'}
            fill="none"
            stroke="url(#fiberGrad)"
            strokeWidth={8}
            strokeLinecap="round"
          />

          {/* Fiber core */}
          <path
            d={bendRadius < 25
              ? `M 70 140 Q 120 ${140 - (30 - bendRadius)}, 150 140 Q 200 ${140 + (30 - bendRadius)}, 250 140 Q 280 ${140 - (30 - bendRadius) / 2}, 310 140`
              : 'M 70 140 L 310 140'}
            fill="none"
            stroke={colors.fiberCore}
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.6}
          />

          {/* Light pulse animation */}
          <circle
            cx={70 + pulsePosition}
            cy={140}
            r={6}
            fill={colors.laserRed}
            opacity={pulseIntensity}
            filter="url(#glow)"
          />

          {/* Connectors */}
          {numConnectors >= 1 && (
            <g>
              <rect x={115} y={130} width={10} height={20} fill="#475569" stroke="#64748b" strokeWidth={1} />
              <text x={120} y={165} textAnchor="middle" fill={colors.warning} fontSize={8}>-0.5dB</text>
            </g>
          )}
          {numConnectors >= 2 && (
            <g>
              <rect x={255} y={130} width={10} height={20} fill="#475569" stroke="#64748b" strokeWidth={1} />
              <text x={260} y={165} textAnchor="middle" fill={colors.warning} fontSize={8}>-0.5dB</text>
            </g>
          )}

          {/* Splice indicator */}
          {numSplices >= 1 && (
            <g>
              <line x1={185} y1={130} x2={185} y2={150} stroke={colors.accent} strokeWidth={2} strokeDasharray="2,2" />
              <text x={185} y={125} textAnchor="middle" fill={colors.accent} fontSize={8}>Splice</text>
            </g>
          )}

          {/* Bend loss indicator */}
          {bendRadius < 25 && (
            <g>
              <text x={200} y={95} textAnchor="middle" fill={colors.error} fontSize={10} fontWeight="bold">
                Bend Loss: {bendLoss.toFixed(1)} dB
              </text>
              <path d="M 160 100 L 170 105 L 160 110" fill="none" stroke={colors.error} strokeWidth={2} />
            </g>
          )}

          {/* Receiver */}
          <rect x={330} y={110} width={50} height={60} rx={4} fill="#374151" stroke={colors.success} strokeWidth={2} />
          <text x={355} y={135} textAnchor="middle" fill={colors.success} fontSize={10} fontWeight="bold">RX</text>
          <text x={355} y={150} textAnchor="middle" fill={signalStrength > 0.3 ? colors.success : colors.error} fontSize={8}>
            {outputPower.toFixed(1)} dBm
          </text>
          <circle cx={355} cy={165} r={4} fill={signalStrength > 0.3 ? colors.success : colors.error} opacity={signalStrength}>
            <animate attributeName="opacity" values={`${signalStrength};${signalStrength * 0.5};${signalStrength}`} dur="0.5s" repeatCount="indefinite" />
          </circle>

          {/* Loss breakdown */}
          <rect x={30} y={195} width={340} height={90} rx={8} fill="rgba(0,0,0,0.3)" />
          <text x={200} y={215} textAnchor="middle" fill={colors.textPrimary} fontSize={11} fontWeight="bold">
            Signal Loss Breakdown
          </text>
          <text x={50} y={235} fill={colors.textSecondary} fontSize={10}>
            Fiber ({fiberLength}km x {fiber.attenuation}dB/km):
          </text>
          <text x={340} y={235} textAnchor="end" fill={colors.warning} fontSize={10} fontWeight="bold">
            -{fiberLoss.toFixed(1)} dB
          </text>
          <text x={50} y={252} fill={colors.textSecondary} fontSize={10}>
            Connectors ({numConnectors} x 0.5dB):
          </text>
          <text x={340} y={252} textAnchor="end" fill={colors.warning} fontSize={10} fontWeight="bold">
            -{connectorLoss.toFixed(1)} dB
          </text>
          <text x={50} y={269} fill={colors.textSecondary} fontSize={10}>
            Splices + Bends:
          </text>
          <text x={340} y={269} textAnchor="end" fill={colors.warning} fontSize={10} fontWeight="bold">
            -{(spliceLoss + bendLoss).toFixed(1)} dB
          </text>
          <line x1={50} y1={275} x2={350} y2={275} stroke={colors.textMuted} strokeWidth={1} />
          <text x={50} y={288} fill={colors.textPrimary} fontSize={10} fontWeight="bold">
            TOTAL LOSS:
          </text>
          <text x={340} y={288} textAnchor="end" fill={colors.error} fontSize={12} fontWeight="bold">
            -{totalLoss.toFixed(1)} dB
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <div style={{ background: colors.bgCard, padding: '8px 16px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ color: colors.textMuted, fontSize: '10px' }}>INPUT</div>
              <div style={{ color: colors.accent, fontSize: '16px', fontWeight: 'bold' }}>{inputPower} dBm</div>
            </div>
            <div style={{ background: colors.bgCard, padding: '8px 16px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ color: colors.textMuted, fontSize: '10px' }}>OUTPUT</div>
              <div style={{ color: signalStrength > 0.3 ? colors.success : colors.error, fontSize: '16px', fontWeight: 'bold' }}>
                {outputPower.toFixed(1)} dBm
              </div>
            </div>
            <div style={{ background: colors.bgCard, padding: '8px 16px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ color: colors.textMuted, fontSize: '10px' }}>SIGNAL</div>
              <div style={{ color: signalStrength > 0.5 ? colors.success : signalStrength > 0.3 ? colors.warning : colors.error, fontSize: '16px', fontWeight: 'bold' }}>
                {(signalStrength * 100).toFixed(0)}%
              </div>
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
          Fiber Length: {fiberLength} km
        </label>
        <input
          type="range"
          min="1"
          max="100"
          step="1"
          value={fiberLength}
          onChange={(e) => setFiberLength(parseInt(e.target.value))}
          style={{ width: '100%', WebkitTapHighlightColor: 'transparent' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Fiber Type: {fiber.name}
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {fiberTypes.map((f, i) => (
            <button
              key={f.name}
              onClick={() => setFiberTypeIndex(i)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: fiberTypeIndex === i ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: fiberTypeIndex === i ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '11px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {f.label}<br/>{f.attenuation} dB/km
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Bend Radius: {bendRadius} mm {bendRadius < 25 && '(Causing loss!)'}
        </label>
        <input
          type="range"
          min="5"
          max="50"
          step="5"
          value={bendRadius}
          onChange={(e) => setBendRadius(parseInt(e.target.value))}
          style={{ width: '100%', WebkitTapHighlightColor: 'transparent' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Connectors: {numConnectors}
          </label>
          <input
            type="range"
            min="0"
            max="6"
            step="1"
            value={numConnectors}
            onChange={(e) => setNumConnectors(parseInt(e.target.value))}
            style={{ width: '100%', WebkitTapHighlightColor: 'transparent' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Splices: {numSplices}
          </label>
          <input
            type="range"
            min="0"
            max="5"
            step="1"
            value={numSplices}
            onChange={(e) => setNumSplices(parseInt(e.target.value))}
            style={{ width: '100%', WebkitTapHighlightColor: 'transparent' }}
          />
        </div>
      </div>

      <div style={{
        background: 'rgba(6, 182, 212, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>
          Loss Equation:
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', fontFamily: 'monospace' }}>
          Total Loss = (Attenuation x Length) + Connectors + Splices + Bends
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '12px', fontFamily: 'monospace', marginTop: '4px' }}>
          = ({fiber.attenuation} x {fiberLength}) + {connectorLoss.toFixed(1)} + {spliceLoss.toFixed(1)} + {bendLoss.toFixed(1)}
        </div>
        <div style={{ color: colors.accent, fontSize: '12px', fontFamily: 'monospace', marginTop: '4px' }}>
          = {totalLoss.toFixed(1)} dB
        </div>
      </div>
    </div>
  );

  // Progress bar renderer
  const renderProgressBar = () => {
    const currentIdx = PHASES.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(15, 23, 42, 0.8)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          style={{
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: currentIdx === 0 ? 'rgba(255,255,255,0.3)' : colors.textSecondary,
            cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {PHASES.map((p, i) => (
              <button
                key={p}
                onClick={() => i <= currentIdx && goToPhase(p)}
                style={{
                  width: i === currentIdx ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: i === currentIdx ? colors.accent : i < currentIdx ? colors.success : 'rgba(255,255,255,0.2)',
                  cursor: i <= currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  WebkitTapHighlightColor: 'transparent',
                }}
                title={PHASE_LABELS[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: '500', color: colors.textMuted, marginLeft: '8px' }}>
            {currentIdx + 1}/{PHASES.length}
          </span>
        </div>

        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          background: 'rgba(6, 182, 212, 0.2)',
          color: colors.accent,
          fontSize: '12px',
          fontWeight: '600',
        }}>
          {PHASE_LABELS[phase]}
        </div>
      </div>
    );
  };

  // Bottom navigation bar renderer
  const renderBottomBar = (canGoNext: boolean, nextLabel: string = 'Continue') => {
    const currentIdx = PHASES.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        background: colors.bgDark,
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            border: 'none',
            background: currentIdx === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
            color: currentIdx === 0 ? colors.textMuted : colors.textSecondary,
            fontWeight: '500',
            cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Back
        </button>

        <span style={{ fontSize: '14px', color: colors.textMuted, fontWeight: '500' }}>
          {PHASE_LABELS[phase]}
        </span>

        <button
          onClick={goNext}
          disabled={!canGoNext}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            border: 'none',
            background: canGoNext ? colors.accent : 'rgba(255,255,255,0.1)',
            color: canGoNext ? 'white' : colors.textMuted,
            fontWeight: '600',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {nextLabel} {canGoNext && '->'}
        </button>
      </div>
    );
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>~</div>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Fiber Optic Signal Loss
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Why does fiber lose signal over long distances?
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
                Data centers send terabits of data through hair-thin glass fibers. But even
                perfect glass absorbs and scatters light. Connectors, splices, and bends
                all take their toll on signal strength.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                Understanding these losses is critical for designing reliable networks.
              </p>
            </div>

            <div style={{
              background: 'rgba(6, 182, 212, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try adjusting the fiber length and type to see how signal degrades!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Scenario:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              You need to send a laser signal through 50km of fiber optic cable to connect
              two data centers. The laser starts at 0 dBm (1 milliwatt) of optical power.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What happens to the signal over this distance?
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
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(!!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Fiber Loss</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust parameters to understand each loss component
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
              <li>Set length to 100km with multimode fiber - watch signal vanish!</li>
              <li>Compare single-mode (1550nm) vs multimode (850nm) attenuation</li>
              <li>Reduce bend radius below 15mm - see dramatic loss increase</li>
              <li>Add 6 connectors - each one steals signal!</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'significant';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto' }}>
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
              Fiber suffers attenuation measured in dB/km - even the best fiber loses signal over distance!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Fiber Loss</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Attenuation Sources:</strong>
              </p>
              <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
                <li><strong>Absorption:</strong> Silica glass absorbs certain wavelengths (OH ions, IR absorption)</li>
                <li><strong>Rayleigh Scattering:</strong> Light scatters off molecular irregularities</li>
                <li><strong>Macrobending:</strong> Tight bends let light escape the core</li>
                <li><strong>Microbending:</strong> Tiny imperfections from stress/pressure</li>
              </ul>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>The dB Scale:</strong> Decibels are logarithmic.
                3 dB loss = half the power. 10 dB = 10x reduction. 20 dB = 100x reduction!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Wavelength Matters:</strong> 1550nm has lowest
                loss (~0.2 dB/km) because its between silica absorption peaks.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What happens when you bend fiber around corners?
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
              A technician is running fiber through a data center and needs to route it around
              a tight corner. The bend radius is only 10mm - much tighter than the recommended
              30mm minimum for this fiber type.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does this tight bend affect the signal?
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
        {renderBottomBar(!!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Bend Effects</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust the bend radius to see how tight bends cause loss
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
              Light travels through fiber via total internal reflection - it bounces off the
              cladding at shallow angles. When you bend the fiber too tight, the angle exceeds
              the critical angle and light escapes! This is called macrobend loss. Minimum
              bend radius specs exist for a reason!
            </p>
          </div>
        </div>
        {renderBottomBar(true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'more_loss';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto' }}>
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
              Tight bends cause significant signal loss by allowing light to escape the fiber core!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why Bends Matter</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Total Internal Reflection:</strong> Light stays
                in the fiber core because it reflects off the cladding at angles beyond the critical angle.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Macrobend Loss:</strong> When fiber bends too
                sharply, the angle of incidence changes and light can escape. The tighter the bend,
                the more light leaks out.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Minimum Bend Radius:</strong> Manufacturers
                specify minimum bend radius (often 25-30mm for standard single-mode). Bend-insensitive
                fiber uses a special design allowing tighter bends for data center use.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const allAppsCompleted = transferCompleted.size >= 4;
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Fiber loss affects everything from internet to undersea cables
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
        {renderBottomBar(allAppsCompleted, allAppsCompleted ? 'Take the Test' : `Complete ${4 - transferCompleted.size} more`)}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{
              background: testScore >= 7 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 7 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 7 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 7 ? 'You understand fiber optic signal loss!' : 'Review the material and try again.'}
              </p>
              {testScore < 7 && (
                <button
                  onClick={() => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); }}
                  style={{
                    marginTop: '16px',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(255,255,255,0.1)',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Try Again
                </button>
              )}
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? 'Correct' : userAnswer === oIndex ? 'Your answer' : ''} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(testScore >= 7, testScore >= 7 ? 'Complete Mastery' : 'Review and Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    const allAnswered = !testAnswers.includes(null);
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                />
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
                    background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
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
                disabled={!allAnswered}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: allAnswered ? colors.success : colors.textMuted,
                  color: 'white',
                  cursor: allAnswered ? 'pointer' : 'not-allowed',
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>~</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You understand fiber optic signal loss
            </p>
          </div>

          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Attenuation measured in dB/km (logarithmic scale)</li>
              <li>1550nm wavelength has lowest loss in silica fiber</li>
              <li>Connectors, splices, and bends all add loss</li>
              <li>Macrobend loss from exceeding critical angle</li>
              <li>OTDR testing to locate faults and measure loss</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(6, 182, 212, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Modern fiber networks use Dense Wavelength Division Multiplexing (DWDM) to send
              80+ wavelengths through a single fiber, each carrying 100+ Gbps. Erbium-Doped
              Fiber Amplifiers (EDFAs) boost all wavelengths simultaneously without converting
              to electrical signals. This is how a single fiber pair can carry over 10 Tbps
              across oceans!
            </p>
          </div>

          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete')}
      </div>
    );
  }

  return null;
};

export default FiberSignalLossRenderer;
