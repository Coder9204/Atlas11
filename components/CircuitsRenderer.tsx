'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

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
    voltage: '#FBBF24',
    current: '#3B82F6',
    resistance: '#EF4444',
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
      circuit: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
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
  'play': 'Experiment',
  'review': 'Review',
  'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Experiment',
  'twist_review': 'Twist Review',
  'transfer': 'Transfer',
  'test': 'Test',
  'mastery': 'Mastery'
};

interface Electron {
  id: number;
  x: number;
  y: number;
  pathPosition: number;
}

interface CircuitsRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
  onPhaseComplete?: (phase: string) => void;
}

export default function CircuitsRenderer({ onGameEvent, gamePhase, onPhaseComplete }: CircuitsRendererProps) {
  const lastClickRef = useRef(0);

  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Typography responsive system
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

  // Core State
  const [phase, setPhase] = useState<Phase>(() => {
    if (gamePhase !== undefined && phaseOrder.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  });

  // Hook phase
  const [hookStep, setHookStep] = useState(0);

  // Predict phase
  const [prediction, setPrediction] = useState<string | null>(null);

  // Play phase - Ohm's Law simulation
  const [voltage, setVoltage] = useState(12);
  const [resistance, setResistance] = useState(4);
  const [current, setCurrent] = useState(3);
  const [electrons, setElectrons] = useState<Electron[]>([]);
  const [isCircuitOn, setIsCircuitOn] = useState(false);
  const animationRef = useRef<number | null>(null);

  // Review phase
  const [reviewStep, setReviewStep] = useState(0);

  // Twist predict
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Twist play - Series vs Parallel
  const [circuitType, setCircuitType] = useState<'series' | 'parallel'>('series');
  const [r1, setR1] = useState(4);
  const [r2, setR2] = useState(4);
  const [twistVoltage, setTwistVoltage] = useState(12);

  // Twist review
  const [twistReviewStep, setTwistReviewStep] = useState(0);

  // Transfer phase
  const [activeApp, setActiveApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<Set<number>>(new Set());

  // Test phase
  const [testQuestions] = useState([
    {
      scenario: "You're helping your friend troubleshoot why their string of holiday lights went completely dark after one bulb burned out.",
      question: "Why did all the lights go out when just one bulb failed?",
      options: [
        { id: 'a', label: "The power surge from the broken bulb damaged all other bulbs" },
        { id: 'b', label: "In a series circuit, current has only one path, so a break stops all current flow", correct: true },
        { id: 'c', label: "The remaining bulbs couldn't handle the extra voltage" },
        { id: 'd', label: "Modern lights are designed to all fail together for safety" }
      ],
      explanation: "In a series circuit, there's only one path for current to flow. When one bulb burns out, it creates an open circuit, breaking the path and stopping current to all bulbs. This is why newer holiday lights often use parallel wiring."
    },
    {
      scenario: "An electrician is installing outlets in a new house and wants each outlet to work independently of the others.",
      question: "Which circuit configuration should the electrician use?",
      options: [
        { id: 'a', label: "Series circuit - it uses less wire" },
        { id: 'b', label: "Parallel circuit - each outlet gets full voltage and operates independently", correct: true },
        { id: 'c', label: "Alternating series and parallel for efficiency" },
        { id: 'd', label: "It doesn't matter as long as the wire is thick enough" }
      ],
      explanation: "Parallel circuits are used in home wiring because each outlet receives the full voltage (120V or 240V), and unplugging or turning off one device doesn't affect others. This is essential for practical household electrical systems."
    },
    {
      scenario: "A phone charger is rated for 5V and 2A. You want to calculate how much power it delivers to charge your phone.",
      question: "What is the power output of this charger?",
      options: [
        { id: 'a', label: "7 Watts (5V + 2A)" },
        { id: 'b', label: "2.5 Watts (5V / 2A)" },
        { id: 'c', label: "10 Watts (5V x 2A)", correct: true },
        { id: 'd', label: "0.4 Watts (2A / 5V)" }
      ],
      explanation: "Electrical power is calculated as P = V x I (voltage times current). So 5V x 2A = 10 Watts. This formula is fundamental in electrical engineering and helps you understand why fast chargers use higher voltages or currents."
    },
    {
      scenario: "You're designing a dimmer switch for a lamp that uses a 120V power supply. The lamp draws 0.5A at full brightness.",
      question: "What is the resistance of the lamp filament?",
      options: [
        { id: 'a', label: "60 Ohms (120V / 0.5A / 4)" },
        { id: 'b', label: "240 Ohms (120V / 0.5A)", correct: true },
        { id: 'c', label: "120.5 Ohms (120V + 0.5A)" },
        { id: 'd', label: "60.25 Ohms (120V x 0.5A / 1000)" }
      ],
      explanation: "Using Ohm's Law (V = IR), we can solve for R = V/I = 120V / 0.5A = 240 Ohms. This relationship between voltage, current, and resistance is the foundation of circuit analysis."
    },
    {
      scenario: "A car battery provides 12V to start the engine. If the starter motor has a resistance of 0.1 Ohms, you need to find the current draw.",
      question: "How much current flows through the starter motor?",
      options: [
        { id: 'a', label: "1.2 Amperes" },
        { id: 'b', label: "12 Amperes" },
        { id: 'c', label: "120 Amperes", correct: true },
        { id: 'd', label: "0.12 Amperes" }
      ],
      explanation: "Using Ohm's Law, I = V/R = 12V / 0.1 Ohms = 120 Amperes. This is why car starter motors require thick cables - they carry enormous currents for brief periods. The low resistance allows high current to produce the power needed to turn the engine."
    },
    {
      scenario: "You have two 100-Ohm resistors and need to create a circuit with less total resistance than either individual resistor.",
      question: "How should you connect the resistors to achieve this?",
      options: [
        { id: 'a', label: "Connect them in series to get 200 Ohms total" },
        { id: 'b', label: "Connect them in parallel to get 50 Ohms total", correct: true },
        { id: 'c', label: "Stack them on top of each other" },
        { id: 'd', label: "It's impossible - combined resistance is always higher" }
      ],
      explanation: "In parallel, 1/R_total = 1/R1 + 1/R2 = 1/100 + 1/100 = 2/100, so R_total = 50 Ohms. Parallel resistance is always less than the smallest individual resistance because current has multiple paths to flow through."
    },
    {
      scenario: "A technician notices that when she adds more resistors in series to a circuit with constant voltage, the ammeter reading decreases.",
      question: "Why does current decrease when more resistance is added in series?",
      options: [
        { id: 'a', label: "The battery is getting weaker" },
        { id: 'b', label: "According to Ohm's Law, I = V/R, so more resistance means less current", correct: true },
        { id: 'c', label: "Electrons get tired traveling through more resistors" },
        { id: 'd', label: "The ammeter is malfunctioning from heat" }
      ],
      explanation: "Ohm's Law states V = IR, or rearranged, I = V/R. With constant voltage, increasing resistance directly decreases current. Think of it like water flowing through a pipe - more obstacles (resistance) means less flow (current)."
    },
    {
      scenario: "An engineer is testing a circuit and measures 3A of current through three resistors connected in series. Each resistor is 4 Ohms.",
      question: "What is the voltage of the power supply?",
      options: [
        { id: 'a', label: "12V (3A x 4Ω)" },
        { id: 'b', label: "36V (3A x 12Ω)", correct: true },
        { id: 'c', label: "4V (12Ω / 3A)" },
        { id: 'd', label: "1.33V (4Ω / 3A)" }
      ],
      explanation: "In series, total resistance is the sum: 4 + 4 + 4 = 12 Ohms. Using V = IR: V = 3A x 12Ω = 36V. Series resistances add up because current must flow through each one consecutively."
    },
    {
      scenario: "You're comparing two flashlights: one uses batteries in series (higher voltage), the other uses batteries in parallel (same voltage, longer life).",
      question: "What advantage does connecting batteries in parallel provide?",
      options: [
        { id: 'a', label: "Higher voltage output" },
        { id: 'b', label: "Brighter light immediately" },
        { id: 'c', label: "Same voltage but longer battery life due to shared current load", correct: true },
        { id: 'd', label: "Faster charging capability" }
      ],
      explanation: "Batteries in parallel maintain the same voltage but combine their capacity. The current draw is shared among batteries, so each battery depletes more slowly. This is used when you need longer runtime without increasing voltage."
    },
    {
      scenario: "A laboratory power supply shows 24V and 2A when connected to a heating element. The element is used to maintain temperature in an experiment.",
      question: "How much power is the heating element consuming?",
      options: [
        { id: 'a', label: "12 Watts (24V / 2A)" },
        { id: 'b', label: "26 Watts (24V + 2A)" },
        { id: 'c', label: "48 Watts (24V x 2A)", correct: true },
        { id: 'd', label: "6 Watts (24V / 2A / 2)" }
      ],
      explanation: "Power P = V x I = 24V x 2A = 48 Watts. This power is converted to heat in the element. Understanding power consumption helps in designing efficient heating systems and calculating energy costs."
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

  // Phase sync
  useEffect(() => {
    if (gamePhase !== undefined && phaseOrder.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Audio feedback
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

  // Calculate current from Ohm's Law
  useEffect(() => {
    setCurrent(voltage / resistance);
  }, [voltage, resistance]);

  // Initialize electrons
  const initElectrons = useCallback(() => {
    const newElectrons: Electron[] = [];
    for (let i = 0; i < 12; i++) {
      newElectrons.push({
        id: i,
        x: 0,
        y: 0,
        pathPosition: i * (100 / 12),
      });
    }
    setElectrons(newElectrons);
  }, []);

  useEffect(() => {
    if (phase === 'play') {
      initElectrons();
    }
  }, [phase, initElectrons]);

  // Animate electrons
  useEffect(() => {
    if (phase === 'play' && isCircuitOn) {
      const animate = () => {
        setElectrons(prev => prev.map(e => {
          let newPos = (e.pathPosition + current * 0.3) % 100;
          return { ...e, pathPosition: newPos };
        }));
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [phase, isCircuitOn, current]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [phase]);

  // Get electron position on circuit path
  const getElectronPosition = (pathPosition: number) => {
    // Circuit path: rectangle around the circuit
    // 0-25: bottom (left to right)
    // 25-50: right side (bottom to top)
    // 50-75: top (right to left)
    // 75-100: left side (top to bottom)
    const p = pathPosition;

    if (p < 25) {
      return { x: 60 + (p / 25) * 180, y: 220 };
    } else if (p < 50) {
      return { x: 240, y: 220 - ((p - 25) / 25) * 140 };
    } else if (p < 75) {
      return { x: 240 - ((p - 50) / 25) * 180, y: 80 };
    } else {
      return { x: 60, y: 80 + ((p - 75) / 25) * 140 };
    }
  };

  // Calculate series/parallel values
  const getSeriesValues = () => {
    const totalR = r1 + r2;
    const i = twistVoltage / totalR;
    const v1 = i * r1;
    const v2 = i * r2;
    return { totalR, i, v1, v2 };
  };

  const getParallelValues = () => {
    const totalR = (r1 * r2) / (r1 + r2);
    const i = twistVoltage / totalR;
    const i1 = twistVoltage / r1;
    const i2 = twistVoltage / r2;
    return { totalR, i, i1, i2 };
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
        background: premiumDesign.colors.gradient.circuit,
        color: 'white',
        boxShadow: premiumDesign.shadows.glow(premiumDesign.colors.voltage),
      },
    };

    return (
      <button
        style={{ ...baseStyle, ...variants[variant] }}
        onClick={() => {
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
            background: premiumDesign.colors.gradient.circuit,
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

  // Real-World Applications Data
  const realWorldApps = [
    {
      icon: "📱",
      title: "Smartphone Electronics",
      short: "Mobile Devices",
      tagline: "Powering billions of pocket computers worldwide",
      description: "Every smartphone contains hundreds of miniaturized circuits that work together to deliver computing power, wireless communication, and sensing capabilities in a device that fits in your palm. These circuits use Ohm's Law principles at microscopic scales, with voltage regulators managing power delivery from the battery to various components like the processor, display, and radios. The intricate circuit designs balance power consumption against performance, enabling all-day battery life while running complex applications.",
      connection: "Just like our Ohm's Law simulation showed V = IR, smartphone power management circuits constantly adjust voltage and current to different components. When your phone dims the screen to save battery, it's reducing voltage to the display backlight. When the processor runs demanding apps, power circuits increase current flow to deliver more energy.",
      howItWorks: "Smartphone power management ICs (PMICs) contain dozens of voltage regulators that convert battery voltage (3.7-4.2V) to the specific voltages each component needs. The processor might need 0.8-1.2V, the display 5V, and the camera sensors 2.8V. These regulators use feedback loops based on Ohm's Law to maintain stable voltages as current demands fluctuate. Capacitors and inductors smooth power delivery, while thermal sensors monitor for excessive current that could cause overheating.",
      stats: [
        { val: "500+", label: "Circuit components in a typical smartphone" },
        { val: "3.7V", label: "Standard lithium battery voltage" },
        { val: "15W", label: "Peak power consumption during gaming" }
      ],
      examples: [
        "Battery management systems preventing overcharge",
        "Display driver circuits controlling pixel brightness",
        "RF circuits amplifying cellular signals",
        "Charging circuits managing fast-charge protocols"
      ],
      companies: ["Apple", "Samsung", "Qualcomm", "MediaTek", "Texas Instruments"],
      futureImpact: "Future smartphones will feature adaptive power circuits that use AI to predict user behavior and pre-configure power states. Gallium nitride (GaN) circuits will enable faster charging in smaller form factors, while energy-harvesting circuits will capture ambient RF energy to extend battery life.",
      color: "#3b82f6"
    },
    {
      icon: "🚗",
      title: "Electric Vehicle Power Systems",
      short: "Automotive",
      tagline: "Driving the future with high-voltage engineering",
      description: "Electric vehicles represent the most sophisticated application of circuit principles in consumer products. EV powertrains manage enormous currents—often 300+ amps—flowing from battery packs operating at 400-800 volts. These systems must efficiently convert stored chemical energy to mechanical motion while maintaining safety, managing thermal loads, and optimizing range. Every aspect of EV power electronics relies on precise application of Ohm's Law to minimize energy losses and maximize performance.",
      connection: "Our series and parallel circuit exploration directly applies to EV battery design. Thousands of individual cells are connected in series to increase voltage (just like our series resistors increased total resistance) and in parallel to increase capacity. The total resistance of the battery pack, including internal resistance of cells and connections, determines how much current can flow and how much energy is lost as heat.",
      howItWorks: "The battery management system (BMS) monitors voltage, current, and temperature of each cell module using precise measurements based on Ohm's Law. The main inverter converts DC battery power to three-phase AC for the motor, switching massive currents thousands of times per second. Regenerative braking reverses the power flow, using the motor as a generator to recharge the battery. All these systems use power electronics that must handle extreme currents while minimizing I²R losses.",
      stats: [
        { val: "800V", label: "High-voltage EV architecture" },
        { val: "350kW", label: "Peak charging power capability" },
        { val: "90%+", label: "Powertrain efficiency rating" }
      ],
      examples: [
        "Battery pack thermal management systems",
        "DC-DC converters for 12V accessory systems",
        "Motor inverters controlling torque output",
        "Onboard chargers for AC power conversion"
      ],
      companies: ["Tesla", "BYD", "Rivian", "Lucid Motors", "Bosch"],
      futureImpact: "Next-generation EVs will feature solid-state batteries with lower internal resistance for faster charging and longer range. Vehicle-to-grid (V2G) technology will allow EVs to act as distributed power storage, selling electricity back to the grid. Wireless charging roads will power vehicles while driving using inductive circuit principles.",
      color: "#10b981"
    },
    {
      icon: "🏠",
      title: "Home Electrical Wiring",
      short: "Residential",
      tagline: "Safely powering modern living",
      description: "Every home contains an intricate network of electrical circuits that safely deliver power to outlets, lights, and appliances. Residential wiring uses parallel circuit topology so each device operates independently at the standard voltage (120V in North America, 230V in Europe). This design means turning off one light doesn't affect others, and each circuit can be protected by its own breaker. The entire system is engineered around Ohm's Law principles to prevent fires, shocks, and equipment damage.",
      connection: "Our parallel circuit simulation demonstrates exactly why homes use parallel wiring—each branch gets the full voltage and operates independently. The circuit breakers in your electrical panel act like the current-limiting principles we explored: when too much current flows (I = V/R with too little R), the breaker trips to prevent wire overheating. This is Ohm's Law protecting your home.",
      howItWorks: "Power enters through the service panel where a main breaker limits total current. Individual branch circuits fan out in parallel, each protected by breakers sized for the wire gauge (14 AWG wire gets 15A breaker, 12 AWG gets 20A). Wire resistance causes small voltage drops over long runs, calculated using V = IR. Ground-fault circuit interrupters (GFCIs) detect when current takes an unintended path (through a person!) by measuring the difference between hot and neutral conductors.",
      stats: [
        { val: "200A", label: "Typical home service capacity" },
        { val: "120/240V", label: "Standard residential voltages" },
        { val: "14-6 AWG", label: "Common residential wire gauges" }
      ],
      examples: [
        "Circuit breaker panels distributing power",
        "GFCI outlets protecting wet areas",
        "Dimmer switches controlling light brightness",
        "240V circuits for heavy appliances"
      ],
      companies: ["Square D", "Eaton", "Siemens", "Leviton", "Lutron"],
      futureImpact: "Smart home electrical systems will feature intelligent circuit breakers that monitor power usage in real-time, detect electrical faults before they cause fires, and optimize energy consumption. DC microgrids may supplement AC wiring, directly powering LED lights and electronics more efficiently.",
      color: "#f59e0b"
    },
    {
      icon: "💻",
      title: "Computer Motherboards",
      short: "Computing",
      tagline: "The nervous system of digital intelligence",
      description: "A computer motherboard is a marvel of circuit engineering, containing dozens of layers of copper traces connecting billions of transistors. These circuits must deliver precise voltages to components operating at wildly different power levels—from the CPU drawing 150+ watts to memory chips needing just a few watts. Signal integrity depends on carefully controlled impedances (resistance to AC signals) to maintain data integrity at gigahertz frequencies. Every trace, via, and plane is designed using principles that extend from basic Ohm's Law.",
      connection: "The voltage regulator modules (VRMs) on motherboards demonstrate Ohm's Law in action continuously. They convert 12V from the power supply to the 0.8-1.5V the CPU needs, dynamically adjusting current delivery based on processor demand. When your CPU runs intensive tasks, the VRM increases current flow—exactly the V = IR relationship we explored, where the processor's effective resistance drops as it works harder.",
      howItWorks: "Multi-phase VRMs use parallel power stages to deliver hundreds of amps while minimizing I²R losses in each stage. High-frequency switching (500kHz+) with inductors and capacitors smooth the output voltage. Thermal sensors trigger throttling when circuits exceed safe temperatures. For data signals, controlled-impedance traces (typically 50-100 ohms) prevent reflections and ensure clean signal transmission at multi-gigabit speeds.",
      stats: [
        { val: "16+", label: "VRM phases in high-end boards" },
        { val: "300A+", label: "Peak CPU current delivery" },
        { val: "10+ Gbps", label: "High-speed signal rates" }
      ],
      examples: [
        "CPU voltage regulator modules (VRMs)",
        "DDR5 memory power delivery systems",
        "PCIe slot power management circuits",
        "USB-C power delivery controllers"
      ],
      companies: ["Intel", "AMD", "NVIDIA", "ASUS", "Gigabyte"],
      futureImpact: "Future motherboards will integrate more power delivery directly into CPU packages, reducing losses and enabling higher performance. Optical interconnects may replace some electrical traces for even higher bandwidth. AI-driven power management will anticipate workloads and pre-configure voltage rails for optimal efficiency.",
      color: "#8b5cf6"
    }
  ];

  // Phase Renderers
  function renderHookPhase() {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '600px',
        padding: '48px 24px',
        textAlign: 'center',
      }}>
        {/* Premium badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          borderRadius: '9999px',
          marginBottom: '32px',
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            background: '#F59E0B',
            borderRadius: '50%',
          }} />
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#F59E0B', letterSpacing: '0.05em' }}>
            PHYSICS EXPLORATION
          </span>
        </div>

        {/* Main title */}
        <h1 style={{
          fontSize: isMobile ? '32px' : '42px',
          fontWeight: 700,
          marginBottom: '16px',
          background: 'linear-gradient(90deg, #FFFFFF 0%, #FEF3C7 50%, #FDE68A 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1.2,
        }}>
          Circuits & Ohm's Law
        </h1>

        <p style={{
          fontSize: '18px',
          color: '#94A3B8',
          maxWidth: '400px',
          marginBottom: '40px',
          lineHeight: 1.6,
        }}>
          Discover the fundamental relationship between voltage, current, and resistance
        </p>

        {/* Premium card with content */}
        <div style={{
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)',
          borderRadius: '24px',
          padding: '32px',
          maxWidth: '520px',
          width: '100%',
          border: '1px solid rgba(51, 65, 85, 0.5)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>⚡</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{
              fontSize: '20px',
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 500,
              lineHeight: 1.6,
            }}>
              Every time you flip a light switch, electricity flows through circuits.
            </p>
            <p style={{
              fontSize: '18px',
              color: '#94A3B8',
              lineHeight: 1.6,
            }}>
              But what controls how much electricity flows? What happens when you add more devices?
            </p>
            <p style={{
              fontSize: '16px',
              color: '#F59E0B',
              fontWeight: 600,
              paddingTop: '8px',
            }}>
              Discover the law that governs all electronics!
            </p>
          </div>
        </div>

        {/* Premium CTA button */}
        <button
          onClick={() => { goToPhase('predict'); }}
          style={{
            marginTop: '40px',
            padding: '20px 40px',
            background: 'linear-gradient(90deg, #F59E0B 0%, #CA8A04 100%)',
            color: 'white',
            fontSize: '18px',
            fontWeight: 600,
            borderRadius: '16px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.4)',
          }}
        >
          Start Exploring →
        </button>

        {/* Feature hints */}
        <div style={{
          marginTop: '48px',
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
          fontSize: '14px',
          color: '#64748B',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#F59E0B' }}>✦</span>
            Interactive Lab
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#F59E0B' }}>✦</span>
            Real-World Examples
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#F59E0B' }}>✦</span>
            Knowledge Test
          </div>
        </div>
      </div>
    );
  }

  function renderPredictPhase() {
    const predictions = [
      { id: 'direct', text: "Current increases when voltage increases (V and I are directly proportional)" },
      { id: 'inverse', text: "Current decreases when voltage increases (V and I are inversely proportional)" },
      { id: 'none', text: "Voltage doesn't affect current at all" },
      { id: 'complex', text: "The relationship is complex and unpredictable" },
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
            Make Your Prediction
          </h2>
          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
          }}>
            How does increasing voltage affect the current flowing through a resistor?
          </p>
        </div>

        {/* Static SVG diagram showing the circuit scenario */}
        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.lg,
          marginBottom: premiumDesign.spacing.lg,
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: 500,
          margin: '0 auto 24px',
        }}>
          <svg viewBox="0 0 300 180" style={{ width: '100%', maxHeight: 200, display: 'block' }}>
            <defs>
              <linearGradient id="predCopperWire" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#CD7F32" />
                <stop offset="50%" stopColor="#FFE4B5" />
                <stop offset="100%" stopColor="#CD7F32" />
              </linearGradient>
            </defs>
            {/* Background */}
            <rect width="100%" height="100%" fill="#1a1a2e" rx="8" />
            {/* Circuit wires */}
            <rect x="40" y="40" width="220" height="100" fill="none" stroke="url(#predCopperWire)" strokeWidth="3" rx="8" />
            {/* Battery */}
            <g transform="translate(25, 70)">
              <rect x="0" y="0" width="15" height="40" fill="#3A3A4A" stroke="#555" strokeWidth="1" rx="2" />
              <rect x="4" y="-3" width="7" height="4" fill="#FFD700" rx="1" />
              <text x="7" y="16" fill="#FFD700" fontSize="8" textAnchor="middle" fontWeight="bold">+</text>
              <text x="7" y="32" fill="#888" fontSize="8" textAnchor="middle">-</text>
            </g>
            {/* Battery label */}
            <text x="32" y="125" fill={premiumDesign.colors.voltage} fontSize="11" textAnchor="middle" fontWeight="bold">Battery</text>
            {/* Resistor */}
            <g transform="translate(115, 25)">
              <rect x="0" y="0" width="70" height="20" fill="#5A4A3A" stroke="#8B4513" strokeWidth="1" rx="3" />
              <rect x="10" y="2" width="5" height="16" fill="#8B4513" />
              <rect x="18" y="2" width="5" height="16" fill="#000" />
              <rect x="26" y="2" width="5" height="16" fill="#FF0000" />
              <rect x="34" y="2" width="5" height="16" fill="#FFD700" />
            </g>
            {/* Resistor label */}
            <text x="150" y="60" fill={premiumDesign.colors.resistance} fontSize="11" textAnchor="middle" fontWeight="bold">Resistor</text>
            {/* Light bulb */}
            <g transform="translate(140, 135)">
              <circle cx="10" cy="0" r="12" fill="rgba(200,200,200,0.3)" stroke="#888" strokeWidth="1" />
              <rect x="6" y="10" width="8" height="6" fill="#666" rx="1" />
            </g>
            {/* Bulb label */}
            <text x="150" y="165" fill={premiumDesign.colors.text.secondary} fontSize="10" textAnchor="middle">Bulb</text>
            {/* Question mark - what happens to current? */}
            <text x="240" y="95" fill={premiumDesign.colors.warning} fontSize="24" fontWeight="bold">?</text>
            <text x="240" y="110" fill={premiumDesign.colors.text.muted} fontSize="8" textAnchor="middle">Current</text>
            {/* Voltage label */}
            <text x="60" y="20" fill={premiumDesign.colors.voltage} fontSize="10" fontWeight="600">V = Voltage</text>
            {/* Current direction arrow */}
            <polygon points="200,38 210,42 200,46" fill={premiumDesign.colors.current} />
            <text x="195" y="55" fill={premiumDesign.colors.current} fontSize="9">I = ?</text>
          </svg>
          <p style={{ color: premiumDesign.colors.text.muted, fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
            Observe: A simple circuit with battery, resistor, and bulb
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
                  ? `2px solid ${premiumDesign.colors.voltage}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: prediction === p.id
                  ? 'rgba(251, 191, 36, 0.2)'
                  : premiumDesign.colors.background.tertiary,
                color: premiumDesign.colors.text.primary,
                fontSize: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
              }}
              onClick={() => {
                setPrediction(p.id);
              }}
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
            Ohm's Law Circuit Simulator
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary, lineHeight: 1.6 }}>
            Adjust voltage and resistance to see how current changes. This is important because Ohm's Law governs all electrical devices from smartphones to power grids, helping engineers design safe and efficient circuits.
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: premiumDesign.spacing.lg,
          flex: 1,
        }}>
          {/* Circuit Visualization */}
          <div style={{
            flex: 2,
            background: premiumDesign.colors.background.card,
            borderRadius: premiumDesign.radius.xl,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <svg viewBox="0 0 300 300" style={{ width: '100%', maxHeight: 350 }}>
              {/* Premium Defs - Gradients and Filters */}
              <defs>
                {/* Copper wire gradient */}
                <linearGradient id="circCopperWire" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#CD7F32" />
                  <stop offset="30%" stopColor="#F5C97F" />
                  <stop offset="50%" stopColor="#FFE4B5" />
                  <stop offset="70%" stopColor="#F5C97F" />
                  <stop offset="100%" stopColor="#CD7F32" />
                </linearGradient>

                {/* Copper wire active gradient */}
                <linearGradient id="circCopperWireActive" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#E8A040" />
                  <stop offset="30%" stopColor="#FFD890" />
                  <stop offset="50%" stopColor="#FFF0C8" />
                  <stop offset="70%" stopColor="#FFD890" />
                  <stop offset="100%" stopColor="#E8A040" />
                </linearGradient>

                {/* Battery gradient */}
                <linearGradient id="circBatteryBody" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3A3A4A" />
                  <stop offset="50%" stopColor="#4A4A5C" />
                  <stop offset="100%" stopColor="#2A2A3A" />
                </linearGradient>

                {/* Battery terminal gradient */}
                <linearGradient id="circBatteryTerminal" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFD700" />
                  <stop offset="50%" stopColor="#FFA500" />
                  <stop offset="100%" stopColor="#FF8C00" />
                </linearGradient>

                {/* Resistor body gradient */}
                <linearGradient id="circResistorBody" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#5A4A3A" />
                  <stop offset="30%" stopColor="#7A6A5A" />
                  <stop offset="70%" stopColor="#6A5A4A" />
                  <stop offset="100%" stopColor="#4A3A2A" />
                </linearGradient>

                {/* Bulb glass gradient */}
                <radialGradient id="circBulbGlass" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                  <stop offset="50%" stopColor="rgba(200,200,200,0.2)" />
                  <stop offset="100%" stopColor="rgba(100,100,100,0.1)" />
                </radialGradient>

                {/* Bulb glow gradient */}
                <radialGradient id="circBulbGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFFACD" />
                  <stop offset="40%" stopColor="#FFD700" />
                  <stop offset="70%" stopColor="#FFA500" />
                  <stop offset="100%" stopColor="rgba(255,165,0,0)" />
                </radialGradient>

                {/* Electron gradient */}
                <radialGradient id="circElectron" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#00BFFF" />
                  <stop offset="50%" stopColor="#1E90FF" />
                  <stop offset="100%" stopColor="#0066CC" />
                </radialGradient>

                {/* Electron glow filter */}
                <filter id="circElectronGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                {/* Bulb glow filter */}
                <filter id="circBulbGlowFilter" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                {/* Component shadow filter */}
                <filter id="circComponentShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.4" />
                </filter>

                {/* Wire glow when active */}
                <filter id="circWireGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Circuit wires - premium copper style */}
              <rect
                x="50" y="70" width="200" height="160"
                fill="none"
                stroke={isCircuitOn ? "url(#circCopperWireActive)" : "url(#circCopperWire)"}
                strokeWidth="4"
                rx="10"
                filter={isCircuitOn ? "url(#circWireGlow)" : undefined}
              />

              {/* Battery - 3D effect (absolute coords) */}
              <g filter="url(#circComponentShadow)">
                <rect x="30" y="130" width="20" height="50" fill="url(#circBatteryBody)" stroke="#555" strokeWidth="1" rx="3" />
                {/* Positive terminal */}
                <rect x="36" y="126" width="8" height="6" fill="url(#circBatteryTerminal)" rx="1" />
                {/* Terminal symbols */}
                <line x1="35" y1="145" x2="45" y2="145" stroke="url(#circBatteryTerminal)" strokeWidth="3" strokeLinecap="round" />
                <line x1="40" y1="140" x2="40" y2="150" stroke="url(#circBatteryTerminal)" strokeWidth="3" strokeLinecap="round" />
                <line x1="35" y1="165" x2="45" y2="165" stroke="#888" strokeWidth="2" strokeLinecap="round" />
              </g>

              {/* Resistor - 3D ceramic style (absolute coords) */}
              <g filter="url(#circComponentShadow)">
                <rect x="115" y="50" width="70" height="25" fill="url(#circResistorBody)" stroke="#8B4513" strokeWidth="1" rx="4" />
                {/* Color bands */}
                <rect x="127" y="52" width="6" height="21" fill="#8B4513" rx="1" />
                <rect x="137" y="52" width="6" height="21" fill="#000" rx="1" />
                <rect x="147" y="52" width="6" height="21" fill="#FF0000" rx="1" />
                <rect x="157" y="52" width="6" height="21" fill="#FFD700" rx="1" />
                {/* Highlight */}
                <rect x="120" y="53" width="60" height="3" fill="rgba(255,255,255,0.15)" rx="1" />
              </g>

              {/* Light bulb - premium glass effect (absolute coords) */}
              {/* Outer glow when on */}
              {isCircuitOn && (
                <circle
                  cx="150" cy="220" r="28"
                  fill={`rgba(255, 200, 50, ${Math.min(0.4, current / 10)})`}
                  filter="url(#circBulbGlowFilter)"
                />
              )}
              {/* Bulb base */}
              <rect x="142" y="232" width="16" height="10" fill="#666" rx="2" />
              <rect x="144" y="234" width="12" height="2" fill="#888" />
              <rect x="144" y="238" width="12" height="2" fill="#888" />
              {/* Bulb glass */}
              <circle
                cx="150" cy="220" r="18"
                fill={isCircuitOn ? "url(#circBulbGlow)" : "url(#circBulbGlass)"}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
                style={{ opacity: isCircuitOn ? Math.min(1, 0.3 + current / 4) : 1 }}
              />
              {/* Filament */}
              <path
                d="M145 220Q150 215 155 220"
                fill="none"
                stroke={isCircuitOn ? "#FFD700" : "#555"}
                strokeWidth="1.5"
                style={{ opacity: isCircuitOn ? 1 : 0.5 }}
              />
              {/* Light rays when on */}
              {isCircuitOn && current > 1 && (
                <g stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" opacity={Math.min(1, current / 5)}>
                  <line x1="142" y1="210" x2="136" y2="202" />
                  <line x1="150" y1="206" x2="150" y2="196" />
                  <line x1="158" y1="210" x2="164" y2="202" />
                  <line x1="162" y1="220" x2="170" y2="220" />
                  <line x1="138" y1="220" x2="130" y2="220" />
                </g>
              )}

              {/* Switch - improved visual (absolute coords) */}
              <circle cx="220" cy="135" r="6" fill={isCircuitOn ? "#22C55E" : "#666"} stroke={isCircuitOn ? "#16A34A" : "#444"} strokeWidth="2" />
              <line
                x1="220" y1="135"
                x2={isCircuitOn ? 250 : 240}
                y2={isCircuitOn ? 135 : 120}
                stroke={isCircuitOn ? "url(#circCopperWireActive)" : "url(#circCopperWire)"}
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="250" cy="135" r="6" fill={isCircuitOn ? "#22C55E" : "#666"} stroke={isCircuitOn ? "#16A34A" : "#444"} strokeWidth="2" />

              {/* Electrons - premium glow effect */}
              {isCircuitOn && electrons.map(e => {
                const pos = getElectronPosition(e.pathPosition);
                return (
                  <g key={e.id} filter="url(#circElectronGlow)">
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="5"
                      fill="url(#circElectron)"
                    />
                    <circle
                      cx={pos.x - 1}
                      cy={pos.y - 1}
                      r="1.5"
                      fill="rgba(255,255,255,0.7)"
                    />
                  </g>
                );
              })}

              {/* Component Labels */}
              <text x="40" y="168" fill={premiumDesign.colors.voltage} fontSize="11" fontWeight="bold">Battery</text>
              <text x="40" y="182" fill={premiumDesign.colors.voltage} fontSize="11">{voltage}V</text>
              <text x="130" y="40" fill={premiumDesign.colors.resistance} fontSize="11" fontWeight="bold">Resistor</text>
              <text x="200" y="40" fill={premiumDesign.colors.resistance} fontSize="11">{resistance}Ohm</text>
              <text x="135" y="265" fill={premiumDesign.colors.text.secondary} fontSize="11">Light Bulb</text>
              <text x="235" y="120" fill={premiumDesign.colors.success} fontSize="11">Switch</text>
              {isCircuitOn && <text x="100" y="135" fill={premiumDesign.colors.current} fontSize="11">Electrons</text>}
              {/* Dynamic current display */}
              <text x="150" y="285" fill={premiumDesign.colors.current} fontSize="11" textAnchor="middle">
                Current: {current.toFixed(2)}A
              </text>
            </svg>

            {/* Voltage/Current indicators moved outside SVG using typo system */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: typo.elementGap,
              padding: `0 ${typo.cardPadding}`,
            }}>
              <div style={{
                background: 'rgba(59, 130, 246, 0.15)',
                padding: typo.elementGap,
                borderRadius: premiumDesign.radius.md,
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}>
                <span style={{
                  color: premiumDesign.colors.current,
                  fontSize: typo.body,
                  fontWeight: 700
                }}>
                  I = {current.toFixed(2)}A
                </span>
                <span style={{
                  color: premiumDesign.colors.text.muted,
                  fontSize: typo.small,
                  marginLeft: '8px'
                }}>
                  Current
                </span>
              </div>
              <div style={{
                background: 'rgba(251, 191, 36, 0.15)',
                padding: typo.elementGap,
                borderRadius: premiumDesign.radius.md,
                border: '1px solid rgba(251, 191, 36, 0.3)',
              }}>
                <span style={{
                  color: premiumDesign.colors.voltage,
                  fontSize: typo.body,
                  fontWeight: 700
                }}>
                  V = I x R
                </span>
              </div>
            </div>

            {/* Ohm's Law formula - moved outside SVG */}
            <div style={{
              textAlign: 'center',
              marginTop: typo.elementGap,
              padding: typo.cardPadding,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: premiumDesign.radius.md,
            }}>
              <span style={{ color: 'white', fontSize: typo.body, fontWeight: 600 }}>
                {voltage}V = {current.toFixed(2)}A x {resistance}Ohm
              </span>
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
              <h4 style={{ color: premiumDesign.colors.voltage, marginBottom: premiumDesign.spacing.md }}>
                ⚡ Voltage: {voltage}V
              </h4>
              <input
                type="range"
                min="1"
                max="24"
                value={voltage}
                onChange={(e) => setVoltage(Number(e.target.value))}
                style={{ width: '100%', accentColor: premiumDesign.colors.voltage, touchAction: 'pan-y' as const }}
              />
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.resistance, marginBottom: premiumDesign.spacing.md }}>
                🔥 Resistance: {resistance}Ω
              </h4>
              <input
                type="range"
                min="1"
                max="20"
                value={resistance}
                onChange={(e) => setResistance(Number(e.target.value))}
                style={{ width: '100%', accentColor: premiumDesign.colors.resistance, touchAction: 'pan-y' as const }}
              />
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
            }}>
              <div style={{ color: premiumDesign.colors.text.muted, fontSize: '12px', marginBottom: 4 }}>
                Calculated Current
              </div>
              <div style={{ color: premiumDesign.colors.current, fontSize: '28px', fontWeight: 700 }}>
                {current.toFixed(2)} A
              </div>
            </div>

            {renderButton(
              isCircuitOn ? '🔴 Turn Off' : '🟢 Turn On',
              () => setIsCircuitOn(!isCircuitOn),
              isCircuitOn ? 'secondary' : 'success'
            )}

            <div style={{
              background: 'rgba(251, 191, 36, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(251, 191, 36, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '14px', margin: 0 }}>
                💡 Notice: When voltage ↑, current ↑. When resistance ↑, current ↓. This is Ohm's Law!
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
        title: "Ohm's Law: V = IR",
        content: "As you observed in your experiment, Ohm's Law states that Voltage (V) equals Current (I) times Resistance (R). You saw how changing voltage and resistance affects current flow - this simple equation governs all electrical circuits.",
        formula: "V = I × R, or I = V/R, or R = V/I",
      },
      {
        title: "Direct Proportionality",
        content: "Current is directly proportional to voltage. Double the voltage (with same resistance) and current doubles! This is because more 'electrical pressure' pushes more charge through.",
        formula: "I ∝ V (when R is constant)",
      },
      {
        title: "Inverse Proportionality",
        content: "Current is inversely proportional to resistance. Double the resistance (with same voltage) and current halves! More resistance means less current can flow through.",
        formula: "I ∝ 1/R (when V is constant)",
      },
      {
        title: "Your Prediction & Observation",
        content: prediction === 'direct'
          ? "Excellent! As you predicted and observed in the simulation, voltage and current are directly proportional. You saw that when you increased the voltage, the current increased proportionally - confirming your prediction was correct!"
          : "As you observed during your experiment, voltage and current are directly proportional (when resistance is constant). You saw that higher voltage pushes more current through the circuit. The result of your observation matches what Ohm's Law predicts!",
        formula: "I = V/R ⟹ More V = More I",
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
            📊 Understanding Ohm's Law
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
            color: premiumDesign.colors.voltage,
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
            background: 'rgba(251, 191, 36, 0.1)',
            borderRadius: premiumDesign.radius.md,
            padding: premiumDesign.spacing.md,
            fontFamily: 'monospace',
            color: premiumDesign.colors.voltage,
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
                    ? premiumDesign.colors.voltage
                    : premiumDesign.colors.background.tertiary,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onClick={() => {
                  setReviewStep(i);
                }}
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
      { id: 'series', text: "Series: total resistance is the sum of individual resistances" },
      { id: 'parallel_sum', text: "Parallel: total resistance is the sum of individual resistances" },
      { id: 'parallel_less', text: "Parallel: total resistance is LESS than any individual resistance" },
      { id: 'same', text: "Both series and parallel give the same total resistance" },
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
            The Twist: Series vs Parallel
          </h2>
          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
          }}>
            What happens when you connect two resistors in series vs parallel?
          </p>
        </div>

        {/* Static SVG diagram showing series vs parallel */}
        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.lg,
          marginBottom: premiumDesign.spacing.lg,
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: 600,
          margin: '0 auto 24px',
        }}>
          <svg viewBox="0 0 400 140" style={{ width: '100%', maxHeight: 160, display: 'block' }}>
            <rect width="100%" height="100%" fill="#1a1a2e" rx="8" />
            {/* Series circuit on left */}
            <text x="100" y="20" fill={premiumDesign.colors.text.primary} fontSize="12" textAnchor="middle" fontWeight="bold">SERIES</text>
            <rect x="20" y="40" width="160" height="60" fill="none" stroke="#CD7F32" strokeWidth="2" rx="4" />
            <rect x="50" y="55" width="30" height="15" fill="#5A4A3A" stroke="#8B4513" strokeWidth="1" />
            <text x="65" y="85" fill={premiumDesign.colors.resistance} fontSize="9" textAnchor="middle">R1</text>
            <rect x="110" y="55" width="30" height="15" fill="#5A4A3A" stroke="#8B4513" strokeWidth="1" />
            <text x="125" y="85" fill={premiumDesign.colors.resistance} fontSize="9" textAnchor="middle">R2</text>
            <text x="100" y="115" fill={premiumDesign.colors.text.muted} fontSize="10" textAnchor="middle">R_total = R1 + R2</text>

            {/* Parallel circuit on right */}
            <text x="300" y="20" fill={premiumDesign.colors.text.primary} fontSize="12" textAnchor="middle" fontWeight="bold">PARALLEL</text>
            <line x1="220" y1="50" x2="220" y2="90" stroke="#CD7F32" strokeWidth="2" />
            <line x1="380" y1="50" x2="380" y2="90" stroke="#CD7F32" strokeWidth="2" />
            <line x1="220" y1="50" x2="380" y2="50" stroke="#CD7F32" strokeWidth="2" />
            <line x1="220" y1="90" x2="380" y2="90" stroke="#CD7F32" strokeWidth="2" />
            <line x1="270" y1="50" x2="270" y2="90" stroke="#CD7F32" strokeWidth="1" />
            <line x1="330" y1="50" x2="330" y2="90" stroke="#CD7F32" strokeWidth="1" />
            <rect x="255" y="60" width="30" height="12" fill="#5A4A3A" stroke="#8B4513" strokeWidth="1" />
            <text x="270" y="85" fill={premiumDesign.colors.resistance} fontSize="9" textAnchor="middle">R1</text>
            <rect x="315" y="60" width="30" height="12" fill="#5A4A3A" stroke="#8B4513" strokeWidth="1" />
            <text x="330" y="85" fill={premiumDesign.colors.resistance} fontSize="9" textAnchor="middle">R2</text>
            <text x="300" y="115" fill={premiumDesign.colors.text.muted} fontSize="9" textAnchor="middle">1/R_total = 1/R1 + 1/R2</text>

            {/* Question mark */}
            <text x="200" y="75" fill={premiumDesign.colors.warning} fontSize="20" textAnchor="middle" fontWeight="bold">?</text>
          </svg>
          <p style={{ color: premiumDesign.colors.text.muted, fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
            Compare how resistors combine in different circuit configurations
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
              }}
              onClick={() => {
                setTwistPrediction(p.id);
              }}
            >
              {p.text}
            </button>
          ))}
        </div>

        {renderBottomBar(
          { text: '← Back', onClick: () => goToPhase('review') },
          {
            text: 'Test My Prediction →',
            onClick: goNext,
            disabled: !twistPrediction,
          }
        )}
      </div>
    );
  }

  function renderTwistPlayPhase() {
    const seriesVals = getSeriesValues();
    const parallelVals = getParallelValues();
    const vals = circuitType === 'series' ? seriesVals : parallelVals;

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
            🔌 Series vs Parallel Circuits
          </h2>
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Compare how resistors combine in different configurations
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: premiumDesign.spacing.lg,
          flex: 1,
        }}>
          {/* Circuit Visualization */}
          <div style={{
            flex: 2,
            background: premiumDesign.colors.background.card,
            borderRadius: premiumDesign.radius.xl,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <svg viewBox="0 0 300 220" style={{ width: '100%', maxHeight: 250 }}>
              {/* Premium Defs - Gradients and Filters */}
              <defs>
                {/* Copper wire gradient */}
                <linearGradient id="circTwistCopperWire" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#CD7F32" />
                  <stop offset="30%" stopColor="#F5C97F" />
                  <stop offset="50%" stopColor="#FFE4B5" />
                  <stop offset="70%" stopColor="#F5C97F" />
                  <stop offset="100%" stopColor="#CD7F32" />
                </linearGradient>

                {/* Copper wire horizontal gradient */}
                <linearGradient id="circTwistCopperWireH" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#CD7F32" />
                  <stop offset="30%" stopColor="#F5C97F" />
                  <stop offset="50%" stopColor="#FFE4B5" />
                  <stop offset="70%" stopColor="#F5C97F" />
                  <stop offset="100%" stopColor="#CD7F32" />
                </linearGradient>

                {/* Battery gradient */}
                <linearGradient id="circTwistBatteryBody" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3A3A4A" />
                  <stop offset="50%" stopColor="#4A4A5C" />
                  <stop offset="100%" stopColor="#2A2A3A" />
                </linearGradient>

                {/* Battery terminal gradient */}
                <linearGradient id="circTwistBatteryTerminal" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFD700" />
                  <stop offset="50%" stopColor="#FFA500" />
                  <stop offset="100%" stopColor="#FF8C00" />
                </linearGradient>

                {/* Resistor body gradient */}
                <linearGradient id="circTwistResistorBody" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#5A4A3A" />
                  <stop offset="30%" stopColor="#7A6A5A" />
                  <stop offset="70%" stopColor="#6A5A4A" />
                  <stop offset="100%" stopColor="#4A3A2A" />
                </linearGradient>

                {/* Component shadow filter */}
                <filter id="circTwistComponentShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="1" dy="1" stdDeviation="1.5" floodOpacity="0.4" />
                </filter>

                {/* Wire glow */}
                <filter id="circTwistWireGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                {/* Current flow animation gradient */}
                <linearGradient id="circTwistCurrentFlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(59, 130, 246, 0)">
                    <animate attributeName="offset" values="0;1" dur="1.5s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="20%" stopColor="rgba(59, 130, 246, 0.8)">
                    <animate attributeName="offset" values="0.2;1.2" dur="1.5s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="40%" stopColor="rgba(59, 130, 246, 0)">
                    <animate attributeName="offset" values="0.4;1.4" dur="1.5s" repeatCount="indefinite" />
                  </stop>
                </linearGradient>

                {/* Junction node gradient */}
                <radialGradient id="circTwistJunction" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#FFE4B5" />
                  <stop offset="50%" stopColor="#CD7F32" />
                  <stop offset="100%" stopColor="#8B5A2B" />
                </radialGradient>
              </defs>

              {circuitType === 'series' ? (
                // Series circuit - premium version
                <g>
                  {/* Main circuit loop - copper wire */}
                  <rect
                    x="40" y="50" width="220" height="120"
                    fill="none"
                    stroke="url(#circTwistCopperWire)"
                    strokeWidth="4"
                    rx="10"
                    filter="url(#circTwistWireGlow)"
                  />

                  {/* Battery - 3D style */}
                  <g transform="translate(20, 90)" filter="url(#circTwistComponentShadow)">
                    <rect x="0" y="0" width="20" height="40" fill="url(#circTwistBatteryBody)" stroke="#555" strokeWidth="1" rx="3" />
                    <rect x="6" y="-4" width="8" height="5" fill="url(#circTwistBatteryTerminal)" rx="1" />
                    <line x1="5" y1="13" x2="15" y2="13" stroke="url(#circTwistBatteryTerminal)" strokeWidth="3" strokeLinecap="round" />
                    <line x1="10" y1="8" x2="10" y2="18" stroke="url(#circTwistBatteryTerminal)" strokeWidth="3" strokeLinecap="round" />
                    <line x1="5" y1="27" x2="15" y2="27" stroke="#888" strokeWidth="2" strokeLinecap="round" />
                  </g>

                  {/* Resistor 1 - premium ceramic style */}
                  <g transform="translate(80, 32)" filter="url(#circTwistComponentShadow)">
                    <rect x="0" y="0" width="50" height="20" fill="url(#circTwistResistorBody)" stroke="#8B4513" strokeWidth="1" rx="4" />
                    <rect x="8" y="2" width="5" height="16" fill="#8B4513" rx="1" />
                    <rect x="16" y="2" width="5" height="16" fill="#000" rx="1" />
                    <rect x="24" y="2" width="5" height="16" fill="#FF0000" rx="1" />
                    <rect x="32" y="2" width="5" height="16" fill="#FFD700" rx="1" />
                    <rect x="4" y="3" width="42" height="2" fill="rgba(255,255,255,0.12)" rx="1" />
                  </g>

                  {/* Resistor 2 - premium ceramic style */}
                  <g transform="translate(170, 32)" filter="url(#circTwistComponentShadow)">
                    <rect x="0" y="0" width="50" height="20" fill="url(#circTwistResistorBody)" stroke="#8B4513" strokeWidth="1" rx="4" />
                    <rect x="8" y="2" width="5" height="16" fill="#8B4513" rx="1" />
                    <rect x="16" y="2" width="5" height="16" fill="#000" rx="1" />
                    <rect x="24" y="2" width="5" height="16" fill="#FF0000" rx="1" />
                    <rect x="32" y="2" width="5" height="16" fill="#FFD700" rx="1" />
                    <rect x="4" y="3" width="42" height="2" fill="rgba(255,255,255,0.12)" rx="1" />
                  </g>

                  {/* Current flow indicators - arrows on wire */}
                  <polygon points="145,46 155,50 145,54" fill={premiumDesign.colors.current} opacity="0.8">
                    <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1s" repeatCount="indefinite" />
                  </polygon>
                  <polygon points="145,166 155,170 145,174" fill={premiumDesign.colors.current} opacity="0.8">
                    <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1s" repeatCount="indefinite" begin="0.3s" />
                  </polygon>
                </g>
              ) : (
                // Parallel circuit - premium version
                <g>
                  {/* Main vertical wires - copper style */}
                  <line x1="40" y1="50" x2="40" y2="170" stroke="url(#circTwistCopperWire)" strokeWidth="4" strokeLinecap="round" filter="url(#circTwistWireGlow)" />
                  <line x1="260" y1="50" x2="260" y2="170" stroke="url(#circTwistCopperWire)" strokeWidth="4" strokeLinecap="round" filter="url(#circTwistWireGlow)" />

                  {/* Main horizontal wires */}
                  <line x1="40" y1="50" x2="260" y2="50" stroke="url(#circTwistCopperWireH)" strokeWidth="4" strokeLinecap="round" filter="url(#circTwistWireGlow)" />
                  <line x1="40" y1="170" x2="260" y2="170" stroke="url(#circTwistCopperWireH)" strokeWidth="4" strokeLinecap="round" filter="url(#circTwistWireGlow)" />

                  {/* Branch wires with junction nodes */}
                  <line x1="100" y1="50" x2="100" y2="80" stroke="url(#circTwistCopperWire)" strokeWidth="3" />
                  <line x1="100" y1="120" x2="100" y2="170" stroke="url(#circTwistCopperWire)" strokeWidth="3" />
                  <line x1="200" y1="50" x2="200" y2="80" stroke="url(#circTwistCopperWire)" strokeWidth="3" />
                  <line x1="200" y1="120" x2="200" y2="170" stroke="url(#circTwistCopperWire)" strokeWidth="3" />

                  {/* Junction nodes */}
                  <circle cx="100" cy="50" r="5" fill="url(#circTwistJunction)" />
                  <circle cx="200" cy="50" r="5" fill="url(#circTwistJunction)" />
                  <circle cx="100" cy="170" r="5" fill="url(#circTwistJunction)" />
                  <circle cx="200" cy="170" r="5" fill="url(#circTwistJunction)" />

                  {/* Battery - 3D style */}
                  <g transform="translate(20, 90)" filter="url(#circTwistComponentShadow)">
                    <rect x="0" y="0" width="20" height="40" fill="url(#circTwistBatteryBody)" stroke="#555" strokeWidth="1" rx="3" />
                    <rect x="6" y="-4" width="8" height="5" fill="url(#circTwistBatteryTerminal)" rx="1" />
                    <line x1="5" y1="13" x2="15" y2="13" stroke="url(#circTwistBatteryTerminal)" strokeWidth="3" strokeLinecap="round" />
                    <line x1="10" y1="8" x2="10" y2="18" stroke="url(#circTwistBatteryTerminal)" strokeWidth="3" strokeLinecap="round" />
                    <line x1="5" y1="27" x2="15" y2="27" stroke="#888" strokeWidth="2" strokeLinecap="round" />
                  </g>

                  {/* Resistor 1 - premium ceramic style */}
                  <g transform="translate(75, 80)" filter="url(#circTwistComponentShadow)">
                    <rect x="0" y="0" width="50" height="20" fill="url(#circTwistResistorBody)" stroke="#8B4513" strokeWidth="1" rx="4" />
                    <rect x="8" y="2" width="5" height="16" fill="#8B4513" rx="1" />
                    <rect x="16" y="2" width="5" height="16" fill="#000" rx="1" />
                    <rect x="24" y="2" width="5" height="16" fill="#FF0000" rx="1" />
                    <rect x="32" y="2" width="5" height="16" fill="#FFD700" rx="1" />
                    <rect x="4" y="3" width="42" height="2" fill="rgba(255,255,255,0.12)" rx="1" />
                  </g>

                  {/* Resistor 2 - premium ceramic style */}
                  <g transform="translate(175, 80)" filter="url(#circTwistComponentShadow)">
                    <rect x="0" y="0" width="50" height="20" fill="url(#circTwistResistorBody)" stroke="#8B4513" strokeWidth="1" rx="4" />
                    <rect x="8" y="2" width="5" height="16" fill="#8B4513" rx="1" />
                    <rect x="16" y="2" width="5" height="16" fill="#000" rx="1" />
                    <rect x="24" y="2" width="5" height="16" fill="#FF0000" rx="1" />
                    <rect x="32" y="2" width="5" height="16" fill="#FFD700" rx="1" />
                    <rect x="4" y="3" width="42" height="2" fill="rgba(255,255,255,0.12)" rx="1" />
                  </g>

                  {/* Current flow arrows - showing split */}
                  <polygon points="95,65 100,55 105,65" fill={premiumDesign.colors.current} opacity="0.8">
                    <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1s" repeatCount="indefinite" />
                  </polygon>
                  <polygon points="195,65 200,55 205,65" fill={premiumDesign.colors.current} opacity="0.8">
                    <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1s" repeatCount="indefinite" begin="0.2s" />
                  </polygon>
                  <polygon points="95,155 100,165 105,155" fill={premiumDesign.colors.current} opacity="0.8">
                    <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1s" repeatCount="indefinite" begin="0.5s" />
                  </polygon>
                  <polygon points="195,155 200,165 205,155" fill={premiumDesign.colors.current} opacity="0.8">
                    <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1s" repeatCount="indefinite" begin="0.7s" />
                  </polygon>

                  {/* Dynamic labels inside SVG */}
                  <text x="100" y="115" fill={premiumDesign.colors.resistance} fontSize="9" textAnchor="middle">R1: {r1}Ohm</text>
                  <text x="200" y="115" fill={premiumDesign.colors.resistance} fontSize="9" textAnchor="middle">R2: {r2}Ohm</text>
                  <text x="150" y="200" fill={premiumDesign.colors.current} fontSize="10" textAnchor="middle">
                    Total: {parallelVals.totalR.toFixed(2)}Ohm
                  </text>
                </g>
              )}

              {/* Common dynamic labels for both circuit types */}
              {circuitType === 'series' && (
                <g>
                  <text x="105" y="55" fill={premiumDesign.colors.resistance} fontSize="9" textAnchor="middle">R1: {r1}Ohm</text>
                  <text x="195" y="55" fill={premiumDesign.colors.resistance} fontSize="9" textAnchor="middle">R2: {r2}Ohm</text>
                  <text x="150" y="195" fill={premiumDesign.colors.current} fontSize="10" textAnchor="middle">
                    Total: {seriesVals.totalR}Ohm
                  </text>
                </g>
              )}
            </svg>

            {/* Labels moved outside SVG using typo system */}
            <div style={{
              textAlign: 'center',
              marginTop: typo.elementGap,
              padding: typo.cardPadding,
              background: circuitType === 'series' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(139, 92, 246, 0.1)',
              borderRadius: premiumDesign.radius.md,
              border: `1px solid ${circuitType === 'series' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
            }}>
              <div style={{ color: 'white', fontSize: typo.heading, fontWeight: 700, marginBottom: '4px' }}>
                {circuitType === 'series' ? 'SERIES' : 'PARALLEL'}
              </div>
              <div style={{ color: premiumDesign.colors.text.secondary, fontSize: typo.small }}>
                {circuitType === 'series'
                  ? `R_total = R1 + R2 = ${seriesVals.totalR}Ohm`
                  : `1/R_total = 1/R1 + 1/R2 -> R_total = ${parallelVals.totalR.toFixed(2)}Ohm`
                }
              </div>
            </div>

            {/* Voltage/Current indicators */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-around',
              marginTop: typo.elementGap,
              gap: typo.elementGap,
            }}>
              <div style={{
                flex: 1,
                background: 'rgba(251, 191, 36, 0.12)',
                padding: typo.elementGap,
                borderRadius: premiumDesign.radius.md,
                textAlign: 'center',
                border: '1px solid rgba(251, 191, 36, 0.25)',
              }}>
                <div style={{ color: premiumDesign.colors.voltage, fontSize: typo.label, fontWeight: 600 }}>
                  {circuitType === 'series' ? `V1=${seriesVals.v1.toFixed(1)}V` : `V=${twistVoltage}V`}
                </div>
                <div style={{ color: premiumDesign.colors.text.muted, fontSize: typo.label }}>
                  {circuitType === 'series' ? 'R1 Voltage' : 'Same across both'}
                </div>
              </div>
              <div style={{
                flex: 1,
                background: 'rgba(59, 130, 246, 0.12)',
                padding: typo.elementGap,
                borderRadius: premiumDesign.radius.md,
                textAlign: 'center',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}>
                <div style={{ color: premiumDesign.colors.current, fontSize: typo.label, fontWeight: 600 }}>
                  {circuitType === 'series'
                    ? `I=${seriesVals.i.toFixed(2)}A`
                    : `I1=${parallelVals.i1.toFixed(2)}A`
                  }
                </div>
                <div style={{ color: premiumDesign.colors.text.muted, fontSize: typo.label }}>
                  {circuitType === 'series' ? 'Same through both' : 'Branch 1'}
                </div>
              </div>
              {circuitType === 'series' ? (
                <div style={{
                  flex: 1,
                  background: 'rgba(251, 191, 36, 0.12)',
                  padding: typo.elementGap,
                  borderRadius: premiumDesign.radius.md,
                  textAlign: 'center',
                  border: '1px solid rgba(251, 191, 36, 0.25)',
                }}>
                  <div style={{ color: premiumDesign.colors.voltage, fontSize: typo.label, fontWeight: 600 }}>
                    V2={seriesVals.v2.toFixed(1)}V
                  </div>
                  <div style={{ color: premiumDesign.colors.text.muted, fontSize: typo.label }}>
                    R2 Voltage
                  </div>
                </div>
              ) : (
                <div style={{
                  flex: 1,
                  background: 'rgba(59, 130, 246, 0.12)',
                  padding: typo.elementGap,
                  borderRadius: premiumDesign.radius.md,
                  textAlign: 'center',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                }}>
                  <div style={{ color: premiumDesign.colors.current, fontSize: typo.label, fontWeight: 600 }}>
                    I2={parallelVals.i2.toFixed(2)}A
                  </div>
                  <div style={{ color: premiumDesign.colors.text.muted, fontSize: typo.label }}>
                    Branch 2
                  </div>
                </div>
              )}
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
              <h4 style={{ color: premiumDesign.colors.text.primary, marginBottom: premiumDesign.spacing.md }}>
                Circuit Type
              </h4>
              <div style={{ display: 'flex', gap: premiumDesign.spacing.sm }}>
                {(['series', 'parallel'] as const).map(type => (
                  <button
                    key={type}
                    style={{
                      flex: 1,
                      padding: premiumDesign.spacing.md,
                      borderRadius: premiumDesign.radius.md,
                      border: circuitType === type ? `2px solid ${premiumDesign.colors.secondary}` : '1px solid rgba(255,255,255,0.1)',
                      background: circuitType === type ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                      color: premiumDesign.colors.text.primary,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                    onClick={() => {
                      setCircuitType(type);
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.resistance, marginBottom: premiumDesign.spacing.sm }}>
                R₁: {r1}Ω
              </h4>
              <input
                type="range"
                min="1"
                max="10"
                value={r1}
                onChange={(e) => setR1(Number(e.target.value))}
                style={{ width: '100%', accentColor: premiumDesign.colors.resistance, touchAction: 'pan-y' as const }}
              />
              <h4 style={{ color: premiumDesign.colors.resistance, marginBottom: premiumDesign.spacing.sm, marginTop: premiumDesign.spacing.md }}>
                R₂: {r2}Ω
              </h4>
              <input
                type="range"
                min="1"
                max="10"
                value={r2}
                onChange={(e) => setR2(Number(e.target.value))}
                style={{ width: '100%', accentColor: premiumDesign.colors.resistance, touchAction: 'pan-y' as const }}
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
                Total Resistance
              </div>
              <div style={{ color: premiumDesign.colors.resistance, fontSize: '24px', fontWeight: 700 }}>
                {vals.totalR.toFixed(2)} Ω
              </div>
              <div style={{ color: premiumDesign.colors.text.muted, fontSize: '11px', marginTop: 4 }}>
                {circuitType === 'series'
                  ? `R₁ + R₂ = ${r1} + ${r2} = ${seriesVals.totalR}Ω`
                  : `(R₁×R₂)/(R₁+R₂) = ${parallelVals.totalR.toFixed(2)}Ω`
                }
              </div>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              padding: premiumDesign.spacing.md,
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.text.secondary, fontSize: '14px', margin: 0 }}>
                💡 Notice: Parallel resistance ({parallelVals.totalR.toFixed(2)}Ω) is always LESS than the smallest resistor ({Math.min(r1, r2)}Ω)!
              </p>
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
        title: "Series: Resistances Add Up",
        content: "In series, current has only ONE path and must flow through BOTH resistors. Total resistance is simply the sum: R_total = R₁ + R₂. The same current flows through everything!",
        highlight: twistPrediction === 'series'
          ? "You correctly identified how series resistance works!"
          : "",
      },
      {
        title: "Parallel: Less Than the Smallest!",
        content: "In parallel, current has MULTIPLE paths and can split between them. More paths = easier flow = LESS total resistance! It's always less than the smallest individual resistor.",
        highlight: twistPrediction === 'parallel_less'
          ? "You correctly predicted that parallel resistance is less than any individual resistance!"
          : "The key insight is that parallel resistance is LESS than any individual resistance because current has multiple paths to take.",
      },
      {
        title: "Why It Matters",
        content: "Series is used when you want components to share the same current (like string lights). Parallel is used when you want components to operate independently and get full voltage (like home outlets).",
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
            🔍 Circuit Analysis
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
              background: (twistPrediction === 'series' || twistPrediction === 'parallel_less')
                ? 'rgba(16, 185, 129, 0.2)'
                : 'rgba(239, 68, 68, 0.2)',
              borderRadius: premiumDesign.radius.md,
              padding: premiumDesign.spacing.md,
              marginTop: premiumDesign.spacing.md,
              border: `1px solid ${(twistPrediction === 'series' || twistPrediction === 'parallel_less') ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
            }}>
              <p style={{
                color: (twistPrediction === 'series' || twistPrediction === 'parallel_less') ? premiumDesign.colors.success : '#EF4444',
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
                }}
                onClick={() => {
                  setTwistReviewStep(i);
                }}
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
        title: "🏠 Home Electrical Systems",
        description: "Your home uses parallel circuits so each outlet operates independently at 120V (or 240V in some countries). This is why when one light burns out, the others stay on - current has multiple paths to flow through. Circuit breakers protect against excessive current by automatically disconnecting when current exceeds safe levels, preventing wire overheating and fires. The same Ohm's Law principles you explored in the simulation govern every electrical device in your home, from your refrigerator to your phone charger. Understanding these concepts helps electricians safely design home wiring systems.",
        fact: "A typical US home has 100-200 amp service capacity. Using Ohm's Law (P = VI), a 200A service at 240V provides up to 48,000 watts - enough to power everything from lights to air conditioners simultaneously!",
      },
      {
        title: "🔋 Electric Vehicles",
        description: "EV batteries combine thousands of individual lithium cells in both series and parallel configurations. Series connections increase voltage (for power delivery), while parallel connections increase capacity (for driving range). Battery management systems continuously monitor voltage, current, and temperature of each cell using Ohm's Law principles to balance charging and prevent dangerous conditions. The same relationship between voltage, current, and resistance you explored in our simulation is critical for designing efficient and safe EV powertrains.",
        fact: "A Tesla Model S battery pack contains over 7,000 individual lithium cells arranged in a complex series-parallel configuration. The pack operates at 400V and can deliver over 500 amps during acceleration!",
      },
      {
        title: "💻 Computer Processors",
        description: "Modern computer chips contain billions of tiny transistors - essentially microscopic switches that follow Ohm's Law. Each transistor controls current flow through tiny channels, representing binary data (1s and 0s). Engineers must carefully manage power delivery because excessive current causes overheating. The same V = IR relationship you explored governs chip design: lower resistance means higher current and more heat. Advanced processors use multiple voltage domains and dynamic frequency scaling to balance performance and power consumption.",
        fact: "A modern CPU can have over 50 billion transistors, each switching billions of times per second. Despite this, power consumption stays manageable because each transistor operates at very low voltages (0.5-1.2V) with minimal current.",
      },
      {
        title: "🔌 USB & Charging",
        description: "USB chargers must provide specific voltages and currents to safely charge your devices. Fast charging technology works by either increasing current (more amps through the cable) or increasing voltage (Power Delivery). The same Ohm's Law principles you explored determine how quickly energy transfers from the charger to your device's battery. Higher voltage means lower current for the same power, which reduces cable heating. Modern USB-C Power Delivery negotiates the optimal voltage and current between charger and device automatically.",
        fact: "USB-C Power Delivery can supply up to 240W of power - enough to charge laptops! At 48V × 5A, this is a direct application of P = VI, the power formula derived from Ohm's Law.",
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
            🌍 Circuits in the Real World
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
                  ? `2px solid ${premiumDesign.colors.voltage}`
                  : '2px solid rgba(255,255,255,0.1)',
                background: activeApp === index
                  ? 'rgba(251, 191, 36, 0.2)'
                  : completedApps.has(index)
                    ? 'rgba(16, 185, 129, 0.2)'
                    : premiumDesign.colors.background.tertiary,
                color: premiumDesign.colors.text.primary,
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.3s ease',
              }}
              onClick={() => {
                setActiveApp(index);
              }}
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
            background: 'rgba(251, 191, 36, 0.1)',
            borderRadius: premiumDesign.radius.lg,
            padding: premiumDesign.spacing.lg,
            border: '1px solid rgba(251, 191, 36, 0.3)',
          }}>
            <p style={{ margin: 0, color: premiumDesign.colors.voltage, fontWeight: 600 }}>
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
              }}
              onClick={() => {
                const newCompleted = new Set(completedApps);
                newCompleted.add(activeApp);
                setCompletedApps(newCompleted);
                if (activeApp < applications.length - 1) {
                  setActiveApp(activeApp + 1);
                }
              }}
            >
              Got It - Continue →
            </button>
          ) : (
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
              }}
              onClick={() => {
                if (activeApp < applications.length - 1) {
                  setActiveApp(activeApp + 1);
                }
              }}
            >
              Next Application →
            </button>
          )}
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
              background: passed ? premiumDesign.colors.gradient.circuit : 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
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
                ? 'You have mastered electrical circuits!'
                : 'Review the material and try again.'}
            </p>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              {!passed && (
                <button
                  onClick={() => {
                    setTestComplete(false);
                    setCurrentQuestion(0);
                    setTestScore(0);
                    setSelectedAnswer(null);
                    setShowExplanation(false);
                  }}
                  style={{
                    padding: '16px 32px',
                    borderRadius: premiumDesign.radius.lg,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: premiumDesign.colors.background.tertiary,
                    color: premiumDesign.colors.text.primary,
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Replay Quiz
                </button>
              )}
              {renderButton(
                passed ? 'Complete Lesson →' : 'Return to Dashboard',
                () => {
                  if (passed) {
                    goNext();
                  } else {
                    goToPhase('review');
                  }
                },
                passed ? 'success' : 'primary'
              )}
            </div>
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
          <span style={{ color: premiumDesign.colors.voltage, fontWeight: 600 }}>
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
          {/* Scenario context */}
          <div style={{
            background: 'rgba(99, 102, 241, 0.1)',
            borderRadius: premiumDesign.radius.md,
            padding: premiumDesign.spacing.md,
            marginBottom: premiumDesign.spacing.lg,
            border: '1px solid rgba(99, 102, 241, 0.2)',
          }}>
            <p style={{
              color: premiumDesign.colors.text.secondary,
              fontSize: '14px',
              margin: 0,
              lineHeight: 1.6,
            }}>
              {question.scenario}
            </p>
          </div>

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
              // Determine the border color based on state
              let borderColor = 'rgba(255,255,255,0.1)';
              let background = premiumDesign.colors.background.tertiary;

              if (showExplanation) {
                if (option.correct) {
                  background = 'rgba(16, 185, 129, 0.2)';
                  borderColor = premiumDesign.colors.success;
                } else if (index === selectedAnswer && !option.correct) {
                  background = 'rgba(239, 68, 68, 0.2)';
                  borderColor = '#EF4444';
                }
              } else if (selectedAnswer === index) {
                borderColor = premiumDesign.colors.voltage;
                background = 'rgba(251, 191, 36, 0.2)';
              }

              const buttonStyle: React.CSSProperties = {
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: borderColor,
                background: background,
                color: premiumDesign.colors.text.primary,
                fontSize: '16px',
                cursor: showExplanation ? 'default' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
              };

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
                  {String.fromCharCode(65 + index)}) {option.label}
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div style={{
              marginTop: premiumDesign.spacing.xl,
              padding: premiumDesign.spacing.lg,
              background: 'rgba(251, 191, 36, 0.1)',
              borderRadius: premiumDesign.radius.lg,
              border: '1px solid rgba(251, 191, 36, 0.3)',
            }}>
              <p style={{ color: premiumDesign.colors.voltage, fontWeight: 600, marginBottom: premiumDesign.spacing.sm }}>
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
                if (selectedAnswer !== null && question.options[selectedAnswer]?.correct) {
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
          background: premiumDesign.colors.gradient.circuit,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: premiumDesign.spacing.lg,
        }}>
          Circuit Master!
        </h1>

        <p style={{
          fontSize: '18px',
          color: premiumDesign.colors.text.secondary,
          maxWidth: 500,
          lineHeight: 1.7,
          marginBottom: premiumDesign.spacing.xl,
        }}>
          You now understand Ohm's Law and how voltage, current, and resistance work together in circuits. You can analyze both series and parallel configurations!
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
          <h3 style={{ color: premiumDesign.colors.voltage, marginBottom: premiumDesign.spacing.md }}>
            Key Concepts Mastered
          </h3>
          <ul style={{
            textAlign: 'left',
            color: premiumDesign.colors.text.secondary,
            lineHeight: 2,
            paddingLeft: premiumDesign.spacing.lg,
          }}>
            <li>Ohm's Law: V = IR</li>
            <li>Series: R_total = R₁ + R₂ + ...</li>
            <li>Parallel: 1/R_total = 1/R₁ + 1/R₂ + ...</li>
            <li>Power: P = V × I</li>
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
    <div style={{
      minHeight: '100dvh',
      background: '#0a0f1a',
      color: 'white',
      position: 'relative',
      overflowY: 'auto',
      overflowX: 'hidden',
      flex: 1,
    }}>
      {/* Premium background gradient */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, #0f172a 0%, #0a1628 50%, #0f172a 100%)',
        zIndex: 0,
      }} />

      {/* Header - Fixed Navigation */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Circuits & Ohm's Law</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => { goToPhase(p); }}
                style={{
                  height: '8px',
                  width: phase === p ? '24px' : '8px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: phase === p
                    ? '#F59E0B'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? '#10B981'
                      : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: phase === p ? '0 0 12px rgba(245, 158, 11, 0.4)' : 'none',
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#F59E0B' }}>{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        position: 'relative',
        paddingTop: '64px',
        paddingBottom: '48px',
        maxWidth: '900px',
        margin: '0 auto',
        padding: '64px 16px 48px',
        overflowY: 'auto',
        zIndex: 1,
      }}>
        {phase === 'hook' && renderHookPhase()}
        {phase === 'predict' && renderPredictPhase()}
        {phase === 'play' && renderPlayPhase()}
        {phase === 'review' && renderReviewPhase()}
        {phase === 'twist_predict' && renderTwistPredictPhase()}
        {phase === 'twist_play' && renderTwistPlayPhase()}
        {phase === 'twist_review' && renderTwistReviewPhase()}
        {phase === 'transfer' && (
          <TransferPhaseView
            conceptName="Circuits"
            applications={realWorldApps}
            onComplete={() => goToPhase('test')}
            isMobile={isMobile}
            colors={colors}
            typo={typo}
            playSound={playSound}
          />
        )}
        {phase === 'test' && renderTestPhase()}
        {phase === 'mastery' && renderMasteryPhase()}
      </div>
    </div>
  );
}
