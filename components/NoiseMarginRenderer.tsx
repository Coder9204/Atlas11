'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Noise Margin - Complete 10-Phase Game
// How digital logic reliably distinguishes between 0 and 1
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

interface NoiseMarginRendererProps {
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
    scenario: "A chip designer is testing a new 3.3V CMOS logic gate. They measure the output voltage when driving HIGH to be 2.9V, but the datasheet specifies VIH (minimum input voltage for HIGH) as 2.0V.",
    question: "What is the noise margin high (NMH) for this gate?",
    options: [
      { id: 'a', label: "0.9V - the difference between VOH and VIH", correct: true },
      { id: 'b', label: "2.0V - equal to VIH" },
      { id: 'c', label: "3.3V - the full supply voltage" },
      { id: 'd', label: "2.9V - equal to VOH" }
    ],
    explanation: "Noise margin high (NMH) = VOH - VIH = 2.9V - 2.0V = 0.9V. This 0.9V margin means the signal can tolerate up to 0.9V of noise before being misinterpreted."
  },
  {
    scenario: "An engineer notices that their digital circuit works fine at room temperature but shows occasional bit errors when the chip heats up to 85°C.",
    question: "What is the most likely cause of these temperature-dependent errors?",
    options: [
      { id: 'a', label: "The clock speed increased due to heat" },
      { id: 'b', label: "Voltage thresholds shift with temperature, reducing noise margins", correct: true },
      { id: 'c', label: "The power supply voltage doubled" },
      { id: 'd', label: "The chip entered a different operating mode" }
    ],
    explanation: "Temperature affects transistor threshold voltages, shifting VIH, VIL, VOH, and VOL. This reduces the effective noise margins, making circuits more susceptible to noise-induced errors at high temperatures."
  },
  {
    scenario: "A signal traveling between two chips on a PCB occasionally gets interpreted incorrectly. The voltage level measures 1.5V at the receiver, and the receiver uses 3.3V CMOS logic with VIL=1.0V and VIH=2.0V.",
    question: "Why is this signal causing errors?",
    options: [
      { id: 'a', label: "The voltage is too high for the receiver" },
      { id: 'b', label: "The signal is in the forbidden zone between VIL and VIH", correct: true },
      { id: 'c', label: "The signal is a valid logic LOW" },
      { id: 'd', label: "The signal is a valid logic HIGH" }
    ],
    explanation: "At 1.5V, the signal is between VIL (1.0V) and VIH (2.0V) - the forbidden zone. In this region, the receiver's output is undefined and may oscillate or produce incorrect logic levels."
  },
  {
    scenario: "As semiconductor technology advances from 5V to 3.3V to 1.8V to 1.2V supply voltages, chip designers face increasing challenges with signal integrity.",
    question: "Why do lower supply voltages make noise margins more critical?",
    options: [
      { id: 'a', label: "Lower voltages consume more power" },
      { id: 'b', label: "The absolute noise margin decreases proportionally with VDD", correct: true },
      { id: 'c', label: "Lower voltages make transistors switch faster" },
      { id: 'd', label: "Lower voltages eliminate crosstalk" }
    ],
    explanation: "Noise margins scale roughly proportionally with supply voltage. A 5V chip might have 1.5V noise margin, but a 1.2V chip might only have 0.36V margin - making it much more susceptible to even small noise sources."
  },
  {
    scenario: "A system designer needs to connect a 3.3V microcontroller to a 1.8V sensor. The microcontroller outputs VOH=3.0V and VOL=0.3V. The sensor expects VIH=1.2V and VIL=0.5V.",
    question: "What problem might occur when the microcontroller drives a HIGH signal?",
    options: [
      { id: 'a', label: "The signal will be too weak to register" },
      { id: 'b', label: "The 3.0V output may damage the 1.8V input", correct: true },
      { id: 'c', label: "No problem - the signal meets VIH requirements" },
      { id: 'd', label: "The signal will register as LOW" }
    ],
    explanation: "While 3.0V exceeds VIH=1.2V (so it would register as HIGH), the voltage exceeds the 1.8V supply of the receiver by 1.2V. This can cause excessive current through input protection diodes and potentially damage the sensor."
  },
  {
    scenario: "An automotive ECU designer must choose logic family for a system operating in an engine compartment with ignition noise spikes of 500mV.",
    question: "Which logic family provides the best noise immunity?",
    options: [
      { id: 'a', label: "1.2V ultra-low-power CMOS" },
      { id: 'b', label: "3.3V standard CMOS with NMH=0.9V" },
      { id: 'c', label: "5V CMOS with NMH=1.5V", correct: true },
      { id: 'd', label: "1.8V mobile CMOS" }
    ],
    explanation: "With 500mV noise spikes expected, only the 5V CMOS with 1.5V noise margin provides adequate immunity. The 1.5V margin is 3x the expected noise, while the 0.9V margin leaves less than 2x headroom."
  },
  {
    scenario: "A memory controller is reading data from DRAM. The data valid window is only 100ps, but noise on the signal line causes 40mV of voltage uncertainty. The DRAM uses 1.2V signaling.",
    question: "If VIH is set at 0.72V (60% of VDD), what percentage of VDD does the noise represent?",
    options: [
      { id: 'a', label: "About 3.3% of VDD", correct: true },
      { id: 'b', label: "About 10% of VDD" },
      { id: 'c', label: "About 33% of VDD" },
      { id: 'd', label: "About 0.3% of VDD" }
    ],
    explanation: "40mV noise / 1200mV VDD = 0.033 or 3.3%. While this seems small, with a typical NMH of ~20-30% of VDD, this 3.3% consumes about 10-15% of the available noise margin."
  },
  {
    scenario: "Two adjacent signal traces on a PCB couple 15% of one signal's voltage swing onto the other due to crosstalk. Both signals use 1.8V logic with VOH=1.6V and VIH=1.2V.",
    question: "What is the maximum coupled noise voltage, and does it violate the noise margin?",
    options: [
      { id: 'a', label: "270mV noise - safe because NMH is 400mV", correct: true },
      { id: 'b', label: "270mV noise - dangerous because NMH is only 200mV" },
      { id: 'c', label: "180mV noise - always safe" },
      { id: 'd', label: "450mV noise - dangerous" }
    ],
    explanation: "15% crosstalk of 1.8V swing = 270mV. NMH = VOH - VIH = 1.6V - 1.2V = 400mV. Since 270mV < 400mV, the noise margin is not violated, but over 67% of the margin is consumed - leaving little headroom for other noise sources."
  },
  {
    scenario: "A chip architect is reviewing a design where output drivers have VOL=0.4V and VOH=VDD-0.4V. The input thresholds are set at 30% and 70% of VDD.",
    question: "What happens to the noise margins as VDD is reduced from 3.3V to 1.8V?",
    options: [
      { id: 'a', label: "Both NMH and NML decrease proportionally with VDD", correct: true },
      { id: 'b', label: "NMH increases while NML decreases" },
      { id: 'c', label: "Both noise margins stay constant" },
      { id: 'd', label: "Both noise margins increase" }
    ],
    explanation: "At 3.3V: NMH = (3.3-0.4) - 0.7*3.3 = 2.9 - 2.31 = 0.59V. At 1.8V: NMH = (1.8-0.4) - 0.7*1.8 = 1.4 - 1.26 = 0.14V. The margin drops from 0.59V to 0.14V - a 76% reduction for a 45% voltage reduction."
  },
  {
    scenario: "A test engineer is characterizing a chip and notices that the actual VIH measured is 2.1V instead of the specified 2.0V. The VOH is at the spec of 2.9V.",
    question: "How does this affect the noise margin, and should they be concerned?",
    options: [
      { id: 'a', label: "NMH reduced from 0.9V to 0.8V - minor concern" },
      { id: 'b', label: "NMH increased - better than spec" },
      { id: 'c', label: "NMH reduced by 11% - monitor other parameters too", correct: true },
      { id: 'd', label: "No change to noise margin" }
    ],
    explanation: "NMH changed from 2.9-2.0=0.9V to 2.9-2.1=0.8V, an 11% reduction. While the part still has margin, this shift could indicate process variation. Combined with temperature effects and aging, margins could further degrade."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '💻',
    title: 'Computer Processors',
    short: 'CPUs rely on noise margins for reliable operation',
    tagline: 'Billions of transistors switching correctly',
    description: 'Modern processors contain billions of transistors that must correctly interpret 0s and 1s. Noise margins ensure that electrical interference, temperature variations, and manufacturing tolerances do not cause bit errors.',
    connection: 'The voltage thresholds VIH and VIL define safe regions where logic states are guaranteed. Without adequate noise margins, processors would make constant errors from electrical noise.',
    howItWorks: 'CMOS logic uses complementary transistor pairs that switch between VDD and ground. The threshold voltages are set at approximately 30% and 70% of VDD, leaving margin for noise immunity.',
    stats: [
      { value: '100B+', label: 'Transistors (M3)', icon: '⚡' },
      { value: '3nm', label: 'Process node', icon: '🔬' },
      { value: '$574B', label: 'Semiconductor market', icon: '📈' }
    ],
    examples: ['Intel and AMD processors', 'Apple M-series chips', 'Server CPUs', 'Mobile SoCs'],
    companies: ['Intel', 'AMD', 'Apple', 'Qualcomm'],
    futureImpact: 'As transistors shrink below 2nm, maintaining noise margins becomes increasingly challenging, driving innovation in materials and circuit design.',
    color: '#3B82F6'
  },
  {
    icon: '📡',
    title: 'Digital Communication',
    short: 'Data transmission requires robust signal levels',
    tagline: 'Bits traveling through noisy channels',
    description: 'Digital communication systems like USB, HDMI, and Ethernet define strict voltage levels for 0 and 1. Noise margins allow data to travel through cables and across boards without corruption.',
    connection: 'Signal integrity depends on maintaining voltage levels within specified thresholds. The noise margin provides headroom for reflections, crosstalk, and EMI.',
    howItWorks: 'Differential signaling in high-speed interfaces compares two complementary signals, doubling noise immunity. Eye diagrams measure actual noise margins in real systems.',
    stats: [
      { value: '40 Gbps', label: 'USB4 speed', icon: '⚡' },
      { value: '48 Gbps', label: 'HDMI 2.1', icon: '📺' },
      { value: '$52B', label: 'Interface market', icon: '📈' }
    ],
    examples: ['USB connections', 'HDMI video cables', 'Ethernet networking', 'PCIe data buses'],
    companies: ['USB-IF', 'HDMI Licensing', 'IEEE', 'PCI-SIG'],
    futureImpact: 'Faster interfaces like USB5 and PCIe 7.0 will require advanced equalization and error correction to maintain margins at 100+ Gbps speeds.',
    color: '#10B981'
  },
  {
    icon: '🚗',
    title: 'Automotive Electronics',
    short: 'Vehicles operate in extreme electrical environments',
    tagline: 'Reliability in the harshest conditions',
    description: 'Cars contain hundreds of electronic modules that must function despite ignition noise, motor switching, temperature extremes, and vibration. Enhanced noise margins are essential for safety-critical systems.',
    connection: 'Automotive-grade chips have wider noise margins than consumer electronics to handle load dumps, ESD, and EMI from engines and power systems.',
    howItWorks: 'ISO 16750 and AEC-Q100 standards define stringent voltage tolerance requirements. Automotive chips use larger transistors and more robust I/O circuits for reliability.',
    stats: [
      { value: '3,000+', label: 'Chips per vehicle', icon: '🔧' },
      { value: '-40/150°C', label: 'Temp range', icon: '🌡️' },
      { value: '$50B', label: 'Auto chip market', icon: '📈' }
    ],
    examples: ['Engine control units', 'ABS brake systems', 'Infotainment displays', 'ADAS sensors'],
    companies: ['NXP', 'Infineon', 'Texas Instruments', 'Renesas'],
    futureImpact: 'Electric vehicles and autonomous driving demand even higher reliability, pushing noise margin requirements for mission-critical automotive systems.',
    color: '#F59E0B'
  },
  {
    icon: '🏭',
    title: 'Industrial Control Systems',
    short: 'Factory automation requires noise immunity',
    tagline: 'Reliable signals in noisy factories',
    description: 'PLCs and industrial controllers operate alongside motors, welders, and high-power equipment. Extended noise margins and industrial communication protocols ensure reliable operation in electrically hostile environments.',
    connection: 'Industrial voltage standards like 24V logic provide massive noise margins compared to 3.3V CMOS, allowing signals to survive factory floor interference.',
    howItWorks: 'Opto-isolation, differential signaling, and shielded cables create physical barriers to noise. Industrial Ethernet uses robust PHYs designed for high EMI environments.',
    stats: [
      { value: '24V', label: 'Industrial logic', icon: '⚡' },
      { value: '99.99%', label: 'Uptime required', icon: '✅' },
      { value: '$200B', label: 'Automation market', icon: '📈' }
    ],
    examples: ['Assembly line robotics', 'Chemical plant control', 'Power grid SCADA', 'Water treatment systems'],
    companies: ['Siemens', 'Rockwell', 'ABB', 'Schneider Electric'],
    futureImpact: 'Industry 4.0 and smart factories will deploy more sensors and edge computing, requiring robust noise margins for reliable real-time control.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const NoiseMarginRenderer: React.FC<NoiseMarginRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [vdd, setVdd] = useState(3.3);
  const [vih, setVih] = useState(2.0);
  const [vil, setVil] = useState(0.8);
  const [voh, setVoh] = useState(2.9);
  const [vol, setVol] = useState(0.4);
  const [inputVoltage, setInputVoltage] = useState(2.5);
  const [noiseAmplitude, setNoiseAmplitude] = useState(0.3);
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Twist phase - voltage scaling scenario
  const [twistVdd, setTwistVdd] = useState(3.3);

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

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 0.1);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  // Update thresholds when VDD changes
  useEffect(() => {
    setVih(vdd * 0.6);
    setVil(vdd * 0.3);
    setVoh(vdd * 0.9);
    setVol(vdd * 0.1);
  }, [vdd]);

  // Calculate noise margins
  const nmh = voh - vih;
  const nml = vil - vol;

  // Noise calculation
  const noise = isAnimating ? Math.sin(animationTime * 5) * noiseAmplitude : 0;
  const effectiveVoltage = inputVoltage + noise;
  const isValidHigh = effectiveVoltage >= vih;
  const isValidLow = effectiveVoltage <= vil;
  const isUndefined = !isValidHigh && !isValidLow;

  // Twist VDD thresholds
  const twistVih = twistVdd * 0.6;
  const twistVil = twistVdd * 0.3;
  const twistVoh = twistVdd * 0.9;
  const twistVol = twistVdd * 0.1;
  const twistNmh = twistVoh - twistVih;
  const twistNml = twistVil - twistVol;

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
    logicHigh: '#22c55e',
    logicLow: '#3b82f6',
    forbidden: '#ef4444',
    vddColor: '#a855f7',
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
    twist_play: 'Voltage Scaling',
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
        gameType: 'noise-margin',
        gameTitle: 'Noise Margin',
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

  // Voltage Level Visualization SVG Component
  const VoltageVisualization = ({ showNoise = false, customVdd = vdd }: { showNoise?: boolean; customVdd?: number }) => {
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 350 : 400;
    const margin = { top: 50, right: 70, bottom: 50, left: 70 };
    const chartHeight = height - margin.top - margin.bottom;

    const localVih = customVdd * 0.6;
    const localVil = customVdd * 0.3;
    const localVoh = customVdd * 0.9;
    const localVol = customVdd * 0.1;
    const localNmh = localVoh - localVih;
    const localNml = localVil - localVol;

    const vToY = (v: number) => margin.top + chartHeight * (1 - v / customVdd);

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="highRegionGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.logicHigh} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.logicHigh} stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="lowRegionGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.logicLow} stopOpacity="0.1" />
            <stop offset="100%" stopColor={colors.logicLow} stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="forbiddenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.forbidden} stopOpacity="0.2" />
            <stop offset="100%" stopColor={colors.forbidden} stopOpacity="0.2" />
          </linearGradient>
          <filter id="glowFilter2">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          CMOS Logic Voltage Levels (VDD = {customVdd.toFixed(1)}V)
        </text>

        {/* HIGH region */}
        <rect
          x={margin.left}
          y={vToY(customVdd)}
          width={width - margin.left - margin.right}
          height={vToY(localVih) - vToY(customVdd)}
          fill="url(#highRegionGrad)"
        />
        <text x={width - margin.right + 5} y={vToY(customVdd) + 20} fill={colors.logicHigh} fontSize="10" fontWeight="600">
          HIGH
        </text>

        {/* LOW region */}
        <rect
          x={margin.left}
          y={vToY(localVil)}
          width={width - margin.left - margin.right}
          height={vToY(0) - vToY(localVil)}
          fill="url(#lowRegionGrad)"
        />
        <text x={width - margin.right + 5} y={vToY(0) - 10} fill={colors.logicLow} fontSize="10" fontWeight="600">
          LOW
        </text>

        {/* Forbidden region */}
        <rect
          x={margin.left}
          y={vToY(localVih)}
          width={width - margin.left - margin.right}
          height={vToY(localVil) - vToY(localVih)}
          fill="url(#forbiddenGrad)"
        />
        <text x={width/2} y={(vToY(localVih) + vToY(localVil)) / 2 + 4} fill={colors.forbidden} fontSize="10" textAnchor="middle" fontWeight="600">
          FORBIDDEN ZONE
        </text>

        {/* Voltage level lines */}
        {/* VDD */}
        <line x1={margin.left} y1={vToY(customVdd)} x2={width - margin.right} y2={vToY(customVdd)} stroke={colors.vddColor} strokeWidth="2" strokeDasharray="5,3" />
        <text x={margin.left - 5} y={vToY(customVdd) + 4} fill={colors.vddColor} fontSize="10" textAnchor="end" fontWeight="600">VDD</text>
        <text x={margin.left - 5} y={vToY(customVdd) + 16} fill={colors.textMuted} fontSize="9" textAnchor="end">{customVdd.toFixed(1)}V</text>

        {/* VOH */}
        <line x1={margin.left} y1={vToY(localVoh)} x2={width - margin.right} y2={vToY(localVoh)} stroke={colors.logicHigh} strokeWidth="2" />
        <text x={margin.left - 5} y={vToY(localVoh) + 4} fill={colors.logicHigh} fontSize="10" textAnchor="end">VOH</text>

        {/* VIH */}
        <line x1={margin.left} y1={vToY(localVih)} x2={width - margin.right} y2={vToY(localVih)} stroke={colors.logicHigh} strokeWidth="2" strokeDasharray="3,3" />
        <text x={margin.left - 5} y={vToY(localVih) + 4} fill={colors.logicHigh} fontSize="10" textAnchor="end">VIH</text>

        {/* VIL */}
        <line x1={margin.left} y1={vToY(localVil)} x2={width - margin.right} y2={vToY(localVil)} stroke={colors.logicLow} strokeWidth="2" strokeDasharray="3,3" />
        <text x={margin.left - 5} y={vToY(localVil) + 4} fill={colors.logicLow} fontSize="10" textAnchor="end">VIL</text>

        {/* VOL */}
        <line x1={margin.left} y1={vToY(localVol)} x2={width - margin.right} y2={vToY(localVol)} stroke={colors.logicLow} strokeWidth="2" />
        <text x={margin.left - 5} y={vToY(localVol) + 4} fill={colors.logicLow} fontSize="10" textAnchor="end">VOL</text>

        {/* GND */}
        <line x1={margin.left} y1={vToY(0)} x2={width - margin.right} y2={vToY(0)} stroke={colors.textMuted} strokeWidth="2" />
        <text x={margin.left - 5} y={vToY(0) + 4} fill={colors.textMuted} fontSize="10" textAnchor="end">GND</text>

        {/* NMH bracket */}
        <line x1={width - margin.right - 25} y1={vToY(localVoh)} x2={width - margin.right - 25} y2={vToY(localVih)} stroke={colors.success} strokeWidth="2" />
        <line x1={width - margin.right - 30} y1={vToY(localVoh)} x2={width - margin.right - 20} y2={vToY(localVoh)} stroke={colors.success} strokeWidth="2" />
        <line x1={width - margin.right - 30} y1={vToY(localVih)} x2={width - margin.right - 20} y2={vToY(localVih)} stroke={colors.success} strokeWidth="2" />
        <text x={width - margin.right - 12} y={(vToY(localVoh) + vToY(localVih)) / 2 + 3} fill={colors.success} fontSize="9" fontWeight="600">
          NMH
        </text>

        {/* NML bracket */}
        <line x1={width - margin.right - 25} y1={vToY(localVil)} x2={width - margin.right - 25} y2={vToY(localVol)} stroke={colors.success} strokeWidth="2" />
        <line x1={width - margin.right - 30} y1={vToY(localVil)} x2={width - margin.right - 20} y2={vToY(localVil)} stroke={colors.success} strokeWidth="2" />
        <line x1={width - margin.right - 30} y1={vToY(localVol)} x2={width - margin.right - 20} y2={vToY(localVol)} stroke={colors.success} strokeWidth="2" />
        <text x={width - margin.right - 12} y={(vToY(localVil) + vToY(localVol)) / 2 + 3} fill={colors.success} fontSize="9" fontWeight="600">
          NML
        </text>

        {/* Noise margin values */}
        <g transform={`translate(${width - 55}, ${margin.top})`}>
          <rect x="0" y="0" width="50" height="60" rx="6" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1" />
          <text x="25" y="15" textAnchor="middle" fill={colors.textMuted} fontSize="8">Margins</text>
          <text x="25" y="30" textAnchor="middle" fill={colors.success} fontSize="11" fontWeight="700">{localNmh.toFixed(2)}V</text>
          <text x="25" y="42" textAnchor="middle" fill={colors.textMuted} fontSize="8">NMH</text>
          <text x="25" y="55" textAnchor="middle" fill={colors.success} fontSize="11" fontWeight="700">{localNml.toFixed(2)}V</text>
        </g>

        {/* Signal with noise */}
        {showNoise && (
          <g>
            <path
              d={`M ${margin.left} ${vToY(inputVoltage)} ` +
                Array.from({ length: 50 }, (_, i) => {
                  const x = margin.left + (i / 50) * (width - margin.left - margin.right);
                  const noiseVal = Math.sin((animationTime * 5) + i * 0.5) * noiseAmplitude;
                  const y = vToY(Math.max(0, Math.min(customVdd, inputVoltage + noiseVal)));
                  return `L ${x} ${y}`;
                }).join(' ')}
              fill="none"
              stroke={colors.accent}
              strokeWidth="3"
              filter="url(#glowFilter2)"
            />

            <circle
              cx={margin.left + (width - margin.left - margin.right) / 2}
              cy={vToY(Math.max(0, Math.min(customVdd, effectiveVoltage)))}
              r="8"
              fill={isUndefined ? colors.forbidden : isValidHigh ? colors.logicHigh : colors.logicLow}
              stroke="white"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Status box for noise mode */}
        {showNoise && (
          <g transform={`translate(${margin.left + 10}, ${margin.top + 10})`}>
            <rect x="0" y="0" width="100" height="50" fill={colors.bgSecondary} rx="6" stroke={colors.border} strokeWidth="1" />
            <text x="50" y="18" fill={colors.textMuted} fontSize="10" textAnchor="middle">Logic State</text>
            <text x="50" y="38" fill={isUndefined ? colors.forbidden : isValidHigh ? colors.logicHigh : colors.logicLow} fontSize="14" textAnchor="middle" fontWeight="bold">
              {isUndefined ? 'UNDEFINED' : isValidHigh ? 'HIGH (1)' : 'LOW (0)'}
            </text>
          </g>
        )}
      </svg>
    );
  };

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 100,
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
      {validPhases.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: validPhases.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            minHeight: '44px',
            minWidth: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label={phaseLabels[p]}
        >
          <span style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            background: validPhases.indexOf(phase) >= i ? colors.accent : colors.border,
            display: 'block',
          }} />
        </button>
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
          0️⃣1️⃣
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Noise Margin
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "Digital signals are never perfect. They have <span style={{ color: colors.error }}>noise</span>, <span style={{ color: colors.warning }}>voltage drops</span>, and <span style={{ color: colors.vddColor }}>interference</span>. Yet computers work flawlessly billions of times per second. How?"
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
            "The secret is noise margin - the built-in safety zone that separates a solid 1 from a shaky 0. It is the difference between a computer that crashes and one that runs for years without error."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Digital Logic Fundamentals
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore Logic Levels
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'By exact voltage levels - 0V is "0" and VDD is "1"' },
      { id: 'b', text: 'Using threshold regions with safety margins for noise', correct: true },
      { id: 'c', text: 'By measuring current flow, not voltage' },
      { id: 'd', text: 'By how long the signal stays at a level' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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
            How does a CMOS gate determine if an input is logic "1" or logic "0"?
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
                <div style={{ fontSize: '36px', color: colors.accent }}>???V</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Input Signal</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>-&gt;</div>
              <div style={{
                background: colors.bgSecondary,
                padding: '20px 30px',
                borderRadius: '8px',
                border: `2px solid ${colors.accent}`,
              }}>
                <div style={{ fontSize: '24px', color: colors.accent }}>CMOS Gate</div>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>-&gt;</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '36px' }}>0 or 1?</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Output</p>
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

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Noise Margin Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Logic Level Explorer
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust input voltage and add noise to see how thresholds protect signals
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <VoltageVisualization showNoise={true} />
            </div>

            {/* Input voltage slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Input Voltage</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{inputVoltage.toFixed(2)}V</span>
              </div>
              <input
                type="range"
                min="0"
                max={vdd}
                step="0.05"
                value={inputVoltage}
                onChange={(e) => setInputVoltage(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.accent} ${(inputVoltage / vdd) * 100}%, ${colors.border} ${(inputVoltage / vdd) * 100}%)`,
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Noise amplitude slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Noise Amplitude</span>
                <span style={{ ...typo.small, color: colors.error, fontWeight: 600 }}>{noiseAmplitude.toFixed(2)}V</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={noiseAmplitude}
                onChange={(e) => setNoiseAmplitude(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.error} ${noiseAmplitude * 100}%, ${colors.border} ${noiseAmplitude * 100}%)`,
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Control buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
              <button
                onClick={() => {
                  setIsAnimating(!isAnimating);
                  playSound('click');
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isAnimating ? colors.error : colors.success,
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isAnimating ? 'Stop Noise' : 'Add Noise'}
              </button>
              <button
                onClick={() => {
                  setInputVoltage(2.5);
                  setNoiseAmplitude(0.3);
                  setIsAnimating(false);
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
                <div style={{ ...typo.h3, color: colors.logicHigh }}>{nmh.toFixed(2)}V</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>NMH (High Margin)</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.logicLow }}>{nml.toFixed(2)}V</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>NML (Low Margin)</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: isUndefined ? colors.forbidden : isValidHigh ? colors.logicHigh : colors.logicLow }}>
                  {isUndefined ? 'UNDEFINED' : isValidHigh ? 'HIGH' : 'LOW'}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Current State</div>
              </div>
            </div>
          </div>

          {/* Warning when in forbidden zone */}
          {isUndefined && (
            <div style={{
              background: `${colors.forbidden}22`,
              border: `1px solid ${colors.forbidden}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.forbidden, margin: 0 }}>
                Signal in forbidden zone! Logic state is undefined and may cause errors.
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
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Understanding Noise Margins
          </h2>

          <div style={{
            background: `linear-gradient(135deg, ${colors.success}, ${colors.logicHigh})`,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginBottom: '12px' }}>
              Noise Margin Equations
            </div>
            <div style={{ color: 'white', fontSize: '22px', fontWeight: 'bold', fontFamily: 'monospace' }}>
              NMH = VOH - VIH
            </div>
            <div style={{ color: 'white', fontSize: '22px', fontWeight: 'bold', fontFamily: 'monospace', marginTop: '8px' }}>
              NML = VIL - VOL
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.logicHigh }}>VIH (Input High)</strong> - Minimum voltage the chip recognizes as logic HIGH
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.logicLow }}>VIL (Input Low)</strong> - Maximum voltage the chip recognizes as logic LOW
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.logicHigh }}>VOH (Output High)</strong> - Minimum voltage the chip outputs for HIGH (usually greater than VIH)
              </p>
              <p style={{ marginBottom: '0' }}>
                <strong style={{ color: colors.logicLow }}>VOL (Output Low)</strong> - Maximum voltage the chip outputs for LOW (usually less than VIL)
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
              Key Insight: The Safety Gap
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '0' }}>
              The difference between output levels (VOH, VOL) and input thresholds (VIH, VIL) creates the noise margin. This gap absorbs voltage drops, crosstalk, and electrical noise - ensuring reliable digital operation even in noisy environments.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.forbidden, marginBottom: '12px' }}>
              The Forbidden Zone
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Between VIL and VIH lies the forbidden zone. Any signal in this region causes undefined behavior - the gate might output HIGH, LOW, or oscillate unpredictably. Good design ensures signals never linger in this danger zone.
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover the Voltage Challenge
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Noise margins stay the same at any voltage' },
      { id: 'b', text: 'Lower voltages mean smaller noise margins - less room for error', correct: true },
      { id: 'c', text: 'Lower voltages increase noise margins' },
      { id: 'd', text: 'Supply voltage does not affect noise margins' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Voltage Scaling
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            As supply voltages drop (5V to 3.3V to 1.8V to 1.2V), what happens to noise margins?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary }}>
              Modern chips use lower voltages for power efficiency. But does this come at a cost?
            </p>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {[5.0, 3.3, 1.8, 1.2].map(v => (
                <div key={v} style={{
                  background: colors.bgSecondary,
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                }}>
                  <div style={{ color: colors.vddColor, fontWeight: 'bold' }}>{v}V</div>
                  <div style={{ color: colors.textMuted, fontSize: '12px' }}>VDD</div>
                </div>
              ))}
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
              Explore Voltage Scaling
            </button>
          )}
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
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Voltage Scaling Explorer
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Lower the supply voltage and watch noise margins shrink
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <VoltageVisualization showNoise={false} customVdd={twistVdd} />
            </div>

            {/* VDD slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Supply Voltage (VDD)</span>
                <span style={{ ...typo.small, color: colors.vddColor, fontWeight: 600 }}>{twistVdd.toFixed(1)}V</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.1"
                value={twistVdd}
                onChange={(e) => setTwistVdd(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>1.0V (modern)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>5.0V (legacy)</span>
              </div>
            </div>

            {/* Comparison stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.vddColor }}>{twistVdd.toFixed(1)}V</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>VDD</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: twistNmh < 0.3 ? colors.error : colors.success }}>{twistNmh.toFixed(2)}V</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>NMH</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: twistNml < 0.3 ? colors.error : colors.success }}>{twistNml.toFixed(2)}V</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>NML</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.forbidden }}>{(twistVih - twistVil).toFixed(2)}V</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Forbidden</div>
              </div>
            </div>
          </div>

          {/* Warning at low voltages */}
          {(twistNmh < 0.3 || twistNml < 0.3) && (
            <div style={{
              background: `${colors.error}22`,
              border: `1px solid ${colors.error}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
                Warning: Very small noise margins! This design requires careful shielding and layout.
              </p>
            </div>
          )}

          {/* Comparison table */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              Noise Margin Comparison
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
              {[
                { vdd: 5.0, label: '5V CMOS' },
                { vdd: 3.3, label: '3.3V CMOS' },
                { vdd: 1.8, label: '1.8V CMOS' },
                { vdd: 1.2, label: '1.2V CMOS' },
              ].map(item => {
                const itemNmh = (item.vdd * 0.9) - (item.vdd * 0.6);
                return (
                  <div key={item.vdd} style={{
                    background: item.vdd === twistVdd ? `${colors.accent}22` : colors.bgSecondary,
                    padding: '12px 8px',
                    borderRadius: '8px',
                    border: item.vdd === twistVdd ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                  }}>
                    <div style={{ color: colors.textPrimary, fontWeight: 600, fontSize: '14px' }}>{item.label}</div>
                    <div style={{ color: itemNmh < 0.3 ? colors.error : colors.success, fontWeight: 700, fontSize: '18px', marginTop: '4px' }}>
                      {itemNmh.toFixed(2)}V
                    </div>
                    <div style={{ color: colors.textMuted, fontSize: '11px' }}>NMH</div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Implications
          </button>
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
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Low-Voltage Challenge
          </h2>

          <div style={{
            background: `linear-gradient(135deg, ${colors.vddColor}, ${colors.accent})`,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
              Lower Voltage = Smaller Margins
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '8px' }}>
              Modern chips trade noise immunity for power efficiency
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🛡️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Better Shielding Required</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                With smaller margins, every millivolt of noise matters. Ground planes, decoupling capacitors, and proper shielding become critical at low voltages.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>↔️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Differential Signaling</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Using complementary signal pairs effectively doubles the voltage swing, providing better noise immunity even at low supply voltages. This is why LVDS and similar protocols are used for critical paths.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📏</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Shorter Traces</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Shorter signal paths pick up less noise. This drives chip layouts to minimize wire lengths and use local voltage regulators to reduce noise pickup.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔄</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Level Shifters</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                When connecting chips with different supply voltages, level shifters translate signals between voltage domains, ensuring proper noise margins on both sides.
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
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
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
                    ✓
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
                How Noise Margin Connects:
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
                ? 'You understand noise margins and digital logic levels!'
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
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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
          Noise Margin Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how digital logic reliably distinguishes between 0 and 1, even in noisy environments.
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
              'VIH and VIL define input threshold regions',
              'VOH and VOL are guaranteed output levels',
              'NMH = VOH - VIH, NML = VIL - VOL',
              'Lower supply voltages mean smaller noise margins',
              'The forbidden zone causes undefined behavior',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
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

export default NoiseMarginRenderer;
