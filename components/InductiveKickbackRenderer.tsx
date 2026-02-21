'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { playSound } from '../lib/audio';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// ────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ────────────────────────────────────────────────────────────────────────────

type Phase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

const PHASES: Phase[] = [
  'hook',
  'predict',
  'play',
  'review',
  'twist_predict',
  'twist_play',
  'twist_review',
  'transfer',
  'test',
  'mastery',
];

interface InductiveKickbackRendererProps {
  phase?: Phase;
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
  onGameEvent?: (event: any) => void;
}

// ────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications with stats
// ────────────────────────────────────────────────────────────────────────────

const realWorldApps = [
  {
    icon: '🚗',
    title: 'Automotive Ignition Systems',
    description: 'Car ignition systems exploit inductive kickback to create the 40,000V spark needed to ignite fuel. A 12V battery energizes a coil, then the circuit is interrupted, causing the collapsing magnetic field to generate tens of thousands of volts. The ignition coil acts as a transformer with a primary winding of about 200 turns and a secondary winding with 20,000+ turns, multiplying the voltage through both the turns ratio and the inductive kickback effect. Modern distributorless ignition systems use individual coil-on-plug assemblies for each cylinder, with precise timing controlled by the engine computer. This technology has evolved from mechanical contact breakers to solid-state electronic control, improving reliability and fuel efficiency.',
    stats: [
      { value: '40,000V', label: 'Spark voltage' },
      { value: '12V', label: 'Input voltage' },
      { value: '3,000x', label: 'Voltage boost' },
    ],
    companies: ['Bosch', 'Denso', 'Delphi', 'NGK'],
    color: '#EF4444',
  },
  {
    icon: '🔌',
    title: 'DC-DC Boost Converters',
    description: 'Boost converters intentionally create controlled inductive kickback to step up voltage. A transistor rapidly switches current through an inductor; each switching cycle harvests the kickback energy to charge a capacitor at higher voltage. These circuits are essential in modern electronics, from USB power banks that boost 3.7V lithium batteries to 5V USB output, to solar panel systems that step up panel voltage to charge battery banks. The switching frequency typically ranges from 100kHz to several MHz, with higher frequencies allowing smaller inductor and capacitor components. Advanced synchronous boost converters use MOSFETs instead of diodes for even higher efficiency, reaching 95-98% conversion efficiency in optimized designs.',
    stats: [
      { value: '95%', label: 'Efficiency' },
      { value: '100kHz+', label: 'Switching freq' },
      { value: '2-10x', label: 'Boost ratio' },
    ],
    companies: ['Texas Instruments', 'Analog Devices', 'Maxim', 'ON Semi'],
    color: '#22C55E',
  },
  {
    icon: '🎸',
    title: 'Electric Guitar Pickups',
    description: 'Guitar pickups are inductors with permanent magnets that magnetize steel strings. Vibrating strings create a changing magnetic flux through the pickup coil, inducing a voltage that becomes the audio signal. Single-coil pickups produce a bright, clear tone but are susceptible to electromagnetic interference (hum), while humbucker pickups use two coils wired in series with opposite polarity to cancel noise. The inductance of the coil affects tone: higher inductance (more windings) produces a darker, warmer sound with more midrange, while lower inductance yields a brighter tone. Different magnet materials (alnico, ceramic, neodymium) also influence the magnetic field strength and tonal characteristics. The same electromagnetic induction principle is used in microphones, phonograph cartridges, and metal detectors.',
    stats: [
      { value: '10mV', label: 'Output voltage' },
      { value: '8,000', label: 'Wire turns' },
      { value: '5-15k', label: 'Ohms resistance' },
    ],
    companies: ['Fender', 'Gibson', 'Seymour Duncan', 'DiMarzio'],
    color: '#8B5CF6',
  },
  {
    icon: '🔋',
    title: 'Relay & Snubber Protection',
    description: 'Every relay, solenoid, and motor produces potentially damaging kickback spikes when switched off. Protection circuits (flyback diodes, snubbers) provide safe paths for the collapsing field energy. A simple flyback diode costs pennies but prevents voltage spikes that could destroy expensive transistors and ICs. The diode is placed reverse-biased across the inductive load, blocking current during normal operation but conducting when kickback occurs, clamping the voltage to about 0.7V above supply. RC snubber networks offer faster response but dissipate more energy as heat. In high-power industrial applications, metal-oxide varistors (MOVs) and transient voltage suppressors (TVS) provide additional protection. Without these safeguards, inductive kickback can arc across switch contacts causing pitting and erosion, exceed transistor voltage ratings causing avalanche breakdown, and couple electromagnetic interference into nearby circuits.',
    stats: [
      { value: '100V+', label: 'Unprotected spike' },
      { value: '1V', label: 'Protected spike' },
      { value: '$0.10', label: 'Diode cost' },
    ],
    companies: ['Vishay', 'ON Semi', 'Nexperia', 'STMicro'],
    color: '#F59E0B',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// 10 SCENARIO-BASED TEST QUESTIONS
// ────────────────────────────────────────────────────────────────────────────

const testQuestions = [
  {
    scenario: "You're debugging a simple circuit where a 12V relay coil is switched off using a mechanical switch. The switch contacts are showing burn marks after just a few days of use.",
    question: "What is the most likely cause of the switch contact damage?",
    options: [
      { id: 'A', label: 'The switch is rated for too low a current' },
      { id: 'B', label: 'Inductive kickback from the relay coil is arcing across the switch contacts' },
      { id: 'C', label: 'The 12V power supply is providing too much voltage' },
      { id: 'D', label: 'Static electricity is building up in the circuit' },
    ],
    correct: 'B',
    explanation: "When current through an inductor (like a relay coil) is suddenly interrupted, the collapsing magnetic field induces a high voltage spike (V = -L di/dt). This 'inductive kickback' can be hundreds of volts, easily arcing across switch contacts.",
  },
  {
    scenario: "An engineer is designing a circuit where an Arduino controls a 24V relay. The Arduino's GPIO pins can only withstand a maximum of 5V.",
    question: "What component should be added across the relay coil to protect the Arduino?",
    options: [
      { id: 'A', label: 'A capacitor to store the excess energy' },
      { id: 'B', label: 'A resistor to limit current flow' },
      { id: 'C', label: 'A flyback diode oriented reverse-biased across the coil' },
      { id: 'D', label: 'A fuse to break the circuit during spikes' },
    ],
    correct: 'C',
    explanation: "A flyback diode is placed reverse-biased across the relay coil. When the switch opens, the diode becomes forward-biased and provides a safe path for the current, clamping the voltage spike to about 0.7V above supply instead of hundreds of volts.",
  },
  {
    scenario: "A technician notices that the flyback diode across a motor is installed with the cathode connected to the positive terminal and the anode to the negative terminal.",
    question: "What is the purpose of this specific diode orientation?",
    options: [
      { id: 'A', label: 'To block current flow during normal operation while conducting during kickback' },
      { id: 'B', label: 'To increase the motor efficiency by reducing resistance' },
      { id: 'C', label: 'To convert the AC motor current to DC' },
      { id: 'D', label: 'To prevent the motor from spinning backwards' },
    ],
    correct: 'A',
    explanation: "The flyback diode is reverse-biased during normal operation so it doesn't affect the circuit. When kickback occurs, the inductor's voltage reverses polarity, forward-biasing the diode and allowing current to circulate safely.",
  },
  {
    scenario: "A robotics student is building an H-bridge motor driver using four MOSFETs. During testing, one of the MOSFETs fails immediately when the motor direction is reversed quickly.",
    question: "What most likely caused the MOSFET failure?",
    options: [
      { id: 'A', label: 'The motor drew too much continuous current' },
      { id: 'B', label: 'Inductive kickback from the motor exceeded the MOSFET voltage rating' },
      { id: 'C', label: 'The PWM frequency was set too high' },
      { id: 'D', label: 'The gate driver voltage was insufficient' },
    ],
    correct: 'B',
    explanation: "When a motor's direction is reversed quickly, the rapid current change (high di/dt) generates a massive voltage spike that can exceed the MOSFET's breakdown voltage. Flyback diodes across each MOSFET are essential.",
  },
  {
    scenario: "A car won't start. The mechanic measures 12V at the ignition coil primary but the spark plugs aren't firing. The coil should generate around 40,000V.",
    question: "How does the ignition coil achieve such a dramatic voltage increase?",
    options: [
      { id: 'A', label: 'An internal battery booster multiplies the voltage' },
      { id: 'B', label: 'The secondary coil has many more turns, and rapid current interruption creates stepped-up kickback' },
      { id: 'C', label: 'Capacitors store energy and release it all at once' },
      { id: 'D', label: 'The spark plugs themselves amplify the incoming voltage' },
    ],
    correct: 'B',
    explanation: "The ignition coil is a transformer with the secondary having about 100x more turns. When current is interrupted, inductive kickback creates a spike that is multiplied by the turns ratio (12V x 100 = 1,200V, stepped up to ~40,000V).",
  },
  {
    scenario: "An engineer is designing a snubber circuit for a high-power relay that switches 50 times per second. A simple flyback diode causes the relay to release too slowly.",
    question: "What modification would allow faster relay release while still protecting against kickback?",
    options: [
      { id: 'A', label: 'Remove the diode entirely and accept the voltage spikes' },
      { id: 'B', label: 'Add a resistor in series with the flyback diode for controlled spike' },
      { id: 'C', label: 'Replace the diode with a larger capacitor' },
      { id: 'D', label: 'Use a higher voltage power supply to overwhelm the kickback' },
    ],
    correct: 'B',
    explanation: "An RC snubber or resistor-diode combination allows a controlled voltage spike while speeding up magnetic field collapse. The resistor dissipates energy faster than a diode alone, reducing relay release time.",
  },
  {
    scenario: "A power electronics designer is selecting a MOSFET for a flyback converter with 48V input. The MOSFET has a maximum Vds rating of 100V.",
    question: "Why might this MOSFET be inadequate despite seeming to have sufficient margin?",
    options: [
      { id: 'A', label: 'The MOSFET is too physically large for the circuit board' },
      { id: 'B', label: 'Inductive kickback spikes can exceed twice the input voltage plus ringing' },
      { id: 'C', label: '48V systems require special low-voltage MOSFETs' },
      { id: 'D', label: 'The switching frequency will be too slow with this MOSFET' },
    ],
    correct: 'B',
    explanation: "In flyback converters, the MOSFET sees input voltage plus reflected output voltage plus leakage inductance spikes. A 48V input can easily create 120V+ spikes. Engineers select MOSFETs rated for 2-3x the expected peak.",
  },
  {
    scenario: "A switching power supply designer is working on a flyback converter for a phone charger using a transformer with 500uH inductance at 100kHz.",
    question: "How does the flyback converter use inductive kickback to transfer energy?",
    options: [
      { id: 'A', label: 'Energy is transferred continuously while the switch is closed' },
      { id: 'B', label: 'When the switch opens, collapsing magnetic field transfers energy to secondary winding' },
      { id: 'C', label: 'The transformer steps down AC voltage directly from the wall' },
      { id: 'D', label: 'Kickback is eliminated by the transformer for smooth DC output' },
    ],
    correct: 'B',
    explanation: "In a flyback converter, energy is stored in the transformer's magnetic field while the switch is closed. When opened, kickback causes the field to collapse, transferring stored energy to the secondary winding.",
  },
  {
    scenario: "A factory is experiencing mysterious electronic equipment failures. Investigation reveals large motors share power distribution with sensitive electronics. Failures occur when motors turn off.",
    question: "What electromagnetic phenomenon is most likely causing these failures?",
    options: [
      { id: 'A', label: 'Radio frequency interference from motor brushes' },
      { id: 'B', label: 'Ground loops between motor and control circuits' },
      { id: 'C', label: 'EMI from inductive kickback coupling into nearby circuits' },
      { id: 'D', label: 'Power supply voltage droop when motors start' },
    ],
    correct: 'C',
    explanation: "Inductive kickback generates high-frequency voltage spikes that radiate EMI and conduct through shared power lines. These transients can corrupt data, cause resets, or permanently damage sensitive electronics.",
  },
  {
    scenario: "An electric vehicle engineer is designing regenerative braking. When the driver releases the accelerator, the motor should slow the car while recovering energy to the battery.",
    question: "How can the motor's inductive properties be used to recover braking energy?",
    options: [
      { id: 'A', label: 'By disconnecting the motor and letting it spin freely as a generator' },
      { id: 'B', label: 'By using controlled switching to route back-EMF and inductive energy to battery' },
      { id: 'C', label: 'By adding extra batteries that only charge during braking' },
      { id: 'D', label: 'By converting kinetic energy directly to heat in motor windings' },
    ],
    correct: 'B',
    explanation: "During regenerative braking, power electronics actively control current flow using PWM switching, routing the motor's inductive kickback energy back to the battery. This can recover 60-70% of braking energy.",
  },
];

// ────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────────

export default function InductiveKickbackRenderer({
  phase: initialPhase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}: InductiveKickbackRendererProps) {
  // ──────────────────────────────────────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────────────────────────────────────

  const [phase, setPhase] = useState<Phase>(() => {
    if (initialPhase && PHASES.includes(initialPhase)) {
      return initialPhase;
    }
    return 'hook';
  });
  const { isMobile } = useViewport();
// Prediction states
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showPredictionFeedback, setShowPredictionFeedback] = useState(false);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [showTwistFeedback, setShowTwistFeedback] = useState(false);

  // Play phase: Relay simulator
  const [switchOn, setSwitchOn] = useState(true);
  const [hasFlybackDiode, setHasFlybackDiode] = useState(false);
  const [kickbackVoltage, setKickbackVoltage] = useState(0);
  const [showSpark, setShowSpark] = useState(false);
  const [experimentCount, setExperimentCount] = useState(0);
  const [inductance, setInductance] = useState(100);

  // Twist play phase: Boost converter
  const [boostDutyCycle, setBoostDutyCycle] = useState(40);
  const [inputVoltage, setInputVoltage] = useState(5);
  const [boostActive, setBoostActive] = useState(false);

  // Transfer phase
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Test phase
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Navigation refs
  const navigationLockRef = useRef(false);
  const lastClickRef = useRef(0);
  const animationRef = useRef<number>(0);

  // ──────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ──────────────────────────────────────────────────────────────────────────
// Kickback voltage decay animation
  useEffect(() => {
    if (kickbackVoltage > 0) {
      animationRef.current = requestAnimationFrame(() => {
        setKickbackVoltage(v => Math.max(0, v - 15));
      });
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [kickbackVoltage]);

  // ──────────────────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ──────────────────────────────────────────────────────────────────────────

  const hasExperimented = experimentCount >= 3;
  const hasExploredTwist = boostActive;
  const allAppsCompleted = completedApps.every(c => c);

  // Calculate boost converter output voltage: Vout = Vin / (1 - D)
  const boostOutputVoltage = inputVoltage / (1 - boostDutyCycle / 100);

  // ──────────────────────────────────────────────────────────────────────────
  // NAVIGATION
  // ──────────────────────────────────────────────────────────────────────────

  const goToPhase = useCallback((newPhase: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (navigationLockRef.current) return;
    lastClickRef.current = now;
    navigationLockRef.current = true;
    playSound('transition');
    setPhase(newPhase);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    setTimeout(() => {
      navigationLockRef.current = false;
    }, 200);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = PHASES.indexOf(phase);
    if (currentIndex < PHASES.length - 1) {
      goToPhase(PHASES[currentIndex + 1]);
      if (onPhaseComplete) onPhaseComplete();
    }
  }, [phase, goToPhase, onPhaseComplete]);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const handlePrediction = useCallback((choice: string) => {
    playSound('click');
    setPrediction(choice);
    setShowPredictionFeedback(true);
  }, []);

  const handleTwistPrediction = useCallback((choice: string) => {
    playSound('click');
    setTwistPrediction(choice);
    setShowTwistFeedback(true);
  }, []);

  const handleSwitchToggle = useCallback(() => {
    if (switchOn) {
      // Turning OFF - this is when kickback happens
      // Voltage spike scales with inductance: V = -L(di/dt)
      const baseVoltage = 350;
      const scaledVoltage = baseVoltage * (inductance / 100);
      if (!hasFlybackDiode) {
        setKickbackVoltage(scaledVoltage);
        setShowSpark(true);
        playSound('failure');
        setTimeout(() => setShowSpark(false), 300);
      } else {
        setKickbackVoltage(12);
        playSound('success');
      }
    } else {
      playSound('click');
    }
    setSwitchOn(prev => !prev);
    setExperimentCount(prev => prev + 1);
  }, [switchOn, hasFlybackDiode, inductance]);

  const handleToggleDiode = useCallback(() => {
    playSound('click');
    setHasFlybackDiode(prev => !prev);
  }, []);

  const handleBoostToggle = useCallback(() => {
    playSound('click');
    setBoostActive(prev => !prev);
  }, []);

  const handleCompleteApp = useCallback((index: number) => {
    playSound('success');
    setCompletedApps(prev => {
      const newCompleted = [...prev];
      newCompleted[index] = true;
      return newCompleted;
    });
  }, []);

  const handleTestAnswer = useCallback((answer: string) => {
    playSound('click');
    setTestAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentQuestion] = answer;
      return newAnswers;
    });
  }, [currentQuestion]);

  const handleSubmitTest = useCallback(() => {
    let score = 0;
    testAnswers.forEach((answer, index) => {
      if (answer === testQuestions[index].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    onGameEvent?.({ type: 'game_completed', details: { score: score, total: testQuestions.length } });
    if (score >= 7) {
      playSound('complete');
      if (onCorrectAnswer) onCorrectAnswer();
    } else {
      playSound('failure');
      if (onIncorrectAnswer) onIncorrectAnswer();
    }
  }, [testAnswers, onCorrectAnswer, onIncorrectAnswer]);

  // ──────────────────────────────────────────────────────────────────────────
  // PROGRESS BAR & NAV DOTS
  // ──────────────────────────────────────────────────────────────────────────

  const renderProgressBar = () => (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: '#1e293b',
        zIndex: 1001,
      }}
    >
      <div
        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
        style={{ width: `${((PHASES.indexOf(phase) + 1) / PHASES.length) * 100}%` }}
      />
    </div>
  );

  const renderNavDots = () => (
    <div className="flex justify-center gap-2 py-4">
      {PHASES.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{ cursor: 'pointer', background: 'none', border: 'none', padding: '4px' }}
          className={`h-2 rounded-full transition-all duration-300 ${
            phase === p
              ? 'bg-amber-400 w-6'
              : PHASES.indexOf(phase) > i
                ? 'bg-emerald-500 w-2'
                : 'bg-slate-600 w-2 hover:bg-slate-500'
          }`}
          aria-label={`Go to ${p} phase`}
        />
      ))}
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // RELAY CIRCUIT VISUALIZATION
  // ──────────────────────────────────────────────────────────────────────────

  const renderRelayCircuit = () => (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 mb-6">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">Relay Circuit Diagram</h3>
      <svg viewBox="0 0 400 240" className="w-full h-60" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Inductive Kickback visualization">
        <defs>
          <linearGradient id="batteryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4B5563" />
            <stop offset="100%" stopColor="#1F2937" />
          </linearGradient>
          <linearGradient id="coilGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id="activeWireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
          <filter id="glowEffect">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="sparkGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid layer */}
        <g id="grid-layer">
          {[...Array(10)].map((_, i) => (
            <line
              key={`h-${i}`}
              x1="10"
              y1={20 + i * 20}
              x2="390"
              y2={20 + i * 20}
              stroke="rgba(148,163,184,0.7)"
              strokeWidth="0.5"
              opacity="0.3"
              strokeDasharray="4 4"
            />
          ))}
          {[...Array(10)].map((_, i) => (
            <line
              key={`v-${i}`}
              x1={20 + i * 40}
              y1="20"
              x2={20 + i * 40}
              y2="200"
              stroke="rgba(148,163,184,0.7)"
              strokeWidth="0.5"
              opacity="0.3"
              strokeDasharray="4 4"
            />
          ))}
        </g>

        {/* Axis layer */}
        <g id="axis-layer">
          {/* Y-axis (Voltage) */}
          <line x1="10" y1="20" x2="10" y2="160" stroke="#64748b" strokeWidth="1" />
          <text x="6" y="24" textAnchor="end" fill="#94a3b8" fontSize="11">High V</text>
          <text x="6" y="90" textAnchor="end" fill="#94a3b8" fontSize="11">12V</text>
          <text x="6" y="160" textAnchor="end" fill="#94a3b8" fontSize="11">0V</text>
          <text x="6" y="192" textAnchor="end" fill="#94a3b8" fontSize="11" fontWeight="bold">Voltage</text>

          {/* X-axis (Circuit Flow) */}
          <line x1="10" y1="200" x2="390" y2="200" stroke="#64748b" strokeWidth="1" />
          <text x="60" y="216" textAnchor="middle" fill="#94a3b8" fontSize="11">Battery</text>
          <text x="150" y="216" textAnchor="middle" fill="#94a3b8" fontSize="11">Switch</text>
          <text x="260" y="216" textAnchor="middle" fill="#94a3b8" fontSize="11">Coil</text>
          <text x="340" y="216" textAnchor="middle" fill="#94a3b8" fontSize="11">Return</text>
          <text x="200" y="234" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">Circuit Path</text>
        </g>

        {/* Circuit components layer */}
        <g id="components-layer">

        {/* Battery */}
        <rect x="30" y="80" width="40" height="60" fill="url(#batteryGrad)" rx="4" />
        <text x="50" y="115" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
          12V
        </text>

        {/* Wire from battery - Green when ON (current flowing), Gray when OFF */}
        <path
          d="M 70 100 L 120 100"
          stroke={switchOn ? '#22C55E' : '#6B7280'}
          strokeWidth="4"
          fill="none"
          style={{ transition: 'stroke 0.3s ease' }}
        />

        {/* Switch */}
        <circle cx="140" cy="100" r="8" fill="#F3F4F6" stroke="#374151" strokeWidth="2" />
        <line
          x1="140"
          y1="100"
          x2={switchOn ? '170' : '160'}
          y2={switchOn ? '100' : '80'}
          stroke="#374151"
          strokeWidth="4"
          strokeLinecap="round"
          style={{ transition: 'all 0.3s ease' }}
        />
        <circle cx="170" cy="100" r="6" fill="#F3F4F6" stroke="#374151" strokeWidth="2" />

        {/* Spark effect */}
        {showSpark && (
          <>
            <circle cx="155" cy="90" r="15" fill="#FEF08A" opacity="0.8">
              <animate attributeName="r" values="5;20;5" dur="0.3s" />
              <animate attributeName="opacity" values="1;0;1" dur="0.3s" />
            </circle>
            <text x="155" y="65" textAnchor="middle" fill="#DC2626" fontSize="14" fontWeight="bold">
              SPARK!
            </text>
          </>
        )}

        {/* Wire to coil - Green when ON (current flowing), Gray when OFF */}
        <path
          d="M 180 100 L 220 100"
          stroke={switchOn ? '#22C55E' : '#6B7280'}
          strokeWidth="4"
          fill="none"
          style={{ transition: 'stroke 0.3s ease' }}
        />

        {/* Voltage waveform showing signal behavior - 10+ points spanning 25%+ height */}
        <path
          d={kickbackVoltage > 0
            ? `M 20 155 L 60 155 L 70 155 L 80 155 L 90 155 C 95 155 97 40 100 25 C 103 25 105 30 110 155 L 130 155 L 150 155 L 250 155 L 350 155 L 390 155`
            : `M 20 155 L 50 155 L 60 155 L 70 90 L 100 90 L 130 90 L 140 155 L 180 155 L 220 155 C 250 155 300 155 350 155 L 390 155`}
          fill="none"
          stroke={kickbackVoltage > 0 ? '#EF4444' : (switchOn ? '#22C55E' : '#6B7280')}
          strokeWidth="2"
          opacity={kickbackVoltage > 0 ? 0.9 : 0.5}
          filter={kickbackVoltage > 0 ? 'url(#glowEffect)' : undefined}
        />

        {/* Inductor coil - Blue represents inductance/magnetic field */}
        <rect x="220" y="70" width="80" height="60" fill="none" stroke="#6366F1" strokeWidth="3" rx="8" style={{ transition: 'stroke 0.3s ease' }} />
        <path
          d="M 228 100 C 233 60, 243 60, 248 100 C 253 140, 263 140, 268 100 C 273 60, 283 60, 288 100 C 290 120, 296 125, 298 100"
          fill="none"
          stroke="url(#coilGrad)"
          strokeWidth="3"
          style={{ transition: 'stroke 0.3s ease' }}
        />
        <text x="260" y="145" textAnchor="middle" fill="#a5b4fc" fontSize="11">
          RELAY COIL
        </text>
        <text x="260" y="158" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold">
          {inductance}mH
        </text>

        {/* Magnetic field indicator - Larger field = more stored energy */}
        {switchOn && (
          <>
            <ellipse cx="260" cy="100" rx={45 + inductance/10} ry={20 + inductance/20} fill="none" stroke="#A5B4FC" strokeWidth="1" strokeDasharray="4" opacity="0.6">
              <animate attributeName="rx" values={`${40 + inductance/10};${50 + inductance/10};${40 + inductance/10}`} dur="2s" repeatCount="indefinite" />
            </ellipse>
            <text x="260" y="55" textAnchor="middle" fill="#a5b4fc" fontSize="11">
              Magnetic Field
            </text>
          </>
        )}

        {/* Flyback diode (if enabled) - Green = protection/safety */}
        {hasFlybackDiode && (
          <>
            <polygon points="260,165 275,180 245,180" fill="#22C55E" />
            <line x1="245" y1="165" x2="275" y2="165" stroke="#22C55E" strokeWidth="3" />
            <text x="260" y="200" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="bold">
              FLYBACK DIODE
            </text>
            <line x1="225" y1="130" x2="225" y2="172" stroke="#22C55E" strokeWidth="2" style={{ transition: 'stroke 0.3s ease' }} />
            <line x1="225" y1="172" x2="245" y2="172" stroke="#22C55E" strokeWidth="2" style={{ transition: 'stroke 0.3s ease' }} />
            <line x1="275" y1="172" x2="295" y2="172" stroke="#22C55E" strokeWidth="2" style={{ transition: 'stroke 0.3s ease' }} />
            <line x1="295" y1="172" x2="295" y2="130" stroke="#22C55E" strokeWidth="2" style={{ transition: 'stroke 0.3s ease' }} />
          </>
        )}

        {/* Return wire - Green when ON, Gray when OFF - routes down to give vertical range */}
        <path
          d="M 300 100 L 340 100 L 340 195 L 50 195 L 50 140"
          stroke={switchOn ? '#22C55E' : '#6B7280'}
          strokeWidth="4"
          fill="none"
          style={{ transition: 'stroke 0.3s ease' }}
        />

        {/* Kickback voltage indicator - Red for dangerous high voltage, Green for safe clamped voltage */}
        {kickbackVoltage > 0 && (
          <g style={{ transition: 'opacity 0.3s ease' }}>
            <rect x="320" y="20" width="70" height="40" fill={kickbackVoltage > 50 ? '#FEE2E2' : '#D1FAE5'} rx="6" style={{ transition: 'fill 0.3s ease' }} />
            <text x="355" y="38" textAnchor="middle" fill={kickbackVoltage > 50 ? '#DC2626' : '#10B981'} fontSize="11">
              SPIKE
            </text>
            <text x="355" y="52" textAnchor="middle" fill={kickbackVoltage > 50 ? '#DC2626' : '#10B981'} fontSize="14" fontWeight="bold">
              {kickbackVoltage.toFixed(0)}V
            </text>
          </g>
        )}
        </g>
      </svg>
      <p className="text-xs text-slate-400 mt-2">
        <strong>Color coding:</strong> <span className="text-emerald-500">Green = current flow/protection</span>,
        <span className="text-blue-500"> Blue = inductance/field</span>,
        <span className="text-red-500"> Red = danger</span>
      </p>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // BOOST CONVERTER VISUALIZATION
  // ──────────────────────────────────────────────────────────────────────────

  const renderBoostConverter = () => (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 mb-6">
      <h3 className="text-sm font-semibold text-slate-300 mb-2">Boost Converter Circuit</h3>
      <svg viewBox="0 0 400 220" className="w-full h-56" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="boostBattGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4B5563" />
            <stop offset="100%" stopColor="#1F2937" />
          </linearGradient>
          <linearGradient id="boostOutputGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>
          <filter id="boostGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid layer */}
        <g id="boost-grid">
        {[...Array(9)].map((_, i) => (
          <line
            key={`h-${i}`}
            x1="10"
            y1={30 + i * 20}
            x2="390"
            y2={30 + i * 20}
            stroke="rgba(148,163,184,0.7)"
            strokeWidth="0.5"
            opacity="0.3"
            strokeDasharray="4 4"
          />
        ))}
        {[...Array(10)].map((_, i) => (
          <line
            key={`v-${i}`}
            x1={20 + i * 40}
            y1="30"
            x2={20 + i * 40}
            y2="180"
            stroke="rgba(148,163,184,0.7)"
            strokeWidth="0.5"
            opacity="0.3"
            strokeDasharray="4 4"
          />
        ))}

        {/* Y-axis (Voltage scale) */}
        <line x1="10" y1="30" x2="10" y2="140" stroke="#64748b" strokeWidth="1" />
        </g>

        {/* Axis layer */}
        <g id="boost-axis">
          <line x1="10" y1="30" x2="10" y2="170" stroke="#64748b" strokeWidth="1" />
          <text x="6" y="35" textAnchor="end" fill="#94a3b8" fontSize="11">{(boostOutputVoltage * 1.2).toFixed(0)}V</text>
          <text x="6" y="87" textAnchor="end" fill="#94a3b8" fontSize="11">{inputVoltage}V</text>
          <text x="6" y="135" textAnchor="end" fill="#94a3b8" fontSize="11">0V</text>
          <text x="6" y="165" textAnchor="end" fill="#94a3b8" fontSize="11" fontWeight="bold">V</text>

          {/* X-axis */}
          <line x1="10" y1="180" x2="390" y2="180" stroke="#64748b" strokeWidth="1" />
          <text x="45" y="195" textAnchor="middle" fill="#94a3b8" fontSize="11">In</text>
          <text x="110" y="195" textAnchor="middle" fill="#94a3b8" fontSize="11">L</text>
          <text x="165" y="195" textAnchor="middle" fill="#94a3b8" fontSize="11">SW</text>
          <text x="245" y="195" textAnchor="middle" fill="#94a3b8" fontSize="11">Filter</text>
          <text x="325" y="195" textAnchor="middle" fill="#94a3b8" fontSize="11">Out</text>
          <text x="200" y="215" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">Energy Flow Path</text>
        </g>

        {/* Component layer */}
        <g id="boost-components">
        {/* Input battery - Voltage based on slider */}
        <rect x="20" y="60" width="50" height="60" fill="url(#boostBattGrad)" rx="6" style={{ transition: 'all 0.3s ease' }} />
        <text x="45" y="95" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" style={{ transition: 'all 0.3s ease' }}>
          {inputVoltage}V
        </text>

        {/* Inductor - Blue = energy storage - spans 25%+ of SVG height */}
        <path
          d="M 78 90 C 83 50, 93 50, 98 90 C 103 130, 113 130, 118 90 C 123 50, 133 50, 138 90"
          fill="none"
          stroke="#6366F1"
          strokeWidth="4"
          style={{ transition: 'stroke 0.3s ease' }}
        />
        <text x="108" y="148" textAnchor="middle" fill="#a5b4fc" fontSize="11">
          Inductor
        </text>

        {/* Switch symbol - Green when active (switching), Gray when off */}
        <rect x="150" y="95" width="30" height="25" fill={boostActive ? '#22C55E' : '#9CA3AF'} rx="4" style={{ transition: 'fill 0.3s ease' }} />
        <text x="165" y="112" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
          {boostActive ? 'PWM' : 'OFF'}
        </text>
        {/* Duty cycle indicator - always visible to ensure both sliders affect visualization */}
        <text x="165" y="135" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold">
          D={boostDutyCycle}%
        </text>

        {/* Switching frequency indicator */}
        {boostActive && (
          <g style={{ transition: 'opacity 0.3s ease' }}>
            <rect x="145" y="65" width="40" height="22" fill="#1e3a5f" rx="4" />
            <text x="165" y="80" textAnchor="middle" fill="#60a5fa" fontSize="11">
              100kHz
            </text>
          </g>
        )}

        {/* Diode - Blue for rectification */}
        <polygon points="200,90 220,80 220,100" fill="#6366F1" style={{ transition: 'fill 0.3s ease' }} />
        <line x1="220" y1="80" x2="220" y2="100" stroke="#6366F1" strokeWidth="3" style={{ transition: 'stroke 0.3s ease' }} />

        {/* Capacitor - Gray for filtering */}
        <line x1="240" y1="75" x2="240" y2="105" stroke="#94a3b8" strokeWidth="3" />
        <line x1="250" y1="75" x2="250" y2="105" stroke="#94a3b8" strokeWidth="3" />

        {/* Output - Green when boosting */}
        <rect x="280" y="40" width="90" height="90"
          fill="#1f2937" rx="8"
          stroke={boostActive ? '#10B981' : '#475569'}
          strokeWidth="2"
          style={{ transition: 'stroke 0.3s ease' }}
        />
        <text x="325" y="65" textAnchor="middle" fill="#94a3b8" fontSize="11">
          OUTPUT
        </text>
        <text x="325" y="100" textAnchor="middle"
          fill={boostActive ? '#22c55e' : '#94a3b8'}
          fontSize="20" fontWeight="bold"
          style={{ transition: 'fill 0.3s ease' }}
          filter={boostActive ? 'url(#boostGlow)' : undefined}
        >
          {boostOutputVoltage.toFixed(1)}V
        </text>
        <text x="325" y="120" textAnchor="middle" fill="#64748b" fontSize="11">
          Vin={inputVoltage}V
        </text>

        {/* Energy flow arrow */}
        {boostActive && (
          <path
            d="M 100 50 L 130 50 L 125 45 M 130 50 L 125 55"
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
            style={{ transition: 'opacity 0.3s ease' }}
          >
            <animate attributeName="opacity" values="0.3;1;0.3" dur="0.5s" repeatCount="indefinite" />
          </path>
        )}

        {/* Formula display - Always show both slider values */}
        <text x="200" y="168" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold">
          {`Vout=${inputVoltage}V/(1-${(boostDutyCycle/100).toFixed(2)})=${boostOutputVoltage.toFixed(1)}V`}
        </text>
        </g>
      </svg>
      <p className="text-xs text-slate-400 mt-2">
        <strong>Color coding:</strong> <span className="text-emerald-500">Green = active/output</span>,
        <span className="text-blue-500"> Blue = energy storage</span>,
        <span className="text-gray-400"> Gray = inactive/filtering</span>
      </p>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ──────────────────────────────────────────────────────────────────────────

  const renderHook = () => (
    <div className="flex flex-col items-center justify-center min-h-[600px] px-6 py-12 text-center">
      {/* Premium badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-8">
        <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-amber-400 tracking-wide">PHYSICS EXPLORATION</span>
      </div>

      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-8 shadow-2xl shadow-amber-500/30">
        <span className="text-4xl">&#9889;</span>
      </div>

      {/* Main title */}
      <h1 style={{ fontSize: isMobile ? '28px' : '40px', fontWeight: 800, lineHeight: 1.2, marginBottom: '16px', background: 'linear-gradient(135deg, white, #fef3c7, #fed7aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', maxWidth: '600px' }}>
        The Mysterious Voltage Spike
      </h1>

      <p style={{ fontSize: isMobile ? '15px' : '17px', color: '#94a3b8', maxWidth: '440px', marginBottom: '40px', lineHeight: 1.6 }}>
        Discover how inductive kickback works! Ever unplugged something with a motor and seen a spark? Let&apos;s explore why
        some circuits need special protection diodes and how engineers harness this phenomenon.
      </p>

      {/* Premium card */}
      <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl shadow-black/20 mb-10">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 rounded-3xl" />
        <div className="relative flex items-start gap-4 text-left">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <span className="text-2xl">&#129522;</span>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">The Hidden Danger</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              When current through a coil suddenly stops, the collapsing magnetic
              field fights back with a massive voltage spike - often 10-100x the supply voltage!
            </p>
          </div>
        </div>
      </div>

      {/* Feature indicators */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { icon: '&#128268;', label: 'Relays' },
          { icon: '&#128663;', label: 'Ignition' },
          { icon: '&#128267;', label: 'Converters' },
        ].map((item, i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
            <div className="text-2xl mb-1" dangerouslySetInnerHTML={{ __html: item.icon }} />
            <div className="text-xs text-slate-400">{item.label}</div>
          </div>
        ))}
      </div>

      {/* CTA button */}
      <button
        onClick={() => { playSound('click'); nextPhase(); }}
        style={{ minHeight: '44px' }}
        className="group relative px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-lg font-semibold rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
      >
        <span className="relative z-10 flex items-center gap-3">
          Investigate the Spike
          <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" preserveAspectRatio="xMidYMid meet">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>

      {renderNavDots()}
    </div>
  );

  const renderPredict = () => (
    <div className="py-6 px-4" style={{ overflowY: 'auto' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <span className="text-xl">&#129300;</span>
        </div>
        <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white`}>Make Your Prediction</h2>
      </div>

      <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl p-5 mb-6">
        <p className="text-blue-200 leading-relaxed">
          A relay coil is powered by <strong className="text-blue-300">12V</strong>. When you flip the switch OFF,
          what happens to the voltage across the coil?
        </p>
      </div>

      {/* Static circuit preview SVG */}
      <div className="bg-slate-800/50 rounded-2xl p-4 mb-6" style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px' }}>
        <svg viewBox="0 0 400 150" className="w-full h-36" preserveAspectRatio="xMidYMid meet">
          {/* Battery */}
          <rect x="30" y="50" width="40" height="50" fill="#374151" rx="4" />
          <text x="50" y="80" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="bold">12V</text>

          {/* Wire from battery */}
          <path d="M 70 70 L 120 70" stroke="#6B7280" strokeWidth="3" fill="none" />

          {/* Switch (open) */}
          <circle cx="140" cy="70" r="6" fill="#F3F4F6" stroke="#374151" strokeWidth="2" />
          <line x1="140" y1="70" x2="160" y2="50" stroke="#374151" strokeWidth="3" strokeLinecap="round" />
          <circle cx="170" cy="70" r="5" fill="#F3F4F6" stroke="#374151" strokeWidth="2" />
          <text x="155" y="40" textAnchor="middle" fill="#e2e8f0" fontSize="11">OPEN</text>

          {/* Wire to coil */}
          <path d="M 180 70 L 220 70" stroke="#6B7280" strokeWidth="3" fill="none" />

          {/* Inductor coil */}
          <rect x="220" y="45" width="80" height="50" fill="none" stroke="#6366F1" strokeWidth="2" rx="6" />
          <path d="M 235 70 C 240 55, 250 55, 255 70 C 260 85, 270 85, 275 70 C 280 55, 290 55, 295 70" fill="none" stroke="#6366F1" strokeWidth="2" />
          <text x="260" y="110" textAnchor="middle" fill="#e2e8f0" fontSize="11">COIL</text>

          {/* Question mark */}
          <text x="340" y="75" textAnchor="middle" fill="#f59e0b" fontSize="28" fontWeight="bold">?</text>
          <text x="340" y="95" textAnchor="middle" fill="#e2e8f0" fontSize="11">Voltage</text>

          {/* Return wire */}
          <path d="M 300 70 L 330 70 L 330 120 L 50 120 L 50 100" stroke="#6B7280" strokeWidth="3" fill="none" />
        </svg>
      </div>

      <div className="space-y-3 mb-6" style={{ marginBottom: '24px' }}>
        {[
          { id: 'zero', label: 'Drops to 0V immediately', icon: '&#128201;' },
          { id: 'gradual', label: 'Gradually decreases from 12V to 0V', icon: '&#128202;' },
          { id: 'spike', label: 'Spikes to hundreds of volts briefly', icon: '&#9889;' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handlePrediction(option.id)}
            disabled={showPredictionFeedback}
            style={{ minHeight: '44px' }}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center gap-4 ${
              prediction === option.id
                ? option.id === 'spike'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-red-400 bg-red-500/10'
                : 'border-slate-700 hover:border-blue-500/50 hover:bg-blue-500/5'
            } ${showPredictionFeedback ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span className="text-2xl" dangerouslySetInnerHTML={{ __html: option.icon }} />
            <span className="font-medium" style={{ color: '#e2e8f0' }}>{option.label}</span>
          </button>
        ))}
      </div>

      {showPredictionFeedback && (
        <div className={`p-5 rounded-2xl mb-6 ${
          prediction === 'spike' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-amber-500/10 border border-amber-500/30'
        }`} style={{ borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
          <p className={`leading-relaxed ${prediction === 'spike' ? 'text-emerald-300' : 'text-amber-300'}`}>
            {prediction === 'spike' ? (
              <><strong>Exactly right!</strong> The collapsing magnetic field induces a huge voltage spike - often 10-100x the supply voltage. This is inductive kickback!</>
            ) : (
              <><strong>Surprising result:</strong> The voltage actually spikes to hundreds of volts! The inductor &quot;kicks back&quot; when current is interrupted suddenly.</>
            )}
          </p>
        </div>
      )}

      {showPredictionFeedback && (
        <button
          onClick={() => { playSound('success'); nextPhase(); }}
          style={{ minHeight: '44px' }}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-2xl shadow-lg shadow-amber-500/25 hover:shadow-xl transition-all duration-200"
        >
          See It Happen &#8594;
        </button>
      )}

      {renderNavDots()}
    </div>
  );

  const renderPlay = () => (
    <div className="py-6 px-4" style={{ overflowY: 'auto' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
          <span className="text-xl">&#128300;</span>
        </div>
        <div>
          <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white`}>Relay Circuit Simulator</h2>
          <p className="text-sm" style={{ color: '#e2e8f0' }}>Toggle switch and observe kickback</p>
        </div>
      </div>

      {/* Real-world relevance */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-4" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '16px', padding: '16px' }}>
        <p style={{ color: '#e2e8f0' }} className="text-sm leading-relaxed">
          <strong>Real-world relevance:</strong> This same phenomenon occurs in car ignition systems, industrial motors, and household appliances. Understanding kickback helps engineers design safer circuits.
        </p>
      </div>

      {/* Side-by-side layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        alignItems: isMobile ? 'center' : 'flex-start',
      }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          {renderRelayCircuit()}
        </div>
        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          {/* Inductance slider control */}
          <div className="mb-4 w-full" style={{ marginBottom: '16px', width: '100%' }}>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Inductance (L)</span>
              </div>
              <span className="text-sm font-bold text-amber-400">{inductance} mH</span>
            </div>
            <div className="flex items-center gap-2 w-full">
              <span className="text-xs text-slate-500">10</span>
              <input
                type="range"
                min="10"
                max="500"
                value={inductance}
                onChange={(e) => setInductance(parseInt(e.target.value))}
                style={{
                  accentColor: '#f59e0b',
                  touchAction: 'none',
                  width: '100%',
                  flex: 1,
                }}
                className="h-2 bg-slate-700 rounded-full appearance-none cursor-pointer transition-all duration-200"
                aria-label="Adjust inductance from 10 to 500 millihenries - controls energy stored in magnetic field"
              />
              <span className="text-xs text-slate-500">500 mH</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 mb-4" style={{ gap: '12px', marginBottom: '16px' }}>
            <button
              onClick={handleSwitchToggle}
              style={{ minHeight: '44px', cursor: 'pointer' }}
              className={`py-4 px-4 rounded-2xl font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                switchOn
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {switchOn ? '&#9889; Toggle OFF (Trigger Kickback)' : '&#9889; Toggle ON (Charge Coil)'}
            </button>
            <button
              onClick={handleToggleDiode}
              style={{ minHeight: '44px', cursor: 'pointer' }}
              className={`py-4 px-4 rounded-2xl font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                hasFlybackDiode
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border-2 border-amber-500/30 hover:bg-amber-500/30'
              }`}
            >
              {hasFlybackDiode ? '&#10003; Diode Added' : '+ Add Diode'}
            </button>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-4" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
            <p className="text-amber-300 text-sm leading-relaxed">
              <strong>Try this:</strong> Toggle the switch OFF without the diode to see the spark.
              Then add the diode and notice how it clamps the voltage spike!
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 mb-4" style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
        <h4 className="font-bold text-white mb-2">Understanding Inductance</h4>
        <p className="text-slate-300 text-sm leading-relaxed">
          <strong>Inductance (L)</strong> is the property of a coil that opposes changes in current. Higher inductance means more energy stored in the magnetic field, resulting in larger voltage spikes when current is interrupted suddenly. The equation V = -L(di/dt) shows that voltage spike magnitude depends on both inductance and how fast current changes.
        </p>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-6" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
        <h4 className="font-bold text-blue-200 mb-2">Cause and Effect</h4>
        <p className="text-blue-300 text-sm leading-relaxed">
          <strong>Increasing inductance:</strong> Creates stronger magnetic fields that store more energy, leading to higher kickback voltages when switched off.
          <strong>Adding the flyback diode:</strong> Provides a safe return path for current, preventing the voltage spike from damaging components.
        </p>
      </div>

      <button
        onClick={() => { playSound('success'); nextPhase(); }}
        disabled={!hasExperimented}
        style={{ minHeight: '44px' }}
        className={`w-full py-4 rounded-2xl font-semibold transition-all duration-200 ${
          hasExperimented
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
            : 'bg-slate-700 text-slate-400 cursor-not-allowed'
        }`}
      >
        {hasExperimented ? 'Continue to Review &#8594;' : `Toggle switch ${Math.max(0, 3 - experimentCount)} more times...`}
      </button>

      {renderNavDots()}
    </div>
  );

  const renderReview = () => (
    <div className="py-6 px-4" style={{ overflowY: 'auto' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <span className="text-xl">&#128214;</span>
        </div>
        <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white`}>Understanding Inductive Kickback</h2>
      </div>

      {/* Reference user's prediction */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 mb-6" style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
        <p style={{ color: '#e2e8f0' }} className="text-sm leading-relaxed">
          {prediction === 'spike' ? (
            <>Your prediction was correct! You anticipated that the voltage would spike when the switch opened.</>
          ) : prediction === 'gradual' ? (
            <>You predicted a gradual decrease, but the voltage actually spiked dramatically - this surprised many engineers when first discovered!</>
          ) : prediction === 'zero' ? (
            <>You predicted an immediate drop to zero, but the inductor resisted this change by creating a massive voltage spike.</>
          ) : (
            <>As you observed, the voltage spikes dramatically when the switch opens - this is inductive kickback in action.</>
          )}
        </p>
      </div>

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 mb-6 text-center text-white" style={{ borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <p className="text-indigo-200 text-sm mb-2">The Inductor Equation</p>
        <div className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold mb-2`}>V = -L x (di/dt)</div>
        <p className="text-indigo-200 text-sm">
          Induced voltage = Inductance x Rate of current change
        </p>
      </div>

      <div className="space-y-4 mb-6" style={{ marginBottom: '24px' }}>
        {[
          {
            icon: '&#129522;',
            title: 'Magnetic Field Energy',
            desc: 'Current through a coil creates a magnetic field that stores energy. This energy cannot disappear instantly!',
          },
          {
            icon: '&#9889;',
            title: 'Rapid Change = High Voltage',
            desc: 'When current is cut suddenly, di/dt is huge, producing a massive voltage spike in the opposite direction.',
          },
          {
            icon: '&#128737;',
            title: 'Flyback Diode Protection',
            desc: 'A diode across the coil provides a path for the current to continue flowing, safely clamping the voltage spike.',
          },
        ].map((item, i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4" style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px' }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl" dangerouslySetInnerHTML={{ __html: item.icon }} />
              <div>
                <h3 className="font-bold text-white mb-1">{item.title}</h3>
                <p style={{ color: '#e2e8f0' }} className="text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => { playSound('success'); nextPhase(); }}
        style={{ minHeight: '44px' }}
        className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-2xl shadow-lg shadow-amber-500/25 hover:shadow-xl transition-all duration-200"
      >
        Now for a Twist... &#8594;
      </button>

      {renderNavDots()}
    </div>
  );

  const renderTwistPredict = () => (
    <div className="py-6 px-4" style={{ overflowY: 'auto' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <span className="text-xl">&#128260;</span>
        </div>
        <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white`}>The Useful Side of Kickback</h2>
      </div>

      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-5 mb-6" style={{ borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
        <p className="text-purple-200 leading-relaxed">
          Inductive kickback seems destructive. But engineers have found ways to
          <strong className="text-purple-300"> harness it constructively</strong>. How might they use it?
        </p>
      </div>

      {/* Simple illustration SVG - spans full height for visual clarity */}
      <div className="bg-slate-800/50 rounded-2xl p-4 mb-6" style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
        <svg viewBox="0 0 400 200" className="w-full h-48" preserveAspectRatio="xMidYMid meet">
          {/* Title */}
          <text x="200" y="18" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">Inductive Kickback: Problem vs Solution</text>

          {/* Voltage arrow pointing up (kickback energy) */}
          <line x1="200" y1="40" x2="200" y2="160" stroke="#A855F7" strokeWidth="2" strokeDasharray="4 2" opacity="0.5" />
          <text x="200" y="190" textAnchor="middle" fill="#A855F7" fontSize="11">Energy Harnessing</text>

          {/* Destructive kickback side */}
          <rect x="10" y="35" width="170" height="110" fill="#374151" rx="8" />
          <text x="95" y="58" textAnchor="middle" fill="#DC2626" fontSize="13" fontWeight="bold">UNCONTROLLED</text>
          <text x="95" y="80" textAnchor="middle" fill="#FCA5A5" fontSize="12">Damages circuits</text>
          <text x="95" y="98" textAnchor="middle" fill="#FCA5A5" fontSize="12">Burns switch contacts</text>
          <text x="95" y="116" textAnchor="middle" fill="#FCA5A5" fontSize="12">Destroys transistors</text>
          <text x="95" y="136" textAnchor="middle" fill="#EF4444" fontSize="11">V = -L(di/dt)</text>

          {/* Constructive kickback side */}
          <rect x="220" y="35" width="170" height="110" fill="#374151" rx="8" />
          <text x="305" y="58" textAnchor="middle" fill="#22C55E" fontSize="13" fontWeight="bold">CONTROLLED</text>
          <text x="305" y="80" textAnchor="middle" fill="#86EFAC" fontSize="12">Ignition coils: 40kV</text>
          <text x="305" y="98" textAnchor="middle" fill="#86EFAC" fontSize="12">Boost converters</text>
          <text x="305" y="116" textAnchor="middle" fill="#86EFAC" fontSize="12">EV regeneration</text>
          <text x="305" y="136" textAnchor="middle" fill="#10B981" fontSize="11">95% efficiency</text>
        </svg>
      </div>

      <div className="space-y-3 mb-6" style={{ marginBottom: '24px' }}>
        {[
          { id: 'nothing', label: "It's only a problem to be prevented", icon: '&#128683;' },
          { id: 'spark', label: 'To create sparks in spark plugs', icon: '&#128293;' },
          { id: 'both', label: 'Both spark plugs AND voltage boosting circuits', icon: '&#9889;' },
        ].map(option => (
          <button
            key={option.id}
            onClick={() => handleTwistPrediction(option.id)}
            disabled={showTwistFeedback}
            style={{ minHeight: '44px' }}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center gap-4 ${
              twistPrediction === option.id
                ? option.id === 'both'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-amber-400 bg-amber-500/10'
                : 'border-slate-700 hover:border-purple-500/50 hover:bg-purple-500/5'
            } ${showTwistFeedback ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span className="text-2xl" dangerouslySetInnerHTML={{ __html: option.icon }} />
            <span className="font-medium" style={{ color: '#e2e8f0' }}>{option.label}</span>
          </button>
        ))}
      </div>

      {showTwistFeedback && (
        <div className={`p-5 rounded-2xl mb-6 ${
          twistPrediction === 'both' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-amber-500/10 border border-amber-500/30'
        }`} style={{ borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
          <p className={`leading-relaxed ${twistPrediction === 'both' ? 'text-emerald-300' : 'text-amber-300'}`}>
            {twistPrediction === 'both' ? (
              <><strong>Perfect!</strong> Ignition coils use it for spark plugs (40,000V from 12V!), and boost converters use controlled kickback to increase voltage efficiently.</>
            ) : (
              <><strong>There&apos;s more!</strong> Inductive kickback powers spark plugs (40,000V from 12V!) and boost converters that efficiently increase voltage.</>
            )}
          </p>
        </div>
      )}

      {showTwistFeedback && (
        <button
          onClick={() => { playSound('success'); nextPhase(); }}
          style={{ minHeight: '44px' }}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-2xl shadow-lg shadow-amber-500/25 hover:shadow-xl transition-all duration-200"
        >
          Explore Boost Converters &#8594;
        </button>
      )}

      {renderNavDots()}
    </div>
  );

  const renderTwistPlay = () => (
    <div className="py-6 px-4" style={{ overflowY: 'auto' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
          <span className="text-xl">&#128267;</span>
        </div>
        <div>
          <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white`}>Boost Converter Demo</h2>
          <p className="text-sm" style={{ color: '#e2e8f0' }}>See how kickback steps up voltage</p>
        </div>
      </div>

      {/* Side-by-side layout */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '12px' : '20px',
        width: '100%',
        alignItems: isMobile ? 'center' : 'flex-start',
      }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          {renderBoostConverter()}
        </div>
        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          {/* Input voltage slider */}
          <div className="mb-4 w-full" style={{ marginBottom: '16px', width: '100%' }}>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Input Voltage (Vin)</span>
              </div>
              <span className="text-sm font-bold text-amber-400">{inputVoltage} V</span>
            </div>
            <div className="flex items-center gap-2 w-full">
              <span className="text-xs text-slate-500">3</span>
              <input
                type="range"
                min="3"
                max="12"
                value={inputVoltage}
                onChange={(e) => setInputVoltage(parseInt(e.target.value))}
                style={{
                  accentColor: '#f59e0b',
                  touchAction: 'none',
                  width: '100%',
                  flex: 1,
                }}
                className="h-2 bg-slate-700 rounded-full appearance-none cursor-pointer transition-all duration-200"
                aria-label="Adjust input voltage from 3 to 12 volts"
              />
              <span className="text-xs text-slate-500">12 V</span>
            </div>
          </div>

          {/* Duty cycle slider */}
          <div className="mb-6 w-full" style={{ marginBottom: '24px', width: '100%' }}>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Duty Cycle (D)</span>
              </div>
              <span className="text-sm font-bold text-amber-400">{boostDutyCycle}%</span>
            </div>
            <div className="flex items-center gap-2 w-full">
              <span className="text-xs text-slate-500">10%</span>
              <input
                type="range"
                min="10"
                max="90"
                value={boostDutyCycle}
                onChange={(e) => setBoostDutyCycle(parseInt(e.target.value))}
                style={{
                  accentColor: '#f59e0b',
                  touchAction: 'none',
                  width: '100%',
                  flex: 1,
                }}
                className="h-2 bg-slate-700 rounded-full appearance-none cursor-pointer transition-all duration-200"
                aria-label="Adjust duty cycle from 10 to 90 percent"
              />
              <span className="text-xs text-slate-500">90%</span>
            </div>
          </div>

          <button
            onClick={handleBoostToggle}
            style={{ minHeight: '44px' }}
            className={`w-full py-4 rounded-2xl font-semibold mb-4 transition-all duration-200 ${
              boostActive
                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30'
                : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
            }`}
          >
            {boostActive ? '&#9889; Boost Active - Click to Stop' : '&#9654; Activate Boost Converter'}
          </button>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-6" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
            <p className="text-blue-300 text-sm leading-relaxed">
              <strong>How it works:</strong> A switch rapidly turns on/off (100kHz).
              Each time it opens, the inductor&apos;s kickback adds to the input voltage,
              charging a capacitor to a higher level!
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => { playSound('success'); nextPhase(); }}
        disabled={!hasExploredTwist}
        style={{ minHeight: '44px' }}
        className={`w-full py-4 rounded-2xl font-semibold transition-all duration-200 ${
          hasExploredTwist
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
            : 'bg-slate-700 text-slate-400 cursor-not-allowed'
        }`}
      >
        {hasExploredTwist ? 'Continue &#8594;' : 'Try the boost converter...'}
      </button>

      {renderNavDots()}
    </div>
  );

  const renderTwistReview = () => (
    <div className="py-6 px-4" style={{ overflowY: 'auto' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
          <span className="text-xl">&#128161;</span>
        </div>
        <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white`}>Harnessing the Kickback</h2>
      </div>

      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6 mb-6" style={{ borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <h3 className="font-bold text-white mb-4 text-center">Controlled Kickback Applications</h3>
        <div className="grid grid-cols-2 gap-4" style={{ gap: '16px' }}>
          <div className="text-center bg-slate-800/50 rounded-xl p-4" style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div className="text-3xl mb-2">&#128663;</div>
            <div className="text-sm font-medium" style={{ color: '#e2e8f0' }}>Ignition Coils</div>
            <div className="text-xs text-emerald-400 font-semibold">12V &#8594; 40,000V!</div>
          </div>
          <div className="text-center bg-slate-800/50 rounded-xl p-4" style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', padding: '16px' }}>
            <div className="text-3xl mb-2">&#128267;</div>
            <div className="text-sm font-medium" style={{ color: '#e2e8f0' }}>Boost Converters</div>
            <div className="text-xs text-emerald-400 font-semibold">Step up DC voltage</div>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6" style={{ marginBottom: '24px' }}>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4" style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px' }}>
          <h4 className="font-bold text-white mb-1">&#127919; Key Insight</h4>
          <p style={{ color: '#e2e8f0' }} className="text-sm leading-relaxed">
            The same physics that can destroy circuits is harnessed to generate high voltages and
            efficient power conversion - it&apos;s all about control!
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4" style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px' }}>
          <h4 className="font-bold text-white mb-1">&#128202; Switching Frequency</h4>
          <p style={{ color: '#e2e8f0' }} className="text-sm leading-relaxed">
            Boost converters switch at 10kHz-1MHz. Each cycle captures a bit of kickback energy,
            accumulating it in a capacitor.
          </p>
        </div>
      </div>

      <button
        onClick={() => { playSound('success'); nextPhase(); }}
        style={{ minHeight: '44px' }}
        className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-2xl shadow-lg shadow-amber-500/25 hover:shadow-xl transition-all duration-200"
      >
        See Real-World Applications &#8594;
      </button>

      {renderNavDots()}
    </div>
  );

  const renderTransfer = () => {
    const app = realWorldApps[selectedApp];

    return (
      <div className="py-6 px-4" style={{ overflowY: 'auto' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <span className="text-xl">&#127758;</span>
          </div>
          <div>
            <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white`}>Real-World Applications</h2>
            <p className="text-sm" style={{ color: '#e2e8f0' }}>Application {selectedApp + 1} of {realWorldApps.length}</p>
          </div>
        </div>

        {/* App selector tabs */}
        <div className="grid grid-cols-4 gap-2 mb-6" style={{ gap: '8px', marginBottom: '24px' }}>
          {realWorldApps.map((a, i) => (
            <button
              key={i}
              onClick={() => {
                playSound('click');
                setSelectedApp(i);
                if (!completedApps[i]) handleCompleteApp(i);
              }}
              style={{ minHeight: '44px', cursor: 'pointer' }}
              className={`p-3 rounded-xl text-center transition-all duration-200 relative hover:scale-[1.02] ${
                selectedApp === i
                  ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50'
                  : completedApps[i]
                    ? 'bg-emerald-500/10 border-2 border-emerald-500/30'
                    : 'bg-slate-800/50 border-2 border-slate-700/50 hover:border-slate-600'
              }`}
            >
              {completedApps[i] && (
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                  &#10003;
                </div>
              )}
              <div className="text-2xl mb-1">{a.icon}</div>
              <div className="text-xs" style={{ color: '#e2e8f0' }}>{a.title.split(' ')[0]}</div>
            </button>
          ))}
        </div>

        {/* Selected app details */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 mb-6" style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-4xl">{app.icon}</span>
            <div>
              <h3 className="font-bold text-white text-lg">{app.title}</h3>
              <p className="text-sm" style={{ color: app.color }}>{app.companies.join(' | ')}</p>
            </div>
          </div>

          <p style={{ color: '#e2e8f0' }} className="text-sm leading-relaxed mb-4">
            {app.description}
          </p>

          <div className="grid grid-cols-3 gap-3" style={{ gap: '12px' }}>
            {app.stats.map((stat, i) => (
              <div key={i} className="bg-slate-900/50 rounded-xl p-3 text-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '12px' }}>
                <div className="text-lg font-bold" style={{ color: app.color }}>{stat.value}</div>
                <div className="text-xs" style={{ color: '#e2e8f0' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Got It button for current application */}
        {!completedApps[selectedApp] && (
          <button
            onClick={() => handleCompleteApp(selectedApp)}
            style={{
              minHeight: '44px',
              marginBottom: '16px',
              width: '100%',
              padding: '16px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: 'white',
              fontWeight: 600,
              borderRadius: '16px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(16,185,129,0.25)',
              transition: 'all 0.2s ease',
            }}
          >
            Got It
          </button>
        )}

        {/* Progress */}
        <div className="bg-slate-800/50 rounded-2xl p-4 mb-6" style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>Progress</span>
            <span className="text-sm font-bold text-amber-400">{completedApps.filter(c => c).length}/4 Complete</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedApps.filter(c => c).length / 4) * 100}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => { playSound('success'); nextPhase(); }}
          disabled={!allAppsCompleted}
          style={{ minHeight: '44px' }}
          className={`w-full py-4 rounded-2xl font-semibold transition-all duration-200 ${
            allAppsCompleted
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
              : 'bg-slate-700 text-slate-400 cursor-not-allowed'
          }`}
        >
          {allAppsCompleted ? 'Take the Assessment &#8594;' : `Complete ${4 - completedApps.filter(c => c).length} more application${4 - completedApps.filter(c => c).length !== 1 ? 's' : ''}`}
        </button>

        {renderNavDots()}
      </div>
    );
  };

  const renderTest = () => {
    const answeredCount = testAnswers.filter(a => a !== null).length;
    const allAnswered = answeredCount === 10;
    const question = testQuestions[currentQuestion];

    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div className="py-6 px-4 text-center">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 ${
            passed
              ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-xl shadow-emerald-500/30'
              : 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-xl shadow-amber-500/30'
          }`}>
            <span className="text-5xl">{passed ? '&#9889;' : '&#128218;'}</span>
          </div>

          <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white mb-2`}>
            {testScore}/10 Correct
          </h3>
          <p className="text-slate-400 mb-8">
            {passed
              ? 'Excellent! You understand inductive kickback!'
              : 'Review the concepts and try again to improve your score.'}
          </p>

          {/* Show correct answers */}
          <div className="space-y-4 text-left mb-8">
            {testQuestions.map((q, i) => {
              const isCorrect = testAnswers[i] === q.correct;
              return (
                <div key={i} className={`p-4 rounded-xl border-2 ${isCorrect ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
                  <p className="text-slate-200 font-medium mb-2">{i + 1}. {q.question}</p>
                  <p className={`text-sm ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isCorrect ? '&#10003; Correct' : `&#10007; Correct answer: ${q.correct}`}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">{q.explanation}</p>
                </div>
              );
            })}
          </div>

          {passed ? (
            <button
              onClick={() => { playSound('complete'); nextPhase(); }}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-500/25"
            >
              Complete Lesson &#8594;
            </button>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => {
                  setTestSubmitted(false);
                  setTestAnswers(Array(10).fill(null));
                  setCurrentQuestion(0);
                }}
                className="w-full py-4 bg-slate-700 text-slate-200 font-semibold rounded-2xl"
              >
                Try Again
              </button>
              <button
                onClick={() => { playSound('transition'); nextPhase(); }}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-2xl"
              >
                Continue Anyway &#8594;
              </button>
            </div>
          )}

          {renderNavDots()}
        </div>
      );
    }

    return (
      <div className="py-6 px-4" style={{ overflowY: 'auto' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <span className="text-xl">&#128221;</span>
          </div>
          <div>
            <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white`}>Knowledge Assessment</h2>
            <p className="text-sm" style={{ color: '#e2e8f0' }}>Question {currentQuestion + 1} of {testQuestions.length}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-slate-800/50 rounded-2xl p-4 mb-6" style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>Question {currentQuestion + 1} of {testQuestions.length}</span>
            <span className="text-sm font-bold text-violet-400">{answeredCount}/{testQuestions.length} answered</span>
          </div>
          <div className="flex gap-1">
            {testQuestions.map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-all ${
                  i === currentQuestion
                    ? 'bg-violet-500'
                    : testAnswers[i]
                      ? 'bg-emerald-500'
                      : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Scenario */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 mb-4" style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
          <p className="text-sm mb-2" style={{ color: '#e2e8f0' }}>Scenario:</p>
          <p style={{ color: '#e2e8f0' }} className="text-sm leading-relaxed">{question.scenario}</p>
        </div>

        {/* Question */}
        <h3 className="font-bold text-white mb-4" style={{ marginBottom: '16px' }}>{question.question}</h3>

        {/* Options */}
        <div className="space-y-3 mb-6" style={{ marginBottom: '24px' }}>
          {question.options.map(opt => (
            <button
              key={opt.id}
              onClick={() => handleTestAnswer(opt.id)}
              style={{
                minHeight: '44px',
                border: testAnswers[currentQuestion] === opt.id ? '2px solid #8b5cf6' : '1px solid rgba(71, 85, 105, 0.5)',
                transform: testAnswers[currentQuestion] === opt.id ? 'scale(1.02)' : 'scale(1)',
                cursor: 'pointer',
              }}
              className={`w-full p-4 rounded-xl text-left transition-all duration-200 flex items-center gap-3 hover:scale-[1.01] ${
                testAnswers[currentQuestion] === opt.id
                  ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                  : 'bg-slate-800/50 text-slate-300 hover:border-violet-500/50'
              }`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                testAnswers[currentQuestion] === opt.id
                  ? 'bg-white/20'
                  : 'bg-slate-700'
              }`}>
                {opt.id}
              </span>
              <span className="text-sm">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3" style={{ gap: '12px' }}>
          {currentQuestion > 0 && (
            <button
              onClick={() => setCurrentQuestion(currentQuestion - 1)}
              style={{ minHeight: '44px' }}
              className="flex-1 py-4 bg-slate-700 text-slate-200 font-semibold rounded-2xl"
            >
              &#8592; Previous
            </button>
          )}
          {currentQuestion < 9 ? (
            <button
              onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
              disabled={!testAnswers[currentQuestion]}
              style={{ minHeight: '44px' }}
              className={`flex-1 py-4 rounded-2xl font-semibold transition-all ${
                testAnswers[currentQuestion]
                  ? 'bg-violet-500 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              Next &#8594;
            </button>
          ) : (
            <button
              onClick={handleSubmitTest}
              disabled={!allAnswered}
              style={{ minHeight: '44px' }}
              className={`flex-1 py-4 rounded-2xl font-semibold transition-all ${
                allAnswered
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              Submit Test
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  };

  const renderMastery = () => (
    <div className="py-8 px-4 text-center">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-xl shadow-amber-500/30 mb-6 animate-pulse">
          <span className="text-5xl">&#127942;</span>
        </div>
      </div>

      <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white mb-4 tracking-tight`}>
        Inductive Kickback Master!
      </h1>

      <p className={`${isMobile ? 'text-base' : 'text-lg'} text-slate-400 mb-8 max-w-md mx-auto`}>
        You now understand one of the most important phenomena in power electronics and circuit protection.
      </p>

      <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6 mb-8 text-left">
        <h3 className="font-bold text-white mb-4 text-center">Key Takeaways</h3>
        <ul className="space-y-3 text-slate-300">
          {[
            'V = -L(di/dt): Rapid current change creates voltage spikes',
            'Flyback diodes protect circuits from destructive spikes',
            'Ignition coils use kickback for 40,000V spark generation',
            'Boost converters harness controlled kickback for voltage step-up',
            'Understanding kickback is essential for working with inductive loads',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm">&#10003;</span>
              <span className="text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {testScore > 0 && (
        <div className="bg-slate-800/50 rounded-2xl p-4 mb-8">
          <p className="text-slate-400">
            Assessment Score: <strong className="text-amber-400">{testScore}/10</strong>
          </p>
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={() => goToPhase('hook')}
          className="w-full py-4 bg-slate-700 text-slate-200 font-semibold rounded-2xl hover:bg-slate-600 transition-all"
        >
          Review Again
        </button>
        <button
          onClick={() => { onGameEvent?.({ type: 'mastery_achieved', details: { score: testQuestions.filter((q, i) => testAnswers[i] === q.correct).length, total: testQuestions.length } }); window.location.href = '/games'; }}
          style={{ width: '100%', minHeight: '52px', padding: '14px 24px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '16px', color: '#f8fafc', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Complete Game →
        </button>
      </div>

      {renderNavDots()}
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ──────────────────────────────────────────────────────────────────────────

  const renderContent = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return (
          <TransferPhaseView
          conceptName="Inductive Kickback"
          applications={realWorldApps}
          onComplete={() => goToPhase('test')}
          isMobile={isMobile}
          playSound={playSound}
          />
        );
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return null;
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(180deg, #0a0f1a 0%, #0a1628 50%, #0a0f1a 100%)',
      color: 'white',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, SF Pro, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {renderProgressBar()}

      {/* Premium background gradients */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(10,22,40,0.9) 50%, rgba(15,23,42,0.9) 100%)', boxShadow: 'inset 0 0 100px rgba(245,158,11,0.03)' }} />
      <div style={{ position: 'absolute', top: 0, left: '25%', width: '384px', height: '384px', background: 'rgba(245,158,11,0.05)', borderRadius: '50%', filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', bottom: 0, right: '25%', width: '384px', height: '384px', background: 'rgba(249,115,22,0.05)', borderRadius: '50%', filter: 'blur(60px)' }} />

      {/* Header */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: 'rgba(10, 15, 26, 0.95)',
          backdropFilter: 'blur(8px)',
        }}
        aria-label="Game navigation"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', maxWidth: '672px', margin: '0 auto', minHeight: '44px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.05em' }}>Inductive Kickback</span>
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#f59e0b', textTransform: 'capitalize' }}>
            {phase.replace('_', ' ')}
          </span>
        </div>
      </nav>

      {/* Main content */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', paddingTop: '60px', paddingBottom: '16px', overflowY: 'auto', maxHeight: '100dvh', flex: 1, lineHeight: '1.6', fontSize: '16px' }}>
        <div style={{ maxWidth: '672px', margin: '0 auto', width: '100%', overflowY: 'auto', maxWidth: '768px' }}>
          {renderContent()}
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      {phase !== 'mastery' && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(10, 15, 26, 0.95)',
            borderTop: '1px solid rgba(71, 85, 105, 0.3)',
          }}
        >
          <div style={{ maxWidth: '672px', margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', minHeight: '60px' }}>
            <button
              onClick={() => {
                const currentIndex = PHASES.indexOf(phase);
                if (currentIndex > 0) {
                  goToPhase(PHASES[currentIndex - 1]);
                }
              }}
              disabled={PHASES.indexOf(phase) === 0}
              style={{
                minHeight: '44px',
                padding: '12px 24px',
                borderRadius: '12px',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                cursor: PHASES.indexOf(phase) === 0 ? 'not-allowed' : 'pointer',
                background: PHASES.indexOf(phase) === 0 ? '#1e293b' : '#334155',
                color: PHASES.indexOf(phase) === 0 ? '#475569' : 'white',
                border: 'none',
              }}
            >
              ← Back
            </button>
            <button
              onClick={nextPhase}
              disabled={
                (phase === 'play' && !hasExperimented) ||
                (phase === 'twist_play' && !hasExploredTwist) ||
                (phase === 'transfer' && !allAppsCompleted) ||
                (phase === 'predict' && !showPredictionFeedback) ||
                (phase === 'twist_predict' && !showTwistFeedback)
              }
              style={{
                minHeight: '44px',
                padding: '12px 24px',
                borderRadius: '12px',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease-out',
                background: (
                  (phase === 'play' && !hasExperimented) ||
                  (phase === 'twist_play' && !hasExploredTwist) ||
                  (phase === 'transfer' && !allAppsCompleted) ||
                  (phase === 'predict' && !showPredictionFeedback) ||
                  (phase === 'twist_predict' && !showTwistFeedback)
                ) ? '#334155' : 'linear-gradient(135deg, #f59e0b, #ea580c)',
                color: (
                  (phase === 'play' && !hasExperimented) ||
                  (phase === 'twist_play' && !hasExploredTwist) ||
                  (phase === 'transfer' && !allAppsCompleted) ||
                  (phase === 'predict' && !showPredictionFeedback) ||
                  (phase === 'twist_predict' && !showTwistFeedback)
                ) ? '#64748b' : 'white',
                boxShadow: (
                  (phase === 'play' && !hasExperimented) ||
                  (phase === 'twist_play' && !hasExploredTwist) ||
                  (phase === 'transfer' && !allAppsCompleted) ||
                  (phase === 'predict' && !showPredictionFeedback) ||
                  (phase === 'twist_predict' && !showTwistFeedback)
                ) ? 'none' : '0 4px 15px rgba(245,158,11,0.3)',
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
