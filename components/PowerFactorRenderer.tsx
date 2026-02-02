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
      { id: 'a', label: '0.5' },
      { id: 'b', label: '0.8', correct: true },
      { id: 'c', label: '1.0' },
      { id: 'd', label: '1.25' }
    ],
    explanation: 'Power factor is the ratio of real power (kW) to apparent power (kVA). Here, PF = 100 kW / 125 kVA = 0.8. This means only 80% of the apparent power is doing useful work, while the remaining current is reactive power that oscillates without performing work.'
  },
  {
    scenario: 'An electrical engineer is explaining power consumption to a factory manager. The facility has motors drawing 500 kW real power, 300 kVAR reactive power, and the meter shows 583 kVA apparent power.',
    question: 'Which relationship correctly describes how these three types of power are related?',
    options: [
      { id: 'a', label: 'Apparent = Real + Reactive (linear sum)' },
      { id: 'b', label: 'Apparent = sqrt(Real^2 + Reactive^2) (vector sum)', correct: true },
      { id: 'c', label: 'Real = Apparent x Reactive' },
      { id: 'd', label: 'Reactive = Apparent - Real' }
    ],
    explanation: 'Real power and reactive power are 90 degrees out of phase, so they combine as vectors using the Pythagorean theorem. Apparent power = sqrt(500^2 + 300^2) = sqrt(250000 + 90000) = sqrt(340000) = 583 kVA. This is the power triangle relationship.'
  },
  {
    scenario: 'A manufacturing plant receives their monthly electricity bill showing a $2,400 penalty charge. Their average power factor was measured at 0.72, while the utility requires a minimum of 0.90.',
    question: 'Why do utilities penalize customers with low power factor?',
    options: [
      { id: 'a', label: 'Low power factor wastes energy as heat in customer equipment' },
      { id: 'b', label: 'Reactive current requires larger transformers, cables, and generators without delivering billable energy', correct: true },
      { id: 'c', label: 'It causes voltage fluctuations that damage utility meters' },
      { id: 'd', label: 'Government regulations mandate power factor fees' }
    ],
    explanation: 'Reactive power does not consume energy but requires the same infrastructure (transformers, cables, switchgear) as real power. A 0.72 PF means the utility must provide 39% more current capacity than if PF were 1.0. This ties up utility assets without generating revenue, so penalties incentivize correction.'
  },
  {
    scenario: 'A plant engineer measures power factor on a 50 HP induction motor under different load conditions. At full load the PF is 0.85, but at 25% load the PF drops to 0.55.',
    question: 'Why does an induction motor have lower power factor at partial load?',
    options: [
      { id: 'a', label: 'The motor runs hotter at light load, increasing resistance' },
      { id: 'b', label: 'Magnetizing current stays constant while load current decreases, so reactive portion dominates', correct: true },
      { id: 'c', label: 'Motor slip increases at partial load causing current lag' },
      { id: 'd', label: 'Light loads cause harmonic distortion that reduces power factor' }
    ],
    explanation: 'Induction motors require constant magnetizing current to maintain the rotating magnetic field, regardless of load. At full load, the large in-phase work current dominates. At partial load, work current drops but magnetizing current stays the same, so the ratio of reactive to real current increases, lowering power factor.'
  },
  {
    scenario: 'A facility has a lagging power factor of 0.75 due to numerous motors. An electrical contractor proposes installing a 200 kVAR capacitor bank to improve power factor to 0.95.',
    question: 'How do capacitors correct lagging power factor?',
    options: [
      { id: 'a', label: 'They store energy to reduce peak demand' },
      { id: 'b', label: 'They filter harmonics that cause power factor problems' },
      { id: 'c', label: 'They supply leading reactive power that cancels the lagging reactive power from inductors', correct: true },
      { id: 'd', label: 'They increase voltage to reduce current draw' }
    ],
    explanation: 'Capacitors draw current that leads voltage by 90 degrees, while inductors draw current that lags voltage by 90 degrees. When placed in parallel with inductive loads, capacitors supply the reactive current locally instead of drawing it from the utility. The leading and lagging currents cancel, reducing net reactive power.'
  },
  {
    scenario: 'A power systems engineer is analyzing two loads. Load A has current lagging voltage by 30 degrees. Load B has current leading voltage by 30 degrees.',
    question: 'Which statement correctly describes the power factor characteristic of each load?',
    options: [
      { id: 'a', label: 'Load A is leading (capacitive), Load B is lagging (inductive)' },
      { id: 'b', label: 'Load A is lagging (inductive), Load B is leading (capacitive)', correct: true },
      { id: 'c', label: 'Both loads have unity power factor since the angles are equal' },
      { id: 'd', label: 'Power factor cannot be determined from phase angle alone' }
    ],
    explanation: 'Lagging power factor means current lags voltage, caused by inductive loads like motors and transformers. Leading power factor means current leads voltage, caused by capacitive loads or over-corrected power factor. Load A (current lags) is inductive/lagging; Load B (current leads) is capacitive/leading.'
  },
  {
    scenario: 'A data center has many switch-mode power supplies and variable frequency drives. Power quality measurements show a displacement power factor of 0.98 but a true power factor of only 0.82.',
    question: 'What causes the difference between displacement power factor and true power factor?',
    options: [
      { id: 'a', label: 'Measurement error in the power analyzer' },
      { id: 'b', label: 'Harmonic distortion creates non-sinusoidal currents that reduce true power factor', correct: true },
      { id: 'c', label: 'Voltage fluctuations during the measurement period' },
      { id: 'd', label: 'Phase imbalance between the three phases' }
    ],
    explanation: 'Displacement power factor only considers the phase shift at the fundamental frequency (50/60 Hz). True power factor includes the effect of harmonics, which are multiples of the fundamental frequency. Non-linear loads like VFDs and SMPS draw distorted current, contributing apparent power but not real power, reducing true PF even when displacement PF is high.'
  },
  {
    scenario: 'A utility substation has voltage regulation problems. Engineers install a synchronous condenser, which is essentially a synchronous motor running without mechanical load.',
    question: 'How does a synchronous condenser provide reactive power support?',
    options: [
      { id: 'a', label: 'It stores energy in a flywheel to supply power during voltage dips' },
      { id: 'b', label: 'By adjusting field excitation, it can operate as either a capacitor or inductor to supply or absorb reactive power', correct: true },
      { id: 'c', label: 'It generates harmonics that cancel out power factor problems' },
      { id: 'd', label: 'Its rotating mass filters out voltage transients' }
    ],
    explanation: 'A synchronous condenser is a synchronous motor with no mechanical load. When over-excited (high field current), it generates leading reactive power like a capacitor. When under-excited, it absorbs reactive power like an inductor. This adjustable reactive power capability provides dynamic voltage support and power factor correction.'
  },
  {
    scenario: 'A three-phase industrial facility has balanced loads on each phase. Phase A shows 0.82 power factor, Phase B shows 0.82 power factor, and Phase C shows 0.82 power factor.',
    question: 'What is the overall three-phase power factor of this facility?',
    options: [
      { id: 'a', label: 'Cannot be determined without knowing the phase sequence' },
      { id: 'b', label: '0.82, the same as each individual phase', correct: true },
      { id: 'c', label: '0.946 (geometric mean of the three phases)' },
      { id: 'd', label: '2.46 (sum of the three phases)' }
    ],
    explanation: 'For a balanced three-phase system where each phase has identical power factor, the overall three-phase power factor equals the individual phase power factor. The power triangles for each phase are identical and simply scale up. With balanced loads at 0.82 PF on each phase, the total system operates at 0.82 PF.'
  },
  {
    scenario: 'A pump system is being upgraded from a fixed-speed motor with direct-on-line starting to a variable frequency drive (VFD) for energy savings. The old motor had 0.87 power factor at full load.',
    question: 'How does adding a VFD typically affect the power factor seen by the utility?',
    options: [
      { id: 'a', label: 'VFDs always improve power factor to near unity' },
      { id: 'b', label: 'VFDs have no effect on power factor' },
      { id: 'c', label: 'VFDs maintain high displacement PF but may reduce true PF due to harmonic distortion', correct: true },
      { id: 'd', label: 'VFDs always reduce power factor to below 0.7' }
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
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
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
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Correction',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
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
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
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

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          ⚡🔌
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Power Factor
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "A <span style={{ color: colors.error }}>1000W motor</span> and a <span style={{ color: colors.success }}>1000W heater</span> both say 1000W - but the motor actually draws <span style={{ color: colors.warning }}>25% more current</span>. Why?"
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
          style={primaryButtonStyle}
        >
          Explore Power Factor
        </button>

        {renderNavDots()}
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
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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

          {/* Simple diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>~</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>AC Voltage</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>→</div>
              <div style={{
                background: colors.accent + '33',
                padding: '20px 30px',
                borderRadius: '8px',
                border: `2px solid ${colors.accent}`,
              }}>
                <div style={{ fontSize: '24px' }}>⚙️</div>
                <p style={{ ...typo.small, color: colors.textPrimary }}>Motor (Inductor)</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>?</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Current Phase</p>
              </div>
            </div>
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

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Waveform Visualization
  if (phase === 'play') {
    const currentPhaseAngle = loadType === 'resistive' ? 0 : 37;
    const currentPF = Math.cos((currentPhaseAngle * Math.PI) / 180);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
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
            <svg viewBox="0 0 400 200" style={{ width: '100%', height: 'auto', marginBottom: '16px' }}>
              <defs>
                <linearGradient id="waveBg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#020617" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
              </defs>
              <rect width="400" height="200" fill="url(#waveBg)" rx="8" />

              {/* Grid lines */}
              <line x1="50" y1="100" x2="350" y2="100" stroke={colors.border} strokeWidth="1" />

              {/* Voltage waveform (blue) */}
              <path
                d={`M 50 100 ${Array.from({ length: 60 }, (_, i) => {
                  const x = 50 + i * 5;
                  const y = 100 - Math.sin((i / 60) * 4 * Math.PI + animationTime) * 50;
                  return `L ${x} ${y}`;
                }).join(' ')}`}
                fill="none"
                stroke={colors.voltage}
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Current waveform */}
              <path
                d={`M 50 100 ${Array.from({ length: 60 }, (_, i) => {
                  const x = 50 + i * 5;
                  const phaseShift = (currentPhaseAngle * Math.PI) / 180;
                  const y = 100 - Math.sin((i / 60) * 4 * Math.PI + animationTime - phaseShift) * 50;
                  return `L ${x} ${y}`;
                }).join(' ')}`}
                fill="none"
                stroke={loadType === 'resistive' ? colors.success : colors.current}
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Labels */}
              <text x="360" y="50" fill={colors.voltage} fontSize="12" fontWeight="600">V</text>
              <text x="360" y="70" fill={loadType === 'resistive' ? colors.success : colors.current} fontSize="12" fontWeight="600">I</text>
            </svg>

            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '24px', height: '3px', background: colors.voltage, borderRadius: '2px' }} />
                <span style={{ ...typo.small, color: colors.textSecondary }}>Voltage</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '24px', height: '3px', background: loadType === 'resistive' ? colors.success : colors.current, borderRadius: '2px' }} />
                <span style={{ ...typo.small, color: colors.textSecondary }}>Current {currentPhaseAngle > 0 && '(lagging)'}</span>
              </div>
            </div>

            {/* Load Type Selector */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => { setLoadType('resistive'); setHasExperimented(true); playSound('click'); }}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '12px',
                  border: loadType === 'resistive' ? `2px solid ${colors.success}` : `2px solid ${colors.border}`,
                  background: loadType === 'resistive' ? `${colors.success}22` : colors.bgSecondary,
                  color: colors.textPrimary,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔥</div>
                <div style={{ fontWeight: 600 }}>Heater</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Resistive Load</div>
              </button>
              <button
                onClick={() => { setLoadType('motor'); setHasExperimented(true); playSound('click'); }}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '12px',
                  border: loadType === 'motor' ? `2px solid ${colors.current}` : `2px solid ${colors.border}`,
                  background: loadType === 'motor' ? `${colors.current}22` : colors.bgSecondary,
                  color: colors.textPrimary,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚙️</div>
                <div style={{ fontWeight: 600 }}>Motor</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Inductive Load</div>
              </button>
            </div>
          </div>

          {/* Discovery prompt */}
          {loadType === 'motor' && (
            <div style={{
              background: `${colors.warning}22`,
              border: `1px solid ${colors.warning}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
                Notice how the current waveform lags behind voltage! This phase shift is why motors need more current.
              </p>
            </div>
          )}

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

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Physics of Power Factor
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
            <ul style={{ ...typo.body, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              <li>Utilities charge penalties for PF below 0.9</li>
              <li>Larger cables needed to carry reactive current</li>
              <li>Transformers and switchgear must be oversized</li>
              <li>More I²R losses heating up your wiring</li>
            </ul>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Discover the Solution
          </button>
        </div>

        {renderNavDots()}
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
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚙️</div>
                <div style={{ ...typo.small, color: colors.error }}>Motor (lag)</div>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>+</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚡</div>
                <div style={{ ...typo.small, color: colors.success }}>Capacitor (lead)</div>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>=</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>?</div>
                <div style={{ ...typo.small, color: colors.accent }}>Net Effect</div>
              </div>
            </div>
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

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Power Factor Correction
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Add capacitance to correct the motor's lagging power factor
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
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  accentColor: colors.success,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>No correction</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>Full correction</span>
              </div>
            </div>
          </div>

          {powerFactor >= 0.95 && (
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

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
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

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

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
              {app.description}
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

        {renderNavDots()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100vh',
          background: colors.bgPrimary,
          padding: '24px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
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
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

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

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {question.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  const newAnswers = [...testAnswers];
                  newAnswers[currentQuestion] = opt.id;
                  setTestAnswers(newAnswers);
                }}
                style={{
                  background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '24px',
                  marginRight: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Next
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
                disabled={testAnswers.some(a => a === null)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

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

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default PowerFactorRenderer;
