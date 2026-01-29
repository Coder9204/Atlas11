'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface EMIShieldingRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
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
  accent: '#ec4899',
  accentGlow: 'rgba(236, 72, 153, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  signal: '#60a5fa',
  noise: '#ef4444',
  shield: '#64748b',
  twistedPair: '#22c55e',
};

// Cable types with EMI characteristics
const cableTypes = [
  { name: 'Unshielded Single Wire', shielding: 0, twisting: false, emiSusceptibility: 100 },
  { name: 'Unshielded Twisted Pair (UTP)', shielding: 0, twisting: true, emiSusceptibility: 40 },
  { name: 'Shielded Twisted Pair (STP)', shielding: 80, twisting: true, emiSusceptibility: 10 },
  { name: 'Coaxial (Shielded)', shielding: 95, twisting: false, emiSusceptibility: 5 },
];

const EMIShieldingRenderer: React.FC<EMIShieldingRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [cableTypeIndex, setCableTypeIndex] = useState(0);
  const [signalFrequency, setSignalFrequency] = useState(100); // MHz
  const [noiseSource, setNoiseSource] = useState(50); // arbitrary noise level
  const [cableLength, setCableLength] = useState(10); // meters
  const [animationFrame, setAnimationFrame] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Calculate EMI effects
  const cable = cableTypes[cableTypeIndex];
  const frequencyFactor = Math.log10(signalFrequency / 10 + 1) * 2; // Higher freq = more radiation
  const effectiveNoise = noiseSource * (cable.emiSusceptibility / 100) * (cableLength / 10);
  const radiatedEMI = signalFrequency * (1 - cable.shielding / 100) * 0.5;
  const signalIntegrity = Math.max(0, 100 - effectiveNoise * frequencyFactor);
  const twistCancellation = cable.twisting ? 60 : 0;

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 100);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const predictions = [
    { id: 'looks', label: 'Just for professional appearance - no functional difference' },
    { id: 'physical', label: 'Physical protection from damage only' },
    { id: 'emi', label: 'Electromagnetic shielding to prevent interference' },
    { id: 'faster', label: 'Makes data travel faster through the cable' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'No effect - both wires carry the same signal anyway' },
    { id: 'slower', label: 'Slows down data transfer due to longer path' },
    { id: 'cancellation', label: 'Noise couples equally to both wires and cancels out' },
    { id: 'heat', label: 'Reduces heat buildup in the cable' },
  ];

  const transferApplications = [
    {
      title: 'Ethernet Cabling (Cat6/Cat6a)',
      description: 'Ethernet cables use twisted pairs. Why does Category 6a have tighter twists than Cat5e?',
      answer: 'Higher frequencies (10Gbps) need tighter twists for better noise cancellation. Cat6a twists vary per pair to reduce crosstalk between pairs. This allows 10Gbps over 100m, vs Cat5e limit of 1Gbps. Shielded Cat6a (F/UTP) adds foil for even better performance.',
    },
    {
      title: 'Data Center Power Cables',
      description: 'High-power equipment creates strong magnetic fields. How do data centers protect nearby network cables?',
      answer: 'Physical separation (30cm minimum), routing power and data perpendicular (not parallel), using STP cables near power runs, and ferrite cores on cables. Some facilities use shielded cable trays. Power cables themselves use twisted conductors to reduce emitted EMI.',
    },
    {
      title: 'Medical Equipment',
      description: 'MRI machines create incredibly strong magnetic fields (1.5-7 Tesla). How do nearby computers survive?',
      answer: 'MRI rooms are Faraday cages - copper mesh in walls blocks EMI escape. Equipment uses fiber optic connections (immune to EMI). All metal objects are excluded. The 5 gauss line marks where magnetic field is safe for electronics. Some use RF shielded rooms within rooms.',
    },
    {
      title: 'Automotive Electronics',
      description: 'Modern cars have 100+ electronic modules near ignition coils, motors, and radio transmitters. How do they coexist?',
      answer: 'Twisted pair CAN bus with differential signaling (noise affects both wires equally and cancels). Shielded cables for sensitive signals. EMI filters on power lines. Metal enclosures for modules. Spark plugs use resistor suppression. Strict automotive EMC testing standards.',
    },
  ];

  const testQuestions = [
    {
      question: 'Electromagnetic interference (EMI) in cables is caused by:',
      options: [
        { text: 'Data moving too fast', correct: false },
        { text: 'External electromagnetic fields inducing currents', correct: true },
        { text: 'Cable overheating', correct: false },
        { text: 'Poor quality copper', correct: false },
      ],
    },
    {
      question: 'Twisted pair cables reduce noise because:',
      options: [
        { text: 'The twist makes the cable stronger', correct: false },
        { text: 'External noise induces equal voltages that cancel in differential signaling', correct: true },
        { text: 'Twisted wires carry more current', correct: false },
        { text: 'The twist creates a magnetic barrier', correct: false },
      ],
    },
    {
      question: 'Common mode noise is:',
      options: [
        { text: 'Noise that appears on only one conductor', correct: false },
        { text: 'Noise that appears equally on both conductors of a pair', correct: true },
        { text: 'Noise from the power company', correct: false },
        { text: 'Noise that varies with temperature', correct: false },
      ],
    },
    {
      question: 'Higher frequency signals radiate more EMI because:',
      options: [
        { text: 'They use more power', correct: false },
        { text: 'Cables become more efficient antennas at higher frequencies', correct: true },
        { text: 'The electrons move faster', correct: false },
        { text: 'High frequencies generate more heat', correct: false },
      ],
    },
    {
      question: 'A Faraday cage blocks EMI by:',
      options: [
        { text: 'Absorbing all electromagnetic energy as heat', correct: false },
        { text: 'Conducting induced currents that cancel the internal field', correct: true },
        { text: 'Reflecting all radio waves back', correct: false },
        { text: 'Creating a vacuum inside', correct: false },
      ],
    },
    {
      question: 'Crosstalk between adjacent cable pairs is reduced by:',
      options: [
        { text: 'Using the same twist rate for all pairs', correct: false },
        { text: 'Using different twist rates for each pair', correct: true },
        { text: 'Making all pairs the same color', correct: false },
        { text: 'Using thicker insulation only', correct: false },
      ],
    },
    {
      question: 'Shielded Twisted Pair (STP) combines:',
      options: [
        { text: 'Two types of conductors', correct: false },
        { text: 'Twist noise cancellation AND metallic shielding', correct: true },
        { text: 'Digital and analog signals', correct: false },
        { text: 'Power and data transmission', correct: false },
      ],
    },
    {
      question: 'Differential signaling transmits data by:',
      options: [
        { text: 'Varying the voltage on a single wire', correct: false },
        { text: 'Sending opposite signals on two wires - the difference carries data', correct: true },
        { text: 'Using different frequencies for 0 and 1', correct: false },
        { text: 'Changing the current flow direction', correct: false },
      ],
    },
    {
      question: 'Ferrite cores on cables reduce EMI by:',
      options: [
        { text: 'Making the cable heavier and more stable', correct: false },
        { text: 'Absorbing high-frequency noise as heat in the ferrite', correct: true },
        { text: 'Increasing signal strength', correct: false },
        { text: 'Cooling the cable', correct: false },
      ],
    },
    {
      question: 'Why do 10Gbps Ethernet cables need better shielding than 1Gbps?',
      options: [
        { text: 'More data means more weight', correct: false },
        { text: 'Higher frequencies radiate more and are more susceptible to interference', correct: true },
        { text: '10Gbps uses more power', correct: false },
        { text: '10Gbps cables are longer', correct: false },
      ],
    },
  ];

  const handleTestAnswer = useCallback((questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  }, [testAnswers]);

  const submitTest = useCallback(() => {
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
  }, [testAnswers, testQuestions, onCorrectAnswer, onIncorrectAnswer]);

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 340;

    // Wave animation calculations
    const waveOffset = animationFrame * 3;
    const noiseWave1 = Math.sin(animationFrame * 0.15) * (effectiveNoise / 10);
    const noiseWave2 = Math.sin(animationFrame * 0.2 + 2) * (effectiveNoise / 15);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: '#1e293b', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            <linearGradient id="signalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.signal} />
              <stop offset="100%" stopColor={colors.signal} stopOpacity={signalIntegrity / 100} />
            </linearGradient>
            <linearGradient id="noiseGrad" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor={colors.noise} stopOpacity={0.6} />
              <stop offset="100%" stopColor={colors.noise} stopOpacity={0} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Title */}
          <text x={200} y={20} textAnchor="middle" fill={colors.textPrimary} fontSize={14} fontWeight="bold">
            Electromagnetic Interference (EMI)
          </text>
          <text x={200} y={38} textAnchor="middle" fill={colors.textSecondary} fontSize={11}>
            {cable.name}
          </text>

          {/* EMI Source (represented as radiating waves) */}
          <g transform="translate(60, 140)">
            <rect x={-25} y={-30} width={50} height={60} rx={4} fill="#374151" stroke={colors.noise} strokeWidth={2} />
            <text x={0} y={0} textAnchor="middle" fill={colors.noise} fontSize={10}>EMI</text>
            <text x={0} y={12} textAnchor="middle" fill={colors.noise} fontSize={8}>Source</text>

            {/* Radiating EMI waves */}
            {[0, 1, 2].map(i => (
              <circle
                key={i}
                r={30 + i * 20 + (animationFrame % 30)}
                fill="none"
                stroke={colors.noise}
                strokeWidth={1}
                opacity={0.5 - i * 0.15 - (animationFrame % 30) / 100}
              />
            ))}
          </g>

          {/* Cable visualization */}
          <g transform="translate(150, 100)">
            {/* Shield (if present) */}
            {cable.shielding > 0 && (
              <rect
                x={-5}
                y={-10}
                width={190}
                height={100}
                rx={6}
                fill="none"
                stroke={colors.shield}
                strokeWidth={3}
                strokeDasharray={cable.shielding > 50 ? 'none' : '10,5'}
                opacity={cable.shielding / 100}
              />
            )}

            {/* Wire pair visualization */}
            {cable.twisting ? (
              // Twisted pair
              <g>
                {/* Wire 1 (signal +) */}
                <path
                  d={`M 0 30 ${Array.from({ length: 18 }, (_, i) =>
                    `Q ${i * 10 + 5} ${20 + Math.sin(i * Math.PI) * 10 + noiseWave1}, ${i * 10 + 10} 30`
                  ).join(' ')}`}
                  fill="none"
                  stroke={colors.signal}
                  strokeWidth={3}
                />
                {/* Wire 2 (signal -) */}
                <path
                  d={`M 0 50 ${Array.from({ length: 18 }, (_, i) =>
                    `Q ${i * 10 + 5} ${60 - Math.sin(i * Math.PI) * 10 + noiseWave1}, ${i * 10 + 10} 50`
                  ).join(' ')}`}
                  fill="none"
                  stroke={colors.twistedPair}
                  strokeWidth={3}
                />
                <text x={90} y={90} textAnchor="middle" fill={colors.twistedPair} fontSize={9}>
                  Twisted: noise cancels!
                </text>
              </g>
            ) : (
              // Straight wires
              <g>
                <path
                  d={`M 0 30 ${Array.from({ length: 18 }, (_, i) =>
                    `L ${i * 10 + 10} ${30 + Math.sin((i + waveOffset) * 0.5) * noiseWave1}`
                  ).join(' ')}`}
                  fill="none"
                  stroke={colors.signal}
                  strokeWidth={3}
                />
                <path
                  d={`M 0 50 ${Array.from({ length: 18 }, (_, i) =>
                    `L ${i * 10 + 10} ${50 + Math.sin((i + waveOffset) * 0.5) * noiseWave2}`
                  ).join(' ')}`}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth={3}
                />
                {cable.shielding === 0 && (
                  <text x={90} y={90} textAnchor="middle" fill={colors.error} fontSize={9}>
                    Unshielded: vulnerable!
                  </text>
                )}
              </g>
            )}
          </g>

          {/* Signal quality display */}
          <rect x={30} y={220} width={340} height={110} rx={8} fill="rgba(0,0,0,0.3)" />

          {/* Clean signal */}
          <text x={50} y={242} fill={colors.textSecondary} fontSize={10}>Clean Signal:</text>
          <path
            d={`M 140 238 ${Array.from({ length: 20 }, (_, i) =>
              `L ${140 + i * 10} ${238 + Math.sin(i * 0.8 + waveOffset * 0.1) * 8}`
            ).join(' ')}`}
            fill="none"
            stroke={colors.signal}
            strokeWidth={2}
          />

          {/* Received signal with noise */}
          <text x={50} y={272} fill={colors.textSecondary} fontSize={10}>Received:</text>
          <path
            d={`M 140 268 ${Array.from({ length: 20 }, (_, i) => {
              const clean = Math.sin(i * 0.8 + waveOffset * 0.1) * 8;
              const noise = (Math.random() - 0.5) * effectiveNoise * 0.3;
              return `L ${140 + i * 10} ${268 + clean + noise}`;
            }).join(' ')}`}
            fill="none"
            stroke={signalIntegrity > 70 ? colors.success : signalIntegrity > 40 ? colors.warning : colors.error}
            strokeWidth={2}
          />

          {/* Metrics */}
          <text x={50} y={300} fill={colors.textMuted} fontSize={10}>Signal Integrity:</text>
          <text x={160} y={300} fill={signalIntegrity > 70 ? colors.success : signalIntegrity > 40 ? colors.warning : colors.error} fontSize={12} fontWeight="bold">
            {signalIntegrity.toFixed(0)}%
          </text>

          <text x={220} y={300} fill={colors.textMuted} fontSize={10}>Noise Level:</text>
          <text x={310} y={300} fill={colors.error} fontSize={12} fontWeight="bold">
            {effectiveNoise.toFixed(1)}
          </text>

          <text x={50} y={320} fill={colors.textMuted} fontSize={10}>Radiated EMI:</text>
          <text x={160} y={320} fill={colors.warning} fontSize={12} fontWeight="bold">
            {radiatedEMI.toFixed(1)} (arbitrary)
          </text>

          <text x={220} y={320} fill={colors.textMuted} fontSize={10}>Twist Cancellation:</text>
          <text x={345} y={320} fill={colors.twistedPair} fontSize={12} fontWeight="bold">
            {twistCancellation}%
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <div style={{ background: colors.bgCard, padding: '8px 12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ color: colors.textMuted, fontSize: '9px' }}>SHIELDING</div>
              <div style={{ color: colors.shield, fontSize: '14px', fontWeight: 'bold' }}>{cable.shielding}%</div>
            </div>
            <div style={{ background: colors.bgCard, padding: '8px 12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ color: colors.textMuted, fontSize: '9px' }}>TWISTING</div>
              <div style={{ color: cable.twisting ? colors.twistedPair : colors.error, fontSize: '14px', fontWeight: 'bold' }}>
                {cable.twisting ? 'Yes' : 'No'}
              </div>
            </div>
            <div style={{ background: colors.bgCard, padding: '8px 12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ color: colors.textMuted, fontSize: '9px' }}>INTEGRITY</div>
              <div style={{ color: signalIntegrity > 70 ? colors.success : colors.error, fontSize: '14px', fontWeight: 'bold' }}>
                {signalIntegrity.toFixed(0)}%
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Cable Type: {cable.name}
        </label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {cableTypes.map((c, i) => (
            <button
              key={c.name}
              onClick={() => setCableTypeIndex(i)}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: cableTypeIndex === i ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: cableTypeIndex === i ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '10px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {c.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Signal Frequency: {signalFrequency} MHz
        </label>
        <input
          type="range"
          min="10"
          max="1000"
          step="10"
          value={signalFrequency}
          onChange={(e) => setSignalFrequency(parseInt(e.target.value))}
          style={{ width: '100%', WebkitTapHighlightColor: 'transparent' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '10px' }}>
          <span>10 MHz (Ethernet)</span>
          <span>1000 MHz (High-speed)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Noise Source Strength: {noiseSource}
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={noiseSource}
          onChange={(e) => setNoiseSource(parseInt(e.target.value))}
          style={{ width: '100%', WebkitTapHighlightColor: 'transparent' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Cable Length: {cableLength} meters
        </label>
        <input
          type="range"
          min="1"
          max="100"
          step="1"
          value={cableLength}
          onChange={(e) => setCableLength(parseInt(e.target.value))}
          style={{ width: '100%', WebkitTapHighlightColor: 'transparent' }}
        />
      </div>

      <div style={{
        background: 'rgba(236, 72, 153, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
          EMI Physics:
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '11px' }}>
          <div>Shielding blocks external fields from reaching conductors</div>
          <div style={{ marginTop: '4px' }}>Twisting causes noise to induce equal opposite voltages that cancel</div>
          <div style={{ marginTop: '4px' }}>Higher frequencies radiate more (cable acts as antenna)</div>
          <div style={{ marginTop: '4px' }}>Longer cables = more antenna surface = more susceptibility</div>
        </div>
      </div>
    </div>
  );

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 1000,
    }}>
      <button
        onClick={onPhaseComplete}
        disabled={disabled && !canProceed}
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
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>*</div>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Electromagnetic Interference (EMI)
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Why do data centers have shielded cables?
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
                Every wire carrying current creates electromagnetic fields. And every wire
                can pick up fields from nearby sources. This crosstalk and interference
                can corrupt data - unless cables are designed to fight back.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                Understanding EMI is crucial for reliable high-speed networking.
              </p>
            </div>

            <div style={{
              background: 'rgba(236, 72, 153, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try different cable types to see how shielding and twisting protect signals!
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

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Scenario:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A data center runs network cables alongside power cables carrying high currents.
              The network administrator insists on using shielded cables even though they cost
              more. The facilities team asks why regular cables would not work.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What is the primary purpose of cable shielding?
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
                    background: prediction === p.id ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore EMI Protection</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust cable type and noise levels to see protection in action
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
              <li>Compare unshielded single wire vs twisted pair at high noise</li>
              <li>Increase frequency to 1000 MHz - watch radiated EMI rise</li>
              <li>Test STP (shielded twisted pair) - best of both protections</li>
              <li>Extend cable to 100m - longer = more noise pickup</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'emi';

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
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Shielding prevents external EM fields from inducing noise on signal conductors!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of EMI</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>How EMI Happens:</strong>
              </p>
              <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
                <li><strong>Induction:</strong> Changing magnetic fields from nearby currents induce voltages</li>
                <li><strong>Capacitive Coupling:</strong> Electric fields from nearby voltages transfer charge</li>
                <li><strong>Radiation:</strong> EM waves from RF sources couple into wires acting as antennas</li>
              </ul>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Shielding Works By:</strong> The metal shield intercepts
                external fields. Induced currents flow in the shield instead of the signal conductors,
                then drain to ground.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Grounding is Critical:</strong> A shield that is not
                properly grounded can actually make EMI worse by acting as an antenna!
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              Why are the wire pairs in Ethernet cables twisted?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Scenario:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Ethernet cables use twisted pairs - two wires wound around each other. This
              was invented by Alexander Graham Bell in 1881! But why does twisting wires
              together help with noise rejection?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does twisting protect against noise?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Twisted Pair Cancellation</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare twisted vs untwisted wires under high noise
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: 'rgba(34, 197, 94, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.twistedPair}`,
          }}>
            <h4 style={{ color: colors.twistedPair, marginBottom: '8px' }}>Differential Signaling Magic:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Data is sent as the DIFFERENCE between the two wires. When noise hits both wires
              equally (common mode), the difference is unchanged! The twist ensures both wires
              are equally exposed to any noise source. The receiver subtracts one wire from
              the other, canceling the common noise and revealing the signal.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'cancellation';

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
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Twisting ensures both wires pick up equal noise, which cancels in differential signaling!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why Twisting Works</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>The Key Insight:</strong> If one wire was always
                closer to a noise source, it would pick up more noise. Twisting averages out
                the exposure - each wire spends equal time near and far from any external source.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Different Twist Rates:</strong> In Cat6 cables,
                each pair has a different twist rate! This prevents crosstalk between pairs
                in the same cable - they do not line up and couple to each other.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>High-Speed Bonus:</strong> As frequencies increase,
                tighter twists are needed. Cat6a has much tighter twists than Cat5e, enabling
                10Gbps vs 1Gbps over the same 100m distance.
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
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              How EMI protection shapes infrastructure design
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
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Completed</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
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
                {testScore >= 7 ? 'You understand EMI shielding physics!' : 'Review the material and try again.'}
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
          {renderBottomBar(false, testScore >= 7, testScore >= 7 ? 'Complete Mastery' : 'Review and Retry')}
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
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
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
                    background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
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
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>*</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You understand EMI shielding physics
            </p>
          </div>

          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>EMI from induction, capacitive coupling, and radiation</li>
              <li>Shielding blocks external fields from reaching conductors</li>
              <li>Twisted pairs enable common-mode noise cancellation</li>
              <li>Differential signaling rejects noise present on both wires</li>
              <li>Higher frequencies radiate more and need better protection</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(236, 72, 153, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              EMI compliance is a legal requirement - the FCC, CE, and other bodies set limits
              on how much radiation devices can emit. Engineers use spectrum analyzers, EMI
              chambers, and near-field probes to find and fix noise sources. Design techniques
              include proper grounding, decoupling capacitors, spread-spectrum clocking, and
              careful PCB layout. A single trace acting as an antenna can fail a product!
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

export default EMIShieldingRenderer;
