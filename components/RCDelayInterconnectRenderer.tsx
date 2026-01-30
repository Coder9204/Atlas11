'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

type RCPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface RCDelayInterconnectRendererProps {
  gamePhase?: string; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

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
  wire: '#f59e0b',
  signal: '#22c55e',
  delayed: '#ef4444',
  copper: '#b87333',
};

const phaseOrder: RCPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<RCPhase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Play',
  review: 'Review',
  twist_predict: 'Twist',
  twist_play: 'Explore',
  twist_review: 'Explain',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery',
};

const RCDelayInterconnectRenderer: React.FC<RCDelayInterconnectRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Internal phase state management
  const getInitialPhase = (): RCPhase => {
    if (gamePhase && phaseOrder.includes(gamePhase as RCPhase)) {
      return gamePhase as RCPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<RCPhase>(getInitialPhase);
  const [isMobile, setIsMobile] = useState(false);
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Sync with external gamePhase if provided (for resume)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as RCPhase)) {
      setPhase(gamePhase as RCPhase);
    }
  }, [gamePhase]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Navigation functions
  const goToPhase = useCallback((newPhase: RCPhase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 300) return;
    if (isNavigating.current) return;
    lastClickRef.current = now;
    isNavigating.current = true;
    setPhase(newPhase);
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

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
  const [wireLength, setWireLength] = useState(1000); // micrometers
  const [wireWidth, setWireWidth] = useState(100); // nanometers
  const [metalLayer, setMetalLayer] = useState<'aluminum' | 'copper'>('copper');
  const [technologyNode, setTechnologyNode] = useState(14); // nm
  const [animationTime, setAnimationTime] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Animation
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationTime(t => (t + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Physics calculations
  const calculateRCDelay = useCallback(() => {
    // Resistivity (ohm-cm converted to appropriate units)
    const resistivity = metalLayer === 'copper' ? 1.7e-6 : 2.8e-6; // ohm-cm

    // Wire dimensions
    const length = wireLength * 1e-4; // convert um to cm
    const width = wireWidth * 1e-7; // convert nm to cm
    const thickness = width * 0.5; // assume aspect ratio of 2

    // Resistance: R = rho * L / (W * T)
    const resistance = resistivity * length / (width * thickness);

    // Capacitance (simplified model): C = epsilon * L * W / spacing
    // Assume dielectric constant ~3 for low-k material
    const epsilon = 3 * 8.85e-14; // F/cm
    const spacing = width; // assume spacing equals width
    const capacitance = epsilon * length * width / spacing;

    // RC delay (Elmore delay approximation)
    const rcDelay = 0.7 * resistance * capacitance; // seconds

    // Signal frequency limit
    const maxFrequency = 0.35 / rcDelay; // Hz

    // Technology scaling factor (smaller = higher R, higher C per unit)
    const scalingFactor = (14 / technologyNode);

    // Adjusted values for technology node
    const scaledDelay = rcDelay * scalingFactor * scalingFactor; // quadratic scaling
    const scaledFreq = maxFrequency / (scalingFactor * scalingFactor);

    return {
      resistance: resistance / 1000, // kohms
      capacitance: capacitance * 1e15, // fF
      rcDelay: scaledDelay * 1e12, // ps
      maxFrequency: scaledFreq / 1e9, // GHz
      riseTime: 2.2 * scaledDelay * 1e12, // ps (10-90% rise time)
    };
  }, [wireLength, wireWidth, metalLayer, technologyNode]);

  const predictions = [
    { id: 'constant', label: 'Signal speed stays constant regardless of wire dimensions' },
    { id: 'linear', label: 'Delay increases linearly with wire length' },
    { id: 'quadratic', label: 'Delay increases with length squared (L^2) - much worse!' },
    { id: 'logarithmic', label: 'Delay increases logarithmically - not much effect' },
  ];

  const twistPredictions = [
    { id: 'solved', label: 'Copper completely solved the resistance problem' },
    { id: 'partial', label: 'Copper helped but resistance is still a growing challenge at smaller nodes' },
    { id: 'worse', label: 'Copper actually made things worse' },
    { id: 'same', label: 'Copper is the same as aluminum - no real benefit' },
  ];

  const transferApplications = [
    {
      title: 'CPU Clock Distribution',
      description: 'Modern CPUs run at GHz frequencies. The clock signal must reach all parts of the chip simultaneously, but RC delay causes skew.',
      question: 'Why do CPUs use clock tree structures instead of a single wire?',
      answer: 'Long wires have quadratic RC delay. By using a tree of shorter wires with buffers (repeaters), the delay is reduced from L^2 to L. This enables synchronous operation at GHz speeds across the entire chip.',
    },
    {
      title: 'Advanced Packaging (3D ICs)',
      description: '3D stacked chips use vertical connections (TSVs) between layers. These short paths dramatically reduce interconnect delay.',
      question: 'Why does vertical stacking help with interconnect delay?',
      answer: 'TSVs are 10-100x shorter than horizontal interconnects that would span the same distance. Since delay scales with L^2, shorter paths give enormous improvements - a 10x shorter path has 100x less delay!',
    },
    {
      title: 'Network-on-Chip (NoC)',
      description: 'Modern processors use packet-based networks instead of long global wires to communicate between cores.',
      question: 'Why did chip designers switch from buses to networks-on-chip?',
      answer: 'Global wires have prohibitive RC delay at GHz frequencies. NoC breaks communication into short hops with routers. Each hop is fast; the added latency from routing is less than global wire delay.',
    },
    {
      title: 'Memory Interface Design',
      description: 'DDR5 memory runs at 4800+ MT/s. The traces connecting CPU to memory must be precisely length-matched.',
      question: 'Why must memory traces be exactly the same length?',
      answer: 'Different trace lengths cause different RC delays. If data bits arrive at different times (skew), the memory controller cannot reliably sample them. Length matching ensures all bits experience identical delay.',
    },
  ];

  const testQuestions = [
    {
      question: 'How does RC delay scale with wire length?',
      options: [
        { text: 'Linearly (double length = double delay)', correct: false },
        { text: 'Quadratically (double length = 4x delay)', correct: true },
        { text: 'Logarithmically (double length = small increase)', correct: false },
        { text: 'Constant (length does not matter)', correct: false },
      ],
    },
    {
      question: 'Why did the semiconductor industry replace aluminum with copper for interconnects?',
      options: [
        { text: 'Copper is cheaper than aluminum', correct: false },
        { text: 'Copper has lower resistance, reducing RC delay', correct: true },
        { text: 'Copper is easier to process', correct: false },
        { text: 'Copper looks better under a microscope', correct: false },
      ],
    },
    {
      question: 'As technology nodes shrink (e.g., 14nm to 7nm), what happens to interconnect delay?',
      options: [
        { text: 'Delay decreases because wires are shorter', correct: false },
        { text: 'Delay stays the same', correct: false },
        { text: 'Delay increases because thinner wires have higher resistance', correct: true },
        { text: 'Delay becomes unpredictable', correct: false },
      ],
    },
    {
      question: 'What is a repeater (buffer) used for in long interconnects?',
      options: [
        { text: 'To boost the signal voltage', correct: false },
        { text: 'To break a long wire into shorter segments, reducing quadratic delay', correct: true },
        { text: 'To filter out noise', correct: false },
        { text: 'To reduce power consumption', correct: false },
      ],
    },
    {
      question: 'Why is the RC time constant (tau = R x C) important for chip design?',
      options: [
        { text: 'It determines the maximum clock frequency for a wire', correct: true },
        { text: 'It affects only the power consumption', correct: false },
        { text: 'It is only relevant for analog circuits', correct: false },
        { text: 'It determines the wire temperature', correct: false },
      ],
    },
    {
      question: 'What is electromigration and why is it related to interconnect resistance?',
      options: [
        { text: 'Electrons moving through thin wires can physically move metal atoms, increasing resistance over time', correct: true },
        { text: 'Electrons migrate to the surface of wires', correct: false },
        { text: 'It is a quantum effect that reduces resistance', correct: false },
        { text: 'It only occurs in aluminum, not copper', correct: false },
      ],
    },
    {
      question: 'Low-k dielectrics are used in modern chips to:',
      options: [
        { text: 'Increase wire resistance', correct: false },
        { text: 'Reduce capacitance between wires, decreasing RC delay', correct: true },
        { text: 'Improve thermal conductivity', correct: false },
        { text: 'Make wires more visible under inspection', correct: false },
      ],
    },
    {
      question: 'Why do modern chips use multiple metal layers?',
      options: [
        { text: 'To make the chip thicker and stronger', correct: false },
        { text: 'To provide more routing options and allow thicker wires for long-distance signals', correct: true },
        { text: 'To reduce manufacturing cost', correct: false },
        { text: 'For aesthetic reasons only', correct: false },
      ],
    },
    {
      question: 'Signal integrity problems in interconnects include:',
      options: [
        { text: 'Delay, crosstalk, and signal attenuation', correct: true },
        { text: 'Only power consumption issues', correct: false },
        { text: 'Only manufacturing defects', correct: false },
        { text: 'Only temperature effects', correct: false },
      ],
    },
    {
      question: 'At what point does interconnect delay become more significant than transistor delay?',
      options: [
        { text: 'At large technology nodes (> 100nm)', correct: false },
        { text: 'Starting around 130nm and getting worse at smaller nodes', correct: true },
        { text: 'Only at cryogenic temperatures', correct: false },
        { text: 'Interconnect delay is never significant', correct: false },
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
    if (score < 7 && onIncorrectAnswer) onIncorrectAnswer();
  };

  const renderVisualization = () => {
    const delay = calculateRCDelay();
    const width = 400;
    const height = 380;

    // Signal propagation animation
    const signalProgress = (animationTime / 360);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            <linearGradient id="wireGradCopper" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b87333" />
              <stop offset="50%" stopColor="#da9f5f" />
              <stop offset="100%" stopColor="#b87333" />
            </linearGradient>
            <linearGradient id="wireGradAlu" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a8a8a8" />
              <stop offset="50%" stopColor="#d0d0d0" />
              <stop offset="100%" stopColor="#a8a8a8" />
            </linearGradient>
            <linearGradient id="signalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.signal} stopOpacity="0" />
              <stop offset="50%" stopColor={colors.signal} />
              <stop offset="100%" stopColor={colors.signal} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Title */}
          <text x={width/2} y={25} fill={colors.textPrimary} fontSize={14} fontWeight="bold" textAnchor="middle">
            RC Delay in Chip Interconnects
          </text>

          {/* Wire representation */}
          <g transform="translate(50, 50)">
            {/* Dielectric layers */}
            <rect x={0} y={15} width={300} height={50} fill="rgba(100, 100, 200, 0.2)" rx={4} />
            <text x={150} y={10} fill={colors.textMuted} fontSize={9} textAnchor="middle">Low-k Dielectric</text>

            {/* The wire itself */}
            <rect
              x={10}
              y={30}
              width={280}
              height={Math.max(4, wireWidth / 25)}
              fill={metalLayer === 'copper' ? 'url(#wireGradCopper)' : 'url(#wireGradAlu)'}
              rx={2}
            />

            {/* Parallel plate capacitance visualization */}
            <line x1={10} y1={55} x2={290} y2={55} stroke={colors.textMuted} strokeWidth={1} strokeDasharray="4,4" />
            <text x={150} y={75} fill={colors.textMuted} fontSize={8} textAnchor="middle">Ground Plane (Capacitance)</text>

            {/* Signal propagation animation */}
            <rect
              x={10 + signalProgress * 260}
              y={30}
              width={20}
              height={Math.max(4, wireWidth / 25)}
              fill={colors.signal}
              opacity={0.8}
            >
              <animate attributeName="opacity" values="0.6;1;0.6" dur="0.3s" repeatCount="indefinite" />
            </rect>
          </g>

          {/* Waveform comparison */}
          <g transform="translate(50, 130)">
            <text x={0} y={0} fill={colors.textSecondary} fontSize={11} fontWeight="bold">Input vs Output Signals:</text>

            {/* Input signal - ideal square wave */}
            <rect x={0} y={10} width={300} height={50} fill="rgba(0,0,0,0.3)" rx={4} />
            <text x={5} y={25} fill={colors.signal} fontSize={9}>Input</text>
            <path
              d="M 10 50 L 10 20 L 80 20 L 80 50 L 150 50 L 150 20 L 220 20 L 220 50 L 290 50"
              stroke={colors.signal}
              strokeWidth={2}
              fill="none"
            />

            {/* Output signal - RC delayed (exponential rise/fall) */}
            <rect x={0} y={70} width={300} height={50} fill="rgba(0,0,0,0.3)" rx={4} />
            <text x={5} y={85} fill={colors.delayed} fontSize={9}>Output</text>
            <path
              d={`M 10 110
                  Q 30 110, 40 90
                  Q 50 80, 80 80
                  Q 90 80, 100 90
                  Q 120 110, 150 110
                  Q 160 110, 170 90
                  Q 180 80, 220 80
                  Q 230 80, 240 90
                  Q 260 110, 290 110`}
              stroke={colors.delayed}
              strokeWidth={2}
              fill="none"
            />

            {/* Delay indicator */}
            <line x1={10} y1={140} x2={40} y2={140} stroke={colors.accent} strokeWidth={2} />
            <text x={50} y={143} fill={colors.accent} fontSize={10}>RC Delay: {delay.rcDelay.toFixed(1)} ps</text>
          </g>

          {/* RC circuit model */}
          <g transform="translate(50, 280)">
            <text x={0} y={0} fill={colors.textSecondary} fontSize={11} fontWeight="bold">Distributed RC Model:</text>

            {/* Resistor symbols */}
            {[0, 1, 2, 3].map(i => (
              <g key={i} transform={`translate(${i * 70 + 20}, 15)`}>
                <path d="M 0 10 L 5 10 L 8 5 L 14 15 L 20 5 L 26 15 L 32 5 L 38 15 L 41 10 L 50 10" stroke={colors.wire} strokeWidth={2} fill="none" />
                <line x1={25} y1={25} x2={25} y2={40} stroke={colors.textMuted} strokeWidth={1} />
                <line x1={15} y1={40} x2={35} y2={40} stroke={colors.accent} strokeWidth={2} />
                <line x1={15} y1={45} x2={35} y2={45} stroke={colors.accent} strokeWidth={2} />
                <line x1={25} y1={45} x2={25} y2={55} stroke={colors.textMuted} strokeWidth={1} />
              </g>
            ))}

            {/* Ground */}
            <line x1={20} y1={70} x2={300} y2={70} stroke={colors.textMuted} strokeWidth={1} />
            <text x={310} y={73} fill={colors.textMuted} fontSize={9}>GND</text>
          </g>

          {/* Stats panel */}
          <g transform="translate(260, 45)">
            <rect x={0} y={0} width={130} height={80} fill="rgba(0,0,0,0.5)" rx={8} stroke={colors.accent} strokeWidth={1} />
            <text x={10} y={18} fill={colors.textSecondary} fontSize={10}>R: {delay.resistance.toFixed(2)} kohm</text>
            <text x={10} y={34} fill={colors.textSecondary} fontSize={10}>C: {delay.capacitance.toFixed(1)} fF</text>
            <text x={10} y={50} fill={colors.accent} fontSize={10}>Delay: {delay.rcDelay.toFixed(1)} ps</text>
            <text x={10} y={66} fill={colors.success} fontSize={10}>Max f: {delay.maxFrequency.toFixed(2)} GHz</text>
          </g>
        </svg>
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Wire Length: {wireLength} um
        </label>
        <input
          type="range"
          min="100"
          max="5000"
          step="100"
          value={wireLength}
          onChange={(e) => setWireLength(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Wire Width: {wireWidth} nm
        </label>
        <input
          type="range"
          min="20"
          max="500"
          step="10"
          value={wireWidth}
          onChange={(e) => setWireWidth(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Technology Node: {technologyNode} nm
        </label>
        <input
          type="range"
          min="3"
          max="45"
          step="1"
          value={technologyNode}
          onChange={(e) => setTechnologyNode(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: colors.accent }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Metal Layer: {metalLayer.charAt(0).toUpperCase() + metalLayer.slice(1)}
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setMetalLayer('copper')}
            style={{
              WebkitTapHighlightColor: 'transparent',
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: metalLayer === 'copper' ? `2px solid ${colors.copper}` : '1px solid rgba(255,255,255,0.2)',
              background: metalLayer === 'copper' ? 'rgba(184, 115, 51, 0.2)' : 'transparent',
              color: colors.textPrimary,
              cursor: 'pointer',
            }}
          >
            Copper (Cu)
          </button>
          <button
            onClick={() => setMetalLayer('aluminum')}
            style={{
              WebkitTapHighlightColor: 'transparent',
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: metalLayer === 'aluminum' ? '2px solid #a8a8a8' : '1px solid rgba(255,255,255,0.2)',
              background: metalLayer === 'aluminum' ? 'rgba(168, 168, 168, 0.2)' : 'transparent',
              color: colors.textPrimary,
              cursor: 'pointer',
            }}
          >
            Aluminum (Al)
          </button>
        </div>
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          RC Delay = 0.7 x R x C (Elmore delay)
        </div>
        <div style={{ color: colors.textMuted, fontSize: '11px', marginTop: '4px' }}>
          R proportional to L/W^2, C proportional to L x W, so Delay proportional to L^2
        </div>
      </div>
    </div>
  );

  const buttonStyle = {
    WebkitTapHighlightColor: 'transparent' as const,
  };

  const renderProgressBar = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: isMobile ? '6px' : '8px',
      padding: '12px 16px',
      background: colors.bgDark,
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      flexWrap: 'wrap' as const,
    }}>
      {phaseOrder.map((p, index) => {
        const currentIndex = phaseOrder.indexOf(phase);
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <button
            key={p}
            onClick={() => index <= currentIndex && goToPhase(p)}
            disabled={index > currentIndex}
            style={{
              ...buttonStyle,
              width: isMobile ? '28px' : '32px',
              height: isMobile ? '28px' : '32px',
              borderRadius: '50%',
              border: 'none',
              background: isCompleted ? colors.success : isCurrent ? colors.accent : 'rgba(255,255,255,0.1)',
              color: isCompleted || isCurrent ? 'white' : colors.textMuted,
              fontSize: isMobile ? '10px' : '11px',
              fontWeight: 'bold',
              cursor: index <= currentIndex ? 'pointer' : 'not-allowed',
              opacity: index > currentIndex ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={phaseLabels[p]}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );

  const renderBottomBar = (canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed' as const,
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <button
        onClick={goBack}
        disabled={phase === 'hook'}
        style={{
          ...buttonStyle,
          padding: '12px 24px',
          borderRadius: '8px',
          border: `1px solid ${colors.textMuted}`,
          background: 'transparent',
          color: phase === 'hook' ? colors.textMuted : colors.textPrimary,
          fontWeight: 'bold',
          cursor: phase === 'hook' ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          opacity: phase === 'hook' ? 0.5 : 1,
        }}
      >
        Back
      </button>
      <button
        onClick={goNext}
        disabled={!canProceed}
        style={{
          ...buttonStyle,
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
        }}
      >
        {buttonText}
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
              RC Delay in Interconnects
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Why do smaller chip features not always mean faster chips?
            </p>
          </div>

          {renderVisualization()}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Transistors keep getting faster as they shrink. But the wires connecting them
                are getting slower! Thinner wires have higher resistance, and closer spacing
                means more capacitance.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is why interconnect delay is now the bottleneck in modern chips.
              </p>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Explore how wire dimensions and materials affect signal delay!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Question:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A signal needs to travel across a chip through a metal wire.
              The wire has both resistance (R) and capacitance (C) to ground.
              How does the delay scale as you make the wire longer?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              If you double the wire length, what happens to the RC delay?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    ...buttonStyle,
                    padding: '16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left' as const,
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(!!prediction, 'Test My Prediction')}
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore RC Delay</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust wire parameters to see how delay changes
            </p>
          </div>

          {renderVisualization()}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Double the wire length - does delay double or quadruple?</li>
              <li>Compare copper vs aluminum at the same dimensions</li>
              <li>See how shrinking the technology node affects delay</li>
              <li>Find wire dimensions that allow 5 GHz operation</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'quadratic';

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
              RC delay scales with length SQUARED! Both R and C increase with length,
              so delay = R x C increases as L x L = L^2. Double the length means 4x the delay!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of RC Delay</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Resistance:</strong> R = rho x L / A.
                Longer wire = higher R. Thinner wire = smaller area = even higher R.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Capacitance:</strong> C proportional to L.
                Longer wire = more capacitance to ground and adjacent wires.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Delay:</strong> tau = R x C = (rho x L/A) x (epsilon x L)
                = L^2. This quadratic scaling is devastating for long wires!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>The Solution:</strong> Use repeaters to break
                long wires into shorter segments. n segments of length L/n have delay n x (L/n)^2 = L^2/n.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Next: A Twist!')}
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
              In the late 1990s, the industry switched from aluminum to copper wires...
            </p>
          </div>

          {renderVisualization()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Copper Revolution:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Copper has 40% lower resistivity than aluminum. IBM introduced copper interconnects
              in 1997, and the industry followed. But did this solve the interconnect delay problem?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Did switching to copper solve the resistance problem?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    ...buttonStyle,
                    padding: '16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left' as const,
                    fontSize: '14px',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(!!twistPrediction, 'Test My Prediction')}
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Compare Materials & Nodes</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              See how copper helps, but scaling still hurts
            </p>
          </div>

          {renderVisualization()}
          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Insight:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Switch between copper and aluminum to see the ~40% resistance improvement.
              But then shrink the technology node from 45nm to 7nm - notice how delay
              increases even with copper! The wires are getting so thin that resistance
              is increasing faster than we can compensate.
            </p>
          </div>
        </div>
        {renderBottomBar(true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'partial';

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
              Copper helped buy time, but resistance is still a growing problem.
              As wires shrink below ~20nm, electron scattering from surfaces and grain
              boundaries increases resistance dramatically.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>The Ongoing Challenge</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Size Effects:</strong> When wires are
                thinner than the electron mean free path (~40nm in copper), resistivity increases.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>New Materials:</strong> Researchers are
                exploring cobalt, ruthenium, and even carbon nanotubes for future interconnects.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Architecture Solutions:</strong> 3D stacking,
                chiplets, and optical interconnects are becoming necessary to avoid the RC wall.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(true, 'Apply This Knowledge')}
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
              RC delay affects chip design at every level
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
                  style={{ ...buttonStyle, padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px' }}
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
        {renderBottomBar(transferCompleted.size >= 4, 'Take the Test')}
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
              background: testScore >= 7 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 7 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 7 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 7 ? 'You understand RC delay in interconnects!' : 'Review the material and try again.'}
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
                      {opt.correct ? 'Correct' : userAnswer === oIndex ? 'Your answer' : ''} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(testScore >= 7, testScore >= 7 ? 'Complete Mastery' : 'Review & Retry')}
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
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ ...buttonStyle, padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left' as const, fontSize: '14px' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ ...buttonStyle, padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ ...buttonStyle, padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ ...buttonStyle, padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer' }}>Submit Test</button>
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
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You understand RC delay in chip interconnects!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>RC delay scales quadratically with length (L^2)</li>
              <li>Copper replaced aluminum for lower resistance</li>
              <li>Smaller technology nodes increase relative delay</li>
              <li>Repeaters break wires to reduce quadratic scaling</li>
              <li>Low-k dielectrics reduce capacitance</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              The interconnect crisis is driving revolutionary changes in chip design: 3D stacking
              puts memory on top of logic, chiplets connect multiple smaller dies, and researchers
              are exploring optical interconnects that could eliminate RC delay entirely for long-distance
              on-chip communication!
            </p>
          </div>
          {renderVisualization()}
        </div>
        {renderBottomBar(true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default RCDelayInterconnectRenderer;
