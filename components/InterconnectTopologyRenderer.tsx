'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// Types
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface InterconnectTopologyRendererProps {
  gamePhase?: Phase;  // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Scale Effects',
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
  accent: '#14b8a6',
  accentGlow: 'rgba(20, 184, 166, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  ring: '#06b6d4',
  tree: '#8b5cf6',
  mesh: '#f97316',
  allreduce: '#22c55e',
  gpu: '#3b82f6',
};

// Topology specs
const TOPOLOGY_SPECS = {
  'Ring': { latency: 'O(N)', bandwidth: 'Optimal', scalability: 'Good for small N', color: colors.ring },
  'Tree': { latency: 'O(log N)', bandwidth: 'Sub-optimal', scalability: 'Good for large N', color: colors.tree },
  'Fat Tree': { latency: 'O(log N)', bandwidth: 'High', scalability: 'Excellent', color: colors.mesh },
  'Full Mesh': { latency: 'O(1)', bandwidth: 'Maximum', scalability: 'Poor (N^2 links)', color: colors.allreduce },
};

const TEST_QUESTIONS = [
  { text: 'Ring all-reduce is bandwidth-optimal for gradient synchronization.', correct: true },
  { text: 'Network topology has no impact on training speed at scale.', correct: false },
  { text: 'A fat-tree topology provides multiple paths between any two nodes.', correct: true },
  { text: 'Tree topologies have lower latency than ring topologies for large N.', correct: true },
  { text: 'Full mesh topology scales well to thousands of GPUs.', correct: false },
  { text: 'All-reduce operations combine data from all workers into a single result.', correct: true },
  { text: 'NVSwitch enables all-to-all GPU communication at full bandwidth.', correct: true },
  { text: 'Communication time is negligible compared to computation time.', correct: false },
  { text: 'Hierarchical all-reduce uses different topologies at different scales.', correct: true },
  { text: 'InfiniBand is commonly used for high-speed interconnects in data centers.', correct: true },
];

const TRANSFER_APPS = [
  {
    title: 'NVIDIA DGX SuperPOD',
    description: 'Connects 32 DGX H100 systems (256 GPUs) with InfiniBand fat-tree topology. Used for training GPT-4 class models.',
    insight: '256 GPUs @ 400 Gb/s each',
  },
  {
    title: 'Google TPU Pods',
    description: 'Google TPUs use a 3D torus topology for direct chip-to-chip communication. TPU v4 pods have 4096 chips.',
    insight: 'TPU v4: 3D torus @ 4800 Gb/s',
  },
  {
    title: 'AWS Trainium',
    description: 'Amazon Trainium uses a 2D mesh topology with custom NeuronLink interconnect for ML training.',
    insight: 'Trn1: 800 Gb/s NeuronLink',
  },
  {
    title: 'Meta Research SuperCluster',
    description: 'Meta RSC uses 2000+ A100 GPUs with hierarchical InfiniBand topology for training LLaMA models.',
    insight: 'RSC: 5 exaflops peak',
  },
];

