'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';

// Phase type for internal state management
type PDNPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface PowerDeliveryNetworkRendererProps {
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
  bgDark: 'rgba(15, 23, 42, 0.95)',
  bgCardLight: '#1e293b',
  border: '#334155',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  power: '#ef4444',
  ground: '#6366f1',
  capacitor: '#22c55e',
  voltage: '#f59e0b',
  primary: '#06b6d4',
};

const PowerDeliveryNetworkRenderer: React.FC<PowerDeliveryNetworkRendererProps> = ({
  gamePhase,
  onGameEvent,
}) => {
  // Phase order and labels for navigation
  const phaseOrder: PDNPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<PDNPhase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Parallel Paths',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  // Internal phase state management
  const getInitialPhase = (): PDNPhase => {
    if (gamePhase && phaseOrder.includes(gamePhase as PDNPhase)) {
      return gamePhase as PDNPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<PDNPhase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as PDNPhase) && gamePhase !== phase) {
      setPhase(gamePhase as PDNPhase);
    }
  }, [gamePhase]);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state
  const [currentDemand, setCurrentDemand] = useState(50); // Amps
  const [decouplingCapacitance, setDecouplingCapacitance] = useState(100); // uF total
  const [pathInductance, setPathInductance] = useState(100); // pH
  const [vrDistance, setVrDistance] = useState(20); // mm from VRM to chip
  const [animationTime, setAnimationTime] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
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
        gameType: 'power_delivery_network',
        gameTitle: 'Power Delivery Network',
        details,
        timestamp: Date.now()
      });
    }
  }, [onGameEvent]);

  // Navigation function
  const goToPhase = useCallback((p: PDNPhase) => {
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

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Animation
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationTime(t => (t + 1) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Physics calculations
  const calculatePDN = useCallback(() => {
    // Target voltage
    const vTarget = 1.0; // V (typical modern CPU core voltage)

    // Supply inductance from VRM distance (approximately 1nH/mm for PCB trace)
    const totalInductance = pathInductance * 1e-12 + vrDistance * 1e-9; // Henries

    // Maximum di/dt for current step (assume 1ns rise time)
    const diDt = currentDemand / 1e-9; // A/s

    // Voltage droop from inductance: V = L * di/dt
    const inductiveDroop = totalInductance * diDt;

    // Impedance target to limit droop to 5% of Vdd
    const targetImpedance = (0.05 * vTarget) / currentDemand; // Ohms

    // Actual PDN impedance (simplified model)
    // Z = sqrt(L/C) at resonance
    const pdnImpedance = Math.sqrt(totalInductance / (decouplingCapacitance * 1e-6));

    // Voltage droop percentage
    const droopPercentage = (inductiveDroop / vTarget) * 100;

    // Resonant frequency
    const resonantFreq = 1 / (2 * Math.PI * Math.sqrt(totalInductance * decouplingCapacitance * 1e-6));

    // Effective voltage with droop
    const effectiveVoltage = Math.max(0.7, vTarget - inductiveDroop);

    return {
      vTarget,
      totalInductance: totalInductance * 1e12, // pH
      inductiveDroop: Math.min(inductiveDroop * 1000, 500), // mV, capped
      droopPercentage: Math.min(droopPercentage, 50), // %, capped
      targetImpedance: targetImpedance * 1000, // mOhm
      pdnImpedance: pdnImpedance * 1000, // mOhm
      resonantFreq: resonantFreq / 1e6, // MHz
      effectiveVoltage: Math.max(effectiveVoltage, 0.5),
    };
  }, [currentDemand, decouplingCapacitance, pathInductance, vrDistance]);

  const predictions = [
    { id: 'unlimited', label: 'A single wire can deliver unlimited current if thick enough' },
    { id: 'resistance', label: 'The main problem is resistance causing voltage drop (I x R)' },
    { id: 'inductance', label: 'Inductance causes voltage droops during fast current changes (L x di/dt)' },
    { id: 'capacitance', label: 'Capacitance in the wires blocks DC current flow' },
  ];

  const twistPredictions = [
    { id: 'one', label: 'One big power pin would work if it is large enough' },
    { id: 'distributed', label: 'Many pins distributed across the package are needed to reduce inductance' },
    { id: 'wireless', label: 'Wireless power would solve the problem' },
    { id: 'optical', label: 'Optical power delivery is the solution' },
  ];

  const transferApplications = [
    {
      title: 'CPU Voltage Regulator Modules (VRMs)',
      description: 'Gaming motherboards have massive VRM sections near the CPU socket. High-end boards have 16+ power phases.',
      question: 'Why do high-performance motherboards have so many VRM phases?',
      answer: 'More phases mean lower inductance per path, faster transient response, and better current sharing. A 200A CPU with 1ns transients needs parallel paths to limit voltage droop to acceptable levels.',
    },
    {
      title: 'Smartphone Power Management',
      description: 'Modern phones run chips at less than 1V but need to deliver 10+ amps during heavy workloads.',
      question: 'How do phones handle the PDN challenge with such thin PCBs?',
      answer: 'Package-on-package (PoP) stacking puts memory directly on the processor, shortening power paths. Integrated voltage regulators inside the chip package minimize inductance. Many tiny capacitors are distributed across the package.',
    },
    {
      title: 'GPU Power Delivery',
      description: 'High-end GPUs can consume 400+ watts with current spikes exceeding 100A at under 1V.',
      question: 'Why do GPU PCBs have such thick copper layers and many capacitors?',
      answer: 'Thick copper reduces resistance and inductance. Hundreds of capacitors provide local charge storage for transients. Without this, voltage would droop below the minimum operating threshold during heavy compute loads.',
    },
    {
      title: 'Data Center Server Design',
      description: 'Servers run 24/7 and must maintain stable operation under wildly varying loads.',
      question: 'Why do servers use 48V distribution instead of 12V?',
      answer: 'Higher voltage means lower current for the same power (P = V x I). Lower current means less I^2R loss and less L x di/dt droop. 48V distribution lets the final voltage conversion happen very close to the processor.',
    },
  ];

  const testQuestions = [
    {
      question: 'What causes voltage droop during fast current transients?',
      options: [
        { text: 'Resistance in the power path', correct: false },
        { text: 'Inductance in the power path (V = L x di/dt)', correct: true },
        { text: 'Capacitance in the power path', correct: false },
        { text: 'Temperature of the conductors', correct: false },
      ],
    },
    {
      question: 'Decoupling capacitors are placed near the CPU to:',
      options: [
        { text: 'Filter out radio frequency interference', correct: false },
        { text: 'Store local charge to supply current during fast transients', correct: true },
        { text: 'Prevent static electricity damage', correct: false },
        { text: 'Cool down the processor', correct: false },
      ],
    },
    {
      question: 'Why do modern CPUs have hundreds of power pins?',
      options: [
        { text: 'To carry more total current through thicker wires', correct: false },
        { text: 'To reduce inductance by providing many parallel paths', correct: true },
        { text: 'For mechanical strength of the package', correct: false },
        { text: 'For redundancy in case some pins fail', correct: false },
      ],
    },
    {
      question: 'Target impedance for a 1V, 100A processor with 5% droop tolerance is:',
      options: [
        { text: '1 Ohm', correct: false },
        { text: '0.5 mOhm (500 microOhms)', correct: true },
        { text: '100 Ohms', correct: false },
        { text: '5 Ohms', correct: false },
      ],
    },
    {
      question: 'What happens if voltage droops below the CPU minimum operating voltage?',
      options: [
        { text: 'The CPU runs slower', correct: false },
        { text: 'The CPU may produce incorrect results or crash', correct: true },
        { text: 'The CPU uses less power', correct: false },
        { text: 'Nothing, the CPU compensates automatically', correct: false },
      ],
    },
    {
      question: 'Different types of capacitors (bulk, ceramic, on-die) target different:',
      options: [
        { text: 'Voltage levels', correct: false },
        { text: 'Frequency ranges of current transients', correct: true },
        { text: 'Temperature ranges', correct: false },
        { text: 'Manufacturing costs', correct: false },
      ],
    },
    {
      question: 'The power delivery network impedance should be:',
      options: [
        { text: 'As high as possible to limit current', correct: false },
        { text: 'As low as possible across all frequencies of interest', correct: true },
        { text: 'Exactly 50 Ohms for impedance matching', correct: false },
        { text: 'Variable depending on load', correct: false },
      ],
    },
    {
      question: 'Moving the voltage regulator closer to the CPU helps because:',
      options: [
        { text: 'It is easier to cool', correct: false },
        { text: 'It reduces the inductance of the power delivery path', correct: true },
        { text: 'It looks better on the motherboard', correct: false },
        { text: 'It reduces electromagnetic interference', correct: false },
      ],
    },
    {
      question: 'On-die capacitors in modern CPUs serve what purpose?',
      options: [
        { text: 'Store data when power is off', correct: false },
        { text: 'Provide the fastest response to the highest frequency transients', correct: true },
        { text: 'Generate the clock signal', correct: false },
        { text: 'Measure chip temperature', correct: false },
      ],
    },
    {
      question: 'As CPU voltages decrease (from 5V to under 1V), PDN design becomes harder because:',
      options: [
        { text: 'Lower voltage is harder to generate', correct: false },
        { text: 'Smaller voltage margin means tighter droop requirements', correct: true },
        { text: 'Current decreases, requiring smaller wires', correct: false },
        { text: 'Capacitors do not work at low voltages', correct: false },
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
        {/* Back button */}
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

        {/* Progress dots */}
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

        {/* Phase indicator */}
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
  const renderBottomBar = (canGoNext: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);

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

  const renderVisualization = () => {
    const pdn = calculatePDN();
    const width = 400;
    const height = 420;

    // Current surge animation
    const surgePhase = (animationTime / 360) * 2 * Math.PI;
    const isSurging = Math.sin(surgePhase * 2) > 0.7;

    // Voltage droop animation during surge
    const droopActive = isSurging && pdn.droopPercentage > 5;

    // Ripple animation for voltage indicator
    const rippleOffset = Math.sin(surgePhase * 3) * 2;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        {/* Title moved outside SVG using typo system */}
        <div style={{
          fontSize: typo.heading,
          fontWeight: 700,
          color: colors.textPrimary,
          textAlign: 'center',
          marginBottom: '4px'
        }}>
          Power Delivery Network (PDN)
        </div>

        <svg
          width="100%"
          height={height - 30}
          viewBox={`0 0 ${width} ${height - 30}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            {/* Premium VRM metallic gradient with 6 color stops */}
            <linearGradient id="pdnVrmMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7f1d1d" />
              <stop offset="20%" stopColor="#b91c1c" />
              <stop offset="40%" stopColor="#ef4444" />
              <stop offset="60%" stopColor="#dc2626" />
              <stop offset="80%" stopColor="#991b1b" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>

            {/* VRM brushed metal effect */}
            <linearGradient id="pdnVrmBrushed" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="15%" stopColor="#4b5563" />
              <stop offset="30%" stopColor="#374151" />
              <stop offset="45%" stopColor="#6b7280" />
              <stop offset="60%" stopColor="#374151" />
              <stop offset="75%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* Capacitor premium gradient with 5 color stops */}
            <linearGradient id="pdnCapGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="25%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#16a34a" />
              <stop offset="75%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#166534" />
            </linearGradient>

            {/* Ceramic capacitor gradient */}
            <linearGradient id="pdnCeramicGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="30%" stopColor="#4ade80" />
              <stop offset="70%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>

            {/* Power plane gradient with 4 color stops */}
            <linearGradient id="pdnPowerPlane" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#312e81" />
              <stop offset="33%" stopColor="#4338ca" />
              <stop offset="66%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>

            {/* Ground plane premium gradient */}
            <linearGradient id="pdnGroundPlane" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="25%" stopColor="#312e81" />
              <stop offset="50%" stopColor="#4338ca" />
              <stop offset="75%" stopColor="#312e81" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>

            {/* CPU die gradient */}
            <linearGradient id="pdnCpuDie" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="25%" stopColor="#312e81" />
              <stop offset="50%" stopColor="#3730a3" />
              <stop offset="75%" stopColor="#312e81" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>

            {/* Voltage ripple indicator gradient */}
            <linearGradient id="pdnVoltageRipple" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fcd34d" stopOpacity="0" />
              <stop offset="30%" stopColor="#fbbf24" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="1" />
              <stop offset="70%" stopColor="#fbbf24" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fcd34d" stopOpacity="0" />
            </linearGradient>

            {/* Inductance coil gradient */}
            <linearGradient id="pdnInductorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="25%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            {/* Current flow glow */}
            <radialGradient id="pdnCurrentGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* Waveform background gradient */}
            <linearGradient id="pdnWaveformBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#020617" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
            </linearGradient>

            {/* Metrics panel gradient */}
            <linearGradient id="pdnMetricsBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#0f172a" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0.6" />
            </linearGradient>

            {/* VRM glow filter */}
            <filter id="pdnVrmGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Capacitor glow filter */}
            <filter id="pdnCapGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Current flow blur */}
            <filter id="pdnCurrentBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" />
            </filter>

            {/* Voltage droop glow */}
            <filter id="pdnDroopGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Pin glow effect */}
            <filter id="pdnPinGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* System diagram */}
          <g transform="translate(30, 20)">
            {/* VRM (Voltage Regulator Module) with premium metallic look */}
            <g filter="url(#pdnVrmGlow)">
              {/* VRM base with brushed metal */}
              <rect x={0} y={40} width={60} height={80} fill="url(#pdnVrmBrushed)" rx={8} />
              {/* VRM heatsink fins */}
              {[0, 1, 2, 3, 4].map(i => (
                <rect key={i} x={5 + i * 11} y={42} width={8} height={20} fill="url(#pdnVrmMetal)" rx={1} opacity={0.9} />
              ))}
              {/* VRM core */}
              <rect x={8} y={65} width={44} height={50} fill="url(#pdnVrmMetal)" rx={4} />
              {/* VRM indicator LED */}
              <circle cx={52} cy={110} r={3} fill={isSurging ? '#ef4444' : '#22c55e'}>
                <animate attributeName="opacity" values="0.6;1;0.6" dur="1s" repeatCount="indefinite" />
              </circle>
            </g>

            {/* Power path (with inductance representation) */}
            <g transform="translate(70, 70)">
              {/* Inductance coils with premium gradient */}
              <path d="M 0 10 C 10 0, 20 0, 30 10 C 40 20, 50 20, 60 10 C 70 0, 80 0, 90 10"
                stroke="url(#pdnInductorGrad)" strokeWidth={4} fill="none" strokeLinecap="round" />
              {/* Inductance glow */}
              <path d="M 0 10 C 10 0, 20 0, 30 10 C 40 20, 50 20, 60 10 C 70 0, 80 0, 90 10"
                stroke="url(#pdnInductorGrad)" strokeWidth={8} fill="none" opacity={0.3} filter="url(#pdnCurrentBlur)" />

              {/* Current flow indicators - multiple animated particles */}
              {isSurging && (
                <>
                  <circle cx={15 + Math.sin(surgePhase * 5) * 15 + 30} cy={10 + Math.cos(surgePhase * 5) * 5} r={6} fill="url(#pdnCurrentGlow)" filter="url(#pdnCurrentBlur)" />
                  <circle cx={15 + Math.sin(surgePhase * 5) * 15 + 30} cy={10 + Math.cos(surgePhase * 5) * 5} r={3} fill="#fbbf24" />
                  <circle cx={45 + Math.sin(surgePhase * 5 + 1) * 15} cy={10 + Math.cos(surgePhase * 5 + 1) * 5} r={5} fill="url(#pdnCurrentGlow)" filter="url(#pdnCurrentBlur)" />
                  <circle cx={45 + Math.sin(surgePhase * 5 + 1) * 15} cy={10 + Math.cos(surgePhase * 5 + 1) * 5} r={2} fill="#fbbf24" />
                </>
              )}
            </g>

            {/* Decoupling capacitors with premium visualization */}
            <g transform="translate(180, 40)">
              {/* Bulk capacitors with glow */}
              <g filter="url(#pdnCapGlow)">
                <rect x={0} y={0} width={30} height={50} fill="url(#pdnCapGrad)" rx={4} />
                {/* Capacitor terminals */}
                <rect x={12} y={-5} width={6} height={8} fill="#9ca3af" rx={1} />
                <rect x={12} y={47} width={6} height={8} fill="#9ca3af" rx={1} />
                {/* Capacitor marking */}
                <rect x={5} y={20} width={20} height={10} fill="rgba(0,0,0,0.3)" rx={2} />
              </g>

              {/* Ceramic capacitors */}
              <g filter="url(#pdnCapGlow)">
                <rect x={40} y={10} width={20} height={30} fill="url(#pdnCeramicGrad)" rx={3} />
                {/* Ceramic capacitor terminals */}
                <rect x={42} y={8} width={4} height={4} fill="#d4d4d4" rx={1} />
                <rect x={54} y={8} width={4} height={4} fill="#d4d4d4" rx={1} />
                <rect x={42} y={38} width={4} height={4} fill="#d4d4d4" rx={1} />
                <rect x={54} y={38} width={4} height={4} fill="#d4d4d4" rx={1} />
              </g>

              {/* On-package capacitors */}
              <rect x={70} y={15} width={15} height={20} fill="url(#pdnCeramicGrad)" rx={2} opacity={0.8} />
            </g>

            {/* CPU/Chip with premium die appearance */}
            <g>
              {/* CPU package substrate */}
              <rect x={268} y={28} width={74} height={104} fill="#1e293b" rx={10} stroke="#475569" strokeWidth={1} />
              {/* CPU die with gradient */}
              <rect x={275} y={35} width={60} height={55} fill="url(#pdnCpuDie)" rx={4} stroke={colors.ground} strokeWidth={2} />
              {/* Die hotspot glow */}
              <ellipse cx={305} cy={55} rx={15} ry={10} fill="rgba(99, 102, 241, 0.3)" filter="url(#pdnCurrentBlur)" />

              {/* On-die capacitors with premium look */}
              <rect x={280} y={70} width={50} height={12} fill="url(#pdnCeramicGrad)" opacity={0.5} rx={2} />
              {/* On-die cap pattern */}
              {[0, 1, 2, 3, 4].map(i => (
                <rect key={i} x={282 + i * 10} y={72} width={6} height={8} fill="url(#pdnCapGrad)" opacity={0.7} rx={1} />
              ))}
            </g>

            {/* Power pins visualization with glow */}
            <g filter="url(#pdnPinGlow)">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <rect
                  key={i}
                  x={275 + i * 10}
                  y={95}
                  width={6}
                  height={30}
                  fill={isSurging ? 'url(#pdnVrmMetal)' : 'url(#pdnInductorGrad)'}
                  opacity={0.8 + Math.sin(surgePhase + i) * 0.2}
                  rx={1}
                />
              ))}
            </g>

            {/* Ground return with premium gradient */}
            <rect x={0} y={155} width={340} height={8} fill="url(#pdnGroundPlane)" rx={2} />
            {/* Ground plane pattern lines */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
              <line key={i} x1={20 + i * 40} y1={157} x2={20 + i * 40} y2={161} stroke="#6366f1" strokeWidth={1} opacity={0.5} />
            ))}

            {/* VRM distance indicator with premium style */}
            <line x1={60} y1={140} x2={270} y2={140} stroke="url(#pdnVoltageRipple)" strokeWidth={2} strokeDasharray="6,3" />
            {/* Distance markers */}
            <line x1={60} y1={135} x2={60} y2={145} stroke={colors.accent} strokeWidth={2} />
            <line x1={270} y1={135} x2={270} y2={145} stroke={colors.accent} strokeWidth={2} />
          </g>

          {/* Voltage waveform section */}
          <g transform="translate(30, 210)">
            <rect x={0} y={0} width={340} height={60} fill="url(#pdnWaveformBg)" rx={6} stroke="#334155" strokeWidth={1} />

            {/* Target voltage line */}
            <line x1={10} y1={15} x2={320} y2={15} stroke={colors.success} strokeWidth={1.5} strokeDasharray="4,4" opacity={0.8} />

            {/* Minimum voltage line */}
            <line x1={10} y1={45} x2={320} y2={45} stroke={colors.error} strokeWidth={1.5} strokeDasharray="4,4" opacity={0.8} />

            {/* Voltage ripple indicator - animated wave */}
            <path
              d={`M 10 ${15 + rippleOffset} Q 40 ${12 + rippleOffset}, 70 ${15 + rippleOffset} T 130 ${15 + rippleOffset} T 190 ${15 + rippleOffset} T 250 ${15 + rippleOffset} T 310 ${15 + rippleOffset}`}
              stroke="url(#pdnVoltageRipple)" strokeWidth={2} fill="none" opacity={0.6}
            />

            {/* Actual voltage with droop - premium animated path */}
            <path
              d={`M 10 15 L 80 15 L 85 ${15 + pdn.droopPercentage * 0.6} L 120 ${15 + pdn.droopPercentage * 0.4} L 160 ${15 + pdn.droopPercentage * 0.2} L 200 17 L 240 15 L 320 15`}
              stroke={droopActive ? colors.error : colors.voltage}
              strokeWidth={2.5}
              fill="none"
              filter={droopActive ? 'url(#pdnDroopGlow)' : undefined}
            />

            {/* Droop indicator with glow */}
            {pdn.droopPercentage > 3 && (
              <g filter="url(#pdnDroopGlow)">
                <line x1={100} y1={15} x2={100} y2={15 + pdn.droopPercentage * 0.5} stroke={colors.accent} strokeWidth={2} />
                <circle cx={100} cy={15 + pdn.droopPercentage * 0.5} r={3} fill={colors.accent} />
              </g>
            )}
          </g>

          {/* Metrics panel with premium background */}
          <g transform="translate(30, 280)">
            <rect x={0} y={0} width={340} height={90} fill="url(#pdnMetricsBg)" rx={8} stroke="#334155" strokeWidth={1} />

            {/* Droop status indicator bar */}
            <rect x={10} y={10} width={100} height={4} fill="#1e293b" rx={2} />
            <rect x={10} y={10} width={Math.min(pdn.droopPercentage * 5, 100)} height={4}
              fill={pdn.droopPercentage > 10 ? colors.error : pdn.droopPercentage > 5 ? colors.warning : colors.success} rx={2} />

            {/* Impedance match indicator */}
            <rect x={120} y={10} width={100} height={4} fill="#1e293b" rx={2} />
            <rect x={120} y={10} width={Math.min((pdn.targetImpedance / pdn.pdnImpedance) * 100, 100)} height={4}
              fill={pdn.pdnImpedance < pdn.targetImpedance ? colors.success : colors.error} rx={2} />

            {/* Status LED */}
            <circle cx={320} cy={12} r={6} fill={pdn.pdnImpedance < pdn.targetImpedance ? colors.success : colors.error}>
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
            </circle>
          </g>
        </svg>

        {/* Metrics labels moved outside SVG using typo system */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: typo.elementGap,
          width: '100%',
          maxWidth: '500px',
          padding: `0 ${typo.cardPadding}`,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: typo.small, color: colors.textMuted }}>Droop</div>
            <div style={{
              fontSize: typo.bodyLarge,
              fontWeight: 700,
              color: pdn.droopPercentage > 10 ? colors.error : colors.success
            }}>
              {pdn.droopPercentage.toFixed(1)}% ({pdn.inductiveDroop.toFixed(0)}mV)
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: typo.small, color: colors.textMuted }}>PDN Z</div>
            <div style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary }}>
              {pdn.pdnImpedance.toFixed(2)} mohm
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: typo.small, color: colors.textMuted }}>Target Z</div>
            <div style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary }}>
              {pdn.targetImpedance.toFixed(2)} mohm
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          maxWidth: '500px',
          padding: `0 ${typo.cardPadding}`,
          marginTop: '4px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: typo.small, color: colors.textMuted }}>Inductance:</span>
            <span style={{ fontSize: typo.body, color: colors.voltage }}>{pdn.totalInductance.toFixed(0)} pH</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: typo.small, color: colors.textMuted }}>VRM Distance:</span>
            <span style={{ fontSize: typo.body, color: colors.accent }}>{vrDistance}mm</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: typo.small, color: colors.textMuted }}>Status:</span>
            <span style={{
              fontSize: typo.body,
              fontWeight: 700,
              color: pdn.pdnImpedance < pdn.targetImpedance ? colors.success : colors.error
            }}>
              {pdn.pdnImpedance < pdn.targetImpedance ? 'GOOD' : 'NEEDS CAPS'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Current Demand: {currentDemand} A
        </label>
        <input
          type="range"
          min="10"
          max="200"
          step="5"
          value={currentDemand}
          onChange={(e) => setCurrentDemand(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Decoupling Capacitance: {decouplingCapacitance} uF
        </label>
        <input
          type="range"
          min="10"
          max="500"
          step="10"
          value={decouplingCapacitance}
          onChange={(e) => setDecouplingCapacitance(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Path Inductance: {pathInductance} pH
        </label>
        <input
          type="range"
          min="10"
          max="500"
          step="10"
          value={pathInductance}
          onChange={(e) => setPathInductance(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          VRM Distance: {vrDistance} mm
        </label>
        <input
          type="range"
          min="5"
          max="50"
          step="5"
          value={vrDistance}
          onChange={(e) => setVrDistance(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          V_droop = L x di/dt | Target Z = 5% x Vdd / I_max
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Lower impedance = better transient response
        </div>
      </div>
    </div>
  );

  // Render content based on phase
  const renderContent = () => {
    switch (phase) {
      case 'hook':
        return (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Power Delivery Network (PDN)
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Why do chips have hundreds of power pins?
            </p>
            {renderVisualization()}
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginTop: '16px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                A modern CPU can demand 200+ amps at under 1 volt. When it suddenly needs more current
                (like when starting a heavy computation), the voltage can crash if power cannot be
                delivered fast enough.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                The power delivery network is one of the hardest challenges in chip design!
              </p>
            </div>
          </div>
        );

      case 'predict':
        return (
          <div style={{ padding: '20px' }}>
            {renderVisualization()}
            <div style={{
              background: colors.bgCard,
              margin: '16px 0',
              padding: '16px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Question:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
                A CPU suddenly demands 100 amps more current in 1 nanosecond (a "current transient").
                What is the main challenge in delivering this power?
              </p>
            </div>
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
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 'play':
        return (
          <div style={{ padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore the PDN</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Adjust parameters to see how voltage droop changes
              </p>
            </div>
            {renderVisualization()}
            {renderControls()}
            <div style={{
              background: colors.bgCard,
              padding: '16px',
              borderRadius: '12px',
            }}>
              <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
              <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li>Increase current demand - watch voltage droop grow</li>
                <li>Add more decoupling capacitance - see droop decrease</li>
                <li>Move VRM closer - notice reduced inductance helps</li>
                <li>Try to get droop below 5% at 100A</li>
              </ul>
            </div>
          </div>
        );

      case 'review':
        const wasCorrect = prediction === 'inductance';
        return (
          <div style={{ padding: '20px' }}>
            <div style={{
              background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '20px',
              borderRadius: '12px',
              borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
              marginBottom: '16px'
            }}>
              <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
                {wasCorrect ? 'Correct!' : 'Not Quite!'}
              </h3>
              <p style={{ color: colors.textPrimary }}>
                Inductance is the enemy of fast current delivery! V = L x di/dt means that
                even tiny inductance (nanohenries) creates huge voltage drops when current
                changes in nanoseconds.
              </p>
            </div>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Power Delivery Fundamentals</h3>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Voltage Droop:</strong> V = L x di/dt.
                  100A in 1ns through 100pH = 10mV drop. At 1V supply, that is 1%!
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Decoupling Capacitors:</strong> Store
                  charge locally to supply current faster than the remote VRM can respond.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Target Impedance:</strong> Z = deltaV / deltaI.
                  For 5% droop at 100A on 1V: Z = 0.05V / 100A = 0.5 milliohms!
                </p>
                <p>
                  <strong style={{ color: colors.textPrimary }}>Capacitor Hierarchy:</strong> Bulk caps for
                  low frequency, ceramics for mid, on-die caps for highest frequency transients.
                </p>
              </div>
            </div>
          </div>
        );

      case 'twist_predict':
        return (
          <div style={{ padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
              <p style={{ color: colors.textSecondary }}>
                Why do modern CPUs have hundreds of power and ground pins?
              </p>
            </div>
            {renderVisualization()}
            <div style={{
              background: colors.bgCard,
              margin: '16px 0',
              padding: '16px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Pin Count Mystery:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
                An Intel Core processor has over 1,000 pins in its package.
                About half are power and ground - not for data!
                Why so many just for power delivery?
              </p>
            </div>
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
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 'twist_play':
        return (
          <div style={{ padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Parallel Paths = Lower Inductance</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Explore how path inductance affects droop
              </p>
            </div>
            {renderVisualization()}
            {renderControls()}
            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '12px',
              borderLeft: `3px solid ${colors.warning}`,
            }}>
              <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Insight:</h4>
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Parallel inductors: L_total = L / N. Ten parallel power pins have 1/10 the inductance
                of a single pin. This is why CPUs have hundreds of power pins - each one reduces
                the total path inductance!
              </p>
            </div>
          </div>
        );

      case 'twist_review':
        const twistCorrect = twistPrediction === 'distributed';
        return (
          <div style={{ padding: '20px' }}>
            <div style={{
              background: twistCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              padding: '20px',
              borderRadius: '12px',
              borderLeft: `4px solid ${twistCorrect ? colors.success : colors.error}`,
              marginBottom: '16px'
            }}>
              <h3 style={{ color: twistCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
                {twistCorrect ? 'Correct!' : 'Not Quite!'}
              </h3>
              <p style={{ color: colors.textPrimary }}>
                Many parallel pins drastically reduce inductance. 100 pins in parallel have
                1/100th the inductance of a single pin. This is essential for delivering
                fast current transients without excessive voltage droop.
              </p>
            </div>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
            }}>
              <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Parallel Path Strategy</h3>
              <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Package Design:</strong> Power and ground
                  pins are spread across the entire package, not clustered in one corner.
                </p>
                <p style={{ marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>PCB Design:</strong> Multiple layers
                  dedicated to power and ground planes, with many vias connecting them.
                </p>
                <p>
                  <strong style={{ color: colors.textPrimary }}>Integrated VR:</strong> Some designs
                  integrate voltage regulators into the CPU package itself, minimizing the
                  distance (and thus inductance) between VRM and chip.
                </p>
              </div>
            </div>
          </div>
        );

      case 'transfer':
        return (
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              Power delivery challenges are everywhere in high-performance electronics
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test
            </p>
            {transferApplications.map((app, index) => (
              <div
                key={index}
                style={{
                  background: colors.bgCard,
                  margin: '0 0 16px 0',
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
                    style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}
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
        );

      case 'test':
        if (testSubmitted) {
          return (
            <div style={{ padding: '20px' }}>
              <div style={{
                background: testScore >= 7 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                padding: '24px',
                borderRadius: '12px',
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                <h2 style={{ color: testScore >= 7 ? colors.success : colors.error, marginBottom: '8px' }}>
                  {testScore >= 7 ? 'Excellent!' : 'Keep Learning!'}
                </h2>
                <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
                <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                  {testScore >= 7 ? 'You understand Power Delivery Networks!' : 'Review the material and try again.'}
                </p>
              </div>
              {testQuestions.map((q, qIndex) => {
                const userAnswer = testAnswers[qIndex];
                const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
                return (
                  <div key={qIndex} style={{ background: colors.bgCard, marginBottom: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
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
          );
        }

        const currentQ = testQuestions[currentTestQuestion];
        return (
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
            </div>
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
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px' }}>
                  {opt.text}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
              {currentTestQuestion < testQuestions.length - 1 ? (
                <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button>
              ) : (
                <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
              )}
            </div>
          </div>
        );

      case 'mastery':
        return (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You understand Power Delivery Networks!</p>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', textAlign: 'left', marginBottom: '16px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
              <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li>Voltage droop = L x di/dt during current transients</li>
                <li>Decoupling capacitors supply local charge</li>
                <li>Many parallel power pins reduce inductance</li>
                <li>Target impedance = deltaV_allowed / I_max</li>
                <li>Capacitor hierarchy covers different frequencies</li>
              </ul>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '20px', borderRadius: '12px', textAlign: 'left' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
              <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
                As CPUs push beyond 300W TDP and voltages drop below 1V, power delivery becomes
                the limiting factor in performance. Advanced packaging with integrated voltage
                regulators, 3D stacking with through-silicon vias, and even on-chip inductors
                are being explored to push the boundaries of power delivery!
              </p>
            </div>
            {renderVisualization()}
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
        return { canGoNext: true, nextLabel: 'Make a Prediction' };
      case 'predict':
        return { canGoNext: !!prediction, nextLabel: 'Test My Prediction' };
      case 'play':
        return { canGoNext: true, nextLabel: 'Continue to Review' };
      case 'review':
        return { canGoNext: true, nextLabel: 'Next: A Twist!' };
      case 'twist_predict':
        return { canGoNext: !!twistPrediction, nextLabel: 'Test My Prediction' };
      case 'twist_play':
        return { canGoNext: true, nextLabel: 'See the Explanation' };
      case 'twist_review':
        return { canGoNext: true, nextLabel: 'Apply This Knowledge' };
      case 'transfer':
        return { canGoNext: transferCompleted.size >= 4, nextLabel: transferCompleted.size >= 4 ? 'Take the Test' : `Explore ${4 - transferCompleted.size} more` };
      case 'test':
        if (testSubmitted) {
          return { canGoNext: testScore >= 7, nextLabel: testScore >= 7 ? 'Complete Mastery' : 'Review & Retry' };
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
      background: colors.bgPrimary,
      color: colors.textPrimary
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {renderContent()}
      </div>
      {renderBottomBar(navState.canGoNext, navState.nextLabel)}
    </div>
  );
};

export default PowerDeliveryNetworkRenderer;
