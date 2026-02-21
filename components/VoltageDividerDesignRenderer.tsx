'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';
import { useViewport } from '../hooks/useViewport';

// =============================================================================
// Voltage Divider Design - Complete 10-Phase Learning Game (#253)
// Master the relationship Vout = Vin * R2/(R1+R2), loading effects,
// and practical design considerations for voltage divider circuits.
// =============================================================================

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

interface VoltageDividerDesignRendererProps {
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

// =============================================================================
// TEST QUESTIONS - 10 scenario-based multiple choice
// =============================================================================
const testQuestions = [
  {
    scenario: "You need to generate a 3.3V reference from a 5V USB supply to power a sensor. You grab two resistors from your bin: 1.7k and 3.3k.",
    question: "If you place 1.7k as R1 (top) and 3.3k as R2 (bottom), what is Vout?",
    options: [
      { id: 'a', label: "1.7V" },
      { id: 'b', label: "3.3V", correct: true },
      { id: 'c', label: "2.5V" },
      { id: 'd', label: "5.0V" }
    ],
    explanation: "Vout = Vin x R2/(R1+R2) = 5 x 3300/(1700+3300) = 5 x 3300/5000 = 3.3V. The ratio R2/(R1+R2) determines the fraction of Vin that appears at the output."
  },
  {
    scenario: "A colleague builds a voltage divider with two 10k resistors from a 12V supply to get 6V. When they connect a 1k load, the output voltage drops significantly.",
    question: "Why did the output voltage drop when the load was connected?",
    options: [
      { id: 'a', label: "The resistors overheated and changed value" },
      { id: 'b', label: "The 1k load in parallel with R2 reduced the effective bottom resistance, changing the divider ratio", correct: true },
      { id: 'c', label: "The 12V supply could not provide enough current" },
      { id: 'd', label: "Kirchhoff's laws do not apply to loaded dividers" }
    ],
    explanation: "The 1k load parallels R2 (10k), giving R2_eff = (10k x 1k)/(10k+1k) = 909 ohms. New Vout = 12 x 909/(10000+909) = 1.0V -- far from the intended 6V. The load resistance must be much larger than R2 to avoid loading effects."
  },
  {
    scenario: "An engineer designs a divider for an ADC input: Vin = 24V, R1 = 22k, R2 = 10k. The ADC has a 1M input impedance.",
    question: "What voltage does the ADC actually see at its input?",
    options: [
      { id: 'a', label: "About 7.5V -- the divider works nearly perfectly because the ADC input impedance is very high", correct: true },
      { id: 'b', label: "About 12V -- the ADC loads the divider significantly" },
      { id: 'c', label: "24V -- the divider has no effect on high-impedance inputs" },
      { id: 'd', label: "About 3V -- high impedance reduces the voltage" }
    ],
    explanation: "R2_eff = (10k x 1M)/(10k+1M) = 9.9k, almost unchanged from 10k. Vout = 24 x 9900/(22000+9900) = 7.45V. With a 1M load, the divider behaves almost ideally. This is why high-impedance ADC inputs are preferred."
  },
  {
    scenario: "A battery monitoring system uses a voltage divider with R1=100k and R2=100k to measure a 48V battery pack. The system runs 24/7.",
    question: "How much power does this voltage divider waste continuously?",
    options: [
      { id: 'a', label: "About 11.5 mW -- acceptable for always-on monitoring", correct: true },
      { id: 'b', label: "About 1.15 W -- too much for a monitoring circuit" },
      { id: 'c', label: "Zero -- voltage dividers do not consume power" },
      { id: 'd', label: "About 115 mW -- significant but necessary" }
    ],
    explanation: "Total resistance = R1+R2 = 200k. Current = 48V/200k = 0.24mA. Power = V x I = 48 x 0.00024 = 11.52mW. Using high-value resistors minimizes quiescent current drain, important for battery-powered systems."
  },
  {
    scenario: "You need exactly 2.5V from a 5V rail for an analog reference. You consider two designs: (A) R1=R2=1k, or (B) R1=R2=100k. Both give 2.5V unloaded.",
    question: "Which design is better if the load draws 100uA, and why?",
    options: [
      { id: 'a', label: "Design A: lower resistors have better voltage regulation under load because divider current >> load current", correct: true },
      { id: 'b', label: "Design B: higher resistors are always better for precision" },
      { id: 'c', label: "Both designs perform identically since both give 2.5V" },
      { id: 'd', label: "Design B: higher resistance means less noise" }
    ],
    explanation: "Design A: divider current = 5V/2k = 2.5mA, which is 25x the 100uA load. Loading effect is negligible. Design B: divider current = 5V/200k = 25uA, which is only 0.25x the load current. The load would collapse the output voltage. Rule of thumb: divider current should be 10x or more than load current."
  },
  {
    scenario: "A PCB designer needs to set the output voltage of a switching regulator. The datasheet specifies the feedback pin voltage is 0.8V and the desired output is 3.3V.",
    question: "What R1/R2 ratio is needed in the feedback divider?",
    options: [
      { id: 'a', label: "R1/R2 = 3.125 -- since Vout/Vfb - 1 = R1/R2", correct: true },
      { id: 'b', label: "R1/R2 = 4.125 -- Vout/Vfb = R1/R2" },
      { id: 'c', label: "R1/R2 = 0.242 -- Vfb/Vout = R1/R2" },
      { id: 'd', label: "R1/R2 = 1.0 -- equal resistors for any voltage" }
    ],
    explanation: "Vfb = Vout x R2/(R1+R2), so 0.8 = 3.3 x R2/(R1+R2). Rearranging: R1/R2 = Vout/Vfb - 1 = 3.3/0.8 - 1 = 3.125. For example, R1 = 31.25k and R2 = 10k. This is one of the most common voltage divider applications in power supply design."
  },
  {
    scenario: "A temperature sensor outputs 0-5V and needs to be read by a 3.3V microcontroller ADC. An engineer uses R1=5.1k and R2=10k to scale the signal.",
    question: "What is the maximum voltage the ADC will see, and is the design safe?",
    options: [
      { id: 'a', label: "3.31V -- marginally safe but cutting it very close to the 3.3V limit" },
      { id: 'b', label: "3.3V -- perfectly safe with no margin" },
      { id: 'c', label: "3.31V -- this could damage the ADC; needs a lower ratio or clamp diode", correct: true },
      { id: 'd', label: "2.5V -- the divider scales by exactly half" }
    ],
    explanation: "Vout_max = 5 x 10k/(5.1k+10k) = 5 x 10/15.1 = 3.31V. This exceeds 3.3V and could damage the ADC input. Best practice: design for worst-case with margin. Use R1=5.6k, R2=10k giving 3.21V max, plus add a Schottky clamp diode to Vdd for protection."
  },
  {
    scenario: "An audio engineer uses a voltage divider as a volume control. R1=10k pot wiper to signal, R2=10k to ground. The next stage amplifier has 10k input impedance.",
    question: "Why does the volume control not behave linearly as expected?",
    options: [
      { id: 'a', label: "Audio signals require logarithmic pots, not linear" },
      { id: 'b', label: "The 10k amplifier input impedance loads the divider, distorting the attenuation curve", correct: true },
      { id: 'c', label: "Voltage dividers cannot work with AC signals" },
      { id: 'd', label: "The pot has too much resistance for audio frequencies" }
    ],
    explanation: "When R2 of the divider is paralleled with the 10k amplifier input, the effective lower resistance changes with pot position. At mid-position, R2_eff = 5k||10k = 3.33k instead of 5k. The loading effect varies with wiper position, creating a non-linear response. Solution: use a much lower impedance source or buffer the divider output."
  },
  {
    scenario: "A solar panel monitoring system has a divider with R1=470k, R2=100k to measure up to 60V. On hot days, the readings show 2% error compared to a precision multimeter.",
    question: "What is the most likely cause of the measurement error?",
    options: [
      { id: 'a', label: "The ADC has insufficient resolution" },
      { id: 'b', label: "Temperature coefficient of the resistors causes the ratio to drift, and leakage current through the high-value resistors adds error", correct: true },
      { id: 'c', label: "Solar panel voltage is too noisy for a simple divider" },
      { id: 'd', label: "The resistors are drawing too much current from the panel" }
    ],
    explanation: "High-value resistors (470k, 100k) are sensitive to temperature drift and PCB leakage currents. At 85C, typical carbon resistors drift 1-5%. PCB surface leakage at high voltage can inject nanoamps that cause millivolt-level errors across high-impedance nodes. Use precision metal film resistors with low tempco and guard rings on the PCB."
  },
  {
    scenario: "You are designing a divider to convert 12V logic to 3.3V logic. The signal toggles at 1MHz. You use R1=8.7k, R2=3.3k. However, the 3.3V output signal has rounded edges and propagation delay.",
    question: "What is causing the signal degradation at high frequency?",
    options: [
      { id: 'a', label: "1MHz is too fast for resistors to work" },
      { id: 'b', label: "The divider's Thevenin resistance combines with parasitic capacitance to form an RC low-pass filter", correct: true },
      { id: 'c', label: "Voltage dividers only work with DC signals" },
      { id: 'd', label: "The 12V logic standard is incompatible with 3.3V" }
    ],
    explanation: "The Thevenin equivalent resistance of the divider is R1||R2 = 8.7k||3.3k = 2.39k. Combined with even 10pF of parasitic capacitance (trace + input pin), this creates a time constant of 24ns, giving -3dB at about 6.6MHz. At 1MHz, the edges are noticeably rounded. For high-speed level shifting, use dedicated level shifter ICs instead of resistive dividers."
  }
];

// =============================================================================
// REAL WORLD APPLICATIONS
// =============================================================================
const realWorldApps = [
  {
    icon: '\u26A1',
    title: 'Power Supply Feedback Networks',
    short: 'Setting regulator output voltages',
    tagline: 'Every DC-DC converter and LDO uses a voltage divider to set its output',
    description: 'Switching regulators and linear regulators use a voltage divider as a feedback network. The divider scales down the output voltage to match an internal reference (typically 0.6-1.25V), and the regulator adjusts its duty cycle or pass element to maintain the correct ratio.',
    connection: 'The Vout = Vin x R2/(R1+R2) formula you learned is exactly how regulator output voltage is programmed. Changing R1 or R2 changes the output voltage. Loading effects are minimal because feedback pins have very high impedance.',
    howItWorks: 'The regulator compares the divided output voltage against its internal reference. If Vfb > Vref, it reduces output; if Vfb < Vref, it increases output. The divider ratio determines the equilibrium point. Precision 0.1% resistors ensure tight voltage regulation across temperature.',
    stats: [
      { value: '0.1%', label: 'Precision resistor tolerance for regulators', icon: '\u2699' },
      { value: '<50ppm/C', label: 'Temperature coefficient requirement', icon: '\uD83C\uDF21' },
      { value: 'Billions', label: 'Voltage dividers in active power supplies worldwide', icon: '\uD83C\uDF0D' }
    ],
    examples: [
      'TI TPS62130 buck converter: R1=340k, R2=100k sets 3.3V from any input up to 17V',
      'Apple MacBook USB-C PD negotiation uses dividers to signal voltage capability',
      'Tesla Model 3 BMS uses precision dividers to monitor each cell voltage',
      'Server power supplies use Kelvin-connected dividers for 0.5% output accuracy'
    ],
    companies: ['Texas Instruments', 'Analog Devices', 'Infineon', 'MPS', 'Renesas'],
    futureImpact: 'As supply voltages drop below 1V for advanced processors, divider accuracy becomes even more critical. Digital trimmable resistor networks and on-chip calibration are replacing discrete dividers in precision applications.',
    color: '#f59e0b'
  },
  {
    icon: '\uD83D\uDCF1',
    title: 'Touchscreen and Sensor Signal Conditioning',
    short: 'Scaling real-world signals for microcontrollers',
    tagline: 'Every analog sensor interface uses voltage dividers for safe signal scaling',
    description: 'Microcontroller ADCs typically accept 0-3.3V or 0-5V inputs, but real-world signals can be much higher. Voltage dividers scale these signals to safe levels. Resistive touchscreens use voltage dividers formed by the touch point to determine position.',
    connection: 'The loading effects you explored explain why high-impedance ADC inputs are essential. The divider Thevenin resistance must be compatible with the ADC sample-and-hold capacitor charging time.',
    howItWorks: 'For sensor conditioning, the divider scales the maximum sensor voltage to just below the ADC reference. For touchscreens, applying voltage across the resistive film and reading the divider ratio at the touch point gives X and Y coordinates. Accuracy depends on ratio stability, not absolute resistance values.',
    stats: [
      { value: '12-bit', label: 'Typical ADC resolution requiring divider accuracy', icon: '\uD83D\uDD0D' },
      { value: '10x', label: 'Minimum R_load/R2 ratio for <10% error', icon: '\u2696' },
      { value: '<1mA', label: 'Typical divider quiescent current budget', icon: '\uD83D\uDD0B' }
    ],
    examples: [
      'Arduino analog inputs use dividers to read 0-48V battery voltages safely',
      'Nintendo Switch resistive touchscreen uses voltage divider position sensing',
      'Automotive ECUs scale 0-36V signals to 0-5V ADC range with precision dividers',
      'Solar charge controllers use dividers to measure panel and battery voltages simultaneously'
    ],
    companies: ['Microchip', 'STMicroelectronics', 'NXP', 'Espressif', 'Nordic Semiconductor'],
    futureImpact: 'Integrated signal conditioning with on-chip programmable dividers is eliminating external resistors in many sensor applications. But discrete dividers remain essential for high-voltage measurement and custom analog front-ends.',
    color: '#3b82f6'
  },
  {
    icon: '\uD83D\uDD0A',
    title: 'Audio Attenuation and Volume Control',
    short: 'Controlling signal levels in audio circuits',
    tagline: 'From guitar pedals to mixing consoles, dividers shape audio signals',
    description: 'Voltage dividers are the fundamental building block of passive audio attenuation. Volume controls, tone stacks, and signal pads all use resistive dividers. Understanding loading effects is critical because audio stages often have relatively low input impedances.',
    connection: 'The loading effect you studied is especially important in audio. A guitar pickup with 10k output impedance feeding a divider that feeds a 10k amplifier input creates significant interaction. Impedance matching determines signal quality.',
    howItWorks: 'A potentiometer acts as a variable voltage divider. As the wiper moves, the R1/R2 ratio changes, varying the output from full signal to zero. In professional audio, balanced attenuators use matched divider networks for common-mode rejection. Logarithmic taper pots compensate for human hearing perception.',
    stats: [
      { value: '-6dB', label: 'Attenuation from equal-value divider (half voltage)', icon: '\uD83D\uDD09' },
      { value: '10k-100k', label: 'Typical audio divider impedance range', icon: '\u03A9' },
      { value: '120dB', label: 'Dynamic range in professional mastering attenuators', icon: '\uD83C\uDFB5' }
    ],
    examples: [
      'Fender guitar amp tone stack: complex multi-divider network shapes frequency response',
      'SSL mixing console VCA fader uses precision dividers for automation',
      'Headphone output attenuators match high-output DACs to sensitive IEMs',
      'Broadcast audio pads use precision 1% dividers for calibrated signal levels'
    ],
    companies: ['Fender', 'SSL', 'Neve', 'Behringer', 'Focusrite'],
    futureImpact: 'Digital volume control is replacing analog dividers in consumer products, but audiophile equipment still uses precision resistor ladder DACs (which are essentially switchable voltage dividers) for the highest sound quality.',
    color: '#a855f7'
  },
  {
    icon: '\uD83D\uDE97',
    title: 'Automotive Voltage Sensing and Level Shifting',
    short: 'Bridging 12V/24V/48V systems with low-voltage electronics',
    tagline: 'Every modern vehicle uses hundreds of voltage dividers for system monitoring',
    description: 'Modern vehicles have multiple voltage domains (48V mild hybrid, 12V accessories, 5V/3.3V electronics). Voltage dividers provide the essential interface between high-voltage vehicle systems and low-voltage microcontrollers that monitor and control everything.',
    connection: 'The power dissipation and precision considerations you learned apply directly. Automotive dividers must work from -40C to +125C with resistor tempco drift, handle load dump transients up to 40V on a 12V bus, and draw minimal quiescent current.',
    howItWorks: 'Battery management modules use precision dividers to monitor cell voltages. Engine control units use dividers to read throttle position, coolant temperature, and oxygen sensor signals. Level-shifting dividers convert CAN bus, LIN bus, and other protocols between voltage domains.',
    stats: [
      { value: '500+', label: 'Voltage dividers in a modern electric vehicle', icon: '\uD83D\uDE97' },
      { value: '-40 to 125C', label: 'Automotive temperature operating range', icon: '\uD83C\uDF21' },
      { value: 'AEC-Q200', label: 'Automotive qualification standard for passive components', icon: '\u2705' }
    ],
    examples: [
      'Tesla BMS uses precision 0.1% dividers for individual cell voltage monitoring',
      'BMW 48V mild hybrid system uses dividers to interface with 12V CAN bus controllers',
      'Toyota Prius HV battery monitoring: 96 cell dividers with matched tempco resistors',
      'Ford F-150 Lightning uses guarded dividers for 400V pack isolation monitoring'
    ],
    companies: ['Bosch', 'Continental', 'Denso', 'Aptiv', 'Vishay'],
    futureImpact: 'As vehicles move to 800V architectures, voltage divider design becomes more challenging. Creepage and clearance requirements, higher precision needs, and EMC considerations are driving innovation in automotive-grade resistor networks and integrated sensor interfaces.',
    color: '#10b981'
  }
];

// =============================================================================
// COLOR SYSTEM
// =============================================================================
const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#f59e0b',
  accentGlow: 'rgba(245, 158, 11, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  vin: '#ef4444',
  vout: '#22c55e',
  ground: '#3b82f6',
  r1Color: '#f97316',
  r2Color: '#a855f7',
  loadColor: '#06b6d4',
  current: '#fbbf24',
};

