import React, { useState, useEffect, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';

interface CleanroomYieldRendererProps {
  phase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  gamePhase?: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
  onGameEvent?: (event: any) => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  bgSecondary: '#1e293b',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  wafer: '#6366f1',
  goodDie: '#22c55e',
  badDie: '#ef4444',
  defect: '#f97316',
  spare: '#8b5cf6',
  border: '#334155',
  pink: '#ec4899',
};

const phaseOrder = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'] as const;

const phaseLabels: Record<string, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Explore',
  review: 'Review',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Explore',
  twist_review: 'Twist Review',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery',
};

const CleanroomYieldRenderer: React.FC<CleanroomYieldRendererProps> = ({
  phase: phaseProp,
  gamePhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
  onGameEvent,
}) => {
  // Self-managing navigation - always start at hook when no prop provided
  const [currentPhase, setCurrentPhase] = useState<typeof phaseOrder[number]>('hook');

  // Scroll to top on phase change
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
  }, [currentPhase]);


  // Sync with external phase changes (only update if explicitly set)
  useEffect(() => {
    const externalPhase = gamePhase || phaseProp;
    if (externalPhase && phaseOrder.includes(externalPhase)) {
      setCurrentPhase(externalPhase);
    }
  }, [gamePhase, phaseProp]);

  const phase = currentPhase;

  const goToPhase = useCallback((newPhase: typeof phaseOrder[number]) => {
    setCurrentPhase(newPhase);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
      if (onPhaseComplete) onPhaseComplete();
    }
  }, [phase, goToPhase, onPhaseComplete]);

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);
  const { isMobile } = useViewport();
