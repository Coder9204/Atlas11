'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

type ClockPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface ClockDistributionRendererProps {
  gamePhase?: string; // Optional - for resume functionality
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

const phaseOrder: ClockPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<ClockPhase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Play',
  review: 'Review',
  twist_predict: 'Twist',
  twist_play: 'Explore',
  twist_review: 'Explain',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery',
};

const ClockDistributionRenderer: React.FC<ClockDistributionRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase state management
  const getInitialPhase = (): ClockPhase => {
    if (gamePhase && phaseOrder.includes(gamePhase as ClockPhase)) {
      return gamePhase as ClockPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<ClockPhase>(getInitialPhase);
  const [isMobile, setIsMobile] = useState(false);
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Sync with external gamePhase if provided (for resume)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as ClockPhase)) {
      setPhase(gamePhase as ClockPhase);
    }
  }, [gamePhase]);

  // Detect mobile
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
  const goToPhase = useCallback((newPhase: ClockPhase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 300) return;
    if (isNavigating.current) return;
    lastClickRef.current = now;
    isNavigating.current = true;
    setPhase(newPhase);
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

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
  useEffect(() => {
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
    const width = 700;
    const height = 480;

    // Clock signal animation
    const clockPhaseAngle = (animationTime / 360) * 2 * Math.PI * 3;
    const clockValue = Math.sin(clockPhaseAngle) > 0 ? 1 : 0;

    // Pulse propagation animation (0-1 cycle every ~2 seconds)
    const pulseProgress = (animationTime % 120) / 120;

    // Skew animation (delayed arrivals at different points)
    const skewOffsets = [0, 0.05, 0.12, 0.08, 0.15, 0.10, 0.18, 0.06];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '700px' }}
        >
          <defs>
            {/* === PREMIUM LINEAR GRADIENTS === */}

            {/* Lab background gradient with depth */}
            <linearGradient id="clkdLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a0f1a" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a0f1a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Premium chip substrate gradient */}
            <linearGradient id="clkdChipSubstrate" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="20%" stopColor="#312e81" />
              <stop offset="50%" stopColor="#3730a3" />
              <stop offset="80%" stopColor="#312e81" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>

            {/* Circuit trace gradient - copper with depth */}
            <linearGradient id="clkdCopperTrace" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="15%" stopColor="#c084fc" />
              <stop offset="40%" stopColor="#a855f7" />
              <stop offset="60%" stopColor="#9333ea" />
              <stop offset="85%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>

            {/* Active clock signal pulse gradient */}
            <linearGradient id="clkdPulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
              <stop offset="30%" stopColor="#67e8f9" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#a5f3fc" stopOpacity="1" />
              <stop offset="70%" stopColor="#67e8f9" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>

            {/* PLL housing metal gradient */}
            <linearGradient id="clkdPLLMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="25%" stopColor="#16a34a" />
              <stop offset="50%" stopColor="#15803d" />
              <stop offset="75%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>

            {/* Waveform background gradient */}
            <linearGradient id="clkdWaveformBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="30%" stopColor="#1e293b" />
              <stop offset="70%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Metrics panel gradient */}
            <linearGradient id="clkdMetricsBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="20%" stopColor="#0f172a" />
              <stop offset="80%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* === RADIAL GRADIENTS FOR GLOW EFFECTS === */}

            {/* PLL core glow - oscillating source */}
            <radialGradient id="clkdPLLGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
              <stop offset="30%" stopColor="#22c55e" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#16a34a" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
            </radialGradient>

            {/* Clock buffer glow */}
            <radialGradient id="clkdBufferGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="1" />
              <stop offset="40%" stopColor="#a855f7" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#9333ea" stopOpacity="0" />
            </radialGradient>

            {/* Flip-flop active glow */}
            <radialGradient id="clkdFFActiveGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
              <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
            </radialGradient>

            {/* Skew warning glow */}
            <radialGradient id="clkdSkewWarning" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* Error state glow */}
            <radialGradient id="clkdErrorGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f87171" stopOpacity="1" />
              <stop offset="40%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </radialGradient>

            {/* === GLOW FILTERS === */}

            {/* PLL glow filter */}
            <filter id="clkdPLLBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Clock pulse glow filter */}
            <filter id="clkdPulseBlur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft trace glow */}
            <filter id="clkdTraceGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Flip-flop glow filter */}
            <filter id="clkdFFGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner shadow for depth */}
            <filter id="clkdInnerShadow">
              <feOffset dx="1" dy="1" />
              <feGaussianBlur stdDeviation="1" result="shadow" />
              <feComposite in="SourceGraphic" in2="shadow" operator="over" />
            </filter>

            {/* Grid pattern for chip surface */}
            <pattern id="clkdChipGrid" width="10" height="10" patternUnits="userSpaceOnUse">
              <rect width="10" height="10" fill="none" stroke="#4338ca" strokeWidth="0.3" strokeOpacity="0.3" />
            </pattern>

            {/* Via pattern for realistic circuit */}
            <pattern id="clkdViaPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1.5" fill="#6366f1" opacity="0.4" />
            </pattern>
          </defs>

          {/* === PREMIUM DARK LAB BACKGROUND === */}
          <rect width={width} height={height} fill="url(#clkdLabBg)" />

          {/* Subtle grid overlay */}
          <pattern id="clkdLabGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <rect width="30" height="30" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
          <rect width={width} height={height} fill="url(#clkdLabGrid)" />

          {/* === TITLE SECTION === */}
          <text x={width/2} y={28} fill={colors.textPrimary} fontSize={16} fontWeight="bold" textAnchor="middle" style={{ letterSpacing: '0.05em' }}>
            Clock Distribution Network
          </text>
          <text x={width/2} y={46} fill={colors.textMuted} fontSize={11} textAnchor="middle">
            H-Tree Topology with {treeDepth}-Level Buffering
          </text>

          {/* === PREMIUM CHIP VISUALIZATION === */}
          <g transform="translate(50, 70)">
            {/* Chip package outline with depth */}
            <rect x={-15} y={-15} width={290} height={230} rx={8} fill="#111827" stroke="#1f2937" strokeWidth={2} />
            <rect x={-10} y={-10} width={280} height={220} rx={6} fill="#0a0a0a" />

            {/* Die substrate with premium gradient */}
            <rect x={0} y={0} width={260} height={200} rx={4} fill="url(#clkdChipSubstrate)" stroke="#4f46e5" strokeWidth={1.5} />
            <rect x={0} y={0} width={260} height={200} rx={4} fill="url(#clkdChipGrid)" />
            <rect x={0} y={0} width={260} height={200} rx={4} fill="url(#clkdViaPattern)" opacity={0.3} />

            {/* Chip label */}
            <rect x={85} y={-28} width={90} height={16} rx={4} fill="#111827" stroke="#4f46e5" strokeWidth={0.5} />
            <text x={130} y={-17} fill={colors.textSecondary} fontSize={9} textAnchor="middle" fontWeight="bold">
              {chipSize}mm x {chipSize}mm Die
            </text>

            {/* === PLL (CLOCK SOURCE) AT CENTER === */}
            <g transform="translate(130, 100)">
              {/* PLL outer glow */}
              <circle cx={0} cy={0} r={28} fill="url(#clkdPLLGlow)" filter="url(#clkdPLLBlur)" opacity={clockValue ? 1 : 0.4}>
                <animate attributeName="r" values="24;30;24" dur="0.5s" repeatCount="indefinite" />
              </circle>

              {/* PLL housing */}
              <rect x={-22} y={-22} width={44} height={44} rx={6} fill="url(#clkdPLLMetal)" stroke="#4ade80" strokeWidth={1.5} />
              <rect x={-18} y={-18} width={36} height={36} rx={4} fill="#052e16" opacity={0.5} />

              {/* PLL core indicator */}
              <circle cx={0} cy={0} r={12} fill="#15803d" stroke="#22c55e" strokeWidth={2}>
                <animate attributeName="opacity" values="0.6;1;0.6" dur="0.3s" repeatCount="indefinite" />
              </circle>
              <circle cx={0} cy={0} r={6} fill="#4ade80">
                <animate attributeName="r" values="5;7;5" dur="0.3s" repeatCount="indefinite" />
              </circle>

              <text x={0} y={4} fill="white" fontSize={8} textAnchor="middle" fontWeight="bold">PLL</text>

              {/* PLL label */}
              <text x={0} y={38} fill={colors.pll} fontSize={8} textAnchor="middle" fontWeight="bold">Clock Source</text>
            </g>

            {/* === H-TREE CLOCK DISTRIBUTION NETWORK === */}

            {/* Level 1: Center to quadrant centers (thickest traces) */}
            <g filter="url(#clkdTraceGlow)">
              {/* Horizontal trunk */}
              <line x1={130} y1={100} x2={65} y2={100} stroke="url(#clkdCopperTrace)" strokeWidth={5} strokeLinecap="round" opacity={clockValue ? 1 : 0.4} />
              <line x1={130} y1={100} x2={195} y2={100} stroke="url(#clkdCopperTrace)" strokeWidth={5} strokeLinecap="round" opacity={clockValue ? 1 : 0.4} />
              {/* Vertical trunk */}
              <line x1={130} y1={100} x2={130} y2={50} stroke="url(#clkdCopperTrace)" strokeWidth={5} strokeLinecap="round" opacity={clockValue ? 1 : 0.4} />
              <line x1={130} y1={100} x2={130} y2={150} stroke="url(#clkdCopperTrace)" strokeWidth={5} strokeLinecap="round" opacity={clockValue ? 1 : 0.4} />

              {/* Level 1 buffer nodes */}
              {[[65, 100], [195, 100], [130, 50], [130, 150]].map(([x, y], i) => (
                <g key={`l1-${i}`}>
                  <circle cx={x} cy={y} r={8} fill="url(#clkdBufferGlow)" opacity={clockValue ? 0.8 : 0.3} />
                  <circle cx={x} cy={y} r={5} fill="#a855f7" stroke="#c084fc" strokeWidth={1} />
                </g>
              ))}
            </g>

            {/* Level 2: To quadrant edges */}
            {treeDepth >= 2 && (
              <g filter="url(#clkdTraceGlow)">
                {/* Top-left quadrant */}
                <line x1={65} y1={100} x2={65} y2={50} stroke="url(#clkdCopperTrace)" strokeWidth={3.5} opacity={clockValue ? 0.9 : 0.3} />
                <line x1={130} y1={50} x2={65} y2={50} stroke="url(#clkdCopperTrace)" strokeWidth={3.5} opacity={clockValue ? 0.9 : 0.3} />

                {/* Top-right quadrant */}
                <line x1={195} y1={100} x2={195} y2={50} stroke="url(#clkdCopperTrace)" strokeWidth={3.5} opacity={clockValue ? 0.9 : 0.3} />
                <line x1={130} y1={50} x2={195} y2={50} stroke="url(#clkdCopperTrace)" strokeWidth={3.5} opacity={clockValue ? 0.9 : 0.3} />

                {/* Bottom-left quadrant */}
                <line x1={65} y1={100} x2={65} y2={150} stroke="url(#clkdCopperTrace)" strokeWidth={3.5} opacity={clockValue ? 0.9 : 0.3} />
                <line x1={130} y1={150} x2={65} y2={150} stroke="url(#clkdCopperTrace)" strokeWidth={3.5} opacity={clockValue ? 0.9 : 0.3} />

                {/* Bottom-right quadrant */}
                <line x1={195} y1={100} x2={195} y2={150} stroke="url(#clkdCopperTrace)" strokeWidth={3.5} opacity={clockValue ? 0.9 : 0.3} />
                <line x1={130} y1={150} x2={195} y2={150} stroke="url(#clkdCopperTrace)" strokeWidth={3.5} opacity={clockValue ? 0.9 : 0.3} />

                {/* Level 2 buffer nodes */}
                {[[65, 50], [195, 50], [65, 150], [195, 150]].map(([x, y], i) => (
                  <g key={`l2-${i}`}>
                    <circle cx={x} cy={y} r={6} fill="url(#clkdBufferGlow)" opacity={clockValue ? 0.7 : 0.25} />
                    <circle cx={x} cy={y} r={4} fill="#9333ea" stroke="#a855f7" strokeWidth={1} />
                  </g>
                ))}
              </g>
            )}

            {/* Level 3: To corners */}
            {treeDepth >= 3 && (
              <g>
                {/* Top corners */}
                <line x1={65} y1={50} x2={30} y2={25} stroke="url(#clkdCopperTrace)" strokeWidth={2.5} opacity={clockValue ? 0.8 : 0.2} />
                <line x1={65} y1={50} x2={100} y2={25} stroke="url(#clkdCopperTrace)" strokeWidth={2.5} opacity={clockValue ? 0.8 : 0.2} />
                <line x1={195} y1={50} x2={160} y2={25} stroke="url(#clkdCopperTrace)" strokeWidth={2.5} opacity={clockValue ? 0.8 : 0.2} />
                <line x1={195} y1={50} x2={230} y2={25} stroke="url(#clkdCopperTrace)" strokeWidth={2.5} opacity={clockValue ? 0.8 : 0.2} />

                {/* Bottom corners */}
                <line x1={65} y1={150} x2={30} y2={175} stroke="url(#clkdCopperTrace)" strokeWidth={2.5} opacity={clockValue ? 0.8 : 0.2} />
                <line x1={65} y1={150} x2={100} y2={175} stroke="url(#clkdCopperTrace)" strokeWidth={2.5} opacity={clockValue ? 0.8 : 0.2} />
                <line x1={195} y1={150} x2={160} y2={175} stroke="url(#clkdCopperTrace)" strokeWidth={2.5} opacity={clockValue ? 0.8 : 0.2} />
                <line x1={195} y1={150} x2={230} y2={175} stroke="url(#clkdCopperTrace)" strokeWidth={2.5} opacity={clockValue ? 0.8 : 0.2} />
              </g>
            )}

            {/* Level 4: Extended mesh */}
            {treeDepth >= 4 && (
              <g opacity={0.7}>
                {/* Fine distribution lines */}
                <line x1={30} y1={25} x2={15} y2={15} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.7 : 0.15} />
                <line x1={30} y1={25} x2={45} y2={15} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.7 : 0.15} />
                <line x1={100} y1={25} x2={85} y2={15} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.7 : 0.15} />
                <line x1={100} y1={25} x2={115} y2={15} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.7 : 0.15} />
                <line x1={160} y1={25} x2={145} y2={15} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.7 : 0.15} />
                <line x1={160} y1={25} x2={175} y2={15} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.7 : 0.15} />
                <line x1={230} y1={25} x2={215} y2={15} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.7 : 0.15} />
                <line x1={230} y1={25} x2={245} y2={15} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.7 : 0.15} />

                <line x1={30} y1={175} x2={15} y2={185} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.7 : 0.15} />
                <line x1={30} y1={175} x2={45} y2={185} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.7 : 0.15} />
                <line x1={100} y1={175} x2={85} y2={185} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.7 : 0.15} />
                <line x1={100} y1={175} x2={115} y2={185} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.7 : 0.15} />
                <line x1={160} y1={175} x2={145} y2={185} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.7 : 0.15} />
                <line x1={160} y1={175} x2={175} y2={185} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.7 : 0.15} />
                <line x1={230} y1={175} x2={215} y2={185} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.7 : 0.15} />
                <line x1={230} y1={175} x2={245} y2={185} stroke={colors.clock} strokeWidth={1.5} opacity={clockValue ? 0.7 : 0.15} />
              </g>
            )}

            {/* === ANIMATED CLOCK PULSE PROPAGATION === */}
            {[0, 0.25, 0.5, 0.75].map((offset, i) => {
              const progress = (pulseProgress + offset) % 1;
              // Pulse travels from center outward
              const distance = progress * 150;
              const opacity = progress < 0.1 ? progress * 10 : progress > 0.8 ? (1 - progress) * 5 : 1;

              return (
                <g key={`pulse-${i}`} opacity={opacity * 0.8}>
                  {/* Expanding pulse ring */}
                  <circle
                    cx={130}
                    cy={100}
                    r={distance}
                    fill="none"
                    stroke="url(#clkdPulseGrad)"
                    strokeWidth={3}
                    filter="url(#clkdPulseBlur)"
                  />
                </g>
              );
            })}

            {/* === ENDPOINT FLIP-FLOPS/REGISTERS === */}
            {[
              [15, 15], [45, 15], [85, 15], [115, 15], [145, 15], [175, 15], [215, 15], [245, 15],
              [15, 185], [45, 185], [85, 185], [115, 185], [145, 185], [175, 185], [215, 185], [245, 185],
              [30, 25], [100, 25], [160, 25], [230, 25],
              [30, 175], [100, 175], [160, 175], [230, 175]
            ].map(([x, y], i) => {
              const delayed = Math.sin(clockPhaseAngle - skewOffsets[i % 8] * 2) > 0;
              const hasSkewIssue = metrics.skewPercentage > 10 && i === 7; // Far corner warning

              return (
                <g key={`ff-${i}`} filter={delayed ? "url(#clkdFFGlow)" : undefined}>
                  {/* Glow effect when active */}
                  {delayed && (
                    <circle cx={x} cy={y} r={10} fill={hasSkewIssue ? "url(#clkdErrorGlow)" : "url(#clkdFFActiveGlow)"} opacity={0.6} />
                  )}
                  {/* Flip-flop body */}
                  <rect
                    x={x - 6}
                    y={y - 6}
                    width={12}
                    height={12}
                    fill={delayed ? (hasSkewIssue ? colors.error : '#22d3ee') : 'rgba(34, 211, 238, 0.2)'}
                    stroke={hasSkewIssue ? colors.error : '#22d3ee'}
                    strokeWidth={1.5}
                    rx={2}
                  />
                  {/* Clock input indicator */}
                  <line x1={x - 6} y1={y} x2={x - 3} y2={y - 3} stroke={delayed ? 'white' : '#0891b2'} strokeWidth={1} />
                  <line x1={x - 6} y1={y} x2={x - 3} y2={y + 3} stroke={delayed ? 'white' : '#0891b2'} strokeWidth={1} />
                </g>
              );
            })}

            {/* Skew warning indicator on far corner */}
            {metrics.skewPercentage > 10 && (
              <g transform="translate(245, 185)">
                <circle cx={0} cy={0} r={18} fill="url(#clkdSkewWarning)" opacity={0.5}>
                  <animate attributeName="r" values="15;20;15" dur="0.8s" repeatCount="indefinite" />
                </circle>
                <text x={0} y={30} fill={colors.error} fontSize={8} textAnchor="middle" fontWeight="bold">SKEW!</text>
              </g>
            )}
          </g>

          {/* === CLOCK WAVEFORM VISUALIZATION === */}
          <g transform="translate(370, 80)">
            {/* Panel background */}
            <rect x={0} y={0} width={300} height={180} rx={8} fill="url(#clkdWaveformBg)" stroke="#334155" strokeWidth={1} />

            {/* Panel title */}
            <rect x={90} y={-12} width={120} height={20} rx={4} fill="#111827" stroke="#334155" strokeWidth={0.5} />
            <text x={150} y={3} fill={colors.textSecondary} fontSize={10} textAnchor="middle" fontWeight="bold">
              Clock Signal Comparison
            </text>

            {/* Reference clock (PLL output) */}
            <g transform="translate(15, 25)">
              <rect x={0} y={0} width={270} height={45} fill="rgba(0,0,0,0.3)" rx={4} />
              <rect x={0} y={0} width={60} height={45} fill="rgba(34, 197, 94, 0.15)" rx={4} />
              <text x={30} y={16} fill={colors.pll} fontSize={9} textAnchor="middle" fontWeight="bold">PLL</text>
              <text x={30} y={28} fill={colors.textMuted} fontSize={7} textAnchor="middle">Source</text>

              {/* Clean square wave */}
              <path
                d={`M 70 38 L 70 12 L 110 12 L 110 38 L 150 38 L 150 12 L 190 12 L 190 38 L 230 38 L 230 12 L 265 12`}
                stroke={colors.pll}
                strokeWidth={2.5}
                fill="none"
                filter="url(#clkdTraceGlow)"
              />

              {/* Period annotation */}
              <line x1={70} y1={42} x2={150} y2={42} stroke={colors.textMuted} strokeWidth={0.5} />
              <line x1={70} y1={40} x2={70} y2={44} stroke={colors.textMuted} strokeWidth={0.5} />
              <line x1={150} y1={40} x2={150} y2={44} stroke={colors.textMuted} strokeWidth={0.5} />
              <text x={110} y={50} fill={colors.textMuted} fontSize={7} textAnchor="middle">{metrics.clockPeriod.toFixed(0)}ps</text>
            </g>

            {/* Near endpoint clock */}
            <g transform="translate(15, 75)">
              <rect x={0} y={0} width={270} height={45} fill="rgba(0,0,0,0.3)" rx={4} />
              <rect x={0} y={0} width={60} height={45} fill="rgba(6, 182, 212, 0.15)" rx={4} />
              <text x={30} y={16} fill="#22d3ee" fontSize={9} textAnchor="middle" fontWeight="bold">Near</text>
              <text x={30} y={28} fill={colors.textMuted} fontSize={7} textAnchor="middle">Corner</text>

              {/* Slightly delayed wave */}
              <path
                d={`M 72 38 L 72 12 L 112 12 L 112 38 L 152 38 L 152 12 L 192 12 L 192 38 L 232 38 L 232 12 L 265 12`}
                stroke="#22d3ee"
                strokeWidth={2.5}
                fill="none"
                filter="url(#clkdTraceGlow)"
              />
            </g>

            {/* Far endpoint clock with skew */}
            <g transform="translate(15, 125)">
              <rect x={0} y={0} width={270} height={45} fill="rgba(0,0,0,0.3)" rx={4} />
              <rect x={0} y={0} width={60} height={45} fill={metrics.skewPercentage > 10 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'} rx={4} />
              <text x={30} y={16} fill={metrics.skewPercentage > 10 ? colors.error : colors.skew} fontSize={9} textAnchor="middle" fontWeight="bold">Far</text>
              <text x={30} y={28} fill={colors.textMuted} fontSize={7} textAnchor="middle">Corner</text>

              {/* Skewed wave - offset based on actual skew */}
              {(() => {
                const skewPixels = Math.min(15, metrics.skewPercentage * 0.8);
                return (
                  <path
                    d={`M ${70 + skewPixels} 38 L ${70 + skewPixels} 12 L ${110 + skewPixels} 12 L ${110 + skewPixels} 38 L ${150 + skewPixels} 38 L ${150 + skewPixels} 12 L ${190 + skewPixels} 12 L ${190 + skewPixels} 38 L ${230 + skewPixels} 38 L ${230 + skewPixels} 12 L 265 12`}
                    stroke={metrics.skewPercentage > 10 ? colors.error : colors.skew}
                    strokeWidth={2.5}
                    fill="none"
                    filter="url(#clkdTraceGlow)"
                  />
                );
              })()}

              {/* Skew indicator lines */}
              <line x1={70} y1={5} x2={70} y2={-25} stroke={colors.accent} strokeWidth={1} strokeDasharray="3,2" />
              <line x1={70 + Math.min(15, metrics.skewPercentage * 0.8)} y1={5} x2={70 + Math.min(15, metrics.skewPercentage * 0.8)} y2={-25} stroke={colors.accent} strokeWidth={1} strokeDasharray="3,2" />

              {/* Skew arrow and label */}
              <g transform={`translate(${70 + Math.min(7.5, metrics.skewPercentage * 0.4)}, -40)`}>
                <rect x={-25} y={-8} width={50} height={16} rx={3} fill={colors.accent} opacity={0.9} />
                <text x={0} y={4} fill="white" fontSize={8} textAnchor="middle" fontWeight="bold">
                  Skew: {metrics.clockTreeSkew.toFixed(1)}ps
                </text>
              </g>
            </g>
          </g>

          {/* === METRICS PANEL === */}
          <g transform="translate(370, 280)">
            <rect x={0} y={0} width={300} height={110} rx={8} fill="url(#clkdMetricsBg)" stroke="#334155" strokeWidth={1} />

            {/* Panel title */}
            <rect x={100} y={-12} width={100} height={20} rx={4} fill="#111827" stroke="#334155" strokeWidth={0.5} />
            <text x={150} y={3} fill={colors.textSecondary} fontSize={10} textAnchor="middle" fontWeight="bold">
              Timing Metrics
            </text>

            {/* Metric boxes */}
            {/* Clock Period */}
            <g transform="translate(15, 20)">
              <rect x={0} y={0} width={85} height={75} rx={6} fill="rgba(34, 197, 94, 0.1)" stroke={colors.pll} strokeWidth={1} />
              <text x={42} y={18} fill={colors.textMuted} fontSize={8} textAnchor="middle">Clock Period</text>
              <text x={42} y={42} fill={colors.pll} fontSize={18} textAnchor="middle" fontWeight="bold">{metrics.clockPeriod.toFixed(0)}</text>
              <text x={42} y={58} fill={colors.textMuted} fontSize={9} textAnchor="middle">picoseconds</text>
              <text x={42} y={70} fill={colors.textSecondary} fontSize={7} textAnchor="middle">{clockFrequency} GHz</text>
            </g>

            {/* Skew */}
            <g transform="translate(108, 20)">
              <rect x={0} y={0} width={85} height={75} rx={6} fill={metrics.skewPercentage > 10 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.1)'} stroke={metrics.skewPercentage > 10 ? colors.error : colors.skew} strokeWidth={1} />
              <text x={42} y={18} fill={colors.textMuted} fontSize={8} textAnchor="middle">Clock Skew</text>
              <text x={42} y={42} fill={metrics.skewPercentage > 10 ? colors.error : colors.skew} fontSize={18} textAnchor="middle" fontWeight="bold">
                {metrics.clockTreeSkew.toFixed(1)}
              </text>
              <text x={42} y={58} fill={colors.textMuted} fontSize={9} textAnchor="middle">picoseconds</text>
              <text x={42} y={70} fill={metrics.skewPercentage > 10 ? colors.error : colors.success} fontSize={7} textAnchor="middle" fontWeight="bold">
                {metrics.skewPercentage.toFixed(1)}% of period
              </text>
            </g>

            {/* Jitter */}
            <g transform="translate(200, 20)">
              <rect x={0} y={0} width={85} height={75} rx={6} fill="rgba(245, 158, 11, 0.1)" stroke={colors.jitter} strokeWidth={1} />
              <text x={42} y={18} fill={colors.textMuted} fontSize={8} textAnchor="middle">Jitter</text>
              <text x={42} y={42} fill={colors.jitter} fontSize={18} textAnchor="middle" fontWeight="bold">{metrics.jitter.toFixed(1)}</text>
              <text x={42} y={58} fill={colors.textMuted} fontSize={9} textAnchor="middle">picoseconds</text>
              <text x={42} y={70} fill={colors.textSecondary} fontSize={7} textAnchor="middle">{wireVariation}% variation</text>
            </g>
          </g>

          {/* === LEGEND === */}
          <g transform="translate(50, 405)">
            <rect x={0} y={0} width={280} height={60} rx={6} fill="rgba(15, 23, 42, 0.8)" stroke="#334155" strokeWidth={1} />
            <text x={140} y={15} fill={colors.textSecondary} fontSize={9} textAnchor="middle" fontWeight="bold">Legend</text>

            <g transform="translate(15, 28)">
              <circle cx={8} cy={8} r={6} fill={colors.pll} />
              <text x={22} y={12} fill={colors.textMuted} fontSize={8}>PLL (Clock Source)</text>
            </g>
            <g transform="translate(115, 28)">
              <circle cx={8} cy={8} r={5} fill="#a855f7" />
              <text x={22} y={12} fill={colors.textMuted} fontSize={8}>Buffer Node</text>
            </g>
            <g transform="translate(200, 28)">
              <rect x={3} y={3} width={10} height={10} fill="#22d3ee" rx={2} />
              <text x={22} y={12} fill={colors.textMuted} fontSize={8}>Flip-Flop</text>
            </g>

            <g transform="translate(15, 45)">
              <line x1={0} y1={5} x2={20} y2={5} stroke="url(#clkdCopperTrace)" strokeWidth={3} />
              <text x={28} y={9} fill={colors.textMuted} fontSize={8}>Clock Trace</text>
            </g>
            <g transform="translate(115, 45)">
              <circle cx={8} cy={5} r={8} fill="url(#clkdPulseGrad)" opacity={0.6} />
              <text x={22} y={9} fill={colors.textMuted} fontSize={8}>Signal Pulse</text>
            </g>
          </g>

          {/* === STATUS BAR === */}
          <g transform="translate(370, 410)">
            <rect x={0} y={0} width={300} height={55} rx={6} fill="rgba(15, 23, 42, 0.8)" stroke={metrics.skewPercentage > 10 ? colors.error : colors.success} strokeWidth={1} />

            <text x={150} y={18} fill={colors.textPrimary} fontSize={10} textAnchor="middle" fontWeight="bold">
              {clockFrequency} GHz Clock | {treeDepth}-Level Tree | {chipSize}mm Die
            </text>

            <text x={150} y={36} fill={metrics.skewPercentage > 10 ? colors.error : colors.success} fontSize={11} textAnchor="middle" fontWeight="bold">
              {metrics.skewPercentage > 10 ? 'WARNING: Skew exceeds 10% budget!' : 'Timing margin: OK'}
            </text>

            <text x={150} y={50} fill={colors.textMuted} fontSize={8} textAnchor="middle">
              Light speed in silicon: 86 mm/ns | Max frequency for this skew: {metrics.maxFreqForSkew.toFixed(1)} GHz
            </text>
          </g>
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

  const renderProgressBar = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: isMobile ? '6px' : '8px',
      padding: '12px 16px',
      background: colors.bgDark,
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      flexWrap: 'wrap' as const,
    }}>
      {phaseOrder.map((p, index) => {
        const currentIndex = phaseOrder.indexOf(phase);
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <button
            key={p}
            onClick={() => index <= currentIndex && goToPhase(p)}
            disabled={index > currentIndex}
            style={{
              ...buttonStyle,
              width: isMobile ? '28px' : '32px',
              height: isMobile ? '28px' : '32px',
              borderRadius: '50%',
              border: 'none',
              background: isCompleted ? colors.success : isCurrent ? colors.accent : 'rgba(255,255,255,0.1)',
              color: isCompleted || isCurrent ? 'white' : colors.textMuted,
              fontSize: isMobile ? '10px' : '11px',
              fontWeight: 'bold',
              cursor: index <= currentIndex ? 'pointer' : 'not-allowed',
              opacity: index > currentIndex ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={phaseLabels[p]}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );

  const renderBottomBar = (canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed' as const,
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
    }}>
      <button
        onClick={goBack}
        disabled={phase === 'hook'}
        style={{
          ...buttonStyle,
          padding: '12px 24px',
          borderRadius: '8px',
          border: `1px solid ${colors.textMuted}`,
          background: 'transparent',
          color: phase === 'hook' ? colors.textMuted : colors.textPrimary,
          fontWeight: 'bold',
          cursor: phase === 'hook' ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          opacity: phase === 'hook' ? 0.5 : 1,
        }}
      >
        Back
      </button>
      <button
        onClick={goNext}
        disabled={!canProceed}
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
        {renderProgressBar()}
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
        {renderBottomBar(true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
        {renderBottomBar(!!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
        {renderBottomBar(true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'light';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
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
        {renderBottomBar(true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
        {renderBottomBar(!!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
        {renderBottomBar(true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'both';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
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
        {renderBottomBar(true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
        {renderBottomBar(transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
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
          {renderBottomBar(testScore >= 7, testScore >= 7 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
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
        {renderProgressBar()}
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
        {renderBottomBar(true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default ClockDistributionRenderer;
