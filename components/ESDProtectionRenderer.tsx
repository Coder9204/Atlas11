'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// ─────────────────────────────────────────────────────────────────────────────
// ESD Protection - Complete 10-Phase Game
// Teaching electrostatic discharge protection in electronic circuits
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

interface ESDProtectionRendererProps {
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
    scenario: "A technician touches a USB port on a laptop after walking across a carpeted floor on a dry winter day. The laptop continues working normally despite the audible 'snap' of static discharge.",
    question: "What protected the laptop's USB controller from the thousands of volts discharged?",
    options: [
      { id: 'a', label: "The plastic USB connector housing acted as an insulator" },
      { id: 'b', label: "On-chip ESD protection diodes clamped the voltage and diverted current to ground", correct: true },
      { id: 'c', label: "The voltage was too brief to cause any real damage" },
      { id: 'd', label: "Modern chips are naturally immune to static electricity" }
    ],
    explanation: "Every I/O pin on modern ICs has built-in ESD protection structures, typically dual diodes that clamp voltage to within safe limits. When voltage exceeds Vdd or drops below ground, these diodes conduct, routing the dangerous current safely through the power rails rather than through sensitive transistor gates."
  },
  {
    scenario: "An engineer measures a 15,000V static discharge from touching a device, but the chip's datasheet rates it for only 2,000V HBM ESD protection.",
    question: "Why might the chip still survive this event?",
    options: [
      { id: 'a', label: "Datasheets always understate true protection levels" },
      { id: 'b', label: "External TVS diodes and board-level protection absorbed most of the energy before it reached the chip", correct: true },
      { id: 'c', label: "15,000V discharges don't actually carry enough current to cause damage" },
      { id: 'd', label: "The measurement equipment was probably wrong" }
    ],
    explanation: "Real-world ESD protection uses multiple defense layers. External TVS (Transient Voltage Suppressor) diodes at the board edge clamp the initial surge, ferrite beads add impedance to slow the rise time, and series resistors limit peak current. By the time the pulse reaches the IC, it's significantly attenuated. The chip's internal protection handles any remaining energy."
  },
  {
    scenario: "A semiconductor company is designing a chip for 10 Gbps data transmission. Their ESD engineer warns that the traditional protection approach will 'kill signal integrity.'",
    question: "What specific problem does ESD protection cause for high-speed signals?",
    options: [
      { id: 'a', label: "ESD protection generates electromagnetic interference" },
      { id: 'b', label: "Protection diodes add parasitic capacitance that distorts fast signal edges", correct: true },
      { id: 'c', label: "High-speed signals are blocked by ESD diodes" },
      { id: 'd', label: "Protection circuits consume too much power at high frequencies" }
    ],
    explanation: "ESD protection diodes are essentially PN junctions with inherent capacitance. At 10 Gbps, bit periods are only 100 picoseconds, and even 0.5pF of capacitance significantly rounds signal edges and creates inter-symbol interference. Engineers must balance protection robustness against capacitance, often using smaller diodes with lower capacitance and accepting reduced ESD ratings for high-speed pins."
  },
  {
    scenario: "A failure analysis reveals that a chip died from ESD damage to its gate oxide layer, even though it had ESD protection diodes that tested functional after the event.",
    question: "How can ESD damage occur despite working protection circuits?",
    options: [
      { id: 'a', label: "The protection activated too slowly, allowing the voltage spike to reach internal circuits first", correct: true },
      { id: 'b', label: "Gate oxide is outside the protection zone" },
      { id: 'c', label: "ESD protection only works for positive voltages" },
      { id: 'd', label: "The diodes were placed on the wrong chip layer" }
    ],
    explanation: "ESD events have rise times under 1 nanosecond. If the protection device has too much inductance from poor layout or long metal routing, the voltage at the protected circuit can overshoot the clamping voltage before protection fully activates. This 'turn-on time' issue is critical for protecting ultra-thin gate oxides that can break down in picoseconds at high voltages."
  },
  {
    scenario: "An automotive ECU must survive 15kV ESD per ISO 10605 standards, but the MCU inside is only rated for 4kV HBM.",
    question: "How do automotive designers bridge this 11kV gap?",
    options: [
      { id: 'a', label: "They use thicker PCB substrates to absorb the energy" },
      { id: 'b', label: "Multi-stage external protection with TVS arrays, spark gaps, and filtering absorbs most energy before it reaches the IC", correct: true },
      { id: 'c', label: "They request custom automotive-grade chips rated for 15kV" },
      { id: 'd', label: "Automotive standards are just guidelines, not requirements" }
    ],
    explanation: "Automotive ESD protection is a system design problem. Engineers place high-power TVS diodes rated for 15kV+ at connector pins, add common-mode chokes and ferrite beads to slow pulse rise times, use spark gaps for extreme voltages, and include series resistance to limit current. Each stage absorbs energy and slows the pulse, reducing what the IC must handle to within its ratings."
  },
  {
    scenario: "During wafer testing, 3% of chips fail ESD qualification even though they come from the same manufacturing lot as passing chips.",
    question: "What most likely causes this ESD performance variation?",
    options: [
      { id: 'a', label: "Random cosmic ray damage during testing" },
      { id: 'b', label: "Process variations affecting protection structure dimensions, doping levels, and contact resistance", correct: true },
      { id: 'c', label: "Operator error in the test setup" },
      { id: 'd', label: "Temperature variations in the test environment" }
    ],
    explanation: "ESD protection relies on precise semiconductor structures. Variations in dopant diffusion depth affect diode breakdown voltage. Silicide sheet resistance changes impact current-carrying capability. Metal line width variations alter thermal dissipation. Even a 5% variation in protection device size can mean the difference between 2kV and 4kV ESD withstand capability."
  },
  {
    scenario: "A chip designer proposes using larger ESD protection structures to improve robustness from 2kV to 8kV HBM. The design manager rejects this immediately.",
    question: "Why would larger, more robust ESD protection be rejected?",
    options: [
      { id: 'a', label: "Larger structures are more expensive to manufacture" },
      { id: 'b', label: "Larger structures increase die area, add parasitic capacitance, and may not fit within the I/O pitch requirements", correct: true },
      { id: 'c', label: "ESD testing equipment can't measure above 4kV" },
      { id: 'd', label: "Customers don't need more than 2kV protection" }
    ],
    explanation: "Die area directly impacts chip cost. In advanced nodes, every square micrometer costs money. I/O pitch is fixed by package requirements, limiting how much space is available for protection. Higher capacitance degrades signal integrity on fast interfaces. Doubling ESD protection often requires 4x the area (protecting against I^2*t energy), which simply may not be affordable or physically possible."
  },
  {
    scenario: "A new engineer asks why ESD testing uses strange models like 'Human Body Model' (HBM) with 100pF and 1.5k ohms, rather than just testing with actual static discharge.",
    question: "Why do ESD standards use these specific circuit models?",
    options: [
      { id: 'a', label: "Human bodies vary too much, so a standard model ensures repeatable testing" },
      { id: 'b', label: "The models simulate different real-world discharge sources with standardized, repeatable pulse characteristics", correct: true },
      { id: 'c', label: "Real static discharges are too dangerous for lab testing" },
      { id: 'd', label: "These values were chosen arbitrarily by standards committees" }
    ],
    explanation: "HBM (100pF, 1.5k ohms) models a charged person touching a grounded device. CDM (Charged Device Model) simulates a charged IC discharging through one pin. MM (Machine Model, 200pF, 0 ohms) represents a charged metal tool. Each has different energy, rise time, and current profiles. Standardized models allow comparing chips from different vendors under identical, repeatable test conditions."
  },
  {
    scenario: "A company's reliability data shows that 0.1% of their products fail in the field from ESD, despite all chips passing 2kV HBM qualification testing.",
    question: "What explains failures in the field when chips passed lab testing?",
    options: [
      { id: 'a', label: "Lab tests are performed at lower temperatures than field conditions" },
      { id: 'b', label: "Real-world ESD events may differ from test models, and field conditions include repeated stress, humidity effects, and higher voltages than rated", correct: true },
      { id: 'c', label: "Customers are intentionally damaging products" },
      { id: 'd', label: "Shipping damages the ESD protection structures" }
    ],
    explanation: "Lab testing uses single pulses under controlled conditions. Field environments include multiple ESD events over time (cumulative degradation), humidity-temperature cycling that stresses oxide layers, contact discharges (more severe than air discharge), and voltages often exceeding test levels. The 2kV spec represents a minimum survival threshold, not a guarantee against all real-world scenarios."
  },
  {
    scenario: "A chip has ESD protection that triggers at 5.5V, but its power supply (Vdd) is 3.3V and the I/O signals swing from 0 to 3.3V during normal operation.",
    question: "Why is the trigger voltage set higher than the operating voltage?",
    options: [
      { id: 'a', label: "To save power by keeping protection circuits off during normal operation" },
      { id: 'b', label: "The protection must not interfere with normal I/O signals while still clamping dangerous ESD voltages", correct: true },
      { id: 'c', label: "Lower trigger voltages would damage the protection circuits" },
      { id: 'd', label: "This allows the chip to be used with 5V systems" }
    ],
    explanation: "The protection window must be carefully designed. Trigger voltage must exceed maximum normal operating voltage (including Vdd tolerance, overshoot, and noise margin) to avoid false triggering during operation. But it must be low enough to clamp ESD before voltage exceeds the gate oxide breakdown threshold (often 6-8V for modern processes). This leaves only a narrow design window for protection activation."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '\u{1F4F1}',
    title: 'Consumer Electronics & Smartphones',
    short: 'Every touchscreen tap matters',
    tagline: 'Protecting billions of devices from human static discharge',
    description: 'Your smartphone contains dozens of chips, each with hundreds of I/O pins, all protected by ESD structures. Every time you touch the screen, plug in a charger, or insert headphones, static discharge threatens the internal electronics. Modern phones must survive 8kV+ contact discharge and 15kV+ air discharge per IEC 61000-4-2 standards, yet remain thin, fast, and power-efficient.',
    connection: 'The ESD protection principles we explored directly apply to every chip in your phone. The touch controller has protection on all 200+ sensor lines. The USB-C port uses high-speed TVS diodes that add less than 0.5pF capacitance while surviving 15kV surges. The power management IC protects against discharge during battery connection.',
    howItWorks: 'Smartphone protection is a layered defense. At the connector level, specialized TVS arrays handle the initial surge. The PCB includes designed impedance discontinuities that reflect high-frequency energy. EMI filters add series impedance. Finally, on-chip ESD structures clamp any remaining energy. For high-speed interfaces like USB 3.2 or Thunderbolt, designers use silicon-controlled rectifiers (SCRs) that provide high protection with minimal capacitance.',
    stats: [
      { value: '8kV+', label: 'Contact ESD Rating', icon: '\u26A1' },
      { value: '<0.5pF', label: 'Protection Capacitance', icon: '\u{1F4C9}' },
      { value: '1.5B+', label: 'Smartphones/Year Protected', icon: '\u{1F4F1}' }
    ],
    examples: [
      'iPhone Lightning/USB-C port protection using multi-stage TVS arrays',
      'Samsung Galaxy touchscreen ESD-hardened sensor interfaces',
      'Apple AirPods charging case contact protection',
      'Tablet stylus charging port ESD immunity'
    ],
    companies: ['Apple', 'Samsung', 'Qualcomm', 'NXP', 'Littelfuse'],
    futureImpact: 'As phones adopt faster USB4 (40 Gbps) and wireless charging above 50W, ESD protection must handle higher power levels with even lower capacitance. 3D packaging with stacked chips creates new challenges as ESD must be routed through multiple die layers. Foldable phones introduce mechanical stress that can degrade protection structures over time.',
    color: '#3B82F6'
  },
  {
    icon: '\u{1F3ED}',
    title: 'Semiconductor Manufacturing',
    short: 'Where chips are most vulnerable',
    tagline: 'Protecting $100M wafers from invisible threats',
    description: 'During semiconductor manufacturing, chips have no protection. Gate oxides just a few atoms thick are directly exposed. A single ESD event can destroy thousands of chips on a wafer worth over $100 million at advanced nodes. Fab workers can generate 35,000V walking across floors. Manufacturing tools with moving parts create triboelectric charging. Even the process gases can carry charge.',
    connection: 'Before the ESD protection structures we studied are built, chips are defenseless. Everything we learned about how ESD damages gate oxides and junctions applies with maximum severity here. Fabs implement the most extreme ESD control measures on Earth to prevent the damage that on-chip protection would normally prevent.',
    howItWorks: 'Semiconductor fabs use comprehensive ESD control programs. All personnel wear conductive garments with woven carbon fibers connected to grounded wrist straps. Flooring is ESD-dissipative (10^6 to 10^9 ohms/square). Workstations have ionizing bars that neutralize charges on ungrounded items. Process tools include charge neutralization in every chamber. FOUPs (wafer carriers) are made from static-dissipative polymers. Real-time monitoring systems track charge levels across the fab.',
    stats: [
      { value: '<100V', label: 'Allowed Charge Level', icon: '\u26A1' },
      { value: '35,000V', label: 'Possible Human Charge', icon: '\u{1F9CD}' },
      { value: '$5B+', label: 'Annual ESD Damage Cost', icon: '\u{1F4B0}' }
    ],
    examples: [
      'TSMC 3nm fab with 100,000+ ionizers monitoring charge in real-time',
      'Intel photolithography tools with in-situ charge neutralization',
      'Samsung DRAM lines with automated wafer handling to minimize human contact',
      'ASML EUV scanners with charged particle elimination systems'
    ],
    companies: ['TSMC', 'Samsung Foundry', 'Intel', 'ASML', 'Applied Materials'],
    futureImpact: 'At 2nm nodes and beyond, gate oxides are only 3-5 atoms thick, making them vulnerable to voltages as low as 2-3V. Future fabs will use AI-based charge prediction, automated handling robots for zero human contact, and novel charge-dissipating materials. Process steps themselves may need to include charge neutralization as an inherent part of the chemistry.',
    color: '#6366F1'
  },
  {
    icon: '\u{1F697}',
    title: 'Automotive Electronics',
    short: 'Safety-critical reliability',
    tagline: 'When a chip failure can mean a crash',
    description: 'Modern vehicles contain over 100 electronic control units (ECUs) managing everything from engine timing to autonomous driving sensors. These systems face extreme ESD challenges: dry air charging from HVAC, static from fabric seats, discharge through door handles, and lightning-induced surges through the antenna. ISO 10605 requires survival of 15kV+ discharge because failure modes must never affect vehicle safety.',
    connection: 'Automotive ESD builds on all the concepts we explored but at extreme levels. The protection voltage windows, response times, and multi-stage approaches we discussed are pushed to their limits. Automotive qualification requires not just survival but guaranteed continued operation after repeated ESD stress.',
    howItWorks: 'Automotive ESD protection is system-level engineering. Entry points like OBD-II ports use massive TVS diodes rated for \u00B130kV with 5kA surge current. Door handle sensors have spark gaps that arc over at extreme voltages. CAN bus and LIN transceivers include specialized clamping matched to protocol voltages. ADAS sensors (cameras, radar, LiDAR) use shielded housings with internal TVS protection. All protection must function from -40C to +150C.',
    stats: [
      { value: '15kV+', label: 'ISO 10605 Requirement', icon: '\u26A1' },
      { value: '-40 to 150C', label: 'Operating Range', icon: '\u{1F321}\uFE0F' },
      { value: '15+ yrs', label: 'Required Lifetime', icon: '\u{1F4C5}' }
    ],
    examples: [
      'Tesla Model 3 touchscreen surviving Nevada desert static conditions',
      'BMW iDrive controller with conductive surface grounding',
      'Bosch ESP system with redundant ESD protection for brake-by-wire safety',
      'NVIDIA DRIVE platform with reinforced protection for autonomous computing'
    ],
    companies: ['Bosch', 'NXP', 'Infineon', 'Texas Instruments', 'ON Semiconductor'],
    futureImpact: 'Electric vehicles present new ESD challenges with 800V battery systems and DC fast charging. V2X (vehicle-to-everything) communication adds more exposed RF interfaces. Level 4/5 autonomy requires ESD immunity for hundreds of sensors with zero tolerance for corruption. Future protection must handle EMI from high-power motors while maintaining sub-nanosecond response.',
    color: '#10B981'
  },
  {
    icon: '\u2708\uFE0F',
    title: 'Aerospace & Defense',
    short: 'The ultimate ESD environment',
    tagline: 'When lightning strikes at 40,000 feet',
    description: 'Aircraft electronics face the most extreme ESD environment imaginable. Lightning strikes deliver 200,000 amps in microseconds. Cosmic rays at altitude cause single-event upsets. P-static from ice and precipitation charges the airframe to 100,000V+. Composite fuselages don\'t conduct charge like aluminum, requiring dedicated charge paths. Every avionics system must survive direct lightning attachment while maintaining safety-critical operation.',
    connection: 'Aerospace ESD protection scales up everything we learned by 1000x. The same clamping principles apply, but with massive TVS arrays, spark gaps, and shielded enclosures. The physics of voltage clamping and current routing we explored becomes a matter of life and death at these power levels.',
    howItWorks: 'Aircraft lightning protection uses zoning. Zone 1 areas (nose cone, wing tips, tail) receive direct strikes and use thick aluminum or copper mesh embedded in composites. Zone 2 areas get swept strokes and need continuous conductive paths. Zone 3 areas are shielded enclosures. Avionics boxes have multi-stage protection: external spark gaps fire first at 500V+, primary TVS arrays clamp to tens of volts, and internal protection handles residual. All power and signal lines use filtered circular connectors with integrated TVS.',
    stats: [
      { value: '200kA', label: 'Lightning Peak Current', icon: '\u26A1' },
      { value: 'DO-160G', label: 'Test Standard', icon: '\u{1F4CB}' },
      { value: '10\u207B\u2079', label: 'Failure Rate Requirement', icon: '\u{1F3AF}' }
    ],
    examples: [
      'Boeing 787 composite fuselage with copper mesh lightning strike zones',
      'F-35 avionics with radiation-hardened processors and lightning protection',
      'SpaceX Dragon spacecraft ESD-safe assembly and launch protection',
      'GPS satellite ESD protection for 15+ year mission life in radiation environment'
    ],
    companies: ['Boeing', 'Airbus', 'Lockheed Martin', 'Collins Aerospace', 'Honeywell'],
    futureImpact: 'More-electric and all-electric aircraft with high-voltage systems (800V+) create new lightning attachment risks. Composite structures continue to challenge traditional protection approaches. Urban air mobility (flying taxis) will need certified lightning protection with lower weight budget. Space-based systems face increasingly harsh radiation environments that degrade protection over time.',
    color: '#F59E0B'
  }
];

