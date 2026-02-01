'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// Phase type for internal state management
type TTPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface ThermalThrottlingRendererProps {
  gamePhase?: string; // Optional for resume functionality
  onGameEvent?: (event: GameEvent) => void;
}

interface GameEvent {
  eventType: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgCardLight: '#1e293b',
  border: '#334155',
  accent: '#f59e0b',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  cool: '#3b82f6',
  hot: '#ef4444',
  chip: '#6366f1',
  primary: '#06b6d4',
};

const realWorldApps = [
  {
    icon: '🎮',
    title: 'Gaming Laptops',
    short: 'Balancing performance and thermal limits',
    tagline: 'When thin means hot',
    description: 'Gaming laptops pack 150W+ of processing power into thin chassis. Thermal throttling kicks in when cooling cannot keep up, dropping frame rates from 144fps to 30fps in demanding games.',
    connection: 'Power = C * V^2 * f means higher clock speeds generate exponentially more heat. Throttling reduces frequency to stay within thermal limits.',
    howItWorks: 'Temperature sensors trigger firmware to reduce clock speed and voltage when approaching 95-100C. Cooling systems use vapor chambers, multiple fans, and liquid metal thermal paste.',
    stats: [
      { value: '95C', label: 'Throttling threshold', icon: '🌡️' },
      { value: '50%', label: 'Perf drop when throttled', icon: '📉' },
      { value: '150W', label: 'Typical gaming load', icon: '⚡' }
    ],
    examples: ['ASUS ROG laptops', 'Razer Blade', 'MSI Stealth', 'Alienware m15'],
    companies: ['ASUS', 'MSI', 'Razer', 'Dell'],
    futureImpact: 'Gallium-based cooling and graphene heat spreaders will enable desktop-class performance in ultra-thin laptops.',
    color: '#8B5CF6'
  },
  {
    icon: '📱',
    title: 'Smartphone Throttling',
    short: 'Keeping phones from burning your hand',
    tagline: 'Performance in your pocket has limits',
    description: 'Phone processors throttle aggressively because there are no fans and the case temperature must stay comfortable. Extended gaming or video calls trigger throttling within minutes.',
    connection: 'Without active cooling, phones rely entirely on passive dissipation. Thermal mass buys time, but sustained loads always trigger throttling.',
    howItWorks: 'Multi-layer throttling reduces CPU cores, GPU frequency, and screen brightness. Thermal paste connects chips to graphite sheets that spread heat across the entire phone body.',
    stats: [
      { value: '45C', label: 'Case temp limit', icon: '🤚' },
      { value: '3W', label: 'Sustainable power', icon: '🔋' },
      { value: '8W', label: 'Peak burst power', icon: '⚡' }
    ],
    examples: ['iPhone Pro', 'Samsung Galaxy Ultra', 'Pixel Pro', 'OnePlus'],
    companies: ['Apple', 'Samsung', 'Google', 'Qualcomm'],
    futureImpact: 'Phase-change materials and AI-predictive throttling will extend peak performance windows.',
    color: '#3B82F6'
  },
  {
    icon: '🏢',
    title: 'Data Center Cooling',
    short: 'Preventing thermal runaway in server farms',
    tagline: 'Where heat costs millions',
    description: 'Data centers spend 40% of energy on cooling. Server throttling wastes compute capacity and revenue. Operators balance cooling costs against performance using sophisticated thermal management.',
    connection: 'At scale, every degree of temperature reduction saves millions in cooling costs but also affects server performance and longevity.',
    howItWorks: 'Hot/cold aisle containment, liquid cooling, and AI-controlled HVAC maintain optimal temperatures. Servers report thermal headroom to workload schedulers.',
    stats: [
      { value: '40%', label: 'Power for cooling', icon: '❄️' },
      { value: '$1M/yr', label: 'Cooling per MW of compute', icon: '💰' },
      { value: '25C', label: 'Optimal inlet temp', icon: '🌡️' }
    ],
    examples: ['Google data centers', 'AWS facilities', 'Microsoft Azure', 'Meta AI clusters'],
    companies: ['Google', 'Microsoft', 'Amazon', 'Equinix'],
    futureImpact: 'Immersion cooling in dielectric fluid will eliminate air cooling entirely, boosting efficiency 50%.',
    color: '#10B981'
  },
  {
    icon: '🚗',
    title: 'Electric Vehicle Power Electronics',
    short: 'Managing heat in high-power inverters',
    tagline: 'Where throttling means less range',
    description: 'EV inverters convert battery DC to motor AC at 200-400kW. Thermal limits cause power derating on track days or towing, reducing acceleration and top speed to protect components.',
    connection: 'Power electronics use the same thermal physics as CPUs - higher current means quadratically more heat from I^2*R losses.',
    howItWorks: 'Silicon carbide MOSFETs handle higher temperatures than silicon. Liquid cooling loops connect inverters, motors, and batteries. Derating algorithms protect components while maximizing performance.',
    stats: [
      { value: '150C', label: 'SiC junction limit', icon: '🔥' },
      { value: '400kW', label: 'Peak inverter power', icon: '⚡' },
      { value: '30%', label: 'Derating at thermal limit', icon: '📉' }
    ],
    examples: ['Tesla Model S Plaid', 'Porsche Taycan', 'Rivian R1T', 'Lucid Air'],
    companies: ['Tesla', 'Porsche', 'Rivian', 'BorgWarner'],
    futureImpact: 'Gallium nitride devices and integrated motor-inverter designs will push efficiency above 99%.',
    color: '#EF4444'
  }
];

