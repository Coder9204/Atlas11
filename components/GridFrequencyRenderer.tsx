'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

// ────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ────────────────────────────────────────────────────────────────────────────

type Phase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

const phaseOrder: Phase[] = [
  'hook',
  'predict',
  'play',
  'review',
  'twist_predict',
  'twist_play',
  'twist_review',
  'transfer',
  'test',
  'mastery',
];

const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Battery Response',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery',
};

// ────────────────────────────────────────────────────────────────────────────
// SOUND UTILITY
// ────────────────────────────────────────────────────────────────────────────

const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
      click: { freq: 600, duration: 0.1, type: 'sine' },
      success: { freq: 800, duration: 0.2, type: 'sine' },
      failure: { freq: 300, duration: 0.3, type: 'sine' },
      transition: { freq: 500, duration: 0.15, type: 'sine' },
      complete: { freq: 900, duration: 0.4, type: 'sine' },
    };
    const sound = sounds[type];
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// ────────────────────────────────────────────────────────────────────────────
// COLOR PALETTE
// ────────────────────────────────────────────────────────────────────────────

const colors = {
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  accent: '#8b5cf6',
  accentDark: '#7c3aed',
  warning: '#f59e0b',
  success: '#22c55e',
  danger: '#ef4444',
  bgDark: '#0f172a',
  bgCard: '#1e293b',
  bgCardLight: '#334155',
  border: '#475569',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
};