// Slider style constant
const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '20px',
  touchAction: 'pan-y',
  WebkitAppearance: 'none',
  accentColor: '#3b82f6',
  cursor: 'pointer',
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const ESDProtectionRenderer: React.FC<ESDProtectionRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [esdVoltage, setEsdVoltage] = useState(4000); // Volts
  const [hasProtection, setHasProtection] = useState(true);
  const [isDischarging, setIsDischarging] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [chipDamage, setChipDamage] = useState(0);
  const [dischargeCount, setDischargeCount] = useState(0);

  // Twist phase state
  const [responseTime, setResponseTime] = useState(0.5); // nanoseconds
  const [signalFrequency, setSignalFrequency] = useState(1); // GHz
  const [protectionCapacitance, setProtectionCapacitance] = useState(1); // pF

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

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#F59E0B', // Amber for ESD/lightning theme
    accentGlow: 'rgba(245, 158, 11, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    spark: '#FBBF24',
    diode: '#22C55E',
    circuit: '#3B82F6',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0',
    textMuted: 'rgba(148,163,184,0.7)',
    border: '#2a2a3a',
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
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore',
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
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

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

  // Trigger ESD discharge
  const triggerDischarge = useCallback(() => {
    if (isDischarging) return;
    setIsDischarging(true);
    setDischargeCount(c => c + 1);

    // Calculate damage
    setTimeout(() => {
      if (!hasProtection) {
        // Direct hit causes massive damage
        const damage = Math.min((esdVoltage / 200), 40);
        setChipDamage(prev => Math.min(prev + damage, 100));
      } else {
        // Protection clamps voltage, minimal damage (slight wear)
        setChipDamage(prev => Math.min(prev + 0.5, 100));
      }
      setTimeout(() => {
        setIsDischarging(false);
      }, 400);
    }, 400);
  }, [isDischarging, hasProtection, esdVoltage]);

  // Calculate metrics for twist phase
  const calculateSignalIntegrity = useCallback(() => {
    // Higher capacitance = more signal degradation at high frequencies
    const signalLoss = (protectionCapacitance * signalFrequency) / 10; // 0-100%
    const eyeOpening = Math.max(0, 100 - signalLoss * 20);

    // Faster response time = better protection
    const protectionEffective = responseTime < 1; // Must be under 1ns

    // Trade-off calculation
    const robustness = protectionCapacitance * 20; // Larger cap = more robust

    return {
      signalLoss: Math.min(signalLoss * 10, 100),
      eyeOpening,
      protectionEffective,
      robustness: Math.min(robustness, 100),
      trade_off_score: (eyeOpening * robustness) / 100
    };
  }, [protectionCapacitance, signalFrequency, responseTime]);

  const metrics = calculateSignalIntegrity();

  // Clamping voltage when protection is active
  const clampVoltage = hasProtection ? 5.5 : esdVoltage;
  const clampEfficiency = hasProtection ? ((esdVoltage - 5.5) / esdVoltage * 100).toFixed(0) : '0';

  // ESD Visualization render function
  const renderESDVisualization = ({ showTiming = false }: { showTiming?: boolean }) => {
    const width = 500;
    const height = 350;

    // Animation for discharge
    const sparkOpacity = isDischarging ? (1 - (animationFrame % 16) / 16) : 0;
    const flowOffset = (animationFrame * 3) % 40;

    return (
      <svg width={isMobile ? 340 : 500} height={isMobile ? 280 : 350} viewBox={`0 0 ${width} ${height}`} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          {/* Spark gradient */}
          <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>

          {/* Human skin gradient */}
          <radialGradient id="humanGrad" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fdba74" />
            <stop offset="60%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </radialGradient>

          {/* Diode gradient */}
          <linearGradient id="diodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>

          {/* Circuit trace gradient */}
          <linearGradient id="circuitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>

          {/* Chip gradient */}
          <linearGradient id="chipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3730a3" stopOpacity="0.4" />
          </linearGradient>

          {/* Damage gradient */}
          <radialGradient id="damageGrad" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.3" />
          </radialGradient>

          {/* Glow filters */}
          <filter id="sparkGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="diodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background grid lines */}
        {[70, 140, 210, 280].map(y => (
          <line key={`gh-${y}`} x1="0" y1={y} x2="500" y2={y} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
        ))}
        {[100, 200, 300, 400].map(x => (
          <line key={`gv-${x}`} x1={x} y1="0" x2={x} y2="350" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
        ))}

        {/* Title */}
        <text x="250" y="15" fill={colors.textSecondary} fontSize="14" textAnchor="middle" fontWeight="600">
          ESD Protection Circuit
        </text>

        {/* Axis labels */}
        <text x="250" y="345" fill={colors.textMuted} fontSize="12" textAnchor="middle">
          Voltage Path (I/O Pin to Internal Circuit)
        </text>
        <text x="15" y="175" fill={colors.textMuted} fontSize="12" textAnchor="middle" transform="rotate(-90, 15, 175)">
          Current Flow
        </text>

        {/* Human finger */}
        <g transform="translate(40, 80)">
          <ellipse cx="30" cy="45" rx="25" ry="45" fill="url(#humanGrad)" />
          <ellipse cx="25" cy="35" rx="10" ry="20" fill="#fdba74" opacity="0.4" />
          <text x="30" y="110" fill={colors.textMuted} fontSize="12" textAnchor="middle">Human</text>
          <text x="30" y="125" fill={colors.spark} fontSize="11" textAnchor="middle">{esdVoltage}V</text>
        </g>

        {/* Lightning bolt - ESD discharge */}
        {isDischarging && (
          <g filter="url(#sparkGlow)">
            <path
              d={`M 95 125 L 115 115 L 105 125 L 135 110 L 120 125 L 155 105 L 140 120 L ${hasProtection ? '175 135' : '220 160'}`}
              fill="none"
              stroke="url(#sparkGrad)"
              strokeWidth={4 + sparkOpacity * 4}
              opacity={sparkOpacity}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Spark particles */}
            {[0, 1, 2, 3, 4].map(i => (
              <circle
                key={i}
                cx={100 + i * 20 + Math.sin(animationFrame + i) * 5}
                cy={120 + Math.cos(animationFrame + i) * 8}
                r={2 + Math.random()}
                fill="#fef08a"
                opacity={sparkOpacity * 0.7}
              />
            ))}
          </g>
        )}

        {/* I/O Pin */}
        <g>
          <rect x="160" y="125" width="60" height="16" rx="3" fill="url(#circuitGrad)" />
          <text x="190" y="158" fill={colors.textMuted} fontSize="11" textAnchor="middle">I/O Pin</text>
        </g>

        {/* Interactive current point - position reflects voltage level */}
        <circle
          cx={hasProtection ? 190 : (270 + (esdVoltage - 1000) / 14000 * 80)}
          cy={hasProtection ? (133 - (esdVoltage - 1000) / 14000 * 40) : (155 - (esdVoltage - 1000) / 14000 * 30)}
          r={8}
          fill={hasProtection ? colors.diode : colors.error}
          filter="url(#glow)"
          stroke="#fff"
          strokeWidth={2}
        />

        {/* ESD Protection diodes (when enabled) */}
        {hasProtection && (
          <g>
            {/* VDD Rail */}
            <line x1="160" y1="70" x2="280" y2="70" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
            <text x="290" y="74" fill="#ef4444" fontSize="11">VDD</text>

            {/* Upper diode to VDD */}
            <g filter={isDischarging ? "url(#diodeGlow)" : undefined}>
              <polygon points="190,120 210,90 170,90" fill="url(#diodeGrad)" />
              <rect x="168" y="87" width="44" height="5" rx="1" fill="url(#diodeGrad)" />
              <line x1="190" y1="87" x2="190" y2="70" stroke="url(#diodeGrad)" strokeWidth="3" />

              {/* Current flow animation when discharging */}
              {isDischarging && (
                <g>
                  {[0, 1, 2].map(i => {
                    const progress = ((flowOffset + i * 13) % 40) / 40;
                    return (
                      <circle
                        key={`up-${i}`}
                        cx={190}
                        cy={120 - progress * 50}
                        r={3}
                        fill="#fef08a"
                        opacity={0.8}
                      />
                    );
                  })}
                </g>
              )}
            </g>

            {/* Lower diode to GND */}
            <g filter={isDischarging ? "url(#diodeGlow)" : undefined}>
              <polygon points="190,148 170,178 210,178" fill="url(#diodeGrad)" />
              <rect x="168" y="176" width="44" height="5" rx="1" fill="url(#diodeGrad)" />
              <line x1="190" y1="181" x2="190" y2="200" stroke="url(#diodeGrad)" strokeWidth="3" />

              {/* Current flow animation when discharging */}
              {isDischarging && (
                <g>
                  {[0, 1, 2].map(i => {
                    const progress = ((flowOffset + i * 13) % 40) / 40;
                    return (
                      <circle
                        key={`down-${i}`}
                        cx={190}
                        cy={148 + progress * 52}
                        r={3}
                        fill="#fef08a"
                        opacity={0.8}
                      />
                    );
                  })}
                </g>
              )}
            </g>

            {/* GND Rail */}
            <line x1="160" y1="200" x2="280" y2="200" stroke="#6b7280" strokeWidth="3" strokeLinecap="round" />
            <text x="290" y="204" fill="#6b7280" fontSize="11">GND</text>

            {/* Ground symbol */}
            <g transform="translate(190, 210)">
              <line x1="-12" y1="0" x2="12" y2="0" stroke="#6b7280" strokeWidth="2" />
              <line x1="-8" y1="5" x2="8" y2="5" stroke="#6b7280" strokeWidth="2" />
              <line x1="-4" y1="10" x2="4" y2="10" stroke="#6b7280" strokeWidth="2" />
            </g>

            {/* Clamping indicator */}
            {isDischarging && (
              <g>
                <rect x="120" y="100" width="50" height="24" rx="4" fill={colors.bgSecondary} stroke={colors.diode} strokeWidth="1" />
                <text x="145" y="116" fill={colors.diode} fontSize="11" textAnchor="middle" fontWeight="600">
                  {clampVoltage}V
                </text>
              </g>
            )}
          </g>
        )}

        {/* Wire to chip */}
        <line x1="220" y1="133" x2="270" y2="150" stroke="url(#circuitGrad)" strokeWidth="2" />

        {/* Internal chip */}
        <g>
          <rect x="270" y="100" width="140" height="110" rx="8" fill="url(#chipGrad)" stroke="#6366f1" strokeWidth="2" />

          {/* Chip internal pattern */}
          <g opacity="0.3">
            <rect x="280" y="110" width="35" height="25" rx="2" fill="#6366f1" />
            <rect x="320" y="110" width="40" height="25" rx="2" fill="#6366f1" />
            <rect x="365" y="110" width="35" height="25" rx="2" fill="#6366f1" />
            <rect x="280" y="140" width="55" height="20" rx="2" fill="#6366f1" />
            <rect x="340" y="140" width="60" height="20" rx="2" fill="#6366f1" />
            <rect x="280" y="165" width="120" height="35" rx="2" fill="#6366f1" />
          </g>

          {/* Chip pins */}
          {[110, 130, 150, 170, 190].map(y => (
            <rect key={`left-${y}`} x="262" y={y} width="12" height="6" rx="1" fill="url(#circuitGrad)" />
          ))}
          {[110, 130, 150, 170, 190].map(y => (
            <rect key={`right-${y}`} x="406" y={y} width="12" height="6" rx="1" fill="url(#circuitGrad)" />
          ))}

          {/* Chip label */}
          <text x="340" y="230" fill={colors.textMuted} fontSize="12" textAnchor="middle">Internal Circuitry</text>

          {/* Damage overlay */}
          {chipDamage > 0 && (
            <g>
              <rect
                x="270"
                y="100"
                width="140"
                height="110"
                rx="8"
                fill="url(#damageGrad)"
                opacity={chipDamage / 150}
              />
              {chipDamage > 50 && (
                <g stroke="#ef4444" strokeWidth="2" opacity="0.7">
                  <path d="M 285 105 L 305 130 L 290 150 L 310 180" fill="none" />
                  <path d="M 390 105 L 370 135 L 385 160 L 365 195" fill="none" />
                </g>
              )}
            </g>
          )}

          {/* Direct ESD hit animation (no protection) */}
          {isDischarging && !hasProtection && (
            <g filter="url(#sparkGlow)">
              <ellipse
                cx="290"
                cy="155"
                rx={15 + (animationFrame % 8) * 2}
                ry={10 + (animationFrame % 8)}
                fill="url(#sparkGrad)"
                opacity={sparkOpacity * 0.8}
              />
              {/* Damage sparks */}
              {[0, 1, 2, 3, 4, 5].map(i => {
                const angle = (i / 6) * Math.PI * 2;
                const dist = 15 + (animationFrame % 8) * 2;
                return (
                  <circle
                    key={i}
                    cx={290 + Math.cos(angle) * dist}
                    cy={155 + Math.sin(angle) * dist * 0.6}
                    r={2}
                    fill="#ef4444"
                    opacity={sparkOpacity * 0.6}
                  />
                );
              })}
            </g>
          )}
        </g>

        {/* Timing info for twist phase */}
        {showTiming && (
          <g>
            <rect x="20" y="260" width="200" height="70" rx="8" fill={colors.bgSecondary} stroke={colors.border} />
            <text x="30" y="282" fill={colors.textMuted} fontSize="11">Response Time:</text>
            <text x="160" y="282" fill={responseTime < 1 ? colors.success : colors.error} fontSize="11" fontWeight="600">
              {responseTime}ns
            </text>
            <text x="30" y="302" fill={colors.textMuted} fontSize="11">ESD Rise Time:</text>
            <text x="160" y="302" fill={colors.spark} fontSize="11" fontWeight="600">0.7ns</text>
            <text x="30" y="322" fill={colors.textMuted} fontSize="11">Status:</text>
            <text x="160" y="322" fill={responseTime < 1 ? colors.success : colors.error} fontSize="11" fontWeight="600">
              {responseTime < 1 ? 'PROTECTED' : 'TOO SLOW'}
            </text>
          </g>
        )}

        {/* Status indicators */}
        <g transform={`translate(${showTiming ? 280 : 20}, 260)`}>
          <rect x="0" y="0" width={showTiming ? 200 : 460} height="70" rx="8" fill={colors.bgSecondary} stroke={colors.border} />

          {!showTiming && (
            <>
              <text x="15" y="22" fill={colors.textMuted} fontSize="11">Protection:</text>
              <text x="100" y="22" fill={hasProtection ? colors.success : colors.error} fontSize="12" fontWeight="700">
                {hasProtection ? 'ENABLED' : 'DISABLED'}
              </text>

              <text x="15" y="42" fill={colors.textMuted} fontSize="11">Clamped To:</text>
              <text x="100" y="42" fill={colors.diode} fontSize="12" fontWeight="700">
                {hasProtection ? `${clampVoltage}V (${clampEfficiency}% blocked)` : `${esdVoltage}V (0% blocked)`}
              </text>

              <text x="15" y="62" fill={colors.textMuted} fontSize="11">Chip Damage:</text>
              <text x="100" y="62" fill={chipDamage > 50 ? colors.error : chipDamage > 20 ? colors.warning : colors.success} fontSize="12" fontWeight="700">
                {chipDamage.toFixed(0)}%
              </text>

              {/* Chip health bar */}
              <rect x="250" y="20" width="180" height="12" rx="6" fill="#1f2937" />
              <rect
                x="250"
                y="20"
                width={(180 * (100 - chipDamage)) / 100}
                height="12"
                rx="6"
                fill={chipDamage > 50 ? colors.error : chipDamage > 20 ? colors.warning : colors.success}
              />
              <text x="340" y="31" fill="white" fontSize="11" textAnchor="middle" fontWeight="600">
                {(100 - chipDamage).toFixed(0)}% Health
              </text>

              <text x="250" y="55" fill={colors.textMuted} fontSize="11">Discharges: {dischargeCount}</text>
            </>
          )}

          {showTiming && (
            <>
              <text x="15" y="22" fill={colors.textMuted} fontSize="11">Capacitance:</text>
              <text x="120" y="22" fill={colors.accent} fontSize="12" fontWeight="700">{protectionCapacitance}pF</text>

              <text x="15" y="42" fill={colors.textMuted} fontSize="11">Signal Loss:</text>
              <text x="120" y="42" fill={metrics.signalLoss > 30 ? colors.error : colors.success} fontSize="12" fontWeight="700">
                {metrics.signalLoss.toFixed(0)}%
              </text>

              <text x="15" y="62" fill={colors.textMuted} fontSize="11">Robustness:</text>
              <text x="120" y="62" fill={metrics.robustness > 60 ? colors.success : colors.warning} fontSize="12" fontWeight="700">
                {metrics.robustness.toFixed(0)}%
              </text>
            </>
          )}
        </g>
      </svg>
    );
  };

  // Navigation bar render function
  const renderNavBar = () => (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: colors.bgSecondary,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>{'\u26A1'}</span>
        <span style={{ color: colors.textPrimary, fontWeight: 600 }}>ESD Protection</span>
      </div>
      <div style={{ color: colors.textSecondary, fontSize: '14px' }}>
        {phaseLabels[phase]} ({phaseOrder.indexOf(phase) + 1}/{phaseOrder.length})
      </div>
    </nav>
  );

  // Progress bar render function
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: '56px',
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

  // Navigation dots render function
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
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Bottom navigation bar render function
  const renderBottomNav = () => {
    const currentIndex = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: colors.bgSecondary,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderTop: `1px solid ${colors.border}`,
      }}>
        <button
          onClick={prevPhase}
          disabled={currentIndex <= 0}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: currentIndex > 0 ? colors.textSecondary : colors.border,
            cursor: currentIndex > 0 ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            minHeight: '44px',
          }}
        >
          {'\u2190'} Back
        </button>
        <span style={{ color: colors.textMuted, fontSize: '13px' }}>
          {phaseOrder.indexOf(phase) + 1} / {phaseOrder.length}
        </span>
        <button
          onClick={nextPhase}
          disabled={currentIndex >= phaseOrder.length - 1}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: currentIndex < phaseOrder.length - 1 ? `linear-gradient(135deg, ${colors.accent}, #D97706)` : colors.border,
            color: 'white',
            cursor: currentIndex < phaseOrder.length - 1 ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            minHeight: '44px',
          }}
        >
          Next {'\u2192'}
        </button>
      </div>
    );
  };

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #D97706)`,
    color: 'white',
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

  // Layout wrapper
  const renderLayout = (children: React.ReactNode) => (
    <div style={{
      minHeight: '100dvh',
      background: colors.bgPrimary,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {renderNavBar()}
      {renderProgressBar()}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '68px',
        paddingBottom: '16px',
        padding: '68px 24px 100px 24px',
      }}>
        {children}
        {renderNavDots()}
      </div>
      {renderBottomNav()}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return renderLayout(
      <div style={{
        maxWidth: '700px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          <span style={{ filter: 'drop-shadow(0 0 10px #fbbf24)' }}>{'\u26A1'}</span>
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          How Does Your Phone Survive Your Touch?
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
          margin: '0 auto 32px',
        }}>
          Walking across carpet can charge your body to <span style={{ color: colors.spark }}>15,000 volts</span>.
          Yet every time you touch your phone, tablet, or laptop, the electronics inside survive.
          How do tiny circuits withstand lightning-bolt voltages from your fingertips?
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          margin: '0 auto 32px',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ ...typo.h2, color: colors.spark }}>15,000V</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Human static</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ ...typo.h2, color: colors.diode }}>5V</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Chip survives</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ ...typo.h2, color: colors.circuit }}>0.7ns</div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Time to clamp</div>
            </div>
          </div>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
            The secret lies in invisible protection circuits built into every chip,
            standing guard at every I/O pin, ready to absorb thousands of volts in nanoseconds.
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Discover ESD Protection {'\u2192'}
        </button>
      </div>
    );
  }

  // Static SVG for predict phase (render function, not component)
  const renderPredictPhaseSVG = () => (
    <svg width={isMobile ? 320 : 400} height={200} viewBox="0 0 400 200" style={{ background: colors.bgCard, borderRadius: '12px' }}>
      <defs>
        <linearGradient id="humanGradStatic" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fdba74" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id="chipGradStatic" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#3730a3" />
        </linearGradient>
      </defs>
      {/* Human finger */}
      <ellipse cx="80" cy="100" rx="35" ry="55" fill="url(#humanGradStatic)" />
      <text x="80" y="170" fill={colors.textMuted} fontSize="12" textAnchor="middle">Human</text>
      <text x="80" y="185" fill={colors.spark} fontSize="12" textAnchor="middle">+4000V</text>
      {/* Arrow */}
      <path d="M 130 100 L 180 100 M 170 90 L 180 100 L 170 110" stroke={colors.spark} strokeWidth="3" fill="none" />
      <text x="155" y="85" fill={colors.spark} fontSize="12" textAnchor="middle">ESD</text>
      {/* Chip */}
      <rect x="200" y="60" width="160" height="80" rx="8" fill="url(#chipGradStatic)" opacity="0.6" />
      <rect x="200" y="60" width="160" height="80" rx="8" fill="none" stroke="#6366f1" strokeWidth="2" />
      <text x="280" y="105" fill={colors.textPrimary} fontSize="14" textAnchor="middle">IC Chip</text>
      <text x="280" y="125" fill={colors.textMuted} fontSize="12" textAnchor="middle">Max: 3.3V</text>
      {/* Question mark */}
      <text x="280" y="30" fill={colors.accent} fontSize="24" textAnchor="middle" fontWeight="bold">?</text>
    </svg>
  );

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Nothing happens - modern chips are naturally immune to static electricity' },
      { id: 'b', text: 'Special protection circuits instantly clamp the voltage and route current safely to ground' },
      { id: 'c', text: 'The voltage is too brief to cause damage, so it passes harmlessly through' },
    ];

    return renderLayout(
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{
          background: `${colors.accent}22`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          border: `1px solid ${colors.accent}44`,
        }}>
          <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
            Make Your Prediction
          </p>
        </div>

        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
          When you touch a chip's I/O pin with 4,000+ volts of static charge built up on your body, what happens to the chip?
        </h2>

        {/* Static SVG illustration */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          {renderPredictPhaseSVG()}
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '16px' }}>
            That's 1,200x more voltage than the chip is designed to handle!
          </p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => { playSound('click'); setPrediction(opt.id); }}
              style={{
                background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                borderRadius: '12px',
                padding: '16px 20px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s',
                minHeight: '44px',
              }}
            >
              <span style={{
                display: 'inline-block',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                color: prediction === opt.id ? 'white' : colors.textSecondary,
                textAlign: 'center',
                lineHeight: '28px',
                marginRight: '12px',
                fontWeight: 700,
              }}>
                {opt.id.toUpperCase()}
              </span>
              <span style={{ color: colors.textPrimary, ...typo.body }}>
                {opt.text}
              </span>
            </button>
          ))}
        </div>

        {prediction && (
          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={primaryButtonStyle}
          >
            Test My Prediction {'\u2192'}
          </button>
        )}
      </div>
    );
  }

  // PLAY PHASE - Interactive ESD Lab
  if (phase === 'play') {
    return renderLayout(
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
          ESD Discharge Lab
        </h2>
        <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
          This visualization shows how ESD protection circuits save chips. Watch how the diodes clamp dangerous voltage when you increase the ESD voltage.
        </p>
        <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
          When you increase the voltage, the protection circuit clamps it to safe levels. As voltage increases, more current is diverted because the diodes activate faster.
        </p>
        <p style={{ ...typo.small, color: colors.textSecondary, textAlign: 'center', marginBottom: '8px' }}>
          Clamping voltage is defined as the maximum voltage that appears across the protected circuit. The relationship between input voltage and clamped output is calculated using the formula below.
        </p>
        <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px', fontStyle: 'italic' }}>
          Real-world relevance: This same protection saves your phone, laptop, and car electronics every time you touch them after walking on carpet. This technology is used in every modern electronic device.
        </p>

        {/* Formula */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          textAlign: 'center',
          border: `1px solid ${colors.border}`,
        }}>
          <code style={{ fontSize: '16px', color: colors.textPrimary }}>
            V_clamp = V_trigger + I_esd {'\u00D7'} R_on {'\u00D7'} (C_protection){'\u00B2'}
          </code>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px', marginBottom: 0 }}>
            Protection efficiency = (V_input - V_clamp) / V_input {'\u00D7'} 100%
          </p>
        </div>

        {/* Side-by-side layout */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '20px',
          width: '100%',
          alignItems: isMobile ? 'center' : 'flex-start',
          maxWidth: '900px',
          marginBottom: '24px',
        }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
        {/* Main visualization */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            {renderESDVisualization({ showTiming: false })}
          </div>
        </div>
        </div>

        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
        }}>
          {/* Protection toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            marginBottom: '24px',
            padding: '16px',
            background: colors.bgSecondary,
            borderRadius: '12px',
          }}>
            <span style={{ ...typo.body, color: colors.textSecondary }}>ESD Protection:</span>
            <button
              onClick={() => setHasProtection(!hasProtection)}
              style={{
                width: '80px',
                height: '44px',
                minHeight: '44px',
                borderRadius: '22px',
                border: 'none',
                background: hasProtection ? colors.success : colors.error,
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.3s',
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: '4px',
                left: hasProtection ? '40px' : '4px',
                transition: 'left 0.3s',
              }} />
            </button>
            <span style={{
              ...typo.body,
              color: hasProtection ? colors.success : colors.error,
              fontWeight: 600,
              minWidth: '80px'
            }}>
              {hasProtection ? 'ENABLED' : 'DISABLED'}
            </span>
          </div>

          {/* ESD voltage slider */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>ESD Voltage (Human Body Model)</span>
              <span style={{ ...typo.small, color: colors.spark, fontWeight: 600 }}>{esdVoltage}V</span>
            </div>
            <input
              type="range"
              min="1000"
              max="15000"
              step="500"
              value={esdVoltage}
              onChange={(e) => setEsdVoltage(parseInt(e.target.value))}
              onInput={(e) => setEsdVoltage(parseInt((e.target as HTMLInputElement).value))}
              style={sliderStyle}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ ...typo.small, color: colors.textMuted }}>1000V (Light touch)</span>
              <span style={{ ...typo.small, color: colors.textMuted }}>15000V (Carpet walk)</span>
            </div>
          </div>

          {/* Trigger button */}
          <button
            onClick={triggerDischarge}
            disabled={isDischarging}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              background: isDischarging
                ? colors.border
                : `linear-gradient(135deg, ${colors.spark}, #ea580c)`,
              color: 'white',
              fontSize: '18px',
              fontWeight: 700,
              cursor: isDischarging ? 'not-allowed' : 'pointer',
              boxShadow: isDischarging ? 'none' : `0 4px 20px rgba(251, 191, 36, 0.4)`,
              minHeight: '44px',
            }}
          >
            {isDischarging ? 'Discharging...' : '\u26A1 Trigger ESD Discharge'}
          </button>
        </div>
        </div>
        </div>

        {/* Observation prompts */}
        {!hasProtection && chipDamage > 20 && (
          <div style={{
            background: `${colors.error}22`,
            border: `1px solid ${colors.error}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
              Without protection, the full {esdVoltage}V hits the chip! Gate oxide is breaking down.
            </p>
          </div>
        )}

        {hasProtection && dischargeCount > 0 && (
          <div style={{
            background: `${colors.success}22`,
            border: `1px solid ${colors.success}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.success, margin: 0 }}>
              Protection clamped {esdVoltage}V down to 5.5V! The chip sees only safe voltage levels.
            </p>
          </div>
        )}

        {/* Reset button */}
        <button
          onClick={() => { setChipDamage(0); setDischargeCount(0); }}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            background: 'transparent',
            color: colors.textSecondary,
            cursor: 'pointer',
            marginBottom: '24px',
            minHeight: '44px',
          }}
        >
          Reset Simulation
        </button>

        <button
          onClick={() => { playSound('success'); nextPhase(); }}
          style={{ ...primaryButtonStyle, width: '100%' }}
        >
          Understand the Physics {'\u2192'}
        </button>
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const predictionText = prediction === 'a'
      ? 'You predicted chips are naturally immune'
      : prediction === 'b'
        ? 'You correctly predicted protection circuits clamp voltage'
        : prediction === 'c'
          ? 'You predicted voltage is too brief to cause damage'
          : 'Your prediction was recorded';

    return renderLayout(
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
          How ESD Protection Works
        </h2>

        {/* Reference to user's prediction */}
        <div style={{
          background: prediction === 'b' ? `${colors.success}22` : `${colors.warning}22`,
          border: `1px solid ${prediction === 'b' ? colors.success : colors.warning}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          <p style={{ ...typo.body, color: prediction === 'b' ? colors.success : colors.warning, margin: 0 }}>
            {predictionText}. {prediction === 'b' ? 'Great intuition! As you observed in the experiment, protection circuits clamp the voltage.' : 'Let\'s see what actually happens based on what you observed in the experiment...'}
          </p>
        </div>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '16px' }}>
            The Clamping Diode Strategy
          </h3>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
            At every I/O pin, two diodes stand guard:
          </p>
          <ul style={{ ...typo.body, color: colors.textSecondary, paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}><strong style={{ color: colors.diode }}>Upper diode to VDD:</strong> Clamps positive spikes above VDD + 0.7V</li>
            <li style={{ marginBottom: '8px' }}><strong style={{ color: colors.diode }}>Lower diode to GND:</strong> Clamps negative spikes below GND - 0.7V</li>
            <li style={{ marginBottom: '8px' }}>Together they create a "voltage window" that protects internal circuits</li>
            <li>Current is safely routed through power rails, not through transistor gates</li>
          </ul>
        </div>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.warning, marginBottom: '16px' }}>
            The Human Body Model (HBM) Formula
          </h3>
          <div style={{
            background: colors.bgSecondary,
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center',
            marginBottom: '16px',
          }}>
            <code style={{ fontSize: '18px', color: colors.textPrimary }}>
              V_clamp = V_trigger + I_esd {'\u00D7'} R_on
            </code>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px', marginBottom: '4px' }}>
              E_dissipated = {'\u00BD'} {'\u00D7'} C {'\u00D7'} V{'\u00B2'} = {'\u00BD'} {'\u00D7'} 100pF {'\u00D7'} (4000V){'\u00B2'}
            </p>
            <p style={{ ...typo.small, color: colors.textSecondary }}>
              100pF capacitor + 1.5k{'\u03A9'} resistor
            </p>
          </div>
          <p style={{ ...typo.small, color: colors.textSecondary }}>
            This circuit models a charged human touching a grounded device. The capacitance represents body charge storage,
            the resistance represents skin and body resistance. ESD standards like JEDEC and IEC use this model to
            test chip robustness with repeatable, standardized pulses.
          </p>
        </div>

        <div style={{
          background: `${colors.accent}11`,
          border: `1px solid ${colors.accent}33`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
            Key Insight
          </h3>
          <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
            The protection diodes don't block ESD - they <strong>redirect</strong> it. When voltage exceeds the safe window,
            diodes turn on and shunt current through the power rails (designed to handle high current)
            instead of through the fragile transistor gates (which would be destroyed by just 6-8V).
          </p>
        </div>

        <button
          onClick={() => { playSound('success'); nextPhase(); }}
          style={{ ...primaryButtonStyle, width: '100%' }}
        >
          Explore the Speed Challenge {'\u2192'}
        </button>
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Protection can respond whenever convenient - static discharge is slow enough' },
      { id: 'b', text: 'Protection must activate in nanoseconds or less, faster than the ESD rise time' },
      { id: 'c', text: 'Speed doesn\'t matter - the protection is always conducting' },
    ];

    return renderLayout(
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{
          background: `${colors.warning}22`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          border: `1px solid ${colors.warning}44`,
        }}>
          <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
            New Variable: Response Time
          </p>
        </div>

        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
          ESD voltage rises from 0V to 4,000V in less than 1 nanosecond (0.000000001 seconds). How fast must the protection circuit respond?
        </h2>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          {/* Twist predict SVG */}
          <svg width={isMobile ? 320 : 400} height={220} viewBox="0 0 400 220" style={{ background: colors.bgCard, borderRadius: '12px' }}>
            <defs>
              <filter id="glowTwist" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Grid */}
            <line x1="60" y1="30" x2="60" y2="180" stroke="#6b7280" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
            <line x1="60" y1="180" x2="380" y2="180" stroke="#6b7280" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
            {/* Axes */}
            <text x="60" y="200" fill={colors.textMuted} fontSize="12" textAnchor="middle">0ns</text>
            <text x="220" y="200" fill={colors.textMuted} fontSize="12" textAnchor="middle">Time</text>
            <text x="380" y="200" fill={colors.textMuted} fontSize="12" textAnchor="middle">2ns</text>
            <text x="40" y="185" fill={colors.textMuted} fontSize="12" textAnchor="middle">0V</text>
            <text x="30" y="35" fill={colors.textMuted} fontSize="12" textAnchor="middle">Voltage</text>
            {/* ESD rise curve */}
            <path d="M 60 180 L 100 170 L 140 140 L 180 80 L 220 45 L 260 38 L 300 36 L 340 35 L 380 35" fill="none" stroke={colors.spark} strokeWidth="3" />
            <text x="280" y="25" fill={colors.spark} fontSize="12" textAnchor="middle">4000V ESD Pulse</text>
            {/* Response time indicator */}
            <line x1="140" y1="30" x2="140" y2="180" stroke={colors.error} strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
            <text x="140" y="215" fill={colors.error} fontSize="11" textAnchor="middle">0.7ns Rise Time</text>
            <text x="300" y="70" fill={colors.accent} fontSize="14" textAnchor="middle" fontWeight="bold">?</text>
          </svg>
          <div style={{ ...typo.h2, color: colors.spark, marginTop: '12px', marginBottom: '8px' }}>
            0.7 nanoseconds
          </div>
          <div style={{ ...typo.small, color: colors.textMuted }}>
            Typical HBM ESD rise time (10% to 90%)
          </div>
          <div style={{ marginTop: '12px', ...typo.small, color: colors.textSecondary }}>
            That's 1.4 billion events per second speed!
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
              style={{
                background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                borderRadius: '12px',
                padding: '16px 20px',
                textAlign: 'left',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              <span style={{
                display: 'inline-block',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                textAlign: 'center',
                lineHeight: '28px',
                marginRight: '12px',
                fontWeight: 700,
              }}>
                {opt.id.toUpperCase()}
              </span>
              <span style={{ color: colors.textPrimary, ...typo.body }}>
                {opt.text}
              </span>
            </button>
          ))}
        </div>

        {twistPrediction && (
          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={primaryButtonStyle}
          >
            Explore the Trade-off {'\u2192'}
          </button>
        )}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return renderLayout(
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
          Protection vs Signal Integrity Lab
        </h2>
        <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
          Find the balance between protection robustness and high-speed signal quality
        </p>

        {/* Side-by-side layout */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '20px',
          width: '100%',
          alignItems: isMobile ? 'center' : 'flex-start',
          maxWidth: '900px',
          marginBottom: '24px',
        }}>
        <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            {renderESDVisualization({ showTiming: true })}
          </div>
        </div>
        </div>

        <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
        }}>
          {/* Response time slider */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>Protection Response Time</span>
              <span style={{
                ...typo.small,
                color: responseTime < 1 ? colors.success : colors.error,
                fontWeight: 600
              }}>
                {responseTime}ns
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={responseTime}
              onChange={(e) => setResponseTime(parseFloat(e.target.value))}
              onInput={(e) => setResponseTime(parseFloat((e.target as HTMLInputElement).value))}
              style={sliderStyle}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ ...typo.small, color: colors.success }}>0.1ns (Fast)</span>
              <span style={{ ...typo.small, color: colors.error }}>5ns (Slow)</span>
            </div>
          </div>

          {/* Protection capacitance slider */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>Protection Capacitance</span>
              <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                {protectionCapacitance}pF
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={protectionCapacitance}
              onChange={(e) => setProtectionCapacitance(parseFloat(e.target.value))}
              onInput={(e) => setProtectionCapacitance(parseFloat((e.target as HTMLInputElement).value))}
              style={sliderStyle}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ ...typo.small, color: colors.circuit }}>0.1pF (Low cap)</span>
              <span style={{ ...typo.small, color: colors.warning }}>5pF (High cap)</span>
            </div>
          </div>

          {/* Signal frequency slider */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ ...typo.small, color: colors.textSecondary }}>Signal Frequency</span>
              <span style={{ ...typo.small, color: colors.circuit, fontWeight: 600 }}>
                {signalFrequency} GHz
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="10"
              step="0.1"
              value={signalFrequency}
              onChange={(e) => setSignalFrequency(parseFloat(e.target.value))}
              onInput={(e) => setSignalFrequency(parseFloat((e.target as HTMLInputElement).value))}
              style={sliderStyle}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ ...typo.small, color: colors.textMuted }}>0.1 GHz (USB 2.0)</span>
              <span style={{ ...typo.small, color: colors.textMuted }}>10 GHz (PCIe)</span>
            </div>
          </div>

          {/* Trade-off metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
          }}>
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ ...typo.h3, color: metrics.eyeOpening > 60 ? colors.success : colors.error }}>
                {metrics.eyeOpening.toFixed(0)}%
              </div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Eye Opening</div>
            </div>
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ ...typo.h3, color: metrics.robustness > 60 ? colors.success : colors.warning }}>
                {metrics.robustness.toFixed(0)}%
              </div>
              <div style={{ ...typo.small, color: colors.textMuted }}>ESD Robustness</div>
            </div>
            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ ...typo.h3, color: metrics.trade_off_score > 50 ? colors.accent : colors.error }}>
                {metrics.trade_off_score.toFixed(0)}
              </div>
              <div style={{ ...typo.small, color: colors.textMuted }}>Balance Score</div>
            </div>
          </div>
        </div>
        </div>
        </div>

        {/* Insight card */}
        <div style={{
          background: `${colors.circuit}22`,
          border: `1px solid ${colors.circuit}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
        }}>
          <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
            <strong style={{ color: colors.circuit }}>The Core Trade-off:</strong> Larger protection structures
            are more robust but add capacitance that degrades high-speed signals. At 10 GHz,
            even 0.5pF causes significant signal distortion!
          </p>
        </div>

        <button
          onClick={() => { playSound('success'); nextPhase(); }}
          style={{ ...primaryButtonStyle, width: '100%' }}
        >
          Understand the Design Challenge {'\u2192'}
        </button>
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return renderLayout(
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
          Advanced ESD Engineering
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '24px' }}>{'\u26A1'}</span>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Silicon-Controlled Rectifiers (SCRs)</h3>
            </div>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              For high-speed pins, SCRs provide superior protection with lower capacitance than simple diodes.
              They're normally off (no capacitance impact) but snap on at trigger voltage and can handle
              massive current. The trade-off: more complex design and potential latch-up risk.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '24px' }}>{'\u{1F4C8}'}</span>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Multi-Stage Protection</h3>
            </div>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              Real systems use layered defense: external TVS diodes at connectors absorb the initial surge,
              series resistors limit peak current, and on-chip structures handle residual energy.
              Each stage reduces what the next must handle, enabling smaller on-chip structures.
            </p>
          </div>

          <div style={{
            background: `${colors.success}11`,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.success}33`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '24px' }}>{'\u{1F3AF}'}</span>
              <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Design Window Optimization</h3>
            </div>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              <strong>The challenge:</strong> Protection must trigger above normal operating voltage (3.3V + margin)
              but below gate oxide breakdown (6-8V). That's only a 2-3V window! Engineers spend months
              optimizing trigger voltages, clamp ratios, and layout to hit this narrow target while
              minimizing capacitance and meeting area constraints.
            </p>
          </div>
        </div>

        <button
          onClick={() => { playSound('success'); nextPhase(); }}
          style={{ ...primaryButtonStyle, width: '100%' }}
        >
          See Real-World Applications {'\u2192'}
        </button>
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="E S D Protection"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);
    const completedCount = completedApps.filter(c => c).length;

    return renderLayout(
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
          Real-World Applications
        </h2>
        <p style={{ ...typo.small, color: colors.accent, textAlign: 'center', marginBottom: '24px' }}>
          Application {completedCount} of {realWorldApps.length}
        </p>

        {/* App selector */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '24px',
        }}>
          {realWorldApps.map((a, i) => (
            <button
              key={i}
              onClick={() => {
                playSound('click');
                setSelectedApp(i);
                const newCompleted = [...completedApps];
                newCompleted[i] = true;
                setCompletedApps(newCompleted);
              }}
              style={{
                background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                borderRadius: '12px',
                padding: '16px 8px',
                cursor: 'pointer',
                textAlign: 'center',
                position: 'relative',
                minHeight: '44px',
              }}
            >
              {completedApps[i] && (
                <div style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: colors.success,
                  color: 'white',
                  fontSize: '12px',
                  lineHeight: '18px',
                }}>
                  {'\u2713'}
                </div>
              )}
              <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
              <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>
                {a.short}
              </div>
            </button>
          ))}
        </div>

        {/* Selected app details */}
        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          borderLeft: `4px solid ${app.color}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <span style={{ fontSize: '48px' }}>{app.icon}</span>
            <div>
              <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
              <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
            </div>
          </div>

          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
            {app.description}
          </p>

          <div style={{
            background: colors.bgSecondary,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
              Connection to ESD Protection:
            </h4>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {app.connection}
            </p>
          </div>

          <div style={{
            background: colors.bgSecondary,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <h4 style={{ ...typo.small, color: colors.circuit, marginBottom: '8px', fontWeight: 600 }}>
              How It Works:
            </h4>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {app.howItWorks}
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '16px',
          }}>
            {app.stats.map((stat, i) => (
              <div key={i} style={{
                background: colors.bgSecondary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ ...typo.small, color: colors.warning, marginBottom: '8px', fontWeight: 600 }}>
              Real Examples:
            </h4>
            <ul style={{ ...typo.small, color: colors.textSecondary, margin: 0, paddingLeft: '20px' }}>
              {app.examples.map((ex, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{ex}</li>
              ))}
            </ul>
          </div>

          <div style={{
            background: `${app.color}11`,
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
          }}>
            <h4 style={{ ...typo.small, color: app.color, marginBottom: '4px', fontWeight: 600 }}>
              Future Impact:
            </h4>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {app.futureImpact}
            </p>
          </div>

          {/* Got It button */}
          <button
            onClick={() => {
              const newCompleted = [...completedApps];
              newCompleted[selectedApp] = true;
              setCompletedApps(newCompleted);
              playSound('success');
            }}
            style={{
              ...primaryButtonStyle,
              width: '100%',
            }}
          >
            Got It {'\u2713'}
          </button>
        </div>

        {allAppsCompleted && (
          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Take the Test {'\u2192'}
          </button>
        )}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return renderLayout(
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            fontSize: '80px',
            marginBottom: '24px',
          }}>
            {passed ? '\u{1F389}' : '\u{1F4DA}'}
          </div>
          <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
            {passed ? 'Excellent!' : 'Keep Learning!'}
          </h2>
          <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
            {testScore} / 10
          </p>
          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
            {passed
              ? 'You\'ve mastered ESD Protection Engineering!'
              : 'Review the concepts and try again.'}
          </p>

          {passed ? (
            <button
              onClick={() => { playSound('complete'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Complete Lesson {'\u2192'}
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
              style={primaryButtonStyle}
            >
              Review &amp; Try Again
            </button>
          )}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return renderLayout(
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        {/* Progress */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}>
          <span style={{ ...typo.small, color: colors.textSecondary }}>
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
              }}
            >
              <span style={{
                display: 'inline-block',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
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
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                background: 'transparent',
                color: colors.textSecondary,
                cursor: 'pointer',
              }}
            >
              {'\u2190'} Previous
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
                color: 'white',
                cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                fontWeight: 600,
              }}
            >
              Next {'\u2192'}
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
              }}
            >
              Submit Test
            </button>
          )}
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return renderLayout(
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          {'\u{1F3C6}'}
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          ESD Protection Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', margin: '0 auto 32px' }}>
          You now understand how tiny protection circuits save billions of devices from the invisible threat of static electricity every single day.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
          margin: '0 auto 32px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Mastered:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'How clamping diodes protect internal circuits',
              'The Human Body Model (HBM) and ESD testing',
              'Sub-nanosecond response time requirements',
              'Protection vs signal integrity trade-offs',
              'Multi-stage protection system design',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>{'\u2713'}</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: `linear-gradient(135deg, ${colors.accent}, #D97706)`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '32px',
          maxWidth: '400px',
          margin: '0 auto 32px',
        }}>
          <div style={{ color: 'white', fontWeight: 600, marginBottom: '8px' }}>
            Final Score: {testScore}/10
          </div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
            You're now equipped to understand how every electronic device you touch is protected from the static electricity your body generates.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '14px 28px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
            }}
          >
            Play Again
          </button>
          <a
            href="/"
            style={{
              ...primaryButtonStyle,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return null;
};

export default ESDProtectionRenderer;
