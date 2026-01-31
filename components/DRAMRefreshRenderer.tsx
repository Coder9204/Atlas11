'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// GAME 185: DRAM REFRESH
// ============================================================================
// Physics: DRAM stores bits as charge in capacitors that leak over time
// Refresh cycles must periodically restore charge to prevent data loss
// Temperature and memory speed affect refresh requirements
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface DRAMRefreshRendererProps {
  gamePhase?: Phase; // Optional for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgCardLight: '#1e293b',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  capacitor: '#3b82f6',
  charge: '#22d3ee',
  leak: '#f97316',
  border: '#334155',
};

// Phase order and labels for navigation
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Speed Tradeoff',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

const TEST_QUESTIONS = [
  // Q1: Core Concept - Why DRAM Needs Refresh (Easy)
  {
    scenario: "You design a memory chip with billions of tiny capacitors, each storing one bit of data as electric charge.",
    question: "Why does DRAM require periodic refresh cycles?",
    options: [
      { id: 'magnetic', label: "Magnetic fields from nearby components scramble the data" },
      { id: 'leakage', label: "Capacitors naturally leak charge over time, causing data loss without refresh", correct: true },
      { id: 'wear', label: "The capacitors physically wear out and need to be recharged" },
      { id: 'sync', label: "Refresh synchronizes data between different memory banks" },
    ],
    explanation: "DRAM capacitors are incredibly small (femtofarads) and charge leaks through junction currents and quantum tunneling. Without refresh every 32-64ms, the charge drops below the threshold needed to distinguish 1 from 0."
  },
  // Q2: Core Concept - Capacitor Storage (Easy)
  {
    scenario: "A computer engineer is explaining how DRAM stores the binary values 1 and 0 at the hardware level.",
    question: "How does a single DRAM cell physically represent a binary 1 versus a binary 0?",
    options: [
      { id: 'voltage', label: "High voltage on a wire = 1, low voltage = 0" },
      { id: 'capacitor', label: "Charged capacitor = 1, discharged capacitor = 0", correct: true },
      { id: 'magnetic', label: "North magnetic pole = 1, south pole = 0" },
      { id: 'transistor', label: "Transistor on = 1, transistor off = 0" },
    ],
    explanation: "Each DRAM cell has one transistor and one capacitor. A charged capacitor (above threshold) reads as 1, while a discharged capacitor (below threshold) reads as 0. The transistor acts as a switch to access the capacitor."
  },
  // Q3: Refresh Rate vs Data Integrity (Medium)
  {
    scenario: "A server administrator notices occasional memory errors. The DRAM is configured with a 64ms refresh interval, but the data center runs hot at 45C.",
    question: "What is the relationship between refresh rate and data integrity?",
    options: [
      { id: 'faster', label: "Faster refresh rate improves data integrity but consumes more power and bandwidth", correct: true },
      { id: 'slower', label: "Slower refresh rate improves data integrity by reducing electrical stress" },
      { id: 'none', label: "Refresh rate has no impact on data integrity, only on speed" },
      { id: 'random', label: "The relationship is random and depends on manufacturing quality" },
    ],
    explanation: "Higher temperatures accelerate charge leakage. If refresh is too slow, capacitors discharge below threshold before the next refresh, causing bit flips. Faster refresh prevents this but steals memory bandwidth and increases power consumption."
  },
  // Q4: DRAM vs SRAM Comparison (Medium)
  {
    scenario: "A chip designer must choose between DRAM and SRAM for a CPU cache that needs maximum speed with minimal latency.",
    question: "Why do CPU caches use SRAM instead of DRAM?",
    options: [
      { id: 'cheaper', label: "SRAM is cheaper to manufacture than DRAM" },
      { id: 'norefresh', label: "SRAM uses flip-flops that hold state without refresh, enabling faster access", correct: true },
      { id: 'smaller', label: "SRAM cells are smaller, allowing more cache on the chip" },
      { id: 'power', label: "SRAM uses less power than DRAM" },
    ],
    explanation: "SRAM uses 6 transistors per cell in a flip-flop configuration that actively maintains its state without refresh. This eliminates refresh overhead and enables sub-nanosecond access. The tradeoff: SRAM cells are 6x larger and more expensive than DRAM."
  },
  // Q5: Power Consumption During Refresh (Medium)
  {
    scenario: "A mobile phone engineer is optimizing battery life. The phone has 8GB of LPDDR5 RAM that must remain powered during sleep mode.",
    question: "How does DRAM refresh impact power consumption?",
    options: [
      { id: 'negligible', label: "Refresh uses negligible power compared to active memory operations" },
      { id: 'significant', label: "Refresh can consume 15-20% of total DRAM power, significant in idle/sleep modes", correct: true },
      { id: 'constant', label: "Refresh power is constant regardless of memory size or temperature" },
      { id: 'zero', label: "Modern DRAM uses zero power for refresh due to self-sustaining circuits" },
    ],
    explanation: "Refresh requires reading and rewriting every row in memory periodically. In idle modes, refresh becomes the dominant power consumer. LPDDR uses techniques like partial array self-refresh to only refresh active sections, extending battery life."
  },
  // Q6: Temperature Effects (Medium-Hard)
  {
    scenario: "A gaming laptop shows memory errors during intense gaming sessions when internal temperatures reach 85C, but works perfectly at room temperature.",
    question: "Why does high temperature cause memory errors in DRAM?",
    options: [
      { id: 'expansion', label: "Thermal expansion causes physical damage to memory cells" },
      { id: 'leakage', label: "Higher temperature exponentially increases charge leakage, reducing retention time", correct: true },
      { id: 'resistance', label: "Heat increases wire resistance, slowing down data transfer" },
      { id: 'timing', label: "The memory controller runs slower at high temperatures" },
    ],
    explanation: "Leakage current follows the Arrhenius equation - it roughly doubles for every 10C increase. At 85C, capacitors may lose charge in 16ms instead of 64ms. If refresh cannot keep up, bits flip. This is why servers use temperature-compensated refresh rates."
  },
  // Q7: Burst vs Distributed Refresh (Hard)
  {
    scenario: "A memory controller designer must choose between burst refresh (refresh all rows at once) and distributed refresh (spread refreshes evenly over time).",
    question: "What is the main advantage of distributed refresh over burst refresh?",
    options: [
      { id: 'power', label: "Distributed refresh uses less total power" },
      { id: 'latency', label: "Distributed refresh avoids long pauses, reducing worst-case memory access latency", correct: true },
      { id: 'simple', label: "Distributed refresh is simpler to implement in hardware" },
      { id: 'integrity', label: "Distributed refresh provides better data integrity" },
    ],
    explanation: "Burst refresh pauses all memory access while refreshing every row (potentially milliseconds). Distributed refresh spreads refreshes across time, so at most one row is being refreshed at any moment. This bounds worst-case latency, critical for real-time systems."
  },
  // Q8: DDR5 Improvements (Hard)
  {
    scenario: "DDR5 memory introduces same-bank refresh, allowing some banks to be refreshed while others remain accessible for read/write operations.",
    question: "How does DDR5's same-bank refresh improve over DDR4's all-bank refresh?",
    options: [
      { id: 'faster', label: "Individual banks refresh faster than all banks together" },
      { id: 'bandwidth', label: "Memory bandwidth remains partially available during refresh operations", correct: true },
      { id: 'power', label: "Same-bank refresh eliminates power consumption during refresh" },
      { id: 'simpler', label: "Same-bank refresh simplifies the memory controller design" },
    ],
    explanation: "DDR4 all-bank refresh blocks the entire memory during refresh. DDR5 same-bank refresh only blocks the bank being refreshed - other banks remain accessible. This can recover 5-10% of effective bandwidth that was previously lost to refresh."
  },
  // Q9: Retention Time Concept (Medium)
  {
    scenario: "A DRAM specification sheet lists 'retention time: 64ms at 85C' as a key parameter.",
    question: "What does retention time measure in DRAM specifications?",
    options: [
      { id: 'access', label: "The time required to read data from a memory cell" },
      { id: 'hold', label: "The maximum time a cell can hold its charge above the detection threshold", correct: true },
      { id: 'write', label: "The time required to write data to a memory cell" },
      { id: 'cycle', label: "The minimum time between consecutive memory operations" },
    ],
    explanation: "Retention time is how long a charged capacitor stays above the threshold voltage needed to read a valid 1. Refresh must occur before retention time expires. Hotter temperatures and faster memory generally have shorter retention times."
  },
  // Q10: Real-World Application - ECC Memory (Expert)
  {
    scenario: "A data center uses ECC (Error Correcting Code) memory that can detect and correct single-bit errors. The system logs show occasional corrected errors even with proper refresh timing.",
    question: "Why do single-bit errors still occur in properly refreshed ECC memory?",
    options: [
      { id: 'manufacturing', label: "Manufacturing defects cause some cells to fail randomly" },
      { id: 'cosmic', label: "Cosmic rays and alpha particles can flip bits between refresh cycles", correct: true },
      { id: 'software', label: "Software bugs in the memory controller cause bit flips" },
      { id: 'voltage', label: "Power supply fluctuations corrupt data during read operations" },
    ],
    explanation: "High-energy cosmic rays and alpha particles from packaging materials can deposit enough charge to flip a bit instantly - no refresh can prevent this. ECC memory adds extra bits to detect and correct these random 'soft errors', which is why servers require ECC for reliability."
  },
];