interface GridFrequencyRendererProps {
  gamePhase?: Phase;  // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// 10-QUESTION TEST DATA
// ────────────────────────────────────────────────────────────────────────────

const TEST_QUESTIONS = [
  {
    question: 'What is the standard grid frequency in North America?',
    options: [
      { text: '50 Hz', correct: false },
      { text: '60 Hz', correct: true },
      { text: '100 Hz', correct: false },
      { text: '120 Hz', correct: false },
    ],
  },
  {
    question: 'What happens to grid frequency when electricity demand exceeds supply?',
    options: [
      { text: 'Frequency increases', correct: false },
      { text: 'Frequency decreases', correct: true },
      { text: 'Frequency stays constant', correct: false },
      { text: 'Voltage increases instead', correct: false },
    ],
  },
  {
    question: 'What provides inertia in the traditional power grid?',
    options: [
      { text: 'Solar panels', correct: false },
      { text: 'Transformers', correct: false },
      { text: 'Spinning mass of generators', correct: true },
      { text: 'Power lines', correct: false },
    ],
  },
  {
    question: 'What is frequency droop control?',
    options: [
      { text: 'A fault condition when frequency drops too low', correct: false },
      { text: 'Automatic power adjustment based on frequency deviation', correct: true },
      { text: 'Manual frequency control by operators', correct: false },
      { text: 'Frequency variation during peak hours', correct: false },
    ],
  },
  {
    question: 'Why is maintaining grid frequency important?',
    options: [
      { text: 'Only for electric clocks', correct: false },
      { text: 'Equipment damage, motor speed issues, and potential blackouts', correct: true },
      { text: 'It is not actually important', correct: false },
      { text: 'Only for billing purposes', correct: false },
    ],
  },
  {
    question: 'What happens when you suddenly turn on a large load like an AC unit?',
    options: [
      { text: 'Grid frequency momentarily increases', correct: false },
      { text: 'Grid frequency momentarily decreases', correct: true },
      { text: 'No effect on frequency', correct: false },
      { text: 'Voltage drops but frequency stays same', correct: false },
    ],
  },
  {
    question: 'How fast can battery storage respond to frequency changes?',
    options: [
      { text: 'Several minutes', correct: false },
      { text: 'About 30 seconds', correct: false },
      { text: 'Milliseconds', correct: true },
      { text: 'Hours', correct: false },
    ],
  },
  {
    question: 'What is the typical acceptable frequency deviation on power grids?',
    options: [
      { text: 'Plus or minus 5 Hz', correct: false },
      { text: 'Plus or minus 0.5 Hz', correct: true },
      { text: 'Plus or minus 10 Hz', correct: false },
      { text: 'No deviation is acceptable', correct: false },
    ],
  },
  {
    question: 'What is synthetic inertia?',
    options: [
      { text: 'Fake measurement of grid frequency', correct: false },
      { text: 'Inertia from nuclear power plants', correct: false },
      { text: 'Fast electronic response mimicking generator inertia', correct: true },
      { text: 'Physical flywheels added to substations', correct: false },
    ],
  },
  {
    question: 'Why do solar and wind require special grid integration?',
    options: [
      { text: 'They produce DC power only', correct: false },
      { text: 'They lack rotating mass for natural inertia', correct: true },
      { text: 'They produce too much power', correct: false },
      { text: 'They only work at night', correct: false },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// TRANSFER APPLICATIONS
// ────────────────────────────────────────────────────────────────────────────

const TRANSFER_APPS = [
  {
    title: 'Grid-Scale Battery Storage',
    description: 'Tesla Megapacks and similar systems provide instant frequency response, stabilizing grids with high renewable penetration.',
    icon: '🔋',
  },
  {
    title: 'Virtual Power Plants',
    description: 'Aggregated home batteries and smart devices work together to provide grid services, responding to frequency signals.',
    icon: '🏠',
  },
  {
    title: 'Pumped Hydro Storage',
    description: 'Water pumped uphill during excess supply, released through turbines during high demand, providing massive inertia.',
    icon: '💧',
  },
  {
    title: 'Industrial Load Shedding',
    description: 'Large industrial loads automatically reduce consumption when frequency drops, helping stabilize the grid.',
    icon: '🏭',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export default function GridFrequencyRenderer({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}: GridFrequencyRendererProps) {
  // ──────────────────────────────────────────────────────────────────────────
  // INTERNAL PHASE STATE MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────

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

  // State
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);

  // Play phase state
  const [gridLoad, setGridLoad] = useState(50);
  const [gridSupply, setGridSupply] = useState(50);
  const [frequency, setFrequency] = useState(60);
  const [hasExperimented, setHasExperimented] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);

  // Twist phase state - battery response
  const [batteryEnabled, setBatteryEnabled] = useState(false);
  const [batteryPower, setBatteryPower] = useState(0);
  const [hasExploredTwist, setHasExploredTwist] = useState(false);

  // Transfer and test state
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());
  const [activeAppTab, setActiveAppTab] = useState(0);
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

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);

  // ──────────────────────────────────────────────────────────────────────────
  // NAVIGATION FUNCTIONS
  // ──────────────────────────────────────────────────────────────────────────

  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (navigationLockRef.current) return;

    lastClickRef.current = now;
    navigationLockRef.current = true;

    setPhase(p);
    playSound('transition');

    setTimeout(() => {
      navigationLockRef.current = false;
    }, 300);
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

  // ──────────────────────────────────────────────────────────────────────────
  // PROGRESS BAR COMPONENT
  // ──────────────────────────────────────────────────────────────────────────

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
      }}>
        {/* Back button */}
        <button
          onClick={goBack}
          disabled={currentIdx === 0}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: currentIdx > 0 ? colors.bgCardLight : 'transparent',
            color: currentIdx > 0 ? colors.textSecondary : colors.textMuted,
            cursor: currentIdx > 0 ? 'pointer' : 'not-allowed',
            opacity: currentIdx > 0 ? 1 : 0.4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}
        >
          ←
        </button>

        {/* Progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => i <= currentIdx && goToPhase(p)}
              style={{
                width: i === currentIdx ? '20px' : '10px',
                height: '10px',
                borderRadius: '5px',
                border: 'none',
                backgroundColor: i < currentIdx
                  ? colors.success
                  : i === currentIdx
                    ? colors.primary
                    : colors.border,
                cursor: i <= currentIdx ? 'pointer' : 'default',
                transition: 'all 0.2s',
                opacity: i > currentIdx ? 0.5 : 1,
              }}
              title={phaseLabels[p]}
            />
          ))}
        </div>

        {/* Phase label and count */}
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          color: colors.primary,
          padding: '4px 8px',
          borderRadius: '6px',
          backgroundColor: `${colors.primary}15`,
        }}>
          {currentIdx + 1}/{phaseOrder.length}
        </div>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // BOTTOM NAVIGATION BAR
  // ──────────────────────────────────────────────────────────────────────────

  const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canBack = canGoBack && currentIdx > 0;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px' : '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: '12px',
      }}>
        <button
          onClick={goBack}
          disabled={!canBack}
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
            minHeight: '44px',
          }}
        >
          ← Back
        </button>

        <span style={{
          fontSize: '12px',
          color: colors.textMuted,
          fontWeight: 600,
        }}>
          {phaseLabels[phase]}
        </span>

        <button
          onClick={() => {
            if (!canGoNext) return;
            if (onNext) {
              onNext();
            } else {
              goNext();
            }
          }}
          disabled={!canGoNext}
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: isMobile ? '13px' : '14px',
            background: canGoNext
              ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`
              : colors.bgCardLight,
            color: canGoNext ? colors.textPrimary : colors.textMuted,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            minHeight: '44px',
          }}
        >
          {nextLabel} →
        </button>
      </div>
    );
  };

  // Calculate frequency based on supply/demand balance
  useEffect(() => {
    const imbalance = gridSupply - gridLoad;
    let effectiveImbalance = imbalance;

    // Battery compensation when enabled
    if (batteryEnabled) {
      const compensation = Math.min(Math.abs(imbalance), 30) * Math.sign(-imbalance);
      setBatteryPower(compensation);
      effectiveImbalance = imbalance + compensation;
    } else {
      setBatteryPower(0);
    }

    // Frequency deviation: approximately 0.1 Hz per 5% imbalance
    const newFrequency = 60 + (effectiveImbalance * 0.02);
    setFrequency(Math.max(58, Math.min(62, newFrequency)));
  }, [gridLoad, gridSupply, batteryEnabled]);


  // Handlers
  const handlePrediction = useCallback((choice: string) => {
    setPrediction(choice);
    setShowPredictionFeedback(true);
  }, []);

  const handleTwistPrediction = useCallback((choice: string) => {
    setTwistPrediction(choice);
    setShowTwistFeedback(true);
  }, []);

  const handleLoadChange = useCallback((value: number) => {
    setGridLoad(value);
    setExperimentCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 3) setHasExperimented(true);
      return newCount;
    });
  }, []);

  const handleSupplyChange = useCallback((value: number) => {
    setGridSupply(value);
    setExperimentCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 3) setHasExperimented(true);
      return newCount;
    });
  }, []);

  const handleToggleBattery = useCallback(() => {
    setBatteryEnabled(prev => !prev);
    setHasExploredTwist(true);
  }, []);

  const handleCompleteApp = useCallback((index: number) => {
    setCompletedApps(prev => new Set([...prev, index]));
  }, []);

  const handleTestAnswer = useCallback((qIndex: number, aIndex: number) => {
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[qIndex] = aIndex;
      return newAnswers;
    });
  }, []);

  const handleSubmitTest = useCallback(() => {
    let score = 0;
    testAnswers.forEach((answer, index) => {
      if (answer !== null && TEST_QUESTIONS[index].options[answer].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (score < 7 && onIncorrectAnswer) onIncorrectAnswer();
  }, [testAnswers, onCorrectAnswer, onIncorrectAnswer]);

  // Get frequency status color
  const getFrequencyColor = () => {
    if (frequency >= 59.5 && frequency <= 60.5) return '#22c55e';
    if (frequency >= 59 && frequency <= 61) return '#f59e0b';
    return '#ef4444';
  };

  const getFrequencyStatus = () => {
    if (frequency >= 59.5 && frequency <= 60.5) return 'Normal';
    if (frequency >= 59 && frequency <= 61) return 'Warning';
    return 'Critical';
  };

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER PHASES
  // ────────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '20px',
        marginBottom: '24px',
      }}>
        <span style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%' }} />
        <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600 }}>GRID PHYSICS</span>
      </div>

      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '16px' }}>
        Why Does Grid Frequency Drop When You Turn On the AC?
      </h1>

      <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
        The electricity grid is a delicate balancing act. Every watt consumed must be generated at that exact moment.
      </p>

      <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: '500px', height: 'auto', marginBottom: '32px' }}>
        <defs>
          <linearGradient id="gridGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>

        <rect width="400" height="200" fill="#1e293b" rx="12" />

        {/* Generator */}
        <circle cx="80" cy="100" r="35" fill="none" stroke="url(#gridGrad)" strokeWidth="4" />
        <text x="80" y="105" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold">GEN</text>
        <text x="80" y="150" textAnchor="middle" fill="#94a3b8" fontSize="10">Supply</text>

        {/* Transmission lines */}
        <line x1="120" y1="100" x2="280" y2="100" stroke="#64748b" strokeWidth="3" />
        <circle cx="200" cy="100" r="15" fill="#3b82f6" opacity="0.3">
          <animate attributeName="r" values="10;20;10" dur="1s" repeatCount="indefinite" />
        </circle>

        {/* Load (house with AC) */}
        <rect x="280" y="70" width="60" height="60" fill="none" stroke="#f59e0b" strokeWidth="3" rx="4" />
        <path d="M280 70 L310 50 L340 70" fill="none" stroke="#f59e0b" strokeWidth="3" />
        <text x="310" y="105" textAnchor="middle" fill="#f8fafc" fontSize="10">AC</text>
        <text x="310" y="150" textAnchor="middle" fill="#94a3b8" fontSize="10">Demand</text>

        {/* Frequency display */}
        <rect x="150" y="20" width="100" height="30" fill="#0f172a" rx="6" />
        <text x="200" y="40" textAnchor="middle" fill="#22c55e" fontSize="14" fontWeight="bold">60.00 Hz</text>
      </svg>

      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        padding: '20px',
        borderRadius: '16px',
        marginBottom: '32px',
        textAlign: 'left',
      }}>
        <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.7 }}>
          When you flip on the AC, it instantly draws power. Generators must speed up to meet demand,
          but they have <strong style={{ color: '#3b82f6' }}>inertia</strong> - they cannot respond instantly.
          This causes the grid frequency to momentarily drop.
        </p>
      </div>

      <button
        onClick={goNext}
        style={{
          padding: '16px 40px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Explore Grid Frequency
      </button>
    </div>
  );

  const renderPredict = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '16px' }}>
        Make Your Prediction
      </h2>

      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#93c5fd', fontSize: '14px', lineHeight: 1.6 }}>
          If electricity demand suddenly increases (like everyone turning on AC at 3 PM),
          what happens to the grid frequency?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: 'increase', label: 'Frequency increases above 60 Hz', icon: '📈' },
          { id: 'decrease', label: 'Frequency decreases below 60 Hz', icon: '📉' },
          { id: 'same', label: 'Frequency stays exactly at 60 Hz', icon: '➡️' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: prediction === option.id
                ? '2px solid #3b82f6'
                : '2px solid rgba(100, 116, 139, 0.3)',
              background: prediction === option.id
                ? 'rgba(59, 130, 246, 0.2)'
                : 'rgba(30, 41, 59, 0.5)',
              color: '#f8fafc',
              fontSize: '14px',
              fontWeight: 500,
              cursor: showPredictionFeedback ? 'default' : 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: '20px' }}>{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div style={{
          background: prediction === 'decrease' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
          border: `1px solid ${prediction === 'decrease' ? '#22c55e' : '#f59e0b'}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{ color: prediction === 'decrease' ? '#86efac' : '#fcd34d', fontSize: '14px', lineHeight: 1.6 }}>
            {prediction === 'decrease' ? (
              <><strong>Correct!</strong> When demand exceeds supply, generators slow down slightly, causing frequency to drop. This is the fundamental physics of grid stability.</>
            ) : (
              <><strong>Not quite!</strong> When demand exceeds supply, the extra load slows down the generators, causing frequency to DROP below 60 Hz.</>
            )}
          </p>
        </div>
      )}

      {showPredictionFeedback && (
        <button
          onClick={goNext}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          See the Simulation
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
        Grid Frequency Simulator
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
        Adjust supply and demand to see how frequency responds
      </p>

      {/* Frequency Display */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        textAlign: 'center',
        border: `2px solid ${getFrequencyColor()}`,
      }}>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>GRID FREQUENCY</div>
        <div style={{ fontSize: '48px', fontWeight: 'bold', color: getFrequencyColor() }}>
          {frequency.toFixed(2)} Hz
        </div>
        <div style={{
          display: 'inline-block',
          padding: '4px 12px',
          background: `${getFrequencyColor()}20`,
          borderRadius: '20px',
          fontSize: '12px',
          color: getFrequencyColor(),
          fontWeight: 600,
          marginTop: '8px',
        }}>
          {getFrequencyStatus()}
        </div>
      </div>

      {/* SVG Visualization */}
      <svg viewBox="0 0 400 180" style={{ width: '100%', maxWidth: '500px', height: 'auto', marginBottom: '24px' }}>
        <rect width="400" height="180" fill="#0f172a" rx="12" />

        {/* Supply side */}
        <rect x="20" y="40" width="120" height="100" fill="rgba(34, 197, 94, 0.1)" stroke="#22c55e" strokeWidth="2" rx="8" />
        <text x="80" y="65" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">SUPPLY</text>
        <rect x="40" y="80" width="80" height="20" fill="#1e293b" rx="4" />
        <rect x="40" y="80" width={gridSupply * 0.8} height="20" fill="#22c55e" rx="4" />
        <text x="80" y="130" textAnchor="middle" fill="#f8fafc" fontSize="14" fontWeight="bold">{gridSupply}%</text>

        {/* Balance indicator */}
        <g transform={`translate(200, 90)`}>
          <line x1="-30" y1="0" x2="30" y2="0" stroke="#64748b" strokeWidth="2" />
          <polygon
            points="-10,-15 10,-15 0,0"
            fill={frequency > 60 ? '#22c55e' : frequency < 60 ? '#ef4444' : '#64748b'}
            transform={`rotate(${(frequency - 60) * 30})`}
          />
        </g>

        {/* Demand side */}
        <rect x="260" y="40" width="120" height="100" fill="rgba(239, 68, 68, 0.1)" stroke="#ef4444" strokeWidth="2" rx="8" />
        <text x="320" y="65" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">DEMAND</text>
        <rect x="280" y="80" width="80" height="20" fill="#1e293b" rx="4" />
        <rect x="280" y="80" width={gridLoad * 0.8} height="20" fill="#ef4444" rx="4" />
        <text x="320" y="130" textAnchor="middle" fill="#f8fafc" fontSize="14" fontWeight="bold">{gridLoad}%</text>
      </svg>

      {/* Controls */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
          Grid Supply: {gridSupply}%
        </label>
        <input
          type="range"
          min="20"
          max="80"
          value={gridSupply}
          onChange={(e) => handleSupplyChange(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#22c55e' }}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
          Grid Demand: {gridLoad}%
        </label>
        <input
          type="range"
          min="20"
          max="80"
          value={gridLoad}
          onChange={(e) => handleLoadChange(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#ef4444' }}
        />
      </div>

      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#93c5fd', fontSize: '13px', lineHeight: 1.6 }}>
          <strong>Try this:</strong> Increase demand beyond supply and watch frequency drop.
          Then increase supply to stabilize. This is what grid operators do constantly!
        </p>
      </div>

      <button
        onClick={goNext}
        disabled={!hasExperimented}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          background: hasExperimented
            ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
            : '#475569',
          border: 'none',
          borderRadius: '12px',
          cursor: hasExperimented ? 'pointer' : 'not-allowed',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {hasExperimented ? 'Continue to Review' : `Experiment more (${Math.max(0, 3 - experimentCount)} changes left)`}
      </button>
    </div>
  );

  const renderReview = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '24px' }}>
        Understanding Grid Frequency
      </h2>

      <div style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '8px' }}>The Balance Equation</div>
        <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>Supply = Demand = Stable Frequency</div>
      </div>

      {[
        {
          icon: '⚡',
          title: 'Generator Inertia',
          desc: 'Spinning generators have rotational kinetic energy. When demand increases, this stored energy is briefly released, slowing the generators.',
        },
        {
          icon: '📉',
          title: 'Frequency Droop',
          desc: 'Generators are programmed to automatically increase power output when frequency drops - this is called droop control.',
        },
        {
          icon: '⏱️',
          title: 'Response Time',
          desc: 'Traditional generators take seconds to minutes to fully respond. This delay is why frequency fluctuates during sudden load changes.',
        },
      ].map((item, i) => (
        <div key={i} style={{
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px',
          display: 'flex',
          gap: '12px',
        }}>
          <span style={{ fontSize: '24px' }}>{item.icon}</span>
          <div>
            <h4 style={{ color: '#f8fafc', fontWeight: 'bold', marginBottom: '4px' }}>{item.title}</h4>
            <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.5 }}>{item.desc}</p>
          </div>
        </div>
      ))}

      <button
        onClick={goNext}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          marginTop: '16px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Now for a Twist...
      </button>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '16px' }}>
        The Battery Revolution
      </h2>

      <div style={{
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#fcd34d', fontSize: '14px', lineHeight: 1.6 }}>
          Traditional generators take seconds to respond. But what about batteries?
          How quickly can battery storage respond to frequency changes?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: 'slow', label: 'About the same as generators (seconds)', icon: '🐢' },
          { id: 'medium', label: 'Faster but still takes a second', icon: '🚶' },
          { id: 'fast', label: 'Nearly instant - milliseconds!', icon: '⚡' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: twistPrediction === option.id
                ? '2px solid #f59e0b'
                : '2px solid rgba(100, 116, 139, 0.3)',
              background: twistPrediction === option.id
                ? 'rgba(245, 158, 11, 0.2)'
                : 'rgba(30, 41, 59, 0.5)',
              color: '#f8fafc',
              fontSize: '14px',
              fontWeight: 500,
              cursor: showTwistFeedback ? 'default' : 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: '20px' }}>{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div style={{
          background: twistPrediction === 'fast' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
          border: `1px solid ${twistPrediction === 'fast' ? '#22c55e' : '#f59e0b'}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{ color: twistPrediction === 'fast' ? '#86efac' : '#fcd34d', fontSize: '14px', lineHeight: 1.6 }}>
            {twistPrediction === 'fast' ? (
              <><strong>Exactly right!</strong> Batteries can respond in milliseconds - orders of magnitude faster than any spinning generator. This is revolutionizing grid stability.</>
            ) : (
              <><strong>Even faster!</strong> Batteries respond in milliseconds, not seconds. They have no mechanical inertia to overcome - pure electronic response.</>
            )}
          </p>
        </div>
      )}

      {showTwistFeedback && (
        <button
          onClick={goNext}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white',
            background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          See Battery Response
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
        Battery Frequency Response
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
        Enable battery storage to see instant stabilization
      </p>

      {/* Frequency Display with Battery */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        textAlign: 'center',
        border: `2px solid ${getFrequencyColor()}`,
      }}>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>GRID FREQUENCY</div>
        <div style={{ fontSize: '48px', fontWeight: 'bold', color: getFrequencyColor() }}>
          {frequency.toFixed(2)} Hz
        </div>
        {batteryEnabled && batteryPower !== 0 && (
          <div style={{
            marginTop: '12px',
            padding: '8px 16px',
            background: 'rgba(34, 197, 94, 0.2)',
            borderRadius: '8px',
            display: 'inline-block',
          }}>
            <span style={{ color: '#22c55e', fontSize: '14px' }}>
              Battery: {batteryPower > 0 ? '+' : ''}{batteryPower.toFixed(1)}% compensation
            </span>
          </div>
        )}
      </div>

      {/* Battery Toggle */}
      <button
        onClick={handleToggleBattery}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '12px',
          border: 'none',
          background: batteryEnabled
            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
            : 'linear-gradient(135deg, #475569 0%, #334155 100%)',
          color: 'white',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span style={{ fontSize: '20px' }}>🔋</span>
        {batteryEnabled ? 'Battery Storage: ACTIVE' : 'Enable Battery Storage'}
      </button>

      {/* Controls */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
          Grid Demand: {gridLoad}%
        </label>
        <input
          type="range"
          min="20"
          max="80"
          value={gridLoad}
          onChange={(e) => setGridLoad(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#ef4444' }}
        />
      </div>

      <div style={{
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#fcd34d', fontSize: '13px', lineHeight: 1.6 }}>
          <strong>Notice:</strong> With battery enabled, frequency stays much more stable even with
          rapid demand changes. The battery provides "synthetic inertia" electronically.
        </p>
      </div>

      <button
        onClick={goNext}
        disabled={!hasExploredTwist}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          background: hasExploredTwist
            ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
            : '#475569',
          border: 'none',
          borderRadius: '12px',
          cursor: hasExploredTwist ? 'pointer' : 'not-allowed',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {hasExploredTwist ? 'Continue' : 'Toggle the battery to continue'}
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '24px' }}>
        The Future of Grid Stability
      </h2>

      <div style={{
        background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '8px' }}>Response Time Comparison</div>
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '12px' }}>
          <div>
            <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>~10 sec</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>Gas Turbine</div>
          </div>
          <div>
            <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>~20 ms</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>Battery</div>
          </div>
        </div>
      </div>

      {[
        {
          icon: '⚡',
          title: 'Synthetic Inertia',
          desc: 'Batteries and inverters can provide virtual inertia through fast power injection, mimicking the stabilizing effect of spinning mass.',
        },
        {
          icon: '🔄',
          title: 'Grid-Forming Inverters',
          desc: 'New inverter technology can actually set grid frequency, not just follow it - enabling 100% renewable grids.',
        },
        {
          icon: '🌍',
          title: 'Global Transition',
          desc: 'As renewables replace thermal plants, fast-responding storage becomes essential for grid stability worldwide.',
        },
      ].map((item, i) => (
        <div key={i} style={{
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px',
          display: 'flex',
          gap: '12px',
        }}>
          <span style={{ fontSize: '24px' }}>{item.icon}</span>
          <div>
            <h4 style={{ color: '#f8fafc', fontWeight: 'bold', marginBottom: '4px' }}>{item.title}</h4>
            <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.5 }}>{item.desc}</p>
          </div>
        </div>
      ))}

      <button
        onClick={goNext}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          marginTop: '16px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        See Real Applications
      </button>
    </div>
  );

  const renderTransfer = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
        Real-World Applications
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
        Complete all 4 to unlock the assessment
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto' }}>
        {TRANSFER_APPS.map((app, index) => (
          <button
            key={index}
            onClick={() => setActiveAppTab(index)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeAppTab === index
                ? '#3b82f6'
                : completedApps.has(index)
                ? 'rgba(34, 197, 94, 0.2)'
                : 'rgba(51, 65, 85, 0.5)',
              color: activeAppTab === index ? 'white' : completedApps.has(index) ? '#22c55e' : '#94a3b8',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {completedApps.has(index) && '✓'} App {index + 1}
          </button>
        ))}
      </div>

      {/* Active App Content */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '16px' }}>
          {TRANSFER_APPS[activeAppTab].icon}
        </div>
        <h3 style={{ color: '#f8fafc', fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>
          {TRANSFER_APPS[activeAppTab].title}
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, textAlign: 'center', marginBottom: '20px' }}>
          {TRANSFER_APPS[activeAppTab].description}
        </p>

        {!completedApps.has(activeAppTab) ? (
          <button
            onClick={() => handleCompleteApp(activeAppTab)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Mark as Complete
          </button>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '12px',
            background: 'rgba(34, 197, 94, 0.2)',
            borderRadius: '8px',
            color: '#22c55e',
            fontWeight: 'bold',
          }}>
            Completed
          </div>
        )}
      </div>

      {/* Progress */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>Progress</span>
          <span style={{ color: '#3b82f6', fontSize: '14px', fontWeight: 'bold' }}>{completedApps.size}/4</span>
        </div>
        <div style={{ height: '8px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '4px' }}>
          <div style={{
            height: '100%',
            width: `${(completedApps.size / 4) * 100}%`,
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      <button
        onClick={goNext}
        disabled={completedApps.size < 4}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          background: completedApps.size >= 4
            ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
            : '#475569',
          border: 'none',
          borderRadius: '12px',
          cursor: completedApps.size >= 4 ? 'pointer' : 'not-allowed',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {completedApps.size >= 4 ? 'Take the Assessment' : `Complete ${4 - completedApps.size} more`}
      </button>
    </div>
  );

  const renderTest = () => {
    const answeredCount = testAnswers.filter(a => a !== null).length;

    if (testSubmitted) {
      return (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: testScore >= 7
              ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
              : 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <span style={{ fontSize: '36px' }}>{testScore >= 7 ? '⚡' : '📚'}</span>
          </div>

          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
            {testScore}/10 Correct
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
            {testScore >= 7 ? 'Excellent! You understand grid frequency stability!' : 'Review the concepts and try again.'}
          </p>

          {/* Answer Review */}
          <div style={{ textAlign: 'left', marginBottom: '24px' }}>
            {TEST_QUESTIONS.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{
                  background: isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '8px',
                }}>
                  <p style={{ color: '#f8fafc', fontSize: '13px', marginBottom: '8px' }}>
                    {qIndex + 1}. {q.question}
                  </p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{
                      color: opt.correct ? '#22c55e' : userAnswer === oIndex ? '#ef4444' : '#64748b',
                      fontSize: '12px',
                      padding: '2px 0',
                    }}>
                      {opt.correct ? '✓' : userAnswer === oIndex ? '✗' : '○'} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <button
            onClick={goNext}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: 'white',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {testScore >= 7 ? 'Complete Lesson' : 'Continue Anyway'}
          </button>
        </div>
      );
    }

    return (
      <div style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
          Knowledge Assessment
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
          10 questions - 70% to pass
        </p>

        {/* Progress */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#94a3b8', fontSize: '14px' }}>Progress</span>
            <span style={{ color: '#8b5cf6', fontSize: '14px', fontWeight: 'bold' }}>{answeredCount}/10</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '4px' }}>
            <div style={{
              height: '100%',
              width: `${(answeredCount / 10) * 100}%`,
              background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Questions */}
        <div style={{ marginBottom: '24px' }}>
          {TEST_QUESTIONS.map((q, qIndex) => (
            <div key={qIndex} style={{
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <span style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: testAnswers[qIndex] !== null ? '#8b5cf6' : '#475569',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}>
                  {qIndex + 1}
                </span>
                <p style={{ color: '#f8fafc', fontSize: '14px', lineHeight: 1.5 }}>{q.question}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '36px' }}>
                {q.options.map((opt, oIndex) => (
                  <button
                    key={oIndex}
                    onClick={() => handleTestAnswer(qIndex, oIndex)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: testAnswers[qIndex] === oIndex ? '#8b5cf6' : 'rgba(51, 65, 85, 0.5)',
                      color: testAnswers[qIndex] === oIndex ? 'white' : '#cbd5e1',
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent',
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
          onClick={handleSubmitTest}
          disabled={answeredCount < 10}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white',
            background: answeredCount >= 10
              ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
              : '#475569',
            border: 'none',
            borderRadius: '12px',
            cursor: answeredCount >= 10 ? 'pointer' : 'not-allowed',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {answeredCount >= 10 ? 'Submit Assessment' : `Answer ${10 - answeredCount} more questions`}
        </button>
      </div>
    );
  };

  const renderMastery = () => (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <div style={{
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
        boxShadow: '0 0 40px rgba(59, 130, 246, 0.4)',
      }}>
        <span style={{ fontSize: '48px' }}>⚡</span>
      </div>

      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
        Grid Frequency Master!
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '32px' }}>
        You now understand the physics of grid stability
      </p>

      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'left',
      }}>
        <h3 style={{ color: '#3b82f6', fontWeight: 'bold', marginBottom: '16px' }}>Key Takeaways</h3>
        {[
          'Grid frequency reflects the real-time balance between supply and demand',
          'Generator inertia provides natural stability but responds slowly',
          'Batteries can respond in milliseconds, providing synthetic inertia',
          'Frequency droop control automatically adjusts power output',
          'The future grid will rely heavily on fast-responding storage',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
            <span style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#3b82f6',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              flexShrink: 0,
            }}>✓</span>
            <span style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>

      <div style={{
        background: 'rgba(139, 92, 246, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#a5b4fc', fontSize: '14px' }}>
          Assessment Score: <strong>{testScore}/10</strong>
        </p>
      </div>

      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '16px 40px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#3b82f6',
          background: 'transparent',
          border: '2px solid #3b82f6',
          borderRadius: '12px',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Review Again
      </button>
    </div>
  );

  // Main render - wrap each phase with progress bar and bottom bar
  const renderPhaseContent = () => {
    switch (phase) {
      case 'hook':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>{renderHook()}</div>
            {renderBottomBar(false, true, 'Start Learning')}
          </>
        );
      case 'predict':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>{renderPredict()}</div>
            {renderBottomBar(true, showPredictionFeedback, 'Continue')}
          </>
        );
      case 'play':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>{renderPlay()}</div>
            {renderBottomBar(true, hasExperimented, 'Continue')}
          </>
        );
      case 'review':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>{renderReview()}</div>
            {renderBottomBar(true, true, 'Next: The Twist')}
          </>
        );
      case 'twist_predict':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>{renderTwistPredict()}</div>
            {renderBottomBar(true, showTwistFeedback, 'Continue')}
          </>
        );
      case 'twist_play':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>{renderTwistPlay()}</div>
            {renderBottomBar(true, hasExploredTwist, 'Continue')}
          </>
        );
      case 'twist_review':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>{renderTwistReview()}</div>
            {renderBottomBar(true, true, 'Applications')}
          </>
        );
      case 'transfer':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>{renderTransfer()}</div>
            {renderBottomBar(true, completedApps.size >= 4, 'Take Test')}
          </>
        );
      case 'test':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>{renderTest()}</div>
            {!testSubmitted && renderBottomBar(true, false, 'Submit Test')}
          </>
        );
      case 'mastery':
        return (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>{renderMastery()}</div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        color: 'white',
      }}
    >
      {/* Progress Bar Header */}
      {renderProgressBar()}

      {/* Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        maxWidth: '600px',
        width: '100%',
        margin: '0 auto',
      }}>
        {renderPhaseContent()}
      </div>
    </div>
  );
}