const InterconnectTopologyRenderer: React.FC<InterconnectTopologyRendererProps> = ({
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
  const [topology, setTopology] = useState<keyof typeof TOPOLOGY_SPECS>('Ring');
  const [numNodes, setNumNodes] = useState(8);
  const [messageSize, setMessageSize] = useState(100); // MB
  const [animationFrame, setAnimationFrame] = useState(0);
  const [showDataFlow, setShowDataFlow] = useState(true);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 200);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Internal navigation functions
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

  // Calculate metrics
  const spec = TOPOLOGY_SPECS[topology];
  const calculateLatencySteps = () => {
    switch (topology) {
      case 'Ring': return numNodes - 1;
      case 'Tree': return Math.ceil(2 * Math.log2(numNodes));
      case 'Fat Tree': return Math.ceil(2 * Math.log2(numNodes));
      case 'Full Mesh': return 1;
    }
  };

  const calculateBandwidthEfficiency = () => {
    switch (topology) {
      case 'Ring': return 100; // Bandwidth optimal
      case 'Tree': return 50; // Bottleneck at root
      case 'Fat Tree': return 90; // Near optimal with fat links
      case 'Full Mesh': return 100; // Direct paths
    }
  };

  const latencySteps = calculateLatencySteps();
  const bandwidthEfficiency = calculateBandwidthEfficiency();
  const totalDataTransferred = messageSize * numNodes; // Each node sends its data
  const effectiveTime = (totalDataTransferred / bandwidthEfficiency) * latencySteps / 100;

  const calculateTestScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      if (answer === TEST_QUESTIONS[index].correct) return score + 1;
      return score;
    }, 0);
  };

  const renderVisualization = () => {
    const width = 400;
    const height = 350;
    const centerX = width / 2;
    const centerY = height / 2 - 20;
    const radius = 100;

    // Generate node positions based on topology
    const getNodePositions = () => {
      const positions: { x: number; y: number }[] = [];
      for (let i = 0; i < numNodes; i++) {
        const angle = (2 * Math.PI * i) / numNodes - Math.PI / 2;
        positions.push({
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        });
      }
      return positions;
    };

    const nodePositions = getNodePositions();

    // Get connections based on topology
    const getConnections = () => {
      const connections: { from: number; to: number }[] = [];

      switch (topology) {
        case 'Ring':
          for (let i = 0; i < numNodes; i++) {
            connections.push({ from: i, to: (i + 1) % numNodes });
          }
          break;

        case 'Tree':
        case 'Fat Tree':
          // Binary tree structure
          for (let i = 0; i < Math.floor(numNodes / 2); i++) {
            if (2 * i + 1 < numNodes) connections.push({ from: i, to: 2 * i + 1 });
            if (2 * i + 2 < numNodes) connections.push({ from: i, to: 2 * i + 2 });
          }
          break;

        case 'Full Mesh':
          for (let i = 0; i < numNodes; i++) {
            for (let j = i + 1; j < numNodes; j++) {
              connections.push({ from: i, to: j });
            }
          }
          break;
      }

      return connections;
    };

    const connections = getConnections();

    // Animation for data flow
    const animProgress = animationFrame / 200;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: '#1e293b', borderRadius: '12px' }}
      >
        {/* Title */}
        <text x={width / 2} y={25} textAnchor="middle" fill={colors.textPrimary} fontSize={16} fontWeight="bold">
          {topology} Topology - {numNodes} Nodes
        </text>

        {/* Connections */}
        {connections.map((conn, i) => {
          const from = nodePositions[conn.from];
          const to = nodePositions[conn.to];
          const isFatTree = topology === 'Fat Tree';

          return (
            <g key={i}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={spec.color}
                strokeWidth={isFatTree ? 4 : 2}
                opacity={0.6}
              />

              {/* Data flow animation */}
              {showDataFlow && (
                <circle
                  cx={from.x + (to.x - from.x) * ((animProgress + i * 0.1) % 1)}
                  cy={from.y + (to.y - from.y) * ((animProgress + i * 0.1) % 1)}
                  r={3}
                  fill="white"
                />
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodePositions.map((pos, i) => (
          <g key={i}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={20}
              fill={colors.gpu}
              stroke="white"
              strokeWidth={2}
            />
            <text
              x={pos.x}
              y={pos.y + 5}
              textAnchor="middle"
              fill="white"
              fontSize={10}
              fontWeight="bold"
            >
              G{i}
            </text>
          </g>
        ))}

        {/* Stats panel */}
        <g transform={`translate(20, ${height - 80})`}>
          <rect x={0} y={0} width={160} height={65} rx={8} fill="rgba(0,0,0,0.3)" />
          <text x={10} y={18} fill={colors.textMuted} fontSize={10}>Latency Steps</text>
          <text x={10} y={35} fill={spec.color} fontSize={14} fontWeight="bold">{latencySteps}</text>
          <text x={90} y={18} fill={colors.textMuted} fontSize={10}>Bandwidth Eff.</text>
          <text x={90} y={35} fill={bandwidthEfficiency > 80 ? colors.success : colors.warning} fontSize={14} fontWeight="bold">
            {bandwidthEfficiency}%
          </text>
          <text x={10} y={55} fill={colors.textMuted} fontSize={10}>
            Links: {connections.length}
          </text>
        </g>

        {/* Connection count for mesh */}
        {topology === 'Full Mesh' && numNodes > 8 && (
          <text x={width / 2} y={height - 10} textAnchor="middle" fill={colors.error} fontSize={11}>
            Warning: {(numNodes * (numNodes - 1)) / 2} links needed!
          </text>
        )}
      </svg>
    );
  };

  const renderControls = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Network Topology
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(Object.keys(TOPOLOGY_SPECS) as Array<keyof typeof TOPOLOGY_SPECS>).map(t => (
            <button
              key={t}
              onClick={() => setTopology(t)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: topology === t ? `2px solid ${TOPOLOGY_SPECS[t].color}` : '1px solid rgba(255,255,255,0.2)',
                background: topology === t ? `${TOPOLOGY_SPECS[t].color}22` : 'transparent',
                color: TOPOLOGY_SPECS[t].color,
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Number of Nodes (GPUs): {numNodes}
        </label>
        <input
          type="range"
          min={4}
          max={16}
          value={numNodes}
          onChange={(e) => setNumNodes(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Message Size: {messageSize} MB
        </label>
        <input
          type="range"
          min={10}
          max={1000}
          step={10}
          value={messageSize}
          onChange={(e) => setMessageSize(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.warning }}
        />
      </div>

      <div style={{
        background: colors.bgCard,
        borderRadius: '12px',
        padding: '16px',
      }}>
        <h4 style={{ color: spec.color, marginTop: 0, marginBottom: '12px' }}>{topology} Properties</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
          <div>
            <div style={{ color: colors.textMuted }}>Latency</div>
            <div style={{ color: colors.textPrimary }}>{spec.latency}</div>
          </div>
          <div>
            <div style={{ color: colors.textMuted }}>Bandwidth</div>
            <div style={{ color: colors.textPrimary }}>{spec.bandwidth}</div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ color: colors.textMuted }}>Scalability</div>
            <div style={{ color: colors.textPrimary }}>{spec.scalability}</div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowDataFlow(!showDataFlow)}
        style={{
          padding: '10px 16px',
          borderRadius: '8px',
          border: 'none',
          background: showDataFlow ? colors.accent : 'rgba(255,255,255,0.1)',
          color: 'white',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {showDataFlow ? 'Hide Data Flow' : 'Show Data Flow'}
      </button>
    </div>
  );

  // Progress bar showing all 10 phases
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px',
        borderBottom: `1px solid rgba(255,255,255,0.1)`,
        backgroundColor: colors.bgDark,
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                onClick={() => i < currentIdx && goToPhase(p)}
                style={{
                  height: '8px',
                  width: i === currentIdx ? '24px' : '8px',
                  borderRadius: '5px',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
                  cursor: i < currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s',
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textMuted }}>
            {currentIdx + 1} / {phaseOrder.length}
          </span>
        </div>
        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          background: `${colors.accent}20`,
          color: colors.accent,
          fontSize: '11px',
          fontWeight: 700
        }}>
          {phaseLabels[phase]}
        </div>
      </div>
    );
  };

  // Bottom bar with Back/Next navigation
  const renderBottomBar = (canProceed: boolean, buttonText: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = currentIdx > 0;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: colors.bgDark,
        gap: '12px',
      }}>
        <button
          onClick={goBack}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '14px',
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            color: colors.textSecondary,
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '44px',
            WebkitTapHighlightColor: 'transparent',
          }}
          disabled={!canBack}
        >
          Back
        </button>

        <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>

        <button
          onClick={onNext || goNext}
          disabled={!canProceed}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '14px',
            background: canProceed ? `linear-gradient(135deg, ${colors.accent} 0%, #0d9488 100%)` : 'rgba(30, 41, 59, 0.9)',
            color: canProceed ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            opacity: canProceed ? 1 : 0.4,
            boxShadow: canProceed ? `0 2px 12px ${colors.accent}30` : 'none',
            minHeight: '44px',
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
            background: 'rgba(20, 184, 166, 0.1)',
            borderRadius: '20px',
            marginBottom: '16px'
          }}>
            <span style={{ color: colors.accent, fontSize: '14px', fontWeight: 'bold' }}>AI COMPUTE PHYSICS</span>
          </div>
          <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
            Interconnect Topology
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px' }}>
            How do thousands of GPUs work together on one AI model?
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
            Training GPT-4 used thousands of GPUs working together. But how do they
            synchronize? Every GPU needs to share its gradients with every other GPU.
          </p>
          <div style={{
            background: 'rgba(20, 184, 166, 0.1)',
            borderLeft: `3px solid ${colors.accent}`,
            padding: '12px',
            borderRadius: '0 8px 8px 0'
          }}>
            <p style={{ color: colors.accent, fontSize: '14px', margin: 0 }}>
              The network topology determines how fast gradients can be synchronized
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
              Wrong topology = GPUs waiting instead of computing
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'Make a Prediction')}
    </div>
  );

  const renderPredict = () => {
    const predictions = [
      { id: 'broadcast', text: 'One GPU broadcasts to all others (star topology)' },
      { id: 'sequential', text: 'GPUs pass data one-by-one in a chain' },
      { id: 'ring', text: 'GPUs form a ring and pass partial sums around' },
      { id: 'random', text: 'GPUs randomly share with neighbors until done' },
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
          <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>
            Make Your Prediction
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            What's the most efficient way for 8 GPUs to average their gradients?
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
                  background: prediction === p.id ? 'rgba(20, 184, 166, 0.2)' : colors.bgCard,
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
              background: prediction === 'ring' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
              borderLeft: `4px solid ${prediction === 'ring' ? colors.success : colors.warning}`
            }}>
              <p style={{ color: prediction === 'ring' ? colors.success : colors.warning, fontWeight: 'bold' }}>
                {prediction === 'ring' ? 'Correct!' : 'Not quite!'}
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                Ring all-reduce is bandwidth-optimal! Each GPU sends and receives exactly
                (N-1)/N of its data, using all available bandwidth. No single bottleneck node.
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
          Topology Explorer Lab
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
            <li>Ring: Optimal bandwidth, O(N) latency steps</li>
            <li>Tree: O(log N) latency but root bottleneck</li>
            <li>Fat Tree: Fast + high bandwidth (used in data centers)</li>
            <li>Full Mesh: Fastest but O(N^2) links (impractical at scale)</li>
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
          Understanding Network Topologies
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.ring, marginBottom: '8px' }}>Ring All-Reduce</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Data flows around a ring. Each node sends a chunk while receiving another.
              Bandwidth-optimal: uses 100% of available links. Used by NCCL for small clusters.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.tree, marginBottom: '8px' }}>Tree Reduction</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Data flows up to root, then broadcasts down. Fast (O(log N)) but root
              becomes a bandwidth bottleneck. Good for latency-sensitive workloads.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.mesh, marginBottom: '8px' }}>Fat Tree</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Tree with fatter links toward the root. Multiple paths prevent bottlenecks.
              Standard topology for InfiniBand data center networks.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.allreduce, marginBottom: '8px' }}>Hierarchical All-Reduce</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Combines topologies: Ring within a node (NVLink), Tree across nodes (InfiniBand).
              Best of both worlds for large-scale training.
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'The Twist: Scale Matters')}
    </div>
  );

  const renderTwistPredict = () => {
    const predictions = [
      { id: 'same', text: 'The same topology works best at any scale' },
      { id: 'ring_always', text: 'Ring is always best since it\'s bandwidth-optimal' },
      { id: 'hybrid', text: 'Different scales need different topologies combined' },
      { id: 'mesh', text: 'Full mesh is the answer at any scale' },
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
          <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '8px' }}>
            The Twist: Topology Depends on Scale
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            8 GPUs in one machine vs 8000 GPUs across a data center - same approach?
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
              background: twistPrediction === 'hybrid' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
            }}>
              <p style={{ color: twistPrediction === 'hybrid' ? colors.success : colors.warning, fontWeight: 'bold' }}>
                {twistPrediction === 'hybrid' ? 'Correct!' : 'Not quite!'}
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                Modern systems use hierarchical approaches: NVLink ring within a node (900 GB/s),
                InfiniBand tree across nodes (400 Gb/s), different algorithms at each level.
                The optimal strategy changes with scale!
              </p>
            </div>
          )}
        </div>
        {renderBottomBar(!!twistPrediction, 'Explore Scale Effects')}
      </div>
    );
  };

  const renderTwistPlay = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>
          Scale-Dependent Topology Lab
        </h2>

        {renderVisualization()}

        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          borderRadius: '12px',
          padding: '16px',
          marginTop: '16px',
          border: `1px solid ${colors.warning}`
        }}>
          <h3 style={{ color: colors.warning, marginBottom: '8px' }}>Hierarchical Communication</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ color: colors.success, fontWeight: 'bold', marginBottom: '4px' }}>Intra-Node (NVLink)</div>
              <div style={{ color: colors.textMuted }}>8 GPUs, 900 GB/s</div>
              <div style={{ color: colors.textSecondary }}>Ring all-reduce</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ color: colors.tree, fontWeight: 'bold', marginBottom: '4px' }}>Inter-Node (InfiniBand)</div>
              <div style={{ color: colors.textMuted }}>1000s of nodes, 400 Gb/s</div>
              <div style={{ color: colors.textSecondary }}>Tree/Fat-tree</div>
            </div>
          </div>
        </div>

        {renderControls()}

        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginTop: '16px'
        }}>
          <h3 style={{ color: colors.accent, marginBottom: '8px' }}>Scaling Laws</h3>
          <ul style={{ color: colors.textSecondary, fontSize: '14px', paddingLeft: '20px', margin: 0, lineHeight: 1.8 }}>
            <li>Small scale (8 GPU): Ring is optimal</li>
            <li>Medium scale (64 GPU): Hierarchical ring + tree</li>
            <li>Large scale (1000+ GPU): Fat-tree + specialized algorithms</li>
            <li>Communication time scales with sqrt(N) with good topology</li>
          </ul>
        </div>
      </div>
      {renderBottomBar(true, 'Review the Twist')}
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '24px' }}>
          Topology Determines Training Speed at Scale
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '16px', border: `1px solid ${colors.error}` }}>
            <h3 style={{ color: colors.error, marginBottom: '8px' }}>The Challenge</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              With 1000 GPUs, naive all-reduce takes 999 steps. Training would be
              dominated by communication, not computation. Need smarter algorithms.
            </p>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '16px', border: `1px solid ${colors.success}` }}>
            <h3 style={{ color: colors.success, marginBottom: '8px' }}>Solutions</h3>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', paddingLeft: '20px', margin: 0, lineHeight: 1.8 }}>
              <li><strong>Gradient compression:</strong> Send less data</li>
              <li><strong>Overlap:</strong> Communicate while computing next layer</li>
              <li><strong>Hierarchical:</strong> Different algorithms at different scales</li>
              <li><strong>Async SGD:</strong> Don't wait for all workers</li>
            </ul>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '8px' }}>Key Insight</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              The best systems achieve 90%+ scaling efficiency even with thousands of GPUs
              by carefully matching topology to the physical network and using pipelined
              communication that overlaps with computation.
            </p>
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
                background: 'rgba(20, 184, 166, 0.1)',
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
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                {passed ? 'Trophy' : 'Book'}
              </div>
              <h2 style={{ color: passed ? colors.success : colors.warning, fontSize: '28px' }}>
                {score}/10 Correct
              </h2>
              <p style={{ color: colors.textSecondary }}>
                {passed ? 'Excellent! You understand interconnect topology.' : 'Review the material and try again.'}
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
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.ring})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: `0 0 40px ${colors.accentGlow}`,
        }}>
          <span style={{ fontSize: '48px' }}>Trophy</span>
        </div>

        <h1 style={{ color: colors.textPrimary, fontSize: '32px', marginBottom: '8px', textAlign: 'center' }}>
          Interconnect Topology Master!
        </h1>
        <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '32px' }}>
          You understand how thousands of GPUs work together
        </p>

        <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '100%' }}>
          <h3 style={{ color: colors.accent, marginBottom: '16px' }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 2, paddingLeft: '20px', margin: 0 }}>
            <li>Ring, Tree, Fat-Tree topologies</li>
            <li>All-reduce and gradient synchronization</li>
            <li>Bandwidth vs latency trade-offs</li>
            <li>Hierarchical communication strategies</li>
            <li>Scaling efficiency at different scales</li>
          </ul>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(20, 184, 166, 0.1)',
          borderRadius: '12px',
          maxWidth: '400px',
          width: '100%'
        }}>
          <p style={{ color: colors.accent, textAlign: 'center', margin: 0 }}>
            "At scale, the network is the computer."
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
    <div className="absolute inset-0 flex flex-col" style={{ background: colors.bgPrimary, color: colors.textPrimary }}>
      {/* Progress bar at top */}
      <div style={{ flexShrink: 0 }}>
        {renderProgressBar()}
      </div>

      {/* Main content - scrollable */}
      <div style={{ flex: '1 1 0%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {renderPhase()}
      </div>
    </div>
  );
};

export default InterconnectTopologyRenderer;
