'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// Phase type for internal state management
type EMPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface ElectromigrationRendererProps {
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
  bgCardLight: '#1e293b',
  border: '#334155',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  copper: '#b87333',
  electron: '#60a5fa',
  atom: '#fbbf24',
  void: '#1f2937',
  primary: '#06b6d4',
};

const ElectromigrationRenderer: React.FC<ElectromigrationRendererProps> = ({
  gamePhase,
  onGameEvent,
}) => {
  // Phase order and labels for navigation
  const phaseOrder: EMPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<EMPhase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Temperature Effect',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  // Internal phase state management
  const getInitialPhase = (): EMPhase => {
    if (gamePhase && phaseOrder.includes(gamePhase as EMPhase)) {
      return gamePhase as EMPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<EMPhase>(getInitialPhase);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as EMPhase) && gamePhase !== phase) {
      setPhase(gamePhase as EMPhase);
    }
  }, [gamePhase]);

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Simulation state
  const [currentDensity, setCurrentDensity] = useState(5); // MA/cm^2
  const [temperature, setTemperature] = useState(85); // Celsius
  const [wireWidth, setWireWidth] = useState(100); // nm
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [voidFormation, setVoidFormation] = useState(0);
  const [hillockFormation, setHillockFormation] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
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
        gameType: 'electromigration',
        gameTitle: 'Electromigration',
        details,
        timestamp: Date.now()
      });
    }
  }, [onGameEvent]);

  // Navigation function
  const goToPhase = useCallback((p: EMPhase) => {
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

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // MTTF calculation (Black's equation)
  const calculateMTTF = useCallback(() => {
    const J = currentDensity;
    const T = temperature + 273;
    const Ea = 0.7;
    const k = 8.617e-5;
    const n = 2;
    const A = 1e12;

    const mttf = A * Math.pow(J, -n) * Math.exp(Ea / (k * T));
    return Math.min(mttf / 1e6, 1000);
  }, [currentDensity, temperature]);

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 1);
      const growthRate = (currentDensity / 10) * (1 + (temperature - 25) / 100) * 0.01;
      setVoidFormation(prev => Math.min(prev + growthRate, 100));
      setHillockFormation(prev => Math.min(prev + growthRate * 0.8, 100));
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating, currentDensity, temperature]);

  const mttf = calculateMTTF();

  const predictions = [
    { id: 'heat', label: 'Excessive heat melts the wires over time' },
    { id: 'electromigration', label: 'Electrons push metal atoms, creating voids and failures' },
    { id: 'oxidation', label: 'Oxygen in the chip corrodes the copper wires' },
    { id: 'vibration', label: 'Mechanical vibration causes metal fatigue' },
  ];

  const twistPredictions = [
    { id: 'linear', label: 'Higher temperature increases failure rate linearly' },
    { id: 'exponential', label: 'Higher temperature exponentially accelerates failure' },
    { id: 'none', label: 'Temperature has no effect on electromigration' },
    { id: 'helps', label: 'Higher temperature actually improves reliability' },
  ];

  const transferApplications = [
    {
      title: 'CPU Design Rules',
      description: 'Modern CPUs use strict current density limits (max ~2 MA/cm^2) and wide power traces.',
      icon: 'CPU',
    },
    {
      title: 'Automotive Electronics',
      description: 'Cars operate in extreme temperatures (-40 to 125C). Engineers use copper alloys and redundant paths.',
      icon: 'Car',
    },
    {
      title: 'Data Center Reliability',
      description: 'Server CPUs run 24/7 at high loads. Active cooling and derating strategies keep current densities safe.',
      icon: 'Server',
    },
    {
      title: 'LED Driver ICs',
      description: 'LED drivers carry high currents in small packages. Layout rules mandate wide metal traces.',
      icon: 'LED',
    },
  ];

  const testQuestions = [
    {
      question: 'What is electromigration?',
      options: [
        { text: 'Movement of metal atoms due to electron momentum transfer', correct: true },
        { text: 'Migration of electricity through a conductor', correct: false },
        { text: 'Electrons leaving the conductor entirely', correct: false },
        { text: 'Magnetic field effects on current flow', correct: false },
      ],
    },
    {
      question: 'What physical defects does electromigration cause?',
      options: [
        { text: 'Color changes in the metal', correct: false },
        { text: 'Voids (gaps) and hillocks (bumps) in the conductor', correct: true },
        { text: 'Increased conductivity', correct: false },
        { text: 'Stronger atomic bonds', correct: false },
      ],
    },
    {
      question: "According to Black's equation, how does current density affect MTTF?",
      options: [
        { text: 'MTTF is proportional to J^2 (increases with current)', correct: false },
        { text: 'MTTF is proportional to J^-2 (decreases rapidly with current)', correct: true },
        { text: 'MTTF is independent of current density', correct: false },
        { text: 'MTTF increases linearly with current', correct: false },
      ],
    },
    {
      question: 'How does temperature affect electromigration?',
      options: [
        { text: 'No effect on electromigration rate', correct: false },
        { text: 'Linear increase in failure rate', correct: false },
        { text: 'Exponential acceleration of atom migration', correct: true },
        { text: 'Cooling accelerates failures', correct: false },
      ],
    },
    {
      question: 'Why is electromigration worse in smaller chip geometries?',
      options: [
        { text: 'Smaller wires have higher current density for same current', correct: true },
        { text: 'Smaller atoms migrate faster', correct: false },
        { text: 'More oxygen exposure', correct: false },
        { text: 'Lower operating voltages', correct: false },
      ],
    },
    {
      question: 'What metal is most commonly used in modern IC interconnects?',
      options: [
        { text: 'Aluminum', correct: false },
        { text: 'Gold', correct: false },
        { text: 'Copper (with barrier layers)', correct: true },
        { text: 'Silver', correct: false },
      ],
    },
    {
      question: 'What is the typical activation energy (Ea) for copper electromigration?',
      options: [
        { text: 'Around 0.5-0.9 eV', correct: true },
        { text: 'Around 5-10 eV', correct: false },
        { text: 'Zero (no energy barrier)', correct: false },
        { text: 'Negative (releases energy)', correct: false },
      ],
    },
    {
      question: 'How do chip designers mitigate electromigration?',
      options: [
        { text: 'Use thinner wires to reduce heat', correct: false },
        { text: 'Limit current density, use redundant vias, add barrier layers', correct: true },
        { text: 'Increase operating voltage', correct: false },
        { text: 'Remove cooling systems', correct: false },
      ],
    },
    {
      question: 'What does MTTF stand for?',
      options: [
        { text: 'Maximum Time To Failure', correct: false },
        { text: 'Mean Time To Failure', correct: true },
        { text: 'Minimum Time To Failure', correct: false },
        { text: 'Metal Transfer Time Factor', correct: false },
      ],
    },
    {
      question: 'Why do voids cause circuit failure?',
      options: [
        { text: 'They create open circuits when wire breaks completely', correct: true },
        { text: 'They make the chip heavier', correct: false },
        { text: 'They emit radiation', correct: false },
        { text: 'They improve conductivity too much', correct: false },
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

  const resetSimulation = () => {
    setVoidFormation(0);
    setHillockFormation(0);
    setAnimationTime(0);
    setIsAnimating(false);
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

  const renderVisualization = (interactive: boolean = false, showTemperatureEffect: boolean = false) => {
    const width = 400;
    const height = 260;
    const atomCount = 20;
    const electronCount = Math.floor(currentDensity * 3);

    // Current density intensity for visual feedback (0-1 scale)
    const currentIntensity = Math.min(currentDensity / 20, 1);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: typo.elementGap }}>
        {/* Title outside SVG */}
        <div style={{
          fontSize: typo.body,
          fontWeight: 700,
          color: colors.textPrimary,
          textAlign: 'center'
        }}>
          Copper Interconnect Cross-Section
        </div>

        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ borderRadius: '12px', maxWidth: '500px' }}
        >
          <defs>
            {/* Premium dark lab background gradient */}
            <linearGradient id="emigLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="30%" stopColor="#0a0f1a" />
              <stop offset="70%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Premium copper metal gradient with depth */}
            <linearGradient id="emigCopperMetal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#cd7f32" />
              <stop offset="15%" stopColor="#e8a860" />
              <stop offset="35%" stopColor="#b87333" />
              <stop offset="65%" stopColor="#a0522d" />
              <stop offset="85%" stopColor="#8b4513" />
              <stop offset="100%" stopColor="#704214" />
            </linearGradient>

            {/* Copper surface highlight */}
            <linearGradient id="emigCopperHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b87333" stopOpacity="0.3" />
              <stop offset="20%" stopColor="#e8a860" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#ffd700" stopOpacity="0.2" />
              <stop offset="80%" stopColor="#e8a860" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#b87333" stopOpacity="0.3" />
            </linearGradient>

            {/* Current flow gradient - intensity-based */}
            <linearGradient id="emigCurrentFlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e40af" stopOpacity="0" />
              <stop offset="20%" stopColor="#3b82f6" stopOpacity={0.3 + currentIntensity * 0.4} />
              <stop offset="50%" stopColor="#60a5fa" stopOpacity={0.5 + currentIntensity * 0.5} />
              <stop offset="80%" stopColor="#3b82f6" stopOpacity={0.3 + currentIntensity * 0.4} />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
            </linearGradient>

            {/* Electron glow - premium radial */}
            <radialGradient id="emigElectronGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="1" />
              <stop offset="30%" stopColor="#60a5fa" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
            </radialGradient>

            {/* Atom glow - golden radial */}
            <radialGradient id="emigAtomGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
              <stop offset="30%" stopColor="#fbbf24" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>

            {/* Void darkness gradient */}
            <radialGradient id="emigVoidDark" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#030712" stopOpacity="1" />
              <stop offset="40%" stopColor="#0f172a" stopOpacity="0.95" />
              <stop offset="70%" stopColor="#1e293b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0.4" />
            </radialGradient>

            {/* Hillock buildup gradient */}
            <radialGradient id="emigHillockGlow" cx="50%" cy="70%" r="60%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
              <stop offset="25%" stopColor="#fcd34d" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.8" />
              <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.3" />
            </radialGradient>

            {/* Temperature heat gradient */}
            <linearGradient id="emigHeatGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="25%" stopColor="#84cc16" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Substrate/barrier layer gradient */}
            <linearGradient id="emigBarrierLayer" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="30%" stopColor="#4b5563" />
              <stop offset="70%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Current density indicator gradient */}
            <linearGradient id="emigDensityBar" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="33%" stopColor="#eab308" />
              <stop offset="66%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Electron blur/glow filter */}
            <filter id="emigElectronBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Stronger glow for atoms */}
            <filter id="emigAtomGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Void shadow filter */}
            <filter id="emigVoidShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Hillock glow filter */}
            <filter id="emigHillockGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Current pulse animation effect */}
            <filter id="emigCurrentPulse" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arrow markers */}
            <marker id="emigArrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="url(#emigElectronGlow)" />
            </marker>
            <marker id="emigAtomArrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#fbbf24" />
            </marker>

            {/* Grid pattern for substrate */}
            <pattern id="emigSubstrateGrid" width="10" height="10" patternUnits="userSpaceOnUse">
              <rect width="10" height="10" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.5" />
            </pattern>
          </defs>

          {/* Background with gradient */}
          <rect width={width} height={height} fill="url(#emigLabBg)" />
          <rect width={width} height={height} fill="url(#emigSubstrateGrid)" />

          {/* Barrier/substrate layer below copper */}
          <rect x="45" y="135" width="310" height="8" fill="url(#emigBarrierLayer)" rx="2" />

          {/* Main copper interconnect with premium gradient */}
          <rect x="50" y="70" width="300" height="65" fill="url(#emigCopperMetal)" rx="4" />

          {/* Copper surface highlight for metallic sheen */}
          <rect x="50" y="70" width="300" height="12" fill="url(#emigCopperHighlight)" rx="4" />

          {/* Current flow overlay - pulsing effect */}
          {isAnimating && (
            <rect
              x="50" y="70"
              width="300" height="65"
              fill="url(#emigCurrentFlow)"
              rx="4"
              style={{
                opacity: 0.4 + Math.sin(animationTime * 0.2) * 0.2
              }}
            />
          )}

          {/* Void formation with premium dark gradient */}
          {voidFormation > 10 && (
            <g filter="url(#emigVoidShadow)">
              <ellipse
                cx={80 + voidFormation * 0.3}
                cy={102}
                rx={Math.min(voidFormation * 0.5, 30)}
                ry={Math.min(voidFormation * 0.35, 22)}
                fill="url(#emigVoidDark)"
                opacity={Math.min(voidFormation / 40, 1)}
              />
              {/* Void edge highlight */}
              <ellipse
                cx={80 + voidFormation * 0.3}
                cy={102}
                rx={Math.min(voidFormation * 0.5, 30)}
                ry={Math.min(voidFormation * 0.35, 22)}
                fill="none"
                stroke="#475569"
                strokeWidth="1"
                opacity={Math.min(voidFormation / 50, 0.6)}
              />
            </g>
          )}

          {/* Hillock formation with glowing buildup */}
          {hillockFormation > 10 && (
            <g filter="url(#emigHillockGlowFilter)">
              <ellipse
                cx={320 - hillockFormation * 0.2}
                cy={65}
                rx={Math.min(hillockFormation * 0.3, 25)}
                ry={Math.min(hillockFormation * 0.2, 16)}
                fill="url(#emigHillockGlow)"
                opacity={Math.min(hillockFormation / 40, 0.9)}
              />
            </g>
          )}

          {/* Copper atoms with premium glow */}
          {Array.from({ length: atomCount }, (_, i) => {
            const x = 70 + (i % 10) * 26;
            const y = 88 + Math.floor(i / 10) * 28;
            const displacement = isAnimating ? Math.sin(animationTime * 0.1 + i) * (currentDensity * 0.4) : 0;
            const atomOpacity = voidFormation > 30 && x < 120 ? Math.max(0.2, 1 - voidFormation / 80) : 0.9;
            return (
              <g key={`atom-${i}`} filter="url(#emigAtomGlowFilter)">
                <circle
                  cx={x + displacement}
                  cy={y}
                  r={7}
                  fill="url(#emigAtomGlow)"
                  opacity={atomOpacity}
                />
                {/* Atom core for depth */}
                <circle
                  cx={x + displacement}
                  cy={y}
                  r={4}
                  fill="#fcd34d"
                  opacity={atomOpacity * 0.8}
                />
              </g>
            );
          })}

          {/* Flowing electrons with premium glow */}
          {isAnimating && Array.from({ length: electronCount }, (_, i) => {
            const baseX = ((animationTime * 5 + i * 40) % 280) + 60;
            const y = 85 + (i % 3) * 18;
            return (
              <g key={`electron-${i}`} filter="url(#emigElectronBlur)">
                <circle
                  cx={baseX}
                  cy={y}
                  r={4}
                  fill="url(#emigElectronGlow)"
                />
                {/* Electron core */}
                <circle
                  cx={baseX}
                  cy={y}
                  r={2}
                  fill="#bfdbfe"
                />
              </g>
            );
          })}

          {/* Electron flow arrow with gradient */}
          <path
            d="M 60 175 L 340 175"
            stroke="url(#emigCurrentFlow)"
            strokeWidth="3"
            markerEnd="url(#emigArrowhead)"
            filter="url(#emigCurrentPulse)"
          />

          {/* Atom drift indicator when animating */}
          {isAnimating && (
            <g>
              <path
                d="M 180 95 L 260 95"
                stroke="#fbbf24"
                strokeWidth="1.5"
                strokeDasharray="6,3"
                markerEnd="url(#emigAtomArrow)"
                opacity="0.8"
              />
            </g>
          )}

          {/* Current density indicator bar */}
          <g>
            <rect x="50" y="200" width="140" height="6" fill="#1e293b" rx="3" />
            <rect
              x="50" y="200"
              width={140 * currentIntensity}
              height="6"
              fill="url(#emigDensityBar)"
              rx="3"
            />
            {/* Tick marks */}
            {[0.25, 0.5, 0.75].map((tick, i) => (
              <line
                key={i}
                x1={50 + 140 * tick} y1="198"
                x2={50 + 140 * tick} y2="208"
                stroke="#64748b"
                strokeWidth="1"
              />
            ))}
          </g>

          {/* Temperature indicator when showing temperature effect */}
          {showTemperatureEffect && (
            <g>
              <rect x="320" y="185" width="60" height="50" fill="rgba(15, 23, 42, 0.9)" rx="6" stroke="#334155" strokeWidth="1" />
              {/* Heat bar */}
              <rect x="328" y="195" width="8" height="32" fill="#1e293b" rx="2" />
              <rect
                x="328"
                y={227 - (temperature - 25) / 125 * 32}
                width="8"
                height={(temperature - 25) / 125 * 32}
                fill="url(#emigHeatGradient)"
                rx="2"
              />
              {/* Temperature value */}
              <text x="355" y="215" fill={colors.textPrimary} fontSize="14" textAnchor="middle" fontWeight="bold">
                {temperature}°C
              </text>
            </g>
          )}
        </svg>

        {/* Labels below SVG using typo system */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '500px',
          paddingLeft: '50px',
          paddingRight: '50px'
        }}>
          <div style={{
            fontSize: typo.small,
            color: colors.error,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: colors.error,
              display: 'inline-block'
            }} />
            Cathode (-)
          </div>
          <div style={{
            fontSize: typo.label,
            color: colors.textMuted,
            textAlign: 'center'
          }}>
            Electron Flow →
          </div>
          <div style={{
            fontSize: typo.small,
            color: colors.success,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            Anode (+)
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: colors.success,
              display: 'inline-block'
            }} />
          </div>
        </div>

        {/* Wire info and current density display */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '500px',
          fontSize: typo.label,
          color: colors.textMuted
        }}>
          <span>Wire: {wireWidth}nm</span>
          <span style={{
            color: currentDensity > 15 ? colors.error : currentDensity > 8 ? colors.warning : colors.success,
            fontWeight: 600
          }}>
            J = {currentDensity} MA/cm²
          </span>
        </div>

        {/* Status indicators */}
        {isAnimating && (
          <div style={{
            display: 'flex',
            gap: '16px',
            fontSize: typo.label,
            color: colors.textSecondary
          }}>
            {voidFormation > 10 && (
              <span style={{ color: colors.error }}>
                Void forming at cathode
              </span>
            )}
            {hillockFormation > 10 && (
              <span style={{ color: colors.warning }}>
                Hillock at anode
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    WebkitTapHighlightColor: 'transparent',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: `linear-gradient(135deg, ${colors.accent}, #d97706)`,
    color: 'white',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'rgba(51, 65, 85, 0.8)',
    color: colors.textPrimary,
    border: `1px solid ${colors.accent}`,
  };

  // Render content based on phase
  const renderContent = () => {
    switch (phase) {
      case 'hook':
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>Skull</div>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '16px' }}>
              Why Do Chips Eventually Wear Out?
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '16px', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
              Every microprocessor has a hidden death sentence. Deep inside, billions of electrons are slowly destroying the copper wires...
            </p>
            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Silent Killer</h3>
              <p style={{ color: colors.textMuted, fontSize: '14px' }}>
                At the nanoscale, flowing electrons act like a river eroding its banks. Over time, they physically push metal atoms out of place, creating gaps that break circuits.
              </p>
            </div>
            {renderVisualization(false)}
          </div>
        );

      case 'predict':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
              Make Your Prediction
            </h2>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ color: colors.textSecondary, textAlign: 'center' }}>
                What causes copper interconnects in chips to fail over years of use?
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    ...secondaryButtonStyle,
                    background: prediction === p.id
                      ? (p.id === 'electromigration' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                      : 'rgba(51, 65, 85, 0.5)',
                    borderColor: prediction === p.id ? (p.id === 'electromigration' ? colors.success : colors.error) : 'transparent',
                    textAlign: 'left',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {prediction && (
              <div style={{ marginTop: '20px', padding: '16px', background: prediction === 'electromigration' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)', borderRadius: '12px' }}>
                <p style={{ color: prediction === 'electromigration' ? colors.success : colors.warning }}>
                  {prediction === 'electromigration'
                    ? 'Correct! Electromigration is the main reliability concern for chip interconnects.'
                    : 'Not quite. While heat plays a role, the primary mechanism is electron momentum transferring to metal atoms.'}
                </p>
              </div>
            )}
          </div>
        );

      case 'play':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
              Electromigration Simulator
            </h2>
            <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '16px', fontSize: '14px' }}>
              Adjust current density and watch atoms migrate
            </p>

            {renderVisualization(true)}

            <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ color: colors.textSecondary, fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                  Current Density: {currentDensity} MA/cm2
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={currentDensity}
                  onChange={(e) => setCurrentDensity(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ color: colors.textSecondary, fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                  Wire Width: {wireWidth}nm
                </label>
                <input
                  type="range"
                  min="20"
                  max="200"
                  value={wireWidth}
                  onChange={(e) => setWireWidth(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setIsAnimating(!isAnimating)}
                style={isAnimating ? secondaryButtonStyle : primaryButtonStyle}
              >
                {isAnimating ? 'Pause Simulation' : 'Start Simulation'}
              </button>
              <button onClick={resetSimulation} style={secondaryButtonStyle}>
                Reset
              </button>
            </div>

            <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>MTTF</div>
                <div style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 'bold' }}>
                  {mttf.toFixed(1)} years
                </div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>Void Size</div>
                <div style={{ color: colors.error, fontSize: '18px', fontWeight: 'bold' }}>
                  {voidFormation.toFixed(0)}%
                </div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>Hillock Size</div>
                <div style={{ color: colors.warning, fontSize: '18px', fontWeight: 'bold' }}>
                  {hillockFormation.toFixed(0)}%
                </div>
              </div>
            </div>

            {voidFormation > 50 && (
              <div style={{ marginTop: '16px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <p style={{ color: colors.error }}>
                  Critical void formation! Wire approaching failure point.
                </p>
              </div>
            )}
          </div>
        );

      case 'review':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
              Understanding Electromigration
            </h2>

            <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '8px' }}>Black's Equation</div>
              <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                MTTF = A x J^-n x e^(Ea/kT)
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginTop: '8px' }}>
                J = current density, T = temperature, Ea = activation energy
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { icon: 'Zap', title: 'Electron Wind', desc: 'High-energy electrons transfer momentum to metal atoms, pushing them along' },
                { icon: 'Hole', title: 'Void Formation', desc: 'Atoms leave behind empty spaces that grow until the wire breaks' },
                { icon: 'Mountain', title: 'Hillock Growth', desc: 'Displaced atoms pile up elsewhere, potentially causing shorts' },
                { icon: 'TrendingDown', title: 'MTTF vs Current', desc: 'Doubling current density reduces lifetime by 4x (J^-2 relationship)' },
              ].map((item, i) => (
                <div key={i} style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '24px' }}>{item.icon}</div>
                  <div>
                    <h3 style={{ color: colors.textPrimary, margin: '0 0 4px' }}>{item.title}</h3>
                    <p style={{ color: colors.textMuted, margin: 0, fontSize: '14px' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'twist_predict':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.accent, textAlign: 'center', marginBottom: '8px' }}>
              The Temperature Twist
            </h2>
            <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '20px' }}>
              How does operating temperature affect electromigration?
            </p>

            <div style={{ background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ color: colors.textSecondary, textAlign: 'center' }}>
                A chip running at 85C vs 105C - how does failure rate change?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    ...secondaryButtonStyle,
                    background: twistPrediction === p.id
                      ? (p.id === 'exponential' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                      : 'rgba(51, 65, 85, 0.5)',
                    borderColor: twistPrediction === p.id ? (p.id === 'exponential' ? colors.success : colors.error) : 'transparent',
                    textAlign: 'left',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {twistPrediction && (
              <div style={{ marginTop: '20px', padding: '16px', background: twistPrediction === 'exponential' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)', borderRadius: '12px' }}>
                <p style={{ color: twistPrediction === 'exponential' ? colors.success : colors.warning }}>
                  {twistPrediction === 'exponential'
                    ? 'Correct! The Arrhenius term (e^(Ea/kT)) means temperature has an exponential effect - a 10C increase can halve the lifetime!'
                    : 'Not quite. Temperature appears in an exponential term - small increases dramatically accelerate atom migration.'}
                </p>
              </div>
            )}
          </div>
        );

      case 'twist_play':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
              Temperature vs Reliability
            </h2>
            <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '16px', fontSize: '14px' }}>
              See how temperature dramatically affects chip lifetime
            </p>

            {renderVisualization(true, true)}

            <div style={{ marginTop: '20px' }}>
              <label style={{ color: colors.textSecondary, fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                Junction Temperature: {temperature}C
              </label>
              <input
                type="range"
                min="25"
                max="150"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>MTTF at {temperature}C</div>
                <div style={{ color: mttf < 10 ? colors.error : colors.success, fontSize: '24px', fontWeight: 'bold' }}>
                  {mttf.toFixed(1)} years
                </div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>vs 25C baseline</div>
                <div style={{ color: colors.warning, fontSize: '24px', fontWeight: 'bold' }}>
                  {(calculateMTTF() / (1e12 * Math.pow(currentDensity, -2) * Math.exp(0.7 / (8.617e-5 * 298)) / 1e6) * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', padding: '12px' }}>
              <p style={{ color: colors.textSecondary, fontSize: '14px', textAlign: 'center', margin: 0 }}>
                <strong style={{ color: colors.error }}>Key insight:</strong> Every 10-15C increase roughly halves the chip's lifetime!
              </p>
            </div>
          </div>
        );

      case 'twist_review':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
              Thermal Management is Reliability
            </h2>

            <div style={{ background: 'linear-gradient(135deg, #ef4444, #f59e0b)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
                Cooling = Longer Life
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '8px' }}>
                Better heatsinks and lower temps directly extend chip reliability
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>Snowflake</div>
                <div style={{ color: colors.success, fontWeight: 'bold' }}>Cool Operation</div>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>65C = 20+ year MTTF</div>
              </div>
              <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>Fire</div>
                <div style={{ color: colors.error, fontWeight: 'bold' }}>Hot Operation</div>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>105C = 3-5 year MTTF</div>
              </div>
            </div>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Why This Matters</h3>
              <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                <li>Gaming laptops throttle to protect chip lifetime</li>
                <li>Data centers invest heavily in cooling infrastructure</li>
                <li>Automotive chips are rated for higher temps but derated</li>
                <li>Overclocking reduces long-term reliability significantly</li>
              </ul>
            </div>
          </div>
        );

      case 'transfer':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '20px' }}>
              Explore all 4 applications to continue
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {transferApplications.map((app, i) => (
                <div
                  key={i}
                  onClick={() => setTransferCompleted(prev => new Set([...prev, i]))}
                  style={{
                    background: transferCompleted.has(i) ? 'rgba(16, 185, 129, 0.2)' : colors.bgCard,
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    border: transferCompleted.has(i) ? `2px solid ${colors.success}` : '2px solid transparent',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{ fontSize: '32px', textAlign: 'center', marginBottom: '8px' }}>{app.icon}</div>
                  <h3 style={{ color: colors.textPrimary, fontSize: '14px', textAlign: 'center', margin: '0 0 8px' }}>
                    {app.title}
                  </h3>
                  <p style={{ color: colors.textMuted, fontSize: '11px', textAlign: 'center', margin: 0 }}>
                    {app.description}
                  </p>
                  {transferCompleted.has(i) && (
                    <div style={{ color: colors.success, textAlign: 'center', marginTop: '8px', fontSize: '12px' }}>
                      Explored
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <p style={{ color: colors.textMuted }}>
                Progress: {transferCompleted.size}/4 applications
              </p>
            </div>
          </div>
        );

      case 'test':
        if (testSubmitted) {
          return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                {testScore >= 7 ? 'Trophy' : 'Book'}
              </div>
              <h3 style={{ color: colors.textPrimary, fontSize: '24px', marginBottom: '8px' }}>
                Score: {testScore}/10
              </h3>
              <p style={{ color: testScore >= 7 ? colors.success : colors.warning, marginBottom: '24px' }}>
                {testScore >= 7 ? 'Excellent! You understand electromigration!' : 'Review the concepts and try again.'}
              </p>

              <div style={{ textAlign: 'left', marginBottom: '24px' }}>
                {testQuestions.map((q, i) => (
                  <div key={i} style={{
                    padding: '12px',
                    marginBottom: '8px',
                    borderRadius: '8px',
                    background: testAnswers[i] !== null && q.options[testAnswers[i]!].correct
                      ? 'rgba(16, 185, 129, 0.2)'
                      : 'rgba(239, 68, 68, 0.2)'
                  }}>
                    <p style={{ color: colors.textPrimary, fontSize: '14px', margin: '0 0 4px' }}>
                      {i + 1}. {q.question}
                    </p>
                    <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>
                      Correct: {q.options.find(o => o.correct)?.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
              Knowledge Check
            </h2>

            <div style={{ marginBottom: '20px' }}>
              {testQuestions.map((q, qIndex) => (
                <div key={qIndex} style={{ marginBottom: '24px', background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
                  <p style={{ color: colors.textPrimary, fontWeight: 'bold', marginBottom: '12px' }}>
                    {qIndex + 1}. {q.question}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {q.options.map((opt, oIndex) => (
                      <button
                        key={oIndex}
                        onClick={() => handleTestAnswer(qIndex, oIndex)}
                        style={{
                          ...secondaryButtonStyle,
                          background: testAnswers[qIndex] === oIndex ? 'rgba(245, 158, 11, 0.3)' : 'rgba(51, 65, 85, 0.5)',
                          borderColor: testAnswers[qIndex] === oIndex ? colors.accent : 'transparent',
                          textAlign: 'left',
                          fontSize: '14px',
                          padding: '10px 16px',
                        }}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={submitTest}
              disabled={testAnswers.includes(null)}
              style={{
                ...primaryButtonStyle,
                width: '100%',
                opacity: testAnswers.includes(null) ? 0.5 : 1,
                cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
              }}
            >
              Submit Answers
            </button>
          </div>
        );

      case 'mastery':
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.textPrimary, fontSize: '28px', marginBottom: '16px' }}>
              Electromigration Master!
            </h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You now understand why chips wear out and how engineers design for reliability.
            </p>

            <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
              <h3 style={{ color: colors.accent, marginBottom: '16px' }}>Key Takeaways</h3>
              <ul style={{ color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
                <li style={{ marginBottom: '8px' }}>Electrons push metal atoms, creating voids and hillocks</li>
                <li style={{ marginBottom: '8px' }}>MTTF scales with J^-2 (current density is critical)</li>
                <li style={{ marginBottom: '8px' }}>Temperature has exponential effect on failure rate</li>
                <li style={{ marginBottom: '8px' }}>Cooling directly improves chip reliability</li>
                <li>Design rules limit current density for long lifetimes</li>
              </ul>
            </div>

            <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '12px', padding: '16px' }}>
              <p style={{ color: 'white', margin: 0, fontWeight: 'bold' }}>
                Score: {testScore}/10
              </p>
            </div>
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
        return { canGoNext: true, nextLabel: 'Investigate Electromigration' };
      case 'predict':
        return { canGoNext: !!prediction, nextLabel: 'See It In Action' };
      case 'play':
        return { canGoNext: true, nextLabel: 'Continue to Review' };
      case 'review':
        return { canGoNext: true, nextLabel: 'Discover Temperature Effect' };
      case 'twist_predict':
        return { canGoNext: !!twistPrediction, nextLabel: 'Explore Temperature Effects' };
      case 'twist_play':
        return { canGoNext: true, nextLabel: 'Continue' };
      case 'twist_review':
        return { canGoNext: true, nextLabel: 'See Real Applications' };
      case 'transfer':
        return { canGoNext: transferCompleted.size >= 4, nextLabel: transferCompleted.size >= 4 ? 'Take the Test' : `Explore ${4 - transferCompleted.size} more` };
      case 'test':
        if (testSubmitted) {
          return { canGoNext: testScore >= 7, nextLabel: testScore >= 7 ? 'Complete!' : 'Continue Anyway' };
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
      background: `linear-gradient(135deg, ${colors.bgPrimary} 0%, #1e293b 100%)`,
      color: colors.textPrimary
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {renderContent()}
        </div>
      </div>
      {renderBottomBar(navState.canGoNext, navState.nextLabel)}
    </div>
  );
};

export default ElectromigrationRenderer;