const TRANSFER_APPLICATIONS = [
  {
    title: 'Server Memory',
    description: 'Data centers run 24/7 with massive DRAM arrays. ECC (Error Correcting Code) memory adds extra bits to detect and fix errors caused by charge loss or cosmic rays.',
    question: 'Why do servers use ECC memory?',
    answer: 'ECC memory can detect and correct single-bit errors caused by charge leakage, cosmic rays, or electrical noise. This prevents crashes and data corruption in mission-critical systems.',
  },
  {
    title: 'Mobile Devices',
    description: 'Phones use LPDDR (Low Power DDR) memory with optimized refresh rates to extend battery life while maintaining performance.',
    question: 'How does LPDDR save power compared to standard DDR?',
    answer: 'LPDDR uses lower voltages, partial array self-refresh (only refreshing active sections), and temperature-compensated refresh rates to minimize power consumption.',
  },
  {
    title: 'Graphics Cards',
    description: 'GPUs use GDDR or HBM memory with extremely high bandwidth. These must balance refresh overhead with data throughput for gaming and AI workloads.',
    question: 'Why is refresh timing critical for GPU memory?',
    answer: 'GPUs need maximum bandwidth for rendering and compute. Refresh cycles steal bandwidth, so GDDR uses optimized refresh patterns that minimize interference with data transfers.',
  },
  {
    title: 'Embedded Systems',
    description: 'Cars, medical devices, and industrial controllers use special DRAM with extended temperature ranges and longer retention times for reliability.',
    question: 'Why do embedded systems need automotive-grade DRAM?',
    answer: 'Automotive environments have extreme temperatures (-40C to +125C). Higher temperatures increase leakage dramatically, requiring faster refresh rates and more robust cell designs.',
  },
];

