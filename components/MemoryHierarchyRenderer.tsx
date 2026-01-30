'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// Types
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface MemoryHierarchyRendererProps {
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
  twist_play: 'Deep Dive',
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
  accent: '#f97316',
  accentGlow: 'rgba(249, 115, 22, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  l1: '#ef4444',
  l2: '#f97316',
  l3: '#eab308',
  ram: '#22c55e',
  disk: '#3b82f6',
};

// Memory hierarchy specs
const MEMORY_SPECS = {
  'L1 Cache': { latency: 1, size: 0.000064, bandwidth: 4000, color: colors.l1 }, // 64KB, ~1 cycle
  'L2 Cache': { latency: 4, size: 0.000512, bandwidth: 2000, color: colors.l2 }, // 512KB, ~4 cycles
  'L3 Cache': { latency: 12, size: 0.032, bandwidth: 500, color: colors.l3 }, // 32MB, ~12 cycles
  'Main RAM': { latency: 100, size: 64, bandwidth: 50, color: colors.ram }, // 64GB, ~100 cycles
  'SSD/NVMe': { latency: 100000, size: 2000, bandwidth: 5, color: colors.disk }, // 2TB, ~100k cycles
};

const TEST_QUESTIONS = [
  { text: 'L1 cache is faster but smaller than L2 cache.', correct: true },
  { text: 'AI models easily fit in cache during inference.', correct: false },
  { text: 'Cache misses cause the CPU/GPU to wait for slower memory.', correct: true },
  { text: 'Main memory (RAM) is about 100x slower than L1 cache.', correct: true },
  { text: 'Modern CPUs have more cache than RAM.', correct: false },
  { text: 'Temporal locality means recently accessed data is likely to be accessed again.', correct: true },
  { text: 'Spatial locality means nearby memory addresses are often accessed together.', correct: true },
  { text: 'GPU memory bandwidth is typically lower than CPU memory bandwidth.', correct: false },
  { text: 'Prefetching loads data into cache before it is needed.', correct: true },
  { text: 'A cache hit is faster than a cache miss.', correct: true },
];

const TRANSFER_APPS = [
  {
    title: 'GPU HBM vs GDDR',
    description: 'High Bandwidth Memory (HBM) stacks memory chips vertically for 3-5x bandwidth vs GDDR. H100 uses HBM3 at 3.35 TB/s!',
    insight: 'H100: 3.35 TB/s HBM3',
  },
  {
    title: 'LLM Inference Bottleneck',
    description: 'Large language models are "memory-bound" - the GPU waits for weights more than it computes. This is why quantization helps so much.',
    insight: 'LLM: 90% time waiting for memory',
  },
  {
    title: 'Database Query Performance',
    description: 'Database engines are designed around memory hierarchy. Indexes fit in cache, data pages in RAM, cold data on disk.',
    insight: 'Redis: All data in RAM',
  },
  {
    title: 'Gaming Texture Streaming',
    description: 'Modern games stream textures from SSD to RAM to VRAM as you move through the world. Fast SSDs enable open-world games.',
    insight: 'PS5 SSD: 5.5 GB/s streaming',
  },
];

