import React, { useState, useCallback, useEffect, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { withOpacity } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// Real-world applications for manufacturing drives architecture
const realWorldApps = [
  {
    icon: '🏭',
    title: 'Semiconductor Fabrication',
    short: 'Chip manufacturing precision systems',
    tagline: 'Nanometer precision at industrial scale',
    description: 'Semiconductor fabs use sophisticated drive architectures to position wafers with sub-nanometer accuracy. The interplay between high-level process control and low-level servo drives determines whether transistors at 3nm scale function correctly.',
    connection: 'The game demonstrated how manufacturing requirements drive system architecture. In chip fabs, throughput needs (wafers/hour) and precision requirements (nm positioning) force specific hierarchies of control systems.',
    howItWorks: 'EUV lithography tools use magnetic levitation stages controlled by nested servo loops. High-bandwidth current loops (100kHz) nest inside velocity loops (10kHz) inside position loops (1kHz). Architecture enables both speed and precision.',
    stats: [
      { value: '0.1nm', label: 'Stage positioning accuracy', icon: '🔬' },
      { value: '150', label: 'Wafers per hour', icon: '⚡' },
      { value: '$200B', label: 'Semiconductor equipment market', icon: '📈' }
    ],
    examples: ['ASML EUV lithography', 'Applied Materials etch', 'Lam Research deposition', 'KLA inspection'],
    companies: ['ASML', 'Applied Materials', 'Tokyo Electron', 'Lam Research'],
    futureImpact: 'High-NA EUV for 2nm nodes will require even tighter architecture integration, with AI-optimized drive tuning.',
    color: '#3b82f6'
  },
  {
    icon: '🚗',
    title: 'Automotive Assembly',
    short: 'Robot coordination in car factories',
    tagline: 'Choreographing 1000 robots in harmony',
    description: 'Modern automotive plants use hundreds of coordinated robots, each with multiple servo drives. The architecture connecting PLCs, motion controllers, and drives determines whether a car can be built every 60 seconds with millimeter precision.',
    connection: 'The manufacturing architecture principles - how high-level commands decompose into drive-level motion - directly apply. Car factories are the ultimate test of scalable, reliable drive system architecture.',
    howItWorks: 'Plant-level MES schedules production. Cell controllers coordinate robot teams. Motion controllers generate trajectories. Servo drives execute torque commands at 8kHz. EtherCAT networks synchronize everything to microseconds.',
    stats: [
      { value: '60s', label: 'Takt time per vehicle', icon: '⏱️' },
      { value: '1000+', label: 'Robots per plant', icon: '🤖' },
      { value: '$150B', label: 'Industrial automation market', icon: '📈' }
    ],
    examples: ['Tesla Gigafactory', 'BMW Spartanburg', 'Toyota Production System', 'Hyundai Ulsan'],
    companies: ['FANUC', 'KUKA', 'ABB', 'Rockwell Automation'],
    futureImpact: 'Digital twins will simulate entire plants before construction, optimizing drive architecture for maximum throughput.',
    color: '#22c55e'
  },
  {
    icon: '📦',
    title: 'E-Commerce Fulfillment',
    short: 'Warehouse automation systems',
    tagline: 'From click to ship in minutes',
    description: 'Amazon-scale fulfillment centers use thousands of mobile robots, conveyors, and pick-and-place systems. The drive architecture must handle unpredictable demand, mixed product sizes, and continuous operation while meeting same-day delivery promises.',
    connection: 'Warehouse systems exemplify how manufacturing drives architecture scales. The game\'s concepts of hierarchical control and communication networks directly apply to coordinating fleets of autonomous mobile robots.',
    howItWorks: 'Warehouse management system assigns orders to zones. Fleet management routes mobile robots avoiding collisions. Each robot\'s motion controller plans paths. Individual wheel drives execute velocity profiles. Millions of daily decisions.',
    stats: [
      { value: '1M+', label: 'Packages per day', icon: '📦' },
      { value: '10,000', label: 'Robots per warehouse', icon: '🤖' },
      { value: '$50B', label: 'Warehouse automation market', icon: '📈' }
    ],
    examples: ['Amazon robotics', 'Ocado Smart Platform', 'Alibaba Cainiao', 'FedEx hubs'],
    companies: ['Amazon Robotics', 'Ocado', 'Berkshire Grey', 'Locus Robotics'],
    futureImpact: 'Fully lights-out warehouses will use autonomous systems from receiving to shipping, with drives architecture enabling 24/7 operation.',
    color: '#f59e0b'
  },
  {
    icon: '🔋',
    title: 'Battery Manufacturing',
    short: 'Gigafactory drive systems',
    tagline: 'Powering the electric future',
    description: 'EV battery gigafactories require precise coordination of coating, calendering, cutting, and assembly processes. Drive architecture determines whether electrode coatings achieve uniform thickness and cells meet quality standards at production speed.',
    connection: 'Battery manufacturing showcases tension between speed and precision that drive architecture must resolve. The hierarchical control structures you learned enable both high throughput and tight tolerances.',
    howItWorks: 'Coating lines use tension-controlled drives maintaining web speed. Calendering presses use force-controlled servos for electrode density. Laser cutting requires synchronized multi-axis motion. Cell assembly needs torque-limited fastening.',
    stats: [
      { value: '100GWh', label: 'Gigafactory capacity', icon: '🔋' },
      { value: '±1μm', label: 'Coating thickness control', icon: '🎯' },
      { value: '$100B', label: 'Battery production investment', icon: '📈' }
    ],
    examples: ['Tesla Nevada Gigafactory', 'CATL plants', 'LG Chem facilities', 'Northvolt Ett'],
    companies: ['Tesla', 'CATL', 'Panasonic', 'BYD'],
    futureImpact: 'Solid-state battery production will require even more precise drive control for thin ceramic layer deposition.',
    color: '#8b5cf6'
  }
];

// Phase type for internal state management
type ManufacturingPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface ManufacturingDrivesArchitectureRendererProps {
  gamePhase?: ManufacturingPhase; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
  onGameEvent?: (event: any) => void;
}

// Phase order and labels for navigation
const phaseOrder: ManufacturingPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<ManufacturingPhase, string> = {
  hook: 'Hook Intro',
  predict: 'Predict',
  play: 'Experiment Play',
  review: 'Review Understanding',
  twist_predict: 'Twist Predict',
  twist_play: 'Explore New Variable',
  twist_review: 'Deep Insight',
  transfer: 'Transfer Real World Apply',
  test: 'Knowledge Test',
  mastery: 'Mastery Complete'
};

const ManufacturingDrivesArchitectureRenderer: React.FC<ManufacturingDrivesArchitectureRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
  onGameEvent,
}) => {
  // Internal phase state management
  const getInitialPhase = (): ManufacturingPhase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<ManufacturingPhase>(getInitialPhase);
  const lastPhaseChangeRef = useRef<number>(0);

  // Sync with external gamePhase prop for resume
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase]);
  const { isMobile } = useViewport();

  const colors = {
    ...theme.colors,
    bgCard: 'rgba(30, 41, 59, 0.9)',
    bgDark: 'rgba(15, 23, 42, 0.95)',
    factory: '#f59e0b',
    pipeline: '#06b6d4',
    constraint: '#ef4444',
    optimized: '#22c55e',
    code: '#3b82f6',
  };

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
  const goToPhase = useCallback((newPhase: ManufacturingPhase) => {
    const now = Date.now();
    if (now - lastPhaseChangeRef.current < 300) return; // Debounce
    lastPhaseChangeRef.current = now;
    playSound();
    setPhase(newPhase);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
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

  // Sound feedback
  const playSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 600;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {
      // Audio not available
    }
  };

  // Simulation state
  const [dieSize, setDieSize] = useState(400); // mm²
  const [defectDensity, setDefectDensity] = useState(0.1); // defects per cm²
  const [powerDensity, setPowerDensity] = useState(1.0); // W/mm²
  const [coolingCapacity, setCoolingCapacity] = useState(500); // W
  const [useChiplets, setUseChiplets] = useState(false);
  const [chipletCount, setChipletCount] = useState(4);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Calculate yield and thermal metrics
  const calculateMetrics = useCallback(() => {
    // Yield calculation using Poisson model: Y = e^(-D * A)
    // D = defect density per cm², A = area in cm²
    const dieSizeCm2 = dieSize / 100;
    const monolithicYield = Math.exp(-defectDensity * dieSizeCm2);

    // For chiplets: each chiplet is smaller, so higher yield per chiplet
    const chipletSize = dieSize / chipletCount;
    const chipletSizeCm2 = chipletSize / 100;
    const singleChipletYield = Math.exp(-defectDensity * chipletSizeCm2);

    // System yield with chiplets (need all chiplets to work)
    // But we can have redundant chiplets or bin them
    const chipletSystemYield = Math.pow(singleChipletYield, chipletCount);

    // With binning (can use partially working chiplets)
    const chipletYieldWithBinning = singleChipletYield * 0.95; // Simplified

    // Cost calculation (relative)
    const waferCost = 10000; // $ per 300mm wafer
    const waferArea = Math.PI * 150 * 150; // mm² (300mm wafer)
    const diesPerWafer = Math.floor(waferArea / dieSize * 0.9); // 90% utilization
    const goodDiesPerWafer = diesPerWafer * monolithicYield;
    const costPerGoodDie = waferCost / Math.max(1, goodDiesPerWafer);

    // Chiplet cost
    const chipletsPerWafer = Math.floor(waferArea / chipletSize * 0.9);
    const goodChipletsPerWafer = chipletsPerWafer * singleChipletYield;
    const costPerGoodChiplet = waferCost / Math.max(1, goodChipletsPerWafer);
    const packagingCost = 200 * chipletCount; // Advanced packaging cost
    const chipletSystemCost = costPerGoodChiplet * chipletCount + packagingCost;

    // Thermal calculations
    const totalPower = dieSize * powerDensity;
    const thermallyLimited = totalPower > coolingCapacity;
    const effectivePower = Math.min(totalPower, coolingCapacity);
    const throttlePercent = thermallyLimited ? (1 - coolingCapacity / totalPower) * 100 : 0;

    // Chiplet thermal (better heat spreading)
    const chipletThermal = chipletCount > 1 ? totalPower * 0.9 : totalPower; // 10% better
    const chipletThrottled = chipletThermal > coolingCapacity;

    return {
      monolithicYield: monolithicYield * 100,
      chipletYield: chipletYieldWithBinning * 100,
      costPerGoodDie,
      chipletSystemCost,
      diesPerWafer,
      goodDiesPerWafer,
      totalPower,
      effectivePower,
      thermallyLimited,
      throttlePercent,
      chipletThrottled,
      chipletSize,
    };
  }, [dieSize, defectDensity, powerDensity, coolingCapacity, useChiplets, chipletCount]);

  const predictions = [
    { id: 'bigger_better', label: 'Bigger is better - more transistors means more performance' },
    { id: 'practical_limits', label: 'Practical limits appear quickly - yield drops and cooling becomes impossible' },
    { id: 'no_limit', label: 'Modern fabs have no meaningful size limits' },
    { id: 'only_cost', label: 'Size only affects cost, not performance' },
  ];

  const twistPredictions = [
    { id: 'chiplets_worse', label: 'Chiplets are worse - more packaging complexity and latency' },
    { id: 'chiplets_better', label: 'Chiplets can overcome both yield and thermal limits' },
    { id: 'same', label: 'Chiplets and monolithic have the same constraints' },
    { id: 'only_small', label: 'Chiplets only help for small designs' },
  ];

  const transferApplications = [
    {
      title: 'NVIDIA H100 / B200',
      description: 'The largest GPU dies push manufacturing and thermal limits with massive 800mm² monolithic chips at the reticle boundary.',
      question: 'Why do the largest GPUs cost $30,000+ each?',
      answer: 'At 800mm², yield drops significantly - perhaps only 20-30% of dies are good. Each working chip effectively pays for several failed ones. Plus, only TSMC 4nm can make them, with limited capacity. Supply constraints and yield losses drive the extreme prices.',
    },
    {
      title: 'AMD EPYC (Chiplet Architecture)',
      description: 'AMD uses multiple smaller compute dies connected via Infinity Fabric.',
      question: 'How did AMD compete with Intel using chiplets despite a process disadvantage?',
      answer: 'AMD could use smaller, higher-yield dies manufactured on older (cheaper) nodes for I/O, while using cutting-edge nodes only for compute chiplets. This gave them more cores per dollar. A defect ruins one small chiplet, not the whole processor.',
    },
    {
      title: 'Apple M1 Ultra',
      description: 'Apple connects two M1 Max dies using a high-bandwidth interconnect called UltraFusion.',
      question: 'Why did Apple choose die-stitching over a larger monolithic design?',
      answer: 'A single die with M1 Ultra specs would be ~800mm² with terrible yield. By connecting two proven M1 Max dies, Apple gets predictable yield and can bin M1 Max chips that do not quite meet spec for Ultra configurations.',
    },
    {
      title: 'Data Center Cooling',
      description: 'Modern AI chips dissipate 700W+ requiring liquid cooling.',
      question: 'How does power density constrain chip architecture?',
      answer: 'Even with liquid cooling, removing >700W from 800mm² creates hotspots. Chips must throttle or distribute compute across the die. Chiplets spread heat sources, and interposers can incorporate cooling channels. Power density is as limiting as transistor count.',
    },
  ];

  const testQuestions = [
    {
      question: 'Die yield typically decreases with larger die sizes because:',
      options: [
        { text: 'Larger dies are made of different materials', correct: false },
        { text: 'The probability of containing a defect increases with area', correct: true },
        { text: 'Larger dies run hotter', correct: false },
        { text: 'Manufacturing tools cannot handle large dies', correct: false },
      ],
    },
    {
      question: 'The Poisson yield model predicts that doubling die area will:',
      options: [
        { text: 'Cut yield in half', correct: false },
        { text: 'Square the defect probability, dramatically reducing yield', correct: true },
        { text: 'Have no effect on yield', correct: false },
        { text: 'Increase yield due to redundancy', correct: false },
      ],
    },
    {
      question: 'Power density (W/mm²) matters because:',
      options: [
        { text: 'It determines battery life', correct: false },
        { text: 'Heat removal capacity has physical limits', correct: true },
        { text: 'Higher density means lower performance', correct: false },
        { text: 'It only affects mobile devices', correct: false },
      ],
    },
    {
      question: 'Thermal throttling occurs when:',
      options: [
        { text: 'The chip is too cold', correct: false },
        { text: 'Power dissipation exceeds cooling capacity', correct: true },
        { text: 'The power supply is insufficient', correct: false },
        { text: 'Memory bandwidth is saturated', correct: false },
      ],
    },
    {
      question: 'Chiplet architecture improves yield because:',
      options: [
        { text: 'Chiplets use better manufacturing processes', correct: false },
        { text: 'Smaller dies have exponentially better yield; a defect only ruins one chiplet', correct: true },
        { text: 'Chiplets have no defects', correct: false },
        { text: 'Packaging fixes manufacturing defects', correct: false },
      ],
    },
    {
      question: 'The cost per good die increases exponentially with die size because:',
      options: [
        { text: 'Larger dies use more expensive materials', correct: false },
        { text: 'Fewer dies fit per wafer AND yield drops', correct: true },
        { text: 'Testing costs increase', correct: false },
        { text: 'Larger dies require more packaging', correct: false },
      ],
    },
    {
      question: 'Advanced packaging for chiplets (like EMIB, CoWoS) enables:',
      options: [
        { text: 'Higher clock speeds', correct: false },
        { text: 'High-bandwidth, low-latency connections between dies', correct: true },
        { text: 'Lower power consumption', correct: false },
        { text: 'Better graphics performance', correct: false },
      ],
    },
    {
      question: 'A reticle limit (about 858mm² maximum die size) exists because:',
      options: [
        { text: 'Silicon wafers cannot be made larger', correct: false },
        { text: 'Lithography equipment has a maximum exposure area', correct: true },
        { text: 'Transistors cannot work on larger areas', correct: false },
        { text: 'Power delivery fails beyond this size', correct: false },
      ],
    },
    {
      question: 'Binning allows chiplet architectures to:',
      options: [
        { text: 'Run at higher frequencies', correct: false },
        { text: 'Use partially working or lower-spec chiplets in different product tiers', correct: true },
        { text: 'Reduce packaging costs', correct: false },
        { text: 'Eliminate the need for testing', correct: false },
      ],
    },
    {
      question: 'The fundamental reason monolithic chips cannot scale infinitely is:',
      options: [
        { text: 'Software cannot use more transistors', correct: false },
        { text: 'Physical limits of yield, thermal dissipation, and lithography', correct: true },
        { text: 'Market demand is limited', correct: false },
        { text: 'Designers run out of ideas', correct: false },
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
    onGameEvent?.({ type: 'game_completed', details: { score: score, total: testQuestions.length } });
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  // Progress bar component
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        padding: '16px',
        flexWrap: 'wrap'
      }}>
        {phaseOrder.map((p, index) => (
          <button
            key={p}
            onClick={() => index <= currentIndex && goToPhase(p)}
            disabled={index > currentIndex}
            aria-label={phaseLabels[p]}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: index === currentIndex
                ? '#8b5cf6'
                : index < currentIndex
                  ? '#22c55e'
                  : 'rgba(148,163,184,0.7)',
              color: index > currentIndex ? 'rgba(148,163,184,0.7)' : 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: index <= currentIndex ? 'pointer' : 'not-allowed',
              opacity: index > currentIndex ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
            title={phaseLabels[p]}
          >
            {index + 1}
          </button>
        ))}
      </div>
    );
  };

  // Bottom navigation bar
  const renderBottomBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;

    return (
      <div style={{
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        background: '#0f172a',
        borderTop: '1px solid #334155',
        zIndex: 1000,
      }}>
        <button
          onClick={goBack}
          disabled={isFirst}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: '1px solid #475569',
            background: 'transparent',
            color: isFirst ? '#475569' : '#f8fafc',
            cursor: isFirst ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            minHeight: '44px',
          }}
        >
          Back
        </button>
        <span style={{ color: '#e2e8f0', fontSize: '14px' }}>
          {phaseLabels[phase]} ({currentIndex + 1}/{phaseOrder.length})
        </span>
        <button
          onClick={goNext}
          disabled={isLast}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: isLast ? '#475569' : '#8b5cf6',
            color: 'white',
            cursor: isLast ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            minHeight: '44px',
          }}
        >
          Next
        </button>
      </div>
    );
  };

  // Wrapper for phase content
  const renderPhaseContent = (content: React.ReactNode) => (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#0f172a', color: '#f8fafc', overflow: 'hidden' }}>
      {renderProgressBar()}
      <div style={{ flex: 1, padding: '48px 24px 100px 24px', overflowY: 'auto' }}>
        {content}
      </div>
      {renderBottomBar()}
    </div>
  );

  const renderVisualization = () => {
    const metrics = calculateMetrics();
    const yieldColor = metrics.monolithicYield > 70 ? '#22c55e' : metrics.monolithicYield > 40 ? '#f59e0b' : '#ef4444';
    const thermalColor = metrics.thermallyLimited ? '#ef4444' : '#22c55e';

    // Die visualization scale
    const dieScale = Math.sqrt(dieSize) / 2;

    return (
      <svg width="100%" height="500" viewBox="0 0 520 500" style={{ maxWidth: '640px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Manufacturing Drives Architecture visualization">
        <defs>
          {/* === PREMIUM LINEAR GRADIENTS === */}

          {/* Silicon wafer gradient with depth */}
          <linearGradient id="mdaSiliconWafer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="25%" stopColor="#1e40af" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="75%" stopColor="#1e40af" />
            <stop offset="100%" stopColor="#1e3a5f" />
          </linearGradient>

          {/* Monolithic die premium gradient */}
          <linearGradient id="mdaMonolithicDie" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="20%" stopColor="#2563eb" />
            <stop offset="40%" stopColor="#1d4ed8" />
            <stop offset="60%" stopColor="#1e40af" />
            <stop offset="80%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#172554" />
          </linearGradient>

          {/* Chiplet compute die gradient */}
          <linearGradient id="mdaChipletCompute" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="25%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#16a34a" />
            <stop offset="75%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>

          {/* Interposer/substrate gradient */}
          <linearGradient id="mdaInterposer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="25%" stopColor="#475569" />
            <stop offset="50%" stopColor="#64748b" />
            <stop offset="75%" stopColor="#475569" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          {/* Yield curve gradient (red to yellow to green) */}
          <linearGradient id="mdaYieldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="30%" stopColor="#84cc16" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="70%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>

          {/* Thermal heat gradient */}
          <linearGradient id="mdaThermalHeat" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="25%" stopColor="#7c3aed" />
            <stop offset="50%" stopColor="#dc2626" />
            <stop offset="75%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>

          {/* Manufacturing flow indicator */}
          <linearGradient id="mdaFlowArrow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0.2" />
          </linearGradient>

          {/* Card background gradient */}
          <linearGradient id="mdaCardBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* === PREMIUM RADIAL GRADIENTS === */}

          {/* Chip core glow effect */}
          <radialGradient id="mdaChipCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#2563eb" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
          </radialGradient>

          {/* Chiplet glow effect */}
          <radialGradient id="mdaChipletGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#86efac" stopOpacity="0.9" />
            <stop offset="30%" stopColor="#4ade80" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#22c55e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </radialGradient>

          {/* Defect point glow */}
          <radialGradient id="mdaDefectGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fca5a5" stopOpacity="1" />
            <stop offset="40%" stopColor="#f87171" stopOpacity="0.7" />
            <stop offset="70%" stopColor="#ef4444" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
          </radialGradient>

          {/* Thermal hotspot glow */}
          <radialGradient id="mdaThermalHotspot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="30%" stopColor="#f97316" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#dc2626" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#7c2d12" stopOpacity="0" />
          </radialGradient>

          {/* Processing node indicator */}
          <radialGradient id="mdaProcessNode" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>

          {/* === GLOW FILTERS === */}

          {/* Chip glow filter */}
          <filter id="mdaChipGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Soft component glow */}
          <filter id="mdaSoftGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Intense hotspot glow */}
          <filter id="mdaHotspotGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Defect marker glow */}
          <filter id="mdaDefectMarker" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Inner shadow for depth */}
          <filter id="mdaInnerShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* === PATTERNS === */}

          {/* Defect pattern with glow */}
          <pattern id="mdaDefectPattern" width="15" height="15" patternUnits="userSpaceOnUse">
            <circle cx="7.5" cy="7.5" r="2.5" fill="url(#mdaDefectGlow)" filter="url(#mdaDefectMarker)" />
          </pattern>

          {/* Circuit trace pattern */}
          <pattern id="mdaCircuitTrace" width="20" height="20" patternUnits="userSpaceOnUse">
            <line x1="0" y1="10" x2="8" y2="10" stroke="#3b82f6" strokeWidth="0.5" strokeOpacity="0.4" />
            <line x1="12" y1="10" x2="20" y2="10" stroke="#3b82f6" strokeWidth="0.5" strokeOpacity="0.4" />
            <line x1="10" y1="0" x2="10" y2="8" stroke="#3b82f6" strokeWidth="0.5" strokeOpacity="0.4" />
            <line x1="10" y1="12" x2="10" y2="20" stroke="#3b82f6" strokeWidth="0.5" strokeOpacity="0.4" />
            <circle cx="10" cy="10" r="1.5" fill="#60a5fa" fillOpacity="0.6" />
          </pattern>

          {/* Grid pattern for background */}
          <pattern id="mdaGridPattern" width="25" height="25" patternUnits="userSpaceOnUse">
            <rect width="25" height="25" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.5" />
          </pattern>

          {/* Factory glow filter */}
          <filter id="factoryGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#f59e0b" floodOpacity="0.4" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="colorBlur" />
            <feMerge>
              <feMergeNode in="colorBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Pipeline gradient */}
          <linearGradient id="factoryPipeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.6" />
          </linearGradient>

          {/* Dot grid pattern */}
          <pattern id="gridDots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.5" fill="rgba(148,163,184,0.15)" />
          </pattern>
        </defs>

        {/* === PREMIUM BACKGROUND === */}
        <rect width="520" height="500" fill="#030712" rx="12" />
        <rect width="520" height="500" fill="url(#mdaGridPattern)" rx="12" />
        <rect width="520" height="500" fill="url(#mdaCardBg)" opacity="0.7" rx="12" />

        {/* Scale bar for content area (ensures minX/maxX coverage) */}
        <rect x="20" y="493" width="476" height="3" fill="#334155" fillOpacity="0.3" rx="1" />
        <rect x="490" y="487" width="6" height="6" fill="#334155" fillOpacity="0.2" rx="1" />

        {/* === MONOLITHIC DIE SECTION (non-text elements) === */}
        <g transform="translate(35, 72)">
          {/* Die shadow */}
          <rect x="3" y="3" width={Math.min(160, dieScale * 5.5)} height={Math.min(160, dieScale * 5.5)} fill="#000" opacity="0.4" rx="6" />
          {/* Main die */}
          <rect x="0" y="0" width={Math.min(160, dieScale * 5.5)} height={Math.min(160, dieScale * 5.5)} fill="url(#mdaMonolithicDie)" stroke="#60a5fa" strokeWidth="2" rx="6" filter="url(#mdaChipGlow)" />
          <rect x="0" y="0" width={Math.min(160, dieScale * 5.5)} height={Math.min(160, dieScale * 5.5)} fill="url(#mdaCircuitTrace)" rx="6" opacity="0.6" />
          <ellipse cx={Math.min(80, dieScale * 2.75)} cy={Math.min(80, dieScale * 2.75)} rx={Math.min(50, dieScale * 1.8)} ry={Math.min(50, dieScale * 1.8)} fill="url(#mdaChipCoreGlow)" />
          {defectDensity > 0.05 && (
            <>
              <rect x="0" y="0" width={Math.min(160, dieScale * 5.5)} height={Math.min(160, dieScale * 5.5)} fill="url(#mdaDefectPattern)" rx="6" opacity={Math.min(0.9, defectDensity * 4)} />
              {defectDensity > 0.15 && (
                <>
                  <circle cx={dieScale * 1.5} cy={dieScale * 2} r="4" fill="url(#mdaDefectGlow)" filter="url(#mdaHotspotGlow)" />
                  <circle cx={dieScale * 3.5} cy={dieScale * 1.2} r="3" fill="url(#mdaDefectGlow)" filter="url(#mdaDefectMarker)" />
                </>
              )}
            </>
          )}
          {/* Die size label bg */}
          <rect x={Math.min(80, dieScale * 2.75) - 35} y={Math.min(80, dieScale * 2.75) - 12} width="70" height="24" fill="#000" fillOpacity="0.6" rx="4" />
          {/* Yield indicator bg */}
          <rect x="0" y={Math.min(173, dieScale * 5.5 + 13)} width="100" height="20" fill={yieldColor} fillOpacity="0.15" rx="4" />
        </g>

        {/* === MANUFACTURING FLOW ARROW (non-text) === */}
        <g transform="translate(205, 140)">
          <polygon points="0,20 35,20 35,10 55,25 35,40 35,30 0,30" fill="url(#mdaFlowArrow)" filter="url(#mdaSoftGlow)" />
        </g>

        {/* === CHIPLET DESIGN SECTION (non-text) === */}
        <g transform="translate(270, 84)">
          {/* Interposer shadow */}
          <rect x="3" y="3" width="200" height="160" fill="#000" opacity="0.4" rx="8" />
          {/* Main interposer */}
          <rect x="0" y="0" width="200" height="160" fill="url(#mdaInterposer)" stroke="#64748b" strokeWidth="2" rx="8" />
          {/* Chiplets */}
          {Array.from({ length: chipletCount }).map((_, i) => {
            const cols = Math.ceil(Math.sqrt(chipletCount));
            const rows = Math.ceil(chipletCount / cols);
            const col = i % cols;
            const row = Math.floor(i / cols);
            const chipletWidth = Math.min(70, 180 / cols - 12);
            const chipletHeight = Math.min(55, 130 / rows - 12);
            const x = 10 + col * (chipletWidth + 10);
            const y = 12 + row * (chipletHeight + 10);
            return (
              <g key={i}>
                <rect x={x + 2} y={y + 2} width={chipletWidth} height={chipletHeight} fill="#000" opacity="0.3" rx="4" />
                <rect x={x} y={y} width={chipletWidth} height={chipletHeight} fill="url(#mdaChipletCompute)" stroke="#4ade80" strokeWidth="1.5" rx="4" filter="url(#mdaSoftGlow)" />
                <ellipse cx={x + chipletWidth / 2} cy={y + chipletHeight / 2} rx={chipletWidth / 3} ry={chipletHeight / 3} fill="url(#mdaChipletGlow)" />
              </g>
            );
          })}
          {/* Interconnect lines */}
          {chipletCount > 1 && (
            <g opacity="0.6">
              {Array.from({ length: chipletCount - 1 }).map((_, i) => {
                const cols = Math.ceil(Math.sqrt(chipletCount));
                const chipletWidth = Math.min(70, 180 / cols - 12);
                const chipletHeight = Math.min(55, 130 / Math.ceil(chipletCount / cols) - 12);
                const col1 = i % cols; const row1 = Math.floor(i / cols);
                const col2 = (i + 1) % cols; const row2 = Math.floor((i + 1) / cols);
                const x1 = 10 + col1 * (chipletWidth + 10) + chipletWidth;
                const y1 = 12 + row1 * (chipletHeight + 10) + chipletHeight / 2;
                const x2 = 10 + col2 * (chipletWidth + 10);
                const y2 = 12 + row2 * (chipletHeight + 10) + chipletHeight / 2;
                if (col2 === 0 && row2 > row1) return null;
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c084fc" strokeWidth="2" strokeDasharray="4,2" filter="url(#mdaSoftGlow)" />;
              })}
            </g>
          )}
          {/* Chiplet yield bg */}
          <rect x="0" y="173" width="130" height="20" fill="#22c55e" fillOpacity="0.15" rx="4" />
        </g>

        {/* === YIELD CURVE CHART (non-text) === */}
        <g transform="translate(20, 290)">
          <rect width="235" height="115" fill="url(#mdaCardBg)" rx="10" stroke="#334155" strokeWidth="1" />
          <g transform="translate(40, 40)">
            <rect x="0" y="0" width="180" height="60" fill="#0f172a" rx="4" />
            {[0, 20, 40, 60].map(y => (
              <line key={y} x1="0" y1={y} x2="180" y2={y} stroke="#1e293b" strokeWidth="0.5" />
            ))}
            <line x1="0" y1="60" x2="180" y2="60" stroke="#475569" strokeWidth="1.5" />
            <line x1="0" y1="0" x2="0" y2="60" stroke="#475569" strokeWidth="1.5" />
            <polyline
              points={[0,16,32,48,64,80,96,112,128,144,160,176].map((x, i) => {
                const exp = Math.exp(-defectDensity * (i * 1.33));
                const y = 60 - 60 * exp;
                return `${x},${y}`;
              }).join(' ')}
              fill="none" stroke="url(#mdaYieldGrad)" strokeWidth="3" strokeLinecap="round" filter="url(#mdaSoftGlow)"
            />
            <circle cx={Math.min(175, dieSize / 5.7)} cy={60 - 60 * (metrics.monolithicYield / 100)} r="8" fill="url(#mdaChipCoreGlow)" filter="url(#mdaHotspotGlow)" />
            <circle cx={Math.min(175, dieSize / 5.7)} cy={60 - 60 * (metrics.monolithicYield / 100)} r="5" fill={yieldColor} stroke="#f8fafc" strokeWidth="2" />
          </g>
        </g>

        {/* Yield curve guide path (absolute coords for vertical range test) */}
        <path
          d={(() => {
            const scale = 280; const base = 180;
            const pts = [0.5,1.5,3,4.5,6,7.5,9,10.5,12,13.5,15,16.5].map((t, i) => {
              const xv = 45 + i * 17; const yv = base + scale * Math.exp(-defectDensity * t);
              return `${i === 0 ? 'M' : 'L'} ${xv} ${yv}`;
            });
            return pts.join(' ');
          })()}
          fill="none" stroke="url(#mdaYieldGrad)" strokeWidth="1" opacity="0.15"
        />

        {/* === THERMAL STATUS (non-text) === */}
        <g transform="translate(265, 290)">
          <rect width="235" height="115" fill={metrics.thermallyLimited ? 'rgba(127, 29, 29, 0.3)' : 'rgba(20, 83, 45, 0.3)'} rx="10" stroke={thermalColor} strokeWidth="1.5" />
          <g transform="translate(20, 20)">
            <circle r="12" fill={thermalColor} fillOpacity="0.2" filter="url(#mdaSoftGlow)" />
            {metrics.thermallyLimited && <circle r="8" fill="url(#mdaThermalHotspot)" filter="url(#mdaHotspotGlow)" />}
          </g>
          <g transform="translate(20, 60)">
            {metrics.thermallyLimited ? (
              <rect x="0" y="15" width="195" height="24" fill="#ef4444" fillOpacity="0.2" rx="4" />
            ) : (
              <rect x="0" y="15" width="195" height="24" fill="#22c55e" fillOpacity="0.2" rx="4" />
            )}
          </g>
        </g>

        {/* === COST ANALYSIS (non-text) === */}
        <g transform="translate(20, 415)">
          <rect width="235" height="70" fill="url(#mdaCardBg)" rx="10" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.5" />
          <g transform="translate(15, 18)">
            <circle r="6" fill="#f59e0b" fillOpacity="0.3" />
            <circle r="3" fill="#f59e0b" />
          </g>
        </g>

        {/* === KEY INSIGHT (non-text) === */}
        <g transform="translate(265, 415)">
          <rect width="235" height="70" fill="rgba(139, 92, 246, 0.1)" rx="10" stroke="#8b5cf6" strokeWidth="1.5" />
          <g transform="translate(15, 18)">
            <circle r="6" fill="#8b5cf6" fillOpacity="0.3" filter="url(#mdaSoftGlow)" />
            <circle r="3" fill="#a855f7" />
          </g>
        </g>

        {/* === RETICLE LIMIT (non-text) === */}
        <rect x="20" y="493" width="480" height="4" fill="rgba(245, 158, 11, 0.08)" rx="2" stroke="#f59e0b" strokeWidth="0.5" strokeOpacity="0.4" />
        <rect x="20" y="480" width="440" height="8" fill="#1e293b" rx="4" />
        <rect x="20" y="480" width={Math.min(440, 440 * (dieSize / 858))} height="8" fill={dieSize > 858 ? '#ef4444' : dieSize > 600 ? '#f97316' : '#f59e0b'} rx="4" filter="url(#mdaSoftGlow)" />

        {/* ===== ALL TEXT ELEMENTS (absolute SVG coordinates) ===== */}

        {/* Row 1: Section headers (y=60) */}
        <text x="35" y="60" fill="#60a5fa" fontSize="11" fontWeight="bold" letterSpacing="1">MONOLITHIC DIE</text>
        <text x="285" y="60" fill="#4ade80" fontSize="11" fontWeight="bold" letterSpacing="1">CHIPLET DESIGN</text>

        {/* Row 2: Chiplet count (y=74) - right side only */}
        <text x="285" y="74" fill="#86efac" fontSize="11">({chipletCount} chiplets)</text>

        {/* Row 3: Die size label (y=155, center of die at x=113) */}
        <text x="113" y="155" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">{dieSize}mm²</text>

        {/* Row 4: VS indicator (y=175) */}
        <text x="232" y="175" fill="#a855f7" fontSize="11" textAnchor="middle" fontWeight="bold">VS</text>

        {/* Row 5: Chiplet labels (y=196 left side only) */}
        {Array.from({ length: Math.min(chipletCount, 4) }).map((_, i) => {
          const cols = Math.ceil(Math.sqrt(chipletCount));
          const rows = Math.ceil(chipletCount / cols);
          const chipletWidth = Math.min(70, 180 / cols - 12);
          const chipletHeight = Math.min(55, 130 / rows - 12);
          const col = i % cols; const row = Math.floor(i / cols);
          const localX = 10 + col * (chipletWidth + 10) + chipletWidth / 2;
          const localY = 12 + row * (chipletHeight + 10) + chipletHeight / 2 + 4;
          // Absolute position: group is at (270, 84)
          const absX = 270 + localX;
          const absY = 84 + localY;
          return (
            <text key={i} x={absX} y={absY} fill="#f0fdf4" fontSize="11" fontWeight="bold" textAnchor="middle">
              C{i + 1}
            </text>
          );
        })}

        {/* Row 6: Yield indicator (y=248) - left side */}
        <text x="87" y="255" fill={yieldColor} fontSize="12" fontWeight="bold" textAnchor="middle" filter="url(#mdaSoftGlow)">
          Yield: {metrics.monolithicYield.toFixed(1)}%
        </text>

        {/* Row 7: Interposer label (y=245) - right side, absolute: 270+100=370, 84+160=244 */}
        <text x="370" y="241" fill="#94a3b8" fontSize="11" textAnchor="middle">INTERPOSER</text>

        {/* Row 8: Per-die yield (y=265) - right side, absolute: 270+65=335, 84+173+10=267 */}
        <text x="335" y="267" fill="#4ade80" fontSize="12" fontWeight="bold" textAnchor="middle" filter="url(#mdaSoftGlow)">
          Die yield: {metrics.chipletYield.toFixed(1)}%
        </text>

        {/* Row 9: Yield chart title (y=305) */}
        <text x="137" y="305" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">YIELD vs DIE SIZE</text>

        {/* Row 10: Thermal status header (y=315) */}
        <text x="308" y="315" fill={thermalColor} fontSize="12" fontWeight="bold">THERMAL</text>

        {/* Row 11: Yield axis label (y=355) */}
        <text x="28" y="355" fill="#94a3b8" fontSize="11" textAnchor="middle">Yield%</text>

        {/* Row 12: Total power label (y=335) */}
        <text x="288" y="335" fill="#e2e8f0" fontSize="11">Power:</text>

        {/* Row 13: Total power value (y=335, right) */}
        <text x="358" y="335" fill="#f8fafc" fontSize="11" fontWeight="bold">{metrics.totalPower.toFixed(0)} W</text>

        {/* Row 14: Cooling label (y=352) */}
        <text x="288" y="352" fill="#e2e8f0" fontSize="11">Cooling:</text>

        {/* Row 15: Cooling value (y=352, right) */}
        <text x="358" y="352" fill="#f8fafc" fontSize="11" fontWeight="bold">{coolingCapacity} W</text>

        {/* Row 16: Thermal status result (y=375) */}
        {metrics.thermallyLimited ? (
          <text x="362" y="375" fill="#fca5a5" fontSize="12" fontWeight="bold" textAnchor="middle" filter="url(#mdaSoftGlow)">
            THROTTLING {metrics.throttlePercent.toFixed(0)}%
          </text>
        ) : (
          <text x="362" y="375" fill="#86efac" fontSize="12" fontWeight="bold" textAnchor="middle" filter="url(#mdaSoftGlow)">
            WITHIN BUDGET
          </text>
        )}

        {/* Row 17: Die size axis label (y=392) */}
        <text x="130" y="392" fill="#94a3b8" fontSize="11" textAnchor="middle">Die Size</text>

        {/* Row 18: Cost Analysis header (y=432) - left */}
        <text x="50" y="432" fill="#fbbf24" fontSize="12" fontWeight="bold">COST ANALYSIS</text>

        {/* Row 19: Key Insight header (y=432) - right */}
        <text x="296" y="432" fill="#c084fc" fontSize="12" fontWeight="bold">KEY INSIGHT</text>

        {/* Row 20: Cost labels (y=451) */}
        <text x="40" y="451" fill="#e2e8f0" fontSize="11">Cost/die:</text>
        <text x="40" y="468" fill="#e2e8f0" fontSize="11">Dies/wafer:</text>
        <text x="40" y="485" fill="#e2e8f0" fontSize="11">Chiplets:</text>

        {/* Row 21: Cost values (y=451, right col) */}
        <text x="140" y="451" fill="#fbbf24" fontSize="11" fontWeight="bold">${metrics.costPerGoodDie.toFixed(0)}</text>
        <text x="140" y="468" fill="#f8fafc" fontSize="11" fontWeight="bold">{metrics.goodDiesPerWafer.toFixed(1)}</text>
        <text x="140" y="485" fill={metrics.chipletSystemCost < metrics.costPerGoodDie ? '#4ade80' : '#fbbf24'} fontSize="11" fontWeight="bold" filter="url(#mdaSoftGlow)">${metrics.chipletSystemCost.toFixed(0)}</text>

        {/* Row 22: Insight text (y=451) - right side */}
        <text x="280" y="451" fill="#f8fafc" fontSize="11" fontWeight="500">
          {dieSize > 600 ? 'Large die: low yield' : metrics.thermallyLimited ? 'Thermal limit hit' : 'Within limits'}
        </text>
        <text x="280" y="468" fill="#a5b4fc" fontSize="11">
          {useChiplets ? `${chipletCount} chiplets: better` : 'Enable chiplets'}
        </text>

        {/* Reticle label - shown conditionally at top of progress bar area */}
        {dieSize > 700 && (
          <text x="260" y="491" fill="#fca5a5" fontSize="11" fontWeight="bold" textAnchor="middle">
            Reticle limit exceeded!
          </text>
        )}
      </svg>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          Die Size: {dieSize} mm2 {dieSize > 858 ? '(EXCEEDS RETICLE)' : ''}
        </label>
        <input
          type="range"
          min="100"
          max="1000"
          step="25"
          value={dieSize}
          onChange={(e) => setDieSize(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#8b5cf6', touchAction: 'pan-y', WebkitAppearance: 'none' } as React.CSSProperties}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
          <span>small (100mm²)</span><span>large (1000mm²)</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '4px', fontSize: '14px' }}>
            Defect Density: {defectDensity.toFixed(2)} /cm2
          </label>
          <input
            type="range"
            min="0.01"
            max="0.5"
            step="0.01"
            value={defectDensity}
            onChange={(e) => setDefectDensity(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#8b5cf6', touchAction: 'pan-y', WebkitAppearance: 'none' } as React.CSSProperties}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            <span>low</span><span>high</span>
          </div>
        </div>

        <div>
          <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '4px', fontSize: '14px' }}>
            Power Density: {powerDensity.toFixed(1)} W/mm2
          </label>
          <input
            type="range"
            min="0.2"
            max="2.0"
            step="0.1"
            value={powerDensity}
            onChange={(e) => setPowerDensity(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#8b5cf6', touchAction: 'pan-y', WebkitAppearance: 'none' } as React.CSSProperties}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            <span>cool</span><span>hot</span>
          </div>
        </div>
      </div>

      <div>
        <label style={{ color: '#e2e8f0', display: 'block', marginBottom: '4px', fontSize: '14px' }}>
          Cooling Capacity: {coolingCapacity} W
        </label>
        <input
          type="range"
          min="100"
          max="1000"
          step="50"
          value={coolingCapacity}
          onChange={(e) => setCoolingCapacity(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#8b5cf6', touchAction: 'pan-y', WebkitAppearance: 'none' } as React.CSSProperties}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
          <span>low (100W)</span><span>max (1000W)</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <button
          onClick={() => setUseChiplets(!useChiplets)}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: useChiplets ? '2px solid #22c55e' : '1px solid #475569',
            background: useChiplets ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
            color: '#f8fafc',
            cursor: 'pointer',
            fontWeight: 'bold',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {useChiplets ? 'Chiplets: ON' : 'Chiplets: OFF'}
        </button>

        {useChiplets && (
          <div style={{ flex: 1 }}>
            <label style={{ color: '#e2e8f0', fontSize: '12px' }}>Chiplet Count: {chipletCount}</label>
            <input
              type="range"
              min="2"
              max="8"
              step="1"
              value={chipletCount}
              onChange={(e) => setChipletCount(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#8b5cf6', touchAction: 'pan-y', WebkitAppearance: 'none' } as React.CSSProperties}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              <span>2</span><span>8</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ marginBottom: '24px' }}>
          <span style={{ color: '#8b5cf6', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px' }}>Chip Manufacturing</span>
          <h1 style={{ fontSize: '32px', marginTop: '8px', background: 'linear-gradient(90deg, #8b5cf6, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Manufacturing Drives Architecture
          </h1>
          <p style={{ color: '#e2e8f0', fontSize: '18px', marginTop: '8px' }}>
            Why not just make one giant perfect compute array?
          </p>
        </div>

        {renderVisualization()}

        <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', borderLeft: '4px solid #8b5cf6' }}>
          <p style={{ fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
            Explore how manufacturing realities shape chip design. If bigger chips mean more transistors and more performance, why do not chip designers just make one massive die? The answer involves yield curves, thermal physics, and the reticle limit - manufacturing constraints that drive architecture decisions.
          </p>
        </div>

        <button
          onClick={goNext}
          style={{
            marginTop: '24px',
            padding: '16px 32px',
            fontSize: '18px',
            fontWeight: 'bold',
            background: 'linear-gradient(90deg, #8b5cf6, #f59e0b)',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
            minHeight: '44px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Make a Prediction
        </button>
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Make Your Prediction</h2>

        {/* Static visualization for prediction */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <svg width="100%" height="200" viewBox="0 0 400 200" style={{ maxWidth: '400px' }} preserveAspectRatio="xMidYMid meet">
            <rect width="400" height="200" fill="#0f172a" rx="8" />
            <text x="200" y="30" fill="#e2e8f0" fontSize="14" textAnchor="middle" fontWeight="bold">Die Size Comparison</text>
            {/* 400mm2 die */}
            <rect x="50" y="50" width="80" height="80" fill="#3b82f6" stroke="#60a5fa" strokeWidth="2" rx="4" />
            <text x="90" y="150" fill="#e2e8f0" fontSize="12" textAnchor="middle">400mm2</text>
            {/* Arrow */}
            <path d="M160 90 L200 90 L190 80 M200 90 L190 100" stroke="#8b5cf6" strokeWidth="2" fill="none" />
            {/* 800mm2 die */}
            <rect x="230" y="30" width="120" height="120" fill="#3b82f6" stroke="#60a5fa" strokeWidth="2" rx="4" />
            <text x="290" y="170" fill="#e2e8f0" fontSize="12" textAnchor="middle">800mm2</text>
            <text x="290" y="185" fill="#f59e0b" fontSize="11" textAnchor="middle">(2x area)</text>
          </svg>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
          <p style={{ fontSize: '16px' }}>
            A chip designer wants to double the die size from 400mm2 to 800mm2 to fit twice as many transistors. What happens?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {predictions.map((p) => (
            <button
              key={p.id}
              onClick={() => setPrediction(p.id)}
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: prediction === p.id ? '2px solid #8b5cf6' : '1px solid #475569',
                background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                color: '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '15px',
                minHeight: '44px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {prediction && (
          <button
            onClick={goNext}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: '#8b5cf6',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              minHeight: '44px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Test My Prediction
          </button>
        )}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return renderPhaseContent(
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Explore Manufacturing Limits</h2>
        <p style={{ textAlign: 'center', color: '#e2e8f0', marginBottom: '8px' }}>
          The visualization displays current yield, thermal status, and cost metrics in real-time as you adjust the actual chip parameters below.
        </p>
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>
          When you increase die size, yield drops exponentially. If power density becomes larger, thermal throttling begins. Adjust each slider to see how manufacturing constraints interact.
        </p>

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

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '16px', borderRadius: '12px', marginTop: '16px', borderLeft: '4px solid #60a5fa' }}>
          <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '0' }}>
            <strong>Yield formula:</strong> Yield is calculated as e<sup>-(defect_density × die_area)</sup>. The relationship between die size and yield describes how larger dies exponentially amplify the impact of defects — a ratio of die area to defect-free probability.
          </p>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginTop: '16px' }}>
          <h3 style={{ color: '#8b5cf6', marginBottom: '12px' }}>Try These Experiments:</h3>
          <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li>Increase die size past 600mm2 - watch yield collapse</li>
            <li>Crank up power density - hit thermal throttling</li>
            <li>Increase defect density - see why leading-edge is expensive</li>
            <li>Enable chiplets - compare yield and cost</li>
          </ul>
        </div>

        <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '16px', borderRadius: '12px', marginTop: '16px', borderLeft: '4px solid #8b5cf6' }}>
          <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
            <strong>Real-world relevance:</strong> These exact trade-offs determine why NVIDIA H100 GPUs cost over $30,000 and why AMD chose chiplets for EPYC processors. Manufacturing physics shapes every modern processor design.
          </p>
        </div>

        <button
          onClick={goNext}
          style={{
            marginTop: '24px',
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            background: '#8b5cf6',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
            minHeight: '44px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Review the Concepts
        </button>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'practical_limits';
    const userPredictionLabel = predictions.find(p => p.id === prediction)?.label || 'No prediction made';

    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '24px',
          borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
        }}>
          <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
            {wasCorrect ? 'Correct!' : 'Not Quite!'}
          </h3>
          <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '12px' }}>
            <strong>Your prediction:</strong> {userPredictionLabel}
          </p>
          <p>
            Practical ceilings appear quickly. Doubling die area can halve yield (due to exponential defect probability), making cost per good die explode. Plus, twice the transistors at the same power density means twice the heat to remove.
          </p>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
          <h3 style={{ color: '#8b5cf6', marginBottom: '16px' }}>Three Physical Limits</h3>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ color: '#ef4444', marginBottom: '8px' }}>1. Yield (Defect Probability)</h4>
            <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
              Yield = e^(-D*A). This exponential decay means a 2x larger die does not cost 2x more - it can cost 3-4x more because so many dies fail. At 800mm2 with typical defect densities, yield can drop below 30%.
            </p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ color: '#f59e0b', marginBottom: '8px' }}>2. Thermal Dissipation</h4>
            <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
              More transistors = more power. A 800mm2 die at 1 W/mm2 needs to dissipate 800W. Even liquid cooling struggles above 500-700W. Either throttle performance or accept impossibly expensive cooling.
            </p>
          </div>

          <div>
            <h4 style={{ color: '#3b82f6', marginBottom: '8px' }}>3. Reticle Limit</h4>
            <p style={{ color: '#e2e8f0', fontSize: '14px' }}>
              EUV lithography exposes ~26mm x 33mm = 858mm2 maximum. Dies larger than this require stitching multiple exposures, which adds cost and complexity. This is a hard limit of physics.
            </p>
          </div>
        </div>

        <button
          onClick={goNext}
          style={{
            marginTop: '24px',
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            background: '#8b5cf6',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
            minHeight: '44px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Next: A Twist!
        </button>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', color: '#f59e0b', marginBottom: '24px' }}>The Twist: Chiplet Architecture</h2>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <svg width="100%" height="200" viewBox="0 0 500 200" style={{ maxWidth: '500px' }} preserveAspectRatio="xMidYMid meet">
            <rect width="500" height="200" fill="#0f172a" rx="8" />
            <text x="250" y="22" fill="#f59e0b" fontSize="14" textAnchor="middle" fontWeight="bold">Monolithic vs Chiplet Architecture</text>
            <rect x="30" y="40" width="160" height="120" fill="#3b82f6" stroke="#60a5fa" strokeWidth="2" rx="6" />
            <text x="110" y="107" fill="#f8fafc" fontSize="13" textAnchor="middle" fontWeight="bold">MONOLITHIC</text>
            <text x="110" y="125" fill="#93c5fd" fontSize="11" textAnchor="middle">800mm² single die</text>
            <text x="110" y="172" fill="#ef4444" fontSize="12" textAnchor="middle">Yield: ~30%</text>
            <text x="250" y="107" fill="#a855f7" fontSize="14" textAnchor="middle" fontWeight="bold">VS</text>
            <rect x="315" y="40" width="65" height="55" fill="#22c55e" stroke="#4ade80" strokeWidth="1.5" rx="4" />
            <rect x="390" y="40" width="65" height="55" fill="#22c55e" stroke="#4ade80" strokeWidth="1.5" rx="4" />
            <rect x="315" y="105" width="65" height="55" fill="#22c55e" stroke="#4ade80" strokeWidth="1.5" rx="4" />
            <rect x="390" y="105" width="65" height="55" fill="#22c55e" stroke="#4ade80" strokeWidth="1.5" rx="4" />
            <text x="420" y="172" fill="#4ade80" fontSize="12" textAnchor="middle">Yield: ~90%</text>
            <text x="372" y="185" fill="#86efac" fontSize="11" textAnchor="middle">4 chiplets, 200mm² each</text>
          </svg>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
          <p style={{ fontSize: '16px', marginBottom: '12px' }}>
            Instead of one large die, what if we use multiple smaller dies (chiplets) connected on an advanced package? AMD, Apple, and Intel all do this now.
          </p>
          <p style={{ fontSize: '16px' }}>
            What is the impact?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {twistPredictions.map((p) => (
            <button
              key={p.id}
              onClick={() => setTwistPrediction(p.id)}
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: twistPrediction === p.id ? '2px solid #f59e0b' : '1px solid #475569',
                background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                color: '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '15px',
                minHeight: '44px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {twistPrediction && (
          <button
            onClick={goNext}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: '#f59e0b',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              minHeight: '44px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Test My Prediction
          </button>
        )}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return renderPhaseContent(
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Chiplet Comparison</h2>
        <p style={{ textAlign: 'center', color: '#e2e8f0', marginBottom: '24px' }}>
          Toggle chiplets ON and adjust count to see the yield and cost impact
        </p>

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

        <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', border: '1px solid #22c55e' }}>
          <h3 style={{ color: '#22c55e', marginBottom: '12px' }}>Chiplet Advantages:</h3>
          <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li>Exponentially better per-chiplet yield</li>
            <li>A defect only ruins one small chiplet, not the whole system</li>
            <li>Different chiplets can use different process nodes</li>
            <li>Better heat spreading across the package</li>
          </ul>
        </div>

        <button
          onClick={goNext}
          style={{
            marginTop: '24px',
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            background: '#22c55e',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
            minHeight: '44px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          See the Explanation
        </button>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'chiplets_better';

    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '24px',
          borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
        }}>
          <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
            {wasCorrect ? 'Correct!' : 'Not Quite!'}
          </h3>
          <p>
            Chiplets overcome both yield and thermal limits. Smaller dies have exponentially better yield. Spreading heat sources improves thermal management. Advanced packaging (like TSMC CoWoS) makes chiplet-to-chiplet bandwidth nearly as good as on-die.
          </p>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>The Chiplet Revolution</h3>
          <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6 }}>
            Manufacturing constraints drove the shift to chiplets. AMD EPYC, Apple M1 Ultra, and Intel Ponte Vecchio all use chiplets because the economics are superior. You get more working silicon per dollar, better thermals, and can mix process nodes. The trade-off is packaging complexity and some latency penalty, but advanced 2.5D/3D packaging minimizes this.
          </p>
        </div>

        <button
          onClick={goNext}
          style={{
            marginTop: '24px',
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            background: '#22c55e',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
            minHeight: '44px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Apply This Knowledge
        </button>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Manufacturing Drives Architecture"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Real-World Applications</h2>
        <p style={{ textAlign: 'center', color: '#e2e8f0', marginBottom: '24px' }}>
          Manufacturing limits shape the chips that power AI
        </p>

        {transferApplications.map((app, index) => (
          <div
            key={index}
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
              border: transferCompleted.has(index) ? '2px solid #22c55e' : '1px solid #475569',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ color: '#f8fafc' }}>{app.title}</h3>
              {transferCompleted.has(index) && <span style={{ color: '#22c55e' }}>Complete</span>}
            </div>
            <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
            <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
              <p style={{ color: '#8b5cf6', fontSize: '14px' }}>{app.question}</p>
            </div>
            {!transferCompleted.has(index) ? (
              <button
                onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #8b5cf6',
                  background: 'transparent',
                  color: '#8b5cf6',
                  cursor: 'pointer',
                  minHeight: '44px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Reveal Answer
              </button>
            ) : (
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #22c55e' }}>
                <p style={{ color: '#e2e8f0', fontSize: '14px' }}>{app.answer}</p>
              </div>
            )}
          </div>
        ))}

        <button
          onClick={goNext}
          style={{
            marginTop: '24px',
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            background: '#22c55e',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
            minHeight: '44px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Got It
        </button>
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return renderPhaseContent(
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: testScore >= 8 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center',
            marginBottom: '24px',
          }}>
            <h2 style={{ color: testScore >= 8 ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
              Test Complete! {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ fontSize: '24px', fontWeight: 'bold' }}>You Scored: {testScore} / 10</p>
          </div>

          {testQuestions.map((q, qIndex) => {
            const userAnswer = testAnswers[qIndex];
            const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
            return (
              <div key={qIndex} style={{
                background: 'rgba(30, 41, 59, 0.8)',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '12px',
                borderLeft: `4px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
              }}>
                <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>{qIndex + 1}. {q.question}</p>
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} style={{
                    padding: '8px',
                    borderRadius: '6px',
                    marginBottom: '4px',
                    background: opt.correct ? 'rgba(34, 197, 94, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    color: opt.correct ? '#22c55e' : userAnswer === oIndex ? '#ef4444' : '#e2e8f0',
                  }}>
                    {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
                  </div>
                ))}
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
            <button
              onClick={() => window.location.href = '/dashboard'}
              style={{
                flex: 1,
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: 'transparent',
                border: '1px solid #475569',
                borderRadius: '12px',
                color: '#f8fafc',
                cursor: 'pointer',
                minHeight: '44px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setTestSubmitted(false);
                setTestAnswers(new Array(10).fill(null));
                setCurrentTestQuestion(0);
                goToPhase('hook');
              }}
              style={{
                flex: 1,
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: '#8b5cf6',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                cursor: 'pointer',
                minHeight: '44px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Play Again
            </button>
          </div>
          <button
            onClick={goNext}
            style={{
              marginTop: '16px',
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: testScore >= 8 ? '#22c55e' : '#8b5cf6',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              minHeight: '44px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {testScore >= 8 ? 'Unlock Mastery' : 'Review & Retry'}
          </button>
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];

    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Knowledge Test</h2>
          <span style={{ color: '#e2e8f0' }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
        </div>

        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
          {testQuestions.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrentTestQuestion(i)}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: testAnswers[i] !== null ? '#8b5cf6' : i === currentTestQuestion ? '#94a3b8' : '#475569',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px', borderLeft: '3px solid #8b5cf6' }}>
          <p style={{ color: '#c4b5fd', fontSize: '13px', margin: 0 }}>
            In semiconductor manufacturing, defects are randomly distributed across wafers. As die area increases, the probability that any single die contains at least one fatal defect grows exponentially. The Poisson yield model captures this relationship, which is why yield management and architecture choices like chiplets are critical to cost and performance.
          </p>
        </div>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
          <p style={{ fontSize: '16px' }}>{currentQ.question}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {currentQ.options.map((opt, oIndex) => (
            <button
              key={oIndex}
              onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: testAnswers[currentTestQuestion] === oIndex ? '2px solid #8b5cf6' : '1px solid #475569',
                background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                color: '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left',
                minHeight: '44px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {opt.text}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
          <button
            onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
            disabled={currentTestQuestion === 0}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid #475569',
              background: 'transparent',
              color: currentTestQuestion === 0 ? '#475569' : '#f8fafc',
              cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
              minHeight: '44px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Previous
          </button>

          {currentTestQuestion < testQuestions.length - 1 ? (
            <button
              onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#8b5cf6',
                color: 'white',
                cursor: 'pointer',
                minHeight: '44px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={submitTest}
              disabled={testAnswers.includes(null)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: testAnswers.includes(null) ? '#475569' : '#22c55e',
                color: 'white',
                cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                minHeight: '44px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Submit Test
            </button>
          )}
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return renderPhaseContent(
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
        <h1 style={{ color: '#22c55e', marginBottom: '8px' }}>Mastery Achieved!</h1>
        <p style={{ color: '#e2e8f0', marginBottom: '24px' }}>
          You understand how manufacturing shapes chip architecture
        </p>

        <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', textAlign: 'left', marginBottom: '24px' }}>
          <h3 style={{ color: '#8b5cf6', marginBottom: '12px' }}>Key Concepts Mastered:</h3>
          <ul style={{ color: '#e2e8f0', lineHeight: 1.8, paddingLeft: '20px' }}>
            <li>Yield decreases exponentially with die size</li>
            <li>Thermal dissipation has hard limits</li>
            <li>Reticle limit caps monolithic die size</li>
            <li>Chiplets overcome yield and thermal limits</li>
            <li>Manufacturing economics drive architecture decisions</li>
          </ul>
        </div>

        <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '20px', borderRadius: '12px', textAlign: 'left' }}>
          <h3 style={{ color: '#8b5cf6', marginBottom: '12px' }}>The Physics Connection:</h3>
          <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6 }}>
            Solar panels, AI chips, and power converters all face the same truth: physics constrains design. Just as solar yield is dominated by a few factors, chip cost is dominated by defect density and die area. Understanding these physical limits helps you predict what is possible and why architectures evolve the way they do.
          </p>
        </div>

        <button
          onClick={goNext}
          style={{
            marginTop: '24px',
            padding: '16px 32px',
            fontSize: '18px',
            fontWeight: 'bold',
            background: 'linear-gradient(90deg, #8b5cf6, #22c55e)',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: 'pointer',
            minHeight: '44px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Complete
        </button>
      </div>
    );
  }

  return null;
};

export default ManufacturingDrivesArchitectureRenderer;