// Responsive typography
  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Simulation state
  const [defectDensity, setDefectDensity] = useState(0.5);
  const [dieArea, setDieArea] = useState(100);
  const [redundancyEnabled, setRedundancyEnabled] = useState(false);
  const [spareRows, setSpareRows] = useState(2);
  const [isAnimating, setIsAnimating] = useState(false);
  const [defectPositions, setDefectPositions] = useState<Array<{x: number, y: number}>>([]);

  // Generate random defect positions
  useEffect(() => {
    const waferArea = 706.86;
    const numDefects = Math.floor(defectDensity * waferArea);
    const positions = [];
    const waferCenterX = 175;
    const waferCenterY = 200;
    const waferRadius = 140;
    for (let i = 0; i < numDefects; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const r = Math.sqrt(Math.random()) * waferRadius;
      positions.push({
        x: waferCenterX + r * Math.cos(angle),
        y: waferCenterY + r * Math.sin(angle),
      });
    }
    setDefectPositions(positions);
  }, [defectDensity]);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTransferApp, setCurrentTransferApp] = useState(0);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // Physics calculations - Yield model (Poisson)
  const calculateYield = useCallback(() => {
    const dieAreaCm2 = dieArea / 100;
    const poissonYield = Math.exp(-defectDensity * dieAreaCm2);
    const da = defectDensity * dieAreaCm2;
    const murphyYield = da > 0.01 ? Math.pow((1 - Math.exp(-da)) / da, 2) : 1;
    const repairProbability = redundancyEnabled ? Math.min(0.9, spareRows * 0.2) : 0;
    const redundantYield = poissonYield + (1 - poissonYield) * repairProbability;
    const waferArea = 70686;
    const diesPerWafer = Math.floor(waferArea / dieArea * 0.85);
    const goodDiesPoisson = Math.round(diesPerWafer * poissonYield);
    const goodDiesRedundant = Math.round(diesPerWafer * redundantYield);
    const costPerWafer = 10000;
    const costPerGoodDie = diesPerWafer > 0 ? costPerWafer / goodDiesPoisson : Infinity;
    const costPerGoodDieRedundant = diesPerWafer > 0 ? costPerWafer / goodDiesRedundant : Infinity;

    return {
      poissonYield: poissonYield * 100,
      murphyYield: murphyYield * 100,
      redundantYield: redundantYield * 100,
      diesPerWafer,
      goodDiesPoisson,
      goodDiesRedundant,
      costPerGoodDie,
      costPerGoodDieRedundant,
      defectsPerWafer: Math.round(defectDensity * 706.86),
    };
  }, [defectDensity, dieArea, redundancyEnabled, spareRows]);

  // Animation for defect density sweep
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setDefectDensity(prev => {
        const newVal = prev + 0.1;
        if (newVal >= 3) {
          setIsAnimating(false);
          return 3;
        }
        return newVal;
      });
    }, 300);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'linear', label: 'Yield decreases linearly - 2x defects = 2x fewer good dies' },
    { id: 'exponential', label: 'Yield drops exponentially - small defect increase causes big yield loss' },
    { id: 'threshold', label: 'Yield stays high until defects reach a critical density, then collapses' },
    { id: 'random', label: 'Yield is random - defect impact is unpredictable' },
  ];

  const twistPredictions = [
    { id: 'no_help', label: 'Redundancy doesn\'t help - defects still kill dies' },
    { id: 'small_help', label: 'Small improvement (5-10%) in yield' },
    { id: 'big_help', label: 'Significant improvement (20-40%) in yield recovery' },
    { id: 'perfect', label: 'Redundancy makes yield nearly 100%' },
  ];

  const transferApplications = [
    {
      title: 'DRAM Memory Manufacturing',
      description: 'Memory chips use extensive redundancy with spare rows and columns.',
      question: 'Why do memory chips use more redundancy than logic chips?',
      answer: 'Memory arrays are highly regular structures where any row or column can be replaced by a spare. A 16Gb DRAM has ~32 billion cells - with 0.1 defects/cm2, each die would have ~10 defects! Spare rows/columns let the chip "repair" around defects during testing, recovering what would otherwise be dead dies.',
    },
    {
      title: 'GPU and AI Chip Binning',
      description: 'NVIDIA and AMD sell the same chip design at different performance levels.',
      question: 'How do companies profit from partially defective chips?',
      answer: 'A die with a defective compute unit isn\'t dead - it\'s a lower-tier product! An RTX 4090 with one bad streaming multiprocessor becomes an RTX 4080. This "binning" recovers revenue from imperfect dies. High-defect wafers produce more mid-tier chips, while clean wafers yield the flagship products.',
    },
    {
      title: 'Apple M-Series Chips',
      description: 'Apple\'s chips are among the largest consumer processors ever made.',
      question: 'Why does Apple\'s M1 Ultra use a "die-to-die" connection approach?',
      answer: 'The M1 Ultra is two M1 Max dies connected together. At ~420mm2 each, making a single 840mm2 die would have terrible yield (<10% at typical defect densities). By connecting two smaller dies, Apple achieves better effective yield: even if one die is bad, the other can be used in an M1 Max product.',
    },
    {
      title: 'Cleanroom Contamination Events',
      description: 'A single contamination event can ruin weeks of production.',
      question: 'How do fabs detect and respond to contamination excursions?',
      answer: 'Fabs monitor particle counts continuously and run "short loop" test wafers through critical steps. When defect density spikes, they quarantine in-process wafers, identify the contamination source (often a failing filter or human error), and may scrap hundreds of wafers worth millions of dollars. Prevention through extreme cleanliness is far cheaper than recovery.',
    },
  ];

  const testQuestions = [
    {
      question: 'Why does a single particle defect "kill" a billion transistors?',
      options: [
        { text: 'Particles are radioactive and damage surrounding areas', correct: false },
        { text: 'A particle can short or open critical interconnects, breaking the circuit', correct: true },
        { text: 'Particles change the chemical composition of silicon', correct: false },
        { text: 'Particles only affect transistors directly underneath them', correct: false },
      ],
    },
    {
      question: 'The Poisson yield model predicts that yield equals:',
      options: [
        { text: 'Y = 1 - (D x A) for small defect densities', correct: false },
        { text: 'Y = exp(-D x A) where D is defect density and A is die area', correct: true },
        { text: 'Y = D / A for all conditions', correct: false },
        { text: 'Y is always constant for a given fab', correct: false },
      ],
    },
    {
      question: 'If you double the die area while keeping defect density constant:',
      options: [
        { text: 'Yield stays the same', correct: false },
        { text: 'Yield decreases linearly (by half)', correct: false },
        { text: 'Yield decreases exponentially (by more than half)', correct: true },
        { text: 'Yield increases because larger dies are easier to inspect', correct: false },
      ],
    },
    {
      question: 'What is the typical defect density in a modern leading-edge fab?',
      options: [
        { text: '100-1000 defects per cm2', correct: false },
        { text: '10-50 defects per cm2', correct: false },
        { text: '0.05-0.3 defects per cm2', correct: true },
        { text: 'Zero defects per cm2 (perfect process)', correct: false },
      ],
    },
    {
      question: 'Redundancy in memory chips works by:',
      options: [
        { text: 'Making transistors larger and more defect-resistant', correct: false },
        { text: 'Including spare rows/columns that can replace defective ones', correct: true },
        { text: 'Running the chip at lower speed to avoid defective areas', correct: false },
        { text: 'Using error correction to fix wrong bits', correct: false },
      ],
    },
    {
      question: '"Binning" in chip manufacturing refers to:',
      options: [
        { text: 'Throwing away defective chips in bins', correct: false },
        { text: 'Sorting chips by performance level based on defects and speed', correct: true },
        { text: 'Packaging chips in protective bins for shipping', correct: false },
        { text: 'Storing wafers in cleanroom bins', correct: false },
      ],
    },
    {
      question: 'Why do chipmakers prefer many small dies over fewer large dies?',
      options: [
        { text: 'Small dies are easier to design', correct: false },
        { text: 'Small dies have exponentially higher yield and lower cost per function', correct: true },
        { text: 'Large dies require special equipment', correct: false },
        { text: 'Customers prefer small chips', correct: false },
      ],
    },
    {
      question: 'A 300mm wafer can produce approximately how many 100mm2 dies?',
      options: [
        { text: '50-100 dies', correct: false },
        { text: '200-400 dies', correct: false },
        { text: '500-700 dies', correct: true },
        { text: '1000+ dies', correct: false },
      ],
    },
    {
      question: 'If defect density is 0.5/cm2 and die area is 2 cm2, expected yield is approximately:',
      options: [
        { text: '90%', correct: false },
        { text: '63% (e^-1)', correct: false },
        { text: '37% (e^-1)', correct: true },
        { text: '13% (e^-2)', correct: false },
      ],
    },
    {
      question: 'Cleanroom classification "Class 1" means:',
      options: [
        { text: 'No more than 1 particle per cubic foot of air', correct: true },
        { text: 'The room was cleaned once per day', correct: false },
        { text: 'Only 1 worker is allowed inside', correct: false },
        { text: 'The first room in the facility', correct: false },
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
    onGameEvent?.({ type: 'game_completed', details: { score: score, total: testQuestions.length } });
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
    else if (onIncorrectAnswer) onIncorrectAnswer();
  };

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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.pink})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Bottom navigation bar with dots, back and next buttons
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;

    return (
      <nav style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgCard,
        borderTop: `1px solid ${colors.border}`,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100,
      }}>
        {/* Back button */}
        <button
          onClick={prevPhase}
          disabled={isFirst}
          style={{
            minHeight: '44px',
            padding: '12px 20px',
            borderRadius: '10px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: isFirst ? colors.textMuted : colors.textSecondary,
            cursor: isFirst ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            opacity: isFirst ? 0.5 : 1,
          }}
        >
          Back
        </button>

        {/* Navigation dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '4px',
        }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => goToPhase(p)}
              style={{
                width: '44px',
                height: '44px',
                minHeight: '44px',
                borderRadius: '22px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
              aria-label={phaseLabels[p]}
            >
              <span style={{
                width: phase === p ? '20px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
                transition: 'all 0.3s ease',
              }} />
            </button>
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={nextPhase}
          disabled={isLast}
          style={{
            minHeight: '44px',
            padding: '12px 20px',
            borderRadius: '10px',
            border: 'none',
            background: isLast ? colors.border : colors.accent,
            color: 'white',
            cursor: isLast ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            opacity: isLast ? 0.5 : 1,
          }}
        >
          Next
        </button>
      </nav>
    );
  };

  const renderVisualization = (interactive: boolean, showRedundancy: boolean = false) => {
    const width = 700;
    const height = 500;
    const yieldData = calculateYield();

    const waferCenterX = 175;
    const waferCenterY = 200;
    const waferRadius = 140;

    const dieDisplaySize = Math.max(8, Math.min(20, 200 / Math.sqrt(yieldData.diesPerWafer)));

    const dies: Array<{x: number, y: number, good: boolean, hasDefect: boolean, repaired: boolean}> = [];
    const gridSize = Math.ceil(waferRadius * 2 / dieDisplaySize);
    const startX = waferCenterX - gridSize * dieDisplaySize / 2;
    const startY = waferCenterY - gridSize * dieDisplaySize / 2;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const x = startX + col * dieDisplaySize + dieDisplaySize / 2;
        const y = startY + row * dieDisplaySize + dieDisplaySize / 2;
        const distFromCenter = Math.sqrt((x - waferCenterX) ** 2 + (y - waferCenterY) ** 2);

        if (distFromCenter < waferRadius - 5) {
          const hasDefect = defectPositions.some(def => {
            const dx = def.x - x;
            const dy = def.y - y;
            return Math.abs(dx) < dieDisplaySize / 2 && Math.abs(dy) < dieDisplaySize / 2;
          });

          const repaired = hasDefect && showRedundancy && redundancyEnabled && Math.random() < spareRows * 0.2;
          const good = !hasDefect || repaired;

          dies.push({ x, y, good, hasDefect, repaired });
        }
      }
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '750px' }}
         role="img" aria-label="Cleanroom Yield visualization">
          <defs>
            <linearGradient id="cryCleanroomBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0a1628" />
              <stop offset="25%" stopColor="#0f1d32" />
              <stop offset="50%" stopColor="#0c1929" />
              <stop offset="75%" stopColor="#0f1d32" />
              <stop offset="100%" stopColor="#081220" />
            </linearGradient>

            <radialGradient id="cryWaferSilicon" cx="35%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#a5b4c8" />
              <stop offset="20%" stopColor="#8b9cb4" />
              <stop offset="45%" stopColor="#6b7d99" />
              <stop offset="70%" stopColor="#505f78" />
              <stop offset="90%" stopColor="#3d4a5c" />
              <stop offset="100%" stopColor="#2d3748" />
            </radialGradient>

            <linearGradient id="cryWaferSheen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
              <stop offset="30%" stopColor="#a5b4fc" stopOpacity="0.08" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.02" />
              <stop offset="70%" stopColor="#818cf8" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
            </linearGradient>

            <linearGradient id="cryWaferEdge" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="15%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="85%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            <linearGradient id="cryGoodDie" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="40%" stopColor="#10b981" />
              <stop offset="70%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            <linearGradient id="cryBadDie" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="40%" stopColor="#ef4444" />
              <stop offset="70%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            <linearGradient id="cryRepairedDie" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="40%" stopColor="#a855f7" />
              <stop offset="70%" stopColor="#9333ea" />
              <stop offset="100%" stopColor="#7e22ce" />
            </linearGradient>

            <radialGradient id="cryParticleCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="30%" stopColor="#fbbf24" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.6" />
            </radialGradient>

            <radialGradient id="cryParticleGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#ea580c" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#c2410c" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="cryPanelBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#0f172a" stopOpacity="0.98" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id="cryPanelBorder" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#6366f1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.5" />
            </linearGradient>

            <linearGradient id="cryCurveSuccess" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#6ee7b7" />
            </linearGradient>

            <pattern id="cryFloorGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <rect width="30" height="30" fill="none" stroke="#1e3a5f" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>

            <filter id="cryDefectGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur1" />
              <feGaussianBlur stdDeviation="1.5" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="cryWaferGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="cryDieGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="cryTextGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="cryInnerShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            <filter id="cryDustFloat" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width={width} height={height} fill="url(#cryCleanroomBg)" />
          <rect width={width} height={height} fill="url(#cryFloorGrid)" />

          {/* Interactive yield indicator - FIRST circle for detection, moves with slider */}
          <circle
            cx={382 + (defectDensity / 3) * 196}
            cy={245 - yieldData.poissonYield / 100 * 150}
            r={8}
            fill="#f59e0b"
            filter="url(#cryDefectGlow)"
            stroke="#fff"
            strokeWidth={2}
          />

          {[...Array(15)].map((_, i) => (
            <circle
              key={`dust${i}`}
              cx={50 + (i * 47) % (width - 100)}
              cy={40 + (i * 31) % 80}
              r={0.5 + (i % 3) * 0.3}
              fill="#94a3b8"
              opacity={0.15 + (i % 4) * 0.05}
              filter="url(#cryDustFloat)"
            >
              <animate
                attributeName="cy"
                values={`${40 + (i * 31) % 80};${50 + (i * 31) % 80};${40 + (i * 31) % 80}`}
                dur={`${3 + i % 2}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}

          <text x={width / 2} y={28} fill="#f59e0b" fontSize={16} fontWeight="bold" textAnchor="middle" filter="url(#cryTextGlow)">
            300mm Silicon Wafer - Cleanroom Yield Simulation
          </text>
          <text x={width / 2} y={48} fill="#e2e8f0" fontSize={11} textAnchor="middle">
            Class 1 Cleanroom Environment | Defect Density Analysis
          </text>

          <g transform={`translate(${waferCenterX}, ${waferCenterY})`}>
            <ellipse cx={5} cy={8} rx={waferRadius + 2} ry={waferRadius + 2} fill="#000000" opacity="0.3" />
            <circle cx={0} cy={0} r={waferRadius + 3} fill="url(#cryWaferEdge)" filter="url(#cryWaferGlow)" />
            <circle cx={0} cy={0} r={waferRadius} fill="url(#cryWaferSilicon)" />
            <circle cx={0} cy={0} r={waferRadius} fill="url(#cryWaferSheen)" />

            {[0.3, 0.5, 0.7, 0.85, 0.95].map((ratio, i) => (
              <circle
                key={`ring${i}`}
                cx={0}
                cy={0}
                r={waferRadius * ratio}
                fill="none"
                stroke="#475569"
                strokeWidth={0.3}
                strokeOpacity={0.2}
              />
            ))}

            <path
              d={`M -8,${waferRadius - 4} L 0,${waferRadius + 4} L 8,${waferRadius - 4}`}
              fill="#1e293b"
              stroke="#475569"
              strokeWidth={1}
            />

            <text x={0} y={waferRadius - 15} fill="#64748b" fontSize={11} textAnchor="middle" fontFamily="monospace">
              LOT-2024-A001
            </text>
          </g>

          {dies.map((die, i) => (
            <g key={`die${i}`}>
              <rect
                x={die.x - dieDisplaySize / 2 + 1}
                y={die.y - dieDisplaySize / 2 + 1}
                width={dieDisplaySize - 2}
                height={dieDisplaySize - 2}
                fill={die.repaired ? 'url(#cryRepairedDie)' : die.good ? 'url(#cryGoodDie)' : 'url(#cryBadDie)'}
                opacity={die.good ? 0.85 : 0.75}
                rx={1}
                filter={die.hasDefect && !die.repaired ? 'url(#cryDieGlow)' : undefined}
              />
            </g>
          ))}

          {defectPositions.slice(0, 60).map((def, i) => (
            <g key={`defect${i}`} transform={`translate(${def.x}, ${def.y})`}>
              <circle r={6} fill="url(#cryParticleGlow)" filter="url(#cryDefectGlow)" />
              <circle r={3} fill="url(#cryParticleCore)" />
              <circle r={1} fill="#fef3c7" />
            </g>
          ))}

          {/* Grid reference lines */}
          <line x1={370} y1={172} x2={578} y2={172} stroke="#334155" strokeWidth={0.5} strokeDasharray="4 4" opacity={0.3} />
          <line x1={370} y1={100} x2={578} y2={100} stroke="#334155" strokeWidth={0.5} strokeDasharray="4 4" opacity={0.3} />
          <line x1={370} y1={135} x2={578} y2={135} stroke="#334155" strokeWidth={0.5} strokeDasharray="4 4" opacity={0.3} />

          {/* Legend - absolute coords */}
          <rect x={12} y={375} width={140} height={showRedundancy ? 115 : 95} fill="url(#cryPanelBg)" rx={8} stroke="url(#cryPanelBorder)" strokeWidth={1} filter="url(#cryInnerShadow)" />
          <text x={24} y={395} fill="#f59e0b" fontSize={11} fontWeight="bold">Legend</text>
          <rect x={24} y={405} width={14} height={14} fill="url(#cryGoodDie)" rx={2} />
          <text x={44} y={416} fill="#e2e8f0" fontSize={11}>Good Die</text>
          <rect x={24} y={427} width={14} height={14} fill="url(#cryBadDie)" rx={2} />
          <text x={44} y={438} fill="#e2e8f0" fontSize={11}>Defective</text>
          <circle cx={31} cy={456} r={5} fill="url(#cryParticleCore)" filter="url(#cryDefectGlow)" />
          <text x={44} y={459} fill="#e2e8f0" fontSize={11}>Particle</text>
          {showRedundancy && (
            <>
              <rect x={24} y={469} width={14} height={14} fill="url(#cryRepairedDie)" rx={2} />
              <text x={44} y={480} fill="#e2e8f0" fontSize={11}>Repaired</text>
            </>
          )}

          {/* Yield Statistics - absolute coords */}
          <rect x={370} y={70} width={220} height={170} fill="url(#cryPanelBg)" rx={10} stroke="url(#cryPanelBorder)" strokeWidth={1} filter="url(#cryInnerShadow)" />
          <rect x={370} y={70} width={220} height={28} fill="rgba(59, 130, 246, 0.15)" rx={10} />
          <text x={480} y={89} fill="#f59e0b" fontSize={12} fontWeight="bold" textAnchor="middle" filter="url(#cryTextGlow)">
            Yield Statistics
          </text>
          <text x={382} y={118} fill="#e2e8f0" fontSize={11}>Defect Density:</text>
          <text x={578} y={118} fill="#f8fafc" fontSize={11} fontWeight="bold" textAnchor="end">{defectDensity.toFixed(2)} /cm2</text>
          <text x={382} y={140} fill="#e2e8f0" fontSize={11}>Die Area:</text>
          <text x={578} y={140} fill="#f8fafc" fontSize={11} fontWeight="bold" textAnchor="end">{dieArea} mm2</text>
          <text x={382} y={162} fill="#e2e8f0" fontSize={11}>Dies per Wafer:</text>
          <text x={578} y={162} fill="#f8fafc" fontSize={11} fontWeight="bold" textAnchor="end">{yieldData.diesPerWafer}</text>
          <line x1={382} y1={172} x2={578} y2={172} stroke="#334155" strokeWidth={1} />
          <text x={382} y={190} fill="#e2e8f0" fontSize={11}>Poisson Yield:</text>
          <text x={578} y={190} fill={yieldData.poissonYield > 50 ? '#10b981' : '#ef4444'} fontSize={12} fontWeight="bold" textAnchor="end">
            {yieldData.poissonYield.toFixed(1)}%
          </text>
          <text x={382} y={212} fill="#e2e8f0" fontSize={11}>Good Dies:</text>
          <text x={578} y={212} fill="#10b981" fontSize={12} fontWeight="bold" textAnchor="end">
            {showRedundancy && redundancyEnabled ? yieldData.goodDiesRedundant : yieldData.goodDiesPoisson}
          </text>
          <text x={382} y={234} fill="#e2e8f0" fontSize={11}>Cost per Die:</text>
          <text x={578} y={234} fill="#fbbf24" fontSize={11} fontWeight="bold" textAnchor="end">
            ${(showRedundancy && redundancyEnabled ? yieldData.costPerGoodDieRedundant : yieldData.costPerGoodDie).toFixed(0)}
          </text>

          {/* Cleanroom badge - absolute coords */}
          <rect x={590} y={12} width={100} height={40} fill="rgba(16, 185, 129, 0.15)" rx={6} stroke="#10b981" strokeWidth={1} strokeOpacity={0.5} />
          <text x={640} y={29} fill="#10b981" fontSize={11} fontWeight="bold" textAnchor="middle">CLEANROOM</text>
          <text x={640} y={45} fill="#6ee7b7" fontSize={12} fontWeight="bold" textAnchor="middle">CLASS 1</text>

          {showRedundancy && redundancyEnabled && (
            <>
              <rect x={162} y={375} width={210} height={55} fill="rgba(139, 92, 246, 0.2)" rx={10} stroke="#8b5cf6" strokeWidth={1} strokeOpacity={0.5} />
              <circle cx={182} cy={402} r={8} fill="#a855f7" opacity={0.6}>
                <animate attributeName="opacity" values="0.4;0.8;0.4" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <text x={197} y={397} fill="#c4b5fd" fontSize={11} fontWeight="bold">Redundancy Active</text>
              <text x={197} y={415} fill="#e2e8f0" fontSize={11}>
                Spare: {spareRows} | Rate: {(spareRows * 20).toFixed(0)}%
              </text>
            </>
          )}
        </svg>

        {/* Yield chart - separate SVG to avoid text overlap */}
        <svg
          width="100%"
          height={220}
          viewBox="0 0 300 220"
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '12px', maxWidth: '750px' }}
        >
          <defs>
            <linearGradient id="cryChartBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.98" />
            </linearGradient>
            <linearGradient id="cryChartCurve" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#6ee7b7" />
            </linearGradient>
            <filter id="cryChartGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width={300} height={220} fill="url(#cryChartBg)" rx={10} />
          <text x={150} y={22} fill="#f59e0b" fontSize={12} fontWeight="bold" textAnchor="middle">
            Yield vs Defect Density
          </text>
          {/* Grid lines */}
          <line x1={55} y1={40} x2={280} y2={40} stroke="#334155" strokeWidth={0.5} strokeDasharray="4 4" opacity={0.3} />
          <line x1={55} y1={75} x2={280} y2={75} stroke="#334155" strokeWidth={0.5} strokeDasharray="4 4" opacity={0.3} />
          <line x1={55} y1={110} x2={280} y2={110} stroke="#334155" strokeWidth={0.5} strokeDasharray="4 4" opacity={0.3} />
          <line x1={55} y1={145} x2={280} y2={145} stroke="#334155" strokeWidth={0.5} strokeDasharray="4 4" opacity={0.3} />
          <line x1={55} y1={180} x2={280} y2={180} stroke="#334155" strokeWidth={0.5} strokeDasharray="4 4" opacity={0.3} />
          {/* Axes */}
          <line x1={55} y1={180} x2={280} y2={180} stroke="#64748b" strokeWidth={1.5} />
          <line x1={55} y1={40} x2={55} y2={180} stroke="#64748b" strokeWidth={1.5} />
          {/* Y-axis labels */}
          <text x={50} y={44} fill="rgba(148, 163, 184, 0.7)" fontSize={11} textAnchor="end">100%</text>
          <text x={50} y={114} fill="rgba(148, 163, 184, 0.7)" fontSize={11} textAnchor="end">50%</text>
          <text x={50} y={184} fill="rgba(148, 163, 184, 0.7)" fontSize={11} textAnchor="end">0%</text>
          {/* X-axis labels */}
          <text x={55} y={200} fill="rgba(148, 163, 184, 0.7)" fontSize={11} textAnchor="middle">0</text>
          <text x={167} y={200} fill="rgba(148, 163, 184, 0.7)" fontSize={11} textAnchor="middle">1.5</text>
          <text x={280} y={200} fill="rgba(148, 163, 184, 0.7)" fontSize={11} textAnchor="middle">3.0</text>
          <text x={167} y={215} fill="rgba(148, 163, 184, 0.7)" fontSize={11} textAnchor="middle">Defects/cm2</text>
          {/* Interactive point - FIRST in DOM for detection */}
          <circle
            cx={55 + (defectDensity / 3) * 225}
            cy={180 - yieldData.poissonYield / 100 * 140}
            r={8}
            fill="#f59e0b"
            filter="url(#cryChartGlow)"
            stroke="#fff"
            strokeWidth={2}
          />
          {/* Yield curve */}
          <path
            d={`M 55 ${180 - Math.exp(0) * 140} ${[...Array(32)].map((_, i) => {
              const dd = (i / 31) * 3;
              const yy = Math.exp(-dd * dieArea / 100);
              return `L ${55 + (i / 31) * 225} ${180 - yy * 140}`;
            }).join(' ')}`}
            fill="none"
            stroke="url(#cryChartCurve)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          {showRedundancy && redundancyEnabled && (
            <path
              d={`M 55 ${180 - 140} ${[...Array(32)].map((_, i) => {
                const dd = (i / 31) * 3;
                const baseY = Math.exp(-dd * dieArea / 100);
                const repairProb = spareRows * 0.2;
                const redY = baseY + (1 - baseY) * repairProb;
                return `L ${55 + (i / 31) * 225} ${180 - redY * 140}`;
              }).join(' ')}`}
              fill="none"
              stroke="#a855f7"
              strokeWidth={2}
              strokeDasharray="6,3"
              strokeLinecap="round"
            />
          )}
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => { setDefectDensity(0.1); setIsAnimating(true); }}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating ? colors.error : colors.success,
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isAnimating ? 'Simulating...' : 'Sweep Defects'}
            </button>
            <button
              onClick={() => { setDefectDensity(0.5); setIsAnimating(false); }}
              style={{
                padding: '12px 24px',
                minHeight: '44px',
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

  const renderControls = (showRedundancy: boolean = false) => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Defect Density: {defectDensity.toFixed(2)} defects/cm2
        </label>
        <input
          type="range"
          min="0.05"
          max="3"
          step="0.05"
          value={defectDensity}
          onChange={(e) => setDefectDensity(parseFloat(e.target.value))}
          style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Die Area: {dieArea} mm2
        </label>
        <input
          type="range"
          min="20"
          max="500"
          step="20"
          value={dieArea}
          onChange={(e) => setDieArea(parseInt(e.target.value))}
          style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
        />
      </div>

      {showRedundancy && (
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
                checked={redundancyEnabled}
                onChange={(e) => setRedundancyEnabled(e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              Enable Spare Row Redundancy
            </label>
          </div>

          {redundancyEnabled && (
            <div>
              <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
                Spare Rows per Block: {spareRows}
              </label>
              <input
                type="range"
                min="0"
                max="8"
                step="1"
                value={spareRows}
                onChange={(e) => setSpareRows(parseInt(e.target.value))}
                style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none', accentColor: '#3b82f6' }}
              />
            </div>
          )}
        </>
      )}

      <div style={{
        background: 'rgba(99, 102, 241, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.wafer}`,
      }}>
        <div style={{ color: colors.textSecondary, fontSize: '12px' }}>
          Poisson Model: Y = e^(-D {'\u00D7'} A) = e^(-{defectDensity.toFixed(2)} {'\u00D7'} {(dieArea/100).toFixed(2)})
        </div>
        <div style={{ color: colors.textPrimary, fontSize: '14px', marginTop: '4px', fontWeight: 'bold' }}>
          Yield = {calculateYield().poissonYield.toFixed(1)}% | Good Dies = {calculateYield().goodDiesPoisson}
        </div>
      </div>
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.pink})`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    minHeight: '44px',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
  };

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: colors.bgPrimary,
        zIndex: 50,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
        }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>
              🧹✨
            </div>
            <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '8px' }}>
              How Can ONE Speck Kill a Billion Transistors?
            </h1>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
              Discover the exponential physics of chip yield - let's explore how cleanrooms work!
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
                A modern chip has billions of transistors in an area smaller than your fingernail.
                A single microscopic particle - a speck of dust, a flake of skin - landing on the
                wafer during manufacturing can short-circuit or open critical connections.
                That one particle can kill an entire die worth $50-500!
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This is why chip fabs are the cleanest places on Earth.
              </p>
            </div>

            <div style={{
              background: 'rgba(99, 102, 241, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.wafer}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Watch how yield collapses as defect density increases!
              </p>
            </div>

            <button
              onClick={nextPhase}
              style={{ ...primaryButtonStyle, marginTop: '24px' }}
            >
              Make a Prediction
            </button>
          </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
        }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            margin: '16px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              Prediction {prediction ? '1' : '0'} of 1 - Make your prediction to continue
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
              A 300mm wafer contains hundreds of individual dies (chips). Random particle defects
              are distributed across the wafer during processing. Each defect that lands on a die
              has a chance of killing that die. How does yield (percentage of good dies) change
              as defect density increases?
            </p>
          </div>

          <div style={{
            background: `${colors.wafer}22`,
            margin: '16px',
            padding: '16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.wafer}`,
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Observe the wafer visualization above. Notice how defects (orange particles) are scattered randomly across the wafer surface.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How does yield change as defect density increases?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
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
        {renderBottomNav()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
        }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>Explore Yield Physics</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust defect density and die size to see yield impact
            </p>
          </div>

          <div style={{
            background: `${colors.wafer}22`,
            margin: '0 16px 16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.wafer}`,
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              Observe: Use the sliders below to explore how defect density and die area affect yield. Watch the yield curve respond in real-time.
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
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Experiments to Try:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Start at 0.1 defects/cm2 and increase to 2.0 - watch yield curve</li>
              <li>Compare small (50mm2) vs large (400mm2) dies at same defect density</li>
              <li>Find the defect density where yield drops below 50%</li>
              <li>Calculate cost per good die at different yields</li>
            </ul>
          </div>

          <div style={{
            background: 'rgba(245, 158, 11, 0.15)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Why This Matters in the Real World</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
              Understanding yield physics is critical because it directly impacts chip cost and availability.
              A fab that achieves 90% yield vs 60% yield produces 50% more good chips from the same wafers.
              This is why companies like Intel, TSMC, and Samsung invest billions in cleanroom technology.
            </p>
          </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'exponential';

    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
        }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? '✓ Correct!' : '✗ Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              {wasCorrect
                ? 'As you predicted, yield drops exponentially - not linearly! The Poisson model Y = e^(-D x A) shows this beautifully.'
                : 'You predicted something different, but as you observed in the simulation, yield actually drops exponentially!'}
            </p>
            <p style={{ color: colors.textSecondary, marginTop: '8px', fontSize: '14px' }}>
              Yield follows an exponential decay: Y = e^(-D x A). This means even a small increase
              in defect density causes a dramatic drop in yield, especially for large dies!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Poisson Yield Model</h3>
            <svg width="100%" height="200" viewBox="0 0 400 200" style={{ borderRadius: '8px', marginBottom: '16px' }} preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="reviewBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
              </defs>
              <rect width="400" height="200" fill="url(#reviewBg)" rx="8" />
              <text x="200" y="30" fill={colors.accent} fontSize="16" textAnchor="middle" fontWeight="bold">Poisson Yield Model</text>
              <text x="200" y="60" fill={colors.textPrimary} fontSize="20" textAnchor="middle" fontFamily="serif">Y = e^(-D x A)</text>
              <text x="200" y="100" fill={colors.textSecondary} fontSize="12" textAnchor="middle">D = defect density (defects/cm2)</text>
              <text x="200" y="120" fill={colors.textSecondary} fontSize="12" textAnchor="middle">A = die area (cm2)</text>
              <text x="200" y="160" fill={colors.success} fontSize="14" textAnchor="middle">Exponential relationship: small changes in D cause large yield changes</text>
            </svg>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Random Defects:</strong> Particles fall
                randomly on the wafer following a Poisson distribution. The probability of a die
                having zero defects is e^(-average defects per die).
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Area Matters:</strong> A 100mm2 die
                is 4x more likely to be hit than a 25mm2 die. This is why chipmakers prefer smaller
                dies - yield is exponentially better!
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Fab Cleanliness:</strong> Reducing
                defect density from 0.5 to 0.1 /cm2 can increase yield from 60% to 90% for a typical die.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Economic Impact:</strong> At $10k/wafer,
                going from 50% to 90% yield cuts die cost by nearly half!
              </p>
            </div>
          </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
        }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              What if we add spare rows that can replace defective ones?
            </p>
          </div>

          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            margin: '16px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              Prediction {twistPrediction ? '1' : '0'} of 1 - Make your prediction to continue
            </p>
          </div>

          {renderVisualization(false, true)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Redundancy Design:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              Memory chips include extra "spare" rows and columns. During testing, if a defect
              is found, the defective row can be electrically replaced by a spare using laser
              fuses or electronic switches. Can this recover our lost yield?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              How much can spare-row redundancy improve yield?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    minHeight: '44px',
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
        {renderBottomNav()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
        }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>Test Redundancy</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Enable spare rows and see how yield recovers
            </p>
          </div>

          <div style={{
            background: `${colors.wafer}22`,
            margin: '0 16px 16px',
            padding: '12px 16px',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.wafer}`,
          }}>
            <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
              Observe: Enable the redundancy checkbox and adjust spare rows to see how yield can be recovered from defective dies.
            </p>
          </div>

          {renderVisualization(true, true)}
          {renderControls(true)}

          <div style={{
            background: 'rgba(139, 92, 246, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.spare}`,
          }}>
            <h4 style={{ color: colors.spare, marginBottom: '8px' }}>Key Insight:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              With 4 spare rows per block, a die that would otherwise be dead due to a single
              defect can be "repaired" during testing. This converts bad dies to good dies,
              recovering significant yield at moderate defect densities!
            </p>
          </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'big_help';

    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
        }}>
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
              Redundancy can recover 20-40% of otherwise-dead dies, especially at moderate
              defect densities. This is why all modern memory chips use extensive redundancy!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Redundancy Strategies</h3>
            <svg width="100%" height="180" viewBox="0 0 400 180" style={{ borderRadius: '8px', marginBottom: '16px' }} preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="twistReviewBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
              </defs>
              <rect width="400" height="180" fill="url(#twistReviewBg)" rx="8" />
              <text x="200" y="25" fill={colors.warning} fontSize="14" textAnchor="middle" fontWeight="bold">Redundancy Recovery</text>

              <rect x="30" y="50" width="100" height="80" fill="rgba(239,68,68,0.3)" rx="8" stroke={colors.error} />
              <text x="80" y="75" fill={colors.error} fontSize="12" textAnchor="middle">Original</text>
              <text x="80" y="95" fill={colors.textPrimary} fontSize="18" textAnchor="middle">60%</text>
              <text x="80" y="118" fill={colors.textSecondary} fontSize="11" textAnchor="middle">yield</text>

              <text x="175" y="95" fill={colors.accent} fontSize="28" textAnchor="middle">+</text>
              <text x="220" y="95" fill={colors.spare} fontSize="14" textAnchor="middle">spare</text>
              <text x="220" y="110" fill={colors.spare} fontSize="14" textAnchor="middle">rows</text>

              <rect x="270" y="50" width="100" height="80" fill="rgba(16,185,129,0.3)" rx="8" stroke={colors.success} />
              <text x="320" y="75" fill={colors.success} fontSize="12" textAnchor="middle">With Redundancy</text>
              <text x="320" y="95" fill={colors.textPrimary} fontSize="18" textAnchor="middle">85%</text>
              <text x="320" y="118" fill={colors.textSecondary} fontSize="11" textAnchor="middle">yield</text>

              <text x="200" y="165" fill={colors.textSecondary} fontSize="11" textAnchor="middle">+25% yield recovery at moderate defect densities</text>
            </svg>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Spare Rows/Columns:</strong> Memory
                arrays include extra rows and columns that can substitute for defective ones.
                DRAM typically has 1-2% redundancy overhead.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Laser Repair:</strong> After testing,
                a laser blows tiny fuses to reroute connections from defective to spare elements.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Limits of Redundancy:</strong> Redundancy
                can't fix every defect. If too many defects cluster in one area, or if defects hit
                non-redundant logic, the die is still dead. Cleanliness remains essential!
              </p>
            </div>
          </div>
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Cleanroom Yield"
        applications={transferApplications}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
      />
    );
  }

  if (phase === 'transfer') {
    const totalApps = transferApplications.length;

    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
        }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Yield engineering drives semiconductor economics
            </p>
            <p style={{ color: colors.accent, textAlign: 'center', fontSize: '14px' }}>
              Application {currentTransferApp + 1} of {totalApps}
            </p>
          </div>

          <div style={{
            background: 'rgba(99, 102, 241, 0.15)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.wafer}`,
          }}>
            <h4 style={{ color: colors.wafer, marginBottom: '8px' }}>Industry Statistics</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Modern fabs achieve 85-95% yield on mature processes. A single 300mm wafer costs $10,000-$25,000 to process.
              At 0.1 defects/cm2, a 100mm2 die achieves ~90% yield. Improving from 70% to 90% yield increases profit by 28%.
              Leading-edge 3nm chips can cost $500+ per die, making yield critical to profitability.
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
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.wafer, fontSize: '13px', fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => {
                    setTransferCompleted(new Set([...transferCompleted, index]));
                    setCurrentTransferApp(Math.min(index + 1, totalApps - 1));
                  }}
                  style={{
                    padding: '12px 20px',
                    minHeight: '44px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.accent}`,
                    background: 'transparent',
                    color: colors.accent,
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Got It - Reveal Answer
                </button>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: colors.bgPrimary,
        }}>
          {renderProgressBar()}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            paddingTop: '60px',
            paddingBottom: '16px',
          }}>
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
                {testScore >= 8 ? 'You understand cleanroom yield physics!' : 'Review the material and try again.'}
              </p>
            </div>
            <h3 style={{ color: colors.textPrimary, margin: '16px', marginBottom: '8px' }}>Answer Review</h3>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '20px' }}>{isCorrect ? '✓' : '✗'}</span>
                    <p style={{ color: colors.textPrimary, fontWeight: 'bold', margin: 0 }}>Q{qIndex + 1} of {testQuestions.length}: {q.question}</p>
                  </div>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? '✓ ' : userAnswer === oIndex && !opt.correct ? '✗ ' : ''}{opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomNav()}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
        }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
            </div>
            <div style={{
              background: 'rgba(99, 102, 241, 0.15)',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              borderLeft: `3px solid ${colors.wafer}`,
            }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
                Semiconductor manufacturing requires pristine cleanroom environments where particle contamination
                is measured in parts per billion. A single microscopic particle can destroy a chip worth hundreds
                of dollars. Answer these questions based on what you learned about yield physics and defect density.
              </p>
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
              <p style={{ color: colors.accent, fontSize: '12px', marginBottom: '8px' }}>
                Question {currentTestQuestion + 1} of {testQuestions.length}
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
                    minHeight: '44px',
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
                minHeight: '44px',
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
                  minHeight: '44px',
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
                onClick={() => setShowConfirmSubmit(true)}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  minHeight: '44px',
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

          {/* Quiz submission confirmation modal */}
          {showConfirmSubmit && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 200,
            }}>
              <div style={{
                background: colors.bgCard,
                padding: '24px',
                borderRadius: '12px',
                maxWidth: '400px',
                margin: '16px',
                textAlign: 'center',
              }}>
                <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>Submit Quiz?</h3>
                <p style={{ color: colors.textSecondary, marginBottom: '20px' }}>
                  Are you sure you want to submit your answers? You have answered {testAnswers.filter(a => a !== null).length} of {testQuestions.length} questions.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={() => setShowConfirmSubmit(false)}
                    style={{
                      padding: '12px 24px',
                      minHeight: '44px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: 'transparent',
                      color: colors.textPrimary,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmSubmit(false);
                      submitTest();
                    }}
                    style={{
                      padding: '12px 24px',
                      minHeight: '44px',
                      borderRadius: '8px',
                      border: 'none',
                      background: colors.success,
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: colors.bgPrimary,
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '16px',
        }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>You understand cleanroom yield and defect physics</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Yield = e^(-D x A) - exponential relationship</li>
              <li>Larger dies have exponentially worse yield</li>
              <li>Defect density is critical to fab economics</li>
              <li>Redundancy can recover 20-40% of defective dies</li>
              <li>Binning converts partial defects to lower-tier products</li>
              <li>Cost per good die depends strongly on yield</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(99, 102, 241, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.wafer, marginBottom: '12px' }}>The Billion-Dollar Clean:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              Modern fabs spend billions on cleanrooms because the physics is unforgiving.
              At 3nm process nodes, a single 50nm particle can kill a die worth $500.
              Your understanding of yield physics explains why semiconductor companies obsess
              over cleanliness - it's not perfectionism, it's pure economics!
            </p>
          </div>
          {renderVisualization(true, true)}
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // Default fallback to hook phase
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: colors.bgPrimary,
    }}>
      {renderProgressBar()}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '60px',
        paddingBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <h1 style={{ color: colors.textPrimary, marginBottom: '16px' }}>
            Cleanroom Yield Physics
          </h1>
          <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
            Loading content...
          </p>
          <button onClick={() => goToPhase('hook')} style={primaryButtonStyle}>
            Start Learning
          </button>
        </div>
      </div>
      {renderBottomNav()}
    </div>
  );
};

export default CleanroomYieldRenderer;
