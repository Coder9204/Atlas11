'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

const realWorldApps = [
  {
    icon: '📸',
    title: 'Camera Flash Circuits',
    short: 'RC charging cycles power the capacitors that create bright camera flashes',
    tagline: 'Storing energy for that perfect shot',
    description: 'Camera flash units use large capacitors (100-1000μF) that charge through resistors from batteries. The RC time constant determines how long you wait between photos - typically 1-5 seconds for full charge. High-end cameras optimize this circuit for faster recycling times, letting photographers capture rapid sequences.',
    connection: 'This game teaches the exact exponential charging behavior that camera flash circuits follow - understanding tau = RC explains flash recycle times.',
    howItWorks: 'A battery charges a high-voltage capacitor through a resistor and boost converter. The voltage rises as 1-e^(-t/RC). When charged, triggering the flash dumps the stored energy through a xenon tube in milliseconds, creating the bright burst. Then the cycle repeats.',
    stats: [
      { value: '300V+', label: 'Flash capacitor voltage', icon: '⚡' },
      { value: '1-5s', label: 'Typical recycle time', icon: '⏱️' },
      { value: '100-1000μF', label: 'Flash capacitor size', icon: '🔋' }
    ],
    examples: ['DSLR built-in flash', 'Speedlight units', 'Studio strobes', 'Ring flashes'],
    companies: ['Canon', 'Nikon', 'Sony', 'Godox'],
    futureImpact: 'LED flashes with supercapacitors are replacing xenon tubes, offering faster recycling and more flexibility in flash duration and intensity.',
    color: '#F59E0B'
  },
  {
    icon: '🎹',
    title: 'Audio Equalizer Filters',
    short: 'RC time constants shape frequency response in mixing consoles and synthesizers',
    tagline: 'Sculpting sound with resistors and capacitors',
    description: 'Every audio equalizer, from guitar pedals to studio mixing consoles, uses RC circuits to filter frequencies. The time constant tau = RC determines the cutoff frequency: f = 1/(2*pi*RC). Bass, midrange, and treble controls each use different RC values to shape the sound spectrum.',
    connection: 'The RC time constant directly determines filter cutoff frequency - this game teaches the physics behind every tone control you have ever adjusted.',
    howItWorks: 'Low-pass filters pass frequencies below f = 1/(2*pi*RC) while attenuating higher frequencies. High-pass filters do the opposite. Combining multiple RC stages creates steeper filter slopes. Variable resistors (potentiometers) let users adjust the cutoff frequency in real time.',
    stats: [
      { value: '20-20kHz', label: 'Audio frequency range', icon: '🎵' },
      { value: '6 dB/oct', label: 'First-order filter slope', icon: '📉' },
      { value: '$11B', label: 'Pro audio market', icon: '💰' }
    ],
    examples: ['Mixing console EQ', 'Guitar tone controls', 'Synthesizer filters', 'DJ mixers'],
    companies: ['SSL', 'Neve', 'Moog', 'Pioneer DJ'],
    futureImpact: 'Digital signal processing is replacing analog RC filters in many applications, but analog warmth remains prized by audio enthusiasts.',
    color: '#8B5CF6'
  },
  {
    icon: '❤️',
    title: 'Cardiac Defibrillators',
    short: 'Life-saving RC circuits deliver precisely timed electrical shocks to restart hearts',
    tagline: 'When milliseconds save lives',
    description: 'Defibrillators store up to 360 joules of energy in capacitors that discharge through the patient in carefully controlled waveforms. The RC time constants of the circuit and patient determine the shock shape. Modern defibrillators use biphasic waveforms optimized through RC circuit engineering.',
    connection: 'The capacitor discharge curves explored in this game are exactly what biomedical engineers optimize when designing life-saving defibrillator waveforms.',
    howItWorks: 'A capacitor bank charges to 1500-3000V. When triggered, it discharges through electrodes placed on the patient. The patient body acts as a resistor (50-150 ohms), creating an RC circuit with the capacitor. The resulting exponential decay delivers the therapeutic shock.',
    stats: [
      { value: '360J', label: 'Maximum energy per shock', icon: '⚡' },
      { value: '3000V', label: 'Peak charging voltage', icon: '🔌' },
      { value: '10-20ms', label: 'Shock duration', icon: '⏱️' }
    ],
    examples: ['Hospital defibrillators', 'AEDs in public spaces', 'Implantable ICDs', 'Ambulance units'],
    companies: ['Philips', 'ZOLL', 'Medtronic', 'Abbott'],
    futureImpact: 'Wearable defibrillators and smaller implantable devices will save more lives through faster intervention and continuous monitoring.',
    color: '#EF4444'
  },
  {
    icon: '🔌',
    title: 'Power Supply Filtering',
    short: 'RC time constants smooth voltage ripples in electronics power supplies',
    tagline: 'The secret to clean DC power',
    description: 'Every electronic device needs smooth DC power, but rectified AC contains significant ripple. RC filters smooth these voltage variations using the time constant principle - capacitors charge during peaks and discharge during valleys, with the RC time constant determining how much smoothing occurs.',
    connection: 'The capacitor charging/discharging behavior in this game explains exactly how power supply filtering works to create stable voltages for electronics.',
    howItWorks: 'After rectification, a capacitor charges quickly during voltage peaks. Between peaks, it discharges through the load resistance. If RC >> ripple period, the voltage stays nearly constant. Larger capacitors and lower load resistance give better smoothing.',
    stats: [
      { value: '<50mV', label: 'Typical ripple spec', icon: '📊' },
      { value: '1000-10000μF', label: 'Filter capacitor size', icon: '🔋' },
      { value: '$40B', label: 'Power supply market', icon: '💵' }
    ],
    examples: ['Phone chargers', 'Computer power supplies', 'Audio amplifiers', 'Industrial equipment'],
    companies: ['Mean Well', 'Delta Electronics', 'TDK-Lambda', 'Corsair'],
    futureImpact: 'GaN and SiC semiconductors enable higher switching frequencies, allowing smaller capacitors to achieve the same RC filtering effect.',
    color: '#10B981'
  }
];

type GameEventType =
  | 'phase_change'
  | 'prediction_made'
  | 'simulation_started'
  | 'parameter_changed'
  | 'twist_prediction_made'
  | 'app_explored'
  | 'test_answered'
  | 'test_completed'
  | 'mastery_achieved';

interface GameEvent {
  type: GameEventType;
  data?: Record<string, unknown>;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const phaseLabels: Record<Phase, string> = {
  'hook': 'Hook',
  'predict': 'Predict',
  'play': 'Lab',
  'review': 'Review',
  'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Lab',
  'twist_review': 'Twist Review',
  'transfer': 'Transfer',
  'test': 'Test',
  'mastery': 'Mastery'
};

// Premium Design System
const premiumDesign = {
  colors: {
    primary: '#6366F1',
    primaryDark: '#4F46E5',
    secondary: '#8B5CF6',
    accent: '#F59E0B',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    capacitor: '#06B6D4',
    resistor: '#EF4444',
    voltage: '#FBBF24',
    background: {
      primary: '#0F0F1A',
      secondary: '#1A1A2E',
      tertiary: '#252542',
      card: 'rgba(255, 255, 255, 0.03)',
    },
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.7)',
      muted: 'rgba(255, 255, 255, 0.4)',
    },
    gradient: {
      primary: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
      secondary: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
      warm: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
      cool: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
      rc: 'linear-gradient(135deg, #06B6D4 0%, #8B5CF6 100%)',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 },
  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.2)',
    md: '0 4px 16px rgba(0, 0, 0, 0.3)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.4)',
    glow: (color: string) => `0 0 20px ${color}40`,
  },
};

interface RCTimeConstantRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

