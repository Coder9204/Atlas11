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
  // Q1: Core Concept - Cache Hierarchy (Easy)
  {
    scenario: "A modern CPU has multiple levels of cache: L1 (64KB), L2 (512KB), and L3 (32MB). Each level has different speed and size characteristics.",
    question: "Why is L1 cache faster than L2 cache?",
    options: [
      { id: 'closer', label: "L1 is physically closer to the CPU core and uses faster SRAM", correct: true },
      { id: 'bigger', label: "L1 is larger and can store more data" },
      { id: 'newer', label: "L1 uses newer technology than L2" },
      { id: 'dedicated', label: "L1 is only used by the operating system" },
    ],
    explanation: "L1 cache is fastest because it's physically closest to the CPU core (minimizing signal travel time) and uses the fastest (most expensive) SRAM. The trade-off is size - you can't have fast AND big memory due to physics constraints."
  },
  // Q2: Cache Hit/Miss Concepts (Medium)
  {
    scenario: "A program running on your computer requests data from memory. The CPU first checks L1 cache, then L2, then L3, and finally main RAM.",
    question: "What happens when the requested data is NOT found in any cache level?",
    options: [
      { id: 'error', label: "The program crashes with a memory error" },
      { id: 'wait', label: "The CPU stalls for ~100 cycles while fetching from RAM - this is a cache miss", correct: true },
      { id: 'skip', label: "The CPU skips that data and continues execution" },
      { id: 'swap', label: "The data is automatically moved to the fastest cache" },
    ],
    explanation: "A cache miss forces the CPU to fetch data from slower memory. RAM access takes ~100 CPU cycles compared to 1 cycle for L1. During this time, the CPU pipeline stalls, wasting computational potential. This is why cache hit rates are crucial for performance!"
  },
  // Q3: Temporal Locality (Medium)
  {
    scenario: "You're running a loop that processes the same variable 1000 times: for(i=0; i<1000; i++) { sum += value; }",
    question: "Why does this code benefit from temporal locality?",
    options: [
      { id: 'parallel', label: "The loop runs in parallel across multiple cores" },
      { id: 'reuse', label: "The variable 'value' stays in cache after first access and is reused", correct: true },
      { id: 'prefetch', label: "The CPU prefetches all 1000 iterations at once" },
      { id: 'compile', label: "The compiler optimizes away the loop entirely" },
    ],
    explanation: "Temporal locality means recently accessed data is likely to be accessed again soon. After the first access, 'value' is loaded into L1 cache and remains there for all 999 subsequent accesses - each taking only 1 cycle instead of 100!"
  },
  // Q4: Spatial Locality (Medium)
  {
    scenario: "A program iterates through an array sequentially: for(i=0; i<1000; i++) { process(array[i]); }. Cache lines are 64 bytes, and each array element is 8 bytes.",
    question: "How does spatial locality improve this code's performance?",
    options: [
      { id: 'predict', label: "The CPU predicts which elements will be accessed" },
      { id: 'cacheline', label: "Loading array[0] brings array[1-7] into cache for free via the cache line", correct: true },
      { id: 'compress', label: "The array is compressed to fit more data in cache" },
      { id: 'virtual', label: "Virtual memory maps the array to faster storage" },
    ],
    explanation: "Spatial locality means nearby memory addresses are often accessed together. When array[0] is loaded, the entire 64-byte cache line (8 elements) is fetched. The next 7 accesses are instant cache hits! This is why sequential array access is much faster than random access."
  },
  // Q5: Cache Levels Comparison (Medium-Hard)
  {
    scenario: "You're optimizing a database query. The working set (frequently accessed data) is 20MB. Your CPU has: L1=64KB, L2=512KB, L3=32MB, RAM=64GB.",
    question: "Which memory level will primarily serve this workload, and what's the performance implication?",
    options: [
      { id: 'l1', label: "L1 cache - fastest possible performance" },
      { id: 'l2', label: "L2 cache - good performance with 4-cycle latency" },
      { id: 'l3', label: "L3 cache - the 20MB fits in 32MB L3 with ~12 cycle latency", correct: true },
      { id: 'ram', label: "RAM - cache is too small for database workloads" },
    ],
    explanation: "The 20MB working set exceeds L1 (64KB) and L2 (512KB) but fits in L3 (32MB). L3 access at ~12 cycles is still 8x faster than RAM at ~100 cycles. Sizing your working set to fit in cache is a key optimization strategy!"
  },
  // Q6: Memory Latency Hierarchy (Hard)
  {
    scenario: "An AI inference server processes requests using a 7B parameter model (28GB). The server has an H100 GPU with 80GB HBM3 memory at 3.35 TB/s bandwidth.",
    question: "Why is this workload called 'memory-bound' rather than 'compute-bound'?",
    options: [
      { id: 'weights', label: "Each token requires reading ALL 28GB of weights, but weights are used only once - GPU waits for memory", correct: true },
      { id: 'slow', label: "The GPU is too slow to process the model" },
      { id: 'batch', label: "The batch size is too small for efficient computation" },
      { id: 'precision', label: "FP16 precision limits computational accuracy" },
    ],
    explanation: "LLM inference has terrible arithmetic intensity - each weight is loaded from memory, used for ONE multiply-add, then discarded. The GPU spends 90% of time waiting for memory transfers! This is why memory bandwidth (3.35 TB/s) matters more than TFLOPS for LLM inference."
  },
  // Q7: Virtual Memory Concepts (Medium)
  {
    scenario: "Your laptop has 16GB RAM but you're running applications that need 24GB total. The system uses an NVMe SSD for virtual memory (swap).",
    question: "What is the performance impact when the system swaps data between RAM and SSD?",
    options: [
      { id: 'seamless', label: "No impact - modern SSDs are as fast as RAM" },
      { id: 'thousand', label: "Severe slowdown - SSD access is ~1000x slower than RAM", correct: true },
      { id: 'double', label: "Minor impact - only 2x slower than RAM" },
      { id: 'crash', label: "The system crashes when RAM is exceeded" },
    ],
    explanation: "Even fast NVMe SSDs have ~100,000 cycle latency vs RAM's ~100 cycles - that's 1000x slower! When swapping occurs, the CPU stalls waiting for SSD I/O. This is why adding RAM is often the best upgrade for systems that frequently swap."
  },
  // Q8: Prefetching (Medium)
  {
    scenario: "A CPU's hardware prefetcher detects that your code is accessing array elements sequentially: array[0], array[1], array[2], etc.",
    question: "What does the prefetcher do to optimize this access pattern?",
    options: [
      { id: 'parallel', label: "It parallelizes the array processing across cores" },
      { id: 'load', label: "It loads array[3], array[4], etc. into cache BEFORE they're requested", correct: true },
      { id: 'compress', label: "It compresses the array to reduce memory usage" },
      { id: 'reorder', label: "It reorders array elements for faster access" },
    ],
    explanation: "Hardware prefetching predicts future memory accesses and loads data into cache before it's needed. For sequential patterns, the prefetcher stays ahead of the program, hiding memory latency. Random access patterns defeat prefetching - the CPU can't predict what's needed next."
  },
  // Q9: GPU Memory Architecture (Hard)
  {
    scenario: "NVIDIA's H100 uses HBM3 (High Bandwidth Memory) with 3.35 TB/s bandwidth, while consumer GPUs use GDDR6X with ~1 TB/s bandwidth.",
    question: "Why does the H100 use expensive HBM3 instead of cheaper GDDR6X?",
    options: [
      { id: 'capacity', label: "HBM3 has larger capacity than GDDR6X" },
      { id: 'power', label: "HBM3 uses less power than GDDR6X" },
      { id: 'bandwidth', label: "AI workloads are memory-bound - 3x bandwidth directly improves inference speed", correct: true },
      { id: 'latency', label: "HBM3 has lower latency than GDDR6X" },
    ],
    explanation: "For memory-bound AI workloads, memory bandwidth directly determines performance. HBM3's 3.35 TB/s vs GDDR6X's 1 TB/s means ~3x faster inference for large models. The cost premium is justified because the GPU would otherwise sit idle waiting for data."
  },
  // Q10: Synthesis - Memory Hierarchy Trade-offs (Expert)
  {
    scenario: "A computer architect is designing a new processor. They must choose between: (A) 128KB L1 cache with 2-cycle latency, or (B) 64KB L1 cache with 1-cycle latency.",
    question: "Why might they choose the smaller, faster option (B)?",
    options: [
      { id: 'cost', label: "Smaller cache is cheaper to manufacture" },
      { id: 'physics', label: "Larger cache = longer signal paths = higher latency; the speed benefit often outweighs size", correct: true },
      { id: 'power', label: "Smaller cache uses less power" },
      { id: 'simple', label: "Smaller cache is simpler to design" },
    ],
    explanation: "This is the fundamental physics trade-off! A larger cache requires longer wires for signals to travel, increasing latency. For L1, speed is critical - every instruction accesses L1. A 1-cycle L1 hit rate of 90% beats a 2-cycle hit rate of 95% in most workloads. Size is compensated by L2/L3."
  }
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
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(new Array(10).fill(null));
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
      const correctOption = TEST_QUESTIONS[index].options.find(o => o.correct);
      if (answer === correctOption?.id) return score + 1;
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
    const totalQuestions = TEST_QUESTIONS.length;

    if (testSubmitted) {
      const score = calculateTestScore();
      const passed = score >= 7;

      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
          <div style={{ flex: 1, padding: '24px', paddingBottom: '100px', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                margin: '0 auto 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                background: passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                border: `3px solid ${passed ? colors.success : colors.warning}`
              }}>
                {score === totalQuestions ? 'Trophy' : score >= 9 ? 'Star' : score >= 7 ? 'Check' : 'Book'}
              </div>
              <h2 style={{ color: passed ? colors.success : colors.warning, fontSize: '28px', marginBottom: '8px' }}>
                {score}/{totalQuestions} Correct
              </h2>
              <p style={{ color: colors.textSecondary, marginBottom: '16px' }}>
                {score === totalQuestions ? "Perfect! You've mastered memory hierarchy!" :
                 score >= 9 ? 'Excellent! You deeply understand memory concepts.' :
                 score >= 7 ? 'Great job! You understand the key concepts.' :
                 'Keep exploring - memory hierarchy takes practice!'}
              </p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
                <button
                  onClick={() => {
                    setCurrentTestIndex(0);
                    setTestAnswers(new Array(10).fill(null));
                    setTestSubmitted(false);
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: colors.bgCard,
                    color: colors.textSecondary,
                    border: '1px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    zIndex: 10,
                    position: 'relative',
                  }}
                >
                  Retake Test
                </button>
                <button
                  onClick={() => goNext()}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: passed ? colors.success : colors.warning,
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    zIndex: 10,
                    position: 'relative',
                  }}
                >
                  {passed ? 'Claim Mastery' : 'Review Lesson'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', color: colors.textMuted }}>
                Question-by-Question Review
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {TEST_QUESTIONS.map((q, i) => {
                const correctOption = q.options.find(o => o.correct);
                const correctId = correctOption?.id;
                const userAnswer = testAnswers[i];
                const userOption = q.options.find(o => o.id === userAnswer);
                const isCorrect = userAnswer === correctId;

                return (
                  <div key={i} style={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: colors.bgCard,
                    border: `2px solid ${isCorrect ? colors.success : colors.error}40`
                  }}>
                    <div style={{
                      padding: '16px',
                      background: isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 700,
                          background: isCorrect ? colors.success : colors.error,
                          color: 'white'
                        }}>
                          {isCorrect ? 'Y' : 'X'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Question {i + 1}</p>
                          <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>{q.question}</p>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{
                        padding: '12px',
                        borderRadius: '12px',
                        background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${isCorrect ? colors.success : colors.error}30`
                      }}>
                        <p style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: '4px',
                          color: isCorrect ? colors.success : colors.error
                        }}>
                          {isCorrect ? 'Your Answer (Correct!)' : 'Your Answer'}
                        </p>
                        <p style={{ fontSize: '14px', color: colors.textPrimary, margin: 0 }}>
                          {userOption?.label || 'No answer selected'}
                        </p>
                      </div>

                      {!isCorrect && (
                        <div style={{
                          padding: '12px',
                          borderRadius: '12px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: `1px solid ${colors.success}30`
                        }}>
                          <p style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            marginBottom: '4px',
                            color: colors.success
                          }}>Correct Answer</p>
                          <p style={{ fontSize: '14px', color: colors.textPrimary, margin: 0 }}>
                            {correctOption?.label}
                          </p>
                        </div>
                      )}

                      <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(249, 115, 22, 0.1)' }}>
                        <p style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: '4px',
                          color: colors.accent
                        }}>Why?</p>
                        <p style={{ fontSize: '12px', lineHeight: 1.5, color: colors.textSecondary, margin: 0 }}>
                          {q.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{
              marginTop: '24px',
              padding: '16px',
              borderRadius: '16px',
              textAlign: 'center',
              background: colors.bgCard,
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <p style={{ fontSize: '14px', marginBottom: '12px', color: colors.textSecondary }}>
                {passed ? 'Want to improve your score?' : 'Review the explanations above and try again!'}
              </p>
              <button
                onClick={() => {
                  setCurrentTestIndex(0);
                  setTestAnswers(new Array(10).fill(null));
                  setTestSubmitted(false);
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '14px',
                  background: colors.accent,
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  zIndex: 10,
                  position: 'relative',
                }}
              >
                Retake Test
              </button>
            </div>
          </div>
        </div>
      );
    }

    const currentQ = TEST_QUESTIONS[currentTestIndex];

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '100px', overflowY: 'auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', color: colors.warning }}>
              Step 9 - Knowledge Test
            </p>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 900, marginBottom: '16px' }}>
              Question {currentTestIndex + 1} of {totalQuestions}
            </h2>
            <div style={{ display: 'flex', gap: '4px' }}>
              {Array.from({ length: totalQuestions }, (_, i) => (
                <div
                  key={i}
                  style={{
                    height: '8px',
                    flex: 1,
                    borderRadius: '9999px',
                    background: i === currentTestIndex ? colors.warning : i < currentTestIndex ? colors.success : 'rgba(255,255,255,0.1)'
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{
            padding: '20px',
            borderRadius: '16px',
            marginBottom: '24px',
            background: 'rgba(249, 115, 22, 0.15)',
            border: `1px solid ${colors.accent}30`
          }}>
            <p style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '8px',
              color: colors.accent
            }}>Scenario</p>
            <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0 }}>{currentQ.scenario}</p>
          </div>

          <p style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: colors.textPrimary }}>
            {currentQ.question}
          </p>

          <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
            {currentQ.options.map((opt, i) => (
              <button
                key={opt.id}
                onClick={() => {
                  const newAnswers = [...testAnswers];
                  newAnswers[currentTestIndex] = opt.id;
                  setTestAnswers(newAnswers);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px',
                  borderRadius: '16px',
                  textAlign: 'left',
                  background: testAnswers[currentTestIndex] === opt.id ? 'rgba(245, 158, 11, 0.2)' : colors.bgCard,
                  border: `2px solid ${testAnswers[currentTestIndex] === opt.id ? colors.warning : 'rgba(255,255,255,0.1)'}`,
                  cursor: 'pointer',
                  zIndex: 10,
                  position: 'relative',
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: testAnswers[currentTestIndex] === opt.id ? colors.warning : 'rgba(255,255,255,0.1)'
                }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: testAnswers[currentTestIndex] === opt.id ? colors.textPrimary : colors.textMuted
                  }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                </div>
                <p style={{
                  fontSize: '14px',
                  color: testAnswers[currentTestIndex] === opt.id ? colors.textPrimary : colors.textSecondary,
                  margin: 0
                }}>
                  {opt.label}
                </p>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
            <button
              onClick={() => setCurrentTestIndex(Math.max(0, currentTestIndex - 1))}
              disabled={currentTestIndex === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: currentTestIndex === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestIndex === 0 ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                zIndex: 10,
                position: 'relative',
              }}
            >
              Previous
            </button>
            {currentTestIndex < totalQuestions - 1 ? (
              <button
                onClick={() => setCurrentTestIndex(currentTestIndex + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 700,
                  zIndex: 10,
                  position: 'relative',
                }}
              >
                Question {currentTestIndex + 2}
              </button>
            ) : (
              <button
                onClick={() => setTestSubmitted(true)}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  zIndex: 10,
                  position: 'relative',
                }}
              >
                Submit Test
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
