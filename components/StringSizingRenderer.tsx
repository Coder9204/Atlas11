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
  twist_play: 'Temperature Effects',
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
  primary: '#eab308',
  primaryDark: '#ca8a04',
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

interface StringSizingRendererProps {
  gamePhase?: Phase;  // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// 10-QUESTION TEST DATA
// ────────────────────────────────────────────────────────────────────────────

const TEST_QUESTIONS = [
  {
    question: 'When solar panels are connected in series, what adds up?',
    options: [
      { text: 'Current (amps)', correct: false },
      { text: 'Voltage (volts)', correct: true },
      { text: 'Both current and voltage', correct: false },
      { text: 'Neither - power just increases', correct: false },
    ],
  },
  {
    question: 'Why do inverters have a maximum input voltage limit?',
    options: [
      { text: 'To limit power output', correct: false },
      { text: 'Higher voltage could damage the inverter electronics', correct: true },
      { text: 'To match grid frequency', correct: false },
      { text: 'For billing purposes', correct: false },
    ],
  },
  {
    question: 'What is the MPPT range of an inverter?',
    options: [
      { text: 'The temperature range it can operate in', correct: false },
      { text: 'The voltage window where it can track maximum power', correct: true },
      { text: 'The maximum panel count', correct: false },
      { text: 'The warranty period', correct: false },
    ],
  },
  {
    question: 'What happens to solar panel voltage when temperature increases?',
    options: [
      { text: 'Voltage increases significantly', correct: false },
      { text: 'Voltage decreases significantly', correct: true },
      { text: 'Voltage stays the same', correct: false },
      { text: 'Voltage fluctuates randomly', correct: false },
    ],
  },
  {
    question: 'Why must you consider the coldest expected temperature when sizing strings?',
    options: [
      { text: 'Panels produce more power when cold', correct: false },
      { text: 'Cold temperatures increase voltage, risking inverter damage', correct: true },
      { text: 'Cold panels are more fragile', correct: false },
      { text: 'Installers cannot work in cold weather', correct: false },
    ],
  },
  {
    question: 'A panel rated at 40V Voc will produce approximately what voltage at -10C vs 25C?',
    options: [
      { text: 'Lower voltage at -10C', correct: false },
      { text: 'Same voltage at both temperatures', correct: false },
      { text: 'Higher voltage at -10C (around 44V)', correct: true },
      { text: 'Zero voltage at -10C', correct: false },
    ],
  },
  {
    question: 'What does Voc stand for?',
    options: [
      { text: 'Voltage operating current', correct: false },
      { text: 'Variable output control', correct: false },
      { text: 'Open-circuit voltage (no load connected)', correct: true },
      { text: 'Volts of capacity', correct: false },
    ],
  },
  {
    question: 'If you connect too few panels in a string, what happens?',
    options: [
      { text: 'The inverter runs more efficiently', correct: false },
      { text: 'String voltage may drop below MPPT range, losing power', correct: true },
      { text: 'Nothing - fewer panels is always fine', correct: false },
      { text: 'The panels will overheat', correct: false },
    ],
  },
  {
    question: 'What is the typical temperature coefficient for voltage on silicon panels?',
    options: [
      { text: 'About +0.3%/C (increases with heat)', correct: false },
      { text: 'About -0.3%/C (decreases with heat)', correct: true },
      { text: 'About -3%/C', correct: false },
      { text: 'Temperature has no effect', correct: false },
    ],
  },
  {
    question: 'Why do commercial installations use string sizing software?',
    options: [
      { text: 'Required by law', correct: false },
      { text: 'To account for local temperature extremes and specific equipment', correct: true },
      { text: 'Software is cheaper than calculations', correct: false },
      { text: 'Installers cannot do math', correct: false },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// TRANSFER APPLICATIONS
// ────────────────────────────────────────────────────────────────────────────

const TRANSFER_APPS = [
  {
    title: 'Residential Rooftop Systems',
    description: 'Home systems typically use 8-12 panels per string, carefully sized for the inverter MPPT range and local temperature extremes.',
    icon: '🏠',
  },
  {
    title: 'Utility-Scale Solar Farms',
    description: 'Large installations use central inverters with multiple string combiner boxes. String length is optimized for cable costs and voltage drop.',
    icon: '☀️',
  },
  {
    title: 'Cold Climate Installations',
    description: 'In northern regions, winter cold can push string voltage 15-20% higher. Fewer panels per string prevent inverter damage.',
    icon: '❄️',
  },
  {
    title: 'Desert Installations',
    description: 'Hot climates reduce voltage but increase current. More panels can be strung together, but thermal management is critical.',
    icon: '🏜️',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export default function StringSizingRenderer({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}: StringSizingRendererProps) {
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
  const [panelCount, setPanelCount] = useState(8);
  const [panelVoc, setPanelVoc] = useState(40); // Volts per panel
  const [inverterMaxV, setInverterMaxV] = useState(450);
  const [inverterMpptMin, setInverterMpptMin] = useState(150);
  const [inverterMpptMax, setInverterMpptMax] = useState(400);
  const [hasExperimented, setHasExperimented] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);

  // Twist phase state - temperature effects
  const [temperature, setTemperature] = useState(25); // Celsius
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

  // Calculate string voltage with temperature compensation
  const tempCoefficient = -0.003; // -0.3% per degree C (typical for silicon)
  const stcTemp = 25; // Standard Test Conditions temperature
  const tempDelta = temperature - stcTemp;
  const voltageAdjustment = 1 + (tempCoefficient * tempDelta);
  const adjustedVoc = panelVoc * voltageAdjustment;
  const stringVoltage = panelCount * adjustedVoc;

  // Check string status
  const isOverVoltage = stringVoltage > inverterMaxV;
  const isInMpptRange = stringVoltage >= inverterMpptMin && stringVoltage <= inverterMpptMax;
  const isBelowMppt = stringVoltage < inverterMpptMin;

  const getStatusColor = () => {
    if (isOverVoltage) return '#ef4444';
    if (isBelowMppt) return '#f59e0b';
    if (isInMpptRange) return '#22c55e';
    return '#f59e0b';
  };

  const getStatusText = () => {
    if (isOverVoltage) return 'DANGER: Over Max Voltage!';
    if (isBelowMppt) return 'Warning: Below MPPT Range';
    if (isInMpptRange) return 'Optimal: In MPPT Range';
    return 'Warning: Above MPPT Range';
  };


  // Handlers
  const handlePrediction = useCallback((choice: string) => {
    setPrediction(choice);
    setShowPredictionFeedback(true);
  }, []);

  const handleTwistPrediction = useCallback((choice: string) => {
    setTwistPrediction(choice);
    setShowTwistFeedback(true);
  }, []);

  const handlePanelCountChange = useCallback((value: number) => {
    setPanelCount(value);
    setExperimentCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 3) setHasExperimented(true);
      return newCount;
    });
  }, []);

  const handleTemperatureChange = useCallback((value: number) => {
    setTemperature(value);
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
        background: 'rgba(234, 179, 8, 0.1)',
        border: '1px solid rgba(234, 179, 8, 0.2)',
        borderRadius: '20px',
        marginBottom: '24px',
      }}>
        <span style={{ width: '8px', height: '8px', background: '#eab308', borderRadius: '50%' }} />
        <span style={{ fontSize: '12px', color: '#eab308', fontWeight: 600 }}>SOLAR ENGINEERING</span>
      </div>

      <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '16px' }}>
        Why Can't You Just Connect Any Number of Solar Panels Together?
      </h1>

