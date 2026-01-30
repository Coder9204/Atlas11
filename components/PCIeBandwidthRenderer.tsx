'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// Types
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface PCIeBandwidthRendererProps {
  gamePhase?: Phase; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// Phase order and labels for navigation
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Overhead Lab',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

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
  pcie: '#3b82f6',
  nvlink: '#22c55e',
  gpu: '#8b5cf6',
  cpu: '#f97316',
};

// PCIe Generation specs (GB/s per lane)
const PCIE_SPECS = {
  'PCIe 3.0': { perLane: 0.985, maxLanes: 16, color: '#3b82f6' },
  'PCIe 4.0': { perLane: 1.969, maxLanes: 16, color: '#8b5cf6' },
  'PCIe 5.0': { perLane: 3.938, maxLanes: 16, color: '#06b6d4' },
  'NVLink 3': { perLane: 25, maxLanes: 12, color: '#22c55e' },
  'NVLink 4': { perLane: 50, maxLanes: 18, color: '#10b981' },
};

const TEST_QUESTIONS = [
  { text: 'PCIe bandwidth doubles with each new generation.', correct: true },
  { text: 'Adding more GPUs always makes training proportionally faster.', correct: false },
  { text: 'NVLink provides significantly higher bandwidth than PCIe for GPU-to-GPU communication.', correct: true },
  { text: 'PCIe x16 means 16 separate data lanes working in parallel.', correct: true },
  { text: 'Communication overhead becomes negligible as you add more GPUs.', correct: false },
  { text: 'A PCIe 4.0 x16 connection provides about 32 GB/s of bandwidth.', correct: true },
  { text: 'GPUs can only communicate through the CPU in all systems.', correct: false },
  { text: 'Data transfer time increases as model size grows beyond GPU memory.', correct: true },
  { text: 'NVLink allows direct GPU-to-GPU data transfer bypassing the CPU.', correct: true },
  { text: 'Scaling efficiency typically improves as you add more GPUs.', correct: false },
];

const TRANSFER_APPS = [
  {
    title: 'Data Center GPU Clusters',
    description: 'Modern AI data centers use NVLink and NVSwitch to connect up to 8 GPUs with 900 GB/s total bandwidth, enabling training of trillion-parameter models.',
    insight: 'DGX H100: 900 GB/s NVLink',
  },
  {
    title: 'Gaming Multi-GPU (SLI/CrossFire)',
    description: 'Consumer multi-GPU gaming struggled because PCIe bandwidth created bottlenecks when sharing frame data between GPUs.',
    insight: 'Why SLI died: PCIe too slow',
  },
  {
    title: 'Distributed Training',
    description: 'When training across multiple machines, network bandwidth (InfiniBand 400 Gb/s) becomes the bottleneck, not PCIe.',
    insight: '400 Gb/s = 50 GB/s network',
  },
  {
    title: 'Apple Silicon Unified Memory',
    description: 'Apple M-series chips share memory between CPU and GPU with 400+ GB/s bandwidth, eliminating PCIe copying entirely.',
    insight: 'M3 Max: 400 GB/s unified',
  },
];

