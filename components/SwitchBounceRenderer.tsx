'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// ─────────────────────────────────────────────────────────────────────────────
// Switch Bounce & Debouncing - Complete 10-Phase Game (#262)
// Why pressing a button once can register 7 times, and how to fix it
// ─────────────────────────────────────────────────────────────────────────────

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

interface SwitchBounceRendererProps {
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

// ─────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    scenario: "A student connects a pushbutton to a microcontroller GPIO pin and writes code to increment a counter on each button press. After pressing the button once, the counter shows 7.",
    question: "What is the most likely cause of the counter reading 7 instead of 1?",
    options: [
      { id: 'a', label: "The microcontroller clock is running too fast" },
      { id: 'b', label: "Contact bounce causes multiple rapid transitions that the digital circuit counts as separate presses", correct: true },
      { id: 'c', label: "The GPIO pin is receiving electromagnetic interference" },
      { id: 'd', label: "The button's pull-up resistor is the wrong value" }
    ],
    explanation: "Mechanical switches don't make clean contact. The metal surfaces bounce apart and reconnect multiple times over 1-20ms, creating multiple voltage transitions. A fast digital input sees each transition as a separate button press."
  },
  {
    scenario: "An engineer measures the voltage across a pushbutton switch with a 10 MHz oscilloscope. After pressing the button, the trace shows 5 rapid transitions between 0V and 3.3V over approximately 3ms before settling at 0V.",
    question: "What is the bounce duration and approximate bounce count for this switch?",
    options: [
      { id: 'a', label: "Bounce duration is 3ms with 5 bounces", correct: true },
      { id: 'b', label: "Bounce duration is 5ms with 3 bounces" },
      { id: 'c', label: "Bounce duration is 1ms with 15 bounces" },
      { id: 'd', label: "The switch has no bounce - this is normal switching behavior" }
    ],
    explanation: "The 5 rapid transitions over 3ms represent contact bounce. Typical mechanical switches bounce for 1-20ms with varying numbers of transitions. This switch shows 5 bounces settling within 3ms, which is within the normal range."
  },
  {
    scenario: "A designer adds a 10k ohm resistor and a 100nF capacitor as an RC low-pass filter on a switch input. The switch bounces for about 5ms.",
    question: "What is the RC time constant and will it effectively debounce the switch?",
    options: [
      { id: 'a', label: "RC = 0.1ms - too short, bounces will still pass through" },
      { id: 'b', label: "RC = 1ms - effective for most bounces but may miss the longest ones", correct: true },
      { id: 'c', label: "RC = 10ms - effective but makes the button feel sluggish" },
      { id: 'd', label: "RC = 100ms - far too slow for any practical use" }
    ],
    explanation: "RC = 10k x 100nF = 1ms. For 5ms of bounce, you need the capacitor voltage to settle within the bounce window. With RC = 1ms, after 5 time constants (5ms) the output reaches 99.3% of final value, matching the bounce duration nicely."
  },
  {
    scenario: "A toggle switch controls a critical safety relay. The circuit uses a Schmitt trigger IC (74HC14) between the switch and the relay driver. The switch bounces for 8ms.",
    question: "Why is the Schmitt trigger effective for debouncing?",
    options: [
      { id: 'a', label: "It amplifies the switch signal to overcome bounce" },
      { id: 'b', label: "Its hysteresis prevents output toggling when the input bounces near the threshold", correct: true },
      { id: 'c', label: "It delays the signal by exactly the bounce duration" },
      { id: 'd', label: "It filters high-frequency noise but not mechanical bounce" }
    ],
    explanation: "A Schmitt trigger has two threshold voltages (hysteresis). The output only changes when the input crosses the upper threshold going high or the lower threshold going low. During bounce, if the RC-filtered signal stays between these thresholds, the output remains stable."
  },
  {
    scenario: "A firmware developer implements software debouncing by reading a button pin every 1ms. The algorithm requires 10 consecutive identical readings before accepting a state change.",
    question: "What is the effective debounce delay and what type of debouncing is this?",
    options: [
      { id: 'a', label: "10ms delay using a counter-based debounce algorithm", correct: true },
      { id: 'b', label: "1ms delay using a simple delay function" },
      { id: 'c', label: "10ms delay using an analog filter" },
      { id: 'd', label: "100ms delay using a state machine approach" }
    ],
    explanation: "Reading every 1ms and requiring 10 identical readings creates a 10ms debounce window. This counter-based approach is robust because it resets the counter whenever a bounce causes a different reading, ensuring the signal is truly stable."
  },
  {
    scenario: "An embedded system uses a simple 20ms delay after detecting the first edge for debouncing. During this delay, the system cannot respond to any other inputs.",
    question: "What is the main disadvantage of this blocking delay approach?",
    options: [
      { id: 'a', label: "20ms is too short to debounce any switch" },
      { id: 'b', label: "The processor is blocked and cannot handle other tasks during the delay period", correct: true },
      { id: 'c', label: "The delay uses too much memory" },
      { id: 'd', label: "Blocking delays cause more bounce than non-blocking approaches" }
    ],
    explanation: "A blocking delay (busy-wait) freezes the entire processor for 20ms. In real-time systems, this can cause missed interrupts, dropped serial data, or sluggish control loops. Non-blocking approaches using timers or state machines are preferred."
  },
  {
    scenario: "A designer must choose between hardware RC debouncing and software debouncing for a battery-powered remote control with 20 buttons.",
    question: "Which approach is likely more practical and why?",
    options: [
      { id: 'a', label: "Hardware RC - it uses no CPU cycles" },
      { id: 'b', label: "Software debouncing - it needs no additional components, saving cost and PCB space for 20 buttons", correct: true },
      { id: 'c', label: "Both are equally practical" },
      { id: 'd', label: "Neither works - you need Schmitt triggers for every button" }
    ],
    explanation: "With 20 buttons, hardware debouncing requires 20 resistors and 20 capacitors (40 extra components plus PCB space). Software debouncing handles all 20 buttons with just code, reducing BOM cost and board complexity significantly."
  },
  {
    scenario: "An RC debounce circuit uses R = 47k ohm and C = 1uF. After the switch is released, the user notices a 200ms delay before the system recognizes the button is no longer pressed.",
    question: "What is causing the slow response and how should it be fixed?",
    options: [
      { id: 'a', label: "The RC time constant (47ms) is too large; the capacitor takes ~5 RC to fully discharge through the resistor", correct: true },
      { id: 'b', label: "The capacitor is defective and should be replaced" },
      { id: 'c', label: "The resistor value is too low, limiting current" },
      { id: 'd', label: "This delay is normal and acceptable for all applications" }
    ],
    explanation: "RC = 47k x 1uF = 47ms. It takes about 5 RC time constants (~235ms) to fully charge/discharge, explaining the 200ms sluggish feel. Reducing R or C to get RC around 5-10ms balances debounce effectiveness with response speed."
  },
  {
    scenario: "A vending machine uses reed switches for coin detection. Each coin triggers multiple bounces, but the bounce characteristics vary widely between different coin types.",
    question: "What debouncing approach best handles variable bounce durations?",
    options: [
      { id: 'a', label: "Fixed 1ms hardware RC filter" },
      { id: 'b', label: "Adaptive software debouncing that adjusts the debounce window based on measured bounce patterns", correct: true },
      { id: 'c', label: "No debouncing needed for reed switches" },
      { id: 'd', label: "Replace reed switches with solid-state sensors" }
    ],
    explanation: "Variable bounce requires adaptive approaches. Software can measure actual bounce durations and adjust the debounce window dynamically. A fixed RC filter might be too short for heavy coins or too long for light ones, while adaptive software handles all cases."
  },
  {
    scenario: "A digital system samples a switch input at 1 MHz (every 1 microsecond). The switch bounces with individual bounce pulses as narrow as 50 microseconds.",
    question: "Will the system detect the bounces at this sampling rate?",
    options: [
      { id: 'a', label: "No - 1 MHz is too slow to detect microsecond events" },
      { id: 'b', label: "Yes - sampling every 1us will capture 50us bounce pulses, detecting approximately 50 samples per bounce", correct: true },
      { id: 'c', label: "Only if the bounces are exactly synchronized with the sampling clock" },
      { id: 'd', label: "The Nyquist theorem prevents detection of bounces below 500 kHz" }
    ],
    explanation: "At 1 MHz sampling (1us period), a 50us bounce pulse will be captured by approximately 50 samples. This is well above the Nyquist requirement. The key insight is that fast digital inputs easily detect bounce, which is exactly why debouncing is needed."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🎮',
    title: 'Gaming Controllers & Keyboards',
    short: 'Input device reliability',
    tagline: 'Every keypress must count exactly once',
    description: 'Mechanical keyboards and game controllers rely on precise debouncing to ensure each press registers exactly once. Double-clicking bugs in mice and keyboards are often debouncing failures.',
    connection: 'In competitive gaming, a double-registered keypress can mean the difference between winning and losing. Keyboard manufacturers implement sophisticated debouncing algorithms that adapt to individual switch characteristics over time.',
    howItWorks: 'Mechanical keyboard controllers scan the switch matrix at 1-8 kHz and apply per-key software debouncing, typically requiring 5ms of stable signal. Some use analog sensing to detect the switch position, avoiding bounce entirely.',
    stats: [
      { value: '5ms', label: 'Typical debounce time', icon: '⏱️' },
      { value: '1 kHz', label: 'Minimum polling rate', icon: '🔄' },
      { value: '80M', label: 'Keypress lifetime rating', icon: '⌨️' }
    ],
    examples: ['Mechanical keyboards', 'Gaming mice', 'Arcade buttons', 'Console controllers'],
    companies: ['Cherry MX', 'Kailh', 'Logitech', 'Razer'],
    futureImpact: 'Hall-effect and optical switches eliminate mechanical contact entirely, removing bounce at the source while enabling adjustable actuation points.',
    color: '#10B981'
  },
  {
    icon: '🏭',
    title: 'Industrial Control Systems',
    short: 'Safety-critical switching',
    tagline: 'False triggers in factories can be dangerous',
    description: 'Emergency stop buttons, limit switches, and safety interlocks in industrial machinery use robust debouncing to prevent false triggers. A bouncing emergency stop that re-enables the machine during bounce could cause injuries.',
    connection: 'Industrial switches operate in electrically noisy environments with motors, solenoids, and welders. Debouncing must work reliably despite this noise, with dedicated safety relay modules handling debounce in hardware.',
    howItWorks: 'Safety relays implement redundant debouncing with hardware RC filters, Schmitt triggers, and cross-monitoring of dual-channel inputs. IEC 61508 standards specify required response times and fault detection capabilities.',
    stats: [
      { value: '20ms', label: 'Typical safety debounce', icon: '🔒' },
      { value: 'SIL 3', label: 'Safety integrity level', icon: '🛡️' },
      { value: '10M', label: 'Switch cycle lifetime', icon: '🏗️' }
    ],
    examples: ['Emergency stops', 'Door interlocks', 'Limit switches', 'Two-hand safety controls'],
    companies: ['Pilz', 'Sick', 'Allen-Bradley', 'Siemens'],
    futureImpact: 'Smart safety switches with built-in diagnostics can report bounce degradation before failure, enabling predictive maintenance.',
    color: '#3B82F6'
  },
  {
    icon: '🏥',
    title: 'Medical Device Interfaces',
    short: 'Patient safety inputs',
    tagline: 'No room for error in medical dosing',
    description: 'Infusion pumps, ventilators, and defibrillators use mechanical switches for dose adjustments and critical controls. Debouncing ensures that pressing the dose-up button once increments by exactly one unit, not seven.',
    connection: 'A bouncing button on an infusion pump could deliver 7x the intended medication dose. Medical device standards (IEC 60601) require rigorous input validation including debouncing as part of risk management.',
    howItWorks: 'Medical devices typically use triple-redundant input processing: hardware filtering, software debouncing, and application-level validation. Some use capacitive or optical sensing to eliminate mechanical bounce entirely.',
    stats: [
      { value: '50ms', label: 'Conservative debounce', icon: '💊' },
      { value: 'IEC 60601', label: 'Safety standard', icon: '📋' },
      { value: '0.001%', label: 'Acceptable error rate', icon: '🎯' }
    ],
    examples: ['Infusion pumps', 'Ventilator controls', 'Defibrillator buttons', 'Surgical robots'],
    companies: ['Medtronic', 'Baxter', 'Philips Healthcare', 'GE Healthcare'],
    futureImpact: 'Touchscreen and voice interfaces are reducing reliance on mechanical switches, but physical buttons remain critical for emergency controls.',
    color: '#8B5CF6'
  },
  {
    icon: '🚗',
    title: 'Automotive Electronics',
    short: 'Vehicle switch systems',
    tagline: 'Reliable switching at 80 mph',
    description: 'Modern vehicles contain hundreds of switches for windows, lights, seats, and controls. Each must be debounced reliably despite vibration, temperature extremes, and electromagnetic interference from ignition systems.',
    connection: 'A bouncing window switch could reverse direction mid-travel. Automotive debouncing must handle not just contact bounce but also vibration-induced false triggers while the vehicle travels over rough roads.',
    howItWorks: 'Automotive switch controllers use dedicated debounce ICs or microcontroller-based scanning with configurable debounce times. The CAN bus protocol itself includes error detection that helps manage bounce-related transmission errors.',
    stats: [
      { value: '30ms', label: 'Typical auto debounce', icon: '⚡' },
      { value: '-40/+125C', label: 'Operating temperature', icon: '🌡️' },
      { value: '300+', label: 'Switches per vehicle', icon: '🔘' }
    ],
    examples: ['Power windows', 'Turn signals', 'Steering wheel controls', 'Seat adjusters'],
    companies: ['NXP', 'Infineon', 'STMicroelectronics', 'Microchip'],
    futureImpact: 'Capacitive and haptic touch surfaces are replacing many mechanical switches, but physical controls remain required for safety-critical functions by regulation.',
    color: '#F59E0B'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const SwitchBounceRenderer: React.FC<SwitchBounceRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const { isMobile } = useViewport();

  // Simulation state
  const [switchType, setSwitchType] = useState<'pushbutton' | 'toggle'>('pushbutton');
  const [bounceDurationMs, setBounceDurationMs] = useState(8); // ms
  const [bounceCount, setBounceCount] = useState(6);
  const [debounceMethod, setDebounceMethod] = useState<'none' | 'rc' | 'schmitt' | 'software'>('none');
  const [rcTimeConstantMs, setRcTimeConstantMs] = useState(2); // ms
  const [switchPressed, setSwitchPressed] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [pressCount, setPressCount] = useState(0);
  const [falseEdgeCount, setFalseEdgeCount] = useState(0);
  const [debouncedEdgeCount, setDebouncedEdgeCount] = useState(0);
  const [switchAnimTime, setSwitchAnimTime] = useState<number | null>(null);

  // Twist phase state: RC filter design
  const [twistR, setTwistR] = useState(10); // k ohm
  const [twistC, setTwistC] = useState(100); // nF

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Predict phase step tracking
  const [predictStep, setPredictStep] = useState(0);
  const [twistPredictStep, setTwistPredictStep] = useState(0);

  // Navigation ref
  const isNavigating = useRef(false);

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Sync external phase
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Emit game event helper
  const emitGameEvent = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
    if (onGameEvent) {
      onGameEvent({
        eventType,
        gameType: 'switch-bounce-debouncing',
        gameTitle: 'Switch Bounce & Debouncing',
        details,
        timestamp: Date.now()
      });
    }
  }, [onGameEvent]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B', // Amber for switch/electrical theme
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F97316',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: '#9CA3AF',
    border: '#2a2a3a',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'RC Design',
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
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    emitGameEvent('phase_changed', { from: phase, to: p });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [phase, emitGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase]);

  // ── Bounce waveform generation ─────────────────────────────────────────────
  const generateBounceWaveform = useCallback((
    numBounces: number,
    duration: number,
    timeSincePressMs: number,
    pressed: boolean
  ): { rawSignal: number; debouncedSignal: number; rcFiltered: number } => {
    if (!pressed || timeSincePressMs < 0) {
      return { rawSignal: 0, debouncedSignal: 0, rcFiltered: 0 };
    }

    // Generate bounce pattern: decaying bounce intervals
    let rawSignal = 1; // pressed = low (active low typical)
    if (timeSincePressMs < duration) {
      // During bounce period
      let bouncePhase = timeSincePressMs / duration; // 0..1
      // Each bounce gets shorter - exponential decay
      let accumulated = 0;
      let currentBounce = 0;
      for (let i = 0; i < numBounces; i++) {
        const bounceWidth = (1 / numBounces) * Math.pow(0.7, i);
        const gapWidth = bounceWidth * 0.4 * Math.pow(0.6, i);
        if (bouncePhase >= accumulated && bouncePhase < accumulated + bounceWidth) {
          rawSignal = 1;
          currentBounce = i;
          break;
        } else if (bouncePhase >= accumulated + bounceWidth && bouncePhase < accumulated + bounceWidth + gapWidth) {
          rawSignal = 0; // bounced open
          currentBounce = i;
          break;
        }
        accumulated += bounceWidth + gapWidth;
      }
      if (bouncePhase >= accumulated) {
        rawSignal = 1; // settled
      }
    }

    // RC filtered signal: exponential approach
    const rcMs = rcTimeConstantMs;
    let rcFiltered = 0;
    if (timeSincePressMs > 0) {
      // Simplified: smoothed version of raw signal via RC
      const tau = rcMs;
      rcFiltered = 1 - Math.exp(-timeSincePressMs / (tau * 3));
      // During bounce, add ripple
      if (timeSincePressMs < duration) {
        const ripple = (1 - rawSignal) * 0.3 * Math.exp(-timeSincePressMs / (tau * 2));
        rcFiltered = Math.max(0, Math.min(1, rcFiltered - ripple));
      }
    }

    // Debounced signal based on method
    let debouncedSignal = rawSignal;
    if (debounceMethod === 'rc' || debounceMethod === 'schmitt') {
      // RC or Schmitt: clean after RC time constant settles
      const schmittHigh = 0.67; // VCC * 2/3
      const schmittLow = 0.33; // VCC * 1/3
      if (debounceMethod === 'schmitt') {
        debouncedSignal = rcFiltered > schmittHigh ? 1 : rcFiltered < schmittLow ? 0 : debouncedSignal;
      } else {
        debouncedSignal = rcFiltered > 0.5 ? 1 : 0;
      }
    } else if (debounceMethod === 'software') {
      // Software: wait for stable period (10ms equivalent)
      debouncedSignal = timeSincePressMs > duration + 5 ? 1 : 0;
    }

    return { rawSignal, debouncedSignal, rcFiltered };
  }, [debounceMethod, rcTimeConstantMs]);

  // Handle virtual switch press
  const handleSwitchPress = useCallback(() => {
    playSound('click');
    setSwitchPressed(true);
    setSwitchAnimTime(Date.now());
    setPressCount(c => c + 1);

    // Calculate false edges from bounce
    const edges = debounceMethod === 'none' ? bounceCount * 2 + 1 : 1;
    setFalseEdgeCount(f => f + edges);
    setDebouncedEdgeCount(d => d + 1);

    emitGameEvent('button_clicked', { switchType, bounceCount, debounceMethod });

    // Auto-release for pushbutton after animation
    if (switchType === 'pushbutton') {
      setTimeout(() => {
        setSwitchPressed(false);
      }, bounceDurationMs * 4 + 200);
    }
  }, [switchType, bounceCount, debounceMethod, bounceDurationMs, emitGameEvent]);

  // ── SVG Visualization: Bounce Waveform ─────────────────────────────────────
  const renderBounceVisualization = (compact: boolean = false) => {
    const width = isMobile ? 320 : (compact ? 420 : 500);
    const height = isMobile ? 240 : (compact ? 280 : 320);
    const padding = { top: 35, right: 20, bottom: 45, left: 55 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const timeSincePress = switchAnimTime ? (Date.now() - switchAnimTime) : 0;
    const totalTimeMs = bounceDurationMs * 3;
    const numPoints = 200;

    // Generate waveform data
    const rawPath: string[] = [];
    const rcPath: string[] = [];
    const debouncedPath: string[] = [];

    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * totalTimeMs;
      const x = padding.left + (i / numPoints) * plotWidth;

      const { rawSignal, debouncedSignal, rcFiltered } = generateBounceWaveform(
        bounceCount, bounceDurationMs, t, true
      );

      const yRaw = padding.top + plotHeight - (rawSignal * plotHeight * 0.35);
      const yRC = padding.top + plotHeight * 0.35 + plotHeight * 0.3 - (rcFiltered * plotHeight * 0.25);
      const yDebounced = padding.top + plotHeight * 0.7 - (debouncedSignal * plotHeight * 0.25);

      if (i === 0) {
        rawPath.push(`M ${x} ${padding.top + plotHeight}`);
        rawPath.push(`L ${x} ${yRaw}`);
        rcPath.push(`M ${x} ${padding.top + plotHeight * 0.35 + plotHeight * 0.3}`);
        debouncedPath.push(`M ${x} ${padding.top + plotHeight * 0.7}`);
      } else {
        // Square wave for raw signal
        const prevT = ((i - 1) / numPoints) * totalTimeMs;
        const { rawSignal: prevRaw } = generateBounceWaveform(bounceCount, bounceDurationMs, prevT, true);
        if (rawSignal !== prevRaw) {
          const prevY = padding.top + plotHeight - (prevRaw * plotHeight * 0.35);
          rawPath.push(`L ${x} ${prevY}`);
        }
        rawPath.push(`L ${x} ${yRaw}`);
        rcPath.push(`L ${x} ${yRC}`);

        const prevD = generateBounceWaveform(bounceCount, bounceDurationMs, prevT, true).debouncedSignal;
        if (debouncedSignal !== prevD) {
          const prevYD = padding.top + plotHeight * 0.7 - (prevD * plotHeight * 0.25);
          debouncedPath.push(`L ${x} ${prevYD}`);
        }
        debouncedPath.push(`L ${x} ${yDebounced}`);
      }
    }

    // Count edges in raw signal
    let edgeCount = 0;
    let prevVal = 0;
    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * totalTimeMs;
      const { rawSignal } = generateBounceWaveform(bounceCount, bounceDurationMs, t, true);
      if (rawSignal !== prevVal) edgeCount++;
      prevVal = rawSignal;
    }

    // Bounce region highlight
    const bounceEndX = padding.left + (bounceDurationMs / totalTimeMs) * plotWidth;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}
        preserveAspectRatio="xMidYMid meet" role="img" aria-label="Switch bounce waveform visualization">
        <defs>
          <linearGradient id="bounceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.error} stopOpacity="0.15" />
            <stop offset="100%" stopColor={colors.error} stopOpacity="0" />
          </linearGradient>
          <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={width} height={height} fill={colors.bgCard} rx="12" />

        {/* Title */}
        <text x={width / 2} y={16} fill={colors.textSecondary} fontSize="12" textAnchor="middle" fontWeight="600">
          Switch Bounce Waveform ({debounceMethod === 'none' ? 'No Debounce' : debounceMethod.toUpperCase() + ' Debounce'})
        </text>

        {/* Bounce region highlight */}
        <rect x={padding.left} y={padding.top} width={bounceEndX - padding.left} height={plotHeight}
          fill="url(#bounceGrad)" />
        <line x1={bounceEndX} y1={padding.top} x2={bounceEndX} y2={padding.top + plotHeight}
          stroke={colors.error} strokeDasharray="4,4" opacity="0.5" />
        <text x={bounceEndX + 4} y={padding.top + 12} fill={colors.error} fontSize="9" opacity="0.7">
          bounce end
        </text>

        {/* Grid lines */}
        {[0, 0.35, 0.7, 1].map(frac => (
          <line key={`grid-${frac}`}
            x1={padding.left} y1={padding.top + frac * plotHeight}
            x2={padding.left + plotWidth} y2={padding.top + frac * plotHeight}
            stroke={colors.border} strokeDasharray="3,3" opacity="0.3" />
        ))}

        {/* Raw signal trace */}
        <path d={rawPath.join(' ')} fill="none" stroke={colors.accent} strokeWidth="2" filter="url(#glowAmber)" />

        {/* RC filtered trace */}
        {(debounceMethod === 'rc' || debounceMethod === 'schmitt') && (
          <path d={rcPath.join(' ')} fill="none" stroke="#06B6D4" strokeWidth="1.5" opacity="0.8" />
        )}

        {/* Schmitt thresholds */}
        {debounceMethod === 'schmitt' && (
          <>
            <line x1={padding.left} y1={padding.top + plotHeight * 0.35 + plotHeight * 0.3 - 0.67 * plotHeight * 0.25}
              x2={padding.left + plotWidth} y2={padding.top + plotHeight * 0.35 + plotHeight * 0.3 - 0.67 * plotHeight * 0.25}
              stroke="#22D3EE" strokeDasharray="2,4" opacity="0.4" />
            <line x1={padding.left} y1={padding.top + plotHeight * 0.35 + plotHeight * 0.3 - 0.33 * plotHeight * 0.25}
              x2={padding.left + plotWidth} y2={padding.top + plotHeight * 0.35 + plotHeight * 0.3 - 0.33 * plotHeight * 0.25}
              stroke="#22D3EE" strokeDasharray="2,4" opacity="0.4" />
          </>
        )}

        {/* Debounced output trace */}
        {debounceMethod !== 'none' && (
          <path d={debouncedPath.join(' ')} fill="none" stroke={colors.success} strokeWidth="2.5" />
        )}

        {/* Y-axis labels */}
        <text x={padding.left - 8} y={padding.top + 4} fill={colors.accent} fontSize="10" textAnchor="end">Raw</text>
        {(debounceMethod === 'rc' || debounceMethod === 'schmitt') && (
          <text x={padding.left - 8} y={padding.top + plotHeight * 0.35 + 4} fill="#06B6D4" fontSize="10" textAnchor="end">RC</text>
        )}
        {debounceMethod !== 'none' && (
          <text x={padding.left - 8} y={padding.top + plotHeight * 0.7 + 4} fill={colors.success} fontSize="10" textAnchor="end">Out</text>
        )}

        {/* X-axis */}
        <text x={padding.left + plotWidth / 2} y={height - 8} fill={colors.textMuted} fontSize="11" textAnchor="middle">
          Time (0 - {totalTimeMs.toFixed(0)}ms)
        </text>

        {/* Edge count badge */}
        <rect x={width - 110} y={padding.top + 4} width="100" height="28" rx="6" fill={colors.error} opacity="0.15" />
        <text x={width - 60} y={padding.top + 22} fill={colors.error} fontSize="11" textAnchor="middle" fontWeight="700">
          {edgeCount} edges
        </text>

        {debounceMethod !== 'none' && (
          <>
            <rect x={width - 110} y={padding.top + 38} width="100" height="28" rx="6" fill={colors.success} opacity="0.15" />
            <text x={width - 60} y={padding.top + 56} fill={colors.success} fontSize="11" textAnchor="middle" fontWeight="700">
              1 clean edge
            </text>
          </>
        )}
      </svg>
    );
  };

  // ── SVG: Switch schematic ──────────────────────────────────────────────────
  const renderSwitchSchematic = () => {
    const width = isMobile ? 300 : 400;
    const height = isMobile ? 140 : 160;

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}
        preserveAspectRatio="xMidYMid meet" role="img" aria-label="Switch circuit schematic">
        <rect x="0" y="0" width={width} height={height} fill={colors.bgCard} rx="12" />

        {/* VCC line */}
        <line x1="60" y1="20" x2="60" y2="45" stroke={colors.textMuted} strokeWidth="1.5" />
        <text x="60" y="14" fill={colors.success} fontSize="11" textAnchor="middle" fontWeight="600">VCC</text>

        {/* Pull-up resistor */}
        <rect x="54" y="45" width="12" height="30" fill="none" stroke={colors.textSecondary} strokeWidth="1.5" rx="2" />
        <text x="80" y="62" fill={colors.textMuted} fontSize="9">10k</text>

        {/* Connection to switch */}
        <line x1="60" y1="75" x2="60" y2="90" stroke={colors.textMuted} strokeWidth="1.5" />

        {/* Switch symbol */}
        <circle cx="60" cy="90" r="3" fill={switchPressed ? colors.accent : colors.textMuted} />
        {switchPressed ? (
          <line x1="60" y1="90" x2="60" y2="115" stroke={colors.accent} strokeWidth="2" />
        ) : (
          <line x1="60" y1="90" x2="80" y2="108" stroke={colors.textMuted} strokeWidth="2" />
        )}
        <circle cx="60" cy="115" r="3" fill={colors.textMuted} />

        {/* GND */}
        <line x1="60" y1="115" x2="60" y2="135" stroke={colors.textMuted} strokeWidth="1.5" />
        <line x1="48" y1="135" x2="72" y2="135" stroke={colors.textMuted} strokeWidth="2" />
        <line x1="52" y1="140" x2="68" y2="140" stroke={colors.textMuted} strokeWidth="1.5" />
        <line x1="56" y1="145" x2="64" y2="145" stroke={colors.textMuted} strokeWidth="1" />
        <text x="60" y={height - 2} fill={colors.textMuted} fontSize="10" textAnchor="middle">GND</text>

        {/* Digital input connection */}
        <line x1="60" y1="82" x2="160" y2="82" stroke={colors.accent} strokeWidth="1.5" strokeDasharray={switchPressed ? "0" : "4,4"} />

        {/* Debounce circuit (if enabled) */}
        {debounceMethod !== 'none' && debounceMethod !== 'software' && (
          <g>
            <rect x="140" y="70" width="60" height="24" rx="6" fill={colors.bgSecondary} stroke={colors.accent} strokeWidth="1" />
            <text x="170" y="86" fill={colors.accent} fontSize="9" textAnchor="middle" fontWeight="600">
              {debounceMethod === 'rc' ? 'RC Filter' : 'Schmitt'}
            </text>
            <line x1="200" y1="82" x2="260" y2="82" stroke={colors.success} strokeWidth="1.5" />
          </g>
        )}
        {debounceMethod === 'software' && (
          <g>
            <rect x="140" y="66" width="80" height="32" rx="6" fill={colors.bgSecondary} stroke="#8B5CF6" strokeWidth="1" />
            <text x="180" y="80" fill="#8B5CF6" fontSize="8" textAnchor="middle" fontWeight="600">SOFTWARE</text>
            <text x="180" y="92" fill="#8B5CF6" fontSize="8" textAnchor="middle">DEBOUNCE</text>
            <line x1="220" y1="82" x2="260" y2="82" stroke={colors.success} strokeWidth="1.5" />
          </g>
        )}

        {/* MCU / Digital Input */}
        <rect x="260" y="60" width="80" height="44" rx="8" fill={colors.bgSecondary} stroke={colors.textMuted} strokeWidth="1.5" />
        <text x="300" y="78" fill={colors.textPrimary} fontSize="10" textAnchor="middle" fontWeight="600">MCU</text>
        <text x="300" y="96" fill={colors.textMuted} fontSize="9" textAnchor="middle">GPIO Input</text>

        {/* Counter display */}
        <rect x="270" y="115" width="60" height="24" rx="4" fill={debounceMethod === 'none' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}
          stroke={debounceMethod === 'none' ? colors.error : colors.success} strokeWidth="1" />
        <text x="300" y="131" fill={debounceMethod === 'none' ? colors.error : colors.success}
          fontSize="11" textAnchor="middle" fontWeight="700">
          Count: {debounceMethod === 'none' ? falseEdgeCount : debouncedEdgeCount}
        </text>
      </svg>
    );
  };

  // ─── Navigation components ─────────────────────────────────────────────────
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      background: colors.bgSecondary,
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 1000,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>&#9107;</span>
        <span style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600 }}>Switch Bounce</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ ...typo.small, color: colors.textSecondary }}>{phaseLabels[phase]}</span>
        <span style={{ ...typo.small, color: colors.textMuted }}>
          ({phaseOrder.indexOf(phase) + 1}/{phaseOrder.length})
        </span>
      </div>
    </nav>
  );

  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: '60px',
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 999,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

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
            minHeight: '44px',
            minWidth: '44px',
            borderRadius: '4px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label={phaseLabels[p]}
        >
          <span style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
          }} />
        </button>
      ))}
    </div>
  );

  // Button styles
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #D97706)`,
    color: '#0a0a0f',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    minHeight: '44px',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    padding: '14px 28px',
    borderRadius: '10px',
    border: `1px solid ${colors.border}`,
    background: 'transparent',
    color: colors.textSecondary,
    cursor: 'pointer',
    minHeight: '44px',
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          paddingTop: '84px',
          textAlign: 'center',
          gap: '24px',
        }}>
          <div style={{ fontSize: '72px', marginBottom: '8px' }}>&#128268;</div>

          <h1 style={{ ...typo.h1, color: colors.textPrimary, maxWidth: '600px' }}>
            Why does pressing a button <span style={{ color: colors.error }}>once</span> increment your counter by <span style={{ color: colors.error }}>7</span>?
          </h1>

          <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px' }}>
            Mechanical switches have a dirty secret: they <strong style={{ color: colors.accent }}>bounce</strong>. Every single press creates multiple false transitions that wreak havoc on digital circuits.
          </p>

          {/* Animated counter demo */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px 32px',
            border: `1px solid ${colors.border}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}>
            <div style={{ ...typo.small, color: colors.textMuted }}>Button presses: 1</div>
            <div style={{
              fontSize: '64px',
              fontWeight: 800,
              color: colors.error,
              fontFamily: 'monospace',
              letterSpacing: '4px',
              textShadow: `0 0 20px rgba(239, 68, 68, 0.5)`,
            }}>
              {7}
            </div>
            <div style={{ ...typo.small, color: colors.error }}>Counter reads: 7 (should be 1!)</div>
          </div>

          <button
            onClick={() => { playSound('click'); goToPhase('predict'); }}
            style={primaryButtonStyle}
          >
            Investigate the Bounce Problem
          </button>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const predictionOptions = [
      { id: 'a', label: '1-2 false counts (minor issue)', value: '1-2' },
      { id: 'b', label: '3-5 false counts (moderate bounce)', value: '3-5' },
      { id: 'c', label: '6-10 false counts (significant bounce)', value: '6-10' },
      { id: 'd', label: '10-20 false counts (severe bounce)', value: '10-20' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '84px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '16px' }}>
              Make Your Prediction
            </h2>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                A typical pushbutton switch is pressed once. The switch contacts bounce for about 8ms with approximately 6 distinct bounces.
              </p>
            </div>

            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              How many false edge transitions will a digital input detect from a single button press?
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {predictionOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    playSound('click');
                    setPrediction(opt.value);
                    emitGameEvent('prediction_made', { prediction: opt.value });
                  }}
                  style={{
                    background: prediction === opt.value ? `${colors.accent}22` : colors.bgCard,
                    border: `2px solid ${prediction === opt.value ? colors.accent : colors.border}`,
                    borderRadius: '10px',
                    padding: '14px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: prediction === opt.value ? colors.accent : colors.bgSecondary,
                    color: prediction === opt.value ? '#0a0a0f' : colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: '24px',
                    marginRight: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.label}</span>
                </button>
              ))}
            </div>

            {prediction && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: `1px solid ${colors.accent}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Interesting prediction! With 6 bounces, the switch creates approximately <strong style={{ color: colors.accent }}>13 edges</strong> (each bounce = 2 transitions, plus the initial contact). Let us see what really happens...
                </p>
              </div>
            )}

            <button
              onClick={() => { playSound('success'); goToPhase('play'); }}
              disabled={!prediction}
              style={{
                ...primaryButtonStyle,
                width: '100%',
                opacity: prediction ? 1 : 0.5,
                cursor: prediction ? 'pointer' : 'not-allowed',
              }}
            >
              See the Bounce in Action
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '84px',
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
              Switch Bounce Experiment
            </h2>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '20px',
              marginBottom: '20px',
            }}>
              {/* LEFT: Visualization */}
              <div style={{ flex: isMobile ? 'none' : '1 1 55%' }}>
                {renderSwitchSchematic()}
                <div style={{ height: '16px' }} />
                {renderBounceVisualization()}
              </div>

              {/* RIGHT: Controls */}
              <div style={{
                flex: isMobile ? 'none' : '1 1 45%',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                {/* Switch type */}
                <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
                  <label style={{ ...typo.small, color: colors.textMuted, display: 'block', marginBottom: '8px' }}>Switch Type</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['pushbutton', 'toggle'] as const).map(t => (
                      <button key={t} onClick={() => { playSound('click'); setSwitchType(t); }}
                        style={{
                          flex: 1, padding: '10px', borderRadius: '8px', minHeight: '44px',
                          background: switchType === t ? `${colors.accent}22` : colors.bgSecondary,
                          border: `1px solid ${switchType === t ? colors.accent : colors.border}`,
                          color: switchType === t ? colors.accent : colors.textSecondary,
                          cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                        }}>
                        {t === 'pushbutton' ? 'Pushbutton' : 'Toggle'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bounce duration slider */}
                <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
                  <label style={{ ...typo.small, color: colors.textMuted, display: 'block', marginBottom: '4px' }}>
                    Bounce Duration: <strong style={{ color: colors.accent }}>{bounceDurationMs}ms</strong>
                  </label>
                  <input type="range" min="1" max="20" step="1" value={bounceDurationMs}
                    onChange={e => { setBounceDurationMs(Number(e.target.value)); emitGameEvent('slider_changed', { param: 'bounceDuration', value: Number(e.target.value) }); }}
                    style={{ width: '100%', accentColor: colors.accent }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', ...typo.small, color: colors.textMuted }}>
                    <span>1ms</span><span>20ms</span>
                  </div>
                </div>

                {/* Bounce count slider */}
                <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
                  <label style={{ ...typo.small, color: colors.textMuted, display: 'block', marginBottom: '4px' }}>
                    Bounce Count: <strong style={{ color: colors.accent }}>{bounceCount}</strong>
                  </label>
                  <input type="range" min="2" max="15" step="1" value={bounceCount}
                    onChange={e => { setBounceCount(Number(e.target.value)); emitGameEvent('slider_changed', { param: 'bounceCount', value: Number(e.target.value) }); }}
                    style={{ width: '100%', accentColor: colors.accent }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', ...typo.small, color: colors.textMuted }}>
                    <span>2</span><span>15</span>
                  </div>
                </div>

                {/* Debounce method */}
                <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
                  <label style={{ ...typo.small, color: colors.textMuted, display: 'block', marginBottom: '8px' }}>Debounce Method</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {([
                      { key: 'none', label: 'None' },
                      { key: 'rc', label: 'RC Filter' },
                      { key: 'schmitt', label: 'Schmitt Trigger' },
                      { key: 'software', label: 'Software' },
                    ] as const).map(m => (
                      <button key={m.key} onClick={() => { playSound('click'); setDebounceMethod(m.key); emitGameEvent('selection_made', { debounceMethod: m.key }); }}
                        style={{
                          padding: '10px', borderRadius: '8px', minHeight: '44px',
                          background: debounceMethod === m.key ? `${colors.accent}22` : colors.bgSecondary,
                          border: `1px solid ${debounceMethod === m.key ? colors.accent : colors.border}`,
                          color: debounceMethod === m.key ? colors.accent : colors.textSecondary,
                          cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                        }}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* RC Time Constant */}
                {(debounceMethod === 'rc' || debounceMethod === 'schmitt') && (
                  <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
                    <label style={{ ...typo.small, color: colors.textMuted, display: 'block', marginBottom: '4px' }}>
                      RC Time Constant: <strong style={{ color: '#06B6D4' }}>{rcTimeConstantMs}ms</strong>
                    </label>
                    <input type="range" min="0.5" max="20" step="0.5" value={rcTimeConstantMs}
                      onChange={e => { setRcTimeConstantMs(Number(e.target.value)); emitGameEvent('slider_changed', { param: 'rcTimeConstant', value: Number(e.target.value) }); }}
                      style={{ width: '100%', accentColor: '#06B6D4' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', ...typo.small, color: colors.textMuted }}>
                      <span>0.5ms</span><span>20ms</span>
                    </div>
                  </div>
                )}

                {/* Press button */}
                <button
                  onClick={handleSwitchPress}
                  style={{
                    ...primaryButtonStyle,
                    width: '100%',
                    fontSize: '18px',
                    padding: '18px',
                  }}
                >
                  Press Switch ({pressCount} presses)
                </button>

                {/* Results */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                }}>
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid rgba(239, 68, 68, 0.3)`,
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Raw Edges</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: colors.error, fontFamily: 'monospace' }}>
                      {falseEdgeCount}
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: `1px solid rgba(16, 185, 129, 0.3)`,
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{ ...typo.small, color: colors.textMuted }}>Debounced</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: colors.success, fontFamily: 'monospace' }}>
                      {debouncedEdgeCount}
                    </div>
                  </div>
                </div>

                {/* Reset */}
                <button onClick={() => { setPressCount(0); setFalseEdgeCount(0); setDebouncedEdgeCount(0); }}
                  style={{ ...secondaryButtonStyle, width: '100%', fontSize: '14px' }}>
                  Reset Counters
                </button>
              </div>
            </div>

            <button onClick={() => { playSound('success'); goToPhase('review'); }}
              style={{ ...primaryButtonStyle, width: '100%' }}>
              Understand the Physics
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '84px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '24px' }}>
              Contact Bounce Physics
            </h2>

            {/* Key concept cards */}
            {[
              {
                title: 'Why Switches Bounce',
                content: 'When metal contacts collide, they physically rebound like a ball hitting the floor. The contacts are small metal pieces mounted on springs, and the elastic collision causes them to bounce apart and reconnect multiple times before settling.',
                color: colors.accent,
              },
              {
                title: 'Typical Bounce Characteristics',
                content: 'Most switches bounce for 1-20ms, with pushbuttons averaging 5-10ms and toggle switches 10-20ms. Individual bounces last 10-100 microseconds. The number of bounces ranges from 1 to over 20, depending on switch quality and actuation force.',
                color: '#06B6D4',
              },
              {
                title: 'Why Digital Circuits Care',
                content: 'A microcontroller input pin samples at MHz speeds. A 10ms bounce window contains thousands of sampling opportunities. Each transition from low-to-high or high-to-low registers as a separate event, causing counters to increment multiple times.',
                color: colors.error,
              },
              {
                title: 'The Debouncing Solution',
                content: 'Debouncing filters out the rapid transitions to produce a single clean edge. Hardware approaches (RC filter, Schmitt trigger) smooth the signal electrically. Software approaches (delay, state machine, counter) ignore transitions until the signal stabilizes.',
                color: colors.success,
              },
            ].map((card, i) => (
              <div key={i} style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '16px',
                borderLeft: `3px solid ${card.color}`,
              }}>
                <h3 style={{ ...typo.h3, color: card.color, marginBottom: '8px' }}>{card.title}</h3>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>{card.content}</p>
              </div>
            ))}

            {/* Formula */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              textAlign: 'center',
              border: `1px solid ${colors.accent}33`,
            }}>
              <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '8px' }}>RC Time Constant</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: colors.accent, fontFamily: 'monospace', margin: '8px 0' }}>
                T = R x C
              </p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                Signal settles to 99.3% after 5 time constants (5RC). Choose RC so that 5RC is greater than or equal to the bounce duration.
              </p>
            </div>

            <button onClick={() => { playSound('success'); goToPhase('twist_predict'); }}
              style={{ ...primaryButtonStyle, width: '100%' }}>
              Explore RC Filter Design
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // TWIST_PREDICT PHASE
  if (phase === 'twist_predict') {
    const twistOptions = [
      { id: 'a', label: 'RC = 0.5ms (very fast but might miss bounces)', value: '0.5' },
      { id: 'b', label: 'RC = 2ms (moderate filtering)', value: '2' },
      { id: 'c', label: 'RC = 5ms (matches typical bounce duration)', value: '5' },
      { id: 'd', label: 'RC = 20ms (very aggressive filtering)', value: '20' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '84px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '16px' }}>
              The Twist: RC Filter Design
            </h2>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              borderLeft: `3px solid ${colors.warning}`,
            }}>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Your switch bounces for <strong style={{ color: colors.accent }}>10ms</strong>. You need to design an RC filter to debounce it. But there is a tradeoff: <strong style={{ color: colors.error }}>too short = bounces still pass through</strong>, and <strong style={{ color: colors.warning }}>too long = the button feels sluggish</strong>.
              </p>
            </div>

            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
              What RC time constant will best debounce a 10ms bounce?
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {twistOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    playSound('click');
                    setTwistPrediction(opt.value);
                    emitGameEvent('prediction_made', { twistPrediction: opt.value });
                  }}
                  style={{
                    background: twistPrediction === opt.value ? `${colors.warning}22` : colors.bgCard,
                    border: `2px solid ${twistPrediction === opt.value ? colors.warning : colors.border}`,
                    borderRadius: '10px',
                    padding: '14px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                >
                  <span style={{
                    display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%',
                    background: twistPrediction === opt.value ? colors.warning : colors.bgSecondary,
                    color: twistPrediction === opt.value ? '#0a0a0f' : colors.textSecondary,
                    textAlign: 'center', lineHeight: '24px', marginRight: '10px', fontSize: '12px', fontWeight: 700,
                  }}>
                    {opt.id.toUpperCase()}
                  </span>
                  <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.label}</span>
                </button>
              ))}
            </div>

            {twistPrediction && (
              <div style={{
                background: 'rgba(249, 115, 22, 0.1)',
                border: `1px solid ${colors.warning}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                  Good thinking! The ideal RC value is a balance between filtering effectiveness and response speed. Since you need 5RC to fully settle, an RC of ~2ms gives 10ms settle time. Let us design and test it!
                </p>
              </div>
            )}

            <button
              onClick={() => { playSound('success'); goToPhase('twist_play'); }}
              disabled={!twistPrediction}
              style={{
                ...primaryButtonStyle, width: '100%',
                opacity: twistPrediction ? 1 : 0.5,
                cursor: twistPrediction ? 'pointer' : 'not-allowed',
              }}
            >
              Design Your RC Filter
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // TWIST_PLAY PHASE
  if (phase === 'twist_play') {
    const rcTimeMs = (twistR * 1000 * twistC * 1e-9) * 1000; // ms
    const settleTime = rcTimeMs * 5;
    const targetBounce = 10; // ms
    const isEffective = settleTime >= targetBounce;
    const isSluggish = rcTimeMs > 10;
    const isOptimal = isEffective && !isSluggish;

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '84px',
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '20px' }}>
              Design Your RC Debounce Filter
            </h2>

            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '20px',
              marginBottom: '20px',
            }}>
              {/* LEFT: Visualization */}
              <div style={{ flex: isMobile ? 'none' : '1 1 55%' }}>
                {/* RC circuit diagram */}
                <svg width={isMobile ? 320 : 420} height={140} viewBox={`0 0 ${isMobile ? 320 : 420} 140`}
                  style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%', marginBottom: '12px' }}
                  preserveAspectRatio="xMidYMid meet">
                  <rect x="0" y="0" width={isMobile ? 320 : 420} height="140" fill={colors.bgCard} rx="12" />
                  <text x={isMobile ? 160 : 210} y="18" fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="600">RC Debounce Circuit</text>

                  {/* Switch */}
                  <text x="30" y="55" fill={colors.textMuted} fontSize="10" textAnchor="middle">SW</text>
                  <circle cx="30" cy="65" r="3" fill={colors.accent} />
                  <line x1="33" y1="65" x2="80" y2="65" stroke={colors.accent} strokeWidth="1.5" />

                  {/* Resistor */}
                  <rect x="80" y="55" width="50" height="20" fill="none" stroke={colors.textSecondary} strokeWidth="1.5" rx="3" />
                  <text x="105" y="68" fill={colors.textPrimary} fontSize="10" textAnchor="middle" fontWeight="600">{twistR}k</text>
                  <text x="105" y="50" fill={colors.textMuted} fontSize="9" textAnchor="middle">R</text>

                  <line x1="130" y1="65" x2="180" y2="65" stroke={colors.textSecondary} strokeWidth="1.5" />

                  {/* Capacitor */}
                  <line x1="180" y1="65" x2="180" y2="80" stroke={colors.textSecondary} strokeWidth="1.5" />
                  <line x1="166" y1="80" x2="194" y2="80" stroke="#06B6D4" strokeWidth="2" />
                  <line x1="166" y1="86" x2="194" y2="86" stroke="#06B6D4" strokeWidth="2" />
                  <line x1="180" y1="86" x2="180" y2="105" stroke={colors.textSecondary} strokeWidth="1.5" />
                  <text x="204" y="86" fill={colors.textPrimary} fontSize="10" fontWeight="600">{twistC}nF</text>
                  <text x="204" y="76" fill={colors.textMuted} fontSize="9">C</text>

                  {/* GND */}
                  <line x1="170" y1="105" x2="190" y2="105" stroke={colors.textMuted} strokeWidth="1.5" />
                  <line x1="173" y1="109" x2="187" y2="109" stroke={colors.textMuted} strokeWidth="1" />
                  <line x1="176" y1="113" x2="184" y2="113" stroke={colors.textMuted} strokeWidth="0.5" />

                  {/* Output to Schmitt/MCU */}
                  <line x1="180" y1="65" x2="260" y2="65" stroke={colors.success} strokeWidth="1.5" />
                  <rect x="260" y="50" width="70" height="30" rx="6" fill={colors.bgSecondary} stroke={colors.success} strokeWidth="1" />
                  <text x="295" y="68" fill={colors.success} fontSize="10" textAnchor="middle" fontWeight="600">To MCU</text>

                  {/* RC value display */}
                  <rect x={isMobile ? 180 : 260} y="100" width="120" height="30" rx="8"
                    fill={isOptimal ? 'rgba(16, 185, 129, 0.15)' : isSluggish ? 'rgba(249, 115, 22, 0.15)' : 'rgba(239, 68, 68, 0.15)'}
                    stroke={isOptimal ? colors.success : isSluggish ? colors.warning : colors.error} strokeWidth="1" />
                  <text x={isMobile ? 240 : 320} y="119"
                    fill={isOptimal ? colors.success : isSluggish ? colors.warning : colors.error}
                    fontSize="11" textAnchor="middle" fontWeight="700">
                    RC = {rcTimeMs.toFixed(1)}ms
                  </text>
                </svg>

                {/* Response curve */}
                <svg width={isMobile ? 320 : 420} height={180} viewBox={`0 0 ${isMobile ? 320 : 420} 180`}
                  style={{ background: colors.bgCard, borderRadius: '12px', maxWidth: '100%' }}
                  preserveAspectRatio="xMidYMid meet">
                  <rect x="0" y="0" width={isMobile ? 320 : 420} height="180" fill={colors.bgCard} rx="12" />
                  <text x={isMobile ? 160 : 210} y="18" fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="600">
                    Capacitor Voltage vs Time
                  </text>

                  {/* Plot area */}
                  {(() => {
                    const pw = (isMobile ? 320 : 420) - 60;
                    const ph = 120;
                    const ox = 45;
                    const oy = 30;
                    const maxTimeMs = Math.max(settleTime * 1.5, 30);

                    // RC charging curve
                    const curvePath: string[] = [];
                    for (let i = 0; i <= 100; i++) {
                      const t = (i / 100) * maxTimeMs;
                      const v = 1 - Math.exp(-t / rcTimeMs);
                      const x = ox + (t / maxTimeMs) * pw;
                      const y = oy + ph - v * ph;
                      curvePath.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
                    }

                    // Threshold line at 50%
                    const threshY = oy + ph * 0.5;
                    // Bounce end line
                    const bounceEndX = ox + (targetBounce / maxTimeMs) * pw;
                    // Settle line (99.3%)
                    const settleX = ox + (settleTime / maxTimeMs) * pw;

                    return (
                      <g>
                        {/* Axes */}
                        <line x1={ox} y1={oy} x2={ox} y2={oy + ph} stroke={colors.border} strokeWidth="1" />
                        <line x1={ox} y1={oy + ph} x2={ox + pw} y2={oy + ph} stroke={colors.border} strokeWidth="1" />

                        {/* Bounce region */}
                        <rect x={ox} y={oy} width={bounceEndX - ox} height={ph} fill="rgba(239, 68, 68, 0.08)" />
                        <line x1={bounceEndX} y1={oy} x2={bounceEndX} y2={oy + ph}
                          stroke={colors.error} strokeDasharray="3,3" opacity="0.5" />
                        <text x={bounceEndX} y={oy - 4} fill={colors.error} fontSize="9" textAnchor="middle">
                          bounce end ({targetBounce}ms)
                        </text>

                        {/* 50% threshold */}
                        <line x1={ox} y1={threshY} x2={ox + pw} y2={threshY}
                          stroke={colors.accent} strokeDasharray="4,4" opacity="0.4" />
                        <text x={ox - 4} y={threshY + 3} fill={colors.accent} fontSize="9" textAnchor="end">50%</text>

                        {/* RC curve */}
                        <path d={curvePath.join(' ')} fill="none" stroke="#06B6D4" strokeWidth="2.5" />

                        {/* 5RC settle marker */}
                        {settleX <= ox + pw && (
                          <g>
                            <line x1={settleX} y1={oy} x2={settleX} y2={oy + ph}
                              stroke={colors.success} strokeDasharray="3,3" opacity="0.6" />
                            <text x={settleX} y={oy + ph + 14} fill={colors.success} fontSize="9" textAnchor="middle">
                              5RC = {settleTime.toFixed(1)}ms
                            </text>
                          </g>
                        )}

                        {/* Labels */}
                        <text x={ox + pw / 2} y={oy + ph + 28} fill={colors.textMuted} fontSize="10" textAnchor="middle">Time (ms)</text>
                        <text x={ox - 4} y={oy + 4} fill={colors.textMuted} fontSize="9" textAnchor="end">VCC</text>
                        <text x={ox - 4} y={oy + ph + 4} fill={colors.textMuted} fontSize="9" textAnchor="end">0V</text>
                      </g>
                    );
                  })()}
                </svg>
              </div>

              {/* RIGHT: Controls */}
              <div style={{
                flex: isMobile ? 'none' : '1 1 45%',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                {/* Resistance */}
                <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
                  <label style={{ ...typo.small, color: colors.textMuted, display: 'block', marginBottom: '4px' }}>
                    Resistance (R): <strong style={{ color: colors.accent }}>{twistR}k ohm</strong>
                  </label>
                  <input type="range" min="1" max="100" step="1" value={twistR}
                    onChange={e => { setTwistR(Number(e.target.value)); emitGameEvent('slider_changed', { param: 'resistance', value: Number(e.target.value) }); }}
                    style={{ width: '100%', accentColor: colors.accent }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', ...typo.small, color: colors.textMuted }}>
                    <span>1k</span><span>100k</span>
                  </div>
                </div>

                {/* Capacitance */}
                <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
                  <label style={{ ...typo.small, color: colors.textMuted, display: 'block', marginBottom: '4px' }}>
                    Capacitance (C): <strong style={{ color: '#06B6D4' }}>{twistC}nF</strong>
                  </label>
                  <input type="range" min="10" max="1000" step="10" value={twistC}
                    onChange={e => { setTwistC(Number(e.target.value)); emitGameEvent('slider_changed', { param: 'capacitance', value: Number(e.target.value) }); }}
                    style={{ width: '100%', accentColor: '#06B6D4' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', ...typo.small, color: colors.textMuted }}>
                    <span>10nF</span><span>1000nF</span>
                  </div>
                </div>

                {/* Calculated values */}
                <div style={{
                  background: colors.bgCard,
                  borderRadius: '12px',
                  padding: '16px',
                  border: `1px solid ${isOptimal ? colors.success : isSluggish ? colors.warning : colors.error}33`,
                }}>
                  <h4 style={{ ...typo.small, color: colors.textMuted, marginBottom: '12px' }}>Calculated Values</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>RC Time Constant</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: colors.accent, fontFamily: 'monospace' }}>
                        {rcTimeMs.toFixed(1)}ms
                      </div>
                    </div>
                    <div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Settle Time (5RC)</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#06B6D4', fontFamily: 'monospace' }}>
                        {settleTime.toFixed(1)}ms
                      </div>
                    </div>
                    <div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Bounce Duration</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: colors.error, fontFamily: 'monospace' }}>
                        {targetBounce}ms
                      </div>
                    </div>
                    <div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>Verdict</div>
                      <div style={{
                        fontSize: '14px', fontWeight: 700,
                        color: isOptimal ? colors.success : isSluggish ? colors.warning : colors.error,
                      }}>
                        {isOptimal ? 'Optimal!' : isSluggish ? 'Too Sluggish' : 'Still Bounces'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status message */}
                <div style={{
                  background: isOptimal ? 'rgba(16, 185, 129, 0.1)' : isSluggish ? 'rgba(249, 115, 22, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${isOptimal ? colors.success : isSluggish ? colors.warning : colors.error}44`,
                  borderRadius: '10px',
                  padding: '14px',
                }}>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    {!isEffective && (
                      <>Your settle time ({settleTime.toFixed(1)}ms) is shorter than the bounce duration ({targetBounce}ms). Bounces will still pass through! Increase R or C.</>
                    )}
                    {isEffective && isSluggish && (
                      <>The filter works but RC = {rcTimeMs.toFixed(1)}ms means a noticeable delay. The button will feel sluggish. Users expect response within ~50ms. Try reducing R or C.</>
                    )}
                    {isOptimal && (
                      <>Excellent design! RC = {rcTimeMs.toFixed(1)}ms gives a settle time of {settleTime.toFixed(1)}ms which covers the {targetBounce}ms bounce, and the response is fast enough to feel instant.</>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <button onClick={() => { playSound('success'); goToPhase('twist_review'); }}
              style={{ ...primaryButtonStyle, width: '100%' }}>
              Understand the Tradeoff
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // TWIST_REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '84px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '24px' }}>
              The RC vs Response Time Tradeoff
            </h2>

            {[
              {
                title: 'Too Short: RC << Bounce Time',
                content: 'If 5RC < bounce duration, the capacitor charges and discharges too quickly to filter out the bounces. The output still shows multiple transitions. Example: RC = 0.5ms with 10ms bounce gives 5RC = 2.5ms -- bounces from 2.5-10ms pass right through.',
                color: colors.error,
                icon: '!',
              },
              {
                title: 'Too Long: RC >> Bounce Time',
                content: 'If RC is much larger than bounce duration, filtering works perfectly but the button feels delayed and unresponsive. Users perceive delays above 50-100ms as sluggish. Example: RC = 50ms makes the button feel like it is stuck in mud.',
                color: colors.warning,
                icon: '~',
              },
              {
                title: 'Just Right: 5RC is approximately equal to Bounce Time',
                content: 'The sweet spot is when 5RC slightly exceeds the maximum expected bounce duration. For typical 5-10ms bounce, RC = 2-3ms works well: 5RC = 10-15ms filters all bounces while keeping response under 20ms (imperceptible to users).',
                color: colors.success,
                icon: '=',
              },
            ].map((card, i) => (
              <div key={i} style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '16px',
                borderLeft: `3px solid ${card.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: `${card.color}22`, border: `2px solid ${card.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: card.color, fontWeight: 800, fontSize: '16px',
                  }}>{card.icon}</div>
                  <h3 style={{ ...typo.h3, color: card.color, margin: 0 }}>{card.title}</h3>
                </div>
                <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>{card.content}</p>
              </div>
            ))}

            {/* Comparison table */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
                Hardware vs Software Debouncing
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: colors.border }}>
                {[
                  ['', 'Hardware (RC)', 'Software'],
                  ['Components', 'R + C per switch', 'None (code only)'],
                  ['CPU Load', 'Zero', 'Minimal (timer ISR)'],
                  ['Flexibility', 'Fixed by component values', 'Adjustable in firmware'],
                  ['Cost (20 btns)', '40 parts + PCB area', 'Free'],
                  ['Best For', 'Noise immunity, analog', 'Multi-button, adaptive'],
                ].map((row, ri) => (
                  <React.Fragment key={ri}>
                    {row.map((cell, ci) => (
                      <div key={`${ri}-${ci}`} style={{
                        background: ri === 0 ? colors.bgSecondary : colors.bgCard,
                        padding: '10px 12px',
                        ...(ri === 0 ? { ...typo.small, color: colors.accent, fontWeight: 700 } : { ...typo.small, color: colors.textSecondary }),
                      }}>
                        {ci === 0 && ri > 0 ? <strong style={{ color: colors.textMuted }}>{cell}</strong> : cell}
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <button onClick={() => { playSound('success'); goToPhase('transfer'); }}
              style={{ ...primaryButtonStyle, width: '100%' }}>
              See Real-World Applications
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Switch Bounce & Debouncing"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100dvh',
          background: colors.bgPrimary,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {renderNavBar()}
          {renderProgressBar()}

          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            paddingTop: '84px',
          }}>
            <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '16px' }}>
                {passed ? '&#127942;' : '&#128218;'}
              </div>
              <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
                {passed ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
                {testScore} / 10
              </p>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
                {passed
                  ? `You've mastered Switch Bounce & Debouncing! Grade: ${testScore >= 9 ? 'A' : testScore >= 8 ? 'B+' : 'B'}`
                  : 'Review the concepts and try again.'}
              </p>

              {passed ? (
                <button
                  onClick={() => {
                    playSound('complete');
                    emitGameEvent('game_completed', { score: testScore, total: 10 });
                    goToPhase('mastery');
                  }}
                  style={{ ...primaryButtonStyle, marginBottom: '24px' }}
                >
                  View Mastery Dashboard
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
                  style={{ ...primaryButtonStyle, marginBottom: '24px' }}
                >
                  Review & Try Again
                </button>
              )}

              {/* Rich Answer Key */}
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>Answer Key</h3>
                {testQuestions.map((q, idx) => {
                  const correctOption = q.options.find(o => o.correct);
                  const userAnswer = testAnswers[idx];
                  const isCorrect = userAnswer === correctOption?.id;
                  const userOption = q.options.find(o => o.id === userAnswer);

                  return (
                    <div key={idx} style={{
                      background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      borderRadius: '10px',
                      padding: '14px',
                      marginBottom: '12px',
                    }}>
                      <p style={{ ...typo.small, color: colors.textPrimary, fontWeight: 700, marginBottom: '8px' }}>
                        {idx + 1}. {q.question}
                      </p>
                      {!isCorrect && userOption && (
                        <div style={{
                          padding: '6px 10px', marginBottom: '4px', borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.2)', color: colors.error, fontSize: '13px',
                        }}>
                          Your answer: {userOption.label}
                        </div>
                      )}
                      <div style={{
                        padding: '6px 10px', marginBottom: '4px', borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.2)', color: colors.success, fontSize: '13px',
                      }}>
                        Correct: {correctOption?.label}
                      </div>
                      <div style={{
                        padding: '6px 10px', marginTop: '6px', borderRadius: '6px',
                        background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '12px', lineHeight: 1.5,
                      }}>
                        {q.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '84px',
        }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            {/* Progress */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <span style={{ ...typo.body, color: colors.textSecondary, fontWeight: 600 }}>
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
                    minHeight: '44px',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                    color: testAnswers[currentQuestion] === opt.id ? '#0a0a0f' : colors.textSecondary,
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
                  style={{ ...secondaryButtonStyle, flex: 1 }}
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
                    color: testAnswers[currentQuestion] ? '#0a0a0f' : 'white',
                    cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                    minHeight: '44px',
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
                    emitGameEvent('answer_submitted', { score, total: 10 });
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
                    minHeight: '44px',
                  }}
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    const grade = testScore >= 10 ? 'A+' : testScore >= 9 ? 'A' : testScore >= 8 ? 'B+' : testScore >= 7 ? 'B' : 'C';

    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderNavBar()}
        {renderProgressBar()}

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          paddingTop: '84px',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              fontSize: '100px',
              marginBottom: '24px',
              animation: 'bounce 1s infinite',
            }}>
              &#127942;
            </div>
            <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

            <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
              Debounce Master!
            </h1>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              You now understand why mechanical switches bounce and how to design effective debouncing solutions for digital circuits.
            </p>

            {/* Score card */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              border: `1px solid ${colors.accent}33`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginBottom: '16px' }}>
                <div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Score</div>
                  <div style={{ fontSize: '36px', fontWeight: 800, color: colors.accent, fontFamily: 'monospace' }}>
                    {testScore}/10
                  </div>
                </div>
                <div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Grade</div>
                  <div style={{ fontSize: '36px', fontWeight: 800, color: colors.success, fontFamily: 'monospace' }}>
                    {grade}
                  </div>
                </div>
              </div>
            </div>

            {/* Key learnings */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'left',
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
                What You Learned:
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  'Mechanical switches bounce 1-20ms, creating false transitions',
                  'RC filters smooth the signal: T = R x C',
                  'Schmitt triggers add hysteresis for clean switching',
                  'Software debouncing: delay, counter, state machine',
                  '5RC >= bounce duration for effective filtering',
                  'Tradeoff: filter strength vs response speed',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: colors.success, flexShrink: 0 }}>&#10003;</span>
                    <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Answer key summary */}
            <div style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'left',
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
                Answer Key Summary
              </h3>
              {testQuestions.map((q, idx) => {
                const correctOption = q.options.find(o => o.correct);
                const userAnswer = testAnswers[idx];
                const isCorrect = userAnswer === correctOption?.id;

                return (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 0',
                    borderBottom: idx < 9 ? `1px solid ${colors.border}` : 'none',
                  }}>
                    <span style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: isCorrect ? colors.success : colors.error,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700, flexShrink: 0,
                    }}>
                      {isCorrect ? '&#10003;' : '&#10007;'}
                    </span>
                    <span style={{ ...typo.small, color: colors.textSecondary, flex: 1 }}>
                      Q{idx + 1}: {correctOption?.label?.substring(0, 60)}{(correctOption?.label?.length || 0) > 60 ? '...' : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '24px' }}>
              <button
                onClick={() => goToPhase('hook')}
                style={secondaryButtonStyle}
              >
                Play Again
              </button>
              <button
                onClick={() => {
                  playSound('complete');
                  emitGameEvent('game_completed', { score: testScore, total: 10, grade });
                  onGameEvent?.({
                    eventType: 'achievement_unlocked',
                    gameType: 'switch-bounce-debouncing',
                    gameTitle: 'Switch Bounce & Debouncing',
                    details: { type: 'mastery_achieved' },
                    timestamp: Date.now()
                  });
                  window.location.href = '/games';
                }}
                style={primaryButtonStyle}
              >
                Complete Game
              </button>
            </div>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default SwitchBounceRenderer;
