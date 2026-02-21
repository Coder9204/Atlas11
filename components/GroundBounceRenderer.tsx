'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// ─────────────────────────────────────────────────────────────────────────────
// Ground Bounce (Simultaneous Switching Noise) - Complete 10-Phase Game
// Why digital circuits suffer from noise when multiple outputs switch together
// ─────────────────────────────────────────────────────────────────────────────

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

interface GroundBounceRendererProps {
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

// ─────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    scenario: "A 32-bit data bus on a microcontroller switches from 0x00000000 to 0xFFFFFFFF. The designer notices random bit errors on other signals during this transition.",
    question: "What is the most likely cause of these bit errors?",
    options: [
      { id: 'a', label: "Software bugs in the firmware" },
      { id: 'b', label: "Ground bounce from all 32 outputs switching simultaneously, corrupting signal integrity", correct: true },
      { id: 'c', label: "Insufficient power supply voltage" },
      { id: 'd', label: "Clock frequency is too high" }
    ],
    explanation: "When all 32 outputs switch at once, the combined current surge (di/dt) through the package inductance creates a voltage spike on the internal ground (V = L × di/dt). This raises the chip's ground relative to the board ground, causing other outputs to appear at wrong logic levels."
  },
  {
    scenario: "An engineer reduces ground bounce by 75% simply by changing when outputs switch. No hardware changes were made.",
    question: "What technique did the engineer most likely use?",
    options: [
      { id: 'a', label: "Adding decoupling capacitors" },
      { id: 'b', label: "Staggering output transitions so fewer switch simultaneously", correct: true },
      { id: 'c', label: "Reducing the supply voltage" },
      { id: 'd', label: "Using thicker PCB traces" }
    ],
    explanation: "Ground bounce is proportional to di/dt - the rate of current change. By staggering outputs (adding small delays between transitions), fewer outputs switch at the same instant, reducing the total di/dt and therefore the ground bounce voltage."
  },
  {
    scenario: "Two identical chips are compared: one in a DIP package (through-hole) and one in a BGA package (ball grid array). The BGA exhibits much less ground bounce.",
    question: "Why does the BGA package have better ground bounce performance?",
    options: [
      { id: 'a', label: "BGA packages use higher quality silicon" },
      { id: 'b', label: "BGA packages have much shorter lead lengths, resulting in lower inductance", correct: true },
      { id: 'c', label: "BGA packages run cooler, reducing noise" },
      { id: 'd', label: "BGA packages have built-in filtering" }
    ],
    explanation: "Inductance is proportional to lead length. DIP packages have long leads (often 5-10mm), while BGA packages have short solder balls (<1mm). Since V = L × di/dt, lower inductance means less ground bounce for the same switching current."
  },
  {
    scenario: "A high-speed FPGA design works perfectly on the bench but fails randomly in production. Analysis shows the failure rate correlates with simultaneous output switching patterns.",
    question: "What should the designer check first?",
    options: [
      { id: 'a', label: "The FPGA firmware for timing violations" },
      { id: 'b', label: "Power and ground plane design and decoupling capacitor placement", correct: true },
      { id: 'c', label: "The quality of the FPGA chips" },
      { id: 'd', label: "The ambient temperature in production" }
    ],
    explanation: "Production boards may have different power/ground plane impedances or decoupling capacitor placement than bench prototypes. These affect how quickly charge can be supplied during switching, directly impacting ground bounce magnitude."
  },
  {
    scenario: "An ASIC designer needs to drive 64 outputs that must all change simultaneously. The estimated ground bounce exceeds the noise margin.",
    question: "Which design change would most effectively reduce ground bounce?",
    options: [
      { id: 'a', label: "Use slower slew rate output drivers", correct: true },
      { id: 'b', label: "Increase the output drive strength" },
      { id: 'c', label: "Reduce the number of ground pins" },
      { id: 'd', label: "Use higher supply voltage" }
    ],
    explanation: "Slew rate directly affects di/dt. Slower rising/falling edges mean lower di/dt, which reduces V = L × di/dt. Many chips offer programmable slew rate control specifically for managing ground bounce vs. speed tradeoffs."
  },
  {
    scenario: "A memory controller experiences data corruption when reading from DRAM. The problem is worse when reading long sequential bursts.",
    question: "How does simultaneous switching noise (SSN) cause this corruption?",
    options: [
      { id: 'a', label: "The DRAM chips overheat during long reads" },
      { id: 'b', label: "Multiple data bits transitioning together cause ground bounce that corrupts the strobe signal timing", correct: true },
      { id: 'c', label: "The memory controller runs out of buffer space" },
      { id: 'd', label: "Sequential reads cause address line crosstalk" }
    ],
    explanation: "During burst reads, many data bits change simultaneously. The resulting ground bounce affects the data strobe (DQS) timing, causing the controller to sample data at the wrong moment. This is why modern DDR uses differential signaling and careful SSN management."
  },
  {
    scenario: "A board designer adds 10 extra ground pins to a connector between two boards. Ground bounce problems decrease significantly.",
    question: "Why did adding ground pins help reduce ground bounce?",
    options: [
      { id: 'a', label: "More ground pins provide a better thermal path" },
      { id: 'b', label: "Parallel ground pins reduce total inductance (L_total = L/n for n parallel paths)", correct: true },
      { id: 'c', label: "Extra pins increase the connector's voltage rating" },
      { id: 'd', label: "More ground pins filter out high-frequency noise" }
    ],
    explanation: "Inductance adds in parallel like resistors: L_total = L/n. By adding 10 ground pins, the effective inductance drops to 1/11 of the original. Since V = L × di/dt, lower inductance means proportionally less ground bounce."
  },
  {
    scenario: "An oscilloscope measurement shows the chip's ground pin bouncing 800mV during output switching. The logic threshold is at 50% of 3.3V supply.",
    question: "Why is this 800mV ground bounce dangerous?",
    options: [
      { id: 'a', label: "It might damage the chip from overvoltage" },
      { id: 'b', label: "A low output (0V internal) appears as 0.8V externally, which is close to the 1.65V threshold and reduces noise margin", correct: true },
      { id: 'c', label: "The power supply might shut down" },
      { id: 'd', label: "The oscilloscope might give false readings" }
    ],
    explanation: "When the chip's ground bounces up by 800mV, all outputs referenced to that ground also rise by 800mV. A logic low (0V internal) becomes 0.8V external. With a 1.65V threshold, the noise margin is reduced from 1.65V to only 0.85V, making false triggering possible."
  },
  {
    scenario: "A designer uses V = L × di/dt to calculate expected ground bounce. With L = 5nH and di/dt = 100mA/ns, the result is 500mV.",
    question: "If the number of simultaneously switching outputs doubles, what happens to ground bounce?",
    options: [
      { id: 'a', label: "It stays at 500mV because inductance doesn't change" },
      { id: 'b', label: "It roughly doubles to 1V because di/dt doubles", correct: true },
      { id: 'c', label: "It drops to 250mV due to current sharing" },
      { id: 'd', label: "It quadruples to 2V due to nonlinear effects" }
    ],
    explanation: "More switching outputs means more total current change (higher di/dt). If each output contributes 100mA/ns and you double the outputs, di/dt becomes 200mA/ns. V = L × di/dt = 5nH × 200mA/ns = 1000mV = 1V."
  },
  {
    scenario: "A CPU design team implements 'ground bounce aware' place-and-route software. Critical signals are routed near power/ground pins.",
    question: "Why does placing critical signals near power/ground pins help?",
    options: [
      { id: 'a', label: "Power pins provide shielding from electromagnetic interference" },
      { id: 'b', label: "Signals near ground pins see less effective inductance due to shorter return current paths", correct: true },
      { id: 'c', label: "Power pins run cooler, improving signal integrity" },
      { id: 'd', label: "It makes the chip easier to manufacture" }
    ],
    explanation: "The inductance seen by a signal depends on the return current path. Signals near ground pins have shorter return paths with lower inductance. This reduces V = L × di/dt for those critical signals, improving noise immunity."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '💻',
    title: 'High-Speed Processors',
    short: 'Managing SSN in modern CPUs',
    tagline: 'Billions of transistors, millions of simultaneous switches',
    description: 'Modern CPUs contain billions of transistors that can switch simultaneously. Ground bounce management is critical in the power delivery network and I/O interfaces. Without careful design, CPUs would be limited to much lower frequencies.',
    connection: 'When a CPU executes an instruction, thousands of transistors may switch simultaneously. The package and die must be designed with ground bounce in mind - using multiple power/ground planes, careful bump placement, and on-die decoupling capacitors.',
    howItWorks: 'CPUs use multi-layer packages with dedicated power/ground planes to minimize inductance. On-die capacitors (MIM capacitors) provide local charge storage. Critical paths are placed near power/ground bumps. Slew rate control limits di/dt.',
    stats: [
      { value: '50mV', label: 'Max ground bounce target', icon: '⚡' },
      { value: '5 GHz', label: 'Clock frequency', icon: '🔌' },
      { value: '100W', label: 'Typical power budget', icon: '📊' }
    ],
    examples: ['Intel Core processors', 'AMD Ryzen CPUs', 'Apple M-series chips', 'ARM Cortex processors'],
    companies: ['Intel', 'AMD', 'Apple', 'Qualcomm'],
    futureImpact: 'As transistors shrink and speeds increase, ground bounce becomes more challenging. 3D packaging and chiplet architectures require new SSN management strategies.',
    color: '#3B82F6'
  },
  {
    icon: '🎮',
    title: 'DDR Memory Interfaces',
    short: 'Ensuring data integrity at high speeds',
    tagline: 'Every bit matters at 5+ Gbps',
    description: 'DDR5 memory operates at over 5 GT/s with 64-bit wide data buses. Simultaneous switching of 64 data bits plus address and control signals creates massive ground bounce challenges that require sophisticated mitigation.',
    connection: 'Memory interfaces are extremely sensitive to ground bounce because timing margins are measured in picoseconds. Ground bounce on DQS (data strobe) signals causes the memory controller to sample data at the wrong moment, corrupting reads.',
    howItWorks: 'DDR interfaces use differential signaling for strobes, on-die termination (ODT), and careful impedance matching. Write leveling and read training compensate for signal skew. Multiple Vss balls minimize package inductance.',
    stats: [
      { value: '5600+', label: 'MT/s transfer rate', icon: '🚀' },
      { value: '<100ps', label: 'Timing margin', icon: '⏱️' },
      { value: '64-bit', label: 'Data bus width', icon: '📡' }
    ],
    examples: ['DDR5 DIMM modules', 'LPDDR5 in smartphones', 'GDDR6 graphics memory', 'HBM for AI accelerators'],
    companies: ['Samsung', 'Micron', 'SK Hynix', 'JEDEC'],
    futureImpact: 'DDR6 and beyond will push data rates higher, requiring even tighter SSN control. New architectures like processing-in-memory may reduce data movement and associated switching noise.',
    color: '#10B981'
  },
  {
    icon: '📡',
    title: 'High-Speed SerDes',
    short: 'Multi-gigabit serial links',
    tagline: 'Clean signals at 100+ Gbps',
    description: 'Serializer/Deserializer (SerDes) circuits convert parallel data to high-speed serial streams. PCIe 5.0 runs at 32 GT/s per lane. Ground bounce from parallel-to-serial conversion can inject jitter and corrupt data.',
    connection: 'SerDes operates at the edge of what silicon can achieve. Even small ground bounce creates jitter that closes the eye diagram. The parallel interface inside the SerDes must be carefully designed to minimize SSN during the serialization process.',
    howItWorks: 'SerDes uses equalization, clock and data recovery (CDR), and forward error correction (FEC). The serializer staggers bit transitions. Low-inductance flip-chip packages minimize ground bounce. Differential signaling rejects common-mode noise.',
    stats: [
      { value: '112 Gbps', label: 'Per-lane speed (PAM4)', icon: '⚡' },
      { value: '<1ps RMS', label: 'Jitter budget', icon: '📈' },
      { value: '10^-15', label: 'Target BER', icon: '🎯' }
    ],
    examples: ['PCIe Gen 5/6', 'USB4', '400G Ethernet', 'Thunderbolt 4'],
    companies: ['Broadcom', 'Marvell', 'Intel', 'Synopsys'],
    futureImpact: '224 Gbps SerDes is in development, pushing ground bounce requirements to new extremes. Optical interconnects may eventually replace electrical links for the highest speeds.',
    color: '#8B5CF6'
  },
  {
    icon: '🔋',
    title: 'Power Management ICs',
    short: 'Switching regulators and ground bounce',
    tagline: 'High current, high di/dt challenges',
    description: 'DC-DC converters switch amps of current at MHz frequencies. The power stage creates extreme di/dt that can corrupt sensitive analog circuits on the same die. Managing ground bounce is essential for mixed-signal integration.',
    connection: 'In a buck converter, the high-side switch turning off and low-side turning on creates a di/dt of hundreds of amps per microsecond. Without careful layout, this ground bounce couples into feedback networks and causes instability.',
    howItWorks: 'PMICs use separate ground domains (PGND for power, AGND for analog). Kelvin sensing ensures accurate voltage measurement. Guard rings and deep trenches isolate sensitive circuits. Soft switching reduces di/dt.',
    stats: [
      { value: '100A+', label: 'Switched current', icon: '⚡' },
      { value: '1MHz+', label: 'Switching frequency', icon: '🔄' },
      { value: '<1mV', label: 'Ripple target', icon: '📊' }
    ],
    examples: ['Phone charger ICs', 'CPU voltage regulators', 'Battery management', 'LED drivers'],
    companies: ['Texas Instruments', 'Analog Devices', 'Infineon', 'Monolithic Power'],
    futureImpact: 'GaN and SiC power devices switch faster than silicon, creating even higher di/dt. New circuit topologies and packaging approaches will be needed to manage ground bounce.',
    color: '#F59E0B'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const GroundBounceRenderer: React.FC<GroundBounceRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const { isMobile } = useViewport();
// Simulation state
  const [numOutputs, setNumOutputs] = useState(8); // Number of switching outputs
  const [packageInductance, setPackageInductance] = useState(5); // nH
  const [slewRate, setSlewRate] = useState(1); // V/ns (affects di/dt)
  const [isSimulating, setIsSimulating] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [switchPhase, setSwitchPhase] = useState(0); // 0-100 for animation

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
// Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Simulation animation
  useEffect(() => {
    if (isSimulating) {
      const timer = setInterval(() => {
        setSwitchPhase(p => {
          if (p >= 100) {
            setIsSimulating(false);
            return 0;
          }
          return p + 2;
        });
      }, 30);
      return () => clearInterval(timer);
    }
  }, [isSimulating]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#EF4444', // Red for warning/noise theme
    accentGlow: 'rgba(239, 68, 68, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    signal: '#3B82F6', // Blue for digital signals
    ground: '#10B981', // Green for ground
    noise: '#F59E0B', // Yellow/orange for noise
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
    twist_play: 'Explore Lab',
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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // Calculate ground bounce voltage: V = L × di/dt
  // di/dt depends on: number of outputs × current per output × slew rate
  const calculateGroundBounce = useCallback(() => {
    const currentPerOutput = 20; // mA per output (typical CMOS drive)
    const totalCurrent = numOutputs * currentPerOutput; // mA
    const diDt = (totalCurrent * slewRate) / 1; // mA/ns = A/us
    const bounceVoltage = packageInductance * diDt / 1000; // V = nH × mA/ns = mV, convert to V
    return {
      bounceVoltage: bounceVoltage,
      totalCurrent: totalCurrent,
      diDt: diDt,
      isSafe: bounceVoltage < 0.4, // Less than 400mV noise margin for 3.3V logic
    };
  }, [numOutputs, packageInductance, slewRate]);

  const bounceData = calculateGroundBounce();

  // Ground Bounce Visualization Component
  const GroundBounceVisualization = ({ showAnimation = true }: { showAnimation?: boolean }) => {
    const width = isMobile ? 360 : 520;
    const height = isMobile ? 300 : 380;
    const padding = { top: 40, right: 30, bottom: 55, left: 65 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    // Calculate time points for the waveforms
    const timePoints = 100;
    const switchTime = 30; // When the switching happens (30% through)
    const settleTime = 70; // When things settle (70% through)

    // Generate output signal waveform
    const getOutputSignal = (t: number) => {
      if (t < switchTime) return 0;
      if (t > settleTime) return 3.3;
      const progress = (t - switchTime) / (settleTime - switchTime);
      return 3.3 * Math.min(1, progress * 2);
    };

    // Generate ground bounce waveform - amplified for visual clarity
    const displayScale = Math.max(1, 2.0 / Math.max(bounceData.bounceVoltage, 0.1));
    const getGroundBounce = (t: number) => {
      if (t < switchTime || t > settleTime + 10) return 0;
      const relativeT = t - switchTime;
      const peakTime = 5; // Peak bounce happens quickly
      const decay = Math.exp(-relativeT / 15);
      const bounce = bounceData.bounceVoltage * displayScale * Math.sin((relativeT / peakTime) * Math.PI) * decay;
      return Math.max(0, bounce);
    };

    // Get effective output (internal signal + ground bounce)
    const getEffectiveOutput = (t: number) => {
      return getOutputSignal(t) + getGroundBounce(t);
    };

    // Animation progress
    const animProgress = showAnimation ? switchPhase : 100;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Ground Bounce visualization">
        <defs>
          <linearGradient id="bounceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.noise} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.noise} stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="signalGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={colors.signal} stopOpacity="0.6" />
            <stop offset="100%" stopColor={colors.signal} stopOpacity="1" />
          </linearGradient>
          <filter id="glowFilter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="markerGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        <g className="grid-lines">
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <line
            key={`grid-${frac}`}
            x1={padding.left}
            y1={padding.top + frac * plotHeight}
            x2={padding.left + plotWidth}
            y2={padding.top + frac * plotHeight}
            stroke={colors.border}
            strokeDasharray="3,3"
            opacity={0.5}
          />
        ))}
        </g>

        {/* Axes */}
        <g className="axes">
        <line
          x1={padding.left}
          y1={padding.top + plotHeight}
          x2={padding.left + plotWidth}
          y2={padding.top + plotHeight}
          stroke={colors.textSecondary}
          strokeWidth="2"
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + plotHeight}
          stroke={colors.textSecondary}
          strokeWidth="2"
        />
        </g>

        {/* Axis labels */}
        <text
          x={padding.left + plotWidth / 2}
          y={height - 10}
          fill={colors.textSecondary}
          fontSize="12"
          textAnchor="middle"
        >
          Time (ns)
        </text>
        <text
          x={12}
          y={padding.top + plotHeight / 2 + 60}
          fill={colors.textSecondary}
          fontSize="12"
          textAnchor="middle"
          transform={`rotate(-90, 12, ${padding.top + plotHeight / 2 + 60})`}
        >
          Voltage (V)
        </text>

        {/* Y-axis scale */}
        <text x={padding.left - 8} y={padding.top + 4} fill={colors.textMuted} fontSize="11" textAnchor="end">4V</text>
        <text x={padding.left - 8} y={padding.top + plotHeight / 2} fill={colors.textMuted} fontSize="11" textAnchor="end">2V</text>
        <text x={padding.left - 8} y={padding.top + plotHeight} fill={colors.textMuted} fontSize="11" textAnchor="end">0V</text>

        {/* Logic threshold line */}
        <line
          x1={padding.left}
          y1={padding.top + plotHeight - (1.65 / 4) * plotHeight}
          x2={padding.left + plotWidth}
          y2={padding.top + plotHeight - (1.65 / 4) * plotHeight}
          stroke={colors.warning}
          strokeDasharray="5,5"
          opacity={0.6}
        />
        <text
          x={padding.left + plotWidth - 5}
          y={padding.top + plotHeight - (1.65 / 4) * plotHeight - 5}
          fill={colors.warning}
          fontSize="11"
          textAnchor="end"
        >
          Threshold (1.65V)
        </text>

        {/* Ideal ground line */}
        <line
          x1={padding.left}
          y1={padding.top + plotHeight}
          x2={padding.left + plotWidth}
          y2={padding.top + plotHeight}
          stroke={colors.ground}
          strokeWidth="2"
          opacity={0.3}
        />

        {/* Waveforms group */}
        <g className="waveforms">
        {/* Ground bounce waveform */}
        <path
          d={Array.from({ length: Math.min(timePoints, animProgress) }, (_, i) => {
            const t = i;
            const bounce = getGroundBounce(t);
            const x = padding.left + (t / timePoints) * plotWidth;
            const y = padding.top + plotHeight - (bounce / 4) * plotHeight;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ')}
          fill="none"
          stroke={colors.noise}
          strokeWidth="3"
          opacity={0.8}
          filter="url(#glowFilter)"
        />

        {/* Output signal waveform */}
        <path
          d={Array.from({ length: Math.min(timePoints, animProgress) }, (_, i) => {
            const t = i;
            const signal = getOutputSignal(t);
            const x = padding.left + (t / timePoints) * plotWidth;
            const y = padding.top + plotHeight - (signal / 4) * plotHeight;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ')}
          fill="none"
          stroke={colors.signal}
          strokeWidth="2"
        />

        {/* Effective output (with bounce) */}
        {bounceData.bounceVoltage > 0.1 && (
          <path
            d={Array.from({ length: Math.min(timePoints, animProgress) }, (_, i) => {
              const t = i;
              const effective = getEffectiveOutput(t);
              const x = padding.left + (t / timePoints) * plotWidth;
              const y = padding.top + plotHeight - (effective / 4) * plotHeight;
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')}
            fill="none"
            stroke={colors.error}
            strokeWidth="2"
            strokeDasharray="4,2"
            opacity={0.8}
          />
        )}

        </g>

        {/* Legend - absolute positioning to avoid text overlap */}
        <rect x={padding.left + 10} y={padding.top + 10} width="12" height="3" fill={colors.signal} />
        <text x={padding.left + 28} y={padding.top + 14} fill={colors.textSecondary} fontSize="11">Output Signal</text>
        <rect x={padding.left + 10} y={padding.top + 24} width="12" height="3" fill={colors.noise} />
        <text x={padding.left + 28} y={padding.top + 28} fill={colors.textSecondary} fontSize="11">Ground Bounce</text>
        {bounceData.bounceVoltage > 0.1 && (
          <>
            <rect x={padding.left + 10} y={padding.top + 38} width="12" height="3" fill={colors.error} opacity={0.8} />
            <text x={padding.left + 28} y={padding.top + 42} fill={colors.textSecondary} fontSize="11">Effective Output</text>
          </>
        )}

        {/* Threshold reference marker on right side */}
        <circle
          cx={padding.left + plotWidth - 10}
          cy={padding.top + plotHeight - (1.65 / 4) * plotHeight}
          r="4"
          fill={colors.warning}
          opacity={0.5}
        />

        {/* Interactive marker at current bounce peak */}
        <circle
          cx={padding.left + (numOutputs / 32) * plotWidth * 0.7 + plotWidth * 0.15}
          cy={padding.top + plotHeight - (bounceData.bounceVoltage * displayScale / 4) * plotHeight}
          r="8"
          fill={colors.noise}
          stroke="white"
          strokeWidth="2"
          filter="url(#markerGlow)"
        >
          <animate attributeName="r" values="7;9;7" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* Bounce peak annotation */}
        {animProgress > 40 && bounceData.bounceVoltage > 0.1 && (
          <text
            x={padding.left + (35 / 100) * plotWidth + 15}
            y={padding.top + plotHeight - (bounceData.bounceVoltage * displayScale / 4) * plotHeight - 10}
            fill={colors.noise}
            fontSize="11"
            fontWeight="600"
          >
            {(bounceData.bounceVoltage * 1000).toFixed(0)}mV
          </text>
        )}

        {/* Formula annotation */}
        <text
          x={padding.left + plotWidth - 5}
          y={padding.top + plotHeight + 40}
          fill={colors.accent}
          fontSize="12"
          fontWeight="700"
          textAnchor="end"
        >
          V = L × di/dt
        </text>

        {/* Title */}
        <title>Ground Bounce Voltage Waveform</title>
      </svg>
    );
  };

  // Output switching visualization
  const OutputsVisualization = () => {
    const width = isMobile ? 340 : 400;
    const height = 160;
    const outputWidth = Math.min(30, (width - 80) / numOutputs - 4);
    const startX = (width - (numOutputs * (outputWidth + 4) - 4)) / 2;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet">
        {/* Chip outline */}
        <rect
          x={20}
          y={20}
          width={width - 40}
          height={60}
          fill={colors.bgSecondary}
          stroke={colors.border}
          strokeWidth="2"
          rx="4"
        />
        <text x={width / 2} y={50} fill={colors.textSecondary} fontSize="12" textAnchor="middle">
          IC Package (L = {packageInductance}nH)
        </text>

        {/* Output pins */}
        {Array.from({ length: numOutputs }, (_, i) => {
          const x = startX + i * (outputWidth + 4);
          const isHigh = switchPhase > 30 + i * 2; // Slight stagger in visualization
          return (
            <g key={i}>
              {/* Pin */}
              <rect
                x={x}
                y={80}
                width={outputWidth}
                height={40}
                fill={isHigh ? colors.signal : colors.bgSecondary}
                stroke={colors.border}
                strokeWidth="1"
                rx="2"
              />
              {/* Current arrow when switching */}
              {isSimulating && switchPhase > 25 && switchPhase < 60 && (
                <path
                  d={`M ${x + outputWidth / 2} 90 L ${x + outputWidth / 2} 115`}
                  stroke={colors.noise}
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                  opacity={(1 - (switchPhase - 30) / 30)}
                />
              )}
            </g>
          );
        })}

        {/* Arrow marker definition */}
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill={colors.noise} />
          </marker>
        </defs>

        {/* Ground rail */}
        <rect x={20} y={130} width={width - 40} height={20} fill={colors.ground} opacity={0.3} rx="2" />
        <text x={width / 2} y={145} fill={colors.textSecondary} fontSize="11" textAnchor="middle">
          Ground Rail ({bounceData.bounceVoltage > 0.1 ? `bouncing ${(bounceData.bounceVoltage * 1000).toFixed(0)}mV` : 'stable'})
        </text>
      </svg>
    );
  };

  // Navigation bar component (fixed position with zIndex >= 1000)
  const renderNavigationBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: colors.bgSecondary,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '20px' }}>⚡</span>
        <span style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>Ground Bounce</span>
      </div>
      <div style={{ ...typo.small, color: colors.textSecondary }}>
        {phaseLabels[phase]}
      </div>
      <div style={{
        height: '4px',
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </nav>
  );

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 1000,
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
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
      background: colors.bgPrimary,
      zIndex: 1000,
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            minHeight: '44px',
            width: phase === p ? '24px' : '8px',
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
    background: `linear-gradient(135deg, ${colors.accent}, #DC2626)`,
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

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingTop: '80px',
        paddingBottom: '16px',
        textAlign: 'center',
        overflowY: 'auto' as const,
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'shake 0.5s infinite',
        }}>
          ⚡🔌
        </div>
        <style>{`@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Ground Bounce: The Hidden Noise
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          &quot;When 32 outputs switch at once, why does the chip sometimes lie about its own signals? The answer involves <span style={{ color: colors.accent }}>invisible inductance</span> and the speed of electrons.&quot;
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{
            fontFamily: 'monospace',
            fontSize: isMobile ? '14px' : '16px',
            color: colors.accent,
            marginBottom: '12px',
          }}>
            V = L × di/dt
          </div>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
            &quot;Every wire has inductance. When current changes fast, voltage appears. When millions of transistors switch together... chaos.&quot;
          </p>
          <p style={{ ...typo.small, color: 'rgba(107, 114, 128, 0.8)', marginTop: '8px' }}>
            — Digital Design Principle
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => { playSound('click'); prevPhase(); }}
            style={{
              padding: '14px 28px',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textSecondary,
              fontSize: '16px',
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            Back
          </button>
          <button
            onClick={() => { playSound('click'); nextPhase(); }}
            style={primaryButtonStyle}
          >
            Start Exploring →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Nothing special - ground is always at 0V by definition' },
      { id: 'b', text: 'The chip\'s internal ground voltage spikes, making outputs appear at wrong levels' },
      { id: 'c', text: 'The supply voltage drops, slowing down the chip' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        paddingBottom: '16px',
        overflowY: 'auto' as const,
      }}>
        {renderNavigationBar()}
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
            A microcontroller switches all 32 data outputs from LOW to HIGH simultaneously. What happens to the ground reference inside the chip?
          </h2>

          {/* SVG diagram showing the scenario */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg width={isMobile ? 300 : 400} height={200} viewBox={`0 0 ${isMobile ? 300 : 400} 200`} style={{ background: colors.bgCard }} preserveAspectRatio="xMidYMid meet">
              {/* IC Package */}
              <rect x={50} y={40} width={isMobile ? 200 : 300} height={60} fill={colors.bgSecondary} stroke={colors.signal} strokeWidth="2" rx="4" />
              <text x={isMobile ? 150 : 200} y={70} fill={colors.textPrimary} fontSize="14" textAnchor="middle">IC Package</text>

              {/* Output pins */}
              {Array.from({ length: 8 }, (_, i) => (
                <g key={i}>
                  <rect
                    x={70 + i * (isMobile ? 22 : 32)}
                    y={100}
                    width={isMobile ? 16 : 24}
                    height={30}
                    fill={colors.signal}
                    stroke={colors.border}
                    rx="2"
                  />
                </g>
              ))}

              {/* Ground rail with question mark */}
              <rect x={50} y={150} width={isMobile ? 200 : 300} height={20} fill={colors.ground} opacity={0.3} rx="2" />
              <text x={isMobile ? 150 : 200} y={165} fill={colors.textSecondary} fontSize="12" textAnchor="middle">Ground Rail - What happens here?</text>

              {/* Arrows showing current flow */}
              <path d={`M ${isMobile ? 100 : 120} 100 L ${isMobile ? 100 : 120} 145`} stroke={colors.warning} strokeWidth="2" strokeDasharray="4,4" markerEnd="url(#predictArrow)" />
              <path d={`M ${isMobile ? 180 : 250} 100 L ${isMobile ? 180 : 250} 145`} stroke={colors.warning} strokeWidth="2" strokeDasharray="4,4" markerEnd="url(#predictArrow)" />

              {/* Arrow marker */}
              <defs>
                <marker id="predictArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <polygon points="0 0, 6 3, 0 6" fill={colors.warning} />
                </marker>
              </defs>

              {/* Label */}
              <text x={isMobile ? 150 : 200} y={25} fill={colors.textSecondary} fontSize="11" textAnchor="middle">32 outputs switching LOW to HIGH</text>

              {/* Legend */}
              <g transform="translate(10, 180)">
                <rect x="0" y="0" width="10" height="10" fill={colors.signal} />
                <text x="15" y="9" fill={colors.textSecondary} fontSize="11">Output pins</text>
                <rect x={isMobile ? 80 : 100} y="0" width="10" height="10" fill={colors.ground} opacity={0.5} />
                <text x={isMobile ? 95 : 115} y="9" fill={colors.textSecondary} fontSize="11">Ground</text>
              </g>
            </svg>
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
                  minHeight: '44px',
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

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              onClick={() => { playSound('click'); prevPhase(); }}
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.textSecondary,
                fontSize: '16px',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              Back
            </button>
            {prediction && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, flex: 1 }}
              >
                See the Result →
              </button>
            )}
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Ground Bounce Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        paddingBottom: '16px',
        overflowY: 'auto',
        flex: 1,
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '0 auto', overflowY: 'auto', flex: 1, paddingTop: '60px', paddingBottom: '16px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Ground Bounce Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '12px' }}>
            Adjust the number of switching outputs and watch ground bounce grow
          </p>
          <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '12px', fontStyle: 'italic' }}>
            Observe: Watch how the ground voltage (yellow) spikes when outputs switch. Try increasing outputs to see the effect.
          </p>
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px', background: colors.bgCard, padding: '12px', borderRadius: '8px' }}>
            Real-World Relevance: This exact phenomenon affects every modern processor, memory interface, and high-speed digital system. Engineers at Intel, AMD, and NVIDIA battle ground bounce daily to achieve multi-GHz clock speeds.
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <GroundBounceVisualization />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <OutputsVisualization />
                </div>

                {/* Legend Panel */}
                <div style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px', fontWeight: 600 }}>Legend:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '20px', height: '4px', background: colors.signal, borderRadius: '2px' }} />
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Output Signal</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '20px', height: '4px', background: colors.noise, borderRadius: '2px' }} />
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Ground Bounce</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '20px', height: '4px', background: colors.error, borderRadius: '2px', opacity: 0.8 }} />
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Effective Output</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '20px', height: '2px', background: colors.warning, borderRadius: '2px' }} />
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Logic Threshold (1.65V)</span>
                  </div>
                  </div>
                </div>

                {/* Results display */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '16px',
                }}>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.noise }}>{(bounceData.bounceVoltage * 1000).toFixed(0)}mV</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Ground Bounce</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.signal }}>{bounceData.totalCurrent}mA</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Total Current</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      ...typo.h3,
                      color: bounceData.isSafe ? colors.success : colors.error
                    }}>
                      {bounceData.isSafe ? 'SAFE' : 'DANGER'}
                    </div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Status</div>
                  </div>
                </div>
              </div>

              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Number of outputs slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Switching Outputs</span>
                    <span style={{ height: '20px', ...typo.small, color: colors.signal, fontWeight: 600 }}>{numOutputs}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="32"
                    value={numOutputs}
                    onChange={(e) => setNumOutputs(parseInt(e.target.value))}
                    style={{
                      touchAction: 'pan-y',
                      width: '100%',
                      height: '20px',
                      borderRadius: '4px',
                      background: `linear-gradient(to right, ${colors.signal} ${(numOutputs / 32) * 100}%, ${colors.border} ${(numOutputs / 32) * 100}%)`,
                      cursor: 'pointer',
                      WebkitAppearance: 'none' as const,
                      accentColor: colors.signal,
                    }}
                  />
                </div>

                {/* Slew rate slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Slew Rate (Speed)</span>
                    <span style={{ height: '20px', ...typo.small, color: colors.warning, fontWeight: 600 }}>{slewRate} V/ns</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={slewRate}
                    onChange={(e) => setSlewRate(parseFloat(e.target.value))}
                    style={{
                      touchAction: 'pan-y',
                      width: '100%',
                      height: '20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      WebkitAppearance: 'none' as const,
                      accentColor: colors.warning,
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>Slow</span>
                    <span style={{ ...typo.small, color: colors.textMuted }}>Fast</span>
                  </div>
                </div>

                {/* Simulate button */}
                <button
                  onClick={() => { playSound('click'); setSwitchPhase(0); setIsSimulating(true); }}
                  disabled={isSimulating}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isSimulating ? colors.border : colors.signal,
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: isSimulating ? 'not-allowed' : 'pointer',
                    minHeight: '44px',
                  }}
                >
                  {isSimulating ? 'Simulating...' : 'Trigger Switching Event'}
                </button>
              </div>
            </div>
          </div>

          {/* Discovery prompt */}
          {bounceData.bounceVoltage > 0.4 && (
            <div style={{
              background: `${colors.error}22`,
              border: `1px solid ${colors.error}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
                Ground bounce exceeds safe limits! This could cause bit errors.
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand Why →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const predictionWasCorrect = prediction === 'b';
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        paddingBottom: '16px',
        overflowY: 'auto',
        flex: 1,
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '0 auto', overflowY: 'auto', flex: 1, paddingTop: '60px', paddingBottom: '16px' }}>
          {/* Reference user's prediction */}
          <div style={{
            background: predictionWasCorrect ? `${colors.success}22` : `${colors.warning}22`,
            border: `1px solid ${predictionWasCorrect ? colors.success : colors.warning}44`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: predictionWasCorrect ? colors.success : colors.warning, margin: 0 }}>
              {predictionWasCorrect
                ? 'Your prediction was correct! You predicted that the chip\'s internal ground voltage spikes, causing output level errors.'
                : 'Your prediction helped frame the experiment. As you observed, the ground voltage actually spikes when outputs switch simultaneously.'}
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Ground Bounce
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{
              fontFamily: 'monospace',
              fontSize: isMobile ? '24px' : '32px',
              color: colors.accent,
              textAlign: 'center',
              marginBottom: '24px',
            }}>
              V = L × di/dt
            </div>

            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>L (Inductance):</strong> Every wire and lead has inductance. Package pins might have 5-15nH each.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>di/dt (Current change rate):</strong> When outputs switch from LOW to HIGH, current surges through the ground pin. More outputs = more current change.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>V (Voltage spike):</strong> The faster the current changes through the inductance, the larger the voltage spike on the ground rail.
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
              Key Insight
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              When the chip's internal ground bounces up by 500mV, a logic LOW (0V internal) appears as 500mV to the outside world. With noise margins already tight, this can cause the receiving chip to misread the signal as HIGH!
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>More Outputs</div>
              <div style={{ ...typo.small, color: colors.textSecondary }}>= Higher di/dt</div>
              <div style={{ ...typo.small, color: colors.error }}>= More bounce</div>
            </div>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>Faster Edges</div>
              <div style={{ ...typo.small, color: colors.textSecondary }}>= Higher di/dt</div>
              <div style={{ ...typo.small, color: colors.error }}>= More bounce</div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore Package Effects →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Package type doesn\'t matter - inductance is the same for all packages' },
      { id: 'b', text: 'Smaller packages with shorter leads have less inductance and less ground bounce' },
      { id: 'c', text: 'Larger packages have more room for decoupling, so they have less noise' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        paddingBottom: '16px',
        overflowY: 'auto',
        flex: 1,
      }}>
        {renderNavigationBar()}
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
              New Variable: Package Type
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            An engineer switches from a DIP package (long leads) to a BGA package (short solder balls). How does ground bounce change?
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>📦</div>
              <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>DIP Package</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>~10mm lead length</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>~10nH per pin</div>
            </div>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔲</div>
              <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600 }}>BGA Package</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>~0.5mm ball height</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>~0.5nH per ball</div>
            </div>
          </div>

          {/* Package comparison SVG */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <svg width={isMobile ? 340 : 420} height={220} viewBox={`0 0 ${isMobile ? 340 : 420} 220`} style={{ background: colors.bgCard, borderRadius: '12px' }} preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="dipGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.error} stopOpacity="0.6" />
                  <stop offset="100%" stopColor={colors.error} stopOpacity="0.1" />
                </linearGradient>
                <linearGradient id="bgaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              {/* DIP side */}
              <rect x={20} y={40} width={isMobile ? 130 : 170} height={50} fill={colors.bgSecondary} stroke={colors.error} strokeWidth="2" rx="4" />
              <text x={isMobile ? 85 : 105} y={70} fill={colors.textPrimary} fontSize="13" textAnchor="middle" fontWeight="600">DIP Package</text>
              {/* DIP long leads */}
              {Array.from({ length: 6 }, (_, i) => (
                <rect key={`dip-${i}`} x={35 + i * (isMobile ? 18 : 24)} y={90} width={8} height={50} fill={colors.error} opacity={0.6} rx="1" />
              ))}
              <text x={isMobile ? 85 : 105} y={160} fill={colors.error} fontSize="12" textAnchor="middle">L = 10nH (high)</text>
              <text x={isMobile ? 85 : 105} y={180} fill={colors.textMuted} fontSize="11" textAnchor="middle">Long leads</text>

              {/* BGA side */}
              <rect x={isMobile ? 180 : 230} y={40} width={isMobile ? 130 : 170} height={50} fill={colors.bgSecondary} stroke="#10B981" strokeWidth="2" rx="4" />
              <text x={isMobile ? 245 : 315} y={70} fill={colors.textPrimary} fontSize="13" textAnchor="middle" fontWeight="600">BGA Package</text>
              {/* BGA short balls */}
              {Array.from({ length: 6 }, (_, i) => (
                <circle key={`bga-${i}`} cx={(isMobile ? 195 : 245) + i * (isMobile ? 18 : 24)} cy={100} r="5" fill="#10B981" opacity={0.6} />
              ))}
              <text x={isMobile ? 245 : 315} y={130} fill="#10B981" fontSize="12" textAnchor="middle">L = 0.5nH (low)</text>
              <text x={isMobile ? 245 : 315} y={150} fill={colors.textMuted} fontSize="11" textAnchor="middle">Short solder balls</text>

              {/* Comparison arrow */}
              <text x={isMobile ? 170 : 210} y={75} fill={colors.warning} fontSize="16" textAnchor="middle">vs</text>
              <text x={isMobile ? 170 : 210} y={210} fill={colors.textSecondary} fontSize="11" textAnchor="middle">Which package has less ground bounce?</text>
            </svg>
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
                  minHeight: '44px',
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
              See the Package Effect →
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
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        paddingBottom: '16px',
        overflowY: 'auto',
        flex: 1,
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Package Inductance Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '12px' }}>
            Adjust package inductance and see the dramatic effect on ground bounce
          </p>
          <p style={{ ...typo.small, color: colors.warning, textAlign: 'center', marginBottom: '24px', fontStyle: 'italic' }}>
            Observe: Compare BGA vs DIP packages. Notice how lower inductance dramatically reduces ground bounce voltage.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              width: '100%',
              alignItems: isMobile ? 'center' : 'flex-start',
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <GroundBounceVisualization showAnimation={false} />
                </div>

                {/* Stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                }}>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      ...typo.h3,
                      color: bounceData.isSafe ? colors.success : colors.error
                    }}>
                      {(bounceData.bounceVoltage * 1000).toFixed(0)}mV
                    </div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Ground Bounce</div>
                  </div>
                  <div style={{
                    background: colors.bgSecondary,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.h3, color: colors.warning }}>{bounceData.diDt.toFixed(1)} A/μs</div>
                    <div style={{ ...typo.small, color: colors.textMuted }}>di/dt</div>
                  </div>
                </div>
              </div>

              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {/* Package inductance slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Package Inductance (L)</span>
                    <span style={{
                      ...typo.small,
                      color: packageInductance > 8 ? colors.error : packageInductance > 3 ? colors.warning : colors.success,
                      fontWeight: 600
                    }}>
                      {packageInductance} nH
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="15"
                    step="0.5"
                    value={packageInductance}
                    onChange={(e) => setPackageInductance(parseFloat(e.target.value))}
                    style={{
                      touchAction: 'pan-y',
                      width: '100%',
                      height: '20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      WebkitAppearance: 'none' as const,
                      accentColor: colors.warning,
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.success }}>BGA (0.5nH)</span>
                    <span style={{ ...typo.small, color: colors.error }}>DIP (15nH)</span>
                  </div>
                </div>

                {/* Number of outputs slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Switching Outputs</span>
                    <span style={{ height: '20px', ...typo.small, color: colors.signal, fontWeight: 600 }}>{numOutputs}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="64"
                    value={numOutputs}
                    onChange={(e) => setNumOutputs(parseInt(e.target.value))}
                    style={{
                      touchAction: 'pan-y',
                      width: '100%',
                      height: '20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      WebkitAppearance: 'none' as const,
                      accentColor: colors.signal,
                    }}
                  />
                </div>

                {/* Slew rate slider */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Edge Slew Rate</span>
                    <span style={{ height: '20px', ...typo.small, color: colors.warning, fontWeight: 600 }}>{slewRate} V/ns</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={slewRate}
                    onChange={(e) => setSlewRate(parseFloat(e.target.value))}
                    style={{
                      touchAction: 'pan-y',
                      width: '100%',
                      height: '20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      WebkitAppearance: 'none' as const,
                      accentColor: colors.warning,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Solutions →
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
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        paddingBottom: '16px',
        overflowY: 'auto',
        flex: 1,
      }}>
        {renderNavigationBar()}
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Strategies to Reduce Ground Bounce
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📦</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Use Low-Inductance Packages</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                BGA and flip-chip packages have much shorter connections than DIP or QFP. A 20x reduction in inductance means 20x less ground bounce for the same switching activity.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⏱️</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Stagger Output Transitions</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Instead of switching all outputs simultaneously, add small delays. If 32 outputs switch in 8 groups of 4, di/dt drops to 1/8th. Many FPGAs have programmable output delays for this.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🐢</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Reduce Slew Rate</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Slower rising/falling edges mean lower di/dt. Most I/O standards offer programmable drive strength and slew rate. Trade off switching speed for cleaner signals.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔌</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Add More Ground Pins</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Parallel inductances add like parallel resistors: L_total = L/n. Adding 4 ground pins reduces effective inductance to 1/4. Modern chips dedicate 30-50% of pins to power/ground!
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications →
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Ground Bounce"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        paddingBottom: '16px',
        overflowY: 'auto',
        flex: 1,
      }}>
        {renderNavigationBar()}
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
                  minHeight: '44px',
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
                Ground Bounce Connection:
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

          {/* Progress indicator */}
          <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
            Application {selectedApp + 1} of {realWorldApps.length}
          </p>

          {/* Got It button - always visible */}
          <button
            onClick={() => {
              playSound('click');
              const newCompleted = [...completedApps];
              newCompleted[selectedApp] = true;
              setCompletedApps(newCompleted);
            }}
            style={{
              ...primaryButtonStyle,
              width: '100%',
              marginBottom: '12px',
              background: completedApps[selectedApp] ? colors.bgCard : `linear-gradient(135deg, ${colors.accent}, #DC2626)`,
              border: completedApps[selectedApp] ? `1px solid ${colors.success}` : 'none',
            }}
          >
            {completedApps[selectedApp] ? 'Reviewed' : 'Got It'}
          </button>

          {/* Next Application button */}
          {selectedApp < realWorldApps.length - 1 && (
            <button
              onClick={() => {
                playSound('click');
                const nextAppIndex = selectedApp + 1;
                setSelectedApp(nextAppIndex);
                const newCompleted = [...completedApps];
                newCompleted[nextAppIndex] = true;
                setCompletedApps(newCompleted);
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.textSecondary,
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '12px',
                minHeight: '44px',
              }}
            >
              Next Application
            </button>
          )}

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
          minHeight: '100dvh',
          background: colors.bgPrimary,
          padding: '24px',
          paddingTop: '80px',
          paddingBottom: '16px',
          overflowY: 'auto',
          flex: 1,
        }}>
          {renderNavigationBar()}
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🎉' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You\'ve mastered Ground Bounce and Signal Integrity!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson →
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
                Review & Try Again
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
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingTop: '80px',
        paddingBottom: '16px',
        overflowY: 'auto',
        flex: 1,
      }}>
        {renderNavigationBar()}
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
                  minHeight: '44px',
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
                ← Previous
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
        minHeight: '100dvh',
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
          Ground Bounce Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand how simultaneous switching noise works and why it's critical for high-speed digital design.
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
              'V = L × di/dt - the ground bounce equation',
              'Why simultaneous switching multiplies the problem',
              'Package inductance is the limiting factor',
              'Staggering and slew rate control strategies',
              'Real-world applications from CPUs to DDR memory',
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

export default GroundBounceRenderer;
