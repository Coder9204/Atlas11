'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';
import { useViewport } from '../hooks/useViewport';

// ─────────────────────────────────────────────────────────────────────────────
// Boost Converter - Complete 10-Phase Game (#266)
// How a step-up DC-DC converter stores energy in an inductor and releases it
// at higher voltage: Vout = Vin / (1 - D)
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

interface BoostConverterRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sound utility
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Helper: emit game event
// ─────────────────────────────────────────────────────────────────────────────
const emitEvent = (
  onGameEvent: ((event: GameEvent) => void) | undefined,
  eventType: GameEvent['eventType'],
  details: Record<string, unknown> = {}
) => {
  onGameEvent?.({
    eventType,
    gameType: 'boost_converter',
    gameTitle: 'Boost Converter',
    details,
    timestamp: Date.now(),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Boost converter physics
// ─────────────────────────────────────────────────────────────────────────────
const boostIdeal = (vin: number, duty: number) => vin / (1 - duty);

const boostWithLosses = (vin: number, duty: number, rL: number, rDS: number, vD: number, rLoad: number) => {
  // Parasitic model: Vout = Vin/(1-D) * [rLoad / (rLoad + rL/(1-D)^2 + rDS*D/(1-D)^2)] - vD/(1-D)
  const denom = 1 - duty;
  const ideal = vin / denom;
  const parasiticR = rL / (denom * denom) + rDS * duty / (denom * denom);
  const efficiency = rLoad / (rLoad + parasiticR);
  return ideal * efficiency - vD / denom;
};

// ─────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    scenario: 'A portable device uses a single lithium cell (3.7V nominal) but needs 5V for a USB output port.',
    question: 'What type of converter is needed and why?',
    options: [
      { id: 'a', label: 'A buck converter to step the voltage down' },
      { id: 'b', label: 'A boost converter to step 3.7V up to 5V', correct: true },
      { id: 'c', label: 'A linear regulator to stabilize at 5V' },
      { id: 'd', label: 'An inverting converter to flip polarity' },
    ],
    explanation: 'Since the output voltage (5V) is higher than the input (3.7V), a boost (step-up) converter is required. Linear regulators and buck converters can only produce voltages lower than their input.',
  },
  {
    scenario: 'A boost converter has Vin = 5V and runs at a duty cycle of 50%. The output is connected to a light load.',
    question: 'What is the ideal output voltage?',
    options: [
      { id: 'a', label: '2.5V' },
      { id: 'b', label: '5V' },
      { id: 'c', label: '10V', correct: true },
      { id: 'd', label: '15V' },
    ],
    explanation: 'Using Vout = Vin / (1 - D): Vout = 5 / (1 - 0.5) = 5 / 0.5 = 10V. At 50% duty cycle, the output voltage is double the input.',
  },
  {
    scenario: 'An engineer wants to produce 48V from a 12V input using a boost converter.',
    question: 'What duty cycle is needed (ideally)?',
    options: [
      { id: 'a', label: '25%' },
      { id: 'b', label: '50%' },
      { id: 'c', label: '75%', correct: true },
      { id: 'd', label: '90%' },
    ],
    explanation: 'Rearranging Vout = Vin/(1-D): D = 1 - Vin/Vout = 1 - 12/48 = 1 - 0.25 = 0.75 = 75%. The switch must be ON for 75% of each cycle.',
  },
  {
    scenario: 'During the switch ON phase of a boost converter, the inductor is connected across the input supply.',
    question: 'What happens to the inductor current during this phase?',
    options: [
      { id: 'a', label: 'Current remains constant' },
      { id: 'b', label: 'Current ramps up linearly as energy is stored in the magnetic field', correct: true },
      { id: 'c', label: 'Current drops to zero' },
      { id: 'd', label: 'Current oscillates sinusoidally' },
    ],
    explanation: 'With constant voltage across the inductor (V = L * di/dt), the current increases linearly. The inductor stores energy in its magnetic field at a rate of E = 0.5 * L * I^2.',
  },
  {
    scenario: 'When the switch opens (OFF phase), the inductor current cannot stop instantaneously.',
    question: 'What enables current to continue flowing to the output?',
    options: [
      { id: 'a', label: 'The switch continues conducting in reverse' },
      { id: 'b', label: 'The diode forward-biases, providing a path for inductor current to charge the output capacitor', correct: true },
      { id: 'c', label: 'A secondary winding transfers energy' },
      { id: 'd', label: 'The input source pushes current through the switch' },
    ],
    explanation: 'When the switch opens, the inductor forces current to continue flowing. The diode becomes forward-biased, and the inductor voltage adds to Vin, producing a voltage higher than Vin at the output. This is the key boost mechanism.',
  },
  {
    scenario: 'A designer increases the duty cycle of a boost converter from 80% to 95%, expecting a much higher output voltage.',
    question: 'What actually happens at extremely high duty cycles?',
    options: [
      { id: 'a', label: 'Output voltage increases exactly as predicted by Vout = Vin/(1-D)' },
      { id: 'b', label: 'Output voltage peaks and then drops due to increasing parasitic losses', correct: true },
      { id: 'c', label: 'The converter switches to buck mode' },
      { id: 'd', label: 'The inductor saturates completely and the circuit stops working' },
    ],
    explanation: 'At high duty cycles, parasitic resistances (inductor DCR, switch Rds_on) cause increasing I^2*R losses. The extremely short OFF time means very high peak currents. The real output peaks around D = 0.85-0.90 and then drops, unlike the ideal formula.',
  },
  {
    scenario: 'A boost converter uses a 47uH inductor at 500kHz switching frequency with Vin = 5V and D = 0.5.',
    question: 'What determines whether the converter operates in continuous (CCM) or discontinuous (DCM) conduction mode?',
    options: [
      { id: 'a', label: 'Only the switching frequency matters' },
      { id: 'b', label: 'Whether the inductor current reaches zero during the OFF phase', correct: true },
      { id: 'c', label: 'The diode type used' },
      { id: 'd', label: 'The input voltage level' },
    ],
    explanation: 'In CCM, inductor current never reaches zero - it ripples between a minimum and maximum value. In DCM, the current drops to zero before the next switch-ON. CCM vs DCM depends on load current, inductance, switching frequency, and duty cycle.',
  },
  {
    scenario: 'An output capacitor in a boost converter shows excessive voltage ripple under load.',
    question: 'What is the primary cause of output voltage ripple in a boost converter?',
    options: [
      { id: 'a', label: 'Input voltage fluctuations' },
      { id: 'b', label: 'During the ON phase, only the output capacitor supplies load current, causing voltage droop', correct: true },
      { id: 'c', label: 'Electromagnetic interference from the inductor' },
      { id: 'd', label: 'Temperature changes in the components' },
    ],
    explanation: 'During the switch ON phase, the diode is reverse-biased and the output capacitor alone must supply the entire load current. This causes the output voltage to droop. The capacitor recharges during the OFF phase. Larger capacitance and lower ESR reduce ripple.',
  },
  {
    scenario: 'A synchronous boost converter replaces the diode with a second MOSFET switch.',
    question: 'What is the main advantage of synchronous rectification?',
    options: [
      { id: 'a', label: 'It eliminates the need for an inductor' },
      { id: 'b', label: 'It reduces conduction losses by replacing the diode forward voltage drop with a lower Rds_on drop', correct: true },
      { id: 'c', label: 'It doubles the switching frequency' },
      { id: 'd', label: 'It allows the converter to work without a feedback loop' },
    ],
    explanation: 'A Schottky diode drops about 0.3-0.5V. A MOSFET with low Rds_on (e.g., 10 milliohms) at 5A has only a 50mV drop. This dramatically reduces power loss, especially at high currents, improving overall efficiency from perhaps 85% to 95%+.',
  },
  {
    scenario: 'A solar panel outputs 18V. A Maximum Power Point Tracker (MPPT) charges a 48V battery bank.',
    question: 'How does a boost converter help maximize solar energy harvest?',
    options: [
      { id: 'a', label: 'It simply increases voltage without any feedback' },
      { id: 'b', label: 'It dynamically adjusts its duty cycle to keep the panel at its maximum power point while stepping voltage up to the battery', correct: true },
      { id: 'c', label: 'It converts DC to AC for the battery' },
      { id: 'd', label: 'It stores excess energy in its inductor permanently' },
    ],
    explanation: 'MPPT boost converters continuously adjust their input impedance (via duty cycle) to match the solar panel\'s maximum power point. The boost topology steps the panel voltage (18V) up to the battery voltage (48V), extracting maximum power regardless of conditions.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL-WORLD APPLICATIONS for TransferPhaseView
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '\u{1F50B}',
    title: 'Battery-Powered LED Drivers',
    short: 'LEDs',
    tagline: 'Driving white LEDs from a single lithium cell',
    description: 'White LEDs need 3.0-3.5V forward voltage, but a depleting lithium cell drops to 2.7V. Boost converters maintain constant LED brightness by stepping up voltage as the battery drains, extending usable battery life by 20-40%.',
    connection: 'The boost converter\'s Vout = Vin/(1-D) formula means the controller automatically increases duty cycle as battery voltage drops, maintaining constant LED current and brightness until the battery is truly depleted.',
    howItWorks: 'A boost LED driver uses current-mode control: it monitors LED current via a sense resistor and adjusts duty cycle to maintain constant current. As Vin drops, D increases to compensate, keeping the LED at the target brightness.',
    stats: [
      { value: '95%', label: 'Typical efficiency' },
      { value: '2.7-4.2V', label: 'Input range' },
      { value: '200mA', label: 'Typical LED current' },
    ],
    examples: ['Smartphone flashlights', 'Bicycle headlights', 'Emergency lanterns', 'Smartwatch backlights'],
    companies: ['Texas Instruments', 'Analog Devices', 'Microchip', 'ON Semiconductor'],
    futureImpact: 'MicroLED displays will require arrays of precision boost-driven current sources for each pixel region.',
    color: '#f59e0b',
  },
  {
    icon: '\u26A1',
    title: 'USB Power Delivery',
    short: 'USB PD',
    tagline: 'Delivering 5-20V from a single USB-C port',
    description: 'USB PD can negotiate voltages from 5V to 20V at up to 5A (100W). When a laptop or phone needs higher voltage from a 5V USB source, boost converters step up the voltage. Power banks use boost converters to deliver negotiated voltages.',
    connection: 'USB PD negotiation sets the target voltage. The boost converter adjusts its duty cycle to produce exactly the negotiated voltage (5V, 9V, 15V, or 20V) from whatever the internal battery voltage happens to be.',
    howItWorks: 'A USB PD controller communicates over the CC lines to negotiate voltage and current. The boost converter stage then adjusts its feedback loop setpoint to produce the requested voltage, with overcurrent and overvoltage protection.',
    stats: [
      { value: '100W', label: 'Max USB PD power' },
      { value: '5-20V', label: 'Output range' },
      { value: '>93%', label: 'Peak efficiency' },
    ],
    examples: ['Power bank output stages', 'USB-C laptop chargers', 'Car USB adapters', 'Docking stations'],
    companies: ['Cypress/Infineon', 'Texas Instruments', 'Renesas', 'STMicroelectronics'],
    futureImpact: 'USB PD 3.1 extends to 48V/240W, pushing boost converter technology to higher voltages and powers.',
    color: '#3b82f6',
  },
  {
    icon: '\u2600\uFE0F',
    title: 'Solar MPPT Charge Controllers',
    short: 'Solar',
    tagline: 'Maximum power extraction from solar panels',
    description: 'Solar MPPT controllers use boost converters to step up panel voltage to battery voltage while tracking the maximum power point. This extracts 20-30% more energy than simpler PWM controllers, especially in partial shade.',
    connection: 'The boost converter\'s adjustable duty cycle directly controls the input impedance seen by the solar panel. By sweeping duty cycle and measuring power, the MPPT algorithm finds and tracks the voltage where the panel produces maximum power.',
    howItWorks: 'Perturb-and-observe or incremental conductance algorithms adjust D to find peak power. The boost topology converts lower panel voltage to higher battery voltage. Digital control loops update D every few milliseconds to track changing sunlight.',
    stats: [
      { value: '30%', label: 'More energy vs PWM' },
      { value: '99.5%', label: 'MPPT tracking efficiency' },
      { value: '98%', label: 'Conversion efficiency' },
    ],
    examples: ['Rooftop solar systems', 'Off-grid installations', 'Solar-powered IoT sensors', 'Portable solar chargers'],
    companies: ['Victron Energy', 'Morningstar', 'Enphase', 'SolarEdge'],
    futureImpact: 'Module-level power electronics will put boost MPPT converters on every individual solar panel for maximum array optimization.',
    color: '#10b981',
  },
  {
    icon: '\u{1F697}',
    title: 'Electric Vehicle Powertrains',
    short: 'EVs',
    tagline: 'Boosting battery voltage for efficient motor drive',
    description: 'Many EVs use a boost converter between the battery pack (200-400V) and the inverter/motor (up to 800V). Toyota pioneered this approach in the Prius, boosting 200V battery voltage to 650V for the motor, enabling a smaller, lighter motor.',
    connection: 'Higher motor voltage means lower current for the same power (P = V*I), enabling thinner cables, smaller connectors, and lower I^2*R losses. The boost converter\'s ability to step up voltage makes this architecture practical.',
    howItWorks: 'A high-power interleaved boost converter uses multiple phases to handle hundreds of amps. SiC MOSFETs enable switching at high frequencies with minimal losses. Bidirectional operation allows regenerative braking energy to flow back to the battery.',
    stats: [
      { value: '200kW', label: 'Typical power rating' },
      { value: '98.5%', label: 'Peak efficiency' },
      { value: '800V', label: 'Output bus voltage' },
    ],
    examples: ['Toyota Prius/Camry hybrid', 'Honda Accord hybrid', 'Hyundai E-GMP platform', 'Industrial motor drives'],
    companies: ['Toyota', 'Denso', 'BorgWarner', 'Infineon'],
    futureImpact: 'SiC and GaN switches will enable even higher switching frequencies, shrinking boost converter size while increasing EV range.',
    color: '#8b5cf6',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const BoostConverterRenderer: React.FC<BoostConverterRendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) return gamePhase as Phase;
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const { isMobile } = useViewport();

  // Simulation state
  const [vinput, setVinput] = useState(5);       // Input voltage 3-12V
  const [dutyCycle, setDutyCycle] = useState(50); // Duty cycle 0-95%
  const [switchFreq, setSwitchFreq] = useState(100); // kHz
  const [inductance, setInductance] = useState(47);  // uH
  const [loadResistance, setLoadResistance] = useState(100); // Ohms
  const [animFrame, setAnimFrame] = useState(0);
  const [switchOn, setSwitchOn] = useState(false);

  // Twist phase parasitic parameters
  const [rInductor, setRInductor] = useState(0.1);  // Ohms DCR
  const [rSwitch, setRSwitch] = useState(0.05);     // Ohms Rds_on
  const [vDiode, setVDiode] = useState(0.4);        // Diode forward voltage

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Navigation ref
  const isNavigating = useRef(false);

  // ── Animation loop ──
  useEffect(() => {
    if (phase !== 'play' && phase !== 'twist_play' && phase !== 'hook') return;
    const timer = setInterval(() => {
      setAnimFrame(f => f + 1);
    }, 60);
    return () => clearInterval(timer);
  }, [phase]);

  // Toggle switch state for animation
  useEffect(() => {
    if (phase !== 'play' && phase !== 'twist_play') return;
    const d = dutyCycle / 100;
    const periodMs = 1000 / (switchFreq); // visual period (slowed down)
    const onTime = periodMs * d * 8;
    const offTime = periodMs * (1 - d) * 8;
    let on = true;
    setSwitchOn(true);
    const toggle = () => {
      on = !on;
      setSwitchOn(on);
    };
    const interval = setInterval(toggle, on ? onTime : offTime);
    return () => clearInterval(interval);
  }, [phase, dutyCycle, switchFreq]);

  // ── Computed values ──
  const d = dutyCycle / 100;
  const voutIdeal = boostIdeal(vinput, d);
  const voutReal = boostWithLosses(vinput, d, rInductor, rSwitch, vDiode, loadResistance);
  const iout = Math.max(0, voutReal / loadResistance);
  const iin = d > 0.99 ? 0 : iout / (1 - d);
  const efficiency = voutReal > 0 ? (voutReal * iout) / (vinput * iin) * 100 : 0;
  const inductorRipple = (vinput * d) / (inductance * 1e-6 * switchFreq * 1000);
  const iLpeak = iin + inductorRipple / 2;
  const iLvalley = Math.max(0, iin - inductorRipple / 2);

  // ── Design colors ──
  const colors = {
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgCard: '#1e293b',
    accent: '#f59e0b',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    accentDark: '#d97706',
    secondary: '#3b82f6',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    textPrimary: '#f8fafc',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#334155',
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800 as const, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700 as const, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600 as const, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400 as const, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400 as const, lineHeight: 1.5 },
  };

  // ── Phase navigation ──
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore Losses',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    emitEvent(onGameEvent, 'phase_changed', { from: phase, to: p });
    setPhase(p);
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; });
    });
    setTimeout(() => { isNavigating.current = false; }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, onGameEvent]);

  const nextPhase = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) goToPhase(phaseOrder[idx + 1]);
  }, [phase, goToPhase]);

  // ── Progress bar ──
  const renderProgressBar = () => (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: '4px',
      background: colors.bgSecondary, zIndex: 1000,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </nav>
  );

  // ── Nav dots ──
  const renderNavDots = () => (
    <nav style={{
      position: 'sticky', bottom: 0, left: 0, right: 0,
      background: colors.bgSecondary, borderTop: `1px solid ${colors.border}`,
      boxShadow: '0 -4px 12px rgba(0,0,0,0.3)', padding: '12px 16px', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
    }}>
      <button
        onClick={() => { const i = phaseOrder.indexOf(phase); if (i > 0) goToPhase(phaseOrder[i - 1]); }}
        disabled={phaseOrder.indexOf(phase) === 0}
        style={{
          background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: '8px',
          padding: '10px 16px', minHeight: '44px',
          color: phaseOrder.indexOf(phase) === 0 ? colors.border : colors.textSecondary,
          cursor: phaseOrder.indexOf(phase) === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '14px',
        }}
      >
        Back
      </button>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', flex: 1 }}>
        {phaseOrder.map((p, i) => (
          <button key={p} onClick={() => goToPhase(p)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '18px 4px', minHeight: '44px', border: 'none', background: 'transparent', cursor: 'pointer',
            }}
            aria-label={phaseLabels[p]}
          >
            <div style={{
              width: phase === p ? '20px' : '8px', height: '8px', borderRadius: '4px',
              background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
              transition: 'all 0.3s ease',
            }} />
          </button>
        ))}
      </div>
      <button
        onClick={() => { const i = phaseOrder.indexOf(phase); if (i < phaseOrder.length - 1) goToPhase(phaseOrder[i + 1]); }}
        disabled={phaseOrder.indexOf(phase) === phaseOrder.length - 1 || phase === 'test'}
        style={{
          background: (phaseOrder.indexOf(phase) === phaseOrder.length - 1 || phase === 'test')
            ? colors.border : `linear-gradient(135deg, ${colors.accent}, ${colors.accentDark})`,
          border: 'none', borderRadius: '8px', padding: '10px 16px', minHeight: '44px',
          color: 'white',
          cursor: (phaseOrder.indexOf(phase) === phaseOrder.length - 1 || phase === 'test') ? 'not-allowed' : 'pointer',
          fontWeight: 600, fontSize: '14px',
        }}
      >
        Next
      </button>
    </nav>
  );

  // ── Primary button style ──
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentDark})`,
    color: 'white', border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px', minHeight: '44px',
    borderRadius: '12px', fontSize: isMobile ? '16px' : '18px', fontWeight: 700, cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`, transition: 'all 0.2s ease',
  };

  // ── Page container style ──
  const pageStyle: React.CSSProperties = {
    minHeight: '100dvh', background: colors.bgPrimary,
    padding: '24px', paddingBottom: '16px', overflowY: 'auto', flex: 1, paddingTop: '60px',
  };

  // ── Slider component ──
  const Slider = ({ label, value, min, max, step, unit, onChange, color: sliderColor }: {
    label: string; value: number; min: number; max: number; step: number;
    unit: string; onChange: (v: number) => void; color?: string;
  }) => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ ...typo.small, color: colors.textSecondary }}>{label}</span>
        <span style={{ ...typo.small, color: sliderColor || colors.accent, fontWeight: 700 }}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => {
          onChange(Number(e.target.value));
          emitEvent(onGameEvent, 'slider_changed', { slider: label, value: Number(e.target.value) });
        }}
        style={{ width: '100%', accentColor: sliderColor || colors.accent, cursor: 'pointer' }}
      />
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // BOOST CONVERTER CIRCUIT SVG
  // ─────────────────────────────────────────────────────────────────────────────
  const BoostCircuitSVG = ({ showCurrentPath, showParasitics }: { showCurrentPath?: boolean; showParasitics?: boolean }) => {
    const w = isMobile ? 340 : 460;
    const h = isMobile ? 220 : 260;
    const isOn = switchOn;
    const t = (animFrame % 60) / 60;

    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet"
        style={{ maxWidth: `${w}px`, background: colors.bgCard, borderRadius: '12px' }}
        role="img" aria-label="Boost converter circuit schematic"
      >
        <title>Boost Converter Circuit</title>
        <defs>
          <marker id="arrowCur" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6" fill={colors.accent} />
          </marker>
          <filter id="swGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Battery / Vin */}
        <rect x={20} y={60} width={50} height={70} rx={6} fill={colors.bgPrimary} stroke={colors.secondary} strokeWidth={2} />
        <text x={45} y={85} fill={colors.textPrimary} fontSize="12" fontWeight="700" textAnchor="middle">Vin</text>
        <text x={45} y={105} fill={colors.secondary} fontSize="14" fontWeight="700" textAnchor="middle">{vinput}V</text>
        <text x={45} y={55} fill={colors.textMuted} fontSize="10" textAnchor="middle">+</text>
        <text x={45} y={145} fill={colors.textMuted} fontSize="10" textAnchor="middle">-</text>

        {/* Top rail from battery */}
        <line x1={70} y1={70} x2={100} y2={70} stroke={colors.textSecondary} strokeWidth={2} />

        {/* Inductor L */}
        <g>
          {showParasitics && <text x={140} y={55} fill={colors.error} fontSize="9" textAnchor="middle">DCR={rInductor.toFixed(2)}</text>}
          <path d={`M100,70 Q110,55 120,70 Q130,85 140,70 Q150,55 160,70 Q170,85 180,70`}
            fill="none" stroke={isOn ? colors.accent : colors.textSecondary} strokeWidth={2.5} />
          <text x={140} y={95} fill={colors.textPrimary} fontSize="11" fontWeight="600" textAnchor="middle">L = {inductance}uH</text>
          {isOn && showCurrentPath && (
            <circle cx={100 + t * 80} cy={70 + Math.sin(t * Math.PI * 4) * 12} r={3} fill={colors.accent}>
              <animate attributeName="opacity" values="1;0.4;1" dur="0.5s" repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {/* Junction point */}
        <line x1={180} y1={70} x2={220} y2={70} stroke={colors.textSecondary} strokeWidth={2} />
        <circle cx={220} cy={70} r={3} fill={colors.textSecondary} />

        {/* Diode D */}
        <g>
          <line x1={220} y1={70} x2={260} y2={70} stroke={!isOn ? colors.accent : colors.textMuted} strokeWidth={2} />
          {/* Diode symbol triangle+bar */}
          <polygon points="245,60 265,70 245,80" fill="none" stroke={!isOn ? colors.success : colors.textMuted} strokeWidth={2} />
          <line x1={265} y1={58} x2={265} y2={82} stroke={!isOn ? colors.success : colors.textMuted} strokeWidth={2} />
          <text x={255} y={50} fill={colors.textMuted} fontSize="10" textAnchor="middle">D</text>
          {showParasitics && <text x={255} y={95} fill={colors.error} fontSize="9" textAnchor="middle">Vf={vDiode}V</text>}
          {!isOn && showCurrentPath && (
            <circle cx={220 + t * 45} cy={70} r={3} fill={colors.success}>
              <animate attributeName="opacity" values="1;0.4;1" dur="0.5s" repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {/* Output to Cout and load */}
        <line x1={265} y1={70} x2={w - 90} y2={70} stroke={colors.textSecondary} strokeWidth={2} />

        {/* Output capacitor Cout */}
        <g>
          <line x1={w - 90} y1={70} x2={w - 90} y2={90} stroke={colors.textSecondary} strokeWidth={2} />
          <rect x={w - 98} y={90} width={16} height={24} rx={2} fill={colors.secondary + '44'} stroke={colors.secondary} strokeWidth={1.5} />
          <line x1={w - 90} y1={114} x2={w - 90} y2={h - 40} stroke={colors.textSecondary} strokeWidth={2} />
          <text x={w - 75} y={105} fill={colors.textMuted} fontSize="9" textAnchor="start">Cout</text>
        </g>

        {/* Load resistor R */}
        <g>
          <line x1={w - 50} y1={70} x2={w - 50} y2={85} stroke={colors.textSecondary} strokeWidth={2} />
          <rect x={w - 58} y={85} width={16} height={40} rx={2} fill={colors.bgPrimary} stroke={colors.textSecondary} strokeWidth={1.5} />
          <text x={w - 50} y={108} fill={colors.textPrimary} fontSize="9" fontWeight="600" textAnchor="middle">R</text>
          <line x1={w - 50} y1={125} x2={w - 50} y2={h - 40} stroke={colors.textSecondary} strokeWidth={2} />
          <text x={w - 35} y={108} fill={colors.textMuted} fontSize="9">{loadResistance}</text>
        </g>

        {/* Connect Cout to Load top */}
        <line x1={w - 90} y1={70} x2={w - 50} y2={70} stroke={colors.textSecondary} strokeWidth={2} />

        {/* Vout label */}
        <text x={w - 70} y={60} fill={colors.accent} fontSize="13" fontWeight="700" textAnchor="middle">
          Vout
        </text>
        <text x={w - 70} y={48} fill={colors.accent} fontSize="11" textAnchor="middle">
          {(showParasitics ? voutReal : voutIdeal).toFixed(1)}V
        </text>

        {/* MOSFET Switch */}
        <g>
          <line x1={220} y1={70} x2={220} y2={120} stroke={colors.textSecondary} strokeWidth={2} />
          <rect x={206} y={120} width={28} height={28} rx={4}
            fill={isOn ? colors.accent + '44' : colors.bgPrimary}
            stroke={isOn ? colors.accent : colors.textMuted} strokeWidth={2}
            filter={isOn ? 'url(#swGlow)' : undefined} />
          <text x={220} y={139} fill={isOn ? colors.accent : colors.textMuted} fontSize="10" fontWeight="700" textAnchor="middle">
            {isOn ? 'ON' : 'OFF'}
          </text>
          <line x1={220} y1={148} x2={220} y2={h - 40} stroke={colors.textSecondary} strokeWidth={2} />
          {showParasitics && <text x={240} y={140} fill={colors.error} fontSize="9">Rds={rSwitch}</text>}
          <text x={220} y={118} fill={colors.textMuted} fontSize="9" textAnchor="middle">Q</text>
        </g>

        {/* Ground rail */}
        <line x1={45} y1={h - 40} x2={w - 50} y2={h - 40} stroke={colors.textMuted} strokeWidth={2} />
        <line x1={70} y1={130} x2={70} y2={h - 40} stroke={colors.textSecondary} strokeWidth={2} />
        <text x={w / 2} y={h - 25} fill={colors.textMuted} fontSize="10" textAnchor="middle">GND</text>

        {/* Battery ground connection */}
        <line x1={45} y1={130} x2={45} y2={h - 40} stroke={colors.textSecondary} strokeWidth={2} />

        {/* Current path highlight */}
        {showCurrentPath && isOn && (
          <path d={`M 70 70 L 180 70 L 220 70 L 220 120`} fill="none" stroke={colors.accent} strokeWidth={1.5}
            strokeDasharray="6 4" opacity={0.6}>
            <animate attributeName="stroke-dashoffset" values="0;-20" dur="0.5s" repeatCount="indefinite" />
          </path>
        )}
        {showCurrentPath && !isOn && (
          <path d={`M 70 70 L 180 70 L 220 70 L 265 70 L ${w - 90} 70`} fill="none" stroke={colors.success} strokeWidth={1.5}
            strokeDasharray="6 4" opacity={0.6}>
            <animate attributeName="stroke-dashoffset" values="0;-20" dur="0.5s" repeatCount="indefinite" />
          </path>
        )}

        {/* Duty cycle label */}
        <text x={20} y={20} fill={colors.textMuted} fontSize="11">
          D = {dutyCycle}% | f = {switchFreq}kHz
        </text>
        <text x={20} y={35} fill={colors.textMuted} fontSize="11">
          {isOn ? 'Switch ON: storing energy in L' : 'Switch OFF: L releases to output'}
        </text>
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // INDUCTOR CURRENT WAVEFORM SVG
  // ─────────────────────────────────────────────────────────────────────────────
  const InductorWaveformSVG = ({ showVout }: { showVout?: boolean }) => {
    const w = isMobile ? 340 : 460;
    const h = isMobile ? 160 : 200;
    const pad = { top: 25, right: 20, bottom: 30, left: 45 };
    const pw = w - pad.left - pad.right;
    const ph = h - pad.top - pad.bottom;

    const cycles = 4;
    const dFrac = dutyCycle / 100;

    // Build inductor current waveform (triangle wave)
    const iLPoints: string[] = [];
    const maxI = Math.max(iLpeak * 1.2, 1);
    for (let c = 0; c < cycles; c++) {
      const x0 = pad.left + (c / cycles) * pw;
      const xOn = pad.left + ((c + dFrac) / cycles) * pw;
      const xEnd = pad.left + ((c + 1) / cycles) * pw;
      const yValley = pad.top + ph - (iLvalley / maxI) * ph;
      const yPeak = pad.top + ph - (iLpeak / maxI) * ph;
      if (c === 0) iLPoints.push(`M ${x0.toFixed(1)} ${yValley.toFixed(1)}`);
      else iLPoints.push(`L ${x0.toFixed(1)} ${yValley.toFixed(1)}`);
      iLPoints.push(`L ${xOn.toFixed(1)} ${yPeak.toFixed(1)}`);
      iLPoints.push(`L ${xEnd.toFixed(1)} ${yValley.toFixed(1)}`);
    }

    // Build Vout waveform (ripple)
    const voutPoints: string[] = [];
    if (showVout) {
      const vNom = voutIdeal;
      const vRipple = (iout * dFrac) / (100e-6 * switchFreq * 1000); // simplified ripple
      const vMax = vNom + vRipple / 2;
      const vMin2 = vNom - vRipple / 2;
      const vScale = Math.max(vMax * 1.1, 1);
      for (let c = 0; c < cycles; c++) {
        const x0 = pad.left + (c / cycles) * pw;
        const xOn = pad.left + ((c + dFrac) / cycles) * pw;
        const xEnd = pad.left + ((c + 1) / cycles) * pw;
        const yHigh = pad.top + ph - (vMax / vScale) * ph;
        const yLow = pad.top + ph - (vMin2 / vScale) * ph;
        if (c === 0) voutPoints.push(`M ${x0.toFixed(1)} ${yHigh.toFixed(1)}`);
        else voutPoints.push(`L ${x0.toFixed(1)} ${yHigh.toFixed(1)}`);
        voutPoints.push(`L ${xOn.toFixed(1)} ${yLow.toFixed(1)}`);
        voutPoints.push(`L ${xEnd.toFixed(1)} ${yHigh.toFixed(1)}`);
      }
    }

    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet"
        style={{ maxWidth: `${w}px`, background: colors.bgCard, borderRadius: '12px' }}>
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={pad.left} y1={pad.top + f * ph} x2={pad.left + pw} y2={pad.top + f * ph}
            stroke={colors.border} strokeDasharray="3 3" opacity={0.4} />
        ))}
        {/* Axes */}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + ph} stroke={colors.textSecondary} strokeWidth={1.5} />
        <line x1={pad.left} y1={pad.top + ph} x2={pad.left + pw} y2={pad.top + ph} stroke={colors.textSecondary} strokeWidth={1.5} />
        {/* Labels */}
        <text x={pad.left - 5} y={pad.top + 4} fill={colors.accent} fontSize="10" textAnchor="end">{maxI.toFixed(1)}A</text>
        <text x={pad.left - 5} y={pad.top + ph + 4} fill={colors.textMuted} fontSize="10" textAnchor="end">0</text>
        <text x={pad.left + pw / 2} y={h - 5} fill={colors.textSecondary} fontSize="10" textAnchor="middle">Time</text>
        <text x={5} y={pad.top + ph / 2} fill={colors.accent} fontSize="10" textAnchor="middle"
          transform={`rotate(-90, 5, ${pad.top + ph / 2})`}>I_L (A)</text>
        {/* IL waveform */}
        <path d={iLPoints.join(' ')} fill="none" stroke={colors.accent} strokeWidth={2.5} />
        {/* Vout waveform */}
        {showVout && voutPoints.length > 0 && (
          <path d={voutPoints.join(' ')} fill="none" stroke={colors.success} strokeWidth={2} strokeDasharray="4 2" />
        )}
        {/* Legend */}
        <rect x={pad.left + pw - 120} y={pad.top + 2} width={115} height={showVout ? 34 : 18} rx={4} fill={colors.bgPrimary + 'cc'} />
        <line x1={pad.left + pw - 115} y1={pad.top + 12} x2={pad.left + pw - 95} y2={pad.top + 12} stroke={colors.accent} strokeWidth={2} />
        <text x={pad.left + pw - 90} y={pad.top + 16} fill={colors.textSecondary} fontSize="10">Inductor Current</text>
        {showVout && (
          <>
            <line x1={pad.left + pw - 115} y1={pad.top + 28} x2={pad.left + pw - 95} y2={pad.top + 28} stroke={colors.success} strokeWidth={2} strokeDasharray="4 2" />
            <text x={pad.left + pw - 90} y={pad.top + 32} fill={colors.textSecondary} fontSize="10">Output Voltage</text>
          </>
        )}
        {/* Duty cycle markers */}
        {Array.from({ length: cycles }).map((_, c) => {
          const xOn = pad.left + ((c + dFrac) / cycles) * pw;
          return (
            <line key={c} x1={xOn} y1={pad.top} x2={xOn} y2={pad.top + ph}
              stroke={colors.accent} strokeWidth={0.5} strokeDasharray="2 3" opacity={0.5} />
          );
        })}
      </svg>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SIDE-BY-SIDE LAYOUT
  // ─────────────────────────────────────────────────────────────────────────────
  const SideBySideLayout = ({ left, right }: { left: React.ReactNode; right: React.ReactNode }) => (
    <div style={{
      display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px',
      maxWidth: '900px', margin: '0 auto', width: '100%',
    }}>
      <div style={{ flex: isMobile ? 'none' : '1 1 55%', minWidth: 0 }}>{left}</div>
      <div style={{ flex: isMobile ? 'none' : '1 1 45%', minWidth: 0 }}>{right}</div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // READOUT DISPLAY
  // ─────────────────────────────────────────────────────────────────────────────
  const Readout = ({ label, value, unit, color: rColor }: { label: string; value: string; unit: string; color?: string }) => (
    <div style={{
      background: colors.bgPrimary, borderRadius: '10px', padding: '12px', textAlign: 'center',
      border: `1px solid ${colors.border}`,
    }}>
      <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: rColor || colors.accent }}>{value}</div>
      <div style={{ fontSize: '10px', color: colors.textMuted }}>{unit}</div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE RENDERS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── HOOK PHASE ──
  if (phase === 'hook') {
    return (
      <div style={{
        ...pageStyle,
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{ fontSize: '64px', marginBottom: '24px', animation: 'pulse 2s infinite' }}>
          <span role="img" aria-label="battery">&#x1F50B;</span><span role="img" aria-label="lightning">&#x26A1;</span>
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Boost Converter
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '600px', marginBottom: '24px' }}>
          How do you get <span style={{ color: colors.accent, fontWeight: 700 }}>12V</span> from
          a <span style={{ color: colors.secondary, fontWeight: 700 }}>3.7V battery</span>?
          The boost converter stores energy in an inductor and releases it at higher voltage.
        </p>

        <div style={{
          background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '32px',
          maxWidth: '520px', border: `1px solid ${colors.border}`, width: '100%',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: colors.secondary }}>3.7V</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Battery</div>
            </div>
            <div style={{ fontSize: '24px', color: colors.accent, animation: 'pulse 1.5s infinite' }}>&#x27A1;</div>
            <div style={{
              padding: '12px 20px', background: `${colors.accent}22`, borderRadius: '12px',
              border: `1px solid ${colors.accent}44`,
            }}>
              <div style={{ ...typo.small, color: colors.accent, fontWeight: 700 }}>BOOST</div>
              <div style={{ fontSize: '10px', color: colors.textMuted }}>DC-DC</div>
            </div>
            <div style={{ fontSize: '24px', color: colors.accent, animation: 'pulse 1.5s infinite' }}>&#x27A1;</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: colors.success }}>12V</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Output</div>
            </div>
          </div>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic', margin: 0 }}>
            "By rapidly switching current through an inductor, we can step voltage UP -
            powering everything from LED flashlights to electric vehicles."
          </p>
        </div>

        <div style={{ width: '80px', height: '2px', background: colors.accentGlow, margin: '0 auto 24px' }} />

        <button onClick={() => { playSound('click'); emitEvent(onGameEvent, 'game_started'); nextPhase(); }}
          style={primaryButtonStyle}>
          Explore Boost Converters
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // ── PREDICT PHASE ──
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'The inductor blocks current, forcing voltage to increase across the load' },
      { id: 'b', text: 'The inductor stores energy during switch-ON and releases it at higher voltage during switch-OFF', correct: true },
      { id: 'c', text: 'The switch directly doubles the voltage through transformer action' },
    ];

    return (
      <div style={pageStyle}>
        {renderProgressBar()}
        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.accent}22`, borderRadius: '12px', padding: '16px',
            marginBottom: '24px', border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0, fontWeight: 600 }}>
              Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
            A 3.7V lithium battery feeds a boost converter that outputs 12V. How does it produce a voltage HIGHER than its input?
          </h2>

          <div style={{
            background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '24px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              Hint: The circuit uses an inductor, a fast switch (MOSFET), a diode, and an output capacitor.
              The switch toggles ON and OFF thousands of times per second.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {options.map(opt => (
              <button key={opt.id}
                onClick={() => {
                  playSound('click');
                  setPrediction(opt.id);
                  emitEvent(onGameEvent, 'prediction_made', { prediction: opt.id });
                }}
                style={{
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px', padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                }}>
                <span style={{
                  display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: prediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center', lineHeight: '24px', marginRight: '10px', fontSize: '12px', fontWeight: 700,
                }}>{opt.id.toUpperCase()}</span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.text}</span>
              </button>
            ))}
          </div>

          {prediction && (
            <button onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}>
              Test Your Prediction
            </button>
          )}
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ── PLAY PHASE ──
  if (phase === 'play') {
    return (
      <div style={pageStyle}>
        {renderProgressBar()}
        <div style={{ maxWidth: '900px', margin: '40px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Boost Converter Experiment
          </h2>
          <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '20px', textAlign: 'center' }}>
            Adjust controls and observe how Vout = Vin / (1 - D) shapes the output
          </p>

          <SideBySideLayout
            left={
              <div>
                <BoostCircuitSVG showCurrentPath />
                <div style={{ height: '16px' }} />
                <InductorWaveformSVG showVout />

                {/* Readouts */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '16px',
                }}>
                  <Readout label="Vout (ideal)" value={voutIdeal.toFixed(1)} unit="V" color={colors.accent} />
                  <Readout label="IL avg" value={iin.toFixed(2)} unit="A" color={colors.secondary} />
                  <Readout label="IL peak" value={iLpeak.toFixed(2)} unit="A" color={colors.warning} />
                </div>
              </div>
            }
            right={
              <div style={{
                background: colors.bgCard, borderRadius: '12px', padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>Controls</h3>
                <Slider label="Input Voltage (Vin)" value={vinput} min={3} max={12} step={0.1} unit="V" onChange={setVinput} color={colors.secondary} />
                <Slider label="Duty Cycle (D)" value={dutyCycle} min={0} max={95} step={1} unit="%" onChange={setDutyCycle} color={colors.accent} />
                <Slider label="Switching Frequency" value={switchFreq} min={50} max={500} step={10} unit="kHz" onChange={setSwitchFreq} />
                <Slider label="Inductance (L)" value={inductance} min={1} max={220} step={1} unit="uH" onChange={setInductance} />
                <Slider label="Load Resistance" value={loadResistance} min={10} max={1000} step={10} unit="ohm" onChange={setLoadResistance} />

                <div style={{
                  background: `${colors.accent}15`, borderRadius: '10px', padding: '14px', marginTop: '16px',
                  border: `1px solid ${colors.accent}33`,
                }}>
                  <div style={{ ...typo.small, color: colors.accent, fontWeight: 700, marginBottom: '6px' }}>
                    Formula: Vout = Vin / (1 - D)
                  </div>
                  <div style={{ ...typo.small, color: colors.textSecondary }}>
                    Vout = {vinput} / (1 - {(dutyCycle / 100).toFixed(2)}) = <span style={{ color: colors.accent, fontWeight: 700 }}>{voutIdeal.toFixed(2)}V</span>
                  </div>
                </div>

                <div style={{
                  background: colors.bgPrimary, borderRadius: '10px', padding: '14px', marginTop: '12px',
                  border: `1px solid ${colors.border}`,
                }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '4px' }}>
                    Try these challenges:
                  </div>
                  <div style={{ ...typo.small, color: colors.textSecondary, lineHeight: 1.8 }}>
                    1. Set Vin=3.7V. What D gives 5V? (USB)<br />
                    2. Set Vin=5V. What D gives 12V?<br />
                    3. Increase D to 90%. What happens to IL?
                  </div>
                </div>
              </div>
            }
          />

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}>
              I understand the basics
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ── REVIEW PHASE ──
  if (phase === 'review') {
    const concepts = [
      {
        title: 'Energy Storage: Switch ON',
        desc: 'When the MOSFET switch closes, current flows from Vin through the inductor to ground. The inductor current ramps up linearly (V = L * di/dt), storing energy in its magnetic field.',
        formula: 'E_stored = 0.5 * L * I^2',
      },
      {
        title: 'Energy Release: Switch OFF',
        desc: 'When the switch opens, the inductor resists current change. It forces current through the diode to the output. The inductor voltage ADDS to Vin, producing Vout > Vin.',
        formula: 'V_inductor = -L * di/dt (reverse polarity)',
      },
      {
        title: 'The Boost Formula',
        desc: 'In steady state, the volt-second balance on the inductor gives: Vin * D = (Vout - Vin) * (1-D). Solving: Vout = Vin / (1 - D). As D approaches 1, Vout approaches infinity (ideally).',
        formula: 'Vout = Vin / (1 - D)',
      },
      {
        title: 'Energy Conservation',
        desc: 'Power in equals power out (ideally): Pin = Pout, so Vin * Iin = Vout * Iout. Since Vout > Vin, the output current must be less than the input current. You trade current for voltage.',
        formula: 'Iin = Iout / (1 - D)',
      },
    ];

    return (
      <div style={pageStyle}>
        {renderProgressBar()}
        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            How Boost Conversion Works
          </h2>

          {concepts.map((c, i) => (
            <div key={i} style={{
              background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '16px',
              borderLeft: `3px solid ${colors.accent}`, border: `1px solid ${colors.border}`,
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '8px' }}>{c.title}</h3>
              <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '10px', lineHeight: 1.7 }}>{c.desc}</p>
              <div style={{
                background: colors.bgPrimary, borderRadius: '8px', padding: '10px 14px',
                fontFamily: 'monospace', color: colors.accent, fontSize: '14px', fontWeight: 600,
              }}>
                {c.formula}
              </div>
            </div>
          ))}

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}>
              Now, what limits the boost ratio?
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ── TWIST PREDICT PHASE ──
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'The diode blocks current above a certain voltage' },
      { id: 'b', text: 'Parasitic resistances (inductor DCR, switch Rds_on, diode Vf) cause increasing losses at high duty cycles', correct: true },
      { id: 'c', text: 'The switching frequency becomes too high for the circuit to handle' },
    ];

    return (
      <div style={pageStyle}>
        {renderProgressBar()}
        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.error}22`, borderRadius: '12px', padding: '16px',
            marginBottom: '24px', border: `1px solid ${colors.error}44`,
          }}>
            <p style={{ ...typo.small, color: colors.error, margin: 0, fontWeight: 600 }}>
              The Twist: Real-World Limits
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
            The ideal formula says Vout = Vin/(1-D) goes to infinity as D approaches 1. But in practice, what limits the maximum boost ratio?
          </h2>

          <div style={{
            background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '24px',
            border: `1px solid ${colors.border}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              A real boost converter with D=95% does NOT produce 20x the input voltage. Something fundamental limits it.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {options.map(opt => (
              <button key={opt.id}
                onClick={() => {
                  playSound('click');
                  setTwistPrediction(opt.id);
                  emitEvent(onGameEvent, 'prediction_made', { twist: true, prediction: opt.id });
                }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.error}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.error : colors.border}`,
                  borderRadius: '10px', padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                }}>
                <span style={{
                  display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.error : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center', lineHeight: '24px', marginRight: '10px', fontSize: '12px', fontWeight: 700,
                }}>{opt.id.toUpperCase()}</span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.text}</span>
              </button>
            ))}
          </div>

          {twistPrediction && (
            <button onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}>
              Explore Parasitic Effects
            </button>
          )}
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ── TWIST PLAY PHASE ──
  if (phase === 'twist_play') {
    const effClamp = Math.max(0, Math.min(100, efficiency));
    const voutRealClamped = Math.max(0, voutReal);

    return (
      <div style={pageStyle}>
        {renderProgressBar()}
        <div style={{ maxWidth: '900px', margin: '40px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Parasitic Losses in Boost Converters
          </h2>
          <p style={{ ...typo.small, color: colors.textMuted, marginBottom: '20px', textAlign: 'center' }}>
            Watch how real output voltage diverges from ideal as duty cycle increases
          </p>

          <SideBySideLayout
            left={
              <div>
                <BoostCircuitSVG showCurrentPath showParasitics />
                <div style={{ height: '16px' }} />

                {/* Ideal vs Real comparison chart */}
                <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px', border: `1px solid ${colors.border}` }}>
                  <div style={{ ...typo.small, color: colors.textMuted, marginBottom: '10px', fontWeight: 600 }}>
                    Output Voltage: Ideal vs Real
                  </div>
                  <svg width="100%" height={isMobile ? 120 : 150} viewBox={`0 0 ${isMobile ? 340 : 460} ${isMobile ? 120 : 150}`}
                    preserveAspectRatio="xMidYMid meet" style={{ maxWidth: isMobile ? '340px' : '460px' }}>
                    {/* Plot ideal and real Vout vs D */}
                    {(() => {
                      const pw = isMobile ? 280 : 400;
                      const ph = isMobile ? 90 : 120;
                      const ox = 50;
                      const oy = 10;
                      const maxV = 60;
                      const idealPts: string[] = [];
                      const realPts: string[] = [];
                      for (let di = 0; di <= 95; di += 2) {
                        const dd = di / 100;
                        const x = ox + (di / 95) * pw;
                        const vi = boostIdeal(vinput, dd);
                        const vr = boostWithLosses(vinput, dd, rInductor, rSwitch, vDiode, loadResistance);
                        const yi = oy + ph - Math.min(vi / maxV, 1) * ph;
                        const yr = oy + ph - Math.max(0, Math.min(vr / maxV, 1)) * ph;
                        idealPts.push(`${di === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yi.toFixed(1)}`);
                        realPts.push(`${di === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yr.toFixed(1)}`);
                      }
                      // Current D marker
                      const mx = ox + (dutyCycle / 95) * pw;
                      return (
                        <>
                          <line x1={ox} y1={oy + ph} x2={ox + pw} y2={oy + ph} stroke={colors.textMuted} strokeWidth={1} />
                          <line x1={ox} y1={oy} x2={ox} y2={oy + ph} stroke={colors.textMuted} strokeWidth={1} />
                          <path d={idealPts.join(' ')} fill="none" stroke={colors.textMuted} strokeWidth={1.5} strokeDasharray="4 2" />
                          <path d={realPts.join(' ')} fill="none" stroke={colors.error} strokeWidth={2.5} />
                          <line x1={mx} y1={oy} x2={mx} y2={oy + ph} stroke={colors.accent} strokeWidth={1.5} strokeDasharray="3 3" />
                          <circle cx={mx} cy={oy + ph - Math.max(0, Math.min(voutRealClamped / maxV, 1)) * ph} r={5} fill={colors.accent} stroke="white" strokeWidth={1.5} />
                          <text x={ox + pw / 2} y={oy + ph + 14} fill={colors.textMuted} fontSize="10" textAnchor="middle">Duty Cycle (%)</text>
                          <text x={ox - 5} y={oy + 4} fill={colors.textMuted} fontSize="9" textAnchor="end">{maxV}V</text>
                          <text x={ox - 5} y={oy + ph + 4} fill={colors.textMuted} fontSize="9" textAnchor="end">0</text>
                          {/* Legend */}
                          <line x1={ox + pw - 100} y1={oy + 8} x2={ox + pw - 80} y2={oy + 8} stroke={colors.textMuted} strokeWidth={1.5} strokeDasharray="4 2" />
                          <text x={ox + pw - 75} y={oy + 12} fill={colors.textMuted} fontSize="9">Ideal</text>
                          <line x1={ox + pw - 100} y1={oy + 22} x2={ox + pw - 80} y2={oy + 22} stroke={colors.error} strokeWidth={2.5} />
                          <text x={ox + pw - 75} y={oy + 26} fill={colors.error} fontSize="9">Real</text>
                        </>
                      );
                    })()}
                  </svg>
                </div>

                {/* Readouts */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '12px' }}>
                  <Readout label="Ideal Vout" value={voutIdeal.toFixed(1)} unit="V" color={colors.textMuted} />
                  <Readout label="Real Vout" value={voutRealClamped.toFixed(1)} unit="V" color={colors.error} />
                  <Readout label="Efficiency" value={effClamp.toFixed(1)} unit="%" color={effClamp > 85 ? colors.success : effClamp > 60 ? colors.warning : colors.error} />
                </div>
              </div>
            }
            right={
              <div style={{
                background: colors.bgCard, borderRadius: '12px', padding: '20px',
                border: `1px solid ${colors.border}`,
              }}>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>Parasitic Controls</h3>
                <Slider label="Duty Cycle (D)" value={dutyCycle} min={0} max={95} step={1} unit="%" onChange={setDutyCycle} color={colors.accent} />
                <Slider label="Input Voltage (Vin)" value={vinput} min={3} max={12} step={0.1} unit="V" onChange={setVinput} color={colors.secondary} />
                <Slider label="Inductor DCR" value={rInductor} min={0.01} max={1} step={0.01} unit=" ohm" onChange={setRInductor} color={colors.error} />
                <Slider label="MOSFET Rds(on)" value={rSwitch} min={0.01} max={0.5} step={0.01} unit=" ohm" onChange={setRSwitch} color={colors.error} />
                <Slider label="Diode Vf" value={vDiode} min={0.1} max={1.0} step={0.05} unit="V" onChange={setVDiode} color={colors.error} />
                <Slider label="Load Resistance" value={loadResistance} min={10} max={1000} step={10} unit=" ohm" onChange={setLoadResistance} />

                <div style={{
                  background: `${colors.error}15`, borderRadius: '10px', padding: '14px', marginTop: '16px',
                  border: `1px solid ${colors.error}33`,
                }}>
                  <div style={{ ...typo.small, color: colors.error, fontWeight: 700, marginBottom: '6px' }}>
                    Key Observation
                  </div>
                  <div style={{ ...typo.small, color: colors.textSecondary, lineHeight: 1.7 }}>
                    Increase D above 85-90%. Watch the real Vout peak and then DROP while ideal Vout keeps climbing.
                    Losses increase as I^2*R. Find the practical maximum boost ratio!
                  </div>
                </div>
              </div>
            }
          />

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}>
              I see the limits
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ── TWIST REVIEW PHASE ──
  if (phase === 'twist_review') {
    const insights = [
      {
        title: 'Inductor DCR Losses',
        desc: 'The inductor wire has resistance (DCR). As D increases, average inductor current rises as Iin = Iout/(1-D). Power lost = Iin^2 * DCR grows quadratically, dominating at high D values.',
        color: colors.error,
      },
      {
        title: 'MOSFET Conduction Losses',
        desc: 'During the ON phase, the MOSFET\'s Rds(on) dissipates power as I^2 * Rds * D. Higher D means more time spent conducting, and higher current amplifies the effect.',
        color: colors.warning,
      },
      {
        title: 'Diode Forward Voltage',
        desc: 'The Schottky diode drops 0.3-0.5V. At high boost ratios the output current is small, but this fixed drop represents an increasing fraction of the output. Synchronous rectification (replacing the diode with a MOSFET) reduces this loss.',
        color: colors.accent,
      },
      {
        title: 'Practical Maximum: ~4-6x Boost',
        desc: 'In practice, boost converters are efficient up to about 4-6x voltage gain. Beyond that, losses make the design impractical. For higher ratios, engineers use coupled inductors, charge pumps, or transformer-based topologies.',
        color: colors.success,
      },
    ];

    return (
      <div style={pageStyle}>
        {renderProgressBar()}
        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Boost Ratios Have Practical Limits
          </h2>

          {insights.map((ins, i) => (
            <div key={i} style={{
              background: colors.bgCard, borderRadius: '12px', padding: '20px', marginBottom: '16px',
              borderLeft: `3px solid ${ins.color}`, border: `1px solid ${colors.border}`,
            }}>
              <h3 style={{ ...typo.h3, color: ins.color, marginBottom: '8px' }}>{ins.title}</h3>
              <p style={{ ...typo.small, color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>{ins.desc}</p>
            </div>
          ))}

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}>
              See Real-World Applications
            </button>
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ── TRANSFER PHASE ──
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Boost Converter"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={{
          h1: String(typo.h1.fontSize),
          h2: String(typo.h2.fontSize),
          h3: String(typo.h3.fontSize),
          body: String(typo.body.fontSize),
          small: String(typo.small.fontSize),
          label: '12px',
        }}
        playSound={playSound}
      />
    );
  }

  // ── TEST PHASE ──
  if (phase === 'test') {
    // Test submitted - show results
    if (testSubmitted) {
      const passed = testScore >= 7;
      const grade = testScore >= 9 ? 'A' : testScore >= 7 ? 'B' : testScore >= 5 ? 'C' : 'D';

      return (
        <div style={pageStyle}>
          {renderProgressBar()}
          <div style={{ maxWidth: '700px', margin: '60px auto 0', textAlign: 'center' }}>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>
              {passed ? '\u{1F389}' : '\u{1F4DA}'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              Grade: <span style={{ color: colors.accent, fontWeight: 700, fontSize: '24px' }}>{grade}</span>
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              {passed ? 'You\'ve mastered Boost Converters!' : 'Review the concepts and try again.'}
            </p>

            {/* Answer review indicators */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {testQuestions.map((q, i) => {
                const correctId = q.options.find(o => o.correct)?.id;
                const isCorrect = testAnswers[i] === correctId;
                return (
                  <div key={i} style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: isCorrect ? colors.success : colors.error,
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 700,
                  }}>
                    {isCorrect ? '\u2713' : '\u2717'}
                  </div>
                );
              })}
            </div>

            {/* Rich answer key */}
            <div style={{ textAlign: 'left', marginBottom: '24px' }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Answer Key</h3>
              {testQuestions.map((q, i) => {
                const correctId = q.options.find(o => o.correct)?.id;
                const userAns = testAnswers[i];
                const isCorrect = userAns === correctId;
                const bgColor = isCorrect ? `${colors.success}15` : `${colors.error}15`;
                const borderColor = isCorrect ? colors.success : colors.error;
                const correctLabel = q.options.find(o => o.correct)?.label;

                return (
                  <div key={i} style={{
                    background: bgColor, borderRadius: '10px', padding: '14px', marginBottom: '10px',
                    borderLeft: `3px solid ${borderColor}`,
                  }}>
                    <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 600, marginBottom: '4px' }}>
                      Q{i + 1}: {q.question}
                    </div>
                    <div style={{ ...typo.small, color: isCorrect ? colors.success : colors.error, marginBottom: '4px' }}>
                      Your answer: {userAns?.toUpperCase()} {isCorrect ? '(Correct)' : '(Incorrect)'}
                    </div>
                    {!isCorrect && (
                      <div style={{ ...typo.small, color: colors.warning, marginBottom: '4px' }}>
                        Correct answer: {correctId?.toUpperCase()} - {correctLabel}
                      </div>
                    )}
                    <div style={{ ...typo.small, color: colors.textMuted, fontStyle: 'italic' }}>
                      {q.explanation}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {passed ? (
                <button
                  onClick={() => { playSound('complete'); nextPhase(); }}
                  style={primaryButtonStyle}>
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
                  style={primaryButtonStyle}>
                  Review and Try Again
                </button>
              )}
              <a href="/games" style={{
                padding: '14px 28px', minHeight: '44px', borderRadius: '10px',
                border: `1px solid ${colors.border}`, background: 'transparent',
                color: colors.textSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
              }}>
                Return to Games
              </a>
            </div>
          </div>
          {renderNavDots()}
        </div>
      );
    }

    // Active question
    const question = testQuestions[currentQuestion];

    return (
      <div style={pageStyle}>
        {renderProgressBar()}
        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          {/* Progress */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Question {currentQuestion + 1} of 10
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: i === currentQuestion ? colors.accent : testAnswers[i] ? colors.success : colors.border,
                }} />
              ))}
            </div>
          </div>

          {/* Scenario */}
          <div style={{
            background: colors.bgCard, borderRadius: '12px', padding: '16px', marginBottom: '16px',
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
              <button key={opt.id}
                onClick={() => {
                  playSound('click');
                  const newAnswers = [...testAnswers];
                  newAnswers[currentQuestion] = opt.id;
                  setTestAnswers(newAnswers);
                  emitEvent(onGameEvent, 'answer_submitted', { question: currentQuestion, answer: opt.id });
                }}
                style={{
                  background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px', padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                }}>
                <span style={{
                  display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center', lineHeight: '24px', marginRight: '10px', fontSize: '12px', fontWeight: 700,
                }}>{opt.id.toUpperCase()}</span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  flex: 1, padding: '14px', minHeight: '44px', borderRadius: '10px',
                  border: `1px solid ${colors.border}`, background: 'transparent',
                  color: colors.textSecondary, cursor: 'pointer',
                }}>
                Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  flex: 1, padding: '14px', minHeight: '44px', borderRadius: '10px', border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white', cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed', fontWeight: 600,
                }}>
                Next Question
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
                  emitEvent(onGameEvent, 'game_completed', { score, total: 10 });
                }}
                disabled={testAnswers.some(a => a === null)}
                style={{
                  flex: 1, padding: '14px', minHeight: '44px', borderRadius: '10px', border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white', cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed', fontWeight: 600,
                }}>
                Submit Test
              </button>
            )}
          </div>
        </div>
        {renderNavDots()}
      </div>
    );
  }

  // ── MASTERY PHASE ──
  if (phase === 'mastery') {
    const grade = testScore >= 9 ? 'A' : testScore >= 7 ? 'B' : testScore >= 5 ? 'C' : 'D';

    return (
      <div style={{
        ...pageStyle,
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{ fontSize: '100px', marginBottom: '24px', animation: 'bounce 1s infinite' }}>
          {'\u{1F3C6}'}
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Boost Converter Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '8px' }}>
          You now understand how boost converters step up voltage using inductor energy storage,
          and why parasitic losses limit the practical boost ratio.
        </p>

        <p style={{ ...typo.body, color: colors.accent, fontWeight: 700, marginBottom: '24px' }}>
          Score: {testScore}/10 | Grade: {grade}
        </p>

        <div style={{
          background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '32px',
          maxWidth: '400px', border: `1px solid ${colors.border}`,
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Learned:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'How inductors store and release energy',
              'The boost formula: Vout = Vin / (1 - D)',
              'Switch ON/OFF phases and current paths',
              'Parasitic losses limit practical boost ratios',
              'Real applications: LEDs, USB PD, solar, EVs',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>{'\u2713'}</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Answer key summary */}
        <div style={{
          background: colors.bgCard, borderRadius: '16px', padding: '24px', marginBottom: '32px',
          maxWidth: '500px', width: '100%', border: `1px solid ${colors.border}`, textAlign: 'left',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Answer Summary</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {testQuestions.map((q, i) => {
              const correctId = q.options.find(o => o.correct)?.id;
              const isCorrect = testAnswers[i] === correctId;
              return (
                <div key={i} style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  background: isCorrect ? `${colors.success}22` : `${colors.error}22`,
                  border: `2px solid ${isCorrect ? colors.success : colors.error}`,
                  color: isCorrect ? colors.success : colors.error,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 700,
                }}>
                  {i + 1}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => {
              emitEvent(onGameEvent, 'mastery_achieved', { score: testScore, total: 10, grade });
              window.location.href = '/games';
            }}
            style={{
              ...primaryButtonStyle,
              background: `linear-gradient(135deg, ${colors.success}, #059669)`,
              boxShadow: `0 4px 20px rgba(16, 185, 129, 0.3)`,
            }}>
            Complete Game
          </button>
          <button onClick={() => goToPhase('hook')}
            style={{
              padding: '14px 28px', minHeight: '44px', borderRadius: '10px',
              border: `1px solid ${colors.border}`, background: 'transparent',
              color: colors.textSecondary, cursor: 'pointer', fontWeight: 600,
            }}>
            Play Again
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default BoostConverterRenderer;
