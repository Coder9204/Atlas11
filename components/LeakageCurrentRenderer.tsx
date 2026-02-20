'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// GAME 182: LEAKAGE CURRENT IN NANOSCALE
// ============================================================================
// Physics: Gate leakage (quantum tunneling) and subthreshold leakage
// At small process nodes, leakage can exceed dynamic power
// Scaling challenges: I_leak ~ exp(-t_ox) and I_sub ~ exp(-Vth/nVt)
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface LeakageCurrentRendererProps {
  gamePhase?: Phase; // Optional for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#e2e8f0',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgCardLight: '#1e293b',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  dynamic: '#3b82f6',
  leakage: '#ef4444',
  gate: '#8b5cf6',
  subthreshold: '#f97316',
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
  twist_play: 'Explore Twist',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

const realWorldApps = [
  {
    icon: '📱',
    title: 'Smartphone Battery Life',
    short: 'Why your phone dies overnight',
    tagline: 'The hidden drain on every device',
    description: 'Modern smartphone processors contain billions of transistors that leak current even when idle. This leakage can account for 30-40% of total power consumption, significantly impacting battery life. Managing leakage is crucial for all-day battery performance.',
    connection: 'The exponential relationship between oxide thickness and gate leakage explains why process scaling has stalled at certain nodes. Thinner oxides for faster switching mean exponentially more leakage current.',
    howItWorks: 'Subthreshold leakage flows when transistors are "off" but not fully blocking. Gate leakage tunnels through thin oxide layers. Power gating cuts supply to unused circuits, eliminating leakage in idle blocks.',
    stats: [
      { value: '40%', label: 'Leakage power', icon: '⚡' },
      { value: '3nm', label: 'Leading process', icon: '📈' },
      { value: '$500B', label: 'Chip market', icon: '🚀' }
    ],
    examples: ['Apple A-series chips', 'Qualcomm Snapdragon', 'Samsung Exynos', 'MediaTek Dimensity'],
    companies: ['Apple', 'Qualcomm', 'TSMC', 'Samsung Foundry'],
    futureImpact: 'Gate-all-around transistors and new materials like high-k dielectrics will continue reducing leakage, but managing power at nanoscale remains a fundamental challenge.',
    color: '#3B82F6'
  },
  {
    icon: '💾',
    title: 'Data Center Efficiency',
    short: 'Cooling billions of transistors',
    tagline: 'Leakage heats the cloud',
    description: 'Data centers consume 1-2% of global electricity, with leakage current contributing significantly to idle power. Servers must be cooled even when not processing data because transistor leakage generates continuous heat.',
    connection: 'At nanoscale, leakage increases exponentially with temperature, creating a thermal runaway risk. Data center cooling must account for both active switching power and ever-present leakage heat.',
    howItWorks: 'Modern processors use dynamic voltage and frequency scaling (DVFS) to reduce leakage when loads are low. Power states from C0 to C10 progressively shut down chip regions. Still, idle servers consume 30-60% of peak power.',
    stats: [
      { value: '205 TWh', label: 'DC energy/year', icon: '⚡' },
      { value: '40%', label: 'Idle power', icon: '📈' },
      { value: '$200B', label: 'DC market', icon: '🚀' }
    ],
    examples: ['Google hyperscale facilities', 'AWS data centers', 'Microsoft Azure regions', 'Facebook server farms'],
    companies: ['Google', 'Meta', 'Microsoft', 'Intel'],
    futureImpact: 'Near-threshold computing and aggressive power gating will reduce idle power, while immersion cooling handles remaining leakage heat more efficiently.',
    color: '#10B981'
  },
  {
    icon: '🚗',
    title: 'Automotive Electronics',
    short: 'Reliable operation in extreme temps',
    tagline: 'From -40°C to +150°C',
    description: 'Automotive chips must operate reliably from cold starts to engine compartment temperatures. Leakage current increases exponentially with temperature, making high-temperature operation particularly challenging for safety-critical systems.',
    connection: 'The temperature dependence of leakage current explains why automotive chips use different process nodes than phones. Higher operating temperatures require thicker oxides and higher threshold voltages.',
    howItWorks: 'Automotive-grade processes use higher threshold voltage transistors that leak less at elevated temperatures. DRAM refresh rates must increase dramatically at high temperatures to compensate for increased cell leakage.',
    stats: [
      { value: '150°C', label: 'Max junction', icon: '⚡' },
      { value: '10x', label: 'Leakage increase/50°C', icon: '📈' },
      { value: '$50B', label: 'Auto chip market', icon: '🚀' }
    ],
    examples: ['Engine control units', 'ADAS processors', 'Battery management', 'Infotainment systems'],
    companies: ['NXP', 'Infineon', 'Renesas', 'Texas Instruments'],
    futureImpact: 'Silicon carbide and gallium nitride wide-bandgap semiconductors will enable higher temperature operation with minimal leakage for power electronics.',
    color: '#F59E0B'
  },
  {
    icon: '⌚',
    title: 'Wearable Devices',
    short: 'Days of battery from tiny cells',
    tagline: 'Every microamp matters',
    description: 'Smartwatches and fitness trackers have tiny batteries but must run for days. Ultra-low-leakage process technologies and aggressive power management make this possible. Leakage budgets are measured in microamps.',
    connection: 'Wearable designers obsess over subthreshold leakage because it dominates idle power. The exponential relationship between threshold voltage and leakage current defines the design space.',
    howItWorks: 'Ultra-low-power processes use high-threshold transistors and thicker gate oxides. Circuits spend most time in deep sleep with most blocks powered off. Only a tiny always-on domain runs real-time clock and sensors.',
    stats: [
      { value: '300mAh', label: 'Typical battery', icon: '⚡' },
      { value: '7+ days', label: 'Standby life', icon: '📈' },
      { value: '<50μA', label: 'Sleep current', icon: '🚀' }
    ],
    examples: ['Apple Watch', 'Fitbit trackers', 'Garmin watches', 'Oura Ring'],
    companies: ['Apple', 'Fitbit', 'Garmin', 'Samsung'],
    futureImpact: 'Emerging non-volatile memory and near-zero-power sensing will enable truly ambient-powered wearables that harvest energy from body heat or motion.',
    color: '#8B5CF6'
  }
];

const LeakageCurrentRenderer: React.FC<LeakageCurrentRendererProps> = ({
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
  const [processNode, setProcessNode] = useState(45); // nm
  const [supplyVoltage, setSupplyVoltage] = useState(1.0); // volts
  const [temperature, setTemperature] = useState(25); // Celsius
  const [transistorCount, setTransistorCount] = useState(1); // billions
  const [clockFrequency, setClockFrequency] = useState(3.0); // GHz
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [transferGotIt, setTransferGotIt] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 0.05);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Physics calculations
  const calculatePower = useCallback(() => {
    // Gate oxide thickness scales with process node
    const tox = processNode * 0.02; // nm (rough approximation)

    // Gate leakage: exponential with oxide thickness (quantum tunneling)
    // I_gate ~ exp(-A * tox) where A is a material constant
    const gateLeakageBase = Math.exp(-tox / 0.4) * 10; // arbitrary scaling

    // Subthreshold leakage: exponential with threshold voltage
    // I_sub ~ exp(-Vth / nVt) where Vt = kT/q ~ 26mV at room temp
    const vt = 0.026 * (1 + (temperature - 25) / 300); // thermal voltage
    const vth = 0.3 * (processNode / 45); // threshold voltage scales with node
    const subthresholdBase = Math.exp(-vth / (1.2 * vt)) * 50;

    // Temperature dependence (leakage doubles every ~10C)
    const tempFactor = Math.pow(2, (temperature - 25) / 10);

    // Scale with transistor count
    const gateLeakage = gateLeakageBase * transistorCount * tempFactor * (45 / processNode);
    const subthresholdLeakage = subthresholdBase * transistorCount * tempFactor * Math.pow(45 / processNode, 1.5);
    const totalLeakage = gateLeakage + subthresholdLeakage;

    // Dynamic power: P = C * V^2 * f * activity
    // Capacitance scales with process node
    const capacitance = processNode / 45; // relative capacitance
    const activity = 0.2; // switching activity factor
    const dynamicPower = capacitance * Math.pow(supplyVoltage, 2) * clockFrequency * activity * transistorCount * 30;

    // Total power
    const totalPower = dynamicPower + totalLeakage;
    const leakageRatio = totalLeakage / totalPower * 100;

    return {
      gateLeakage,
      subthresholdLeakage,
      totalLeakage,
      dynamicPower,
      totalPower,
      leakageRatio,
      tox,
      vth,
      isLeakageDominant: totalLeakage > dynamicPower,
    };
  }, [processNode, supplyVoltage, temperature, transistorCount, clockFrequency]);

  const predictions = [
    { id: 'zero', label: 'A transistor that is OFF conducts zero current' },
    { id: 'tiny', label: 'There is tiny leakage but it is negligible in modern chips' },
    { id: 'significant', label: 'Leakage is significant and can rival or exceed active power' },
    { id: 'constant', label: 'Leakage stays constant regardless of process node size' },
  ];

  const twistPredictions = [
    { id: 'dynamic_always', label: 'Dynamic power always dominates because transistors switch billions of times per second' },
    { id: 'leakage_dominates', label: 'At small nodes (7nm and below), leakage can exceed dynamic power' },
    { id: 'equal', label: 'They are always roughly equal by design' },
    { id: 'depends_frequency', label: 'It only depends on clock frequency, not process node' },
  ];

  const transferApplications = [
    {
      title: 'Mobile Processor Design',
      description: 'Smartphones need to last all day on a small battery. Even when idle, billions of transistors leak power continuously.',
      question: 'Why do mobile chips use multiple voltage and frequency domains?',
      answer: 'Different parts of the chip can be powered down or run at lower voltage when not needed. Reducing voltage dramatically cuts both dynamic power (V^2) and leakage. This is why phones have big.LITTLE core architectures.',
    },
    {
      title: 'Data Center Efficiency',
      description: 'Data centers contain millions of servers. Even 1% improvement in power efficiency saves megawatts and millions of dollars yearly.',
      question: 'Why do data centers care about server idle power?',
      answer: 'Servers spend significant time idle or lightly loaded, but still consume 30-60% of peak power due to leakage. This baseline power multiplied by thousands of servers represents huge ongoing costs and cooling requirements.',
    },
    {
      title: 'High-K Metal Gate Technology',
      description: 'Intel introduced High-K metal gates at 45nm to combat gate leakage. The thicker high-K dielectric reduces tunneling while maintaining capacitance.',
      question: 'How does High-K technology reduce gate leakage?',
      answer: 'High-K materials like hafnium oxide have higher dielectric constant (K~25 vs K~4 for SiO2). This allows a physically thicker gate oxide while maintaining the same electrical capacitance, exponentially reducing quantum tunneling.',
    },
    {
      title: 'FinFET Transistor Architecture',
      description: 'FinFET (3D) transistors wrap the gate around the channel on three sides, providing better control over leakage than planar transistors.',
      question: 'Why do FinFETs have lower subthreshold leakage?',
      answer: 'The tri-gate structure provides superior electrostatic control over the channel. This allows higher threshold voltages (lower leakage) while maintaining good ON current. The 3D geometry also enables tighter packing.',
    },
  ];

  const testQuestions = [
    {
      question: 'A chip designer is working on a 5nm process node where the gate oxide is only 1nm thick — just a few atomic layers. What physical mechanism causes significant gate leakage current at this scale?',
      options: [
        { text: 'Electrons flowing through damaged oxide defects caused by high voltage stress', correct: false },
        { text: 'Quantum tunneling: electrons pass through the ultra-thin gate oxide barrier even with no defects', correct: true },
        { text: 'Capacitive coupling between adjacent transistors creates parasitic current paths', correct: false },
        { text: 'Thermal noise in the substrate creates random electron movement through the gate', correct: false },
      ],
    },
    {
      question: 'A smartphone SoC is running in a hot environment (45°C ambient). The chip temperature reaches 85°C compared to 65°C in normal conditions. How does this 20°C increase affect subthreshold leakage current in the idle transistors?',
      options: [
        { text: 'Subthreshold leakage decreases because hotter electrons move away from the gate faster', correct: false },
        { text: 'Subthreshold leakage roughly quadruples — it doubles for each 10°C increase, so 20°C means 4x', correct: true },
        { text: 'Subthreshold leakage stays constant because it only depends on gate voltage, not temperature', correct: false },
        { text: 'The leakage only increases significantly above 100°C — below that it stays nearly flat', correct: false },
      ],
    },
    {
      question: 'Chip designers in the early 2000s were scaling transistors to smaller nodes for better performance. At which process node did leakage power first become a serious enough design challenge to require major architectural changes?',
      options: [
        { text: 'At 250nm and larger nodes — leakage was already significant in the DRAM era', correct: false },
        { text: 'Around 130nm to 90nm — this is when leakage first became a critical power budget issue', correct: true },
        { text: 'Only below 7nm — before that, leakage was negligible compared to dynamic power', correct: false },
        { text: 'Leakage has always been the dominant power component since the first integrated circuits', correct: false },
      ],
    },
    {
      question: 'Intel introduced High-K metal gate technology when moving to 45nm and below. A chip uses hafnium oxide (HfO2, K~25) instead of SiO2 (K~3.9) as the gate dielectric. What is the primary advantage that reduces leakage current?',
      options: [
        { text: 'HfO2 conducts electricity better, allowing faster switching with lower gate voltage', correct: false },
        { text: 'The higher dielectric constant allows a physically thicker oxide layer with equivalent capacitance, reducing quantum tunneling leakage', correct: true },
        { text: 'High-K dielectrics are cheaper to deposit, reducing manufacturing defects that cause leakage', correct: false },
        { text: 'HfO2 creates a wider bandgap that accelerates transistor switching speed and reduces resistance', correct: false },
      ],
    },
    {
      question: 'A power engineer is comparing two identical chip designs running at 1.0V vs 0.8V supply voltage. Both chips are idle with the same number of transistors at the same temperature. How does the 20% voltage reduction affect leakage power consumption?',
      options: [
        { text: 'Leakage is independent of supply voltage — it only depends on oxide thickness and temperature', correct: false },
        { text: 'Leakage decreases roughly linearly, so a 20% voltage drop gives about 20% less leakage', correct: false },
        { text: 'Leakage increases exponentially as voltage rises — lower voltage gives disproportionately much less leakage', correct: true },
        { text: 'Leakage actually increases at lower voltage because electrons move more slowly through the channel', correct: false },
      ],
    },
    {
      question: 'Apple transitioned from planar to FinFET transistors starting at the A7 chip (20nm). A FinFET wraps the gate around the silicon fin on three sides instead of sitting flat on top. Why does this 3D geometry improve leakage control compared to planar transistors?',
      options: [
        { text: 'FinFETs use different semiconductor materials with wider bandgap that block electron flow better', correct: false },
        { text: 'The 3D gate wraps around the channel, providing superior electrostatic control and allowing higher effective threshold voltage without performance penalty', correct: true },
        { text: 'FinFETs operate at significantly higher supply voltages which reduces subthreshold leakage', correct: false },
        { text: 'FinFETs have physically thicker gate oxide because the fin geometry allows more room for the dielectric', correct: false },
      ],
    },
    {
      question: 'An ARM Cortex-A processor has 8 cores but most apps only use 1-2 cores at a time. Battery tests show the phone drains 15% overnight even in airplane mode with no apps running. What is the most effective hardware technique to minimize this idle leakage power drain?',
      options: [
        { text: 'Running all 8 cores at maximum frequency to finish background tasks faster and then sleep longer', correct: false },
        { text: 'Power gating: completely cutting off power supply to unused core blocks so those transistors cannot leak', correct: true },
        { text: 'Increasing the clock frequency of active cores to compensate for the power lost to leakage', correct: false },
        { text: 'Replacing all FinFET transistors with older planar designs that have higher threshold voltages', correct: false },
      ],
    },
    {
      question: 'A chip designer must choose between two threshold voltage options: Vth = 0.4V (low-Vth for speed) vs Vth = 0.6V (high-Vth for leakage reduction). The subthreshold leakage follows I_sub ∝ exp(-Vth / nVt). How does this 0.2V Vth increase affect subthreshold leakage?',
      options: [
        { text: 'Higher Vth means exponentially lower leakage — at 25°C with n=1.5, the leakage reduces by roughly 100x', correct: true },
        { text: 'Higher Vth means higher leakage because more gate voltage is needed to turn off the transistor', correct: false },
        { text: 'Threshold voltage has essentially no effect on leakage — only temperature and oxide thickness matter', correct: false },
        { text: 'Lower Vth reduces leakage because it lets transistors turn off more sharply and completely', correct: false },
      ],
    },
    {
      question: 'A semiconductor company is comparing two process nodes: 28nm planar CMOS vs 7nm FinFET. Both have the same number of transistors per unit area. The 7nm node scales the oxide thinner and reduces Vth for performance. What happens to total leakage power density?',
      options: [
        { text: 'Leakage power density stays roughly constant because FinFET geometry compensates for the scaling effects', correct: false },
        { text: 'Leakage power density actually decreases at smaller nodes because electrons have shorter distances to travel', correct: false },
        { text: 'Leakage power density increases dramatically at smaller nodes — thinner oxide means more tunneling and lower Vth means more subthreshold current', correct: true },
        { text: 'Leakage power density only depends on operating temperature, not on the specific process node technology', correct: false },
      ],
    },
    {
      question: 'A teardown analysis of a modern 5nm smartphone SoC running a typical social media app finds that the CPU cores are active only about 10% of the time. During the other 90% idle time, approximately what fraction of total chip power consumption comes from leakage current rather than dynamic switching?',
      options: [
        { text: 'Less than 5% — modern power management nearly eliminates leakage during idle periods', correct: false },
        { text: 'Around 10-20% — leakage is noticeable but dynamic power still dominates even at low activity', correct: false },
        { text: '30-50% or more — at advanced nodes and low activity levels, leakage can exceed or match dynamic power', correct: true },
        { text: 'Over 90% — essentially all power at idle in a modern chip is lost to transistor leakage currents', correct: false },
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
    else if (score < 7 && onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 700;
    const height = 420;
    const output = calculatePower();

    // Bar chart data
    const maxPower = Math.max(output.dynamicPower, output.totalLeakage) * 1.2;
    const dynamicHeight = (output.dynamicPower / maxPower) * 120;
    const gateHeight = (output.gateLeakage / maxPower) * 120;
    const subHeight = (output.subthresholdLeakage / maxPower) * 120;

    // Calculate oxide thickness for visualization (scales with process node)
    const oxideThickness = Math.max(4, Math.min(20, processNode / 4));

    // Calculate electron animation positions based on leakage intensity
    const gateLeakIntensity = Math.min(1, output.gateLeakage / 30);
    const subLeakIntensity = Math.min(1, output.subthresholdLeakage / 50);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '750px' }}
        >
          {/* ============================================ */}
          {/* PREMIUM DEFS SECTION - Gradients & Filters */}
          {/* ============================================ */}
          <defs>
            {/* Premium dark lab background gradient */}
            <linearGradient id="leakLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a1628" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a1628" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Gate metal gradient - premium purple metallic */}
            <linearGradient id="leakGateMetal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="20%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#7c3aed" />
              <stop offset="80%" stopColor="#6d28d9" />
              <stop offset="100%" stopColor="#5b21b6" />
            </linearGradient>

            {/* Gate oxide gradient - golden insulator with depth */}
            <linearGradient id="leakOxideGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="25%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            {/* Silicon substrate gradient - gray semiconductor */}
            <linearGradient id="leakSiliconGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="30%" stopColor="#4b5563" />
              <stop offset="60%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Channel region gradient - lighter silicon for inversion layer */}
            <linearGradient id="leakChannelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#9ca3af" />
              <stop offset="40%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>

            {/* Source/Drain n+ doped regions - blue semiconductor */}
            <linearGradient id="leakSourceDrainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="25%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="75%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            {/* Depletion region gradient */}
            <linearGradient id="leakDepletionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#6b7280" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
            </linearGradient>

            {/* Electron glow - radial for particles */}
            <radialGradient id="leakElectronGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
              <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
            </radialGradient>

            {/* Gate leakage electron glow - purple tinted */}
            <radialGradient id="leakGateElectronGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e879f9" stopOpacity="1" />
              <stop offset="30%" stopColor="#d946ef" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#a855f7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </radialGradient>

            {/* Subthreshold leakage electron glow - orange tinted */}
            <radialGradient id="leakSubElectronGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fdba74" stopOpacity="1" />
              <stop offset="30%" stopColor="#fb923c" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#f97316" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
            </radialGradient>

            {/* Dynamic power bar gradient - blue */}
            <linearGradient id="leakDynamicBarGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1d4ed8" />
              <stop offset="30%" stopColor="#2563eb" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="70%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* Leakage power bar gradient - red/orange */}
            <linearGradient id="leakLeakageBarGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b91c1c" />
              <stop offset="30%" stopColor="#dc2626" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="70%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            {/* Warning glow filter */}
            <filter id="leakWarningGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Electron blur/glow filter */}
            <filter id="leakElectronBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft glow for oxide */}
            <filter id="leakOxideGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner shadow for depth */}
            <filter id="leakInnerShadow">
              <feOffset dx="0" dy="2" />
              <feGaussianBlur stdDeviation="2" result="shadow" />
              <feComposite in="SourceGraphic" in2="shadow" operator="over" />
            </filter>

            {/* Panel background gradient */}
            <linearGradient id="leakPanelBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#0f172a" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#020617" stopOpacity="1" />
            </linearGradient>

            {/* Metrics panel gradient */}
            <linearGradient id="leakMetricsPanelBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#111827" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Grid pattern for background */}
            <pattern id="leakGridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>

            {/* Quantum tunneling arrow marker */}
            <marker id="leakArrowHead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#a855f7" />
            </marker>

            {/* Subthreshold arrow marker */}
            <marker id="leakSubArrowHead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#f97316" />
            </marker>
          </defs>

          {/* Premium dark lab background */}
          <rect width={width} height={height} fill="url(#leakLabBg)" />
          <rect width={width} height={height} fill="url(#leakGridPattern)" />

          {/* Title with glow effect */}
          <text x={width/2} y={28} fill={colors.textPrimary} fontSize={16} fontWeight="bold" textAnchor="middle" style={{ letterSpacing: '0.05em' }}>
            Transistor Leakage at {processNode}nm Node
          </text>
          <text x={width/2} y={46} fill={colors.textMuted} fontSize={11} textAnchor="middle">
            Gate Oxide: {output.tox.toFixed(2)}nm | Temperature: {temperature}C | Vdd: {supplyVoltage.toFixed(2)}V
          </text>

          {/* ============================================ */}
          {/* PREMIUM TRANSISTOR CROSS-SECTION */}
          {/* ============================================ */}
          <g transform="translate(40, 70)">
            {/* Transistor frame */}
            <rect x={-10} y={-10} width={280} height={200} rx={8} fill="url(#leakPanelBg)" stroke="#334155" strokeWidth={1} />

            {/* Section label */}
            <rect x={0} y={-25} width={120} height={18} rx={4} fill="#111827" />
            <text x={60} y={-12} fill="#94a3b8" fontSize={11} fontWeight="bold" textAnchor="middle" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              MOSFET Cross-Section
            </text>

            {/* Silicon substrate (P-type body) */}
            <rect x={0} y={100} width={260} height={70} fill="url(#leakSiliconGradient)" />
            <text x={130} y={155} fill="#9ca3af" fontSize={11} textAnchor="middle" fontWeight="bold">P-type Substrate</text>

            {/* Source region (N+ doped) */}
            <rect x={10} y={70} width={60} height={50} rx={4} fill="url(#leakSourceDrainGradient)" />
            <rect x={12} y={72} width={56} height={46} rx={3} fill="none" stroke="#93c5fd" strokeWidth={0.5} strokeOpacity={0.5} />
            <text x={40} y={100} fill="#bfdbfe" fontSize={11} fontWeight="bold" textAnchor="middle">N+</text>
            <text x={40} y={135} fill="#60a5fa" fontSize={11} textAnchor="middle" fontWeight="bold">SOURCE</text>

            {/* Drain region (N+ doped) */}
            <rect x={190} y={70} width={60} height={50} rx={4} fill="url(#leakSourceDrainGradient)" />
            <rect x={192} y={72} width={56} height={46} rx={3} fill="none" stroke="#93c5fd" strokeWidth={0.5} strokeOpacity={0.5} />
            <text x={220} y={100} fill="#bfdbfe" fontSize={11} fontWeight="bold" textAnchor="middle">N+</text>
            <text x={220} y={135} fill="#60a5fa" fontSize={11} textAnchor="middle" fontWeight="bold">DRAIN</text>

            {/* Channel region */}
            <rect x={70} y={70 + oxideThickness} width={120} height={30} fill="url(#leakChannelGradient)" />
            <rect x={72} y={72 + oxideThickness} width={116} height={26} fill="url(#leakDepletionGradient)" />

            {/* Gate oxide layer - thickness varies with process node */}
            <rect x={70} y={70} width={120} height={oxideThickness} fill="url(#leakOxideGradient)" filter="url(#leakOxideGlow)" />
            <rect x={72} y={71} width={116} height={oxideThickness - 2} fill="none" stroke="#fde68a" strokeWidth={0.5} strokeOpacity={0.6} />

            {/* Gate oxide label */}
            <line x1={195} y1={70 + oxideThickness/2} x2={235} y2={70 + oxideThickness/2} stroke="#fbbf24" strokeWidth={1} strokeDasharray="2,2" />
            <text x={240} y={70 + oxideThickness/2 + 3} fill="#fbbf24" fontSize={11} fontWeight="bold">
              SiO₂ ({output.tox.toFixed(1)}nm)
            </text>

            {/* Gate metal contact */}
            <rect x={70} y={40} width={120} height={30} rx={4} fill="url(#leakGateMetal)" />
            <rect x={72} y={42} width={116} height={26} rx={3} fill="none" stroke="#c4b5fd" strokeWidth={0.5} strokeOpacity={0.5} />
            <text x={130} y={58} fill="#f5f3ff" fontSize={11} fontWeight="bold" textAnchor="middle">GATE</text>

            {/* Gate contact */}
            <rect x={115} y={20} width={30} height={25} fill="#4b5563" />
            <rect x={117} y={22} width={26} height={21} fill="#374151" />

            {/* ============================================ */}
            {/* ANIMATED LEAKAGE CURRENT ELECTRONS */}
            {/* ============================================ */}

            {/* Gate Leakage (Quantum Tunneling) - Electrons tunneling through oxide */}
            {[...Array(Math.ceil(gateLeakIntensity * 6))].map((_, i) => {
              const baseY = 45 + (i % 3) * 8;
              const xOffset = (i % 2) * 40 + 90;
              return (
                <g key={`gate-leak-${i}`}>
                  {/* Tunneling electron with glow */}
                  <circle r="5" fill="url(#leakGateElectronGlow)" filter="url(#leakElectronBlur)">
                    <animate
                      attributeName="cy"
                      values={`${baseY};${baseY + 60};${baseY}`}
                      dur={`${1.5 + i * 0.2}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="cx"
                      values={`${xOffset};${xOffset + (Math.random() - 0.5) * 10};${xOffset}`}
                      dur={`${1.5 + i * 0.2}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0;0.9;0.9;0"
                      dur={`${1.5 + i * 0.2}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle r="2" fill="#e879f9">
                    <animate
                      attributeName="cy"
                      values={`${baseY};${baseY + 60};${baseY}`}
                      dur={`${1.5 + i * 0.2}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="cx"
                      values={`${xOffset};${xOffset + (Math.random() - 0.5) * 10};${xOffset}`}
                      dur={`${1.5 + i * 0.2}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;1;0"
                      dur={`${1.5 + i * 0.2}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              );
            })}

            {/* Gate leakage flow indicator arrow */}
            <path
              d="M 130 45 L 130 95"
              stroke="#a855f7"
              strokeWidth={2}
              strokeDasharray="4,3"
              markerEnd="url(#leakArrowHead)"
              opacity={0.7}
            >
              <animate attributeName="stroke-dashoffset" values="0;14" dur="0.8s" repeatCount="indefinite" />
            </path>

            {/* Subthreshold Leakage - Electrons flowing source to drain */}
            {[...Array(Math.ceil(subLeakIntensity * 8))].map((_, i) => {
              const yPos = 85 + (i % 3) * 8;
              return (
                <g key={`sub-leak-${i}`}>
                  {/* Subthreshold electron with glow */}
                  <circle r="4" fill="url(#leakSubElectronGlow)" filter="url(#leakElectronBlur)">
                    <animate
                      attributeName="cx"
                      values="55;205"
                      dur={`${0.8 + i * 0.15}s`}
                      repeatCount="indefinite"
                      begin={`${i * 0.1}s`}
                    />
                    <animate
                      attributeName="cy"
                      values={`${yPos};${yPos + Math.sin(i) * 5};${yPos}`}
                      dur={`${0.8 + i * 0.15}s`}
                      repeatCount="indefinite"
                      begin={`${i * 0.1}s`}
                    />
                    <animate
                      attributeName="opacity"
                      values="0;0.8;0.8;0"
                      dur={`${0.8 + i * 0.15}s`}
                      repeatCount="indefinite"
                      begin={`${i * 0.1}s`}
                    />
                  </circle>
                  <circle r="2" fill="#fb923c">
                    <animate
                      attributeName="cx"
                      values="55;205"
                      dur={`${0.8 + i * 0.15}s`}
                      repeatCount="indefinite"
                      begin={`${i * 0.1}s`}
                    />
                    <animate
                      attributeName="cy"
                      values={`${yPos};${yPos + Math.sin(i) * 5};${yPos}`}
                      dur={`${0.8 + i * 0.15}s`}
                      repeatCount="indefinite"
                      begin={`${i * 0.1}s`}
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;1;0"
                      dur={`${0.8 + i * 0.15}s`}
                      repeatCount="indefinite"
                      begin={`${i * 0.1}s`}
                    />
                  </circle>
                </g>
              );
            })}

            {/* Subthreshold leakage flow indicator arrow */}
            <path
              d="M 55 90 L 200 90"
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="4,3"
              markerEnd="url(#leakSubArrowHead)"
              opacity={0.6}
            >
              <animate attributeName="stroke-dashoffset" values="0;14" dur="0.5s" repeatCount="indefinite" />
            </path>
          </g>

          {/* ============================================ */}
          {/* LEAKAGE TYPE LEGEND (absolute coords) */}
          {/* ============================================ */}
          <rect x={30} y={275} width={310} height={90} rx={6} fill="url(#leakMetricsPanelBg)" stroke="#334155" strokeWidth={1} />
          {/* Gate Leakage indicator */}
          <circle cx={50} cy={298} r={6} fill="url(#leakGateElectronGlow)" />
          <text x={62} y={293} fill={colors.gate} fontSize={11} fontWeight="bold">Gate Leakage</text>
          <text x={290} y={293} fill={colors.gate} fontSize={11} fontWeight="bold" textAnchor="end">
            {output.gateLeakage.toFixed(2)}W
          </text>
          <text x={62} y={308} fill={colors.textMuted} fontSize={11}>Quantum tunneling through gate oxide</text>
          {/* Subthreshold Leakage indicator */}
          <circle cx={50} cy={331} r={6} fill="url(#leakSubElectronGlow)" />
          <text x={62} y={326} fill={colors.subthreshold} fontSize={11} fontWeight="bold">Subthreshold Leakage</text>
          <text x={290} y={326} fill={colors.subthreshold} fontSize={11} fontWeight="bold" textAnchor="end">
            {output.subthresholdLeakage.toFixed(2)}W
          </text>
          <text x={62} y={341} fill={colors.textMuted} fontSize={11}>Source-to-drain current when transistor is OFF</text>

          {/* ============================================ */}
          {/* POWER COMPARISON BAR CHART (absolute coords) */}
          {/* ============================================ */}
          {/* Chart frame at x=345, y=60 */}
          <rect x={345} y={60} width={330} height={200} rx={8} fill="url(#leakPanelBg)" stroke="#334155" strokeWidth={1} />
          <rect x={360} y={62} width={100} height={18} rx={4} fill="#111827" />
          <text x={410} y={75} fill="#94a3b8" fontSize={11} fontWeight="bold" textAnchor="middle">Power Analysis</text>
          {/* Y-axis and X-axis */}
          <line x1={410} y1={85} x2={410} y2={225} stroke={colors.textMuted} strokeWidth={1} />
          <line x1={410} y1={225} x2={650} y2={225} stroke={colors.textMuted} strokeWidth={1} />
          {/* Grid lines for reference */}
          <line x1={410} y1={158} x2={650} y2={158} stroke={colors.textMuted} strokeWidth={0.5} strokeDasharray="4,4" strokeOpacity={0.5} />
          <line x1={410} y1={191} x2={650} y2={191} stroke={colors.textMuted} strokeWidth={0.5} strokeDasharray="4,4" strokeOpacity={0.5} />
          <text x={395} y={260} fill={colors.textMuted} fontSize={11} textAnchor="end">Watts</text>
          {/* Dynamic power bar */}
          <rect x={440} y={225 - dynamicHeight} width={70} height={dynamicHeight} rx={4} fill="url(#leakDynamicBarGradient)" />
          <text x={475} y={240} fill={colors.textMuted} fontSize={11} textAnchor="middle" fontWeight="bold">Dynamic</text>
          <text x={475} y={220 - dynamicHeight} fill={colors.dynamic} fontSize={11} textAnchor="middle" fontWeight="bold">
            {output.dynamicPower.toFixed(1)}W
          </text>
          {/* Leakage power bars (stacked) */}
          <rect x={550} y={225 - subHeight - gateHeight} width={70} height={subHeight} rx={4} fill={colors.subthreshold} />
          <rect x={550} y={225 - gateHeight} width={70} height={gateHeight} rx={4} fill={colors.gate} />
          <text x={585} y={240} fill={colors.textMuted} fontSize={11} textAnchor="middle" fontWeight="bold">Leakage</text>
          <text x={585} y={220 - gateHeight - subHeight} fill={colors.leakage} fontSize={11} textAnchor="middle" fontWeight="bold">
            {output.totalLeakage.toFixed(1)}W
          </text>
          {gateHeight > 15 && (
            <text x={585} y={225 - gateHeight/2} fill="#f5f3ff" fontSize={11} textAnchor="middle">Gate</text>
          )}
          {subHeight > 15 && (
            <text x={585} y={225 - gateHeight - subHeight/2} fill="#fff7ed" fontSize={11} textAnchor="middle">Sub</text>
          )}

          {/* ============================================ */}
          {/* METRICS & STATUS PANEL (absolute coords) */}
          {/* ============================================ */}
          <rect x={345} y={275} width={330} height={70} rx={6} fill="url(#leakMetricsPanelBg)" stroke="#334155" strokeWidth={1} />
          <text x={370} y={293} fill={colors.textSecondary} fontSize={11}>Total Power:</text>
          <text x={370} y={309} fill={colors.textPrimary} fontSize={14} fontWeight="bold">{output.totalPower.toFixed(1)}W</text>
          <text x={480} y={293} fill={colors.textSecondary} fontSize={11}>Leakage Ratio:</text>
          <text x={480} y={309} fill={output.isLeakageDominant ? colors.error : colors.success} fontSize={14} fontWeight="bold">
            {output.leakageRatio.toFixed(0)}%
          </text>
          <text x={580} y={293} fill={colors.textSecondary} fontSize={11}>Transistors:</text>
          <text x={580} y={309} fill={colors.textPrimary} fontSize={14} fontWeight="bold">{transistorCount}B</text>
          <text x={370} y={333} fill={colors.textSecondary} fontSize={11}>Clock: {clockFrequency}GHz  |  Vth: {output.vth.toFixed(2)}V</text>
          {output.isLeakageDominant && (
            <>
              <rect x={545} y={318} width={120} height={22} fill={colors.error} rx={4} opacity={0.3} />
              <text x={605} y={333} fill={colors.error} fontSize={11} textAnchor="middle" fontWeight="bold">LEAKAGE DOMINANT</text>
            </>
          )}

          {/* Process node indicator at bottom */}
          <text x={width/2} y={height - 25} fill={colors.textMuted} fontSize={11} textAnchor="middle">
            Process: {processNode}nm | {processNode <= 7 ? 'FinFET/GAA' : processNode <= 22 ? 'FinFET' : 'Planar MOSFET'}
          </text>

          {/* Formula reference near graphic */}
          <rect x={30} y={height - 60} width={310} height={32} rx={4} fill="rgba(0,0,0,0.4)" />
          <text x={40} y={height - 44} fill={colors.gate} fontSize={11} fontWeight="bold">I_gate ∝ exp(-t_ox)</text>
          <text x={175} y={height - 44} fill={colors.subthreshold} fontSize={11} fontWeight="bold">  I_sub ∝ exp(-Vth/nVt)</text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnimating ? 'Pause' : 'Animate'}
            </button>
            <button
              onClick={() => { setProcessNode(45); setTemperature(25); setSupplyVoltage(1.0); }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => {
    const output = calculatePower();

    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Process Node: {processNode}nm
          </label>
          <input
            type="range"
            min="3"
            max="90"
            step="1"
            value={processNode}
            onChange={(e) => setProcessNode(parseInt(e.target.value))}
            style={{ width: '100%', height: '20px', touchAction: 'pan-y' as const, WebkitAppearance: 'none' as const, accentColor: '#3b82f6' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.textMuted }}>
            <span>3nm (bleeding edge)</span>
            <span>90nm (mature)</span>
          </div>
        </div>

        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Temperature: {temperature}C
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={temperature}
            onChange={(e) => setTemperature(parseInt(e.target.value))}
            style={{ width: '100%', height: '20px', touchAction: 'pan-y' as const, WebkitAppearance: 'none' as const, accentColor: '#3b82f6' }}
          />
        </div>

        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Supply Voltage: {supplyVoltage.toFixed(2)}V
          </label>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.05"
            value={supplyVoltage}
            onChange={(e) => setSupplyVoltage(parseFloat(e.target.value))}
            style={{ width: '100%', height: '20px', touchAction: 'pan-y' as const, WebkitAppearance: 'none' as const, accentColor: '#3b82f6' }}
          />
        </div>

        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Transistor Count: {transistorCount}B
          </label>
          <input
            type="range"
            min="0.1"
            max="50"
            step="0.1"
            value={transistorCount}
            onChange={(e) => setTransistorCount(parseFloat(e.target.value))}
            style={{ width: '100%', height: '20px', touchAction: 'pan-y' as const, WebkitAppearance: 'none' as const, accentColor: '#3b82f6' }}
          />
        </div>

        <div style={{
          background: output.isLeakageDominant ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
          padding: '12px',
          borderRadius: '8px',
          borderLeft: `3px solid ${output.isLeakageDominant ? colors.error : colors.success}`,
        }}>
          <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
            {output.isLeakageDominant ? 'Warning: Leakage Exceeds Dynamic Power!' : 'Dynamic Power Dominant'}
          </div>
          <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
            Gate: {output.gateLeakage.toFixed(2)}W | Subthreshold: {output.subthresholdLeakage.toFixed(2)}W
          </div>
        </div>
      </div>
    );
  };

  // Progress bar component
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div
        role="navigation"
        aria-label="Phase navigation"
        data-testid="progress-bar"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '10px 12px' : '12px 16px',
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: colors.bgCard,
          gap: isMobile ? '12px' : '16px'
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
          <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px' }} role="tablist" aria-label="Progress dots">
            {phaseOrder.map((p, i) => (
              <button
                key={p}
                role="tab"
                aria-label={phaseLabels[p]}
                aria-selected={i === currentIdx}
                onClick={() => i < currentIdx && goToPhase(p)}
                style={{
                  height: isMobile ? '10px' : '8px',
                  width: i === currentIdx ? (isMobile ? '20px' : '24px') : (isMobile ? '10px' : '8px'),
                  borderRadius: '5px',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(148,163,184,0.7)',
                  cursor: i < currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                  minWidth: isMobile ? '10px' : '8px',
                  minHeight: isMobile ? '10px' : '8px',
                  border: 'none',
                  padding: 0,
                  outline: 'none'
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
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
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
            minHeight: '44px',
            transition: 'all 0.2s ease'
          }}
        >
          Back
        </button>

        <span style={{
          fontSize: '12px',
          color: colors.textSecondary,
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
            background: canGoNext ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.warning} 100%)` : colors.bgCardLight,
            color: canGoNext ? colors.textPrimary : colors.textSecondary,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            boxShadow: canGoNext ? `0 2px 12px ${colors.accent}30` : 'none',
            minHeight: '44px',
            transition: 'all 0.2s ease'
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  // Render wrapper with progress bar
  const renderPhaseContent = (content: React.ReactNode, bottomBar: React.ReactNode) => (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '80px' }}>
        {content}
      </div>
      {bottomBar}
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
              Leakage Current in Nanoscale
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', fontWeight: 400, marginBottom: '24px' }}>
              Why do chips use power even when doing nothing?
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 400, lineHeight: 1.6 }}>
                Your phone has billions of transistors, each supposed to be either fully ON or fully OFF.
                But at nanometer scales, quantum effects mean transistors are never truly OFF - they
                constantly leak current like a dripping faucet!
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 400 }}>
                Try changing the process node size and watch what happens to leakage power!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Start Exploring')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{ padding: '16px' }}>
            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Question:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
                A modern processor has 10 billion transistors. When the chip is idle and
                all transistors are supposed to be OFF, how much current flows?
              </p>
            </div>

            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Your Prediction:
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, fontWeight: 700, marginBottom: '8px' }}>Explore Leakage Power</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
              The visualization displays how transistor leakage current depends on process node, temperature, and supply voltage.
              Adjust the sliders to see how each parameter affects gate and subthreshold leakage in real-time.
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


              {renderVisualization(true)}


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
            <h4 style={{ color: colors.accent, fontWeight: 700, marginBottom: '8px' }}>Key Physics Terms:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400, lineHeight: 1.8, paddingLeft: '20px', margin: '0 0 12px 0' }}>
              <li><strong style={{ color: colors.gate }}>Gate Leakage:</strong> Quantum tunneling of electrons through ultra-thin gate oxide (SiO₂). Follows I_gate ∝ exp(-t_ox) where t_ox is oxide thickness.</li>
              <li><strong style={{ color: colors.subthreshold }}>Subthreshold Leakage:</strong> Current that flows from source to drain even when gate voltage is below threshold. Follows I_sub ∝ exp(-Vth / nVt).</li>
              <li><strong style={{ color: colors.textPrimary }}>Threshold Voltage (Vth):</strong> The minimum gate voltage needed to create a conducting channel. Lower Vth → higher speed but exponentially more leakage.</li>
              <li><strong style={{ color: colors.dynamic }}>Dynamic Power:</strong> Power consumed during transistor switching. P_dyn = αCVdd²f where α is activity factor, C is capacitance, f is frequency.</li>
            </ul>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, fontWeight: 700, marginBottom: '8px' }}>Experiments to Try:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Go from 90nm to 7nm - watch leakage explode</li>
              <li>Increase temperature - see leakage double every 10C</li>
              <li>Lower voltage - see both powers decrease</li>
              <li>Find where leakage exceeds dynamic power</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.15)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.dynamic}`,
          }}>
            <h4 style={{ color: colors.dynamic, fontWeight: 700, marginBottom: '8px' }}>Real-World Relevance:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400, lineHeight: 1.6 }}>
              Understanding leakage current is critical for designing smartphones, laptops, and data centers.
              Every modern device must balance performance against the invisible power drain that occurs even
              when transistors are supposed to be off. This is why your phone battery drains overnight!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // Helper function to render review diagram
  const renderReviewDiagram = () => {
    const width = 400;
    const height = 200;
    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ borderRadius: '12px', maxWidth: '450px' }}
      >
        <defs>
          <linearGradient id="reviewBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="gateBar" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="subBar" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>
        <rect width={width} height={height} fill="url(#reviewBg)" rx={12} />
        <text x={width/2} y={25} fill="#e2e8f0" fontSize={14} fontWeight="bold" textAnchor="middle">Leakage Types Comparison</text>
        <rect x={80} y={50} width={60} height={100} fill="url(#gateBar)" rx={4} />
        <text x={110} y={170} fill="#a855f7" fontSize={11} textAnchor="middle" fontWeight="bold">Gate</text>
        <text x={110} y={185} fill="#e2e8f0" fontSize={11} textAnchor="middle">Tunneling</text>
        <rect x={180} y={70} width={60} height={80} fill="url(#subBar)" rx={4} />
        <text x={210} y={170} fill="#fb923c" fontSize={11} textAnchor="middle" fontWeight="bold">Subthreshold</text>
        <text x={210} y={185} fill="#e2e8f0" fontSize={11} textAnchor="middle">Thermal</text>
        <rect x={280} y={40} width={60} height={110} fill="#ef4444" rx={4} />
        <text x={310} y={170} fill="#ef4444" fontSize={11} textAnchor="middle" fontWeight="bold">Total</text>
        <text x={310} y={185} fill="#e2e8f0" fontSize={11} textAnchor="middle">Leakage</text>
      </svg>
    );
  };

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'significant';
    const predictionLabel = predictions.find(p => p.id === prediction)?.label || 'No prediction made';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, fontWeight: 700, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Surprising Result!'}
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400, marginBottom: '8px' }}>
              You predicted: &quot;{predictionLabel}&quot;
            </p>
            <p style={{ color: colors.textPrimary, fontWeight: 400 }}>
              Leakage power is a major concern in modern chips! At advanced nodes, it can
              consume 30-50% of total power even when the chip is nearly idle.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '16px' }}>
            {renderReviewDiagram()}
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, fontWeight: 700, marginBottom: '12px' }}>Two Types of Leakage</h3>
            <div style={{ background: 'rgba(245,158,11,0.1)', padding: '12px', borderRadius: '8px', marginBottom: '12px', borderLeft: `3px solid ${colors.accent}` }}>
              <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 700, margin: '0 0 4px 0' }}>Key Formulas:</p>
              <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 400, fontFamily: 'monospace', margin: '0 0 4px 0' }}>I_gate ∝ exp(-2·t_ox·√(2m·φ_B)/ħ)</p>
              <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 400, fontFamily: 'monospace', margin: '0 0 4px 0' }}>I_sub ∝ exp(-Vth / nVt)  where Vt = kT/q</p>
              <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 400, fontFamily: 'monospace', margin: 0 }}>I_leak doubles for every 10°C rise in temperature</p>
            </div>
            <div style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400, lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.gate, fontWeight: 700 }}>Gate Leakage:</strong> Electrons quantum tunnel
                through the ultra-thin gate oxide. At 5nm, the oxide is only ~1nm thick - a few atoms!
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.subthreshold, fontWeight: 700 }}>Subthreshold Leakage:</strong> Even when
                gate voltage is below threshold, some electrons have enough thermal energy to flow
                from source to drain.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Temperature Effect:</strong> Subthreshold
                leakage roughly doubles for every 10C increase because more electrons have enough
                thermal energy to cross the barrier.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Scaling Challenge:</strong> As transistors
                shrink, oxide gets thinner (more tunneling) and threshold voltage must decrease
                (more subthreshold leakage) - a double penalty!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist: The Crossover Point</h2>
            <p style={{ color: colors.textSecondary }}>
              Which power component dominates at small nodes?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Challenge:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Dynamic power (switching) has long been the dominant power component in chips.
              But as we scale to smaller nodes, something surprising happens...
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              At advanced process nodes (7nm and below), which dominates?
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Find the Crossover</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              At what node does leakage become dominant?
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


              {renderVisualization(true)}


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
              Try reducing process node while keeping other parameters fixed.
              Watch the leakage percentage climb. At some point, leakage exceeds
              dynamic power - this is the design crisis that drove innovations like
              FinFETs and High-K dielectrics!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // Helper function to render twist review diagram
  const renderTwistReviewDiagram = () => {
    const width = 400;
    const height = 200;
    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ borderRadius: '12px', maxWidth: '450px' }}
      >
        <defs>
          <linearGradient id="twistBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>
        <rect width={width} height={height} fill="url(#twistBg)" rx={12} />
        <text x={width/2} y={25} fill="#e2e8f0" fontSize={14} fontWeight="bold" textAnchor="middle">Power Crossover Point</text>
        <line x1={50} y1={40} x2={50} y2={160} stroke="#475569" strokeWidth={2} />
        <line x1={50} y1={160} x2={370} y2={160} stroke="#475569" strokeWidth={2} />
        <text x={210} y={185} fill="#e2e8f0" fontSize={11} textAnchor="middle">Process Node (nm)</text>
        <text x={25} y={100} fill="#e2e8f0" fontSize={11} textAnchor="middle" transform="rotate(-90, 25, 100)">Power</text>
        <path d="M 70 140 Q 150 130, 200 100 Q 250 70, 350 50" stroke="#3b82f6" strokeWidth={3} fill="none" />
        <text x={360} y={55} fill="#3b82f6" fontSize={11}>Dynamic</text>
        <path d="M 70 155 Q 150 150, 200 120 Q 250 80, 350 45" stroke="#ef4444" strokeWidth={3} fill="none" />
        <text x={360} y={40} fill="#ef4444" fontSize={11}>Leakage</text>
        <circle cx={230} cy={95} r={8} fill="#f59e0b" opacity={0.8} />
        <text x={230} y={80} fill="#f59e0b" fontSize={11} textAnchor="middle" fontWeight="bold">Crossover</text>
        <text x={90} y={175} fill="#e2e8f0" fontSize={11}>90nm</text>
        <text x={160} y={175} fill="#e2e8f0" fontSize={11}>45nm</text>
        <text x={230} y={175} fill="#f59e0b" fontSize={11}>14nm</text>
        <text x={300} y={175} fill="#e2e8f0" fontSize={11}>5nm</text>
      </svg>
    );
  };

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'leakage_dominates';
    const twistPredLabel = twistPredictions.find(p => p.id === twistPrediction)?.label || 'No prediction made';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.warning}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.warning, fontWeight: 700, marginBottom: '8px' }}>
              {wasCorrect ? 'Exactly Right!' : 'The Surprising Truth!'}
            </h3>
            <p style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400, marginBottom: '8px' }}>
              You predicted: &quot;{twistPredLabel}&quot;
            </p>
            <p style={{ color: colors.textPrimary, fontWeight: 400 }}>
              At advanced nodes, leakage can indeed exceed dynamic power, especially at low activity
              levels. This is why modern chips aggressively power-gate unused blocks.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '16px' }}>
            {renderTwistReviewDiagram()}
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, fontWeight: 700, marginBottom: '12px' }}>Industry Response</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400, lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>High-K Metal Gates:</strong> Replace SiO2
                with hafnium oxide (HfO2) which has higher dielectric constant, allowing thicker oxide
                with same capacitance.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>FinFET (3D Transistors):</strong> Wrap the
                gate around the channel on 3 sides for better electrostatic control, enabling higher
                threshold voltage without performance penalty.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary, fontWeight: 700 }}>Power Gating:</strong> Completely shut off
                power to unused chip blocks. The transistors do not leak if they have no supply voltage!
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
    const allGotIt = transferGotIt.size >= transferApplications.length;

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, fontWeight: 700, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 400, textAlign: 'center', marginBottom: '16px' }}>
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
                border: transferGotIt.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700 }}>{app.title}</h3>
                {transferGotIt.has(index) && <span style={{ color: colors.success, fontWeight: 600 }}>Complete</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400, marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {transferGotIt.has(index) ? (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 400 }}>{app.answer}</p>
                </div>
              ) : (
                <div>
                  {transferCompleted.has(index) && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '12px' }}>
                      <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 400 }}>{app.answer}</p>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {!transferCompleted.has(index) && (
                      <button
                        onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                        style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px', minHeight: '44px', WebkitTapHighlightColor: 'transparent' }}
                      >
                        Reveal Answer
                      </button>
                    )}
                    <button
                      onClick={() => setTransferGotIt(new Set([...transferGotIt, index]))}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        background: colors.success,
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                        minHeight: '44px',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                    >
                      Got It
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(!allGotIt, allGotIt, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
            <div style={{
              background: testScore >= 7 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 7 ? colors.success : colors.error, fontWeight: 700, marginBottom: '8px' }}>
                {testScore >= 7 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, fontWeight: 400, marginTop: '8px' }}>
                {testScore >= 7 ? 'You understand nanoscale leakage!' : 'Review the material and try again.'}
              </p>
            </div>
            <div style={{ margin: '16px' }}>
              <h3 style={{ color: colors.textPrimary, fontWeight: 700, marginBottom: '12px' }}>Answer Review:</h3>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '18px' }}>{isCorrect ? '\u2713' : '\u2717'}</span>
                    <p style={{ color: colors.textPrimary, fontWeight: 'bold', margin: 0 }}>Question {qIndex + 1}: {q.question}</p>
                  </div>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary, fontWeight: 400, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {opt.correct && <span style={{ fontWeight: 700 }}>\u2713</span>}
                      {!opt.correct && userAnswer === oIndex && <span style={{ fontWeight: 700 }}>\u2717</span>}
                      {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 7, testScore >= 7 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary, fontWeight: 700 }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontWeight: 600 }}>Question {currentTestQuestion + 1} of {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textSecondary : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 400, lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px', fontWeight: 400, minHeight: '44px', WebkitTapHighlightColor: 'transparent' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textSecondary}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textSecondary : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer', minHeight: '44px', fontWeight: 400, WebkitTapHighlightColor: 'transparent' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer', minHeight: '44px', fontWeight: 600, WebkitTapHighlightColor: 'transparent' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textSecondary : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer', minHeight: '44px', fontWeight: 600, WebkitTapHighlightColor: 'transparent' }}>Submit Test</button>
            )}
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
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, fontWeight: 700, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, fontWeight: 400, marginBottom: '24px' }}>You have mastered nanoscale leakage current!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, fontWeight: 700, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, fontWeight: 400, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Gate leakage from quantum tunneling through thin oxide</li>
              <li>Subthreshold leakage from thermal carrier excitation</li>
              <li>Temperature dependence (doubling per 10C)</li>
              <li>High-K dielectrics and FinFET solutions</li>
              <li>Power gating for leakage management</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, fontWeight: 700, marginBottom: '12px' }}>Industry Frontier:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400, lineHeight: 1.6 }}>
              At 3nm and beyond, the industry is exploring GAA (Gate-All-Around) transistors and
              new channel materials like nanosheets. The battle against leakage continues to drive
              semiconductor innovation, with each generation requiring new physics solutions!
            </p>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete')}
      </div>
    );
  }

  return null;
};

export default LeakageCurrentRenderer;
