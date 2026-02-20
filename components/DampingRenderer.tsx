'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ============================================================================
// DAMPING - Premium Design (Inline Styles Only)
// 10-Phase Learning Structure
// ============================================================================

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Review',
  twist_predict: 'Twist Predict',
  twist_play: 'Twist Experiment',
  twist_review: 'Twist Review',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery'
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface GameEvent {
  type: string;
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

type DampingType = 'underdamped' | 'critical' | 'overdamped';

interface DampingRendererProps {
  width?: number;
  height?: number;
  onBack?: () => void;
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

// Real-world applications data
const realWorldApps = [
  {
    icon: '🚗',
    title: 'Car Suspension',
    tagline: 'Smooth Rides Through Damping',
    description: "Car shock absorbers use damped oscillation to provide a smooth ride. Without damping, hitting a bump would cause the car to bounce repeatedly. With critical damping, it returns to equilibrium quickly without oscillation. Modern vehicles use sophisticated hydraulic damper systems to convert kinetic energy into heat, providing optimal ride comfort across varying road conditions.",
    connection: "Seismic dampers add damping to buildings that would otherwise oscillate dangerously. Shock absorbers convert kinetic energy into heat through viscous fluid forced through small orifices. The damping coefficient is tuned to be slightly underdamped for comfort while avoiding dangerous oscillation.",
    howItWorks: "A piston moves through oil inside a cylinder. Small valves control oil flow, resisting motion proportionally to velocity. Spring provides restoring force, damper dissipates energy. The design targets a damping ratio around 0.3-0.4 for optimal comfort-control balance.",
    stats: [
      { value: '15 kg', label: 'damper mass', icon: '🎯' },
      { value: '100 mm', label: 'stroke length', icon: '🔄' },
      { value: '2 s', label: 'settling time', icon: '⏱️' }
    ],
    examples: ['Passenger car suspensions', 'Motorcycle forks', 'Bicycle shock absorbers', 'Aircraft landing gear'],
    companies: ['Bilstein', 'KYB', 'Monroe', 'Ohlins'],
    color: '#ec4899'
  },
  {
    icon: '🏢',
    title: 'Building Dampers',
    tagline: 'Earthquake Protection',
    description: "Modern earthquake-resistant buildings use large dampers to absorb seismic energy. These can reduce building motion by 40-70%, protecting both structure and occupants during earthquakes. Tuned mass dampers like the one in Taipei 101 weigh over 700 metric tons and swing freely inside the building to counteract wind and seismic forces, preventing structural fatigue and occupant discomfort.",
    connection: "Seismic dampers add damping to buildings that would otherwise oscillate dangerously. The damping ratio is increased from the natural 2-5% to 10-30%, dramatically reducing resonant amplification. This principle directly mirrors our experiment where higher damping reduces oscillation amplitude.",
    howItWorks: "Viscous dampers (giant shock absorbers) or friction dampers convert kinetic energy to heat. Tuned mass dampers swing out of phase with building motion. Base isolation allows the ground to move without transferring energy to the structure.",
    stats: [
      { value: '60%', label: 'sway reduction', icon: '📉' },
      { value: '730 kg', label: 'damper mass', icon: '💪' },
      { value: '50 m', label: 'building height', icon: '🏗️' }
    ],
    examples: ['Taipei 101 tuned mass damper', 'Tokyo Skytree friction dampers', 'SF Salesforce Tower viscous dampers', 'LA City Hall base isolation'],
    companies: ['Taylor Devices', 'Enidine', 'Damptech', 'Maurer'],
    color: '#8b5cf6'
  },
  {
    icon: '🔊',
    title: 'Speakers',
    tagline: 'Controlled Cone Movement',
    description: "Speaker cones must move quickly to reproduce sound, but also stop quickly to avoid distortion. The suspension system provides carefully tuned damping for accurate audio reproduction. High-end studio monitors achieve total harmonic distortion below 0.5% across the audible spectrum by precisely engineering the mechanical and electromagnetic damping of each driver to match the intended frequency response curve.",
    connection: "Speaker designers balance damping to allow fast transient response while preventing ringing. Too little damping causes muddy bass; too much damping reduces efficiency and dynamics.",
    howItWorks: "The spider and surround provide mechanical damping. The voice coil in the magnetic field provides electromagnetic damping. The enclosure adds acoustic damping through air resistance and absorbent materials.",
    stats: [
      { value: '3%', label: 'THD target', icon: '📊' },
      { value: '20 W', label: 'driver power', icon: '🎯' },
      { value: '200 mm', label: 'cone diameter', icon: '〰️' }
    ],
    examples: ['Studio monitors', 'Subwoofers', 'Car audio', 'PA systems'],
    companies: ['JBL', 'Focal', 'KEF', 'Dynaudio'],
    color: '#f59e0b'
  },
  {
    icon: '⌚',
    title: 'Watch Movements',
    tagline: 'Precision Timekeeping',
    description: "Mechanical watches use the balance wheel as an oscillator. The escapement provides tiny impulses to overcome damping from air resistance and friction, maintaining constant amplitude and accurate timekeeping. Swiss chronometers must maintain accuracy within -4/+6 seconds per day, requiring exceptional control over energy loss throughout the entire gear train and escapement mechanism.",
    connection: "Watch designers minimize damping to reduce energy loss, but some damping is necessary to prevent chaotic motion. The quality factor Q measures how many oscillations occur before amplitude drops to 1/e.",
    howItWorks: "The balance wheel oscillates at a precise frequency (usually 28,800 beats/hour). The escapement releases energy in tiny pulses to replace what's lost to friction. Higher Q means less energy needed and longer power reserve.",
    stats: [
      { value: '300 V', label: 'quality factor Q', icon: '🎚️' },
      { value: '4 GHz', label: 'typical frequency', icon: '〰️' },
      { value: '5 kg', label: 'movement mass', icon: '🎯' }
    ],
    examples: ['Swiss lever escapement', 'Detent escapement', 'Cylinder escapement', 'Pin-lever escapement'],
    companies: ['Rolex', 'Omega', 'Seiko', 'Patek Philippe'],
    color: '#ec4899'
  }
];

// Test questions with scenarios - AVOID words: "continue", "submit", "finish", "see results", "next question"
const testQuestions = [
  {
    scenario: "You push a child on a swing once and watch them swing back and forth.",
    question: "What happens to the swing's amplitude over time if you don't push again?",
    options: [
      { id: 'a', text: "It stays constant forever (perpetual motion)", correct: false },
      { id: 'b', text: "It gradually decreases due to air resistance and friction", correct: true },
      { id: 'c', text: "It increases as the swing speeds up", correct: false },
      { id: 'd', text: "It oscillates between high and low amplitude", correct: false }
    ],
    explanation: "Real oscillators always lose energy to friction and air resistance. This energy is converted to heat, causing the amplitude to gradually decay. Without additional energy input, all oscillations eventually stop."
  },
  {
    scenario: "A car hits a bump and the suspension compresses. The shock absorber is working correctly.",
    question: "What's the ideal behavior after hitting the bump?",
    options: [
      { id: 'a', text: "The car bounces up and down several times before settling", correct: false },
      { id: 'b', text: "The car returns to level quickly with minimal or no bouncing", correct: true },
      { id: 'c', text: "The car stays compressed for a long time before slowly rising", correct: false },
      { id: 'd', text: "The car immediately snaps back and overshoots significantly", correct: false }
    ],
    explanation: "Optimal car suspension is slightly underdamped to critically damped. This allows the car to return to equilibrium quickly (unlike overdamped) without excessive bouncing (unlike underdamped). One small overshoot is acceptable for comfort."
  },
  {
    scenario: "You're designing a door closer for a hospital entrance.",
    question: "Why would you choose overdamped or critically damped rather than underdamped?",
    options: [
      { id: 'a', text: "Underdamped doors close faster", correct: false },
      { id: 'b', text: "Overdamped doors are cheaper to manufacture", correct: false },
      { id: 'c', text: "Critically damped prevents the door from bouncing back open", correct: true },
      { id: 'd', text: "Underdamped doors use less energy", correct: false }
    ],
    explanation: "An underdamped door would swing past closed, bounce back open, and oscillate before settling. This is dangerous in a hospital where gurneys need to pass through. Critical damping ensures the door closes once and stays closed without bouncing."
  },
  {
    scenario: "A pendulum in a vacuum oscillates at 1 Hz. The same pendulum in honey oscillates very slowly and doesn't swing back.",
    question: "What type of damping does the honey provide?",
    options: [
      { id: 'a', text: "Underdamped - it still oscillates", correct: false },
      { id: 'b', text: "Critically damped - fastest return without oscillation", correct: false },
      { id: 'c', text: "Overdamped - slow return without oscillation", correct: true },
      { id: 'd', text: "Undamped - no energy loss", correct: false }
    ],
    explanation: "Honey's high viscosity provides strong damping. When the pendulum doesn't oscillate at all and returns very slowly to equilibrium, it's overdamped. The damping force dominates the restoring force, preventing any overshoot."
  },
  {
    scenario: "Two identical springs with masses are set oscillating. One is in air, one is in water.",
    question: "How do their oscillation patterns compare?",
    options: [
      { id: 'a', text: "Same frequency, water one decays faster", correct: false },
      { id: 'b', text: "Water one has higher frequency and decays faster", correct: false },
      { id: 'c', text: "Water one has lower frequency and decays faster", correct: true },
      { id: 'd', text: "They're identical since water only adds buoyancy", correct: false }
    ],
    explanation: "Water adds damping (viscous drag) which causes faster amplitude decay. Additionally, the damping slightly reduces the natural frequency. The formula becomes omega_d = omega_0 * sqrt(1-zeta^2), where zeta is the damping ratio. Higher damping = lower frequency."
  },
  {
    scenario: "An engineer measures that a vibrating beam's amplitude drops to 37% (1/e) after 100 oscillations.",
    question: "What is the quality factor Q of this oscillator?",
    options: [
      { id: 'a', text: "Q = 37", correct: false },
      { id: 'b', text: "Q = 100", correct: false },
      { id: 'c', text: "Q = 314 (100 times pi)", correct: true },
      { id: 'd', text: "Q = 1000", correct: false }
    ],
    explanation: "Quality factor Q measures how many radians of oscillation occur before amplitude drops to 1/e. Since amplitude drops to 1/e after 100 cycles, and each cycle is 2pi radians: Q = 100 * pi = 314."
  },
  {
    scenario: "A tuning fork produces sound at 440 Hz and rings for about 10 seconds before becoming inaudible.",
    question: "If you dip the same tuning fork in water, what happens to its ringing?",
    options: [
      { id: 'a', text: "It rings longer because water adds mass", correct: false },
      { id: 'b', text: "It rings shorter because water adds damping", correct: true },
      { id: 'c', text: "It rings at the same duration but sounds different", correct: false },
      { id: 'd', text: "It stops ringing entirely", correct: false }
    ],
    explanation: "Water adds significant viscous damping to the tuning fork's vibration. The energy is dissipated much faster into the water, causing the amplitude to decay more quickly. The tuning fork might only ring for 1-2 seconds in water instead of 10 seconds in air."
  },
  {
    scenario: "A building has a natural sway frequency of 0.2 Hz. Engineers want to add seismic damping.",
    question: "What's the benefit of increasing the damping ratio from 2% to 20%?",
    options: [
      { id: 'a', text: "The building will sway at a higher frequency", correct: false },
      { id: 'b', text: "The building will experience less resonant amplification during earthquakes", correct: true },
      { id: 'c', text: "The building will be stiffer and not sway at all", correct: false },
      { id: 'd', text: "The building will sway more during earthquakes", correct: false }
    ],
    explanation: "At resonance, amplification = 1/(2*zeta). With 2% damping (zeta=0.02), amplification = 25x. With 20% damping (zeta=0.2), amplification = 2.5x. Higher damping dramatically reduces the dangerous amplification that occurs when earthquake frequency matches building frequency."
  },
  {
    scenario: "You're analyzing the amplitude decay of a guitar string after being plucked.",
    question: "The amplitude A(t) follows an exponential decay. Which equation describes this?",
    options: [
      { id: 'a', text: "A(t) = A0 cos(omega*t)", correct: false },
      { id: 'b', text: "A(t) = A0 e^(-gamma*t) cos(omega_d * t)", correct: true },
      { id: 'c', text: "A(t) = A0 / t", correct: false },
      { id: 'd', text: "A(t) = A0 (1 - e^(-gamma*t))", correct: false }
    ],
    explanation: "Damped oscillation combines oscillatory motion (cosine) with exponential decay (e^(-gamma*t)). The full solution is A(t) = A0 e^(-gamma*t) cos(omega_d*t), where gamma is the decay constant and omega_d is the damped frequency."
  },
  {
    scenario: "A physicist measures the damping ratio of a pendulum to be exactly 1.0.",
    question: "What special condition is this, and what does it mean for the motion?",
    options: [
      { id: 'a', text: "Underdamped - oscillates with slowly decreasing amplitude", correct: false },
      { id: 'b', text: "Critical damping - returns to equilibrium fastest without oscillating", correct: true },
      { id: 'c', text: "Overdamped - returns very slowly without oscillating", correct: false },
      { id: 'd', text: "No damping - oscillates forever at constant amplitude", correct: false }
    ],
    explanation: "Damping ratio zeta = 1 is exactly critical damping. This is the boundary between oscillatory (underdamped, zeta<1) and non-oscillatory (overdamped, zeta>1) motion. Critical damping provides the fastest return to equilibrium without any overshoot or oscillation."
  }
];

const DampingRenderer: React.FC<DampingRendererProps> = ({
  width = 800,
  height = 600,
  onBack,
  onGameEvent,
  gamePhase,
  onPhaseComplete
}) => {
  const [phase, setPhase] = useState<Phase>('hook');

  // Sync with external phase control
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase) && gamePhase !== phase) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase, phase]);

  // Web Audio API sound
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const sounds = {
        click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType },
        success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
        failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
        transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType },
        complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType }
      };
      const sound = sounds[type];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch { /* Audio not supported */ }
  }, []);

  // Emit events
  const emitEvent = useCallback((type: string, details: Record<string, unknown> = {}) => {
    if (onGameEvent) {
      onGameEvent({
        type,
        gameType: 'damping',
        gameTitle: 'Damped Oscillations',
        details: { phase, ...details },
        timestamp: Date.now()
      });
    }
  }, [onGameEvent, phase]);

  // Phase navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    playSound('transition');
    setPhase(newPhase);
    emitEvent('phase_change', { from: phase, to: newPhase });
    if (onPhaseComplete) onPhaseComplete(newPhase);
  }, [playSound, emitEvent, phase, onPhaseComplete]);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Quiz state - confirm flow
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(new Array(testQuestions.length).fill(null));
  const [confirmedQuestions, setConfirmedQuestions] = useState<Set<number>>(new Set());
  const [testScore, setTestScore] = useState(0);
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Damping simulation state
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [dampingRatio, setDampingRatio] = useState(0.1);
  const [isOscillating, setIsOscillating] = useState(false);
  const [position, setPosition] = useState(100);
  const [velocity, setVelocity] = useState(0);
  const [time, setTime] = useState(0);
  const [amplitudeHistory, setAmplitudeHistory] = useState<{t: number, amp: number}[]>([]);
  const [medium, setMedium] = useState<'air' | 'water' | 'honey'>('air');

  const animationRef = useRef<number | null>(null);

  // Design system
  const colors = {
    primary: '#ec4899',
    primaryLight: '#f472b6',
    primaryDark: '#db2777',
    accent: '#06b6d4',
    accentLight: '#22d3ee',
    success: '#22c55e',
    successLight: '#4ade80',
    warning: '#f59e0b',
    danger: '#ef4444',
    bgDark: '#0a0a0f',
    bgCard: '#12121a',
    bgCardLight: '#1a1a24',
    bgElevated: '#22222e',
    border: '#2a2a36',
    borderLight: '#3a3a48',
    textPrimary: '#fafafa',
    textSecondary: 'rgba(161,161,170,0.85)',
    textMuted: 'rgba(113,113,122,0.7)',
  };

  const currentPhaseIndex = phaseOrder.indexOf(phase);
  const canGoBack = currentPhaseIndex > 0;
  const canGoNext = currentPhaseIndex < phaseOrder.length - 1 && phase !== 'test';

  // Get damping type label
  const getDampingType = (ratio: number): DampingType => {
    if (ratio < 1) return 'underdamped';
    if (ratio === 1) return 'critical';
    return 'overdamped';
  };

  // Damping simulation
  useEffect(() => {
    if (!isOscillating) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const omega0 = 2 * Math.PI;
    let lastTime = performance.now();
    let simTime = 0;
    let simPosition = position;
    let simVelocity = velocity;
    const newHistory: {t: number, amp: number}[] = [];

    const animate = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;
      simTime += dt;

      const gamma = dampingRatio * omega0;
      const acceleration = -2 * gamma * simVelocity - omega0 * omega0 * simPosition;
      simVelocity += acceleration * dt;
      simPosition += simVelocity * dt;

      setPosition(simPosition);
      setVelocity(simVelocity);
      setTime(simTime);

      if (newHistory.length === 0 || simTime - newHistory[newHistory.length - 1].t > 0.1) {
        newHistory.push({ t: simTime, amp: Math.abs(simPosition) });
        setAmplitudeHistory([...newHistory]);
      }

      if ((Math.abs(simPosition) < 0.5 && Math.abs(simVelocity) < 0.5) || simTime > 15) {
        setIsOscillating(false);
        return;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isOscillating, dampingRatio]);

  // Update damping ratio based on medium
  useEffect(() => {
    if (medium === 'air') setDampingRatio(0.1);
    else if (medium === 'water') setDampingRatio(0.5);
    else if (medium === 'honey') setDampingRatio(2.0);
  }, [medium]);

  const startOscillation = useCallback(() => {
    setPosition(100);
    setVelocity(0);
    setTime(0);
    setAmplitudeHistory([]);
    setIsOscillating(true);
  }, []);

  const stopOscillation = useCallback(() => {
    setIsOscillating(false);
    setPosition(100);
    setVelocity(0);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Mastery event
  useEffect(() => {
    if (phase === 'mastery') {
      emitEvent('mastery_achieved', { score: testScore, total: testQuestions.length });
    }
  }, [phase, testScore, emitEvent]);

  // ============ SHARED STYLES ============
  const cardStyle: React.CSSProperties = {
    background: colors.bgCard,
    borderRadius: '16px',
    padding: '24px',
    border: `1px solid ${colors.border}`,
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  };

  const primaryBtnStyle: React.CSSProperties = {
    padding: '14px 32px',
    borderRadius: '12px',
    border: 'none',
    background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
    color: 'white',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '16px',
    transition: 'all 0.3s ease',
    zIndex: 10,
    position: 'relative' as const,
    boxShadow: '0 4px 12px rgba(236,72,153,0.3)',
  };

  // ============ HELPER RENDERERS ============

  // Progress bar - fixed at top
  const renderProgressBar = () => {
    const progress = ((currentPhaseIndex + 1) / phaseOrder.length) * 100;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '3px', background: colors.bgCardLight, zIndex: 100 }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
          borderRadius: '0 2px 2px 0',
          transition: 'width 0.5s ease',
        }} />
      </div>
    );
  };

  // Nav dots (only in bottom bar)
  const renderNavDots = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          title={phaseLabels[p]}
          aria-label={phaseLabels[p]}
          style={{
            height: '8px',
            width: phase === p ? '24px' : '8px',
            borderRadius: '9999px',
            border: 'none',
            cursor: 'pointer',
            background: phase === p ? colors.primary : currentPhaseIndex > i ? colors.success : colors.bgCardLight,
            boxShadow: phase === p ? `0 0 12px ${colors.primary}40` : 'none',
            transition: 'all 0.3s ease',
            zIndex: 10,
            position: 'relative' as const,
          }}
        />
      ))}
    </div>
  );

  // Bottom navigation bar with Back/Next and nav dots
  const renderBottomBar = () => (
    <div style={{
      padding: '16px 24px',
      background: colors.bgCard,
      borderTop: `1px solid ${colors.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <button
        onClick={() => canGoBack && goToPhase(phaseOrder[currentPhaseIndex - 1])}
        disabled={!canGoBack}
        style={{
          padding: '10px 24px',
          borderRadius: '10px',
          border: `1px solid ${colors.border}`,
          background: 'transparent',
          color: canGoBack ? colors.textPrimary : colors.textMuted,
          cursor: canGoBack ? 'pointer' : 'default',
          fontWeight: 600,
          fontSize: '14px',
          transition: 'all 0.2s ease',
          opacity: canGoBack ? 1 : 0.4,
        }}
      >
        Back
      </button>
      {renderNavDots()}
      <button
        onClick={() => canGoNext && goToPhase(phaseOrder[currentPhaseIndex + 1])}
        disabled={!canGoNext || phase === 'test'}
        style={{
          padding: '10px 24px',
          borderRadius: '10px',
          border: 'none',
          background: canGoNext && phase !== 'test' ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})` : colors.bgCardLight,
          color: canGoNext && phase !== 'test' ? 'white' : colors.textMuted,
          cursor: canGoNext && phase !== 'test' ? 'pointer' : 'default',
          fontWeight: 600,
          fontSize: '14px',
          transition: 'all 0.2s ease',
          opacity: canGoNext && phase !== 'test' ? 1 : 0.4,
        }}
      >
        Next
      </button>
    </div>
  );

  // Oscillator visualization
  const renderOscillator = (showControls: boolean = true, compact: boolean = false) => {
    const svgWidth = compact ? 280 : 380;
    const svgHeight = compact ? 180 : 220;
    const centerY = svgHeight / 2;
    const equilibriumX = svgWidth / 2;

    const displayX = equilibriumX + (position * 1.2);
    const massSize = 32;

    const springCoils = 8;
    const springWidth = displayX - 50;

    const omega0 = 2 * Math.PI;
    const gamma = dampingRatio * omega0;
    const envelopeAmp = 100 * Math.exp(-gamma * time);

    // Damping-dependent visual properties
    const dampColor = dampingRatio < 1 ? colors.primary : dampingRatio === 1 ? colors.success : colors.accent;
    const dampOpacity = Math.min(1, dampingRatio / 2);

    return (
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        alignItems: isMobile ? 'center' : 'flex-start',
      }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
        <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMidYMid meet" style={{ borderRadius: '16px', border: `1px solid ${colors.border}`, maxWidth: `${svgWidth}px` }}>
          <defs>
            <linearGradient id="dampBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a1a24"/>
              <stop offset="50%" stopColor="#121218"/>
              <stop offset="100%" stopColor="#0a0a0f"/>
            </linearGradient>
            <linearGradient id="dampWaterMedium" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.accent} stopOpacity="0.05"/>
              <stop offset="50%" stopColor={colors.accent} stopOpacity="0.15"/>
              <stop offset="100%" stopColor={colors.accent} stopOpacity="0.25"/>
            </linearGradient>
            <linearGradient id="dampHoneyMedium" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.warning} stopOpacity="0.1"/>
              <stop offset="50%" stopColor={colors.warning} stopOpacity="0.2"/>
              <stop offset="100%" stopColor={colors.warning} stopOpacity="0.35"/>
            </linearGradient>
            <linearGradient id="dampWallGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2a2a36"/>
              <stop offset="50%" stopColor="#5a5a68"/>
              <stop offset="100%" stopColor="#3a3a48"/>
            </linearGradient>
            <linearGradient id="dampSpringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.primaryDark}/>
              <stop offset="50%" stopColor={colors.primaryLight}/>
              <stop offset="100%" stopColor={colors.primaryDark}/>
            </linearGradient>
            <radialGradient id="dampMassGrad" cx="30%" cy="25%">
              <stop offset="0%" stopColor={colors.accentLight}/>
              <stop offset="50%" stopColor={colors.accent}/>
              <stop offset="100%" stopColor="#0891b2"/>
            </radialGradient>
            <radialGradient id="dampIndicatorGrad" cx="50%" cy="50%">
              <stop offset="0%" stopColor={dampColor} stopOpacity="0.4"/>
              <stop offset="100%" stopColor={dampColor} stopOpacity="0"/>
            </radialGradient>
            <filter id="dampMassGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="dampSpringGlow" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <linearGradient id="dampEqGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#71717a" stopOpacity="0"/>
              <stop offset="50%" stopColor="#71717a" stopOpacity="0.6"/>
              <stop offset="100%" stopColor="#71717a" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="dampAmpMarkerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.success} stopOpacity="0"/>
              <stop offset="50%" stopColor={colors.success} stopOpacity="0.8"/>
              <stop offset="100%" stopColor={colors.success} stopOpacity="0"/>
            </linearGradient>
          </defs>

          <rect width={svgWidth} height={svgHeight} fill="url(#dampBgGrad)"/>

          {/* SVG title */}
          <title>Damped Oscillation Visualization</title>

          {/* Grid lines group */}
          <g opacity="0.15">
            {[...Array(6)].map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * svgHeight / 5} x2={svgWidth} y2={i * svgHeight / 5} stroke="#71717a" strokeWidth="0.5" strokeDasharray="4,4"/>
            ))}
            {[...Array(8)].map((_, i) => (
              <line key={`v${i}`} x1={i * svgWidth / 7} y1="0" x2={i * svgWidth / 7} y2={svgHeight} stroke="#71717a" strokeWidth="0.5" strokeDasharray="4,4"/>
            ))}
          </g>

          {/* Medium overlay group */}
          <g>
            {medium === 'water' && (
              <rect x="22" y={centerY - 50} width={svgWidth - 22} height="100" fill="url(#dampWaterMedium)" />
            )}
            {medium === 'honey' && (
              <rect x="22" y={centerY - 50} width={svgWidth - 22} height="100" fill="url(#dampHoneyMedium)" />
            )}
          </g>

          {/* Damping indicator - changes with slider */}
          <g opacity={dampOpacity}>
            <circle cx={svgWidth - 30} cy={30} r={12 + dampingRatio * 8} fill="url(#dampIndicatorGrad)" />
            <circle cx={svgWidth - 30} cy={30} r={4} fill={dampColor} />
            <path d={`M ${svgWidth - 42} ${centerY - 30} Q ${svgWidth - 36} ${centerY - 30 - Math.max(dampingRatio * 30, 30)} ${svgWidth - 30} ${centerY - 30} Q ${svgWidth - 24} ${centerY - 30 + Math.max(dampingRatio * 30, 30)} ${svgWidth - 18} ${centerY - 30}`} fill="none" stroke={dampColor} strokeWidth="1.5" />
          </g>

          {isOscillating && dampingRatio < 1 && (
            <g opacity="0.4">
              <line x1={equilibriumX + envelopeAmp * 1.2} y1={centerY - 40} x2={equilibriumX + envelopeAmp * 1.2} y2={centerY + 40} stroke="url(#dampAmpMarkerGrad)" strokeWidth="2" strokeDasharray="4,4" />
              <line x1={equilibriumX - envelopeAmp * 1.2} y1={centerY - 40} x2={equilibriumX - envelopeAmp * 1.2} y2={centerY + 40} stroke="url(#dampAmpMarkerGrad)" strokeWidth="2" strokeDasharray="4,4" />
            </g>
          )}

          {/* Wall group */}
          <g>
            <rect x="0" y={centerY - 50} width="22" height="100" fill="url(#dampWallGrad)" rx="2" />
            <line x1="22" y1={centerY - 50} x2="22" y2={centerY + 50} stroke="#1a1a24" strokeWidth="2" />
            {/* Wall hatching */}
            <path d={`M 4 ${centerY - 40} L 18 ${centerY - 50} M 4 ${centerY - 20} L 18 ${centerY - 30} M 4 ${centerY} L 18 ${centerY - 10} M 4 ${centerY + 20} L 18 ${centerY + 10} M 4 ${centerY + 40} L 18 ${centerY + 30}`} stroke="#5a5a68" strokeWidth="1" opacity="0.5" fill="none" />
          </g>

          {/* Spring path */}
          <path
            d={(() => {
              let path = `M 22 ${centerY}`;
              const coilWidth = Math.max(springWidth / springCoils, 5);
              for (let i = 0; i < springCoils; i++) {
                const x1 = 22 + (i + 0.25) * coilWidth;
                const x2 = 22 + (i + 0.75) * coilWidth;
                const y1 = centerY + (i % 2 === 0 ? 35 : -35);
                const y2 = centerY + (i % 2 === 0 ? -35 : 35);
                path += ` L ${x1} ${y1} L ${x2} ${y2}`;
              }
              path += ` L ${displayX - massSize / 2} ${centerY}`;
              return path;
            })()}
            fill="none"
            stroke="url(#dampSpringGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#dampSpringGlow)"
          />

          <line x1={equilibriumX} y1={centerY - 60} x2={equilibriumX} y2={centerY + 60} stroke="url(#dampEqGrad)" strokeWidth="2" strokeDasharray="8,4" />

          {/* Mass block group */}
          <g>
            <rect x={displayX - massSize / 2 - 8} y={centerY - massSize / 2 - 8} width={massSize + 16} height={massSize + 16} rx="12" fill={colors.accent} opacity="0.15" filter="url(#dampMassGlow)" />
            <rect x={displayX - massSize / 2} y={centerY - massSize / 2} width={massSize} height={massSize} rx="8" fill="url(#dampMassGrad)" />
            <ellipse cx={displayX} cy={centerY} rx={massSize / 4} ry={massSize / 4} fill="white" opacity="0.15" />
          </g>

          {isOscillating && Math.abs(velocity) > 5 && (
            <g>
              <line x1={displayX} y1={centerY - massSize / 2 - 15} x2={displayX + Math.sign(velocity) * Math.min(Math.abs(velocity) * 0.3, 30)} y2={centerY - massSize / 2 - 15} stroke={colors.warning} strokeWidth="3" strokeLinecap="round" />
              <polygon
                points={`${displayX + Math.sign(velocity) * Math.min(Math.abs(velocity) * 0.3, 30)},${centerY - massSize / 2 - 15} ${displayX + Math.sign(velocity) * (Math.min(Math.abs(velocity) * 0.3, 30) - 8)},${centerY - massSize / 2 - 20} ${displayX + Math.sign(velocity) * (Math.min(Math.abs(velocity) * 0.3, 30) - 8)},${centerY - massSize / 2 - 10}`}
                fill={colors.warning}
              />
            </g>
          )}

          {/* Damped oscillation reference curve showing amplitude envelope */}
          <path
            d={(() => {
              const curvePoints: string[] = [];
              const omega0 = 2 * Math.PI;
              const gamma = dampingRatio * omega0;
              const numPts = 40;
              const tMax = 4;
              for (let i = 0; i <= numPts; i++) {
                const t = (i / numPts) * tMax;
                const amp = 80 * Math.exp(-gamma * t) * Math.cos(omega0 * Math.sqrt(Math.max(0, 1 - dampingRatio * dampingRatio)) * t);
                const px = 30 + (t / tMax) * (svgWidth - 60);
                const py = centerY - amp;
                curvePoints.push(`${px} ${py}`);
              }
              return `M ${curvePoints.join(' L ')}`;
            })()}
            fill="none"
            stroke={dampColor}
            strokeWidth="1.5"
            opacity="0.35"
            strokeLinecap="round"
          />

          {/* Labels group */}
          <g>
            <text x={equilibriumX} y={centerY + 55} fill="#71717a" fontSize="11" textAnchor="middle">Equilibrium</text>
            <text x={30} y={centerY + 55} fill="#71717a" fontSize="11" textAnchor="start">Wall</text>
            <text x={svgWidth - 30} y={svgHeight - 8} fill={dampColor} fontSize="11" textAnchor="middle">zeta={dampingRatio.toFixed(2)}</text>
            {/* Axis labels */}
            <text x={svgWidth / 2} y={svgHeight - 4} fill="#71717a" fontSize="11" textAnchor="middle" fontWeight="600">Position (time)</text>
            <text x={8} y={18} fill="#71717a" fontSize="11" textAnchor="start" fontWeight="600">Amplitude</text>
          </g>
        </svg>
        </div>
        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
        {showControls && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            maxWidth: '360px',
            padding: '16px',
            background: colors.bgCard,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: colors.textSecondary, minWidth: '90px', fontWeight: 500 }}>Damping coefficient (zeta):</span>
                <span style={{ fontSize: '13px', color: colors.textPrimary, minWidth: '45px', fontWeight: 600 }}>
                  {dampingRatio.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: colors.textMuted, minWidth: '28px' }}>Low</span>
                <input
                  type="range"
                  min="0.05"
                  max="2"
                  step="0.05"
                  value={dampingRatio}
                  onChange={(e) => {
                    setDampingRatio(Number(e.target.value));
                    stopOscillation();
                  }}
                  style={{ touchAction: 'pan-y', width: '100%', flex: 1, accentColor: colors.primary }}
                />
                <span style={{ fontSize: '11px', color: colors.textMuted, minWidth: '28px', textAlign: 'right' }}>High</span>
              </div>
            </div>

            <button
              onClick={() => isOscillating ? stopOscillation() : startOscillation()}
              style={{
                ...primaryBtnStyle,
                padding: '12px 16px',
                fontSize: '14px',
                background: isOscillating
                  ? `linear-gradient(135deg, ${colors.danger}, #dc2626)`
                  : `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
              }}
            >
              {isOscillating ? 'Stop' : 'Release Mass'}
            </button>

            <div style={{
              padding: '12px',
              background: getDampingType(dampingRatio) === 'critical' ? `${colors.success}15` : colors.bgCardLight,
              borderRadius: '8px',
              border: `1px solid ${getDampingType(dampingRatio) === 'critical' ? colors.success : colors.border}`,
              textAlign: 'center'
            }}>
              <span style={{
                fontSize: '13px',
                color: getDampingType(dampingRatio) === 'critical' ? colors.success : colors.textSecondary,
                fontWeight: getDampingType(dampingRatio) === 'critical' ? 600 : 400
              }}>
                {getDampingType(dampingRatio) === 'underdamped' && 'zeta < 1: System oscillates with decaying amplitude'}
                {getDampingType(dampingRatio) === 'critical' && 'zeta = 1: Fastest return without oscillation!'}
                {getDampingType(dampingRatio) === 'overdamped' && 'zeta > 1: Slow return, no oscillation'}
              </span>
            </div>
          </div>
        )}
        </div>
      </div>
    );
  };

  // ============ PHASE RENDERERS ============

  const renderHook = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: `${colors.primary}15`, border: `1px solid ${colors.primary}30`, borderRadius: '9999px', marginBottom: '32px' }}>
        <span style={{ width: '8px', height: '8px', background: colors.primary, borderRadius: '9999px' }} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: colors.primary, letterSpacing: '0.05em' }}>PHYSICS EXPLORATION</span>
      </div>

      <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', marginBottom: '16px', lineHeight: 1.1 }}>
        Damped Oscillations
      </h1>

      <p style={{ fontSize: '18px', color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px', lineHeight: 1.7 }}>
        Discover why swings stop and how engineers control vibrations
      </p>

      <div style={{ ...cardStyle, maxWidth: '520px', width: '100%', marginBottom: '32px', position: 'relative' as const }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>〰️</div>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)', fontWeight: 500, lineHeight: 1.7, marginBottom: '12px' }}>
          You push a child on a swing once and walk away.
        </p>
        <p style={{ fontSize: '16px', color: colors.textSecondary, lineHeight: 1.7, marginBottom: '12px' }}>
          Will it swing forever? Or is there something that steals its energy?
        </p>
        <p style={{ fontSize: '16px', color: colors.primary, fontWeight: 600 }}>
          Uncover the science of damping and how it shapes our world!
        </p>
      </div>

      <button onClick={() => goToPhase('predict')} style={primaryBtnStyle}>
        Explore Damping
      </button>

      <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '32px', fontSize: '14px', color: colors.textMuted }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: colors.primary }}>✦</span>
          Interactive Lab
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: colors.primary }}>✦</span>
          Real-World Examples
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: colors.primary }}>✦</span>
          Knowledge Test
        </div>
      </div>
    </div>
  );

  // Predict phase
  const renderPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '32px 24px', alignItems: 'center' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>Your Prediction</h2>
      <p style={{ fontSize: '16px', color: colors.textSecondary, marginBottom: '24px', textAlign: 'center' }}>
        A mass on a spring is pulled and released in air...
      </p>

      {/* SVG visualization for predict phase */}
      <div style={{ marginBottom: '24px' }}>
        <svg width="100%" height="200" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: '360px' }}>
          <defs>
            <linearGradient id="predDampBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a1a24" />
              <stop offset="100%" stopColor="#0a0a0f" />
            </linearGradient>
            <linearGradient id="predSpring" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.primaryDark} />
              <stop offset="50%" stopColor={colors.primaryLight} />
              <stop offset="100%" stopColor={colors.primaryDark} />
            </linearGradient>
            <radialGradient id="predMass" cx="30%" cy="30%" r="65%">
              <stop offset="0%" stopColor={colors.accentLight} />
              <stop offset="100%" stopColor="#0891b2" />
            </radialGradient>
            <linearGradient id="predWall" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3a3a48" />
              <stop offset="100%" stopColor="#5a5a68" />
            </linearGradient>
            <filter id="predGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="360" height="200" fill="url(#predDampBg)" rx="12" />

          {/* Grid */}
          <g opacity="0.06">
            {[0,1,2,3,4].map(i => <line key={`h${i}`} x1="0" y1={i*50} x2="360" y2={i*50} stroke="#fff" strokeWidth="0.5" />)}
            {[0,1,2,3,4,5,6].map(i => <line key={`v${i}`} x1={i*60} y1="0" x2={i*60} y2="200" stroke="#fff" strokeWidth="0.5" />)}
          </g>

          {/* Wall */}
          <rect x="10" y="60" width="18" height="80" fill="url(#predWall)" rx="2" />

          {/* Spring coils */}
          <path d="M 28 100 L 48 80 L 68 120 L 88 80 L 108 120 L 128 80 L 148 120 L 168 100" fill="none" stroke="url(#predSpring)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#predGlow)" />

          {/* Mass block */}
          <rect x="168" y="82" width="36" height="36" rx="8" fill="url(#predMass)" />

          {/* Equilibrium line */}
          <line x1="190" y1="50" x2="190" y2="150" stroke="#71717a" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.5" />
          <text x="190" y="165" fill="#71717a" fontSize="11" textAnchor="middle">Equilibrium</text>

          {/* Arrow showing pull */}
          <g>
            <line x1="210" y1="100" x2="270" y2="100" stroke={colors.warning} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="270,100 260,94 260,106" fill={colors.warning} />
            <text x="240" y="90" fill={colors.warning} fontSize="11" textAnchor="middle" fontWeight="600">Pull</text>
          </g>

          {/* Question marks */}
          <g opacity="0.6">
            <text x="300" y="75" fill={colors.primary} fontSize="22" fontWeight="700">?</text>
            <text x="320" y="105" fill={colors.accent} fontSize="18" fontWeight="700">?</text>
            <text x="290" y="130" fill={colors.warning} fontSize="16" fontWeight="700">?</text>
          </g>
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '520px', width: '100%' }}>
        {[
          { id: 'forever', label: 'It oscillates forever at constant amplitude', icon: '♾️' },
          { id: 'decay_linear', label: 'Amplitude decreases steadily (linear decay)', icon: '📉' },
          { id: 'decay_exp', label: 'Amplitude decreases faster at first, then slower (exponential)', icon: '📈' },
          { id: 'stops_sudden', label: 'It stops suddenly after a few swings', icon: '⏹️' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => setPrediction(option.id)}
            style={{
              padding: '18px',
              fontSize: '15px',
              fontWeight: prediction === option.id ? 700 : 500,
              color: prediction === option.id ? '#0a0a0f' : colors.textPrimary,
              background: prediction === option.id
                ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`
                : colors.bgCard,
              border: `2px solid ${prediction === option.id ? colors.primary : colors.border}`,
              borderRadius: '12px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s ease',
              boxShadow: prediction === option.id ? '0 4px 12px rgba(236,72,153,0.3)' : 'none',
              zIndex: 10,
              position: 'relative' as const
            }}
          >
            <span style={{ fontSize: '28px' }}>{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: '24px', padding: '16px', background: colors.bgCard, borderRadius: '12px', border: `1px solid ${colors.border}`, maxWidth: '520px', width: '100%' }}>
        <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: colors.textPrimary }}>Consider:</strong> Where does the energy go? The spring stores potential energy, the mass has kinetic energy... can energy just disappear?
        </p>
      </div>
    </div>
  );

  // Play phase
  const renderPlay = () => (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '28px' }}>🔬</span>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary, margin: 0 }}>Experiment</h2>
          <p style={{ fontSize: '15px', color: colors.textSecondary, margin: 0 }}>Watch how oscillation amplitude changes over time</p>
        </div>
      </div>

      {/* Educational explanation (cause-effect and real-world relevance) */}
      <div style={{ padding: '16px', background: colors.bgCardLight, borderRadius: '12px', marginBottom: '16px', border: `1px solid ${colors.border}` }}>
        <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, lineHeight: 1.7 }}>
          <strong style={{ color: colors.textPrimary }}>Try it:</strong> When you increase the damping coefficient,
          oscillation amplitude decreases faster. This is important in real-world applications like car suspension
          and building design. Compare the reference curve to see how damping changes the response.
        </p>
        <p style={{ fontSize: '13px', color: colors.primary, margin: '8px 0 0', fontFamily: 'monospace', fontWeight: 600 }}>
          A(t) = A0 × e^(-zeta × omega0 × t)
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        {renderOscillator(true)}
      </div>
    </div>
  );

  // Review phase
  const renderReview = () => {
    const wasCorrect = prediction === 'decay_exp';

    return (
      <div style={{ padding: '24px' }}>
        {/* Result banner */}
        <div style={{
          padding: '32px',
          background: wasCorrect
            ? `linear-gradient(135deg, ${colors.success}15, ${colors.success}05)`
            : `linear-gradient(135deg, ${colors.accent}15, ${colors.accent}05)`,
          borderRadius: '16px',
          border: `1px solid ${wasCorrect ? colors.success : colors.accent}40`,
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '56px' }}>{wasCorrect ? '🎉' : '💡'}</span>
          <h3 style={{ fontSize: '22px', color: wasCorrect ? colors.success : colors.accent, marginTop: '12px', fontWeight: 700 }}>
            {wasCorrect ? 'Correct! Exponential decay it is!' : 'The amplitude decays exponentially!'}
          </h3>
          <p style={{ fontSize: '15px', color: colors.textSecondary, marginTop: '8px' }}>
            {wasCorrect
              ? 'Your prediction was correct! As you observed in the experiment, the amplitude decreases exponentially over time.'
              : 'As you observed in the experiment, the oscillation amplitude decreases exponentially - not linearly or suddenly.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '28px' }}>📚</span>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary, margin: 0 }}>The Physics of Damping</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div style={{ ...cardStyle, padding: '20px' }}>
            <h4 style={{ fontSize: '15px', color: colors.primary, marginBottom: '12px', fontWeight: 700 }}>
              🔋 Energy Loss
            </h4>
            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
              Damping forces (friction, air resistance) are proportional to velocity. The damping force equation is F_d = -bv, where b is the damping coefficient and v is velocity. These forces convert kinetic energy into thermal energy, gradually reducing the amplitude of oscillation. The rate of energy dissipation depends on both velocity and the damping coefficient, creating a characteristic exponential envelope over the oscillation pattern.
            </p>
          </div>

          <div style={{ ...cardStyle, padding: '20px' }}>
            <h4 style={{ fontSize: '15px', color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>
              📉 Exponential Decay
            </h4>
            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
              The amplitude follows the equation A(t) = A0 * e^(-gamma*t), where gamma is the decay constant. Each successive oscillation cycle loses the same fraction of its remaining energy, producing the characteristic exponential envelope. The time constant tau = 1/gamma determines how quickly the oscillation dies out. After 5 time constants, the amplitude has decreased to less than 1% of its initial value.
            </p>
          </div>
        </div>

        {/* Formula highlight */}
        <div style={{ padding: '24px', background: colors.bgCardLight, borderRadius: '16px', border: `1px solid ${colors.primary}30`, marginBottom: '24px' }}>
          <h4 style={{ fontSize: '16px', color: colors.textPrimary, marginBottom: '12px', textAlign: 'center', fontWeight: 700 }}>
            The Damped Oscillator Equation
          </h4>
          <div style={{ fontSize: '24px', color: colors.primary, fontWeight: 700, textAlign: 'center', padding: '16px', background: colors.bgDark, borderRadius: '8px', fontFamily: 'monospace' }}>
            x'' + 2*zeta*omega_0*x' + omega_0^2*x = 0
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', color: colors.textSecondary }}>
              <strong style={{ color: colors.primary }}>zeta</strong> = damping ratio
            </span>
            <span style={{ fontSize: '14px', color: colors.textSecondary }}>
              <strong style={{ color: colors.primary }}>omega_0</strong> = natural frequency
            </span>
          </div>
        </div>

        {/* Damping types */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { type: 'Underdamped', condition: 'zeta < 1', desc: 'Oscillates with decreasing amplitude. The system overshoots equilibrium multiple times.', icon: '〰️', color: colors.primary },
            { type: 'Critical', condition: 'zeta = 1', desc: 'Fastest return without oscillation. The optimal balance point.', icon: '⚡', color: colors.success },
            { type: 'Overdamped', condition: 'zeta > 1', desc: 'Slow return without oscillation. Excessive resistance to motion.', icon: '🐢', color: colors.accent }
          ].map((item, idx) => (
            <div key={idx} style={{ ...cardStyle, padding: '20px', textAlign: 'center', borderColor: `${item.color}40` }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{item.icon}</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: item.color }}>{item.type}</div>
              <div style={{ fontSize: '13px', color: colors.textSecondary, margin: '4px 0' }}>{item.condition}</div>
              <div style={{ fontSize: '12px', color: colors.textMuted }}>{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Key takeaway */}
        <div style={{ padding: '20px', background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}10)`, borderRadius: '16px', border: `1px solid ${colors.primary}40` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>💡</span>
            <p style={{ fontSize: '15px', color: colors.textPrimary, margin: 0, lineHeight: 1.7 }}>
              Damping is nature's way of dissipating energy. The damping ratio zeta determines whether the system oscillates (underdamped), returns fastest (critical), or creeps back slowly (overdamped). Most real systems are slightly underdamped for quick response with acceptable overshoot.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Twist Predict phase
  const renderTwistPredict = () => (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '32px 24px', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '28px' }}>🌀</span>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary, margin: 0 }}>The Twist</h2>
      </div>
      <p style={{ fontSize: '16px', color: colors.textSecondary, marginBottom: '24px', textAlign: 'center' }}>
        Which damping type is best for car suspension?
      </p>

      {/* SVG visualization for twist predict phase */}
      <div style={{ marginBottom: '24px' }}>
        <svg width="100%" height="180" viewBox="0 0 360 180" preserveAspectRatio="xMidYMid meet" style={{ maxWidth: '360px' }}>
          <defs>
            <linearGradient id="twistBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a1a24" />
              <stop offset="100%" stopColor="#0a0a0f" />
            </linearGradient>
            <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2a2a36" />
              <stop offset="50%" stopColor="#3a3a48" />
              <stop offset="100%" stopColor="#2a2a36" />
            </linearGradient>
            <linearGradient id="carBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.accent} />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
            <linearGradient id="suspGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.primary} />
              <stop offset="100%" stopColor={colors.primaryDark} />
            </linearGradient>
            <filter id="twistGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="360" height="180" fill="url(#twistBg)" rx="12" />

          {/* Road */}
          <rect x="0" y="140" width="360" height="40" fill="url(#roadGrad)" />
          <line x1="0" y1="160" x2="360" y2="160" stroke="#4a4a58" strokeWidth="2" strokeDasharray="20,15" />

          {/* Bump */}
          <ellipse cx="180" cy="140" rx="30" ry="10" fill="#4a4a58" />
          <text x="180" y="175" fill="#71717a" fontSize="11" textAnchor="middle">Pothole!</text>

          {/* Car body */}
          <rect x="130" y="90" width="100" height="40" rx="8" fill="url(#carBody)" filter="url(#twistGlow)" />
          <rect x="145" y="78" width="60" height="18" rx="4" fill={colors.accent} opacity="0.6" />

          {/* Wheels */}
          <circle cx="155" cy="135" r="12" fill="#333" />
          <circle cx="155" cy="135" r="6" fill="#555" />
          <circle cx="205" cy="135" r="12" fill="#333" />
          <circle cx="205" cy="135" r="6" fill="#555" />

          {/* Suspension springs */}
          <path d="M 155 130 L 148 110 L 162 100 L 148 90 L 162 80 L 155 65" fill="none" stroke="url(#suspGrad)" strokeWidth="2" />
          <path d="M 205 130 L 198 110 L 212 100 L 198 90 L 212 80 L 205 65" fill="none" stroke="url(#suspGrad)" strokeWidth="2" />

          {/* Question marks */}
          <g>
            <text x="60" y="70" fill={colors.primary} fontSize="22" fontWeight="700">?</text>
            <text x="290" y="65" fill={colors.warning} fontSize="20" fontWeight="700">?</text>
            <text x="315" y="100" fill={colors.accent} fontSize="16" fontWeight="700">?</text>
          </g>

          {/* Labels */}
          <text x="30" y="100" fill={colors.textSecondary} fontSize="11" fontWeight="600">Underdamped?</text>
          <text x="260" y="90" fill={colors.textSecondary} fontSize="11" fontWeight="600">Critical?</text>
          <text x="270" y="120" fill={colors.textSecondary} fontSize="11" fontWeight="600">Overdamped?</text>
        </svg>
      </div>

      <div style={{ padding: '16px', background: colors.bgCardLight, borderRadius: '12px', border: `1px solid ${colors.border}`, marginBottom: '24px', maxWidth: '520px', width: '100%' }}>
        <p style={{ fontSize: '15px', color: colors.textSecondary, margin: 0, lineHeight: 1.7 }}>
          A car hits a pothole. The suspension compresses and needs to return to normal. Engineers must choose: <strong style={{ color: colors.textPrimary }}>underdamped, critically damped, or overdamped?</strong>
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '520px', width: '100%' }}>
        {[
          { id: 'underdamped', label: 'Underdamped - allows oscillation for a softer ride', icon: '〰️' },
          { id: 'critical', label: 'Critically damped - fastest settling, no bounce', icon: '⚡' },
          { id: 'overdamped', label: 'Overdamped - very slow, maximum comfort', icon: '🐢' },
          { id: 'slightly_under', label: 'Slightly underdamped - fast settling with minimal bounce', icon: '🎯' }
        ].map(option => (
          <button
            key={option.id}
            onClick={() => setTwistPrediction(option.id)}
            style={{
              padding: '18px',
              fontSize: '15px',
              fontWeight: twistPrediction === option.id ? 700 : 500,
              color: twistPrediction === option.id ? '#0a0a0f' : colors.textPrimary,
              background: twistPrediction === option.id
                ? `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})`
                : colors.bgCard,
              border: `2px solid ${twistPrediction === option.id ? colors.accent : colors.border}`,
              borderRadius: '12px',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s ease',
              boxShadow: twistPrediction === option.id ? '0 4px 12px rgba(6,182,212,0.3)' : 'none',
              zIndex: 10,
              position: 'relative' as const
            }}
          >
            <span style={{ fontSize: '28px' }}>{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  // Twist Play phase
  const renderTwistPlay = () => (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '28px' }}>🔬</span>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary, margin: 0 }}>Compare Damping Regimes</h2>
          <p style={{ fontSize: '15px', color: colors.textSecondary, margin: 0 }}>See how different damping affects the suspension behavior</p>
        </div>
      </div>

      {/* Medium selector */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', justifyContent: 'center' }}>
        {[
          { id: 'air', label: 'Air', zeta: '0.1' },
          { id: 'water', label: 'Water', zeta: '0.5' },
          { id: 'honey', label: 'Honey', zeta: '2.0' }
        ].map(m => (
          <button
            key={m.id}
            onClick={() => {
              setMedium(m.id as 'air' | 'water' | 'honey');
              stopOscillation();
            }}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: medium === m.id ? 700 : 500,
              color: medium === m.id ? '#0a0a0f' : colors.textPrimary,
              background: medium === m.id
                ? `linear-gradient(135deg, ${colors.accent}, ${colors.accentLight})`
                : colors.bgCard,
              border: `2px solid ${medium === m.id ? colors.accent : colors.border}`,
              borderRadius: '12px',
              cursor: 'pointer',
              zIndex: 10,
              position: 'relative' as const
            }}
          >
            {m.label} (zeta = {m.zeta})
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        {renderOscillator(true)}
      </div>
    </div>
  );

  // Twist Review phase
  const renderTwistReview = () => {
    const wasCorrect = twistPrediction === 'slightly_under';

    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          padding: '32px',
          background: wasCorrect
            ? `linear-gradient(135deg, ${colors.success}15, ${colors.success}05)`
            : `linear-gradient(135deg, ${colors.accent}15, ${colors.accent}05)`,
          borderRadius: '16px',
          border: `1px solid ${wasCorrect ? colors.success : colors.accent}40`,
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '56px' }}>{wasCorrect ? '🎯' : '💡'}</span>
          <h3 style={{ fontSize: '22px', color: wasCorrect ? colors.success : colors.accent, marginTop: '12px', fontWeight: 700 }}>
            {wasCorrect ? 'Spot on! Slightly underdamped is optimal!' : 'Slightly underdamped is the sweet spot!'}
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '28px' }}>📊</span>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary, margin: 0 }}>Optimal Damping for Different Applications</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { app: 'Car Suspension', icon: '🚗', optimal: 'Slightly Underdamped', ratio: 'zeta approximately 0.3-0.4', reason: 'Fast settling with comfort', color: colors.primary },
            { app: 'Door Closer', icon: '🚪', optimal: 'Critical/Overdamped', ratio: 'zeta approximately 1.0-1.5', reason: 'No bounce back', color: '#8b5cf6' },
            { app: 'Seismometer', icon: '📊', optimal: 'Critical', ratio: 'zeta = 1.0', reason: 'Fastest response', color: colors.accent }
          ].map((item, idx) => (
            <div key={idx} style={{ ...cardStyle, padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>{item.icon}</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: item.color, marginBottom: '4px' }}>{item.app}</div>
              <div style={{ fontSize: '14px', color: colors.textPrimary, fontWeight: 600, marginBottom: '4px' }}>{item.optimal}</div>
              <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>{item.ratio}</div>
              <div style={{ fontSize: '13px', color: colors.textSecondary }}>{item.reason}</div>
            </div>
          ))}
        </div>

        <div style={{ ...cardStyle, marginBottom: '16px' }}>
          <h4 style={{ fontSize: '15px', color: colors.textPrimary, marginBottom: '12px', fontWeight: 700 }}>
            Why Slightly Underdamped for Cars?
          </h4>
          <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
            Pure critical damping (zeta = 1) gives the mathematically fastest return to equilibrium. But slightly underdamped (zeta approximately 0.3-0.4) allows one small overshoot which actually feels more comfortable to passengers and provides better road-following ability. Overdamped suspension would feel floaty and slow to respond. Engineers carefully balance these parameters to optimize ride quality, handling stability, and tire grip across different driving conditions, speeds, and road surfaces.
          </p>
        </div>

        <div style={{ padding: '20px', background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}10)`, borderRadius: '16px', border: `1px solid ${colors.primary}40` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>💡</span>
            <p style={{ fontSize: '15px', color: colors.textPrimary, margin: 0, lineHeight: 1.7 }}>
              The optimal damping ratio depends on the application. Car suspensions use zeta approximately 0.3-0.4 (slightly underdamped) for the best balance of comfort and control. Door closers use zeta approximately 1.0-1.5 to prevent bouncing. Seismometers use exactly zeta = 1.0 for fastest response without overshoot.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Transfer phase - Real-world applications
  const renderTransfer = () => {
    const app = realWorldApps[activeApp];

    return (
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '28px' }}>🌍</span>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary, margin: 0 }}>Real-World Applications</h2>
        </div>
        <p style={{ fontSize: '15px', color: colors.textSecondary, margin: '0 0 8px', lineHeight: 1.6 }}>
          Damping engineering in everyday life
        </p>
        {/* Progress indicator (P.6) */}
        <p style={{ fontSize: '14px', color: colors.accent, margin: '0 0 16px', fontWeight: 600 }}>
          Application {activeApp + 1} of {realWorldApps.length} ({completedApps.size} completed)
        </p>

        {/* Tab navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px' }}>
          {realWorldApps.map((a, idx) => {
            const isCompleted = completedApps.has(idx);
            const isCurrent = idx === activeApp;
            return (
              <button
                key={idx}
                onClick={() => setActiveApp(idx)}
                style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? '#0a0a0f' : isCompleted ? colors.success : colors.textSecondary,
                  background: isCurrent
                    ? `linear-gradient(135deg, ${a.color}, ${a.color}dd)`
                    : isCompleted ? `${colors.success}15` : colors.bgCard,
                  border: `1px solid ${isCurrent ? a.color : isCompleted ? colors.success : colors.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  zIndex: 10,
                  position: 'relative' as const
                }}
              >
                {isCompleted ? '✓ ' : ''}{a.icon} {a.title}
              </button>
            );
          })}
        </div>

        {/* Application content - always visible */}
        <div style={{ ...cardStyle, overflow: 'hidden', padding: 0 }}>
          {/* Header */}
          <div style={{ padding: '24px', background: `linear-gradient(135deg, ${app.color}20, transparent)`, borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
              <span style={{ fontSize: '48px' }}>{app.icon}</span>
              <div>
                <h3 style={{ fontSize: '22px', color: colors.textPrimary, margin: 0, fontWeight: 800 }}>{app.title}</h3>
                <p style={{ fontSize: '14px', color: app.color, margin: '4px 0 0', fontWeight: 600 }}>{app.tagline}</p>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>{app.description}</p>
          </div>

          {/* Connection */}
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}` }}>
            <h4 style={{ fontSize: '14px', color: app.color, marginBottom: '8px', fontWeight: 700 }}>Connection to Damping</h4>
            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>{app.connection}</p>
          </div>

          {/* How it works */}
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.border}` }}>
            <h4 style={{ fontSize: '14px', color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>How It Works</h4>
            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>{app.howItWorks}</p>
          </div>

          {/* Stats with numeric values */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: colors.border }}>
            {app.stats.map((stat, idx) => (
              <div key={idx} style={{ padding: '16px', background: colors.bgCardLight, textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>{stat.icon}</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: app.color }}>{stat.value}</div>
                <div style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Examples */}
          <div style={{ padding: '16px 24px', borderTop: `1px solid ${colors.border}` }}>
            <h4 style={{ fontSize: '14px', color: colors.textPrimary, marginBottom: '8px', fontWeight: 700 }}>Examples</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {app.examples.map((ex, idx) => (
                <span key={idx} style={{ padding: '6px 12px', fontSize: '13px', color: colors.textSecondary, background: colors.bgDark, borderRadius: '9999px', border: `1px solid ${colors.border}` }}>
                  {ex}
                </span>
              ))}
            </div>
          </div>

          {/* Companies */}
          <div style={{ padding: '12px 24px', background: colors.bgCardLight, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: colors.textMuted, fontWeight: 500 }}>Key players:</span>
            {app.companies.map((company, idx) => (
              <span key={idx} style={{ padding: '4px 12px', fontSize: '12px', color: colors.textSecondary, background: colors.bgCard, borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                {company}
              </span>
            ))}
          </div>

          {/* Got It Button (P.1) */}
          <div style={{ padding: '16px', borderTop: `1px solid ${colors.border}` }}>
            {!completedApps.has(activeApp) ? (
              <button
                onClick={() => {
                  const newCompleted = new Set(completedApps);
                  newCompleted.add(activeApp);
                  setCompletedApps(newCompleted);
                  if (activeApp < realWorldApps.length - 1) {
                    setTimeout(() => setActiveApp(activeApp + 1), 300);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#0a0a0f',
                  background: colors.success,
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  zIndex: 10,
                  position: 'relative' as const
                }}
              >
                Got It! Continue →
              </button>
            ) : (
              <div style={{ padding: '16px', background: `${colors.success}15`, borderRadius: '12px', border: `1px solid ${colors.success}40`, textAlign: 'center' }}>
                <span style={{ fontSize: '15px', color: colors.success, fontWeight: 600 }}>✓ Completed</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Test phase - Confirm flow
  const renderTest = () => {
    const question = testQuestions[currentQuestion];
    const currentAnswer = testAnswers[currentQuestion];
    const isConfirmed = confirmedQuestions.has(currentQuestion);

    if (testSubmitted) {
      const percentage = Math.round((testScore / testQuestions.length) * 100);
      return (
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.textPrimary, marginBottom: '24px' }}>Quiz Results</h2>

          <div style={{
            padding: '32px',
            background: percentage >= 70
              ? `linear-gradient(135deg, ${colors.success}15, ${colors.success}05)`
              : `linear-gradient(135deg, ${colors.warning}15, ${colors.warning}05)`,
            borderRadius: '16px',
            border: `1px solid ${percentage >= 70 ? colors.success : colors.warning}40`,
            marginBottom: '24px'
          }}>
            <div style={{ fontSize: '56px', fontWeight: 800, color: percentage >= 70 ? colors.success : colors.warning }}>
              {percentage}%
            </div>
            <p style={{ fontSize: '18px', color: colors.textPrimary, margin: '8px 0 0', fontWeight: 600 }}>
              {testScore} out of {testQuestions.length} correct
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => goToPhase('mastery')}
              style={{ ...primaryBtnStyle }}
            >
              Next: Complete Lesson
            </button>
            <button
              onClick={() => goToPhase('review')}
              style={{ ...primaryBtnStyle, background: colors.bgCardLight, color: colors.textPrimary }}
            >
              Back to Review
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: colors.textPrimary, marginBottom: '8px' }}>Knowledge Check - Damped Oscillations</h2>
        <p style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px' }}>
          Question {currentQuestion + 1} of {testQuestions.length}
        </p>
        <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '24px', maxWidth: '520px', textAlign: 'center', lineHeight: 1.6 }}>
          Apply your understanding of damping ratio, energy dissipation, exponential decay, and the three damping regimes to answer each scenario-based question below.
        </p>

        {/* Scenario */}
        <div style={{
          padding: '16px',
          background: colors.bgCardLight,
          borderRadius: '12px',
          marginBottom: '12px',
          borderLeft: `4px solid ${colors.accent}`,
          maxWidth: '520px',
          width: '100%'
        }}>
          <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, fontStyle: 'italic', lineHeight: 1.6 }}>
            {question.scenario}
          </p>
        </div>

        {/* Question */}
        <div style={{ ...cardStyle, maxWidth: '520px', width: '100%', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', color: '#ffffff', fontWeight: 600, marginBottom: '16px', lineHeight: 1.5 }}>{question.question}</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {question.options.map((option) => {
              const isSelected = currentAnswer === option.id;
              const isCorrectOpt = option.correct;

              let bg = `${colors.bgCardLight}80`;
              let borderColor = colors.borderLight;
              let textColor = '#ffffff';

              if (isConfirmed) {
                if (isCorrectOpt) {
                  bg = `${colors.success}20`;
                  borderColor = colors.success;
                  textColor = colors.success;
                } else if (isSelected) {
                  bg = `${colors.danger}20`;
                  borderColor = colors.danger;
                  textColor = colors.danger;
                }
              } else if (isSelected) {
                bg = `${colors.primary}20`;
                borderColor = colors.primary;
              }

              return (
                <button
                  key={option.id}
                  onClick={() => {
                    if (isConfirmed) return;
                    const newAnswers = [...testAnswers];
                    newAnswers[currentQuestion] = option.id;
                    setTestAnswers(newAnswers);
                  }}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: `2px solid ${borderColor}`,
                    background: bg,
                    textAlign: 'left',
                    cursor: isConfirmed ? 'default' : 'pointer',
                    transition: 'all 0.3s ease',
                    zIndex: 10,
                    position: 'relative' as const,
                  }}
                >
                  <span style={{ fontSize: '14px', color: textColor, lineHeight: 1.5 }}>{option.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Explanation after confirm */}
        {isConfirmed && (
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            maxWidth: '520px',
            width: '100%',
            marginBottom: '16px',
            background: currentAnswer === testQuestions[currentQuestion].options.find(o => o.correct)?.id ? `${colors.success}10` : `${colors.danger}10`,
            border: `1px solid ${currentAnswer === testQuestions[currentQuestion].options.find(o => o.correct)?.id ? `${colors.success}30` : `${colors.danger}30`}`,
          }}>
            <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: currentAnswer === testQuestions[currentQuestion].options.find(o => o.correct)?.id ? colors.success : colors.danger }}>
              {currentAnswer === testQuestions[currentQuestion].options.find(o => o.correct)?.id ? 'Correct!' : 'Not quite'}
            </p>
            <p style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: 1.6, margin: 0 }}>{question.explanation}</p>
          </div>
        )}

        {/* Quiz action buttons */}
        <div style={{ display: 'flex', gap: '12px', maxWidth: '520px', width: '100%' }}>
          {currentAnswer && !isConfirmed && (
            <button
              onClick={() => {
                setConfirmedQuestions(prev => new Set(prev).add(currentQuestion));
                const selectedOption = question.options.find(o => o.id === currentAnswer);
                if (selectedOption?.correct) {
                  setTestScore(s => s + 1);
                  playSound('success');
                } else {
                  playSound('failure');
                }
              }}
              style={{ ...primaryBtnStyle, flex: 1 }}
            >
              Check Answer
            </button>
          )}
          {isConfirmed && currentQuestion < 9 && (
            <button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              style={{ ...primaryBtnStyle, flex: 1 }}
            >
              Next Question
            </button>
          )}
          {isConfirmed && currentQuestion === 9 && (
            <button
              onClick={() => setTestSubmitted(true)}
              style={{ ...primaryBtnStyle, flex: 1, background: `linear-gradient(135deg, ${colors.success}, #059669)` }}
            >
              Submit Test
            </button>
          )}
        </div>
      </div>
    );
  };

  // Mastery phase
  const renderMastery = () => {
    const percentage = Math.round((testScore / testQuestions.length) * 100);

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '500px', padding: '48px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <style>{`@keyframes confetti { 0% { transform: translateY(0) rotate(0); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }`}</style>
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: '-20px',
              width: '10px',
              height: '10px',
              background: [colors.primary, colors.accent, colors.success, colors.warning][i % 4],
              borderRadius: '2px',
              animation: `confetti 3s ease-out ${Math.random() * 2}s infinite`,
            }}
          />
        ))}

        <div style={{
          width: '120px', height: '120px', borderRadius: '9999px',
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '32px', boxShadow: `0 8px 32px ${colors.primary}40`,
        }}>
          <span style={{ fontSize: '56px' }}>🏆</span>
        </div>

        <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>Congratulations!</h1>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: colors.primary, marginBottom: '16px' }}>Damping Master</h2>

        <p style={{ fontSize: '18px', color: colors.textSecondary, marginBottom: '32px', lineHeight: 1.6 }}>
          Final Score: <span style={{ color: colors.success, fontWeight: 700 }}>{testScore}/{testQuestions.length}</span> ({percentage}%)
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', maxWidth: '480px', width: '100%', marginBottom: '32px' }}>
          {[
            { icon: '📉', label: 'Exponential Decay', sub: 'A = A0*e^(-gamma*t)' },
            { icon: '⚡', label: 'Critical Damping', sub: 'zeta = 1 (fastest)' },
            { icon: '🎯', label: `${testScore}/10`, sub: 'Quiz score' },
          ].map((item, i) => (
            <div key={i} style={{ ...cardStyle, padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: colors.primary }}>{item.label}</div>
              <div style={{ fontSize: '12px', color: colors.textMuted }}>{item.sub}</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '14px', color: colors.textMuted, marginBottom: '24px', maxWidth: '420px', lineHeight: 1.6 }}>
          You now understand damped oscillations! You know how energy dissipation shapes oscillation behavior - from playground swings to earthquake-resistant skyscrapers.
        </p>

        <button
          onClick={() => {
            setPhase('hook');
            setPrediction(null);
            setTwistPrediction(null);
            setActiveApp(0);
            setCompletedApps(new Set());
            setCurrentQuestion(0);
            setTestAnswers(new Array(testQuestions.length).fill(null));
            setConfirmedQuestions(new Set());
            setTestScore(0);
            setTestSubmitted(false);
          }}
          style={primaryBtnStyle}
        >
          Complete Lesson
        </button>
      </div>
    );
  };

  // Main render switch
  const renderPhase = () => {
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
      default: return renderHook();
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bgDark, color: '#ffffff' }}>
      {renderProgressBar()}

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', background: `${colors.bgCard}cc`,
        borderBottom: `1px solid ${colors.border}50`,
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.025em' }}>Damped Oscillations</span>
        <span style={{ fontSize: '14px', fontWeight: 500, color: colors.primary }}>{phaseLabels[phase]}</span>
      </div>

      {/* Main content with overflow-y for scrolling (L.2) */}
      <div style={{ flex: 1, maxWidth: '800px', margin: '0 auto', width: '100%', overflowY: 'auto', paddingBottom: '100px', paddingTop: '48px' }}>
        {renderPhase()}
      </div>

      {/* Bottom nav bar */}
      {renderBottomBar()}
    </div>
  );
};

export default DampingRenderer;