      <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
        Too few panels and you lose power. Too many and you destroy your inverter. The sweet spot depends on physics!
      </p>

      <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: '500px', height: 'auto', marginBottom: '32px' }}>
        <rect width="400" height="200" fill="#1e293b" rx="12" />

        {/* Solar panels in series */}
        {[0, 1, 2, 3, 4].map(i => (
          <g key={i} transform={`translate(${50 + i * 60}, 60)`}>
            <rect width="50" height="70" fill="#1e40af" stroke="#3b82f6" strokeWidth="2" rx="4" />
            <line x1="10" y1="15" x2="40" y2="15" stroke="#60a5fa" strokeWidth="1" />
            <line x1="10" y1="30" x2="40" y2="30" stroke="#60a5fa" strokeWidth="1" />
            <line x1="10" y1="45" x2="40" y2="45" stroke="#60a5fa" strokeWidth="1" />
            <text x="25" y="65" textAnchor="middle" fill="#94a3b8" fontSize="10">40V</text>
          </g>
        ))}

        {/* Connection lines */}
        <line x1="100" y1="95" x2="110" y2="95" stroke="#eab308" strokeWidth="2" />
        <line x1="160" y1="95" x2="170" y2="95" stroke="#eab308" strokeWidth="2" />
        <line x1="220" y1="95" x2="230" y2="95" stroke="#eab308" strokeWidth="2" />
        <line x1="280" y1="95" x2="290" y2="95" stroke="#eab308" strokeWidth="2" />

        {/* Plus signs */}
        {[135, 195, 255].map((x, i) => (
          <text key={i} x={x} y="100" textAnchor="middle" fill="#eab308" fontSize="16" fontWeight="bold">+</text>
        ))}

        {/* Equals */}
        <text x="340" y="100" textAnchor="middle" fill="#f8fafc" fontSize="16">=</text>

        {/* Total */}
        <text x="375" y="100" textAnchor="middle" fill="#22c55e" fontSize="18" fontWeight="bold">200V</text>

        {/* Question */}
        <text x="200" y="170" textAnchor="middle" fill="#f59e0b" fontSize="14">
          But the inverter max is 450V... Can we add more?
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
          Solar panels in series add their voltages together. But inverters have strict limits -
          both a <strong style={{ color: '#ef4444' }}>maximum voltage</strong> that can damage it,
          and an <strong style={{ color: '#22c55e' }}>MPPT range</strong> where it operates efficiently.
        </p>
      </div>

      <button
        onClick={goNext}
        style={{
          padding: '16px 40px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Learn String Sizing
      </button>
    </div>
  );

  const renderPredict = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '16px' }}>
        Make Your Prediction
      </h2>

      <div style={{
        background: 'rgba(234, 179, 8, 0.1)',
        border: '1px solid rgba(234, 179, 8, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#fcd34d', fontSize: '14px', lineHeight: 1.6 }}>
          You have panels rated at 40V each and an inverter with 450V max input.
          What's the maximum number of panels you can safely connect in one string?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: '8', label: '8 panels (320V) - stay well below max', icon: '🔒' },
          { id: '11', label: '11 panels (440V) - just under the limit', icon: '⚠️' },
          { id: '15', label: '15 panels (600V) - more is better!', icon: '🚀' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: prediction === option.id
                ? '2px solid #eab308'
                : '2px solid rgba(100, 116, 139, 0.3)',
              background: prediction === option.id
                ? 'rgba(234, 179, 8, 0.2)'
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
          background: prediction === '8' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
          border: `1px solid ${prediction === '8' ? '#22c55e' : '#f59e0b'}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{ color: prediction === '8' ? '#86efac' : '#fcd34d', fontSize: '14px', lineHeight: 1.6 }}>
            {prediction === '8' ? (
              <><strong>Smart thinking!</strong> While 11 panels seems safe at room temperature, we need margin for cold weather when voltage increases. 8-10 is often the safe choice.</>
            ) : prediction === '11' ? (
              <><strong>Close, but risky!</strong> At 25C this works, but on a cold morning panels produce HIGHER voltage. 440V could spike to 500V+ and damage the inverter!</>
            ) : (
              <><strong>Danger!</strong> 600V would immediately destroy the inverter. Never exceed the maximum input voltage - it's a hard limit for safety.</>
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
            background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Try the String Sizer
        </button>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
        String Sizing Calculator
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
        Adjust panel count to find the optimal string size
      </p>

      {/* Status Display */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center',
        border: `2px solid ${getStatusColor()}`,
      }}>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>STRING VOLTAGE</div>
        <div style={{ fontSize: '48px', fontWeight: 'bold', color: getStatusColor() }}>
          {stringVoltage.toFixed(0)}V
        </div>
        <div style={{
          display: 'inline-block',
          padding: '4px 12px',
          background: `${getStatusColor()}20`,
          borderRadius: '20px',
          fontSize: '12px',
          color: getStatusColor(),
          fontWeight: 600,
          marginTop: '8px',
        }}>
          {getStatusText()}
        </div>
      </div>

      {/* Visual representation */}
      <svg viewBox="0 0 400 120" style={{ width: '100%', maxWidth: '500px', height: 'auto', marginBottom: '24px' }}>
        <rect width="400" height="120" fill="#0f172a" rx="12" />

        {/* Voltage bar scale */}
        <rect x="20" y="50" width="360" height="30" fill="#1e293b" rx="4" />

        {/* MPPT range */}
        <rect
          x={20 + (inverterMpptMin / 500) * 360}
          y="50"
          width={((inverterMpptMax - inverterMpptMin) / 500) * 360}
          height="30"
          fill="rgba(34, 197, 94, 0.3)"
          rx="0"
        />

        {/* Danger zone */}
        <rect
          x={20 + (inverterMaxV / 500) * 360}
          y="50"
          width={360 - (inverterMaxV / 500) * 360}
          height="30"
          fill="rgba(239, 68, 68, 0.3)"
          rx="0"
        />

        {/* Current voltage marker */}
        <line
          x1={20 + Math.min((stringVoltage / 500) * 360, 360)}
          y1="45"
          x2={20 + Math.min((stringVoltage / 500) * 360, 360)}
          y2="85"
          stroke={getStatusColor()}
          strokeWidth="4"
        />

        {/* Labels */}
        <text x="20" y="100" fill="#64748b" fontSize="10">0V</text>
        <text x={20 + (inverterMpptMin / 500) * 360} y="100" fill="#22c55e" fontSize="10">{inverterMpptMin}V</text>
        <text x={20 + (inverterMpptMax / 500) * 360} y="100" fill="#22c55e" fontSize="10">{inverterMpptMax}V</text>
        <text x={20 + (inverterMaxV / 500) * 360} y="100" fill="#ef4444" fontSize="10">{inverterMaxV}V MAX</text>

        {/* Legend */}
        <rect x="20" y="15" width="15" height="15" fill="rgba(34, 197, 94, 0.3)" />
        <text x="40" y="26" fill="#94a3b8" fontSize="10">MPPT Range</text>
        <rect x="150" y="15" width="15" height="15" fill="rgba(239, 68, 68, 0.3)" />
        <text x="170" y="26" fill="#94a3b8" fontSize="10">Over-voltage Danger</text>
      </svg>

      {/* Panel count slider */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
          Number of Panels: {panelCount}
        </label>
        <input
          type="range"
          min="4"
          max="15"
          value={panelCount}
          onChange={(e) => handlePanelCountChange(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#eab308' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
          <span>4 panels</span>
          <span>15 panels</span>
        </div>
      </div>

      {/* Info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: 'rgba(30, 41, 59, 0.8)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>Panel Voc</div>
          <div style={{ fontSize: '18px', color: '#3b82f6', fontWeight: 'bold' }}>{panelVoc}V</div>
        </div>
        <div style={{ background: 'rgba(30, 41, 59, 0.8)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>Panels x Voltage</div>
          <div style={{ fontSize: '18px', color: '#eab308', fontWeight: 'bold' }}>{panelCount} x {panelVoc}V</div>
        </div>
      </div>

      <div style={{
        background: 'rgba(234, 179, 8, 0.1)',
        border: '1px solid rgba(234, 179, 8, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#fcd34d', fontSize: '13px', lineHeight: 1.6 }}>
          <strong>Goal:</strong> Keep the string voltage within the green MPPT range.
          Too low = lost efficiency. Too high = potential damage!
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
            ? 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)'
            : '#475569',
          border: 'none',
          borderRadius: '12px',
          cursor: hasExperimented ? 'pointer' : 'not-allowed',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {hasExperimented ? 'Continue to Review' : `Try ${Math.max(0, 3 - experimentCount)} more settings`}
      </button>
    </div>
  );

  const renderReview = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '24px' }}>
        String Sizing Fundamentals
      </h2>

      <div style={{
        background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '8px' }}>The String Equation</div>
        <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>V_string = N_panels x V_panel</div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginTop: '8px' }}>
          Series connection adds voltages
        </div>
      </div>

      {[
        {
          icon: '⚡',
          title: 'Maximum Voltage Limit',
          desc: 'Never exceed the inverter\'s max input voltage. This is a hard safety limit - exceeding it causes immediate damage.',
        },
        {
          icon: '🎯',
          title: 'MPPT Range',
          desc: 'Maximum Power Point Tracking works within a voltage window. Outside this range, the inverter cannot optimize power output.',
        },
        {
          icon: '📊',
          title: 'Voc vs Operating Voltage',
          desc: 'Voc (open-circuit voltage) is higher than operating voltage. Always use Voc for max voltage calculations.',
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
          background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
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
        The Temperature Factor
      </h2>

      <div style={{
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#fcd34d', fontSize: '14px', lineHeight: 1.6 }}>
          A string designed for 25C (77F) might see temperatures from -20C (-4F) to +60C (140F).
          What happens to panel voltage when temperature drops significantly?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: 'decreases', label: 'Voltage decreases (panels less efficient in cold)', icon: '📉' },
          { id: 'same', label: 'Voltage stays the same (temperature has no effect)', icon: '➡️' },
          { id: 'increases', label: 'Voltage increases (cold = higher voltage!)', icon: '📈' },
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
          background: twistPrediction === 'increases' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
          border: `1px solid ${twistPrediction === 'increases' ? '#22c55e' : '#f59e0b'}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{ color: twistPrediction === 'increases' ? '#86efac' : '#fcd34d', fontSize: '14px', lineHeight: 1.6 }}>
            {twistPrediction === 'increases' ? (
              <><strong>Correct!</strong> Counter-intuitively, cold panels produce HIGHER voltage. About -0.3% per degree C. A string safe at 25C can exceed limits on a cold winter morning!</>
            ) : (
              <><strong>Surprise!</strong> Cold actually INCREASES voltage. Solar cells have a negative temperature coefficient of about -0.3%/C. This is why string sizing must account for minimum temperatures!</>
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
          See Temperature Effects
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
        Temperature-Adjusted String Sizing
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
        See how temperature changes affect your string voltage
      </p>

      {/* Status Display */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center',
        border: `2px solid ${getStatusColor()}`,
      }}>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
          STRING VOLTAGE @ {temperature}C
        </div>
        <div style={{ fontSize: '48px', fontWeight: 'bold', color: getStatusColor() }}>
          {stringVoltage.toFixed(0)}V
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
          Base: {(panelCount * panelVoc).toFixed(0)}V | Adjusted: {((voltageAdjustment - 1) * 100).toFixed(1)}%
        </div>
        <div style={{
          display: 'inline-block',
          padding: '4px 12px',
          background: `${getStatusColor()}20`,
          borderRadius: '20px',
          fontSize: '12px',
          color: getStatusColor(),
          fontWeight: 600,
          marginTop: '8px',
        }}>
          {getStatusText()}
        </div>
      </div>

      {/* Temperature visualization */}
      <svg viewBox="0 0 400 80" style={{ width: '100%', maxWidth: '500px', height: 'auto', marginBottom: '16px' }}>
        <rect width="400" height="80" fill="#0f172a" rx="12" />

        {/* Temperature scale */}
        <rect x="40" y="30" width="320" height="20" fill="#1e293b" rx="10" />

        {/* Cold zone */}
        <rect x="40" y="30" width="100" height="20" fill="rgba(59, 130, 246, 0.3)" rx="10" />

        {/* Hot zone */}
        <rect x="260" y="30" width="100" height="20" fill="rgba(239, 68, 68, 0.3)" />
        <rect x="350" y="30" width="10" height="20" fill="rgba(239, 68, 68, 0.3)" rx="0 10 10 0" />

        {/* Marker */}
        <circle cx={40 + ((temperature + 20) / 80) * 320} cy="40" r="8" fill="#eab308" stroke="#fef3c7" strokeWidth="2" />

        {/* Labels */}
        <text x="40" y="65" fill="#3b82f6" fontSize="10">-20C</text>
        <text x="150" y="65" fill="#94a3b8" fontSize="10">25C (STC)</text>
        <text x="340" y="65" fill="#ef4444" fontSize="10">60C</text>

        {/* Voltage effect indicator */}
        <text x="200" y="18" textAnchor="middle" fill="#94a3b8" fontSize="11">
          {temperature < 25 ? 'Higher V' : temperature > 25 ? 'Lower V' : 'Rated V'}
        </text>
      </svg>

      {/* Temperature slider */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
          Temperature: {temperature}C ({(temperature * 9/5 + 32).toFixed(0)}F)
        </label>
        <input
          type="range"
          min="-20"
          max="60"
          value={temperature}
          onChange={(e) => handleTemperatureChange(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#f59e0b' }}
        />
      </div>

      {/* Panel count slider */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
          Number of Panels: {panelCount}
        </label>
        <input
          type="range"
          min="4"
          max="15"
          value={panelCount}
          onChange={(e) => setPanelCount(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#eab308' }}
        />
      </div>

      <div style={{
        background: isOverVoltage ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
        border: `1px solid ${isOverVoltage ? '#ef4444' : '#22c55e'}`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: isOverVoltage ? '#fca5a5' : '#86efac', fontSize: '13px', lineHeight: 1.6 }}>
          {isOverVoltage ? (
            <><strong>Warning!</strong> At this cold temperature, the string voltage exceeds the inverter maximum. Reduce panel count or this system will fail in winter!</>
          ) : (
            <><strong>Design tip:</strong> Always check your string at the coldest expected temperature. A design safe for -20C will work year-round.</>
          )}
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
        {hasExploredTwist ? 'Continue' : 'Adjust the temperature slider'}
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '24px' }}>
        Temperature Compensation in Practice
      </h2>

      <div style={{
        background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '8px' }}>Temperature Coefficient Formula</div>
        <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>V_adjusted = V_stc x [1 + Tc x (T - 25)]</div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', marginTop: '8px' }}>
          Tc = -0.003 (-0.3%/C) typical for silicon
        </div>
      </div>

      {[
        {
          icon: '❄️',
          title: 'Design for Coldest Day',
          desc: 'Always calculate maximum string voltage at the coldest expected temperature. This prevents winter damage.',
        },
        {
          icon: '🌡️',
          title: 'Check Hottest Day Too',
          desc: 'Verify string stays in MPPT range on hot days when voltage drops. Too few panels = lost production.',
        },
        {
          icon: '📐',
          title: 'Use Professional Tools',
          desc: 'String sizing software like PVsyst accounts for local climate data, specific panel specs, and installation factors.',
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
          background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
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
                ? '#eab308'
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
              background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
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
          <span style={{ color: '#eab308', fontSize: '14px', fontWeight: 'bold' }}>{completedApps.size}/4</span>
        </div>
        <div style={{ height: '8px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '4px' }}>
          <div style={{
            height: '100%',
            width: `${(completedApps.size / 4) * 100}%`,
            background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
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
            ? 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)'
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
            <span style={{ fontSize: '36px' }}>{testScore >= 7 ? '☀️' : '📚'}</span>
          </div>

          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
            {testScore}/10 Correct
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
            {testScore >= 7 ? 'Excellent! You understand string sizing!' : 'Review the concepts and try again.'}
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
              background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
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
            <span style={{ color: '#eab308', fontSize: '14px', fontWeight: 'bold' }}>{answeredCount}/10</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '4px' }}>
            <div style={{
              height: '100%',
              width: `${(answeredCount / 10) * 100}%`,
              background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
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
                  background: testAnswers[qIndex] !== null ? '#eab308' : '#475569',
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
                      background: testAnswers[qIndex] === oIndex ? '#eab308' : 'rgba(51, 65, 85, 0.5)',
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
        background: 'linear-gradient(135deg, #eab308 0%, #f59e0b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
        boxShadow: '0 0 40px rgba(234, 179, 8, 0.4)',
      }}>
        <span style={{ fontSize: '48px' }}>☀️</span>
      </div>

      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
        String Sizing Master!
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '32px' }}>
        You now understand solar string sizing and temperature effects
      </p>

      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'left',
      }}>
        <h3 style={{ color: '#eab308', fontWeight: 'bold', marginBottom: '16px' }}>Key Takeaways</h3>
        {[
          'Series-connected panels add voltages together',
          'Never exceed the inverter maximum input voltage',
          'MPPT range defines optimal operating voltage',
          'Cold temperatures increase voltage significantly',
          'Always design for the coldest expected conditions',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
            <span style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#eab308',
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
        background: 'rgba(234, 179, 8, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#fcd34d', fontSize: '14px' }}>
          Assessment Score: <strong>{testScore}/10</strong>
        </p>
      </div>

      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '16px 40px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#eab308',
          background: 'transparent',
          border: '2px solid #eab308',
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
