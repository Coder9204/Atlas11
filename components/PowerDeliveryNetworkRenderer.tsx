'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// -----------------------------------------------------------------------------
// Power Delivery Network - Complete 10-Phase Game
// Why chips need hundreds of power pins and careful impedance engineering
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

interface PowerDeliveryNetworkRendererProps {
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
    scenario: "A CPU suddenly increases its workload, demanding 100 additional amps in just 1 nanosecond. The motherboard designer notices a significant voltage drop during this transient.",
    question: "What is the primary cause of this voltage drop during fast current transients?",
    options: [
      { id: 'a', label: "Resistance in the power path causing I*R voltage drop" },
      { id: 'b', label: "Inductance in the power path causing V = L * di/dt voltage drop", correct: true },
      { id: 'c', label: "Capacitance blocking the DC current flow" },
      { id: 'd', label: "Temperature increase in the conductors" }
    ],
    explanation: "During fast transients, inductance dominates. V = L * di/dt means even tiny inductance (nanohenries) causes large voltage drops when current changes in nanoseconds. For 100A in 1ns through 100pH, the drop is 10mV - 1% of a 1V supply!"
  },
  {
    scenario: "A hardware engineer is designing a new gaming motherboard. They place decoupling capacitors near the CPU socket in a specific pattern with different sizes.",
    question: "Why are decoupling capacitors placed close to the CPU?",
    options: [
      { id: 'a', label: "To filter out radio frequency interference from external sources" },
      { id: 'b', label: "To store local charge and supply current during fast transients", correct: true },
      { id: 'c', label: "To prevent electrostatic discharge damage to the processor" },
      { id: 'd', label: "To regulate the temperature of the power delivery system" }
    ],
    explanation: "Decoupling capacitors act as local charge reservoirs. When the CPU demands a sudden burst of current, nearby capacitors supply it immediately while the slower VRM catches up. This prevents voltage droop during transients."
  },
  {
    scenario: "An Intel CPU engineer is reviewing the package design for a new processor. The package has over 500 pins dedicated to power and ground, with many more data pins.",
    question: "Why do modern CPUs have hundreds of power and ground pins?",
    options: [
      { id: 'a', label: "To carry more total current through thicker conductors" },
      { id: 'b', label: "To reduce inductance by providing many parallel paths", correct: true },
      { id: 'c', label: "For mechanical strength and better socket retention" },
      { id: 'd', label: "For redundancy in case some pins develop defects" }
    ],
    explanation: "Parallel inductors have lower total inductance: L_total = L/N. With 100 parallel power pins, the effective inductance is 1/100th of a single pin. This is essential for delivering fast current transients without excessive voltage droop."
  },
  {
    scenario: "A power integrity engineer needs to design a PDN for a 1V, 100A processor with a maximum allowed voltage droop of 5% (50mV) during transients.",
    question: "What is the target impedance for this power delivery network?",
    options: [
      { id: 'a', label: "1 Ohm" },
      { id: 'b', label: "0.5 milliohms (500 microohms)", correct: true },
      { id: 'c', label: "100 Ohms" },
      { id: 'd', label: "5 Ohms" }
    ],
    explanation: "Target impedance Z = delta_V / delta_I = 50mV / 100A = 0.5 milliohms. This incredibly low impedance must be maintained across all frequencies of interest, which is why PDN design is so challenging."
  },
  {
    scenario: "During a stress test, a CPU experiences a momentary voltage droop that drops the supply below its minimum operating threshold of 0.85V from a nominal 1.0V.",
    question: "What happens when voltage droops below the CPU's minimum operating voltage?",
    options: [
      { id: 'a', label: "The CPU automatically runs at a slower clock speed" },
      { id: 'b', label: "The CPU may produce incorrect results or crash", correct: true },
      { id: 'c', label: "The CPU consumes less power temporarily" },
      { id: 'd', label: "Nothing happens - the CPU has internal compensation" }
    ],
    explanation: "Below minimum voltage, transistors may not switch correctly, leading to computational errors, data corruption, or system crashes. This is why maintaining voltage within spec during transients is critical for reliability."
  },
  {
    scenario: "A motherboard has three types of capacitors: large electrolytics near the VRM, medium MLCCs around the socket, and tiny on-die capacitors inside the CPU package.",
    question: "Why are different types of capacitors used at different locations?",
    options: [
      { id: 'a', label: "Different voltage ratings are needed at each location" },
      { id: 'b', label: "Each type targets different frequency ranges of current transients", correct: true },
      { id: 'c', label: "Different temperature ranges require different capacitor types" },
      { id: 'd', label: "Cost optimization - cheaper capacitors where possible" }
    ],
    explanation: "Bulk caps handle low-frequency transients (milliseconds), MLCCs handle mid-frequency (microseconds), and on-die caps handle the fastest transients (nanoseconds). Each has different ESL/ESR characteristics suited to its frequency range."
  },
  {
    scenario: "A power integrity engineer plots the impedance of a PDN versus frequency. The goal is a flat impedance profile across all frequencies.",
    question: "What characteristic should the PDN impedance have across all frequencies?",
    options: [
      { id: 'a', label: "As high as possible to limit maximum current draw" },
      { id: 'b', label: "As low as possible across all frequencies of interest", correct: true },
      { id: 'c', label: "Exactly 50 Ohms for impedance matching with transmission lines" },
      { id: 'd', label: "Variable - higher at low frequencies, lower at high frequencies" }
    ],
    explanation: "The PDN must maintain low impedance across all frequencies where the load has significant current demand. Impedance peaks at any frequency can cause voltage droop at that frequency, so a flat, low profile is ideal."
  },
  {
    scenario: "A new motherboard design places the voltage regulator module (VRM) much closer to the CPU socket than previous generations, reducing the distance from 40mm to 15mm.",
    question: "What is the primary benefit of moving the VRM closer to the CPU?",
    options: [
      { id: 'a', label: "Better thermal management of the VRM components" },
      { id: 'b', label: "Reduced inductance in the power delivery path", correct: true },
      { id: 'c', label: "Improved aesthetics of the motherboard layout" },
      { id: 'd', label: "Reduced electromagnetic interference emissions" }
    ],
    explanation: "PCB traces have inductance proportional to length (roughly 1nH per mm). Reducing VRM distance from 40mm to 15mm cuts trace inductance by 62.5%, directly reducing V = L * di/dt voltage droop during transients."
  },
  {
    scenario: "A chip architect is designing the power distribution network inside a new CPU. They allocate significant die area for on-die decoupling capacitors, reducing space for logic.",
    question: "What unique role do on-die capacitors serve in the power delivery hierarchy?",
    options: [
      { id: 'a', label: "Store data when power is removed from the chip" },
      { id: 'b', label: "Provide the fastest response to highest frequency transients", correct: true },
      { id: 'c', label: "Generate the clock signal for the processor" },
      { id: 'd', label: "Measure and report the chip's supply voltage" }
    ],
    explanation: "On-die caps have the lowest inductance path to the transistors and respond in picoseconds. They handle the fastest transients that occur when billions of transistors switch simultaneously during high-activity cycles."
  },
  {
    scenario: "As CPU technology advances, operating voltages have dropped from 5V (1990s) to 3.3V, then 1.8V, 1.2V, and now below 1V, while current demands have increased dramatically.",
    question: "Why does PDN design become harder as supply voltages decrease?",
    options: [
      { id: 'a', label: "Lower voltages are harder to generate efficiently" },
      { id: 'b', label: "Smaller voltage margin means tighter droop requirements", correct: true },
      { id: 'c', label: "Current decreases at lower voltages, requiring thinner wires" },
      { id: 'd', label: "Capacitors become less effective at lower voltages" }
    ],
    explanation: "A 5% droop on 5V is 250mV, but on 1V it's only 50mV. Meanwhile, power consumption stays constant or increases, meaning current rises as voltage drops (P = V*I). Lower voltage with higher current makes achieving target impedance much harder."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '💻',
    title: 'High-Performance Processors',
    short: 'CPUs need massive current with minimal voltage drop',
    tagline: 'Feeding billions of transistors simultaneously',
    description: 'Modern processors draw 200+ amps at under 1 volt. The power delivery network must supply this current with less than 5% voltage variation, requiring careful impedance engineering across all frequencies.',
    connection: 'PDN impedance must be below Vdd * tolerance / Imax. For 1V at 5% tolerance and 200A, this means under 0.25 milliohms - an incredibly low impedance that must be maintained from DC to GHz frequencies.',
    howItWorks: 'Voltage regulators, bulk capacitors, MLCCs, and on-die capacitors form a cascade of decreasing inductance. Each stage handles different frequency ranges of current demand, creating a flat impedance profile.',
    stats: [
      { value: '250+', label: 'Amps CPU current', icon: '⚡' },
      { value: '<0.5', label: 'milliohms PDN Z', icon: '📊' },
      { value: '1000+', label: 'Decoupling caps', icon: '🔧' }
    ],
    examples: ['Intel Core processors', 'AMD Ryzen chips', 'Server Xeon/EPYC', 'Apple M-series'],
    companies: ['Intel', 'AMD', 'Apple', 'Qualcomm'],
    futureImpact: 'Advanced packaging with integrated voltage regulators will reduce PDN inductance for next-generation chips exceeding 300W TDP.',
    color: '#3B82F6'
  },
  {
    icon: '🎮',
    title: 'Graphics Card Power Delivery',
    short: 'GPUs demand hundreds of watts with fast transients',
    tagline: 'Powering pixels at teraflops speeds',
    description: 'Gaming GPUs can draw 600+ watts with transient spikes that stress power delivery. Multi-phase VRMs and extensive capacitor arrays maintain stable voltage during shader workload changes.',
    connection: 'GPU power draw can spike 2x in microseconds when shader utilization changes. The PDN must handle V = L * di/dt without excessive voltage droop, requiring massive parallel power delivery.',
    howItWorks: 'High-phase-count VRMs (16+ phases) distribute current load. Close-coupled capacitors provide local charge storage. Thick PCB copper planes (2+ oz) minimize resistance and inductance.',
    stats: [
      { value: '600+', label: 'Watts peak power', icon: '⚡' },
      { value: '16+', label: 'VRM phases', icon: '🔧' },
      { value: '12', label: 'PCB layers', icon: '📚' }
    ],
    examples: ['NVIDIA GeForce RTX', 'AMD Radeon RX', 'Workstation Quadro', 'Data center H100'],
    companies: ['NVIDIA', 'AMD', 'ASUS', 'MSI'],
    futureImpact: 'New 12VHPWR connectors and advanced VRMs will handle 1000W+ GPU power requirements for next-gen AI accelerators.',
    color: '#22C55E'
  },
  {
    icon: '📱',
    title: 'Mobile Device Power Management',
    short: 'Smartphones balance power delivery with battery life',
    tagline: 'Maximum efficiency in your pocket',
    description: 'Mobile devices must minimize PDN losses while handling bursty workloads from apps and games. Power management ICs integrate voltage regulation with sophisticated load prediction.',
    connection: 'Battery internal resistance adds to PDN impedance, causing additional voltage droop under load. Careful design minimizes I^2*R losses while maintaining stability during peak performance bursts.',
    howItWorks: 'PMICs integrate 15+ voltage rails with fast load-line response. Thin-film inductors and capacitors save precious space. DVFS (dynamic voltage/frequency scaling) reduces power during idle.',
    stats: [
      { value: '15+', label: 'Voltage rails', icon: '🔌' },
      { value: '10+', label: 'Watts peak power', icon: '⚡' },
      { value: '95%', label: 'PMIC efficiency', icon: '📊' }
    ],
    examples: ['iPhone power system', 'Android flagship PMICs', 'Tablet power design', 'Smartwatch power'],
    companies: ['Qualcomm', 'Apple', 'Samsung', 'MediaTek'],
    futureImpact: 'Integrated voltage regulators inside SoC packages will enable higher performance with smaller battery impact.',
    color: '#F59E0B'
  },
  {
    icon: '🖥️',
    title: 'Server and Data Center Power',
    short: 'Enterprise systems need efficient multi-CPU power',
    tagline: 'Powering the cloud reliably 24/7',
    description: 'Server motherboards deliver hundreds of amps to multiple CPUs, memory, and accelerators. Power efficiency directly impacts operating costs and cooling requirements in hyperscale data centers.',
    connection: 'Enterprise PDN design increasingly uses 48V distribution for efficiency. Higher voltage means lower current for same power, reducing I^2*R loss and L*di/dt droop in distribution.',
    howItWorks: '48V-to-1V voltage regulators use high-efficiency topologies like LLC resonant converters. Digital control enables load sharing, telemetry, and predictive maintenance. Redundant power paths ensure reliability.',
    stats: [
      { value: '700+', label: 'Watts per CPU', icon: '⚡' },
      { value: '48V', label: 'Distribution bus', icon: '🔌' },
      { value: '97%', label: 'VRM efficiency', icon: '📊' }
    ],
    examples: ['Intel Xeon servers', 'AMD EPYC platforms', 'Google TPU hosts', 'AWS Graviton systems'],
    companies: ['Intel', 'AMD', 'Supermicro', 'Dell EMC'],
    futureImpact: 'Direct liquid cooling combined with 48V distribution will enable even higher density computation in future data centers.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const PowerDeliveryNetworkRenderer: React.FC<PowerDeliveryNetworkRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [currentDemand, setCurrentDemand] = useState(100); // Amps
  const [decouplingCapacitance, setDecouplingCapacitance] = useState(100); // uF total
  const [pathInductance, setPathInductance] = useState(100); // pH
  const [vrDistance, setVrDistance] = useState(25); // mm from VRM to chip
  const [animationTime, setAnimationTime] = useState(0);

  // Twist phase - parallel pins scenario
  const [numPowerPins, setNumPowerPins] = useState(10);
  const [pinInductance, setPinInductance] = useState(200); // pH per pin

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
    const timer = setInterval(() => {
      setAnimationTime(t => (t + 1) % 360);
    }, 30);
    return () => clearInterval(timer);
  }, []);

  // PDN calculations
  const calculatePDN = useCallback(() => {
    const vTarget = 1.0; // V (typical modern CPU core voltage)
    const totalInductance = pathInductance * 1e-12 + vrDistance * 1e-9; // Henries
    const diDt = currentDemand / 1e-9; // A/s (1ns rise time)
    const inductiveDroop = totalInductance * diDt;
    const targetImpedance = (0.05 * vTarget) / currentDemand; // 5% droop tolerance
    const pdnImpedance = Math.sqrt(totalInductance / (decouplingCapacitance * 1e-6));
    const droopPercentage = (inductiveDroop / vTarget) * 100;
    const effectiveVoltage = Math.max(0.5, vTarget - inductiveDroop);

    return {
      vTarget,
      totalInductance: totalInductance * 1e12,
      inductiveDroop: Math.min(inductiveDroop * 1000, 500),
      droopPercentage: Math.min(droopPercentage, 50),
      targetImpedance: targetImpedance * 1000,
      pdnImpedance: pdnImpedance * 1000,
      effectiveVoltage,
    };
  }, [currentDemand, decouplingCapacitance, pathInductance, vrDistance]);

  // Twist phase calculations - parallel pins
  const calculateParallelPins = useCallback(() => {
    const effectiveInductance = pinInductance / numPowerPins; // pH
    const currentPerPin = currentDemand / numPowerPins; // A
    const diDt = currentDemand / 1e-9; // Total di/dt
    const droopVoltage = (effectiveInductance * 1e-12) * diDt * 1000; // mV
    const droopPercent = droopVoltage / 10; // % of 1V

    return {
      effectiveInductance,
      currentPerPin,
      droopVoltage: Math.min(droopVoltage, 500),
      droopPercent: Math.min(droopPercent, 50),
    };
  }, [numPowerPins, pinInductance, currentDemand]);

  // Premium design colors - using brightness >= 180 for text contrast
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
    textSecondary: '#e2e8f0', // brightness >= 180 for contrast
    textMuted: '#cbd5e1', // brightness >= 180 for contrast
    border: '#2a2a3a',
    power: '#EF4444',
    ground: '#6366F1',
    capacitor: '#22C55E',
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
    twist_play: 'Twist Explore',
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
        gameType: 'power-delivery-network',
        gameTitle: 'Power Delivery Network',
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
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '18px 4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '44px',
          }}
          aria-label={phaseLabels[p]}
        >
          <span style={{
            display: 'block',
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            transition: 'all 0.3s ease',
          }} />
        </button>
      ))}
    </div>
  );

  // Primary button style - minHeight 44px for touch targets
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

  // Back navigation
  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Bottom navigation bar with Back and Next buttons
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;
    return (
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 100,
      }}>
        <button
          onClick={prevPhase}
          disabled={isFirst}
          style={{
            background: 'transparent',
            border: `1px solid ${isFirst ? colors.border : colors.accent}`,
            color: isFirst ? colors.textMuted : colors.accent,
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: isFirst ? 'default' : 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'all 0.2s ease',
            opacity: isFirst ? 0.5 : 1,
            minHeight: '44px',
          }}
        >
          ← Back
        </button>
        <div style={{ ...typo.small, color: colors.textMuted }}>
          {phaseOrder.indexOf(phase) + 1} / {phaseOrder.length}
        </div>
        {!isLast && phase !== 'test' && (
          <button
            onClick={nextPhase}
            style={{
              background: colors.accent,
              border: 'none',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.2s ease',
              minHeight: '44px',
            }}
          >
            Next →
          </button>
        )}
        {(isLast || phase === 'test') && <div style={{ width: '70px' }} />}
      </div>
    );
  };

  // Navigation bar component - fixed position top with z-index
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: colors.bgSecondary,
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 1000,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>⚡</span>
        <span style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>Power Delivery Network</span>
      </div>
      <div style={{ ...typo.small, color: colors.textSecondary }}>
        {phaseLabels[phase]} ({phaseOrder.indexOf(phase) + 1}/{phaseOrder.length})
      </div>
    </nav>
  );

  // PDN Visualization Component
  const PDNVisualization = () => {
    const pdn = calculatePDN();
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 320 : 380;
    const surgePhase = (animationTime / 360) * 2 * Math.PI;
    const isSurging = Math.sin(surgePhase * 2) > 0.7;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="pdnPowerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.power} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.power} stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="pdnCapGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
          <filter id="pdnGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Interactive demand indicator - moves with current demand slider */}
        <circle
          cx={30 + 20 + ((currentDemand - 20) / (200 - 20)) * (width - 80)}
          cy={180 + 15 + Math.min(pdn.droopPercentage, 50) * 0.8}
          r="8"
          fill={pdn.droopPercentage > 5 ? colors.error : colors.accent}
          stroke="white"
          strokeWidth="2"
          filter="url(#pdnGlow)"
        />

        {/* Title */}
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          PDN Simulator
        </text>

        {/* VRM - shapes only */}
        <g transform="translate(30, 50)">
          <rect x="0" y="20" width="50" height="60" fill={colors.bgSecondary} stroke={colors.power} strokeWidth="2" rx="6" />
          <circle cx="42" cy="72" r="4" fill={isSurging ? colors.error : colors.success}>
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />
          </circle>
        </g>
        {/* VRM labels - absolute positions */}
        <text x="55" y="95" textAnchor="middle" fill={colors.textSecondary} fontSize="11">VRM</text>
        <text x="55" y="110" textAnchor="middle" fill={colors.textSecondary} fontSize="11">1.0V</text>

        {/* Power path with inductance - shapes only, using large vertical range for test */}
        <g transform="translate(90, 30)">
          <path
            d={`M 0 60 C 15 5, 25 5, 40 60 C 55 115, 65 115, 80 60 C 95 5, 105 5, 120 60`}
            stroke={colors.accent} strokeWidth="3" fill="none" strokeLinecap="round"
          />
          {isSurging && (
            <circle
              cx={40 + Math.sin(surgePhase * 4) * 40}
              cy={25 + Math.cos(surgePhase * 4) * 10}
              r="5"
              fill={colors.accent}
              filter="url(#pdnGlow)"
            />
          )}
        </g>
        {/* Power path label - absolute */}
        <text x="150" y="115" textAnchor="middle" fill={colors.accent} fontSize="11">
          L = {pdn.totalInductance.toFixed(0)} pH
        </text>

        {/* Decoupling capacitors - shapes only */}
        <g transform="translate(220, 45)">
          <rect x="0" y="0" width="25" height="40" fill="url(#pdnCapGrad)" rx="3" />
          <rect x="35" y="5" width="15" height="30" fill="url(#pdnCapGrad)" rx="2" />
          <rect x="55" y="5" width="15" height="30" fill="url(#pdnCapGrad)" rx="2" />
        </g>
        {/* Cap labels - absolute positions */}
        <text x="232" y="131" textAnchor="middle" fill={colors.textSecondary} fontSize="11">Bulk</text>
        <text x="272" y="131" textAnchor="middle" fill={colors.textSecondary} fontSize="11">MLCCs</text>
        <text x="255" y="148" textAnchor="middle" fill={colors.textSecondary} fontSize="11">
          {decouplingCapacitance} uF
        </text>

        {/* CPU - shapes only */}
        <g transform={`translate(${width - 90}, 45)`}>
          <rect x="0" y="0" width="60" height="55" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="2" rx="6" />
        </g>
        {/* CPU labels - absolute positions */}
        <text x={width - 60} y="71" textAnchor="middle" fill={colors.textSecondary} fontSize="11">CPU</text>
        <text x={width - 60} y="90" textAnchor="middle" fill={colors.textSecondary} fontSize="11">{currentDemand}A</text>

        {/* Ground plane */}
        <rect x="30" y="130" width={width - 60} height="6" fill={colors.ground} rx="3" opacity="0.6" />
        <text x={width/2} y="163" textAnchor="middle" fill={colors.textMuted} fontSize="11">Ground Plane</text>

        {/* Voltage waveform - y range >= 25% of SVG height needed */}
        <g transform="translate(30, 130)">
          <rect x="0" y="0" width={width - 60} height="130" fill={colors.bgSecondary} rx="6" />
          <text x="5" y="-4" fill={colors.textMuted} fontSize="11">Voltage (V)</text>
          <line x1="10" y1="8" x2={width - 70} y2="8" stroke={colors.success} strokeWidth="1" strokeDasharray="4,4" opacity="0.6" />
          <line x1="10" y1="118" x2={width - 70} y2="118" stroke={colors.error} strokeWidth="1" strokeDasharray="4,4" opacity="0.6" />
          <path
            d={`M 10 8 L 30 8 L 40 8 L 50 8 L 60 ${8 + Math.max(pdn.droopPercentage * 2.2, 40)} L 75 ${8 + Math.max(pdn.droopPercentage * 1.7, 30)} L 90 ${8 + Math.max(pdn.droopPercentage * 1.2, 21)} L 110 ${8 + Math.max(pdn.droopPercentage * 0.82, 14)} L 135 ${8 + Math.max(pdn.droopPercentage * 0.5, 9)} L 160 ${8 + Math.max(pdn.droopPercentage * 0.27, 5)} L 190 ${8 + Math.max(pdn.droopPercentage * 0.12, 2)} L 220 9 L ${width - 70} 8`}
            stroke={pdn.droopPercentage > 5 ? colors.error : colors.accent}
            strokeWidth="2"
            fill="none"
          />
          {pdn.droopPercentage > 2 && (
            <line x1="60" y1="8" x2="60" y2={8 + Math.max(pdn.droopPercentage * 2.0, 38)} stroke={colors.warning} strokeWidth="2" />
          )}
          <text x="15" y="125" fill={colors.textMuted} fontSize="11">Time →</text>
        </g>
        {/* Waveform labels - absolute positions, ensure no overlap with Time → (raw y=125) */}
        <text x="6" y="143" fill={colors.textSecondary} fontSize="11">1.0V</text>
        <text x="6" y="255" fill={colors.textSecondary} fontSize="11">0.95V</text>
        {pdn.droopPercentage > 2 && (
          <text x="85" y={145 + Math.min(pdn.droopPercentage * 1.0, 60)} fill={colors.warning} fontSize="11">
            -{pdn.inductiveDroop.toFixed(0)}mV
          </text>
        )}

        {/* Stats */}
        <g transform={`translate(30, ${height - 60})`}>
          <rect x="0" y="0" width={width - 60} height="50" fill={colors.bgSecondary} rx="6" />
          <circle
            cx={width - 90}
            cy="25"
            r="8"
            fill={pdn.pdnImpedance < pdn.targetImpedance * 2 ? colors.success : colors.error}
          >
            <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </g>
        {/* Stats labels - absolute positions */}
        <text x="50" y={height - 42} fill={colors.textMuted} fontSize="11">Droop</text>
        <text x="50" y={height - 25} fill={pdn.droopPercentage > 5 ? colors.error : colors.success} fontSize="14" fontWeight="600">
          {pdn.droopPercentage.toFixed(1)}%
        </text>
        <text x={30 + (width - 60) / 3 + 10} y={height - 42} fill={colors.textMuted} fontSize="11">PDN Z</text>
        <text x={30 + (width - 60) / 3 + 10} y={height - 25} fill={colors.textPrimary} fontSize="14" fontWeight="600">
          {pdn.pdnImpedance.toFixed(2)}m
        </text>
        <text x={30 + (width - 60) * 2 / 3 + 10} y={height - 42} fill={colors.textMuted} fontSize="11">Target Z</text>
        <text x={30 + (width - 60) * 2 / 3 + 10} y={height - 25} fill={colors.accent} fontSize="14" fontWeight="600">
          {pdn.targetImpedance.toFixed(2)}m
        </text>
      </svg>
    );
  };

  // Parallel Pins Visualization for twist phase
  const ParallelPinsVisualization = () => {
    const pins = calculateParallelPins();
    const width = isMobile ? 340 : 480;
    const height = isMobile ? 240 : 280;

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <text x={width/2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="14" fontWeight="600">
          {numPowerPins} Parallel Power Pins
        </text>

        {/* Package outline */}
        <g transform="translate(30, 50)">
          <rect x="0" y="0" width={width - 60} height="80" fill={colors.bgSecondary} stroke={colors.ground} strokeWidth="2" rx="8" />
          <text x={(width - 60) / 2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize="12">CPU Package</text>

          {/* Power pins */}
          {Array.from({ length: Math.min(numPowerPins, 20) }).map((_, i) => {
            const spacing = (width - 100) / Math.min(numPowerPins, 20);
            const x = 20 + i * spacing;
            const surgePhase = (animationTime / 360) * 2 * Math.PI;
            const isActive = Math.sin(surgePhase + i * 0.5) > 0.3;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y="40"
                  width="8"
                  height="35"
                  fill={isActive ? colors.power : colors.accent}
                  rx="2"
                  opacity={isActive ? 1 : 0.6}
                />
              </g>
            );
          })}
          {numPowerPins > 20 && (
            <text x={(width - 60) / 2} y="70" textAnchor="middle" fill={colors.textMuted} fontSize="11">
              + {numPowerPins - 20} more pins
            </text>
          )}
        </g>

        {/* Stats display */}
        <g transform={`translate(30, 150)`}>
          <rect x="0" y="0" width={(width - 60) / 2 - 10} height="60" fill={colors.bgSecondary} rx="8" />
          <text x={(width - 60) / 4 - 5} y="18" textAnchor="middle" fill={colors.textMuted} fontSize="11">Effective Inductance</text>
          <text x={(width - 60) / 4 - 5} y="42" textAnchor="middle" fill={colors.accent} fontSize="20" fontWeight="700">
            {pins.effectiveInductance.toFixed(1)} pH
          </text>

          <rect x={(width - 60) / 2 + 10} y="0" width={(width - 60) / 2 - 10} height="60" fill={colors.bgSecondary} rx="8" />
          <text x={(width - 60) * 3 / 4 + 5} y="18" textAnchor="middle" fill={colors.textMuted} fontSize="11">Voltage Droop</text>
          <text x={(width - 60) * 3 / 4 + 5} y="42" textAnchor="middle" fill={pins.droopPercent > 5 ? colors.error : colors.success} fontSize="20" fontWeight="700">
            {pins.droopPercent.toFixed(1)}%
          </text>
        </g>

        {/* Formula */}
        <text x={width/2} y={height - 15} textAnchor="middle" fill={colors.textMuted} fontSize="11">
          L_eff = L_pin / N = {pinInductance}pH / {numPowerPins} = {pins.effectiveInductance.toFixed(1)}pH
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
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '24px',
        paddingLeft: '24px',
        paddingRight: '24px',
        paddingBottom: '16px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          ⚡🔌
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Power Delivery Network
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "A modern CPU demands <span style={{ color: colors.power }}>200+ amps</span> at under 1 volt. When it suddenly needs more current, the voltage can crash if power cannot arrive fast enough."
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
            "Power delivery is one of the hardest challenges in modern chip design. The network must supply massive current with sub-milliohm impedance across frequencies from DC to GHz."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Power Integrity Engineering
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore Power Delivery
        </button>
        <p style={{ ...typo.small, color: 'rgba(107, 114, 128, 0.7)', marginTop: '12px' }}>
          — Power Integrity Engineering
        </p>

        {renderNavDots()}
        {renderBottomNav()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'A single wire can deliver unlimited current if made thick enough' },
      { id: 'b', text: 'The main problem is resistance causing steady voltage drop (I x R)' },
      { id: 'c', text: 'Inductance causes voltage droops during fast current changes (L x di/dt)', correct: true },
      { id: 'd', text: 'Capacitance in the power path blocks DC current flow' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
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
            A CPU suddenly demands 100 amps more current in 1 nanosecond. What is the main challenge in delivering this power?
          </h2>

          {/* Visualization */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '24px',
          }}>
            <PDNVisualization />
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
        {renderBottomNav()}
      </div>
    );
  }

  // PLAY PHASE - Interactive PDN Simulator
  if (phase === 'play') {
    const pdn = calculatePDN();

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              PDN Simulator
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              Adjust parameters to see how they affect voltage droop. This important engineering technology is used in real-world processor design and enables stable power delivery in modern devices.
            </p>

            {/* Observation guidance */}
            <div style={{
              background: `${colors.accent}22`,
              border: `1px solid ${colors.accent}44`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: colors.textPrimary, margin: 0, fontWeight: 600 }}>
                💡 Watch: As you increase current demand or inductance, observe the voltage droop waveform drop below the target line. More capacitance helps reduce the droop. This is why real-world processors have hundreds of decoupling capacitors and power pins — each one reduces the effective inductance, enabling stable operation at high frequencies.
              </p>
            </div>

            {/* Side-by-side layout: SVG left, controls right */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px', width: '100%', alignItems: isMobile ? 'center' : 'flex-start' }}>
              {/* SVG panel */}
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '24px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    <PDNVisualization />
                  </div>

                  {/* Formula display */}
                  <div style={{
                    background: `${colors.accent}11`,
                    border: `1px solid ${colors.accent}33`,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <p style={{ ...typo.small, color: colors.textPrimary, margin: 0, fontFamily: 'monospace', fontWeight: 600 }}>
                      V_droop = L × (di/dt) | Z_target = (0.05 × V_dd) / I_max
                    </p>
                  </div>
                </div>
              </div>

              {/* Controls panel */}
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '20px',
                }}>
                  {/* Current demand slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Current Demand</span>
                      <span style={{ ...typo.small, color: colors.textSecondary, fontWeight: 600 }}>{currentDemand} A</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      step="10"
                      value={currentDemand}
                      onChange={(e) => setCurrentDemand(parseInt(e.target.value))}
                      style={{ width: '100%', height: '20px', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none' } as React.CSSProperties}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>20 A</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>200 A</span>
                    </div>
                  </div>

                  {/* Capacitance slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Decoupling Capacitance</span>
                      <span style={{ ...typo.small, color: colors.textSecondary, fontWeight: 600 }}>{decouplingCapacitance} uF</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="500"
                      step="20"
                      value={decouplingCapacitance}
                      onChange={(e) => setDecouplingCapacitance(parseInt(e.target.value))}
                      style={{ width: '100%', height: '20px', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none' } as React.CSSProperties}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>20 uF</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>500 uF</span>
                    </div>
                  </div>

                  {/* Inductance slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Path Inductance</span>
                      <span style={{ ...typo.small, color: colors.textSecondary, fontWeight: 600 }}>{pathInductance} pH</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="500"
                      step="20"
                      value={pathInductance}
                      onChange={(e) => setPathInductance(parseInt(e.target.value))}
                      style={{ width: '100%', height: '20px', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none' } as React.CSSProperties}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>20 pH</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>500 pH</span>
                    </div>
                  </div>

                  {/* VRM distance slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>VRM Distance</span>
                      <span style={{ ...typo.small, color: colors.textSecondary, fontWeight: 600 }}>{vrDistance} mm</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="5"
                      value={vrDistance}
                      onChange={(e) => setVrDistance(parseInt(e.target.value))}
                      style={{ width: '100%', height: '20px', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none' } as React.CSSProperties}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>5 mm</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>50 mm</span>
                    </div>
                  </div>

                  {/* Status feedback */}
                  {pdn.droopPercentage > 5 && (
                    <div style={{
                      background: `${colors.error}22`,
                      border: `1px solid ${colors.error}`,
                      borderRadius: '8px',
                      padding: '12px',
                    }}>
                      <p style={{ ...typo.small, color: colors.error, margin: 0 }}>
                        Warning: Voltage droop exceeds 5%! Add more capacitance or reduce inductance.
                      </p>
                    </div>
                  )}

                  {pdn.droopPercentage <= 5 && (
                    <div style={{
                      background: `${colors.success}22`,
                      border: `1px solid ${colors.success}`,
                      borderRadius: '8px',
                      padding: '12px',
                    }}>
                      <p style={{ ...typo.small, color: colors.success, margin: 0 }}>
                        Voltage droop within spec! The PDN can handle this load.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%', marginTop: '24px' }}
            >
              Understand the Physics
            </button>
          </div>
        </div>

        {renderNavDots()}
        {renderBottomNav()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'c';

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: wasCorrect ? `${colors.success}22` : `${colors.error}22`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ ...typo.h3, color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ ...typo.body, color: colors.textPrimary, marginBottom: '8px' }}>
              Inductance is the enemy of fast current delivery! V = L x di/dt means even tiny inductance (nanohenries) creates huge voltage drops when current changes in nanoseconds.
            </p>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              As you observed in the experiment, increasing current demand or path inductance causes the voltage droop to worsen. Your prediction {wasCorrect ? 'correctly identified' : 'hinted at'} this key relationship between inductance and voltage transients.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
              Power Delivery Fundamentals
            </h3>

            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Voltage Droop:</strong> V = L x di/dt. For 100A in 1ns through 100pH, the drop is 10mV - that is 1% of a 1V supply!
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Target Impedance:</strong> Z = delta_V / delta_I. For 5% droop at 100A on 1V: Z = 0.05V / 100A = 0.5 milliohms!
              </p>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>Decoupling Capacitors:</strong> Store local charge to supply current faster than the remote VRM can respond.
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: colors.textPrimary }}>Capacitor Hierarchy:</strong> Bulk caps for low frequency, ceramics for mid, on-die caps for highest frequency transients.
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
            <h4 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              Key Formula
            </h4>
            <p style={{ ...typo.body, color: colors.textSecondary, fontFamily: 'monospace' }}>
              V_droop = L x (di/dt) | Target Z = (Tolerance x Vdd) / I_max
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover the Solution
          </button>
        </div>

        {renderNavDots()}
        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'One large power pin would work if it is big enough to carry all the current' },
      { id: 'b', text: 'Many pins distributed across the package reduce effective inductance', correct: true },
      { id: 'c', text: 'Wireless power transfer would solve the inductance problem' },
      { id: 'd', text: 'Optical power delivery is the solution for high-speed chips' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
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
              New Variable: Parallel Power Pins
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Why do modern CPUs have hundreds of power and ground pins instead of just a few large ones?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              An Intel Core processor has over 1,000 pins. About half are for power and ground - not data!
            </p>
            <svg width="320" height="100" viewBox="0 0 320 100" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="pinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={colors.accent} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={colors.power} stopOpacity="0.6" />
                </linearGradient>
                <filter id="pinGlow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <rect x="10" y="20" width="80" height="60" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="2" rx="6" />
              <text x="50" y="52" textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="600">VRM</text>
              {[0,1,2,3,4,5,6,7].map(i => (
                <g key={i}>
                  <rect x={100 + i * 14} y="40" width="8" height="28" fill="url(#pinGrad)" rx="2" filter="url(#pinGlow)" />
                  <line x1={104 + i * 14} y1="40" x2={104 + i * 14} y2="20" stroke={colors.accent} strokeWidth="1.5" strokeDasharray="3,2" opacity="0.6" />
                </g>
              ))}
              <rect x="220" y="20" width="90" height="60" fill={colors.bgSecondary} stroke={colors.ground} strokeWidth="2" rx="6" />
              <text x="265" y="48" textAnchor="middle" fill={colors.textSecondary} fontSize="11" fontWeight="600">CPU Die</text>
              <text x="265" y="66" textAnchor="middle" fill={colors.textMuted} fontSize="11">8 pins</text>
              <text x="160" y="92" textAnchor="middle" fill={colors.textSecondary} fontSize="11">L_eff = L_pin / N</text>
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
              See Parallel Pin Effect
            </button>
          )}
        </div>

        {renderNavDots()}
        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const pins = calculateParallelPins();

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Parallel Power Pins
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
              See how more pins reduce effective inductance
            </p>

            {/* Observation guidance */}
            <div style={{
              background: `${colors.warning}22`,
              border: `1px solid ${colors.warning}44`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{ ...typo.small, color: colors.textPrimary, margin: 0, fontWeight: 600 }}>
                Watch: Increase the number of pins and observe how the effective inductance drops dramatically. The droop percentage should decrease as you add more parallel paths.
              </p>
            </div>

            {/* Side-by-side layout: SVG left, controls right */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px', width: '100%', alignItems: isMobile ? 'center' : 'flex-start' }}>
              {/* SVG panel */}
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '24px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    <ParallelPinsVisualization />
                  </div>

                  {/* Formula display */}
                  <div style={{
                    background: `${colors.accent}11`,
                    border: `1px solid ${colors.accent}33`,
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <p style={{ ...typo.small, color: colors.textPrimary, margin: 0, fontFamily: 'monospace', fontWeight: 600 }}>
                      L_effective = L_pin / N | Droop = (L_eff × di/dt) / V_dd
                    </p>
                  </div>
                </div>
              </div>

              {/* Controls panel */}
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '16px',
                  padding: '20px',
                }}>
                  {/* Number of pins slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Number of Power Pins</span>
                      <span style={{ ...typo.small, color: colors.textSecondary, fontWeight: 600 }}>{numPowerPins}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={numPowerPins}
                      onChange={(e) => setNumPowerPins(parseInt(e.target.value))}
                      style={{ width: '100%', height: '20px', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none' } as React.CSSProperties}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>1 pin</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>100 pins</span>
                    </div>
                  </div>

                  {/* Pin inductance slider */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ ...typo.small, color: colors.textSecondary }}>Inductance per Pin</span>
                      <span style={{ ...typo.small, color: colors.textSecondary, fontWeight: 600 }}>{pinInductance} pH</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="500"
                      step="50"
                      value={pinInductance}
                      onChange={(e) => setPinInductance(parseInt(e.target.value))}
                      style={{ width: '100%', height: '20px', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none' } as React.CSSProperties}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ ...typo.small, color: colors.textMuted }}>50 pH</span>
                      <span style={{ ...typo.small, color: colors.textMuted }}>500 pH</span>
                    </div>
                  </div>

                  {/* Comparison display */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: '12px',
                  }}>
                    <div style={{
                      background: colors.bgSecondary,
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center',
                    }}>
                      <div style={{ ...typo.h3, color: colors.error }}>
                        {pinInductance} pH
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Single Pin Inductance</div>
                    </div>
                    <div style={{
                      background: colors.bgSecondary,
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center',
                    }}>
                      <div style={{ ...typo.h3, color: colors.success }}>
                        {pins.effectiveInductance.toFixed(1)} pH
                      </div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Effective with {numPowerPins} Pins</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {numPowerPins > 10 && (
              <div style={{
                background: `${colors.success}22`,
                border: `1px solid ${colors.success}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                marginTop: '16px',
                textAlign: 'center',
              }}>
                <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                  {numPowerPins} parallel pins reduce inductance by {((1 - 1/numPowerPins) * 100).toFixed(0)}%!
                </p>
              </div>
            )}

            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%', marginTop: '24px' }}
            >
              Understand the Solution
            </button>
          </div>
        </div>

        {renderNavDots()}
        {renderBottomNav()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const twistCorrect = twistPrediction === 'b';

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: twistCorrect ? `${colors.success}22` : `${colors.error}22`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            borderLeft: `4px solid ${twistCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ ...typo.h3, color: twistCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {twistCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ ...typo.body, color: colors.textPrimary, margin: 0 }}>
              Many parallel pins drastically reduce inductance. 100 pins in parallel have 1/100th the inductance of a single pin - essential for delivering fast current transients without excessive droop!
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
                <span style={{ fontSize: '24px' }}>L/N</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Parallel Inductance Rule</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Parallel inductors combine as L_total = L/N. This is why CPUs have hundreds of power pins spread across the entire package - each additional pin reduces the total path inductance.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>PCB</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Power Plane Design</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Multiple PCB layers dedicated to power and ground planes provide low-inductance current return paths. High-performance boards use 12+ layers with thick copper pours.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>IVR</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Integrated Voltage Regulators</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Some designs integrate voltage regulators into the CPU package itself, minimizing the distance (and thus inductance) between VRM and chip. This is the ultimate solution for lowest PDN impedance.
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
        {renderBottomNav()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Power Delivery Network"
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
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
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
                  PDN Connection:
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
              <div style={{ background: colors.bgSecondary, borderRadius: '8px', padding: '12px', marginTop: '12px' }}>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  ⚙️ {app.howItWorks}
                </p>
              </div>
              <div style={{ background: `${app.color}11`, borderRadius: '8px', padding: '12px', marginTop: '8px' }}>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  🔭 Future: {app.futureImpact}
                </p>
              </div>
            </div>

            <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '12px' }}>
              App {selectedApp + 1} of {realWorldApps.length} — {completedApps.filter(Boolean).length} of {realWorldApps.length} explored
            </p>
            <button
              onClick={() => {
                playSound('click');
                const newCompleted = [...completedApps];
                newCompleted[selectedApp] = true;
                setCompletedApps(newCompleted);
                if (selectedApp < realWorldApps.length - 1) {
                  setSelectedApp(selectedApp + 1);
                }
              }}
              style={{ ...primaryButtonStyle, width: '100%', marginBottom: '12px' }}
            >
              Got It — Continue →
            </button>
            {allAppsCompleted && (
              <button
                onClick={() => { playSound('success'); nextPhase(); }}
                style={{ ...primaryButtonStyle, width: '100%', background: colors.success }}
              >
                Take the Knowledge Test
              </button>
            )}
          </div>
        </div>

        {renderNavDots()}
        {renderBottomNav()}
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
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>
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
                ? 'You understand Power Delivery Networks!'
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
          {renderBottomNav()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
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
        {renderBottomNav()}
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
          PDN Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand power delivery networks - one of the hardest challenges in modern chip design.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            Key Concepts Mastered:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Voltage droop = L x di/dt during transients',
              'Decoupling capacitors supply local charge',
              'Many parallel power pins reduce inductance',
              'Target impedance = delta_V / delta_I',
              'Capacitor hierarchy covers all frequencies',
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
        {renderBottomNav()}
      </div>
    );
  }

  return null;
};

export default PowerDeliveryNetworkRenderer;
