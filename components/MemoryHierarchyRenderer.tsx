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

// Test questions array - 10 scenario-based multiple choice questions covering memory hierarchy topics
const testQuestions = [
  // Q1: Core concept - why memory hierarchy exists (Easy)
  {
    scenario: "You're building a computer and wondering why manufacturers don't just use the fastest memory (SRAM) for everything instead of having L1, L2, L3 cache, RAM, and storage.",
    question: "Why does the memory hierarchy exist with multiple levels of progressively slower but larger storage?",
    options: [
      { id: 'a', label: "It's a legacy design from older computers that hasn't been updated" },
      { id: 'b', label: "Fast memory (SRAM) is expensive and physically cannot scale to large sizes while maintaining speed", correct: true },
      { id: 'c', label: "Software requires different memory types to function properly" },
      { id: 'd', label: "It's purely a cost-cutting measure by manufacturers" },
    ],
    explanation: "The memory hierarchy exists because of fundamental physics constraints. Fast memory like SRAM requires 6 transistors per bit and must be physically close to the CPU to minimize signal travel time. You literally cannot build 64GB of L1-speed memory - the signals couldn't travel fast enough across that distance. The hierarchy trades off speed for capacity at each level, exploiting the principle of locality to keep frequently-used data close to the CPU."
  },
  // Q2: Cache hit vs miss (Easy-Medium)
  {
    scenario: "A programmer is debugging a performance issue. Their profiler shows the application has a 70% L1 cache hit rate, 20% L2 hit rate, 8% L3 hit rate, and 2% RAM access rate.",
    question: "What happens during the 30% of accesses that miss the L1 cache?",
    options: [
      { id: 'a', label: "The program crashes and must be restarted" },
      { id: 'b', label: "The CPU checks L2, then L3, then RAM, with increasing latency at each level", correct: true },
      { id: 'c', label: "The operating system is notified to handle the missing data" },
      { id: 'd', label: "The data is regenerated from scratch by the CPU" },
    ],
    explanation: "When data isn't found in L1 cache (a cache miss), the CPU doesn't crash - it simply checks the next level. L2 takes ~4 cycles, L3 takes ~12 cycles, and RAM takes ~100 cycles. The CPU pipeline may stall during this time, which is why high cache hit rates are critical for performance. The 70% L1 hit rate means most accesses are fast (1 cycle), but the 2% that go all the way to RAM cause significant delays."
  },
  // Q3: L1/L2/L3 cache differences (Medium)
  {
    scenario: "An engineer is analyzing CPU specifications and notices: L1 cache is 64KB with 1-cycle latency, L2 is 512KB with 4-cycle latency, and L3 is 32MB with 12-cycle latency. L1 is split into instruction and data caches, while L3 is shared across all cores.",
    question: "Why is L1 cache per-core and split, while L3 is larger and shared across cores?",
    options: [
      { id: 'a', label: "L1 must be extremely fast for each core's critical path; L3 trades speed for capacity and sharing efficiency", correct: true },
      { id: 'b', label: "L1 is older technology that couldn't be shared" },
      { id: 'c', label: "L3 is shared only to reduce manufacturing costs" },
      { id: 'd', label: "Each core needs different instructions, but data can be shared" },
    ],
    explanation: "L1 cache is per-core and split (instruction/data) because it sits in the critical path of every CPU cycle - it must be as fast as possible. Being small and close to each core enables 1-cycle access. L3 is shared because it acts as a 'last line of defense' before slow RAM, benefiting from pooled capacity across cores. A core that doesn't need L3 space leaves more for others. The 12-cycle latency is acceptable because L1/L2 handle most accesses."
  },
  // Q4: Spatial and temporal locality (Medium)
  {
    scenario: "A data scientist is processing a large dataset. Version A iterates through a 2D array row-by-row (row-major order), while Version B iterates column-by-column. Both process the same data, but Version A runs 10x faster.",
    question: "Why does row-major iteration significantly outperform column-major iteration?",
    options: [
      { id: 'a', label: "Row-major order uses less memory overall" },
      { id: 'b', label: "The CPU can only process data in row-major format" },
      { id: 'c', label: "Row-major accesses consecutive memory addresses, exploiting spatial locality and cache lines", correct: true },
      { id: 'd', label: "Column-major order causes the CPU to overheat" },
    ],
    explanation: "Arrays are stored in contiguous memory in row-major order (in C/Python). When you access array[0][0], the CPU loads an entire 64-byte cache line containing array[0][0] through array[0][7] (assuming 8-byte elements). Row-major iteration gets 7 'free' cache hits per cache line load. Column-major iteration jumps to different rows, missing the cache every time and wasting the prefetched data. This is spatial locality in action - nearby memory addresses are loaded together."
  },
  // Q5: Cache line size impact (Medium-Hard)
  {
    scenario: "A game developer has two data structures: Structure A has position (x,y,z) and velocity (vx,vy,vz) interleaved for each object (48 bytes per object). Structure B separates all positions in one array and all velocities in another. The physics update only needs positions.",
    question: "Why might Structure B (separated arrays) perform better for position-only updates?",
    options: [
      { id: 'a', label: "Separated arrays use less total memory" },
      { id: 'b', label: "The compiler can better optimize separated arrays" },
      { id: 'c', label: "Each 64-byte cache line contains more useful position data, reducing memory bandwidth waste", correct: true },
      { id: 'd', label: "Structure A would cause cache coherency issues" },
    ],
    explanation: "With Structure A, each 64-byte cache line holds only ~1.3 objects (48 bytes each), and half of that (velocity) is unused during position-only updates. With Structure B, each cache line holds ~5 positions (12 bytes each for x,y,z), and every byte is useful. This is called 'data-oriented design' - organizing data for how it's accessed rather than how it's conceptually grouped. It can provide 2-4x speedups in cache-sensitive applications like games and simulations."
  },
  // Q6: Write-through vs write-back (Hard)
  {
    scenario: "A systems architect is choosing between write-through cache (writes go to cache AND memory immediately) and write-back cache (writes go only to cache, memory updated later when cache line is evicted) for a real-time trading system.",
    question: "What is the key trade-off between write-through and write-back caching strategies?",
    options: [
      { id: 'a', label: "Write-through is faster but uses more power" },
      { id: 'b', label: "Write-back offers better performance but risks data loss on power failure and adds coherency complexity", correct: true },
      { id: 'c', label: "Write-through is only used in older systems" },
      { id: 'd', label: "Write-back requires special memory chips to function" },
    ],
    explanation: "Write-through guarantees data consistency - every write reaches memory immediately, so power loss won't lose cached writes. But it's slower because every write waits for slow memory. Write-back is faster because writes complete at cache speed, and multiple writes to the same location coalesce before reaching memory. However, dirty cache lines (modified but not yet written to memory) can be lost on power failure, and multi-core systems need complex coherency protocols (like MESI) to track which caches have the latest data."
  },
  // Q7: Cache coherency in multicore (Hard)
  {
    scenario: "A parallel computing application has 8 threads on 8 cores, all frequently reading and writing a shared counter variable. Performance is 10x slower than expected despite the parallelism.",
    question: "What cache phenomenon is likely causing this severe performance degradation?",
    options: [
      { id: 'a', label: "The counter variable is too small for the cache to store" },
      { id: 'b', label: "False sharing or true sharing is causing constant cache line invalidations across cores", correct: true },
      { id: 'c', label: "The CPU is automatically serializing access to prevent errors" },
      { id: 'd', label: "8 cores cannot physically access memory simultaneously" },
    ],
    explanation: "This is cache thrashing due to coherency traffic. When Core 1 writes to the counter, the MESI protocol must invalidate that cache line in all other cores' caches. Each of the 8 cores constantly invalidates the others' copies, forcing expensive cache misses. Even if cores accessed different variables, if those variables share a cache line (false sharing), the same invalidation storm occurs. Solutions include padding variables to separate cache lines, using thread-local counters that are periodically merged, or atomic operations designed to minimize coherency traffic."
  },
  // Q8: TLB and virtual memory (Hard)
  {
    scenario: "A database administrator notices that queries on a 500GB dataset perform well initially but slow down dramatically when accessing rarely-used tables. The system has 64GB RAM and the TLB can cache 1536 page table entries.",
    question: "How might TLB (Translation Lookaside Buffer) misses contribute to this slowdown?",
    options: [
      { id: 'a', label: "The TLB can only store data, not addresses" },
      { id: 'b', label: "TLB misses require expensive page table walks through memory, adding latency to every memory access in cold regions", correct: true },
      { id: 'c', label: "The TLB automatically compresses data that doesn't fit" },
      { id: 'd', label: "TLB misses only affect write operations, not reads" },
    ],
    explanation: "The TLB caches virtual-to-physical address translations. With 4KB pages and 1536 entries, the TLB covers only ~6MB of address space. Frequently-accessed 'hot' data keeps its translations cached, but accessing cold tables causes TLB misses. Each miss requires a page table walk - potentially 4-5 memory accesses to traverse the multi-level page table. This adds 400-500 cycles on top of the actual data access. Using huge pages (2MB or 1GB) dramatically increases TLB coverage, which is why databases often enable them."
  },
  // Q9: Prefetching strategies (Hard)
  {
    scenario: "A machine learning engineer is optimizing matrix multiplication. Version A accesses matrix elements sequentially, achieving 95% of theoretical memory bandwidth. Version B accesses elements based on a hash function, achieving only 15% bandwidth utilization despite the same total accesses.",
    question: "Why does the hash-based access pattern perform so much worse?",
    options: [
      { id: 'a', label: "Hash functions are computationally expensive" },
      { id: 'b', label: "Random access patterns defeat hardware prefetching and waste cache lines", correct: true },
      { id: 'c', label: "Hash-based access causes more CPU interrupts" },
      { id: 'd', label: "The memory controller rejects non-sequential requests" },
    ],
    explanation: "Hardware prefetchers detect access patterns (sequential, strided) and speculatively load data before it's needed, hiding memory latency. Sequential access lets the prefetcher stay ahead, achieving near-peak bandwidth. Random/hash-based access is unpredictable - the prefetcher can't guess what's needed next, so every access pays full memory latency. Additionally, each random access loads a 64-byte cache line but may only use 8 bytes, wasting 87.5% of memory bandwidth. This is why algorithms are often redesigned to be 'cache-oblivious' or 'cache-friendly.'"
  },
  // Q10: Memory latency hiding (Hard)
  {
    scenario: "A GPU architect is comparing two designs for AI inference: Design A has 1000 simple cores with 4-way multithreading, Design B has 250 powerful cores with no multithreading. Both have the same total compute capability and memory bandwidth.",
    question: "Why might Design A (more simple cores with multithreading) perform better for memory-bound AI workloads?",
    options: [
      { id: 'a', label: "Simple cores use less power" },
      { id: 'b', label: "More threads allow the GPU to hide memory latency by switching to ready threads while others wait for data", correct: true },
      { id: 'c', label: "Design A can fit more data in cache" },
      { id: 'd', label: "Multithreading increases memory bandwidth" },
    ],
    explanation: "Memory-bound workloads spend most time waiting for data. With 4-way multithreading, when Thread 1 stalls waiting for memory, the core instantly switches to Thread 2, 3, or 4 if they're ready. This 'latency hiding' keeps compute units busy despite slow memory. AI inference loads each weight once, uses it briefly, then discards it - there's no temporal locality to exploit via caching. The solution is massive parallelism: enough threads in flight that some are always ready while others wait. This is why GPUs have thousands of threads and why NVIDIA's architecture evolved toward more, simpler cores with high thread counts."
  },
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
      const correctOption = testQuestions[index].options.find(o => o.correct);
      if (answer === correctOption?.id) return score + 1;
      return score;
    }, 0);
  };

  const renderVisualization = () => {
    const width = 700;
    const height = 420;

    const levels = Object.entries(MEMORY_SPECS);

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ maxHeight: '100%' }}
      >
        <defs>
          {/* Premium CPU chip gradient */}
          <linearGradient id="memhCpuGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="25%" stopColor="#475569" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="75%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* L1 Cache - Hot red/orange gradient */}
          <linearGradient id="memhL1Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="25%" stopColor="#f87171" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="75%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>

          {/* L2 Cache - Warm orange gradient */}
          <linearGradient id="memhL2Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fdba74" />
            <stop offset="25%" stopColor="#fb923c" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="75%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>

          {/* L3 Cache - Yellow/amber gradient */}
          <linearGradient id="memhL3Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="25%" stopColor="#facc15" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="75%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#a16207" />
          </linearGradient>

          {/* Main RAM - Cool green gradient */}
          <linearGradient id="memhRAMGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="25%" stopColor="#4ade80" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="75%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>

          {/* SSD/Disk - Cool blue gradient */}
          <linearGradient id="memhDiskGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="25%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="75%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          {/* Data access radial glow effects */}
          <radialGradient id="memhAccessGlowRed" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
            <stop offset="40%" stopColor="#dc2626" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#b91c1c" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="memhAccessGlowOrange" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="1" />
            <stop offset="40%" stopColor="#ea580c" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#c2410c" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#7c2d12" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="memhAccessGlowYellow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#eab308" stopOpacity="1" />
            <stop offset="40%" stopColor="#ca8a04" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#a16207" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#713f12" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="memhAccessGlowGreen" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="1" />
            <stop offset="40%" stopColor="#16a34a" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#15803d" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#14532d" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="memhAccessGlowBlue" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
            <stop offset="40%" stopColor="#2563eb" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#1d4ed8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
          </radialGradient>

          {/* Data packet glow */}
          <radialGradient id="memhDataGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
            <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
          </radialGradient>

          {/* Premium glow filters */}
          <filter id="memhGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="memhSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="memhActiveGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Background gradient */}
          <linearGradient id="memhBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="50%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* Silicon wafer pattern */}
          <pattern id="memhCircuitPattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
            <circle cx="10" cy="10" r="1" fill="#334155" fillOpacity="0.3" />
          </pattern>
        </defs>

        {/* Premium dark background */}
        <rect width={width} height={height} fill="url(#memhBgGradient)" />
        <rect width={width} height={height} fill="url(#memhCircuitPattern)" />

        {/* Title and legend area */}
        <g transform="translate(20, 20)">
          <rect x="0" y="0" width="180" height="50" rx="8" fill="#111827" stroke="#1f2937" strokeWidth="1" />
          <text x="15" y="22" fill="#f8fafc" fontSize="14" fontWeight="bold">Memory Hierarchy</text>
          <text x="15" y="40" fill="#94a3b8" fontSize="10">Speed vs Capacity Trade-off</text>
        </g>

        {/* === CPU CHIP (Top) === */}
        <g transform="translate(250, 55)">
          {/* CPU outer frame */}
          <rect x="0" y="0" width="200" height="55" rx="6" fill="url(#memhCpuGradient)" stroke="#475569" strokeWidth="2" />
          <rect x="4" y="4" width="192" height="47" rx="4" fill="#0f172a" opacity="0.5" />

          {/* CPU pins */}
          {[...Array(12)].map((_, i) => (
            <rect key={`pin-top-${i}`} x={15 + i * 15} y="-6" width="6" height="8" rx="1" fill="#64748b" />
          ))}
          {[...Array(12)].map((_, i) => (
            <rect key={`pin-bot-${i}`} x={15 + i * 15} y="53" width="6" height="8" rx="1" fill="#64748b" />
          ))}

          {/* CPU core indicator */}
          <circle cx="100" cy="27" r="18" fill="#1e293b" stroke="#334155" strokeWidth="1" />
          <circle cx="100" cy="27" r="12" fill="#334155">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <text x="100" y="31" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold">CPU</text>

          {/* Active indicator */}
          <circle cx="180" cy="12" r="5" fill="#22c55e" filter="url(#memhSoftGlow)">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="1s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* === MEMORY HIERARCHY PYRAMID === */}
        {levels.map(([name, spec], i) => {
          const levelHeight = 52;
          const baseY = 125;
          const y = baseY + i * levelHeight;

          // Pyramid widening effect
          const minWidth = 120;
          const maxWidth = 500;
          const rectWidth = minWidth + (maxWidth - minWidth) * (i / (levels.length - 1));
          const x = (width - rectWidth) / 2;

          const isActive = name === activeLevel;
          const gradientId = i === 0 ? 'memhL1Gradient' : i === 1 ? 'memhL2Gradient' : i === 2 ? 'memhL3Gradient' : i === 3 ? 'memhRAMGradient' : 'memhDiskGradient';
          const glowId = i === 0 ? 'memhAccessGlowRed' : i === 1 ? 'memhAccessGlowOrange' : i === 2 ? 'memhAccessGlowYellow' : i === 3 ? 'memhAccessGlowGreen' : 'memhAccessGlowBlue';

          // Format size for display
          const sizeText = spec.size >= 1 ? `${spec.size} GB` : spec.size >= 0.001 ? `${(spec.size * 1000).toFixed(0)} MB` : `${(spec.size * 1000000).toFixed(0)} KB`;
          const latencyText = spec.latency >= 1000 ? `${spec.latency / 1000}k cycles` : `${spec.latency} cycle${spec.latency > 1 ? 's' : ''}`;

          return (
            <g key={name}>
              {/* Active glow effect */}
              {isActive && (
                <rect
                  x={x - 8}
                  y={y - 4}
                  width={rectWidth + 16}
                  height={levelHeight}
                  rx={10}
                  fill={`url(#${glowId})`}
                  opacity="0.4"
                  filter="url(#memhActiveGlow)"
                />
              )}

              {/* Main level block */}
              <rect
                x={x}
                y={y}
                width={rectWidth}
                height={levelHeight - 8}
                rx={8}
                fill={isActive ? `url(#${gradientId})` : '#1e293b'}
                stroke={isActive ? '#ffffff' : spec.color}
                strokeWidth={isActive ? 2.5 : 1}
                opacity={isActive ? 1 : 0.6}
                filter={isActive ? 'url(#memhSoftGlow)' : undefined}
              />

              {/* Inner highlight */}
              <rect
                x={x + 3}
                y={y + 3}
                width={rectWidth - 6}
                height={levelHeight - 14}
                rx={6}
                fill="none"
                stroke={isActive ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}
                strokeWidth={1}
              />

              {/* Level name */}
              <text
                x={x + 15}
                y={y + levelHeight / 2 - 2}
                fill={isActive ? '#ffffff' : '#94a3b8'}
                fontSize={12}
                fontWeight="bold"
              >
                {name}
              </text>

              {/* Size indicator (left side) */}
              <g transform={`translate(${x + rectWidth - 180}, ${y + 8})`}>
                <rect x="0" y="0" width="80" height="28" rx="4" fill="rgba(0,0,0,0.4)" />
                <text x="40" y="12" textAnchor="middle" fill="#94a3b8" fontSize="8">CAPACITY</text>
                <text x="40" y="24" textAnchor="middle" fill={isActive ? '#ffffff' : spec.color} fontSize="11" fontWeight="bold">{sizeText}</text>
              </g>

              {/* Latency indicator (right side) */}
              <g transform={`translate(${x + rectWidth - 90}, ${y + 8})`}>
                <rect x="0" y="0" width="80" height="28" rx="4" fill="rgba(0,0,0,0.4)" />
                <text x="40" y="12" textAnchor="middle" fill="#94a3b8" fontSize="8">LATENCY</text>
                <text x="40" y="24" textAnchor="middle" fill={isActive ? '#ffffff' : spec.color} fontSize="11" fontWeight="bold">{latencyText}</text>
              </g>

              {/* Bandwidth bar */}
              <g transform={`translate(${x + 120}, ${y + levelHeight - 14})`}>
                <rect x="0" y="0" width="100" height="4" rx="2" fill="rgba(0,0,0,0.4)" />
                <rect x="0" y="0" width={Math.min(100, spec.bandwidth / 40)} height="4" rx="2" fill={isActive ? '#22d3ee' : '#475569'} />
                <text x="105" y="5" fill="#64748b" fontSize="7">{spec.bandwidth} GB/s</text>
              </g>

              {/* Data flow animation when active */}
              {isActive && (
                <>
                  {/* Multiple data packets flowing */}
                  {[0, 0.33, 0.66].map((offset, idx) => {
                    const progress = ((animationFrame / 100) + offset) % 1;
                    return (
                      <g key={idx} filter="url(#memhGlowFilter)">
                        <circle
                          cx={x + 20 + progress * (rectWidth - 40)}
                          cy={y + levelHeight / 2 - 2}
                          r={5}
                          fill="url(#memhDataGlow)"
                        />
                        <circle
                          cx={x + 20 + progress * (rectWidth - 40)}
                          cy={y + levelHeight / 2 - 2}
                          r={2.5}
                          fill="#ffffff"
                        />
                      </g>
                    );
                  })}
                </>
              )}

              {/* Connection lines between levels */}
              {i < levels.length - 1 && (
                <g>
                  <line
                    x1={width / 2 - 30}
                    y1={y + levelHeight - 4}
                    x2={width / 2 - 50}
                    y2={y + levelHeight + 4}
                    stroke={isActive || levels[i + 1][0] === activeLevel ? '#22d3ee' : '#334155'}
                    strokeWidth={isActive || levels[i + 1][0] === activeLevel ? 2 : 1}
                    strokeDasharray={isActive || levels[i + 1][0] === activeLevel ? 'none' : '4 2'}
                  />
                  <line
                    x1={width / 2 + 30}
                    y1={y + levelHeight - 4}
                    x2={width / 2 + 50}
                    y2={y + levelHeight + 4}
                    stroke={isActive || levels[i + 1][0] === activeLevel ? '#22d3ee' : '#334155'}
                    strokeWidth={isActive || levels[i + 1][0] === activeLevel ? 2 : 1}
                    strokeDasharray={isActive || levels[i + 1][0] === activeLevel ? 'none' : '4 2'}
                  />
                  {/* Animated data flow indicator */}
                  {(isActive || levels[i + 1][0] === activeLevel) && (
                    <circle
                      cx={width / 2}
                      cy={y + levelHeight + ((animationFrame / 100) * 8)}
                      r={3}
                      fill="#22d3ee"
                      filter="url(#memhSoftGlow)"
                    >
                      <animate attributeName="opacity" values="0.4;1;0.4" dur="0.5s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              )}
            </g>
          );
        })}

        {/* === STATS PANEL === */}
        <g transform="translate(540, 20)">
          <rect x="0" y="0" width="150" height="95" rx="8" fill="#111827" stroke="#1f2937" strokeWidth="1" />

          {/* Working set */}
          <text x="15" y="20" fill="#94a3b8" fontSize="9" fontWeight="bold">WORKING SET</text>
          <text x="15" y="38" fill={colors.accent} fontSize="14" fontWeight="bold">
            {workingSetSize >= 1 ? `${workingSetSize.toFixed(1)} GB` : workingSetSize >= 0.001 ? `${(workingSetSize * 1000).toFixed(1)} MB` : `${(workingSetSize * 1000000).toFixed(0)} KB`}
          </text>

          {/* Effective latency */}
          <text x="15" y="58" fill="#94a3b8" fontSize="9" fontWeight="bold">EFFECTIVE LATENCY</text>
          <text x="15" y="76" fill={effectiveLatency > 50 ? colors.error : colors.success} fontSize="14" fontWeight="bold">
            {effectiveLatency >= 1000 ? `${effectiveLatency / 1000}k` : effectiveLatency} cycles
          </text>

          {/* Status indicator */}
          <circle cx="135" cy="75" r="6" fill={effectiveLatency > 50 ? colors.error : colors.success} filter="url(#memhSoftGlow)">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.2s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* === ACCESS PATTERN & CACHE HITS === */}
        <g transform="translate(20, 380)">
          <rect x="0" y="0" width="220" height="35" rx="6" fill="#111827" stroke="#1f2937" strokeWidth="1" />
          <text x="15" y="15" fill="#94a3b8" fontSize="9" fontWeight="bold">ACCESS PATTERN</text>
          <text x="15" y="28" fill="#f8fafc" fontSize="11" fontWeight="bold" textTransform="uppercase">
            {accessPattern}
          </text>
          <text x="100" y="28" fill={accessPattern === 'sequential' ? colors.success : accessPattern === 'random' ? colors.error : colors.warning} fontSize="9">
            {accessPattern === 'sequential' ? 'OPTIMAL' : accessPattern === 'random' ? 'POOR' : 'MODERATE'}
          </text>
        </g>

        {/* Recent cache hits visualization */}
        {showCacheHits && (
          <g transform="translate(260, 380)">
            <rect x="0" y="0" width="200" height="35" rx="6" fill="#111827" stroke="#1f2937" strokeWidth="1" />
            <text x="15" y="15" fill="#94a3b8" fontSize="9" fontWeight="bold">RECENT ACCESSES</text>
            {memoryAccesses.slice(-10).map((access, i) => (
              <g key={i}>
                <circle
                  cx={20 + i * 18}
                  cy={27}
                  r={6}
                  fill={access.hit ? colors.success : colors.error}
                  filter="url(#memhSoftGlow)"
                />
                <text
                  x={20 + i * 18}
                  y={30}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="6"
                  fontWeight="bold"
                >
                  {access.hit ? 'H' : 'M'}
                </text>
              </g>
            ))}
          </g>
        )}

        {/* Bandwidth indicator */}
        <g transform="translate(480, 380)">
          <rect x="0" y="0" width="200" height="35" rx="6" fill="#111827" stroke="#1f2937" strokeWidth="1" />
          <text x="15" y="15" fill="#94a3b8" fontSize="9" fontWeight="bold">BANDWIDTH</text>
          <text x="15" y="28" fill="#22d3ee" fontSize="12" fontWeight="bold">{effectiveBandwidth} GB/s</text>
          <rect x="100" y="20" width="90" height="8" rx="4" fill="rgba(0,0,0,0.4)" />
          <rect x="100" y="20" width={Math.min(90, effectiveBandwidth / 44.4 * 90)} height="8" rx="4" fill="#22d3ee" />
        </g>
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
    const totalQuestions = testQuestions.length;

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
              {testQuestions.map((q, i) => {
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

    const currentQ = testQuestions[currentTestIndex];

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
