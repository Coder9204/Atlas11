'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Thermal Throttling - Complete 10-Phase Game
// Why your phone slows down when it gets hot
// -----------------------------------------------------------------------------

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface ThermalThrottlingRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

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
    scenario: "You're playing an intensive mobile game for 30 minutes. The phone gets noticeably warm, and suddenly the frame rate drops from 60fps to 30fps even though the game hasn't changed scenes.",
    question: "What is most likely happening inside your phone?",
    options: [
      { id: 'a', label: "The game has a bug causing poor performance" },
      { id: 'b', label: "The processor is thermal throttling - reducing speed to lower temperature", correct: true },
      { id: 'c', label: "The battery is running low and can't provide enough power" },
      { id: 'd', label: "The screen refresh rate automatically changed settings" }
    ],
    explanation: "Thermal throttling is the processor's defense mechanism. When junction temperature approaches ~95-100C, the chip automatically reduces clock speed and voltage to generate less heat, sacrificing performance for thermal safety."
  },
  {
    scenario: "A data center engineer notices that servers perform worse during summer months even though the air conditioning is set to the same temperature year-round.",
    question: "What's the most likely cause of this seasonal performance degradation?",
    options: [
      { id: 'a', label: "Summer power grid issues cause voltage fluctuations" },
      { id: 'b', label: "Higher ambient temps reduce cooling headroom, causing more frequent throttling", correct: true },
      { id: 'c', label: "Employees use more computing resources in summer" },
      { id: 'd', label: "Hard drives spin faster in warm weather" }
    ],
    explanation: "Even with constant AC settings, higher outdoor temperatures mean cooling systems work harder to maintain the same indoor temp, often with less headroom. Servers operating closer to thermal limits throttle more frequently."
  },
  {
    scenario: "An engineer is comparing two identical laptops. Laptop A has a basic cooling system, Laptop B has an advanced vapor chamber cooler. Both have the same CPU rated at 4.0 GHz boost.",
    question: "Which laptop will have better sustained performance during a 1-hour video render?",
    options: [
      { id: 'a', label: "Both will perform identically since they have the same CPU" },
      { id: 'b', label: "Laptop B - better cooling means higher sustained clock speeds", correct: true },
      { id: 'c', label: "Laptop A - simpler cooling has fewer failure points" },
      { id: 'd', label: "Performance depends only on RAM, not cooling" }
    ],
    explanation: "Better cooling directly enables higher sustained performance. Laptop B can dissipate more heat, allowing the CPU to maintain higher clock speeds without hitting thermal limits that trigger throttling."
  },
  {
    scenario: "A smartphone manufacturer wants to reduce thermal throttling in their new flagship. They're considering using an aluminum frame instead of plastic.",
    question: "How would an aluminum frame help with thermal performance?",
    options: [
      { id: 'a', label: "Aluminum is lighter, reducing overall heat generation" },
      { id: 'b', label: "Aluminum conducts heat better, spreading it across the phone body for passive dissipation", correct: true },
      { id: 'c', label: "Aluminum blocks external heat from entering the phone" },
      { id: 'd', label: "Aluminum reflects infrared radiation away from the CPU" }
    ],
    explanation: "Aluminum has much higher thermal conductivity than plastic. It acts as a heat spreader, distributing heat from the CPU across the entire phone body, increasing the surface area for passive heat dissipation."
  },
  {
    scenario: "A PC overclocker increases their CPU voltage from 1.2V to 1.35V to achieve a stable overclock. Shortly after, they notice the CPU throttles more frequently.",
    question: "Why does higher voltage cause more throttling?",
    options: [
      { id: 'a', label: "Higher voltage damages the CPU, reducing its thermal limits" },
      { id: 'b', label: "Power scales with V-squared, so small voltage increases cause large power/heat increases", correct: true },
      { id: 'c', label: "Higher voltage makes electrons move faster, generating more friction" },
      { id: 'd', label: "The motherboard limits power delivery at higher voltages" }
    ],
    explanation: "Dynamic power follows P = CV^2*f. Since power scales with voltage squared, a 12.5% voltage increase (1.2V to 1.35V) causes roughly 27% more power dissipation and heat, overwhelming the cooling system faster."
  },
  {
    scenario: "An electric vehicle owner notices their car's acceleration is reduced after several consecutive drag strip runs, even though the battery still shows 80% charge.",
    question: "What is causing the reduced acceleration performance?",
    options: [
      { id: 'a', label: "The motor magnets have demagnetized from use" },
      { id: 'b', label: "The power electronics are thermal throttling to protect themselves", correct: true },
      { id: 'c', label: "The tires have lost grip from overheating" },
      { id: 'd', label: "The battery management system is recalibrating" }
    ],
    explanation: "EV inverters and motors generate significant heat during high-power acceleration. After repeated runs, the power electronics reach thermal limits and reduce output (derate) to prevent damage, similar to CPU throttling."
  },
  {
    scenario: "A gaming laptop manufacturer advertises their laptop can reach 5.0 GHz boost clock. A reviewer finds it only sustains 3.2 GHz during extended gaming.",
    question: "What explains this large gap between advertised and sustained performance?",
    options: [
      { id: 'a', label: "The manufacturer is lying about the specifications" },
      { id: 'b', label: "Boost clocks are brief bursts; sustained loads trigger thermal throttling", correct: true },
      { id: 'c', label: "Gaming uses different instructions that run at lower speeds" },
      { id: 'd', label: "The laptop runs at 5 GHz only when plugged in" }
    ],
    explanation: "Boost clocks are achievable for short bursts when thermal headroom exists. Extended gaming generates sustained heat that exceeds cooling capacity, forcing aggressive throttling. This gap between peak and sustained is called 'thermal wall'."
  },
  {
    scenario: "A chip designer is choosing between two semiconductor processes: one at 7nm and one at 5nm. The 5nm process uses less power per transistor.",
    question: "Despite using less power per transistor, why might the 5nm chip still have thermal challenges?",
    options: [
      { id: 'a', label: "5nm transistors are less reliable and fail at lower temperatures" },
      { id: 'b', label: "Higher transistor density concentrates more heat in a smaller area", correct: true },
      { id: 'c', label: "Smaller transistors require higher voltages to switch" },
      { id: 'd', label: "5nm chips can't be cooled with traditional heatsinks" }
    ],
    explanation: "While individual transistors use less power, 5nm enables ~2x more transistors in the same area. The concentrated heat density (watts per mm^2) can actually increase, making thermal management more challenging despite better efficiency."
  },
  {
    scenario: "A data center uses liquid cooling for their server CPUs. The water temperature entering the cooling blocks is 45C (warm water cooling) instead of the typical 20C.",
    question: "What is the advantage of using warmer cooling water?",
    options: [
      { id: 'a', label: "Warm water flows faster through the pipes" },
      { id: 'b', label: "The waste heat can be reused, and chillers aren't needed", correct: true },
      { id: 'c', label: "CPUs perform better at higher temperatures" },
      { id: 'd', label: "There is no advantage - colder is always better" }
    ],
    explanation: "Warm water cooling (45-50C) still keeps CPUs below thermal limits while eliminating the need for energy-intensive chillers. The waste heat at this temperature is useful for building heating or other purposes, improving overall data center efficiency."
  },
  {
    scenario: "An engineer measures that a chip dissipates 100W at full load. The heatsink has a thermal resistance of 0.3C/W to ambient.",
    question: "If ambient temperature is 25C, what is the expected heatsink temperature?",
    options: [
      { id: 'a', label: "25C - the heatsink stays at ambient" },
      { id: 'b', label: "55C - calculated as 25 + (100 * 0.3)", correct: true },
      { id: 'c', label: "130C - adding power directly to temperature" },
      { id: 'd', label: "100C - power equals temperature in Celsius" }
    ],
    explanation: "Temperature rise equals power times thermal resistance: Delta_T = P * R_th = 100W * 0.3C/W = 30C. Adding ambient: T_heatsink = 25C + 30C = 55C. This is why thermal resistance specifications are critical for cooling design."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
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
      { value: '95C', label: 'Throttle threshold', icon: '🌡️' },
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
      { value: '$1M/yr', label: 'Cooling per MW', icon: '💰' },
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
      { value: '30%', label: 'Derating at limit', icon: '📉' }
    ],
    examples: ['Tesla Model S Plaid', 'Porsche Taycan', 'Rivian R1T', 'Lucid Air'],
    companies: ['Tesla', 'Porsche', 'Rivian', 'BorgWarner'],
    futureImpact: 'Gallium nitride devices and integrated motor-inverter designs will push efficiency above 99%.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const ThermalThrottlingRenderer: React.FC<ThermalThrottlingRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [clockSpeed, setClockSpeed] = useState(3.5);
  const [voltage, setVoltage] = useState(1.2);
  const [workload, setWorkload] = useState(50);
  const [temperature, setTemperature] = useState(40);
  const [isThrottling, setIsThrottling] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);

  // Twist phase - cooling scenario
  const [coolingPower, setCoolingPower] = useState(65);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);

  // Thermal constants
  const T_AMBIENT = 25;
  const T_THROTTLE = 95;
  const T_CRITICAL = 105;

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    hot: '#EF4444',
    cool: '#3B82F6',
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
    twist_play: 'Cooling Effect',
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
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'thermal-throttling',
        gameTitle: 'Thermal Throttling',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  const resetSimulation = () => {
    setTemperature(40);
    setClockSpeed(3.5);
    setVoltage(1.2);
    setIsThrottling(false);
    setIsSimulating(false);
    setAnimationTime(0);
  };

  // Navigation bar component
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      background: colors.bgSecondary,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <span style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>
        Thermal Throttling
      </span>
    </nav>
  );

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 60,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1001,
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

  // Thermal Visualization SVG Component
  const ThermalVisualization = ({ showCooling = false }: { showCooling?: boolean }) => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 320 : 380;
    const tempRatio = Math.min((temperature - T_AMBIENT) / (T_CRITICAL - T_AMBIENT), 1);
    const performanceRatio = clockSpeed / 4.5;

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="tempGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={colors.cool} />
            <stop offset="50%" stopColor={colors.warning} />
            <stop offset="100%" stopColor={colors.hot} />
          </linearGradient>
          <linearGradient id="perfGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.success} />
            <stop offset="100%" stopColor={colors.cool} />
          </linearGradient>
          <linearGradient id="cpuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={temperature > 85 ? "#dc2626" : temperature > 70 ? "#f59e0b" : "#6366f1"} />
            <stop offset="100%" stopColor={temperature > 85 ? "#991b1b" : temperature > 70 ? "#b45309" : "#4338ca"} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          Processor Thermal Simulation
        </text>

        {/* Grid lines for visual reference */}
        <g opacity="0.3">
          {Array.from({ length: 6 }, (_, i) => (
            <line
              key={`h${i}`}
              x1="20"
              y1={50 + i * 50}
              x2={width - 20}
              y2={50 + i * 50}
              stroke={colors.border}
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <line
              key={`v${i}`}
              x1={20 + i * 60}
              y1="50"
              x2={20 + i * 60}
              y2={height - 90}
              stroke={colors.border}
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          ))}
        </g>

        {/* Y-axis label */}
        <text x="10" y="60" fill={colors.textMuted} fontSize="10" transform={`rotate(-90, 10, 60)`}>
          Temperature
        </text>

        {/* X-axis label */}
        <text x={width/2} y={height - 5} textAnchor="middle" fill={colors.textMuted} fontSize="10">
          Time
        </text>

        {/* CPU Die */}
        <g transform={`translate(${width/2 - 60}, 50)`}>
          <rect x="0" y="0" width="120" height="80" rx="8" fill="url(#cpuGrad)" stroke={isThrottling ? colors.hot : colors.border} strokeWidth={isThrottling ? 3 : 1} filter={isThrottling ? "url(#glow)" : undefined} />

          {/* CPU cores */}
          {Array.from({ length: 4 }, (_, i) => (
            <rect key={i} x={10 + (i % 2) * 55} y={10 + Math.floor(i / 2) * 35} width="45" height="28" rx="4" fill="rgba(255,255,255,0.2)" />
          ))}

          <text x="60" y="95" textAnchor="middle" fill={colors.textPrimary} fontSize="12" fontWeight="600">
            {clockSpeed.toFixed(2)} GHz
          </text>
          <text x="60" y="110" textAnchor="middle" fill={colors.textMuted} fontSize="10">
            {voltage.toFixed(2)}V | {power.toFixed(0)}W
          </text>

          {/* Heat waves when hot */}
          {isSimulating && temperature > 60 && (
            <g>
              {Array.from({ length: 5 }, (_, i) => {
                const offset = ((animationTime * 2 + i * 10) % 30);
                const opacity = Math.max(0, 1 - offset / 30) * Math.min((temperature - 60) / 35, 1);
                return (
                  <path
                    key={i}
                    d={`M ${20 + i * 20} ${-offset} Q ${25 + i * 20} ${-10 - offset} ${30 + i * 20} ${-offset}`}
                    fill="none"
                    stroke={temperature > T_THROTTLE ? colors.hot : colors.warning}
                    strokeWidth="2"
                    opacity={opacity * 0.6}
                  />
                );
              })}
            </g>
          )}
        </g>

        {/* Cooling indicator */}
        {showCooling && (
          <g transform={`translate(20, 60)`}>
            <rect x="0" y="0" width="70" height="80" rx="8" fill="#0c4a6e" stroke="#0369a1" />
            <text x="35" y="18" textAnchor="middle" fill="#7dd3fc" fontSize="10" fontWeight="600">COOLING</text>

            {/* Fan blades */}
            <g transform="translate(35, 50)">
              {Array.from({ length: 4 }, (_, i) => (
                <line
                  key={i}
                  x1="0"
                  y1="-15"
                  x2="0"
                  y2="-5"
                  stroke="#22d3ee"
                  strokeWidth="6"
                  strokeLinecap="round"
                  transform={`rotate(${(animationTime * coolingPower / 5) + i * 90})`}
                />
              ))}
            </g>
            <text x="35" y="75" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="600">{coolingPower}W</text>
          </g>
        )}

        {/* Temperature gauge */}
        <g transform={`translate(${width - 70}, 50)`}>
          <rect x="0" y="0" width="50" height="120" rx="6" fill={colors.bgSecondary} stroke={colors.border} />
          <text x="25" y="18" textAnchor="middle" fill={colors.textMuted} fontSize="9">TEMP</text>

          <rect x="10" y="25" width="30" height="80" rx="4" fill={colors.bgPrimary} />
          <rect x="12" y={27 + 76 * (1 - tempRatio)} width="26" height={76 * tempRatio} rx="3" fill="url(#tempGrad)" />

          <text x="25" y="118" textAnchor="middle" fill={temperature > T_THROTTLE ? colors.hot : colors.textPrimary} fontSize="14" fontWeight="700">
            {temperature.toFixed(0)}C
          </text>
        </g>

        {/* Status panel */}
        <g transform={`translate(20, ${height - 140})`}>
          <rect x="0" y="0" width={width - 40} height="50" rx="8" fill={isThrottling ? "rgba(239,68,68,0.2)" : colors.bgSecondary} stroke={isThrottling ? colors.hot : colors.border} />

          <circle cx="25" cy="25" r="8" fill={isThrottling ? colors.hot : colors.success}>
            {isThrottling && <animate attributeName="opacity" values="0.5;1;0.5" dur="0.5s" repeatCount="indefinite" />}
          </circle>

          <text x="45" y="22" fill={colors.textMuted} fontSize="10">DVFS STATUS</text>
          <text x="45" y="36" fill={isThrottling ? colors.hot : colors.success} fontSize="13" fontWeight="600">
            {isThrottling ? "THROTTLING ACTIVE" : "NORMAL OPERATION"}
          </text>
        </g>

        {/* Performance bar */}
        <g transform={`translate(20, ${height - 75})`}>
          <text x="0" y="0" fill={colors.textMuted} fontSize="10">PERFORMANCE</text>
          <rect x="0" y="10" width={width - 100} height="16" rx="4" fill={colors.bgSecondary} />
          <rect x="0" y="10" width={(width - 100) * performanceRatio} height="16" rx="4" fill={isThrottling ? colors.hot : "url(#perfGrad)"} />
          <text x={width - 90} y="23" fill={colors.textPrimary} fontSize="14" fontWeight="600">
            {(performanceRatio * 100).toFixed(0)}%
          </text>
        </g>

        {/* Formula */}
        <text x={width/2} y={height - 15} textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="600">
          P = C * V^2 * f
        </text>
      </svg>
    );
  };

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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🔥📱
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Thermal Throttling
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Why does your phone slow down when it gets hot? Inside every chip is a hidden guardian that sacrifices <span style={{ color: colors.accent }}>performance</span> to prevent <span style={{ color: colors.hot }}>destruction</span>."
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
            "Modern processors can hit 4-5 GHz and dissipate 100+ watts. Without thermal throttling, they'd literally cook themselves in seconds. DVFS (Dynamic Voltage and Frequency Scaling) is the reason your phone survives the summer."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Chip Thermal Design Principles
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore Thermal Throttling
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The chip would be permanently damaged by overheating' },
      { id: 'b', text: 'The chip automatically slows down to reduce heat generation', correct: true },
      { id: 'c', text: 'The phone immediately shuts off to protect itself' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '120px',
          paddingLeft: '24px',
          paddingRight: '24px',
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
            When a processor approaches dangerous temperatures (95-100C), what happens?
          </h2>

          {/* Simple diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>🎮</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Heavy Gaming</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>-&gt;</div>
              <div style={{
                background: colors.hot + '33',
                padding: '20px 30px',
                borderRadius: '8px',
                border: `2px solid ${colors.hot}`,
              }}>
                <div style={{ fontSize: '24px', color: colors.hot }}>95C+</div>
                <p style={{ ...typo.small, color: colors.textPrimary }}>CPU Overheating</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>-&gt;</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px' }}>???</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>What Happens?</p>
              </div>
            </div>
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
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Thermal Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '120px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Thermal Throttling Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Increase workload and watch the CPU respond to rising temperatures.
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <ThermalVisualization />
            </div>

            {/* Workload slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>CPU Workload</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{workload}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={workload}
                onChange={(e) => setWorkload(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.accent} ${workload}%, ${colors.border} ${workload}%)`,
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>10%</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>100%</span>
              </div>
            </div>

            {/* Control buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
              <button
                onClick={() => {
                  setIsSimulating(!isSimulating);
                  playSound('click');
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isSimulating ? colors.border : colors.success,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isSimulating ? 'Pause' : 'Start Simulation'}
              </button>
              <button
                onClick={() => {
                  resetSimulation();
                  playSound('click');
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            </div>

            {/* Stats display */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.cool }}>{clockSpeed.toFixed(2)} GHz</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Clock Speed</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.warning }}>{power.toFixed(0)}W</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Power Draw</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: temperature > T_THROTTLE ? colors.hot : colors.success }}>{temperature.toFixed(0)}C</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Temperature</div>
              </div>
            </div>
          </div>

          {/* Throttling alert */}
          {isThrottling && (
            <div style={{
              background: `${colors.hot}22`,
              border: `1px solid ${colors.hot}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.hot, margin: 0 }}>
                DVFS Active: Clock speed and voltage reduced to prevent thermal damage!
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
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '120px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Thermal Throttling
          </h2>

          <div style={{
            background: `linear-gradient(135deg, ${colors.hot}, ${colors.warning})`,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '8px' }}>
              Dynamic Power Equation
            </p>
            <p style={{ color: 'white', fontSize: '28px', fontWeight: 700, fontFamily: 'monospace', margin: 0 }}>
              P = C * V^2 * f
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginTop: '8px' }}>
              Power = Capacitance x Voltage^2 x Frequency
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
                <strong style={{ color: colors.textPrimary }}>Voltage is Key:</strong> Since power scales with V^2, reducing voltage has a dramatic effect. A 10% voltage drop cuts power by 19%!
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>DVFS (Dynamic Voltage and Frequency Scaling):</strong> When temperature sensors detect approaching limits (~95C), the chip reduces both voltage AND frequency together.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Thermal Resistance:</strong> Heat flows from the chip through thermal paste, heatsink, and into the air. The total resistance determines final temperature: T = T_ambient + P * R_thermal
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              Key Insight: The Thermal-Performance Tradeoff
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Every chip faces a fundamental tradeoff: higher performance means more power, which means more heat. Throttling is the automatic mechanism that ensures the chip survives by trading temporary performance for long-term reliability.
            </p>
          </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Discover the Cooling Connection
            </button>
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Cooling has no effect - thermal throttling is purely software controlled' },
      { id: 'b', text: 'Better cooling directly enables higher sustained performance', correct: true },
      { id: 'c', text: 'Performance is purely silicon-limited, not thermal limited' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '120px',
          paddingLeft: '24px',
          paddingRight: '24px',
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
                New Variable: Cooling Capacity
              </p>
            </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            If you add a better heatsink or cooling system to a processor, what happens to sustained performance?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{
                background: `${colors.cool}33`,
                padding: '16px',
                borderRadius: '12px',
                border: `2px solid ${colors.cool}`,
              }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>❄️</div>
                <p style={{ ...typo.small, color: colors.textPrimary }}>Better Cooling</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>+</div>
              <div style={{
                background: `${colors.hot}33`,
                padding: '16px',
                borderRadius: '12px',
                border: `2px solid ${colors.hot}`,
              }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔥</div>
                <p style={{ ...typo.small, color: colors.textPrimary }}>Same Hot CPU</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>=</div>
              <div style={{ fontSize: '48px' }}>???</div>
            </div>
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
                See Cooling Effect
              </button>
            )}
          </div>
        </div>

        {renderNavDots()}
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
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '120px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Cooling vs Performance
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust cooling capacity and see how it affects sustained performance
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <ThermalVisualization showCooling={true} />
            </div>

            {/* Workload slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>CPU Workload</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{workload}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={workload}
                onChange={(e) => setWorkload(parseInt(e.target.value))}
                style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>10%</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>100%</span>
              </div>
            </div>

            {/* Cooling slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.cool }}>Cooling Capacity (TDP)</span>
                <span style={{ ...typo.small, color: colors.cool, fontWeight: 600 }}>{coolingPower}W</span>
              </div>
              <input
                type="range"
                min="35"
                max="150"
                value={coolingPower}
                onChange={(e) => setCoolingPower(parseInt(e.target.value))}
                style={{ width: '100%', height: '8px', borderRadius: '4px', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>Phone (35W)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>Desktop (150W)</span>
              </div>
            </div>

            {/* Control buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button
                onClick={() => { setIsSimulating(!isSimulating); playSound('click'); }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isSimulating ? colors.border : colors.success,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isSimulating ? 'Pause' : 'Start Simulation'}
              </button>
              <button
                onClick={() => { resetSimulation(); playSound('click'); }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            </div>
          </div>

          <div style={{
            background: `${colors.success}22`,
            border: `1px solid ${colors.success}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
              <strong>Key insight:</strong> With 150W cooling, you can sustain max performance. With 35W, throttling kicks in quickly!
            </p>
          </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Understand the Solution
            </button>
          </div>
        </div>

        {renderNavDots()}
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
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '120px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Cooling Enables Performance
          </h2>

          <div style={{
            background: `linear-gradient(135deg, ${colors.cool}, #06b6d4)`,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ color: 'white', fontSize: '20px', fontWeight: 700, margin: 0 }}>
              Better Cooling = Higher Sustained Clocks
            </p>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '8px' }}>
              The thermal limit is the new performance ceiling
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🌡️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Thermal Resistance Matters</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                T_chip = T_ambient + Power x R_thermal. Lower thermal resistance means lower chip temperature at the same power, which means higher sustainable clocks before throttling.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💨</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Active vs Passive Cooling</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Phones use passive cooling (no fans), limiting sustained power to 3-5W. Laptops with fans can sustain 45-65W. Desktops with tower coolers can handle 150W+.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🏆</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Why Cooling Is Performance</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                In modern chips, cooling is often the limiting factor for performance. Gaming laptops with identical CPUs can have 30%+ performance differences based solely on their cooling solutions!
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
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '120px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
              Real-World Applications
            </h2>

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
                  const newCompleted = [...completedApps];
                  newCompleted[i] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{
                  background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                  border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative',
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
                    ok
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
                How Thermal Throttling Connects:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
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
          </div>

            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%' }}
              >
                Take the Knowledge Test
              </button>
            )}
          </div>
        </div>

        {renderNavDots()}
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
          padding: '24px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
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
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand thermal throttling and thermal management!'
                : 'Review the concepts and try again.'}
            </p>

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
                  goToPhase('hook');
                }}
                style={primaryButtonStyle}
              >
                Review and Try Again
              </button>
            )}
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '80px',
          paddingBottom: '120px',
          paddingLeft: '24px',
          paddingRight: '24px',
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
            {question.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  const newAnswers = [...testAnswers];
                  newAnswers[currentQuestion] = opt.id;
                  setTestAnswers(newAnswers);
                }}
                style={{
                  background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
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
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Next
              </button>
            ) : (
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
                disabled={testAnswers.some(a => a === null)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Submit Test
              </button>
            )}
          </div>
          </div>
        </div>

        {renderNavDots()}
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Thermal Throttling Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how processors balance performance and temperature to survive demanding workloads.
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
              'P = CV^2f - voltage has the biggest impact on power',
              'DVFS reduces clock and voltage when thermal limits approach',
              'Thermal resistance determines sustainable performance',
              'Better cooling directly enables higher sustained clocks',
              'Modern chips are thermally limited, not electrically limited',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>ok</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
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
    );
  }

  return null;
};

export default ThermalThrottlingRenderer;
