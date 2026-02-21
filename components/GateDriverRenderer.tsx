'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// -----------------------------------------------------------------------------
// Gate Driver Design - Complete 10-Phase Learning Game (#268)
// Why MOSFETs need gate drivers: gate charge, Miller plateau, switching losses
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

interface GateDriverRendererProps {
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
    scenario: "An engineer is designing a half-bridge motor driver using IRF540 MOSFETs (Qg = 72nC). The gate driver IC can source 2A peak current at 12V. The design must switch at 20kHz.",
    question: "What is the minimum turn-on time the gate driver can achieve?",
    options: [
      { id: 'a', label: "36ns - calculated as Qg / Idriver = 72nC / 2A = 36ns", correct: true },
      { id: 'b', label: "72ns - the gate charge equals the switching time in nanoseconds" },
      { id: 'c', label: "144ns - you need to charge and discharge, so double the time" },
      { id: 'd', label: "6ns - modern drivers switch in single-digit nanoseconds regardless of MOSFET" }
    ],
    explanation: "Turn-on time = Qg / Ig = 72nC / 2A = 36ns. This is the theoretical minimum - the driver must supply enough charge (72nC) to fully enhance the MOSFET. The actual time depends on the driver's current capability. Higher gate charge MOSFETs need more powerful drivers for fast switching."
  },
  {
    scenario: "A synchronous buck converter operates at 500kHz with a bus voltage of 48V and 10A load current. The MOSFET has 20ns rise and 30ns fall times. The designer notices the MOSFETs are running hot.",
    question: "What are the switching losses in this converter?",
    options: [
      { id: 'a', label: "0.12W - switching losses are negligible at this frequency" },
      { id: 'b', label: "12W - calculated as 0.5 x V x I x (trise + tfall) x fsw", correct: true },
      { id: 'c', label: "240W - the full power is lost during each switching event" },
      { id: 'd', label: "1.2W - only the gate drive power matters" }
    ],
    explanation: "Switching loss = 0.5 x Vds x Id x (tr + tf) x fsw = 0.5 x 48V x 10A x (20ns + 30ns) x 500kHz = 0.5 x 48 x 10 x 50e-9 x 500e3 = 6W per switch, 12W total. This is why fast gate drivers are critical - cutting switching times in half would save 6W of heat."
  },
  {
    scenario: "A solar inverter uses IGBTs with a total gate charge of 500nC. The gate resistor is 10 ohms and the driver supplies 15V. During testing, the Vgs waveform shows a flat spot at about 6V that lasts longer than expected.",
    question: "What causes this flat spot in the Vgs waveform?",
    options: [
      { id: 'a', label: "The gate-drain capacitance (Miller capacitance) absorbs extra charge as Vds transitions", correct: true },
      { id: 'b', label: "The MOSFET threshold voltage creates a natural plateau" },
      { id: 'c', label: "The gate resistor limits current flow creating a voltage drop" },
      { id: 'd', label: "The driver IC has a current limiting feature that causes the pause" }
    ],
    explanation: "The Miller plateau occurs because the gate-drain capacitance (Cgd) must be charged as Vds swings. During this time, all gate current flows into Cgd rather than Cgs, so Vgs stays flat. The voltage at which this occurs is the Miller plateau voltage. This is the period where Vds is actually transitioning - the critical switching loss interval."
  },
  {
    scenario: "A high-side MOSFET in a half-bridge configuration has its source connected to the switching node, which swings between 0V and 400V. A standard gate driver referenced to ground cannot drive this MOSFET.",
    question: "What technique is used to drive the high-side MOSFET?",
    options: [
      { id: 'a', label: "Simply use a higher voltage gate driver rated for 400V" },
      { id: 'b', label: "A bootstrap circuit charges a capacitor when the low-side is ON, then uses it to drive the high-side gate", correct: true },
      { id: 'c', label: "Connect the gate directly to a separate isolated power supply" },
      { id: 'd', label: "Use a PNP transistor to level-shift the gate signal" }
    ],
    explanation: "Bootstrap circuits use a diode and capacitor. When the low-side switch is ON (output = 0V), the bootstrap capacitor charges to Vcc through the diode. When the high-side turns ON, the capacitor floats up with the source terminal, providing Vgs above the source voltage. This elegant solution avoids expensive isolated supplies."
  },
  {
    scenario: "Two identical MOSFETs in a half-bridge are switching at 100kHz. The dead time between high-side turn-off and low-side turn-on is set to 50ns. An engineer proposes reducing dead time to 10ns for better efficiency.",
    question: "What is the primary risk of insufficient dead time?",
    options: [
      { id: 'a', label: "The MOSFETs will not fully turn off, causing shoot-through current that can destroy both devices", correct: true },
      { id: 'b', label: "The output voltage will have more ripple" },
      { id: 'c', label: "The switching frequency will decrease" },
      { id: 'd', label: "The gate drivers will overheat" }
    ],
    explanation: "If both MOSFETs conduct simultaneously (shoot-through), a low-impedance path forms from supply to ground. The resulting current spike can be hundreds of amps, destroying both MOSFETs in microseconds. Dead time ensures one MOSFET is fully OFF before the other turns ON. Too much dead time wastes efficiency; too little risks catastrophic failure."
  },
  {
    scenario: "A GaN FET has total gate charge of only 5nC compared to a silicon MOSFET's 50nC at similar ratings. Both are used in a 1MHz DC-DC converter with the same gate driver.",
    question: "What advantage does the GaN FET's lower gate charge provide?",
    options: [
      { id: 'a', label: "Lower on-resistance for less conduction loss" },
      { id: 'b', label: "10x faster switching transitions, dramatically reducing switching losses at 1MHz", correct: true },
      { id: 'c', label: "Higher voltage rating for more design margin" },
      { id: 'd', label: "Better thermal performance due to wider bandgap" }
    ],
    explanation: "With 10x less gate charge, the same driver current switches the GaN FET 10x faster. At 1MHz, switching events happen 1 million times per second - each nanosecond saved multiplied by fsw yields significant loss reduction. This is why GaN dominates high-frequency power conversion: the tiny gate charge enables multi-MHz operation where silicon MOSFETs would melt."
  },
  {
    scenario: "An EV traction inverter uses SiC MOSFETs at 800V, 400A. The gate driver uses +20V/-5V swing with a 2.5 ohm gate resistor. The MOSFET Qg is 200nC. A negative gate voltage is applied during OFF state.",
    question: "Why is a negative gate voltage used to turn OFF the SiC MOSFET?",
    options: [
      { id: 'a', label: "SiC MOSFETs have a higher threshold voltage requiring negative bias" },
      { id: 'b', label: "The negative voltage provides noise immunity against parasitic turn-on from high dV/dt events", correct: true },
      { id: 'c', label: "It reduces the on-state resistance of the MOSFET" },
      { id: 'd', label: "Negative voltage is required by the SiC crystal structure" }
    ],
    explanation: "When the opposite switch turns ON rapidly, the dV/dt across the OFF MOSFET couples through the Miller capacitance (Cgd), injecting current into the gate. If Vgs rises above threshold, the MOSFET spuriously turns ON causing shoot-through. A -5V gate bias means the parasitic coupling must overcome 5V before reaching threshold, providing crucial noise margin."
  },
  {
    scenario: "A designer chooses a gate resistor of 100 ohms to slow down switching and reduce EMI. The MOSFET has Qg = 40nC and the driver outputs 12V.",
    question: "What is the approximate turn-on time with this gate resistor?",
    options: [
      { id: 'a', label: "40ns - gate charge divided by average current" },
      { id: 'b', label: "333ns - using RC time constant with the 100 ohm resistor and effective gate capacitance", correct: true },
      { id: 'c', label: "4us - gate resistor dominates the time constant" },
      { id: 'd', label: "100ns - simply multiply resistance by charge" }
    ],
    explanation: "The peak gate current is Vdriver/Rg = 12V/100ohm = 120mA. Turn-on time approximates Qg/Ig_avg, but since current decreases as capacitor charges, the average is roughly Vdriver/(2*Rg). More precisely, t_on ~ Qg x Rg / Vdriver = 40nC x 100 / 12 = 333ns. This 100 ohm resistor slows switching dramatically compared to a typical 2-5 ohm resistor."
  },
  {
    scenario: "A half-bridge gate driver IC specifies a maximum bootstrap capacitor refresh time of 10 microseconds. The converter operates at 50kHz with a maximum duty cycle of 95%.",
    question: "Why might this design fail at 95% duty cycle?",
    options: [
      { id: 'a', label: "The high-side ON time exceeds the bootstrap capacitor's charge hold time, causing Vgs to droop", correct: true },
      { id: 'b', label: "95% duty cycle exceeds the driver's maximum PWM resolution" },
      { id: 'c', label: "The bootstrap diode cannot block enough voltage" },
      { id: 'd', label: "The low-side MOSFET overheats at 5% duty cycle" }
    ],
    explanation: "At 50kHz, one period = 20us. At 95% duty cycle, the high-side is ON for 19us and the low-side only 1us. The bootstrap cap only recharges during low-side ON time (1us), but the high-side gate needs charge for 19us. If the cap's stored charge depletes before 19us, Vgs drops and the MOSFET enters linear region, dissipating massive power. The 10us spec means failure above ~50% duty."
  },
  {
    scenario: "A power supply designer is comparing two MOSFETs for a 200kHz converter: MOSFET A has Rds(on) = 5 milliohms, Qg = 100nC. MOSFET B has Rds(on) = 20 milliohms, Qg = 25nC.",
    question: "Which MOSFET likely has lower total losses and why?",
    options: [
      { id: 'a', label: "MOSFET A always wins because lower Rds(on) means less conduction loss" },
      { id: 'b', label: "It depends on operating conditions - there is a Qg x Rds(on) figure of merit tradeoff", correct: true },
      { id: 'c', label: "MOSFET B always wins because gate charge determines total losses" },
      { id: 'd', label: "Both have identical losses since they trade off exactly" }
    ],
    explanation: "Total loss = conduction loss (I^2 x Rds(on)) + switching loss (proportional to Qg x fsw). At low frequency and high current, MOSFET A wins (low Rds(on)). At high frequency and low current, MOSFET B wins (low Qg). The Qg x Rds(on) figure of merit (FOM) helps compare: A = 500, B = 500 - they are equivalent FOMs, so the application determines the winner."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '\u26A1',
    title: 'EV Traction Inverters',
    short: 'Driving 300kW motors with precision',
    tagline: 'Gate drivers that handle 800V at microsecond precision',
    description: 'Electric vehicle traction inverters switch SiC MOSFETs or IGBTs at 800V and hundreds of amps. The gate driver must turn ON/OFF these massive switches in under 100ns while maintaining isolation between the high-voltage bus and the control logic. Failure to switch cleanly causes shoot-through, overheating, or EMI that disrupts the vehicle electronics.',
    connection: 'The gate charge and Miller plateau concepts you explored directly determine how fast an EV inverter can switch. SiC MOSFETs with low Qg enable higher switching frequencies (20-40kHz vs 8kHz for IGBTs), reducing motor torque ripple and acoustic noise while improving efficiency by 2-3%.',
    howItWorks: 'Isolated gate drivers use transformers or optocouplers to bridge the voltage gap between the controller (3.3V logic) and the power stage (800V bus). Bootstrap circuits power high-side drivers. Advanced features include desaturation detection (shoots through protection), active Miller clamp (prevents parasitic turn-on), and soft turn-off (limits voltage overshoot during fault conditions).',
    stats: [
      { value: '800V', label: 'Bus voltage in modern EVs', icon: '\u26A1' },
      { value: '<50ns', label: 'Target switching time', icon: '\u23F1' },
      { value: '500A', label: 'Peak phase current', icon: '\uD83D\uDD0B' }
    ],
    examples: ['Tesla Model 3 SiC inverter', 'Porsche Taycan 800V drive', 'BYD e-Platform 3.0', 'Rivian quad motor system'],
    companies: ['Infineon', 'Wolfspeed', 'STMicroelectronics', 'Texas Instruments', 'Broadcom'],
    futureImpact: 'Next-generation gate drivers will integrate current sensing, temperature monitoring, and predictive fault detection on a single chip. GaN-on-SiC devices will push switching frequencies above 100kHz, enabling smaller magnetics and lighter inverters for aerospace and automotive applications.',
    color: '#EF4444'
  },
  {
    icon: '\u2600\uFE0F',
    title: 'Solar Microinverters',
    short: 'Panel-level power conversion',
    tagline: 'Gate drivers enabling 99% efficiency at the panel',
    description: 'Microinverters convert DC from a single solar panel to AC at the panel itself. They use GaN FETs switching at 1-3MHz, enabled by ultra-fast gate drivers. The tiny gate charge of GaN (5-10nC) allows switching speeds impossible with silicon, making compact, efficient designs that fit behind each panel.',
    connection: 'The relationship between gate charge and switching speed you learned is exactly why GaN revolutionized microinverters. With 10x less Qg than silicon, the same gate driver achieves 10x faster transitions, cutting switching losses by 90% at MHz frequencies.',
    howItWorks: 'GaN gate drivers must handle the unique requirements of enhancement-mode GaN FETs: maximum Vgs of only 6V (vs 20V for silicon), very fast dV/dt immunity (>200V/ns), and precise dead-time control (<5ns). Integrated GaN+driver solutions eliminate parasitic inductance between driver and gate, critical at multi-MHz frequencies.',
    stats: [
      { value: '99.2%', label: 'Peak CEC efficiency', icon: '\u2600\uFE0F' },
      { value: '2MHz', label: 'Switching frequency', icon: '\uD83D\uDD0C' },
      { value: '5nC', label: 'GaN total gate charge', icon: '\uD83C\uDFAF' }
    ],
    examples: ['Enphase IQ8 microinverter', 'AP Systems DS3', 'SolarEdge Power Optimizer', 'Tigo TS4 platform'],
    companies: ['Enphase', 'GaN Systems', 'EPC', 'Navitas', 'Power Integrations'],
    futureImpact: 'Monolithic GaN ICs will integrate the gate driver, power FETs, and control logic on a single die, reducing cost and size while pushing efficiency above 99.5%. This enables building-integrated photovoltaics where every window and facade tile has its own power converter.',
    color: '#F59E0B'
  },
  {
    icon: '\uD83D\uDDA5\uFE0F',
    title: 'Server VRM Gate Drivers',
    short: 'Powering AI chips at 1000A',
    tagline: 'Multi-phase drivers for next-gen processors',
    description: 'AI accelerators like NVIDIA H100 consume over 700W at sub-1V, requiring 1000+ amps from the voltage regulator module (VRM). Each VRM phase uses a DrMOS package containing the gate driver and two MOSFETs in a single IC. The gate driver must switch at 500kHz-1MHz with precise timing to minimize losses.',
    connection: 'The Qg vs Rds(on) tradeoff you explored is the central challenge in VRM design. At 1MHz, every nanosecond of switching time matters. DrMOS packages minimize the gate loop inductance to under 0.5nH, enabling sub-10ns switching that would be impossible with discrete gate drivers.',
    howItWorks: 'Multi-phase VRM controllers orchestrate 12-16 phases with interleaved switching to reduce ripple. Each phase gate driver handles adaptive dead time (adjusting ns by ns based on load), phase shedding (turning off unused phases at light load), and tri-state operation for zero-crossing detection. The driver current exceeds 4A per phase.',
    stats: [
      { value: '16', label: 'Phases per GPU VRM', icon: '\uD83D\uDD22' },
      { value: '1MHz', label: 'Per-phase switching freq', icon: '\u26A1' },
      { value: '4A', label: 'Gate drive current', icon: '\uD83D\uDCCA' }
    ],
    examples: ['NVIDIA H100/B200 power delivery', 'AMD MI300X VRM', 'Intel Xeon server boards', 'Renesas RAA228xx controllers'],
    companies: ['Renesas', 'MPS', 'Infineon', 'Texas Instruments', 'ON Semiconductor'],
    futureImpact: 'Integrated voltage regulators (IVR) will move gate drivers onto the processor die itself, driving on-chip power FETs with femtosecond precision. This eliminates board-level parasitics and enables per-core voltage scaling, potentially saving 10-20% of data center power consumption.',
    color: '#3B82F6'
  },
  {
    icon: '\uD83C\uDFED',
    title: 'Industrial Motor Drives',
    short: 'Precision control for manufacturing',
    tagline: 'Isolated gate drivers for safety-critical applications',
    description: 'Industrial variable frequency drives (VFDs) control motors from fractional HP to 10,000+ HP. The gate driver must provide reinforced isolation (5kV+) between the control circuit and the high-voltage power stage. Features like desaturation detection can shut down the drive in microseconds if a short circuit is detected.',
    connection: 'The switching loss formula you learned (P = 0.5 x V x I x (tr + tf) x fsw) directly determines the thermal design of industrial drives. A 480V/100A drive with 200ns switching transitions at 16kHz loses over 75W per switch just from switching. Gate driver speed is the key to reducing this.',
    howItWorks: 'Isolated gate drivers use coreless transformer or capacitive isolation to achieve 5kV+ withstand voltage. Active Miller clamp circuits sink current from the gate during turn-off to prevent dV/dt induced turn-on. Soft turn-on (controlled gate resistance) limits di/dt to reduce EMI. Two-level turn-off first reduces current, then fully shuts the gate.',
    stats: [
      { value: '5kV', label: 'Isolation voltage rating', icon: '\uD83D\uDD12' },
      { value: '< 2us', label: 'Short circuit response', icon: '\u23F0' },
      { value: '100kW+', label: 'Drive power range', icon: '\uD83C\uDFED' }
    ],
    examples: ['ABB ACS880 drives', 'Siemens SINAMICS', 'Yaskawa GA500', 'Danfoss VLT series'],
    companies: ['ABB', 'Siemens', 'Infineon', 'Silicon Labs', 'Broadcom'],
    futureImpact: 'Predictive gate driver health monitoring will use AI to detect degradation in isolation barriers and switching performance before failure. Digital isolators with integrated power delivery will simplify designs while improving reliability. SiC adoption in industrial drives will push switching frequencies from 16kHz to 64kHz+, eliminating audible noise.',
    color: '#10B981'
  }
];

