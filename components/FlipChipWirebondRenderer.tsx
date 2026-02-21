const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {};

import React, { useState, useCallback, useEffect, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';


import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';

interface GameEvent {
  type: 'phase_complete' | 'answer_correct' | 'answer_incorrect' | 'interaction';
  phase?: string;
  data?: Record<string, unknown>;
}

interface FlipChipWirebondRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

type FCWBPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const validPhases: FCWBPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseOrder: FCWBPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<FCWBPhase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Play',
  review: 'Review',
  twist_predict: 'Twist',
  twist_play: 'Explore',
  twist_review: 'Insight',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery',
};

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#cbd5e1', // brightness >= 180 for contrast
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  wirebond: '#f59e0b',
  flipchip: '#3b82f6',
  thermal: '#ef4444',
  signal: '#10b981',
  power: '#8b5cf6',
  die: '#4b5563',
  substrate: '#374151',
  heatsink: '#6b7280',
};

const FlipChipWirebondRenderer: React.FC<FlipChipWirebondRendererProps> = ({
  onGameEvent,
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase state management
  const getInitialPhase = (): FCWBPhase => {
    if (gamePhase && validPhases.includes(gamePhase as FCWBPhase)) {
      return gamePhase as FCWBPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<FCWBPhase>(getInitialPhase);
  const { isMobile } = useViewport();
// Sync with external gamePhase prop changes
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as FCWBPhase)) {
      setPhase(gamePhase as FCWBPhase);
    }
  }, [gamePhase]);

  // Mobile detection
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
  const goToPhase = useCallback((newPhase: FCWBPhase) => {
    playSound('transition');
    setPhase(newPhase);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });

    if (onGameEvent) {
      onGameEvent({ type: 'phase_complete', phase: newPhase });
    }
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
  const [packageType, setPackageType] = useState<'wirebond' | 'flipchip'>('wirebond');
  const [wireLength, setWireLength] = useState(2); // mm
  const [signalFrequency, setSignalFrequency] = useState(1); // GHz
  const [powerCurrent, setPowerCurrent] = useState(10); // Amps
  const [diePower, setDiePower] = useState(50); // Watts
  const [showThermal, setShowThermal] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentApp, setCurrentApp] = useState(0);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [checkedAnswers, setCheckedAnswers] = useState<Set<number>>(new Set());
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics calculations
  const calculateElectrical = useCallback(() => {
    const wirebondInductance = wireLength * 1.0; // nH per mm
    const flipchipInductance = 0.1; // nH (very short bump)

    const inductance = packageType === 'wirebond' ? wirebondInductance : flipchipInductance;

    const wirebondResistance = wireLength * 2; // mOhm per mm
    const flipchipResistance = 0.5; // mOhm for bump

    const resistance = packageType === 'wirebond' ? wirebondResistance : flipchipResistance;

    const omega = 2 * Math.PI * signalFrequency * 1e9;
    const inductiveReactance = omega * inductance * 1e-9;
    const impedance = Math.sqrt(Math.pow(resistance * 1e-3, 2) + Math.pow(inductiveReactance, 2));

    const diDt = powerCurrent * signalFrequency * 1e9;
    const groundBounce = inductance * 1e-9 * diDt * 1000;

    const signalDelay = inductance * 0.01;

    const irDrop = powerCurrent * resistance;

    return {
      inductance,
      resistance,
      impedance: impedance * 1000,
      groundBounce: Math.min(groundBounce, 500),
      signalDelay,
      irDrop,
    };
  }, [packageType, wireLength, signalFrequency, powerCurrent]);

  const calculateThermal = useCallback(() => {
    const wirebondRthJunction = 2.0;
    const flipchipRthJunction = 0.3;

    const rthJunction = packageType === 'wirebond' ? wirebondRthJunction : flipchipRthJunction;

    const rthSubstrate = 0.5;
    const rthHeatsink = 0.2;

    const rthTotal = rthJunction + rthSubstrate + rthHeatsink;

    const deltaT = diePower * rthTotal;
    const junctionTemp = 25 + deltaT;

    const maxPower = (100 - 25) / rthTotal;

    return {
      rthJunction,
      rthTotal,
      deltaT,
      junctionTemp,
      maxPower,
    };
  }, [packageType, diePower]);

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => (prev + 0.1) % (2 * Math.PI));
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'same', label: 'Wire bonds and flip-chip bumps perform the same electrically' },
    { id: 'wirebond_better', label: 'Wire bonds are better - they are more flexible' },
    { id: 'flipchip_better', label: 'Flip-chip is better - shorter path means lower inductance' },
    { id: 'depends', label: 'It depends entirely on the wire material' },
  ];

  const twistPredictions = [
    { id: 'thermal_same', label: 'Thermal performance is the same for both' },
    { id: 'wirebond_thermal', label: 'Wire bond is better thermally - die face-up for cooling' },
    { id: 'flipchip_thermal', label: 'Flip-chip is better thermally - direct path to heat spreader' },
    { id: 'neither', label: 'Neither matters - only the heatsink determines thermal performance' },
  ];

  const transferApplications = [
    {
      title: 'High-Performance CPUs',
      description: 'Modern CPUs use flip-chip packaging with hundreds of power and ground connections.',
      question: 'Why do CPUs require such large power delivery networks?',
      answer: 'At 100+ Amps and frequent load transients, the L*di/dt voltage droop must be minimized. Many parallel paths reduce total inductance. On-chip decoupling capacitors and package-level capacitors provide charge during transients.',
    },
    {
      title: 'High-Speed Memory Interfaces',
      description: 'DDR and GDDR memory runs at multi-GHz frequencies with precise timing.',
      question: 'How does package inductance affect memory signal integrity?',
      answer: 'Inductance causes reflections and ringing on fast edges, corrupting eye diagrams. Memory controllers use pre-emphasis/equalization and careful impedance matching. Flip-chip and advanced substrates minimize inductance.',
    },
    {
      title: 'Power Amplifiers',
      description: 'RF power amplifiers in cell phones use specialized packaging for thermal management.',
      question: 'Why do PA modules often use copper clips instead of wire bonds?',
      answer: 'Copper clips have lower inductance and better thermal conductivity than bond wires. They can carry higher current for the same cross-section. This improves both efficiency and reliability.',
    },
    {
      title: 'LED Packaging',
      description: 'High-power LEDs must dissipate significant heat through their package.',
      question: 'How does LED packaging differ from IC packaging for thermal reasons?',
      answer: 'LEDs often use flip-chip mounting with the active layer facing down onto a metal-core PCB. This provides direct thermal path from the hottest region to the heat sink, unlike traditional die-up mounting.',
    },
  ];

  const testQuestions = [
    {
      question: 'Wire bond inductance is problematic at high frequencies because:',
      options: [
        { text: 'Inductance decreases with frequency', correct: false },
        { text: 'Inductive reactance (2*pi*f*L) increases with frequency', correct: true },
        { text: 'Wires become more flexible at high frequency', correct: false },
        { text: 'Wire resistance increases with frequency', correct: false },
      ],
      explanation: 'Inductive reactance (X_L = 2*pi*f*L) is directly proportional to frequency. As frequency increases, even small inductances create large impedances that block signal flow and cause voltage drops.',
    },
    {
      question: 'Ground bounce occurs when:',
      options: [
        { text: 'The ground wire is too short', correct: false },
        { text: 'Fast current changes through package inductance cause voltage spikes', correct: true },
        { text: 'The die temperature is too high', correct: false },
        { text: 'The power supply voltage is unstable', correct: false },
      ],
      explanation: 'Ground bounce is caused by V = L * di/dt. When many outputs switch simultaneously, the rapid current change through the package ground inductance creates transient voltage spikes on the ground rail.',
    },
    {
      question: 'Flip-chip packaging reduces electrical parasitics because:',
      options: [
        { text: 'Solder bumps have lower resistance than gold', correct: false },
        { text: 'The connection path is much shorter than wire bond loops', correct: true },
        { text: 'Flip-chip uses more connections', correct: false },
        { text: 'The substrate is made of better material', correct: false },
      ],
      explanation: 'Wire bonds arc up 1-3mm creating long inductive loops, while flip-chip solder bumps are only ~100 micrometers tall. Since inductance scales with conductor length, flip-chip has roughly 30x lower parasitic inductance.',
    },
    {
      question: 'The thermal path in wire-bond packages goes:',
      options: [
        { text: 'Through the bond wires to the leads', correct: false },
        { text: 'Through the die, die attach, and package body', correct: true },
        { text: 'Directly from die to ambient air', correct: false },
        { text: 'Through the substrate only', correct: false },
      ],
      explanation: 'Heat generated in the die travels downward through the die attach adhesive into the package body and then to the PCB or heatsink. Bond wires are too thin to conduct significant heat.',
    },
    {
      question: 'Flip-chip has better thermal performance because:',
      options: [
        { text: 'The solder bumps conduct more heat', correct: false },
        { text: 'The die is face-down, close to the heat spreader/lid', correct: true },
        { text: 'The package is smaller', correct: false },
        { text: 'There are no bond wires blocking airflow', correct: false },
      ],
      explanation: 'In flip-chip, the die backside faces upward directly against the package lid and heat spreader, providing a short and efficient thermal path from the heat source to the cooling solution.',
    },
    {
      question: 'Decoupling capacitors in packages are placed close to the die to:',
      options: [
        { text: 'Filter high-frequency noise', correct: false },
        { text: 'Provide local charge during fast current transients', correct: true },
        { text: 'Reduce thermal resistance', correct: false },
        { text: 'Increase signal speed', correct: false },
      ],
      explanation: 'Decoupling capacitors store charge locally to supply current during fast transients, preventing voltage droops. Placing them close to the die minimizes the inductance in the supply path, enabling faster charge delivery.',
    },
    {
      question: 'The formula for voltage droop due to inductance is:',
      options: [
        { text: 'V = IR (Ohm\'s law)', correct: false },
        { text: 'V = L * di/dt (Faraday\'s law)', correct: true },
        { text: 'V = CV (capacitor equation)', correct: false },
        { text: 'V = P/I (power equation)', correct: false },
      ],
      explanation: 'Faraday\'s law of electromagnetic induction states that voltage across an inductor equals L * di/dt. Faster current changes and larger inductances create proportionally larger voltage disturbances.',
    },
    {
      question: 'Multiple parallel bond wires or bumps are used to:',
      options: [
        { text: 'Make the package look more impressive', correct: false },
        { text: 'Reduce total inductance and resistance', correct: true },
        { text: 'Increase thermal resistance', correct: false },
        { text: 'Simplify manufacturing', correct: false },
      ],
      explanation: 'Parallel conductors share current, reducing both total resistance (R/n) and total inductance (approximately L/n for well-separated wires). This is why power and ground use multiple parallel connections.',
    },
    {
      question: 'Thermal interface material (TIM) between die and heatsink:',
      options: [
        { text: 'Is electrically conductive', correct: false },
        { text: 'Fills microscopic gaps to improve thermal contact', correct: true },
        { text: 'Is only needed for wire-bond packages', correct: false },
        { text: 'Increases thermal resistance intentionally', correct: false },
      ],
      explanation: 'Even apparently flat surfaces have microscopic roughness creating air gaps. Air is a poor thermal conductor, so TIM fills these gaps with a material that has much higher thermal conductivity than air.',
    },
    {
      question: 'The trend toward flip-chip is driven by:',
      options: [
        { text: 'Lower manufacturing cost', correct: false },
        { text: 'Need for lower inductance, better thermals, and higher I/O density', correct: true },
        { text: 'Wire bond wire shortage', correct: false },
        { text: 'Customer preference for inverted dies', correct: false },
      ],
      explanation: 'As chip speeds and power densities increase, the electrical and thermal limitations of wire bonding become unacceptable. Flip-chip provides area-array I/O, lower parasitics, and better heat dissipation.',
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
  };

  const renderProgressBar = () => (
    <nav
      aria-label="Game progress"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        padding: '16px',
        background: colors.bgDark,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        zIndex: 1001,
      }}
    >
      {phaseOrder.map((p, index) => {
        const isActive = p === phase;
        const isPast = phaseOrder.indexOf(p) < phaseOrder.indexOf(phase);
        return (
          <button
            key={p}
            onClick={() => goToPhase(p)}
            aria-label={`${phaseLabels[p]} phase${isActive ? ' (current)' : ''}`}
            aria-current={isActive ? 'step' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              opacity: isActive ? 1 : isPast ? 0.7 : 0.4,
              background: 'transparent',
              border: 'none',
              padding: '4px',
              minHeight: '44px',
              minWidth: '44px',
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
            <span style={{
              fontSize: '10px',
              color: isActive ? colors.accent : colors.textSecondary,
              marginTop: '4px',
              maxWidth: isMobile ? '0px' : 'none',
              overflow: 'hidden',
            }} aria-hidden="true">
              {phaseLabels[p].substring(0, 2)}
            </span>
          </button>
        );
      })}
    </nav>
  );

  const renderVisualization = (interactive: boolean, showThermalMode: boolean = false) => {
    const width = 500;
    const height = 420;
    const electrical = calculateElectrical();
    const thermal = calculateThermal();

    const dieWidth = 100;
    const dieHeight = 20;
    const substrateWidth = 160;
    const substrateHeight = 30;
    const heatsinkWidth = 180;
    const heatsinkHeight = 40;

    const signalPhase = animationTime;
    const ringing = packageType === 'wirebond' ? Math.sin(signalPhase * 5) * 0.3 : Math.sin(signalPhase * 5) * 0.05;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        {/* Title outside SVG using typo system */}
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <div style={{
            color: colors.textPrimary,
            fontSize: typo.heading,
            fontWeight: 'bold',
            marginBottom: '4px'
          }}>
            {packageType === 'wirebond' ? 'Wire Bond Package' : 'Flip-Chip Package'}
          </div>
          <div style={{
            color: colors.textSecondary,
            fontSize: typo.small
          }}>
            Cross-Section View | {showThermalMode && showThermal ? 'Thermal Mode' : 'Electrical Mode'}
          </div>
        </div>

        <svg
          width="100%"
          height={height - 50}
          viewBox={`0 0 ${width} ${height - 50}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '550px' }}
         role="img" aria-label="Flip Chip Wirebond visualization">
          <defs>
            {/* Premium silicon die gradient with depth */}
            <linearGradient id="fcwbDieGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="20%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#4f46e5" />
              <stop offset="80%" stopColor="#4338ca" />
              <stop offset="100%" stopColor="#3730a3" />
            </linearGradient>

            {/* Premium heatsink aluminum gradient */}
            <linearGradient id="fcwbHeatsinkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#9ca3af" />
              <stop offset="15%" stopColor="#6b7280" />
              <stop offset="40%" stopColor="#4b5563" />
              <stop offset="60%" stopColor="#6b7280" />
              <stop offset="85%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* PCB substrate with FR4 texture */}
            <linearGradient id="fcwbSubstrateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#065f46" />
              <stop offset="25%" stopColor="#047857" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="75%" stopColor="#047857" />
              <stop offset="100%" stopColor="#065f46" />
            </linearGradient>

            {/* Copper traces pattern for substrate */}
            <linearGradient id="fcwbCopperGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="30%" stopColor="#d97706" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            {/* Metallic gold wire bond gradient */}
            <linearGradient id="fcwbGoldWireGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="25%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            {/* Die attach epoxy gradient */}
            <linearGradient id="fcwbDieAttachGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#78716c" />
              <stop offset="30%" stopColor="#57534e" />
              <stop offset="70%" stopColor="#44403c" />
              <stop offset="100%" stopColor="#292524" />
            </linearGradient>

            {/* TIM (Thermal Interface Material) gradient */}
            <linearGradient id="fcwbTIMGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="20%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="80%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Solder bump 3D radial gradient */}
            <radialGradient id="fcwbSolderBumpGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="30%" stopColor="#60a5fa" />
              <stop offset="60%" stopColor="#3b82f6" />
              <stop offset="85%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </radialGradient>

            {/* BGA ball 3D radial gradient */}
            <radialGradient id="fcwbBGAGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#e5e7eb" />
              <stop offset="25%" stopColor="#d1d5db" />
              <stop offset="50%" stopColor="#9ca3af" />
              <stop offset="75%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#4b5563" />
            </radialGradient>

            {/* Signal glow gradient */}
            <radialGradient id="fcwbSignalGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="1" />
              <stop offset="40%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#059669" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0" />
            </radialGradient>

            {/* Thermal path gradient */}
            <linearGradient id="fcwbThermalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#f97316" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#eab308" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.3" />
            </linearGradient>

            {/* Panel background gradient */}
            <linearGradient id="fcwbPanelBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.98" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="fcwbWireGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="fcwbSignalGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="fcwbThermalGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="fcwbBumpGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="fcwbPanelShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feOffset dx="2" dy="2" result="offsetBlur" />
              <feMerge>
                <feMergeNode in="offsetBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Package cross-section */}
          {packageType === 'wirebond' ? (
            <g id="wirebond-package-group">
              {/* Heatsink at bottom with premium gradient */}
              <g id="heatsink-layer">
              <rect x={250 - heatsinkWidth/2} y={230} width={heatsinkWidth} height={heatsinkHeight} fill="url(#fcwbHeatsinkGrad)" rx={4} stroke="#9ca3af" strokeWidth={0.5} />
              {/* Heatsink label */}
              <text x={250} y={255} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">Heatsink</text>
              {/* Heatsink fins detail */}
              {[-70, -35, 0, 35, 70].map((offset, i) => (
                <line key={`fin${i}`} x1={250 + offset} y1={232} x2={250 + offset} y2={268} stroke="#374151" strokeWidth={1} strokeOpacity={0.5} />
              ))}
              </g>

              {/* Substrate with PCB texture */}
              <g id="substrate-layer">
              <rect x={250 - substrateWidth/2} y={190} width={substrateWidth} height={substrateHeight} fill="url(#fcwbSubstrateGrad)" rx={2} stroke="#10b981" strokeWidth={0.5} />
              {/* Substrate label */}
              <text x={250} y={208} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">Substrate</text>
              {/* Copper traces on substrate */}
              {[-60, -30, 0, 30, 60].map((offset, i) => (
                <rect key={`trace${i}`} x={250 + offset - 8} y={192} width={16} height={2} fill="url(#fcwbCopperGrad)" rx={1} />
              ))}
              </g>

              {/* Die attach with epoxy gradient */}
              <g id="die-layer">
              <rect x={250 - dieWidth/2 - 5} y={165} width={dieWidth + 10} height={25} fill="url(#fcwbDieAttachGrad)" rx={2} />

              {/* Die (face up) with silicon gradient */}
              <rect x={250 - dieWidth/2} y={130} width={dieWidth} height={dieHeight} fill="url(#fcwbDieGrad)" rx={2} stroke="#818cf8" strokeWidth={0.5} />
              {/* Die label */}
              <text x={250} y={144} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">Die</text>
              {/* Die circuit pattern detail */}
              <rect x={250 - dieWidth/2 + 5} y={133} width={dieWidth - 10} height={3} fill="#a5b4fc" opacity={0.3} rx={1} />
              <rect x={250 - dieWidth/2 + 5} y={140} width={dieWidth - 10} height={2} fill="#a5b4fc" opacity={0.2} rx={1} />
              </g>

              {/* Wire bonds with metallic gold and glow */}
              <g id="wirebond-connection-layer">
              {[-40, -25, 25, 40].map((offset, i) => (
                <path
                  key={`wire${i}`}
                  d={`M ${250 + offset * 0.6} 130 Q ${250 + offset * 0.8} ${90 - wireLength * 10} ${250 + offset * 1.3} 190`}
                  fill="none"
                  stroke="url(#fcwbGoldWireGrad)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  filter="url(#fcwbWireGlow)"
                />
              ))}
              {/* Wire bond label */}
              <text x={350} y={100} textAnchor="start" fill="#fcd34d" fontSize="11" fontWeight="bold">Wire Bonds</text>
              <line x1={340} y1={100} x2={300} y2={100} stroke="#fcd34d" strokeWidth={1} strokeDasharray="2,2" />

              {/* Bond pads on die */}
              {[-40, -25, 25, 40].map((offset, i) => (
                <rect key={`pad${i}`} x={250 + offset * 0.6 - 4} y={128} width={8} height={4} fill="#fcd34d" rx={1} />
              ))}
              </g>

              {/* Signal ringing animation with glow */}
              {isAnimating && (
                <g filter="url(#fcwbSignalGlowFilter)">
                  {[-40, 40].map((offset, i) => (
                    <circle
                      key={`sig${i}`}
                      cx={250 + offset * 0.8}
                      cy={110 - wireLength * 5 + ringing * 10}
                      r={4}
                      fill="url(#fcwbSignalGlow)"
                    >
                      <animate attributeName="opacity" values="1;0.3;1" dur="0.3s" repeatCount="indefinite" />
                      <animate attributeName="r" values="4;6;4" dur="0.3s" repeatCount="indefinite" />
                    </circle>
                  ))}
                </g>
              )}

              {/* Wire length indicator */}
              <line x1={380} y1={130} x2={380} y2={190} stroke={colors.textMuted} strokeDasharray="3,3" />
              <text x={385} y={160} fill="#e2e8f0" fontSize="11">{wireLength}mm</text>

              {/* Thermal path with gradient */}
              {showThermalMode && showThermal && (
                <g filter="url(#fcwbThermalGlowFilter)">
                  <rect x={245} y={150} width={10} height={120} fill="url(#fcwbThermalGrad)" rx={2} opacity={0.7} />
                </g>
              )}
            </g>
          ) : (
            <>
              {/* Heatsink on top of die (heat spreader/lid) */}
              <rect x={250 - heatsinkWidth/2} y={50} width={heatsinkWidth} height={heatsinkHeight} fill="url(#fcwbHeatsinkGrad)" rx={4} stroke="#9ca3af" strokeWidth={0.5} />
              {/* Heatsink label */}
              <text x={250} y={75} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">Heat Spreader</text>
              {/* Heatsink fins detail */}
              {[-70, -35, 0, 35, 70].map((offset, i) => (
                <line key={`fin${i}`} x1={250 + offset} y1={52} x2={250 + offset} y2={88} stroke="#374151" strokeWidth={1} strokeOpacity={0.5} />
              ))}

              {/* TIM layer with metallic gradient */}
              <rect x={250 - dieWidth/2 - 5} y={90} width={dieWidth + 10} height={8} fill="url(#fcwbTIMGrad)" rx={1} />

              {/* Die (face down) with silicon gradient */}
              <rect x={250 - dieWidth/2} y={98} width={dieWidth} height={dieHeight} fill="url(#fcwbDieGrad)" rx={2} stroke="#818cf8" strokeWidth={0.5} />
              {/* Die label */}
              <text x={250} y={112} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">Die</text>
              {/* Die circuit pattern detail (inverted) */}
              <rect x={250 - dieWidth/2 + 5} y={112} width={dieWidth - 10} height={3} fill="#a5b4fc" opacity={0.3} rx={1} />

              {/* Solder bumps with 3D effect */}
              {[-35, -20, -5, 5, 20, 35].map((offset, i) => (
                <g key={`bump${i}`}>
                  <ellipse cx={250 + offset} cy={125} rx={6} ry={4} fill="url(#fcwbSolderBumpGrad)" filter="url(#fcwbBumpGlow)" />
                  {/* Highlight on bump */}
                  <ellipse cx={250 + offset - 1.5} cy={123} rx={2} ry={1} fill="#bfdbfe" opacity={0.6} />
                </g>
              ))}
              {/* Solder bumps label */}
              <text x={350} y={127} textAnchor="start" fill="#60a5fa" fontSize="11" fontWeight="bold">Solder Bumps</text>
              <line x1={340} y1={125} x2={300} y2={125} stroke="#60a5fa" strokeWidth={1} strokeDasharray="2,2" />

              {/* Substrate with PCB texture */}
              <rect x={250 - substrateWidth/2} y={130} width={substrateWidth} height={substrateHeight} fill="url(#fcwbSubstrateGrad)" rx={2} stroke="#10b981" strokeWidth={0.5} />
              {/* Substrate label */}
              <text x={250} y={148} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="bold">Substrate</text>
              {/* Copper traces on substrate */}
              {[-60, -30, 0, 30, 60].map((offset, i) => (
                <rect key={`trace${i}`} x={250 + offset - 8} y={132} width={16} height={2} fill="url(#fcwbCopperGrad)" rx={1} />
              ))}
              {/* Via holes in substrate */}
              {[-35, -20, -5, 5, 20, 35].map((offset, i) => (
                <circle key={`via${i}`} cx={250 + offset} cy={145} r={2} fill="#fcd34d" opacity={0.7} />
              ))}

              {/* BGA balls with 3D effect */}
              {[-60, -40, -20, 0, 20, 40, 60].map((offset, i) => (
                <g key={`bga${i}`}>
                  <circle cx={250 + offset} cy={170} r={7} fill="url(#fcwbBGAGrad)" />
                  {/* Highlight on ball */}
                  <circle cx={250 + offset - 2} cy={167} r={2} fill="#f3f4f6" opacity={0.5} />
                </g>
              ))}
              {/* BGA label */}
              <text x={350} y={172} textAnchor="start" fill="#e2e8f0" fontSize="11" fontWeight="bold">BGA Balls</text>
              <line x1={340} y1={170} x2={300} y2={170} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="2,2" />

              {/* Signal with minimal ringing and glow */}
              {isAnimating && (
                <g filter="url(#fcwbSignalGlowFilter)">
                  {[-35, 35].map((offset, i) => (
                    <circle
                      key={`sig${i}`}
                      cx={250 + offset}
                      cy={125}
                      r={4}
                      fill="url(#fcwbSignalGlow)"
                    >
                      <animate attributeName="opacity" values="1;0.7;1" dur="0.5s" repeatCount="indefinite" />
                    </circle>
                  ))}
                </g>
              )}

              {/* Thermal path with gradient */}
              {showThermalMode && showThermal && (
                <g filter="url(#fcwbThermalGlowFilter)">
                  <rect x={245} y={50} width={10} height={48} fill="url(#fcwbThermalGrad)" rx={2} opacity={0.8} />
                </g>
              )}
            </>
          )}

          {/* Electrical metrics panel with premium styling */}
          <rect x={10} y={280} width={230} height={80} fill="url(#fcwbPanelBg)" rx={8} stroke={colors.accent} strokeWidth={1} filter="url(#fcwbPanelShadow)" />
          <text x={20} y={300} fill={colors.textSecondary} fontSize="11" fontWeight="bold">Electrical</text>
          <text x={20} y={316} fill={colors.textSecondary} fontSize="11">L={electrical.inductance.toFixed(1)}nH</text>
          <text x={20} y={330} fill={colors.textSecondary} fontSize="11">Vb={electrical.groundBounce.toFixed(0)}mV</text>
          <text x={20} y={344} fill={colors.textSecondary} fontSize="11">IR={electrical.irDrop.toFixed(0)}mV</text>
          <text x={120} y={300} fill={colors.textSecondary} fontSize="11" fontWeight="bold">Parameters</text>
          <text x={120} y={316} fill={colors.textSecondary} fontSize="11">Z={electrical.impedance.toFixed(0)}mΩ</text>
          <text x={120} y={330} fill={colors.textSecondary} fontSize="11">f={signalFrequency}GHz</text>
          <text x={120} y={344} fill={colors.textSecondary} fontSize="11">I={powerCurrent}A</text>

          {/* Thermal metrics panel */}
          {showThermalMode && showThermal && (
            <>
              <rect x={260} y={280} width={230} height={80} fill="url(#fcwbPanelBg)" rx={8} stroke={colors.thermal} strokeWidth={1} filter="url(#fcwbPanelShadow)" />
              <text x={270} y={300} fill={colors.textSecondary} fontSize="11" fontWeight="bold">Thermal Performance</text>
              <text x={270} y={316} fill={colors.textSecondary} fontSize="11">Rth = {thermal.rthJunction.toFixed(1)} K/W</text>
              <text x={270} y={330} fill={colors.textSecondary} fontSize="11">Tj = {thermal.junctionTemp.toFixed(0)}°C at {diePower}W</text>
              <text x={270} y={344} fill={colors.textSecondary} fontSize="11">Max = {thermal.maxPower.toFixed(0)} W</text>
            </>
          )}
        </svg>

        {/* Labels outside SVG using typo system */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '550px',
          padding: '0 12px',
          gap: '16px'
        }}>
          {/* Electrical metrics */}
          <div style={{
            flex: 1,
            background: 'rgba(30, 41, 59, 0.95)',
            borderRadius: '8px',
            padding: typo.cardPadding,
            border: `1px solid ${colors.accent}`
          }}>
            <div style={{ color: colors.textSecondary, fontSize: typo.body, fontWeight: 'bold', marginBottom: '8px' }}>
              Electrical Parasitics
            </div>
            <div style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '4px' }}>
              Inductance: <span style={{ color: electrical.inductance < 1 ? colors.success : colors.warning }}>{electrical.inductance.toFixed(2)} nH</span>
            </div>
            <div style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '4px' }}>
              Ground Bounce: <span style={{ color: electrical.groundBounce < 50 ? colors.success : colors.error }}>{electrical.groundBounce.toFixed(0)} mV</span>
            </div>
            <div style={{ color: colors.textSecondary, fontSize: typo.small }}>
              IR Drop: <span style={{ color: electrical.irDrop < 10 ? colors.success : colors.warning }}>{electrical.irDrop.toFixed(1)} mV</span>
            </div>
          </div>

          {/* Thermal metrics */}
          {showThermalMode && showThermal && (
            <div style={{
              flex: 1,
              background: 'rgba(30, 41, 59, 0.95)',
              borderRadius: '8px',
              padding: typo.cardPadding,
              border: `1px solid ${colors.thermal}`
            }}>
              <div style={{ color: colors.textSecondary, fontSize: typo.body, fontWeight: 'bold', marginBottom: '8px' }}>
                Thermal Performance
              </div>
              <div style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '4px' }}>
                Rth Junction: <span style={{ color: thermal.rthJunction < 1 ? colors.success : colors.warning }}>{thermal.rthJunction.toFixed(1)} K/W</span>
              </div>
              <div style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '4px' }}>
                Tj at {diePower}W: <span style={{ color: thermal.junctionTemp < 85 ? colors.success : colors.error }}>{thermal.junctionTemp.toFixed(0)}C</span>
              </div>
              <div style={{ color: colors.textSecondary, fontSize: typo.small }}>
                Max Power: <span style={{ color: colors.accent }}>{thermal.maxPower.toFixed(0)} W</span>
              </div>
            </div>
          )}
        </div>

        {/* Component labels using typo system */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '12px',
          marginTop: '8px',
          fontSize: typo.label,
          color: colors.textMuted
        }}>
          {packageType === 'wirebond' ? (
            <>
              <span>Wire Length: {wireLength}mm</span>
              <span>|</span>
              <span>Rth: {thermal.rthJunction.toFixed(1)} K/W</span>
            </>
          ) : (
            <>
              <span>Bump Height: ~0.1mm</span>
              <span>|</span>
              <span>Rth: {thermal.rthJunction.toFixed(1)} K/W</span>
            </>
          )}
        </div>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setPackageType(packageType === 'wirebond' ? 'flipchip' : 'wirebond')}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: packageType === 'wirebond' ? `linear-gradient(135deg, ${colors.wirebond} 0%, #d97706 100%)` : `linear-gradient(135deg, ${colors.flipchip} 0%, #1d4ed8 100%)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
                boxShadow: `0 4px 12px ${packageType === 'wirebond' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Switch to {packageType === 'wirebond' ? 'Flip-Chip' : 'Wire Bond'}
            </button>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? `linear-gradient(135deg, ${colors.error} 0%, #dc2626 100%)` : `linear-gradient(135deg, ${colors.signal} 0%, #059669 100%)`,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
                boxShadow: `0 4px 12px ${isAnimating ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnimating ? 'Stop Signal' : 'Animate Signal'}
            </button>
            <button
              onClick={() => { setWireLength(3); setSignalFrequency(1); setPowerCurrent(10); setDiePower(50); }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
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

  const renderControls = (showThermalControls: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {packageType === 'wirebond' && (
        <div>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
            Wire Bond Length: {wireLength} mm
          </label>
          <input
            type="range"
            min="1"
            max="5"
            step="0.5"
            value={wireLength}
            onChange={(e) => setWireLength(parseFloat(e.target.value))}
            style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent, WebkitAppearance: 'none' as const }}
          />
        </div>
      )}

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Signal Frequency: {signalFrequency} GHz
        </label>
        <input
          type="range"
          min="0.5"
          max="5"
          step="0.5"
          value={signalFrequency}
          onChange={(e) => setSignalFrequency(parseFloat(e.target.value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent, WebkitAppearance: 'none' as const }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Power Current: {powerCurrent} A
        </label>
        <input
          type="range"
          min="1"
          max="50"
          step="1"
          value={powerCurrent}
          onChange={(e) => setPowerCurrent(parseInt(e.target.value))}
          style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent, WebkitAppearance: 'none' as const }}
        />
      </div>

      {showThermalControls && (
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
                checked={showThermal}
                onChange={(e) => setShowThermal(e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              Show Thermal Analysis
            </label>
          </div>

          {showThermal && (
            <div>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Die Power: {diePower} W
              </label>
              <input
                type="range"
                min="10"
                max="200"
                step="10"
                value={diePower}
                onChange={(e) => setDiePower(parseInt(e.target.value))}
                style={{ height: '20px', touchAction: 'pan-y', width: '100%', accentColor: colors.accent, WebkitAppearance: 'none' as const }}
              />
            </div>
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
          V_bounce = L * di/dt = {calculateElectrical().inductance.toFixed(2)} nH * {powerCurrent} A * {signalFrequency} GHz
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          Impedance at {signalFrequency} GHz: {calculateElectrical().impedance.toFixed(1)} mOhm
        </div>
      </div>
    </div>
  );

  const renderBottomBar = (canGoBack: boolean, canProceed: boolean, nextLabel: string) => (
    <div style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: `1px solid rgba(255,255,255,0.1)`,
      display: 'flex',
      justifyContent: 'space-between',
      zIndex: 1001,
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
          minHeight: '44px',
          transition: 'all 0.2s ease',
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
          minHeight: '44px',
        }}
      >
        {nextLabel}
      </button>
    </div>
  );

  // ============================================================================
  // REAL WORLD APPLICATIONS - How flip-chip and wire bond packaging impacts industry
  // ============================================================================
  const realWorldApps = [
    {
      icon: "🖥️",
      title: "High-Performance CPUs",
      short: "Microprocessors",
      tagline: "Powering billions of calculations per second",
      description: "Modern desktop and server CPUs from Intel and AMD use flip-chip packaging exclusively. With transistor counts exceeding 100 billion and clock speeds pushing 5+ GHz, the electrical and thermal demands far exceed what wire bonding can provide. Every nanosecond of signal delay and every millivolt of voltage droop directly impacts computational throughput.",
      connection: "Just like our simulation showed, flip-chip's dramatically lower inductance (0.1 nH vs 3+ nH for wire bonds) is essential when switching currents change by 100+ amps in nanoseconds. The V = L * di/dt voltage droop would corrupt data if wire bonds were used. The direct thermal path from die to integrated heat spreader allows these chips to dissipate 200+ watts while staying within operating temperature.",
      howItWorks: "The CPU die is manufactured with an array of thousands of copper pillars on its active surface. These are flip-chip bonded to a high-density organic substrate using controlled-collapse chip connection (C4) or micro-bump technology. An integrated heat spreader (IHS) is attached to the die back using thermal interface material, creating a sandwich structure that optimizes both electrical and thermal performance. Power delivery networks use hundreds of parallel connections to minimize total inductance.",
      stats: [
        { val: "200 W", label: "Thermal design power for top CPUs" },
        { val: "5 GHz", label: "Peak signal frequency in modern CPUs" },
        { val: "10000 A", label: "Total switching current capacity" }
      ],
      examples: [
        "Intel Core i9 and Xeon server processors",
        "AMD Ryzen and EPYC data center chips",
        "Apple M-series processors for Mac",
        "NVIDIA data center GPUs for AI training"
      ],
      companies: ["Intel", "AMD", "Apple", "NVIDIA", "Qualcomm"],
      futureImpact: "Future CPUs will use advanced 3D stacking with hybrid bonding, placing memory directly on top of processor cores. This will reduce interconnect distances to microns instead of millimeters, enabling even higher bandwidth and lower latency. Backside power delivery networks will further reduce IR drop and enable continued performance scaling.",
      color: "#3b82f6"
    },
    {
      icon: "📱",
      title: "Smartphone Processors",
      short: "Mobile SoCs",
      tagline: "Desktop power in your pocket",
      description: "Modern smartphone system-on-chips (SoCs) integrate CPU, GPU, neural engines, and modems in a single package. These chips must deliver desktop-class performance while running on a battery and dissipating heat without fans. Flip-chip packaging enables this impossible-seeming combination by minimizing both electrical parasitics and thermal resistance in an ultra-compact form factor.",
      connection: "Our experiments demonstrated that inductance causes ground bounce proportional to L * di/dt. In a smartphone SoC switching at 3+ GHz with aggressive power management that ramps current in nanoseconds, even 1 nH of extra inductance would cause unacceptable voltage noise. The tight thermal path of flip-chip also allows these 5-watt chips to run at peak performance without thermal throttling.",
      howItWorks: "Mobile SoCs use fan-out wafer-level packaging (FOWLP) or flip-chip on laminate substrate. The die's active surface connects through micro-bumps to redistribution layers that fan out I/O to the package balls. Advanced thermal solutions include graphite heat spreaders and vapor chambers that conduct heat laterally to the phone's metal frame. Package-on-package (PoP) stacking places DRAM directly above the processor, minimizing memory latency.",
      stats: [
        { val: "15 billion", label: "Transistors in flagship mobile SoCs" },
        { val: "5W", label: "Typical sustained power budget" },
        { val: "3+ GHz", label: "Peak CPU clock frequency" }
      ],
      examples: [
        "Apple A-series and M-series chips for iPhone/iPad",
        "Qualcomm Snapdragon flagship processors",
        "Samsung Exynos mobile processors",
        "MediaTek Dimensity 5G chips"
      ],
      companies: ["Apple", "Qualcomm", "Samsung", "MediaTek", "TSMC"],
      futureImpact: "Next-generation mobile chips will integrate even more functionality including advanced AI accelerators and satellite communication modems. Chiplet architectures will allow mixing different process nodes in a single package, optimizing each function for its specific requirements. 3D integration will stack sensors, memory, and processors for unprecedented capability in ever-thinner devices.",
      color: "#10b981"
    },
    {
      icon: "🚗",
      title: "Automotive Chips",
      short: "Vehicle Electronics",
      tagline: "Reliability where failure is not an option",
      description: "Modern vehicles contain hundreds of semiconductor chips controlling everything from engine management to advanced driver assistance systems (ADAS). Automotive chips must operate reliably across extreme temperatures (-40C to 150C), survive vibration and shock, and function flawlessly for 15+ years. The packaging choice directly impacts both performance and the safety-critical reliability requirements.",
      connection: "Our thermal simulation showed how junction temperature depends on thermal resistance and power dissipation. In an engine compartment reaching 125C ambient, wire bond's higher thermal resistance would push junction temperatures beyond safe limits. Flip-chip's superior thermal path allows automotive chips to maintain safe temperatures even in harsh conditions. The lower inductance also improves electromagnetic compatibility in the electrically noisy vehicle environment.",
      howItWorks: "Automotive-grade flip-chip packages use enhanced underfill materials that withstand thermal cycling without cracking. High-reliability solder alloys maintain mechanical integrity across temperature extremes. Embedded die packaging places the silicon within the substrate for additional protection. Power devices use copper clip bonding—a hybrid approach combining wire bond simplicity with lower inductance and better thermal performance than traditional gold wires.",
      stats: [
        { val: "-40 to 150C", label: "Operating temperature range" },
        { val: "15+ years", label: "Required operational lifetime" },
        { val: "1 ppm", label: "Target defect rate (parts per million)" }
      ],
      examples: [
        "ADAS processors for autonomous driving",
        "Electric vehicle battery management systems",
        "Engine control units (ECUs)",
        "Radar and LiDAR sensor processors"
      ],
      companies: ["NXP", "Infineon", "Texas Instruments", "STMicroelectronics", "Renesas"],
      futureImpact: "The transition to electric and autonomous vehicles is dramatically increasing semiconductor content per car from hundreds to thousands of dollars. Centralized compute architectures will replace distributed ECUs, requiring even more powerful and reliable processors. Wide-bandgap semiconductors (SiC, GaN) in flip-chip packages will enable more efficient power conversion and faster charging.",
      color: "#f59e0b"
    },
    {
      icon: "💡",
      title: "LED Array Packaging",
      short: "Solid-State Lighting",
      tagline: "Efficient illumination through thermal engineering",
      description: "High-power LEDs convert electricity to light, but only 30-50% of input power becomes light—the rest becomes heat concentrated in a tiny chip area. LED packaging is fundamentally a thermal management challenge: extract heat efficiently or watch efficiency plummet and lifetime collapse. Flip-chip LED architecture revolutionized the industry by creating a direct thermal path from the light-generating junction to the heat sink.",
      connection: "Our thermal analysis showed that flip-chip reduces junction-to-heatsink thermal resistance by 6x compared to wire bond. For LEDs this is even more dramatic—traditional wire bond LEDs have the active layer on TOP, forcing heat through the entire chip thickness and a die attach layer. Flip-chip LEDs mount the active layer directly against a thermally conductive substrate, slashing thermal resistance and enabling much higher drive currents.",
      howItWorks: "Flip-chip LEDs are grown on transparent substrates, then mounted junction-side-down onto metal-core PCBs or ceramic substrates using gold or silver-tin solder bumps. Light extracts through the transparent top surface while heat flows directly from the junction through the bumps to the heat sink. No wire bonds obstruct the light-emitting surface, improving optical efficiency. Advanced designs use chip-scale packaging where the LED die IS the package, minimizing size and thermal resistance.",
      stats: [
        { val: "200+ lm/W", label: "Efficacy of best LED packages" },
        { val: "50,000+ hrs", label: "Lifetime at proper thermal management" },
        { val: "6x", label: "Thermal resistance reduction vs wire bond" }
      ],
      examples: [
        "Automotive headlights and taillights",
        "Stadium and arena lighting systems",
        "Smartphone camera flash modules",
        "UV-C disinfection systems"
      ],
      companies: ["Lumileds", "Cree", "OSRAM", "Samsung LED", "Nichia"],
      futureImpact: "MicroLED displays will use millions of flip-chip mounted microscale LEDs to create self-emissive screens with perfect blacks and extreme brightness. Smart lighting systems will integrate sensors and wireless connectivity directly into the LED package. Horticultural lighting will use precisely tuned LED spectra to optimize plant growth in vertical farms, enabled by the thermal headroom that flip-chip packaging provides.",
      color: "#8b5cf6"
    }
  ];

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '70px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Flip-Chip vs Wire Bond
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Why did the industry move away from long bond wires?
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
                For decades, gold wire bonds connected chips to packages. But as frequencies increased
                and power demands grew, the humble wire bond became a bottleneck. Why? The answer is
                physics: inductance and thermal resistance are both geometry-dependent.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400, lineHeight: 1.6 }}>
                This is important for modern chip design and engineering applications used in industry today.
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Switch between package types and observe the signal behavior!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Start Discovery')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '70px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <p style={{ color: colors.textSecondary, fontSize: typo.body }}>
              Step 1 of 3: Observe the diagram carefully before making your prediction
            </p>
          </div>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Observe the key differences:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Cross-sections of two packaging styles. Wire bond has the die face-up with
              arcing gold wires. Flip-chip has the die face-down with tiny solder bumps.
              Both connect the chip to the substrate, but the path lengths differ dramatically.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How do these packaging styles compare electrically?
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
        {renderBottomBar(true, true, 'Continue to Experiment')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '70px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Packaging Physics</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare wire bond vs flip-chip electrical performance
            </p>
            <p style={{ color: colors.textSecondary, fontSize: typo.small, marginTop: '8px' }}>
              Observe how changing each parameter affects the electrical metrics
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
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Increase frequency to 5 GHz - watch ground bounce explode for wire bond</li>
              <li>Increase wire length - see inductance grow linearly</li>
              <li>Switch to flip-chip - notice the dramatic improvement</li>
              <li>Try 50A current - compare IR drop between packages</li>
            </ul>
            <p style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400, marginTop: '12px', lineHeight: 1.5 }}>
              This is important because package inductance directly impacts signal integrity in modern technology.
              Every high-speed chip design in the industry must account for these parasitics.
              Understanding V = L × di/dt helps engineers design reliable power delivery networks used in real-world applications.
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'Continue to Understanding')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'flipchip_better';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '70px' }}>
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
              {wasCorrect ? 'Your prediction was correct!' : 'As you observed in the experiment,'} Flip-chip wins electrically because shorter paths mean lower inductance.
              A 3mm bond wire has ~3nH of inductance; a flip-chip bump has ~0.1nH.
              At GHz frequencies, this 30x difference is crucial.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Package Parasitics</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Inductance (L):</strong> Proportional to loop area
                and conductor length. Wire bonds form large loops; bumps are nearly flat.
                L ~ 1 nH/mm for bond wires.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Inductive Reactance:</strong> X_L = 2*pi*f*L increases
                with frequency. At 5 GHz, 3nH creates 94 Ohm of reactance - enormous for power delivery!
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Ground Bounce:</strong> V = L * di/dt. Fast current
                transients through package inductance cause voltage spikes that corrupt signals.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Resistance:</strong> Also matters for power delivery.
                Multiple parallel bonds/bumps reduce total resistance and inductance.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'Next: Explore the Twist')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '70px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What about thermal performance - getting heat out of the chip?
            </p>
            <p style={{ color: colors.textSecondary, fontSize: typo.small, marginTop: '8px' }}>
              Step 1 of 3: Observe the thermal path in each package type
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
              In wire bond packages, the die is face-up with the active side away from the heat sink.
              In flip-chip, the die is face-down with the active layer close to the substrate.
              But flip-chip also allows a lid/heat spreader directly on the die back.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Which package style has better thermal performance?
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
        {renderBottomBar(true, true, 'Continue to Explore')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '70px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Explore Thermal Performance</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Enable thermal mode and compare die temperatures
            </p>
            <p style={{ color: colors.textSecondary, fontSize: typo.small, marginTop: '8px' }}>
              Observe how power and package type affect junction temperature
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
              Flip-chip has ~6x lower thermal resistance from die to heat sink. The die back
              connects directly to the lid through TIM (thermal interface material).
              This enables much higher power dissipation before hitting temperature limits.
            </p>
          </div>
        </div>
        {renderBottomBar(true, true, 'Continue to Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'flipchip_thermal';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '70px' }}>
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
              Flip-chip enables much better thermal performance. The thick silicon die back
              conducts heat directly to the lid/heat spreader, bypassing the thin active layer.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Thermal Engineering in Packages</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Thermal Resistance Path:</strong> Heat flows from
                junction to die to TIM to lid to heatsink to ambient. Each interface adds resistance.
                Minimizing path length minimizes Rth.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>TIM Importance:</strong> Thermal Interface Material
                fills microscopic gaps between surfaces. Even "flat" surfaces have ~10um roughness.
                TIM thermal conductivity of 5-10 W/mK bridges these gaps.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Power Density:</strong> Modern CPUs hit 100+ W/cm2
                in hotspots. Without flip-chip and advanced cooling, temperatures would exceed limits.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, true, 'Continue to Applications')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Flip Chip Wirebond"
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
    const rwApp = realWorldApps[currentApp];
    const isCompleted = transferCompleted.has(currentApp);
    const allCompleted = transferCompleted.size >= realWorldApps.length;

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '70px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Application {currentApp + 1} of {realWorldApps.length}: {rwApp.title}
            </p>
            <p style={{ color: colors.textSecondary, fontSize: typo.small, textAlign: 'center', marginBottom: '16px' }}>
              {transferCompleted.size} of {realWorldApps.length} completed
            </p>
          </div>

          <div
            style={{
              background: colors.bgCard,
              margin: '16px',
              padding: '16px',
              borderRadius: '12px',
              border: isCompleted ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{rwApp.icon} {rwApp.title}</h3>
              {isCompleted && <span style={{ color: colors.success }}>✓ Complete</span>}
            </div>
            <p style={{ color: colors.accent, fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>{rwApp.tagline}</p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400, marginBottom: '12px', lineHeight: 1.6 }}>{rwApp.description}</p>
            <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400, marginBottom: '12px', lineHeight: 1.6 }}>{rwApp.connection}</p>

            {/* Stats */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
              {rwApp.stats.map((stat, i) => (
                <div key={i} style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '8px 12px', borderRadius: '8px', flex: '1 1 120px' }}>
                  <div style={{ color: colors.accent, fontSize: '16px', fontWeight: 'bold' }}>{stat.val}</div>
                  <div style={{ color: colors.textMuted, fontSize: '11px', fontWeight: 400 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Companies */}
            <p style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400, marginBottom: '12px' }}>
              <strong>Key Players:</strong> {rwApp.companies.join(', ')}
            </p>

            {/* Examples */}
            <div style={{ marginBottom: '12px' }}>
              <p style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>Examples:</p>
              <ul style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400, lineHeight: 1.6, paddingLeft: '20px', margin: 0 }}>
                {rwApp.examples.map((ex, i) => <li key={i}>{ex}</li>)}
              </ul>
            </div>

            {/* How it works */}
            <p style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400, lineHeight: 1.6, marginBottom: '12px' }}>{rwApp.howItWorks}</p>

            {/* Future impact */}
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}`, marginBottom: '12px' }}>
              <p style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400, lineHeight: 1.5 }}>
                <strong style={{ color: colors.success }}>Future:</strong> {rwApp.futureImpact}
              </p>
            </div>

            <button
              onClick={() => {
                const newCompleted = new Set([...transferCompleted, currentApp]);
                setTransferCompleted(newCompleted);
                if (currentApp < realWorldApps.length - 1) {
                  setCurrentApp(currentApp + 1);
                }
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '6px',
                border: 'none',
                background: isCompleted
                  ? (currentApp < realWorldApps.length - 1 ? colors.accent : colors.success)
                  : `linear-gradient(135deg, ${rwApp.color} 0%, ${colors.accent} 100%)`,
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                WebkitTapHighlightColor: 'transparent',
                minHeight: '44px',
              }}
            >
              {isCompleted
                ? (currentApp < realWorldApps.length - 1 ? 'Got It - Next Application' : 'Got It - All Complete!')
                : 'Got It - Continue'}
            </button>
          </div>

          {/* Application navigation tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px', flexWrap: 'wrap' }}>
            {realWorldApps.map((rw, index) => (
              <button
                key={index}
                onClick={() => setCurrentApp(index)}
                aria-label={`Application ${index + 1}: ${rw.short}${transferCompleted.has(index) ? ' (completed)' : ''}`}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: index === currentApp ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: transferCompleted.has(index) ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  color: index === currentApp ? colors.accent : colors.textSecondary,
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 400,
                }}
              >
                {rw.short}
              </button>
            ))}
          </div>
        </div>
        {allCompleted ? renderBottomBar(true, true, 'Take the Test') : renderBottomBar(true, false, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '70px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 8 ? '🎉 Excellent!' : '📚 Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>You scored {testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px', fontWeight: 400 }}>
                {testScore >= 8 ? 'You\'ve mastered packaging physics! Test complete!' : 'Review the material and try again.'}
              </p>
            </div>
            <div style={{ padding: '0 16px' }}>
              <h3 style={{ color: '#f8fafc', fontSize: '18px', marginBottom: '16px' }}>Answer Key:</h3>
              {testQuestions.map((q, qIndex) => {
                const userAnswer = testAnswers[qIndex];
                const correctOption = q.options.find(o => o.correct);
                const userOption = userAnswer !== null ? q.options[userAnswer] : undefined;
                const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
                return (
                  <div key={qIndex} style={{ background: 'rgba(30, 41, 59, 0.9)', margin: '12px 0', padding: '16px', borderRadius: '10px', borderLeft: `4px solid ${isCorrect ? '#10b981' : '#ef4444'}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ color: isCorrect ? '#10b981' : '#ef4444', fontSize: '18px', flexShrink: 0 }}>{isCorrect ? '\u2713' : '\u2717'}</span>
                      <span style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 600 }}>Q{qIndex + 1}. {q.question}</span>
                    </div>
                    {!isCorrect && (<div style={{ marginLeft: '26px', marginBottom: '6px' }}><span style={{ color: '#ef4444', fontSize: '13px' }}>Your answer: </span><span style={{ color: '#64748b', fontSize: '13px' }}>{userOption?.text}</span></div>)}
                    <div style={{ marginLeft: '26px', marginBottom: '8px' }}><span style={{ color: '#10b981', fontSize: '13px' }}>Correct answer: </span><span style={{ color: '#94a3b8', fontSize: '13px' }}>{correctOption?.text}</span></div>
                    <div style={{ marginLeft: '26px', background: 'rgba(245, 158, 11, 0.1)', padding: '8px 12px', borderRadius: '8px' }}><span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 600 }}>Why? </span><span style={{ color: '#94a3b8', fontSize: '12px', lineHeight: '1.5' }}>{q.explanation}</span></div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button
                onClick={() => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); setCheckedAnswers(new Set()); setCurrentTestQuestion(0); }}
                style={{
                  padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.accent}`,
                  background: 'transparent', color: colors.accent, cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
                }}
              >
                Replay Quiz
              </button>
              <button
                onClick={() => goToPhase('mastery')}
                style={{
                  padding: '12px 24px', borderRadius: '8px', border: 'none',
                  background: testScore >= 8 ? colors.success : colors.accent, color: 'white',
                  cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
                }}
              >
                {testScore >= 8 ? 'Complete Lesson' : 'Continue'}
              </button>
            </div>
          </div>
          {renderBottomBar(true, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '70px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontSize: typo.body, fontWeight: 'bold' }}>
                Question {currentTestQuestion + 1} of {testQuestions.length}
              </span>
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
              <p style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400, lineHeight: 1.5, marginBottom: '12px' }}>
                Consider a high-performance chip design where the package must handle multi-GHz signals and deliver tens of amps to the die while managing thermal dissipation through the package structure. The engineer must choose between wire bond and flip-chip packaging based on the physics of inductance, resistance, and thermal resistance paths.
              </p>
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
                    fontWeight: 400,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {String.fromCharCode(65 + oIndex)}) {opt.text}
                </button>
              ))}
            </div>
          </div>
          {/* Check answer confirmation */}
          {testAnswers[currentTestQuestion] !== null && !checkedAnswers.has(currentTestQuestion) && (
            <div style={{ padding: '0 16px 8px', display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => setCheckedAnswers(new Set([...checkedAnswers, currentTestQuestion]))}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.success,
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                }}
              >
                Check Answer
              </button>
            </div>
          )}
          {/* Answer feedback */}
          {checkedAnswers.has(currentTestQuestion) && testAnswers[currentTestQuestion] !== null && (() => {
            const userAns = testAnswers[currentTestQuestion]!;
            const isRight = currentQ.options[userAns].correct;
            const correctIdx = currentQ.options.findIndex(o => o.correct);
            return (
              <div style={{
                margin: '0 16px 8px',
                padding: '12px',
                borderRadius: '8px',
                background: isRight ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                borderLeft: `3px solid ${isRight ? colors.success : colors.error}`,
              }}>
                <p style={{ color: isRight ? colors.success : colors.error, fontWeight: 'bold', marginBottom: '4px' }}>
                  {isRight ? '✓ Correct!' : '✗ Incorrect'}
                </p>
                {!isRight && (
                  <p style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400 }}>
                    The correct answer is {String.fromCharCode(65 + correctIdx)}) {currentQ.options[correctIdx].text}. Remember that in chip packaging, the key physics relationship is V = L × di/dt.
                  </p>
                )}
              </div>
            );
          })()}
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
                Next Question
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px', paddingTop: '70px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You've mastered flip-chip vs wire bond physics</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Inductance scales with conductor length: L ~ 1 nH/mm for wires</li>
              <li>Ground bounce: V = L * di/dt dominates at high frequencies</li>
              <li>Flip-chip has ~30x lower inductance than wire bond</li>
              <li>Thermal resistance: flip-chip enables direct die-to-lid heat path</li>
              <li>Package selection is a physics trade-off, not just cost</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Advanced packaging continues to evolve: 2.5D interposers, 3D stacking, hybrid bonding,
              and chiplets all push the limits of electrical and thermal performance. The physics
              principles you've learned here apply directly to these cutting-edge technologies.
            </p>
          </div>
          {renderVisualization(true, true)}
        </div>
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9))', borderTop: '1px solid rgba(148, 163, 184, 0.2)', zIndex: 1000 }}>
          <button onClick={() => { onGameEvent?.({ type: 'mastery_achieved', details: { score: testQuestions.filter((q, i) => testAnswers[i] !== null && q.options[testAnswers[i]!]?.correct).length, total: testQuestions.length } }); window.location.href = '/games'; }}
            style={{ width: '100%', minHeight: '52px', padding: '14px 24px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '12px', color: '#f8fafc', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
            Complete Game &rarr;
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default FlipChipWirebondRenderer;
