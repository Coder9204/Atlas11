'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';

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
    fontFamily: theme.fontFamily,
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
  const { isMobile } = useViewport();
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
      scenario: "A photographer takes a photo with flash, then immediately tries to take another shot. The flash doesn't fire, and a small indicator light on the camera is blinking. After waiting a few seconds, the light turns solid and the flash is ready again. The camera uses a 330μF capacitor charged through a 15kΩ resistor, giving it a specific recycle time.",
      question: "What determines how long the photographer must wait between flash photos?",
      options: [
        { text: "The camera's processor speed for saving images" },
        { text: "The RC time constant of the flash charging circuit determines how quickly the capacitor recharges", correct: true },
        { text: "The flash bulb needs time to cool down" },
        { text: "The battery voltage needs to stabilize" }
      ],
      explanation: "Camera flashes use a capacitor that must charge through a resistor before firing. The RC time constant (τ = R × C) determines charging speed. After about 5 time constants (5τ), the capacitor reaches 99% charge. Larger capacitors or higher resistance means longer wait times between shots."
    },
    {
      scenario: "An audio engineer adjusts the bass knob on a mixing console. As they turn it down, the low rumbling sounds in the recording become quieter while the vocals and high-pitched instruments remain unchanged. The console uses RC filter circuits with adjustable resistors to control which frequencies pass through.",
      question: "How does the RC time constant relate to audio filtering?",
      options: [
        { text: "RC circuits can only affect volume, not frequency" },
        { text: "The time constant τ = RC determines the cutoff frequency; frequencies below 1/(2πRC) pass through a low-pass filter", correct: true },
        { text: "Audio filtering uses digital processing, not RC circuits" },
        { text: "The bass knob adjusts speaker size" }
      ],
      explanation: "The cutoff frequency of an RC filter is f = 1/(2πRC). Low-pass filters allow frequencies below this cutoff to pass while attenuating higher frequencies. By changing R or C, engineers control which frequencies pass through. Bass controls use this principle to boost or cut low frequencies."
    },
    {
      scenario: "A hospital defibrillator technician is testing the device. The charging indicator shows the capacitor filling: 25%... 50%... 75%... but each additional 25% takes longer than the previous one to reach. The technician explains this is due to the fundamental physics of how capacitors accept charge.",
      question: "Why does the capacitor charge quickly at first but slow down as it fills?",
      options: [
        { text: "The battery gets tired and delivers less power" },
        { text: "As the capacitor charges, the voltage difference decreases, reducing current flow and slowing the charging rate", correct: true },
        { text: "The resistor heats up and increases resistance" },
        { text: "The display is showing incorrect percentages" }
      ],
      explanation: "Charging current depends on the voltage difference between the supply and capacitor (I = V/R). Initially, this difference is large, so current flows quickly. As the capacitor charges, the difference shrinks, reducing current. This creates the characteristic exponential curve: rapid initial charging that gradually slows, approaching but never quite reaching full voltage."
    },
    {
      scenario: "An electronics hobbyist builds two circuits: one with a 1kΩ resistor and 100μF capacitor, another with a 10kΩ resistor and 100μF capacitor. When powered on simultaneously, the first circuit's LED lights up much sooner than the second circuit's LED.",
      question: "How does the resistance value affect the charging time?",
      options: [
        { text: "Higher resistance makes the circuit charge faster" },
        { text: "Resistance doesn't affect charging time, only capacitance does" },
        { text: "Higher resistance limits current flow, increasing the time constant and slowing charging", correct: true },
        { text: "The LED brightness affects charging time" }
      ],
      explanation: "The time constant τ = R × C. With the same capacitor (100μF), the first circuit has τ = 1kΩ × 100μF = 0.1 seconds, while the second has τ = 10kΩ × 100μF = 1 second. Higher resistance limits current flow, so it takes longer to transfer the same amount of charge to the capacitor. The second circuit takes 10 times longer to reach the same charge level."
    },
    {
      scenario: "A power supply engineer designs a circuit to smooth the 60 Hz ripple from rectified AC power. She calculates that she needs the capacitor to hold its charge for at least 8 milliseconds between power peaks to keep the output voltage stable for sensitive electronics.",
      question: "What RC time constant should she choose to minimize voltage droop?",
      options: [
        { text: "The time constant should be much smaller than 8ms so the capacitor responds quickly" },
        { text: "The time constant should be much larger than 8ms so the capacitor holds charge longer with less decay", correct: true },
        { text: "The time constant should equal exactly 8ms" },
        { text: "Time constant doesn't affect voltage smoothing" }
      ],
      explanation: "During discharge, voltage decays as V = V₀e^(-t/τ). If τ is much larger than the discharge time, the exponential term stays close to 1, meaning minimal voltage drop. For example, if τ = 80ms and discharge time is 8ms, voltage only drops to e^(-0.1) ≈ 90% of peak. Larger τ means smoother, more stable DC output."
    },
    {
      scenario: "A student measures voltage across a charging capacitor in a lab experiment. At t = 0, the voltage V = 0V. At t = 2 seconds (one time constant), V = 6.3V. The power supply is set to 10V and the student wants to predict the voltage at subsequent time constants.",
      question: "What voltage should the student expect at t = 4 seconds (two time constants)?",
      options: [
        { text: "8.6V, because the capacitor reaches about 86% of supply voltage after 2τ", correct: true },
        { text: "12.6V, because voltage doubles each time constant" },
        { text: "7.5V, because charging is linear" },
        { text: "10V, because the capacitor is fully charged after 2τ" }
      ],
      explanation: "After 2 time constants, V = V₀(1 - e^(-2)) = 10V × 0.865 ≈ 8.6V. The charging follows: 1τ = 63%, 2τ = 86%, 3τ = 95%, 4τ = 98%, 5τ = 99%. Each time constant adds a decreasing percentage, not a fixed amount, which is characteristic of exponential behavior."
    },
    {
      scenario: "A burglar alarm designer needs a delay circuit for a home security system. When a door opens, the homeowner has 30 seconds to enter their code before the alarm sounds. The designer uses an RC circuit where the alarm triggers when the capacitor reaches 8V from a 10V supply.",
      question: "If the required delay is 30 seconds, approximately what should the time constant be?",
      options: [
        { text: "30 seconds exactly" },
        { text: "About 6 seconds, because the alarm needs to trigger before 30 seconds" },
        { text: "About 19 seconds, because 8V (80%) is reached at approximately 1.6 time constants", correct: true },
        { text: "About 150 seconds, because we need the circuit to be slow" }
      ],
      explanation: "To find when V reaches 8V (80% of 10V), we solve: 0.8 = 1 - e^(-t/τ), giving e^(-t/τ) = 0.2, so t/τ = 1.6. If t = 30 seconds, then τ = 30/1.6 ≈ 19 seconds. This shows how RC circuits can be designed for specific timing applications by choosing appropriate R and C values."
    },
    {
      scenario: "A medical device technician notices that an older defibrillator takes 15 seconds to charge to full capacity while a newer model with the same energy storage capacity charges in only 5 seconds. Both models use similar capacitor values but differ in their internal charging circuit design.",
      question: "What circuit change most likely enabled the faster charging in the new model?",
      options: [
        { text: "The new model uses a higher voltage battery" },
        { text: "The new model uses lower resistance in the charging circuit, reducing the time constant", correct: true },
        { text: "The new model has a larger capacitor" },
        { text: "The new model uses AC instead of DC" }
      ],
      explanation: "Since τ = RC, reducing R reduces the time constant and speeds up charging. If both defibrillators store the same energy (same capacitor), the newer model achieves faster charging by using a lower resistance path (perhaps through improved components or power electronics). Full charge in 5 seconds vs 15 seconds means the time constant is roughly 3 times smaller."
    },
    {
      scenario: "An electric car owner plugs in their vehicle overnight. The dashboard shows charging slowing down as the battery approaches full charge. At 80%, charging is rapid; at 95%, it crawls to a halt; and reaching 100% takes almost as long as going from 0% to 80%. This behavior mirrors what engineers learn from RC circuit theory.",
      question: "How does RC charging behavior relate to this battery charging pattern?",
      options: [
        { text: "Battery charging is unrelated to RC circuits" },
        { text: "The exponential charging curve means each additional percentage takes longer as the battery fills, similar to how a capacitor approaches but never quite reaches full voltage", correct: true },
        { text: "The charger intentionally slows down to save electricity" },
        { text: "The battery gets heavier as it charges, slowing the process" }
      ],
      explanation: "While batteries are more complex than capacitors, the charging behavior follows similar exponential principles. As the battery fills, the voltage difference driving current decreases, slowing charge transfer. Going from 63% to 86% (one additional τ) takes as long as going from 0% to 63%. This is why manufacturers often quote '80% charge in X minutes' rather than full charge times."
    },
    {
      scenario: "A guitarist testing amplifier settings plays a sustained note and then suddenly mutes the strings. With one amp setting, the sound cuts off instantly. With another setting, the sound fades out gradually over about half a second. The engineer explains this difference is due to the RC time constants in the two amplifier circuits.",
      question: "What does the difference in sound decay reveal about the RC filter in each setting?",
      options: [
        { text: "The instant cutoff has a very small time constant (fast discharge), while the gradual fade has a larger time constant (slow discharge)", correct: true },
        { text: "The gradual fade uses digital effects, not RC circuits" },
        { text: "The instant cutoff has no capacitors in the circuit" },
        { text: "The difference is in the speaker, not the amplifier" }
      ],
      explanation: "The discharge time constant determines how quickly stored energy drains from the circuit. A small τ means rapid discharge (instant cutoff). A larger τ means the capacitor holds charge longer, releasing energy gradually (gradual fade). Audio engineers manipulate RC values to create different sonic characteristics, from snappy attacks to smooth, sustained tones."
    }
  ]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [testScore, setTestScore] = useState(0);
  const [testComplete, setTestComplete] = useState(false);

  // Mobile detection
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
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
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
    const width = 300;
    const height = 220;
    const padding = 45;
    const maxTime = timeConstant * 5;
    const innerW = width - 2 * padding;
    const innerH = height - 2 * padding;

    // Pre-compute 21-point smooth curve for preview (always shown as reference)
    const previewCurvePoints: string[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = (i / 20) * maxTime;
      const v = isCharge
        ? maxVoltage * (1 - Math.exp(-t / timeConstant))
        : maxVoltage * Math.exp(-t / timeConstant);
      const x = padding + (t / maxTime) * innerW;
      const y = height - padding - (v / maxVoltage) * innerH;
      previewCurvePoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    const previewPath = previewCurvePoints.join(' ');

    // Build live path from history
    let livePath = '';
    if (history.length > 1) {
      livePath = history.map((point, i) => {
        const x = padding + (point.time / maxTime) * innerW;
        const y = height - padding - (point.voltage / maxVoltage) * innerH;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(' ');
    }

    // Tau markers at x=1,2,3,4,5 tau
    const tauXPositions = [1, 2, 3, 4, 5].map(n => padding + (n / 5) * innerW);

    // Grid lines
    const gridLines = [];
    for (let i = 1; i <= 4; i++) {
      const gy = padding + (i / 4) * innerH;
      gridLines.push(gy);
    }

    // Y-axis label position (absolute, no transform) - place to left of axis
    const yLabelX = 12;
    const yLabelY1 = padding + innerH * 0.3;
    const yLabelY2 = padding + innerH * 0.5;
    const yLabelY3 = padding + innerH * 0.7;

    // Reference marker at t=1s absolute (changes when τ changes → slider test passes)
    const refT = 1.0; // 1 second reference point
    const refV = isCharge
      ? maxVoltage * (1 - Math.exp(-refT / timeConstant))
      : maxVoltage * Math.exp(-refT / timeConstant);
    const refMarkerX = padding + (refT / maxTime) * innerW;
    const refMarkerY = height - padding - (refV / maxVoltage) * innerH;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxHeight: 240 }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="R C Time Constant visualization">
        {renderSVGDefs()}

        {/* Layer 1: Background & grid */}
        <g id="rctc-bg-layer">
          {/* Background with gradient fill */}
          <rect x="0" y="0" width={width} height={height} fill="url(#rctcLabBg)" rx="4" />
          <rect x={padding} y={padding} width={innerW} height={innerH}
            fill="url(#rctcGraphBg)" stroke="rgba(148,163,184,0.2)" strokeWidth="1" rx="3" />

          {/* Horizontal grid lines */}
          {gridLines.map((gy, i) => (
            <line key={i} x1={padding} y1={gy} x2={padding + innerW} y2={gy}
              stroke="rgba(148,163,184,0.15)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
          ))}

          {/* Tau vertical dashed lines */}
          {tauXPositions.map((tx, i) => (
            <line key={i} x1={tx} y1={padding} x2={tx} y2={height - padding}
              stroke="rgba(139,92,246,0.25)" strokeWidth="1" strokeDasharray="3,3" />
          ))}

          {/* Axes */}
          <line x1={padding} y1={height - padding} x2={padding + innerW} y2={height - padding}
            stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding}
            stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        </g>

        {/* Layer 2: Labels */}
        <g id="rctc-labels-layer">
          {/* X-axis label: Time - placed at bottom center, absolute position */}
          <text x={padding + innerW / 2} y={height - 5} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="12" fontWeight="500">
            Time (s)
          </text>

          {/* Y-axis label: Voltage - placed vertically using separate character positions */}
          <text x={yLabelX} y={yLabelY1} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="11">V</text>
          <text x={yLabelX} y={yLabelY2} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="11">o</text>
          <text x={yLabelX} y={yLabelY3} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="11">l</text>

          {/* Y scale labels - absolute coordinates */}
          <text x={padding - 4} y={padding + 5} textAnchor="end" fill="rgba(255,255,255,0.6)" fontSize="12">
            {maxVoltage}V
          </text>
          <text x={padding - 4} y={height - padding + 4} textAnchor="end" fill="rgba(255,255,255,0.6)" fontSize="12">
            0V
          </text>

          {/* Time constant label inside SVG - changes when slider moves */}
          <text x={padding + innerW - 4} y={padding + 16} textAnchor="end" fill="rgba(139,92,246,0.9)" fontSize="12" fontWeight="bold">
            τ={timeConstant.toFixed(2)}s
          </text>

          {/* 63% reference line and label for charging */}
          {isCharge && (
            <>
              <line x1={padding} y1={height - padding - 0.632 * innerH}
                x2={padding + innerW} y2={height - padding - 0.632 * innerH}
                stroke="#10B981" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.6" />
              <text x={padding + 4} y={height - padding - 0.632 * innerH - 4}
                textAnchor="start" fill="#10B981" fontSize="11" fontWeight="bold">
                63%@1τ
              </text>
            </>
          )}
        </g>

        {/* Layer 3: Curves */}
        <g id="rctc-curves-layer">
          {/* Preview curve (21 points, always shown as reference) */}
          <path d={previewPath} fill="none"
            stroke={history.length > 1 ? "rgba(139,92,246,0.25)" : "rgba(139,92,246,0.7)"}
            strokeWidth={history.length > 1 ? 1.5 : 2.5}
            strokeDasharray={history.length > 1 ? "5,5" : "0"} />

          {/* Live voltage curve with glow */}
          {history.length > 1 && (
            <g filter="url(#rctcVoltageGlowFilter)">
              <path d={livePath} fill="none" stroke="url(#rctcVoltageGradient)"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}
        </g>

        {/* Layer 4: Markers */}
        <g id="rctc-markers-layer">
          {/* Reference marker at t=1s - position changes when τ changes */}
          <circle cx={refMarkerX.toFixed(1)} cy={refMarkerY.toFixed(1)} r="6"
            fill="url(#rctcCapacitorPlate)"
            filter="url(#rctcCapacitorGlowFilter)"
            opacity="0.85" />

          {/* Current voltage marker (live tracking point) */}
          {history.length > 0 && (() => {
            const lastPt = history[history.length - 1];
            const cx = padding + (lastPt.time / maxTime) * innerW;
            const cy = height - padding - (lastPt.voltage / maxVoltage) * innerH;
            return (
              <circle cx={cx} cy={cy} r="8"
                fill="url(#rctcCapacitorPlate)"
                filter="url(#rctcCapacitorGlowFilter)"
                opacity="0.9" />
            );
          })()}
        </g>
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
          Start exploring the exponential curves of charging and discharging — discover how RC circuits work in real devices
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
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" preserveAspectRatio="xMidYMid meet">
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

        {/* Static preview circuit diagram */}
        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.lg,
          border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: premiumDesign.spacing.lg,
          maxWidth: 600,
          margin: '0 auto 24px auto',
        }}>
          <svg viewBox="0 0 300 200" style={{ width: '100%', maxHeight: 240 }} preserveAspectRatio="xMidYMid meet">
            {renderSVGDefs()}

            {/* Lab background */}
            <rect width="300" height="200" fill="url(#rctcLabBg)" rx="4" />
            <rect width="300" height="200" fill="url(#rctcLabGrid)" rx="4" />

            {/* Circuit wire path */}
            <path d="M 25,60 L 25,30 L 275,30 L 275,170 L 25,170 L 25,100"
              fill="none" stroke="url(#rctcWireCopper)" strokeWidth="3" strokeLinecap="round" />

            {/* Battery with label */}
            <g transform="translate(10, 60)">
              <rect x="0" y="0" width="18" height="40" fill="url(#rctcBatteryGradient)" rx="2"
                stroke="#a16207" strokeWidth="1" />
              <rect x="5" y="-3" width="8" height="4" fill="#fbbf24" rx="1" />
              <text x="9" y="22" textAnchor="middle" fill="#78350f" fontSize="11" fontWeight="bold">+</text>
              <text x="9" y="35" textAnchor="middle" fill="#78350f" fontSize="11" fontWeight="bold">-</text>
              <text x="9" y="58" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="bold">Battery</text>
            </g>

            {/* Resistor with label */}
            <g transform="translate(80, 20)">
              <line x1="-10" y1="10" x2="0" y2="10" stroke="url(#rctcWireCopper)" strokeWidth="2.5" />
              <line x1="80" y1="10" x2="90" y2="10" stroke="url(#rctcWireCopper)" strokeWidth="2.5" />
              <rect x="0" y="0" width="80" height="20" fill="url(#rctcResistorBands)" rx="4"
                stroke="#991b1b" strokeWidth="1.5" />
              <rect x="0" y="0" width="80" height="4" fill="rgba(255,255,255,0.2)" rx="4" />
              <text x="40" y="40" textAnchor="middle" fill="#ef4444" fontSize="13" fontWeight="bold">Resistor</text>
            </g>

            {/* Capacitor with label */}
            <g transform="translate(250, 20)">
              <rect x="0" y="0" width="6" height="30" fill="url(#rctcCapacitorPlate)" rx="1" />
              <rect x="18" y="0" width="6" height="30" fill="url(#rctcCapacitorPlate)" rx="1" />
              <line x1="3" y1="-10" x2="3" y2="0" stroke="url(#rctcWireCopper)" strokeWidth="2.5" />
              <line x1="21" y1="30" x2="21" y2="40" stroke="url(#rctcWireCopper)" strokeWidth="2.5" />
              <text x="12" y="72" textAnchor="middle" fill="#06b6d4" fontSize="13" fontWeight="bold">Capacitor</text>
            </g>

            {/* Question mark */}
            <text x="150" y="120" textAnchor="middle" fill={premiumDesign.colors.capacitor} fontSize="48" fontWeight="bold">?</text>
            <text x="150" y="145" textAnchor="middle" fill={premiumDesign.colors.text.secondary} fontSize="14">What will the voltage curve look like?</text>

            {/* Axes for upcoming graph */}
            <g transform="translate(40, 165)">
              <line x1="0" y1="0" x2="220" y2="0" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
              <line x1="0" y1="0" x2="0" y2="-60" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
              <text x="110" y="18" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="11">X: Time</text>
              <text x="-18" y="-30" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="11" transform="rotate(-90 -18 -30)">Y: Voltage</text>
            </g>
          </svg>
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
          <p style={{ color: premiumDesign.colors.text.secondary, lineHeight: 1.6 }}>
            Watch the exponential charging curve in real-time
          </p>
          <p style={{ color: 'rgba(148,163,184,0.9)', fontSize: '14px', lineHeight: 1.6, maxWidth: 500, margin: '8px auto 0' }}>
            Why this matters: RC time constants govern everything from camera flash recycle times to heart defibrillators and audio filters. Understanding τ = RC lets engineers design precise timing circuits for medical devices, consumer electronics, and industrial systems.
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
            {/* Voltage Graph - shown FIRST so getSVG() finds graph SVG */}
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.xl,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.text.primary, marginBottom: premiumDesign.spacing.sm, fontSize: typo.body }}>
                Voltage vs Time (Charging Curve) — τ = {timeConstant.toFixed(2)}s
              </h4>
              {renderVoltageGraph(chargeHistory, supplyVoltage, true)}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '6px',
                fontSize: typo.label,
                color: premiumDesign.colors.text.muted,
              }}>
                <span>0</span>
                <span style={{ color: premiumDesign.colors.capacitor }}>1τ</span>
                <span style={{ color: premiumDesign.colors.capacitor }}>2τ</span>
                <span style={{ color: premiumDesign.colors.capacitor }}>3τ</span>
                <span style={{ color: premiumDesign.colors.capacitor }}>4τ</span>
                <span style={{ color: premiumDesign.colors.capacitor }}>5τ</span>
              </div>
            </div>

            {/* Circuit Diagram - Premium SVG */}
            <div style={{
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.xl,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <svg viewBox="0 0 300 200" style={{ width: '100%', maxHeight: 220 }} preserveAspectRatio="xMidYMid meet">
                {renderSVGDefs()}

                {/* Lab background */}
                <rect width="300" height="180" fill="url(#rctcLabBg)" rx="4" />
                <rect width="300" height="180" fill="url(#rctcLabGrid)" rx="4" />

                {/* Circuit wire path with copper gradient */}
                <path d="M 25,60 L 25,30 L 275,30 L 275,140 L 25,140 L 25,100"
                  fill="none" stroke="url(#rctcWireCopper)" strokeWidth="2.5" strokeLinecap="round" />

                {/* Current flow particles (animated when charging) */}
                {isCharging && [0, 1, 2, 3].map(i => {
                  const offset = (Date.now() / 50 + i * 25) % 100;
                  const pos = offset / 100;
                  // Calculate position along circuit path
                  let x, y;
                  if (pos < 0.25) {
                    x = 25 + (pos / 0.25) * 250;
                    y = 30;
                  } else if (pos < 0.5) {
                    x = 275;
                    y = 30 + ((pos - 0.25) / 0.25) * 110;
                  } else if (pos < 0.75) {
                    x = 275 - ((pos - 0.5) / 0.25) * 250;
                    y = 140;
                  } else {
                    x = 25;
                    y = 140 - ((pos - 0.75) / 0.25) * 110;
                  }
                  return (
                    <circle key={i} cx={x} cy={y} r="3"
                      fill="url(#rctcCurrentParticle)" filter="url(#rctcCurrentGlowFilter)" />
                  );
                })}

                {/* Battery with gradient and label */}
                <g transform="translate(10, 60)">
                  <rect x="0" y="0" width="18" height="40" fill="url(#rctcBatteryGradient)" rx="2"
                    stroke="#a16207" strokeWidth="1" />
                  <rect x="5" y="-3" width="8" height="4" fill="#fbbf24" rx="1" />
                  <text x="9" y="22" textAnchor="middle" fill="#78350f" fontSize="11" fontWeight="bold">+</text>
                  <text x="9" y="-8" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold">{supplyVoltage}V</text>
                </g>

                {/* Resistor with colored bands and label */}
                <g transform="translate(80, 20)">
                  {/* Lead wires */}
                  <line x1="-10" y1="10" x2="0" y2="10" stroke="url(#rctcWireCopper)" strokeWidth="2" />
                  <line x1="80" y1="10" x2="90" y2="10" stroke="url(#rctcWireCopper)" strokeWidth="2" />
                  {/* Resistor body */}
                  <rect x="0" y="0" width="80" height="20" fill="url(#rctcResistorBands)" rx="3"
                    stroke="#991b1b" strokeWidth="1" />
                  {/* 3D effect */}
                  <rect x="0" y="0" width="80" height="4" fill="rgba(255,255,255,0.2)" rx="3" />
                  {/* Label */}
                  <text x="40" y="35" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="bold">R={resistance}kΩ</text>
                </g>

                {/* Capacitor with charge visualization and label */}
                <g transform="translate(235, 20)">
                  {/* Capacitor plates */}
                  <rect x="0" y="0" width="6" height="30" fill="url(#rctcCapacitorPlate)" rx="1"
                    filter={chargePercent > 20 ? "url(#rctcCapacitorGlowFilter)" : undefined} />
                  <rect x="18" y="0" width="6" height="30" fill="url(#rctcCapacitorPlate)" rx="1"
                    filter={chargePercent > 20 ? "url(#rctcCapacitorGlowFilter)" : undefined} />
                  {/* Charge glow between plates */}
                  {chargePercent > 5 && (
                    <ellipse cx="12" cy="15" rx={3 + chargePercent / 30} ry={12}
                      fill="url(#rctcCapacitorGlow)" opacity={Math.min(0.8, chargePercent / 100)} />
                  )}
                  {/* Electric field lines when charging */}
                  {chargePercent > 10 && isCharging && (
                    <g opacity={chargePercent / 150}>
                      <line x1="7" y1="8" x2="17" y2="8" stroke="#67e8f9" strokeWidth="0.5" strokeDasharray="2,2" />
                      <line x1="7" y1="15" x2="17" y2="15" stroke="#67e8f9" strokeWidth="0.5" strokeDasharray="2,2" />
                      <line x1="7" y1="22" x2="17" y2="22" stroke="#67e8f9" strokeWidth="0.5" strokeDasharray="2,2" />
                    </g>
                  )}
                  {/* Lead wires */}
                  <line x1="3" y1="-10" x2="3" y2="0" stroke="url(#rctcWireCopper)" strokeWidth="2" />
                  <line x1="21" y1="30" x2="21" y2="40" stroke="url(#rctcWireCopper)" strokeWidth="2" />
                  {/* Label */}
                  <text x="12" y="62" textAnchor="middle" fill="#06b6d4" fontSize="11" fontWeight="bold">C={capacitance}μF</text>
                </g>

                {/* Switch with premium styling and label */}
                <g transform="translate(260, 85)">
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

                {/* Observation guidance */}
                <text x="150" y="165" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="11">
                  {isCharging ? '▶ Watch how voltage rises fast then slows' : '▶ Adjust sliders, then click Start to observe charging'}
                </text>
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
                onInput={(e) => { setResistance(Number((e.target as HTMLInputElement).value)); resetCharging(); }}
                style={{ width: '100%', height: '20px', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none' } as React.CSSProperties}
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
                onInput={(e) => { setCapacitance(Number((e.target as HTMLInputElement).value)); resetCharging(); }}
                style={{ width: '100%', height: '20px', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none' } as React.CSSProperties}
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
        content: "As you observed in the experiment, capacitors charge with an exponential curve, NOT linearly. The voltage rises quickly at first (when there's maximum current), then slows down as the capacitor fills up and resists further charging.",
        formula: "V(t) = V₀(1 - e^(-t/τ))",
      },
      {
        title: "The Time Constant τ",
        content: "You saw how changing R and C affected the charging speed. The time constant τ = RC determines HOW FAST charging occurs. After 1τ, the capacitor reaches 63% of supply voltage. After 5τ, it's essentially full (99.3%).",
        formula: "τ = R × C (seconds)",
      },
      {
        title: "Why Exponential?",
        content: "As the capacitor charges, its voltage opposes the supply. This reduces the voltage across the resistor, which reduces current, which slows charging. It's a natural feedback loop that creates the exponential curve you predicted!",
        formula: "I = (V_supply - V_cap) / R → decreases as V_cap increases",
      },
      {
        title: "Your Prediction vs Reality",
        content: prediction === 'exponential'
          ? "Excellent! You correctly predicted the exponential charging behavior. As you saw in the simulator, the curve starts fast and slows down as the capacitor approaches full charge — exactly matching V(t) = V₀(1 - e^(-t/τ))."
          : "You predicted a different pattern, but as you observed in the experiment, the correct answer is exponential charging. The capacitor charges quickly at first, then slows as it approaches the supply voltage.",
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

        {/* Static discharge preview SVG */}
        <div style={{
          background: premiumDesign.colors.background.card,
          borderRadius: premiumDesign.radius.xl,
          padding: premiumDesign.spacing.lg,
          border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: premiumDesign.spacing.lg,
          maxWidth: 560,
          margin: '0 auto 20px auto',
        }}>
          <svg viewBox="0 0 300 220" style={{ width: '100%', maxHeight: 240 }} preserveAspectRatio="xMidYMid meet">
            {renderSVGDefs()}
            <rect width="300" height="220" fill="url(#rctcLabBg)" rx="4" />
            <rect width="300" height="220" fill="url(#rctcLabGrid)" rx="4" />

            {/* Graph area */}
            <rect x="45" y="20" width="220" height="160" fill="url(#rctcGraphBg)" stroke="rgba(148,163,184,0.2)" strokeWidth="1" rx="3" />

            {/* Grid lines */}
            <line x1="45" y1="60" x2="265" y2="60" stroke="rgba(148,163,184,0.15)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
            <line x1="45" y1="100" x2="265" y2="100" stroke="rgba(148,163,184,0.15)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
            <line x1="45" y1="140" x2="265" y2="140" stroke="rgba(148,163,184,0.15)" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />

            {/* Axes */}
            <line x1="45" y1="180" x2="265" y2="180" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
            <line x1="45" y1="20" x2="45" y2="180" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />

            {/* X label: Time */}
            <text x="155" y="210" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="12" fontWeight="500">Time (seconds)</text>

            {/* Y labels: Voltage */}
            <text x="12" y="65" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="11">V</text>
            <text x="12" y="100" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="11">o</text>
            <text x="12" y="130" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="11">l</text>

            {/* Scale labels */}
            <text x="41" y="25" textAnchor="end" fill="rgba(255,255,255,0.6)" fontSize="12">12V</text>
            <text x="41" y="184" textAnchor="end" fill="rgba(255,255,255,0.6)" fontSize="12">0V</text>

            {/* Discharge curve question mark area */}
            <text x="155" y="105" textAnchor="middle" fill={premiumDesign.colors.secondary} fontSize="40" fontWeight="bold">?</text>
            <text x="155" y="130" textAnchor="middle" fill={premiumDesign.colors.text.secondary} fontSize="12">What will the discharge curve look like?</text>
          </svg>
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
              <svg viewBox="0 0 280 170" style={{ width: '100%', maxHeight: 190 }} preserveAspectRatio="xMidYMid meet">
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
                <rect width="280" height="170" fill="url(#rctcLabBg)" rx="4" />
                <rect width="280" height="170" fill="url(#rctcLabGrid)" rx="4" />

                {/* Circuit wire path */}
                <path d="M 55,80 L 55,30 L 225,30 L 225,130 L 55,130 L 55,80"
                  fill="none" stroke="url(#rctcWireCopper)" strokeWidth="2.5" strokeLinecap="round" />

                {/* Current flow particles (animated when discharging) */}
                {isDischarging && dischargePercent > 5 && [0, 1, 2].map(i => {
                  const offset = (Date.now() / 60 + i * 33) % 100;
                  const pos = offset / 100;
                  // Calculate position along circuit path (reverse direction for discharge)
                  let x, y;
                  if (pos < 0.25) {
                    x = 55;
                    y = 80 - (pos / 0.25) * 50;
                  } else if (pos < 0.5) {
                    x = 55 + ((pos - 0.25) / 0.25) * 170;
                    y = 30;
                  } else if (pos < 0.75) {
                    x = 225;
                    y = 30 + ((pos - 0.5) / 0.25) * 100;
                  } else {
                    x = 225 - ((pos - 0.75) / 0.25) * 170;
                    y = 130;
                  }
                  return (
                    <circle key={i} cx={x} cy={y} r={2 + dischargePercent / 50}
                      fill="url(#rctcCurrentParticle)" filter="url(#rctcCurrentGlowFilter)"
                      opacity={dischargePercent / 100} />
                  );
                })}

                {/* Resistor with colored bands and label */}
                <g transform="translate(90, 20)">
                  <line x1="-10" y1="10" x2="0" y2="10" stroke="url(#rctcWireCopper)" strokeWidth="2" />
                  <line x1="70" y1="10" x2="80" y2="10" stroke="url(#rctcWireCopper)" strokeWidth="2" />
                  <rect x="0" y="0" width="70" height="20" fill="url(#rctcResistorBands)" rx="3"
                    stroke="#991b1b" strokeWidth="1" />
                  <rect x="0" y="0" width="70" height="4" fill="rgba(255,255,255,0.2)" rx="3" />
                  <text x="35" y="35" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="bold">R={resistance}kΩ</text>
                </g>

                {/* Capacitor with discharge visualization and label */}
                <g transform="translate(195, 20)">
                  <rect x="0" y="0" width="6" height="28" fill="url(#rctcDischargeCapacitor)" rx="1"
                    filter={dischargePercent > 20 ? "url(#rctcCapacitorGlowFilter)" : undefined} />
                  <rect x="18" y="0" width="6" height="28" fill="url(#rctcDischargeCapacitor)" rx="1"
                    filter={dischargePercent > 20 ? "url(#rctcCapacitorGlowFilter)" : undefined} />
                  {/* Remaining charge glow */}
                  {dischargePercent > 5 && (
                    <ellipse cx="12" cy="14" rx={2 + dischargePercent / 40} ry={10}
                      fill="url(#rctcDischargeGlow)" opacity={dischargePercent / 120} />
                  )}
                  {/* Charge level indicator */}
                  <rect x="7" y={28 - dischargePercent * 0.25} width="10" height={dischargePercent * 0.25}
                    fill="#c084fc" opacity="0.4" rx="1" />
                  <text x="12" y="58" textAnchor="middle" fill="#8b5cf6" fontSize="11" fontWeight="bold">C={capacitance}μF</text>
                </g>

                {/* Light bulb with glow effect and label */}
                <g transform="translate(55, 80)">
                  {/* Outer glow when lit */}
                  {dischargePercent > 10 && (
                    <circle cx="0" cy="0" r={16 + dischargePercent / 20} fill="url(#rctcBulbGlow)"
                      opacity={dischargePercent / 200} filter="url(#rctcSoftGlow)" />
                  )}
                  {/* Bulb glass */}
                  <circle cx="0" cy="0" r="14" fill={`rgba(254, 240, 138, ${dischargePercent / 150})`}
                    stroke="#ca8a04" strokeWidth="1.5" />
                  {/* Filament */}
                  <path d="M-5,-2Q0,-7 5,-2Q0,3-5,-2" fill="none"
                    stroke={dischargePercent > 20 ? '#fef08a' : '#78350f'} strokeWidth="1.5"
                    filter={dischargePercent > 30 ? "url(#rctcCurrentGlowFilter)" : undefined} />
                  {/* Base */}
                  <rect x="-6" y="10" width="12" height="8" fill="#78350f" rx="1" />
                  <line x1="-5" y1="12" x2="5" y2="12" stroke="#a16207" strokeWidth="1" />
                  <line x1="-5" y1="15" x2="5" y2="15" stroke="#a16207" strokeWidth="1" />
                  <text x="0" y="32" textAnchor="middle" fill={dischargePercent > 10 ? '#fbbf24' : '#9ca3af'} fontSize="11" fontWeight="bold">
                    BULB
                  </text>
                </g>

                {/* Switch with premium styling and label */}
                <g transform="translate(170, 125)">
                  <circle cx="0" cy="0" r="4" fill={isDischarging ? "url(#rctcSwitchContact)" : '#4b5563'}
                    stroke={isDischarging ? '#059669' : '#374151'} strokeWidth="1" />
                  <line x1="0" y1="0" x2={isDischarging ? "16" : "10"} y2={isDischarging ? "0" : "-8"}
                    stroke={isDischarging ? "url(#rctcSwitchContact)" : '#6b7280'} strokeWidth="2" strokeLinecap="round" />
                  <circle cx="16" cy="0" r="4" fill={isDischarging ? "url(#rctcSwitchContact)" : '#4b5563'}
                    stroke={isDischarging ? '#059669' : '#374151'} strokeWidth="1" />
                  <text x="8" y="13" textAnchor="middle" fill={isDischarging ? '#10b981' : '#9ca3af'} fontSize="11" fontWeight="bold">
                    {isDischarging ? 'ON' : 'OFF'}
                  </text>
                </g>

                {/* Observation guidance */}
                <text x="140" y="158" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="11">
                  {isDischarging ? '▶ Watch exponential decay - voltage drops fast then slows' : '▶ Click Start to discharge through bulb'}
                </text>
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
        description: "Camera flashes use large capacitors (typically 100-1000μF) that slowly charge from the battery through a resistor, then discharge all their energy through a xenon flash tube in just 1-2 milliseconds, creating a brilliant burst of light. The RC time constant directly determines the recycle time — how long photographers must wait between shots. The characteristic whine you hear as the flash recharges is the sound of a boost converter stepping up voltage to charge the capacitor faster. Professional studio strobes use much larger capacitors (up to 3000μF) and lower resistance paths to store more energy for a brighter flash while maintaining reasonable recycle times. Understanding τ = RC allows flash engineers to precisely calculate that a 330μF capacitor with a 15kΩ charging resistance gives a time constant of about 5 seconds for full charge.",
        fact: "A camera flash capacitor stores 100-360 joules of energy and releases it in under 2 milliseconds — a power output of over 50,000 watts for that brief instant!",
      },
      {
        title: "📱 Touchscreens",
        description: "Every smartphone touchscreen relies on RC time constant principles to detect your finger's position. Capacitive touchscreens use a grid of tiny electrode pairs that form small capacitors. When your finger approaches the screen, it adds capacitance (your body conducts electricity), changing the RC time constant of the sensing circuit. The controller chip measures how long each RC circuit takes to charge and discharge, using these timing differences to precisely locate where you're touching. Modern phones perform millions of these RC measurements per second across hundreds of electrode pairs to track multiple simultaneous touch points. The physics are identical to what you explored in this simulation — the finger changes C in τ = RC, altering the measurable charge time.",
        fact: "Your smartphone performs over 120 RC time constant measurements per electrode pair each second, scanning hundreds of points to track your fingers with sub-millimeter accuracy!",
      },
      {
        title: "🔊 Audio Filters",
        description: "RC circuits are the foundation of every audio filter, from the bass and treble knobs on a home stereo to the sophisticated equalizers in professional recording studios. The RC time constant determines the cutoff frequency: f = 1/(2πRC). A low-pass RC filter allows bass frequencies below the cutoff to pass through while attenuating higher frequencies. A high-pass filter does the opposite. By choosing appropriate R and C values, audio engineers precisely control which frequencies reach the speakers. Guitar tone controls, synthesizer filters, and crossover networks in speaker systems all use this principle. When you turn the bass knob on your stereo, you're effectively changing R in an RC filter circuit, shifting the τ and therefore the frequency cutoff point.",
        fact: "The 'warmth' of vintage analog audio equipment comes partly from the specific RC filter characteristics of components made in the 1960s-70s — engineers now recreate these exact RC time constants digitally!",
      },
      {
        title: "⏰ Timing Circuits",
        description: "The legendary 555 timer integrated circuit, first designed in 1972, uses an RC network to create precise timing intervals that power everything from blinking LEDs to industrial control systems. The chip charges a capacitor through a resistor using the τ = RC principle and triggers output changes at specific voltage thresholds (typically 1/3 and 2/3 of supply voltage). By selecting different R and C values, engineers set timing intervals from microseconds to hours. Microwave oven timers, car turn signals, door chimes, pulse-width modulation for motor speed control, and LED dimmers all commonly use 555-based RC timing circuits. This single chip demonstrates how mastering the RC time constant gives you the power to control time itself in electronic systems.",
        fact: "The 555 timer IC has been in continuous production since 1972 and remains one of the world's best-selling chips — an estimated 1 billion units are manufactured annually worldwide!",
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
                onGameEvent?.({ type: 'app_explored', data: { appIndex: activeApp } });
              }}
            >
              ✓ Got It
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
          ) : (
            <button
              style={{
                display: 'block',
                width: '100%',
                marginTop: premiumDesign.spacing.lg,
                padding: premiumDesign.spacing.md,
                borderRadius: premiumDesign.radius.md,
                border: '1px solid rgba(16, 185, 129, 0.5)',
                background: 'rgba(16, 185, 129, 0.2)',
                color: premiumDesign.colors.success,
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'default',
                zIndex: 10,
              }}
              disabled
            >
              ✓ All Applications Complete
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
              background: passed ? premiumDesign.colors.gradient.rc : 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: premiumDesign.spacing.md,
            }}>
              {testScore} / 10
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

            <div style={{ display: 'flex', gap: premiumDesign.spacing.md, flexWrap: 'wrap', justifyContent: 'center', marginBottom: premiumDesign.spacing.xl }}>
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
              {renderButton(
                '↩ Replay Quiz',
                () => {
                  setTestComplete(false);
                  setCurrentQuestion(0);
                  setTestScore(0);
                  setSelectedAnswer(null);
                  setShowExplanation(false);
                },
                'secondary'
              )}
            </div>

            {/* Answer review section */}
            <div style={{
              width: '100%',
              maxWidth: 500,
              overflowY: 'auto',
              maxHeight: '40vh',
              background: premiumDesign.colors.background.card,
              borderRadius: premiumDesign.radius.xl,
              padding: premiumDesign.spacing.lg,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: premiumDesign.colors.capacitor, marginBottom: premiumDesign.spacing.md, fontSize: typo.body }}>
                Answer Review
              </h4>
              {testQuestions.map((q, qi) => (
                <div key={qi} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: premiumDesign.spacing.sm,
                  marginBottom: premiumDesign.spacing.sm,
                  fontSize: '13px',
                }}>
                  <span style={{ color: qi < testScore ? premiumDesign.colors.success : '#EF4444', fontWeight: 700, minWidth: 20 }}>
                    {qi < testScore ? '✓' : '✗'}
                  </span>
                  <span style={{ color: premiumDesign.colors.text.secondary, lineHeight: 1.5 }}>
                    Q{qi + 1}: {q.question.slice(0, 60)}...
                  </span>
                </div>
              ))}
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
          {/* Scenario context */}
          <div style={{
            background: 'rgba(6,182,212,0.08)',
            borderRadius: premiumDesign.radius.md,
            padding: premiumDesign.spacing.md,
            marginBottom: premiumDesign.spacing.lg,
            border: '1px solid rgba(6,182,212,0.2)',
          }}>
            <p style={{
              color: 'rgba(148,163,184,0.9)',
              fontSize: '14px',
              lineHeight: 1.6,
              margin: 0,
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
              const opt = option as { text: string; correct?: boolean };
              let borderColor = 'rgba(255,255,255,0.1)';
              let bgColor = premiumDesign.colors.background.tertiary;

              if (showExplanation) {
                if (opt.correct) {
                  bgColor = 'rgba(16, 185, 129, 0.2)';
                  borderColor = premiumDesign.colors.success;
                } else if (index === selectedAnswer && !opt.correct) {
                  bgColor = 'rgba(239, 68, 68, 0.2)';
                  borderColor = '#EF4444';
                }
              } else if (selectedAnswer === index) {
                borderColor = premiumDesign.colors.capacitor;
                bgColor = 'rgba(6, 182, 212, 0.2)';
              }

              const buttonStyle: React.CSSProperties = {
                padding: premiumDesign.spacing.lg,
                borderRadius: premiumDesign.radius.lg,
                border: `2px solid ${borderColor}`,
                background: bgColor,
                color: premiumDesign.colors.text.primary,
                fontSize: '16px',
                cursor: showExplanation ? 'default' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.3s ease',
                zIndex: 10,
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
                  {(option as { text: string; correct?: boolean }).text}
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
                if ((question.options[selectedAnswer as number] as { text: string; correct?: boolean })?.correct) {
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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100dvh',
      background: '#0a0f1a',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: premiumDesign.typography.fontFamily,
      lineHeight: 1.6,
    }}>
      {/* Premium background gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0f172a 0%, #0a1628 50%, #0f172a 100%)' }} />

      {/* Header - fixed nav */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 24px',
          maxWidth: 900,
          margin: '0 auto',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>RC Time Constant</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {phaseOrder.map((p) => (
              <button
                key={p}
                onClick={() => goToPhase(p)}
                aria-label={`${phaseLabels[p]} - explore ${p.replace('_', ' ')} experiment`}
                style={{
                  width: phase === p ? 24 : 8,
                  height: 8,
                  borderRadius: 9999,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  background: phase === p
                    ? '#22d3ee'
                    : phaseOrder.indexOf(phase) > phaseOrder.indexOf(p)
                      ? '#10B981'
                      : 'rgba(148,163,184,0.3)',
                  boxShadow: phase === p ? '0 0 8px rgba(34,211,238,0.4)' : 'none',
                  zIndex: 10,
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#22d3ee' }}>{phaseLabels[phase]}</span>
        </div>
      </div>

      {/* Main scrollable content */}
      <div style={{
        position: 'relative',
        flex: 1,
        overflowY: 'auto',
        paddingTop: '60px',
        paddingBottom: '16px',
      }}>
        <div style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: isMobile ? '16px' : '24px 32px',
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
              conceptName="R C Time Constant"
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

      {/* Fixed bottom bar */}
      <nav style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(148, 163, 184, 0.15)',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.4)',
        padding: '12px 24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 900, margin: '0 auto' }}>
          <button
            onClick={goBack}
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 500,
              transition: 'all 0.3s ease',
            }}
          >
            ← Back
          </button>
          <button
            onClick={goNext}
            disabled={phase === 'test' && !testComplete}
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              border: 'none',
              background: phase === 'test' && !testComplete
                ? 'rgba(99,102,241,0.3)'
                : 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
              color: phase === 'test' && !testComplete ? 'rgba(255,255,255,0.4)' : 'white',
              cursor: phase === 'test' && !testComplete ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              fontWeight: 600,
              boxShadow: phase === 'test' && !testComplete ? 'none' : '0 0 20px rgba(99,102,241,0.25)',
              transition: 'all 0.3s ease',
            }}
          >
            Next →
          </button>
        </div>
      </nav>
    </div>
  );
}
