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
  twist_play: 'High-Impedance Faults',
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
  primary: '#ef4444',
  primaryDark: '#dc2626',
  accent: '#f59e0b',
  accentDark: '#d97706',
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

interface GroundFaultRendererProps {
  gamePhase?: Phase;  // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// 10-QUESTION TEST DATA
// ────────────────────────────────────────────────────────────────────────────

const TEST_QUESTIONS = [
  {
    question: 'What does a GFCI (Ground Fault Circuit Interrupter) detect?',
    options: [
      { text: 'High voltage on the line', correct: false },
      { text: 'Imbalance between hot and neutral current', correct: true },
      { text: 'Temperature of the wire', correct: false },
      { text: 'Frequency of the AC power', correct: false },
    ],
  },
  {
    question: 'In a normal circuit, the current in hot and neutral wires should be:',
    options: [
      { text: 'Hot current should be higher', correct: false },
      { text: 'Neutral current should be higher', correct: false },
      { text: 'Equal (all current returns through neutral)', correct: true },
      { text: 'They have no relationship', correct: false },
    ],
  },
  {
    question: 'At what current imbalance does a typical GFCI trip?',
    options: [
      { text: '1 amp', correct: false },
      { text: '5 milliamps (0.005A)', correct: true },
      { text: '15 amps', correct: false },
      { text: '100 milliamps', correct: false },
    ],
  },
  {
    question: 'What is a "ground fault"?',
    options: [
      { text: 'When the ground wire breaks', correct: false },
      { text: 'Current flowing through an unintended path to ground', correct: true },
      { text: 'When voltage is too low', correct: false },
      { text: 'A type of lightning strike', correct: false },
    ],
  },
  {
    question: 'Why are GFCIs required in bathrooms and kitchens?',
    options: [
      { text: 'Higher voltage is used there', correct: false },
      { text: 'Water increases the risk of ground faults through people', correct: true },
      { text: 'Appliances use more power', correct: false },
      { text: 'Building codes are stricter there', correct: false },
    ],
  },
  {
    question: 'What is a high-impedance ground fault?',
    options: [
      { text: 'A fault with very high current flow', correct: false },
      { text: 'A fault where resistance limits current to low levels', correct: true },
      { text: 'A fault on high voltage lines only', correct: false },
      { text: 'A fault that causes fires immediately', correct: false },
    ],
  },
  {
    question: 'How does a GFCI detect current imbalance?',
    options: [
      { text: 'Using a temperature sensor', correct: false },
      { text: 'Measuring voltage drop', correct: false },
      { text: 'Using a current transformer that senses the difference', correct: true },
      { text: 'Counting electrons', correct: false },
    ],
  },
  {
    question: 'What is residual current?',
    options: [
      { text: 'Current left over after a device turns off', correct: false },
      { text: 'The difference between line and return current (leakage)', correct: true },
      { text: 'Current that flows through the ground wire', correct: false },
      { text: 'Current measured after the circuit breaker', correct: false },
    ],
  },
  {
    question: 'In solar PV systems, what monitors for ground faults?',
    options: [
      { text: 'The solar panels themselves', correct: false },
      { text: 'Ground fault detection in the inverter', correct: true },
      { text: 'The utility meter', correct: false },
      { text: 'Lightning arresters', correct: false },
    ],
  },
  {
    question: 'Why are high-impedance faults dangerous even with low current?',
    options: [
      { text: 'They make loud noises', correct: false },
      { text: 'They can cause arcing and fires without tripping breakers', correct: true },
      { text: 'They damage the neutral wire', correct: false },
      { text: 'They are not actually dangerous', correct: false },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// TRANSFER APPLICATIONS
// ────────────────────────────────────────────────────────────────────────────

const TRANSFER_APPS = [
  {
    title: 'Bathroom & Kitchen GFCI',
    description: 'Required by code near water. Detects current leakage through a person to ground in milliseconds, preventing electrocution.',
    icon: '🚿',
  },
  {
    title: 'Solar PV Ground Fault Detection',
    description: 'Inverters monitor DC string current balance. Faults in rooftop wiring are detected before causing fires.',
    icon: '☀️',
  },
  {
    title: 'Industrial Isolation Monitoring',
    description: 'Ungrounded (IT) systems use insulation monitoring to detect first faults before they become dangerous.',
    icon: '🏭',
  },
  {
    title: 'Arc Fault Circuit Interrupters',
    description: 'AFCIs detect dangerous arcing signatures from damaged wires, preventing electrical fires in homes.',
    icon: '🔥',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export default function GroundFaultRenderer({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}: GroundFaultRendererProps) {
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
  const [hotCurrent, setHotCurrent] = useState(10); // Amps
  const [leakageCurrent, setLeakageCurrent] = useState(0); // mA through ground fault
  const [gfciTripped, setGfciTripped] = useState(false);
  const [hasExperimented, setHasExperimented] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);
  const [animationTime, setAnimationTime] = useState(0);

  // Twist phase state - high impedance faults
  const [faultImpedance, setFaultImpedance] = useState(1000); // Ohms
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

  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const animationRef = useRef<number>();

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

  // Animation
  useEffect(() => {
    const animate = () => {
      setAnimationTime(prev => prev + 0.05);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Calculate values
  const neutralCurrent = hotCurrent - (leakageCurrent / 1000);
  const imbalance = leakageCurrent;
  const tripThreshold = 5; // mA

  // GFCI trip logic
  useEffect(() => {
    if (leakageCurrent >= tripThreshold && !gfciTripped) {
      setGfciTripped(true);
    }
  }, [leakageCurrent, gfciTripped]);

  // High impedance fault calculations
  const lineVoltage = 120; // V
  const highImpedanceFaultCurrent = (lineVoltage / faultImpedance) * 1000; // mA
  const canTripGFCI = highImpedanceFaultCurrent >= 5;
  const canTripBreaker = highImpedanceFaultCurrent >= 15000; // 15A breaker


  // Handlers
  const handlePrediction = useCallback((choice: string) => {
    setPrediction(choice);
    setShowPredictionFeedback(true);
  }, []);

  const handleTwistPrediction = useCallback((choice: string) => {
    setTwistPrediction(choice);
    setShowTwistFeedback(true);
  }, []);

  const handleLeakageChange = useCallback((value: number) => {
    if (!gfciTripped) {
      setLeakageCurrent(value);
      setExperimentCount(prev => {
        const newCount = prev + 1;
        if (newCount >= 3) setHasExperimented(true);
        return newCount;
      });
    }
  }, [gfciTripped]);

  const handleResetGFCI = useCallback(() => {
    setGfciTripped(false);
    setLeakageCurrent(0);
  }, []);

  const handleImpedanceChange = useCallback((value: number) => {
    setFaultImpedance(value);
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
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: '20px',
        marginBottom: '24px',
      }}>
        <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }} />
        <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>ELECTRICAL SAFETY</span>
      </div>

      <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '16px' }}>
        How Does the System Know If You Touch a Live Wire?
      </h1>

      <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
        Electricity flows in a circuit - out through hot, back through neutral. But if current escapes through YOU, how does the system detect it?
      </p>

      <svg viewBox="0 0 400 220" style={{ width: '100%', maxWidth: '500px', height: 'auto', marginBottom: '32px' }}>
        <rect width="400" height="220" fill="#1e293b" rx="12" />

        {/* Power source */}
        <rect x="20" y="80" width="50" height="60" fill="none" stroke="#ef4444" strokeWidth="2" rx="4" />
        <text x="45" y="115" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">120V</text>

        {/* Hot wire */}
        <line x1="70" y1="95" x2="150" y2="95" stroke="#ef4444" strokeWidth="3" />
        <text x="110" y="85" textAnchor="middle" fill="#ef4444" fontSize="10">HOT (10A)</text>

        {/* GFCI box */}
        <rect x="150" y="70" width="80" height="80" fill="#1e3a5f" stroke="#3b82f6" strokeWidth="2" rx="8" />
        <text x="190" y="100" textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="bold">GFCI</text>
        <text x="190" y="115" textAnchor="middle" fill="#94a3b8" fontSize="9">Detects</text>
        <text x="190" y="128" textAnchor="middle" fill="#94a3b8" fontSize="9">Imbalance</text>

        {/* Load */}
        <rect x="280" y="80" width="60" height="60" fill="none" stroke="#f59e0b" strokeWidth="2" rx="4" />
        <text x="310" y="115" textAnchor="middle" fill="#f59e0b" fontSize="11">LOAD</text>

        {/* Hot continuation */}
        <line x1="230" y1="95" x2="280" y2="95" stroke="#ef4444" strokeWidth="3" />

        {/* Neutral wire */}
        <line x1="280" y1="125" x2="230" y2="125" stroke="#60a5fa" strokeWidth="3" />
        <line x1="150" y1="125" x2="70" y2="125" stroke="#60a5fa" strokeWidth="3" />
        <text x="110" y="145" textAnchor="middle" fill="#60a5fa" fontSize="10">NEUTRAL (10A)</text>

        {/* Person touching wire - danger scenario */}
        <circle cx="260" cy="170" r="15" fill="none" stroke="#22c55e" strokeWidth="2" />
        <line x1="260" y1="155" x2="260" y2="140" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4" />
        <text x="260" y="200" textAnchor="middle" fill="#f59e0b" fontSize="10">Leakage path?</text>

        {/* Ground symbol */}
        <g transform="translate(260, 185)">
          <line x1="0" y1="0" x2="0" y2="10" stroke="#22c55e" strokeWidth="2" />
          <line x1="-8" y1="10" x2="8" y2="10" stroke="#22c55e" strokeWidth="2" />
          <line x1="-5" y1="15" x2="5" y2="15" stroke="#22c55e" strokeWidth="2" />
          <line x1="-2" y1="20" x2="2" y2="20" stroke="#22c55e" strokeWidth="2" />
        </g>

        {/* Question */}
        <text x="200" y="35" textAnchor="middle" fill="#f8fafc" fontSize="13">
          If current leaks through the person, what changes?
        </text>
      </svg>

      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        padding: '20px',
        borderRadius: '16px',
        marginBottom: '32px',
        textAlign: 'left',
      }}>
        <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.7 }}>
          The key insight: In a healthy circuit, <strong style={{ color: '#ef4444' }}>hot current</strong> equals
          <strong style={{ color: '#60a5fa' }}> neutral current</strong>. If current escapes through another path
          (like a person), there's an <strong style={{ color: '#f59e0b' }}>imbalance</strong> - and that's detectable!
        </p>
      </div>

