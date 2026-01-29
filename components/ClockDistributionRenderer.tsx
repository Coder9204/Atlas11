'use client';

import React, { useState, useCallback } from 'react';

interface ClockDistributionRendererProps {
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
  clock: '#8b5cf6',
  skew: '#ef4444',
  jitter: '#f59e0b',
  pll: '#22c55e',
};

const ClockDistributionRenderer: React.FC<ClockDistributionRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [clockFrequency, setClockFrequency] = useState(3); // GHz
  const [chipSize, setChipSize] = useState(10); // mm
  const [treeDepth, setTreeDepth] = useState(4); // levels of buffering
  const [wireVariation, setWireVariation] = useState(5); // % variation in wire length
  const [animationTime, setAnimationTime] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation
  React.useEffect(() => {
    const interval = setInterval(() => {
      setAnimationTime(t => (t + 1) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Physics calculations
  const calculateClockMetrics = useCallback(() => {
    // Speed of light in silicon (c/3.5 due to dielectric)
    const lightSpeedInSilicon = 3e8 / 3.5; // m/s = 85.7 mm/ns

    // Clock period
    const clockPeriod = 1 / clockFrequency; // ns

    // Time for light to cross chip
    const lightCrossingTime = chipSize / lightSpeedInSilicon; // ns

    // Maximum theoretical skew (corner to corner without repeaters)
    const maxSkew = lightCrossingTime * Math.sqrt(2); // diagonal

    // Skew with clock tree (reduced by factor of tree depth)
    const clockTreeSkew = maxSkew / (2 ** (treeDepth - 1)); // ps

    // Jitter from wire variation
    const jitter = clockTreeSkew * (wireVariation / 100); // ps

    // Skew as percentage of clock period
    const skewPercentage = (clockTreeSkew / clockPeriod) * 100;

    // Maximum usable frequency given skew budget (typically 10% of period)
    const maxFreqForSkew = 0.1 / clockTreeSkew; // GHz

    return {
      clockPeriod: clockPeriod * 1000, // ps
      lightCrossingTime: lightCrossingTime * 1000, // ps
      clockTreeSkew: clockTreeSkew * 1000, // ps
      jitter: jitter * 1000, // ps
      skewPercentage,
      maxFreqForSkew,
    };
  }, [clockFrequency, chipSize, treeDepth, wireVariation]);

  const predictions = [
    { id: 'instant', label: 'The clock signal arrives everywhere at the same instant' },
    { id: 'light', label: 'Different parts receive the clock at different times due to signal propagation' },
    { id: 'buffer', label: 'Buffers make the clock signal arrive faster than light' },
    { id: 'wireless', label: 'The clock is distributed wirelessly within the chip' },
  ];

  const twistPredictions = [
    { id: 'infinite', label: 'We can make chips as large as we want at any frequency' },
    { id: 'limited', label: 'Light speed limits how large a chip can be at a given frequency' },
    { id: 'slowed', label: 'We need to slow down the clock for larger chips' },
    { id: 'both', label: 'Both chip size and frequency are constrained by speed of light' },
  ];

  const transferApplications = [
    {
      title: 'Multi-Core Processor Synchronization',
      description: 'Modern CPUs have multiple cores that must coordinate. Each core has its own clock domain, synchronized by a global reference.',
      question: 'Why do multi-core CPUs use multiple clock domains instead of one global clock?',
      answer: 'A single global clock at 5 GHz across a 20mm chip would have intolerable skew. Instead, each core runs its own local clock, synchronized to a lower-frequency global reference. This allows high local frequencies with manageable inter-core timing.',
    },
    {
      title: 'DDR Memory Timing',
      description: 'DDR5 memory runs at 4800+ MT/s. The memory controller must precisely time when to sample incoming data.',
      question: 'Why does DDR use source-synchronous clocking with the data?',
      answer: 'Sending a clock with the data ensures the clock and data experience the same delay. The receiver can use this clock to sample data reliably, regardless of absolute propagation time. This is called source-synchronous design.',
    },
    {
      title: 'High-Frequency Trading Systems',
      description: 'Financial trading systems measure time in nanoseconds. A difference of 10ns can mean millions of dollars.',
      question: 'Why do HFT systems use GPS for clock synchronization?',
      answer: 'GPS provides nanosecond-accurate time worldwide. HFT systems use this to synchronize clocks across data centers thousands of miles apart, ensuring fair market access and regulatory compliance.',
    },
    {
      title: 'Network Switch Fabric',
      description: 'Data center switches move terabits per second across multiple ports. All ports must be synchronized to route packets correctly.',
      question: 'How do network switches handle clock distribution across large PCBs?',
      answer: 'High-speed switches use clock and data recovery (CDR) at each port. The incoming data stream contains enough transitions to recover the clock locally. This eliminates the need for a single global clock across the large board.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is clock skew?',
      options: [
        { text: 'The frequency of the clock signal', correct: false },
        { text: 'The difference in arrival time of the clock at different parts of the chip', correct: true },
        { text: 'The voltage level of the clock signal', correct: false },
        { text: 'The power consumed by the clock tree', correct: false },
      ],
    },
    {
      question: 'What limits how fast the clock signal can propagate across a chip?',
      options: [
        { text: 'The voltage of the power supply', correct: false },
        { text: 'The speed of light in the chip materials', correct: true },
        { text: 'The number of transistors', correct: false },
        { text: 'The temperature of the chip', correct: false },
      ],
    },
    {
      question: 'What is clock jitter?',
      options: [
        { text: 'Predictable, repeating variation in clock timing', correct: false },
        { text: 'Random, cycle-to-cycle variation in clock edge timing', correct: true },
        { text: 'The clock frequency divided by two', correct: false },
        { text: 'Slow drift of clock frequency over hours', correct: false },
      ],
    },
    {
      question: 'A clock tree distributes the clock by:',
      options: [
        { text: 'Using a single long wire from source to all destinations', correct: false },
        { text: 'Repeatedly buffering and splitting the signal through multiple levels', correct: true },
        { text: 'Broadcasting the clock wirelessly', correct: false },
        { text: 'Using light instead of electrical signals', correct: false },
      ],
    },
    {
      question: 'Why is skew problematic for digital circuits?',
      options: [
        { text: 'It increases power consumption', correct: false },
        { text: 'It can cause data to be captured at the wrong time, leading to errors', correct: true },
        { text: 'It makes the chip run hotter', correct: false },
        { text: 'It reduces the number of available transistors', correct: false },
      ],
    },
    {
      question: 'A PLL (Phase-Locked Loop) is used in clock distribution to:',
      options: [
        { text: 'Generate a stable, high-frequency clock from a lower-frequency reference', correct: true },
        { text: 'Reduce the number of wires needed', correct: false },
        { text: 'Convert AC power to DC', correct: false },
        { text: 'Measure chip temperature', correct: false },
      ],
    },
    {
      question: 'If a 5 GHz CPU has a clock period of 200ps, and skew must be less than 10% of the period, maximum skew is:',
      options: [
        { text: '50ps', correct: false },
        { text: '20ps', correct: true },
        { text: '200ps', correct: false },
        { text: '2ns', correct: false },
      ],
    },
    {
      question: 'H-tree clock distribution topology ensures:',
      options: [
        { text: 'Minimum power consumption', correct: false },
        { text: 'Equal path length from source to all destinations', correct: true },
        { text: 'Maximum clock frequency', correct: false },
        { text: 'Wireless clock transmission', correct: false },
      ],
    },
    {
      question: 'Clock gating is used to:',
      options: [
        { text: 'Increase the clock frequency', correct: false },
        { text: 'Reduce power by stopping the clock to unused circuit blocks', correct: true },
        { text: 'Protect the clock from radiation', correct: false },
        { text: 'Generate multiple clock phases', correct: false },
      ],
    },
    {
      question: 'As chips become larger and faster, clock distribution becomes harder because:',
      options: [
        { text: 'More transistors need clocking, and light speed limits synchronization', correct: true },
        { text: 'Power supplies cannot deliver enough current', correct: false },
        { text: 'Clock wires become invisible', correct: false },
        { text: 'Temperature makes the clock run backwards', correct: false },
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
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    if (score < 7 && onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = () => {
    const metrics = calculateClockMetrics();
    const width = 400;
    const height = 400;

    // Clock signal animation
    const clockPhase = (animationTime / 360) * 2 * Math.PI * 3;
    const clockValue = Math.sin(clockPhase) > 0 ? 1 : 0;

    // Skew animation (delayed arrivals at different points)
    const skewOffsets = [0, 0.1, 0.2, 0.15]; // Different delays for each endpoint

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            <linearGradient id="clockGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.clock} />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>

          {/* Title */}
          <text x={width/2} y={25} fill={colors.textPrimary} fontSize={14} fontWeight="bold" textAnchor="middle">
            Clock Distribution and Skew
          </text>

          {/* Chip representation with H-tree */}
          <g transform="translate(120, 60)">
            {/* Chip outline */}
            <rect x={0} y={0} width={160} height={160} fill="rgba(100, 100, 200, 0.1)" stroke={colors.clock} strokeWidth={2} rx={4} />
            <text x={80} y={-8} fill={colors.textMuted} fontSize={10} textAnchor="middle">Chip ({chipSize}mm x {chipSize}mm)</text>

            {/* Clock source (PLL) at center */}
            <circle cx={80} cy={80} r={12} fill={colors.pll} stroke={colors.textPrimary} strokeWidth={2}>
              <animate attributeName="r" values="10;14;10" dur="0.5s" repeatCount="indefinite" />
            </circle>
            <text x={80} y={84} fill="white" fontSize={8} textAnchor="middle">PLL</text>

            {/* H-tree distribution */}
            {/* Level 1: Center to mid-points */}
            <line x1={80} y1={80} x2={40} y2={80} stroke={colors.clock} strokeWidth={3} opacity={clockValue ? 1 : 0.3} />
            <line x1={80} y1={80} x2={120} y2={80} stroke={colors.clock} strokeWidth={3} opacity={clockValue ? 1 : 0.3} />
            <line x1={80} y1={80} x2={80} y2={40} stroke={colors.clock} strokeWidth={3} opacity={clockValue ? 1 : 0.3} />
            <line x1={80} y1={80} x2={80} y2={120} stroke={colors.clock} strokeWidth={3} opacity={clockValue ? 1 : 0.3} />

            {/* Level 2: Mid-points to quadrants */}
            {treeDepth >= 2 && (
              <>
                <line x1={40} y1={80} x2={40} y2={40} stroke={colors.clock} strokeWidth={2} opacity={clockValue ? 0.9 : 0.2} />
                <line x1={40} y1={80} x2={40} y2={120} stroke={colors.clock} strokeWidth={2} opacity={clockValue ? 0.9 : 0.2} />
                <line x1={120} y1={80} x2={120} y2={40} stroke={colors.clock} strokeWidth={2} opacity={clockValue ? 0.9 : 0.2} />
                <line x1={120} y1={80} x2={120} y2={120} stroke={colors.clock} strokeWidth={2} opacity={clockValue ? 0.9 : 0.2} />
              </>
            )}

            {/* Level 3: To corners */}
            {treeDepth >= 3 && (
              <>
                <line x1={40} y1={40} x2={20} y2={20} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.8 : 0.15} />
                <line x1={40} y1={40} x2={60} y2={20} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.8 : 0.15} />
                <line x1={40} y1={120} x2={20} y2={140} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.8 : 0.15} />
                <line x1={40} y1={120} x2={60} y2={140} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.8 : 0.15} />
                <line x1={120} y1={40} x2={100} y2={20} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.8 : 0.15} />
                <line x1={120} y1={40} x2={140} y2={20} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.8 : 0.15} />
                <line x1={120} y1={120} x2={100} y2={140} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.8 : 0.15} />
                <line x1={120} y1={120} x2={140} y2={140} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.8 : 0.15} />
              </>
            )}

            {/* Endpoint flip-flops/registers */}
            {[[20, 20], [60, 20], [100, 20], [140, 20],
              [20, 140], [60, 140], [100, 140], [140, 140]].map(([x, y], i) => {
              const delayed = Math.sin(clockPhase - skewOffsets[i % 4] * 2) > 0;
              return (
                <rect
                  key={i}
                  x={x - 6}
                  y={y - 6}
                  width={12}
                  height={12}
                  fill={delayed ? colors.clock : 'rgba(139, 92, 246, 0.3)'}
                  stroke={colors.clock}
                  strokeWidth={1}
                  rx={2}
                />
              );
            })}
          </g>

          {/* Clock waveform with skew visualization */}
          <g transform="translate(30, 250)">
            <text x={0} y={0} fill={colors.textSecondary} fontSize={11} fontWeight="bold">Clock Signals at Different Locations:</text>

            {/* Reference clock */}
            <rect x={0} y={10} width={340} height={30} fill="rgba(0,0,0,0.3)" rx={4} />
            <text x={5} y={25} fill={colors.pll} fontSize={9}>Source (PLL)</text>
            <path
              d={`M 70 35 L 70 15 L 110 15 L 110 35 L 150 35 L 150 15 L 190 15 L 190 35 L 230 35 L 230 15 L 270 15 L 270 35 L 310 35 L 310 15 L 335 15`}
              stroke={colors.pll}
              strokeWidth={2}
              fill="none"
            />

            {/* Skewed clock at far corner */}
            <rect x={0} y={50} width={340} height={30} fill="rgba(0,0,0,0.3)" rx={4} />
            <text x={5} y={65} fill={colors.skew} fontSize={9}>Far Corner</text>
            <path
              d={`M 75 75 L 75 55 L 115 55 L 115 75 L 155 75 L 155 55 L 195 55 L 195 75 L 235 75 L 235 55 L 275 55 L 275 75 L 315 75 L 315 55 L 335 55`}
              stroke={colors.skew}
              strokeWidth={2}
              fill="none"
            />

            {/* Skew indicator */}
            <line x1={70} y1={40} x2={70} y2={85} stroke={colors.accent} strokeWidth={1} strokeDasharray="3,3" />
            <line x1={75} y1={40} x2={75} y2={85} stroke={colors.accent} strokeWidth={1} strokeDasharray="3,3" />
            <text x={72} y={98} fill={colors.accent} fontSize={10} textAnchor="middle">Skew</text>
          </g>

          {/* Metrics panel */}
          <g transform="translate(290, 60)">
            <rect x={0} y={0} width={100} height={100} fill="rgba(0,0,0,0.5)" rx={8} stroke={colors.accent} strokeWidth={1} />
            <text x={10} y={18} fill={colors.textSecondary} fontSize={9}>Clock Period:</text>
            <text x={10} y={32} fill={colors.textPrimary} fontSize={11}>{metrics.clockPeriod.toFixed(0)} ps</text>
            <text x={10} y={48} fill={colors.textSecondary} fontSize={9}>Skew:</text>
            <text x={10} y={62} fill={metrics.skewPercentage > 10 ? colors.error : colors.success} fontSize={11}>
              {metrics.clockTreeSkew.toFixed(1)} ps ({metrics.skewPercentage.toFixed(1)}%)
            </text>
            <text x={10} y={78} fill={colors.textSecondary} fontSize={9}>Jitter:</text>
            <text x={10} y={92} fill={colors.jitter} fontSize={11}>{metrics.jitter.toFixed(1)} ps</text>
          </g>

          {/* Frequency indicator */}
          <text x={width/2} y={height - 10} fill={colors.textMuted} fontSize={11} textAnchor="middle">
            Clock Frequency: {clockFrequency} GHz | Tree Depth: {treeDepth} levels
          </text>
        </svg>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Clock Frequency: {clockFrequency} GHz
        </label>
        <input
          type="range"
          min="1"
          max="6"
          step="0.1"
          value={clockFrequency}
          onChange={(e) => setClockFrequency(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Chip Size: {chipSize} mm x {chipSize} mm
        </label>
        <input
          type="range"
          min="2"
          max="25"
          step="1"
          value={chipSize}
          onChange={(e) => setChipSize(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Clock Tree Depth: {treeDepth} levels
        </label>
        <input
          type="range"
          min="1"
          max="6"
          step="1"
          value={treeDepth}
          onChange={(e) => setTreeDepth(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Wire Length Variation: {wireVariation}%
        </label>
        <input
          type="range"
          min="0"
          max="20"
          step="1"
          value={wireVariation}
          onChange={(e) => setWireVariation(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Skew Budget: typically less than 10% of clock period
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Light speed in silicon approximately equals 86 mm/ns
        </div>
      </div>
    </div>
  );

  const buttonStyle = {
    WebkitTapHighlightColor: 'transparent' as const,
  };

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed' as const,
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
          ...buttonStyle,
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
              Clock Distribution and Skew
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              How does a CPU ensure all parts work in sync?
            </p>
          </div>

          {renderVisualization()}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                A 5 GHz processor has billions of transistors that must all switch at precisely
                the right moment. The clock signal orchestrates this dance - but how do you ensure
                it arrives everywhere at the same time?
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                Even at the speed of light, crossing a 20mm chip takes time!
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Explore how clock trees distribute timing signals across modern chips!
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
          {renderVisualization()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Question:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A clock signal starts from a PLL at the center of a CPU chip.
              It needs to reach flip-flops at every corner of the 15mm x 15mm die.
              What happens to the timing?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              When does the clock signal arrive at different locations?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    ...buttonStyle,
                    padding: '16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left' as const,
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Clock Distribution</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust parameters to see how skew changes
            </p>
          </div>

          {renderVisualization()}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Increase chip size - watch skew grow</li>
              <li>Add more tree depth levels - see skew decrease</li>
              <li>Find when skew exceeds 10% of clock period (danger zone!)</li>
              <li>What is the maximum chip size at 5 GHz?</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'light';

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
              Electrical signals travel at about 1/3 the speed of light in chip interconnects.
              Crossing a 15mm chip takes about 175 picoseconds - significant when the clock period
              is only 200ps at 5 GHz!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Clock Distribution Concepts</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Clock Skew:</strong> The difference
                in arrival time between clock signals at different destinations. Must be minimized.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Clock Tree:</strong> A hierarchical
                network of buffers that distributes the clock. H-tree topology ensures equal path lengths.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Jitter:</strong> Random cycle-to-cycle
                variation in clock timing. Caused by noise, temperature, and supply voltage variation.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>PLL:</strong> Phase-Locked Loop generates
                a stable high-frequency clock from a lower-frequency reference crystal.
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
              Light speed is the ultimate limit. What does this mean for chip design?
            </p>
          </div>

          {renderVisualization()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Speed of Light Limit:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              At 5 GHz, the clock period is 200ps. Light travels only 17mm in silicon in that time.
              For a 20mm chip, the clock cannot physically reach the far corner within one cycle!
              What does this fundamental limit mean for chip designers?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What does light speed mean for chip size and frequency?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    ...buttonStyle,
                    padding: '16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left' as const,
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Find the Speed-of-Light Limit</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Explore when skew becomes unmanageable
            </p>
          </div>

          {renderVisualization()}
          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Insight:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Try to find combinations where the skew exceeds 10% of the clock period.
              Notice how larger chips or higher frequencies push against the light-speed limit.
              This is why modern CPUs use multiple clock domains!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'both';

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
              Both chip size and frequency are fundamentally constrained by the speed of light.
              This is why modern processors use multiple clock domains, why GPUs use many small
              cores instead of few large ones, and why chiplets are becoming popular.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Designing Around Light Speed</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Multiple Clock Domains:</strong> Different
                parts of the chip run at different frequencies, with careful synchronization at boundaries.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Globally Asynchronous:</strong> Many
                designs use asynchronous communication between major blocks, avoiding global synchronization.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Chiplets:</strong> Breaking a large
                chip into smaller pieces (chiplets) keeps clock domains small, then connecting them
                with high-speed interfaces.
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
              Clock distribution challenges are everywhere in high-speed systems
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
                  style={{ ...buttonStyle, padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}
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
                {testScore >= 7 ? 'You understand clock distribution and skew!' : 'Review the material and try again.'}
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
                      {opt.correct ? 'Correct' : userAnswer === oIndex ? 'Your answer' : ''} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 7, testScore >= 7 ? 'Complete Mastery' : 'Review & Retry')}
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
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ ...buttonStyle, padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left' as const, fontSize: '14px' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ ...buttonStyle, padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ ...buttonStyle, padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ ...buttonStyle, padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You understand clock distribution and skew!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Clock skew is the arrival time difference across the chip</li>
              <li>Light speed limits synchronous chip size at high frequencies</li>
              <li>H-trees and clock trees minimize skew</li>
              <li>PLLs generate stable high-frequency clocks</li>
              <li>Multiple clock domains handle large designs</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              The speed of light limit is why the industry moved from single giant chips to chiplets
              and 3D stacking. It is also why asynchronous design and network-on-chip architectures
              are becoming essential for continuing performance scaling in the post-Moore era!
            </p>
          </div>
          {renderVisualization()}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default ClockDistributionRenderer;
