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
  twist_play: 'Capacitor Correction',
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
  primary: '#a855f7',
  primaryDark: '#9333ea',
  accent: '#6366f1',
  accentDark: '#4f46e5',
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

interface PowerFactorRendererProps {
  gamePhase?: Phase;  // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// 10-QUESTION TEST DATA
// ────────────────────────────────────────────────────────────────────────────

const TEST_QUESTIONS = [
  {
    question: 'What is power factor?',
    options: [
      { text: 'The ratio of voltage to current', correct: false },
      { text: 'The ratio of real power to apparent power (cos phi)', correct: true },
      { text: 'The total power consumed', correct: false },
      { text: 'The frequency of the AC power', correct: false },
    ],
  },
  {
    question: 'What type of power do motors primarily consume that heaters do not?',
    options: [
      { text: 'Active power', correct: false },
      { text: 'Reactive power', correct: true },
      { text: 'Phantom power', correct: false },
      { text: 'Direct power', correct: false },
    ],
  },
  {
    question: 'A power factor of 0.8 means:',
    options: [
      { text: '80% of the power is lost as heat', correct: false },
      { text: '80% of apparent power is doing useful work', correct: true },
      { text: 'The voltage is 80% of normal', correct: false },
      { text: 'The frequency is 80% of nominal', correct: false },
    ],
  },
  {
    question: 'Why do utilities charge industrial customers for low power factor?',
    options: [
      { text: 'To encourage energy conservation', correct: false },
      { text: 'Because reactive power requires larger conductors and equipment', correct: true },
      { text: 'It is just an arbitrary fee', correct: false },
      { text: 'Low power factor uses more fuel', correct: false },
    ],
  },
  {
    question: 'What is the phase relationship between voltage and current in a pure inductor?',
    options: [
      { text: 'Current leads voltage by 90 degrees', correct: false },
      { text: 'Current lags voltage by 90 degrees', correct: true },
      { text: 'They are in phase', correct: false },
      { text: 'Current leads voltage by 45 degrees', correct: false },
    ],
  },
  {
    question: 'How do capacitors improve power factor?',
    options: [
      { text: 'They store energy more efficiently', correct: false },
      { text: 'They provide leading reactive power that cancels lagging reactive power', correct: true },
      { text: 'They reduce the voltage', correct: false },
      { text: 'They increase the frequency', correct: false },
    ],
  },
  {
    question: 'What is the unit for reactive power?',
    options: [
      { text: 'Watts (W)', correct: false },
      { text: 'Volt-Amperes Reactive (VAR)', correct: true },
      { text: 'Joules (J)', correct: false },
      { text: 'Amperes (A)', correct: false },
    ],
  },
  {
    question: 'In the power triangle, apparent power is:',
    options: [
      { text: 'The sum of real and reactive power', correct: false },
      { text: 'The vector sum (hypotenuse) of real and reactive power', correct: true },
      { text: 'Equal to real power', correct: false },
      { text: 'Always less than real power', correct: false },
    ],
  },
  {
    question: 'What power factor do purely resistive loads like heaters have?',
    options: [
      { text: '0 (zero)', correct: false },
      { text: '0.5', correct: false },
      { text: '1.0 (unity)', correct: true },
      { text: 'Variable', correct: false },
    ],
  },
  {
    question: 'Why do motors have a lagging power factor?',
    options: [
      { text: 'Because they spin slowly', correct: false },
      { text: 'Because their inductive windings cause current to lag voltage', correct: true },
      { text: 'Because they are inefficient', correct: false },
      { text: 'Because they use DC internally', correct: false },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// SCENARIO-BASED TEST QUESTIONS (10 questions covering power factor topics)
// ────────────────────────────────────────────────────────────────────────────

const testQuestions = [
  {
    scenario: 'A building maintenance technician is reviewing the electrical panel and notices that the building uses 100 kW of real power but draws 125 kVA from the utility.',
    question: 'What is the power factor of this building?',
    options: [
      { id: 'a', label: '0.5' },
      { id: 'b', label: '0.8', correct: true },
      { id: 'c', label: '1.0' },
      { id: 'd', label: '1.25' },
    ],
    explanation: 'Power factor is the ratio of real power (kW) to apparent power (kVA). Here, PF = 100 kW / 125 kVA = 0.8. This means only 80% of the apparent power is doing useful work, while the remaining current is reactive power that oscillates without performing work.',
  },
  {
    scenario: 'An electrical engineer is explaining power consumption to a factory manager. The facility has motors drawing 500 kW real power, 300 kVAR reactive power, and the meter shows 583 kVA apparent power.',
    question: 'Which relationship correctly describes how these three types of power are related?',
    options: [
      { id: 'a', label: 'Apparent = Real + Reactive (linear sum)' },
      { id: 'b', label: 'Apparent = sqrt(Real^2 + Reactive^2) (vector sum)', correct: true },
      { id: 'c', label: 'Real = Apparent x Reactive' },
      { id: 'd', label: 'Reactive = Apparent - Real' },
    ],
    explanation: 'Real power and reactive power are 90 degrees out of phase, so they combine as vectors using the Pythagorean theorem. Apparent power = sqrt(500^2 + 300^2) = sqrt(250000 + 90000) = sqrt(340000) = 583 kVA. This is the power triangle relationship.',
  },
  {
    scenario: 'A manufacturing plant receives their monthly electricity bill showing a $2,400 penalty charge. Their average power factor was measured at 0.72, while the utility requires a minimum of 0.90.',
    question: 'Why do utilities penalize customers with low power factor?',
    options: [
      { id: 'a', label: 'Low power factor wastes energy as heat in customer equipment' },
      { id: 'b', label: 'Reactive current requires larger transformers, cables, and generators without delivering billable energy', correct: true },
      { id: 'c', label: 'It causes voltage fluctuations that damage utility meters' },
      { id: 'd', label: 'Government regulations mandate power factor fees' },
    ],
    explanation: 'Reactive power does not consume energy but requires the same infrastructure (transformers, cables, switchgear) as real power. A 0.72 PF means the utility must provide 39% more current capacity than if PF were 1.0. This ties up utility assets without generating revenue, so penalties incentivize correction.',
  },
  {
    scenario: 'A plant engineer measures power factor on a 50 HP induction motor under different load conditions. At full load the PF is 0.85, but at 25% load the PF drops to 0.55.',
    question: 'Why does an induction motor have lower power factor at partial load?',
    options: [
      { id: 'a', label: 'The motor runs hotter at light load, increasing resistance' },
      { id: 'b', label: 'Magnetizing current stays constant while load current decreases, so reactive portion dominates', correct: true },
      { id: 'c', label: 'Motor slip increases at partial load causing current lag' },
      { id: 'd', label: 'Light loads cause harmonic distortion that reduces power factor' },
    ],
    explanation: 'Induction motors require constant magnetizing current to maintain the rotating magnetic field, regardless of load. At full load, the large in-phase work current dominates. At partial load, work current drops but magnetizing current stays the same, so the ratio of reactive to real current increases, lowering power factor.',
  },
  {
    scenario: 'A facility has a lagging power factor of 0.75 due to numerous motors. An electrical contractor proposes installing a 200 kVAR capacitor bank to improve power factor to 0.95.',
    question: 'How do capacitors correct lagging power factor?',
    options: [
      { id: 'a', label: 'They store energy to reduce peak demand' },
      { id: 'b', label: 'They filter harmonics that cause power factor problems' },
      { id: 'c', label: 'They supply leading reactive power that cancels the lagging reactive power from inductors', correct: true },
      { id: 'd', label: 'They increase voltage to reduce current draw' },
    ],
    explanation: 'Capacitors draw current that leads voltage by 90 degrees, while inductors draw current that lags voltage by 90 degrees. When placed in parallel with inductive loads, capacitors supply the reactive current locally instead of drawing it from the utility. The leading and lagging currents cancel, reducing net reactive power.',
  },
  {
    scenario: 'A power systems engineer is analyzing two loads. Load A has current lagging voltage by 30 degrees. Load B has current leading voltage by 30 degrees.',
    question: 'Which statement correctly describes the power factor characteristic of each load?',
    options: [
      { id: 'a', label: 'Load A is leading (capacitive), Load B is lagging (inductive)' },
      { id: 'b', label: 'Load A is lagging (inductive), Load B is leading (capacitive)', correct: true },
      { id: 'c', label: 'Both loads have unity power factor since the angles are equal' },
      { id: 'd', label: 'Power factor cannot be determined from phase angle alone' },
    ],
    explanation: 'Lagging power factor means current lags voltage, caused by inductive loads like motors and transformers. Leading power factor means current leads voltage, caused by capacitive loads or over-corrected power factor. Load A (current lags) is inductive/lagging; Load B (current leads) is capacitive/leading.',
  },
  {
    scenario: 'A data center has many switch-mode power supplies and variable frequency drives. Power quality measurements show a displacement power factor of 0.98 but a true power factor of only 0.82.',
    question: 'What causes the difference between displacement power factor and true power factor?',
    options: [
      { id: 'a', label: 'Measurement error in the power analyzer' },
      { id: 'b', label: 'Harmonic distortion creates non-sinusoidal currents that reduce true power factor', correct: true },
      { id: 'c', label: 'Voltage fluctuations during the measurement period' },
      { id: 'd', label: 'Phase imbalance between the three phases' },
    ],
    explanation: 'Displacement power factor only considers the phase shift at the fundamental frequency (50/60 Hz). True power factor includes the effect of harmonics, which are multiples of the fundamental frequency. Non-linear loads like VFDs and SMPS draw distorted current, contributing apparent power but not real power, reducing true PF even when displacement PF is high.',
  },
  {
    scenario: 'A utility substation has voltage regulation problems. Engineers install a synchronous condenser, which is essentially a synchronous motor running without mechanical load.',
    question: 'How does a synchronous condenser provide reactive power support?',
    options: [
      { id: 'a', label: 'It stores energy in a flywheel to supply power during voltage dips' },
      { id: 'b', label: 'By adjusting field excitation, it can operate as either a capacitor or inductor to supply or absorb reactive power', correct: true },
      { id: 'c', label: 'It generates harmonics that cancel out power factor problems' },
      { id: 'd', label: 'Its rotating mass filters out voltage transients' },
    ],
    explanation: 'A synchronous condenser is a synchronous motor with no mechanical load. When over-excited (high field current), it generates leading reactive power like a capacitor. When under-excited, it absorbs reactive power like an inductor. This adjustable reactive power capability provides dynamic voltage support and power factor correction.',
  },
  {
    scenario: 'A three-phase industrial facility has balanced loads on each phase. Phase A shows 0.82 power factor, Phase B shows 0.82 power factor, and Phase C shows 0.82 power factor.',
    question: 'What is the overall three-phase power factor of this facility?',
    options: [
      { id: 'a', label: 'Cannot be determined without knowing the phase sequence' },
      { id: 'b', label: '0.82, the same as each individual phase', correct: true },
      { id: 'c', label: '0.946 (geometric mean of the three phases)' },
      { id: 'd', label: '2.46 (sum of the three phases)' },
    ],
    explanation: 'For a balanced three-phase system where each phase has identical power factor, the overall three-phase power factor equals the individual phase power factor. The power triangles for each phase are identical and simply scale up. With balanced loads at 0.82 PF on each phase, the total system operates at 0.82 PF.',
  },
  {
    scenario: 'A pump system is being upgraded from a fixed-speed motor with direct-on-line starting to a variable frequency drive (VFD) for energy savings. The old motor had 0.87 power factor at full load.',
    question: 'How does adding a VFD typically affect the power factor seen by the utility?',
    options: [
      { id: 'a', label: 'VFDs always improve power factor to near unity' },
      { id: 'b', label: 'VFDs have no effect on power factor' },
      { id: 'c', label: 'VFDs maintain high displacement PF but may reduce true PF due to harmonic distortion', correct: true },
      { id: 'd', label: 'VFDs always reduce power factor to below 0.7' },
    ],
    explanation: 'VFDs use a rectifier front-end that typically maintains high displacement power factor (near unity for active front-end designs, or 0.95+ for 6-pulse). However, the rectifier draws non-sinusoidal current containing harmonics, which reduces true power factor. The net effect depends on VFD design and may require harmonic filters to maintain good true power factor.',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// TRANSFER APPLICATIONS
// ────────────────────────────────────────────────────────────────────────────

const TRANSFER_APPS = [
  {
    title: 'Industrial Power Factor Correction',
    description: 'Factories install capacitor banks to correct power factor, reducing electricity bills and freeing up transformer capacity.',
    icon: '🏭',
  },
  {
    title: 'Variable Frequency Drives',
    description: 'VFDs in modern HVAC systems can cause harmonic distortion. Active filters and proper sizing maintain power quality.',
    icon: '🌡️',
  },
  {
    title: 'Utility Power Factor Penalties',
    description: 'Commercial customers often pay penalties for power factor below 0.9. Correction equipment typically pays for itself within 1-2 years.',
    icon: '💰',
  },
  {
    title: 'Renewable Energy Inverters',
    description: 'Solar inverters can provide reactive power support, helping stabilize grid voltage while generating clean energy.',
    icon: '☀️',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export default function PowerFactorRenderer({
  gamePhase,
  onCorrectAnswer,
  onIncorrectAnswer,
}: PowerFactorRendererProps) {
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
  const [loadType, setLoadType] = useState<'resistive' | 'motor'>('resistive');
  const [phaseAngle, setPhaseAngle] = useState(0);
  const [animationTime, setAnimationTime] = useState(0);
  const [hasExperimented, setHasExperimented] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);

  // Twist phase state - capacitor correction
  const [capacitorSize, setCapacitorSize] = useState(0);
  const [motorPhaseAngle, setMotorPhaseAngle] = useState(37); // About 0.8 PF lagging
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

  // Animation for waveforms
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

  // Calculate effective phase angle with capacitor correction
  const effectivePhaseAngle = Math.max(0, motorPhaseAngle - capacitorSize);
  const powerFactor = Math.cos((effectivePhaseAngle * Math.PI) / 180);
  const realPower = 1000; // Fixed 1kW real power
  const reactivePower = realPower * Math.tan((effectivePhaseAngle * Math.PI) / 180);
  const apparentPower = realPower / powerFactor;


  // Handlers
  const handlePrediction = useCallback((choice: string) => {
    setPrediction(choice);
    setShowPredictionFeedback(true);
  }, []);

  const handleTwistPrediction = useCallback((choice: string) => {
    setTwistPrediction(choice);
    setShowTwistFeedback(true);
  }, []);

  const handleLoadTypeChange = useCallback((type: 'resistive' | 'motor') => {
    setLoadType(type);
    setPhaseAngle(type === 'resistive' ? 0 : 37);
    setExperimentCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 2) setHasExperimented(true);
      return newCount;
    });
  }, []);

  const handleCapacitorChange = useCallback((value: number) => {
    setCapacitorSize(value);
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

  // Get power factor color
  const getPFColor = (pf: number) => {
    if (pf >= 0.95) return '#22c55e';
    if (pf >= 0.85) return '#f59e0b';
    return '#ef4444';
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
        background: 'rgba(168, 85, 247, 0.1)',
        border: '1px solid rgba(168, 85, 247, 0.2)',
        borderRadius: '20px',
        marginBottom: '24px',
      }}>
        <span style={{ width: '8px', height: '8px', background: '#a855f7', borderRadius: '50%' }} />
        <span style={{ fontSize: '12px', color: '#a855f7', fontWeight: 600 }}>POWER PHYSICS</span>
      </div>

      <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '16px' }}>
        Why Do Motors Cost More to Run Than Heaters at the Same Wattage?
      </h1>

      <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
        A 1000W motor and a 1000W heater both say "1000W" but the motor actually draws more current. Why?
      </p>

      <svg viewBox="0 0 400 220" style={{ width: '100%', maxWidth: '500px', height: 'auto', marginBottom: '16px' }}>
        <defs>
          {/* Premium background gradient */}
          <linearGradient id="pfHookBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Heater glow gradient */}
          <radialGradient id="pfHeaterGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#ef4444" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>

          {/* Motor glow gradient */}
          <radialGradient id="pfMotorGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>

          {/* Question mark glow */}
          <radialGradient id="pfQuestionGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>

          {/* Glow filters */}
          <filter id="pfCardGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="pfTextGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="400" height="220" fill="url(#pfHookBg)" rx="12" />

        {/* Heater with glow */}
        <ellipse cx="100" cy="110" rx="80" ry="60" fill="url(#pfHeaterGlow)" />
        <rect x="40" y="60" width="120" height="100" fill="rgba(239, 68, 68, 0.1)" stroke="#ef4444" strokeWidth="2" rx="8" filter="url(#pfCardGlow)" />

        {/* Motor with glow */}
        <ellipse cx="300" cy="110" rx="80" ry="60" fill="url(#pfMotorGlow)" />
        <rect x="240" y="60" width="120" height="100" fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeWidth="2" rx="8" filter="url(#pfCardGlow)" />

        {/* Question mark with glow */}
        <ellipse cx="200" cy="115" rx="30" ry="30" fill="url(#pfQuestionGlow)" />
        <text x="200" y="130" textAnchor="middle" fill="#f59e0b" fontSize="36" fontWeight="bold" filter="url(#pfTextGlow)">?</text>
      </svg>

      {/* Labels moved outside SVG */}
      <div style={{ display: 'flex', justifyContent: 'space-around', maxWidth: '500px', margin: '0 auto 32px', padding: '0 20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: typo.body, fontWeight: 'bold', color: '#f8fafc' }}>Heater</div>
          <div style={{ fontSize: typo.heading, fontWeight: 'bold', color: '#ef4444' }}>1000W</div>
          <div style={{ fontSize: typo.small, color: '#94a3b8' }}>Current: 8.3A</div>
          <div style={{ fontSize: typo.small, color: '#22c55e', marginTop: '4px' }}>PF = 1.0</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: typo.body, fontWeight: 'bold', color: '#f8fafc' }}>Motor</div>
          <div style={{ fontSize: typo.heading, fontWeight: 'bold', color: '#3b82f6' }}>1000W</div>
          <div style={{ fontSize: typo.small, color: '#f59e0b' }}>Current: 10.4A!</div>
          <div style={{ fontSize: typo.small, color: '#ef4444', marginTop: '4px' }}>PF = 0.8</div>
        </div>
      </div>

      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        padding: '20px',
        borderRadius: '16px',
        marginBottom: '32px',
        textAlign: 'left',
      }}>
        <p style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: 1.7 }}>
          The answer lies in <strong style={{ color: '#a855f7' }}>power factor</strong> - the relationship
          between the voltage and current waveforms. Motors need extra "reactive" current that heaters don't.
        </p>
      </div>

      <button
        onClick={goNext}
        style={{
          padding: '16px 40px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'white',
          background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Discover Power Factor
      </button>
    </div>
  );

  const renderPredict = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '16px' }}>
        Make Your Prediction
      </h2>

      <div style={{
        background: 'rgba(168, 85, 247, 0.1)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#c4b5fd', fontSize: '14px', lineHeight: 1.6 }}>
          In AC circuits, motors have inductive windings. What effect does this inductance
          have on the current waveform compared to voltage?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: 'leads', label: 'Current leads voltage (arrives before)', icon: '⏩' },
          { id: 'lags', label: 'Current lags voltage (arrives after)', icon: '⏪' },
          { id: 'same', label: 'Current and voltage are in phase', icon: '🔄' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{
              padding: '16px',
              borderRadius: '12px',
              border: prediction === option.id
                ? '2px solid #a855f7'
                : '2px solid rgba(100, 116, 139, 0.3)',
              background: prediction === option.id
                ? 'rgba(168, 85, 247, 0.2)'
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
          background: prediction === 'lags' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
          border: `1px solid ${prediction === 'lags' ? '#22c55e' : '#f59e0b'}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{ color: prediction === 'lags' ? '#86efac' : '#fcd34d', fontSize: '14px', lineHeight: 1.6 }}>
            {prediction === 'lags' ? (
              <><strong>Correct!</strong> Inductors resist changes in current, so current lags behind voltage. This phase difference means extra current flows without doing useful work.</>
            ) : (
              <><strong>Not quite!</strong> In inductive loads like motors, current LAGS behind voltage because inductors resist changes in current flow.</>
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
            background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          See the Waveforms
        </button>
      )}
    </div>
  );

  const renderPlay = () => {
    const currentAngle = loadType === 'resistive' ? 0 : 37;
    const currentPF = Math.cos((currentAngle * Math.PI) / 180);

    return (
      <div style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
          Voltage & Current Waveforms
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
          Compare resistive and inductive loads
        </p>

        {/* Power Factor Display */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          textAlign: 'center',
          border: `2px solid ${getPFColor(currentPF)}`,
        }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>POWER FACTOR</div>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: getPFColor(currentPF) }}>
            {currentPF.toFixed(2)}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Phase Angle: {currentAngle}deg
          </div>
        </div>

        {/* Waveform SVG */}
        <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: '500px', height: 'auto', marginBottom: '16px' }}>
          <defs>
            {/* Premium background gradient */}
            <linearGradient id="pfWaveBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#020617" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Voltage waveform gradient */}
            <linearGradient id="pfVoltageGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1d4ed8" />
              <stop offset="25%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#60a5fa" />
              <stop offset="75%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* Current waveform gradient - resistive (green) */}
            <linearGradient id="pfCurrentResistiveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#15803d" />
              <stop offset="25%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#4ade80" />
              <stop offset="75%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>

            {/* Current waveform gradient - inductive (orange) */}
            <linearGradient id="pfCurrentInductiveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="25%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="75%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Waveform glow filter */}
            <filter id="pfWaveGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Phase angle glow */}
            <radialGradient id="pfPhaseGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>

            {/* Grid pattern */}
            <pattern id="pfGridPattern" width="50" height="40" patternUnits="userSpaceOnUse">
              <rect width="50" height="40" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.5" />
            </pattern>
          </defs>

          <rect width="400" height="200" fill="url(#pfWaveBg)" rx="12" />
          <rect x="50" y="30" width="300" height="140" fill="url(#pfGridPattern)" opacity="0.5" />

          {/* Center line with gradient */}
          <line x1="50" y1="100" x2="350" y2="100" stroke="#475569" strokeWidth="1" />

          {/* Voltage waveform (blue) with glow */}
          <path
            d={`M 50 100 ${Array.from({ length: 60 }, (_, i) => {
              const x = 50 + i * 5;
              const y = 100 - Math.sin((i / 60) * 4 * Math.PI + animationTime) * 50;
              return `L ${x} ${y}`;
            }).join(' ')}`}
            fill="none"
            stroke="url(#pfVoltageGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#pfWaveGlow)"
          />

          {/* Current waveform with glow */}
          <path
            d={`M 50 100 ${Array.from({ length: 60 }, (_, i) => {
              const x = 50 + i * 5;
              const phaseShift = (currentAngle * Math.PI) / 180;
              const y = 100 - Math.sin((i / 60) * 4 * Math.PI + animationTime - phaseShift) * 50;
              return `L ${x} ${y}`;
            }).join(' ')}`}
            fill="none"
            stroke={loadType === 'resistive' ? 'url(#pfCurrentResistiveGrad)' : 'url(#pfCurrentInductiveGrad)'}
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#pfWaveGlow)"
          />

          {/* Phase shift indicator with glow */}
          {currentAngle > 0 && (
            <>
              <ellipse cx="162" cy="175" rx="25" ry="15" fill="url(#pfPhaseGlow)" />
              <path d="M 140 175 L 180 175" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrow)" />
              <polygon points="180,175 174,172 174,178" fill="#f59e0b" />
            </>
          )}
        </svg>

        {/* Legend moved outside SVG */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
          marginBottom: '24px',
          padding: '12px',
          background: 'rgba(15, 23, 42, 0.8)',
          borderRadius: '8px',
          maxWidth: '300px',
          margin: '0 auto 24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '24px', height: '3px', background: 'linear-gradient(90deg, #1d4ed8, #60a5fa, #1d4ed8)', borderRadius: '2px' }} />
            <span style={{ fontSize: typo.small, color: '#94a3b8' }}>Voltage</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '24px',
              height: '3px',
              background: loadType === 'resistive'
                ? 'linear-gradient(90deg, #15803d, #4ade80, #15803d)'
                : 'linear-gradient(90deg, #d97706, #fbbf24, #d97706)',
              borderRadius: '2px'
            }} />
            <span style={{ fontSize: typo.small, color: '#94a3b8' }}>Current {currentAngle > 0 && '(lag)'}</span>
          </div>
        </div>

        {/* Load Type Selector */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <button
            onClick={() => handleLoadTypeChange('resistive')}
            style={{
              flex: 1,
              padding: '16px',
              borderRadius: '12px',
              border: loadType === 'resistive' ? '2px solid #22c55e' : '2px solid rgba(100, 116, 139, 0.3)',
              background: loadType === 'resistive' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(30, 41, 59, 0.5)',
              color: '#f8fafc',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Heater<br />
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Resistive Load</span>
          </button>
          <button
            onClick={() => handleLoadTypeChange('motor')}
            style={{
              flex: 1,
              padding: '16px',
              borderRadius: '12px',
              border: loadType === 'motor' ? '2px solid #f59e0b' : '2px solid rgba(100, 116, 139, 0.3)',
              background: loadType === 'motor' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.5)',
              color: '#f8fafc',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Motor<br />
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Inductive Load</span>
          </button>
        </div>

        {/* Phasor Diagram */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
        }}>
          <div style={{ fontSize: typo.small, color: '#94a3b8', textAlign: 'center', marginBottom: '8px' }}>
            Phasor Diagram - Phase Angle: {currentAngle}deg
          </div>
          <svg viewBox="0 0 200 120" style={{ width: '100%', maxWidth: '250px', height: 'auto', margin: '0 auto', display: 'block' }}>
            <defs>
              {/* Phasor background */}
              <radialGradient id="pfPhasorBg" cx="25%" cy="50%" r="80%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </radialGradient>

              {/* Voltage phasor gradient */}
              <linearGradient id="pfVoltagePhasor" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1d4ed8" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>

              {/* Current phasor gradient - changes based on load */}
              <linearGradient id="pfCurrentPhasor" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={loadType === 'resistive' ? '#15803d' : '#d97706'} />
                <stop offset="50%" stopColor={loadType === 'resistive' ? '#22c55e' : '#f59e0b'} />
                <stop offset="100%" stopColor={loadType === 'resistive' ? '#4ade80' : '#fbbf24'} />
              </linearGradient>

              {/* Phasor glow */}
              <filter id="pfPhasorGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Arc glow */}
              <radialGradient id="pfArcGlow" cx="0%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
              </radialGradient>

              {/* Arrow markers */}
              <marker id="pfVoltageArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#60a5fa" />
              </marker>
              <marker id="pfCurrentArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={loadType === 'resistive' ? '#4ade80' : '#fbbf24'} />
              </marker>
            </defs>

            <rect width="200" height="120" fill="url(#pfPhasorBg)" rx="8" />

            {/* Reference circle */}
            <circle cx="50" cy="60" r="45" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 2" />

            {/* Phase angle arc with glow */}
            {currentAngle > 0 && (
              <>
                <ellipse cx="50" cy="60" rx="25" ry="25" fill="url(#pfArcGlow)" />
                <path
                  d={`M 75 60 A 25 25 0 0 1 ${50 + 25 * Math.cos((-currentAngle * Math.PI) / 180)} ${60 + 25 * Math.sin((-currentAngle * Math.PI) / 180)}`}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </>
            )}

            {/* Voltage phasor (horizontal, reference) */}
            <line
              x1="50"
              y1="60"
              x2="95"
              y2="60"
              stroke="url(#pfVoltagePhasor)"
              strokeWidth="4"
              strokeLinecap="round"
              markerEnd="url(#pfVoltageArrow)"
              filter="url(#pfPhasorGlow)"
            />

            {/* Current phasor (rotated by phase angle) */}
            <line
              x1="50"
              y1="60"
              x2={50 + 45 * Math.cos((-currentAngle * Math.PI) / 180)}
              y2={60 + 45 * Math.sin((-currentAngle * Math.PI) / 180)}
              stroke="url(#pfCurrentPhasor)"
              strokeWidth="4"
              strokeLinecap="round"
              markerEnd="url(#pfCurrentArrow)"
              filter="url(#pfPhasorGlow)"
            />

            {/* Origin dot */}
            <circle cx="50" cy="60" r="4" fill="#f8fafc" />
          </svg>

          {/* Phasor legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '16px', height: '3px', background: 'linear-gradient(90deg, #1d4ed8, #60a5fa)', borderRadius: '2px' }} />
              <span style={{ fontSize: typo.label, color: '#94a3b8' }}>V</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '16px',
                height: '3px',
                background: loadType === 'resistive'
                  ? 'linear-gradient(90deg, #15803d, #4ade80)'
                  : 'linear-gradient(90deg, #d97706, #fbbf24)',
                borderRadius: '2px'
              }} />
              <span style={{ fontSize: typo.label, color: '#94a3b8' }}>I</span>
            </div>
            {currentAngle > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '16px', height: '3px', background: '#a855f7', borderRadius: '2px' }} />
                <span style={{ fontSize: typo.label, color: '#94a3b8' }}>phi</span>
              </div>
            )}
          </div>
        </div>

        <div style={{
          background: 'rgba(168, 85, 247, 0.1)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{ color: '#c4b5fd', fontSize: '13px', lineHeight: 1.6 }}>
            <strong>Notice:</strong> With the motor, current lags voltage. This phase shift means
            more total current flows, even though real power (watts) is the same!
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
              ? 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)'
              : '#475569',
            border: 'none',
            borderRadius: '12px',
            cursor: hasExperimented ? 'pointer' : 'not-allowed',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {hasExperimented ? 'Continue to Review' : 'Try both load types first'}
        </button>
      </div>
    );
  };

  const renderReview = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '24px' }}>
        Understanding Power Factor
      </h2>

      {/* Power Triangle */}
      <div style={{
        background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: typo.small, marginBottom: '12px', textAlign: 'center' }}>
          The Power Triangle
        </div>
        <svg viewBox="0 0 300 130" style={{ width: '100%', maxWidth: '300px', margin: '0 auto', display: 'block' }}>
          <defs>
            {/* Triangle fill gradient */}
            <linearGradient id="pfTriangleFill" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.05)" />
              <stop offset="50%" stopColor="rgba(255, 255, 255, 0.15)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0.05)" />
            </linearGradient>

            {/* Real power line gradient (green) */}
            <linearGradient id="pfRealPowerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>

            {/* Reactive power line gradient (orange) */}
            <linearGradient id="pfReactivePowerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            {/* Apparent power line gradient (purple/gold) */}
            <linearGradient id="pfApparentPowerGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="50%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#fcd34d" />
            </linearGradient>

            {/* Glow filter for lines */}
            <filter id="pfTriangleGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Angle arc glow */}
            <radialGradient id="pfAngleGlow" cx="0%" cy="100%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Triangle fill */}
          <polygon points="50,110 250,110 250,30" fill="url(#pfTriangleFill)" />

          {/* Real Power - horizontal (green with glow) */}
          <line x1="50" y1="110" x2="250" y2="110" stroke="url(#pfRealPowerGrad)" strokeWidth="4" strokeLinecap="round" filter="url(#pfTriangleGlow)" />

          {/* Reactive Power - vertical (orange with glow) */}
          <line x1="250" y1="110" x2="250" y2="30" stroke="url(#pfReactivePowerGrad)" strokeWidth="4" strokeLinecap="round" filter="url(#pfTriangleGlow)" />

          {/* Apparent Power - hypotenuse (gold/dashed with glow) */}
          <line x1="50" y1="110" x2="250" y2="30" stroke="url(#pfApparentPowerGrad)" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 4" filter="url(#pfTriangleGlow)" />

          {/* Angle arc with glow */}
          <ellipse cx="50" cy="110" rx="40" ry="40" fill="url(#pfAngleGlow)" />
          <path d="M 90 110 A 40 40 0 0 0 72 78" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />

          {/* Phi symbol */}
          <text x="85" y="95" fill="white" fontSize="14" fontStyle="italic" fontWeight="bold">phi</text>
        </svg>

        {/* Labels moved outside SVG */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '24px', height: '4px', background: 'linear-gradient(90deg, #22c55e, #4ade80, #22c55e)', margin: '0 auto 4px', borderRadius: '2px' }} />
            <span style={{ fontSize: typo.small, color: 'white', fontWeight: 'bold' }}>Real (W)</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '24px', height: '4px', background: 'linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)', margin: '0 auto 4px', borderRadius: '2px' }} />
            <span style={{ fontSize: typo.small, color: 'white', fontWeight: 'bold' }}>Reactive (VAR)</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '24px', height: '4px', background: 'linear-gradient(90deg, #fcd34d, #fde68a, #fcd34d)', margin: '0 auto 4px', borderRadius: '2px', borderStyle: 'dashed' }} />
            <span style={{ fontSize: typo.small, color: '#fcd34d', fontWeight: 'bold' }}>Apparent (VA)</span>
          </div>
        </div>

        <div style={{ color: 'white', fontSize: typo.body, textAlign: 'center', marginTop: '12px', fontWeight: 600 }}>
          Power Factor = cos(phi) = Real / Apparent
        </div>
      </div>

      {[
        {
          icon: '⚡',
          title: 'Real Power (Watts)',
          desc: 'The actual work-producing power. This is what heaters use 100% of - converting electricity directly to heat.',
        },
        {
          icon: '🔄',
          title: 'Reactive Power (VAR)',
          desc: 'Power that sloshes back and forth in motor windings, creating magnetic fields but not doing work. Still requires current!',
        },
        {
          icon: '📊',
          title: 'Apparent Power (VA)',
          desc: 'The total power the utility must supply - the vector sum of real and reactive. This determines wire size and transformer rating.',
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
          background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
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
        Power Factor Correction
      </h2>

      <div style={{
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#fcd34d', fontSize: '14px', lineHeight: 1.6 }}>
          Motors have lagging power factor because of their inductance. But capacitors have
          LEADING current. What happens if we add capacitors to a motor circuit?
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {[
          { id: 'worse', label: 'Power factor gets worse (more lag)', icon: '📉' },
          { id: 'nothing', label: 'No effect on power factor', icon: '➡️' },
          { id: 'better', label: 'Capacitor\'s lead cancels motor\'s lag!', icon: '✨' },
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
          background: twistPrediction === 'better' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)',
          border: `1px solid ${twistPrediction === 'better' ? '#22c55e' : '#f59e0b'}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{ color: twistPrediction === 'better' ? '#86efac' : '#fcd34d', fontSize: '14px', lineHeight: 1.6 }}>
            {twistPrediction === 'better' ? (
              <><strong>Exactly!</strong> Capacitors draw leading reactive current that cancels the motor's lagging reactive current. The right size capacitor can bring power factor to nearly 1.0!</>
            ) : (
              <><strong>Actually,</strong> capacitors provide leading reactive power that cancels the motor's lagging reactive power. It's like adding positive to negative - they cancel out!</>
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
          Try Capacitor Correction
        </button>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
        Capacitor Power Factor Correction
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
        Add capacitance to correct the motor's lagging power factor
      </p>

      {/* Power Factor Display */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center',
        border: `2px solid ${getPFColor(powerFactor)}`,
      }}>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>CORRECTED POWER FACTOR</div>
        <div style={{ fontSize: '48px', fontWeight: 'bold', color: getPFColor(powerFactor) }}>
          {powerFactor.toFixed(2)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '12px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Real</div>
            <div style={{ fontSize: '14px', color: '#22c55e', fontWeight: 'bold' }}>{realPower}W</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Reactive</div>
            <div style={{ fontSize: '14px', color: '#f59e0b', fontWeight: 'bold' }}>{reactivePower.toFixed(0)} VAR</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Apparent</div>
            <div style={{ fontSize: '14px', color: '#a855f7', fontWeight: 'bold' }}>{apparentPower.toFixed(0)} VA</div>
          </div>
        </div>
      </div>

      {/* Visual representation */}
      <svg viewBox="0 0 400 100" style={{ width: '100%', maxWidth: '500px', height: 'auto', marginBottom: '16px' }}>
        <defs>
          {/* Background gradient */}
          <linearGradient id="pfCapBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          {/* Motor bar gradient (red/lagging) */}
          <linearGradient id="pfMotorBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#f87171" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.4" />
          </linearGradient>

          {/* Capacitor bar gradient (green/leading) */}
          <linearGradient id="pfCapBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#4ade80" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.4" />
          </linearGradient>

          {/* Result glow */}
          <radialGradient id="pfResultGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={effectivePhaseAngle < 10 ? '#22c55e' : '#f59e0b'} stopOpacity="0.4" />
            <stop offset="100%" stopColor={effectivePhaseAngle < 10 ? '#22c55e' : '#f59e0b'} stopOpacity="0" />
          </radialGradient>

          {/* Bar glow filter */}
          <filter id="pfBarGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Operator glow */}
          <filter id="pfOpGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="400" height="100" fill="url(#pfCapBg)" rx="12" />

        {/* Motor reactive power bar with glow */}
        <rect x="30" y="30" width="100" height="40" fill="url(#pfMotorBarGrad)" stroke="#ef4444" strokeWidth="2" rx="6" filter="url(#pfBarGlow)" />

        {/* Plus sign with glow */}
        <text x="155" y="58" textAnchor="middle" fill="#64748b" fontSize="24" fontWeight="bold" filter="url(#pfOpGlow)">+</text>

        {/* Capacitor reactive power bar with dynamic width and glow */}
        <rect x="180" y="30" width={Math.max(Math.min(capacitorSize * 2.5, 100), 10)} height="40" fill="url(#pfCapBarGrad)" stroke="#22c55e" strokeWidth="2" rx="6" filter="url(#pfBarGlow)" />

        {/* Equals sign with glow */}
        <text x="305" y="58" textAnchor="middle" fill="#64748b" fontSize="24" fontWeight="bold" filter="url(#pfOpGlow)">=</text>

        {/* Net result with glow */}
        <ellipse cx="355" cy="50" rx="30" ry="25" fill="url(#pfResultGlow)" />
        <text x="355" y="58" textAnchor="middle" fill={effectivePhaseAngle < 10 ? '#4ade80' : '#fbbf24'} fontSize="18" fontWeight="bold" filter="url(#pfBarGlow)">
          {effectivePhaseAngle.toFixed(0)}deg
        </text>
      </svg>

      {/* Labels moved outside SVG */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '500px',
        margin: '0 auto 16px',
        padding: '0 10px',
        fontSize: typo.small
      }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Motor -37 VAR</span>
        </div>
        <div style={{ width: '30px' }} />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <span style={{ color: '#22c55e', fontWeight: 'bold' }}>Cap +{capacitorSize} VAR</span>
        </div>
        <div style={{ width: '30px' }} />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <span style={{ color: effectivePhaseAngle < 10 ? '#22c55e' : '#f59e0b', fontWeight: 'bold' }}>Net Phase</span>
        </div>
      </div>

      <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: typo.small, marginBottom: '24px' }}>
        Leading VAR from capacitor cancels lagging VAR from motor
      </p>

      {/* Capacitor slider */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
          Capacitor Size: {capacitorSize} VAR (correction)
        </label>
        <input
          type="range"
          min="0"
          max="40"
          value={capacitorSize}
          onChange={(e) => handleCapacitorChange(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#22c55e' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
          <span>No correction</span>
          <span>Full correction</span>
        </div>
      </div>

      <div style={{
        background: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#86efac', fontSize: '13px', lineHeight: 1.6 }}>
          <strong>Goal:</strong> Adjust the capacitor to bring power factor as close to 1.0 as possible.
          Watch how apparent power (VA) decreases as you correct!
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
        {hasExploredTwist ? 'Continue' : 'Adjust the capacitor slider'}
      </button>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '24px' }}>
        Why Power Factor Correction Matters
      </h2>

      <div style={{
        background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'center',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '8px' }}>Cost Savings Example</div>
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '12px' }}>
          <div>
            <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>PF 0.8</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>1250 VA needed</div>
          </div>
          <div style={{ color: 'white', fontSize: '24px' }}>vs</div>
          <div>
            <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>PF 0.95</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>1053 VA needed</div>
          </div>
        </div>
        <div style={{ color: '#fef3c7', fontSize: '14px', marginTop: '12px', fontWeight: 'bold' }}>
          16% reduction in current!
        </div>
      </div>

      {[
        {
          icon: '💰',
          title: 'Lower Electricity Bills',
          desc: 'Utilities charge penalties for low power factor. Correction capacitors typically pay for themselves in 1-2 years.',
        },
        {
          icon: '🔌',
          title: 'Reduced Cable Losses',
          desc: 'Lower current means less I²R losses in wiring. This saves energy and reduces heat in electrical systems.',
        },
        {
          icon: '⚡',
          title: 'More Capacity',
          desc: 'Transformers and switchgear are rated in VA, not watts. Better power factor means you can add more equipment.',
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
          background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
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
                ? '#a855f7'
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
              background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
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
          <span style={{ color: '#a855f7', fontSize: '14px', fontWeight: 'bold' }}>{completedApps.size}/4</span>
        </div>
        <div style={{ height: '8px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '4px' }}>
          <div style={{
            height: '100%',
            width: `${(completedApps.size / 4) * 100}%`,
            background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
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
            ? 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)'
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
            {testScore >= 7 ? 'Excellent! You understand power factor!' : 'Review the concepts and try again.'}
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
              background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
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
            <span style={{ color: '#a855f7', fontSize: '14px', fontWeight: 'bold' }}>{answeredCount}/10</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '4px' }}>
            <div style={{
              height: '100%',
              width: `${(answeredCount / 10) * 100}%`,
              background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
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
                  background: testAnswers[qIndex] !== null ? '#a855f7' : '#475569',
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
                      background: testAnswers[qIndex] === oIndex ? '#a855f7' : 'rgba(51, 65, 85, 0.5)',
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
        background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
        boxShadow: '0 0 40px rgba(168, 85, 247, 0.4)',
      }}>
        <span style={{ fontSize: '48px' }}>⚡</span>
      </div>

      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '8px' }}>
        Power Factor Master!
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '32px' }}>
        You now understand reactive power and power factor correction
      </p>

      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        textAlign: 'left',
      }}>
        <h3 style={{ color: '#a855f7', fontWeight: 'bold', marginBottom: '16px' }}>Key Takeaways</h3>
        {[
          'Power factor is the ratio of real power to apparent power (cos phi)',
          'Motors draw reactive current that does not do work but requires wiring capacity',
          'Current lags voltage in inductive loads, leads voltage in capacitive loads',
          'Capacitors can correct power factor by providing leading reactive power',
          'Good power factor reduces costs and frees up electrical system capacity',
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
            <span style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#a855f7',
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
        background: 'rgba(168, 85, 247, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <p style={{ color: '#c4b5fd', fontSize: '14px' }}>
          Assessment Score: <strong>{testScore}/10</strong>
        </p>
      </div>

      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '16px 40px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#a855f7',
          background: 'transparent',
          border: '2px solid #a855f7',
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
