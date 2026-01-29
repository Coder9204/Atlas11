'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface HDDPhysicsRendererProps {
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
  accent: '#f97316',
  accentGlow: 'rgba(249, 115, 22, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  platter: '#475569',
  platterShine: '#64748b',
  head: '#94a3b8',
  arm: '#374151',
  ssd: '#22c55e',
};

// Drive specifications
const driveTypes = [
  { name: '5400 RPM (Laptop)', rpm: 5400, seekTime: 12, throughput: 100 },
  { name: '7200 RPM (Desktop)', rpm: 7200, seekTime: 9, throughput: 150 },
  { name: '10000 RPM (Enterprise)', rpm: 10000, seekTime: 6, throughput: 200 },
  { name: '15000 RPM (High Performance)', rpm: 15000, seekTime: 4, throughput: 250 },
];

const HDDPhysicsRenderer: React.FC<HDDPhysicsRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [driveTypeIndex, setDriveTypeIndex] = useState(1);
  const [isSequential, setIsSequential] = useState(true);
  const [headPosition, setHeadPosition] = useState(50); // 0-100 representing track position
  const [targetPosition, setTargetPosition] = useState(50);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [dataTransferred, setDataTransferred] = useState(0);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [flyHeight, setFlyHeight] = useState(10); // nanometers

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Calculate drive metrics
  const drive = driveTypes[driveTypeIndex];
  const rotationLatency = (60 / drive.rpm) * 1000 / 2; // Average is half rotation in ms
  const effectiveSeekTime = isSequential ? 1 : drive.seekTime;
  const totalAccessTime = effectiveSeekTime + rotationLatency;
  const randomIOPS = 1000 / totalAccessTime;
  const sequentialIOPS = 1000 / (0.5 + rotationLatency / 4); // Much faster for sequential

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => prev + 1);
      setRotationAngle(prev => (prev + drive.rpm / 60 * 6) % 360); // Degrees per frame at 100fps

      // Move head towards target
      if (Math.abs(headPosition - targetPosition) > 1) {
        const direction = targetPosition > headPosition ? 1 : -1;
        setHeadPosition(prev => prev + direction * 2);
      }
    }, 10);
    return () => clearInterval(interval);
  }, [drive.rpm, headPosition, targetPosition]);

  const predictions = [
    { id: 'same', label: 'Same speed - both move data electronically' },
    { id: 'hdd_faster', label: 'HDDs are faster - they have more storage density' },
    { id: 'ssd_faster', label: 'SSDs are faster - no mechanical parts to move' },
    { id: 'depends', label: 'Depends on the data size only' },
  ];

  const twistPredictions = [
    { id: 'safe', label: 'HDDs are rugged and can handle physical contact' },
    { id: 'slow', label: 'Physical contact just makes them slower' },
    { id: 'crash', label: 'Head crashes from contact can destroy data instantly' },
    { id: 'automatic', label: 'Drives automatically prevent any contact' },
  ];

  const transferApplications = [
    {
      title: 'Database Performance',
      description: 'Why do database servers use SSDs even though HDDs cost less per gigabyte?',
      answer: 'Databases perform many random reads (looking up records). HDDs get ~100 random IOPS due to seek/rotation. SSDs get 50,000-500,000 IOPS! For transaction processing, SSD performance advantage is 500x-5000x, justifying the cost.',
    },
    {
      title: 'Video Editing Storage',
      description: 'Video editors often use HDDs for storage but SSDs for active projects. Why?',
      answer: 'Video is sequential data - HDD sequential reads (~150MB/s) are acceptable. But editing requires random access to clips. SSDs handle random access for smooth scrubbing. Finished projects archive to cheaper HDDs.',
    },
    {
      title: 'Data Center Reliability',
      description: 'Google found that HDD failure rates spike when drives are moved or bumped. Why?',
      answer: 'Head fly height is only 3-10 nanometers - thinner than smoke particles! Vibration or shock can cause head strikes. Google designs server racks to minimize vibration. Some use helium-filled drives (less turbulence).',
    },
    {
      title: 'Laptop HDD Parking',
      description: 'Modern laptops with HDDs use accelerometers to protect drives. How does this work?',
      answer: 'When sudden movement is detected, the head "parks" - moves to a safe zone off the platters in milliseconds. This prevents head crash from drops. SSDs have no such vulnerability - another reason laptops now use SSDs.',
    },
  ];

  const testQuestions = [
    {
      question: 'What limits HDD random read performance?',
      options: [
        { text: 'Electronic transfer speed', correct: false },
        { text: 'Seek time and rotational latency', correct: true },
        { text: 'Cable bandwidth', correct: false },
        { text: 'CPU processing speed', correct: false },
      ],
    },
    {
      question: 'Average rotational latency for a 7200 RPM drive is approximately:',
      options: [
        { text: '0.4 ms', correct: false },
        { text: '4 ms', correct: true },
        { text: '40 ms', correct: false },
        { text: '400 ms', correct: false },
      ],
    },
    {
      question: 'Why are SSDs faster than HDDs for random access?',
      options: [
        { text: 'SSDs have faster spinning platters', correct: false },
        { text: 'SSDs have no moving parts - pure electronic access', correct: true },
        { text: 'SSDs use better cables', correct: false },
        { text: 'SSDs have larger caches only', correct: false },
      ],
    },
    {
      question: 'The head fly height in modern HDDs is approximately:',
      options: [
        { text: '1 millimeter', correct: false },
        { text: '1 micrometer (1000 nm)', correct: false },
        { text: '3-10 nanometers', correct: true },
        { text: '1 meter when accounting for scale', correct: false },
      ],
    },
    {
      question: 'A head crash in an HDD is caused by:',
      options: [
        { text: 'Electrical short circuit', correct: false },
        { text: 'Physical contact between head and platter', correct: true },
        { text: 'Overheating of the motor', correct: false },
        { text: 'Software malfunction', correct: false },
      ],
    },
    {
      question: 'Sequential HDD performance is much better than random because:',
      options: [
        { text: 'Data is compressed for sequential reads', correct: false },
        { text: 'No seek time needed - data is in order on the track', correct: true },
        { text: 'The CPU processes sequential data faster', correct: false },
        { text: 'Cables work better with sequential data', correct: false },
      ],
    },
    {
      question: 'Higher RPM drives have lower latency because:',
      options: [
        { text: 'They use better motors', correct: false },
        { text: 'The platter reaches the desired sector faster', correct: true },
        { text: 'They have more platters', correct: false },
        { text: 'They generate more magnetism', correct: false },
      ],
    },
    {
      question: 'IOPS (Input/Output Operations Per Second) is limited in HDDs to approximately:',
      options: [
        { text: '50-200 for random access', correct: true },
        { text: '5,000-10,000 for random access', correct: false },
        { text: '100,000+ for random access', correct: false },
        { text: '1 million for random access', correct: false },
      ],
    },
    {
      question: 'Why do some enterprise HDDs use helium filling?',
      options: [
        { text: 'Helium makes the drive lighter', correct: false },
        { text: 'Less air turbulence allows closer tracks and lower fly height', correct: true },
        { text: 'Helium conducts electricity better', correct: false },
        { text: 'Helium prevents rust', correct: false },
      ],
    },
    {
      question: 'Laptop accelerometer-based HDD protection works by:',
      options: [
        { text: 'Spinning the drive faster during drops', correct: false },
        { text: 'Parking the head to a safe zone when motion is detected', correct: true },
        { text: 'Switching to SSD mode temporarily', correct: false },
        { text: 'Applying more power to the head', correct: false },
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

  const startRandomRead = () => {
    setTargetPosition(Math.random() * 80 + 10);
    setIsReading(true);
    setDataTransferred(0);
    setTimeout(() => {
      setIsReading(false);
      setDataTransferred(4096);
    }, totalAccessTime * 10);
  };

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 350;
    const centerX = 160;
    const centerY = 170;
    const platterRadius = 100;

    // Calculate head arm position
    const armAngle = -30 + (headPosition / 100) * 60;
    const headX = centerX + (platterRadius - 20 + headPosition * 0.5) * Math.cos((armAngle - 90) * Math.PI / 180);
    const headY = centerY + (platterRadius - 20 + headPosition * 0.5) * Math.sin((armAngle - 90) * Math.PI / 180);

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
            <linearGradient id="platterGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="70%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
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
            Hard Drive Read Physics
          </text>
          <text x={200} y={38} textAnchor="middle" fill={colors.textSecondary} fontSize={11}>
            {drive.name} - {drive.rpm} RPM
          </text>

          {/* Drive casing */}
          <rect x={40} y={60} width={240} height={220} rx={12} fill="#1f2937" stroke="#374151" strokeWidth={2} />

          {/* Platter stack visualization */}
          <g transform={`rotate(${rotationAngle}, ${centerX}, ${centerY})`}>
            {/* Main platter */}
            <ellipse cx={centerX} cy={centerY} rx={platterRadius} ry={platterRadius * 0.9} fill="url(#platterGrad)" />

            {/* Track circles */}
            {[0.2, 0.4, 0.6, 0.8].map((r, i) => (
              <ellipse
                key={i}
                cx={centerX}
                cy={centerY}
                rx={platterRadius * r}
                ry={platterRadius * r * 0.9}
                fill="none"
                stroke="#334155"
                strokeWidth={0.5}
              />
            ))}

            {/* Data sectors (visual representation) */}
            {Array.from({ length: 12 }).map((_, i) => (
              <line
                key={i}
                x1={centerX}
                y1={centerY}
                x2={centerX + platterRadius * Math.cos(i * 30 * Math.PI / 180)}
                y2={centerY + platterRadius * 0.9 * Math.sin(i * 30 * Math.PI / 180)}
                stroke="#334155"
                strokeWidth={0.5}
                opacity={0.5}
              />
            ))}

            {/* Spindle */}
            <circle cx={centerX} cy={centerY} r={15} fill="#1f2937" stroke="#475569" strokeWidth={2} />
          </g>

          {/* Head arm */}
          <g>
            <line
              x1={280}
              y1={180}
              x2={headX}
              y2={headY}
              stroke={colors.arm}
              strokeWidth={8}
              strokeLinecap="round"
            />
            {/* Arm pivot */}
            <circle cx={280} cy={180} r={12} fill="#1f2937" stroke={colors.arm} strokeWidth={3} />

            {/* Read/write head */}
            <g transform={`translate(${headX}, ${headY})`}>
              <rect x={-10} y={-5} width={20} height={10} rx={2} fill={colors.head} />
              {isReading && (
                <circle r={8} fill={colors.accent} opacity={0.6} filter="url(#glow)">
                  <animate attributeName="opacity" values="0.3;0.8;0.3" dur="0.2s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          </g>

          {/* Fly height visualization */}
          <g transform={`translate(${headX}, ${headY + 20})`}>
            <line x1={0} y1={0} x2={0} y2={15} stroke={colors.warning} strokeWidth={1} strokeDasharray="2,2" />
            <text x={5} y={12} fill={colors.warning} fontSize={8}>{flyHeight}nm gap</text>
          </g>

          {/* Performance metrics panel */}
          <rect x={290} y={60} width={100} height={160} rx={8} fill="rgba(0,0,0,0.3)" />
          <text x={340} y={80} textAnchor="middle" fill={colors.textPrimary} fontSize={10} fontWeight="bold">Metrics</text>

          <text x={300} y={100} fill={colors.textMuted} fontSize={9}>Seek Time:</text>
          <text x={380} y={100} textAnchor="end" fill={colors.accent} fontSize={9}>{effectiveSeekTime.toFixed(1)} ms</text>

          <text x={300} y={118} fill={colors.textMuted} fontSize={9}>Rotation Latency:</text>
          <text x={380} y={118} textAnchor="end" fill={colors.accent} fontSize={9}>{rotationLatency.toFixed(1)} ms</text>

          <text x={300} y={136} fill={colors.textMuted} fontSize={9}>Total Access:</text>
          <text x={380} y={136} textAnchor="end" fill={colors.warning} fontSize={9}>{totalAccessTime.toFixed(1)} ms</text>

          <text x={300} y={160} fill={colors.textMuted} fontSize={9}>Random IOPS:</text>
          <text x={380} y={160} textAnchor="end" fill={colors.success} fontSize={9}>{randomIOPS.toFixed(0)}</text>

          <text x={300} y={178} fill={colors.textMuted} fontSize={9}>Sequential:</text>
          <text x={380} y={178} textAnchor="end" fill={colors.success} fontSize={9}>{drive.throughput} MB/s</text>

          <text x={300} y={200} fill={colors.textMuted} fontSize={9}>Access Type:</text>
          <text x={380} y={200} textAnchor="end" fill={isSequential ? colors.success : colors.error} fontSize={9}>
            {isSequential ? 'Sequential' : 'Random'}
          </text>

          {/* SSD comparison */}
          <rect x={40} y={290} width={350} height={50} rx={8} fill="rgba(34, 197, 94, 0.1)" />
          <text x={60} y={310} fill={colors.ssd} fontSize={11} fontWeight="bold">SSD Comparison:</text>
          <text x={60} y={328} fill={colors.textSecondary} fontSize={10}>
            Random: ~0.1ms access | IOPS: 50,000-500,000 | No moving parts!
          </text>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <div style={{ background: colors.bgCard, padding: '8px 12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ color: colors.textMuted, fontSize: '9px' }}>HDD IOPS</div>
              <div style={{ color: colors.warning, fontSize: '16px', fontWeight: 'bold' }}>{randomIOPS.toFixed(0)}</div>
            </div>
            <div style={{ background: colors.bgCard, padding: '8px 12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ color: colors.textMuted, fontSize: '9px' }}>SSD IOPS</div>
              <div style={{ color: colors.ssd, fontSize: '16px', fontWeight: 'bold' }}>100,000+</div>
            </div>
            <div style={{ background: colors.bgCard, padding: '8px 12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ color: colors.textMuted, fontSize: '9px' }}>ADVANTAGE</div>
              <div style={{ color: colors.success, fontSize: '16px', fontWeight: 'bold' }}>{Math.round(100000 / randomIOPS)}x</div>
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
          Drive Type: {drive.name}
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {driveTypes.map((d, i) => (
            <button
              key={d.name}
              onClick={() => setDriveTypeIndex(i)}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: driveTypeIndex === i ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                background: driveTypeIndex === i ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '10px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {d.rpm} RPM
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <button
          onClick={() => setIsSequential(true)}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: isSequential ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.2)',
            background: isSequential ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
            color: colors.textPrimary,
            cursor: 'pointer',
            fontSize: '13px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Sequential Read
        </button>
        <button
          onClick={() => setIsSequential(false)}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            border: !isSequential ? `2px solid ${colors.error}` : '1px solid rgba(255,255,255,0.2)',
            background: !isSequential ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
            color: colors.textPrimary,
            cursor: 'pointer',
            fontSize: '13px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Random Read
        </button>
      </div>

      <button
        onClick={startRandomRead}
        disabled={isReading}
        style={{
          padding: '12px',
          borderRadius: '8px',
          border: 'none',
          background: isReading ? colors.textMuted : colors.accent,
          color: 'white',
          fontWeight: 'bold',
          cursor: isReading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {isReading ? 'Reading...' : 'Trigger Read Operation'}
      </button>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Head Fly Height: {flyHeight} nm (Danger zone below 5nm!)
        </label>
        <input
          type="range"
          min="1"
          max="20"
          step="1"
          value={flyHeight}
          onChange={(e) => setFlyHeight(parseInt(e.target.value))}
          style={{ width: '100%', WebkitTapHighlightColor: 'transparent' }}
        />
        {flyHeight < 5 && (
          <div style={{ color: colors.error, fontSize: '12px', marginTop: '4px' }}>
            WARNING: High risk of head crash at this height!
          </div>
        )}
      </div>

      <div style={{
        background: 'rgba(249, 115, 22, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
          Performance Equations:
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '11px', fontFamily: 'monospace' }}>
          <div>Rotation Latency = (60s / {drive.rpm}RPM) / 2 = {rotationLatency.toFixed(1)}ms avg</div>
          <div style={{ marginTop: '4px' }}>Total Access = Seek + Rotation = {effectiveSeekTime.toFixed(1)} + {rotationLatency.toFixed(1)} = {totalAccessTime.toFixed(1)}ms</div>
          <div style={{ marginTop: '4px' }}>Random IOPS = 1000ms / {totalAccessTime.toFixed(1)}ms = {randomIOPS.toFixed(0)}</div>
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
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>0</div>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Hard Drive Read Physics
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Why are SSDs faster than spinning hard drives?
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
                Inside every traditional hard drive, magnetic platters spin at thousands of
                RPM while a read/write head floats just nanometers above the surface. This
                mechanical dance has fundamental speed limits that electronics can overcome.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                Understanding these limits explains why data centers are switching to SSDs.
              </p>
            </div>

            <div style={{
              background: 'rgba(249, 115, 22, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try different drive speeds and access patterns to see the performance impact!
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
              A database server needs to look up thousands of small records scattered across
              a storage drive. Each lookup is for a different random location. You need to
              choose between an HDD and an SSD for this workload.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              Which will be faster for random access?
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
                    background: prediction === p.id ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
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
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore HDD Mechanics</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust drive speed and access patterns to understand performance
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
              <li>Compare 5400 RPM vs 15000 RPM - see latency cut in half!</li>
              <li>Switch between Sequential and Random - watch IOPS plummet</li>
              <li>Trigger reads and watch the head move to different tracks</li>
              <li>Note: Even fastest HDD gets ~200 IOPS vs SSD 100,000+</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'ssd_faster';

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
              SSDs are 500-1000x faster for random access - no mechanical movement required!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of HDD Performance</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Two Mechanical Delays:</strong>
              </p>
              <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
                <li><strong>Seek Time:</strong> Moving the head arm to the correct track (4-12ms)</li>
                <li><strong>Rotational Latency:</strong> Waiting for the sector to spin under head (2-8ms avg)</li>
              </ul>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>The IOPS Limit:</strong> Each random access requires
                seek + rotation. At 10ms total, you can only do 100 operations per second!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>SSD Advantage:</strong> Flash memory has no moving
                parts. Access time is ~0.1ms. This means 10,000+ operations in the same time an HDD does 100.
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
              What happens when the head touches the platter?
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
              The read/write head flies just 3-10 nanometers above the spinning platter surface.
              Thats 1/10,000th the width of a human hair! What happens if something causes the
              head to contact the platter surface?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What is the consequence of head-platter contact?
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
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Head Crash Physics</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Explore the dangerous world of nanometer-scale tolerances
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.error}`,
          }}>
            <h4 style={{ color: colors.error, marginBottom: '8px' }}>Head Crash Disaster:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              At 7200 RPM, the platter edge moves at ~120 km/h. When a head crashes, it
              gouges the magnetic surface, throwing debris across the platter. This debris
              causes more crashes - a cascade that can destroy the entire drive in milliseconds.
              Data recovery from crashed drives costs $500-$3000+ and may be impossible.
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'crash';

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
              Head crashes cause catastrophic, often unrecoverable data loss!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why Head Crashes Are Catastrophic</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Scale Comparison:</strong> If a hard drive platter
                were a football field, the head would fly at 1mm altitude. A speck of dust would
                be a boulder. A fingerprint would be a mountain range.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>The Crash Cascade:</strong> When the head touches
                the platter at 100+ km/h, it vaporizes the magnetic coating. Debris flies across the
                platter, causing more crashes until the drive is destroyed.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>SSDs Immunity:</strong> No moving parts means no
                head crash risk. This reliability is another major reason for SSD adoption in
                laptops and servers.
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
              How drive physics shapes storage decisions
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
                {testScore >= 7 ? 'You understand HDD read physics!' : 'Review the material and try again.'}
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
                    background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
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
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>0</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You understand hard drive read physics
            </p>
          </div>

          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Seek time + rotational latency limit HDD random IOPS</li>
              <li>Higher RPM reduces rotational latency proportionally</li>
              <li>SSDs eliminate mechanical delays with 100-1000x better IOPS</li>
              <li>Head flies 3-10nm above platter - crashes are catastrophic</li>
              <li>Sequential access bypasses seek time for much better throughput</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(249, 115, 22, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              HDDs still dominate bulk storage because they cost ~$15/TB vs SSDs at ~$80/TB.
              Modern data centers use tiered storage: hot data on NVMe SSDs (millions of IOPS),
              warm data on SATA SSDs, cold data on high-capacity HDDs. Some use shingled magnetic
              recording (SMR) drives that sacrifice random writes for 20%+ more capacity - perfect
              for archival workloads.
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

export default HDDPhysicsRenderer;