    </div>
  );

  const renderPredict = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '16px' }}>
        Make Your Prediction
      </h2>

      <div style={{
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#fca5a5', fontSize: '14px', lineHeight: 1.6 }}>
          A circuit is drawing 10 amps. If someone touches a live wire and 5 milliamps (0.005A)
          flows through them to ground, what will the hot and neutral currents be?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: 'both10', label: 'Both stay at 10A (unchanged)', icon: '=' },
          { id: 'hot10neutral9995', label: 'Hot: 10A, Neutral: 9.995A (5mA difference)', icon: '📊' },
          { id: 'bothIncrease', label: 'Both increase to handle the extra load', icon: '📈' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: prediction === option.id
                ? '2px solid #ef4444'
                : '2px solid rgba(100, 116, 139, 0.3)',
              background: prediction === option.id
                ? 'rgba(239, 68, 68, 0.2)'
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
          background: prediction === 'hot10neutral9995' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
          border: `1px solid ${prediction === 'hot10neutral9995' ? '#22c55e' : '#f59e0b'}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{ color: prediction === 'hot10neutral9995' ? '#86efac' : '#fcd34d', fontSize: '14px', lineHeight: 1.6 }}>
            {prediction === 'hot10neutral9995' ? (
              <><strong>Exactly!</strong> The 5mA that flows through the person goes to ground instead of returning through neutral. Hot current remains 10A, but neutral only gets 9.995A back. This tiny 5mA difference is what GFCIs detect!</>
            ) : (
              <><strong>Not quite!</strong> Current that flows to ground doesn't return through neutral. So hot stays at 10A, but neutral drops to 9.995A - a 5mA imbalance that GFCIs can detect.</>
            )}
          </p>
        </div>
      )}

    </div>
  );

  const renderPlay = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
        GFCI Circuit Simulator
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
        Simulate ground fault leakage and see when the GFCI trips
      </p>

      {/* GFCI Status */}
      <div style={{
        background: gfciTripped
          ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
          : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center',
        border: gfciTripped ? '2px solid #fca5a5' : '2px solid #22c55e',
      }}>
        <div style={{ fontSize: '12px', color: gfciTripped ? 'white' : '#94a3b8', marginBottom: '8px' }}>
          GFCI STATUS
        </div>
        <div style={{ fontSize: '36px', fontWeight: 'bold', color: gfciTripped ? 'white' : '#22c55e' }}>
          {gfciTripped ? 'TRIPPED!' : 'ACTIVE'}
        </div>
        {gfciTripped && (
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '8px' }}>
            Circuit disconnected - ground fault detected
          </div>
        )}
      </div>

      {/* Circuit visualization */}
      <svg viewBox="0 0 400 180" style={{ width: '100%', maxWidth: '500px', height: 'auto', marginBottom: '24px' }}>
        <rect width="400" height="180" fill="#0f172a" rx="12" />

        {/* Hot wire with current indicator */}
        <line x1="30" y1="50" x2="370" y2="50" stroke={gfciTripped ? '#64748b' : '#ef4444'} strokeWidth="4" />
        <text x="200" y="40" textAnchor="middle" fill={gfciTripped ? '#64748b' : '#ef4444'} fontSize="11">
          HOT: {gfciTripped ? '0' : hotCurrent.toFixed(3)}A
        </text>

        {/* Animated current flow on hot (if not tripped) */}
        {!gfciTripped && (
          <>
            {[0, 1, 2, 3].map(i => (
              <circle
                key={i}
                cx={30 + ((animationTime * 50 + i * 85) % 340)}
                cy="50"
                r="4"
                fill="#fca5a5"
                opacity={0.8}
              />
            ))}
          </>
        )}

        {/* Neutral wire with current indicator */}
        <line x1="30" y1="130" x2="370" y2="130" stroke={gfciTripped ? '#64748b' : '#60a5fa'} strokeWidth="4" />
        <text x="200" y="150" textAnchor="middle" fill={gfciTripped ? '#64748b' : '#60a5fa'} fontSize="11">
          NEUTRAL: {gfciTripped ? '0' : neutralCurrent.toFixed(3)}A
        </text>

        {/* Animated current flow on neutral (if not tripped) */}
        {!gfciTripped && (
          <>
            {[0, 1, 2, 3].map(i => (
              <circle
                key={i}
                cx={370 - ((animationTime * 50 + i * 85) % 340)}
                cy="130"
                r="4"
                fill="#93c5fd"
                opacity={0.8}
              />
            ))}
          </>
        )}

        {/* Leakage path */}
        {leakageCurrent > 0 && !gfciTripped && (
          <>
            <line x1="280" y1="50" x2="280" y2="90" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4" />
            <circle cx="280" cy="90" r="10" fill="none" stroke="#f59e0b" strokeWidth="2" />
            <line x1="280" y1="100" x2="280" y2="130" stroke="#22c55e" strokeWidth="2" strokeDasharray="4" />
            <text x="310" y="95" fill="#f59e0b" fontSize="10">{leakageCurrent}mA leak</text>
          </>
        )}

        {/* GFCI detector */}
        <rect x="100" y="40" width="60" height="100" fill="#1e3a5f" stroke={gfciTripped ? '#ef4444' : '#3b82f6'} strokeWidth="2" rx="6" />
        <text x="130" y="80" textAnchor="middle" fill={gfciTripped ? '#ef4444' : '#3b82f6'} fontSize="10" fontWeight="bold">GFCI</text>
        <text x="130" y="95" textAnchor="middle" fill="#94a3b8" fontSize="9">
          {imbalance}mA
        </text>
        <text x="130" y="108" textAnchor="middle" fill="#94a3b8" fontSize="9">imbalance</text>
        {!gfciTripped && imbalance > 0 && imbalance < 5 && (
          <text x="130" y="125" textAnchor="middle" fill="#f59e0b" fontSize="8">Monitoring...</text>
        )}
      </svg>

      {/* Leakage slider */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
          Ground Fault Leakage: {leakageCurrent} mA
          {leakageCurrent >= 5 && <span style={{ color: '#ef4444' }}> (TRIP THRESHOLD!)</span>}
        </label>
        <input
          type="range"
          min="0"
          max="10"
          step="1"
          value={leakageCurrent}
          onChange={(e) => handleLeakageChange(parseInt(e.target.value))}
          disabled={gfciTripped}
          style={{ width: '100%', accentColor: leakageCurrent >= 5 ? '#ef4444' : '#f59e0b' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
          <span>0 mA (Safe)</span>
          <span style={{ color: '#ef4444' }}>5 mA (Trip)</span>
          <span>10 mA</span>
        </div>
      </div>

      {gfciTripped && (
        <button
          onClick={handleResetGFCI}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '2px solid #ef4444',
            background: 'transparent',
            color: '#ef4444',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginBottom: '16px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Reset GFCI
        </button>
      )}

      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#93c5fd', fontSize: '13px', lineHeight: 1.6 }}>
          <strong>Key insight:</strong> The GFCI compares hot and neutral current. Any difference means
          current is escaping somewhere - potentially through a person! 5mA is enough to cause harm,
          so that's the trip threshold.
        </p>
      </div>

      {!hasExperimented && (
        <div style={{
          textAlign: 'center',
          padding: '12px',
          background: 'rgba(245, 158, 11, 0.1)',
          borderRadius: '8px',
          color: '#fcd34d',
          fontSize: '13px',
        }}>
          Experiment more ({Math.max(0, 3 - experimentCount)} adjustments left)
        </div>
      )}
    </div>
  );

  const renderReview = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '24px' }}>
        How GFCIs Save Lives
      </h2>

      <div style={{
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '8px' }}>The Detection Principle</div>
        <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>I_hot - I_neutral = I_leakage</div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginTop: '8px' }}>
          Any imbalance {'≥'} 5mA triggers disconnection in ~25ms
        </div>
      </div>

      {[
        {
          icon: '🔄',
          title: 'Current Transformer Sensing',
          desc: 'Hot and neutral pass through a toroidal transformer. If currents are equal, the magnetic fields cancel. Any imbalance induces a voltage that triggers the trip.',
        },
        {
          icon: '⚡',
          title: 'Why 5 milliamps?',
          desc: 'Human heart fibrillation can occur at 10-30mA. The 5mA threshold provides a safety margin, tripping before dangerous current levels.',
        },
        {
          icon: '⏱️',
          title: 'Fast Response',
          desc: 'GFCIs trip in about 1/40th of a second (25 milliseconds). This is faster than the time needed for electrical shock to cause harm.',
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

    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '16px' }}>
        The Hidden Danger: High-Impedance Faults
      </h2>

      <div style={{
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#fcd34d', fontSize: '14px', lineHeight: 1.6 }}>
          A wire is damaged and touching a wooden beam (high resistance).
          The fault current is only 100mA - well below the 15A circuit breaker.
          What's the danger?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: 'safe', label: 'Low current means no danger', icon: '✅' },
          { id: 'breaker', label: 'Breaker will trip eventually', icon: '⏱️' },
          { id: 'fire', label: 'Low current can still cause arcing and fire!', icon: '🔥' },
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
          background: twistPrediction === 'fire' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
          border: `1px solid ${twistPrediction === 'fire' ? '#22c55e' : '#f59e0b'}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{ color: twistPrediction === 'fire' ? '#86efac' : '#fcd34d', fontSize: '14px', lineHeight: 1.6 }}>
            {twistPrediction === 'fire' ? (
              <><strong>Correct!</strong> Even 100mA through a high-resistance path can cause arcing and heat. P = I²R means even small current through resistance creates heat. The breaker doesn't trip, but the fault can smolder for hours before igniting a fire!</>
            ) : (
              <><strong>Dangerous misconception!</strong> High-impedance faults are silent killers. 100mA won't trip a 15A breaker, but arcing at the fault point can start fires. This is why arc fault detection (AFCI) was invented.</>
            )}
          </p>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
        High-Impedance Fault Simulator
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
        See how fault impedance affects detection
      </p>

      {/* Fault analysis */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>FAULT IMPEDANCE</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>{faultImpedance}Ω</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>FAULT CURRENT</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: highImpedanceFaultCurrent > 100 ? '#ef4444' : '#22c55e' }}>
              {highImpedanceFaultCurrent.toFixed(0)} mA
            </div>
          </div>
        </div>

        {/* Detection status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            padding: '8px 12px',
            borderRadius: '8px',
            background: canTripGFCI ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>GFCI Detection (5mA)</span>
            <span style={{ color: canTripGFCI ? '#22c55e' : '#ef4444', fontSize: '12px', fontWeight: 'bold' }}>
              {canTripGFCI ? 'WILL TRIP' : 'NO TRIP'}
            </span>
          </div>
          <div style={{
            padding: '8px 12px',
            borderRadius: '8px',
            background: canTripBreaker ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Circuit Breaker (15A)</span>
            <span style={{ color: canTripBreaker ? '#22c55e' : '#ef4444', fontSize: '12px', fontWeight: 'bold' }}>
              {canTripBreaker ? 'WILL TRIP' : 'NO TRIP'}
            </span>
          </div>
        </div>
      </div>

      {/* Impedance slider */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
          Fault Impedance: {faultImpedance} Ohms
        </label>
        <input
          type="range"
          min="1"
          max="50000"
          step="100"
          value={faultImpedance}
          onChange={(e) => handleImpedanceChange(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#f59e0b' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
          <span>1Ω (Direct short)</span>
          <span>50kΩ (Dry wood)</span>
        </div>
      </div>

      {/* Power calculation */}
      <div style={{
        background: !canTripGFCI && !canTripBreaker ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
        border: `1px solid ${!canTripGFCI && !canTripBreaker ? '#ef4444' : '#22c55e'}`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: !canTripGFCI && !canTripBreaker ? '#fca5a5' : '#86efac', fontSize: '13px', lineHeight: 1.6 }}>
          <strong>Power at fault: {(Math.pow(highImpedanceFaultCurrent / 1000, 2) * faultImpedance).toFixed(2)} Watts</strong>
          <br />
          {!canTripGFCI && !canTripBreaker ? (
            <>Even this small power can cause arcing and heat buildup over time. Without GFCI, this fault goes undetected but can start a fire!</>
          ) : canTripGFCI ? (
            <>GFCI will detect this fault and trip, preventing potential fire hazard.</>
          ) : (
            <>Circuit breaker will trip at this current level.</>
          )}
        </p>
      </div>

      {!hasExploredTwist && (
        <div style={{
          textAlign: 'center',
          padding: '12px',
          background: 'rgba(245, 158, 11, 0.1)',
          borderRadius: '8px',
          color: '#fcd34d',
          fontSize: '13px',
        }}>
          Adjust the impedance slider to continue
        </div>
      )}
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '24px' }}>
        Protection Layers
      </h2>

      <div style={{
        background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '8px' }}>Protection Hierarchy</div>
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '12px' }}>
          <div>
            <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>GFCI</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>5mA shock</div>
          </div>
          <div>
            <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>AFCI</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>Arc/fire</div>
          </div>
          <div>
            <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>Breaker</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>Overload</div>
          </div>
        </div>
      </div>

      {[
        {
          icon: '⚡',
          title: 'GFCI - Personnel Protection',
          desc: 'Detects current imbalance from ground faults. Protects people from electrocution. Required near water.',
        },
        {
          icon: '🔥',
          title: 'AFCI - Fire Prevention',
          desc: 'Detects arcing signatures from damaged wires. Protects against fires from high-impedance faults that breakers miss.',
        },
        {
          icon: '🔒',
          title: 'Combination Devices',
          desc: 'Modern code often requires dual-function AFCI/GFCI breakers that provide both types of protection.',
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
                ? '#ef4444'
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
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
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
          <span style={{ color: '#ef4444', fontSize: '14px', fontWeight: 'bold' }}>{completedApps.size}/4</span>
        </div>
        <div style={{ height: '8px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '4px' }}>
          <div style={{
            height: '100%',
            width: `${(completedApps.size / 4) * 100}%`,
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {completedApps.size < 4 && (
        <div style={{
          textAlign: 'center',
          padding: '12px',
          background: 'rgba(245, 158, 11, 0.1)',
          borderRadius: '8px',
          color: '#fcd34d',
          fontSize: '13px',
        }}>
          Complete {4 - completedApps.size} more application(s) to continue
        </div>
      )}
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
            <span style={{ fontSize: '36px' }}>{testScore >= 7 ? '🛡️' : '📚'}</span>
          </div>

          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
            {testScore}/10 Correct
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
            {testScore >= 7 ? 'Excellent! You understand ground fault detection!' : 'Review the concepts and try again.'}
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
            <span style={{ color: '#ef4444', fontSize: '14px', fontWeight: 'bold' }}>{answeredCount}/10</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '4px' }}>
            <div style={{
              height: '100%',
              width: `${(answeredCount / 10) * 100}%`,
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
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
                  background: testAnswers[qIndex] !== null ? '#ef4444' : '#475569',
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
                      background: testAnswers[qIndex] === oIndex ? '#ef4444' : 'rgba(51, 65, 85, 0.5)',
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
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
        boxShadow: '0 0 40px rgba(239, 68, 68, 0.4)',
      }}>
        <span style={{ fontSize: '48px' }}>🛡️</span>
      </div>

      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
        Ground Fault Detection Master!
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '32px' }}>
        You now understand electrical safety protection
      </p>

      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'left',
      }}>
        <h3 style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '16px' }}>Key Takeaways</h3>
        {[
          'GFCIs detect current imbalance between hot and neutral',
          '5mA difference triggers trip in about 25 milliseconds',
          'High-impedance faults may not trip breakers but can cause fires',
          'AFCIs detect arcing signatures for fire prevention',
          'Multiple protection layers provide defense in depth',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
            <span style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#ef4444',
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
        background: 'rgba(239, 68, 68, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#fca5a5', fontSize: '14px' }}>
          Assessment Score: <strong>{testScore}/10</strong>
        </p>
      </div>
    </div>
  );

  // Main render
  const renderContent = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return null;
    }
  };

  // Determine bottom bar state based on phase
  const getBottomBarState = () => {
    switch (phase) {
      case 'hook':
        return { canBack: false, canNext: true, label: 'Make a Prediction' };
      case 'predict':
        return { canBack: true, canNext: showPredictionFeedback, label: 'Try the GFCI Simulator' };
      case 'play':
        return { canBack: true, canNext: hasExperimented, label: 'Continue to Review' };
      case 'review':
        return { canBack: true, canNext: true, label: 'Now for a Twist...' };
      case 'twist_predict':
        return { canBack: true, canNext: showTwistFeedback, label: 'Explore High-Impedance Faults' };
      case 'twist_play':
        return { canBack: true, canNext: hasExploredTwist, label: 'Continue' };
      case 'twist_review':
        return { canBack: true, canNext: true, label: 'See Real Applications' };
      case 'transfer':
        return { canBack: true, canNext: completedApps.size >= 4, label: 'Take the Assessment' };
      case 'test':
        return { canBack: true, canNext: testSubmitted, label: testScore >= 7 ? 'Complete Lesson' : 'Continue Anyway' };
      case 'mastery':
        return { canBack: true, canNext: false, label: 'Review Again' };
      default:
        return { canBack: true, canNext: true, label: 'Continue' };
    }
  };

  const bottomState = getBottomBarState();

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      background: `linear-gradient(135deg, ${colors.bgDark} 0%, #1e1b4b 50%, ${colors.bgDark} 100%)`,
      color: colors.textPrimary,
      overflow: 'hidden',
    }}>
      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Main Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      {phase !== 'mastery' && renderBottomBar(bottomState.canBack, bottomState.canNext, bottomState.label)}

      {/* Mastery phase has its own button */}
      {phase === 'mastery' && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: isMobile ? '12px' : '12px 16px',
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.bgCard,
        }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '16px 40px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: colors.primary,
              background: 'transparent',
              border: `2px solid ${colors.primary}`,
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            Review Again
          </button>
        </div>
      )}
    </div>
  );
}
