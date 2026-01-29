'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface GPUMemoryBandwidthRendererProps {
  phase: Phase;
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
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
  gpu: '#8b5cf6',
  memory: '#3b82f6',
  data: '#22d3ee',
};

const TEST_QUESTIONS = [
  { text: 'Memory bandwidth equals bus width multiplied by transfer speed', correct: true },
  { text: 'A 256-bit bus is twice as wide as a 128-bit bus', correct: true },
  { text: 'GPUs need more memory bandwidth than CPUs for most workloads', correct: true },
  { text: 'Doubling clock speed doubles bandwidth regardless of bus width', correct: true },
  { text: 'HBM stacks memory chips vertically to increase bandwidth', correct: true },
  { text: 'Wider memory buses always mean better gaming performance', correct: false },
  { text: 'GDDR6 transfers data twice per clock cycle (DDR)', correct: true },
  { text: 'Memory latency is more important than bandwidth for GPUs', correct: false },
  { text: 'HBM uses a much wider bus than GDDR (1024+ bits vs 256 bits)', correct: true },
  { text: 'Parallel memory access is essential for GPU shader performance', correct: true },
];

const TRANSFER_APPLICATIONS = [
  {
    title: 'Gaming Graphics',
    description: 'Modern games load massive textures, meshes, and shader data. A 4K game might need 8+ GB of VRAM with 500+ GB/s bandwidth to maintain 60fps.',
    question: 'Why do 4K games need so much more bandwidth than 1080p?',
    answer: '4K has 4x the pixels of 1080p. Each frame requires 4x more texture fetches, framebuffer writes, and shader computations, all demanding proportionally more bandwidth.',
  },
  {
    title: 'AI Training',
    description: 'Training large language models requires loading billions of parameters and gradients. Data center GPUs use HBM with 2+ TB/s bandwidth.',
    question: 'Why do AI chips use HBM instead of GDDR?',
    answer: 'AI training is extremely bandwidth-limited. HBM provides 3-4x more bandwidth than GDDR in the same power envelope, making it essential for training efficiency.',
  },
  {
    title: 'Video Editing',
    description: '8K video editing requires real-time playback and effects. Each frame is 33+ megapixels that must flow through the GPU memory system.',
    question: 'How does memory bandwidth affect video timeline scrubbing?',
    answer: 'Scrubbing through 8K footage requires loading new frames instantly. Insufficient bandwidth causes stuttering and dropped frames during preview.',
  },
  {
    title: 'Scientific Simulation',
    description: 'Weather models, fluid dynamics, and molecular simulations process enormous datasets. GPU memory bandwidth often limits simulation resolution.',
    question: 'Why do scientific GPUs prioritize bandwidth over gaming features?',
    answer: 'Simulations are compute and bandwidth limited, not graphics-feature limited. More bandwidth enables larger, more accurate models with finer resolution.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const GPUMemoryBandwidthRenderer: React.FC<GPUMemoryBandwidthRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [busWidth, setBusWidth] = useState(256); // bits
  const [clockSpeed, setClockSpeed] = useState(2000); // MHz effective
  const [memoryType, setMemoryType] = useState<'gddr6' | 'gddr6x' | 'hbm2e'>('gddr6');
  const [isAnimating, setIsAnimating] = useState(false);
  const [dataFlowPhase, setDataFlowPhase] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<(boolean | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);

  // Calculate bandwidth
  const calculateBandwidth = useCallback(() => {
    // Bandwidth = Bus Width (bits) * Clock Speed (MHz) * Transfers per clock / 8 (to get bytes)
    // GDDR6 = 2 transfers per clock (DDR)
    // GDDR6X = 4 transfers per clock (PAM4)
    // HBM2e = 2 transfers per clock but much wider bus
    const transfersPerClock = memoryType === 'gddr6x' ? 4 : 2;
    const effectiveBusWidth = memoryType === 'hbm2e' ? 1024 : busWidth;
    const bandwidthGBps = (effectiveBusWidth * clockSpeed * transfersPerClock) / 8 / 1000;
    return bandwidthGBps;
  }, [busWidth, clockSpeed, memoryType]);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setDataFlowPhase(p => (p + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'clock', label: 'Only clock speed matters - faster clocks mean more bandwidth' },
    { id: 'both', label: 'Bandwidth = bus width x clock speed - both matter equally' },
    { id: 'width', label: 'Only bus width matters - wider buses always win' },
    { id: 'neither', label: 'Neither matters much - GPUs are compute limited, not memory limited' },
  ];

  const twistPredictions = [
    { id: 'gddr', label: 'GDDR is better - higher clock speeds compensate for narrower bus' },
    { id: 'hbm', label: 'HBM stacks memory vertically for much wider buses (1024+ bits)' },
    { id: 'same', label: 'HBM and GDDR have similar bandwidth, just different form factors' },
    { id: 'stack', label: 'HBM is faster because stacking reduces wire length' },
  ];

  const handleTestAnswer = (answer: boolean) => {
    const newAnswers = [...testAnswers];
    newAnswers[currentTestIndex] = answer;
    setTestAnswers(newAnswers);
  };

  const nextTestQuestion = () => {
    if (currentTestIndex < TEST_QUESTIONS.length - 1) {
      setCurrentTestIndex(currentTestIndex + 1);
    }
  };

  const prevTestQuestion = () => {
    if (currentTestIndex > 0) {
      setCurrentTestIndex(currentTestIndex - 1);
    }
  };

  const submitTest = () => {
    let score = 0;
    testAnswers.forEach((answer, i) => {
      if (answer === TEST_QUESTIONS[i].correct) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // VISUALIZATION
  // ─────────────────────────────────────────────────────────────────────────────
  const renderBandwidthVisualization = () => {
    const width = 400;
    const height = 320;
    const bandwidth = calculateBandwidth();
    const effectiveBusWidth = memoryType === 'hbm2e' ? 1024 : busWidth;

    // Calculate data flow positions
    const numLanes = Math.min(8, effectiveBusWidth / 32);
    const laneSpacing = 180 / numLanes;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
      >
        <defs>
          <linearGradient id="gpuGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.gpu} />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="memGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.memory} />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
          <filter id="dataGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width/2} y={25} textAnchor="middle" fill={colors.textPrimary} fontSize={14} fontWeight="bold">
          GPU Memory Bus Architecture
        </text>

        {/* GPU Chip */}
        <rect x={30} y={80} width={100} height={140} rx={8} fill="url(#gpuGrad)" />
        <text x={80} y={110} textAnchor="middle" fill="white" fontSize={12} fontWeight="bold">GPU</text>
        <text x={80} y={130} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={10}>Compute</text>
        <text x={80} y={145} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={10}>Units</text>

        {/* Memory bandwidth indicator */}
        <text x={80} y={200} textAnchor="middle" fill={colors.data} fontSize={11} fontWeight="bold">
          {bandwidth.toFixed(0)} GB/s
        </text>

        {/* Memory Chips */}
        <g>
          <rect x={270} y={60} width={100} height={60} rx={6} fill="url(#memGrad)" />
          <text x={320} y={90} textAnchor="middle" fill="white" fontSize={10} fontWeight="bold">
            {memoryType === 'hbm2e' ? 'HBM2e Stack' : memoryType.toUpperCase()}
          </text>
          <text x={320} y={105} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={9}>
            {effectiveBusWidth}-bit bus
          </text>

          <rect x={270} y={140} width={100} height={60} rx={6} fill="url(#memGrad)" />
          <text x={320} y={170} textAnchor="middle" fill="white" fontSize={10} fontWeight="bold">
            {memoryType === 'hbm2e' ? 'HBM2e Stack' : memoryType.toUpperCase()}
          </text>
          <text x={320} y={185} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={9}>
            {clockSpeed} MHz
          </text>
        </g>

        {/* Data lanes animation */}
        {Array.from({ length: numLanes }).map((_, i) => {
          const y = 80 + i * laneSpacing + laneSpacing / 2;
          const offset = (dataFlowPhase + i * 12) % 100;

          return (
            <g key={i}>
              {/* Lane background */}
              <line
                x1={140}
                y1={y}
                x2={260}
                y2={y}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={4}
              />
              {/* Data packets flowing */}
              {isAnimating && (
                <>
                  <circle
                    cx={140 + (offset / 100) * 120}
                    cy={y}
                    r={5}
                    fill={colors.data}
                    filter="url(#dataGlow)"
                    opacity={0.9}
                  />
                  <circle
                    cx={140 + ((offset + 50) % 100) / 100 * 120}
                    cy={y}
                    r={5}
                    fill={colors.data}
                    filter="url(#dataGlow)"
                    opacity={0.9}
                  />
                </>
              )}
            </g>
          );
        })}

        {/* Bus width label */}
        <text x={200} y={65} textAnchor="middle" fill={colors.textSecondary} fontSize={10}>
          {numLanes} x {effectiveBusWidth / numLanes}-bit lanes
        </text>

        {/* Info panel */}
        <rect x={30} y={250} width={340} height={60} rx={8} fill="rgba(0,0,0,0.5)" />
        <text x={50} y={270} fill={colors.textSecondary} fontSize={11}>
          Bus Width: {effectiveBusWidth} bits
        </text>
        <text x={50} y={290} fill={colors.textSecondary} fontSize={11}>
          Clock: {clockSpeed} MHz ({memoryType === 'gddr6x' ? '4x' : '2x'} transfers/clock)
        </text>
        <text x={230} y={280} fill={colors.accent} fontSize={14} fontWeight="bold">
          = {bandwidth.toFixed(0)} GB/s
        </text>
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────────
  const buttonStyle = {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    fontSize: '14px',
    WebkitTapHighlightColor: 'transparent' as const,
  };

  const renderBottomBar = (canProceed: boolean, buttonText: string) => (
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
        disabled={!canProceed}
        style={{
          ...buttonStyle,
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          cursor: canProceed ? 'pointer' : 'not-allowed',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Why Do GPUs Need Wide Memory Buses?
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              The physics of parallel data transfer
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderBandwidthVisualization()}
          </div>

          <div style={{ padding: '24px' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                A CPU might have a 64-bit memory bus. A high-end GPU? 384 bits or even 1024+ bits
                with HBM. Why do GPUs need memory buses 6-16x wider than CPUs?
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The answer reveals why GPUs dominate parallel computing.
              </p>
            </div>

            <div style={{
              background: 'rgba(6, 182, 212, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                A GPU might have 10,000+ shader cores all wanting data simultaneously!
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What Determines Memory Bandwidth?</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              How do GPUs achieve such high bandwidth?
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderBandwidthVisualization()}
          </div>

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What determines memory bandwidth?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    ...buttonStyle,
                    padding: '16px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    textAlign: 'left',
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Memory Bandwidth Lab</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust bus width and clock speed to see bandwidth change
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderBandwidthVisualization()}
          </div>

          <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Bus Width: {busWidth} bits
              </label>
              <input
                type="range"
                min="64"
                max="384"
                step="64"
                value={busWidth}
                onChange={(e) => setBusWidth(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Effective Clock: {clockSpeed} MHz
              </label>
              <input
                type="range"
                min="1000"
                max="3000"
                step="100"
                value={clockSpeed}
                onChange={(e) => setClockSpeed(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Memory Type
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['gddr6', 'gddr6x', 'hbm2e'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setMemoryType(type)}
                    style={{
                      ...buttonStyle,
                      flex: 1,
                      padding: '10px',
                      background: memoryType === type ? colors.accent : 'transparent',
                      border: `1px solid ${memoryType === type ? colors.accent : 'rgba(255,255,255,0.2)'}`,
                      color: colors.textPrimary,
                      fontSize: '12px',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
              <button
                onClick={() => setIsAnimating(!isAnimating)}
                style={{
                  ...buttonStyle,
                  background: isAnimating ? colors.error : colors.success,
                  color: 'white',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {isAnimating ? 'Stop Animation' : 'Animate Data Flow'}
              </button>
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '8px',
              marginTop: '16px',
            }}>
              <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Bandwidth Formula:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px', fontFamily: 'monospace' }}>
                Bandwidth = Bus Width x Clock Speed x Transfers/Clock / 8
              </p>
              <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '8px' }}>
                {busWidth} bits x {clockSpeed} MHz x {memoryType === 'gddr6x' ? '4' : '2'} / 8 = {calculateBandwidth().toFixed(0)} GB/s
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'both';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
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
              Bandwidth = Width x Speed. Both matter! A 256-bit bus at 2000 MHz moves twice as
              much data as a 128-bit bus at the same speed - or a 256-bit bus at 1000 MHz.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Parallel Access</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Parallel Lanes:</strong> A 256-bit bus
                has 256 physical wires transferring data simultaneously. More wires = more parallel data.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Clock Speed:</strong> Higher frequency
                means more transfers per second on each wire. But signal integrity limits max frequency.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>DDR Technology:</strong> Double Data Rate
                transfers on both rising and falling clock edges, effectively doubling bandwidth.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Why GPUs Need More:</strong> Thousands of
                shader cores working in parallel all need data simultaneously. CPUs have few cores
                that can wait; GPUs need constant data flow.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Next: The Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The HBM Revolution</h2>
            <p style={{ color: colors.textSecondary }}>
              How do AI chips achieve 2+ TB/s bandwidth?
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Data center GPUs like NVIDIA H100 need 2+ terabytes per second of memory bandwidth.
              That's 4x what consumer GPUs achieve with GDDR6. How is this possible?
            </p>
          </div>

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does HBM achieve such high bandwidth?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    ...buttonStyle,
                    padding: '16px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    textAlign: 'left',
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>HBM vs GDDR Comparison</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare stacked memory to traditional memory
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderBandwidthVisualization()}
          </div>

          <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Compare Memory Types
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['gddr6', 'gddr6x', 'hbm2e'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setMemoryType(type);
                      if (type === 'hbm2e') {
                        setClockSpeed(1600);
                      } else {
                        setClockSpeed(2000);
                      }
                    }}
                    style={{
                      ...buttonStyle,
                      flex: 1,
                      padding: '12px 8px',
                      background: memoryType === type ? colors.warning : 'transparent',
                      border: `1px solid ${memoryType === type ? colors.warning : 'rgba(255,255,255,0.2)'}`,
                      color: colors.textPrimary,
                      fontSize: '11px',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <div>{type.toUpperCase()}</div>
                    <div style={{ fontSize: '10px', opacity: 0.7 }}>
                      {type === 'gddr6' ? '256-bit' : type === 'gddr6x' ? '384-bit' : '1024-bit'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setIsAnimating(!isAnimating)}
                style={{
                  ...buttonStyle,
                  background: isAnimating ? colors.error : colors.success,
                  color: 'white',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {isAnimating ? 'Stop' : 'Animate'}
              </button>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              marginTop: '16px',
              borderLeft: `3px solid ${colors.warning}`,
            }}>
              <h4 style={{ color: colors.warning, marginBottom: '8px' }}>HBM Key Insight:</h4>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                HBM stacks 4-8 memory dies vertically with thousands of tiny connections (TSVs).
                This enables a 1024-bit or wider bus in a tiny footprint, achieving 2-3x the
                bandwidth of GDDR at lower power per bit transferred.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'hbm';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
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
              HBM stacks memory chips vertically and uses Through-Silicon Vias (TSVs) to create
              an extremely wide 1024+ bit bus in a tiny area, enabling massive bandwidth.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>HBM Technology</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Vertical Stacking:</strong> 4-8 DRAM
                dies stacked on top of each other, connected by thousands of microscopic TSVs.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Wide Bus:</strong> Each HBM stack
                has a 1024-bit interface. Multiple stacks give 4096+ bits total.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Power Efficiency:</strong> Shorter
                signal paths mean less power per bit. HBM uses ~3.5x less power per GB/s than GDDR.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Cost Trade-off:</strong> HBM is
                expensive and complex. Consumer GPUs use GDDR; data center GPUs use HBM.
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
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test
            </p>
          </div>

          {TRANSFER_APPLICATIONS.map((app, index) => (
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
              <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    ...buttonStyle,
                    padding: '8px 16px',
                    background: 'transparent',
                    border: `1px solid ${colors.accent}`,
                    color: colors.accent,
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
        {renderBottomBar(transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
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
                {testScore >= 8 ? 'You understand GPU memory bandwidth!' : 'Review the concepts and try again.'}
              </p>
            </div>

            {TEST_QUESTIONS.map((q, i) => {
              const userAnswer = testAnswers[i];
              const isCorrect = userAnswer === q.correct;
              return (
                <div key={i} style={{
                  background: colors.bgCard,
                  margin: '16px',
                  padding: '16px',
                  borderRadius: '12px',
                  borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}`,
                }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '8px' }}>{i + 1}. {q.text}</p>
                  <p style={{ color: isCorrect ? colors.success : colors.error, fontSize: '14px' }}>
                    Your answer: {userAnswer ? 'True' : 'False'} | Correct: {q.correct ? 'True' : 'False'}
                  </p>
                </div>
              );
            })}
          </div>
          {renderBottomBar(testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = TEST_QUESTIONS[currentTestIndex];
    const allAnswered = testAnswers.every(a => a !== null);

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestIndex + 1} / {TEST_QUESTIONS.length}</span>
            </div>

            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {TEST_QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestIndex(i)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: testAnswers[i] !== null ? colors.accent : i === currentTestIndex ? colors.textMuted : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>
                {currentQ.text}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => handleTestAnswer(true)}
                style={{
                  ...buttonStyle,
                  flex: 1,
                  padding: '16px',
                  background: testAnswers[currentTestIndex] === true ? 'rgba(16, 185, 129, 0.3)' : 'transparent',
                  border: testAnswers[currentTestIndex] === true ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.2)',
                  color: colors.textPrimary,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                TRUE
              </button>
              <button
                onClick={() => handleTestAnswer(false)}
                style={{
                  ...buttonStyle,
                  flex: 1,
                  padding: '16px',
                  background: testAnswers[currentTestIndex] === false ? 'rgba(239, 68, 68, 0.3)' : 'transparent',
                  border: testAnswers[currentTestIndex] === false ? `2px solid ${colors.error}` : '1px solid rgba(255,255,255,0.2)',
                  color: colors.textPrimary,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                FALSE
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button
                onClick={prevTestQuestion}
                disabled={currentTestIndex === 0}
                style={{
                  ...buttonStyle,
                  background: 'transparent',
                  border: `1px solid ${colors.textMuted}`,
                  color: currentTestIndex === 0 ? colors.textMuted : colors.textPrimary,
                  cursor: currentTestIndex === 0 ? 'not-allowed' : 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Previous
              </button>
              {currentTestIndex < TEST_QUESTIONS.length - 1 ? (
                <button
                  onClick={nextTestQuestion}
                  style={{
                    ...buttonStyle,
                    background: colors.accent,
                    color: 'white',
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
                    ...buttonStyle,
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
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You understand GPU memory bandwidth architecture
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Bandwidth = Bus Width x Clock Speed x Transfers per Clock</li>
              <li>GPUs need wide buses for parallel shader core data access</li>
              <li>GDDR uses fast clocks with moderate bus width (256-384 bits)</li>
              <li>HBM stacks memory vertically for extreme bus width (1024+ bits)</li>
              <li>HBM trades cost for bandwidth and power efficiency</li>
              <li>AI workloads are extremely bandwidth-hungry</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(6, 182, 212, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Future memory technologies like HBM3e and GDDR7 push bandwidth even higher.
              NVIDIA's H100 achieves 3.35 TB/s with HBM3. The race for AI training performance
              is fundamentally a race for memory bandwidth!
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
            {renderBandwidthVisualization()}
          </div>
        </div>
        {renderBottomBar(true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default GPUMemoryBandwidthRenderer;
