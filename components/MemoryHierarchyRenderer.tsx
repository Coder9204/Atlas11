'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// Memory Hierarchy Latency - Complete 10-Phase Game
// Why is there L1, L2, L3 cache AND main memory?
// -----------------------------------------------------------------------------

// Sound utility
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
      click: { freq: 600, duration: 0.1, type: 'sine' },
      success: { freq: 800, duration: 0.2, type: 'sine' },
      failure: { freq: 300, duration: 0.3, type: 'sine' },
      transition: { freq: 500, duration: 0.15, type: 'sine' },
      complete: { freq: 900, duration: 0.4, type: 'sine' }
    };
    const sound = sounds[type];
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "You're building a computer and wondering why manufacturers don't just use the fastest memory (SRAM) for everything instead of having L1, L2, L3 cache, RAM, and storage.",
    question: "Why does the memory hierarchy exist with multiple levels of progressively slower but larger storage?",
    options: [
      { id: 'a', label: "It's a legacy design from older computers that hasn't been updated" },
      { id: 'b', label: "Fast memory (SRAM) is expensive and physically cannot scale to large sizes while maintaining speed", correct: true },
      { id: 'c', label: "Software requires different memory types to function properly" },
      { id: 'd', label: "It's purely a cost-cutting measure by manufacturers" }
    ],
    explanation: "The memory hierarchy exists because of fundamental physics constraints. Fast memory like SRAM requires 6 transistors per bit and must be physically close to the CPU to minimize signal travel time. You literally cannot build 64GB of L1-speed memory - the signals couldn't travel fast enough across that distance."
  },
  {
    scenario: "A programmer is debugging a performance issue. Their profiler shows the application has a 70% L1 cache hit rate, 20% L2 hit rate, 8% L3 hit rate, and 2% RAM access rate.",
    question: "What happens during the 30% of accesses that miss the L1 cache?",
    options: [
      { id: 'a', label: "The program crashes and must be restarted" },
      { id: 'b', label: "The CPU checks L2, then L3, then RAM, with increasing latency at each level", correct: true },
      { id: 'c', label: "The operating system is notified to handle the missing data" },
      { id: 'd', label: "The data is regenerated from scratch by the CPU" }
    ],
    explanation: "When data isn't found in L1 cache (a cache miss), the CPU doesn't crash - it simply checks the next level. L2 takes ~4 cycles, L3 takes ~12 cycles, and RAM takes ~100 cycles. The CPU pipeline may stall during this time."
  },
  {
    scenario: "An engineer is analyzing CPU specifications and notices: L1 cache is 64KB with 1-cycle latency, L2 is 512KB with 4-cycle latency, and L3 is 32MB with 12-cycle latency.",
    question: "Why is L1 cache per-core and split, while L3 is larger and shared across cores?",
    options: [
      { id: 'a', label: "L1 must be extremely fast for each core's critical path; L3 trades speed for capacity and sharing efficiency", correct: true },
      { id: 'b', label: "L1 is older technology that couldn't be shared" },
      { id: 'c', label: "L3 is shared only to reduce manufacturing costs" },
      { id: 'd', label: "Each core needs different instructions, but data can be shared" }
    ],
    explanation: "L1 cache is per-core and split because it sits in the critical path of every CPU cycle - it must be as fast as possible. Being small and close to each core enables 1-cycle access. L3 is shared because it acts as a 'last line of defense' before slow RAM."
  },
  {
    scenario: "A data scientist is processing a large dataset. Version A iterates through a 2D array row-by-row (row-major order), while Version B iterates column-by-column. Both process the same data, but Version A runs 10x faster.",
    question: "Why does row-major iteration significantly outperform column-major iteration?",
    options: [
      { id: 'a', label: "Row-major order uses less memory overall" },
      { id: 'b', label: "The CPU can only process data in row-major format" },
      { id: 'c', label: "Row-major accesses consecutive memory addresses, exploiting spatial locality and cache lines", correct: true },
      { id: 'd', label: "Column-major order causes the CPU to overheat" }
    ],
    explanation: "Arrays are stored in contiguous memory in row-major order. When you access array[0][0], the CPU loads an entire 64-byte cache line. Row-major iteration gets 7 'free' cache hits per cache line load. Column-major jumps to different rows, missing the cache every time."
  },
  {
    scenario: "A game developer has two data structures: Structure A has position (x,y,z) and velocity (vx,vy,vz) interleaved for each object (48 bytes per object). Structure B separates all positions in one array and all velocities in another.",
    question: "Why might Structure B (separated arrays) perform better for position-only updates?",
    options: [
      { id: 'a', label: "Separated arrays use less total memory" },
      { id: 'b', label: "The compiler can better optimize separated arrays" },
      { id: 'c', label: "Each 64-byte cache line contains more useful position data, reducing memory bandwidth waste", correct: true },
      { id: 'd', label: "Structure A would cause cache coherency issues" }
    ],
    explanation: "With Structure A, each 64-byte cache line holds only ~1.3 objects, and half (velocity) is unused during position-only updates. With Structure B, each cache line holds ~5 positions, and every byte is useful. This is 'data-oriented design'."
  },
  {
    scenario: "A systems architect is choosing between write-through cache (writes go to cache AND memory immediately) and write-back cache (writes go only to cache, memory updated later).",
    question: "What is the key trade-off between write-through and write-back caching strategies?",
    options: [
      { id: 'a', label: "Write-through is faster but uses more power" },
      { id: 'b', label: "Write-back offers better performance but risks data loss on power failure and adds coherency complexity", correct: true },
      { id: 'c', label: "Write-through is only used in older systems" },
      { id: 'd', label: "Write-back requires special memory chips to function" }
    ],
    explanation: "Write-through guarantees data consistency - every write reaches memory immediately. Write-back is faster because writes complete at cache speed, but dirty cache lines can be lost on power failure, and multi-core systems need complex coherency protocols."
  },
  {
    scenario: "A parallel computing application has 8 threads on 8 cores, all frequently reading and writing a shared counter variable. Performance is 10x slower than expected despite the parallelism.",
    question: "What cache phenomenon is likely causing this severe performance degradation?",
    options: [
      { id: 'a', label: "The counter variable is too small for the cache to store" },
      { id: 'b', label: "False sharing or true sharing is causing constant cache line invalidations across cores", correct: true },
      { id: 'c', label: "The CPU is automatically serializing access to prevent errors" },
      { id: 'd', label: "8 cores cannot physically access memory simultaneously" }
    ],
    explanation: "This is cache thrashing due to coherency traffic. When Core 1 writes to the counter, the MESI protocol must invalidate that cache line in all other cores' caches. Each core constantly invalidates the others' copies, forcing expensive cache misses."
  },
  {
    scenario: "A database administrator notices that queries on a 500GB dataset perform well initially but slow down dramatically when accessing rarely-used tables. The system has 64GB RAM and the TLB can cache 1536 page table entries.",
    question: "How might TLB (Translation Lookaside Buffer) misses contribute to this slowdown?",
    options: [
      { id: 'a', label: "The TLB can only store data, not addresses" },
      { id: 'b', label: "TLB misses require expensive page table walks through memory, adding latency to every memory access in cold regions", correct: true },
      { id: 'c', label: "The TLB automatically compresses data that doesn't fit" },
      { id: 'd', label: "TLB misses only affect write operations, not reads" }
    ],
    explanation: "The TLB caches virtual-to-physical address translations. With 4KB pages and 1536 entries, the TLB covers only ~6MB. Accessing cold tables causes TLB misses, requiring 4-5 memory accesses to traverse the page table. Huge pages help increase TLB coverage."
  },
  {
    scenario: "A machine learning engineer is optimizing matrix multiplication. Version A accesses matrix elements sequentially, achieving 95% of theoretical memory bandwidth. Version B accesses elements based on a hash function, achieving only 15% bandwidth.",
    question: "Why does the hash-based access pattern perform so much worse?",
    options: [
      { id: 'a', label: "Hash functions are computationally expensive" },
      { id: 'b', label: "Random access patterns defeat hardware prefetching and waste cache lines", correct: true },
      { id: 'c', label: "Hash-based access causes more CPU interrupts" },
      { id: 'd', label: "The memory controller rejects non-sequential requests" }
    ],
    explanation: "Hardware prefetchers detect access patterns and speculatively load data before it's needed. Sequential access lets the prefetcher stay ahead. Random access is unpredictable, so every access pays full memory latency and wastes 87.5% of loaded cache lines."
  },
  {
    scenario: "A GPU architect is comparing two designs for AI inference: Design A has 1000 simple cores with 4-way multithreading, Design B has 250 powerful cores with no multithreading. Both have the same total compute capability.",
    question: "Why might Design A (more simple cores with multithreading) perform better for memory-bound AI workloads?",
    options: [
      { id: 'a', label: "Simple cores use less power" },
      { id: 'b', label: "More threads allow the GPU to hide memory latency by switching to ready threads while others wait for data", correct: true },
      { id: 'c', label: "Design A can fit more data in cache" },
      { id: 'd', label: "Multithreading increases memory bandwidth" }
    ],
    explanation: "Memory-bound workloads spend most time waiting for data. With 4-way multithreading, when Thread 1 stalls waiting for memory, the core instantly switches to Thread 2, 3, or 4. This 'latency hiding' keeps compute units busy despite slow memory."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🎮',
    title: 'Video Game Optimization',
    short: 'Maximizing FPS through cache-aware design',
    tagline: '60 FPS or bust - cache decides',
    description: 'Game engines obsess over cache efficiency. Data-oriented design restructures game objects to maximize cache hits. The difference between 30 FPS and 144 FPS often comes down to whether game data fits in L2 cache. When objects are packed contiguously in memory, the CPU prefetcher can load entire cache lines ahead of time, dramatically reducing stall cycles.',
    connection: 'The game demonstrated how memory access patterns affect performance. Game engines apply these principles - storing position data contiguously, prefetching texture data, and organizing entity components for cache-friendly iteration.',
    howItWorks: 'Entity-Component-System (ECS) separates game object data by type, not object. Position data for all entities stored contiguously. GPU texture streaming predicts and loads assets before needed.',
    stats: [
      { value: '10x', label: 'ECS performance gain', icon: '🚀' },
      { value: '60Hz', label: 'Target frame rate', icon: '🖥️' },
      { value: '$200B', label: 'Gaming market', icon: '📈' }
    ],
    examples: ['Unity DOTS', 'Unreal Engine', 'Overwatch engine', 'id Tech'],
    companies: ['Epic Games', 'Unity', 'Blizzard', 'Valve'],
    color: '#8b5cf6'
  },
  {
    icon: '🧠',
    title: 'Machine Learning Training',
    short: 'GPU memory hierarchy for AI',
    tagline: 'Feeding the neural network beast',
    description: 'Training large language models requires moving terabytes of data through memory hierarchies. GPUs have their own L1/L2 caches, shared memory, and HBM. Optimizing data layout determines whether training takes days or months.',
    connection: 'The principles of locality and cache hierarchy apply directly to GPUs. Matrix operations must tile data to fit in shared memory. Batch sizes are chosen to maximize HBM bandwidth utilization.',
    howItWorks: 'Model weights stored in HBM (high bandwidth memory). Activations computed in tiles that fit in shared memory. Gradient accumulation reduces memory traffic. Mixed precision halves memory needs.',
    stats: [
      { value: '3TB/s', label: 'H100 HBM bandwidth', icon: '⚡' },
      { value: '80GB', label: 'GPU memory capacity', icon: '💾' },
      { value: '$50B', label: 'AI chip market', icon: '📈' }
    ],
    examples: ['GPT-4 training', 'Stable Diffusion', 'AlphaFold', 'Tesla FSD'],
    companies: ['NVIDIA', 'Google TPU', 'AMD', 'Cerebras'],
    color: '#22c55e'
  },
  {
    icon: '💾',
    title: 'Database Query Optimization',
    short: 'Cache-conscious data structures',
    tagline: 'Millisecond queries on petabyte data',
    description: 'Modern databases achieve sub-millisecond queries on massive datasets through careful memory hierarchy optimization. B-trees sized for cache lines, column stores for vectorized processing, and buffer pools that predict access patterns.',
    connection: 'The game showed how sequential access beats random access by 100x. Databases use this knowledge - columnar storage keeps similar data together, indexes are B-trees with cache-line-sized nodes.',
    howItWorks: 'Columnar storage groups same-column data contiguously. B-tree nodes sized to match cache lines (64 bytes). Buffer pool keeps hot pages in RAM. Bloom filters avoid disk access.',
    stats: [
      { value: '<1ms', label: 'OLTP query latency', icon: '⚡' },
      { value: '100TB', label: 'Single-node capacity', icon: '💾' },
      { value: '$80B', label: 'Database market', icon: '📈' }
    ],
    examples: ['PostgreSQL', 'ClickHouse', 'Apache Spark', 'Redis'],
    companies: ['Oracle', 'Snowflake', 'MongoDB', 'Databricks'],
    color: '#3b82f6'
  },
  {
    icon: '📱',
    title: 'Mobile App Performance',
    short: 'Battery life through cache efficiency',
    tagline: 'Every cache miss costs milliwatts',
    description: 'Mobile apps must balance performance with battery life. RAM access consumes 100x more energy than cache access. Apps that optimize for cache efficiency not only run faster but drain batteries slower.',
    connection: 'The memory hierarchy game showed latency differences, but energy follows similar ratios. Mobile developers use the same principles - keeping working sets small, prefetching intelligently.',
    howItWorks: 'Object pooling keeps allocations in cache. Image decoding uses tiled processing. Scroll views recycle cell objects. Lazy loading defers memory allocation. Compression trades CPU for bandwidth.',
    stats: [
      { value: '100x', label: 'RAM vs cache energy', icon: '🔋' },
      { value: '4GB', label: 'Typical phone RAM', icon: '📱' },
      { value: '$500B', label: 'Mobile app market', icon: '📈' }
    ],
    examples: ['iOS UIKit', 'Android Jetpack', 'React Native', 'Flutter'],
    companies: ['Apple', 'Google', 'Meta', 'ByteDance'],
    color: '#f59e0b'
  }
];

