'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

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
  'play': 'Lab',
  'review': 'Review',
  'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Lab',
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
  const [isMobile, setIsMobile] = useState(false);

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
      <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
        {/* Premium badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-8">
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-amber-400 tracking-wide">PHYSICS EXPLORATION</span>
        </div>

        {/* Main title with gradient */}
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-amber-100 to-yellow-200 bg-clip-text text-transparent">
          Circuits & Ohm's Law
        </h1>

        <p className="text-lg text-slate-400 max-w-md mb-10">
          Discover the fundamental relationship between voltage, current, and resistance
        </p>

        {/* Premium card with content */}
        <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-yellow-500/5 rounded-3xl" />

          <div className="relative">
            <div className="text-6xl mb-6">⚡</div>

            <div className="space-y-4">
              <p className="text-xl text-white/90 font-medium leading-relaxed">
                Every time you flip a light switch, electricity flows through circuits.
              </p>
              <p className="text-lg text-slate-400 leading-relaxed">
                But what controls how much electricity flows? What happens when you add more devices?
              </p>
              <div className="pt-2">
                <p className="text-base text-amber-400 font-semibold">
                  Discover the law that governs all electronics!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Premium CTA button */}
        <button
          onClick={() => { goToPhase('predict'); }}
          className="mt-10 group relative px-10 py-5 bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="relative z-10 flex items-center gap-3">
            Explore Ohm's Law
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>

        {/* Feature hints */}
        <div className="mt-12 flex items-center gap-8 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">✦</span>
            Interactive Lab
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">✦</span>
            Real-World Examples
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400">✦</span>
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
            🤔 Make Your Prediction
          </h2>
          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
          }}>
            How does increasing voltage affect the current flowing through a resistor?
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
          <p style={{ color: premiumDesign.colors.text.secondary }}>
            Adjust voltage and resistance to see how current changes
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

              {/* Battery - 3D effect */}
              <g transform="translate(30, 130)" filter="url(#circComponentShadow)">
                <rect x="0" y="0" width="20" height="50" fill="url(#circBatteryBody)" stroke="#555" strokeWidth="1" rx="3" />
                {/* Positive terminal */}
                <rect x="6" y="-4" width="8" height="6" fill="url(#circBatteryTerminal)" rx="1" />
                {/* Terminal symbols */}
                <line x1="5" y1="15" x2="15" y2="15" stroke="url(#circBatteryTerminal)" strokeWidth="3" strokeLinecap="round" />
                <line x1="10" y1="10" x2="10" y2="20" stroke="url(#circBatteryTerminal)" strokeWidth="3" strokeLinecap="round" />
                <line x1="5" y1="35" x2="15" y2="35" stroke="#888" strokeWidth="2" strokeLinecap="round" />
              </g>

              {/* Resistor - 3D ceramic style */}
              <g transform="translate(115, 50)" filter="url(#circComponentShadow)">
                <rect x="0" y="0" width="70" height="25" fill="url(#circResistorBody)" stroke="#8B4513" strokeWidth="1" rx="4" />
                {/* Color bands */}
                <rect x="12" y="2" width="6" height="21" fill="#8B4513" rx="1" />
                <rect x="22" y="2" width="6" height="21" fill="#000" rx="1" />
                <rect x="32" y="2" width="6" height="21" fill="#FF0000" rx="1" />
                <rect x="42" y="2" width="6" height="21" fill="#FFD700" rx="1" />
                {/* Highlight */}
                <rect x="5" y="3" width="60" height="3" fill="rgba(255,255,255,0.15)" rx="1" />
                {/* Zigzag heat pattern */}
                <polyline points="10,12.5 20,5 30,20 40,5 50,20 60,12.5" fill="none" stroke="rgba(255,100,50,0.4)" strokeWidth="1.5" />
              </g>

              {/* Light bulb - premium glass effect */}
              <g transform="translate(130, 220)">
                {/* Outer glow when on */}
                {isCircuitOn && (
                  <circle
                    cx="20" cy="0" r="28"
                    fill={`rgba(255, 200, 50, ${Math.min(0.4, current / 10)})`}
                    filter="url(#circBulbGlowFilter)"
                  />
                )}
                {/* Bulb base */}
                <rect x="12" y="12" width="16" height="10" fill="#666" rx="2" />
                <rect x="14" y="14" width="12" height="2" fill="#888" />
                <rect x="14" y="18" width="12" height="2" fill="#888" />
                {/* Bulb glass */}
                <circle
                  cx="20" cy="0" r="18"
                  fill={isCircuitOn ? "url(#circBulbGlow)" : "url(#circBulbGlass)"}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1"
                  style={{ opacity: isCircuitOn ? Math.min(1, 0.3 + current / 4) : 1 }}
                />
                {/* Filament */}
                <path
                  d="M 15 0 Q 17 -5 20 0 Q 23 5 25 0"
                  fill="none"
                  stroke={isCircuitOn ? "#FFD700" : "#555"}
                  strokeWidth="1.5"
                  style={{ opacity: isCircuitOn ? 1 : 0.5 }}
                />
                {/* Light rays when on */}
                {isCircuitOn && current > 1 && (
                  <g stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" opacity={Math.min(1, current / 5)}>
                    <line x1="12" y1="-10" x2="6" y2="-18" />
                    <line x1="20" y1="-14" x2="20" y2="-24" />
                    <line x1="28" y1="-10" x2="34" y2="-18" />
                    <line x1="32" y1="0" x2="40" y2="0" />
                    <line x1="8" y1="0" x2="0" y2="0" />
                  </g>
                )}
              </g>

              {/* Switch - improved visual */}
              <g transform="translate(220, 135)">
                <circle cx="0" cy="0" r="6" fill={isCircuitOn ? "#22C55E" : "#666"} stroke={isCircuitOn ? "#16A34A" : "#444"} strokeWidth="2" />
                <line
                  x1="0" y1="0"
                  x2={isCircuitOn ? "30" : "20"}
                  y2={isCircuitOn ? "0" : "-15"}
                  stroke={isCircuitOn ? "url(#circCopperWireActive)" : "url(#circCopperWire)"}
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle cx="30" cy="0" r="6" fill={isCircuitOn ? "#22C55E" : "#666"} stroke={isCircuitOn ? "#16A34A" : "#444"} strokeWidth="2" />
              </g>

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
                style={{ width: '100%', accentColor: premiumDesign.colors.voltage }}
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
                style={{ width: '100%', accentColor: premiumDesign.colors.resistance }}
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
        content: "Ohm's Law states that Voltage (V) equals Current (I) times Resistance (R). This simple equation governs all electrical circuits and lets us predict how much current will flow.",
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
        title: "Your Prediction",
        content: prediction === 'direct'
          ? "Excellent! You correctly predicted that voltage and current are directly proportional. This is the core insight of Ohm's Law!"
          : "The correct answer is that voltage and current are directly proportional (when resistance is constant). Higher voltage pushes more current through the circuit.",
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
            🔄 The Twist: Series vs Parallel
          </h2>
          <p style={{
            color: premiumDesign.colors.text.secondary,
            fontSize: '16px',
          }}>
            What happens when you connect two resistors in series vs parallel?
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
                style={{ width: '100%', accentColor: premiumDesign.colors.resistance }}
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
                style={{ width: '100%', accentColor: premiumDesign.colors.resistance }}
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
        description: "Your home uses parallel circuits so each outlet operates independently at 120V (or 240V in some countries). If one light burns out, others stay on. Circuit breakers protect against too much current.",
        fact: "A typical US home has 100-200 amp service - enough to power everything from lights to air conditioners simultaneously!",
      },
      {
        title: "🔋 Electric Vehicles",
        description: "EV batteries combine thousands of cells in series and parallel. Series increases voltage (for power), parallel increases capacity (for range). Battery management systems monitor each cell using Ohm's Law principles.",
        fact: "A Tesla Model S battery has over 7,000 individual cells arranged in a complex series-parallel configuration!",
      },
      {
        title: "💻 Computer Processors",
        description: "Computer chips contain billions of tiny transistors (essentially switches). Each transistor's behavior follows Ohm's Law. Engineers must carefully manage current flow to prevent overheating.",
        fact: "A modern CPU can have over 50 billion transistors, each switching billions of times per second!",
      },
      {
        title: "🔌 USB & Charging",
        description: "USB chargers must provide specific voltages and currents. Fast charging works by increasing current (more amps) or voltage. Ohm's Law determines how quickly energy transfers to your device.",
        fact: "USB-C Power Delivery can supply up to 240W - enough to charge laptops at 48V × 5A!",
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

          {!completedApps.has(activeApp) && (
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
              ✓ Mark as Read
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
                buttonStyle.borderColor = premiumDesign.colors.voltage;
                buttonStyle.background = 'rgba(251, 191, 36, 0.2)';
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
    <div className="min-h-screen bg-[#0a0f1a] text-white relative overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/3 rounded-full blur-3xl" />

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center justify-between px-6 py-3 max-w-4xl mx-auto">
          <span className="text-sm font-semibold text-white/80 tracking-wide">Circuits & Ohm's Law</span>
          <div className="flex items-center gap-1.5">
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => { goToPhase(p); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  phase === p
                    ? 'bg-amber-400 w-6 shadow-lg shadow-amber-400/30'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? 'bg-emerald-500 w-2'
                      : 'bg-slate-700 w-2 hover:bg-slate-600'
                }`}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-amber-400">{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative pt-16 pb-12 max-w-4xl mx-auto px-4">
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
