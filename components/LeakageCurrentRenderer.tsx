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
  textMuted: '#94a3b8',
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
  twist_play: 'Crossover Point',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

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
      question: 'What causes gate leakage current in modern transistors?',
      options: [
        { text: 'Electrons flowing through damaged oxide', correct: false },
        { text: 'Quantum tunneling through ultra-thin gate oxide', correct: true },
        { text: 'Capacitive coupling between adjacent wires', correct: false },
        { text: 'Thermal noise in the substrate', correct: false },
      ],
    },
    {
      question: 'How does subthreshold leakage depend on temperature?',
      options: [
        { text: 'It decreases with higher temperature', correct: false },
        { text: 'It roughly doubles for every 10C increase', correct: true },
        { text: 'It stays constant regardless of temperature', correct: false },
        { text: 'It only changes above 100C', correct: false },
      ],
    },
    {
      question: 'At what process node did leakage power become a major design concern?',
      options: [
        { text: '250nm and larger', correct: false },
        { text: 'Around 130nm to 90nm', correct: true },
        { text: 'Only below 7nm', correct: false },
        { text: 'Leakage has always been the dominant power component', correct: false },
      ],
    },
    {
      question: 'What is the primary benefit of High-K gate dielectrics?',
      options: [
        { text: 'They conduct electricity better', correct: false },
        { text: 'They allow thicker oxide with same capacitance, reducing tunneling', correct: true },
        { text: 'They are cheaper to manufacture', correct: false },
        { text: 'They increase transistor switching speed', correct: false },
      ],
    },
    {
      question: 'How does supply voltage affect leakage power?',
      options: [
        { text: 'Leakage is independent of supply voltage', correct: false },
        { text: 'Leakage increases roughly linearly with voltage', correct: false },
        { text: 'Leakage increases exponentially as voltage rises', correct: true },
        { text: 'Leakage decreases with higher voltage', correct: false },
      ],
    },
    {
      question: 'Why do FinFET transistors have better leakage characteristics than planar transistors?',
      options: [
        { text: 'They use different semiconductor materials', correct: false },
        { text: 'The 3D gate structure provides better channel control', correct: true },
        { text: 'They operate at higher voltages', correct: false },
        { text: 'They have thicker gate oxide', correct: false },
      ],
    },
    {
      question: 'What technique do mobile processors use to minimize idle power?',
      options: [
        { text: 'Running all cores at maximum frequency', correct: false },
        { text: 'Power gating - completely shutting off unused blocks', correct: true },
        { text: 'Increasing the clock frequency to finish tasks faster', correct: false },
        { text: 'Using only planar transistors', correct: false },
      ],
    },
    {
      question: 'How does transistor threshold voltage affect subthreshold leakage?',
      options: [
        { text: 'Higher Vth means exponentially lower leakage', correct: true },
        { text: 'Higher Vth means higher leakage', correct: false },
        { text: 'Vth has no effect on leakage', correct: false },
        { text: 'Lower Vth reduces leakage', correct: false },
      ],
    },
    {
      question: 'What is the typical relationship between process node scaling and leakage density?',
      options: [
        { text: 'Leakage density stays constant as nodes shrink', correct: false },
        { text: 'Leakage density decreases with smaller nodes', correct: false },
        { text: 'Leakage density increases dramatically with smaller nodes', correct: true },
        { text: 'Leakage density only depends on temperature', correct: false },
      ],
    },
    {
      question: 'In a modern smartphone SoC at 5nm, approximately what fraction of total power is leakage at low activity?',
      options: [
        { text: 'Less than 5%', correct: false },
        { text: '10-20%', correct: false },
        { text: '30-50% or more', correct: true },
        { text: 'Over 90%', correct: false },
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
    const width = 400;
    const height = 350;
    const output = calculatePower();

    // Bar chart data
    const maxPower = Math.max(output.dynamicPower, output.totalLeakage) * 1.2;
    const dynamicHeight = (output.dynamicPower / maxPower) * 150;
    const gateHeight = (output.gateLeakage / maxPower) * 150;
    const subHeight = (output.subthresholdLeakage / maxPower) * 150;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Title */}
          <text x={width/2} y={25} fill={colors.textPrimary} fontSize={14} fontWeight="bold" textAnchor="middle">
            Power Breakdown at {processNode}nm Node
          </text>

          {/* Transistor visualization */}
          <g transform="translate(30, 50)">
            {/* Gate */}
            <rect x={40} y={20} width={60} height={10} fill={colors.gate} />
            <text x={70} y={15} fill={colors.gate} fontSize={9} textAnchor="middle">Gate</text>

            {/* Oxide */}
            <rect x={40} y={30} width={60} height={Math.max(2, processNode/15)} fill="#fbbf24" opacity={0.7} />

            {/* Channel */}
            <rect x={40} y={30 + Math.max(2, processNode/15)} width={60} height={15} fill="#475569" />

            {/* Source/Drain */}
            <rect x={20} y={30 + Math.max(2, processNode/15)} width={25} height={15} fill={colors.dynamic} />
            <rect x={95} y={30 + Math.max(2, processNode/15)} width={25} height={15} fill={colors.dynamic} />

            <text x={32} y={65} fill={colors.textMuted} fontSize={8} textAnchor="middle">S</text>
            <text x={107} y={65} fill={colors.textMuted} fontSize={8} textAnchor="middle">D</text>

            {/* Leakage arrows */}
            {/* Gate leakage */}
            <path d={`M 70 ${35 + Math.max(2, processNode/15)} L 70 70`} stroke={colors.gate} strokeWidth={2} strokeDasharray="3,2" opacity={0.8}>
              <animate attributeName="stroke-dashoffset" values="0;10" dur="1s" repeatCount="indefinite" />
            </path>
            <text x={85} y={55} fill={colors.gate} fontSize={8}>Gate leak</text>

            {/* Subthreshold leakage */}
            <path d="M 45 45 L 95 45" stroke={colors.subthreshold} strokeWidth={2} strokeDasharray="3,2" opacity={0.8}>
              <animate attributeName="stroke-dashoffset" values="0;10" dur="0.5s" repeatCount="indefinite" />
            </path>
            <text x={70} y={80} fill={colors.subthreshold} fontSize={8} textAnchor="middle">Subthreshold leak</text>
          </g>

          {/* Power bar chart */}
          <g transform="translate(200, 50)">
            <text x={85} y={0} fill={colors.textSecondary} fontSize={11} textAnchor="middle">Power (W)</text>

            {/* Dynamic power bar */}
            <rect x={20} y={160 - dynamicHeight} width={50} height={dynamicHeight} fill={colors.dynamic} rx={4} />
            <text x={45} y={175} fill={colors.textMuted} fontSize={9} textAnchor="middle">Dynamic</text>
            <text x={45} y={155 - dynamicHeight} fill={colors.dynamic} fontSize={10} textAnchor="middle">
              {output.dynamicPower.toFixed(1)}W
            </text>

            {/* Leakage power bar (stacked) */}
            <rect x={100} y={160 - gateHeight - subHeight} width={50} height={subHeight} fill={colors.subthreshold} rx={4} />
            <rect x={100} y={160 - gateHeight} width={50} height={gateHeight} fill={colors.gate} rx={4} />
            <text x={125} y={175} fill={colors.textMuted} fontSize={9} textAnchor="middle">Leakage</text>
            <text x={125} y={155 - gateHeight - subHeight} fill={colors.leakage} fontSize={10} textAnchor="middle">
              {output.totalLeakage.toFixed(1)}W
            </text>

            {/* Baseline */}
            <line x1={10} y1={160} x2={160} y2={160} stroke={colors.textMuted} strokeWidth={1} />
          </g>

          {/* Metrics panel */}
          <rect x={20} y={260} width={360} height={80} fill="rgba(0,0,0,0.4)" rx={8} />

          <text x={35} y={285} fill={colors.textSecondary} fontSize={11}>Process: {processNode}nm</text>
          <text x={35} y={305} fill={colors.textSecondary} fontSize={11}>Oxide: {output.tox.toFixed(2)}nm</text>
          <text x={35} y={325} fill={colors.textSecondary} fontSize={11}>Temp: {temperature}C</text>

          <text x={200} y={285} fill={colors.textSecondary} fontSize={11}>Total: {output.totalPower.toFixed(1)}W</text>
          <text x={200} y={305} fill={output.isLeakageDominant ? colors.error : colors.success} fontSize={11} fontWeight="bold">
            Leakage: {output.leakageRatio.toFixed(0)}% of total
          </text>
          <text x={200} y={325} fill={colors.textSecondary} fontSize={11}>
            {transistorCount}B transistors @ {clockFrequency}GHz
          </text>

          {/* Warning indicator */}
          {output.isLeakageDominant && (
            <g>
              <rect x={300} y={45} width={80} height={25} fill={colors.error} rx={4} opacity={0.3} />
              <text x={340} y={62} fill={colors.error} fontSize={10} textAnchor="middle" fontWeight="bold">
                Leakage Dominant!
              </text>
            </g>
          )}
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
            style={{ width: '100%' }}
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
            style={{ width: '100%' }}
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
            style={{ width: '100%' }}
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
            style={{ width: '100%' }}
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '10px 12px' : '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: isMobile ? '12px' : '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
          <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px' }}>
            {phaseOrder.map((p, i) => (
              <div
                key={p}
                onClick={() => i < currentIdx && goToPhase(p)}
                style={{
                  height: isMobile ? '10px' : '8px',
                  width: i === currentIdx ? (isMobile ? '20px' : '24px') : (isMobile ? '10px' : '8px'),
                  borderRadius: '5px',
                  backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : colors.border,
                  cursor: i < currentIdx ? 'pointer' : 'default',
                  transition: 'all 0.3s',
                  minWidth: isMobile ? '10px' : '8px',
                  minHeight: isMobile ? '10px' : '8px'
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textMuted }}>
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
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: isMobile ? '13px' : '14px',
            background: canGoNext ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.warning} 100%)` : colors.bgCardLight,
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

  // Render wrapper with progress bar
  const renderPhaseContent = (content: React.ReactNode, bottomBar: React.ReactNode) => (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
        {content}
      </div>
      {bottomBar}
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Leakage Current in Nanoscale
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
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
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
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
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try changing the process node size and watch what happens to leakage power!
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Leakage Power</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust process node, temperature, and voltage
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
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Experiments to Try:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Go from 90nm to 7nm - watch leakage explode</li>
              <li>Increase temperature - see leakage double every 10C</li>
              <li>Lower voltage - see both powers decrease</li>
              <li>Find where leakage exceeds dynamic power</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'significant';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Surprising Result!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Leakage power is a major concern in modern chips! At advanced nodes, it can
              consume 30-50% of total power even when the chip is nearly idle.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Two Types of Leakage</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.gate }}>Gate Leakage:</strong> Electrons quantum tunnel
                through the ultra-thin gate oxide. At 5nm, the oxide is only ~1nm thick - a few atoms!
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.subthreshold }}>Subthreshold Leakage:</strong> Even when
                gate voltage is below threshold, some electrons have enough thermal energy to flow
                from source to drain.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Temperature Effect:</strong> Subthreshold
                leakage roughly doubles for every 10C increase because more electrons have enough
                thermal energy to cross the barrier.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Scaling Challenge:</strong> As transistors
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Find the Crossover</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              At what node does leakage become dominant?
            </p>
          </div>

          {renderVisualization(true)}
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

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'leakage_dominates';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.warning}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.warning, marginBottom: '8px' }}>
              {wasCorrect ? 'Exactly Right!' : 'The Surprising Truth!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              At advanced nodes, leakage can indeed exceed dynamic power, especially at low activity
              levels. This is why modern chips aggressively power-gate unused blocks.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Industry Response</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>High-K Metal Gates:</strong> Replace SiO2
                with hafnium oxide (HfO2) which has higher dielectric constant, allowing thicker oxide
                with same capacitance.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>FinFET (3D Transistors):</strong> Wrap the
                gate around the channel on 3 sides for better electrostatic control, enabling higher
                threshold voltage without performance penalty.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Power Gating:</strong> Completely shut off
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
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
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
                  style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: '13px', WebkitTapHighlightColor: 'transparent' }}
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
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
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
                {testScore >= 7 ? 'You understand nanoscale leakage!' : 'Review the material and try again.'}
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
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''} {opt.text}
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
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: '16px', borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(245, 158, 11, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: '14px', WebkitTapHighlightColor: 'transparent' }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer', WebkitTapHighlightColor: 'transparent' }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: colors.accent, color: 'white', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : colors.success, color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer', WebkitTapHighlightColor: 'transparent' }}>Submit Test</button>
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
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You have mastered nanoscale leakage current!</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Gate leakage from quantum tunneling through thin oxide</li>
              <li>Subthreshold leakage from thermal carrier excitation</li>
              <li>Temperature dependence (doubling per 10C)</li>
              <li>High-K dielectrics and FinFET solutions</li>
              <li>Power gating for leakage management</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Industry Frontier:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
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
