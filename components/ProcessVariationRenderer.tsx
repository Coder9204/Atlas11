const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {};

import React, { useState, useCallback, useEffect, useRef } from 'react';

const realWorldApps = [
   {
      icon: '💻',
      title: 'CPU Speed Binning',
      short: 'Same chip, different speeds',
      tagline: 'Turning defects into profits',
      description: 'Intel and AMD test every processor and sort them by maximum stable frequency. Faster chips become premium products, slower ones sell at lower prices - all from the same manufacturing run.',
      connection: 'Random process variation creates a natural distribution of transistor speeds. Rather than discarding slower chips, manufacturers monetize the entire distribution.',
      howItWorks: 'Each chip is tested at increasing frequencies until it fails. Those reaching highest speeds become i9/Ryzen 9, while slower ones become i5/Ryzen 5 variants.',
      stats: [
         { value: '30%', label: 'Speed variation', icon: '📊' },
         { value: '$500+', label: 'Price difference', icon: '💰' },
         { value: '95%', label: 'Yield rate target', icon: '🎯' }
      ],
      examples: ['Intel Core i9 vs i5', 'AMD Ryzen 9 vs 5', 'NVIDIA RTX tiers', 'Apple M-series chips'],
      companies: ['Intel', 'AMD', 'NVIDIA', 'TSMC'],
      futureImpact: 'AI-driven binning and adaptive voltage scaling will extract maximum performance from every chip.',
      color: '#3B82F6'
   },
   {
      icon: '📱',
      title: 'SRAM Yield Challenges',
      short: 'Memory cells fail first',
      tagline: 'The canary in the fab',
      description: 'SRAM cells are the smallest, most variation-sensitive structures on chips. They often determine overall yield because mismatched transistors cause read/write failures.',
      connection: 'Six-transistor SRAM cells require precise balance. Even small threshold voltage (Vth) mismatches between paired transistors cause bit failures.',
      howItWorks: 'Designers add redundant rows/columns and error correction. When cells fail, spare cells replace them, rescuing chips that would otherwise be discarded.',
      stats: [
         { value: '6T', label: 'Transistors per cell', icon: '⚡' },
         { value: '10%', label: 'Cache adds to die area', icon: '📐' },
         { value: '99.9%', label: 'ECC correction rate', icon: '✅' }
      ],
      examples: ['CPU L1/L2/L3 cache', 'GPU shared memory', 'Smartphone processors', 'Embedded controllers'],
      companies: ['Samsung', 'Micron', 'SK Hynix', 'Intel'],
      futureImpact: 'New memory architectures like MRAM may reduce variation sensitivity while enabling non-volatile caches.',
      color: '#8B5CF6'
   },
   {
      icon: '🔋',
      title: 'Adaptive Voltage Scaling',
      short: 'Each chip finds its sweet spot',
      tagline: 'Custom tuning at scale',
      description: 'Modern processors store calibration data in fuses during manufacturing. At runtime, chips adjust voltage and frequency based on their unique silicon characteristics and workload.',
      connection: 'Process variation means each chip has an optimal voltage-frequency curve. AVS finds the minimum voltage needed for stable operation, saving power.',
      howItWorks: 'Factory testing maps each chip\'s voltage-frequency relationship. Runtime monitors adjust voltage dynamically, compensating for temperature and aging.',
      stats: [
         { value: '20%', label: 'Power savings', icon: '⚡' },
         { value: '1000+', label: 'Voltage steps', icon: '📊' },
         { value: 'ms', label: 'Adjustment speed', icon: '⏱️' }
      ],
      examples: ['Smartphone SoCs', 'Data center CPUs', 'Laptop processors', 'Electric vehicle controllers'],
      companies: ['Qualcomm', 'Apple', 'AMD', 'ARM'],
      futureImpact: 'Machine learning will predict optimal voltage settings before workload changes occur.',
      color: '#10B981'
   },
   {
      icon: '🏭',
      title: 'Design for Manufacturing',
      short: 'Building variation tolerance in',
      tagline: 'Anticipating imperfection',
      description: 'Chip designers add margins, use restricted design rules, and apply optical proximity correction (OPC) to ensure layouts survive real-world manufacturing variation.',
      connection: 'Instead of fighting variation, modern design flows embrace it. Statistical timing analysis treats delays as distributions, not fixed values.',
      howItWorks: 'Designers simulate thousands of random variation scenarios. Layouts are adjusted to ensure circuits work across the expected statistical range.',
      stats: [
         { value: '3σ', label: 'Design margin', icon: '📐' },
         { value: '99.7%', label: 'Coverage target', icon: '🎯' },
         { value: '10x', label: 'Simulation increase', icon: '💻' }
      ],
      examples: ['EDA timing analysis', 'Lithography simulation', 'Via redundancy', 'Guard-banding'],
      companies: ['Synopsys', 'Cadence', 'Mentor', 'ASML'],
      futureImpact: 'AI-driven design automation will optimize layouts for manufacturability in hours instead of weeks.',
      color: '#F59E0B'
   }
];

interface GameEvent {
  type: 'phase_complete' | 'answer_correct' | 'answer_incorrect' | 'interaction';
  phase?: string;
  data?: Record<string, unknown>;
}

interface ProcessVariationRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

type PVPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const validPhases: PVPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseOrder: PVPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<PVPhase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Play',
  review: 'Review',
  twist_predict: 'Twist',
  twist_play: 'Explore',
  twist_review: 'Explain',
  transfer: 'Apply',
  test: 'Test',
  mastery: 'Mastery',
};

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
  fast: '#3b82f6',
  typical: '#10b981',
  slow: '#ef4444',
  histogram: '#8b5cf6',
};

