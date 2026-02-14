'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// Phase type for internal state management
type HDDPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface HDDPhysicsRendererProps {
  gamePhase?: string; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#e2e8f0', // Changed from #94a3b8 for better contrast
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
  border: '#334155',
  primary: '#06b6d4',
};

// Drive specifications
const driveTypes = [
  { name: '5400 RPM (Laptop)', rpm: 5400, seekTime: 12, throughput: 100 },
  { name: '7200 RPM (Desktop)', rpm: 7200, seekTime: 9, throughput: 150 },
  { name: '10000 RPM (Enterprise)', rpm: 10000, seekTime: 6, throughput: 200 },
  { name: '15000 RPM (High Performance)', rpm: 15000, seekTime: 4, throughput: 250 },
];

const HDDPhysicsRenderer: React.FC<HDDPhysicsRendererProps> = ({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Phase order and labels for navigation
  const phaseOrder: HDDPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<HDDPhase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Head Crash',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  // Validate and get initial phase
  const getInitialPhase = (): HDDPhase => {
    if (gamePhase && phaseOrder.includes(gamePhase as HDDPhase)) {
      return gamePhase as HDDPhase;
    }
    return 'hook';
  };

  // Internal phase state management
  const [phase, setPhase] = useState<HDDPhase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as HDDPhase) && gamePhase !== phase) {
      setPhase(gamePhase as HDDPhase);
    }
  }, [gamePhase]);

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

  // Navigation state
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

  // Calculate drive metrics
  const drive = driveTypes[driveTypeIndex];
  const rotationLatency = (60 / drive.rpm) * 1000 / 2; // Average is half rotation in ms
  const effectiveSeekTime = isSequential ? 1 : drive.seekTime;
  const totalAccessTime = effectiveSeekTime + rotationLatency;
  const randomIOPS = 1000 / totalAccessTime;
  const sequentialIOPS = 1000 / (0.5 + rotationLatency / 4); // Much faster for sequential

  // Navigation functions
  const goToPhase = useCallback((p: HDDPhase) => {
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

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase]);

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
  }, [testAnswers, onCorrectAnswer, onIncorrectAnswer]);

  const startRandomRead = () => {
    setTargetPosition(Math.random() * 80 + 10);
    setIsReading(true);
    setDataTransferred(0);
    setTimeout(() => {
      setIsReading(false);
      setDataTransferred(4096);
    }, totalAccessTime * 10);
  };

  // Progress bar component
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '10px 12px' : '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: isMobile ? '8px' : '12px',
        flexWrap: 'wrap',
        minHeight: '44px'
      }}>
        {/* Back button */}
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          aria-label="Go back"
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: `1px solid ${colors.border}`,
            background: currentIdx > 0 ? colors.bgDark : 'transparent',
            color: currentIdx > 0 ? colors.textSecondary : colors.textMuted,
            cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
            opacity: currentIdx > 0 ? 1 : 0.4,
            fontSize: '12px',
            fontWeight: 600,
            minHeight: '44px'
          }}
        >
          Back
        </button>

        {/* Progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '6px' }} role="navigation" aria-label="Phase navigation">
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => i <= currentIdx && goToPhase(p)}
              aria-label={`${phaseLabels[p]} phase${i < currentIdx ? ' (completed)' : i === currentIdx ? ' (current)' : ''}`}
              aria-current={i === currentIdx ? 'step' : undefined}
              style={{
                height: isMobile ? '8px' : '10px',
                width: i === currentIdx ? (isMobile ? '16px' : '20px') : (isMobile ? '8px' : '10px'),
                borderRadius: '5px',
                backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : colors.border,
                cursor: i <= currentIdx ? 'pointer' : 'default',
                transition: 'all 0.3s ease',
                border: 'none',
                padding: 0,
                minWidth: isMobile ? '8px' : '10px'
              }}
              title={phaseLabels[p]}
            />
          ))}
        </div>

        {/* Progress count */}
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textSecondary }}>
          {currentIdx + 1}/{phaseOrder.length}
        </span>

        {/* Phase Label */}
        <div style={{
          padding: '4px 10px',
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
  const renderBottomBar = (canGoNext: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = currentIdx > 0;

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
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px' : '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: '12px',
        flexShrink: 0
      }}>
        {/* Back button */}
        <button
          onClick={goBack}
          disabled={!canBack}
          aria-label="Go back"
          style={{
            padding: isMobile ? '10px 16px' : '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: isMobile ? '13px' : '14px',
            backgroundColor: colors.bgDark,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '44px'
          }}
        >
          Back
        </button>

        {/* Phase indicator */}
        <span style={{
          fontSize: '12px',
          color: colors.textSecondary,
          fontWeight: 600
        }}>
          {phaseLabels[phase]}
        </span>

        {/* Next button */}
        <button
          onClick={handleNext}
          disabled={!canGoNext}
          aria-label={nextLabel}
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: isMobile ? '13px' : '14px',
            background: canGoNext ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.warning} 100%)` : colors.bgDark,
            color: canGoNext ? colors.textPrimary : colors.textSecondary,
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
        {/* Title labels moved outside SVG */}
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <div style={{ color: colors.textPrimary, fontSize: typo.bodyLarge, fontWeight: 'bold' }}>
            Hard Drive Read Physics
          </div>
          <div style={{ color: colors.textSecondary, fontSize: typo.small }}>
            {drive.name} - {drive.rpm} RPM
          </div>
        </div>

        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            {/* Premium metallic platter gradient with multiple color stops */}
            <radialGradient id="hddPlatterGrad" cx="35%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="20%" stopColor="#64748b" />
              <stop offset="45%" stopColor="#475569" />
              <stop offset="70%" stopColor="#334155" />
              <stop offset="90%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>

            {/* Platter surface reflection */}
            <linearGradient id="hddPlatterShine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
              <stop offset="30%" stopColor="#94a3b8" stopOpacity="0.08" />
              <stop offset="50%" stopColor="#64748b" stopOpacity="0.05" />
              <stop offset="70%" stopColor="#475569" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
            </linearGradient>

            {/* Drive casing brushed metal gradient */}
            <linearGradient id="hddCasingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="25%" stopColor="#1f2937" />
              <stop offset="50%" stopColor="#374151" />
              <stop offset="75%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* Head arm metallic gradient */}
            <linearGradient id="hddArmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6b7280" />
              <stop offset="25%" stopColor="#4b5563" />
              <stop offset="50%" stopColor="#6b7280" />
              <stop offset="75%" stopColor="#4b5563" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>

            {/* Read/write head gradient */}
            <linearGradient id="hddHeadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d1d5db" />
              <stop offset="30%" stopColor="#9ca3af" />
              <stop offset="60%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>

            {/* Spindle hub gradient */}
            <radialGradient id="hddSpindleGrad" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#4b5563" />
              <stop offset="40%" stopColor="#374151" />
              <stop offset="80%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#111827" />
            </radialGradient>

            {/* Data track gradient for visualization */}
            <linearGradient id="hddTrackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.6" />
            </linearGradient>

            {/* Active read glow gradient */}
            <radialGradient id="hddReadGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="1" />
              <stop offset="40%" stopColor="#fb923c" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#fdba74" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#fed7aa" stopOpacity="0" />
            </radialGradient>

            {/* Metrics panel background gradient */}
            <linearGradient id="hddMetricsBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#0f172a" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
            </linearGradient>

            {/* SSD comparison panel gradient */}
            <linearGradient id="hddSsdBg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#22c55e" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
            </linearGradient>

            {/* Glow filter for active reading */}
            <filter id="hddGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft glow for components */}
            <filter id="hddSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Inner shadow for depth */}
            <filter id="hddInnerShadow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Drop shadow for casing */}
            <filter id="hddDropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Drive casing with premium gradient and shadow */}
          <rect x={40} y={30} width={240} height={220} rx={12} fill="url(#hddCasingGrad)" stroke="#4b5563" strokeWidth={2} filter="url(#hddDropShadow)" />

          {/* Inner casing bevel */}
          <rect x={45} y={35} width={230} height={210} rx={10} fill="none" stroke="#1f2937" strokeWidth={1} />

          {/* Platter stack visualization with rotation */}
          <g transform={`rotate(${rotationAngle}, ${centerX}, ${centerY})`}>
            {/* Platter shadow/depth layer */}
            <ellipse cx={centerX + 2} cy={centerY + 3} rx={platterRadius} ry={platterRadius * 0.9} fill="#0f172a" opacity={0.5} />

            {/* Main platter with metallic gradient */}
            <ellipse cx={centerX} cy={centerY} rx={platterRadius} ry={platterRadius * 0.9} fill="url(#hddPlatterGrad)" />

            {/* Platter surface shine overlay */}
            <ellipse cx={centerX} cy={centerY} rx={platterRadius} ry={platterRadius * 0.9} fill="url(#hddPlatterShine)" />

            {/* Data tracks with subtle coloring */}
            {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((r, i) => (
              <ellipse
                key={i}
                cx={centerX}
                cy={centerY}
                rx={platterRadius * r}
                ry={platterRadius * r * 0.9}
                fill="none"
                stroke={i % 2 === 0 ? '#475569' : '#334155'}
                strokeWidth={i === Math.floor((headPosition / 100) * 5) ? 2 : 0.5}
                opacity={i === Math.floor((headPosition / 100) * 5) ? 0.8 : 0.4}
              />
            ))}

            {/* Data sectors visualization */}
            {Array.from({ length: 24 }).map((_, i) => (
              <line
                key={i}
                x1={centerX + 20 * Math.cos(i * 15 * Math.PI / 180)}
                y1={centerY + 20 * 0.9 * Math.sin(i * 15 * Math.PI / 180)}
                x2={centerX + platterRadius * Math.cos(i * 15 * Math.PI / 180)}
                y2={centerY + platterRadius * 0.9 * Math.sin(i * 15 * Math.PI / 180)}
                stroke="#334155"
                strokeWidth={0.3}
                opacity={0.3}
              />
            ))}

            {/* Animated data bits visualization */}
            {Array.from({ length: 8 }).map((_, i) => {
              const trackRadius = platterRadius * (0.3 + (i / 8) * 0.6);
              const bitAngle = (animationFrame * 2 + i * 45) % 360;
              return (
                <circle
                  key={`bit-${i}`}
                  cx={centerX + trackRadius * Math.cos(bitAngle * Math.PI / 180)}
                  cy={centerY + trackRadius * 0.9 * Math.sin(bitAngle * Math.PI / 180)}
                  r={2}
                  fill={colors.primary}
                  opacity={0.6}
                />
              );
            })}

            {/* Spindle hub with premium gradient */}
            <circle cx={centerX} cy={centerY} r={18} fill="url(#hddSpindleGrad)" stroke="#4b5563" strokeWidth={2} />
            <circle cx={centerX} cy={centerY} r={8} fill="#111827" stroke="#374151" strokeWidth={1} />
            {/* Spindle center dot */}
            <circle cx={centerX} cy={centerY} r={3} fill="#4b5563" />
          </g>

          {/* Head arm assembly */}
          <g>
            {/* Arm shadow */}
            <line
              x1={280}
              y1={145}
              x2={headX + 2}
              y2={headY + 2}
              stroke="#0f172a"
              strokeWidth={10}
              strokeLinecap="round"
              opacity={0.3}
            />

            {/* Main arm with metallic gradient */}
            <line
              x1={280}
              y1={142}
              x2={headX}
              y2={headY}
              stroke="url(#hddArmGrad)"
              strokeWidth={8}
              strokeLinecap="round"
            />

            {/* Arm edge highlight */}
            <line
              x1={280}
              y1={140}
              x2={headX}
              y2={headY - 2}
              stroke="#9ca3af"
              strokeWidth={1}
              strokeLinecap="round"
              opacity={0.5}
            />

            {/* Arm pivot mechanism */}
            <circle cx={280} cy={142} r={14} fill="url(#hddSpindleGrad)" stroke="#4b5563" strokeWidth={2} />
            <circle cx={280} cy={142} r={6} fill="#374151" stroke="#4b5563" strokeWidth={1} />

            {/* Read/write head assembly */}
            <g transform={`translate(${headX}, ${headY})`}>
              {/* Head slider body */}
              <rect x={-12} y={-6} width={24} height={12} rx={3} fill="url(#hddHeadGrad)" stroke="#6b7280" strokeWidth={1} />

              {/* Head coil detail */}
              <rect x={-8} y={-3} width={6} height={6} rx={1} fill="#ef4444" opacity={0.8} />

              {/* Read element */}
              <rect x={2} y={-2} width={4} height={4} rx={0.5} fill="#06b6d4" opacity={0.9} />

              {/* Active reading glow effect */}
              {isReading && (
                <>
                  <circle r={12} fill="url(#hddReadGlow)" filter="url(#hddGlow)">
                    <animate attributeName="opacity" values="0.4;0.9;0.4" dur="0.15s" repeatCount="indefinite" />
                  </circle>
                  <circle r={6} fill="#f97316" opacity={0.8}>
                    <animate attributeName="r" values="4;8;4" dur="0.2s" repeatCount="indefinite" />
                  </circle>
                </>
              )}
            </g>
          </g>

          {/* Fly height indicator */}
          <g transform={`translate(${headX}, ${headY + 18})`} data-fly-height={flyHeight}>
            <line x1={0} y1={0} x2={0} y2={flyHeight + 8} stroke={flyHeight < 5 ? colors.error : colors.warning} strokeWidth={1} strokeDasharray="3,2" />
            <circle cx={0} cy={flyHeight + 8} r={flyHeight < 5 ? 4 : 2} fill={flyHeight < 5 ? colors.error : colors.warning} />
            <text x={8} y={flyHeight + 12} fill={flyHeight < 5 ? colors.error : colors.textSecondary} fontSize="9">{flyHeight}nm</text>
          </g>

          {/* Performance metrics panel */}
          <rect x={290} y={30} width={100} height={190} rx={8} fill="url(#hddMetricsBg)" stroke="#374151" strokeWidth={1} />

          {/* Metrics content - minimal text in SVG */}
          <line x1={300} y1={50} x2={380} y2={50} stroke="#374151" strokeWidth={0.5} />

          {/* Metric bars visualization */}
          <g transform="translate(300, 60)">
            {/* Seek time bar */}
            <rect x={0} y={0} width={70 * (effectiveSeekTime / 15)} height={8} rx={2} fill={colors.accent} opacity={0.8} />

            {/* Rotation latency bar */}
            <rect x={0} y={22} width={70 * (rotationLatency / 10)} height={8} rx={2} fill={colors.accent} opacity={0.8} />

            {/* Total access bar */}
            <rect x={0} y={44} width={70 * Math.min(totalAccessTime / 20, 1)} height={8} rx={2} fill={colors.warning} opacity={0.8} />

            {/* IOPS indicator */}
            <rect x={0} y={66} width={70 * Math.min(randomIOPS / 250, 1)} height={8} rx={2} fill={colors.success} opacity={0.8} />

            {/* Sequential throughput */}
            <rect x={0} y={88} width={70 * (drive.throughput / 300)} height={8} rx={2} fill={colors.success} opacity={0.8} />

            {/* Access type indicator */}
            <rect x={0} y={110} width={70} height={8} rx={2} fill={isSequential ? colors.success : colors.error} opacity={0.6} />
          </g>

          {/* SSD comparison panel */}
          <rect x={40} y={258} width={350} height={45} rx={8} fill="url(#hddSsdBg)" stroke="#22c55e" strokeWidth={1} strokeOpacity={0.3} />

          {/* SSD indicator icon */}
          <rect x={50} y={268} width={24} height={16} rx={3} fill="#22c55e" opacity={0.8} />
          <rect x={54} y={271} width={4} height={10} rx={1} fill="#166534" />
          <rect x={60} y={271} width={4} height={10} rx={1} fill="#166534" />
          <rect x={66} y={271} width={4} height={10} rx={1} fill="#166534" />

          {/* SVG Text Labels for Legend and Components */}
          <text x={85} y={283} fill={colors.ssd} fontSize="11" fontWeight="bold">SSD Comparison</text>

          {/* Component labels */}
          <text x={centerX} y={centerY + platterRadius + 15} fill={colors.textSecondary} fontSize="10" textAnchor="middle">Magnetic Platter</text>
          <text x={280} y={125} fill={colors.textSecondary} fontSize="9" textAnchor="middle">Arm Pivot</text>
          <text x={headX + 25} y={headY - 10} fill={colors.textSecondary} fontSize="9">Read/Write Head</text>
          <text x={centerX} y={centerY + 5} fill={colors.textSecondary} fontSize="8" textAnchor="middle">Spindle</text>

          {/* Legend panel */}
          <g transform="translate(295, 35)" data-drive-rpm={drive.rpm} data-fly-height={flyHeight} data-sequential={isSequential}>
            <text x={0} y={10} fill={colors.textPrimary} fontSize="10" fontWeight="bold">Performance</text>
            <text x={0} y={28} fill={colors.textSecondary} fontSize="8">Seek: {effectiveSeekTime.toFixed(1)}ms</text>
            <text x={0} y={50} fill={colors.textSecondary} fontSize="8">Latency: {rotationLatency.toFixed(1)}ms</text>
            <text x={0} y={72} fill={colors.warning} fontSize="8">Total: {totalAccessTime.toFixed(1)}ms</text>
            <text x={0} y={94} fill={colors.success} fontSize="8">IOPS: {randomIOPS.toFixed(0)}</text>
            <text x={0} y={116} fill={colors.success} fontSize="8">Seq: {drive.throughput}MB/s</text>
            <text x={0} y={138} fill={isSequential ? colors.success : colors.error} fontSize="8">{isSequential ? 'Sequential' : 'Random'}</text>
            <text x={0} y={158} fill={colors.textSecondary} fontSize="8">RPM: {drive.rpm}</text>
            <text x={0} y={176} fill={flyHeight < 5 ? colors.error : colors.textSecondary} fontSize="8">Fly: {flyHeight}nm</text>
          </g>
        </svg>

        {/* Metrics labels moved outside SVG */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          width: '100%',
          maxWidth: '500px',
          padding: '0 8px'
        }}>
          <div style={{ background: colors.bgCard, padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ color: colors.textMuted, fontSize: typo.label }}>Seek Time</div>
            <div style={{ color: colors.accent, fontSize: typo.body, fontWeight: 'bold' }}>{effectiveSeekTime.toFixed(1)}ms</div>
          </div>
          <div style={{ background: colors.bgCard, padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ color: colors.textMuted, fontSize: typo.label }}>Rotation</div>
            <div style={{ color: colors.accent, fontSize: typo.body, fontWeight: 'bold' }}>{rotationLatency.toFixed(1)}ms</div>
          </div>
          <div style={{ background: colors.bgCard, padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ color: colors.textMuted, fontSize: typo.label }}>Total Access</div>
            <div style={{ color: colors.warning, fontSize: typo.body, fontWeight: 'bold' }}>{totalAccessTime.toFixed(1)}ms</div>
          </div>
          <div style={{ background: colors.bgCard, padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ color: colors.textMuted, fontSize: typo.label }}>Random IOPS</div>
            <div style={{ color: colors.success, fontSize: typo.body, fontWeight: 'bold' }}>{randomIOPS.toFixed(0)}</div>
          </div>
          <div style={{ background: colors.bgCard, padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ color: colors.textMuted, fontSize: typo.label }}>Sequential</div>
            <div style={{ color: colors.success, fontSize: typo.body, fontWeight: 'bold' }}>{drive.throughput}MB/s</div>
          </div>
          <div style={{ background: colors.bgCard, padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ color: colors.textMuted, fontSize: typo.label }}>Access Type</div>
            <div style={{ color: isSequential ? colors.success : colors.error, fontSize: typo.body, fontWeight: 'bold' }}>
              {isSequential ? 'Sequential' : 'Random'}
            </div>
          </div>
        </div>

        {/* Fly height warning */}
        {flyHeight < 5 && (
          <div style={{
            color: colors.error,
            fontSize: typo.small,
            padding: '8px 16px',
            background: 'rgba(239, 68, 68, 0.15)',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.error}`
          }}>
            WARNING: Head fly height {flyHeight}nm - High crash risk!
          </div>
        )}

        {/* SSD comparison labels */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 16px',
          background: 'rgba(34, 197, 94, 0.1)',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '500px'
        }}>
          <div style={{ color: colors.ssd, fontSize: typo.body, fontWeight: 'bold' }}>SSD:</div>
          <div style={{ color: colors.textSecondary, fontSize: typo.small }}>
            ~0.1ms access | 50K-500K IOPS | No moving parts
          </div>
        </div>

        {interactive && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <div style={{ background: colors.bgCard, padding: '8px 12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ color: colors.textMuted, fontSize: typo.label }}>HDD IOPS</div>
              <div style={{ color: colors.warning, fontSize: typo.bodyLarge, fontWeight: 'bold' }}>{randomIOPS.toFixed(0)}</div>
            </div>
            <div style={{ background: colors.bgCard, padding: '8px 12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ color: colors.textMuted, fontSize: typo.label }}>SSD IOPS</div>
              <div style={{ color: colors.ssd, fontSize: typo.bodyLarge, fontWeight: 'bold' }}>100,000+</div>
            </div>
            <div style={{ background: colors.bgCard, padding: '8px 12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ color: colors.textMuted, fontSize: typo.label }}>ADVANTAGE</div>
              <div style={{ color: colors.success, fontSize: typo.bodyLarge, fontWeight: 'bold' }}>{Math.round(100000 / randomIOPS)}x</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }} data-controls-panel>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 400 }}>
          Drive Type: <span data-drive-label style={{ fontWeight: 700 }}>{drive.name}</span>
        </label>
        <div style={{
          background: colors.bgCard,
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>Current RPM:</span>
            <span data-current-rpm style={{ color: colors.accent, fontSize: '20px', fontWeight: 700 }}>{drive.rpm}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400 }}>Seek Time:</span>
            <span data-seek-time style={{ color: colors.warning, fontSize: '16px', fontWeight: 700 }}>{effectiveSeekTime.toFixed(1)}ms</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400 }}>Rotation Latency:</span>
            <span data-rotation-latency style={{ color: colors.warning, fontSize: '16px', fontWeight: 700 }}>{rotationLatency.toFixed(1)}ms</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400 }}>Random IOPS:</span>
            <span data-random-iops style={{ color: colors.success, fontSize: '16px', fontWeight: 700 }}>{randomIOPS.toFixed(0)}</span>
          </div>
        </div>
        <input
          type="range"
          min="0"
          max={driveTypes.length - 1}
          step="1"
          value={driveTypeIndex}
          onChange={(e) => setDriveTypeIndex(parseInt(e.target.value))}
          aria-label="Drive speed slider"
          style={{
            width: '100%',
            marginBottom: '8px',
            WebkitTapHighlightColor: 'transparent',
            accentColor: colors.accent,
            cursor: 'pointer',
            height: '8px',
          }}
        />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
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
                minHeight: '44px',
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
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontWeight: 400 }}>
          Head Fly Height: <span style={{ fontWeight: 700 }}>{flyHeight} nm</span> (Danger zone below 5nm!)
        </label>
        <input
          type="range"
          min="1"
          max="20"
          step="1"
          value={flyHeight}
          onChange={(e) => setFlyHeight(parseInt(e.target.value))}
          aria-label="Fly height slider"
          style={{
            width: '100%',
            WebkitTapHighlightColor: 'transparent',
            accentColor: colors.accent,
            cursor: 'pointer',
            height: '8px',
          }}
        />
        {flyHeight < 5 && (
          <div style={{ color: colors.error, fontSize: '12px', marginTop: '4px', fontWeight: 400 }}>
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

  // Real-world applications for the transfer phase
  const realWorldApps = [
    {
      icon: "☁️",
      title: "Data Center Storage",
      short: "Cloud Infrastructure",
      tagline: "Massive scale storage for the digital world",
      description: "Hyperscale data centers operated by cloud providers store exabytes of data on millions of hard drives. While SSDs handle hot data requiring fast random access, HDDs remain the backbone for storing cold data, backups, and archives at a fraction of the cost. A single data center may contain over 100,000 HDDs spinning 24/7, each subject to the same physics we explored—seek time, rotational latency, and head crash risks.",
      connection: "Just like our simulation showed seek time and rotational latency limiting IOPS, data center architects must carefully choose between HDDs and SSDs based on workload characteristics. Hot data with random access patterns goes on SSDs, while sequential workloads like video streaming and backup archival leverage HDD's cost advantage where the mechanical delays matter less.",
      howItWorks: "Data centers use tiered storage architectures. The hot tier uses NVMe SSDs for databases and real-time analytics (millions of IOPS). The warm tier uses SATA SSDs for frequently accessed files. The cold tier uses high-capacity HDDs (20+ TB each) for archival, backups, and media libraries. Intelligent data migration policies automatically move data between tiers based on access patterns, optimizing the cost-performance tradeoff.",
      stats: [
        { val: "20+ TB", label: "Per enterprise HDD capacity" },
        { val: "$15/TB", label: "HDD cost vs $80/TB SSD" },
        { val: "100,000+", label: "HDDs per data center" }
      ],
      examples: [
        "AWS S3 Glacier deep archive storage",
        "Google Cloud Coldline for infrequent access",
        "Facebook/Meta photo and video archives",
        "Backblaze B2 cloud backup infrastructure"
      ],
      companies: ["Amazon AWS", "Google Cloud", "Microsoft Azure", "Backblaze", "Wasabi"],
      futureImpact: "Data center storage will increasingly adopt SMR (Shingled Magnetic Recording) drives that sacrifice random write performance for 20% higher density—perfect for archival workloads. Multi-actuator HDDs with two independent head assemblies will double sequential throughput. Meanwhile, DNA storage and holographic storage research aims to eventually replace magnetic media for ultra-cold archival with century-long retention.",
      color: "#3b82f6"
    },
    {
      icon: "🎥",
      title: "Video Surveillance Systems",
      short: "Security",
      tagline: "Always recording, always reliable",
      description: "Security camera systems worldwide rely on specialized surveillance HDDs to continuously record video 24/7/365. A single commercial building might have 32 cameras each streaming 4K video, requiring drives optimized for constant sequential writes rather than the random access patterns of consumer drives. These systems must balance storage capacity, write endurance, and the ability to simultaneously record new footage while playing back archived video.",
      connection: "Our simulation demonstrated how sequential access bypasses the seek time penalty. Surveillance HDDs exploit this—cameras write video frames in order to sequential sectors, achieving near-maximum throughput. The challenge comes during playback, when random seeks interrupt the write stream. Purpose-built surveillance drives use optimized firmware to handle this mixed workload.",
      howItWorks: "Surveillance-class HDDs like Western Digital Purple and Seagate SkyHawk are engineered differently from desktop drives. They use AllFrame technology to reduce frame drops during simultaneous read/write, support 64+ camera streams, and are rated for 24/7 operation with enhanced error recovery that prioritizes continuous recording over perfect data integrity. RAID configurations provide redundancy, and most systems overwrite oldest footage in a circular buffer.",
      stats: [
        { val: "180 TB/yr", label: "Write workload rating" },
        { val: "64+", label: "Simultaneous camera streams" },
        { val: "24/7/365", label: "Continuous operation design" }
      ],
      examples: [
        "City-wide traffic camera networks",
        "Casino surveillance with 1000+ cameras",
        "Airport security recording systems",
        "Retail loss prevention DVR systems"
      ],
      companies: ["Western Digital", "Seagate", "Hikvision", "Dahua", "Axis Communications"],
      futureImpact: "AI-powered video analytics will transform surveillance storage requirements. Instead of storing continuous footage, edge AI will process video locally and only store flagged events, dramatically reducing storage needs. However, higher resolution cameras (8K) and longer retention requirements will continue driving demand for high-capacity surveillance drives. Solid-state surveillance storage will gain share for critical installations where reliability trumps cost.",
      color: "#ef4444"
    },
    {
      icon: "🏢",
      title: "Enterprise NAS Systems",
      short: "Business",
      tagline: "Shared storage for the modern workplace",
      description: "Network Attached Storage (NAS) systems serve as the shared file servers for businesses of all sizes, from small offices to enterprise departments. These systems combine multiple HDDs in RAID arrays to provide both large capacity and data protection. Users access files over the network, with the NAS handling the complex task of striping data across drives, rebuilding failed drives, and optimizing access patterns for multiple simultaneous users.",
      connection: "Our HDD physics directly impacts NAS performance. When multiple users access different files simultaneously, the heads must seek between tracks constantly—the worst case for mechanical drives. Enterprise NAS systems use intelligent caching, SSD acceleration tiers, and RAID striping to mitigate these limitations. Understanding seek time and IOPS helps IT administrators properly size NAS systems for their workloads.",
      howItWorks: "Enterprise NAS systems use RAID (Redundant Array of Independent Disks) to combine multiple HDDs. RAID 5 stripes data with parity for single-drive fault tolerance. RAID 6 handles two simultaneous failures. Modern NAS systems add SSD caching—frequently accessed files are automatically promoted to fast flash storage while bulk data remains on HDDs. ZFS and Btrfs filesystems add checksumming to detect and repair bit rot.",
      stats: [
        { val: "100+ TB", label: "Typical enterprise NAS capacity" },
        { val: "10 GbE", label: "Network connection speed" },
        { val: "99.99%", label: "Uptime SLA requirement" }
      ],
      examples: [
        "Law firm document management systems",
        "Healthcare PACS medical imaging storage",
        "Media production shared project drives",
        "Engineering CAD file collaboration storage"
      ],
      companies: ["Synology", "QNAP", "NetApp", "Dell EMC", "HPE"],
      futureImpact: "NAS systems will increasingly adopt all-flash arrays for performance-critical workloads while HDDs remain for capacity-focused tiers. Hybrid cloud NAS will automatically tier cold data to public cloud storage. AI-powered predictive analytics will anticipate drive failures before they occur, scheduling proactive replacements during maintenance windows. NVMe-oF (NVMe over Fabrics) will enable SSD-like latency across network storage.",
      color: "#10b981"
    },
    {
      icon: "🔬",
      title: "HAMR Technology",
      short: "Next-Gen Storage",
      tagline: "Pushing magnetic storage to its limits",
      description: "Heat-Assisted Magnetic Recording (HAMR) represents the cutting edge of HDD technology, using lasers to momentarily heat the recording surface to 450°C during writes. This allows data to be written to ultra-stable magnetic media that would otherwise be impossible to magnetize at room temperature. HAMR drives are beginning to ship with 30+ TB capacities, with a roadmap to 100+ TB per drive—densities that seemed impossible just years ago.",
      connection: "Our simulation showed the fundamental physics of HDDs: spinning platters, seeking heads, and nanometer-scale fly heights. HAMR pushes these same physics to extremes. The head now includes a laser that fires during writes, the magnetic media uses new materials with higher coercivity, and the fly height has shrunk even further. The same mechanical limitations exist, but storage density has increased by orders of magnitude.",
      howItWorks: "HAMR uses a tiny laser integrated into the read/write head that heats a nanometer-scale spot on the disk surface to approximately 450°C for a few nanoseconds during writes. This temporarily reduces the coercivity (resistance to magnetization) of the FePt (iron-platinum) recording media, allowing the write head to flip the magnetic orientation. The spot instantly cools, locking in the data with exceptional stability. This enables bit densities exceeding 2 terabits per square inch.",
      stats: [
        { val: "30+ TB", label: "Current HAMR drive capacity" },
        { val: "100+ TB", label: "Roadmap target capacity" },
        { val: "450°C", label: "Laser heating temperature" }
      ],
      examples: [
        "Seagate Mozaic 3+ platform drives",
        "Hyperscale data center deployments",
        "Cold storage archive systems",
        "Exascale scientific data repositories"
      ],
      companies: ["Seagate", "Western Digital", "Toshiba", "HGST", "IBM Research"],
      futureImpact: "HAMR is just the beginning of next-generation magnetic recording. MAMR (Microwave-Assisted Magnetic Recording) uses microwaves instead of heat for similar density gains. Multi-actuator technology will combine with HAMR to improve throughput. Beyond 100TB drives, the industry is researching bit-patterned media and three-dimensional magnetic recording. HDDs will remain cost-competitive with flash for bulk storage well into the 2030s, with individual drives potentially reaching 200+ TB.",
      color: "#f59e0b"
    }
  ];

  // Main render with wrapper
  const renderContent = () => {
    // HOOK PHASE
    if (phase === 'hook') {
      return (
        <>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px', fontWeight: 700 }}>
                Hard Drive Read Physics
              </h1>
              <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px', fontWeight: 400 }}>
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
                <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
                  Inside every traditional hard drive, magnetic platters spin at thousands of
                  RPM while a read/write head floats just nanometers above the surface. This
                  mechanical dance has fundamental speed limits that electronics can overcome.
                </p>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px', fontWeight: 400 }}>
                  Understanding these limits explains why data centers are switching to SSDs.
                </p>
              </div>

              <div style={{
                background: 'rgba(249, 115, 22, 0.2)',
                padding: '16px',
                borderRadius: '8px',
                borderLeft: `3px solid ${colors.accent}`,
              }}>
                <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 400 }}>
                  Try different drive speeds and access patterns to see the performance impact!
                </p>
              </div>
              <button
                onClick={goNext}
                style={{
                  marginTop: '16px',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.warning} 100%)`,
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 700,
                  minHeight: '44px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Start Exploring
              </button>
            </div>
          </div>
          {renderBottomBar(true, 'Make a Prediction')}
        </>
      );
    }

    // PREDICT PHASE
    if (phase === 'predict') {
      return (
        <>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
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
          {renderBottomBar(!!prediction, 'Test My Prediction')}
        </>
      );
    }

    // PLAY PHASE
    if (phase === 'play') {
      return (
        <>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>Explore HDD Mechanics</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
                Adjust drive speed and access patterns to understand performance
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '8px', fontStyle: 'italic', fontWeight: 400 }}>
                Observe how different RPM settings and access patterns affect seek time and IOPS
              </p>
              <div style={{
                background: 'rgba(6, 182, 212, 0.15)',
                padding: '12px',
                borderRadius: '8px',
                marginTop: '12px',
                borderLeft: `3px solid ${colors.primary}`,
              }}>
                <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 400 }}>
                  <strong style={{ fontWeight: 700 }}>Real-World Application:</strong> Database servers and cloud storage systems rely on understanding these physics to optimize performance. Data centers choose between HDDs and SSDs based on workload characteristics - random vs sequential access patterns.
                </p>
              </div>
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
          {renderBottomBar(true, 'Continue to Review')}
        </>
      );
    }

    // REVIEW PHASE
    if (phase === 'review') {
      const wasCorrect = prediction === 'ssd_faster';
      const userPredictionLabel = predictions.find(p => p.id === prediction)?.label || 'No prediction made';

      return (
        <>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
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
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '8px', fontWeight: 400 }}>
                You predicted: <span style={{ fontWeight: 700 }}>{userPredictionLabel}</span>
              </p>
              <p style={{ color: colors.textPrimary, fontWeight: 700 }}>
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
          {renderBottomBar(true, 'Next: A Twist!')}
        </>
      );
    }

    // TWIST PREDICT PHASE
    if (phase === 'twist_predict') {
      return (
        <>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
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
                That is 1/10,000th the width of a human hair! What happens if something causes the
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
          {renderBottomBar(!!twistPrediction, 'Test My Prediction')}
        </>
      );
    }

    // TWIST PLAY PHASE
    if (phase === 'twist_play') {
      return (
        <>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <h2 style={{ color: colors.warning, marginBottom: '8px', fontWeight: 700 }}>Head Crash Physics</h2>
              <p style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 400 }}>
                Explore the dangerous world of nanometer-scale tolerances
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '8px', fontStyle: 'italic', fontWeight: 400 }}>
                Observe how fly height affects crash risk - try lowering it below 5nm!
              </p>
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                padding: '12px',
                borderRadius: '8px',
                marginTop: '12px',
                borderLeft: `3px solid ${colors.error}`,
              }}>
                <p style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 400 }}>
                  <strong style={{ fontWeight: 700 }}>Real-World Application:</strong> Laptops use accelerometers to detect sudden movements and park the drive heads to prevent crashes. Data recovery from crashed drives costs $500-$3000+, which is why SSDs are preferred for mobile devices.
                </p>
              </div>
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
          {renderBottomBar(true, 'See the Explanation')}
        </>
      );
    }

    // TWIST REVIEW PHASE
    if (phase === 'twist_review') {
      const wasCorrect = twistPrediction === 'crash';
      const userTwistPredictionLabel = twistPredictions.find(p => p.id === twistPrediction)?.label || 'No prediction made';

      return (
        <>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
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
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '8px', fontWeight: 400 }}>
                You predicted: <span style={{ fontWeight: 700 }}>{userTwistPredictionLabel}</span>
              </p>
              <p style={{ color: colors.textPrimary, fontWeight: 700 }}>
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
                  <strong style={{ color: colors.textPrimary }}>SSD Immunity:</strong> No moving parts means no
                  head crash risk. This reliability is another major reason for SSD adoption in
                  laptops and servers.
                </p>
              </div>
            </div>
          </div>
          {renderBottomBar(true, 'Apply This Knowledge')}
        </>
      );
    }

    // TRANSFER PHASE
    if (phase === 'transfer') {
      return (
        <>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
            <div style={{ padding: '16px' }}>
              <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center', fontWeight: 700 }}>
                Real-World Applications
              </h2>
              <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px', fontWeight: 400 }}>
                How drive physics shapes storage decisions across industries
              </p>

              {/* Key Statistics Panel */}
              <div style={{
                background: 'rgba(6, 182, 212, 0.15)',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '16px',
                borderLeft: `3px solid ${colors.primary}`,
              }}>
                <h4 style={{ color: colors.primary, marginBottom: '12px', fontWeight: 700 }}>Industry Statistics</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: 700 }}>$15/TB</div>
                    <div style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 400 }}>HDD Cost</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: 700 }}>$80/TB</div>
                    <div style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 400 }}>SSD Cost</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: 700 }}>100,000+</div>
                    <div style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 400 }}>SSD IOPS</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: 700 }}>120 km/h</div>
                    <div style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 400 }}>Platter Edge Speed</div>
                  </div>
                </div>
                <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '12px', fontWeight: 400 }}>
                  Understanding these performance characteristics helps engineers make informed storage decisions for databases, video systems, and enterprise storage with capacities exceeding 20TB per drive.
                </p>
              </div>

              <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px', fontWeight: 400 }}>
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
                  <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 700 }}>{app.title}</h3>
                  {transferCompleted.has(index) && <span style={{ color: colors.success, fontWeight: 700 }}>Completed</span>}
                </div>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px', fontWeight: 400 }}>{app.description}</p>
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
                      fontWeight: 700,
                      minHeight: '44px',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    Got It - Reveal Answer
                  </button>
                ) : (
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                    <p style={{ color: colors.textPrimary, fontSize: '13px', marginBottom: '12px', fontWeight: 400 }}>{app.answer}</p>
                    <button
                      onClick={() => {
                        // Mark as completed, scroll to next if available
                        const nextIndex = index + 1;
                        if (nextIndex < transferApplications.length && !transferCompleted.has(nextIndex)) {
                          // Scroll to next application
                        }
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        background: colors.success,
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 700,
                        minHeight: '44px',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      Got It
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {renderBottomBar(transferCompleted.size >= 4, 'Continue to Test')}
        </>
      );
    }

    // TEST PHASE
    if (phase === 'test') {
      if (testSubmitted) {
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
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
                        {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            {renderBottomBar(testScore >= 7, testScore >= 7 ? 'Complete Mastery' : 'Review and Retry', testScore >= 7 ? goNext : () => {
              setTestSubmitted(false);
              setTestAnswers(new Array(10).fill(null));
              setCurrentTestQuestion(0);
            })}
          </>
        );
      }

      const currentQ = testQuestions[currentTestQuestion];
      return (
        <>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ color: colors.textPrimary, fontWeight: 700 }}>Knowledge Test</h2>
                <span style={{ color: colors.textSecondary, fontWeight: 400 }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
              </div>

              {/* Context panel for quiz */}
              <div style={{
                background: 'rgba(249, 115, 22, 0.15)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                borderLeft: `3px solid ${colors.accent}`,
              }}>
                <p style={{ color: colors.textSecondary, fontSize: '13px', fontWeight: 400 }}>
                  Test your understanding of hard drive physics. These questions cover key concepts including seek time mechanics,
                  rotational latency calculations, IOPS performance limits, head crash physics, and the fundamental differences
                  between HDD and SSD storage technologies. Consider real-world scenarios like database servers handling random
                  access patterns or video surveillance systems with continuous sequential writes.
                </p>
              </div>

              <div style={{
                color: colors.textPrimary,
                fontSize: typo.bodyLarge,
                fontWeight: 700,
                marginBottom: '12px',
                textAlign: 'center'
              }}>
                Question {currentTestQuestion + 1} of {testQuestions.length}
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
                <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5, fontWeight: 400 }}>{currentQ.question}</p>
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
        </>
      );
    }

    // MASTERY PHASE
    if (phase === 'mastery') {
      return (
        <>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
              <h1 style={{ color: colors.success, marginBottom: '8px', fontWeight: 700 }}>Mastery Achieved!</h1>
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
          {renderBottomBar(true, 'Complete')}
        </>
      );
    }

    return null;
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: colors.bgPrimary,
      color: colors.textPrimary,
      paddingTop: '60px',
      paddingBottom: '70px'
    }}>
      {renderProgressBar()}
      {renderContent()}
    </div>
  );
};

export default HDDPhysicsRenderer;
