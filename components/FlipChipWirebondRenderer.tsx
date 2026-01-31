const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {};

import React, { useState, useCallback, useEffect, useRef } from 'react';


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
  const [isMobile, setIsMobile] = useState(false);
  const navigationRef = useRef<boolean>(false);

  // Sync with external gamePhase prop changes
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as FCWBPhase)) {
      setPhase(gamePhase as FCWBPhase);
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
  const goToPhase = useCallback((newPhase: FCWBPhase) => {
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
  const [packageType, setPackageType] = useState<'wirebond' | 'flipchip'>('wirebond');
  const [wireLength, setWireLength] = useState(3); // mm
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
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
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
    },
    {
      question: 'Ground bounce occurs when:',
      options: [
        { text: 'The ground wire is too short', correct: false },
        { text: 'Fast current changes through package inductance cause voltage spikes', correct: true },
        { text: 'The die temperature is too high', correct: false },
        { text: 'The power supply voltage is unstable', correct: false },
      ],
    },
    {
      question: 'Flip-chip packaging reduces electrical parasitics because:',
      options: [
        { text: 'Solder bumps have lower resistance than gold', correct: false },
        { text: 'The connection path is much shorter than wire bond loops', correct: true },
        { text: 'Flip-chip uses more connections', correct: false },
        { text: 'The substrate is made of better material', correct: false },
      ],
    },
    {
      question: 'The thermal path in wire-bond packages goes:',
      options: [
        { text: 'Through the bond wires to the leads', correct: false },
        { text: 'Through the die, die attach, and package body', correct: true },
        { text: 'Directly from die to ambient air', correct: false },
        { text: 'Through the substrate only', correct: false },
      ],
    },
    {
      question: 'Flip-chip has better thermal performance because:',
      options: [
        { text: 'The solder bumps conduct more heat', correct: false },
        { text: 'The die is face-down, close to the heat spreader/lid', correct: true },
        { text: 'The package is smaller', correct: false },
        { text: 'There are no bond wires blocking airflow', correct: false },
      ],
    },
    {
      question: 'Decoupling capacitors in packages are placed close to the die to:',
      options: [
        { text: 'Filter high-frequency noise', correct: false },
        { text: 'Provide local charge during fast current transients', correct: true },
        { text: 'Reduce thermal resistance', correct: false },
        { text: 'Increase signal speed', correct: false },
      ],
    },
    {
      question: 'The formula for voltage droop due to inductance is:',
      options: [
        { text: 'V = IR (Ohm\'s law)', correct: false },
        { text: 'V = L * di/dt (Faraday\'s law)', correct: true },
        { text: 'V = CV (capacitor equation)', correct: false },
        { text: 'V = P/I (power equation)', correct: false },
      ],
    },
    {
      question: 'Multiple parallel bond wires or bumps are used to:',
      options: [
        { text: 'Make the package look more impressive', correct: false },
        { text: 'Reduce total inductance and resistance', correct: true },
        { text: 'Increase thermal resistance', correct: false },
        { text: 'Simplify manufacturing', correct: false },
      ],
    },
    {
      question: 'Thermal interface material (TIM) between die and heatsink:',
      options: [
        { text: 'Is electrically conductive', correct: false },
        { text: 'Fills microscopic gaps to improve thermal contact', correct: true },
        { text: 'Is only needed for wire-bond packages', correct: false },
        { text: 'Increases thermal resistance intentionally', correct: false },
      ],
    },
    {
      question: 'The trend toward flip-chip is driven by:',
      options: [
        { text: 'Lower manufacturing cost', correct: false },
        { text: 'Need for lower inductance, better thermals, and higher I/O density', correct: true },
        { text: 'Wire bond wire shortage', correct: false },
        { text: 'Customer preference for inverted dies', correct: false },
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
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '550px' }}
        >
          <defs>
            <linearGradient id="dieGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>
            <linearGradient id="heatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.error} />
              <stop offset="50%" stopColor={colors.warning} />
              <stop offset="100%" stopColor={colors.success} />
            </linearGradient>
          </defs>

          {/* Title */}
          <text x={250} y={25} fill={colors.textPrimary} fontSize={14} textAnchor="middle" fontWeight="bold">
            {packageType === 'wirebond' ? 'Wire Bond Package' : 'Flip-Chip Package'}
          </text>
          <text x={250} y={42} fill={colors.textSecondary} fontSize={11} textAnchor="middle">
            Cross-Section View | {showThermalMode && showThermal ? 'Thermal Mode' : 'Electrical Mode'}
          </text>

          {/* Package cross-section */}
          {packageType === 'wirebond' ? (
            <>
              {/* Heatsink at bottom */}
              <rect x={250 - heatsinkWidth/2} y={280} width={heatsinkWidth} height={heatsinkHeight} fill={colors.heatsink} rx={4} />
              <text x={250} y={305} fill={colors.textPrimary} fontSize={9} textAnchor="middle">Heat Sink</text>

              {/* Substrate */}
              <rect x={250 - substrateWidth/2} y={240} width={substrateWidth} height={substrateHeight} fill={colors.substrate} rx={2} />
              <text x={250} y={260} fill={colors.textSecondary} fontSize={9} textAnchor="middle">Substrate/Leadframe</text>

              {/* Die attach */}
              <rect x={250 - dieWidth/2 - 5} y={215} width={dieWidth + 10} height={25} fill="#5a4a3a" rx={2} />

              {/* Die (face up) */}
              <rect x={250 - dieWidth/2} y={180} width={dieWidth} height={dieHeight} fill="url(#dieGrad)" rx={2} />
              <text x={250} y={194} fill={colors.textPrimary} fontSize={10} textAnchor="middle">Die</text>

              {/* Wire bonds */}
              {[-40, -25, 25, 40].map((offset, i) => (
                <path
                  key={`wire${i}`}
                  d={`M ${250 + offset * 0.6} 180 Q ${250 + offset * 0.8} ${140 - wireLength * 10} ${250 + offset * 1.3} 240`}
                  fill="none"
                  stroke={colors.wirebond}
                  strokeWidth={2}
                  opacity={0.9}
                />
              ))}

              {/* Signal ringing animation */}
              {isAnimating && (
                <g>
                  {[-40, 40].map((offset, i) => (
                    <circle
                      key={`sig${i}`}
                      cx={250 + offset * 0.8}
                      cy={160 - wireLength * 5 + ringing * 10}
                      r={3}
                      fill={colors.signal}
                    >
                      <animate attributeName="opacity" values="1;0.3;1" dur="0.3s" repeatCount="indefinite" />
                    </circle>
                  ))}
                </g>
              )}

              {/* Wire length indicator */}
              <line x1={340} y1={180} x2={340} y2={240} stroke={colors.textMuted} strokeDasharray="3,3" />
              <text x={350} y={210} fill={colors.textMuted} fontSize={9}>L={wireLength}mm</text>

              {/* Thermal path */}
              {showThermalMode && showThermal && (
                <>
                  <line x1={250} y1={200} x2={250} y2={320} stroke={colors.thermal} strokeWidth={4} opacity={0.5} />
                  <text x={280} y={220} fill={colors.thermal} fontSize={9}>Thermal Path</text>
                  <text x={280} y={232} fill={colors.thermal} fontSize={8}>(Rth = {thermal.rthJunction.toFixed(1)} K/W)</text>
                </>
              )}
            </>
          ) : (
            <>
              {/* Heatsink on top of die */}
              <rect x={250 - heatsinkWidth/2} y={100} width={heatsinkWidth} height={heatsinkHeight} fill={colors.heatsink} rx={4} />
              <text x={250} y={125} fill={colors.textPrimary} fontSize={9} textAnchor="middle">Heat Spreader/Lid</text>

              {/* TIM layer */}
              <rect x={250 - dieWidth/2 - 5} y={140} width={dieWidth + 10} height={8} fill="#4a6b8a" rx={1} />

              {/* Die (face down) */}
              <rect x={250 - dieWidth/2} y={148} width={dieWidth} height={dieHeight} fill="url(#dieGrad)" rx={2} />
              <text x={250} y={162} fill={colors.textPrimary} fontSize={10} textAnchor="middle">Die (flipped)</text>

              {/* Solder bumps */}
              {[-35, -20, -5, 5, 20, 35].map((offset, i) => (
                <circle
                  key={`bump${i}`}
                  cx={250 + offset}
                  cy={175}
                  r={5}
                  fill={colors.flipchip}
                />
              ))}

              {/* Substrate */}
              <rect x={250 - substrateWidth/2} y={180} width={substrateWidth} height={substrateHeight} fill={colors.substrate} rx={2} />
              <text x={250} y={200} fill={colors.textSecondary} fontSize={9} textAnchor="middle">Organic Substrate</text>

              {/* BGA balls */}
              {[-60, -40, -20, 0, 20, 40, 60].map((offset, i) => (
                <circle
                  key={`bga${i}`}
                  cx={250 + offset}
                  cy={220}
                  r={6}
                  fill="#a0a0a0"
                />
              ))}

              <text x={250} y={250} fill={colors.textMuted} fontSize={9} textAnchor="middle">BGA Solder Balls</text>

              {/* Signal with minimal ringing */}
              {isAnimating && (
                <g>
                  {[-35, 35].map((offset, i) => (
                    <circle
                      key={`sig${i}`}
                      cx={250 + offset}
                      cy={175}
                      r={3}
                      fill={colors.signal}
                    >
                      <animate attributeName="opacity" values="1;0.7;1" dur="0.5s" repeatCount="indefinite" />
                    </circle>
                  ))}
                </g>
              )}

              {/* Bump height indicator */}
              <text x={350} y={172} fill={colors.textMuted} fontSize={9}>L~0.1mm</text>

              {/* Thermal path */}
              {showThermalMode && showThermal && (
                <>
                  <line x1={250} y1={148} x2={250} y2={100} stroke={colors.thermal} strokeWidth={8} opacity={0.5} />
                  <text x={280} y={128} fill={colors.success} fontSize={9}>Short Thermal Path</text>
                  <text x={280} y={140} fill={colors.success} fontSize={8}>(Rth = {thermal.rthJunction.toFixed(1)} K/W)</text>
                </>
              )}
            </>
          )}

          {/* Electrical metrics panel */}
          <rect x={10} y={330} width={230} height={80} fill="rgba(0,0,0,0.6)" rx={8} stroke={colors.accent} strokeWidth={1} />
          <text x={20} y={348} fill={colors.textSecondary} fontSize={11} fontWeight="bold">Electrical Parasitics</text>

          <text x={20} y={366} fill={colors.textSecondary} fontSize={10}>
            Inductance: <tspan fill={electrical.inductance < 1 ? colors.success : colors.warning}>{electrical.inductance.toFixed(2)} nH</tspan>
          </text>
          <text x={20} y={382} fill={colors.textSecondary} fontSize={10}>
            Ground Bounce: <tspan fill={electrical.groundBounce < 50 ? colors.success : colors.error}>{electrical.groundBounce.toFixed(0)} mV</tspan>
          </text>
          <text x={20} y={398} fill={colors.textSecondary} fontSize={10}>
            IR Drop: <tspan fill={electrical.irDrop < 10 ? colors.success : colors.warning}>{electrical.irDrop.toFixed(1)} mV</tspan>
          </text>

          {/* Thermal metrics panel */}
          {showThermalMode && showThermal && (
            <>
              <rect x={260} y={330} width={230} height={80} fill="rgba(0,0,0,0.6)" rx={8} stroke={colors.thermal} strokeWidth={1} />
              <text x={270} y={348} fill={colors.textSecondary} fontSize={11} fontWeight="bold">Thermal Performance</text>

              <text x={270} y={366} fill={colors.textSecondary} fontSize={10}>
                Rth Junction: <tspan fill={thermal.rthJunction < 1 ? colors.success : colors.warning}>{thermal.rthJunction.toFixed(1)} K/W</tspan>
              </text>
              <text x={270} y={382} fill={colors.textSecondary} fontSize={10}>
                Tj at {diePower}W: <tspan fill={thermal.junctionTemp < 85 ? colors.success : colors.error}>{thermal.junctionTemp.toFixed(0)}C</tspan>
              </text>
              <text x={270} y={398} fill={colors.textSecondary} fontSize={10}>
                Max Power: <tspan fill={colors.accent}>{thermal.maxPower.toFixed(0)} W</tspan>
              </text>
            </>
          )}
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setPackageType(packageType === 'wirebond' ? 'flipchip' : 'wirebond')}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: packageType === 'wirebond' ? colors.wirebond : colors.flipchip,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
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
                background: isAnimating ? colors.error : colors.signal,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
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
                fontSize: '14px',
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
            style={{ width: '100%' }}
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
          style={{ width: '100%' }}
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
          style={{ width: '100%' }}
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
                style={{ width: '100%' }}
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Packaging Physics</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare wire bond vs flip-chip electrical performance
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
              <li>Increase frequency to 5 GHz - watch ground bounce explode for wire bond</li>
              <li>Increase wire length - see inductance grow linearly</li>
              <li>Switch to flip-chip - notice the dramatic improvement</li>
              <li>Try 50A current - compare IR drop between packages</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'flipchip_better';

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
              Flip-chip wins electrically because shorter paths mean lower inductance.
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
              What about thermal performance - getting heat out of the chip?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Explore Thermal Performance</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Enable thermal mode and compare die temperatures
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
        {renderBottomBar(true, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'flipchip_thermal';

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
              Package physics impacts every electronic system
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
                {testScore >= 8 ? 'You\'ve mastered packaging physics!' : 'Review the material and try again.'}
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
        {renderBottomBar(true, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default FlipChipWirebondRenderer;