// Seeded random number generator for reproducibility
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const ProcessVariationRenderer: React.FC<ProcessVariationRendererProps> = ({
  onGameEvent,
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase state management
  const getInitialPhase = (): PVPhase => {
    if (gamePhase && validPhases.includes(gamePhase as PVPhase)) {
      return gamePhase as PVPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<PVPhase>(getInitialPhase);
  const [isMobile, setIsMobile] = useState(false);
  const navigationRef = useRef<boolean>(false);

  // Sync with external gamePhase prop changes
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as PVPhase)) {
      setPhase(gamePhase as PVPhase);
    }
  }, [gamePhase]);

  // Mobile detection
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
  const goToPhase = useCallback((newPhase: PVPhase) => {
    if (navigationRef.current) return;
    navigationRef.current = true;

    playSound('transition');
    setPhase(newPhase);

    if (onGameEvent) {
      onGameEvent({ type: 'phase_complete', phase: newPhase });
    }

    setTimeout(() => {
      navigationRef.current = false;
    }, 300);
  }, [onGameEvent]);

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
  const [vthVariation, setVthVariation] = useState(10); // mV sigma
  const [lineWidthVariation, setLineWidthVariation] = useState(5); // % sigma
  const [targetClock, setTargetClock] = useState(1000); // MHz
  const [numPaths, setNumPaths] = useState(1000);
  const [adaptiveVoltage, setAdaptiveVoltage] = useState(false);
  const [voltageBoost, setVoltageBoost] = useState(0); // % boost
  const [frequencyReduction, setFrequencyReduction] = useState(0); // % reduction
  const [simulationSeed, setSimulationSeed] = useState(42);
  const [isSimulating, setIsSimulating] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Monte Carlo simulation
  const runMonteCarloSimulation = useCallback(() => {
    const delays: number[] = [];
    const baseDelay = 1000 / targetClock; // ns for one clock period

    for (let i = 0; i < numPaths; i++) {
      // Generate random variations for this path
      const seed1 = simulationSeed * 1000 + i;
      const seed2 = simulationSeed * 2000 + i;

      // Box-Muller transform for Gaussian distribution
      const u1 = seededRandom(seed1);
      const u2 = seededRandom(seed2);
      const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);

      // Threshold voltage variation effect on delay (higher Vth = slower)
      const vthShift = z0 * vthVariation; // mV
      const vthDelayFactor = 1 + vthShift / 200; // 200mV ~ 100% delay change

      // Line width variation effect (narrower = slower due to higher resistance)
      const widthShift = z1 * lineWidthVariation; // %
      const widthDelayFactor = 1 - widthShift / 50; // 50% width change ~ 100% delay change

      // Adaptive voltage compensation
      let adaptiveFactor = 1;
      if (adaptiveVoltage) {
        // Voltage boost speeds up transistors
        adaptiveFactor = 1 - voltageBoost / 100;
        // Frequency reduction gives more time margin
        adaptiveFactor *= (1 + frequencyReduction / 100);
      }

      // Combined delay for this path
      const pathDelay = baseDelay * vthDelayFactor * widthDelayFactor * adaptiveFactor;
      delays.push(pathDelay);
    }

    // Sort delays for histogram
    delays.sort((a, b) => a - b);

    // Calculate statistics
    const mean = delays.reduce((a, b) => a + b, 0) / delays.length;
    const variance = delays.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / delays.length;
    const stdDev = Math.sqrt(variance);
    const minDelay = delays[0];
    const maxDelay = delays[delays.length - 1];
    const targetPeriod = 1000 / targetClock;

    // Count failing paths (delay > target period)
    const failingPaths = delays.filter(d => d > targetPeriod).length;
    const yieldPercent = ((delays.length - failingPaths) / delays.length) * 100;

    // Create histogram bins
    const numBins = 30;
    const binWidth = (maxDelay - minDelay) / numBins;
    const histogram: { binStart: number; count: number }[] = [];
    for (let i = 0; i < numBins; i++) {
      const binStart = minDelay + i * binWidth;
      const binEnd = binStart + binWidth;
      const count = delays.filter(d => d >= binStart && d < binEnd).length;
      histogram.push({ binStart, count });
    }

    return {
      delays,
      mean,
      stdDev,
      minDelay,
      maxDelay,
      failingPaths,
      yieldPercent,
      histogram,
      targetPeriod,
    };
  }, [numPaths, vthVariation, lineWidthVariation, targetClock, adaptiveVoltage, voltageBoost, frequencyReduction, simulationSeed]);

  const predictions = [
    { id: 'identical', label: 'All transistors behave identically - variation is negligible' },
    { id: 'few_slow', label: 'A few slow paths dominate timing failures' },
    { id: 'uniform', label: 'Variation is uniform - all paths are equally likely to fail' },
    { id: 'fast_fail', label: 'Fast paths cause failures due to hold time violations' },
  ];

  const twistPredictions = [
    { id: 'voltage_best', label: 'Voltage boost alone is the best solution' },
    { id: 'frequency_best', label: 'Frequency reduction alone is the best solution' },
    { id: 'combined', label: 'Combining both gives the best yield/performance trade-off' },
    { id: 'neither', label: 'Neither helps - the chip is fundamentally broken' },
  ];

  const transferApplications = [
    {
      title: 'SRAM Stability',
      description: 'Static RAM cells are extremely sensitive to threshold voltage mismatch between paired transistors.',
      question: 'Why do SRAM bit cells fail more often than logic gates?',
      answer: 'SRAM requires precise balance between 6 transistors. Vth mismatch causes read/write margin degradation. At advanced nodes, SRAM yield often limits overall chip yield, driving the need for ECC and redundancy.',
    },
    {
      title: 'Speed Binning',
      description: 'Chips are tested and sorted into different speed grades based on their maximum operating frequency.',
      question: 'How does process variation enable speed binning as a business strategy?',
      answer: 'Natural variation creates a distribution of chip speeds. Instead of discarding slower chips, they are sold at lower prices for less demanding applications. The fastest chips command premium prices for high-performance markets.',
    },
    {
      title: 'Design for Manufacturing',
      description: 'Modern chip design includes techniques to tolerate manufacturing variation.',
      question: 'What is "design for manufacturing" (DFM) and why is it important?',
      answer: 'DFM includes guard-banding (adding margin), restricted design rules, redundant vias, and OPC (optical proximity correction). These techniques make layouts more robust to lithography and etch variations, improving yield.',
    },
    {
      title: 'Adaptive Voltage Scaling',
      description: 'Modern processors dynamically adjust voltage and frequency based on workload and silicon quality.',
      question: 'How do chips "learn" their optimal voltage/frequency operating point?',
      answer: 'During manufacturing test, each chip is characterized to find its minimum voltage at each frequency. This data is stored in on-chip fuses. At runtime, the chip uses this data plus thermal/power sensors to optimize operation.',
    },
  ];

  const testQuestions = [
    {
      question: 'Process variation refers to:',
      options: [
        { text: 'Intentional differences between chip designs', correct: false },
        { text: 'Random differences in manufactured device parameters', correct: true },
        { text: 'Variation in chip packaging', correct: false },
        { text: 'Differences between fab locations', correct: false },
      ],
    },
    {
      question: 'Threshold voltage (Vth) variation primarily affects:',
      options: [
        { text: 'Chip physical dimensions', correct: false },
        { text: 'Transistor switching speed and leakage', correct: true },
        { text: 'Metal interconnect resistance', correct: false },
        { text: 'Package thermal resistance', correct: false },
      ],
    },
    {
      question: 'In a chip with millions of paths, timing failures are typically caused by:',
      options: [
        { text: 'All paths failing simultaneously', correct: false },
        { text: 'A small number of statistically slow paths', correct: true },
        { text: 'The average path delay', correct: false },
        { text: 'Paths that are too fast', correct: false },
      ],
    },
    {
      question: 'Line width variation affects delay because:',
      options: [
        { text: 'Narrower lines have higher resistance', correct: true },
        { text: 'Wider lines block more light', correct: false },
        { text: 'Line width affects chip color', correct: false },
        { text: 'Lines always have the same resistance', correct: false },
      ],
    },
    {
      question: 'Design "corners" (FF, TT, SS) represent:',
      options: [
        { text: 'Physical corners of the die', correct: false },
        { text: 'Combinations of best/worst case process parameters', correct: true },
        { text: 'Temperature measurement points', correct: false },
        { text: 'Test probe locations', correct: false },
      ],
    },
    {
      question: 'Increasing supply voltage to compensate for variation:',
      options: [
        { text: 'Has no effect on performance', correct: false },
        { text: 'Speeds up transistors but increases power consumption', correct: true },
        { text: 'Slows down transistors', correct: false },
        { text: 'Reduces chip yield', correct: false },
      ],
    },
    {
      question: 'Statistical timing analysis differs from traditional timing analysis by:',
      options: [
        { text: 'Ignoring process variation', correct: false },
        { text: 'Treating delays as probability distributions, not single values', correct: true },
        { text: 'Only analyzing critical paths', correct: false },
        { text: 'Using faster computers', correct: false },
      ],
    },
    {
      question: 'Die-to-die variation is caused by:',
      options: [
        { text: 'Transistors on the same die having different sizes', correct: false },
        { text: 'Systematic differences between chips on a wafer', correct: true },
        { text: 'Packaging differences', correct: false },
        { text: 'Testing errors', correct: false },
      ],
    },
    {
      question: 'Yield loss due to process variation can be improved by:',
      options: [
        { text: 'Making the chip larger', correct: false },
        { text: 'Adding timing margin and using redundancy', correct: true },
        { text: 'Reducing the number of transistors', correct: false },
        { text: 'Using older technology nodes', correct: false },
      ],
    },
    {
      question: 'The "3-sigma" rule in design means:',
      options: [
        { text: 'Using three different process technologies', correct: false },
        { text: 'Designing for 99.7% of the variation distribution', correct: true },
        { text: 'Running three simulation iterations', correct: false },
        { text: 'Having three backup designs', correct: false },
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
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  // Auto-simulate on parameter change
  useEffect(() => {
    if (isSimulating) {
      const timer = setTimeout(() => {
        setSimulationSeed(prev => prev + 1);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isSimulating, simulationSeed]);

  const renderProgressBar = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px',
      background: colors.bgDark,
      borderBottom: '1px solid rgba(255,255,255,0.1)',
    }}>
      {phaseOrder.map((p, index) => {
        const isActive = p === phase;
        const isPast = phaseOrder.indexOf(p) < phaseOrder.indexOf(phase);
        return (
          <div
            key={p}
            onClick={() => isPast && goToPhase(p)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: isPast ? 'pointer' : 'default',
              opacity: isActive ? 1 : isPast ? 0.7 : 0.4,
            }}
          >
            <div style={{
              width: isMobile ? '10px' : '12px',
              height: isMobile ? '10px' : '12px',
              borderRadius: '50%',
              background: isActive ? colors.accent : isPast ? colors.success : 'rgba(255,255,255,0.3)',
              border: isActive ? `2px solid ${colors.accent}` : 'none',
              boxShadow: isActive ? `0 0 8px ${colors.accentGlow}` : 'none',
            }} />
            {!isMobile && (
              <span style={{
                fontSize: '9px',
                color: isActive ? colors.accent : colors.textMuted,
                marginTop: '4px',
              }}>
                {phaseLabels[p]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderVisualization = (interactive: boolean, showAdaptive: boolean = false) => {
    const width = 700;
    const height = 520;
    const sim = runMonteCarloSimulation();

    // Histogram rendering
    const histogramHeight = 160;
    const histogramTop = 320;
    const maxCount = Math.max(...sim.histogram.map(h => h.count));
    const barWidth = 280 / sim.histogram.length;

    // Color based on whether bin is before or after target
    const getBinColor = (binStart: number) => {
      if (binStart > sim.targetPeriod) return 'url(#pvarHistFail)';
      if (binStart > sim.targetPeriod * 0.9) return 'url(#pvarHistWarn)';
      return 'url(#pvarHistPass)';
    };

    // Generate wafer die grid with variation coloring
    const waferRadius = 115;
    const dieSize = 18;
    const waferCenterX = 140;
    const waferCenterY = 150;
    const dies: { x: number; y: number; delay: number; color: string }[] = [];

    for (let row = -6; row <= 6; row++) {
      for (let col = -6; col <= 6; col++) {
        const x = waferCenterX + col * dieSize;
        const y = waferCenterY + row * dieSize;
        const distFromCenter = Math.sqrt(Math.pow(x - waferCenterX, 2) + Math.pow(y - waferCenterY, 2));

        if (distFromCenter < waferRadius - 5) {
          // Generate consistent delay for this die based on position
          const seed = simulationSeed + row * 100 + col;
          const u1 = seededRandom(seed);
          const u2 = seededRandom(seed + 1000);
          const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

          const baseDelay = 1000 / targetClock;
          const vthShift = z0 * vthVariation;
          const delay = baseDelay * (1 + vthShift / 200);

          // Systematic edge effects
          const edgeFactor = 1 + (distFromCenter / waferRadius) * 0.1;
          const finalDelay = delay * edgeFactor;

          // Color based on delay
          let color: string;
          if (finalDelay > sim.targetPeriod) {
            color = 'url(#pvarDieFail)';
          } else if (finalDelay > sim.targetPeriod * 0.9) {
            color = 'url(#pvarDieWarn)';
          } else if (finalDelay < sim.targetPeriod * 0.8) {
            color = 'url(#pvarDieFast)';
          } else {
            color = 'url(#pvarDiePass)';
          }

          dies.push({ x, y, delay: finalDelay, color });
        }
      }
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #030712 100%)', borderRadius: '12px', maxWidth: '750px' }}
        >
          <defs>
            {/* === PREMIUM BACKGROUND GRADIENTS === */}
            <linearGradient id="pvarLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a1628" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a1628" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* === WAFER GRADIENTS === */}
            <radialGradient id="pvarWaferSurface" cx="35%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="20%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="80%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>

            <radialGradient id="pvarWaferEdge" cx="50%" cy="50%" r="50%">
              <stop offset="85%" stopColor="transparent" />
              <stop offset="92%" stopColor="#64748b" stopOpacity="0.3" />
              <stop offset="96%" stopColor="#94a3b8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#475569" stopOpacity="0.8" />
            </radialGradient>

            <radialGradient id="pvarWaferShine" cx="25%" cy="25%" r="60%">
              <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.15" />
              <stop offset="30%" stopColor="#94a3b8" stopOpacity="0.08" />
              <stop offset="60%" stopColor="#64748b" stopOpacity="0.03" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            {/* === DIE COLOR GRADIENTS === */}
            <linearGradient id="pvarDieFast" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#0891b2" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>

            <linearGradient id="pvarDiePass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>

            <linearGradient id="pvarDieWarn" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            <linearGradient id="pvarDieFail" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* === HISTOGRAM GRADIENTS === */}
            <linearGradient id="pvarHistPass" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="30%" stopColor="#8b5cf6" />
              <stop offset="70%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>

            <linearGradient id="pvarHistWarn" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="30%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            <linearGradient id="pvarHistFail" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="30%" stopColor="#f87171" />
              <stop offset="70%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* === PANEL GRADIENTS === */}
            <linearGradient id="pvarPanelBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#0f172a" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0.98" />
            </linearGradient>

            <linearGradient id="pvarYieldGaugePass" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="30%" stopColor="#4ade80" />
              <stop offset="70%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>

            <linearGradient id="pvarYieldGaugeWarn" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="30%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            <linearGradient id="pvarYieldGaugeFail" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="30%" stopColor="#f87171" />
              <stop offset="70%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* === GLOW FILTERS === */}
            <filter id="pvarDieGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="pvarWaferGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="pvarTextGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="pvarPanelShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="2" dy="2" stdDeviation="4" floodColor="#000000" floodOpacity="0.5" />
            </filter>

            <filter id="pvarBarGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* === GRID PATTERN === */}
            <pattern id="pvarGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.5" />
            </pattern>
          </defs>

          {/* Premium background */}
          <rect width={width} height={height} fill="url(#pvarLabBg)" />
          <rect width={width} height={height} fill="url(#pvarGrid)" />

          {/* === WAFER VISUALIZATION SECTION === */}
          <g transform="translate(0, 10)">
            {/* Section label */}
            <rect x="30" y="0" width="220" height="22" rx="4" fill="url(#pvarPanelBg)" filter="url(#pvarPanelShadow)" />
            <text x="140" y="15" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">WAFER MAP - DIE VARIATION</text>

            {/* Wafer base with glow */}
            <circle cx={waferCenterX} cy={waferCenterY} r={waferRadius + 8} fill="#0891b2" opacity="0.1" filter="url(#pvarWaferGlow)" />
            <circle cx={waferCenterX} cy={waferCenterY} r={waferRadius + 3} fill="#334155" />
            <circle cx={waferCenterX} cy={waferCenterY} r={waferRadius} fill="url(#pvarWaferSurface)" />

            {/* Dies */}
            <g filter="url(#pvarDieGlow)">
              {dies.map((die, i) => (
                <rect
                  key={i}
                  x={die.x - dieSize / 2 + 1}
                  y={die.y - dieSize / 2 + 1}
                  width={dieSize - 2}
                  height={dieSize - 2}
                  fill={die.color}
                  rx="1"
                  opacity="0.9"
                  stroke="#0f172a"
                  strokeWidth="0.5"
                />
              ))}
            </g>

            {/* Wafer notch */}
            <path d={`M ${waferCenterX - 8} ${waferCenterY + waferRadius - 2} L ${waferCenterX} ${waferCenterY + waferRadius - 12} L ${waferCenterX + 8} ${waferCenterY + waferRadius - 2}`} fill="#1e293b" stroke="#475569" strokeWidth="1" />

            {/* Wafer edge highlight */}
            <circle cx={waferCenterX} cy={waferCenterY} r={waferRadius} fill="url(#pvarWaferEdge)" />
            <circle cx={waferCenterX} cy={waferCenterY} r={waferRadius} fill="url(#pvarWaferShine)" />
            <circle cx={waferCenterX} cy={waferCenterY} r={waferRadius} fill="none" stroke="#64748b" strokeWidth="1.5" />

            {/* Die legend */}
            <g transform="translate(30, 280)">
              <rect x="0" y="-5" width="220" height="20" rx="3" fill="url(#pvarPanelBg)" opacity="0.8" />
              <rect x="5" y="0" width="10" height="10" fill="url(#pvarDieFast)" rx="1" />
              <text x="18" y="9" fill="#94a3b8" fontSize="7">Fast</text>
              <rect x="50" y="0" width="10" height="10" fill="url(#pvarDiePass)" rx="1" />
              <text x="63" y="9" fill="#94a3b8" fontSize="7">Pass</text>
              <rect x="100" y="0" width="10" height="10" fill="url(#pvarDieWarn)" rx="1" />
              <text x="113" y="9" fill="#94a3b8" fontSize="7">Marginal</text>
              <rect x="165" y="0" width="10" height="10" fill="url(#pvarDieFail)" rx="1" />
              <text x="178" y="9" fill="#94a3b8" fontSize="7">Fail</text>
            </g>
          </g>

          {/* === STATISTICS PANEL === */}
          <g transform="translate(280, 10)">
            <rect x="0" y="0" width="200" height="140" rx="8" fill="url(#pvarPanelBg)" filter="url(#pvarPanelShadow)" stroke="#334155" strokeWidth="1" />
            <text x="100" y="22" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="bold">STATISTICS</text>

            <text x="15" y="45" fill="#94a3b8" fontSize="10">Mean Delay:</text>
            <text x="185" y="45" fill="#e2e8f0" fontSize="11" textAnchor="end" fontWeight="bold">{sim.mean.toFixed(3)} ns</text>

            <text x="15" y="62" fill="#94a3b8" fontSize="10">Std Deviation:</text>
            <text x="185" y="62" fill="#e2e8f0" fontSize="11" textAnchor="end" fontWeight="bold">{sim.stdDev.toFixed(3)} ns</text>

            <text x="15" y="79" fill="#94a3b8" fontSize="10">3-Sigma Range:</text>
            <text x="185" y="79" fill="#e2e8f0" fontSize="10" textAnchor="end">{(sim.mean - 3 * sim.stdDev).toFixed(2)} - {(sim.mean + 3 * sim.stdDev).toFixed(2)}</text>

            <text x="15" y="96" fill="#94a3b8" fontSize="10">Target Period:</text>
            <text x="185" y="96" fill="#06b6d4" fontSize="11" textAnchor="end" fontWeight="bold">{sim.targetPeriod.toFixed(3)} ns</text>

            <line x1="15" y1="106" x2="185" y2="106" stroke="#334155" strokeWidth="1" />

            <text x="15" y="122" fill="#94a3b8" fontSize="10">Failing Paths:</text>
            <text x="185" y="122" fill={sim.failingPaths > 0 ? '#ef4444' : '#22c55e'} fontSize="12" textAnchor="end" fontWeight="bold" filter="url(#pvarTextGlow)">{sim.failingPaths} / {numPaths}</text>

            <text x="15" y="136" fill="#94a3b8" fontSize="10">CV (s/m):</text>
            <text x="185" y="136" fill="#a78bfa" fontSize="11" textAnchor="end" fontWeight="bold">{((sim.stdDev / sim.mean) * 100).toFixed(2)}%</text>
          </g>

          {/* === YIELD GAUGE PANEL === */}
          <g transform="translate(490, 10)">
            <rect x="0" y="0" width="200" height="140" rx="8" fill="url(#pvarPanelBg)" filter="url(#pvarPanelShadow)" stroke={sim.yieldPercent >= 95 ? '#22c55e' : sim.yieldPercent >= 80 ? '#f59e0b' : '#ef4444'} strokeWidth="1.5" />
            <text x="100" y="22" textAnchor="middle" fill={sim.yieldPercent >= 95 ? '#4ade80' : sim.yieldPercent >= 80 ? '#fbbf24' : '#f87171'} fontSize="12" fontWeight="bold" filter="url(#pvarTextGlow)">YIELD STATUS</text>

            {/* Large yield percentage */}
            <text x="100" y="65" textAnchor="middle" fill={sim.yieldPercent >= 95 ? '#4ade80' : sim.yieldPercent >= 80 ? '#fbbf24' : '#f87171'} fontSize="32" fontWeight="bold" filter="url(#pvarTextGlow)">
              {sim.yieldPercent.toFixed(1)}%
            </text>

            {/* Yield bar */}
            <rect x="15" y="80" width="170" height="16" fill="#0f172a" rx="4" stroke="#334155" strokeWidth="1" />
            <rect
              x="15"
              y="80"
              width={170 * Math.min(sim.yieldPercent / 100, 1)}
              height="16"
              fill={sim.yieldPercent >= 95 ? 'url(#pvarYieldGaugePass)' : sim.yieldPercent >= 80 ? 'url(#pvarYieldGaugeWarn)' : 'url(#pvarYieldGaugeFail)'}
              rx="4"
            />

            {/* Target line on yield bar */}
            <line x1={15 + 170 * 0.95} y1="78" x2={15 + 170 * 0.95} y2="98" stroke="#e2e8f0" strokeWidth="2" />
            <text x={15 + 170 * 0.95} y="110" textAnchor="middle" fill="#94a3b8" fontSize="8">95% Target</text>

            {showAdaptive && adaptiveVoltage && (
              <>
                <text x="100" y="125" textAnchor="middle" fill="#3b82f6" fontSize="9" fontWeight="bold">+{voltageBoost}% V</text>
                <text x="100" y="136" textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="bold">-{frequencyReduction}% f</text>
              </>
            )}

            {!showAdaptive || !adaptiveVoltage ? (
              <text x="100" y="130" textAnchor="middle" fill="#64748b" fontSize="9">{sim.yieldPercent >= 95 ? 'Production Ready' : sim.yieldPercent >= 80 ? 'Needs Optimization' : 'Critical - Action Required'}</text>
            ) : null}
          </g>

          {/* === VARIATION PARAMETERS PANEL === */}
          <g transform="translate(280, 160)">
            <rect x="0" y="0" width="410" height="80" rx="8" fill="url(#pvarPanelBg)" filter="url(#pvarPanelShadow)" stroke="#334155" strokeWidth="1" />
            <text x="205" y="18" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">VARIATION PARAMETERS</text>

            {/* Vth Variation */}
            <text x="15" y="40" fill="#94a3b8" fontSize="9">Vth Variation (s):</text>
            <rect x="110" y="30" width="80" height="14" fill="#0f172a" rx="3" />
            <rect x="110" y="30" width={80 * vthVariation / 50} height="14" fill="#8b5cf6" rx="3" opacity="0.8" />
            <text x="195" y="41" fill="#e2e8f0" fontSize="10" fontWeight="bold">{vthVariation} mV</text>

            {/* Line Width Variation */}
            <text x="15" y="60" fill="#94a3b8" fontSize="9">Line Width (s):</text>
            <rect x="110" y="50" width="80" height="14" fill="#0f172a" rx="3" />
            <rect x="110" y="50" width={80 * lineWidthVariation / 20} height="14" fill="#06b6d4" rx="3" opacity="0.8" />
            <text x="195" y="61" fill="#e2e8f0" fontSize="10" fontWeight="bold">{lineWidthVariation}%</text>

            {/* Target Clock */}
            <text x="220" y="40" fill="#94a3b8" fontSize="9">Target Clock:</text>
            <rect x="305" y="30" width="80" height="14" fill="#0f172a" rx="3" />
            <rect x="305" y="30" width={80 * (targetClock - 500) / 1500} height="14" fill="#22c55e" rx="3" opacity="0.8" />
            <text x="390" y="41" fill="#e2e8f0" fontSize="10" fontWeight="bold">{targetClock} MHz</text>

            {/* Path Count */}
            <text x="220" y="60" fill="#94a3b8" fontSize="9">Paths Simulated:</text>
            <text x="390" y="61" fill="#e2e8f0" fontSize="10" fontWeight="bold">{numPaths.toLocaleString()}</text>
          </g>

          {/* === DELAY DISTRIBUTION HISTOGRAM === */}
          <g transform="translate(280, 250)">
            <rect x="0" y="0" width="410" height="260" rx="8" fill="url(#pvarPanelBg)" filter="url(#pvarPanelShadow)" stroke="#334155" strokeWidth="1" />
            <text x="205" y="20" textAnchor="middle" fill="#f59e0b" fontSize="12" fontWeight="bold">PATH DELAY DISTRIBUTION</text>
            <text x="205" y="35" textAnchor="middle" fill="#64748b" fontSize="9">{numPaths} paths | Target: {targetClock} MHz ({sim.targetPeriod.toFixed(2)} ns)</text>

            {/* Histogram background */}
            <rect x="50" y="50" width="300" height={histogramHeight} fill="#0a0f1a" rx="4" stroke="#1e293b" strokeWidth="1" />

            {/* Y-axis grid lines */}
            {[0.25, 0.5, 0.75, 1].map((frac, i) => (
              <g key={i}>
                <line x1="50" y1={50 + histogramHeight * (1 - frac)} x2="350" y2={50 + histogramHeight * (1 - frac)} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                <text x="45" y={50 + histogramHeight * (1 - frac) + 3} textAnchor="end" fill="#64748b" fontSize="7">{Math.round(frac * maxCount)}</text>
              </g>
            ))}

            {/* Target clock line */}
            {sim.targetPeriod >= sim.minDelay && sim.targetPeriod <= sim.maxDelay && (
              <>
                <line
                  x1={55 + ((sim.targetPeriod - sim.minDelay) / (sim.maxDelay - sim.minDelay)) * 290}
                  y1={50}
                  x2={55 + ((sim.targetPeriod - sim.minDelay) / (sim.maxDelay - sim.minDelay)) * 290}
                  y2={50 + histogramHeight}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="4,4"
                />
                <text
                  x={55 + ((sim.targetPeriod - sim.minDelay) / (sim.maxDelay - sim.minDelay)) * 290}
                  y={45}
                  fill="#ef4444"
                  fontSize={9}
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  FAIL
                </text>
              </>
            )}

            {/* Histogram bars */}
            <g filter="url(#pvarBarGlow)">
              {sim.histogram.map((bin, i) => {
                const barHeight = (bin.count / maxCount) * (histogramHeight - 10);
                const x = 55 + i * (290 / sim.histogram.length);
                const y = 50 + histogramHeight - barHeight - 5;
                return (
                  <rect
                    key={i}
                    x={x}
                    y={y}
                    width={(290 / sim.histogram.length) - 2}
                    height={barHeight}
                    fill={getBinColor(bin.binStart)}
                    rx={1}
                  />
                );
              })}
            </g>

            {/* X-axis labels */}
            <text x="50" y={50 + histogramHeight + 15} fill="#94a3b8" fontSize="9">{sim.minDelay.toFixed(2)} ns</text>
            <text x="350" y={50 + histogramHeight + 15} fill="#94a3b8" fontSize="9" textAnchor="end">{sim.maxDelay.toFixed(2)} ns</text>
            <text x="200" y={50 + histogramHeight + 30} fill="#94a3b8" fontSize="10" textAnchor="middle">Path Delay (ns)</text>

            {/* Y-axis label */}
            <text x="20" y={50 + histogramHeight / 2} fill="#94a3b8" fontSize="10" textAnchor="middle" transform={`rotate(-90, 20, ${50 + histogramHeight / 2})`}>Count</text>

            {/* Distribution info */}
            <g transform="translate(360, 50)">
              <rect x="0" y="0" width="45" height="80" rx="4" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
              <text x="22" y="14" textAnchor="middle" fill="#94a3b8" fontSize="7" fontWeight="bold">BINS</text>
              <rect x="5" y="20" width="12" height="8" fill="url(#pvarHistPass)" rx="1" />
              <text x="40" y="27" textAnchor="end" fill="#94a3b8" fontSize="7">Pass</text>
              <rect x="5" y="34" width="12" height="8" fill="url(#pvarHistWarn)" rx="1" />
              <text x="40" y="41" textAnchor="end" fill="#94a3b8" fontSize="7">Warn</text>
              <rect x="5" y="48" width="12" height="8" fill="url(#pvarHistFail)" rx="1" />
              <text x="40" y="55" textAnchor="end" fill="#94a3b8" fontSize="7">Fail</text>
              <line x1="5" y1="64" x2="40" y2="64" stroke="#334155" strokeWidth="0.5" />
              <text x="22" y="74" textAnchor="middle" fill="#ef4444" fontSize="7" fontWeight="bold">{sim.failingPaths}</text>
            </g>
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isSimulating ? `linear-gradient(135deg, ${colors.error} 0%, #dc2626 100%)` : `linear-gradient(135deg, ${colors.success} 0%, #059669 100%)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: isSimulating ? '0 4px 15px rgba(239, 68, 68, 0.3)' : '0 4px 15px rgba(16, 185, 129, 0.3)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isSimulating ? 'Stop Simulation' : 'Run Monte Carlo'}
            </button>
            <button
              onClick={() => setSimulationSeed(Math.random() * 10000)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: `linear-gradient(135deg, ${colors.histogram} 0%, #7c3aed 100%)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              New Sample
            </button>
            <button
              onClick={() => { setVthVariation(10); setLineWidthVariation(5); setTargetClock(1000); setAdaptiveVoltage(false); setVoltageBoost(0); setFrequencyReduction(0); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `2px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Reset Parameters
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = (showAdaptiveControls: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Vth Variation (sigma): {vthVariation} mV
        </label>
        <input
          type="range"
          min="1"
          max="50"
          step="1"
          value={vthVariation}
          onChange={(e) => setVthVariation(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Line Width Variation (sigma): {lineWidthVariation}%
        </label>
        <input
          type="range"
          min="1"
          max="20"
          step="0.5"
          value={lineWidthVariation}
          onChange={(e) => setLineWidthVariation(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Target Clock: {targetClock} MHz
        </label>
        <input
          type="range"
          min="500"
          max="2000"
          step="50"
          value={targetClock}
          onChange={(e) => setTargetClock(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {showAdaptiveControls && (
        <>
          <div>
            <label style={{
              color: colors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={adaptiveVoltage}
                onChange={(e) => setAdaptiveVoltage(e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              Enable Adaptive Voltage/Frequency
            </label>
          </div>

          {adaptiveVoltage && (
            <>
              <div>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Voltage Boost: +{voltageBoost}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={voltageBoost}
                  onChange={(e) => setVoltageBoost(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                  Frequency Reduction: -{frequencyReduction}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={frequencyReduction}
                  onChange={(e) => setFrequencyReduction(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </>
          )}
        </>
      )}

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Variation causes {(runMonteCarloSimulation().stdDev / runMonteCarloSimulation().mean * 100).toFixed(1)}% coefficient of variation
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Delay = Base * (1 + Vth_shift/200) * (1 - Width_shift/50)
        </div>
      </div>
    </div>
  );

  const renderBottomBar = (canGoBack: boolean, canProceed: boolean, nextLabel: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
      display: 'flex',
      justifyContent: 'space-between',
      zIndex: 1000,
    }}>
      <button
        onClick={goBack}
        disabled={!canGoBack}
        style={{
          padding: '12px 24px',
          borderRadius: '8px',
          border: `1px solid ${colors.textMuted}`,
          background: 'transparent',
          color: canGoBack ? colors.textPrimary : colors.textMuted,
          fontWeight: 'bold',
          cursor: canGoBack ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          opacity: canGoBack ? 1 : 0.5,
        }}
      >
        Back
      </button>
      <button
        onClick={goNext}
        disabled={!canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {nextLabel}
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
              Process Variation
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              If transistors are "the same design," why do chips vary?
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Every transistor on a chip is designed identically, yet no two are truly the same.
                Random variations in threshold voltage and line width create a distribution of
                speeds. How do designers ensure the chip works despite these variations?
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Run the Monte Carlo simulation to see how variation affects path delays!
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A histogram showing the delay distribution of thousands of paths in a chip.
              Each path's delay depends on the random variations of its transistors.
              Paths slower than the target clock period fail timing checks.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What pattern do you expect in timing failures?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Process Variation</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust variation parameters and observe how the delay distribution changes
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Increase Vth variation to 30mV - watch yield drop</li>
              <li>Increase target clock to 1.5GHz - how does yield change?</li>
              <li>Try low variation (5mV, 2%) - is 99% yield possible?</li>
              <li>Notice: a few slow paths dominate the failures!</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'few_slow';

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
              A few statistically slow paths dominate timing failures. Even with millions of paths,
              only the 3-sigma outliers matter for yield. Design must close timing at these corners.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Variation</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Random Dopant Fluctuation:</strong> At nanometer
                scales, individual dopant atoms matter. The discrete nature of atoms causes Vth variation.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Line Edge Roughness:</strong> Photolithography
                creates imperfect edges with ~2nm roughness. This varies effective channel length.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Statistical Tail:</strong> With Gaussian variation,
                3-sigma events (0.3% probability) determine yield for a billion-transistor chip.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Design Margin:</strong> Circuits are designed
                with "guard bands" to tolerate worst-case variation, at the cost of average performance.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'Next: A Twist!')}
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
              What if we could dynamically adjust voltage and frequency?
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Modern processors can boost voltage to speed up slow transistors (but increase power),
              or reduce frequency to give more timing margin (but reduce performance).
              Adaptive techniques can rescue chips that would otherwise fail.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What's the best strategy for rescuing marginal chips?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Explore Adaptive Techniques</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Enable adaptive voltage/frequency and find the optimal balance
            </p>
          </div>

          {renderVisualization(true, true)}
          {renderControls(true)}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Voltage boost helps but costs power (P ~ V^2). Frequency reduction always works but
              hurts performance. The optimal strategy combines both: boost voltage to save some
              chips, reduce frequency to save others, achieving higher overall yield.
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'combined';

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
              Combining adaptive voltage and frequency gives the best yield/performance trade-off.
              Chips are binned into different performance tiers based on their silicon quality.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Adaptive Techniques in Practice</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>DVFS (Dynamic Voltage/Frequency Scaling):</strong> Modern
                CPUs adjust voltage and frequency hundreds of times per second based on workload.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Speed Binning:</strong> Chips are tested and sorted
                into performance tiers. Premium chips run faster, budget chips run slower - same design!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>AVS (Adaptive Voltage Scaling):</strong> On-chip
                monitors measure actual speed and adjust voltage to the minimum needed, saving power.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'Apply This Knowledge')}
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
              Process variation affects every aspect of chip design
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
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.accent}`,
                    background: 'transparent',
                    color: colors.accent,
                    cursor: 'pointer',
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
        {renderBottomBar(true, transferCompleted.size >= 4, 'Take the Test')}
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
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 8 ? 'You\'ve mastered process variation!' : 'Review the material and try again.'}
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
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(true, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
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
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`,
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
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
                onClick={submitTest}
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
                Submit Test
              </button>
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered process variation physics</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Random variation creates Gaussian distributions of device parameters</li>
              <li>3-sigma statistical tails dominate yield for large designs</li>
              <li>Timing margins (guard bands) ensure functionality at corners</li>
              <li>Adaptive voltage/frequency can rescue marginal chips</li>
              <li>Speed binning turns variation into a business opportunity</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              At sub-10nm nodes, variation is the dominant challenge. Statistical timing analysis
              replaces corner-based methods. Machine learning predicts yield from design features.
              The physics of atomic-scale randomness is now central to chip economics!
            </p>
          </div>
          {renderVisualization(true, true)}
        </div>
        {renderBottomBar(true, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default ProcessVariationRenderer;