const PCIeBandwidthRenderer: React.FC<PCIeBandwidthRendererProps> = ({
  gamePhase,
}) => {
  // Internal phase state management
  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<(boolean | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestIndex, setCurrentTestIndex] = useState(0);

  // Simulation state
  const [pcieGen, setPcieGen] = useState<keyof typeof PCIE_SPECS>('PCIe 4.0');
  const [numLanes, setNumLanes] = useState(16);
  const [numGPUs, setNumGPUs] = useState(2);
  const [modelSize, setModelSize] = useState(10); // GB
  const [useNVLink, setUseNVLink] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Navigation functions
  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);
    setTimeout(() => { isNavigating.current = false; }, 400);
  }, []);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Calculate bandwidth and efficiency
  const spec = PCIE_SPECS[pcieGen];
  const pcieBandwidth = spec.perLane * numLanes;
  const nvlinkBandwidth = useNVLink ? (pcieGen.includes('5') ? 900 : 600) : 0;
  const effectiveBandwidth = useNVLink ? nvlinkBandwidth : pcieBandwidth;

  // Transfer time calculation
  const transferTimePerGPU = (modelSize * 1000) / effectiveBandwidth; // ms for 1GB chunks
  const communicationOverhead = numGPUs > 1 ? (numGPUs - 1) * 0.15 : 0; // 15% overhead per additional GPU
  const scalingEfficiency = numGPUs > 1 ? 1 / (1 + communicationOverhead) : 1;
  const effectiveSpeedup = numGPUs * scalingEfficiency;

  const calculateTestScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      if (answer === TEST_QUESTIONS[index].correct) return score + 1;
      return score;
    }, 0);
  };

  const renderVisualization = () => {
    const width = 400;
    const height = 300;
    const dataFlowOffset = animationFrame % 50;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: '#1e293b', borderRadius: '12px' }}
      >
        {/* CPU */}
        <rect x={30} y={120} width={70} height={60} rx={8} fill={colors.cpu} />
        <text x={65} y={155} textAnchor="middle" fill="white" fontSize={12} fontWeight="bold">CPU</text>

        {/* PCIe Bus */}
        <rect x={100} y={140} width={100} height={20} fill={colors.pcie} opacity={0.3} />
        <text x={150} y={130} textAnchor="middle" fill={colors.textMuted} fontSize={10}>{pcieGen}</text>
        <text x={150} y={175} textAnchor="middle" fill={colors.textSecondary} fontSize={9}>{pcieBandwidth.toFixed(1)} GB/s</text>

        {/* Data flow animation on PCIe */}
        {[0, 20, 40].map((offset, i) => (
          <rect
            key={i}
            x={100 + ((dataFlowOffset + offset) % 100)}
            y={145}
            width={15}
            height={10}
            rx={2}
            fill={colors.pcie}
            opacity={0.8}
          />
        ))}

        {/* GPUs */}
        {Array.from({ length: Math.min(numGPUs, 4) }).map((_, i) => {
          const gpuX = 220;
          const gpuY = 40 + i * 65;
          return (
            <g key={i}>
              <rect x={gpuX} y={gpuY} width={80} height={50} rx={6} fill={colors.gpu} />
              <text x={gpuX + 40} y={gpuY + 30} textAnchor="middle" fill="white" fontSize={11} fontWeight="bold">GPU {i + 1}</text>

              {/* PCIe connection line */}
              <line x1={200} y1={150} x2={gpuX} y2={gpuY + 25} stroke={colors.pcie} strokeWidth={2} strokeDasharray="4,2" />
            </g>
          );
        })}

        {/* NVLink connections between GPUs */}
        {useNVLink && numGPUs > 1 && (
          <g>
            {Array.from({ length: Math.min(numGPUs - 1, 3) }).map((_, i) => (
              <line
                key={i}
                x1={300}
                y1={65 + i * 65}
                x2={300}
                y2={105 + i * 65}
                stroke={colors.nvlink}
                strokeWidth={4}
              />
            ))}
            <text x={320} y={140} fill={colors.nvlink} fontSize={9} fontWeight="bold">NVLink</text>
            <text x={320} y={155} fill={colors.nvlink} fontSize={8}>{nvlinkBandwidth} GB/s</text>
          </g>
        )}

        {/* Bandwidth meter */}
        <rect x={30} y={220} width={150} height={12} rx={3} fill="rgba(255,255,255,0.1)" />
        <rect
          x={30}
          y={220}
          width={150 * Math.min(effectiveBandwidth / 1000, 1)}
          height={12}
          rx={3}
          fill={useNVLink ? colors.nvlink : colors.pcie}
        />
        <text x={30} y={250} fill={colors.textSecondary} fontSize={10}>
          Effective: {effectiveBandwidth.toFixed(0)} GB/s
        </text>

        {/* Scaling efficiency meter */}
        <rect x={220} y={220} width={150} height={12} rx={3} fill="rgba(255,255,255,0.1)" />
        <rect
          x={220}
          y={220}
          width={150 * scalingEfficiency}
          height={12}
          rx={3}
          fill={scalingEfficiency > 0.8 ? colors.success : scalingEfficiency > 0.5 ? colors.warning : colors.error}
        />
        <text x={220} y={250} fill={colors.textSecondary} fontSize={10}>
          Efficiency: {(scalingEfficiency * 100).toFixed(0)}%
        </text>

        {/* Stats */}
        <text x={30} y={280} fill={colors.textMuted} fontSize={10}>
          Speedup: {effectiveSpeedup.toFixed(2)}x with {numGPUs} GPUs
        </text>
      </svg>
    );
  };

  const renderControls = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          PCIe Generation
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['PCIe 3.0', 'PCIe 4.0', 'PCIe 5.0'] as const).map(gen => (
            <button
              key={gen}
              onClick={() => setPcieGen(gen)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: pcieGen === gen ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: pcieGen === gen ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {gen}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          PCIe Lanes: x{numLanes}
        </label>
        <input
          type="range"
          min={1}
          max={16}
          value={numLanes}
          onChange={(e) => setNumLanes(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Number of GPUs: {numGPUs}
        </label>
        <input
          type="range"
          min={1}
          max={8}
          value={numGPUs}
          onChange={(e) => setNumGPUs(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.gpu }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Model Size: {modelSize} GB
        </label>
        <input
          type="range"
          min={1}
          max={100}
          value={modelSize}
          onChange={(e) => setModelSize(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.warning }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => setUseNVLink(!useNVLink)}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: useNVLink ? colors.nvlink : 'rgba(255,255,255,0.1)',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {useNVLink ? 'NVLink: ON' : 'NVLink: OFF'}
        </button>
        <span style={{ color: colors.textMuted, fontSize: '12px' }}>
          Direct GPU-to-GPU connection
        </span>
      </div>
    </div>
  );

  // Progress bar showing all 10 phases
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: colors.bgDark,
        zIndex: 1000,
        gap: '12px'
      }}>
        <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600 }}>
          PCIe Bandwidth
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' }}>
          {phaseOrder.map((p, i) => (
            <div
              key={p}
              onClick={() => i <= currentIdx && goToPhase(p)}
              style={{
                width: i === currentIdx ? '20px' : '10px',
                height: '10px',
                borderRadius: '5px',
                backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
                cursor: i <= currentIdx ? 'pointer' : 'default',
                transition: 'all 0.2s'
              }}
              title={phaseLabels[p]}
            />
          ))}
        </div>
        <span style={{ color: colors.accent, fontSize: '12px', fontWeight: 600 }}>
          {currentIdx + 1}/{phaseOrder.length}
        </span>
      </div>
    );
  };

  // Bottom navigation bar with Back/Next
  const renderBottomBar = (canProceed: boolean, buttonText: string, action?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canGoBack = currentIdx > 0;

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        background: colors.bgDark,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
        gap: '12px'
      }}>
        <button
          onClick={goBack}
          disabled={!canGoBack}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: canGoBack ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: canGoBack ? colors.textSecondary : colors.textMuted,
            fontWeight: 'bold',
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            opacity: canGoBack ? 1 : 0.3,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Back
        </button>
        <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>
        <button
          onClick={action || goNext}
          disabled={!canProceed}
          style={{
            padding: '12px 32px',
            borderRadius: '8px',
            border: 'none',
            background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
            color: canProceed ? 'white' : colors.textMuted,
            fontWeight: 'bold',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {buttonText}
        </button>
      </div>
    );
  };

  // Phase renders
  const renderHook = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-block',
            padding: '8px 16px',
            background: 'rgba(6, 182, 212, 0.1)',
            borderRadius: '20px',
            marginBottom: '16px'
          }}>
            <span style={{ color: colors.accent, fontSize: '14px', fontWeight: 'bold' }}>AI COMPUTE PHYSICS</span>
          </div>
          <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
            PCIe Bandwidth Limits
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px' }}>
            Why can't you just add more GPUs to make training faster?
          </p>
        </div>

        {renderVisualization()}

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '20px',
          marginTop: '24px'
        }}>
          <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, marginBottom: '16px' }}>
            Every GPU connects to your system through a PCIe slot - a highway with limited lanes.
            When GPUs need to share data during AI training, this highway can become a traffic jam.
          </p>
          <div style={{
            background: 'rgba(6, 182, 212, 0.1)',
            borderLeft: `3px solid ${colors.accent}`,
            padding: '12px',
            borderRadius: '0 8px 8px 0'
          }}>
            <p style={{ color: colors.accent, fontSize: '14px', margin: 0 }}>
              PCIe 4.0 x16: ~32 GB/s | GPU Memory Bandwidth: ~900 GB/s
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
              That's a 28x bottleneck between the GPU and the rest of the system!
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'Make a Prediction')}
    </div>
  );

  const renderPredict = () => {
    const predictions = [
      { id: 'linear', text: '2 GPUs = 2x faster, 8 GPUs = 8x faster (linear scaling)' },
      { id: 'diminishing', text: 'Each added GPU gives less speedup than the previous' },
      { id: 'constant', text: 'More GPUs don\'t help - one GPU does all the work' },
      { id: 'negative', text: 'Too many GPUs actually slows things down' },
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
          <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>
            Make Your Prediction
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            What happens to training speed as you add more GPUs?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {predictions.map(p => (
              <button
                key={p.id}
                onClick={() => setPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: prediction === p.id ? 'rgba(6, 182, 212, 0.2)' : colors.bgCard,
                  color: colors.textPrimary,
                  textAlign: 'left',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {p.text}
              </button>
            ))}
          </div>

          {prediction && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: prediction === 'diminishing' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
              borderLeft: `4px solid ${prediction === 'diminishing' ? colors.success : colors.warning}`
            }}>
              <p style={{ color: prediction === 'diminishing' ? colors.success : colors.warning, fontWeight: 'bold' }}>
                {prediction === 'diminishing' ? 'Correct!' : 'Not quite!'}
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                Due to communication overhead, each additional GPU provides diminishing returns.
                The bandwidth bottleneck means GPUs spend time waiting for data instead of computing.
              </p>
            </div>
          )}
        </div>
        {renderBottomBar(!!prediction, 'Explore the Lab')}
      </div>
    );
  };

  const renderPlay = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px', overflowY: 'auto' }}>
        <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>
          PCIe Bandwidth Lab
        </h2>

        {renderVisualization()}
        {renderControls()}

        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginTop: '16px'
        }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Observations:</h3>
          <ul style={{ color: colors.textSecondary, paddingLeft: '20px', margin: 0, lineHeight: 1.8 }}>
            <li>Doubling PCIe lanes doubles bandwidth</li>
            <li>Each PCIe generation approximately doubles per-lane speed</li>
            <li>NVLink provides 10-30x more GPU-to-GPU bandwidth than PCIe</li>
            <li>Communication overhead grows with GPU count</li>
          </ul>
        </div>
      </div>
      {renderBottomBar(true, 'Review Concepts')}
    </div>
  );

  const renderReview = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '24px' }}>
          Understanding PCIe Bandwidth
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.pcie, marginBottom: '8px' }}>PCIe Bandwidth Formula</h3>
            <p style={{ color: colors.textPrimary, fontFamily: 'monospace', fontSize: '14px' }}>
              Total Bandwidth = Per-Lane Speed x Number of Lanes
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '8px' }}>
              PCIe 4.0 x16 = 1.97 GB/s x 16 = 31.5 GB/s bidirectional
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.warning, marginBottom: '8px' }}>Amdahl's Law</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Speedup is limited by the sequential (non-parallelizable) portion of your workload.
              With GPUs, communication is often the sequential bottleneck.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.nvlink, marginBottom: '8px' }}>Why NVLink Matters</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              NVLink provides direct GPU-to-GPU communication at 600-900 GB/s,
              bypassing the CPU and PCIe bottleneck entirely.
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'The Twist: Communication Overhead')}
    </div>
  );

  const renderTwistPredict = () => {
    const predictions = [
      { id: 'none', text: 'Communication overhead is negligible with fast interconnects' },
      { id: 'linear', text: 'Overhead grows linearly with GPU count' },
      { id: 'quadratic', text: 'Overhead can grow quadratically (all-to-all communication)' },
      { id: 'fixed', text: 'Overhead is fixed regardless of GPU count' },
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
          <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '8px' }}>
            The Twist: Communication Overhead
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            During training, GPUs must synchronize gradients. How does this scale?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {predictions.map(p => (
              <button
                key={p.id}
                onClick={() => setTwistPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                  background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : colors.bgCard,
                  color: colors.textPrimary,
                  textAlign: 'left',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {p.text}
              </button>
            ))}
          </div>

          {twistPrediction && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: twistPrediction === 'quadratic' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
            }}>
              <p style={{ color: twistPrediction === 'quadratic' ? colors.success : colors.warning, fontWeight: 'bold' }}>
                {twistPrediction === 'quadratic' ? 'Correct!' : 'Partially right!'}
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                Naive all-reduce has O(n) communication, but with ring-reduce it's O(1) per GPU.
                However, synchronization barriers and network topology still cause overhead that limits scaling.
              </p>
            </div>
          )}
        </div>
        {renderBottomBar(!!twistPrediction, 'Explore Communication Patterns')}
      </div>
    );
  };

  const renderTwistPlay = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>
          Communication Overhead Lab
        </h2>

        {renderVisualization()}

        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginTop: '16px'
        }}>
          <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Gradient Synchronization</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>
            When training with data parallelism, each GPU computes gradients on different data.
            Before updating weights, all gradients must be averaged across all GPUs.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
              <p style={{ color: colors.error, fontSize: '12px', fontWeight: 'bold' }}>Naive All-Reduce</p>
              <p style={{ color: colors.textMuted, fontSize: '11px' }}>Send all to one, then broadcast</p>
              <p style={{ color: colors.textSecondary, fontSize: '11px' }}>O(N) data movement</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
              <p style={{ color: colors.success, fontSize: '12px', fontWeight: 'bold' }}>Ring All-Reduce</p>
              <p style={{ color: colors.textMuted, fontSize: '11px' }}>Circular data passing</p>
              <p style={{ color: colors.textSecondary, fontSize: '11px' }}>O(1) per GPU</p>
            </div>
          </div>
        </div>

        {renderControls()}
      </div>
      {renderBottomBar(true, 'Review the Twist')}
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '24px' }}>
          Communication Limits Multi-GPU Scaling
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '16px', border: `1px solid ${colors.error}` }}>
            <h3 style={{ color: colors.error, marginBottom: '8px' }}>The Problem</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Even with perfect algorithms, physical bandwidth limits how fast data can move.
              8 GPUs training a large model might only achieve 5-6x speedup, not 8x.
            </p>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '16px', border: `1px solid ${colors.success}` }}>
            <h3 style={{ color: colors.success, marginBottom: '8px' }}>Solutions</h3>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', paddingLeft: '20px', margin: 0, lineHeight: 1.8 }}>
              <li>NVLink for high-bandwidth GPU interconnect</li>
              <li>Gradient compression to reduce data volume</li>
              <li>Overlapping computation with communication</li>
              <li>Model parallelism instead of data parallelism</li>
            </ul>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'Real-World Applications')}
    </div>
  );

  const renderTransfer = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '8px' }}>
          Real-World Applications
        </h2>
        <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
          Explore all 4 applications to continue
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {TRANSFER_APPS.map((app, i) => (
            <div
              key={i}
              style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '16px',
                border: transferCompleted.has(i) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                {transferCompleted.has(i) && <span style={{ color: colors.success }}>Done</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{
                background: 'rgba(6, 182, 212, 0.1)',
                padding: '8px 12px',
                borderRadius: '6px',
                marginBottom: '12px'
              }}>
                <p style={{ color: colors.accent, fontSize: '12px', margin: 0 }}>{app.insight}</p>
              </div>
              {!transferCompleted.has(i) && (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, i]))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.accent}`,
                    background: 'transparent',
                    color: colors.accent,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Mark as Read
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      {renderBottomBar(transferCompleted.size >= 4, 'Take the Test')}
    </div>
  );

  const renderTest = () => {
    if (testSubmitted) {
      const score = calculateTestScore();
      const passed = score >= 7;

      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
          <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                fontSize: '64px',
                marginBottom: '16px'
              }}>
                {passed ? 'Trophy' : 'Book'}
              </div>
              <h2 style={{ color: passed ? colors.success : colors.warning, fontSize: '28px' }}>
                {score}/10 Correct
              </h2>
              <p style={{ color: colors.textSecondary }}>
                {passed ? 'Excellent! You understand PCIe bandwidth limits.' : 'Review the material and try again.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {TEST_QUESTIONS.map((q, i) => (
                <div key={i} style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: testAnswers[i] === q.correct ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  borderLeft: `3px solid ${testAnswers[i] === q.correct ? colors.success : colors.error}`,
                }}>
                  <p style={{ color: colors.textPrimary, fontSize: '14px', margin: 0 }}>{q.text}</p>
                  <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
                    Correct answer: {q.correct ? 'True' : 'False'}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {renderBottomBar(passed, passed ? 'Complete Mastery' : 'Review & Retry', () => {
            if (passed) {
              goNext();
            } else {
              setTestSubmitted(false);
              setTestAnswers(new Array(10).fill(null));
              setCurrentTestIndex(0);
            }
          })}
        </div>
      );
    }

    const currentQ = TEST_QUESTIONS[currentTestIndex];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
          <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '8px' }}>
            Knowledge Test
          </h2>
          <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '24px' }}>
            Question {currentTestIndex + 1} of 10
          </p>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', justifyContent: 'center' }}>
            {TEST_QUESTIONS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentTestIndex(i)}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  border: 'none',
                  background: testAnswers[i] !== null
                    ? (testAnswers[i] === TEST_QUESTIONS[i].correct ? colors.success : colors.error)
                    : (i === currentTestIndex ? colors.accent : 'rgba(255,255,255,0.1)'),
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              />
            ))}
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>{currentQ.text}</p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                const newAnswers = [...testAnswers];
                newAnswers[currentTestIndex] = true;
                setTestAnswers(newAnswers);
              }}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: '12px',
                border: testAnswers[currentTestIndex] === true ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.2)',
                background: testAnswers[currentTestIndex] === true ? 'rgba(16, 185, 129, 0.2)' : colors.bgCard,
                color: colors.textPrimary,
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              TRUE
            </button>
            <button
              onClick={() => {
                const newAnswers = [...testAnswers];
                newAnswers[currentTestIndex] = false;
                setTestAnswers(newAnswers);
              }}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: '12px',
                border: testAnswers[currentTestIndex] === false ? `2px solid ${colors.error}` : '1px solid rgba(255,255,255,0.2)',
                background: testAnswers[currentTestIndex] === false ? 'rgba(239, 68, 68, 0.2)' : colors.bgCard,
                color: colors.textPrimary,
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              FALSE
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
            <button
              onClick={() => setCurrentTestIndex(Math.max(0, currentTestIndex - 1))}
              disabled={currentTestIndex === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: currentTestIndex === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestIndex === 0 ? 'not-allowed' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Previous
            </button>
            {currentTestIndex < 9 ? (
              <button
                onClick={() => setCurrentTestIndex(currentTestIndex + 1)}
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
                onClick={() => setTestSubmitted(true)}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Submit
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.nvlink})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: `0 0 40px ${colors.accentGlow}`,
        }}>
          <span style={{ fontSize: '48px' }}>Trophy</span>
        </div>

        <h1 style={{ color: colors.textPrimary, fontSize: '32px', marginBottom: '8px', textAlign: 'center' }}>
          PCIe Bandwidth Master!
        </h1>
        <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '32px' }}>
          You understand why "just add more GPUs" doesn't always work
        </p>

        <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '100%' }}>
          <h3 style={{ color: colors.accent, marginBottom: '16px' }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 2, paddingLeft: '20px', margin: 0 }}>
            <li>PCIe bandwidth limits (lanes x generation)</li>
            <li>NVLink for high-speed GPU interconnect</li>
            <li>Communication overhead in multi-GPU training</li>
            <li>Diminishing returns with scaling</li>
            <li>Amdahl's Law and parallel efficiency</li>
          </ul>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(6, 182, 212, 0.1)',
          borderRadius: '12px',
          maxWidth: '400px',
          width: '100%'
        }}>
          <p style={{ color: colors.accent, textAlign: 'center', margin: 0 }}>
            "The fastest GPU is the one that doesn't wait for data."
          </p>
        </div>
      </div>
    </div>
  );

  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bgPrimary }}>
      {renderProgressBar()}
      {/* Main content with padding for fixed header */}
      <div style={{ paddingTop: '60px' }}>
        {renderPhase()}
      </div>
    </div>
  );
};

export default PCIeBandwidthRenderer;