const MemoryHierarchyRenderer: React.FC<MemoryHierarchyRendererProps> = ({
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
  const [workingSetSize, setWorkingSetSize] = useState(0.01); // GB
  const [accessPattern, setAccessPattern] = useState<'sequential' | 'random' | 'strided'>('sequential');
  const [showCacheHits, setShowCacheHits] = useState(true);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [memoryAccesses, setMemoryAccesses] = useState<{ level: string; hit: boolean }[]>([]);

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
      setAnimationFrame(f => (f + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Simulate memory accesses
  useEffect(() => {
    const interval = setInterval(() => {
      // Determine which cache level serves this access
      const hitProbabilities = {
        sequential: { L1: 0.95, L2: 0.98, L3: 0.99 },
        random: { L1: 0.3, L2: 0.5, L3: 0.7 },
        strided: { L1: 0.6, L2: 0.8, L3: 0.9 },
      };

      const probs = hitProbabilities[accessPattern];
      const rand = Math.random();
      let level: string;
      let hit: boolean;

      if (workingSetSize < 0.000064) {
        level = 'L1 Cache';
        hit = rand < probs.L1;
      } else if (workingSetSize < 0.000512) {
        level = 'L2 Cache';
        hit = rand < probs.L2;
      } else if (workingSetSize < 0.032) {
        level = 'L3 Cache';
        hit = rand < probs.L3;
      } else if (workingSetSize < 64) {
        level = 'Main RAM';
        hit = true;
      } else {
        level = 'SSD/NVMe';
        hit = true;
      }

      setMemoryAccesses(prev => [...prev.slice(-20), { level, hit }]);
    }, 200);

    return () => clearInterval(interval);
  }, [workingSetSize, accessPattern]);

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

  // Calculate effective latency based on working set size
  const getActiveLevel = () => {
    if (workingSetSize < 0.000064) return 'L1 Cache';
    if (workingSetSize < 0.000512) return 'L2 Cache';
    if (workingSetSize < 0.032) return 'L3 Cache';
    if (workingSetSize < 64) return 'Main RAM';
    return 'SSD/NVMe';
  };

  const activeLevel = getActiveLevel();
  const effectiveLatency = MEMORY_SPECS[activeLevel as keyof typeof MEMORY_SPECS].latency;
  const effectiveBandwidth = MEMORY_SPECS[activeLevel as keyof typeof MEMORY_SPECS].bandwidth;

  const calculateTestScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      if (answer === TEST_QUESTIONS[index].correct) return score + 1;
      return score;
    }, 0);
  };

  const renderVisualization = () => {
    const width = 400;
    const height = 350;

    const levels = Object.entries(MEMORY_SPECS);
    const pyramidHeight = 250;
    const pyramidTop = 30;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: '#1e293b', borderRadius: '12px' }}
      >
        {/* Memory hierarchy pyramid */}
        {levels.map(([name, spec], i) => {
          const levelHeight = pyramidHeight / levels.length;
          const y = pyramidTop + i * levelHeight;
          const widthRatio = 0.3 + i * 0.15;
          const rectWidth = width * widthRatio;
          const x = (width - rectWidth) / 2;

          const isActive = name === activeLevel;

          return (
            <g key={name}>
              {/* Level rectangle */}
              <rect
                x={x}
                y={y}
                width={rectWidth}
                height={levelHeight - 4}
                rx={6}
                fill={isActive ? spec.color : `${spec.color}44`}
                stroke={isActive ? 'white' : spec.color}
                strokeWidth={isActive ? 3 : 1}
              />

              {/* Level label */}
              <text
                x={width / 2}
                y={y + levelHeight / 2 - 5}
                textAnchor="middle"
                fill={colors.textPrimary}
                fontSize={11}
                fontWeight={isActive ? 'bold' : 'normal'}
              >
                {name}
              </text>

              {/* Size and latency */}
              <text
                x={width / 2}
                y={y + levelHeight / 2 + 10}
                textAnchor="middle"
                fill={colors.textMuted}
                fontSize={9}
              >
                {spec.size >= 1 ? `${spec.size} GB` : spec.size >= 0.001 ? `${spec.size * 1000} MB` : `${spec.size * 1000000} KB`}
                {' | '}
                {spec.latency >= 1000 ? `${spec.latency / 1000}k` : spec.latency} cycles
              </text>

              {/* Data flow animation when active */}
              {isActive && (
                <circle
                  cx={x + (animationFrame / 100) * rectWidth}
                  cy={y + levelHeight / 2}
                  r={4}
                  fill="white"
                />
              )}
            </g>
          );
        })}

        {/* Working set indicator */}
        <g transform={`translate(20, ${pyramidTop})`}>
          <text x={0} y={0} fill={colors.textMuted} fontSize={10}>Working Set</text>
          <text x={0} y={15} fill={colors.accent} fontSize={12} fontWeight="bold">
            {workingSetSize >= 1 ? `${workingSetSize.toFixed(1)} GB` : workingSetSize >= 0.001 ? `${(workingSetSize * 1000).toFixed(1)} MB` : `${(workingSetSize * 1000000).toFixed(0)} KB`}
          </text>
        </g>

        {/* Stats panel */}
        <g transform={`translate(${width - 120}, ${pyramidTop})`}>
          <text x={0} y={0} fill={colors.textMuted} fontSize={10}>Effective Latency</text>
          <text x={0} y={15} fill={effectiveLatency > 50 ? colors.error : colors.success} fontSize={12} fontWeight="bold">
            {effectiveLatency >= 1000 ? `${effectiveLatency / 1000}k` : effectiveLatency} cycles
          </text>
          <text x={0} y={35} fill={colors.textMuted} fontSize={10}>Bandwidth</text>
          <text x={0} y={50} fill={colors.textSecondary} fontSize={12} fontWeight="bold">
            {effectiveBandwidth} GB/s
          </text>
        </g>

        {/* Access pattern indicator */}
        <g transform={`translate(20, ${height - 40})`}>
          <text x={0} y={0} fill={colors.textMuted} fontSize={10}>Access Pattern: {accessPattern}</text>
          <text x={0} y={15} fill={colors.textSecondary} fontSize={9}>
            {accessPattern === 'sequential' ? 'Good cache utilization' : accessPattern === 'random' ? 'Poor cache utilization' : 'Moderate cache utilization'}
          </text>
        </g>

        {/* Recent accesses visualization */}
        {showCacheHits && (
          <g transform={`translate(${width - 180}, ${height - 40})`}>
            <text x={0} y={0} fill={colors.textMuted} fontSize={10}>Recent Accesses</text>
            {memoryAccesses.slice(-10).map((access, i) => (
              <circle
                key={i}
                cx={10 + i * 16}
                cy={20}
                r={6}
                fill={access.hit ? colors.success : colors.error}
              />
            ))}
          </g>
        )}
      </svg>
    );
  };

  const renderControls = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Working Set Size: {workingSetSize >= 1 ? `${workingSetSize.toFixed(1)} GB` : workingSetSize >= 0.001 ? `${(workingSetSize * 1000).toFixed(1)} MB` : `${(workingSetSize * 1000000).toFixed(0)} KB`}
        </label>
        <input
          type="range"
          min={-5}
          max={3}
          step={0.1}
          value={Math.log10(workingSetSize)}
          onChange={(e) => setWorkingSetSize(Math.pow(10, parseFloat(e.target.value)))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          <span>10 KB</span>
          <span>1 MB</span>
          <span>100 MB</span>
          <span>1 TB</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Access Pattern
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['sequential', 'strided', 'random'] as const).map(pattern => (
            <button
              key={pattern}
              onClick={() => setAccessPattern(pattern)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: accessPattern === pattern ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: accessPattern === pattern ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontSize: '12px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {pattern}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: colors.bgCard,
        borderRadius: '12px',
        padding: '16px',
      }}>
        <h4 style={{ color: colors.accent, marginTop: 0, marginBottom: '12px' }}>Current Level: {activeLevel}</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <div style={{ color: colors.textMuted, fontSize: '11px' }}>Latency</div>
            <div style={{ color: effectiveLatency > 50 ? colors.error : colors.success, fontSize: '18px', fontWeight: 'bold' }}>
              {effectiveLatency >= 1000 ? `${effectiveLatency / 1000}k` : effectiveLatency} cycles
            </div>
          </div>
          <div>
            <div style={{ color: colors.textMuted, fontSize: '11px' }}>Bandwidth</div>
            <div style={{ color: colors.textSecondary, fontSize: '18px', fontWeight: 'bold' }}>
              {effectiveBandwidth} GB/s
            </div>
          </div>
        </div>
      </div>
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
            background: canProceed ? `linear-gradient(135deg, ${colors.accent} 0%, #ea580c 100%)` : 'rgba(30, 41, 59, 0.9)',
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
            background: 'rgba(249, 115, 22, 0.1)',
            borderRadius: '20px',
            marginBottom: '16px'
          }}>
            <span style={{ color: colors.accent, fontSize: '14px', fontWeight: 'bold' }}>AI COMPUTE PHYSICS</span>
          </div>
          <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '8px' }}>
            Memory Hierarchy Latency
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px' }}>
            Why is there L1, L2, L3 cache AND main memory?
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
            CPUs run at 4-5 GHz, but RAM only runs at 3200 MHz. If the CPU waited for RAM
            every time it needed data, it would spend 99% of its time doing nothing.
          </p>
          <div style={{
            background: 'rgba(249, 115, 22, 0.1)',
            borderLeft: `3px solid ${colors.accent}`,
            padding: '12px',
            borderRadius: '0 8px 8px 0'
          }}>
            <p style={{ color: colors.accent, fontSize: '14px', margin: 0 }}>
              L1: 1 cycle | L2: 4 cycles | L3: 12 cycles | RAM: 100+ cycles
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
              Each level trades speed for capacity
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'Make a Prediction')}
    </div>
  );

  const renderPredict = () => {
    const predictions = [
      { id: 'single', text: 'One large, fast memory would be simpler and better' },
      { id: 'cost', text: 'Multiple levels exist only to reduce manufacturing cost' },
      { id: 'physics', text: 'Physics requires a speed vs. size trade-off at each level' },
      { id: 'legacy', text: 'It\'s an outdated design from older computers' },
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
          <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>
            Make Your Prediction
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Why do computers have multiple memory levels instead of one?
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
                  background: prediction === p.id ? 'rgba(249, 115, 22, 0.2)' : colors.bgCard,
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
              background: prediction === 'physics' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
              borderLeft: `4px solid ${prediction === 'physics' ? colors.success : colors.warning}`
            }}>
              <p style={{ color: prediction === 'physics' ? colors.success : colors.warning, fontWeight: 'bold' }}>
                {prediction === 'physics' ? 'Correct!' : 'Not quite!'}
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                Faster memory requires more transistors per bit and shorter physical distances.
                You literally cannot build 64GB of L1-speed memory - the signals couldn't travel
                fast enough. The hierarchy is a fundamental physics constraint, not a design choice.
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
          Memory Hierarchy Lab
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
            <li>Small working sets fit in cache = fast (1-12 cycles)</li>
            <li>Large working sets spill to RAM = 100x slower</li>
            <li>Sequential access has better cache hit rates</li>
            <li>Random access causes many cache misses</li>
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
          Understanding Memory Hierarchy
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.l1, marginBottom: '8px' }}>Temporal Locality</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Data accessed recently is likely to be accessed again soon.
              Loops accessing the same variables benefit from cache.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.l2, marginBottom: '8px' }}>Spatial Locality</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Data near recently accessed data is likely to be accessed.
              Arrays processed sequentially benefit from cache lines.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.l3, marginBottom: '8px' }}>Cache Lines</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Data is loaded in 64-byte chunks (cache lines). Accessing one byte
              loads 63 neighbors for free - great for sequential access!
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.ram, marginBottom: '8px' }}>Prefetching</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Hardware detects access patterns and loads data before needed.
              Predictable patterns (sequential, strided) enable effective prefetching.
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'The Twist: AI Workloads')}
    </div>
  );

  const renderTwistPredict = () => {
    const predictions = [
      { id: 'fits', text: 'AI models fit nicely in cache during inference' },
      { id: 'memory_bound', text: 'AI workloads are often memory-bound, not compute-bound' },
      { id: 'compute_bound', text: 'GPUs have so much cache that memory isn\'t a bottleneck' },
      { id: 'irrelevant', text: 'Memory hierarchy doesn\'t matter for AI' },
    ];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
          <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '8px' }}>
            The Twist: AI Workloads Don't Fit!
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            A 7B parameter model is 28GB. L3 cache is only 32MB. What happens?
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
              background: twistPrediction === 'memory_bound' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
            }}>
              <p style={{ color: twistPrediction === 'memory_bound' ? colors.success : colors.warning, fontWeight: 'bold' }}>
                {twistPrediction === 'memory_bound' ? 'Correct!' : 'Not quite!'}
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                Large AI models don't fit in cache. Every forward pass streams weights from memory.
                GPUs spend most of their time waiting for data, not computing. This is why
                memory bandwidth (not FLOPS) often determines AI inference speed.
              </p>
            </div>
          )}
        </div>
        {renderBottomBar(!!twistPrediction, 'Explore AI Memory Patterns')}
      </div>
    );
  };

  const renderTwistPlay = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', paddingBottom: '100px' }}>
        <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>
          AI Memory Access Lab
        </h2>

        {renderVisualization()}

        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          borderRadius: '12px',
          padding: '16px',
          marginTop: '16px',
          border: `1px solid ${colors.warning}`
        }}>
          <h3 style={{ color: colors.warning, marginBottom: '8px' }}>Why AI is Memory-Bound</h3>
          <ul style={{ color: colors.textSecondary, fontSize: '14px', paddingLeft: '20px', margin: 0, lineHeight: 1.8 }}>
            <li>7B model = 28GB weights, each used ONCE per token</li>
            <li>No temporal locality - weights rarely reused</li>
            <li>Streaming pattern = memory bandwidth is the limit</li>
            <li>H100 has 80GB HBM3 @ 3.35 TB/s for this reason</li>
          </ul>
        </div>

        {renderControls()}

        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginTop: '16px'
        }}>
          <h3 style={{ color: colors.success, marginBottom: '8px' }}>Solutions</h3>
          <ul style={{ color: colors.textSecondary, fontSize: '14px', paddingLeft: '20px', margin: 0, lineHeight: 1.8 }}>
            <li><strong>Quantization:</strong> 4-bit weights = 4x less bandwidth needed</li>
            <li><strong>Batching:</strong> Reuse weights across multiple inputs</li>
            <li><strong>KV Cache:</strong> Store attention results in faster memory</li>
            <li><strong>Speculative Decoding:</strong> Overlap memory access with computation</li>
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
          Memory Bandwidth is the AI Bottleneck
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '16px', border: `1px solid ${colors.error}` }}>
            <h3 style={{ color: colors.error, marginBottom: '8px' }}>The Problem</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              LLM inference is fundamentally memory-bound. Each token requires reading
              ALL model weights from memory. A 70B model at FP16 = 140GB read per token!
            </p>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '16px', border: `1px solid ${colors.success}` }}>
            <h3 style={{ color: colors.success, marginBottom: '8px' }}>Arithmetic Intensity</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              FLOPS per byte loaded = Arithmetic Intensity. Higher is better.
              LLMs at batch=1: ~1 FLOP/byte. Matrix multiply with large batches: ~200 FLOPS/byte.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '8px' }}>Hardware Evolution</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              GPUs evolved from gaming (compute-bound) to AI (memory-bound).
              Modern AI chips prioritize HBM bandwidth over raw FLOPS.
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
                background: 'rgba(249, 115, 22, 0.1)',
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
                {passed ? 'Excellent! You understand memory hierarchy.' : 'Review the material and try again.'}
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
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.l1})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: `0 0 40px ${colors.accentGlow}`,
        }}>
          <span style={{ fontSize: '48px' }}>Trophy</span>
        </div>

        <h1 style={{ color: colors.textPrimary, fontSize: '32px', marginBottom: '8px', textAlign: 'center' }}>
          Memory Hierarchy Master!
        </h1>
        <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '32px' }}>
          You understand why fast and big memory can't coexist
        </p>

        <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '100%' }}>
          <h3 style={{ color: colors.accent, marginBottom: '16px' }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 2, paddingLeft: '20px', margin: 0 }}>
            <li>Speed vs capacity trade-off at each level</li>
            <li>Cache hits vs misses and their impact</li>
            <li>Temporal and spatial locality</li>
            <li>AI workloads are memory-bound</li>
            <li>Bandwidth determines LLM inference speed</li>
          </ul>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(249, 115, 22, 0.1)',
          borderRadius: '12px',
          maxWidth: '400px',
          width: '100%'
        }}>
          <p style={{ color: colors.accent, textAlign: 'center', margin: 0 }}>
            "The memory wall is the defining challenge of modern computing."
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

export default MemoryHierarchyRenderer;
