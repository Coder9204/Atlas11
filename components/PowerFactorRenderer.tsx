'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Power Factor - Complete 10-Phase Game
// Why motors cost more to run than heaters at the same wattage
// -----------------------------------------------------------------------------

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface PowerFactorRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// Sound utility
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
      complete: { freq: 900, duration: 0.4, type: 'sine' }
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

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: 'A building maintenance technician is reviewing the electrical panel and notices that the building uses 100 kW of real power but draws 125 kVA from the utility.',
    question: 'What is the power factor of this building?',
    options: [
      { id: 'a', label: 'A) 0.50 — only half efficient', correct: false },
      { id: 'b', label: 'B) 0.80 — correct ratio of 100/125', correct: true },
      { id: 'c', label: 'C) 1.00 — perfectly in phase', correct: false },
      { id: 'd', label: 'D) 1.25 — exceeds apparent power', correct: false }
    ],
    explanation: 'Power factor is the ratio of real power (kW) to apparent power (kVA). Here, PF = 100 kW / 125 kVA = 0.8. This means only 80% of the apparent power is doing useful work, while the remaining current is reactive power that oscillates without performing work.'
  },
  {
    scenario: 'An electrical engineer is explaining power consumption to a factory manager. The facility has motors drawing 500 kW real power, 300 kVAR reactive power, and the meter shows 583 kVA apparent power.',
    question: 'Which relationship correctly describes how these three types of power are related?',
    options: [
      { id: 'a', label: 'A) Apparent = Real + Reactive (linear sum)', correct: false },
      { id: 'b', label: 'B) Apparent = sqrt(Real^2 + Reactive^2) vector sum', correct: true },
      { id: 'c', label: 'C) Real = Apparent multiplied by Reactive', correct: false },
      { id: 'd', label: 'D) Reactive = Apparent minus Real (subtraction)', correct: false }
    ],
    explanation: 'Real power and reactive power are 90 degrees out of phase, so they combine as vectors using the Pythagorean theorem. Apparent power = sqrt(500^2 + 300^2) = sqrt(250000 + 90000) = sqrt(340000) = 583 kVA. This is the power triangle relationship.'
  },
  {
    scenario: 'A manufacturing plant receives their monthly electricity bill showing a $2,400 penalty charge. Their average power factor was measured at 0.72, while the utility requires a minimum of 0.90.',
    question: 'Why do utilities penalize customers with low power factor?',
    options: [
      { id: 'a', label: 'A) Low power factor wastes energy as heat in equipment', correct: false },
      { id: 'b', label: 'B) Reactive current requires larger infrastructure without delivering billable energy', correct: true },
      { id: 'c', label: 'C) It causes voltage fluctuations that damage utility meters', correct: false },
      { id: 'd', label: 'D) Government regulations mandate power factor fees always', correct: false }
    ],
    explanation: 'Reactive power does not consume energy but requires the same infrastructure (transformers, cables, switchgear) as real power. A 0.72 PF means the utility must provide 39% more current capacity than if PF were 1.0. This ties up utility assets without generating revenue, so penalties incentivize correction.'
  },
  {
    scenario: 'A plant engineer measures power factor on a 50 HP induction motor under different load conditions. At full load the PF is 0.85, but at 25% load the PF drops to 0.55.',
    question: 'Why does an induction motor have lower power factor at partial load?',
    options: [
      { id: 'a', label: 'A) The motor runs hotter at light load, increasing wire resistance', correct: false },
      { id: 'b', label: 'B) Magnetizing current stays constant while load current drops, so reactive portion dominates', correct: true },
      { id: 'c', label: 'C) Motor slip increases at partial load causing current lag', correct: false },
      { id: 'd', label: 'D) Light loads cause harmonic distortion reducing power factor', correct: false }
    ],
    explanation: 'Induction motors require constant magnetizing current to maintain the rotating magnetic field, regardless of load. At full load, the large in-phase work current dominates. At partial load, work current drops but magnetizing current stays the same, so the ratio of reactive to real current increases, lowering power factor.'
  },
  {
    scenario: 'A facility has a lagging power factor of 0.75 due to numerous motors. An electrical contractor proposes installing a 200 kVAR capacitor bank to improve power factor to 0.95.',
    question: 'How do capacitors correct lagging power factor?',
    options: [
      { id: 'a', label: 'A) They store energy to reduce overall peak demand charges', correct: false },
      { id: 'b', label: 'B) They filter harmonics that cause power factor problems broadly', correct: false },
      { id: 'c', label: 'C) They supply leading reactive power that cancels lagging reactive power from inductors', correct: true },
      { id: 'd', label: 'D) They increase voltage to reduce current draw automatically', correct: false }
    ],
    explanation: 'Capacitors draw current that leads voltage by 90 degrees, while inductors draw current that lags voltage by 90 degrees. When placed in parallel with inductive loads, capacitors supply the reactive current locally instead of drawing it from the utility. The leading and lagging currents cancel, reducing net reactive power.'
  },
  {
    scenario: 'A power systems engineer is analyzing two loads. Load A has current lagging voltage by 30 degrees. Load B has current leading voltage by 30 degrees.',
    question: 'Which statement correctly describes the power factor characteristic of each load?',
    options: [
      { id: 'a', label: 'A) Load A is leading (capacitive), Load B is lagging (inductive)', correct: false },
      { id: 'b', label: 'B) Load A is lagging (inductive), Load B is leading (capacitive)', correct: true },
      { id: 'c', label: 'C) Both loads have unity power factor since the angles are equal', correct: false },
      { id: 'd', label: 'D) Power factor cannot be determined from phase angle alone', correct: false }
    ],
    explanation: 'Lagging power factor means current lags voltage, caused by inductive loads like motors and transformers. Leading power factor means current leads voltage, caused by capacitive loads or over-corrected power factor. Load A (current lags) is inductive/lagging; Load B (current leads) is capacitive/leading.'
  },
  {
    scenario: 'A data center has many switch-mode power supplies and variable frequency drives. Power quality measurements show a displacement power factor of 0.98 but a true power factor of only 0.82.',
    question: 'What causes the difference between displacement power factor and true power factor?',
    options: [
      { id: 'a', label: 'A) Measurement error in the power quality analyzer instrument', correct: false },
      { id: 'b', label: 'B) Harmonic distortion creates non-sinusoidal currents that reduce true PF', correct: true },
      { id: 'c', label: 'C) Voltage fluctuations occurring during the measurement period', correct: false },
      { id: 'd', label: 'D) Phase imbalance between the three electrical phases present', correct: false }
    ],
    explanation: 'Displacement power factor only considers the phase shift at the fundamental frequency (50/60 Hz). True power factor includes the effect of harmonics, which are multiples of the fundamental frequency. Non-linear loads like VFDs and SMPS draw distorted current, contributing apparent power but not real power, reducing true PF even when displacement PF is high.'
  },
  {
    scenario: 'A utility substation has voltage regulation problems. Engineers install a synchronous condenser, which is essentially a synchronous motor running without mechanical load.',
    question: 'How does a synchronous condenser provide reactive power support?',
    options: [
      { id: 'a', label: 'A) It stores energy in a flywheel to supply power during voltage dips', correct: false },
      { id: 'b', label: 'B) By adjusting field excitation it can supply or absorb reactive power dynamically', correct: true },
      { id: 'c', label: 'C) It generates harmonics that cancel out power factor problems', correct: false },
      { id: 'd', label: 'D) Its rotating mass filters out voltage transients in the grid', correct: false }
    ],
    explanation: 'A synchronous condenser is a synchronous motor with no mechanical load. When over-excited (high field current), it generates leading reactive power like a capacitor. When under-excited, it absorbs reactive power like an inductor. This adjustable reactive power capability provides dynamic voltage support and power factor correction.'
  },
  {
    scenario: 'A three-phase industrial facility has balanced loads on each phase. Phase A shows 0.82 power factor, Phase B shows 0.82 power factor, and Phase C shows 0.82 power factor.',
    question: 'What is the overall three-phase power factor of this facility?',
    options: [
      { id: 'a', label: 'A) Cannot be determined without knowing the phase sequence', correct: false },
      { id: 'b', label: 'B) 0.82 — the same as each individual phase power factor', correct: true },
      { id: 'c', label: 'C) 0.946 — the geometric mean of the three individual phases', correct: false },
      { id: 'd', label: 'D) 2.46 — the arithmetic sum of the three phase values', correct: false }
    ],
    explanation: 'For a balanced three-phase system where each phase has identical power factor, the overall three-phase power factor equals the individual phase power factor. The power triangles for each phase are identical and simply scale up. With balanced loads at 0.82 PF on each phase, the total system operates at 0.82 PF.'
  },
  {
    scenario: 'A pump system is being upgraded from a fixed-speed motor with direct-on-line starting to a variable frequency drive (VFD) for energy savings. The old motor had 0.87 power factor at full load.',
    question: 'How does adding a VFD typically affect the power factor seen by the utility?',
    options: [
      { id: 'a', label: 'A) VFDs always improve power factor to near unity automatically', correct: false },
      { id: 'b', label: 'B) VFDs have no measurable effect on power factor at all', correct: false },
      { id: 'c', label: 'C) VFDs maintain high displacement PF but may reduce true PF via harmonic distortion', correct: true },
      { id: 'd', label: 'D) VFDs always reduce power factor to below 0.7 lagging', correct: false }
    ],
    explanation: 'VFDs use a rectifier front-end that typically maintains high displacement power factor (near unity for active front-end designs, or 0.95+ for 6-pulse). However, the rectifier draws non-sinusoidal current containing harmonics, which reduces true power factor. The net effect depends on VFD design and may require harmonic filters to maintain good true power factor.'
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🏭',
    title: 'Industrial Motors',
    short: 'Factories correct power factor to avoid penalties',
    tagline: 'Saving money through reactive power management',
    description: 'Large industrial motors have inherently low power factors due to inductive loads. Factories install capacitor banks to correct power factor and avoid utility penalty charges.',
    connection: 'The phase shift between voltage and current you explored causes motors to draw reactive current that does no useful work but still requires infrastructure.',
    howItWorks: 'Automatic power factor correction systems measure load conditions and switch capacitor banks to maintain target power factor, typically 0.95 or higher.',
    stats: [
      { value: '0.95+', label: 'Target PF', icon: '🎯' },
      { value: '30%', label: 'Electricity savings', icon: '💰' },
      { value: '$5B', label: 'PFC equipment market', icon: '📈' }
    ],
    examples: ['Steel mills', 'Manufacturing plants', 'Water treatment', 'Mining operations'],
    companies: ['ABB', 'Schneider Electric', 'Siemens', 'Eaton'],
    futureImpact: 'Smart grid integration will enable dynamic power factor correction based on grid conditions and pricing.',
    color: '#F59E0B'
  },
  {
    icon: '⚡',
    title: 'Utility Power Distribution',
    short: 'Grid operators manage reactive power flow',
    tagline: 'Keeping the lights on efficiently',
    description: 'Electric utilities must manage reactive power across the grid to maintain voltage stability. Poor power factor increases transmission losses and can cause voltage problems.',
    connection: 'Reactive power (VARs) from inductive loads creates the same current flow issues on a massive scale across the entire power grid.',
    howItWorks: 'Capacitor banks, reactors, and SVCs at substations inject or absorb reactive power. Real-time control systems optimize power factor across the grid.',
    stats: [
      { value: '5-10%', label: 'Loss reduction', icon: '📉' },
      { value: '1GVA', label: 'SVC capacity', icon: '⚡' },
      { value: '$10B', label: 'Grid reactive market', icon: '📈' }
    ],
    examples: ['Substation capacitor banks', 'Static VAR compensators', 'Synchronous condensers', 'FACTS devices'],
    companies: ['GE Grid Solutions', 'ABB', 'Siemens Energy', 'Mitsubishi Electric'],
    futureImpact: 'Grid-scale battery inverters will provide reactive power services as renewables replace synchronous generators.',
    color: '#3B82F6'
  },
  {
    icon: '💻',
    title: 'Computer Power Supplies',
    short: 'Active PFC achieves near-unity power factor',
    tagline: 'Efficient computing starts at the plug',
    description: 'Computer power supplies use active power factor correction to achieve power factors above 0.99. This reduces harmonic distortion and enables efficient use of building wiring.',
    connection: 'Switch-mode power supplies without PFC draw peaky, distorted current that creates the same problems as low power factor industrial loads.',
    howItWorks: 'A boost converter stage forces input current to be sinusoidal and in phase with voltage. DSP controllers optimize switching for efficiency.',
    stats: [
      { value: '0.99', label: 'Power factor', icon: '📊' },
      { value: '95%', label: 'Efficiency', icon: '⚡' },
      { value: '$15B', label: 'PSU market', icon: '📈' }
    ],
    examples: ['Desktop power supplies', 'Server PSUs', 'Laptop chargers', 'Data center UPS'],
    companies: ['Seasonic', 'Corsair', 'Delta Electronics', 'Artesyn'],
    futureImpact: 'GaN and SiC semiconductors will enable even higher efficiency PFC with smaller form factors.',
    color: '#22C55E'
  },
  {
    icon: '🔌',
    title: 'Variable Frequency Drives',
    short: 'VFDs control motor speed while managing power factor',
    tagline: 'Precision motor control with grid harmony',
    description: 'Variable frequency drives adjust motor speed by varying frequency and voltage. Modern VFDs include active front ends that maintain high power factor and low harmonics.',
    connection: 'VFDs must deal with power factor both on the input side (grid) and output side (motor) to optimize overall system efficiency.',
    howItWorks: 'The AFE uses an IGBT bridge to synthesize current that matches voltage phase and waveshape. This enables regenerative braking and bidirectional power flow.',
    stats: [
      { value: '0.98', label: 'AFE power factor', icon: '📊' },
      { value: '50%', label: 'Energy savings', icon: '💰' },
      { value: '$25B', label: 'VFD market', icon: '📈' }
    ],
    examples: ['HVAC systems', 'Pump stations', 'Conveyor systems', 'Crane drives'],
    companies: ['ABB', 'Siemens', 'Danfoss', 'Rockwell'],
    futureImpact: 'AI-optimized motor control will further improve efficiency while maintaining grid power quality.',
    color: '#8B5CF6'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const PowerFactorRenderer: React.FC<PowerFactorRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Play phase state
  const [loadType, setLoadType] = useState<'resistive' | 'motor'>('resistive');
  const [phaseSlider, setPhaseSlider] = useState(0); // 0 = resistive, 37 = motor
  const [animationTime, setAnimationTime] = useState(0);
  const [hasExperimented, setHasExperimented] = useState(false);

  // Twist phase state - capacitor correction
  const [capacitorSize, setCapacitorSize] = useState(0);
  const [motorPhaseAngle] = useState(37); // About 0.8 PF lagging
  const [hasExploredTwist, setHasExploredTwist] = useState(false);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [checkedQuestions, setCheckedQuestions] = useState<boolean[]>(Array(10).fill(false));

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);
  const animationRef = useRef<number>();

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop for waveforms
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

  // Calculate power values
  const effectivePhaseAngle = Math.max(0, motorPhaseAngle - capacitorSize);
  const powerFactor = Math.cos((effectivePhaseAngle * Math.PI) / 180);
  const realPower = 1000; // Fixed 1kW real power
  const reactivePower = realPower * Math.tan((effectivePhaseAngle * Math.PI) / 180);
  const apparentPower = realPower / powerFactor;

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#A855F7', // Purple for power
    accentGlow: 'rgba(168, 85, 247, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#cbd5e1',
    border: '#2a2a3a',
    voltage: '#3B82F6',
    current: '#F59E0B',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'explore',
    predict: 'predict',
    play: 'experiment',
    review: 'review',
    twist_predict: 'predict',
    twist_play: 'experiment',
    twist_review: 'review',
    transfer: 'real-world',
    test: 'test-knowledge',
    mastery: 'mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'power-factor',
        gameTitle: 'Power Factor',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Get power factor color
  const getPFColor = (pf: number) => {
    if (pf >= 0.95) return colors.success;
    if (pf >= 0.85) return colors.warning;
    return colors.error;
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
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : 'rgba(148,163,184,0.7)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #7C3AED)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
  };

  // Navigation bar
  const renderNavigationBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    const canGoNext = currentIndex < phaseOrder.length - 1;

    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgCard,
        borderTop: `1px solid ${colors.border}`,
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
      }}>
        <button
          onClick={() => canGoBack && goToPhase(phaseOrder[currentIndex - 1])}
          disabled={!canGoBack}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: canGoBack ? colors.bgSecondary : 'transparent',
            color: canGoBack ? colors.textPrimary : colors.textMuted,
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            opacity: canGoBack ? 1 : 0.5,
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          ← Back
        </button>
        <button
          onClick={() => canGoNext && goToPhase(phaseOrder[currentIndex + 1])}
          disabled={!canGoNext}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: canGoNext ? colors.accent : colors.border,
            color: 'white',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.5,
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Next →
        </button>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        height: '100dvh',
        minHeight: '600px',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '100px',
          paddingLeft: '24px',
          paddingRight: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s infinite',
          }}>
            ⚡🔌
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px', fontWeight: 800 }}>
            Power Factor
          </h1>

          <p style={{
            ...typo.body,
            color: colors.textSecondary,
            maxWidth: '600px',
            marginBottom: '32px',
            fontWeight: 400,
          }}>
            {"A "}
            <span style={{ color: colors.error }}>1000W motor</span>
            {" and a "}
            <span style={{ color: colors.success }}>1000W heater</span>
            {" both say 1000W - but the motor actually draws "}
            <span style={{ color: colors.warning }}>25% more current</span>
            {". Why?"}
          </p>
          <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '16px', fontWeight: 500 }}>
            Explore how reactive power causes inductive loads to draw more current. Power factor = Real / Apparent power.
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
            maxWidth: '500px',
            border: `1px solid ${colors.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔥</div>
                <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>Heater</div>
                <div style={{ ...typo.small, color: colors.success }}>1000W = 8.3A</div>
                <div style={{ ...typo.small, color: colors.success }}>PF = 1.0</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚙️</div>
                <div style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>Motor</div>
                <div style={{ ...typo.small, color: colors.warning }}>1000W = 10.4A!</div>
                <div style={{ ...typo.small, color: colors.warning }}>PF = 0.8</div>
              </div>
            </div>
            <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
              The motor needs extra "reactive" current to create magnetic fields - current that does no work but still heats wires!
            </p>
          </div>

          <button
            onClick={() => { playSound('click'); nextPhase(); }}
            style={{ ...primaryButtonStyle, background: 'linear-gradient(135deg, #A855F7, #7C3AED)' }}
          >
            Explore Power Factor
          </button>

          {renderNavDots()}
        </div>
        {renderNavigationBar()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'leads', text: 'Current leads voltage (arrives first)' },
      { id: 'lags', text: 'Current lags voltage (arrives after)', correct: true },
      { id: 'same', text: 'Current and voltage are perfectly in phase' },
    ];

    return (
      <div style={{
        height: '100dvh',
        minHeight: '600px',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>

        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Motors have inductive windings that create magnetic fields. How does this affect the current waveform relative to voltage?
          </h2>

          {/* SVG diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg viewBox="0 0 600 200" style={{ width: '100%', height: 'auto' }}>
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Grid lines */}
              <line x1="50" y1="50" x2="550" y2="50" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              <line x1="50" y1="100" x2="550" y2="100" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              <line x1="50" y1="150" x2="550" y2="150" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />

              {/* AC Voltage symbol */}
              <circle cx="80" cy="100" r="30" fill="none" stroke={colors.voltage} strokeWidth="2" />
              <path d="M 65 100 Q 72.5 90 80 100 T 95 100" fill="none" stroke={colors.voltage} strokeWidth="2" />
              <text x="80" y="160" textAnchor="middle" fill={colors.voltage} fontSize="11" fontWeight="600">AC Voltage</text>

              {/* Arrow */}
              <path d="M 130 100 L 220 100" stroke={colors.textMuted} strokeWidth="2" />
              <path d="M 210 95 L 220 100 L 210 105" fill={colors.textMuted} />

              {/* Motor box */}
              <rect x="240" y="60" width="120" height="80" rx="8" fill={colors.accent + '33'} stroke={colors.accent} strokeWidth="3" />
              <text x="300" y="95" textAnchor="middle" fill={colors.textPrimary} fontSize="24">⚙️</text>
              <text x="300" y="120" textAnchor="middle" fill={colors.textPrimary} fontSize="11" fontWeight="600">Motor</text>
              <text x="300" y="135" textAnchor="middle" fill={colors.textMuted} fontSize="11">(Inductor)</text>

              {/* Arrow */}
              <path d="M 380 100 L 470 100" stroke={colors.textMuted} strokeWidth="2" />
              <path d="M 460 95 L 470 100 L 460 105" fill={colors.textMuted} />

              {/* Question mark */}
              <circle cx="520" cy="100" r="30" fill={colors.warning + '22'} stroke={colors.warning} strokeWidth="2" />
              <text x="520" y="110" textAnchor="middle" fill={colors.warning} fontSize="32" fontWeight="700">?</text>
              <text x="520" y="160" textAnchor="middle" fill={colors.textMuted} fontSize="11" fontWeight="600">Current Phase</text>
            </svg>
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setPrediction(opt.id); }}
                style={{
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: prediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id === 'leads' ? 'A' : opt.id === 'lags' ? 'B' : 'C'}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {prediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Test My Prediction
            </button>
          )}
        </div>
        </div>

        {renderNavDots()}
        {renderNavigationBar()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Waveform Visualization
  if (phase === 'play') {
    const currentPhaseAngle = phaseSlider;
    const currentPF = Math.cos((currentPhaseAngle * Math.PI) / 180);

    return (
      <div style={{
        height: '100dvh',
        minHeight: '600px',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>

        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Voltage & Current Waveforms
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Compare resistive and inductive loads
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Power Factor Display */}
            <div style={{
              textAlign: 'center',
              marginBottom: '24px',
              padding: '16px',
              background: colors.bgSecondary,
              borderRadius: '12px',
              border: `2px solid ${getPFColor(currentPF)}`,
            }}>
              <div style={{ ...typo.small, color: colors.textMuted }}>POWER FACTOR</div>
              <div style={{ fontSize: '48px', fontWeight: 800, color: getPFColor(currentPF) }}>
                {currentPF.toFixed(2)}
              </div>
              <div style={{ ...typo.small, color: colors.textMuted }}>
                Phase Angle: {currentPhaseAngle}°
              </div>
            </div>

            {/* Waveform Visualization */}
            <svg viewBox="0 0 400 220" style={{ width: '100%', height: 'auto', marginBottom: '16px' }}>
              <defs>
                <linearGradient id="waveBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#020617" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <linearGradient id="voltageGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={colors.voltage} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={colors.voltage} />
                </linearGradient>
                <filter id="pointGlow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <g id="background">
                <rect width="400" height="220" fill="url(#waveBg)" rx="8" />
              </g>
              <g id="grid">
                {/* Grid lines */}
                <line x1="50" y1="55" x2="350" y2="55" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                <line x1="50" y1="110" x2="350" y2="110" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                <line x1="50" y1="165" x2="350" y2="165" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                <line x1="50" y1="55" x2="50" y2="165" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                <line x1="200" y1="55" x2="200" y2="165" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                <line x1="350" y1="55" x2="350" y2="165" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
              </g>
              <g id="waveforms">
                {/* Voltage waveform (blue) */}
                <path
                  d={`M 50 110 ${Array.from({ length: 60 }, (_, i) => {
                    const x = 50 + i * 5;
                    const y = 110 - Math.sin((i / 60) * 4 * Math.PI + animationTime) * 50;
                    return `L ${x} ${y}`;
                  }).join(' ')}`}
                  fill="none"
                  stroke={colors.voltage}
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Current waveform */}
                <path
                  d={`M 50 110 ${Array.from({ length: 60 }, (_, i) => {
                    const x = 50 + i * 5;
                    const phaseShift = (currentPhaseAngle * Math.PI) / 180;
                    const y = 110 - Math.sin((i / 60) * 4 * Math.PI + animationTime - phaseShift) * 50;
                    return `L ${x} ${y}`;
                  }).join(' ')}`}
                  fill="none"
                  stroke={currentPhaseAngle === 0 ? colors.success : colors.current}
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Phase lag indicator (vertical line) */}
                {currentPhaseAngle > 0 && (
                  <line
                    x1={50 + 15 * 5}
                    y1="55"
                    x2={50 + 15 * 5}
                    y2="165"
                    stroke={colors.warning}
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.5"
                  />
                )}
              </g>
              <g id="markers">
                {/* Reference baseline marker */}
                <circle
                  cx={50}
                  cy={110}
                  r="5"
                  fill={colors.textMuted}
                  opacity="0.7"
                />
                {/* Interactive points at peaks */}
                <circle
                  cx={50 + 15 * 5}
                  cy={110 - Math.sin((15 / 60) * 4 * Math.PI + animationTime) * 50}
                  r="8"
                  fill={colors.voltage}
                  opacity="0.7"
                />
                <circle
                  cx={50 + 15 * 5}
                  cy={110 - Math.sin((15 / 60) * 4 * Math.PI + animationTime - (currentPhaseAngle * Math.PI) / 180) * 50}
                  r="8"
                  fill={currentPhaseAngle === 0 ? colors.success : colors.current}
                  filter="url(#pointGlow)"
                />
              </g>
              <g id="labels">
                {/* Labels */}
                <text x="355" y="95" fill={colors.voltage} fontSize="11" fontWeight="600">V</text>
                <text x="355" y="130" fill={currentPhaseAngle === 0 ? colors.success : colors.current} fontSize="11" fontWeight="600">I</text>
                <text x="200" y="22" textAnchor="middle" fill={colors.textSecondary} fontSize="11" fontWeight="600">Phase Relationship</text>
                <text x="50" y="185" textAnchor="middle" fill={colors.textMuted} fontSize="11">0°</text>
                <text x="200" y="185" textAnchor="middle" fill={colors.textMuted} fontSize="11">180°</text>
                <text x="350" y="185" textAnchor="middle" fill={colors.textMuted} fontSize="11">360°</text>
                <text x="200" y="210" textAnchor="middle" fill={colors.textSecondary} fontSize="11" fontWeight="600">PF = cos({currentPhaseAngle}°) = {currentPF.toFixed(2)}</text>
                {/* Axis labels */}
                <text x="16" y="80" fill={colors.textMuted} fontSize="11" textAnchor="middle" transform="rotate(-90,16,80)">Amplitude</text>
                <text x="395" y="195" fill={colors.textMuted} fontSize="11" textAnchor="end">Time</text>
                <circle cx={395} cy={110} r={2} fill="rgba(168,85,247,0.1)" />
              </g>
            </svg>

            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '24px', height: '3px', background: colors.voltage, borderRadius: '2px' }} />
                <span style={{ ...typo.small, color: colors.textSecondary }}>Voltage</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '24px', height: '3px', background: loadType === 'resistive' ? colors.success : colors.current, borderRadius: '2px' }} />
                <span style={{ ...typo.small, color: colors.textSecondary }}>Current {currentPhaseAngle > 0 && '(lagging)'}</span>
              </div>
            </div>
          </div>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              {/* Educational explanation */}
              <div style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
              }}>
                <h4 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>What This Shows:</h4>
                <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                  The visualization above displays voltage (blue) and current (orange/green) waveforms over time.
                  <strong style={{ color: colors.textPrimary }}> Watch the moving dots</strong> - they mark the wave peaks and show timing relationships.
                </p>
                <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
                  <strong style={{ color: colors.textPrimary }}>Cause &amp; Effect:</strong> When you switch between heater and motor,
                  the motor's inductive coils create a magnetic field that causes current to <strong>lag behind voltage by 37 degrees</strong>.
                  This lag means the motor draws more current than a heater for the same power output.
                </p>
                <p style={{ ...typo.body, color: colors.textSecondary }}>
                  <strong style={{ color: colors.textPrimary }}>Why This Matters:</strong> Low power factor (like the motor's 0.8) means
                  electric utilities must provide 25% more current capacity without earning more revenue.
                </p>
              </div>

              {/* Discovery prompt */}
              {loadType === 'motor' && (
                <div style={{
                  background: `${colors.warning}22`,
                  border: `1px solid ${colors.warning}`,
                  borderRadius: '12px',
                  padding: '16px',
                  marginTop: '16px',
                  textAlign: 'center',
                }}>
                  <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                    Notice how the current waveform lags behind voltage! This phase shift is why motors need more current.
                  </p>
                </div>
              )}
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                {/* Phase Angle Slider */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Phase Angle</span>
                    <span style={{ ...typo.small, color: getPFColor(currentPF), fontWeight: 600 }}>{phaseSlider}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={phaseSlider}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setPhaseSlider(val);
                      setLoadType(val > 0 ? 'motor' : 'resistive');
                      setHasExperimented(true);
                      playSound('click');
                    }}
                    style={{
                      width: '100%',
                      height: '20px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      accentColor: '#3b82f6',
                      touchAction: 'pan-y',
                      WebkitAppearance: 'none',
                    } as React.CSSProperties}
                  />
                </div>

                {/* Load Type Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    onClick={() => { setLoadType('resistive'); setPhaseSlider(0); setHasExperimented(true); playSound('click'); }}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: loadType === 'resistive' ? `2px solid ${colors.success}` : `2px solid ${colors.border}`,
                      background: loadType === 'resistive' ? `${colors.success}22` : colors.bgSecondary,
                      color: colors.textPrimary,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>Heater (Resistive)</div>
                  </button>
                  <button
                    onClick={() => { setLoadType('motor'); setPhaseSlider(37); setHasExperimented(true); playSound('click'); }}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: loadType === 'motor' ? `2px solid ${colors.current}` : `2px solid ${colors.border}`,
                      background: loadType === 'motor' ? `${colors.current}22` : colors.bgSecondary,
                      color: colors.textPrimary,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>Motor (Inductive)</div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            disabled={!hasExperimented}
            style={{
              ...primaryButtonStyle,
              width: '100%',
              opacity: hasExperimented ? 1 : 0.5,
              cursor: hasExperimented ? 'pointer' : 'not-allowed',
            }}
          >
            {hasExperimented ? 'Understand the Physics' : 'Try both load types'}
          </button>
        </div>
        </div>

        {renderNavDots()}
        {renderNavigationBar()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        height: '100dvh',
        minHeight: '600px',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>

        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Power Factor — As You Observed in the Experiment
          </h2>

          {/* Power Triangle */}
          <div style={{
            background: `linear-gradient(135deg, ${colors.accent} 0%, #7C3AED 100%)`,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ ...typo.small, color: 'rgba(255,255,255,0.8)', marginBottom: '12px' }}>
              The Power Triangle
            </div>
            <svg viewBox="0 0 300 120" style={{ width: '100%', maxWidth: '300px', height: 'auto' }}>
              {/* Triangle */}
              <polygon points="50,100 250,100 250,30" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

              {/* Real Power (horizontal) */}
              <line x1="50" y1="100" x2="250" y2="100" stroke={colors.success} strokeWidth="4" />
              <text x="150" y="115" textAnchor="middle" fill={colors.success} fontSize="12" fontWeight="600">Real Power (kW)</text>

              {/* Reactive Power (vertical) */}
              <line x1="250" y1="100" x2="250" y2="30" stroke={colors.warning} strokeWidth="4" />
              <text x="280" y="65" textAnchor="middle" fill={colors.warning} fontSize="12" fontWeight="600">Reactive (kVAR)</text>

              {/* Apparent Power (hypotenuse) */}
              <line x1="50" y1="100" x2="250" y2="30" stroke="white" strokeWidth="4" strokeDasharray="8 4" />
              <text x="120" y="55" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Apparent (kVA)</text>

              {/* Angle arc */}
              <path d="M 90 100 A 40 40 0 0 0 70 78" fill="none" stroke="white" strokeWidth="2" />
              <text x="95" y="88" fill="white" fontSize="12" fontWeight="600">φ</text>
            </svg>
            <div style={{ color: 'white', fontWeight: 600, marginTop: '12px' }}>
              Power Factor = cos(φ) = Real / Apparent
            </div>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <div>
                  <strong style={{ color: colors.success }}>Real Power (Watts)</strong>
                  <p style={{ margin: '4px 0 0' }}>The actual work-producing power. Heaters use 100% of this.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <span style={{ fontSize: '24px' }}>🔄</span>
                <div>
                  <strong style={{ color: colors.warning }}>Reactive Power (VAR)</strong>
                  <p style={{ margin: '4px 0 0' }}>Power that sloshes back and forth in motor windings. Does no work but requires current!</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <span style={{ fontSize: '24px' }}>📊</span>
                <div>
                  <strong style={{ color: colors.textPrimary }}>Apparent Power (VA)</strong>
                  <p style={{ margin: '4px 0 0' }}>The vector sum - what the utility must supply and what sizes your wiring.</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: `${colors.error}11`,
            border: `1px solid ${colors.error}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.error, marginBottom: '12px' }}>
              Why Low Power Factor Costs Money
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
              {prediction === 'lags' ? 'You correctly predicted that current lags voltage in motors! ' : 'As you observed in the experiment, '}
              Because motors draw reactive current, utilities must size their infrastructure for the full apparent power (kVA), not just the real power (kW). Therefore, low power factor means paying for infrastructure that delivers no useful work.
            </p>
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>Utilities charge penalties for PF below 0.9 — because they bear the infrastructure cost</li>
              <li>Larger cables needed to carry reactive current — this means higher material costs</li>
              <li>Transformers and switchgear must be oversized — therefore capital costs rise</li>
              <li>More I²R losses heating up your wiring — this means wasted energy</li>
            </ul>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover the Solution
          </button>
        </div>
        </div>

        {renderNavDots()}
        {renderNavigationBar()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Power factor gets worse (more lag)' },
      { id: 'b', text: 'Capacitors provide leading current that cancels the motor\'s lagging current!', correct: true },
      { id: 'c', text: 'No effect - capacitors only store energy' },
    ];

    return (
      <div style={{
        height: '100dvh',
        minHeight: '600px',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>

        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Power Factor Correction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            Motors have lagging current. Capacitors have leading current. What happens if we add capacitors to a motor circuit?
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <svg viewBox="0 0 600 150" style={{ width: '100%', height: 'auto' }}>
              <defs>
                <filter id="twistGlow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Grid lines */}
              <line x1="50" y1="75" x2="550" y2="75" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />

              {/* Motor */}
              <rect x="50" y="40" width="100" height="70" rx="8" fill={colors.error + '22'} stroke={colors.error} strokeWidth="2" />
              <text x="100" y="70" textAnchor="middle" fill={colors.textPrimary} fontSize="24">⚙️</text>
              <text x="100" y="95" textAnchor="middle" fill={colors.error} fontSize="11" fontWeight="600">Motor (lag)</text>

              {/* Plus sign */}
              <text x="200" y="80" textAnchor="middle" fill={colors.textMuted} fontSize="28" fontWeight="600">+</text>

              {/* Capacitor */}
              <rect x="250" y="40" width="100" height="70" rx="8" fill={colors.success + '22'} stroke={colors.success} strokeWidth="2" />
              <text x="300" y="70" textAnchor="middle" fill={colors.textPrimary} fontSize="24">⚡</text>
              <text x="300" y="95" textAnchor="middle" fill={colors.success} fontSize="11" fontWeight="600">Capacitor (lead)</text>

              {/* Equals sign */}
              <text x="400" y="80" textAnchor="middle" fill={colors.textMuted} fontSize="28" fontWeight="600">=</text>

              {/* Question mark */}
              <circle cx="500" cy="75" r="35" fill={colors.accent + '22'} stroke={colors.accent} strokeWidth="2" />
              <text x="500" y="85" textAnchor="middle" fill={colors.accent} fontSize="32" fontWeight="700">?</text>
              <text x="500" y="130" textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="600">Net Effect</text>
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              See Capacitor Correction
            </button>
          )}
        </div>
        </div>

        {renderNavDots()}
        {renderNavigationBar()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        height: '100dvh',
        minHeight: '600px',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>

        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Power Factor Correction
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Add capacitance to correct the motor's lagging power factor
          </p>

          {/* Side-by-side layout */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
            marginBottom: '24px',
          }}>
            <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                {/* Power Factor Display */}
                <div style={{
                  textAlign: 'center',
                  marginBottom: '24px',
                  padding: '20px',
                  background: colors.bgSecondary,
                  borderRadius: '12px',
                  border: `2px solid ${getPFColor(powerFactor)}`,
                }}>
                  <div style={{ ...typo.small, color: colors.textMuted }}>CORRECTED POWER FACTOR</div>
                  <div style={{ fontSize: '56px', fontWeight: 800, color: getPFColor(powerFactor) }}>
                    {powerFactor.toFixed(2)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginTop: '16px' }}>
                    <div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Real</div>
                      <div style={{ color: colors.success, fontWeight: 700 }}>{realPower}W</div>
                    </div>
                    <div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Reactive</div>
                      <div style={{ color: colors.warning, fontWeight: 700 }}>{reactivePower.toFixed(0)} VAR</div>
                    </div>
                    <div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Apparent</div>
                      <div style={{ color: colors.accent, fontWeight: 700 }}>{apparentPower.toFixed(0)} VA</div>
                    </div>
                  </div>
                </div>

                {/* Visual representation */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              marginBottom: '24px',
              padding: '16px',
              background: colors.bgSecondary,
              borderRadius: '12px',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '80px',
                  height: '40px',
                  background: `${colors.error}44`,
                  border: `2px solid ${colors.error}`,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '4px',
                }}>
                  <span style={{ color: colors.error, fontWeight: 700 }}>-37°</span>
                </div>
                <span style={{ ...typo.small, color: colors.textMuted }}>Motor Lag</span>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>+</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '80px',
                  height: '40px',
                  background: `${colors.success}44`,
                  border: `2px solid ${colors.success}`,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '4px',
                }}>
                  <span style={{ color: colors.success, fontWeight: 700 }}>+{capacitorSize}°</span>
                </div>
                <span style={{ ...typo.small, color: colors.textMuted }}>Cap Lead</span>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>=</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '80px',
                  height: '40px',
                  background: `${getPFColor(powerFactor)}44`,
                  border: `2px solid ${getPFColor(powerFactor)}`,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '4px',
                }}>
                  <span style={{ color: getPFColor(powerFactor), fontWeight: 700 }}>{effectivePhaseAngle}°</span>
                </div>
                <span style={{ ...typo.small, color: colors.textMuted }}>Net Phase</span>
              </div>
            </div>

            </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
              <div style={{
                background: colors.bgCard,
                borderRadius: '16px',
                padding: '24px',
              }}>
                {/* Capacitor slider */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>Capacitor Correction</span>
                    <span style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>{capacitorSize}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={capacitorSize}
                    onChange={(e) => { setCapacitorSize(parseInt(e.target.value)); setHasExploredTwist(true); }}
                    style={{
                      width: '100%',
                      height: '20px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      accentColor: '#3b82f6',
                      touchAction: 'pan-y',
                      WebkitAppearance: 'none',
                    } as React.CSSProperties}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>No correction</span>
                    <span style={{ ...typo.small, color: colors.textMuted }}>Full correction</span>
                  </div>
                </div>
              </div>

            {/* Power Triangle Visualization */}
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '12px',
              padding: '24px',
              marginTop: '24px',
            }}>
              <div style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '12px' }}>
                Power Triangle (Changes with Slider)
              </div>
              <svg viewBox="0 0 300 180" style={{ width: '100%', maxWidth: '300px', height: 'auto', margin: '0 auto', display: 'block' }}>
                <defs>
                  <filter id="powerGlow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* Grid lines */}
                <line x1="40" y1="140" x2="260" y2="140" stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />

                {/* Triangle */}
                <polygon
                  points={`50,140 250,140 250,${140 - reactivePower / 10}`}
                  fill="rgba(168,85,247,0.1)"
                  stroke={colors.accent}
                  strokeWidth="1"
                />

                {/* Real Power (horizontal) - always same */}
                <line x1="50" y1="140" x2="250" y2="140" stroke={colors.success} strokeWidth="3" />
                <text x="150" y="158" textAnchor="middle" fill={colors.success} fontSize="11" fontWeight="600">Real ({realPower}W)</text>

                {/* Reactive Power (vertical) - changes with slider */}
                <line x1="250" y1="140" x2="250" y2={140 - reactivePower / 10} stroke={colors.warning} strokeWidth="3" />
                <text x="270" y={140 - reactivePower / 20} textAnchor="start" fill={colors.warning} fontSize="11" fontWeight="600">
                  Reactive ({reactivePower.toFixed(0)} VAR)
                </text>

                {/* Apparent Power (hypotenuse) - changes with slider */}
                <line x1="50" y1="140" x2="250" y2={140 - reactivePower / 10} stroke={colors.accent} strokeWidth="3" strokeDasharray="6 3" />
                <text x="120" y={140 - reactivePower / 20 - 10} textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="600">
                  Apparent ({apparentPower.toFixed(0)} VA)
                </text>

                {/* Interactive points */}
                <circle cx="50" cy="140" r="8" fill={colors.success} filter="url(#powerGlow)" />
                <circle cx="250" cy="140" r="8" fill={colors.success} filter="url(#powerGlow)" />
                <circle cx="250" cy={140 - reactivePower / 10} r="8" fill={colors.warning} filter="url(#powerGlow)" />

                {/* Angle arc */}
                {effectivePhaseAngle > 0 && (
                  <>
                    <path
                      d={`M 90 140 A 40 40 0 0 0 ${90 - 40 * Math.sin(effectivePhaseAngle * Math.PI / 180)} ${140 - 40 * Math.cos(effectivePhaseAngle * Math.PI / 180) + 40}`}
                      fill="none"
                      stroke={colors.accent}
                      strokeWidth="2"
                    />
                    <text x="100" y="128" fill={colors.accent} fontSize="11" fontWeight="600">φ={effectivePhaseAngle}°</text>
                  </>
                )}
              </svg>
            </div>

          {powerFactor >= 0.95 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginTop: '16px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Excellent! Power factor is now above 0.95 - no utility penalties!
              </p>
            </div>
          )}
            </div>
          </div>

          {false && powerFactor >= 0.95 && (
            <div style={{
              background: `${colors.success}22`,
              border: `1px solid ${colors.success}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
                Excellent! Power factor is now above 0.95 - no utility penalties!
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            disabled={!hasExploredTwist}
            style={{
              ...primaryButtonStyle,
              width: '100%',
              opacity: hasExploredTwist ? 1 : 0.5,
              cursor: hasExploredTwist ? 'pointer' : 'not-allowed',
            }}
          >
            {hasExploredTwist ? 'Understand the Benefits' : 'Adjust the slider'}
          </button>
        </div>
        </div>

        {renderNavDots()}
        {renderNavigationBar()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        height: '100dvh',
        minHeight: '600px',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>

        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Power Factor Correction Pays Off
          </h2>

          <div style={{
            background: `linear-gradient(135deg, ${colors.warning} 0%, ${colors.error} 100%)`,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ color: 'rgba(255,255,255,0.8)', ...typo.small, marginBottom: '8px' }}>
              Cost Savings Example (1000W motor)
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '12px' }}>
              <div>
                <div style={{ color: 'white', fontSize: '20px', fontWeight: 700 }}>PF 0.8</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', ...typo.small }}>1250 VA needed</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', ...typo.small }}>10.4A current</div>
              </div>
              <div style={{ color: 'white', fontSize: '24px', alignSelf: 'center' }}>→</div>
              <div>
                <div style={{ color: 'white', fontSize: '20px', fontWeight: 700 }}>PF 0.95</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', ...typo.small }}>1053 VA needed</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', ...typo.small }}>8.8A current</div>
              </div>
            </div>
            <div style={{ color: '#fef3c7', fontWeight: 700, marginTop: '12px' }}>
              16% less current = smaller wires, less heat, no penalties!
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💰</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Lower Electricity Bills</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Utilities charge penalties for power factor below 0.9. Correction capacitors typically pay for themselves in 1-2 years through avoided penalties.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔌</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Reduced Cable Losses</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Lower current means less I²R losses in wiring. This saves energy and reduces heat in electrical systems, extending equipment life.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>More Available Capacity</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Transformers and switchgear are rated in VA, not watts. Better power factor means you can add more equipment without upgrading infrastructure.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications
          </button>
        </div>
        </div>

        {renderNavDots()}
        {renderNavigationBar()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        height: '100dvh',
        minHeight: '600px',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>

        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Real-World Applications
          </h2>
          <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '16px' }}>
            Application {selectedApp + 1} of {realWorldApps.length}
          </p>
          <div style={{ background: 'rgba(245,158,11,0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: `1px solid ${colors.warning}` }}>
            <p style={{ color: colors.warning, fontWeight: 700, marginBottom: '4px', fontSize: '13px' }}>Industry Stats:</p>
            <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
              Global power factor correction market: $5B+ annually. Companies like ABB, Siemens, Schneider Electric, and Eaton supply capacitor banks. Industrial plants save 15-30% on electricity bills by correcting PF from 0.75 to 0.95. A single 500 kVAR capacitor bank costs ~$50K but saves $100K/year in penalties.
            </p>
          </div>

          {/* App selector */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}>
            {realWorldApps.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  playSound('click');
                  setSelectedApp(i);
                  const newCompleted = [...completedApps];
                  newCompleted[i] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{
                  background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                  border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                {completedApps[i] && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: colors.success,
                    color: 'white',
                    fontSize: '12px',
                    lineHeight: '18px',
                  }}>
                    ✓
                  </div>
                )}
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
                <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>
                  {a.title.split(' ').slice(0, 2).join(' ')}
                </div>
              </button>
            ))}
          </div>

          {!allAppsCompleted && (
            <button
              onClick={() => {
                playSound('click');
                if (selectedApp < realWorldApps.length - 1) {
                  setSelectedApp(selectedApp + 1);
                  const newCompleted = [...completedApps];
                  newCompleted[selectedApp + 1] = true;
                  setCompletedApps(newCompleted);
                }
              }}
              style={{
                ...primaryButtonStyle,
                width: '100%',
                marginBottom: '24px',
              }}
            >
              Got It - Next Application →
            </button>
          )}

          {/* Selected app details */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            borderLeft: `4px solid ${app.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '48px' }}>{app.icon}</span>
              <div>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              {app.description} {app.howItWorks} Additional context: This technology represents a critical intersection of power quality management and cost optimization. In industrial settings, maintaining optimal power factor is not just about avoiding penalties—it directly impacts equipment lifespan, energy efficiency, and operational costs. The principles demonstrated here scale from small motor controllers to grid-scale power management systems.
            </p>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                How Power Factor Connects:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          )}
        </div>
        </div>

        {renderNavDots()}
        {renderNavigationBar()}
      </div>
    );
  }

  // TEST PHASE - bottom nav Next disabled during active quiz
  const renderTestNavigationBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const canGoBack = currentIndex > 0;
    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: colors.bgCard,
        borderTop: `1px solid ${colors.border}`,
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
      }}>
        <button
          onClick={() => canGoBack && goToPhase(phaseOrder[currentIndex - 1])}
          disabled={!canGoBack}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: canGoBack ? colors.bgSecondary : 'transparent',
            color: canGoBack ? colors.textPrimary : colors.textMuted,
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            opacity: canGoBack ? 1 : 0.5,
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          ← Back
        </button>
        <button
          disabled={true}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: colors.border,
            color: colors.textMuted,
            cursor: 'not-allowed',
            opacity: 0.5,
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Next →
        </button>
      </div>
    );
  };

  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          height: '100dvh',
          minHeight: '600px',
          background: colors.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {renderProgressBar()}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>

          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🏆' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You understand power factor and reactive power!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson
              </button>
            ) : (
              <button
                onClick={() => {
                  setTestSubmitted(false);
                  setTestAnswers(Array(10).fill(null));
                  setCurrentQuestion(0);
                  setTestScore(0);
                  goToPhase('hook');
                }}
                style={primaryButtonStyle}
              >
                Review and Try Again
              </button>
            )}
          </div>
          </div>
          {renderNavDots()}
          {renderNavigationBar()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];
    const isAnswered = testAnswers[currentQuestion] !== null;
    const isChecked = checkedQuestions[currentQuestion];

    return (
      <div style={{
        height: '100dvh',
        minHeight: '600px',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '100px' }}>

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Question {currentQuestion + 1} of 10
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: i === currentQuestion
                    ? colors.accent
                    : testAnswers[i]
                      ? colors.success
                      : colors.border,
                }} />
              ))}
            </div>
          </div>

          {/* Scenario */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {question.scenario}
            </p>
          </div>

          {/* Question */}
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
            {question.question}
          </h3>

          <p style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '12px' }}>
            Select the best answer. Use the power factor formula: PF = Real Power (kW) / Apparent Power (kVA) = cos(φ).
          </p>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {question.options.map(opt => {
              const isSelected = testAnswers[currentQuestion] === opt.id;
              const correct = question.options.find(o => o.correct)?.id;
              const showFeedback = isChecked;
              let bg = isSelected ? `${colors.accent}22` : colors.bgCard;
              let borderColor = isSelected ? colors.accent : colors.border;
              if (showFeedback && isSelected) {
                bg = opt.correct ? `${colors.success}22` : `${colors.error}22`;
                borderColor = opt.correct ? colors.success : colors.error;
              }
              if (showFeedback && opt.id === correct && !isSelected) {
                bg = `${colors.success}11`;
                borderColor = colors.success;
              }
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    if (isChecked) return;
                    playSound('click');
                    const newAnswers = [...testAnswers];
                    newAnswers[currentQuestion] = opt.id;
                    setTestAnswers(newAnswers);
                  }}
                  style={{
                    background: bg,
                    border: `2px solid ${borderColor}`,
                    borderRadius: '10px',
                    padding: '14px 16px',
                    textAlign: 'left',
                    cursor: isChecked ? 'default' : 'pointer',
                  }}
                >
                  <span style={{ color: colors.textPrimary, ...typo.small }}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Check Answer button */}
          {isAnswered && !isChecked && (
            <div style={{ marginBottom: '12px' }}>
              <button
                onClick={() => {
                  const next = [...checkedQuestions];
                  next[currentQuestion] = true;
                  setCheckedQuestions(next);
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  const next = [...checkedQuestions];
                  next[currentQuestion] = true;
                  setCheckedQuestions(next);
                }}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '15px',
                }}
              >
                Check Answer
              </button>
            </div>
          )}

          {/* Explanation after checking */}
          {isChecked && (
            <div style={{ marginBottom: '12px', padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
              <p style={{ fontSize: '13px', color: '#15803d', margin: 0 }}>
                <strong>Explanation:</strong> {question.explanation}
              </p>
            </div>
          )}

          {/* Navigation - only show after checking */}
          {isChecked && (
            <div style={{ display: 'flex', gap: '12px' }}>
              {currentQuestion < 9 ? (
                <button
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Next Question →
                </button>
              ) : (
                <button
                  onClick={() => {
                    const score = testAnswers.reduce((acc, ans, i) => {
                      const correct = testQuestions[i].options.find(o => o.correct)?.id;
                      return acc + (ans === correct ? 1 : 0);
                    }, 0);
                    setTestScore(score);
                    setTestSubmitted(true);
                    playSound(score >= 7 ? 'complete' : 'failure');
                  }}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Submit Test →
                </button>
              )}
            </div>
          )}
        </div>
        </div>

        {renderNavDots()}
        {renderTestNavigationBar()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        height: '100dvh',
        minHeight: '600px',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '60px',
          paddingBottom: '100px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}>

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Power Factor Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand the relationship between real power, reactive power, and why power factor matters for electrical efficiency.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            Key Takeaways:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'Power factor = Real Power / Apparent Power = cos(φ)',
              'Motors draw reactive current that does no useful work',
              'Current lags voltage in inductive loads',
              'Capacitors provide leading reactive power for correction',
              'Good PF (>0.95) avoids penalties and reduces losses',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '14px 28px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
            }}
          >
            Play Again
          </button>
          <a
            href="/"
            style={{
              ...primaryButtonStyle,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Return to Dashboard
          </a>
        </div>
        </div>

        {renderNavDots()}
        {renderNavigationBar()}
      </div>
    );
  }

  return null;
};

export default PowerFactorRenderer;