const DRAMRefreshRenderer: React.FC<DRAMRefreshRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase state management
  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Responsive design
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

  // Simulation state
  const [refreshRate, setRefreshRate] = useState(64); // ms between refreshes
  const [temperature, setTemperature] = useState(25); // Celsius
  const [memorySpeed, setMemorySpeed] = useState(3200); // MHz
  const [isSimulating, setIsSimulating] = useState(false);
  const [time, setTime] = useState(0);
  const [cellCharges, setCellCharges] = useState<number[]>([100, 100, 100, 100, 100, 100, 100, 100]);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [dataLost, setDataLost] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);

  // Calculate leakage rate based on temperature and speed
  const getLeakageRate = useCallback(() => {
    const baseLeakage = 0.5; // % per ms
    const tempFactor = 1 + (temperature - 25) * 0.03; // 3% increase per degree above 25C
    const speedFactor = 1 + (memorySpeed - 2400) / 2400 * 0.2; // Faster memory leaks slightly more
    return baseLeakage * tempFactor * speedFactor;
  }, [temperature, memorySpeed]);

  // Simulation loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setTime(t => {
        const newTime = t + 1;

        // Check if refresh is due
        if (newTime - lastRefreshTime >= refreshRate) {
          setLastRefreshTime(newTime);
          setCellCharges([100, 100, 100, 100, 100, 100, 100, 100]);
          setDataLost(false);
        } else {
          // Apply leakage
          const leakage = getLeakageRate();
          setCellCharges(charges =>
            charges.map(c => {
              const newCharge = c - leakage;
              if (newCharge < 50) setDataLost(true);
              return Math.max(0, newCharge);
            })
          );
        }

        return newTime;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isSimulating, refreshRate, lastRefreshTime, getLeakageRate]);

  const resetSimulation = () => {
    setTime(0);
    setLastRefreshTime(0);
    setCellCharges([100, 100, 100, 100, 100, 100, 100, 100]);
    setDataLost(false);
    setIsSimulating(false);
  };

  const predictions = [
    { id: 'permanent', label: 'RAM stores data permanently in magnetic domains' },
    { id: 'capacitor', label: 'RAM stores data as electric charge that slowly leaks away' },
    { id: 'light', label: 'RAM stores data as light pulses in fiber optics' },
    { id: 'crystal', label: 'RAM stores data in crystal structures like an SSD' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Faster memory has the same refresh rate - speed does not affect storage' },
    { id: 'less', label: 'Faster memory needs less refresh - better technology means less leakage' },
    { id: 'more', label: 'Faster memory needs more frequent refresh - smaller capacitors leak faster' },
    { id: 'none', label: 'Faster memory eliminates refresh entirely with new technology' },
  ];

  const handleTestAnswer = (answerId: string) => {
    const newAnswers = [...testAnswers];
    newAnswers[currentTestIndex] = answerId;
    setTestAnswers(newAnswers);
  };

  const calculateTestScore = () => {
    return testAnswers.reduce((score, ans, i) => {
      const correct = TEST_QUESTIONS[i].options.find(o => o.correct)?.id;
      return score + (ans === correct ? 1 : 0);
    }, 0);
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
    const score = calculateTestScore();
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  // Visualization
  const renderDRAMVisualization = () => {
    const width = 400;
    const height = 300;
    const avgCharge = cellCharges.reduce((a, b) => a + b, 0) / cellCharges.length;
    const timeSinceRefresh = time - lastRefreshTime;
    const refreshProgress = Math.min(100, (timeSinceRefresh / refreshRate) * 100);

    return (
      <div style={{ width: '100%', maxWidth: '500px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ borderRadius: '12px' }}
        >
          <defs>
            {/* Premium chip substrate gradient */}
            <linearGradient id="dramChipSubstrate" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a1a2e" />
              <stop offset="25%" stopColor="#16213e" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f0f1a" />
            </linearGradient>

            {/* Capacitor body metallic gradient */}
            <linearGradient id="dramCapacitorBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="25%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="75%" stopColor="#334155" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Capacitor plate gradient */}
            <linearGradient id="dramCapacitorPlate" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="30%" stopColor="#475569" />
              <stop offset="70%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Charge level gradient - full charge */}
            <linearGradient id="dramChargeHigh" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="25%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="75%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#a5f3fc" />
            </linearGradient>

            {/* Charge level gradient - medium charge */}
            <linearGradient id="dramChargeMedium" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="25%" stopColor="#d97706" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#fcd34d" />
            </linearGradient>

            {/* Charge level gradient - low charge (critical) */}
            <linearGradient id="dramChargeLow" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#991b1b" />
              <stop offset="25%" stopColor="#b91c1c" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="75%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f87171" />
            </linearGradient>

            {/* Refresh progress bar gradient */}
            <linearGradient id="dramRefreshBar" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="25%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="75%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>

            {/* Refresh progress bar critical gradient */}
            <linearGradient id="dramRefreshBarCritical" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b91c1c" />
              <stop offset="25%" stopColor="#dc2626" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="75%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            {/* Leakage particle gradient */}
            <radialGradient id="dramLeakageGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fb923c" stopOpacity="1" />
              <stop offset="40%" stopColor="#f97316" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#ea580c" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#c2410c" stopOpacity="0" />
            </radialGradient>

            {/* Transistor gate gradient */}
            <linearGradient id="dramTransistorGate" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Circuit trace gradient */}
            <linearGradient id="dramCircuitTrace" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f766e" />
              <stop offset="50%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#0f766e" />
            </linearGradient>

            {/* Cell glow filter for charged state */}
            <filter id="dramCellGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Leakage glow filter */}
            <filter id="dramLeakageFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Refresh pulse glow */}
            <filter id="dramRefreshPulse" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Status indicator glow */}
            <filter id="dramStatusGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arrow marker for leakage */}
            <marker id="dramArrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="url(#dramLeakageGlow)" />
            </marker>

            {/* Grid pattern for chip background */}
            <pattern id="dramChipGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e3a5f" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Background with chip substrate */}
          <rect width={width} height={height} fill="url(#dramChipSubstrate)" />
          <rect width={width} height={height} fill="url(#dramChipGrid)" />

          {/* Memory cells grid */}
          {cellCharges.map((charge, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const x = 60 + col * 80;
            const y = 45 + row * 95;
            const chargeHeight = (charge / 100) * 45;
            const chargeGradient = charge > 70 ? 'url(#dramChargeHigh)' : charge > 50 ? 'url(#dramChargeMedium)' : 'url(#dramChargeLow)';
            const isRefreshing = timeSinceRefresh < 5 && charge > 95;

            return (
              <g key={i}>
                {/* Cell container with metallic border */}
                <rect
                  x={x - 2}
                  y={y - 2}
                  width={54}
                  height={74}
                  fill="url(#dramCapacitorBody)"
                  rx={6}
                  stroke="#475569"
                  strokeWidth={1}
                />

                {/* Capacitor plates visualization */}
                <rect x={x} y={y} width={50} height={3} fill="url(#dramCapacitorPlate)" rx={1} />
                <rect x={x} y={y + 67} width={50} height={3} fill="url(#dramCapacitorPlate)" rx={1} />

                {/* Dielectric layer (capacitor interior) */}
                <rect
                  x={x + 3}
                  y={y + 5}
                  width={44}
                  height={60}
                  fill="#0a0f1a"
                  rx={3}
                />

                {/* Charge level visualization with glow */}
                <g filter={charge > 70 ? 'url(#dramCellGlow)' : undefined}>
                  <rect
                    x={x + 5}
                    y={y + 62 - chargeHeight}
                    width={40}
                    height={chargeHeight}
                    fill={chargeGradient}
                    rx={2}
                    opacity={0.9}
                  />
                </g>

                {/* Charge particles (animated dots) */}
                {charge > 30 && Array.from({ length: Math.floor(charge / 25) }).map((_, idx) => (
                  <circle
                    key={idx}
                    cx={x + 10 + (idx % 3) * 15}
                    cy={y + 55 - Math.floor(idx / 3) * 12 - (charge / 100) * 20}
                    r={2}
                    fill={charge > 70 ? '#67e8f9' : charge > 50 ? '#fbbf24' : '#f87171'}
                    opacity={0.7 + Math.random() * 0.3}
                  >
                    {isSimulating && (
                      <animate
                        attributeName="opacity"
                        values="0.7;1;0.7"
                        dur="0.5s"
                        repeatCount="indefinite"
                      />
                    )}
                  </circle>
                ))}

                {/* Transistor gate (access transistor) */}
                <rect
                  x={x + 18}
                  y={y - 8}
                  width={14}
                  height={6}
                  fill="url(#dramTransistorGate)"
                  rx={2}
                />
                <rect x={x + 23} y={y - 12} width={4} height={4} fill="#fbbf24" />

                {/* Word line trace */}
                <line
                  x1={x - 10}
                  y1={y - 5}
                  x2={x + 60}
                  y2={y - 5}
                  stroke="url(#dramCircuitTrace)"
                  strokeWidth={2}
                  opacity={0.6}
                />

                {/* Bit line trace */}
                <line
                  x1={x + 25}
                  y1={y + 72}
                  x2={x + 25}
                  y2={y + 85}
                  stroke="url(#dramCircuitTrace)"
                  strokeWidth={2}
                  opacity={0.6}
                />

                {/* Leakage visualization (animated particles flowing down) */}
                {isSimulating && charge < 95 && charge > 10 && (
                  <g filter="url(#dramLeakageFilter)">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <circle
                        key={idx}
                        cx={x + 15 + idx * 10}
                        cy={y + 65}
                        r={2}
                        fill="url(#dramLeakageGlow)"
                      >
                        <animate
                          attributeName="cy"
                          values={`${y + 65};${y + 80};${y + 65}`}
                          dur={`${0.8 + idx * 0.2}s`}
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.8;0.3;0.8"
                          dur={`${0.8 + idx * 0.2}s`}
                          repeatCount="indefinite"
                        />
                      </circle>
                    ))}
                  </g>
                )}

                {/* Refresh pulse animation */}
                {isRefreshing && (
                  <rect
                    x={x + 3}
                    y={y + 5}
                    width={44}
                    height={60}
                    fill="#22d3ee"
                    opacity={0.3}
                    rx={3}
                  >
                    <animate
                      attributeName="opacity"
                      values="0.5;0;0.5"
                      dur="0.3s"
                      repeatCount="3"
                    />
                  </rect>
                )}
              </g>
            );
          })}

          {/* Refresh cycle indicator arc */}
          <g transform={`translate(${width / 2}, 235)`}>
            {/* Background arc */}
            <path
              d={`M -140 0 A 140 140 0 0 1 140 0`}
              fill="none"
              stroke="#1e293b"
              strokeWidth={12}
              strokeLinecap="round"
            />
            {/* Progress arc */}
            <path
              d={`M -140 0 A 140 140 0 0 1 ${-140 + 280 * (1 - refreshProgress / 100)} ${-Math.sin(Math.acos((280 * (1 - refreshProgress / 100) - 140) / 140)) * 140 || 0}`}
              fill="none"
              stroke={refreshProgress > 80 ? 'url(#dramRefreshBarCritical)' : 'url(#dramRefreshBar)'}
              strokeWidth={12}
              strokeLinecap="round"
              filter={refreshProgress > 80 ? 'url(#dramRefreshPulse)' : undefined}
            />
          </g>

          {/* Status indicators */}
          <g transform="translate(50, 260)">
            {/* Charge status */}
            <rect
              x={0}
              y={0}
              width={140}
              height={30}
              fill="#0f172a"
              rx={8}
              stroke={avgCharge > 70 ? '#22d3ee' : avgCharge > 50 ? '#fbbf24' : '#ef4444'}
              strokeWidth={1}
              strokeOpacity={0.5}
            />
            <circle
              cx={20}
              cy={15}
              r={6}
              fill={avgCharge > 70 ? '#22d3ee' : avgCharge > 50 ? '#fbbf24' : '#ef4444'}
              filter="url(#dramStatusGlow)"
            />

            {/* Data status */}
            <rect
              x={160}
              y={0}
              width={140}
              height={30}
              fill="#0f172a"
              rx={8}
              stroke={dataLost ? '#ef4444' : '#10b981'}
              strokeWidth={1}
              strokeOpacity={0.5}
            />
            <circle
              cx={180}
              cy={15}
              r={6}
              fill={dataLost ? '#ef4444' : '#10b981'}
              filter="url(#dramStatusGlow)"
            >
              {dataLost && (
                <animate
                  attributeName="opacity"
                  values="1;0.3;1"
                  dur="0.5s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
          </g>
        </svg>

        {/* Text labels outside SVG using typo system */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', padding: '0 50px' }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.9)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: `1px solid ${avgCharge > 70 ? 'rgba(34, 211, 238, 0.3)' : avgCharge > 50 ? 'rgba(251, 191, 36, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          }}>
            <span style={{
              fontSize: typo.small,
              fontWeight: 600,
              color: avgCharge > 70 ? colors.charge : avgCharge > 50 ? colors.warning : colors.error,
            }}>
              Avg Charge: {avgCharge.toFixed(0)}%
            </span>
          </div>
          <div style={{
            background: 'rgba(15, 23, 42, 0.9)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: `1px solid ${dataLost ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          }}>
            <span style={{
              fontSize: typo.small,
              fontWeight: 700,
              color: dataLost ? colors.error : colors.success,
            }}>
              {dataLost ? 'DATA LOST!' : 'Data Intact'}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '4px' }}>
          <span style={{
            fontSize: typo.small,
            color: refreshProgress > 80 ? colors.error : colors.accent,
            fontWeight: 600,
          }}>
            Refresh in: {Math.max(0, refreshRate - timeSinceRefresh).toFixed(0)}ms
          </span>
        </div>
      </div>
    );
  };

  // Progress bar component
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '10px 12px' : '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: isMobile ? '12px' : '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
          <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px' }}>
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                onClick={() => i < currentIdx && goToPhase(p)}
                style={{
                  height: isMobile ? '10px' : '8px',
                  width: i === currentIdx ? (isMobile ? '20px' : '24px') : (isMobile ? '10px' : '8px'),
                  borderRadius: '5px',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : colors.border,
                  cursor: i < currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s',
                  minWidth: isMobile ? '10px' : '8px',
                  minHeight: isMobile ? '10px' : '8px'
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

  // Bottom navigation bar
  const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = canGoBack && currentIdx > 0;

    const handleBack = () => {
      if (canBack) {
        goToPhase(phaseOrder[currentIdx - 1]);
      }
    };

    const handleNext = () => {
      if (!canGoNext) return;
      if (onNext) {
        onNext();
      } else if (currentIdx < phaseOrder.length - 1) {
        goToPhase(phaseOrder[currentIdx + 1]);
      }
    };

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px' : '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: '12px',
        flexShrink: 0
      }}>
        <button
          onClick={handleBack}
          style={{
            padding: isMobile ? '10px 16px' : '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: isMobile ? '13px' : '14px',
            backgroundColor: colors.bgCardLight,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '44px'
          }}
        >
          Back
        </button>

        <span style={{
          fontSize: '12px',
          color: colors.textMuted,
          fontWeight: 600
        }}>
          {phaseLabels[phase]}
        </span>

        <button
          onClick={handleNext}
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: isMobile ? '13px' : '14px',
            background: canGoNext ? `linear-gradient(135deg, ${colors.accent} 0%, #a78bfa 100%)` : colors.bgCardLight,
            color: canGoNext ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            boxShadow: canGoNext ? `0 2px 12px ${colors.accent}30` : 'none',
            minHeight: '44px'
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  const buttonStyle = {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    fontSize: '14px',
    WebkitTapHighlightColor: 'transparent' as const,
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Why Does RAM Forget Everything?
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              The physics of volatile memory
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderDRAMVisualization()}
          </div>

          <div style={{ padding: '24px' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Every time you turn off your computer, all the RAM goes blank. Programs disappear,
                unsaved work vanishes. Yet SSDs and hard drives remember everything. What makes
                RAM so forgetful?
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The answer lies in tiny capacitors that are constantly fighting physics.
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                DRAM capacitors hold charge measured in femtofarads - that is 0.000000000000001 farads!
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>How Does DRAM Store Data?</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Each bit needs to be stored somehow
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderDRAMVisualization()}
          </div>

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What stores the 1s and 0s in DRAM?
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
                    background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
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
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>DRAM Refresh Lab</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Watch capacitors leak and see why refresh is essential
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderDRAMVisualization()}
          </div>

          <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Refresh Rate: {refreshRate}ms (every {refreshRate}ms)
              </label>
              <input
                type="range"
                min="16"
                max="128"
                value={refreshRate}
                onChange={(e) => setRefreshRate(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Temperature: {temperature}C
              </label>
              <input
                type="range"
                min="0"
                max="85"
                value={temperature}
                onChange={(e) => setTemperature(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
              <button
                onClick={() => setIsSimulating(!isSimulating)}
                style={{
                  ...buttonStyle,
                  background: isSimulating ? colors.error : colors.success,
                  color: 'white',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {isSimulating ? 'Pause' : 'Start Simulation'}
              </button>
              <button
                onClick={resetSimulation}
                style={{
                  ...buttonStyle,
                  background: 'transparent',
                  border: `1px solid ${colors.accent}`,
                  color: colors.accent,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Reset
              </button>
            </div>

            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '8px',
              marginTop: '16px',
            }}>
              <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Key Observations:</h4>
              <ul style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, paddingLeft: '20px' }}>
                <li>Charge leaks continuously from each capacitor</li>
                <li>Below 50% charge, data bits flip (errors!)</li>
                <li>Refresh restores all cells to 100%</li>
                <li>Higher temperature = faster leakage</li>
              </ul>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'capacitor';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
              DRAM stores each bit as electric charge in a tiny capacitor. The capacitors are so
              small that charge naturally leaks away through quantum tunneling and parasitic paths.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of DRAM</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Capacitor Storage:</strong> Each DRAM cell
                has one transistor and one capacitor. A charged capacitor = 1, discharged = 0.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Charge Leakage:</strong> Capacitors lose
                charge through junction leakage, subthreshold conduction, and quantum tunneling.
                Typical retention time is 32-64ms.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Refresh Cycles:</strong> Every few
                milliseconds, the memory controller reads each row and rewrites it, restoring
                full charge to all capacitors.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Power Cost:</strong> Refresh consumes
                about 15-20% of DRAM power and temporarily blocks read/write operations.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: The Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Speed Paradox</h2>
            <p style={{ color: colors.textSecondary }}>
              What happens when we make memory faster?
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              DDR4-2400 runs at 2400 MHz. DDR5-6400 runs at 6400 MHz - nearly 3x faster!
              But to achieve this speed, the capacitors must be smaller and closer together.
            </p>
          </div>

          <div style={{ padding: '16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does faster memory affect refresh requirements?
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
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Speed vs Power Trade-off</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Explore how memory speed affects refresh needs
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px' }}>
            {renderDRAMVisualization()}
          </div>

          <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Memory Speed: DDR5-{memorySpeed}
              </label>
              <input
                type="range"
                min="2400"
                max="8000"
                step="400"
                value={memorySpeed}
                onChange={(e) => setMemorySpeed(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Refresh Rate: {refreshRate}ms
              </label>
              <input
                type="range"
                min="16"
                max="128"
                value={refreshRate}
                onChange={(e) => setRefreshRate(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setIsSimulating(!isSimulating)}
                style={{
                  ...buttonStyle,
                  background: isSimulating ? colors.error : colors.success,
                  color: 'white',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {isSimulating ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={resetSimulation}
                style={{
                  ...buttonStyle,
                  background: 'transparent',
                  border: `1px solid ${colors.warning}`,
                  color: colors.warning,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Reset
              </button>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              marginTop: '16px',
              borderLeft: `3px solid ${colors.warning}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                <strong>Observation:</strong> At DDR5-{memorySpeed}, leakage rate is {getLeakageRate().toFixed(2)}%/ms.
                {memorySpeed > 4800 && ' Faster memory needs more frequent refresh to stay stable!'}
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'more';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
              Faster memory requires MORE frequent refresh, not less! Smaller capacitors at
              tighter pitches have higher leakage rates and less charge margin.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Speed-Power Trade-off</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Smaller Capacitors:</strong> Higher speed
                requires smaller cells. DDR5 cells are ~40% smaller than DDR4, holding less charge.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>More Leakage:</strong> Smaller geometry
                means more parasitic leakage paths and worse retention time.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>DDR5 Solution:</strong> DDR5 uses
                same-bank refresh to refresh smaller portions more frequently, reducing
                overall power impact while maintaining data integrity.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Power Paradox:</strong> Faster memory
                can actually use MORE power due to increased refresh overhead!
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
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
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    const currentQ = TEST_QUESTIONS[currentTestIndex];
    const totalQuestions = TEST_QUESTIONS.length;
    const passed = testScore >= 7;

    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{ padding: isMobile ? '16px' : '24px', maxWidth: '672px', margin: '0 auto' }}>
              {/* Score Summary */}
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
                  background: passed ? `${colors.success}20` : `${colors.warning}20`,
                  border: `3px solid ${passed ? colors.success : colors.warning}`
                }}>
                  {testScore === totalQuestions ? 'Trophy' : testScore >= 9 ? 'Star' : testScore >= 7 ? 'Check' : 'Book'}
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '4px', color: colors.textPrimary }}>
                  {testScore}/{totalQuestions} Correct
                </h2>
                <p style={{ fontSize: '14px', marginBottom: '16px', color: passed ? colors.success : colors.warning }}>
                  {testScore === totalQuestions ? "Perfect! You've mastered DRAM refresh!" :
                   testScore >= 9 ? 'Excellent! You deeply understand memory concepts.' :
                   testScore >= 7 ? 'Great job! You understand the key concepts.' :
                   'Keep exploring - memory technology takes time!'}
                </p>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
                  <button
                    onClick={() => {
                      setCurrentTestIndex(0);
                      setTestAnswers(new Array(10).fill(null));
                      setTestSubmitted(false);
                      setTestScore(0);
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
                      border: `1px solid ${colors.border}`,
                      cursor: 'pointer',
                      zIndex: 10,
                      position: 'relative'
                    }}
                  >
                    Retake Test
                  </button>
                  <button
                    onClick={() => goToPhase('mastery')}
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
                      position: 'relative'
                    }}
                  >
                    {passed ? 'Claim Mastery' : 'Review Lesson'}
                  </button>
                </div>
              </div>

              {/* Question-by-Question Review */}
              <div style={{ marginBottom: '16px' }}>
                <p style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '12px',
                  color: colors.textMuted
                }}>
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
                        background: isCorrect ? `${colors.success}15` : `${colors.error}15`
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
                            {isCorrect ? 'Y' : 'N'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '14px', fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                              Question {i + 1}
                            </p>
                            <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>{q.question}</p>
                          </div>
                        </div>
                      </div>

                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{
                          padding: '12px',
                          borderRadius: '12px',
                          background: isCorrect ? `${colors.success}10` : `${colors.error}10`,
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
                            background: `${colors.success}10`,
                            border: `1px solid ${colors.success}30`
                          }}>
                            <p style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              marginBottom: '4px',
                              color: colors.success
                            }}>
                              Correct Answer
                            </p>
                            <p style={{ fontSize: '14px', color: colors.textPrimary, margin: 0 }}>
                              {correctOption?.label}
                            </p>
                          </div>
                        )}

                        <div style={{
                          padding: '12px',
                          borderRadius: '12px',
                          background: colors.bgCardLight
                        }}>
                          <p style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            marginBottom: '4px',
                            color: colors.accent
                          }}>
                            Why?
                          </p>
                          <p style={{ fontSize: '12px', lineHeight: 1.5, color: colors.textSecondary, margin: 0 }}>
                            {q.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Retake Button at Bottom */}
              <div style={{
                marginTop: '24px',
                padding: '16px',
                borderRadius: '16px',
                textAlign: 'center',
                background: colors.bgCard,
                border: `1px solid ${colors.border}`
              }}>
                <p style={{ fontSize: '14px', marginBottom: '12px', color: colors.textSecondary }}>
                  {passed ? 'Want to improve your score?' : 'Review the explanations above and try again!'}
                </p>
                <button
                  onClick={() => {
                    setCurrentTestIndex(0);
                    setTestAnswers(new Array(10).fill(null));
                    setTestSubmitted(false);
                    setTestScore(0);
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
                    position: 'relative'
                  }}
                >
                  Retake Test
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const allAnswered = testAnswers.every(a => a !== null);

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: isMobile ? '16px' : '24px', maxWidth: '672px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
              <p style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '8px',
                color: colors.warning
              }}>
                Step 8 - Knowledge Test
              </p>
              <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '16px', color: colors.textPrimary }}>
                Question {currentTestIndex + 1} of {totalQuestions}
              </h2>

              {/* Progress Bar */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {Array.from({ length: totalQuestions }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      height: '8px',
                      flex: 1,
                      borderRadius: '9999px',
                      background: i === currentTestIndex ? colors.warning :
                                  i < currentTestIndex ? colors.success :
                                  testAnswers[i] !== null ? colors.accent : colors.bgCardLight
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Scenario Box */}
            <div style={{
              padding: '20px',
              borderRadius: '16px',
              marginBottom: '24px',
              background: `${colors.accent}15`,
              border: `1px solid ${colors.accent}30`
            }}>
              <p style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '8px',
                color: colors.accent
              }}>
                Scenario
              </p>
              <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0 }}>
                {currentQ.scenario}
              </p>
            </div>

            {/* Question */}
            <p style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', color: colors.textPrimary }}>
              {currentQ.question}
            </p>

            {/* Answer Options */}
            <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
              {currentQ.options.map((opt, i) => (
                <button
                  key={opt.id}
                  onClick={() => handleTestAnswer(opt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '20px',
                    borderRadius: '16px',
                    textAlign: 'left',
                    background: testAnswers[currentTestIndex] === opt.id ? `${colors.warning}20` : colors.bgCard,
                    border: `2px solid ${testAnswers[currentTestIndex] === opt.id ? colors.warning : colors.border}`,
                    cursor: 'pointer',
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: testAnswers[currentTestIndex] === opt.id ? colors.warning : colors.bgCardLight,
                    flexShrink: 0
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

            {/* Navigation Buttons */}
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
                  opacity: currentTestIndex === 0 ? 0.5 : 1,
                  zIndex: 10,
                  position: 'relative'
                }}
              >
                Previous
              </button>
              {currentTestIndex < TEST_QUESTIONS.length - 1 ? (
                <button
                  onClick={nextTestQuestion}
                  disabled={!testAnswers[currentTestIndex]}
                  style={{
                    ...buttonStyle,
                    background: testAnswers[currentTestIndex] ? colors.accent : colors.bgCardLight,
                    color: testAnswers[currentTestIndex] ? 'white' : colors.textMuted,
                    cursor: testAnswers[currentTestIndex] ? 'pointer' : 'not-allowed',
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  Next Question
                </button>
              ) : (
                <button
                  onClick={submitTest}
                  disabled={!allAnswered}
                  style={{
                    ...buttonStyle,
                    background: allAnswered ? colors.success : colors.bgCardLight,
                    color: allAnswered ? 'white' : colors.textMuted,
                    cursor: allAnswered ? 'pointer' : 'not-allowed',
                    zIndex: 10,
                    position: 'relative'
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You understand DRAM refresh and volatile memory physics
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
              <li>DRAM stores bits as charge in tiny capacitors</li>
              <li>Capacitors leak charge continuously (retention time ~64ms)</li>
              <li>Refresh cycles read and rewrite each cell periodically</li>
              <li>Faster memory has smaller cells that leak faster</li>
              <li>Temperature dramatically affects leakage rate</li>
              <li>Refresh consumes power and reduces available bandwidth</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(139, 92, 246, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Modern memory research explores alternatives like FeRAM (ferroelectric), MRAM
              (magnetic), and ReRAM (resistive) that do not need refresh. These non-volatile
              technologies could someday replace DRAM for instant-on computers!
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
            {renderDRAMVisualization()}
          </div>
        </div>
        {renderBottomBar(false, true, 'Complete')}
      </div>
    );
  }

  return null;
};

export default DRAMRefreshRenderer;