const ThermalThrottlingRenderer: React.FC<ThermalThrottlingRendererProps> = ({
  gamePhase,
  onGameEvent,
}) => {
  // Phase order and labels for navigation
  const phaseOrder: TTPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<TTPhase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Cooling Effect',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  // Internal phase state management
  const getInitialPhase = (): TTPhase => {
    if (gamePhase && phaseOrder.includes(gamePhase as TTPhase)) {
      return gamePhase as TTPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<TTPhase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as TTPhase) && gamePhase !== phase) {
      setPhase(gamePhase as TTPhase);
    }
  }, [gamePhase]);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state
  const [clockSpeed, setClockSpeed] = useState(3.5);
  const [voltage, setVoltage] = useState(1.2);
  const [coolingPower, setCoolingPower] = useState(65);
  const [workload, setWorkload] = useState(50);
  const [temperature, setTemperature] = useState(40);
  const [isThrottling, setIsThrottling] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

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

  // Emit game events
  const emitGameEvent = useCallback((eventType: string, details: Record<string, unknown>) => {
    if (onGameEvent) {
      onGameEvent({
        eventType,
        gameType: 'thermal_throttling',
        gameTitle: 'Thermal Throttling',
        details,
        timestamp: Date.now()
      });
    }
  }, [onGameEvent]);

  // Navigation function
  const goToPhase = useCallback((p: TTPhase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);

    const idx = phaseOrder.indexOf(p);
    emitGameEvent('phase_changed', {
      phase: p,
      phaseLabel: phaseLabels[p],
      currentScreen: idx + 1,
      totalScreens: phaseOrder.length,
      message: `Navigated to ${phaseLabels[p]}`
    });

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [emitGameEvent, phaseLabels, phaseOrder]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Thermal constants
  const T_AMBIENT = 25;
  const T_THROTTLE = 95;
  const T_CRITICAL = 105;

  // Power dissipation calculation
  const calculatePower = useCallback(() => {
    const C = 1;
    const dynamicPower = C * Math.pow(voltage, 2) * clockSpeed * (workload / 100);
    const staticPower = 5 * (1 + (temperature - 25) * 0.02);
    return dynamicPower * 30 + staticPower;
  }, [voltage, clockSpeed, workload, temperature]);

  // Thermal simulation
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 1);

      const power = calculatePower();
      const thermalResistance = 1 / (coolingPower / 50);

      const targetTemp = T_AMBIENT + power * thermalResistance;
      setTemperature(prev => {
        const newTemp = prev + (targetTemp - prev) * 0.05;
        return Math.min(newTemp, T_CRITICAL);
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isSimulating, calculatePower, coolingPower]);

  // Throttling logic
  useEffect(() => {
    if (temperature >= T_THROTTLE) {
      setIsThrottling(true);
      setClockSpeed(prev => Math.max(prev * 0.95, 1.5));
      setVoltage(prev => Math.max(prev * 0.98, 0.8));
    } else if (temperature < T_THROTTLE - 10 && isThrottling) {
      setIsThrottling(false);
    }
  }, [temperature, isThrottling]);

  const power = calculatePower();

  const predictions = [
    { id: 'damage', label: 'The chip would be permanently damaged by overheating' },
    { id: 'throttle', label: 'The chip automatically slows down to reduce heat generation' },
    { id: 'shutdown', label: 'The phone immediately shuts off to protect itself' },
    { id: 'battery', label: 'The battery stops charging to cool down' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Cooling has no effect on maximum performance' },
    { id: 'better_cooling', label: 'Better cooling directly enables higher sustained performance' },
    { id: 'software', label: 'Performance is purely software limited, not thermal' },
    { id: 'random', label: 'Performance varies randomly regardless of cooling' },
  ];

  const transferApplications = [
    {
      title: 'Gaming Laptops',
      description: 'High-performance laptops use aggressive cooling with multiple fans and vapor chambers.',
      icon: 'Gamepad',
    },
    {
      title: 'Smartphones',
      description: 'Phones have no fans, only passive cooling. Sustained gaming causes throttling.',
      icon: 'Smartphone',
    },
    {
      title: 'Data Centers',
      description: 'Server farms use massive HVAC systems. Each degree of cooling saves millions.',
      icon: 'Server',
    },
    {
      title: 'Electric Vehicles',
      description: 'EV battery packs and motors are actively liquid cooled for performance.',
      icon: 'Car',
    },
  ];

  const testQuestions = [
    {
      question: 'What is thermal throttling?',
      options: [
        { text: 'Automatic reduction of processor speed to prevent overheating', correct: true },
        { text: 'Manual speed control by the user', correct: false },
        { text: 'A cooling fan speed adjustment', correct: false },
        { text: 'Battery power limiting', correct: false },
      ],
    },
    {
      question: 'What does DVFS stand for?',
      options: [
        { text: 'Direct Voltage Frequency Scaling', correct: false },
        { text: 'Dynamic Voltage and Frequency Scaling', correct: true },
        { text: 'Digital Variable Fan Speed', correct: false },
        { text: 'Dual Voltage Frequency System', correct: false },
      ],
    },
    {
      question: 'How does dynamic power consumption relate to voltage?',
      options: [
        { text: 'Power is proportional to voltage (P ~ V)', correct: false },
        { text: 'Power is proportional to voltage squared (P ~ V^2)', correct: true },
        { text: 'Power is inversely proportional to voltage', correct: false },
        { text: 'Power is independent of voltage', correct: false },
      ],
    },
    {
      question: 'What happens when junction temperature exceeds the throttle threshold?',
      options: [
        { text: 'Nothing, the chip continues normally', correct: false },
        { text: 'Clock speed and voltage are reduced to lower power dissipation', correct: true },
        { text: 'The chip immediately shuts down', correct: false },
        { text: 'Only the GPU is affected', correct: false },
      ],
    },
    {
      question: 'What is the typical throttle threshold for modern processors?',
      options: [
        { text: 'Around 50-60C', correct: false },
        { text: 'Around 70-80C', correct: false },
        { text: 'Around 90-100C', correct: true },
        { text: 'Around 120-130C', correct: false },
      ],
    },
    {
      question: 'Why does better cooling enable higher performance?',
      options: [
        { text: 'It allows higher sustained clock speeds without hitting thermal limits', correct: true },
        { text: 'It makes the electrons flow faster', correct: false },
        { text: 'It reduces electrical resistance to zero', correct: false },
        { text: 'It increases the battery capacity', correct: false },
      ],
    },
    {
      question: 'What is thermal runaway in the context of processors?',
      options: [
        { text: 'When heat causes increased power which causes more heat', correct: true },
        { text: 'When the cooling fan runs too fast', correct: false },
        { text: 'When the CPU runs faster than rated', correct: false },
        { text: 'When the thermal paste dries out', correct: false },
      ],
    },
    {
      question: 'Why do smartphones throttle more than desktop computers?',
      options: [
        { text: 'They have weaker processors', correct: false },
        { text: 'They rely on passive cooling with no fans', correct: true },
        { text: 'They use different operating systems', correct: false },
        { text: 'They have smaller batteries', correct: false },
      ],
    },
    {
      question: 'What is TDP (Thermal Design Power)?',
      options: [
        { text: 'The amount of heat the cooling system must dissipate', correct: true },
        { text: 'The total battery consumption', correct: false },
        { text: 'The display power usage', correct: false },
        { text: 'The network transmission power', correct: false },
      ],
    },
    {
      question: 'How does workload affect processor temperature?',
      options: [
        { text: 'No effect - temperature is constant', correct: false },
        { text: 'Higher workload means more switching activity and heat', correct: true },
        { text: 'Lower workload increases temperature', correct: false },
        { text: 'Only GPU workload affects temperature', correct: false },
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
  };

  const resetSimulation = () => {
    setTemperature(40);
    setClockSpeed(3.5);
    setVoltage(1.2);
    setIsThrottling(false);
    setIsSimulating(false);
    setAnimationTime(0);
  };

  // Progress bar renderer
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '10px 12px' : '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: isMobile ? '8px' : '16px'
      }}>
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            backgroundColor: currentIdx > 0 ? colors.bgCardLight : 'transparent',
            color: currentIdx > 0 ? colors.textSecondary : colors.textMuted,
            cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
            opacity: currentIdx > 0 ? 1 : 0.4,
            fontSize: '14px',
            fontWeight: 600
          }}
        >
          Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' }}>
          {phaseOrder.map((p, i) => (
            <div
              key={p}
              onClick={() => i <= currentIdx && goToPhase(p)}
              style={{
                width: i === currentIdx ? '20px' : '10px',
                height: '10px',
                borderRadius: '5px',
                backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.primary : colors.border,
                cursor: i <= currentIdx ? 'pointer' : 'default',
                transition: 'all 0.2s'
              }}
              title={phaseLabels[p]}
            />
          ))}
        </div>

        <div style={{
          padding: '4px 12px',
          borderRadius: '12px',
          background: `${colors.primary}20`,
          color: colors.primary,
          fontSize: '11px',
          fontWeight: 700
        }}>
          {currentIdx + 1}/{phaseOrder.length}
        </div>
      </div>
    );
  };

  // Bottom bar renderer
  const renderBottomBar = (canGoNext: boolean, nextLabel: string) => {
    const currentIdx = phaseOrder.indexOf(phase);

    const handleNext = () => {
      if (!canGoNext) return;
      if (currentIdx < phaseOrder.length - 1) {
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
        gap: '12px'
      }}>
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          style={{
            padding: isMobile ? '10px 16px' : '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: isMobile ? '13px' : '14px',
            backgroundColor: colors.bgCardLight,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
            opacity: currentIdx > 0 ? 1 : 0.3,
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
          disabled={!canGoNext}
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: isMobile ? '13px' : '14px',
            background: canGoNext ? `linear-gradient(135deg, ${colors.accent} 0%, #d97706 100%)` : colors.bgCardLight,
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

  const renderVisualization = (showCoolingEffect: boolean = false) => {
    const width = 700;
    const height = 400;

    const tempRatio = Math.min((temperature - T_AMBIENT) / (T_CRITICAL - T_AMBIENT), 1);
    const performanceRatio = clockSpeed / 4.5;

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        style={{ maxHeight: '100%' }}
      >
        <defs>
          {/* === PREMIUM GRADIENT DEFINITIONS === */}

          {/* Lab background gradient with depth */}
          <linearGradient id="ththLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="25%" stopColor="#0a0f1a" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="75%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* CPU die gradient - thermal responsive with 6 color stops */}
          <linearGradient id="ththCpuDie" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={temperature > 85 ? "#dc2626" : temperature > 70 ? "#f59e0b" : "#6366f1"} />
            <stop offset="20%" stopColor={temperature > 85 ? "#ef4444" : temperature > 70 ? "#fbbf24" : "#818cf8"} />
            <stop offset="40%" stopColor={temperature > 85 ? "#f87171" : temperature > 70 ? "#fcd34d" : "#a5b4fc"} />
            <stop offset="60%" stopColor={temperature > 85 ? "#ef4444" : temperature > 70 ? "#fbbf24" : "#818cf8"} />
            <stop offset="80%" stopColor={temperature > 85 ? "#dc2626" : temperature > 70 ? "#f59e0b" : "#6366f1"} />
            <stop offset="100%" stopColor={temperature > 85 ? "#b91c1c" : temperature > 70 ? "#d97706" : "#4f46e5"} />
          </linearGradient>

          {/* Heatsink brushed metal gradient */}
          <linearGradient id="ththHeatsinkMetal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4b5563" />
            <stop offset="15%" stopColor="#6b7280" />
            <stop offset="30%" stopColor="#4b5563" />
            <stop offset="50%" stopColor="#6b7280" />
            <stop offset="70%" stopColor="#4b5563" />
            <stop offset="85%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#4b5563" />
          </linearGradient>

          {/* PCB substrate gradient */}
          <linearGradient id="ththPcbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14532d" />
            <stop offset="25%" stopColor="#166534" />
            <stop offset="50%" stopColor="#15803d" />
            <stop offset="75%" stopColor="#166534" />
            <stop offset="100%" stopColor="#14532d" />
          </linearGradient>

          {/* Temperature bar gradient - cool to hot */}
          <linearGradient id="ththTempGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="25%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="75%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>

          {/* Performance bar gradient */}
          <linearGradient id="ththPerfGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>

          {/* Throttled performance gradient */}
          <linearGradient id="ththThrottleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>

          {/* Cooling flow gradient */}
          <linearGradient id="ththCoolFlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0.2" />
          </linearGradient>

          {/* === RADIAL GRADIENTS FOR HEAT EFFECTS === */}

          {/* CPU core heat glow */}
          <radialGradient id="ththCoreHeat" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={temperature > 85 ? "#fca5a5" : temperature > 70 ? "#fde68a" : "#c7d2fe"} stopOpacity="1" />
            <stop offset="40%" stopColor={temperature > 85 ? "#ef4444" : temperature > 70 ? "#fbbf24" : "#818cf8"} stopOpacity="0.7" />
            <stop offset="70%" stopColor={temperature > 85 ? "#dc2626" : temperature > 70 ? "#f59e0b" : "#6366f1"} stopOpacity="0.4" />
            <stop offset="100%" stopColor={temperature > 85 ? "#991b1b" : temperature > 70 ? "#b45309" : "#4338ca"} stopOpacity="0" />
          </radialGradient>

          {/* Status indicator glow */}
          <radialGradient id="ththStatusGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isThrottling ? "#fca5a5" : "#86efac"} stopOpacity="1" />
            <stop offset="60%" stopColor={isThrottling ? "#ef4444" : "#22c55e"} stopOpacity="0.5" />
            <stop offset="100%" stopColor={isThrottling ? "#dc2626" : "#16a34a"} stopOpacity="0" />
          </radialGradient>

          {/* Thermal paste layer */}
          <radialGradient id="ththThermalPaste" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#9ca3af" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#6b7280" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#4b5563" stopOpacity="0.5" />
          </radialGradient>

          {/* === GLOW FILTERS === */}

          {/* Heat glow filter */}
          <filter id="ththHeatGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Intense heat glow for throttling */}
          <filter id="ththIntenseGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Subtle glow for indicators */}
          <filter id="ththSubtleGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Text shadow filter */}
          <filter id="ththTextShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Fan animation blur */}
          <filter id="ththFanBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>

        {/* === PREMIUM BACKGROUND === */}
        <rect width={width} height={height} fill="url(#ththLabBg)" />

        {/* Subtle grid pattern */}
        <pattern id="ththGrid" width="30" height="30" patternUnits="userSpaceOnUse">
          <rect width="30" height="30" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
        </pattern>
        <rect width={width} height={height} fill="url(#ththGrid)" />

        {/* === TITLE SECTION === */}
        <text x={width / 2} y="28" textAnchor="middle" fill="#f8fafc" fontSize="16" fontWeight="bold" filter="url(#ththTextShadow)">
          Processor Thermal Management Simulation
        </text>
        <text x={width / 2} y="46" textAnchor="middle" fill="#94a3b8" fontSize="10">
          Dynamic Voltage and Frequency Scaling (DVFS)
        </text>

        {/* === MAIN PROCESSOR ASSEMBLY === */}
        <g transform="translate(120, 70)">

          {/* Heatsink base plate */}
          <rect x="20" y="-5" width="260" height="15" rx="3" fill="url(#ththHeatsinkMetal)" stroke="#374151" strokeWidth="1" />

          {/* Heatsink fins */}
          {Array.from({ length: 14 }, (_, i) => (
            <g key={i}>
              <rect
                x={30 + i * 18}
                y="-55"
                width="6"
                height="50"
                fill="url(#ththHeatsinkMetal)"
                stroke="#4b5563"
                strokeWidth="0.5"
              />
              {/* Fin highlight */}
              <rect x={31 + i * 18} y="-53" width="1.5" height="46" fill="#9ca3af" opacity="0.3" />
            </g>
          ))}

          {/* Heatsink top cover */}
          <rect x="25" y="-60" width="250" height="8" rx="2" fill="#374151" stroke="#4b5563" strokeWidth="1" />
          <text x="150" y="-67" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">HEATSINK</text>

          {/* Cooling airflow indicators */}
          {showCoolingEffect && (
            <g opacity={coolingPower / 150}>
              {Array.from({ length: 8 }, (_, i) => {
                const yOffset = ((animationTime * 3 + i * 8) % 50);
                return (
                  <path
                    key={i}
                    d={`M ${35 + i * 30} ${-55 + yOffset} L ${40 + i * 30} ${-45 + yOffset} L ${35 + i * 30} ${-35 + yOffset}`}
                    fill="none"
                    stroke="url(#ththCoolFlow)"
                    strokeWidth="2"
                    opacity={0.6 - yOffset / 100}
                  />
                );
              })}
            </g>
          )}

          {/* Thermal paste layer */}
          <rect x="60" y="12" width="180" height="4" rx="1" fill="url(#ththThermalPaste)" />

          {/* CPU IHS (Integrated Heat Spreader) */}
          <rect x="50" y="18" width="200" height="25" rx="3" fill="#71717a" stroke="#52525b" strokeWidth="1" />
          <rect x="55" y="20" width="190" height="21" rx="2" fill="#a1a1aa" opacity="0.3" />
          <text x="150" y="35" textAnchor="middle" fill="#27272a" fontSize="8" fontWeight="bold">INTEGRATED HEAT SPREADER</text>

          {/* CPU DIE - THE MAIN HEAT SOURCE */}
          <rect
            x="80"
            y="48"
            width="140"
            height="90"
            rx="4"
            fill="url(#ththCpuDie)"
            stroke={temperature > T_THROTTLE ? "#ef4444" : "#4b5563"}
            strokeWidth="2"
            filter={temperature > T_THROTTLE ? "url(#ththIntenseGlow)" : temperature > 70 ? "url(#ththHeatGlow)" : undefined}
          />

          {/* CPU cores visualization - 8 core layout */}
          <g transform="translate(85, 53)">
            {Array.from({ length: 8 }, (_, i) => {
              const row = Math.floor(i / 4);
              const col = i % 4;
              return (
                <g key={i}>
                  <rect
                    x={col * 32 + 2}
                    y={row * 38 + 2}
                    width="28"
                    height="34"
                    rx="2"
                    fill="url(#ththCoreHeat)"
                    opacity={0.7 + tempRatio * 0.3}
                  />
                  <text
                    x={col * 32 + 16}
                    y={row * 38 + 24}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.9)"
                    fontSize="7"
                    fontWeight="bold"
                  >
                    C{i}
                  </text>
                </g>
              );
            })}
          </g>

          {/* CPU Label */}
          <text x="150" y="155" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold">
            CPU: {clockSpeed.toFixed(2)} GHz @ {voltage.toFixed(2)}V
          </text>
          <text x="150" y="170" textAnchor="middle" fill="#94a3b8" fontSize="10">
            Power Draw: {power.toFixed(0)}W
          </text>

          {/* Heat waves animation when hot */}
          {isSimulating && temperature > 60 && (
            <g>
              {Array.from({ length: 7 }, (_, i) => {
                const offset = ((animationTime * 2.5 + i * 12) % 40);
                const opacity = Math.max(0, 1 - offset / 40) * Math.min((temperature - 60) / 35, 1);
                return (
                  <path
                    key={i}
                    d={`M ${90 + i * 20} ${45 - offset}
                        Q ${95 + i * 20} ${35 - offset} ${100 + i * 20} ${45 - offset}
                        Q ${105 + i * 20} ${55 - offset} ${110 + i * 20} ${45 - offset}`}
                    fill="none"
                    stroke={temperature > T_THROTTLE ? "#ef4444" : "#f59e0b"}
                    strokeWidth="2.5"
                    opacity={opacity * 0.6}
                    filter="url(#ththSubtleGlow)"
                  />
                );
              })}
            </g>
          )}

          {/* PCB (Motherboard) */}
          <rect x="10" y="145" width="280" height="35" rx="3" fill="url(#ththPcbGrad)" stroke="#15803d" strokeWidth="1" />

          {/* PCB traces */}
          {Array.from({ length: 12 }, (_, i) => (
            <line
              key={i}
              x1={20 + i * 22}
              y1="150"
              x2={20 + i * 22}
              y2="175"
              stroke="#22c55e"
              strokeWidth="1"
              opacity="0.4"
            />
          ))}

          {/* PCB components */}
          {Array.from({ length: 6 }, (_, i) => (
            <rect key={i} x={25 + i * 45} y="155" width="15" height="8" rx="1" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
          ))}

          <text x="150" y="190" textAnchor="middle" fill="#86efac" fontSize="8" fontWeight="bold">MOTHERBOARD PCB</text>
        </g>

        {/* === TEMPERATURE GAUGE === */}
        <g transform="translate(520, 70)">
          <rect x="0" y="0" width="80" height="200" rx="8" fill="#111827" stroke="#1f2937" strokeWidth="1" />
          <text x="40" y="20" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">TEMPERATURE</text>

          {/* Thermometer tube */}
          <rect x="25" y="35" width="30" height="130" rx="4" fill="#1f2937" stroke="#374151" strokeWidth="1" />

          {/* Temperature fill */}
          <rect
            x="27"
            y={35 + 126 * (1 - tempRatio)}
            width="26"
            height={126 * tempRatio}
            rx="3"
            fill="url(#ththTempGrad)"
            filter={temperature > T_THROTTLE ? "url(#ththSubtleGlow)" : undefined}
          />

          {/* Temperature scale markers */}
          {[25, 50, 70, 95, 105].map((temp, i) => {
            const yPos = 35 + 126 * (1 - (temp - T_AMBIENT) / (T_CRITICAL - T_AMBIENT));
            return (
              <g key={temp}>
                <line x1="20" y1={yPos} x2="60" y2={yPos} stroke="#4b5563" strokeWidth="0.5" strokeDasharray="2,2" />
                <text x="65" y={yPos + 3} fill={temp === 95 ? "#f59e0b" : temp === 105 ? "#ef4444" : "#94a3b8"} fontSize="7">
                  {temp}°C
                </text>
              </g>
            );
          })}

          {/* Throttle threshold indicator */}
          <line
            x1="20"
            y1={35 + 126 * (1 - (T_THROTTLE - T_AMBIENT) / (T_CRITICAL - T_AMBIENT))}
            x2="60"
            y2={35 + 126 * (1 - (T_THROTTLE - T_AMBIENT) / (T_CRITICAL - T_AMBIENT))}
            stroke="#f59e0b"
            strokeWidth="2"
          />
          <text x="40" y={28 + 126 * (1 - (T_THROTTLE - T_AMBIENT) / (T_CRITICAL - T_AMBIENT))} textAnchor="middle" fill="#f59e0b" fontSize="7" fontWeight="bold">
            THROTTLE
          </text>

          {/* Current temperature display */}
          <rect x="10" y="170" width="60" height="25" rx="4" fill={temperature > T_THROTTLE ? "#7f1d1d" : temperature > 70 ? "#78350f" : "#1e3a5f"} />
          <text x="40" y="188" textAnchor="middle" fill="#f8fafc" fontSize="14" fontWeight="bold" filter="url(#ththSubtleGlow)">
            {temperature.toFixed(0)}°C
          </text>
        </g>

        {/* === THROTTLING STATUS PANEL === */}
        <g transform="translate(520, 280)">
          <rect x="0" y="0" width="160" height="70" rx="8" fill="#111827" stroke={isThrottling ? "#ef4444" : "#1f2937"} strokeWidth={isThrottling ? 2 : 1} />

          {/* Status indicator light */}
          <circle
            cx="25"
            cy="25"
            r="10"
            fill="url(#ththStatusGlow)"
            filter="url(#ththSubtleGlow)"
          >
            {isThrottling && (
              <animate attributeName="opacity" values="0.5;1;0.5" dur="0.5s" repeatCount="indefinite" />
            )}
          </circle>

          <text x="45" y="18" fill="#94a3b8" fontSize="9">DVFS STATUS</text>
          <text x="45" y="33" fill={isThrottling ? "#ef4444" : "#22c55e"} fontSize="13" fontWeight="bold">
            {isThrottling ? "THROTTLING" : "NORMAL"}
          </text>

          <text x="10" y="52" fill="#94a3b8" fontSize="8">
            {isThrottling ? "Reducing power to prevent damage" : "Operating within thermal limits"}
          </text>
          <text x="10" y="64" fill="#64748b" fontSize="7">
            Target: &lt;95°C | Current: {temperature.toFixed(0)}°C
          </text>
        </g>

        {/* === PERFORMANCE METER === */}
        <g transform="translate(120, 295)">
          <rect x="0" y="0" width="380" height="85" rx="8" fill="#111827" stroke="#1f2937" strokeWidth="1" />

          <text x="15" y="20" fill="#f8fafc" fontSize="11" fontWeight="bold">PERFORMANCE vs THERMAL</text>

          {/* Performance bar background */}
          <rect x="15" y="35" width="280" height="20" rx="4" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />

          {/* Performance bar fill */}
          <rect
            x="15"
            y="35"
            width={280 * performanceRatio}
            height="20"
            rx="4"
            fill={isThrottling ? "url(#ththThrottleGrad)" : "url(#ththPerfGrad)"}
            filter="url(#ththSubtleGlow)"
          />

          {/* Performance percentage */}
          <text x="310" y="50" fill="#f8fafc" fontSize="14" fontWeight="bold">
            {(performanceRatio * 100).toFixed(0)}%
          </text>
          <text x="350" y="50" fill="#94a3b8" fontSize="10">perf</text>

          {/* Performance labels */}
          <text x="15" y="70" fill="#64748b" fontSize="8">0%</text>
          <text x="145" y="70" fill="#64748b" fontSize="8" textAnchor="middle">50%</text>
          <text x="275" y="70" fill="#64748b" fontSize="8" textAnchor="end">100%</text>

          {/* Formula reminder */}
          <text x="305" y="70" fill="#06b6d4" fontSize="8" fontWeight="bold">P = CV²f</text>
        </g>

        {/* === COOLING PANEL (when enabled) === */}
        {showCoolingEffect && (
          <g transform="translate(20, 70)">
            <rect x="0" y="0" width="90" height="120" rx="8" fill="#0c4a6e" stroke="#0369a1" strokeWidth="1" />
            <text x="45" y="18" textAnchor="middle" fill="#7dd3fc" fontSize="10" fontWeight="bold">COOLING</text>

            {/* Fan visualization */}
            <g transform="translate(45, 55)">
              <circle cx="0" cy="0" r="25" fill="#1e3a5f" stroke="#0ea5e9" strokeWidth="1" />
              <g style={{ transformOrigin: '45px 55px' }} filter="url(#ththFanBlur)">
                {Array.from({ length: 5 }, (_, i) => (
                  <path
                    key={i}
                    d={`M 0 -5 Q 10 -20 0 -22 Q -10 -20 0 -5`}
                    fill="#22d3ee"
                    opacity="0.7"
                    transform={`rotate(${(animationTime * coolingPower / 10) + i * 72})`}
                  />
                ))}
              </g>
              <circle cx="0" cy="0" r="6" fill="#0c4a6e" stroke="#22d3ee" strokeWidth="1" />
            </g>

            <text x="45" y="95" textAnchor="middle" fill="#f8fafc" fontSize="16" fontWeight="bold">
              {coolingPower}W
            </text>
            <text x="45" y="110" textAnchor="middle" fill="#7dd3fc" fontSize="8">TDP Capacity</text>
          </g>
        )}

        {/* === LIVE DATA READOUTS === */}
        <g transform="translate(20, 295)">
          <rect x="0" y="0" width="90" height="85" rx="8" fill="#111827" stroke="#1f2937" strokeWidth="1" />
          <text x="45" y="16" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold">CLOCK</text>
          <text x="45" y="38" textAnchor="middle" fill="#06b6d4" fontSize="16" fontWeight="bold">
            {clockSpeed.toFixed(2)}
          </text>
          <text x="45" y="52" textAnchor="middle" fill="#64748b" fontSize="9">GHz</text>

          <line x1="10" y1="58" x2="80" y2="58" stroke="#1f2937" strokeWidth="1" />

          <text x="45" y="72" textAnchor="middle" fill="#a855f7" fontSize="12" fontWeight="bold">
            {voltage.toFixed(2)}V
          </text>
          <text x="45" y="82" textAnchor="middle" fill="#64748b" fontSize="8">Voltage</text>
        </g>
      </svg>
    );
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    WebkitTapHighlightColor: 'transparent',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: `linear-gradient(135deg, ${colors.accent}, #d97706)`,
    color: 'white',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'rgba(51, 65, 85, 0.8)',
    color: colors.textPrimary,
    border: `1px solid ${colors.accent}`,
  };

  // Render content based on phase
  const renderContent = () => {
    switch (phase) {
      case 'hook':
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>Fire</div>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '16px' }}>
              Why Does Your Phone Slow Down When Hot?
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '16px', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
              Ever noticed your phone getting sluggish during a long gaming session or on a hot summer day? There's a clever reason for that...
            </p>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Hidden Guardian</h3>
              <p style={{ color: colors.textMuted, fontSize: '14px' }}>
                Every processor has a built-in protector that prevents self-destruction. When things get too hot, it makes a calculated sacrifice...
              </p>
            </div>
            {renderVisualization()}
          </div>
        );

      case 'predict':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
              Make Your Prediction
            </h2>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ color: colors.textSecondary, textAlign: 'center' }}>
                When a processor approaches dangerous temperatures, what happens?
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    ...secondaryButtonStyle,
                    background: prediction === p.id
                      ? (p.id === 'throttle' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                      : 'rgba(51, 65, 85, 0.5)',
                    borderColor: prediction === p.id ? (p.id === 'throttle' ? colors.success : colors.error) : 'transparent',
                    textAlign: 'left',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {prediction && (
              <div style={{ marginTop: '20px', padding: '16px', background: prediction === 'throttle' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)', borderRadius: '12px' }}>
                <p style={{ color: prediction === 'throttle' ? colors.success : colors.warning }}>
                  {prediction === 'throttle'
                    ? 'Correct! Thermal throttling reduces clock speed to lower power and heat - trading performance for survival.'
                    : 'Not quite. While shutdown is a last resort, the first response is throttling - automatically slowing down to reduce heat.'}
                </p>
              </div>
            )}
          </div>
        );

      case 'play':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
              Thermal Throttling Simulator
            </h2>
            <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '16px', fontSize: '14px' }}>
              Increase workload and watch the CPU respond to heat
            </p>

            {renderVisualization()}

            <div style={{ marginTop: '20px' }}>
              <label style={{ color: colors.textSecondary, fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                Workload: {workload}%
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={workload}
                onChange={(e) => setWorkload(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setIsSimulating(!isSimulating)}
                style={isSimulating ? secondaryButtonStyle : primaryButtonStyle}
              >
                {isSimulating ? 'Pause' : 'Start Simulation'}
              </button>
              <button onClick={resetSimulation} style={secondaryButtonStyle}>
                Reset
              </button>
            </div>

            <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>Clock</div>
                <div style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 'bold' }}>
                  {clockSpeed.toFixed(2)} GHz
                </div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>Power</div>
                <div style={{ color: colors.warning, fontSize: '18px', fontWeight: 'bold' }}>
                  {power.toFixed(0)}W
                </div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>Temp</div>
                <div style={{ color: temperature > T_THROTTLE ? colors.error : colors.success, fontSize: '18px', fontWeight: 'bold' }}>
                  {temperature.toFixed(0)}C
                </div>
              </div>
            </div>

            {isThrottling && (
              <div style={{ marginTop: '16px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <p style={{ color: colors.error, margin: 0 }}>
                  DVFS Active: Reducing clock and voltage to prevent overheating
                </p>
              </div>
            )}
          </div>
        );

      case 'review':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
              Understanding Thermal Throttling
            </h2>

            <div style={{ background: 'linear-gradient(135deg, #ef4444, #f59e0b)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '8px' }}>Dynamic Power Equation</div>
              <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                P = C x V^2 x f
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginTop: '8px' }}>
                Power = Capacitance x Voltage^2 x Frequency
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { icon: 'Thermometer', title: 'Junction Temperature', desc: 'The actual silicon temperature, typically limited to 95-105C for safety' },
                { icon: 'TrendingDown', title: 'DVFS', desc: 'Dynamic Voltage & Frequency Scaling - reducing both cuts power cubically' },
                { icon: 'Zap', title: 'Voltage Matters Most', desc: 'Power scales with V^2 - a 10% voltage drop = 19% power reduction' },
                { icon: 'RefreshCw', title: 'Thermal Feedback Loop', desc: 'Sensors monitor temp constantly, adjusting speed in real-time' },
              ].map((item, i) => (
                <div key={i} style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '24px' }}>{item.icon}</div>
                  <div>
                    <h3 style={{ color: colors.textPrimary, margin: '0 0 4px' }}>{item.title}</h3>
                    <p style={{ color: colors.textMuted, margin: 0, fontSize: '14px' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'twist_predict':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.accent, textAlign: 'center', marginBottom: '8px' }}>
              The Cooling Twist
            </h2>
            <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '20px' }}>
              How does better cooling affect actual performance?
            </p>

            <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ color: colors.textSecondary, textAlign: 'center' }}>
                If you add a better heatsink or cooling fan to a processor, what happens to performance?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    ...secondaryButtonStyle,
                    background: twistPrediction === p.id
                      ? (p.id === 'better_cooling' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                      : 'rgba(51, 65, 85, 0.5)',
                    borderColor: twistPrediction === p.id ? (p.id === 'better_cooling' ? colors.success : colors.error) : 'transparent',
                    textAlign: 'left',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {twistPrediction && (
              <div style={{ marginTop: '20px', padding: '16px', background: twistPrediction === 'better_cooling' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)', borderRadius: '12px' }}>
                <p style={{ color: twistPrediction === 'better_cooling' ? colors.success : colors.warning }}>
                  {twistPrediction === 'better_cooling'
                    ? 'Correct! Better cooling means the chip can run faster for longer without hitting thermal limits - cooling = performance!'
                    : 'Actually, cooling directly affects sustained performance. Better cooling lets the processor maintain higher speeds!'}
                </p>
              </div>
            )}
          </div>
        );

      case 'twist_play':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
              Cooling vs Performance
            </h2>
            <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '16px', fontSize: '14px' }}>
              Adjust cooling capacity and see the impact on sustained performance
            </p>

            {renderVisualization(true)}

            <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ color: colors.textSecondary, fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                  Workload: {workload}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={workload}
                  onChange={(e) => setWorkload(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ color: colors.cool, fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                  Cooling: {coolingPower}W TDP
                </label>
                <input
                  type="range"
                  min="35"
                  max="150"
                  value={coolingPower}
                  onChange={(e) => setCoolingPower(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setIsSimulating(!isSimulating)}
                style={isSimulating ? secondaryButtonStyle : primaryButtonStyle}
              >
                {isSimulating ? 'Pause' : 'Start Simulation'}
              </button>
              <button onClick={resetSimulation} style={secondaryButtonStyle}>
                Reset
              </button>
            </div>

            <div style={{ marginTop: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', padding: '12px' }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', textAlign: 'center', margin: 0 }}>
                <strong style={{ color: colors.cool }}>Key insight:</strong> With 150W cooling, you can sustain max performance. With 35W, throttling kicks in quickly!
              </p>
            </div>
          </div>
        );

      case 'twist_review':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
              Cooling Enables Performance
            </h2>

            <div style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
                Better Cooling = Higher Sustained Clocks
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '8px' }}>
                The thermal limit is the new performance ceiling
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>Snowflake</div>
                <div style={{ color: colors.cool, fontWeight: 'bold' }}>Good Cooling</div>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>Sustained 100% performance</div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>Fire</div>
                <div style={{ color: colors.error, fontWeight: 'bold' }}>Poor Cooling</div>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>Throttled to 50-70%</div>
              </div>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Real-World Examples</h3>
              <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                <li>Gaming laptops with better coolers outperform identical specs with weak cooling</li>
                <li>Desktop CPUs can boost higher due to tower coolers</li>
                <li>Undervolting can reduce thermals, enabling higher sustained clocks</li>
                <li>Thermal paste quality directly affects maximum performance</li>
              </ul>
            </div>
          </div>
        );

      case 'transfer':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '20px' }}>
              Explore all 4 applications to continue
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {transferApplications.map((app, i) => (
                <div
                  key={i}
                  onClick={() => setTransferCompleted(prev => new Set([...prev, i]))}
                  style={{
                    background: transferCompleted.has(i) ? 'rgba(16, 185, 129, 0.2)' : colors.bgCard,
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    border: transferCompleted.has(i) ? `2px solid ${colors.success}` : '2px solid transparent',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{ fontSize: '32px', textAlign: 'center', marginBottom: '8px' }}>{app.icon}</div>
                  <h3 style={{ color: colors.textPrimary, fontSize: '14px', textAlign: 'center', margin: '0 0 8px' }}>
                    {app.title}
                  </h3>
                  <p style={{ color: colors.textMuted, fontSize: '11px', textAlign: 'center', margin: 0 }}>
                    {app.description}
                  </p>
                  {transferCompleted.has(i) && (
                    <div style={{ color: colors.success, textAlign: 'center', marginTop: '8px', fontSize: '12px' }}>
                      Explored
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <p style={{ color: colors.textMuted }}>
                Progress: {transferCompleted.size}/4 applications
              </p>
            </div>
          </div>
        );

      case 'test':
        if (testSubmitted) {
          return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                {testScore >= 7 ? 'Trophy' : 'Book'}
              </div>
              <h3 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '8px' }}>
                Score: {testScore}/10
              </h3>
              <p style={{ color: testScore >= 7 ? colors.success : colors.warning, marginBottom: '24px' }}>
                {testScore >= 7 ? 'Excellent! You understand thermal throttling!' : 'Review the concepts and try again.'}
              </p>

              <div style={{ textAlign: 'left', marginBottom: '24px' }}>
                {testQuestions.map((q, i) => (
                  <div key={i} style={{
                    padding: '12px',
                    marginBottom: '8px',
                    borderRadius: '8px',
                    background: testAnswers[i] !== null && q.options[testAnswers[i]!].correct
                      ? 'rgba(16, 185, 129, 0.2)'
                      : 'rgba(239, 68, 68, 0.2)'
                  }}>
                    <p style={{ color: colors.textPrimary, fontSize: '14px', margin: '0 0 4px' }}>
                      {i + 1}. {q.question}
                    </p>
                    <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>
                      Correct: {q.options.find(o => o.correct)?.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
              Knowledge Check
            </h2>

            <div style={{ marginBottom: '20px' }}>
              {testQuestions.map((q, qIndex) => (
                <div key={qIndex} style={{ marginBottom: '24px', background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
                  <p style={{ color: colors.textPrimary, fontWeight: 'bold', marginBottom: '12px' }}>
                    {qIndex + 1}. {q.question}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {q.options.map((opt, oIndex) => (
                      <button
                        key={oIndex}
                        onClick={() => handleTestAnswer(qIndex, oIndex)}
                        style={{
                          ...secondaryButtonStyle,
                          background: testAnswers[qIndex] === oIndex ? 'rgba(245, 158, 11, 0.3)' : 'rgba(51, 65, 85, 0.5)',
                          borderColor: testAnswers[qIndex] === oIndex ? colors.accent : 'transparent',
                          textAlign: 'left',
                          fontSize: '14px',
                          padding: '10px 16px',
                        }}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={submitTest}
              disabled={testAnswers.includes(null)}
              style={{
                ...primaryButtonStyle,
                width: '100%',
                opacity: testAnswers.includes(null) ? 0.5 : 1,
                cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
              }}
            >
              Submit Answers
            </button>
          </div>
        );

      case 'mastery':
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '16px' }}>
              Thermal Throttling Master!
            </h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You now understand how processors balance performance and temperature.
            </p>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
              <h3 style={{ color: colors.accent, marginBottom: '16px' }}>Key Takeaways</h3>
              <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
                <li style={{ marginBottom: '8px' }}>Thermal throttling protects chips by reducing clock speed</li>
                <li style={{ marginBottom: '8px' }}>P = C x V^2 x f - voltage reduction has the biggest impact</li>
                <li style={{ marginBottom: '8px' }}>DVFS dynamically balances power and performance</li>
                <li style={{ marginBottom: '8px' }}>Better cooling directly enables higher sustained performance</li>
                <li>Modern chips are thermally limited, not electrically limited</li>
              </ul>
            </div>

            <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '12px', padding: '16px' }}>
              <p style={{ color: 'white', margin: 0, fontWeight: 'bold' }}>
                Score: {testScore}/10
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Determine navigation state for bottom bar
  const getNavigationState = () => {
    switch (phase) {
      case 'hook':
        return { canGoNext: true, nextLabel: 'Discover Thermal Throttling' };
      case 'predict':
        return { canGoNext: !!prediction, nextLabel: 'See It In Action' };
      case 'play':
        return { canGoNext: true, nextLabel: 'Continue to Review' };
      case 'review':
        return { canGoNext: true, nextLabel: 'Discover the Cooling Connection' };
      case 'twist_predict':
        return { canGoNext: !!twistPrediction, nextLabel: 'Explore Cooling Effects' };
      case 'twist_play':
        return { canGoNext: true, nextLabel: 'Continue' };
      case 'twist_review':
        return { canGoNext: true, nextLabel: 'See Real Applications' };
      case 'transfer':
        return { canGoNext: transferCompleted.size >= 4, nextLabel: transferCompleted.size >= 4 ? 'Take the Test' : `Explore ${4 - transferCompleted.size} more` };
      case 'test':
        if (testSubmitted) {
          return { canGoNext: testScore >= 7, nextLabel: testScore >= 7 ? 'Complete!' : 'Continue Anyway' };
        }
        return { canGoNext: false, nextLabel: 'Answer All Questions' };
      case 'mastery':
        return { canGoNext: true, nextLabel: 'Complete Game' };
      default:
        return { canGoNext: true, nextLabel: 'Continue' };
    }
  };

  const navState = getNavigationState();

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, #1e293b 100%)`,
      color: colors.textPrimary
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {renderContent()}
        </div>
      </div>
      {renderBottomBar(navState.canGoNext, navState.nextLabel)}
    </div>
  );
};

export default ThermalThrottlingRenderer;
