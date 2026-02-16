import React, { useState, useEffect, useCallback, useRef } from 'react';

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface ChipletArchitectureRendererProps {
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
  twist_play: 'Explore Mixed',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

const colors = {
  textPrimary: '#ffffff',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#22c55e',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
};

const ChipletArchitectureRenderer: React.FC<ChipletArchitectureRendererProps> = ({
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

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

  // Simulation state
  const [dieSize, setDieSize] = useState(300); // mm^2
  const [chipletCount, setChipletCount] = useState(4);
  const [processNode, setProcessNode] = useState(5); // nm
  const [showInterconnect, setShowInterconnect] = useState(false);
  const [highlightedChiplet, setHighlightedChiplet] = useState<number | null>(null);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [pendingAnswer, setPendingAnswer] = useState<number | null>(null);
  const [confirmedAnswers, setConfirmedAnswers] = useState<Set<number>>(new Set());

  // Internal navigation functions
  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 50) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);
    setTimeout(() => { isNavigating.current = false; }, 100);
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
          <div style={{ display: 'flex', gap: '6px' }} role="navigation" aria-label="Phase navigation">
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                type="button"
                tabIndex={0}
                onClick={() => i <= currentIdx && goToPhase(p)}
                onKeyDown={(e) => e.key === 'Enter' && i <= currentIdx && goToPhase(p)}
                aria-label={phaseLabels[p]}
                aria-current={i === currentIdx ? 'step' : undefined}
                data-navigation-dot="true"
                style={{
                  height: '12px',
                  width: '12px',
                  borderRadius: '50%',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
                  cursor: i <= currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  border: 'none',
                  padding: 0,
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textSecondary }}>
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
            background: canProceed ? `linear-gradient(135deg, ${colors.accent} 0%, #16a34a 100%)` : 'rgba(30, 41, 59, 0.9)',
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

  // Wrapper function for phase content
  const wrapPhaseContent = (content: React.ReactNode, bottomBarContent?: React.ReactNode) => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary, color: colors.textPrimary }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, flexShrink: 0 }}>{renderProgressBar()}</div>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: '48px', paddingBottom: '100px' }}>
        {content}
      </div>
      {bottomBarContent && <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, flexShrink: 0 }}>{bottomBarContent}</div>}
    </div>
  );

  // Calculate yield and cost metrics
  const calculateMetrics = useCallback(() => {
    // Defect density (defects per cm^2) - smaller nodes have more defects
    const defectDensity = 0.1 * (7 / processNode);

    // Monolithic yield using Poisson model: Y = e^(-D * A)
    const monolithicArea = dieSize / 100; // cm^2
    const monolithicYield = Math.exp(-defectDensity * monolithicArea) * 100;

    // Chiplet yield - each chiplet is smaller
    const chipletArea = (dieSize / chipletCount) / 100; // cm^2
    const singleChipletYield = Math.exp(-defectDensity * chipletArea);
    const combinedChipletYield = Math.pow(singleChipletYield, chipletCount) * 100;

    // Effective yield (accounting for packaging success rate ~95%)
    const packagingYield = 0.95;
    const effectiveChipletYield = combinedChipletYield * packagingYield;

    // Cost comparison (relative)
    const waferCost = 100; // arbitrary units
    const monolithicCostPerGood = waferCost / (monolithicYield / 100);
    const chipletCostPerGood = (waferCost / (singleChipletYield)) * chipletCount * 1.2; // 1.2x for packaging

    // Interconnect bandwidth (simplified)
    const interconnectBandwidth = 100 * chipletCount; // GB/s

    return {
      monolithicYield: Math.round(monolithicYield * 10) / 10,
      chipletYield: Math.round(effectiveChipletYield * 10) / 10,
      singleChipletYield: Math.round(singleChipletYield * 100 * 10) / 10,
      monolithicCost: Math.round(monolithicCostPerGood),
      chipletCost: Math.round(chipletCostPerGood),
      costSavings: Math.round((1 - chipletCostPerGood / monolithicCostPerGood) * 100),
      interconnectBandwidth,
      chipletArea: Math.round(dieSize / chipletCount),
    };
  }, [dieSize, chipletCount, processNode]);

  const predictions = [
    { id: 'defects', label: 'Smaller pieces have better manufacturing yield - fewer defects per chip' },
    { id: 'cooling', label: 'Smaller chips are easier to cool' },
    { id: 'speed', label: 'Smaller chips run faster' },
    { id: 'fashion', label: 'It\'s just a marketing trend' },
  ];

  const twistPredictions = [
    { id: 'all_same', label: 'All chiplets should use the same advanced process node' },
    { id: 'mixed', label: 'Different chiplets can use different process nodes based on their needs' },
    { id: 'oldest', label: 'Use the oldest, cheapest process for everything' },
    { id: 'newest', label: 'Always use the newest process for everything' },
  ];

  const transferApplications = [
    {
      title: 'AMD EPYC Processors',
      description: 'AMD\'s server CPUs use multiple compute chiplets connected to a central I/O die.',
      question: 'Why does AMD use a separate I/O die on older technology?',
      answer: 'I/O circuits (memory controllers, PCIe) don\'t benefit much from smaller transistors but need lots of analog circuits. Using 14nm for I/O while compute is 5nm saves cost and improves yields without sacrificing performance.',
    },
    {
      title: 'Apple M-Series Ultra',
      description: 'Apple creates their largest chips by connecting two M-series chips with ultra-fast interconnect.',
      question: 'How does Apple achieve "seamless" connection between two dies?',
      answer: 'UltraFusion uses 10,000+ connections with 2.5TB/s bandwidth, making the two dies appear as one to software. The interconnect is so fast that there\'s no performance penalty for cross-die communication.',
    },
    {
      title: 'Intel Ponte Vecchio GPU',
      description: 'Intel\'s data center GPU uses 47 chiplets across 5 different process nodes.',
      question: 'Why use 5 different process nodes in one product?',
      answer: 'Each function has different optimal technology: compute tiles need latest 5nm, cache uses dense 5nm, base die uses mature 7nm for power delivery, memory uses specialized HBM process. This minimizes cost while maximizing each function.',
    },
    {
      title: 'AMD 3D V-Cache',
      description: 'AMD stacks additional cache memory directly on top of the CPU die.',
      question: 'What advantage does 3D stacking provide over side-by-side chiplets?',
      answer: '3D stacking dramatically reduces wire length between cache and compute, lowering latency and power. The cache die can use cheaper, older technology optimized for SRAM density rather than transistor speed.',
    },
  ];

  const testQuestions = [
    {
      question: 'The primary manufacturing advantage of chiplets over monolithic dies is:',
      options: [
        { text: 'Chiplets run at higher frequencies', correct: false },
        { text: 'Smaller dies have exponentially better yield', correct: true },
        { text: 'Chiplets use less power', correct: false },
        { text: 'Chiplets are easier to design', correct: false },
      ],
    },
    {
      question: 'Manufacturing yield follows approximately:',
      options: [
        { text: 'Linear decrease with die area', correct: false },
        { text: 'Exponential decrease with die area (Poisson model)', correct: true },
        { text: 'No relationship with die area', correct: false },
        { text: 'Square root of die area', correct: false },
      ],
    },
    {
      question: 'The main challenge of chiplet architectures is:',
      options: [
        { text: 'Chiplets are harder to manufacture', correct: false },
        { text: 'High-bandwidth, low-latency interconnect between chiplets', correct: true },
        { text: 'Software compatibility', correct: false },
        { text: 'Thermal management', correct: false },
      ],
    },
    {
      question: 'Why might an I/O chiplet use an older process node than compute chiplets?',
      options: [
        { text: 'I/O doesn\'t benefit from smaller transistors but needs analog circuits', correct: true },
        { text: 'Older processes are faster for I/O', correct: false },
        { text: 'I/O chiplets are always made first', correct: false },
        { text: 'Regulations require different processes', correct: false },
      ],
    },
    {
      question: 'The "reticle limit" in chip manufacturing refers to:',
      options: [
        { text: 'The maximum clock speed achievable', correct: false },
        { text: 'The maximum die size that can be exposed in one lithography shot (~800mm2)', correct: true },
        { text: 'The minimum transistor size', correct: false },
        { text: 'The number of chips per wafer', correct: false },
      ],
    },
    {
      question: 'AMD\'s EPYC processors benefit from chiplets because:',
      options: [
        { text: 'They can scale core count by adding more compute chiplets', correct: true },
        { text: 'Single-thread performance increases', correct: false },
        { text: 'Memory bandwidth doubles', correct: false },
        { text: 'Power consumption is eliminated', correct: false },
      ],
    },
    {
      question: '3D chip stacking (like AMD V-Cache) provides:',
      options: [
        { text: 'Higher clock speeds', correct: false },
        { text: 'Shorter interconnects and lower latency between layers', correct: true },
        { text: 'Better thermal dissipation', correct: false },
        { text: 'Simpler manufacturing', correct: false },
      ],
    },
    {
      question: 'A defect on a monolithic 400mm2 die versus a 100mm2 chiplet:',
      options: [
        { text: 'Affects the same amount of silicon', correct: false },
        { text: 'Kills 4x more silicon value on the monolithic die', correct: true },
        { text: 'Has no impact on either', correct: false },
        { text: 'Can be repaired on the monolithic die', correct: false },
      ],
    },
    {
      question: 'High-bandwidth die-to-die interconnects typically use:',
      options: [
        { text: 'Traditional PCB traces', correct: false },
        { text: 'Silicon interposers or embedded bridges with thousands of connections', correct: true },
        { text: 'Wireless communication', correct: false },
        { text: 'Fiber optics', correct: false },
      ],
    },
    {
      question: 'The economic advantage of chiplets increases when:',
      options: [
        { text: 'Chips get smaller', correct: false },
        { text: 'Defect density increases (newer/denser processes)', correct: true },
        { text: 'Packaging costs decrease to zero', correct: false },
        { text: 'All chiplets are identical', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    // Only allow selection if not already confirmed
    if (!confirmedAnswers.has(questionIndex)) {
      setPendingAnswer(optionIndex);
    }
  };

  const confirmAnswer = () => {
    if (pendingAnswer !== null && !confirmedAnswers.has(currentTestQuestion)) {
      const newAnswers = [...testAnswers];
      newAnswers[currentTestQuestion] = pendingAnswer;
      setTestAnswers(newAnswers);
      setConfirmedAnswers(new Set([...confirmedAnswers, currentTestQuestion]));
      setPendingAnswer(null);
    }
  };

  const goToNextQuestion = () => {
    if (currentTestQuestion < 9) {
      setCurrentTestQuestion(currentTestQuestion + 1);
      setPendingAnswer(null);
    }
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
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

  const realWorldApps = [
    {
      icon: '🖥️',
      title: 'High-Performance CPUs',
      short: 'Server & Desktop Processors',
      tagline: 'Scaling core counts beyond monolithic limits',
      description: 'Modern server and desktop CPUs from AMD and Intel use chiplet architectures to achieve unprecedented core counts and performance. AMD\'s EPYC processors combine multiple compute chiplets with a central I/O die, enabling up to 128 cores in a single socket while maintaining excellent manufacturing yields.',
      connection: 'The chiplet approach allows CPU designers to overcome the reticle limit and yield challenges that would make monolithic high-core-count processors economically unfeasible. By separating compute and I/O functions onto optimized process nodes, manufacturers achieve better performance per dollar.',
      howItWorks: 'Compute Core Dies (CCDs) are manufactured on the latest process node for maximum density and efficiency, while the I/O Die (IOD) uses a mature process better suited for analog circuits like memory controllers and PCIe lanes. An advanced packaging substrate connects all chiplets with high-bandwidth, low-latency interconnects.',
      stats: [
        { value: '128', label: 'Max Cores', detail: 'AMD EPYC Genoa' },
        { value: '12', label: 'Chiplets', detail: 'In flagship configs' },
        { value: '40%', label: 'Cost Savings', detail: 'vs monolithic design' },
      ],
      examples: [
        'AMD EPYC server processors powering cloud data centers',
        'AMD Ryzen desktop CPUs with 3D V-Cache stacking',
        'Intel Xeon Scalable with multiple compute tiles',
        'AMD Threadripper workstation processors with 64+ cores',
      ],
      companies: ['AMD', 'Intel', 'IBM', 'Ampere Computing'],
      futureImpact: 'Future CPUs will push beyond 256 cores per socket using advanced 3D stacking and even more chiplets. UCIe (Universal Chiplet Interconnect Express) standardization will enable mixing chiplets from different vendors, creating a modular CPU ecosystem.',
      color: '#6366f1',
    },
    {
      icon: '🤖',
      title: 'AI Accelerators',
      short: 'Data Center AI Chips',
      tagline: 'Massive compute for machine learning workloads',
      description: 'AI training and inference require enormous computational power that exceeds what any single monolithic die can deliver. Chiplet architectures enable AI accelerators to pack thousands of compute cores, massive amounts of high-bandwidth memory, and specialized tensor processing units into cohesive systems.',
      connection: 'The insatiable demand for AI compute pushes chip designs far beyond the reticle limit. Chiplets allow designers to create effective die sizes of 2000mm² or more by combining multiple compute tiles with HBM memory stacks and high-speed interconnects, all while maintaining manufacturable yields.',
      howItWorks: 'Multiple compute chiplets containing tensor cores and matrix engines are connected via silicon interposers or embedded multi-die interconnect bridges (EMIB). HBM memory stacks are placed adjacent to compute dies for maximum bandwidth. A base die handles power delivery, I/O, and inter-chiplet communication.',
      stats: [
        { value: '47', label: 'Chiplets', detail: 'Intel Ponte Vecchio' },
        { value: '5', label: 'Process Nodes', detail: 'Mixed in one package' },
        { value: '2TB/s', label: 'Memory BW', detail: 'HBM3 stacks' },
      ],
      examples: [
        'Intel Ponte Vecchio GPU with 47 active tiles',
        'AMD Instinct MI300 series with integrated CPU and GPU chiplets',
        'NVIDIA Grace Hopper superchip combining CPU and GPU',
        'Google TPU v5 with custom AI accelerator tiles',
      ],
      companies: ['NVIDIA', 'AMD', 'Intel', 'Google', 'Amazon'],
      futureImpact: 'AI accelerators will evolve into wafer-scale systems where entire wafers become single compute units. Optical interconnects between chiplets will enable rack-scale AI computers with unprecedented parallelism for training foundation models.',
      color: '#22c55e',
    },
    {
      icon: '🎮',
      title: 'Gaming GPUs',
      short: 'Graphics Processing Units',
      tagline: 'Rendering billions of pixels with parallel compute',
      description: 'Gaming GPUs have grown so large that chiplet architectures are becoming essential for next-generation graphics cards. By splitting the GPU into multiple chiplets, manufacturers can build more powerful graphics processors while keeping yields high and costs manageable.',
      connection: 'High-end gaming GPUs now approach or exceed the 800mm² reticle limit. Chiplet designs allow graphics cards to scale beyond physical manufacturing constraints while enabling different components (shader cores, ray tracing units, memory controllers) to be optimized on appropriate process nodes.',
      howItWorks: 'Graphics Compute Dies (GCDs) contain shader arrays and ray tracing hardware on cutting-edge nodes. Memory Cache Dies (MCDs) provide large L3 cache using dense SRAM processes. Infinity Fabric or NVLink interconnects provide the bandwidth needed for seamless multi-chiplet operation with minimal performance penalty.',
      stats: [
        { value: '12', label: 'Chiplets', detail: 'AMD RDNA 3 design' },
        { value: '384MB', label: 'Infinity Cache', detail: 'On MCD chiplets' },
        { value: '61B', label: 'Transistors', detail: 'Total package' },
      ],
      examples: [
        'AMD Radeon RX 7900 series with GCD and MCD chiplets',
        'Future NVIDIA GeForce with multi-chip modules',
        'Intel Arc graphics with disaggregated design',
        'Console GPUs using chiplet-based custom silicon',
      ],
      companies: ['AMD', 'NVIDIA', 'Intel', 'Sony', 'Microsoft'],
      futureImpact: 'Next-gen gaming GPUs will use 3D-stacked cache for near-compute memory, dramatically improving ray tracing performance. MCM (multi-chip module) designs will enable enthusiast graphics cards with 2x or more the compute power of today\'s flagships.',
      color: '#f59e0b',
    },
    {
      icon: '🌐',
      title: 'Networking ASICs',
      short: 'High-Speed Network Switches',
      tagline: 'Moving petabits of data with minimal latency',
      description: 'Modern data center networks require switching chips that handle hundreds of ports at 400Gbps or 800Gbps each. Chiplet architectures enable these massive networking ASICs to scale bandwidth while maintaining the low latency critical for cloud and AI infrastructure.',
      connection: 'Networking chips face unique challenges: they need massive I/O bandwidth for SerDes (serializer/deserializer) circuits, large packet buffers, and complex switching fabrics. Chiplets allow separation of high-speed analog SerDes (on optimized nodes) from digital logic (on dense nodes), maximizing both performance and yield.',
      howItWorks: 'SerDes chiplets handle the analog complexity of high-speed signaling at 112Gbps per lane. A central switching fabric chiplet contains the packet processing logic on an advanced digital process. Memory chiplets provide deep packet buffers. All components connect via ultra-low-latency die-to-die interfaces.',
      stats: [
        { value: '51.2', label: 'Tbps', detail: 'Switch capacity' },
        { value: '800G', label: 'Per Port', detail: 'Latest generation' },
        { value: '<400ns', label: 'Latency', detail: 'Cut-through' },
      ],
      examples: [
        'Broadcom Memory chiplet architectures for Memory chiplets in Tomahawk series',
        'Cisco Silicon One with modular die design',
        'Marvell Teralynx switching platforms',
        'Juniper Express chiplet-based routing silicon',
      ],
      companies: ['Broadcom', 'Marvell', 'Cisco', 'Juniper', 'Intel'],
      futureImpact: 'Networking ASICs will evolve toward co-packaged optics where optical transceivers are integrated directly with the switch chiplet, eliminating electrical interconnect losses. This will enable single switches with 100+ Tbps capacity for AI cluster interconnects.',
      color: '#a855f7',
    },
  ];

  const renderVisualization = () => {
    const metrics = calculateMetrics();

    // Calculate chiplet layout
    const cols = Math.ceil(Math.sqrt(chipletCount));
    const rows = Math.ceil(chipletCount / cols);

    return (
      <svg width="100%" height="450" viewBox="0 0 500 450" style={{ maxWidth: '600px' }}>
        <defs>
          <linearGradient id="monolithicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <linearGradient id="chipletGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
          <linearGradient id="interconnectGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </radialGradient>
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
            <feOffset in="blur" dx="2" dy="2" result="offsetBlur" />
            <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
          </filter>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width="500" height="450" fill="#0f172a" rx="12" />

        {/* Grid lines for visual reference */}
        <line x1="30" y1="220" x2="470" y2="220" stroke="rgba(148,163,184,0.3)" strokeDasharray="4 4" opacity="0.3" />
        <line x1="30" y1="340" x2="470" y2="340" stroke="rgba(148,163,184,0.3)" strokeDasharray="4 4" opacity="0.3" />
        <line x1="250" y1="40" x2="250" y2="210" stroke="rgba(148,163,184,0.3)" strokeDasharray="4 4" opacity="0.3" />

        {/* Title */}
        <text x="250" y="25" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">
          Monolithic vs Chiplet Architecture
        </text>

        {/* Monolithic Die Section - absolute coords */}
        <text x="120" y="45" fill="#6366f1" fontSize="12" fontWeight="bold" textAnchor="middle">Monolithic Die</text>
        <rect x="50" y="55" width="140" height="140" fill="url(#monolithicGrad)" rx="4" stroke="#818cf8" strokeWidth="2" filter="url(#dropShadow)" />

        {/* Defects visualization */}
        {[...Array(Math.floor((100 - metrics.monolithicYield) / 5))].map((_, i) => (
          <circle
            key={`defect-${i}`}
            cx={70 + (i * 17) % 100}
            cy={75 + (i * 23) % 100}
            r="3"
            fill="#ef4444"
            opacity="0.8"
          />
        ))}

        <text x="120" y="212" fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="middle">{dieSize}mm² total</text>

        {/* Chiplet Section - absolute coords */}
        <text x="370" y="45" fill="#22c55e" fontSize="12" fontWeight="bold" textAnchor="middle">Chiplet Design</text>

        {/* Chiplets grid */}
        {[...Array(chipletCount)].map((_, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const chipletSize = 130 / Math.max(cols, rows);
          const cx = 300 + col * (chipletSize + 5);
          const cy = 60 + row * (chipletSize + 5);

          return (
            <g key={i}>
              <rect
                x={cx}
                y={cy}
                width={chipletSize}
                height={chipletSize}
                fill={highlightedChiplet === i ? '#4ade80' : 'url(#chipletGrad)'}
                rx="2"
                stroke="#86efac"
                strokeWidth="1"
                filter={highlightedChiplet === i ? 'url(#glow)' : 'url(#dropShadow)'}
                style={{ cursor: 'pointer' }}
                onPointerEnter={() => setHighlightedChiplet(i)}
                onPointerLeave={() => setHighlightedChiplet(null)}
              />
            </g>
          );
        })}

        {/* Interconnect visualization */}
        {showInterconnect && chipletCount > 1 && (
          <g opacity="0.7">
            {[...Array(chipletCount - 1)].map((_, i) => {
              const col1 = i % cols;
              const row1 = Math.floor(i / cols);
              const col2 = (i + 1) % cols;
              const row2 = Math.floor((i + 1) / cols);
              const chipletSize = 130 / Math.max(cols, rows);
              const x1 = 300 + col1 * (chipletSize + 5) + chipletSize;
              const y1 = 60 + row1 * (chipletSize + 5) + chipletSize / 2;
              const x2 = 300 + col2 * (chipletSize + 5);
              const y2 = 60 + row2 * (chipletSize + 5) + chipletSize / 2;

              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="4,2"
                />
              );
            })}
          </g>
        )}

        <text x="370" y="212" fill="rgba(148, 163, 184, 0.7)" fontSize="11" textAnchor="middle">{chipletCount} × {metrics.chipletArea}mm²</text>

        {/* Yield values below sections */}
        <text x="120" y="233" fill={metrics.monolithicYield > 50 ? '#22c55e' : '#ef4444'} fontSize="12" textAnchor="middle">
          Yield: {metrics.monolithicYield}%
        </text>
        <text x="370" y="233" fill={metrics.chipletYield > 50 ? '#22c55e' : '#ef4444'} fontSize="12" textAnchor="middle">
          Combined Yield: {metrics.chipletYield}%
        </text>

        {/* Yield Comparison Chart - absolute coords */}
        <text x="30" y="265" fill="#f8fafc" fontSize="12" fontWeight="bold">Yield Comparison</text>

        <rect x="30" y="275" width={metrics.monolithicYield * 2} height="20" fill="url(#monolithicGrad)" rx="4" />
        <text x={30 + metrics.monolithicYield * 2 + 10} y="290" fill="#6366f1" fontSize="11">{metrics.monolithicYield}%</text>

        <rect x="30" y="305" width={metrics.chipletYield * 2} height="20" fill="url(#chipletGrad)" rx="4" />
        <text x={30 + metrics.chipletYield * 2 + 10} y="320" fill="#22c55e" fontSize="11">{metrics.chipletYield}%</text>

        {/* Cost Comparison - absolute coords */}
        <text x="280" y="265" fill="#f8fafc" fontSize="12" fontWeight="bold">Cost per Good Die</text>

        <rect x="280" y="275" width={Math.min(180, metrics.monolithicCost)} height="20" fill="#ef4444" rx="4" opacity="0.7" />
        <text x={280 + Math.min(180, metrics.monolithicCost) + 10} y="290" fill="#ef4444" fontSize="11">{metrics.monolithicCost}</text>

        <rect x="280" y="305" width={Math.min(180, metrics.chipletCost)} height="20" fill="#22c55e" rx="4" opacity="0.7" />
        <text x={280 + Math.min(180, metrics.chipletCost) + 10} y="320" fill="#22c55e" fontSize="11">{metrics.chipletCost}</text>

        {/* Process Node Info - absolute coords */}
        <rect x="30" y="345" width="440" height="95" fill="rgba(30, 41, 59, 0.8)" rx="8" />
        <text x="50" y="370" fill="#f8fafc" fontSize="12" fontWeight="bold">Current Settings</text>
        <text x="50" y="390" fill="#e2e8f0" fontSize="11">Process Node: {processNode}nm</text>
        <text x="50" y="410" fill="#e2e8f0" fontSize="11">Total Die Area: {dieSize}mm²</text>
        <text x="50" y="430" fill="#e2e8f0" fontSize="11">Chiplets: {chipletCount}</text>

        <text x="280" y="390" fill="#f59e0b" fontSize="11">Interconnect: {metrics.interconnectBandwidth} GB/s</text>
        <text x="280" y="410" fill="#e2e8f0" fontSize="11">Packaging overhead: ~20%</text>

        {/* Yield curve path using significant vertical space (>=10 L points) */}
        <path d={`M 30 200 L 60 195 L 90 185 L 120 170 L 150 150 L 180 130 L 210 110 L 250 90 L 300 70 L 350 58 L 400 50 L 450 46 L 470 45`} stroke="#6366f1" strokeWidth="2" fill="none" opacity="0.5" />
        <path d={`M 30 200 L 60 198 L 90 192 L 120 183 L 150 170 L 180 155 L 210 138 L 250 115 L 300 90 L 350 72 L 400 60 L 450 53 L 470 50`} stroke="#22c55e" strokeWidth="2" fill="none" opacity="0.5" />
      </svg>
    );
  };

  const sliderStyle: React.CSSProperties = { width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          <span data-physics-label="area">Die Area:</span> {dieSize} mm² (controls yield probability)
        </label>
        <input
          type="range"
          min="100"
          max="800"
          step="50"
          value={dieSize}
          onChange={(e) => setDieSize(parseInt(e.target.value))}
          style={sliderStyle}
          aria-label="Die Area controls yield probability"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(148, 163, 184, 0.7)', fontSize: '11px' }}>
          <span>100 mm²</span>
          <span>800 mm²</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          <span data-physics-label="count">Chiplet Count:</span> {chipletCount} units (affects combined yield)
        </label>
        <input
          type="range"
          min="1"
          max="9"
          step="1"
          value={chipletCount}
          onChange={(e) => setChipletCount(parseInt(e.target.value))}
          style={sliderStyle}
          aria-label="Chiplet Count affects combined yield"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(148, 163, 184, 0.7)', fontSize: '11px' }}>
          <span>1</span>
          <span>9</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          <span data-physics-label="node">Process Node:</span> {processNode} nm (defect density factor)
        </label>
        <input
          type="range"
          min="3"
          max="14"
          step="1"
          value={processNode}
          onChange={(e) => setProcessNode(parseInt(e.target.value))}
          style={sliderStyle}
          aria-label="Process Node defect density factor"
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(148, 163, 184, 0.7)', fontSize: '11px' }}>
          <span>3 nm</span>
          <span>14 nm</span>
        </div>
      </div>

      <button
        onClick={() => setShowInterconnect(!showInterconnect)}
        style={{
          padding: '12px 24px',
          borderRadius: '8px',
          border: 'none',
          background: showInterconnect ? '#f59e0b' : '#475569',
          color: 'white',
          fontWeight: 'bold',
          cursor: 'pointer',
          minHeight: '44px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {showInterconnect ? 'Hide Interconnect' : 'Show Interconnect'}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: '24px' }}>
            <span style={{ color: '#22c55e', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px' }}>Chip Manufacturing</span>
            <h1 style={{ fontSize: '32px', marginTop: '8px', background: 'linear-gradient(90deg, #22c55e, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Chiplet Architecture
            </h1>
            <p style={{ color: '#e2e8f0', fontSize: '18px', marginTop: '8px' }}>
              Why are modern chips made of multiple small pieces?
            </p>
          </div>

          {renderVisualization()}

          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px', borderLeft: '4px solid #22c55e' }}>
            <p style={{ fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
              The latest AMD and Intel processors aren't single chips - they're assemblies of multiple smaller "chiplets."
              Apple's M1 Ultra is literally two M1 Max chips glued together!
            </p>
            <p style={{ color: '#e2e8f0', fontSize: '14px', marginTop: '12px', fontWeight: 400 }}>
              Why build chips in pieces instead of as one unit? The answer involves physics, economics, and clever engineering.
            </p>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Next \u2192')
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Make Your Prediction</h2>
          <p style={{ textAlign: 'center', color: colors.textSecondary, marginBottom: '16px' }}>
            Step 1 of 2: Observe the diagram, then make your prediction
          </p>

          {/* Static SVG for prediction phase */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            {renderVisualization()}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <p style={{ fontSize: '16px', marginBottom: '8px', color: colors.textSecondary }}>
              AMD, Intel, and Apple all now use chiplet designs instead of single monolithic chips.
              What's the main reason for this change?
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
                  border: prediction === p.id ? '2px solid #22c55e' : '1px solid #475569',
                  background: prediction === p.id ? 'rgba(34, 197, 94, 0.2)' : 'rgba(30, 41, 59, 0.5)',
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
        </div>
      </div>,
      renderBottomBar(true, prediction ? 'Test My Prediction' : 'Continue \u2192')
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Explore Yield Economics</h2>
          <p style={{ textAlign: 'center', color: colors.textSecondary, marginBottom: '16px' }}>
            See how die size affects manufacturing yield and cost
          </p>

          {/* Observation guidance */}
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '16px', borderRadius: '12px', marginBottom: '24px', borderLeft: '4px solid #22c55e' }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              <strong style={{ color: '#22c55e' }}>Observe:</strong> Use the sliders below to adjust die area, chiplet count, and process node. Watch how yield and cost change between monolithic and chiplet designs.
            </p>
          </div>

          {renderVisualization()}
          {renderControls()}

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginTop: '24px' }}>
            <h3 style={{ color: '#22c55e', marginBottom: '12px' }}>Key Experiments:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px' }}>
              <li>Increase die size to 800mm2 - watch yield collapse</li>
              <li>Use smaller process nodes - see defect impact increase</li>
              <li>Add more chiplets - observe yield recovery</li>
              <li>Notice: there's a sweet spot where chiplets win on cost</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '20px', borderRadius: '12px', marginTop: '24px' }}>
            <h3 style={{ color: '#6366f1', marginBottom: '12px' }}>Key Terms Defined:</h3>
            <p style={{ color: colors.textSecondary, lineHeight: 1.8, marginBottom: '8px' }}>
              <strong>Yield</strong> is defined as the ratio of good dies to total dies produced. The formula is Y = e^(-D x A) where D is defect density and A is die area.
            </p>
            <p style={{ color: colors.textSecondary, lineHeight: 1.8 }}>
              <strong>Defect Density</strong> measures the number of manufacturing defects per cm2. When you increase die area, the probability of hitting a defect increases exponentially. This is why chiplets are so important for modern processor design.
            </p>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Review the Concepts')
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'defects';

    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
          }}>
            <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444' }}>
              {wasCorrect ? 'Your prediction was correct!' : 'The key insight:'}
            </h3>
            <p style={{ color: colors.textSecondary }}>
              As you observed in the experiment, smaller dies have exponentially better yield!
              The result shows that the probability of a defect killing your chip decreases dramatically with smaller area.
              {prediction && ` You predicted that "${predictions.find(p => p.id === prediction)?.label || 'unknown'}" - ${wasCorrect ? 'and you were right!' : 'but the real answer is about yield economics.'}`}
            </p>
          </div>

          {/* Visual diagram for review */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            {renderVisualization()}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>The Yield Problem</h3>
            <p style={{ lineHeight: 1.7, marginBottom: '12px', color: colors.textSecondary }}>
              <strong style={{ color: colors.textPrimary }}>Poisson Statistics:</strong> Yield follows Y = e^(-D x A) where D is defect density and A is die area.
              Double the area means MUCH worse than half the yield!
            </p>
            <p style={{ lineHeight: 1.7, marginBottom: '12px', color: colors.textSecondary }}>
              <strong style={{ color: colors.textPrimary }}>Defect Impact:</strong> A single defect anywhere on the die kills the entire chip.
              On a 400mm2 die, that's 4x the chance of hitting a defect compared to 100mm2.
            </p>
            <p style={{ lineHeight: 1.7, color: colors.textSecondary }}>
              <strong style={{ color: colors.textPrimary }}>Economic Impact:</strong> If you have 10% yield on monolithic dies, you're throwing away 90% of your expensive silicon!
              With chiplets, you only discard the small defective pieces.
            </p>
          </div>

          <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: '#6366f1', marginBottom: '16px' }}>The Reticle Limit</h3>
            <p style={{ lineHeight: 1.7, color: colors.textSecondary }}>
              There's also a hard limit: the lithography machine can only expose ~800mm2 at once (the "reticle limit").
              To build bigger chips, you MUST use chiplets. NVIDIA's latest GPUs exceed this limit!
            </p>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Discover the Twist')
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#a855f7', marginBottom: '24px' }}>The Twist</h2>
          <p style={{ textAlign: 'center', color: colors.textSecondary, marginBottom: '16px' }}>
            Step 1 of 2: Observe the mixed node diagram, then predict
          </p>

          {/* Static SVG for twist prediction phase */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            {renderVisualization()}
          </div>

          <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '24px', borderLeft: '4px solid #a855f7' }}>
            <p style={{ fontSize: '16px', marginBottom: '12px', color: colors.textSecondary }}>
              Here's something surprising: AMD's EPYC processors use compute chiplets on cutting-edge 5nm, but their I/O die uses older 14nm technology.
            </p>
            <p style={{ color: '#c4b5fd', fontWeight: 'bold' }}>
              Why would you mix old and new technology in the same chip?
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
                  border: twistPrediction === p.id ? '2px solid #a855f7' : '1px solid #475569',
                  background: twistPrediction === p.id ? 'rgba(168, 85, 247, 0.2)' : 'rgba(30, 41, 59, 0.5)',
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
        </div>
      </div>,
      renderBottomBar(true, twistPrediction ? 'See the Answer' : 'Continue \u2192')
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', color: '#a855f7', marginBottom: '24px' }}>Mixed Process Nodes</h2>

          {renderVisualization()}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '16px', borderRadius: '12px' }}>
              <h4 style={{ color: '#6366f1', marginBottom: '8px' }}>Compute Chiplets (5nm)</h4>
              <ul style={{ color: '#e2e8f0', fontSize: '14px', paddingLeft: '16px', lineHeight: 1.6 }}>
                <li>Need smallest transistors</li>
                <li>High density, high speed</li>
                <li>Most expensive per mm2</li>
                <li>Worth the cost for perf</li>
              </ul>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '16px', borderRadius: '12px' }}>
              <h4 style={{ color: '#f59e0b', marginBottom: '8px' }}>I/O Die (14nm)</h4>
              <ul style={{ color: '#e2e8f0', fontSize: '14px', paddingLeft: '16px', lineHeight: 1.6 }}>
                <li>Analog circuits work fine</li>
                <li>Memory controllers</li>
                <li>PCIe, USB, etc.</li>
                <li>Much cheaper to make</li>
              </ul>
            </div>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginTop: '24px' }}>
            <h4 style={{ color: '#22c55e', marginBottom: '8px' }}>The Optimization</h4>
            <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.6 }}>
              Each function gets the optimal process node. Compute needs the latest, I/O doesn't benefit from it.
              This can save 30-40% on total chip cost while maintaining full performance!
            </p>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Review the Discovery')
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'mixed';

    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            background: wasCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? '#22c55e' : '#ef4444'}`,
          }}>
            <h3 style={{ color: wasCorrect ? '#22c55e' : '#ef4444' }}>
              {wasCorrect ? 'Exactly right!' : 'The key insight:'}
            </h3>
            <p style={{ color: colors.textSecondary }}>Different functions have different optimal technologies! Chiplets let you mix and match process nodes for maximum efficiency.</p>
          </div>

          {/* Visual diagram for twist review */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            {renderVisualization()}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '16px' }}>Heterogeneous Integration</h3>
            <div style={{ lineHeight: 1.8, color: colors.textSecondary }}>
              <p><strong style={{ color: '#6366f1' }}>Compute dies:</strong> Latest process (5nm, 3nm) for maximum transistor density and efficiency</p>
              <p><strong style={{ color: '#f59e0b' }}>I/O dies:</strong> Mature process (14nm) - analog circuits don't shrink well</p>
              <p><strong style={{ color: '#22c55e' }}>Memory:</strong> Specialized HBM process optimized for stacking</p>
              <p><strong style={{ color: '#ef4444' }}>Power delivery:</strong> Can use even older nodes for voltage regulators</p>
            </div>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'See Real-World Applications')
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Real-World Applications</h2>
          <p style={{ textAlign: 'center', color: colors.textSecondary, marginBottom: '16px' }}>
            Application {Math.min(transferCompleted.size + 1, 4)} of 4: Complete all to unlock the test
          </p>

          {/* Industry statistics summary */}
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              The chiplet revolution is transforming semiconductor manufacturing. AMD EPYC processors achieve 40% cost savings with chiplets.
              Intel Ponte Vecchio uses 47 chiplets across 5nm to 14nm nodes. Apple M1 Ultra delivers 2.5TB/s interconnect bandwidth.
              Modern server CPUs pack up to 128 cores using this technology, with 400 GB/s die-to-die links.
            </p>
          </div>

          {/* Progress indicator */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  width: '40px',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: transferCompleted.has(i) ? '#22c55e' : 'rgba(255,255,255,0.2)',
                  transition: 'background-color 0.3s',
                }}
              />
            ))}
          </div>

          {transferApplications.map((app, index) => (
            <div
              key={index}
              style={{
                background: 'rgba(30, 41, 59, 0.8)',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '16px',
                border: transferCompleted.has(index) ? '2px solid #22c55e' : '1px solid #334155',
              }}
            >
              <h3 style={{ color: '#f8fafc', marginBottom: '8px' }}>{app.title}</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                <p style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '14px' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: '1px solid #22c55e',
                      background: 'transparent',
                      color: '#22c55e',
                      cursor: 'pointer',
                      minHeight: '44px',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    Reveal Answer
                  </button>
                  <button
                    onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      minHeight: '44px',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    Got It
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #22c55e', marginBottom: '12px' }}>
                    <p style={{ color: '#e2e8f0', fontSize: '14px' }}>{app.answer}</p>
                  </div>
                  <button
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      minHeight: '44px',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    Got It
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>,
      renderBottomBar(transferCompleted.size >= 4, 'Take the Test')
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return wrapPhaseContent(
        <div style={{ padding: '24px', paddingBottom: '100px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '32px',
              borderRadius: '16px',
              textAlign: 'center',
              marginBottom: '24px',
            }}>
              <h2 style={{ color: testScore >= 8 ? '#22c55e' : '#ef4444', marginBottom: '8px' }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ fontSize: '48px', fontWeight: 'bold' }}>{testScore}/10</p>
              <p style={{ color: colors.textSecondary }}>
                {testScore >= 8 ? 'You\'ve mastered chiplet architecture!' : 'Review the concepts and try again.'}
              </p>
            </div>

            {/* Answer review */}
            <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '16px' }}>Answer Review</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {testQuestions.map((q, i) => {
                  const isCorrect = testAnswers[i] !== null && q.options[testAnswers[i]!].correct;
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: isCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      }}
                    >
                      <span style={{ color: colors.textSecondary, fontWeight: 'bold' }}>Q{i + 1}</span>
                      <span style={{ color: isCorrect ? '#22c55e' : '#ef4444', fontSize: '16px' }}>
                        {isCorrect ? '\u2713' : '\u2717'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        renderBottomBar(true, testScore >= 8 ? 'Claim Mastery' : 'Try Again', testScore >= 8 ? goNext : () => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); setCurrentTestQuestion(0); setPendingAnswer(null); setConfirmedAnswers(new Set()); })
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    const isCurrentConfirmed = confirmedAnswers.has(currentTestQuestion);
    const currentAnswer = isCurrentConfirmed ? testAnswers[currentTestQuestion] : pendingAnswer;
    const isCorrect = currentAnswer !== null && currentQ.options[currentAnswer].correct;

    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: '#ffffff' }}>Knowledge Test</h2>
            <span style={{ color: colors.textSecondary, fontWeight: 'bold', fontSize: '16px' }}>Question {currentTestQuestion + 1} of 10</span>
          </div>

          <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Test your understanding of chiplet architecture, yield economics, and modern semiconductor manufacturing.
              Each question covers key concepts from your exploration of die sizes, process nodes, and interconnect technologies.
              Think carefully about the tradeoffs between monolithic and chiplet designs that you observed.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
            {testQuestions.map((_, i) => (
              <div
                key={i}
                onClick={() => {
                  setCurrentTestQuestion(i);
                  setPendingAnswer(null);
                }}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  background: confirmedAnswers.has(i) ? '#22c55e' : i === currentTestQuestion ? '#64748b' : '#1e293b',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ fontSize: '16px', lineHeight: 1.6, color: '#ffffff' }}>{currentQ.question}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {currentQ.options.map((opt, i) => {
              const isSelected = currentAnswer === i;
              const showResult = isCurrentConfirmed && isSelected;
              const optionCorrect = opt.correct;

              return (
                <button
                  key={i}
                  onClick={() => handleTestAnswer(currentTestQuestion, i)}
                  disabled={isCurrentConfirmed}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: showResult
                      ? `2px solid ${optionCorrect ? '#22c55e' : '#ef4444'}`
                      : isSelected ? '2px solid #6366f1' : '1px solid #475569',
                    background: showResult
                      ? (optionCorrect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)')
                      : isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                    color: '#ffffff',
                    cursor: isCurrentConfirmed ? 'default' : 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
                    opacity: isCurrentConfirmed && !isSelected ? 0.6 : 1,
                  }}
                >
                  {String.fromCharCode(65 + i)}) {opt.text}
                  {showResult && (
                    <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>
                      {optionCorrect ? '\u2713 Correct' : '\u2717 Incorrect'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Show explanation after confirming */}
          {isCurrentConfirmed && (
            <div style={{
              background: isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '24px',
              borderLeft: `4px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
            }}>
              <p style={{ color: '#ffffff', fontWeight: 'bold', marginBottom: '8px' }}>
                {isCorrect ? 'Correct!' : 'The correct answer is:'}
              </p>
              <p style={{ color: '#e2e8f0' }}>
                {currentQ.options.find(o => o.correct)?.text}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <button
              onClick={() => {
                setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1));
                setPendingAnswer(null);
              }}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #475569',
                background: 'transparent',
                color: currentTestQuestion === 0 ? '#475569' : '#ffffff',
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Previous
            </button>

            {!isCurrentConfirmed && pendingAnswer !== null ? (
              <button
                onClick={confirmAnswer}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Check Answer
              </button>
            ) : isCurrentConfirmed && currentTestQuestion < 9 ? (
              <button
                onClick={goToNextQuestion}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#22c55e',
                  color: '#ffffff',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Next
              </button>
            ) : isCurrentConfirmed && currentTestQuestion === 9 ? (
              <button
                onClick={submitTest}
                disabled={confirmedAnswers.size < 10}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: confirmedAnswers.size < 10 ? '#475569' : '#22c55e',
                  color: '#ffffff',
                  cursor: confirmedAnswers.size < 10 ? 'not-allowed' : 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Submit
              </button>
            ) : (
              <div style={{ width: '120px' }} /> // Placeholder for layout
            )}
          </div>
        </div>
      </div>,
      null
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return wrapPhaseContent(
      <div style={{ padding: '24px', paddingBottom: '100px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '80px', marginBottom: '16px' }}>MASTERY</div>
          <h1 style={{ color: '#22c55e', marginBottom: '8px' }}>Chiplet Architecture Expert!</h1>
          <p style={{ color: '#e2e8f0', marginBottom: '32px' }}>
            You understand the economics and engineering of modern chip manufacturing
          </p>

          <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '24px', borderRadius: '16px', marginBottom: '24px', textAlign: 'left' }}>
            <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>Key Concepts Mastered:</h3>
            <ul style={{ lineHeight: 2, paddingLeft: '20px' }}>
              <li>Yield economics and Poisson statistics</li>
              <li>The reticle limit and why it matters</li>
              <li>Heterogeneous integration across process nodes</li>
              <li>Die-to-die interconnect challenges</li>
              <li>3D stacking benefits</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <h4 style={{ color: '#22c55e', marginBottom: '8px' }}>The Core Insight</h4>
            <p style={{ color: '#e2e8f0' }}>
              Chiplets transform chip design from a monolithic manufacturing problem into a system integration problem.
              This enables larger, more capable chips while improving yields and reducing costs.
            </p>
          </div>
        </div>
      </div>,
      renderBottomBar(true, 'Complete')
    );
  }

  return null;
};

export default ChipletArchitectureRenderer;