// Phase types
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Hook',
  predict: 'Predict',
  play: 'Play',
  review: 'Review',
  twist_predict: 'Twist',
  twist_play: 'Explore',
  twist_review: 'Deep Insight',
  transfer: 'Transfer',
  test: 'Test',
  mastery: 'Mastery',
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const VoltageDividerDesignRenderer: React.FC<VoltageDividerDesignRendererProps> = ({
  onGameEvent,
  gamePhase,
}) => {
  const { isMobile } = useViewport();
  const typo = {
    title: isMobile ? '24px' : '32px',
    heading: isMobile ? '18px' : '22px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
  };

  // Phase state
  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  };
  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase as Phase)) setPhase(gamePhase as Phase);
  }, [gamePhase]);

  const emitGameEvent = useCallback((eventType: GameEvent['eventType'], details: Record<string, unknown> = {}) => {
    if (onGameEvent) {
      onGameEvent({
        eventType,
        gameType: 'voltage-divider-design',
        gameTitle: 'Voltage Divider Design',
        details: { phase, ...details },
        timestamp: Date.now()
      });
    }
  }, [onGameEvent, phase]);

  const goToPhase = useCallback((newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200 || isNavigating.current) return;
    lastClickRef.current = now;
    isNavigating.current = true;
    playSound('transition');
    setPhase(newPhase);
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    emitGameEvent('phase_changed', { from: phase, to: newPhase });
    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [phase, emitGameEvent]);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) goToPhase(phaseOrder[idx + 1]);
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) goToPhase(phaseOrder[idx - 1]);
  }, [phase, goToPhase]);

  // ---------------------------------------------------------------------------
  // Simulation state
  // ---------------------------------------------------------------------------
  const [vin, setVin] = useState(5);
  const [r1, setR1] = useState(1700);
  const [r2, setR2] = useState(3300);
  const [loadEnabled, setLoadEnabled] = useState(false);
  const [rLoad, setRLoad] = useState(10000);
  const [animTime, setAnimTime] = useState(0);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengesSolved, setChallengesSolved] = useState<boolean[]>([false, false, false]);

  // Animation loop for current flow dots
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimTime(prev => (prev + 1) % 1000);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // ---------------------------------------------------------------------------
  // Physics calculations
  // ---------------------------------------------------------------------------
  const calculate = useCallback(() => {
    const r2Eff = loadEnabled ? (r2 * rLoad) / (r2 + rLoad) : r2;
    const vout = vin * r2Eff / (r1 + r2Eff);
    const iTotal = vin / (r1 + r2Eff);
    const iR2 = loadEnabled ? vout / r2 : iTotal;
    const iLoad = loadEnabled ? vout / rLoad : 0;
    const pR1 = iTotal * iTotal * r1;
    const pR2 = iR2 * iR2 * r2;
    const pLoad = loadEnabled ? iLoad * iLoad * rLoad : 0;
    const pTotal = pR1 + pR2 + pLoad;
    const voutUnloaded = vin * r2 / (r1 + r2);
    const loadingError = loadEnabled ? ((voutUnloaded - vout) / voutUnloaded) * 100 : 0;
    return { vout, iTotal, iR2, iLoad, pR1, pR2, pLoad, pTotal, r2Eff, voutUnloaded, loadingError };
  }, [vin, r1, r2, loadEnabled, rLoad]);

  const values = calculate();

  // Design challenges for the play phase
  const challenges = [
    { target: 3.3, vin: 5, tolerance: 0.15, hint: 'Try R1=1.7k, R2=3.3k (ratio 3.3/5 = 0.66)' },
    { target: 2.5, vin: 10, tolerance: 0.15, hint: 'Equal resistors give half the voltage' },
    { target: 1.8, vin: 5, tolerance: 0.15, hint: 'R2/(R1+R2) should equal 1.8/5 = 0.36' },
  ];

  // Check if current challenge is solved
  useEffect(() => {
    if (phase === 'play' && challengeIndex < challenges.length) {
      const ch = challenges[challengeIndex];
      if (Math.abs(vin - ch.vin) < 0.1 && Math.abs(values.vout - ch.target) <= ch.tolerance) {
        if (!challengesSolved[challengeIndex]) {
          const newSolved = [...challengesSolved];
          newSolved[challengeIndex] = true;
          setChallengesSolved(newSolved);
          playSound('success');
          emitGameEvent('achievement_unlocked', { challenge: challengeIndex, target: ch.target });
        }
      }
    }
  }, [values.vout, vin, phase, challengeIndex]);

  // Predictions
  const predictions = [
    { id: 'always_half', label: 'Vout is always half of Vin regardless of resistor values' },
    { id: 'ratio', label: 'Vout depends on the ratio R2/(R1+R2) -- changing either resistor changes the output', correct: true },
    { id: 'sum', label: 'Vout equals Vin minus R1, like subtracting resistance from voltage' },
    { id: 'r1_only', label: 'Only R1 determines the output voltage; R2 is just a path to ground' },
  ];

  const twistPredictions = [
    { id: 'no_effect', label: 'Adding a load has no effect because the voltage is already set by R1 and R2' },
    { id: 'drops', label: 'The load resistance in parallel with R2 reduces effective R2, lowering Vout', correct: true },
    { id: 'increases', label: 'A load resistor increases Vout because more current flows' },
    { id: 'shorts', label: 'Any load will short the output to ground' },
  ];

  // Test functions
  const handleTestAnswer = (questionIndex: number, answerId: string) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = answerId;
    setTestAnswers(newAnswers);
    emitGameEvent('answer_submitted', { questionIndex, answerId });
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      const userAnswer = testAnswers[i];
      const correctOption = q.options.find(o => o.correct);
      if (userAnswer === correctOption?.id) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    playSound(score >= 7 ? 'success' : 'failure');
    emitGameEvent('game_completed', { type: 'game_completed', score, total: testQuestions.length });
  };

  const getLetterGrade = (s: number): string => {
    if (s >= 10) return 'A+';
    if (s >= 9) return 'A';
    if (s >= 8) return 'B+';
    if (s >= 7) return 'B';
    if (s >= 6) return 'C';
    if (s >= 5) return 'D';
    return 'F';
  };

  // Format resistance for display
  const fmtR = (ohms: number): string => {
    if (ohms >= 1000000) return (ohms / 1000000).toFixed(1) + 'M';
    if (ohms >= 1000) return (ohms / 1000).toFixed(1) + 'k';
    return ohms.toFixed(0) + '\u03A9';
  };

  // Voltage color interpolation (red=high, blue=low)
  const voltageColor = (v: number, vmax: number): string => {
    const t = Math.max(0, Math.min(1, v / vmax));
    const r = Math.round(220 * t + 30);
    const g = Math.round(60 * (1 - Math.abs(t - 0.5) * 2) + 40);
    const b = Math.round(220 * (1 - t) + 30);
    return `rgb(${r},${g},${b})`;
  };

  // ---------------------------------------------------------------------------
  // SVG Circuit Visualization
  // ---------------------------------------------------------------------------
  const renderCircuitSVG = (showLoad: boolean) => {
    const w = 460;
    const h = 400;
    const dotSpeed = 0.05;
    const dotPhase = (animTime * dotSpeed) % 1;

    // Circuit node positions
    const srcX = 60, srcTopY = 60, srcBotY = 340;
    const midTopX = 220, midTopY = 60;
    const juncX = 220, juncY = 200;
    const midBotX = 220, midBotY = 340;
    const probeX = 340, probeY = 200;

    // Current arrow scale
    const currentScale = Math.min(1, values.iTotal * 500);

    // Animated dot positions along path
    const makeDots = (x1: number, y1: number, x2: number, y2: number, count: number, phase: number) => {
      const dots = [];
      for (let i = 0; i < count; i++) {
        const t = ((phase + i / count) % 1);
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        dots.push({ x, y, key: `${x1}-${y1}-${i}` });
      }
      return dots;
    };

    const numDots = Math.max(1, Math.min(5, Math.round(values.iTotal * 2000)));

    return (
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet"
        style={{ borderRadius: '12px', maxWidth: '460px', background: '#030712' }}
        role="img" aria-label="Voltage divider circuit schematic">
        <defs>
          <linearGradient id="vdBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>
          <radialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </radialGradient>
          <filter id="vdGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="wireVin" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.vin} />
            <stop offset="100%" stopColor={colors.r1Color} />
          </linearGradient>
        </defs>

        <rect width={w} height={h} fill="url(#vdBg)" />

        {/* --- Voltage Source (Battery) --- */}
        <rect x={srcX - 22} y={srcTopY + 50} width={44} height={180} rx="8" fill="none"
          stroke={colors.vin} strokeWidth="1.5" opacity="0.3" />
        {/* + terminal */}
        <line x1={srcX} y1={srcTopY} x2={srcX} y2={srcTopY + 50} stroke={voltageColor(vin, vin)} strokeWidth="3" />
        <text x={srcX - 8} y={srcTopY + 70} fill={colors.vin} fontSize="18" fontWeight="bold">+</text>
        <text x={srcX + 4} y={srcTopY + 70} fill={colors.vin} fontSize="11">{vin.toFixed(1)}V</text>
        {/* Battery body */}
        <line x1={srcX - 14} y1={srcTopY + 120} x2={srcX + 14} y2={srcTopY + 120} stroke={colors.vin} strokeWidth="4" />
        <line x1={srcX - 8} y1={srcTopY + 130} x2={srcX + 8} y2={srcTopY + 130} stroke={colors.vin} strokeWidth="2" />
        <line x1={srcX - 14} y1={srcTopY + 140} x2={srcX + 14} y2={srcTopY + 140} stroke={colors.vin} strokeWidth="4" />
        <line x1={srcX - 8} y1={srcTopY + 150} x2={srcX + 8} y2={srcTopY + 150} stroke={colors.vin} strokeWidth="2" />
        <text x={srcX} y={srcTopY + 175} fill={colors.textSecondary} fontSize="10" textAnchor="middle">Vin</text>
        {/* - terminal */}
        <line x1={srcX} y1={srcTopY + 230} x2={srcX} y2={srcBotY} stroke={voltageColor(0, vin)} strokeWidth="3" />
        <text x={srcX - 8} y={srcTopY + 215} fill={colors.ground} fontSize="16" fontWeight="bold">-</text>

        {/* --- Top wire: source + to R1 top --- */}
        <line x1={srcX} y1={srcTopY} x2={midTopX} y2={midTopY}
          stroke={voltageColor(vin, vin)} strokeWidth="3" />
        {/* Current direction arrow */}
        <polygon points={`${srcX + 70},${srcTopY - 6} ${srcX + 82},${srcTopY} ${srcX + 70},${srcTopY + 6}`}
          fill={colors.current} opacity={currentScale} />

        {/* --- R1 (top resistor) --- */}
        <rect x={midTopX - 14} y={midTopY + 10} width={28} height={110} rx="4"
          fill="rgba(249,115,22,0.15)" stroke={colors.r1Color} strokeWidth="2" />
        {/* Zigzag pattern */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <line key={`z1-${i}`}
            x1={midTopX + (i % 2 === 0 ? -10 : 10)}
            y1={midTopY + 20 + i * 16}
            x2={midTopX + (i % 2 === 0 ? 10 : -10)}
            y2={midTopY + 20 + (i + 1) * 16}
            stroke={colors.r1Color} strokeWidth="1.5" />
        ))}
        <text x={midTopX + 22} y={midTopY + 55} fill={colors.r1Color} fontSize="11" fontWeight="bold">R1</text>
        <text x={midTopX + 22} y={midTopY + 70} fill={colors.r1Color} fontSize="10">{fmtR(r1)}</text>

        {/* --- Junction point (Vout) --- */}
        <circle cx={juncX} cy={juncY} r="5" fill={colors.vout} filter="url(#vdGlow)">
          <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* --- Vout probe line --- */}
        <line x1={juncX} y1={juncY} x2={probeX} y2={probeY}
          stroke={colors.vout} strokeWidth="2" strokeDasharray="6 3" />
        <rect x={probeX - 2} y={probeY - 24} width={106} height={48} rx="8"
          fill="rgba(34,197,94,0.15)" stroke={colors.vout} strokeWidth="1.5" />
        <text x={probeX + 50} y={probeY - 6} fill={colors.vout} fontSize="11" textAnchor="middle" fontWeight="bold">Vout</text>
        <text x={probeX + 50} y={probeY + 14} fill={colors.vout} fontSize="16" textAnchor="middle" fontWeight="bold">
          {values.vout.toFixed(3)}V
        </text>

        {/* --- R2 (bottom resistor) --- */}
        <rect x={midTopX - 14} y={juncY + 20} width={28} height={110} rx="4"
          fill="rgba(168,85,247,0.15)" stroke={colors.r2Color} strokeWidth="2" />
        {[0, 1, 2, 3, 4, 5].map(i => (
          <line key={`z2-${i}`}
            x1={midTopX + (i % 2 === 0 ? -10 : 10)}
            y1={juncY + 30 + i * 16}
            x2={midTopX + (i % 2 === 0 ? 10 : -10)}
            y2={juncY + 30 + (i + 1) * 16}
            stroke={colors.r2Color} strokeWidth="1.5" />
        ))}
        <text x={midTopX + 22} y={juncY + 65} fill={colors.r2Color} fontSize="11" fontWeight="bold">R2</text>
        <text x={midTopX + 22} y={juncY + 80} fill={colors.r2Color} fontSize="10">{fmtR(r2)}</text>

        {/* --- Bottom wire: R2 bottom to GND --- */}
        <line x1={midBotX} y1={juncY + 130} x2={midBotX} y2={midBotY}
          stroke={voltageColor(0, vin)} strokeWidth="3" />
        <line x1={srcX} y1={midBotY} x2={midBotX} y2={midBotY}
          stroke={voltageColor(0, vin)} strokeWidth="3" />

        {/* Ground symbol */}
        <line x1={midBotX - 16} y1={midBotY + 6} x2={midBotX + 16} y2={midBotY + 6} stroke={colors.ground} strokeWidth="2" />
        <line x1={midBotX - 10} y1={midBotY + 12} x2={midBotX + 10} y2={midBotY + 12} stroke={colors.ground} strokeWidth="2" />
        <line x1={midBotX - 4} y1={midBotY + 18} x2={midBotX + 4} y2={midBotY + 18} stroke={colors.ground} strokeWidth="2" />
        <text x={midBotX} y={midBotY + 32} fill={colors.ground} fontSize="10" textAnchor="middle">GND</text>

        {/* --- Load Resistor (when enabled) --- */}
        {showLoad && loadEnabled && (
          <g>
            <line x1={juncX + 5} y1={juncY} x2={juncX + 60} y2={juncY}
              stroke={colors.loadColor} strokeWidth="2" />
            <rect x={juncX + 60 - 14} y={juncY + 10} width={28} height={110} rx="4"
              fill="rgba(6,182,212,0.15)" stroke={colors.loadColor} strokeWidth="2" />
            {[0, 1, 2, 3, 4, 5].map(i => (
              <line key={`zl-${i}`}
                x1={juncX + 60 + (i % 2 === 0 ? -10 : 10)}
                y1={juncY + 20 + i * 16}
                x2={juncX + 60 + (i % 2 === 0 ? 10 : -10)}
                y2={juncY + 20 + (i + 1) * 16}
                stroke={colors.loadColor} strokeWidth="1.5" />
            ))}
            <text x={juncX + 60 + 22} y={juncY + 60} fill={colors.loadColor} fontSize="11" fontWeight="bold">R_L</text>
            <text x={juncX + 60 + 22} y={juncY + 75} fill={colors.loadColor} fontSize="10">{fmtR(rLoad)}</text>
            {/* Load to ground */}
            <line x1={juncX + 60} y1={juncY + 120} x2={juncX + 60} y2={midBotY}
              stroke={voltageColor(0, vin)} strokeWidth="2" />
            <line x1={midBotX} y1={midBotY} x2={juncX + 60} y2={midBotY}
              stroke={voltageColor(0, vin)} strokeWidth="2" />
            {/* Load current dots */}
            {makeDots(juncX + 60, juncY, juncX + 60, juncY + 120, Math.max(1, Math.round(values.iLoad * 3000)), dotPhase).map(d => (
              <circle key={d.key} cx={d.x} cy={d.y} r="2.5" fill="url(#dotGlow)" opacity="0.8" />
            ))}
          </g>
        )}

        {/* --- Animated current dots --- */}
        {/* Top wire */}
        {makeDots(srcX, srcTopY, midTopX, midTopY, numDots, dotPhase).map(d => (
          <circle key={`dt-${d.key}`} cx={d.x} cy={d.y} r="2.5" fill="url(#dotGlow)" opacity="0.8" />
        ))}
        {/* Through R1 */}
        {makeDots(midTopX, midTopY + 10, midTopX, juncY - 5, numDots, dotPhase).map(d => (
          <circle key={`dr1-${d.key}`} cx={d.x} cy={d.y} r="2.5" fill="url(#dotGlow)" opacity="0.8" />
        ))}
        {/* Through R2 */}
        {makeDots(midTopX, juncY + 5, midTopX, juncY + 130, numDots, dotPhase).map(d => (
          <circle key={`dr2-${d.key}`} cx={d.x} cy={d.y} r="2.5" fill="url(#dotGlow)" opacity="0.8" />
        ))}
        {/* Bottom wire */}
        {makeDots(midBotX, midBotY, srcX, midBotY, numDots, dotPhase).map(d => (
          <circle key={`db-${d.key}`} cx={d.x} cy={d.y} r="2.5" fill="url(#dotGlow)" opacity="0.8" />
        ))}
        {/* Return to source */}
        {makeDots(srcX, midBotY, srcX, srcTopY + 230, numDots, dotPhase).map(d => (
          <circle key={`ds-${d.key}`} cx={d.x} cy={d.y} r="2.5" fill="url(#dotGlow)" opacity="0.8" />
        ))}

        {/* --- Voltage color gradient indicators --- */}
        <rect x={12} y={srcTopY} width="8" height={srcBotY - srcTopY} rx="4" fill="none" stroke="#334155" strokeWidth="0.5" />
        <defs>
          <linearGradient id="vGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.vin} />
            <stop offset={`${(1 - values.vout / vin) * 100}%`} stopColor={colors.vout} />
            <stop offset="100%" stopColor={colors.ground} />
          </linearGradient>
        </defs>
        <rect x={12} y={srcTopY} width="8" height={srcBotY - srcTopY} rx="4" fill="url(#vGrad)" opacity="0.6" />
        <text x={8} y={srcTopY - 4} fill={colors.vin} fontSize="8" textAnchor="middle">{vin.toFixed(1)}V</text>
        <text x={8} y={juncY + 3} fill={colors.vout} fontSize="8" textAnchor="middle">{values.vout.toFixed(1)}V</text>
        <text x={8} y={srcBotY + 10} fill={colors.ground} fontSize="8" textAnchor="middle">0V</text>

        {/* --- Info box: calculated values --- */}
        <rect x={probeX - 2} y={probeY + 40} width={116} height={loadEnabled ? 100 : 72} rx="6"
          fill="rgba(0,0,0,0.6)" stroke="#334155" strokeWidth="1" />
        <text x={probeX + 4} y={probeY + 56} fill={colors.current} fontSize="10">
          I_total: {(values.iTotal * 1000).toFixed(2)} mA
        </text>
        <text x={probeX + 4} y={probeY + 72} fill={colors.r1Color} fontSize="10">
          P_R1: {(values.pR1 * 1000).toFixed(2)} mW
        </text>
        <text x={probeX + 4} y={probeY + 88} fill={colors.r2Color} fontSize="10">
          P_R2: {(values.pR2 * 1000).toFixed(2)} mW
        </text>
        {loadEnabled && (
          <>
            <text x={probeX + 4} y={probeY + 104} fill={colors.loadColor} fontSize="10">
              I_load: {(values.iLoad * 1000).toFixed(2)} mA
            </text>
            <text x={probeX + 4} y={probeY + 120} fill={colors.error} fontSize="10">
              Error: {values.loadingError.toFixed(1)}%
            </text>
          </>
        )}

        {/* --- Voltage bar graph --- */}
        <rect x={w - 50} y={srcTopY} width={30} height={srcBotY - srcTopY} rx="4" fill="rgba(0,0,0,0.4)" stroke="#334155" strokeWidth="0.5" />
        {/* Vin bar */}
        <rect x={w - 48} y={srcTopY + 2} width={12}
          height={(srcBotY - srcTopY - 4)} rx="2" fill={colors.vin} opacity="0.25" />
        <rect x={w - 48} y={srcBotY - 2 - (srcBotY - srcTopY - 4) * (vin / (vin + 1))} width={12}
          height={(srcBotY - srcTopY - 4) * (vin / (vin + 1))} rx="2" fill={colors.vin} opacity="0.6" />
        {/* Vout bar */}
        <rect x={w - 34} y={srcBotY - 2 - (srcBotY - srcTopY - 4) * (values.vout / (vin + 1))} width={12}
          height={(srcBotY - srcTopY - 4) * (values.vout / (vin + 1))} rx="2" fill={colors.vout} opacity="0.7" />
        <text x={w - 42} y={srcTopY - 4} fill={colors.textMuted} fontSize="8" textAnchor="middle">V_in</text>
        <text x={w - 28} y={srcTopY - 4} fill={colors.textMuted} fontSize="8" textAnchor="middle">V_out</text>
      </svg>
    );
  };

  // ---------------------------------------------------------------------------
  // Controls panel
  // ---------------------------------------------------------------------------
  const renderControls = (showLoad: boolean) => (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px',
      background: colors.bgCard, borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div>
        <label style={{ color: colors.vin, display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>
          Vin: {vin.toFixed(1)} V
        </label>
        <input type="range" min="1" max="24" step="0.5" value={vin}
          onChange={(e) => { setVin(parseFloat(e.target.value)); emitGameEvent('slider_changed', { param: 'vin', value: parseFloat(e.target.value) }); }}
          style={{ width: '100%', height: '24px', cursor: 'pointer', accentColor: colors.vin }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '9px' }}>
          <span>1V</span><span>24V</span>
        </div>
      </div>
      <div>
        <label style={{ color: colors.r1Color, display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>
          R1: {fmtR(r1)}
        </label>
        <input type="range" min="100" max="100000" step="100" value={r1}
          onChange={(e) => { setR1(parseFloat(e.target.value)); emitGameEvent('slider_changed', { param: 'r1', value: parseFloat(e.target.value) }); }}
          style={{ width: '100%', height: '24px', cursor: 'pointer', accentColor: colors.r1Color }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '9px' }}>
          <span>100</span><span>100k</span>
        </div>
      </div>
      <div>
        <label style={{ color: colors.r2Color, display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>
          R2: {fmtR(r2)}
        </label>
        <input type="range" min="100" max="100000" step="100" value={r2}
          onChange={(e) => { setR2(parseFloat(e.target.value)); emitGameEvent('slider_changed', { param: 'r2', value: parseFloat(e.target.value) }); }}
          style={{ width: '100%', height: '24px', cursor: 'pointer', accentColor: colors.r2Color }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '9px' }}>
          <span>100</span><span>100k</span>
        </div>
      </div>

      {showLoad && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => { setLoadEnabled(!loadEnabled); playSound('click'); }}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px',
                background: loadEnabled ? colors.loadColor : 'rgba(255,255,255,0.1)',
                color: loadEnabled ? '#000' : colors.textMuted, minHeight: '36px', transition: 'all 0.2s'
              }}>
              {loadEnabled ? 'Load ON' : 'Load OFF'}
            </button>
            <span style={{ color: colors.textSecondary, fontSize: '11px' }}>
              {loadEnabled ? 'Load connected in parallel with R2' : 'No load (open circuit)'}
            </span>
          </div>
          {loadEnabled && (
            <div>
              <label style={{ color: colors.loadColor, display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                R_Load: {fmtR(rLoad)}
              </label>
              <input type="range" min="100" max="100000" step="100" value={rLoad}
                onChange={(e) => { setRLoad(parseFloat(e.target.value)); emitGameEvent('slider_changed', { param: 'rLoad', value: parseFloat(e.target.value) }); }}
                style={{ width: '100%', height: '24px', cursor: 'pointer', accentColor: colors.loadColor }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '9px' }}>
                <span>100</span><span>100k</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Formula display */}
      <div style={{ background: 'rgba(245,158,11,0.1)', padding: '10px', borderRadius: '8px', borderLeft: `3px solid ${colors.accent}` }}>
        <div style={{ color: colors.accent, fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
          Vout = Vin x R2 / (R1 + R2)
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '10px', lineHeight: 1.5 }}>
          = {vin.toFixed(1)} x {fmtR(r2)} / ({fmtR(r1)} + {fmtR(r2)})<br />
          = {vin.toFixed(1)} x {(r2 / (r1 + r2)).toFixed(4)}<br />
          = <strong style={{ color: colors.vout }}>{values.vout.toFixed(3)} V</strong>
          {loadEnabled && (
            <span style={{ color: colors.error }}> (unloaded: {values.voutUnloaded.toFixed(3)}V, drop: {values.loadingError.toFixed(1)}%)</span>
          )}
        </div>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Progress bar
  // ---------------------------------------------------------------------------
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, display: 'flex', alignItems: 'center', gap: '3px', padding: '10px 16px', background: 'rgba(0,0,0,0.95)', borderBottom: '1px solid rgba(255,255,255,0.1)', overflowX: 'auto' }}>
        {phaseOrder.map((p, index) => (
          <React.Fragment key={p}>
            <button onClick={() => index <= currentIndex && goToPhase(p)} disabled={index > currentIndex} style={{
              width: isMobile ? '26px' : '30px', height: isMobile ? '26px' : '30px', borderRadius: '50%', border: 'none',
              background: index === currentIndex ? colors.accent : index < currentIndex ? colors.success : 'rgba(255,255,255,0.2)',
              color: index <= currentIndex ? 'white' : colors.textMuted, fontSize: isMobile ? '9px' : '10px', fontWeight: 'bold',
              cursor: index <= currentIndex ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }} title={phaseLabels[p]}>
              {index + 1}
            </button>
            {index < phaseOrder.length - 1 && (
              <div style={{ width: isMobile ? '10px' : '18px', height: '2px', background: index < currentIndex ? colors.success : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Bottom navigation bar
  // ---------------------------------------------------------------------------
  const renderBottomBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    let canProceed = true;
    let nextLabel = 'Continue';

    switch (phase) {
      case 'hook': nextLabel = 'Make a Prediction'; break;
      case 'predict': canProceed = !!prediction; nextLabel = 'Test Your Prediction'; break;
      case 'play': nextLabel = 'Continue to Review'; break;
      case 'review': nextLabel = 'Next: A Twist!'; break;
      case 'twist_predict': canProceed = !!twistPrediction; nextLabel = 'Explore Loading Effects'; break;
      case 'twist_play': nextLabel = 'Review Loading Effects'; break;
      case 'twist_review': nextLabel = 'Real-World Applications'; break;
      case 'transfer': return (
        <TransferPhaseView
          conceptName="Voltage Dividers"
          applications={realWorldApps}
          onComplete={() => goToPhase('test')}
          isMobile={isMobile}
          colors={colors}
          typo={typo}
          playSound={playSound}
        />
      );
      case 'test': canProceed = testSubmitted; nextLabel = testSubmitted ? 'View Mastery' : 'Submit Test'; break;
      case 'mastery': nextLabel = 'Complete Game'; break;
    }

    return (
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '14px 20px', background: colors.bgDark, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', gap: '12px', zIndex: 1000 }}>
        <button onClick={goBack} disabled={isFirst} style={{
          padding: '10px 20px', borderRadius: '8px', border: `1px solid ${isFirst ? 'rgba(255,255,255,0.1)' : colors.textMuted}`,
          background: 'transparent', color: isFirst ? colors.textMuted : colors.textPrimary, fontWeight: 'bold',
          cursor: isFirst ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: isFirst ? 0.5 : 1, minHeight: '44px'
        }}>Back</button>
        <button
          onClick={() => {
            if (phase === 'test' && !testSubmitted) { submitTest(); return; }
            if (phase === 'mastery') {
              emitGameEvent('phase_changed', { to: 'mastery_achieved' });
              if (typeof window !== 'undefined') window.location.href = '/games';
              return;
            }
            goNext();
          }}
          disabled={!canProceed && !(phase === 'test' && !testSubmitted && !testAnswers.includes(null))}
          style={{
            padding: '10px 28px', borderRadius: '8px', border: 'none',
            background: canProceed || (phase === 'test' && !testSubmitted && !testAnswers.includes(null)) ? colors.accent : 'rgba(255,255,255,0.1)',
            color: canProceed || (phase === 'test' && !testSubmitted && !testAnswers.includes(null)) ? 'white' : colors.textMuted,
            fontWeight: 'bold', cursor: canProceed || (phase === 'test' && !testSubmitted && !testAnswers.includes(null)) ? 'pointer' : 'not-allowed',
            fontSize: '13px', flex: 1, maxWidth: '280px', minHeight: '44px', transition: 'all 0.2s ease'
          }}>
          {phase === 'test' && !testSubmitted ? 'Submit Test' : nextLabel}
        </button>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE CONTENT
  // ---------------------------------------------------------------------------
  const renderPhaseContent = () => {
    switch (phase) {
      // =====================================================================
      // HOOK PHASE
      // =====================================================================
      case 'hook':
        return (
          <>
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <h1 style={{ color: colors.accent, fontSize: typo.title, marginBottom: '8px' }}>Voltage Divider Design</h1>
              <p style={{ color: colors.textSecondary, fontSize: typo.body, marginBottom: '20px' }}>
                Two resistors. One of the most useful circuits in all of electronics.
              </p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}`, marginBottom: '20px' }}>
              <div style={{ background: 'rgba(245,158,11,0.15)', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${colors.accent}` }}>
                <p style={{ color: colors.textPrimary, fontSize: typo.body, lineHeight: 1.6, margin: 0 }}>
                  <strong>How do you get 3.3V from a 5V USB supply using just two resistors?</strong> No regulator, no fancy IC -- just two
                  resistors and Ohm's law. This deceptively simple circuit appears in virtually every electronic device you own.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', padding: `0 ${typo.pagePadding}`, marginBottom: '16px' }}>
              {renderCircuitSVG(false)}
            </div>

            <div style={{ padding: typo.pagePadding }}>
              <div style={{ background: colors.bgCard, padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                <p style={{ color: colors.textPrimary, fontSize: typo.body, lineHeight: 1.6 }}>
                  A <strong style={{ color: colors.accent }}>voltage divider</strong> splits an input voltage into a smaller output voltage
                  using just two resistors in series. The output is taken from the junction between them. The ratio of the resistors
                  determines exactly how much voltage appears at the output.
                </p>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, marginTop: '12px' }}>
                  This circuit is everywhere: setting regulator outputs, reading sensors, biasing transistors, level-shifting signals,
                  and building audio attenuators. Mastering it is essential for any electronics engineer.
                </p>
              </div>

              <div style={{ background: 'rgba(168,85,247,0.1)', padding: '14px', borderRadius: '8px', borderLeft: `3px solid ${colors.r2Color}` }}>
                <p style={{ color: colors.textPrimary, fontSize: typo.small, margin: 0 }}>
                  <strong>The key formula:</strong> Vout = Vin x R2 / (R1 + R2). Simple, powerful, and the foundation of analog design.
                </p>
              </div>
            </div>
          </>
        );

      // =====================================================================
      // PREDICT PHASE
      // =====================================================================
      case 'predict':
        return (
          <>
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: typo.heading, marginBottom: '8px' }}>Make Your Prediction</h2>
              <p style={{ color: colors.textSecondary, fontSize: typo.small }}>
                Given Vin = 10V, R1 = 7k, R2 = 3k -- what determines Vout?
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', padding: `0 ${typo.pagePadding}`, marginBottom: '12px' }}>
              {renderCircuitSVG(false)}
            </div>

            <div style={{ padding: typo.pagePadding }}>
              <div style={{ background: colors.bgCard, padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: typo.body, marginBottom: '8px' }}>The Setup</h3>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.5 }}>
                  Two resistors are connected in series between a voltage source (Vin) and ground.
                  The output voltage (Vout) is measured at the junction point between R1 and R2.
                  <strong style={{ color: colors.vout }}> What determines the output voltage?</strong>
                </p>
              </div>

              <p style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '12px' }}>Select your prediction:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {predictions.map((p) => (
                  <button key={p.id} onClick={() => { setPrediction(p.id); playSound('click'); emitGameEvent('prediction_made', { prediction: p.id }); }} style={{
                    padding: '14px', borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(245,158,11,0.2)' : 'transparent',
                    color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: typo.small, minHeight: '44px'
                  }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        );

      // =====================================================================
      // PLAY PHASE
      // =====================================================================
      case 'play':
        const currentChallenge = challenges[challengeIndex];
        return (
          <>
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: typo.heading, marginBottom: '6px' }}>Design Your Voltage Divider</h2>
              <p style={{ color: colors.textSecondary, fontSize: typo.small }}>Adjust R1, R2, and Vin to hit target voltages</p>
            </div>

            {/* Challenge box */}
            <div style={{ padding: `0 ${typo.pagePadding}`, marginBottom: '12px' }}>
              <div style={{ background: challengesSolved[challengeIndex] ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.15)',
                padding: '12px', borderRadius: '8px',
                borderLeft: `3px solid ${challengesSolved[challengeIndex] ? colors.success : colors.ground}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ color: colors.textPrimary, fontSize: typo.small, fontWeight: 'bold' }}>
                    Challenge {challengeIndex + 1} of {challenges.length}
                    {challengesSolved[challengeIndex] && ' -- SOLVED!'}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {challenges.map((_, i) => (
                      <button key={i} onClick={() => setChallengeIndex(i)} style={{
                        width: '24px', height: '24px', borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: '10px',
                        background: challengesSolved[i] ? colors.success : i === challengeIndex ? colors.accent : 'rgba(255,255,255,0.15)',
                        color: 'white', fontWeight: 'bold'
                      }}>{i + 1}</button>
                    ))}
                  </div>
                </div>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, margin: 0 }}>
                  Target: <strong style={{ color: colors.vout }}>{currentChallenge.target}V</strong> from
                  <strong style={{ color: colors.vin }}> Vin = {currentChallenge.vin}V</strong>
                  {' '} (tolerance: +/-{currentChallenge.tolerance}V)
                </p>
                <p style={{ color: colors.textMuted, fontSize: '10px', marginTop: '4px', fontStyle: 'italic' }}>
                  Hint: {currentChallenge.hint}
                </p>
              </div>
            </div>

            {/* Side-by-side layout */}
            <div style={{
              display: 'flex', flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '16px', padding: `0 ${typo.pagePadding}`,
              alignItems: isMobile ? 'center' : 'flex-start'
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0, display: 'flex', justifyContent: 'center' }}>
                {renderCircuitSVG(false)}
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {renderControls(false)}
              </div>
            </div>

            <div style={{ padding: `12px ${typo.pagePadding}` }}>
              <div style={{ background: colors.bgCard, padding: '14px', borderRadius: '10px' }}>
                <h4 style={{ color: colors.accent, marginBottom: '8px', fontSize: typo.body }}>Experiments to Try:</h4>
                <ul style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.8, paddingLeft: '18px', margin: 0 }}>
                  <li>Set R1 = R2 (equal values) and observe Vout = Vin/2</li>
                  <li>Make R2 very large compared to R1 -- Vout approaches Vin</li>
                  <li>Make R2 very small compared to R1 -- Vout approaches 0V</li>
                  <li>Try different Vin values -- the ratio stays constant</li>
                </ul>
              </div>
            </div>
          </>
        );

      // =====================================================================
      // REVIEW PHASE
      // =====================================================================
      case 'review': {
        const wasCorrect = prediction === 'ratio';
        return (
          <>
            <div style={{
              background: wasCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
              margin: typo.pagePadding, padding: '18px', borderRadius: '12px',
              borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`
            }}>
              <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.heading }}>
                {wasCorrect ? 'Exactly right!' : 'Not quite -- let us clarify!'}
              </h3>
              <p style={{ color: colors.textPrimary, fontSize: typo.body }}>
                The output voltage depends on the <strong>ratio</strong> of R2 to the total resistance (R1 + R2).
                This is the fundamental voltage divider equation.
              </p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}` }}>
              <div style={{ background: colors.bgCard, padding: '18px', borderRadius: '12px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.accent, marginBottom: '14px', fontSize: typo.heading }}>The Voltage Divider Equation</h3>
                <div style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.7 }}>
                  <div style={{ background: 'rgba(245,158,11,0.15)', padding: '14px', borderRadius: '8px', marginBottom: '14px', textAlign: 'center' }}>
                    <span style={{ color: colors.accent, fontSize: '18px', fontWeight: 'bold' }}>
                      Vout = Vin x R2 / (R1 + R2)
                    </span>
                  </div>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>Why does it work?</strong><br />
                    R1 and R2 are in series, so the same current flows through both: I = Vin / (R1 + R2).
                    The voltage across R2 is V_R2 = I x R2 = Vin x R2 / (R1 + R2). Since Vout is measured
                    across R2, this is our output voltage.
                  </p>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>Key insight -- it is all about ratios:</strong><br />
                    If R1 = R2, Vout = Vin/2 (half the input).<br />
                    If R2 = 2 x R1, Vout = Vin x 2/3.<br />
                    If R2 = 0, Vout = 0 (short to ground).<br />
                    If R1 = 0, Vout = Vin (direct connection).
                  </p>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>Absolute values still matter:</strong><br />
                    While the ratio sets Vout, the absolute resistance values determine current draw and power dissipation.
                    Using 1 ohm + 1 ohm gives the same Vout as 1M + 1M, but the current differs by a factor of a million!
                  </p>
                  <p>
                    <strong style={{ color: colors.textPrimary }}>Design trade-off:</strong><br />
                    Low resistance = high current, good load regulation, but wastes power.<br />
                    High resistance = low current, saves power, but sensitive to loading and noise.
                  </p>
                </div>
              </div>
            </div>
          </>
        );
      }

      // =====================================================================
      // TWIST PREDICT PHASE
      // =====================================================================
      case 'twist_predict':
        return (
          <>
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <h2 style={{ color: colors.warning, fontSize: typo.heading, marginBottom: '6px' }}>The Loading Effect Twist</h2>
              <p style={{ color: colors.textSecondary, fontSize: typo.small }}>What happens when you actually connect something to the output?</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', padding: `0 ${typo.pagePadding}`, marginBottom: '12px' }}>
              {renderCircuitSVG(true)}
            </div>

            <div style={{ padding: typo.pagePadding }}>
              <div style={{ background: colors.bgCard, padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: typo.body, marginBottom: '8px' }}>The Scenario</h3>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.5 }}>
                  You built a perfect voltage divider that outputs exactly 2.5V from a 5V supply using two 10k resistors.
                  You connect your sensor (which has a 1k input impedance) to the Vout node.
                  What happens to the output voltage?
                </p>
              </div>

              <p style={{ color: colors.textSecondary, fontSize: typo.small, marginBottom: '12px' }}>Select your prediction:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {twistPredictions.map((p) => (
                  <button key={p.id} onClick={() => { setTwistPrediction(p.id); playSound('click'); emitGameEvent('prediction_made', { prediction: p.id }); }} style={{
                    padding: '14px', borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245,158,11,0.2)' : 'transparent',
                    color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: typo.small, minHeight: '44px'
                  }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        );

      // =====================================================================
      // TWIST PLAY PHASE
      // =====================================================================
      case 'twist_play':
        return (
          <>
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <h2 style={{ color: colors.warning, fontSize: typo.heading, marginBottom: '6px' }}>Loading Effects Explorer</h2>
              <p style={{ color: colors.textSecondary, fontSize: typo.small }}>Toggle the load and watch Vout change</p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}`, marginBottom: '12px' }}>
              <div style={{ background: 'rgba(6,182,212,0.15)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.loadColor}` }}>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, margin: 0 }}>
                  <strong style={{ color: colors.textPrimary }}>Experiment:</strong> Set R1=R2=10k, Vin=5V. Enable the load and reduce R_Load from 100k down to 100 ohms.
                  Watch how Vout collapses as the load gets heavier (lower resistance).
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex', flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '16px', padding: `0 ${typo.pagePadding}`,
              alignItems: isMobile ? 'center' : 'flex-start'
            }}>
              <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0, display: 'flex', justifyContent: 'center' }}>
                {renderCircuitSVG(true)}
              </div>
              <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                {renderControls(true)}
              </div>
            </div>

            <div style={{ padding: `12px ${typo.pagePadding}` }}>
              <div style={{ background: colors.bgCard, padding: '14px', borderRadius: '10px' }}>
                <h4 style={{ color: colors.warning, marginBottom: '8px', fontSize: typo.body }}>Experiments to Try:</h4>
                <ul style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.8, paddingLeft: '18px', margin: 0 }}>
                  <li>Set R_Load = R2 -- Vout drops to 2/3 of unloaded value</li>
                  <li>Set R_Load = 10 x R2 -- Vout drops less than 10% (rule of thumb!)</li>
                  <li>Try high-value divider (R1=R2=100k) with 1k load -- massive error</li>
                  <li>Try low-value divider (R1=R2=100) with 10k load -- minimal loading</li>
                </ul>
              </div>
            </div>
          </>
        );

      // =====================================================================
      // TWIST REVIEW PHASE
      // =====================================================================
      case 'twist_review': {
        const twistWasCorrect = twistPrediction === 'drops';
        return (
          <>
            <div style={{
              background: twistWasCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
              margin: typo.pagePadding, padding: '18px', borderRadius: '12px',
              borderLeft: `4px solid ${twistWasCorrect ? colors.success : colors.error}`
            }}>
              <h3 style={{ color: twistWasCorrect ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.heading }}>
                {twistWasCorrect ? 'You nailed it!' : 'Let us understand why Vout drops.'}
              </h3>
              <p style={{ color: colors.textPrimary, fontSize: typo.body }}>
                <strong>A load resistor in parallel with R2 always reduces Vout.</strong> The effective bottom resistance
                R2_eff = R2 || R_Load is always less than R2 alone.
              </p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}` }}>
              <div style={{ background: colors.bgCard, padding: '18px', borderRadius: '12px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.warning, marginBottom: '14px', fontSize: typo.heading }}>Loading Effects and Impedance Matching</h3>
                <div style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.7 }}>
                  <div style={{ background: 'rgba(6,182,212,0.15)', padding: '14px', borderRadius: '8px', marginBottom: '14px', textAlign: 'center' }}>
                    <span style={{ color: colors.loadColor, fontSize: '16px', fontWeight: 'bold' }}>
                      R2_eff = (R2 x R_Load) / (R2 + R_Load)
                    </span>
                  </div>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>The parallel resistance problem:</strong><br />
                    When a load connects to Vout, it appears in parallel with R2. The combined resistance
                    is always less than either resistor alone. This changes the divider ratio and reduces Vout.
                  </p>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>Worked example:</strong><br />
                    R1 = 10k, R2 = 10k, Vin = 5V. Unloaded: Vout = 2.5V.<br />
                    Add R_Load = 1k: R2_eff = (10k x 1k)/(10k + 1k) = 909 ohms.<br />
                    Loaded Vout = 5 x 909/(10000 + 909) = 0.42V! Down from 2.5V!
                  </p>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>The 10x Rule of Thumb:</strong><br />
                    For less than 10% loading error, R_Load should be at least 10 times R2.
                    For less than 1% error, R_Load should be at least 100 times R2.
                    This is why high-impedance inputs are so important in measurement circuits.
                  </p>
                  <p style={{ marginBottom: '14px' }}>
                    <strong style={{ color: colors.textPrimary }}>Thevenin equivalent:</strong><br />
                    A voltage divider looks like a voltage source with series resistance R_th = R1 || R2.
                    V_th = Vin x R2/(R1+R2). The load sees this Thevenin source and causes voltage drop
                    proportional to R_th / (R_th + R_Load).
                  </p>
                  <p>
                    <strong style={{ color: colors.textPrimary }}>Design solutions:</strong><br />
                    1. Use low-value resistors (higher current, but better regulation).<br />
                    2. Add a buffer amplifier (op-amp follower) after the divider.<br />
                    3. Choose loads with high input impedance (FET-input op-amps, CMOS ADCs).<br />
                    4. Use active voltage regulation instead of passive dividers for power delivery.
                  </p>
                </div>
              </div>
            </div>
          </>
        );
      }

      // =====================================================================
      // TRANSFER PHASE
      // =====================================================================
      case 'transfer':
        return (
          <div style={{ padding: typo.pagePadding }}>
            <h2 style={{ color: colors.textPrimary, fontSize: typo.heading, marginBottom: '6px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: typo.small, textAlign: 'center', marginBottom: '16px' }}>
              Voltage dividers are everywhere in electronics
            </p>
          </div>
        );

      // =====================================================================
      // TEST PHASE
      // =====================================================================
      case 'test':
        if (testSubmitted) {
          return (
            <div style={{ padding: typo.pagePadding }}>
              <div style={{
                background: testScore >= 7 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                padding: '20px', borderRadius: '12px', textAlign: 'center', marginBottom: '16px'
              }}>
                <h2 style={{ color: testScore >= 7 ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.title }}>
                  {testScore >= 9 ? 'Outstanding!' : testScore >= 7 ? 'Well Done!' : 'Keep Learning!'}
                </h2>
                <p style={{ color: colors.textPrimary, fontSize: '28px', fontWeight: 'bold' }}>
                  {testScore} / {testQuestions.length}
                </p>
                <p style={{ color: colors.textSecondary, fontSize: '18px', marginTop: '4px' }}>
                  Grade: {getLetterGrade(testScore)}
                </p>
                <p style={{ color: colors.textSecondary, marginTop: '8px', fontSize: typo.body }}>
                  {testScore >= 7 ? 'You have demonstrated strong understanding of voltage dividers!' : 'Review the material and try again.'}
                </p>
                {testScore < 7 && (
                  <button onClick={() => { setTestSubmitted(false); setTestAnswers(new Array(10).fill(null)); setCurrentTestQuestion(0); }} style={{
                    marginTop: '12px', padding: '10px 20px', borderRadius: '8px', border: 'none',
                    background: colors.accent, color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: typo.small, minHeight: '44px'
                  }}>Retry Test</button>
                )}
              </div>

              {/* Answer key */}
              <h3 style={{ color: colors.textPrimary, fontSize: typo.heading, marginBottom: '12px' }}>Answer Key</h3>
              {testQuestions.map((q, qIndex) => {
                const userAnswer = testAnswers[qIndex];
                const correctOption = q.options.find(o => o.correct);
                const isCorrect = userAnswer === correctOption?.id;
                return (
                  <div key={qIndex} style={{
                    background: colors.bgCard, marginBottom: '12px', padding: '14px', borderRadius: '10px',
                    borderLeft: `3px solid ${isCorrect ? colors.success : colors.error}`
                  }}>
                    <p style={{ color: colors.textMuted, fontSize: typo.label, marginBottom: '4px' }}>
                      Question {qIndex + 1} {isCorrect ? '-- Correct' : '-- Incorrect'}
                    </p>
                    <p style={{ color: colors.textPrimary, fontSize: typo.small, marginBottom: '10px' }}>{q.question}</p>
                    {q.options.map((opt) => {
                      let optColor = colors.textMuted;
                      let optBg = 'transparent';
                      let prefix = '';
                      if (opt.correct) {
                        optColor = colors.success;
                        optBg = 'rgba(16,185,129,0.15)';
                        prefix = 'Correct: ';
                      } else if (userAnswer === opt.id && !opt.correct) {
                        optColor = colors.error;
                        optBg = 'rgba(239,68,68,0.15)';
                        prefix = 'Your answer: ';
                      }
                      return (
                        <div key={opt.id} style={{
                          padding: '8px 10px', marginBottom: '4px', borderRadius: '6px',
                          background: optBg, color: optColor, fontSize: typo.label
                        }}>
                          {prefix}{opt.label}
                        </div>
                      );
                    })}
                    <div style={{ background: 'rgba(245,158,11,0.1)', padding: '10px', borderRadius: '6px', marginTop: '8px' }}>
                      <p style={{ color: '#fbbf24', fontSize: typo.label, lineHeight: 1.5, margin: 0 }}>{q.explanation}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }

        // Test question view
        const currentQ = testQuestions[currentTestQuestion];
        return (
          <div style={{ padding: typo.pagePadding }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: typo.heading }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontSize: typo.body }}>
                {currentTestQuestion + 1} / {testQuestions.length}
              </span>
            </div>

            {/* Progress dots */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{
                  flex: 1, height: '4px', borderRadius: '2px', cursor: 'pointer',
                  background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)'
                }} />
              ))}
            </div>

            {/* Scenario */}
            <div style={{ background: 'rgba(168,85,247,0.1)', padding: '14px', borderRadius: '10px', marginBottom: '12px' }}>
              <p style={{ color: colors.textMuted, fontSize: typo.label, marginBottom: '6px' }}>Scenario:</p>
              <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.5 }}>{currentQ.scenario}</p>
            </div>

            {/* Question */}
            <div style={{ background: colors.bgCard, padding: '14px', borderRadius: '10px', marginBottom: '14px' }}>
              <p style={{ color: colors.textPrimary, fontSize: typo.body, lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt) => (
                <button key={opt.id} onClick={() => handleTestAnswer(currentTestQuestion, opt.id)} style={{
                  padding: '14px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', fontSize: typo.small,
                  border: testAnswers[currentTestQuestion] === opt.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: testAnswers[currentTestQuestion] === opt.id ? 'rgba(245,158,11,0.2)' : 'transparent',
                  color: colors.textPrimary, minHeight: '44px'
                }}>
                  <span style={{ fontWeight: 'bold', marginRight: '8px' }}>{opt.id.toUpperCase()}.</span>{opt.label}
                </button>
              ))}
            </div>

            {/* Navigation within test */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0' }}>
              <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{
                padding: '10px 20px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`,
                background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer', fontSize: typo.small, minHeight: '44px'
              }}>Previous</button>
              {currentTestQuestion < testQuestions.length - 1 ? (
                <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: colors.accent, color: 'white', cursor: 'pointer', fontSize: typo.small, minHeight: '44px'
                }}>Next Question</button>
              ) : (
                <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer', fontSize: typo.small, minHeight: '44px'
                }}>Submit Test</button>
              )}
            </div>
          </div>
        );

      // =====================================================================
      // MASTERY PHASE
      // =====================================================================
      case 'mastery':
        return (
          <>
            <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '12px' }}>{'\u26A1\uD83C\uDFC6'}</div>
              <h1 style={{ color: colors.success, fontSize: typo.title, marginBottom: '8px' }}>Mastery Achieved!</h1>
              <p style={{ color: colors.textSecondary, fontSize: typo.body, marginBottom: '4px' }}>
                Voltage Divider Design -- Complete
              </p>
              <p style={{ color: colors.textPrimary, fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>
                Score: {testScore} / {testQuestions.length}
              </p>
              <p style={{ color: colors.accent, fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>
                Grade: {getLetterGrade(testScore)}
              </p>
            </div>

            <div style={{ padding: `0 ${typo.pagePadding}` }}>
              {/* Concepts mastered */}
              <div style={{ background: colors.bgCard, padding: '18px', borderRadius: '12px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.heading }}>Concepts Mastered</h3>
                <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '18px', margin: 0, fontSize: typo.small }}>
                  <li><strong style={{ color: colors.textPrimary }}>Divider Equation:</strong> Vout = Vin x R2 / (R1 + R2)</li>
                  <li><strong style={{ color: colors.textPrimary }}>Ratio Design:</strong> Output depends on resistor ratio, not absolute values</li>
                  <li><strong style={{ color: colors.textPrimary }}>Loading Effects:</strong> R_Load || R2 reduces effective R2 and drops Vout</li>
                  <li><strong style={{ color: colors.textPrimary }}>10x Rule:</strong> R_Load should be at least 10x R2 for less than 10% error</li>
                  <li><strong style={{ color: colors.textPrimary }}>Thevenin Equivalent:</strong> Divider looks like V_th with R_th = R1 || R2</li>
                  <li><strong style={{ color: colors.textPrimary }}>Power Trade-off:</strong> Low R = better regulation but more power waste</li>
                </ul>
              </div>

              {/* Answer key summary */}
              <div style={{ background: 'rgba(245,158,11,0.15)', padding: '18px', borderRadius: '12px', marginBottom: '16px', borderLeft: `4px solid ${colors.accent}` }}>
                <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.heading }}>Test Answer Key</h3>
                {testQuestions.map((q, qIndex) => {
                  const userAnswer = testAnswers[qIndex];
                  const correctOption = q.options.find(o => o.correct);
                  const isCorrect = userAnswer === correctOption?.id;
                  return (
                    <div key={qIndex} style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0',
                      borderBottom: qIndex < testQuestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                    }}>
                      <span style={{
                        width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 'bold', flexShrink: 0,
                        background: isCorrect ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
                        color: isCorrect ? colors.success : colors.error
                      }}>
                        {qIndex + 1}
                      </span>
                      <span style={{
                        color: isCorrect ? colors.success : colors.error,
                        fontSize: typo.label, flex: 1
                      }}>
                        {isCorrect ? 'Correct' : `Wrong (you: ${userAnswer?.toUpperCase()}, correct: ${correctOption?.id.toUpperCase()})`}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Where to go next */}
              <div style={{ background: 'rgba(16,185,129,0.15)', padding: '18px', borderRadius: '12px', marginBottom: '16px' }}>
                <h3 style={{ color: colors.success, marginBottom: '10px', fontSize: typo.heading }}>Where to Go From Here</h3>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.6 }}>
                  You now understand one of the most fundamental circuits in electronics. Voltage dividers lead naturally into
                  <strong> op-amp circuits</strong> (which eliminate loading), <strong>ADC design</strong> (signal conditioning),
                  <strong> power supply feedback</strong> (setting output voltages), and <strong>sensor interfaces</strong> (scaling signals safely).
                </p>
              </div>

              {/* Complete Game button */}
              <button
                onClick={() => {
                  playSound('complete');
                  emitGameEvent('phase_changed', { to: 'mastery_achieved' });
                  if (typeof window !== 'undefined') window.location.href = '/games';
                }}
                style={{
                  width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
                  background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                  color: 'white', fontWeight: 'bold', fontSize: typo.body, cursor: 'pointer',
                  minHeight: '52px', marginBottom: '16px',
                  boxShadow: `0 4px 16px rgba(16,185,129,0.3)`
                }}>
                Complete Game
              </button>
            </div>

            {/* Final circuit visualization */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: `0 ${typo.pagePadding}`, marginBottom: '24px' }}>
              {renderCircuitSVG(true)}
            </div>
          </>
        );

      default:
        return null;
    }
  };

  // ===========================================================================
  // MAIN RENDER
  // ===========================================================================
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '90px', paddingTop: '60px' }}>
        {renderPhaseContent()}
      </div>
      {renderBottomBar()}
    </div>
  );
};

export default VoltageDividerDesignRenderer;