// -----------------------------------------------------------------------------
// PREDICTION OPTIONS
// -----------------------------------------------------------------------------
const hookPredictions = [
  { id: 'gate_charge', label: 'The time it takes to charge the gate capacitor determines switching speed', correct: true },
  { id: 'on_resistance', label: 'The on-resistance of the MOSFET causes all the heat' },
  { id: 'wire_resistance', label: 'The PCB trace resistance creates the losses' },
  { id: 'frequency', label: 'The switching frequency has no effect on losses' }
];

const twistPredictions = [
  { id: 'threshold', label: 'A brief pause at the threshold voltage while the channel forms' },
  { id: 'miller', label: 'A flat region where gate current charges the Miller capacitance (Cgd) as Vds transitions', correct: true },
  { id: 'saturation', label: 'The gate voltage saturating at the driver supply voltage' },
  { id: 'breakdown', label: 'The gate oxide beginning to break down under stress' }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const GateDriverRenderer: React.FC<GateDriverRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [gateVoltage, setGateVoltage] = useState(12);       // V, gate drive voltage
  const [gateResistance, setGateResistance] = useState(5);   // ohms
  const [totalQg, setTotalQg] = useState(60);                // nC total gate charge
  const [millerCharge, setMillerCharge] = useState(20);       // nC Miller plateau charge
  const [switchingFreq, setSwitchingFreq] = useState(100);    // kHz
  const [busVoltage] = useState(48);                          // V bus voltage
  const [loadCurrent] = useState(10);                         // A load current
  const [millerClamp, setMillerClamp] = useState(false);      // twist: active Miller clamp
  const [isAnimating, setIsAnimating] = useState(true);
  const [animationPhase, setAnimationPhase] = useState(0);

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

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;
    const timer = setInterval(() => {
      setAnimationPhase(f => (f + 2) % 360);
    }, 30);
    return () => clearInterval(timer);
  }, [isAnimating]);

  // Sync phase with gamePhase prop
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      setPhase(gamePhase as Phase);
    }
  }, [gamePhase]);

  // Physics calculations
  const calculateGateDriver = useCallback(() => {
    // Gate current: Ig = Vdriver / Rg
    const peakCurrent = gateVoltage / gateResistance; // A

    // Gate charge regions
    const qgs = totalQg - millerCharge;  // charge to reach Miller plateau
    const qgd = millerCharge;            // Miller plateau charge
    const qTotal = totalQg;

    // Switching times
    // Time to charge Cgs to threshold (~40% of Qgs)
    const tThreshold = (qgs * 0.4) / peakCurrent; // ns (using nC / A = ns)
    // Time for Miller plateau (Qgd at roughly constant current)
    const tMiller = qgd / peakCurrent;
    // Time to complete charging
    const tComplete = (qgs * 0.6) / peakCurrent;
    // Total turn-on time
    const tTurnOn = tThreshold + tMiller + tComplete;

    // Miller clamp reduces turn-off Miller time by ~60%
    const millerMultiplier = millerClamp ? 0.4 : 1.0;
    const tTurnOff = tThreshold + (tMiller * millerMultiplier) + tComplete;

    // Switching loss: P = 0.5 * V * I * (trise + tfall) * fsw
    const tRise = tMiller; // Most of Vds transition happens during Miller
    const tFall = tMiller * millerMultiplier;
    const switchingLoss = 0.5 * busVoltage * loadCurrent * ((tRise + tFall) * 1e-9) * (switchingFreq * 1e3);

    // Gate drive loss: P = Qg * Vdriver * fsw
    const gateDriveLoss = (qTotal * 1e-9) * gateVoltage * (switchingFreq * 1e3);

    // Conduction loss (fixed for display)
    const rdsOn = 0.01; // 10 milliohms
    const conductionLoss = loadCurrent * loadCurrent * rdsOn;

    // Miller plateau voltage (typically ~5-7V)
    const millerPlateauV = 4 + (gateVoltage * 0.15);

    return {
      peakCurrent,
      tThreshold,
      tMiller,
      tComplete,
      tTurnOn,
      tTurnOff,
      switchingLoss,
      gateDriveLoss,
      conductionLoss,
      totalLoss: switchingLoss + gateDriveLoss + conductionLoss,
      millerPlateauV: Math.min(millerPlateauV, gateVoltage * 0.6),
      qgs,
      qgd,
    };
  }, [gateVoltage, gateResistance, totalQg, millerCharge, switchingFreq, busVoltage, loadCurrent, millerClamp]);

  const calc = calculateGateDriver();

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: 'rgba(148, 163, 184, 0.7)',
    border: '#2a2a3a',
    vgs: '#3B82F6',
    vds: '#EF4444',
    id: '#22C55E',
    miller: '#A855F7',
    gate: '#EC4899',
    driver: '#06B6D4',
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
    hook: 'Intro',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Review',
    twist_predict: 'New Variable',
    twist_play: 'Explore',
    twist_review: 'Deep Insight',
    transfer: 'Transfer',
    test: 'Test',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'gate-driver-design',
        gameTitle: 'Gate Driver Design',
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

  const prevPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex > 0) {
      goToPhase(phaseOrder[currentIndex - 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Test handling
  const handleTestAnswer = (answerId: string) => {
    const newAnswers = [...testAnswers];
    newAnswers[currentQuestion] = answerId;
    setTestAnswers(newAnswers);
    playSound('click');
    if (onGameEvent) {
      onGameEvent({
        eventType: 'answer_submitted',
        gameType: 'gate-driver-design',
        gameTitle: 'Gate Driver Design',
        details: { question: currentQuestion, answer: answerId },
        timestamp: Date.now()
      });
    }
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      const userAnswer = testAnswers[i];
      const correct = q.options.find(o => o.correct)?.id;
      if (userAnswer === correct) score++;
    });
    setTestScore(score);
    setTestSubmitted(true);
    playSound(score >= 8 ? 'success' : 'failure');
    if (onGameEvent) {
      onGameEvent({
        eventType: score >= 8 ? 'correct_answer' : 'incorrect_answer',
        gameType: 'gate-driver-design',
        gameTitle: 'Gate Driver Design',
        details: { score, total: 10 },
        timestamp: Date.now()
      });
    }
  };

  // ---------------------------------------------------------------------------
  // SVG VISUALIZATION: Gate Charge Curve + Switching Waveforms
  // ---------------------------------------------------------------------------
  const renderGateChargeVisualization = (interactive = true) => {
    const width = isMobile ? 360 : 520;
    const height = isMobile ? 380 : 440;
    const svgW = Math.max(width, 520);
    const svgH = Math.max(height, 440);

    // Chart area
    const chartLeft = 60;
    const chartRight = svgW - 30;
    const chartTop = 50;
    const chartBottom = svgH - 60;
    const chartW = chartRight - chartLeft;
    const chartH = chartBottom - chartTop;

    // Gate charge curve parameters
    const vThreshold = calc.millerPlateauV * 0.7;
    const vMiller = calc.millerPlateauV;
    const vFinal = gateVoltage;

    // Normalized charge positions (0 to 1)
    const qThresholdFrac = (calc.qgs * 0.4) / totalQg;
    const qMillerStartFrac = (calc.qgs * 0.4 + calc.qgs * 0.1) / totalQg;
    const qMillerEndFrac = (calc.qgs * 0.5 + calc.qgd) / totalQg;
    const qCompleteFrac = 1.0;

    // Build the Vgs vs Qg curve path
    const buildChargeCurve = () => {
      const points: string[] = [];
      const numPoints = 60;
      for (let i = 0; i <= numPoints; i++) {
        const frac = i / numPoints;
        let vgs: number;

        if (frac < qThresholdFrac) {
          // Region 1: Cgs charging (exponential rise to threshold)
          const regionFrac = frac / qThresholdFrac;
          vgs = vThreshold * regionFrac;
        } else if (frac < qMillerStartFrac) {
          // Transition to Miller
          const regionFrac = (frac - qThresholdFrac) / (qMillerStartFrac - qThresholdFrac);
          vgs = vThreshold + (vMiller - vThreshold) * regionFrac;
        } else if (frac < qMillerEndFrac) {
          // Region 2: Miller plateau (Vgs flat, Cgd charging)
          vgs = vMiller;
        } else {
          // Region 3: Final charge to Vdriver
          const regionFrac = (frac - qMillerEndFrac) / (qCompleteFrac - qMillerEndFrac);
          vgs = vMiller + (vFinal - vMiller) * (1 - Math.exp(-3 * regionFrac));
        }

        const px = chartLeft + frac * chartW;
        const py = chartBottom - (vgs / vFinal) * chartH;
        points.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`);
      }
      return points.join(' ');
    };

    // Animate a dot along the curve
    const animFrac = (animationPhase % 360) / 360;
    let animVgs: number;
    if (animFrac < qThresholdFrac) {
      animVgs = vThreshold * (animFrac / qThresholdFrac);
    } else if (animFrac < qMillerStartFrac) {
      const rf = (animFrac - qThresholdFrac) / (qMillerStartFrac - qThresholdFrac);
      animVgs = vThreshold + (vMiller - vThreshold) * rf;
    } else if (animFrac < qMillerEndFrac) {
      animVgs = vMiller;
    } else {
      const rf = (animFrac - qMillerEndFrac) / (qCompleteFrac - qMillerEndFrac);
      animVgs = vMiller + (vFinal - vMiller) * (1 - Math.exp(-3 * rf));
    }
    const animX = chartLeft + animFrac * chartW;
    const animY = chartBottom - (animVgs / vFinal) * chartH;

    // Miller plateau region highlight
    const millerX1 = chartLeft + qMillerStartFrac * chartW;
    const millerX2 = chartLeft + qMillerEndFrac * chartW;
    const millerY = chartBottom - (vMiller / vFinal) * chartH;

    return (
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        alignItems: isMobile ? 'center' : 'flex-start',
      }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            style={{ width: '100%', maxWidth: width, background: colors.bgCard, borderRadius: '16px' }}
            role="img"
            aria-label={`Gate charge curve showing Vgs vs Qg with Miller plateau at ${vMiller.toFixed(1)}V. Turn-on time: ${calc.tTurnOn.toFixed(0)}ns`}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="gdVgsGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1E40AF" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
              <linearGradient id="gdMillerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.3" />
                <stop offset="50%" stopColor="#A855F7" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="gdVdsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#DC2626" />
                <stop offset="100%" stopColor="#EF4444" />
              </linearGradient>
              <filter id="gdGlow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="gdDotGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FBBF24" stopOpacity="1" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Background grid */}
            <pattern id="gdGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke={colors.border} strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
            <rect width={svgW} height={svgH} fill="url(#gdGrid)" rx="16" />

            {/* Title */}
            <text x={svgW / 2} y="25" textAnchor="middle" fill={colors.textPrimary} fontSize={isMobile ? '16' : '20'} fontWeight="700">
              Gate Charge Curve (Vgs vs Qg)
            </text>
            <text x={svgW / 2} y="42" textAnchor="middle" fill={colors.textMuted} fontSize="11">
              Turn-on: {calc.tTurnOn.toFixed(0)}ns | Ig(peak): {calc.peakCurrent.toFixed(1)}A | P(sw): {calc.switchingLoss.toFixed(2)}W
            </text>

            {/* Axes */}
            <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke={colors.textMuted} strokeWidth="1.5" />
            <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke={colors.textMuted} strokeWidth="1.5" />

            {/* Y-axis label */}
            <text x="15" y={chartTop + chartH / 2} textAnchor="middle" fill={colors.vgs} fontSize="12" fontWeight="600" transform={`rotate(-90, 15, ${chartTop + chartH / 2})`}>Vgs (V)</text>

            {/* X-axis label */}
            <text x={chartLeft + chartW / 2} y={svgH - 10} textAnchor="middle" fill={colors.textMuted} fontSize="12">Gate Charge Qg (nC)</text>

            {/* Y-axis tick marks */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((frac, i) => {
              const y = chartBottom - frac * chartH;
              const v = (frac * vFinal).toFixed(0);
              return (
                <g key={`ytick-${i}`}>
                  <line x1={chartLeft - 5} y1={y} x2={chartLeft} y2={y} stroke={colors.textMuted} strokeWidth="1" />
                  <text x={chartLeft - 8} y={y + 4} textAnchor="end" fill={colors.textMuted} fontSize="10">{v}V</text>
                  <line x1={chartLeft} y1={y} x2={chartRight} y2={y} stroke={colors.border} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4" />
                </g>
              );
            })}

            {/* X-axis tick marks */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((frac, i) => {
              const x = chartLeft + frac * chartW;
              const q = (frac * totalQg).toFixed(0);
              return (
                <g key={`xtick-${i}`}>
                  <line x1={x} y1={chartBottom} x2={x} y2={chartBottom + 5} stroke={colors.textMuted} strokeWidth="1" />
                  <text x={x} y={chartBottom + 16} textAnchor="middle" fill={colors.textMuted} fontSize="10">{q}</text>
                </g>
              );
            })}

            {/* Miller plateau highlight region */}
            <rect
              x={millerX1}
              y={millerY - 5}
              width={millerX2 - millerX1}
              height={chartBottom - millerY + 5}
              fill="url(#gdMillerGrad)"
              rx="4"
            />
            <text x={(millerX1 + millerX2) / 2} y={millerY - 12} textAnchor="middle" fill={colors.miller} fontSize="10" fontWeight="600">
              Miller Plateau
            </text>

            {/* Threshold voltage line */}
            <line
              x1={chartLeft}
              y1={chartBottom - (vThreshold / vFinal) * chartH}
              x2={chartRight}
              y2={chartBottom - (vThreshold / vFinal) * chartH}
              stroke={colors.warning}
              strokeWidth="1"
              strokeDasharray="6 4"
              opacity="0.5"
            />
            <text
              x={chartRight + 2}
              y={chartBottom - (vThreshold / vFinal) * chartH + 4}
              fill={colors.warning}
              fontSize="9"
            >
              Vth
            </text>

            {/* Main Vgs curve */}
            <path
              d={buildChargeCurve()}
              fill="none"
              stroke="url(#gdVgsGrad)"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Vds transition overlay (inverted step during Miller) */}
            {(() => {
              const vdsPoints: string[] = [];
              const numPts = 60;
              for (let i = 0; i <= numPts; i++) {
                const frac = i / numPts;
                let vds: number;
                if (frac < qMillerStartFrac) {
                  vds = busVoltage;
                } else if (frac < qMillerEndFrac) {
                  const rf = (frac - qMillerStartFrac) / (qMillerEndFrac - qMillerStartFrac);
                  vds = busVoltage * (1 - rf);
                } else {
                  vds = 0;
                }
                const px = chartLeft + frac * chartW;
                const py = chartBottom - (vds / busVoltage) * chartH * 0.8;
                vdsPoints.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`);
              }
              return (
                <path
                  d={vdsPoints.join(' ')}
                  fill="none"
                  stroke={colors.vds}
                  strokeWidth="2"
                  strokeDasharray="6 3"
                  opacity="0.6"
                />
              );
            })()}

            {/* Animated dot on Vgs curve */}
            {isAnimating && (
              <circle cx={animX} cy={animY} r={7} fill="url(#gdDotGlow)" filter="url(#gdGlow)" stroke="#fff" strokeWidth="2">
                <animate attributeName="opacity" values="1;0.6;1" dur="0.4s" repeatCount="indefinite" />
              </circle>
            )}

            {/* Region labels */}
            <text x={chartLeft + qThresholdFrac * chartW * 0.5} y={chartBottom - chartH * 0.08} textAnchor="middle" fill={colors.vgs} fontSize="9" opacity="0.8">
              Cgs charge
            </text>
            <text x={chartLeft + ((qMillerEndFrac + qCompleteFrac) / 2) * chartW} y={chartBottom - chartH * 0.55} textAnchor="middle" fill={colors.vgs} fontSize="9" opacity="0.8">
              Final charge
            </text>

            {/* Legend */}
            <rect x={chartRight - 140} y={chartTop + 5} width="135" height="44" rx="6" fill={colors.bgSecondary} stroke={colors.border} strokeWidth="1" opacity="0.9" />
            <line x1={chartRight - 130} y1={chartTop + 20} x2={chartRight - 110} y2={chartTop + 20} stroke={colors.vgs} strokeWidth="3" />
            <text x={chartRight - 105} y={chartTop + 24} fill={colors.vgs} fontSize="10">Vgs</text>
            <line x1={chartRight - 80} y1={chartTop + 20} x2={chartRight - 60} y2={chartTop + 20} stroke={colors.vds} strokeWidth="2" strokeDasharray="4 2" />
            <text x={chartRight - 55} y={chartTop + 24} fill={colors.vds} fontSize="10">Vds</text>
            <rect x={chartRight - 130} y={chartTop + 30} width="12" height="10" rx="2" fill={colors.miller} opacity="0.5" />
            <text x={chartRight - 113} y={chartTop + 39} fill={colors.miller} fontSize="9">Miller region</text>

            {/* Formula */}
            <text x={svgW / 2} y={svgH - 30} textAnchor="middle" fill={colors.accent} fontSize="12" fontWeight="600">
              t(on) = Qg / Ig = {totalQg}nC / {calc.peakCurrent.toFixed(1)}A = {calc.tTurnOn.toFixed(0)}ns
            </text>
          </svg>
        </div>

        {/* Controls panel */}
        {interactive && (
          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Gate Drive Voltage */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Gate Voltage</span>
                  <span data-testid="gate-voltage-value" style={{ color: colors.vgs, fontSize: '13px', fontWeight: 600 }}>{gateVoltage}V</span>
                </div>
                <input
                  type="range" min="5" max="20" value={gateVoltage}
                  onChange={(e) => setGateVoltage(parseInt(e.target.value))}
                  aria-label={`Gate Voltage: ${gateVoltage}V`}
                  style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as const, accentColor: '#3b82f6', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span style={{ color: colors.textMuted, fontSize: '10px' }}>5V</span>
                  <span style={{ color: colors.textMuted, fontSize: '10px' }}>20V</span>
                </div>
              </div>

              {/* Gate Resistance */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Gate Resistance</span>
                  <span data-testid="gate-resistance-value" style={{ color: colors.gate, fontSize: '13px', fontWeight: 600 }}>{gateResistance} ohm</span>
                </div>
                <input
                  type="range" min="1" max="100" value={gateResistance}
                  onChange={(e) => setGateResistance(parseInt(e.target.value))}
                  aria-label={`Gate Resistance: ${gateResistance} ohm`}
                  style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as const, accentColor: '#ec4899', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span style={{ color: colors.textMuted, fontSize: '10px' }}>1 ohm</span>
                  <span style={{ color: colors.textMuted, fontSize: '10px' }}>100 ohm</span>
                </div>
              </div>

              {/* Total Gate Charge */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Total Qg</span>
                  <span data-testid="total-qg-value" style={{ color: colors.accent, fontSize: '13px', fontWeight: 600 }}>{totalQg}nC</span>
                </div>
                <input
                  type="range" min="10" max="200" value={totalQg}
                  onChange={(e) => { const v = parseInt(e.target.value); setTotalQg(v); setMillerCharge(Math.min(millerCharge, Math.floor(v * 0.6))); }}
                  aria-label={`Total Gate Charge: ${totalQg}nC`}
                  style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as const, accentColor: '#f59e0b', cursor: 'pointer' }}
                />
              </div>

              {/* Miller Charge */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Miller Charge (Qgd)</span>
                  <span data-testid="miller-charge-value" style={{ color: colors.miller, fontSize: '13px', fontWeight: 600 }}>{millerCharge}nC</span>
                </div>
                <input
                  type="range" min="2" max={Math.floor(totalQg * 0.6)} value={millerCharge}
                  onChange={(e) => setMillerCharge(parseInt(e.target.value))}
                  aria-label={`Miller Charge: ${millerCharge}nC`}
                  style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as const, accentColor: '#a855f7', cursor: 'pointer' }}
                />
              </div>

              {/* Switching Frequency */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Switching Freq</span>
                  <span data-testid="switching-freq-value" style={{ color: colors.driver, fontSize: '13px', fontWeight: 600 }}>{switchingFreq}kHz</span>
                </div>
                <input
                  type="range" min="10" max="2000" step="10" value={switchingFreq}
                  onChange={(e) => setSwitchingFreq(parseInt(e.target.value))}
                  aria-label={`Switching Frequency: ${switchingFreq}kHz`}
                  style={{ width: '100%', height: '20px', touchAction: 'pan-y', WebkitAppearance: 'none' as const, accentColor: '#06b6d4', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span style={{ color: colors.textMuted, fontSize: '10px' }}>10kHz</span>
                  <span style={{ color: colors.textMuted, fontSize: '10px' }}>2MHz</span>
                </div>
              </div>

              {/* Loss breakdown */}
              <div style={{ background: colors.bgSecondary, padding: '12px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: colors.textPrimary, marginBottom: '8px' }}>Power Loss Breakdown</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ color: colors.vds }}>Switching</span>
                  <span style={{ color: colors.vds, fontWeight: 600 }}>{calc.switchingLoss.toFixed(2)}W</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: colors.bgCard, borderRadius: '2px', marginBottom: '6px' }}>
                  <div style={{ width: `${Math.min(100, (calc.switchingLoss / Math.max(calc.totalLoss, 0.01)) * 100)}%`, height: '100%', background: colors.vds, borderRadius: '2px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ color: colors.gate }}>Gate Drive</span>
                  <span style={{ color: colors.gate, fontWeight: 600 }}>{calc.gateDriveLoss.toFixed(3)}W</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: colors.bgCard, borderRadius: '2px', marginBottom: '6px' }}>
                  <div style={{ width: `${Math.min(100, (calc.gateDriveLoss / Math.max(calc.totalLoss, 0.01)) * 100)}%`, height: '100%', background: colors.gate, borderRadius: '2px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span style={{ color: colors.id }}>Conduction</span>
                  <span style={{ color: colors.id, fontWeight: 600 }}>{calc.conductionLoss.toFixed(2)}W</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: colors.bgCard, borderRadius: '2px', marginBottom: '6px' }}>
                  <div style={{ width: `${Math.min(100, (calc.conductionLoss / Math.max(calc.totalLoss, 0.01)) * 100)}%`, height: '100%', background: colors.id, borderRadius: '2px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: `1px solid ${colors.border}`, paddingTop: '6px' }}>
                  <span style={{ color: colors.textPrimary, fontWeight: 700 }}>Total Loss</span>
                  <span style={{ color: calc.totalLoss > 5 ? colors.error : colors.success, fontWeight: 700 }}>{calc.totalLoss.toFixed(2)}W</span>
                </div>
              </div>

              {/* Control buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setIsAnimating(!isAnimating)}
                  style={{
                    padding: '8px 16px', minHeight: '44px', borderRadius: '8px', border: 'none',
                    background: isAnimating ? colors.error : colors.success, color: 'white',
                    fontWeight: 600, cursor: 'pointer', fontSize: '13px', flex: 1,
                  }}
                >
                  {isAnimating ? 'Pause' : 'Play'}
                </button>
                <button
                  onClick={() => { setGateVoltage(12); setGateResistance(5); setTotalQg(60); setMillerCharge(20); setSwitchingFreq(100); setMillerClamp(false); }}
                  style={{
                    padding: '8px 16px', minHeight: '44px', borderRadius: '8px',
                    border: `2px solid ${colors.accent}`, background: 'transparent',
                    color: colors.accent, fontWeight: 600, cursor: 'pointer', fontSize: '13px', flex: 1,
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // PROGRESS BAR
  // ---------------------------------------------------------------------------
  const renderProgressBar = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <nav
        aria-label="Phase navigation"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '4px', padding: '16px', background: colors.bgSecondary,
          borderBottom: `1px solid ${colors.border}`, overflowX: 'auto',
        }}
      >
        {phaseOrder.map((p, index) => (
          <React.Fragment key={p}>
            <button
              onClick={() => index <= currentIndex && goToPhase(p)}
              disabled={index > currentIndex}
              aria-label={`Go to ${phaseLabels[p]} phase`}
              aria-current={index === currentIndex ? 'step' : undefined}
              style={{
                width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px',
                minHeight: '44px', minWidth: '44px', borderRadius: '50%', border: 'none',
                background: index === currentIndex ? colors.accent : index < currentIndex ? colors.success : colors.bgCard,
                color: index <= currentIndex ? 'white' : colors.textMuted,
                fontSize: '12px', fontWeight: 600,
                cursor: index <= currentIndex ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.2s ease',
              }}
              title={phaseLabels[p]}
            >
              {index + 1}
            </button>
            {index < phaseOrder.length - 1 && (
              <div style={{
                width: isMobile ? '12px' : '24px', height: '3px',
                background: index < currentIndex ? colors.success : colors.bgCard, flexShrink: 0,
              }} />
            )}
          </React.Fragment>
        ))}
      </nav>
    );
  };

  // ---------------------------------------------------------------------------
  // BOTTOM NAVIGATION
  // ---------------------------------------------------------------------------
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === phaseOrder.length - 1;

    let canProceed = true;
    let nextLabel = 'Continue';

    switch (phase) {
      case 'hook':
        nextLabel = 'Make a Prediction';
        break;
      case 'predict':
        canProceed = !!prediction;
        nextLabel = 'Test Your Prediction';
        break;
      case 'play':
        nextLabel = 'See the Explanation';
        break;
      case 'review':
        nextLabel = 'A New Challenge';
        break;
      case 'twist_predict':
        canProceed = !!twistPrediction;
        nextLabel = 'Explore Miller Effect';
        break;
      case 'twist_play':
        nextLabel = 'Deep Understanding';
        break;
      case 'twist_review':
        nextLabel = 'Real World Applications';
        break;
      case 'transfer':
        return (
          <TransferPhaseView
            conceptName="Gate Driver Design"
            applications={realWorldApps}
            onComplete={() => goToPhase('test')}
            isMobile={isMobile}
            colors={colors}
            typo={typo}
            playSound={playSound}
          />
        );
      case 'test':
        if (!testSubmitted) {
          canProceed = !testAnswers.includes(null);
          nextLabel = 'Submit Test';
        } else {
          canProceed = testScore >= 8;
          nextLabel = testScore >= 8 ? 'Complete Mastery' : 'Review & Retry';
        }
        break;
      case 'mastery':
        nextLabel = 'Finished!';
        canProceed = false;
        break;
    }

    const handleNext = () => {
      if (phase === 'test' && !testSubmitted) {
        submitTest();
      } else if (phase === 'test' && testSubmitted && testScore < 8) {
        setTestSubmitted(false);
        setTestAnswers(Array(10).fill(null));
        setCurrentQuestion(0);
      } else {
        nextPhase();
      }
    };

    return (
      <div style={{
        position: 'sticky', bottom: 0, left: 0, right: 0,
        padding: '16px 24px', background: colors.bgSecondary,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex', justifyContent: 'space-between', gap: '12px', zIndex: 1000,
      }}>
        <button
          onClick={prevPhase}
          disabled={isFirst}
          aria-label="Go to previous phase"
          style={{
            padding: '12px 24px', minHeight: '44px', borderRadius: '8px',
            border: `1px solid ${isFirst ? colors.border : colors.textMuted}`,
            background: 'transparent',
            color: isFirst ? colors.textMuted : colors.textPrimary,
            fontWeight: 600, cursor: isFirst ? 'not-allowed' : 'pointer',
            opacity: isFirst ? 0.5 : 1, transition: 'all 0.2s ease',
          }}
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!canProceed || isLast}
          aria-label={nextLabel}
          style={{
            padding: '12px 32px', minHeight: '44px', borderRadius: '8px', border: 'none',
            background: canProceed && !isLast ? `linear-gradient(135deg, ${colors.accent}, #D97706)` : colors.bgCard,
            color: canProceed && !isLast ? 'white' : colors.textMuted,
            fontWeight: 600, cursor: canProceed && !isLast ? 'pointer' : 'not-allowed',
            flex: 1, transition: 'all 0.2s ease',
          }}
        >
          {nextLabel}
        </button>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // PHASE CONTENT
  // ---------------------------------------------------------------------------
  const renderPhaseContent = () => {
    switch (phase) {
      // -----------------------------------------------------------------------
      // PHASE 1: HOOK
      // -----------------------------------------------------------------------
      case 'hook':
        return (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>{'\uD83D\uDD25'}</div>
            <h1 style={{ ...typo.h1, color: colors.accent, marginBottom: '16px' }}>
              Why Does Your MOSFET Get Hot Even Though It is &quot;Just a Switch&quot;?
            </h1>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '24px', maxWidth: '600px', margin: '0 auto 24px' }}>
              A perfect switch has zero loss. But real MOSFETs spend time <strong style={{ color: colors.vds }}>transitioning</strong> between
              ON and OFF. During that transition, they simultaneously carry current AND block voltage - dissipating enormous power.
              The faster you switch, the less time in this danger zone.
            </p>

            <div style={{
              background: colors.bgCard, padding: '24px', borderRadius: '16px',
              marginBottom: '24px', textAlign: 'left', maxWidth: '540px', margin: '0 auto 24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.vds, marginBottom: '12px' }}>The Problem:</h3>
              <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
                A MOSFET gate is a <strong style={{ color: colors.vgs }}>capacitor</strong>. To turn ON the switch,
                you must charge this capacitor. To turn it OFF, you must discharge it. The speed of charge/discharge
                determines how long the MOSFET spends in the lossy transition zone.
              </p>
              <div style={{
                background: `${colors.accent}15`, padding: '16px', borderRadius: '8px',
                borderLeft: `4px solid ${colors.accent}`,
              }}>
                <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                  <strong style={{ color: colors.accent }}>Key Insight:</strong> The gate driver is the unsung hero of power electronics.
                  It determines whether your MOSFET runs cool and efficient, or wastes watts as heat. Every nanosecond
                  of switching time matters when you switch millions of times per second.
                </p>
              </div>
            </div>

            {renderGateChargeVisualization(false)}
          </div>
        );

      // -----------------------------------------------------------------------
      // PHASE 2: PREDICT
      // -----------------------------------------------------------------------
      case 'predict':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
              Make Your Prediction
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              A MOSFET has a total gate charge (Qg) of 60nC. The gate driver can supply 2A of current.
            </p>
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px' }}>
              What primarily determines how fast the MOSFET switches ON?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '540px', margin: '0 auto' }}>
              {hookPredictions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => { setPrediction(opt.id); playSound('click'); }}
                  aria-pressed={prediction === opt.id}
                  style={{
                    padding: '16px', minHeight: '44px', borderRadius: '12px',
                    border: prediction === opt.id ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                    background: prediction === opt.id ? `${colors.accent}22` : 'transparent',
                    color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', ...typo.body,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // PHASE 3: PLAY
      // -----------------------------------------------------------------------
      case 'play':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.accent, textAlign: 'center', marginBottom: '8px' }}>
              Experiment: Gate Driver Speed
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Adjust the gate resistance and observe how switching speed and losses change
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '24px' }}>
              Try low resistance (fast) vs high resistance (slow) and watch the power loss
            </p>

            {renderGateChargeVisualization(true)}

            <div style={{
              background: `${colors.vgs}15`, padding: '16px', borderRadius: '12px',
              borderLeft: `4px solid ${colors.vgs}`, marginTop: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.vgs, marginBottom: '8px' }}>What to Try:</h3>
              <ul style={{ ...typo.body, color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li>Set gate resistance to <strong>2 ohm</strong> - see how fast the switching time is</li>
                <li>Increase to <strong>50 ohm</strong> - watch the switching time and losses grow</li>
                <li>Try <strong>100 ohm</strong> - this is what happens with a weak gate drive</li>
                <li>Now increase frequency to <strong>500kHz</strong> - see how losses multiply</li>
              </ul>
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // PHASE 4: REVIEW
      // -----------------------------------------------------------------------
      case 'review': {
        const predictionCorrect = prediction === 'gate_charge';
        return (
          <div style={{ padding: '24px' }}>
            <div style={{
              background: predictionCorrect ? `${colors.success}22` : `${colors.error}22`,
              padding: '20px', borderRadius: '12px',
              borderLeft: `4px solid ${predictionCorrect ? colors.success : colors.error}`,
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: predictionCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
                {predictionCorrect ? 'Correct!' : 'Not Quite!'}
              </h3>
              <p style={{ ...typo.body, color: colors.textPrimary }}>
                The gate capacitor charge time is the dominant factor. Switching time = Qg / Ig (gate charge divided
                by gate drive current). A stronger gate driver (more current) charges the gate faster, reducing
                the time the MOSFET spends in its linear (lossy) region.
              </p>
            </div>

            <div style={{
              background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
                Switching Loss Formula
              </h3>
              <div style={{
                background: colors.bgSecondary, padding: '16px', borderRadius: '8px',
                textAlign: 'center', marginBottom: '16px',
              }}>
                <p style={{ fontSize: isMobile ? '16px' : '20px', color: colors.vds, fontWeight: 700, fontFamily: 'monospace', margin: '0 0 8px 0' }}>
                  P(sw) = 0.5 x Vds x Id x (t_rise + t_fall) x f_sw
                </p>
                <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                  Where t_rise and t_fall depend on Qg / Ig
                </p>
              </div>

              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.vgs }}>Gate Charge (Qg):</strong> The total charge needed to fully
                  turn ON the MOSFET. Larger MOSFETs with lower Rds(on) typically have higher Qg - this is
                  the fundamental Qg vs Rds(on) tradeoff in MOSFET selection.
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.gate }}>Gate Resistance (Rg):</strong> Limits the peak gate current
                  to Vdriver / Rg. Lower resistance = more current = faster switching, but also higher di/dt
                  and more electromagnetic interference (EMI).
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.driver }}>Switching Frequency (fsw):</strong> Every switching event
                  costs energy. At 1MHz, you lose energy one million times per second. This is why high-frequency
                  converters demand ultra-fast gate drivers and low-Qg devices like GaN.
                </p>
                <p>
                  <strong style={{ color: colors.accent }}>The Bottom Line:</strong> Total loss = switching loss +
                  conduction loss + gate drive loss. The gate driver controls switching loss, which often dominates
                  at high frequencies. A good gate driver is the cheapest way to improve efficiency.
                </p>
              </div>
            </div>

            {renderGateChargeVisualization(true)}
          </div>
        );
      }

      // -----------------------------------------------------------------------
      // PHASE 5: TWIST PREDICT
      // -----------------------------------------------------------------------
      case 'twist_predict':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.warning, textAlign: 'center', marginBottom: '8px' }}>
              The Miller Plateau Mystery
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              If you zoom into the Vgs waveform during turn-on, you will see a flat region where the voltage
              stops rising temporarily. This is called the Miller plateau.
            </p>
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px' }}>
              What causes this flat spot in the gate voltage waveform?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '540px', margin: '0 auto' }}>
              {twistPredictions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => { setTwistPrediction(opt.id); playSound('click'); }}
                  aria-pressed={twistPrediction === opt.id}
                  style={{
                    padding: '16px', minHeight: '44px', borderRadius: '12px',
                    border: twistPrediction === opt.id ? `2px solid ${colors.warning}` : `1px solid ${colors.border}`,
                    background: twistPrediction === opt.id ? `${colors.warning}22` : 'transparent',
                    color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', ...typo.body,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // PHASE 6: TWIST PLAY
      // -----------------------------------------------------------------------
      case 'twist_play':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.miller, textAlign: 'center', marginBottom: '8px' }}>
              Explore the Miller Effect
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Adjust the Miller charge and see how the plateau width changes. Toggle the Miller clamp to speed up turn-off.
            </p>
            <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px' }}>
              The Miller plateau is where Vds actually transitions - this is the critical loss interval
            </p>

            {renderGateChargeVisualization(true)}

            {/* Miller clamp toggle */}
            <div style={{
              background: colors.bgCard, padding: '20px', borderRadius: '12px',
              border: `1px solid ${millerClamp ? colors.success : colors.border}`,
              marginTop: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Active Miller Clamp</h3>
                  <p style={{ ...typo.small, color: colors.textMuted, margin: '4px 0 0 0' }}>
                    Sinks extra current during Miller plateau to speed up turn-off
                  </p>
                </div>
                <button
                  onClick={() => { setMillerClamp(!millerClamp); playSound('click'); }}
                  style={{
                    padding: '10px 20px', minHeight: '44px', borderRadius: '8px', border: 'none',
                    background: millerClamp ? colors.success : colors.bgSecondary,
                    color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '14px',
                  }}
                >
                  {millerClamp ? 'ON' : 'OFF'}
                </button>
              </div>
              {millerClamp && (
                <div style={{
                  background: `${colors.success}15`, padding: '12px', borderRadius: '8px',
                  borderLeft: `4px solid ${colors.success}`,
                }}>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    Miller clamp active: Turn-off Miller time reduced by ~60%. Turn-off time: {calc.tTurnOff.toFixed(0)}ns
                    (was {(calc.tTurnOn).toFixed(0)}ns without clamp).
                    Switching loss reduced to {calc.switchingLoss.toFixed(2)}W.
                  </p>
                </div>
              )}
            </div>

            <div style={{
              background: `${colors.miller}15`, padding: '16px', borderRadius: '12px',
              borderLeft: `4px solid ${colors.miller}`, marginTop: '16px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.miller, marginBottom: '8px' }}>Key Observations:</h3>
              <ul style={{ ...typo.body, color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                <li>Increase Miller charge (Qgd) - the plateau widens, Vds transitions slower</li>
                <li>More Miller charge = more time in the crossover region = more switching loss</li>
                <li>The Miller clamp provides a low-impedance path to discharge Cgd faster during turn-off</li>
                <li>High-side dV/dt can couple through Cgd and cause parasitic turn-on - negative Vgs prevents this</li>
              </ul>
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // PHASE 7: TWIST REVIEW
      // -----------------------------------------------------------------------
      case 'twist_review': {
        const twistCorrect = twistPrediction === 'miller';
        return (
          <div style={{ padding: '24px' }}>
            <div style={{
              background: twistCorrect ? `${colors.success}22` : `${colors.error}22`,
              padding: '20px', borderRadius: '12px',
              borderLeft: `4px solid ${twistCorrect ? colors.success : colors.error}`,
              marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: twistCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
                {twistCorrect ? 'Correct!' : 'Not Quite!'}
              </h3>
              <p style={{ ...typo.body, color: colors.textPrimary }}>
                The Miller plateau is caused by the gate-drain capacitance (Cgd, also called the Miller capacitance).
                During the Vds transition, all gate current flows into Cgd instead of Cgs, causing Vgs to remain flat.
                This is the interval where switching losses actually occur.
              </p>
            </div>

            <div style={{
              background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.miller, marginBottom: '16px' }}>
                Bootstrap Gate Drive for High-Side Switches
              </h3>
              <div style={{ ...typo.body, color: colors.textSecondary }}>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.driver }}>The High-Side Problem:</strong> In a half-bridge, the
                  high-side MOSFET source floats at the switching node voltage. To turn it ON, you need Vgs
                  referenced to this floating source - which can be hundreds of volts above ground.
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.vgs }}>Bootstrap Solution:</strong> When the low-side switch is ON
                  (output = 0V), a small capacitor charges to Vcc through a bootstrap diode. When the high-side
                  turns ON, this capacitor floats up with the source pin, providing the gate-source voltage needed.
                </p>
                <p style={{ marginBottom: '16px' }}>
                  <strong style={{ color: colors.error }}>Limitations:</strong> The bootstrap capacitor must be
                  periodically refreshed (low-side must turn ON). This limits maximum duty cycle. At 100% duty
                  cycle, the cap would drain and the high-side gate voltage would collapse.
                </p>
                <p>
                  <strong style={{ color: colors.success }}>Advanced Solutions:</strong> For 100% duty cycle
                  or bidirectional operation, isolated gate drivers use transformers or capacitive isolation
                  to provide continuous gate drive power regardless of switching state.
                </p>
              </div>
            </div>

            {/* Visual: Bootstrap circuit concept */}
            <div style={{
              background: colors.bgSecondary, padding: '20px', borderRadius: '12px', marginBottom: '24px',
            }}>
              <svg viewBox="0 0 400 200" style={{ width: '100%', maxWidth: '400px', display: 'block', margin: '0 auto' }}>
                {/* Simplified bootstrap diagram */}
                <rect x="0" y="0" width="400" height="200" fill={colors.bgSecondary} rx="12" />

                {/* Vcc rail */}
                <line x1="30" y1="30" x2="200" y2="30" stroke={colors.vgs} strokeWidth="2" />
                <text x="15" y="35" fill={colors.vgs} fontSize="11" fontWeight="600">Vcc</text>

                {/* Bootstrap diode */}
                <polygon points="130,30 150,20 150,40" fill={colors.driver} stroke={colors.driver} strokeWidth="1" />
                <line x1="150" y1="20" x2="150" y2="40" stroke={colors.driver} strokeWidth="2" />
                <text x="140" y="52" textAnchor="middle" fill={colors.driver} fontSize="9">D(boot)</text>

                {/* Bootstrap cap */}
                <rect x="170" y="20" width="8" height="30" rx="2" fill={colors.accent} />
                <rect x="182" y="20" width="8" height="30" rx="2" fill={colors.accent} />
                <text x="180" y="62" textAnchor="middle" fill={colors.accent} fontSize="9">C(boot)</text>

                {/* High-side driver */}
                <rect x="220" y="15" width="80" height="40" rx="6" fill={colors.bgCard} stroke={colors.gate} strokeWidth="2" />
                <text x="260" y="38" textAnchor="middle" fill={colors.gate} fontSize="10" fontWeight="600">HI Driver</text>

                {/* High-side MOSFET */}
                <rect x="320" y="30" width="60" height="50" rx="6" fill={colors.bgCard} stroke={colors.vgs} strokeWidth="2" />
                <text x="350" y="50" textAnchor="middle" fill={colors.vgs} fontSize="10" fontWeight="600">Q(hi)</text>
                <text x="350" y="70" textAnchor="middle" fill={colors.textMuted} fontSize="9">High-Side</text>

                {/* Switching node */}
                <line x1="320" y1="80" x2="380" y2="80" stroke={colors.accent} strokeWidth="2" />
                <line x1="350" y1="80" x2="350" y2="110" stroke={colors.accent} strokeWidth="2" />
                <text x="350" y="105" textAnchor="middle" fill={colors.accent} fontSize="10" fontWeight="600">SW Node</text>

                {/* Low-side MOSFET */}
                <rect x="320" y="115" width="60" height="50" rx="6" fill={colors.bgCard} stroke={colors.id} strokeWidth="2" />
                <text x="350" y="135" textAnchor="middle" fill={colors.id} fontSize="10" fontWeight="600">Q(lo)</text>
                <text x="350" y="155" textAnchor="middle" fill={colors.textMuted} fontSize="9">Low-Side</text>

                {/* Low-side driver */}
                <rect x="220" y="125" width="80" height="40" rx="6" fill={colors.bgCard} stroke={colors.gate} strokeWidth="2" />
                <text x="260" y="148" textAnchor="middle" fill={colors.gate} fontSize="10" fontWeight="600">LO Driver</text>

                {/* Ground */}
                <line x1="350" y1="165" x2="350" y2="185" stroke={colors.textMuted} strokeWidth="2" />
                <line x1="335" y1="185" x2="365" y2="185" stroke={colors.textMuted} strokeWidth="2" />
                <line x1="340" y1="190" x2="360" y2="190" stroke={colors.textMuted} strokeWidth="1.5" />
                <line x1="345" y1="195" x2="355" y2="195" stroke={colors.textMuted} strokeWidth="1" />

                {/* Connection lines */}
                <line x1="300" y1="35" x2="320" y2="45" stroke={colors.gate} strokeWidth="1.5" />
                <line x1="300" y1="145" x2="320" y2="140" stroke={colors.gate} strokeWidth="1.5" />
                <line x1="190" y1="35" x2="220" y2="35" stroke={colors.accent} strokeWidth="1.5" />

                {/* Labels */}
                <text x="50" y="180" fill={colors.textMuted} fontSize="10">Bootstrap charges when Q(lo) is ON</text>
              </svg>
            </div>

            {renderGateChargeVisualization(true)}
          </div>
        );
      }

      // -----------------------------------------------------------------------
      // PHASE 8: TRANSFER - Real World Applications
      // -----------------------------------------------------------------------
      case 'transfer': {
        const app = realWorldApps[selectedApp];
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ ...typo.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
              Real-World Applications
            </h2>
            <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
              Gate drivers power every switching converter in the modern world
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, textAlign: 'center', marginBottom: '24px' }}>
              Explore all 4 applications to unlock the test
            </p>

            {/* Application Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px' }}>
              {realWorldApps.map((a, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedApp(i)}
                  style={{
                    padding: '12px 16px', borderRadius: '8px', border: 'none',
                    background: selectedApp === i ? a.color : colors.bgCard,
                    color: selectedApp === i ? 'white' : colors.textSecondary,
                    fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    opacity: completedApps[i] ? 1 : 0.7,
                  }}
                >
                  <span>{a.icon}</span>
                  <span style={{ fontSize: '13px' }}>{a.short}</span>
                  {completedApps[i] && <span style={{ color: colors.success }}>Done</span>}
                </button>
              ))}
            </div>

            {/* Selected Application Content */}
            <div style={{
              background: colors.bgCard, borderRadius: '16px', overflow: 'hidden',
              border: `1px solid ${app.color}33`,
            }}>
              {/* Header */}
              <div style={{
                background: `${app.color}22`, padding: '20px',
                borderBottom: `1px solid ${app.color}33`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '32px' }}>{app.icon}</span>
                  <div>
                    <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                    <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '20px' }}>
                <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '20px' }}>
                  {app.description}
                </p>

                {/* Connection to lesson */}
                <div style={{
                  background: `${colors.accent}15`, padding: '16px', borderRadius: '8px',
                  borderLeft: `4px solid ${colors.accent}`, marginBottom: '20px',
                }}>
                  <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                    Connection to What You Learned:
                  </h4>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    {app.connection}
                  </p>
                </div>

                {/* How it works */}
                <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
                  How It Works:
                </h4>
                <p style={{ ...typo.small, color: colors.textSecondary, marginBottom: '20px' }}>
                  {app.howItWorks}
                </p>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{
                      background: colors.bgSecondary, padding: '12px 16px', borderRadius: '8px',
                      flex: '1', minWidth: '100px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                      <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                      <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Examples */}
                <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
                  Real Examples:
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  {app.examples.map((ex, i) => (
                    <span key={i} style={{
                      background: colors.bgSecondary, padding: '6px 12px', borderRadius: '16px',
                      ...typo.small, color: colors.textSecondary,
                    }}>
                      {ex}
                    </span>
                  ))}
                </div>

                {/* Companies */}
                <h4 style={{ ...typo.small, color: colors.textPrimary, marginBottom: '8px', fontWeight: 600 }}>
                  Key Players:
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  {app.companies.map((co, i) => (
                    <span key={i} style={{
                      background: `${app.color}22`, padding: '6px 12px', borderRadius: '16px',
                      ...typo.small, color: app.color,
                    }}>
                      {co}
                    </span>
                  ))}
                </div>

                {/* Future Impact */}
                <div style={{
                  background: `${colors.success}15`, padding: '16px', borderRadius: '8px',
                  borderLeft: `4px solid ${colors.success}`,
                }}>
                  <h4 style={{ ...typo.small, color: colors.success, marginBottom: '8px', fontWeight: 600 }}>
                    Future Impact:
                  </h4>
                  <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                    {app.futureImpact}
                  </p>
                </div>

                {/* Mark Complete Button */}
                {!completedApps[selectedApp] ? (
                  <button
                    onClick={() => {
                      const newCompleted = [...completedApps];
                      newCompleted[selectedApp] = true;
                      setCompletedApps(newCompleted);
                      playSound('success');
                    }}
                    style={{
                      width: '100%', padding: '16px', minHeight: '44px', marginTop: '20px',
                      borderRadius: '8px', border: 'none', background: app.color,
                      color: 'white', fontWeight: 600, cursor: 'pointer', ...typo.body,
                    }}
                  >
                    Got It
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const nextIncomplete = completedApps.findIndex((c, i) => !c && i !== selectedApp);
                      if (nextIncomplete !== -1) {
                        setSelectedApp(nextIncomplete);
                      } else {
                        goToPhase('test');
                      }
                    }}
                    style={{
                      width: '100%', padding: '16px', minHeight: '44px', marginTop: '20px',
                      borderRadius: '8px', border: `2px solid ${colors.success}`,
                      background: 'transparent', color: colors.success,
                      fontWeight: 600, cursor: 'pointer', ...typo.body,
                    }}
                  >
                    Completed - Continue to Next
                  </button>
                )}
              </div>
            </div>

            {/* Progress indicator */}
            <div style={{
              textAlign: 'center', marginTop: '16px', ...typo.small,
              color: completedApps.every(c => c) ? colors.success : colors.textMuted,
            }}>
              Application {selectedApp + 1} of 4 - {completedApps.filter(c => c).length} of 4 completed
              {completedApps.every(c => c) && ' - Ready for the test!'}
            </div>
          </div>
        );
      }

      // -----------------------------------------------------------------------
      // PHASE 9: TEST
      // -----------------------------------------------------------------------
      case 'test':
        if (testSubmitted) {
          return (
            <div style={{ padding: '24px' }}>
              <div style={{
                background: testScore >= 8 ? `${colors.success}22` : `${colors.error}22`,
                padding: '32px', borderRadius: '16px', textAlign: 'center', marginBottom: '24px',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                  {testScore >= 8 ? '\uD83C\uDF89' : '\uD83D\uDCDA'}
                </div>
                <h2 style={{ ...typo.h2, color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px' }}>
                  {testScore >= 8 ? 'Excellent Work!' : 'Keep Learning!'}
                </h2>
                <p style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '8px' }}>
                  {testScore} / 10
                </p>
                <p style={{ ...typo.body, color: colors.textSecondary }}>
                  {testScore >= 8
                    ? 'You have mastered gate driver design!'
                    : 'Review the explanations below and try again.'}
                </p>
              </div>

              {/* Answer Key */}
              <div style={{ padding: '16px' }}>
                <h3 style={{ color: '#f8fafc', fontSize: '18px', marginBottom: '16px' }}>Answer Key:</h3>
                {testQuestions.map((q, idx) => {
                  const userAnswer = testAnswers[idx];
                  const correctOption = q.options.find(o => o.correct);
                  const correctAnswer = correctOption?.id;
                  const userOption = q.options.find(o => o.id === userAnswer);
                  const isCorrect = userAnswer === correctAnswer;
                  return (
                    <div key={idx} style={{ background: 'rgba(30, 41, 59, 0.9)', margin: '12px 0', padding: '16px', borderRadius: '10px', borderLeft: `4px solid ${isCorrect ? '#10b981' : '#ef4444'}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ color: isCorrect ? '#10b981' : '#ef4444', fontSize: '18px', flexShrink: 0 }}>{isCorrect ? '\u2713' : '\u2717'}</span>
                        <span style={{ color: '#f8fafc', fontSize: '14px', fontWeight: 600 }}>Q{idx + 1}. {q.question}</span>
                      </div>
                      {!isCorrect && (
                        <div style={{ marginLeft: '26px', marginBottom: '6px' }}>
                          <span style={{ color: '#ef4444', fontSize: '13px' }}>Your answer: </span>
                          <span style={{ color: '#64748b', fontSize: '13px' }}>{userOption?.label}</span>
                        </div>
                      )}
                      <div style={{ marginLeft: '26px', marginBottom: '8px' }}>
                        <span style={{ color: '#10b981', fontSize: '13px' }}>Correct answer: </span>
                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>{correctOption?.label}</span>
                      </div>
                      <div style={{ marginLeft: '26px', background: 'rgba(245, 158, 11, 0.1)', padding: '8px 12px', borderRadius: '8px' }}>
                        <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 600 }}>Why? </span>
                        <span style={{ color: '#94a3b8', fontSize: '12px', lineHeight: '1.5' }}>{q.explanation}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        const currentQ = testQuestions[currentQuestion];
        return (
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ ...typo.h2, color: colors.textPrimary, margin: 0 }}>
                Knowledge Test
              </h2>
              <span style={{ ...typo.body, color: colors.textSecondary }}>
                Question {currentQuestion + 1} of {testQuestions.length}
              </span>
            </div>

            {/* Progress dots */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentQuestion(i)}
                  style={{
                    flex: 1, height: '4px', borderRadius: '2px',
                    background: testAnswers[i] ? colors.accent : i === currentQuestion ? colors.textMuted : colors.bgCard,
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>

            {/* Scenario */}
            <div style={{
              background: colors.bgSecondary, padding: '16px', borderRadius: '8px',
              marginBottom: '16px', borderLeft: `4px solid ${colors.warning}`,
            }}>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0, fontStyle: 'italic' }}>
                {currentQ.scenario}
              </p>
            </div>

            {/* Question */}
            <div style={{
              background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px',
            }}>
              <p style={{ ...typo.body, color: colors.textPrimary }}>
                {currentQ.question}
              </p>
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {currentQ.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleTestAnswer(opt.id)}
                  aria-pressed={testAnswers[currentQuestion] === opt.id}
                  style={{
                    padding: '16px', minHeight: '44px', borderRadius: '8px',
                    border: testAnswers[currentQuestion] === opt.id
                      ? `2px solid ${colors.accent}`
                      : `1px solid ${colors.border}`,
                    background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : 'transparent',
                    color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', ...typo.body,
                  }}
                >
                  <span style={{
                    fontWeight: 600,
                    color: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.textMuted,
                    marginRight: '12px',
                  }}>
                    {opt.id.toUpperCase()}.
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
                aria-label="Go to previous question"
                style={{
                  padding: '12px 24px', minHeight: '44px', borderRadius: '8px',
                  border: `1px solid ${currentQuestion === 0 ? colors.border : colors.textMuted}`,
                  background: 'transparent',
                  color: currentQuestion === 0 ? colors.textMuted : colors.textPrimary,
                  fontWeight: 600, cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>
              {currentQuestion < testQuestions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  aria-label="Go to next question"
                  style={{
                    padding: '12px 24px', minHeight: '44px', borderRadius: '8px',
                    border: 'none', background: colors.accent, color: 'white',
                    fontWeight: 600, cursor: 'pointer', flex: 1,
                  }}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={submitTest}
                  disabled={testAnswers.includes(null)}
                  aria-label="Submit test"
                  style={{
                    padding: '12px 24px', minHeight: '44px', borderRadius: '8px',
                    border: 'none',
                    background: testAnswers.includes(null) ? colors.bgCard : colors.success,
                    color: testAnswers.includes(null) ? colors.textMuted : 'white',
                    fontWeight: 600,
                    cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                    flex: 1,
                  }}
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        );

      // -----------------------------------------------------------------------
      // PHASE 10: MASTERY
      // -----------------------------------------------------------------------
      case 'mastery':
        return (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '72px', marginBottom: '16px' }}>{'\uD83C\uDFC6'}</div>
            <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '8px' }}>
              Mastery Achieved!
            </h1>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              You have mastered gate driver design and switching loss optimization
            </p>

            <div style={{
              background: colors.bgCard, padding: '24px', borderRadius: '16px',
              marginBottom: '24px', textAlign: 'left',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
                Key Concepts Mastered:
              </h3>
              <ul style={{ ...typo.body, color: colors.textSecondary, lineHeight: 2, paddingLeft: '20px', margin: 0 }}>
                <li><strong style={{ color: colors.vgs }}>Gate charge (Qg):</strong> Total charge to fully enhance the MOSFET</li>
                <li><strong style={{ color: colors.gate }}>Switching time:</strong> t = Qg / Ig - faster drivers = less loss</li>
                <li><strong style={{ color: colors.miller }}>Miller plateau:</strong> Cgd charging causes Vgs flat spot during Vds transition</li>
                <li><strong style={{ color: colors.vds }}>Switching loss:</strong> P = 0.5 x V x I x (tr + tf) x fsw</li>
                <li><strong style={{ color: colors.driver }}>Bootstrap drive:</strong> Floating cap powers high-side gate driver</li>
                <li><strong style={{ color: colors.success }}>Active Miller clamp:</strong> Prevents parasitic turn-on from dV/dt</li>
              </ul>
            </div>

            <div style={{
              background: `${colors.accent}22`, padding: '24px', borderRadius: '16px',
              marginBottom: '24px', textAlign: 'left',
            }}>
              <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
                Beyond the Basics:
              </h3>
              <p style={{ ...typo.body, color: colors.textSecondary }}>
                Advanced gate driver topics include <strong>isolated gate drivers</strong> using coreless transformers
                for kV-level isolation, <strong>desaturation detection</strong> for short-circuit protection,
                <strong> soft turn-off</strong> to limit voltage overshoot during faults, <strong>adaptive dead time</strong> that
                adjusts nanosecond by nanosecond, and <strong>digital gate drivers</strong> that can adjust gate
                resistance profile during the switching event itself. GaN and SiC devices are pushing gate driver
                innovation with their unique requirements: tight voltage tolerances, extremely fast dV/dt immunity,
                and kelvin source connections for accurate gate-source voltage sensing.
              </p>
            </div>

            {renderGateChargeVisualization(true)}

            {/* Score summary */}
            <div style={{
              background: colors.bgCard, padding: '24px', borderRadius: '16px',
              marginTop: '24px', marginBottom: '24px',
            }}>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>Your Performance</h3>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ ...typo.h1, color: testScore >= 8 ? colors.success : colors.warning }}>{testScore}/10</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Test Score</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ ...typo.h1, color: colors.accent }}>
                    {testScore >= 9 ? 'A+' : testScore >= 8 ? 'A' : testScore >= 7 ? 'B' : testScore >= 6 ? 'C' : 'D'}
                  </div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Grade</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ ...typo.h1, color: colors.driver }}>10/10</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>Phases Done</div>
                </div>
              </div>
            </div>

            {/* Complete Game button */}
            <button
              onClick={() => {
                playSound('complete');
                if (onGameEvent) {
                  onGameEvent({
                    eventType: 'game_completed',
                    gameType: 'gate-driver-design',
                    gameTitle: 'Gate Driver Design',
                    details: { score: testScore, total: 10, phase: 'mastery' },
                    timestamp: Date.now()
                  });
                }
                setTimeout(() => {
                  window.location.href = '/games';
                }, 600);
              }}
              style={{
                width: '100%', padding: '18px', borderRadius: '12px', border: 'none',
                background: `linear-gradient(135deg, ${colors.success}, #059669)`,
                color: 'white', fontWeight: 700, cursor: 'pointer',
                fontSize: isMobile ? '16px' : '18px', transition: 'all 0.2s ease',
                marginBottom: '16px',
              }}
            >
              Complete Game
            </button>

            <div style={{
              padding: '16px', background: colors.bgCard, borderRadius: '12px',
            }}>
              <p style={{ ...typo.small, color: colors.textMuted, margin: 0 }}>
                Game completed! You can continue experimenting with the gate charge visualization above,
                or return to explore more physics games.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ---------------------------------------------------------------------------
  // MAIN RENDER
  // ---------------------------------------------------------------------------
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: colors.bgPrimary,
      color: colors.textPrimary,
    }}>
      {renderProgressBar()}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingBottom: '16px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {renderPhaseContent()}
        </div>
      </div>
      {renderBottomNav()}
    </div>
  );
};

export default GateDriverRenderer;
