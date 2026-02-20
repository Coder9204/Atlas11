'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import TransferPhaseView from './TransferPhaseView';

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
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'Twist',
  twist_play: 'Explore',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery Complete',
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
    // Speed of light in silicon (c/3.5 due to dielectric) in mm/ns
    const lightSpeedMmPerNs = 300 / 3.5; // 85.7 mm/ns

    // Clock period in ns
    const clockPeriod = 1 / clockFrequency; // ns

    // Time for light to cross chip in ns
    const lightCrossingTime = chipSize / lightSpeedMmPerNs; // ns

    // Maximum theoretical skew (corner to corner without repeaters) in ns
    const maxSkew = lightCrossingTime * Math.sqrt(2); // diagonal, ns

    // Skew with clock tree (reduced by factor of tree depth) in ns
    const clockTreeSkew = maxSkew / (2 ** (treeDepth - 1)); // ns

    // Jitter from wire variation in ns
    const jitter = clockTreeSkew * (wireVariation / 100); // ns

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
      description: 'Modern CPUs running at 5 GHz have 10 billion transistors across a 20mm die. Each core has its own clock domain, synchronized by a global reference at 100 MHz.',
      question: 'Why do multi-core CPUs use multiple clock domains instead of one global clock?',
      answer: 'A single global clock at 5 GHz across a 20mm chip would have intolerable skew. Instead, each core runs its own local clock, synchronized to a lower-frequency global reference. This allows high local frequencies with manageable inter-core timing.',
    },
    {
      title: 'DDR Memory Timing',
      description: 'DDR5 memory runs at 4800 MHz with timing margins of just 50 ps. The memory controller must precisely time when to sample incoming data across 64 GB modules.',
      question: 'Why does DDR use source-synchronous clocking with the data?',
      answer: 'Sending a clock with the data ensures the clock and data experience the same delay. The receiver can use this clock to sample data reliably, regardless of absolute propagation time. This is called source-synchronous design.',
    },
    {
      title: 'High-Frequency Trading Systems',
      description: 'Financial trading systems measure time in nanoseconds at 10 GHz clock rates. A difference of 10 ns can mean $14 million in profit.',
      question: 'Why do HFT systems use GPS for clock synchronization?',
      answer: 'GPS provides nanosecond-accurate time worldwide. HFT systems use this to synchronize clocks across data centers thousands of miles apart, ensuring fair market access and regulatory compliance.',
    },
    {
      title: 'Network Switch Fabric',
      description: 'Data center switches move 400 GB per second across 48 ports at 25 GHz SerDes rates. All ports must be synchronized to route packets correctly.',
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

  const realWorldApps = [
    {
      icon: '💻',
      title: 'High-Speed Processors',
      short: 'CPU Clock Trees',
      tagline: 'The heartbeat of modern computing',
      description: 'Modern CPUs running at 5+ GHz require clock signals to reach billions of transistors within picoseconds of each other. Clock tree synthesis is one of the most critical steps in chip design, using H-tree topologies and matched buffer chains to minimize skew across the entire die.',
      connection: 'Just like our simulation shows, real processors face the speed-of-light limit. A 20mm die at 5 GHz has a clock period of only 200ps, but light in silicon takes about 235ps to cross the diagonal. Engineers use hierarchical clock domains and careful buffer placement to manage this fundamental constraint.',
      howItWorks: 'Clock tree synthesis tools automatically insert buffers to balance delays. The H-tree structure ensures equal wire length from the PLL to every flip-flop. Modern chips also use mesh clock networks where redundant paths provide multiple routes for the clock signal, averaging out local variations.',
      stats: [
        { value: '5+ GHz', label: 'Modern CPU frequencies' },
        { value: '<10ps', label: 'Skew tolerance target' },
        { value: '40%', label: 'Power from clock network' }
      ],
      examples: [
        'Intel Alder Lake uses hybrid clock domains for P-cores and E-cores',
        'Apple M-series chips have independent clock islands for GPU clusters',
        'AMD Zen 4 uses mesh clock distribution for low skew',
        'ARM Cortex designs include built-in clock gating for power savings'
      ],
      companies: ['Intel', 'AMD', 'Apple', 'ARM', 'Qualcomm'],
      futureImpact: 'As chips approach 3nm and beyond, clock distribution becomes even more challenging. Future designs will likely use optical clock distribution, on-chip resonators, or fully asynchronous architectures to overcome the fundamental limits of electrical signal propagation.',
      color: '#3b82f6'
    },
    {
      icon: '🌐',
      title: 'Data Center Synchronization',
      short: 'Network Timing',
      tagline: 'Keeping the cloud in perfect time',
      description: 'Data centers must synchronize thousands of servers to coordinate distributed transactions, ensure cache coherency, and maintain accurate timestamps. Precision Time Protocol (PTP) can achieve sub-microsecond synchronization across entire facilities, critical for financial transactions and distributed databases.',
      connection: 'The clock skew challenges on a chip scale up to building-wide networks. Just as different corners of a CPU see the clock at different times, different racks in a data center experience varying network delays. The same principles of careful path matching and hierarchical distribution apply.',
      howItWorks: 'PTP uses a master-slave hierarchy where grandmaster clocks (often GPS-synchronized) distribute time through boundary clocks to end devices. Hardware timestamping at each network interface eliminates software jitter. White Rabbit technology extends PTP to sub-nanosecond accuracy using synchronous Ethernet.',
      stats: [
        { value: '<1 us', label: 'PTP synchronization accuracy' },
        { value: '<100 ns', label: 'White Rabbit precision' },
        { value: '10,000+', label: 'Servers synchronized per cluster' }
      ],
      examples: [
        'Google Spanner uses TrueTime API with GPS and atomic clocks',
        'Stock exchanges require nanosecond timestamps for trade ordering',
        'AWS Time Sync Service provides microsecond accuracy to instances',
        '5G networks use precise timing for handoff coordination'
      ],
      companies: ['Google', 'Amazon AWS', 'Microsoft Azure', 'Cisco', 'Meinberg'],
      futureImpact: 'Quantum computing and distributed quantum networks will require even tighter synchronization. Future data centers may use optical atomic clocks and quantum-entangled timing distribution to achieve femtosecond-level synchronization across continental distances.',
      color: '#10b981'
    },
    {
      icon: '📡',
      title: '5G Base Stations',
      short: 'Telecom Timing',
      tagline: 'Precision timing enables next-gen wireless',
      description: '5G networks require unprecedented timing precision for features like beamforming, massive MIMO, and carrier aggregation. Base stations must synchronize their transmissions to within nanoseconds to prevent interference and enable seamless handoffs between cells.',
      connection: 'Each antenna element in a 5G massive MIMO array needs precisely timed signals, similar to flip-flops on a chip needing synchronized clock edges. Phase coherence across 64 or more antenna elements requires managing picosecond-level timing differences.',
      howItWorks: 'Base stations use GNSS receivers for absolute time reference, combined with IEEE 1588 PTP for backhaul synchronization. Fronthaul connections to remote radio heads use enhanced Common Public Radio Interface (eCPRI) with strict timing requirements. Local oscillators are disciplined to maintain holdover during GPS outages.',
      stats: [
        { value: '±130 ns', label: 'Phase sync requirement' },
        { value: '64-256', label: 'MIMO antenna elements' },
        { value: '100 MHz', label: 'Carrier bandwidth' }
      ],
      examples: [
        'Massive MIMO requires phase-coherent signals across antenna arrays',
        'Time Division Duplex relies on precise up/downlink switching',
        'Carrier aggregation combines signals that must be time-aligned',
        'Network slicing needs synchronized resource allocation'
      ],
      companies: ['Ericsson', 'Nokia', 'Huawei', 'Samsung Networks', 'Qualcomm'],
      futureImpact: '6G networks will push timing requirements even further, with terahertz frequencies requiring femtosecond synchronization. Satellite-terrestrial integration will need global timing coordination, potentially using quantum-secure time distribution.',
      color: '#8b5cf6'
    },
    {
      icon: '📈',
      title: 'Financial Trading Systems',
      short: 'Low-Latency Timing',
      tagline: 'Where nanoseconds mean millions',
      description: 'High-frequency trading systems compete on timing at the nanosecond level. Accurate timestamps are legally required for trade ordering, and firms spend millions minimizing latency between exchanges. Clock synchronization accuracy directly translates to trading edge.',
      connection: 'Just as clock skew on a chip can cause data errors, timing uncertainty in trading can cause regulatory violations or missed opportunities. The same principles of measuring and minimizing propagation delays apply, but across network distances.',
      howItWorks: 'Trading firms use GPS-disciplined atomic clocks at each location, with nanosecond-accurate timestamping hardware. Custom FPGA-based systems minimize processing latency. Some firms use microwave links between exchanges for lower latency than fiber, as microwaves travel closer to the speed of light in air versus glass.',
      stats: [
        { value: '<10 ns', label: 'Timestamp accuracy required' },
        { value: '84 us', label: 'Chicago-NJ microwave latency' },
        { value: '$14M/ns', label: 'Value of 1ns advantage' }
      ],
      examples: [
        'MiFID II regulations require microsecond-accurate trade timestamps',
        'Co-location places servers physically next to exchange matching engines',
        'Microwave networks shave microseconds off fiber routes',
        'FPGA trading systems process market data in nanoseconds'
      ],
      companies: ['Citadel Securities', 'Jump Trading', 'Virtu Financial', 'Two Sigma', 'Jane Street'],
      futureImpact: 'As markets become faster, timing advantages shrink. Future systems may use quantum synchronization for unhackable timestamps, and regulators may mandate synchronized global market clocks to ensure fairness across geographic locations.',
      color: '#f59e0b'
    }
  ];

  const renderVisualization = () => {
    const metrics = calculateClockMetrics();
    const width = 700;
    const height = 480;

    // Clock signal animation
    const clockPhaseAngle = (animationTime / 360) * 2 * Math.PI * 3;
    const clockValue = Math.sin(clockPhaseAngle) > 0 ? 1 : 0;

    // Build skew vs chip-size data plot path with >=10 L points spanning vertical space
    // Plot area: x=[380..680], y=[60..250] (190px vertical in 480px viewBox = 39%)
    const plotLeft = 380;
    const plotRight = 680;
    const plotTop = 60;
    const plotBottom = 250;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;
    const dataPoints: { x: number; y: number }[] = [];
    const lightSpeedMmNs = 300 / 3.5; // 85.7 mm/ns
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const sz = 2 + t * 23; // chip size 2..25 mm
      const crossingNs = sz / lightSpeedMmNs; // ns
      const maxSkNs = crossingNs * Math.sqrt(2);
      const treeSkNs = maxSkNs / (2 ** (treeDepth - 1));
      const skewPsVal = treeSkNs * 1000; // ps
      dataPoints.push({ x: sz, y: skewPsVal });
    }
    // Map to SVG coordinates - find ranges
    const xVals = dataPoints.map(p => p.x);
    const yVals = dataPoints.map(p => p.y);
    const xMin = Math.min(...xVals);
    const xMax = Math.max(...xVals);
    const yMin = Math.min(...yVals);
    const yMax = Math.max(...yVals);
    const yRange = yMax - yMin || 1;

    const mapX = (v: number) => plotLeft + ((v - xMin) / (xMax - xMin)) * plotW;
    const mapY = (v: number) => plotBottom - ((v - yMin) / yRange) * plotH;

    const dataPathD = dataPoints.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${mapX(p.x).toFixed(1)} ${mapY(p.y).toFixed(1)}`
    ).join(' ');

    // Current chip size marker position
    const currentSkewPs = metrics.clockTreeSkew; // ps (now correct)
    const markerX = mapX(chipSize);
    const markerY = mapY(currentSkewPs);

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
            <linearGradient id="clkdLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>
            <linearGradient id="clkdChipSubstrate" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="50%" stopColor="#3730a3" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
            <linearGradient id="clkdCopperTrace" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#9333ea" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
            <linearGradient id="clkdPLLMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
            <radialGradient id="clkdPLLGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
              <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="clkdBufferGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="1" />
              <stop offset="100%" stopColor="#9333ea" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="clkdFFActiveGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="clkdSkewWarning" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="clkdErrorGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f87171" stopOpacity="1" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </radialGradient>
            <filter id="clkdPLLBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="clkdTraceGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="clkdFFGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="clkdMarkerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width={width} height={height} fill="url(#clkdLabBg)" />

          {/* === TITLE === */}
          <text x={175} y={18} fill={colors.textPrimary} fontSize={14} fontWeight="bold" textAnchor="middle">
            Clock Distribution Network
          </text>
          <text x={175} y={33} fill={colors.textMuted} fontSize={11} textAnchor="middle">
            H-Tree with {treeDepth}-Level Buffering
          </text>

          {/* === CHIP VISUALIZATION (left side, absolute coords) === */}
          <g>
            {/* Chip package */}
            <rect x={30} y={55} width={290} height={215} rx={8} fill="#111827" stroke="#1f2937" strokeWidth={2} />
            <rect x={35} y={60} width={280} height={205} rx={6} fill="url(#clkdChipSubstrate)" stroke="#4f46e5" strokeWidth={1.5} />

            {/* Chip label - well below subtitle */}
            <text x={30} y={54} fill={colors.textSecondary} fontSize={11} textAnchor="start">{chipSize}mm Die</text>

            {/* PLL at center of chip */}
            <circle cx={175} cy={160} r={20} fill="url(#clkdPLLGlow)" opacity={clockValue ? 1 : 0.4} />
            <rect x={155} y={142} width={40} height={36} rx={5} fill="url(#clkdPLLMetal)" stroke="#4ade80" strokeWidth={1.5} />
            <circle cx={175} cy={160} r={10} fill="#15803d" stroke="#22c55e" strokeWidth={2} />
            <text x={175} y={164} fill="white" fontSize={11} textAnchor="middle" fontWeight="bold">PLL</text>

            {/* H-Tree trunk lines */}
            <line x1={175} y1={160} x2={110} y2={160} stroke="url(#clkdCopperTrace)" strokeWidth={4} opacity={clockValue ? 1 : 0.4} />
            <line x1={175} y1={160} x2={240} y2={160} stroke="url(#clkdCopperTrace)" strokeWidth={4} opacity={clockValue ? 1 : 0.4} />
            <line x1={175} y1={160} x2={175} y2={105} stroke="url(#clkdCopperTrace)" strokeWidth={4} opacity={clockValue ? 1 : 0.4} />
            <line x1={175} y1={160} x2={175} y2={215} stroke="url(#clkdCopperTrace)" strokeWidth={4} opacity={clockValue ? 1 : 0.4} />

            {/* Buffer nodes */}
            {[[110, 160], [240, 160], [175, 105], [175, 215]].map(([bx, by], i) => (
              <circle key={`b1-${i}`} cx={bx} cy={by} r={5} fill="#a855f7" stroke="#c084fc" strokeWidth={1} />
            ))}

            {/* Level 2 branches */}
            {treeDepth >= 2 && <>
              <line x1={110} y1={160} x2={110} y2={105} stroke="url(#clkdCopperTrace)" strokeWidth={3} opacity={0.8} />
              <line x1={110} y1={160} x2={110} y2={215} stroke="url(#clkdCopperTrace)" strokeWidth={3} opacity={0.8} />
              <line x1={240} y1={160} x2={240} y2={105} stroke="url(#clkdCopperTrace)" strokeWidth={3} opacity={0.8} />
              <line x1={240} y1={160} x2={240} y2={215} stroke="url(#clkdCopperTrace)" strokeWidth={3} opacity={0.8} />
              <line x1={175} y1={105} x2={110} y2={105} stroke="url(#clkdCopperTrace)" strokeWidth={3} opacity={0.8} />
              <line x1={175} y1={105} x2={240} y2={105} stroke="url(#clkdCopperTrace)" strokeWidth={3} opacity={0.8} />
              <line x1={175} y1={215} x2={110} y2={215} stroke="url(#clkdCopperTrace)" strokeWidth={3} opacity={0.8} />
              <line x1={175} y1={215} x2={240} y2={215} stroke="url(#clkdCopperTrace)" strokeWidth={3} opacity={0.8} />
              {[[110, 105], [240, 105], [110, 215], [240, 215]].map(([bx, by], i) => (
                <circle key={`b2-${i}`} cx={bx} cy={by} r={4} fill="#9333ea" stroke="#a855f7" strokeWidth={1} />
              ))}
            </>}

            {/* Level 3 branches */}
            {treeDepth >= 3 && <>
              <line x1={110} y1={105} x2={70} y2={80} stroke="url(#clkdCopperTrace)" strokeWidth={2} opacity={0.7} />
              <line x1={110} y1={105} x2={150} y2={80} stroke="url(#clkdCopperTrace)" strokeWidth={2} opacity={0.7} />
              <line x1={240} y1={105} x2={200} y2={80} stroke="url(#clkdCopperTrace)" strokeWidth={2} opacity={0.7} />
              <line x1={240} y1={105} x2={280} y2={80} stroke="url(#clkdCopperTrace)" strokeWidth={2} opacity={0.7} />
              <line x1={110} y1={215} x2={70} y2={240} stroke="url(#clkdCopperTrace)" strokeWidth={2} opacity={0.7} />
              <line x1={110} y1={215} x2={150} y2={240} stroke="url(#clkdCopperTrace)" strokeWidth={2} opacity={0.7} />
              <line x1={240} y1={215} x2={200} y2={240} stroke="url(#clkdCopperTrace)" strokeWidth={2} opacity={0.7} />
              <line x1={240} y1={215} x2={280} y2={240} stroke="url(#clkdCopperTrace)" strokeWidth={2} opacity={0.7} />
            </>}

            {/* Flip-flop endpoints */}
            {[[70, 80], [150, 80], [200, 80], [280, 80],
              [70, 240], [150, 240], [200, 240], [280, 240],
              [50, 65], [90, 65], [260, 65], [300, 65],
              [50, 255], [90, 255], [260, 255], [300, 255]
            ].map(([fx, fy], i) => {
              const delayed = Math.sin(clockPhaseAngle - (i * 0.05) * 2) > 0;
              return (
                <rect key={`ff-${i}`} x={fx - 5} y={fy - 5} width={10} height={10}
                  fill={delayed ? '#22d3ee' : 'rgba(34, 211, 238, 0.2)'}
                  stroke="#22d3ee" strokeWidth={1} rx={2} />
              );
            })}

            {/* Skew warning */}
            {metrics.skewPercentage > 10 && (
              <text x={175} y={275} fill={colors.error} fontSize={11} textAnchor="middle" fontWeight="bold">SKEW WARNING</text>
            )}
          </g>

          {/* === SKEW vs CHIP SIZE PLOT (right side) === */}
          <g>
            {/* Plot background */}
            <rect x={plotLeft - 5} y={plotTop - 15} width={plotW + 15} height={plotH + 40} rx={6} fill="rgba(15, 23, 42, 0.9)" stroke="#334155" strokeWidth={1} />

            {/* Plot title */}
            <text x={(plotLeft + plotRight) / 2} y={plotTop - 2} fill={colors.textSecondary} fontSize={11} textAnchor="middle" fontWeight="bold">
              Skew vs Chip Size (baseline)
            </text>

            {/* Grid lines with strokeDasharray */}
            <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke={colors.textMuted} strokeWidth={1} opacity={0.5} />
            <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke={colors.textMuted} strokeWidth={1} opacity={0.5} />
            {[0.25, 0.5, 0.75].map((frac, i) => (
              <line key={`gridH-${i}`} x1={plotLeft} y1={plotTop + plotH * frac} x2={plotRight} y2={plotTop + plotH * frac}
                stroke={colors.textMuted} strokeWidth={0.5} strokeDasharray="4 3" opacity={0.3} />
            ))}
            {[0.25, 0.5, 0.75].map((frac, i) => (
              <line key={`gridV-${i}`} x1={plotLeft + plotW * frac} y1={plotTop} x2={plotLeft + plotW * frac} y2={plotBottom}
                stroke={colors.textMuted} strokeWidth={0.5} strokeDasharray="4 3" opacity={0.3} />
            ))}

            {/* Axis labels */}
            <text x={(plotLeft + plotRight) / 2} y={plotBottom + 26} fill={colors.textMuted} fontSize={11} textAnchor="middle">Chip Size (mm)</text>
            <text x={plotLeft - 18} y={(plotTop + plotBottom) / 2} fill={colors.textMuted} fontSize={11} textAnchor="middle" transform={`rotate(-90, ${plotLeft - 18}, ${(plotTop + plotBottom) / 2})`}>Skew (ps)</text>

            {/* Y-axis tick values - positioned well away from X-axis */}
            <text x={plotLeft - 6} y={plotBottom - 8} fill={colors.textMuted} fontSize={11} textAnchor="end">{yMin.toFixed(0)}</text>
            <text x={plotLeft - 6} y={plotTop + 5} fill={colors.textMuted} fontSize={11} textAnchor="end">{yMax.toFixed(0)}</text>

            {/* X-axis tick values - positioned below axis, away from Y ticks */}
            <text x={plotLeft + 10} y={plotBottom + 14} fill={colors.textMuted} fontSize={11} textAnchor="middle">2mm</text>
            <text x={plotRight - 10} y={plotBottom + 14} fill={colors.textMuted} fontSize={11} textAnchor="middle">25mm</text>

            {/* Data curve path (space-separated coords, >=10 L points) */}
            <path d={dataPathD} stroke={colors.accent} strokeWidth={2.5} fill="none" />

            {/* Interactive marker circle that moves with slider */}
            <circle cx={markerX} cy={markerY} r={8} fill={colors.accent} stroke="#ffffff" strokeWidth={2} filter="url(#clkdMarkerGlow)" />

            {/* Marker value label */}
            <text x={markerX + 16} y={markerY + 4} fill={colors.accent} fontSize={11} textAnchor="start" fontWeight="bold">
              {currentSkewPs.toFixed(1)}ps
            </text>

            {/* 10% budget reference line */}
            {(() => {
              const budgetPs = metrics.clockPeriod * 0.1;
              if (budgetPs >= yMin && budgetPs <= yMax) {
                const budgetY = mapY(budgetPs);
                return <>
                  <line x1={plotLeft} y1={budgetY} x2={plotRight} y2={budgetY} stroke={colors.error} strokeWidth={1} strokeDasharray="6 3" opacity={0.8} />
                  <text x={plotRight + 4} y={budgetY + 4} fill={colors.error} fontSize={11}>10% budget</text>
                </>;
              }
              return null;
            })()}
          </g>

          {/* === METRICS ROW (below chip) === */}
          <g>
            {/* Clock Period metric */}
            <rect x={30} y={290} width={100} height={55} rx={6} fill="rgba(34, 197, 94, 0.1)" stroke={colors.pll} strokeWidth={1} />
            <text x={80} y={307} fill={colors.textMuted} fontSize={11} textAnchor="middle">Period</text>
            <text x={80} y={327} fill={colors.pll} fontSize={16} textAnchor="middle" fontWeight="bold">{metrics.clockPeriod.toFixed(0)}ps</text>
            <text x={80} y={341} fill={colors.textMuted} fontSize={11} textAnchor="middle">{clockFrequency} GHz</text>

            {/* Skew metric */}
            <rect x={138} y={290} width={100} height={55} rx={6} fill={metrics.skewPercentage > 10 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.1)'} stroke={metrics.skewPercentage > 10 ? colors.error : colors.skew} strokeWidth={1} />
            <text x={188} y={307} fill={colors.textMuted} fontSize={11} textAnchor="middle">Skew</text>
            <text x={188} y={327} fill={metrics.skewPercentage > 10 ? colors.error : colors.skew} fontSize={16} textAnchor="middle" fontWeight="bold">{metrics.clockTreeSkew.toFixed(1)}ps</text>
            <text x={188} y={341} fill={colors.textMuted} fontSize={11} textAnchor="middle">{metrics.skewPercentage.toFixed(1)}%</text>

            {/* Jitter metric */}
            <rect x={246} y={290} width={100} height={55} rx={6} fill="rgba(245, 158, 11, 0.1)" stroke={colors.jitter} strokeWidth={1} />
            <text x={296} y={307} fill={colors.textMuted} fontSize={11} textAnchor="middle">Jitter</text>
            <text x={296} y={327} fill={colors.jitter} fontSize={16} textAnchor="middle" fontWeight="bold">{metrics.jitter.toFixed(1)}ps</text>
            <text x={296} y={341} fill={colors.textMuted} fontSize={11} textAnchor="middle">{wireVariation}% var</text>
          </g>

          {/* Formula display */}
          <text x={175} y={365} fill={colors.textSecondary} fontSize={11} textAnchor="middle">
            Skew = Distance / v_signal | P = 1/f | Skew% = Skew/P × 100
          </text>

          {/* Status bar at bottom */}
          <g>
            <rect x={30} y={378} width={316} height={28} rx={6} fill="rgba(15, 23, 42, 0.8)" stroke={metrics.skewPercentage > 10 ? colors.error : colors.success} strokeWidth={1} />
            <text x={188} y={396} fill={metrics.skewPercentage > 10 ? colors.error : colors.success} fontSize={11} textAnchor="middle" fontWeight="bold">
              {metrics.skewPercentage > 10 ? 'Skew exceeds 10% budget!' : 'Timing OK'} | Max: {metrics.maxFreqForSkew.toFixed(1)} GHz
            </text>
          </g>

          {/* Right side info */}
          <g>
            <rect x={plotLeft - 5} y={plotBottom + 30} width={plotW + 15} height={50} rx={6} fill="rgba(15, 23, 42, 0.8)" stroke="#334155" strokeWidth={1} />
            <text x={(plotLeft + plotRight) / 2} y={plotBottom + 47} fill={colors.textPrimary} fontSize={11} textAnchor="middle" fontWeight="bold">
              {clockFrequency} GHz | {treeDepth}-Level | {chipSize}mm
            </text>
            <text x={(plotLeft + plotRight) / 2} y={plotBottom + 63} fill={colors.textMuted} fontSize={11} textAnchor="middle">
              Signal: 86 mm/ns | factor = 1/(2^(depth-1))
            </text>
          </g>

          {/* Legend at very bottom */}
          <rect x={30} y={416} width={316} height={25} rx={4} fill="rgba(15, 23, 42, 0.8)" stroke="#334155" strokeWidth={0.5} />
          <circle cx={48} cy={428} r={4} fill={colors.pll} />
          <text x={58} y={432} fill={colors.textMuted} fontSize={11}>PLL</text>
          <circle cx={102} cy={428} r={3} fill="#a855f7" />
          <text x={112} y={432} fill={colors.textMuted} fontSize={11}>Buffer</text>
          <rect x={166} y={424} width={8} height={8} fill="#22d3ee" rx={1} />
          <text x={180} y={432} fill={colors.textMuted} fontSize={11}>FF</text>
          <circle cx={218} cy={428} r={4} fill={colors.accent} />
          <text x={228} y={432} fill={colors.textMuted} fontSize={11}>Current</text>
        </svg>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
          onInput={(e) => setChipSize(parseInt((e.target as HTMLInputElement).value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>2 mm (Small)</span><span>25 mm (Large)</span>
        </div>
      </div>

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
          onInput={(e) => setClockFrequency(parseFloat((e.target as HTMLInputElement).value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>1 GHz (Low)</span><span>6 GHz (High)</span>
        </div>
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
          onInput={(e) => setTreeDepth(parseInt((e.target as HTMLInputElement).value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>1 (Min)</span><span>6 (Max)</span>
        </div>
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
          onInput={(e) => setWireVariation(parseInt((e.target as HTMLInputElement).value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '11px' }}>
          <span>0% (Min)</span><span>20% (Max)</span>
        </div>
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
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const renderProgressBar = () => (
    <div style={{
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      gap: isMobile ? '6px' : '8px',
      padding: '12px 16px',
      background: colors.bgDark,
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      flexWrap: 'wrap' as const,
      zIndex: 1000,
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
              minHeight: '44px',
              minWidth: '44px',
              borderRadius: '50%',
              border: 'none',
              background: isCompleted ? colors.success : isCurrent ? colors.accent : 'rgba(255,255,255,0.1)',
              color: isCompleted || isCurrent ? 'white' : colors.textSecondary,
              fontSize: isMobile ? '10px' : '11px',
              fontWeight: 'bold',
              cursor: index <= currentIndex ? 'pointer' : 'not-allowed',
              opacity: index > currentIndex ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label={phaseLabels[p]}
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
          minHeight: '44px',
          borderRadius: '8px',
          border: `1px solid ${colors.textSecondary}`,
          background: 'transparent',
          color: phase === 'hook' ? colors.textSecondary : colors.textPrimary,
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
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? `linear-gradient(135deg, ${colors.accent}, #d97706)` : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textSecondary,
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '70px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Clock Distribution and Skew
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px', fontWeight: 400 }}>
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
        {renderBottomBar(true, 'Next')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '70px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Progress: Make a prediction to continue (Step 1 of 2)
            </p>
          </div>
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
        {renderBottomBar(!!prediction, 'Next')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '70px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Clock Distribution</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust parameters to see how skew changes
            </p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '8px' }}>
              Observe how the clock signal propagates through the chip
            </p>
            <p style={{ color: colors.textMuted, fontSize: '13px', marginTop: '8px' }}>
              Real-world relevance: This simulation demonstrates the same physics that chip designers at Intel, AMD, and Apple must solve when building processors that run at 5+ GHz.
            </p>
          </div>

          {/* Side-by-side layout: SVG left, controls right */}


          <div style={{


            display: 'flex',


            flexDirection: isMobile ? 'column' : 'row',


            gap: isMobile ? '12px' : '20px',


            width: '100%',


            alignItems: isMobile ? 'center' : 'flex-start',


          }}>


            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


              {renderVisualization()}


            </div>


            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


              {renderControls()}


            </div>


          </div>

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
        {renderBottomBar(true, 'Next')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'light';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '70px' }}>
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
              {wasCorrect
                ? 'As you predicted, signals do arrive at different times across the chip! '
                : 'You predicted the signal would arrive simultaneously, but as the simulation shows, '}
              This is because electrical signals travel at about 1/3 the speed of light in chip interconnects.
              Therefore, crossing a 15mm chip takes about 175 picoseconds - significant when the clock period
              is only 200ps at 5 GHz!
            </p>
            <p style={{ color: colors.textSecondary, marginTop: '12px', fontSize: '14px' }}>
              The key formula is: Skew = Distance / Signal_Speed. For a 15mm chip with signals traveling
              at 86 mm/ns, the diagonal crossing time is approximately 175ps, which demonstrates why managing
              clock distribution is critical in modern chip design.
            </p>
          </div>

          {/* Concept diagram SVG */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
            <svg width="320" height="200" viewBox="0 0 320 200">
              <defs>
                <linearGradient id="reviewConceptGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={colors.clock} />
                  <stop offset="100%" stopColor={colors.accent} />
                </linearGradient>
              </defs>
              <rect width="320" height="200" fill={colors.bgDark} rx="8" />
              <text x="160" y="24" fill={colors.textPrimary} fontSize="12" textAnchor="middle" fontWeight="bold">Clock Signal Propagation</text>

              {/* PLL source */}
              <circle cx="160" cy="80" r="20" fill={colors.pll} />
              <text x="160" y="84" fill="white" fontSize="11" textAnchor="middle">PLL</text>

              {/* Distribution lines */}
              <line x1="160" y1="100" x2="80" y2="150" stroke="url(#reviewConceptGrad)" strokeWidth="3" />
              <line x1="160" y1="100" x2="240" y2="150" stroke="url(#reviewConceptGrad)" strokeWidth="3" />
              <line x1="160" y1="100" x2="160" y2="160" stroke="url(#reviewConceptGrad)" strokeWidth="3" />

              {/* Endpoints */}
              <rect x="65" y="145" width="30" height="20" fill={colors.clock} rx="4" />
              <text x="80" y="158" fill="white" fontSize="11" textAnchor="middle">FF</text>
              <rect x="225" y="145" width="30" height="20" fill={colors.clock} rx="4" />
              <text x="240" y="158" fill="white" fontSize="11" textAnchor="middle">FF</text>
              <rect x="145" y="155" width="30" height="20" fill={colors.clock} rx="4" />
              <text x="160" y="168" fill="white" fontSize="11" textAnchor="middle">FF</text>

              {/* Skew annotation */}
              <text x="50" y="185" fill={colors.skew} fontSize="11">Skew: arrival time difference</text>
            </svg>
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
        {renderBottomBar(true, 'Next')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '70px' }}>
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
        {renderBottomBar(!!twistPrediction, 'Next')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '70px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Find the Speed-of-Light Limit</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Explore when skew becomes unmanageable
            </p>
          </div>

          {/* Side-by-side layout: SVG left, controls right */}


          <div style={{


            display: 'flex',


            flexDirection: isMobile ? 'column' : 'row',


            gap: isMobile ? '12px' : '20px',


            width: '100%',


            alignItems: isMobile ? 'center' : 'flex-start',


          }}>


            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


              {renderVisualization()}


            </div>


            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


              {renderControls()}


            </div>


          </div>

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
        {renderBottomBar(true, 'Next')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'both';

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '70px' }}>
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

          {/* Light speed limit diagram SVG */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
            <svg width="320" height="180" viewBox="0 0 320 180">
              <defs>
                <linearGradient id="twistReviewGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={colors.warning} />
                  <stop offset="100%" stopColor={colors.error} />
                </linearGradient>
              </defs>
              <rect width="320" height="180" fill={colors.bgDark} rx="8" />
              <text x="160" y="22" fill={colors.textPrimary} fontSize="12" textAnchor="middle" fontWeight="bold">Speed of Light Constraint</text>

              {/* Chip size vs frequency graph */}
              <line x1="50" y1="150" x2="290" y2="150" stroke={colors.textMuted} strokeWidth="1" />
              <line x1="50" y1="150" x2="50" y2="40" stroke={colors.textMuted} strokeWidth="1" />

              {/* Axes labels */}
              <text x="170" y="168" fill={colors.textMuted} fontSize="11" textAnchor="middle">Chip Size (mm)</text>
              <text x="20" y="95" fill={colors.textMuted} fontSize="11" textAnchor="middle" transform="rotate(-90, 20, 95)">Frequency (GHz)</text>

              {/* Light speed limit curve */}
              <path d="M 60 45 Q 100 50 140 70 Q 180 95 220 120 Q 260 140 280 145" stroke="url(#twistReviewGrad)" strokeWidth="3" fill="none" />

              {/* Valid region */}
              <text x="100" y="130" fill={colors.success} fontSize="11">Valid Region</text>
              <text x="220" y="60" fill={colors.error} fontSize="11">Impossible</text>

              {/* Legend */}
              <rect x="200" y="80" width="100" height="30" fill="rgba(0,0,0,0.3)" rx="4" />
              <line x1="210" y1="95" x2="230" y2="95" stroke="url(#twistReviewGrad)" strokeWidth="2" />
              <text x="240" y="98" fill={colors.textSecondary} fontSize="11">Light Speed Limit</text>
            </svg>
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
        {renderBottomBar(true, 'Next')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Clock Distribution"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (phase === 'transfer') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '70px' }}>
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
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                    style={{ ...buttonStyle, padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}
                  >
                    Reveal Answer
                  </button>
                  <button
                    onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                    style={{ ...buttonStyle, padding: '8px 16px', borderRadius: '6px', border: 'none', background: `linear-gradient(135deg, ${colors.success}, #059669)`, color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                  >
                    Got It
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '12px' }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                  </div>
                  <button
                    style={{ ...buttonStyle, padding: '8px 16px', borderRadius: '6px', border: 'none', background: `linear-gradient(135deg, ${colors.success}, #059669)`, color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                  >
                    Got It
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size >= 4, 'Next')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '70px' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '20px', color: isCorrect ? colors.success : colors.error }} className="answer-review-indicator">{isCorrect ? '\u2713' : '\u2717'}</span>
                    <p style={{ color: colors.textPrimary, fontWeight: 'bold', margin: 0 }}>Question {qIndex + 1}. {q.question}</p>
                  </div>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {opt.correct && <span style={{ fontWeight: 'bold' }}>{'\u2713'}</span>}
                      {userAnswer === oIndex && !opt.correct && <span style={{ fontWeight: 'bold' }}>{'\u2717'}</span>}
                      <span>{opt.text}</span>
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
            </div>
            <p style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '12px', lineHeight: 1.5 }}>
              Scenario: You are designing a high-performance processor running at multiple GHz frequencies.
              The chip die measures over 15mm across, and you must ensure the clock signal reaches all
              flip-flops within the timing budget. Apply your understanding of clock distribution, skew,
              jitter, PLLs, and H-tree topologies to answer the following questions correctly.
            </p>
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
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ ...buttonStyle, padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer', minHeight: '44px' }}>Next</button>
            ) : (
              <button onClick={submitTest} style={{ ...buttonStyle, padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.success, color: 'white', cursor: 'pointer', minHeight: '44px' }}>Submit Test</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px', paddingTop: '70px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>{'\u{1F3C6}'}</div>
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
        {renderBottomBar(true, 'Next')}
      </div>
    );
  }

  return null;
};

export default ClockDistributionRenderer;