// Types
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface MemoryHierarchyRendererProps {
  gamePhase?: Phase;
}

// Memory hierarchy specs
const MEMORY_SPECS = {
  'L1 Cache': { latency: 1, size: 0.000064, bandwidth: 4000, color: '#ef4444' },
  'L2 Cache': { latency: 4, size: 0.000512, bandwidth: 2000, color: '#f97316' },
  'L3 Cache': { latency: 12, size: 0.032, bandwidth: 500, color: '#eab308' },
  'Main RAM': { latency: 100, size: 64, bandwidth: 50, color: '#22c55e' },
  'SSD/NVMe': { latency: 100000, size: 2000, bandwidth: 5, color: '#3b82f6' },
};

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const MemoryHierarchyRenderer: React.FC<MemoryHierarchyRendererProps> = ({ gamePhase }) => {
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [workingSetSize, setWorkingSetSize] = useState(0.01); // GB
  const [accessPattern, setAccessPattern] = useState<'sequential' | 'random' | 'strided'>('sequential');
  const [animationFrame, setAnimationFrame] = useState(0);
  const [memoryAccesses, setMemoryAccesses] = useState<{ level: string; hit: boolean }[]>([]);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [answerChecked, setAnswerChecked] = useState(false);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Simulate memory accesses
  useEffect(() => {
    const interval = setInterval(() => {
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

  // Get active memory level
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

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F97316',
    accentGlow: 'rgba(249, 115, 22, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#D1D5DB',
    textMuted: '#9CA3AF',
    border: '#2a2a3a',
    l1: '#ef4444',
    l2: '#f97316',
    l3: '#eab308',
    ram: '#22c55e',
    disk: '#3b82f6',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore AI Workloads',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Navigation bar component
  const renderNavBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: colors.bgSecondary,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={prevPhase}
          style={{
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            color: phaseOrder.indexOf(phase) > 0 ? colors.textSecondary : colors.textMuted,
            cursor: phaseOrder.indexOf(phase) > 0 ? 'pointer' : 'not-allowed',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '14px',
            minHeight: '44px',
            opacity: phaseOrder.indexOf(phase) > 0 ? 1 : 0.4,
          }}
          disabled={phaseOrder.indexOf(phase) === 0}
        >
          Back
        </button>
        <span style={{ color: colors.textPrimary, fontWeight: 600 }}>Memory Hierarchy Latency</span>
      </div>
      <span style={{ color: '#9CA3AF', fontSize: '14px' }}>{phaseLabels[phase]}</span>
    </div>
  );

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: '56px',
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1000,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            minHeight: '44px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #D97706)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    minHeight: '44px',
  };

  // Memory Hierarchy Visualization
  const MemoryVisualization = () => {
    const width = isMobile ? 340 : 600;
    const height = isMobile ? 320 : 400;
    const levels = Object.entries(MEMORY_SPECS);

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="memL1Grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="memL2Grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fdba74" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="memL3Grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
          <linearGradient id="memRAMGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
          <linearGradient id="memDiskGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <filter id="memGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Memory Hierarchy - Speed vs Capacity Trade-off
        </text>

        {/* Grid lines for visual reference */}
        <line x1="20" y1="75" x2={width - 20} y2="75" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
        <line x1="20" y1="175" x2={width - 20} y2="175" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
        <line x1="20" y1="275" x2={width - 20} y2="275" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />

        {/* Latency axis label */}
        <text x="14" y={height / 2} textAnchor="middle" fill="#9CA3AF" fontSize="11" fontWeight="500" transform={`rotate(-90, 14, ${height / 2})`}>
          Latency (cycles)
        </text>

        {/* CPU chip */}
        <g transform={`translate(${width/2 - 40}, 38)`}>
          <rect x="0" y="0" width="80" height="30" rx="4" fill="#334155" stroke="#475569" strokeWidth="2" />
          <text x="40" y="20" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="bold">CPU</text>
        </g>

        {/* CPU to L1 data path */}
        <path d={`M ${width/2} 68 L ${width/2} 80`} stroke={colors.accent} strokeWidth="2" strokeDasharray="3 2" opacity="0.7" />

        {/* Memory pyramid */}
        {levels.map(([name, spec], i) => {
          const levelHeight = 50;
          const baseY = 80 + i * levelHeight;
          const minWidth = 100;
          const maxWidth = width - 40;
          const rectWidth = minWidth + (maxWidth - minWidth) * (i / (levels.length - 1));
          const x = (width - rectWidth) / 2;
          const isActive = name === activeLevel;

          const gradients = ['memL1Grad', 'memL2Grad', 'memL3Grad', 'memRAMGrad', 'memDiskGrad'];

          const sizeText = spec.size >= 1 ? `${spec.size} GB` : spec.size >= 0.001 ? `${(spec.size * 1000).toFixed(0)} MB` : `${(spec.size * 1000000).toFixed(0)} KB`;
          const latencyText = spec.latency >= 1000 ? `${spec.latency / 1000}k cycles` : `${spec.latency} cycle${spec.latency > 1 ? 's' : ''}`;

          return (
            <g key={name}>
              {isActive && (
                <rect
                  x={x - 4}
                  y={baseY - 2}
                  width={rectWidth + 8}
                  height={levelHeight - 6}
                  rx={8}
                  fill="none"
                  stroke={spec.color}
                  strokeWidth="3"
                  filter="url(#memGlow)"
                  opacity="0.8"
                />
              )}
              <rect
                x={x}
                y={baseY}
                width={rectWidth}
                height={levelHeight - 10}
                rx={6}
                fill={isActive ? `url(#${gradients[i]})` : '#1e293b'}
                stroke={spec.color}
                strokeWidth={isActive ? 2 : 1}
                opacity={isActive ? 1 : 0.6}
              />
              <text
                x={x + 12}
                y={baseY + 14}
                fill={isActive ? '#ffffff' : '#e2e8f0'}
                fontSize="12"
                fontWeight="bold"
              >
                {name}
              </text>
              <text
                x={x + rectWidth - 12}
                y={baseY + 32}
                textAnchor="end"
                fill={isActive ? '#ffffff' : '#94a3b8'}
                fontSize="11"
              >
                {sizeText} | {latencyText}
              </text>

              {/* Data flow animation when active */}
              {isActive && (
                <circle
                  cx={x + 20 + ((animationFrame / 100) * (rectWidth - 40))}
                  cy={baseY + (levelHeight - 10) / 2}
                  r={4}
                  fill="#22d3ee"
                  filter="url(#memGlow)"
                />
              )}
            </g>
          );
        })}

        {/* Formula: Effective Latency */}
        <text x={30} y={height - 50} fill="#9CA3AF" fontSize="11">
          T = L1 + (1 - h1) × L2 + (1 - h2) × L3 + ...
        </text>

        {/* Stats panel */}
        <rect x={width - 130} y={height - 65} width="120" height="55" rx="8" fill="#111827" stroke="#1f2937" strokeWidth="1" />
        <text x={width - 70} y={height - 49} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="500">ACTIVE LEVEL</text>
        <text x={width - 70} y={height - 32} textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="bold">{activeLevel}</text>
        <text x={width - 70} y={height - 17} textAnchor="middle" fill={effectiveLatency > 50 ? colors.error : colors.success} fontSize="11">
          {effectiveLatency >= 1000 ? `${effectiveLatency / 1000}k` : effectiveLatency} cycles
        </text>
      </svg>
    );
  };

  // Controls for interactive phases
  const renderControls = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ ...typo.small, color: colors.textSecondary }}>Working Set Size</span>
          <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
            {workingSetSize >= 1 ? `${workingSetSize.toFixed(1)} GB` : workingSetSize >= 0.001 ? `${(workingSetSize * 1000).toFixed(1)} MB` : `${(workingSetSize * 1000000).toFixed(0)} KB`}
          </span>
        </div>
        <input
          type="range"
          min={-5}
          max={3}
          step={0.1}
          value={Math.log10(workingSetSize)}
          onChange={(e) => setWorkingSetSize(Math.pow(10, parseFloat(e.target.value)))}
          style={{ width: '100%', accentColor: colors.accent, touchAction: 'pan-y' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          <span>10 KB</span>
          <span>1 MB</span>
          <span>100 MB</span>
          <span>1 TB</span>
        </div>
      </div>

      <div>
        <div style={{ ...typo.small, color: colors.textSecondary, marginBottom: '8px' }}>Access Pattern</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['sequential', 'strided', 'random'] as const).map(pattern => (
            <button
              key={pattern}
              onClick={() => { playSound('click'); setAccessPattern(pattern); }}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: accessPattern === pattern ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                background: accessPattern === pattern ? `${colors.accent}22` : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontSize: '12px',
                fontWeight: accessPattern === pattern ? 600 : 400,
                minHeight: '44px',
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ color: colors.accent, margin: 0 }}>Current Level: {activeLevel}</h4>
          <span style={{
            padding: '4px 8px',
            borderRadius: '4px',
            background: accessPattern === 'sequential' ? `${colors.success}22` : accessPattern === 'random' ? `${colors.error}22` : `${colors.warning}22`,
            color: accessPattern === 'sequential' ? colors.success : accessPattern === 'random' ? colors.error : colors.warning,
            fontSize: '11px',
            fontWeight: 600,
          }}>
            {accessPattern === 'sequential' ? 'OPTIMAL' : accessPattern === 'random' ? 'POOR' : 'MODERATE'}
          </span>
        </div>
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

        {/* Cache hit visualization */}
        <div style={{ marginTop: '12px' }}>
          <div style={{ color: colors.textMuted, fontSize: '11px', marginBottom: '8px' }}>Recent Accesses</div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {memoryAccesses.slice(-15).map((access, i) => (
              <div
                key={i}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: access.hit ? colors.success : colors.error,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px',
                  color: 'white',
                  fontWeight: 'bold',
                }}
              >
                {access.hit ? 'H' : 'M'}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          padding: '80px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            🧠💾
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
            Memory Hierarchy Latency
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
          }}>
            "CPUs run at <span style={{ color: colors.l1 }}>4-5 GHz</span>, but RAM only runs at <span style={{ color: colors.ram }}>3200 MHz</span>. If the CPU waited for RAM every time it needed data, it would spend <span style={{ color: colors.error }}>99% of its time doing nothing</span>."
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              "L1: 1 cycle | L2: 4 cycles | L3: 12 cycles | RAM: 100+ cycles"
            </p>
            <p className="text-muted" style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
              Each level trades speed for capacity — why can't we just have one big, fast memory?
            </p>
          </div>

          <button
            onClick={() => { playSound('click'); nextPhase(); }}
            style={primaryButtonStyle}
          >
            Explore Memory Hierarchy
          </button>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'One large, fast memory would be simpler and better' },
      { id: 'b', text: 'Multiple levels exist only to reduce manufacturing cost' },
      { id: 'c', text: 'Physics requires a speed vs. size trade-off at each level', correct: true },
      { id: 'd', text: "It's an outdated design from older computers" },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          padding: '80px 24px 24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.accent}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
                Make Your Prediction
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              Why do computers have multiple memory levels (L1, L2, L3, RAM) instead of one?
            </h2>

            {/* Preview visualization */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <MemoryVisualization />
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setPrediction(opt.id); }}
                  style={{
                    background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minHeight: '44px',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                    color: prediction === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '28px',
                    marginRight: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.body }}>
                    {opt.text}
                  </span>
                </button>
              ))}
            </div>

            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Test My Prediction
              </button>
            )}
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // PLAY PHASE - Interactive Memory Hierarchy Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          padding: '80px 24px 24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Memory Hierarchy Lab
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              The visualization shows how working set size determines which memory level is accessed.
            </p>
            <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              When working set size increases beyond a cache level, latency jumps — observe how higher sizes cause dramatic slowdowns.
            </p>

            {/* Formula: Effective access time */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '16px',
              textAlign: 'center',
              border: `1px solid ${colors.border}`,
            }}>
              <span style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: 600 }}>
                T = h1 × L1 + (1-h1) × h2 × L2 + (1-h1)(1-h2) × h3 × L3 + ...
              </span>
            </div>

            {/* Real-world relevance */}
            <div style={{
              background: `${colors.success}11`,
              border: `1px solid ${colors.success}33`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                <strong>Real-world application:</strong> Game engines and databases optimize data layouts to maximize cache hits. Understanding memory hierarchy can mean the difference between 30 FPS and 144 FPS in games.
              </p>
            </div>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '24px',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '24px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <MemoryVisualization />
                  </div>
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '24px',
                }}>
                  {renderControls()}
                </div>
              </div>
            </div>

            {/* Discovery prompts */}
            {effectiveLatency > 50 && (
              <div style={{
                background: `${colors.warning}22`,
                border: `1px solid ${colors.warning}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                  Notice how latency jumps 100x when data spills out of L3 cache to RAM!
                </p>
              </div>
            )}

            {accessPattern === 'random' && (
              <div style={{
                background: `${colors.error}22`,
                border: `1px solid ${colors.error}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
                  Random access causes many cache misses - sequential patterns work better!
                </p>
              </div>
            )}

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand the Physics
            </button>
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const predictionLabels: Record<string, string> = {
      'a': 'One large, fast memory would be simpler and better',
      'b': 'Multiple levels exist only to reduce manufacturing cost',
      'c': 'Physics requires a speed vs. size trade-off at each level',
      'd': "It's an outdated design from older computers",
    };
    const correctPrediction = prediction === 'c';

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          padding: '80px 24px 24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Why Memory Hierarchy Exists
            </h2>

            {/* Prediction feedback - always shown */}
            <div style={{
              background: correctPrediction ? `${colors.success}22` : `${colors.warning}22`,
              border: `1px solid ${correctPrediction ? colors.success : colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.body, color: correctPrediction ? colors.success : colors.warning, margin: 0 }}>
                {prediction
                  ? (correctPrediction
                    ? `Your prediction was correct! "${predictionLabels[prediction]}" — Physics fundamentally constrains what's possible.`
                    : `Your prediction "${predictionLabels[prediction]}" was a common misconception. The real answer is physics constraints.`)
                  : 'Your prediction: The memory hierarchy exists because physics requires a speed vs. size trade-off at every level.'}
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>Fundamental Physics Constraint:</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  Fast memory requires <span style={{ color: colors.l1 }}>6 transistors per bit</span> (SRAM) and must be physically close to the CPU. You literally <span style={{ color: colors.error }}>cannot build 64GB of L1-speed memory</span> - the signals couldn't travel fast enough across that distance.
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.textPrimary }}>The Speed-Capacity Trade-off:</strong>
                </p>
                <p style={{ marginBottom: '16px' }}>
                  Each memory level sacrifices speed for capacity. L1 is tiny but instant. RAM is huge but 100x slower. The hierarchy exploits <span style={{ color: colors.success }}>locality of reference</span> - most programs access the same data repeatedly.
                </p>
                <p style={{ marginBottom: '8px' }}>
                  <strong style={{ color: colors.textPrimary }}>Effective Latency Formula (T_eff):</strong>
                </p>
                <div style={{ fontFamily: 'monospace', fontSize: '13px', color: colors.accent, background: colors.bgSecondary, padding: '8px 12px', borderRadius: '6px', marginBottom: '8px' }}>
                  T = h₁×L1 + (1-h₁)×h₂×L2 + (1-h₁)(1-h₂)×L3 + ...
                </div>
                <p>
                  Where h₁, h₂, h₃ are hit rates (0–1) and L1, L2, L3 are cycle latencies. The relationship shows that high hit rates dramatically reduce effective latency.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{
                background: `${colors.l1}11`,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.l1}33`,
              }}>
                <h3 style={{ ...typo.h3, color: colors.l1, marginBottom: '8px' }}>
                  Temporal Locality
                </h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Data accessed recently is likely to be accessed again soon. Loops accessing the same variables benefit from cache.
                </p>
              </div>

              <div style={{
                background: `${colors.l2}11`,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.l2}33`,
              }}>
                <h3 style={{ ...typo.h3, color: colors.l2, marginBottom: '8px' }}>
                  Spatial Locality
                </h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Data near recently accessed data is likely to be accessed. Arrays processed sequentially benefit from 64-byte cache lines.
                </p>
              </div>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Discover the AI Twist
            </button>
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'AI models fit nicely in cache during inference' },
      { id: 'b', text: 'AI workloads are often memory-bound, not compute-bound', correct: true },
      { id: 'c', text: "GPUs have so much cache that memory isn't a bottleneck" },
      { id: 'd', text: "Memory hierarchy doesn't matter for AI" },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          padding: '80px 24px 24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: `${colors.warning}22`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              border: `1px solid ${colors.warning}44`,
            }}>
              <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
                New Variable: AI Workloads
              </p>
            </div>

            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
              A 7B parameter LLM is 28GB. L3 cache is only 32MB. What happens during inference?
            </h2>

            {/* Visualization without sliders for predict phase */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <MemoryVisualization />
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', color: colors.l3 }}>32 MB</div>
                  <p style={{ ...typo.small, color: colors.textSecondary }}>L3 Cache</p>
                </div>
                <div style={{ fontSize: '24px', color: colors.textSecondary }}>vs</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', color: colors.error }}>28 GB</div>
                  <p style={{ ...typo.small, color: colors.textSecondary }}>7B Model Weights</p>
                </div>
              </div>
              <p style={{ ...typo.small, color: colors.warning, marginTop: '16px' }}>
                Model is 875x larger than L3 cache!
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {options.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                  style={{
                    background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                    border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                    color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '28px',
                    marginRight: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.body }}>
                    {opt.text}
                  </span>
                </button>
              ))}
            </div>

            {twistPrediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                See AI Memory Patterns
              </button>
            )}
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          padding: '80px 24px 24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              AI Memory Access Lab
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Explore why LLM inference is memory-bound
            </p>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
              marginBottom: '24px',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '24px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <MemoryVisualization />
                  </div>
                </div>
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '24px',
                }}>
                  {renderControls()}
                </div>
              </div>
            </div>

            <div style={{
              background: `${colors.warning}11`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              border: `1px solid ${colors.warning}33`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '12px' }}>
                Why AI is Memory-Bound
              </h3>
              <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px', lineHeight: 1.8 }}>
                <li>7B model = 28GB weights, each used ONCE per token</li>
                <li>No temporal locality - weights rarely reused</li>
                <li>Streaming pattern = memory bandwidth is the limit</li>
                <li>H100 has 80GB HBM3 @ 3.35 TB/s for this reason</li>
              </ul>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '12px' }}>
                Solutions
              </h3>
              <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px', lineHeight: 1.8 }}>
                <li><strong>Quantization:</strong> 4-bit weights = 4x less bandwidth needed</li>
                <li><strong>Batching:</strong> Reuse weights across multiple inputs</li>
                <li><strong>KV Cache:</strong> Store attention results in faster memory</li>
                <li><strong>Speculative Decoding:</strong> Overlap memory access with computation</li>
              </ul>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand the Deep Insight
            </button>
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          padding: '80px 24px 24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Memory Bandwidth: The AI Bottleneck
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div style={{
                background: `${colors.error}11`,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.error}33`,
              }}>
                <h3 style={{ ...typo.h3, color: colors.error, marginBottom: '8px' }}>
                  The Problem
                </h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  LLM inference is fundamentally memory-bound. Each token requires reading ALL model weights from memory. A 70B model at FP16 = 140GB read per token!
                </p>
              </div>

              <div style={{
                background: `${colors.success}11`,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.success}33`,
              }}>
                <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '8px' }}>
                  Arithmetic Intensity
                </h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  FLOPS per byte loaded = Arithmetic Intensity. Higher is better. LLMs at batch=1: ~1 FLOP/byte. Matrix multiply with large batches: ~200 FLOPS/byte.
                </p>
              </div>

              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '8px' }}>
                  Hardware Evolution
                </h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  GPUs evolved from gaming (compute-bound) to AI (memory-bound). Modern AI chips prioritize HBM bandwidth over raw FLOPS. The H100 has 3.35 TB/s bandwidth - more than 10x a gaming GPU.
                </p>
              </div>

              <div style={{
                background: `${colors.l3}11`,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${colors.l3}33`,
              }}>
                <h3 style={{ ...typo.h3, color: colors.l3, marginBottom: '8px' }}>
                  The Memory Wall
                </h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  CPU speed doubles every 2 years, but memory bandwidth only improves ~10% per year. This growing gap is called the "memory wall" and is the defining challenge of modern computing.
                </p>
              </div>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              See Real-World Applications
            </button>
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Memory Hierarchy"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);
    const completedCount = completedApps.filter(c => c).length;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          padding: '80px 24px 24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>

            {/* Progress indicator */}
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Application {selectedApp + 1} of {realWorldApps.length} - Explore all to continue
            </p>

            {/* App selector */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '24px',
            }}>
              {realWorldApps.map((a, i) => (
                <button
                  key={i}
                  onClick={() => {
                    playSound('click');
                    setSelectedApp(i);
                    setCompletedApps(prev => {
                      const newCompleted = [...prev];
                      newCompleted[i] = true;
                      return newCompleted;
                    });
                  }}
                  style={{
                    background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                    border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                    borderRadius: '12px',
                    padding: '16px 8px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    position: 'relative',
                    minHeight: '44px',
                  }}
                >
                  {completedApps[i] && (
                    <div style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: colors.success,
                      color: 'white',
                      fontSize: '12px',
                      lineHeight: '18px',
                    }}>
                      Y
                    </div>
                  )}
                  <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
                  <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>
                    {a.title.split(' ').slice(0, 2).join(' ')}
                  </div>
                </button>
              ))}
            </div>

            {/* Selected app details */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              borderLeft: `4px solid ${app.color}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <span style={{ fontSize: '48px' }}>{app.icon}</span>
                <div>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                  <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                </div>
              </div>

              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
                {app.description}
              </p>

              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                  How Memory Hierarchy Connects:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {app.connection}
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '16px',
              }}>
                {app.stats.map((stat, i) => (
                  <div key={i} style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                    <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Got It button */}
              <button
                onClick={() => {
                  playSound('click');
                  setCompletedApps(prev => {
                    const newCompleted = [...prev];
                    newCompleted[selectedApp] = true;
                    return newCompleted;
                  });
                  if (selectedApp < realWorldApps.length - 1) {
                    setSelectedApp(selectedApp + 1);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${app.color}`,
                  background: completedApps[selectedApp] ? `${colors.success}22` : `${app.color}22`,
                  color: completedApps[selectedApp] ? colors.success : app.color,
                  cursor: 'pointer',
                  fontWeight: 600,
                  minHeight: '44px',
                }}
              >
                {completedApps[selectedApp] ? 'Completed' : 'Got It'}
              </button>
            </div>

            {allAppsCompleted ? (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Take the Knowledge Test
              </button>
            ) : (
              <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center' }}>
                {completedCount} of {realWorldApps.length} applications explored
              </p>
            )}
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100vh',
          background: colors.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {renderNavBar()}
          {renderProgressBar()}

          <div style={{
            flex: 1,
            overflowY: 'auto',
            paddingTop: '80px',
            padding: '80px 24px 24px',
          }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{
                fontSize: '80px',
                marginBottom: '24px',
              }}>
                {passed ? '🏆' : '📚'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
                {passed
                  ? 'You understand memory hierarchy and its impact on performance!'
                  : 'Review the concepts and try again.'}
              </p>

              {/* Answer Review */}
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'left',
              }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Answer Review</h3>
                {testQuestions.map((q, i) => {
                  const correctId = q.options.find(o => o.correct)?.id;
                  const userAnswer = testAnswers[i];
                  const isCorrect = userAnswer === correctId;
                  return (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 0',
                      borderBottom: i < 9 ? `1px solid ${colors.border}` : 'none',
                    }}>
                      <span style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: isCorrect ? colors.success : colors.error,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {isCorrect ? 'Y' : 'X'}
                      </span>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>
                        Q{i + 1}: {isCorrect ? 'Correct' : `Wrong (${userAnswer?.toUpperCase()}) - Answer: ${correctId?.toUpperCase()}`}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                {passed ? (
                  <button
                    onClick={() => { playSound('complete'); nextPhase(); }}
                    style={primaryButtonStyle}
                  >
                    Complete Lesson
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setTestSubmitted(false);
                      setTestAnswers(Array(10).fill(null));
                      setCurrentQuestion(0);
                      setTestScore(0);
                      setAnswerChecked(false);
                      goToPhase('hook');
                    }}
                    style={primaryButtonStyle}
                  >
                    Review and Try Again
                  </button>
                )}
                <button
                  onClick={() => goToPhase('hook')}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.textSecondary,
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  Play Again
                </button>
                <a
                  href="/"
                  style={{
                    padding: '14px 28px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.textSecondary,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    minHeight: '44px',
                  }}
                >
                  Return to Dashboard
                </a>
              </div>
            </div>
            {renderNavDots()}
          </div>
        </div>
      );
    }

    const question = testQuestions[currentQuestion];
    const correctId = question.options.find(o => o.correct)?.id;
    const isCurrentCorrect = testAnswers[currentQuestion] === correctId;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          padding: '80px 24px 24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>
                Question {currentQuestion + 1} of 10
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {testQuestions.map((_, i) => (
                  <div key={i} style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: i === currentQuestion
                      ? colors.accent
                      : testAnswers[i]
                        ? colors.success
                        : colors.border,
                  }} />
                ))}
              </div>
            </div>

            {/* Scenario */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {question.scenario}
              </p>
            </div>

            {/* Question */}
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
              {question.question}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {question.options.map(opt => {
                const isSelected = testAnswers[currentQuestion] === opt.id;
                let borderColor = isSelected ? colors.accent : colors.border;
                let bgColor = isSelected ? `${colors.accent}22` : colors.bgCard;
                if (answerChecked) {
                  if (opt.correct) {
                    borderColor = colors.success;
                    bgColor = `${colors.success}22`;
                  } else if (isSelected && !opt.correct) {
                    borderColor = colors.error;
                    bgColor = `${colors.error}22`;
                  }
                }
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (answerChecked) return;
                      playSound('click');
                      const newAnswers = [...testAnswers];
                      newAnswers[currentQuestion] = opt.id;
                      setTestAnswers(newAnswers);
                    }}
                    style={{
                      background: bgColor,
                      border: `2px solid ${borderColor}`,
                      borderRadius: '10px',
                      padding: '14px 16px',
                      textAlign: 'left',
                      cursor: answerChecked ? 'default' : 'pointer',
                      minHeight: '44px',
                    }}
                  >
                    <span style={{
                      display: 'inline-block',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: isSelected ? colors.accent : colors.bgSecondary,
                      color: isSelected ? 'white' : colors.textSecondary,
                      textAlign: 'center',
                      lineHeight: '24px',
                      marginRight: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}>
                      {opt.id.toUpperCase()}
                    </span>
                    <span style={{ color: colors.textPrimary, ...typo.small }}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Check Answer feedback */}
            {answerChecked && (
              <div style={{
                background: isCurrentCorrect ? `${colors.success}22` : `${colors.error}22`,
                border: `1px solid ${isCurrentCorrect ? colors.success : colors.error}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <p style={{ ...typo.body, color: isCurrentCorrect ? colors.success : colors.error, margin: 0, marginBottom: '8px', fontWeight: 600 }}>
                  {isCurrentCorrect ? 'Correct!' : 'Incorrect'}
                </p>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  {question.explanation}
                </p>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {currentQuestion > 0 && (
                <button
                  onClick={() => { setCurrentQuestion(currentQuestion - 1); setAnswerChecked(false); }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.textSecondary,
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  Previous
                </button>
              )}
              {/* Check Answer button */}
              {testAnswers[currentQuestion] && !answerChecked && (
                <button
                  onClick={() => {
                    setAnswerChecked(true);
                    playSound(isCurrentCorrect ? 'success' : 'failure');
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: colors.accent,
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 600,
                    minHeight: '44px',
                  }}
                >
                  Check Answer
                </button>
              )}
              {/* Next / Submit after checking */}
              {answerChecked && currentQuestion < 9 && (
                <button
                  onClick={() => { setCurrentQuestion(currentQuestion + 1); setAnswerChecked(false); }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: colors.accent,
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 600,
                    minHeight: '44px',
                  }}
                >
                  Next
                </button>
              )}
              {answerChecked && currentQuestion === 9 && (
                <button
                  onClick={() => {
                    const score = testAnswers.reduce((acc, ans, i) => {
                      const correct = testQuestions[i].options.find(o => o.correct)?.id;
                      return acc + (ans === correct ? 1 : 0);
                    }, 0);
                    setTestScore(score);
                    setTestSubmitted(true);
                    playSound(score >= 7 ? 'complete' : 'failure');
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: colors.success,
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 600,
                    minHeight: '44px',
                  }}
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          padding: '80px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '100px',
            marginBottom: '24px',
            animation: 'bounce 1s infinite',
          }}>
            🏆
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
            Memory Hierarchy Master!
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
            You now understand why fast and big memory can't coexist, and how this shapes everything from CPU design to AI inference.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '400px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              You Learned:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {[
                'Speed vs capacity trade-off at each level',
                'Cache hits vs misses and their impact',
                'Temporal and spatial locality principles',
                'AI workloads are memory-bound',
                'Bandwidth determines LLM inference speed',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: colors.success }}>Y</span>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '32px',
            maxWidth: '400px',
          }}>
            <p style={{ ...typo.body, color: colors.accent, margin: 0, fontStyle: 'italic' }}>
              "The memory wall is the defining challenge of modern computing."
            </p>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => goToPhase('hook')}
              style={{
                padding: '14px 28px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.textSecondary,
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              Play Again
            </button>
            <a
              href="/"
              style={{
                ...primaryButtonStyle,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Return to Dashboard
            </a>
          </div>

          {renderNavDots()}
        </div>
      </div>
    );
  }

  return null;
};

export default MemoryHierarchyRenderer;
