'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import TransferPhaseView from './TransferPhaseView';
import { useViewport } from '../hooks/useViewport';

// ─────────────────────────────────────────────────────────────────────────────
// Oscilloscope Triggering - Complete 10-Phase Game (#251)
// Learn how edge/level triggering, trigger level, slope, and holdoff
// stabilize an oscilloscope waveform display.
// ─────────────────────────────────────────────────────────────────────────────

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected' |
    'mastery_achieved';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface OscilloscopeTriggererRendererProps {
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
    scenario: 'An engineer connects a 1 kHz sine wave to an oscilloscope. The display shows the waveform constantly scrolling and jittering left/right - it never stays still.',
    question: 'What is the most likely cause of the unstable display?',
    options: [
      { id: 'a', label: 'The oscilloscope is broken and needs repair' },
      { id: 'b', label: 'The trigger level is set outside the signal amplitude, so triggering never occurs', correct: true },
      { id: 'c', label: 'The signal frequency is too low for the scope to capture' },
      { id: 'd', label: 'The probe ground clip is connected incorrectly' }
    ],
    explanation: 'When the trigger level is set above the peak or below the trough of a signal, the scope never detects a trigger event. Without triggering, each sweep starts at a random point in the waveform, causing the display to appear jittery and unstable.'
  },
  {
    scenario: 'A technician sets the oscilloscope to rising-edge trigger at 0V on a 5 Vpp sine wave centered at 0V. The waveform is now perfectly stable.',
    question: 'Where on the waveform does each sweep begin?',
    options: [
      { id: 'a', label: 'At the positive peak of the sine wave' },
      { id: 'b', label: 'At the zero crossing where the waveform goes from negative to positive', correct: true },
      { id: 'c', label: 'At the negative peak of the sine wave' },
      { id: 'd', label: 'At a random location each time' }
    ],
    explanation: 'Rising-edge triggering at 0V means the scope starts a new sweep each time the waveform crosses 0V while going upward. This consistent starting point is why the display becomes stable - every sweep captures the same portion of the waveform.'
  },
  {
    scenario: 'An engineer switches from rising-edge to falling-edge trigger on the same 1 kHz sine wave at 0V trigger level. The display shifts.',
    question: 'How does the displayed waveform change?',
    options: [
      { id: 'a', label: 'The waveform appears inverted (upside down)' },
      { id: 'b', label: 'The waveform becomes unstable and jitters' },
      { id: 'c', label: 'The waveform shifts by half a period - the sweep now starts at the falling zero crossing', correct: true },
      { id: 'd', label: 'Nothing changes because trigger slope does not affect the display' }
    ],
    explanation: 'Changing from rising to falling edge moves the trigger point to where the waveform crosses the trigger level going downward. For a sine wave at 0V, this shifts the starting point by exactly half a period, so the displayed waveform appears shifted horizontally.'
  },
  {
    scenario: 'A digital PWM signal has a fixed frequency but a variable duty cycle that changes slowly. The oscilloscope shows the rising edges are stable but the falling edges appear to wander.',
    question: 'What trigger setting is being used?',
    options: [
      { id: 'a', label: 'Falling-edge trigger' },
      { id: 'b', label: 'Rising-edge trigger - it locks to the rising edge, so only the variable falling edge moves', correct: true },
      { id: 'c', label: 'Level trigger with a DC threshold' },
      { id: 'd', label: 'No triggering is being used' }
    ],
    explanation: 'With rising-edge triggering on a fixed-frequency PWM signal, the sweep always starts at the same rising edge. Since the duty cycle changes, the falling edge position varies relative to the trigger point, making it appear to wander while the rising edge stays perfectly stable.'
  },
  {
    scenario: 'An engineer is viewing a burst of 5 sine wave cycles that repeats every 10 ms. With normal triggering, the display is chaotic - sometimes showing the middle of the burst, sometimes the gap between bursts.',
    question: 'Which trigger feature would help capture the burst cleanly?',
    options: [
      { id: 'a', label: 'Increasing the trigger level above the signal peak' },
      { id: 'b', label: 'Switching to falling-edge trigger' },
      { id: 'c', label: 'Using trigger holdoff to ignore triggers during the burst, re-arming only for the next burst start', correct: true },
      { id: 'd', label: 'Decreasing the time/div setting' }
    ],
    explanation: 'Trigger holdoff sets a time after each trigger during which new trigger events are ignored. By setting holdoff slightly less than the burst repetition period, the scope ignores triggers within the burst and only triggers on the first cycle of each new burst, giving a stable display.'
  },
  {
    scenario: 'A scope displays an AM-modulated carrier. The carrier amplitude varies between 1V and 3V. Edge triggering at 2V sometimes catches the carrier, sometimes the envelope.',
    question: 'Why does the display appear unstable with a fixed trigger level on an AM signal?',
    options: [
      { id: 'a', label: 'AM signals cannot be displayed on oscilloscopes' },
      { id: 'b', label: 'The varying amplitude means the trigger level crosses different parts of the waveform at different times, causing inconsistent trigger points', correct: true },
      { id: 'c', label: 'The carrier frequency is changing' },
      { id: 'd', label: 'The scope bandwidth is too low for AM signals' }
    ],
    explanation: 'In an AM signal, the carrier amplitude changes with the modulation. A fixed trigger level (e.g., 2V) will cross different phases of the carrier depending on the instantaneous envelope amplitude. This inconsistency causes the sweep to start at varying points, making the display unstable.'
  },
  {
    scenario: 'A scope is set to 1 ms/div time base with edge trigger. When the user changes to 10 us/div, the previously stable sine wave display becomes jittery.',
    question: 'What most likely happened?',
    options: [
      { id: 'a', label: 'The sine wave frequency changed' },
      { id: 'b', label: 'At the faster timebase, trigger jitter that was invisible at 1 ms/div now takes up a significant fraction of the display', correct: true },
      { id: 'c', label: 'The probe was accidentally disconnected' },
      { id: 'd', label: 'Digital scopes cannot display at 10 us/div' }
    ],
    explanation: 'Trigger jitter (small timing variations in the trigger point) always exists. At a slow timebase (1 ms/div), a few nanoseconds of jitter is negligible. At a fast timebase (10 us/div), the same jitter becomes a visible fraction of the screen, making the waveform appear to jitter horizontally.'
  },
  {
    scenario: 'An engineer uses single-sweep mode to capture a one-time transient event. The scope is armed and waiting, but when the event occurs, nothing is captured.',
    question: 'What is the most likely cause?',
    options: [
      { id: 'a', label: 'Single-sweep mode only works for repetitive signals' },
      { id: 'b', label: 'The trigger level is set where the transient never crosses it, so the scope never triggers', correct: true },
      { id: 'c', label: 'Transient events are too fast for oscilloscopes' },
      { id: 'd', label: 'The scope was in auto-trigger mode instead of normal mode' }
    ],
    explanation: 'In single-sweep mode, the scope waits for exactly one trigger event and then stops. If the trigger level is set incorrectly (e.g., the transient pulse never reaches that voltage), the scope never triggers and the event is missed. Proper trigger level estimation is critical for capturing transients.'
  },
  {
    scenario: 'A scope displays a clean 50 Hz sine wave using AC coupling on the trigger. The engineer switches trigger coupling to DC. The display becomes unstable.',
    question: 'Why did DC trigger coupling destabilize the display?',
    options: [
      { id: 'a', label: 'DC coupling amplifies noise' },
      { id: 'b', label: 'A DC offset in the signal shifted the waveform away from the trigger level, causing missed triggers', correct: true },
      { id: 'c', label: 'DC coupling changes the signal frequency' },
      { id: 'd', label: 'DC coupling inverts the trigger slope' }
    ],
    explanation: 'AC trigger coupling removes DC offset, centering the signal around the trigger level. When switching to DC coupling, any DC offset shifts the signal, potentially moving it away from the trigger level. The signal no longer crosses the trigger level reliably, causing unstable triggering.'
  },
  {
    scenario: 'Two oscilloscope channels show different signals. Channel 1 has a clean 1 kHz clock, and Channel 2 has a data signal synchronized to that clock. The engineer wants to see how data changes relative to the clock.',
    question: 'Which trigger configuration would best show this relationship?',
    options: [
      { id: 'a', label: 'Trigger on Channel 2 (the data signal)' },
      { id: 'b', label: 'Use auto-trigger mode and let the scope decide' },
      { id: 'c', label: 'Trigger on Channel 1 (the clock) with rising edge, so the clock is stable and data timing is visible relative to it', correct: true },
      { id: 'd', label: 'Alternate triggering between both channels' }
    ],
    explanation: 'By triggering on the clock signal, the clock edges are locked on screen. The data signal, being synchronized to the clock, will also appear stable but offset by its setup/hold timing. This reveals the timing relationship between clock and data, which is critical for debugging digital interfaces.'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '🔬',
    title: 'Debugging High-Speed Digital Interfaces',
    short: 'Signal integrity analysis',
    tagline: 'Seeing picosecond events at gigahertz speeds',
    description: 'Modern oscilloscopes with advanced triggering capture fleeting signal integrity issues on high-speed buses like PCIe, DDR, and USB. Without proper triggering, these transient glitches would be invisible among billions of normal transitions.',
    connection: 'Edge triggering with precise holdoff lets engineers isolate specific protocol events. Pattern triggering can wait for a specific bit sequence, while violation triggering catches setup/hold timing violations automatically.',
    howItWorks: 'The oscilloscope trigger system compares the incoming signal to the configured trigger condition in real-time hardware. When a match occurs, the scope captures a window of data around the trigger point, often using deep memory to store millions of samples per acquisition.',
    stats: [
      { value: '100+ GHz', label: 'Scope bandwidth', icon: '📊' },
      { value: '256 Gsa/s', label: 'Sample rate', icon: '⚡' },
      { value: '< 1 ps', label: 'Trigger jitter', icon: '🎯' }
    ],
    examples: ['PCIe 6.0 compliance testing', 'DDR5 signal integrity', 'USB4 eye diagrams', 'Ethernet 800G debug'],
    companies: ['Keysight', 'Tektronix', 'Rohde & Schwarz', 'Teledyne LeCroy'],
    futureImpact: 'Next-generation scopes will integrate AI-assisted triggering that automatically identifies anomalies without manual trigger configuration.',
    color: '#06B6D4'
  },
  {
    icon: '🏥',
    title: 'Medical Device Signal Monitoring',
    short: 'Cardiac and neural waveforms',
    tagline: 'Every heartbeat matters',
    description: 'ECG monitors and EEG systems use triggering concepts identical to oscilloscopes. QRS complex detection in ECG machines is essentially edge/level triggering on a biological signal - finding the sharp R-wave peak to synchronize the display.',
    connection: 'Just as an oscilloscope triggers on a voltage threshold, an ECG triggers on the R-wave amplitude. The trigger level adapts to varying signal strength, and holdoff prevents double-triggering on T-waves. Arrhythmia detection uses pattern-matching triggers.',
    howItWorks: 'Adaptive threshold algorithms continuously adjust the trigger level based on recent peak amplitudes. Digital filtering removes baseline wander (like AC trigger coupling), and refractory periods (holdoff) prevent false triggers from T-waves or noise.',
    stats: [
      { value: '0.05 Hz', label: 'ECG low frequency', icon: '💓' },
      { value: '150 Hz', label: 'ECG high frequency', icon: '📈' },
      { value: '1 ms', label: 'QRS duration', icon: '⏱️' }
    ],
    examples: ['ICU patient monitors', 'Holter monitors', 'Fetal heart monitors', 'Sleep study EEG'],
    companies: ['Medtronic', 'GE Healthcare', 'Philips', 'Siemens Healthineers'],
    futureImpact: 'Wearable health devices are bringing real-time triggered signal analysis to consumer products, enabling continuous cardiac monitoring.',
    color: '#EF4444'
  },
  {
    icon: '📡',
    title: 'Radar and Sonar Systems',
    short: 'Pulse detection and synchronization',
    tagline: 'Timing is everything in detection',
    description: 'Radar receivers must trigger on return pulses to measure distance and velocity. The trigger system must distinguish genuine return echoes from clutter and noise - analogous to setting proper trigger level and using holdoff to ignore subsequent reflections.',
    connection: 'A radar transmit pulse acts as the trigger source (like an external trigger). The receiver then waits for return echoes, with range gating (holdoff) controlling which time window to examine. Multiple trigger conditions combine to reject false targets.',
    howItWorks: 'Constant false alarm rate (CFAR) processing adaptively sets the trigger threshold based on surrounding noise levels - similar to how an oscilloscope with auto-trigger adjusts to the signal. Moving target indication (MTI) uses coherent triggering to detect Doppler shifts.',
    stats: [
      { value: '300,000 km/s', label: 'Signal speed', icon: '🚀' },
      { value: '1 ns = 15 cm', label: 'Range resolution', icon: '📐' },
      { value: '-120 dBm', label: 'Receiver sensitivity', icon: '📡' }
    ],
    examples: ['Air traffic control', 'Weather radar', 'Automotive ADAS', 'Marine navigation'],
    companies: ['Raytheon', 'Northrop Grumman', 'Continental', 'Infineon'],
    futureImpact: 'Solid-state phased array radars use digital triggering across thousands of elements simultaneously, enabling unprecedented angular resolution.',
    color: '#F59E0B'
  },
  {
    icon: '🎵',
    title: 'Audio and Acoustics Analysis',
    short: 'Sound waveform capture',
    tagline: 'Capturing the physics of sound',
    description: 'Audio engineers use triggered oscilloscope displays to analyze speaker response, microphone characteristics, and room acoustics. Trigger synchronization is essential for comparing input stimulus with output response to measure delay and distortion.',
    connection: 'When testing a speaker with a tone burst, the trigger synchronizes the display to the electrical input signal. This reveals the mechanical delay before sound emission, resonance ringing after the burst ends, and frequency-dependent behavior - all visible because triggering keeps the display stable.',
    howItWorks: 'External triggering from the signal generator synchronizes the scope display. Averaging mode with stable triggering reduces noise, revealing subtle distortion artifacts. Holdoff matches the measurement repetition rate for clean burst analysis.',
    stats: [
      { value: '20 Hz-20 kHz', label: 'Audio bandwidth', icon: '🎶' },
      { value: '< 0.001%', label: 'THD measurement', icon: '📊' },
      { value: '120+ dB', label: 'Dynamic range', icon: '🔊' }
    ],
    examples: ['Speaker design', 'Microphone testing', 'Room acoustics', 'Noise cancellation R&D'],
    companies: ['Audio Precision', 'Bruel & Kjaer', 'NTi Audio', 'GRAS'],
    futureImpact: 'Spatial audio for AR/VR requires multi-channel triggered measurement systems to characterize head-related transfer functions.',
    color: '#8B5CF6'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// PLAY PHASE SCENARIOS
// ─────────────────────────────────────────────────────────────────────────────
interface PlayScenario {
  name: string;
  signalType: 'sine' | 'square' | 'complex';
  frequency: number;
  amplitude: number;
  dcOffset: number;
  description: string;
  goal: string;
  checkTriggered: (trigLevel: number, trigType: string, slope: string) => boolean;
}

const playScenarios: PlayScenario[] = [
  {
    name: 'Basic Sine Wave',
    signalType: 'sine',
    frequency: 1000,
    amplitude: 2.0,
    dcOffset: 0,
    description: 'A clean 1 kHz sine wave, 4 Vpp centered at 0V.',
    goal: 'Set trigger level within the signal and use rising edge to stabilize.',
    checkTriggered: (level, type, _slope) => type === 'edge' && Math.abs(level) < 2.0,
  },
  {
    name: 'DC-Offset Square Wave',
    signalType: 'square',
    frequency: 500,
    amplitude: 1.5,
    dcOffset: 2.0,
    description: 'A 500 Hz square wave sitting on a 2V DC offset (ranges 0.5V to 3.5V).',
    goal: 'Adjust trigger level between 0.5V and 3.5V to capture the signal.',
    checkTriggered: (level, type, _slope) => type === 'edge' && level > 0.5 && level < 3.5,
  },
  {
    name: 'Low-Amplitude Signal',
    signalType: 'sine',
    frequency: 2000,
    amplitude: 0.5,
    dcOffset: 0,
    description: 'A small 2 kHz sine wave, only 1 Vpp. Easy to set trigger too high.',
    goal: 'Carefully set the trigger level within -0.5V to +0.5V range.',
    checkTriggered: (level, type, _slope) => type === 'edge' && Math.abs(level) < 0.5,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TWIST PLAY SCENARIOS (complex/burst signals requiring holdoff)
// ─────────────────────────────────────────────────────────────────────────────
interface TwistScenario {
  name: string;
  signalType: 'burst' | 'am';
  description: string;
  goal: string;
  checkTriggered: (trigLevel: number, holdoff: number, trigType: string) => boolean;
}

const twistScenarios: TwistScenario[] = [
  {
    name: 'Burst Signal',
    signalType: 'burst',
    description: 'A burst of 5 sine cycles repeating every 10 ms. Normal triggering catches random cycles.',
    goal: 'Use holdoff (> 8 ms) to trigger only on the first cycle of each burst.',
    checkTriggered: (_level, holdoff, type) => type === 'edge' && holdoff >= 8.0,
  },
  {
    name: 'AM Modulated Carrier',
    signalType: 'am',
    description: 'A carrier modulated at 50% AM. The envelope causes trigger level to cross at varying phases.',
    goal: 'Use holdoff matching the modulation period to stabilize the display.',
    checkTriggered: (_level, holdoff, type) => type === 'edge' && holdoff >= 4.0,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const OscilloscopeTriggererRenderer: React.FC<OscilloscopeTriggererRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const { isMobile } = useViewport();

  // Prediction states
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);

  // Play state
  const [triggerType, setTriggerType] = useState<'edge' | 'level'>('edge');
  const [triggerLevel, setTriggerLevel] = useState(0);
  const [triggerSlope, setTriggerSlope] = useState<'rising' | 'falling'>('rising');
  const [holdoff, setHoldoff] = useState(0);
  const [playScenarioIndex, setPlayScenarioIndex] = useState(0);
  const [completedScenarios, setCompletedScenarios] = useState<boolean[]>([false, false, false]);

  // Twist play state
  const [twistScenarioIndex, setTwistScenarioIndex] = useState(0);
  const [completedTwistScenarios, setCompletedTwistScenarios] = useState<boolean[]>([false, false]);

  // Animation state
  const [animationFrame, setAnimationFrame] = useState(0);
  const [jitterSeed, setJitterSeed] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Navigation ref
  const isNavigating = useRef(false);

  // Colors (dark theme)
  const colors = {
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgCard: '#0f172a',
    accent: '#06B6D4',
    accentGlow: 'rgba(6,182,212,0.3)',
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    textPrimary: '#f8fafc',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#334155',
    scopeBg: '#0a1628',
    scopeGrid: 'rgba(6,182,212,0.15)',
    scopeTrace: '#22d3ee',
    scopeTraceDim: 'rgba(34,211,238,0.3)',
    triggerLine: '#f59e0b',
    holdoffShade: 'rgba(245,158,11,0.12)',
  };

  const typo = {
    h1: { fontSize: isMobile ? '26px' : '34px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '21px' : '26px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '17px' : '21px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.7 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
      setJitterSeed(Math.random());
    }, 60);
    return () => clearInterval(timer);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Event emission
  // ─────────────────────────────────────────────────────────────────────────
  const emitEvent = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown>) => {
    onGameEvent?.({
      eventType,
      gameType: 'oscilloscope_triggering',
      gameTitle: 'Oscilloscope Triggering',
      details,
      timestamp: Date.now(),
    });
  }, [onGameEvent]);

  // ─────────────────────────────────────────────────────────────────────────
  // Phase navigation
  // ─────────────────────────────────────────────────────────────────────────
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Explore',
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
    emitEvent('phase_changed', { from: phase, to: p });
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [phase, emitEvent]);

  const nextPhase = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) goToPhase(phaseOrder[idx + 1]);
  }, [phase, goToPhase]);

  // ─────────────────────────────────────────────────────────────────────────
  // Waveform generation utilities
  // ─────────────────────────────────────────────────────────────────────────
  const generateWaveform = useCallback((
    signalType: string,
    freq: number,
    amp: number,
    dcOff: number,
    numPoints: number,
    timeSpan: number,
    triggered: boolean,
    trigLvl: number,
    slope: string,
    holdoffMs: number,
  ): number[] => {
    const points: number[] = [];
    const dt = timeSpan / numPoints;

    // When untriggered, add a random phase offset to simulate jitter
    const phaseOffset = triggered ? 0 : jitterSeed * Math.PI * 2;

    // Compute trigger offset: shift waveform so trigger point is at ~25% of display
    let triggerTimeOffset = 0;
    if (triggered && signalType !== 'burst' && signalType !== 'am') {
      // For a sine wave, find where it crosses trigLvl with the correct slope
      const normalizedLevel = (trigLvl - dcOff) / amp;
      const clampedLevel = Math.max(-1, Math.min(1, normalizedLevel));
      const baseAngle = Math.asin(clampedLevel);
      triggerTimeOffset = slope === 'rising'
        ? baseAngle / (2 * Math.PI * freq)
        : (Math.PI - baseAngle) / (2 * Math.PI * freq);
    }

    const tStart = -triggerTimeOffset - timeSpan * 0.25;

    for (let i = 0; i < numPoints; i++) {
      const t = tStart + i * dt + (triggered ? 0 : phaseOffset / (2 * Math.PI * freq));
      let value = 0;

      switch (signalType) {
        case 'sine':
          value = dcOff + amp * Math.sin(2 * Math.PI * freq * t);
          break;
        case 'square': {
          const phase = (freq * t) % 1;
          value = dcOff + amp * (phase < 0.5 ? 1 : -1);
          break;
        }
        case 'complex': {
          value = dcOff + amp * (
            0.6 * Math.sin(2 * Math.PI * freq * t) +
            0.3 * Math.sin(2 * Math.PI * freq * 3 * t) +
            0.1 * Math.sin(2 * Math.PI * freq * 5 * t)
          );
          break;
        }
        case 'burst': {
          const burstPeriod = 0.01; // 10ms
          const burstDuration = 0.005; // 5 cycles of 1kHz
          const tMod = ((t % burstPeriod) + burstPeriod) % burstPeriod;
          value = tMod < burstDuration
            ? amp * Math.sin(2 * Math.PI * 1000 * tMod)
            : 0;
          break;
        }
        case 'am': {
          const carrierFreq = 5000;
          const modFreq = 200;
          const modIndex = 0.5;
          const envelope = 1 + modIndex * Math.sin(2 * Math.PI * modFreq * t);
          value = amp * envelope * Math.sin(2 * Math.PI * carrierFreq * t);
          break;
        }
        default:
          value = amp * Math.sin(2 * Math.PI * freq * t);
      }

      // Add small noise for realism when untriggered
      if (!triggered) {
        value += (Math.random() - 0.5) * amp * 0.05;
      }

      points.push(value);
    }
    return points;
  }, [jitterSeed]);

  // ─────────────────────────────────────────────────────────────────────────
  // SVG Oscilloscope Visualization
  // ─────────────────────────────────────────────────────────────────────────
  const renderScopeDisplay = useCallback((
    signalType: string,
    freq: number,
    amp: number,
    dcOff: number,
    triggered: boolean,
    showHoldoff: boolean,
    customLabel?: string,
  ) => {
    const svgW = isMobile ? 340 : 440;
    const svgH = isMobile ? 260 : 300;
    const pad = { top: 30, right: 16, bottom: 36, left: 46 };
    const plotW = svgW - pad.left - pad.right;
    const plotH = svgH - pad.top - pad.bottom;

    const numPoints = 300;
    const periods = 4;
    const timeSpan = periods / Math.max(freq, 1);

    const waveData = generateWaveform(
      signalType, freq, amp, dcOff, numPoints, timeSpan,
      triggered, triggerLevel, triggerSlope, holdoff
    );

    // Y-axis scaling
    const yMax = Math.max(Math.abs(amp + dcOff), Math.abs(-amp + dcOff), Math.abs(triggerLevel)) * 1.3 + 0.5;
    const yMin = -yMax + dcOff * 0;
    const yRange = yMax * 2;

    const toSvgX = (i: number) => pad.left + (i / numPoints) * plotW;
    const toSvgY = (v: number) => pad.top + plotH / 2 - (v / yRange) * plotH;

    // Build waveform path
    let pathD = '';
    waveData.forEach((v, i) => {
      const x = toSvgX(i);
      const y = Math.max(pad.top, Math.min(pad.top + plotH, toSvgY(v)));
      pathD += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });

    // Trigger level in SVG coords
    const trigY = toSvgY(triggerLevel);

    // Grid lines
    const hGridCount = 8;
    const vGridCount = 10;

    // Trigger point marker (at 25% of display)
    const trigPointX = pad.left + plotW * 0.25;

    // Holdoff region
    const holdoffFraction = Math.min(holdoff / (timeSpan * 1000), 0.6);
    const holdoffWidth = holdoffFraction * plotW;

    // Time/div label
    const timePerDiv = (timeSpan / vGridCount) * 1000;
    const timeDivLabel = timePerDiv >= 1 ? `${timePerDiv.toFixed(1)} ms/div` : `${(timePerDiv * 1000).toFixed(0)} us/div`;

    // Volts/div label
    const voltsPerDiv = yRange / hGridCount;
    const voltsDivLabel = voltsPerDiv >= 1 ? `${voltsPerDiv.toFixed(1)} V/div` : `${(voltsPerDiv * 1000).toFixed(0)} mV/div`;

    return (
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ background: colors.scopeBg, borderRadius: '10px', border: `1px solid ${colors.border}`, maxWidth: '100%' }}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Oscilloscope display showing ${signalType} waveform, ${triggered ? 'triggered' : 'untriggered'}`}
      >
        <defs>
          <filter id="traceGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="traceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.scopeTrace} stopOpacity="0.8" />
            <stop offset="50%" stopColor="#67e8f9" stopOpacity="1" />
            <stop offset="100%" stopColor={colors.scopeTrace} stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Background gradient */}
        <rect x="0" y="0" width={svgW} height={svgH} fill={colors.scopeBg} rx="10" />

        {/* Grid */}
        {Array.from({ length: hGridCount + 1 }).map((_, i) => (
          <line
            key={`hg-${i}`}
            x1={pad.left} y1={pad.top + (i * plotH) / hGridCount}
            x2={pad.left + plotW} y2={pad.top + (i * plotH) / hGridCount}
            stroke={colors.scopeGrid}
            strokeWidth={i === hGridCount / 2 ? 0.8 : 0.4}
          />
        ))}
        {Array.from({ length: vGridCount + 1 }).map((_, i) => (
          <line
            key={`vg-${i}`}
            x1={pad.left + (i * plotW) / vGridCount} y1={pad.top}
            x2={pad.left + (i * plotW) / vGridCount} y2={pad.top + plotH}
            stroke={colors.scopeGrid}
            strokeWidth={i === vGridCount / 2 ? 0.8 : 0.4}
          />
        ))}

        {/* Holdoff region */}
        {showHoldoff && holdoff > 0 && (
          <rect
            x={trigPointX}
            y={pad.top}
            width={Math.min(holdoffWidth, pad.left + plotW - trigPointX)}
            height={plotH}
            fill={colors.holdoffShade}
          />
        )}

        {/* Trigger level line */}
        <line
          x1={pad.left} y1={trigY}
          x2={pad.left + plotW} y2={trigY}
          stroke={colors.triggerLine}
          strokeWidth="1"
          strokeDasharray="6,3"
          opacity={0.8}
        />
        <text
          x={pad.left - 4}
          y={trigY + 4}
          fill={colors.triggerLine}
          fontSize="9"
          textAnchor="end"
          fontWeight="600"
        >
          T
        </text>

        {/* Trigger point marker */}
        {triggered && (
          <g>
            <circle cx={trigPointX} cy={trigY} r={4} fill={colors.triggerLine} opacity={0.9} />
            <line
              x1={trigPointX} y1={pad.top}
              x2={trigPointX} y2={pad.top + plotH}
              stroke={colors.triggerLine}
              strokeWidth="0.5"
              strokeDasharray="2,4"
              opacity={0.4}
            />
            {/* Slope arrow */}
            <text
              x={trigPointX + 8}
              y={trigY - 8}
              fill={colors.triggerLine}
              fontSize="12"
              fontWeight="700"
            >
              {triggerSlope === 'rising' ? '\u2191' : '\u2193'}
            </text>
          </g>
        )}

        {/* Waveform trace */}
        <path
          d={pathD}
          fill="none"
          stroke="url(#traceGrad)"
          strokeWidth="2"
          filter="url(#traceGlow)"
          strokeLinejoin="round"
        />

        {/* Status indicator */}
        <rect
          x={pad.left + 4}
          y={pad.top + 4}
          width={triggered ? 52 : 72}
          height={18}
          rx={4}
          fill={triggered ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}
          stroke={triggered ? colors.success : colors.error}
          strokeWidth="0.5"
        />
        <text
          x={pad.left + (triggered ? 30 : 40)}
          y={pad.top + 16}
          fill={triggered ? colors.success : colors.error}
          fontSize="10"
          fontWeight="700"
          textAnchor="middle"
        >
          {triggered ? 'TRIG\'D' : 'UNTRIG\'D'}
        </text>

        {/* Labels */}
        <text x={pad.left + plotW - 4} y={svgH - 6} fill={colors.textMuted} fontSize="9" textAnchor="end">
          {timeDivLabel}
        </text>
        <text x={pad.left + 4} y={svgH - 6} fill={colors.textMuted} fontSize="9">
          {voltsDivLabel}
        </text>

        {/* Holdoff label */}
        {showHoldoff && holdoff > 0 && (
          <text
            x={trigPointX + holdoffWidth / 2}
            y={pad.top + plotH + 14}
            fill={colors.triggerLine}
            fontSize="9"
            textAnchor="middle"
            opacity={0.8}
          >
            Holdoff: {holdoff.toFixed(1)} ms
          </text>
        )}

        {/* Custom label */}
        {customLabel && (
          <text x={svgW / 2} y={16} fill={colors.textSecondary} fontSize="11" textAnchor="middle" fontWeight="600">
            {customLabel}
          </text>
        )}
      </svg>
    );
  }, [isMobile, colors, triggerLevel, triggerSlope, holdoff, generateWaveform, jitterSeed]);

  // ─────────────────────────────────────────────────────────────────────────
  // Shared UI Components
  // ─────────────────────────────────────────────────────────────────────────
  const primaryBtnStyle: React.CSSProperties = {
    padding: '14px 28px',
    borderRadius: '10px',
    border: 'none',
    background: `linear-gradient(135deg, ${colors.accent}, #0891b2)`,
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '15px',
    cursor: 'pointer',
    minHeight: '44px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    transition: 'all 0.2s ease',
  };

  const secondaryBtnStyle: React.CSSProperties = {
    padding: '14px 28px',
    borderRadius: '10px',
    border: `1px solid ${colors.border}`,
    background: colors.bgSecondary,
    color: colors.textSecondary,
    fontWeight: 600,
    fontSize: '15px',
    cursor: 'pointer',
    minHeight: '44px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    transition: 'all 0.2s ease',
  };

  const cardStyle: React.CSSProperties = {
    background: colors.bgSecondary,
    borderRadius: '14px',
    padding: isMobile ? '16px' : '24px',
    border: `1px solid ${colors.border}`,
    marginBottom: '16px',
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Navigation Dots
  // ─────────────────────────────────────────────────────────────────────────
  const renderNavDots = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(15,23,42,0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${colors.border}`,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
      }}>
        {phaseOrder.map((p, i) => (
          <button
            key={p}
            onClick={() => goToPhase(p)}
            title={phaseLabels[p]}
            style={{
              width: i === currentIdx ? '24px' : '10px',
              height: '10px',
              borderRadius: '5px',
              border: 'none',
              background: i === currentIdx
                ? colors.accent
                : i < currentIdx
                  ? colors.success
                  : colors.border,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              padding: 0,
            }}
            aria-label={`Go to ${phaseLabels[p]}`}
          />
        ))}
        <span style={{ marginLeft: '12px', ...typo.small, color: colors.textMuted }}>
          {phaseLabels[phase]}
        </span>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Controls panel for play phases
  // ─────────────────────────────────────────────────────────────────────────
  const renderControls = (showHoldoffControl: boolean) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: isMobile ? '100%' : '260px' }}>
      {/* Trigger type */}
      <div>
        <label style={{ ...typo.small, color: colors.textMuted, display: 'block', marginBottom: '6px' }}>Trigger Type</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['edge', 'level'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTriggerType(t); playSound('click'); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: `1px solid ${triggerType === t ? colors.accent : colors.border}`,
                background: triggerType === t ? `${colors.accent}22` : colors.bgPrimary,
                color: triggerType === t ? colors.accent : colors.textMuted,
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                textTransform: 'capitalize',
                minHeight: '36px',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Trigger Level */}
      <div>
        <label style={{ ...typo.small, color: colors.textMuted, display: 'block', marginBottom: '6px' }}>
          Trigger Level: <span style={{ color: colors.triggerLine, fontWeight: 700 }}>{triggerLevel.toFixed(2)} V</span>
        </label>
        <input
          type="range"
          min={-5}
          max={5}
          step={0.05}
          value={triggerLevel}
          onChange={e => setTriggerLevel(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: colors.triggerLine }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', ...typo.small, color: colors.textMuted }}>
          <span>-5V</span><span>0V</span><span>+5V</span>
        </div>
      </div>

      {/* Trigger Slope */}
      <div>
        <label style={{ ...typo.small, color: colors.textMuted, display: 'block', marginBottom: '6px' }}>Trigger Slope</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['rising', 'falling'] as const).map(s => (
            <button
              key={s}
              onClick={() => { setTriggerSlope(s); playSound('click'); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: `1px solid ${triggerSlope === s ? colors.accent : colors.border}`,
                background: triggerSlope === s ? `${colors.accent}22` : colors.bgPrimary,
                color: triggerSlope === s ? colors.accent : colors.textMuted,
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                minHeight: '36px',
              }}
            >
              {s === 'rising' ? '\u2191 Rising' : '\u2193 Falling'}
            </button>
          ))}
        </div>
      </div>

      {/* Holdoff */}
      {showHoldoffControl && (
        <div>
          <label style={{ ...typo.small, color: colors.textMuted, display: 'block', marginBottom: '6px' }}>
            Holdoff: <span style={{ color: colors.triggerLine, fontWeight: 700 }}>{holdoff.toFixed(1)} ms</span>
          </label>
          <input
            type="range"
            min={0}
            max={20}
            step={0.5}
            value={holdoff}
            onChange={e => setHoldoff(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: colors.triggerLine }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', ...typo.small, color: colors.textMuted }}>
            <span>0 ms</span><span>10 ms</span><span>20 ms</span>
          </div>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Side-by-side layout wrapper
  // ─────────────────────────────────────────────────────────────────────────
  const renderSideBySide = (svgContent: React.ReactNode, controlsContent: React.ReactNode) => (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: '20px',
      alignItems: isMobile ? 'center' : 'flex-start',
    }}>
      <div style={{ flex: isMobile ? undefined : '1 1 55%', minWidth: 0 }}>
        {svgContent}
      </div>
      <div style={{ flex: isMobile ? undefined : '1 1 45%', width: isMobile ? '100%' : undefined }}>
        {controlsContent}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Letter grade helper
  // ─────────────────────────────────────────────────────────────────────────
  const getLetterGrade = (score: number, total: number): string => {
    const pct = (score / total) * 100;
    if (pct >= 97) return 'A+';
    if (pct >= 93) return 'A';
    if (pct >= 90) return 'A-';
    if (pct >= 87) return 'B+';
    if (pct >= 83) return 'B';
    if (pct >= 80) return 'B-';
    if (pct >= 77) return 'C+';
    if (pct >= 73) return 'C';
    if (pct >= 70) return 'C-';
    if (pct >= 60) return 'D';
    return 'F';
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HOOK PHASE
  // ═══════════════════════════════════════════════════════════════════════════
  const renderHook = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '12px' }}>
        Why Does Your Oscilloscope Display Look Like a Mess?
      </h1>
      <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '20px' }}>
        You connect a signal to your oscilloscope and expect to see a clean, stable waveform. Instead, you see something like this:
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        {renderScopeDisplay('sine', 1000, 2.0, 0, false, false, 'Untriggered Display')}
      </div>

      <div style={{ ...cardStyle }}>
        <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '10px' }}>
          The Problem: No Stable Reference Point
        </h3>
        <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
          An oscilloscope sweeps a beam across the screen repeatedly. Without triggering, each sweep starts at a <strong style={{ color: colors.textPrimary }}>random point</strong> on the waveform. The overlapping, misaligned sweeps create a jittery, unreadable mess.
        </p>
      </div>

      <div style={{ ...cardStyle }}>
        <h3 style={{ ...typo.h3, color: colors.success, marginBottom: '10px' }}>
          The Solution: Triggering
        </h3>
        <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
          <strong style={{ color: colors.textPrimary }}>Triggering</strong> tells the scope to start each sweep at the <em>same point</em> on the waveform. When the signal crosses a specific voltage level in a specific direction, the sweep begins. Every sweep aligns perfectly, and you see a stable, clean trace.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        {renderScopeDisplay('sine', 1000, 2.0, 0, true, false, 'Properly Triggered Display')}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
        <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryBtnStyle}>
          Let&apos;s Learn Triggering →
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PREDICT PHASE
  // ═══════════════════════════════════════════════════════════════════════════
  const renderPredict = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
        Make a Prediction
      </h2>
      <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '20px' }}>
        Imagine a 4 Vpp sine wave centered at 0V (ranges from -2V to +2V). The oscilloscope is set to edge trigger on the rising slope.
      </p>

      <div style={{ ...cardStyle, borderLeft: `4px solid ${colors.accent}` }}>
        <p style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600, marginBottom: '12px' }}>
          What happens if you set the trigger level to +3V (above the signal peak)?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { id: 'stable', label: 'The waveform will still be perfectly stable' },
            { id: 'unstable', label: 'The waveform will be jittery/unstable because the signal never reaches +3V to trigger' },
            { id: 'flat', label: 'The display will show a flat line at +3V' },
            { id: 'inverted', label: 'The waveform will appear inverted' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => {
                setPrediction(opt.id);
                playSound('click');
                emitEvent('prediction_made', { prediction: opt.id });
              }}
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                background: prediction === opt.id ? `${colors.accent}15` : colors.bgPrimary,
                color: prediction === opt.id ? colors.textPrimary : colors.textSecondary,
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                lineHeight: 1.5,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                minHeight: '44px',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {prediction && (
        <div style={{
          ...cardStyle,
          borderLeft: `4px solid ${prediction === 'unstable' ? colors.success : colors.warning}`,
          marginTop: '16px',
        }}>
          {prediction === 'unstable' ? (
            <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
              Correct! If the trigger level is above the signal peak, the scope never sees a trigger event. Without triggering, the display is unstable. Let&apos;s experiment with this.
            </p>
          ) : (
            <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
              Not quite. The signal peaks at +2V and never reaches +3V. Since the waveform never crosses the trigger level, the scope cannot trigger, and the display will be unstable. Let&apos;s explore this interactively.
            </p>
          )}
        </div>
      )}

      {prediction && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
          <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryBtnStyle}>
            Try It Yourself →
          </button>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PLAY PHASE
  // ═══════════════════════════════════════════════════════════════════════════
  const renderPlay = () => {
    const scenario = playScenarios[playScenarioIndex];
    const isTriggered = scenario.checkTriggered(triggerLevel, triggerType, triggerSlope);

    // Check and mark completed
    if (isTriggered && !completedScenarios[playScenarioIndex]) {
      const updated = [...completedScenarios];
      updated[playScenarioIndex] = true;
      // Use a timeout to avoid setState during render
      setTimeout(() => setCompletedScenarios(updated), 0);
    }

    const allCompleted = completedScenarios.every(Boolean);

    return (
      <div style={{ padding: isMobile ? '16px' : '24px' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
          Interactive Oscilloscope
        </h2>
        <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '6px' }}>
          Adjust the controls to get a stable, triggered display for each scenario.
        </p>

        {/* Scenario tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {playScenarios.map((s, i) => (
            <button
              key={i}
              onClick={() => { setPlayScenarioIndex(i); playSound('click'); }}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: `1px solid ${i === playScenarioIndex ? colors.accent : colors.border}`,
                background: completedScenarios[i]
                  ? `${colors.success}22`
                  : i === playScenarioIndex ? `${colors.accent}22` : colors.bgPrimary,
                color: completedScenarios[i] ? colors.success : i === playScenarioIndex ? colors.accent : colors.textMuted,
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                minHeight: '36px',
              }}
            >
              {completedScenarios[i] ? '\u2713 ' : ''}{s.name}
            </button>
          ))}
        </div>

        {/* Scenario description */}
        <div style={{ ...cardStyle, borderLeft: `4px solid ${colors.accent}`, marginBottom: '16px' }}>
          <p style={{ ...typo.small, color: colors.textSecondary, margin: '0 0 6px 0' }}>{scenario.description}</p>
          <p style={{ ...typo.small, color: colors.accent, margin: 0, fontWeight: 600 }}>Goal: {scenario.goal}</p>
        </div>

        {/* Side-by-side: scope + controls */}
        {renderSideBySide(
          renderScopeDisplay(
            scenario.signalType,
            scenario.frequency,
            scenario.amplitude,
            scenario.dcOffset,
            isTriggered,
            false,
            scenario.name
          ),
          <div>
            {renderControls(false)}
            {isTriggered && (
              <div style={{
                marginTop: '14px',
                padding: '12px',
                borderRadius: '10px',
                background: `${colors.success}15`,
                border: `1px solid ${colors.success}40`,
                textAlign: 'center',
              }}>
                <span style={{ color: colors.success, fontWeight: 700, fontSize: '14px' }}>
                  Triggered! Waveform is stable.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Next button */}
        {allCompleted && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
            <button onClick={() => { playSound('complete'); nextPhase(); }} style={primaryBtnStyle}>
              All Scenarios Complete! Continue →
            </button>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // REVIEW PHASE
  // ═══════════════════════════════════════════════════════════════════════════
  const renderReview = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
        Understanding Edge Triggering
      </h2>

      <div style={{ ...cardStyle }}>
        <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '10px' }}>How Edge Triggering Works</h3>
        <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
          The oscilloscope continuously monitors the input signal. When the signal crosses the <strong style={{ color: colors.triggerLine }}>trigger level</strong> in the specified direction (rising or falling), the scope starts a new sweep.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { title: 'Trigger Level', desc: 'The voltage threshold the signal must cross. Must be within the signal range or triggering fails.', color: colors.triggerLine },
            { title: 'Rising Edge', desc: 'Triggers when signal goes from below to above the trigger level. Shows the waveform starting from an upward crossing.', color: colors.success },
            { title: 'Falling Edge', desc: 'Triggers when signal goes from above to below the trigger level. Shifts the displayed waveform by half a cycle on a symmetric signal.', color: colors.error },
            { title: 'Trigger Point', desc: 'The exact moment on screen where the trigger condition is met. Usually positioned at 25-50% across the display.', color: colors.accent },
          ].map((item, i) => (
            <div key={i} style={{ padding: '12px', borderRadius: '8px', background: colors.bgPrimary, borderLeft: `3px solid ${item.color}` }}>
              <p style={{ ...typo.small, color: colors.textPrimary, fontWeight: 700, margin: '0 0 4px 0' }}>{item.title}</p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...cardStyle, borderLeft: `4px solid ${colors.warning}` }}>
        <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '8px' }}>Key Insight</h3>
        <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
          A stable oscilloscope display requires the trigger level to be set where the signal actually crosses it. If the trigger level is outside the signal amplitude range, the scope will never trigger and the display will jitter endlessly.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
        <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryBtnStyle}>
          Ready for the Twist →
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TWIST PREDICT PHASE
  // ═══════════════════════════════════════════════════════════════════════════
  const renderTwistPredict = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
        New Challenge: Complex Signals
      </h2>
      <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '20px' }}>
        Edge triggering works great for simple, repetitive waveforms. But what happens with burst signals or amplitude-modulated carriers?
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        {renderScopeDisplay('burst', 1000, 2.0, 0, false, false, 'Burst Signal - Edge Trigger Only')}
      </div>

      <div style={{ ...cardStyle, borderLeft: `4px solid ${colors.accent}` }}>
        <p style={{ ...typo.body, color: colors.textPrimary, fontWeight: 600, marginBottom: '12px' }}>
          A burst of 5 sine cycles repeats every 10 ms. With normal edge triggering, what do you predict will happen?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { id: 'stable', label: 'The burst will display perfectly with normal edge triggering' },
            { id: 'random', label: 'The trigger catches different cycles within each burst, causing an unstable display' },
            { id: 'holdoff', label: 'We need a new feature - trigger holdoff - to ignore extra trigger events within the burst' },
            { id: 'impossible', label: 'It is impossible to display burst signals on an oscilloscope' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => {
                setTwistPrediction(opt.id);
                playSound('click');
                emitEvent('prediction_made', { phase: 'twist_predict', prediction: opt.id });
              }}
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: `2px solid ${twistPrediction === opt.id ? colors.accent : colors.border}`,
                background: twistPrediction === opt.id ? `${colors.accent}15` : colors.bgPrimary,
                color: twistPrediction === opt.id ? colors.textPrimary : colors.textSecondary,
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                lineHeight: 1.5,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                minHeight: '44px',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {twistPrediction && (
        <div style={{
          ...cardStyle,
          borderLeft: `4px solid ${(twistPrediction === 'random' || twistPrediction === 'holdoff') ? colors.success : colors.warning}`,
          marginTop: '16px',
        }}>
          {(twistPrediction === 'random' || twistPrediction === 'holdoff') ? (
            <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
              Great thinking! Normal edge triggering catches any crossing, so it may trigger on the 1st, 3rd, or 5th cycle randomly.
              <strong> Trigger holdoff</strong> is the solution - it creates a &quot;dead time&quot; after each trigger where new triggers are ignored. Let&apos;s try it!
            </p>
          ) : (
            <p style={{ ...typo.body, color: colors.warning, margin: 0 }}>
              Not quite. The issue is that within each burst, the signal crosses the trigger level multiple times. The scope might trigger on the 1st cycle, then the 3rd, then the 2nd - creating an unstable display.
              We need <strong>trigger holdoff</strong> to solve this. Let&apos;s explore!
            </p>
          )}
        </div>
      )}

      {twistPrediction && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
          <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryBtnStyle}>
            Try Holdoff →
          </button>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TWIST PLAY PHASE
  // ═══════════════════════════════════════════════════════════════════════════
  const renderTwistPlay = () => {
    const scenario = twistScenarios[twistScenarioIndex];
    const isTriggered = scenario.checkTriggered(triggerLevel, holdoff, triggerType);

    if (isTriggered && !completedTwistScenarios[twistScenarioIndex]) {
      const updated = [...completedTwistScenarios];
      updated[twistScenarioIndex] = true;
      setTimeout(() => setCompletedTwistScenarios(updated), 0);
    }

    const allCompleted = completedTwistScenarios.every(Boolean);

    return (
      <div style={{ padding: isMobile ? '16px' : '24px' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px' }}>
          Advanced Triggering with Holdoff
        </h2>
        <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '6px' }}>
          Use the holdoff control to stabilize complex signal displays.
        </p>

        {/* Scenario tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {twistScenarios.map((s, i) => (
            <button
              key={i}
              onClick={() => { setTwistScenarioIndex(i); playSound('click'); }}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: `1px solid ${i === twistScenarioIndex ? colors.accent : colors.border}`,
                background: completedTwistScenarios[i]
                  ? `${colors.success}22`
                  : i === twistScenarioIndex ? `${colors.accent}22` : colors.bgPrimary,
                color: completedTwistScenarios[i] ? colors.success : i === twistScenarioIndex ? colors.accent : colors.textMuted,
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                minHeight: '36px',
              }}
            >
              {completedTwistScenarios[i] ? '\u2713 ' : ''}{s.name}
            </button>
          ))}
        </div>

        {/* Scenario description */}
        <div style={{ ...cardStyle, borderLeft: `4px solid ${colors.warning}`, marginBottom: '16px' }}>
          <p style={{ ...typo.small, color: colors.textSecondary, margin: '0 0 6px 0' }}>{scenario.description}</p>
          <p style={{ ...typo.small, color: colors.warning, margin: 0, fontWeight: 600 }}>Goal: {scenario.goal}</p>
        </div>

        {/* Side-by-side: scope + controls */}
        {renderSideBySide(
          renderScopeDisplay(
            scenario.signalType,
            1000,
            2.0,
            0,
            isTriggered,
            true,
            scenario.name
          ),
          <div>
            {renderControls(true)}
            {isTriggered && (
              <div style={{
                marginTop: '14px',
                padding: '12px',
                borderRadius: '10px',
                background: `${colors.success}15`,
                border: `1px solid ${colors.success}40`,
                textAlign: 'center',
              }}>
                <span style={{ color: colors.success, fontWeight: 700, fontSize: '14px' }}>
                  Holdoff is working! Stable capture achieved.
                </span>
              </div>
            )}
          </div>
        )}

        {allCompleted && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
            <button onClick={() => { playSound('complete'); nextPhase(); }} style={primaryBtnStyle}>
              All Twist Scenarios Complete! Continue →
            </button>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // TWIST REVIEW PHASE
  // ═══════════════════════════════════════════════════════════════════════════
  const renderTwistReview = () => (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
        Understanding Trigger Holdoff
      </h2>

      <div style={{ ...cardStyle }}>
        <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '10px' }}>What is Holdoff?</h3>
        <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '12px' }}>
          After a trigger event, <strong style={{ color: colors.triggerLine }}>holdoff</strong> defines a time period during which the trigger circuit ignores all new trigger events. Only after the holdoff period expires does the scope re-arm and watch for the next trigger.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        {(() => {
          // Show a diagram of holdoff concept
          const w = isMobile ? 340 : 440;
          const h = 140;
          return (
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ background: colors.scopeBg, borderRadius: '10px', border: `1px solid ${colors.border}`, maxWidth: '100%' }}>
              {/* Timeline */}
              <line x1={30} y1={70} x2={w - 20} y2={70} stroke={colors.textMuted} strokeWidth="1" />
              {/* Trigger events */}
              {[60, 120, 180, 280, 340].map((x, i) => (
                <g key={i}>
                  <line x1={x} y1={50} x2={x} y2={90} stroke={i === 0 || i === 3 ? colors.success : colors.error} strokeWidth="2" />
                  <circle cx={x} cy={50} r={3} fill={i === 0 || i === 3 ? colors.success : colors.error} />
                  <text x={x} y={105} fill={i === 0 || i === 3 ? colors.success : colors.error} fontSize="9" textAnchor="middle">
                    {i === 0 || i === 3 ? 'TRIG' : 'SKIP'}
                  </text>
                </g>
              ))}
              {/* Holdoff region 1 */}
              <rect x={60} y={55} width={200} height={30} fill={colors.holdoffShade} rx={4} />
              <text x={160} y={45} fill={colors.triggerLine} fontSize="10" textAnchor="middle" fontWeight="600">
                Holdoff Period
              </text>
              {/* Holdoff region 2 */}
              <rect x={280} y={55} width={w - 300} height={30} fill={colors.holdoffShade} rx={4} />
              {/* Labels */}
              <text x={w / 2} y={130} fill={colors.textMuted} fontSize="10" textAnchor="middle">
                Time →   (triggers within holdoff are ignored)
              </text>
            </svg>
          );
        })()}
      </div>

      <div style={{ ...cardStyle }}>
        <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '10px' }}>When to Use Holdoff</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { title: 'Burst Signals', desc: 'Set holdoff slightly less than the burst repetition period to trigger only on the first cycle of each burst.' },
            { title: 'AM Signals', desc: 'Use holdoff matching the modulation period to trigger consistently at the same point on the envelope.' },
            { title: 'Digital Protocols', desc: 'Set holdoff to match packet/frame timing to trigger on the start of each data packet.' },
            { title: 'Multiple Crossings', desc: 'Any time a signal crosses the trigger level more than once per desired sweep, holdoff prevents false triggers.' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '12px', borderRadius: '8px', background: colors.bgPrimary }}>
              <p style={{ ...typo.small, color: colors.textPrimary, fontWeight: 700, margin: '0 0 4px 0' }}>{item.title}</p>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
        <button onClick={() => { playSound('success'); nextPhase(); }} style={primaryBtnStyle}>
          See Real-World Applications →
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSFER PHASE (uses TransferPhaseView)
  // ═══════════════════════════════════════════════════════════════════════════
  const renderTransfer = () => (
    <TransferPhaseView
      conceptName="Oscilloscope Triggering"
      applications={realWorldApps}
      onComplete={() => goToPhase('test')}
      isMobile={isMobile}
      colors={{
        primary: colors.accent,
        primaryDark: '#0891b2',
        accent: colors.warning,
        secondary: colors.success,
        success: colors.success,
        danger: colors.error,
        bgDark: '#0a0f1a',
        bgCard: colors.bgCard,
        bgCardLight: colors.bgSecondary,
        textPrimary: colors.textPrimary,
        textSecondary: 'rgba(148,163,184,0.85)',
        textMuted: 'rgba(100,116,139,0.7)',
        border: colors.border,
      }}
      playSound={() => playSound('click')}
    />
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST PHASE
  // ═══════════════════════════════════════════════════════════════════════════
  const renderTest = () => {
    if (testSubmitted) {
      // Show score summary then proceed
      const passed = testScore >= 7;
      return (
        <div style={{ padding: isMobile ? '16px' : '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '72px', marginBottom: '16px' }}>
            {passed ? '\uD83C\uDFC6' : '\uD83D\uDCDA'}
          </div>
          <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning, marginBottom: '8px' }}>
            {passed ? 'Excellent!' : 'Keep Studying!'}
          </h2>
          <p style={{ ...typo.h1, color: colors.textPrimary, margin: '12px 0' }}>
            {testScore} / {testQuestions.length}
          </p>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px' }}>
            {passed
              ? 'You have a strong understanding of oscilloscope triggering!'
              : 'Review the concepts and try again to earn mastery.'}
          </p>
          {passed ? (
            <button
              onClick={() => { playSound('complete'); nextPhase(); }}
              style={primaryBtnStyle}
            >
              View Mastery Summary →
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
              style={primaryBtnStyle}
            >
              Review and Try Again
            </button>
          )}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{ padding: isMobile ? '16px' : '24px' }}>
        {/* Progress */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ ...typo.body, color: colors.textSecondary, fontWeight: 600 }}>
            Question {currentQuestion + 1} of {testQuestions.length}
          </span>
          <div style={{ display: 'flex', gap: '5px' }}>
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
          ...cardStyle,
          borderLeft: `3px solid ${colors.accent}`,
          marginBottom: '16px',
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
            {question.scenario}
          </p>
        </div>

        {/* Question */}
        <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
          {question.question}
        </h3>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {question.options.map(opt => (
            <button
              key={opt.id}
              onClick={() => {
                playSound('click');
                const updated = [...testAnswers];
                updated[currentQuestion] = opt.id;
                setTestAnswers(updated);
              }}
              style={{
                background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}20` : colors.bgSecondary,
                border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                borderRadius: '10px',
                padding: '12px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgPrimary,
                color: testAnswers[currentQuestion] === opt.id ? '#ffffff' : colors.textMuted,
                fontSize: '12px',
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {opt.id.toUpperCase()}
              </span>
              <span style={{ color: colors.textPrimary, ...typo.small, lineHeight: 1.5 }}>
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
              style={{ ...secondaryBtnStyle, flex: 1 }}
            >
              Previous
            </button>
          )}
          {currentQuestion < testQuestions.length - 1 ? (
            <button
              onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
              disabled={!testAnswers[currentQuestion]}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                color: '#ffffff',
                cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                fontWeight: 600,
                minHeight: '44px',
                fontSize: '15px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => {
                const score = testAnswers.reduce((acc, ans, i) => {
                  const correct = testQuestions[i].options.find(o => 'correct' in o && o.correct)?.id;
                  return acc + (ans === correct ? 1 : 0);
                }, 0);
                setTestScore(score);
                setTestSubmitted(true);
                emitEvent('game_completed', { score, total: testQuestions.length });
                playSound(score >= 7 ? 'complete' : 'failure');
              }}
              disabled={testAnswers.some(a => a === null)}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                color: '#ffffff',
                cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                fontWeight: 700,
                minHeight: '44px',
                fontSize: '15px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              Submit Test
            </button>
          )}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MASTERY PHASE
  // ═══════════════════════════════════════════════════════════════════════════
  const renderMastery = () => {
    const score = testScore;
    const total = testQuestions.length;
    const grade = getLetterGrade(score, total);

    return (
      <div style={{ padding: isMobile ? '16px' : '24px', paddingBottom: '100px' }}>
        {/* Score Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(34,197,94,0.15))',
          borderRadius: '20px',
          padding: '28px',
          textAlign: 'center',
          marginBottom: '24px',
          border: '2px solid rgba(6,182,212,0.3)',
        }}>
          <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '8px' }}>
            Oscilloscope Triggering Master!
          </h1>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '20px' }}>
            You understand how to tame waveform displays with proper triggering.
          </p>

          <div style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px 36px',
            background: colors.bgPrimary,
            borderRadius: '16px',
            marginBottom: '20px',
          }}>
            <div style={{ color: colors.accent, fontSize: '44px', fontWeight: 800 }}>
              {score}/{total}
            </div>
            <div style={{
              color: score >= 9 ? colors.success : score >= 7 ? colors.accent : colors.warning,
              fontSize: '28px',
              fontWeight: 800,
              marginTop: '4px',
            }}>
              {grade}
            </div>
            <div style={{ color: colors.textMuted, fontSize: '13px', marginTop: '4px' }}>
              Final Score
            </div>
          </div>

          {/* What you learned */}
          <div style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '10px' }}>
              You Mastered:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                'Edge triggering (rising and falling slope)',
                'Setting proper trigger levels within signal range',
                'Trigger holdoff for burst and complex signals',
                'AM signal triggering challenges',
                'Real-world applications of trigger concepts',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: colors.success, fontSize: '14px' }}>{'\u2713'}</span>
                  <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Full Answer Key */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '14px' }}>
            Complete Answer Key
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {testQuestions.map((tq, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const correctOpt = tq.options.find(o => 'correct' in o && o.correct);
              const isCorrect = userAnswer === correctOpt?.id;
              const userOpt = tq.options.find(o => o.id === userAnswer);

              return (
                <div key={qIndex} style={{
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(30,41,59,0.7)',
                  borderLeft: `4px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
                }}>
                  {/* Question text */}
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px', lineHeight: 1.4 }}>
                    <span style={{ fontSize: '16px', marginRight: '6px' }}>{isCorrect ? '\u2705' : '\u274C'}</span>
                    {qIndex + 1}. {tq.question}
                  </p>

                  {/* Wrong answer (red) */}
                  {!isCorrect && userOpt && (
                    <p style={{
                      fontSize: '13px',
                      color: '#fca5a5',
                      marginBottom: '6px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: 'rgba(239,68,68,0.15)',
                    }}>
                      Your answer: {userOpt.label}
                    </p>
                  )}

                  {/* Correct answer (green) */}
                  <p style={{
                    fontSize: '13px',
                    color: '#86efac',
                    marginBottom: '8px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: 'rgba(34,197,94,0.15)',
                  }}>
                    Correct: {correctOpt?.label}
                  </p>

                  {/* Why? explanation (amber) */}
                  <p style={{
                    fontSize: '12px',
                    color: '#fbbf24',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'rgba(245,158,11,0.12)',
                    lineHeight: 1.5,
                    margin: 0,
                  }}>
                    Why? {tq.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fixed-bottom Complete Game button */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 20px',
          background: 'rgba(15,23,42,0.97)',
          backdropFilter: 'blur(10px)',
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 200,
        }}>
          <button
            onClick={() => {
              playSound('complete');
              emitEvent('mastery_achieved', { score, total, grade });
              window.location.href = '/games';
            }}
            style={{
              ...primaryBtnStyle,
              width: '100%',
              maxWidth: '400px',
              background: `linear-gradient(135deg, ${colors.success}, #16a34a)`,
              fontSize: '16px',
              padding: '16px',
            }}
          >
            Complete Game
          </button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER - Phase router
  // ═══════════════════════════════════════════════════════════════════════════
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
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
      color: colors.textPrimary,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {renderNavDots()}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '52px',
        paddingBottom: '16px',
      }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          {renderPhase()}
        </div>
      </div>
    </div>
  );
};

export default OscilloscopeTriggererRenderer;