export default function RCTimeConstantRenderer({ onGameEvent, gamePhase, onPhaseComplete }: RCTimeConstantRendererProps) {
  // Core State
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  });
  const [isMobile, setIsMobile] = useState(false);

  // Hook phase
  const [hookStep, setHookStep] = useState(0);

  // Predict phase
  const [prediction, setPrediction] = useState<string | null>(null);

  // Play phase - RC charging simulation
  const [resistance, setResistance] = useState(10); // kΩ
  const [capacitance, setCapacitance] = useState(100); // μF
  const [supplyVoltage, setSupplyVoltage] = useState(12);
  const [capacitorVoltage, setCapacitorVoltage] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [chargeHistory, setChargeHistory] = useState<{ time: number; voltage: number }[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Review phase
  const [reviewStep, setReviewStep] = useState(0);

  // Twist predict
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Twist play - Discharging
  const [isDischarging, setIsDischarging] = useState(false);
  const [dischargeVoltage, setDischargeVoltage] = useState(12);
  const [dischargeHistory, setDischargeHistory] = useState<{ time: number; voltage: number }[]>([]);
  const [dischargeTime, setDischargeTime] = useState(0);

  // Twist review
  const [twistReviewStep, setTwistReviewStep] = useState(0);

  // Transfer phase
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test phase
  const [testQuestions] = useState([
    {
      question: "The time constant τ (tau) of an RC circuit equals:",
      options: [
        { text: "R + C", correct: false },
        { text: "R - C", correct: false },
        { text: "R × C", correct: true },
        { text: "R / C", correct: false }
      ],
      explanation: "The time constant τ = R × C (resistance times capacitance). It has units of time (seconds when R is in ohms and C is in farads)."
    },
    {
      question: "After one time constant (1τ), a charging capacitor reaches approximately:",
      options: [
        { text: "50% of final voltage", correct: false },
        { text: "63% of final voltage", correct: true },
        { text: "86% of final voltage", correct: false },
        { text: "100% of final voltage", correct: false }
      ],
      explanation: "After 1τ, the capacitor charges to (1 - e⁻¹) ≈ 63.2% of the supply voltage. This is a fundamental property of exponential charging."
    },
    {
      question: "A capacitor is considered 'fully charged' after approximately:",
      options: [
        { text: "1 time constant", correct: false },
        { text: "2 time constants", correct: false },
        { text: "5 time constants", correct: true },
        { text: "10 time constants", correct: false }
      ],
      explanation: "After 5τ, the capacitor reaches about 99.3% of its final value. For practical purposes, this is considered fully charged."
    },
    {
      question: "What happens if you increase the resistance in an RC circuit?",
      options: [
        { text: "Charging gets faster", correct: false },
        { text: "Charging gets slower", correct: true },
        { text: "Maximum voltage increases", correct: false },
        { text: "Nothing changes", correct: false }
      ],
      explanation: "Higher resistance means less current can flow, so it takes longer to charge the capacitor. τ = RC, so larger R means larger τ."
    },
    {
      question: "The charging curve of a capacitor is:",
      options: [
        { text: "Linear", correct: false },
        { text: "Exponential", correct: true },
        { text: "Parabolic", correct: false },
        { text: "Sinusoidal", correct: false }
      ],
      explanation: "Capacitor charging follows an exponential curve: V(t) = V₀(1 - e^(-t/τ)). It rises quickly at first, then slows as it approaches the supply voltage."
    },
    {
      question: "During discharge, capacitor voltage:",
      options: [
        { text: "Decreases linearly", correct: false },
        { text: "Decreases exponentially", correct: true },
        { text: "Increases exponentially", correct: false },
        { text: "Stays constant", correct: false }
      ],
      explanation: "Discharging follows an exponential decay: V(t) = V₀e^(-t/τ). The voltage drops quickly at first, then more slowly."
    },
    {
      question: "If R = 10kΩ and C = 100μF, what is the time constant?",
      options: [
        { text: "1 millisecond", correct: false },
        { text: "10 milliseconds", correct: false },
        { text: "100 milliseconds", correct: false },
        { text: "1 second", correct: true }
      ],
      explanation: "τ = RC = 10,000Ω × 0.0001F = 1 second. Remember to convert units: 100μF = 100 × 10⁻⁶F = 0.0001F."
    },
    {
      question: "Why can't a capacitor charge instantly to the supply voltage?",
      options: [
        { text: "The battery is too weak", correct: false },
        { text: "Resistance limits current flow", correct: true },
        { text: "Capacitors are defective", correct: false },
        { text: "It's a software limitation", correct: false }
      ],
      explanation: "The resistor limits current flow. Initially, current is high but decreases as the capacitor charges. The gradual current flow causes gradual charging."
    },
    {
      question: "In a camera flash, a large capacitor is used to:",
      options: [
        { text: "Store and quickly release energy", correct: true },
        { text: "Filter noise", correct: false },
        { text: "Regulate voltage", correct: false },
        { text: "Convert AC to DC", correct: false }
      ],
      explanation: "Camera flash capacitors slowly charge from the battery, then rapidly discharge to produce an intense flash of light in milliseconds."
    },
    {
      question: "After 2 time constants, a charging capacitor reaches approximately:",
      options: [
        { text: "63%", correct: false },
        { text: "75%", correct: false },
        { text: "86%", correct: true },
        { text: "95%", correct: false }
      ],
      explanation: "After 2τ: V = V₀(1 - e⁻²) ≈ 86.5%. The percentages at each τ: 63% (1τ), 86% (2τ), 95% (3τ), 98% (4τ), 99% (5τ)."
    }
  ]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [testComplete, setTestComplete] = useState(false);

  // Mobile detection
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

  // Phase sync
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Type-based sound feedback
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const soundConfig = {
        click: { frequency: 440, duration: 0.1, oscType: 'sine' as OscillatorType },
        success: { frequency: 600, duration: 0.15, oscType: 'sine' as OscillatorType },
        failure: { frequency: 200, duration: 0.2, oscType: 'sawtooth' as OscillatorType },
        transition: { frequency: 520, duration: 0.15, oscType: 'sine' as OscillatorType },
        complete: { frequency: 800, duration: 0.3, oscType: 'sine' as OscillatorType },
      };

      const config = soundConfig[type];
      oscillator.frequency.value = config.frequency;
      oscillator.type = config.oscType;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + config.duration);
    } catch (e) { /* Audio not supported */ }
  }, []);

  // Event emission
  const emitEvent = useCallback((type: GameEventType, data?: Record<string, unknown>) => {
    onGameEvent?.({ type, data });
  }, [onGameEvent]);

  // Navigation
  const goToPhase = useCallback((newPhase: Phase) => {
    if (!phaseOrder.includes(newPhase)) return;
    setPhase(newPhase);
    playSound('transition');
    emitEvent('phase_change', { from: phase, to: newPhase, phaseLabel: phaseLabels[newPhase] });
    onPhaseComplete?.(newPhase);
  }, [phase, playSound, emitEvent, onPhaseComplete]);

  const goNext = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) goToPhase(phaseOrder[currentIndex + 1]);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) goToPhase(phaseOrder[currentIndex - 1]);
  }, [phase, goToPhase]);

  // Calculate time constant (in seconds)
  const timeConstant = (resistance * 1000) * (capacitance / 1000000); // R in Ω, C in F

  // Charging animation
  useEffect(() => {
    if (phase === 'play' && isCharging) {
      startTimeRef.current = Date.now() - elapsedTime * 1000;

      const animate = () => {
        const now = Date.now();
        const t = (now - startTimeRef.current) / 1000; // Time in seconds
        setElapsedTime(t);

        // V(t) = V₀(1 - e^(-t/τ))
        const v = supplyVoltage * (1 - Math.exp(-t / timeConstant));
        setCapacitorVoltage(v);

        // Record history for graph
        setChargeHistory(prev => {
          const newHistory = [...prev, { time: t, voltage: v }];
          // Keep last 100 points
          return newHistory.slice(-100);
        });

        // Stop when effectively fully charged (99.5%)
        if (v < supplyVoltage * 0.995) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setCapacitorVoltage(supplyVoltage);
          setIsCharging(false);
        }
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [phase, isCharging, supplyVoltage, timeConstant, elapsedTime]);

  // Discharging animation
  useEffect(() => {
    if (phase === 'twist_play' && isDischarging) {
      const startTime = Date.now() - dischargeTime * 1000;
      const initialVoltage = dischargeVoltage;

      const animate = () => {
        const now = Date.now();
        const t = (now - startTime) / 1000;
        setDischargeTime(t);

        // V(t) = V₀ × e^(-t/τ)
        const v = initialVoltage * Math.exp(-t / timeConstant);
        setDischargeVoltage(v);

        setDischargeHistory(prev => {
          const newHistory = [...prev, { time: t, voltage: v }];
          return newHistory.slice(-100);
        });

        if (v > 0.01) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setDischargeVoltage(0);
          setIsDischarging(false);
        }
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [phase, isDischarging, dischargeVoltage, timeConstant, dischargeTime]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [phase]);

  // Reset charging simulation
  const resetCharging = () => {
    setIsCharging(false);
    setCapacitorVoltage(0);
    setChargeHistory([]);
    setElapsedTime(0);
  };

  // Reset discharging simulation
  const resetDischarging = () => {
    setIsDischarging(false);
    setDischargeVoltage(supplyVoltage);
    setDischargeHistory([]);
    setDischargeTime(0);
  };

  // Helper functions for UI elements
  function renderButton(
    text: string,
    onClick: () => void,
    variant: 'primary' | 'secondary' | 'success' = 'primary',
    disabled = false
  ) {
    const baseStyle: React.CSSProperties = {
      padding: isMobile ? '14px 24px' : '16px 32px',
      borderRadius: premiumDesign.radius.lg,
      border: 'none',
      fontSize: isMobile ? '15px' : '16px',
      fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.3s ease',
      fontFamily: premiumDesign.typography.fontFamily,
      opacity: disabled ? 0.5 : 1,
      zIndex: 10,
    };

    const variants = {
      primary: {
        background: premiumDesign.colors.gradient.primary,
        color: 'white',
        boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.primary),
      },
      secondary: {
        background: premiumDesign.colors.background.tertiary,
        color: premiumDesign.colors.text.primary,
        border: `1px solid rgba(255,255,255,0.1)`,
      },
      success: {
        background: premiumDesign.colors.gradient.rc,
        color: 'white',
        boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.capacitor),
      },
    };

    return (
      <button
        style={{ ...baseStyle, ...variants[variant] }}
        onClick={(e) => {
          e.preventDefault();
          if (!disabled) onClick();
        }}
        disabled={disabled}
      >
        {text}
      </button>
    );
  }

  function renderProgressBar() {
    const currentIndex = phaseOrder.indexOf(phase);
    const progress = ((currentIndex + 1) / phaseOrder.length) * 100;

    return (
      <div style={{ marginBottom: premiumDesign.spacing.lg }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: premiumDesign.spacing.xs,
          fontSize: '12px',
          color: premiumDesign.colors.text.muted,
        }}>
          <span>Phase {currentIndex + 1} of {phaseOrder.length}</span>
          <span>{phaseLabels[phase]}</span>
        </div>
        <div style={{
          height: 6,
          background: premiumDesign.colors.background.tertiary,
          borderRadius: premiumDesign.radius.full,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: premiumDesign.colors.gradient.rc,
            borderRadius: premiumDesign.radius.full,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>
    );
  }

  function renderBottomBar(
    leftButton?: { text: string; onClick: () => void },
    rightButton?: { text: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'success'; disabled?: boolean }
  ) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: premiumDesign.spacing.xl,
        paddingTop: premiumDesign.spacing.lg,
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>
        {leftButton ? renderButton(leftButton.text, leftButton.onClick, 'secondary') : <div />}
        {rightButton && renderButton(rightButton.text, rightButton.onClick, rightButton.variant || 'primary', rightButton.disabled)}
      </div>
    );
  }

  // Premium SVG definitions for circuit visualization
  const renderSVGDefs = () => (
    <defs>
      {/* Capacitor plate gradient - metallic blue */}
      <linearGradient id="rctcCapacitorPlate" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#67e8f9" />
        <stop offset="25%" stopColor="#22d3ee" />
        <stop offset="50%" stopColor="#06b6d4" />
        <stop offset="75%" stopColor="#0891b2" />
        <stop offset="100%" stopColor="#0e7490" />
      </linearGradient>

      {/* Capacitor charge glow */}
      <radialGradient id="rctcCapacitorGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.8" />
        <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.5" />
        <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
      </radialGradient>

      {/* Resistor body gradient - warm red/orange */}
      <linearGradient id="rctcResistorBody" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fca5a5" />
        <stop offset="20%" stopColor="#f87171" />
        <stop offset="50%" stopColor="#ef4444" />
        <stop offset="80%" stopColor="#dc2626" />
        <stop offset="100%" stopColor="#b91c1c" />
      </linearGradient>

      {/* Resistor bands pattern */}
      <linearGradient id="rctcResistorBands" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="15%" stopColor="#ef4444" />
        <stop offset="15%" stopColor="#fbbf24" />
        <stop offset="25%" stopColor="#fbbf24" />
        <stop offset="25%" stopColor="#ef4444" />
        <stop offset="45%" stopColor="#ef4444" />
        <stop offset="45%" stopColor="#a855f7" />
        <stop offset="55%" stopColor="#a855f7" />
        <stop offset="55%" stopColor="#ef4444" />
        <stop offset="75%" stopColor="#ef4444" />
        <stop offset="75%" stopColor="#fbbf24" />
        <stop offset="85%" stopColor="#fbbf24" />
        <stop offset="85%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#ef4444" />
      </linearGradient>

      {/* Battery/power supply gradient */}
      <linearGradient id="rctcBatteryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="25%" stopColor="#facc15" />
        <stop offset="50%" stopColor="#eab308" />
        <stop offset="75%" stopColor="#ca8a04" />
        <stop offset="100%" stopColor="#a16207" />
      </linearGradient>

      {/* Circuit wire gradient - copper */}
      <linearGradient id="rctcWireCopper" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="30%" stopColor="#fbbf24" />
        <stop offset="50%" stopColor="#fcd34d" />
        <stop offset="70%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>

      {/* Voltage curve gradient - cyan to purple */}
      <linearGradient id="rctcVoltageGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="50%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>

      {/* Graph background gradient */}
      <linearGradient id="rctcGraphBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0c4a6e" stopOpacity="0.2" />
        <stop offset="50%" stopColor="#1e3a5f" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#0f172a" stopOpacity="0.1" />
      </linearGradient>

      {/* Current flow particle gradient */}
      <radialGradient id="rctcCurrentParticle" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
        <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
      </radialGradient>

      {/* Switch contact gradient */}
      <linearGradient id="rctcSwitchContact" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="50%" stopColor="#059669" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>

      {/* Glow filters */}
      <filter id="rctcCapacitorGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="rctcCurrentGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="rctcVoltageGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="rctcSoftGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" />
      </filter>

      {/* Lab background gradient */}
      <linearGradient id="rctcLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#030712" />
        <stop offset="50%" stopColor="#0a0f1a" />
        <stop offset="100%" stopColor="#030712" />
      </linearGradient>

      {/* Grid pattern */}
      <pattern id="rctcLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeOpacity="0.4" />
      </pattern>
    </defs>
  );

  // Render voltage graph
  function renderVoltageGraph(history: { time: number; voltage: number }[], maxVoltage: number, isCharge: boolean) {
    const width = 240;
    const height = 120;
    const padding = 25;

    // Calculate max time for x-axis (5 time constants)
    const maxTime = timeConstant * 5;

    // Generate path from history
    const pathPoints = history.map(point => {
      const x = padding + (point.time / maxTime) * (width - 2 * padding);
      const y = height - padding - (point.voltage / maxVoltage) * (height - 2 * padding);
      return `${x},${y}`;
    }).join(' ');

    // Generate time constant markers
    const tauMarkers = [1, 2, 3, 4, 5].map(n => {
      const x = padding + (n * timeConstant / maxTime) * (width - 2 * padding);
      const percent = isCharge
        ? Math.round((1 - Math.exp(-n)) * 100)
        : Math.round(Math.exp(-n) * 100);
      return { x, n, percent };
    });

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxHeight: 150 }}>
        {renderSVGDefs()}

        {/* Premium background */}
        <rect x={padding} y={padding} width={width - 2 * padding} height={height - 2 * padding}
          fill="url(#rctcGraphBg)" stroke="url(#rctcVoltageGradient)" strokeWidth="1" rx="3" />

        {/* Time constant vertical lines */}
        {tauMarkers.map(marker => (
          <g key={marker.n}>
            <line x1={marker.x} y1={padding} x2={marker.x} y2={height - padding}
              stroke="rgba(139, 92, 246, 0.3)" strokeWidth="1" strokeDasharray="3,3" />
          </g>
        ))}

        {/* 63% line for charging */}
        {isCharge && (
          <g>
            <line x1={padding} y1={height - padding - 0.632 * (height - 2 * padding)}
              x2={width - padding} y2={height - padding - 0.632 * (height - 2 * padding)}
              stroke={premiumDesign.colors.success} strokeWidth="1.5" strokeDasharray="4,4" opacity="0.7"
              filter="url(#rctcSoftGlow)" />
          </g>
        )}

        {/* Voltage curve with glow */}
        {history.length > 1 && (
          <g filter="url(#rctcVoltageGlowFilter)">
            <polyline points={pathPoints} fill="none" stroke="url(#rctcVoltageGradient)"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
      </svg>
    );
  }

  // Phase Renderers
  function renderHookPhase() {
    const hookContent = [
      {
        title: "The Camera Flash Mystery",
        emoji: "📸",
        text: "Have you ever noticed how a camera flash takes a few seconds to 'charge up' before it's ready? And then releases all that energy in a blinding instant? Something is storing that energy - but what, and how?",
      },
      {
        title: "Energy Reservoirs",
        emoji: "🔋",
        text: "Capacitors are like tiny rechargeable energy tanks. They can slowly fill up with charge, then release it all at once - or slowly. The speed depends on a magical number called the 'time constant'!",
      },
      {
        title: "Discover RC Circuits",
        emoji: "⏱️",
        text: "Today we'll explore how capacitors charge and discharge through resistors, and discover the exponential curves that govern timing circuits everywhere!",
      },
    ];

    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
        {/* Premium badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-8">
          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-cyan-400 tracking-wide">PHYSICS EXPLORATION</span>
        </div>

        {/* Main title with gradient */}
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-purple-200 bg-clip-text text-transparent">
          RC Time Constant
        </h1>

        <p className="text-lg text-slate-400 max-w-md mb-10">
          Master the exponential curves of charging and discharging
        </p>

        {/* Premium card with content */}
        <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 rounded-3xl" />

          <div className="relative">
            <div className="text-6xl mb-6">{hookContent[hookStep].emoji}</div>

            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              {hookContent[hookStep].title}
            </h2>

            <p className="text-lg text-slate-300 leading-relaxed">
              {hookContent[hookStep].text}
            </p>

            <div className="flex justify-center gap-2 mt-8">
              {hookContent.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === hookStep
                      ? 'w-6 bg-cyan-400'
                      : 'w-2 bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-4 mt-10">
          {hookStep > 0 && (
            <button
              onClick={() => setHookStep(h => h - 1)}
              style={{ zIndex: 10 }}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all"
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (hookStep < hookContent.length - 1) {
                setHookStep(h => h + 1);
              } else {
                goNext();
              }
            }}
            style={{ zIndex: 10 }}
            className="group px-10 py-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="flex items-center gap-3">
              {hookStep < hookContent.length - 1 ? 'Continue' : 'Make a Prediction'}
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </div>

        {/* Feature hints */}
        <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">✦</span>
            Interactive Lab
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-400">✦</span>
            10 Phases
          </div>
        </div>
      </div>
    );
  }

  function renderPredictPhase() {
    const predictions = [
      { id: 'instant', text: "Capacitor charges instantly to the supply voltage" },
      { id: 'linear', text: "Capacitor voltage increases linearly (constant rate)" },
      { id: 'exponential', text: "Capacitor charges quickly at first, then slows down (exponential)" },
      { id: 'steps', text: "Capacitor charges in discrete steps" },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.md,
          }}>
            🤔 Make Your Prediction
          </h2>
          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
          }}>
            How does a capacitor charge when connected through a resistor?
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: premiumDesign.spacing.md,
          maxWidth: 600,
          margin: '0 auto',
          flex: 1,
        }}>
          {predictions.map((p) => (
            <button
              key={p.id}
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: prediction === p.id
                  ? `2px solid ${premiumDesign.colors.capacitor}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: prediction === p.id
                  ? 'rgba(6, 182, 212, 0.2)'
                  : premiumDesign.colors.background.tertiary,
                color: premiumDesign.colors.text.primary,
                fontSize: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
                zIndex: 10,
              }}
              onClick={() => setPrediction(p.id)}
            >
              {p.text}
            </button>
          ))}
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('hook') },
          {
            text: 'Test My Prediction →',
            onClick: goNext,
            disabled: !prediction,
          }
        )}
      </div>
    );
  }

  function renderPlayPhase() {
    const chargePercent = (capacitorVoltage / supplyVoltage) * 100;

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.lg }}>
          <h2 style={{
            fontSize: isMobile ? '20px' : '26px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.sm,
          }}>
            🔋 Capacitor Charging Simulator
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Watch the exponential charging curve in real-time
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: premiumDesign.spacing.lg,
          flex: 1,
        }}>
          {/* Circuit and Graph */}
          <div style={{
            flex: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: premiumDesign.spacing.md,
          }}>
            {/* Circuit Diagram - Premium SVG */}
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.xl,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <svg viewBox="0 0 300 120" style={{ width: '100%', maxHeight: 140 }}>
                {renderSVGDefs()}

                {/* Lab background */}
                <rect width="300" height="120" fill="url(#rctcLabBg)" rx="4" />
                <rect width="300" height="120" fill="url(#rctcLabGrid)" rx="4" />

                {/* Circuit wire path with copper gradient */}
                <path d="M 25,35 L 25,20 L 275,20 L 275,100 L 25,100 L 25,65"
                  fill="none" stroke="url(#rctcWireCopper)" strokeWidth="2.5" strokeLinecap="round" />

                {/* Current flow particles (animated when charging) */}
                {isCharging && [0, 1, 2, 3].map(i => {
                  const offset = (Date.now() / 50 + i * 25) % 100;
                  const pos = offset / 100;
                  // Calculate position along circuit path
                  let x, y;
                  if (pos < 0.25) {
                    x = 25 + (pos / 0.25) * 250;
                    y = 20;
                  } else if (pos < 0.5) {
                    x = 275;
                    y = 20 + ((pos - 0.25) / 0.25) * 80;
                  } else if (pos < 0.75) {
                    x = 275 - ((pos - 0.5) / 0.25) * 250;
                    y = 100;
                  } else {
                    x = 25;
                    y = 100 - ((pos - 0.75) / 0.25) * 80;
                  }
                  return (
                    <circle key={i} cx={x} cy={y} r="3"
                      fill="url(#rctcCurrentParticle)" filter="url(#rctcCurrentGlowFilter)" />
                  );
                })}

                {/* Battery with gradient */}
                <g transform="translate(10, 35)">
                  <rect x="0" y="0" width="18" height="30" fill="url(#rctcBatteryGradient)" rx="2"
                    stroke="#a16207" strokeWidth="1" />
                  <rect x="5" y="-3" width="8" height="4" fill="#fbbf24" rx="1" />
                  <text x="9" y="18" textAnchor="middle" fill="#78350f" fontSize="8" fontWeight="bold">+</text>
                  <text x="9" y="28" textAnchor="middle" fill="#78350f" fontSize="8" fontWeight="bold">-</text>
                </g>

                {/* Resistor with colored bands */}
                <g transform="translate(90, 10)">
                  {/* Lead wires */}
                  <line x1="-10" y1="10" x2="0" y2="10" stroke="url(#rctcWireCopper)" strokeWidth="2" />
                  <line x1="60" y1="10" x2="70" y2="10" stroke="url(#rctcWireCopper)" strokeWidth="2" />
                  {/* Resistor body */}
                  <rect x="0" y="2" width="60" height="16" fill="url(#rctcResistorBands)" rx="3"
                    stroke="#991b1b" strokeWidth="1" />
                  {/* 3D effect */}
                  <rect x="0" y="2" width="60" height="3" fill="rgba(255,255,255,0.2)" rx="3" />
                </g>

                {/* Capacitor with charge visualization */}
                <g transform="translate(235, 10)">
                  {/* Capacitor plates */}
                  <rect x="0" y="0" width="4" height="20" fill="url(#rctcCapacitorPlate)" rx="1"
                    filter={chargePercent > 20 ? "url(#rctcCapacitorGlowFilter)" : undefined} />
                  <rect x="12" y="0" width="4" height="20" fill="url(#rctcCapacitorPlate)" rx="1"
                    filter={chargePercent > 20 ? "url(#rctcCapacitorGlowFilter)" : undefined} />
                  {/* Charge glow between plates */}
                  {chargePercent > 5 && (
                    <ellipse cx="8" cy="10" rx={3 + chargePercent / 30} ry={8}
                      fill="url(#rctcCapacitorGlow)" opacity={Math.min(0.8, chargePercent / 100)} />
                  )}
                  {/* Electric field lines when charging */}
                  {chargePercent > 10 && isCharging && (
                    <g opacity={chargePercent / 150}>
                      <line x1="5" y1="5" x2="11" y2="5" stroke="#67e8f9" strokeWidth="0.5" strokeDasharray="2,2" />
                      <line x1="5" y1="10" x2="11" y2="10" stroke="#67e8f9" strokeWidth="0.5" strokeDasharray="2,2" />
                      <line x1="5" y1="15" x2="11" y2="15" stroke="#67e8f9" strokeWidth="0.5" strokeDasharray="2,2" />
                    </g>
                  )}
                  {/* Lead wires */}
                  <line x1="2" y1="-10" x2="2" y2="0" stroke="url(#rctcWireCopper)" strokeWidth="2" />
                  <line x1="14" y1="20" x2="14" y2="30" stroke="url(#rctcWireCopper)" strokeWidth="2" />
                </g>

                {/* Switch with premium styling */}
                <g transform="translate(260, 55)">
                  <circle cx="0" cy="0" r="5" fill={isCharging ? "url(#rctcSwitchContact)" : '#4b5563'}
                    stroke={isCharging ? '#059669' : '#374151'} strokeWidth="1.5" />
                  <line x1="0" y1="0" x2={isCharging ? "18" : "12"} y2={isCharging ? "0" : "-12"}
                    stroke={isCharging ? "url(#rctcSwitchContact)" : '#6b7280'} strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="18" cy="0" r="5" fill={isCharging ? "url(#rctcSwitchContact)" : '#4b5563'}
                    stroke={isCharging ? '#059669' : '#374151'} strokeWidth="1.5" />
                  {/* Spark effect when just closed */}
                  {isCharging && (
                    <circle cx="9" cy="0" r="2" fill="#fef08a" filter="url(#rctcCurrentGlowFilter)" opacity="0.8" />
                  )}
                </g>
              </svg>

              {/* Labels outside SVG using typo system */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '8px',
                fontSize: typo.small,
              }}>
                <span style={{ color: premiumDesign.colors.voltage }}>{supplyVoltage}V</span>
                <span style={{ color: premiumDesign.colors.resistor }}>R = {resistance}kOhm</span>
                <span style={{ color: premiumDesign.colors.capacitor }}>C = {capacitance}uF</span>
              </div>

              {/* Voltage and Time Status Display */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: typo.elementGap,
                padding: '10px 14px',
                background: 'rgba(6, 182, 212, 0.1)',
                borderRadius: premiumDesign.radius.md,
                border: '1px solid rgba(6, 182, 212, 0.2)',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: typo.label, color: premiumDesign.colors.text.muted }}>Capacitor Voltage</div>
                  <div style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: premiumDesign.colors.capacitor }}>
                    {capacitorVoltage.toFixed(2)}V ({chargePercent.toFixed(1)}%)
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: typo.label, color: premiumDesign.colors.text.muted }}>Time Elapsed</div>
                  <div style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: premiumDesign.colors.secondary }}>
                    {elapsedTime.toFixed(2)}s ({(elapsedTime / timeConstant).toFixed(2)}tau)
                  </div>
                </div>
              </div>
            </div>

            {/* Voltage Graph */}
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.xl,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.text.primary, marginBottom: premiumDesign.spacing.sm, fontSize: typo.body }}>
                Voltage vs Time (Charging Curve)
              </h4>
              {renderVoltageGraph(chargeHistory, supplyVoltage, true)}
              {/* Graph axis labels outside SVG */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '6px',
                fontSize: typo.label,
                color: premiumDesign.colors.text.muted,
              }}>
                <span>0</span>
                <span style={{ color: premiumDesign.colors.capacitor }}>1tau</span>
                <span style={{ color: premiumDesign.colors.capacitor }}>2tau</span>
                <span style={{ color: premiumDesign.colors.capacitor }}>3tau</span>
                <span style={{ color: premiumDesign.colors.capacitor }}>4tau</span>
                <span style={{ color: premiumDesign.colors.capacitor }}>5tau</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '4px',
                fontSize: typo.label,
                color: premiumDesign.colors.text.secondary,
              }}>
                <span>Y: {supplyVoltage}V max</span>
                <span>X: Time (tau = {timeConstant.toFixed(2)}s)</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: premiumDesign.spacing.md,
          }}>
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.resistor, marginBottom: premiumDesign.spacing.sm }}>
                R: {resistance} kΩ
              </h4>
              <input
                type="range"
                min="1"
                max="50"
                value={resistance}
                onChange={(e) => { setResistance(Number(e.target.value)); resetCharging(); }}
                style={{ width: '100%', accentColor: premiumDesign.colors.resistor }}
                disabled={isCharging}
              />
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.capacitor, marginBottom: premiumDesign.spacing.sm }}>
                C: {capacitance} μF
              </h4>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={capacitance}
                onChange={(e) => { setCapacitance(Number(e.target.value)); resetCharging(); }}
                style={{ width: '100%', accentColor: premiumDesign.colors.capacitor }}
                disabled={isCharging}
              />
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
            }}>
              <div style={{ color: premiumDesign.colors.text.muted, fontSize: '12px' }}>
                Time Constant τ = R × C
              </div>
              <div style={{ color: premiumDesign.colors.secondary, fontSize: '24px', fontWeight: 700 }}>
                {timeConstant.toFixed(2)} s
              </div>
            </div>

            {renderButton(
              isCharging ? '⏸ Pause' : capacitorVoltage > 0 ? '▶️ Resume' : '▶️ Start Charging',
              () => setIsCharging(!isCharging),
              isCharging ? 'secondary' : 'success'
            )}

            <button
              style={{
                padding: premiumDesign.spacing.md,
                borderRadius: premiumDesign.radius.md,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: premiumDesign.colors.text.secondary,
                cursor: 'pointer',
                zIndex: 10,
              }}
              onClick={() => resetCharging()}
            >
              🔄 Reset
            </button>

            <div style={{
              background: 'rgba(6, 182, 212, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '13px', margin: 0 }}>
                💡 At 1τ: 63% | 2τ: 86% | 3τ: 95% | 5τ: 99%
              </p>
            </div>
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('predict') },
          { text: 'Review Results →', onClick: goNext }
        )}
      </div>
    );
  }

  function renderReviewPhase() {
    const reviewContent = [
      {
        title: "Exponential Charging",
        content: "Capacitors charge with an exponential curve, NOT linearly. The voltage rises quickly at first (when there's maximum current), then slows down as the capacitor fills up and resists further charging.",
        formula: "V(t) = V₀(1 - e^(-t/τ))",
      },
      {
        title: "The Time Constant τ",
        content: "The time constant τ = RC determines HOW FAST charging occurs. After 1τ, the capacitor reaches 63% of supply voltage. After 5τ, it's essentially full (99.3%).",
        formula: "τ = R × C (seconds)",
      },
      {
        title: "Why Exponential?",
        content: "As the capacitor charges, its voltage opposes the supply. This reduces the voltage across the resistor, which reduces current, which slows charging. It's a natural feedback loop!",
        formula: "I = (V_supply - V_cap) / R → decreases as V_cap increases",
      },
      {
        title: "Your Prediction",
        content: prediction === 'exponential'
          ? "Excellent! You correctly predicted the exponential charging behavior. The curve starts fast and slows down as the capacitor approaches full charge."
          : "The correct answer is exponential charging. The capacitor charges quickly at first, then slows as it approaches the supply voltage.",
        formula: "Fast start → Gradual slowdown → Asymptotic approach to V₀",
      },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
          }}>
            📊 Understanding RC Charging
          </h2>
        </div>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          flex: 1,
        }}>
          <h3 style={{
            color: premiumDesign.colors.capacitor,
            fontSize: '20px',
            marginBottom: premiumDesign.spacing.md,
          }}>
            {reviewContent[reviewStep].title}
          </h3>

          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
            lineHeight: 1.7,
            marginBottom: premiumDesign.spacing.lg,
          }}>
            {reviewContent[reviewStep].content}
          </p>

          <div style={{
            background: 'rgba(6, 182, 212, 0.1)',
            borderRadius: premiumDesign.radius.md,
            padding: premiumDesign.spacing.md,
            fontFamily: 'monospace',
            color: premiumDesign.colors.capacitor,
            textAlign: 'center',
          }}>
            {reviewContent[reviewStep].formula}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: premiumDesign.spacing.sm,
            marginTop: premiumDesign.spacing.xl,
          }}>
            {reviewContent.map((_, i) => (
              <button
                key={i}
                style={{
                  width: 40,
                  height: 8,
                  borderRadius: premiumDesign.radius.full,
                  border: 'none',
                  background: i === reviewStep
                    ? premiumDesign.colors.capacitor
                    : premiumDesign.colors.background.tertiary,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  zIndex: 10,
                }}
                onClick={() => setReviewStep(i)}
              />
            ))}
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('play') },
          {
            text: reviewStep < reviewContent.length - 1 ? 'Continue →' : 'Try a Twist →',
            onClick: () => {
              if (reviewStep < reviewContent.length - 1) {
                setReviewStep(r => r + 1);
              } else {
                goNext();
              }
            },
          }
        )}
      </div>
    );
  }

  function renderTwistPredictPhase() {
    const twistPredictions = [
      { id: 'instant', text: "Capacitor discharges instantly to zero" },
      { id: 'linear', text: "Voltage drops at a constant rate (linear)" },
      { id: 'exponential', text: "Voltage drops quickly at first, then slows down (exponential decay)" },
      { id: 'same', text: "Discharging curve is identical to charging curve" },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.md,
          }}>
            🔄 The Twist: Discharging
          </h2>
          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
          }}>
            What happens when a charged capacitor discharges through a resistor?
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: premiumDesign.spacing.md,
          maxWidth: 600,
          margin: '0 auto',
          flex: 1,
        }}>
          {twistPredictions.map((p) => (
            <button
              key={p.id}
              style={{
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: twistPrediction === p.id
                  ? `2px solid ${premiumDesign.colors.secondary}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: twistPrediction === p.id
                  ? 'rgba(139, 92, 246, 0.2)'
                  : premiumDesign.colors.background.tertiary,
                color: premiumDesign.colors.text.primary,
                fontSize: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
                zIndex: 10,
              }}
              onClick={() => setTwistPrediction(p.id)}
            >
              {p.text}
            </button>
          ))}
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('review') },
          {
            text: 'Test My Prediction →',
            onClick: () => {
              resetDischarging();
              goNext();
            },
            disabled: !twistPrediction,
          }
        )}
      </div>
    );
  }

  function renderTwistPlayPhase() {
    const dischargePercent = (dischargeVoltage / supplyVoltage) * 100;

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.lg }}>
          <h2 style={{
            fontSize: isMobile ? '20px' : '26px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.sm,
          }}>
            📉 Capacitor Discharging
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Watch the exponential decay as the capacitor releases its stored energy
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: premiumDesign.spacing.lg,
          flex: 1,
        }}>
          {/* Circuit and Graph */}
          <div style={{
            flex: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: premiumDesign.spacing.md,
          }}>
            {/* Circuit Diagram - Premium Discharge SVG */}
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.xl,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <svg viewBox="0 0 280 120" style={{ width: '100%', maxHeight: 140 }}>
                {renderSVGDefs()}

                {/* Additional gradient for discharge/purple theme */}
                <defs>
                  <linearGradient id="rctcDischargeCapacitor" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="25%" stopColor="#a855f7" />
                    <stop offset="50%" stopColor="#9333ea" />
                    <stop offset="75%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#6d28d9" />
                  </linearGradient>
                  <radialGradient id="rctcDischargeGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#e879f9" stopOpacity="0.9" />
                    <stop offset="40%" stopColor="#c084fc" stopOpacity="0.5" />
                    <stop offset="70%" stopColor="#a855f7" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#9333ea" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="rctcBulbGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="30%" stopColor="#fde047" />
                    <stop offset="60%" stopColor="#facc15" />
                    <stop offset="100%" stopColor="#eab308" stopOpacity="0.3" />
                  </radialGradient>
                </defs>

                {/* Lab background */}
                <rect width="280" height="120" fill="url(#rctcLabBg)" rx="4" />
                <rect width="280" height="120" fill="url(#rctcLabGrid)" rx="4" />

                {/* Circuit wire path */}
                <path d="M 55,60 L 55,20 L 225,20 L 225,100 L 55,100 L 55,60"
                  fill="none" stroke="url(#rctcWireCopper)" strokeWidth="2.5" strokeLinecap="round" />

                {/* Current flow particles (animated when discharging) */}
                {isDischarging && dischargePercent > 5 && [0, 1, 2].map(i => {
                  const offset = (Date.now() / 60 + i * 33) % 100;
                  const pos = offset / 100;
                  // Calculate position along circuit path (reverse direction for discharge)
                  let x, y;
                  if (pos < 0.25) {
                    x = 55;
                    y = 60 - (pos / 0.25) * 40;
                  } else if (pos < 0.5) {
                    x = 55 + ((pos - 0.25) / 0.25) * 170;
                    y = 20;
                  } else if (pos < 0.75) {
                    x = 225;
                    y = 20 + ((pos - 0.5) / 0.25) * 80;
                  } else {
                    x = 225 - ((pos - 0.75) / 0.25) * 170;
                    y = 100;
                  }
                  return (
                    <circle key={i} cx={x} cy={y} r={2 + dischargePercent / 50}
                      fill="url(#rctcCurrentParticle)" filter="url(#rctcCurrentGlowFilter)"
                      opacity={dischargePercent / 100} />
                  );
                })}

                {/* Resistor with colored bands */}
                <g transform="translate(100, 10)">
                  <line x1="-10" y1="10" x2="0" y2="10" stroke="url(#rctcWireCopper)" strokeWidth="2" />
                  <line x1="50" y1="10" x2="60" y2="10" stroke="url(#rctcWireCopper)" strokeWidth="2" />
                  <rect x="0" y="2" width="50" height="16" fill="url(#rctcResistorBands)" rx="3"
                    stroke="#991b1b" strokeWidth="1" />
                  <rect x="0" y="2" width="50" height="3" fill="rgba(255,255,255,0.2)" rx="3" />
                </g>

                {/* Capacitor with discharge visualization */}
                <g transform="translate(195, 10)">
                  <rect x="0" y="0" width="4" height="20" fill="url(#rctcDischargeCapacitor)" rx="1"
                    filter={dischargePercent > 20 ? "url(#rctcCapacitorGlowFilter)" : undefined} />
                  <rect x="12" y="0" width="4" height="20" fill="url(#rctcDischargeCapacitor)" rx="1"
                    filter={dischargePercent > 20 ? "url(#rctcCapacitorGlowFilter)" : undefined} />
                  {/* Remaining charge glow */}
                  {dischargePercent > 5 && (
                    <ellipse cx="8" cy="10" rx={2 + dischargePercent / 40} ry={6}
                      fill="url(#rctcDischargeGlow)" opacity={dischargePercent / 120} />
                  )}
                  {/* Charge level indicator */}
                  <rect x="5" y={20 - dischargePercent * 0.18} width="6" height={dischargePercent * 0.18}
                    fill="#c084fc" opacity="0.4" rx="1" />
                </g>

                {/* Light bulb with glow effect */}
                <g transform="translate(55, 60)">
                  {/* Outer glow when lit */}
                  {dischargePercent > 10 && (
                    <circle cx="0" cy="0" r={14 + dischargePercent / 20} fill="url(#rctcBulbGlow)"
                      opacity={dischargePercent / 200} filter="url(#rctcSoftGlow)" />
                  )}
                  {/* Bulb glass */}
                  <circle cx="0" cy="0" r="12" fill={`rgba(254, 240, 138, ${dischargePercent / 150})`}
                    stroke="#ca8a04" strokeWidth="1.5" />
                  {/* Filament */}
                  <path d="M -4,-2 Q 0,-6 4,-2 Q 0,2 -4,-2" fill="none"
                    stroke={dischargePercent > 20 ? '#fef08a' : '#78350f'} strokeWidth="1.5"
                    filter={dischargePercent > 30 ? "url(#rctcCurrentGlowFilter)" : undefined} />
                  {/* Base */}
                  <rect x="-5" y="8" width="10" height="6" fill="#78350f" rx="1" />
                  <line x1="-4" y1="10" x2="4" y2="10" stroke="#a16207" strokeWidth="1" />
                  <line x1="-4" y1="12" x2="4" y2="12" stroke="#a16207" strokeWidth="1" />
                </g>

                {/* Switch with premium styling */}
                <g transform="translate(180, 95)">
                  <circle cx="0" cy="0" r="4" fill={isDischarging ? "url(#rctcSwitchContact)" : '#4b5563'}
                    stroke={isDischarging ? '#059669' : '#374151'} strokeWidth="1" />
                  <line x1="0" y1="0" x2={isDischarging ? "16" : "10"} y2={isDischarging ? "0" : "-8"}
                    stroke={isDischarging ? "url(#rctcSwitchContact)" : '#6b7280'} strokeWidth="2" strokeLinecap="round" />
                  <circle cx="16" cy="0" r="4" fill={isDischarging ? "url(#rctcSwitchContact)" : '#4b5563'}
                    stroke={isDischarging ? '#059669' : '#374151'} strokeWidth="1" />
                </g>
              </svg>

              {/* Labels outside SVG using typo system */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '8px',
                fontSize: typo.small,
              }}>
                <span style={{ color: '#fbbf24' }}>Bulb: {dischargePercent > 10 ? 'ON' : 'OFF'}</span>
                <span style={{ color: premiumDesign.colors.resistor }}>R = {resistance}kOhm</span>
                <span style={{ color: premiumDesign.colors.secondary }}>C = {capacitance}uF</span>
              </div>

              {/* Voltage and Time Status Display */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: typo.elementGap,
                padding: '10px 14px',
                background: 'rgba(139, 92, 246, 0.1)',
                borderRadius: premiumDesign.radius.md,
                border: '1px solid rgba(139, 92, 246, 0.2)',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: typo.label, color: premiumDesign.colors.text.muted }}>Remaining Voltage</div>
                  <div style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: premiumDesign.colors.secondary }}>
                    {dischargeVoltage.toFixed(2)}V ({dischargePercent.toFixed(1)}%)
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: typo.label, color: premiumDesign.colors.text.muted }}>Discharge Time</div>
                  <div style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: premiumDesign.colors.capacitor }}>
                    {dischargeTime.toFixed(2)}s ({(dischargeTime / timeConstant).toFixed(2)}tau)
                  </div>
                </div>
              </div>
            </div>

            {/* Discharge Graph */}
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.xl,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.text.primary, marginBottom: premiumDesign.spacing.sm, fontSize: typo.body }}>
                Voltage vs Time (Discharge Curve)
              </h4>
              {renderVoltageGraph(dischargeHistory, supplyVoltage, false)}
              {/* Graph axis labels outside SVG */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '6px',
                fontSize: typo.label,
                color: premiumDesign.colors.text.muted,
              }}>
                <span>0</span>
                <span style={{ color: premiumDesign.colors.secondary }}>1tau</span>
                <span style={{ color: premiumDesign.colors.secondary }}>2tau</span>
                <span style={{ color: premiumDesign.colors.secondary }}>3tau</span>
                <span style={{ color: premiumDesign.colors.secondary }}>4tau</span>
                <span style={{ color: premiumDesign.colors.secondary }}>5tau</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '4px',
                fontSize: typo.label,
                color: premiumDesign.colors.text.secondary,
              }}>
                <span>Y: {supplyVoltage}V max</span>
                <span>X: Time (tau = {timeConstant.toFixed(2)}s)</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: premiumDesign.spacing.md,
          }}>
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
            }}>
              <div style={{ color: premiumDesign.colors.text.muted, fontSize: typo.small }}>
                Time Constant tau
              </div>
              <div style={{ color: premiumDesign.colors.secondary, fontSize: typo.heading, fontWeight: 700 }}>
                {timeConstant.toFixed(2)} s
              </div>
            </div>

            {renderButton(
              isDischarging ? '⏸ Pause' : '▶️ Start Discharge',
              () => setIsDischarging(!isDischarging),
              isDischarging ? 'secondary' : 'success'
            )}

            <button
              style={{
                padding: premiumDesign.spacing.md,
                borderRadius: premiumDesign.radius.md,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: premiumDesign.colors.text.secondary,
                cursor: 'pointer',
                zIndex: 10,
              }}
              onClick={() => resetDischarging()}
            >
              🔄 Reset (Full Charge)
            </button>

            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '13px', margin: 0 }}>
                💡 Discharge follows V(t) = V₀ × e^(-t/τ). At 1τ: 37% remains | 3τ: 5% | 5τ: ~1%
              </p>
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{ color: premiumDesign.colors.text.muted, fontSize: '12px', marginBottom: 4 }}>
                Remaining charge at key time constants:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, fontSize: '11px' }}>
                <span style={{ color: premiumDesign.colors.text.secondary }}>1τ: 37%</span>
                <span style={{ color: premiumDesign.colors.text.secondary }}>2τ: 14%</span>
                <span style={{ color: premiumDesign.colors.text.secondary }}>3τ: 5%</span>
              </div>
            </div>
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('twist_predict') },
          { text: 'Review Results →', onClick: goNext }
        )}
      </div>
    );
  }

  function renderTwistReviewPhase() {
    const twistReviewContent = [
      {
        title: "Exponential Decay",
        content: "Discharging also follows an exponential curve, but it's decay instead of growth. Voltage drops quickly at first (when there's maximum stored charge) then slows as less charge remains.",
        highlight: twistPrediction === 'exponential'
          ? "You correctly predicted exponential decay during discharge!"
          : "The correct answer is exponential decay. The voltage drops quickly at first, then gradually approaches zero.",
      },
      {
        title: "Mirror Image Curve",
        content: "The discharge curve is the 'flipped' version of charging. While charging approaches V₀ from below, discharging approaches 0 from above. Both use the same time constant τ!",
      },
      {
        title: "Same Time Constant",
        content: "Whether charging or discharging, the time constant τ = RC remains the same. After 1τ of discharge, 37% of the original voltage remains (100% - 63% = 37%).",
      },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
          }}>
            🔍 Discharge Analysis
          </h2>
        </div>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          flex: 1,
        }}>
          <h3 style={{
            color: premiumDesign.colors.secondary,
            fontSize: '20px',
            marginBottom: premiumDesign.spacing.md,
          }}>
            {twistReviewContent[twistReviewStep].title}
          </h3>

          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
            lineHeight: 1.7,
            marginBottom: premiumDesign.spacing.md,
          }}>
            {twistReviewContent[twistReviewStep].content}
          </p>

          {twistReviewContent[twistReviewStep].highlight && (
            <div style={{
              background: twistPrediction === 'exponential'
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(239, 68, 68, 0.2)',
              borderRadius: premiumDesign.radius.md,
              padding: premiumDesign.spacing.md,
              marginTop: premiumDesign.spacing.md,
              border: `1px solid ${twistPrediction === 'exponential' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
            }}>
              <p style={{
                color: twistPrediction === 'exponential' ? premiumDesign.colors.success : '#EF4444',
                margin: 0
              }}>
                {twistReviewContent[twistReviewStep].highlight}
              </p>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: premiumDesign.spacing.sm,
            marginTop: premiumDesign.spacing.xl,
          }}>
            {twistReviewContent.map((_, i) => (
              <button
                key={i}
                style={{
                  width: 40,
                  height: 8,
                  borderRadius: premiumDesign.radius.full,
                  border: 'none',
                  background: i === twistReviewStep
                    ? premiumDesign.colors.secondary
                    : premiumDesign.colors.background.tertiary,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  zIndex: 10,
                }}
                onClick={() => setTwistReviewStep(i)}
              />
            ))}
          </div>
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('twist_play') },
          {
            text: twistReviewStep < twistReviewContent.length - 1 ? 'Continue →' : 'Real-World Examples →',
            onClick: () => {
              if (twistReviewStep < twistReviewContent.length - 1) {
                setTwistReviewStep(t => t + 1);
              } else {
                goNext();
              }
            },
          }
        )}
      </div>
    );
  }

  function renderTransferPhase() {
    const applications = [
      {
        title: "📸 Camera Flash",
        description: "Camera flashes use large capacitors that slowly charge from the battery (you hear the whine!), then discharge all their energy through the flash tube in milliseconds, creating a bright burst of light.",
        fact: "A camera flash capacitor might store 100+ Joules of energy and discharge it in just 1/1000th of a second!",
      },
      {
        title: "📱 Touchscreens",
        description: "Capacitive touchscreens work by detecting changes in capacitance when your finger approaches. Your finger forms a small capacitor with the screen, changing the RC time constant of sensing circuits.",
        fact: "Modern touchscreens can detect touches with sub-millimeter precision using arrays of tiny capacitive sensors!",
      },
      {
        title: "🔊 Audio Filters",
        description: "RC circuits create high-pass and low-pass filters in audio equipment. The time constant determines which frequencies pass through - essential for equalizers, crossovers, and tone controls.",
        fact: "The 'bass' and 'treble' knobs on your stereo are adjusting RC filter circuits!",
      },
      {
        title: "⏰ Timing Circuits",
        description: "The 555 timer IC uses RC circuits to create precise timing intervals. From blinking LEDs to microwave ovens, countless devices use RC-based timing for their operations.",
        fact: "The 555 timer is one of the most successful ICs ever made - over 1 billion are manufactured every year!",
      },
    ];

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{ textAlign: 'center', marginBottom: premiumDesign.spacing.xl }}>
          <h2 style={{
            fontSize: isMobile ? '22px' : '28px',
            fontWeight: 700,
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.sm,
          }}>
            🌍 RC Circuits in Action
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Explore all {applications.length} applications to unlock the quiz
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: premiumDesign.spacing.sm,
          marginBottom: premiumDesign.spacing.lg,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {applications.map((app, index) => (
            <button
              key={index}
              style={{
                padding: `${premiumDesign.spacing.sm}px ${premiumDesign.spacing.md}px`,
                borderRadius: premiumDesign.radius.full,
                border: activeApp === index
                  ? `2px solid ${premiumDesign.colors.capacitor}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: activeApp === index
                  ? 'rgba(6, 182, 212, 0.2)'
                  : completedApps.has(index)
                    ? 'rgba(16, 185, 129, 0.2)'
                    : premiumDesign.colors.background.tertiary,
                color: premiumDesign.colors.text.primary,
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                zIndex: 10,
              }}
              onClick={() => setActiveApp(index)}
            >
              {completedApps.has(index) && '✓ '}{app.title.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Application Content */}
        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          flex: 1,
        }}>
          <h3 style={{
            fontSize: '22px',
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.md,
          }}>
            {applications[activeApp].title}
          </h3>

          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
            lineHeight: 1.7,
            marginBottom: premiumDesign.spacing.lg,
          }}>
            {applications[activeApp].description}
          </p>

          <div style={{
            background: 'rgba(6, 182, 212, 0.1)',
            borderRadius: premiumDesign.radius.lg,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(6, 182, 212, 0.3)',
          }}>
            <p style={{ margin: 0, color: premiumDesign.colors.capacitor, fontWeight: 600 }}>
              💡 Fun Fact
            </p>
            <p style={{ margin: `${premiumDesign.spacing.sm}px 0 0`, color: premiumDesign.colors.text.secondary }}>
              {applications[activeApp].fact}
            </p>
          </div>

          {!completedApps.has(activeApp) ? (
            <button
              style={{
                display: 'block',
                width: '100%',
                marginTop: premiumDesign.spacing.lg,
                padding: premiumDesign.spacing.md,
                borderRadius: premiumDesign.radius.md,
                border: 'none',
                background: premiumDesign.colors.gradient.primary,
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                zIndex: 10,
              }}
              onClick={() => {
                const newCompleted = new Set(completedApps);
                newCompleted.add(activeApp);
                setCompletedApps(newCompleted);
              }}
            >
              ✓ Mark as Read
            </button>
          ) : activeApp < applications.length - 1 ? (
            <button
              style={{
                display: 'block',
                width: '100%',
                marginTop: premiumDesign.spacing.lg,
                padding: premiumDesign.spacing.md,
                borderRadius: premiumDesign.radius.md,
                border: 'none',
                background: premiumDesign.colors.gradient.rc,
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                zIndex: 10,
              }}
              onClick={() => setActiveApp(activeApp + 1)}
            >
              Next Application →
            </button>
          ) : null}
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: premiumDesign.spacing.lg,
          color: premiumDesign.colors.text.muted,
        }}>
          {completedApps.size} of {applications.length} applications explored
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('twist_review') },
          {
            text: completedApps.size === applications.length ? 'Take the Quiz →' : `Explore ${applications.length - completedApps.size} More →`,
            onClick: goNext,
            disabled: completedApps.size < applications.length,
          }
        )}
      </div>
    );
  }

  function renderTestPhase() {
    const question = testQuestions[currentQuestion];

    if (testComplete) {
      const percentage = Math.round((testScore / testQuestions.length) * 100);
      const passed = percentage >= 70;

      return (
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
          {renderProgressBar()}

          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '72px', marginBottom: premiumDesign.spacing.lg }}>
              {passed ? '🎉' : '📚'}
            </div>

            <h2 style={{
              fontSize: isMobile ? '28px' : '36px',
              fontWeight: 700,
              color: premiumDesign.colors.text.primary,
              marginBottom: premiumDesign.spacing.md,
            }}>
              {passed ? 'Excellent Work!' : 'Keep Learning!'}
            </h2>

            <div style={{
              fontSize: '48px',
              fontWeight: 700,
              background: passed ? premiumDesign.colors.gradient.rc : 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: premiumDesign.spacing.md,
            }}>
              {testScore}/{testQuestions.length}
            </div>

            <p style={{
              color: premiumDesign.colors.text.secondary,
              fontSize: '18px',
              marginBottom: premiumDesign.spacing.xl,
            }}>
              {passed
                ? 'You have mastered RC time constants!'
                : 'Review the material and try again.'}
            </p>

            {renderButton(
              passed ? 'Continue to Mastery →' : 'Review Material',
              () => {
                if (passed) {
                  goNext();
                } else {
                  setTestComplete(false);
                  setCurrentQuestion(0);
                  setTestScore(0);
                  goToPhase('review');
                }
              },
              passed ? 'success' : 'primary'
            )}
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        {renderProgressBar()}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          <span style={{ color: premiumDesign.colors.text.muted }}>
            Question {currentQuestion + 1} of {testQuestions.length}
          </span>
          <span style={{ color: premiumDesign.colors.capacitor, fontWeight: 600 }}>
            Score: {testScore}
          </span>
        </div>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          flex: 1,
        }}>
          <h3 style={{
            fontSize: isMobile ? '18px' : '22px',
            color: premiumDesign.colors.text.primary,
            marginBottom: premiumDesign.spacing.xl,
            lineHeight: 1.5,
          }}>
            {question.question}
          </h3>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: premiumDesign.spacing.md,
          }}>
            {question.options.map((option, index) => {
              let buttonStyle: React.CSSProperties = {
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: '2px solid rgba(255,255,255,0.1)',
                background: premiumDesign.colors.background.tertiary,
                color: premiumDesign.colors.text.primary,
                fontSize: '16px',
                cursor: showExplanation ? 'default' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
                zIndex: 10,
              };

              if (showExplanation) {
                if (option.correct) {
                  buttonStyle.background = 'rgba(16, 185, 129, 0.2)';
                  buttonStyle.borderColor = premiumDesign.colors.success;
                } else if (index === selectedAnswer && !option.correct) {
                  buttonStyle.background = 'rgba(239, 68, 68, 0.2)';
                  buttonStyle.borderColor = '#EF4444';
                }
              } else if (selectedAnswer === index) {
                buttonStyle.borderColor = premiumDesign.colors.capacitor;
                buttonStyle.background = 'rgba(6, 182, 212, 0.2)';
              }

              return (
                <button
                  key={index}
                  style={buttonStyle}
                  onClick={() => {
                    if (!showExplanation) {
                      setSelectedAnswer(index);
                    }
                  }}
                  disabled={showExplanation}
                >
                  {option.text}
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div style={{
              marginTop: premiumDesign.spacing.xl,
              padding: premiumDesign.spacing.lg,
              background: 'rgba(6, 182, 212, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.capacitor, fontWeight: 600, marginBottom: premiumDesign.spacing.sm }}>
                Explanation:
              </p>
              <p style={{ color: premiumDesign.colors.text.secondary, margin: 0 }}>
                {question.explanation}
              </p>
            </div>
          )}
        </div>

        <div style={{ marginTop: premiumDesign.spacing.xl, display: 'flex', justifyContent: 'flex-end' }}>
          {!showExplanation ? (
            renderButton(
              'Check Answer',
              () => {
                setShowExplanation(true);
                if (question.options[selectedAnswer as number]?.correct) {
                  setTestScore(s => s + 1);
                }
              },
              'primary',
              selectedAnswer === null
            )
          ) : (
            renderButton(
              currentQuestion < testQuestions.length - 1 ? 'Next Question →' : 'See Results',
              () => {
                if (currentQuestion < testQuestions.length - 1) {
                  setCurrentQuestion(c => c + 1);
                  setSelectedAnswer(null);
                  setShowExplanation(false);
                } else {
                  setTestComplete(true);
                }
              },
              'primary'
            )
          )}
        </div>
      </div>
    );
  }

  function renderMasteryPhase() {
    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: premiumDesign.spacing.xl,
      }}>
        <div style={{
          fontSize: '80px',
          marginBottom: premiumDesign.spacing.xl,
        }}>
          🏆
        </div>

        <h1 style={{
          fontSize: isMobile ? '32px' : '42px',
          fontWeight: 700,
          background: premiumDesign.colors.gradient.rc,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          RC Circuit Master!
        </h1>

        <p style={{
          fontSize: '18px',
          color: premiumDesign.colors.text.secondary,
          maxWidth: 500,
          lineHeight: 1.7,
          marginBottom: premiumDesign.spacing.xl,
        }}>
          You now understand how capacitors charge and discharge through resistors, and can predict timing behavior using the time constant τ!
        </p>

        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.xl,
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: 500,
          width: '100%',
          marginBottom: premiumDesign.spacing.xl,
        }}>
          <h3 style={{ color: premiumDesign.colors.capacitor, marginBottom: premiumDesign.spacing.md }}>
            Key Concepts Mastered
          </h3>
          <ul style={{
            textAlign: 'left',
            color: premiumDesign.colors.text.secondary,
            lineHeight: 2,
            paddingLeft: premiumDesign.spacing.lg,
          }}>
            <li>Time constant τ = R × C</li>
            <li>Charging: V(t) = V₀(1 - e^(-t/τ))</li>
            <li>Discharging: V(t) = V₀ × e^(-t/τ)</li>
            <li>1τ → 63% charged / 37% remaining</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: premiumDesign.spacing.md, flexWrap: 'wrap', justifyContent: 'center' }}>
          {renderButton('← Review Again', () => goToPhase('hook'), 'secondary')}
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">RC Time Constant</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                style={{ zIndex: 10 }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-cyan-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12" style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '64px 16px 48px' : '64px 32px 48px' }}>
        {phase === 'hook' && renderHookPhase()}
        {phase === 'predict' && renderPredictPhase()}
        {phase === 'play' && renderPlayPhase()}
        {phase === 'review' && renderReviewPhase()}
        {phase === 'twist_predict' && renderTwistPredictPhase()}
        {phase === 'twist_play' && renderTwistPlayPhase()}
        {phase === 'twist_review' && renderTwistReviewPhase()}
        {phase === 'transfer' && renderTransferPhase()}
        {phase === 'test' && renderTestPhase()}
        {phase === 'mastery' && renderMasteryPhase()}
      </div>
    </div>
  );
}
